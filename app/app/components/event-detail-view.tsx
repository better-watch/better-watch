"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
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
  ChevronRight,
  Copy,
  Bell,
  Zap,
  History,
  MoreHorizontal,
  ShieldCheck,
  XCircle,
  Loader2,
  Pencil,
  Plus,
  GitBranch,
  GitPullRequest,
} from "lucide-react";
import type { SREEvent } from "@/lib/sre-events";
import {
  getProposedFix,
  getInitialStatus,
  STATUS_CONFIG,
  type IssueStatus,
} from "./event-detail-shared";
import { SparklineChart, AreaChart, BarChart } from "./artifacts/metric-charts";
import {
  TopologyDiagram,
  DependencyGraph,
} from "./artifacts/architecture-diagrams";
import {
  StatusGrid,
  DiffView,
  LogTrace,
} from "./artifacts/detail-artifacts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
  success: "#22c55e",
};

const EVENT_TYPE_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ size?: number; className?: string }>; label: string }
> = {
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

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

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
        <svg
          viewBox="0 0 768 300"
          className="w-full h-full min-h-[280px]"
          role="img"
          aria-label="Event timeline"
        >
          <line
            x1={60}
            y1={20}
            x2={60}
            y2={280}
            stroke="currentColor"
            className="text-neutral-300 dark:text-neutral-600"
            strokeWidth={2}
          />
          {event.artifactData.events.map((evt, i) => {
            const y =
              30 +
              (i / Math.max(event.artifactData.events.length - 1, 1)) * 240;
            return (
              <g key={i}>
                <circle
                  cx={60}
                  cy={y}
                  r={5}
                  className="fill-blue-500 dark:fill-blue-400"
                />
                <text
                  x={80}
                  y={y - 4}
                  fontSize={10}
                  className="fill-neutral-500 dark:fill-neutral-400"
                  fontFamily="ui-monospace, monospace"
                >
                  {evt.time}
                </text>
                <text
                  x={80}
                  y={y + 10}
                  fontSize={11}
                  fill="currentColor"
                  className="text-neutral-700 dark:text-neutral-300"
                >
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

type TabId = "overview" | "artifact" | "proposed-fix";

interface EventDetailViewProps {
  event: SREEvent;
}

export function EventDetailView({ event }: EventDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [status, setStatus] = useState<IssueStatus>(() =>
    getInitialStatus(event)
  );

  const fix = getProposedFix(event);
  const severityColor = SEVERITY_COLORS[event.severity] ?? SEVERITY_COLORS.info;
  const typeConfig =
    EVENT_TYPE_CONFIG[event.eventType] ?? EVENT_TYPE_CONFIG.incident_detected;
  const TypeIcon = typeConfig.icon;
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  const handleApprove = useCallback(() => {
    setStatus("approved");
    setTimeout(() => setStatus("applying"), 500);
    setTimeout(() => setStatus("resolved"), 3500);
  }, []);

  const handleReject = useCallback(() => {
    setStatus("rejected");
  }, []);

  const copyId = useCallback(() => {
    void navigator.clipboard.writeText(event.id);
  }, [event.id]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "artifact", label: "Artifact" },
    { id: "proposed-fix", label: "Proposed fix" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb + top bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
          <Link
            href="/events"
            className="hover:text-foreground transition-colors"
          >
            Events
          </Link>
          <ChevronRight size={14} className="shrink-0" />
          <span className="font-medium text-foreground truncate">
            {event.title}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1">
        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 md:p-6">
          {activeTab === "overview" && (
            <div className="space-y-6 max-w-3xl">
              {/* Status card (similar to "Flag is Off" panel) */}
              <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: severityColor }}
                    >
                      <TypeIcon size={12} />
                      {typeConfig.label}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                        statusConfig.color,
                        statusConfig.bg
                      )}
                    >
                      <StatusIcon
                        size={12}
                        className={status === "applying" ? "animate-spin" : ""}
                      />
                      {statusConfig.label}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(event.timestamp)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {status === "pending" &&
                    "This event has a proposed fix awaiting approval. Review and approve or reject below."}
                  {status !== "pending" &&
                    "Event details and artifact are available in the tabs above."}
                </p>
                <div className="mt-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    {event.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {event.summary}
                  </p>
                </div>
                {status === "pending" && (
                  <div className="mt-6 flex gap-3">
                    <Button
                      onClick={handleApprove}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <ShieldCheck size={16} className="mr-2" />
                      Approve & Apply
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReject}
                      className="border-muted-foreground/30"
                    >
                      <XCircle size={16} className="mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
                {status === "applying" && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <Loader2 size={16} className="animate-spin" />
                    Agent is applying the fix…
                  </div>
                )}
                {status === "resolved" && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <CheckCircle size={16} />
                    Fix has been applied.
                  </div>
                )}
                {status === "rejected" && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <XCircle size={16} />
                    Fix was rejected. No changes applied.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "artifact" && (
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm overflow-hidden">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Event artifact
              </h3>
              <div className="min-h-[300px]">
                <ArtifactRenderer event={event} />
              </div>
            </div>
          )}

          {activeTab === "proposed-fix" && (
            <div className="space-y-4 max-w-3xl">
              <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Proposed Fix
                  </h3>
                </div>
                <div className="px-4 py-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {fix.action}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {fix.description}
                  </p>
                  {fix.diff && (
                    <div className="rounded-lg border border-border overflow-hidden mt-4">
                      {fix.file && (
                        <div className="px-3 py-1.5 bg-muted border-b border-border">
                          <span className="text-xs font-mono text-muted-foreground">
                            {fix.file}
                          </span>
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <pre className="text-[13px] leading-6 font-mono">
                          {fix.diff.map((line, i) => (
                            <div
                              key={i}
                              className={cn(
                                line.type === "added" &&
                                  "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300",
                                line.type === "removed" &&
                                  "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300",
                                line.type === "context" &&
                                  "text-muted-foreground"
                              )}
                            >
                              <span className="inline-block w-6 text-center text-muted-foreground/70 select-none shrink-0">
                                {line.type === "added"
                                  ? "+"
                                  : line.type === "removed"
                                    ? "−"
                                    : " "}
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
              {status === "pending" && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleApprove}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <ShieldCheck size={16} className="mr-2" />
                    Review and save
                  </Button>
                  <Button variant="outline" onClick={handleReject}>
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right sidebar */}
        <aside className="w-[320px] shrink-0 border-l border-border bg-muted/20 p-4 hidden lg:block">
          <div className="flex items-center gap-1 mb-6">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyId}>
              <Copy size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Bell size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Zap size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <History size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal size={14} />
            </Button>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-muted-foreground">Key</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mr-1"
                  onClick={copyId}
                >
                  <Copy size={12} />
                </Button>
              </div>
              <p className="font-mono text-foreground break-all">{event.id}</p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-muted-foreground">Description</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1">
                  <Pencil size={12} />
                </Button>
              </div>
              <p className="text-foreground line-clamp-3">{event.summary}</p>
            </div>

            <div>
              <span className="text-muted-foreground block mb-1">Service</span>
              <p className="font-mono text-foreground">{event.service}</p>
            </div>

            <div>
              <span className="text-muted-foreground block mb-1">Severity</span>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white"
                style={{ backgroundColor: severityColor }}
              >
                {event.severity}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block mb-1">Event type</span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <TypeIcon size={14} />
                {typeConfig.label}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block mb-1">Timestamp</span>
              <p className="text-foreground">{formatTimestamp(event.timestamp)}</p>
            </div>

            <div>
              <span className="text-muted-foreground block mb-1">Tags</span>
              <p className="text-muted-foreground">None · Add tag(s)</p>
              <Button variant="ghost" size="sm" className="h-7 mt-1 -ml-1">
                <Plus size={12} className="mr-1" />
                Add tag
              </Button>
            </div>

            {event.repo && (
              <div className="pt-2 border-t border-border space-y-3">
                <div>
                  <span className="text-muted-foreground block mb-1 flex items-center gap-1.5">
                    <GitBranch size={12} />
                    Repository
                  </span>
                  <a
                    href={event.repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline break-all block"
                  >
                    {event.repo.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                  {event.repo.branch && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Branch: {event.repo.branch}
                    </p>
                  )}
                </div>
                {event.repo.pr && (
                  <div>
                    <span className="text-muted-foreground block mb-1 flex items-center gap-1.5">
                      <GitPullRequest size={12} />
                      Pull Request
                    </span>
                    <a
                      href={event.repo.pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline block font-medium"
                    >
                      #{event.repo.pr.id} {event.repo.pr.title}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
