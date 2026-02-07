# Installation

## Prerequisites

- Node.js 18.0.0 or higher
- npm, yarn, pnpm, or bun as your package manager

## Core Package

Install the core TraceInject package:

::: code-group
```bash [npm]
npm install @trace-inject/core
```

```bash [yarn]
yarn add @trace-inject/core
```

```bash [pnpm]
pnpm add @trace-inject/core
```

```bash [bun]
bun add @trace-inject/core
```
:::

## Build Tool Plugin

Choose and install the plugin for your build tool:

### Webpack

::: code-group
```bash [npm]
npm install --save-dev @trace-inject/webpack-plugin
```

```bash [yarn]
yarn add --dev @trace-inject/webpack-plugin
```
:::

### Vite

::: code-group
```bash [npm]
npm install --save-dev @trace-inject/vite-plugin
```

```bash [yarn]
yarn add --dev @trace-inject/vite-plugin
```
:::

### Rollup

::: code-group
```bash [npm]
npm install --save-dev @trace-inject/rollup-plugin
```

```bash [yarn]
yarn add --dev @trace-inject/rollup-plugin
```
:::

### esbuild

::: code-group
```bash [npm]
npm install --save-dev @trace-inject/esbuild-plugin
```

```bash [yarn]
yarn add --dev @trace-inject/esbuild-plugin
```
:::

### TypeScript

::: code-group
```bash [npm]
npm install --save-dev @trace-inject/ts-plugin
```

```bash [yarn]
yarn add --dev @trace-inject/ts-plugin
```
:::

## Framework Integration (Optional)

If you're using a framework, you can install a framework-specific integration:

::: code-group

```bash [Next.js]
npm install --save-dev @trace-inject/nextjs
```

```bash [Nuxt]
npm install --save-dev @trace-inject/nuxt
```

```bash [Hono]
npm install @trace-inject/hono
```

```bash [Remix]
npm install --save-dev @trace-inject/remix
```

```bash [Express]
npm install @trace-inject/express
```

:::

## Minimal Setup

Once installed, you need to:

1. **Configure your build tool** - Add the TraceInject plugin to your build configuration
2. **Define tracepoints** - Create a configuration file specifying where to inject tracepoints
3. **Set up collection** - Configure where trace data is sent

See the [Quick Start](./quick-start) guide for step-by-step setup instructions.

## Verifying Installation

To verify that TraceInject is installed correctly:

```bash
npm list @trace-inject/core
```

This should display the installed version.

## Troubleshooting

### Installation fails with peer dependency errors

Some plugins have peer dependencies. Install the required peer dependencies:

```bash
npm install --save-dev @babel/core typescript
```

### Build tool plugin not found

Make sure you've installed both:
1. The core package: `@trace-inject/core`
2. The plugin for your specific build tool

Refer to the [Troubleshooting](../troubleshooting/common-issues) guide for more help.
