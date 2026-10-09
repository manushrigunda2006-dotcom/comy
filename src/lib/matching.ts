import { MatchBreakdown, SourceRecord } from './types';
import { cleanOrgNumber } from './validation';

export interface CompanyMatchingContext {
  organizationNumber: string;
  name: string;
  domain?: string | null;
  address?: {
    street?: string | null;
    postalCode?: string | null;
    city?: string | null;
  } | null;
}

export interface RawSourceCandidate {
  url: string;
  title: string;
  contentSnippet?: string;
  sourceType: SourceRecord['sourceType'];
  extractedOrgNumber?: string | null;
  extractedCompanyName?: string | null;
  extractedDomain?: string | null;
  extractedAddress?: string | null;
}

/**
 * Normalizes text for matching comparison
 */
export function normalizeString(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts clean domain name from a URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  }
}

/**
 * Evaluates company identity signals between a candidate source and target company
 */
export function evaluateCompanyMatch(
  target: CompanyMatchingContext,
  candidate: RawSourceCandidate
): MatchBreakdown {
  let orgNumberMatch = 0;
  let nameMatch = 0;
  let domainMatch = 0;
  let addressMatch = 0;

  const targetOrg = cleanOrgNumber(target.organizationNumber);
  const targetNormName = normalizeString(target.name);
  const targetDomain = target.domain ? extractDomain(target.domain) : null;
  const candidateDomain = extractDomain(candidate.url);

  const combinedCandidateText = normalizeString(
    `${candidate.url} ${candidate.title} ${candidate.contentSnippet || ''} ${candidate.extractedCompanyName || ''} ${candidate.extractedAddress || ''}`
  );

  // CONFLICTING ORG NUMBER GUARD:
  // If candidate explicitly identifies a different 9-digit Norwegian organization number,
  // this is unequivocally a wrong company. Instantly reject with score 0.
  const candidateOrg = candidate.extractedOrgNumber ? cleanOrgNumber(candidate.extractedOrgNumber) : null;
  if (candidateOrg && candidateOrg.length === 9 && candidateOrg !== targetOrg) {
    return {
      orgNumberMatch: 0,
      nameMatch: 0,
      domainMatch: 0,
      addressMatch: 0,
      identifierMatch: 0,
      totalScore: 0,
      verified: false,
      rejectionReason: `Source rejected: company identity could not be verified. Conflicting organization number detected (${candidateOrg} != ${targetOrg}). Wrong-company protection engaged.`,
    };
  }

  // Also check if text has explicit "org. nr" or "organisasjonsnummer" with a DIFFERENT 9-digit number
  const orgInTextMatch = combinedCandidateText.match(/(?:org|organisasjonsnummer|orgnr)\D{0,10}(\d{9})/i);
  if (orgInTextMatch && orgInTextMatch[1] && orgInTextMatch[1] !== targetOrg) {
    return {
      orgNumberMatch: 0,
      nameMatch: 0,
      domainMatch: 0,
      addressMatch: 0,
      identifierMatch: 0,
      totalScore: 0,
      verified: false,
      rejectionReason: `Source rejected: company identity could not be verified. Conflicting organization number found in source body (${orgInTextMatch[1]} != ${targetOrg}). Could not confidently verify this fact for the requested organization.`,
    };
  }

  // 1. Organization Number Match (up to 50 pts)
  const rawUrlContainsOrg = candidate.url.includes(targetOrg);
  const textContainsOrg = combinedCandidateText.includes(targetOrg);

  if (candidateOrg === targetOrg || rawUrlContainsOrg || textContainsOrg) {
    orgNumberMatch = 50;
  } else if (candidate.sourceType === 'official_registry' || candidate.sourceType === 'financial_register') {
    if (candidate.url.includes(targetOrg)) {
      orgNumberMatch = 50;
    }
  }

  // 2. Legal Company Name Match (up to 25 pts)
  // Norwegian company naming strictly differentiates subsidiaries & separate legal entities:
  // e.g. "ABC AS" vs "ABC Norge AS" are two distinct corporate entities.
  let identifierMatch = 0;
  if (targetNormName) {
    const legalSuffixes = /\b(as|asa|enk|ans|da|ba|sa|nuf|holding|group)\b/g;
    const cleanTargetTokens = targetNormName
      .replace(legalSuffixes, '')
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 1);

    const cleanTargetName = cleanTargetTokens.join(' ');

    let candidateNameTokens: string[] = [];
    if (candidate.extractedCompanyName) {
      candidateNameTokens = normalizeString(candidate.extractedCompanyName)
        .replace(legalSuffixes, '')
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 1);
    }

    const candidateCleanName = candidateNameTokens.join(' ');

    if (candidateCleanName && cleanTargetName) {
      if (candidateCleanName === cleanTargetName) {
        // Exact name match
        nameMatch = 25;
      } else {
        // Check if there are distinguishing tokens that indicate a different entity
        // e.g. "abc norge" has token "norge" which "abc" does not have
        const targetTokenSet = new Set(cleanTargetTokens);
        const candidateTokenSet = new Set(candidateNameTokens);
        
        const hasExtraDistinguishingToken =
          candidateNameTokens.some((t) => !targetTokenSet.has(t) && ['norge', 'nordic', 'holding', 'invest', 'eiendom', 'drift', 'tech'].includes(t)) ||
          cleanTargetTokens.some((t) => !candidateTokenSet.has(t) && ['norge', 'nordic', 'holding', 'invest', 'eiendom', 'drift', 'tech'].includes(t));

        if (hasExtraDistinguishingToken) {
          // Different entity, do not award name match
          nameMatch = 0;
        } else if (
          cleanTargetName.includes(candidateCleanName) ||
          candidateCleanName.includes(cleanTargetName)
        ) {
          nameMatch = 18;
        }
      }
    } else if (cleanTargetName && combinedCandidateText.includes(cleanTargetName)) {
      // Check if target name appears in text, verify no conflicting adjacent entity suffix
      const adversarialRegex = new RegExp(`\\b${cleanTargetName}\\s+(?:norge|nordic|holding|invest|eiendom)\\b`, 'i');
      if (adversarialRegex.test(combinedCandidateText) && !cleanTargetName.includes('norge')) {
        nameMatch = 0; // Adversarial affiliate reference
      } else {
        nameMatch = 25;
      }
    }
  }

  // 3. Official Domain Match (up to 15 pts)
  if (
    candidate.sourceType === 'official_registry' ||
    candidate.sourceType === 'financial_register' ||
    candidate.sourceType === 'roles_register'
  ) {
    if (candidateDomain.includes('brreg.no')) {
      domainMatch = 15;
    }
  } else if (targetDomain && candidateDomain) {
    if (targetDomain === candidateDomain || candidateDomain.endsWith(`.${targetDomain}`)) {
      domainMatch = 15;
    } else if (
      candidate.sourceType === 'company_website' &&
      (targetDomain.includes(candidateDomain) || candidateDomain.includes(targetDomain))
    ) {
      domainMatch = 15;
    }
  }

  // 4. Address Match (up to 10 pts)
  if (target.address) {
    const postCode = target.address.postalCode?.trim();
    const city = normalizeString(target.address.city);
    const street = normalizeString(target.address.street);

    let addressMatches = 0;
    if (postCode && postCode.length === 4 && combinedCandidateText.includes(postCode)) addressMatches += 4;
    if (city && city.length > 2 && combinedCandidateText.includes(city)) addressMatches += 3;
    if (street && street.length > 4 && combinedCandidateText.includes(street)) addressMatches += 3;

    addressMatch = Math.min(10, addressMatches);
  }

  // 5. Other Identifiers Match (up to 10 pts)
  // e.g. MVA registration suffix (NO 912345678 MVA), Brreg filing key, NACE code reference
  if (
    combinedCandidateText.includes(`mva ${targetOrg}`) ||
    combinedCandidateText.includes(`${targetOrg} mva`) ||
    combinedCandidateText.includes(`enhetsregisteret`) && orgNumberMatch > 0
  ) {
    identifierMatch = 10;
  }

  const rawScore = orgNumberMatch + nameMatch + domainMatch + addressMatch + identifierMatch;
  const totalScore = Math.min(100, rawScore);

  // Verification threshold: 75+ for Verified, 60-74 for Needs Verification, < 60 Reject
  const verified = totalScore >= 75;
  const isRejected = totalScore < 60;

  let rejectionReason: string | null = null;
  if (isRejected) {
    rejectionReason = `Source rejected: company identity could not be verified (Score: ${totalScore}/100, minimum 60 required). Could not confidently verify this fact for the requested organization.`;
  }

  return {
    orgNumberMatch,
    nameMatch,
    domainMatch,
    addressMatch,
    identifierMatch,
    totalScore,
    verified,
    rejectionReason,
  };
}

/**
 * Filter facts to ensure NO fact from a rejected source is published
 */
export function filterVerifiedFacts<T extends { source_url: string; confidence: number; verified?: boolean }>(
  facts: T[],
  rejectedSourceUrls: Set<string>
): T[] {
  return facts.filter(f => {
    if (rejectedSourceUrls.has(f.source_url)) return false;
    if (f.confidence < 60) return false;
    return true;
  });
}
