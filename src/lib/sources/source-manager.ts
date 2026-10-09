import { BrregRegistryProvider } from './brreg-registry';
import { BrregRegnskapProvider } from './brreg-regnskap';
import { BrregRollerProvider } from './brreg-roller';
import { CompanyWebsiteProvider } from './website-provider';
import { SourceProvider, SourceFetchResult } from './types';
import { CompanyProfile, Fact, SourceRecord } from '../types';

export class SourceManager {
  private providers: SourceProvider[] = [];

  constructor() {
    this.registerProvider(new BrregRegistryProvider());
    this.registerProvider(new BrregRegnskapProvider());
    this.registerProvider(new BrregRollerProvider());
    this.registerProvider(new CompanyWebsiteProvider());
  }

  public registerProvider(provider: SourceProvider) {
    this.providers.push(provider);
  }

  public getProviders(): SourceProvider[] {
    return [...this.providers];
  }

  /**
   * Fetches all registered public sources for a given Norwegian company
   */
  public async researchCompanySources(
    orgNumber: string,
    onProgress?: (step: string, percent: number) => void
  ): Promise<{
    primaryRegistryResult: SourceFetchResult;
    allResults: SourceFetchResult[];
    sources: SourceRecord[];
    facts: Fact[];
    rejectedSources: SourceRecord[];
  }> {
    onProgress?.('Resolving company identity from Central Register', 15);

    // 1. First fetch primary registry (Brønnøysundregistrene Enhetsregisteret)
    const registryProvider = this.providers.find(p => p.id === 'brreg-enhetsregisteret') as BrregRegistryProvider;
    const primaryRegistryResult = await registryProvider.fetchSource(orgNumber);

    if (!primaryRegistryResult.success) {
      return {
        primaryRegistryResult,
        allResults: [primaryRegistryResult],
        sources: [primaryRegistryResult.sourceRecord],
        facts: [],
        rejectedSources: [primaryRegistryResult.sourceRecord],
      };
    }

    const companyName = primaryRegistryResult.identitySignals.companyName || '';
    const websiteUrl = primaryRegistryResult.identitySignals.domain;
    const address = primaryRegistryResult.identitySignals.address;

    onProgress?.('Querying official Financial Accounts Register', 35);

    // 2. Fetch Accounting Register
    const regnskapProvider = this.providers.find(p => p.id === 'brreg-regnskapsregisteret') as BrregRegnskapProvider;
    const regnskapResult = await regnskapProvider.fetchSource(orgNumber);

    onProgress?.('Querying official Roles and Management Register', 55);

    // 3. Fetch Roles Register
    const rollerProvider = this.providers.find(p => p.id === 'brreg-roller') as BrregRollerProvider;
    const rollerResult = await rollerProvider.fetchSource(orgNumber);

    onProgress?.('Checking official company domain and web presence', 75);

    // 4. Fetch Company Website if registered
    const websiteProvider = this.providers.find(p => p.id === 'company-website') as CompanyWebsiteProvider;
    const websiteResult = await websiteProvider.fetchSource(orgNumber, {
      websiteUrl,
      companyName,
      address,
    });

    onProgress?.('Verifying company identity signals across all sources', 85);

    const allResults = [primaryRegistryResult, regnskapResult, rollerResult, websiteResult];
    const sources: SourceRecord[] = [];
    const rejectedSources: SourceRecord[] = [];
    const facts: Fact[] = [];

    // Collect and filter sources
    for (const res of allResults) {
      if (!res.sourceRecord) continue;

      if (res.sourceRecord.verificationStatus === 'rejected') {
        rejectedSources.push(res.sourceRecord);
        sources.push(res.sourceRecord); // Include in source table with rejection badge
        continue;
      }

      sources.push(res.sourceRecord);

      // Only include facts from non-rejected sources
      for (const fact of res.extractedFacts) {
        if (fact.confidence >= 60) {
          facts.push(fact);
        }
      }
    }

    onProgress?.('Synthesizing evidence-backed company facts', 95);

    return {
      primaryRegistryResult,
      allResults,
      sources,
      facts,
      rejectedSources,
    };
  }
}

export const defaultSourceManager = new SourceManager();
