# Redaction & Filtering

Protect sensitive data by automatically redacting or filtering captured variables.

## Overview

Redaction automatically replaces sensitive data with a placeholder value, preventing exposure of passwords, API keys, tokens, and other confidential information.

## Enabling Redaction

Redaction is enabled by default. Configure it in your TraceInject configuration:

```json
{
  "redaction": {
    "enabled": true,
    "sensitiveFields": ["password", "secret", "apiKey", "token"],
    "redactionValue": "[REDACTED]"
  }
}
```

## Sensitive Field Detection

### Field Name Matching

Fields are matched case-insensitively:

```typescript
const user = {
  password: "secret123",        // Redacted
  Password: "secret123",        // Redacted
  PASSWORD: "secret123",        // Redacted
  userPassword: "secret123",    // Redacted
  passwordHash: "abc123"        // Redacted
};
```

### Partial Matching

Fields containing sensitive keywords are redacted:

```typescript
const data = {
  email: "user@example.com",        // Not redacted
  email_secret: "secret",           // Redacted
  secret_email: "secret",           // Redacted
  API_KEY: "sk_prod_12345",         // Redacted
  api_key_prod: "sk_prod_12345"     // Redacted
};
```

Default sensitive field patterns:
- `password`
- `secret`
- `token`
- `apiKey` / `api_key`
- `Authorization` / `authorization`
- `Bearer`
- `authentication`

## Pattern-Based Redaction

Use regex patterns for more specific detection:

```json
{
  "redaction": {
    "enabled": true,
    "sensitiveFields": ["password", "secret"],
    "sensitivePatterns": [
      "^(.*)?token(.*)?$",
      "^sk_[a-z0-9]{24}$",
      "^aws_[a-z0-9]+$"
    ]
  }
}
```

Examples:
- `^(.*)?token(.*)?$` - Any field containing "token"
- `^sk_[a-z0-9]{24}$` - Stripe API keys
- `^aws_[a-z0-9]+$` - AWS credentials

## Custom Redaction Values

Specify what to replace sensitive data with:

```json
{
  "redaction": {
    "redactionValue": "[REDACTED]"
  }
}
```

Other options:
- `"***"` - Simple asterisks
- `""` - Empty string (not recommended - loses context)
- `"[HIDDEN]"` - Custom message
- `"<omitted>"` - Indicates data was omitted

## Selective Redaction

Disable redaction for specific fields:

```json
{
  "redaction": {
    "enabled": true,
    "sensitiveFields": ["password", "apiKey"],
    "whitelistedFields": ["public_key", "username"]
  }
}
```

## Depth-Based Redaction

Redaction respects object depth:

```typescript
const user = {
  name: "Alice",
  credentials: {
    password: "secret123"
  },
  settings: {
    theme: "dark",
    apiKey: "sk_prod_12345"
  }
};
```

Result:
```json
{
  "user": {
    "name": "Alice",
    "credentials": {
      "password": "[REDACTED]"
    },
    "settings": {
      "theme": "dark",
      "apiKey": "[REDACTED]"
    }
  }
}
```

## Content-Based Redaction

Detect sensitive content by value patterns:

```json
{
  "redaction": {
    "enabled": true,
    "contentPatterns": [
      {
        "pattern": "^[A-Z0-9]{8,}$",
        "description": "Potential uppercase secrets"
      },
      {
        "pattern": "^sk_[a-z0-9]{20,}$",
        "description": "API keys"
      }
    ]
  }
}
```

## Disable Redaction in Development

Optionally disable redaction in development for easier debugging:

```json
{
  "redaction": {
    "enabled": false
  }
}
```

Or use environment variables:

```bash
TRACE_INJECT_REDACTION_ENABLED=false npm run dev
```

## Filtering Variables

Completely exclude variables from capture:

```json
{
  "capture": {
    "excludeVariables": ["password", "secret", "token"]
  }
}
```

Variables matching these patterns are not captured at all.

## Audit Logging

Log when sensitive data is redacted:

```json
{
  "redaction": {
    "enabled": true,
    "auditLog": true,
    "auditLogPath": "./logs/redaction-audit.log"
  }
}
```

## Example Configuration

A comprehensive redaction setup:

```json
{
  "redaction": {
    "enabled": true,
    "sensitiveFields": [
      "password",
      "secret",
      "apiKey",
      "token",
      "authorization",
      "authentication"
    ],
    "sensitivePatterns": [
      "^(.*)?key(.*)?$",
      "^(.*)?secret(.*)?$",
      "^(.*)?token(.*)?$",
      "^sk_[a-z0-9]{24}$",
      "^pk_[a-z0-9]{24}$"
    ],
    "redactionValue": "[REDACTED]",
    "auditLog": true
  },
  "capture": {
    "maxObjectDepth": 5,
    "maxArrayLength": 100,
    "excludeVariables": ["internalSecrets"]
  }
}
```

## Best Practices

1. **Always enable redaction in production** - Never expose sensitive data
2. **Use comprehensive patterns** - Cover all types of secrets your app uses
3. **Test redaction** - Verify sensitive data is properly redacted in staging
4. **Document patterns** - Record which patterns your organization uses
5. **Regular audits** - Review audit logs for any missed patterns
6. **PII consideration** - Consider redacting PII (Personally Identifiable Information) as well

## Troubleshooting

### Data not being redacted

1. Check that `redaction.enabled` is `true`
2. Verify field names match patterns exactly
3. Check capitalization in regex patterns
4. Ensure patterns are valid regex

### Over-aggressive redaction

1. Use `whitelistedFields` to exclude safe fields
2. Be more specific with regex patterns
3. Use field name matching instead of patterns when possible

### Performance impact

1. Limit regex pattern complexity
2. Use field name matching instead of content patterns
3. Only enable content patterns for known secret types
