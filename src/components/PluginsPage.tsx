import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  FileArchive,
  Layers,
  Loader2,
  MessageSquare,
  Package,
  Plus,
  Puzzle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  OWNER_EMAIL,
  PLUGIN_CATEGORIES,
  PLUGIN_PLATFORMS,
  PluginCategory,
  PluginListing,
  PluginSortBy,
  computeRatingBreakdown,
  filterAndSortPlugins,
  formatBytes,
  isOwnerUser,
} from '../utils/pluginMarketplace';
import {
  deletePluginReviewClient,
  downloadPluginArchiveClient,
  replyPluginReviewClient,
  submitPluginForReviewClient,
  submitPluginReviewClient,
} from '../utils/pluginClient';
import { AuthUserState } from './AuthPage';

interface PluginsPageProps {
  user: AuthUserState | null;
  plugins: PluginListing[];
  loading: boolean;
  selectedSlug?: string | null;
  onRefreshPlugins: () => Promise<void>;
  onPluginUpdated: (plugin: PluginListing) => void;
  onNavigate: (path: string) => void;
}

const StarRow: React.FC<{ rating: number; size?: 'sm' | 'md' }> = ({ rating, size = 'sm' }) => {
  const cls = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((idx) => (
        <Star
          key={idx}
          className={cls}
          style={{
            color: idx <= Math.round(rating) ? '#f59e0b' : 'var(--st-text-muted)',
            fill: idx <= Math.round(rating) ? '#f59e0b' : 'transparent',
            opacity: idx <= Math.round(rating) ? 1 : 0.35,
          }}
        />
      ))}
    </span>
  );
};

export const PluginsPage: React.FC<PluginsPageProps> = ({
  user,
  plugins,
  loading,
  selectedSlug,
  onRefreshPlugins,
  onPluginUpdated,
  onNavigate,
}) => {
  const isOwner = isOwnerUser(user);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [sortBy, setSortBy] = useState<PluginSortBy>('downloads');
  const [detailTab, setDetailTab] = useState<'overview' | 'updates' | 'reviews'>('overview');

  // Review form state
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revComment, setRevComment] = useState('');
  const [revTestedVersion, setRevTestedVersion] = useState('');
  const [revSubmitting, setRevSubmitting] = useState(false);
  const [revError, setRevError] = useState('');
  const [revSuccess, setRevSuccess] = useState('');

  // Owner reply inline state
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadMsg, setDownloadMsg] = useState('');

  // Community plugin submission state (pending Owner approval)
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [subName, setSubName] = useState('');
  const [subVersion, setSubVersion] = useState('1.0.0');
  const [subCategory, setSubCategory] = useState<PluginCategory>('Administration');
  const [subPrice, setSubPrice] = useState('Free');
  const [subTagline, setSubTagline] = useState('');
  const [subDescription, setSubDescription] = useState('');
  const [subMcVersions, setSubMcVersions] = useState('1.21.4');
  const [subPlatforms, setSubPlatforms] = useState<string[]>(['Paper', 'Purpur']);
  const [subSupportUrl, setSubSupportUrl] = useState('');
  const [subChangelog, setSubChangelog] = useState('Initial community submission for review.');
  const [subFile, setSubFile] = useState<File | null>(null);
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [subError, setSubError] = useState('');
  const [subSuccess, setSubSuccess] = useState('');

  const selectedPlugin = selectedSlug
    ? plugins.find((p) => p.slug === selectedSlug || p.id === selectedSlug) || null
    : null;

  useEffect(() => {
    if (selectedPlugin) {
      setDetailTab('overview');
      setRevTestedVersion(selectedPlugin.mcVersions[0] || selectedPlugin.currentVersion);
      setRevError('');
      setRevSuccess('');
      setDownloadMsg('');
    }
  }, [selectedPlugin?.id]);

  const filteredPlugins = filterAndSortPlugins(plugins, {
    search,
    category: selectedCategory,
    platform: selectedPlatform,
    sortBy,
    includeHidden: isOwner,
  });

  const handleDownload = async (plugin: PluginListing, versionId?: string, fileNameOverride?: string) => {
    setDownloadingId(versionId || plugin.id);
    setDownloadMsg('');
    try {
      const result = await downloadPluginArchiveClient(plugin, versionId, fileNameOverride);
      if (!result.ok) {
        setDownloadMsg(result.error);
        return;
      }
      setDownloadMsg(`Downloaded ${result.fileName}`);
      await onRefreshPlugins();
    } catch {
      setDownloadMsg('Download interrupted. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlugin) return;
    setRevError('');
    setRevSuccess('');
    setRevSubmitting(true);
    try {
      const result = await submitPluginReviewClient(selectedPlugin, {
        rating: revRating,
        title: revTitle.trim(),
        comment: revComment.trim(),
        testedVersion: revTestedVersion.trim() || selectedPlugin.mcVersions[0] || '1.21.4',
        authorName: user?.username,
      });
      if (!result.ok) {
        setRevError(result.error);
        return;
      }
      onPluginUpdated(result.plugin);
      setRevTitle('');
      setRevComment('');
      setRevSuccess('Your review has been published.');
    } catch {
      setRevError('Network error while submitting review.');
    } finally {
      setRevSubmitting(false);
    }
  };

  const handleDeleteReview = async (pluginId: string, reviewId: string) => {
    try {
      const result = await deletePluginReviewClient(pluginId, reviewId);
      if (result.ok && result.plugin) {
        onPluginUpdated(result.plugin);
      }
    } catch {
      // ignore
    }
  };

  const handleToggleSubPlatform = (plat: string) => {
    setSubPlatforms((prev) =>
      prev.includes(plat) ? (prev.length > 1 ? prev.filter((p) => p !== plat) : prev) : [...prev, plat]
    );
  };

  const handleSubmitPluginForReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubError('');
    setSubSuccess('');
    if (!subFile) {
      setSubError('Select a .jar or .zip archive to submit for Owner approval.');
      return;
    }
    setSubSubmitting(true);
    try {
      const result = await submitPluginForReviewClient({
        name: subName.trim(),
        version: subVersion.trim(),
        category: subCategory,
        priceLabel: subPrice.trim() || 'Free',
        tagline: subTagline.trim(),
        description: subDescription.trim(),
        mcVersions: subMcVersions,
        platforms: subPlatforms,
        supportUrl: subSupportUrl.trim(),
        releaseTitle: `Submission v${subVersion.trim() || '1.0.0'}`,
        changelog: subChangelog.trim(),
        file: subFile,
      });
      if (!result.ok) {
        setSubError(result.error);
        return;
      }
      setSubSuccess(
        `Submitted "${subName.trim()}" for review. It will appear publicly once approved by Owner (${OWNER_EMAIL}).`
      );
      setSubName('');
      setSubTagline('');
      setSubDescription('');
      setSubSupportUrl('');
      setSubFile(null);
      if (isOwner) {
        await onRefreshPlugins();
      }
    } finally {
      setSubSubmitting(false);
    }
  };

  const handleSubmitOwnerReply = async (pluginId: string, reviewId: string) => {
    const targetPlugin = plugins.find((p) => p.id === pluginId) || selectedPlugin;
    if (!targetPlugin) return;
    setReplySubmitting(true);
    try {
      const result = await replyPluginReviewClient(targetPlugin, reviewId, replyDraft.trim());
      if (result.ok) {
        onPluginUpdated(result.plugin);
        setReplyTargetId(null);
        setReplyDraft('');
      }
    } finally {
      setReplySubmitting(false);
    }
  };

  // ========================================================
  // DETAIL VIEW (BuiltByBit-Style Resource Page)
  // ========================================================
  if (selectedSlug) {
    if (loading) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--st-accent-text)' }} />
          <span className="text-sm" style={{ color: 'var(--st-text-muted)' }}>
            Loading plugin details…
          </span>
        </div>
      );
    }

    if (!selectedPlugin) {
      return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <div className="st-card p-10 text-center space-y-4">
            <Puzzle className="w-10 h-10 mx-auto" style={{ color: 'var(--st-accent-text)' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--st-text)' }}>
              Plugin not found
            </h1>
            <p className="text-sm" style={{ color: 'var(--st-text-muted)' }}>
              This plugin has not been uploaded yet or was removed by the Owner.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/plugin')}
              className="px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer"
            >
              Back to Plugins
            </button>
          </div>
        </div>
      );
    }

    const breakdown = computeRatingBreakdown(selectedPlugin.reviews);

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/plugin')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer hover:underline"
            style={{ color: 'var(--st-accent-text)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Plugins Directory</span>
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => onNavigate('/owner-dashboard')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 st-btn-secondary text-xs font-semibold cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--st-accent-text)' }} />
              <span>Manage in Owner Dashboard</span>
            </button>
          )}
        </div>

        {/* BuiltByBit Header Card */}
        <div className="st-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold shrink-0"
              style={{
                backgroundColor: 'var(--st-accent-soft)',
                color: 'var(--st-accent-text)',
                border: '1px solid var(--st-border-strong)',
              }}
            >
              {selectedPlugin.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--st-text)' }}>
                  {selectedPlugin.name}
                </h1>
                <span
                  className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold"
                  style={{
                    backgroundColor: 'var(--st-surface-inset)',
                    color: 'var(--st-success)',
                    border: '1px solid var(--st-border)',
                  }}
                >
                  v{selectedPlugin.currentVersion}
                </span>
                <span
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase"
                  style={{
                    backgroundColor: 'var(--st-accent-soft)',
                    color: 'var(--st-accent-text)',
                  }}
                >
                  {selectedPlugin.priceLabel}
                </span>
                {selectedPlugin.status !== 'published' && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-400">
                    {selectedPlugin.status === 'pending' ? 'Pending Owner Approval' : 'Hidden Draft'}
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: 'var(--st-text-secondary)' }}>
                {selectedPlugin.tagline}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs pt-0.5" style={{ color: 'var(--st-text-muted)' }}>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--st-accent-text)' }} />
                  <span>
                    By <strong style={{ color: 'var(--st-text)' }}>{selectedPlugin.authorName}</strong> (Owner)
                  </span>
                </span>
                <span>·</span>
                <span>{selectedPlugin.category}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <StarRow rating={breakdown.average} />
                  <span className="tabular-nums">
                    {breakdown.count > 0 ? `${breakdown.average} (${breakdown.count})` : 'No reviews yet'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <button
              type="button"
              disabled={downloadingId === selectedPlugin.id}
              onClick={() => void handleDownload(selectedPlugin)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 st-btn-primary text-sm font-semibold cursor-pointer disabled:opacity-60"
            >
              {downloadingId === selectedPlugin.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download {selectedPlugin.fileName.endsWith('.zip') ? '.zip' : '.jar'}</span>
            </button>
            <span className="text-[11px] font-mono tabular-nums" style={{ color: 'var(--st-text-muted)' }}>
              {selectedPlugin.fileName} · {formatBytes(selectedPlugin.fileSize)}
            </span>
          </div>
        </div>

        {downloadMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{downloadMsg}</span>
          </div>
        )}

        {/* Two-column BuiltByBit body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Main Content */}
          <div className="lg:col-span-8 space-y-5">
            <div
              role="tablist"
              aria-label="Plugin resource sections"
              className="flex flex-wrap gap-2 border-b pb-3"
              style={{ borderColor: 'var(--st-border)' }}
            >
              {(
                [
                  { id: 'overview', label: 'Overview' },
                  { id: 'updates', label: `Updates (${selectedPlugin.versions.length})` },
                  { id: 'reviews', label: `Reviews (${breakdown.count})` },
                ] as const
              ).map((tab) => {
                const active = detailTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setDetailTab(tab.id)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    style={{
                      backgroundColor: active ? 'var(--st-accent-soft)' : 'var(--st-surface)',
                      border: active ? '1px solid var(--st-border-strong)' : '1px solid var(--st-border)',
                      color: active ? 'var(--st-accent-text)' : 'var(--st-text-secondary)',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {detailTab === 'overview' && (
              <div className="st-card p-6 space-y-6">
                <div>
                  <h2 className="text-base font-bold mb-3" style={{ color: 'var(--st-text)' }}>
                    About this Plugin
                  </h2>
                  <div
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: 'var(--st-text-secondary)' }}
                  >
                    {selectedPlugin.description}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'var(--st-border)' }}>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--st-text-muted)' }}>
                      Supported Server Software
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPlugin.platforms.map((plat) => (
                        <span
                          key={plat}
                          className="px-2.5 py-1 rounded-md text-xs font-medium"
                          style={{
                            backgroundColor: 'var(--st-surface-inset)',
                            border: '1px solid var(--st-border)',
                            color: 'var(--st-text)',
                          }}
                        >
                          {plat}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--st-text-muted)' }}>
                      Tested Minecraft Versions
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPlugin.mcVersions.map((ver) => (
                        <span
                          key={ver}
                          className="px-2.5 py-1 rounded-md text-xs font-mono"
                          style={{
                            backgroundColor: 'var(--st-surface-inset)',
                            border: '1px solid var(--st-border)',
                            color: 'var(--st-accent-text)',
                          }}
                        >
                          {ver}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedPlugin.sha256 && (
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--st-border)' }}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--st-text-muted)' }}>
                      SHA-256 Checksum
                    </div>
                    <code
                      className="block p-2.5 rounded-lg text-[11px] font-mono break-all st-surface-inset"
                      style={{ color: 'var(--st-text-secondary)' }}
                    >
                      {selectedPlugin.sha256}
                    </code>
                  </div>
                )}
              </div>
            )}

            {detailTab === 'updates' && (
              <div className="space-y-4">
                {selectedPlugin.versions.map((ver, index) => (
                  <div key={ver.id} className="st-card p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold"
                          style={{
                            backgroundColor: 'var(--st-accent-soft)',
                            color: 'var(--st-accent-text)',
                          }}
                        >
                          v{ver.version}
                        </span>
                        <h3 className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                          {ver.title}
                        </h3>
                        {index === 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-500">
                            Latest
                          </span>
                        )}
                      </div>
                      {ver.storedFileName && (
                        <button
                          type="button"
                          disabled={downloadingId === ver.id}
                          onClick={() => void handleDownload(selectedPlugin, ver.id, ver.fileName)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 st-btn-secondary text-xs font-semibold cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download ({formatBytes(ver.fileSize)})</span>
                        </button>
                      )}
                    </div>
                    <p className="text-xs whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--st-text-secondary)' }}>
                      {ver.changelog}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-[11px] tabular-nums" style={{ color: 'var(--st-text-muted)' }}>
                      <span>Released {new Date(ver.createdAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{ver.downloads.toLocaleString()} downloads</span>
                      {ver.fileName && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{ver.fileName}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detailTab === 'reviews' && (
              <div className="space-y-6">
                {/* Rating Summary Card */}
                <div className="st-card p-5 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                  <div className="sm:col-span-4 text-center sm:border-r sm:pr-4" style={{ borderColor: 'var(--st-border)' }}>
                    <div className="text-4xl font-bold tabular-nums" style={{ color: 'var(--st-text)' }}>
                      {breakdown.count > 0 ? breakdown.average.toFixed(1) : '—'}
                    </div>
                    <div className="mt-1 flex justify-center">
                      <StarRow rating={breakdown.average} size="md" />
                    </div>
                    <div className="text-xs mt-1 tabular-nums" style={{ color: 'var(--st-text-muted)' }}>
                      {breakdown.count} {breakdown.count === 1 ? 'review' : 'reviews'}
                    </div>
                  </div>
                  <div className="sm:col-span-8 space-y-1.5">
                    {([5, 4, 3, 2, 1] as const).map((star) => {
                      const count = breakdown.countsByStar[star];
                      const pct = breakdown.count > 0 ? Math.round((count / breakdown.count) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs tabular-nums">
                          <span className="w-8 font-medium" style={{ color: 'var(--st-text-secondary)' }}>
                            {star} ★
                          </span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden st-surface-inset">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: '#f59e0b' }}
                            />
                          </div>
                          <span className="w-8 text-right" style={{ color: 'var(--st-text-muted)' }}>
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Write Review Card */}
                <div className="st-card p-6 space-y-4">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                    Leave a Plugin Review
                  </h3>

                  {!user ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                        Sign in to rate this plugin and share feedback with the Owner.
                      </p>
                      <button
                        type="button"
                        onClick={() => onNavigate('/login')}
                        className="px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer"
                      >
                        Sign In to Review
                      </button>
                    </div>
                  ) : !user.emailVerified ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-amber-400">
                        Verify your email address on your Account page before posting reviews.
                      </p>
                      <button
                        type="button"
                        onClick={() => onNavigate('/login')}
                        className="px-3.5 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
                      >
                        Verify Account
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={(e) => void handleSubmitReview(e)} className="space-y-4">
                      {revError && (
                        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
                          {revError}
                        </div>
                      )}
                      {revSuccess && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-500">
                          {revSuccess}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4">
                        <div>
                          <span className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                            Star Rating
                          </span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                aria-label={`Rate ${star} stars`}
                                onClick={() => setRevRating(star)}
                                className="p-1 cursor-pointer"
                              >
                                <Star
                                  className="w-5 h-5"
                                  style={{
                                    color: star <= revRating ? '#f59e0b' : 'var(--st-text-muted)',
                                    fill: star <= revRating ? '#f59e0b' : 'transparent',
                                  }}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex-1 min-w-[160px]">
                          <label htmlFor="rev-title" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                            Headline
                          </label>
                          <input
                            id="rev-title"
                            type="text"
                            value={revTitle}
                            onChange={(e) => setRevTitle(e.target.value)}
                            placeholder="e.g. Clean and fast on Paper 1.21.4"
                            className="w-full px-3 py-2 st-surface-inset text-sm"
                            style={{ color: 'var(--st-text)' }}
                          />
                        </div>

                        <div className="w-36">
                          <label htmlFor="rev-mc" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                            Tested Version
                          </label>
                          <input
                            id="rev-mc"
                            type="text"
                            value={revTestedVersion}
                            onChange={(e) => setRevTestedVersion(e.target.value)}
                            placeholder="1.21.4"
                            className="w-full px-3 py-2 st-surface-inset text-sm font-mono"
                            style={{ color: 'var(--st-text)' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="rev-comment" className="block text-xs font-medium mb-1" style={{ color: 'var(--st-text-secondary)' }}>
                          Your Review
                        </label>
                        <textarea
                          id="rev-comment"
                          rows={3}
                          required
                          value={revComment}
                          onChange={(e) => setRevComment(e.target.value)}
                          placeholder="Share how this plugin performs on your server, configuration tips, or feedback..."
                          className="w-full p-3 st-surface-inset text-sm"
                          style={{ color: 'var(--st-text)' }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={revSubmitting}
                        className="px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-60"
                      >
                        {revSubmitting ? 'Submitting Review…' : 'Post Review'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Reviews List */}
                <div className="space-y-3">
                  {selectedPlugin.reviews.length === 0 ? (
                    <div className="st-card p-6 text-center text-xs" style={{ color: 'var(--st-text-muted)' }}>
                      No reviews yet. Download the plugin and be the first to leave feedback!
                    </div>
                  ) : (
                    selectedPlugin.reviews.map((rev) => {
                      const canDelete = isOwner || (user && user.uid === rev.authorUid);
                      return (
                        <div key={rev.id} className="st-card p-5 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <StarRow rating={rev.rating} />
                                <span className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                                  {rev.title}
                                </span>
                              </div>
                              <div className="text-xs mt-1" style={{ color: 'var(--st-text-muted)' }}>
                                <strong style={{ color: 'var(--st-text-secondary)' }}>{rev.authorName}</strong>
                                {' · '}Tested on <span className="font-mono">{rev.testedVersion}</span>
                                {' · '}
                                {new Date(rev.createdAt).toLocaleDateString()}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyTargetId(replyTargetId === rev.id ? null : rev.id);
                                    setReplyDraft(rev.ownerReply || '');
                                  }}
                                  className="px-2.5 py-1 st-btn-secondary text-[11px] font-medium cursor-pointer"
                                >
                                  {rev.ownerReply ? 'Edit Reply' : 'Owner Reply'}
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  aria-label="Delete review"
                                  onClick={() => void handleDeleteReview(selectedPlugin.id, rev.id)}
                                  className="p-1.5 st-btn-secondary text-rose-500 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-sm leading-relaxed" style={{ color: 'var(--st-text-secondary)' }}>
                            {rev.comment}
                          </p>

                          {rev.ownerReply && (
                            <div
                              className="p-3.5 rounded-lg space-y-1"
                              style={{
                                backgroundColor: 'var(--st-surface-inset)',
                                borderLeft: '3px solid var(--st-accent)',
                              }}
                            >
                              <div className="text-[11px] font-semibold" style={{ color: 'var(--st-accent-text)' }}>
                                Response from Owner ({OWNER_EMAIL})
                              </div>
                              <p className="text-xs leading-relaxed" style={{ color: 'var(--st-text-secondary)' }}>
                                {rev.ownerReply}
                              </p>
                            </div>
                          )}

                          {isOwner && replyTargetId === rev.id && (
                            <div className="pt-2 space-y-2">
                              <textarea
                                rows={2}
                                value={replyDraft}
                                onChange={(e) => setReplyDraft(e.target.value)}
                                placeholder="Write an official Owner response (leave blank to remove)..."
                                className="w-full p-2.5 st-surface-inset text-xs"
                                style={{ color: 'var(--st-text)' }}
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={replySubmitting}
                                  onClick={() => void handleSubmitOwnerReply(selectedPlugin.id, rev.id)}
                                  className="px-3 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer"
                                >
                                  Save Reply
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReplyTargetId(null)}
                                  className="px-3 py-1.5 st-btn-secondary text-xs cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right BuiltByBit Metadata Sidebar */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="st-card p-5 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--st-text-muted)' }}>
                Resource Information
              </h2>
              <dl className="space-y-2.5 text-xs">
                <div className="flex justify-between gap-3">
                  <dt style={{ color: 'var(--st-text-muted)' }}>Author</dt>
                  <dd className="font-semibold" style={{ color: 'var(--st-text)' }}>
                    {selectedPlugin.authorName}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: 'var(--st-text-muted)' }}>Latest Version</dt>
                  <dd className="font-mono font-semibold" style={{ color: 'var(--st-success)' }}>
                    v{selectedPlugin.currentVersion}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: 'var(--st-text-muted)' }}>Total Downloads</dt>
                  <dd className="font-semibold tabular-nums" style={{ color: 'var(--st-text)' }}>
                    {selectedPlugin.downloads.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: 'var(--st-text-muted)' }}>Rating</dt>
                  <dd className="font-semibold tabular-nums" style={{ color: 'var(--st-text)' }}>
                    {breakdown.count > 0 ? `${breakdown.average.toFixed(1)} / 5 (${breakdown.count})` : 'Unrated'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: 'var(--st-text-muted)' }}>Category</dt>
                  <dd style={{ color: 'var(--st-text-secondary)' }}>{selectedPlugin.category}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: 'var(--st-text-muted)' }}>Archive Size</dt>
                  <dd className="font-mono" style={{ color: 'var(--st-text-secondary)' }}>
                    {formatBytes(selectedPlugin.fileSize)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: 'var(--st-text-muted)' }}>Last Updated</dt>
                  <dd style={{ color: 'var(--st-text-secondary)' }}>
                    {new Date(selectedPlugin.updatedAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>

              {selectedPlugin.supportUrl && (
                <a
                  href={selectedPlugin.supportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 st-btn-secondary text-xs font-semibold"
                >
                  <span>Documentation / Support</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ========================================================
  // DIRECTORY LIST VIEW (/plugin)
  // ========================================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--st-accent-text)' }}>
            <Puzzle className="w-3.5 h-3.5" />
            <span>BuiltByBit-Style Plugin Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--st-text)' }}>
            Minecraft Plugins
          </h1>
          <p className="text-[15px] mt-2 max-w-2xl" style={{ color: 'var(--st-text-muted)' }}>
            Verified server plugin releases for Paper, Purpur, Folia, Spigot, and Velocity. Inspect changelogs, download archives, and post reviews.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isOwner ? (
            <button
              type="button"
              onClick={() => onNavigate('/owner-dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2.5 st-btn-primary text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Owner Dashboard</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSubError('');
                setSubSuccess('');
                setShowSubmitForm((v) => !v);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 st-btn-primary text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{showSubmitForm ? 'Close Submission' : 'Submit Plugin'}</span>
            </button>
          )}
        </div>
      </div>

      {showSubmitForm && !isOwner && (
        <div className="st-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--st-text)' }}>
                Submit Plugin for Owner Review
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--st-text-muted)' }}>
                Submissions enter the Owner Dashboard queue ({OWNER_EMAIL}) and go live after approval.
              </p>
            </div>
          </div>

          {!user ? (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                Sign in with a verified SurgeTrix account to submit a .jar or .zip plugin for approval.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer"
              >
                Sign In to Submit
              </button>
            </div>
          ) : !user.emailVerified ? (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs text-amber-400">
                Verify your email address before submitting a plugin for Owner review.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="px-3.5 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
              >
                Verify Account
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmitPluginForReview(e)} className="space-y-4">
              {subError && (
                <div role="alert" className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
                  {subError}
                </div>
              )}
              {subSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{subSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="Plugin Name"
                  className="sm:col-span-2 px-3 py-2 st-surface-inset text-sm"
                  style={{ color: 'var(--st-text)' }}
                />
                <input
                  type="text"
                  required
                  value={subVersion}
                  onChange={(e) => setSubVersion(e.target.value)}
                  placeholder="Version (1.0.0)"
                  className="px-3 py-2 st-surface-inset font-mono text-sm"
                  style={{ color: 'var(--st-text)' }}
                />
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value as PluginCategory)}
                  className="px-3 py-2 st-surface-inset text-sm"
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
                  required
                  value={subTagline}
                  onChange={(e) => setSubTagline(e.target.value)}
                  placeholder="Short one-line summary"
                  className="sm:col-span-2 px-3 py-2 st-surface-inset text-sm"
                  style={{ color: 'var(--st-text)' }}
                />
                <input
                  type="text"
                  value={subMcVersions}
                  onChange={(e) => setSubMcVersions(e.target.value)}
                  placeholder="MC Versions (1.20.4, 1.21.4)"
                  className="px-3 py-2 st-surface-inset font-mono text-sm"
                  style={{ color: 'var(--st-text)' }}
                />
                <input
                  type="text"
                  value={subPrice}
                  onChange={(e) => setSubPrice(e.target.value)}
                  placeholder="Price (Free)"
                  className="px-3 py-2 st-surface-inset text-sm"
                  style={{ color: 'var(--st-text)' }}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PLUGIN_PLATFORMS.map((plat) => {
                  const active = subPlatforms.includes(plat);
                  return (
                    <button
                      key={plat}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleToggleSubPlatform(plat)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer"
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

              <textarea
                rows={3}
                required
                value={subDescription}
                onChange={(e) => setSubDescription(e.target.value)}
                placeholder="Describe features, commands, permissions, and installation instructions..."
                className="w-full p-3 st-surface-inset text-sm"
                style={{ color: 'var(--st-text)' }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="url"
                  value={subSupportUrl}
                  onChange={(e) => setSubSupportUrl(e.target.value)}
                  placeholder="Support / Docs URL (optional)"
                  className="px-3 py-2 st-surface-inset text-xs"
                  style={{ color: 'var(--st-text)' }}
                />
                <input
                  type="text"
                  value={subChangelog}
                  onChange={(e) => setSubChangelog(e.target.value)}
                  placeholder="Submission notes"
                  className="px-3 py-2 st-surface-inset text-xs"
                  style={{ color: 'var(--st-text)' }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <input
                  type="file"
                  accept=".jar,.zip"
                  required
                  onChange={(e) => setSubFile(e.target.files?.[0] || null)}
                  className="text-xs"
                  style={{ color: 'var(--st-text-secondary)' }}
                />
                <button
                  type="submit"
                  disabled={subSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {subSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{subSubmitting ? 'Submitting…' : 'Submit for Approval'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Resource Category Cross-Links */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All Resources', path: '/resources', active: false },
            { label: 'Mods', path: '/mods', active: false },
            { label: 'Apps', path: '/apps', active: false },
            { label: 'Resource Packs', path: '/resource-packs', active: false },
            { label: 'Plugins', path: '/plugin', active: true },
          ].map((tab) => (
            <a
              key={tab.path}
              href={tab.path}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(tab.path);
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
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
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--st-text-muted)' }} />
            <input
              type="text"
              aria-label="Search plugins"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plugins, MC version..."
              className="w-full pl-10 pr-4 py-2 st-surface-inset text-sm focus:outline-none"
              style={{ color: 'var(--st-text)' }}
            />
          </div>
          <select
            aria-label="Sort plugins"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as PluginSortBy)}
            className="px-3 py-2 st-surface-inset text-xs font-medium cursor-pointer"
            style={{ color: 'var(--st-text)' }}
          >
            <option value="downloads">Most Downloaded</option>
            <option value="rating">Top Rated</option>
            <option value="updated">Recently Updated</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {/* Category & Platform Filter Strip */}
      <div className="st-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by category">
          {PLUGIN_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedCategory(cat)}
                className="px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors"
                style={{
                  backgroundColor: active ? 'var(--st-accent-soft)' : 'var(--st-surface-inset)',
                  border: active ? '1px solid var(--st-border-strong)' : '1px solid var(--st-border)',
                  color: active ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: 'var(--st-border)' }}>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by server platform">
            {['All', ...PLUGIN_PLATFORMS].map((plat) => {
              const active = selectedPlatform === plat;
              return (
                <button
                  key={plat}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedPlatform(plat)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors"
                  style={{
                    backgroundColor: active ? 'var(--st-accent-soft)' : 'transparent',
                    border: active ? '1px solid var(--st-border-strong)' : '1px solid var(--st-border)',
                    color: active ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
                  }}
                >
                  {plat === 'All' ? 'All Platforms' : plat}
                </button>
              );
            })}
          </div>
          <span className="text-xs tabular-nums" style={{ color: 'var(--st-text-muted)' }}>
            {filteredPlugins.length} {filteredPlugins.length === 1 ? 'plugin' : 'plugins'}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="st-card p-12 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--st-accent-text)' }} />
          <span className="text-sm" style={{ color: 'var(--st-text-muted)' }}>
            Loading plugins marketplace…
          </span>
        </div>
      ) : filteredPlugins.length === 0 ? (
        <div className="st-card p-10 text-center space-y-4">
          <div
            className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center"
            style={{
              backgroundColor: 'var(--st-accent-soft)',
              color: 'var(--st-accent-text)',
              border: '1px solid var(--st-border-strong)',
            }}
          >
            <Package className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h2 className="text-lg font-bold" style={{ color: 'var(--st-text)' }}>
              {plugins.length === 0 ? 'No plugins uploaded yet' : 'No matching plugins found'}
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--st-text-muted)' }}>
              {plugins.length === 0
                ? `Verified developers can submit .jar or .zip plugins for approval, and the SurgeTrix Owner (${OWNER_EMAIL}) publishes verified releases here.`
                : 'Try clearing the search query or choosing a different category or server platform.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            {plugins.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All Categories');
                  setSelectedPlatform('All');
                }}
                className="px-4 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            ) : isOwner ? (
              <button
                type="button"
                onClick={() => onNavigate('/owner-dashboard')}
                className="inline-flex items-center gap-2 px-4 py-2.5 st-btn-primary text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Open Owner Dashboard</span>
              </button>
            ) : !user ? (
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="px-4 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
              >
                Sign In (Owner / Reviewer)
              </button>
            ) : (
              <span className="text-[11px] font-mono" style={{ color: 'var(--st-text-muted)' }}>
                Signed in as {user.email} · Browse &amp; Review Mode
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlugins.map((pl) => (
            <div
              key={pl.id}
              className="st-card st-card-interactive p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                      style={{
                        backgroundColor: 'var(--st-accent-soft)',
                        color: 'var(--st-accent-text)',
                        border: '1px solid var(--st-border-strong)',
                      }}
                    >
                      {pl.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onNavigate(`/plugin/${pl.slug}`)}
                          className="text-base font-bold truncate text-left hover:underline cursor-pointer"
                          style={{ color: 'var(--st-text)' }}
                        >
                          {pl.name}
                        </button>
                        {pl.featured && (
                          <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                        <span>{pl.category}</span>
                        <span>·</span>
                        <span className="font-mono" style={{ color: 'var(--st-success)' }}>
                          v{pl.currentVersion}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0"
                    style={{
                      backgroundColor: 'var(--st-accent-soft)',
                      color: 'var(--st-accent-text)',
                    }}
                  >
                    {pl.priceLabel}
                  </span>
                </div>

                <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--st-text-secondary)' }}>
                  {pl.tagline}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {pl.platforms.slice(0, 3).map((plat) => (
                    <span
                      key={plat}
                      className="px-2 py-0.5 rounded text-[11px]"
                      style={{
                        backgroundColor: 'var(--st-surface-inset)',
                        color: 'var(--st-text-muted)',
                      }}
                    >
                      {plat}
                    </span>
                  ))}
                  {pl.mcVersions.slice(0, 2).map((ver) => (
                    <span
                      key={ver}
                      className="px-2 py-0.5 rounded text-[11px] font-mono"
                      style={{
                        backgroundColor: 'var(--st-surface-inset)',
                        color: 'var(--st-accent-text)',
                      }}
                    >
                      {ver}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-between gap-2 text-xs" style={{ borderColor: 'var(--st-border)' }}>
                <div className="flex items-center gap-3 tabular-nums" style={{ color: 'var(--st-text-muted)' }}>
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>{pl.reviewsCount > 0 ? `${pl.ratingAverage.toFixed(1)} (${pl.reviewsCount})` : '—'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" style={{ color: 'var(--st-accent-text)' }} />
                    <span>{pl.downloads.toLocaleString()}</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1">
                    <FileArchive className="w-3.5 h-3.5" />
                    <span>{formatBytes(pl.fileSize)}</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate(`/plugin/${pl.slug}`)}
                  className="px-3 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer"
                >
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
