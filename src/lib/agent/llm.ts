import { ResearchDiagnostics } from '../types';

export interface LLMSynthesisRequest {
  companyName: string;
  orgNumber: string;
  industry: string;
  employees?: number | null;
  revenue?: string | null;
  registeredPurpose?: string | null;
  websiteContent?: string | null;
}

export interface LLMSynthesisResult {
  executiveSummary: string;
  businessDescription: string;
  keyInsights: string[];
  diagnostics: {
    calls: number;
    tokens: number;
    costUsd: number;
    model: string;
    isDemoMode: boolean;
  };
}

/**
 * Intelligent LLM synthesis provider with graceful DEMO MODE fallback
 */
export async function runCompanyLLMSynthesis(req: LLMSynthesisRequest): Promise<LLMSynthesisResult> {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.LLM_API_KEY;

  // If no API key configured, use deterministic synthesis and mark DEMO MODE
  if (!apiKey) {
    return runDeterministicSynthesis(req, true);
  }

  try {
    const startTime = Date.now();
    // Use OpenAI-compatible endpoint
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are the Cherry Norwegian Company Intelligence Agent.
Your job is to analyze verified company facts from official registers and synthesize a concise, factual executive summary.
STRICT RULES:
1. NEVER invent or hallucinate financial numbers or company facts.
2. If data is missing, omit it or state it is not recorded in public registers.
3. Output STRICT JSON only. Format:
{
  "executiveSummary": "string",
  "businessDescription": "string",
  "keyInsights": ["string"]
}`,
          },
          {
            role: 'user',
            content: `Analyze this Norwegian entity:
Name: ${req.companyName}
Org Number: ${req.orgNumber}
Industry: ${req.industry}
Registered Employees: ${req.employees ?? 'Unknown'}
Financial Revenue: ${req.revenue ?? 'Not found in verified public sources'}
Statutory Purpose: ${req.registeredPurpose || 'N/A'}
Website snippet: ${req.websiteContent || 'N/A'}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.warn(`LLM API returned status ${response.status}, falling back to deterministic synthesis`);
      return runDeterministicSynthesis(req, false);
    }

    const data = await response.json();
    const content = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    const tokens = data.usage?.total_tokens || 350;
    // Estimated cost: gpt-4o-mini is ~$0.15 / 1M input, $0.60 / 1M output -> avg ~$0.0001
    const cost = Number(((tokens / 1_000_000) * 0.35).toFixed(5));

    return {
      executiveSummary: content.executiveSummary || `${req.companyName} is an active Norwegian enterprise in ${req.industry}.`,
      businessDescription: content.businessDescription || req.registeredPurpose || `${req.companyName} operates within ${req.industry}.`,
      keyInsights: Array.isArray(content.keyInsights) ? content.keyInsights : [],
      diagnostics: {
        calls: 1,
        tokens,
        costUsd: cost,
        model: 'gpt-4o-mini',
        isDemoMode: false,
      },
    };
  } catch (err) {
    console.warn('Error during LLM request, using deterministic fallback:', err);
    return runDeterministicSynthesis(req, false);
  }
}

/**
 * Deterministic synthesis when LLM is unavailable or in DEMO MODE
 */
function runDeterministicSynthesis(req: LLMSynthesisRequest, isExplicitDemo: boolean): LLMSynthesisResult {
  const parts: string[] = [];
  parts.push(`${req.companyName} (Org. nr. ${req.orgNumber}) is a registered Norwegian enterprise operating within ${req.industry}.`);

  if (req.employees) {
    parts.push(`The company maintains a registered workforce of ${req.employees} employees according to NAV Aa-registeret.`);
  }

  if (req.revenue && !req.revenue.includes('Not found')) {
    parts.push(`The latest official financial filings report operating revenue of ${req.revenue}.`);
  }

  const executiveSummary = parts.join(' ');
  const businessDescription = req.registeredPurpose || `${req.companyName} operates in the sector: ${req.industry}.`;

  const insights: string[] = [
    `Official legal identity verified with Brønnøysundregistrene.`,
    req.employees ? `Active employer with ${req.employees} reported personnel.` : `Employee count subject to statutory reporting updates.`,
    req.revenue && !req.revenue.includes('Not found')
      ? `Audited annual accounts available in the national accounting register.`
      : `No audited accounts filed or public financial data not available.`,
  ];

  return {
    executiveSummary,
    businessDescription,
    keyInsights: insights,
    diagnostics: {
      calls: 0,
      tokens: 0,
      costUsd: 0,
      model: isExplicitDemo ? 'Cherry Rule Engine (Demo Mode)' : 'Cherry Fallback Engine',
      isDemoMode: isExplicitDemo,
    },
  };
}
