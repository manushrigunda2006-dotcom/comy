import { SourceProvider, SourceFetchResult, SourceIdentitySignals } from './types';
import { Fact, SourceRecord } from '../types';
import { evaluateCompanyMatch, extractDomain } from '../matching';
import { getCachedHttp, setCachedHttp } from '../db';

export class CompanyWebsiteProvider implements SourceProvider {
  id = 'company-website';
  name = 'Official Company Website';
  sourceType: SourceRecord['sourceType'] = 'company_website';
  isPermittedPublicSource = true;

  async fetchSource(
    orgNumber: string,
    context?: { websiteUrl?: string | null; companyName: string; address?: any }
  ): Promise<SourceFetchResult> {
    const rawUrl = context?.websiteUrl;
    const retrievedDate = new Date().toISOString();

    if (!rawUrl) {
      return {
        sourceRecord: {
          id: `src-website-${orgNumber}`,
          url: 'https://unknown',
          title: 'Official Company Website',
          domain: 'unknown',
          sourceType: this.sourceType,
          retrievedDate,
          factsExtractedCount: 0,
          verificationStatus: 'needs_verification',
          rejectionReason: 'No official website URL registered for this entity in Enhetsregisteret.',
          matchScore: 0,
        },
        identitySignals: {},
        extractedFacts: [],
        success: false,
        error: 'No website registered',
      };
    }

    const normalizedUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    const domain = extractDomain(normalizedUrl);

    // Check Cache
    const cached = getCachedHttp(normalizedUrl);
    let html: string = cached?.data;

    if (!html) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const response = await fetch(normalizedUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CherryAgent/1.0; +https://cherry.no/bot)',
            Accept: 'text/html,application/xhtml+xml,text/plain',
          },
          redirect: 'follow',
        });
        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`Website returned HTTP ${response.status}`);
        }

        const text = await response.text();
        html = text.slice(0, 150000); // Sample first 150KB
        setCachedHttp(normalizedUrl, html, response.status, 86400 * 3);
      } catch (err: any) {
        return {
          sourceRecord: {
            id: `src-website-${orgNumber}`,
            url: normalizedUrl,
            title: `Website (${domain})`,
            domain,
            sourceType: this.sourceType,
            retrievedDate,
            factsExtractedCount: 0,
            verificationStatus: 'needs_verification',
            rejectionReason: `Could not connect to domain: ${err.message}`,
            matchScore: 30,
          },
          identitySignals: { domain },
          extractedFacts: [],
          success: false,
          error: err.message,
        };
      }
    }

    // Extract meta title & description
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);

    const siteTitle = titleMatch ? titleMatch[1].trim() : `${context?.companyName || domain}`;
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : null;

    // Check company matching signals
    const candidateSnippet = `${siteTitle} ${metaDescription || ''} ${html.slice(0, 4000)}`;
    const matchBreakdown = evaluateCompanyMatch(
      {
        organizationNumber: orgNumber,
        name: context?.companyName || '',
        domain,
        address: context?.address,
      },
      {
        url: normalizedUrl,
        title: siteTitle,
        contentSnippet: candidateSnippet,
        sourceType: this.sourceType,
      }
    );

    const verificationStatus = matchBreakdown.totalScore >= 75
      ? 'verified'
      : matchBreakdown.totalScore >= 60
      ? 'needs_verification'
      : 'rejected';

    const sourceRecord: SourceRecord = {
      id: `src-website-${orgNumber}`,
      url: normalizedUrl,
      title: siteTitle,
      domain,
      sourceType: this.sourceType,
      publishedDate: null,
      retrievedDate,
      factsExtractedCount: 0,
      verificationStatus,
      rejectionReason: matchBreakdown.rejectionReason,
      matchScore: matchBreakdown.totalScore,
      matchBreakdown,
    };

    const identitySignals = this.extractCompanyIdentity({
      domain,
      html,
      siteTitle,
      metaDescription,
    });

    const facts: Fact[] = [];
    if (verificationStatus !== 'rejected') {
      if (metaDescription && metaDescription.length > 20) {
        facts.push({
          id: `${orgNumber}-site-desc`,
          field: 'website_description',
          label: 'Website Overview',
          value: metaDescription,
          category: 'business',
          source_url: normalizedUrl,
          source_title: siteTitle,
          source_date: null,
          retrieved_at: retrievedDate,
          evidence: `Verified meta description published on the official company domain (${domain}).`,
          confidence: Math.min(94, Math.round(matchBreakdown.totalScore * 0.95)),
          first_seen: retrievedDate,
          last_verified: retrievedDate,
          verified: true,
        });
      }
    }

    sourceRecord.factsExtractedCount = facts.length;

    return {
      sourceRecord,
      identitySignals,
      extractedFacts: facts,
      rawContent: candidateSnippet,
      success: true,
    };
  }

  extractCompanyIdentity(content: any): SourceIdentitySignals {
    return {
      domain: content.domain,
      rawText: `${content.siteTitle} ${content.metaDescription}`,
    };
  }

  extractFacts(): Fact[] {
    return [];
  }
}
