# esbuild Plugin

Integrate TraceInject into your esbuild build process.

## Installation

```bash
npm install --save-dev @trace-inject/esbuild-plugin
```

## Basic Configuration

Use the plugin with esbuild:

```javascript
import * as esbuild from 'esbuild'
import { traceInjectPlugin } from '@trace-inject/esbuild-plugin'

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  plugins: [
    traceInjectPlugin({
      configPath: './tracepoint-config.json'
    })
  ]
})
```

## Configuration Options

```javascript
traceInjectPlugin({
  // Path to configuration file
  configPath: './tracepoint-config.json',

  // Enable/disable plugin
  enabled: true,

  // Environment
  environment: 'production',

  // Include only certain files
  include: ['src/**/*.ts'],

  // Exclude files from instrumentation
  exclude: ['node_modules/**'],

  // Remote configuration
  remoteConfig: {
    enabled: false,
    endpoint: 'https://config.example.com/api/config'
  },

  // Verbose logging
  verbose: false
})
```

## Full Example

Complete esbuild configuration:

```javascript
import * as esbuild from 'esbuild'
import { traceInjectPlugin } from '@trace-inject/esbuild-plugin'

const isProduction = process.env.NODE_ENV === 'production'

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: isProduction,
  sourcemap: true,
  outfile: 'dist/bundle.js',
  target: ['ES2020'],
  plugins: [
    traceInjectPlugin({
      configPath: './tracepoint-config.json',
      enabled: isProduction
    })
  ]
})
```

## Watch Mode

For development with watch:

```javascript
import * as esbuild from 'esbuild'
import { traceInjectPlugin } from '@trace-inject/esbuild-plugin'

const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  sourcemap: true,
  plugins: [
    traceInjectPlugin({
      configPath: './tracepoint-config.json',
      enabled: false // Disable in watch mode
    })
  ]
})

await ctx.watch()
console.log('Watching for changes...')
```

## Serve Mode

For development server:

```javascript
import * as esbuild from 'esbuild'
import { traceInjectPlugin } from '@trace-inject/esbuild-plugin'

const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  sourcemap: true,
  plugins: [
    traceInjectPlugin({
      configPath: './tracepoint-config.json',
      enabled: false
    })
  ]
})

const { host, port } = await ctx.serve({
  servedir: 'dist'
})

console.log(`Serving on ${host}:${port}`)
```

## Multiple Entry Points

For multiple outputs:

```javascript
import * as esbuild from 'esbuild'
import { traceInjectPlugin } from '@trace-inject/esbuild-plugin'

await esbuild.build({
  entryPoints: [
    'src/index.ts',
    'src/cli.ts',
    'src/server.ts'
  ],
  bundle: false,
  outdir: 'dist',
  sourcemap: true,
  plugins: [
    traceInjectPlugin({
      configPath: './tracepoint-config.json'
    })
  ]
})
```

## Environment-Specific

```javascript
import * as esbuild from 'esbuild'
import { traceInjectPlugin } from '@trace-inject/esbuild-plugin'

const isProduction = process.env.NODE_ENV === 'production'
const configPath = isProduction
  ? './tracepoint-config.prod.json'
  : './tracepoint-config.dev.json'

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  minify: isProduction,
  sourcemap: true,
  plugins: [
    traceInjectPlugin({
      configPath,
      enabled: isProduction
    })
  ]
})
```

## TypeScript Configuration

```javascript
import * as esbuild from 'esbuild'
import { traceInjectPlugin } from '@trace-inject/esbuild-plugin'

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx'
  },
  sourcemap: true,
  plugins: [
    traceInjectPlugin({
      configPath: './tracepoint-config.json'
    })
  ]
})
```

## NPM Script Integration

In `package.json`:

```json
{
  "scripts": {
    "build": "node build.js",
    "dev": "node build.js --watch",
    "serve": "node build.js --serve"
  }
}
```

In `build.js`:

```javascript
import * as esbuild from 'esbuild'
import { traceInjectPlugin } from '@trace-inject/esbuild-plugin'

const isProduction = process.env.NODE_ENV === 'production'
const isWatch = process.argv.includes('--watch')
const isServe = process.argv.includes('--serve')

const baseConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  sourcemap: true,
  minify: isProduction,
  plugins: [
    traceInjectPlugin({
      configPath: './tracepoint-config.json',
      enabled: isProduction
    })
  ]
}

if (isServe) {
  const ctx = await esbuild.context(baseConfig)
  const { host, port } = await ctx.serve({ servedir: 'dist' })
  console.log(`Serving on ${host}:${port}`)
} else if (isWatch) {
  const ctx = await esbuild.context(baseConfig)
  await ctx.watch()
  console.log('Watching for changes...')
} else {
  await esbuild.build(baseConfig)
  console.log('Build complete')
}
```

## Source Maps

Enable source maps:

```javascript
await esbuild.build({
  sourcemap: true,
  sourceRoot: 'https://example.com/src',
  plugins: [
    traceInjectPlugin({
      configPath: './tracepoint-config.json'
    })
  ]
})
```

## Troubleshooting

### Plugin not found

Install the plugin:

```bash
npm install --save-dev @trace-inject/esbuild-plugin
```

### Configuration file not found

Verify the path is relative to your project root:

```javascript
// Correct
configPath: './tracepoint-config.json'

// Incorrect
configPath: '/absolute/path/config.json'
```

### Build fails silently

Enable verbose logging:

```javascript
traceInjectPlugin({
  configPath: './tracepoint-config.json',
  verbose: true
})
```

## Performance Tips

1. **Disable in watch mode** - Set `enabled: false` during development
2. **Production builds only** - Use only for production builds
3. **Minimal tracepoints** - Keep configuration small
4. **Exclude node_modules** - Always exclude dependencies
