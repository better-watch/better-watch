# Hono Integration

Integrate TraceInject into your Hono application.

## Installation

```bash
npm install @trace-inject/hono
npm install hono
```

## Basic Setup

Add TraceInject middleware to your Hono app:

```typescript
import { Hono } from 'hono'
import { traceInjectMiddleware } from '@trace-inject/hono'

const app = new Hono()

// Add TraceInject middleware
app.use('*', traceInjectMiddleware({
  configPath: './tracepoint-config.json'
}))

app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id })
})

export default app
```

## Configuration Options

```typescript
traceInjectMiddleware({
  // Path to configuration file
  configPath: './tracepoint-config.json',

  // Enable/disable tracing
  enabled: true,

  // Environment
  environment: 'production',

  // Include only certain paths
  include: ['/api/*', '/graphql'],

  // Exclude certain paths
  exclude: ['/health', '/status'],

  // Remote configuration
  remoteConfig: {
    enabled: false,
    endpoint: 'https://config.example.com/api/config'
  },

  // Capture request/response
  captureRequest: true,
  captureResponse: true
})
```

## Full Example

Complete Hono application with TraceInject:

```typescript
import { Hono } from 'hono'
import { traceInjectMiddleware } from '@trace-inject/hono'

const app = new Hono()

app.use('*', traceInjectMiddleware({
  configPath: './tracepoint-config.json',
  include: ['/api/*'],
  exclude: ['/health']
}))

// Health check (not traced)
app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

// API endpoints (traced)
app.get('/api/users/:id', (c) => {
  const id = c.req.param('id')
  const user = getUserById(id)
  return c.json(user)
})

app.post('/api/users', (c) => {
  const body = c.req.json()
  const user = createUser(body)
  return c.json(user, 201)
})

app.delete('/api/users/:id', (c) => {
  const id = c.req.param('id')
  deleteUser(id)
  return c.status(204).text('')
})

export default app
```

## Cloudflare Workers

TraceInject works great with Cloudflare Workers:

```typescript
import { Hono } from 'hono'
import { traceInjectMiddleware } from '@trace-inject/hono'

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.use('*', traceInjectMiddleware({
  configPath: './tracepoint-config.json',
  environment: 'production'
}))

app.get('/api/data', async (c) => {
  const data = await c.env.KV.get('data')
  return c.json({ data })
})

export default app
```

## Selective Middleware

Apply tracing only to specific routes:

```typescript
import { Hono } from 'hono'
import { traceInjectMiddleware } from '@trace-inject/hono'

const app = new Hono()

// Create a traced sub-app for API routes
const api = new Hono()
api.use('*', traceInjectMiddleware({
  configPath: './tracepoint-config.json'
}))

api.get('/users', (c) => {
  return c.json([{ id: 1, name: 'Alice' }])
})

app.route('/api', api)

// Untraced health checks
app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

export default app
```

## Environment-Specific

```typescript
const isProduction = process.env.NODE_ENV === 'production'

const traceConfig = isProduction ? {
  configPath: './tracepoint-config.prod.json',
  enabled: true,
  environment: 'production'
} : {
  configPath: './tracepoint-config.dev.json',
  enabled: false
}

app.use('*', traceInjectMiddleware(traceConfig))
```

## Database Operations

Trace database queries:

```typescript
import { Hono } from 'hono'
import { traceInjectMiddleware } from '@trace-inject/hono'
import { db } from './db'

const app = new Hono()
app.use('*', traceInjectMiddleware({
  configPath: './tracepoint-config.json'
}))

app.get('/api/posts', async (c) => {
  const posts = await db.query('SELECT * FROM posts')
  // Tracepoint captures posts array
  return c.json(posts)
})
```

Configuration:
```json
{
  "tracepoints": [
    {
      "filePath": "src/routes/*.ts",
      "lineNumber": 10,
      "variables": ["posts", "posts.length"]
    }
  ]
}
```

## Authentication & Authorization

Trace auth operations:

```typescript
app.use('/api/*', traceInjectMiddleware({
  configPath: './tracepoint-config.json',
  captureRequest: true
}))

app.use('/api/*', async (c, next) => {
  const token = c.req.header('Authorization')
  const user = await verifyToken(token)
  // Tracepoint captures user identity
  c.set('user', user)
  await next()
})
```

With redaction:
```json
{
  "redaction": {
    "enabled": true,
    "sensitiveFields": ["password", "token", "Authorization"]
  }
}
```

## Error Handling

Trace errors:

```typescript
app.onError((err, c) => {
  // Tracepoint captures error context
  console.error('Error:', err)
  return c.json(
    { error: err.message },
    500
  )
})
```

## Remote Configuration

Update tracepoints dynamically:

```typescript
app.use('*', traceInjectMiddleware({
  configPath: './tracepoint-config.json',
  remoteConfig: {
    enabled: process.env.NODE_ENV === 'production',
    endpoint: process.env.TRACE_CONFIG_ENDPOINT,
    apiKey: process.env.TRACE_API_KEY,
    refreshInterval: 60000
  }
}))
```

## Performance Optimization

For production:

```typescript
app.use('/api/*', traceInjectMiddleware({
  configPath: './tracepoint-config.json',
  environment: 'production',
  capture: {
    maxObjectDepth: 3,
    maxArrayLength: 50,
    sampleRate: 0.1 // Sample 10% of requests
  },
  redaction: {
    enabled: true
  }
}))
```

## Testing

Test with tracing disabled:

```typescript
import { traceInjectMiddleware } from '@trace-inject/hono'

const app = new Hono()

// Disable tracing in tests
if (process.env.NODE_ENV === 'test') {
  app.use('*', traceInjectMiddleware({
    enabled: false
  }))
}
```

## Logging Integration

Combine with logging:

```typescript
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { traceInjectMiddleware } from '@trace-inject/hono'

const app = new Hono()

app.use('*', logger())
app.use('*', traceInjectMiddleware({
  configPath: './tracepoint-config.json'
}))
```

## Troubleshooting

### Middleware not applied

Verify middleware is added before routes:

```typescript
// ✓ Correct
app.use('*', traceInjectMiddleware({ ... }))
app.get('/api/users', handler)

// ✗ Wrong
app.get('/api/users', handler)
app.use('*', traceInjectMiddleware({ ... }))
```

### Configuration not loaded

Check configuration file path:

```typescript
// Make sure path is relative to project root
configPath: './tracepoint-config.json'
```

### Performance impact

1. Use `sampleRate` to reduce overhead
2. Narrow down `include` paths
3. Exclude health checks and static files
4. Reduce capture limits

## Best Practices

1. **Exclude health checks** - Skip tracing `/health` endpoints
2. **Use sampleRate** - Don't trace every request in production
3. **Enable redaction** - Protect sensitive data
4. **Test configuration** - Verify in staging first
5. **Monitor impact** - Track performance overhead
