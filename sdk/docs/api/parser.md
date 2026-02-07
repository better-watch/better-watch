# Parser API

API for parsing and analyzing TypeScript and JavaScript code.

## Overview

The Parser module uses Babel AST to parse and analyze source code, extracting information needed for instrumentation.

## Basic Usage

```typescript
import { Parser } from '@trace-inject/core/parser'

const parser = new Parser()
const ast = parser.parse(sourceCode)
```

## Parser Class

### Constructor

```typescript
const parser = new Parser(options?: ParserOptions)
```

Options:
```typescript
interface ParserOptions {
  sourceType?: 'module' | 'script'
  plugins?: string[]
  strictMode?: boolean
}
```

### Methods

#### parse(code, options) - returns `AST`

Parse source code into an Abstract Syntax Tree.

```typescript
const ast = parser.parse(sourceCode, {
  filePath: 'app.ts',
  sourceMap: sourceMapData
})
```

Returns an AST that can be traversed and modified.

#### parseExpression(expression) - returns `Expression`

Parse a single expression.

```typescript
const expr = parser.parseExpression('user.name')
```

#### analyze(code) - returns `CodeAnalysis`

Analyze code for variables, functions, and dependencies.

```typescript
const analysis = parser.analyze(sourceCode)
console.log(analysis.variables) // Found variables
console.log(analysis.functions) // Found functions
```

#### extractSourceMap(code) - returns `SourceMap | null`

Extract source map information.

```typescript
const sourceMap = parser.extractSourceMap(sourceCode)
```

## AST Types

### File

```typescript
interface File {
  type: 'File'
  program: Program
  comments: Comment[]
}
```

### Program

```typescript
interface Program {
  type: 'Program'
  sourceType: 'module' | 'script'
  body: Statement[]
}
```

### Statement

```typescript
type Statement =
  | ExpressionStatement
  | BlockStatement
  | FunctionDeclaration
  | VariableDeclaration
  | ...
```

## Code Analysis

### analyze() Results

```typescript
interface CodeAnalysis {
  variables: Variable[]
  functions: FunctionInfo[]
  classes: ClassInfo[]
  imports: ImportInfo[]
  exports: ExportInfo[]
  dependencies: string[]
}

interface Variable {
  name: string
  type: string
  line: number
  column: number
  scope: string
}

interface FunctionInfo {
  name: string
  parameters: Parameter[]
  returnType?: string
  line: number
  exported: boolean
}

interface Parameter {
  name: string
  type?: string
  optional: boolean
  defaultValue?: any
}
```

## Examples

### Find a Variable at a Line

```typescript
const parser = new Parser()
const ast = parser.parse(sourceCode)
const analysis = parser.analyze(sourceCode)

const variablesAtLine10 = analysis.variables.filter(v => v.line === 10)
console.log(variablesAtLine10)
```

### Extract Function Information

```typescript
const analysis = parser.analyze(sourceCode)

for (const fn of analysis.functions) {
  console.log(`Function: ${fn.name}`)
  console.log(`Parameters: ${fn.parameters.map(p => p.name).join(', ')}`)
  console.log(`Line: ${fn.line}`)
}
```

### Find Variable Dependencies

```typescript
const analysis = parser.analyze(sourceCode)
const userVariable = analysis.variables.find(v => v.name === 'user')
console.log(`Variable '${userVariable?.name}' is at line ${userVariable?.line}`)
```

### Parse TypeScript Features

```typescript
const parser = new Parser({
  plugins: ['typescript', 'jsx', 'decorators-legacy']
})

const ast = parser.parse(`
  @decorator
  class MyClass {
    private name: string
    constructor(name: string) {
      this.name = name
    }
  }
`)
```

## Source Map Integration

```typescript
import { SourceMapConsumer } from 'source-map'

const parser = new Parser()
const sourceMapData = {
  version: 3,
  sources: ['app.ts'],
  mappings: '...'
}

const ast = parser.parse(sourceCode, {
  sourceMap: sourceMapData
})

// Map compiled line back to original
const originalLine = parser.mapLineToOriginal(10, sourceMapData)
```

## Error Handling

```typescript
try {
  const ast = parser.parse(invalidCode)
} catch (error) {
  if (error instanceof SyntaxError) {
    console.error(`Syntax error at line ${error.loc.line}`)
  }
}
```

## Performance Considerations

For large files, use streaming:

```typescript
const parser = new Parser()

// For very large files, parse in chunks
const chunks = splitFileIntoChunks(largeFile, 1000)
for (const chunk of chunks) {
  const ast = parser.parse(chunk)
  processAST(ast)
}
```

## Caching

Cache parsed ASTs for reuse:

```typescript
const cache = new Map<string, AST>()

function parseWithCache(code: string, filePath: string) {
  if (cache.has(filePath)) {
    return cache.get(filePath)!
  }

  const ast = parser.parse(code)
  cache.set(filePath, ast)
  return ast
}
```

## Configuration

Default parser configuration supports:
- TypeScript syntax
- JSX/TSX
- ES2024+ features
- Decorators (legacy and stage 3)
- Flow type annotations

## Integration with Other APIs

The Parser is typically used with:

- **Injector** - Uses AST to inject code
- **Capture** - Analyzes variables for capture

```typescript
const parser = new Parser()
const injector = new Injector()

const ast = parser.parse(sourceCode)
const analysis = parser.analyze(sourceCode)
const modified = injector.inject(ast, analysis, tracepoints)
```

## Troubleshooting

### Syntax Errors

If parsing fails:

```typescript
try {
  const ast = parser.parse(sourceCode)
} catch (error) {
  console.error('Parse error:', error.message)
  console.error('Location:', error.loc)
}
```

### Unsupported Syntax

Ensure you have the right plugins:

```typescript
const parser = new Parser({
  plugins: ['typescript', 'jsx', 'decorators-legacy']
})
```

### Performance Issues

For large codebases:
1. Cache parsing results
2. Parse files independently
3. Use worker threads for parallel parsing
