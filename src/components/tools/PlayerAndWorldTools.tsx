import React, { useEffect, useRef, useState } from 'react';
import {
  calculateShulkerStorage,
  calculateTravelEstimate,
  convertNetherCoordinates,
  deterministicSeedHash,
  levelFromTotalXp,
  totalXpForLevel,
} from '../../utils/minecraftTools';
import { CopyButton } from './TextAndServerTools';

export const NetherCalculatorTool: React.FC = () => {
  const [x, setX] = useState(800);
  const [y, setY] = useState(64);
  const [z, setZ] = useState(-400);
  const [direction, setDirection] = useState<'to-nether' | 'to-overworld'>('to-nether');

  const res = convertNetherCoordinates(x, y, z, direction);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setDirection('to-nether')}
          className={`px-4 py-2 text-xs font-semibold cursor-pointer ${
            direction === 'to-nether' ? 'st-btn-primary' : 'st-btn-secondary'
          }`}
        >
          Overworld → Nether (÷ 8)
        </button>
        <button
          type="button"
          onClick={() => setDirection('to-overworld')}
          className={`px-4 py-2 text-xs font-semibold cursor-pointer ${
            direction === 'to-overworld' ? 'st-btn-primary' : 'st-btn-secondary'
          }`}
        >
          Nether → Overworld (× 8)
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { id: 'nether-x', label: 'X Coordinate', val: x, set: setX },
          { id: 'nether-y', label: 'Y Elevation', val: y, set: setY },
          { id: 'nether-z', label: 'Z Coordinate', val: z, set: setZ },
        ].map((f) => (
          <div key={f.id}>
            <label
              htmlFor={f.id}
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {f.label}
            </label>
            <input
              id={f.id}
              type="number"
              value={f.val}
              onChange={(e) => f.set(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 st-surface-inset font-mono text-sm text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
            />
          </div>
        ))}
      </div>

      <div className="st-surface-inset p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {direction === 'to-nether' ? 'Target Nether Portal Coordinates' : 'Target Overworld Coordinates'}
          </p>
          <p
            className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums"
            data-testid="nether-result"
          >
            X: {res.x} · Y: {res.y} · Z: {res.z}
          </p>
        </div>
        <CopyButton text={`${res.x} ${res.y} ${res.z}`} label="Copy Coords" />
      </div>
    </div>
  );
};

export const ShulkerCalculatorTool: React.FC = () => {
  const [items, setItems] = useState(3456);
  const [stackSize, setStackSize] = useState<1 | 16 | 64>(64);
  const res = calculateShulkerStorage(items, stackSize);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="shulker-items"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Total Item Quantity
          </label>
          <input
            id="shulker-items"
            type="number"
            min={0}
            value={items}
            onChange={(e) => setItems(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 st-surface-inset font-mono text-sm text-slate-900 dark:text-white tabular-nums"
          />
        </div>
        <div>
          <label
            htmlFor="shulker-stack"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Max Stack Size
          </label>
          <select
            id="shulker-stack"
            value={stackSize}
            onChange={(e) => setStackSize(Number(e.target.value) as 1 | 16 | 64)}
            className="w-full px-3.5 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white"
          >
            <option value={64}>64 (Blocks / Ingots)</option>
            <option value={16}>16 (Ender Pearls / Signs)</option>
            <option value={1}>1 (Tools / Potions)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
        <div className="st-surface-inset p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Full Shulker Boxes</div>
          <div className="text-2xl font-bold text-[var(--st-accent-text)] mt-1">{res.shulkerBoxes}</div>
        </div>
        <div className="st-surface-inset p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Remaining Stacks</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {res.remainingStacks}
          </div>
        </div>
        <div className="st-surface-inset p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Loose Items</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {res.remainingItems}
          </div>
        </div>
        <div className="st-surface-inset p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Double Chests</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{res.doubleChests}</div>
        </div>
      </div>
    </div>
  );
};

export const MaterialListTool: React.FC = () => {
  const [rows, setRows] = useState([
    { name: 'Stone Bricks', count: 2400 },
    { name: 'Spruce Planks', count: 1120 },
    { name: 'Glass Panes', count: 480 },
  ]);
  const [newName, setNewName] = useState('');
  const [newCount, setNewCount] = useState(640);

  const total = rows.reduce((sum, r) => sum + Math.max(0, r.count), 0);
  const summary = calculateShulkerStorage(total, 64);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          aria-label="Block name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Block name (e.g. Deepslate Tiles)"
          className="px-3.5 py-2 st-surface-inset text-sm text-slate-900 dark:text-white"
        />
        <input
          type="number"
          aria-label="Block count"
          min={1}
          value={newCount}
          onChange={(e) => setNewCount(Number(e.target.value))}
          className="px-3.5 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white tabular-nums"
        />
        <button
          type="button"
          onClick={() => {
            if (!newName.trim()) return;
            setRows([...rows, { name: newName.trim(), count: Math.max(1, newCount) }]);
            setNewName('');
          }}
          className="px-4 py-2 st-btn-primary text-sm font-semibold cursor-pointer"
        >
          Add Block
        </button>
      </div>

      <div className="st-surface-inset divide-y divide-slate-200 dark:divide-white/[0.06]">
        {rows.map((r, idx) => {
          const b = calculateShulkerStorage(r.count, 64);
          return (
            <div
              key={idx}
              className="px-4 py-3 flex items-center justify-between gap-4 text-sm tabular-nums"
            >
              <span className="font-medium text-slate-900 dark:text-white">{r.name}</span>
              <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                {r.count} items · {b.shulkerBoxes} shulkers, {b.remainingStacks} stacks, {b.remainingItems} items
              </span>
            </div>
          );
        })}
      </div>

      <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
        Total Build Volume: {total.toLocaleString()} blocks ({summary.shulkerBoxes} shulkers + {summary.remainingStacks} stacks)
      </div>
    </div>
  );
};

export const SeedMapExplorerTool: React.FC = () => {
  const [seed, setSeed] = useState('surgetrix-2026');
  const [edition, setEdition] = useState<'java' | 'bedrock'>('java');
  const [centerX, setCenterX] = useState(0);
  const [centerZ, setCenterZ] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 32;
    const cell = canvas.width / size;
    const biomePalette = [
      '#2d6a4f',
      '#40916c',
      '#1b4332',
      '#e9c46a',
      '#277da1',
      '#577590',
      '#6b705c',
    ];

    for (let gx = 0; gx < size; gx++) {
      for (let gz = 0; gz < size; gz++) {
        const cx = Math.floor(centerX / 16) + gx - size / 2;
        const cz = Math.floor(centerZ / 16) + gz - size / 2;
        const h = deterministicSeedHash(`${edition}:${seed}`, Math.floor(cx / 3), Math.floor(cz / 3));
        const biomeIdx = Math.floor(h * biomePalette.length);
        ctx.fillStyle = biomePalette[biomeIdx];
        ctx.fillRect(gx * cell, gz * cell, cell + 0.5, cell + 0.5);

        const slimeH = deterministicSeedHash(`${seed}:slime`, cx, cz);
        if (slimeH < 0.1) {
          ctx.fillStyle = 'rgba(74, 222, 128, 0.38)';
          ctx.fillRect(gx * cell + 2, gz * cell + 2, cell - 4, cell - 4);
        }

        const structH = deterministicSeedHash(`${seed}:struct`, cx, cz);
        if (structH > 0.992) {
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(gx * cell + cell / 2, gz * cell + cell / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(canvas.width / 2 - cell / 2, canvas.height / 2 - cell / 2, cell, cell);
  }, [seed, edition, centerX, centerZ]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label
            htmlFor="seed-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            World Seed
          </label>
          <input
            id="seed-input"
            type="text"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className="w-full px-3.5 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor="seed-edition"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Edition
          </label>
          <select
            id="seed-edition"
            value={edition}
            onChange={(e) => setEdition(e.target.value as 'java' | 'bedrock')}
            className="w-full px-3.5 py-2 st-surface-inset text-sm text-slate-900 dark:text-white"
          >
            <option value="java">Java 1.21</option>
            <option value="bedrock">Bedrock 1.21</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="seed-x"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Center X
          </label>
          <input
            id="seed-x"
            type="number"
            value={centerX}
            onChange={(e) => setCenterX(Number(e.target.value))}
            className="w-full px-3.5 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white tabular-nums"
          />
        </div>
        <div>
          <label
            htmlFor="seed-z"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Center Z
          </label>
          <input
            id="seed-z"
            type="number"
            value={centerZ}
            onChange={(e) => setCenterZ(Number(e.target.value))}
            className="w-full px-3.5 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white tabular-nums"
          />
        </div>
      </div>

      <div className="st-surface-inset p-4 flex flex-col md:flex-row gap-6 items-start">
        <canvas
          ref={canvasRef}
          width={384}
          height={384}
          data-testid="seedmap-canvas"
          className="rounded-lg border border-slate-300 dark:border-white/10 w-full max-w-[384px] aspect-square"
        />
        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Map Legend</p>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-xs bg-[#40916c]" />
            <span>Plains / Forest / Taiga Biomes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-xs bg-[#e9c46a]" />
            <span>Desert / Savanna</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-xs bg-[#277da1]" />
            <span>Ocean / River Basins</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-xs bg-emerald-400/80" />
            <span>Slime Chunks</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-yellow-400" />
            <span>Villages &amp; Structures</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const XpAndTravelTool: React.FC<{ kind: 'xp' | 'elytra' | 'traveltime' }> = ({ kind }) => {
  const [level, setLevel] = useState(30);
  const [xpInput, setXpInput] = useState(1395);
  const [blocks, setBlocks] = useState(2500);

  if (kind === 'xp') {
    const needed = totalXpForLevel(level);
    const decoded = levelFromTotalXp(xpInput);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="st-surface-inset p-5 space-y-3">
          <label
            htmlFor="xp-level-in"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Target Level → Total XP Points
          </label>
          <input
            id="xp-level-in"
            type="number"
            min={0}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="w-full px-3.5 py-2 st-card font-mono text-sm text-slate-900 dark:text-white tabular-nums"
          />
          <div className="text-xl font-bold font-mono text-[var(--st-accent-text)] tabular-nums">
            {needed.toLocaleString()} XP points
          </div>
        </div>

        <div className="st-surface-inset p-5 space-y-3">
          <label
            htmlFor="xp-pts-in"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            XP Points → Level
          </label>
          <input
            id="xp-pts-in"
            type="number"
            min={0}
            value={xpInput}
            onChange={(e) => setXpInput(Number(e.target.value))}
            className="w-full px-3.5 py-2 st-card font-mono text-sm text-slate-900 dark:text-white tabular-nums"
          />
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            Level {decoded.level} ({decoded.progressPct}% to next)
          </div>
        </div>
      </div>
    );
  }

  const modes: ('walk' | 'sprint' | 'minecart' | 'elytra' | 'boat-ice')[] = [
    'walk',
    'sprint',
    'minecart',
    'elytra',
    'boat-ice',
  ];

  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="travel-blocks"
          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
        >
          Distance (Blocks)
        </label>
        <input
          id="travel-blocks"
          type="number"
          min={0}
          value={blocks}
          onChange={(e) => setBlocks(Number(e.target.value))}
          className="w-full max-w-xs px-3.5 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white tabular-nums"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 tabular-nums">
        {modes.map((m) => {
          const est = calculateTravelEstimate(blocks, m);
          return (
            <div key={m} className="st-surface-inset p-4">
              <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                {m.replace('-', ' ')}
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {est.formatted}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">{est.speedBps} b/s</div>
              {est.rocketsNeeded > 0 && (
                <div className="text-xs text-[var(--st-accent-text)] mt-1">
                  ~{est.rocketsNeeded} rockets
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PlayerIdentityAndGuidesTool: React.FC<{ slug: string }> = ({ slug }) => {
  const [username, setUsername] = useState('Notch');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [playerInfo, setPlayerInfo] = useState<{
    found: boolean;
    username: string;
    uuid: string | null;
    rawUuid: string | null;
    offlineUuid: string;
    avatarUrl: string | null;
    bodyUrl: string | null;
  } | null>(null);
  const [emeraldBudget, setEmeraldBudget] = useState(64);
  const [discountHero, setDiscountHero] = useState(2);

  const runPlayerLookup = async (nameToCheck: string) => {
    const clean = nameToCheck.trim();
    if (!clean) return;
    setLookupLoading(true);
    setLookupError('');
    try {
      const res = await fetch(`/api/player/${encodeURIComponent(clean)}`);
      const data = (await res.json()) as {
        ok?: boolean;
        found?: boolean;
        username?: string;
        uuid?: string | null;
        rawUuid?: string | null;
        offlineUuid?: string;
        avatarUrl?: string | null;
        bodyUrl?: string | null;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setLookupError(data.error || 'Could not query Mojang profile service.');
        return;
      }
      setPlayerInfo({
        found: Boolean(data.found),
        username: data.username || clean,
        uuid: data.uuid || null,
        rawUuid: data.rawUuid || null,
        offlineUuid: data.offlineUuid || '',
        avatarUrl: data.avatarUrl || null,
        bodyUrl: data.bodyUrl || null,
      });
    } catch {
      setLookupError('Network error while querying Mojang API.');
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => {
    if (slug === 'skin' || slug === 'uuid') {
      void runPlayerLookup('Notch');
    }
  }, [slug]);

  if (slug === 'skin' || slug === 'uuid') {
    const displayUuid = playerInfo?.uuid || playerInfo?.offlineUuid || '';
    return (
      <div className="space-y-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runPlayerLookup(username);
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[220px] max-w-sm">
            <label
              htmlFor="player-name"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Minecraft Username (Live Mojang Lookup)
            </label>
            <input
              id="player-name"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Notch"
              className="w-full px-3.5 py-2 st-surface-inset text-sm text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={lookupLoading}
            className="px-4 py-2.5 st-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {lookupLoading ? 'Looking up...' : 'Lookup Player'}
          </button>
        </form>

        {lookupError && (
          <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
            {lookupError}
          </div>
        )}

        {playerInfo && (
          <div className="st-surface-inset p-5 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-xl bg-[var(--st-accent-soft)] border border-slate-300 dark:border-white/10 flex items-center justify-center shrink-0 overflow-hidden p-2">
              {playerInfo.avatarUrl ? (
                <img
                  src={slug === 'skin' && playerInfo.bodyUrl ? playerInfo.bodyUrl : playerInfo.avatarUrl}
                  alt={`${playerInfo.username} Minecraft skin`}
                  className="max-h-full w-auto object-contain"
                />
              ) : (
                <div className="w-10 h-10 bg-[#e0b899] rounded-xs relative border border-black/30">
                  <div className="absolute top-3 left-1.5 w-2 h-1.5 bg-[#3b2f2f]" />
                  <div className="absolute top-3 right-1.5 w-2 h-1.5 bg-[#3b2f2f]" />
                  <div className="absolute bottom-1.5 left-3 w-4 h-1.5 bg-[#8f5b48]" />
                </div>
              )}
            </div>
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {playerInfo.username}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    playerInfo.found
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
                  }`}
                >
                  {playerInfo.found ? 'Verified Mojang Account' : 'Unclaimed / Offline Username'}
                </span>
              </div>
              {playerInfo.uuid && (
                <div className="text-xs font-mono text-[var(--st-accent-text)] break-all">
                  Mojang UUID: {playerInfo.uuid}
                </div>
              )}
              {playerInfo.rawUuid && (
                <div className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                  Raw Hex: {playerInfo.rawUuid}
                </div>
              )}
              <div className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                Offline v3 UUID: {playerInfo.offlineUuid}
              </div>
            </div>
            {displayUuid && <CopyButton text={displayUuid} label="Copy UUID" />}
          </div>
        )}
      </div>
    );
  }

  if (slug === 'potion') {
    const potions = [
      { name: 'Speed II', base: 'Nether Wart + Sugar', mod: 'Glowstone Dust', dur: '1:30' },
      { name: 'Strength II', base: 'Nether Wart + Blaze Powder', mod: 'Glowstone Dust', dur: '1:30' },
      { name: 'Fire Resistance+', base: 'Nether Wart + Magma Cream', mod: 'Redstone Dust', dur: '8:00' },
      { name: 'Healing II', base: 'Nether Wart + Glistering Melon', mod: 'Glowstone Dust', dur: 'Instant' },
      { name: 'Night Vision+', base: 'Nether Wart + Golden Carrot', mod: 'Redstone Dust', dur: '8:00' },
      { name: 'Invisibility+', base: 'Night Vision + Fermented Spider Eye', mod: 'Redstone Dust', dur: '8:00' },
    ];
    return (
      <div className="st-surface-inset overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-200/70 dark:bg-white/[0.04] text-xs uppercase text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Potion</th>
              <th className="px-4 py-3">Recipe</th>
              <th className="px-4 py-3">Modifier</th>
              <th className="px-4 py-3">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
            {potions.map((p) => (
              <tr key={p.name}>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{p.base}</td>
                <td className="px-4 py-3 text-[var(--st-accent-text)]">{p.mod}</td>
                <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {p.dur}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const unitCost = Math.max(1, 24 - discountHero * 5);
  const tradesPossible = Math.floor(emeraldBudget / unitCost);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="plan-budget"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Resource / Emerald Budget
          </label>
          <input
            id="plan-budget"
            type="number"
            min={1}
            value={emeraldBudget}
            onChange={(e) => setEmeraldBudget(Number(e.target.value))}
            className="w-full px-3.5 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white tabular-nums"
          />
        </div>
        <div>
          <label
            htmlFor="plan-tier"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Efficiency / Cure Multiplier (0–4)
          </label>
          <input
            id="plan-tier"
            type="number"
            min={0}
            max={4}
            value={discountHero}
            onChange={(e) => setDiscountHero(Math.min(4, Math.max(0, Number(e.target.value))))}
            className="w-full px-3.5 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white tabular-nums"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
        <div className="st-surface-inset p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Effective Unit Cost</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{unitCost}</div>
        </div>
        <div className="st-surface-inset p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Projected Output / Cycles</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {tradesPossible}
          </div>
        </div>
        <div className="st-surface-inset p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Efficiency Bonus</div>
          <div className="text-2xl font-bold text-[var(--st-accent-text)] mt-1">
            +{discountHero * 20}%
          </div>
        </div>
      </div>
    </div>
  );
};
