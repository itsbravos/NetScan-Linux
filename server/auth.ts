import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";

const DATA_DIR = process.env.NETSCAN_DATA_DIR || path.join(process.cwd(), "data");
const ADMIN_AUTH_FILE = path.join(DATA_DIR, "admin_auth.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

export const SESSION_COOKIE = "netscan_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const SESSION_MAX_AGE_MS = SESSION_TTL_MS;

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

interface SessionRecord {
  id: string;
  createdAt: number;
}

let passwordHash: string | null = null;
const sessions: Map<string, SessionRecord> = new Map();
const loginAttempts: Map<string, { count: number; firstAttemptAt: number }> = new Map();

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("Could not create data dir:", err);
  }
}

function loadSessions() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return;
    const list: SessionRecord[] = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
    const now = Date.now();
    for (const s of list) {
      if (now - s.createdAt < SESSION_TTL_MS) {
        sessions.set(s.id, s);
      }
    }
  } catch (err) {
    console.error("Error loading sessions:", err);
  }
}

function saveSessions() {
  try {
    ensureDataDir();
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(Array.from(sessions.values()), null, 2));
  } catch (err) {
    console.error("Error saving sessions:", err);
  }
}

function generateRandomPassword(): string {
  return crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
}

async function bootstrapPassword() {
  ensureDataDir();

  if (process.env.ADMIN_PASSWORD_HASH) {
    passwordHash = process.env.ADMIN_PASSWORD_HASH;
    return;
  }

  if (process.env.ADMIN_PASSWORD) {
    passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    return;
  }

  if (fs.existsSync(ADMIN_AUTH_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(ADMIN_AUTH_FILE, "utf-8"));
      if (data.passwordHash) {
        passwordHash = data.passwordHash;
        return;
      }
    } catch (err) {
      console.error("Error reading data/admin_auth.json:", err);
    }
  }

  // No password configured anywhere — bootstrap one, persist only the hash,
  // and print the plaintext exactly once so the operator can log in.
  const generated = generateRandomPassword();
  passwordHash = await bcrypt.hash(generated, 10);

  let persisted = true;
  try {
    fs.writeFileSync(ADMIN_AUTH_FILE, JSON.stringify({ passwordHash }, null, 2));
  } catch (err) {
    persisted = false;
    console.error("Could not persist admin_auth.json:", err);
  }

  console.log("\n" + "=".repeat(64));
  console.log("🔐 Senha de administrador gerada automaticamente para o NetScan:");
  console.log(`   ${generated}`);
  console.log("   Guarde esta senha — ela não será exibida novamente.");
  if (persisted) {
    console.log("   Para redefinir, apague data/admin_auth.json e reinicie o servidor.");
  } else {
    console.log("   AVISO: não foi possível salvar o hash em disco — uma nova senha");
    console.log("   será gerada a cada reinício até que o problema de permissão seja resolvido.");
  }
  console.log("=".repeat(64) + "\n");
}

export async function initAuth() {
  await bootstrapPassword();
  loadSessions();
}

function isRateLimited(ip: string): boolean {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

function registerFailedAttempt(ip: string) {
  const entry = loginAttempts.get(ip);
  if (!entry || Date.now() - entry.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttemptAt: Date.now() });
  } else {
    entry.count++;
  }
}

export interface LoginResult {
  ok: boolean;
  sessionId?: string;
  error?: string;
  rateLimited?: boolean;
}

export async function attemptLogin(ip: string, password: string): Promise<LoginResult> {
  if (isRateLimited(ip)) {
    return { ok: false, rateLimited: true, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };
  }

  const valid = !!passwordHash && (await bcrypt.compare(password || "", passwordHash));
  if (!valid) {
    registerFailedAttempt(ip);
    return { ok: false, error: "Senha incorreta." };
  }

  loginAttempts.delete(ip);
  const sessionId = crypto.randomBytes(32).toString("hex");
  sessions.set(sessionId, { id: sessionId, createdAt: Date.now() });
  saveSessions();
  return { ok: true, sessionId };
}

export function destroySession(sessionId: string | undefined) {
  if (!sessionId) return;
  sessions.delete(sessionId);
  saveSessions();
}

export function isSessionValid(sessionId: string | undefined): boolean {
  if (!sessionId) return false;
  const record = sessions.get(sessionId);
  if (!record) return false;
  if (Date.now() - record.createdAt > SESSION_TTL_MS) {
    sessions.delete(sessionId);
    return false;
  }
  return true;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (isSessionValid(sessionId)) {
    next();
    return;
  }
  res.status(401).json({ error: "Não autenticado." });
}
