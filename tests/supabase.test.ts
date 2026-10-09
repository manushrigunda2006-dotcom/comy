import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateNorwegianOrgNumber } from '../src/lib/validation';
import {
  saveCompanyProfile,
  getCompanyByOrgNumber,
  getCompanyFacts,
  getCompanySources,
  getCompanyHistory,
  getDatabase,
} from '../src/lib/db';
import { CompanyProfile, Fact, SourceRecord, HistoryChange } from '../src/lib/types';
import { mapSupabaseToProfile } from '../src/lib/supabase/db';

describe('Supabase Database & Norwegian Company Operations', () => {
  const TEST_ORG = '923609016'; // Equinor ASA (Valid Mod11)
  const SECOND_TEST_ORG = '984851006'; // DNB Bank ASA (Valid Mod11)

  const sampleProfile: CompanyProfile = {
    organizationNumber: TEST_ORG,
    name: 'EQUINOR ASA',
    status: 'Active',
    legalForm: 'Allmennaksjeselskap',
    registrationDate: '1995-03-12',
    businessAddress: {
      street: 'Forusbeen 50',
      postalCode: '4035',
      city: 'STAVANGER',
      country: 'Norway',
    },
    industry: {
      code: '06.100',
      description: 'Extraction of crude petroleum',
    },
    website: 'https://www.equinor.com',
    employees: {
      count: 21272,
      hasRegisteredEmployees: true,
    },
    businessDescription: 'Energy and petroleum company headquartered in Stavanger, Norway.',
    executiveSummary: 'EQUINOR ASA is a publicly traded Norwegian energy enterprise.',
    financials: {
      year: '2023',
      currency: 'NOK',
      operatingRevenue: 1100000000000,
      operatingRevenueFormatted: '1 100 000 000 000 NOK',
      operatingProfit: 350000000000,
      operatingProfitFormatted: '350 000 000 000 NOK',
      netProfit: 120000000000,
      netProfitFormatted: '120 000 000 000 NOK',
      totalAssets: null,
      totalAssetsFormatted: null,
      totalEquity: null,
      totalEquityFormatted: null,
      shareCapital: null,
      shareCapitalFormatted: null,
      isConsolidated: true,
      sourceUrl: 'https://regnskap.brreg.no/923609016',
      sourceTitle: 'Regnskapsregisteret',
      retrievedAt: new Date().toISOString(),
      evidence: 'Audited annual statement filed with Brønnøysundregistrene',
      verified: true,
    },
    keyPeople: [],
    facts: [],
    sources: [],
    historicalNames: [],
    lastResearchedAt: new Date().toISOString(),
    isDemoMode: false,
  };

  const sampleSource: SourceRecord = {
    id: `src-${TEST_ORG}-1`,
    url: 'https://data.brreg.no/enhetsregisteret/api/enheter/923609016',
    title: 'Brønnøysundregistrene - Enhetsregisteret (Official Central Register)',
    domain: 'data.brreg.no',
    sourceType: 'official_registry',
    publishedDate: '1995-03-12',
    retrievedDate: new Date().toISOString(),
    factsExtractedCount: 1,
    verificationStatus: 'verified',
    matchScore: 100,
  };

  const sampleVerifiedFact: Fact = {
    id: `fact-${TEST_ORG}-name`,
    field: 'company_name',
    label: 'Company Name',
    value: 'EQUINOR ASA',
    category: 'overview',
    source_url: sampleSource.url,
    source_title: sampleSource.title,
    source_date: '1995-03-12',
    retrieved_at: new Date().toISOString(),
    evidence: 'Official Brønnøysund registry filing confirms registered company name.',
    confidence: 100,
    verified: true,
    rejected: false,
  };

  const sampleUnverifiedFact: Fact = {
    id: `fact-${TEST_ORG}-rumor`,
    field: 'unverified_rumor',
    label: 'Market Rumor',
    value: 'Potential unconfirmed merger',
    category: 'other',
    source_url: 'https://unverified-blog.example.com',
    source_title: 'Unverified Rumor Blog',
    retrieved_at: new Date().toISOString(),
    evidence: 'Blog post with no statutory citation or corroboration.',
    confidence: 30, // Low confidence
    verified: false,
    rejected: true,
    rejection_reason: 'Unverified source with match score below threshold',
  };

  it('1. validates organization number Modulus 11 algorithm', () => {
    const valid = validateNorwegianOrgNumber(TEST_ORG);
    expect(valid.valid).toBe(true);
    expect(valid.cleanNumber).toBe(TEST_ORG);

    const invalid = validateNorwegianOrgNumber('123456789'); // Invalid Mod11 checksum
    expect(invalid.valid).toBe(false);
  });

  it('2. inserts company into persistent database', async () => {
    await saveCompanyProfile(sampleProfile, [sampleVerifiedFact], [sampleSource], []);
    const loaded = await getCompanyByOrgNumber(TEST_ORG);

    expect(loaded).toBeDefined();
    expect(loaded?.organizationNumber).toBe(TEST_ORG);
    expect(loaded?.name).toBe('EQUINOR ASA');
    expect(loaded?.businessAddress.country).toBe('Norway');
  });

  it('3. finds company by organization number identity', async () => {
    const company = await getCompanyByOrgNumber(TEST_ORG);
    expect(company).not.toBeNull();
    expect(company?.organizationNumber).toBe(TEST_ORG);
    expect(company?.businessAddress.city).toBe('STAVANGER');
  });

  it('4. prevents duplicate company rows for the same organization number', async () => {
    const db = getDatabase();
    const countBefore = (db.prepare('SELECT count(*) as count FROM companies WHERE organization_number = ?').get(TEST_ORG) as any).count;

    // Save again with same organization number
    await saveCompanyProfile(sampleProfile, [sampleVerifiedFact], [sampleSource], []);

    const countAfter = (db.prepare('SELECT count(*) as count FROM companies WHERE organization_number = ?').get(TEST_ORG) as any).count;
    expect(countAfter).toBe(countBefore);
  });

  it('5. updates company without creating new entities', async () => {
    const updatedProfile: CompanyProfile = {
      ...sampleProfile,
      employees: { count: 21500, hasRegisteredEmployees: true },
    };

    await saveCompanyProfile(updatedProfile, [sampleVerifiedFact], [sampleSource], []);
    const reloaded = await getCompanyByOrgNumber(TEST_ORG);

    expect(reloaded?.employees.count).toBe(21500);
    expect(reloaded?.organizationNumber).toBe(TEST_ORG);
  });

  it('6. inserts and persists verified facts with evidence citation', async () => {
    const facts = await getCompanyFacts(TEST_ORG);
    const nameFact = facts.find(f => f.field === 'company_name' || f.label === 'Company Name');

    expect(nameFact).toBeDefined();
    expect(nameFact?.confidence).toBeGreaterThanOrEqual(80);
    expect(nameFact?.verified).toBe(true);
    expect(nameFact?.evidence).toContain('Brønnøysund');
  });

  it('7. rejects unverified or unsupported facts from the verified fact profile', async () => {
    // Save with both verified and unverified fact
    await saveCompanyProfile(
      sampleProfile,
      [sampleVerifiedFact, sampleUnverifiedFact],
      [sampleSource],
      []
    );

    const facts = await getCompanyFacts(TEST_ORG);
    const rumorFact = facts.find(f => f.field === 'unverified_rumor');

    // If stored, it must explicitly have rejected = true and verified = false
    if (rumorFact) {
      expect(rumorFact.rejected).toBe(true);
      expect(rumorFact.verified).toBe(false);
    }
  });

  it('8. stores audited sources with company match scores', async () => {
    const sources = await getCompanySources(TEST_ORG);
    expect(sources.length).toBeGreaterThan(0);
    const primary = sources.find(s => s.domain === 'data.brreg.no');

    expect(primary).toBeDefined();
    expect(primary?.matchScore).toBe(100);
    expect(primary?.verificationStatus).toBe('verified');
  });

  it('9. inserts financial statements without fabricating missing values (stores NULL)', async () => {
    const company = await getCompanyByOrgNumber(TEST_ORG);
    expect(company?.financials).toBeDefined();
    expect(company?.financials?.currency).toBe('NOK');
    expect(company?.financials?.operatingRevenue).toBe(1100000000000);

    // Missing totalAssets must be null, not fabricated
    expect(company?.financials?.totalAssets).toBeNull();
    expect(company?.financials?.totalEquity).toBeNull();
  });

  it('10. records research history and detects changes without deleting previous data', async () => {
    const changeRecord: HistoryChange = {
      field: 'employees',
      label: 'Registered Employees',
      oldValue: '21272',
      newValue: '21500',
      detectedAt: new Date().toISOString(),
      sourceUrl: sampleSource.url,
    };

    await saveCompanyProfile(sampleProfile, [sampleVerifiedFact], [sampleSource], [changeRecord]);
    const history = await getCompanyHistory(TEST_ORG);

    expect(history.length).toBeGreaterThan(0);
    const latest = history[0];
    expect(latest.changes).toBeDefined();
    expect(latest.changes.length).toBeGreaterThanOrEqual(1);
    expect(latest.changes[0].field).toBe('employees');
    expect(latest.changes[0].newValue).toBe('21500');
  });

  it('11. prevents wrong company information from overwriting the correct company', async () => {
    // Attempting to overwrite TEST_ORG using a different entity's data
    const wrongProfile: CompanyProfile = {
      ...sampleProfile,
      name: 'DNB BANK ASA', // Mismatched name for Equinor
      organizationNumber: SECOND_TEST_ORG, // Distinct valid org number
    };

    await saveCompanyProfile(wrongProfile, [], [], []);

    // Verify Equinor was NOT overwritten
    const equinor = await getCompanyByOrgNumber(TEST_ORG);
    expect(equinor?.name).toBe('EQUINOR ASA');
    expect(equinor?.organizationNumber).toBe(TEST_ORG);

    // Verify DNB exists under its own org number
    const dnb = await getCompanyByOrgNumber(SECOND_TEST_ORG);
    expect(dnb?.organizationNumber).toBe(SECOND_TEST_ORG);
    expect(dnb?.name).toBe('DNB BANK ASA');
  });

  it('12. correctly maps Supabase table records to CompanyProfile structure', () => {
    const mockSupabaseCompany = {
      id: 'mock-uuid-1',
      organization_number: '923609016',
      company_name: 'EQUINOR ASA',
      legal_form: 'ASA',
      status: 'Active',
      registration_date: '1995-03-12',
      address: 'Forusbeen 50',
      postal_code: '4035',
      city: 'STAVANGER',
      country: 'Norway',
      website: 'https://www.equinor.com',
      industry: 'Extraction of crude petroleum',
      business_description: 'Energy company',
      employee_count: 21272,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      last_verified_at: '2026-01-01T00:00:00Z',
    };

    const mockFacts = [
      {
        id: 'f-1',
        company_id: 'mock-uuid-1',
        fact_type: 'overview',
        fact_name: 'Company Name',
        fact_value: 'EQUINOR ASA',
        confidence: 100,
        verification_status: 'verified',
        evidence: 'Official register',
        source_id: 's-1',
        source_date: '1995-03-12',
        first_seen: '2026-01-01T00:00:00Z',
        last_verified: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
      },
    ];

    const mockSources = [
      {
        id: 's-1',
        company_id: 'mock-uuid-1',
        source_url: 'https://data.brreg.no',
        source_title: 'Brønnøysundregistrene',
        source_type: 'official_registry',
        domain: 'data.brreg.no',
        publication_date: '1995-03-12',
        retrieved_at: '2026-01-01T00:00:00Z',
        verification_status: 'verified',
        company_match_score: 100,
        created_at: '2026-01-01T00:00:00Z',
      },
    ];

    const mapped = mapSupabaseToProfile(mockSupabaseCompany, mockFacts, mockSources, []);
    expect(mapped.organizationNumber).toBe('923609016');
    expect(mapped.name).toBe('EQUINOR ASA');
    expect(mapped.businessAddress.country).toBe('Norway');
    expect(mapped.facts.length).toBe(1);
    expect(mapped.sources.length).toBe(1);
    expect(mapped.facts[0].confidence).toBe(100);
  });
});
