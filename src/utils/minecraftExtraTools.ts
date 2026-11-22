import type { ServerListing } from '../data/catalog';

export interface FireworkColorOption {
  id: string;
  name: string;
  hex: string;
  decimal: number;
  dyeItem: string;
}

export const FIREWORK_COLORS: FireworkColorOption[] = [
  { id: 'cyan', name: 'Cyan', hex: '#169C9C', decimal: 1481884, dyeItem: 'Cyan Dye' },
  { id: 'lime', name: 'Lime', hex: '#80C71F', decimal: 8439583, dyeItem: 'Lime Dye' },
  { id: 'purple', name: 'Purple', hex: '#8932B8', decimal: 8991416, dyeItem: 'Purple Dye' },
  { id: 'red', name: 'Red', hex: '#B02E26', decimal: 11546150, dyeItem: 'Red Dye' },
  { id: 'orange', name: 'Orange', hex: '#F9801D', decimal: 16351261, dyeItem: 'Orange Dye' },
  { id: 'yellow', name: 'Yellow', hex: '#FED83D', decimal: 16701501, dyeItem: 'Yellow Dye' },
  { id: 'light_blue', name: 'Light Blue', hex: '#3AB3DA', decimal: 3847130, dyeItem: 'Light Blue Dye' },
  { id: 'blue', name: 'Blue', hex: '#3C44AA', decimal: 3949738, dyeItem: 'Blue Dye' },
  { id: 'magenta', name: 'Magenta', hex: '#C74EBD', decimal: 13061821, dyeItem: 'Magenta Dye' },
  { id: 'pink', name: 'Pink', hex: '#F38BAA', decimal: 15961002, dyeItem: 'Pink Dye' },
  { id: 'green', name: 'Green', hex: '#5E7C16', decimal: 6192150, dyeItem: 'Green Dye' },
  { id: 'white', name: 'White', hex: '#F9FFFE', decimal: 16383998, dyeItem: 'White Dye' },
  { id: 'light_gray', name: 'Light Gray', hex: '#9D9D97', decimal: 10329495, dyeItem: 'Light Gray Dye' },
  { id: 'gray', name: 'Gray', hex: '#474F52', decimal: 4673362, dyeItem: 'Gray Dye' },
  { id: 'brown', name: 'Brown', hex: '#835432', decimal: 8606770, dyeItem: 'Brown Dye' },
  { id: 'black', name: 'Black', hex: '#1D1D21', decimal: 1908001, dyeItem: 'Black Dye' },
];

export type FireworkShape = 'small_ball' | 'large_ball' | 'star' | 'creeper' | 'burst';

export const FIREWORK_SHAPES: { id: FireworkShape; label: string; modifierItem: string }[] = [
  { id: 'small_ball', label: 'Small Ball', modifierItem: 'None (Default)' },
  { id: 'large_ball', label: 'Large Ball', modifierItem: 'Fire Charge' },
  { id: 'star', label: 'Star-Shaped', modifierItem: 'Gold Nugget' },
  { id: 'creeper', label: 'Creeper Face', modifierItem: 'Any Mob Head' },
  { id: 'burst', label: 'Burst', modifierItem: 'Feather' },
];

export function getFireworkIngredients(opts: {
  flight: 1 | 2 | 3;
  shape: FireworkShape;
  primaryColorId: string;
  fadeColorId?: string | null;
  twinkle: boolean;
  trail: boolean;
}) {
  const primary = FIREWORK_COLORS.find((c) => c.id === opts.primaryColorId) || FIREWORK_COLORS[0];
  const fade = opts.fadeColorId
    ? FIREWORK_COLORS.find((c) => c.id === opts.fadeColorId) || null
    : null;
  const shapeMeta = FIREWORK_SHAPES.find((s) => s.id === opts.shape) || FIREWORK_SHAPES[0];

  const starIngredients: string[] = ['1x Gunpowder', `1x ${primary.dyeItem}`];
  if (opts.shape !== 'small_ball') {
    starIngredients.push(`1x ${shapeMeta.modifierItem}`);
  }
  if (opts.twinkle) starIngredients.push('1x Glowstone Dust');
  if (opts.trail) starIngredients.push('1x Diamond');

  return {
    rocketGunpowder: opts.flight,
    rocketPaper: 1,
    starIngredients,
    fadeDye: fade ? `1x ${fade.dyeItem} (crafted onto Firework Star)` : null,
    estimatedFlightBlocks: opts.flight === 1 ? 25 : opts.flight === 2 ? 42 : 60,
  };
}

export function buildFireworkGiveCommand(opts: {
  flight: 1 | 2 | 3;
  shape: FireworkShape;
  primaryColorId: string;
  fadeColorId?: string | null;
  twinkle: boolean;
  trail: boolean;
  count?: number;
}): string {
  const primary = FIREWORK_COLORS.find((c) => c.id === opts.primaryColorId) || FIREWORK_COLORS[0];
  const fade = opts.fadeColorId
    ? FIREWORK_COLORS.find((c) => c.id === opts.fadeColorId) || null
    : null;
  const count = Math.max(1, Math.min(64, Math.round(opts.count ?? 1)));

  const explosionFields = [
    `shape:"${opts.shape}"`,
    `colors:[I;${primary.decimal}]`,
  ];
  if (fade) {
    explosionFields.push(`fade_colors:[I;${fade.decimal}]`);
  }
  if (opts.twinkle) explosionFields.push('has_twinkle:true');
  if (opts.trail) explosionFields.push('has_trail:true');

  return `/give @p minecraft:firework_rocket[fireworks={flight_duration:${opts.flight},explosions:[{${explosionFields.join(',')}}]}] ${count}`;
}

export function calculateRedstoneTiming(secondsInput: number) {
  const seconds = Math.max(0, Number.isFinite(secondsInput) ? secondsInput : 0);
  const redstoneTicks = Math.round(seconds * 10);
  const gameTicks = Math.round(seconds * 20);
  const repeatersNeeded = redstoneTicks === 0 ? 0 : Math.ceil(redstoneTicks / 4);
  const fullFourTickRepeaters = Math.floor(redstoneTicks / 4);
  const remainderTicks = redstoneTicks % 4;
  // Etho hopper clock transfers 1 item every 0.4s (4 redstone ticks), full cycle = 0.8s per item
  const ethoHopperItems = Math.max(1, Math.min(320, Math.round(seconds / 0.8) || 1));
  const actualEthoCycleSeconds = Number((ethoHopperItems * 0.8).toFixed(1));

  return {
    seconds: Number(seconds.toFixed(2)),
    redstoneTicks,
    gameTicks,
    repeatersNeeded,
    fullFourTickRepeaters,
    remainderTicks,
    ethoHopperItems,
    actualEthoCycleSeconds,
  };
}

export function calculateComparatorSignal(
  itemCountInput: number,
  containerSlots: number,
  stackSize = 64
) {
  const slots = Math.max(1, Math.round(containerSlots));
  const maxStack = Math.max(1, Math.round(stackSize));
  const capacity = slots * maxStack;
  const itemCount = Math.max(0, Math.min(capacity, Math.round(itemCountInput || 0)));

  const signalStrength =
    itemCount === 0 ? 0 : Math.min(15, Math.floor(1 + (itemCount / capacity) * 14));
  const fillPercent = Number(((itemCount / capacity) * 100).toFixed(1));

  return {
    itemCount,
    capacity,
    signalStrength,
    fillPercent,
  };
}

export const ARMOR_TRIM_PATTERNS = [
  { id: 'silence', name: 'Silence', source: 'Ancient City' },
  { id: 'spire', name: 'Spire', source: 'End City' },
  { id: 'ward', name: 'Ward', source: 'Ancient City' },
  { id: 'vex', name: 'Vex', source: 'Woodland Mansion' },
  { id: 'tide', name: 'Tide', source: 'Ocean Monument' },
  { id: 'rib', name: 'Rib', source: 'Nether Fortress' },
  { id: 'snout', name: 'Snout', source: 'Bastion Remnant' },
  { id: 'eye', name: 'Eye', source: 'Stronghold' },
  { id: 'wayfinder', name: 'Wayfinder', source: 'Trail Ruins' },
  { id: 'raiser', name: 'Raiser', source: 'Trail Ruins' },
  { id: 'shaper', name: 'Shaper', source: 'Trail Ruins' },
  { id: 'host', name: 'Host', source: 'Trail Ruins' },
  { id: 'coast', name: 'Coast', source: 'Shipwreck' },
  { id: 'dune', name: 'Dune', source: 'Desert Pyramid' },
  { id: 'wild', name: 'Wild', source: 'Jungle Temple' },
  { id: 'sentry', name: 'Sentry', source: 'Pillager Outpost' },
  { id: 'flow', name: 'Flow', source: 'Trial Chambers' },
  { id: 'bolt', name: 'Bolt', source: 'Trial Chambers' },
] as const;

export const ARMOR_TRIM_MATERIALS = [
  { id: 'amethyst', name: 'Amethyst Shard', hex: '#9A5CC6' },
  { id: 'copper', name: 'Copper Ingot', hex: '#B4684D' },
  { id: 'diamond', name: 'Diamond', hex: '#6EECD2' },
  { id: 'emerald', name: 'Emerald', hex: '#11A036' },
  { id: 'gold', name: 'Gold Ingot', hex: '#DEB12D' },
  { id: 'iron', name: 'Iron Ingot', hex: '#ECECEC' },
  { id: 'lapis', name: 'Lapis Lazuli', hex: '#416E97' },
  { id: 'netherite', name: 'Netherite Ingot', hex: '#625859' },
  { id: 'quartz', name: 'Nether Quartz', hex: '#E3D4C4' },
  { id: 'redstone', name: 'Redstone Dust', hex: '#971607' },
] as const;

export type ArmorMaterialType =
  | 'netherite'
  | 'diamond'
  | 'iron'
  | 'golden'
  | 'chainmail'
  | 'leather';

export type ArmorPiece = 'helmet' | 'chestplate' | 'leggings' | 'boots';

export function buildArmorTrimGiveCommand(
  armorMaterial: ArmorMaterialType,
  piece: ArmorPiece,
  patternId: string,
  trimMaterialId: string
): string {
  return `/give @p minecraft:${armorMaterial}_${piece}[trim={pattern:"minecraft:${patternId}",material:"minecraft:${trimMaterialId}"}] 1`;
}

export function calculateWorldDistance(
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number }
) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  const distance2D = Number(Math.hypot(dx, dz).toFixed(2));
  const distance3D = Number(Math.hypot(dx, dy, dz).toFixed(2));

  // Minecraft angle where +Z = South (0 deg), -X = East (-90), -Z = North (180), +X = West (90)
  // Standard compass bearing clockwise from North (-Z):
  const rad = Math.atan2(dx, -dz);
  const bearingDegrees = Number((((rad * 180) / Math.PI + 360) % 360).toFixed(1));
  const dirs = ['North', 'NE', 'East', 'SE', 'South', 'SW', 'West', 'NW'];
  const cardinalDirection = dirs[Math.round(bearingDegrees / 45) % 8];

  const chunkX = Math.floor(p2.x / 16);
  const chunkZ = Math.floor(p2.z / 16);
  const regionX = Math.floor(chunkX / 32);
  const regionZ = Math.floor(chunkZ / 32);

  return {
    deltaX: dx,
    deltaY: dy,
    deltaZ: dz,
    distance2D,
    distance3D,
    bearingDegrees,
    cardinalDirection,
    netherTarget: {
      x: Math.round(p2.x / 8),
      y: p2.y,
      z: Math.round(p2.z / 8),
    },
    chunkTarget: { x: chunkX, z: chunkZ },
    regionFile: `r.${regionX}.${regionZ}.mca`,
  };
}

export function calculateBeaconRequirements(tier: 1 | 2 | 3 | 4) {
  const layerBlocks = { 1: 9, 2: 34, 3: 83, 4: 164 };
  const blocksNeeded = layerBlocks[tier];
  const ingotsNeeded = blocksNeeded * 9;
  const stacksOfBlocks = Math.ceil(blocksNeeded / 64);
  const effectRangeBlocks = 10 + tier * 10;
  const durationSeconds = 9 + tier * 2;
  const baseDimensions = { 1: '3×3', 2: '5×5', 3: '7×7', 4: '9×9' }[tier];

  return {
    tier,
    baseDimensions,
    blocksNeeded,
    ingotsNeeded,
    stacksOfBlocks,
    effectRangeBlocks,
    durationSeconds,
  };
}

export function calculateConduitRange(frameBlocksInput: number) {
  const blocks = Math.max(0, Math.min(42, Math.round(frameBlocksInput || 0)));
  if (blocks < 16) {
    return {
      blocks,
      active: false,
      rangeBlocks: 0,
      attacksHostileMobs: false,
    };
  }
  const rangeBlocks = Math.floor(blocks / 7) * 16;
  return {
    blocks,
    active: true,
    rangeBlocks,
    attacksHostileMobs: blocks >= 42,
  };
}

export const BANNER_PATTERNS = [
  { id: 'stripe_bottom', name: 'Base Stripe' },
  { id: 'stripe_top', name: 'Chief Stripe' },
  { id: 'stripe_left', name: 'Left Pale' },
  { id: 'stripe_right', name: 'Right Pale' },
  { id: 'stripe_center', name: 'Center Pale' },
  { id: 'stripe_middle', name: 'Center Fess' },
  { id: 'cross', name: 'Diagonal Saltire' },
  { id: 'straight_cross', name: 'Cross' },
  { id: 'border', name: 'Bordure' },
  { id: 'circle', name: 'Roundel' },
  { id: 'gradient', name: 'Top Gradient' },
  { id: 'bricks', name: 'Field Masoned' },
  { id: 'creeper', name: 'Creeper Charge' },
  { id: 'skull', name: 'Skull Charge' },
] as const;

export interface BannerLayerInput {
  pattern: string;
  color: string;
}

export function buildBannerGiveCommand(
  baseColorId: string,
  layers: BannerLayerInput[]
): string {
  const validBase = FIREWORK_COLORS.some((c) => c.id === baseColorId) ? baseColorId : 'black';
  const cleanLayers = layers.slice(0, 6);
  if (cleanLayers.length === 0) {
    return `/give @p minecraft:${validBase}_banner 1`;
  }
  const serialized = cleanLayers
    .map((l) => `{pattern:"minecraft:${l.pattern}",color:"${l.color}"}`)
    .join(',');
  return `/give @p minecraft:${validBase}_banner[banner_patterns=[${serialized}]] 1`;
}

export type ServerSectionFilter =
  | 'Featured'
  | 'Trending'
  | 'Most Popular'
  | 'Recently Added'
  | 'Recently Bumped'
  | 'Staff Picks'
  | 'Recommended';

export const SERVER_SECTIONS: ServerSectionFilter[] = [
  'Featured',
  'Trending',
  'Most Popular',
  'Recently Added',
  'Recently Bumped',
  'Staff Picks',
  'Recommended',
];

export const SERVER_CATEGORIES = [
  'All categories',
  'Survival SMP',
  'Lifesteal',
  'Crystal PvP',
  'Factions',
  'Skyblock',
  'Bedwars',
  'KitPvP',
  'Economy',
  'Prison',
  'Anarchy',
  'Minigames',
  'Creative',
  'Roleplay',
  'Other',
] as const;

export function filterServers(
  servers: ServerListing[],
  opts: {
    search?: string;
    edition?: 'All' | 'Java' | 'Bedrock' | 'Crossplay';
    onlineOnly?: boolean;
    category?: string;
    section?: ServerSectionFilter;
  }
): ServerListing[] {
  const q = (opts.search || '').trim().toLowerCase();
  const edition = opts.edition || 'All';
  const category = opts.category || 'All categories';

  const matching = servers.filter((srv) => {
    if (edition !== 'All' && srv.edition !== edition) return false;
    if (opts.onlineOnly && srv.status !== 'Online') return false;
    if (category !== 'All categories' && srv.category !== category) return false;
    if (
      q &&
      !srv.name.toLowerCase().includes(q) &&
      !srv.ip.toLowerCase().includes(q) &&
      !srv.category.toLowerCase().includes(q) &&
      !srv.motd.toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });

  if (opts.section === 'Most Popular') {
    return [...matching].sort((a, b) => b.likes - a.likes || b.playersOnline - a.playersOnline);
  }
  if (opts.section === 'Trending') {
    return [...matching].sort((a, b) => b.playersOnline - a.playersOnline || b.likes - a.likes);
  }
  return matching;
}

export function getServerAggregateStats(servers: ServerListing[]) {
  return {
    totalServers: servers.length,
    totalPlayersOnline: servers.reduce(
      (sum, srv) => sum + (srv.status === 'Online' ? srv.playersOnline : 0),
      0
    ),
  };
}
