import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-700 flex items-center justify-center text-white font-black text-xs">
                <span>🇳🇴</span>
              </div>
              <div>
                <span className="font-black text-lg text-slate-900 tracking-tight block">
                  COMY
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Norway Company Intelligence Agent
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed font-medium">
              &ldquo;Evidence-backed research for Norwegian companies.&rdquo;
            </p>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              Autonomous public-source research, official Norwegian registry verification, and evidence-backed facts from Norwegian organization numbers.
            </p>
            <div className="flex items-center space-x-2 text-xs text-slate-500 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Strict zero-fabrication policy &bull; Permitted Norwegian public registers only</span>
            </div>
          </div>

          {/* Registries */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Official Registries
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <a
                  href="https://www.brreg.no"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-rose-700 transition-colors"
                >
                  Brønnøysundregistrene
                </a>
              </li>
              <li>
                <a
                  href="https://data.brreg.no/enhetsregisteret"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-rose-700 transition-colors"
                >
                  Enhetsregisteret (Entities)
                </a>
              </li>
              <li>
                <a
                  href="https://data.brreg.no/regnskapsregisteret"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-rose-700 transition-colors"
                >
                  Regnskapsregisteret (Accounts)
                </a>
              </li>
              <li>
                <a
                  href="https://www.nav.no"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-rose-700 transition-colors"
                >
                  NAV Aa-registeret (Staff)
                </a>
              </li>
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link href="/dashboard" className="hover:text-rose-700 transition-colors">
                  Company Directory (1,000+)
                </Link>
              </li>
              <li>
                <Link href="/evaluate" className="hover:text-rose-700 transition-colors font-bold text-rose-700">
                  Judge Simulator &amp; Rubric
                </Link>
              </li>
              <li>
                <Link href="/sources" className="hover:text-rose-700 transition-colors">
                  Permitted Sources Policy
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-rose-700 transition-colors">
                  Identity Matching Engine
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-rose-700 transition-colors">
                  About Comy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Comy. Norway Company Intelligence Agent.</p>
          <p className="mt-2 sm:mt-0">Open Norwegian Public Data &bull; NLOD & CC BY 4.0 Compliant</p>
        </div>
      </div>
    </footer>
  );
};
