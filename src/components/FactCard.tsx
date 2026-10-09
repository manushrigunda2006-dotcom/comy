'use client';

import React, { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, ExternalLink, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { Fact } from '@/lib/types';
import { formatRelativeTime, formatFullDate } from '@/lib/freshness';
import { getConfidenceBadgeColor, getConfidenceTier } from '@/lib/confidence';

interface FactCardProps {
  fact: Fact;
  defaultExpanded?: boolean;
}

export const FactCard: React.FC<FactCardProps> = ({ fact, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const tier = getConfidenceTier(fact.confidence);
  const badge = getConfidenceBadgeColor(tier);

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden hover:border-slate-300 transition-all shadow-xs">
      {/* Top summary row */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 sm:p-5 flex items-start justify-between cursor-pointer select-none hover:bg-slate-50/50 transition-colors"
      >
        <div className="space-y-1 pr-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {fact.label}
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight break-words">
            {fact.value}
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <div
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{fact.confidence}%</span>
          </div>

          <button
            type="button"
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            aria-label={expanded ? 'Collapse evidence' : 'Expand evidence'}
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Freshness Bar */}
      <div className="px-4 sm:px-5 py-1.5 bg-slate-50 border-t border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center space-x-1.5">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{formatRelativeTime(fact.retrieved_at, 'Verified')}</span>
        </div>
        {fact.source_date && (
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{formatRelativeTime(fact.source_date, 'Source published')}</span>
          </div>
        )}
      </div>

      {/* Expandable Evidence Section */}
      {expanded && (
        <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-700 space-y-3">
          {/* Quote / Evidence */}
          <div>
            <span className="font-semibold text-slate-800 uppercase tracking-wider text-[10px]">
              Evidence / Verification Details:
            </span>
            <div className="mt-1 p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 leading-relaxed font-mono text-[11px]">
              &ldquo;{fact.evidence}&rdquo;
            </div>
          </div>

          {/* Grid of metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[11px]">
            <div>
              <span className="text-slate-500">Verified from: </span>
              <span className="font-semibold text-slate-900">{fact.source_title}</span>
            </div>

            <div>
              <span className="text-slate-500">Checked: </span>
              <span className="font-semibold text-slate-900">{formatFullDate(fact.retrieved_at)}</span>
            </div>

            {fact.source_date && (
              <div>
                <span className="text-slate-500">Source Date: </span>
                <span className="font-semibold text-slate-900">{formatFullDate(fact.source_date)}</span>
              </div>
            )}

            <div>
              <span className="text-slate-500">Confidence Tier: </span>
              <span className="font-semibold capitalize text-slate-900">{tier.replace('_', ' ')} ({fact.confidence}%)</span>
            </div>
          </div>

          {/* Source Link */}
          <div className="pt-2 flex justify-end">
            <a
              href={fact.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-blue-700 hover:text-blue-900 font-semibold hover:underline"
            >
              <span>View Source</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
