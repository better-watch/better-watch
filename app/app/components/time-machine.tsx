'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import type {
  SREEvent,
  EventType,
  Severity,
  ArtifactType,
} from '@/lib/sre-events';
import { ThemeToggle } from '@/components/theme-toggle';

// Artifact components
import { SparklineChart, AreaChart, BarChart } from './artifacts/metric-charts';
import { TopologyDiagram, DependencyGraph } from './artifacts/architecture-diagrams';
import { StatusGrid, DiffView, LogTrace } from './artifacts/detail-artifacts';

// ── Severity colors ──────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  success: '#22c55e',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
  success: 'Success',
};

// ── Event type icons & labels ────────────────────────────────────────────────

const EVENT_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  incident_detected: { icon: AlertTriangle, label: 'Incident Detected' },
  root_cause_found: { icon: Search, label: 'Root Cause Found' },
  config_change: { icon: Settings, label: 'Config Change' },
  instrumentation_update: { icon: Activity, label: 'Instrumentation Update' },
  metric_anomaly: { icon: BarChart3, label: 'Metric Anomaly' },
  service_topology_change: { icon: Network, label: 'Topology Change' },
  alert_resolved: { icon: CheckCircle, label: 'Alert Resolved' },
  deployment_detected: { icon: Rocket, label: 'Deployment Detected' },
  runbook_executed: { icon: BookOpen, label: 'Runbook Executed' },
};

// ── Relative time ────────────────────────────────────────────────────────────

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

// ── Artifact Renderer ────────────────────────────────────────────────────────

function ArtifactRenderer({ event }: { event: SREEvent }) {
  switch (event.artifactType) {
    case 'sparkline':
      return <SparklineChart data={event.artifactData} />;
    case 'area_chart':
      return <AreaChart data={event.artifactData} />;
    case 'bar_chart':
      return <BarChart data={event.artifactData} />;
    case 'topology_diagram':
      return <TopologyDiagram {...event.artifactData} />;
    case 'dependency_graph':
      return <DependencyGraph {...event.artifactData} />;
    case 'status_grid':
      return <StatusGrid {...event.artifactData} />;
    case 'diff_view':
      return <DiffView {...event.artifactData} />;
    case 'log_trace':
      return <LogTrace {...event.artifactData} />;
    case 'timeline':
      // Simple timeline rendering for the timeline artifact type
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

// ── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: SREEvent }) {
  const severityColor = SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.info;
  const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.incident_detected;
  const Icon = config.icon;
  const isCritical = event.severity === 'critical';

  return (
    <article
      className="h-full overflow-hidden rounded-2xl border border-neutral-200/60 dark:border-neutral-700/40"
      style={{
        borderTop: `3px solid ${severityColor}`,
        background: `linear-gradient(to bottom, ${severityColor}08 0%, transparent 30%), var(--card-bg, white)`,
        boxShadow: isCritical
          ? `0 20px 40px -8px rgba(0,0,0,0.2), 0 0 24px ${severityColor}12`
          : '0 8px 32px -4px rgba(0,0,0,0.12), 0 2px 8px -2px rgba(0,0,0,0.08)',
      }}
    >
      {/* Artifact section — top 60% */}
      <div className="relative h-3/5 bg-neutral-50 dark:bg-neutral-800/50 overflow-hidden flex items-center justify-center p-4">
        <ArtifactRenderer event={event} />
      </div>

      {/* Metadata section — bottom 40% */}
      <div className="p-5 h-2/5 flex flex-col justify-center gap-2">
        {/* Event type badge */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: severityColor }}
          >
            <Icon size={12} />
            {config.label}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-1">
          {event.title}
        </h2>

        {/* Summary */}
        <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
          {event.summary}
        </p>

        {/* Bottom row: severity dot, service tag, timestamp */}
        <div className="flex items-center gap-3 mt-1">
          {/* Severity dot + label */}
          <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: severityColor }} />
            {SEVERITY_LABELS[event.severity]}
          </span>

          {/* Service tag */}
          <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-xs font-mono text-neutral-600 dark:text-neutral-400">
            {event.service}
          </span>

          {/* Timestamp */}
          <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-auto">
            {relativeTime(event.timestamp)}
          </span>
        </div>
      </div>
    </article>
  );
}

// ── Agent reasoning mock data ────────────────────────────────────────────────

const AGENT_REASONING: Record<string, string[]> = {
  incident_detected: [
    'Anomaly detected: error rate exceeded 3-sigma threshold for 5 consecutive minutes.',
    'Cross-referenced with recent deployments — no code changes in the last 2 hours.',
    'Upstream dependency health check shows degradation on external provider.',
    'Escalation criteria met: P1 incident declared, paging on-call.',
  ],
  root_cause_found: [
    'Traced latency spike through distributed tracing (Jaeger span analysis).',
    'Identified bottleneck at upstream adapter — 30s timeout with no circuit breaker.',
    'Confirmed via log correlation: 100% of failures originate from same dependency.',
    'Recommendation: reduce timeout, enable circuit breaker, add retry with backoff.',
  ],
  config_change: [
    'Configuration drift detected between staging and production.',
    'Applied recommended configuration based on runbook playbook-017.',
    'Validated change against canary environment before production rollout.',
    'Monitoring post-change metrics for 15 minutes before marking stable.',
  ],
  instrumentation_update: [
    'Coverage gap identified: no per-request latency histograms on target service.',
    'Selected eBPF probe for zero-overhead kernel-level instrumentation.',
    'Compiled probe for target kernel version, deployed to all replicas.',
    'Verified data pipeline: probe → OTel collector → time-series DB → dashboard.',
  ],
  metric_anomaly: [
    'Statistical anomaly detected using EWMA model with α=0.3.',
    'Deviation exceeds 4-sigma from 7-day rolling baseline.',
    'Correlated with resource utilization — potential memory leak or CPU runaway.',
    'Triggering deeper investigation and resource profiling.',
  ],
  service_topology_change: [
    'Topology scan detected new service registration or status change.',
    'Compared current graph against last known-good topology snapshot.',
    'Identified affected downstream consumers of changed service.',
    'No breaking changes detected — topology update is informational.',
  ],
  alert_resolved: [
    'All monitored metrics have returned to within SLO thresholds.',
    'Confirmed stability over a 15-minute observation window.',
    'No recurrence of anomalous patterns detected in trailing data.',
    'Closing incident and updating post-mortem timeline.',
  ],
  deployment_detected: [
    'New container image SHA detected in Kubernetes deployment spec.',
    'Diff analysis: 12 files changed, 3 new API endpoints, 1 dependency bump.',
    'Canary deployment initiated — shifting 5% of traffic to new version.',
    'Monitoring error rate and latency on canary pods vs. stable baseline.',
  ],
  runbook_executed: [
    'Automated runbook triggered by alert correlation engine.',
    'Pre-flight checks passed: service is in a safe state for remediation.',
    'Executing remediation steps sequentially with rollback checkpoints.',
    'All steps completed successfully. Post-execution health check passed.',
  ],
};

function getAgentReasoning(eventType: string): string[] {
  return AGENT_REASONING[eventType] || AGENT_REASONING.incident_detected;
}

// ── Related events helper ────────────────────────────────────────────────────

function getRelatedEvents(
  event: SREEvent,
  allEvents: SREEvent[],
  maxCount = 3
): SREEvent[] {
  const eventTime = new Date(event.timestamp).getTime();
  const ONE_HOUR = 3600000;

  return allEvents
    .filter((e) => e.id !== event.id)
    .map((e) => ({
      event: e,
      score:
        (e.service === event.service ? 2 : 0) +
        (Math.abs(new Date(e.timestamp).getTime() - eventTime) < ONE_HOUR ? 1 : 0),
    }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCount)
    .map((e) => e.event);
}

// ── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  event,
  allEvents,
  onClose,
}: {
  event: SREEvent;
  allEvents: SREEvent[];
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const severityColor = SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.info;
  const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.incident_detected;
  const Icon = config.icon;
  const related = getRelatedEvents(event, allEvents);
  const reasoning = getAgentReasoning(event.eventType);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Close on click outside
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
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          aria-label="Close detail panel"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>

        {/* Full-size artifact */}
        <div className="relative bg-neutral-50 dark:bg-neutral-800/50 p-6 min-h-[280px] flex items-center justify-center">
          <ArtifactRenderer event={event} />
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Event type badge */}
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
            <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: severityColor }} />
              {SEVERITY_LABELS[event.severity]}
            </span>
            <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-auto">
              {relativeTime(event.timestamp)}
            </span>
          </div>

          {/* Title + full summary */}
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {event.title}
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {event.summary}
            </p>
          </div>

          {/* Agent Reasoning */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
              Agent Reasoning
            </h3>
            <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-4 space-y-2">
              {reasoning.map((line, i) => (
                <div key={i} className="flex gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="text-neutral-300 dark:text-neutral-600 select-none shrink-0">
                    {i + 1}.
                  </span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Related Events */}
          {related.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
                Related Events
              </h3>
              <div className="space-y-2">
                {related.map((rel) => {
                  const relColor = SEVERITY_COLORS[rel.severity] || SEVERITY_COLORS.info;
                  const relConfig = EVENT_TYPE_CONFIG[rel.eventType] || EVENT_TYPE_CONFIG.incident_detected;
                  const RelIcon = relConfig.icon;
                  return (
                    <div
                      key={rel.id}
                      className="flex items-center gap-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: relColor }}
                      />
                      <RelIcon size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                          {rel.title}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {rel.service} &middot; {relativeTime(rel.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Better Watch ─────────────────────────────────────────────────────────────

interface TimeMachineProps {
  events: SREEvent[];
}

export function TimeMachine({ events }: TimeMachineProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragProgress, setDragProgress] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAccumulator = useRef(0);
  const snapThreshold = 0.25;

  const handleRelease = () => {
    if (Math.abs(dragProgress) > snapThreshold) {
      const direction = dragProgress > 0 ? 1 : -1;
      const newIndex = Math.max(0, Math.min(events.length - 1, activeIndex + direction));
      setActiveIndex(newIndex);
    }
    setDragProgress(0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveIndex((current) => Math.max(0, current - 1));
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveIndex((current) => Math.min(events.length - 1, current + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [events.length]);

  // Scroll with tension/snap
  useEffect(() => {
    const container = containerRef.current;
    if (!container || detailOpen) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      scrollAccumulator.current += e.deltaY * 0.012;

      setDragProgress((current) => {
        const newProgress = current + scrollAccumulator.current;
        scrollAccumulator.current = 0;

        if (Math.abs(newProgress) > 1) {
          const direction = newProgress > 0 ? 1 : -1;
          const newIndex = Math.max(0, Math.min(events.length - 1, activeIndex + direction));
          setTimeout(() => {
            setActiveIndex(newIndex);
            setDragProgress(0);
          }, 0);
          return 0;
        }
        return Math.max(-1, Math.min(1, newProgress));
      });
    };

    const handleWheelEnd = () => {
      handleRelease();
    };

    let wheelTimeout: NodeJS.Timeout;
    const handleWheelWithDebounce = (e: WheelEvent) => {
      handleWheel(e);
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(handleWheelEnd, 40);
    };

    container.addEventListener('wheel', handleWheelWithDebounce, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelWithDebounce);
      clearTimeout(wheelTimeout);
    };
  }, [events.length, activeIndex, detailOpen]);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <p className="text-neutral-500">No events recorded.</p>
      </div>
    );
  }

  // Timeline calculations
  const sortedByTime = [...events].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const oldestTime = new Date(sortedByTime[0].timestamp).getTime();
  const newestTime = new Date(sortedByTime[sortedByTime.length - 1].timestamp).getTime();
  const timeRange = newestTime - oldestTime || 1;

  const currentEvent = events[activeIndex];
  const currentTime = new Date(currentEvent.timestamp).getTime();
  const currentPosition = (currentTime - oldestTime) / timeRange;

  return (
    <div
      ref={containerRef}
      className="relative h-[80vh] w-full cursor-ns-resize overflow-hidden"
    >
      {/* Perspective container */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: '1200px' }}
        initial={{ y: 60, opacity: 0 }}
        animate={{
          y: 0,
          opacity: detailOpen ? 0.3 : 1,
          filter: detailOpen ? 'blur(8px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Cards stack */}
        <div className="relative w-full max-w-2xl h-[400px]" style={{ transformStyle: 'preserve-3d' }}>
          {events.map((event, index) => {
            const isActive = index === activeIndex;
            const offset = index - activeIndex;
            const absOffset = Math.abs(offset);

            let translateY = offset * 58;
            let translateZ = -absOffset * 50;
            let rotateX = 0;
            const opacity = isActive ? 1 : Math.max(0.3, 1 - absOffset * 0.15);
            const scale = isActive ? 1 : Math.max(0.82, 1 - absOffset * 0.04);
            const blur = isActive ? 0 : Math.min(absOffset * 1.5, 4);

            if (isActive && Math.abs(dragProgress) > 0.05) {
              translateY = translateY - dragProgress * 100;
              translateZ = translateZ + Math.abs(dragProgress) * 40;
              rotateX = -dragProgress * 12;
            }

            return (
              <motion.div
                key={event.id}
                className="absolute inset-0"
                style={{
                  zIndex: 100 - Math.round(absOffset * 10),
                  pointerEvents: isActive && !detailOpen ? 'auto' : 'none',
                  transformOrigin: 'center center',
                  cursor: isActive ? 'pointer' : 'default',
                }}
                animate={{
                  y: translateY,
                  z: translateZ,
                  rotateX,
                  scale,
                  opacity,
                  filter: `blur(${blur}px)`,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 30,
                }}
                onClick={isActive ? () => setDetailOpen(true) : undefined}
              >
                <EventCard event={event} />
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Timeline scrubber on right */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{
          opacity: detailOpen ? 0.3 : 1,
          x: 0,
          filter: detailOpen ? 'blur(8px)' : 'blur(0px)',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="contents"
      >
        <div
          className="absolute right-6 top-1/2 -translate-y-1/2 h-[85%] flex flex-col items-end select-none"
          onMouseDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const handleDrag = (moveEvent: MouseEvent) => {
              const y = moveEvent.clientY - rect.top;
              const percentage = Math.max(0, Math.min(1, y / rect.height));
              const targetTime = oldestTime + percentage * timeRange;
              let nearestIndex = 0;
              let nearestDiff = Infinity;
              events.forEach((evt, i) => {
                const diff = Math.abs(new Date(evt.timestamp).getTime() - targetTime);
                if (diff < nearestDiff) {
                  nearestDiff = diff;
                  nearestIndex = i;
                }
              });
              setActiveIndex(nearestIndex);
            };
            const handleUp = () => {
              window.removeEventListener('mousemove', handleDrag);
              window.removeEventListener('mouseup', handleUp);
            };
            handleDrag(e.nativeEvent);
            window.addEventListener('mousemove', handleDrag);
            window.addEventListener('mouseup', handleUp);
          }}
        >
          {/* Timeline track */}
          <div className="relative h-full w-44 cursor-pointer">
            {/* Severity-colored dots along the track */}
            {events.map((event, index) => {
              const eventTime = new Date(event.timestamp).getTime();
              const eventPosition = (eventTime - oldestTime) / timeRange;
              const severityColor = SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.info;

              return (
                <div
                  key={`dot-${event.id}`}
                  className="absolute right-[68px]"
                  style={{ top: `${eventPosition * 100}%`, transform: 'translateY(-50%)' }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: severityColor, opacity: index === activeIndex ? 1 : 0.5 }}
                  />
                </div>
              );
            })}

            {/* Event tick marks — all colored by severity */}
            {events.map((event, index) => {
              const eventTime = new Date(event.timestamp).getTime();
              const eventPosition = (eventTime - oldestTime) / timeRange;
              const isActive = index === activeIndex;
              const severityColor = SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.info;

              return (
                <div
                  key={event.id}
                  className="absolute right-0 flex items-center justify-end"
                  style={{ top: `${eventPosition * 100}%`, transform: 'translateY(-50%)' }}
                  onClick={() => setActiveIndex(index)}
                >
                  <motion.div
                    animate={{
                      width: isActive ? 56 : 32,
                      height: isActive ? 4 : 2,
                    }}
                    style={{
                      backgroundColor: severityColor,
                      opacity: isActive ? 1 : 0.4,
                      borderRadius: 2,
                      boxShadow: isActive ? `0 0 10px ${severityColor}` : 'none',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </div>
              );
            })}

            {/* Floating active label — relative time + event type */}
            <motion.div
              className="absolute right-[82px] pointer-events-none"
              animate={{ top: `${currentPosition * 100}%` }}
              transition={{ type: 'spring', stiffness: 800, damping: 35 }}
              style={{ transform: 'translateY(-50%)' }}
            >
              <span
                className="text-sm whitespace-nowrap font-medium leading-none"
                style={{ color: SEVERITY_COLORS[currentEvent.severity] || '#f97316' }}
              >
                {relativeTime(currentEvent.timestamp)}
                {' — '}
                {(EVENT_TYPE_CONFIG[currentEvent.eventType] || EVENT_TYPE_CONFIG.incident_detected).label}
              </span>
            </motion.div>
          </div>

          {/* Labels */}
          <div className="absolute -top-6 right-0 text-[11px] text-neutral-400">
            {new Date(oldestTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
          <div className="absolute -bottom-6 right-0 flex items-center gap-2 text-[11px] text-blue-500 font-medium">
            Now
            <ThemeToggle />
          </div>
        </div>
      </motion.div>

      {/* Detail expansion panel */}
      <AnimatePresence>
        {detailOpen && (
          <DetailPanel
            event={currentEvent}
            allEvents={events}
            onClose={() => setDetailOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
