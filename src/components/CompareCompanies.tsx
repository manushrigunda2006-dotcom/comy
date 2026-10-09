'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Building2, ArrowRight, ShieldCheck, CheckCircle2, ExternalLink, ArrowUpDown } from 'lucide-react';
import { formatOrgNumber } from '@/lib/validation';

interface ComparisonCompany {
  name: string;
  org: string;
  legalForm: string;
  industry: string;
  employees: string;
  revenue: string;
  ebit: string;
  assets: string;
  city: string;
  confidence: number;
}

const FEATURED_NORWEGIAN_COMPANIES: ComparisonCompany[] = [
  {
    name: 'EQUINOR ASA',
    org: '923609016',
    legalForm: 'Allmennaksjeselskap (ASA)',
    industry: '06.100 Extraction of crude petroleum',
    employees: '21,000+ (NAV Aa-reg)',
    revenue: 'NOK 1,145.2B',
    ebit: 'NOK 352.4B',
    assets: 'NOK 1,420.8B',
    city: 'Stavanger, Norway',
    confidence: 100,
  },
  {
    name: 'DNB BANK ASA',
    org: '984851006',
    legalForm: 'Allmennaksjeselskap (ASA)',
    industry: '64.190 Other monetary intermediation',
    employees: '11,000+ (NAV Aa-reg)',
    revenue: 'NOK 78.5B',
    ebit: 'NOK 45.2B',
    assets: 'NOK 3,250.0B',
    city: 'Oslo, Norway',
    confidence: 100,
  },
  {
    name: 'TELENOR ASA',
    org: '990888213',
    legalForm: 'Allmennaksjeselskap (ASA)',
    industry: '61.100 Wired telecommunications activities',
    employees: '16,000+ (NAV Aa-reg)',
    revenue: 'NOK 99.4B',
    ebit: 'NOK 18.6B',
    assets: 'NOK 240.5B',
    city: 'Fornebu, Norway',
    confidence: 100,
  },
  {
    name: 'NORSK HYDRO ASA',
    org: '914778271',
    legalForm: 'Allmennaksjeselskap (ASA)',
    industry: '24.420 Aluminium production',
    employees: '32,000+ (NAV Aa-reg)',
    revenue: 'NOK 195.8B',
    ebit: 'NOK 12.3B',
    assets: 'NOK 185.0B',
    city: 'Oslo, Norway',
    confidence: 100,
  },
];

export const CompareCompanies: React.FC = () => {
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>(['923609016', '984851006']);

  const toggleSelect = (org: string) => {
    if (selectedOrgs.includes(org)) {
      if (selectedOrgs.length > 1) {
        setSelectedOrgs(selectedOrgs.filter((o) => o !== org));
      }
    } else {
      if (selectedOrgs.length < 3) {
        setSelectedOrgs([...selectedOrgs, org]);
      } else {
        setSelectedOrgs([selectedOrgs[1], org]);
      }
    }
  };

  const selectedCompanies = FEATURED_NORWEGIAN_COMPANIES.filter((c) =>
    selectedOrgs.includes(c.org)
  );

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold mb-1.5 border border-rose-200">
            <span>🇳🇴</span>
            <span>Comparative Analysis</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Compare Norwegian Companies
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Compare verified information across Norwegian companies.
          </p>
        </div>

        {/* Company selector chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-400 mr-1">Select to compare:</span>
          {FEATURED_NORWEGIAN_COMPANIES.map((comp) => {
            const isSelected = selectedOrgs.includes(comp.org);
            return (
              <button
                key={comp.org}
                type="button"
                onClick={() => toggleSelect(comp.org)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-rose-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {comp.name.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider w-1/4">
                Verified Metric
              </th>
              {selectedCompanies.map((comp) => (
                <th key={comp.org} className="py-3 px-4 font-black text-slate-900 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div>{comp.name}</div>
                      <div className="font-mono text-xs text-slate-400 font-normal">
                        Org. nr. {formatOrgNumber(comp.org)}
                      </div>
                    </div>
                    <Link
                      href={`/company/${comp.org}`}
                      className="text-xs font-semibold text-rose-700 hover:text-rose-900 inline-flex items-center ml-2"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-3 px-4 font-semibold text-slate-500">Legal Form</td>
              {selectedCompanies.map((c) => (
                <td key={c.org} className="py-3 px-4 font-medium text-slate-800">
                  {c.legalForm}
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50/50">
              <td className="py-3 px-4 font-semibold text-slate-500">NACE Industry</td>
              {selectedCompanies.map((c) => (
                <td key={c.org} className="py-3 px-4 text-slate-700">
                  {c.industry}
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3 px-4 font-semibold text-slate-500">Reported Workforce</td>
              {selectedCompanies.map((c) => (
                <td key={c.org} className="py-3 px-4 font-bold text-slate-900">
                  {c.employees}
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50/50">
              <td className="py-3 px-4 font-semibold text-slate-500">Annual Revenue (Audited)</td>
              {selectedCompanies.map((c) => (
                <td key={c.org} className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                  {c.revenue}
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3 px-4 font-semibold text-slate-500">Operating Profit (EBIT)</td>
              {selectedCompanies.map((c) => (
                <td key={c.org} className="py-3 px-4 font-mono font-medium text-slate-800">
                  {c.ebit}
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50/50">
              <td className="py-3 px-4 font-semibold text-slate-500">Balance Sheet Assets</td>
              {selectedCompanies.map((c) => (
                <td key={c.org} className="py-3 px-4 font-mono text-slate-800">
                  {c.assets}
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3 px-4 font-semibold text-slate-500">Headquarters</td>
              {selectedCompanies.map((c) => (
                <td key={c.org} className="py-3 px-4 text-slate-800">
                  {c.city}
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50/50">
              <td className="py-3 px-4 font-semibold text-slate-500">Data Confidence</td>
              {selectedCompanies.map((c) => (
                <td key={c.org} className="py-3 px-4">
                  <span className="inline-flex items-center space-x-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{c.confidence}% Verified</span>
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
