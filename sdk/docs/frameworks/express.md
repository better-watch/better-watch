# Express Integration

Integrate TraceInject into your Express application.

## Installation

```bash
npm install @trace-inject/express
npm install express
```

## Basic Setup

Add TraceInject middleware to your Express app:

```typescript
import express from 'express'
import { traceInjectMiddleware } from '@trace-inject/express'

const app = express()

// Add TraceInject middleware
app.use(traceInjectMiddleware({
  configPath: './tracepoint-config.json'
}))

app.get('/users/:id', (req, res) => {
  const id = req.params.id
  res.json({ id })
})

app.listen(3000)
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
  captureResponse: true,
  captureBody: true
})
```

## Full Example

Complete Express application with TraceInject:

```typescript
import express from 'express'
import { traceInjectMiddleware } from '@trace-inject/express'

const app = express()

app.use(express.json())

app.use(traceInjectMiddleware({
  configPath: './tracepoint-config.json',
  include: ['/api/*'],
  exclude: ['/health']
}))

// Health check (not traced)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// API endpoints (traced)
app.get('/api/users/:id', (req, res) => {
  const id = req.params.id
  const user = getUserById(id)
  res.json(user)
})

app.post('/api/users', (req, res) => {
  const user = createUser(req.body)
  res.status(201).json(user)
})

app.delete('/api/users/:id', (req, res) => {
  const id = req.params.id
  deleteUser(id)
  res.status(204).send('')
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
})
```

## Middleware Order

Place TraceInject after other middleware:

```typescript
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// TraceInject after basic middleware
app.use(traceInjectMiddleware({
  configPath: './tracepoint-config.json'
}))

// Routes and other middleware after TraceInject
app.get('/api/users', handler)
```

## Error Handling

Trace errors with proper handling:

```typescript
app.use(traceInjectMiddleware({
  configPath: './tracepoint-config.json'
}))

app.get('/api/data', (req, res) => {
  try {
    const data = getData()
    // Tracepoint captures data
    res.json(data)
  } catch (err) {
    // Error is traced
    res.status(500).json({ error: err.message })
  }
})

app.use((err, req, res, next) => {
  // Global error handler
  console.error('Error:', err)
  res.status(500).json({ error: err.message })
})
```

## Authentication

Trace authentication:

```typescript
import { traceInjectMiddleware } from '@trace-inject/express'

app.use(traceInjectMiddleware({
  configPath: './tracepoint-config.json'
}))

app.use((req, res, next) => {
  const token = req.headers.authorization
  const user = verifyToken(token)
  // Tracepoint captures user identity
  req.user = user
  next()
})

app.get('/api/profile', (req, res) => {
  res.json(req.user)
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

## Database Operations

Trace database queries:

```typescript
import { db } from './db'

app.use(traceInjectMiddleware({
  configPath: './tracepoint-config.json'
}))

app.get('/api/posts', async (req, res) => {
  const posts = await db.query('SELECT * FROM posts')
  // Tracepoint captures posts
  res.json(posts)
})

app.post('/api/posts', async (req, res) => {
  const post = await db.insert('posts', req.body)
  res.status(201).json(post)
})
```

Configuration:
```json
{
  "tracepoints": [
    {
      "filePath": "src/routes/*.ts",
      "lineNumber": 5,
      "variables": ["posts"]
    }
  ]
}
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

app.use(traceInjectMiddleware(traceConfig))
```

## Router Integration

Apply tracing to specific routers:

```typescript
import express from 'express'
import { traceInjectMiddleware } from '@trace-inject/express'

const app = express()
const apiRouter = express.Router()

// Apply tracing to API router
apiRouter.use(traceInjectMiddleware({
  configPath: './tracepoint-config.json'
}))

apiRouter.get('/users', (req, res) => {
  res.json([])
})

app.use('/api', apiRouter)

// Untraced routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})
```

## Remote Configuration

Update tracepoints dynamically:

```typescript
app.use(traceInjectMiddleware({
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
app.use(traceInjectMiddleware({
  configPath: './tracepoint-config.json',
  environment: 'production',
  include: ['/api/*'],
  exclude: ['/health', '/status'],
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

## Logging Integration

Combine with logging middleware:

```typescript
import { traceInjectMiddleware } from '@trace-inject/express'
import morgan from 'morgan'

app.use(morgan('combined'))
app.use(traceInjectMiddleware({
  configPath: './tracepoint-config.json'
}))
```

## TypeScript Support

Full TypeScript support:

```typescript
import express, { Request, Response, NextFunction } from 'express'
import { traceInjectMiddleware } from '@trace-inject/express'

interface AuthRequest extends Request {
  user?: { id: string; email: string }
}

const app = express()

app.use(traceInjectMiddleware({
  configPath: './tracepoint-config.json'
}))

app.get('/api/me', (req: AuthRequest, res: Response) => {
  res.json(req.user)
})

app.listen(3000)
```

## Testing

Disable tracing in tests:

```typescript
import request from 'supertest'

const testApp = express()
testApp.use(express.json())

// Disable tracing for tests
testApp.use(traceInjectMiddleware({
  enabled: false
}))

testApp.get('/test', (req, res) => {
  res.json({ test: true })
})

describe('API', () => {
  it('should work without tracing', async () => {
    const res = await request(testApp)
      .get('/test')
      .expect(200)

    expect(res.body.test).toBe(true)
  })
})
```

## Troubleshooting

### Middleware not applied

Verify middleware is added before routes:

```typescript
// ✓ Correct
app.use(traceInjectMiddleware({ ... }))
app.get('/api/users', handler)

// ✗ Wrong
app.get('/api/users', handler)
app.use(traceInjectMiddleware({ ... }))
```

### Configuration not found

Check path is relative to project root:

```typescript
configPath: './tracepoint-config.json'
```

### Performance impact

1. Use `sampleRate` to reduce overhead
2. Narrow down `include` paths
3. Disable in development
4. Reduce capture limits

## Best Practices

1. **Place after basic middleware** - After express.json() and similar
2. **Exclude health checks** - Skip `/health` endpoints
3. **Use sampleRate** - Don't trace every request
4. **Enable redaction** - Protect sensitive data
5. **Test configuration** - Verify in staging
6. **Monitor overhead** - Track performance impact
