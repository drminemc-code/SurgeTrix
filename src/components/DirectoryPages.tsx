import React, { useState } from 'react';
import {
  ArrowUp,
  BookOpen,
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Heart,
  Plus,
  RefreshCw,
  Search,
  Server,
} from 'lucide-react';
import {
  CommunityRequest,
  GUIDES_CATALOG,
  GuideItem,
  ResourceItem,
  ServerListing,
} from '../data/catalog';
import { VerificationToken, isVerificationTokenValid } from '../utils/botVerification';
import {
  ResourceSortBy,
  filterAndSortResources,
  getPlatformOptionsForKind,
} from '../utils/resourceFilters';
import {
  SERVER_CATEGORIES,
  SERVER_SECTIONS,
  ServerSectionFilter,
  filterServers,
  getServerAggregateStats,
} from '../utils/minecraftExtraTools';
import { HumanVerificationWidget } from './HumanVerificationWidget';

interface ServersPageProps {
  servers: ServerListing[];
  onLikeServer: (id: string) => void;
  onOpenListServer: () => void;
  onOpenFreeDomains?: () => void;
  onRefreshServer?: (id: string) => Promise<void>;
}

export const ServersPage: React.FC<ServersPageProps> = ({
  servers,
  onLikeServer,
  onOpenListServer,
  onOpenFreeDomains,
  onRefreshServer,
}) => {
  const [search, setSearch] = useState('');
  const [edition, setEdition] = useState<'All' | 'Java' | 'Bedrock' | 'Crossplay'>('All');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [section, setSection] = useState<ServerSectionFilter>('Featured');
  const [category, setCategory] = useState<string>('All categories');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const stats = getServerAggregateStats(servers);
  const filtered = filterServers(servers, {
    search,
    edition,
    onlineOnly,
    category,
    section,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {/* Header Row matching Minevex Server List */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-6 border-b" style={{ borderColor: 'var(--st-border)' }}>
        <div className="space-y-1.5">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--st-accent-text)' }}
          >
            Live server list
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--st-text)' }}>
            Minecraft servers
          </h1>
          <p className="text-[15px] max-w-2xl" style={{ color: 'var(--st-text-muted)' }}>
            Discover community Minecraft servers by edition, game mode, and status — or publish yours directly from your Dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 shrink-0 tabular-nums">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xl font-bold font-mono" style={{ color: 'var(--st-text)' }}>
                {stats.totalServers}
              </div>
              <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                {stats.totalServers === 1 ? 'Server' : 'Servers'}
              </div>
            </div>
            <div>
              <div className="text-xl font-bold font-mono" style={{ color: 'var(--st-success)' }}>
                {stats.totalPlayersOnline}
              </div>
              <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                Players online
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenFreeDomains || onOpenListServer}
              className="inline-flex items-center gap-2 px-4 py-2.5 st-btn-secondary text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>Free Domain</span>
            </button>
            <button
              type="button"
              onClick={onOpenListServer}
              className="inline-flex items-center gap-2 px-4 py-2.5 st-btn-primary text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>List your server</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--st-text-muted)' }}
          />
          <input
            type="text"
            aria-label="Search servers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, tag or IP"
            className="w-full pl-10 pr-4 py-2.5 st-surface-inset text-sm focus:outline-none"
            style={{ color: 'var(--st-text)' }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Server edition"
            className="inline-flex items-center p-1 st-surface-inset gap-1"
          >
            {(['All', 'Java', 'Bedrock', 'Crossplay'] as const).map((ed) => {
              const active = edition === ed;
              return (
                <button
                  key={ed}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setEdition(ed)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors"
                  style={{
                    backgroundColor: active ? 'var(--st-accent-soft)' : 'transparent',
                    color: active ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
                  }}
                >
                  {ed}
                </button>
              );
            })}
          </div>

          <label
            className="inline-flex items-center gap-2 px-3 py-2 st-surface-inset text-xs font-medium cursor-pointer whitespace-nowrap"
            style={{ color: 'var(--st-text-secondary)' }}
          >
            <input
              type="checkbox"
              checked={onlineOnly}
              onChange={(e) => setOnlineOnly(e.target.checked)}
              className="w-3.5 h-3.5 accent-[var(--st-accent)]"
            />
            <span>Online only</span>
          </label>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b" style={{ borderColor: 'var(--st-border)' }}>
        {SERVER_SECTIONS.map((sec) => {
          const active = section === sec;
          return (
            <button
              key={sec}
              type="button"
              onClick={() => setSection(sec)}
              className="px-3 py-2 text-xs font-semibold whitespace-nowrap cursor-pointer relative transition-colors"
              style={{
                color: active ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
              }}
            >
              <span>{sec}</span>
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 -bottom-[1px] h-[2px]"
                  style={{ backgroundColor: 'var(--st-accent)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Category Rail + Server List Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-3 st-card p-3 space-y-1">
          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--st-text-muted)' }}>
            Categories
          </div>
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
            {SERVER_CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className="px-2.5 py-1.5 text-left text-xs font-medium whitespace-nowrap rounded-md cursor-pointer transition-colors"
                  style={{
                    backgroundColor: active ? 'var(--st-accent-soft)' : 'transparent',
                    color: active ? 'var(--st-accent-text)' : 'var(--st-text-secondary)',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="lg:col-span-9 space-y-3" data-testid="servers-list">
          {filtered.length === 0 ? (
            <div className="st-card p-10 text-center space-y-3">
              <div
                className="w-12 h-12 mx-auto flex items-center justify-center st-surface-inset"
                style={{ color: 'var(--st-accent-text)' }}
              >
                <Server className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--st-text)' }}>
                {servers.length === 0 ? 'No servers listed yet' : 'No matching servers found'}
              </h2>
              <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'var(--st-text-muted)' }}>
                {servers.length === 0
                  ? 'The SurgeTrix server directory is open and ready for owners. Add your Minecraft server from the Dashboard whenever you are ready.'
                  : 'Try clearing your search input or switching back to All categories.'}
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-3">
                {servers.length === 0 ? (
                  <button
                    type="button"
                    onClick={onOpenListServer}
                    className="px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer"
                  >
                    List a server in Dashboard
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setEdition('All');
                      setOnlineOnly(false);
                      setCategory('All categories');
                    }}
                    className="px-4 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            filtered.map((srv) => (
              <div
                key={srv.id}
                className="st-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className="w-11 h-11 flex items-center justify-center shrink-0"
                    style={{
                      borderRadius: 'var(--st-radius)',
                      backgroundColor: 'var(--st-accent-soft)',
                      border: '1px solid var(--st-border-strong)',
                      color: 'var(--st-accent-text)',
                    }}
                  >
                    <Server className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold" style={{ color: 'var(--st-text)' }}>
                        {srv.name}
                      </h2>
                      <span className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                        {srv.category} · {srv.edition} · {srv.version}
                      </span>
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: srv.status === 'Online' ? 'var(--st-success)' : 'var(--st-text-muted)',
                        }}
                      >
                        · {srv.status}
                      </span>
                    </div>
                    <p className="text-xs font-mono mt-1" style={{ color: 'var(--st-accent-text)' }}>
                      {srv.ip}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0 tabular-nums">
                  <div className="text-right mr-2">
                    <div className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                      {srv.playersOnline} / {srv.maxPlayers}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                      {srv.rating ? `${srv.rating} (${srv.reviewsCount})` : 'New listing'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(srv.ip).catch(() => {});
                      setCopiedId(srv.id);
                      setTimeout(() => setCopiedId(null), 1500);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
                  >
                    {copiedId === srv.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" style={{ color: 'var(--st-success)' }} />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy IP</span>
                      </>
                    )}
                  </button>

                  {onRefreshServer && (
                    <button
                      type="button"
                      disabled={refreshingId === srv.id}
                      onClick={async () => {
                        setRefreshingId(srv.id);
                        await onRefreshServer(srv.id).finally(() => setRefreshingId(null));
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 st-btn-secondary text-xs font-medium cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === srv.id ? 'animate-spin' : ''}`} />
                      <span>Ping</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onLikeServer(srv.id)}
                    aria-label={`Vote for ${srv.name}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 st-btn-secondary text-xs font-medium cursor-pointer"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>{srv.likes}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface ResourcesPageProps {
  kind: 'resources' | 'plugin' | 'mods' | 'apps' | 'resource-packs';
  resources: ResourceItem[];
  onPublishResource: (item: ResourceItem) => void;
  onNavigate: (path: string) => void;
}

export const ResourcesPage: React.FC<ResourcesPageProps> = ({
  kind,
  resources,
  onPublishResource,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [sortBy, setSortBy] = useState<ResourceSortBy>('downloads');
  const [showPublish, setShowPublish] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newVersion, setNewVersion] = useState('1.0.0');
  const [newPlatform, setNewPlatform] = useState('');
  const [newKind, setNewKind] = useState<ResourceItem['kind']>(
    kind === 'resources' ? 'mods' : kind
  );

  React.useEffect(() => {
    setSelectedPlatform('All');
    setNewKind(kind === 'resources' ? 'mods' : kind);
    setNewPlatform('');
  }, [kind]);

  const meta = {
    resources: {
      title: 'Resources',
      desc: 'Browse Minecraft mods, companion apps, and resource packs in one organized hub.',
      cta: 'Publish resource',
    },
    plugin: {
      title: 'Minecraft Plugin',
      desc: 'Browse community-tested server plugin packages for Paper, Purpur, Folia, and Velocity.',
      cta: 'Publish plugin',
    },
    mods: {
      title: 'Minecraft Mods',
      desc: 'Fabric, Forge, NeoForge, and Quilt client and server mods with direct Modrinth & official links.',
      cta: 'Publish mod',
    },
    apps: {
      title: 'Minecraft Apps',
      desc: 'Desktop launchers, 3D model editors, and companion apps built for Minecraft creators.',
      cta: 'Publish app',
    },
    'resource-packs': {
      title: 'Resource Packs',
      desc: 'Textures, sounds and visual overhauls for every style and version.',
      cta: 'Publish pack',
    },
  }[kind];

  const platformOptions = getPlatformOptionsForKind(kind);
  const items = filterAndSortResources(resources, {
    kind,
    platform: selectedPlatform,
    search,
    sortBy,
  });

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSummary.trim()) return;
    const targetKind = kind === 'resources' ? newKind : kind;
    const parsedPlatforms = newPlatform
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const defaultPlatforms =
      targetKind === 'plugin'
        ? ['Paper', 'Purpur']
        : targetKind === 'mods'
        ? ['Fabric', 'NeoForge']
        : targetKind === 'apps'
        ? ['Windows', 'macOS']
        : ['1.21.x'];

    onPublishResource({
      id: `res-${Date.now()}`,
      kind: targetKind,
      name: newName.trim(),
      summary: newSummary.trim(),
      author: 'Community Member',
      downloads: 1,
      rating: 5.0,
      platforms: parsedPlatforms.length > 0 ? parsedPlatforms : defaultPlatforms,
      version: newVersion.trim() || '1.0.0',
      officialUrl: `#${targetKind}`,
    });
    setNewName('');
    setNewSummary('');
    setNewPlatform('');
    setShowPublish(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            {meta.title}
          </h1>
          <p className="text-[15px] text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
            {meta.desc}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNewKind(kind === 'resources' ? 'mods' : kind);
            setShowPublish(!showPublish);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 st-btn-primary text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{meta.cta}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All Resources', path: '/resources', active: kind === 'resources' },
            { label: 'Mods', path: '/mods', active: kind === 'mods' },
            { label: 'Apps', path: '/apps', active: kind === 'apps' },
            { label: 'Resource Packs', path: '/resource-packs', active: kind === 'resource-packs' },
            { label: 'Plugin', path: '/plugin', active: kind === 'plugin' },
          ].map((tab) => (
            <a
              key={tab.path}
              href={tab.path}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(tab.path);
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: tab.active ? 'var(--st-accent-soft)' : 'var(--st-surface)',
                border: tab.active ? '1px solid var(--st-border-strong)' : '1px solid var(--st-border)',
                color: tab.active ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
              }}
            >
              {tab.label}
            </a>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label={`Search ${meta.title}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${meta.title.toLowerCase()}`}
              className="w-full pl-10 pr-4 py-2 st-surface-inset text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
          <select
            aria-label="Sort resources"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ResourceSortBy)}
            className="px-3 py-2 st-surface-inset text-xs font-medium text-slate-900 dark:text-white cursor-pointer"
          >
            <option value="downloads">Most Popular</option>
            <option value="rating">Top Rated</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by loader or platform">
          {platformOptions.map((plat) => {
            const active = selectedPlatform === plat;
            return (
              <button
                key={plat}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedPlatform(plat)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                style={{
                  backgroundColor: active ? 'var(--st-accent-soft)' : 'var(--st-surface-inset)',
                  border: active ? '1px solid var(--st-border-strong)' : '1px solid var(--st-border)',
                  color: active ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
                }}
              >
                {plat === 'All' ? (kind === 'mods' ? 'All Loaders' : 'All Platforms') : plat}
              </button>
            );
          })}
        </div>
        <span className="text-xs tabular-nums" style={{ color: 'var(--st-text-muted)' }}>
          {items.length} {items.length === 1 ? 'listing' : 'listings'}
        </span>
      </div>

      {showPublish && (
        <form onSubmit={handlePublish} className="st-card p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Submit to {meta.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {kind === 'resources' && (
              <select
                aria-label="Resource type"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as ResourceItem['kind'])}
                className="px-3.5 py-2 st-surface-inset text-sm text-slate-900 dark:text-white"
              >
                <option value="mods">Mods</option>
                <option value="apps">Apps</option>
                <option value="resource-packs">Resource Packs</option>
              </select>
            )}
            <input
              type="text"
              required
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-3.5 py-2 st-surface-inset text-sm text-slate-900 dark:text-white"
            />
            <input
              type="text"
              required
              placeholder="Short summary"
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              className="px-3.5 py-2 st-surface-inset text-sm text-slate-900 dark:text-white sm:col-span-2"
            />
            <input
              type="text"
              placeholder={kind === 'mods' ? 'Loaders (e.g. Fabric, NeoForge)' : 'Platforms (e.g. Paper, Purpur)'}
              value={newPlatform}
              onChange={(e) => setNewPlatform(e.target.value)}
              className="px-3.5 py-2 st-surface-inset text-sm text-slate-900 dark:text-white"
            />
            <input
              type="text"
              placeholder="Version (e.g. 1.0.0)"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              className="px-3.5 py-2 st-surface-inset text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer">
              Publish
            </button>
            <button
              type="button"
              onClick={() => setShowPublish(false)}
              className="px-4 py-2 st-btn-secondary text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="st-card p-10 text-center space-y-3">
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            No matching {meta.title.toLowerCase()} found
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try clearing the search query or switching loader filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedPlatform('All');
            }}
            className="px-4 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="st-card p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--st-accent-text)' }}
                  >
                    {item.kind === 'resource-packs'
                      ? 'Resource Pack'
                      : item.kind === 'plugin'
                      ? 'Plugin'
                      : item.kind === 'apps'
                      ? 'App'
                      : 'Mod'}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {item.name}
                  </h3>
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--st-success)' }}>
                  v{item.version}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">by {item.author}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                {item.summary}
              </p>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>{item.platforms.join(' · ')}</span>
              {item.officialUrl.startsWith('http') ? (
                <a
                  href={item.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium"
                  style={{ color: 'var(--st-accent-text)' }}
                >
                  <span>Official</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 tabular-nums">
                  <Download className="w-3.5 h-3.5" style={{ color: 'var(--st-accent-text)' }} />
                  {item.downloads.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
};

export const GuidesPage: React.FC = () => {
  const [selectedGuide, setSelectedGuide] = useState<GuideItem | null>(null);
  const [query, setQuery] = useState('');

  const filtered = GUIDES_CATALOG.filter(
    (g) =>
      !query.trim() ||
      g.title.toLowerCase().includes(query.toLowerCase()) ||
      g.summary.toLowerCase().includes(query.toLowerCase())
  );

  if (selectedGuide) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <button
          type="button"
          onClick={() => setSelectedGuide(null)}
          className="text-xs font-medium cursor-pointer"
          style={{ color: 'var(--st-accent-text)' }}
        >
          ← All guides
        </button>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {selectedGuide.category} · {selectedGuide.readTime}
          </p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {selectedGuide.title}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 mt-2">
            {selectedGuide.summary}
          </p>
        </div>
        <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-white/[0.07]">
          {selectedGuide.sections.map((sec) => (
            <section key={sec.heading} className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{sec.heading}</h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{sec.body}</p>
              {sec.code && (
                <pre className="p-4 rounded-xl bg-slate-950 border border-white/[0.08] font-mono text-xs text-emerald-300 overflow-x-auto">
                  {sec.code}
                </pre>
              )}
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Guides
          </h1>
          <p className="text-[15px] text-slate-600 dark:text-slate-400 mt-2">
            Step-by-step documentation for servers, formatting codes, optimization and economy balancing.
          </p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Filter guides"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter guides"
            className="w-full pl-10 pr-4 py-2 st-surface-inset text-sm text-slate-900 dark:text-white placeholder-slate-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((g) => (
          <button
            key={g.slug}
            type="button"
            onClick={() => setSelectedGuide(g)}
            className="text-left p-5 st-card st-card-interactive flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div>
              <div className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--st-accent-text)' }}>
                <BookOpen className="w-3.5 h-3.5" />
                <span>
                  {g.category} · {g.readTime}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{g.title}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                {g.summary}
              </p>
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--st-accent-text)' }}>
              Read guide →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

interface CommunityPageProps {
  requests: CommunityRequest[];
  votedIds: string[];
  onToggleVote: (id: string) => void;
  onAddRequest: (title: string, description: string, category: string) => void;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({
  requests,
  votedIds,
  onToggleVote,
  onAddRequest,
}) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Server Owner Tools');
  const [showForm, setShowForm] = useState(false);
  const [verificationToken, setVerificationToken] = useState<VerificationToken | null>(null);
  const [verifyResetKey, setVerifyResetKey] = useState(0);
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!title.trim() || !desc.trim()) return;
    if (!isVerificationTokenValid(verificationToken)) {
      setFormError('Please complete the human verification check before posting your request.');
      return;
    }
    onAddRequest(title.trim(), desc.trim(), category);
    setTitle('');
    setDesc('');
    setVerificationToken(null);
    setVerifyResetKey((k) => k + 1);
    setShowForm(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Community
          </h1>
          <p className="text-[15px] text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
            Vote on the tools and ideas we should build next. The most-voted requests go first. You can also request anything you want.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError('');
            setShowForm(!showForm);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 st-btn-primary text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Request a tool</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="st-card p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Submit a Tool Request
          </h2>
          {formError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500"
            >
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              required
              aria-label="Request title"
              placeholder="Tool or feature title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3.5 py-2 st-surface-inset text-sm text-slate-900 dark:text-white"
            />
            <select
              aria-label="Request category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3.5 py-2 st-surface-inset text-sm text-slate-900 dark:text-white"
            >
              <option value="Minecraft Tools">Minecraft Tools</option>
              <option value="Server Owner Tools">Server Owner Tools</option>
              <option value="Player Utilities">Player Utilities</option>
              <option value="Developer Utilities">Developer Utilities</option>
            </select>
          </div>
          <textarea
            required
            aria-label="Request description"
            rows={3}
            placeholder="Describe what this tool should calculate, preview, or export..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full p-3.5 st-surface-inset text-sm text-slate-900 dark:text-white"
          />
          <HumanVerificationWidget
            onVerified={(token) => {
              setVerificationToken(token);
              if (token) setFormError('');
            }}
            resetTrigger={verifyResetKey}
          />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer">
              Post Request
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 st-btn-secondary text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3" data-testid="community-requests">
        {requests.map((req) => {
          const voted = votedIds.includes(req.id);
          return (
            <div key={req.id} className="st-card p-5 flex items-center gap-5">
              <button
                type="button"
                aria-pressed={voted}
                aria-label={`Upvote ${req.title}`}
                onClick={() => onToggleVote(req.id)}
                className="flex flex-col items-center justify-center w-14 h-14 transition-colors shrink-0 cursor-pointer tabular-nums"
                style={{
                  borderRadius: 'var(--st-radius)',
                  backgroundColor: voted ? 'var(--st-accent-soft)' : 'var(--st-surface-inset)',
                  border: voted ? '1px solid var(--st-border-strong)' : '1px solid var(--st-border)',
                  color: voted ? 'var(--st-accent-text)' : 'var(--st-text)',
                }}
              >
                <ArrowUp className="w-4 h-4" />
                <span className="text-sm font-bold">{req.votes}</span>
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium" style={{ color: 'var(--st-accent-text)' }}>
                    {req.status}
                  </span>
                  <span>·</span>
                  <span>{req.category}</span>
                  <span>·</span>
                  <span>by {req.author}</span>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {req.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{req.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


