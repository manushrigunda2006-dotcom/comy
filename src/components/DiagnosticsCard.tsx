'use client';

import React, { useState } from 'react';
import { Cpu, ChevronDown, ChevronUp, DollarSign, Clock, Layers, Database } from 'lucide-react';
import { ResearchDiagnostics } from '@/lib/types';

interface DiagnosticsCardProps {
  diagnostics?: ResearchDiagnostics | null;
}

export const DiagnosticsCard: React.FC<DiagnosticsCardProps> = ({ diagnostics }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!diagnostics) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center space-x-2 text-slate-700">
          <Cpu className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Research Diagnostics & Execution Costs
          </span>
          {diagnostics.isDemoMode && (
            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
              Demo / Cache Mode
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-500">
          <span>{diagnostics.elapsedSeconds}s</span>
          <span>&bull;</span>
          <span>${diagnostics.estimatedCostUsd.toFixed(4)} USD</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 bg-slate-50/80 border-t border-slate-100 text-xs text-slate-600 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Outbound requests */}
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <div className="text-[11px] text-slate-400 font-medium">HTTP Invocations</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {diagnostics.requests} requests
              </div>
            </div>

            {/* LLM calls */}
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <div className="text-[11px] text-slate-400 font-medium">LLM Invocations</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {diagnostics.llmCalls} calls ({diagnostics.llmTokens} tokens)
              </div>
            </div>

            {/* Estimated cost */}
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <div className="text-[11px] text-slate-400 font-medium">Declared API Cost</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                ${diagnostics.estimatedCostUsd.toFixed(4)} USD
              </div>
            </div>

            {/* Elapsed Time */}
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <div className="text-[11px] text-slate-400 font-medium">Elapsed Time</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {diagnostics.elapsedSeconds} seconds
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex flex-wrap justify-between items-center pt-1 border-t border-slate-200">
            <span>Model Engine: {diagnostics.modelUsed}</span>
            <span>Execution Timestamp: {new Date(diagnostics.timestamp).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
