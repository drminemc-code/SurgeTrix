import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileArchive,
  ImagePlus,
  Link as LinkIcon,
  ListPlus,
  Loader2,
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
  formatBytes,
  validatePluginIconUrl,
} from '../utils/pluginMarketplace';
import { processPluginIconFile } from '../utils/pluginIconProcessor';
import { PluginLogo } from './PluginLogo';

export interface BuiltByBitResourceValues {
  name: string;
  version: string;
  category: PluginCategory;
  priceLabel: string;
  tagline: string;
  description: string;
  mcVersions: string;
  platforms: string[];
  supportUrl: string;
  iconUrl: string;
  releaseTitle: string;
  changelog: string;
  featured: boolean;
  file: File | null;
}

interface BuiltByBitResourceFormProps {
  mode: 'owner' | 'submit';
  authorDisplayName?: string;
  values: BuiltByBitResourceValues;
  onChange: (patch: Partial<BuiltByBitResourceValues>) => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  submitting: boolean;
  error: string;
  success: string;
}

const OVERVIEW_TEMPLATES: { label: string; snippet: string }[] = [
  {
    label: '+ Features',
    snippet:
      '\n\n## Core Features\n- Lightweight asynchronous processing for 20.0 TPS servers\n- Zero external database dependency out of the box\n- Live reload command without restarting',
  },
  {
    label: '+ Commands & Perms',
    snippet:
      '\n\n## Commands & Permissions\n- /plugin reload — Reloads configuration (plugin.admin)\n- /plugin info — Displays active module status (plugin.info)',
  },
  {
    label: '+ Install & Config',
    snippet:
      '\n\n## Installation\n1. Place the .jar file inside your /plugins folder.\n2. Restart the server to generate config.yml.\n3. Customize messages and thresholds as needed.',
  },
];

const QUICK_PRICE_PRESETS = ['Free', '$4.99', '$9.99', 'Open Source'] as const;
const QUICK_MC_VERSIONS = ['1.21.4', '1.21.1', '1.20.4', '1.19.4'] as const;

export const BuiltByBitResourceForm: React.FC<BuiltByBitResourceFormProps> = ({
  mode,
  authorDisplayName,
  values,
  onChange,
  onSubmit,
  submitting,
  error,
  success,
}) => {
  const iconInputRef = useRef<HTMLInputElement>(null);
  const archiveInputRef = useRef<HTMLInputElement>(null);

  const [iconProcessing, setIconProcessing] = useState(false);
  const [iconStatus, setIconStatus] = useState('');
  const [iconError, setIconError] = useState('');
  const [showIconUrlInput, setShowIconUrlInput] = useState(false);
  const [iconDragActive, setIconDragActive] = useState(false);
  const [archiveDragActive, setArchiveDragActive] = useState(false);
  const [previewTab, setPreviewTab] = useState<'card' | 'header'>('card');

  const isOwnerMode = mode === 'owner';
  const idPrefix = isOwnerMode ? 'bbb-own' : 'bbb-sub';

  const handleIconFile = async (file: File | null) => {
    if (!file) return;
    setIconError('');
    setIconStatus('');
    setIconProcessing(true);
    try {
      const processed = await processPluginIconFile(file);
      if (!processed.ok) {
        setIconError(processed.error);
        return;
      }
      onChange({ iconUrl: processed.dataUrl });
      setIconStatus(
        `Optimized square logo (${processed.dimensions}, ${formatBytes(processed.sizeBytes)})`
      );
      setShowIconUrlInput(false);
    } finally {
      setIconProcessing(false);
      if (iconInputRef.current) {
        iconInputRef.current.value = '';
      }
    }
  };

  const handleArchiveFile = (file: File | null) => {
    if (!file) return;
    onChange({ file });
  };

  const togglePlatform = (plat: string) => {
    const exists = values.platforms.includes(plat);
    if (exists) {
      if (values.platforms.length > 1) {
        onChange({ platforms: values.platforms.filter((p) => p !== plat) });
      }
    } else {
      onChange({ platforms: [...values.platforms, plat] });
    }
  };

  const appendMcVersion = (ver: string) => {
    const existing = values.mcVersions
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!existing.includes(ver)) {
      onChange({ mcVersions: [...existing, ver].join(', ') });
    }
  };

  const appendOverviewSnippet = (snippet: string) => {
    const next = values.description.trim()
      ? `${values.description.trimEnd()}${snippet}`
      : snippet.trimStart();
    onChange({ description: next });
  };

  const parsedMcVersions = values.mcVersions
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  const previewName = values.name.trim() || 'Untitled Resource';
  const previewTagline =
    values.tagline.trim() ||
    'Short summary explaining what your plugin does for Minecraft servers.';
  const previewVersion = values.version.trim() || '1.0.0';
  const previewPrice = values.priceLabel.trim() || 'Free';
  const previewAuthor = authorDisplayName || (isOwnerMode ? 'drminemc' : 'Developer');
  const iconCheck = validatePluginIconUrl(values.iconUrl);

  const hasValidIdentity = values.name.trim().length >= 2 && values.tagline.trim().length >= 6;
  const hasValidOverview = values.description.trim().length >= 10;
  const hasCompatibility = values.platforms.length > 0 && parsedMcVersions.length > 0;
  const hasArchive = Boolean(values.file);

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT: BuiltByBit Resource Upload Controller */}
      <div className="lg:col-span-8 st-card p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--st-accent-text)' }}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {isOwnerMode
                  ? 'BuiltByBit Resource Studio · Direct Publish'
                  : 'BuiltByBit Resource Submission'}
              </span>
            </div>
            <h2 className="text-lg font-bold mt-0.5" style={{ color: 'var(--st-text)' }}>
              {isOwnerMode ? 'Create & Publish Plugin Resource' : 'Submit Plugin for Owner Approval'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--st-text-muted)' }}>
              {isOwnerMode
                ? 'Upload a square resource logo, configure compatibility tags, write documentation, and attach a verified .jar or .zip release.'
                : `Configure your BuiltByBit resource listing and archive. Submissions enter the Owner queue (${OWNER_EMAIL}).`}
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500"
          >
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* SECTION 1: ICON & CORE IDENTITY */}
        <section className="pt-5 border-t space-y-4" style={{ borderColor: 'var(--st-border)' }}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--st-text-muted)' }}>
              1. Resource Icon &amp; Primary Details
            </h3>
            <span className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
              Recommended square PNG / WebP / JPG
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Interactive Icon Drop Slot */}
            <div className="flex items-start gap-3.5 shrink-0">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIconDragActive(true);
                }}
                onDragLeave={() => setIconDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIconDragActive(false);
                  void handleIconFile(e.dataTransfer.files?.[0] || null);
                }}
                className="relative group"
              >
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  className="relative rounded-xl overflow-hidden cursor-pointer focus:outline-none"
                  style={{
                    outline: iconDragActive ? '2px solid var(--st-accent)' : undefined,
                  }}
                  title="Upload plugin icon logo"
                  aria-label="Upload plugin icon logo"
                >
                  <PluginLogo name={previewName} iconUrl={values.iconUrl} size="xl" className="!w-20 !h-20" />
                  <span
                    className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-semibold text-white gap-0.5"
                  >
                    {iconProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImagePlus className="w-4 h-4" />
                    )}
                    <span>{values.iconUrl ? 'Change' : 'Upload'}</span>
                  </span>
                </button>
                <input
                  ref={iconInputRef}
                  id={`${idPrefix}-icon-file`}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => void handleIconFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>

              <div className="space-y-1.5 min-w-[175px]">
                <div className="text-xs font-semibold" style={{ color: 'var(--st-text)' }}>
                  Plugin Icon / Logo
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={iconProcessing}
                    onClick={() => iconInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 st-btn-secondary text-[11px] font-semibold cursor-pointer"
                  >
                    {iconProcessing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ImagePlus className="w-3 h-3" />
                    )}
                    <span>{values.iconUrl ? 'Replace Logo' : 'Upload Logo'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowIconUrlInput((v) => !v)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 st-btn-secondary text-[11px] font-semibold cursor-pointer"
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>{showIconUrlInput ? 'Hide URL' : 'Image URL'}</span>
                  </button>
                  {values.iconUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        onChange({ iconUrl: '' });
                        setIconStatus('');
                        setIconError('');
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 st-btn-secondary text-[11px] text-rose-500 cursor-pointer"
                      aria-label="Remove plugin icon"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                  {iconStatus || (values.iconUrl ? 'Custom icon attached' : 'Monogram fallback active')}
                </div>
              </div>
            </div>

            {/* Resource Title & Category */}
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor={`${idPrefix}-name`}
                  className="block text-xs font-medium mb-1"
                  style={{ color: 'var(--st-text-secondary)' }}
                >
                  Resource Name
                </label>
                <input
                  id={`${idPrefix}-name`}
                  type="text"
                  required
                  value={values.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  placeholder="e.g. SurgeGuard AC"
                  className="w-full px-3 py-2 st-surface-inset text-sm"
                  style={{ color: 'var(--st-text)' }}
                />
              </div>

              <div>
                <label
                  htmlFor={`${idPrefix}-cat`}
                  className="block text-xs font-medium mb-1"
                  style={{ color: 'var(--st-text-secondary)' }}
                >
                  Category
                </label>
                <select
                  id={`${idPrefix}-cat`}
                  value={values.category}
                  onChange={(e) => onChange({ category: e.target.value as PluginCategory })}
                  className="w-full px-3 py-2 st-surface-inset text-sm cursor-pointer"
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
                <label
                  htmlFor={`${idPrefix}-price`}
                  className="block text-xs font-medium mb-1"
                  style={{ color: 'var(--st-text-secondary)' }}
                >
                  Price / License Tag
                </label>
                <input
                  id={`${idPrefix}-price`}
                  type="text"
                  value={values.priceLabel}
                  onChange={(e) => onChange({ priceLabel: e.target.value })}
                  placeholder="Free"
                  className="w-full px-3 py-2 st-surface-inset text-sm"
                  style={{ color: 'var(--st-text)' }}
                />
              </div>
            </div>
          </div>

          {showIconUrlInput && (
            <div className="space-y-1">
              <label
                htmlFor={`${idPrefix}-icon-url`}
                className="block text-xs font-medium"
                style={{ color: 'var(--st-text-secondary)' }}
              >
                Direct HTTPS Image URL (PNG, JPG, WebP)
              </label>
              <input
                id={`${idPrefix}-icon-url`}
                type="url"
                value={values.iconUrl.startsWith('data:') ? '' : values.iconUrl}
                onChange={(e) => {
                  setIconError('');
                  setIconStatus('');
                  onChange({ iconUrl: e.target.value });
                }}
                placeholder="https://example.com/plugin-icon.png"
                className="w-full px-3 py-2 st-surface-inset text-xs font-mono"
                style={{ color: 'var(--st-text)' }}
              />
            </div>
          )}

          {(iconError || (!iconCheck.ok && values.iconUrl.trim())) && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
              {iconError || (!iconCheck.ok ? iconCheck.error : '')}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                Quick price tags:
              </span>
              {QUICK_PRICE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange({ priceLabel: preset })}
                  className="px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors"
                  style={{
                    backgroundColor:
                      values.priceLabel === preset ? 'var(--st-accent-soft)' : 'var(--st-surface-inset)',
                    border:
                      values.priceLabel === preset
                        ? '1px solid var(--st-border-strong)'
                        : '1px solid var(--st-border)',
                    color:
                      values.priceLabel === preset ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={`${idPrefix}-tagline`}
                className="block text-xs font-medium"
                style={{ color: 'var(--st-text-secondary)' }}
              >
                Tagline (one-line summary displayed on marketplace cards)
              </label>
              <span className="text-[11px] tabular-nums" style={{ color: 'var(--st-text-muted)' }}>
                {values.tagline.length}/160
              </span>
            </div>
            <input
              id={`${idPrefix}-tagline`}
              type="text"
              required
              maxLength={160}
              value={values.tagline}
              onChange={(e) => onChange({ tagline: e.target.value })}
              placeholder="High-TPS anti-cheat and packet validation for Paper & Folia servers."
              className="w-full px-3 py-2 st-surface-inset text-sm"
              style={{ color: 'var(--st-text)' }}
            />
          </div>
        </section>

        {/* SECTION 2: COMPATIBILITY & VERSIONING */}
        <section className="pt-5 border-t space-y-4" style={{ borderColor: 'var(--st-border)' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--st-text-muted)' }}>
            2. Compatibility, Versions &amp; Support
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor={`${idPrefix}-ver`}
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--st-text-secondary)' }}
              >
                Version String
              </label>
              <input
                id={`${idPrefix}-ver`}
                type="text"
                required
                value={values.version}
                onChange={(e) => onChange({ version: e.target.value })}
                placeholder="1.0.0"
                className="w-full px-3 py-2 st-surface-inset font-mono text-sm"
                style={{ color: 'var(--st-text)' }}
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor={`${idPrefix}-mc`}
                  className="block text-xs font-medium"
                  style={{ color: 'var(--st-text-secondary)' }}
                >
                  Tested Minecraft Versions
                </label>
                <div className="flex flex-wrap gap-1">
                  {QUICK_MC_VERSIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => appendMcVersion(v)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer"
                      style={{
                        backgroundColor: 'var(--st-surface-inset)',
                        border: '1px solid var(--st-border)',
                        color: 'var(--st-accent-text)',
                      }}
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              </div>
              <input
                id={`${idPrefix}-mc`}
                type="text"
                value={values.mcVersions}
                onChange={(e) => onChange({ mcVersions: e.target.value })}
                placeholder="1.20.4, 1.21.1, 1.21.4"
                className="w-full px-3 py-2 st-surface-inset font-mono text-sm"
                style={{ color: 'var(--st-text)' }}
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium mb-2" style={{ color: 'var(--st-text-secondary)' }}>
              Supported Server Software
            </span>
            <div className="flex flex-wrap gap-2">
              {PLUGIN_PLATFORMS.map((plat) => {
                const active = values.platforms.includes(plat);
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
            <label
              htmlFor={`${idPrefix}-support`}
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--st-text-secondary)' }}
            >
              Discord / Wiki / Documentation URL (optional)
            </label>
            <input
              id={`${idPrefix}-support`}
              type="url"
              value={values.supportUrl}
              onChange={(e) => onChange({ supportUrl: e.target.value })}
              placeholder="https://discord.gg/..."
              className="w-full px-3 py-2 st-surface-inset text-sm"
              style={{ color: 'var(--st-text)' }}
            />
          </div>
        </section>

        {/* SECTION 3: OVERVIEW & RELEASE NOTES */}
        <section className="pt-5 border-t space-y-4" style={{ borderColor: 'var(--st-border)' }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--st-text-muted)' }}>
              3. Resource Overview &amp; Release Notes
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {OVERVIEW_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => appendOverviewSnippet(tpl.snippet)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium cursor-pointer"
                  style={{
                    backgroundColor: 'var(--st-surface-inset)',
                    border: '1px solid var(--st-border)',
                    color: 'var(--st-accent-text)',
                  }}
                >
                  <ListPlus className="w-3 h-3" />
                  <span>{tpl.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor={`${idPrefix}-desc`}
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--st-text-secondary)' }}
            >
              Overview Documentation
            </label>
            <textarea
              id={`${idPrefix}-desc`}
              rows={6}
              required
              value={values.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Describe features, installation instructions, commands, permissions, and configuration options..."
              className="w-full p-3 st-surface-inset text-sm leading-relaxed"
              style={{ color: 'var(--st-text)' }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={`${idPrefix}-rel-title`}
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--st-text-secondary)' }}
              >
                Release Title (optional)
              </label>
              <input
                id={`${idPrefix}-rel-title`}
                type="text"
                value={values.releaseTitle}
                onChange={(e) => onChange({ releaseTitle: e.target.value })}
                placeholder={
                  isOwnerMode
                    ? `Initial Release v${previewVersion}`
                    : `Submission v${previewVersion}`
                }
                className="w-full px-3 py-2 st-surface-inset text-sm"
                style={{ color: 'var(--st-text)' }}
              />
            </div>
            <div>
              <label
                htmlFor={`${idPrefix}-changelog`}
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--st-text-secondary)' }}
              >
                Version Changelog
              </label>
              <input
                id={`${idPrefix}-changelog`}
                type="text"
                value={values.changelog}
                onChange={(e) => onChange({ changelog: e.target.value })}
                placeholder="Initial release notes..."
                className="w-full px-3 py-2 st-surface-inset text-sm"
                style={{ color: 'var(--st-text)' }}
              />
            </div>
          </div>
        </section>

        {/* SECTION 4: PLUGIN ARCHIVE DROPZONE & SUBMIT */}
        <section className="pt-5 border-t space-y-4" style={{ borderColor: 'var(--st-border)' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--st-text-muted)' }}>
            4. Binary Package (.jar or .zip)
          </h3>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArchiveDragActive(true);
            }}
            onDragLeave={() => setArchiveDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArchiveDragActive(false);
              handleArchiveFile(e.dataTransfer.files?.[0] || null);
            }}
            className="p-5 rounded-xl st-surface-inset flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
            style={{
              border: archiveDragActive
                ? '1px dashed var(--st-accent)'
                : '1px dashed var(--st-border-strong)',
            }}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: 'var(--st-accent-soft)',
                  color: 'var(--st-accent-text)',
                }}
              >
                <FileArchive className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                {values.file ? (
                  <>
                    <div className="text-xs font-bold truncate" style={{ color: 'var(--st-success)' }}>
                      {values.file.name}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums" style={{ color: 'var(--st-text-muted)' }}>
                      {formatBytes(values.file.size)} · Ready for upload
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-semibold" style={{ color: 'var(--st-text)' }}>
                      Drop your .jar or .zip build here, or browse files
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                      Max 25 MB (15 MB on static hosting) · ZIP magic header verified
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => archiveInputRef.current?.click()}
                className="px-3.5 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
              >
                {values.file ? 'Replace Archive' : 'Choose .jar / .zip'}
              </button>
              {values.file && (
                <button
                  type="button"
                  onClick={() => {
                    onChange({ file: null });
                    if (archiveInputRef.current) archiveInputRef.current.value = '';
                  }}
                  className="p-2 st-btn-secondary text-rose-500 cursor-pointer"
                  aria-label="Clear selected archive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <input
                ref={archiveInputRef}
                id={`${idPrefix}-file`}
                type="file"
                accept=".jar,.zip"
                onChange={(e) => handleArchiveFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            {isOwnerMode ? (
              <label
                className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer"
                style={{ color: 'var(--st-text-secondary)' }}
              >
                <input
                  type="checkbox"
                  checked={values.featured}
                  onChange={(e) => onChange({ featured: e.target.checked })}
                  className="w-4 h-4 accent-[var(--st-accent)]"
                />
                <span>Feature this resource at the top of the Plugins directory</span>
              </label>
            ) : (
              <span className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                Reviewed by {OWNER_EMAIL} before public listing.
              </span>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 st-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>
                {submitting
                  ? isOwnerMode
                    ? 'Publishing Resource…'
                    : 'Submitting for Approval…'
                  : isOwnerMode
                  ? 'Upload & Publish Plugin'
                  : 'Submit Plugin for Approval'}
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* RIGHT: LIVE BUILTBYBIT PREVIEW & CHECKLIST */}
      <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
        <div className="st-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--st-text-muted)' }}>
              Live BuiltByBit Preview
            </span>
            <div className="flex gap-1" role="group" aria-label="Preview layout">
              {(
                [
                  { id: 'card', label: 'Card' },
                  { id: 'header', label: 'Header' },
                ] as const
              ).map((t) => {
                const active = previewTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPreviewTab(t.id)}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer"
                    style={{
                      backgroundColor: active ? 'var(--st-accent-soft)' : 'var(--st-surface-inset)',
                      color: active ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
                      border: active
                        ? '1px solid var(--st-border-strong)'
                        : '1px solid var(--st-border)',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {previewTab === 'card' ? (
            <div className="p-4 rounded-xl st-surface-inset space-y-3" data-testid="bbb-live-card-preview">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-3 min-w-0">
                  <PluginLogo name={previewName} iconUrl={values.iconUrl} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold truncate" style={{ color: 'var(--st-text)' }}>
                        {previewName}
                      </span>
                      {values.featured && <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400" />}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                      {values.category} ·{' '}
                      <span className="font-mono" style={{ color: 'var(--st-success)' }}>
                        v{previewVersion}
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
                  {previewPrice}
                </span>
              </div>

              <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--st-text-secondary)' }}>
                {previewTagline}
              </p>

              <div className="flex flex-wrap gap-1.5 text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                {values.platforms.slice(0, 3).map((plat) => (
                  <span key={plat}>{plat}</span>
                ))}
                {parsedMcVersions.slice(0, 2).map((ver) => (
                  <span key={ver} className="font-mono" style={{ color: 'var(--st-accent-text)' }}>
                    · {ver}
                  </span>
                ))}
              </div>

              <div
                className="pt-2.5 border-t flex items-center justify-between text-[11px] tabular-nums"
                style={{ borderColor: 'var(--st-border)', color: 'var(--st-text-muted)' }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>—</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Download className="w-3 h-3" style={{ color: 'var(--st-accent-text)' }} />
                    <span>0</span>
                  </span>
                </div>
                <span className="font-mono">
                  {values.file ? formatBytes(values.file.size) : 'No archive'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl st-surface-inset space-y-3" data-testid="bbb-live-header-preview">
              <div className="flex items-start gap-3">
                <PluginLogo name={previewName} iconUrl={values.iconUrl} size="lg" />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-base font-bold leading-tight" style={{ color: 'var(--st-text)' }}>
                      {previewName}
                    </span>
                    <span className="font-mono text-[11px]" style={{ color: 'var(--st-success)' }}>
                      v{previewVersion}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                      style={{
                        backgroundColor: 'var(--st-accent-soft)',
                        color: 'var(--st-accent-text)',
                      }}
                    >
                      {previewPrice}
                    </span>
                  </div>
                  <p className="text-xs leading-snug" style={{ color: 'var(--st-text-secondary)' }}>
                    {previewTagline}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--st-accent-text)' }} />
                    <span>By {previewAuthor}</span>
                    <span>·</span>
                    <span>{values.category}</span>
                  </div>
                </div>
              </div>
              <div
                className="pt-2.5 border-t flex items-center justify-between text-[11px]"
                style={{ borderColor: 'var(--st-border)', color: 'var(--st-text-muted)' }}
              >
                <span className="truncate font-mono">
                  {values.file ? values.file.name : `${previewName.toLowerCase().replace(/\s+/g, '-') || 'plugin'}.jar`}
                </span>
                <span className="font-semibold" style={{ color: 'var(--st-accent-text)' }}>
                  Download
                </span>
              </div>
            </div>
          )}

          {/* Pre-publish Checklist */}
          <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--st-border)' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--st-text-muted)' }}>
              Release Readiness
            </div>
            {[
              {
                label: values.iconUrl ? 'Custom square icon uploaded' : 'Icon ready (using monogram)',
                ok: true,
              },
              { label: 'Title & tagline valid', ok: hasValidIdentity },
              { label: 'Platform & MC versions selected', ok: hasCompatibility },
              { label: 'Overview documentation (10+ chars)', ok: hasValidOverview },
              { label: 'Binary .jar or .zip attached', ok: hasArchive },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2 text-xs">
                <CheckCircle2
                  className="w-3.5 h-3.5 shrink-0"
                  style={{
                    color: row.ok ? 'var(--st-success)' : 'var(--st-text-muted)',
                    opacity: row.ok ? 1 : 0.4,
                  }}
                />
                <span style={{ color: row.ok ? 'var(--st-text-secondary)' : 'var(--st-text-muted)' }}>
                  {row.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </form>
  );
};
