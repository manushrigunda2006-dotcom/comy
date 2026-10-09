'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, History } from 'lucide-react';
import { HistoryTimeline } from '@/components/HistoryTimeline';
import { ResearchHistoryRecord } from '@/lib/types';
import { formatOrgNumber } from '@/lib/validation';

export default function CompanyHistoryPage() {
  const params = useParams();
  const orgNumber = params.orgNumber as string;
  const [history, setHistory] = useState<ResearchHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/company/${orgNumber}/history`)
      .then((res) => res.json())
      .then((data) => {
        setHistory(data.history || []);
      })
      .finally(() => setLoading(false));
  }, [orgNumber]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <Link
        href={`/company/${orgNumber}`}
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Company Dossier</span>
      </Link>

      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Historical Research Snapshots
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit history for organization number {formatOrgNumber(orgNumber)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading history...</div>
      ) : (
        <HistoryTimeline history={history} />
      )}
    </div>
  );
}
