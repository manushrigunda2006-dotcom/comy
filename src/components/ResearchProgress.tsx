'use client';

import React from 'react';
import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';

import { formatOrgNumber } from '@/lib/validation';

export interface ResearchStep {
  id: number;
  label: string;
  description: string;
}

export const RESEARCH_STEPS: ResearchStep[] = [
  { id: 1, label: 'Identifying company', description: 'Validating Modulus 11 checksum & Norwegian registry eligibility' },
  { id: 2, label: 'Searching public sources', description: 'Querying Brønnøysundregistrene Enhetsregisteret' },
  { id: 3, label: 'Collecting company facts', description: 'Accessing Accounting Register (Regnskapsregisteret) & Roles' },
  { id: 4, label: 'Matching sources to company', description: 'Evaluating org number, legal name, domain & address signals' },
  { id: 5, label: 'Verifying evidence', description: 'Auditing source citations and rejecting unverified claims' },
  { id: 6, label: 'Checking information freshness', description: 'Comparing publication dates and NAV Aa-registeret updates' },
  { id: 7, label: 'Building company profile', description: 'Synthesizing evidence-backed Norwegian company dossier' },
];

interface ResearchProgressProps {
  currentStepIndex: number; // 0 to 6
  progressPercent: number; // 0 to 100
  orgNumber: string;
  companyName?: string;
  error?: string | null;
  statusMessage?: string;
}

export const ResearchProgress: React.FC<ResearchProgressProps> = ({
  currentStepIndex,
  progressPercent,
  orgNumber,
  companyName,
  error,
  statusMessage,
}) => {
  const isFailed = Boolean(error);
  const formattedOrg = formatOrgNumber(orgNumber);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-rose-50 text-rose-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-rose-200">
          <span>🇳🇴</span>
          <span>Norwegian Company Verification</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900">
          Verifying Norwegian Enterprise
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {statusMessage || 'Executing statutory public-source intelligence verification...'}
        </p>
      </div>

      {/* Norwegian Identity Card */}
      <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Organization Number
          </span>
          <span className="font-mono font-bold text-slate-900 text-sm">{formattedOrg}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Company Name
          </span>
          <span className="font-semibold text-slate-900 truncate block">
            {companyName || (currentStepIndex > 1 ? 'Resolving name...' : 'Enhetsregisteret Lookup')}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Registered Status
          </span>
          <span className="font-semibold text-emerald-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{isFailed ? 'Verification Failed' : 'Active Registry'}</span>
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Business Identity
          </span>
          <span className="font-semibold text-slate-800 flex items-center gap-1">
            <span>Norway 🇳🇴</span>
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-8 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
            error ? 'bg-rose-500' : 'bg-rose-700'
          }`}
          style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
        />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-left">
            <div className="font-bold text-rose-900">Norwegian Verification Halted</div>
            <div className="mt-0.5 text-xs text-rose-800 leading-relaxed">{error}</div>
            <div className="mt-2 text-[11px] text-slate-600">
              Comy requires confirmed Norwegian company identity from permitted public registers before publishing any company facts.
            </div>
          </div>
        </div>
      )}

      {/* Step List */}
      <div className="space-y-3.5">
        {RESEARCH_STEPS.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex && !error;
          const isPending = idx > currentStepIndex;

          return (
            <div
              key={step.id}
              className={`flex items-start space-x-3.5 p-2.5 rounded-xl transition-colors ${
                isCurrent ? 'bg-blue-50/80 border border-blue-200/80' : ''
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      isDone
                        ? 'text-slate-900'
                        : isCurrent
                        ? 'text-blue-900 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.id}. {step.label}
                  </span>
                  {isDone && (
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Completed
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[11px] font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full animate-pulse">
                      In progress
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs mt-0.5 ${
                    isDone || isCurrent ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
