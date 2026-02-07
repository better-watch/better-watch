# Next.js TraceInject Example

This example demonstrates how to integrate TraceInject's remote debugging capabilities into a Next.js application. It showcases build-time instrumentation, runtime trace capture, and real-time trace visualization.

## Features

- 🔍 **Build-time Instrumentation** - Tracepoints are injected during the build process
- 📡 **Remote Trace Server** - View traces in real-time via terminal or web dashboard
- ⚡ **Server Components** - Full support for Next.js App Router and Server Components
- 🎯 **API Route Tracing** - Automatic capture of API route parameters and responses
- 🔐 **Sensitive Data Redaction** - Built-in protection for passwords, tokens, and keys

## Quick Start

### 1. Build the Core Package

First, ensure the TraceInject core package is built:

```bash
# From the repository root
npm install
npm run build
```

### 2. Install Example Dependencies

```bash
# From this directory (examples/nextjs-app)
npm install
```

### 3. Start the Trace Server

In one terminal, start the trace server to receive and display traces:

```bash
npm run trace-server
```

You should see:

```
   🔍 TraceInject Trace Server          

Server running at http://localhost:4444
Waiting for traces from Next.js app...
──────────────────────────────────────────────────
```

### 4. Start the Next.js App

In another terminal, start the development server:

```bash
npm run dev
```

### 5. Trigger Traces

Open [http://localhost:3000](http://localhost:3000) in your browser. You can:

- **View the page** - Automatically traces `getProducts()` and `getStats()`
- **Search products** - Enter a search term and see traces for `searchProducts()`
- **Click "Trigger Demo Trace"** - Fires multiple trace operations at once

Watch the trace server terminal to see traces appearing in real-time!

## How It Works

### Tracepoint Configuration

Tracepoints are defined in `tracepoint-config.json`:

```json
{
  "tracepoints": [
    {
      "id": "tp-getProducts",
      "filePath": "lib/data.ts",
      "type": "entry",
      "functionName": "getProducts",
      "enabled": true,
      "code": "__trace__('getProducts-entry', { timestamp: Date.now() })"
    }
  ]
}
```

Each tracepoint specifies:
- **filePath** - Where to inject the trace
- **type** - `entry`, `exit`, `before`, or `after`
- **functionName** or **lineNumber** - Which function or line to instrument
- **code** - The trace capture code to inject

### Runtime Trace Capture

The `lib/trace.ts` module initializes the trace buffer and configures automatic export:

```typescript
initializeTraceBuffer({
  maxSize: 500,
  flushInterval: 3000, // Send traces every 3 seconds
  onFlush: async (traces) => {
    await fetch('http://localhost:4444/api/traces', {
      method: 'POST',
      body: JSON.stringify({ traces }),
    });
  },
});
```

### Next.js Integration

The `instrumentation.ts` file hooks into Next.js's instrumentation API to initialize tracing when the server starts:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeTracing } = await import('./lib/trace');
    initializeTracing();
  }
}
```

## Project Structure

```
examples/nextjs-app/
├── app/
│   ├── api/
│   │   ├── demo-trace/route.ts  # Demo endpoint that triggers traces
│   │   └── search/route.ts       # Search API with tracing
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.module.css
│   └── page.tsx                  # Main page with traced data fetching
├── components/
│   ├── ProductCard.tsx
│   ├── StatsPanel.tsx
│   └── TraceDemo.tsx             # Interactive trace triggering
├── lib/
│   ├── data.ts                   # Sample data functions (traced)
│   └── trace.ts                  # TraceInject runtime initialization
├── instrumentation.ts            # Next.js instrumentation hook
├── next.config.ts                # Next.js + TraceInject configuration
├── trace-server.mjs              # Simple trace receiver server
└── tracepoint-config.json        # Tracepoint definitions
```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TRACE_SERVER_URL` | `http://localhost:4444` | URL of the trace server |
| `TRACE_PROJECT_ID` | `nextjs-example` | Project identifier for traces |
| `TRACE_API_KEY` | `demo-api-key` | API key for authentication |
| `TRACE_ENABLED` | `true` | Enable/disable tracing |

### Capture Settings

In `tracepoint-config.json`:

```json
{
  "capture": {
    "maxDepth": 3,
    "maxArrayLength": 50,
    "maxCaptureSize": 10240,
    "sensitivePatterns": ["password", "secret", "token"]
  }
}
```

## Web Dashboard

The trace server includes a simple web dashboard. Open [http://localhost:4444](http://localhost:4444) to view recent traces in your browser.

## Production Deployment

For production use, you would:

1. **Deploy the trace server** - Use the full TraceInject ingestion API with database storage
2. **Configure remote config** - Enable dynamic tracepoint updates without rebuilds
3. **Set environment variables** - Configure the trace endpoint and API keys
4. **Enable server-only mode** - Avoid instrumenting client-side code

```typescript
// next.config.ts (production)
import withTraceInject from '@trace-inject/nextjs';

export default withTraceInject({
  configPath: './tracepoint-config.json',
  serverOnly: true,
  remoteConfig: {
    enabled: true,
    endpoint: process.env.TRACE_CONFIG_ENDPOINT,
    apiKey: process.env.TRACE_API_KEY,
  },
})(nextConfig);
```

## Troubleshooting

### Traces not appearing

1. Ensure the trace server is running on port 4444
2. Check the Next.js console for `[TraceInject] Initialized` message
3. Verify no CORS errors in the browser console

### Build errors

1. Make sure the core package is built: `npm run build` from root
2. Clear Next.js cache: `rm -rf .next`
3. Reinstall dependencies: `rm -rf node_modules && npm install`

### Performance

TraceInject is designed for minimal overhead:
- Traces are buffered and sent in batches
- Failed trace sends don't affect app performance
- Disable tracing in tests with `TRACE_ENABLED=false`
