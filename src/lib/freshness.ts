/**
 * Freshness and timestamp tracking for facts and sources
 */

/**
 * Format relative time (e.g. "Verified 2 hours ago", "Source published 8 months ago")
 */
export function formatRelativeTime(dateString?: string | null, prefix: string = ''): string {
  if (!dateString) return 'Date unknown';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  let relative = '';
  if (diffSec < 60) {
    relative = 'just now';
  } else if (diffMin < 60) {
    relative = `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHour < 24) {
    relative = `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDay < 30) {
    relative = `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  } else if (diffMonth < 12) {
    relative = `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`;
  } else {
    relative = `${diffYear} ${diffYear === 1 ? 'year' : 'years'} ago`;
  }

  return prefix ? `${prefix} ${relative}` : relative;
}

/**
 * Format readable human date (e.g. "October 3, 2026")
 */
export function formatFullDate(dateString?: string | null): string {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Freshness status badge metadata
 */
export function getFreshnessStatus(checkedDateStr?: string | null): {
  status: 'fresh' | 'recent' | 'aging' | 'stale';
  color: string;
  label: string;
} {
  if (!checkedDateStr) {
    return { status: 'stale', color: 'text-slate-500 bg-slate-100', label: 'Unverified' };
  }

  const date = new Date(checkedDateStr);
  if (isNaN(date.getTime())) {
    return { status: 'recent', color: 'text-slate-600 bg-slate-100', label: 'Recent' };
  }

  const daysOld = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);

  if (daysOld <= 7) {
    return { status: 'fresh', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'Fresh' };
  } else if (daysOld <= 30) {
    return { status: 'recent', color: 'text-blue-700 bg-blue-50 border-blue-200', label: 'Recent' };
  } else if (daysOld <= 90) {
    return { status: 'aging', color: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Aging' };
  } else {
    return { status: 'stale', color: 'text-rose-700 bg-rose-50 border-rose-200', label: 'Stale' };
  }
}
