/**
 * TraceInject Core Library
 *
 * Main entry point for the trace injection system
 */

export * from './parser/index.js';
export * from './injector/index.js';
export * from './capture/index.js';
export * from './api/index.js';
export * from './config.js';
export * from './runtime.js';
export * from './lambda/index.js';

// Framework integrations - use namespaces to avoid export conflicts
export * as nodeTrace from './node/index.js';
export * as remixTrace from './remix/index.js';
export * as honoTrace from './hono/index.js';
export * as nextTrace from './next/index.js';
export * as swcTrace from './swc/index.js';
export * as rollupTrace from './rollup/index.js';
export * as viteTrace from './vite/index.js';
