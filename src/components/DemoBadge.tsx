'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface DemoBadgeProps {
  isDemo?: boolean;
}

export const DemoBadge: React.FC<DemoBadgeProps> = ({ isDemo = false }) => {
  if (!isDemo) return null;

  return (
    <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-100/90 text-amber-900 border border-amber-300 rounded-full text-xs font-bold tracking-wide uppercase">
      <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
      <span>DEMO DATA</span>
    </div>
  );
};
