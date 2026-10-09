import { describe, it, expect } from 'vitest';
import { buildFinalApiResponse } from '../src/lib/agent/response';
import { CompanyProfile, Fact, SourceRecord } from '../src/lib/types';

describe('API Response Schema Validation (Section 13 Compliance)', () => {
  const mockCompany: CompanyProfile = {
    organizationNumber: '923609016',
    name: 'EQUINOR ASA',
    status: 'Active',
    legalForm: 'Allmennaksjeselskap',
    legalFormCode: 'ASA',
    registrationDate: '2007-06-18',
    foundingDate: '1972-09-18',
    businessAddress: {
      street: 'Forusbeen 50',
      postalCode: '4035',
      city: 'STAVANGER',
      municipality: 'STAVANGER',
      country: 'Norway',
    },
    industry: {
      code: '06.100',
      description: 'Extraction of crude petroleum',
    },
    website: 'https://www.equinor.com',
    phone: '+47 51 99 00 00',
    employees: {
      count: 21000,
      registrationDate: '2026-01-15',
      hasRegisteredEmployees: true,
    },
    businessDescription: 'Broad energy company with activities across the Norwegian continental shelf.',
    executiveSummary: 'Equinor ASA is Norway’s largest petroleum and renewable energy operator.',
    financials: {
      year: '2025',
      currency: 'NOK',
      operatingRevenue: 850_000_000_000,
      operatingRevenueFormatted: 'NOK 850.0B',
      operatingProfit: 250_000_000_000,
      operatingProfitFormatted: 'NOK 250.0B',
      netProfit: 120_000_000_000,
      netProfitFormatted: 'NOK 120.0B',
      totalAssets: 1_200_000_000_000,
      totalAssetsFormatted: 'NOK 1.2T',
      totalEquity: 450_000_000_000,
      totalEquityFormatted: 'NOK 450.0B',
      isConsolidated: true,
      sourceUrl: 'https://data.brreg.no/regnskapsregisteret/regnskap/923609016',
      sourceTitle: 'Regnskapsregisteret Annual Accounts 2025',
      sourceDate: '2025-12-31',
      retrievedAt: '2026-10-08T12:00:00Z',
      evidence: 'Statutory audited annual statements.',
      verified: true,
    },
    keyPeople: [
      {
        name: 'Anders Opedal',
        role: 'Konsernsjef / General Manager',
        appointedDate: '2020-11-02',
        roleGroup: 'Daglig leder',
        resigned: false,
        sourceUrl: 'https://data.brreg.no/enhetsregisteret/api/enheter/923609016/roller',
        sourceTitle: 'Brønnøysundregistrene Roller',
      },
    ],
    facts: [],
    sources: [],
    historicalNames: [],
    lastResearchedAt: '2026-10-08T12:00:00Z',
    isDemoMode: false,
  };

  const mockFacts: Fact[] = [
    {
      field: 'legal_name',
      label: 'Legal Name',
      value: 'EQUINOR ASA',
      category: 'overview',
      source_url: 'https://data.brreg.no/enhetsregisteret/api/enheter/923609016',
      source_title: 'Brønnøysundregistrene',
      retrieved_at: '2026-10-08T12:00:00Z',
      evidence: 'Enhetsregisteret official registry record.',
      confidence: 100,
      verified: true,
    },
  ];

  const mockSources: SourceRecord[] = [
    {
      id: 'src-1',
      url: 'https://data.brreg.no/enhetsregisteret/api/enheter/923609016',
      title: 'Enhetsregisteret',
      domain: 'data.brreg.no',
      sourceType: 'official_registry',
      retrievedDate: '2026-10-08T12:00:00Z',
      factsExtractedCount: 1,
      verificationStatus: 'verified',
      matchScore: 100,
    },
  ];

  it('generates the exact Section 13 root schema keys', () => {
    const res = buildFinalApiResponse(mockCompany, mockFacts, mockSources);

    // Root keys
    expect(res).toHaveProperty('company');
    expect(res).toHaveProperty('management');
    expect(res).toHaveProperty('financials');
    expect(res).toHaveProperty('facts');
    expect(res).toHaveProperty('recent_changes');
    expect(res).toHaveProperty('sources');
    expect(res).toHaveProperty('research');
    expect(res).toHaveProperty('warnings');
  });

  it('validates the company entity attributes according to Section 13', () => {
    const res = buildFinalApiResponse(mockCompany, mockFacts, mockSources);

    expect(res.company.organization_number).toBe('923609016');
    expect(res.company.legal_name).toBe('EQUINOR ASA');
    expect(res.company.status).toBe('Active');
    expect(res.company.address).toContain('Forusbeen 50');
    expect(res.company.website).toBe('https://www.equinor.com');
    expect(res.company.industry).toContain('Extraction of crude petroleum');
    expect(res.company.nace_code).toBe('06.100');
  });

  it('ensures research metadata and facts have confidence and freshness', () => {
    const res = buildFinalApiResponse(mockCompany, mockFacts, mockSources);

    expect(res.research.sources_checked).toBe(1);
    expect(res.research.facts_verified).toBe(1);
    expect(res.research.confidence).toBe('high');

    expect(res.facts.length).toBe(1);
    expect(res.facts[0].confidence).toBe('high');
    expect(res.facts[0].freshness_status).toBe('CURRENT');
    expect(res.facts[0].source_url).toContain('brreg.no');
  });
});
