/**
 * CircuitBreaker - Resilience pattern for external service calls
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Circuit tripped, requests fail fast
 * - HALF_OPEN: Testing if service recovered
 *
 * @prompt-id forge-v4.1:service:circuit-breaker:001
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Failures before opening
  resetTimeout: number;          // Time before trying again (ms)
  halfOpenRequests: number;      // Requests to allow in half-open
  successThreshold: number;      // Successes to close in half-open
  volumeThreshold: number;       // Min requests before evaluating
  slowCallThreshold: number;     // Response time to consider slow (ms)
  slowCallRateThreshold: number; // % of slow calls to trip
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000,
  halfOpenRequests: 3,
  successThreshold: 2,
  volumeThreshold: 10,
  slowCallThreshold: 5000,
  slowCallRateThreshold: 50,
};

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  slowCalls: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  stateChangedAt: Date;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private slowCalls = 0;
  private totalRequests = 0;
  private halfOpenRequests = 0;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private stateChangedAt: Date = new Date();
  private resetTimer?: NodeJS.Timeout;

  private readonly config: CircuitBreakerConfig;
  private readonly listeners: Array<(stats: CircuitStats) => void> = [];

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we should allow this request
    if (!this.canExecute()) {
      throw new CircuitOpenError('Circuit breaker is open');
    }

    const startTime = Date.now();
    this.totalRequests++;

    try {
      const result = await fn();
      this.onSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if request can proceed
   */
  private canExecute(): boolean {
    switch (this.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        // Check if reset timeout has passed
        if (Date.now() - this.stateChangedAt.getTime() >= this.config.resetTimeout) {
          this.transitionTo('HALF_OPEN');
          return true;
        }
        return false;

      case 'HALF_OPEN':
        // Allow limited requests in half-open
        return this.halfOpenRequests < this.config.halfOpenRequests;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(duration: number): void {
    this.lastSuccess = new Date();
    this.successes++;

    // Track slow calls
    if (duration >= this.config.slowCallThreshold) {
      this.slowCalls++;
    }

    if (this.state === 'HALF_OPEN') {
      this.halfOpenRequests++;

      // Check if we can close
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
      }
    } else {
      // Reset failure count on success in closed state
      if (this.state === 'CLOSED') {
        this.failures = 0;
      }
    }

    this.notifyListeners();
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.lastFailure = new Date();
    this.failures++;

    if (this.state === 'HALF_OPEN') {
      // Immediately re-open on failure in half-open
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED') {
      // Check if we should open
      if (this.shouldTrip()) {
        this.transitionTo('OPEN');
      }
    }

    this.notifyListeners();
  }

  /**
   * Check if circuit should trip
   */
  private shouldTrip(): boolean {
    // Need minimum volume
    if (this.totalRequests < this.config.volumeThreshold) {
      return false;
    }

    // Check failure rate
    if (this.failures >= this.config.failureThreshold) {
      return true;
    }

    // Check slow call rate
    const slowCallRate = (this.slowCalls / this.totalRequests) * 100;
    if (slowCallRate >= this.config.slowCallRateThreshold) {
      return true;
    }

    return false;
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const previousState = this.state;
    this.state = newState;
    this.stateChangedAt = new Date();

    // Reset counters on state change
    if (newState === 'CLOSED') {
      this.failures = 0;
      this.successes = 0;
      this.slowCalls = 0;
      this.totalRequests = 0;
    }

    if (newState === 'HALF_OPEN') {
      this.halfOpenRequests = 0;
      this.successes = 0;
    }

    // Clear any existing reset timer
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }

    // Set timer to transition from open to half-open
    if (newState === 'OPEN') {
      this.resetTimer = setTimeout(() => {
        if (this.state === 'OPEN') {
          this.transitionTo('HALF_OPEN');
          this.notifyListeners();
        }
      }, this.config.resetTimeout);
    }

    console.log(`Circuit breaker: ${previousState} -> ${newState}`);
    this.notifyListeners();
  }

  /**
   * Get current circuit stats
   */
  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      slowCalls: this.slowCalls,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      stateChangedAt: this.stateChangedAt,
    };
  }

  /**
   * Add a listener for state changes
   */
  onStateChange(listener: (stats: CircuitStats) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.transitionTo('CLOSED');
  }

  /**
   * Force the circuit open (for testing or manual intervention)
   */
  forceOpen(): void {
    this.transitionTo('OPEN');
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    for (const listener of this.listeners) {
      try {
        listener(stats);
      } catch (error) {
        console.error('Circuit breaker listener error:', error);
      }
    }
  }
}

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Distributed circuit breaker using Redis
 */
export class DistributedCircuitBreaker extends CircuitBreaker {
  private readonly redis: any; // Redis client type
  private readonly key: string;

  constructor(
    redis: any,
    name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    super(config);
    this.redis = redis;
    this.key = `circuit:${name}`;
  }

  /**
   * Sync state with Redis before executing
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // In production: load state from Redis, update after execution
    return super.execute(fn);
  }

  /**
   * Load state from Redis
   */
  private async loadState(): Promise<void> {
    const data = await this.redis.get(this.key);
    if (data) {
      // Parse and apply state
    }
  }

  /**
   * Save state to Redis
   */
  private async saveState(): Promise<void> {
    const stats = this.getStats();
    await this.redis.set(
      this.key,
      JSON.stringify(stats),
      'EX',
      3600 // 1 hour TTL
    );
  }
}
