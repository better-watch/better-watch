# API Reference Overview

Complete API reference for TraceInject components.

## Core Modules

TraceInject consists of several core modules:

### Parser (`@trace-inject/core/parser`)
Parses TypeScript and JavaScript code using Babel AST.

- **parseCode()** - Parse source code into AST
- **createAST()** - Create AST from options
- **getSourceMap()** - Extract source map information

### Injector (`@trace-inject/core/injector`)
Injects instrumentation code into parsed AST.

- **injectTracepoint()** - Inject a single tracepoint
- **injectTracepoints()** - Inject multiple tracepoints
- **generateCode()** - Generate instrumented code from AST

### Capture (`@trace-inject/core/capture`)
Manages variable capture at runtime.

- **captureVariable()** - Capture a single variable
- **redactValue()** - Redact sensitive data
- **serializeValue()** - Serialize captured values

### Config (`@trace-inject/core/config`)
Configuration management and validation.

- **loadConfig()** - Load configuration from file or object
- **validateConfig()** - Validate configuration schema
- **mergeConfig()** - Merge configurations

### Server (`@trace-inject/core/server`)
HTTP server for trace collection.

- **startServer()** - Start the collection server
- **submitTrace()** - Submit trace data
- **queryTraces()** - Query stored traces

## Module Imports

```typescript
// Parser
import { Parser, SourceMap } from '@trace-inject/core/parser'

// Injector
import { Injector } from '@trace-inject/core/injector'

// Capture
import { Capture, Redactor } from '@trace-inject/core/capture'

// Config
import { Config, ConfigValidator } from '@trace-inject/core/config'

// Server
import { TraceServer } from '@trace-inject/core/server'
```

## Main Class

The main entry point for all functionality:

```typescript
import { TraceInject } from '@trace-inject/core'

const traceInject = new TraceInject({
  configPath: './tracepoint-config.json'
})

// Parse and inject
const instrumented = await traceInject.instrument(sourceCode)

// Start server
await traceInject.startServer()
```

## API Modules

### Parser API
Parse and transform TypeScript/JavaScript code.

See [Parser API](./parser) for detailed documentation.

### Injector API
Inject instrumentation code into AST.

See [Injector API](./injector) for detailed documentation.

### Capture API
Capture and serialize variable values.

See [Capture API](./capture) for detailed documentation.

### Config API
Manage configuration and settings.

See [Config API](./config-api) for detailed documentation.

### Server API
HTTP server for trace collection.

See [Server API](./server-api) for detailed documentation.

## Common Patterns

### Basic Instrumentation

```typescript
import { TraceInject } from '@trace-inject/core'

const traceInject = new TraceInject({
  configPath: './tracepoint-config.json'
})

const source = `
  function add(a, b) {
    return a + b
  }
`

const instrumented = await traceInject.instrument(source)
console.log(instrumented.code)
```

### With Configuration

```typescript
import { TraceInject } from '@trace-inject/core'

const traceInject = new TraceInject({
  configPath: './config.json',
  remoteConfig: {
    enabled: true,
    endpoint: 'https://config.example.com/api/config'
  }
})
```

### Start Collection Server

```typescript
const traceInject = new TraceInject()

const server = await traceInject.startServer({
  port: 3000,
  storage: 'memory'
})

console.log('Server started on port 3000')
```

### Process Multiple Files

```typescript
import { readdir, readFile, writeFile } from 'fs/promises'

const traceInject = new TraceInject()

const files = await readdir('./src')

for (const file of files) {
  if (!file.endsWith('.ts')) continue

  const source = await readFile(`./src/${file}`, 'utf-8')
  const instrumented = await traceInject.instrument(source)
  await writeFile(`./dist/${file}`, instrumented.code)
}
```

## Error Handling

All APIs throw typed errors:

```typescript
import { TraceInject, TraceInjectError } from '@trace-inject/core'

const traceInject = new TraceInject()

try {
  const instrumented = await traceInject.instrument(source)
} catch (error) {
  if (error instanceof TraceInjectError) {
    console.error('TraceInject error:', error.message)
  }
}
```

## TypeScript Support

Full TypeScript support with type definitions:

```typescript
import {
  TraceInject,
  TraceConfig,
  TracePoint,
  CaptureOptions,
  ServerOptions
} from '@trace-inject/core'

const config: TraceConfig = {
  tracepoints: [],
  redaction: { enabled: true }
}

const options: ServerOptions = {
  port: 3000,
  host: 'localhost'
}
```

## Return Types

### Instrumentation Result

```typescript
interface InstrumentationResult {
  code: string              // Instrumented code
  map: SourceMap | null    // Source map
  tracepoints: TracePoint[] // Applied tracepoints
}
```

### Trace Data

```typescript
interface TraceData {
  id: string               // Unique trace ID
  timestamp: number        // Timestamp in milliseconds
  label: string           // Trace label
  variables: Record<string, any> // Captured variables
  environment: string     // Environment name
}
```

## Configuration Types

```typescript
interface TraceConfig {
  tracepoints: TracePoint[]
  redaction?: RedactionConfig
  capture?: CaptureConfig
  server?: ServerConfig
  project?: ProjectConfig
  remoteConfig?: RemoteConfigOptions
}

interface TracePoint {
  filePath: string
  lineNumber: number
  variables: string[]
  labelPrefix?: string
  condition?: string
}

interface CaptureConfig {
  maxObjectDepth?: number
  maxArrayLength?: number
  maxStringLength?: number
  maxTotalSize?: number
}
```

## Recommended Reading Order

1. Start with [Parser API](./parser) - Understand how code is parsed
2. Read [Injector API](./injector) - Learn how instrumentation is injected
3. Study [Capture API](./capture) - See how variables are captured
4. Review [Config API](./config-api) - Manage configuration
5. Explore [Server API](./server-api) - Set up trace collection

## Quick Links

- [Parser API](./parser) - Code parsing and transformation
- [Injector API](./injector) - Instrumentation injection
- [Capture API](./capture) - Variable capture and serialization
- [Config API](./config-api) - Configuration management
- [Server API](./server-api) - Trace server and collection

## Support

For questions or issues:
- Check the [Troubleshooting Guide](../troubleshooting/common-issues)
- See [Performance Best Practices](../troubleshooting/performance)
- Review [Security Considerations](../troubleshooting/security)
