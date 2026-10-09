import {
  CompanyProfile,
  Fact,
  SourceRecord,
  ResearchDiagnostics,
  HistoryChange,
  ResearchHistoryRecord,
} from '../types';
import { calculateFreshnessStatus } from './freshness';

export interface FinalApiResponse {
  company: {
    organization_number: string;
    legal_name: string;
    status: string;
    address: string;
    website: string | null;
    industry: string;
    nace_code: string;
    // Compatibility fields
    organizationNumber?: string;
    name?: string;
    legalForm?: string;
    legalFormCode?: string;
    registrationDate?: string | null;
    foundingDate?: string | null;
    businessAddress?: any;
    postalAddress?: any;
    employees?: any;
    businessDescription?: string | null;
    executiveSummary?: string | null;
    keyPeople?: any[];
    financials?: any;
    facts?: any[];
    sources?: any[];
    historicalNames?: any[];
    lastResearchedAt?: string;
    isDemoMode?: boolean;
  };
  management: Array<{
    name: string;
    role: string;
    appointed_date?: string | null;
    source: string;
    source_url: string;
  }>;
  financials: Array<{
    financial_year: string;
    currency: string;
    operating_revenue?: number | null;
    operating_revenue_formatted?: string | null;
    operating_profit?: number | null;
    operating_profit_formatted?: string | null;
    net_profit?: number | null;
    net_profit_formatted?: string | null;
    total_assets?: number | null;
    total_assets_formatted?: string | null;
    total_equity?: number | null;
    total_equity_formatted?: string | null;
    source: string;
    source_url: string;
    retrieved_at: string;
    evidence: string;
    verified: boolean;
  }>;
  facts: Array<{
    fact: string;
    value: string;
    source: string;
    source_url: string;
    retrieved_at: string;
    published_at?: string | null;
    confidence: 'high' | 'medium' | 'low';
    confidence_score: number;
    verification_status: 'verified' | 'partially_verified' | 'unverified';
    freshness_status: 'CURRENT' | 'RECENT' | 'STALE' | 'UNKNOWN';
    field?: string;
    label?: string;
    category?: string;
    evidence?: string;
  }>;
  recent_changes: HistoryChange[];
  sources: Array<{
    source_name: string;
    source_url: string;
    source_type: string;
    domain: string;
    retrieved_at: string;
    published_at?: string | null;
    match_score: number;
    verification_status: string;
    rejection_reason?: string | null;
  }>;
  research: {
    researched_at: string;
    sources_checked: number;
    facts_found: number;
    facts_verified: number;
    confidence: 'high' | 'medium' | 'low';
  };
  warnings: string[];
  // Frontend backward-compatibility metadata
  researchMetadata?: ResearchDiagnostics;
  history?: ResearchHistoryRecord[];
}

export function buildFinalApiResponse(
  profile: CompanyProfile,
  facts: Fact[],
  sources: SourceRecord[],
  recentChanges: HistoryChange[] = [],
  diagnostics?: Partial<ResearchDiagnostics>,
  history: ResearchHistoryRecord[] = [],
  warnings: string[] = []
): FinalApiResponse {
  const verifiedFacts = facts.filter((f) => f.verified !== false && f.confidence >= 60);

  // Format management array
  const management = (profile.keyPeople || []).map((p) => ({
    name: p.name,
    role: p.role,
    appointed_date: p.appointedDate || null,
    source: p.sourceTitle,
    source_url: p.sourceUrl,
  }));

  // Format financials array (strictly non-fabricated)
  const financialsList: FinalApiResponse['financials'] = [];
  if (profile.financials && profile.financials.verified) {
    financialsList.push({
      financial_year: profile.financials.year,
      currency: profile.financials.currency || 'NOK',
      operating_revenue: profile.financials.operatingRevenue ?? null,
      operating_revenue_formatted: profile.financials.operatingRevenueFormatted ?? null,
      operating_profit: profile.financials.operatingProfit ?? null,
      operating_profit_formatted: profile.financials.operatingProfitFormatted ?? null,
      net_profit: profile.financials.netProfit ?? null,
      net_profit_formatted: profile.financials.netProfitFormatted ?? null,
      total_assets: profile.financials.totalAssets ?? null,
      total_assets_formatted: profile.financials.totalAssetsFormatted ?? null,
      total_equity: profile.financials.totalEquity ?? null,
      total_equity_formatted: profile.financials.totalEquityFormatted ?? null,
      source: profile.financials.sourceTitle,
      source_url: profile.financials.sourceUrl,
      retrieved_at: profile.financials.retrievedAt,
      evidence: profile.financials.evidence,
      verified: true,
    });
  }

  // Format standardized facts
  const formattedFacts = verifiedFacts.map((f) => {
    let confTier: 'high' | 'medium' | 'low' = 'low';
    if (f.confidence >= 80) confTier = 'high';
    else if (f.confidence >= 60) confTier = 'medium';

    const freshnessStatus = calculateFreshnessStatus(f.last_verified || f.retrieved_at, f.category);

    return {
      fact: f.label || f.field,
      value: f.value,
      source: f.source_title,
      source_url: f.source_url,
      retrieved_at: f.retrieved_at,
      published_at: f.source_date || null,
      confidence: confTier,
      confidence_score: f.confidence,
      verification_status: (f.confidence >= 80 ? 'verified' : 'partially_verified') as 'verified' | 'partially_verified',
      freshness_status: freshnessStatus,
      // Pass-through for UI components
      field: f.field,
      label: f.label,
      category: f.category,
      evidence: f.evidence,
    };
  });

  // Format sources
  const formattedSources = sources.map((s) => ({
    source_name: s.title,
    source_url: s.url,
    source_type: s.sourceType,
    domain: s.domain,
    retrieved_at: s.retrievedDate,
    published_at: s.publishedDate || null,
    match_score: s.matchScore,
    verification_status: s.verificationStatus,
    rejection_reason: s.rejectionReason || null,
  }));

  // Address string
  const fullAddress = [
    profile.businessAddress?.street,
    `${profile.businessAddress?.postalCode || ''} ${profile.businessAddress?.city || ''}`.trim(),
    profile.businessAddress?.country || 'Norway',
  ]
    .filter(Boolean)
    .join(', ');

  const avgConfidence =
    verifiedFacts.length > 0
      ? verifiedFacts.reduce((acc, f) => acc + f.confidence, 0) / verifiedFacts.length
      : 0;

  const researchMeta: ResearchDiagnostics = {
    requests: diagnostics?.requests || 0,
    llmCalls: diagnostics?.llmCalls || 0,
    llmTokens: diagnostics?.llmTokens || 0,
    estimatedCostUsd: diagnostics?.estimatedCostUsd || 0,
    elapsedSeconds: diagnostics?.elapsedSeconds || 0.1,
    cachedHits: diagnostics?.cachedHits || 1,
    modelUsed: diagnostics?.modelUsed || 'Comy Norway Intelligence Agent v1',
    timestamp: profile.lastResearchedAt || new Date().toISOString(),
    isDemoMode: profile.isDemoMode || false,
  };

  return {
    company: {
      ...profile,
      organization_number: profile.organizationNumber,
      legal_name: profile.name,
      status: profile.status,
      address: fullAddress,
      website: profile.website || null,
      industry: profile.industry?.description || 'Commercial Enterprise',
      nace_code: profile.industry?.code || '',
    },
    management,
    financials: financialsList,
    facts: formattedFacts,
    recent_changes: recentChanges,
    sources: formattedSources,
    research: {
      researched_at: profile.lastResearchedAt,
      sources_checked: sources.length,
      facts_found: facts.length,
      facts_verified: verifiedFacts.length,
      confidence: avgConfidence >= 80 ? 'high' : avgConfidence >= 60 ? 'medium' : 'low',
    },
    warnings,
    researchMetadata: researchMeta,
    history,
  };
}
