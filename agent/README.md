# @self-healing/agent

A production-ready Hono web server with comprehensive Datadog dynamic instrumentation for distributed tracing, performance monitoring, and observability.

## Overview

The agent package provides a fully instrumented HTTP server built with [Hono](https://hono.dev/) that integrates seamlessly with Datadog APM for observability. It comes with pre-configured routes, middleware, and services for common operations including user management, data processing, and health monitoring.

### Key Features

- **Datadog APM Integration**: Automatic distributed tracing via `dd-trace`
- **Production-Ready Architecture**: Modular design with clear separation of concerns
- **Comprehensive API**: RESTful endpoints for users, data processing, and health checks
- **Error Handling**: Centralized error handling middleware for consistent responses
- **Type-Safe**: Full TypeScript support with strict type checking
- **Custom Instrumentation**: Easy-to-use API for creating custom spans and monitoring

## Installation

```bash
npm install @self-healing/agent
# or
bun add @self-healing/agent
```

### Prerequisites

- Node.js 18+ or Bun
- TypeScript 5.3+
- Datadog Agent (optional, for APM collection)

## Quick Start

### Basic Server

```typescript
import { createApp, tracer } from '@self-healing/agent';
import { serve } from '@hono/node-server';

// Create and start the application
const app = createApp();

serve(app, ({ port, hostname }) => {
  console.log(`Server running at http://${hostname}:${port}`);
});
```

### With Custom Instrumentation

```typescript
import { createApp, tracer } from '@self-healing/agent';
import { serve } from '@hono/node-server';

const app = createApp();

// Create custom spans for monitoring
app.get('/custom', (c) => {
  const span = tracer.startSpan('custom-operation');

  try {
    span.setTag('user_id', 123);
    span.setTag('operation', 'custom-operation');

    // Your business logic here
    const result = performOperation();

    span.setTag('result', result);
    return c.json({ success: true, data: result });
  } catch (error) {
    span.setTag('error', true);
    span.setTag('error.message', String(error));
    throw error;
  } finally {
    span.finish();
  }
});

serve(app);
```

## API Routes

### Root Routes

The root path provides API information and discovery endpoints:

- **GET `/`** - Welcome message and basic API information
- **GET `/version`** - Application version information
- **GET `/info`** - Detailed application information including runtime details

### Health Check Routes

Essential for monitoring and orchestration (Kubernetes, load balancers, etc.):

- **GET `/health`** - Combined health status with liveness and readiness checks
- **GET `/health/live`** - Liveness probe (responds if server is running)
- **GET `/health/ready`** - Readiness probe (responds if server is ready to handle requests)

### User Management Routes

REST API for user CRUD operations with validation:

- **GET `/users`** - List all users
- **POST `/users`** - Create a new user
  - Body: `{ name: string, email: string, age: number }`
- **GET `/users/:id`** - Get a user by ID
- **PATCH `/users/:id`** - Update a user
- **DELETE `/users/:id`** - Delete a user

### Data Processing Routes

REST API for data CRUD operations and processing workflows:

- **GET `/data`** - List all data items
- **POST `/data`** - Create a new data item
  - Body: `{ title: string, content: string, status: 'pending' }`
- **GET `/data/:id`** - Get a data item by ID
- **PATCH `/data/:id`** - Update a data item
- **DELETE `/data/:id`** - Delete a data item
- **POST `/data/:id/process`** - Mark as processing
- **POST `/data/:id/complete`** - Mark as completed
- **POST `/data/:id/fail`** - Mark as failed

## Configuration

### Environment Variables

#### Datadog Configuration

- `DD_TRACE_ENABLED` - Enable/disable tracing (default: `true`)
- `DD_SERVICE` - Service name for Datadog (default: `agent`)
- `DD_ENV` - Environment: `development`, `staging`, or `production`
- `DD_VERSION` - Application version (default: `1.0.0`)
- `DD_AGENT_HOST` - Datadog agent host (default: `localhost`)
- `DD_AGENT_PORT` - Datadog agent port (default: `8126`)

#### Server Configuration

- `SERVER_HOST` - Server host address (default: `0.0.0.0`)
- `SERVER_PORT` - Server port (default: `3000`)
- `NODE_ENV` - Node environment: `development` or `production`

### Example Configuration

```bash
# Datadog setup
export DD_SERVICE=my-service
export DD_ENV=production
export DD_VERSION=1.0.0
export DD_AGENT_HOST=datadog-agent.local
export DD_AGENT_PORT=8126

# Server setup
export SERVER_PORT=8000
export NODE_ENV=production
```

## Modules and Exports

### Core Application

```typescript
import { createApp } from '@self-healing/agent';

const app = createApp();
// Returns a fully configured Hono application instance
```

### Tracer

```typescript
import { tracer, tracing } from '@self-healing/agent';

// Create custom spans
const span = tracer.startSpan('operation-name');
span.setTag('key', 'value');
span.finish();
```

### Configuration

```typescript
import {
  datadogConfig,
  loadDatadogConfig,
  serverConfig,
  loadServerConfig,
} from '@self-healing/agent';

const ddConfig = loadDatadogConfig();
const srvConfig = loadServerConfig();
```

### Middleware

```typescript
import {
  errorHandler,
  customTracingMiddleware,
} from '@self-healing/agent';

// Already applied to the default app, but available for custom setups
```

### Services

```typescript
import {
  userService,
  dataService,
  type User,
  type Data,
} from '@self-healing/agent';

// Use services directly for business logic
const users = userService.getAll();
const dataItems = dataService.getAll();
```

### Routes

```typescript
import {
  createRootRoutes,
  createHealthCheckRoutes,
  createUserRoutes,
  createDataRoutes,
} from '@self-healing/agent';

// Build custom apps with specific routes
const app = new Hono();
app.route('/', createRootRoutes());
app.route('/health', createHealthCheckRoutes());
```

## Development

### Build Scripts

```bash
# Type checking
npm run typecheck

# Development mode with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start
```

### Project Structure

```
agent/
├── src/
│   ├── app.ts                 # Main Hono app configuration
│   ├── index.ts               # Package exports
│   ├── tracer.ts              # Datadog tracer initialization
│   ├── config/
│   │   ├── datadog.ts         # Datadog configuration
│   │   └── server.ts          # Server configuration
│   ├── middleware/
│   │   ├── errorHandler.ts    # Error handling middleware
│   │   └── tracing.ts         # Custom tracing middleware
│   ├── routes/
│   │   ├── root.ts            # Root routes (/, /version, /info)
│   │   ├── health.ts          # Health check routes (/health/*)
│   │   ├── users.ts           # User management routes
│   │   └── data.ts            # Data processing routes
│   └── services/
│       ├── user.ts            # User business logic
│       └── data.ts            # Data processing logic
├── package.json
├── tsconfig.json
└── README.md
```

## Using with Examples

The `examples/` directory contains working examples demonstrating how to use this package:

- **basic-server** - Simple server demonstrating all available endpoints
- **custom-instrumentation** - Advanced example showing custom span creation and parent/child relationships

See the [Examples README](../examples/README.md) for detailed setup and testing instructions.

## Distributed Tracing

The agent automatically creates traces for every HTTP request through the custom tracing middleware. Each request gets a span that captures:

- Request method, path, and status code
- Response time
- Custom tags and metrics
- Parent/child span relationships

### Creating Custom Spans

```typescript
import { tracer } from '@self-healing/agent';

const parentSpan = tracer.startSpan('parent-operation');
parentSpan.setTag('key', 'value');

// Create child span
const childSpan = tracer.startSpan('child-operation', {
  childOf: parentSpan,
});

childSpan.setTag('nested_key', 'nested_value');
childSpan.finish();

parentSpan.finish();
```

### Filtering and Analysis

Tags added to spans can be used to filter and analyze traces in Datadog:

```typescript
span.setTag('user_id', 123);
span.setTag('operation_type', 'data-processing');
span.setTag('success', true);
```

## Error Handling

The agent includes centralized error handling middleware that:

- Catches all thrown errors from route handlers
- Logs errors with context
- Returns standardized error responses with appropriate HTTP status codes
- Creates error spans in Datadog for visibility

Errors are automatically captured in traces for debugging and monitoring.

## Troubleshooting

### Tracer Not Initializing

The tracer must be imported before any other modules. The default export ensures this:

```typescript
import { createApp, tracer } from '@self-healing/agent';
```

If using a custom setup, ensure:

```typescript
import './tracer'; // Import first

import { createApp } from './app';
```

### No Traces in Datadog

1. Ensure Datadog Agent is running and accessible
2. Check environment variables: `DD_AGENT_HOST` and `DD_AGENT_PORT`
3. Verify `DD_TRACE_ENABLED` is not set to `false`
4. Check application logs for tracer initialization message

### Type Errors

Ensure TypeScript version 5.3+ is installed:

```bash
npm install -D typescript@^5.3.3
```

Run type checking:

```bash
npm run typecheck
```

## Contributing

When adding new routes, services, or features:

1. Follow the existing module structure
2. Export from `src/index.ts` for public API
3. Include comprehensive JSDoc comments
4. Add TypeScript type definitions
5. Run `npm run typecheck` to ensure type safety
6. Test with the example servers

## License

Part of the Self-Healing project.
