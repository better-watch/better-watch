"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Search,
  Settings,
  Activity,
  BarChart3,
  Network,
  CheckCircle,
  Rocket,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import type { SREEvent } from "@/lib/sre-events";

import { SparklineChart, AreaChart, BarChart } from "../components/artifacts/metric-charts";
import { TopologyDiagram, DependencyGraph } from "../components/artifacts/architecture-diagrams";
import { StatusGrid, DiffView, LogTrace } from "../components/artifacts/detail-artifacts";

// ── Severity colors ──────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
  success: "#22c55e",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "bg-red-50 dark:bg-red-950/20",
  warning: "bg-amber-50 dark:bg-amber-950/20",
  info: "bg-blue-50 dark:bg-blue-950/20",
  success: "bg-emerald-50 dark:bg-emerald-950/20",
};

// ── Event type icons & labels ────────────────────────────────────────────────

const EVENT_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  incident_detected: { icon: AlertTriangle, label: "Incident" },
  root_cause_found: { icon: Search, label: "Root Cause" },
  config_change: { icon: Settings, label: "Config" },
  instrumentation_update: { icon: Activity, label: "Instrumentation" },
  metric_anomaly: { icon: BarChart3, label: "Anomaly" },
  service_topology_change: { icon: Network, label: "Topology" },
  alert_resolved: { icon: CheckCircle, label: "Resolved" },
  deployment_detected: { icon: Rocket, label: "Deploy" },
  runbook_executed: { icon: BookOpen, label: "Runbook" },
};

// ── Relative time ────────────────────────────────────────────────────────────

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

// ── Artifact Renderer ────────────────────────────────────────────────────────

function ArtifactRenderer({ event }: { event: SREEvent }) {
  switch (event.artifactType) {
    case "sparkline":
      return <SparklineChart data={event.artifactData} />;
    case "area_chart":
      return <AreaChart data={event.artifactData} />;
    case "bar_chart":
      return <BarChart data={event.artifactData} />;
    case "topology_diagram":
      return <TopologyDiagram {...event.artifactData} />;
    case "dependency_graph":
      return <DependencyGraph {...event.artifactData} />;
    case "status_grid":
      return <StatusGrid {...event.artifactData} />;
    case "diff_view":
      return <DiffView {...event.artifactData} />;
    case "log_trace":
      return <LogTrace {...event.artifactData} />;
    case "timeline":
      return (
        <svg viewBox="0 0 768 300" className="w-full h-full" role="img" aria-label="Event timeline">
          <line x1={60} y1={20} x2={60} y2={280} stroke="currentColor" className="text-neutral-300 dark:text-neutral-600" strokeWidth={2} />
          {event.artifactData.events.map((evt, i) => {
            const y = 30 + (i / Math.max(event.artifactData.events.length - 1, 1)) * 240;
            return (
              <g key={i}>
                <circle cx={60} cy={y} r={5} className="fill-blue-500 dark:fill-blue-400" />
                <text x={80} y={y - 4} fontSize={10} className="fill-neutral-500 dark:fill-neutral-400" fontFamily="ui-monospace, monospace">
                  {evt.time}
                </text>
                <text x={80} y={y + 10} fontSize={11} fill="currentColor" className="text-neutral-700 dark:text-neutral-300">
                  {evt.label}
                </text>
              </g>
            );
          })}
        </svg>
      );
    default:
      return null;
  }
}

// ── Event Row ────────────────────────────────────────────────────────────────

function EventRow({ event, index }: { event: SREEvent; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const severityColor = SEVERITY_COLORS[event.severity] ?? SEVERITY_COLORS.info;
  const config = EVENT_TYPE_CONFIG[event.eventType] ?? EVENT_TYPE_CONFIG.incident_detected;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
    >
      {/* Row */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="group w-full text-left"
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
          {/* Severity dot */}
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: severityColor }}
          />

          {/* Icon */}
          <Icon
            size={16}
            className="shrink-0 text-neutral-400 dark:text-neutral-500"
          />

          {/* Event type label */}
          <span className="shrink-0 w-28 text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate">
            {config.label}
          </span>

          {/* Title */}
          <span className="flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {event.title}
          </span>

          {/* Service */}
          <span className="hidden sm:inline-block shrink-0 px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-xs font-mono text-neutral-500 dark:text-neutral-400">
            {event.service}
          </span>

          {/* Time */}
          <span className="shrink-0 w-16 text-right text-xs text-neutral-400 dark:text-neutral-500">
            {relativeTime(event.timestamp)}
          </span>

          {/* Expand arrow */}
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <ChevronDown size={14} className="text-neutral-300 dark:text-neutral-600" />
          </motion.span>
        </div>
      </button>

      {/* Expanded artifact */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mx-4 mb-3 rounded-xl border border-neutral-200/60 dark:border-neutral-700/40 overflow-hidden">
              {/* Summary */}
              <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {event.summary}
                </p>
              </div>

              {/* Artifact */}
              <div
                className={`p-4 min-h-[200px] flex items-center justify-center ${SEVERITY_BG[event.severity] ?? ""}`}
              >
                <ArtifactRenderer event={event} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Event List ───────────────────────────────────────────────────────────────

interface EventListProps {
  events: SREEvent[];
}

export function EventList({ events }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-neutral-500">No events recorded.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2 py-4">
      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 pb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 select-none">
        <span className="w-2 shrink-0" />
        <span className="w-4 shrink-0" />
        <span className="w-28 shrink-0">Type</span>
        <span className="flex-1">Event</span>
        <span className="hidden sm:inline-block shrink-0 w-28 text-center">Service</span>
        <span className="shrink-0 w-16 text-right">When</span>
        <span className="w-[14px] shrink-0" />
      </div>

      <div className="border-t border-neutral-100 dark:border-neutral-800" />

      {/* Event rows */}
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
        {events.map((event, index) => (
          <EventRow key={event.id} event={event} index={index} />
        ))}
      </div>
    </div>
  );
}
