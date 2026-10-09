import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  subtitle,
  icon: Icon,
  color = 'text-blue-700 bg-blue-50',
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {label}
        </div>
        <div className={`p-2 rounded-xl ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
        {value}
      </div>

      {subtitle && (
        <div className="mt-1 text-xs text-slate-500 font-medium">
          {subtitle}
        </div>
      )}
    </div>
  );
};
