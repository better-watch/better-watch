# Getting Started with TraceInject

TraceInject is a build-time dynamic instrumentation system for TypeScript applications. It allows you to inject tracepoints during the build process to capture variable values at runtime without modifying your source code.

## Why TraceInject?

Traditional runtime instrumentation solutions like Datadog DDTrace use Chrome DevTools Protocol (CDP), which has significant limitations:

- ❌ Does not work in Lambda/serverless environments
- ❌ Not supported by Bun runtime
- ❌ Performance overhead from debugging protocol
- ❌ Security concerns with production debugging enabled

TraceInject solves these problems by:

- ✅ Injecting instrumentation code during build (CI/CD)
- ✅ Working in ALL runtimes (Node.js, Bun, Deno, Lambda, Edge)
- ✅ Supporting remote configuration for dynamic tracepoint management
- ✅ Capturing variable values at specified code locations
- ✅ Zero runtime dependencies on debugging protocols

## Key Concepts

### Tracepoints
A tracepoint is a location in your code where you want to capture data. You define tracepoints by specifying:
- File path or pattern
- Line number (or range)
- Variables or expressions to capture

### Build-time Injection
During your build process, TraceInject's AST transformer:
1. Parses your TypeScript/JavaScript files
2. Locates tracepoints matching your configuration
3. Injects instrumentation code that captures variables
4. Generates source maps for debugging

### Remote Configuration
Instead of rebuilding your application, you can:
1. Deploy your application with TraceInject enabled
2. Manage tracepoints through a configuration API
3. Enable/disable/modify tracepoints without redeployment

## Installation

See the [Installation](./installation) page for detailed setup instructions.

## Quick Start

See the [Quick Start](./quick-start) guide to get a simple example running in minutes.

## Next Steps

- Learn about [Tracepoints](./tracepoints) in detail
- Configure [Variable Capture](./variable-capture)
- Set up your first [Plugin](../plugins/webpack) integration
- Integrate with your [Framework](../frameworks/nextjs)
