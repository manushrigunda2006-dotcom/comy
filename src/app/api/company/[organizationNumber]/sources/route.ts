import { NextRequest, NextResponse } from 'next/server';
import { getCompanySources } from '@/lib/db';
import { validateNorwegianOrgNumber } from '@/lib/validation';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ organizationNumber: string }> }
) {
  try {
    const { organizationNumber } = await context.params;
    const validation = validateNorwegianOrgNumber(organizationNumber);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const sources = await getCompanySources(validation.cleanNumber);
    return NextResponse.json({
      organizationNumber: validation.cleanNumber,
      sources,
      total: sources.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
