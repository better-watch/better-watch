'use client';

import type { StatusGridData, DiffViewData, LogTraceData } from '@/lib/sre-events';

// ── Color Maps ───────────────────────────────────────────────────────────────

const cellColors: Record<string, string> = {
  up: '#22c55e',
  down: '#ef4444',
  slow: '#f59e0b',
  unknown: '#6b7280',
};

const levelColors: Record<string, string> = {
  ERROR: '#ef4444',
  WARN: '#f59e0b',
  INFO: '#3b82f6',
  DEBUG: '#6b7280',
};

const diffLineColors = {
  added: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', prefix: '+' },
  removed: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', prefix: '-' },
  context: { bg: 'transparent', text: 'currentColor', prefix: ' ' },
} as const;

// ── StatusGrid ───────────────────────────────────────────────────────────────

export function StatusGrid({ rows, columnLabels }: StatusGridData) {
  const cellSize = 18;
  const cellGap = 2;
  const labelWidth = 80;
  const headerHeight = 20;
  const rowHeight = cellSize + cellGap;

  const gridWidth = columnLabels.length * (cellSize + cellGap);
  const totalWidth = labelWidth + gridWidth + 8;
  const totalHeight = headerHeight + rows.length * rowHeight + 8;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width="100%"
      height="100%"
      className="text-neutral-700 dark:text-neutral-300"
      role="img"
      aria-label="Service status grid"
    >
      {/* Column labels */}
      {columnLabels.map((label, i) => (
        <text
          key={`col-${i}`}
          x={labelWidth + i * (cellSize + cellGap) + cellSize / 2}
          y={12}
          textAnchor="middle"
          fontSize={7}
          fill="currentColor"
          opacity={0.5}
        >
          {label}
        </text>
      ))}

      {/* Rows */}
      {rows.map((row, ri) => {
        const y = headerHeight + ri * rowHeight;
        return (
          <g key={`row-${ri}`}>
            {/* Service label */}
            <text
              x={labelWidth - 6}
              y={y + cellSize / 2 + 3}
              textAnchor="end"
              fontSize={8}
              fill="currentColor"
              opacity={0.7}
            >
              {row.service}
            </text>

            {/* Status cells */}
            {row.cells.map((status, ci) => (
              <rect
                key={`cell-${ri}-${ci}`}
                x={labelWidth + ci * (cellSize + cellGap)}
                y={y}
                width={cellSize}
                height={cellSize}
                rx={3}
                ry={3}
                fill={cellColors[status] ?? cellColors.unknown}
                opacity={0.85}
              >
                <title>{`${row.service} @ ${columnLabels[ci]}: ${status}`}</title>
              </rect>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ── DiffView ─────────────────────────────────────────────────────────────────

export function DiffView({ lines }: DiffViewData) {
  const lineHeight = 18;
  const totalHeight = lines.length * lineHeight + 8;
  const totalWidth = 420;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width="100%"
      height="100%"
      className="text-neutral-700 dark:text-neutral-300"
      role="img"
      aria-label="Configuration diff"
    >
      {lines.map((line, i) => {
        const y = i * lineHeight + 4;
        const style = diffLineColors[line.type];
        return (
          <g key={`line-${i}`}>
            {/* Background highlight for added/removed */}
            {line.type !== 'context' && (
              <rect
                x={0}
                y={y}
                width={totalWidth}
                height={lineHeight}
                fill={style.bg}
              />
            )}

            {/* Line number */}
            <text
              x={8}
              y={y + 13}
              fontSize={10}
              fontFamily="ui-monospace, monospace"
              fill="currentColor"
              opacity={0.35}
            >
              {i + 1}
            </text>

            {/* Prefix (+/-/space) */}
            <text
              x={30}
              y={y + 13}
              fontSize={10}
              fontFamily="ui-monospace, monospace"
              fill={style.text}
              fontWeight={line.type !== 'context' ? 600 : 400}
            >
              {style.prefix}
            </text>

            {/* Content */}
            <text
              x={42}
              y={y + 13}
              fontSize={10}
              fontFamily="ui-monospace, monospace"
              fill={style.text}
            >
              {line.content}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── LogTrace ─────────────────────────────────────────────────────────────────

export function LogTrace({ entries }: LogTraceData) {
  const lineHeight = 18;
  const totalHeight = entries.length * lineHeight + 8;
  const totalWidth = 520;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width="100%"
      height="100%"
      className="text-neutral-700 dark:text-neutral-300"
      role="img"
      aria-label="Log trace"
    >
      {/* Dark terminal-style background */}
      <rect
        x={0}
        y={0}
        width={totalWidth}
        height={totalHeight}
        rx={4}
        fill="rgba(0,0,0,0.05)"
        className="dark:fill-[rgba(0,0,0,0.3)]"
      />

      {entries.map((entry, i) => {
        const y = i * lineHeight + 4;
        const color = levelColors[entry.level] ?? levelColors.DEBUG;

        return (
          <g key={`entry-${i}`}>
            {/* Timestamp */}
            <text
              x={8}
              y={y + 13}
              fontSize={9}
              fontFamily="ui-monospace, monospace"
              fill="currentColor"
              opacity={0.4}
            >
              {entry.timestamp}
            </text>

            {/* Level badge */}
            <rect
              x={100}
              y={y + 2}
              width={36}
              height={14}
              rx={2}
              fill={color}
              opacity={0.2}
            />
            <text
              x={118}
              y={y + 13}
              textAnchor="middle"
              fontSize={8}
              fontFamily="ui-monospace, monospace"
              fontWeight={600}
              fill={color}
            >
              {entry.level}
            </text>

            {/* Message (truncated via clipPath) */}
            <text
              x={144}
              y={y + 13}
              fontSize={9}
              fontFamily="ui-monospace, monospace"
              fill="currentColor"
              opacity={0.8}
            >
              {entry.message.length > 64
                ? entry.message.slice(0, 64) + '\u2026'
                : entry.message}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
