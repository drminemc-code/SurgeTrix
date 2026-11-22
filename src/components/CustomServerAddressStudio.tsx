import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ServerListing } from '../data/catalog';
import { deleteCustomDomainFromFirestore, saveCustomDomainToFirestore } from '../firebase';
import {
  buildFreeDomainDnsRecords,
  isReservedDomainHandle,
  isValidDomainHandle,
  isValidPublicIpv6,
  parseMinecraftHostPort,
  sanitizeDomainHandle,
} from '../utils/networkDomain';
import { AuthUserState } from './AuthPage';
import { CopyButton } from './tools/TextAndServerTools';

export interface OwnedDomainItem {
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
  edition: 'Java' | 'Bedrock' | 'Crossplay';
  dnsStatus?: 'verified' | 'web_active' | 'error';
  cloudflareSynced?: boolean;
  lastDnsCheckAt?: string;
  lastDnsIps?: string[];
  lastDnsSrv?: string[];
  ownerToken: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CustomServerAddressStudioProps {
  user: AuthUserState | null;
  servers: ServerListing[];
  ownedDomains: OwnedDomainItem[];
  onSaveDomain: (domain: OwnedDomainItem) => void;
  onDeleteDomain: (handle: string) => void;
  onPublishServer?: (server: ServerListing) => void;
  onNavigate: (path: string) => void;
}

export const CustomServerAddressStudio: React.FC<CustomServerAddressStudioProps> = ({
  user,
  servers,
  ownedDomains,
  onSaveDomain,
  onDeleteDomain,
  onPublishServer,
  onNavigate,
}) => {
  const [zoneName, setZoneName] = useState('duckdns.org');
  const [cfConfigured, setCfConfigured] = useState(false);

  const [selectedHandle, setSelectedHandle] = useState<string | null>(
    () => ownedDomains[0]?.handle || null
  );
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(ownedDomains.length === 0);

  // Create form fields
  const [subdomainInput, setSubdomainInput] = useState('');
  const [serverNameInput, setServerNameInput] = useState('');
  const [editionInput, setEditionInput] = useState<'Java' | 'Bedrock' | 'Crossplay'>('Java');
  const [serverIpInput, setServerIpInput] = useState('');
  const [portInput, setPortInput] = useState('25565');
  const [ipv6Input, setIpv6Input] = useState('');
  const [createDuckToken, setCreateDuckToken] = useState('');

  // Auto-detect state (Minevex confirm/ready/manual flow)
  const [detectMode, setDetectMode] = useState<'manual' | 'confirm' | 'ready'>('manual');
  const [detecting, setDetecting] = useState(false);
  const [detectedCandidate, setDetectedCandidate] = useState<{
    found: boolean;
    ip: string;
    port: number;
    ipv6: string | null;
    note: string;
  } | null>(null);

  // Action & status states
  const [busy, setBusy] = useState(false);
  const [checkingDns, setCheckingDns] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');
  const [copiedText, setCopiedText] = useState('');

  // Edit active domain state
  const [isEditing, setIsEditing] = useState(false);
  const [editIp, setEditIp] = useState('');
  const [editPort, setEditPort] = useState('25565');
  const [editIpv6, setEditIpv6] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Latest live DNS check record breakdown
  const [liveDnsBreakdown, setLiveDnsBreakdown] = useState<{
    a: string[];
    aaaa: string[];
    srv: string[];
    zoneResolvesPublicly?: boolean;
  } | null>(null);
  const [showExternalHelper, setShowExternalHelper] = useState(false);

  // Live Server Connection Test state
  const [testingConn, setTestingConn] = useState(false);
  const [connResult, setConnResult] = useState<{
    ok: boolean;
    online: boolean;
    tcpReachable: boolean;
    tcpLatencyMs: number | null;
    playersOnline: number;
    maxPlayers: number;
    version: string | null;
    motdClean: string | null;
    workingDomain: string;
    workingDomainResolves: boolean;
    dnsIps: string[];
  } | null>(null);

  // Free DuckDNS 1-Click Sync state
  const [showDuckSync, setShowDuckSync] = useState(false);
  const [duckSubdomain, setDuckSubdomain] = useState('');
  const [duckToken, setDuckToken] = useState('');
  const [syncingDuck, setSyncingDuck] = useState(false);
  const [publishingServer, setPublishingServer] = useState(false);

  const activeDomain =
    !isCreatingNew && selectedHandle
      ? ownedDomains.find((d) => d.handle === selectedHandle) || ownedDomains[0] || null
      : null;

  useEffect(() => {
    fetch('/api/domains/config')
      .then((r) => r.json())
      .then((d: { ok?: boolean; zoneName?: string; cloudflareConfigured?: boolean }) => {
        if (d.zoneName) setZoneName(d.zoneName);
        if (typeof d.cloudflareConfigured === 'boolean') setCfConfigured(d.cloudflareConfigured);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (ownedDomains.length > 0 && !selectedHandle && !isCreatingNew) {
      setSelectedHandle(ownedDomains[0].handle);
    }
    if (ownedDomains.length === 0) {
      setIsCreatingNew(true);
    }
  }, [ownedDomains.length]);

  const copyValue = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedText(val);
      window.setTimeout(() => setCopiedText(''), 1800);
    } catch {
      setErrorMsg('Could not copy automatically. Select the address and copy it manually.');
    }
  };

  const handleAutoDetectIp = async (addressHint?: string) => {
    setDetecting(true);
    setErrorMsg('');
    try {
      const targetQuery = addressHint?.trim() || serverIpInput.trim() || servers[0]?.ip || '';
      const url = targetQuery
        ? `/api/subdomains/detect?address=${encodeURIComponent(targetQuery)}`
        : '/api/subdomains/detect';
      const res = await fetch(url);
      const data = (await res.json()) as {
        ok?: boolean;
        found?: boolean;
        ip?: string;
        port?: number;
        ipv6?: string | null;
        note?: string;
      };
      setDetectedCandidate({
        found: Boolean(data.found),
        ip: data.ip || '',
        port: data.port || (editionInput === 'Bedrock' ? 19132 : 25565),
        ipv6: data.ipv6 || null,
        note: data.note || 'Enter your public Minecraft server IP or hostname below.',
      });
      setDetectMode(data.found ? 'confirm' : 'manual');
    } catch {
      setDetectedCandidate({
        found: false,
        ip: '',
        port: editionInput === 'Bedrock' ? 19132 : 25565,
        ipv6: null,
        note: 'Auto-detection failed. Enter your server IP manually below.',
      });
      setDetectMode('manual');
    } finally {
      setDetecting(false);
    }
  };

  const acceptDetectedIp = () => {
    if (!detectedCandidate?.ip) return;
    setServerIpInput(detectedCandidate.ip);
    setPortInput(String(detectedCandidate.port || (editionInput === 'Bedrock' ? 19132 : 25565)));
    if (detectedCandidate.ipv6) setIpv6Input(detectedCandidate.ipv6);
    setDetectMode('ready');
  };

  const handleEditionChange = (nextEd: 'Java' | 'Bedrock' | 'Crossplay') => {
    setEditionInput(nextEd);
    if (portInput === '25565' && nextEd === 'Bedrock') setPortInput('19132');
    if (portInput === '19132' && nextEd !== 'Bedrock') setPortInput('25565');
  };

  const handleCreateSubdomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    setWarningMsg('');

    const sanitized = sanitizeDomainHandle(subdomainInput.replace(/\.duckdns\.org$/i, ''));
    if (isReservedDomainHandle(sanitized)) {
      setErrorMsg(`"${sanitized}" is a reserved subdomain name. Pick another name.`);
      return;
    }
    if (!isValidDomainHandle(sanitized)) {
      setErrorMsg('Subdomain must be 2–32 lowercase letters, numbers, or hyphens.');
      return;
    }

    const defaultPort = editionInput === 'Bedrock' ? 19132 : 25565;
    const numericPort = Number(portInput) || defaultPort;
    const targetInput = serverIpInput.trim();
    const parsedTarget = parseMinecraftHostPort(
      targetInput.includes(':') ? targetInput : `${targetInput}:${numericPort}`,
      defaultPort
    );
    if (!parsedTarget.ok) {
      setErrorMsg(parsedTarget.error);
      return;
    }

    if (ipv6Input.trim() && !isValidPublicIpv6(ipv6Input.trim())) {
      setErrorMsg('Enter a valid public IPv6 address or leave it blank.');
      return;
    }

    const existingOwned = ownedDomains.find((d) => d.handle === sanitized);
    setBusy(true);
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: sanitized,
          serverName: serverNameInput.trim() || sanitized,
          target: parsedTarget.host,
          port: parsedTarget.port,
          ipv6: ipv6Input.trim() || undefined,
          duckdnsToken: createDuckToken.trim() || undefined,
          edition: editionInput,
          ownerToken: existingOwned?.ownerToken || '',
          ownerUid: user?.uid || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        ownerToken?: string;
        warning?: string;
        error?: string;
        domain?: Omit<OwnedDomainItem, 'ownerToken'>;
      };

      if (!res.ok || !data.ok || !data.domain) {
        setErrorMsg(data.error || 'Could not create subdomain.');
        return;
      }

      const savedRecord: OwnedDomainItem = {
        ...data.domain,
        ownerToken: data.ownerToken || existingOwned?.ownerToken || '',
      };

      if (user?.uid && user.emailVerified) {
        await saveCustomDomainToFirestore({
          handle: savedRecord.handle,
          ownerUid: user.uid,
          serverName: savedRecord.serverName,
          targetHost: savedRecord.targetHost,
          targetPort: savedRecord.targetPort,
          edition: savedRecord.edition,
        }).catch(() => {});
      }

      onSaveDomain(savedRecord);
      setSelectedHandle(savedRecord.handle);
      setIsCreatingNew(false);
      setLiveDnsBreakdown({
        a: savedRecord.lastDnsIps || [],
        aaaa: savedRecord.ipv6 ? [savedRecord.ipv6] : [],
        srv: savedRecord.lastDnsSrv || [],
        zoneResolvesPublicly: savedRecord.cloudflareSynced,
      });
      setSubdomainInput('');
      setServerNameInput('');
      setServerIpInput('');
      setIpv6Input('');
      setCreateDuckToken('');
      setDetectMode('manual');
      setDetectedCandidate(null);
      setConnResult(null);
      if (data.warning) setWarningMsg(data.warning);
      setStatusMsg(
        savedRecord.dnsStatus === 'verified'
          ? `Real DuckDNS domain live: ${savedRecord.connectAddress || savedRecord.workingDomain}`
          : `DuckDNS address saved (${savedRecord.connectAddress || savedRecord.workingDomain}). Paste your DuckDNS token below to activate global DNS.`
      );
      void handleTestConnection(savedRecord);
    } catch {
      setErrorMsg('Network error while creating custom server address.');
    } finally {
      setBusy(false);
    }
  };

  const handleTestConnection = async (dom: OwnedDomainItem) => {
    setTestingConn(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/domains/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: dom.handle }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        online?: boolean;
        tcpReachable?: boolean;
        tcpLatencyMs?: number | null;
        playersOnline?: number;
        maxPlayers?: number;
        version?: string | null;
        motdClean?: string | null;
        workingDomain?: string;
        workingDomainResolves?: boolean;
        dnsIps?: string[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Could not test connection to this server.');
        return;
      }
      setConnResult({
        ok: true,
        online: Boolean(data.online),
        tcpReachable: Boolean(data.tcpReachable),
        tcpLatencyMs: typeof data.tcpLatencyMs === 'number' ? data.tcpLatencyMs : null,
        playersOnline: data.playersOnline || 0,
        maxPlayers: data.maxPlayers || 0,
        version: data.version || null,
        motdClean: data.motdClean || null,
        workingDomain: data.workingDomain || dom.workingDomain || dom.targetHost,
        workingDomainResolves: Boolean(data.workingDomainResolves),
        dnsIps: data.dnsIps || [],
      });
    } catch {
      setErrorMsg('Network error while testing Minecraft server connection.');
    } finally {
      setTestingConn(false);
    }
  };

  const handleSyncDuckDns = async (e: React.FormEvent, dom: OwnedDomainItem) => {
    e.preventDefault();
    setSyncingDuck(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const res = await fetch('/api/domains/sync-duckdns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: dom.handle,
          duckdnsSubdomain: (duckSubdomain.trim() || dom.handle),
          duckdnsToken: duckToken.trim(),
          ownerToken: dom.ownerToken,
          ownerUid: user?.uid || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        resolvedIps?: string[];
        domain?: Omit<OwnedDomainItem, 'ownerToken'>;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.domain) {
        setErrorMsg(data.error || 'Could not sync DuckDNS record.');
        return;
      }
      const updated: OwnedDomainItem = { ...data.domain, ownerToken: dom.ownerToken };
      onSaveDomain(updated);
      setDuckToken('');
      setShowDuckSync(false);
      setStatusMsg(`Real DNS synced! Players can now connect using ${updated.connectAddress}`);
      void handleTestConnection(updated);
    } catch {
      setErrorMsg('Network error while syncing DuckDNS.');
    } finally {
      setSyncingDuck(false);
    }
  };

  const handlePublishDomainServer = async (dom: OwnedDomainItem) => {
    if (!onPublishServer) return;
    setPublishingServer(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const res = await fetch('/api/domains/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: dom.handle }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        online?: boolean;
        playersOnline?: number;
        maxPlayers?: number;
        version?: string | null;
        motdClean?: string | null;
      };
      const connectAddr = dom.connectAddress || dom.workingDomain || dom.targetHost;
      onPublishServer({
        id: `srv-${Date.now()}`,
        name: dom.serverName,
        ip: connectAddr,
        edition: dom.edition,
        category: 'Survival SMP',
        status: data.ok && data.online ? 'Online' : 'Offline',
        playersOnline: data.ok && typeof data.playersOnline === 'number' ? data.playersOnline : 0,
        maxPlayers: data.ok && typeof data.maxPlayers === 'number' && data.maxPlayers > 0 ? data.maxPlayers : 100,
        version: data.version || '1.21.4',
        rating: null,
        reviewsCount: 0,
        likes: 0,
        motd: data.motdClean || `${dom.serverName} · ${connectAddr}`,
      });
      setStatusMsg(`Published "${dom.serverName}" (${connectAddr}) to the live Server List!`);
    } catch {
      setErrorMsg('Could not publish server right now.');
    } finally {
      setPublishingServer(false);
    }
  };

  const handleCheckDns = async (dom: OwnedDomainItem) => {
    setCheckingDns(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const res = await fetch('/api/domains/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: dom.handle }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        a?: string[];
        aaaa?: string[];
        srv?: string[];
        zoneResolvesPublicly?: boolean;
        domain?: Omit<OwnedDomainItem, 'ownerToken'>;
        error?: string;
      };

      if (!res.ok || !data.ok || !data.domain) {
        setErrorMsg(data.error || 'DNS check failed for this address.');
        return;
      }

      const updated: OwnedDomainItem = {
        ...data.domain,
        ownerToken: dom.ownerToken,
      };
      onSaveDomain(updated);
      setLiveDnsBreakdown({
        a: data.a || [],
        aaaa: data.aaaa || [],
        srv: data.srv || [],
        zoneResolvesPublicly: Boolean(data.zoneResolvesPublicly),
      });
      setStatusMsg(
        data.zoneResolvesPublicly
          ? `DNS verified for ${updated.fullDomain} (${(data.a || []).join(', ')}).`
          : `Target host ${updated.targetHost} resolved (${(data.a || []).join(', ') || 'active'}) and live page /s/${updated.handle} is online.`
      );
    } catch {
      setErrorMsg('Could not run DNS check right now.');
    } finally {
      setCheckingDns(false);
    }
  };

  const handleSaveEditedDestination = async (dom: OwnedDomainItem) => {
    setErrorMsg('');
    setStatusMsg('');
    const defaultPort = dom.edition === 'Bedrock' ? 19132 : 25565;
    const numericPort = Number(editPort) || defaultPort;
    const parsedTarget = parseMinecraftHostPort(
      editIp.trim().includes(':') ? editIp.trim() : `${editIp.trim()}:${numericPort}`,
      defaultPort
    );
    if (!parsedTarget.ok) {
      setErrorMsg(parsedTarget.error);
      return;
    }
    if (editIpv6.trim() && !isValidPublicIpv6(editIpv6.trim())) {
      setErrorMsg('Enter a valid public IPv6 address or leave it blank.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: dom.handle,
          serverName: dom.serverName,
          target: parsedTarget.host,
          port: parsedTarget.port,
          ipv6: editIpv6.trim() || undefined,
          edition: dom.edition,
          ownerToken: dom.ownerToken,
          ownerUid: user?.uid || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        domain?: Omit<OwnedDomainItem, 'ownerToken'>;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.domain) {
        setErrorMsg(data.error || 'Could not update destination.');
        return;
      }

      const updated: OwnedDomainItem = {
        ...data.domain,
        ownerToken: dom.ownerToken,
      };
      if (user?.uid && user.emailVerified) {
        await saveCustomDomainToFirestore({
          handle: updated.handle,
          ownerUid: user.uid,
          serverName: updated.serverName,
          targetHost: updated.targetHost,
          targetPort: updated.targetPort,
          edition: updated.edition,
        }).catch(() => {});
      }
      onSaveDomain(updated);
      setIsEditing(false);
      setStatusMsg('Destination updated. Live address now points to the new host.');
    } catch {
      setErrorMsg('Could not save destination changes.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveSubdomain = async (dom: OwnedDomainItem) => {
    setBusy(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      await fetch(`/api/domains/${encodeURIComponent(dom.handle)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(dom.ownerToken ? { 'x-domain-token': dom.ownerToken } : {}),
          ...(user?.uid ? { 'x-owner-uid': user.uid } : {}),
        },
        body: JSON.stringify({
          ownerToken: dom.ownerToken,
          ownerUid: user?.uid || undefined,
        }),
      });
      if (user?.uid && user.emailVerified) {
        await deleteCustomDomainFromFirestore(dom.handle).catch(() => {});
      }
      onDeleteDomain(dom.handle);
      setConfirmDelete(false);
      setIsEditing(false);
      setLiveDnsBreakdown(null);
      setSelectedHandle(null);
      setStatusMsg(`Subdomain "${dom.handle}" deleted and records removed.`);
    } catch {
      setErrorMsg(`Could not delete subdomain "${dom.handle}".`);
    } finally {
      setBusy(false);
    }
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const activeFullDomain = activeDomain
    ? activeDomain.fullDomain || `${activeDomain.handle}.${activeDomain.zoneDomain || zoneName}`
    : '';
  const activeWorkingDomain = activeDomain
    ? activeDomain.workingDomain || activeDomain.instantDomain || activeDomain.targetHost
    : '';
  const activeConnectAddress = activeDomain
    ? activeDomain.connectAddress ||
      (activeDomain.targetPort === (activeDomain.edition === 'Bedrock' ? 19132 : 25565)
        ? activeWorkingDomain
        : `${activeWorkingDomain}:${activeDomain.targetPort}`)
    : '';
  const activeWebUrl = activeDomain ? `${originUrl}/s/${activeDomain.handle}` : '';
  const isBedrock = activeDomain?.edition === 'Bedrock';
  const formIsBedrock = editionInput === 'Bedrock';
  const activeExternalRecords = activeDomain
    ? buildFreeDomainDnsRecords(activeFullDomain, activeDomain.targetHost, activeDomain.targetPort)
    : null;
  const alreadyListed = Boolean(
    activeDomain &&
      servers.some(
        (s) =>
          s.ip.toLowerCase() === activeConnectAddress.toLowerCase() ||
          s.ip.toLowerCase() === activeDomain.targetHost.toLowerCase()
      )
  );

  return (
    <section className="st-card p-5 sm:p-6 space-y-5" data-testid="custom-server-address-studio">
      {/* Header matching Minevex Custom Server Address */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-base font-bold" style={{ color: 'var(--st-text)' }}>
            <span
              className="w-9 h-9 flex items-center justify-center shrink-0"
              style={{
                borderRadius: 'var(--st-radius)',
                backgroundColor: 'var(--st-accent-soft)',
                border: '1px solid var(--st-border-strong)',
                color: 'var(--st-accent-text)',
              }}
            >
              <Globe className="w-4 h-4" />
            </span>
            <span>Custom Server Address</span>
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-5" style={{ color: 'var(--st-text-muted)' }}>
            Give your server a memorable address under{' '}
            <span className="font-mono" style={{ color: 'var(--st-text-secondary)' }}>
              {zoneName}
            </span>{' '}
            plus a real working live join page on this domain. Game traffic connects directly to your server host without proxying.
          </p>
        </div>

        {activeDomain && !isCreatingNew && (
          <span
            className="px-2.5 py-1 rounded-md border font-mono text-[11px]"
            style={{ borderColor: 'var(--st-border)', color: 'var(--st-text-muted)' }}
          >
            {activeDomain.edition}
          </span>
        )}
      </div>

      {/* Multi-subdomain switcher */}
      {ownedDomains.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {ownedDomains.map((dom) => {
            const selected = !isCreatingNew && activeDomain?.handle === dom.handle;
            return (
              <button
                key={dom.handle}
                type="button"
                onClick={() => {
                  setSelectedHandle(dom.handle);
                  setIsCreatingNew(false);
                  setIsEditing(false);
                  setConfirmDelete(false);
                  setErrorMsg('');
                  setStatusMsg('');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium cursor-pointer transition-colors"
                style={{
                  backgroundColor: selected ? 'var(--st-accent-soft)' : 'var(--st-surface-inset)',
                  border: selected ? '1px solid var(--st-border-strong)' : '1px solid var(--st-border)',
                  color: selected ? 'var(--st-accent-text)' : 'var(--st-text-secondary)',
                }}
              >
                {dom.handle}.{dom.zoneDomain || zoneName}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setIsCreatingNew(true);
              setErrorMsg('');
              setStatusMsg('');
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold st-btn-secondary cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Subdomain</span>
          </button>
        </div>
      )}

      {/* Alerts */}
      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-400"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {statusMsg && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-400"
        >
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{statusMsg}</span>
        </div>
      )}
      {warningMsg && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl bg-amber-400/10 border border-amber-400/30 p-3 text-xs text-amber-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{warningMsg}</span>
        </div>
      )}

      {/* CREATE MODE (Minevex gNe creation flow) */}
      {(isCreatingNew || !activeDomain) && (
        <form onSubmit={handleCreateSubdomain} className="space-y-4">
          {servers.length > 0 && (
            <div className="st-surface-inset p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span style={{ color: 'var(--st-text-secondary)' }}>
                Import settings from a listed server:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {servers.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const hostParts = s.ip.split(':');
                      setSubdomainInput(sanitizeDomainHandle(s.name));
                      setServerNameInput(s.name);
                      setServerIpInput(hostParts[0] || s.ip);
                      setPortInput(hostParts[1] || (s.edition === 'Bedrock' ? '19132' : '25565'));
                      setEditionInput(s.edition);
                      setDetectMode('ready');
                    }}
                    className="px-2.5 py-1 st-btn-secondary text-[11px] font-medium cursor-pointer"
                  >
                    Use {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Joined Subdomain input [ hazzard | .surgetrix.site ] */}
            <div className="sm:col-span-2">
              <label
                htmlFor="mv-subdomain"
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--st-text-secondary)' }}
              >
                Subdomain
              </label>
              <div
                className="flex items-stretch overflow-hidden rounded-xl border"
                style={{
                  borderColor: 'var(--st-border)',
                  backgroundColor: 'var(--st-surface-inset)',
                }}
              >
                <input
                  id="mv-subdomain"
                  aria-label="Subdomain"
                  value={subdomainInput}
                  onChange={(e) =>
                    setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                  maxLength={32}
                  placeholder="myrealm"
                  className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-sm font-mono outline-none"
                  style={{ color: 'var(--st-text)' }}
                />
                <span
                  className="grid place-items-center border-l px-3.5 text-xs font-mono shrink-0"
                  style={{
                    borderColor: 'var(--st-border)',
                    color: 'var(--st-text-muted)',
                  }}
                >
                  .{zoneName}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="mv-srv-name"
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--st-text-secondary)' }}
              >
                Server Display Name
              </label>
              <input
                id="mv-srv-name"
                type="text"
                value={serverNameInput}
                onChange={(e) => setServerNameInput(e.target.value)}
                placeholder="e.g. CrystalSMP"
                className="w-full px-3.5 py-2.5 st-surface-inset text-sm"
                style={{ color: 'var(--st-text)' }}
              />
            </div>

            <div>
              <label
                htmlFor="mv-srv-edition"
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--st-text-secondary)' }}
              >
                Edition
              </label>
              <select
                id="mv-srv-edition"
                value={editionInput}
                onChange={(e) =>
                  handleEditionChange(e.target.value as 'Java' | 'Bedrock' | 'Crossplay')
                }
                className="w-full px-3.5 py-2.5 st-surface-inset text-sm"
                style={{ color: 'var(--st-text)' }}
              >
                <option value="Java">Java</option>
                <option value="Bedrock">Bedrock</option>
                <option value="Crossplay">Crossplay</option>
              </select>
            </div>

            {/* Auto-detect confirming / ready banners */}
            {detecting && (
              <div
                className="sm:col-span-2 flex items-center gap-2 rounded-xl border p-3 text-xs"
                style={{ borderColor: 'var(--st-border)', color: 'var(--st-text-muted)' }}
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Detecting your server IP…</span>
              </div>
            )}

            {detectMode === 'confirm' && detectedCandidate?.found && (
              <div
                className="sm:col-span-2 rounded-xl border p-4 space-y-2"
                style={{
                  borderColor: 'var(--st-border-strong)',
                  backgroundColor: 'var(--st-accent-soft)',
                }}
              >
                <p className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--st-text)' }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--st-accent-text)' }} />
                  <span>We found your server IP</span>
                </p>
                <p className="font-mono text-lg font-bold" style={{ color: 'var(--st-text)' }}>
                  {detectedCandidate.ip}
                  <span style={{ color: 'var(--st-text-muted)' }}>:{detectedCandidate.port}</span>
                </p>
                <p className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                  {detectedCandidate.note}
                  {detectedCandidate.ipv6
                    ? ` IPv6 ${detectedCandidate.ipv6} was found too and will get an AAAA record.`
                    : ''}
                </p>
                <p className="text-xs pt-1" style={{ color: 'var(--st-text-secondary)' }}>
                  Is this your Minecraft server&apos;s IP?
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={acceptDetectedIp}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Yes, use this IP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetectMode('manual')}
                    className="px-3 py-1.5 st-btn-secondary text-xs font-medium cursor-pointer"
                  >
                    No, enter it myself
                  </button>
                </div>
              </div>
            )}

            {detectMode === 'ready' && serverIpInput.trim() && (
              <div
                className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3"
              >
                <p className="flex items-center gap-2 text-xs text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    Using <span className="font-mono font-semibold text-white">{serverIpInput}:{portInput}</span>
                    {ipv6Input ? ' + IPv6' : ''}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setDetectMode('manual')}
                  className="px-3 py-1 st-btn-secondary text-xs font-medium cursor-pointer"
                >
                  Change
                </button>
              </div>
            )}

            {detectMode === 'manual' && !detecting && (
              <>
                {detectedCandidate && !detectedCandidate.found && (
                  <div className="sm:col-span-2 flex items-start gap-2 rounded-xl bg-amber-400/10 border border-amber-400/30 p-3 text-xs text-amber-200">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{detectedCandidate.note}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="mv-server-ip"
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--st-text-secondary)' }}
                  >
                    {formIsBedrock ? 'Bedrock server IP' : 'Minecraft server IP'}
                  </label>
                  <input
                    id="mv-server-ip"
                    aria-label="Server IP"
                    value={serverIpInput}
                    onChange={(e) => setServerIpInput(e.target.value)}
                    placeholder="mc.hypixel.net or 203.0.113.10"
                    className="w-full px-3.5 py-2.5 st-surface-inset font-mono text-sm"
                    style={{ color: 'var(--st-text)' }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="mv-server-port"
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--st-text-secondary)' }}
                  >
                    {formIsBedrock ? 'Bedrock port' : 'Java port'}
                  </label>
                  <input
                    id="mv-server-port"
                    aria-label="Port"
                    inputMode="numeric"
                    value={portInput}
                    onChange={(e) => setPortInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder={formIsBedrock ? '19132' : '25565'}
                    className="w-full px-3.5 py-2.5 st-surface-inset font-mono text-sm"
                    style={{ color: 'var(--st-text)' }}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="mv-server-ipv6"
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--st-text-secondary)' }}
                  >
                    IPv6 address{' '}
                    <span style={{ color: 'var(--st-text-muted)' }}>
                      (optional — an AAAA record is created when provided)
                    </span>
                  </label>
                  <input
                    id="mv-server-ipv6"
                    aria-label="IPv6 address"
                    value={ipv6Input}
                    onChange={(e) => setIpv6Input(e.target.value)}
                    placeholder="2001:db8::1"
                    className="w-full px-3.5 py-2.5 st-surface-inset font-mono text-sm"
                    style={{ color: 'var(--st-text)' }}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="mv-duckdns-token"
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--st-text-secondary)' }}
                  >
                    DuckDNS Token{' '}
                    <span style={{ color: 'var(--st-text-muted)' }}>
                      (recommended — claim this subdomain at duckdns.org &amp; paste your token so *.duckdns.org resolves live)
                    </span>
                  </label>
                  <input
                    id="mv-duckdns-token"
                    type="password"
                    aria-label="DuckDNS token"
                    value={createDuckToken}
                    onChange={(e) => setCreateDuckToken(e.target.value)}
                    placeholder="Paste your free DuckDNS token from duckdns.org (or sync right after)"
                    className="w-full px-3.5 py-2.5 st-surface-inset font-mono text-sm"
                    style={{ color: 'var(--st-text)' }}
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => void handleAutoDetectIp()}
                    disabled={detecting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 st-btn-secondary text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {detecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--st-accent-text)' }} />
                    )}
                    <span>Auto-detect my IP</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={busy || !subdomainInput.trim() || !serverIpInput.trim() || detectMode === 'confirm'}
              className="inline-flex items-center gap-2 px-5 py-2.5 st-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              <span>Create subdomain</span>
            </button>
            <p className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
              Only lowercase letters, numbers and hyphens. Reserved names are blocked.
            </p>
          </div>
        </form>
      )}

      {/* ACTIVE SUBDOMAIN CARD (Minevex exact visual + real working DNS + live server connect) */}
      {activeDomain && !isCreatingNew && (
        <div className="space-y-4" data-testid="active-subdomain-card">
          {/* Gradient Address Hero Banner */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 sm:p-5"
            style={{
              borderColor: 'var(--st-border-strong)',
              background: 'linear-gradient(135deg, var(--st-accent-soft) 0%, var(--st-surface-inset) 100%)',
            }}
          >
            <div className="min-w-0 basis-full sm:basis-auto">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                  Minecraft IP address ({activeDomain.dnsProvider === 'cloudflare'
                    ? 'Cloudflare DNS'
                    : 'DuckDNS · duckdns.org'})
                </p>
                {activeDomain.dnsStatus === 'verified' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                    Real DNS Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-400/15 text-amber-300">
                    Sync DuckDNS Token to Go Live
                  </span>
                )}
              </div>
              <p className="mt-1 break-all font-mono text-xl sm:text-2xl font-bold" style={{ color: 'var(--st-text)' }}>
                {activeConnectAddress}
              </p>
              <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--st-text-muted)' }}>
                Target: {activeDomain.targetHost}:{activeDomain.targetPort}
                {activeDomain.lastDnsIps?.[0] ? ` · IPv4: ${activeDomain.lastDnsIps[0]}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => void copyValue(activeConnectAddress)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 st-btn-primary text-xs font-semibold cursor-pointer"
              >
                {copiedText === activeConnectAddress ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedText === activeConnectAddress ? 'Copied IP' : 'Copy address'}</span>
              </button>
              <button
                type="button"
                disabled={testingConn}
                onClick={() => void handleTestConnection(activeDomain)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 st-btn-secondary text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {testingConn ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Server className="w-3.5 h-3.5" />
                )}
                <span>Test Connection</span>
              </button>
              <button
                type="button"
                disabled={checkingDns}
                onClick={() => void handleCheckDns(activeDomain)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 st-btn-secondary text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {checkingDns ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Check DNS</span>
              </button>
            </div>
          </div>

          {/* Live Server Connection Check & Direct Publish Strip */}
          {connResult && (
            <div
              className="rounded-xl border p-4 space-y-3"
              data-testid="live-connection-panel"
              style={{
                borderColor: connResult.online ? 'rgba(16,185,129,0.35)' : 'var(--st-border)',
                backgroundColor: 'var(--st-surface-inset)',
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold ${
                      connResult.online ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                    }`}
                  >
                    {connResult.online ? 'Server Reachable' : 'Server Offline'}
                  </span>
                  {connResult.tcpLatencyMs !== null && (
                    <span className="font-mono text-xs" style={{ color: 'var(--st-accent-text)' }}>
                      {connResult.tcpLatencyMs} ms TCP
                    </span>
                  )}
                  {connResult.online && (
                    <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--st-text)' }}>
                      {connResult.playersOnline.toLocaleString()} / {connResult.maxPlayers.toLocaleString()} players
                    </span>
                  )}
                  {connResult.version && (
                    <span className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                      · {connResult.version}
                    </span>
                  )}
                </div>

                {onPublishServer && (
                  <button
                    type="button"
                    disabled={publishingServer || alreadyListed}
                    onClick={() => void handlePublishDomainServer(activeDomain)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-60"
                  >
                    {publishingServer ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : alreadyListed ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>{alreadyListed ? 'Listed on Server List' : 'Publish to Server List'}</span>
                  </button>
                )}
              </div>

              <div className="text-[11px] font-mono space-y-1" style={{ color: 'var(--st-text-muted)' }}>
                <p>
                  DNS Check: <span style={{ color: 'var(--st-text-secondary)' }}>{connResult.workingDomain}</span> →{' '}
                  {connResult.workingDomainResolves ? (
                    <span className="text-emerald-400">
                      Resolves globally ({connResult.dnsIps.join(', ')})
                    </span>
                  ) : (
                    <span>Fallback target ({connResult.dnsIps.join(', ')})</span>
                  )}
                </p>
                {connResult.motdClean && (
                  <p className="truncate" style={{ color: 'var(--st-text-secondary)' }}>
                    MOTD: {connResult.motdClean}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Live Web / Join Page Bar */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5"
            style={{
              borderColor: 'var(--st-border)',
              backgroundColor: 'var(--st-surface-inset)',
            }}
          >
            <div className="min-w-0">
              <p className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                Live server join &amp; status page · instant free HTTPS link
              </p>
              <p className="mt-1 break-all font-mono text-sm" style={{ color: 'var(--st-accent-text)' }}>
                {activeWebUrl}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void copyValue(activeWebUrl)}
                className="inline-flex items-center gap-1.5 px-3 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
              >
                {copiedText === activeWebUrl ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedText === activeWebUrl ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate(`/s/${activeDomain.handle}`)}
                className="inline-flex items-center gap-1.5 px-3 py-2 st-btn-primary text-xs font-semibold cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open</span>
              </button>
            </div>
          </div>

          {/* 4-Tile Status Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="st-surface-inset p-3">
              <p className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                Minecraft IP
              </p>
              <p className="mt-1 font-mono text-xs font-bold truncate" style={{ color: 'var(--st-text)' }}>
                {activeDomain.targetHost}
              </p>
            </div>
            <div className="st-surface-inset p-3">
              <p className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                {isBedrock ? 'Bedrock port' : 'Java port'}
              </p>
              <p className="mt-1 font-mono text-xs font-bold tabular-nums" style={{ color: 'var(--st-text)' }}>
                {activeDomain.targetPort}
              </p>
            </div>
            <div className="st-surface-inset p-3">
              <p className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                DNS status
              </p>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                    activeDomain.dnsStatus === 'error'
                      ? 'bg-rose-500/15 text-rose-400'
                      : activeDomain.dnsStatus === 'verified' || activeDomain.cloudflareSynced
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-cyan-500/15 text-cyan-300'
                  }`}
                >
                  {activeDomain.dnsStatus === 'error'
                    ? 'DNS error'
                    : activeDomain.dnsStatus === 'verified' || activeDomain.cloudflareSynced
                    ? 'Real DNS Active'
                    : 'Live Web Ready'}
                </span>
              </div>
            </div>
            <div className="st-surface-inset p-3">
              <p className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                Verification
              </p>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                    user?.emailVerified
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-400/15 text-amber-200'
                  }`}
                >
                  {user?.emailVerified ? 'Verified owner' : 'Browser owner'}
                </span>
              </div>
            </div>
          </div>

          {/* Timestamps & DNS Records */}
          <div className="grid gap-1 text-[11px] sm:grid-cols-2" style={{ color: 'var(--st-text-muted)' }}>
            <p>
              Created{' '}
              {activeDomain.createdAt
                ? new Date(activeDomain.createdAt).toLocaleDateString()
                : 'Today'}{' '}
              · Updated{' '}
              {activeDomain.updatedAt
                ? new Date(activeDomain.updatedAt).toLocaleDateString()
                : 'Just now'}
            </p>
            {activeDomain.lastDnsCheckAt && (
              <p>Last DNS check {new Date(activeDomain.lastDnsCheckAt).toLocaleString()}</p>
            )}
          </div>

          {(liveDnsBreakdown || (activeDomain.lastDnsIps && activeDomain.lastDnsIps.length > 0)) && (
            <p className="break-all font-mono text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
              A:{' '}
              {(liveDnsBreakdown?.a || activeDomain.lastDnsIps || []).join(', ') || '—'} · AAAA:{' '}
              {(liveDnsBreakdown?.aaaa || (activeDomain.ipv6 ? [activeDomain.ipv6] : [])).join(', ') || '—'}
              {(liveDnsBreakdown?.srv || activeDomain.lastDnsSrv || []).length
                ? ` · SRV: ${(liveDnsBreakdown?.srv || activeDomain.lastDnsSrv || []).join(', ')}`
                : ''}
            </p>
          )}

          {/* Java / Bedrock Connection Guidance Box */}
          <div className="st-surface-inset p-4 text-xs leading-5 space-y-2" style={{ color: 'var(--st-text-muted)' }}>
            {isBedrock ? (
              <p>
                <strong style={{ color: 'var(--st-text-secondary)' }}>How to connect (Bedrock):</strong>{' '}
                open Minecraft -&gt; Play -&gt; Servers -&gt; Add Server, set Server Address to{' '}
                <span className="font-mono font-semibold" style={{ color: 'var(--st-text)' }}>
                  {activeWorkingDomain}
                </span>{' '}
                and Port{' '}
                <span className="font-mono font-semibold" style={{ color: 'var(--st-text)' }}>
                  {activeDomain.targetPort}
                </span>
                , or open{' '}
                <span className="font-mono" style={{ color: 'var(--st-accent-text)' }}>
                  /s/{activeDomain.handle}
                </span>{' '}
                for 1-tap launch.
              </p>
            ) : (
              <p>
                <strong style={{ color: 'var(--st-text-secondary)' }}>How to connect (Java):</strong>{' '}
                open Minecraft -&gt; Multiplayer -&gt; Add Server and paste{' '}
                <span className="font-mono font-semibold" style={{ color: 'var(--st-text)' }}>
                  {activeConnectAddress}
                </span>
                . It resolves directly via global DNS to{' '}
                <span className="font-mono" style={{ color: 'var(--st-text-secondary)' }}>
                  {activeDomain.lastDnsIps?.[0] || activeDomain.targetHost}
                </span>{' '}
                with zero proxy lag.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDuckSync((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 st-btn-secondary text-[11px] font-semibold cursor-pointer"
              >
                <Sparkles className="w-3 h-3" style={{ color: 'var(--st-accent-text)' }} />
                <span>{showDuckSync ? 'Hide DuckDNS Sync' : 'Sync / Change DuckDNS (*.duckdns.org)'}</span>
              </button>
              {onPublishServer && !connResult && (
                <button
                  type="button"
                  disabled={publishingServer || alreadyListed}
                  onClick={() => void handlePublishDomainServer(activeDomain)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 st-btn-secondary text-[11px] font-semibold cursor-pointer disabled:opacity-60"
                >
                  <Plus className="w-3 h-3" />
                  <span>{alreadyListed ? 'Listed on Server List' : 'Publish to Server List'}</span>
                </button>
              )}
            </div>

            {(showDuckSync || activeDomain.dnsStatus !== 'verified') && (
              <form
                onSubmit={(e) => void handleSyncDuckDns(e, activeDomain)}
                className="mt-2 pt-3 border-t space-y-3"
                style={{ borderColor: 'var(--st-border)' }}
              >
                <p className="text-[11px]" style={{ color: 'var(--st-text-secondary)' }}>
                  Point <span className="font-mono font-semibold">{duckSubdomain.trim() || activeDomain.handle}.duckdns.org</span> directly to your server&apos;s IPv4 ({activeDomain.lastDnsIps?.[0] || activeDomain.targetHost}) via <span className="font-mono">duckdns.org</span>. Your DuckDNS token is used once to update DNS and is never saved.
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="duck-sub" className="block text-[11px] mb-1" style={{ color: 'var(--st-text-muted)' }}>
                      DuckDNS Subdomain
                    </label>
                    <input
                      id="duck-sub"
                      type="text"
                      value={duckSubdomain}
                      onChange={(e) => setDuckSubdomain(e.target.value)}
                      placeholder={`${activeDomain.handle}.duckdns.org`}
                      className="w-full px-3 py-2 st-card font-mono text-xs"
                      style={{ color: 'var(--st-text)' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="duck-tok" className="block text-[11px] mb-1" style={{ color: 'var(--st-text-muted)' }}>
                      DuckDNS Token
                    </label>
                    <input
                      id="duck-tok"
                      type="password"
                      value={duckToken}
                      onChange={(e) => setDuckToken(e.target.value)}
                      placeholder="Paste token from duckdns.org"
                      className="w-full px-3 py-2 st-card font-mono text-xs"
                      style={{ color: 'var(--st-text)' }}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={syncingDuck}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 st-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {syncingDuck && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Sync *.duckdns.org DNS</span>
                </button>
              </form>
            )}
          </div>

          {/* Inline Edit Destination Form */}
          {isEditing && (
            <div className="st-surface-inset p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--st-text-muted)' }}>
                    {isBedrock ? 'Bedrock IP / Host' : 'Java IP / Host'}
                  </label>
                  <input
                    type="text"
                    value={editIp}
                    onChange={(e) => setEditIp(e.target.value)}
                    className="w-full px-3 py-2 st-card font-mono text-xs"
                    style={{ color: 'var(--st-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--st-text-muted)' }}>
                    Port
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editPort}
                    onChange={(e) => setEditPort(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 st-card font-mono text-xs"
                    style={{ color: 'var(--st-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--st-text-muted)' }}>
                    IPv6 (optional)
                  </label>
                  <input
                    type="text"
                    value={editIpv6}
                    onChange={(e) => setEditIpv6(e.target.value)}
                    placeholder="2001:db8::1"
                    className="w-full px-3 py-2 st-card font-mono text-xs"
                    style={{ color: 'var(--st-text)' }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSaveEditedDestination(activeDomain)}
                  className="px-3.5 py-2 st-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {busy ? 'Saving...' : 'Save destination'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-2 st-btn-secondary text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action Footer: Edit + External DNS Helper + Delete */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditIp(activeDomain.targetHost);
                    setEditPort(String(activeDomain.targetPort));
                    setEditIpv6(activeDomain.ipv6 || '');
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 st-btn-secondary text-xs font-medium cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit destination</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowExternalHelper((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 st-btn-secondary text-xs font-medium cursor-pointer"
              >
                <Server className="w-3.5 h-3.5" />
                <span>{showExternalHelper ? 'Hide DNS Records' : 'Copy Free DNS Records'}</span>
              </button>
            </div>

            {!confirmDelete ? (
              <button
                type="button"
                aria-label={`Delete /s/${activeDomain.handle}`}
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete subdomain</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRemoveSubdomain(activeDomain)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold cursor-pointer"
                >
                  Confirm delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 st-btn-secondary text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Optional External DNS Zone Records (Cloudflare / DuckDNS / FreeDNS) */}
          {showExternalHelper && activeExternalRecords && (
            <div className="st-surface-inset p-4 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--st-text)' }}>
                <ShieldCheck className="w-4 h-4" style={{ color: 'var(--st-success)' }} />
                <span>Manual Cloudflare / DuckDNS / FreeDNS Zone Records</span>
              </div>
              <div className="flex items-center justify-between gap-2 font-mono">
                <span className="truncate" style={{ color: 'var(--st-text-secondary)' }}>
                  SRV: {activeExternalRecords.srvHost} → {activeExternalRecords.srvValue}
                </span>
                <CopyButton
                  text={`${activeExternalRecords.srvHost} SRV ${activeExternalRecords.srvValue}`}
                  label="Copy SRV"
                />
              </div>
              {activeDomain.lastDnsIps?.[0] && (
                <div className="flex items-center justify-between gap-2 font-mono">
                  <span className="truncate" style={{ color: 'var(--st-text-secondary)' }}>
                    A Record: {activeFullDomain} → {activeDomain.lastDnsIps[0]}
                  </span>
                  <CopyButton
                    text={`${activeFullDomain} A ${activeDomain.lastDnsIps[0]}`}
                    label="Copy A"
                  />
                </div>
              )}
              <p className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                {activeExternalRecords.bedrockNote}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
