# Tracepoints

A tracepoint is a location in your source code where TraceInject injects instrumentation to capture variable values.

## What is a Tracepoint?

A tracepoint consists of:
- **File** - The source file where the tracepoint is located
- **Line** - The line number where instrumentation is injected
- **Variables** - The variables or expressions to capture

## Defining Tracepoints

Tracepoints are defined in your configuration file:

```json
{
  "tracepoints": [
    {
      "filePath": "src/services/userService.ts",
      "lineNumber": 25,
      "variables": ["userId", "userData"],
      "labelPrefix": "getUserData"
    }
  ]
}
```

## File Path Patterns

TraceInject supports glob patterns for file paths:

```json
{
  "tracepoints": [
    {
      "filePath": "src/**/*.ts",
      "lineNumber": 10,
      "variables": ["error"]
    },
    {
      "filePath": "src/handlers/*/index.ts",
      "lineNumber": 5,
      "variables": ["request"]
    }
  ]
}
```

## Variable Capture

### Simple Variables

Capture scalar values:

```typescript
// Configuration
{
  "filePath": "app.ts",
  "lineNumber": 10,
  "variables": ["count", "name", "isActive"]
}

// Source
const count = 5;
const name = "Alice";
const isActive = true;
```

### Object Properties

Capture specific properties:

```typescript
// Configuration
{
  "filePath": "app.ts",
  "lineNumber": 10,
  "variables": ["user.name", "user.email"]
}

// Source
const user = { name: "Alice", email: "alice@example.com" };
```

### Array Elements

```typescript
// Configuration
{
  "filePath": "app.ts",
  "lineNumber": 10,
  "variables": ["items[0]", "items[1].price"]
}

// Source
const items = [
  { id: 1, price: 10 },
  { id: 2, price: 20 }
];
```

## Conditional Capture

Only capture when a condition is true:

```json
{
  "tracepoints": [
    {
      "filePath": "src/app.ts",
      "lineNumber": 15,
      "variables": ["total"],
      "condition": "total > 1000"
    }
  ]
}
```

The condition is evaluated at runtime. Capture only happens when the condition evaluates to true.

## Label Prefixes

Add context to your captures:

```json
{
  "tracepoints": [
    {
      "filePath": "src/order/checkout.ts",
      "lineNumber": 20,
      "variables": ["cart"],
      "labelPrefix": "checkoutProcess"
    }
  ]
}
```

This helps identify which part of your code generated the trace data.

## Best Practices

### 1. Strategic Placement

Place tracepoints at key decision points:
- Before and after API calls
- Before returning from functions
- At error conditions
- At critical business logic

```json
{
  "tracepoints": [
    {
      "filePath": "src/handlers/auth.ts",
      "lineNumber": 10,
      "variables": ["username"],
      "labelPrefix": "authStart"
    },
    {
      "filePath": "src/handlers/auth.ts",
      "lineNumber": 25,
      "variables": ["token", "userId"],
      "labelPrefix": "authSuccess"
    }
  ]
}
```

### 2. Limit Variables

Capture only what you need:

```json
{
  "filePath": "src/app.ts",
  "lineNumber": 10,
  "variables": ["userId", "status"]
}
```

Rather than:

```json
{
  "filePath": "src/app.ts",
  "lineNumber": 10,
  "variables": ["*"]
}
```

### 3. Use Glob Patterns Sparingly

While glob patterns are powerful, overusing them can impact build time:

```json
{
  "filePath": "src/services/*/handler.ts",
  "lineNumber": 5,
  "variables": ["request"]
}
```

### 4. Combine with Redaction

Always enable redaction for sensitive data:

```json
{
  "redaction": {
    "enabled": true,
    "sensitiveFields": ["password", "token", "apiKey"]
  },
  "tracepoints": [
    {
      "filePath": "src/auth.ts",
      "lineNumber": 15,
      "variables": ["user"]
    }
  ]
}
```

## Debugging Tracepoints

To verify tracepoints are being injected:

1. Build with TraceInject enabled
2. Inspect the generated code (look in `dist` or build output)
3. Check for injected instrumentation code
4. Verify traces are being collected

## Dynamic Tracepoints

You can also manage tracepoints dynamically without rebuilding:

See [Remote Configuration](./remote-config) for details on dynamic tracepoint management.
