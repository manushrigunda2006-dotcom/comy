import { ConfidenceTier, Fact, FinancialStatement, SourceRecord } from './types';

/**
 * Categorize numerical confidence score into actionable tier
 */
export function getConfidenceTier(score: number): ConfidenceTier {
  if (score >= 95) return 'verified';
  if (score >= 80) return 'high';
  if (score >= 60) return 'needs_verification';
  return 'rejected';
}

export function getConfidenceBadgeColor(tier: ConfidenceTier): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (tier) {
    case 'verified':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        label: 'Verified (95-100%)',
      };
    case 'high':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        label: 'High Confidence (80-94%)',
      };
    case 'needs_verification':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        label: 'Needs Verification (60-79%)',
      };
    case 'rejected':
    default:
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        text: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-800',
        label: 'Rejected (<60%)',
      };
  }
}

/**
 * Calculate confidence for a candidate fact given its source authority and verification score
 */
export function calculateFactConfidence(params: {
  sourceType: SourceRecord['sourceType'];
  sourceMatchScore: number;
  hasDirectEvidenceQuote: boolean;
  isOfficialRegistry: boolean;
  isFinancialData?: boolean;
}): number {
  const { sourceType, sourceMatchScore, hasDirectEvidenceQuote, isOfficialRegistry, isFinancialData } = params;

  // Base confidence by source authority
  let baseScore = 60;

  if (isOfficialRegistry) {
    baseScore = 98;
  } else if (sourceType === 'financial_register' || sourceType === 'roles_register') {
    baseScore = 98;
  } else if (sourceType === 'annual_report') {
    baseScore = 92;
  } else if (sourceType === 'company_website') {
    baseScore = 85;
  } else if (sourceType === 'public_business_register') {
    baseScore = 80;
  }

  // Multiply by source match quality (if source only matches 60%, scale down)
  const matchRatio = sourceMatchScore / 100;
  let finalConfidence = Math.round(baseScore * matchRatio);

  // Bonus for explicit textual quotation evidence
  if (hasDirectEvidenceQuote && finalConfidence < 98) {
    finalConfidence = Math.min(99, finalConfidence + 3);
  }

  // STRICT FINANCIAL PROTECTION RULE:
  // Financial numbers from third-party or unverified sources are penalized heavily
  if (isFinancialData) {
    if (!isOfficialRegistry && sourceType !== 'annual_report' && sourceType !== 'financial_register') {
      finalConfidence = Math.min(50, finalConfidence); // Force rejection if not official or audited
    }
    if (sourceMatchScore < 75) {
      finalConfidence = 40; // Reject financial data unless source identity is definitively verified
    }
  }

  return Math.max(0, Math.min(100, finalConfidence));
}

/**
 * Validates financial facts strictly to prevent any fabrication
 */
export function validateFinancialFact(
  statement: Partial<FinancialStatement> | null | undefined
): { valid: boolean; reason?: string } {
  if (!statement) {
    return { valid: false, reason: 'Not found in verified public sources.' };
  }

  if (!statement.year || !statement.sourceUrl) {
    return { valid: false, reason: 'Missing required accounting year or source URL.' };
  }

  if (!statement.verified) {
    return { valid: false, reason: 'Financial statement identity not verified.' };
  }

  const hasNumbers = 
    statement.operatingRevenue !== undefined ||
    statement.operatingProfit !== undefined ||
    statement.netProfit !== undefined ||
    statement.totalAssets !== undefined;

  if (!hasNumbers) {
    return { valid: false, reason: 'Not found in verified public sources.' };
  }

  return { valid: true };
}
