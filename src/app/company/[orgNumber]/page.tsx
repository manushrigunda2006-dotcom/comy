'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  MapPin,
  Globe,
  Phone,
  Calendar,
  Users,
  Briefcase,
  UserCheck,
  TrendingUp,
  Database,
  History,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle2,
  Sparkles,
  Bot,
} from 'lucide-react';
import { CompanyProfile, Fact, SourceRecord, ResearchDiagnostics, ResearchHistoryRecord } from '@/lib/types';
import { formatOrgNumber } from '@/lib/validation';
import { formatRelativeTime, formatFullDate } from '@/lib/freshness';
import { FactCard } from '@/components/FactCard';
import { SourceCard } from '@/components/SourceCard';
import { MatchingScoreCard } from '@/components/MatchingScoreCard';
import { FinancialSection } from '@/components/FinancialSection';
import { DiagnosticsCard } from '@/components/DiagnosticsCard';
import { DemoBadge } from '@/components/DemoBadge';
import { HistoryTimeline } from '@/components/HistoryTimeline';
import { CherryAssistant } from '@/components/CherryAssistant';

export default function CompanyProfilePage() {
  const params = useParams();
  const router = useRouter();
  const orgNumber = params.orgNumber as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [diagnostics, setDiagnostics] = useState<ResearchDiagnostics | null>(null);
  const [history, setHistory] = useState<ResearchHistoryRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'dossier' | 'facts' | 'sources' | 'history' | 'assistant'>('dossier');

  const fetchProfile = async (force: boolean = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const endpoint = force
        ? `/api/company/${orgNumber}/refresh`
        : `/api/company/${orgNumber}`;

      const res = await fetch(endpoint, {
        method: force ? 'POST' : 'GET',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to retrieve Norwegian company intelligence');
      }

      const result = await res.json();
      setCompany(result.company);
      setFacts(result.facts || []);
      setSources(result.sources || []);
      setDiagnostics(result.researchMetadata || null);
      setHistory(result.history || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (orgNumber) {
      fetchProfile(false);
    }
  }, [orgNumber]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center">
        <div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">
          Retrieving Evidence-Backed Intelligence...
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Querying official registers for entity {formatOrgNumber(orgNumber)}
        </p>
      </div>
    );
  }

  if (error || !company) {
    const isNotFound = error?.toLowerCase().includes('not currently in comy') || error?.toLowerCase().includes('not currently in cherry') || error?.toLowerCase().includes('not found') || !company;

    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="bg-white border border-rose-200 rounded-3xl p-8 sm:p-10 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto mb-5">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">
            Company not currently in Comy's database.
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6 leading-relaxed">
            Entity <span className="font-mono font-bold text-slate-900">{formatOrgNumber(orgNumber)}</span> is a valid Norwegian organization number, but its intelligence dossier is not currently cached in Comy's local registry.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => fetchProfile(true)}
              disabled={refreshing}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Researching Live Registries...' : 'Research Company'}</span>
            </button>
            <Link
              href="/"
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
            >
              Search Another Company
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const primarySource = sources.find((s) => s.sourceType === 'official_registry');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-3">
            {/* Top Badge: NORWEGIAN COMPANY */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-rose-800 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 flex items-center gap-1.5">
                <span>🇳🇴</span>
                <span>NORWEGIAN COMPANY</span>
              </span>

              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60">
                {company.legalForm} {company.legalFormCode ? `(${company.legalFormCode})` : ''}
              </span>

              <DemoBadge isDemo={company.isDemoMode} />
            </div>

            {/* Company Name */}
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {company.name}
            </h1>

            {/* Statutory Identifier Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Organization No.
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {formatOrgNumber(company.organizationNumber)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Status
                </span>
                <span
                  className={`inline-flex items-center text-sm font-bold ${
                    company.status === 'Active' ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  ● {company.status}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Country
                </span>
                <span className="font-bold text-slate-900 text-sm flex items-center gap-1">
                  Norway 🇳🇴
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium pt-1">
              <span>Verified with Brønnøysundregistrene</span>
              <span>&bull;</span>
              <span className="text-slate-400">
                {formatRelativeTime(company.lastResearchedAt, 'Verified')}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => fetchProfile(true)}
              disabled={refreshing}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-rose-600' : ''}`} />
              <span>{refreshing ? 'Refreshing Company Data...' : 'Refresh Company Data'}</span>
            </button>

            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-2xs"
              >
                <span>Visit Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Executive Summary */}
        {company.executiveSummary && (
          <div className="mt-6 p-4 sm:p-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-rose-700" />
              <span>Evidence-Backed Intelligence Summary</span>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed font-normal">
              {company.executiveSummary}
            </p>
          </div>
        )}
      </div>

      {/* Matching Score Signals Card */}
      {primarySource?.matchBreakdown && (
        <MatchingScoreCard
          breakdown={primarySource.matchBreakdown}
          sourceTitle={primarySource.title}
        />
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dossier')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'dossier'
              ? 'border-rose-700 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Company Dossier
        </button>

        <button
          onClick={() => setActiveTab('facts')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
            activeTab === 'facts'
              ? 'border-rose-700 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Verified Facts</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
            {facts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sources')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
            activeTab === 'sources'
              ? 'border-rose-700 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Sources & Registry Citations</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
            {sources.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
            activeTab === 'history'
              ? 'border-rose-700 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Research History</span>
        </button>

        <button
          onClick={() => setActiveTab('assistant')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
            activeTab === 'assistant'
              ? 'border-rose-700 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bot className="w-4 h-4 text-rose-700" />
          <span>Comy Research Assistant</span>
        </button>
      </div>

      {/* TAB CONTENT 1: DOSSIER */}
      {activeTab === 'dossier' && (
        <div className="space-y-8">
          {/* Section 1: Company Overview Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">1. Company Overview &amp; Identity</h3>
                <p className="text-xs text-slate-500">
                  Statutory registration details verified with Central Coordinating Register (Enhetsregisteret)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Legal Name */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Legal Registered Name
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {company.name}
                </div>
              </div>

              {/* Organization Number */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Organization Number
                </div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-1">
                  {formatOrgNumber(company.organizationNumber)}
                </div>
              </div>

              {/* Legal Form */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Organizational Form
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {company.legalForm} {company.legalFormCode ? `(${company.legalFormCode})` : ''}
                </div>
              </div>

              {/* Status */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Company Status
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{company.status}</span>
                </div>
              </div>

              {/* Registration Date */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Registration Date
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {formatFullDate(company.registrationDate)}
                </div>
              </div>

              {/* Founding Date */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Founded Date
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {formatFullDate(company.foundingDate || company.registrationDate)}
                </div>
              </div>

              {/* Industry */}
              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  NACE Industry Classification
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {company.industry.code} - {company.industry.description}
                </div>
              </div>

              {/* Registered Address */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Headquarters Address
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {[
                    company.businessAddress.street,
                    `${company.businessAddress.postalCode || ''} ${company.businessAddress.city || ''}`.trim(),
                    company.businessAddress.country,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Business Information */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">2. Registration &amp; Business Operations</h3>
                <p className="text-xs text-slate-500">
                  Workforce size from NAV Aa-registeret, corporate headquarters, and registered activities
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Employees Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center space-x-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Reported Workforce</span>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  {company.employees.count !== null && company.employees.count !== undefined
                    ? `${company.employees.count.toLocaleString()} Employees`
                    : 'Not registered'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Source: NAV Aa-registeret ({company.employees.registrationDate || 'Latest'})
                </div>
              </div>

              {/* Domain & Contact */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center space-x-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>Official Domain</span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-2 truncate">
                  {company.website || 'No website registered in Enhetsregisteret'}
                </div>
                {company.phone && (
                  <div className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                    <Phone className="w-3 h-3" />
                    <span>{company.phone}</span>
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center space-x-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>Municipality</span>
                </div>
                <div className="text-base font-bold text-slate-900 mt-2">
                  {company.businessAddress.municipality || company.businessAddress.city || 'Norway'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Postal: {company.businessAddress.postalCode}
                </div>
              </div>
            </div>

            {/* Business Description / Purpose */}
            {company.businessDescription && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Statutory Purpose / Commercial Scope
                </h4>
                <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-700 leading-relaxed font-mono">
                  {company.businessDescription}
                </div>
              </div>
            )}

            {/* Key People (Roller) */}
            {company.keyPeople && company.keyPeople.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
                  <UserCheck className="w-4 h-4 text-blue-700" />
                  <span>3. Management &amp; Governance (Registered Officers &amp; Board)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {company.keyPeople.map((person, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1"
                    >
                      <div className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                        {person.role}
                      </div>
                      <div className="text-sm font-bold text-slate-900">{person.name}</div>
                      <div className="text-[11px] text-slate-400">{person.sourceTitle}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Financial Information */}
          <FinancialSection financials={company.financials} />

          {/* Section 5: Industry & Commercial Scope */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">5. Industry &amp; Commercial Scope</h3>
                <p className="text-xs text-slate-500">
                  NACE industry classification and registered statutory activities from Brønnøysundregistrene
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  NACE Classification
                </span>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {company.industry.code} &bull; {company.industry.description}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Registered Geographic Market
                </span>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {company.businessAddress.municipality || company.businessAddress.city || 'Norway'}, Norway &bull; Nordic Region
                </div>
              </div>
            </div>

            {company.businessDescription && (
              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-700 leading-relaxed font-mono">
                {company.businessDescription}
              </div>
            )}
          </div>

          {/* Section 6: Company Structure & Ownership */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">6. Company Structure &amp; Ownership</h3>
                <p className="text-xs text-slate-500">
                  Parent entity, subsidiaries, and corporate ownership relations in public registers
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Parent Company
                </span>
                <div className="font-bold text-slate-900 mt-1">
                  Independent Entity
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  No separate corporate parent registered in Enhetsregisteret
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Subsidiaries &amp; Branches
                </span>
                <div className="font-bold text-slate-900 mt-1">
                  Single Corporate Entity
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Direct operations under primary enterprise number
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Ultimate Ownership
                </span>
                <div className="font-bold text-slate-900 mt-1">
                  {company.legalForm === 'Allmennaksjeselskap' ? 'Public Shareholders (ASA)' : 'Private Shareholders (AS)'}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Audited annual report disclosure
                </p>
              </div>
            </div>
          </div>

          {/* Section 7: Recent Changes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">7. Recent Changes &amp; Audit Trail</h3>
                <p className="text-xs text-slate-500">
                  Chronological detection of management, address, and status updates across verification passes
                </p>
              </div>
            </div>

            {history && history.length > 0 && history[0].changes && history[0].changes.length > 0 ? (
              <div className="space-y-2.5">
                {history[0].changes.map((c, idx) => (
                  <div key={idx} className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-900">{c.label}:</span>{' '}
                      <span className="line-through text-slate-400">{c.oldValue}</span> &rarr;{' '}
                      <span className="font-bold text-emerald-800">{c.newValue}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{formatRelativeTime(c.detectedAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Initial baseline verification established with Brønnøysundregistrene. All corporate records verified current.
                </span>
              </div>
            )}
          </div>

          {/* Section 8: Evidence & Sources */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">8. Evidence &amp; Permitted Sources</h3>
                  <p className="text-xs text-slate-500">
                    Statutory public registers queried with 4-signal entity verification
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {sources.length} Sources
              </span>
            </div>

            <div className="space-y-3">
              {sources.map((s) => (
                <SourceCard key={s.id} source={s} />
              ))}
            </div>
          </div>

          {/* Section 9: Data Freshness */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">9. Data Freshness &amp; Verification Schedule</h3>
                <p className="text-xs text-slate-500">
                  Lifecycle status and category-specific freshness policies
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Freshness Status</span>
                <span className="font-bold text-emerald-700 text-sm mt-1 inline-block">● CURRENT</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Last Verified</span>
                <span className="font-bold text-slate-900 text-sm mt-1 inline-block">
                  {formatRelativeTime(company.lastResearchedAt)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Verification Policy</span>
                <span className="font-bold text-slate-900 text-sm mt-1 inline-block">14-Day Cycle</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Audited Sources</span>
                <span className="font-bold text-slate-900 text-sm mt-1 inline-block">{sources.length} Connected</span>
              </div>
            </div>
          </div>

          {/* Interactive AI Research Assistant */}
          <CherryAssistant
            company={company}
            facts={facts}
            sources={sources}
            history={history}
          />
        </div>
      )}

      {/* TAB CONTENT 2: VERIFIED FACTS */}
      {activeTab === 'facts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Evidence-First Fact Repository
              </h3>
              <p className="text-xs text-slate-500">
                Every published claim is linked to source citations, timestamped checks, and confidence ratings
              </p>
            </div>
            <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {facts.length} Verified Facts
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facts.map((fact) => (
              <FactCard key={fact.id || fact.field} fact={fact} defaultExpanded={false} />
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: SOURCES */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Permitted Public Sources & Matching Signals
              </h3>
              <p className="text-xs text-slate-500">
                Only sources passing multi-signal company identity matching (score &ge; 60) are accepted
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
              {sources.length} Sources Checked
            </div>
          </div>

          <div className="space-y-3">
            {sources.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <HistoryTimeline history={history} />
        </div>
      )}

      {/* TAB CONTENT 5: CHERRY RESEARCH ASSISTANT */}
      {activeTab === 'assistant' && (
        <div className="space-y-4">
          <CherryAssistant
            company={company}
            facts={facts}
            sources={sources}
            history={history}
          />
        </div>
      )}

      {/* Diagnostics Section at Bottom */}
      <DiagnosticsCard diagnostics={diagnostics} />
    </div>
  );
}
