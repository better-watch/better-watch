# Nuxt Integration

Integrate TraceInject into your Nuxt application.

## Installation

```bash
npm install @trace-inject/nuxt
npm install -D @trace-inject/core
```

## Setup

Add TraceInject to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@trace-inject/nuxt'],

  traceInject: {
    configPath: './tracepoint-config.json'
  }
})
```

## Full Configuration

```typescript
export default defineNuxtConfig({
  modules: ['@trace-inject/nuxt'],

  traceInject: {
    configPath: './tracepoint-config.json',
    enabled: true,
    environment: process.env.NODE_ENV,
    serverOnly: true,
    remoteConfig: {
      enabled: process.env.NODE_ENV === 'production',
      endpoint: process.env.TRACE_CONFIG_ENDPOINT
    },
    redaction: {
      enabled: true,
      sensitiveFields: ['password', 'token', 'apiKey']
    }
  }
})
```

## Server-Only Instrumentation

Instrument only server-side code:

```typescript
export default defineNuxtConfig({
  traceInject: {
    configPath: './tracepoint-config.json',
    serverOnly: true
  }
})
```

## Server Routes

Instrument your server routes:

`server/api/users/[id].ts`:
```typescript
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  // Tracepoint captures id
  const user = await db.user.findUnique({ where: { id } })
  return user
})
```

Configuration:
```json
{
  "tracepoints": [
    {
      "filePath": "server/api/**/*.ts",
      "lineNumber": 4,
      "variables": ["id", "user"]
    }
  ]
}
```

## Middleware

Instrument server middleware:

`server/middleware/auth.ts`:
```typescript
export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth-token')
  const user = await verifyToken(token)
  // Tracepoint captures user identity
  event.context.user = user
})
```

Configuration:
```json
{
  "tracepoints": [
    {
      "filePath": "server/middleware/*.ts",
      "lineNumber": 5,
      "variables": ["user"]
    }
  ]
}
```

## Plugins

Instrument server plugins:

`server/plugins/db.ts`:
```typescript
export default defineNitroPlugin(() => {
  const db = createDatabaseConnection()
  // Tracepoint captures connection status
  console.log('Database connected')
})
```

## Database Operations

Trace database queries:

```typescript
export default defineEventHandler(async (event) => {
  const posts = await $fetch('/api/posts')
  // Tracepoint captures posts count
  return posts
})
```

Configuration:
```json
{
  "tracepoints": [
    {
      "filePath": "server/api/**/*.ts",
      "lineNumber": 3,
      "variables": ["posts", "posts.length"]
    }
  ]
}
```

## Composables

Instrument server composables:

`server/utils/db.ts`:
```typescript
export const useDatabase = () => {
  return {
    getUser: async (id: string) => {
      // Tracepoint captures user lookup
      return db.user.findUnique({ where: { id } })
    }
  }
}
```

## Error Handling

Trace errors:

```typescript
export default defineEventHandler(async (event) => {
  try {
    const data = await getData()
    return data
  } catch (error) {
    // Tracepoint captures error context
    console.error('Error:', error)
    throw createError({
      statusCode: 500,
      message: 'Internal server error'
    })
  }
})
```

## Authentication

Trace authentication operations:

```typescript
export default defineEventHandler(async (event) => {
  const credentials = await readBody(event)
  const user = await authenticateUser(credentials)
  // Tracepoint captures user identity
  setCookie(event, 'user-id', user.id)
  return { success: true, user }
})
```

With redaction:
```json
{
  "redaction": {
    "enabled": true,
    "sensitiveFields": ["password", "token", "credentials"]
  }
}
```

## Environment-Specific

```typescript
const isProduction = process.env.NODE_ENV === 'production'

export default defineNuxtConfig({
  traceInject: {
    configPath: isProduction
      ? './tracepoint-config.prod.json'
      : './tracepoint-config.dev.json',
    enabled: isProduction,
    environment: process.env.NODE_ENV
  }
})
```

## Remote Configuration

Enable dynamic tracepoint management:

```typescript
export default defineNuxtConfig({
  traceInject: {
    configPath: './tracepoint-config.json',
    remoteConfig: {
      enabled: process.env.NODE_ENV === 'production',
      endpoint: process.env.TRACE_CONFIG_ENDPOINT,
      apiKey: process.env.TRACE_API_KEY,
      refreshInterval: 60000
    }
  }
})
```

## Performance Optimization

For production:

```typescript
export default defineNuxtConfig({
  traceInject: {
    configPath: './tracepoint-config.json',
    serverOnly: true,
    environment: 'production',
    capture: {
      maxObjectDepth: 3,
      maxArrayLength: 50,
      sampleRate: 0.1
    },
    redaction: {
      enabled: true
    }
  }
})
```

## Utilities

Helper utilities for tracing:

`server/utils/trace.ts`:
```typescript
export const traceData = (label: string, data: any) => {
  console.log(`[${label}]`, JSON.stringify(data, null, 2))
  // Tracepoint captures data
  return data
}
```

## Hybrid Rendering

Works with hybrid rendering modes:

```typescript
export default defineNuxtConfig({
  ssr: true, // SSR enabled
  routeRules: {
    '/api/**': { ssr: false }
  },
  traceInject: {
    configPath: './tracepoint-config.json',
    serverOnly: true
  }
})
```

## Deployment

For production deployment:

```bash
NODE_ENV=production TRACE_INJECT_ENABLED=true npm run build
npm start
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

EXPOSE 3000

CMD ["npm", "start"]
```

## Testing

Disable tracing in tests:

```typescript
export default defineNuxtConfig({
  traceInject: {
    enabled: process.env.NODE_ENV !== 'test'
  }
})
```

## Troubleshooting

### Module not loading

Verify in `nuxt.config.ts`:

```typescript
modules: ['@trace-inject/nuxt']
```

### Configuration not applied

Check configuration path:

```typescript
traceInject: {
  configPath: './tracepoint-config.json'
}
```

### Build fails

Clear build cache:
```bash
rm -rf .nuxt dist
npm run build
```

### Performance issues

1. Set `serverOnly: true`
2. Reduce number of tracepoints
3. Use `sampleRate` for sampling
4. Disable in development

## Best Practices

1. **Use `serverOnly: true`** - Only instrument server code
2. **Instrument API routes** - Focus on data entry points
3. **Enable redaction** - Protect sensitive data
4. **Test in staging** - Verify configuration first
5. **Monitor overhead** - Track performance impact
6. **Use remote config** - Update without redeployment
