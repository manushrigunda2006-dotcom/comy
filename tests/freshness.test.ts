import { describe, it, expect } from 'vitest';
import { formatRelativeTime, formatFullDate, getFreshnessStatus } from '../src/lib/freshness';

describe('Freshness & Date Tracking System', () => {
  it('should format relative timestamps with appropriate units and prefixes', () => {
    const now = new Date();

    // 2 hours ago
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo, 'Verified')).toBe('Verified 2 hours ago');

    // 1 day ago
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');

    // 8 months ago
    const eightMonthsAgo = new Date(now.getTime() - 8 * 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(eightMonthsAgo, 'Source published')).toBe('Source published 8 months ago');
  });

  it('should format full human-readable calendar dates', () => {
    const formatted = formatFullDate('2026-10-03');
    expect(formatted).toContain('October');
    expect(formatted).toContain('2026');
  });

  it('should categorize freshness into proper tiers', () => {
    const nowIso = new Date().toISOString();
    expect(getFreshnessStatus(nowIso).status).toBe('fresh');

    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    expect(getFreshnessStatus(twoWeeksAgo).status).toBe('recent');

    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    expect(getFreshnessStatus(twoMonthsAgo).status).toBe('aging');

    const oneYearAgo = new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString();
    expect(getFreshnessStatus(oneYearAgo).status).toBe('stale');
  });
});
