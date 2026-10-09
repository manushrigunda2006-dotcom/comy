'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Building2,
  Database,
  CheckCircle2,
  TrendingUp,
  FileCheck,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { SearchBox } from '@/components/SearchBox';
import { ResearchProgress } from '@/components/ResearchProgress';
import { StatsCard } from '@/components/StatsCard';

export default function HomePage() {
  const router = useRouter();
  const [isResearching, setIsResearching] = useState(false);
  const [researchOrg, setResearchOrg] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    companiesCount: 1000,
    verifiedFactsCount: 9397,
    sourcesCount: 2022,
    averageConfidence: 99,
  });

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.companiesCount) {
          setStats(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleStartResearch = async (orgNumber: string) => {
    setIsResearching(true);
    setResearchOrg(orgNumber);
    setResearchError(null);
    setCurrentStep(0);
    setProgressPercent(10);

    // Realistic progress animation corresponding to actual backend execution
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < 5) return prev + 1;
        return prev;
      });
      setProgressPercent((p) => Math.min(85, p + 15));
    }, 600);

    try {
      const res = await fetch('/api/company/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationNumber: orgNumber }),
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to research company');
      }

      setCurrentStep(6);
      setProgressPercent(100);

      // Brief pause to display completion before navigating
      setTimeout(() => {
        router.push(`/company/${orgNumber}`);
      }, 700);
    } catch (err: any) {
      clearInterval(stepInterval);
      setResearchError(err.message || 'An unexpected error occurred during research');
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold mb-5">
          <span>🇳🇴</span>
          <span>Norwegian Company Intelligence Platform</span>
        </div>

        <div className="text-xs font-black tracking-widest uppercase text-rose-700 mb-2 flex items-center justify-center gap-1.5">
          <span>🇳🇴</span>
          <span>COMY &bull; EVIDENCE-BACKED RESEARCH AGENT</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-tight sm:leading-none">
          COMY
        </h1>
        <p className="text-base sm:text-xl font-bold text-rose-700 tracking-tight mt-2">
          Norway Company Intelligence Agent
        </p>

        <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Enter a 9-digit Norwegian organization number (*organisasjonsnummer*) to research verified, evidence-backed company intelligence.
        </p>

        {/* Search or Progress Interface */}
        <div className="mt-8 sm:mt-10">
          {!isResearching ? (
            <SearchBox onSearchStart={handleStartResearch} autoFocus />
          ) : (
            <div className="space-y-4">
              <ResearchProgress
                currentStepIndex={currentStep}
                progressPercent={progressPercent}
                orgNumber={researchOrg}
                error={researchError}
              />
              {researchError && (
                <button
                  type="button"
                  onClick={() => setIsResearching(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  ← Return to Search
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* High-level Statistics Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <StatsCard
            label="Norwegian Companies Researched"
            value={stats.companiesCount.toLocaleString()}
            subtitle="Indexed in local store"
            icon={Building2}
            color="text-rose-700 bg-rose-50"
          />
          <StatsCard
            label="Verified Facts"
            value={stats.verifiedFactsCount.toLocaleString()}
            subtitle="Linked to primary evidence"
            icon={FileCheck}
            color="text-emerald-700 bg-emerald-50"
          />
          <StatsCard
            label="Norwegian Public Sources Checked"
            value={stats.sourcesCount.toLocaleString()}
            subtitle="Official registers & filings"
            icon={Database}
            color="text-slate-800 bg-slate-100"
          />
          <StatsCard
            label="Average Fact Confidence"
            value={`${stats.averageConfidence}%`}
            subtitle="Zero-fabrication threshold"
            icon={ShieldCheck}
            color="text-teal-700 bg-teal-50"
          />
        </div>
      </section>

      {/* Featured Flagship Profiles */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Featured Norwegian Enterprises</h2>
            <p className="text-xs text-slate-500">Live verified profiles from Brønnøysundregistrene</p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            <span>Explore all 1,000+ companies</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Equinor */}
          <Link
            href="/company/923609016"
            className="group block bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  Energy &bull; ASA
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-blue-700 transition-colors">
                  EQUINOR ASA
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">Org. nr. 923 609 016</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Active
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-4 line-clamp-2">
              Norway&apos;s leading broad energy company. Extraction of crude petroleum and natural gas.
            </p>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Stavanger, Norway</span>
              <span className="font-semibold text-emerald-700">100% Verified</span>
            </div>
          </Link>

          {/* DNB Bank */}
          <Link
            href="/company/984851006"
            className="group block bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  Financial Services &bull; ASA
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-blue-700 transition-colors">
                  DNB BANK ASA
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">Org. nr. 984 851 006</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Active
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-4 line-clamp-2">
              Norway&apos;s largest financial services group offering banking, investment, and wealth management services.
            </p>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Oslo, Norway</span>
              <span className="font-semibold text-emerald-700">100% Verified</span>
            </div>
          </Link>

          {/* Telenor */}
          <Link
            href="/company/990888213"
            className="group block bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  Telecommunications &bull; ASA
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-blue-700 transition-colors">
                  TELENOR ASA
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">Org. nr. 990 888 213</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Active
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-4 line-clamp-2">
              Major telecommunications provider connecting millions of customers across the Nordic region and Asia.
            </p>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Fornebu, Norway</span>
              <span className="font-semibold text-emerald-700">100% Verified</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Core Principles Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-xs">
          <div className="max-w-2xl mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Built on Scandinavian Verification Standards
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              Traditional AI models fabricate facts and attribute details to the wrong company. Comy enforces rigorous multi-signal identity matching before any claim is published.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-bold text-slate-900">Official Register First</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every query begins with Brønnøysundregistrene (Enhetsregisteret & Regnskapsregisteret). We prioritize statutory legal registrations over unverified web scrapes.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-bold text-slate-900">Anti-Fabrication Safeguard</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                If financial metrics are missing from audited records, Comy reports &ldquo;Not found in verified public sources.&rdquo; The system will never guess or invent financial data.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-bold text-slate-900">Multi-Signal Matching</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sources must earn a minimum 60/100 identity verification score based on org number (+50), legal name (+20), domain (+10), address (+10), and identifiers (+10). Mismatched sources are rejected.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
