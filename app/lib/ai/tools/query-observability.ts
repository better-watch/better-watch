import { tool } from "ai";
import { z } from "zod";
import {
  services,
  infrastructure,
  databases,
  incidents,
  alertRules,
  deployments,
  slos,
  environment,
} from "./observability-data";

export const queryObservability = tool({
  description: `Query the observability platform for real-time information about services, infrastructure, incidents, deployments, alerts, SLOs, and databases. Use this tool whenever the user asks about:
- Service health, status, metrics, latency, error rates, or dependencies
- Infrastructure (Kubernetes nodes, pods, resource usage)
- Incidents (current or past), root causes, timelines
- Deployments (recent releases, rollbacks, who deployed what)
- Alerts (what's firing, thresholds, history)
- SLOs (service level objectives, burn rates, compliance)
- Databases (connections, storage, slow queries, replication)
- Runtime environment (cluster info, versions, tooling)
- Any question about the application, its architecture, or operations`,
  inputSchema: z.object({
    category: z
      .enum([
        "services",
        "infrastructure",
        "incidents",
        "deployments",
        "alerts",
        "slos",
        "databases",
        "environment",
        "overview",
      ])
      .describe("The category of observability data to query"),
    filter: z
      .string()
      .optional()
      .describe("Optional filter — a service name, incident ID, severity level, or status to narrow results"),
  }),
  execute: async ({ category, filter }) => {
    switch (category) {
      case "services": {
        if (filter) {
          const match = services.find(
            (s) => s.name === filter || s.name.includes(filter)
          );
          return match
            ? { service: match }
            : { error: `Service "${filter}" not found. Available: ${services.map((s) => s.name).join(", ")}` };
        }
        return { services };
      }

      case "infrastructure": {
        if (filter) {
          const match = infrastructure.filter(
            (n) => n.name.includes(filter) || n.region.includes(filter) || n.az.includes(filter)
          );
          return match.length > 0
            ? { nodes: match }
            : { error: `No nodes matching "${filter}"` };
        }
        return { nodes: infrastructure };
      }

      case "incidents": {
        if (filter) {
          const match = incidents.filter(
            (i) =>
              i.id === filter ||
              i.status === filter ||
              i.severity === filter ||
              i.affectedServices.some((s) => s.includes(filter))
          );
          return match.length > 0
            ? { incidents: match }
            : { error: `No incidents matching "${filter}"` };
        }
        return { incidents };
      }

      case "deployments": {
        if (filter) {
          const match = deployments.filter(
            (d) => d.service.includes(filter) || d.status === filter || d.author === filter
          );
          return match.length > 0
            ? { deployments: match }
            : { error: `No deployments matching "${filter}"` };
        }
        return { deployments };
      }

      case "alerts": {
        if (filter) {
          const match = alertRules.filter(
            (a) => a.service.includes(filter) || a.status === filter
          );
          return match.length > 0
            ? { alerts: match }
            : { error: `No alerts matching "${filter}"` };
        }
        return { alerts: alertRules };
      }

      case "slos": {
        if (filter) {
          const match = slos.filter(
            (s) => s.service.includes(filter) || s.status === filter
          );
          return match.length > 0
            ? { slos: match }
            : { error: `No SLOs matching "${filter}"` };
        }
        return { slos };
      }

      case "databases": {
        if (filter) {
          const match = databases.filter(
            (d) => d.name.includes(filter) || d.engine.toLowerCase().includes(filter.toLowerCase())
          );
          return match.length > 0
            ? { databases: match }
            : { error: `No databases matching "${filter}"` };
        }
        return { databases };
      }

      case "environment": {
        return { environment };
      }

      case "overview": {
        const activeIncidents = incidents.filter((i) => i.status === "open");
        const firingAlerts = alertRules.filter((a) => a.status === "firing");
        const degradedServices = services.filter((s) => s.status !== "healthy");
        const breachedSlos = slos.filter((s) => s.status === "breached");

        return {
          summary: {
            totalServices: services.length,
            healthyServices: services.filter((s) => s.status === "healthy").length,
            degradedServices: degradedServices.map((s) => ({ name: s.name, status: s.status, errorRate: s.errorRate })),
            activeIncidents: activeIncidents.map((i) => ({ id: i.id, title: i.title, severity: i.severity })),
            firingAlerts: firingAlerts.map((a) => ({ name: a.name, service: a.service, condition: a.condition })),
            breachedSlos: breachedSlos.map((s) => ({ service: s.service, metric: s.metric, target: s.target, current: s.current })),
            cluster: environment.cluster,
            region: environment.region,
            nodeCount: environment.nodeCount,
            totalPods: environment.totalPods,
          },
        };
      }

      default:
        return { error: "Unknown category" };
    }
  },
});
