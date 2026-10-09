import React from 'react';
import Link from 'next/link';
import { Database, ShieldCheck, Globe, FileText, CheckCircle2, AlertTriangle, ExternalLink, Building2, BookOpen } from 'lucide-react';

interface SourceCategory {
  categoryTitle: string;
  categoryDescription: string;
  country: string;
  sources: {
    name: string;
    authority: string;
    url: string;
    description: string;
    license: string;
    confidence: string;
    context: string;
  }[];
}

const SOURCE_CATEGORIES: SourceCategory[] = [
  {
    categoryTitle: 'Norwegian Official Sources',
    categoryDescription: 'Statutory government registries operated by the Norwegian State under the Ministry of Trade, Industry and Fisheries.',
    country: 'Norway 🇳🇴',
    sources: [
      {
        name: 'Enhetsregisteret (Central Coordinating Register for Legal Entities)',
        authority: 'Brønnøysundregistrene',
        url: 'https://data.brreg.no/enhetsregisteret/api/enheter',
        description:
          'Authoritative statutory register for all Norwegian enterprises, foretak, and organizations. Provides legal company names, 9-digit Mod11 organization numbers, registered business status, founding dates, postal and headquarters addresses, organizational forms (AS, ASA, ENK, ANS), and statutory NACE industry codes.',
        license: 'Norwegian Licence for Open Government Data (NLOD) & CC BY 4.0',
        confidence: '100% (Statutory Legal Source)',
        context: 'National Primary Register',
      },
      {
        name: 'Register of Business Roles and Management (Roller og Verv)',
        authority: 'Brønnøysundregistrene (Foretaksregisteret)',
        url: 'https://data.brreg.no/enhetsregisteret/api/enheter',
        description:
          'Statutory filings recording legally registered company leadership: Daglig leder (General Manager/CEO), Styrets leder (Chair of the Board), board members, deputy members, and registered authorized auditors.',
        license: 'Public Corporate Register',
        confidence: '99% (Legally Binding Filings)',
        context: 'Corporate Governance',
      },
      {
        name: 'NAV Employer and Employee Register (Aa-registeret)',
        authority: 'Norwegian Labour and Welfare Administration (NAV)',
        url: 'https://www.nav.no',
        description:
          'Statutory workforce registry recording active employment relationships across Norway. Directly cross-referenced by Enhetsregisteret to establish verified employee counts.',
        license: 'State Administrative Open Statistics',
        confidence: '98% (Statutory Workforce Data)',
        context: 'Workforce & Labor',
      },
    ],
  },
  {
    categoryTitle: 'Company Website',
    categoryDescription: 'Official corporate domains registered in the primary statutory register.',
    country: 'Norway 🇳🇴 / Corporate Domain',
    sources: [
      {
        name: 'Official Corporate Domain (Registered Hjemmeside)',
        authority: 'Corporate Entity Registrant',
        url: 'Verified via Enhetsregisteret hjemmeside property',
        description:
          'The primary web domain explicitly registered in Enhetsregisteret filings. Crawled with strict robots.txt compliance to verify corporate activity descriptions, registered contacts, and commercial overview.',
        license: 'Public Domain / Fair Use',
        confidence: '85-95% (Subject to 4-Signal Identity Match Scoring)',
        context: 'Corporate Web Presence',
      },
    ],
  },
  {
    categoryTitle: 'Annual Reports',
    categoryDescription: 'Audited statutory annual financial statements and accounting filings.',
    country: 'Norway 🇳🇴',
    sources: [
      {
        name: 'Regnskapsregisteret (Register of Company Accounts)',
        authority: 'Brønnøysundregistrene',
        url: 'https://data.brreg.no/regnskapsregisteret/regnskap',
        description:
          'Official electronic repository for submitted annual accounts, balance sheets, income statements, and auditor reports mandated under the Norwegian Accounting Act (Regnskapsloven). Provides audited operating revenues (salgsinntekter), operating profit (EBIT), net results, balance sheet assets, and total equity.',
        license: 'Open Public Financial Data (Brønnøysundregistrene)',
        confidence: '99% (Audited Statutory Filings)',
        context: 'Statutory Financial Filings',
      },
    ],
  },
  {
    categoryTitle: 'Public Business Sources',
    categoryDescription: 'Official electronic public notices, gazettes, and legal business announcements.',
    country: 'Norway 🇳🇴',
    sources: [
      {
        name: 'Kunngjøringer (Official Public Announcements)',
        authority: 'Brønnøysundregistrene / Norsk Lysingsblad',
        url: 'https://w2.brreg.no/kunngjoring/',
        description:
          'Statutory public bulletins for Norwegian companies: legal incorporations, registered capital changes, statutory mergers, dissolutions, board amendments, and creditor notices.',
        license: 'Norwegian Public Legal Notices',
        confidence: '99% (Statutory Legal Bulletins)',
        context: 'Official Gazettes',
      },
    ],
  },
  {
    categoryTitle: 'Other Permitted Public Sources',
    categoryDescription: 'Permitted open data registries and statutory public classification systems.',
    country: 'Norway 🇳🇴 / Nordic Registry Data',
    sources: [
      {
        name: 'Statistics Norway (SSB) Classification Standards (SN2007)',
        authority: 'Statistisk sentralbyrå (SSB)',
        url: 'https://www.ssb.no/klass/klassifikasjoner/6',
        description:
          'Norwegian standard industrial classification (Standard for næringsgruppering) corresponding to EU NACE Rev. 2. Used to verify commercial activities and sector categories for all registered entities.',
        license: 'CC BY 4.0 Open Data',
        confidence: '100% (Classification Taxonomy)',
        context: 'Sector Classification',
      },
    ],
  },
];

export default function SourcesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="border-b border-slate-200 pb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold mb-3 border border-rose-200">
          <span>🇳🇴</span>
          <span>Permitted Norwegian Public Sources Strategy</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Permitted Public Sources Directory
        </h1>
        <p className="text-base text-slate-600 mt-2 max-w-2xl leading-relaxed">
          Comy prioritizes permitted public sources relevant to Norwegian companies.
          We strictly reject unverified websites, bypass paywalls, or invent fallback estimates.
        </p>
      </div>

      {/* Compliance Policy Banner */}
      <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-6 sm:p-7 space-y-3">
        <h2 className="text-base font-bold text-rose-900 flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-rose-700" />
          <span>Strict Access & Compliance Policy for Norwegian Data</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
          In full accordance with competition rules and Norwegian law, Comy relies only on open statutory registers,
          authorized APIs, and permitted public portals under NLOD and CC BY 4.0 licenses. Every retrieved fact retains its exact source URL,
          publication date, and verification timestamp.
        </p>
      </div>

      {/* Categorized Sources Hierarchy */}
      <div className="space-y-10">
        {SOURCE_CATEGORIES.map((category, catIdx) => (
          <div key={catIdx} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 text-xs font-bold flex items-center justify-center">
                  {catIdx + 1}
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  {category.categoryTitle}
                </h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {category.country}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              {category.categoryDescription}
            </p>

            <div className="space-y-4 pt-1">
              {category.sources.map((src, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {src.context}
                        </span>
                        <span className="text-xs text-slate-400">&bull;</span>
                        <span className="text-xs text-slate-500 font-medium">
                          Authority: {src.authority}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">{src.name}</h3>
                    </div>

                    <div className="shrink-0">
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        {src.confidence}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {src.description}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>License: {src.license}</span>
                    <a
                      href={src.url.startsWith('http') ? src.url : 'https://www.brreg.no'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-rose-700 hover:text-rose-900 hover:underline font-semibold"
                    >
                      <span>View Statutory Register</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
