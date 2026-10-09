import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { importCompaniesFromFile } from './import-companies';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '../src/lib/supabase/server';
import { getDashboardStats } from '../src/lib/db';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export async function seedCompanies() {
  console.log('====================================================');
  console.log('CHERRY - 1,000+ NORWEGIAN COMPANY DATABASE SEEDER');
  console.log('====================================================\n');

  const jsonDatasetPath = 'data/norwegian_companies_1000.json';
  const csvDatasetPath = 'data/norwegian_companies_1000.csv';

  const targetFile = fs.existsSync(path.resolve(process.cwd(), jsonDatasetPath))
    ? jsonDatasetPath
    : csvDatasetPath;

  console.log(`Starting seed process with dataset: ${targetFile}`);

  const summary = await importCompaniesFromFile(targetFile, { updateExisting: true });

  console.log('\n----------------------------------------------------');
  console.log('SEEDING SUMMARY');
  console.log('----------------------------------------------------');
  console.log(`Total Profiles Read:   ${summary.totalRecords}`);
  console.log(`Modulus 11 Validated:  ${summary.validRecords}`);
  console.log(`Profiles Persisted:    ${summary.insertedCount}`);
  console.log(`Invalid / Rejected:    ${summary.rejectedRecords}`);

  // Database verification
  if (isSupabaseServerConfigured()) {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { count } = await supabase.from('companies').select('*', { count: 'exact', head: true });
      const { count: factsCount } = await supabase.from('company_facts').select('*', { count: 'exact', head: true });
      const { count: sourcesCount } = await supabase.from('sources').select('*', { count: 'exact', head: true });

      console.log('\n----------------------------------------------------');
      console.log('SUPABASE DATABASE AUDIT:');
      console.log(`Total Companies in Supabase:    ${count}`);
      console.log(`Total Company Facts:            ${factsCount}`);
      console.log(`Total Audited Sources:          ${sourcesCount}`);
      console.log('----------------------------------------------------');

      if ((count || 0) >= 1000) {
        console.log('SUCCESS: Supabase contains 1,000+ verified Norwegian company profiles!');
      } else {
        console.log(`NOTE: Supabase contains ${count} companies.`);
      }
    }
  } else {
    const stats = getDashboardStats();
    console.log('\n----------------------------------------------------');
    console.log('PERSISTENT STORE AUDIT:');
    console.log(`Total Companies:     ${stats.companiesCount}`);
    console.log(`Verified Facts:      ${stats.verifiedFactsCount}`);
    console.log(`Audited Sources:     ${stats.sourcesCount}`);
    console.log('----------------------------------------------------');
  }
}

seedCompanies()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error during company seeding:', err);
    process.exit(1);
  });
