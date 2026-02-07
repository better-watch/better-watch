# PRD: AI SRE Agent Audit Log — Better Watch

## Overview
Transform the existing personal blog application into an AI SRE Agent Audit Log viewer. The Better Watch 3D stacked-card interface is repurposed to display a chronological feed of everything an AI SRE agent does: incidents detected, root causes found, configuration changes applied, dynamic instrumentation updates, metric anomalies investigated, and resolutions enacted. Each card renders a beautiful inline SVG artifact (sparkline charts, service topology diagrams, status grids, diff views, log traces) instead of a blog post image. All other pages (home, blog, blog/[slug], PRs, PRs/[number]) are removed; the Better Watch becomes the sole full-screen experience. Data is fully mocked for demo purposes.

## Goals
- Single-page app: Better Watch audit log is the only route
- Beautiful, demo-ready visualization of AI SRE agent activity
- Each event card renders a unique, contextual SVG artifact (charts, diagrams, grids)
- Maintain the existing 3D stacked-card aesthetic and smooth 60fps animations
- Support light and dark modes with severity-aware color accents
- Fully mocked data — no backend required

## Quality Gates

These commands must pass for every user story:
- `npm run build` - Next.js production build succeeds with no errors
- `npx tsc --noEmit` - TypeScript type checking passes

## User Stories

### US-001: Remove All Pages Except Better Watch and Update Routing
**Description:** Delete all pages and routes except the Better Watch view. Remove `/app/page.tsx` (home), `/app/blog/` directory, `/app/prs/` directory, and the `/content/blog/` MDX content directory. Remove unused components: `blog-view.tsx`, `blog-list.tsx`, `pr-list.tsx`, `pr-stats.tsx`, `code-block.tsx`, `heading-link.tsx`, `image-carousel.tsx`, `toc.tsx`, `page-layout.tsx`. Remove unused lib files: `blog.ts`, `prs.ts`, `mdx.ts`. Remove `/components/pr-table.tsx`. Update `app/page.tsx` to render the Better Watch as the root route. Clean up any broken imports in remaining files.

**Priority:** P1

**Acceptance Criteria:**
- [ ] `/app/blog/` directory and all contents deleted
- [ ] `/app/prs/` directory and all contents deleted
- [ ] `/content/blog/` directory and all contents deleted
- [ ] Unused components removed: `blog-view.tsx`, `blog-list.tsx`, `pr-list.tsx`, `pr-stats.tsx`, `code-block.tsx`, `heading-link.tsx`, `image-carousel.tsx`, `toc.tsx`, `page-layout.tsx`
- [ ] Unused lib files removed: `blog.ts`, `prs.ts`, `mdx.ts`
- [ ] `/components/pr-table.tsx` removed
- [ ] `app/page.tsx` renders the Better Watch component as the root route
- [ ] No broken imports — `npm run build` succeeds
- [ ] Only the root route `/` exists, serving the Better Watch view

### US-002: Define SRE Event Types and Create Mock Dataset
**Description:** Create a comprehensive TypeScript type system for SRE audit log events in `lib/sre-events.ts`. Define an `SREEvent` type with fields: `id`, `title`, `summary`, `timestamp`, `eventType` (enum: `incident_detected`, `root_cause_found`, `config_change`, `instrumentation_update`, `metric_anomaly`, `service_topology_change`, `alert_resolved`, `deployment_detected`, `runbook_executed`), `severity` (enum: `critical`, `warning`, `info`, `success`), `service` (affected service name), `artifactType` (enum: `sparkline`, `area_chart`, `bar_chart`, `topology_diagram`, `dependency_graph`, `status_grid`, `diff_view`, `log_trace`, `timeline`), and `artifactData` (typed object with chart data points, node/edge lists, diff lines, etc.). Create a static array of 20+ mock events spanning the last 72 hours with realistic SRE scenarios. Sort by timestamp descending (newest first).

**Priority:** P1

**Acceptance Criteria:**
- [ ] `lib/sre-events.ts` exports `SREEvent` type with all specified fields
- [ ] `EventType` enum covers all 9 event types
- [ ] `Severity` enum covers: `critical`, `warning`, `info`, `success`
- [ ] `ArtifactType` enum covers all 9 artifact types
- [ ] `artifactData` is properly typed per artifact type (e.g., sparkline has `dataPoints: number[]`, topology has `nodes` and `edges`)
- [ ] Static array of at least 20 mock events exported as `mockSREEvents`
- [ ] Events span a realistic 72-hour window with varied timestamps
- [ ] Events cover diverse scenarios: API failures, latency spikes, config rollbacks, probe deployments, CPU anomalies, DNS resolution failures, deployment rollouts, runbook executions
- [ ] Events sorted by timestamp descending (newest first, index 0)

### US-003: Build SVG Metric Chart Artifact Components
**Description:** Create a set of beautiful inline SVG chart components in `app/components/artifacts/metric-charts.tsx` for rendering inside event cards. Build three chart types: (1) `SparklineChart` — a smooth bezier-curve line chart with gradient fill beneath, animated draw-on effect, and an anomaly highlight zone in red/amber. (2) `AreaChart` — a filled area chart with multiple data series, grid lines, and axis labels. (3) `BarChart` — a horizontal bar chart for comparing metrics across services (e.g., error rates per endpoint). All charts render as pure SVG, use CSS custom properties for theming (light/dark), and accept data via props. Charts should be visually stunning with gradients, subtle animations, and careful color choices.

**Priority:** P1
**Depends on:** US-002

**Acceptance Criteria:**
- [ ] `SparklineChart` component renders a smooth bezier SVG path from `dataPoints: number[]`
- [ ] Sparkline has a gradient fill beneath the line (e.g., orange-to-transparent or severity-colored)
- [ ] Sparkline supports an optional `anomalyRange: [startIndex, endIndex]` that highlights a zone with a red/amber overlay
- [ ] `AreaChart` component renders a filled area with grid lines and axis tick labels
- [ ] `BarChart` component renders horizontal bars with labels and value indicators
- [ ] All charts are pure SVG — no external charting library dependencies
- [ ] Charts adapt to container size via `viewBox` and `preserveAspectRatio`
- [ ] Charts respect dark mode via CSS custom properties or props
- [ ] Charts render without layout shift at card dimensions (~768px wide, ~300px tall)

### US-004: Build SVG Architecture Diagram Artifact Components
**Description:** Create SVG diagram components in `app/components/artifacts/architecture-diagrams.tsx` for visualizing service relationships. Build two components: (1) `TopologyDiagram` — renders a service mesh / network topology with circular nodes (services) connected by edges (dependencies), with status coloring per node (green=healthy, red=failing, amber=degraded) and animated pulse on the failing node. (2) `DependencyGraph` — renders a directed acyclic graph showing a call chain from entry point to root cause, with each node showing service name and latency, and the critical path highlighted in red. Nodes use clean rounded-rect shapes with subtle drop shadows. Edges use smooth bezier curves with optional arrowheads.

**Priority:** P1
**Depends on:** US-002

**Acceptance Criteria:**
- [ ] `TopologyDiagram` component renders circular nodes and connecting edges from `nodes` and `edges` data
- [ ] Each node displays a service name label and has status-based fill color (green/red/amber/gray)
- [ ] Failing nodes have a pulsing red ring animation via SVG `<animate>` or CSS
- [ ] Edges render as smooth bezier curves between node centers
- [ ] `DependencyGraph` component renders a left-to-right DAG with rounded-rect nodes
- [ ] Each node shows service name and latency value (e.g., "api-gateway — 12ms")
- [ ] The critical path (root cause chain) is highlighted with a red/orange stroke
- [ ] Both components use automatic layout positioning (no hardcoded coordinates) based on node count
- [ ] Both render as pure SVG and respect light/dark mode

### US-005: Build Status Grid, Diff View, and Log Trace Artifact Components
**Description:** Create three more artifact components in `app/components/artifacts/detail-artifacts.tsx`: (1) `StatusGrid` — a grid of colored cells representing service/endpoint health (green=up, red=down, amber=slow, gray=unknown), similar to a GitHub contribution graph but for uptime. (2) `DiffView` — a side-by-side or unified config diff visualization with added lines in green, removed lines in red, and context lines in gray, rendered as styled SVG text. (3) `LogTrace` — a stylized log output showing timestamped trace entries with color-coded log levels (ERROR=red, WARN=amber, INFO=blue, DEBUG=gray), truncated to fit card height. Each component should be visually polished and render as pure SVG or a mix of SVG and styled HTML within the card's artifact area.

**Priority:** P1
**Depends on:** US-002

**Acceptance Criteria:**
- [ ] `StatusGrid` renders a grid of at least 8x6 colored cells with rounded corners and 2px gaps
- [ ] Cell colors map to health status: green (#22c55e), red (#ef4444), amber (#f59e0b), gray (#6b7280)
- [ ] Grid has row labels (service names) and column labels (time buckets like "6h ago", "5h ago", etc.)
- [ ] `DiffView` renders config text with line-level coloring: green background for additions, red for removals
- [ ] Diff shows line numbers and `+`/`-` prefixes
- [ ] `LogTrace` renders 8-12 log lines with timestamps, log levels, and messages
- [ ] Log levels are color-coded: ERROR (#ef4444), WARN (#f59e0b), INFO (#3b82f6), DEBUG (#6b7280)
- [ ] All three components respect dark mode theming
- [ ] All three render cleanly within the card artifact area without overflow

### US-006: Redesign Event Card for SRE Audit Log
**Description:** Replace the blog-style `PostCard` section inside `time-machine.tsx` with a new SRE event card layout. The top 60% of the card renders the contextual artifact (chart, diagram, grid, diff, or trace) based on `event.artifactType`. The bottom 40% shows: an event type badge (colored pill with icon and label, e.g., "Incident Detected" in red), the event title in large text, a one-line summary, severity indicator (colored dot + label), affected service name as a subtle tag, and the relative timestamp (e.g., "2h ago"). Use Lucide icons for event type badges. The card background should have a subtle top-border or left-border accent in the severity color.

**Priority:** P1
**Depends on:** US-003, US-004, US-005

**Acceptance Criteria:**
- [ ] Card top section (60% height) renders the correct artifact component based on `event.artifactType`
- [ ] An `ArtifactRenderer` component maps `artifactType` to the correct chart/diagram/grid component and passes `artifactData`
- [ ] Card bottom section (40%) displays: event type badge, title, summary, severity, service, timestamp
- [ ] Event type badge is a colored pill with a Lucide icon and label text (e.g., AlertTriangle for incidents)
- [ ] Title renders in large, readable text (text-xl or text-2xl)
- [ ] Summary renders as a single line of muted text, truncated with ellipsis
- [ ] Severity shown as a colored dot (critical=red, warning=amber, info=blue, success=green) with label
- [ ] Service name displayed as a subtle monospace tag/chip
- [ ] Timestamp shown as relative time (e.g., "2h ago", "15m ago")
- [ ] Card has a severity-colored top border (3px) for visual hierarchy

### US-007: Update Better Watch Component for SRE Events
**Description:** Refactor `app/components/time-machine.tsx` to accept `SREEvent[]` instead of `Post[]`. Update the root page (`app/page.tsx`) to import `mockSREEvents` from `lib/sre-events.ts` and pass them to the Better Watch. Remove the `Link` wrapper around cards (events don't navigate to blog posts). Keep all existing 3D stack animations, scroll/keyboard navigation, and timeline scrubber logic intact. Update the empty state message to "No events recorded." Ensure the component renders correctly with the new event card layout from US-006.

**Priority:** P1
**Depends on:** US-006

**Acceptance Criteria:**
- [ ] `TimeMachine` component accepts `events: SREEvent[]` instead of `posts: Post[]`
- [ ] `app/page.tsx` imports `mockSREEvents` and passes them to `<TimeMachine events={mockSREEvents} />`
- [ ] Blog post `Link` wrappers removed from card rendering
- [ ] 3D stack animations (spring physics, perspective, z-depth, scale, opacity) remain unchanged
- [ ] Scroll wheel navigation works identically to before
- [ ] Keyboard navigation (arrow keys) works identically to before
- [ ] Timeline scrubber uses `event.timestamp` instead of `post.date`
- [ ] Empty state shows "No events recorded."
- [ ] Cards render with the new SRE event card layout (artifact + metadata)

### US-008: Update Timeline with Event-Type Color Coding
**Description:** Enhance the timeline scrubber on the right side to visually encode event types and severity. Each tick mark on the timeline should be colored by severity (red for critical, amber for warning, blue for info, green for success) instead of the uniform orange. The active event's tick should be larger and show a subtle glow. The floating date label should also show the event type icon alongside the timestamp. Add small severity-colored dots along the timeline track to give an at-a-glance view of the severity distribution. Keep all existing drag/click/scrub interactions.

**Priority:** P2
**Depends on:** US-007

**Acceptance Criteria:**
- [ ] Timeline tick marks are colored by event severity: critical (#ef4444), warning (#f59e0b), info (#3b82f6), success (#22c55e)
- [ ] Active event tick is wider (40px vs 20px) and has a subtle glow/shadow in its severity color
- [ ] Floating date label shows both the timestamp and a small event type label (e.g., "2:15 PM — Incident")
- [ ] Timeline track has small colored dots at each event position for severity-at-a-glance
- [ ] All existing timeline interactions preserved: click to jump, drag to scrub, scroll to navigate
- [ ] Timeline renders correctly in both light and dark modes

### US-009: Update Header and App Branding
**Description:** Update the site header to reflect the AI SRE Agent identity. Change the site name from "summersmuir" to "SRE Agent" or similar. Remove all navigation links (Home, Blog, PRs) since there's only one page. Add a subtle status indicator in the header showing "Agent Active" with a pulsing green dot. Update the page metadata (title, description) in `layout.tsx` to reflect the new purpose. Keep the theme toggle. Optionally add a small agent activity counter (e.g., "23 events in last 72h").

**Priority:** P2
**Depends on:** US-001

**Acceptance Criteria:**
- [ ] Header brand text changed from "summersmuir" to "SRE Agent" (or similar AI SRE branding)
- [ ] All navigation links removed (Home, Blog, PRs) — only brand name and theme toggle remain
- [ ] A "Agent Active" status indicator with pulsing green dot added to the header
- [ ] Page title updated to "AI SRE Agent — Audit Log" in layout.tsx metadata
- [ ] Page description updated to reflect the audit log purpose
- [ ] Theme toggle remains functional
- [ ] Header remains fixed at top with backdrop blur
- [ ] Optional: event count badge showing total events in the current time window

### US-010: Add Event Detail Expansion Panel
**Description:** When the user clicks the active (foreground) event card, expand it into a detail panel that overlays the stack. The detail panel shows: full-size artifact rendering, complete event title and description, all metadata (event type, severity, service, timestamp), a "Related Events" section listing 2-3 related events by service or time proximity, and a mock "Agent Reasoning" section showing a few lines of the agent's thought process. The panel slides up from the card with a Framer Motion animation. Clicking outside or pressing Escape closes it. The background cards blur and dim.

**Priority:** P2
**Depends on:** US-007

**Acceptance Criteria:**
- [ ] Clicking the active card opens a detail expansion panel with a slide-up animation
- [ ] Detail panel shows the artifact at larger size (full width of panel)
- [ ] Panel displays complete title, full summary text (not truncated), and all metadata
- [ ] "Related Events" section shows 2-3 events from the same service or within 1 hour
- [ ] "Agent Reasoning" section displays 3-5 lines of mock agent thought process text
- [ ] Clicking outside the panel or pressing Escape closes it with a slide-down animation
- [ ] Background cards blur (filter: blur(8px)) and dim (opacity: 0.3) while panel is open
- [ ] Panel respects dark mode styling

### US-011: Add Severity-Based Visual Styling and Color System
**Description:** Implement a cohesive severity-aware color system across the entire application. Critical events should feel urgent (red accents, subtle red tint on card background), warning events should feel cautionary (amber accents), info events should feel neutral (blue accents), and success events should feel resolved (green accents). Apply severity colors to: card top-border, artifact background tint, event type badge, timeline ticks, and the detail panel header. Ensure sufficient contrast in both light and dark modes. Add subtle gradient backgrounds on cards that shift based on severity.

**Priority:** P2
**Depends on:** US-006, US-008

**Acceptance Criteria:**
- [ ] Severity color palette defined as CSS custom properties: `--severity-critical` (#ef4444), `--severity-warning` (#f59e0b), `--severity-info` (#3b82f6), `--severity-success` (#22c55e)
- [ ] Card top-border (3px) uses severity color
- [ ] Card background has a very subtle severity-tinted gradient (e.g., critical gets a faint red-to-transparent)
- [ ] Event type badges use severity-appropriate background colors
- [ ] All severity colors maintain WCAG AA contrast ratios against both light and dark backgrounds
- [ ] Cards with critical severity have a slightly stronger shadow or glow effect
- [ ] Visual hierarchy is clear: critical events stand out more than info events at a glance

### US-012: Add Entrance Animations, Micro-Interactions, and Final Polish
**Description:** Add page-load entrance animations: the card stack fades in from below, the timeline fades in from the right, and the header fades in from above with staggered timing. Add micro-interactions: artifact charts animate their data on card entrance (sparklines draw, bars grow, nodes fade in), severity dots pulse briefly on the active event. Add a subtle particle/dot grid background pattern to the page for visual depth. Ensure all animations are smooth (60fps), all visual elements are pixel-perfect, and the overall experience feels premium and polished. Remove any remaining blog-related code, comments, or references.

**Priority:** P3
**Depends on:** US-007, US-008, US-011

**Acceptance Criteria:**
- [ ] Card stack fades in from `translateY(60px)` and `opacity(0)` over 0.8s on page load
- [ ] Timeline fades in from `translateX(30px)` and `opacity(0)` with 0.3s delay
- [ ] Header elements stagger in with 0.1s delays between brand, status, and toggle
- [ ] Sparkline charts animate a draw-on effect when their card becomes active
- [ ] Bar charts animate bar growth when their card becomes active
- [ ] Topology/dependency diagram nodes fade in sequentially (50ms stagger)
- [ ] Active event severity dot pulses once on card change
- [ ] Subtle dot-grid or noise texture background pattern added to page for depth
- [ ] No remaining blog-related code, variable names, comments, or references anywhere
- [ ] All animations maintain 60fps on modern hardware
- [ ] `npm run build` produces zero errors and zero warnings

## Functional Requirements
- FR-1: The application renders a 3D stacked card layout displaying SRE agent audit events
- FR-2: Each event card renders a contextual SVG artifact (chart, diagram, grid, diff, or trace)
- FR-3: The vertical timeline maps event timestamps to positions and color-codes by severity
- FR-4: Dragging/clicking the timeline scrubs through events in real-time
- FR-5: Mouse wheel scrolling and keyboard arrows navigate between events
- FR-6: Clicking the active event opens a detail expansion panel with full information
- FR-7: Dark mode toggles without page reload and persists preference
- FR-8: All data is mocked — no external API calls or database queries

## Non-Goals (Out of Scope)
- Real backend or API integration (static mock data only)
- Real-time event streaming or WebSocket connections
- User authentication or role-based access
- Event filtering, search, or advanced querying
- Mobile-specific layout (desktop-first demo)
- Editing or acknowledging events
- Integration with actual monitoring tools (Datadog, PagerDuty, etc.)

## Technical Considerations
- Next.js 16+ App Router with client components for interactive elements
- Framer Motion 12+ for all animations and gesture handling
- Pure inline SVG for all artifact visualizations (no D3.js or Recharts dependency)
- SVG `viewBox` and `preserveAspectRatio` for responsive artifact scaling
- CSS custom properties for severity color theming across light/dark modes
- `will-change: transform` used sparingly on animated card wrappers
- SVG `<animate>` or CSS `@keyframes` for chart draw-on and pulse effects
- Relative time formatting via simple utility function (no date-fns dependency)

## Success Metrics
- Build completes with zero TypeScript errors and zero warnings
- All 12 user stories pass acceptance criteria
- Lighthouse performance score >= 90 on desktop
- Animations maintain 60fps as measured by Chrome DevTools performance panel
- SVG artifacts render without layout shift or visual glitches
- Better Watch navigation (scroll, keyboard, timeline drag) feels identical to the original blog version
