'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { validateNorwegianOrgNumber, formatOrgNumber } from '@/lib/validation';

const SAMPLE_COMPANIES = [
  { name: 'Equinor ASA', org: '923609016', tag: 'Energy' },
  { name: 'DNB Bank ASA', org: '984851006', tag: 'Banking' },
  { name: 'Telenor ASA', org: '990888213', tag: 'Telecom' },
  { name: 'Norsk Hydro ASA', org: '914778271', tag: 'Industry' },
  { name: 'Schibsted ASA', org: '933649768', tag: 'Media' },
  { name: 'Yara International ASA', org: '986228608', tag: 'Chemicals' },
];

interface SearchBoxProps {
  initialValue?: string;
  onSearchStart?: (orgNumber: string) => void;
  autoFocus?: boolean;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  initialValue = '',
  onSearchStart,
  autoFocus = false,
}) => {
  const router = useRouter();
  const [input, setInput] = useState(initialValue);
  const [touched, setTouched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('norway_company_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const clean = input.replace(/\s+/g, '').replace(/[-._]/g, '');
  const validation = touched && clean.length > 0 ? validateNorwegianOrgNumber(clean) : null;

  const handleSearch = (org: string) => {
    const val = validateNorwegianOrgNumber(org);
    if (!val.valid) {
      setTouched(true);
      return;
    }

    try {
      const updated = [val.cleanNumber, ...recentSearches.filter((s) => s !== val.cleanNumber)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('norway_company_recent_searches', JSON.stringify(updated));
    } catch {}

    if (onSearchStart) {
      onSearchStart(val.cleanNumber);
    } else {
      router.push(`/company/${val.cleanNumber}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    handleSearch(input);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 text-left">
          Organization Number
        </label>
        <div className="relative flex items-center shadow-lg rounded-2xl bg-white border-2 border-slate-200 focus-within:border-rose-600 focus-within:ring-4 focus-within:ring-rose-100 transition-all overflow-hidden p-1.5 sm:p-2">
          <div className="pl-3 sm:pl-4 text-slate-400 flex items-center gap-1.5">
            <span className="text-base select-none">🇳🇴</span>
            <Search className="w-5 h-5 text-slate-400" />
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setTouched(true);
            }}
            placeholder="Enter Norwegian organization number (e.g. 912345678)"
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-slate-900 placeholder-slate-400 bg-transparent text-sm sm:text-base font-medium focus:outline-hidden"
            autoFocus={autoFocus}
            maxLength={13}
            aria-label="Norwegian Organization Number"
          />

          <button
            type="submit"
            className="flex items-center space-x-1.5 px-4 sm:px-6 py-2.5 sm:py-3 bg-rose-700 hover:bg-rose-800 text-white font-semibold text-sm sm:text-base rounded-xl transition-colors shadow-sm shrink-0 cursor-pointer"
          >
            <span>Research Company</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Validation Feedback */}
        {validation && !validation.valid && (
          <div className="flex items-center space-x-1.5 mt-2 px-3 text-xs text-rose-600 font-medium text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validation.error}</span>
          </div>
        )}

        {validation && validation.valid && (
          <div className="flex items-center space-x-1.5 mt-2 px-3 text-xs text-emerald-600 font-medium text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Valid Norwegian Organization Number ({validation.formattedNumber}) &bull; Ready to research</span>
          </div>
        )}
      </form>

      {/* Feature checklist */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4 text-xs text-slate-600">
        <div className="flex items-center space-x-1.5">
          <span className="text-emerald-600 font-bold">✓</span>
          <span>Norwegian company verification</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-emerald-600 font-bold">✓</span>
          <span>Public-source research</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-emerald-600 font-bold">✓</span>
          <span>Evidence-backed facts</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-emerald-600 font-bold">✓</span>
          <span>Source and date tracking</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-emerald-600 font-bold">✓</span>
          <span>Company identity protection</span>
        </div>
      </div>

      {/* Example Companies */}
      <div className="mt-6 pt-5 border-t border-slate-200/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Try an example company
          </span>
          <span className="text-[11px] text-slate-400">Live verified data</span>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {SAMPLE_COMPANIES.map((comp) => (
            <button
              key={comp.org}
              type="button"
              onClick={() => {
                setInput(comp.org);
                setTouched(true);
                handleSearch(comp.org);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:text-rose-800 transition-all cursor-pointer shadow-2xs"
            >
              <span className="font-semibold">{comp.name}</span>
              <span className="text-slate-400 text-[10px]">({comp.org})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Searches / Search History */}
      {recentSearches.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-200/40 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recent Searches
            </span>
            <button
              type="button"
              onClick={() => {
                setRecentSearches([]);
                localStorage.removeItem('norway_company_recent_searches');
              }}
              className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors"
            >
              Clear History
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((org) => (
              <button
                key={org}
                type="button"
                onClick={() => {
                  setInput(org);
                  setTouched(true);
                  handleSearch(org);
                }}
                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-xs font-mono text-slate-700 cursor-pointer shadow-2xs"
              >
                <span>{org}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
