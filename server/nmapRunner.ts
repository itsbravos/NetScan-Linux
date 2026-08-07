import { execFile } from "child_process";
import { promisify } from "util";
import { isValidScanTarget } from "./targetValidation";

const execFileAsync = promisify(execFile);

// Whitelist mirrors the presets/flags already documented in the NmapTerminal
// UI. Anything outside this list is rejected — never passed to a shell,
// never silently dropped.
const EXACT_FLAGS = new Set([
  "-sn", "-sP", "-sV", "-O", "-F", "-p-", "-A", "-Pn", "-v",
  "-T0", "-T1", "-T2", "-T3", "-T4", "-T5",
]);
const SCRIPT_ALLOWLIST = new Set(["vuln", "default", "safe", "discovery"]);
const PORT_RANGE_RE = /^\d{1,5}(-\d{1,5})?(,\d{1,5}(-\d{1,5})?)*$/;

const DEFAULT_TIMEOUT_MS = 30_000;
const EXTENDED_TIMEOUT_MS = 120_000; // -p- and --script scans can take much longer
const MAX_BUFFER_BYTES = 10 * 1024 * 1024;

export class NmapError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Note: kept as a single shape with optional fields (not a discriminated
// union) — this project's tsconfig doesn't enable `strict`, so control-flow
// narrowing on a boolean-literal discriminant doesn't work reliably.
export interface NmapArgsResult {
  ok: boolean;
  args?: string[];
  error?: string;
}

// Tokenizes the free-text command from the terminal UI and validates every
// token against the whitelist. The scan target is NEVER taken from this
// text — it always comes from the separately-validated `targetIp` field.
// A token that happens to equal the validated target is recognized (so the
// existing presets, which embed the target in the command string, keep
// working) but the target is appended exactly once, from `targetIp`.
export function buildNmapArgs(command: string, targetIp: string): NmapArgsResult {
  const trimmedTarget = targetIp.trim();
  if (!isValidScanTarget(trimmedTarget)) {
    return { ok: false, error: `Alvo inválido: "${targetIp}"` };
  }

  const tokens = command.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens[0] !== "nmap") {
    return { ok: false, error: 'O comando deve começar com "nmap".' };
  }

  const args: string[] = [];

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === trimmedTarget) {
      continue; // appended once, at the end, from the validated field
    }

    if (EXACT_FLAGS.has(token)) {
      args.push(token);
      continue;
    }

    if (token === "--script") {
      const value = tokens[i + 1];
      if (!value || !SCRIPT_ALLOWLIST.has(value)) {
        return {
          ok: false,
          error: `Script NSE não permitido: "${value ?? ""}". Use um de: ${[...SCRIPT_ALLOWLIST].join(", ")}`,
        };
      }
      args.push("--script", value);
      i++;
      continue;
    }

    if (token === "-p") {
      const value = tokens[i + 1];
      if (!value || !PORT_RANGE_RE.test(value)) {
        return { ok: false, error: `Intervalo de portas inválido após -p: "${value ?? ""}"` };
      }
      args.push("-p", value);
      i++;
      continue;
    }

    if (/^-p\d/.test(token) && PORT_RANGE_RE.test(token.slice(2))) {
      args.push(token);
      continue;
    }

    return {
      ok: false,
      error: `Flag ou argumento não permitido: "${token}". Consulte o guia de parâmetros para a lista de flags aceitas.`,
    };
  }

  args.push(trimmedTarget);
  return { ok: true, args };
}

export interface NmapRunResult {
  stdout: string;
  stderr: string;
}

export async function runNmap(command: string, targetIp: string): Promise<NmapRunResult> {
  const validation = buildNmapArgs(command, targetIp);
  if (!validation.ok || !validation.args) {
    throw new NmapError(validation.error || "Comando nmap inválido.", 400);
  }
  const args = validation.args;

  const needsExtendedTimeout = args.includes("-p-") || args.includes("--script");
  const timeout = needsExtendedTimeout ? EXTENDED_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

  try {
    const { stdout, stderr } = await execFileAsync("nmap", args, {
      timeout,
      maxBuffer: MAX_BUFFER_BYTES,
    });
    return { stdout, stderr };
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      throw new NmapError("nmap não está instalado neste sistema.", 503);
    }
    // nmap frequently exits non-zero while still producing useful output
    // (host unreachable, scan interrupted by timeout) — surface that
    // instead of a bare 500.
    if (typeof err?.stdout === "string" || typeof err?.stderr === "string") {
      return { stdout: err.stdout || "", stderr: err.stderr || String(err.message || err) };
    }
    throw new NmapError(err?.message || "Falha ao executar nmap.", 500);
  }
}

export async function getNmapStatus(): Promise<{ available: boolean; version?: string }> {
  try {
    const { stdout } = await execFileAsync("nmap", ["--version"], { timeout: 5000 });
    const match = /Nmap version (\S+)/.exec(stdout);
    return { available: true, version: match?.[1] };
  } catch {
    return { available: false };
  }
}
