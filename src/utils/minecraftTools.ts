export interface NetherCoordsResult {
  x: number;
  y: number;
  z: number;
  direction: 'to-nether' | 'to-overworld';
}

export function convertNetherCoordinates(
  x: number,
  y: number,
  z: number,
  direction: 'to-nether' | 'to-overworld'
): NetherCoordsResult {
  const safeX = Number.isFinite(x) ? x : 0;
  const safeY = Number.isFinite(y) ? y : 64;
  const safeZ = Number.isFinite(z) ? z : 0;

  if (direction === 'to-nether') {
    return {
      x: Math.round(safeX / 8),
      y: Math.max(0, Math.min(255, Math.round(safeY))),
      z: Math.round(safeZ / 8),
      direction,
    };
  }
  return {
    x: Math.round(safeX * 8),
    y: Math.max(-64, Math.min(320, Math.round(safeY))),
    z: Math.round(safeZ * 8),
    direction,
  };
}

export interface ShulkerBreakdown {
  totalItems: number;
  stackSize: number;
  shulkerBoxes: number;
  remainingStacks: number;
  remainingItems: number;
  totalSlots: number;
  doubleChests: number;
}

export function calculateShulkerStorage(
  totalItems: number,
  stackSize: 1 | 16 | 64 = 64
): ShulkerBreakdown {
  const safeTotal = Math.max(0, Math.floor(Number.isFinite(totalItems) ? totalItems : 0));
  const safeStack = stackSize === 1 || stackSize === 16 ? stackSize : 64;
  const itemsPerShulker = 27 * safeStack;
  const itemsPerDoubleChest = 54 * safeStack;

  const shulkerBoxes = Math.floor(safeTotal / itemsPerShulker);
  const afterShulkers = safeTotal % itemsPerShulker;
  const remainingStacks = Math.floor(afterShulkers / safeStack);
  const remainingItems = afterShulkers % safeStack;
  const totalSlots = safeTotal === 0 ? 0 : Math.ceil(safeTotal / safeStack);
  const doubleChests = Number((safeTotal / itemsPerDoubleChest).toFixed(2));

  return {
    totalItems: safeTotal,
    stackSize: safeStack,
    shulkerBoxes,
    remainingStacks,
    remainingItems,
    totalSlots,
    doubleChests,
  };
}

export function totalXpForLevel(level: number): number {
  const lvl = Math.max(0, Math.floor(Number.isFinite(level) ? level : 0));
  if (lvl <= 16) {
    return lvl * lvl + 6 * lvl;
  }
  if (lvl <= 31) {
    return Math.floor(2.5 * lvl * lvl - 40.5 * lvl + 360);
  }
  return Math.floor(4.5 * lvl * lvl - 162.5 * lvl + 2220);
}

export function xpToNextLevel(level: number): number {
  const lvl = Math.max(0, Math.floor(Number.isFinite(level) ? level : 0));
  if (lvl <= 15) return 2 * lvl + 7;
  if (lvl <= 30) return 5 * lvl - 38;
  return 9 * lvl - 158;
}

export function levelFromTotalXp(xp: number): { level: number; progressPct: number; xpIntoLevel: number; xpNeeded: number } {
  const safeXp = Math.max(0, Math.floor(Number.isFinite(xp) ? xp : 0));
  let level = 0;
  while (totalXpForLevel(level + 1) <= safeXp && level < 1000) {
    level++;
  }
  const base = totalXpForLevel(level);
  const needed = xpToNextLevel(level);
  const into = safeXp - base;
  const progressPct = needed > 0 ? Math.min(100, Math.round((into / needed) * 100)) : 0;
  return { level, progressPct, xpIntoLevel: into, xpNeeded: needed };
}

export interface EconomyCalcResult {
  buyPricePerItem: number;
  sellPricePerItem: number;
  quantity: number;
  taxPercent: number;
  grossRevenue: number;
  taxAmount: number;
  netRevenue: number;
  totalCost: number;
  netProfit: number;
  marginPercent: number;
}

export function calculateEconomyProfit(
  buyPricePerItem: number,
  sellPricePerItem: number,
  quantity: number,
  taxPercent: number = 0
): EconomyCalcResult {
  const buy = Math.max(0, Number.isFinite(buyPricePerItem) ? buyPricePerItem : 0);
  const sell = Math.max(0, Number.isFinite(sellPricePerItem) ? sellPricePerItem : 0);
  const qty = Math.max(0, Math.floor(Number.isFinite(quantity) ? quantity : 0));
  const tax = Math.max(0, Math.min(100, Number.isFinite(taxPercent) ? taxPercent : 0));

  const totalCost = Number((buy * qty).toFixed(2));
  const grossRevenue = Number((sell * qty).toFixed(2));
  const taxAmount = Number(((grossRevenue * tax) / 100).toFixed(2));
  const netRevenue = Number((grossRevenue - taxAmount).toFixed(2));
  const netProfit = Number((netRevenue - totalCost).toFixed(2));
  const marginPercent = netRevenue > 0 ? Number(((netProfit / netRevenue) * 100).toFixed(1)) : 0;

  return {
    buyPricePerItem: buy,
    sellPricePerItem: sell,
    quantity: qty,
    taxPercent: tax,
    grossRevenue,
    taxAmount,
    netRevenue,
    totalCost,
    netProfit,
    marginPercent,
  };
}

export const MC_COLOR_MAP: Record<string, { hex: string; name: string }> = {
  '0': { hex: '#000000', name: 'Black' },
  '1': { hex: '#0000AA', name: 'Dark Blue' },
  '2': { hex: '#00AA00', name: 'Dark Green' },
  '3': { hex: '#00AAAA', name: 'Dark Aqua' },
  '4': { hex: '#AA0000', name: 'Dark Red' },
  '5': { hex: '#AA00AA', name: 'Dark Purple' },
  '6': { hex: '#FFAA00', name: 'Gold' },
  '7': { hex: '#AAAAAA', name: 'Gray' },
  '8': { hex: '#555555', name: 'Dark Gray' },
  '9': { hex: '#5555FF', name: 'Blue' },
  a: { hex: '#55FF55', name: 'Green' },
  b: { hex: '#55FFFF', name: 'Aqua' },
  c: { hex: '#FF5555', name: 'Red' },
  d: { hex: '#FF55FF', name: 'Light Purple' },
  e: { hex: '#FFFF55', name: 'Yellow' },
  f: { hex: '#FFFFFF', name: 'White' },
};

export interface StyledSegment {
  text: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}

export function parseMinecraftFormattedText(input: string): StyledSegment[] {
  const normalized = input.replace(/§/g, '&');
  const segments: StyledSegment[] = [];
  let color = '#AAAAAA';
  let bold = false;
  let italic = false;
  let underline = false;
  let strikethrough = false;
  let buffer = '';

  const flush = () => {
    if (buffer.length > 0) {
      segments.push({ text: buffer, color, bold, italic, underline, strikethrough });
      buffer = '';
    }
  };

  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i] === '&' && i + 1 < normalized.length) {
      const code = normalized[i + 1].toLowerCase();
      if (MC_COLOR_MAP[code]) {
        flush();
        color = MC_COLOR_MAP[code].hex;
        bold = false;
        italic = false;
        underline = false;
        strikethrough = false;
        i++;
        continue;
      }
      if (code === 'l') {
        flush();
        bold = true;
        i++;
        continue;
      }
      if (code === 'o') {
        flush();
        italic = true;
        i++;
        continue;
      }
      if (code === 'n') {
        flush();
        underline = true;
        i++;
        continue;
      }
      if (code === 'm') {
        flush();
        strikethrough = true;
        i++;
        continue;
      }
      if (code === 'r') {
        flush();
        color = '#AAAAAA';
        bold = false;
        italic = false;
        underline = false;
        strikethrough = false;
        i++;
        continue;
      }
    }
    buffer += normalized[i];
  }
  flush();
  return segments;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [139, 92, 246];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

export interface GradientStep {
  char: string;
  hex: string;
}

export function generateHexGradient(text: string, startHex: string, endHex: string): {
  steps: GradientStep[];
  legacyHexString: string;
  miniMessageString: string;
} {
  const chars = Array.from(text);
  const [r1, g1, b1] = hexToRgb(startHex);
  const [r2, g2, b2] = hexToRgb(endHex);

  const steps: GradientStep[] = chars.map((char, idx) => {
    const t = chars.length <= 1 ? 0 : idx / (chars.length - 1);
    const hex = rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
    return { char, hex };
  });

  const legacyHexString = steps
    .map(({ char, hex }) => {
      if (char === ' ') return ' ';
      const parts = hex.slice(1).split('');
      return `&x${parts.map((p) => `&${p}`).join('')}${char}`;
    })
    .join('');

  const miniMessageString = `<gradient:${startHex}:${endHex}>${text}</gradient>`;

  return { steps, legacyHexString, miniMessageString };
}

export function convertTextFormat(
  input: string,
  target: 'ampersand' | 'section' | 'minimessage' | 'json'
): string {
  const withAmp = input.replace(/§/g, '&');
  if (target === 'ampersand') return withAmp;
  if (target === 'section') return withAmp.replace(/&([0-9a-fl-or])/gi, '§$1');

  const miniMap: Record<string, string> = {
    '0': '<black>',
    '1': '<dark_blue>',
    '2': '<dark_green>',
    '3': '<dark_aqua>',
    '4': '<dark_red>',
    '5': '<dark_purple>',
    '6': '<gold>',
    '7': '<gray>',
    '8': '<dark_gray>',
    '9': '<blue>',
    a: '<green>',
    b: '<aqua>',
    c: '<red>',
    d: '<light_purple>',
    e: '<yellow>',
    f: '<white>',
    l: '<bold>',
    o: '<italic>',
    n: '<underlined>',
    m: '<strikethrough>',
    r: '<reset>',
  };

  if (target === 'minimessage') {
    return withAmp.replace(/&([0-9a-fl-or])/gi, (_, c: string) => miniMap[c.toLowerCase()] ?? `&${c}`);
  }

  const segments = parseMinecraftFormattedText(withAmp);
  return JSON.stringify(
    segments.map((s) => ({
      text: s.text,
      color: s.color,
      ...(s.bold ? { bold: true } : {}),
      ...(s.italic ? { italic: true } : {}),
      ...(s.underline ? { underlined: true } : {}),
      ...(s.strikethrough ? { strikethrough: true } : {}),
    })),
    null,
    2
  );
}

export function calculateTravelEstimate(
  blocks: number,
  mode: 'walk' | 'sprint' | 'boat-ice' | 'elytra' | 'minecart'
): { speedBps: number; seconds: number; formatted: string; rocketsNeeded: number } {
  const speeds: Record<typeof mode, number> = {
    walk: 4.317,
    sprint: 5.612,
    'boat-ice': 40.0,
    elytra: 33.5,
    minecart: 8.0,
  };
  const safeBlocks = Math.max(0, Number.isFinite(blocks) ? blocks : 0);
  const speedBps = speeds[mode];
  const seconds = safeBlocks / speedBps;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  const formatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  const rocketsNeeded = mode === 'elytra' ? Math.ceil(safeBlocks / 90) : 0;
  return { speedBps, seconds: Number(seconds.toFixed(1)), formatted, rocketsNeeded };
}

export function deterministicSeedHash(seedStr: string, cx: number, cz: number): number {
  let h = 2166136261;
  const key = `${seedStr}:${cx}:${cz}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function validateYamlBasic(yaml: string): { valid: boolean; errors: string[] } {
  const lines = yaml.split('\n');
  const errors: string[] = [];
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (line.includes('\t')) {
      errors.push(`Line ${lineNum}: YAML forbids tab indentation — replace tabs with spaces.`);
    }
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    if (trimmed.includes(':') && !trimmed.startsWith('-')) {
      const colonIdx = trimmed.indexOf(':');
      const after = trimmed.slice(colonIdx + 1);
      if (after.length > 0 && !after.startsWith(' ') && !trimmed.startsWith('http')) {
        errors.push(`Line ${lineNum}: Missing space after ':' key separator.`);
      }
    }
    const singleQuotes = (trimmed.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0 && !trimmed.startsWith('#')) {
      errors.push(`Line ${lineNum}: Unclosed single quote.`);
    }
  });
  return { valid: errors.length === 0, errors };
}
