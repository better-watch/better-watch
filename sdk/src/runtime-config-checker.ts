/**
 * Runtime Configuration Checking (Hybrid Mode)
 *
 * Provides lightweight config checking at tracepoint sites with:
 * - Remote server polling for config changes
 * - In-memory config caching with TTL
 * - Dynamic tracepoint enable/disable without code changes
 * - Sample rate changes without rebuild
 * - Minimal performance overhead (<1ms per check with caching)
 * - Graceful degradation on network failures
 *
 * Acceptance Criteria:
 * - Inject lightweight config checker at tracepoint sites
 * - Poll remote server for config changes (configurable interval)
 * - Cache config in memory with TTL
 * - Support tracepoint enable/disable without code changes
 * - Support sample rate changes without rebuild
 * - Minimal performance overhead (<1ms per check with caching)
 * - Graceful degradation on network failures
 */

/**
 * Runtime configuration for a tracepoint
 */
export interface RuntimeTracepointConfig {
  /**
   * Unique identifier for the tracepoint
   */
  id: string;

  /**
   * Whether this tracepoint is enabled
   */
  enabled: boolean;

  /**
   * Sampling rate (0-1). 0 = never sample, 1 = always sample
   */
  samplingRate: number;

  /**
   * Optional metadata for this tracepoint
   */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for the runtime config checker
 */
export interface RuntimeConfigCheckerConfig {
  /**
   * Remote server URL for fetching config
   * Example: "https://config.example.com/api/config"
   */
  serverUrl: string;

  /**
   * API key for authentication with the config server
   */
  apiKey: string;

  /**
   * Project ID for multi-project setups
   */
  projectId: string;

  /**
   * Environment name (e.g., "development", "staging", "production")
   */
  environment?: string;

  /**
   * Polling interval in milliseconds (default: 30000 = 30 seconds)
   */
  pollingInterval?: number;

  /**
   * Cache TTL in milliseconds (default: 60000 = 60 seconds)
   * Config is considered fresh until this time expires
   */
  cacheTtlMs?: number;

  /**
   * Maximum time to wait for config fetch in milliseconds (default: 5000)
   */
  fetchTimeoutMs?: number;

  /**
   * Whether to log debug messages (default: false)
   */
  debug?: boolean;

  /**
   * Error handler for network or other failures
   */
  onError?: (error: Error) => void;

  /**
   * Callback when config is successfully updated
   */
  onConfigUpdate?: (config: Map<string, RuntimeTracepointConfig>) => void;
}

/**
 * Internal state for the config checker
 */
interface ConfigCheckerState {
  config: Map<string, RuntimeTracepointConfig>;
  lastFetchTime: number;
  cacheExpireTime: number;
  pollingTimer: NodeJS.Timeout | null;
  isFetching: boolean;
  isInitialized: boolean;
  consecutiveErrors: number;
}

let checkerState: ConfigCheckerState | null = null;
let checkerConfig: RuntimeConfigCheckerConfig | null = null;

/**
 * Initialize the runtime config checker
 *
 * Must be called before using checkTracepoint() or shouldSample()
 */
export async function initializeConfigChecker(
  config: RuntimeConfigCheckerConfig
): Promise<void> {
  if (checkerState && checkerConfig) {
    return; // Already initialized
  }

  // Validate configuration
  if (!config.serverUrl) {
    throw new Error('Config checker: serverUrl is required');
  }
  if (!config.apiKey) {
    throw new Error('Config checker: apiKey is required');
  }
  if (!config.projectId) {
    throw new Error('Config checker: projectId is required');
  }

  checkerConfig = {
    pollingInterval: 30000,
    cacheTtlMs: 60000,
    fetchTimeoutMs: 5000,
    debug: false,
    ...config,
  };

  checkerState = {
    config: new Map(),
    lastFetchTime: 0,
    cacheExpireTime: 0,
    pollingTimer: null,
    isFetching: false,
    isInitialized: false,
    consecutiveErrors: 0,
  };

  log('Config checker initialized');

  // Perform initial fetch
  try {
    await fetchConfig();
    checkerState.isInitialized = true;
    schedulePolling();
  } catch (error) {
    // Graceful degradation: if initial fetch fails, still start polling
    // but don't throw error
    log(`Initial config fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    checkerState.isInitialized = false;
    schedulePolling();
  }
}

/**
 * Check if a tracepoint should be executed
 *
 * Returns false if:
 * - Config checker not initialized
 * - Tracepoint is disabled in config
 * - Random sampling determines it should be skipped
 *
 * @param tracepointId - The ID of the tracepoint to check
 * @returns true if the tracepoint should execute, false otherwise
 */
export function checkTracepoint(tracepointId: string): boolean {
  try {
    if (!checkerState || !checkerConfig || !checkerState.isInitialized) {
      // Not initialized - allow tracepoint to execute
      return true;
    }

    // Refresh cache if expired
    if (isCacheExpired()) {
      // Don't block on refresh - do it async in background
      void refreshConfigAsync();
    }

    // Get tracepoint config
    const tpConfig = checkerState.config.get(tracepointId);
    if (!tpConfig) {
      // No config for this tracepoint - allow it
      return true;
    }

    // Check if enabled
    if (!tpConfig.enabled) {
      return false;
    }

    // Check sampling rate
    if (tpConfig.samplingRate < 1) {
      return Math.random() < tpConfig.samplingRate;
    }

    return true;
  } catch (error) {
    // Graceful degradation: on any error, allow tracepoint
    try {
      checkerConfig?.onError?.(
        error instanceof Error ? error : new Error(String(error))
      );
    } catch {
      // Silently ignore error handler failures
    }
    return true;
  }
}

/**
 * Alternative name for checkTracepoint for use in injected code
 */
export const shouldExecuteTracepoint = checkTracepoint;

/**
 * Check if a trace should be sampled (alias for checkTracepoint)
 */
export const shouldSample = checkTracepoint;

/**
 * Fetch configuration from remote server
 */
async function fetchConfig(): Promise<void> {
  if (!checkerState || !checkerConfig) {
    return;
  }

  if (checkerState.isFetching) {
    return; // Already fetching
  }

  checkerState.isFetching = true;

  try {
    const url = new URL('/api/config/fetch', checkerConfig.serverUrl);
    url.searchParams.set('projectId', checkerConfig.projectId);
    if (checkerConfig.environment) {
      url.searchParams.set('environment', checkerConfig.environment);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), checkerConfig.fetchTimeoutMs);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${checkerConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Config fetch failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const tracepoints = data.tracepoints as Array<{
      id: string;
      enabled: boolean;
      samplingRate: number;
      metadata?: Record<string, unknown>;
    }>;

    if (!Array.isArray(tracepoints)) {
      throw new Error('Invalid config response: tracepoints is not an array');
    }

    // Update config
    checkerState.config.clear();
    for (const tp of tracepoints) {
      checkerState.config.set(tp.id, {
        id: tp.id,
        enabled: tp.enabled,
        samplingRate: Math.max(0, Math.min(1, tp.samplingRate || 1)),
        metadata: tp.metadata,
      });
    }

    checkerState.lastFetchTime = Date.now();
    checkerState.cacheExpireTime = Date.now() + (checkerConfig.cacheTtlMs || 60000);
    checkerState.consecutiveErrors = 0;

    log(`Fetched config for ${tracepoints.length} tracepoints`);

    checkerConfig.onConfigUpdate?.(checkerState.config);
  } catch (error) {
    checkerState.consecutiveErrors++;
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Config fetch error (${checkerState.consecutiveErrors}): ${errorMsg}`);

    try {
      checkerConfig?.onError?.(
        error instanceof Error ? error : new Error(String(error))
      );
    } catch {
      // Silently ignore error handler failures
    }
  } finally {
    checkerState.isFetching = false;
  }
}

/**
 * Refresh config asynchronously without blocking
 */
async function refreshConfigAsync(): Promise<void> {
  try {
    await fetchConfig();
  } catch {
    // Silently ignore errors in async refresh
  }
}

/**
 * Check if cache has expired
 */
function isCacheExpired(): boolean {
  if (!checkerState) {
    return true;
  }
  return Date.now() >= checkerState.cacheExpireTime;
}

/**
 * Schedule periodic polling for config updates
 */
function schedulePolling(): void {
  if (!checkerState || !checkerConfig) {
    return;
  }

  if (checkerState.pollingTimer) {
    clearInterval(checkerState.pollingTimer);
  }

  checkerState.pollingTimer = setInterval(() => {
    void refreshConfigAsync();
  }, checkerConfig!.pollingInterval || 30000);

  // Allow timer to be garbage collected if no other references exist
  if (checkerState.pollingTimer.unref) {
    checkerState.pollingTimer.unref();
  }
}

/**
 * Get current config status (for debugging/monitoring)
 */
export function getConfigCheckerStatus(): {
  initialized: boolean;
  tracepointCount: number;
  lastFetchTime: number;
  cacheExpireTime: number;
  consecutiveErrors: number;
  isFetching: boolean;
} | null {
  if (!checkerState || !checkerConfig) {
    return null;
  }

  return {
    initialized: checkerState.isInitialized,
    tracepointCount: checkerState.config.size,
    lastFetchTime: checkerState.lastFetchTime,
    cacheExpireTime: checkerState.cacheExpireTime,
    consecutiveErrors: checkerState.consecutiveErrors,
    isFetching: checkerState.isFetching,
  };
}

/**
 * Get configuration for a specific tracepoint
 */
export function getTracepointConfig(tracepointId: string): RuntimeTracepointConfig | undefined {
  return checkerState?.config.get(tracepointId);
}

/**
 * Manually refresh config immediately
 */
export async function refreshConfig(): Promise<void> {
  if (!checkerState) {
    throw new Error('Config checker not initialized');
  }
  await fetchConfig();
}

/**
 * Disable the config checker
 */
export function disableConfigChecker(): void {
  if (!checkerState) {
    return;
  }
  if (checkerState.pollingTimer) {
    clearInterval(checkerState.pollingTimer);
    checkerState.pollingTimer = null;
  }
  checkerState.isInitialized = false;
  checkerState.config.clear();
  log('Config checker disabled');
}

/**
 * Reset the config checker (for testing)
 */
export function resetConfigChecker(): void {
  if (checkerState?.pollingTimer) {
    clearInterval(checkerState.pollingTimer);
  }
  checkerState = null;
  checkerConfig = null;
}

/**
 * Log debug message
 */
function log(message: string): void {
  if (checkerConfig?.debug) {
    console.debug(`[TraceInject ConfigChecker] ${message}`);
  }
}

/**
 * Get all tracepoint configurations
 */
export function getAllConfigs(): Map<string, RuntimeTracepointConfig> {
  if (!checkerState) {
    return new Map();
  }
  return new Map(checkerState.config);
}
