import React, { useState } from 'react';
import {
  Activity,
  Code2,
  FileCode,
  Globe,
  KeyRound,
  LayoutDashboard,
  Palette,
  Plus,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { PRICING_TIERS, ServerListing } from '../data/catalog';
import { SERVER_CATEGORIES } from '../utils/minecraftExtraTools';
import { THEME_PRESETS, ThemePreset, ThemeStyleId } from '../utils/themePresets';
import { VerificationToken, isVerificationTokenValid } from '../utils/botVerification';
import { CustomServerAddressStudio, OwnedDomainItem } from './CustomServerAddressStudio';
import { HumanVerificationWidget } from './HumanVerificationWidget';
import { PlayerActivityChart } from './PlayerActivityChart';
import { CopyButton } from './tools/TextAndServerTools';
import { AuthUserState } from './AuthPage';

export type DashboardSection =
  | 'overview'
  | 'servers'
  | 'domains'
  | 'plugins'
  | 'configs'
  | 'api-keys'
  | 'settings';

export interface SavedConfigItem {
  id: string;
  name: string;
  format: 'YAML' | 'MOTD' | 'LuckPerms' | 'JSON';
  content: string;
  updatedAt: string;
}

export interface ApiKeyItem {
  id: string;
  label: string;
  token: string;
  createdAt: string;
}

export type { OwnedDomainItem };

interface DashboardPageProps {
  section: DashboardSection;
  onNavigate: (path: string) => void;
  user: AuthUserState | null;
  activeTheme: ThemePreset;
  onSelectTheme: (id: ThemeStyleId) => void;
  servers: ServerListing[];
  onAddServer: (server: ServerListing) => void;
  onRemoveServer: (id: string) => void;
  onToggleServerStatus: (id: string) => void;
  onRefreshServerStatus?: (id: string) => Promise<void>;
  ownedDomains: OwnedDomainItem[];
  onSaveDomain: (domain: OwnedDomainItem) => void;
  onDeleteDomain: (handle: string) => void;
  savedConfigs: SavedConfigItem[];
  onSaveConfig: (cfg: SavedConfigItem) => void;
  onDeleteConfig: (id: string) => void;
  apiKeys: ApiKeyItem[];
  onCreateApiKey: (label: string) => void;
  onDeleteApiKey: (id: string) => void;
}

const SIDEBAR_ITEMS: { id: DashboardSection; label: string; path: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'servers', label: 'My Servers', path: '/dashboard/servers', icon: <Server className="w-4 h-4" /> },
  { id: 'domains', label: 'Custom Address', path: '/dashboard/domains', icon: <Globe className="w-4 h-4" /> },
  { id: 'plugins', label: 'Plugin Workspace', path: '/dashboard/plugins', icon: <Code2 className="w-4 h-4" /> },
  { id: 'configs', label: 'Saved Configs', path: '/dashboard/configs', icon: <FileCode className="w-4 h-4" /> },
  { id: 'api-keys', label: 'API Keys', path: '/dashboard/api-keys', icon: <KeyRound className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', path: '/dashboard/settings', icon: <Settings className="w-4 h-4" /> },
];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  section,
  onNavigate,
  user,
  activeTheme,
  onSelectTheme,
  servers,
  onAddServer,
  onRemoveServer,
  onToggleServerStatus,
  onRefreshServerStatus,
  ownedDomains,
  onSaveDomain,
  onDeleteDomain,
  savedConfigs,
  onSaveConfig,
  onDeleteConfig,
  apiKeys,
  onCreateApiKey,
  onDeleteApiKey,
}) => {
  // Server submission state
  const [srvName, setSrvName] = useState('');
  const [srvIp, setSrvIp] = useState('');
  const [srvEdition, setSrvEdition] = useState<'Java' | 'Bedrock' | 'Crossplay'>('Java');
  const [srvCategory, setSrvCategory] = useState('Survival SMP');
  const [srvVersion, setSrvVersion] = useState('1.21.4 Paper');
  const [srvMotd, setSrvMotd] = useState('');
  const [verificationToken, setVerificationToken] = useState<VerificationToken | null>(null);
  const [verifyReset, setVerifyReset] = useState(0);
  const [srvError, setSrvError] = useState('');
  const [srvSuccess, setSrvSuccess] = useState('');
  const [submittingSrv, setSubmittingSrv] = useState(false);
  const [refreshingSrvId, setRefreshingSrvId] = useState<string | null>(null);
  const [serverSubTab, setServerSubTab] = useState<'listing' | 'address' | 'voting'>('listing');

  // Voting & reward manager state
  const [rewardCmd, setRewardCmd] = useState('give %player% diamond 2');
  const [voteLog, setVoteLog] = useState<string[]>([]);

  // Plugin workspace state
  const [pluginName, setPluginName] = useState('SurgeCoreBridge');
  const [pluginPkg, setPluginPkg] = useState('net.surgetrix.bridge');
  const [pluginAuthor, setPluginAuthor] = useState(user?.username || 'ServerOwner');
  const [includeStatusCmd, setIncludeStatusCmd] = useState(true);
  const [includeVoteHook, setIncludeVoteHook] = useState(true);

  // Config vault state
  const [cfgName, setCfgName] = useState('');
  const [cfgFormat, setCfgFormat] = useState<SavedConfigItem['format']>('YAML');
  const [cfgContent, setCfgContent] = useState('');

  // API key state
  const [keyLabel, setKeyLabel] = useState('Paper Network Prod');

  const planTier =
    PRICING_TIERS.find((t) => t.name.toLowerCase() === (user?.plan || 'free').toLowerCase()) ||
    PRICING_TIERS[0];

  const handleServerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSrvError('');
    setSrvSuccess('');
    if (!srvName.trim() || !srvIp.trim()) {
      setSrvError('Enter both a server name and a connection IP/domain.');
      return;
    }
    if (!isVerificationTokenValid(verificationToken)) {
      setSrvError('Please complete the Turnstile verification check before listing your server.');
      return;
    }

    setSubmittingSrv(true);
    try {
      const probeRes = await fetch('/api/domains/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: srvIp.trim(), edition: srvEdition }),
      }).catch(() => null);
      const probe = probeRes && probeRes.ok
        ? ((await probeRes.json().catch(() => null)) as {
            ok?: boolean;
            online?: boolean;
            playersOnline?: number;
            maxPlayers?: number;
            version?: string | null;
            motdClean?: string | null;
          } | null)
        : null;

      onAddServer({
        id: `srv-${Date.now()}`,
        name: srvName.trim(),
        ip: srvIp.trim(),
        edition: srvEdition,
        category: srvCategory,
        status: probe?.ok ? (probe.online ? 'Online' : 'Offline') : 'Online',
        playersOnline: probe?.ok && typeof probe.playersOnline === 'number' ? probe.playersOnline : 0,
        maxPlayers: probe?.ok && typeof probe.maxPlayers === 'number' && probe.maxPlayers > 0 ? probe.maxPlayers : 100,
        version: probe?.version || srvVersion.trim() || '1.21.4',
        rating: null,
        reviewsCount: 0,
        likes: 0,
        motd: probe?.motdClean || srvMotd.trim() || '',
      });

      setSrvName('');
      setSrvIp('');
      setSrvMotd('');
      setVerificationToken(null);
      setVerifyReset((c) => c + 1);
      setSrvSuccess(
        probe?.ok
          ? `Server verified (${probe.online ? `Online · ${probe.playersOnline}/${probe.maxPlayers}` : 'Offline'}) and published to the Server List.`
          : 'Server published to the live SurgeTrix Server List.'
      );
    } finally {
      setSubmittingSrv(false);
    }
  };

  const generatedPluginYml = `name: ${pluginName || 'SurgeCoreBridge'}
version: '1.0.0'
main: ${pluginPkg || 'net.surgetrix.bridge'}.${(pluginName || 'SurgeCoreBridge').replace(/[^A-Za-z0-9]/g, '')}
api-version: '1.21'
author: ${pluginAuthor || 'ServerOwner'}
${includeStatusCmd ? 'commands:\n  surgetrix:\n    description: Check live SurgeTrix bridge status\n    permission: surgetrix.admin' : ''}`;

  const generatedJavaClass = `package ${pluginPkg || 'net.surgetrix.bridge'};

import org.bukkit.plugin.java.JavaPlugin;

public final class ${(pluginName || 'SurgeCoreBridge').replace(/[^A-Za-z0-9]/g, '')} extends JavaPlugin {
  @Override
  public void onEnable() {
    getLogger().info("SurgeTrix Bridge enabled for " + getServer().getVersion());${includeVoteHook ? '\n    // Vote reward listener ready' : ''}
  }
}`;

  const handleSaveNewConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfgName.trim() || !cfgContent.trim()) return;
    onSaveConfig({
      id: `cfg-${Date.now()}`,
      name: cfgName.trim(),
      format: cfgFormat,
      content: cfgContent,
      updatedAt: new Date().toLocaleDateString(),
    });
    setCfgName('');
    setCfgContent('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Navigation */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="st-card p-4 space-y-3">
            <div className="pb-3 border-b" style={{ borderColor: 'var(--st-border)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--st-accent-text)' }}>
                Workspace
              </div>
              <div className="text-base font-bold mt-0.5 truncate" style={{ color: 'var(--st-text)' }}>
                {user ? user.username : 'Guest Workspace'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--st-text-muted)' }}>
                {planTier.name} Plan · {planTier.storage} storage
              </div>
            </div>

            <nav aria-label="Dashboard sections" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1">
              {SIDEBAR_ITEMS.map((item) => {
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.path)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
                    style={{
                      borderRadius: 'var(--st-radius)',
                      backgroundColor: active ? 'var(--st-accent-soft)' : 'transparent',
                      color: active ? 'var(--st-accent-text)' : 'var(--st-text-secondary)',
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {!user && (
              <div className="pt-3 border-t" style={{ borderColor: 'var(--st-border)' }}>
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="w-full py-2 px-3 st-btn-primary text-xs font-semibold cursor-pointer"
                >
                  Sign In to Sync Profile
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Workspace Panel */}
        <div className="lg:col-span-9 space-y-6">
          {section === 'overview' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--st-text)' }}>
                    Dashboard Overview
                  </h1>
                  <p className="text-sm mt-1" style={{ color: 'var(--st-text-muted)' }}>
                    Monitor server activity, manage listings, build plugins, and track daily tool allowances.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/dashboard/servers')}
                  className="inline-flex items-center gap-2 px-4 py-2 st-btn-primary text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>List a server</span>
                </button>
              </div>

              {/* KPI Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
                <div className="st-card p-4">
                  <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>Active Plan</div>
                  <div className="text-xl font-bold mt-1" style={{ color: 'var(--st-accent-text)' }}>
                    {planTier.name}
                  </div>
                </div>
                <div className="st-card p-4">
                  <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>Listed Servers</div>
                  <div className="text-xl font-bold mt-1" style={{ color: 'var(--st-text)' }}>
                    {servers.length}
                  </div>
                </div>
                <div className="st-card p-4">
                  <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>Saved Configs</div>
                  <div className="text-xl font-bold mt-1" style={{ color: 'var(--st-text)' }}>
                    {savedConfigs.length}
                  </div>
                </div>
                <div className="st-card p-4">
                  <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>API Keys</div>
                  <div className="text-xl font-bold mt-1" style={{ color: 'var(--st-text)' }}>
                    {apiKeys.length}
                  </div>
                </div>
              </div>

              {/* Player Activity Chart + Allowances Split */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                <div className="xl:col-span-7 st-card p-5">
                  <PlayerActivityChart />
                </div>

                <div className="xl:col-span-5 st-card p-5 flex flex-col justify-between gap-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                        Daily Tool Allowances
                      </h2>
                      <span className="text-xs font-mono" style={{ color: 'var(--st-accent-text)' }}>
                        {planTier.name}
                      </span>
                    </div>

                    <div className="space-y-2 tabular-nums">
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'var(--st-text-secondary)' }}>Normal Tools</span>
                        <span className="font-mono" style={{ color: 'var(--st-text-muted)' }}>
                          0 / {planTier.normalAllowance} used today
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden st-surface-inset">
                        <div
                          className="h-full rounded-full"
                          style={{ width: '0%', backgroundColor: 'var(--st-accent)' }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 tabular-nums">
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'var(--st-text-secondary)' }}>Advanced Tools</span>
                        <span className="font-mono" style={{ color: 'var(--st-text-muted)' }}>
                          0 / {planTier.advancedAllowance} used today
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden st-surface-inset">
                        <div
                          className="h-full rounded-full"
                          style={{ width: '0%', backgroundColor: 'var(--st-success)' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t grid grid-cols-2 gap-2.5" style={{ borderColor: 'var(--st-border)' }}>
                    <button
                      type="button"
                      onClick={() => onNavigate('/assistant')}
                      className="py-2 px-3 st-btn-secondary text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--st-accent-text)' }} />
                      <span>Ask Surge AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('/pricing')}
                      className="py-2 px-3 st-btn-secondary text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Activity className="w-3.5 h-3.5" style={{ color: 'var(--st-success)' }} />
                      <span>Upgrade Plan</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {section === 'servers' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--st-text)' }}>
                    My Servers &amp; Addresses
                  </h1>
                  <p className="text-sm mt-1" style={{ color: 'var(--st-text-muted)' }}>
                    Submit your server to the SurgeTrix Server List, configure custom addresses, and set vote rewards.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/servers')}
                  className="px-4 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
                >
                  View public server list →
                </button>
              </div>

              {/* Minevex-style sub-tabs inside My Servers */}
              <div
                className="flex flex-wrap gap-2 border-b pb-3"
                style={{ borderColor: 'var(--st-border)' }}
                role="tablist"
                aria-label="Server management tabs"
              >
                {(
                  [
                    { id: 'listing', label: 'Listing' },
                    { id: 'address', label: 'Custom Server Address' },
                    { id: 'voting', label: 'Voting & rewards' },
                  ] as const
                ).map((tab) => {
                  const active = serverSubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setServerSubTab(tab.id)}
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      style={{
                        backgroundColor: active ? 'var(--st-accent-soft)' : 'var(--st-surface-inset)',
                        border: active ? '1px solid var(--st-border-strong)' : '1px solid var(--st-border)',
                        color: active ? 'var(--st-accent-text)' : 'var(--st-text-secondary)',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {serverSubTab === 'listing' && (
                <>

              {/* Add Server Form */}
              <form onSubmit={(e) => void handleServerSubmit(e)} className="st-card p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold" style={{ color: 'var(--st-text)' }}>
                    List Your Minecraft Server
                  </h2>
                  {ownedDomains.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {ownedDomains.slice(0, 3).map((dom) => (
                        <button
                          key={dom.handle}
                          type="button"
                          onClick={() => {
                            setSrvName(dom.serverName);
                            setSrvIp(dom.connectAddress || dom.workingDomain || dom.targetHost);
                            setSrvEdition(dom.edition);
                          }}
                          className="px-2.5 py-1 st-btn-secondary text-[11px] font-mono cursor-pointer"
                        >
                          Use {dom.connectAddress || dom.workingDomain || dom.handle}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {srvError && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500"
                  >
                    {srvError}
                  </div>
                )}
                {srvSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-500">
                    {srvSuccess}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="dash-srv-name" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                      Server Name
                    </label>
                    <input
                      id="dash-srv-name"
                      type="text"
                      value={srvName}
                      onChange={(e) => setSrvName(e.target.value)}
                      placeholder="e.g. CrystalSMP"
                      className="w-full px-3 py-2 st-surface-inset text-sm"
                      style={{ color: 'var(--st-text)' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="dash-srv-ip" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                      Connection IP / Domain
                    </label>
                    <input
                      id="dash-srv-ip"
                      type="text"
                      value={srvIp}
                      onChange={(e) => setSrvIp(e.target.value)}
                      placeholder="play.example.com"
                      className="w-full px-3 py-2 st-surface-inset font-mono text-sm"
                      style={{ color: 'var(--st-text)' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="dash-srv-edition" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                      Edition
                    </label>
                    <select
                      id="dash-srv-edition"
                      value={srvEdition}
                      onChange={(e) => setSrvEdition(e.target.value as 'Java' | 'Bedrock' | 'Crossplay')}
                      className="w-full px-3 py-2 st-surface-inset text-sm"
                      style={{ color: 'var(--st-text)' }}
                    >
                      <option value="Java">Java</option>
                      <option value="Bedrock">Bedrock</option>
                      <option value="Crossplay">Crossplay</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="dash-srv-cat" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                      Category
                    </label>
                    <select
                      id="dash-srv-cat"
                      value={srvCategory}
                      onChange={(e) => setSrvCategory(e.target.value)}
                      className="w-full px-3 py-2 st-surface-inset text-sm"
                      style={{ color: 'var(--st-text)' }}
                    >
                      {SERVER_CATEGORIES.filter((c) => c !== 'All categories').map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="dash-srv-ver" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                      Minecraft Version
                    </label>
                    <input
                      id="dash-srv-ver"
                      type="text"
                      value={srvVersion}
                      onChange={(e) => setSrvVersion(e.target.value)}
                      className="w-full px-3 py-2 st-surface-inset text-sm"
                      style={{ color: 'var(--st-text)' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="dash-srv-motd" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                      Short Description (optional)
                    </label>
                    <input
                      id="dash-srv-motd"
                      type="text"
                      value={srvMotd}
                      onChange={(e) => setSrvMotd(e.target.value)}
                      placeholder="Survival SMP · 1.21.4"
                      className="w-full px-3 py-2 st-surface-inset text-sm"
                      style={{ color: 'var(--st-text)' }}
                    />
                  </div>
                </div>

                <HumanVerificationWidget
                  onVerified={(tok) => {
                    setVerificationToken(tok);
                    if (tok) setSrvError('');
                  }}
                  resetTrigger={verifyReset}
                  label="Verify server owner is human"
                />

                <button
                  type="submit"
                  disabled={submittingSrv}
                  className="px-5 py-2.5 st-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {submittingSrv ? 'Checking live server & publishing…' : 'Publish Server Listing'}
                </button>
              </form>

              {/* Submitted Servers List */}
              <div className="st-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold" style={{ color: 'var(--st-text)' }}>
                    Your Listed Servers ({servers.length})
                  </h2>
                </div>
                {servers.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--st-text-muted)' }}>
                    You have not listed any servers yet. Use the form above when you are ready to publish one.
                  </p>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--st-border)' }}>
                    {servers.map((srv) => (
                      <div key={srv.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-sm" style={{ color: 'var(--st-text)' }}>
                            {srv.name}{' '}
                            <span className="text-xs font-normal" style={{ color: 'var(--st-text-muted)' }}>
                              · {srv.edition} · {srv.category}
                            </span>
                          </div>
                          <div className="text-xs font-mono" style={{ color: 'var(--st-accent-text)' }}>
                            {srv.ip}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {onRefreshServerStatus && (
                            <button
                              type="button"
                              disabled={refreshingSrvId === srv.id}
                              onClick={async () => {
                                setRefreshingSrvId(srv.id);
                                await onRefreshServerStatus(srv.id).finally(() =>
                                  setRefreshingSrvId(null)
                                );
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 st-btn-secondary text-xs font-medium cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw
                                className={`w-3 h-3 ${
                                  refreshingSrvId === srv.id ? 'animate-spin' : ''
                                }`}
                              />
                              <span>Live Ping</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onToggleServerStatus(srv.id)}
                            className="px-3 py-1.5 st-btn-secondary text-xs font-medium cursor-pointer"
                          >
                            {srv.status}
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${srv.name}`}
                            onClick={() => onRemoveServer(srv.id)}
                            className="p-1.5 st-btn-secondary text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {serverSubTab === 'listing' && null}
                </>
              )}

              {serverSubTab === 'address' && (
                <CustomServerAddressStudio
                  user={user}
                  servers={servers}
                  ownedDomains={ownedDomains}
                  onSaveDomain={onSaveDomain}
                  onDeleteDomain={onDeleteDomain}
                  onPublishServer={onAddServer}
                  onNavigate={onNavigate}
                />
              )}

              {serverSubTab === 'voting' && (
                <div className="st-card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" style={{ color: 'var(--st-success)' }} />
                    <h2 className="text-base font-bold" style={{ color: 'var(--st-text)' }}>
                      Voting &amp; Reward Manager
                    </h2>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="vote-cmd" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                        Console Dispatch Command
                      </label>
                      <input
                        id="vote-cmd"
                        type="text"
                        value={rewardCmd}
                        onChange={(e) => setRewardCmd(e.target.value)}
                        className="w-full px-3 py-2 st-surface-inset font-mono text-sm"
                        style={{ color: 'var(--st-text)' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setVoteLog((prev) => [
                          `Dispatched: /${rewardCmd.replace('%player%', user?.username || 'Steve')}`,
                          ...prev.slice(0, 3),
                        ])
                      }
                      className="px-3.5 py-2 st-btn-primary text-xs font-semibold cursor-pointer"
                    >
                      Simulate Reward Delivery
                    </button>
                    {voteLog.length > 0 && (
                      <div className="st-surface-inset p-3 space-y-1">
                        {voteLog.map((entry, idx) => (
                          <div key={idx} className="text-xs font-mono" style={{ color: 'var(--st-success)' }}>
                            {entry}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {section === 'domains' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--st-text)' }}>
                    Custom Server Address
                  </h1>
                  <p className="text-sm mt-1" style={{ color: 'var(--st-text-muted)' }}>
                    Create and manage real working Minecraft addresses, auto-detect server IPs, sync free DNS, and connect live servers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/servers')}
                  className="px-4 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
                >
                  View public server list →
                </button>
              </div>

              <CustomServerAddressStudio
                user={user}
                servers={servers}
                ownedDomains={ownedDomains}
                onSaveDomain={onSaveDomain}
                onDeleteDomain={onDeleteDomain}
                onPublishServer={onAddServer}
                onNavigate={onNavigate}
              />
            </div>
          )}

          {section === 'plugins' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--st-text)' }}>
                  Plugin Workspace
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--st-text-muted)' }}>
                  Scaffold clean Paper / Purpur 1.21 plugin descriptors and starter Java classes in your browser.
                </p>
              </div>

              <div className="st-card p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="pl-name" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                      Plugin Name
                    </label>
                    <input
                      id="pl-name"
                      type="text"
                      value={pluginName}
                      onChange={(e) => setPluginName(e.target.value)}
                      className="w-full px-3 py-2 st-surface-inset text-sm"
                      style={{ color: 'var(--st-text)' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="pl-pkg" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                      Maven Group / Package
                    </label>
                    <input
                      id="pl-pkg"
                      type="text"
                      value={pluginPkg}
                      onChange={(e) => setPluginPkg(e.target.value)}
                      className="w-full px-3 py-2 st-surface-inset font-mono text-sm"
                      style={{ color: 'var(--st-text)' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="pl-author" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                      Author
                    </label>
                    <input
                      id="pl-author"
                      type="text"
                      value={pluginAuthor}
                      onChange={(e) => setPluginAuthor(e.target.value)}
                      className="w-full px-3 py-2 st-surface-inset text-sm"
                      style={{ color: 'var(--st-text)' }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="inline-flex items-center gap-2 cursor-pointer" style={{ color: 'var(--st-text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={includeStatusCmd}
                      onChange={(e) => setIncludeStatusCmd(e.target.checked)}
                      className="w-4 h-4 accent-[var(--st-accent)]"
                    />
                    <span>Include /surgetrix command</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer" style={{ color: 'var(--st-text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={includeVoteHook}
                      onChange={(e) => setIncludeVoteHook(e.target.checked)}
                      className="w-4 h-4 accent-[var(--st-accent)]"
                    />
                    <span>Include vote reward hook</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="st-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--st-accent-text)' }}>
                      plugin.yml
                    </span>
                    <CopyButton text={generatedPluginYml} label="Copy YAML" />
                  </div>
                  <pre className="st-surface-inset p-3 text-xs font-mono overflow-x-auto" style={{ color: 'var(--st-text-secondary)' }}>
                    {generatedPluginYml}
                  </pre>
                </div>

                <div className="st-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--st-accent-text)' }}>
                      Main.java
                    </span>
                    <CopyButton text={generatedJavaClass} label="Copy Java" />
                  </div>
                  <pre className="st-surface-inset p-3 text-xs font-mono overflow-x-auto" style={{ color: 'var(--st-text-secondary)' }}>
                    {generatedJavaClass}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {section === 'configs' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--st-text)' }}>
                  Saved Configs Vault
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--st-text-muted)' }}>
                  Store plugin YAML files, MOTD snippets, and LuckPerms scripts in your browser workspace.
                </p>
              </div>

              <form onSubmit={handleSaveNewConfig} className="st-card p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label htmlFor="cfg-name" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                      Config Name
                    </label>
                    <input
                      id="cfg-name"
                      type="text"
                      required
                      value={cfgName}
                      onChange={(e) => setCfgName(e.target.value)}
                      placeholder="e.g. hub-tab-config.yml"
                      className="w-full px-3 py-2 st-surface-inset text-sm"
                      style={{ color: 'var(--st-text)' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="cfg-fmt" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                      Format
                    </label>
                    <select
                      id="cfg-fmt"
                      value={cfgFormat}
                      onChange={(e) => setCfgFormat(e.target.value as SavedConfigItem['format'])}
                      className="w-full px-3 py-2 st-surface-inset text-sm"
                      style={{ color: 'var(--st-text)' }}
                    >
                      <option value="YAML">YAML</option>
                      <option value="MOTD">MOTD</option>
                      <option value="LuckPerms">LuckPerms</option>
                      <option value="JSON">JSON</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="cfg-body" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                    Configuration Content
                  </label>
                  <textarea
                    id="cfg-body"
                    rows={4}
                    required
                    value={cfgContent}
                    onChange={(e) => setCfgContent(e.target.value)}
                    placeholder="Paste plugin YAML, MOTD lines, or commands..."
                    className="w-full p-3 st-surface-inset font-mono text-xs"
                    style={{ color: 'var(--st-text)' }}
                  />
                </div>
                <button type="submit" className="px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer">
                  Save Config
                </button>
              </form>

              <div className="space-y-3">
                {savedConfigs.length === 0 ? (
                  <div className="st-card p-6 text-sm" style={{ color: 'var(--st-text-muted)' }}>
                    No saved configs yet. Add one above to reuse across server setups.
                  </div>
                ) : (
                  savedConfigs.map((cfg) => (
                    <div key={cfg.id} className="st-card p-5 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                            {cfg.name}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                            {cfg.format} · Saved {cfg.updatedAt}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CopyButton text={cfg.content} label="Copy" />
                          <button
                            type="button"
                            aria-label={`Delete ${cfg.name}`}
                            onClick={() => onDeleteConfig(cfg.id)}
                            className="p-1.5 st-btn-secondary text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <pre className="st-surface-inset p-3 text-xs font-mono overflow-x-auto" style={{ color: 'var(--st-text-secondary)' }}>
                        {cfg.content}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {section === 'api-keys' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--st-text)' }}>
                  Developer API Keys
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--st-text-muted)' }}>
                  Manage SurgeTrix Bridge keys for automated Network Health snapshots and plugin hooks.
                </p>
              </div>

              <div className="st-card p-6 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label htmlFor="api-label" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                    Key Label
                  </label>
                  <input
                    id="api-label"
                    type="text"
                    value={keyLabel}
                    onChange={(e) => setKeyLabel(e.target.value)}
                    className="w-full px-3 py-2 st-surface-inset text-sm"
                    style={{ color: 'var(--st-text)' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!keyLabel.trim()) return;
                    onCreateApiKey(keyLabel.trim());
                    setKeyLabel('');
                  }}
                  className="px-4 py-2.5 st-btn-primary text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  Generate API Key
                </button>
              </div>

              <div className="st-card p-6 space-y-3">
                {apiKeys.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--st-text-muted)' }}>
                    No API keys generated yet.
                  </p>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--st-border)' }}>
                    {apiKeys.map((k) => (
                      <div key={k.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                            {k.label}
                          </div>
                          <div className="text-xs font-mono" style={{ color: 'var(--st-text-muted)' }}>
                            {k.token.slice(0, 14)}••••••{k.token.slice(-4)} · Created {k.createdAt}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CopyButton text={k.token} label="Copy Key" />
                          <button
                            type="button"
                            aria-label={`Revoke ${k.label}`}
                            onClick={() => onDeleteApiKey(k.id)}
                            className="p-1.5 st-btn-secondary text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--st-text)' }}>
                  Workspace Settings
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--st-text-muted)' }}>
                  Customize your SurgeTrix visual style and review account plan details.
                </p>
              </div>

              <div className="st-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4" style={{ color: 'var(--st-accent-text)' }} />
                  <h2 className="text-base font-bold" style={{ color: 'var(--st-text)' }}>
                    Interface Design Style
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {THEME_PRESETS.map((preset) => {
                    const selected = preset.id === activeTheme.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onSelectTheme(preset.id)}
                        className="p-3.5 text-left flex items-center gap-3 cursor-pointer"
                        style={{
                          borderRadius: 'var(--st-radius)',
                          backgroundColor: selected ? 'var(--st-accent-soft)' : 'var(--st-surface-inset)',
                          border: selected ? '1px solid var(--st-border-strong)' : '1px solid var(--st-border)',
                        }}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: preset.swatches[1] }}
                        />
                        <div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                            {preset.name}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                            {preset.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="st-card p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                    Account &amp; Plan
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--st-text-muted)' }}>
                    {user ? `${user.username} (${user.email}) · ${planTier.name} Plan` : 'Not signed in · Using local browser workspace'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer"
                >
                  {user ? 'Manage Account' : 'Sign In / Sign Up'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
