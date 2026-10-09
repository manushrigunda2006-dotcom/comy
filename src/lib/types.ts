import { z } from 'zod';

// Norwegian Organization Number: 9 digits, Mod11 checksum
export const OrgNumberSchema = z.string().regex(/^\d{9}$/, 'Organization number must be exactly 9 digits');

// Verification & Confidence Tiers
export type ConfidenceTier = 'verified' | 'high' | 'needs_verification' | 'rejected';

export function getConfidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 95) return 'verified';
  if (confidence >= 80) return 'high';
  if (confidence >= 60) return 'needs_verification';
  return 'rejected';
}

// Single Evidence-Backed Fact Schema
export const FactSchema = z.object({
  id: z.string().optional(),
  field: z.string(),
  label: z.string(),
  value: z.string(),
  category: z.enum(['overview', 'business', 'financial', 'people', 'governance', 'other']).default('overview'),
  source_url: z.string().url().or(z.string()),
  source_title: z.string(),
  source_date: z.string().nullable().optional(), // Date source was published/updated
  retrieved_at: z.string(), // When Cherry retrieved it
  evidence: z.string(), // Quote/snippet/explanation
  confidence: z.number().min(0).max(100),
  first_seen: z.string().optional(),
  last_verified: z.string().optional(),
  verified: z.boolean().optional().default(true),
  rejected: z.boolean().optional().default(false),
  rejection_reason: z.string().nullable().optional(),
});

export interface Fact {
  id?: string;
  field: string;
  label: string;
  value: string;
  category: 'overview' | 'business' | 'financial' | 'people' | 'governance' | 'other';
  source_url: string;
  source_title: string;
  source_date?: string | null;
  retrieved_at: string;
  evidence: string;
  confidence: number;
  first_seen?: string;
  last_verified?: string;
  verified?: boolean;
  rejected?: boolean;
  rejection_reason?: string | null;
}

// Source Match Breakdown
export const MatchBreakdownSchema = z.object({
  orgNumberMatch: z.number().min(0).max(50),
  nameMatch: z.number().min(0).max(25),
  domainMatch: z.number().min(0).max(15),
  addressMatch: z.number().min(0).max(10),
  identifierMatch: z.number().min(0).max(10).optional().default(0),
  totalScore: z.number().min(0).max(100),
  verified: z.boolean(),
  rejectionReason: z.string().nullable().optional(),
});

export type MatchBreakdown = z.infer<typeof MatchBreakdownSchema>;

// Source Record Schema
export const SourceRecordSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  domain: z.string(),
  sourceType: z.enum([
    'official_registry',
    'financial_register',
    'roles_register',
    'company_website',
    'annual_report',
    'public_business_register',
    'other'
  ]),
  publishedDate: z.string().nullable().optional(),
  retrievedDate: z.string(),
  factsExtractedCount: z.number().default(0),
  verificationStatus: z.enum(['verified', 'needs_verification', 'rejected']),
  rejectionReason: z.string().nullable().optional(),
  matchScore: z.number().min(0).max(100),
  matchBreakdown: MatchBreakdownSchema.optional(),
});

export type SourceRecord = z.infer<typeof SourceRecordSchema>;

// Financial Statement Data (strictly verified)
export const FinancialStatementSchema = z.object({
  year: z.string(),
  currency: z.string().default('NOK'),
  operatingRevenue: z.number().nullable().optional(),
  operatingRevenueFormatted: z.string().nullable().optional(),
  operatingProfit: z.number().nullable().optional(), // EBIT
  operatingProfitFormatted: z.string().nullable().optional(),
  netProfit: z.number().nullable().optional(),
  netProfitFormatted: z.string().nullable().optional(),
  totalAssets: z.number().nullable().optional(),
  totalAssetsFormatted: z.string().nullable().optional(),
  totalEquity: z.number().nullable().optional(),
  totalEquityFormatted: z.string().nullable().optional(),
  shareCapital: z.number().nullable().optional(),
  shareCapitalFormatted: z.string().nullable().optional(),
  isConsolidated: z.boolean().default(false),
  sourceUrl: z.string(),
  sourceTitle: z.string(),
  sourceDate: z.string().nullable().optional(),
  retrievedAt: z.string(),
  evidence: z.string(),
  verified: z.boolean(),
});

export type FinancialStatement = z.infer<typeof FinancialStatementSchema>;

// Key Person Schema
export const KeyPersonSchema = z.object({
  name: z.string(),
  role: z.string(),
  roleCode: z.string().optional(),
  roleGroup: z.string(), // e.g., 'Daglig leder', 'Styre', 'Revisor'
  appointedDate: z.string().nullable().optional(),
  resigned: z.boolean().default(false),
  sourceUrl: z.string(),
  sourceTitle: z.string(),
});

export type KeyPerson = z.infer<typeof KeyPersonSchema>;

// Core Company Profile
export const CompanyProfileSchema = z.object({
  organizationNumber: OrgNumberSchema,
  name: z.string(),
  status: z.enum(['Active', 'Liquidation', 'Bankruptcy', 'Dissolved', 'Unknown']).default('Active'),
  legalForm: z.string(), // AS, ASA, ENK, etc.
  legalFormCode: z.string().optional(),
  registrationDate: z.string().nullable().optional(),
  foundingDate: z.string().nullable().optional(),
  businessAddress: z.object({
    street: z.string().nullable().optional(),
    postalCode: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    municipality: z.string().nullable().optional(),
    country: z.string().default('Norway'),
  }),
  postalAddress: z.object({
    street: z.string().nullable().optional(),
    postalCode: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    country: z.string().default('Norway'),
  }).optional(),
  industry: z.object({
    code: z.string(),
    description: z.string(),
  }),
  website: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  employees: z.object({
    count: z.number().nullable().optional(),
    registrationDate: z.string().nullable().optional(),
    hasRegisteredEmployees: z.boolean().default(false),
  }),
  businessDescription: z.string().nullable().optional(),
  executiveSummary: z.string().nullable().optional(),
  financials: FinancialStatementSchema.nullable().optional(),
  keyPeople: z.array(KeyPersonSchema).default([]),
  facts: z.array(FactSchema).default([]),
  sources: z.array(SourceRecordSchema).default([]),
  historicalNames: z.array(z.object({
    name: z.string(),
    fromDate: z.string(),
    toDate: z.string().nullable().optional(),
  })).default([]),
  lastResearchedAt: z.string(),
  isDemoMode: z.boolean().default(false),
});

export interface CompanyProfile {
  organizationNumber: string;
  name: string;
  status: 'Active' | 'Liquidation' | 'Bankruptcy' | 'Dissolved' | 'Unknown';
  legalForm: string;
  legalFormCode?: string;
  registrationDate?: string | null;
  foundingDate?: string | null;
  businessAddress: {
    street?: string | null;
    postalCode?: string | null;
    city?: string | null;
    municipality?: string | null;
    country: string;
  };
  postalAddress?: {
    street?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country: string;
  };
  industry: {
    code: string;
    description: string;
  };
  website?: string | null;
  phone?: string | null;
  employees: {
    count?: number | null;
    registrationDate?: string | null;
    hasRegisteredEmployees: boolean;
  };
  businessDescription?: string | null;
  executiveSummary?: string | null;
  financials?: FinancialStatement | null;
  keyPeople: KeyPerson[];
  facts: Fact[];
  sources: SourceRecord[];
  historicalNames: {
    name: string;
    fromDate: string;
    toDate?: string | null;
  }[];
  lastResearchedAt: string;
  isDemoMode: boolean;
}

// Research Diagnostics
export const ResearchDiagnosticsSchema = z.object({
  requests: z.number().default(0),
  llmCalls: z.number().default(0),
  llmTokens: z.number().default(0),
  estimatedCostUsd: z.number().default(0),
  elapsedSeconds: z.number().default(0),
  cachedHits: z.number().default(0),
  modelUsed: z.string().default('Cherry Research Agent v1'),
  timestamp: z.string(),
  isDemoMode: z.boolean().default(false),
});

export type ResearchDiagnostics = z.infer<typeof ResearchDiagnosticsSchema>;

// History Snapshot & Changes
export interface HistoryChange {
  field: string;
  label: string;
  oldValue: string | null;
  newValue: string;
  detectedAt: string;
  sourceUrl: string;
}

export interface ResearchHistoryRecord {
  id: string;
  organizationNumber: string;
  researchedAt: string;
  factsCount: number;
  sourcesCount: number;
  averageConfidence: number;
  changes: HistoryChange[];
  snapshot: Partial<CompanyProfile>;
}

// Research Response API
export interface ResearchResponse {
  company: CompanyProfile;
  facts: Fact[];
  sources: SourceRecord[];
  researchMetadata: ResearchDiagnostics;
  history: ResearchHistoryRecord[];
}
