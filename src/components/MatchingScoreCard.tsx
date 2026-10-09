'use client';

import React from 'react';
import { ShieldCheck, Check, AlertTriangle, X } from 'lucide-react';
import { MatchBreakdown } from '@/lib/types';

interface MatchingScoreCardProps {
  breakdown?: MatchBreakdown;
  sourceTitle: string;
}

export const MatchingScoreCard: React.FC<MatchingScoreCardProps> = ({ breakdown, sourceTitle }) => {
  if (!breakdown) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-blue-700" />
          <h4 className="text-sm font-bold text-slate-900">
            Company Identity Verification Signals
          </h4>
        </div>
        <div className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
          Verification Score: {breakdown.totalScore}/100
        </div>
      </div>

      <p className="text-xs text-slate-600 mb-4 leading-relaxed">
        Cross-referencing multiple entity signals ensures intelligence is never attributed to the wrong company.
      </p>

      {/* Signal Weights Table */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {/* Org number match (+50) */}
        <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
          <div className="text-[11px] text-slate-500 font-medium">Org Number</div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-bold text-slate-900">+{breakdown.orgNumberMatch} / 50</span>
            {breakdown.orgNumberMatch > 0 ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <X className="w-4 h-4 text-slate-300" />
            )}
          </div>
        </div>

        {/* Company name match (+20) */}
        <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
          <div className="text-[11px] text-slate-500 font-medium">Legal Name</div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-bold text-slate-900">+{breakdown.nameMatch} / 20</span>
            {breakdown.nameMatch > 0 ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <X className="w-4 h-4 text-slate-300" />
            )}
          </div>
        </div>

        {/* Official domain match (+10) */}
        <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
          <div className="text-[11px] text-slate-500 font-medium">Domain</div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-bold text-slate-900">+{breakdown.domainMatch} / 10</span>
            {breakdown.domainMatch > 0 ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <X className="w-4 h-4 text-slate-300" />
            )}
          </div>
        </div>

        {/* Address match (+10) */}
        <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
          <div className="text-[11px] text-slate-500 font-medium">Address</div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-bold text-slate-900">+{breakdown.addressMatch} / 10</span>
            {breakdown.addressMatch > 0 ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <X className="w-4 h-4 text-slate-300" />
            )}
          </div>
        </div>

        {/* Identifiers match (+10) */}
        <div className="p-2.5 bg-white border border-slate-200 rounded-lg col-span-2 sm:col-span-1">
          <div className="text-[11px] text-slate-500 font-medium">Identifiers</div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-bold text-slate-900">+{(breakdown as any).identifierMatch ?? 0} / 10</span>
            {((breakdown as any).identifierMatch ?? 0) > 0 ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <X className="w-4 h-4 text-slate-300" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
