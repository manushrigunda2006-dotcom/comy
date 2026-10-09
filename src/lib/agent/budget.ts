/**
 * Budget and Rate Limit Manager
 * Enforces the hackathon constraints:
 * - Maximum 2,000 outbound requests / day
 * - Maximum $10 external API costs / day
 * - Request deduplication and aggressive caching
 */

export interface BudgetConfig {
  maxDailyRequests: number;
  maxDailyCostUsd: number;
  maxRequestsPerCompany: number;
}

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  maxDailyRequests: 2000,
  maxDailyCostUsd: 10.0,
  maxRequestsPerCompany: 6,
};

let outboundRequestCount = 0;
let cacheHitCount = 0;
let totalCostUsd = 0;
let lastResetDate = new Date().toDateString();

function checkDailyReset() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    outboundRequestCount = 0;
    cacheHitCount = 0;
    totalCostUsd = 0;
    lastResetDate = today;
  }
}

export class RequestBudgetManager {
  private config: BudgetConfig;

  constructor(config: Partial<BudgetConfig> = {}) {
    this.config = { ...DEFAULT_BUDGET_CONFIG, ...config };
  }

  /**
   * Checks whether an outbound request is permitted under daily limits
   */
  public canMakeRequest(companyRequestCount: number = 0): {
    allowed: boolean;
    reason?: string;
    remainingBudget: number;
  } {
    checkDailyReset();

    if (outboundRequestCount >= this.config.maxDailyRequests) {
      return {
        allowed: false,
        reason: `Daily outbound request limit (${this.config.maxDailyRequests}) reached. Serving cached verified facts only.`,
        remainingBudget: 0,
      };
    }

    if (totalCostUsd >= this.config.maxDailyCostUsd) {
      return {
        allowed: false,
        reason: `Daily API budget limit ($${this.config.maxDailyCostUsd.toFixed(2)}) reached.`,
        remainingBudget: this.config.maxDailyRequests - outboundRequestCount,
      };
    }

    if (companyRequestCount >= this.config.maxRequestsPerCompany) {
      return {
        allowed: false,
        reason: `Per-company request threshold (${this.config.maxRequestsPerCompany}) reached. Prioritizing primary registry data.`,
        remainingBudget: this.config.maxDailyRequests - outboundRequestCount,
      };
    }

    return {
      allowed: true,
      remainingBudget: this.config.maxDailyRequests - outboundRequestCount,
    };
  }

  /**
   * Records an outbound or cached request
   */
  public recordRequest(isCached: boolean, estimatedCost: number = 0): void {
    checkDailyReset();
    if (isCached) {
      cacheHitCount++;
    } else {
      outboundRequestCount++;
      totalCostUsd += estimatedCost;
    }
  }

  /**
   * Returns current budget metrics
   */
  public getMetrics() {
    checkDailyReset();
    const totalCalls = outboundRequestCount + cacheHitCount;
    const cacheHitRate = totalCalls > 0 ? Number(((cacheHitCount / totalCalls) * 100).toFixed(1)) : 100;

    return {
      maxDailyRequests: this.config.maxDailyRequests,
      currentOutboundRequests: outboundRequestCount,
      remainingRequests: Math.max(0, this.config.maxDailyRequests - outboundRequestCount),
      cacheHits: cacheHitCount,
      cacheHitRatePercent: cacheHitRate,
      maxDailyCostUsd: this.config.maxDailyCostUsd,
      currentCostUsd: Number(totalCostUsd.toFixed(4)),
      isBudgetExhausted: outboundRequestCount >= this.config.maxDailyRequests || totalCostUsd >= this.config.maxDailyCostUsd,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Resets budget counters (useful in tests)
   */
  public reset(): void {
    outboundRequestCount = 0;
    cacheHitCount = 0;
    totalCostUsd = 0;
    lastResetDate = new Date().toDateString();
  }
}

export const defaultBudgetManager = new RequestBudgetManager();
