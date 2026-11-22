import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEconomyProfit,
  calculateShulkerStorage,
  calculateTravelEstimate,
  convertNetherCoordinates,
  convertTextFormat,
  generateHexGradient,
  levelFromTotalXp,
  parseMinecraftFormattedText,
  totalXpForLevel,
  validateYamlBasic,
} from './minecraftTools';

test('convertNetherCoordinates converts Overworld <-> Nether at 8:1 ratio', () => {
  const toNether = convertNetherCoordinates(800, 64, -400, 'to-nether');
  assert.equal(toNether.x, 100);
  assert.equal(toNether.z, -50);
  assert.equal(toNether.y, 64);

  const toOverworld = convertNetherCoordinates(12, 70, -8, 'to-overworld');
  assert.equal(toOverworld.x, 96);
  assert.equal(toOverworld.z, -64);
});

test('calculateShulkerStorage computes exact shulker boxes, stacks, and remainder', () => {
  // 1 shulker = 27 * 64 = 1728 items. 1800 = 1 shulker + 1 stack (64) + 8 items
  const res = calculateShulkerStorage(1800, 64);
  assert.equal(res.shulkerBoxes, 1);
  assert.equal(res.remainingStacks, 1);
  assert.equal(res.remainingItems, 8);
  assert.equal(res.totalSlots, 29);
});

test('XP calculations round-trip cleanly for level 30', () => {
  const xp30 = totalXpForLevel(30);
  assert.equal(xp30, 1395);
  const decoded = levelFromTotalXp(xp30);
  assert.equal(decoded.level, 30);
  assert.equal(decoded.xpIntoLevel, 0);
});

test('calculateEconomyProfit computes revenue, tax, and net profit', () => {
  const res = calculateEconomyProfit(10, 25, 64, 10);
  assert.equal(res.totalCost, 640);
  assert.equal(res.grossRevenue, 1600);
  assert.equal(res.taxAmount, 160);
  assert.equal(res.netRevenue, 1440);
  assert.equal(res.netProfit, 800);
});

test('parseMinecraftFormattedText parses color and bold codes', () => {
  const segments = parseMinecraftFormattedText('&a&lSurge&fTrix');
  assert.equal(segments.length, 2);
  assert.equal(segments[0].text, 'Surge');
  assert.equal(segments[0].color, '#55FF55');
  assert.equal(segments[0].bold, true);
  assert.equal(segments[1].text, 'Trix');
  assert.equal(segments[1].color, '#FFFFFF');
  assert.equal(segments[1].bold, false);
});

test('generateHexGradient and convertTextFormat produce valid outputs', () => {
  const grad = generateHexGradient('ABC', '#8b5cf6', '#22c55e');
  assert.equal(grad.steps.length, 3);
  assert.equal(grad.miniMessageString, '<gradient:#8b5cf6:#22c55e>ABC</gradient>');
  assert.equal(convertTextFormat('&aHello &lWorld', 'minimessage'), '<green>Hello <bold>World');
  assert.equal(convertTextFormat('&aHello', 'section'), '§aHello');
});

test('calculateTravelEstimate and validateYamlBasic work accurately', () => {
  const elytra = calculateTravelEstimate(3350, 'elytra');
  assert.equal(elytra.seconds, 100);
  assert.equal(elytra.formatted, '1m 40s');
  assert.ok(elytra.rocketsNeeded > 0);

  const badYaml = validateYamlBasic("server:\n\tport:25565");
  assert.equal(badYaml.valid, false);
  assert.equal(badYaml.errors.length, 2);

  const goodYaml = validateYamlBasic("server:\n  port: 25565");
  assert.equal(goodYaml.valid, true);
});

import { THEME_PRESETS, getThemePreset } from '../utils/themePresets';

test('THEME_PRESETS provide 4 complete styles including light and dark modes', () => {
  assert.equal(THEME_PRESETS.length, 4);
  const ids = THEME_PRESETS.map((t) => t.id);
  assert.deepEqual(ids, ['obsidian', 'cyber', 'bedrock', 'daylight']);

  const daylight = getThemePreset('daylight');
  assert.equal(daylight.mode, 'light');
  assert.equal(daylight.vars['--st-text'], '#0f172a');

  // Unknown theme falls back cleanly to default obsidian preset
  const fallback = getThemePreset('unknown');
  assert.equal(fallback.id, 'obsidian');
});

import {
  buildVerificationToken,
  createChallengeNonce,
  isVerificationTokenValid,
} from './botVerification';

test('botVerification builds valid time-bounded verification tokens', () => {
  const nonce = createChallengeNonce();
  assert.ok(nonce.includes('-'));

  const now = 1_700_000_000_000;
  const record = buildVerificationToken(nonce, 480, now);
  assert.ok(record.token.startsWith('st-turnstile-'));
  assert.equal(isVerificationTokenValid(record, now + 1000), true);
  assert.equal(isVerificationTokenValid(record, now + 11 * 60 * 1000), false);
  assert.equal(isVerificationTokenValid(null, now), false);
});

import {
  detectMatchingSurgeTrixTool,
  normalizeChatHistory,
  parseAssistantReply,
  parseInlineTokens,
  parseMarkdownLines,
  validateAiPrompt,
} from './aiAssistant';

test('validateAiPrompt rejects empty/oversized prompts and trims valid prompts', () => {
  assert.equal(validateAiPrompt('   ').ok, false);
  assert.equal(validateAiPrompt('a'.repeat(2005)).ok, false);
  const valid = validateAiPrompt('  How do I configure LuckPerms?  ');
  assert.deepEqual(valid, { ok: true, text: 'How do I configure LuckPerms?' });
});

test('normalizeChatHistory keeps alternating user -> model turns cleanly', () => {
  const normalized = normalizeChatHistory([
    { role: 'assistant', text: 'Welcome greeting ignored before first user turn' },
    { role: 'user', text: 'First question' },
    { role: 'assistant', text: 'First answer' },
    { role: 'assistant', text: 'Duplicate assistant ignored' },
    { role: 'user', text: 'Second question' },
  ]);
  assert.equal(normalized.length, 3);
  assert.equal(normalized[0].role, 'user');
  assert.equal(normalized[1].role, 'model');
  assert.equal(normalized[2].role, 'user');
});

test('parseAssistantReply separates prose and fenced code blocks cleanly', () => {
  const raw = 'Run this command:\n```bash\n/lp creategroup vip\n```\nThen reload.';
  const blocks = parseAssistantReply(raw);
  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].type, 'text');
  assert.equal(blocks[1].type, 'code');
  assert.equal(blocks[1].language, 'bash');
  assert.equal(blocks[1].content, '/lp creategroup vip');
  assert.equal(blocks[2].type, 'text');
});

test('parseMarkdownLines and parseInlineTokens format headings, bullets, bold, and inline code', () => {
  const lines = parseMarkdownLines('### Setup\n- Run `/lp save`\n---');
  assert.equal(lines[0].type, 'heading');
  assert.equal(lines[1].type, 'bullet');
  assert.equal(lines[2].type, 'divider');

  const tokens = parseInlineTokens('Set **VIP** via `/lp save` now');
  assert.deepEqual(tokens, [
    { type: 'text', value: 'Set ' },
    { type: 'bold', value: 'VIP' },
    { type: 'text', value: ' via ' },
    { type: 'code', value: '/lp save' },
    { type: 'text', value: ' now' },
  ]);
});

test('detectMatchingSurgeTrixTool maps topics to SurgeTrix tool routes', () => {
  assert.equal(
    detectMatchingSurgeTrixTool('How do I fix TPS lag with Spark?')?.path,
    '/tools/spark-analyzer'
  );
  assert.equal(
    detectMatchingSurgeTrixTool('Create a LuckPerms VIP group')?.path,
    '/tools/permissions'
  );
  assert.equal(
    detectMatchingSurgeTrixTool('What is the best food in Minecraft?'),
    undefined
  );
});

import { RESOURCES_CATALOG } from '../data/catalog';
import { filterAndSortResources, getPlatformOptionsForKind } from './resourceFilters';

test('filterAndSortResources filters Mods by loader, search, and sort order', () => {
  const loaders = getPlatformOptionsForKind('mods');
  assert.ok(loaders.includes('Fabric'));
  assert.ok(loaders.includes('NeoForge'));
  assert.ok(loaders.includes('Forge'));

  const allMods = filterAndSortResources(RESOURCES_CATALOG, { kind: 'mods' });
  assert.ok(allMods.length >= 9);
  assert.equal(allMods[0].name, 'Just Enough Items (JEI)');

  const quiltMods = filterAndSortResources(RESOURCES_CATALOG, {
    kind: 'mods',
    platform: 'Quilt',
    sortBy: 'name',
  });
  assert.ok(quiltMods.length >= 3);
  assert.ok(quiltMods.every((m) => m.platforms.includes('Quilt')));

  const searchSodium = filterAndSortResources(RESOURCES_CATALOG, {
    kind: 'mods',
    search: 'sodium',
  });
  assert.equal(searchSodium.length, 2);
  assert.equal(searchSodium[0].name, 'Sodium');
  assert.ok(searchSodium.some((m) => m.name === 'Iris Shaders'));

  const searchDistant = filterAndSortResources(RESOURCES_CATALOG, {
    kind: 'mods',
    search: 'distant horizons',
  });
  assert.equal(searchDistant.length, 1);
  assert.equal(searchDistant[0].name, 'Distant Horizons');
});

import {
  buildArmorTrimGiveCommand,
  buildBannerGiveCommand,
  buildFireworkGiveCommand,
  calculateBeaconRequirements,
  calculateComparatorSignal,
  calculateConduitRange,
  calculateRedstoneTiming,
  calculateWorldDistance,
  filterServers,
  getFireworkIngredients,
  getServerAggregateStats,
} from './minecraftExtraTools';
import { INITIAL_SERVERS, TOOLS_CATALOG } from '../data/catalog';

test('TOOLS_CATALOG includes all 40 tools including new Minecraft utilities', () => {
  assert.equal(TOOLS_CATALOG.length, 40);
  for (const slug of ['firework', 'redstone', 'armortrim', 'distance', 'beacon', 'banner']) {
    assert.ok(
      TOOLS_CATALOG.some((t) => t.slug === slug),
      `Expected tool slug "${slug}" in TOOLS_CATALOG`
    );
  }
});

test('INITIAL_SERVERS starts empty until owners submit servers', () => {
  assert.equal(INITIAL_SERVERS.length, 0);
  const stats = getServerAggregateStats(INITIAL_SERVERS);
  assert.deepEqual(stats, { totalServers: 0, totalPlayersOnline: 0 });
});

test('buildFireworkGiveCommand and getFireworkIngredients produce valid 1.21+ data components', () => {
  const ing = getFireworkIngredients({
    flight: 2,
    shape: 'creeper',
    primaryColorId: 'lime',
    fadeColorId: 'cyan',
    twinkle: true,
    trail: true,
  });
  assert.equal(ing.rocketGunpowder, 2);
  assert.ok(ing.starIngredients.includes('1x Lime Dye'));
  assert.ok(ing.starIngredients.includes('1x Any Mob Head'));
  assert.ok(ing.starIngredients.includes('1x Glowstone Dust'));
  assert.ok(ing.starIngredients.includes('1x Diamond'));

  const cmd = buildFireworkGiveCommand({
    flight: 2,
    shape: 'creeper',
    primaryColorId: 'lime',
    fadeColorId: 'cyan',
    twinkle: true,
    trail: true,
    count: 16,
  });
  assert.ok(cmd.startsWith('/give @p minecraft:firework_rocket[fireworks={flight_duration:2'));
  assert.ok(cmd.includes('shape:"creeper"'));
  assert.ok(cmd.includes('has_twinkle:true'));
  assert.ok(cmd.endsWith(' 16'));
});

test('calculateRedstoneTiming and calculateComparatorSignal compute accurate ticks and signals', () => {
  const timing = calculateRedstoneTiming(4.0);
  assert.equal(timing.redstoneTicks, 40);
  assert.equal(timing.gameTicks, 80);
  assert.equal(timing.repeatersNeeded, 10);
  assert.equal(timing.ethoHopperItems, 5);

  const empty = calculateComparatorSignal(0, 27);
  assert.equal(empty.signalStrength, 0);

  const halfChests = calculateComparatorSignal(864, 27); // half of 1728
  assert.equal(halfChests.signalStrength, 8);

  const fullChests = calculateComparatorSignal(1728, 27);
  assert.equal(fullChests.signalStrength, 15);
});

test('buildArmorTrimGiveCommand, buildBannerGiveCommand, calculateBeaconRequirements, calculateConduitRange, and calculateWorldDistance work accurately', () => {
  assert.equal(
    buildArmorTrimGiveCommand('netherite', 'chestplate', 'silence', 'amethyst'),
    '/give @p minecraft:netherite_chestplate[trim={pattern:"minecraft:silence",material:"minecraft:amethyst"}] 1'
  );

  assert.equal(
    buildBannerGiveCommand('cyan', [{ pattern: 'creeper', color: 'white' }]),
    '/give @p minecraft:cyan_banner[banner_patterns=[{pattern:"minecraft:creeper",color:"white"}]] 1'
  );

  const tier4 = calculateBeaconRequirements(4);
  assert.equal(tier4.blocksNeeded, 164);
  assert.equal(tier4.ingotsNeeded, 1476);
  assert.equal(tier4.effectRangeBlocks, 50);

  assert.equal(calculateConduitRange(15).active, false);
  assert.equal(calculateConduitRange(42).rangeBlocks, 96);
  assert.equal(calculateConduitRange(42).attacksHostileMobs, true);

  const dist = calculateWorldDistance({ x: 0, y: 64, z: 0 }, { x: 300, y: 100, z: -400 });
  assert.equal(dist.distance2D, 500);
  assert.equal(dist.chunkTarget.x, 18);
  assert.equal(dist.chunkTarget.z, -25);
  assert.equal(dist.regionFile, 'r.0.-1.mca');
});

test('filterServers filters and sorts servers without altering empty states', () => {
  const sample = [
    {
      id: '1',
      name: 'SkyRealm',
      ip: 'play.skyrealm.net',
      edition: 'Java' as const,
      category: 'Skyblock',
      status: 'Online' as const,
      playersOnline: 45,
      maxPlayers: 100,
      version: '1.21.4 Paper',
      rating: 4.8,
      reviewsCount: 5,
      likes: 12,
      motd: 'Skyblock launch',
    },
    {
      id: '2',
      name: 'BedrockSMP',
      ip: 'br.smp.gg',
      edition: 'Bedrock' as const,
      category: 'Survival SMP',
      status: 'Offline' as const,
      playersOnline: 0,
      maxPlayers: 50,
      version: '1.21.50 Bedrock',
      rating: null,
      reviewsCount: 0,
      likes: 30,
      motd: 'Maintenance',
    },
  ];

  assert.equal(filterServers([], { edition: 'All' }).length, 0);
  assert.equal(filterServers(sample, { onlineOnly: true }).length, 1);
  assert.equal(filterServers(sample, { category: 'Survival SMP' })[0].id, '2');
  assert.equal(filterServers(sample, { section: 'Most Popular' })[0].id, '2');
  assert.equal(filterServers(sample, { section: 'Trending' })[0].id, '1');
});

