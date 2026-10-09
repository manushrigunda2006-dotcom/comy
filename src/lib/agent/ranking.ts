import { SourceRecord } from '../types';

export interface SourcePriorityRank {
  rank: number;
  priorityTier: 'official_registry' | 'financial_register' | 'governance_register' | 'official_website' | 'regulatory' | 'public_database' | 'other';
  authorityWeight: number;
}

export function getSourceAuthorityRank(sourceType: SourceRecord['sourceType'], domain: string): SourcePriorityRank {
  // 1. Official Norwegian government/company registries (Brønnøysundregistrene Enhetsregisteret)
  if (sourceType === 'official_registry' || domain.includes('data.brreg.no/enhetsregisteret')) {
    return { rank: 1, priorityTier: 'official_registry', authorityWeight: 1.0 };
  }

  // 2. Brønnøysundregistrene Regnskapsregisteret / Roller
  if (sourceType === 'financial_register' || domain.includes('regnskapsregisteret')) {
    return { rank: 2, priorityTier: 'financial_register', authorityWeight: 0.95 };
  }

  if (sourceType === 'roles_register' || domain.includes('roller')) {
    return { rank: 2, priorityTier: 'governance_register', authorityWeight: 0.95 };
  }

  // 3. Official company website
  if (sourceType === 'company_website') {
    return { rank: 3, priorityTier: 'official_website', authorityWeight: 0.85 };
  }

  // 4. Official annual reports
  if (sourceType === 'annual_report') {
    return { rank: 4, priorityTier: 'financial_register', authorityWeight: 0.80 };
  }

  // 5. Public business register
  if (sourceType === 'public_business_register') {
    return { rank: 5, priorityTier: 'public_database', authorityWeight: 0.70 };
  }

  // 6. Other permitted public sources
  return { rank: 6, priorityTier: 'other', authorityWeight: 0.50 };
}

/**
 * Sorts sources by authoritative hierarchy:
 * Registry > Financial Register > Roles > Website > Other
 */
export function rankSources<T extends { sourceType: SourceRecord['sourceType']; domain: string }>(
  sources: T[]
): T[] {
  return [...sources].sort((a, b) => {
    const rankA = getSourceAuthorityRank(a.sourceType, a.domain);
    const rankB = getSourceAuthorityRank(b.sourceType, b.domain);
    return rankA.rank - rankB.rank;
  });
}
