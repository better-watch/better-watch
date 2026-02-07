# Configuration Reference

Complete reference for TraceInject configuration options.

## Configuration Structure

TraceInject uses a JSON configuration file (default: `tracepoint-config.json`).

```json
{
  "tracepoints": [],
  "redaction": {},
  "capture": {},
  "server": {},
  "project": {},
  "environment": {}
}
```

## Tracepoints

Define where to inject instrumentation code.

```json
{
  "tracepoints": [
    {
      "filePath": "src/app.ts",
      "lineNumber": 10,
      "variables": ["count", "result"],
      "labelPrefix": "myFunction"
    }
  ]
}
```

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `filePath` | string | Yes | Path to the file (relative to project root). Supports glob patterns. |
| `lineNumber` | number | Yes | Line number where tracepoint is injected. |
| `variables` | string[] | Yes | List of variable names to capture at this location. |
| `labelPrefix` | string | No | Prefix for trace labels. Defaults to function name if detectable. |
| `condition` | string | No | Optional JavaScript expression that must evaluate to true to capture. |

### Examples

```json
{
  "tracepoints": [
    {
      "filePath": "src/services/*.ts",
      "lineNumber": 5,
      "variables": ["request", "response"]
    },
    {
      "filePath": "src/utils/calculator.ts",
      "lineNumber": 15,
      "variables": ["total"],
      "condition": "total > 1000"
    }
  ]
}
```

## Redaction

Configure sensitive data redaction.

```json
{
  "redaction": {
    "enabled": true,
    "sensitiveFields": ["password", "secret", "apiKey", "token"],
    "sensitivePatterns": ["^(.*)?token(.*)?$"],
    "redactionValue": "[REDACTED]"
  }
}
```

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `enabled` | boolean | No | Enable/disable redaction. Defaults to `true`. |
| `sensitiveFields` | string[] | No | List of field names to redact. Case-insensitive. |
| `sensitivePatterns` | string[] | No | Regex patterns for fields to redact. |
| `redactionValue` | string | No | Value to replace sensitive data. Defaults to `[REDACTED]`. |

## Capture

Configure how variables are captured.

```json
{
  "capture": {
    "maxObjectDepth": 5,
    "maxArrayLength": 100,
    "maxStringLength": 1000,
    "maxTotalSize": 10485760
  }
}
```

### Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `maxObjectDepth` | number | No | 5 | Maximum depth for nested object serialization. |
| `maxArrayLength` | number | No | 100 | Maximum array items to capture. |
| `maxStringLength` | number | No | 1000 | Maximum string length before truncation. |
| `maxTotalSize` | number | No | 10MB | Maximum total capture size per trace. |

## Server

Configure the trace collection server.

```json
{
  "server": {
    "enabled": true,
    "port": 3000,
    "host": "localhost",
    "path": "/api/traces",
    "storage": "memory",
    "rateLimit": {
      "enabled": true,
      "maxRequests": 1000,
      "windowMs": 60000
    }
  }
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | boolean | Enable/disable the collection server. |
| `port` | number | Port to run the server on. |
| `host` | string | Host to bind to (default: localhost). |
| `path` | string | API path for trace submissions. |
| `storage` | string | Storage backend: `memory`, `file`, `database`. |

## Project

Project metadata.

```json
{
  "project": {
    "name": "my-app",
    "version": "1.0.0",
    "environment": "production"
  }
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Project name for identification. |
| `version` | string | Application version. |
| `environment` | string | Environment: `development`, `staging`, `production`. |

## Environment Variables

Override configuration via environment variables:

```bash
TRACE_INJECT_ENABLED=true
TRACE_INJECT_PORT=3000
TRACE_INJECT_MAX_DEPTH=10
TRACE_INJECT_REDACTION_ENABLED=true
```

## Remote Configuration

Override local configuration with remote server:

```json
{
  "remoteConfig": {
    "enabled": true,
    "endpoint": "https://config.example.com/api/config",
    "refreshInterval": 60000,
    "apiKey": "your-api-key"
  }
}
```

See [Remote Configuration](./remote-config) for details.
