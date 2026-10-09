import { NextRequest, NextResponse } from 'next/server';
import { defaultAgentPipeline } from '@/lib/agent/pipeline';
import { validateNorwegianOrgNumber } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawOrgNumber = body?.organizationNumber;

    if (!rawOrgNumber) {
      return NextResponse.json(
        { error: 'Missing organizationNumber in request body' },
        { status: 400 }
      );
    }

    const validation = validateNorwegianOrgNumber(rawOrgNumber);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid organization number' },
        { status: 422 }
      );
    }

    const result = await defaultAgentPipeline.execute(validation.cleanNumber, {
      forceRefresh: Boolean(body?.forceRefresh),
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API Error in /api/company/research:', err);
    return NextResponse.json(
      {
        error: err.message || 'An error occurred during Norwegian company intelligence research',
      },
      { status: 500 }
    );
  }
}
