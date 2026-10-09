import { describe, it, expect } from 'vitest';
import { evaluateCompanyMatch, filterVerifiedFacts } from '../src/lib/matching';

describe('Company Matching and Identity Verification System', () => {
  const targetCompany = {
    organizationNumber: '923609016',
    name: 'EQUINOR ASA',
    domain: 'equinor.com',
    address: {
      street: 'Forusbeen 50',
      postalCode: '4035',
      city: 'STAVANGER',
    },
  };

  it('should award maximum score for perfectly matching primary registry source', () => {
    const candidate = {
      url: 'https://data.brreg.no/enhetsregisteret/api/enheter/923609016',
      title: 'Enhetsregisteret - EQUINOR ASA',
      contentSnippet: 'EQUINOR ASA 923609016 Forusbeen 50 4035 STAVANGER',
      sourceType: 'official_registry' as const,
      extractedOrgNumber: '923609016',
      extractedCompanyName: 'EQUINOR ASA',
      extractedAddress: 'Forusbeen 50, 4035 STAVANGER',
    };

    const match = evaluateCompanyMatch(targetCompany, candidate);
    expect(match.orgNumberMatch).toBe(50);
    expect(match.nameMatch).toBe(25);
    expect(match.domainMatch).toBe(15);
    expect(match.addressMatch).toBe(10);
    expect(match.totalScore).toBe(100);
    expect(match.verified).toBe(true);
    expect(match.rejectionReason).toBeNull();
  });

  it('should verify official company website matching domain and name', () => {
    const candidate = {
      url: 'https://www.equinor.com/en/about-us',
      title: 'Equinor - Norwegian Energy Company',
      contentSnippet: 'Equinor ASA is a broad energy company with 21,000 committed colleagues.',
      sourceType: 'company_website' as const,
    };

    const match = evaluateCompanyMatch(targetCompany, candidate);
    expect(match.domainMatch).toBe(15);
    expect(match.nameMatch).toBe(25);
    expect(match.totalScore).toBeGreaterThanOrEqual(40);
  });

  it('WRONG COMPANY -> REJECT: should reject a completely unrelated company source', () => {
    const wrongCompanyCandidate = {
      url: 'https://www.unrelated-bakery-oslo.no/contact',
      title: 'Baker Hansen AS - Best Bakery in Oslo',
      contentSnippet: 'Welcome to Baker Hansen. Org nr 987654321, Bogstadveien 54, Oslo.',
      sourceType: 'company_website' as const,
      extractedOrgNumber: '987654321',
      extractedCompanyName: 'Baker Hansen AS',
      extractedAddress: 'Bogstadveien 54, Oslo',
    };

    const match = evaluateCompanyMatch(targetCompany, wrongCompanyCandidate);
    expect(match.orgNumberMatch).toBe(0);
    expect(match.nameMatch).toBe(0);
    expect(match.domainMatch).toBe(0);
    expect(match.addressMatch).toBe(0);
    expect(match.totalScore).toBe(0);
    expect(match.verified).toBe(false);
    expect(match.rejectionReason).toContain('Source rejected: company identity could not be verified');
  });

  it('LOW CONFIDENCE / REJECTED SOURCE -> DO NOT PUBLISH facts', () => {
    const rejectedUrl = 'https://fraudulent-unverified-site.com/company';
    const verifiedUrl = 'https://data.brreg.no/enhetsregisteret/api/enheter/923609016';

    const rawFacts = [
      {
        id: 'fact-1',
        field: 'legal_name',
        label: 'Legal Name',
        value: 'EQUINOR ASA',
        source_url: verifiedUrl,
        confidence: 99,
        verified: true,
      },
      {
        id: 'fact-2',
        field: 'fabricated_valuation',
        label: 'Valuation',
        value: 'NOK 500 Billion Fake Value',
        source_url: rejectedUrl,
        confidence: 45,
        verified: false,
      },
      {
        id: 'fact-3',
        field: 'unsupported_ceo',
        label: 'Unofficial CEO Rumor',
        value: 'John Doe',
        source_url: verifiedUrl,
        confidence: 55, // Below 60 threshold
        verified: false,
      },
    ];

    const rejectedSet = new Set([rejectedUrl]);
    const publishedFacts = filterVerifiedFacts(rawFacts, rejectedSet);

    // Only fact-1 from the verified source with >=60 confidence should be published
    expect(publishedFacts.length).toBe(1);
    expect(publishedFacts[0].field).toBe('legal_name');
    expect(publishedFacts.find(f => f.field === 'fabricated_valuation')).toBeUndefined();
    expect(publishedFacts.find(f => f.field === 'unsupported_ceo')).toBeUndefined();
  });
});
