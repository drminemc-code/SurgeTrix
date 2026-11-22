import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  ARMOR_TRIM_MATERIALS,
  ARMOR_TRIM_PATTERNS,
  ArmorMaterialType,
  ArmorPiece,
  BANNER_PATTERNS,
  BannerLayerInput,
  FIREWORK_COLORS,
  FIREWORK_SHAPES,
  FireworkShape,
  buildArmorTrimGiveCommand,
  buildBannerGiveCommand,
  buildFireworkGiveCommand,
  calculateBeaconRequirements,
  calculateComparatorSignal,
  calculateConduitRange,
  calculateRedstoneTiming,
  calculateWorldDistance,
  getFireworkIngredients,
} from '../../utils/minecraftExtraTools';
import { CopyButton } from './TextAndServerTools';

export const FireworkDesignerTool: React.FC = () => {
  const [flight, setFlight] = useState<1 | 2 | 3>(2);
  const [shape, setShape] = useState<FireworkShape>('large_ball');
  const [primaryColorId, setPrimaryColorId] = useState('cyan');
  const [fadeColorId, setFadeColorId] = useState<string>('lime');
  const [twinkle, setTwinkle] = useState(true);
  const [trail, setTrail] = useState(false);
  const [count, setCount] = useState(16);

  const primary = FIREWORK_COLORS.find((c) => c.id === primaryColorId) || FIREWORK_COLORS[0];
  const fade = FIREWORK_COLORS.find((c) => c.id === fadeColorId) || null;
  const recipe = getFireworkIngredients({
    flight,
    shape,
    primaryColorId,
    fadeColorId: fadeColorId || null,
    twinkle,
    trail,
  });
  const command = buildFireworkGiveCommand({
    flight,
    shape,
    primaryColorId,
    fadeColorId: fadeColorId || null,
    twinkle,
    trail,
    count,
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="fw-flight"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Flight Duration (Gunpowder)
          </label>
          <select
            id="fw-flight"
            value={flight}
            onChange={(e) => setFlight(Number(e.target.value) as 1 | 2 | 3)}
            className="w-full px-3.5 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white"
          >
            <option value={1}>Flight 1 (~25 blocks)</option>
            <option value={2}>Flight 2 (~42 blocks)</option>
            <option value={3}>Flight 3 (~60 blocks)</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="fw-shape"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Explosion Shape
          </label>
          <select
            id="fw-shape"
            value={shape}
            onChange={(e) => setShape(e.target.value as FireworkShape)}
            className="w-full px-3.5 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white"
          >
            {FIREWORK_SHAPES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.modifierItem})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="fw-count"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Stack Count (1–64)
          </label>
          <input
            id="fw-count"
            type="number"
            min={1}
            max={64}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 1)}
            className="w-full px-3.5 py-2.5 st-surface-inset font-mono text-sm text-slate-900 dark:text-white tabular-nums"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
            Primary Star Color: {primary.name}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {FIREWORK_COLORS.map((c) => {
              const selected = c.id === primaryColorId;
              return (
                <button
                  key={c.id}
                  type="button"
                  title={c.name}
                  aria-label={`Primary ${c.name}`}
                  aria-pressed={selected}
                  onClick={() => setPrimaryColorId(c.id)}
                  className="w-7 h-7 rounded-md border transition-transform cursor-pointer"
                  style={{
                    backgroundColor: c.hex,
                    borderColor: selected ? 'var(--st-text)' : 'rgba(148,163,184,0.35)',
                    transform: selected ? 'scale(1.12)' : 'scale(1)',
                  }}
                />
              );
            })}
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
            Fade Color: {fade ? fade.name : 'None'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFadeColorId('')}
              className={`px-2.5 h-7 rounded-md text-xs font-medium cursor-pointer ${
                !fadeColorId ? 'st-btn-primary' : 'st-btn-secondary'
              }`}
            >
              None
            </button>
            {FIREWORK_COLORS.map((c) => {
              const selected = c.id === fadeColorId;
              return (
                <button
                  key={c.id}
                  type="button"
                  title={c.name}
                  aria-label={`Fade ${c.name}`}
                  aria-pressed={selected}
                  onClick={() => setFadeColorId(c.id)}
                  className="w-7 h-7 rounded-md border transition-transform cursor-pointer"
                  style={{
                    backgroundColor: c.hex,
                    borderColor: selected ? 'var(--st-text)' : 'rgba(148,163,184,0.35)',
                    transform: selected ? 'scale(1.12)' : 'scale(1)',
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={twinkle}
            onChange={(e) => setTwinkle(e.target.checked)}
            className="w-4 h-4 accent-[var(--st-accent)]"
          />
          <span>Twinkle (Glowstone Dust)</span>
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={trail}
            onChange={(e) => setTrail(e.target.checked)}
            className="w-4 h-4 accent-[var(--st-accent)]"
          />
          <span>Trail (Diamond)</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="st-surface-inset p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Crafting Recipe (per Firework)
          </p>
          <p className="text-sm text-slate-900 dark:text-white font-medium">
            Rocket: {recipe.rocketGunpowder}× Gunpowder · {recipe.rocketPaper}× Paper · 1× Firework Star
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Star: {recipe.starIngredients.join(' · ')}
            {recipe.fadeDye ? ` · ${recipe.fadeDye}` : ''}
          </p>
        </div>

        <div className="st-surface-inset p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="w-9 h-9 rounded-lg border border-white/15 shrink-0"
              style={{
                background: fade
                  ? `radial-gradient(circle, ${primary.hex} 35%, ${fade.hex} 100%)`
                  : primary.hex,
              }}
            />
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <div className="font-semibold text-slate-900 dark:text-white">
                {FIREWORK_SHAPES.find((s) => s.id === shape)?.label}
              </div>
              <div>Est. altitude: ~{recipe.estimatedFlightBlocks} blocks</div>
            </div>
          </div>
          <span className="font-mono text-xs tabular-nums text-[var(--st-accent-text)]">
            Duration {flight}
          </span>
        </div>
      </div>

      <div className="st-surface-inset p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Minecraft 1.21+ /give Command
          </span>
          <CopyButton text={command} label="Copy Command" />
        </div>
        <code className="block text-xs font-mono text-[var(--st-accent-text)] break-all">
          {command}
        </code>
      </div>
    </div>
  );
};

export const RedstoneCalculatorTool: React.FC = () => {
  const [seconds, setSeconds] = useState(4.0);
  const [itemCount, setItemCount] = useState(864);
  const [containerSlots, setContainerSlots] = useState(27);

  const timing = calculateRedstoneTiming(seconds);
  const comparator = calculateComparatorSignal(itemCount, containerSlots, 64);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="st-surface-inset p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Delay &amp; Etho Hopper Clock
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Convert target delay seconds into redstone repeaters or Etho hopper items.
            </p>
          </div>
          <div>
            <label
              htmlFor="rs-seconds"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Target Delay (seconds)
            </label>
            <input
              id="rs-seconds"
              type="number"
              min={0}
              step="0.1"
              value={seconds}
              onChange={(e) => setSeconds(Number(e.target.value))}
              className="w-full px-3.5 py-2 bg-transparent border border-slate-300 dark:border-white/15 rounded-lg font-mono text-sm text-slate-900 dark:text-white tabular-nums"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs tabular-nums pt-1">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Redstone Ticks</span>
              <span className="text-lg font-bold font-mono text-[var(--st-accent-text)]">
                {timing.redstoneTicks} rt
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Game Ticks</span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {timing.gameTicks} gt
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Repeaters Needed</span>
              <span className="text-sm font-semibold font-mono text-slate-900 dark:text-white">
                {timing.repeatersNeeded} ({timing.fullFourTickRepeaters}×4t
                {timing.remainderTicks > 0 ? ` + 1×${timing.remainderTicks}t` : ''})
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Etho Hopper Items</span>
              <span className="text-sm font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                {timing.ethoHopperItems} items ({timing.actualEthoCycleSeconds}s)
              </span>
            </div>
          </div>
        </div>

        <div className="st-surface-inset p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Comparator Container Signal
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Calculate exact comparator output (0–15) from chest, barrel, or hopper fill.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="rs-container"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Container Type
              </label>
              <select
                id="rs-container"
                value={containerSlots}
                onChange={(e) => setContainerSlots(Number(e.target.value))}
                className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-white/15 rounded-lg text-sm text-slate-900 dark:text-white"
              >
                <option value={5}>Hopper (5 slots)</option>
                <option value={9}>Dispenser / Dropper (9 slots)</option>
                <option value={27}>Chest / Barrel (27 slots)</option>
                <option value={54}>Double Chest (54 slots)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="rs-items"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Items Inside (64-stack)
              </label>
              <input
                id="rs-items"
                type="number"
                min={0}
                value={itemCount}
                onChange={(e) => setItemCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-transparent border border-slate-300 dark:border-white/15 rounded-lg font-mono text-sm text-slate-900 dark:text-white tabular-nums"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 tabular-nums">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Comparator Output
              </span>
              <span className="text-2xl font-bold font-mono text-rose-500">
                Signal {comparator.signalStrength} / 15
              </span>
            </div>
            <div className="text-right text-xs text-slate-600 dark:text-slate-400">
              <div>{comparator.fillPercent}% full</div>
              <div>
                {comparator.itemCount} / {comparator.capacity} items
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ArmorTrimStudioTool: React.FC = () => {
  const [armorMaterial, setArmorMaterial] = useState<ArmorMaterialType>('netherite');
  const [piece, setPiece] = useState<ArmorPiece>('chestplate');
  const [patternId, setPatternId] = useState('silence');
  const [trimMaterialId, setTrimMaterialId] = useState('amethyst');

  const selectedPattern =
    ARMOR_TRIM_PATTERNS.find((p) => p.id === patternId) || ARMOR_TRIM_PATTERNS[0];
  const selectedTrimMat =
    ARMOR_TRIM_MATERIALS.find((m) => m.id === trimMaterialId) || ARMOR_TRIM_MATERIALS[0];
  const command = buildArmorTrimGiveCommand(armorMaterial, piece, patternId, trimMaterialId);

  const armorBaseColors: Record<ArmorMaterialType, string> = {
    netherite: '#4b4346',
    diamond: '#39d5c4',
    iron: '#c9cfd6',
    golden: '#eab308',
    chainmail: '#71717a',
    leather: '#8c5a3c',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label
            htmlFor="trim-armor"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Armor Material
          </label>
          <select
            id="trim-armor"
            value={armorMaterial}
            onChange={(e) => setArmorMaterial(e.target.value as ArmorMaterialType)}
            className="w-full px-3.5 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white"
          >
            <option value="netherite">Netherite</option>
            <option value="diamond">Diamond</option>
            <option value="iron">Iron</option>
            <option value="golden">Gold</option>
            <option value="chainmail">Chainmail</option>
            <option value="leather">Leather</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="trim-piece"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Armor Piece
          </label>
          <select
            id="trim-piece"
            value={piece}
            onChange={(e) => setPiece(e.target.value as ArmorPiece)}
            className="w-full px-3.5 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white"
          >
            <option value="helmet">Helmet</option>
            <option value="chestplate">Chestplate</option>
            <option value="leggings">Leggings</option>
            <option value="boots">Boots</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="trim-pattern"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Smithing Template ({selectedPattern.source})
          </label>
          <select
            id="trim-pattern"
            value={patternId}
            onChange={(e) => setPatternId(e.target.value)}
            className="w-full px-3.5 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white"
          >
            {ARMOR_TRIM_PATTERNS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.source}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="trim-mat"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Trim Material
          </label>
          <select
            id="trim-mat"
            value={trimMaterialId}
            onChange={(e) => setTrimMaterialId(e.target.value)}
            className="w-full px-3.5 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white"
          >
            {ARMOR_TRIM_MATERIALS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="st-surface-inset p-5 flex flex-col sm:flex-row items-center gap-6">
        <svg
          width="88"
          height="88"
          viewBox="0 0 64 64"
          className="shrink-0"
          role="img"
          aria-label="Armor trim visual preview"
        >
          <rect
            x="12"
            y="8"
            width="40"
            height="48"
            rx="6"
            fill={armorBaseColors[armorMaterial]}
            stroke={selectedTrimMat.hex}
            strokeWidth="3"
          />
          <path
            d="M20 18 H44 M20 28 H44 M26 38 H38 M22 48 H42"
            stroke={selectedTrimMat.hex}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        <div className="space-y-1.5 text-sm">
          <div className="font-bold text-slate-900 dark:text-white capitalize">
            {armorMaterial} {piece} · {selectedPattern.name} Trim
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Smithing Recipe: 1× {armorMaterial} {piece} + 1× {selectedPattern.name} Smithing Template ({selectedPattern.source}) + 1× {selectedTrimMat.name}
          </p>
        </div>
      </div>

      <div className="st-surface-inset p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Minecraft 1.21+ /give Command
          </span>
          <CopyButton text={command} label="Copy Command" />
        </div>
        <code className="block text-xs font-mono text-[var(--st-accent-text)] break-all">
          {command}
        </code>
      </div>
    </div>
  );
};

export const DistanceAndChunkTool: React.FC = () => {
  const [x1, setX1] = useState(0);
  const [y1, setY1] = useState(64);
  const [z1, setZ1] = useState(0);
  const [x2, setX2] = useState(300);
  const [y2, setY2] = useState(96);
  const [z2, setZ2] = useState(-400);

  const res = calculateWorldDistance({ x: x1, y: y1, z: z1 }, { x: x2, y: y2, z: z2 });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="st-surface-inset p-4 space-y-3">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Origin Point A (X, Y, Z)
          </span>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'd-x1', label: 'X1', val: x1, set: setX1 },
              { id: 'd-y1', label: 'Y1', val: y1, set: setY1 },
              { id: 'd-z1', label: 'Z1', val: z1, set: setZ1 },
            ].map((f) => (
              <div key={f.id}>
                <label htmlFor={f.id} className="text-[11px] text-slate-500 block mb-1">
                  {f.label}
                </label>
                <input
                  id={f.id}
                  type="number"
                  value={f.val}
                  onChange={(e) => f.set(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-2 bg-transparent border border-slate-300 dark:border-white/15 rounded-lg font-mono text-sm text-slate-900 dark:text-white tabular-nums"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="st-surface-inset p-4 space-y-3">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Destination Point B (X, Y, Z)
          </span>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'd-x2', label: 'X2', val: x2, set: setX2 },
              { id: 'd-y2', label: 'Y2', val: y2, set: setY2 },
              { id: 'd-z2', label: 'Z2', val: z2, set: setZ2 },
            ].map((f) => (
              <div key={f.id}>
                <label htmlFor={f.id} className="text-[11px] text-slate-500 block mb-1">
                  {f.label}
                </label>
                <input
                  id={f.id}
                  type="number"
                  value={f.val}
                  onChange={(e) => f.set(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-2 bg-transparent border border-slate-300 dark:border-white/15 rounded-lg font-mono text-sm text-slate-900 dark:text-white tabular-nums"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
        <div className="st-surface-inset p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">2D Distance</div>
          <div className="text-xl font-bold font-mono text-[var(--st-accent-text)] mt-1">
            {res.distance2D} m
          </div>
        </div>
        <div className="st-surface-inset p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">3D Distance</div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {res.distance3D} m
          </div>
        </div>
        <div className="st-surface-inset p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Compass Bearing</div>
          <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {res.cardinalDirection} ({res.bearingDegrees}°)
          </div>
        </div>
        <div className="st-surface-inset p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Destination Chunk / Region</div>
          <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1">
            {res.chunkTarget.x}, {res.chunkTarget.z} · {res.regionFile}
          </div>
        </div>
      </div>
    </div>
  );
};

export const BeaconAndConduitTool: React.FC = () => {
  const [tier, setTier] = useState<1 | 2 | 3 | 4>(4);
  const [conduitBlocks, setConduitBlocks] = useState(42);

  const beacon = calculateBeaconRequirements(tier);
  const conduit = calculateConduitRange(conduitBlocks);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="st-surface-inset p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Beacon Pyramid Calculator
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Select pyramid height to compute Iron/Gold/Emerald/Diamond/Netherite costs.
            </p>
          </div>
          <div className="flex gap-2">
            {([1, 2, 3, 4] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`flex-1 py-2 text-xs font-semibold cursor-pointer ${
                  tier === t ? 'st-btn-primary' : 'st-btn-secondary'
                }`}
              >
                Tier {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Base Footprint</span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {beacon.baseDimensions}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Mineral Blocks</span>
              <span className="text-lg font-bold font-mono text-[var(--st-accent-text)]">
                {beacon.blocksNeeded} ({beacon.stacksOfBlocks} stacks)
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Total Ingots / Gems</span>
              <span className="text-sm font-semibold font-mono text-slate-900 dark:text-white">
                {beacon.ingotsNeeded.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Effect Radius &amp; Duration</span>
              <span className="text-sm font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                {beacon.effectRangeBlocks}m · {beacon.durationSeconds}s
              </span>
            </div>
          </div>
        </div>

        <div className="st-surface-inset p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Conduit Underwater Frame
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Prismarine, Dark Prismarine, Prismarine Bricks, or Sea Lanterns in 5×5 rings.
            </p>
          </div>
          <div>
            <label
              htmlFor="conduit-blocks"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Frame Blocks Placed ({conduitBlocks} / 42)
            </label>
            <input
              id="conduit-blocks"
              type="range"
              min={0}
              max={42}
              value={conduitBlocks}
              onChange={(e) => setConduitBlocks(Number(e.target.value))}
              className="w-full accent-[var(--st-accent)] cursor-pointer"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Status</span>
              <span
                className={`text-base font-bold ${
                  conduit.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}
              >
                {conduit.active ? 'Conduit Power Active' : 'Needs ≥ 16 Blocks'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Underwater Range</span>
              <span className="text-lg font-bold font-mono text-[var(--st-accent-text)]">
                {conduit.rangeBlocks} blocks
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BannerStudioTool: React.FC = () => {
  const [baseColor, setBaseColor] = useState('cyan');
  const [layers, setLayers] = useState<BannerLayerInput[]>([
    { pattern: 'border', color: 'black' },
    { pattern: 'creeper', color: 'white' },
  ]);
  const [nextPattern, setNextPattern] = useState<string>('stripe_bottom');
  const [nextColor, setNextColor] = useState<string>('yellow');

  const command = buildBannerGiveCommand(baseColor, layers);
  const baseHex = FIREWORK_COLORS.find((c) => c.id === baseColor)?.hex || '#169C9C';

  const handleAddLayer = () => {
    if (layers.length >= 6) return;
    setLayers((prev) => [...prev, { pattern: nextPattern, color: nextColor }]);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-4 st-surface-inset p-5 flex flex-col items-center gap-3">
          <div
            className="w-24 h-44 rounded-md border-2 border-white/20 flex flex-col items-center justify-center relative overflow-hidden"
            style={{ backgroundColor: baseHex }}
          >
            {layers.map((l, idx) => {
              const hex = FIREWORK_COLORS.find((c) => c.id === l.color)?.hex || '#FFFFFF';
              return (
                <div
                  key={`${l.pattern}-${idx}`}
                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/55 mt-1"
                  style={{ color: hex }}
                >
                  {l.pattern}
                </div>
              );
            })}
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {layers.length} / 6 Pattern Layers
          </span>
        </div>

        <div className="md:col-span-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="ban-base"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Base Banner Color
              </label>
              <select
                id="ban-base"
                value={baseColor}
                onChange={(e) => setBaseColor(e.target.value)}
                className="w-full px-3 py-2 st-surface-inset text-sm text-slate-900 dark:text-white"
              >
                {FIREWORK_COLORS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="ban-pat"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Add Layer Pattern
              </label>
              <select
                id="ban-pat"
                value={nextPattern}
                onChange={(e) => setNextPattern(e.target.value)}
                className="w-full px-3 py-2 st-surface-inset text-sm text-slate-900 dark:text-white"
              >
                {BANNER_PATTERNS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="ban-col"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Layer Dye Color
              </label>
              <select
                id="ban-col"
                value={nextColor}
                onChange={(e) => setNextColor(e.target.value)}
                className="w-full px-3 py-2 st-surface-inset text-sm text-slate-900 dark:text-white"
              >
                {FIREWORK_COLORS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={layers.length >= 6}
            onClick={handleAddLayer}
            className="inline-flex items-center gap-1.5 px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Pattern Layer</span>
          </button>

          <div className="space-y-2">
            {layers.map((layer, idx) => (
              <div
                key={`${layer.pattern}-${idx}`}
                className="st-surface-inset px-3.5 py-2 flex items-center justify-between text-xs"
              >
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  Layer {idx + 1}: {layer.pattern} ({layer.color})
                </span>
                <button
                  type="button"
                  aria-label={`Remove layer ${idx + 1}`}
                  onClick={() => setLayers((prev) => prev.filter((_, i) => i !== idx))}
                  className="p-1 text-rose-500 hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="st-surface-inset p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Minecraft 1.21+ /give Banner Command
          </span>
          <CopyButton text={command} label="Copy Command" />
        </div>
        <code className="block text-xs font-mono text-[var(--st-accent-text)] break-all">
          {command}
        </code>
      </div>
    </div>
  );
};
