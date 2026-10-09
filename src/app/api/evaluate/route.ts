import { NextRequest, NextResponse } from 'next/server';
import { runEvaluationBatch } from '@/lib/agent/evaluator';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    let orgNumbers: string[] = [];

    try {
      const body = await req.json();
      if (Array.isArray(body)) {
        orgNumbers = body.map((item) =>
          typeof item === 'string' ? item : item.organization_number || item.organizationNumber || item.org
        );
      } else if (body.organizationNumbers && Array.isArray(body.organizationNumbers)) {
        orgNumbers = body.organizationNumbers;
      } else if (body.organization_number || body.organizationNumber) {
        orgNumbers = [body.organization_number || body.organizationNumber];
      }
    } catch {
      // If empty body, sample 10 representative Norwegian enterprises
      orgNumbers = [];
    }

    // Default to 10 representative Norwegian enterprise numbers if none provided
    if (orgNumbers.length === 0) {
      const sampleFile = path.resolve(process.cwd(), 'data/company_numbers.txt');
      if (fs.existsSync(sampleFile)) {
        const lines = fs.readFileSync(sampleFile, 'utf-8').split(/\r?\n/).filter(Boolean);
        orgNumbers = lines.slice(0, 10);
      } else {
        orgNumbers = [
          '923609016', // Equinor ASA
          '984851006', // DNB Bank ASA
          '990888213', // Telenor ASA
          '914778271', // Norsk Hydro ASA
          '933649768', // Schibsted ASA
          '986228608', // Yara International ASA
          '910000004', // Kyst Engineering AS
          '910000136', // Nexus Partners ASA
          '910000268', // Vann Holdings AS
          '910000527', // Aktiv Energy AS
        ];
      }
    }

    const report = await runEvaluationBatch(orgNumbers);
    return NextResponse.json(report);
  } catch (err: any) {
    console.error('Error in judge simulator evaluation:', err);
    return NextResponse.json(
      { error: err.message || 'Evaluation run failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Convenience GET endpoint returning evaluation on top 10 sample companies
  const sampleOrgs = [
    '923609016',
    '984851006',
    '990888213',
    '914778271',
    '933649768',
    '986228608',
    '910000004',
    '910000136',
    '910000268',
    '910000527',
  ];
  const report = await runEvaluationBatch(sampleOrgs);
  return NextResponse.json(report);
}
