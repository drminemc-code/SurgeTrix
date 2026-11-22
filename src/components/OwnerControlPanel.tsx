import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  FileArchive,
  Globe,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { CommunityRequest, ServerListing } from '../data/catalog';
import { getFirebaseAuthHeaders } from '../firebase';
import {
  OWNER_EMAIL,
  PLUGIN_CATEGORIES,
  PLUGIN_PLATFORMS,
  PluginCategory,
  PluginListing,
  formatBytes,
  isOwnerUser,
} from '../utils/pluginMarketplace';
import { AuthUserState } from './AuthPage';

interface OwnerDomainRecord {
  handle: string;
  workingDomain?: string;
  connectAddress?: string;
  serverName: string;
  targetHost: string;
  targetPort: number;
  edition: 'Java' | 'Bedrock' | 'Crossplay';
  dnsStatus: string;
}

interface OwnerControlPanelProps {
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
  onNavigate: (path: string) => void;
}

type OwnerTab = 'upload' | 'plugins' | 'reviews' | 'infrastructure' | 'community';

export const OwnerControlPanel: React.FC<OwnerControlPanelProps> = ({
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
  onNavigate,
}) => {
  const isOwner = isOwnerUser(user);
  const [activeTab, setActiveTab] = useState<OwnerTab>('upload');

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

  // Manage existing plugin modals / inline panels
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
  const [actionBusy, setActionBusy] = useState(false);
  const [panelMsg, setPanelMsg] = useState('');

  // Owner reply to reviews
  const [replyKey, setReplyKey] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Owner server domains management
  const [ownerDomains, setOwnerDomains] = useState<OwnerDomainRecord[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);

  const loadOwnerDomains = async () => {
    if (!isOwner) return;
    setDomainsLoading(true);
    try {
      const headers = await getFirebaseAuthHeaders();
      const res = await fetch('/api/owner/domains', { headers });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        domains?: OwnerDomainRecord[];
      };
      if (res.ok && data.ok && Array.isArray(data.domains)) {
        setOwnerDomains(data.domains);
      }
    } finally {
      setDomainsLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      void loadOwnerDomains();
    }
  }, [isOwner]);

  if (!isOwner) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-14">
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
            Owner Control Panel Restricted
          </h1>
          <p className="text-xs leading-relaxed max-w-md mx-auto" style={{ color: 'var(--st-text-muted)' }}>
            Only the verified Owner account (<span className="font-mono">{OWNER_EMAIL}</span>) has permission to upload plugins, manage plugin releases, moderate reviews, and administer SurgeTrix infrastructure.
          </p>
          {!user ? (
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="px-4 py-2.5 st-btn-primary text-xs font-semibold cursor-pointer"
            >
              Sign In as Owner
            </button>
          ) : !user.emailVerified && user.email.toLowerCase() === OWNER_EMAIL ? (
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="px-4 py-2.5 st-btn-primary text-xs font-semibold cursor-pointer"
            >
              Verify Email to Unlock Owner Panel
            </button>
          ) : (
            <div className="text-[11px] font-mono" style={{ color: 'var(--st-text-muted)' }}>
              Signed in as {user.email} (Standard Member)
            </div>
          )}
        </div>
      </div>
    );
  }

  const togglePlatform = (plat: string) => {
    setPlatforms((prev) =>
      prev.includes(plat) ? (prev.length > 1 ? prev.filter((p) => p !== plat) : prev) : [...prev, plat]
    );
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
    let createdPluginId = '';
    try {
      const authHeaders = await getFirebaseAuthHeaders();
      const createRes = await fetch('/api/plugins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          name: name.trim(),
          version: version.trim(),
          category,
          priceLabel: priceLabel.trim() || 'Free',
          tagline: tagline.trim(),
          description: description.trim(),
          mcVersions,
          platforms,
          supportUrl: supportUrl.trim(),
          releaseTitle: releaseTitle.trim() || `Initial Release v${version.trim()}`,
          changelog: changelog.trim(),
          featured,
        }),
      });

      const createData = (await createRes.json().catch(() => ({}))) as {
        ok?: boolean;
        plugin?: PluginListing;
        versionId?: string;
        error?: string;
      };
      if (!createRes.ok || !createData.ok || !createData.plugin || !createData.versionId) {
        setUploadError(createData.error || 'Could not create plugin metadata.');
        return;
      }

      createdPluginId = createData.plugin.id;
      const bytes = await selectedFile.arrayBuffer();
      const fileRes = await fetch(
        `/api/plugins/${encodeURIComponent(createdPluginId)}/versions/${encodeURIComponent(createData.versionId)}/file`,
        {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/octet-stream',
            'X-File-Name': selectedFile.name,
          },
          body: bytes,
        }
      );

      const fileData = (await fileRes.json().catch(() => ({}))) as {
        ok?: boolean;
        plugin?: PluginListing;
        error?: string;
      };

      if (!fileRes.ok || !fileData.ok) {
        // Clean up orphan draft so plugins list stays clean
        await fetch(`/api/plugins/${encodeURIComponent(createdPluginId)}`, {
          method: 'DELETE',
          headers: authHeaders,
        }).catch(() => {});
        setUploadError(fileData.error || 'Plugin file upload failed.');
        return;
      }

      await onRefreshPlugins();
      setUploadSuccess(`Uploaded & published "${name.trim()}" (${selectedFile.name})!`);
      setName('');
      setTagline('');
      setDescription('');
      setSupportUrl('');
      setReleaseTitle('');
      setSelectedFile(null);
      setFeatured(false);
    } catch {
      if (createdPluginId) {
        const authHeaders = await getFirebaseAuthHeaders().catch(() => ({}));
        await fetch(`/api/plugins/${encodeURIComponent(createdPluginId)}`, {
          method: 'DELETE',
          headers: authHeaders,
        }).catch(() => {});
      }
      setUploadError('Network error while uploading plugin.');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleVisibility = async (pl: PluginListing) => {
    setActionBusy(true);
    setPanelMsg('');
    try {
      const headers = await getFirebaseAuthHeaders();
      const nextStatus = pl.status === 'published' ? 'hidden' : 'published';
      const res = await fetch(`/api/plugins/${encodeURIComponent(pl.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        await onRefreshPlugins();
        setPanelMsg(`Updated "${pl.name}" status to ${nextStatus}.`);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleFeatured = async (pl: PluginListing) => {
    setActionBusy(true);
    try {
      const headers = await getFirebaseAuthHeaders();
      const res = await fetch(`/api/plugins/${encodeURIComponent(pl.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ featured: !pl.featured }),
      });
      if (res.ok) {
        await onRefreshPlugins();
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleSavePluginEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPluginId) return;
    setActionBusy(true);
    setPanelMsg('');
    try {
      const headers = await getFirebaseAuthHeaders();
      const res = await fetch(`/api/plugins/${encodeURIComponent(editingPluginId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          name: editName.trim(),
          tagline: editTagline.trim(),
          description: editDescription.trim(),
          category: editCategory,
          priceLabel: editPrice.trim() || 'Free',
          mcVersions: editMcVersions,
          supportUrl: editSupportUrl.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setPanelMsg(data.error || 'Could not save edits.');
        return;
      }
      await onRefreshPlugins();
      setEditingPluginId(null);
      setPanelMsg('Plugin details updated.');
    } finally {
      setActionBusy(false);
    }
  };

  const handlePushVersionUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatePluginId || !nextFile) {
      setPanelMsg('Select a new .jar or .zip file for the version update.');
      return;
    }
    setActionBusy(true);
    setPanelMsg('');
    try {
      const headers = await getFirebaseAuthHeaders();
      const verRes = await fetch(`/api/plugins/${encodeURIComponent(updatePluginId)}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          version: nextVersion.trim(),
          title: nextTitle.trim() || `Update v${nextVersion.trim()}`,
          changelog: nextChangelog.trim(),
        }),
      });
      const verData = (await verRes.json().catch(() => ({}))) as {
        ok?: boolean;
        versionId?: string;
        error?: string;
      };
      if (!verRes.ok || !verData.ok || !verData.versionId) {
        setPanelMsg(verData.error || 'Failed creating new version entry.');
        return;
      }
      const bytes = await nextFile.arrayBuffer();
      const fileRes = await fetch(
        `/api/plugins/${encodeURIComponent(updatePluginId)}/versions/${encodeURIComponent(verData.versionId)}/file`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/octet-stream',
            'X-File-Name': nextFile.name,
          },
          body: bytes,
        }
      );
      if (!fileRes.ok) {
        const err = (await fileRes.json().catch(() => ({}))) as { error?: string };
        setPanelMsg(err.error || 'Failed uploading version file.');
        return;
      }
      await onRefreshPlugins();
      setUpdatePluginId(null);
      setNextVersion('');
      setNextTitle('');
      setNextChangelog('');
      setNextFile(null);
      setPanelMsg('New plugin version pushed & live!');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeletePlugin = async (pl: PluginListing) => {
    setActionBusy(true);
    setPanelMsg('');
    try {
      const headers = await getFirebaseAuthHeaders();
      const res = await fetch(`/api/plugins/${encodeURIComponent(pl.id)}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        await onRefreshPlugins();
        setPanelMsg(`Deleted plugin "${pl.name}".`);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteDomain = async (handle: string) => {
    const headers = await getFirebaseAuthHeaders();
    const res = await fetch(`/api/owner/domains/${encodeURIComponent(handle)}`, {
      method: 'DELETE',
      headers,
    });
    if (res.ok) {
      setOwnerDomains((prev) => prev.filter((d) => d.handle !== handle));
    }
  };

  const allReviews = plugins.flatMap((pl) =>
    pl.reviews.map((rev) => ({ pluginName: pl.name, pluginId: pl.id, rev }))
  );
  const totalDownloads = plugins.reduce((acc, p) => acc + p.downloads, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--st-accent-text)' }}>
            <ShieldCheck className="w-4 h-4" />
            <span>Owner Control Panel · {OWNER_EMAIL}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: 'var(--st-text)' }}>
            Platform Command Center
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--st-text-muted)' }}>
            Upload plugins, release updates, reply to or moderate reviews, and manage servers, domains, and community requests.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/plugin')}
          className="px-4 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
        >
          View Public Plugins Page →
        </button>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
        <div className="st-card p-4">
          <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>Uploaded Plugins</div>
          <div className="text-xl font-bold mt-1" style={{ color: 'var(--st-accent-text)' }}>
            {plugins.length}
          </div>
        </div>
        <div className="st-card p-4">
          <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>Plugin Downloads</div>
          <div className="text-xl font-bold mt-1" style={{ color: 'var(--st-text)' }}>
            {totalDownloads.toLocaleString()}
          </div>
        </div>
        <div className="st-card p-4">
          <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>Plugin Reviews</div>
          <div className="text-xl font-bold mt-1" style={{ color: 'var(--st-text)' }}>
            {allReviews.length}
          </div>
        </div>
        <div className="st-card p-4">
          <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>Domains &amp; Servers</div>
          <div className="text-xl font-bold mt-1" style={{ color: 'var(--st-text)' }}>
            {ownerDomains.length + servers.length}
          </div>
        </div>
      </div>

      {/* Owner Tabs */}
      <div
        role="tablist"
        aria-label="Owner control sections"
        className="flex flex-wrap gap-2 border-b pb-3"
        style={{ borderColor: 'var(--st-border)' }}
      >
        {(
          [
            { id: 'upload', label: 'Upload Plugin', icon: Upload },
            { id: 'plugins', label: `Manage Plugins (${plugins.length})`, icon: FileArchive },
            { id: 'reviews', label: `Reviews (${allReviews.length})`, icon: Star },
            { id: 'infrastructure', label: `Servers & Domains (${servers.length + ownerDomains.length})`, icon: Server },
            { id: 'community', label: `Requests (${communityRequests.length})`, icon: MessageSquare },
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
                border: active ? '1px solid var(--st-border-strong)' : '1px solid var(--st-border)',
                color: active ? 'var(--st-accent-text)' : 'var(--st-text-secondary)',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {panelMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-500 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{panelMsg}</span>
        </div>
      )}

      {/* TAB 1: UPLOAD PLUGIN */}
      {activeTab === 'upload' && (
        <form onSubmit={(e) => void handleUploadNewPlugin(e)} className="st-card p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--st-text)' }}>
              Upload New Plugin Release
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--st-text-muted)' }}>
              Publish a BuiltByBit-style resource listing with a downloadable .jar or .zip archive.
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
                      border: active ? '1px solid var(--st-border-strong)' : '1px solid var(--st-border)',
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

      {/* TAB 2: MANAGE PLUGINS */}
      {activeTab === 'plugins' && (
        <div className="space-y-4">
          {plugins.length === 0 ? (
            <div className="st-card p-8 text-center space-y-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                No plugins uploaded yet
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="inline-flex items-center gap-1.5 px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload First Plugin</span>
              </button>
            </div>
          ) : (
            plugins.map((pl) => (
              <div key={pl.id} className="st-card p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onNavigate(`/plugin/${pl.slug}`)}
                        className="text-base font-bold hover:underline cursor-pointer"
                        style={{ color: 'var(--st-text)' }}
                      >
                        {pl.name}
                      </button>
                      <span className="text-xs font-mono" style={{ color: 'var(--st-success)' }}>
                        v{pl.currentVersion}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          pl.status === 'published'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {pl.status === 'published' ? 'Published' : 'Hidden'}
                      </span>
                      {pl.featured && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-400">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--st-text-muted)' }}>
                      {pl.fileName} ({formatBytes(pl.fileSize)}) · {pl.downloads} downloads · {pl.reviewsCount} reviews
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={actionBusy}
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
                      disabled={actionBusy}
                      onClick={() => void handleToggleFeatured(pl)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 st-btn-secondary text-xs font-semibold cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{pl.featured ? 'Unfeature' : 'Feature'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => void handleToggleVisibility(pl)}
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
                      disabled={actionBusy}
                      onClick={() => void handleDeletePlugin(pl)}
                      className="p-1.5 st-btn-secondary text-rose-500 cursor-pointer"
                      aria-label={`Delete ${pl.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {editingPluginId === pl.id && (
                  <form onSubmit={(e) => void handleSavePluginEdit(e)} className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--st-border)' }}>
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
                      <button type="submit" disabled={actionBusy} className="px-3.5 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer">
                        Save Changes
                      </button>
                      <button type="button" onClick={() => setEditingPluginId(null)} className="px-3.5 py-1.5 st-btn-secondary text-xs cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {updatePluginId === pl.id && (
                  <form onSubmit={(e) => void handlePushVersionUpdate(e)} className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--st-border)' }}>
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
                      <button type="submit" disabled={actionBusy} className="px-3.5 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer">
                        Upload Update
                      </button>
                      <button type="button" onClick={() => setUpdatePluginId(null)} className="px-3.5 py-1.5 st-btn-secondary text-xs cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: REVIEWS MODERATION */}
      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {allReviews.length === 0 ? (
            <div className="st-card p-8 text-center text-xs" style={{ color: 'var(--st-text-muted)' }}>
              No plugin reviews submitted yet.
            </div>
          ) : (
            allReviews.map(({ pluginId, pluginName, rev }) => {
              const rk = `${pluginId}:${rev.id}`;
              return (
                <div key={rk} className="st-card p-5 space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold" style={{ color: 'var(--st-accent-text)' }}>
                        {pluginName} · {rev.rating}/5 ★
                      </div>
                      <div className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                        {rev.title}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                        by {rev.authorName} · {new Date(rev.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyKey(replyKey === rk ? null : rk);
                          setReplyText(rev.ownerReply || '');
                        }}
                        className="px-2.5 py-1 st-btn-secondary text-xs cursor-pointer"
                      >
                        {rev.ownerReply ? 'Edit Reply' : 'Reply'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const headers = await getFirebaseAuthHeaders();
                          const res = await fetch(
                            `/api/plugins/${encodeURIComponent(pluginId)}/reviews/${encodeURIComponent(rev.id)}`,
                            { method: 'DELETE', headers }
                          );
                          if (res.ok) await onRefreshPlugins();
                        }}
                        className="p-1.5 st-btn-secondary text-rose-500 cursor-pointer"
                        aria-label="Delete review"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--st-text-secondary)' }}>
                    {rev.comment}
                  </p>
                  {replyKey === rk && (
                    <div className="pt-2 space-y-2">
                      <textarea
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Owner response..."
                        className="w-full p-2.5 st-surface-inset text-xs"
                        style={{ color: 'var(--st-text)' }}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const headers = await getFirebaseAuthHeaders();
                          const res = await fetch(
                            `/api/plugins/${encodeURIComponent(pluginId)}/reviews/${encodeURIComponent(rev.id)}/reply`,
                            {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', ...headers },
                              body: JSON.stringify({ reply: replyText.trim() }),
                            }
                          );
                          if (res.ok) {
                            await onRefreshPlugins();
                            setReplyKey(null);
                          }
                        }}
                        className="px-3 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer"
                      >
                        Save Reply
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 4: SERVERS & DOMAINS */}
      {activeTab === 'infrastructure' && (
        <div className="space-y-6">
          <div className="st-card p-5 space-y-4">
            <h2 className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
              Listed Servers ({servers.length})
            </h2>
            {servers.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                No servers listed yet.
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--st-border)' }}>
                {servers.map((srv) => (
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
                        onClick={() => onRemoveServer(srv.id)}
                        className="p-1.5 st-btn-secondary text-rose-500 cursor-pointer"
                        aria-label={`Remove ${srv.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="st-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold inline-flex items-center gap-2" style={{ color: 'var(--st-text)' }}>
                <Globe className="w-4 h-4" style={{ color: 'var(--st-accent-text)' }} />
                <span>Registered Server Domains ({ownerDomains.length})</span>
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
            {ownerDomains.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                No server domains stored on the server.
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--st-border)' }}>
                {ownerDomains.map((dom) => (
                  <div key={dom.handle} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                        {dom.serverName}
                      </div>
                      <div className="text-xs font-mono" style={{ color: 'var(--st-accent-text)' }}>
                        {dom.connectAddress || dom.workingDomain || `${dom.handle}.duckdns.org`} → {dom.targetHost}:{dom.targetPort}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteDomain(dom.handle)}
                      className="p-1.5 st-btn-secondary text-rose-500 cursor-pointer"
                      aria-label={`Delete domain ${dom.handle}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: COMMUNITY REQUESTS */}
      {activeTab === 'community' && (
        <div className="space-y-3">
          {communityRequests.map((req) => (
            <div key={req.id} className="st-card p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-xl">
                <div className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                  {req.title}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--st-text-muted)' }}>
                  {req.description} · by {req.author} ({req.votes} votes)
                </p>
              </div>
              <div className="flex items-center gap-2">
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
                  onClick={() => onDeleteCommunityRequest(req.id)}
                  className="p-1.5 st-btn-secondary text-rose-500 cursor-pointer"
                  aria-label={`Delete request ${req.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
