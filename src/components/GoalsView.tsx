import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Target, Plus, Trash2, CheckSquare, Square, 
  ChevronDown, ChevronUp, Check, Sparkles, X, 
  Calendar, CheckCircle2, Clock, ListTodo, CalendarDays
} from 'lucide-react';
import { Goal, CalendarEvent, Task, Tag, TaskGroup, getLocalISODate } from '../types';
import { ActiveTaskHeaderBadge } from './ActiveTaskHeaderBadge';

interface GoalsViewProps {
  goals: Goal[];
  events: CalendarEvent[];
  tasks: Task[];
  tags: Tag[];
  groups: TaskGroup[];
  onAddGoal: (goalData: Omit<Goal, 'id'>) => void;
  onUpdateGoal: (id: string, updates: Partial<Goal>) => void;
  onDeleteGoal: (id: string) => void;
  onToggleGoalComplete: (id: string) => void;
  activeFocusTask?: Task | null;
  isFocusRunning?: boolean;
  onNavigateToFocus?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Helper: Calculate Sunday at 23:59 of current week
function getWeeklyDeadline(baseDate: Date = new Date()): string {
  const d = new Date(baseDate);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToSunday = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diffToSunday);
  return getLocalISODate(d);
}

// Helper: Calculate last day of current month
function getMonthlyDeadline(baseDate: Date = new Date()): string {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  return getLocalISODate(d);
}

// Fuzzy string similarity helper for month spellings (Levenshtein distance)
function getLevenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) matrix[i] = [i];
  for (let j = 0; j <= an; j++) matrix[0][j] = j;

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[bn][an];
}

export default function GoalsView({
  goals,
  events,
  tasks,
  tags,
  groups,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onToggleGoalComplete,
  activeFocusTask,
  isFocusRunning = false,
  onNavigateToFocus,
}: GoalsViewProps) {
  // New Goal quick inline row input
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSelectedGroupIds, setNewSelectedGroupIds] = useState<string[]>([]);
  const [newDeadlineType, setNewDeadlineType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');

  // Custom Date Picker segmented states
  const today = new Date();
  const [dayInput, setDayInput] = useState(String(today.getDate()).padStart(2, '0'));
  const [monthInput, setMonthInput] = useState(MONTH_NAMES[today.getMonth()]);
  const [yearInput, setYearInput] = useState(String(today.getFullYear()));
  const [isDayDefault, setIsDayDefault] = useState(true);
  const [isMonthDefault, setIsMonthDefault] = useState(true);
  const [isYearDefault, setIsYearDefault] = useState(true);

  // Active custom date popover cell
  const [activeDateGoalId, setActiveDateGoalId] = useState<string | null>(null);
  // Active tag popover cell
  const [activeTagGoalId, setActiveTagGoalId] = useState<string | null>(null);
  // Active Time breakdown popover/expansion
  const [activeTimeBreakdownGoalId, setActiveTimeBreakdownGoalId] = useState<string | null>(null);
  // Inline edit title
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState('');

  // Collapsible completed history drawer state
  const [isCompletedDrawerOpen, setIsCompletedDrawerOpen] = useState(false);

  // Refs for custom date inputs and click outside detection
  const titleInputRef = useRef<HTMLInputElement>(null);
  const dayInputRef = useRef<HTMLInputElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);
  const addGoalFormRef = useRef<HTMLFormElement>(null);
  const datePopoverRef = useRef<HTMLDivElement>(null);
  const tagPopoverRef = useRef<HTMLDivElement>(null);

  // Universal click-outside listener to dismiss popovers and create-forms smoothly
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Close date popover if clicking outside
      if (activeDateGoalId && datePopoverRef.current && !datePopoverRef.current.contains(target)) {
        if (!target.closest('[data-date-btn="true"]')) {
          handleSaveCustomDate(activeDateGoalId);
        }
      }

      // Close tag popover if clicking outside
      if (activeTagGoalId && tagPopoverRef.current && !tagPopoverRef.current.contains(target)) {
        if (!target.closest('[data-tag-btn="true"]')) {
          setActiveTagGoalId(null);
        }
      }

      // Close add goal box if clicking outside and form is empty or user clicked away
      if (isAddingGoal && addGoalFormRef.current && !addGoalFormRef.current.contains(target)) {
        if (!target.closest('#new-goal-monday-btn')) {
          if (!newTitle.trim()) {
            setIsAddingGoal(false);
          }
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeDateGoalId, activeTagGoalId, isAddingGoal, newTitle, dayInput, monthInput, yearInput]);

  // Duration calculations
  const getEventDuration = (ev: CalendarEvent): number => {
    if (!ev.startTime || !ev.endTime) return 0.5;
    const [sh, sm] = ev.startTime.split(':').map(Number);
    const [eh, em] = ev.endTime.split(':').map(Number);
    const diffMin = (eh * 60 + em) - (sh * 60 + sm);
    return diffMin > 0 ? diffMin / 60 : 0.5;
  };

  const getTaskDuration = (t: Task): number => {
    if (t.startTime && t.endTime) {
      const [sh, sm] = t.startTime.split(':').map(Number);
      const [eh, em] = t.endTime.split(':').map(Number);
      const diffMin = (eh * 60 + em) - (sh * 60 + sm);
      return diffMin > 0 ? diffMin / 60 : 1.0;
    }
    return 1.0;
  };

  // Pull detailed time spent, items breakdown, and connected task tags
  const getGoalTimeSpent = (goal: Goal) => {
    // Strictly match tasks and events that are explicitly linked by goalId
    const matchingTasks = tasks.filter(t => t.goalId === goal.id);
    const matchingEvents = events.filter(e => e.goalId === goal.id);

    const taskHours = matchingTasks.reduce((sum, t) => sum + getTaskDuration(t), 0);
    const eventHours = matchingEvents.reduce((sum, e) => sum + getEventDuration(e), 0);
    const totalHours = taskHours + eventHours;

    // Collect ALL unique task tags/groups that belong to this goal
    const manualConfiguredGroupIds = new Set(goal.groupIds || goal.tagIds || []);
    const allConnectedGroupIdsSet = new Set<string>();
    manualConfiguredGroupIds.forEach(id => allConnectedGroupIdsSet.add(id));
    matchingTasks.forEach(t => {
      if (t.groupId) allConnectedGroupIdsSet.add(t.groupId);
    });
    matchingEvents.forEach(e => {
      if (e.tagId) allConnectedGroupIdsSet.add(e.tagId);
    });

    // Count task/event distribution across groups to find majority group color
    const groupItemCount: Record<string, number> = {};
    matchingTasks.forEach(t => {
      if (t.groupId) {
        groupItemCount[t.groupId] = (groupItemCount[t.groupId] || 0) + 1;
      }
    });
    matchingEvents.forEach(e => {
      if (e.tagId) {
        groupItemCount[e.tagId] = (groupItemCount[e.tagId] || 0) + 1;
      }
    });

    let majorityGroupId: string | null = null;
    let maxCount = -1;
    Object.entries(groupItemCount).forEach(([gid, count]) => {
      if (count > maxCount) {
        maxCount = count;
        majorityGroupId = gid;
      }
    });

    // Fallback if no tasks logged yet: use first group in connected set
    if (!majorityGroupId && allConnectedGroupIdsSet.size > 0) {
      majorityGroupId = Array.from(allConnectedGroupIdsSet)[0];
    }

    const majorityGroup = groups.find(g => g.id === majorityGroupId);
    const majorityTag = tags.find(t => t.id === majorityGroupId);
    const dominantColor = majorityGroup?.color || majorityTag?.color || '#4f46e5';

    // Resolve all badge objects
    const connectedBadges: Array<{ id: string; name: string; color?: string }> = [];
    allConnectedGroupIdsSet.forEach(gid => {
      const gObj = groups.find(g => g.id === gid);
      if (gObj) {
        connectedBadges.push({ id: gObj.id, name: gObj.name, color: gObj.color });
      } else {
        const tObj = tags.find(t => t.id === gid);
        if (tObj) {
          connectedBadges.push({ id: tObj.id, name: tObj.name, color: tObj.color });
        }
      }
    });

    // Detailed Item Breakdown List for Popover Breakdown
    const detailedItems: Array<{
      id: string;
      title: string;
      type: 'task' | 'event';
      durationHours: number;
      timeString: string;
      tagName: string;
      tagColor: string;
      isDone: boolean;
      date: string;
    }> = [];

    matchingTasks.forEach(t => {
      const gObj = groups.find(g => g.id === t.groupId);
      const tObj = tags.find(tg => tg.id === t.groupId);
      const duration = getTaskDuration(t);
      const timeStr = t.startTime && t.endTime ? `${t.startTime} - ${t.endTime}` : `${duration.toFixed(1)}h`;
      detailedItems.push({
        id: t.id,
        title: t.title,
        type: 'task',
        durationHours: duration,
        timeString: timeStr,
        tagName: gObj?.name || tObj?.name || 'General',
        tagColor: gObj?.color || tObj?.color || '#64748b',
        isDone: t.status === 'done',
        date: t.date,
      });
    });

    matchingEvents.forEach(e => {
      const gObj = groups.find(g => g.id === e.tagId);
      const tObj = tags.find(tg => tg.id === e.tagId);
      const duration = getEventDuration(e);
      const timeStr = e.startTime && e.endTime ? `${e.startTime} - ${e.endTime}` : `${duration.toFixed(1)}h`;
      detailedItems.push({
        id: e.id,
        title: e.title,
        type: 'event',
        durationHours: duration,
        timeString: timeStr,
        tagName: gObj?.name || tObj?.name || 'Calendar Event',
        tagColor: gObj?.color || tObj?.color || e.color || '#3b82f6',
        isDone: false,
        date: e.date,
      });
    });

    return {
      totalHours,
      taskHours,
      eventHours,
      count: matchingTasks.length + matchingEvents.length,
      dominantColor,
      connectedBadges,
      allConnectedGroupIdsSet,
      detailedItems,
    };
  };

  // Deadline calculation
  const getDeadlineProgress = (goal: Goal) => {
    let dueStr = goal.dueDate;
    if (goal.deadlineType === 'weekly') {
      dueStr = goal.dueDate || getWeeklyDeadline();
    } else if (goal.deadlineType === 'monthly') {
      dueStr = goal.dueDate || getMonthlyDeadline();
    }

    if (!dueStr) {
      return { 
        percentage: 0, 
        daysLeft: 0, 
        formattedDue: 'No deadline', 
        isDueSoon: false, 
        isOverdue: false,
        statusColor: '#94a3b8',
        timelineText: 'No deadline'
      };
    }

    const [dueY, dueM, dueD] = dueStr.split('-').map(Number);
    const dueDay = new Date(dueY, dueM - 1, dueD);
    const now = new Date();
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffMs = dueDay.getTime() - nowDay.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const dueDateObj = new Date(dueY, dueM - 1, dueD, 23, 59, 59);
    const startDateObj = goal.startDate ? new Date(goal.startDate + 'T00:00:00') : new Date(nowDay.getTime() - 7 * 86400000);

    const totalDuration = Math.max(1, dueDateObj.getTime() - startDateObj.getTime());
    const elapsed = Math.max(0, now.getTime() - startDateObj.getTime());
    let percentage = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
    if (diffDays <= 0) {
      percentage = 100;
    }
    
    const formattedDue = dueDay.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    const isOverdue = diffDays < 0;
    const remainingRatio = totalDuration > 0 ? (dueDateObj.getTime() - now.getTime()) / totalDuration : 0;
    
    // Smarter Proportional 3-Stage System (Adapts dynamically to both short-term sprints and long-term multi-month projects)
    // Red: Overdue, last 48 hours, or less than 15% of project duration remains
    const isVerySoon = isOverdue || diffDays <= 2 || remainingRatio <= 0.15;
    // Yellow/Amber: Between 15% and 30% of project duration remains (or 3-5 days for standard cadence)
    const isComingSoon = !isVerySoon && (remainingRatio <= 0.30 || diffDays <= 5);
    // Green: Safe (> 30% of project duration remains)

    let statusColor = '#00ca72'; // Green (Safe)
    if (isVerySoon) {
      statusColor = '#e2445c'; // Red (Due Very Soon / Critical)
    } else if (isComingSoon) {
      statusColor = '#fdab3d'; // Yellow / Amber (Approaching)
    }

    // Full-word sentence formatting with smart space adaptation
    let timelineText = '';
    if (isOverdue) {
      const absDays = Math.abs(diffDays);
      timelineText = absDays === 1 ? '1 Day overdue' : `${absDays} Days overdue`;
    } else if (diffDays === 0) {
      timelineText = 'Due Today';
    } else if (diffDays === 1) {
      timelineText = '1 Day left';
    } else {
      timelineText = `${diffDays} Days left`;
    }

    return {
      percentage,
      daysLeft: diffDays,
      formattedDue,
      isDueSoon: isVerySoon || isComingSoon,
      isVerySoon,
      isComingSoon,
      isOverdue,
      statusColor,
      timelineText,
    };
  };

  // Active vs Completed goals
  const activeGoals = useMemo(() => goals.filter(g => !g.completed), [goals]);
  const completedGoals = useMemo(() => goals.filter(g => g.completed), [goals]);

  // Overall Task & Fraction Review Bar
  const totalGoalHours = useMemo(() => {
    return activeGoals.reduce((sum, g) => sum + getGoalTimeSpent(g).totalHours, 0);
  }, [activeGoals, tasks, events]);

  const totalAllHours = useMemo(() => {
    const tkHours = tasks.reduce((sum, t) => sum + getTaskDuration(t), 0);
    const evHours = events.reduce((sum, e) => sum + getEventDuration(e), 0);
    return Math.max(0.1, tkHours + evHours);
  }, [tasks, events]);

  const goalAlignmentRatio = Math.min(100, Math.round((totalGoalHours / totalAllHours) * 100)) || 0;

  // Month typeahead autocomplete
  const monthQuery = monthInput.trim().toLowerCase();
  const matchingMonths = useMemo(() => {
    if (!monthQuery) return MONTH_NAMES;
    return MONTH_NAMES.filter(m => m.toLowerCase().startsWith(monthQuery));
  }, [monthQuery]);

  const monthSpellingSuggestion = useMemo(() => {
    if (!monthQuery || matchingMonths.length > 0) {
      if (monthQuery.length > 0 && !MONTH_NAMES.some(m => m.toLowerCase() === monthQuery)) {
        let bestMonth = '';
        let bestDistance = 999;
        MONTH_NAMES.forEach(m => {
          const dist = getLevenshteinDistance(monthQuery, m.toLowerCase());
          if (dist < bestDistance) {
            bestDistance = dist;
            bestMonth = m;
          }
        });
        if (bestDistance <= 3) return bestMonth;
      }
      return null;
    }
    return null;
  }, [monthQuery, matchingMonths]);

  // Real-time suggested month name for inline ghost overlay
  const suggestedMonth = useMemo(() => {
    const query = monthInput.trim().toLowerCase();
    if (!query) return '';
    
    // 1. Direct prefix match
    const prefixMatch = MONTH_NAMES.find(m => m.toLowerCase().startsWith(query));
    if (prefixMatch) return prefixMatch;
    
    // 2. Fuzzy match/distance match (handles typos like "step" -> "September", "jna" -> "January")
    let bestMonth = '';
    let minDistance = 999;
    MONTH_NAMES.forEach(m => {
      const prefixOf = m.toLowerCase().slice(0, query.length);
      const dist = getLevenshteinDistance(query, prefixOf);
      if (dist < minDistance) {
        minDistance = dist;
        bestMonth = m;
      }
    });
    
    if (minDistance <= 2) {
      return bestMonth;
    }
    return '';
  }, [monthInput]);

  const suggestedSuffix = useMemo(() => {
    if (!suggestedMonth || !monthInput) return '';
    return suggestedMonth.slice(monthInput.length);
  }, [suggestedMonth, monthInput]);

  const handleMonthChange = (val: string) => {
    if (val.length >= 13) {
      const match = MONTH_NAMES.find(m => m.toLowerCase().startsWith(val.toLowerCase().slice(0, 3)));
      if (!match) {
        setMonthInput('');
        return;
      }
    }
    setMonthInput(val);
    const lower = val.toLowerCase();
    const exactPrefixMatches = MONTH_NAMES.filter(m => m.toLowerCase().startsWith(lower));
    if (exactPrefixMatches.length === 1 && val.length >= 3) {
      setMonthInput(exactPrefixMatches[0]);
    }
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    let computedDueDate: string | undefined;
    if (newDeadlineType === 'weekly') {
      computedDueDate = getWeeklyDeadline();
    } else if (newDeadlineType === 'monthly') {
      computedDueDate = getMonthlyDeadline();
    } else {
      const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === monthInput.trim().toLowerCase());
      const validMonth = monthIdx >= 0 ? monthIdx + 1 : today.getMonth() + 1;
      const validDay = Math.min(31, Math.max(1, parseInt(dayInput, 10) || today.getDate()));
      const validYear = parseInt(yearInput, 10) || today.getFullYear();
      computedDueDate = `${validYear}-${String(validMonth).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
    }

    onAddGoal({
      title: newTitle.trim(),
      color: 'indigo',
      groupIds: newSelectedGroupIds,
      tagIds: newSelectedGroupIds,
      deadlineType: newDeadlineType,
      dueDate: computedDueDate,
      startDate: getLocalISODate(),
      completed: false,
    });

    setNewTitle('');
    setNewSelectedGroupIds([]);
    setNewDeadlineType('weekly');
    setDayInput(String(today.getDate()).padStart(2, '0'));
    setMonthInput(MONTH_NAMES[today.getMonth()]);
    setYearInput(String(today.getFullYear()));
    setIsDayDefault(true);
    setIsMonthDefault(true);
    setIsYearDefault(true);
    setIsAddingGoal(false);
  };

  const handleSaveCustomDate = (goalId: string) => {
    const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === monthInput.trim().toLowerCase());
    const validMonth = monthIdx >= 0 ? monthIdx + 1 : today.getMonth() + 1;
    const validDay = Math.min(31, Math.max(1, parseInt(dayInput, 10) || today.getDate()));
    const validYear = parseInt(yearInput, 10) || today.getFullYear();
    const computedDueDate = `${validYear}-${String(validMonth).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
    
    onUpdateGoal(goalId, {
      deadlineType: 'custom',
      dueDate: computedDueDate,
    });
    setActiveDateGoalId(null);
  };

  const handleToggleGoalGroup = (goal: Goal, groupId: string) => {
    const current = goal.groupIds || goal.tagIds || [];
    const updated = current.includes(groupId)
      ? current.filter(id => id !== groupId)
      : [...current, groupId];
    onUpdateGoal(goal.id, {
      groupIds: updated,
      tagIds: updated,
    });
  };

  const startEditingTitle = (g: Goal) => {
    setEditingTitleId(g.id);
    setEditingTitleText(g.title);
  };

  const saveEditingTitle = (id: string) => {
    if (editingTitleText.trim()) {
      onUpdateGoal(id, { title: editingTitleText.trim() });
    }
    setEditingTitleId(null);
  };

  const renderGoalRow = (g: Goal) => {
    const timeStats = getGoalTimeSpent(g);
    const progress = getDeadlineProgress(g);
    const displayBadges = timeStats.connectedBadges;

    const isDateOpen = activeDateGoalId === g.id;
    const isTagOpen = activeTagGoalId === g.id;
    const isSubSheetOpen = activeTimeBreakdownGoalId === g.id;

    const rowAccentColor = timeStats.dominantColor || (g.completed ? '#10b981' : '#00ca72');

    return (
      <React.Fragment key={g.id}>
        <div className={`flex items-stretch transition-colors text-slate-800 dark:text-slate-200 group relative h-10 ${
          isSubSheetOpen ? 'bg-[#f0f4ff]/50 dark:bg-[#1E293B]/60' : 'bg-white dark:bg-[#0F172A] hover:bg-[#f0f3ff]/30 dark:hover:bg-slate-800/60'
        }`}>
          {/* Left Accent Bar matching Task Group Color + Tick Box */}
          <div className="w-10 flex items-center justify-center border-r border-[#e6e9ef] dark:border-slate-800 shrink-0 relative bg-inherit">
            <span 
              className="w-1.5 h-full absolute left-0 top-0 transition-colors" 
              style={{ backgroundColor: rowAccentColor }}
            />
            <button
              type="button"
              onClick={() => onToggleGoalComplete(g.id)}
              className={`p-1 rounded transition cursor-pointer ${
                g.completed ? 'text-emerald-600 hover:text-slate-400' : 'text-slate-300 dark:text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
              title={g.completed ? "Click to Re-open Target" : "Tick to Complete Target"}
            >
              {g.completed ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
            </button>
          </div>

          {/* Goal Name Cell */}
          <div className="flex-1 min-w-[200px] px-3.5 flex items-center border-r border-[#e6e9ef] dark:border-slate-800 truncate">
            {editingTitleId === g.id ? (
              <input
                type="text"
                value={editingTitleText}
                onChange={(e) => setEditingTitleText(e.target.value)}
                onBlur={() => saveEditingTitle(g.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEditingTitle(g.id);
                  if (e.key === 'Escape') setEditingTitleId(null);
                }}
                autoFocus
                className="w-full text-[13.5px] font-normal text-[#323338] dark:text-slate-100 bg-white dark:bg-slate-800 border border-[#0073ea] rounded px-2 py-0.5 focus:outline-none"
              />
            ) : (
              <div 
                onClick={() => startEditingTitle(g)}
                className={`w-full truncate text-[13.5px] cursor-pointer hover:text-[#0073ea] dark:hover:text-[#60A5FA] ${
                  g.completed ? 'text-slate-400 line-through font-normal' : 'font-normal text-[#323338] dark:text-slate-100'
                }`}
                title="Click to edit name"
              >
                {g.title}
              </div>
            )}
          </div>

          {/* Task Group Column: Multi-Tag Layout */}
          <div className="w-44 p-[3px] flex items-center justify-center border-r border-[#e6e9ef] relative">
            <button
              type="button"
              data-tag-btn="true"
              onClick={() => setActiveTagGoalId(isTagOpen ? null : g.id)}
              className="w-full h-full rounded flex items-center justify-center transition overflow-hidden cursor-pointer shadow-2xs hover:opacity-95"
              title={displayBadges.map(b => b.name).join(', ') || 'Click to assign task groups'}
            >
              {displayBadges.length === 0 ? (
                <div className="w-full h-full bg-[#c4c4c4] rounded flex items-center justify-center text-white/90 text-xs font-normal">
                  + Task Group
                </div>
              ) : displayBadges.length === 1 ? (
                <div 
                  className="w-full h-full rounded flex items-center justify-center px-2 text-[13px] font-medium text-white truncate"
                  style={{ backgroundColor: displayBadges[0].color || rowAccentColor }}
                >
                  <span className="truncate">{displayBadges[0].name}</span>
                </div>
              ) : displayBadges.length === 2 ? (
                <div className="w-full h-full flex items-center gap-[2px] overflow-hidden">
                  <div 
                    className="flex-1 h-full rounded-l flex items-center justify-center px-1 text-xs font-medium text-white truncate"
                    style={{ backgroundColor: displayBadges[0].color || rowAccentColor }}
                  >
                    <span className="truncate">{displayBadges[0].name}</span>
                  </div>
                  <div 
                    className="flex-1 h-full rounded-r flex items-center justify-center px-1 text-xs font-medium text-white truncate"
                    style={{ backgroundColor: displayBadges[1].color || '#6366f1' }}
                  >
                    <span className="truncate">{displayBadges[1].name}</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center gap-[2px] overflow-hidden">
                  <div 
                    className="flex-1 h-full rounded-l flex items-center justify-center px-1.5 text-xs font-medium text-white truncate"
                    style={{ backgroundColor: displayBadges[0].color || rowAccentColor }}
                  >
                    <span className="truncate">{displayBadges[0].name}</span>
                  </div>
                  <div 
                    className="w-8 h-full rounded-r flex items-center justify-center px-1 text-[11px] font-bold text-white shrink-0 bg-slate-600"
                  >
                    +{displayBadges.length - 1}
                  </div>
                </div>
              )}
            </button>

            {/* Tag Selection Popover */}
            {isTagOpen && (
              <div ref={tagPopoverRef} className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-[#0F172A] border border-[#d0d4e4] dark:border-slate-800 rounded-md shadow-xl z-30 p-2.5 text-xs">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>Select Task Groups</span>
                  <button onClick={() => setActiveTagGoalId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1 max-h-44 overflow-y-auto">
                  {groups.map(grp => {
                    const isSelected = timeStats.allConnectedGroupIdsSet.has(grp.id);
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => handleToggleGoalGroup(g, grp.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition cursor-pointer text-xs ${
                          isSelected ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: grp.color || '#4f46e5' }} />
                          <span className="font-medium">{grp.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Time Spent Column */}
          <div className="w-32 px-1 flex items-center justify-center border-r border-[#e6e9ef] dark:border-slate-800 relative">
            <button
              type="button"
              onClick={() => setActiveTimeBreakdownGoalId(isSubSheetOpen ? null : g.id)}
              className={`w-full h-8 flex items-center justify-center gap-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer ${
                isSubSheetOpen ? 'bg-indigo-100/70 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-200 font-semibold' : 'text-[#323338] dark:text-slate-100'
              }`}
              title="Click arrow to expand secondary sub-sheet of tasks"
            >
              <span className="text-[13px] font-normal">{timeStats.totalHours.toFixed(1)} hrs</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isSubSheetOpen ? 'rotate-180 text-indigo-700 dark:text-indigo-300 font-bold' : ''}`} />
            </button>
          </div>

          {/* Timeline Column */}
          <div className="w-40 px-3 flex items-center justify-center border-r border-[#e6e9ef]">
            <div 
              className="w-full h-5 bg-[#e0e5ed] rounded-full overflow-hidden relative cursor-default group/prog flex items-center"
              title={g.completed ? 'Completed' : progress.timelineText}
            >
              <div
                className="h-full transition-all duration-300 rounded-full flex items-center justify-center"
                style={{ 
                  width: `${g.completed ? 100 : Math.max(5, progress.percentage)}%`,
                  backgroundColor: g.completed ? '#00ca72' : ((progress.isOverdue || progress.daysLeft === 0) ? '#e2445c' : '#0073ea')
                }}
              >
                {(g.completed || progress.percentage >= 45) && (
                  <span className="text-[10px] font-bold text-white tracking-wide truncate px-1 drop-shadow-2xs select-none">
                    {g.completed ? 'Completed' : progress.timelineText}
                  </span>
                )}
              </div>

              {!g.completed && progress.percentage < 45 && (
                <span className="absolute right-2 text-[10px] font-bold text-[#44475b] tracking-wide select-none">
                  {progress.timelineText}
                </span>
              )}
            </div>
          </div>

          {/* Due Date Column */}
          <div className="w-36 p-[3px] flex items-center justify-center border-r border-[#e6e9ef] relative">
            <button
              type="button"
              data-date-btn="true"
              onClick={() => {
                if (!isDateOpen && g.dueDate) {
                  const [y, m, d] = g.dueDate.split('-');
                  if (y && m && d) {
                    setDayInput(d);
                    setMonthInput(MONTH_NAMES[parseInt(m, 10) - 1] || MONTH_NAMES[0]);
                    setYearInput(y);
                  }
                }
                setActiveDateGoalId(isDateOpen ? null : g.id);
              }}
              className="w-full h-full rounded flex items-center justify-center px-2 text-[13px] font-medium text-white transition cursor-pointer shadow-2xs hover:opacity-95"
              style={{
                backgroundColor: g.completed ? '#00ca72' : progress.statusColor
              }}
              title={`Deadline: ${progress.formattedDue} (${g.completed ? 'Completed' : progress.timelineText})`}
            >
              <span className="truncate">{g.completed ? 'Completed' : progress.formattedDue}</span>
            </button>

            {/* Smart Custom Date Popover */}
            {isDateOpen && (
              <div ref={datePopoverRef} className="absolute top-full right-0 mt-1 w-72 bg-white border border-[#b8c0d9] rounded-md shadow-2xl z-50 p-3 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-700 text-xs uppercase tracking-wide">Set Deadline</span>
                  <button onClick={() => setActiveDateGoalId(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateGoal(g.id, { deadlineType: 'weekly', dueDate: getWeeklyDeadline() });
                      setActiveDateGoalId(null);
                    }}
                    className="px-2 py-1.5 text-xs font-medium border rounded bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer text-center"
                  >
                    Weekly (Sun)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateGoal(g.id, { deadlineType: 'monthly', dueDate: getMonthlyDeadline() });
                      setActiveDateGoalId(null);
                    }}
                    className="px-2 py-1.5 text-xs font-medium border rounded bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer text-center"
                  >
                    Month End
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-2 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-600">Custom Date Entry:</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      maxLength={2}
                      value={dayInput}
                      onFocus={() => {
                        if (isDayDefault) {
                          setDayInput('');
                          setIsDayDefault(false);
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setDayInput(val);
                        if (val.length === 2 && monthInputRef.current) monthInputRef.current.focus();
                      }}
                      placeholder="DD"
                      className="w-10 text-center font-bold bg-white border border-slate-300 rounded py-1.5 text-xs focus:outline-none focus:border-[#0073ea]"
                    />

                    <div className="relative flex-1">
                      <input
                        ref={monthInputRef}
                        type="text"
                        value={monthInput}
                        onFocus={() => {
                          if (isMonthDefault) {
                            setMonthInput('');
                            setIsMonthDefault(false);
                          }
                        }}
                        onChange={(e) => handleMonthChange(e.target.value)}
                        placeholder="Month"
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#0073ea]"
                      />

                      {matchingMonths.length > 0 && matchingMonths.length < 12 && monthInput.length >= 1 && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-300 rounded shadow-xl z-50 py-1 max-h-32 overflow-y-auto">
                          {matchingMonths.map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setMonthInput(m);
                                if (yearInputRef.current) yearInputRef.current.focus();
                              }}
                              className="w-full text-left px-2.5 py-1 text-xs hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <input
                      ref={yearInputRef}
                      type="text"
                      maxLength={4}
                      value={yearInput}
                      onFocus={() => {
                        if (isYearDefault) {
                          setYearInput('');
                          setIsYearDefault(false);
                        }
                      }}
                      onChange={(e) => setYearInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="YYYY"
                      className="w-14 text-center font-bold bg-white border border-slate-300 rounded py-1.5 text-xs focus:outline-none focus:border-[#0073ea]"
                    />
                  </div>

                  {monthSpellingSuggestion && (
                    <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Did you mean:</span>
                      <button
                        type="button"
                        onClick={() => setMonthInput(monthSpellingSuggestion)}
                        className="font-bold underline cursor-pointer"
                      >
                        {monthSpellingSuggestion}
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSaveCustomDate(g.id)}
                    className="w-full mt-2 py-1.5 bg-[#0073ea] text-white text-xs font-bold rounded hover:bg-[#0060c0] cursor-pointer shadow-xs"
                  >
                    Set Custom Date
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions (Delete) */}
          <div className="w-10 flex items-center justify-center shrink-0">
            <button
              type="button"
              onClick={() => onDeleteGoal(g.id)}
              className="p-1 text-slate-300 hover:text-rose-600 transition cursor-pointer"
              title="Delete Target"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NESTED SECONDARY SHEET */}
        {isSubSheetOpen && (
          <div className="bg-[#f8f9fc] dark:bg-[#131C31] border-b border-[#d0d4e4] dark:border-slate-800 px-8 py-3 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#0F172A] border border-[#d0d4e4] dark:border-slate-800 rounded-md overflow-hidden shadow-xs">
              <div className="flex items-center justify-between px-3 py-2 bg-[#f0f3fa] dark:bg-[#1E293B] border-b border-[#d0d4e4] dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 tracking-wider">
                <div className="flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-indigo-600 dark:text-[#60A5FA] shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{g.title}</span>
                </div>
                <span className="text-slate-500 dark:text-slate-400 font-sans tabular-nums text-xs lowercase">
                  {timeStats.detailedItems.length} {timeStats.detailedItems.length === 1 ? 'task' : 'tasks'} • {timeStats.totalHours.toFixed(1)} hrs total
                </span>
              </div>

              <div className="flex items-center bg-[#fafbfc] dark:bg-[#1A233A] border-b border-[#e6e9ef] dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 py-1.5 px-3">
                <div className="flex-1 min-w-[180px] text-left">Task Title</div>
                <div className="w-36 text-center">Type</div>
                <div className="w-28 text-center">Time Logged</div>
                <div className="w-28 text-center">Date</div>
                <div className="w-20 text-center">Status</div>
              </div>

              {timeStats.detailedItems.length === 0 ? (
                <div className="py-6 px-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                  No tasks linked to this target yet. When you create or assign tasks with this target, they will auto-sync here.
                </div>
              ) : (
                <div className="divide-y divide-[#f0f3fa] dark:divide-slate-800">
                  {timeStats.detailedItems.map(item => (
                    <div key={item.id} className="flex items-center py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
                      <div className="flex-1 min-w-[180px] flex items-center gap-2 font-medium truncate">
                        {item.type === 'task' ? (
                          <ListTodo className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        ) : (
                          <CalendarDays className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        )}
                        <span className={`truncate ${item.isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                          {item.title}
                        </span>
                      </div>

                      <div className="w-36 flex items-center justify-center">
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-medium text-white truncate max-w-[130px]"
                          style={{ backgroundColor: item.tagColor }}
                        >
                          {item.tagName}
                        </span>
                      </div>

                      <div className="w-28 text-center font-sans tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                        {item.timeString}
                      </div>

                      <div className="w-28 text-center text-slate-500 dark:text-slate-400 text-[11px] font-sans tabular-nums">
                        {item.date || 'Anytime'}
                      </div>

                      <div className="w-20 flex items-center justify-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.isDone ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          {item.isDone ? 'Completed' : 'To Do'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50 dark:bg-[#070A11] p-5 sm:p-6 pb-96 font-sans text-slate-800 dark:text-[#F4F4F5] transition-colors duration-200" id="monday-goals-view">
      
      {/* Title & Compact Fraction Review Bar (Right under Title, No bulky descriptions) */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3" id="goals-header-bar">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5 shrink-0">
            <Target className="w-6 h-6 text-[#0066FF] dark:text-[#60A5FA]" />
            <span>Targets</span>
          </h1>
          <ActiveTaskHeaderBadge task={activeFocusTask || null} isRunning={isFocusRunning} onClick={onNavigateToFocus} />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setIsAddingGoal(!isAddingGoal);
              setNewDeadlineType('custom');
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0073ea] hover:bg-[#0060c0] text-white text-xs font-bold rounded-md shadow-xs transition cursor-pointer"
            id="new-goal-monday-btn"
          >
            <Plus className="w-4 h-4" />
            <span>New Target</span>
          </button>
        </div>
      </div>

      {/* Monday.com Quick Add Row Box */}
      {isAddingGoal && (
        <form 
          ref={addGoalFormRef} 
          onSubmit={handleCreateGoal} 
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsAddingGoal(false);
            }
          }}
          className="mb-5 bg-white border-2 border-[#0073ea] rounded-md p-4 shadow-sm animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Create New Target</span>
            <span className="text-xs font-medium text-slate-500 italic bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
              Auto-connects to tasks added
            </span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-2.5">
            <input
              ref={titleInputRef}
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setNewDeadlineType('custom');
                  setTimeout(() => {
                    dayInputRef.current?.focus();
                    dayInputRef.current?.select();
                  }, 10);
                }
              }}
              placeholder="Type Target Name..."
              className="flex-1 text-sm border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-[#0073ea] min-w-[200px]"
              autoFocus
            />

            {/* Cadence Selection */}
            <select
              value={newDeadlineType}
              onChange={(e) => setNewDeadlineType(e.target.value as any)}
              className="text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-700 font-medium cursor-pointer"
            >
              <option value="weekly">Weekly (Clears Sunday)</option>
              <option value="monthly">Monthly (End of month)</option>
              <option value="custom">Custom Date</option>
            </select>

            {/* Segmented Date Input when Custom is selected */}
            {newDeadlineType === 'custom' && (
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded border border-slate-300">
                <input
                  ref={dayInputRef}
                  type="text"
                  maxLength={2}
                  value={dayInput}
                  onFocus={() => {
                    if (isDayDefault) {
                      setDayInput('');
                      setIsDayDefault(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setTimeout(() => {
                        monthInputRef.current?.focus();
                        monthInputRef.current?.select();
                      }, 10);
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setDayInput(val);
                    if (val.length === 2 && monthInputRef.current) monthInputRef.current.focus();
                  }}
                  placeholder="DD"
                  className="w-9 text-center font-bold bg-white border border-slate-300 rounded py-1 text-xs focus:outline-none focus:border-[#0073ea]"
                />

                <div className="relative flex items-center">
                  {/* Inline ghost text typeahead autocomplete */}
                  {suggestedMonth && monthInput.length > 0 && (
                    <div className="absolute inset-y-0 left-0 flex items-center px-2 pointer-events-none select-none text-xs font-sans z-0">
                      <span className="text-transparent whitespace-pre">{monthInput}</span>
                      <span className="text-slate-400 opacity-60">
                        {suggestedSuffix}
                      </span>
                    </div>
                  )}
                  <input
                    ref={monthInputRef}
                    type="text"
                    value={monthInput}
                    onFocus={() => {
                      if (isMonthDefault) {
                        setMonthInput('');
                        setIsMonthDefault(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (suggestedMonth) {
                          setMonthInput(suggestedMonth);
                        }
                        if (isYearDefault || !yearInput) {
                          setYearInput(String(today.getFullYear()));
                          setIsYearDefault(false);
                        }
                        setTimeout(() => {
                          yearInputRef.current?.focus();
                          yearInputRef.current?.select();
                        }, 10);
                      }
                    }}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    placeholder="Month"
                    className="w-24 bg-transparent border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#0073ea] relative z-10"
                  />
                  {matchingMonths.length > 0 && matchingMonths.length < 12 && monthInput.length >= 1 && (
                    <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-slate-300 rounded shadow-lg z-50 py-1 max-h-32 overflow-y-auto">
                      {matchingMonths.map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setMonthInput(m);
                            if (yearInputRef.current) yearInputRef.current.focus();
                          }}
                          className="w-full text-left px-2.5 py-1 text-xs hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <input
                  ref={yearInputRef}
                  type="text"
                  maxLength={4}
                  value={yearInput}
                  onFocus={() => {
                    if (isYearDefault) {
                      setYearInput('');
                      setIsYearDefault(false);
                    }
                  }}
                  onChange={(e) => setYearInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="YYYY"
                  className="w-14 text-center font-bold bg-white border border-slate-300 rounded py-1 text-xs focus:outline-none focus:border-[#0073ea]"
                />
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="submit"
                className="px-4 py-2 bg-[#0073ea] text-white text-xs font-bold rounded hover:bg-[#0060c0] cursor-pointer shadow-xs"
              >
                Add Target
              </button>
              <button
                type="button"
                onClick={() => setIsAddingGoal(false)}
                className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Main Monday.com Style Spreadsheet Grid Table */}
      <div className="bg-white dark:bg-[#0F172A] border border-[#d0d4e4] dark:border-slate-800 rounded-md shadow-2xs mb-6" id="monday-sheets-table">
        
        {/* Table Header Row (Monday.com Grid Columns) */}
        <div className="flex items-center bg-[#F5F6F8] dark:bg-[#1E293B] border-b border-[#d0d4e4] dark:border-slate-800 text-[#676879] dark:text-slate-300 text-xs font-semibold select-none min-w-[780px] h-9 rounded-t-md">
          
          {/* Left Checkbox Column Header */}
          <div className="w-10 h-full flex items-center justify-center border-r border-[#d0d4e4] dark:border-slate-800 bg-[#F5F6F8] dark:bg-[#1E293B] shrink-0">
            <Square className="w-4 h-4 text-slate-400" />
          </div>

          {/* Target Name Column */}
          <div className="flex-1 min-w-[200px] px-3.5 py-1.5 border-r border-[#d0d4e4] dark:border-slate-800 truncate text-left font-medium">
            Target Name
          </div>

          {/* Task Group Column (Renamed from Task Tags) */}
          <div className="w-44 px-2 py-1.5 border-r border-[#d0d4e4] dark:border-slate-800 truncate text-center font-medium">
            Task Group
          </div>

          {/* Time Spent Column */}
          <div className="w-32 px-2 py-1.5 border-r border-[#d0d4e4] dark:border-slate-800 truncate text-center font-medium">
            Time Spent
          </div>

          {/* Timeline Column (Renamed from Progress) */}
          <div className="w-40 px-2 py-1.5 border-r border-[#d0d4e4] dark:border-slate-800 truncate text-center font-medium">
            Timeline
          </div>

          {/* Due Date Column */}
          <div className="w-36 px-2 py-1.5 border-r border-[#d0d4e4] dark:border-slate-800 truncate text-center font-medium">
            Due Date
          </div>

          {/* Delete Action Column */}
          <div className="w-10 px-1 py-1.5 text-center shrink-0">
            <span className="sr-only">Actions</span>
          </div>
        </div>

        {/* Rows (Monday.com exact 38px / h-10 row height) - Stretched list scrolling on the entire page */}
        {activeGoals.length === 0 ? (
          <div className="p-10 text-center bg-white dark:bg-[#0F172A] text-slate-400 dark:text-slate-500 text-sm">
            No active targets. Click <span className="font-bold text-[#0073ea]">New Target</span> to add one.
          </div>
        ) : (
          <div className="divide-y divide-[#e6e9ef] dark:divide-slate-800 min-w-[780px]">
            {activeGoals.map(renderGoalRow)}
          </div>
        )}
      </div>

      {/* Collapsible Completed & Past Goals History Drawer */}
      <div className="bg-white dark:bg-[#0F172A] border border-[#d0d4e4] dark:border-slate-800 rounded-md overflow-hidden shadow-2xs mb-8" id="completed-goals-drawer">
        <button
          type="button"
          onClick={() => setIsCompletedDrawerOpen(!isCompletedDrawerOpen)}
          className="w-full px-5 py-3.5 flex items-center justify-between bg-[#F5F6F8] dark:bg-[#1E293B] hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer text-left select-none"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
            <span className="text-sm font-bold text-[#323338] dark:text-slate-100">
              Completed Targets History
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {completedGoals.length}
            </span>
          </div>

          <div className="text-slate-400">
            {isCompletedDrawerOpen ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
          </div>
        </button>

        {isCompletedDrawerOpen && (
          <div className="border-t border-[#d0d4e4] dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-x-auto">
            {completedGoals.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-5 italic">
                No completed targets yet.
              </div>
            ) : (
              <div className="divide-y divide-[#e6e9ef] dark:divide-slate-800">
                {/* Header Bar inside Completed History */}
                <div className="flex items-center bg-[#F5F6F8] dark:bg-[#1E293B] border-b border-[#d0d4e4] dark:border-slate-800 text-[#676879] dark:text-slate-300 text-xs font-semibold select-none min-w-[780px] h-9">
                  <div className="w-10 h-full flex items-center justify-center border-r border-[#d0d4e4] dark:border-slate-800 bg-[#F5F6F8] dark:bg-[#1E293B] shrink-0">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-[200px] px-3.5 py-1.5 border-r border-[#d0d4e4] dark:border-slate-800 truncate text-left font-medium">Target Name</div>
                  <div className="w-44 px-2 py-1.5 border-r border-[#d0d4e4] dark:border-slate-800 truncate text-center font-medium">Task Group</div>
                  <div className="w-32 px-2 py-1.5 border-r border-[#d0d4e4] dark:border-slate-800 truncate text-center font-medium">Time Spent</div>
                  <div className="w-40 px-2 py-1.5 border-r border-[#d0d4e4] dark:border-slate-800 truncate text-center font-medium">Timeline</div>
                  <div className="w-36 px-2 py-1.5 border-r border-[#d0d4e4] dark:border-slate-800 truncate text-center font-medium">Due Date</div>
                  <div className="w-10 px-1 py-1.5 text-center shrink-0"><span className="sr-only">Actions</span></div>
                </div>

                {/* Completed Goal Rows mapped straight without nested scrolls */}
                <div className="divide-y divide-[#e6e9ef] dark:divide-slate-800 min-w-[780px]">
                  {completedGoals.map(renderGoalRow)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Extra empty breathing room spacer at the bottom to ensure complete scrolling */}
      <div className="h-96 shrink-0" id="goals-scroll-spacer-breathing-room" />
    </div>
  );
}
