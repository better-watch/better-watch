# Next.js Integration

Integrate TraceInject into your Next.js application.

## Installation

```bash
npm install @trace-inject/nextjs
npm install --save-dev @trace-inject/core
```

## Setup

Add TraceInject to your `next.config.js`:

```javascript
const withTraceInject = require('@trace-inject/nextjs')

module.exports = withTraceInject({
  configPath: './tracepoint-config.json'
})
```

## Full Configuration

```javascript
const withTraceInject = require('@trace-inject/nextjs')

module.exports = withTraceInject({
  configPath: './tracepoint-config.json',
  enabled: true,
  environment: process.env.NODE_ENV,
  serverOnly: true,
  remoteConfig: {
    enabled: process.env.NODE_ENV === 'production',
    endpoint: process.env.TRACE_CONFIG_ENDPOINT
  }
})({
  reactStrictMode: true,
  swcMinify: true
})
```

## Server-Only Instrumentation

Instrument only server-side code:

```javascript
const withTraceInject = require('@trace-inject/nextjs')

module.exports = withTraceInject({
  configPath: './tracepoint-config.json',
  serverOnly: true
})
```

This is recommended because:
- Reduces client bundle size
- Avoids exposing sensitive data to browsers
- Improves performance on client-side

## API Routes

Instrument your API routes:

`pages/api/users/[id].ts`:
```typescript
import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query
  // Tracepoint at line 10 will capture id and req
  const user = getUser(id as string)
  res.status(200).json(user)
}
```

Configuration:
```json
{
  "tracepoints": [
    {
      "filePath": "pages/api/**/*.ts",
      "lineNumber": 10,
      "variables": ["id", "req.query"]
    }
  ]
}
```

## Server Components

Instrument Next.js Server Components (App Router):

`app/users/[id]/page.tsx`:
```typescript
export default async function Page({ params }: { params: { id: string } }) {
  const user = await getUser(params.id)
  // Tracepoint captures user data
  return <div>{user.name}</div>
}
```

Configuration:
```json
{
  "tracepoints": [
    {
      "filePath": "app/**/*.tsx",
      "lineNumber": 3,
      "variables": ["user", "params.id"]
    }
  ]
}
```

## Development vs Production

Development configuration (`next.config.dev.js`):
```javascript
const withTraceInject = require('@trace-inject/nextjs')

module.exports = withTraceInject({
  configPath: './tracepoint-config.dev.json',
  enabled: false // Disable for faster dev builds
})
```

Production configuration (`next.config.prod.js`):
```javascript
const withTraceInject = require('@trace-inject/nextjs')

module.exports = withTraceInject({
  configPath: './tracepoint-config.prod.json',
  enabled: true,
  environment: 'production'
})
```

## Environment Variables

Configure via environment variables:

```bash
TRACE_INJECT_ENABLED=true
TRACE_INJECT_CONFIG_PATH=./tracepoint-config.json
TRACE_INJECT_ENV=production
npm run build
```

Or in `.env.production`:
```
TRACE_INJECT_ENABLED=true
TRACE_INJECT_REMOTE_ENABLED=true
TRACE_INJECT_REMOTE_ENDPOINT=https://config.example.com/api/config
```

## Middleware

Add instrumentation to Next.js middleware:

`middleware.ts`:
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.headers.get('authorization')
  // Tracepoint captures token and request path
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
```

## Database Queries

Instrument database operations:

```typescript
// pages/api/posts.ts
import { db } from '@/lib/db'

export default async function handler(req, res) {
  const posts = await db.query('SELECT * FROM posts')
  // Tracepoint captures posts count
  res.json(posts)
}
```

Configuration:
```json
{
  "tracepoints": [
    {
      "filePath": "pages/api/*.ts",
      "lineNumber": 5,
      "variables": ["posts.length"]
    }
  ]
}
```

## Remote Configuration

Enable dynamic configuration updates:

```javascript
const withTraceInject = require('@trace-inject/nextjs')

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

## Performance Optimization

For production with performance in mind:

```javascript
const withTraceInject = require('@trace-inject/nextjs')

module.exports = withTraceInject({
  configPath: './tracepoint-config.json',
  serverOnly: true,
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

## Vercel Deployment

TraceInject works with Vercel. Configuration in `vercel.json`:

```json
{
  "env": {
    "TRACE_INJECT_ENABLED": "true",
    "TRACE_INJECT_ENV": "production"
  }
}
```

Or set environment variables in Vercel dashboard.

## Troubleshooting

### Plugin not working

1. Verify `next.config.js` has the plugin
2. Check configuration file path exists
3. Try clearing `.next` directory: `rm -rf .next`
4. Rebuild: `npm run build`

### Build fails

Check for errors:
```bash
npm run build 2>&1 | head -50
```

Enable verbose logging:
```javascript
withTraceInject({
  configPath: './tracepoint-config.json',
  verbose: true
})
```

### Performance issues

1. Set `serverOnly: true` to skip client instrumentation
2. Reduce number of tracepoints
3. Disable in development with `enabled: false`

### Deployment failures

Verify environment variables are set in deployment:
```bash
vercel env ls
```

## Best Practices

1. **Use `serverOnly: true`** - Only instrument server code
2. **Enable redaction** - Protect sensitive data
3. **Test in staging** - Always test configuration changes
4. **Monitor performance** - Track overhead
5. **Use remote config** - Update tracepoints without redeployment
