// ── Mock observability data for the SRE agent ──────────────────────────────
// This provides comprehensive runtime, infrastructure, and application data
// so the AI agent can answer any question about the system.

export interface ServiceInfo {
  name: string;
  version: string;
  language: string;
  replicas: number;
  status: "healthy" | "degraded" | "down";
  uptime: string;
  owner: string;
  repository: string;
  port: number;
  cpu: string;
  memory: string;
  errorRate: string;
  p50Latency: string;
  p99Latency: string;
  rps: number;
  dependencies: string[];
  recentDeploys: { version: string; timestamp: string; status: string }[];
}

export interface IncidentRecord {
  id: string;
  title: string;
  severity: "P1" | "P2" | "P3" | "P4";
  status: "open" | "mitigated" | "resolved";
  startedAt: string;
  resolvedAt: string | null;
  duration: string | null;
  affectedServices: string[];
  rootCause: string;
  resolution: string;
  timeline: { time: string; event: string }[];
}

export interface AlertRule {
  name: string;
  service: string;
  condition: string;
  threshold: string;
  status: "firing" | "resolved" | "silenced";
  lastTriggered: string | null;
}

export interface InfraNode {
  name: string;
  type: string;
  region: string;
  az: string;
  cpu: string;
  memory: string;
  disk: string;
  status: "running" | "draining" | "terminated";
  pods: number;
}

export interface DatabaseInfo {
  name: string;
  engine: string;
  version: string;
  role: "primary" | "replica";
  connections: { active: number; max: number };
  storage: { used: string; total: string };
  replicationLag: string | null;
  slowQueries: { query: string; avgMs: number; count: number }[];
  status: "healthy" | "degraded";
}

export interface DeploymentRecord {
  service: string;
  version: string;
  timestamp: string;
  author: string;
  status: "success" | "rolled_back" | "in_progress";
  changes: string;
  commitSha: string;
}

// ── Services ────────────────────────────────────────────────────────────────

export const services: ServiceInfo[] = [
  {
    name: "api-gateway",
    version: "v3.12.1",
    language: "Go 1.22",
    replicas: 5,
    status: "degraded",
    uptime: "12d 4h",
    owner: "platform-team",
    repository: "github.com/acme/api-gateway",
    port: 8080,
    cpu: "72%",
    memory: "1.2GB / 2GB",
    errorRate: "12.4%",
    p50Latency: "18ms",
    p99Latency: "245ms",
    rps: 12400,
    dependencies: ["checkout-service", "user-service", "inventory-service", "edge-cdn", "redis-cache"],
    recentDeploys: [
      { version: "v3.12.1", timestamp: "2026-02-07T08:00:00Z", status: "success" },
      { version: "v3.12.0", timestamp: "2026-02-05T14:30:00Z", status: "success" },
    ],
  },
  {
    name: "checkout-service",
    version: "v2.14.0",
    language: "Node.js 20.11",
    replicas: 3,
    status: "healthy",
    uptime: "6d 18h",
    owner: "commerce-team",
    repository: "github.com/acme/checkout-service",
    port: 3000,
    cpu: "34%",
    memory: "890MB / 1.5GB",
    errorRate: "0.3%",
    p50Latency: "45ms",
    p99Latency: "120ms",
    rps: 850,
    dependencies: ["payments-service", "inventory-service", "postgres-primary"],
    recentDeploys: [
      { version: "v2.14.0", timestamp: "2026-02-06T10:15:00Z", status: "success" },
      { version: "v2.13.9", timestamp: "2026-02-03T09:00:00Z", status: "success" },
    ],
  },
  {
    name: "payments-service",
    version: "v4.2.3",
    language: "Java 21",
    replicas: 3,
    status: "healthy",
    uptime: "3d 8h",
    owner: "payments-team",
    repository: "github.com/acme/payments-service",
    port: 8081,
    cpu: "28%",
    memory: "1.8GB / 3GB",
    errorRate: "0.1%",
    p50Latency: "65ms",
    p99Latency: "180ms",
    rps: 420,
    dependencies: ["stripe-adapter", "postgres-primary"],
    recentDeploys: [
      { version: "v4.2.3", timestamp: "2026-02-04T16:00:00Z", status: "success" },
    ],
  },
  {
    name: "inventory-service",
    version: "v1.9.7",
    language: "Go 1.22",
    replicas: 3,
    status: "healthy",
    uptime: "14d 2h",
    owner: "commerce-team",
    repository: "github.com/acme/inventory-service",
    port: 8082,
    cpu: "22%",
    memory: "420MB / 1GB",
    errorRate: "0.05%",
    p50Latency: "12ms",
    p99Latency: "45ms",
    rps: 1200,
    dependencies: ["postgres-primary", "redis-cache"],
    recentDeploys: [
      { version: "v1.9.7", timestamp: "2026-01-24T11:00:00Z", status: "success" },
    ],
  },
  {
    name: "user-service",
    version: "v3.8.1",
    language: "Node.js 20.11",
    replicas: 3,
    status: "healthy",
    uptime: "2d 12h",
    owner: "identity-team",
    repository: "github.com/acme/user-service",
    port: 3001,
    cpu: "18%",
    memory: "512MB / 1GB",
    errorRate: "0.02%",
    p50Latency: "8ms",
    p99Latency: "35ms",
    rps: 2100,
    dependencies: ["postgres-primary", "redis-cache"],
    recentDeploys: [
      { version: "v3.8.1", timestamp: "2026-02-05T07:30:00Z", status: "success" },
      { version: "v3.8.0", timestamp: "2026-02-04T14:00:00Z", status: "rolled_back" },
    ],
  },
  {
    name: "search-service",
    version: "v2.3.0",
    language: "Python 3.12",
    replicas: 2,
    status: "healthy",
    uptime: "8d 6h",
    owner: "search-team",
    repository: "github.com/acme/search-service",
    port: 8000,
    cpu: "45%",
    memory: "1.4GB / 2GB",
    errorRate: "0.1%",
    p50Latency: "35ms",
    p99Latency: "85ms",
    rps: 600,
    dependencies: ["elasticsearch", "redis-cache"],
    recentDeploys: [
      { version: "v2.3.0", timestamp: "2026-01-30T13:00:00Z", status: "success" },
    ],
  },
  {
    name: "edge-cdn",
    version: "v1.4.2",
    language: "Rust 1.76",
    replicas: 6,
    status: "healthy",
    uptime: "22d 10h",
    owner: "platform-team",
    repository: "github.com/acme/edge-cdn",
    port: 443,
    cpu: "15%",
    memory: "256MB / 512MB",
    errorRate: "0.01%",
    p50Latency: "3ms",
    p99Latency: "12ms",
    rps: 8500,
    dependencies: [],
    recentDeploys: [
      { version: "v1.4.2", timestamp: "2026-01-16T09:00:00Z", status: "success" },
    ],
  },
];

// ── Infrastructure ──────────────────────────────────────────────────────────

export const infrastructure: InfraNode[] = [
  { name: "k8s-node-01", type: "c5.2xlarge", region: "us-east-1", az: "us-east-1a", cpu: "62%", memory: "11.2GB / 16GB", disk: "45%", status: "running", pods: 18 },
  { name: "k8s-node-02", type: "c5.2xlarge", region: "us-east-1", az: "us-east-1b", cpu: "48%", memory: "9.8GB / 16GB", disk: "38%", status: "running", pods: 15 },
  { name: "k8s-node-03", type: "c5.2xlarge", region: "us-east-1", az: "us-east-1c", cpu: "55%", memory: "10.5GB / 16GB", disk: "42%", status: "running", pods: 16 },
  { name: "k8s-node-04", type: "m5.xlarge", region: "us-east-1", az: "us-east-1a", cpu: "35%", memory: "12GB / 16GB", disk: "60%", status: "running", pods: 8 },
  { name: "k8s-node-05", type: "m5.xlarge", region: "us-east-1", az: "us-east-1b", cpu: "40%", memory: "13GB / 16GB", disk: "55%", status: "running", pods: 10 },
];

// ── Databases ───────────────────────────────────────────────────────────────

export const databases: DatabaseInfo[] = [
  {
    name: "postgres-primary",
    engine: "PostgreSQL",
    version: "16.2",
    role: "primary",
    connections: { active: 142, max: 300 },
    storage: { used: "89GB", total: "200GB" },
    replicationLag: null,
    slowQueries: [
      { query: "SELECT * FROM orders WHERE user_id = $1 AND status IN (...)", avgMs: 320, count: 45 },
      { query: "UPDATE inventory SET quantity = quantity - $1 WHERE sku = $2", avgMs: 180, count: 120 },
    ],
    status: "healthy",
  },
  {
    name: "postgres-replica-01",
    engine: "PostgreSQL",
    version: "16.2",
    role: "replica",
    connections: { active: 88, max: 300 },
    storage: { used: "89GB", total: "200GB" },
    replicationLag: "12ms",
    slowQueries: [],
    status: "healthy",
  },
  {
    name: "redis-cache",
    engine: "Redis",
    version: "7.2.4",
    role: "primary",
    connections: { active: 210, max: 10000 },
    storage: { used: "2.1GB", total: "8GB" },
    replicationLag: null,
    slowQueries: [],
    status: "healthy",
  },
  {
    name: "elasticsearch",
    engine: "Elasticsearch",
    version: "8.12.0",
    role: "primary",
    connections: { active: 24, max: 200 },
    storage: { used: "156GB", total: "500GB" },
    replicationLag: null,
    slowQueries: [
      { query: "full-text search on products index with 6 aggregations", avgMs: 85, count: 600 },
    ],
    status: "healthy",
  },
];

// ── Recent incidents ────────────────────────────────────────────────────────

export const incidents: IncidentRecord[] = [
  {
    id: "INC-2026-042",
    title: "DDoS Attack on API Gateway",
    severity: "P1",
    status: "open",
    startedAt: "2026-02-07T18:30:00Z",
    resolvedAt: null,
    duration: null,
    affectedServices: ["api-gateway", "checkout-service"],
    rootCause: "Coordinated DDoS attack from IP range 198.51.100.0/24 targeting /api/checkout endpoint. Request rate surged from 200 req/s to 12,400 req/s.",
    resolution: "Pending — agent has proposed rate limiting rule for the offending CIDR block, awaiting human approval.",
    timeline: [
      { time: "18:30", event: "Traffic anomaly detected by agent" },
      { time: "18:31", event: "Source identified: 198.51.100.0/24" },
      { time: "18:32", event: "Error rate exceeded 10% on api-gateway" },
      { time: "18:33", event: "Agent proposed rate limiting fix" },
      { time: "18:33", event: "Awaiting human approval" },
    ],
  },
  {
    id: "INC-2026-041",
    title: "Payment Provider Timeout",
    severity: "P1",
    status: "resolved",
    startedAt: "2026-02-07T14:02:00Z",
    resolvedAt: "2026-02-07T15:10:00Z",
    duration: "68 minutes",
    affectedServices: ["payments-service", "checkout-service", "api-gateway"],
    rootCause: "Stripe adapter timeout set to 30s caused connection pool exhaustion when Stripe experienced elevated latency.",
    resolution: "Reduced timeout to 5s, enabled circuit breaker with 5-failure threshold, added retry with exponential backoff (max 3 attempts).",
    timeline: [
      { time: "13:45", event: "Stripe reports elevated latency" },
      { time: "14:02", event: "Error rate > 5% threshold breached" },
      { time: "14:10", event: "P1 incident declared" },
      { time: "14:25", event: "Root cause identified: Stripe timeout" },
      { time: "14:32", event: "Circuit breaker activated" },
      { time: "14:40", event: "Timeout reduced 30s → 5s" },
      { time: "14:55", event: "Error rate below 1%" },
      { time: "15:10", event: "Incident resolved" },
    ],
  },
  {
    id: "INC-2026-039",
    title: "DNS Resolution Failures — Edge CDN",
    severity: "P2",
    status: "resolved",
    startedAt: "2026-02-06T10:00:00Z",
    resolvedAt: "2026-02-06T11:45:00Z",
    duration: "105 minutes",
    affectedServices: ["edge-cdn"],
    rootCause: "Stale CoreDNS cache entry for edge-cdn.internal after infrastructure migration.",
    resolution: "Updated CoreDNS config: increased cache TTL to 300s and added CNAME fallback rewrite rule.",
    timeline: [
      { time: "10:00", event: "Intermittent 502s on static assets" },
      { time: "10:15", event: "DNS lookup failures identified" },
      { time: "11:00", event: "CoreDNS config patched" },
      { time: "11:45", event: "All clear, monitoring stable" },
    ],
  },
  {
    id: "INC-2026-036",
    title: "Memory Leak — User Service",
    severity: "P2",
    status: "resolved",
    startedAt: "2026-02-05T20:00:00Z",
    resolvedAt: "2026-02-06T02:00:00Z",
    duration: "6 hours",
    affectedServices: ["user-service"],
    rootCause: "Connection pool leak in database adapter. Connections were not released after transaction errors, causing linear memory growth (~50MB/hr).",
    resolution: "Deployed user-service v3.8.1 with connection pool leak fix. Memory usage stabilized at ~512MB.",
    timeline: [
      { time: "20:00", event: "Memory anomaly detected (linear growth)" },
      { time: "20:30", event: "Projected OOM in 6 hours" },
      { time: "22:00", event: "Root cause: connection pool leak" },
      { time: "01:00", event: "Fix deployed (v3.8.1)" },
      { time: "02:00", event: "Memory stabilized, incident resolved" },
    ],
  },
];

// ── Alert rules ─────────────────────────────────────────────────────────────

export const alertRules: AlertRule[] = [
  { name: "High Error Rate", service: "api-gateway", condition: "error_rate > 5%", threshold: "5%", status: "firing", lastTriggered: "2026-02-07T18:32:00Z" },
  { name: "High Latency P99", service: "api-gateway", condition: "p99_latency > 500ms", threshold: "500ms", status: "resolved", lastTriggered: "2026-02-07T14:05:00Z" },
  { name: "Pod Restart Loop", service: "payments-service", condition: "restart_count > 3 in 10m", threshold: "3 restarts", status: "resolved", lastTriggered: "2026-02-07T14:15:00Z" },
  { name: "CPU High", service: "inventory-service", condition: "cpu > 85%", threshold: "85%", status: "resolved", lastTriggered: "2026-02-06T08:00:00Z" },
  { name: "Memory Approaching Limit", service: "user-service", condition: "memory > 90%", threshold: "90%", status: "resolved", lastTriggered: "2026-02-05T23:00:00Z" },
  { name: "Database Connections", service: "postgres-primary", condition: "connections > 250", threshold: "250", status: "resolved", lastTriggered: null },
  { name: "Replication Lag", service: "postgres-replica-01", condition: "replication_lag > 100ms", threshold: "100ms", status: "resolved", lastTriggered: null },
  { name: "DDoS Detection", service: "api-gateway", condition: "single_source_rps > 5000", threshold: "5000 req/s", status: "firing", lastTriggered: "2026-02-07T18:30:00Z" },
];

// ── Recent deployments ──────────────────────────────────────────────────────

export const deployments: DeploymentRecord[] = [
  { service: "api-gateway", version: "v3.12.1", timestamp: "2026-02-07T08:00:00Z", author: "ci-bot", status: "success", changes: "Rate limiter improvements, request logging enhancements", commitSha: "a1b2c3d" },
  { service: "checkout-service", version: "v2.14.0", timestamp: "2026-02-06T10:15:00Z", author: "alice", status: "success", changes: "Canary deployment with new checkout flow", commitSha: "e4f5g6h" },
  { service: "user-service", version: "v3.8.1", timestamp: "2026-02-05T07:30:00Z", author: "bob", status: "success", changes: "Fix connection pool leak in database adapter", commitSha: "i7j8k9l" },
  { service: "user-service", version: "v3.8.0", timestamp: "2026-02-04T14:00:00Z", author: "bob", status: "rolled_back", changes: "Session caching optimization (caused memory regression)", commitSha: "m1n2o3p" },
  { service: "payments-service", version: "v4.2.3", timestamp: "2026-02-04T16:00:00Z", author: "carol", status: "success", changes: "Stripe timeout reduction, circuit breaker config", commitSha: "q4r5s6t" },
  { service: "search-service", version: "v2.3.0", timestamp: "2026-01-30T13:00:00Z", author: "dave", status: "success", changes: "Elasticsearch query optimization, faceted search", commitSha: "u7v8w9x" },
  { service: "edge-cdn", version: "v1.4.2", timestamp: "2026-01-16T09:00:00Z", author: "ci-bot", status: "success", changes: "TLS 1.3 enforcement, HTTP/3 support", commitSha: "y1z2a3b" },
];

// ── SLOs ────────────────────────────────────────────────────────────────────

export const slos = [
  { service: "api-gateway", metric: "Availability", target: "99.95%", current: "99.12%", status: "breached", window: "30d" },
  { service: "api-gateway", metric: "P99 Latency", target: "< 200ms", current: "245ms", status: "breached", window: "30d" },
  { service: "checkout-service", metric: "Availability", target: "99.99%", current: "99.97%", status: "met", window: "30d" },
  { service: "checkout-service", metric: "P99 Latency", target: "< 300ms", current: "120ms", status: "met", window: "30d" },
  { service: "payments-service", metric: "Availability", target: "99.99%", current: "99.95%", status: "at_risk", window: "30d" },
  { service: "payments-service", metric: "P99 Latency", target: "< 500ms", current: "180ms", status: "met", window: "30d" },
  { service: "user-service", metric: "Availability", target: "99.95%", current: "99.98%", status: "met", window: "30d" },
  { service: "search-service", metric: "P99 Latency", target: "< 200ms", current: "85ms", status: "met", window: "30d" },
];

// ── Runtime environment ─────────────────────────────────────────────────────

export const environment = {
  cluster: "acme-prod-east-1",
  kubernetes: "1.29.2",
  region: "us-east-1",
  provider: "AWS",
  nodeCount: 5,
  totalPods: 67,
  namespace: "production",
  ingressController: "nginx-ingress v1.10.0",
  serviceMesh: "Istio 1.21",
  monitoring: "Datadog + OpenTelemetry Collector v0.96.0",
  logging: "Fluentd → Elasticsearch",
  cicd: "GitHub Actions + ArgoCD",
  secretsManager: "HashiCorp Vault v1.15",
  certManager: "cert-manager v1.14 (auto mTLS rotation)",
};

// ── Aggregate function to get all data ──────────────────────────────────────

export function getAllObservabilityData() {
  return {
    environment,
    services,
    infrastructure,
    databases,
    incidents,
    alertRules,
    deployments,
    slos,
  };
}
