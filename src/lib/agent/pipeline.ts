import { validateNorwegianOrgNumber } from '../validation';
import { defaultSourceManager } from '../sources/source-manager';
import { runCompanyLLMSynthesis } from './llm';
import {
  CompanyProfile,
  Fact,
  HistoryChange,
  ResearchDiagnostics,
  ResearchResponse,
  SourceRecord,
} from '../types';
import {
  getCompanyByOrgNumber,
  getCompanyFacts,
  getCompanyHistory,
  getCompanySources,
  saveCompanyProfile,
  logRequestRecord,
} from '../db';
import { filterVerifiedFacts } from '../matching';
import { detectCompanyChanges } from './change-detection';
import { buildFinalApiResponse, FinalApiResponse } from './response';
import { defaultBudgetManager } from './budget';

export interface ResearchOptions {
  forceRefresh?: boolean;
  onProgress?: (step: string, percent: number) => void;
}

export class ResearchAgentPipeline {
  /**
   * Executes the full 12-step Norwegian company intelligence research pipeline
   */
  public async execute(
    rawOrgInput: string | number,
    options: ResearchOptions = {}
  ): Promise<ResearchResponse & FinalApiResponse> {
    const startTime = Date.now();
    let requestsCount = 0;
    const { onProgress } = options;

    // STEP 1 & 2: INPUT & VALIDATE ORGANIZATION NUMBER
    onProgress?.('Validating Norwegian organization number (Modulus 11)', 5);
    const validation = validateNorwegianOrgNumber(rawOrgInput);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid organization number');
    }

    const orgNumber = validation.cleanNumber;

    // Check if cached and not forced refresh
    if (!options.forceRefresh) {
      const existing = await getCompanyByOrgNumber(orgNumber);
      if (existing) {
        defaultBudgetManager.recordRequest(true);
        const facts = await getCompanyFacts(orgNumber);
        const sources = await getCompanySources(orgNumber);
        const history = await getCompanyHistory(orgNumber);
        const elapsedSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));

        const diagnostics: ResearchDiagnostics = {
          requests: 0,
          llmCalls: 0,
          llmTokens: 0,
          estimatedCostUsd: 0,
          elapsedSeconds,
          cachedHits: 1,
          modelUsed: 'SQLite / Supabase Store (Cached)',
          timestamp: existing.lastResearchedAt || new Date().toISOString(),
          isDemoMode: existing.isDemoMode,
        };

        const finalResponse = buildFinalApiResponse(existing, facts, sources, [], diagnostics, history);
        return finalResponse as ResearchResponse & FinalApiResponse;
      }
    }

    // STEP 3, 4, 5, 6, 7: RESOLVE IDENTITY, DISCOVER SOURCES, FETCH, MATCH, EXTRACT
    onProgress?.('Querying official Norwegian registers (Brønnøysundregistrene)', 20);
    const researchResult = await defaultSourceManager.researchCompanySources(orgNumber, (step, p) => {
      onProgress?.(step, Math.min(85, p));
    });
    requestsCount += 4;

    if (!researchResult.primaryRegistryResult.success) {
      throw new Error(
        researchResult.primaryRegistryResult.error ||
          'Cherry could not verify this organization as a Norwegian company from the available permitted public sources.'
      );
    }

    const primaryData = JSON.parse(researchResult.primaryRegistryResult.rawContent || '{}');
    const rejectedUrls = new Set(researchResult.rejectedSources.map(s => s.url));

    // STEP 8, 9, 10, 11: VALIDATE EVIDENCE, FRESHNESS, CONFIDENCE, REJECT UNSUPPORTED
    onProgress?.('Auditing source claims and calculating confidence scores', 85);
    const verifiedFacts = filterVerifiedFacts(researchResult.facts, rejectedUrls);

    // Extract Financial Statements safely
    const regnskapResult = researchResult.allResults.find(
      r => r.sourceRecord.sourceType === 'financial_register'
    ) as any;
    const financialStatement = regnskapResult?.financialStatement || null;

    // Extract Key People safely
    const rollerResult = researchResult.allResults.find(
      r => r.sourceRecord.sourceType === 'roles_register'
    ) as any;
    const keyPeople = rollerResult?.keyPeople || [];

    // STEP 12: LLM SYNTHESIS & COMPANY PROFILE GENERATION
    onProgress?.('Generating structured intelligence profile', 92);

    const industryText = primaryData.naeringskode1
      ? `${primaryData.naeringskode1.kode} - ${primaryData.naeringskode1.beskrivelse}`
      : 'General Commercial Activity';

    const llmResult = await runCompanyLLMSynthesis({
      companyName: primaryData.navn,
      orgNumber,
      industry: industryText,
      employees: primaryData.antallAnsatte,
      revenue: financialStatement?.operatingRevenueFormatted,
      registeredPurpose: (primaryData.vedtektsfestetFormaal || primaryData.aktivitet || []).join(' '),
      websiteContent: researchResult.allResults.find(r => r.sourceRecord.sourceType === 'company_website')?.rawContent,
    });

    const isDemoMode = llmResult.diagnostics.isDemoMode;

    const companyProfile: CompanyProfile = {
      organizationNumber: orgNumber,
      name: primaryData.navn,
      status: primaryData.konkurs
        ? 'Bankruptcy'
        : primaryData.underAvvikling
        ? 'Liquidation'
        : 'Active',
      legalForm: primaryData.organisasjonsform?.beskrivelse || 'Aksjeselskap',
      legalFormCode: primaryData.organisasjonsform?.kode || 'AS',
      registrationDate: primaryData.registreringsdatoEnhetsregisteret || null,
      foundingDate: primaryData.stiftelsesdato || null,
      businessAddress: {
        street: primaryData.forretningsadresse?.adresse?.join(', ') || null,
        postalCode: primaryData.forretningsadresse?.postnummer || null,
        city: primaryData.forretningsadresse?.poststed || null,
        municipality: primaryData.forretningsadresse?.kommune || null,
        country: primaryData.forretningsadresse?.land || 'Norway',
      },
      postalAddress: primaryData.postadresse
        ? {
            street: primaryData.postadresse?.adresse?.join(', ') || null,
            postalCode: primaryData.postadresse?.postnummer || null,
            city: primaryData.postadresse?.poststed || null,
            country: primaryData.postadresse?.land || 'Norway',
          }
        : undefined,
      industry: {
        code: primaryData.naeringskode1?.kode || '00.000',
        description: primaryData.naeringskode1?.beskrivelse || 'Not categorized',
      },
      website: primaryData.hjemmeside
        ? (primaryData.hjemmeside.startsWith('http') ? primaryData.hjemmeside : `https://${primaryData.hjemmeside}`)
        : null,
      phone: primaryData.telefon || null,
      employees: {
        count: primaryData.antallAnsatte ?? null,
        registrationDate: primaryData.registreringsdatoAntallAnsatteEnhetsregisteret || null,
        hasRegisteredEmployees: Boolean(primaryData.harRegistrertAntallAnsatte),
      },
      businessDescription: llmResult.businessDescription,
      executiveSummary: llmResult.executiveSummary,
      financials: financialStatement,
      keyPeople,
      facts: verifiedFacts,
      sources: researchResult.sources,
      historicalNames: (primaryData.historiskeNavn || []).map((h: any) => ({
        name: h.navn,
        fromDate: h.fraDato,
        toDate: h.tilDato || null,
      })),
      lastResearchedAt: new Date().toISOString(),
      isDemoMode,
    };

    // Detect Changes from Previous Research using change-detection engine
    const previous = await getCompanyByOrgNumber(orgNumber);
    const comparison = detectCompanyChanges(companyProfile, previous);
    const changes = comparison.changes;

    // Track outbound requests and cost in budget manager and request logs
    defaultBudgetManager.recordRequest(false, llmResult.diagnostics.costUsd);
    for (const src of researchResult.sources) {
      logRequestRecord({
        companyId: orgNumber,
        url: src.url,
        source: src.title,
        statusCode: 200,
        responseTimeMs: Math.round(startTime ? (Date.now() - startTime) / researchResult.sources.length : 100),
        cached: false,
      });
    }

    // Save to SQLite and Supabase
    onProgress?.('Persisting company profile and evidence-linked facts', 98);
    await saveCompanyProfile(companyProfile, verifiedFacts, researchResult.sources, changes);

    const elapsedSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));
    const history = await getCompanyHistory(orgNumber);

    const nowIso = new Date().toISOString();
    const researchMetadata: ResearchDiagnostics = {
      requests: requestsCount,
      llmCalls: llmResult.diagnostics.calls,
      llmTokens: llmResult.diagnostics.tokens,
      estimatedCostUsd: llmResult.diagnostics.costUsd,
      elapsedSeconds,
      cachedHits: 0,
      modelUsed: llmResult.diagnostics.model,
      timestamp: nowIso,
      isDemoMode,
    };

    onProgress?.('Research complete', 100);

    const finalResult = buildFinalApiResponse(
      companyProfile,
      verifiedFacts,
      researchResult.sources,
      changes,
      researchMetadata,
      history
    );

    return finalResult as ResearchResponse & FinalApiResponse;
  }
}

export const defaultAgentPipeline = new ResearchAgentPipeline();
