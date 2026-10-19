import React, { useState } from 'react';
import { CalendarRange, Sliders, Tags, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
import { Tag } from '../../types';

interface CalendarSectionProps {
  snapInterval: number;
  onSaveSnapInterval: (interval: number) => Promise<void>;
  recurrenceBehavior: 'ask' | 'one' | 'all';
  onSaveRecurrenceBehavior: (behavior: 'ask' | 'one' | 'all') => Promise<void>;
  tags: Tag[];
  onSaveTagsOrder: (orderedTags: Tag[]) => void;
}

export const CalendarSection: React.FC<CalendarSectionProps> = ({
  snapInterval,
  onSaveSnapInterval,
  recurrenceBehavior,
  onSaveRecurrenceBehavior,
  tags,
  onSaveTagsOrder,
}) => {
  const [isTagsOpen, setIsTagsOpen] = useState(false);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...tags];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onSaveTagsOrder(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === tags.length - 1) return;
    const updated = [...tags];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onSaveTagsOrder(updated);
  };

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-[#60A5FA] flex items-center justify-center shrink-0">
          <CalendarRange className="w-4 h-4" />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight">
          Calendar Options
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Drag Snap Interval Dropdown */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Drag Snap Interval
          </label>
          <select
            value={snapInterval}
            onChange={(e) => onSaveSnapInterval(Number(e.target.value))}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:border-[#0066FF] cursor-pointer"
          >
            <option value={5}>5 Minutes (Ultra-fine)</option>
            <option value={10}>10 Minutes (Default)</option>
            <option value={15}>15 Minutes (Quarter-hour)</option>
            <option value={30}>30 Minutes (Half-hour)</option>
          </select>
        </div>

        {/* 2. Repeating Events Behavior Dropdown */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Repeating Events Edit Behavior
          </label>
          <select
            value={recurrenceBehavior}
            onChange={(e) => onSaveRecurrenceBehavior(e.target.value as any)}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:border-[#0066FF] cursor-pointer"
          >
            <option value="ask">Ask every time (Safest)</option>
            <option value="one">Just this event</option>
            <option value="all">All future events in series</option>
          </select>
        </div>
      </div>

      {/* 3. Event Tag Priority Accordion Row */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden pt-1">
        <button
          type="button"
          onClick={() => setIsTagsOpen(!isTagsOpen)}
          className="w-full px-4 py-3 bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center justify-between transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <Tags className="w-4 h-4 text-indigo-600 dark:text-[#60A5FA]" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Event Tag Priority (#1 tag is default for new events)
            </span>
          </div>
          {isTagsOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isTagsOpen && (
          <div className="p-4 space-y-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] animate-in fade-in">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Use ↑ and ↓ arrows to arrange priority. The top tag (#1) is automatically pre-selected for new events.
            </p>

            <div className="space-y-1.5 max-w-md">
              {tags.map((tag, idx) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${tag.bgColor} ${tag.textColor} border ${tag.borderColor}`}>
                      {tag.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === tags.length - 1}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
