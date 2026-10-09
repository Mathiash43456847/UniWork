/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { Task, CalendarEvent, Tag, TaskGroup, Goal, getLocalISODate } from '../types';

interface InsightsViewProps {
  tasks: Task[];
  events: CalendarEvent[];
  tags: Tag[];
  groups: TaskGroup[];
  goals: Goal[];
  onNavigateToFocus?: () => void;
}

type TimeRangeMode = 'day' | 'week' | 'month';

interface SubjectStat {
  id: string;
  name: string;
  color: string;
  minutes: number;
  percentage: number;
  formattedDuration: string;
}

const formatMinutes = (totalMinutes: number): string => {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins}m`;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};

const formatDigitalDuration = (totalMinutes: number): string => {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hrs}:${String(mins).padStart(2, '0')}`;
};

export default function InsightsView({
  tasks,
  events,
  tags,
  groups,
  goals,
  onNavigateToFocus
}: InsightsViewProps) {
  const [rangeMode, setRangeMode] = useState<TimeRangeMode>('week');
  const [currentAnchorDate, setCurrentAnchorDate] = useState<Date>(() => new Date());

  const handleShiftDate = (direction: -1 | 1) => {
    setCurrentAnchorDate((prev) => {
      const next = new Date(prev);
      if (rangeMode === 'day') {
        next.setDate(next.getDate() + direction);
      } else if (rangeMode === 'week') {
        next.setDate(next.getDate() + direction * 7);
      } else {
        next.setMonth(next.getMonth() + direction);
      }
      return next;
    });
  };

  const handleResetToToday = () => {
    setCurrentAnchorDate(new Date());
  };

  const dateRange = useMemo(() => {
    const d = new Date(currentAnchorDate);
    if (rangeMode === 'day') {
      const single = getLocalISODate(d);
      return {
        start: single,
        end: single,
        label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      };
    } else if (rangeMode === 'week') {
      const dayOfWeek = d.getDay();
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const mon = new Date(d);
      mon.setDate(d.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);

      const monStr = getLocalISODate(mon);
      const sunStr = getLocalISODate(sun);

      const label = `${mon.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      return { start: monStr, end: sunStr, label, mondayDate: mon };
    } else {
      const year = d.getFullYear();
      const month = d.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      return { start: getLocalISODate(firstDay), end: getLocalISODate(lastDay), label };
    }
  }, [rangeMode, currentAnchorDate]);

  const filteredData = useMemo(() => {
    const { start, end } = dateRange;

    const rangeTasks = tasks.filter((t) => t.date && t.date >= start && t.date <= end);
    const rangeEvents = events.filter((e) => e.date && e.date >= start && e.date <= end);

    const calculateDurationMinutes = (item: { startTime?: string; endTime?: string }): number => {
      if (item.startTime && item.endTime) {
        const [sh, sm] = item.startTime.split(':').map(Number);
        const [eh, em] = item.endTime.split(':').map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff > 0) return diff;
      }
      return 45;
    };

    let totalMinutes = 0;
    const subjectMinutesMap: Record<string, { minutes: number; name: string; color: string }> = {};

    const getSubjectInfo = (tagId?: string, groupId?: string, goalId?: string) => {
      if (tagId) {
        const t = tags.find((tag) => tag.id === tagId);
        if (t) return { id: t.id, name: t.name, color: t.color || '#3b82f6' };
      }
      if (groupId) {
        const g = groups.find((grp) => grp.id === groupId);
        if (g) return { id: g.id, name: g.name, color: g.color || '#0066FF' };
      }
      if (goalId) {
        const goal = goals.find((gl) => gl.id === goalId);
        if (goal) return { id: goal.id, name: goal.title, color: goal.color || '#10b981' };
      }
      return { id: 'general', name: 'General Study', color: '#6366f1' };
    };

    rangeTasks.forEach((task) => {
      const dur = calculateDurationMinutes(task);
      totalMinutes += dur;

      const subj = getSubjectInfo(undefined, task.groupId, task.goalId);
      if (!subjectMinutesMap[subj.name]) {
        subjectMinutesMap[subj.name] = { minutes: 0, name: subj.name, color: subj.color };
      }
      subjectMinutesMap[subj.name].minutes += dur;
    });

    rangeEvents.forEach((ev) => {
      const dur = calculateDurationMinutes(ev);
      totalMinutes += dur;

      const subj = getSubjectInfo(ev.tagId, undefined, ev.goalId);
      if (!subjectMinutesMap[subj.name]) {
        subjectMinutesMap[subj.name] = { minutes: 0, name: subj.name, color: subj.color };
      }
      subjectMinutesMap[subj.name].minutes += dur;
    });

    const subjectList: SubjectStat[] = Object.entries(subjectMinutesMap).map(([id, info]) => {
      const pct = totalMinutes > 0 ? Math.round((info.minutes / totalMinutes) * 100) : 0;
      return {
        id,
        name: info.name,
        color: info.color,
        minutes: info.minutes,
        percentage: pct,
        formattedDuration: formatDigitalDuration(info.minutes)
      };
    }).sort((a, b) => b.minutes - a.minutes);

    const completedTasksCount = rangeTasks.filter((t) => t.status === 'done').length;

    return {
      totalMinutes,
      completedTasksCount,
      totalItems: rangeTasks.length + rangeEvents.length,
      subjectList,
      tasks: rangeTasks,
      events: rangeEvents
    };
  }, [dateRange, tasks, events, tags, groups, goals]);

  const weekChartData = useMemo(() => {
    if (rangeMode !== 'week') return [];

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const monday = dateRange.mondayDate ? new Date(dateRange.mondayDate) : new Date();

    return days.map((dayName, idx) => {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + idx);
      const dateStr = getLocalISODate(cur);

      const dayTasks = tasks.filter((t) => t.date === dateStr);
      const dayEvents = events.filter((e) => e.date === dateStr);

      let dayMins = 0;
      const calcDur = (item: { startTime?: string; endTime?: string }) => {
        if (item.startTime && item.endTime) {
          const [sh, sm] = item.startTime.split(':').map(Number);
          const [eh, em] = item.endTime.split(':').map(Number);
          const diff = (eh * 60 + em) - (sh * 60 + sm);
          if (diff > 0) return diff;
        }
        return 45;
      };

      dayTasks.forEach((t) => (dayMins += calcDur(t)));
      dayEvents.forEach((e) => (dayMins += calcDur(e)));

      const hours = Number((dayMins / 60).toFixed(1));

      const totalItems = dayTasks.length + dayEvents.length;
      const doneItems = dayTasks.filter((t) => t.status === 'done').length;
      let productivity = 0;

      if (totalItems > 0) {
        const completionRate = doneItems / totalItems;
        productivity = Math.min(98, Math.round(50 + completionRate * 40 + (dayMins > 120 ? 8 : 0)));
      } else if (hours > 0) {
        productivity = 75;
      }

      return {
        dayName,
        dateStr,
        hours,
        minutes: dayMins,
        productivity,
        isToday: dateStr === getLocalISODate(new Date())
      };
    });
  }, [rangeMode, dateRange, tasks, events]);

  const hourlyDistribution = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
      sessions: 0,
      minutes: 0
    }));

    const sourceTasks = filteredData.tasks;
    const sourceEvents = filteredData.events;

    const processTime = (startTime?: string, endTime?: string) => {
      if (!startTime) return;
      const [h] = startTime.split(':').map(Number);
      if (h >= 0 && h < 24) {
        hours[h].sessions += 1;
        hours[h].minutes += 45;
      }
    };

    sourceTasks.forEach((t) => processTime(t.startTime, t.endTime));
    sourceEvents.forEach((e) => processTime(e.startTime, e.endTime));

    const maxMins = Math.max(1, ...hours.map((h) => h.minutes));
    const peakHour = hours.reduce((max, cur) => (cur.minutes > max.minutes ? cur : max), hours[0]);

    return { hours, maxMins, peakHour };
  }, [filteredData]);

  const maxWeekHours = useMemo(() => {
    const maxVal = Math.max(...weekChartData.map((d) => d.hours), 4);
    return Math.ceil(maxVal);
  }, [weekChartData]);

  const resolveColor = (colorName: string) => {
    const colorMap: Record<string, string> = {
      blue: '#0066FF',
      sky: '#0284c7',
      indigo: '#4f46e5',
      green: '#10b981',
      emerald: '#059669',
      amber: '#f59e0b',
      rose: '#f43f5e',
      purple: '#8b5cf6',
      violet: '#7c3aed',
      red: '#ef4444',
      orange: '#f97316'
    };
    return colorMap[colorName] || colorName || '#0066FF';
  };

  return (
    <div
      className="flex-1 flex flex-col bg-slate-50 dark:bg-[#070A11] text-slate-800 dark:text-[#F4F4F5] overflow-hidden font-sans transition-colors duration-200"
      id="uniwork-insights-view"
    >
      {/* 1. Header Top Bar (Matched to TasksView Top Bar) */}
      <div className="h-16 px-6 flex items-center justify-between flex-shrink-0 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 select-none">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <BarChart2 className="w-6 h-6 text-[#0066FF] dark:text-[#60A5FA]" />
            <span>Insights</span>
          </h1>
        </div>

        {/* View Switchers: Day / Week / Month */}
        <div className="flex items-center gap-6 h-full relative" style={{ top: '1px' }}>
          {(['day', 'week', 'month'] as TimeRangeMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setRangeMode(mode)}
              className={`flex items-center gap-1.5 h-full px-2 text-xs font-semibold capitalize transition-all border-b-2 cursor-pointer ${
                rangeMode === mode
                  ? 'border-indigo-600 dark:border-[#60A5FA] text-indigo-600 dark:text-[#60A5FA] font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              id={`insights-range-${mode}-btn`}
            >
              <span>{mode}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Sub-Toolbar: Date Navigation & Quick Metrics */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shrink-0 select-none">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleShiftDate(-1)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#60A5FA]" />
            <span>{dateRange.label}</span>
          </div>

          <button
            type="button"
            onClick={() => handleShiftDate(1)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleResetToToday}
            className="ml-2 text-xs font-semibold text-indigo-600 dark:text-[#60A5FA] hover:underline cursor-pointer"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#60A5FA]" />
            <span>Total: <strong>{formatMinutes(filteredData.totalMinutes)}</strong></span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{filteredData.completedTasksCount} Done</span>
          </div>
        </div>
      </div>

      {/* 3. Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* --- PART 1: STUDY DURATION & PRODUCTIVITY TREND CHART --- */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Study Duration & Productivity
            </h2>
            {rangeMode !== 'day' && (
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#0066FF]" />
                  <span>Study Hours</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-slate-900 dark:bg-white" />
                  <span>Productivity Level*</span>
                </div>
              </div>
            )}
          </div>

          {rangeMode === 'day' ? (
            /* Day View: Clean Stat Numbers */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-5 flex flex-col justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Study Time
                </span>
                <div className="my-2">
                  <span className="text-4xl md:text-5xl font-extrabold text-[#0066FF] dark:text-[#38BDF8] font-inter tabular-nums">
                    {formatMinutes(filteredData.totalMinutes)}
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {filteredData.totalItems} sessions recorded
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-5 flex flex-col justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tasks Completed
                </span>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400 font-inter tabular-nums">
                    {filteredData.completedTasksCount}
                  </span>
                  <span className="text-sm text-slate-500">/ {filteredData.tasks.length} tasks</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {filteredData.tasks.length > 0
                    ? `${Math.round((filteredData.completedTasksCount / filteredData.tasks.length) * 100)}% done`
                    : '0%'}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-5 flex flex-col justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Peak Focus
                </span>
                <div className="my-2">
                  <span className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-slate-100 font-inter">
                    {hourlyDistribution.peakHour.minutes > 0 ? hourlyDistribution.peakHour.label : 'None'}
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Top study hour
                </span>
              </div>
            </div>
          ) : (
            /* Week/Month View: Vertical Bar Chart + Productivity Line Overlay */
            <div className="pt-2">
              <div className="relative h-64 w-full flex items-end justify-between px-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="w-full border-b border-slate-400 dark:border-slate-600" />
                  <div className="w-full border-b border-slate-400 dark:border-slate-600" />
                  <div className="w-full border-b border-slate-400 dark:border-slate-600" />
                  <div className="w-full border-b border-slate-400 dark:border-slate-600" />
                </div>

                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="none">
                  {weekChartData.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#0F172A"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="dark:stroke-white transition-all duration-300"
                      points={weekChartData
                        .map((d, i) => {
                          const xPercent = (i + 0.5) / weekChartData.length;
                          const yPercent = d.productivity > 0 ? 0.85 - (d.productivity / 100) * 0.7 : 0.85;
                          return `${xPercent * 100}%,${yPercent * 100}%`;
                        })
                        .join(' ')}
                    />
                  )}
                  {weekChartData.map((d, i) => {
                    const xPercent = (i + 0.5) / weekChartData.length;
                    const yPercent = d.productivity > 0 ? 0.85 - (d.productivity / 100) * 0.7 : 0.85;
                    return (
                      <g key={i}>
                        <circle
                          cx={`${xPercent * 100}%`}
                          cy={`${yPercent * 100}%`}
                          r="4"
                          className="fill-white dark:fill-[#0F172A] stroke-slate-900 dark:stroke-white stroke-2"
                        />
                        {d.productivity > 0 && (
                          <text
                            x={`${xPercent * 100}%`}
                            y={`${yPercent * 100 - 3}%`}
                            textAnchor="middle"
                            className="text-[10px] font-bold fill-slate-700 dark:fill-slate-200 select-none"
                          >
                            {d.productivity}%
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {weekChartData.map((day) => {
                  const barHeightPercent = maxWeekHours > 0 ? Math.min(100, (day.hours / maxWeekHours) * 85) : 0;
                  return (
                    <div
                      key={day.dayName}
                      className="flex-1 flex flex-col items-center justify-end h-full z-0 group relative cursor-pointer px-1"
                    >
                      <div className="absolute -top-10 bg-slate-900 text-white text-[11px] font-medium py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-30">
                        {day.dayName}: {day.hours}h
                      </div>

                      <div
                        className={`w-full max-w-[48px] rounded-t-lg transition-all duration-300 relative ${
                          day.isToday
                            ? 'bg-[#0066FF] shadow-sm'
                            : 'bg-[#0066FF]/80 hover:bg-[#0066FF]'
                        }`}
                        style={{ height: `${Math.max(barHeightPercent, day.hours > 0 ? 8 : 2)}%` }}
                      >
                        {day.hours > 0 && (
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-600 dark:text-slate-300 font-inter">
                            {day.hours}h
                          </span>
                        )}
                      </div>

                      <span
                        className={`mt-2 text-xs font-semibold tracking-tight ${
                          day.isToday
                            ? 'text-[#0066FF] dark:text-[#60A5FA] font-bold'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {day.dayName}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                <span>* Predicted productivity level</span>
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Total: {formatMinutes(filteredData.totalMinutes)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* --- PART 2: SUBJECT RATIO BREAKDOWN (MATCHING SCREENSHOTS) --- */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Subject ratio
            </h2>
            {filteredData.subjectList.length > 0 && (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {filteredData.subjectList.length} subjects
              </span>
            )}
          </div>

          {filteredData.subjectList.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-2">
              <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {(() => {
                    const radius = 38;
                    const circumference = 2 * Math.PI * radius;
                    let accumulatedPercent = 0;

                    return filteredData.subjectList.map((subj) => {
                      const strokeDasharray = `${(subj.percentage / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                      accumulatedPercent += subj.percentage;

                      return (
                        <circle
                          key={subj.id}
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="transparent"
                          stroke={resolveColor(subj.color)}
                          strokeWidth="18"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-500 hover:opacity-90"
                        />
                      );
                    });
                  })()}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                  <span className="text-2xl font-bold font-inter text-slate-900 dark:text-white">
                    {filteredData.subjectList[0]?.percentage || 0}%
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate max-w-[80px]">
                    {filteredData.subjectList[0]?.name || ''}
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-3 pl-0 md:pl-6 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800/80 pt-4 md:pt-0">
                {filteredData.subjectList.map((subj) => (
                  <div
                    key={subj.id}
                    className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-1.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: resolveColor(subj.color) }}
                      />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {subj.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 font-inter tabular-nums">
                      <span>{subj.formattedDuration}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{subj.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Empty state matching Image 2 */
            <div className="py-6">
              <div className="w-full max-w-sm mx-auto space-y-2.5 mb-4 opacity-60">
                <div className="flex items-center justify-between py-1.5 px-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">No subject recorded</span>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">0:00 • 0%</span>
                </div>
              </div>

              {onNavigateToFocus && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={onNavigateToFocus}
                    className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Start Focus Session</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- PART 3: OPTION 1 — PEAK FOCUS HEATMAP (24-HOUR DISTRIBUTION) --- */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Peak Focus (24h)</span>
            </h2>

            {hourlyDistribution.peakHour.minutes > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2.5 py-0.5 rounded-full">
                <span>Peak: {hourlyDistribution.peakHour.label}</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <div className="h-24 w-full flex items-end justify-between gap-1 pb-3 border-b border-slate-100 dark:border-slate-800">
              {hourlyDistribution.hours.map((h) => {
                const heightPercent = hourlyDistribution.maxMins > 0 ? (h.minutes / hourlyDistribution.maxMins) * 100 : 0;
                const isPeak = h.minutes > 0 && h.hour === hourlyDistribution.peakHour.hour;

                return (
                  <div
                    key={h.hour}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                  >
                    <div className="absolute -top-8 bg-slate-900 text-white text-[10px] font-medium py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                      {h.label}: {h.minutes}m
                    </div>

                    <div
                      className={`w-full rounded-t-xs transition-all duration-200 ${
                        isPeak
                          ? 'bg-amber-500'
                          : h.minutes > 0
                            ? 'bg-[#0066FF]/70 hover:bg-[#0066FF]'
                            : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-2 font-medium">
              <span>12 AM</span>
              <span>4 AM</span>
              <span>8 AM</span>
              <span>12 PM</span>
              <span>4 PM</span>
              <span>8 PM</span>
              <span>11 PM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
