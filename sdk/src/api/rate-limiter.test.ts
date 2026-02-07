/**
 * Tests for rate limiting module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from './rate-limiter.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 1000, // 1 second
      perProject: true,
    });
  });

  it('should allow requests within limit', () => {
    expect(limiter.isAllowed('user-1')).toBe(true);
    expect(limiter.isAllowed('user-1')).toBe(true);
    expect(limiter.isAllowed('user-1')).toBe(true);
  });

  it('should reject requests exceeding limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(limiter.isAllowed('user-1')).toBe(true);
    }

    expect(limiter.isAllowed('user-1')).toBe(false);
    expect(limiter.isAllowed('user-1')).toBe(false);
  });

  it('should track separate limits for different identifiers', () => {
    for (let i = 0; i < 5; i++) {
      expect(limiter.isAllowed('user-1')).toBe(true);
    }

    expect(limiter.isAllowed('user-1')).toBe(false);

    // user-2 should still have requests available
    expect(limiter.isAllowed('user-2')).toBe(true);
    expect(limiter.isAllowed('user-2')).toBe(true);
  });

  it('should return correct remaining count', () => {
    expect(limiter.getRemaining('user-1')).toBe(5);

    limiter.isAllowed('user-1');
    expect(limiter.getRemaining('user-1')).toBe(4);

    limiter.isAllowed('user-1');
    expect(limiter.getRemaining('user-1')).toBe(3);
  });

  it('should return max requests for unknown identifier', () => {
    expect(limiter.getRemaining('unknown')).toBe(5);
  });

  it('should return reset time', () => {
    const before = Date.now();
    limiter.isAllowed('user-1');
    const resetTime = limiter.getResetTime('user-1');
    const after = Date.now();

    // Reset time should be approximately 1 second from now
    expect(resetTime).toBeGreaterThanOrEqual(before + 900);
    expect(resetTime).toBeLessThanOrEqual(after + 1100);
  });

  it('should reset after time window expires', async () => {
    const limiter = new RateLimiter({
      maxRequests: 2,
      windowMs: 100, // 100ms for quick testing
      perProject: true,
    });

    expect(limiter.isAllowed('user-1')).toBe(true);
    expect(limiter.isAllowed('user-1')).toBe(true);
    expect(limiter.isAllowed('user-1')).toBe(false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 110));

    expect(limiter.isAllowed('user-1')).toBe(true);
  });

  it('should clear all records', () => {
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-2');

    limiter.clear();

    expect(limiter.getRemaining('user-1')).toBe(5);
    expect(limiter.getRemaining('user-2')).toBe(5);
  });

  it('should cleanup expired records', async () => {
    const limiter = new RateLimiter({
      maxRequests: 2,
      windowMs: 100, // 100ms for quick testing
      perProject: true,
    });

    limiter.isAllowed('user-1');
    limiter.isAllowed('user-2');

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 110));

    limiter.cleanup();

    // After cleanup, we should start fresh with max requests available
    expect(limiter.getRemaining('user-1')).toBe(2);
    expect(limiter.getRemaining('user-2')).toBe(2);
  });

  it('should handle multiple rapid requests correctly', () => {
    const limiter = new RateLimiter({
      maxRequests: 100,
      windowMs: 1000,
      perProject: true,
    });

    for (let i = 0; i < 100; i++) {
      expect(limiter.isAllowed('user-1')).toBe(true);
    }

    expect(limiter.isAllowed('user-1')).toBe(false);
    expect(limiter.getRemaining('user-1')).toBe(0);
  });
});
