"use client";

import type { TopologyDiagramData, DependencyGraphData } from "@/lib/sre-events";

// ── Status colors ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<
  TopologyDiagramData["nodes"][number]["status"],
  string
> = {
  healthy: "#22c55e",
  failing: "#ef4444",
  degraded: "#f59e0b",
  unknown: "#6b7280",
};

// ── TopologyDiagram ──────────────────────────────────────────────────────────

export function TopologyDiagram({
  nodes,
  edges,
}: TopologyDiagramData) {
  const W = 768;
  const H = 300;
  const cx = W / 2;
  const cy = H / 2;
  const nodeRadius = 18;
  const orbitRadius = Math.min(cx, cy) - nodeRadius - 30;

  // Circular layout — distribute nodes evenly around centre
  const positioned = nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    return {
      ...node,
      x: cx + orbitRadius * Math.cos(angle),
      y: cy + orbitRadius * Math.sin(angle),
    };
  });

  const nodeMap = new Map(positioned.map((n) => [n.id, n]));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      role="img"
      aria-label="Service mesh topology diagram"
    >
      <defs>
        {/* Pulsing ring for failing nodes */}
        <style>{`
          @keyframes pulse-ring {
            0%   { r: ${nodeRadius}; opacity: 0.7; }
            100% { r: ${nodeRadius + 12}; opacity: 0; }
          }
          .pulse-ring { animation: pulse-ring 1.4s ease-out infinite; }
        `}</style>
      </defs>

      {/* Edges — quadratic bezier pulled toward centre */}
      {edges.map((edge, i) => {
        const src = nodeMap.get(edge.from);
        const dst = nodeMap.get(edge.to);
        if (!src || !dst) return null;

        // Control point: midpoint pulled 30% toward centre
        const mx = (src.x + dst.x) / 2;
        const my = (src.y + dst.y) / 2;
        const qx = mx + (cx - mx) * 0.35;
        const qy = my + (cy - my) * 0.35;

        return (
          <path
            key={`edge-${i}`}
            d={`M ${src.x} ${src.y} Q ${qx} ${qy} ${dst.x} ${dst.y}`}
            fill="none"
            stroke="currentColor"
            className="text-neutral-300 dark:text-neutral-600"
            strokeWidth={1.5}
          />
        );
      })}

      {/* Nodes */}
      {positioned.map((node) => {
        const color = STATUS_COLORS[node.status];
        const isFailing = node.status === "failing";

        return (
          <g key={node.id}>
            {/* Pulse ring for failing */}
            {isFailing && (
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeRadius}
                fill="none"
                stroke={color}
                strokeWidth={2}
                className="pulse-ring"
              />
            )}

            {/* Node circle */}
            <circle
              cx={node.x}
              cy={node.y}
              r={nodeRadius}
              fill={color}
              opacity={0.15}
              stroke={color}
              strokeWidth={2}
            />

            {/* Inner dot */}
            <circle cx={node.x} cy={node.y} r={5} fill={color} />

            {/* Label */}
            <text
              x={node.x}
              y={node.y + nodeRadius + 14}
              textAnchor="middle"
              fill="currentColor"
              className="text-neutral-700 dark:text-neutral-300"
              fontSize={10}
              fontFamily="ui-monospace, monospace"
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── DependencyGraph ──────────────────────────────────────────────────────────

/** Simple topological layering via BFS from root nodes. */
function computeLayers(
  nodes: DependencyGraphData["nodes"],
  edges: DependencyGraphData["edges"],
): Map<string, number> {
  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    children.set(n.id, []);
  }
  for (const e of edges) {
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    children.get(e.from)?.push(e.to);
  }

  const layers = new Map<string, number>();
  const queue: string[] = [];

  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
      layers.set(id, 0);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layers.get(current)!;
    for (const child of children.get(current) ?? []) {
      const existing = layers.get(child) ?? -1;
      if (currentLayer + 1 > existing) {
        layers.set(child, currentLayer + 1);
      }
      // Only enqueue once all parents processed (simple: always enqueue, dedup by max)
      if (!queue.includes(child)) {
        queue.push(child);
      }
    }
  }

  return layers;
}

export function DependencyGraph({
  nodes,
  edges,
}: DependencyGraphData) {
  const W = 768;
  const H = 300;
  const rectH = 36;
  const paddingX = 80;
  const paddingY = 40;

  // Layer nodes left-to-right
  const layers = computeLayers(nodes, edges);
  const maxLayer = Math.max(...layers.values(), 0);

  // Group nodes by layer
  const layerGroups = new Map<number, DependencyGraphData["nodes"]>();
  for (const node of nodes) {
    const l = layers.get(node.id) ?? 0;
    if (!layerGroups.has(l)) layerGroups.set(l, []);
    layerGroups.get(l)!.push(node);
  }

  // Position each node
  const colSpacing = maxLayer > 0 ? (W - paddingX * 2) / maxLayer : 0;

  type PositionedNode = DependencyGraphData["nodes"][number] & {
    x: number;
    y: number;
    w: number;
  };

  const positioned: PositionedNode[] = [];
  const nodeMap = new Map<string, PositionedNode>();

  for (let col = 0; col <= maxLayer; col++) {
    const group = layerGroups.get(col) ?? [];
    const rowSpacing =
      group.length > 1 ? (H - paddingY * 2 - rectH) / (group.length - 1) : 0;

    group.forEach((node, row) => {
      const labelText = `${node.label} — ${node.latency}`;
      const w = Math.max(labelText.length * 7.5 + 20, 100);
      const x = paddingX + col * colSpacing;
      const y =
        group.length === 1
          ? H / 2 - rectH / 2
          : paddingY + row * rowSpacing;

      const p: PositionedNode = { ...node, x, y, w };
      positioned.push(p);
      nodeMap.set(node.id, p);
    });
  }

  // Determine which edges are on the critical path (both endpoints isCritical)
  const criticalIds = new Set(
    nodes.filter((n) => n.isCritical).map((n) => n.id),
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      role="img"
      aria-label="Service dependency graph"
    >
      <defs>
        <marker
          id="arrow-normal"
          viewBox="0 0 10 8"
          refX="10"
          refY="4"
          markerWidth={8}
          markerHeight={6}
          orient="auto-start-reverse"
        >
          <path
            d="M 0 0 L 10 4 L 0 8 Z"
            className="fill-neutral-400 dark:fill-neutral-500"
          />
        </marker>
        <marker
          id="arrow-critical"
          viewBox="0 0 10 8"
          refX="10"
          refY="4"
          markerWidth={8}
          markerHeight={6}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 4 L 0 8 Z" fill="#ef4444" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((edge, i) => {
        const src = nodeMap.get(edge.from);
        const dst = nodeMap.get(edge.to);
        if (!src || !dst) return null;

        const isCritical = criticalIds.has(edge.from) && criticalIds.has(edge.to);

        // Bezier from right side of src to left side of dst
        const x1 = src.x + src.w;
        const y1 = src.y + rectH / 2;
        const x2 = dst.x;
        const y2 = dst.y + rectH / 2;
        const cpOffset = (x2 - x1) * 0.4;

        return (
          <path
            key={`dep-edge-${i}`}
            d={`M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke={isCritical ? "#ef4444" : "currentColor"}
            className={isCritical ? "" : "text-neutral-300 dark:text-neutral-600"}
            strokeWidth={isCritical ? 2 : 1.5}
            markerEnd={`url(#arrow-${isCritical ? "critical" : "normal"})`}
          />
        );
      })}

      {/* Nodes */}
      {positioned.map((node) => {
        const isCritical = node.isCritical;
        const labelText = `${node.label} — ${node.latency}`;

        return (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width={node.w}
              height={rectH}
              rx={6}
              ry={6}
              fill="currentColor"
              className={
                isCritical
                  ? "text-white dark:text-neutral-800"
                  : "text-white dark:text-neutral-800 stroke-neutral-300 dark:stroke-neutral-600"
              }
              stroke={isCritical ? "#ef4444" : undefined}
              strokeWidth={isCritical ? 2 : 1}
            />
            <text
              x={node.x + node.w / 2}
              y={node.y + rectH / 2 + 4}
              textAnchor="middle"
              fill={isCritical ? "#ef4444" : "currentColor"}
              className={isCritical ? "" : "text-neutral-700 dark:text-neutral-300"}
              fontSize={11}
              fontFamily="ui-monospace, monospace"
            >
              {labelText}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
