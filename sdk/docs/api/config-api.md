# Config API

API for managing configuration and settings.

## Overview

The Config module handles loading, validating, and managing TraceInject configuration.

## Basic Usage

```typescript
import { Config } from '@trace-inject/core/config'

const config = await Config.load('./tracepoint-config.json')
console.log(config.tracepoints)
```

## Config Class

### Static Methods

#### load(path: string, options?: LoadOptions): Promise\<Config>

Load configuration from a file or object.

```typescript
const config = await Config.load('./tracepoint-config.json')
const config2 = await Config.load({
  tracepoints: [],
  redaction: { enabled: true }
})
```

#### validate(config: any): ValidationResult

Validate configuration against schema.

```typescript
const result = Config.validate(userConfig)

if (!result.valid) {
  console.error('Invalid config:', result.errors)
}
```

#### merge(...configs)

Merge multiple configurations (accepts multiple `Config` objects).

```typescript
const base = await Config.load('./base.json')
const override = { redaction: { enabled: false } }
const merged = Config.merge(base, override)
```

### Instance Methods

#### getTracepoints(filePath?) - returns `TracePoint[]`

Get tracepoints, optionally filtered by file.

```typescript
const allTracepoints = config.getTracepoints()
const fileTracepoints = config.getTracepoints('src/app.ts')
```

#### addTracepoint(tracepoint) - void

Add a tracepoint to the configuration.

```typescript
config.addTracepoint({
  filePath: 'src/app.ts',
  lineNumber: 10,
  variables: ['user']
})
```

#### removeTracepoint(filePath, lineNumber) - void

Remove a tracepoint.

```typescript
config.removeTracepoint('src/app.ts', 10)
```

#### updateTracepoint(filePath, lineNumber, updates) - void

Update an existing tracepoint.

```typescript
config.updateTracepoint('src/app.ts', 10, {
  variables: ['user', 'count']
})
```

#### getCaptureOptions() - returns `CaptureConfig`

Get capture configuration.

```typescript
const captureConfig = config.getCaptureOptions()
console.log(captureConfig.maxObjectDepth)
```

#### getRedactionConfig() - returns `RedactionConfig`

Get redaction configuration.

```typescript
const redactionConfig = config.getRedactionConfig()
console.log(redactionConfig.sensitiveFields)
```

## Configuration Types

### TraceConfig

```typescript
interface TraceConfig {
  tracepoints: TracePoint[]
  redaction?: RedactionConfig
  capture?: CaptureConfig
  server?: ServerConfig
  project?: ProjectConfig
  remoteConfig?: RemoteConfigOptions
}
```

### TracePoint

```typescript
interface TracePoint {
  filePath: string
  lineNumber: number
  variables: string[]
  labelPrefix?: string
  condition?: string
}
```

### CaptureConfig

```typescript
interface CaptureConfig {
  maxObjectDepth?: number
  maxArrayLength?: number
  maxStringLength?: number
  maxTotalSize?: number
  sampleRate?: number
  async?: boolean
}
```

### RedactionConfig

```typescript
interface RedactionConfig {
  enabled: boolean
  sensitiveFields?: string[]
  sensitivePatterns?: string[]
  whitelistedFields?: string[]
  redactionValue?: string
  auditLog?: boolean
}
```

### ServerConfig

```typescript
interface ServerConfig {
  enabled: boolean
  port: number
  host: string
  path: string
  storage: 'memory' | 'file' | 'database'
  rateLimit?: RateLimitConfig
}
```

## Loading Configuration

### From File

```typescript
// JSON file
const config = await Config.load('./tracepoint-config.json')

// With base path
const config = await Config.load('./config/tracepoints.json', {
  basePath: './config'
})
```

### From Object

```typescript
const config = await Config.load({
  tracepoints: [
    {
      filePath: 'src/**/*.ts',
      lineNumber: 10,
      variables: ['data']
    }
  ],
  redaction: {
    enabled: true
  }
})
```

### From Environment

```typescript
const config = await Config.load(process.env.TRACE_CONFIG_PATH)
```

## Configuration Validation

### Validate Configuration

```typescript
const result = Config.validate({
  tracepoints: [
    {
      filePath: 'app.ts',
      lineNumber: 10,
      variables: ['user']
    }
  ]
})

if (!result.valid) {
  result.errors.forEach(error => {
    console.error(`${error.path}: ${error.message}`)
  })
}
```

### Get Schema

```typescript
const schema = Config.getSchema()
console.log(schema)
```

## Merging Configurations

### Merge Multiple Configs

```typescript
const base = await Config.load('./base.json')
const dev = await Config.load('./dev.json')
const prod = await Config.load('./prod.json')

const config = Config.merge(base, dev, prod)
```

### Merge Strategies

```typescript
const merged = Config.merge(base, override, {
  strategy: 'deep' // 'deep' | 'shallow' | 'replace'
})
```

## Dynamic Configuration

### Update at Runtime

```typescript
const config = await Config.load('./tracepoint-config.json')

// Add new tracepoint
config.addTracepoint({
  filePath: 'src/new-file.ts',
  lineNumber: 5,
  variables: ['result']
})

// Remove tracepoint
config.removeTracepoint('src/old-file.ts', 10)

// Update existing
config.updateTracepoint('src/app.ts', 20, {
  variables: ['user', 'timestamp']
})
```

### Save Configuration

```typescript
await config.save('./tracepoint-config.json')
```

## Remote Configuration

### Load from Remote

```typescript
const config = await Config.loadRemote({
  endpoint: 'https://config.example.com/api/config',
  apiKey: 'your-api-key'
})
```

### Merge with Local

```typescript
const local = await Config.load('./local.json')
const remote = await Config.loadRemote({
  endpoint: 'https://config.example.com/api/config'
})

const merged = Config.merge(local, remote)
```

## Environment Variables

### Override with Environment

```typescript
const config = await Config.load('./tracepoint-config.json', {
  environment: {
    'TRACE_INJECT_REDACTION_ENABLED': 'false',
    'TRACE_INJECT_MAX_DEPTH': '10'
  }
})
```

## Examples

### Basic Configuration

```typescript
import { Config } from '@trace-inject/core/config'

const config = await Config.load({
  tracepoints: [
    {
      filePath: 'src/api/users.ts',
      lineNumber: 15,
      variables: ['user', 'request.body']
    }
  ],
  redaction: {
    enabled: true,
    sensitiveFields: ['password', 'apiKey', 'token']
  },
  capture: {
    maxObjectDepth: 5,
    maxArrayLength: 100
  }
})

console.log(config.getTracepoints())
```

### Development vs Production

```typescript
const isDev = process.env.NODE_ENV === 'development'
const configPath = isDev ? './config.dev.json' : './config.prod.json'
const config = await Config.load(configPath)

if (isDev) {
  // Disable redaction in development
  config.redaction = { enabled: false }
}
```

### Dynamic Tracepoint Management

```typescript
const config = await Config.load('./tracepoint-config.json')

// Add tracepoints for specific functions
const tracepointsByFunction = {
  'getUserById': { filePath: 'src/api/users.ts', lineNumber: 10 },
  'createUser': { filePath: 'src/api/users.ts', lineNumber: 25 },
  'updateUser': { filePath: 'src/api/users.ts', lineNumber: 40 }
}

for (const [fn, tp] of Object.entries(tracepointsByFunction)) {
  config.addTracepoint({
    ...tp,
    variables: ['id', 'data'],
    labelPrefix: fn
  })
}
```

## Testing

```typescript
describe('Config', () => {
  it('loads configuration from file', async () => {
    const config = await Config.load('./test-config.json')
    expect(config.tracepoints).toBeDefined()
  })

  it('validates configuration', () => {
    const result = Config.validate({
      tracepoints: [
        { filePath: 'app.ts', lineNumber: 10, variables: ['x'] }
      ]
    })
    expect(result.valid).toBe(true)
  })

  it('merges configurations', () => {
    const base = new Config({ tracepoints: [] })
    const override = { redaction: { enabled: false } }
    const merged = Config.merge(base, override)
    expect(merged.redaction.enabled).toBe(false)
  })
})
```

## Troubleshooting

### Configuration Not Loaded

```typescript
try {
  const config = await Config.load('./tracepoint-config.json')
} catch (error) {
  if (error instanceof ConfigLoadError) {
    console.error('Failed to load config:', error.message)
  }
}
```

### Invalid Configuration

```typescript
const result = Config.validate(userConfig)

if (!result.valid) {
  result.errors.forEach(error => {
    console.error(`Validation error at ${error.path}: ${error.message}`)
  })
}
```

### Merge Conflicts

```typescript
const merged = Config.merge(base, override, {
  strategy: 'deep' // Use deep merge to preserve nested values
})
```
