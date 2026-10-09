import { NextRequest, NextResponse } from 'next/server';
import { validateNorwegianOrgNumber, cleanOrgNumber } from '@/lib/validation';
import { getCompanyByOrgNumber, saveCompanyProfile } from '@/lib/db';
import { defaultAgentPipeline } from '@/lib/agent/pipeline';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let orgNumbers: string[] = [];

    if (contentType.includes('application/json')) {
      const body = await req.json();
      if (Array.isArray(body)) {
        orgNumbers = body.map((item) =>
          typeof item === 'string' ? item : item.organization_number || item.organizationNumber || item.org
        );
      } else if (body.organizationNumbers && Array.isArray(body.organizationNumbers)) {
        orgNumbers = body.organizationNumbers;
      } else if (body.companies && Array.isArray(body.companies)) {
        orgNumbers = body.companies.map(
          (c: any) => c.organization_number || c.organizationNumber || c.org
        );
      } else if (body.organization_number || body.organizationNumber) {
        orgNumbers = [body.organization_number || body.organizationNumber];
      }
    } else if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      const text = await req.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const parts = line.split(/[,;\t]/);
        const candidate = parts[0].replace(/["']/g, '').trim();
        if (candidate.toLowerCase() !== 'organization_number' && candidate.toLowerCase() !== 'orgnr') {
          orgNumbers.push(candidate);
        }
      }
    } else {
      // Default / fallback: load all 1,000 companies from seed dataset
      const seedFile = path.resolve(process.cwd(), 'data/company_numbers.txt');
      if (fs.existsSync(seedFile)) {
        const fileContent = fs.readFileSync(seedFile, 'utf-8');
        orgNumbers = fileContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      }
    }

    if (orgNumbers.length === 0) {
      return NextResponse.json(
        { error: 'No valid Norwegian organization numbers provided in CSV or JSON payload.' },
        { status: 400 }
      );
    }

    const summary = {
      totalReceived: orgNumbers.length,
      validRecords: 0,
      insertedCount: 0,
      rejectedCount: 0,
      rejected: [] as Array<{ org: string; reason: string }>,
    };

    // Process and validate
    for (const raw of orgNumbers) {
      const val = validateNorwegianOrgNumber(raw);
      if (!val.valid) {
        summary.rejectedCount++;
        summary.rejected.push({ org: String(raw), reason: val.error || 'Invalid Mod11 checksum' });
        continue;
      }

      summary.validRecords++;
      const org = val.cleanNumber;

      // Check if already stored
      const existing = await getCompanyByOrgNumber(org);
      if (existing) {
        summary.insertedCount++;
      } else {
        // Quick registry resolution if uncached
        try {
          await defaultAgentPipeline.execute(org);
          summary.insertedCount++;
        } catch (err: any) {
          summary.rejectedCount++;
          summary.rejected.push({ org, reason: err.message || 'Entity resolution failed' });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk import processed ${summary.validRecords} valid Norwegian company numbers.`,
      ...summary,
    });
  } catch (err: any) {
    console.error('Error in bulk import:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process bulk company import' },
      { status: 500 }
    );
  }
}
