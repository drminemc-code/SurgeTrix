import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Eye,
  EyeOff,
  FileArchive,
  Globe,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { CommunityRequest, ResourceItem, ServerListing } from '../data/catalog';
import {
  OWNER_EMAIL,
  PLUGIN_CATEGORIES,
  PLUGIN_PLATFORMS,
  PluginCategory,
  PluginListing,
  formatBytes,
} from '../utils/pluginMarketplace';
import {
  createAndPublishPluginClient,
  deleteOwnerDomainClient,
  deletePluginClient,
  deletePluginReviewClient,
  listOwnerDomainsClient,
  pushPluginVersionClient,
  replyPluginReviewClient,
  updatePluginMetadataClient,
} from '../utils/pluginClient';
import {
  OwnerDomainEntry,
  canAccessOwnerDashboard,
  filterModerationDomains,
  filterModerationRequests,
  filterModerationResources,
  filterModerationServers,
  flattenPluginReviews,
  getOwnerAccessStatus,
  getOwnerDashboardSummary,
  getPendingPlugins,
  hasExternalLinkOrKeywordFlag,
} from '../utils/ownerModeration';
import { AuthUserState } from './AuthPage';

interface OwnerDashboardProps {
  user: AuthUserState | null;
  plugins: PluginListing[];
  onRefreshPlugins: () => Promise<void>;
  servers: ServerListing[];
  onRemoveServer: (id: string) => void;
  onUpdateServer: (id: string, patch: Partial<ServerListing>) => void;
  onRefreshServerStatus?: (id: string) => Promise<void>;
  communityRequests: CommunityRequest[];
  onUpdateCommunityRequest: (id: string, patch: Partial<CommunityRequest>) => void;
  onDeleteCommunityRequest: (id: string) => void;
  resources: ResourceItem[];
  onDeleteResource: (id: string) => void;
  onNavigate: (path: string) => void;
}

type DashboardTab = 'approvals' | 'moderation' | 'plugins' | 'upload';
type ModerationFilter = 'all' | 'requests' | 'reviews' | 'servers' | 'domains' | 'resources';

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  user,
  plugins,
  onRefreshPlugins,
  servers,
  onRemoveServer,
  onUpdateServer,
  onRefreshServerStatus,
  communityRequests,
  onUpdateCommunityRequest,
  onDeleteCommunityRequest,
  resources,
  onDeleteResource,
  onNavigate,
}) => {
  const isAuthorizedOwner = canAccessOwnerDashboard(user);
  const accessStatus = getOwnerAccessStatus(user);

  const [activeTab, setActiveTab] = useState<DashboardTab>('approvals');
  const [moderationFilter, setModerationFilter] = useState<ModerationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload new plugin state
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [category, setCategory] = useState<PluginCategory>('Administration');
  const [priceLabel, setPriceLabel] = useState('Free');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [mcVersions, setMcVersions] = useState('1.20.4, 1.21.1, 1.21.4');
  const [platforms, setPlatforms] = useState<string[]>(['Paper', 'Purpur']);
  const [supportUrl, setSupportUrl] = useState('');
  const [releaseTitle, setReleaseTitle] = useState('');
  const [changelog, setChangelog] = useState('Initial verified release.');
  const [featured, setFeatured] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Manage existing plugin state
  const [editingPluginId, setEditingPluginId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<PluginCategory>('Administration');
  const [editPrice, setEditPrice] = useState('Free');
  const [editMcVersions, setEditMcVersions] = useState('');
  const [editSupportUrl, setEditSupportUrl] = useState('');

  const [updatePluginId, setUpdatePluginId] = useState<string | null>(null);
  const [nextVersion, setNextVersion] = useState('');
  const [nextTitle, setNextTitle] = useState('');
  const [nextChangelog, setNextChangelog] = useState('');
  const [nextFile, setNextFile] = useState<File | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [panelMsg, setPanelMsg] = useState('');
  const [panelErr, setPanelErr] = useState('');

  // Review replies
  const [replyKey, setReplyKey] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Registered domains
  const [ownerDomains, setOwnerDomains] = useState<OwnerDomainEntry[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);

  const loadOwnerDomains = async () => {
    if (!isAuthorizedOwner) return;
    setDomainsLoading(true);
    try {
      const list = await listOwnerDomainsClient();
      setOwnerDomains(list);
    } finally {
      setDomainsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorizedOwner) {
      void loadOwnerDomains();
    } else {
      setOwnerDomains([]);
    }
  }, [isAuthorizedOwner]);

  if (!isAuthorizedOwner) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-14" data-testid="owner-dashboard-restricted">
        <div className="st-card p-8 text-center space-y-4">
          <div
            className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center"
            style={{
              backgroundColor: 'var(--st-accent-soft)',
              color: 'var(--st-accent-text)',
              border: '1px solid var(--st-border-strong)',
            }}
          >
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--st-text)' }}>
            Owner Dashboard Restricted
          </h1>
          <p className="text-xs leading-relaxed max-w-md mx-auto" style={{ color: 'var(--st-text-muted)' }}>
            Administrative moderation, pending plugin approvals, and catalog controls are locked strictly to the verified Owner account (<span className="font-mono">{OWNER_EMAIL}</span>).
          </p>
          {accessStatus === 'unauthenticated' ? (
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="px-4 py-2.5 st-btn-primary text-xs font-semibold cursor-pointer"
            >
              Sign In as Owner
            </button>
          ) : accessStatus === 'unverified_owner' ? (
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="px-4 py-2.5 st-btn-primary text-xs font-semibold cursor-pointer"
            >
              Verify Email to Unlock Owner Dashboard
            </button>
          ) : (
            <div className="space-y-3">
              <div className="text-[11px] font-mono" style={{ color: 'var(--st-text-muted)' }}>
                Signed in as {user?.email} · Standard Member (Not {OWNER_EMAIL})
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/dashboard')}
                className="px-4 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
              >
                Return to Member Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const summary = getOwnerDashboardSummary({
    plugins,
    communityRequests,
    servers,
    domains: ownerDomains,
    resources,
  });

  const pendingPlugins = getPendingPlugins(plugins, searchQuery);
  const hiddenDraftPlugins = plugins.filter(
    (p) =>
      p.status === 'hidden' &&
      (!searchQuery.trim() ||
        `${p.name} ${p.tagline} ${p.authorName}`
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase()))
  );
  const filteredCatalogPlugins = plugins.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return `${p.name} ${p.tagline} ${p.category} ${p.authorName} ${p.status}`
      .toLowerCase()
      .includes(q);
  });

  const filteredRequests = filterModerationRequests(communityRequests, searchQuery);
  const filteredReviews = flattenPluginReviews(plugins, searchQuery);
  const filteredServers = filterModerationServers(servers, searchQuery);
  const filteredDomains = filterModerationDomains(ownerDomains, searchQuery);
  const filteredResources = filterModerationResources(resources, searchQuery);

  const totalDownloads = plugins.reduce((acc, p) => acc + p.downloads, 0);

  const togglePlatform = (plat: string) => {
    setPlatforms((prev) =>
      prev.includes(plat) ? (prev.length > 1 ? prev.filter((p) => p !== plat) : prev) : [...prev, plat]
    );
  };

  const handleSetPluginStatus = async (
    pl: PluginListing,
    nextStatus: 'published' | 'pending' | 'hidden',
    actionLabel: string
  ) => {
    setActionBusyId(pl.id);
    setPanelMsg('');
    setPanelErr('');
    try {
      const result = await updatePluginMetadataClient(pl, { status: nextStatus });
      if (!result.ok) {
        setPanelErr(result.error);
        return;
      }
      await onRefreshPlugins();
      setPanelMsg(`${actionLabel} "${pl.name}".`);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeletePlugin = async (pl: PluginListing, msgPrefix = 'Deleted') => {
    setActionBusyId(pl.id);
    setPanelMsg('');
    setPanelErr('');
    try {
      const result = await deletePluginClient(pl.id);
      if (!result.ok) {
        setPanelErr(result.error);
        return;
      }
      await onRefreshPlugins();
      setPanelMsg(`${msgPrefix} "${pl.name}".`);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleToggleFeatured = async (pl: PluginListing) => {
    setActionBusyId(pl.id);
    setPanelMsg('');
    setPanelErr('');
    try {
      const result = await updatePluginMetadataClient(pl, { featured: !pl.featured });
      if (!result.ok) {
        setPanelErr(result.error);
        return;
      }
      await onRefreshPlugins();
      setPanelMsg(
        !pl.featured
          ? `Featured "${pl.name}" in the Marketplace.`
          : `Removed featured status from "${pl.name}".`
      );
    } finally {
      setActionBusyId(null);
    }
  };

  const handleSavePluginEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = plugins.find((p) => p.id === editingPluginId);
    if (!target) return;
    setActionBusyId(target.id);
    setPanelMsg('');
    setPanelErr('');
    try {
      const result = await updatePluginMetadataClient(target, {
        name: editName.trim(),
        tagline: editTagline.trim(),
        description: editDescription.trim(),
        category: editCategory,
        priceLabel: editPrice.trim() || 'Free',
        mcVersions: editMcVersions,
        supportUrl: editSupportUrl.trim(),
      });
      if (!result.ok) {
        setPanelErr(result.error);
        return;
      }
      await onRefreshPlugins();
      setEditingPluginId(null);
      setPanelMsg(`Saved metadata updates for "${editName.trim()}".`);
    } finally {
      setActionBusyId(null);
    }
  };

  const handlePushVersionUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = plugins.find((p) => p.id === updatePluginId);
    if (!target || !nextFile) {
      setPanelErr('Select a new .jar or .zip archive for the version update.');
      return;
    }
    setActionBusyId(target.id);
    setPanelMsg('');
    setPanelErr('');
    try {
      const result = await pushPluginVersionClient(target, {
        version: nextVersion.trim(),
        title: nextTitle.trim(),
        changelog: nextChangelog.trim(),
        file: nextFile,
      });
      if (!result.ok) {
        setPanelErr(result.error);
        return;
      }
      await onRefreshPlugins();
      setUpdatePluginId(null);
      setNextVersion('');
      setNextTitle('');
      setNextChangelog('');
      setNextFile(null);
      setPanelMsg(`Published v${nextVersion.trim()} for "${target.name}".`);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleUploadNewPlugin = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    if (!selectedFile) {
      setUploadError('Select a .jar or .zip plugin file to upload.');
      return;
    }
    const lowerFile = selectedFile.name.toLowerCase();
    if (!lowerFile.endsWith('.jar') && !lowerFile.endsWith('.zip')) {
      setUploadError('Only .jar and .zip plugin archive files are allowed.');
      return;
    }

    setUploading(true);
    try {
      const result = await createAndPublishPluginClient({
        name: name.trim(),
        version: version.trim(),
        category,
        priceLabel: priceLabel.trim() || 'Free',
        tagline: tagline.trim(),
        description: description.trim(),
        mcVersions,
        platforms,
        supportUrl: supportUrl.trim(),
        releaseTitle: releaseTitle.trim(),
        changelog: changelog.trim(),
        featured,
        file: selectedFile,
      });

      if (!result.ok) {
        setUploadError(result.error);
        return;
      }

      await onRefreshPlugins();
      setUploadSuccess(`Uploaded & published "${name.trim()}" (${selectedFile.name}).`);
      setName('');
      setTagline('');
      setDescription('');
      setSupportUrl('');
      setReleaseTitle('');
      setSelectedFile(null);
      setFeatured(false);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Unexpected error while uploading plugin.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDomain = async (handle: string) => {
    setActionBusyId(`dom-${handle}`);
    setPanelMsg('');
    setPanelErr('');
    try {
      const res = await deleteOwnerDomainClient(handle);
      if (res.ok) {
        setOwnerDomains((prev) => prev.filter((d) => d.handle !== handle));
        setPanelMsg(`Removed custom domain "${handle}".`);
      } else {
        setPanelErr(res.error);
      }
    } finally {
      setActionBusyId(null);
    }
  };

  const showSection = (key: Exclude<ModerationFilter, 'all'>) =>
    moderationFilter === 'all' || moderationFilter === key;

  return (
    <div className="space-y-6" data-testid="owner-dashboard">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--st-accent-text)' }}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Owner Dashboard · {OWNER_EMAIL}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: 'var(--st-text)' }}>
            Moderation &amp; Plugin Governance
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--st-text-muted)' }}>
            Approve pending plugin submissions, remove inappropriate community content, and manage SurgeTrix releases.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/plugin')}
          className="px-4 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
        >
          View Plugins Catalog →
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
        <div className="st-card p-4">
          <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
            Pending Approvals
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{
              color:
                summary.pendingPluginsCount > 0 ? '#f59e0b' : 'var(--st-text)',
            }}
          >
            {summary.pendingPluginsCount}
          </div>
        </div>
        <div className="st-card p-4">
          <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
            Published Plugins
          </div>
          <div className="text-xl font-bold mt-1" style={{ color: 'var(--st-accent-text)' }}>
            {summary.publishedPluginsCount}
          </div>
        </div>
        <div className="st-card p-4">
          <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
            Moderation Items
          </div>
          <div className="text-xl font-bold mt-1" style={{ color: 'var(--st-text)' }}>
            {summary.totalModerationItems}
          </div>
        </div>
        <div className="st-card p-4">
          <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
            Plugin Downloads
          </div>
          <div className="text-xl font-bold mt-1" style={{ color: 'var(--st-text)' }}>
            {totalDownloads.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Primary Tab Bar + Search */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3"
        style={{ borderColor: 'var(--st-border)' }}
      >
        <div role="tablist" aria-label="Owner dashboard sections" className="flex flex-wrap gap-2">
          {(
            [
              {
                id: 'approvals',
                label: `Pending Plugins (${summary.pendingPluginsCount})`,
                icon: ClipboardCheck,
              },
              {
                id: 'moderation',
                label: `Community Content (${summary.totalModerationItems})`,
                icon: ShieldAlert,
              },
              {
                id: 'plugins',
                label: `Manage Catalog (${plugins.length})`,
                icon: FileArchive,
              },
              {
                id: 'upload',
                label: 'Upload Plugin',
                icon: Upload,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                style={{
                  backgroundColor: active ? 'var(--st-accent-soft)' : 'var(--st-surface-inset)',
                  border: active
                    ? '1px solid var(--st-border-strong)'
                    : '1px solid var(--st-border)',
                  color: active ? 'var(--st-accent-text)' : 'var(--st-text-secondary)',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab !== 'upload' && (
          <div className="relative w-full md:w-64 shrink-0">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--st-text-muted)' }}
            />
            <input
              type="search"
              aria-label="Filter dashboard records"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name, author, keyword…"
              className="w-full pl-9 pr-3 py-1.5 st-surface-inset text-xs focus:outline-none"
              style={{ color: 'var(--st-text)' }}
            />
          </div>
        )}
      </div>

      {panelMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-500 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{panelMsg}</span>
        </div>
      )}
      {panelErr && (
        <div role="alert" className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
          {panelErr}
        </div>
      )}

      {/* TAB 1: PENDING PLUGIN APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          {pendingPlugins.length === 0 ? (
            <div className="st-card p-10 text-center space-y-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                No pending plugin submissions
              </p>
              <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--st-text-muted)' }}>
                When verified members submit new plugin archives from the Plugins page, they appear here for inspection and approval before going live.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPlugins.map((pl) => {
                const busy = actionBusyId === pl.id;
                const flagged = hasExternalLinkOrKeywordFlag(
                  `${pl.name} ${pl.tagline} ${pl.description} ${pl.supportUrl}`
                );
                return (
                  <div key={pl.id} className="st-card p-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-base font-bold" style={{ color: 'var(--st-text)' }}>
                            {pl.name}
                          </span>
                          <span className="font-mono" style={{ color: 'var(--st-success)' }}>
                            v{pl.currentVersion}
                          </span>
                          <span className="text-amber-400 font-semibold">Pending Approval</span>
                          {flagged && (
                            <span className="text-rose-400 font-semibold">
                              · External Link / Keyword Flag
                            </span>
                          )}
                        </div>
                        <div className="text-xs tabular-nums" style={{ color: 'var(--st-text-muted)' }}>
                          Submitted by <strong style={{ color: 'var(--st-text-secondary)' }}>{pl.authorName}</strong>
                          {' · '}
                          {pl.category}
                          {' · '}
                          {pl.platforms.join(', ')}
                          {' · '}
                          {pl.fileName || 'No file'} ({formatBytes(pl.fileSize)})
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void handleSetPluginStatus(pl, 'published', 'Approved & published')
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve &amp; Publish</span>
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void handleSetPluginStatus(pl, 'hidden', 'Moved to hidden draft:')
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 st-btn-secondary text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Keep Hidden</span>
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleDeletePlugin(pl, 'Rejected & deleted')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 st-btn-secondary text-xs font-semibold text-rose-500 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Reject &amp; Delete</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed" style={{ color: 'var(--st-text-secondary)' }}>
                      <strong>{pl.tagline}</strong> — {pl.description}
                    </p>
                    {pl.sha256 && (
                      <div className="text-[11px] font-mono break-all" style={{ color: 'var(--st-text-muted)' }}>
                        SHA-256: {pl.sha256}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {hiddenDraftPlugins.length > 0 && (
            <div className="st-card p-5 space-y-3">
              <h2 className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                Hidden Drafts ({hiddenDraftPlugins.length})
              </h2>
              <div className="divide-y" style={{ borderColor: 'var(--st-border)' }}>
                {hiddenDraftPlugins.map((pl) => (
                  <div key={pl.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                        {pl.name}{' '}
                        <span className="text-xs font-mono" style={{ color: 'var(--st-text-muted)' }}>
                          v{pl.currentVersion} · by {pl.authorName}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                        {pl.tagline}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionBusyId === pl.id}
                        onClick={() =>
                          void handleSetPluginStatus(pl, 'published', 'Published draft')
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 st-btn-secondary text-xs font-semibold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Publish</span>
                      </button>
                      <button
                        type="button"
                        disabled={actionBusyId === pl.id}
                        onClick={() => void handleDeletePlugin(pl)}
                        className="p-1.5 st-btn-secondary text-rose-500 cursor-pointer"
                        aria-label={`Delete ${pl.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMMUNITY CONTENT MODERATION */}
      {activeTab === 'moderation' && (
        <div className="space-y-5">
          {/* Sub-filter controls */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter community content types">
            {(
              [
                { id: 'all', label: `All (${summary.totalModerationItems})` },
                { id: 'requests', label: `Requests (${communityRequests.length})` },
                { id: 'reviews', label: `Reviews (${summary.totalReviewsCount})` },
                { id: 'servers', label: `Servers (${servers.length})` },
                { id: 'domains', label: `Domains (${ownerDomains.length})` },
                { id: 'resources', label: `Mods & Packs (${resources.length})` },
              ] as const
            ).map((chip) => {
              const active = moderationFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setModerationFilter(chip.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors tabular-nums"
                  style={{
                    backgroundColor: active ? 'var(--st-accent-soft)' : 'var(--st-surface-inset)',
                    border: active
                      ? '1px solid var(--st-border-strong)'
                      : '1px solid var(--st-border)',
                    color: active ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Community Requests */}
          {showSection('requests') && (
            <section className="st-card p-5 space-y-3">
              <h2 className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                Community Tool Requests ({filteredRequests.length})
              </h2>
              {filteredRequests.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                  No community requests match your filter.
                </p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--st-border)' }}>
                  {filteredRequests.map((req) => {
                    const flagged = hasExternalLinkOrKeywordFlag(`${req.title} ${req.description}`);
                    return (
                      <div key={req.id} className="py-3.5 flex flex-wrap items-start justify-between gap-4">
                        <div className="max-w-2xl space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                            <span>{req.title}</span>
                            {flagged && (
                              <span className="text-xs text-rose-400 font-semibold">
                                · Link / Keyword Flag
                              </span>
                            )}
                          </div>
                          <p className="text-xs" style={{ color: 'var(--st-text-secondary)' }}>
                            {req.description}
                          </p>
                          <div className="text-[11px] tabular-nums" style={{ color: 'var(--st-text-muted)' }}>
                            {req.category} · by {req.author} · {req.votes} votes · {req.createdAt}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            aria-label={`Status for ${req.title}`}
                            value={req.status}
                            onChange={(e) =>
                              onUpdateCommunityRequest(req.id, {
                                status: e.target.value as CommunityRequest['status'],
                              })
                            }
                            className="px-2.5 py-1.5 st-surface-inset text-xs cursor-pointer"
                            style={{ color: 'var(--st-text)' }}
                          >
                            <option value="Under Review">Under Review</option>
                            <option value="Planned">Planned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Shipped">Shipped</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteCommunityRequest(req.id);
                              setPanelMsg(`Removed community request "${req.title}".`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 st-btn-secondary text-xs text-rose-500 cursor-pointer"
                            aria-label={`Delete request ${req.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Plugin Reviews */}
          {showSection('reviews') && (
            <section className="st-card p-5 space-y-3">
              <h2 className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                Plugin Reviews ({filteredReviews.length})
              </h2>
              {filteredReviews.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                  No plugin reviews match your filter.
                </p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--st-border)' }}>
                  {filteredReviews.map(({ pluginId, pluginName, review }) => {
                    const rk = `${pluginId}:${review.id}`;
                    const flagged = hasExternalLinkOrKeywordFlag(`${review.title} ${review.comment}`);
                    return (
                      <div key={rk} className="py-3.5 space-y-2.5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-0.5 max-w-2xl">
                            <div className="text-xs font-semibold tabular-nums" style={{ color: 'var(--st-accent-text)' }}>
                              {pluginName} · {review.rating}/5 ★
                              {flagged && (
                                <span className="text-rose-400 ml-1.5">· Link / Keyword Flag</span>
                              )}
                            </div>
                            <div className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                              {review.title}
                            </div>
                            <div className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                              by {review.authorName} · Tested {review.testedVersion} · {new Date(review.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyKey(replyKey === rk ? null : rk);
                                setReplyText(review.ownerReply || '');
                              }}
                              className="px-2.5 py-1.5 st-btn-secondary text-xs cursor-pointer"
                            >
                              {review.ownerReply ? 'Edit Reply' : 'Reply'}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const result = await deletePluginReviewClient(pluginId, review.id);
                                if (result.ok) {
                                  await onRefreshPlugins();
                                  setPanelMsg(`Deleted review by ${review.authorName}.`);
                                } else {
                                  setPanelErr(result.error);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 st-btn-secondary text-xs text-rose-500 cursor-pointer"
                              aria-label={`Delete review ${review.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-xs" style={{ color: 'var(--st-text-secondary)' }}>
                          {review.comment}
                        </p>

                        {review.ownerReply && replyKey !== rk && (
                          <p className="text-xs italic" style={{ color: 'var(--st-accent-text)' }}>
                            Owner reply: {review.ownerReply}
                          </p>
                        )}

                        {replyKey === rk && (
                          <div className="pt-1 space-y-2">
                            <textarea
                              rows={2}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Official Owner response..."
                              className="w-full p-2.5 st-surface-inset text-xs"
                              style={{ color: 'var(--st-text)' }}
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  const targetPlugin = plugins.find((p) => p.id === pluginId);
                                  if (!targetPlugin) return;
                                  const result = await replyPluginReviewClient(
                                    targetPlugin,
                                    review.id,
                                    replyText.trim()
                                  );
                                  if (result.ok) {
                                    await onRefreshPlugins();
                                    setReplyKey(null);
                                    setPanelMsg('Saved Owner reply.');
                                  } else {
                                    setPanelErr(result.error);
                                  }
                                }}
                                className="px-3 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer"
                              >
                                Save Reply
                              </button>
                              <button
                                type="button"
                                onClick={() => setReplyKey(null)}
                                className="px-3 py-1.5 st-btn-secondary text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Listed Servers */}
          {showSection('servers') && (
            <section className="st-card p-5 space-y-3">
              <h2 className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                Listed Servers ({filteredServers.length})
              </h2>
              {filteredServers.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                  No listed servers match your filter.
                </p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--st-border)' }}>
                  {filteredServers.map((srv) => (
                    <div key={srv.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
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
                            onClick={() => void onRefreshServerStatus(srv.id)}
                            className="px-2.5 py-1.5 st-btn-secondary text-xs cursor-pointer"
                          >
                            Ping
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateServer(srv.id, {
                              status: srv.status === 'Online' ? 'Offline' : 'Online',
                            })
                          }
                          className="px-2.5 py-1.5 st-btn-secondary text-xs cursor-pointer"
                        >
                          {srv.status}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onRemoveServer(srv.id);
                            setPanelMsg(`Removed server listing "${srv.name}".`);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 st-btn-secondary text-xs text-rose-500 cursor-pointer"
                          aria-label={`Delete server ${srv.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Custom Server Domains */}
          {showSection('domains') && (
            <section className="st-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold inline-flex items-center gap-2" style={{ color: 'var(--st-text)' }}>
                  <Globe className="w-4 h-4" style={{ color: 'var(--st-accent-text)' }} />
                  <span>Registered Server Domains ({filteredDomains.length})</span>
                </h2>
                <button
                  type="button"
                  onClick={() => void loadOwnerDomains()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 st-btn-secondary text-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${domainsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
              {filteredDomains.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                  No custom server domains found.
                </p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--st-border)' }}>
                  {filteredDomains.map((dom) => (
                    <div key={dom.handle} className="py-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                          {dom.serverName}
                        </div>
                        <div className="text-xs font-mono" style={{ color: 'var(--st-accent-text)' }}>
                          {dom.connectAddress || dom.workingDomain || `${dom.handle}.duckdns.org`} →{' '}
                          {dom.targetHost}:{dom.targetPort}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={actionBusyId === `dom-${dom.handle}`}
                        onClick={() => void handleDeleteDomain(dom.handle)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 st-btn-secondary text-xs text-rose-500 cursor-pointer disabled:opacity-50"
                        aria-label={`Delete domain ${dom.handle}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Community Mods / Apps / Resource Packs */}
          {showSection('resources') && (
            <section className="st-card p-5 space-y-3">
              <h2 className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                Mods, Apps &amp; Resource Packs ({filteredResources.length})
              </h2>
              {filteredResources.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                  No resources match your filter.
                </p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--st-border)' }}>
                  {filteredResources.map((res) => (
                    <div key={res.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="max-w-2xl">
                        <div className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                          {res.name}{' '}
                          <span className="text-xs font-normal" style={{ color: 'var(--st-text-muted)' }}>
                            · {res.kind} · v{res.version} · by {res.author}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--st-text-muted)' }}>
                          {res.summary}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteResource(res.id);
                          setPanelMsg(`Removed resource "${res.name}".`);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 st-btn-secondary text-xs text-rose-500 cursor-pointer"
                        aria-label={`Delete resource ${res.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* TAB 3: FULL PLUGIN CATALOG MANAGEMENT */}
      {activeTab === 'plugins' && (
        <div className="space-y-4">
          {filteredCatalogPlugins.length === 0 ? (
            <div className="st-card p-8 text-center space-y-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                {plugins.length === 0 ? 'No plugins uploaded yet' : 'No matching plugins found'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="inline-flex items-center gap-1.5 px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Plugin</span>
              </button>
            </div>
          ) : (
            filteredCatalogPlugins.map((pl) => {
              const busy = actionBusyId === pl.id;
              return (
                <div key={pl.id} className="st-card p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => onNavigate(`/plugin/${pl.slug}`)}
                          className="text-base font-bold hover:underline cursor-pointer"
                          style={{ color: 'var(--st-text)' }}
                        >
                          {pl.name}
                        </button>
                        <span className="font-mono" style={{ color: 'var(--st-success)' }}>
                          v{pl.currentVersion}
                        </span>
                        <span
                          className={`font-semibold ${
                            pl.status === 'published'
                              ? 'text-emerald-400'
                              : pl.status === 'pending'
                              ? 'text-amber-400'
                              : ''
                          }`}
                          style={
                            pl.status === 'hidden' ? { color: 'var(--st-text-muted)' } : undefined
                          }
                        >
                          ·{' '}
                          {pl.status === 'published'
                            ? 'Published'
                            : pl.status === 'pending'
                            ? 'Pending Approval'
                            : 'Hidden Draft'}
                        </span>
                        {pl.featured && (
                          <span className="font-semibold text-amber-400">· Featured</span>
                        )}
                      </div>
                      <p className="text-xs mt-1 tabular-nums" style={{ color: 'var(--st-text-muted)' }}>
                        by {pl.authorName} · {pl.fileName || 'No archive'} ({formatBytes(pl.fileSize)}) ·{' '}
                        {pl.downloads.toLocaleString()} downloads · {pl.reviewsCount} reviews
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setUpdatePluginId(updatePluginId === pl.id ? null : pl.id);
                          setNextVersion('');
                          setNextTitle('');
                          setNextChangelog('');
                          setNextFile(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 st-btn-secondary text-xs font-semibold cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Push Update</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editingPluginId === pl.id) {
                            setEditingPluginId(null);
                          } else {
                            setEditingPluginId(pl.id);
                            setEditName(pl.name);
                            setEditTagline(pl.tagline);
                            setEditDescription(pl.description);
                            setEditCategory(pl.category);
                            setEditPrice(pl.priceLabel);
                            setEditMcVersions(pl.mcVersions.join(', '));
                            setEditSupportUrl(pl.supportUrl);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 st-btn-secondary text-xs font-semibold cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleToggleFeatured(pl)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 st-btn-secondary text-xs font-semibold cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{pl.featured ? 'Unfeature' : 'Feature'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void handleSetPluginStatus(
                            pl,
                            pl.status === 'published' ? 'hidden' : 'published',
                            pl.status === 'published' ? 'Hid' : 'Published'
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 st-btn-secondary text-xs font-semibold cursor-pointer"
                      >
                        {pl.status === 'published' ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Hide</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Publish</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDeletePlugin(pl)}
                        className="p-1.5 st-btn-secondary text-rose-500 cursor-pointer"
                        aria-label={`Delete ${pl.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {editingPluginId === pl.id && (
                    <form
                      onSubmit={(e) => void handleSavePluginEdit(e)}
                      className="pt-4 border-t space-y-3"
                      style={{ borderColor: 'var(--st-border)' }}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Plugin Name"
                          className="px-3 py-2 st-surface-inset text-xs"
                          style={{ color: 'var(--st-text)' }}
                        />
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as PluginCategory)}
                          className="px-3 py-2 st-surface-inset text-xs"
                          style={{ color: 'var(--st-text)' }}
                        >
                          {PLUGIN_CATEGORIES.filter((c) => c !== 'All Categories').map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          placeholder="Price Label"
                          className="px-3 py-2 st-surface-inset text-xs"
                          style={{ color: 'var(--st-text)' }}
                        />
                      </div>
                      <input
                        type="text"
                        required
                        value={editTagline}
                        onChange={(e) => setEditTagline(e.target.value)}
                        placeholder="Tagline"
                        className="w-full px-3 py-2 st-surface-inset text-xs"
                        style={{ color: 'var(--st-text)' }}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={editMcVersions}
                          onChange={(e) => setEditMcVersions(e.target.value)}
                          placeholder="MC Versions (comma separated)"
                          className="px-3 py-2 st-surface-inset text-xs font-mono"
                          style={{ color: 'var(--st-text)' }}
                        />
                        <input
                          type="url"
                          value={editSupportUrl}
                          onChange={(e) => setEditSupportUrl(e.target.value)}
                          placeholder="Support URL"
                          className="px-3 py-2 st-surface-inset text-xs"
                          style={{ color: 'var(--st-text)' }}
                        />
                      </div>
                      <textarea
                        rows={4}
                        required
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full p-3 st-surface-inset text-xs"
                        style={{ color: 'var(--st-text)' }}
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={busy}
                          className="px-3.5 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPluginId(null)}
                          className="px-3.5 py-1.5 st-btn-secondary text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {updatePluginId === pl.id && (
                    <form
                      onSubmit={(e) => void handlePushVersionUpdate(e)}
                      className="pt-4 border-t space-y-3"
                      style={{ borderColor: 'var(--st-border)' }}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          value={nextVersion}
                          onChange={(e) => setNextVersion(e.target.value)}
                          placeholder="New Version (e.g. 1.1.0)"
                          className="px-3 py-2 st-surface-inset font-mono text-xs"
                          style={{ color: 'var(--st-text)' }}
                        />
                        <input
                          type="text"
                          value={nextTitle}
                          onChange={(e) => setNextTitle(e.target.value)}
                          placeholder="Update Title"
                          className="px-3 py-2 st-surface-inset text-xs"
                          style={{ color: 'var(--st-text)' }}
                        />
                      </div>
                      <textarea
                        rows={3}
                        required
                        value={nextChangelog}
                        onChange={(e) => setNextChangelog(e.target.value)}
                        placeholder="What changed in this release?"
                        className="w-full p-3 st-surface-inset text-xs"
                        style={{ color: 'var(--st-text)' }}
                      />
                      <input
                        type="file"
                        accept=".jar,.zip"
                        required
                        onChange={(e) => setNextFile(e.target.files?.[0] || null)}
                        className="block text-xs"
                        style={{ color: 'var(--st-text-secondary)' }}
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={busy}
                          className="px-3.5 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer"
                        >
                          Upload Update
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpdatePluginId(null)}
                          className="px-3.5 py-1.5 st-btn-secondary text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 4: OWNER DIRECT PLUGIN UPLOAD */}
      {activeTab === 'upload' && (
        <form onSubmit={(e) => void handleUploadNewPlugin(e)} className="st-card p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--st-text)' }}>
              Upload New Plugin Release
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--st-text-muted)' }}>
              Publish a BuiltByBit-style resource listing directly with a downloadable .jar or .zip archive.
            </p>
          </div>

          {uploadError && (
            <div role="alert" className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
              {uploadError}
            </div>
          )}
          {uploadSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="own-pl-name" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                Plugin Name
              </label>
              <input
                id="own-pl-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SurgeGuard AC"
                className="w-full px-3 py-2 st-surface-inset text-sm"
                style={{ color: 'var(--st-text)' }}
              />
            </div>

            <div>
              <label htmlFor="own-pl-ver" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                Version
              </label>
              <input
                id="own-pl-ver"
                type="text"
                required
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
                className="w-full px-3 py-2 st-surface-inset font-mono text-sm"
                style={{ color: 'var(--st-text)' }}
              />
            </div>

            <div>
              <label htmlFor="own-pl-price" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                Price / Tag
              </label>
              <input
                id="own-pl-price"
                type="text"
                value={priceLabel}
                onChange={(e) => setPriceLabel(e.target.value)}
                placeholder="Free"
                className="w-full px-3 py-2 st-surface-inset text-sm"
                style={{ color: 'var(--st-text)' }}
              />
            </div>

            <div>
              <label htmlFor="own-pl-cat" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                Category
              </label>
              <select
                id="own-pl-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as PluginCategory)}
                className="w-full px-3 py-2 st-surface-inset text-sm"
                style={{ color: 'var(--st-text)' }}
              >
                {PLUGIN_CATEGORIES.filter((c) => c !== 'All Categories').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="own-pl-mc" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                Minecraft Versions
              </label>
              <input
                id="own-pl-mc"
                type="text"
                value={mcVersions}
                onChange={(e) => setMcVersions(e.target.value)}
                placeholder="1.20.4, 1.21.4"
                className="w-full px-3 py-2 st-surface-inset font-mono text-sm"
                style={{ color: 'var(--st-text)' }}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="own-pl-url" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                Support / Discord / Docs URL (optional)
              </label>
              <input
                id="own-pl-url"
                type="url"
                value={supportUrl}
                onChange={(e) => setSupportUrl(e.target.value)}
                placeholder="https://discord.gg/..."
                className="w-full px-3 py-2 st-surface-inset text-sm"
                style={{ color: 'var(--st-text)' }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="own-pl-tagline" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
              Tagline (short one-line summary)
            </label>
            <input
              id="own-pl-tagline"
              type="text"
              required
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="High-TPS anti-cheat and packet validation for Paper & Folia servers."
              className="w-full px-3 py-2 st-surface-inset text-sm"
              style={{ color: 'var(--st-text)' }}
            />
          </div>

          <div>
            <span className="block text-xs font-medium mb-2" style={{ color: 'var(--st-text-secondary)' }}>
              Supported Server Software
            </span>
            <div className="flex flex-wrap gap-2">
              {PLUGIN_PLATFORMS.map((plat) => {
                const active = platforms.includes(plat);
                return (
                  <button
                    key={plat}
                    type="button"
                    aria-pressed={active}
                    onClick={() => togglePlatform(plat)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    style={{
                      backgroundColor: active ? 'var(--st-accent-soft)' : 'var(--st-surface-inset)',
                      border: active
                        ? '1px solid var(--st-border-strong)'
                        : '1px solid var(--st-border)',
                      color: active ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
                    }}
                  >
                    {plat}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="own-pl-desc" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
              Full BuiltByBit Overview (Features, Commands, Permissions)
            </label>
            <textarea
              id="own-pl-desc"
              rows={5}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe features, installation instructions, commands, permissions, and configuration options..."
              className="w-full p-3 st-surface-inset text-sm"
              style={{ color: 'var(--st-text)' }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="own-pl-rel-title" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                Release Title (optional)
              </label>
              <input
                id="own-pl-rel-title"
                type="text"
                value={releaseTitle}
                onChange={(e) => setReleaseTitle(e.target.value)}
                placeholder={`Initial Release v${version || '1.0.0'}`}
                className="w-full px-3 py-2 st-surface-inset text-sm"
                style={{ color: 'var(--st-text)' }}
              />
            </div>
            <div>
              <label htmlFor="own-pl-changelog" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                Release Changelog
              </label>
              <input
                id="own-pl-changelog"
                type="text"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                className="w-full px-3 py-2 st-surface-inset text-sm"
                style={{ color: 'var(--st-text)' }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl st-surface-inset space-y-2">
            <label htmlFor="own-pl-file" className="block text-xs font-semibold" style={{ color: 'var(--st-text)' }}>
              Upload Plugin Archive (.jar or .zip, max 25 MB)
            </label>
            <input
              id="own-pl-file"
              type="file"
              accept=".jar,.zip"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:cursor-pointer"
              style={{ color: 'var(--st-text-secondary)' }}
            />
            {selectedFile && (
              <div className="text-xs font-mono" style={{ color: 'var(--st-success)' }}>
                Ready: {selectedFile.name} ({formatBytes(selectedFile.size)})
              </div>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer" style={{ color: 'var(--st-text-secondary)' }}>
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="w-4 h-4 accent-[var(--st-accent)]"
            />
            <span>Feature this plugin at the top of the Plugins Marketplace</span>
          </label>

          <div>
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 st-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{uploading ? 'Uploading & Publishing…' : 'Upload & Publish Plugin'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
