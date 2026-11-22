export interface ParsedHostPortOk {
  ok: true;
  host: string;
  port: number;
  normalized: string;
}

export interface ParsedHostPortErr {
  ok: false;
  error: string;
}

export type ParsedHostPortResult = ParsedHostPortOk | ParsedHostPortErr;

export const RESERVED_SUBDOMAIN_HANDLES = new Set([
  'www',
  'api',
  'web',
  'mail',
  'ns1',
  'ns2',
  'admin',
  'root',
  'support',
  'billing',
  'docs',
  'cdn',
  'status',
  'login',
  'signup',
  'dashboard',
  'localhost',
  'ftp',
  'smtp',
  'imap',
  'pop',
  'app',
  'play',
  'dev',
  'staging',
  'surgetrix',
  'minevex',
  'vex',
]);

export function sanitizeDomainHandle(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function isReservedDomainHandle(handle: string): boolean {
  return RESERVED_SUBDOMAIN_HANDLES.has(handle.toLowerCase().trim());
}

export function isValidDomainHandle(handle: string): boolean {
  return (
    /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(handle) &&
    handle.length >= 2 &&
    handle.length <= 32 &&
    !isReservedDomainHandle(handle)
  );
}

export function isValidPublicIpv6(raw: string): boolean {
  const clean = raw.trim().toLowerCase();
  if (!clean || clean.length > 64) return false;
  if (!clean.includes(':') || !/^[0-9a-f:]+$/.test(clean)) return false;
  if (clean.includes(':::')) return false;
  if (
    clean === '::' ||
    clean === '::1' ||
    clean.startsWith('fe8') ||
    clean.startsWith('fe9') ||
    clean.startsWith('fea') ||
    clean.startsWith('feb') ||
    clean.startsWith('fc') ||
    clean.startsWith('fd') ||
    clean.startsWith('ff')
  ) {
    return false;
  }
  const doubleColons = clean.split('::').length - 1;
  if (doubleColons > 1) return false;
  const parts = clean.split(':').filter((p) => p.length > 0);
  if (doubleColons === 0 && parts.length !== 8) return false;
  if (doubleColons === 1 && parts.length > 7) return false;
  return parts.every((p) => p.length <= 4);
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const clean = ip.trim().toLowerCase();
  if (!clean) return true;

  // Handle IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1
  const v4MappedMatch = clean.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const ipToCheck = v4MappedMatch ? v4MappedMatch[1] : clean;

  // IPv4 checks
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ipToCheck)) {
    const parts = ipToCheck.split('.').map(Number);
    if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 192 && b === 0 && parts[2] === 0) return true; // 192.0.0.0/24
    if (a === 192 && b === 0 && parts[2] === 2) return true; // TEST-NET-1
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  // IPv6 checks
  if (clean.includes(':')) {
    if (clean === '::' || clean === '::1') return true;
    if (clean.startsWith('fe8') || clean.startsWith('fe9') || clean.startsWith('fea') || clean.startsWith('feb')) {
      return true; // fe80::/10 link-local
    }
    if (clean.startsWith('fc') || clean.startsWith('fd')) {
      return true; // fc00::/7 ULA
    }
    if (clean.startsWith('ff')) return true; // multicast
    return false;
  }

  return true;
}

export function isBlockedHostname(host: string): boolean {
  const lower = host.trim().toLowerCase().replace(/\.+$/, '');
  if (!lower || lower.length > 253) return true;
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.lan') ||
    lower.endsWith('.home') ||
    lower === 'metadata.google.internal' ||
    lower === 'metadata'
  ) {
    return true;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(lower)) {
    return isPrivateOrReservedIp(lower);
  }
  // Must have a valid TLD / dot for public DNS hostnames
  if (!lower.includes('.')) return true;
  if (!/^[a-z0-9.-]+$/.test(lower)) return true;
  if (lower.startsWith('.') || lower.endsWith('.') || lower.includes('..')) return true;
  return false;
}

export function parseMinecraftHostPort(
  input: string,
  defaultPort = 25565
): ParsedHostPortResult {
  const raw = input.trim().replace(/^https?:\/\//i, '').split('/')[0].trim();
  if (!raw) {
    return { ok: false, error: 'Enter a server IP or domain (e.g. mc.hypixel.net).' };
  }

  let host = raw;
  let port = defaultPort;

  const colonIdx = raw.lastIndexOf(':');
  if (colonIdx !== -1 && !raw.includes(']')) {
    const hostPart = raw.slice(0, colonIdx).trim();
    const portStr = raw.slice(colonIdx + 1).trim();
    const parsedPort = Number(portStr);
    if (!/^\d+$/.test(portStr) || parsedPort < 1 || parsedPort > 65535) {
      return { ok: false, error: 'Port must be a number between 1 and 65535.' };
    }
    host = hostPart;
    port = parsedPort;
  }

  if (isBlockedHostname(host)) {
    return {
      ok: false,
      error: 'Enter a valid public domain or public IPv4 address (private or localhost hosts are blocked).',
    };
  }

  const normalized = port === defaultPort ? host.toLowerCase() : `${host.toLowerCase()}:${port}`;
  return {
    ok: true,
    host: host.toLowerCase(),
    port,
    normalized,
  };
}

export function validateMinecraftUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{1,16}$/.test(username.trim());
}

export function formatRawUuid(raw: string): string {
  const clean = raw.replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(clean)) return raw;
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20, 32)}`;
}

export function formatConnectAddress(
  host: string,
  port: number,
  edition: 'Java' | 'Bedrock' | 'Crossplay' = 'Java'
): string {
  const cleanHost = host.trim();
  const defaultPort = edition === 'Bedrock' ? 19132 : 25565;
  if (!port || port === defaultPort) return cleanHost;
  return `${cleanHost}:${port}`;
}

export function buildInstantWorkingDomain(handle: string, ipv4: string): string | null {
  const cleanIp = ipv4.trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(cleanIp)) return null;
  if (isPrivateOrReservedIp(cleanIp)) return null;
  const cleanHandle = sanitizeDomainHandle(handle) || 'mc';
  return `${cleanHandle}.${cleanIp.replace(/\./g, '-')}.sslip.io`;
}

export function parseDuckDnsUpdateInput(
  rawSubdomain: string,
  rawToken: string
): { ok: true; subdomain: string; fqdn: string; token: string } | { ok: false; error: string } {
  const cleaned = rawSubdomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .replace(/\.duckdns\.org$/, '');

  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(cleaned) || cleaned.length < 2) {
    return {
      ok: false,
      error: 'Enter your DuckDNS subdomain name (2–63 lowercase letters, numbers, or hyphens).',
    };
  }

  const token = rawToken.trim();
  if (!token || token.length < 8 || token.length > 128 || /\s/.test(token)) {
    return {
      ok: false,
      error: 'Enter a valid DuckDNS account token from duckdns.org.',
    };
  }

  return {
    ok: true,
    subdomain: cleaned,
    fqdn: `${cleaned}.duckdns.org`,
    token,
  };
}

export function buildFreeDomainDnsRecords(
  subdomainOrDomain: string,
  targetHost: string,
  targetPort = 25565
): {
  srvHost: string;
  srvValue: string;
  aRecordHost: string;
  bedrockNote: string;
} {
  const cleanSub = subdomainOrDomain.trim().toLowerCase() || 'play.yourdomain.com';
  const labels = cleanSub.split('.').filter(Boolean);
  const hostPrefix = labels.length > 2 ? labels[0] : '@';

  return {
    srvHost: hostPrefix === '@' ? '_minecraft._tcp' : `_minecraft._tcp.${hostPrefix}`,
    srvValue: `0 5 ${targetPort} ${targetHost.trim().toLowerCase()}`,
    aRecordHost: hostPrefix,
    bedrockNote: `Bedrock ignores SRV records — connect using host "${targetHost.trim().toLowerCase()}" on port ${targetPort === 25565 ? 19132 : targetPort}.`,
  };
}

export function buildBedrockAddServerUri(
  serverName: string,
  host: string,
  port = 19132
): string {
  const cleanName = serverName.trim().slice(0, 32) || 'Minecraft Server';
  const cleanHost = host.trim();
  const safePort = port > 0 && port <= 65535 ? port : 19132;
  return `minecraft://?addExternalServer=${encodeURIComponent(`${cleanName}|${cleanHost}:${safePort}`)}`;
}

