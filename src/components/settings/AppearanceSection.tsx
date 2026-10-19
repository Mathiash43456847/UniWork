import React from 'react';
import { Sun, Moon, RefreshCw } from 'lucide-react';

interface AppearanceSectionProps {
  themePreference: 'auto' | 'day' | 'night';
  onSetThemePreference?: (pref: 'auto' | 'day' | 'night') => void;
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  themePreference,
  onSetThemePreference,
}) => (
  <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
    <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-5">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-[#60A5FA] flex items-center justify-center shrink-0">
        <Sun className="w-4 h-4" />
      </div>
      <div>
        <h3 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight">
          Theme & Appearance
        </h3>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { key: 'auto', label: 'System Auto', icon: RefreshCw },
        { key: 'day', label: 'Day Mode', icon: Sun },
        { key: 'night', label: 'Night Mode', icon: Moon },
      ].map((opt) => {
        const isActive = themePreference === opt.key;
        const Icon = opt.icon;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onSetThemePreference?.(opt.key as any)}
            className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition select-none ${
              isActive
                ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0F172A]'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="font-semibold text-sm">{opt.label}</span>
          </button>
        );
      })}
    </div>
  </div>
);
