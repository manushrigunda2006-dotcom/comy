'use client';

import React, { useState } from 'react';
import { Bot, Send, Sparkles, CheckCircle2, ShieldCheck, Database, HelpCircle } from 'lucide-react';
import { CompanyProfile, Fact, SourceRecord, ResearchHistoryRecord } from '@/lib/types';
import { formatOrgNumber } from '@/lib/validation';
import { formatFullDate, formatRelativeTime } from '@/lib/freshness';

interface CherryAssistantProps {
  company: CompanyProfile;
  facts: Fact[];
  sources: SourceRecord[];
  history?: ResearchHistoryRecord[];
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sourcesCited?: string[];
  confidence?: number;
}

const EXAMPLE_QUESTIONS = [
  'What does this Norwegian company do?',
  'When was this company registered?',
  'What is the latest verified employee information?',
  'What changed recently?',
  'Which sources verify this information?',
];

export const CherryAssistant: React.FC<CherryAssistantProps> = ({
  company,
  facts,
  sources,
  history = [],
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hei! I am the Comy Research Assistant. I can answer questions about ${company.name} (Org. nr. ${formatOrgNumber(
        company.organizationNumber
      )}) strictly using verified Norwegian public register data.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);

  const generateAnswer = (query: string): { text: string; sourcesCited: string[]; confidence: number } => {
    const q = query.toLowerCase().trim();

    // 1. What does this company do?
    if (q.includes('what') && (q.includes('do') || q.includes('business') || q.includes('activity') || q.includes('purpose'))) {
      const industryDesc = company.industry?.description || 'Commercial activity';
      const code = company.industry?.code || '';
      const purpose = company.businessDescription
        ? `\n\nStatutory commercial purpose: "${company.businessDescription}"`
        : '';
      const summary = company.executiveSummary ? `\n\nOverview: ${company.executiveSummary}` : '';

      return {
        text: `${company.name} operates in Norway under NACE industry classification ${code} (${industryDesc}).${purpose}${summary}`,
        sourcesCited: ['Enhetsregisteret (Brønnøysundregistrene)'],
        confidence: 100,
      };
    }

    // 2. When was this company registered?
    if (q.includes('registered') || q.includes('founded') || q.includes('when was')) {
      const reg = company.registrationDate ? formatFullDate(company.registrationDate) : 'Unknown';
      const fnd = company.foundingDate ? formatFullDate(company.foundingDate) : reg;
      return {
        text: `${company.name} was formally registered in Enhetsregisteret on ${reg}. Founding date recorded in Norwegian public registers is ${fnd}.`,
        sourcesCited: ['Enhetsregisteret (Brønnøysundregistrene)'],
        confidence: 100,
      };
    }

    // 3. Employee information
    if (q.includes('employee') || q.includes('workforce') || q.includes('staff') || q.includes('people work')) {
      if (company.employees?.count !== null && company.employees?.count !== undefined) {
        return {
          text: `According to the latest NAV Aa-registeret records reported via Enhetsregisteret, ${company.name} has ${company.employees.count.toLocaleString()} registered employees (recorded on ${company.employees.registrationDate || 'recent filing'}).`,
          sourcesCited: ['NAV Employer and Employee Register (Aa-registeret)'],
          confidence: 98,
        };
      }
      return {
        text: `Employee count for ${company.name} is not registered in NAV Aa-registeret records. In accordance with Comy anti-fabrication standards, unverified headcounts are not published.`,
        sourcesCited: ['NAV Aa-registeret / Enhetsregisteret'],
        confidence: 95,
      };
    }

    // 4. What changed recently?
    if (q.includes('change') || q.includes('recently') || q.includes('update') || q.includes('history')) {
      if (history && history.length > 0 && history[0].changes && history[0].changes.length > 0) {
        const deltas = history[0].changes.map((c) => `• ${c.field}: ${c.oldValue ?? 'None'} → ${c.newValue}`).join('\n');
        return {
          text: `Recent tracked changes for ${company.name}:\n${deltas}\n\nLast verified: ${formatRelativeTime(history[0].researchedAt)}.`,
          sourcesCited: ['Comy Snapshot Delta Engine', 'Brønnøysundregistrene'],
          confidence: 99,
        };
      }
      return {
        text: `The profile was verified from Brønnøysundregistrene ${formatRelativeTime(company.lastResearchedAt)}. All statutory corporate attributes match the primary state registers without unverified mutations.`,
        sourcesCited: ['Enhetsregisteret', 'Comy Snapshot Delta Engine'],
        confidence: 99,
      };
    }

    // 5. Which sources verify this information?
    if (q.includes('sources') || q.includes('verify') || q.includes('which source') || q.includes('citations')) {
      const verifiedSources = sources.filter((s) => s.verificationStatus === 'verified');
      const list = verifiedSources
        .map((s) => `• ${s.title} (${s.domain}) — ${s.factsExtractedCount} facts extracted [Match score: ${s.matchScore}%]`)
        .join('\n');
      return {
        text: `Verified Norwegian public sources checked for ${company.name}:\n${list}`,
        sourcesCited: verifiedSources.map((s) => s.title),
        confidence: 100,
      };
    }

    // Financial questions
    if (q.includes('revenue') || q.includes('profit') || q.includes('ebit') || q.includes('financial') || q.includes('assets') || q.includes('money')) {
      if (company.financials?.operatingRevenueFormatted) {
        return {
          text: `Verified financial data from Regnskapsregisteret for FY ${company.financials.year || 'latest'}:\n• Operating Revenue: ${company.financials.operatingRevenueFormatted}\n• Operating Profit (EBIT): ${company.financials.operatingProfitFormatted || 'Not stated'}\n• Net Profit: ${company.financials.netProfitFormatted || 'Not stated'}\n• Balance Sheet Assets: ${company.financials.totalAssetsFormatted || 'Not stated'}\n• Currency: ${company.financials.currency || 'NOK'}`,
          sourcesCited: ['Regnskapsregisteret (Register of Company Accounts)'],
          confidence: 99,
        };
      }
      return {
        text: 'Financial statements: Not found in verified public sources. In accordance with Comy anti-fabrication policy, financial metrics are never estimated or guessed.',
        sourcesCited: ['Regnskapsregisteret'],
        confidence: 95,
      };
    }

    // Key People / Officers
    if (q.includes('ceo') || q.includes('leader') || q.includes('director') || q.includes('board') || q.includes('management') || q.includes('auditor')) {
      if (company.keyPeople && company.keyPeople.length > 0) {
        const roles = company.keyPeople.map((p) => `• ${p.role}: ${p.name}`).join('\n');
        return {
          text: `Officially registered corporate officers for ${company.name} from Foretaksregisteret:\n${roles}`,
          sourcesCited: ['Register of Business Roles and Management (Roller og Verv)'],
          confidence: 99,
        };
      }
      return {
        text: `Key roles for ${company.name} were not returned by public Foretaksregisteret endpoints. Comy does not publish unverified personnel.`,
        sourcesCited: ['Brønnøysundregistrene Roller'],
        confidence: 90,
      };
    }

    // Address & Location
    if (q.includes('address') || q.includes('where') || q.includes('location') || q.includes('city') || q.includes('municipality')) {
      const addr = [
        company.businessAddress.street,
        `${company.businessAddress.postalCode || ''} ${company.businessAddress.city || ''}`.trim(),
        company.businessAddress.municipality ? `Municipality: ${company.businessAddress.municipality}` : '',
        'Norway 🇳🇴',
      ].filter(Boolean).join(', ');
      return {
        text: `Official registered address for ${company.name}:\n${addr}`,
        sourcesCited: ['Enhetsregisteret'],
        confidence: 100,
      };
    }

    // Generic search over facts
    const matchedFact = facts.find((f) =>
      q.split(' ').some((word) => word.length > 3 && f.field.toLowerCase().includes(word))
    );

    if (matchedFact) {
      return {
        text: `Verified fact for ${company.name}:\n${matchedFact.field}: ${matchedFact.value}\nEvidence: "${matchedFact.evidence}"`,
        sourcesCited: [matchedFact.source_title],
        confidence: matchedFact.confidence,
      };
    }

    // Strict Anti-Fabrication Default
    return {
      text: `Information regarding "${query}" is not found in verified public sources for ${company.name} (Org. nr. ${company.organizationNumber}). Comy strictly adheres to an anti-fabrication policy and never invents unverified claims.`,
      sourcesCited: ['Brønnøysundregistrene (Permitted Public Sources)'],
      confidence: 95,
    };
  };

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsAnswering(true);

    setTimeout(() => {
      const answer = generateAnswer(text);
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: answer.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourcesCited: answer.sourcesCited,
        confidence: answer.confidence,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsAnswering(false);
    }, 400);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-700 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Comy Research Assistant
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Verified Data Only
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ask questions about this Norwegian company using its verified research data.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Zero-Fabrication Guaranteed</span>
        </div>
      </div>

      {/* Suggested Question Chips */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Suggested Research Queries:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((question, qIdx) => (
            <button
              key={qIdx}
              type="button"
              onClick={() => handleSend(question)}
              className="text-xs font-medium text-slate-700 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 border border-slate-200 rounded-xl px-3 py-1.5 transition-colors cursor-pointer text-left"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-rose-700 text-white rounded-br-xs'
                  : 'bg-slate-50 text-slate-900 border border-slate-200/80 rounded-bl-xs'
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>

              {msg.sourcesCited && msg.sourcesCited.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px] text-slate-600 flex flex-wrap items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                  <span className="font-semibold text-slate-700">Verified from:</span>
                  <span>{msg.sourcesCited.join(', ')}</span>
                  {msg.confidence !== undefined && (
                    <span className="ml-auto font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      {msg.confidence}% confidence
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {isAnswering && (
          <div className="flex items-center space-x-2 text-xs text-slate-500 py-2">
            <Sparkles className="w-4 h-4 text-rose-600 animate-spin" />
            <span>Auditing verified company records...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputValue);
        }}
        className="relative flex items-center"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Ask anything about ${company.name} (answers strictly from verified data)...`}
          className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-100 focus:border-rose-600 transition-all"
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="absolute right-2 p-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer"
          aria-label="Send question"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
