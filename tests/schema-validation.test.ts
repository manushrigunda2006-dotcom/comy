import { describe, it, expect } from 'vitest';
import { FactSchema, CompanyProfileSchema, MatchBreakdownSchema } from '../src/lib/types';

describe('Schema Validation and Data Contracts', () => {
  it('should validate a complete evidence-backed fact', () => {
    const validFact = {
      id: '923609016-employees',
      field: 'employees_count',
      label: 'Employees',
      value: '21272',
      category: 'business' as const,
      source_url: 'https://data.brreg.no/enhetsregisteret/api/enheter/923609016',
      source_title: 'Enhetsregisteret (NAV Aa-registeret)',
      source_date: '2026-09-14',
      retrieved_at: '2026-10-03T12:00:00Z',
      evidence: 'Official employee count from NAV Aa-registeret.',
      confidence: 98,
      verified: true,
      rejected: false,
    };

    const parsed = FactSchema.safeParse(validFact);
    expect(parsed.success).toBe(true);
  });

  it('MISSING SOURCE -> REJECT when required fields are missing in fact', () => {
    const invalidFact = {
      field: 'employees_count',
      label: 'Employees',
      value: '21272',
      // Missing source_url, source_title, evidence
      confidence: 98,
    };

    const parsed = FactSchema.safeParse(invalidFact);
    expect(parsed.success).toBe(false);
  });

  it('should reject confidence values outside 0 - 100 range', () => {
    const factOver100 = {
      field: 'test',
      label: 'Test',
      value: 'Value',
      source_url: 'https://example.com',
      source_title: 'Test Source',
      retrieved_at: new Date().toISOString(),
      evidence: 'Some evidence',
      confidence: 150, // Invalid!
    };

    const parsed = FactSchema.safeParse(factOver100);
    expect(parsed.success).toBe(false);
  });

  it('should validate complete company profile schema', () => {
    const profile = {
      organizationNumber: '923609016',
      name: 'EQUINOR ASA',
      status: 'Active' as const,
      legalForm: 'Allmennaksjeselskap',
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
      employees: {
        count: 21272,
        hasRegisteredEmployees: true,
      },
      lastResearchedAt: new Date().toISOString(),
      isDemoMode: false,
      facts: [],
      sources: [],
      keyPeople: [],
      historicalNames: [],
    };

    const parsed = CompanyProfileSchema.safeParse(profile);
    expect(parsed.success).toBe(true);
  });
});
