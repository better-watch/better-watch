# Environment Variables

Override TraceInject configuration using environment variables.

## Overview

Environment variables allow you to configure TraceInject without modifying configuration files, useful for CI/CD pipelines and containerized environments.

## Variable Reference

### Core Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `TRACE_INJECT_ENABLED` | Enable/disable TraceInject | `true` |
| `TRACE_INJECT_CONFIG_PATH` | Path to configuration file | `./tracepoint-config.json` |
| `TRACE_INJECT_ENV` | Environment name | `development` |

### Server Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `TRACE_INJECT_PORT` | Port for collection server | `3000` |
| `TRACE_INJECT_HOST` | Host to bind to | `localhost` |
| `TRACE_INJECT_PATH` | API path for traces | `/api/traces` |
| `TRACE_INJECT_STORAGE` | Storage backend | `memory` |

### Capture Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `TRACE_INJECT_MAX_DEPTH` | Max object depth | `5` |
| `TRACE_INJECT_MAX_ARRAY_LENGTH` | Max array items | `100` |
| `TRACE_INJECT_MAX_STRING_LENGTH` | Max string length | `1000` |
| `TRACE_INJECT_MAX_SIZE` | Max total capture size | `10485760` (10MB) |
| `TRACE_INJECT_SAMPLE_RATE` | Sampling rate (0-1) | `1.0` |

### Redaction Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `TRACE_INJECT_REDACTION_ENABLED` | Enable redaction | `true` |
| `TRACE_INJECT_REDACTION_VALUE` | Redaction placeholder | `[REDACTED]` |
| `TRACE_INJECT_SENSITIVE_FIELDS` | Comma-separated sensitive fields | `password,secret,token,apiKey` |

### Remote Configuration

| Variable | Description |
|----------|-------------|
| `TRACE_INJECT_REMOTE_ENABLED` | Enable remote config |
| `TRACE_INJECT_REMOTE_ENDPOINT` | Remote config endpoint |
| `TRACE_INJECT_REMOTE_API_KEY` | API key for remote config |
| `TRACE_INJECT_REMOTE_REFRESH_INTERVAL` | Refresh interval (ms) |

## Usage Examples

### Enable TraceInject for Production

```bash
TRACE_INJECT_ENABLED=true npm start
```

### Set Custom Server Port

```bash
TRACE_INJECT_PORT=8000 npm start
```

### Configure Redaction

```bash
TRACE_INJECT_REDACTION_ENABLED=true \
TRACE_INJECT_SENSITIVE_FIELDS="password,apiKey,secret,token" \
npm start
```

### Set Capture Limits

```bash
TRACE_INJECT_MAX_DEPTH=3 \
TRACE_INJECT_MAX_ARRAY_LENGTH=50 \
TRACE_INJECT_MAX_SIZE=5242880 \
npm start
```

### Enable Remote Configuration

```bash
TRACE_INJECT_REMOTE_ENABLED=true \
TRACE_INJECT_REMOTE_ENDPOINT=https://config.example.com/api/config \
TRACE_INJECT_REMOTE_API_KEY=secret-key \
npm start
```

### Development Setup

```bash
TRACE_INJECT_ENV=development \
TRACE_INJECT_PORT=3000 \
TRACE_INJECT_REDACTION_ENABLED=false \
npm run dev
```

### Staging Environment

```bash
TRACE_INJECT_ENV=staging \
TRACE_INJECT_REDACTION_ENABLED=true \
TRACE_INJECT_REMOTE_ENABLED=true \
TRACE_INJECT_REMOTE_ENDPOINT=$CONFIG_ENDPOINT \
npm start
```

### Production Environment

```bash
TRACE_INJECT_ENV=production \
TRACE_INJECT_PORT=3000 \
TRACE_INJECT_REDACTION_ENABLED=true \
TRACE_INJECT_REMOTE_ENABLED=true \
TRACE_INJECT_SAMPLE_RATE=0.1 \
npm start
```

## Docker Environment

In a Dockerfile:

```dockerfile
FROM node:18

WORKDIR /app
COPY . .

ENV TRACE_INJECT_ENV=production
ENV TRACE_INJECT_PORT=3000
ENV TRACE_INJECT_REDACTION_ENABLED=true

RUN npm ci --only=production

CMD ["npm", "start"]
```

In docker-compose.yml:

```yaml
services:
  app:
    image: myapp:latest
    environment:
      TRACE_INJECT_ENV: production
      TRACE_INJECT_PORT: 3000
      TRACE_INJECT_REDACTION_ENABLED: "true"
      TRACE_INJECT_REMOTE_ENABLED: "true"
      TRACE_INJECT_REMOTE_ENDPOINT: http://config-server:3001/api/config
    ports:
      - "3000:3000"
```

## Kubernetes Configuration

In a Kubernetes manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        env:
        - name: TRACE_INJECT_ENV
          value: "production"
        - name: TRACE_INJECT_REDACTION_ENABLED
          value: "true"
        - name: TRACE_INJECT_REMOTE_ENDPOINT
          valueFrom:
            configMapKeyRef:
              name: trace-config
              key: endpoint
        - name: TRACE_INJECT_REMOTE_API_KEY
          valueFrom:
            secretKeyRef:
              name: trace-secrets
              key: api-key
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy
on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - run: npm start
        env:
          TRACE_INJECT_ENV: production
          TRACE_INJECT_REMOTE_ENABLED: true
          TRACE_INJECT_REMOTE_ENDPOINT: ${{ secrets.TRACE_CONFIG_ENDPOINT }}
          TRACE_INJECT_REMOTE_API_KEY: ${{ secrets.TRACE_API_KEY }}
```

### GitLab CI

```yaml
deploy:
  script:
    - npm ci
    - npm run build
    - npm start
  environment:
    TRACE_INJECT_ENV: production
    TRACE_INJECT_REDACTION_ENABLED: "true"
  secrets:
    TRACE_INJECT_REMOTE_ENDPOINT: trace_config_endpoint
    TRACE_INJECT_REMOTE_API_KEY: trace_api_key
```

## Priority & Merging

Environment variables override configuration file values:

```
Environment Variables > Configuration File > Defaults
```

If both are set:
```bash
# This environment variable takes precedence
TRACE_INJECT_MAX_DEPTH=3 npm start
```

Even if `tracepoint-config.json` contains:
```json
{
  "capture": {
    "maxObjectDepth": 5
  }
}
```

The effective value is `3`.

## Debugging

To see which environment variables are being used:

```bash
TRACE_INJECT_DEBUG=true npm start
```

This logs:
- Loaded environment variables
- Configuration values
- Which values came from which source
- Effective final configuration

## Best Practices

1. **Use for sensitive values** - API keys, endpoints, secrets
2. **Document all variables** - Keep track of what's available
3. **Use defaults** - Provide sensible defaults in code
4. **Validate** - Validate environment variables on startup
5. **Don't commit secrets** - Never commit API keys in files
6. **Use .env files locally** - For development only
7. **Version variables** - Document when variables were added/changed
