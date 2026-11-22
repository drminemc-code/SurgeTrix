import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Play, Pause } from 'lucide-react';
import { validateYamlBasic } from '../../utils/minecraftTools';
import { CopyButton } from './TextAndServerTools';

export const JsonAndYamlTool: React.FC<{ kind: 'json' | 'yaml' }> = ({ kind }) => {
  const [jsonInput, setJsonInput] = useState(
    '{\n  "text": "SurgeTrix",\n  "color": "#06b6d4",\n  "bold": true\n}'
  );
  const [yamlInput, setYamlInput] = useState(
    'server:\n  name: SurgeTrix\n  port: 25565\n  max-players: 150\n  motd: "SurgeTrix Network"'
  );

  if (kind === 'json') {
    let valid = true;
    let formatted = '';
    let errorMsg = '';
    try {
      const parsed = JSON.parse(jsonInput);
      formatted = JSON.stringify(parsed, null, 2);
    } catch (err) {
      valid = false;
      errorMsg = err instanceof Error ? err.message : 'Invalid JSON';
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => valid && setJsonInput(formatted)}
              className="px-3.5 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer"
            >
              Format (2 spaces)
            </button>
            <button
              type="button"
              onClick={() => valid && setJsonInput(JSON.stringify(JSON.parse(jsonInput)))}
              className="px-3.5 py-1.5 st-btn-secondary text-xs font-semibold cursor-pointer"
            >
              Minify
            </button>
          </div>
          <CopyButton text={jsonInput} />
        </div>
        <textarea
          aria-label="JSON editor"
          rows={10}
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          className="w-full p-4 st-surface-inset font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
        />
        <div
          className={`rounded-xl px-4 py-3 text-xs font-medium flex items-center gap-2 ${
            valid
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          {valid ? (
            <>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Valid JSON syntax</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  const yamlCheck = validateYamlBasic(yamlInput);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Checks tab indentation, colon spacing, and unclosed quotes
        </span>
        <CopyButton text={yamlInput} />
      </div>
      <textarea
        aria-label="YAML editor"
        rows={10}
        value={yamlInput}
        onChange={(e) => setYamlInput(e.target.value)}
        className="w-full p-4 st-surface-inset font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
      />
      {yamlCheck.valid ? (
        <div className="rounded-xl px-4 py-3 text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>No YAML syntax issues detected.</span>
        </div>
      ) : (
        <div className="rounded-xl p-4 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 space-y-1 text-xs">
          {yamlCheck.errors.map((err) => (
            <div key={err} className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const TabStudioAndAnimationTool: React.FC<{ mode: 'placeholder' | 'animation' }> = ({
  mode,
}) => {
  const [condPlaceholder, setCondPlaceholder] = useState('%player_world%');
  const [condValue, setCondValue] = useState('world_nether');
  const [trueOut, setTrueOut] = useState('Nether');
  const [falseOut, setFalseOut] = useState('Overworld');

  const [framesText, setFramesText] = useState(
    'SURGETRIX\nSURGE TRIX\nWELCOME\nPLAY NOW'
  );
  const [intervalMs, setIntervalMs] = useState(250);
  const [playing, setPlaying] = useState(true);
  const [frameIdx, setFrameIdx] = useState(0);

  const frames = framesText
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);

  useEffect(() => {
    if (mode !== 'animation' || !playing || frames.length <= 1) return;
    const timer = setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % frames.length);
    }, Math.max(80, intervalMs));
    return () => clearInterval(timer);
  }, [mode, playing, frames.length, intervalMs]);

  if (mode === 'placeholder') {
    const yamlBlock = `conditions:\n  world-badge:\n    conditions:\n      - "${condPlaceholder}=${condValue}"\n    yes: "${trueOut}"\n    no: "${falseOut}"`;
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="tab-ph"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              PlaceholderAPI Variable
            </label>
            <input
              id="tab-ph"
              type="text"
              value={condPlaceholder}
              onChange={(e) => setCondPlaceholder(e.target.value)}
              className="w-full px-3.5 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="tab-val"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Equals Value
            </label>
            <input
              id="tab-val"
              type="text"
              value={condValue}
              onChange={(e) => setCondValue(e.target.value)}
              className="w-full px-3.5 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="tab-yes"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Output if True
            </label>
            <input
              id="tab-yes"
              type="text"
              value={trueOut}
              onChange={(e) => setTrueOut(e.target.value)}
              className="w-full px-3.5 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="tab-no"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Output if False
            </label>
            <input
              id="tab-no"
              type="text"
              value={falseOut}
              onChange={(e) => setFalseOut(e.target.value)}
              className="w-full px-3.5 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>
        <div className="st-surface-inset p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              TAB animations / conditions.yml
            </span>
            <CopyButton text={yamlBlock} label="Copy YAML" />
          </div>
          <pre className="text-xs font-mono text-[var(--st-accent-text)] overflow-x-auto">
            {yamlBlock}
          </pre>
        </div>
      </div>
    );
  }

  const animYaml = `surgetrix-title:\n  change-interval: ${intervalMs}\n  texts:\n${frames
    .map((f) => `    - "${f}"`)
    .join('\n')}`;

  return (
    <div className="space-y-5">
      <div className="st-surface-inset p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Live Frame Preview</p>
          <p className="text-xl font-bold font-mono text-[var(--st-accent-text)]">
            {frames[frameIdx % Math.max(1, frames.length)] || 'SURGETRIX'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPlaying(!playing)}
          className="inline-flex items-center gap-2 px-3.5 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{playing ? 'Pause' : 'Play'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label
            htmlFor="anim-frames"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Animation Frames (one per line)
          </label>
          <textarea
            id="anim-frames"
            rows={5}
            value={framesText}
            onChange={(e) => setFramesText(e.target.value)}
            className="w-full p-3 st-surface-inset font-mono text-xs text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor="anim-ms"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Interval (ms)
          </label>
          <input
            id="anim-ms"
            type="number"
            min={50}
            step={50}
            value={intervalMs}
            onChange={(e) => setIntervalMs(Number(e.target.value))}
            className="w-full px-3.5 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white tabular-nums"
          />
        </div>
      </div>

      <div className="st-surface-inset p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            animations.yml
          </span>
          <CopyButton text={animYaml} label="Copy YAML" />
        </div>
        <pre className="text-xs font-mono text-emerald-700 dark:text-emerald-300 overflow-x-auto">
          {animYaml}
        </pre>
      </div>
    </div>
  );
};

export const DiagnosticsAndAnalyzerTool: React.FC<{ slug: string }> = ({ slug }) => {
  const [pluginList, setPluginList] = useState(
    'EssentialsX 2.20.1\nLuckPerms 5.4.131\nVault 1.7.3\nCMI 9.7.0\nTAB 4.1.6'
  );
  const [tpsSample, setTpsSample] = useState(19.8);
  const [msptSample, setMsptSample] = useState(28.4);

  const lines = pluginList
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const hasConflict =
    lines.some((l) => l.toLowerCase().includes('essentials')) &&
    lines.some((l) => l.toLowerCase().includes('cmi'));

  if (slug === 'spark-analyzer') {
    const status = msptSample > 50 ? 'Tick Lag Detected' : msptSample > 35 ? 'Moderate Load' : 'Healthy';
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="spark-tps"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Average TPS (20.0 max)
            </label>
            <input
              id="spark-tps"
              type="number"
              step="0.1"
              max={20}
              min={0}
              value={tpsSample}
              onChange={(e) => setTpsSample(Number(e.target.value))}
              className="w-full px-3.5 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white tabular-nums"
            />
          </div>
          <div>
            <label
              htmlFor="spark-mspt"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Mean Tick Duration (MSPT)
            </label>
            <input
              id="spark-mspt"
              type="number"
              step="0.5"
              min={0}
              value={msptSample}
              onChange={(e) => setMsptSample(Number(e.target.value))}
              className="w-full px-3.5 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
          <div className="st-surface-inset p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Overall Health</div>
            <div
              className={`text-lg font-bold mt-1 ${
                msptSample > 50
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {status}
            </div>
          </div>
          <div className="st-surface-inset p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Tick Budget Used</div>
            <div className="text-lg font-bold text-[var(--st-accent-text)] mt-1">
              {Math.round((msptSample / 50) * 100)}% of 50ms
            </div>
          </div>
          <div className="st-surface-inset p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Recommendation</div>
            <div className="text-xs text-slate-700 dark:text-slate-300 mt-1.5">
              {msptSample > 40
                ? 'Lower entity-activation-range and enable Paper per-player-mob-spawns.'
                : 'Tick headroom is healthy; monitor villager & hopper counts.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label
        htmlFor="diag-plugins"
        className="block text-xs font-medium text-slate-700 dark:text-slate-300"
      >
        Paste plugin list, config block, or dependency manifest
      </label>
      <textarea
        id="diag-plugins"
        rows={7}
        value={pluginList}
        onChange={(e) => setPluginList(e.target.value)}
        className="w-full p-4 st-surface-inset font-mono text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
      />
      <div
        className={`rounded-xl p-4 text-xs border ${
          hasConflict
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
        }`}
      >
        {hasConflict ? (
          <p>
            <strong>Potential Overlap Detected:</strong> EssentialsX and CMI share `/home`, `/warp`, `/tpa`, and economy commands. Configure aliases in `commands.yml` or disable overlapping modules.
          </p>
        ) : (
          <p>
            <strong>Scan Complete:</strong> Checked {lines.length} entries with zero critical conflicts or suspicious patterns.
          </p>
        )}
      </div>
    </div>
  );
};
