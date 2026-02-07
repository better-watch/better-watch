"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
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
  ShieldCheck,
  XCircle,
  GitBranch,
  Loader2,
  Eye,
} from "lucide-react";
import type { SREEvent } from "@/lib/sre-events";
import {
  getInitialStatus,
  getProposedFix,
  STATUS_CONFIG,
  type DiffLine,
  type IssueStatus,

} from "@/app/components/event-detail-shared";

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

// ── Status Badge (inline) ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IssueStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isSpinning = status === "applying";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${config.color} ${config.bg}`}>
      <Icon size={12} className={isSpinning ? "animate-spin" : ""} />
      {config.label}
    </span>
  );
}

// ── Event Row ────────────────────────────────────────────────────────────────

interface EventRowProps {
  event: SREEvent;
  index: number;
  status: IssueStatus;
  onSelect: () => void;
}

function EventRow({ event, index, status, onSelect }: EventRowProps) {
  const severityColor = SEVERITY_COLORS[event.severity] ?? SEVERITY_COLORS.info;
  const config = EVENT_TYPE_CONFIG[event.eventType] ?? EVENT_TYPE_CONFIG.incident_detected;
  const Icon = config.icon;
  const isActionable = status === "pending";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${isActionable ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}`}
    >
      <button
        onClick={onSelect}
        className="group flex flex-1 items-center gap-3 min-w-0 text-left"
      >
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

        {/* Title */}
        <span className="flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
          {event.title}
        </span>

        {/* Status badge */}
        <span className="hidden sm:inline-flex shrink-0">
          <StatusBadge status={status} />
        </span>

        {/* Service */}
        <span className="hidden md:inline-block shrink-0 px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-xs font-mono text-neutral-500 dark:text-neutral-400">
          {event.service}
        </span>

        {/* Time */}
        <span className="shrink-0 w-16 text-right text-xs text-neutral-400 dark:text-neutral-500">
          {relativeTime(event.timestamp)}
        </span>
      </button>

      {/* Action: view */}
      <Link
        href={`/events/${event.id}`}
        className="shrink-0 p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        title="View details"
      >
        <Eye size={16} />
      </Link>
    </motion.div>
  );
}

// ── Detail Modal ─────────────────────────────────────────────────────────────

interface DetailModalProps {
  event: SREEvent;
  status: IssueStatus;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

function DetailModal({ event, status, onClose, onApprove, onReject }: DetailModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const severityColor = SEVERITY_COLORS[event.severity] ?? SEVERITY_COLORS.info;
  const config = EVENT_TYPE_CONFIG[event.eventType] ?? EVENT_TYPE_CONFIG.incident_detected;
  const Icon = config.icon;
  const fix = getProposedFix(event);

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
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Badges row */}
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
            <StatusBadge status={status} />

            {event.repo && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                <Link href={event.repo.url} target="_blank" rel="noopener noreferrer">
                  <span className="flex items-center gap-1">  
                  <GitBranch size={12} />
                  {event.repo.branch}
                  </span>
                </Link>
              </span>
            )}

            <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-auto">
              {relativeTime(event.timestamp)}
            </span>

          </div>

          {/* Title + summary */}
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {event.title}
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {event.summary}
            </p>
          </div>

          {/* Proposed fix */}
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700/60 overflow-hidden">
            <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700/60">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Proposed Fix
              </h3>
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {fix.action}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {fix.description}
              </p>

              {/* Code diff */}
              {fix.diff && (
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700/50 overflow-hidden">
                  {fix.file && (
                    <div className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700/50">
                      <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                        {fix.file}
                      </span>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <pre className="text-[13px] leading-6 font-mono">
                      {fix.diff.map((line: DiffLine, i: number) => (
                        <div
                          key={i}
                          className={
                            line.type === "added"
                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
                              : line.type === "removed"
                                ? "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300"
                                : "text-neutral-600 dark:text-neutral-400"
                          }
                        >
                          <span className="inline-block w-6 text-center text-neutral-400 dark:text-neutral-600 select-none shrink-0">
                            {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
                          </span>
                          <span className="px-2">{line.content}</span>
                        </div>
                      ))}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {status === "pending" && (
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={onApprove}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
              >
                <ShieldCheck size={16} />
                Approve & Apply
              </button>
              <button
                onClick={onReject}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm font-medium transition-colors"
              >
                <XCircle size={16} />
                Reject
              </button>
            </div>
          )}

          {status === "applying" && (
            <div className="flex items-center gap-2 pt-1 text-sm text-blue-600 dark:text-blue-400">
              <Loader2 size={16} className="animate-spin" />
              Agent is applying the fix…
            </div>
          )}

          {status === "approved" && (
            <div className="flex items-center gap-2 pt-1 text-sm text-blue-600 dark:text-blue-400">
              <ShieldCheck size={16} />
              Fix approved, queued for execution.
            </div>
          )}

          {status === "resolved" && (
            <div className="flex items-center gap-2 pt-1 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={16} />
              Fix has been applied.
            </div>
          )}

          {status === "rejected" && (
            <div className="flex items-center gap-2 pt-1 text-sm text-neutral-500 dark:text-neutral-400">
              <XCircle size={16} />
              Fix was rejected. No changes applied.
            </div>
          )}
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
  const [statuses, setStatuses] = useState<Record<string, IssueStatus>>(() => {
    const initial: Record<string, IssueStatus> = {};
    for (const event of events) {
      initial[event.id] = getInitialStatus(event);
    }
    return initial;
  });

  const handleApprove = useCallback((eventId: string) => {
    setStatuses((prev) => ({ ...prev, [eventId]: "approved" }));

    // Simulate: approved -> applying after 500ms -> resolved after 3s
    setTimeout(() => {
      setStatuses((prev) => ({ ...prev, [eventId]: "applying" }));
    }, 500);
    setTimeout(() => {
      setStatuses((prev) => ({ ...prev, [eventId]: "resolved" }));
    }, 3500);
  }, []);

  const handleReject = useCallback((eventId: string) => {
    setStatuses((prev) => ({ ...prev, [eventId]: "rejected" }));
  }, []);

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
          <span className="flex-1">Issue</span>
          <span className="hidden sm:inline-block shrink-0 w-32 text-center">Status</span>
          <span className="hidden md:inline-block shrink-0 w-28 text-center">Service</span>
          <span className="shrink-0 w-16 text-right">When</span>
          <span className="shrink-0 w-10 text-center">Action</span>
        </div>

        <div className="border-t border-neutral-100 dark:border-neutral-800" />

        {/* Event rows */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
          {events.map((event, index) => (
            <EventRow
              key={event.id}
              event={event}
              index={index}
              status={statuses[event.id]}
              onSelect={() => setSelectedEvent(event)}
            />
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <DetailModal
            event={selectedEvent}
            status={statuses[selectedEvent.id]}
            onClose={() => setSelectedEvent(null)}
            onApprove={() => handleApprove(selectedEvent.id)}
            onReject={() => handleReject(selectedEvent.id)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
