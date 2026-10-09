import { describe, it, expect } from 'vitest';
import { evaluateCompanyProfile } from '../src/lib/agent/evaluator';
import { CompanyProfile, Fact, SourceRecord } from '../src/lib/types';

describe('Official Hackathon Judging Rubric Evaluator Suite', () => {
  const verifiedCompany: CompanyProfile = {
    organizationNumber: '923609016',
    name: 'EQUINOR ASA',
    status: 'Active',
    legalForm: 'Allmennaksjeselskap',
    registrationDate: '2007-06-18',
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
    employees: { count: 21000, hasRegisteredEmployees: true },
    keyPeople: [
      {
        name: 'Anders Opedal',
        role: 'General Manager (Daglig leder)',
        roleGroup: 'Daglig leder',
        resigned: false,
        sourceUrl: 'https://data.brreg.no/enhetsregisteret/api/enheter/923609016/roller',
        sourceTitle: 'Brønnøysundregistrene Roller',
      },
    ],
    financials: {
      year: '2025',
      currency: 'NOK',
      operatingRevenue: 850_000_000_000,
      operatingRevenueFormatted: 'NOK 850.0B',
      isConsolidated: true,
      sourceUrl: 'https://data.brreg.no/regnskapsregisteret/regnskap/923609016',
      sourceTitle: 'Regnskapsregisteret',
      retrievedAt: new Date().toISOString(),
      evidence: 'Audited accounts',
      verified: true,
    },
    executiveSummary: 'Equinor ASA is Norway’s largest petroleum and broad energy company.',
    businessDescription: 'Exploration and production of energy.',
    facts: [],
    sources: [],
    historicalNames: [],
    lastResearchedAt: new Date().toISOString(),
    isDemoMode: false,
  };

  const facts: Fact[] = [
    {
      field: 'legal_name',
      label: 'Legal Name',
      value: 'EQUINOR ASA',
      category: 'overview',
      source_url: 'https://data.brreg.no/enhetsregisteret/api/enheter/923609016',
      source_title: 'Enhetsregisteret',
      retrieved_at: new Date().toISOString(),
      evidence: 'Enhetsregisteret legal identity',
      confidence: 100,
      verified: true,
    },
    {
      field: 'org_number',
      label: 'Organization Number',
      value: '923609016',
      category: 'overview',
      source_url: 'https://data.brreg.no/enhetsregisteret/api/enheter/923609016',
      source_title: 'Enhetsregisteret',
      retrieved_at: new Date().toISOString(),
      evidence: 'Enhetsregisteret org identifier',
      confidence: 100,
      verified: true,
    },
    {
      field: 'revenue',
      label: 'Operating Revenue',
      value: 'NOK 850.0B',
      category: 'financial',
      source_url: 'https://data.brreg.no/regnskapsregisteret/regnskap/923609016',
      source_title: 'Regnskapsregisteret',
      retrieved_at: new Date().toISOString(),
      evidence: 'Filing journal 2025 accepted',
      confidence: 100,
      verified: true,
    },
  ];

  const sources: SourceRecord[] = [
    {
      id: 's1',
      url: 'https://data.brreg.no/enhetsregisteret/api/enheter/923609016',
      title: 'Enhetsregisteret',
      domain: 'data.brreg.no',
      sourceType: 'official_registry',
      retrievedDate: new Date().toISOString(),
      factsExtractedCount: 2,
      verificationStatus: 'verified',
      matchScore: 100,
    },
    {
      id: 's2',
      url: 'https://data.brreg.no/regnskapsregisteret/regnskap/923609016',
      title: 'Regnskapsregisteret',
      domain: 'data.brreg.no',
      sourceType: 'financial_register',
      retrievedDate: new Date().toISOString(),
      factsExtractedCount: 1,
      verificationStatus: 'verified',
      matchScore: 100,
    },
  ];

  it('correctly scores fully verified profile and passes qualification threshold', () => {
    const evalResult = evaluateCompanyProfile(verifiedCompany, facts, sources, 150);

    // Rubric points check
    expect(evalResult.scores.coverage).toBeGreaterThanOrEqual(21); // Min 21/35 required
    expect(evalResult.scores.accuracyAndEvidence).toBeGreaterThanOrEqual(24); // High accuracy
    expect(evalResult.scores.freshness).toBeGreaterThanOrEqual(15);
    expect(evalResult.scores.explanation).toBeGreaterThanOrEqual(7);
    expect(evalResult.scores.usability).toBe(5);

    // Overall qualification check (Min 65/100 required)
    expect(evalResult.scores.total).toBeGreaterThanOrEqual(65);
    expect(evalResult.qualified).toBe(true);
    expect(evalResult.hasWrongCompanyError).toBe(false);
    expect(evalResult.hasFabricatedFinancials).toBe(false);
  });

  it('fails qualification if company lacks core coverage fields', () => {
    const sparseCompany: CompanyProfile = {
      ...verifiedCompany,
      name: '',
      legalForm: '',
      registrationDate: null,
      businessAddress: { street: null, postalCode: null, city: null, country: 'Norway' },
      industry: { code: '', description: '' },
      employees: { count: null, hasRegisteredEmployees: false },
      keyPeople: [],
      financials: null,
    };

    const sparseEval = evaluateCompanyProfile(sparseCompany, [], [], 150);
    expect(sparseEval.scores.coverage).toBeLessThan(21); // Under 21/35 requirement
    expect(sparseEval.qualified).toBe(false);
  });
});
