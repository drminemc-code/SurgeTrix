import React from 'react';
import { PLAYER_ACTIVITY_SERIES } from '../data/catalog';

interface PlayerActivityChartProps {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export const PlayerActivityChart: React.FC<PlayerActivityChartProps> = ({
  title = 'Player activity over time',
  subtitle = 'Sample monitoring snapshot (24h window)',
  compact = false,
}) => {
  const data = PLAYER_ACTIVITY_SERIES;
  const maxVal = Math.max(...data.map((d) => d.players), 40);
  const width = 560;
  const height = compact ? 150 : 190;
  const padX = 28;
  const padY = 18;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = data.map((d, idx) => {
    const x = padX + (idx / Math.max(1, data.length - 1)) * innerW;
    const y = padY + innerH - (d.players / maxVal) * innerH;
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padY + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padY + innerH).toFixed(1)} Z`;

  const peak = Math.max(...data.map((d) => d.players));
  const avg = Math.round(data.reduce((sum, d) => sum + d.players, 0) / data.length);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
            {title}
          </h3>
          <p className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
            {subtitle}
          </p>
        </div>
        <div
          className="flex items-center gap-3 text-xs font-mono tabular-nums"
          style={{ color: 'var(--st-text-secondary)' }}
        >
          <span>Peak: {peak}</span>
          <span aria-hidden="true">·</span>
          <span>Avg: {avg}</span>
        </div>
      </div>

      <div className="st-surface-inset p-3 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
          role="img"
          aria-label={title}
        >
          <defs>
            <linearGradient id="st-activity-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--st-accent)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--st-accent)" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((ratio) => {
            const y = padY + innerH * (1 - ratio);
            const labelVal = Math.round(maxVal * ratio);
            return (
              <g key={ratio}>
                <line
                  x1={padX}
                  y1={y}
                  x2={width - padX}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeDasharray="3 3"
                />
                <text
                  x={4}
                  y={y + 4}
                  fontSize="10"
                  fill="currentColor"
                  fillOpacity="0.55"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {labelVal}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#st-activity-fill)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--st-accent-text)"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.map((p) => (
            <circle
              key={p.label}
              cx={p.x}
              cy={p.y}
              r="3"
              fill="var(--st-surface)"
              stroke="var(--st-accent-text)"
              strokeWidth="1.8"
            >
              <title>{`${p.label}: ${p.players} players`}</title>
            </circle>
          ))}
        </svg>

        <div
          className="flex items-center justify-between text-[11px] font-mono pt-1 px-1 tabular-nums"
          style={{ color: 'var(--st-text-muted)' }}
        >
          <span>{data[0]?.label}</span>
          <span>{data[Math.floor(data.length / 2)]?.label}</span>
          <span>{data[data.length - 1]?.label}</span>
        </div>
      </div>
    </div>
  );
};
