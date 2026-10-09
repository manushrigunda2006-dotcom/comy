import { NextRequest, NextResponse } from 'next/server';
import { defaultAgentPipeline } from '@/lib/agent/pipeline';
import { getCompanyByOrgNumber, getCompanyFacts, getCompanySources, getCompanyHistory } from '@/lib/db';
import { validateNorwegianOrgNumber } from '@/lib/validation';
import { buildFinalApiResponse } from '@/lib/agent/response';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ organizationNumber: string }> }
) {
  try {
    const { organizationNumber } = await context.params;

    const validation = validateNorwegianOrgNumber(organizationNumber);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid organization number' },
        { status: 400 }
      );
    }

    const org = validation.cleanNumber;
    let company = await getCompanyByOrgNumber(org);

    // If company is not in cache, automatically execute the research pipeline
    // from permitted public registers (Enhetsregisteret, Regnskapsregisteret, etc.)
    if (!company) {
      try {
        const researchResult = await defaultAgentPipeline.execute(org);
        return NextResponse.json(researchResult);
      } catch (researchErr: any) {
        return NextResponse.json(
          {
            found: false,
            error: researchErr.message || 'Could not verify company in permitted public sources',
            organizationNumber: org,
          },
          { status: 404 }
        );
      }
    }

    const facts = await getCompanyFacts(org);
    const sources = await getCompanySources(org);
    const history = await getCompanyHistory(org);

    const diagnostics = {
      requests: 0,
      llmCalls: 0,
      llmTokens: 0,
      estimatedCostUsd: 0,
      elapsedSeconds: 0.05,
      cachedHits: 1,
      modelUsed: 'SQLite / Supabase Store (Cached)',
      timestamp: company.lastResearchedAt,
      isDemoMode: company.isDemoMode,
    };

    const finalResponse = buildFinalApiResponse(company, facts, sources, [], diagnostics, history);
    return NextResponse.json(finalResponse);
  } catch (err: any) {
    console.error('Error fetching company:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve company profile' },
      { status: 500 }
    );
  }
}
