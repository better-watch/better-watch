// ── Enums ────────────────────────────────────────────────────────────────────

export enum EventType {
  IncidentDetected = "incident_detected",
  RootCauseFound = "root_cause_found",
  ConfigChange = "config_change",
  InstrumentationUpdate = "instrumentation_update",
  MetricAnomaly = "metric_anomaly",
  ServiceTopologyChange = "service_topology_change",
  AlertResolved = "alert_resolved",
  DeploymentDetected = "deployment_detected",
  RunbookExecuted = "runbook_executed",
}

export enum Severity {
  Critical = "critical",
  Warning = "warning",
  Info = "info",
  Success = "success",
}

export enum ArtifactType {
  Sparkline = "sparkline",
  AreaChart = "area_chart",
  BarChart = "bar_chart",
  TopologyDiagram = "topology_diagram",
  DependencyGraph = "dependency_graph",
  StatusGrid = "status_grid",
  DiffView = "diff_view",
  LogTrace = "log_trace",
  Timeline = "timeline",
}

// ── Artifact Data Types (discriminated union members) ────────────────────────

export interface SparklineData {
  dataPoints: number[];
  anomalyRange?: [number, number];
}

export interface AreaChartData {
  series: { label: string; dataPoints: number[]; color?: string }[];
  xLabels?: string[];
}

export interface BarChartData {
  bars: { label: string; value: number; color?: string }[];
}

export interface TopologyDiagramData {
  nodes: {
    id: string;
    label: string;
    status: "healthy" | "failing" | "degraded" | "unknown";
  }[];
  edges: { from: string; to: string }[];
}

export interface DependencyGraphData {
  nodes: {
    id: string;
    label: string;
    latency: string;
    isCritical?: boolean;
  }[];
  edges: { from: string; to: string }[];
}

export interface StatusGridData {
  rows: {
    service: string;
    cells: ("up" | "down" | "slow" | "unknown")[];
  }[];
  columnLabels: string[];
}

export interface DiffViewData {
  lines: { type: "added" | "removed" | "context"; content: string }[];
}

export interface LogTraceData {
  entries: {
    timestamp: string;
    level: "ERROR" | "WARN" | "INFO" | "DEBUG";
    message: string;
  }[];
}

export interface TimelineData {
  events: { time: string; label: string; type: string }[];
}

// ── Artifact map (discriminated union) ───────────────────────────────────────

export type ArtifactMap = {
  [ArtifactType.Sparkline]: SparklineData;
  [ArtifactType.AreaChart]: AreaChartData;
  [ArtifactType.BarChart]: BarChartData;
  [ArtifactType.TopologyDiagram]: TopologyDiagramData;
  [ArtifactType.DependencyGraph]: DependencyGraphData;
  [ArtifactType.StatusGrid]: StatusGridData;
  [ArtifactType.DiffView]: DiffViewData;
  [ArtifactType.LogTrace]: LogTraceData;
  [ArtifactType.Timeline]: TimelineData;
};

// ── SREEvent — discriminated union on artifactType ↔ artifactData ────────────

export type SREEvent = {
  [K in ArtifactType]: {
    id: string;
    title: string;
    summary: string;
    timestamp: string;
    eventType: EventType;
    severity: Severity;
    service: string;
    artifactType: K;
    artifactData: ArtifactMap[K];
  };
}[ArtifactType];

// ── Helpers ──────────────────────────────────────────────────────────────────

function hoursAgo(h: number): string {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

// ── Mock SRE Events (sorted newest-first) ────────────────────────────────────

export const mockSREEvents: SREEvent[] = [
  // ─── 0 h ago ───────────────────────────────────────────────────────────────
  {
    id: "evt-001",
    title: "DDoS Pattern Detected — API Gateway",
    summary:
      "Abnormal traffic spike from IP range 198.51.100.0/24 targeting /api/checkout. Request rate surged from 200 req/s to 12,400 req/s in under 2 minutes, degrading service for legitimate users.",
    timestamp: hoursAgo(0.5),
    eventType: EventType.IncidentDetected,
    severity: Severity.Critical,
    service: "api-gateway",
    artifactType: ArtifactType.Sparkline,
    artifactData: {
      dataPoints: [
        200, 210, 195, 205, 220, 380, 1200, 3400, 6800, 9200, 11500, 12400,
        12100, 12350, 12200, 12400, 12300, 12100, 12250, 12400,
      ],
      anomalyRange: [5, 19],
    },
  },
  // ─── 1 h ago ───────────────────────────────────────────────────────────────
  {
    id: "evt-002",
    title: "Latency Degradation — Checkout Service",
    summary:
      "P99 latency for checkout-service increased from 120ms to 890ms across all regions.",
    timestamp: hoursAgo(1.2),
    eventType: EventType.MetricAnomaly,
    severity: Severity.Warning,
    service: "checkout-service",
    artifactType: ArtifactType.AreaChart,
    artifactData: {
      series: [
        {
          label: "P50",
          dataPoints: [45, 48, 50, 52, 55, 70, 110, 200, 320, 410],
          color: "#3b82f6",
        },
        {
          label: "P99",
          dataPoints: [120, 125, 130, 140, 180, 340, 560, 780, 890, 870],
          color: "#ef4444",
        },
      ],
      xLabels: [
        "-45m",
        "-40m",
        "-35m",
        "-30m",
        "-25m",
        "-20m",
        "-15m",
        "-10m",
        "-5m",
        "now",
      ],
    },
  },
  // ─── 2 h ago ───────────────────────────────────────────────────────────────
  {
    id: "evt-003",
    title: "Error Rate Comparison by Endpoint",
    summary:
      "Breakdown of 5xx errors across the top 6 API endpoints in the last hour.",
    timestamp: hoursAgo(2),
    eventType: EventType.MetricAnomaly,
    severity: Severity.Warning,
    service: "api-gateway",
    artifactType: ArtifactType.BarChart,
    artifactData: {
      bars: [
        { label: "/api/checkout", value: 34, color: "#ef4444" },
        { label: "/api/payments", value: 22, color: "#f59e0b" },
        { label: "/api/inventory", value: 12, color: "#f59e0b" },
        { label: "/api/users", value: 4, color: "#22c55e" },
        { label: "/api/search", value: 2, color: "#22c55e" },
        { label: "/api/health", value: 0, color: "#6b7280" },
      ],
    },
  },
  // ─── 3 h ago ───────────────────────────────────────────────────────────────
  {
    id: "evt-004",
    title: "Service Mesh Topology Snapshot",
    summary:
      "Current service mesh topology showing checkout-service and payments-service degraded.",
    timestamp: hoursAgo(3),
    eventType: EventType.ServiceTopologyChange,
    severity: Severity.Info,
    service: "platform",
    artifactType: ArtifactType.TopologyDiagram,
    artifactData: {
      nodes: [
        { id: "gw", label: "api-gateway", status: "healthy" },
        { id: "cs", label: "checkout-service", status: "degraded" },
        { id: "ps", label: "payments-service", status: "failing" },
        { id: "is", label: "inventory-service", status: "healthy" },
        { id: "us", label: "user-service", status: "healthy" },
        { id: "db", label: "postgres-primary", status: "healthy" },
      ],
      edges: [
        { from: "gw", to: "cs" },
        { from: "gw", to: "us" },
        { from: "gw", to: "is" },
        { from: "cs", to: "ps" },
        { from: "cs", to: "is" },
        { from: "ps", to: "db" },
        { from: "is", to: "db" },
        { from: "us", to: "db" },
      ],
    },
  },
  // ─── 4 h ago ───────────────────────────────────────────────────────────────
  {
    id: "evt-005",
    title: "Root Cause: Payment Provider Timeout",
    summary:
      "Traced 5xx errors from api-gateway → checkout → payments → stripe-adapter (timeout after 30s).",
    timestamp: hoursAgo(4),
    eventType: EventType.RootCauseFound,
    severity: Severity.Critical,
    service: "payments-service",
    artifactType: ArtifactType.DependencyGraph,
    artifactData: {
      nodes: [
        { id: "gw", label: "api-gateway", latency: "12ms" },
        {
          id: "cs",
          label: "checkout-service",
          latency: "45ms",
          isCritical: true,
        },
        {
          id: "ps",
          label: "payments-service",
          latency: "890ms",
          isCritical: true,
        },
        {
          id: "sa",
          label: "stripe-adapter",
          latency: "30000ms",
          isCritical: true,
        },
      ],
      edges: [
        { from: "gw", to: "cs" },
        { from: "cs", to: "ps" },
        { from: "ps", to: "sa" },
      ],
    },
  },
  // ─── 5 h ago ───────────────────────────────────────────────────────────────
  {
    id: "evt-006",
    title: "Service Uptime Status — Last 12 Hours",
    summary:
      "Uptime grid for core services showing payments-service downtime window at 3–5h ago.",
    timestamp: hoursAgo(5),
    eventType: EventType.IncidentDetected,
    severity: Severity.Info,
    service: "platform",
    artifactType: ArtifactType.StatusGrid,
    artifactData: {
      rows: [
        {
          service: "api-gateway",
          cells: [
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "slow",
            "slow",
            "up",
            "up",
            "up",
            "up",
          ],
        },
        {
          service: "checkout",
          cells: [
            "up",
            "up",
            "up",
            "up",
            "up",
            "slow",
            "slow",
            "down",
            "slow",
            "up",
            "up",
            "up",
          ],
        },
        {
          service: "payments",
          cells: [
            "up",
            "up",
            "up",
            "up",
            "down",
            "down",
            "down",
            "down",
            "slow",
            "up",
            "up",
            "up",
          ],
        },
        {
          service: "inventory",
          cells: [
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
          ],
        },
        {
          service: "user-svc",
          cells: [
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
          ],
        },
        {
          service: "postgres",
          cells: [
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
            "up",
          ],
        },
      ],
      columnLabels: [
        "12h",
        "11h",
        "10h",
        "9h",
        "8h",
        "7h",
        "6h",
        "5h",
        "4h",
        "3h",
        "2h",
        "1h",
      ],
    },
  },
  // ─── 6 h ago ───────────────────────────────────────────────────────────────
  {
    id: "evt-007",
    title: "Config Rollback: Payment Timeout Threshold",
    summary:
      "Rolled back payments-service timeout from 30s to 5s and enabled circuit breaker.",
    timestamp: hoursAgo(6),
    eventType: EventType.ConfigChange,
    severity: Severity.Warning,
    service: "payments-service",
    artifactType: ArtifactType.DiffView,
    artifactData: {
      lines: [
        { type: "context", content: "# payments-service/config.yaml" },
        { type: "context", content: "upstream:" },
        { type: "context", content: "  provider: stripe" },
        { type: "removed", content: "  timeout_ms: 30000" },
        { type: "added", content: "  timeout_ms: 5000" },
        { type: "context", content: "  retry:" },
        { type: "removed", content: "    enabled: false" },
        { type: "added", content: "    enabled: true" },
        { type: "added", content: "    max_attempts: 3" },
        { type: "context", content: "circuit_breaker:" },
        { type: "removed", content: "  enabled: false" },
        { type: "added", content: "  enabled: true" },
        { type: "added", content: "  failure_threshold: 5" },
        { type: "added", content: "  reset_timeout_ms: 30000" },
      ],
    },
  },
  // ─── 7 h ago ───────────────────────────────────────────────────────────────
  {
    id: "evt-008",
    title: "Error Log Trace — Payments Timeout",
    summary:
      "Log entries from payments-service showing repeated Stripe adapter timeouts.",
    timestamp: hoursAgo(7),
    eventType: EventType.IncidentDetected,
    severity: Severity.Critical,
    service: "payments-service",
    artifactType: ArtifactType.LogTrace,
    artifactData: {
      entries: [
        {
          timestamp: "14:32:01.442",
          level: "ERROR",
          message:
            "stripe-adapter: connection timed out after 30000ms (attempt 1/1)",
        },
        {
          timestamp: "14:32:01.443",
          level: "ERROR",
          message:
            "PaymentProcessor.charge() failed: upstream_timeout | txn=pay_8f3k2",
        },
        {
          timestamp: "14:32:01.445",
          level: "WARN",
          message:
            "Circuit breaker OPEN for stripe-adapter (5 failures in 60s window)",
        },
        {
          timestamp: "14:32:02.100",
          level: "ERROR",
          message:
            "checkout-service: payment step failed, returning 503 to client",
        },
        {
          timestamp: "14:32:02.101",
          level: "INFO",
          message:
            "Fallback: queued payment for retry | txn=pay_8f3k2 | queue=payment-retry-dlq",
        },
        {
          timestamp: "14:32:05.330",
          level: "WARN",
          message:
            "Retry 1/3 for txn=pay_8f3k2: stripe-adapter still unreachable",
        },
        {
          timestamp: "14:32:10.501",
          level: "WARN",
          message:
            "Retry 2/3 for txn=pay_8f3k2: stripe-adapter still unreachable",
        },
        {
          timestamp: "14:32:15.722",
          level: "ERROR",
          message:
            "All retries exhausted for txn=pay_8f3k2 — moved to dead-letter queue",
        },
        {
          timestamp: "14:32:15.800",
          level: "INFO",
          message:
            "Alert escalated to #sre-oncall: payments-service circuit breaker OPEN",
        },
        {
          timestamp: "14:32:16.001",
          level: "DEBUG",
          message:
            "Healthcheck /payments/health returning 503 (circuit_breaker_open)",
        },
      ],
    },
  },
  // ─── 8 h ago ───────────────────────────────────────────────────────────────
  {
    id: "evt-009",
    title: "Incident Timeline — Payment Outage",
    summary:
      "Full timeline of the payment outage from first alert to resolution.",
    timestamp: hoursAgo(8),
    eventType: EventType.AlertResolved,
    severity: Severity.Success,
    service: "payments-service",
    artifactType: ArtifactType.Timeline,
    artifactData: {
      events: [
        {
          time: "13:45",
          label: "Stripe reports elevated latency",
          type: "external",
        },
        {
          time: "14:02",
          label: "Error rate > 5% threshold breached",
          type: "alert",
        },
        {
          time: "14:10",
          label: "P1 incident declared",
          type: "incident",
        },
        {
          time: "14:25",
          label: "Root cause identified: Stripe timeout",
          type: "diagnosis",
        },
        {
          time: "14:32",
          label: "Circuit breaker activated",
          type: "mitigation",
        },
        {
          time: "14:40",
          label: "Timeout reduced 30s → 5s",
          type: "config_change",
        },
        {
          time: "14:55",
          label: "Error rate below 1%",
          type: "recovery",
        },
        {
          time: "15:10",
          label: "Incident resolved, monitoring stable",
          type: "resolved",
        },
      ],
    },
  },
  // ─── 10 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-010",
    title: "Canary Deployment: checkout-service v2.14.0",
    summary:
      "Canary rollout started for checkout-service v2.14.0 — 5% traffic shifted.",
    timestamp: hoursAgo(10),
    eventType: EventType.DeploymentDetected,
    severity: Severity.Info,
    service: "checkout-service",
    artifactType: ArtifactType.BarChart,
    artifactData: {
      bars: [
        { label: "v2.13.9 (stable)", value: 95, color: "#3b82f6" },
        { label: "v2.14.0 (canary)", value: 5, color: "#f59e0b" },
      ],
    },
  },
  // ─── 14 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-011",
    title: "CPU Anomaly — Inventory Service",
    summary:
      "CPU usage on inventory-service spiked to 94% due to a runaway goroutine in the reconciler loop.",
    timestamp: hoursAgo(14),
    eventType: EventType.MetricAnomaly,
    severity: Severity.Warning,
    service: "inventory-service",
    artifactType: ArtifactType.Sparkline,
    artifactData: {
      dataPoints: [
        22, 24, 23, 25, 24, 26, 28, 35, 52, 71, 85, 94, 92, 88, 60, 35, 28,
        25, 24, 23,
      ],
      anomalyRange: [7, 15],
    },
  },
  // ─── 18 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-012",
    title: "Runbook: Restart Inventory Reconciler",
    summary:
      'Executed automated runbook "restart-reconciler" — killed stuck goroutine and restarted reconciliation loop.',
    timestamp: hoursAgo(18),
    eventType: EventType.RunbookExecuted,
    severity: Severity.Success,
    service: "inventory-service",
    artifactType: ArtifactType.LogTrace,
    artifactData: {
      entries: [
        {
          timestamp: "08:12:00.000",
          level: "INFO",
          message:
            "Runbook start: restart-reconciler (triggered by cpu_anomaly alert)",
        },
        {
          timestamp: "08:12:01.200",
          level: "INFO",
          message: "Step 1/4: Draining in-flight reconciliation tasks…",
        },
        {
          timestamp: "08:12:05.800",
          level: "INFO",
          message: "Step 2/4: Killing goroutine pool (pid=38291)…",
        },
        {
          timestamp: "08:12:06.100",
          level: "INFO",
          message: "Step 3/4: Restarting reconciler with fresh pool (size=8)…",
        },
        {
          timestamp: "08:12:08.500",
          level: "INFO",
          message:
            "Step 4/4: Healthcheck passed — CPU at 24%, reconciliation resumed",
        },
        {
          timestamp: "08:12:08.600",
          level: "INFO",
          message: "Runbook complete: restart-reconciler (duration: 8.6s)",
        },
      ],
    },
  },
  // ─── 22 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-013",
    title: "DNS Resolution Failures — Edge CDN",
    summary:
      "Intermittent DNS lookup failures for edge-cdn.internal causing 502s on static assets.",
    timestamp: hoursAgo(22),
    eventType: EventType.IncidentDetected,
    severity: Severity.Critical,
    service: "edge-cdn",
    artifactType: ArtifactType.Sparkline,
    artifactData: {
      dataPoints: [
        0, 0, 0, 1, 0, 3, 8, 15, 22, 18, 25, 30, 28, 20, 12, 5, 2, 0, 0, 0,
      ],
      anomalyRange: [5, 15],
    },
  },
  // ─── 26 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-014",
    title: "CoreDNS Config Update",
    summary:
      "Updated CoreDNS config to add edge-cdn.internal CNAME fallback and increased cache TTL.",
    timestamp: hoursAgo(26),
    eventType: EventType.ConfigChange,
    severity: Severity.Info,
    service: "coredns",
    artifactType: ArtifactType.DiffView,
    artifactData: {
      lines: [
        { type: "context", content: "# Corefile" },
        { type: "context", content: ".:53 {" },
        { type: "context", content: "  forward . /etc/resolv.conf" },
        { type: "removed", content: "  cache 30" },
        { type: "added", content: "  cache 300" },
        { type: "context", content: "  errors" },
        { type: "context", content: "  health" },
        { type: "added", content: "  rewrite name edge-cdn.internal edge-cdn-fallback.internal" },
        { type: "context", content: "}" },
      ],
    },
  },
  // ─── 30 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-015",
    title: "eBPF Probe Deployed — Latency Tracing",
    summary:
      "Deployed eBPF probe to capture per-request latency histograms on checkout-service.",
    timestamp: hoursAgo(30),
    eventType: EventType.InstrumentationUpdate,
    severity: Severity.Info,
    service: "checkout-service",
    artifactType: ArtifactType.Timeline,
    artifactData: {
      events: [
        {
          time: "04:00",
          label: "Probe compiled for kernel 6.1",
          type: "build",
        },
        {
          time: "04:01",
          label: "Deployed to checkout-service pod (3 replicas)",
          type: "deploy",
        },
        {
          time: "04:02",
          label: "Verified histogram collection — 500 samples/sec",
          type: "verify",
        },
        {
          time: "04:05",
          label: "Dashboard updated with new latency panel",
          type: "config",
        },
      ],
    },
  },
  // ─── 34 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-016",
    title: "Service Topology — Post-Deployment",
    summary:
      "All services healthy after checkout-service v2.13.9 deployment and DNS fix.",
    timestamp: hoursAgo(34),
    eventType: EventType.ServiceTopologyChange,
    severity: Severity.Success,
    service: "platform",
    artifactType: ArtifactType.TopologyDiagram,
    artifactData: {
      nodes: [
        { id: "gw", label: "api-gateway", status: "healthy" },
        { id: "cs", label: "checkout-service", status: "healthy" },
        { id: "ps", label: "payments-service", status: "healthy" },
        { id: "is", label: "inventory-service", status: "healthy" },
        { id: "us", label: "user-service", status: "healthy" },
        { id: "cdn", label: "edge-cdn", status: "healthy" },
        { id: "db", label: "postgres-primary", status: "healthy" },
      ],
      edges: [
        { from: "gw", to: "cs" },
        { from: "gw", to: "us" },
        { from: "gw", to: "is" },
        { from: "gw", to: "cdn" },
        { from: "cs", to: "ps" },
        { from: "cs", to: "is" },
        { from: "ps", to: "db" },
        { from: "is", to: "db" },
        { from: "us", to: "db" },
      ],
    },
  },
  // ─── 38 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-017",
    title: "Memory Leak Detection — User Service",
    summary:
      "Heap memory in user-service growing linearly at ~50MB/hr. Projected OOM in 6 hours.",
    timestamp: hoursAgo(38),
    eventType: EventType.MetricAnomaly,
    severity: Severity.Warning,
    service: "user-service",
    artifactType: ArtifactType.AreaChart,
    artifactData: {
      series: [
        {
          label: "Heap Used (MB)",
          dataPoints: [512, 560, 610, 658, 710, 762, 810, 865, 912, 960],
          color: "#f59e0b",
        },
        {
          label: "Heap Limit (MB)",
          dataPoints: [1024, 1024, 1024, 1024, 1024, 1024, 1024, 1024, 1024, 1024],
          color: "#ef4444",
        },
      ],
      xLabels: ["-9h", "-8h", "-7h", "-6h", "-5h", "-4h", "-3h", "-2h", "-1h", "now"],
    },
  },
  // ─── 42 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-018",
    title: "Deployment: user-service v3.8.1 (memory fix)",
    summary:
      "Deployed user-service v3.8.1 with connection pool leak fix. Memory usage stabilized.",
    timestamp: hoursAgo(42),
    eventType: EventType.DeploymentDetected,
    severity: Severity.Success,
    service: "user-service",
    artifactType: ArtifactType.Sparkline,
    artifactData: {
      dataPoints: [
        960, 940, 900, 850, 780, 700, 620, 540, 510, 512, 515, 510, 512, 514,
        511, 513, 510, 512, 511, 513,
      ],
    },
  },
  // ─── 48 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-019",
    title: "Rate Limiter Config Update",
    summary:
      "Increased rate limit on /api/search from 100 to 500 req/s after false positive throttling reports.",
    timestamp: hoursAgo(48),
    eventType: EventType.ConfigChange,
    severity: Severity.Info,
    service: "api-gateway",
    artifactType: ArtifactType.DiffView,
    artifactData: {
      lines: [
        { type: "context", content: "# rate-limiter.yaml" },
        { type: "context", content: "rules:" },
        { type: "context", content: "  - path: /api/search" },
        { type: "removed", content: "    limit: 100" },
        { type: "added", content: "    limit: 500" },
        { type: "context", content: "    window: 1s" },
        { type: "context", content: "    action: reject" },
      ],
    },
  },
  // ─── 52 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-020",
    title: "Dependency Mapping — Search Pipeline",
    summary:
      "Automated dependency scan of the search pipeline. Elasticsearch cluster latency elevated.",
    timestamp: hoursAgo(52),
    eventType: EventType.RootCauseFound,
    severity: Severity.Warning,
    service: "search-service",
    artifactType: ArtifactType.DependencyGraph,
    artifactData: {
      nodes: [
        { id: "gw", label: "api-gateway", latency: "8ms" },
        { id: "ss", label: "search-service", latency: "35ms" },
        {
          id: "es",
          label: "elasticsearch",
          latency: "420ms",
          isCritical: true,
        },
        { id: "rc", label: "redis-cache", latency: "2ms" },
      ],
      edges: [
        { from: "gw", to: "ss" },
        { from: "ss", to: "es" },
        { from: "ss", to: "rc" },
      ],
    },
  },
  // ─── 56 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-021",
    title: "Runbook: Elasticsearch Shard Rebalance",
    summary:
      "Executed shard rebalance runbook to fix hot-spotting on es-node-03.",
    timestamp: hoursAgo(56),
    eventType: EventType.RunbookExecuted,
    severity: Severity.Success,
    service: "elasticsearch",
    artifactType: ArtifactType.LogTrace,
    artifactData: {
      entries: [
        {
          timestamp: "20:00:00.000",
          level: "INFO",
          message: "Runbook start: es-shard-rebalance (manual trigger by SRE agent)",
        },
        {
          timestamp: "20:00:05.000",
          level: "INFO",
          message: "Identified hot shard: index=logs-2026.02 shard=3 on es-node-03",
        },
        {
          timestamp: "20:00:10.000",
          level: "INFO",
          message: "Relocating shard 3 from es-node-03 → es-node-01…",
        },
        {
          timestamp: "20:02:30.000",
          level: "INFO",
          message: "Shard relocation complete. Cluster status: GREEN",
        },
        {
          timestamp: "20:02:35.000",
          level: "INFO",
          message: "Query latency p99 dropped from 420ms to 85ms. Runbook complete.",
        },
      ],
    },
  },
  // ─── 60 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-022",
    title: "Alert Resolved — Checkout Latency",
    summary:
      "Checkout-service P99 latency returned to baseline (< 150ms) after payment timeout fix.",
    timestamp: hoursAgo(60),
    eventType: EventType.AlertResolved,
    severity: Severity.Success,
    service: "checkout-service",
    artifactType: ArtifactType.Sparkline,
    artifactData: {
      dataPoints: [
        890, 780, 560, 340, 180, 150, 140, 130, 125, 120, 122, 118, 121, 120,
        119, 120, 121, 120, 118, 120,
      ],
    },
  },
  // ─── 64 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-023",
    title: "TLS Certificate Rotation — All Services",
    summary:
      "Automated mTLS certificate rotation completed for all 7 services. No disruption observed.",
    timestamp: hoursAgo(64),
    eventType: EventType.ConfigChange,
    severity: Severity.Info,
    service: "cert-manager",
    artifactType: ArtifactType.StatusGrid,
    artifactData: {
      rows: [
        { service: "api-gateway", cells: ["up", "up", "up", "up"] },
        { service: "checkout", cells: ["up", "up", "up", "up"] },
        { service: "payments", cells: ["up", "up", "up", "up"] },
        { service: "inventory", cells: ["up", "up", "up", "up"] },
        { service: "user-svc", cells: ["up", "up", "up", "up"] },
        { service: "search", cells: ["up", "up", "up", "up"] },
        { service: "edge-cdn", cells: ["up", "up", "up", "up"] },
      ],
      columnLabels: ["Pre-rotation", "Rotation", "Post-rotation", "Verified"],
    },
  },
  // ─── 68 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-024",
    title: "OpenTelemetry Collector Update",
    summary:
      "Upgraded OTel collector to v0.96.0 with new batch processor and Kafka exporter.",
    timestamp: hoursAgo(68),
    eventType: EventType.InstrumentationUpdate,
    severity: Severity.Info,
    service: "otel-collector",
    artifactType: ArtifactType.DiffView,
    artifactData: {
      lines: [
        { type: "context", content: "# otel-collector-config.yaml" },
        { type: "context", content: "exporters:" },
        { type: "context", content: "  otlp:" },
        { type: "context", content: "    endpoint: jaeger:4317" },
        { type: "added", content: "  kafka:" },
        { type: "added", content: "    brokers: [kafka-0:9092, kafka-1:9092]" },
        { type: "added", content: "    topic: otel-spans" },
        { type: "context", content: "processors:" },
        { type: "removed", content: "  batch:" },
        { type: "removed", content: "    timeout: 5s" },
        { type: "added", content: "  batch:" },
        { type: "added", content: "    timeout: 2s" },
        { type: "added", content: "    send_batch_size: 1024" },
      ],
    },
  },
  // ─── 71 h ago ──────────────────────────────────────────────────────────────
  {
    id: "evt-025",
    title: "Scheduled Load Test — API Gateway",
    summary:
      "Completed synthetic load test: 10k RPS for 15 min. All latencies within SLO.",
    timestamp: hoursAgo(71),
    eventType: EventType.MetricAnomaly,
    severity: Severity.Info,
    service: "api-gateway",
    artifactType: ArtifactType.AreaChart,
    artifactData: {
      series: [
        {
          label: "RPS",
          dataPoints: [0, 2000, 5000, 8000, 10000, 10000, 10000, 10000, 10000, 8000, 5000, 2000, 0],
          color: "#3b82f6",
        },
        {
          label: "Error Rate (%)",
          dataPoints: [0, 0.1, 0.2, 0.3, 0.4, 0.3, 0.3, 0.4, 0.3, 0.2, 0.1, 0.1, 0],
          color: "#22c55e",
        },
      ],
      xLabels: ["0m", "1m", "2m", "3m", "5m", "7m", "9m", "11m", "13m", "14m", "14.5m", "14.8m", "15m"],
    },
  },
];
