// Shared target validators used by the discovery engine and the Nmap runner.
// Kept deliberately strict: anything that doesn't match is rejected outright
// rather than "cleaned up", since these values can flow into execFile argv.

const IPV4_OCTET = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const IPV4_RE = new RegExp(`^${IPV4_OCTET}\\.${IPV4_OCTET}\\.${IPV4_OCTET}\\.${IPV4_OCTET}$`);
const IPV4_CIDR_RE = new RegExp(`^${IPV4_OCTET}\\.${IPV4_OCTET}\\.${IPV4_OCTET}\\.${IPV4_OCTET}/(3[0-2]|[12]?\\d)$`);

// Deliberately permissive-but-bounded IPv6 matcher (covers standard and
// compressed "::" forms) plus optional /prefix.
const IPV6_RE = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
const IPV6_CIDR_RE = /^([0-9a-fA-F:]{2,45})\/(1[01]\d|12[0-8]|[1-9]?\d)$/;

// RFC 1123 hostname (labels of letters/digits/hyphens, dots between them).
const HOSTNAME_RE = /^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

export function isValidIPv4(value: string): boolean {
  return IPV4_RE.test(value.trim());
}

export function isValidIPv4Cidr(value: string): boolean {
  return IPV4_CIDR_RE.test(value.trim());
}

export function isValidIPv6(value: string): boolean {
  return IPV6_RE.test(value.trim());
}

export function isValidIPv6Cidr(value: string): boolean {
  const trimmed = value.trim();
  const match = IPV6_CIDR_RE.exec(trimmed);
  if (!match) return false;
  return IPV6_RE.test(match[1]);
}

export function isValidHostname(value: string): boolean {
  return HOSTNAME_RE.test(value.trim());
}

// Accepts anything nmap could reasonably be pointed at: a bare IPv4/IPv6
// address, a CIDR block, or an RFC1123 hostname. Used to validate the
// `targetIp` field before it is ever placed in an execFile argv array.
export function isValidScanTarget(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 253) return false;
  return (
    isValidIPv4(trimmed) ||
    isValidIPv4Cidr(trimmed) ||
    isValidIPv6(trimmed) ||
    isValidIPv6Cidr(trimmed) ||
    isValidHostname(trimmed)
  );
}
