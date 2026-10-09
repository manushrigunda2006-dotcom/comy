'use client';

import React from 'react';
import { History, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ResearchHistoryRecord } from '@/lib/types';
import { formatFullDate, formatRelativeTime } from '@/lib/freshness';

interface HistoryTimelineProps {
  history: ResearchHistoryRecord[];
}

export const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-sm">
        No previous research snapshots recorded yet for this entity.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
      <div className="flex items-center space-x-2.5 pb-5 border-b border-slate-100">
        <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Research History & Change Auditing</h3>
          <p className="text-xs text-slate-500">
            Immutable chronological log of verified company facts and detected registry deltas
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {history.map((record, idx) => (
          <div key={record.id || idx} className="relative pl-6 sm:pl-8 border-l-2 border-blue-200/80 last:border-transparent">
            {/* Dot marker */}
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-700 border-2 border-white ring-2 ring-blue-100" />

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm sm:text-base text-slate-900">
                    {formatFullDate(record.researchedAt)}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({formatRelativeTime(record.researchedAt)})
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                    {record.factsCount} facts verified
                  </span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="text-slate-500">{record.sourcesCount} sources checked</span>
                </div>
              </div>

              {/* Detected Changes */}
              {record.changes && record.changes.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Detected Entity Changes:
                  </div>
                  {record.changes.map((change, cIdx) => (
                    <div
                      key={cIdx}
                      className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs flex items-center space-x-2 text-slate-800"
                    >
                      <span className="font-bold text-blue-700">+ {change.label}:</span>
                      {change.oldValue ? (
                        <div className="flex items-center space-x-2">
                          <span className="line-through text-slate-400">{change.oldValue}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-semibold text-slate-900">{change.newValue}</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-900">{change.newValue}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-xs text-slate-500 italic">
                  Initial verification snapshot recorded.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
