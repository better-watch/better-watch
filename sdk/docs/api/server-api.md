# Server API

API for the trace collection HTTP server.

## Overview

The Server module provides HTTP endpoints for collecting and querying trace data.

## Basic Usage

```typescript
import { TraceServer } from '@trace-inject/core/server'

const server = new TraceServer()
await server.start({ port: 3000 })
```

## TraceServer Class

### Constructor

```typescript
const server = new TraceServer(options?: ServerOptions)
```

Options:
```typescript
interface ServerOptions {
  port?: number              // Default: 3000
  host?: string             // Default: 'localhost'
  basePath?: string         // Default: '/api'
  storage?: StorageBackend  // Default: memory
  rateLimit?: RateLimitConfig
}
```

### Methods

#### start(options) - starts the server

Start the server.

```typescript
await server.start({
  port: 3000,
  host: 'localhost'
})

console.log('Server started on port 3000')
```

#### stop() - stops the server

Stop the server.

```typescript
await server.stop()
```

#### getApp() - returns Express application

Get the underlying Express application.

```typescript
const app = server.getApp()
app.use(customMiddleware)
```

#### submitTrace(trace) - submits trace data

Submit a trace programmatically.

```typescript
await server.submitTrace({
  id: 'trace-1',
  timestamp: Date.now(),
  label: 'userCreated',
  variables: { user: { id: 1, name: 'Alice' } }
})
```

#### queryTraces(options) - returns array of `TraceData`

Query stored traces.

```typescript
const traces = await server.queryTraces({
  label: 'userCreated',
  limit: 100,
  offset: 0
})
```

#### getMetrics() - returns `ServerMetrics`

Get server metrics.

```typescript
const metrics = server.getMetrics()
console.log(metrics.totalTraces)
console.log(metrics.tracesPerSecond)
```

#### clearTraces() - clears all traces

Clear all stored traces.

```typescript
await server.clearTraces()
```

## HTTP Endpoints

### POST /api/traces

Submit trace data.

Request:
```json
{
  "id": "trace-1",
  "timestamp": 1234567890,
  "label": "userCreated",
  "variables": {
    "user": { "id": 1, "name": "Alice" }
  }
}
```

Response:
```json
{
  "success": true,
  "traceId": "trace-1"
}
```

### GET /api/traces

Query traces with filters.

Query parameters:
```
GET /api/traces?label=userCreated&limit=10&offset=0
```

Response:
```json
{
  "total": 100,
  "limit": 10,
  "offset": 0,
  "traces": [
    {
      "id": "trace-1",
      "timestamp": 1234567890,
      "label": "userCreated",
      "variables": { ... }
    }
  ]
}
```

### GET /api/traces/:id

Get a specific trace.

Response:
```json
{
  "id": "trace-1",
  "timestamp": 1234567890,
  "label": "userCreated",
  "variables": { ... }
}
```

### DELETE /api/traces/:id

Delete a specific trace.

Response:
```json
{
  "success": true,
  "deleted": true
}
```

### GET /api/metrics

Get server metrics.

Response:
```json
{
  "totalTraces": 1234,
  "tracesPerSecond": 12.5,
  "uptime": 3600,
  "storage": {
    "type": "memory",
    "used": 1048576
  }
}
```

## Storage Backends

### Memory Storage

```typescript
const server = new TraceServer({
  storage: 'memory'
})
```

Characteristics:
- Fast, in-process storage
- Data lost on restart
- Good for development

### File Storage

```typescript
const server = new TraceServer({
  storage: new FileStorage({ path: './traces' })
})
```

### Database Storage

```typescript
import { DatabaseStorage } from '@trace-inject/core/storage'

const server = new TraceServer({
  storage: new DatabaseStorage({
    connection: 'postgresql://localhost/traces'
  })
})
```

## Rate Limiting

```typescript
const server = new TraceServer({
  rateLimit: {
    enabled: true,
    maxRequests: 1000,
    windowMs: 60000  // 1 minute
  }
})
```

## Authentication

```typescript
const server = new TraceServer({
  auth: {
    enabled: true,
    apiKey: 'your-secret-key'
  }
})
```

All requests must include:
```
Authorization: Bearer your-secret-key
```

## Custom Middleware

```typescript
const server = new TraceServer()
const app = server.getApp()

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

await server.start({ port: 3000 })
```

## Examples

### Basic Server

```typescript
import { TraceServer } from '@trace-inject/core/server'

const server = new TraceServer({
  port: 3000,
  storage: 'memory'
})

await server.start()

// Submit traces
await server.submitTrace({
  id: '1',
  timestamp: Date.now(),
  label: 'test',
  variables: { data: 'value' }
})

// Query traces
const traces = await server.queryTraces({ label: 'test' })
console.log(traces)
```

### With Express Integration

```typescript
import express from 'express'
import { TraceServer } from '@trace-inject/core/server'

const app = express()
const traceServer = new TraceServer()

app.use(express.json())
app.use('/traces', traceServer.getApp())

app.listen(3000, () => {
  traceServer.start()
  console.log('Server running on port 3000')
})
```

### With Client Integration

```typescript
// In browser or Node.js client
async function sendTrace(data) {
  const response = await fetch('/api/traces', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(data)
  })

  return response.json()
}

// Submit a trace
await sendTrace({
  label: 'userAction',
  variables: { userId: 123, action: 'login' }
})
```

### With Configuration

```typescript
import { TraceServer } from '@trace-inject/core/server'
import { Config } from '@trace-inject/core/config'

const config = await Config.load('./config.json')
const serverConfig = config.server || {}

const server = new TraceServer({
  port: serverConfig.port || 3000,
  storage: serverConfig.storage || 'memory',
  rateLimit: serverConfig.rateLimit
})

await server.start()
```

## Metrics & Monitoring

```typescript
const server = new TraceServer()

// Start server
await server.start()

// Get metrics periodically
setInterval(() => {
  const metrics = server.getMetrics()
  console.log(`Traces: ${metrics.totalTraces}`)
  console.log(`Rate: ${metrics.tracesPerSecond}/s`)
  console.log(`Uptime: ${metrics.uptime}s`)
}, 10000)
```

## Error Handling

```typescript
try {
  await server.start({ port: 3000 })
} catch (error) {
  if (error instanceof ServerError) {
    console.error('Server error:', error.message)
  }
}
```

## Testing

```typescript
describe('TraceServer', () => {
  let server: TraceServer

  beforeEach(async () => {
    server = new TraceServer({ port: 0 }) // Use random port
    await server.start()
  })

  afterEach(async () => {
    await server.stop()
  })

  it('accepts traces', async () => {
    const trace = {
      id: 'test-1',
      timestamp: Date.now(),
      label: 'test',
      variables: { x: 1 }
    }

    await server.submitTrace(trace)

    const traces = await server.queryTraces({ label: 'test' })
    expect(traces).toHaveLength(1)
  })

  it('queries traces by label', async () => {
    await server.submitTrace({
      id: '1',
      timestamp: Date.now(),
      label: 'login',
      variables: {}
    })

    const traces = await server.queryTraces({ label: 'login' })
    expect(traces[0].label).toBe('login')
  })
})
```

## Deployment

### Docker

```dockerfile
FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

ENV TRACE_SERVER_PORT=3000
ENV TRACE_SERVER_STORAGE=file

EXPOSE 3000

CMD ["npm", "start"]
```

### Environment Variables

```bash
TRACE_SERVER_PORT=3000
TRACE_SERVER_HOST=0.0.0.0
TRACE_SERVER_STORAGE=database
TRACE_SERVER_DB_URL=postgresql://localhost/traces
TRACE_SERVER_AUTH_ENABLED=true
TRACE_SERVER_API_KEY=secret
```

## Performance Considerations

1. **Use appropriate storage** - Memory for dev, database for production
2. **Enable rate limiting** - Prevent abuse
3. **Monitor metrics** - Track usage patterns
4. **Archive old traces** - Prevent unlimited growth
5. **Use pagination** - Query with limits and offsets

## Troubleshooting

### Port Already in Use

```typescript
const server = new TraceServer({ port: 3001 }) // Use different port
```

### Storage Errors

Verify storage configuration:
```typescript
const server = new TraceServer({
  storage: new FileStorage({
    path: './traces' // Ensure directory exists and is writable
  })
})
```

### High Memory Usage

Use persistent storage:
```typescript
const server = new TraceServer({
  storage: new DatabaseStorage({ ... })
})
```
