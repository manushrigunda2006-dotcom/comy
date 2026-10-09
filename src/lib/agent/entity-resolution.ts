import { validateNorwegianOrgNumber, cleanOrgNumber } from '../validation';
import { evaluateCompanyMatch, CompanyMatchingContext, RawSourceCandidate } from '../matching';
import { MatchBreakdown } from '../types';

export interface EntityResolutionResult {
  valid: boolean;
  normalizedOrgNumber: string;
  error?: string;
  canonicalIdentity?: {
    organizationNumber: string;
    legalName: string;
    legalForm?: string;
    status: string;
    address?: {
      street?: string | null;
      postalCode?: string | null;
      city?: string | null;
      country: string;
    };
    domain?: string | null;
  };
}

export class EntityResolver {
  /**
   * Validates and normalizes Norwegian organization number
   */
  public normalizeAndValidate(input: string | number): {
    valid: boolean;
    orgNumber: string;
    formatted: string;
    error?: string;
  } {
    const res = validateNorwegianOrgNumber(input);
    return {
      valid: res.valid,
      orgNumber: res.cleanNumber,
      formatted: res.formattedNumber,
      error: res.error,
    };
  }

  /**
   * Verifies whether a candidate source matches the canonical company identity.
   * Enforces the 5-signal matching formula and rejects wrong companies.
   */
  public verifySourceIdentity(
    canonical: CompanyMatchingContext,
    candidate: RawSourceCandidate
  ): MatchBreakdown {
    return evaluateCompanyMatch(canonical, candidate);
  }

  /**
   * Adversarial sanity check to guarantee no cross-company fact assignment.
   */
  public isWrongCompany(
    targetOrgNumber: string,
    candidateOrgNumber?: string | null
  ): boolean {
    if (!candidateOrgNumber) return false;
    const cleanTarget = cleanOrgNumber(targetOrgNumber);
    const cleanCand = cleanOrgNumber(candidateOrgNumber);
    return cleanCand.length === 9 && cleanCand !== cleanTarget;
  }
}

export const defaultEntityResolver = new EntityResolver();
