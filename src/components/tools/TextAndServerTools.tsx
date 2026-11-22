import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, RefreshCw } from 'lucide-react';
import {
  MC_COLOR_MAP,
  calculateEconomyProfit,
  convertTextFormat,
  generateHexGradient,
  parseMinecraftFormattedText,
} from '../../utils/minecraftTools';
import { SurgeTrixLogo } from '../SurgeTrixLogo';

export const CopyButton: React.FC<{ text: string; label?: string }> = ({
  text,
  label = 'Copy',
}) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 st-btn-secondary text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
};

export const MotdGeneratorTool: React.FC = () => {
  const [line1, setLine1] = useState('Welcome to SurgeTrix Network');
  const [line2, setLine2] = useState('Survival · Skyblock · Events');
  const [serverName, setServerName] = useState('SurgeTrix Server');
  const [selectedRow, setSelectedRow] = useState(true);

  const seg1 = parseMinecraftFormattedText(line1);
  const seg2 = parseMinecraftFormattedText(line2);
  const propertiesOutput = `motd=${line1.replace(/&([0-9a-fklmnor])/gi, '\\u00A7$1')}\\n${line2.replace(/&([0-9a-fklmnor])/gi, '\\u00A7$1')}`;

  return (
    <div className="space-y-6">
      <div className="st-surface-inset p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Minecraft Java Multiplayer List Preview
          </p>
          <button
            type="button"
            onClick={() => setSelectedRow((s) => !s)}
            className="text-xs font-medium px-2.5 py-1 st-btn-secondary cursor-pointer"
          >
            {selectedRow ? 'Selection Border: On' : 'Selection Border: Off'}
          </button>
        </div>

        {/* Authentic Minecraft multiplayer list container */}
        <div className="bg-[#1b1410] border-2 border-[#3a3028] p-3.5 space-y-2.5">
          <div className="text-center text-[11px] font-mono text-[#e2e2e2] tracking-wide">
            Play Multiplayer
          </div>
          <div
            className="flex items-center gap-3.5 bg-[#0e0b09] p-2.5 transition-colors"
            style={{
              border: selectedRow ? '2px solid #808080' : '2px solid transparent',
            }}
          >
            <div className="w-16 h-16 bg-[#1e1e1e] border border-[#3d3d3d] flex items-center justify-center shrink-0">
              <SurgeTrixLogo size={40} showWordmark={false} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[14px] font-semibold text-white font-mono truncate">
                  {serverName}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[#aaaaaa] font-mono tabular-nums">42/150</span>
                  {/* Authentic Minecraft 5-bar green ping meter */}
                  <svg
                    width="16"
                    height="12"
                    viewBox="0 0 16 12"
                    aria-label="Full 5-bar connection (18ms)"
                    className="shrink-0"
                  >
                    <rect x="0" y="9" width="2" height="3" fill="#00e600" />
                    <rect x="3" y="7" width="2" height="5" fill="#00e600" />
                    <rect x="6" y="5" width="2" height="7" fill="#00e600" />
                    <rect x="9" y="2" width="2" height="10" fill="#00e600" />
                    <rect x="12" y="0" width="2" height="12" fill="#00e600" />
                  </svg>
                </div>
              </div>
              <div className="font-mono text-[13px] leading-snug truncate">
                {seg1.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      color: s.color,
                      fontWeight: s.bold ? 700 : 400,
                      fontStyle: s.italic ? 'italic' : 'normal',
                      textDecoration: `${s.underline ? 'underline' : ''} ${s.strikethrough ? 'line-through' : ''}`,
                    }}
                  >
                    {s.text}
                  </span>
                ))}
              </div>
              <div className="font-mono text-[13px] leading-snug truncate">
                {seg2.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      color: s.color,
                      fontWeight: s.bold ? 700 : 400,
                      fontStyle: s.italic ? 'italic' : 'normal',
                      textDecoration: `${s.underline ? 'underline' : ''} ${s.strikethrough ? 'line-through' : ''}`,
                    }}
                  >
                    {s.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-[11px] text-[#e0e0e0]">
            <div className="py-1.5 bg-[#6f6f6f] border border-t-[#9d9d9d] border-l-[#9d9d9d] border-r-[#3a3a3a] border-b-[#3a3a3a]">
              Join Server
            </div>
            <div className="py-1.5 bg-[#6f6f6f] border border-t-[#9d9d9d] border-l-[#9d9d9d] border-r-[#3a3a3a] border-b-[#3a3a3a]">
              Direct Connection
            </div>
            <div className="py-1.5 bg-[#6f6f6f] border border-t-[#9d9d9d] border-l-[#9d9d9d] border-r-[#3a3a3a] border-b-[#3a3a3a]">
              Refresh
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="motd-server-name"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Server Title (Preview Only)
          </label>
          <input
            id="motd-server-name"
            type="text"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            className="w-full px-3.5 py-2 st-surface-inset text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
          />
        </div>
        <div>
          <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Quick Color Insert
          </span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(MC_COLOR_MAP).map(([code, info]) => (
              <button
                key={code}
                type="button"
                title={info.name}
                onClick={() => setLine1((prev) => prev + `&${code}`)}
                className="w-7 h-7 rounded-md border border-slate-300 dark:border-white/15 text-[11px] font-mono font-bold flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                style={{
                  backgroundColor: info.hex,
                  color: ['0', '1', '2', '4', '5', '8'].includes(code) ? '#fff' : '#0a0f1c',
                }}
              >
                &amp;{code}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label
            htmlFor="motd-line-1"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            MOTD Line 1
          </label>
          <input
            id="motd-line-1"
            type="text"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            className="w-full px-3.5 py-2.5 st-surface-inset font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
          />
        </div>
        <div>
          <label
            htmlFor="motd-line-2"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            MOTD Line 2
          </label>
          <input
            id="motd-line-2"
            type="text"
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
            className="w-full px-3.5 py-2.5 st-surface-inset font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
          />
        </div>
      </div>

      <div className="st-surface-inset p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            server.properties Output
          </span>
          <CopyButton text={propertiesOutput} label="Copy server.properties" />
        </div>
        <pre className="text-xs font-mono text-[var(--st-accent-text)] overflow-x-auto whitespace-pre-wrap break-all">
          {propertiesOutput}
        </pre>
      </div>
    </div>
  );
};

export const ColorAndGradientTool: React.FC<{ mode: 'colors' | 'gradient' | 'converter' | 'font' }> = ({
  mode,
}) => {
  const [text, setText] = useState('SurgeTrix Network');
  const [startHex, setStartHex] = useState('#0891b2');
  const [endHex, setEndHex] = useState('#34d399');
  const [legacyText, setLegacyText] = useState('SurgeTrix Network');
  const [targetFormat, setTargetFormat] = useState<'ampersand' | 'section' | 'minimessage' | 'json'>('minimessage');

  const gradient = generateHexGradient(text || 'SurgeTrix', startHex, endHex);

  const fontVariants = [
    {
      name: 'Small Caps',
      value: (text || 'SurgeTrix')
        .toLowerCase()
        .replace(/[a-z]/g, (c) => 'ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ'[c.charCodeAt(0) - 97] || c),
    },
    {
      name: 'Bold Sans',
      value: Array.from(text || 'SurgeTrix')
        .map((c) => {
          const code = c.charCodeAt(0);
          if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d5d4 + (code - 65));
          if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d5ee + (code - 97));
          return c;
        })
        .join(''),
    },
    {
      name: 'Monospace',
      value: Array.from(text || 'SurgeTrix')
        .map((c) => {
          const code = c.charCodeAt(0);
          if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d670 + (code - 65));
          if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d68a + (code - 97));
          return c;
        })
        .join(''),
    },
    {
      name: 'Fullwidth',
      value: Array.from(text || 'SurgeTrix')
        .map((c) => {
          const code = c.charCodeAt(0);
          if (code >= 33 && code <= 126) return String.fromCodePoint(code + 0xfee0);
          return c;
        })
        .join(''),
    },
  ];

  if (mode === 'colors') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(MC_COLOR_MAP).map(([code, info]) => (
            <div
              key={code}
              className="st-surface-inset p-3 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-6 h-6 rounded-md border border-slate-300 dark:border-white/15 shrink-0"
                  style={{ backgroundColor: info.hex }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {info.name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    &amp;{code} · §{code}
                  </div>
                </div>
              </div>
              <CopyButton text={`&${code}`} label={`&${code}`} />
            </div>
          ))}
        </div>
        <div className="st-surface-inset p-4">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Formatting Codes
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono">
            {[
              { code: '&l', label: 'Bold', cls: 'font-bold' },
              { code: '&o', label: 'Italic', cls: 'italic' },
              { code: '&n', label: 'Underline', cls: 'underline' },
              { code: '&m', label: 'Strike', cls: 'line-through' },
              { code: '&r', label: 'Reset', cls: '' },
            ].map((f) => (
              <div
                key={f.code}
                className="p-2.5 st-card flex items-center justify-between"
              >
                <span className={`${f.cls} text-slate-900 dark:text-slate-100`}>{f.label}</span>
                <span className="text-[var(--st-accent-text)]">{f.code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'converter') {
    const output = convertTextFormat(legacyText, targetFormat);
    return (
      <div className="space-y-5">
        <div>
          <label
            htmlFor="conv-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Input Formatted String (&amp; or § codes)
          </label>
          <input
            id="conv-input"
            type="text"
            value={legacyText}
            onChange={(e) => setLegacyText(e.target.value)}
            className="w-full px-3.5 py-2.5 st-surface-inset font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['minimessage', 'section', 'ampersand', 'json'] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => setTargetFormat(fmt)}
              className={`px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
                targetFormat === fmt ? 'st-btn-primary' : 'st-btn-secondary'
              }`}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="st-surface-inset p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Converted Output
            </span>
            <CopyButton text={output} />
          </div>
          <pre className="text-xs font-mono text-emerald-700 dark:text-emerald-300 overflow-x-auto whitespace-pre-wrap break-all">
            {output}
          </pre>
        </div>
      </div>
    );
  }

  if (mode === 'font') {
    return (
      <div className="space-y-5">
        <div>
          <label
            htmlFor="font-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Your Text
          </label>
          <input
            id="font-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3.5 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
          />
        </div>
        <div className="space-y-3">
          {fontVariants.map((v) => (
            <div
              key={v.name}
              className="st-surface-inset p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{v.name}</div>
                <div className="text-base text-slate-900 dark:text-white truncate">{v.value}</div>
              </div>
              <CopyButton text={v.value} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-1">
          <label
            htmlFor="grad-text"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Text
          </label>
          <input
            id="grad-text"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3.5 py-2 st-surface-inset text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
          />
        </div>
        <div>
          <label
            htmlFor="grad-start"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Start Color
          </label>
          <div className="flex items-center gap-2">
            <input
              id="grad-start"
              type="color"
              value={startHex}
              onChange={(e) => setStartHex(e.target.value)}
              className="w-10 h-10 rounded-lg bg-transparent border border-slate-300 dark:border-white/15 cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{startHex}</span>
          </div>
        </div>
        <div>
          <label
            htmlFor="grad-end"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            End Color
          </label>
          <div className="flex items-center gap-2">
            <input
              id="grad-end"
              type="color"
              value={endHex}
              onChange={(e) => setEndHex(e.target.value)}
              className="w-10 h-10 rounded-lg bg-transparent border border-slate-300 dark:border-white/15 cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{endHex}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-[#14161f] p-5 text-center">
        <p className="text-xs text-slate-400 mb-2">Live Preview</p>
        <div className="text-2xl font-bold tracking-tight">
          {gradient.steps.map((s, idx) => (
            <span key={idx} style={{ color: s.hex }}>
              {s.char}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="st-surface-inset p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              MiniMessage
            </span>
            <CopyButton text={gradient.miniMessageString} />
          </div>
          <code className="text-xs font-mono text-[var(--st-accent-text)] break-all">
            {gradient.miniMessageString}
          </code>
        </div>
        <div className="st-surface-inset p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Legacy Hex (&amp;x)
            </span>
            <CopyButton text={gradient.legacyHexString} />
          </div>
          <code className="text-xs font-mono text-emerald-700 dark:text-emerald-300 break-all">
            {gradient.legacyHexString}
          </code>
        </div>
      </div>
    </div>
  );
};

export const ServerCheckerTool: React.FC = () => {
  const [address, setAddress] = useState('mc.hypixel.net');
  const [edition, setEdition] = useState<'java' | 'bedrock'>('java');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState<{
    address: string;
    edition: string;
    online: boolean;
    players: string;
    version: string;
    latency: string;
    motd: string;
    ipAddress?: string | null;
    srvHost?: string | null;
  } | null>(null);

  const runLiveCheck = async (targetAddress: string, targetEdition: 'java' | 'bedrock') => {
    const clean = targetAddress.trim();
    if (!clean) {
      setError('Enter a server IP or domain (e.g. mc.hypixel.net).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/mc-status?address=${encodeURIComponent(clean)}&edition=${targetEdition}`
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        address?: string;
        edition?: string;
        online?: boolean;
        playersOnline?: number;
        maxPlayers?: number;
        version?: string;
        latencyMs?: number;
        motdClean?: string;
        ipAddress?: string | null;
        srvRecord?: { host: string; port: number } | null;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not probe this server.');
        return;
      }
      setChecked({
        address: data.address || clean,
        edition: data.edition || (targetEdition === 'java' ? 'Java Edition' : 'Bedrock Edition'),
        online: Boolean(data.online),
        players: `${(data.playersOnline ?? 0).toLocaleString()} / ${(data.maxPlayers ?? 0).toLocaleString()}`,
        version: data.version || 'Unknown',
        latency: data.latencyMs ? `${data.latencyMs} ms` : '—',
        motd: data.motdClean || 'No MOTD reported',
        ipAddress: data.ipAddress,
        srvHost: data.srvRecord ? `${data.srvRecord.host}:${data.srvRecord.port}` : null,
      });
    } catch {
      setError('Network error while checking live Minecraft server status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runLiveCheck('mc.hypixel.net', 'java');
  }, []);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    void runLiveCheck(address, edition);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCheck} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-7">
          <label
            htmlFor="srv-ip"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Server IP / Domain
          </label>
          <input
            id="srv-ip"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="mc.hypixel.net"
            className="w-full px-3.5 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
          />
        </div>
        <div className="sm:col-span-3">
          <label
            htmlFor="srv-edition"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Edition
          </label>
          <select
            id="srv-edition"
            value={edition}
            onChange={(e) => setEdition(e.target.value as 'java' | 'bedrock')}
            className="w-full px-3.5 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
          >
            <option value="java">Java</option>
            <option value="bedrock">Bedrock</option>
          </select>
        </div>
        <div className="sm:col-span-2 flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 st-btn-primary text-sm font-semibold cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check'}
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
          {error}
        </div>
      )}

      {checked && (
        <div className="space-y-4" data-testid="status-result">
          <div className="st-surface-inset p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Status</div>
              <div
                className={`text-base font-bold mt-1 ${
                  checked.online ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {checked.online ? 'Online' : 'Offline'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Players</div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-1">{checked.players}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Version</div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-1">{checked.version}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Probe Latency</div>
              <div className="text-base font-bold text-[var(--st-accent-text)] mt-1">{checked.latency}</div>
            </div>
          </div>

          <div className="st-surface-inset p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <span className="text-slate-600 dark:text-slate-300 truncate">{checked.motd}</span>
            <span className="text-slate-500 dark:text-slate-400 shrink-0">
              {checked.srvHost
                ? `SRV: ${checked.srvHost}`
                : checked.ipAddress
                ? `IP: ${checked.ipAddress}`
                : checked.edition}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const EconomyCalculatorTool: React.FC = () => {
  const [buy, setBuy] = useState(12);
  const [sell, setSell] = useState(25);
  const [qty, setQty] = useState(64);
  const [tax, setTax] = useState(5);

  const result = calculateEconomyProfit(buy, sell, qty, tax);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { id: 'eco-buy', label: 'Buy Price / Item', val: buy, set: setBuy },
          { id: 'eco-sell', label: 'Sell Price / Item', val: sell, set: setSell },
          { id: 'eco-qty', label: 'Quantity', val: qty, set: setQty },
          { id: 'eco-tax', label: 'Shop Tax (%)', val: tax, set: setTax },
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
              min={0}
              step="any"
              value={f.val}
              onChange={(e) => f.set(Number(e.target.value))}
              className="w-full px-3.5 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40 tabular-nums"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
        <div className="st-surface-inset p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Cost</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">${result.totalCost}</div>
        </div>
        <div className="st-surface-inset p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Net Revenue</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">${result.netRevenue}</div>
        </div>
        <div className="st-surface-inset p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Net Profit</div>
          <div
            className={`text-lg font-bold mt-1 ${
              result.netProfit >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            ${result.netProfit}
          </div>
        </div>
        <div className="st-surface-inset p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Profit Margin</div>
          <div className="text-lg font-bold text-[var(--st-accent-text)] mt-1">{result.marginPercent}%</div>
        </div>
      </div>
    </div>
  );
};

export const PermissionAndCommandTool: React.FC<{ kind: 'permissions' | 'commands' }> = ({ kind }) => {
  const [targetType, setTargetType] = useState<'group' | 'user'>('group');
  const [targetName, setTargetName] = useState('mvp');
  const [node, setNode] = useState('essentials.fly');
  const [allow, setAllow] = useState(true);
  const [cmdType, setCmdType] = useState<'give' | 'effect' | 'tp'>('give');
  const [player, setPlayer] = useState('@p');
  const [arg1, setArg1] = useState('diamond_sword');
  const [arg2, setArg2] = useState('1');

  if (kind === 'permissions') {
    const lpCmd = `/lp ${targetType} ${targetName || 'default'} permission set ${node || 'essentials.spawn'} ${allow}`;
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label
              htmlFor="lp-type"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Target Type
            </label>
            <select
              id="lp-type"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as 'group' | 'user')}
              className="w-full px-3 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white"
            >
              <option value="group">Group</option>
              <option value="user">User</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="lp-name"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Name
            </label>
            <input
              id="lp-name"
              type="text"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              className="w-full px-3 py-2 st-surface-inset text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="lp-node"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Permission Node
            </label>
            <input
              id="lp-node"
              type="text"
              value={node}
              onChange={(e) => setNode(e.target.value)}
              className="w-full px-3 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="lp-val"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Value
            </label>
            <select
              id="lp-val"
              value={String(allow)}
              onChange={(e) => setAllow(e.target.value === 'true')}
              className="w-full px-3 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white"
            >
              <option value="true">true (Allow)</option>
              <option value="false">false (Deny)</option>
            </select>
          </div>
        </div>
        <div className="st-surface-inset p-4 flex items-center justify-between gap-4">
          <code className="text-sm font-mono text-emerald-700 dark:text-emerald-300 break-all">
            {lpCmd}
          </code>
          <CopyButton text={lpCmd} />
        </div>
      </div>
    );
  }

  const builtCmd =
    cmdType === 'give'
      ? `/give ${player} minecraft:${arg1} ${arg2}`
      : cmdType === 'effect'
      ? `/effect give ${player} minecraft:${arg1} ${arg2} 1`
      : `/tp ${player} ${arg1} ${arg2}`;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label
            htmlFor="cmd-type"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Command
          </label>
          <select
            id="cmd-type"
            value={cmdType}
            onChange={(e) => {
              const v = e.target.value as 'give' | 'effect' | 'tp';
              setCmdType(v);
              if (v === 'give') {
                setArg1('diamond_sword');
                setArg2('1');
              } else if (v === 'effect') {
                setArg1('speed');
                setArg2('60');
              } else {
                setArg1('0 64');
                setArg2('0');
              }
            }}
            className="w-full px-3 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white"
          >
            <option value="give">/give</option>
            <option value="effect">/effect</option>
            <option value="tp">/tp</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="cmd-player"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Target Selector
          </label>
          <input
            id="cmd-player"
            type="text"
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
            className="w-full px-3 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor="cmd-arg1"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {cmdType === 'give' ? 'Item ID' : cmdType === 'effect' ? 'Effect ID' : 'X Y'}
          </label>
          <input
            id="cmd-arg1"
            type="text"
            value={arg1}
            onChange={(e) => setArg1(e.target.value)}
            className="w-full px-3 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor="cmd-arg2"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {cmdType === 'give' ? 'Amount' : cmdType === 'effect' ? 'Duration (s)' : 'Z'}
          </label>
          <input
            id="cmd-arg2"
            type="text"
            value={arg2}
            onChange={(e) => setArg2(e.target.value)}
            className="w-full px-3 py-2 st-surface-inset font-mono text-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>
      <div className="st-surface-inset p-4 flex items-center justify-between gap-4">
        <code className="text-sm font-mono text-[var(--st-accent-text)] break-all">{builtCmd}</code>
        <CopyButton text={builtCmd} />
      </div>
    </div>
  );
};

export const ServerIconGeneratorTool: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [initials, setInitials] = useState('ST');
  const [bgA, setBgA] = useState('#0891b2');
  const [bgB, setBgB] = useState('#10b981');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const grad = ctx.createLinearGradient(0, 0, 64, 64);
    grad.addColorStop(0, bgA);
    grad.addColorStop(1, bgB);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(10,15,28,0.22)';
    ctx.fillRect(4, 4, 56, 56);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((initials || 'ST').slice(0, 3).toUpperCase(), 32, 34);
  }, [initials, bgA, bgB]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new window.Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 64, 64);
        ctx.drawImage(img, 0, 0, 64, 64);
      }
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = 'server-icon.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="p-4 st-surface-inset flex flex-col items-center gap-2">
          <canvas
            ref={canvasRef}
            width={64}
            height={64}
            className="w-16 h-16 rounded-md border border-slate-300 dark:border-white/15 image-rendering-pixelated"
          />
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">64 × 64 px</span>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <div>
            <label
              htmlFor="icon-text"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Icon Letters
            </label>
            <input
              id="icon-text"
              type="text"
              maxLength={3}
              value={initials}
              onChange={(e) => setInitials(e.target.value)}
              className="w-full px-3 py-2 st-surface-inset text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="icon-c1"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Primary Color
            </label>
            <input
              id="icon-c1"
              type="color"
              value={bgA}
              onChange={(e) => setBgA(e.target.value)}
              className="w-full h-10 st-surface-inset cursor-pointer"
            />
          </div>
          <div>
            <label
              htmlFor="icon-c2"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Accent Color
            </label>
            <input
              id="icon-c2"
              type="color"
              value={bgB}
              onChange={(e) => setBgB(e.target.value)}
              className="w-full h-10 st-surface-inset cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 px-4 py-2.5 st-btn-secondary text-sm font-medium cursor-pointer">
          <RefreshCw className="w-4 h-4 text-[var(--st-accent-text)]" />
          <span>Upload Custom Image</span>
          <input type="file" accept="image/*" onChange={handleUpload} className="sr-only" />
        </label>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-4 py-2.5 st-btn-primary text-sm font-semibold cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download server-icon.png</span>
        </button>
      </div>
    </div>
  );
};
