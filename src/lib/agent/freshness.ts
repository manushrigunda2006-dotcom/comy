export type FreshnessStatus = 'CURRENT' | 'RECENT' | 'STALE' | 'UNKNOWN';

export interface FreshnessPolicy {
  category: 'status' | 'management' | 'address' | 'financials' | 'description' | 'general';
  maxCurrentDays: number;
  maxRecentDays: number;
}

export const FRESHNESS_POLICIES: Record<string, FreshnessPolicy> = {
  status: { category: 'status', maxCurrentDays: 14, maxRecentDays: 60 },
  management: { category: 'management', maxCurrentDays: 30, maxRecentDays: 90 },
  address: { category: 'address', maxCurrentDays: 30, maxRecentDays: 90 },
  financials: { category: 'financials', maxCurrentDays: 365, maxRecentDays: 730 },
  description: { category: 'description', maxCurrentDays: 90, maxRecentDays: 180 },
  general: { category: 'general', maxCurrentDays: 30, maxRecentDays: 90 },
};

/**
 * Evaluates the freshness status of a fact based on its verification date and policy category
 */
export function calculateFreshnessStatus(
  lastVerifiedIso?: string | null,
  category: string = 'general'
): FreshnessStatus {
  if (!lastVerifiedIso) return 'UNKNOWN';

  const verifiedTime = new Date(lastVerifiedIso).getTime();
  if (isNaN(verifiedTime)) return 'UNKNOWN';

  const now = Date.now();
  const diffDays = Math.max(0, Math.floor((now - verifiedTime) / (1000 * 60 * 60 * 24)));

  const policy = FRESHNESS_POLICIES[category] || FRESHNESS_POLICIES.general;

  if (diffDays <= policy.maxCurrentDays) {
    return 'CURRENT';
  } else if (diffDays <= policy.maxRecentDays) {
    return 'RECENT';
  } else {
    return 'STALE';
  }
}

/**
 * Returns a human-friendly freshness description and color badge class
 */
export function getFreshnessBadge(status: FreshnessStatus): {
  label: string;
  badgeClass: string;
  description: string;
} {
  switch (status) {
    case 'CURRENT':
      return {
        label: 'Current',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        description: 'Verified within standard fresh window',
      };
    case 'RECENT':
      return {
        label: 'Recent',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        description: 'Verified recently from public records',
      };
    case 'STALE':
      return {
        label: 'Stale',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        description: 'Eligible for periodic re-verification',
      };
    case 'UNKNOWN':
    default:
      return {
        label: 'Unknown',
        badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
        description: 'Verification date unconfirmed',
      };
  }
}
