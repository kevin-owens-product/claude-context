/**
 * CircuitBreaker Tests
 *
 * @prompt-id forge-v4.1:test:circuit-breaker:001
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitBreakerOptions, CircuitOpenError } from '../circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  const defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 100, // 100ms for fast tests
    slowCallThreshold: 50,
    slowCallRateThreshold: 50,
  };

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(defaultOptions);
  });

  describe('CLOSED state', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should execute function successfully in CLOSED state', async () => {
      const result = await circuitBreaker.execute(async () => 'success');
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should track failures in CLOSED state', async () => {
      const failingFn = async () => {
        throw new Error('failure');
      };

      // First two failures should keep circuit CLOSED
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow('failure');
      expect(circuitBreaker.getState()).toBe('CLOSED');

      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow('failure');
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should transition to OPEN after reaching failure threshold', async () => {
      const failingFn = async () => {
        throw new Error('failure');
      };

      // Execute until threshold is reached
      for (let i = 0; i < defaultOptions.failureThreshold; i++) {
        await expect(circuitBreaker.execute(failingFn)).rejects.toThrow('failure');
      }

      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should reset failure count on success', async () => {
      const failingFn = async () => {
        throw new Error('failure');
      };
      const successFn = async () => 'success';

      // Two failures
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow();

      // Success resets the count
      await circuitBreaker.execute(successFn);

      // Two more failures shouldn't trigger OPEN (count was reset)
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      // Drive circuit to OPEN state
      const failingFn = async () => {
        throw new Error('failure');
      };
      for (let i = 0; i < defaultOptions.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected
        }
      }
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should reject calls immediately when OPEN', async () => {
      await expect(
        circuitBreaker.execute(async () => 'should not run')
      ).rejects.toThrow(CircuitOpenError);
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, defaultOptions.timeout + 10));

      // Next call should be allowed (transitions to HALF_OPEN)
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
    });
  });

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      // Drive circuit to OPEN state
      const failingFn = async () => {
        throw new Error('failure');
      };
      for (let i = 0; i < defaultOptions.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected
        }
      }

      // Wait for timeout to enter HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, defaultOptions.timeout + 10));
    });

    it('should transition to CLOSED after success threshold', async () => {
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');

      // Execute successful calls to reach threshold
      for (let i = 0; i < defaultOptions.successThreshold; i++) {
        await circuitBreaker.execute(async () => 'success');
      }

      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should transition back to OPEN on failure in HALF_OPEN', async () => {
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');

      // One failure should re-open the circuit
      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('failure');
        })
      ).rejects.toThrow('failure');

      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('slow call tracking', () => {
    it('should track slow calls', async () => {
      const slowFn = async () => {
        await new Promise(resolve => setTimeout(resolve, defaultOptions.slowCallThreshold + 10));
        return 'slow';
      };

      // Execute slow calls - they should count towards failure
      for (let i = 0; i < defaultOptions.failureThreshold; i++) {
        await circuitBreaker.execute(slowFn);
      }

      // Circuit should be OPEN due to slow calls
      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('getStats', () => {
    it('should return circuit statistics', async () => {
      const stats = circuitBreaker.getStats();

      expect(stats).toEqual({
        state: 'CLOSED',
        failures: 0,
        successes: 0,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        lastFailureTime: null,
      });
    });

    it('should track failure statistics', async () => {
      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('failure');
        })
      ).rejects.toThrow();

      const stats = circuitBreaker.getStats();
      expect(stats.failures).toBe(1);
      expect(stats.consecutiveFailures).toBe(1);
      expect(stats.lastFailureTime).not.toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset circuit to CLOSED state', async () => {
      // Drive to OPEN state
      const failingFn = async () => {
        throw new Error('failure');
      };
      for (let i = 0; i < defaultOptions.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected
        }
      }
      expect(circuitBreaker.getState()).toBe('OPEN');

      // Reset
      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getStats().failures).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle async errors correctly', async () => {
      const asyncError = async () => {
        await Promise.resolve();
        throw new Error('async failure');
      };

      await expect(circuitBreaker.execute(asyncError)).rejects.toThrow('async failure');
    });

    it('should handle non-Error throws', async () => {
      const nonErrorThrow = async () => {
        throw 'string error'; // eslint-disable-line no-throw-literal
      };

      await expect(circuitBreaker.execute(nonErrorThrow)).rejects.toBe('string error');
    });

    it('should preserve function return type', async () => {
      const typedFn = async (): Promise<{ value: number }> => ({ value: 42 });

      const result = await circuitBreaker.execute(typedFn);
      expect(result.value).toBe(42);
    });
  });
});
