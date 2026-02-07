# Injector API

API for injecting instrumentation code into AST.

## Overview

The Injector module modifies Abstract Syntax Trees to add tracepoint instrumentation.

## Basic Usage

```typescript
import { Injector } from '@trace-inject/core/injector'

const injector = new Injector()
const modified = injector.inject(ast, tracepoints)
```

## Injector Class

### Constructor

```typescript
const injector = new Injector(options?: InjectorOptions)
```

Options:
```typescript
interface InjectorOptions {
  lineOffset?: number
  columnOffset?: number
  preserveComments?: boolean
}
```

### Methods

#### inject(ast, tracepoints) - returns modified `AST`

Inject all tracepoints into the AST.

```typescript
const modified = injector.inject(ast, [
  {
    filePath: 'app.ts',
    lineNumber: 10,
    variables: ['user', 'count']
  }
])
```

#### injectTracepoint(ast, tracepoint) - returns modified `AST`

Inject a single tracepoint.

```typescript
const modified = injector.injectTracepoint(ast, {
  filePath: 'app.ts',
  lineNumber: 10,
  variables: ['result'],
  labelPrefix: 'calculate'
})
```

#### generate(ast) - returns `GeneratedCode`

Generate code from modified AST.

```typescript
const generated = injector.generate(modifiedAST)
console.log(generated.code)        // Generated code
console.log(generated.map)         // Source map
```

#### findTracePointLocations(ast, lineNumber) - returns `Location[]`

Find possible injection points near a line number.

```typescript
const locations = injector.findTracePointLocations(ast, 10)
locations.forEach(loc => {
  console.log(`Injection at ${loc.line}:${loc.column}`)
})
```

## TracePoint Specification

```typescript
interface TracePoint {
  filePath: string        // File path (supports glob)
  lineNumber: number      // Line number
  variables: string[]     // Variables to capture
  labelPrefix?: string    // Label prefix for traces
  condition?: string      // Optional JavaScript condition
}
```

## Injection Examples

### Simple Variable Capture

```typescript
const ast = parser.parse(`
  function add(a, b) {
    return a + b
  }
`)

const modified = injector.inject(ast, [
  {
    filePath: 'math.ts',
    lineNumber: 3,
    variables: ['a', 'b'],
    labelPrefix: 'add'
  }
])

// Result includes tracing code:
// __tracepoint__('add', { a, b })
```

### Conditional Tracing

```typescript
const modified = injector.inject(ast, [
  {
    filePath: 'app.ts',
    lineNumber: 10,
    variables: ['total'],
    condition: 'total > 1000',
    labelPrefix: 'largeTotal'
  }
])

// Only traces when condition is true
```

### Multiple Variables

```typescript
const modified = injector.inject(ast, [
  {
    filePath: 'service.ts',
    lineNumber: 15,
    variables: ['request.body', 'response.status', 'error']
  }
])
```

## Generated Code

### Code Generation Options

```typescript
const generated = injector.generate(ast, {
  compact: false,        // Format nicely
  sourceMap: true,       // Include source map
  sourceMaps: true,      // Enable source maps
  sourceMapTarget: 'file.js'
})
```

### Source Maps

```typescript
const generated = injector.generate(modifiedAST)

// generated.map contains source map
const sourceMap = generated.map
console.log(sourceMap.version)   // Source map version
console.log(sourceMap.sources)   // Original sources
console.log(sourceMap.mappings)  // Line mappings
```

## Tracepoint Validation

```typescript
const injector = new Injector()

try {
  const modified = injector.inject(ast, invalidTracepoints)
} catch (error) {
  if (error instanceof TracePointError) {
    console.error('Invalid tracepoint:', error.message)
  }
}
```

## Advanced Usage

### Custom Injection Logic

```typescript
const injector = new Injector({
  preserveComments: true,
  lineOffset: 0,
  columnOffset: 0
})

const tracepoints = [
  {
    filePath: 'app.ts',
    lineNumber: 10,
    variables: ['data'],
    labelPrefix: 'process'
  }
]

const modified = injector.inject(ast, tracepoints)
const { code, map } = injector.generate(modified)
```

### Batch Processing

```typescript
const injector = new Injector()

const files = ['file1.ts', 'file2.ts', 'file3.ts']
const results = []

for (const file of files) {
  const code = readFileSync(file, 'utf-8')
  const ast = parser.parse(code)

  const tracepoints = config.tracepoints.filter(
    tp => tp.filePath === file
  )

  const modified = injector.inject(ast, tracepoints)
  const { code: instrumented } = injector.generate(modified)

  results.push({ file, instrumented })
}
```

### AST Traversal

```typescript
import traverse from '@babel/traverse'

const injector = new Injector()
const modified = injector.inject(ast, tracepoints)

// Traverse to verify injections
traverse(modified, {
  FunctionDeclaration(path) {
    const name = path.node.id?.name
    console.log(`Function: ${name}`)
  },
  CallExpression(path) {
    if (path.node.callee.name === '__tracepoint__') {
      console.log('Found injected tracepoint')
    }
  }
})
```

## Error Handling

```typescript
class InjectionError extends Error {
  constructor(
    public tracepoint: TracePoint,
    public reason: string
  ) {
    super(`Failed to inject tracepoint: ${reason}`)
  }
}
```

Catch injection errors:

```typescript
try {
  const modified = injector.inject(ast, tracepoints)
} catch (error) {
  if (error instanceof InjectionError) {
    console.error(`Failed: ${error.tracepoint.labelPrefix}`)
    console.error(`Reason: ${error.reason}`)
  }
}
```

## Performance Considerations

### Caching Injected Code

```typescript
const cache = new Map<string, string>()

function getInstrumentedCode(filePath: string) {
  if (cache.has(filePath)) {
    return cache.get(filePath)!
  }

  const code = readFileSync(filePath, 'utf-8')
  const ast = parser.parse(code)
  const tracepoints = getTracepoints(filePath)
  const modified = injector.inject(ast, tracepoints)
  const { code: instrumented } = injector.generate(modified)

  cache.set(filePath, instrumented)
  return instrumented
}
```

### Parallel Injection

```typescript
const pMap = require('p-map')

const files = getSourceFiles()
const mapper = async (file) => {
  const code = await readFile(file)
  const ast = parser.parse(code)
  const modified = injector.inject(ast, tracepoints)
  const { code: instrumented } = injector.generate(modified)
  return { file, instrumented }
}

const results = await pMap(files, mapper, { concurrency: 4 })
```

## Integration with Build Tools

### Webpack Plugin Pattern

```typescript
class TraceInjectPlugin {
  apply(compiler) {
    compiler.hooks.normalModuleLoader.tap('TraceInject', (loader) => {
      loader.callback = (err, source, map) => {
        const ast = parser.parse(source)
        const modified = injector.inject(ast, this.tracepoints)
        const { code } = injector.generate(modified)
        return loader.callback(err, code, map)
      }
    })
  }
}
```

## Testing Injections

```typescript
function testInjection(source: string, tracepoints: TracePoint[]) {
  const parser = new Parser()
  const injector = new Injector()

  const ast = parser.parse(source)
  const modified = injector.inject(ast, tracepoints)
  const { code } = injector.generate(modified)

  // Verify injection occurred
  expect(code).toContain('__tracepoint__')

  // Verify code is valid
  expect(() => parser.parse(code)).not.toThrow()
}
```

## Troubleshooting

### Injection Not Applied

Check if tracepoint line number matches:

```typescript
const analysis = parser.analyze(source)
const actualLine = analysis.functions[0].line
const tracepoint = { lineNumber: actualLine, ... }
```

### Invalid Generated Code

Verify AST validity before generation:

```typescript
try {
  const { code } = injector.generate(modified)
  parser.parse(code) // Verify generated code is valid
} catch (error) {
  console.error('Generated invalid code')
}
```

### Memory Issues with Large Files

Process in chunks or use streaming:

```typescript
const chunkSize = 10000
const chunks = code.split('\n').reduce((acc, line, i) => {
  const chunkIdx = Math.floor(i / chunkSize)
  if (!acc[chunkIdx]) acc[chunkIdx] = []
  acc[chunkIdx].push(line)
  return acc
}, [])
```
