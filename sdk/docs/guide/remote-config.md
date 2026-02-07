# Remote Configuration

Manage tracepoints dynamically without rebuilding your application.

## Overview

Remote configuration allows you to fetch tracepoints and other settings from a remote server, enabling dynamic updates to your instrumentation without redeployment.

## Enabling Remote Configuration

Add remote configuration to your setup:

```json
{
  "remoteConfig": {
    "enabled": true,
    "endpoint": "https://config.example.com/api/config",
    "apiKey": "your-api-key",
    "refreshInterval": 60000
  }
}
```

## Basic Setup

1. **Configure the endpoint** - Point to your configuration server
2. **Set API key** - For authentication
3. **Set refresh interval** - How often to fetch updates

```json
{
  "remoteConfig": {
    "enabled": true,
    "endpoint": "http://localhost:3000/api/config",
    "refreshInterval": 30000
  }
}
```

## Configuration Server API

Your server should implement these endpoints:

### GET /api/config

Fetch the current configuration:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://config.example.com/api/config
```

Response:
```json
{
  "tracepoints": [
    {
      "filePath": "src/app.ts",
      "lineNumber": 10,
      "variables": ["count"]
    }
  ],
  "capture": {
    "maxObjectDepth": 5,
    "maxArrayLength": 100
  },
  "redaction": {
    "enabled": true
  }
}
```

### POST /api/config

Update configuration (if your server supports it):

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tracepoints": [...]}' \
  https://config.example.com/api/config
```

## Configuration Hierarchy

Remote configuration merges with local configuration:

```json
{
  "remoteConfig": {
    "enabled": true,
    "endpoint": "https://config.example.com/api/config",
    "merge": "deep"
  },
  "tracepoints": [
    {
      "filePath": "src/local.ts",
      "lineNumber": 5,
      "variables": ["test"]
    }
  ]
}
```

Local tracepoints are merged with remote tracepoints:
- `merge: "deep"` - Merge arrays and objects (default)
- `merge: "shallow"` - Remote completely replaces local
- `merge: "local-priority"` - Local takes precedence

## Refresh Interval

Control how often to fetch updates:

```json
{
  "remoteConfig": {
    "refreshInterval": 60000
  }
}
```

- `60000` - Check every minute
- `300000` - Check every 5 minutes
- `0` - Never auto-refresh (manual refresh only)

## Manual Refresh

Trigger configuration refresh programmatically:

```typescript
import { TraceInjectCore } from '@trace-inject/core';

const traceInject = new TraceInjectCore();

// Manually fetch fresh configuration
await traceInject.refreshConfig();
```

## Fallback Strategy

If remote configuration fails, TraceInject falls back to local config:

```json
{
  "remoteConfig": {
    "enabled": true,
    "endpoint": "https://config.example.com/api/config",
    "fallback": "local",
    "timeout": 5000
  }
}
```

Options:
- `fallback: "local"` - Use local config if remote fails (recommended)
- `fallback: "none"` - Disable tracing if remote fails
- `fallback: "last-known"` - Use last successful remote config

## Authentication

Configure API key authentication:

```json
{
  "remoteConfig": {
    "apiKey": "your-api-key-here"
  }
}
```

Headers sent to remote server:
```
Authorization: Bearer your-api-key-here
```

For custom authentication:

```json
{
  "remoteConfig": {
    "headers": {
      "Authorization": "Custom-Auth-Scheme token123",
      "X-Custom-Header": "value"
    }
  }
}
```

## SSL/TLS Configuration

For HTTPS endpoints:

```json
{
  "remoteConfig": {
    "endpoint": "https://config.example.com/api/config",
    "ssl": {
      "rejectUnauthorized": false
    }
  }
}
```

## Environment-Specific Configuration

Different remotes for different environments:

```json
{
  "remoteConfig": {
    "endpoints": {
      "development": "http://localhost:3000/api/config",
      "staging": "https://config-staging.example.com/api/config",
      "production": "https://config.example.com/api/config"
    }
  }
}
```

Or use environment variables:

```bash
TRACE_INJECT_REMOTE_ENDPOINT=https://config.example.com/api/config npm start
```

## Configuration Validation

Remote configuration is validated before application:

```json
{
  "remoteConfig": {
    "validate": true,
    "schema": {
      "type": "object",
      "properties": {
        "tracepoints": { "type": "array" },
        "redaction": { "type": "object" }
      }
    }
  }
}
```

## Example Implementation

Here's a simple Node.js server for remote configuration:

```typescript
import express from 'express';

const app = express();

const configs = {
  default: {
    tracepoints: [
      {
        filePath: 'src/**/*.ts',
        lineNumber: 10,
        variables: ['request']
      }
    ],
    redaction: { enabled: true }
  }
};

app.get('/api/config', (req, res) => {
  const apiKey = req.headers['authorization']?.split(' ')[1];

  if (apiKey !== process.env.TRACE_INJECT_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json(configs.default);
});

app.listen(3000);
```

## Metrics & Monitoring

Track remote configuration updates:

```json
{
  "remoteConfig": {
    "metrics": {
      "enabled": true,
      "logFetches": true,
      "logErrors": true,
      "logMerges": true
    }
  }
}
```

Monitor:
- Configuration fetch frequency
- Fetch failures and error rates
- Configuration merge operations
- Configuration change frequency

## Best Practices

1. **Use environment variables** - Keep API keys out of configuration files
2. **Implement caching** - Cache remote config locally to reduce requests
3. **Version your config** - Track configuration versions
4. **Test carefully** - Test remote config changes in staging first
5. **Monitor updates** - Track when and how often config changes
6. **Implement timeouts** - Prevent hung requests
7. **Have fallbacks** - Always have a working local config backup

## Troubleshooting

### Configuration not updating

1. Check the remote endpoint is accessible
2. Verify API key is correct
3. Check refresh interval is set appropriately
4. Verify remote config is valid JSON
5. Check logs for fetch errors

### Authorization failures

1. Verify API key format matches server expectations
2. Check Authorization header format
3. Verify server is checking the correct header
4. Check for expired tokens if using JWT

### Performance degradation

1. Increase refresh interval
2. Cache remote config locally
3. Reduce configuration size
4. Move to a faster server
5. Use CDN for configuration delivery
