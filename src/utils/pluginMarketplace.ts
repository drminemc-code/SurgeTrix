export const OWNER_EMAIL = 'drminemc@gmail.com';

export const PLUGIN_CATEGORIES = [
  'All Categories',
  'Anti-Cheat',
  'Economy',
  'Administration',
  'Mechanics',
  'Optimization',
  'Chat & Social',
  'Minigames',
  'Developer API',
] as const;

export type PluginCategory = Exclude<(typeof PLUGIN_CATEGORIES)[number], 'All Categories'>;

export const PLUGIN_PLATFORMS = [
  'Paper',
  'Purpur',
  'Folia',
  'Spigot',
  'Velocity',
  'BungeeCord',
] as const;

export type PluginPlatform = (typeof PLUGIN_PLATFORMS)[number];
export type PluginSortBy = 'downloads' | 'rating' | 'updated' | 'newest';

export const MAX_PLUGIN_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_PLUGIN_EXTENSIONS = ['.jar', '.zip'] as const;

export interface PluginVersionRecord {
  id: string;
  version: string;
  title: string;
  changelog: string;
  fileName: string;
  storedFileName: string;
  fileSize: number;
  sha256: string;
  downloads: number;
  createdAt: string;
}

export interface PluginReviewRecord {
  id: string;
  pluginId: string;
  authorUid: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  testedVersion: string;
  ownerReply?: string;
  ownerRepliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PluginListing {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: PluginCategory;
  platforms: string[];
  mcVersions: string[];
  priceLabel: string;
  featured: boolean;
  status: 'published' | 'pending' | 'hidden';
  authorName: string;
  authorEmail: string;
  currentVersion: string;
  fileName: string;
  storedFileName: string;
  fileSize: number;
  sha256: string;
  supportUrl: string;
  downloads: number;
  ratingAverage: number;
  reviewsCount: number;
  versions: PluginVersionRecord[];
  reviews: PluginReviewRecord[];
  createdAt: string;
  updatedAt: string;
}

export function isOwnerUser(
  user: { email?: string | null; emailVerified?: boolean } | null | undefined
): boolean {
  if (!user || user.emailVerified !== true || typeof user.email !== 'string') {
    return false;
  }
  return user.email.trim().toLowerCase() === OWNER_EMAIL;
}

export function slugifyPluginId(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'plugin';
}

export function sanitizeDownloadFilename(rawName: string): string {
  const base = rawName.split(/[/\\]/).pop() || 'plugin.jar';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^\.+/, '');
  const lower = cleaned.toLowerCase();
  if (lower.endsWith('.jar') || lower.endsWith('.zip')) {
    return cleaned.slice(0, 120);
  }
  return `${cleaned.slice(0, 115) || 'plugin'}.jar`;
}

export function validatePluginFileMeta(
  filename: string,
  sizeBytes: number,
  magicBytes?: Uint8Array | Buffer
): { ok: true; extension: '.jar' | '.zip'; safeName: string } | { ok: false; error: string } {
  const base = filename.trim().split(/[/\\]/).pop() || '';
  const rawLower = base.toLowerCase();
  const ext = rawLower.endsWith('.jar') ? '.jar' : rawLower.endsWith('.zip') ? '.zip' : null;
  if (!ext) {
    return { ok: false, error: 'Only .jar and .zip plugin archive files are allowed.' };
  }
  const safeName = sanitizeDownloadFilename(base);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: 'Plugin file cannot be empty.' };
  }
  if (sizeBytes > MAX_PLUGIN_FILE_BYTES) {
    return { ok: false, error: 'Plugin file exceeds the 25 MB maximum upload limit.' };
  }
  if (magicBytes) {
    if (magicBytes.length < 4 || magicBytes[0] !== 0x50 || magicBytes[1] !== 0x4b) {
      return {
        ok: false,
        error: 'Invalid archive header. Upload a valid .jar or .zip package.',
      };
    }
  }
  return { ok: true, extension: ext, safeName };
}

export function validatePluginPayload(input: {
  name?: unknown;
  tagline?: unknown;
  description?: unknown;
  category?: unknown;
  version?: unknown;
  platforms?: unknown;
  mcVersions?: unknown;
  priceLabel?: unknown;
  supportUrl?: unknown;
}):
  | {
      ok: true;
      data: {
        name: string;
        tagline: string;
        description: string;
        category: PluginCategory;
        version: string;
        platforms: string[];
        mcVersions: string[];
        priceLabel: string;
        supportUrl: string;
      };
    }
  | { ok: false; error: string } {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length < 2 || name.length > 64) {
    return { ok: false, error: 'Plugin name must be between 2 and 64 characters.' };
  }

  const tagline = typeof input.tagline === 'string' ? input.tagline.trim() : '';
  if (tagline.length < 6 || tagline.length > 160) {
    return { ok: false, error: 'Tagline must be between 6 and 160 characters.' };
  }

  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (description.length < 10 || description.length > 10000) {
    return { ok: false, error: 'Overview description must be between 10 and 10,000 characters.' };
  }

  const rawCategory = typeof input.category === 'string' ? input.category.trim() : '';
  const validCategories = PLUGIN_CATEGORIES.filter((c) => c !== 'All Categories') as PluginCategory[];
  const category = validCategories.includes(rawCategory as PluginCategory)
    ? (rawCategory as PluginCategory)
    : 'Administration';

  const version = typeof input.version === 'string' ? input.version.trim() : '';
  if (!/^[a-zA-Z0-9._-]{1,24}$/.test(version)) {
    return { ok: false, error: 'Version must be 1–24 characters (e.g. 1.0.0).' };
  }

  const platformsInput = Array.isArray(input.platforms) ? input.platforms : [];
  const platforms = platformsInput
    .map((p) => String(p).trim())
    .filter((p) => (PLUGIN_PLATFORMS as readonly string[]).includes(p))
    .slice(0, 6);
  if (platforms.length === 0) {
    return { ok: false, error: 'Select at least one supported server platform.' };
  }

  const mcRaw = Array.isArray(input.mcVersions)
    ? input.mcVersions.map((v) => String(v).trim())
    : typeof input.mcVersions === 'string'
    ? input.mcVersions.split(',').map((v) => v.trim())
    : [];
  const mcVersions = mcRaw.filter((v) => v.length >= 2 && v.length <= 20).slice(0, 12);
  if (mcVersions.length === 0) {
    mcVersions.push('1.21.4');
  }

  const rawPrice = typeof input.priceLabel === 'string' ? input.priceLabel.trim().slice(0, 24) : '';
  const priceLabel = rawPrice || 'Free';

  let supportUrl = '';
  if (typeof input.supportUrl === 'string' && input.supportUrl.trim()) {
    const candidate = input.supportUrl.trim();
    if (!/^https?:\/\/[^\s]+$/i.test(candidate) || candidate.length > 256) {
      return { ok: false, error: 'Support URL must start with http:// or https://.' };
    }
    supportUrl = candidate;
  }

  return {
    ok: true,
    data: {
      name,
      tagline,
      description,
      category,
      version,
      platforms,
      mcVersions,
      priceLabel,
      supportUrl,
    },
  };
}

export function validateReviewPayload(input: {
  rating?: unknown;
  title?: unknown;
  comment?: unknown;
  testedVersion?: unknown;
}):
  | { ok: true; data: { rating: number; title: string; comment: string; testedVersion: string } }
  | { ok: false; error: string } {
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'Rating must be a whole number from 1 to 5 stars.' };
  }
  const title = typeof input.title === 'string' ? input.title.trim().slice(0, 80) : '';
  const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
  if (comment.length < 4 || comment.length > 1500) {
    return { ok: false, error: 'Review comment must be between 4 and 1,500 characters.' };
  }
  const testedVersion =
    typeof input.testedVersion === 'string' && input.testedVersion.trim()
      ? input.testedVersion.trim().slice(0, 24)
      : 'Latest';

  return {
    ok: true,
    data: {
      rating,
      title: title || `${rating}/5 Review`,
      comment,
      testedVersion,
    },
  };
}

export function computeRatingBreakdown(reviews: Pick<PluginReviewRecord, 'rating'>[]): {
  average: number;
  count: number;
  countsByStar: Record<1 | 2 | 3 | 4 | 5, number>;
} {
  const countsByStar: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (reviews.length === 0) {
    return { average: 0, count: 0, countsByStar };
  }
  let sum = 0;
  let validCount = 0;
  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    countsByStar[star] += 1;
    sum += star;
    validCount += 1;
  }
  const average = Math.round((sum / validCount) * 10) / 10;
  return { average, count: validCount, countsByStar };
}

export function filterAndSortPlugins(
  plugins: PluginListing[],
  options: {
    search?: string;
    category?: string;
    platform?: string;
    sortBy?: PluginSortBy;
    includeHidden?: boolean;
  } = {}
): PluginListing[] {
  const {
    search = '',
    category = 'All Categories',
    platform = 'All',
    sortBy = 'downloads',
    includeHidden = false,
  } = options;
  const q = search.trim().toLowerCase();
  const platLower = platform.trim().toLowerCase();

  const filtered = plugins.filter((pl) => {
    if (!includeHidden && pl.status !== 'published') return false;
    if (category && category !== 'All Categories' && pl.category !== category) return false;
    if (
      platLower &&
      platLower !== 'all' &&
      !pl.platforms.some((p) => p.toLowerCase() === platLower)
    ) {
      return false;
    }
    if (!q) return true;
    return (
      pl.name.toLowerCase().includes(q) ||
      pl.tagline.toLowerCase().includes(q) ||
      pl.description.toLowerCase().includes(q) ||
      pl.category.toLowerCase().includes(q) ||
      pl.mcVersions.some((v) => v.toLowerCase().includes(q)) ||
      pl.platforms.some((p) => p.toLowerCase().includes(q))
    );
  });

  return [...filtered].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (sortBy === 'rating') {
      if (b.ratingAverage !== a.ratingAverage) return b.ratingAverage - a.ratingAverage;
      return b.reviewsCount - a.reviewsCount;
    }
    if (sortBy === 'updated') {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (b.downloads !== a.downloads) return b.downloads - a.downloads;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
