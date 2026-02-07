/**
 * Remote Configuration Fetching
 *
 * Provides comprehensive remote configuration fetching with:
 * - HTTP/HTTPS endpoint support at build time
 * - API key authentication (header-based)
 * - OAuth2/JWT authentication
 * - Local caching with TTL
 * - Fallback to cached config on network failure
 * - Config merging (remote takes precedence over local)
 * - Remote config schema validation
 * - Config fetch status and version logging
 */

import type { StoredTracepointConfig } from './config-types.js';

/**
 * Authentication configuration for remote config fetching
 */
export interface RemoteAuthConfig {
  /**
   * Type of authentication
   * - 'api-key': Simple API key in Authorization header
   * - 'bearer': Bearer token (JWT/OAuth2)
   * - 'custom': Custom header-based authentication
   */
  type: 'api-key' | 'bearer' | 'custom';

  /**
   * The authentication token/key value
   */
  token: string;

  /**
   * Custom header name for custom auth type (default: "Authorization")
   */
  headerName?: string;

  /**
   * Custom header format for custom auth type (default: "{token}")
   * Use {token} placeholder for the actual token
   */
  headerFormat?: string;
}

/**
 * Configuration for remote config fetcher
 */
export interface RemoteConfigFetcherConfig {
  /**
   * Remote server URL (HTTP/HTTPS)
   * Example: "https://config.example.com/api/config"
   */
  remoteUrl: string;

  /**
   * Authentication configuration
   */
  auth?: RemoteAuthConfig;

  /**
   * Local cache directory for storing fetched config
   * Used as fallback on network failure
   */
  cacheDir?: string;

  /**
   * Cache TTL in milliseconds (default: 3600000 = 1 hour)
   */
  cacheTtlMs?: number;

  /**
   * Request timeout in milliseconds (default: 10000)
   */
  timeoutMs?: number;

  /**
   * Project ID for the configuration (optional, sent in query params)
   */
  projectId?: string;

  /**
   * Environment name (optional, sent in query params)
   */
  environment?: string;

  /**
   * Whether to validate remote config schema (default: true)
   */
  validateSchema?: boolean;

  /**
   * Whether to log fetch status and version (default: true)
   */
  logging?: boolean;

  /**
   * Maximum number of retry attempts on network failure (default: 3)
   */
  maxRetries?: number;

  /**
   * Delay between retries in milliseconds (default: 1000)
   */
  retryDelayMs?: number;
}

/**
 * Result of a config fetch operation
 */
export interface RemoteConfigFetchResult {
  /**
   * Fetched configuration
   */
  config: StoredTracepointConfig[];

  /**
   * Version identifier from the remote server (e.g., git sha, timestamp)
   */
  version?: string;

  /**
   * Timestamp when config was fetched
   */
  fetchedAt: string;

  /**
   * Whether this was fetched from remote or loaded from cache
   */
  source: 'remote' | 'cache' | 'fallback';

  /**
   * Cache expiration time (ISO 8601)
   */
  expiresAt: string;
}

/**
 * Internal cache entry
 */
interface CacheEntry {
  config: StoredTracepointConfig[];
  version?: string;
  fetchedAt: string;
  expiresAt: string;
  source: 'remote' | 'cache';
}

/**
 * Remote Configuration Fetcher
 *
 * Handles fetching configuration from a remote HTTP/HTTPS endpoint with caching,
 * authentication, and fallback mechanisms.
 */
interface RequiredRemoteConfigFetcherConfig extends RemoteConfigFetcherConfig {
  cacheTtlMs: number;
  timeoutMs: number;
  validateSchema: boolean;
  logging: boolean;
  maxRetries: number;
  retryDelayMs: number;
}

export class RemoteConfigFetcher {
  private config: RequiredRemoteConfigFetcherConfig;
  private cache: CacheEntry | null = null;
  private cacheLoaded = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private fs: any; // File system module (loaded lazily for isomorphic support)

  constructor(config: RemoteConfigFetcherConfig) {
    // Validate required fields
    if (!config.remoteUrl) {
      throw new Error('RemoteConfigFetcher: remoteUrl is required');
    }

    // Parse and validate URL
    try {
      new URL(config.remoteUrl);
    } catch {
      throw new Error(`RemoteConfigFetcher: Invalid remoteUrl: ${config.remoteUrl}`);
    }

    this.config = {
      remoteUrl: config.remoteUrl,
      auth: config.auth,
      cacheDir: config.cacheDir,
      cacheTtlMs: config.cacheTtlMs ?? 3600000, // 1 hour
      timeoutMs: config.timeoutMs ?? 10000,
      projectId: config.projectId,
      environment: config.environment,
      validateSchema: config.validateSchema ?? true,
      logging: config.logging ?? true,
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
    };
  }

  /**
   * Fetch remote configuration with caching and fallback
   *
   * @returns Configuration fetch result
   */
  async fetch(): Promise<RemoteConfigFetchResult> {
    // Check if cache is still valid
    if (this.cache && !this.isCacheExpired()) {
      this.log('Using cached configuration');
      return {
        config: this.cache.config,
        version: this.cache.version,
        fetchedAt: this.cache.fetchedAt,
        source: 'cache',
        expiresAt: this.cache.expiresAt,
      };
    }

    // Try to fetch from remote
    try {
      const result = await this.fetchWithRetry();
      this.cache = {
        config: result.config,
        version: result.version,
        fetchedAt: result.fetchedAt,
        expiresAt: result.expiresAt,
        source: 'remote',
      };

      // Save to disk cache if configured
      if (this.config.cacheDir) {
        await this.saveCacheToDisk();
      }

      this.log(`Configuration fetched successfully (version: ${result.version || 'unknown'})`);
      return { ...result, source: 'remote' };
    } catch (error) {
      this.log(`Failed to fetch remote config: ${error instanceof Error ? error.message : String(error)}`);

      // Try to load from disk cache
      if (this.config.cacheDir && !this.cacheLoaded) {
        const diskCache = await this.loadCacheFromDisk();
        if (diskCache) {
          this.cache = diskCache;
          return {
            config: diskCache.config,
            version: diskCache.version,
            fetchedAt: diskCache.fetchedAt,
            source: 'fallback',
            expiresAt: diskCache.expiresAt,
          };
        }
      }

      // Fallback to in-memory cache if available
      if (this.cache) {
        this.log('Using in-memory cache (remote fetch failed)');
        return {
          config: this.cache.config,
          version: this.cache.version,
          fetchedAt: this.cache.fetchedAt,
          source: 'fallback',
          expiresAt: this.cache.expiresAt,
        };
      }

      // No cache available
      throw new Error(
        `Failed to fetch remote configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Merge remote config with local config (remote takes precedence)
   *
   * @param localConfig Local configuration
   * @param remoteConfig Remote configuration
   * @returns Merged configuration
   */
  static merge(
    localConfig: StoredTracepointConfig[],
    remoteConfig: StoredTracepointConfig[]
  ): StoredTracepointConfig[] {
    // Create a map of remote configs by ID for quick lookup
    const remoteMap = new Map(remoteConfig.map((cfg) => [cfg.id, cfg]));

    // Start with local config and override with remote
    const result: StoredTracepointConfig[] = [];
    const seenIds = new Set<string>();

    // Process local config first
    for (const local of localConfig) {
      seenIds.add(local.id);
      const remote = remoteMap.get(local.id);
      if (remote) {
        // Remote takes precedence - use remote version
        result.push(remote);
      } else {
        // Keep local if no remote version
        result.push(local);
      }
    }

    // Add any remote configs not in local
    for (const remote of remoteConfig) {
      if (!seenIds.has(remote.id)) {
        result.push(remote);
      }
    }

    return result;
  }

  /**
   * Validate remote config schema
   *
   * @param config Configuration to validate
   * @throws Error if validation fails
   */
  private validateConfigSchema(config: unknown): asserts config is StoredTracepointConfig[] {
    if (!Array.isArray(config)) {
      throw new Error('Configuration must be an array of tracepoint configs');
    }

    for (let i = 0; i < config.length; i++) {
      const item = config[i];
      if (typeof item !== 'object' || item === null) {
        throw new Error(`Config item ${i} must be an object`);
      }

      const item_ = item as Record<string, unknown>;

      // Check required fields
      if (typeof item_.id !== 'string') {
        throw new Error(`Config item ${i}: id must be a string`);
      }
      if (typeof item_.enabled !== 'boolean') {
        throw new Error(`Config item ${i}: enabled must be a boolean`);
      }
      if (typeof item_.filePath !== 'string') {
        throw new Error(`Config item ${i}: filePath must be a string`);
      }
      if (typeof item_.type !== 'string') {
        throw new Error(`Config item ${i}: type must be a string`);
      }
      if (typeof item_.code !== 'string') {
        throw new Error(`Config item ${i}: code must be a string`);
      }
    }
  }

  /**
   * Fetch remote config with retry logic
   */
  private async fetchWithRetry(): Promise<RemoteConfigFetchResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.fetchRemote();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt); // Exponential backoff
          this.log(`Retry attempt ${attempt + 1}/${this.config.maxRetries} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Failed to fetch remote configuration');
  }

  /**
   * Fetch configuration from remote server
   */
  private async fetchRemote(): Promise<RemoteConfigFetchResult> {
    const url = this.buildUrl();
    const headers = this.buildHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Remote server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle different response formats
      let config: StoredTracepointConfig[] = [];
      let version: string | undefined;
      let fetchedAt: string = new Date().toISOString();

      if (Array.isArray(data)) {
        // Direct array response
        config = data;
      } else if (data && typeof data === 'object' && 'tracepoints' in data) {
        // Response with tracepoints property
        config = data.tracepoints;
        version = data.version;
        if (data.fetchedAt) fetchedAt = data.fetchedAt;
      } else {
        throw new Error('Invalid response format: expected array or object with tracepoints');
      }

      // Validate schema
      if (this.config.validateSchema) {
        this.validateConfigSchema(config);
      }

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + this.config.cacheTtlMs).toISOString();

      return {
        config,
        version,
        fetchedAt,
        expiresAt,
        source: 'remote',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Build request URL with query parameters
   */
  private buildUrl(): string {
    const url = new URL(this.config.remoteUrl);

    if (this.config.projectId) {
      url.searchParams.set('projectId', this.config.projectId);
    }
    if (this.config.environment) {
      url.searchParams.set('environment', this.config.environment);
    }

    return url.toString();
  }

  /**
   * Build request headers with authentication
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'RemoteConfigFetcher/1.0',
    };

    if (this.config.auth) {
      const { type, token, headerName = 'Authorization', headerFormat = '{token}' } = this.config.auth;

      switch (type) {
        case 'api-key':
          headers['Authorization'] = `ApiKey ${token}`;
          break;
        case 'bearer':
          headers['Authorization'] = `Bearer ${token}`;
          break;
        case 'custom': {
          const headerValue = headerFormat.replace('{token}', token);
          headers[headerName] = headerValue;
          break;
        }
      }
    }

    return headers;
  }

  /**
   * Check if cache is expired
   */
  private isCacheExpired(): boolean {
    if (!this.cache) return true;
    return new Date(this.cache.expiresAt).getTime() < Date.now();
  }

  /**
   * Save cache to disk
   */
  private async saveCacheToDisk(): Promise<void> {
    if (!this.cache || !this.config.cacheDir) return;

    try {
      // Lazy load file system
      if (!this.fs) {
        this.fs = await import('fs/promises');
      }

      const cacheFile = `${this.config.cacheDir}/remote-config.json`;
      await this.fs.mkdir(this.config.cacheDir, { recursive: true });
      await this.fs.writeFile(cacheFile, JSON.stringify(this.cache, null, 2), 'utf-8');
      this.log(`Cache saved to disk: ${cacheFile}`);
    } catch (error) {
      this.log(
        `Failed to save cache to disk: ${error instanceof Error ? error.message : String(error)}`
      );
      // Non-fatal error - continue without disk cache
    }
  }

  /**
   * Load cache from disk
   */
  private async loadCacheFromDisk(): Promise<CacheEntry | null> {
    if (!this.config.cacheDir) return null;

    try {
      // Lazy load file system
      if (!this.fs) {
        this.fs = await import('fs/promises');
      }

      const cacheFile = `${this.config.cacheDir}/remote-config.json`;
      const data = await this.fs.readFile(cacheFile, 'utf-8');
      const cache = JSON.parse(data) as CacheEntry;

      this.cacheLoaded = true;

      // Check if disk cache is still valid
      if (new Date(cache.expiresAt).getTime() < Date.now()) {
        this.log('Disk cache expired');
        return null;
      }

      this.log(`Cache loaded from disk: ${cacheFile}`);
      return cache;
    } catch (error) {
      // File not found or invalid - not an error condition
      this.log(
        `No valid disk cache found: ${error instanceof Error ? error.message : String(error)}`
      );
      this.cacheLoaded = true;
      return null;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log message if logging is enabled
   */
  private log(message: string): void {
    if (this.config.logging) {
      console.log(`[RemoteConfigFetcher] ${message}`);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Get current cache state (for testing/debugging)
   */
  getCacheState(): CacheEntry | null {
    return this.cache;
  }
}
