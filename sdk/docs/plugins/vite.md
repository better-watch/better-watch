# Vite Plugin

Integrate TraceInject into your Vite build process.

## Installation

```bash
npm install --save-dev @trace-inject/vite-plugin
```

## Basic Configuration

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { TraceInjectPlugin } from '@trace-inject/vite-plugin'

export default defineConfig({
  plugins: [
    vue(),
    TraceInjectPlugin({
      configPath: './tracepoint-config.json'
    })
  ]
})
```

## Configuration Options

```typescript
TraceInjectPlugin({
  // Path to configuration file
  configPath: './tracepoint-config.json',

  // Enable/disable plugin
  enabled: true,

  // Environment
  environment: 'production',

  // Include only certain files
  include: ['src/**/*.ts', 'src/**/*.tsx'],

  // Exclude files from instrumentation
  exclude: ['node_modules', 'dist'],

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

Complete Vite configuration with TraceInject:

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import { TraceInjectPlugin } from '@trace-inject/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    TraceInjectPlugin({
      configPath: './tracepoint-config.json',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules']
    })
  ],
  server: {
    port: 3000,
    hmr: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

## With Vue

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { TraceInjectPlugin } from '@trace-inject/vite-plugin'

export default defineConfig({
  plugins: [
    vue(),
    TraceInjectPlugin({
      configPath: './tracepoint-config.json',
      include: ['src/**/*.{ts,tsx,vue}']
    })
  ]
})
```

## With React

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TraceInjectPlugin } from '@trace-inject/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    TraceInjectPlugin({
      configPath: './tracepoint-config.json'
    })
  ]
})
```

## Conditional Configuration

```typescript
import { defineConfig } from 'vite'
import { TraceInjectPlugin } from '@trace-inject/vite-plugin'

export default defineConfig({
  plugins: [
    process.env.NODE_ENV === 'production' ?
      TraceInjectPlugin({
        configPath: './tracepoint-config.json'
      })
      : null
  ].filter(Boolean)
})
```

## Environment-Specific

```typescript
const config = process.env.NODE_ENV === 'production'
  ? './tracepoint-config.prod.json'
  : './tracepoint-config.dev.json'

export default defineConfig({
  plugins: [
    TraceInjectPlugin({
      configPath: config
    })
  ]
})
```

## Development Setup

For development with HMR:

```typescript
export default defineConfig({
  plugins: [
    TraceInjectPlugin({
      configPath: './tracepoint-config.json',
      enabled: false // Disable in dev for faster builds
    })
  ],
  server: {
    middlewareMode: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 24678
    }
  }
})
```

## Source Maps

Ensure source maps are enabled for proper trace mapping:

```typescript
export default defineConfig({
  plugins: [
    TraceInjectPlugin({
      configPath: './tracepoint-config.json'
    })
  ],
  build: {
    sourcemap: true
  }
})
```

## Production Build

Optimize for production:

```typescript
export default defineConfig({
  plugins: [
    TraceInjectPlugin({
      configPath: './tracepoint-config.json',
      environment: 'production'
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: 'hidden',
    minify: 'terser'
  }
})
```

## Troubleshooting

### Plugin not recognized

Make sure it's installed and imported:

```bash
npm install --save-dev @trace-inject/vite-plugin
```

```typescript
import { TraceInjectPlugin } from '@trace-inject/vite-plugin'
```

### Configuration not applied

Verify the plugin is in the plugins array:

```typescript
export default defineConfig({
  plugins: [
    // Other plugins
    TraceInjectPlugin({ configPath: './tracepoint-config.json' })
  ]
})
```

### Build slower than expected

1. Disable in development:
   ```typescript
   enabled: process.env.NODE_ENV === 'production'
   ```

2. Use specific include patterns instead of broad globs

3. Reduce the number of tracepoints

## Performance Tips

1. **Disable in development** - Set `enabled: false` for dev builds
2. **Use specific patterns** - Narrow down which files to instrument
3. **Optimize tracepoints** - Fewer, more targeted tracepoints
4. **Enable caching** - Vite caches automatically
5. **Production builds** - TraceInject is most useful for production builds
