import { NextRequest, NextResponse } from 'next/server';
import { getCompaniesList } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const sortBy = (searchParams.get('sortBy') as any) || 'last_researched_at';
    const sortOrder = (searchParams.get('sortOrder') as any) || 'desc';
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const result = await getCompaniesList({
      search,
      sortBy,
      sortOrder,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
