# Remix Integration

Integrate TraceInject into your Remix application.

## Installation

```bash
npm install @trace-inject/remix
npm install -D @trace-inject/core
```

## Setup

Add TraceInject to your `remix.config.js`:

```javascript
const withTraceInject = require('@trace-inject/remix')

module.exports = withTraceInject(
  {
    configPath: './tracepoint-config.json'
  },
  {
    appDirectory: 'app',
    assetsBuildDirectory: 'public/build',
    publicPath: '/build/',
    serverBuildPath: 'server/build/index.js'
  }
)
```

## Full Configuration

```javascript
const withTraceInject = require('@trace-inject/remix')

module.exports = withTraceInject(
  {
    configPath: './tracepoint-config.json',
    enabled: true,
    environment: process.env.NODE_ENV,
    serverOnly: true,
    remoteConfig: {
      enabled: process.env.NODE_ENV === 'production',
      endpoint: process.env.TRACE_CONFIG_ENDPOINT
    }
  },
  {
    appDirectory: 'app',
    assetsBuildDirectory: 'public/build',
    publicPath: '/build/',
    serverBuildPath: 'server/build/index.js',
    devServerPort: 8002
  }
)
```

## Server-Only Instrumentation

Instrument only server-side code:

```javascript
module.exports = withTraceInject({
  configPath: './tracepoint-config.json',
  serverOnly: true
})
```

This is recommended because:
- Reduces client bundle size
- Avoids exposing sensitive data to clients
- Improves performance

## Loader Functions

Instrument your loaders:

`app/routes/users.$id.tsx`:
```typescript
import { json, type LoaderFunctionArgs } from '@remix-run/node'

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params
  // Tracepoint captures id and user
  const user = await db.user.findUnique({ where: { id } })
  return json(user)
}

export default function User() {
  const user = useLoaderData()
  return <div>{user.name}</div>
}
```

Configuration:
```json
{
  "tracepoints": [
    {
      "filePath": "app/routes/**/*.tsx",
      "lineNumber": 7,
      "variables": ["user", "id"]
    }
  ]
}
```

## Action Functions

Instrument your actions:

```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node'

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method === 'POST') {
    const formData = await request.formData()
    // Tracepoint captures form data
    const user = await db.user.create({ data: Object.fromEntries(formData) })
    return json(user, { status: 201 })
  }
  return null
}
```

Configuration:
```json
{
  "tracepoints": [
    {
      "filePath": "app/routes/**/*.tsx",
      "lineNumber": 8,
      "variables": ["formData"]
    }
  ]
}
```

## Database Integration

Trace database operations:

```typescript
export async function loader({ params }: LoaderFunctionArgs) {
  const posts = await db.query(
    'SELECT * FROM posts WHERE author_id = ?',
    [params.userId]
  )
  // Tracepoint captures query result
  return json(posts)
}
```

## API Routes

Create traced API routes:

`app/routes/api/users.tsx`:
```typescript
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node'

export async function loader() {
  const users = await db.user.findMany()
  return json(users)
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === 'POST') {
    const data = await request.json()
    const user = await db.user.create({ data })
    return json(user, { status: 201 })
  }
}
```

## Middleware Integration

Use Remix middleware with TraceInject:

```typescript
import { json } from '@remix-run/node'

export async function middleware(request: Request) {
  const token = request.headers.get('authorization')
  const user = await verifyToken(token)
  // Tracepoint captures user
  return user
}
```

## Error Boundaries

Instrument error handling:

```typescript
import { isRouteErrorResponse, useRouteError } from '@remix-run/react'

export function ErrorBoundary() {
  const error = useRouteError()
  // Tracepoint captures error

  if (isRouteErrorResponse(error)) {
    return <div>Status: {error.status}</div>
  }

  return <div>Error: {error.message}</div>
}
```

## Environment-Specific

```javascript
const isProduction = process.env.NODE_ENV === 'production'

const traceConfig = isProduction ? {
  configPath: './tracepoint-config.prod.json',
  enabled: true,
  environment: 'production'
} : {
  configPath: './tracepoint-config.dev.json',
  enabled: false
}

module.exports = withTraceInject(traceConfig, remixConfig)
```

## Remote Configuration

Enable dynamic updates:

```javascript
module.exports = withTraceInject({
  configPath: './tracepoint-config.json',
  remoteConfig: {
    enabled: process.env.NODE_ENV === 'production',
    endpoint: process.env.TRACE_CONFIG_ENDPOINT,
    apiKey: process.env.TRACE_API_KEY,
    refreshInterval: 60000
  }
})
```

## Session Handling

Trace session operations:

```typescript
import { getSession } from '@/lib/session.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')
  // Tracepoint captures userId
  const user = await db.user.findUnique({ where: { id: userId } })
  return json(user)
}
```

## Resource Routes

Create traced resource routes:

```typescript
import { type LoaderFunctionArgs } from '@remix-run/node'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q')
  // Tracepoint captures search query
  const results = await searchDatabase(query)
  return new Response(JSON.stringify(results))
}
```

## Performance Optimization

For production:

```javascript
module.exports = withTraceInject({
  configPath: './tracepoint-config.json',
  serverOnly: true,
  environment: 'production',
  redaction: {
    enabled: true,
    sensitiveFields: ['password', 'apiKey', 'token']
  },
  capture: {
    maxObjectDepth: 3,
    maxArrayLength: 50
  }
})
```

## Development vs Production

`remix.config.dev.js`:
```javascript
module.exports = withTraceInject({
  configPath: './tracepoint-config.dev.json',
  enabled: false
}, remixConfig)
```

`remix.config.prod.js`:
```javascript
module.exports = withTraceInject({
  configPath: './tracepoint-config.prod.json',
  enabled: true
}, remixConfig)
```

## Docker Deployment

In Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV TRACE_INJECT_ENABLED=true
ENV TRACE_INJECT_ENV=production

RUN npm run build

CMD ["npm", "start"]
```

## TypeScript Configuration

Full TypeScript support:

```typescript
import { json, type DataFunctionArgs } from '@remix-run/node'

export async function loader({ params, request }: DataFunctionArgs) {
  const { id } = params
  const user = await db.user.findUnique({ where: { id } })

  return json({
    user,
    timestamp: new Date().toISOString()
  })
}
```

## Troubleshooting

### Plugin not working

1. Verify `remix.config.js` has the plugin
2. Check configuration file exists
3. Clear build: `rm -rf build`
4. Rebuild: `npm run build`

### Build fails

Check for errors:
```bash
npm run build 2>&1 | tail -100
```

### Performance issues

1. Set `serverOnly: true`
2. Reduce number of tracepoints
3. Disable in development

## Best Practices

1. **Use `serverOnly: true`** - Only instrument server code
2. **Instrument loaders and actions** - Critical data points
3. **Enable redaction** - Protect sensitive data
4. **Test in staging** - Verify configuration first
5. **Monitor overhead** - Track performance impact
6. **Use remote config** - Update without redeployment
