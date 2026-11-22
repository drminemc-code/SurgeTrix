import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { getCustomDomainByHandle } from '../firebase';
import { buildBedrockAddServerUri, sanitizeDomainHandle } from '../utils/networkDomain';
import { parseMinecraftFormattedText } from '../utils/minecraftTools';

export interface PublicDomainMapping {
  handle: string;
  zoneDomain?: string;
  fullDomain?: string;
  instantDomain?: string;
  workingDomain?: string;
  connectAddress?: string;
  dnsProvider?: 'instant' | 'duckdns' | 'cloudflare';
  serverName: string;
  targetHost: string;
  targetPort: number;
  ipv6?: string;
  cloudflareSynced?: boolean;
  dnsStatus?: string;
  edition: 'Java' | 'Bedrock' | 'Crossplay';
}

interface LiveStatusPayload {
  ok: boolean;
  address?: string;
  online?: boolean;
  playersOnline?: number;
  maxPlayers?: number;
  version?: string;
  motdClean?: string;
  latencyMs?: number;
  ipAddress?: string | null;
  srvRecord?: { host: string; port: number } | null;
  dnsIps?: string[];
  icon?: string | null;
  error?: string;
}

interface ServerDomainPageProps {
  handle: string;
  localDomains: PublicDomainMapping[];
  onNavigate: (path: string) => void;
}

export const ServerDomainPage: React.FC<ServerDomainPageProps> = ({
  handle,
  localDomains,
  onNavigate,
}) => {
  const cleanHandle = sanitizeDomainHandle(handle);
  const [domain, setDomain] = useState<PublicDomainMapping | null>(() => {
    return localDomains.find((d) => d.handle === cleanHandle) || null;
  });
  const [loadingDomain, setLoadingDomain] = useState(true);
  const [domainError, setDomainError] = useState('');
  const [liveStatus, setLiveStatus] = useState<LiveStatusPayload | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copiedKey, setCopiedKey] = useState<'ip' | 'url' | null>(null);

  const loadDomain = async () => {
    setLoadingDomain(true);
    setDomainError('');
    try {
      const apiRes = await fetch(`/api/domains/${encodeURIComponent(cleanHandle)}`);
      if (apiRes.ok) {
        const payload = (await apiRes.json()) as { ok: boolean; domain?: PublicDomainMapping };
        if (payload.ok && payload.domain) {
          setDomain(payload.domain);
          setLoadingDomain(false);
          return;
        }
      }

      const fbDomain = await getCustomDomainByHandle(cleanHandle).catch(() => null);
      if (fbDomain) {
        setDomain({
          handle: fbDomain.handle,
          serverName: fbDomain.serverName,
          targetHost: fbDomain.targetHost,
          targetPort: fbDomain.targetPort,
          edition: fbDomain.edition,
        });
        setLoadingDomain(false);
        return;
      }

      const localMatch = localDomains.find((d) => d.handle === cleanHandle);
      if (localMatch) {
        setDomain(localMatch);
      } else {
        setDomainError(`No server link is currently registered at "/s/${cleanHandle}".`);
      }
    } catch {
      const localMatch = localDomains.find((d) => d.handle === cleanHandle);
      if (localMatch) {
        setDomain(localMatch);
      } else {
        setDomainError('Could not load this server domain mapping.');
      }
    } finally {
      setLoadingDomain(false);
    }
  };

  const refreshLiveStatus = async (mapping: PublicDomainMapping) => {
    setCheckingStatus(true);
    try {
      const editionQuery = mapping.edition === 'Bedrock' ? 'bedrock' : 'java';
      const defaultPort = editionQuery === 'bedrock' ? 19132 : 25565;
      const targetAddr =
        mapping.targetPort === defaultPort
          ? mapping.targetHost
          : `${mapping.targetHost}:${mapping.targetPort}`;
      const res = await fetch(
        `/api/mc-status?address=${encodeURIComponent(targetAddr)}&edition=${editionQuery}`
      );
      const data = (await res.json()) as LiveStatusPayload;
      setLiveStatus(data);
    } catch {
      setLiveStatus({ ok: false, error: 'Live probe timed out.' });
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    void loadDomain();
  }, [cleanHandle]);

  useEffect(() => {
    if (domain) {
      void refreshLiveStatus(domain);
    }
  }, [domain?.handle, domain?.targetHost, domain?.targetPort]);

  const copyValue = (text: string, which: 'ip' | 'url') => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(which);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  if (loadingDomain && !domain) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--st-accent-text)' }} />
        <p className="text-sm" style={{ color: 'var(--st-text-muted)' }}>
          Resolving free domain /s/{cleanHandle}...
        </p>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="st-card p-8 text-center space-y-4">
          <div
            className="w-12 h-12 mx-auto flex items-center justify-center st-surface-inset"
            style={{ color: 'var(--st-accent-text)' }}
          >
            <Globe className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--st-text)' }}>
            Domain /s/{cleanHandle} is available
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--st-text-muted)' }}>
            {domainError || 'Nobody has claimed this free SurgeTrix share domain yet.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/dashboard/domains')}
              className="px-4 py-2.5 st-btn-primary text-xs font-semibold cursor-pointer"
            >
              Claim /s/{cleanHandle} in Dashboard
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/servers')}
              className="px-4 py-2.5 st-btn-secondary text-xs font-semibold cursor-pointer"
            >
              View Server List
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeWorkingHost =
    domain.workingDomain || domain.instantDomain || domain.targetHost;
  const fullSubdomain =
    domain.fullDomain || `${domain.handle}.${domain.zoneDomain || 'duckdns.org'}`;
  const defaultPort = domain.edition === 'Bedrock' ? 19132 : 25565;
  const connectString =
    domain.connectAddress ||
    (domain.targetPort === defaultPort
      ? activeWorkingHost
      : `${activeWorkingHost}:${domain.targetPort}`);
  const shareUrl = `${window.location.origin}/s/${domain.handle}`;
  const bedrockUri = buildBedrockAddServerUri(
    domain.serverName,
    activeWorkingHost,
    domain.edition === 'Bedrock' ? domain.targetPort : 19132
  );
  const motdSegments = liveStatus?.motdClean
    ? parseMinecraftFormattedText(liveStatus.motdClean)
    : [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <button
        type="button"
        onClick={() => onNavigate('/servers')}
        className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer"
        style={{ color: 'var(--st-text-muted)' }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Server List</span>
      </button>

      <div className="st-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="w-16 h-16 shrink-0 flex items-center justify-center overflow-hidden"
              style={{
                borderRadius: 'var(--st-radius)',
                backgroundColor: 'var(--st-accent-soft)',
                border: '1px solid var(--st-border-strong)',
              }}
            >
              {liveStatus?.icon ? (
                <img
                  src={liveStatus.icon}
                  alt={`${domain.serverName} icon`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Server className="w-7 h-7" style={{ color: 'var(--st-accent-text)' }} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-semibold" style={{ color: 'var(--st-accent-text)' }}>
                  {activeWorkingHost}
                </span>
                <span className="text-xs font-mono" style={{ color: 'var(--st-text-muted)' }}>
                  (/s/{domain.handle})
                </span>
                <span className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                  · {domain.edition}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                    domain.dnsStatus === 'verified' || domain.cloudflareSynced
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-cyan-500/15 text-cyan-300'
                  }`}
                >
                  {domain.dnsStatus === 'verified' || domain.cloudflareSynced
                    ? 'Real DNS Verified'
                    : 'Live Web Ready'}
                </span>
                {checkingStatus ? (
                  <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--st-text-muted)' }}>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Checking live status...
                  </span>
                ) : liveStatus?.ok ? (
                  <span
                    className="text-xs font-semibold"
                    style={{ color: liveStatus.online ? 'var(--st-success)' : '#f43f5e' }}
                  >
                    · {liveStatus.online ? 'Online' : 'Offline'}
                  </span>
                ) : null}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold truncate" style={{ color: 'var(--st-text)' }}>
                {domain.serverName}
              </h1>
              <p className="text-sm font-mono mt-0.5 truncate" style={{ color: 'var(--st-text-secondary)' }}>
                {connectString}
                {fullSubdomain !== activeWorkingHost ? ` · Origin: ${domain.targetHost}` : ''}
                {domain.ipv6 ? ` · AAAA ${domain.ipv6}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void refreshLiveStatus(domain)}
            disabled={checkingStatus}
            className="inline-flex items-center gap-2 px-3.5 py-2 st-btn-secondary text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
            <span>Refresh Ping</span>
          </button>
        </div>

        {/* Live Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
          <div className="st-surface-inset p-3.5">
            <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>Players</div>
            <div className="text-lg font-bold mt-0.5" style={{ color: 'var(--st-text)' }}>
              {liveStatus?.online
                ? `${liveStatus.playersOnline?.toLocaleString()} / ${liveStatus.maxPlayers?.toLocaleString()}`
                : '0 / 0'}
            </div>
          </div>
          <div className="st-surface-inset p-3.5">
            <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>Version</div>
            <div className="text-sm font-bold mt-1 truncate" style={{ color: 'var(--st-text)' }}>
              {liveStatus?.version || 'Checking...'}
            </div>
          </div>
          <div className="st-surface-inset p-3.5">
            <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>Probe Latency</div>
            <div className="text-lg font-bold mt-0.5 font-mono" style={{ color: 'var(--st-accent-text)' }}>
              {liveStatus?.latencyMs ? `${liveStatus.latencyMs} ms` : '—'}
            </div>
          </div>
          <div className="st-surface-inset p-3.5">
            <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>Resolved IP</div>
            <div className="text-xs font-mono font-bold mt-1.5 truncate" style={{ color: 'var(--st-text)' }}>
              {liveStatus?.ipAddress || liveStatus?.dnsIps?.[0] || 'Resolving...'}
            </div>
          </div>
        </div>

        {liveStatus?.motdClean && (
          <div className="st-surface-inset p-4 space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--st-text-muted)' }}>
              Live Server MOTD
            </div>
            <div className="font-mono text-sm leading-relaxed" style={{ color: 'var(--st-text)' }}>
              {motdSegments.length > 0
                ? motdSegments.map((s, idx) => (
                    <span key={idx} style={{ color: s.color || undefined }}>
                      {s.text}
                    </span>
                  ))
                : liveStatus.motdClean}
            </div>
          </div>
        )}

        {/* Join Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="st-surface-inset p-4 space-y-2.5">
            <div className="text-xs font-semibold" style={{ color: 'var(--st-text)' }}>
              Java / Crossplay Server Address
            </div>
            <div className="flex items-center justify-between gap-2">
              <code className="text-sm font-mono font-bold truncate" style={{ color: 'var(--st-accent-text)' }}>
                {connectString}
              </code>
              <button
                type="button"
                onClick={() => copyValue(connectString, 'ip')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 st-btn-primary text-xs font-semibold shrink-0 cursor-pointer"
              >
                {copiedKey === 'ip' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'ip' ? 'Copied IP' : 'Copy IP'}</span>
              </button>
            </div>
          </div>

          <div className="st-surface-inset p-4 space-y-2.5">
            <div className="text-xs font-semibold" style={{ color: 'var(--st-text)' }}>
              Free Shareable SurgeTrix URL
            </div>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono truncate" style={{ color: 'var(--st-text-secondary)' }}>
                {shareUrl}
              </code>
              <button
                type="button"
                onClick={() => copyValue(shareUrl, 'url')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 st-btn-secondary text-xs font-semibold shrink-0 cursor-pointer"
              >
                {copiedKey === 'url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'url' ? 'Copied URL' : 'Copy URL'}</span>
              </button>
            </div>
          </div>
        </div>

        {(domain.edition === 'Bedrock' || domain.edition === 'Crossplay') && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: 'var(--st-border)' }}>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--st-text-muted)' }}>
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--st-success)' }} />
              <span>Minecraft Bedrock installed? Launch directly into Add Server:</span>
            </div>
            <a
              href={bedrockUri}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 st-btn-secondary text-xs font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Minecraft Bedrock</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
