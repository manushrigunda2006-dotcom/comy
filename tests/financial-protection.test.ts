import { describe, it, expect } from 'vitest';
import { validateFinancialFact, calculateFactConfidence } from '../src/lib/confidence';
import { FinancialStatement } from '../src/lib/types';

describe('Financial Fact Protection & Anti-Fabrication Safeguards', () => {
  it('UNSUPPORTED FINANCIAL VALUE -> REJECT when data is null or empty', () => {
    const res = validateFinancialFact(null);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('Not found in verified public sources.');

    const resEmpty = validateFinancialFact({
      year: '2025',
      sourceUrl: 'https://example.com',
      verified: true,
    });
    expect(resEmpty.valid).toBe(false);
    expect(resEmpty.reason).toBe('Not found in verified public sources.');
  });

  it('MISSING SOURCE -> REJECT when financial statement has no source URL', () => {
    const statementWithoutSource: Partial<FinancialStatement> = {
      year: '2025',
      operatingRevenue: 100_000_000,
      operatingRevenueFormatted: 'NOK 100.0M',
      sourceUrl: '', // Missing source
      verified: true,
    };

    const res = validateFinancialFact(statementWithoutSource);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Missing required accounting year or source URL');
  });

  it('REJECT financial data if source identity is not verified', () => {
    const unverifiedStatement: Partial<FinancialStatement> = {
      year: '2025',
      operatingRevenue: 50_000_000,
      sourceUrl: 'https://unverified-blog.com/revenue',
      verified: false,
    };

    const res = validateFinancialFact(unverifiedStatement);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('identity not verified');
  });

  it('heavily penalizes financial claims from unverified or blog sources', () => {
    const confidence = calculateFactConfidence({
      sourceType: 'other',
      sourceMatchScore: 50,
      hasDirectEvidenceQuote: false,
      isOfficialRegistry: false,
      isFinancialData: true,
    });

    // Forced below rejection threshold (60)
    expect(confidence).toBeLessThan(60);
  });

  it('VALID VERIFIED FACT -> ACCEPT for authentic audited financial filing', () => {
    const auditedStatement: FinancialStatement = {
      year: '2025',
      currency: 'NOK',
      operatingRevenue: 12_400_000,
      operatingRevenueFormatted: 'NOK 12.4M',
      operatingProfit: 1_800_000,
      operatingProfitFormatted: 'NOK 1.8M',
      netProfit: 1_200_000,
      netProfitFormatted: 'NOK 1.2M',
      totalAssets: 25_000_000,
      totalAssetsFormatted: 'NOK 25.0M',
      totalEquity: 10_000_000,
      totalEquityFormatted: 'NOK 10.0M',
      isConsolidated: false,
      sourceUrl: 'https://data.brreg.no/regnskapsregisteret/regnskap/923609016',
      sourceTitle: 'Regnskapsregisteret Annual Accounts 2025',
      sourceDate: '2025-12-31',
      retrievedAt: new Date().toISOString(),
      evidence: 'Official filing journal #20251122 accepted by Brønnøysundregistrene.',
      verified: true,
    };

    const res = validateFinancialFact(auditedStatement);
    expect(res.valid).toBe(true);

    const confidence = calculateFactConfidence({
      sourceType: 'financial_register',
      sourceMatchScore: 100,
      hasDirectEvidenceQuote: true,
      isOfficialRegistry: true,
      isFinancialData: true,
    });
    expect(confidence).toBeGreaterThanOrEqual(95);
  });
});
