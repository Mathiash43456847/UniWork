import React from 'react';
import { Task } from '../types';

interface ActiveTaskHeaderBadgeProps {
  task: Task | null;
  isRunning: boolean;
  onClick?: () => void;
}

export const ActiveTaskHeaderBadge: React.FC<ActiveTaskHeaderBadgeProps> = ({
  task,
  isRunning,
  onClick,
}) => {
  if (!task || !task.title || task.title === 'open') return null;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 pl-3.5 border-l border-slate-200/80 dark:border-slate-800/80 min-w-0 select-none text-xs ${
        onClick ? 'cursor-pointer group' : ''
      }`}
      title={onClick ? 'Click to open Focus Room' : undefined}
    >
      <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0">
        Task:
      </span>
      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px] md:max-w-[200px] group-hover:text-[#0066FF] transition">
        {task.title}
      </span>
      <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-medium">
        <span
          className={`w-2 h-2 rounded-full ${
            isRunning ? 'bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500/50' : 'bg-amber-400'
          }`}
        />
        <span className={isRunning ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}>
          {isRunning ? 'Active' : 'Not started'}
        </span>
      </div>
    </div>
  );
};
