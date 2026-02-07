# Capture API

API for capturing and processing variable values.

## Overview

The Capture module handles runtime collection, serialization, and redaction of variable values.

## Basic Usage

```typescript
import { Capture } from '@trace-inject/core/capture'

const capture = new Capture()
const captured = capture.captureVariable('user', { name: 'Alice' })
```

## Capture Class

### Constructor

```typescript
const capture = new Capture(options?: CaptureOptions)
```

Options:
```typescript
interface CaptureOptions {
  maxObjectDepth?: number      // Default: 5
  maxArrayLength?: number      // Default: 100
  maxStringLength?: number     // Default: 1000
  maxTotalSize?: number        // Default: 10MB
  redaction?: RedactionConfig
}
```

### Methods

#### captureVariable(name, value, context) - returns `CapturedValue`

Capture a single variable.

```typescript
const result = capture.captureVariable('user', userData, {
  filePath: 'app.ts',
  lineNumber: 10
})
```

Returns:
```typescript
interface CapturedValue {
  name: string
  value: any
  type: string
  size: number
  redacted: boolean
}
```

#### captureVariables(variables) - returns `CapturedVariables`

Capture multiple variables at once.

```typescript
const captured = capture.captureVariables({
  user,
  count,
  items
})
```

#### serializeValue(value, depth) - returns `string`

Serialize a value to JSON.

```typescript
const json = capture.serializeValue(complexObject)
```

#### redactValue(value, config) - returns redacted value

Apply redaction to a value.

```typescript
const redacted = capture.redactValue(user, {
  sensitiveFields: ['password', 'apiKey']
})
```

## Capture Context

```typescript
interface CaptureContext {
  filePath: string
  lineNumber: number
  label?: string
  condition?: boolean
}
```

## Serialization

### Value Types

The Capture API handles all JavaScript types:

```typescript
capture.captureVariable('string', 'hello')
capture.captureVariable('number', 42)
capture.captureVariable('boolean', true)
capture.captureVariable('null', null)
capture.captureVariable('undefined', undefined)
capture.captureVariable('array', [1, 2, 3])
capture.captureVariable('object', { key: 'value' })
capture.captureVariable('function', () => {})
capture.captureVariable('symbol', Symbol('sym'))
capture.captureVariable('date', new Date())
```

### Object Serialization

```typescript
const user = {
  name: 'Alice',
  profile: {
    bio: 'Developer',
    settings: {
      theme: 'dark'
    }
  }
}

const captured = capture.captureVariable('user', user)
// Respects maxObjectDepth limit
```

### Array Serialization

```typescript
const items = Array(1000).fill({ id: 1 })
const captured = capture.captureVariable('items', items)
// Respects maxArrayLength limit
```

## Redaction

### Built-in Redaction

```typescript
const capture = new Capture({
  redaction: {
    enabled: true,
    sensitiveFields: ['password', 'apiKey', 'token']
  }
})

const user = {
  name: 'Alice',
  password: 'secret123',
  apiKey: 'sk_prod_12345'
}

const captured = capture.captureVariable('user', user)
// password and apiKey are redacted
```

### Custom Redaction Patterns

```typescript
const capture = new Capture({
  redaction: {
    enabled: true,
    sensitiveFields: ['password'],
    sensitivePatterns: [
      '^sk_[a-z0-9]{24}$',
      '^pk_[a-z0-9]{24}$'
    ]
  }
})
```

### Selective Redaction

```typescript
const capture = new Capture({
  redaction: {
    enabled: true,
    sensitiveFields: ['password', 'apiKey'],
    whitelistedFields: ['public_key', 'username']
  }
})
```

## Size Management

### Depth Limiting

```typescript
const capture = new Capture({
  maxObjectDepth: 3
})

const nested = { a: { b: { c: { d: { e: 'value' } } } } }
const captured = capture.captureVariable('nested', nested)
// Limited to 3 levels deep
```

### Array Limiting

```typescript
const capture = new Capture({
  maxArrayLength: 50
})

const items = Array(1000).fill(0)
const captured = capture.captureVariable('items', items)
// Only first 50 items captured
```

### String Limiting

```typescript
const capture = new Capture({
  maxStringLength: 500
})

const longText = 'a'.repeat(10000)
const captured = capture.captureVariable('text', longText)
// Truncated to 500 characters
```

### Total Size Limiting

```typescript
const capture = new Capture({
  maxTotalSize: 1048576 // 1MB
})

const data = generateLargeObject()
const captured = capture.captureVariables({ data })
// Stops when 1MB is reached
```

## Error Handling

### Serialization Errors

```typescript
const circular = {}
circular.self = circular

const capture = new Capture()
const result = capture.captureVariable('circular', circular)
// Handles gracefully: "[Unable to serialize: circular reference]"
```

### Type Errors

```typescript
const capture = new Capture()

try {
  const result = capture.captureVariable('value', null)
} catch (error) {
  if (error instanceof CaptureError) {
    console.error('Capture failed:', error.message)
  }
}
```

## Advanced Usage

### Custom Serializer

```typescript
class CustomCapture extends Capture {
  protected serializeSpecial(value: any): any {
    if (value instanceof CustomClass) {
      return { __custom: value.toJSON() }
    }
    return super.serializeSpecial(value)
  }
}
```

### Sampling

```typescript
class SampledCapture extends Capture {
  constructor(private sampleRate: number = 1.0) {
    super()
  }

  captureVariable(name: string, value: any): CapturedValue | null {
    if (Math.random() > this.sampleRate) {
      return null // Skip this sample
    }
    return super.captureVariable(name, value)
  }
}
```

### Async Capture

```typescript
async function captureAsync(name: string, value: any) {
  return new Promise((resolve) => {
    setImmediate(() => {
      const result = capture.captureVariable(name, value)
      resolve(result)
    })
  })
}
```

## Integration Examples

### With Trace Server

```typescript
import { TraceServer } from '@trace-inject/core/server'

const capture = new Capture({
  maxObjectDepth: 5,
  redaction: { enabled: true }
})

const server = new TraceServer()

app.post('/api/traces', (req, res) => {
  const { variable, value } = req.body
  const captured = capture.captureVariable(variable, value)
  server.submitTrace(captured)
  res.json({ success: true })
})
```

### With Configuration

```typescript
import { loadConfig } from '@trace-inject/core/config'

const config = await loadConfig('./tracepoint-config.json')
const capture = new Capture(config.capture || {})

function tracepoint(label: string, variables: Record<string, any>) {
  const captured = capture.captureVariables(variables)
  console.log(`[${label}]`, captured)
}
```

## Performance Optimization

### Lazy Serialization

```typescript
class LazyCapture extends Capture {
  captureVariable(name: string, value: any): CapturedValue {
    const result = super.captureVariable(name, value)
    // Defer serialization until accessed
    return {
      ...result,
      get value() {
        return this._serialize()
      }
    }
  }
}
```

### Batch Processing

```typescript
const captures = []

for (const variable of variables) {
  const captured = capture.captureVariable(variable.name, variable.value)
  captures.push(captured)

  // Send in batches of 100
  if (captures.length >= 100) {
    sendBatch(captures)
    captures.length = 0
  }
}
```

## Testing

```typescript
describe('Capture', () => {
  it('captures variables correctly', () => {
    const capture = new Capture()
    const result = capture.captureVariable('user', { name: 'Alice' })

    expect(result.name).toBe('user')
    expect(result.value.name).toBe('Alice')
  })

  it('respects depth limits', () => {
    const capture = new Capture({ maxObjectDepth: 2 })
    const nested = { a: { b: { c: 'value' } } }
    const result = capture.captureVariable('nested', nested)

    // c is not captured due to depth limit
    expect(result.value.a.b).toBeUndefined()
  })

  it('redacts sensitive fields', () => {
    const capture = new Capture({
      redaction: { enabled: true, sensitiveFields: ['password'] }
    })
    const user = { name: 'Alice', password: 'secret' }
    const result = capture.captureVariable('user', user)

    expect(result.value.password).toBe('[REDACTED]')
  })
})
```

## Troubleshooting

### Missing Values

If captured values are empty:
1. Check depth limits aren't too restrictive
2. Verify variables are in scope
3. Check redaction isn't over-aggressive

### Large Captures

If captures are too large:
1. Reduce `maxObjectDepth`
2. Reduce `maxArrayLength`
3. Enable sampling
4. Use selective variable capture

### Serialization Issues

If serialization fails:
1. Check for circular references
2. Verify custom types have `toJSON()` methods
3. Enable verbose logging
