# Common Issues

Troubleshooting guide for common TraceInject problems.

## Build & Installation Issues

### Plugin Not Found

**Problem:** Build fails with "Cannot find module '@trace-inject/webpack-plugin'"

**Solutions:**

1. Verify installation:
```bash
npm list @trace-inject/webpack-plugin
```

2. Install the plugin:
```bash
npm install --save-dev @trace-inject/webpack-plugin
```

3. Check configuration is correct:
```javascript
const TraceInjectPlugin = require('@trace-inject/webpack-plugin')

module.exports = {
  plugins: [
    new TraceInjectPlugin(...)
  ]
}
```

### Configuration File Not Found

**Problem:** "Cannot find configuration file at path"

**Solutions:**

1. Verify file exists:
```bash
ls -la ./tracepoint-config.json
```

2. Use absolute path:
```javascript
configPath: path.join(__dirname, 'tracepoint-config.json')
```

3. Check relative path is from project root:
```javascript
// Correct
configPath: './tracepoint-config.json'

// Incorrect
configPath: '../config.json'
```

### Peer Dependency Errors

**Problem:** "Peer dependency missing @babel/core"

**Solutions:**

```bash
npm install --save-dev @babel/core @babel/traverse @babel/types
```

## Runtime Issues

### Tracepoints Not Captured

**Problem:** Tracepoints are defined but variables aren't being captured.

**Solutions:**

1. Verify line numbers match:
```typescript
// Check the actual line where variable exists
const parser = new Parser()
const analysis = parser.analyze(sourceCode)
console.log(analysis.variables.map(v => `${v.name} at line ${v.line}`))
```

2. Check variable names are exact:
```json
{
  "variables": ["user", "count"],  // Exact names
  "variables": ["*"]                // Not wildcards
}
```

3. Ensure variables are in scope:
```typescript
function example() {
  const user = {}  // Variable defined here
  // Tracepoint should be on this line or after
  console.log(user)
}
```

4. Check build actually ran:
```bash
rm -rf dist  # Clear output
npm run build  # Rebuild
```

### Missing Capture Data

**Problem:** Traces are collected but variables are empty.

**Solutions:**

1. Check capture limits:
```json
{
  "capture": {
    "maxObjectDepth": 5,       // Might be too low
    "maxArrayLength": 100,     // Might be too low
    "maxStringLength": 1000    // Might truncate
  }
}
```

Increase limits:
```json
{
  "capture": {
    "maxObjectDepth": 10,
    "maxArrayLength": 1000,
    "maxStringLength": 10000
  }
}
```

2. Check for serialization errors:
```typescript
const data = { circular: undefined }
data.circular = data  // Circular reference

// This should still capture but might be redacted
```

3. Verify redaction isn't too aggressive:
```bash
TRACE_INJECT_REDACTION_ENABLED=false npm start
```

### Server Not Starting

**Problem:** Trace collection server fails to start.

**Solutions:**

1. Check port is available:
```bash
lsof -i :3000  # Check if port 3000 is in use
```

2. Use a different port:
```json
{
  "server": {
    "port": 3001
  }
}
```

3. Check permissions:
```bash
# Ensure user can listen on port
whoami
```

## Configuration Issues

### Invalid Configuration

**Problem:** "Invalid configuration: unknown property X"

**Solutions:**

1. Validate configuration:
```typescript
import { Config } from '@trace-inject/core/config'

const result = Config.validate(userConfig)
if (!result.valid) {
  console.error(result.errors)
}
```

2. Check schema:
```bash
# Review docs/guide/config-reference.md
```

3. Use example configuration:
```json
{
  "tracepoints": [],
  "redaction": {
    "enabled": true
  },
  "capture": {
    "maxObjectDepth": 5
  }
}
```

### Remote Configuration Not Loading

**Problem:** Remote configuration is not being fetched.

**Solutions:**

1. Verify endpoint is accessible:
```bash
curl -H "Authorization: Bearer KEY" https://config.example.com/api/config
```

2. Check API key:
```json
{
  "remoteConfig": {
    "apiKey": "correct-key"  // Verify it's correct
  }
}
```

3. Check refresh interval:
```json
{
  "remoteConfig": {
    "refreshInterval": 30000  // At least 30 seconds
  }
}
```

4. Enable verbose logging:
```typescript
import { TraceInject } from '@trace-inject/core'

const traceInject = new TraceInject({
  verbose: true
})
```

## Performance Issues

### Build Slow

**Problem:** Build time increased significantly.

**Solutions:**

1. Reduce tracepoints:
```json
{
  "tracepoints": [
    // Remove unnecessary tracepoints
  ]
}
```

2. Use specific file patterns:
```json
{
  "tracepoints": [
    {
      "filePath": "src/services/*.ts",  // Specific pattern
      // Not: "src/**/*.ts"
    }
  ]
}
```

3. Disable in development:
```typescript
enabled: process.env.NODE_ENV === 'production'
```

### High Memory Usage

**Problem:** Application uses excessive memory.

**Solutions:**

1. Reduce capture limits:
```json
{
  "capture": {
    "maxObjectDepth": 3,
    "maxArrayLength": 50,
    "maxTotalSize": 1048576
  }
}
```

2. Enable sampling:
```json
{
  "capture": {
    "sampleRate": 0.1  // Only capture 10%
  }
}
```

3. Use persistent storage:
```typescript
const server = new TraceServer({
  storage: 'database'  // Not 'memory'
})
```

### Slow Trace Submission

**Problem:** Sending traces takes too long.

**Solutions:**

1. Batch traces:
```typescript
const traces = []

for (const trace of allTraces) {
  traces.push(trace)
  if (traces.length >= 100) {
    await submitBatch(traces)
    traces.length = 0
  }
}
```

2. Use async submission:
```json
{
  "capture": {
    "async": true,
    "batchSize": 100
  }
}
```

3. Reduce trace size:
```json
{
  "capture": {
    "maxStringLength": 500
  }
}
```

## Data Issues

### Sensitive Data Captured

**Problem:** Passwords or tokens are captured in traces.

**Solutions:**

1. Enable redaction:
```json
{
  "redaction": {
    "enabled": true,
    "sensitiveFields": ["password", "token", "apiKey", "secret"]
  }
}
```

2. Add more patterns:
```json
{
  "redaction": {
    "sensitivePatterns": [
      "^sk_[a-z0-9]{24}$",
      "^pk_[a-z0-9]{24}$"
    ]
  }
}
```

3. Exclude variables:
```json
{
  "capture": {
    "excludeVariables": ["password", "credentials"]
  }
}
```

### Data Truncated

**Problem:** Captured variables are truncated or incomplete.

**Solutions:**

1. Increase limits:
```json
{
  "capture": {
    "maxObjectDepth": 10,
    "maxArrayLength": 1000,
    "maxStringLength": 10000
  }
}
```

2. Check total size limit:
```json
{
  "capture": {
    "maxTotalSize": 52428800  // 50MB
  }
}
```

3. Use selective capture:
```json
{
  "tracepoints": [
    {
      "variables": ["user.id", "user.name"]  // Specific properties
    }
  ]
}
```

## Debugging

### Enable Verbose Logging

```bash
TRACE_INJECT_DEBUG=true npm start
```

Or in code:
```typescript
const traceInject = new TraceInject({
  verbose: true
})
```

### Check Generated Code

Inspect the instrumented code to see what was injected:

```bash
# Build with tracing
npm run build

# Inspect dist files
cat dist/app.js | grep __tracepoint__
```

### Test Configuration

```typescript
import { Config } from '@trace-inject/core/config'

const config = await Config.load('./tracepoint-config.json')
const result = Config.validate(config)

console.log('Valid:', result.valid)
if (!result.valid) {
  console.error('Errors:', result.errors)
}
```

## Getting Help

If issues persist:

1. Check [API Reference](../api/overview)
2. Review [Configuration Reference](../guide/config-reference)
3. Check [Security Guide](./security)
4. Check [Performance Guide](./performance)
5. Report issues with detailed logs

## Common Error Messages

### "TracePoint not found"
- Verify line number is correct
- Check file path pattern matches
- Ensure file exists and is included

### "Unable to serialize"
- Check for circular references
- Reduce object depth limit
- Enable error logging

### "Rate limit exceeded"
- Reduce sampling rate
- Batch submissions
- Increase rate limit window

### "Invalid source map"
- Ensure source maps are generated
- Check source map path is correct
- Verify source map format
