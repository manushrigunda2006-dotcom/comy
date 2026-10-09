import React from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Cpu,
  Database,
  Search,
} from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="border-b border-slate-200 pb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold mb-3 border border-rose-200">
          <span>🇳🇴</span>
          <span>Norwegian Company Intelligence Methodology</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          How Comy Researches Norwegian Companies
        </h1>
        <p className="text-base text-slate-600 mt-2 max-w-2xl leading-relaxed">
          Comy is specifically designed to research Norwegian companies using statutory organization numbers and permitted public sources.
          Every research operation enforces statutory Mod11 validation, Brønnøysundregistrene identity resolution, and 5-signal identity matching.
        </p>
      </div>

      {/* 12-Step Pipeline Diagram */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-6">
        <h2 className="text-xl font-bold text-slate-900">
          The 12-Step Norwegian Company Intelligence Pipeline
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-rose-700">1. Input Ingestion</span>
            <p className="text-slate-600">Receives 9-digit Norwegian organization number string or query.</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-rose-700">2. Modulus 11 Validation</span>
            <p className="text-slate-600">Calculates statutory Mod11 checksum [3, 2, 7, 6, 5, 4, 3, 2] and rejects invalid numbers.</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-rose-700">3. Identity Resolution</span>
            <p className="text-slate-600">Queries Brønnøysundregistrene Enhetsregisteret to establish primary legal entity.</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-rose-700">4. Source Discovery</span>
            <p className="text-slate-600">Resolves accounting register, management register, official website, and reports.</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-rose-700">5. Content Retrieval</span>
            <p className="text-slate-600">Fetches live public payloads respecting robots.txt and aggressive local caching.</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-rose-700">6. Candidate Fact Extraction</span>
            <p className="text-slate-600">Extracts overview, workforce, financials, leadership, and activity data points.</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-rose-700">7. Company Identity Matching</span>
            <p className="text-slate-600">Computes internal verification score across 4 matching signals (target 60+).</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-rose-700">8. Evidence Validation</span>
            <p className="text-slate-600">Binds every claim to an exact quote, source title, URL, and verification stamp.</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-rose-700">9. Freshness Tracking</span>
            <p className="text-slate-600">Separates source publication timestamp from Comy verification time.</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-rose-700">10. Confidence Assignment</span>
            <p className="text-slate-600">Assigns calibrated confidence (95-100 Verified, 80-94 High, 60-79 Needs Verification).</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-rose-700">11. Rejection of Unsupported Claims</span>
            <p className="text-slate-600">Automatically rejects claims from sources scoring below 60 or unverified financials.</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="font-bold text-rose-700">12. Profile Generation & Persistence</span>
            <p className="text-slate-600">Validates with Zod schema, detects delta changes from previous runs, and stores to SQLite.</p>
          </div>
        </div>
      </div>

      {/* Matching Signals Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-6">
        <h2 className="text-xl font-bold text-slate-900">
          The 4 Identity Matching Signals
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Before any secondary web source is cited, it must prove its attribution to the legal entity using our scoring formula:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-2xl font-black text-rose-700">+50</div>
            <div className="text-sm font-bold text-slate-900 mt-1">Organization Number</div>
            <p className="text-xs text-slate-500 mt-1">Exact 9-digit national entity identifier matched in source.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-2xl font-black text-rose-700">+25</div>
            <div className="text-sm font-bold text-slate-900 mt-1">Legal Company Name</div>
            <p className="text-xs text-slate-500 mt-1">Normalized corporate title match (accounting for AS/ASA forms).</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-2xl font-black text-rose-700">+15</div>
            <div className="text-sm font-bold text-slate-900 mt-1">Official Domain</div>
            <p className="text-xs text-slate-500 mt-1">Registered hostname matching registry record or authority domain.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-2xl font-black text-rose-700">+10</div>
            <div className="text-sm font-bold text-slate-900 mt-1">Registered Address</div>
            <p className="text-xs text-slate-500 mt-1">Street address, postal code, or municipality verified in source.</p>
          </div>
        </div>

        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
          <span className="font-bold">Rejection Rule:</span> Any source scoring under 60 points is immediately marked as
          &ldquo;Source rejected: company identity could not be verified&rdquo; and all candidate facts from that source are dropped.
        </div>
      </div>

      {/* Financial Protection Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-emerald-700">
          <ShieldCheck className="w-5 h-5" />
          <h2 className="text-xl font-bold text-slate-900">
            Zero-Fabrication Financial Safeguard
          </h2>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Generating synthetic or guessed financial numbers is one of the most severe flaws in automated agent systems.
          In Comy:
        </p>

        <ul className="space-y-2 text-xs sm:text-sm text-slate-700 list-disc list-inside">
          <li>Financial figures must originate from statutory Regnskapsregisteret filings or audited annual reports.</li>
          <li>If an entity has not filed public accounts, the system states: <strong>&ldquo;Not found in verified public sources.&rdquo;</strong></li>
          <li>The agent will never interpolate, estimate, or hallucinate financial numbers.</li>
        </ul>
      </div>
    </div>
  );
}
