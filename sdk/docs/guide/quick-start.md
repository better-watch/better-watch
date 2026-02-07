# Quick Start

Get up and running with TraceInject in 5 minutes.

## Step 1: Create a Simple Application

Create a file `app.ts`:

```typescript
function calculateTotal(items: Array<{ price: number; quantity: number }>) {
  let total = 0;

  for (const item of items) {
    total += item.price * item.quantity;
  }

  return total;
}

const items = [
  { price: 10, quantity: 2 },
  { price: 20, quantity: 1 },
];

console.log('Total:', calculateTotal(items));
```

## Step 2: Create Tracepoint Configuration

Create a file `tracepoint-config.json`:

```json
{
  "tracepoints": [
    {
      "filePath": "app.ts",
      "lineNumber": 3,
      "variables": ["items", "total"],
      "labelPrefix": "calculateTotal"
    }
  ],
  "redaction": {
    "enabled": true,
    "sensitiveFields": ["password", "secret", "token", "apiKey"]
  },
  "capture": {
    "maxObjectDepth": 5,
    "maxArrayLength": 100,
    "maxStringLength": 1000
  }
}
```

## Step 3: Build with Instrumentation

Choose your build tool and follow the corresponding guide:

- [Webpack Plugin](../plugins/webpack)
- [Vite Plugin](../plugins/vite)
- [Rollup Plugin](../plugins/rollup)
- [esbuild Plugin](../plugins/esbuild)
- [TypeScript Plugin](../plugins/typescript)

### Example with Webpack

In your `webpack.config.js`:

```javascript
const TraceInjectPlugin = require('@trace-inject/webpack-plugin');

module.exports = {
  entry: './app.ts',
  output: { filename: 'bundle.js' },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
      },
    ],
  },
  plugins: [
    new TraceInjectPlugin({
      configPath: './tracepoint-config.json',
    }),
  ],
};
```

## Step 4: Run Your Application

```bash
webpack build
node dist/bundle.js
```

Your application will now capture the specified variables at the tracepoint locations.

## Step 5: Access Trace Data

Trace data is available through:

1. **Runtime Collection** - The injected code captures and stores trace data
2. **Trace Server** - Configure a collection endpoint to send traces

```typescript
import { startTraceServer } from '@trace-inject/core';

startTraceServer({
  port: 3000,
  storage: 'memory',
});
```

## What's Next?

- Learn about [Tracepoints](./tracepoints) in detail
- Configure [Variable Capture](./variable-capture) options
- Set up [Remote Configuration](./remote-config)
- Integrate with your [Framework](../frameworks/nextjs)
- Read the [API Reference](../api/overview)

## Troubleshooting

Having issues? Check the [Common Issues](../troubleshooting/common-issues) guide.
