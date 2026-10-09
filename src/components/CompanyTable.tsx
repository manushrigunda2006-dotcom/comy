'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, ShieldCheck, ArrowUpDown, Building, ExternalLink } from 'lucide-react';
import { formatOrgNumber } from '@/lib/validation';
import { formatRelativeTime } from '@/lib/freshness';

interface CompanyRow {
  organization_number: string;
  name: string;
  status: string;
  legal_form: string;
  industry_desc: string;
  employees_count: number | null;
  last_researched_at: string;
  is_demo_mode: number;
  factsCount: number;
  averageConfidence: number;
}

export const CompanyTable: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'last_researched_at' | 'status'>('last_researched_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);

  const limit = 15;

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const params = new URLSearchParams({
        search,
        sortBy,
        sortOrder,
        limit: String(limit),
        offset: String(offset),
      });

      const res = await fetch(`/api/companies?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error('Failed to load companies:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [page, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCompanies();
  };

  const toggleSort = (field: 'name' | 'last_researched_at' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Researched Norwegian Companies Directory
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {total.toLocaleString()} evidence-indexed business entities
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-sm w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name, org number, industry..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-semibold">
            <tr>
              <th
                onClick={() => toggleSort('name')}
                className="py-3 px-4 sm:px-6 cursor-pointer hover:text-slate-900 select-none"
              >
                <div className="flex items-center space-x-1">
                  <span>Company</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th className="py-3 px-4">Organization Number</th>
              <th
                onClick={() => toggleSort('status')}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th className="py-3 px-4">Verified Facts</th>
              <th
                onClick={() => toggleSort('last_researched_at')}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
              >
                <div className="flex items-center space-x-1">
                  <span>Last Verified</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th className="py-3 px-4">Confidence</th>
              <th className="py-3 px-4 text-right">Profile</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  Loading Norwegian company intelligence...
                </td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No company matching query found. Try searching by 9-digit org number.
                </td>
              </tr>
            ) : (
              companies.map((c) => (
                <tr
                  key={c.organization_number}
                  className="hover:bg-blue-50/40 transition-colors group"
                >
                  <td className="py-3.5 px-4 sm:px-6">
                    <Link
                      href={`/company/${c.organization_number}`}
                      className="font-bold text-slate-900 hover:text-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <span>{c.name}</span>
                    </Link>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs">
                      {c.industry_desc}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-medium text-slate-600 text-xs">
                    {formatOrgNumber(c.organization_number)}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        c.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      ● {c.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {c.factsCount} facts
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 text-xs">
                    {formatRelativeTime(c.last_researched_at)}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold text-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{c.averageConfidence}%</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/company/${c.organization_number}`}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-blue-700 hover:text-white rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                    >
                      <span>View Dossier</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Page {page} of {totalPages}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
