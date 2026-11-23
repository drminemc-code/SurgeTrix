import { CommunityRequest, ResourceItem, ServerListing } from '../data/catalog';
import { OWNER_EMAIL, PluginListing, PluginReviewRecord } from './pluginMarketplace';

export interface OwnerAuthCandidate {
  email?: string | null;
  emailVerified?: boolean | null;
}

export interface OwnerDomainEntry {
  handle: string;
  workingDomain?: string;
  connectAddress?: string;
  serverName: string;
  targetHost: string;
  targetPort: number;
  edition: 'Java' | 'Bedrock' | 'Crossplay';
  dnsStatus: string;
}

export interface FlattenedPluginReview {
  pluginId: string;
  pluginName: string;
  pluginSlug: string;
  review: PluginReviewRecord;
}

export interface OwnerDashboardSummary {
  pendingPluginsCount: number;
  publishedPluginsCount: number;
  hiddenPluginsCount: number;
  totalReviewsCount: number;
  communityRequestsCount: number;
  serversCount: number;
  domainsCount: number;
  resourcesCount: number;
  totalModerationItems: number;
}

/**
 * Filters the active user strictly against the verified Owner email (drminemc@gmail.com).
 */
export function canAccessOwnerDashboard(user: OwnerAuthCandidate | null | undefined): boolean {
  if (!user || user.emailVerified !== true || typeof user.email !== 'string') {
    return false;
  }
  return user.email.trim().toLowerCase() === OWNER_EMAIL;
}

export function getOwnerAccessStatus(user: OwnerAuthCandidate | null | undefined):
  | 'authorized'
  | 'unauthenticated'
  | 'unverified_owner'
  | 'unauthorized_user' {
  if (!user || typeof user.email !== 'string' || !user.email.trim()) {
    return 'unauthenticated';
  }
  if (user.email.trim().toLowerCase() !== OWNER_EMAIL) {
    return 'unauthorized_user';
  }
  return user.emailVerified === true ? 'authorized' : 'unverified_owner';
}

export function getPendingPlugins(plugins: PluginListing[], searchQuery = ''): PluginListing[] {
  const q = searchQuery.trim().toLowerCase();
  return plugins
    .filter((pl) => pl.status === 'pending')
    .filter((pl) => {
      if (!q) return true;
      return (
        pl.name.toLowerCase().includes(q) ||
        pl.tagline.toLowerCase().includes(q) ||
        pl.authorName.toLowerCase().includes(q) ||
        pl.category.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function flattenPluginReviews(
  plugins: PluginListing[],
  searchQuery = ''
): FlattenedPluginReview[] {
  const q = searchQuery.trim().toLowerCase();
  const rows: FlattenedPluginReview[] = [];
  for (const pl of plugins) {
    for (const rev of pl.reviews) {
      if (q) {
        const hay = `${pl.name} ${rev.title} ${rev.comment} ${rev.authorName}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      rows.push({
        pluginId: pl.id,
        pluginName: pl.name,
        pluginSlug: pl.slug,
        review: rev,
      });
    }
  }
  return rows.sort(
    (a, b) => new Date(b.review.createdAt).getTime() - new Date(a.review.createdAt).getTime()
  );
}

export function filterModerationRequests(
  requests: CommunityRequest[],
  searchQuery = ''
): CommunityRequest[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return requests;
  return requests.filter((req) =>
    `${req.title} ${req.description} ${req.author} ${req.category} ${req.status}`
      .toLowerCase()
      .includes(q)
  );
}

export function filterModerationServers(
  servers: ServerListing[],
  searchQuery = ''
): ServerListing[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return servers;
  return servers.filter((srv) =>
    `${srv.name} ${srv.ip} ${srv.category} ${srv.motd}`.toLowerCase().includes(q)
  );
}

export function filterModerationDomains(
  domains: OwnerDomainEntry[],
  searchQuery = ''
): OwnerDomainEntry[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return domains;
  return domains.filter((dom) =>
    `${dom.handle} ${dom.serverName} ${dom.targetHost} ${dom.connectAddress || ''}`
      .toLowerCase()
      .includes(q)
  );
}

export function filterModerationResources(
  resources: ResourceItem[],
  searchQuery = ''
): ResourceItem[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return resources;
  return resources.filter((res) =>
    `${res.name} ${res.summary} ${res.author} ${res.kind}`.toLowerCase().includes(q)
  );
}

export function getOwnerDashboardSummary(params: {
  plugins: PluginListing[];
  communityRequests: CommunityRequest[];
  servers: ServerListing[];
  domains: OwnerDomainEntry[];
  resources: ResourceItem[];
}): OwnerDashboardSummary {
  const pendingPluginsCount = params.plugins.filter((p) => p.status === 'pending').length;
  const publishedPluginsCount = params.plugins.filter((p) => p.status === 'published').length;
  const hiddenPluginsCount = params.plugins.filter((p) => p.status === 'hidden').length;
  const totalReviewsCount = params.plugins.reduce((acc, p) => acc + p.reviews.length, 0);
  const communityRequestsCount = params.communityRequests.length;
  const serversCount = params.servers.length;
  const domainsCount = params.domains.length;
  const resourcesCount = params.resources.length;

  return {
    pendingPluginsCount,
    publishedPluginsCount,
    hiddenPluginsCount,
    totalReviewsCount,
    communityRequestsCount,
    serversCount,
    domainsCount,
    resourcesCount,
    totalModerationItems:
      totalReviewsCount + communityRequestsCount + serversCount + domainsCount + resourcesCount,
  };
}

export const COMMUNITY_REQUEST_CATEGORIES = [
  'Minecraft Tools',
  'Server Owner Tools',
  'Player Utilities',
  'Developer Utilities',
] as const;

export function validateCommunityRequestPayload(input: {
  title?: unknown;
  description?: unknown;
  category?: unknown;
}):
  | { ok: true; data: { title: string; description: string; category: string } }
  | { ok: false; error: string } {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (title.length < 3 || title.length > 100) {
    return { ok: false, error: 'Request title must be between 3 and 100 characters.' };
  }
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (description.length < 10 || description.length > 1000) {
    return { ok: false, error: 'Request description must be between 10 and 1,000 characters.' };
  }
  const rawCategory = typeof input.category === 'string' ? input.category.trim() : '';
  const category = (COMMUNITY_REQUEST_CATEGORIES as readonly string[]).includes(rawCategory)
    ? rawCategory
    : 'Server Owner Tools';

  return {
    ok: true,
    data: { title, description, category },
  };
}

const FLAG_PATTERNS = [
  /\b(discord\.gg|bit\.ly|tinyurl|free\s*nitro|crypto|airdrop|nsfw|scam|hacked\s*client|ddos)\b/i,
  /https?:\/\/[^\s]+/i,
];

export function hasExternalLinkOrKeywordFlag(text: string): boolean {
  return FLAG_PATTERNS.some((rx) => rx.test(text));
}
