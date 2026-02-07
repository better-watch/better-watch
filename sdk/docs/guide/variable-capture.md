# Variable Capture

Comprehensive guide to capturing and handling variable values with TraceInject.

## Overview

Variable capture is the process of extracting variable values at runtime and storing them for analysis. TraceInject provides flexible capture options to balance detail and performance.

## Basic Capture

The simplest capture specifies variable names:

```json
{
  "tracepoints": [
    {
      "filePath": "src/app.ts",
      "lineNumber": 10,
      "variables": ["count", "message"]
    }
  ]
}
```

At line 10, the values of `count` and `message` are captured and included in trace data.

## Capture Configuration

Control how variables are captured using the `capture` section:

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

### Max Object Depth

Limits how deep nested objects are serialized:

```typescript
const user = {
  name: "Alice",
  profile: {
    bio: "Developer",
    settings: {
      theme: "dark"
    }
  }
};
```

With `maxObjectDepth: 2`:
```json
{
  "user": {
    "name": "Alice",
    "profile": {
      "bio": "Developer",
      "settings": "[Object]"
    }
  }
}
```

### Max Array Length

Limits the number of array elements captured:

```typescript
const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
```

With `maxArrayLength: 5`:
```json
{
  "items": [1, 2, 3, 4, 5, "... 5 more items"]
}
```

### Max String Length

Prevents overly large strings from being captured:

```typescript
const longText = "A very long string..."; // 5000 characters
```

With `maxStringLength: 1000`:
```json
{
  "longText": "A very long string... [truncated 4000 characters]"
}
```

### Max Total Size

Limits the total size of captured data per trace to prevent memory issues:

With `maxTotalSize: 10485760` (10MB), if the capture would exceed 10MB, it stops capturing additional variables.

## Selective Capture

Capture specific object properties:

```typescript
const user = {
  name: "Alice",
  email: "alice@example.com",
  password: "secret123" // Don't capture this
};
```

Configuration:
```json
{
  "tracepoints": [
    {
      "filePath": "src/auth.ts",
      "lineNumber": 15,
      "variables": ["user.name", "user.email"]
    }
  ]
}
```

## Redaction During Capture

Sensitive data is automatically redacted:

```typescript
const credentials = {
  username: "alice",
  password: "secret123",
  apiKey: "sk_prod_12345"
};
```

With redaction enabled:
```json
{
  "credentials": {
    "username": "alice",
    "password": "[REDACTED]",
    "apiKey": "[REDACTED]"
  }
}
```

Configuration:
```json
{
  "redaction": {
    "enabled": true,
    "sensitiveFields": ["password", "apiKey", "secret"]
  }
}
```

## Size-Aware Capture

TraceInject automatically stops capturing when size limits are reached:

```json
{
  "capture": {
    "maxObjectDepth": 3,
    "maxArrayLength": 50,
    "maxStringLength": 500,
    "maxTotalSize": 1048576
  }
}
```

As variables are captured, the remaining quota is tracked. When any limit is reached:
- Object depth is capped
- Array items are truncated
- Strings are shortened
- Capture stops if total size is exceeded

## Error Resilience

If a variable cannot be serialized, capture continues gracefully:

```typescript
const circular = {};
circular.self = circular; // Circular reference

const weakMap = new WeakMap();
```

With error resilience:
```json
{
  "circular": "[Unable to serialize: circular reference]",
  "weakMap": "[Unable to serialize: WeakMap]"
}
```

## Advanced Patterns

### Conditional Capture

Capture only when specific conditions are met:

```json
{
  "tracepoints": [
    {
      "filePath": "src/order/checkout.ts",
      "lineNumber": 25,
      "variables": ["cart"],
      "condition": "cart.items.length > 0"
    }
  ]
}
```

### Expression Capture

Capture computed values:

```json
{
  "tracepoints": [
    {
      "filePath": "src/math.ts",
      "lineNumber": 10,
      "variables": ["total", "items.length", "total / items.length"]
    }
  ]
}
```

## Performance Considerations

### Capture Overhead

Capturing variables has minimal overhead:
- No network requests (unless configured)
- Data serialization happens in-process
- Size limits prevent excessive memory usage

### Sampling

For high-frequency operations, consider capturing samples:

```json
{
  "capture": {
    "sampleRate": 0.1
  }
}
```

This captures only 10% of traces, reducing overhead while maintaining coverage.

### Async Capture

For non-critical traces, capture asynchronously:

```json
{
  "capture": {
    "async": true,
    "batchSize": 100
  }
}
```

Traces are batched and sent asynchronously, reducing impact on your application.

## Best Practices

1. **Capture strategically** - Focus on critical paths, not every variable
2. **Use redaction** - Always redact sensitive data
3. **Set reasonable limits** - Prevent excessive memory or storage usage
4. **Monitor capture metrics** - Track how much data is being captured
5. **Profile impact** - Measure performance impact on your application

## Troubleshooting

### Missing Variables

If captured variables are empty:
1. Verify the line number matches where variables exist
2. Check variable names are spelled correctly
3. Ensure variables are in scope at the capture point

### Large Capture Sizes

If captures are too large:
1. Reduce `maxObjectDepth`
2. Reduce `maxArrayLength`
3. Enable sampling
4. Use selective property capture (e.g., `user.id` instead of `user`)

### Performance Impact

If capture is impacting performance:
1. Reduce the number of tracepoints
2. Enable sampling
3. Use async capture
4. Reduce capture limits
