import 'dotenv/config';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { normalizeChatHistory, validateAiPrompt } from './src/utils/aiAssistant';
import {
  buildInstantWorkingDomain,
  formatConnectAddress,
  formatRawUuid,
  isPrivateOrReservedIp,
  isReservedDomainHandle,
  isValidDomainHandle,
  isValidPublicIpv6,
  parseDuckDnsUpdateInput,
  parseMinecraftHostPort,
  sanitizeDomainHandle,
  validateMinecraftUsername,
} from './src/utils/networkDomain';

import {
  OWNER_EMAIL,
  PluginListing,
  PluginReviewRecord,
  PluginVersionRecord,
  computeRatingBreakdown,
  isOwnerUser,
  sanitizeDownloadFilename,
  slugifyPluginId,
  validatePluginFileMeta,
  validatePluginPayload,
  validateReviewPayload,
} from './src/utils/pluginMarketplace';

const PORT = Number(process.env.PORT) || 3000;
const PRIMARY_GEMINI_MODEL = 'gemini-4-hydrogen';
const FALLBACK_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const DEFAULT_ZONE_NAME = (process.env.CLOUDFLARE_ZONE_NAME || 'surgetrix.site').trim().toLowerCase();

const DATA_DIR = path.resolve('.surgetrix-data');
const DOMAINS_FILE = path.join(DATA_DIR, 'domains.json');
const PLUGINS_FILE = path.join(DATA_DIR, 'plugins.json');
const PLUGIN_FILES_DIR = path.resolve(DATA_DIR, 'plugin-files');

const FIREBASE_PROJECT_ID: string = (() => {
  try {
    const raw = fs.readFileSync(path.resolve('firebase-applet-config.json'), 'utf8');
    const parsed = JSON.parse(raw) as { projectId?: string };
    return typeof parsed.projectId === 'string' && parsed.projectId.trim()
      ? parsed.projectId.trim()
      : 'tidal-tuner-63bk6';
  } catch {
    return 'tidal-tuner-63bk6';
  }
})();

interface VerifiedAuthUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string;
  isOwner: boolean;
}

let cachedGoogleCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getGoogleSecureTokenCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedGoogleCerts && cachedGoogleCerts.expiresAt > now) {
    return cachedGoogleCerts.certs;
  }
  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!res.ok) {
    throw new Error('Unable to fetch Firebase verification certificates.');
  }
  const certs = (await res.json()) as Record<string, string>;
  const cc = res.headers.get('cache-control') || '';
  const maxAgeMatch = /max-age=(\d+)/i.exec(cc);
  const ttlMs = maxAgeMatch ? Math.max(60, Number(maxAgeMatch[1])) * 1000 : 3600 * 1000;
  cachedGoogleCerts = { certs, expiresAt: now + ttlMs };
  return certs;
}

async function verifyFirebaseIdToken(authHeader?: string): Promise<VerifiedAuthUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const headerJson = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as {
      alg?: string;
      kid?: string;
    };
    const payloadJson = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      iat?: number;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };

    if (headerJson.alg !== 'RS256' || !headerJson.kid) return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (
      payloadJson.aud !== FIREBASE_PROJECT_ID ||
      payloadJson.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` ||
      typeof payloadJson.sub !== 'string' ||
      !payloadJson.sub ||
      typeof payloadJson.exp !== 'number' ||
      payloadJson.exp <= nowSec ||
      typeof payloadJson.iat !== 'number' ||
      payloadJson.iat > nowSec + 300
    ) {
      return null;
    }

    const certs = await getGoogleSecureTokenCerts();
    const pem = certs[headerJson.kid];
    if (!pem) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    verifier.end();
    const signature = Buffer.from(parts[2], 'base64url');
    const valid = verifier.verify(pem, signature);
    if (!valid) return null;

    const email = typeof payloadJson.email === 'string' ? payloadJson.email.trim() : '';
    const emailVerified = payloadJson.email_verified === true;
    const name =
      typeof payloadJson.name === 'string' && payloadJson.name.trim()
        ? payloadJson.name.trim().slice(0, 32)
        : email.split('@')[0] || 'SurgePlayer';

    return {
      uid: payloadJson.sub,
      email,
      emailVerified,
      name,
      isOwner: isOwnerUser({ email, emailVerified }),
    };
  } catch {
    return null;
  }
}

function readPluginStore(): PluginListing[] {
  try {
    if (!fs.existsSync(PLUGINS_FILE)) return [];
    const raw = fs.readFileSync(PLUGINS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PluginListing[]) : [];
  } catch {
    return [];
  }
}

function writePluginStore(list: PluginListing[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PLUGINS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

function resolveSafePluginFilePath(storedFileName: string): string | null {
  const safeBase = path.basename(storedFileName);
  if (!safeBase || safeBase !== storedFileName || safeBase.includes('..')) {
    return null;
  }
  fs.mkdirSync(PLUGIN_FILES_DIR, { recursive: true });
  const resolved = path.resolve(PLUGIN_FILES_DIR, safeBase);
  if (!resolved.startsWith(PLUGIN_FILES_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

interface StoredDomainEntry {
  handle: string;
  zoneDomain: string;
  instantDomain?: string;
  workingDomain?: string;
  connectAddress?: string;
  dnsProvider?: 'instant' | 'duckdns' | 'cloudflare';
  serverName: string;
  targetHost: string;
  targetPort: number;
  ipv6?: string;
  edition: 'Java' | 'Bedrock' | 'Crossplay';
  dnsStatus: 'verified' | 'web_active' | 'error';
  cloudflareSynced: boolean;
  lastDnsCheckAt?: string;
  lastDnsIps?: string[];
  lastDnsSrv?: string[];
  ownerTokenHash: string;
  ownerUid?: string;
  createdAt: string;
  updatedAt: string;
}

function testTcpPort(hostIp: string, port: number, timeoutMs = 3500): Promise<{ reachable: boolean; latencyMs: number | null }> {
  if (!hostIp || isPrivateOrReservedIp(hostIp)) {
    return Promise.resolve({ reachable: false, latencyMs: null });
  }
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = net.createConnection({ host: hostIp, port });
    let settled = false;
    const finish = (reachable: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ reachable, latencyMs: reachable ? Date.now() - start : null });
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

function getCloudflareConfig(): { token: string; zoneId: string; zoneName: string } | null {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim() || '';
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim() || '';
  const zoneName = (process.env.CLOUDFLARE_ZONE_NAME || DEFAULT_ZONE_NAME).trim().toLowerCase();
  if (!token || !zoneId) return null;
  return { token, zoneId, zoneName };
}

async function syncCloudflareDnsRecords(entry: {
  handle: string;
  targetHost: string;
  targetPort: number;
  ipv4?: string;
  ipv6?: string;
  edition: 'Java' | 'Bedrock' | 'Crossplay';
}): Promise<{ synced: boolean; warning?: string }> {
  const cf = getCloudflareConfig();
  if (!cf) return { synced: false };

  const fqdn = `${entry.handle}.${cf.zoneName}`;
  const headers = {
    Authorization: `Bearer ${cf.token}`,
    'Content-Type': 'application/json',
  };

  try {
    const existingRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(cf.zoneId)}/dns_records?per_page=100`,
      { headers }
    );
    const existingData = (await existingRes.json()) as {
      success?: boolean;
      result?: { id: string; type: string; name: string }[];
    };
    const existingList = existingData.result || [];

    const upsertRecord = async (type: string, name: string, payload: Record<string, unknown>) => {
      const match = existingList.find((r) => r.type === type && r.name === name);
      const url = match
        ? `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(cf.zoneId)}/dns_records/${match.id}`
        : `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(cf.zoneId)}/dns_records`;
      const method = match ? 'PUT' : 'POST';
      await fetch(url, { method, headers, body: JSON.stringify(payload) });
    };

    if (entry.ipv4 && /^\d{1,3}(\.\d{1,3}){3}$/.test(entry.ipv4)) {
      await upsertRecord('A', fqdn, {
        type: 'A',
        name: fqdn,
        content: entry.ipv4,
        ttl: 120,
        proxied: false,
      });
    } else if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(entry.targetHost)) {
      await upsertRecord('CNAME', fqdn, {
        type: 'CNAME',
        name: fqdn,
        content: entry.targetHost,
        ttl: 120,
        proxied: false,
      });
    }

    if (entry.ipv6) {
      await upsertRecord('AAAA', fqdn, {
        type: 'AAAA',
        name: fqdn,
        content: entry.ipv6,
        ttl: 120,
        proxied: false,
      });
    }

    if (entry.edition !== 'Bedrock') {
      const srvName = `_minecraft._tcp.${fqdn}`;
      await upsertRecord('SRV', srvName, {
        type: 'SRV',
        name: srvName,
        ttl: 120,
        data: {
          service: '_minecraft',
          proto: '_tcp',
          name: fqdn,
          priority: 0,
          weight: 5,
          port: entry.targetPort,
          target: fqdn,
        },
      });
    }

    return { synced: true };
  } catch {
    return { synced: false, warning: 'Could not sync Cloudflare DNS records; live SurgeTrix URL remains active.' };
  }
}

async function deleteCloudflareDnsRecords(handle: string): Promise<void> {
  const cf = getCloudflareConfig();
  if (!cf) return;
  const fqdn = `${handle}.${cf.zoneName}`;
  const headers = {
    Authorization: `Bearer ${cf.token}`,
    'Content-Type': 'application/json',
  };
  try {
    const existingRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(cf.zoneId)}/dns_records?per_page=100`,
      { headers }
    );
    const existingData = (await existingRes.json()) as {
      result?: { id: string; name: string }[];
    };
    const targets = (existingData.result || []).filter(
      (r) => r.name === fqdn || r.name === `_minecraft._tcp.${fqdn}`
    );
    await Promise.all(
      targets.map((r) =>
        fetch(
          `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(cf.zoneId)}/dns_records/${r.id}`,
          { method: 'DELETE', headers }
        )
      )
    );
  } catch {
    // ignore cleanup failure
  }
}

function readDomainStore(): Record<string, StoredDomainEntry> {
  try {
    if (!fs.existsSync(DOMAINS_FILE)) return {};
    const raw = fs.readFileSync(DOMAINS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, StoredDomainEntry>) : {};
  } catch {
    return {};
  }
}

function writeDomainStore(store: Record<string, StoredDomainEntry>): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DOMAINS_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function resolvePublicHostSafely(host: string): Promise<{
  ok: true;
  ips: string[];
  ipv6: string[];
  cname: string[];
  srv: { name: string; port: number; priority: number; weight: number }[];
  latencyMs: number;
} | {
  ok: false;
  error: string;
}> {
  const start = Date.now();
  try {
    const lookedUp = await dns.lookup(host, { all: true }).catch(() => []);
    for (const entry of lookedUp) {
      if (isPrivateOrReservedIp(entry.address)) {
        return {
          ok: false,
          error: 'Target host resolved to a private or reserved IP address.',
        };
      }
    }

    const [aRes, aaaaRes, cnameRes, srvRes] = await Promise.all([
      dns.resolve4(host).catch(() => []),
      dns.resolve6(host).catch(() => []),
      dns.resolveCname(host).catch(() => []),
      dns.resolveSrv(`_minecraft._tcp.${host}`).catch(() => []),
    ]);

    const allIps = [...new Set([...aRes, ...lookedUp.filter((l) => l.family === 4).map((l) => l.address)])];
    const allIpv6 = [...new Set([...aaaaRes, ...lookedUp.filter((l) => l.family === 6).map((l) => l.address)])];

    for (const ip of [...allIps, ...allIpv6]) {
      if (isPrivateOrReservedIp(ip)) {
        return { ok: false, error: 'Resolved DNS target contains a private IP address.' };
      }
    }

    // Verify SRV targets are also public if present
    for (const rec of srvRes) {
      const srvLookedUp = await dns.lookup(rec.name, { all: true }).catch(() => []);
      for (const entry of srvLookedUp) {
        if (isPrivateOrReservedIp(entry.address)) {
          return { ok: false, error: 'SRV record points to a private or reserved IP address.' };
        }
      }
    }

    return {
      ok: true,
      ips: allIps,
      ipv6: allIpv6,
      cname: cnameRes,
      srv: srvRes.map((s) => ({
        name: s.name,
        port: s.port,
        priority: s.priority,
        weight: s.weight,
      })),
      latencyMs: Date.now() - start,
    };
  } catch {
    return { ok: false, error: 'DNS resolution failed for this hostname.' };
  }
}

function computeOfflineUuid(username: string): string {
  const md5 = crypto.createHash('md5').update(`OfflinePlayer:${username}`).digest();
  md5[6] = (md5[6] & 0x0f) | 0x30; // version 3
  md5[8] = (md5[8] & 0x3f) | 0x80; // variant RFC 4122
  return formatRawUuid(md5.toString('hex'));
}

const SURGE_AI_SYSTEM_INSTRUCTION = `You are Surge AI, the built-in technical assistant for SurgeTrix (a Minecraft server setup, configuration, and utility platform).
Help Minecraft players, server owners, and plugin/mod developers with accurate, practical answers about:
- Paper, Purpur, Spigot, Fabric, NeoForge, Velocity, and BungeeCord setup and performance tuning
- LuckPerms ranks, permissions, tracks, and inheritance commands
- TAB, PlaceholderAPI, EssentialsX, WorldEdit, WorldGuard, and YAML syntax/configs
- JVM startup flags (Aikar G1GC / ZGC), Spark TPS/MSPT profiling, and lag troubleshooting
- Minecraft commands, MOTD formatting (§ codes & MiniMessage), Nether portals, redstone, and gamerules

Formatting guidelines:
- Keep explanations concise, scannable, and practical (typically 120–250 words unless the user asks for an exhaustive breakdown).
- Put commands, YAML snippets, startup scripts, or MOTDs inside fenced markdown code blocks (\`\`\`yaml, \`\`\`bash, \`\`\`text, etc.) so users can copy them cleanly.
- Never invent fake plugin flags or nonexistent SurgeTrix URLs.`;

function extractErrorMessage(err: unknown): { status: number; message: string } {
  if (err && typeof err === 'object') {
    const anyErr = err as { status?: number; message?: string; name?: string };
    if (anyErr.name === 'AbortError' || anyErr.name === 'TimeoutError') {
      return { status: 504, message: 'Surge AI timed out waiting for Gemini. Please try again.' };
    }
    const status = typeof anyErr.status === 'number' && anyErr.status >= 400 ? anyErr.status : 500;
    let message =
      typeof anyErr.message === 'string' && anyErr.message.trim()
        ? anyErr.message.trim()
        : 'Gemini API request failed.';

    if (message.startsWith('{')) {
      try {
        const parsed = JSON.parse(message) as { error?: { message?: string }; message?: string };
        const nested = parsed?.error?.message || parsed?.message;
        if (typeof nested === 'string' && nested.trim()) {
          message = nested.trim();
        }
      } catch {
        // Keep original message if not JSON
      }
    }

    return { status, message };
  }
  return { status: 500, message: 'Unexpected server error while querying Surge AI.' };
}

function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as { status?: number; name?: string; message?: string };
  return (
    anyErr.status === 503 ||
    anyErr.status === 429 ||
    anyErr.status === 504 ||
    anyErr.name === 'AbortError' ||
    anyErr.name === 'TimeoutError' ||
    (typeof anyErr.message === 'string' && anyErr.message.toLowerCase().includes('timeout'))
  );
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    });
  });

  app.post('/api/dns-check', async (req, res) => {
    const parsed = parseMinecraftHostPort(String(req.body?.host || ''));
    if (!parsed.ok) {
      return res.status(400).json({ ok: false, error: parsed.error });
    }

    const dnsResult = await resolvePublicHostSafely(parsed.host);
    if (!dnsResult.ok) {
      return res.status(400).json({ ok: false, error: dnsResult.error });
    }

    const reachable = dnsResult.ips.length > 0 || dnsResult.ipv6.length > 0 || dnsResult.srv.length > 0;
    return res.json({
      ok: true,
      host: parsed.host,
      port: parsed.port,
      reachable,
      ips: dnsResult.ips,
      ipv6: dnsResult.ipv6,
      cname: dnsResult.cname,
      srv: dnsResult.srv,
      latencyMs: dnsResult.latencyMs,
    });
  });

  app.get('/api/mc-status', async (req, res) => {
    const editionParam = String(req.query.edition || 'java').toLowerCase() === 'bedrock' ? 'bedrock' : 'java';
    const defaultPort = editionParam === 'bedrock' ? 19132 : 25565;
    const parsed = parseMinecraftHostPort(String(req.query.address || ''), defaultPort);
    if (!parsed.ok) {
      return res.status(400).json({ ok: false, error: parsed.error });
    }

    const dnsResult = await resolvePublicHostSafely(parsed.host);
    if (!dnsResult.ok) {
      return res.status(400).json({ ok: false, error: dnsResult.error });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const start = Date.now();
    try {
      const apiUrl = `https://api.mcstatus.io/v2/status/${editionParam}/${encodeURIComponent(parsed.normalized)}`;
      const upstream = await fetch(apiUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SurgeTrix-Server-Checker/1.0' },
      });

      if (!upstream.ok) {
        return res.status(502).json({
          ok: false,
          error: `Live status probe returned HTTP ${upstream.status}.`,
        });
      }

      const data = (await upstream.json()) as {
        online?: boolean;
        host?: string;
        port?: number;
        ip_address?: string | null;
        srv_record?: { host: string; port: number } | null;
        version?: { name_clean?: string; name_raw?: string; protocol?: number } | null;
        players?: { online?: number; max?: number } | null;
        motd?: { clean?: string; raw?: string } | null;
        icon?: string | null;
      };

      const latencyMs = Date.now() - start;
      return res.json({
        ok: true,
        address: parsed.normalized,
        host: data.host || parsed.host,
        port: data.port || parsed.port,
        edition: editionParam === 'bedrock' ? 'Bedrock Edition' : 'Java Edition',
        online: Boolean(data.online),
        playersOnline: typeof data.players?.online === 'number' ? data.players.online : 0,
        maxPlayers: typeof data.players?.max === 'number' ? data.players.max : 0,
        version: data.version?.name_clean || data.version?.name_raw || (data.online ? 'Minecraft' : 'Offline'),
        motdClean: data.motd?.clean?.trim() || (data.online ? `${parsed.host} — Online` : 'Server unreachable'),
        latencyMs,
        ipAddress: data.ip_address || dnsResult.ips[0] || null,
        srvRecord: data.srv_record || (dnsResult.srv[0] ? { host: dnsResult.srv[0].name, port: dnsResult.srv[0].port } : null),
        dnsIps: dnsResult.ips,
        icon: typeof data.icon === 'string' && data.icon.startsWith('data:image/') ? data.icon : null,
      });
    } catch (err) {
      const msg = err instanceof Error && err.name === 'AbortError'
        ? 'Timed out waiting for server status probe.'
        : 'Unable to reach live Minecraft server status service.';
      return res.status(504).json({ ok: false, error: msg });
    } finally {
      clearTimeout(timer);
    }
  });

  app.get('/api/player/:username', async (req, res) => {
    const rawName = String(req.params.username || '').trim();
    if (!validateMinecraftUsername(rawName)) {
      return res.status(400).json({
        ok: false,
        error: 'Minecraft usernames must be 1–16 characters (letters, numbers, underscore).',
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const upstream = await fetch(
        `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(rawName)}`,
        {
          signal: controller.signal,
          headers: { 'User-Agent': 'SurgeTrix-Player-Lookup/1.0' },
        }
      );

      if (upstream.status === 404 || upstream.status === 204) {
        return res.json({
          ok: true,
          found: false,
          username: rawName,
          uuid: null,
          rawUuid: null,
          offlineUuid: computeOfflineUuid(rawName),
          avatarUrl: null,
          bodyUrl: null,
        });
      }

      if (!upstream.ok) {
        return res.status(502).json({
          ok: false,
          error: `Mojang profile service returned HTTP ${upstream.status}.`,
        });
      }

      const profile = (await upstream.json()) as { id: string; name: string };
      const formattedUuid = formatRawUuid(profile.id);
      return res.json({
        ok: true,
        found: true,
        username: profile.name,
        uuid: formattedUuid,
        rawUuid: profile.id,
        offlineUuid: computeOfflineUuid(profile.name),
        avatarUrl: `https://mc-heads.net/avatar/${encodeURIComponent(profile.name)}/96`,
        bodyUrl: `https://mc-heads.net/body/${encodeURIComponent(profile.name)}/180`,
      });
    } catch {
      return res.status(504).json({
        ok: false,
        error: 'Timed out querying Mojang profile API.',
      });
    } finally {
      clearTimeout(timer);
    }
  });

  app.get('/api/subdomains/detect', async (req, res) => {
    const addressQuery = String(req.query.address || req.query.serverIp || '').trim();
    if (addressQuery) {
      const parsed = parseMinecraftHostPort(addressQuery, 25565);
      if (parsed.ok) {
        const dnsInfo = await resolvePublicHostSafely(parsed.host);
        if (dnsInfo.ok && (dnsInfo.ips.length > 0 || dnsInfo.ipv6.length > 0)) {
          return res.json({
            ok: true,
            found: true,
            ip: dnsInfo.ips[0] || parsed.host,
            port: dnsInfo.srv[0]?.port || parsed.port,
            ipv6: dnsInfo.ipv6[0] || null,
            note: `Resolved public DNS records for ${parsed.host}.`,
          });
        }
      }
    }

    const forwarded = String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '')
      .split(',')[0]
      .trim()
      .replace(/^::ffff:/, '');
    const remoteIp = String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    const candidateIp = forwarded || remoteIp;

    if (candidateIp && !isPrivateOrReservedIp(candidateIp)) {
      return res.json({
        ok: true,
        found: true,
        ip: candidateIp,
        port: 25565,
        ipv6: candidateIp.includes(':') ? candidateIp : null,
        note: 'Detected your current network public IP address.',
      });
    }

    return res.json({
      ok: true,
      found: false,
      ip: '',
      port: 25565,
      ipv6: null,
      note: 'No public game server IP auto-detected from this browser session. Enter your server IPv4 or hostname below (e.g. mc.hypixel.net or 203.0.113.10).',
    });
  });

  const formatPublicDomain = (entry: StoredDomainEntry) => {
    const fallbackInstant =
      entry.instantDomain ||
      (entry.lastDnsIps?.[0] ? buildInstantWorkingDomain(entry.handle, entry.lastDnsIps[0]) || undefined : undefined);
    const activeWorking =
      entry.workingDomain ||
      (entry.cloudflareSynced ? `${entry.handle}.${entry.zoneDomain || DEFAULT_ZONE_NAME}` : fallbackInstant || entry.targetHost);
    const activeConnect =
      entry.connectAddress ||
      (entry.cloudflareSynced && entry.edition !== 'Bedrock'
        ? activeWorking
        : formatConnectAddress(activeWorking, entry.targetPort, entry.edition));

    return {
      handle: entry.handle,
      zoneDomain: entry.zoneDomain || DEFAULT_ZONE_NAME,
      fullDomain: `${entry.handle}.${entry.zoneDomain || DEFAULT_ZONE_NAME}`,
      instantDomain: fallbackInstant,
      workingDomain: activeWorking,
      connectAddress: activeConnect,
      dnsProvider: entry.dnsProvider || (entry.cloudflareSynced ? 'cloudflare' : fallbackInstant ? 'instant' : undefined),
      serverName: entry.serverName,
      targetHost: entry.targetHost,
      targetPort: entry.targetPort,
      ipv6: entry.ipv6 || undefined,
      edition: entry.edition,
      dnsStatus: entry.dnsStatus || 'web_active',
      cloudflareSynced: Boolean(entry.cloudflareSynced),
      lastDnsCheckAt: entry.lastDnsCheckAt,
      lastDnsIps: entry.lastDnsIps || [],
      lastDnsSrv: entry.lastDnsSrv || [],
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  };

  app.get('/api/domains/config', (_req, res) => {
    const cf = getCloudflareConfig();
    return res.json({
      ok: true,
      zoneName: cf ? cf.zoneName : 'duckdns.org',
      cloudflareConfigured: Boolean(cf),
      duckdnsDefault: true,
    });
  });

  app.get('/api/domains/:handle', (req, res) => {
    const handle = sanitizeDomainHandle(String(req.params.handle || ''));
    if (!isValidDomainHandle(handle)) {
      return res.status(400).json({ ok: false, error: 'Invalid or reserved domain handle.' });
    }
    const store = readDomainStore();
    const entry = store[handle];
    if (!entry) {
      return res.status(404).json({ ok: false, error: 'Free domain handle not found.' });
    }
    return res.json({
      ok: true,
      domain: formatPublicDomain(entry),
    });
  });

  app.post('/api/domains', async (req, res) => {
    const rawHandleInput = String(req.body?.handle || '')
      .trim()
      .toLowerCase()
      .replace(/\.duckdns\.org$/i, '');
    const handle = sanitizeDomainHandle(rawHandleInput);
    if (isReservedDomainHandle(handle)) {
      return res.status(400).json({
        ok: false,
        error: `Subdomain "${handle}" is reserved. Choose a unique name for your server.`,
      });
    }
    if (!isValidDomainHandle(handle)) {
      return res.status(400).json({
        ok: false,
        error: 'Subdomain must be 2–32 lowercase letters, numbers, or hyphens.',
      });
    }

    const serverName = String(req.body?.serverName || handle).trim().slice(0, 64);
    if (serverName.length < 2) {
      return res.status(400).json({ ok: false, error: 'Enter a server display name (at least 2 characters).' });
    }

    const rawEdition = String(req.body?.edition || 'Java');
    const edition: 'Java' | 'Bedrock' | 'Crossplay' =
      rawEdition === 'Bedrock' || rawEdition === 'Crossplay' ? rawEdition : 'Java';

    const defaultPort = edition === 'Bedrock' ? 19132 : 25565;
    const rawTarget = String(req.body?.target || '').trim();
    const explicitPort = req.body?.port ? Number(req.body.port) : undefined;
    const combinedTarget =
      explicitPort && rawTarget && !rawTarget.includes(':') && explicitPort >= 1 && explicitPort <= 65535
        ? `${rawTarget}:${explicitPort}`
        : rawTarget;

    const parsedTarget = parseMinecraftHostPort(combinedTarget, defaultPort);
    if (!parsedTarget.ok) {
      return res.status(400).json({ ok: false, error: parsedTarget.error });
    }

    const rawIpv6 = typeof req.body?.ipv6 === 'string' ? req.body.ipv6.trim() : '';
    if (rawIpv6 && !isValidPublicIpv6(rawIpv6)) {
      return res.status(400).json({
        ok: false,
        error: 'Enter a valid public IPv6 address (private or loopback IPv6 addresses are blocked).',
      });
    }

    const dnsCheck = await resolvePublicHostSafely(parsedTarget.host);
    if (!dnsCheck.ok) {
      return res.status(400).json({ ok: false, error: dnsCheck.error });
    }
    if (dnsCheck.ips.length === 0 && dnsCheck.ipv6.length === 0 && dnsCheck.srv.length === 0) {
      return res.status(400).json({
        ok: false,
        error: `Could not resolve public DNS for "${parsedTarget.host}". Verify the IP or hostname exists before creating.`,
      });
    }

    const store = readDomainStore();
    const existing = store[handle];
    const providedToken = typeof req.body?.ownerToken === 'string' ? req.body.ownerToken.trim() : '';
    const providedUid = typeof req.body?.ownerUid === 'string' ? req.body.ownerUid.trim().slice(0, 128) : undefined;

    if (existing) {
      const tokenMatches = providedToken && hashToken(providedToken) === existing.ownerTokenHash;
      const uidMatches = providedUid && existing.ownerUid && providedUid === existing.ownerUid;
      if (!tokenMatches && !uidMatches) {
        return res.status(409).json({
          ok: false,
          error: `Subdomain "${handle}" is already claimed. Pick another handle or edit from the owning browser/account.`,
        });
      }
    }

    const cfSync = await syncCloudflareDnsRecords({
      handle,
      targetHost: parsedTarget.host,
      targetPort: parsedTarget.port,
      ipv4: dnsCheck.ips[0],
      ipv6: rawIpv6 || undefined,
      edition,
    });

    const ownerToken = existing ? providedToken || crypto.randomBytes(24).toString('hex') : crypto.randomBytes(24).toString('hex');
    const nowIso = new Date().toISOString();
    const cfConfig = getCloudflareConfig();
    const zoneName = cfConfig ? cfConfig.zoneName : 'duckdns.org';

    const primaryIpv4 = dnsCheck.ips[0];
    const instantDomainCandidate = primaryIpv4 ? buildInstantWorkingDomain(handle, primaryIpv4) : null;
    const duckFqdn = `${handle}.duckdns.org`;
    const suppliedDuckToken =
      typeof req.body?.duckdnsToken === 'string' && req.body.duckdnsToken.trim()
        ? req.body.duckdnsToken.trim()
        : process.env.DUCKDNS_TOKEN?.trim() || '';

    let dnsProvider: 'instant' | 'duckdns' | 'cloudflare' = 'duckdns';
    let workingDomain = duckFqdn;
    let dnsStatus: 'verified' | 'web_active' | 'error' = 'web_active';
    let duckWarning = cfConfig ? cfSync.warning : undefined;

    if (cfSync.synced) {
      dnsProvider = 'cloudflare';
      workingDomain = `${handle}.${zoneName}`;
      dnsStatus = 'verified';
    } else if (suppliedDuckToken && primaryIpv4) {
      const duckCheck = parseDuckDnsUpdateInput(handle, suppliedDuckToken);
      if (!duckCheck.ok) {
        return res.status(400).json({ ok: false, error: duckCheck.error });
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const params = new URLSearchParams({
          domains: duckCheck.subdomain,
          token: duckCheck.token,
          ip: primaryIpv4,
        });
        if (rawIpv6) params.set('ipv6', rawIpv6);
        const duckRes = await fetch(`https://www.duckdns.org/update?${params.toString()}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'SurgeTrix-DNS-Sync/1.0' },
        });
        const bodyText = (await duckRes.text()).trim().toUpperCase();
        if (!duckRes.ok || bodyText !== 'OK') {
          return res.status(400).json({
            ok: false,
            error: `DuckDNS could not update "${duckFqdn}". Claim "${duckFqdn}" on duckdns.org first and check your DuckDNS token.`,
          });
        }
        const resolvedDuck = await dns.resolve4(duckFqdn).catch(() => [] as string[]);
        dnsProvider = 'duckdns';
        workingDomain = duckFqdn;
        dnsStatus = resolvedDuck.length > 0 || bodyText === 'OK' ? 'verified' : 'web_active';
      } catch {
        return res.status(504).json({
          ok: false,
          error: 'Timed out contacting DuckDNS API. Please try again.',
        });
      } finally {
        clearTimeout(timer);
      }
    } else {
      const resolvedDuck = await dns.resolve4(duckFqdn).catch(() => [] as string[]);
      if (primaryIpv4 && resolvedDuck.includes(primaryIpv4)) {
        dnsProvider = 'duckdns';
        workingDomain = duckFqdn;
        dnsStatus = 'verified';
      } else {
        dnsProvider = 'duckdns';
        workingDomain = duckFqdn;
        dnsStatus = 'web_active';
      }
    }

    const connectAddress =
      cfSync.synced && edition !== 'Bedrock'
        ? workingDomain
        : formatConnectAddress(workingDomain, parsedTarget.port, edition);

    store[handle] = {
      handle,
      zoneDomain: zoneName,
      instantDomain: instantDomainCandidate || undefined,
      workingDomain,
      connectAddress,
      dnsProvider,
      serverName,
      targetHost: parsedTarget.host,
      targetPort: parsedTarget.port,
      ipv6: rawIpv6 || undefined,
      edition,
      dnsStatus,
      cloudflareSynced: cfSync.synced,
      lastDnsCheckAt: nowIso,
      lastDnsIps: dnsCheck.ips,
      lastDnsSrv: dnsCheck.srv.map((s) => `${s.priority} ${s.weight} ${s.port} ${s.name}`),
      ownerTokenHash: existing ? existing.ownerTokenHash : hashToken(ownerToken),
      ownerUid: providedUid || existing?.ownerUid,
      createdAt: existing ? existing.createdAt : nowIso,
      updatedAt: nowIso,
    };
    writeDomainStore(store);

    return res.json({
      ok: true,
      ownerToken,
      warning: duckWarning,
      domain: formatPublicDomain(store[handle]),
    });
  });

  app.post('/api/domains/sync-duckdns', async (req, res) => {
    const handle = sanitizeDomainHandle(String(req.body?.handle || ''));
    if (!isValidDomainHandle(handle)) {
      return res.status(400).json({ ok: false, error: 'Invalid subdomain handle.' });
    }
    const store = readDomainStore();
    const existing = store[handle];
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Subdomain not found.' });
    }

    const providedToken = typeof req.body?.ownerToken === 'string' ? req.body.ownerToken.trim() : '';
    const providedUid = typeof req.body?.ownerUid === 'string' ? req.body.ownerUid.trim() : '';
    const tokenMatches = providedToken && hashToken(providedToken) === existing.ownerTokenHash;
    const uidMatches = providedUid && existing.ownerUid && providedUid === existing.ownerUid;
    if (!tokenMatches && !uidMatches) {
      return res.status(403).json({ ok: false, error: 'Not authorized to update DNS for this subdomain.' });
    }

    const duckSubInput = String(req.body?.duckdnsSubdomain || existing.handle || '').trim();
    const duckParsed = parseDuckDnsUpdateInput(
      duckSubInput,
      String(req.body?.duckdnsToken || '')
    );
    if (!duckParsed.ok) {
      return res.status(400).json({ ok: false, error: duckParsed.error });
    }

    const dnsCheck = await resolvePublicHostSafely(existing.targetHost);
    if (!dnsCheck.ok || dnsCheck.ips.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Target host does not resolve to a public IPv4 address for DuckDNS sync.',
      });
    }

    const ipv4 = dnsCheck.ips[0];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const params = new URLSearchParams({
        domains: duckParsed.subdomain,
        token: duckParsed.token,
        ip: ipv4,
      });
      if (existing.ipv6) params.set('ipv6', existing.ipv6);

      const duckRes = await fetch(`https://www.duckdns.org/update?${params.toString()}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SurgeTrix-DNS-Sync/1.0' },
      });
      const bodyText = (await duckRes.text()).trim().toUpperCase();
      if (!duckRes.ok || bodyText !== 'OK') {
        return res.status(400).json({
          ok: false,
          error: 'DuckDNS rejected the update. Check that you own that subdomain and your DuckDNS token is correct.',
        });
      }

      const resolved = await dns.resolve4(duckParsed.fqdn).catch(() => []);
      const nowIso = new Date().toISOString();
      existing.workingDomain = duckParsed.fqdn;
      existing.dnsProvider = 'duckdns';
      existing.connectAddress = formatConnectAddress(duckParsed.fqdn, existing.targetPort, existing.edition);
      existing.dnsStatus = resolved.length > 0 || bodyText === 'OK' ? 'verified' : 'web_active';
      existing.lastDnsCheckAt = nowIso;
      existing.lastDnsIps = resolved.length > 0 ? resolved : dnsCheck.ips;
      existing.updatedAt = nowIso;
      writeDomainStore(store);

      return res.json({
        ok: true,
        resolvedIps: existing.lastDnsIps,
        domain: formatPublicDomain(existing),
      });
    } catch {
      return res.status(504).json({
        ok: false,
        error: 'Timed out contacting DuckDNS API. Please try again.',
      });
    } finally {
      clearTimeout(timer);
    }
  });

  app.post('/api/domains/test-connection', async (req, res) => {
    const rawHandle = typeof req.body?.handle === 'string' ? sanitizeDomainHandle(req.body.handle) : '';
    const store = readDomainStore();
    const existing = rawHandle ? store[rawHandle] : undefined;

    const editionInput = existing?.edition || (req.body?.edition === 'Bedrock' ? 'Bedrock' : 'Java');
    const editionParam = editionInput === 'Bedrock' ? 'bedrock' : 'java';
    const defaultPort = editionInput === 'Bedrock' ? 19132 : 25565;

    let targetHost = existing?.targetHost || '';
    let targetPort = existing?.targetPort || defaultPort;
    let workingDomain = existing?.workingDomain || existing?.instantDomain || '';

    if (!existing) {
      const parsed = parseMinecraftHostPort(String(req.body?.address || ''), defaultPort);
      if (!parsed.ok) {
        return res.status(400).json({ ok: false, error: parsed.error });
      }
      targetHost = parsed.host;
      targetPort = parsed.port;
      workingDomain = parsed.host;
    }

    const dnsCheck = await resolvePublicHostSafely(targetHost);
    if (!dnsCheck.ok || dnsCheck.ips.length === 0) {
      return res.status(400).json({
        ok: false,
        error: !dnsCheck.ok ? dnsCheck.error : `No public IPv4 found for ${targetHost}.`,
      });
    }

    const primaryIp = dnsCheck.ips[0];
    const resolvedWorkingIps = workingDomain
      ? await dns.resolve4(workingDomain).catch(() => [])
      : [];

    const tcpPromise =
      editionInput === 'Bedrock'
        ? Promise.resolve({ reachable: false, latencyMs: null as number | null })
        : testTcpPort(primaryIp, targetPort, 3500);

    const statusTarget =
      targetPort === defaultPort ? targetHost : `${targetHost}:${targetPort}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const mcPromise = fetch(
      `https://api.mcstatus.io/v2/status/${editionParam}/${encodeURIComponent(statusTarget)}`,
      { signal: controller.signal, headers: { 'User-Agent': 'SurgeTrix-Connection-Test/1.0' } }
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .finally(() => clearTimeout(timer));

    const [tcpInfo, mcData] = await Promise.all([tcpPromise, mcPromise]);
    const mcTyped = mcData as {
      online?: boolean;
      players?: { online?: number; max?: number };
      version?: { name_clean?: string; name_raw?: string };
      motd?: { clean?: string };
      icon?: string;
    } | null;

    return res.json({
      ok: true,
      targetHost,
      targetPort,
      workingDomain,
      workingDomainResolves: resolvedWorkingIps.length > 0,
      workingDomainIps: resolvedWorkingIps,
      dnsIps: dnsCheck.ips,
      tcpReachable: tcpInfo.reachable,
      tcpLatencyMs: tcpInfo.latencyMs,
      online: Boolean(mcTyped?.online || tcpInfo.reachable),
      playersOnline: typeof mcTyped?.players?.online === 'number' ? mcTyped.players.online : 0,
      maxPlayers: typeof mcTyped?.players?.max === 'number' ? mcTyped.players.max : 0,
      version: mcTyped?.version?.name_clean || mcTyped?.version?.name_raw || null,
      motdClean: mcTyped?.motd?.clean?.trim() || null,
      icon: typeof mcTyped?.icon === 'string' && mcTyped.icon.startsWith('data:image/') ? mcTyped.icon : null,
    });
  });

  app.post('/api/domains/check', async (req, res) => {
    const handle = sanitizeDomainHandle(String(req.body?.handle || ''));
    if (!isValidDomainHandle(handle)) {
      return res.status(400).json({ ok: false, error: 'Invalid domain handle.' });
    }
    const store = readDomainStore();
    const existing = store[handle];
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Subdomain not found.' });
    }

    const dnsCheck = await resolvePublicHostSafely(existing.targetHost);
    const nowIso = new Date().toISOString();
    if (!dnsCheck.ok) {
      existing.dnsStatus = 'error';
      existing.lastDnsCheckAt = nowIso;
      writeDomainStore(store);
      return res.status(400).json({ ok: false, error: dnsCheck.error });
    }

    const zoneFqdn = `${handle}.${existing.zoneDomain || 'duckdns.org'}`;
    const duckFqdn =
      existing.workingDomain && existing.workingDomain.endsWith('.duckdns.org')
        ? existing.workingDomain
        : `${handle}.duckdns.org`;
    const [zoneLookup, zoneSrvLookup, duckLookup] = await Promise.all([
      existing.zoneDomain && existing.zoneDomain !== 'duckdns.org'
        ? dns.resolve4(zoneFqdn).catch(() => [] as string[])
        : Promise.resolve([] as string[]),
      existing.zoneDomain && existing.zoneDomain !== 'duckdns.org'
        ? dns.resolveSrv(`_minecraft._tcp.${zoneFqdn}`).catch(() => [])
        : Promise.resolve([]),
      dns.resolve4(duckFqdn).catch(() => [] as string[]),
    ]);

    existing.lastDnsCheckAt = nowIso;
    existing.lastDnsIps = dnsCheck.ips;
    existing.lastDnsSrv = dnsCheck.srv.map((s) => `${s.priority} ${s.weight} ${s.port} ${s.name}`);
    existing.cloudflareSynced = zoneLookup.length > 0 || zoneSrvLookup.length > 0 || existing.cloudflareSynced;
    if (existing.cloudflareSynced) {
      existing.workingDomain = zoneFqdn;
      existing.dnsProvider = 'cloudflare';
      existing.connectAddress = existing.edition !== 'Bedrock' ? zoneFqdn : formatConnectAddress(zoneFqdn, existing.targetPort, existing.edition);
    } else {
      existing.workingDomain = duckFqdn;
      existing.dnsProvider = 'duckdns';
      existing.connectAddress = formatConnectAddress(duckFqdn, existing.targetPort, existing.edition);
    }
    const duckMatches = Boolean(dnsCheck.ips[0] && duckLookup.includes(dnsCheck.ips[0]));
    const resolvesAny = zoneLookup.length > 0 || zoneSrvLookup.length > 0 || duckMatches;
    existing.dnsStatus = resolvesAny ? 'verified' : 'web_active';
    writeDomainStore(store);

    return res.json({
      ok: true,
      a: zoneLookup.length > 0 ? zoneLookup : duckLookup.length > 0 ? duckLookup : dnsCheck.ips,
      aaaa: existing.ipv6 ? [existing.ipv6] : dnsCheck.ipv6,
      srv:
        zoneSrvLookup.length > 0
          ? zoneSrvLookup.map((s) => `${s.priority} ${s.weight} ${s.port} ${s.name}`)
          : existing.lastDnsSrv,
      zoneResolvesPublicly: zoneLookup.length > 0 || duckMatches,
      workingDomainResolves: duckMatches || zoneLookup.length > 0,
      domain: formatPublicDomain(existing),
    });
  });

  app.delete('/api/domains/:handle', async (req, res) => {
    const handle = sanitizeDomainHandle(String(req.params.handle || ''));
    if (!isValidDomainHandle(handle)) {
      return res.status(400).json({ ok: false, error: 'Invalid domain handle.' });
    }
    const store = readDomainStore();
    const existing = store[handle];
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Domain handle not found.' });
    }

    const ownerToken = String(req.headers['x-domain-token'] || req.body?.ownerToken || '').trim();
    const ownerUid = String(req.headers['x-owner-uid'] || req.body?.ownerUid || '').trim();
    const tokenMatches = ownerToken && hashToken(ownerToken) === existing.ownerTokenHash;
    const uidMatches = ownerUid && existing.ownerUid && ownerUid === existing.ownerUid;
    if (!tokenMatches && !uidMatches) {
      return res.status(403).json({ ok: false, error: 'Not authorized to remove this free domain handle.' });
    }

    await deleteCloudflareDnsRecords(handle);
    delete store[handle];
    writeDomainStore(store);
    return res.json({ ok: true, deleted: handle });
  });

  // ==========================================
  // BuiltByBit-Style Plugins Marketplace & Owner Control Panel APIs
  // ==========================================
  async function requireVerifiedAuth(
    req: express.Request,
    res: express.Response
  ): Promise<VerifiedAuthUser | null> {
    const authUser = await verifyFirebaseIdToken(req.headers.authorization);
    if (!authUser) {
      res.status(401).json({ ok: false, error: 'Sign in with a verified account first.' });
      return null;
    }
    if (!authUser.emailVerified) {
      res.status(403).json({ ok: false, error: 'Verify your email address before performing this action.' });
      return null;
    }
    return authUser;
  }

  async function requirePlatformOwner(
    req: express.Request,
    res: express.Response
  ): Promise<VerifiedAuthUser | null> {
    const authUser = await verifyFirebaseIdToken(req.headers.authorization);
    if (!authUser) {
      res.status(401).json({ ok: false, error: 'Authentication required for Owner controls.' });
      return null;
    }
    if (!authUser.isOwner) {
      res.status(403).json({
        ok: false,
        error: 'Owner permission required. Only drminemc@gmail.com can upload or manage plugins.',
      });
      return null;
    }
    return authUser;
  }

  app.get('/api/plugins', async (req, res) => {
    const includeHidden = req.query.includeHidden === '1';
    const plugins = readPluginStore();
    if (includeHidden) {
      const authUser = await verifyFirebaseIdToken(req.headers.authorization);
      if (authUser?.isOwner) {
        return res.json({ ok: true, plugins });
      }
    }
    const visible = plugins.filter((p) => p.status === 'published' && Boolean(p.storedFileName));
    return res.json({ ok: true, plugins: visible });
  });

  app.get('/api/plugins/:id', async (req, res) => {
    const pluginId = String(req.params.id || '').trim();
    const plugins = readPluginStore();
    const found = plugins.find((p) => p.id === pluginId || p.slug === pluginId);
    if (!found) {
      return res.status(404).json({ ok: false, error: 'Plugin not found.' });
    }
    if (found.status !== 'published' || !found.storedFileName) {
      const authUser = await verifyFirebaseIdToken(req.headers.authorization);
      if (!authUser?.isOwner) {
        return res.status(404).json({ ok: false, error: 'Plugin not found.' });
      }
    }
    return res.json({ ok: true, plugin: found });
  });

  app.post('/api/plugins', async (req, res) => {
    const owner = await requirePlatformOwner(req, res);
    if (!owner) return;

    const validated = validatePluginPayload(req.body || {});
    if (!validated.ok) {
      return res.status(400).json({ ok: false, error: validated.error });
    }

    const plugins = readPluginStore();
    const baseSlug = slugifyPluginId(validated.data.name);
    let uniqueId = baseSlug;
    let counter = 2;
    while (plugins.some((p) => p.id === uniqueId || p.slug === uniqueId)) {
      uniqueId = `${baseSlug}-${counter++}`;
    }

    const nowIso = new Date().toISOString();
    const versionId = `ver-${Date.now()}`;
    const releaseTitle =
      typeof req.body?.releaseTitle === 'string' && req.body.releaseTitle.trim()
        ? req.body.releaseTitle.trim().slice(0, 80)
        : `Initial Release v${validated.data.version}`;
    const changelog =
      typeof req.body?.changelog === 'string' && req.body.changelog.trim()
        ? req.body.changelog.trim().slice(0, 4000)
        : 'Initial plugin release uploaded by Owner.';

    const initialVersion: PluginVersionRecord = {
      id: versionId,
      version: validated.data.version,
      title: releaseTitle,
      changelog,
      fileName: '',
      storedFileName: '',
      fileSize: 0,
      sha256: '',
      downloads: 0,
      createdAt: nowIso,
    };

    const created: PluginListing = {
      id: uniqueId,
      slug: uniqueId,
      name: validated.data.name,
      tagline: validated.data.tagline,
      description: validated.data.description,
      category: validated.data.category,
      platforms: validated.data.platforms,
      mcVersions: validated.data.mcVersions,
      priceLabel: validated.data.priceLabel,
      featured: Boolean(req.body?.featured),
      status: 'hidden',
      authorName: owner.name || 'drminemc',
      authorEmail: owner.email,
      currentVersion: validated.data.version,
      fileName: '',
      storedFileName: '',
      fileSize: 0,
      sha256: '',
      supportUrl: validated.data.supportUrl,
      iconUrl: validated.data.iconUrl,
      downloads: 0,
      ratingAverage: 0,
      reviewsCount: 0,
      versions: [initialVersion],
      reviews: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    plugins.unshift(created);
    writePluginStore(plugins);
    return res.status(201).json({ ok: true, plugin: created, versionId });
  });

  app.post('/api/plugins/submit', async (req, res) => {
    const authUser = await requireVerifiedAuth(req, res);
    if (!authUser) return;

    const validated = validatePluginPayload(req.body || {});
    if (!validated.ok) {
      return res.status(400).json({ ok: false, error: validated.error });
    }

    const plugins = readPluginStore();
    const baseSlug = slugifyPluginId(validated.data.name);
    let uniqueId = baseSlug;
    let counter = 2;
    while (plugins.some((p) => p.id === uniqueId || p.slug === uniqueId)) {
      uniqueId = `${baseSlug}-${counter++}`;
    }

    const nowIso = new Date().toISOString();
    const versionId = `ver-${Date.now()}`;
    const releaseTitle =
      typeof req.body?.releaseTitle === 'string' && req.body.releaseTitle.trim()
        ? req.body.releaseTitle.trim().slice(0, 80)
        : `Submission v${validated.data.version}`;
    const changelog =
      typeof req.body?.changelog === 'string' && req.body.changelog.trim()
        ? req.body.changelog.trim().slice(0, 4000)
        : 'Community plugin submission awaiting Owner approval.';

    const initialVersion: PluginVersionRecord = {
      id: versionId,
      version: validated.data.version,
      title: releaseTitle,
      changelog,
      fileName: '',
      storedFileName: '',
      fileSize: 0,
      sha256: '',
      downloads: 0,
      createdAt: nowIso,
    };

    const created: PluginListing & { submitterUid?: string } = {
      id: uniqueId,
      slug: uniqueId,
      name: validated.data.name,
      tagline: validated.data.tagline,
      description: validated.data.description,
      category: validated.data.category,
      platforms: validated.data.platforms,
      mcVersions: validated.data.mcVersions,
      priceLabel: validated.data.priceLabel,
      featured: false,
      status: 'pending',
      authorName: authUser.name || 'Developer',
      authorEmail: '',
      submitterUid: authUser.uid,
      currentVersion: validated.data.version,
      fileName: '',
      storedFileName: '',
      fileSize: 0,
      sha256: '',
      supportUrl: validated.data.supportUrl,
      iconUrl: validated.data.iconUrl,
      downloads: 0,
      ratingAverage: 0,
      reviewsCount: 0,
      versions: [initialVersion],
      reviews: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    plugins.unshift(created);
    writePluginStore(plugins);
    return res.status(201).json({ ok: true, plugin: created, versionId });
  });

  app.post('/api/plugins/:id/versions', async (req, res) => {
    const owner = await requirePlatformOwner(req, res);
    if (!owner) return;

    const pluginId = String(req.params.id || '').trim();
    const plugins = readPluginStore();
    const plugin = plugins.find((p) => p.id === pluginId);
    if (!plugin) {
      return res.status(404).json({ ok: false, error: 'Plugin not found.' });
    }

    const version = typeof req.body?.version === 'string' ? req.body.version.trim() : '';
    if (!/^[a-zA-Z0-9._-]{1,24}$/.test(version)) {
      return res.status(400).json({ ok: false, error: 'Version must be 1–24 characters (e.g. 1.1.0).' });
    }
    const title =
      typeof req.body?.title === 'string' && req.body.title.trim()
        ? req.body.title.trim().slice(0, 80)
        : `Update v${version}`;
    const changelog =
      typeof req.body?.changelog === 'string' && req.body.changelog.trim()
        ? req.body.changelog.trim().slice(0, 4000)
        : `Released version ${version}.`;

    const versionId = `ver-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const ver: PluginVersionRecord = {
      id: versionId,
      version,
      title,
      changelog,
      fileName: '',
      storedFileName: '',
      fileSize: 0,
      sha256: '',
      downloads: 0,
      createdAt: nowIso,
    };
    plugin.versions.unshift(ver);
    plugin.updatedAt = nowIso;
    writePluginStore(plugins);
    return res.status(201).json({ ok: true, plugin, versionId });
  });

  app.post(
    '/api/plugins/:id/versions/:versionId/file',
    express.raw({
      type: ['application/octet-stream', 'application/java-archive', 'application/zip'],
      limit: '26mb',
    }),
    async (req, res) => {
      const authUser = await requireVerifiedAuth(req, res);
      if (!authUser) return;

      const pluginId = String(req.params.id || '').trim();
      const versionId = String(req.params.versionId || '').trim();
      const plugins = readPluginStore();
      const plugin = plugins.find((p) => p.id === pluginId);
      if (!plugin) {
        return res.status(404).json({ ok: false, error: 'Plugin not found.' });
      }
      const submitterUid = (plugin as PluginListing & { submitterUid?: string }).submitterUid;
      if (!authUser.isOwner && (plugin.status !== 'pending' || submitterUid !== authUser.uid)) {
        return res.status(403).json({
          ok: false,
          error: `Only the verified Owner (${OWNER_EMAIL}) or the pending plugin submitter can upload this archive.`,
        });
      }
      const ver = plugin.versions.find((v) => v.id === versionId);
      if (!ver) {
        return res.status(404).json({ ok: false, error: 'Plugin version record not found.' });
      }

      const rawBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const rawFileName = String(req.headers['x-file-name'] || `${plugin.slug}-${ver.version}.jar`);
      const fileCheck = validatePluginFileMeta(rawFileName, rawBuffer.length, rawBuffer);
      if (!fileCheck.ok) {
        return res.status(400).json({ ok: false, error: fileCheck.error });
      }

      const safeStoredName = `${plugin.id}-${ver.id}${fileCheck.extension}`.replace(/[^a-zA-Z0-9._-]/g, '-');
      const targetPath = resolveSafePluginFilePath(safeStoredName);
      if (!targetPath) {
        return res.status(400).json({ ok: false, error: 'Invalid storage filename.' });
      }

      fs.mkdirSync(PLUGIN_FILES_DIR, { recursive: true });
      fs.writeFileSync(targetPath, rawBuffer);

      const sha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');
      const nowIso = new Date().toISOString();
      ver.fileName = fileCheck.safeName;
      ver.storedFileName = safeStoredName;
      ver.fileSize = rawBuffer.length;
      ver.sha256 = sha256;

      plugin.currentVersion = ver.version;
      plugin.fileName = fileCheck.safeName;
      plugin.storedFileName = safeStoredName;
      plugin.fileSize = rawBuffer.length;
      plugin.sha256 = sha256;
      if (authUser.isOwner && req.query.publish !== '0') {
        plugin.status = 'published';
      }
      plugin.updatedAt = nowIso;
      writePluginStore(plugins);

      return res.json({ ok: true, plugin });
    }
  );

  app.patch('/api/plugins/:id', async (req, res) => {
    const owner = await requirePlatformOwner(req, res);
    if (!owner) return;

    const pluginId = String(req.params.id || '').trim();
    const plugins = readPluginStore();
    const plugin = plugins.find((p) => p.id === pluginId);
    if (!plugin) {
      return res.status(404).json({ ok: false, error: 'Plugin not found.' });
    }

    const merged = validatePluginPayload({
      name: req.body?.name ?? plugin.name,
      tagline: req.body?.tagline ?? plugin.tagline,
      description: req.body?.description ?? plugin.description,
      category: req.body?.category ?? plugin.category,
      version: plugin.currentVersion,
      platforms: req.body?.platforms ?? plugin.platforms,
      mcVersions: req.body?.mcVersions ?? plugin.mcVersions,
      priceLabel: req.body?.priceLabel ?? plugin.priceLabel,
      supportUrl: req.body?.supportUrl ?? plugin.supportUrl,
      iconUrl: req.body?.iconUrl !== undefined ? req.body.iconUrl : plugin.iconUrl,
    });
    if (!merged.ok) {
      return res.status(400).json({ ok: false, error: merged.error });
    }

    plugin.name = merged.data.name;
    plugin.tagline = merged.data.tagline;
    plugin.description = merged.data.description;
    plugin.category = merged.data.category;
    plugin.platforms = merged.data.platforms;
    plugin.mcVersions = merged.data.mcVersions;
    plugin.priceLabel = merged.data.priceLabel;
    plugin.supportUrl = merged.data.supportUrl;
    plugin.iconUrl = merged.data.iconUrl;
    if (typeof req.body?.featured === 'boolean') {
      plugin.featured = req.body.featured;
    }
    if (
      req.body?.status === 'published' ||
      req.body?.status === 'pending' ||
      req.body?.status === 'hidden'
    ) {
      if (req.body.status === 'published' && !plugin.storedFileName) {
        return res.status(400).json({
          ok: false,
          error: 'Upload a .jar or .zip file before publishing this plugin.',
        });
      }
      plugin.status = req.body.status;
    }
    plugin.updatedAt = new Date().toISOString();
    writePluginStore(plugins);
    return res.json({ ok: true, plugin });
  });

  app.delete('/api/plugins/:id', async (req, res) => {
    const owner = await requirePlatformOwner(req, res);
    if (!owner) return;

    const pluginId = String(req.params.id || '').trim();
    const plugins = readPluginStore();
    const idx = plugins.findIndex((p) => p.id === pluginId);
    if (idx === -1) {
      return res.status(404).json({ ok: false, error: 'Plugin not found.' });
    }

    const [removed] = plugins.splice(idx, 1);
    for (const ver of removed.versions) {
      if (ver.storedFileName) {
        const p = resolveSafePluginFilePath(ver.storedFileName);
        if (p && fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
      }
    }
    writePluginStore(plugins);
    return res.json({ ok: true, deleted: pluginId });
  });

  app.get('/api/plugins/:id/download', async (req, res) => {
    const pluginId = String(req.params.id || '').trim();
    const plugins = readPluginStore();
    const plugin = plugins.find((p) => p.id === pluginId || p.slug === pluginId);
    if (!plugin || !plugin.storedFileName) {
      return res.status(404).json({ ok: false, error: 'Plugin file not found.' });
    }
    if (plugin.status !== 'published') {
      const authUser = await verifyFirebaseIdToken(req.headers.authorization);
      if (!authUser?.isOwner) {
        return res.status(404).json({ ok: false, error: 'Plugin file not found.' });
      }
    }

    const requestedVersionId =
      typeof req.query.versionId === 'string' ? req.query.versionId.trim() : '';
    const ver = requestedVersionId
      ? plugin.versions.find((v) => v.id === requestedVersionId && v.storedFileName)
      : plugin.versions.find((v) => v.storedFileName === plugin.storedFileName) || plugin.versions[0];

    const targetStoredName = ver?.storedFileName || plugin.storedFileName;
    const downloadName = sanitizeDownloadFilename(ver?.fileName || plugin.fileName);
    const filePath = resolveSafePluginFilePath(targetStoredName);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: 'Plugin binary archive is missing from storage.' });
    }

    plugin.downloads += 1;
    if (ver) ver.downloads += 1;
    writePluginStore(plugins);

    const mimeType = downloadName.toLowerCase().endsWith('.zip')
      ? 'application/zip'
      : 'application/java-archive';
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    return res.sendFile(filePath);
  });

  app.post('/api/plugins/:id/reviews', async (req, res) => {
    const authUser = await requireVerifiedAuth(req, res);
    if (!authUser) return;

    const pluginId = String(req.params.id || '').trim();
    const plugins = readPluginStore();
    const plugin = plugins.find((p) => p.id === pluginId && p.status === 'published');
    if (!plugin) {
      return res.status(404).json({ ok: false, error: 'Plugin not found.' });
    }

    const validated = validateReviewPayload(req.body || {});
    if (!validated.ok) {
      return res.status(400).json({ ok: false, error: validated.error });
    }

    const nowIso = new Date().toISOString();
    const existingReview = plugin.reviews.find((r) => r.authorUid === authUser.uid);
    const displayName =
      typeof req.body?.authorName === 'string' && req.body.authorName.trim().length >= 2
        ? req.body.authorName.trim().replace(/[^a-zA-Z0-9_ .-]/g, '').slice(0, 32) || authUser.name
        : authUser.name;

    if (existingReview) {
      existingReview.authorName = displayName;
      existingReview.rating = validated.data.rating;
      existingReview.title = validated.data.title;
      existingReview.comment = validated.data.comment;
      existingReview.testedVersion = validated.data.testedVersion;
      existingReview.updatedAt = nowIso;
    } else {
      const review: PluginReviewRecord = {
        id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        pluginId: plugin.id,
        authorUid: authUser.uid,
        authorName: displayName,
        rating: validated.data.rating,
        title: validated.data.title,
        comment: validated.data.comment,
        testedVersion: validated.data.testedVersion,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      plugin.reviews.unshift(review);
    }

    const stats = computeRatingBreakdown(plugin.reviews);
    plugin.ratingAverage = stats.average;
    plugin.reviewsCount = stats.count;
    writePluginStore(plugins);

    return res.json({ ok: true, plugin });
  });

  app.patch('/api/plugins/:id/reviews/:reviewId/reply', async (req, res) => {
    const owner = await requirePlatformOwner(req, res);
    if (!owner) return;

    const pluginId = String(req.params.id || '').trim();
    const reviewId = String(req.params.reviewId || '').trim();
    const plugins = readPluginStore();
    const plugin = plugins.find((p) => p.id === pluginId);
    if (!plugin) {
      return res.status(404).json({ ok: false, error: 'Plugin not found.' });
    }
    const review = plugin.reviews.find((r) => r.id === reviewId);
    if (!review) {
      return res.status(404).json({ ok: false, error: 'Review not found.' });
    }

    const replyText = typeof req.body?.reply === 'string' ? req.body.reply.trim().slice(0, 1000) : '';
    const nowIso = new Date().toISOString();
    if (replyText) {
      review.ownerReply = replyText;
      review.ownerRepliedAt = nowIso;
    } else {
      delete review.ownerReply;
      delete review.ownerRepliedAt;
    }
    review.updatedAt = nowIso;
    writePluginStore(plugins);
    return res.json({ ok: true, plugin });
  });

  app.delete('/api/plugins/:id/reviews/:reviewId', async (req, res) => {
    const authUser = await requireVerifiedAuth(req, res);
    if (!authUser) return;

    const pluginId = String(req.params.id || '').trim();
    const reviewId = String(req.params.reviewId || '').trim();
    const plugins = readPluginStore();
    const plugin = plugins.find((p) => p.id === pluginId);
    if (!plugin) {
      return res.status(404).json({ ok: false, error: 'Plugin not found.' });
    }
    const revIdx = plugin.reviews.findIndex((r) => r.id === reviewId);
    if (revIdx === -1) {
      return res.status(404).json({ ok: false, error: 'Review not found.' });
    }

    const target = plugin.reviews[revIdx];
    if (target.authorUid !== authUser.uid && !authUser.isOwner) {
      return res.status(403).json({ ok: false, error: 'Not authorized to remove this review.' });
    }

    plugin.reviews.splice(revIdx, 1);
    const stats = computeRatingBreakdown(plugin.reviews);
    plugin.ratingAverage = stats.average;
    plugin.reviewsCount = stats.count;
    writePluginStore(plugins);
    return res.json({ ok: true, plugin });
  });

  // Owner Control Panel Domain Management
  app.get('/api/owner/domains', async (req, res) => {
    const owner = await requirePlatformOwner(req, res);
    if (!owner) return;

    const store = readDomainStore();
    const list = Object.values(store).map((entry) => formatPublicDomain(entry));
    return res.json({ ok: true, domains: list });
  });

  app.patch('/api/owner/domains/:handle', async (req, res) => {
    const owner = await requirePlatformOwner(req, res);
    if (!owner) return;

    const handle = sanitizeDomainHandle(String(req.params.handle || ''));
    const store = readDomainStore();
    const existing = store[handle];
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Domain not found.' });
    }

    if (typeof req.body?.serverName === 'string' && req.body.serverName.trim().length >= 2) {
      existing.serverName = req.body.serverName.trim().slice(0, 64);
    }
    if (typeof req.body?.targetHost === 'string' && req.body.targetHost.trim()) {
      const parsed = parseMinecraftHostPort(
        req.body.targetHost.trim(),
        Number(req.body?.targetPort) || existing.targetPort
      );
      if (!parsed.ok) {
        return res.status(400).json({ ok: false, error: parsed.error });
      }
      const dnsCheck = await resolvePublicHostSafely(parsed.host);
      if (!dnsCheck.ok) {
        return res.status(400).json({ ok: false, error: dnsCheck.error });
      }
      existing.targetHost = parsed.host;
      existing.targetPort = parsed.port;
    }
    if (
      req.body?.edition === 'Java' ||
      req.body?.edition === 'Bedrock' ||
      req.body?.edition === 'Crossplay'
    ) {
      existing.edition = req.body.edition;
    }
    existing.updatedAt = new Date().toISOString();
    existing.connectAddress = formatConnectAddress(
      existing.workingDomain || `${handle}.duckdns.org`,
      existing.targetPort,
      existing.edition
    );
    writeDomainStore(store);
    return res.json({ ok: true, domain: formatPublicDomain(existing) });
  });

  app.delete('/api/owner/domains/:handle', async (req, res) => {
    const owner = await requirePlatformOwner(req, res);
    if (!owner) return;

    const handle = sanitizeDomainHandle(String(req.params.handle || ''));
    const store = readDomainStore();
    if (!store[handle]) {
      return res.status(404).json({ ok: false, error: 'Domain not found.' });
    }
    await deleteCloudflareDnsRecords(handle);
    delete store[handle];
    writeDomainStore(store);
    return res.json({ ok: true, deleted: handle });
  });

  app.post('/api/ask', async (req, res) => {
    const validation = validateAiPrompt(req.body?.message);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(503).json({
        error:
          'GEMINI_API_KEY is missing on the server. Add GEMINI_API_KEY to AI Studio Secrets or your environment to enable Surge AI.',
      });
    }

    try {
      const history = normalizeChatHistory(req.body?.history);
      const sendWithModel = async (model: string, timeoutMs: number) => {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' },
            timeout: timeoutMs,
            retryOptions: { attempts: 1 },
          },
        });
        const chat = ai.chats.create({
          model,
          history,
          config: {
            systemInstruction: SURGE_AI_SYSTEM_INSTRUCTION,
          },
        });
        return chat.sendMessage({ message: validation.text });
      };

      let usedModel = PRIMARY_GEMINI_MODEL;
      let response;
      try {
        response = await sendWithModel(PRIMARY_GEMINI_MODEL, 12000);
      } catch (firstErr) {
        if (isTransientError(firstErr)) {
          usedModel = FALLBACK_GEMINI_MODEL;
          response = await sendWithModel(FALLBACK_GEMINI_MODEL, 20000);
        } else {
          throw firstErr;
        }
      }

      const reply = response.text?.trim();
      if (!reply) {
        return res.status(502).json({
          error: 'Surge AI returned an empty response. Please try rephrasing your question.',
        });
      }

      return res.json({ reply, model: usedModel });
    } catch (err) {
      console.error('[Surge AI /api/ask error]', err);
      const { status, message } = extractErrorMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve('dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SurgeTrix server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SurgeTrix server:', err);
  process.exit(1);
});
