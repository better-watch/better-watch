# TypeScript Plugin

Integrate TraceInject into TypeScript compiler directly.

## Installation

```bash
npm install --save-dev @trace-inject/ts-plugin
```

## Basic Configuration

Add the plugin to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@trace-inject/ts-plugin",
        "configPath": "./tracepoint-config.json"
      }
    ]
  }
}
```

## Configuration Options

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@trace-inject/ts-plugin",
        "configPath": "./tracepoint-config.json",
        "enabled": true,
        "environment": "production",
        "include": ["src/**/*.ts"],
        "exclude": ["node_modules/**"],
        "verbose": false,
        "remoteConfig": {
          "enabled": false,
          "endpoint": "https://config.example.com/api/config"
        }
      }
    ]
  }
}
```

## Full Example

Complete TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "sourceMap": true,
    "plugins": [
      {
        "name": "@trace-inject/ts-plugin",
        "configPath": "./tracepoint-config.json",
        "verbose": false
      }
    ]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Development Configuration

For development without instrumentation:

```json
{
  "compilerOptions": {
    "sourceMap": true,
    "plugins": [
      {
        "name": "@trace-inject/ts-plugin",
        "enabled": false
      }
    ]
  }
}
```

## Production Configuration

For production with instrumentation:

```json
{
  "compilerOptions": {
    "sourceMap": true,
    "declaration": true,
    "plugins": [
      {
        "name": "@trace-inject/ts-plugin",
        "configPath": "./tracepoint-config.prod.json",
        "environment": "production"
      }
    ]
  }
}
```

## Multiple Plugin Configurations

With other TypeScript plugins:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typescript-plugin-css-modules",
        "classNameStrategy": "dashes"
      },
      {
        "name": "@trace-inject/ts-plugin",
        "configPath": "./tracepoint-config.json"
      }
    ]
  }
}
```

## Environment-Specific Configuration

Create separate configurations:

`tsconfig.dev.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "plugins": [
      {
        "name": "@trace-inject/ts-plugin",
        "enabled": false
      }
    ]
  }
}
```

`tsconfig.prod.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "plugins": [
      {
        "name": "@trace-inject/ts-plugin",
        "configPath": "./tracepoint-config.prod.json"
      }
    ]
  }
}
```

Usage:
```bash
# Development
tsc --project tsconfig.dev.json

# Production
tsc --project tsconfig.prod.json
```

## Build Scripts

In `package.json`:

```json
{
  "scripts": {
    "build:dev": "tsc --project tsconfig.dev.json",
    "build:prod": "tsc --project tsconfig.prod.json",
    "build": "tsc"
  }
}
```

## With TypeScript Compiler API

Using the TypeScript compiler API directly:

```typescript
import ts from 'typescript'

const traceInjectPlugin = require('@trace-inject/ts-plugin')

const program = ts.createProgram(
  ['src/index.ts'],
  {
    outDir: 'dist',
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ES2020,
    plugins: [
      {
        name: '@trace-inject/ts-plugin',
        configPath: './tracepoint-config.json'
      }
    ]
  }
)

program.emit()
```

## IDE Support

The plugin works with TypeScript-aware IDEs:
- Visual Studio Code
- WebStorm
- Sublime Text (with TypeScript support)
- Vim (with coc-tsserver)

## Source Maps

Enable source maps for debugging:

```json
{
  "compilerOptions": {
    "sourceMap": true,
    "mapRoot": "./sourcemaps/",
    "plugins": [
      {
        "name": "@trace-inject/ts-plugin",
        "configPath": "./tracepoint-config.json"
      }
    ]
  }
}
```

## Declaration Files

Generate declaration files with instrumentation:

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "plugins": [
      {
        "name": "@trace-inject/ts-plugin",
        "configPath": "./tracepoint-config.json"
      }
    ]
  }
}
```

## Troubleshooting

### Plugin not found

Make sure it's installed:

```bash
npm install --save-dev @trace-inject/ts-plugin
```

### Configuration not applied

Verify plugin is in `compilerOptions.plugins`:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@trace-inject/ts-plugin",
        "configPath": "./tracepoint-config.json"
      }
    ]
  }
}
```

### Compilation errors

1. Enable verbose logging:
   ```json
   {
     "verbose": true
   }
   ```

2. Check configuration file exists
3. Verify tracepoint configuration is valid

### IDE not recognizing plugin

Restart the TypeScript server in your IDE:
- VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"
- WebStorm: File → Invalidate Caches → Restart

## Performance Tips

1. **Disable in development** - Use a separate tsconfig for development
2. **Specific file patterns** - Only instrument necessary files
3. **Minimal tracepoints** - Keep configuration size small
4. **Use incremental compilation** - Set `incremental: true`

```json
{
  "compilerOptions": {
    "incremental": true,
    "plugins": [
      {
        "name": "@trace-inject/ts-plugin",
        "configPath": "./tracepoint-config.json"
      }
    ]
  }
}
```
