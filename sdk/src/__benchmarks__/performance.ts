/**
 * Performance benchmarks for self-healing tracing system
 * These benchmarks verify performance safeguards are working correctly
 * Run with: npm run benchmark
 */

import { VariableCapture } from '../capture/index.js';
import { RateLimiter } from '../api/rate-limiter.js';
import { CircuitBreaker } from '../api/circuit-breaker.js';
import { MemoryMonitor } from '../api/memory-monitor.js';
import { TraceQueue } from '../api/trace-queue.js';

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

/**
 * Run a benchmark and measure performance
 */
function runBenchmark(
  name: string,
  iterations: number,
  fn: () => void
): BenchmarkResult {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < 10; i++) {
    fn();
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    fn();
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1000); // Convert to microseconds
  }

  const totalTime = times.reduce((a, b) => a + b, 0) / 1000; // Convert to milliseconds
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times) / 1000; // Convert to milliseconds
  const maxTime = Math.max(...times) / 1000;
  const opsPerSecond = (1000 / avgTime) * 1000;

  return {
    name,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    opsPerSecond,
  };
}

/**
 * Benchmark variable capture with sampling
 */
function benchmarkSampling(): BenchmarkResult {
  const capture = new VariableCapture({
    samplingRate: 50, // 50% sampling
  });

  const variables = {
    name: 'John',
    age: 30,
    email: 'john@example.com',
    nested: { obj: { deep: { value: 123 } } },
  };

  return runBenchmark('Variable Capture with Sampling (50%)', 10000, () => {
    capture.captureVariables(variables);
  });
}

/**
 * Benchmark variable capture with timeout
 */
function benchmarkCaptureWithTimeout(): BenchmarkResult {
  const capture = new VariableCapture({
    serializationTimeout: 5000,
    maxDepth: 3,
  });

  const complexObj = {
    level1: {
      level2: {
        level3: {
          data: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            value: Math.random(),
          })),
        },
      },
    },
  };

  return runBenchmark('Capture with Timeout (5s)', 1000, () => {
    capture.captureVariables({ complexObj });
  });
}

/**
 * Benchmark rate limiter
 */
function benchmarkRateLimiter(): BenchmarkResult {
  const limiter = new RateLimiter({
    maxRequests: 100,
    windowMs: 60000,
    perProject: true,
  });

  const identifier = 'user:12345';

  return runBenchmark('Rate Limiter Check', 100000, () => {
    limiter.isAllowed(identifier);
  });
}

/**
 * Benchmark circuit breaker
 */
function benchmarkCircuitBreaker(): BenchmarkResult {
  const breaker = new CircuitBreaker({
    failureThreshold: 5,
  });

  let iteration = 0;

  return runBenchmark('Circuit Breaker State Check', 50000, () => {
    if (iteration % 10 === 0) {
      breaker.recordSuccess();
    } else {
      breaker.recordFailure();
    }
    breaker.getState();
    iteration++;
  });
}

/**
 * Benchmark memory monitor
 */
function benchmarkMemoryMonitor(): BenchmarkResult {
  const monitor = new MemoryMonitor();

  return runBenchmark('Memory Monitor Check', 5000, () => {
    monitor.getMemoryStats();
  });
}

/**
 * Benchmark trace queue enqueue operation
 */
function benchmarkTraceQueueEnqueue(): BenchmarkResult {
  const queue = new TraceQueue();

  const trace = {
    id: 'trace-1',
    projectId: 'proj-1',
    filePath: '/src/index.ts',
    lineNumber: 10,
    type: 'after' as const,
    timestamp: new Date().toISOString(),
  };

  return runBenchmark('Trace Queue Enqueue', 50000, () => {
    queue.enqueue(trace);
  });
}

/**
 * Benchmark large object capture
 */
function benchmarkLargeObjectCapture(): BenchmarkResult {
  const capture = new VariableCapture({
    maxCaptureSize: 100000, // 100KB limit
    maxDepth: 5,
  });

  const largeArray = Array.from({ length: 500 }, (_, i) => ({
    id: i,
    data: `item-${i}`.repeat(10),
    nested: {
      value: Math.random(),
      timestamp: new Date().toISOString(),
    },
  }));

  return runBenchmark('Large Object Capture', 100, () => {
    capture.captureVariables({ largeArray });
  });
}

/**
 * Benchmark sensitive data redaction
 */
function benchmarkSensitiveRedaction(): BenchmarkResult {
  const capture = new VariableCapture();

  const sensitiveData = {
    username: 'john_doe',
    password: 'secret123',
    apiKey: 'ak-12345',
    token: 'token-xyz',
    email: 'john@example.com',
    creditCard: '4111-1111-1111-1111',
    ssn: '123-45-6789',
  };

  return runBenchmark('Sensitive Data Redaction', 10000, () => {
    capture.captureVariables(sensitiveData);
  });
}

/**
 * Run all benchmarks
 */
export async function runAllBenchmarks(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         Performance Benchmarks for self-healing v0.21          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const results: BenchmarkResult[] = [
    benchmarkSampling(),
    benchmarkCaptureWithTimeout(),
    benchmarkRateLimiter(),
    benchmarkCircuitBreaker(),
    benchmarkMemoryMonitor(),
    benchmarkTraceQueueEnqueue(),
    benchmarkLargeObjectCapture(),
    benchmarkSensitiveRedaction(),
  ];

  // Print results
  console.log('┌────────────────────────────────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Benchmark Name                     │ Avg (µs) │ Min (µs) │ Max (µs) │ Ops/sec  │');
  console.log('├────────────────────────────────────┼──────────┼──────────┼──────────┼──────────┤');

  for (const result of results) {
    const name = result.name.padEnd(34);
    const avg = result.avgTime.toFixed(3).padStart(8);
    const min = (result.minTime * 1000).toFixed(3).padStart(8);
    const max = (result.maxTime * 1000).toFixed(3).padStart(8);
    const ops = result.opsPerSecond.toFixed(0).padStart(8);

    console.log(`│ ${name} │ ${avg} │ ${min} │ ${max} │ ${ops} │`);
  }

  console.log('└────────────────────────────────────┴──────────┴──────────┴──────────┴──────────┘\n');

  // Performance assertions
  console.log('Performance Assertions:\n');

  const samplingResult = results.find((r) => r.name.includes('Sampling'))!;
  const rateLimitResult = results.find((r) => r.name.includes('Rate Limiter'))!;
  const circuitBreakerResult = results.find((r) => r.name.includes('Circuit Breaker'))!;
  const queueResult = results.find((r) => r.name.includes('Trace Queue'))!;

  const assertions = [
    {
      name: 'Sampling should be < 100µs per operation',
      condition: samplingResult.avgTime < 0.1,
      result: samplingResult.avgTime,
    },
    {
      name: 'Rate limiting should be < 10µs per operation',
      condition: rateLimitResult.avgTime < 0.01,
      result: rateLimitResult.avgTime,
    },
    {
      name: 'Circuit breaker should be < 10µs per operation',
      condition: circuitBreakerResult.avgTime < 0.01,
      result: circuitBreakerResult.avgTime,
    },
    {
      name: 'Trace queue should be < 50µs per operation',
      condition: queueResult.avgTime < 0.05,
      result: queueResult.avgTime,
    },
  ];

  let passedAssertions = 0;
  for (const assertion of assertions) {
    const status = assertion.condition ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} - ${assertion.name}`);
    console.log(`  Measured: ${assertion.result.toFixed(3)}µs\n`);
    if (assertion.condition) {
      passedAssertions++;
    }
  }

  console.log(`\nPassed: ${passedAssertions}/${assertions.length} assertions\n`);

  if (passedAssertions === assertions.length) {
    console.log('✓ All performance benchmarks passed!\n');
    process.exit(0);
  } else {
    console.log('✗ Some performance benchmarks failed!\n');
    process.exit(1);
  }
}

// Run benchmarks if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllBenchmarks().catch((err) => {
    console.error('Benchmark error:', err);
    process.exit(1);
  });
}
