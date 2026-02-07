/**
 * SWC Plugin Utilities
 *
 * Helper functions for the SWC TraceInject plugin
 */

/**
 * Get the package version from package.json
 */
export function getPackageVersion(): string {
  try {
    // In a real SWC plugin, this would read from package.json
    return '0.1.0';
  } catch {
    return 'unknown';
  }
}

/**
 * Detect SWC version being used
 *
 * This helps ensure compatibility with different SWC versions
 */
export function detectSWCVersion(): string {
  try {
    // In a real environment, this would detect @swc/core version
    // For now, return a compatible version string
    return '1.0.0+';
  } catch {
    return 'unknown';
  }
}

/**
 * Check if a filename should be processed by the plugin
 */
export function shouldProcessFile(filename: string): boolean {
  // Skip node_modules, dist, and other build output directories
  if (filename.includes('node_modules') || filename.includes('dist') || filename.includes('.next')) {
    return false;
  }

  // Only process JavaScript, TypeScript, and JSX files
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['js', 'ts', 'jsx', 'tsx', 'mjs', 'mts'].includes(ext || '');
}

/**
 * Normalize a filename for use in trace IDs
 */
export function normalizeFilename(filename: string): string {
  // Remove process.cwd() prefix if present
  if (filename.startsWith(process.cwd())) {
    return filename.slice(process.cwd().length + 1);
  }
  return filename;
}

/**
 * Create a hash-like ID from a string (non-cryptographic)
 *
 * Used for creating unique but stable IDs for trace points
 */
export function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Match a pattern against a name (supports wildcards)
 */
export function matchesPattern(name: string, pattern: string): boolean {
  if (pattern === '*') {
    return true;
  }

  if (!pattern.includes('*')) {
    return name === pattern;
  }

  // Simple wildcard matching
  const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
  return regex.test(name);
}

/**
 * Check if tracing should be skipped due to performance reasons
 */
export function shouldSkipForPerformance(
  timeInMs: number,
  maxTimeMs: number,
): boolean {
  return timeInMs > maxTimeMs;
}

/**
 * Create a debug message for the plugin
 */
export function createDebugMessage(
  action: string,
  details: Record<string, unknown>,
): string {
  const timestamp = new Date().toISOString();
  return `[SWC Plugin ${timestamp}] ${action}: ${JSON.stringify(details)}`;
}
