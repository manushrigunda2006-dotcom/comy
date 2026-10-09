import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { validateNorwegianOrgNumber } from '../src/lib/validation';
import { defaultAgentPipeline } from '../src/lib/agent/pipeline';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '../src/lib/supabase/server';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Strict Governance & Rate Limits
export const MAX_EXECUTION_TIME_MS = 45 * 60 * 1000; // 45 minutes
export const MAX_OUTBOUND_REQUESTS = 2000;          // 2,000 requests limit
export const MAX_COST_BUDGET_USD = 10.0;            // $10.00 USD cost limit
export const DEFAULT_CONCURRENCY = 2;               // Controlled concurrency

export interface BulkResearchMetrics {
  jobId: string;
  totalCompanies: number;
  processed: number;
  successful: number;
  failed: number;
  verified: number;
  rejected: number;
  outboundRequests: number;
  estimatedCostUsd: number;
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'running' | 'completed' | 'halted_limit';
  haltReason?: string;
  errorLog: Array<{ orgNumber: string; error: string; timestamp: string }>;
}

export async function runBulkResearch(
  inputFilePath: string = 'data/company_numbers.txt',
  options: {
    limitCount?: number;
    concurrency?: number;
    dryRun?: boolean;
  } = {}
): Promise<BulkResearchMetrics> {
  const startTime = Date.now();
  const startedAt = new Date().toISOString();
  const concurrency = options.concurrency || DEFAULT_CONCURRENCY;

  console.log('====================================================');
  console.log('CHERRY - AUTONOMOUS BULK RESEARCH ENGINE');
  console.log('====================================================');
  console.log(`Execution limit:       45 minutes`);
  console.log(`Outbound request cap:  2,000 requests`);
  console.log(`Financial cost limit:  $10.00 USD`);
  console.log(`Concurrency level:     ${concurrency}`);
  console.log(`Input source:          ${inputFilePath}\n`);

  // 1. Read input org numbers
  const resolved = path.resolve(process.cwd(), inputFilePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Input file not found: ${resolved}`);
  }

  const rawContent = fs.readFileSync(resolved, 'utf-8');
  let orgList: string[] = [];

  if (inputFilePath.endsWith('.csv')) {
    const lines = rawContent.split(/\r?\n/).filter(Boolean);
    // Find organization_number column
    const header = lines[0].split(',');
    const orgIdx = header.findIndex(h => /org.*num|organization_number/i.test(h.trim()));
    const targetIdx = orgIdx >= 0 ? orgIdx : 0;

    for (let i = 1; i < lines.length; i++) {
      const val = lines[i].split(',')[targetIdx]?.trim().replace(/^"|"$/g, '');
      if (val) orgList.push(val);
    }
  } else {
    orgList = rawContent.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  }

  if (options.limitCount && options.limitCount > 0) {
    orgList = orgList.slice(0, options.limitCount);
  }

  const metrics: BulkResearchMetrics = {
    jobId: `job_${Date.now()}`,
    totalCompanies: orgList.length,
    processed: 0,
    successful: 0,
    failed: 0,
    verified: 0,
    rejected: 0,
    outboundRequests: 0,
    estimatedCostUsd: 0.0,
    startedAt,
    status: 'running',
    errorLog: [],
  };

  const supabase = getSupabaseServerClient();
  let dbJobId: string | null = null;

  // Initialize job tracking in Supabase
  if (isSupabaseServerConfigured() && supabase) {
    const { data: jobRow } = await supabase
      .from('bulk_research_jobs')
      .insert({
        status: 'running',
        total_companies: metrics.totalCompanies,
        processed_companies: 0,
        successful_count: 0,
        failed_count: 0,
        verified_count: 0,
        rejected_count: 0,
        outbound_requests_count: 0,
        cost_usd: 0.0,
        started_at: startedAt,
        error_log: [],
      })
      .select('id')
      .single();

    if (jobRow) {
      dbJobId = jobRow.id;
      metrics.jobId = dbJobId;
      console.log(`Supabase Job Created: ID ${dbJobId}`);
    }
  }

  const updateSupabaseProgress = async () => {
    if (dbJobId && supabase) {
      await supabase
        .from('bulk_research_jobs')
        .update({
          processed_companies: metrics.processed,
          successful_count: metrics.successful,
          failed_count: metrics.failed,
          verified_count: metrics.verified,
          rejected_count: metrics.rejected,
          outbound_requests_count: metrics.outboundRequests,
          cost_usd: metrics.estimatedCostUsd,
          status: metrics.status,
          error_log: metrics.errorLog as any,
          completed_at: metrics.completedAt || null,
        })
        .eq('id', dbJobId);
    }
  };

  // Process companies with concurrency and circuit breakers
  let cursor = 0;

  async function worker() {
    while (cursor < orgList.length) {
      // Check limits before picking next task
      const elapsedMs = Date.now() - startTime;
      if (elapsedMs >= MAX_EXECUTION_TIME_MS) {
        metrics.status = 'halted_limit';
        metrics.haltReason = '45-minute execution time limit reached';
        console.warn(`\nHALTING: Reached 45-minute limit (${(elapsedMs / 1000).toFixed(1)}s elapsed).`);
        break;
      }

      if (metrics.outboundRequests >= MAX_OUTBOUND_REQUESTS) {
        metrics.status = 'halted_limit';
        metrics.haltReason = '2,000 outbound requests limit reached';
        console.warn(`\nHALTING: Reached 2,000 outbound request limit (${metrics.outboundRequests} requests).`);
        break;
      }

      if (metrics.estimatedCostUsd >= MAX_COST_BUDGET_USD) {
        metrics.status = 'halted_limit';
        metrics.haltReason = '$10.00 declared cost limit reached';
        console.warn(`\nHALTING: Reached $10 cost limit ($${metrics.estimatedCostUsd.toFixed(4)} spent).`);
        break;
      }

      const index = cursor++;
      if (index >= orgList.length) break;
      const rawOrg = orgList[index];

      const validation = validateNorwegianOrgNumber(rawOrg);
      if (!validation.valid) {
        metrics.processed++;
        metrics.failed++;
        metrics.errorLog.push({
          orgNumber: rawOrg,
          error: validation.error || 'Invalid Mod11 org number',
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      const org = validation.cleanNumber;

      try {
        if (!options.dryRun) {
          const res = await defaultAgentPipeline.execute(org, {
            forceRefresh: false, // will use cache or DB when available
          });

          metrics.successful++;
          metrics.verified += res.facts.length;
          metrics.outboundRequests += res.researchMetadata.requests;
          metrics.estimatedCostUsd += res.researchMetadata.estimatedCostUsd;
        } else {
          metrics.successful++;
          metrics.verified += 8;
          metrics.outboundRequests += 1;
          metrics.estimatedCostUsd += 0.0001;
        }
      } catch (err: any) {
        metrics.failed++;
        metrics.errorLog.push({
          orgNumber: org,
          error: err.message || 'Pipeline execution failed',
          timestamp: new Date().toISOString(),
        });
      } finally {
        metrics.processed++;
        if (metrics.processed % 5 === 0) {
          await updateSupabaseProgress();
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          process.stdout.write(
            `Processed ${metrics.processed}/${metrics.totalCompanies} | Success: ${metrics.successful} | Req: ${metrics.outboundRequests}/${MAX_OUTBOUND_REQUESTS} | Cost: $${metrics.estimatedCostUsd.toFixed(3)} | Time: ${elapsed}s\r`
          );
        }
      }
    }
  }

  // Launch workers
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  if (metrics.status === 'running') {
    metrics.status = 'completed';
  }
  metrics.completedAt = new Date().toISOString();
  await updateSupabaseProgress();

  console.log('\n\n====================================================');
  console.log('BULK RESEARCH RUN COMPLETED');
  console.log('====================================================');
  console.log(`Status:              ${metrics.status}`);
  console.log(`Total Processed:     ${metrics.processed} of ${metrics.totalCompanies}`);
  console.log(`Successful:          ${metrics.successful}`);
  console.log(`Failed / Skipped:    ${metrics.failed}`);
  console.log(`Facts Verified:      ${metrics.verified}`);
  console.log(`Outbound Requests:   ${metrics.outboundRequests} (Max ${MAX_OUTBOUND_REQUESTS})`);
  console.log(`Total Cost (USD):    $${metrics.estimatedCostUsd.toFixed(4)} (Max $${MAX_COST_BUDGET_USD})`);
  console.log(`Elapsed Time:        ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  console.log('====================================================\n');

  return metrics;
}

if (process.argv[1]?.endsWith('bulk-research.ts')) {
  const fileArg = process.argv[2] || 'data/company_numbers.txt';
  const limitArg = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;

  runBulkResearch(fileArg, { limitCount: limitArg })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Bulk research failure:', err);
      process.exit(1);
    });
}
