import test from 'node:test';
import assert from 'node:assert/strict';
import {
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
  validateCommunityRequestPayload,
} from './ownerModeration';
import { PluginListing } from './pluginMarketplace';

const basePlugin: PluginListing = {
  id: 'p1',
  slug: 'p1',
  name: 'SurgeGuard',
  tagline: 'Packet protection for Paper servers',
  description: 'Comprehensive anti-exploit module.',
  category: 'Anti-Cheat',
  platforms: ['Paper', 'Purpur'],
  mcVersions: ['1.21.4'],
  priceLabel: 'Free',
  featured: false,
  status: 'published',
  authorName: 'drminemc',
  authorEmail: '',
  currentVersion: '1.0.0',
  fileName: 'SurgeGuard.jar',
  storedFileName: 'p1.jar',
  fileSize: 8192,
  sha256: 'abc123',
  supportUrl: '',
  downloads: 42,
  ratingAverage: 5,
  reviewsCount: 1,
  versions: [],
  reviews: [
    {
      id: 'rev-1',
      pluginId: 'p1',
      authorUid: 'u2',
      authorName: 'TestPlayer',
      rating: 5,
      title: 'Great plugin',
      comment: 'Works smoothly without TPS drop.',
      testedVersion: '1.21.4',
      createdAt: '2026-11-22T10:00:00.000Z',
      updatedAt: '2026-11-22T10:00:00.000Z',
    },
  ],
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-22T10:00:00.000Z',
};

test('canAccessOwnerDashboard and getOwnerAccessStatus strictly filter against drminemc@gmail.com', () => {
  assert.equal(canAccessOwnerDashboard({ email: 'drminemc@gmail.com', emailVerified: true }), true);
  assert.equal(canAccessOwnerDashboard({ email: ' DRMINEMC@GMAIL.COM ', emailVerified: true }), true);
  assert.equal(canAccessOwnerDashboard({ email: 'drminemc@gmail.com', emailVerified: false }), false);
  assert.equal(canAccessOwnerDashboard({ email: 'other@gmail.com', emailVerified: true }), false);
  assert.equal(canAccessOwnerDashboard(null), false);

  assert.equal(getOwnerAccessStatus(null), 'unauthenticated');
  assert.equal(getOwnerAccessStatus({ email: 'other@gmail.com', emailVerified: true }), 'unauthorized_user');
  assert.equal(getOwnerAccessStatus({ email: 'drminemc@gmail.com', emailVerified: false }), 'unverified_owner');
  assert.equal(getOwnerAccessStatus({ email: 'drminemc@gmail.com', emailVerified: true }), 'authorized');
});

test('getPendingPlugins filters pending submissions and supports search', () => {
  const pending1: PluginListing = {
    ...basePlugin,
    id: 'p-pend-1',
    name: 'CommunityVault',
    status: 'pending',
    authorName: 'DevAlex',
    createdAt: '2026-11-21T10:00:00.000Z',
  };
  const pending2: PluginListing = {
    ...basePlugin,
    id: 'p-pend-2',
    name: 'SkyEconomy',
    status: 'pending',
    authorName: 'BuilderSam',
    createdAt: '2026-11-22T12:00:00.000Z',
  };
  const hidden: PluginListing = { ...basePlugin, id: 'p-hid', status: 'hidden' };

  const allPending = getPendingPlugins([basePlugin, pending1, pending2, hidden]);
  assert.deepEqual(
    allPending.map((p) => p.id),
    ['p-pend-2', 'p-pend-1']
  );

  const searchResult = getPendingPlugins([basePlugin, pending1, pending2, hidden], 'alex');
  assert.deepEqual(
    searchResult.map((p) => p.id),
    ['p-pend-1']
  );
});

test('flattenPluginReviews and moderation filters compute accurate counts', () => {
  const reviews = flattenPluginReviews([basePlugin]);
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].pluginName, 'SurgeGuard');

  const requests = [
    {
      id: 'r1',
      title: 'Spam link',
      description: 'Join discord.gg/fake for free nitro',
      category: 'Minecraft Tools',
      author: 'Spammer',
      votes: 1,
      status: 'Under Review' as const,
      createdAt: 'Just now',
    },
    {
      id: 'r2',
      title: 'Chunk Loader Calculator',
      description: 'Calculate chunk border loading limits cleanly.',
      category: 'Player Utilities',
      author: 'Builder',
      votes: 10,
      status: 'Planned' as const,
      createdAt: '1 day ago',
    },
  ];
  assert.equal(filterModerationRequests(requests, 'discord').length, 1);
  assert.equal(hasExternalLinkOrKeywordFlag(requests[0].description), true);
  assert.equal(hasExternalLinkOrKeywordFlag(requests[1].description), false);

  assert.equal(
    filterModerationServers(
      [
        {
          id: 's1',
          name: 'SurvivalSMP',
          ip: 'play.example.org',
          edition: 'Java',
          category: 'Survival SMP',
          status: 'Online',
          playersOnline: 12,
          maxPlayers: 100,
          version: '1.21.4',
          rating: null,
          reviewsCount: 0,
          likes: 0,
          motd: '',
        },
      ],
      'survival'
    ).length,
    1
  );

  assert.equal(
    filterModerationDomains(
      [
        {
          handle: 'smp',
          serverName: 'SMP',
          targetHost: '1.2.3.4',
          targetPort: 25565,
          edition: 'Java',
          dnsStatus: 'active',
        },
      ],
      'smp'
    ).length,
    1
  );

  assert.equal(
    filterModerationResources(
      [
        {
          id: 'mod1',
          kind: 'mods',
          name: 'Sodium',
          summary: 'FPS boost',
          author: 'JellySquid',
          downloads: 10,
          rating: 5,
          platforms: ['Fabric'],
          version: '0.6',
          officialUrl: 'https://modrinth.com',
        },
      ],
      'sodium'
    ).length,
    1
  );

  const summary = getOwnerDashboardSummary({
    plugins: [basePlugin, { ...basePlugin, id: 'p2', status: 'pending', reviews: [] }],
    communityRequests: requests,
    servers: [],
    domains: [],
    resources: [],
  });
  assert.equal(summary.pendingPluginsCount, 1);
  assert.equal(summary.publishedPluginsCount, 1);
  assert.equal(summary.totalReviewsCount, 1);
  assert.equal(summary.communityRequestsCount, 2);
});

test('validateCommunityRequestPayload enforces bounds cleanly', () => {
  assert.equal(validateCommunityRequestPayload({ title: 'ab', description: 'Too short' }).ok, false);
  const ok = validateCommunityRequestPayload({
    title: 'Armor Stand Pose Editor',
    description: 'Visual 3D armor stand rotation exporter for Java 1.21.',
    category: 'Minecraft Tools',
  });
  assert.equal(ok.ok, true);
});
