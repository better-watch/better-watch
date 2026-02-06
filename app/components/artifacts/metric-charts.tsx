"use client";

import type { SparklineData, AreaChartData, BarChartData } from "@/lib/sre-events";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Map data points into { x, y } coords within a viewBox. */
function toCoords(
  dataPoints: number[],
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number }
) {
  const n = dataPoints.length;
  if (n === 0) return [];
  const min = Math.min(...dataPoints);
  const max = Math.max(...dataPoints);
  const range = max - min || 1;
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  return dataPoints.map((v, i) => ({
    x: padding.left + (i / (n - 1)) * plotW,
    y: padding.top + plotH - ((v - min) / range) * plotH,
  }));
}

/** Build a smooth cubic-bezier SVG path through a list of points. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

// ── SparklineChart ───────────────────────────────────────────────────────────

const SPARK_W = 768;
const SPARK_H = 300;
const SPARK_PAD = { top: 24, right: 20, bottom: 24, left: 20 };

export function SparklineChart({ data }: { data: SparklineData }) {
  const { dataPoints, anomalyRange } = data;
  const points = toCoords(dataPoints, SPARK_W, SPARK_H, SPARK_PAD);
  if (points.length < 2) return null;

  const linePath = smoothPath(points);
  const fillPath = `${linePath} L ${points[points.length - 1].x},${SPARK_H - SPARK_PAD.bottom} L ${points[0].x},${SPARK_H - SPARK_PAD.bottom} Z`;

  // Anomaly highlight zone
  let anomalyX1 = 0;
  let anomalyX2 = 0;
  if (anomalyRange && points[anomalyRange[0]] && points[anomalyRange[1]]) {
    anomalyX1 = points[anomalyRange[0]].x;
    anomalyX2 = points[anomalyRange[1]].x;
  }

  const id = `spark-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
      role="img"
      aria-label="Sparkline chart"
    >
      <defs>
        {/* Line gradient */}
        <linearGradient id={`${id}-line`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="[stop-color:var(--spark-stroke,#f97316)]" />
          <stop offset="100%" className="[stop-color:var(--spark-stroke-end,#ef4444)]" />
        </linearGradient>

        {/* Fill gradient */}
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="[stop-color:var(--spark-fill,#f97316)]" stopOpacity="0.35" />
          <stop offset="100%" className="[stop-color:var(--spark-fill-end,#f97316)]" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Anomaly zone */}
      {anomalyRange && anomalyX2 > anomalyX1 && (
        <rect
          x={anomalyX1}
          y={SPARK_PAD.top}
          width={anomalyX2 - anomalyX1}
          height={SPARK_H - SPARK_PAD.top - SPARK_PAD.bottom}
          rx={4}
          className="fill-red-500/15 dark:fill-red-400/20"
        />
      )}

      {/* Gradient fill */}
      <path d={fillPath} fill={`url(#${id}-fill)`} />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={`url(#${id}-line)`}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="[--spark-stroke:#f97316] [--spark-stroke-end:#ef4444] dark:[--spark-stroke:#fb923c] dark:[--spark-stroke-end:#f87171]"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="2000"
          to="0"
          dur="1.2s"
          fill="freeze"
        />
        <animate
          attributeName="stroke-dasharray"
          from="2000"
          to="2000"
          dur="0.01s"
          fill="freeze"
        />
      </path>

      {/* End dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={5}
        className="fill-orange-500 dark:fill-orange-400"
      >
        <animate
          attributeName="opacity"
          values="0;1"
          dur="1.2s"
          fill="freeze"
        />
      </circle>

      {/* Invisible CSS-variable host to set gradients */}
      <rect
        width={0}
        height={0}
        className="[--spark-fill:#f97316] [--spark-fill-end:#f97316] dark:[--spark-fill:#fb923c] dark:[--spark-fill-end:#fb923c]"
      />
    </svg>
  );
}

// ── AreaChart ─────────────────────────────────────────────────────────────────

const AREA_W = 768;
const AREA_H = 300;
const AREA_PAD = { top: 20, right: 20, bottom: 40, left: 50 };

const DEFAULT_SERIES_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
];

export function AreaChart({ data }: { data: AreaChartData }) {
  const { series, xLabels } = data;
  if (series.length === 0) return null;

  // Compute global Y range across all series
  let globalMin = Infinity;
  let globalMax = -Infinity;
  for (const s of series) {
    for (const v of s.dataPoints) {
      if (v < globalMin) globalMin = v;
      if (v > globalMax) globalMax = v;
    }
  }
  if (globalMin === globalMax) {
    globalMin -= 1;
    globalMax += 1;
  }

  const plotW = AREA_W - AREA_PAD.left - AREA_PAD.right;
  const plotH = AREA_H - AREA_PAD.top - AREA_PAD.bottom;

  // Y-axis ticks (5 ticks)
  const yRange = globalMax - globalMin;
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = globalMin + (yRange * i) / 4;
    return {
      value: val,
      y: AREA_PAD.top + plotH - ((val - globalMin) / yRange) * plotH,
    };
  });

  const id = `area-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      viewBox={`0 0 ${AREA_W} ${AREA_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
      role="img"
      aria-label="Area chart"
    >
      <defs>
        {series.map((s, i) => {
          const color = s.color || DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length];
          return (
            <linearGradient key={i} id={`${id}-fill-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.30" />
              <stop offset="100%" stopColor={color} stopOpacity="0.03" />
            </linearGradient>
          );
        })}
      </defs>

      {/* Grid lines */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={AREA_PAD.left}
            y1={tick.y}
            x2={AREA_W - AREA_PAD.right}
            y2={tick.y}
            className="stroke-zinc-200 dark:stroke-zinc-700"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <text
            x={AREA_PAD.left - 8}
            y={tick.y + 4}
            textAnchor="end"
            className="fill-zinc-500 dark:fill-zinc-400 text-[11px]"
            style={{ fontSize: 11 }}
          >
            {tick.value >= 1000
              ? `${(tick.value / 1000).toFixed(1)}k`
              : Number.isInteger(tick.value)
                ? tick.value
                : tick.value.toFixed(1)}
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {xLabels &&
        xLabels.map((label, i) => {
          const x =
            AREA_PAD.left +
            (i / (xLabels.length - 1)) * plotW;
          return (
            <text
              key={i}
              x={x}
              y={AREA_H - 8}
              textAnchor="middle"
              className="fill-zinc-500 dark:fill-zinc-400 text-[11px]"
              style={{ fontSize: 11 }}
            >
              {label}
            </text>
          );
        })}

      {/* Series (rendered back-to-front so first series is on top) */}
      {[...series].reverse().map((s, ri) => {
        const i = series.length - 1 - ri;
        const color = s.color || DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length];
        const n = s.dataPoints.length;
        if (n < 2) return null;

        const pts = s.dataPoints.map((v, j) => ({
          x: AREA_PAD.left + (j / (n - 1)) * plotW,
          y:
            AREA_PAD.top +
            plotH -
            ((v - globalMin) / yRange) * plotH,
        }));

        const linePath = smoothPath(pts);
        const fillPath = `${linePath} L ${pts[n - 1].x},${AREA_PAD.top + plotH} L ${pts[0].x},${AREA_PAD.top + plotH} Z`;

        return (
          <g key={i}>
            <path d={fillPath} fill={`url(#${id}-fill-${i})`} />
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}

      {/* Legend */}
      {series.map((s, i) => {
        const color = s.color || DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length];
        const lx = AREA_PAD.left + i * 120;
        return (
          <g key={i}>
            <rect
              x={lx}
              y={4}
              width={10}
              height={10}
              rx={2}
              fill={color}
              fillOpacity={0.8}
            />
            <text
              x={lx + 14}
              y={13}
              className="fill-zinc-600 dark:fill-zinc-300 text-[11px]"
              style={{ fontSize: 11 }}
            >
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── BarChart ──────────────────────────────────────────────────────────────────

const BAR_W = 768;
const BAR_H = 300;
const BAR_PAD = { top: 16, right: 40, bottom: 16, left: 120 };
const BAR_GAP = 8;

export function BarChart({ data }: { data: BarChartData }) {
  const { bars } = data;
  if (bars.length === 0) return null;

  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const plotW = BAR_W - BAR_PAD.left - BAR_PAD.right;
  const plotH = BAR_H - BAR_PAD.top - BAR_PAD.bottom;
  const barHeight = Math.min(
    36,
    (plotH - BAR_GAP * (bars.length - 1)) / bars.length
  );
  const totalBarsH = barHeight * bars.length + BAR_GAP * (bars.length - 1);
  const offsetY = BAR_PAD.top + (plotH - totalBarsH) / 2;

  const id = `bar-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      viewBox={`0 0 ${BAR_W} ${BAR_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
      role="img"
      aria-label="Bar chart"
    >
      <defs>
        {bars.map((bar, i) => {
          const color = bar.color || DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length];
          return (
            <linearGradient key={i} id={`${id}-bar-${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity="0.85" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
          );
        })}
      </defs>

      {bars.map((bar, i) => {
        const y = offsetY + i * (barHeight + BAR_GAP);
        const barW = (bar.value / maxVal) * plotW;

        return (
          <g key={i}>
            {/* Background track */}
            <rect
              x={BAR_PAD.left}
              y={y}
              width={plotW}
              height={barHeight}
              rx={4}
              className="fill-zinc-100 dark:fill-zinc-800"
            />

            {/* Bar */}
            <rect
              x={BAR_PAD.left}
              y={y}
              width={barW}
              height={barHeight}
              rx={4}
              fill={`url(#${id}-bar-${i})`}
            >
              <animate
                attributeName="width"
                from="0"
                to={barW}
                dur="0.6s"
                fill="freeze"
                calcMode="spline"
                keySplines="0.25 0.1 0.25 1"
                keyTimes="0;1"
              />
            </rect>

            {/* Label */}
            <text
              x={BAR_PAD.left - 8}
              y={y + barHeight / 2 + 4}
              textAnchor="end"
              className="fill-zinc-600 dark:fill-zinc-300 text-[12px]"
              style={{ fontSize: 12 }}
            >
              {bar.label}
            </text>

            {/* Value */}
            <text
              x={BAR_PAD.left + barW + 8}
              y={y + barHeight / 2 + 4}
              textAnchor="start"
              className="fill-zinc-500 dark:fill-zinc-400 text-[12px] font-semibold"
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              {bar.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
