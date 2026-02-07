/**
 * Circuit breaker pattern implementation for resilience
 * Prevents cascading failures by stopping requests to failing services
 */

/**
 * States of the circuit breaker
 */
export enum CircuitState {
  CLOSED = 'CLOSED',      // Normal operation
  OPEN = 'OPEN',          // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Configuration for circuit breaker
 */
export interface CircuitBreakerConfig {
  /**
   * Number of failures before opening the circuit (default: 5)
   */
  failureThreshold?: number;

  /**
   * Number of successes before closing the circuit from HALF_OPEN (default: 2)
   */
  successThreshold?: number;

  /**
   * Time in milliseconds before attempting to recover (default: 60000 = 1 minute)
   */
  resetTimeout?: number;

  /**
   * Optional name for the breaker (for logging/debugging)
   */
  name?: string;
}

/**
 * Circuit breaker for handling service failures
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config?: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? 2,
      resetTimeout: config?.resetTimeout ?? 60000,
      name: config?.name ?? 'CircuitBreaker',
    };
  }

  /**
   * Check if the circuit is open (rejecting requests)
   */
  public isOpen(): boolean {
    if (this.state === CircuitState.OPEN) {
      // Check if it's time to attempt recovery
      const now = Date.now();
      if (now - this.lastFailureTime > this.config.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.failureCount = 0;
        this.successCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Check if circuit is half-open (testing recovery)
   */
  public isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }

  /**
   * Get current state
   */
  public getState(): CircuitState {
    // Update state based on timeout
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.config.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.failureCount = 0;
        this.successCount = 0;
      }
    }
    return this.state;
  }

  /**
   * Record a successful operation
   */
  public recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  /**
   * Record a failed operation
   */
  public recordFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
    }
  }

  /**
   * Reset the circuit breaker to CLOSED state
   */
  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }

  /**
   * Get statistics
   */
  public getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
  } {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}
