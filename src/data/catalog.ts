export type ToolCategory =
  | 'Minecraft Tools'
  | 'Server Owner Tools'
  | 'Player Utilities'
  | 'Developer Utilities';

export interface ToolItem {
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  isNew?: boolean;
  featured?: boolean;
  popular?: boolean;
  recentlyAdded?: boolean;
  iconKey: string;
}

export interface AdvancedToolItem {
  slug: string;
  name: string;
  description: string;
  badge: string;
  featured?: boolean;
}

export interface ServerListing {
  id: string;
  name: string;
  ip: string;
  edition: 'Java' | 'Bedrock' | 'Crossplay';
  category: string;
  status: 'Online' | 'Offline';
  playersOnline: number;
  maxPlayers: number;
  version: string;
  rating: number | null;
  reviewsCount: number;
  likes: number;
  motd: string;
}

export interface ResourceItem {
  id: string;
  kind: 'plugin' | 'mods' | 'apps' | 'resource-packs';
  name: string;
  summary: string;
  author: string;
  downloads: number;
  rating: number;
  platforms: string[];
  version: string;
  officialUrl: string;
}

export interface GuideItem {
  slug: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
  sections: { heading: string; body: string; code?: string }[];
}

export interface CommunityRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  author: string;
  votes: number;
  status: 'Planned' | 'In Progress' | 'Under Review' | 'Shipped';
  createdAt: string;
}

export const PLAYER_ACTIVITY_SERIES = [
  { label: 'Nov 18 06:02 PM', players: 25 },
  { label: 'Nov 19 01:15 AM', players: 27 },
  { label: 'Nov 19 07:17 PM', players: 36 },
  { label: 'Nov 20 03:20 AM', players: 27 },
  { label: 'Nov 20 02:10 PM', players: 29 },
  { label: 'Nov 20 11:45 PM', players: 25 },
  { label: 'Nov 21 01:30 AM', players: 35 },
  { label: 'Nov 21 07:54 PM', players: 0 },
  { label: 'Nov 22 02:15 AM', players: 14 },
  { label: 'Nov 22 09:40 AM', players: 22 },
  { label: 'Nov 22 05:03 PM', players: 34 },
  { label: 'Nov 22 11:20 PM', players: 29 },
];

export const TOOLS_CATALOG: ToolItem[] = [
  // Recently added / Server Owner Tools
  {
    slug: 'tab-placeholder-studio',
    name: 'TAB Placeholder Studio',
    description: 'Design and preview conditional TAB placeholders, then copy a ready-to-use YAML block.',
    category: 'Server Owner Tools',
    isNew: true,
    recentlyAdded: true,
    iconKey: 'code',
  },
  {
    slug: 'conflict-scanner',
    name: 'Plugin Conflict Scanner',
    description: 'Cross-check commands, permissions and dependencies between your plugins.',
    category: 'Server Owner Tools',
    isNew: true,
    recentlyAdded: true,
    iconKey: 'git-branch',
  },
  {
    slug: 'network-monitor',
    name: 'Network Health Monitor',
    description: 'Track TPS and player trends you record from your servers over time.',
    category: 'Server Owner Tools',
    isNew: true,
    recentlyAdded: true,
    iconKey: 'activity',
  },
  {
    slug: 'config-updater',
    name: 'ConfigUpdater',
    description: 'Update plugin config files while preserving your existing settings.',
    category: 'Server Owner Tools',
    isNew: true,
    iconKey: 'file-cog',
  },
  {
    slug: 'config-fixer',
    name: 'Config Fixer',
    description: 'Find and fix errors in plugin configuration files with reviewable changes.',
    category: 'Server Owner Tools',
    isNew: true,
    iconKey: 'file-check',
  },
  {
    slug: 'font-generator',
    name: 'Fonts Generator',
    description: 'Convert text into dozens of Unicode font styles instantly and copy the result.',
    category: 'Minecraft Tools',
    isNew: true,
    iconKey: 'type',
  },
  {
    slug: 'motd',
    name: 'MOTD Generator',
    description: 'Create formatted server MOTDs with live preview.',
    category: 'Server Owner Tools',
    featured: true,
    iconKey: 'message-square',
  },
  {
    slug: 'colors',
    name: 'Color Generator',
    description: 'Generate Minecraft color and format codes.',
    category: 'Minecraft Tools',
    featured: true,
    iconKey: 'palette',
  },
  {
    slug: 'gradient',
    name: 'Gradient Generator',
    description: 'Make gradient text for chat, MOTD and names.',
    category: 'Minecraft Tools',
    iconKey: 'sparkles',
  },
  {
    slug: 'converter',
    name: 'Text Converter',
    description: 'Convert color codes between &, §, MiniMessage and JSON.',
    category: 'Minecraft Tools',
    isNew: true,
    iconKey: 'arrow-left-right',
  },
  {
    slug: 'commands',
    name: 'Command Builder',
    description: 'Build supported Minecraft commands step by step.',
    category: 'Minecraft Tools',
    iconKey: 'terminal',
  },
  {
    slug: 'seedmap',
    name: 'Seed Map',
    description: 'Explore biomes, structures and slime chunks for any Java or Bedrock seed.',
    category: 'Minecraft Tools',
    isNew: true,
    featured: true,
    iconKey: 'map',
  },
  {
    slug: 'status',
    name: 'Server Checker',
    description: 'Check status, players and version of a Java or Bedrock server.',
    category: 'Server Owner Tools',
    isNew: true,
    popular: true,
    iconKey: 'activity',
  },
  {
    slug: 'economy',
    name: 'Economy Calculator',
    description: 'Calculate prices and profits for your server shop.',
    category: 'Server Owner Tools',
    popular: true,
    iconKey: 'calculator',
  },
  {
    slug: 'permissions',
    name: 'Permission Generator',
    description: 'Build LuckPerms commands for groups, ranks and players.',
    category: 'Server Owner Tools',
    isNew: true,
    iconKey: 'shield-check',
  },
  {
    slug: 'icon',
    name: 'Server Icon Generator',
    description: 'Turn any image into a 64x64 server-icon.png.',
    category: 'Server Owner Tools',
    isNew: true,
    iconKey: 'image',
  },
  {
    slug: 'malware',
    name: 'Malware Checker',
    description: 'Scan plugin and mod files for dangerous code before they touch your server.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'shield-alert',
  },
  {
    slug: 'nether',
    name: 'Nether Calculator',
    description: 'Convert Overworld coordinates to Nether coordinates and back.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'compass',
  },
  {
    slug: 'shulker',
    name: 'Shulker Calculator',
    description: 'How many stacks, slots and shulker boxes you need for any quantity.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'box',
  },
  {
    slug: 'material',
    name: 'Material Calculator',
    description: 'Turn a build block list into stacks, slots and shulker boxes.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'layers',
  },
  {
    slug: 'skin',
    name: 'Skin Viewer',
    description: 'View any player skin and download it.',
    category: 'Minecraft Tools',
    isNew: true,
    iconKey: 'user',
  },
  {
    slug: 'uuid',
    name: 'UUID Lookup',
    description: 'Find a player UUID from a username, or the name from a UUID.',
    category: 'Minecraft Tools',
    isNew: true,
    iconKey: 'fingerprint',
  },
  {
    slug: 'json',
    name: 'JSON Formatter',
    description: 'Format, minify and validate Minecraft JSON.',
    category: 'Developer Utilities',
    isNew: true,
    iconKey: 'braces',
  },
  {
    slug: 'yaml',
    name: 'YAML Validator',
    description: 'Catch errors in plugin config files.',
    category: 'Developer Utilities',
    isNew: true,
    iconKey: 'file-code',
  },
  {
    slug: 'potion',
    name: 'Potion Brewing Guide',
    description: 'Every brewable potion: ingredients, durations and modifiers.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'flask',
  },
  {
    slug: 'xp',
    name: 'XP Calculator',
    description: 'Convert XP points and levels and plan kills to level up.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'zap',
  },
  {
    slug: 'elytra',
    name: 'Elytra Flight Calculator',
    description: 'Flight time and firework rockets for any elytra trip.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'wind',
  },
  {
    slug: 'traveltime',
    name: 'Travel Time Calculator',
    description: 'How long any journey takes for each way of moving.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'clock',
  },
  {
    slug: 'villager',
    name: 'Villager Trading Calculator',
    description: 'Emerald profit, items per trade, demand and discounts.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'coins',
  },
  {
    slug: 'enchant',
    name: 'Enchantment Planner',
    description: 'Plan enchantments, catch conflicts and estimate anvil costs.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'wand',
  },
  {
    slug: 'storage',
    name: 'Storage Planner',
    description: 'Chests, barrels or shulkers needed for any item count.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'archive',
  },
  {
    slug: 'gear',
    name: 'Gear Planner',
    description: 'Armor points, toughness and damage reduction for your set.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'shield',
  },
  {
    slug: 'farming',
    name: 'Farming Calculator',
    description: 'Field sizes, water coverage, harvests and herd growth.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'sprout',
  },
  {
    slug: 'mobfarm',
    name: 'Mob Farm Calculator',
    description: 'Drops and XP from any mob farm over time.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'skull',
  },
  {
    slug: 'firework',
    name: 'Firework Rocket Designer',
    description: 'Craft custom firework rockets, view star ingredients, and export 1.21+ /give commands.',
    category: 'Minecraft Tools',
    isNew: true,
    recentlyAdded: true,
    iconKey: 'flame',
  },
  {
    slug: 'redstone',
    name: 'Redstone & Hopper Clock Calculator',
    description: 'Convert seconds to redstone ticks, repeater delays, Etho hopper items, and comparator signals.',
    category: 'Player Utilities',
    isNew: true,
    recentlyAdded: true,
    iconKey: 'cpu',
  },
  {
    slug: 'armortrim',
    name: 'Armor Trim Studio',
    description: 'Preview all 18 smithing trim templates and 10 ore materials with instant /give export.',
    category: 'Minecraft Tools',
    isNew: true,
    iconKey: 'shirt',
  },
  {
    slug: 'distance',
    name: '3D Distance & Chunk Calculator',
    description: 'Measure 2D/3D block distance, compass bearing, Nether coords, chunk, and .mca region files.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'ruler',
  },
  {
    slug: 'beacon',
    name: 'Beacon & Conduit Planner',
    description: 'Calculate exact pyramid blocks, ingot totals, beam radius, and Conduit Prismarine rings.',
    category: 'Player Utilities',
    isNew: true,
    iconKey: 'sun',
  },
  {
    slug: 'banner',
    name: 'Banner Pattern Studio',
    description: 'Layer up to 6 banner patterns with live preview and export Minecraft 1.21+ banner commands.',
    category: 'Minecraft Tools',
    isNew: true,
    iconKey: 'flag',
  },
];

export const ADVANCED_TOOLS_CATALOG: AdvancedToolItem[] = [
  {
    slug: 'spark-analyzer',
    name: 'Spark Analyzer',
    description: 'Inspect tick durations, MSPT bottlenecks, entity ticks, and GC spikes from Paper/Purpur Spark profiles.',
    badge: 'Performance',
    featured: true,
  },
  {
    slug: 'tab-animation-maker',
    name: 'TAB Animation Maker',
    description: 'Build animated header/footer gradients and frame-by-frame TAB plugin YAML configurations with live playback.',
    badge: 'Configuration',
    featured: true,
  },
  {
    slug: 'conflict-scanner',
    name: 'Plugin Conflict Scanner',
    description: 'Detect overlapping command aliases, Vault hooks, and plugin.yml dependency loops across your server.',
    badge: 'Diagnostics',
  },
  {
    slug: 'tab-placeholder-studio',
    name: 'TAB Placeholder Studio',
    description: 'Compose conditional PlaceholderAPI expressions with instant output previews and YAML export.',
    badge: 'Placeholders',
  },
];

export const INITIAL_SERVERS: ServerListing[] = [];

export const RESOURCES_CATALOG: ResourceItem[] = [
  {
    id: 'pl-1',
    kind: 'plugin',
    name: 'SurgeGuard AC',
    summary: 'Lightweight movement and packet anti-cheat built for high-TPS Paper and Folia servers.',
    author: 'SurgeTrix Team',
    downloads: 18420,
    rating: 4.9,
    platforms: ['Paper', 'Purpur', 'Folia', 'Spigot'],
    version: '2.4.1',
    officialUrl: '#plugin',
  },
  {
    id: 'pl-2',
    kind: 'plugin',
    name: 'MarketCore GUI',
    summary: 'Zero-config chest shop & dynamic economy balancer with Vault and SQLite support.',
    author: 'NolanDev',
    downloads: 9310,
    rating: 4.8,
    platforms: ['Paper', 'Spigot', 'Purpur'],
    version: '1.9.0',
    officialUrl: '#plugin',
  },
  {
    id: 'pl-3',
    kind: 'plugin',
    name: 'Spark Profiler Plugin',
    summary: 'CPU, tick duration, and heap diagnostics plugin for identifying server lag spikes.',
    author: 'lucko',
    downloads: 5400000,
    rating: 5.0,
    platforms: ['Paper', 'Purpur', 'Velocity', 'Fabric'],
    version: '1.10.109',
    officialUrl: 'https://spark.lucko.me/',
  },
  {
    id: 'mod-1',
    kind: 'mods',
    name: 'Sodium',
    summary: 'Modern rendering engine replacement delivering massive FPS gains and smoother frame pacing.',
    author: 'JellySquid',
    downloads: 4200000,
    rating: 5.0,
    platforms: ['Fabric', 'NeoForge'],
    version: '0.6.5',
    officialUrl: 'https://modrinth.com/mod/sodium',
  },
  {
    id: 'mod-2',
    kind: 'mods',
    name: 'Lithium',
    summary: 'General-purpose optimization mod improving server tick times without altering vanilla mechanics.',
    author: 'JellySquid',
    downloads: 2900000,
    rating: 4.9,
    platforms: ['Fabric', 'NeoForge'],
    version: '0.14.3',
    officialUrl: 'https://modrinth.com/mod/lithium',
  },
  {
    id: 'mod-3',
    kind: 'mods',
    name: 'Iris Shaders',
    summary: 'High-performance shader mod for Fabric and NeoForge fully compatible with Sodium.',
    author: 'coderbot',
    downloads: 3100000,
    rating: 4.9,
    platforms: ['Fabric', 'NeoForge'],
    version: '1.8.1',
    officialUrl: 'https://modrinth.com/mod/iris',
  },
  {
    id: 'mod-4',
    kind: 'mods',
    name: 'FerriteCore',
    summary: 'Memory usage optimization mod reducing Minecraft Java heap footprint across modded and vanilla packs.',
    author: 'malte0811',
    downloads: 3450000,
    rating: 4.9,
    platforms: ['Fabric', 'NeoForge', 'Forge', 'Quilt'],
    version: '7.0.2',
    officialUrl: 'https://modrinth.com/mod/ferrite-core',
  },
  {
    id: 'mod-5',
    kind: 'mods',
    name: 'Simple Voice Chat',
    summary: 'Low-latency proximity voice chat with push-to-talk, group channels, and server-side audio controls.',
    author: 'henkelmax',
    downloads: 2800000,
    rating: 4.9,
    platforms: ['Fabric', 'NeoForge', 'Forge', 'Quilt'],
    version: '2.5.26',
    officialUrl: 'https://modrinth.com/plugin/simple-voice-chat',
  },
  {
    id: 'mod-6',
    kind: 'mods',
    name: 'Distant Horizons',
    summary: 'Level-of-detail (LOD) renderer that lets you see massive view distances beyond vanilla chunk limits.',
    author: 'James Seibel',
    downloads: 2150000,
    rating: 4.8,
    platforms: ['Fabric', 'NeoForge', 'Forge'],
    version: '2.2.1-a',
    officialUrl: 'https://modrinth.com/mod/distanthorizons',
  },
  {
    id: 'mod-7',
    kind: 'mods',
    name: 'Entity Culling',
    summary: 'Skips rendering hidden mobs and tile entities behind walls using async path-tracing for extra FPS.',
    author: 'tr7zw',
    downloads: 2600000,
    rating: 4.9,
    platforms: ['Fabric', 'NeoForge', 'Forge', 'Quilt'],
    version: '1.7.2',
    officialUrl: 'https://modrinth.com/mod/entityculling',
  },
  {
    id: 'mod-8',
    kind: 'mods',
    name: 'Mod Menu',
    summary: 'Adds an in-game mod list and quick settings access screen for Fabric and Quilt modpacks.',
    author: 'Prospector',
    downloads: 3900000,
    rating: 4.9,
    platforms: ['Fabric', 'Quilt'],
    version: '11.0.3',
    officialUrl: 'https://modrinth.com/mod/modmenu',
  },
  {
    id: 'mod-9',
    kind: 'mods',
    name: 'Just Enough Items (JEI)',
    summary: 'Essential item and recipe browser showing crafting recipes, smelting outputs, and mod item tags.',
    author: 'mezz',
    downloads: 5100000,
    rating: 5.0,
    platforms: ['NeoForge', 'Forge', 'Fabric'],
    version: '19.21.0',
    officialUrl: 'https://modrinth.com/mod/jei',
  },
  {
    id: 'rp-1',
    kind: 'resource-packs',
    name: 'SurgeUI Dark HUD',
    summary: 'Crisp dark-mode container textures, clean hotbar frames, and high-contrast potion icons.',
    author: 'SurgeTrix Art',
    downloads: 24500,
    rating: 4.8,
    platforms: ['1.21.x', '1.20.x'],
    version: '1.4',
    officialUrl: '#resource-packs',
  },
  {
    id: 'rp-2',
    kind: 'resource-packs',
    name: 'Faithful 32x',
    summary: 'Classic doubled-resolution textures preserving the original Minecraft aesthetic.',
    author: 'Faithful Team',
    downloads: 1850000,
    rating: 4.9,
    platforms: ['1.21.x', 'Bedrock'],
    version: 'R32',
    officialUrl: 'https://faithfulpack.net/',
  },
  {
    id: 'app-1',
    kind: 'apps',
    name: 'Modrinth App',
    summary: 'Fast open-source desktop launcher for managing Fabric, NeoForge, and Modrinth modpacks.',
    author: 'Modrinth',
    downloads: 3200000,
    rating: 4.9,
    platforms: ['Windows', 'macOS', 'Linux'],
    version: '0.8.9',
    officialUrl: 'https://modrinth.com/app',
  },
  {
    id: 'app-2',
    kind: 'apps',
    name: 'Prism Launcher',
    summary: 'Lightweight multi-instance Minecraft launcher with built-in mod, pack, and Java version control.',
    author: 'Prism Team',
    downloads: 2700000,
    rating: 5.0,
    platforms: ['Windows', 'macOS', 'Linux'],
    version: '9.1',
    officialUrl: 'https://prismlauncher.org/',
  },
  {
    id: 'app-3',
    kind: 'apps',
    name: 'Blockbench',
    summary: 'Low-poly 3D model and texture editor for custom Minecraft entities, items, and Bedrock packs.',
    author: 'JannisX11',
    downloads: 1950000,
    rating: 4.9,
    platforms: ['Web', 'Windows', 'macOS', 'Linux'],
    version: '4.11.2',
    officialUrl: 'https://www.blockbench.net/',
  },
];

export const GUIDES_CATALOG: GuideItem[] = [
  {
    slug: 'getting-started-surgetrix',
    title: 'Getting started with SurgeTrix',
    category: 'Platform',
    readTime: '3 min read',
    summary: 'Overview of all 40 browser tools, saved server profiles, and daily allowances.',
    sections: [
      {
        heading: 'Everything runs directly in your browser',
        body: 'Every calculator, YAML validator, MOTD editor, and color generator on SurgeTrix executes locally with zero page reloads. Use the quick search bar at the top to jump straight to any utility.',
      },
      {
        heading: 'Exporting server-ready configs',
        body: 'Tools like TAB Placeholder Studio, Permission Generator, and MOTD Generator produce copy-ready snippets formatted for Paper, Purpur, LuckPerms, and MiniMessage.',
      },
    ],
  },
  {
    slug: 'formatting-codes-explained',
    title: 'Color codes, hex colors and gradients',
    category: 'Formatting',
    readTime: '4 min read',
    summary: 'Colors, gradients and hex in chat, scoreboards and server MOTDs.',
    sections: [
      {
        heading: 'Legacy & codes vs MiniMessage',
        body: 'Legacy plugins expect &a or §a codes, whereas modern Paper and Kyori Adventure plugins use MiniMessage tags such as <green> or <gradient:#8b5cf6:#22c55e>.',
        code: 'motd=\\u00A7d\\u00A7lSurgeTrix \\u00A77| \\u00A7a1.21.4 Survival',
      },
      {
        heading: 'Converting cleanly with Text Converter',
        body: 'Paste any legacy string into SurgeTrix Text Converter to translate between &, §, MiniMessage, and raw Tellraw JSON.',
      },
    ],
  },
  {
    slug: 'paper-purpur-or-folia',
    title: 'Paper, Purpur or Folia?',
    category: 'Server Setup',
    readTime: '5 min read',
    summary: 'Choosing the right server jar for survival SMPs, minigames, and high-player networks.',
    sections: [
      {
        heading: 'Paper for reliable plugin compatibility',
        body: 'Paper fixes critical vanilla exploits and optimizes chunk loading while keeping 99% of Spigot and Bukkit plugins working out of the box.',
      },
      {
        heading: 'Purpur & Folia for specialized workloads',
        body: 'Purpur exposes extra gameplay toggles for SMP tuning. Folia multi-threads world regions for 300+ player servers, though plugins must explicitly support regionized ticking.',
      },
    ],
  },
  {
    slug: 'memory-and-startup-basics',
    title: 'Memory and startup basics',
    category: 'Performance',
    readTime: '4 min read',
    summary: 'Aikar flags, G1GC tuning, and diagnosing MSPT spikes with Spark Analyzer.',
    sections: [
      {
        heading: 'Recommended JVM flags',
        body: 'Avoid allocating more than 12–16 GB to a single JVM instance to prevent long garbage collection pauses.',
        code: 'java -Xms8G -Xmx8G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -jar paper.jar nogui',
      },
    ],
  },
  {
    slug: 'balancing-server-shop',
    title: 'Balancing prices in a server shop',
    category: 'Economy',
    readTime: '4 min read',
    summary: 'Preventing inflation with buy/sell spread ratios and farm-rate caps.',
    sections: [
      {
        heading: 'Maintain a safe buy-to-sell ratio',
        body: 'Keep shop sell prices at 20%–40% of buy prices and apply a 5%–10% auction tax so automated mob and crop farms do not flood player balances.',
      },
    ],
  },
];

export const INITIAL_COMMUNITY_REQUESTS: CommunityRequest[] = [
  {
    id: 'req-1',
    title: 'Live RCON Console & Scheduled Commands',
    description: 'Connect to server RCON endpoints over TLS to run timed announcements and inspect TPS.',
    category: 'Server Owner Tools',
    author: 'KaelenMC',
    votes: 48,
    status: 'In Progress',
    createdAt: '2 days ago',
  },
  {
    id: 'req-2',
    title: 'MythicMobs Skill YAML Visual Builder',
    description: 'Drag-and-drop skill targeters, mechanics, and cooldown conditions with instant YAML export.',
    category: 'Developer Utilities',
    author: 'VortexDev',
    votes: 36,
    status: 'Planned',
    createdAt: '5 days ago',
  },
  {
    id: 'req-3',
    title: 'Litematica Schematic Material Importer',
    description: 'Upload a .litematic block list CSV and automatically populate Material & Shulker calculators.',
    category: 'Player Utilities',
    author: 'BuilderAria',
    votes: 29,
    status: 'Under Review',
    createdAt: '1 week ago',
  },
  {
    id: 'req-4',
    title: '3D Block Palette & Gradient Matcher',
    description: 'Pick two Minecraft blocks and generate a smooth 7-block gradient transition for builders.',
    category: 'Minecraft Tools',
    author: 'TerraCraft',
    votes: 24,
    status: 'Shipped',
    createdAt: '2 weeks ago',
  },
];

export interface PricingTier {
  id: 'free' | 'plus' | 'pro' | 'business';
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  normalAllowance: number;
  advancedAllowance: number;
  savedConfigs: string;
  storage: string;
  cta: string;
  highlighted?: boolean;
  features: string[];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Everything you need to run a server.',
    monthlyPrice: 0,
    annualPrice: 0,
    normalAllowance: 15,
    advancedAllowance: 10,
    savedConfigs: '5 saved configs',
    storage: '50 MB',
    cta: 'Start with the tools',
    features: [
      'Full access to all 40 tools',
      '15 Normal · 10 Advanced daily uses',
      'No ads, runs in your browser',
      '1 monitored server profile',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    tagline: 'For active players and growing SMPs.',
    monthlyPrice: 5,
    annualPrice: 4,
    normalAllowance: 50,
    advancedAllowance: 25,
    savedConfigs: 'Unlimited saved configs',
    storage: '500 MB',
    cta: 'Upgrade to Plus',
    highlighted: true,
    features: [
      '50 Normal · 25 Advanced daily uses',
      'Unlimited saved configs & presets',
      '5 monitored server profiles',
      'Priority Surge AI responses',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Built for network owners and plugin devs.',
    monthlyPrice: 12,
    annualPrice: 10,
    normalAllowance: 120,
    advancedAllowance: 75,
    savedConfigs: 'Unlimited + Version History',
    storage: '5 GB',
    cta: 'Choose Pro',
    features: [
      '120 Normal · 75 Advanced daily uses',
      '20 monitored servers & alert webhooks',
      'Spark report diffing & export',
      'Developer API key access',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Teams, studios, and large networks.',
    monthlyPrice: 29,
    annualPrice: 24,
    normalAllowance: 400,
    advancedAllowance: 200,
    savedConfigs: 'Shared team workspace',
    storage: '25 GB',
    cta: 'Choose Business',
    features: [
      '400 Normal · 200 Advanced daily uses',
      'Up to 15 team members & RBAC roles',
      'Unlimited monitored servers',
      'Dedicated Discord support channel',
    ],
  },
];

export const BASH_PROTECT_MODULES = [
  {
    title: 'Anti-NSFW Messages',
    description: 'Automatically detects and removes explicit text payloads across channels and threads before members see them.',
  },
  {
    title: 'Anti-NSFW Links',
    description: 'Resolves shortened URLs and blocks known adult, shock, and malicious redirect domains in real time.',
  },
  {
    title: 'Anti-Crypto Scams',
    description: 'Stops fake airdrop impersonations, wallet-drainer embeds, and compromised Nitro gift announcements.',
  },
  {
    title: 'Anti-Raid Protection',
    description: 'Detects coordinated join bursts, locks verification gates automatically, and quarantines suspicious accounts.',
  },
  {
    title: 'Honeypot System',
    description: 'Creates trap channels invisible to normal users that immediately ban compromised spam bots on message.',
  },
  {
    title: 'Anti-Spam & Anti-Phishing',
    description: 'Rate-limits mention floods, duplicate image dumps, and lookalike domain phishing attempts.',
  },
];
