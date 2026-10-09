import { NextRequest, NextResponse } from 'next/server';
import { defaultAgentPipeline } from '@/lib/agent/pipeline';
import { validateNorwegianOrgNumber } from '@/lib/validation';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ organizationNumber: string }> }
) {
  try {
    const { organizationNumber } = await context.params;
    const validation = validateNorwegianOrgNumber(organizationNumber);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await defaultAgentPipeline.execute(validation.cleanNumber, {
      forceRefresh: true,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error refreshing company profile:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
