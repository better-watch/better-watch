# Performance Best Practices

Guide for optimizing TraceInject performance.

## Overview

TraceInject is designed to have minimal performance impact, but proper configuration is important.

## Build-Time Performance

### 1. Minimize Tracepoints

The number of tracepoints directly affects build time.

**Bad:**
```json
{
  "tracepoints": [
    { "filePath": "src/**/*.ts", "lineNumber": 1, "variables": ["*"] }
  ]
}
```

**Good:**
```json
{
  "tracepoints": [
    { "filePath": "src/api/users.ts", "lineNumber": 25, "variables": ["user"] },
    { "filePath": "src/api/posts.ts", "lineNumber": 30, "variables": ["post"] }
  ]
}
```

### 2. Use Specific File Patterns

Glob patterns should be as specific as possible.

**Slow:** `src/**/*.ts` - Matches all files
**Fast:** `src/api/handlers/*.ts` - Matches specific directory

```json
{
  "tracepoints": [
    {
      "filePath": "src/api/handlers/*.ts",  // Specific
      "lineNumber": 10,
      "variables": ["request"]
    }
  ]
}
```

### 3. Disable in Development

Only enable for production builds.

```typescript
const isProduction = process.env.NODE_ENV === 'production'

module.exports = {
  plugins: [
    new TraceInjectPlugin({
      enabled: isProduction
    })
  ]
}
```

Or use separate configs:

```bash
# Development
npm run build:dev  # No instrumentation

# Production
npm run build:prod  # With instrumentation
```

### 4. Cache Build Artifacts

Use your build tool's caching:

```javascript
module.exports = {
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    }
  },
  plugins: [
    new TraceInjectPlugin({...})
  ]
}
```

## Runtime Performance

### 1. Optimize Capture Limits

Set reasonable limits for captured data.

**Conservative (Fast):**
```json
{
  "capture": {
    "maxObjectDepth": 2,
    "maxArrayLength": 10,
    "maxStringLength": 100,
    "maxTotalSize": 10240
  }
}
```

**Balanced:**
```json
{
  "capture": {
    "maxObjectDepth": 5,
    "maxArrayLength": 100,
    "maxStringLength": 1000,
    "maxTotalSize": 1048576
  }
}
```

**Comprehensive:**
```json
{
  "capture": {
    "maxObjectDepth": 10,
    "maxArrayLength": 1000,
    "maxStringLength": 10000,
    "maxTotalSize": 10485760
  }
}
```

### 2. Use Sampling

Don't trace every request or operation.

```json
{
  "capture": {
    "sampleRate": 0.1  // Trace 10% of requests
  }
}
```

For high-volume operations:
```json
{
  "capture": {
    "sampleRate": 0.01  // Trace 1% of requests
  }
}
```

### 3. Selective Variable Capture

Capture only what you need.

**Bad:**
```json
{
  "tracepoints": [
    {
      "filePath": "app.ts",
      "lineNumber": 10,
      "variables": ["*"]  // Everything
    }
  ]
}
```

**Good:**
```json
{
  "tracepoints": [
    {
      "filePath": "app.ts",
      "lineNumber": 10,
      "variables": ["userId", "status"]  // Specific
    }
  ]
}
```

### 4. Async Tracing

Use async submission for non-critical traces.

```json
{
  "capture": {
    "async": true,
    "batchSize": 100
  }
}
```

This queues traces and sends them in batches without blocking.

### 5. Early Return in Conditions

Use conditions to skip expensive captures.

```json
{
  "tracepoints": [
    {
      "filePath": "app.ts",
      "lineNumber": 20,
      "variables": ["largeArray"],
      "condition": "largeArray.length > 1000"  // Only if large
    }
  ]
}
```

## Server Performance

### 1. Use Persistent Storage

Memory storage fills up; use a database for production.

**Development:**
```typescript
const server = new TraceServer({
  storage: 'memory'  // Fast, temporary
})
```

**Production:**
```typescript
const server = new TraceServer({
  storage: new DatabaseStorage({
    connection: 'postgresql://localhost/traces'
  })
})
```

### 2. Enable Rate Limiting

Prevent trace submission from overwhelming the server.

```json
{
  "server": {
    "rateLimit": {
      "enabled": true,
      "maxRequests": 1000,
      "windowMs": 60000
    }
  }
}
```

### 3. Archive Old Traces

Periodically delete old data.

```typescript
async function archiveOldTraces() {
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
  await server.deleteTraces({
    beforeTimestamp: oneWeekAgo
  })
}

// Run daily
setInterval(archiveOldTraces, 24 * 60 * 60 * 1000)
```

### 4. Query Optimization

Use pagination and filtering.

**Slow:**
```typescript
const traces = await server.queryTraces({})  // All traces
```

**Fast:**
```typescript
const traces = await server.queryTraces({
  label: 'userCreated',
  limit: 100,
  offset: 0
})
```

## Network Performance

### 1. Batch Submissions

Send traces in groups.

```typescript
const batch = []

for (const trace of traces) {
  batch.push(trace)

  if (batch.length >= 100) {
    await submitBatch(batch)
    batch.length = 0
  }
}

if (batch.length > 0) {
  await submitBatch(batch)
}
```

### 2. Compress Data

Enable compression for large payloads.

```typescript
app.use(compression())
```

### 3. Use CDN for Static Files

If serving traces to a UI, use CDN.

```typescript
app.use(express.static('public', {
  maxAge: '1d',
  etag: false
}))
```

## Profiling & Monitoring

### 1. Monitor Build Time

Track build performance over time.

```bash
time npm run build
# real 1m23s
# user 2m15s
# sys 0s
```

### 2. Monitor Runtime Overhead

Measure impact on application performance.

```typescript
const start = performance.now()
// Application code
const duration = performance.now() - start

console.log(`Operation took ${duration}ms`)
```

### 3. Trace Server Metrics

Monitor server health.

```typescript
const metrics = server.getMetrics()

console.log(`Traces: ${metrics.totalTraces}`)
console.log(`Rate: ${metrics.tracesPerSecond}/s`)
console.log(`Uptime: ${metrics.uptime}s`)
console.log(`Memory: ${metrics.memoryUsage}MB`)
```

## Production Configuration

### Recommended Production Settings

```json
{
  "tracepoints": [
    {
      "filePath": "src/api/handlers/*.ts",
      "lineNumber": 5,
      "variables": ["request.path", "userId"]
    },
    {
      "filePath": "src/services/*.ts",
      "lineNumber": 10,
      "variables": ["result.status"]
    }
  ],
  "capture": {
    "maxObjectDepth": 3,
    "maxArrayLength": 50,
    "maxStringLength": 500,
    "maxTotalSize": 1048576,
    "sampleRate": 0.1
  },
  "redaction": {
    "enabled": true,
    "sensitiveFields": ["password", "token", "apiKey", "secret"]
  },
  "server": {
    "storage": "database",
    "rateLimit": {
      "enabled": true,
      "maxRequests": 10000,
      "windowMs": 60000
    }
  }
}
```

## Performance Checklist

- [ ] Disabled tracing in development
- [ ] Limited number of tracepoints
- [ ] Used specific file patterns
- [ ] Set reasonable capture limits
- [ ] Enabled sampling for high-volume operations
- [ ] Implemented persistent storage
- [ ] Enabled rate limiting
- [ ] Enabled redaction
- [ ] Set up trace archival
- [ ] Implemented pagination in queries
- [ ] Monitored build and runtime performance
- [ ] Tested in production-like environment

## Benchmarks

Typical performance impact:

| Setting | Build Impact | Runtime Impact |
|---------|-------------|----------------|
| 10 tracepoints | +5% | < 1% |
| 50 tracepoints | +15% | < 1% |
| 100 tracepoints | +30% | 1-2% |
| 500 tracepoints | +60% | 2-5% |

With sampling (10%):
- Runtime impact: < 0.1%

## Optimization Timeline

1. **Start:** Get it working
   - Any configuration works

2. **Optimize:** Reduce overhead
   - Limit tracepoints
   - Enable sampling
   - Use specific patterns

3. **Scale:** Prepare for production
   - Use persistent storage
   - Monitor metrics
   - Set up archival

4. **Maintain:** Keep it fast
   - Regular monitoring
   - Archive old data
   - Adjust configuration
