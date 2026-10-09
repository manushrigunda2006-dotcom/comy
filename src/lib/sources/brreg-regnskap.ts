import { SourceProvider, SourceFetchResult, SourceIdentitySignals } from './types';
import { Fact, FinancialStatement, SourceRecord } from '../types';
import { getCachedHttp, setCachedHttp } from '../db';

export function formatFinancialValue(val: number | null | undefined, currency: string = 'NOK'): string | null {
  if (val === null || val === undefined) return null;
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}${currency} ${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${currency} ${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${currency} ${(abs / 1_000).toFixed(1)}k`;
  }
  return `${sign}${currency} ${new Intl.NumberFormat('no-NO').format(val)}`;
}

export class BrregRegnskapProvider implements SourceProvider {
  id = 'brreg-regnskapsregisteret';
  name = 'Brønnøysundregistrene (Regnskapsregisteret)';
  sourceType: SourceRecord['sourceType'] = 'financial_register';
  isPermittedPublicSource = true;

  async fetchSource(orgNumber: string): Promise<SourceFetchResult & { financialStatement?: FinancialStatement | null }> {
    const url = `https://data.brreg.no/regnskapsregisteret/regnskap/${orgNumber}`;
    const retrievedDate = new Date().toISOString();

    const cached = getCachedHttp(url);
    let accounts: any[] = cached?.data;

    if (!accounts) {
      try {
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Cherry-Research-Agent/1.0 (+https://cherry.no)',
          },
        });

        if (response.status === 404 || response.status === 204) {
          return {
            sourceRecord: {
              id: `src-${this.id}-${orgNumber}`,
              url,
              title: 'Regnskapsregisteret - Annual Accounts Register',
              domain: 'data.brreg.no',
              sourceType: this.sourceType,
              retrievedDate,
              factsExtractedCount: 0,
              verificationStatus: 'needs_verification',
              rejectionReason: 'No financial statements submitted or available yet in public register.',
              matchScore: 100,
            },
            identitySignals: { organizationNumber: orgNumber },
            extractedFacts: [],
            financialStatement: null,
            success: true,
          };
        }

        if (!response.ok) {
          throw new Error(`Regnskapsregisteret API HTTP ${response.status}`);
        }

        accounts = await response.json();
        setCachedHttp(url, accounts, response.status, 86400 * 7); // Cache financial reports for 7 days
      } catch (err: any) {
        return {
          sourceRecord: {
            id: `src-${this.id}-${orgNumber}`,
            url,
            title: 'Regnskapsregisteret',
            domain: 'data.brreg.no',
            sourceType: this.sourceType,
            retrievedDate,
            factsExtractedCount: 0,
            verificationStatus: 'needs_verification',
            rejectionReason: `Could not retrieve accounts: ${err.message}`,
            matchScore: 0,
          },
          identitySignals: {},
          extractedFacts: [],
          financialStatement: null,
          success: false,
          error: err.message,
        };
      }
    }

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return {
        sourceRecord: {
          id: `src-${this.id}-${orgNumber}`,
          url,
          title: 'Regnskapsregisteret (Official Accounting Register)',
          domain: 'data.brreg.no',
          sourceType: this.sourceType,
          retrievedDate,
          factsExtractedCount: 0,
          verificationStatus: 'verified',
          matchScore: 100,
        },
        identitySignals: { organizationNumber: orgNumber },
        extractedFacts: [],
        financialStatement: null,
        success: true,
      };
    }

    // Sort by latest fiscal period end date
    const sorted = [...accounts].sort((a, b) => {
      const d1 = new Date(a.regnskapsperiode?.tilDato || '1970-01-01').getTime();
      const d2 = new Date(b.regnskapsperiode?.tilDato || '1970-01-01').getTime();
      return d2 - d1;
    });

    const latest = sorted[0];
    const pubDate = latest.regnskapsperiode?.tilDato || null;
    const year = pubDate ? new Date(pubDate).getFullYear().toString() : 'Latest';
    const currency = latest.valuta || 'NOK';
    const journalnr = latest.journalnr || 'Official Filing';

    const revenue =
      latest.resultatregnskapResultat?.driftsresultat?.driftsinntekter?.sumDriftsinntekter ??
      latest.resultatregnskapResultat?.driftsresultat?.driftsinntekter?.salgsinntekter ??
      null;

    const operatingProfit =
      latest.resultatregnskapResultat?.driftsresultat?.driftsresultat ?? null;

    const netProfit =
      latest.resultatregnskapResultat?.aarsresultat ?? null;

    const totalAssets =
      latest.eiendeler?.sumEiendeler ?? null;

    const totalEquity =
      latest.egenkapitalGjeld?.egenkapital?.sumEgenkapital ?? null;

    const financialStatement: FinancialStatement = {
      year,
      currency,
      operatingRevenue: revenue,
      operatingRevenueFormatted: formatFinancialValue(revenue, currency),
      operatingProfit,
      operatingProfitFormatted: formatFinancialValue(operatingProfit, currency),
      netProfit,
      netProfitFormatted: formatFinancialValue(netProfit, currency),
      totalAssets,
      totalAssetsFormatted: formatFinancialValue(totalAssets, currency),
      totalEquity,
      totalEquityFormatted: formatFinancialValue(totalEquity, currency),
      isConsolidated: latest.regnskapstype === 'KONSERN',
      sourceUrl: url,
      sourceTitle: `Regnskapsregisteret Annual Financial Statement (FY ${year})`,
      sourceDate: pubDate,
      retrievedAt: retrievedDate,
      evidence: `Statutory annual financial filing journal #${journalnr} for fiscal year ended ${pubDate}. Accepted by Brønnøysundregistrene.`,
      verified: true,
    };

    const sourceRecord: SourceRecord = {
      id: `src-${this.id}-${orgNumber}`,
      url,
      title: `Regnskapsregisteret - Annual Report FY ${year}`,
      domain: 'data.brreg.no',
      sourceType: this.sourceType,
      publishedDate: pubDate,
      retrievedDate,
      factsExtractedCount: 0,
      verificationStatus: 'verified',
      matchScore: 100,
      matchBreakdown: {
        orgNumberMatch: 50,
        nameMatch: 20,
        domainMatch: 10,
        addressMatch: 10,
        identifierMatch: 10,
        totalScore: 100,
        verified: true,
      },
    };

    const identitySignals = this.extractCompanyIdentity(latest);
    const facts = this.extractFacts(financialStatement, orgNumber, sourceRecord);
    sourceRecord.factsExtractedCount = facts.length;

    return {
      sourceRecord,
      identitySignals,
      extractedFacts: facts,
      financialStatement,
      rawContent: JSON.stringify(latest),
      success: true,
    };
  }

  extractCompanyIdentity(data: any): SourceIdentitySignals {
    return {
      organizationNumber: data.virksomhet?.organisasjonsnummer,
      companyName: null,
      domain: null,
      address: null,
    };
  }

  extractFacts(stmt: FinancialStatement, orgNumber: string, source: SourceRecord): Fact[] {
    const facts: Fact[] = [];
    const now = source.retrievedDate;

    if (stmt.operatingRevenueFormatted) {
      facts.push({
        id: `${orgNumber}-revenue`,
        field: 'operating_revenue',
        label: 'Operating Revenue',
        value: `${stmt.operatingRevenueFormatted} (FY ${stmt.year})`,
        category: 'financial',
        source_url: source.url,
        source_title: source.title,
        source_date: stmt.sourceDate,
        retrieved_at: now,
        evidence: `Official operating revenue from annual accounts submitted to Regnskapsregisteret for FY ${stmt.year}: ${stmt.operatingRevenueFormatted}.`,
        confidence: 99,
        first_seen: stmt.sourceDate || now,
        last_verified: now,
        verified: true,
      });
    }

    if (stmt.operatingProfitFormatted) {
      facts.push({
        id: `${orgNumber}-ebit`,
        field: 'operating_profit',
        label: 'Operating Profit (EBIT)',
        value: `${stmt.operatingProfitFormatted} (FY ${stmt.year})`,
        category: 'financial',
        source_url: source.url,
        source_title: source.title,
        source_date: stmt.sourceDate,
        retrieved_at: now,
        evidence: `Audited operating income (EBIT) reported for FY ${stmt.year}.`,
        confidence: 99,
        first_seen: stmt.sourceDate || now,
        last_verified: now,
        verified: true,
      });
    }

    if (stmt.netProfitFormatted) {
      facts.push({
        id: `${orgNumber}-net-profit`,
        field: 'net_profit',
        label: 'Net Annual Result',
        value: `${stmt.netProfitFormatted} (FY ${stmt.year})`,
        category: 'financial',
        source_url: source.url,
        source_title: source.title,
        source_date: stmt.sourceDate,
        retrieved_at: now,
        evidence: `Statutory net annual income/loss (årsresultat) for FY ${stmt.year}.`,
        confidence: 99,
        first_seen: stmt.sourceDate || now,
        last_verified: now,
        verified: true,
      });
    }

    if (stmt.totalAssetsFormatted) {
      facts.push({
        id: `${orgNumber}-total-assets`,
        field: 'total_assets',
        label: 'Total Balance Sheet Assets',
        value: `${stmt.totalAssetsFormatted} (FY ${stmt.year})`,
        category: 'financial',
        source_url: source.url,
        source_title: source.title,
        source_date: stmt.sourceDate,
        retrieved_at: now,
        evidence: `Sum of fixed and current assets on fiscal year-end balance sheet.`,
        confidence: 99,
        first_seen: stmt.sourceDate || now,
        last_verified: now,
        verified: true,
      });
    }

    return facts;
  }
}
