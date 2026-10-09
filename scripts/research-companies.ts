import fs from 'fs';
import path from 'path';
import { defaultAgentPipeline } from '../src/lib/agent/pipeline';
import { getCompanyByOrgNumber, getDatabase, getDashboardStats } from '../src/lib/db';
import { formatOrgNumber } from '../src/lib/validation';

interface BatchOptions {
  limit?: number;
  concurrency?: number;
  maxRequests?: number;
  delayMs?: number;
}

export async function runBatchResearch(options: BatchOptions = {}) {
  const {
    limit = 1000,
    concurrency = 4,
    maxRequests = 1900,
    delayMs = 100,
  } = options;

  console.log('====================================================');
  console.log(' CHERRY BATCH RESEARCH PIPELINE');
  console.log(' 1,000 Norwegian Company Intelligence Profiles');
  console.log('====================================================\n');

  const filePath = path.resolve(process.cwd(), 'data/company_numbers.txt');
  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${filePath} not found. Run "npm run import:companies" first.`);
    return;
  }

  const rawLines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const orgNumbers = rawLines.slice(0, limit);

  console.log(`Loaded ${orgNumbers.length} organization numbers for research processing.`);
  console.log(`Concurrency: ${concurrency} | Max Requests: ${maxRequests} | Cost Limit: $10.00\n`);

  let processedCount = 0;
  let successCount = 0;
  let skippedCached = 0;
  let rejectedCount = 0;
  let totalRequests = 0;
  const startTime = Date.now();

  // Process in chunks to maintain controlled concurrency
  for (let i = 0; i < orgNumbers.length; i += concurrency) {
    if (totalRequests >= maxRequests) {
      console.warn(`[SAFETY] Reached maximum outbound request threshold (${totalRequests} requests). Halting batch.`);
      break;
    }

    const chunk = orgNumbers.slice(i, i + concurrency);

    await Promise.all(
      chunk.map(async (orgnr) => {
        processedCount++;
        const indexStr = `[${processedCount}/${orgNumbers.length}]`;

        // Check cache first
        const existing = await getCompanyByOrgNumber(orgnr);
        if (existing) {
          skippedCached++;
          console.log(`${indexStr} ${formatOrgNumber(orgnr)}: ${existing.name} (CACHED - ${existing.facts.length} facts)`);
          return;
        }

        try {
          totalRequests += 4;
          const result = await defaultAgentPipeline.execute(orgnr);
          successCount++;
          console.log(
            `${indexStr} ${formatOrgNumber(orgnr)}: ${result.company.name} | ${result.facts.length} facts | ${result.sources.length} sources | Conf: ${result.facts[0]?.confidence || 95}%`
          );
        } catch (err: any) {
          rejectedCount++;
          console.log(`${indexStr} ${formatOrgNumber(orgnr)}: [REJECTED/UNVERIFIED] ${err.message}`);
        }
      })
    );

    if (delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const stats = await getDashboardStats();

  console.log('\n====================================================');
  console.log(' BATCH RESEARCH EXECUTION COMPLETED');
  console.log('====================================================');
  console.log(`Total Processed:    ${processedCount}`);
  console.log(`Researched & Stored:${successCount}`);
  console.log(`Existing (Cached):  ${skippedCached}`);
  console.log(`Rejected/Unverified:${rejectedCount}`);
  console.log(`Estimated Requests: ${totalRequests}`);
  console.log(`Elapsed Time:       ${elapsedSec}s`);
  console.log('----------------------------------------------------');
  console.log(`Total DB Profiles:  ${stats.companiesCount}`);
  console.log(`Verified Facts:     ${stats.verifiedFactsCount}`);
  console.log(`Sources Indexed:    ${stats.sourcesCount}`);
  console.log(`Average Confidence: ${stats.averageConfidence}%`);
  console.log('====================================================\n');
}

// Parse CLI flags (e.g. --limit 50 or npm run research:batch)
const args = process.argv.slice(2);
let batchLimit = 1000;
const limitIdx = args.indexOf('--limit');
if (limitIdx !== -1 && args[limitIdx + 1]) {
  batchLimit = parseInt(args[limitIdx + 1], 10);
}

runBatchResearch({ limit: batchLimit }).catch(console.error);
