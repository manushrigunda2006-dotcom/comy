'use client';

import React from 'react';
import { TrendingUp, FileText, AlertCircle, ShieldCheck, ExternalLink } from 'lucide-react';
import { FinancialStatement } from '@/lib/types';
import { formatFullDate } from '@/lib/freshness';

interface FinancialSectionProps {
  financials?: FinancialStatement | null;
}

export const FinancialSection: React.FC<FinancialSectionProps> = ({ financials }) => {
  const hasData =
    financials &&
    (financials.operatingRevenueFormatted ||
      financials.operatingProfitFormatted ||
      financials.netProfitFormatted ||
      financials.totalAssetsFormatted);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Financial Information</h3>
            <p className="text-xs text-slate-500">
              Audited statutory filings from the Norwegian Accounting Register (Regnskapsregisteret)
            </p>
          </div>
        </div>

        {hasData && (
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Audited FY {financials.year}</span>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h4 className="text-sm font-semibold text-slate-800">
              Not publicly available from the permitted sources.
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              In accordance with anti-fabrication policy, financial metrics are never estimated,
              guessed, or synthesized. If unavailable from official statutory annual reports, Comy strictly reports: &ldquo;Not publicly available from the permitted sources.&rdquo;
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {/* Key Financial Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Revenue */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Operating Revenue
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {financials.operatingRevenueFormatted || 'N/A'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">FY {financials.year}</div>
            </div>

            {/* Operating Profit (EBIT) */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Operating Profit (EBIT)
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {financials.operatingProfitFormatted || 'N/A'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">FY {financials.year}</div>
            </div>

            {/* Net Annual Result */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Net Annual Profit
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {financials.netProfitFormatted || 'N/A'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">FY {financials.year}</div>
            </div>

            {/* Total Balance Sheet Assets */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Total Assets
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {financials.totalAssetsFormatted || 'N/A'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">FY {financials.year}</div>
            </div>
          </div>

          {/* Evidence box */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-blue-900">
              <span>Source Provenance: {financials.sourceTitle}</span>
              <a
                href={financials.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-blue-700 hover:underline"
              >
                <span>View Filing</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="font-mono text-[11px] text-slate-600">
              &ldquo;{financials.evidence}&rdquo;
            </p>
            <div className="text-[11px] text-slate-500 pt-0.5">
              Checked on: {formatFullDate(financials.retrievedAt)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
