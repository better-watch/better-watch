"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

function EventRow({ event, index, onSelect }: { event: SREEvent; index: number; onSelect: () => void }) {
  const severityColor = SEVERITY_COLORS[event.severity] ?? SEVERITY_COLORS.info;
  const config = EVENT_TYPE_CONFIG[event.eventType] ?? EVENT_TYPE_CONFIG.incident_detected;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
    >
      <button
        onClick={onSelect}
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
        </div>
      </button>
    </motion.div>
  );
}

// ── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ event, onClose }: { event: SREEvent; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const severityColor = SEVERITY_COLORS[event.severity] ?? SEVERITY_COLORS.info;
  const config = EVENT_TYPE_CONFIG[event.eventType] ?? EVENT_TYPE_CONFIG.incident_detected;
  const Icon = config.icon;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />

      {/* Panel */}
      <motion.div
        ref={panelRef}
        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl bg-white dark:bg-neutral-900 shadow-2xl"
        style={{ borderTop: `3px solid ${severityColor}` }}
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>

        {/* Artifact */}
        <div className={`p-6 min-h-[280px] flex items-center justify-center ${SEVERITY_BG[event.severity] ?? ""}`}>
          <ArtifactRenderer event={event} />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: severityColor }}
            >
              <Icon size={12} />
              {config.label}
            </span>
            <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-xs font-mono text-neutral-600 dark:text-neutral-400">
              {event.service}
            </span>
            <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-auto">
              {relativeTime(event.timestamp)}
            </span>
          </div>

          {/* Title + summary */}
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {event.title}
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {event.summary}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Event List ───────────────────────────────────────────────────────────────

interface EventListProps {
  events: SREEvent[];
}

export function EventList({ events }: EventListProps) {
  const [selectedEvent, setSelectedEvent] = useState<SREEvent | null>(null);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-neutral-500">No events recorded.</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-2 py-4">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 pb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 select-none">
          <span className="w-2 shrink-0" />
          <span className="w-4 shrink-0" />
          <span className="w-28 shrink-0">Type</span>
          <span className="flex-1">Event</span>
          <span className="hidden sm:inline-block shrink-0 w-28 text-center">Service</span>
          <span className="shrink-0 w-16 text-right">When</span>
        </div>

        <div className="border-t border-neutral-100 dark:border-neutral-800" />

        {/* Event rows */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
          {events.map((event, index) => (
            <EventRow key={event.id} event={event} index={index} onSelect={() => setSelectedEvent(event)} />
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <DetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
