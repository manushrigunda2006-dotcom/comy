import { describe, it, expect } from 'vitest';
import { evaluateCompanyMatch, filterVerifiedFacts } from '../src/lib/matching';

describe('Adversarial Wrong-Company Prevention Suite', () => {
  // Scenario 1: Company A vs Company B with similar name
  // Target: "ABC AS" (org: 911111111)
  // Adversary: "ABC Norge AS" (org: 922222222)
  const companyA = {
    organizationNumber: '911111111',
    name: 'ABC AS',
    domain: 'abc.no',
    address: {
      street: 'Karl Johans gate 1',
      postalCode: '0154',
      city: 'OSLO',
    },
  };

  it('ADVERSARIAL: Company A ("ABC AS") must NEVER match source from Company B ("ABC Norge AS")', () => {
    const candidateSourceB = {
      url: 'https://data.brreg.no/enhetsregisteret/api/enheter/922222222',
      title: 'Enhetsregisteret - ABC Norge AS',
      contentSnippet: 'ABC Norge AS 922222222 Karl Johans gate 1 0154 OSLO',
      sourceType: 'official_registry' as const,
      extractedOrgNumber: '922222222', // Conflicting org number!
      extractedCompanyName: 'ABC Norge AS',
      extractedAddress: 'Karl Johans gate 1, 0154 OSLO',
    };

    const match = evaluateCompanyMatch(companyA, candidateSourceB);
    
    // Conflicting org number must force immediate failure
    expect(match.verified).toBe(false);
    expect(match.totalScore).toBe(0);
    expect(match.rejectionReason).toContain('Conflicting organization number detected');
    expect(match.rejectionReason).toContain('Wrong-company protection engaged');
  });

  it('ADVERSARIAL: Company B data without orgnr but with distinguishing name suffix ("Norge") must be rejected', () => {
    const webSnippetCompanyB = {
      url: 'https://abc-norge.no/about',
      title: 'ABC Norge AS - Norwegian operations',
      contentSnippet: 'ABC Norge delivers corporate solutions in Oslo.',
      sourceType: 'company_website' as const,
      extractedCompanyName: 'ABC Norge AS',
    };

    const match = evaluateCompanyMatch(companyA, webSnippetCompanyB);

    // Name match must be 0 because of distinguishing token 'norge'
    expect(match.nameMatch).toBe(0);
    expect(match.verified).toBe(false);
    expect(match.totalScore).toBeLessThan(60);
    expect(match.rejectionReason).toContain('Source rejected: company identity could not be verified');
  });

  it('PARENT vs SUBSIDIARY: Holding company must never inherit subsidiary facts without matching org number', () => {
    const parentHolding = {
      organizationNumber: '988888888',
      name: 'NORDIC GROUP HOLDING AS',
      domain: 'nordicgroup.no',
      address: {
        street: 'Haakon VIIs gate 10',
        postalCode: '0161',
        city: 'OSLO',
      },
    };

    // Subsidiary operates in same city and has similar name
    const subsidiaryCandidate = {
      url: 'https://data.brreg.no/enhetsregisteret/api/enheter/977777777',
      title: 'Enhetsregisteret - NORDIC GROUP DRIFT AS',
      contentSnippet: 'NORDIC GROUP DRIFT AS 977777777 Haakon VIIs gate 10 0161 OSLO',
      sourceType: 'official_registry' as const,
      extractedOrgNumber: '977777777',
      extractedCompanyName: 'NORDIC GROUP DRIFT AS',
      extractedAddress: 'Haakon VIIs gate 10, 0161 OSLO',
    };

    const match = evaluateCompanyMatch(parentHolding, subsidiaryCandidate);
    expect(match.verified).toBe(false);
    expect(match.totalScore).toBe(0);
    expect(match.rejectionReason).toContain('Wrong-company protection engaged');
  });

  it('SAME ADDRESS / DIFFERENT COMPANY: Two unrelated firms at same address must not cross-contaminate', () => {
    const sharedBuildingCompanyA = {
      organizationNumber: '911223344',
      name: 'BERGEN TECH LAB AS',
      domain: 'bergentechlab.no',
      address: {
        street: 'Thormøhlens gate 51', // Marineholmen Innovation Park
        postalCode: '5006',
        city: 'BERGEN',
      },
    };

    const neighborCandidate = {
      url: 'https://marineholmen-innovations.no/co-tenants',
      title: 'Ocean Data Analytics AS at Thormøhlens gate 51',
      contentSnippet: 'Ocean Data Analytics AS Org nr 999888777 located at Thormøhlens gate 51, 5006 BERGEN',
      sourceType: 'company_website' as const,
      extractedOrgNumber: '999888777',
      extractedCompanyName: 'Ocean Data Analytics AS',
      extractedAddress: 'Thormøhlens gate 51, 5006 BERGEN',
    };

    const match = evaluateCompanyMatch(sharedBuildingCompanyA, neighborCandidate);
    expect(match.verified).toBe(false);
    expect(match.totalScore).toBe(0);
  });

  it('AMBIGUOUS SOURCE: Source under 60 score threshold results in unverified claims being dropped', () => {
    const ambiguousSourceUrl = 'https://some-unverified-directory.net/company/123';
    const verifiedSourceUrl = 'https://data.brreg.no/enhetsregisteret/api/enheter/911223344';

    const facts = [
      {
        id: 'f1',
        field: 'ceo',
        label: 'General Manager',
        value: 'Lars Holm',
        source_url: verifiedSourceUrl,
        confidence: 95,
      },
      {
        id: 'f2',
        field: 'estimated_valuation',
        label: 'Unofficial Rumor Valuation',
        value: 'NOK 1 Billion',
        source_url: ambiguousSourceUrl,
        confidence: 40,
      },
    ];

    const rejectedUrls = new Set([ambiguousSourceUrl]);
    const filtered = filterVerifiedFacts(facts, rejectedUrls);

    expect(filtered.length).toBe(1);
    expect(filtered[0].value).toBe('Lars Holm');
    expect(filtered.some((f) => f.field === 'estimated_valuation')).toBe(false);
  });
});
