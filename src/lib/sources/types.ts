import { Fact, MatchBreakdown, SourceRecord } from '../types';

export interface SourceIdentitySignals {
  organizationNumber?: string | null;
  companyName?: string | null;
  domain?: string | null;
  address?: string | null;
  rawText?: string | null;
}

export interface SourceFetchResult {
  sourceRecord: SourceRecord;
  identitySignals: SourceIdentitySignals;
  extractedFacts: Fact[];
  rawContent?: string;
  success: boolean;
  error?: string;
}

export interface SourceProvider {
  id: string;
  name: string;
  sourceType: SourceRecord['sourceType'];
  isPermittedPublicSource: boolean;

  /**
   * Fetches data for an organization number and returns extracted facts and identity signals
   */
  fetchSource(orgNumber: string, context?: any): Promise<SourceFetchResult>;

  /**
   * Extracts identity signals from source content
   */
  extractCompanyIdentity(content: any): SourceIdentitySignals;

  /**
   * Extracts structured facts with evidence quotes
   */
  extractFacts(content: any, orgNumber: string, sourceRecord: SourceRecord): Fact[];
}
