import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { validateNorwegianOrgNumber } from '../src/lib/validation';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '../src/lib/supabase/server';
import { DatabaseSync } from 'node:sqlite';

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface CompanyImportRecord {
  organization_number: string;
  company_name: string;
  legal_form?: string | null;
  status?: string | null;
  registration_date?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  industry?: string | null;
  business_description?: string | null;
  employee_count?: number | null;
  facts?: Array<{
    fact_type: string;
    fact_name: string;
    fact_value: string;
    confidence: number;
    verification_status?: string;
    evidence?: string;
    source_url?: string;
    source_title?: string;
    source_date?: string;
  }>;
  sources?: Array<{
    source_url: string;
    source_title: string;
    source_type: string;
    domain: string;
    publication_date?: string;
    retrieved_at?: string;
    verification_status?: string;
    company_match_score?: number;
  }>;
}

export interface ImportSummary {
  totalRecords: number;
  validRecords: number;
  rejectedRecords: number;
  insertedCount: number;
  updatedCount: number;
  errors: string[];
}

/**
 * Parses CSV lines into raw record objects
 */
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // CSV parser handling quoted commas
    const values: string[] = [];
    let insideQuote = false;
    let currentValue = '';

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim().replace(/^"|"$/g, ''));

    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] || '';
    });
    records.push(record);
  }

  return records;
}

/**
 * Main company importer function
 */
export async function importCompaniesFromFile(
  filePath: string,
  options: { updateExisting?: boolean } = { updateExisting: true }
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    totalRecords: 0,
    validRecords: 0,
    rejectedRecords: 0,
    insertedCount: 0,
    updatedCount: 0,
    errors: [],
  };

  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  let rawList: CompanyImportRecord[] = [];

  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(content);
    rawList = Array.isArray(parsed) ? parsed : [parsed];
  } else {
    // CSV format
    const rows = parseCsv(content);
    rawList = rows.map((r) => ({
      organization_number: r.organization_number || r.orgnr || r.org_number,
      company_name: r.company_name || r.name || r.navn,
      legal_form: r.legal_form || r.form || 'AS',
      status: r.status || 'Active',
      registration_date: r.registration_date || null,
      address: r.address || r.street || null,
      postal_code: r.postal_code || null,
      city: r.city || null,
      country: r.country || 'Norway',
      website: r.website || null,
      industry: r.industry || null,
      business_description: r.business_description || null,
      employee_count: r.employee_count ? parseInt(r.employee_count, 10) : null,
    }));
  }

  summary.totalRecords = rawList.length;
  console.log(`\nImporting ${rawList.length} companies from: ${filePath}...`);

  // Deduplicate in batch by organization_number
  const validRecordsMap = new Map<string, CompanyImportRecord>();

  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];
    const validation = validateNorwegianOrgNumber(item.organization_number);

    // Rule 1 & 7: Validate organization numbers & reject invalid records
    if (!validation.valid) {
      summary.rejectedRecords++;
      summary.errors.push(
        `Row ${i + 1} (${item.organization_number}): ${validation.error || 'Invalid Modulus 11 checksum'}`
      );
      continue;
    }

    const org = validation.cleanNumber;
    item.organization_number = org;
    item.country = item.country || 'Norway';

    // Duplicate check
    if (validRecordsMap.has(org)) {
      if (options.updateExisting) {
        validRecordsMap.set(org, { ...validRecordsMap.get(org)!, ...item });
      }
    } else {
      validRecordsMap.set(org, item);
    }
  }

  summary.validRecords = validRecordsMap.size;
  const verifiedCompanies = Array.from(validRecordsMap.values());
  console.log(`Validated ${verifiedCompanies.length} Norwegian companies. Rejected: ${summary.rejectedRecords}.`);

  const now = new Date().toISOString();
  const supabase = getSupabaseServerClient();

  if (isSupabaseServerConfigured() && supabase) {
    console.log('Target database: Supabase (Persistent Cloud Database)');

    // Process in batches of 50 for optimal HTTP payload and speed
    const BATCH_SIZE = 50;
    for (let b = 0; b < verifiedCompanies.length; b += BATCH_SIZE) {
      const batch = verifiedCompanies.slice(b, b + BATCH_SIZE);

      const upsertRows = batch.map((c) => ({
        organization_number: c.organization_number,
        company_name: c.company_name,
        legal_form: c.legal_form || 'AS',
        status: c.status || 'Active',
        registration_date: c.registration_date || null,
        address: c.address || null,
        postal_code: c.postal_code || null,
        city: c.city || null,
        country: 'Norway',
        website: c.website || null,
        industry: c.industry || null,
        business_description: c.business_description || null,
        employee_count: c.employee_count ?? null,
        last_verified_at: now,
        updated_at: now,
      }));

      const { data, error } = await supabase
        .from('companies')
        .upsert(upsertRows, { onConflict: 'organization_number' })
        .select('id, organization_number');

      if (error) {
        console.error(`Batch upsert error [${b} - ${b + batch.length}]:`, error.message);
        summary.errors.push(`Supabase batch error: ${error.message}`);
      } else {
        summary.insertedCount += data?.length || 0;
      }

      // Also import sources & facts if present in the record
      for (const comp of batch) {
        if (!comp.sources && !comp.facts) continue;

        // Fetch company id
        const { data: compRow } = await supabase
          .from('companies')
          .select('id')
          .eq('organization_number', comp.organization_number)
          .single();

        if (!compRow) continue;
        const compId = compRow.id;

        // Insert sources
        const sourceUrlToId = new Map<string, string>();
        if (comp.sources && comp.sources.length > 0) {
          for (const s of comp.sources) {
            const { data: srcRow } = await supabase
              .from('sources')
              .insert({
                company_id: compId,
                source_url: s.source_url,
                source_title: s.source_title,
                source_type: s.source_type,
                domain: s.domain,
                publication_date: s.publication_date || null,
                retrieved_at: s.retrieved_at || now,
                verification_status: s.verification_status || 'verified',
                company_match_score: s.company_match_score || 100,
                created_at: now,
              })
              .select('id')
              .single();

            if (srcRow) {
              sourceUrlToId.set(s.source_url, srcRow.id);
            }
          }
        }

        // Insert facts
        if (comp.facts && comp.facts.length > 0) {
          const factsToInsert = comp.facts.map((f) => ({
            company_id: compId,
            fact_type: f.fact_type,
            fact_name: f.fact_name,
            fact_value: f.fact_value,
            confidence: f.confidence,
            verification_status: f.verification_status || 'verified',
            evidence: f.evidence || null,
            source_id: (f.source_url && sourceUrlToId.get(f.source_url)) || null,
            source_date: f.source_date || null,
            first_seen: now,
            last_verified: now,
            created_at: now,
          }));

          await supabase.from('company_facts').insert(factsToInsert);
        }
      }

      process.stdout.write(`Processed ${Math.min(b + BATCH_SIZE, verifiedCompanies.length)}/${verifiedCompanies.length}\r`);
    }

    console.log(`\nSupabase Import complete. Inserted/Updated: ${summary.insertedCount} profiles.`);
  } else {
    console.log('Supabase credentials not configured in environment.');
    console.log('Syncing into local database store to preserve operational readiness...');

    const dbDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    const db = new DatabaseSync(path.join(dbDir, 'signalpost.sqlite'));

    // SQLite local upsert
    const upsertStmt = db.prepare(`
      INSERT INTO companies (
        organization_number, name, status, legal_form, registration_date,
        industry_desc, street, postal_code, city, country, website,
        employees_count, business_description, last_researched_at, profile_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(organization_number) DO UPDATE SET
        name = excluded.name,
        status = excluded.status,
        legal_form = excluded.legal_form,
        industry_desc = excluded.industry_desc,
        street = excluded.street,
        postal_code = excluded.postal_code,
        city = excluded.city,
        website = excluded.website,
        employees_count = excluded.employees_count,
        last_researched_at = excluded.last_researched_at
    `);

    for (const c of verifiedCompanies) {
      const minimalProfile = {
        organizationNumber: c.organization_number,
        name: c.company_name,
        status: c.status || 'Active',
        legalForm: c.legal_form || 'AS',
        registrationDate: c.registration_date,
        businessAddress: { street: c.address, postalCode: c.postal_code, city: c.city, country: 'Norway' },
        industry: { code: '', description: c.industry || 'General Business Services' },
        website: c.website,
        employees: { count: c.employee_count, hasRegisteredEmployees: Boolean(c.employee_count) },
        businessDescription: c.business_description,
        keyPeople: [],
        facts: [],
        sources: [],
        historicalNames: [],
        lastResearchedAt: now,
        isDemoMode: false,
      };

      upsertStmt.run(
        c.organization_number,
        c.company_name,
        c.status || 'Active',
        c.legal_form || 'AS',
        c.registration_date || null,
        c.industry || null,
        c.address || null,
        c.postal_code || null,
        c.city || null,
        'Norway',
        c.website || null,
        c.employee_count ?? null,
        c.business_description || null,
        now,
        JSON.stringify(minimalProfile)
      );
      summary.insertedCount++;
    }
  }

  return summary;
}

// CLI Execution support
if (process.argv[1]?.endsWith('import-companies.ts')) {
  const fileArg = process.argv[2] || 'data/norwegian_companies_1000.csv';
  importCompaniesFromFile(fileArg)
    .then((s) => {
      console.log('\n=== Import Summary ===');
      console.log(`Total: ${s.totalRecords}`);
      console.log(`Valid: ${s.validRecords}`);
      console.log(`Rejected: ${s.rejectedRecords}`);
      console.log(`Persisted: ${s.insertedCount}`);
      if (s.errors.length > 0) {
        console.log(`Errors encountered: ${s.errors.length}`);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Import failed:', err);
      process.exit(1);
    });
}
