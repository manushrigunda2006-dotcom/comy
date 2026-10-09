'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink, Globe, FileText, Database, ShieldAlert } from 'lucide-react';
import { SourceRecord } from '@/lib/types';
import { formatRelativeTime, formatFullDate } from '@/lib/freshness';

interface SourceCardProps {
  source: SourceRecord;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source }) => {
  const isVerified = source.verificationStatus === 'verified';
  const isRejected = source.verificationStatus === 'rejected';

  const getSourceIcon = () => {
    switch (source.sourceType) {
      case 'official_registry':
      case 'financial_register':
      case 'roles_register':
        return <Database className="w-5 h-5 text-blue-600" />;
      case 'company_website':
        return <Globe className="w-5 h-5 text-emerald-600" />;
      case 'annual_report':
        return <FileText className="w-5 h-5 text-indigo-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div
      className={`border rounded-xl p-4 sm:p-5 transition-all ${
        isRejected
          ? 'bg-rose-50/50 border-rose-200'
          : isVerified
          ? 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          : 'bg-amber-50/40 border-amber-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0">
            {getSourceIcon()}
          </div>
          <div>
            <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
              {source.title}
            </h4>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
              <span className="font-mono text-slate-600">{source.domain}</span>
              <span>&bull;</span>
              <span className="capitalize">{source.sourceType.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>

        {/* Match score badge */}
        <div className="text-right shrink-0">
          <div
            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              source.matchScore >= 75
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : source.matchScore >= 60
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            <span>Match: {source.matchScore}%</span>
          </div>
        </div>
      </div>

      {/* Verification Status Banner */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          {isVerified && (
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Company identity verified</span>
            </div>
          )}

          {isRejected && (
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-rose-700">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Source rejected: {source.rejectionReason || 'Company identity could not be verified'}</span>
            </div>
          )}

          {!isVerified && !isRejected && (
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-700">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Needs additional identity verification</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-500">
          <span>{source.factsExtractedCount} facts extracted</span>
          <span>&bull;</span>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-blue-700 hover:text-blue-900 font-medium hover:underline"
          >
            <span>Inspect Source</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
