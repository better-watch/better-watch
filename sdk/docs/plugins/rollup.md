# Rollup Plugin

Integrate TraceInject into your Rollup build process.

## Installation

```bash
npm install --save-dev @trace-inject/rollup-plugin
```

## Basic Configuration

Add the plugin to your `rollup.config.js`:

```javascript
import traceInject from '@trace-inject/rollup-plugin'

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/bundle.js',
    format: 'esm'
  },
  plugins: [
    traceInject({
      configPath: './tracepoint-config.json'
    })
  ]
}
```

## Configuration Options

```javascript
traceInject({
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

Complete Rollup configuration with TraceInject:

```javascript
import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import traceInject from '@trace-inject/rollup-plugin'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true
    }
  ],
  external: ['@babel/generator', '@babel/parser'],
  plugins: [
    resolve(),
    typescript({
      tsconfig: false,
      compilerOptions: {
        target: 'ES2020'
      }
    }),
    traceInject({
      configPath: './tracepoint-config.json'
    })
  ]
}
```

## Multiple Configurations

For multiple outputs:

```javascript
const basePlugins = [
  typescript(),
  traceInject({
    configPath: './tracepoint-config.json'
  })
]

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.esm.js',
      format: 'esm'
    },
    {
      file: 'dist/index.cjs',
      format: 'cjs'
    }
  ],
  plugins: basePlugins
}
```

## Environment-Specific

```javascript
const isProduction = process.env.NODE_ENV === 'production'

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/bundle.js',
    format: 'esm'
  },
  plugins: [
    traceInject({
      configPath: isProduction
        ? './tracepoint-config.prod.json'
        : './tracepoint-config.dev.json',
      enabled: isProduction
    })
  ]
}
```

## With TypeScript

```javascript
import typescript from '@rollup/plugin-typescript'
import traceInject from '@trace-inject/rollup-plugin'

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'esm'
  },
  plugins: [
    traceInject({
      configPath: './tracepoint-config.json'
    }),
    typescript({
      sourceMap: true
    })
  ]
}
```

## Library Build

For library distributions:

```javascript
export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      traceInject({
        configPath: './tracepoint-config.json'
      })
    ]
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      traceInject({
        configPath: './tracepoint-config.json'
      })
    ]
  }
]
```

## Source Maps

Enable source maps for accurate trace mapping:

```javascript
export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/bundle.js',
    format: 'esm',
    sourcemap: true
  },
  plugins: [
    traceInject({
      configPath: './tracepoint-config.json'
    })
  ]
}
```

## Tree Shaking

TraceInject works with tree-shaking:

```javascript
export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/bundle.js',
    format: 'esm'
  },
  plugins: [
    traceInject({
      configPath: './tracepoint-config.json'
    })
  ]
}
```

## Troubleshooting

### Plugin not found

Install both core and plugin:

```bash
npm install --save-dev @trace-inject/core @trace-inject/rollup-plugin
```

### Configuration file not loaded

Verify path is relative to project root:

```javascript
// Correct
configPath: './tracepoint-config.json'

// Incorrect
configPath: '../config.json'
```

### Source maps not generated

Enable source map output:

```javascript
export default {
  output: {
    sourcemap: true
  }
}
```

## Performance Tips

1. **Minimal tracepoints** - Keep the number of tracepoints small
2. **Specific file patterns** - Use exact paths when possible
3. **Production builds only** - Disable for development
4. **Use exclude patterns** - Prevent instrumenting unnecessary files
