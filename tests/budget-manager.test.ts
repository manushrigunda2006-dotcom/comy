import { describe, it, expect, beforeEach } from 'vitest';
import { RequestBudgetManager } from '../src/lib/agent/budget';

describe('Outbound Request Budget and Cost Control System', () => {
  let manager: RequestBudgetManager;

  beforeEach(() => {
    manager = new RequestBudgetManager({
      maxDailyRequests: 2000,
      maxDailyCostUsd: 10.0,
      maxRequestsPerCompany: 6,
    });
    manager.reset();
  });

  it('permits requests when well within budget limits', () => {
    const status = manager.canMakeRequest(0);
    expect(status.allowed).toBe(true);
    expect(status.remainingBudget).toBe(2000);
  });

  it('tracks cache hits without deducting from outbound request counter', () => {
    manager.recordRequest(true, 0); // Cached
    manager.recordRequest(true, 0); // Cached
    manager.recordRequest(false, 0.001); // Outbound

    const metrics = manager.getMetrics();
    expect(metrics.cacheHits).toBe(2);
    expect(metrics.currentOutboundRequests).toBe(1);
    expect(metrics.remainingRequests).toBe(1999);
  });

  it('enforces hard daily limit of 2,000 outbound requests', () => {
    // Simulate consuming all 2000 requests
    for (let i = 0; i < 2000; i++) {
      manager.recordRequest(false, 0);
    }

    const status = manager.canMakeRequest(0);
    expect(status.allowed).toBe(false);
    expect(status.reason).toContain('Daily outbound request limit');
    expect(status.remainingBudget).toBe(0);
  });

  it('enforces maximum per-company request limit', () => {
    const status = manager.canMakeRequest(6); // At threshold
    expect(status.allowed).toBe(false);
    expect(status.reason).toContain('Per-company request threshold');
  });

  it('enforces $10 maximum external cost limit', () => {
    manager.recordRequest(false, 10.05); // Exceed $10

    const status = manager.canMakeRequest(0);
    expect(status.allowed).toBe(false);
    expect(status.reason).toContain('Daily API budget limit');
  });
});
