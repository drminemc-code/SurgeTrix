import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OWNER_EMAIL,
  PluginListing,
  computeRatingBreakdown,
  filterAndSortPlugins,
  formatBytes,
  isOwnerUser,
  sanitizeDownloadFilename,
  validatePluginFileMeta,
  validatePluginIconUrl,
  validatePluginPayload,
  validateReviewPayload,
} from './pluginMarketplace.ts';

test('isOwnerUser strictly permits only verified drminemc@gmail.com', () => {
  assert.equal(OWNER_EMAIL, 'drminemc@gmail.com');
  assert.equal(isOwnerUser({ email: 'drminemc@gmail.com', emailVerified: true }), true);
  assert.equal(isOwnerUser({ email: 'DRMINEMC@GMAIL.COM', emailVerified: true }), true);
  assert.equal(isOwnerUser({ email: 'drminemc@gmail.com', emailVerified: false }), false);
  assert.equal(isOwnerUser({ email: 'other@gmail.com', emailVerified: true }), false);
  assert.equal(isOwnerUser(null), false);
});

test('validatePluginFileMeta enforces .jar/.zip, size bounds, and ZIP magic bytes', () => {
  const validMagic = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);
  const jarOk = validatePluginFileMeta('../../evil/MyPlugin 1.0.jar', 2048, validMagic);
  assert.equal(jarOk.ok, true);
  if (jarOk.ok) {
    assert.equal(jarOk.extension, '.jar');
    assert.equal(jarOk.safeName, 'MyPlugin-1.0.jar');
  }

  const badExt = validatePluginFileMeta('payload.exe', 1024, validMagic);
  assert.equal(badExt.ok, false);

  const badMagic = validatePluginFileMeta('fake.jar', 1024, Buffer.from([0x4d, 0x5a, 0x90, 0x00]));
  assert.equal(badMagic.ok, false);

  const tooBig = validatePluginFileMeta('huge.jar', 30 * 1024 * 1024, validMagic);
  assert.equal(tooBig.ok, false);

  assert.equal(sanitizeDownloadFilename('../..//bad;name?.zip'), 'bad-name-.zip');
});

test('validatePluginIconUrl accepts safe raster data URIs and http(s) URLs while blocking SVG/XSS', () => {
  assert.deepEqual(validatePluginIconUrl(''), { ok: true, iconUrl: '' });
  assert.deepEqual(validatePluginIconUrl(undefined), { ok: true, iconUrl: '' });

  const httpsOk = validatePluginIconUrl('https://cdn.surgetrix.net/icons/surgeguard.png');
  assert.equal(httpsOk.ok, true);

  const pngData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  assert.deepEqual(validatePluginIconUrl(pngData), { ok: true, iconUrl: pngData });

  const svgBlocked = validatePluginIconUrl('data:image/svg+xml;base64,PHN2Zy8+');
  assert.equal(svgBlocked.ok, false);

  const jsBlocked = validatePluginIconUrl('javascript:alert(1)');
  assert.equal(jsBlocked.ok, false);

  const oversized = validatePluginIconUrl(`data:image/webp;base64,${'A'.repeat(70000)}`);
  assert.equal(oversized.ok, false);
});

test('validatePluginPayload validates required plugin fields cleanly', () => {
  const valid = validatePluginPayload({
    name: 'SurgeGuard AC',
    tagline: 'Lightweight movement protection for Paper and Folia.',
    description: 'Detailed overview of SurgeGuard AC checks, commands, and configuration options.',
    category: 'Anti-Cheat',
    version: '1.2.0',
    platforms: ['Paper', 'Folia'],
    mcVersions: '1.20.4, 1.21.4',
    priceLabel: 'Free',
    supportUrl: 'https://discord.gg/surgetrix',
    iconUrl: 'https://cdn.surgetrix.net/icons/surgeguard.png',
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.deepEqual(valid.data.mcVersions, ['1.20.4', '1.21.4']);
    assert.deepEqual(valid.data.platforms, ['Paper', 'Folia']);
    assert.equal(valid.data.iconUrl, 'https://cdn.surgetrix.net/icons/surgeguard.png');
  }

  const badUrl = validatePluginPayload({
    name: 'SurgeGuard AC',
    tagline: 'Lightweight movement protection for Paper.',
    description: 'Valid description over ten chars.',
    category: 'Anti-Cheat',
    version: '1.0.0',
    platforms: ['Paper'],
    supportUrl: 'javascript:alert(1)',
  });
  assert.equal(badUrl.ok, false);

  const badIcon = validatePluginPayload({
    name: 'SurgeGuard AC',
    tagline: 'Lightweight movement protection for Paper.',
    description: 'Valid description over ten chars.',
    category: 'Anti-Cheat',
    version: '1.0.0',
    platforms: ['Paper'],
    iconUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
  });
  assert.equal(badIcon.ok, false);
});

test('computeRatingBreakdown and validateReviewPayload compute BuiltByBit stats accurately', () => {
  const revCheck = validateReviewPayload({
    rating: 5,
    title: 'Zero lag on Paper 1.21.4',
    comment: 'Tested with 90 players online and TPS stayed at 20.0.',
    testedVersion: '1.21.4',
  });
  assert.equal(revCheck.ok, true);

  assert.equal(validateReviewPayload({ rating: 6, comment: 'bad' }).ok, false);

  const stats = computeRatingBreakdown([{ rating: 5 }, { rating: 4 }, { rating: 5 }]);
  assert.equal(stats.count, 3);
  assert.equal(stats.average, 4.7);
  assert.equal(stats.countsByStar[5], 2);
  assert.equal(stats.countsByStar[4], 1);
  assert.equal(computeRatingBreakdown([]).average, 0);
});

test('filterAndSortPlugins filters hidden plugins, platforms, categories, and sorts featured first', () => {
  const base: PluginListing = {
    id: 'p1',
    slug: 'p1',
    name: 'AlphaCore',
    tagline: 'Core utils',
    description: 'Core utilities for SMP servers.',
    category: 'Administration',
    platforms: ['Paper', 'Purpur'],
    mcVersions: ['1.21.4'],
    priceLabel: 'Free',
    featured: false,
    status: 'published',
    authorName: 'drminemc',
    authorEmail: OWNER_EMAIL,
    currentVersion: '1.0.0',
    fileName: 'AlphaCore.jar',
    storedFileName: 'p1.jar',
    fileSize: 4096,
    sha256: 'abc',
    supportUrl: '',
    downloads: 100,
    ratingAverage: 4.5,
    reviewsCount: 2,
    versions: [],
    reviews: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const hidden: PluginListing = { ...base, id: 'p2', name: 'SecretPlugin', status: 'hidden' };
  const featured: PluginListing = {
    ...base,
    id: 'p3',
    name: 'BetaFolia',
    featured: true,
    platforms: ['Folia'],
    downloads: 5,
  };

  const visible = filterAndSortPlugins([base, hidden, featured], { sortBy: 'downloads' });
  assert.equal(visible.length, 2);
  assert.equal(visible[0].id, 'p3');

  const foliaOnly = filterAndSortPlugins([base, hidden, featured], { platform: 'Folia' });
  assert.deepEqual(foliaOnly.map((x) => x.id), ['p3']);

  assert.equal(formatBytes(4096), '4.0 KB');
});
