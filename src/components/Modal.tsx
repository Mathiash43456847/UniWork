/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Calendar,
  Clock,
  Tag as TagIcon,
  AlignLeft,
  CheckSquare,
  ListTodo,
  Trash2,
  Check,
  Target,
  Repeat,
  ChevronDown,
  GripHorizontal
} from 'lucide-react';
import { Tag, CalendarEvent, Task, TaskStatus, Goal, TaskGroup, getLocalISODate } from '../types';

const GOOGLE_COLORS = [
  { name: 'Default', hex: '' },
  { name: 'Blue', hex: '#039be5' },
  { name: 'Green', hex: '#0b8043' },
  { name: 'Purple', hex: '#8e24aa' },
  { name: 'Red', hex: '#d50000' },
  { name: 'Yellow', hex: '#f6bf26' },
  { name: 'Orange', hex: '#f4511e' },
  { name: 'Gray', hex: '#616161' },
];

const DAYS_OF_WEEK = [
  { label: 'M', value: 1, fullName: 'Monday' },
  { label: 'T', value: 2, fullName: 'Tuesday' },
  { label: 'W', value: 3, fullName: 'Wednesday' },
  { label: 'T', value: 4, fullName: 'Thursday' },
  { label: 'F', value: 5, fullName: 'Friday' },
  { label: 'S', value: 6, fullName: 'Saturday' },
  { label: 'S', value: 0, fullName: 'Sunday' },
];

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
  groups: TaskGroup[];
  goals?: Goal[];
  defaultDate?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  editMode: boolean;
  editItemType?: 'event' | 'task';
  editItem?: CalendarEvent | Task | null;
  occurrenceDate?: string;
  anchorPosition?: { top: number; left: number; right: number; bottom: number; width: number; height: number } | null;
  onSaveEvent: (eventData: Omit<CalendarEvent, 'id'>, id?: string) => void;
  onSaveTask: (taskData: Omit<Task, 'id'>, id?: string) => void;
  onSplitRecurringEvent?: (recurringEventId: string, exceptDate: string, singleEventData: Omit<CalendarEvent, 'id'>) => void;
  onUpdateRecurringSeries?: (eventId: string, updates: Partial<CalendarEvent>) => void;
  onDeleteEvent: (id: string) => void;
  onDeleteTask: (id: string, hardDelete?: boolean) => void;
  recurrenceBehavior?: 'ask' | 'one' | 'all';
  onSaveRecurrenceBehavior?: (behavior: 'ask' | 'one' | 'all') => void;
  onTimeChange?: (date: string, startTime: string, endTime: string) => void;
  tasks?: Task[];
}

export default function Modal({
  isOpen,
  onClose,
  tags,
  groups,
  goals = [],
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  editMode,
  editItemType,
  editItem,
  occurrenceDate,
  anchorPosition,
  onSaveEvent,
  onSaveTask,
  onSplitRecurringEvent,
  onUpdateRecurringSeries,
  onDeleteEvent,
  onDeleteTask,
  recurrenceBehavior = 'ask',
  onSaveRecurrenceBehavior,
  onTimeChange,
  tasks = [],
}: ModalProps) {
  const [activeType, setActiveType] = useState<'event' | 'task'>('task');

  // Recurrence confirmation states
  const [showRecurrenceSavePrompt, setShowRecurrenceSavePrompt] = useState(false);
  const [showRecurrenceDeletePrompt, setShowRecurrenceDeletePrompt] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<Omit<CalendarEvent, 'id'> | null>(null);
  const [recurrenceSaveChoice, setRecurrenceSaveChoice] = useState<'one' | 'all'>('one');
  const [recurrenceDeleteChoice, setRecurrenceDeleteChoice] = useState<'one' | 'all'>('one');

  // Form Fields State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [tagId, setTagId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('todo');
  const [color, setColor] = useState('');
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [goalId, setGoalId] = useState('');
  const [isRepeatDropdownOpen, setIsRepeatDropdownOpen] = useState(false);
  const [isTargetDropdownOpen, setIsTargetDropdownOpen] = useState(false);
  const [showOtherTargets, setShowOtherTargets] = useState(false);
  const targetDropdownRef = useRef<HTMLDivElement>(null);
  const targetTriggerBtnRef = useRef<HTMLButtonElement>(null);
  const targetMenuRef = useRef<HTMLDivElement>(null);
  const [targetMenuCoords, setTargetMenuCoords] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

  // High-fidelity Daily Task Custom Dropdown state & refs
  const [isDailyTaskDropdownOpen, setIsDailyTaskDropdownOpen] = useState(false);
  const [showAllPlannedDailyTasks, setShowAllPlannedDailyTasks] = useState(false);
  const dailyTaskDropdownRef = useRef<HTMLDivElement>(null);
  const dailyTaskTriggerBtnRef = useRef<HTMLButtonElement>(null);
  const dailyTaskMenuRef = useRef<HTMLDivElement>(null);
  const [dailyTaskMenuCoords, setDailyTaskMenuCoords] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<'down' | 'up'>('down');
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Active Category Name (Task Group or Tag)
  const currentGroup = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);
  const currentTag = useMemo(() => tags.find((t) => t.id === tagId), [tags, tagId]);
  const activeCategoryName = activeType === 'task' ? (currentGroup?.name || '') : (currentTag?.name || '');

  // Active non-completed targets only
  const activeGoals = useMemo(() => (goals || []).filter((g) => !g.completed), [goals]);

  // Calculate screen position for top-layer floating dropdown (Downward priority)
  const updateTargetDropdownCoords = () => {
    if (targetTriggerBtnRef.current) {
      const rect = targetTriggerBtnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Default downward; only flip upward if space below is < 220 and space above is greater
      const renderAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
      
      setDropdownDirection(renderAbove ? 'up' : 'down');
      if (renderAbove) {
        setTargetMenuCoords({
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          width: Math.max(240, rect.width),
        });
      } else {
        setTargetMenuCoords({
          top: rect.bottom + 4,
          left: rect.left,
          width: Math.max(240, rect.width),
        });
      }
    }
  };

  const toggleTargetDropdown = () => {
    if (!isTargetDropdownOpen) {
      updateTargetDropdownCoords();
    }
    setIsTargetDropdownOpen(!isTargetDropdownOpen);
  };

  const updateDailyTaskDropdownCoords = () => {
    if (dailyTaskTriggerBtnRef.current) {
      const rect = dailyTaskTriggerBtnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const renderAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
      
      if (renderAbove) {
        setDailyTaskMenuCoords({
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          width: Math.max(260, rect.width),
        });
      } else {
        setDailyTaskMenuCoords({
          top: rect.bottom + 4,
          left: rect.left,
          width: Math.max(260, rect.width),
        });
      }
    }
  };

  const toggleDailyTaskDropdown = () => {
    if (!isDailyTaskDropdownOpen) {
      updateDailyTaskDropdownCoords();
    }
    setIsDailyTaskDropdownOpen(!isDailyTaskDropdownOpen);
  };

  // Organize goals into Recommended vs Other based on active Task Group / Tag
  const { recommendedGoals, otherGoals } = useMemo(() => {
    if (!activeGoals || activeGoals.length === 0) return { recommendedGoals: [], otherGoals: [] };

    const rec: Goal[] = [];
    const oth: Goal[] = [];
    const categoryLower = activeCategoryName.trim().toLowerCase();

    activeGoals.forEach((g) => {
      let isMatch = false;

      if (activeType === 'task') {
        if (g.groupIds && g.groupIds.includes(groupId)) {
          isMatch = true;
        }
      } else {
        if (g.tagIds && g.tagIds.includes(tagId)) {
          isMatch = true;
        }
      }

      if (!isMatch && categoryLower) {
        const goalTitleLower = g.title.toLowerCase();
        if (goalTitleLower.includes(categoryLower) || categoryLower.includes(goalTitleLower)) {
          isMatch = true;
        }
      }

      if (isMatch) {
        rec.push(g);
      } else {
        oth.push(g);
      }
    });

    if (rec.length === 0 && oth.length > 0) {
      const unassigned = oth.filter((g) => (!g.groupIds || g.groupIds.length === 0) && (!g.tagIds || g.tagIds.length === 0));
      if (unassigned.length > 0) {
        return {
          recommendedGoals: unassigned,
          otherGoals: oth.filter((g) => !unassigned.includes(g)),
        };
      }
      return { recommendedGoals: oth, otherGoals: [] };
    }

    return { recommendedGoals: rec, otherGoals: oth };
  }, [activeGoals, groupId, tagId, activeType, activeCategoryName]);

  // Instant auto-selection of top recommended target when task group or tag category changes
  useEffect(() => {
    if (isOpen && recommendedGoals.length > 0) {
      setGoalId(recommendedGoals[0].id);
    }
  }, [groupId, tagId, activeType, isOpen]);

  // Reset target dropdown toggle when modal or group changes
  useEffect(() => {
    setIsTargetDropdownOpen(false);
    setShowOtherTargets(false);
    setIsDailyTaskDropdownOpen(false);
    setShowAllPlannedDailyTasks(false);
  }, [isOpen, groupId, tagId, activeType]);

  // Recalculate dropdown position when section expands
  useEffect(() => {
    if (isTargetDropdownOpen) {
      updateTargetDropdownCoords();
    }
  }, [showOtherTargets]);

  // Window scroll / resize handler to keep floating menu aligned
  useEffect(() => {
    if (!isTargetDropdownOpen) return;
    const handleScrollOrResize = () => {
      updateTargetDropdownCoords();
    };
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isTargetDropdownOpen]);

  // Window scroll / resize handler to keep Daily Task floating menu aligned
  useEffect(() => {
    if (!isDailyTaskDropdownOpen) return;
    const handleScrollOrResize = () => {
      updateDailyTaskDropdownCoords();
    };
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isDailyTaskDropdownOpen]);

  // Click outside listener for top-layer target and Daily Task dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        targetDropdownRef.current && !targetDropdownRef.current.contains(e.target as Node) &&
        targetMenuRef.current && !targetMenuRef.current.contains(e.target as Node)
      ) {
        setIsTargetDropdownOpen(false);
      }
      if (
        dailyTaskDropdownRef.current && !dailyTaskDropdownRef.current.contains(e.target as Node) &&
        dailyTaskMenuRef.current && !dailyTaskMenuRef.current.contains(e.target as Node)
      ) {
        setIsDailyTaskDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load editing item or reset fields
  useEffect(() => {
    if (isOpen) {
      setDragPosition(null);
      setShowRecurrenceSavePrompt(false);
      setShowRecurrenceDeletePrompt(false);
      setPendingSaveData(null);
      setRecurrenceSaveChoice('one');
      setRecurrenceDeleteChoice('one');
      setIsRepeatDropdownOpen(false);

      if (editMode && editItem && editItemType) {
        setActiveType(editItemType);
        setTitle(editItem.title || '');
        setDescription(editItem.description || '');
        setDate(occurrenceDate || editItem.date || getLocalISODate());
        setGoalId(editItem.goalId || '');

        if (editItemType === 'event') {
          const ev = editItem as CalendarEvent;
          setStartTime(ev.startTime || '09:00');
          setEndTime(ev.endTime || '10:00');
          setTagId(ev.tagId || tags[0]?.id || '');
          setColor(ev.color || '');
          setRecurringDays(ev.recurringDays || []);
        } else {
          const t = editItem as Task;
          setStartTime(t.startTime || t.time || '');
          setEndTime(t.endTime || '');
          setGroupId(t.groupId || groups[0]?.id || 'group-1');
          setTaskStatus(t.status || 'todo');
          setColor(t.color || '');
          setRecurringDays([]);
        }
      } else {
        // Create Mode
        setActiveType('task');
        setTitle('');
        setDescription('');
        setDate(defaultDate || getLocalISODate());
        setStartTime(defaultStartTime || '');
        setEndTime(defaultEndTime || '');
        setTagId(tags[0]?.id || '');
        setGroupId(groups[0]?.id || 'group-1');
        setTaskStatus('todo');
        setColor('');
        setRecurringDays([]);
      }

      // Auto-focus title input
      setTimeout(() => {
        titleInputRef.current?.focus({ preventScroll: true });
      }, 50);
    }
  }, [isOpen, editMode, editItem, editItemType, defaultDate, defaultStartTime, defaultEndTime, occurrenceDate, tags, groups]);

  // Handle escape key and click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('#google-timeblock-card') && !target.closest('.group') && !target.closest('.cursor-ns-resize')) {
          onClose();
        }
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, onClose]);

  // Compute dynamic popover position beside the clicked time block or at custom drag position
  const computedStyle = useMemo<React.CSSProperties>(() => {
    if (typeof window === 'undefined') {
      return {};
    }

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const cardWidth = Math.min(520, viewportW - 24); // fit viewport width nicely with room for single-line time + duration

    // If user has dragged the settings card, position at exact drag coordinates
    if (dragPosition) {
      return {
        position: 'fixed',
        top: `${dragPosition.y}px`,
        left: `${dragPosition.x}px`,
        width: `${cardWidth}px`,
        maxHeight: `${Math.max(300, viewportH - dragPosition.y - 12)}px`,
        zIndex: 9999,
      };
    }

    if (!anchorPosition) {
      return {};
    }

    const gap = 12;

    // Prefer placing directly to the right of the time block; if insufficient space, place to the left
    let left = anchorPosition.right + gap;
    if (left + cardWidth > viewportW - 16) {
      left = anchorPosition.left - cardWidth - gap;
    }

    // If still offscreen horizontally on small mobile screens, center within window
    if (left < 12) {
      left = Math.max(12, Math.min(left, viewportW - cardWidth - 12));
    }
    if (viewportW <= 640) {
      left = Math.max(12, (viewportW - cardWidth) / 2);
    }

    // Vertical positioning:
    // Default top expands all the way up to the top banner space (16px from viewport top)
    // so the time block settings card expands into the top banner space cleanly as requested!
    let top = 16;
    if (anchorPosition) {
      top = Math.max(12, Math.min(16, anchorPosition.top - 16));
    }

    // Compute exact available height without exceeding the screen
    const maxAvailableHeight = Math.max(300, viewportH - top - 16);

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
      maxHeight: `${maxAvailableHeight}px`,
      zIndex: 9999,
    };
  }, [anchorPosition, isOpen, activeType, dragPosition]);

  // Header drag handler to move card around the viewport
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) {
      return;
    }

    const currentCard = cardRef.current;
    if (!currentCard) return;

    const rect = currentCard.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = rect.left;
    const initialY = rect.top;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      setDragPosition({
        x: Math.max(8, Math.min(window.innerWidth - 100, initialX + deltaX)),
        y: Math.max(8, Math.min(window.innerHeight - 80, initialY + deltaY)),
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const toggleDayOfWeek = (dayValue: number) => {
    setRecurringDays((prev) =>
      prev.includes(dayValue) ? prev.filter((d) => d !== dayValue) : [...prev, dayValue]
    );
  };

  const setAllWeekdays = () => {
    setRecurringDays([1, 2, 3, 4, 5]);
  };

  const clearRecurrence = () => {
    setRecurringDays([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || '(No title)';

    let resolvedGoalName: string | undefined = undefined;
    if (goalId && goals) {
      const g = goals.find((item) => item.id === goalId);
      if (g) resolvedGoalName = g.title;
    }

    if (activeType === 'event') {
      const eventData: Omit<CalendarEvent, 'id'> = {
        title: finalTitle,
        description: description.trim() || undefined,
        date,
        startTime,
        endTime,
        tagId: tagId || tags[0]?.id || 'default-work',
        color: color || undefined,
        recurringDays: recurringDays.length > 0 ? recurringDays : undefined,
        goalId: goalId || undefined,
        goalName: resolvedGoalName,
      };

      // Handle Task -> Event conversion when editing
      if (editMode && editItem && editItemType === 'task') {
        onDeleteTask(editItem.id, true);
        onSaveEvent(eventData);
        onClose();
        return;
      }

      const isRecurring = editMode && editItem && editItemType === 'event' && (((editItem as CalendarEvent).recurringDays && (editItem as CalendarEvent).recurringDays!.length > 0) || !!(editItem as CalendarEvent).recurringParentId);
      if (isRecurring && occurrenceDate) {
        if (recurrenceBehavior === 'one') {
          const singleData = {
            ...eventData,
            date: date || occurrenceDate,
            recurringDays: undefined,
            exceptDates: undefined,
          };
          if (onSplitRecurringEvent) {
            onSplitRecurringEvent(editItem.id, occurrenceDate, singleData);
          } else {
            const currentExcepts = (editItem as CalendarEvent).exceptDates || [];
            const updatedExcepts = currentExcepts.includes(occurrenceDate) ? currentExcepts : [...currentExcepts, occurrenceDate];
            onSaveEvent({
              ...(editItem as CalendarEvent),
              exceptDates: updatedExcepts,
            }, editItem.id);
            onSaveEvent(singleData);
          }
          onClose();
        } else if (recurrenceBehavior === 'all') {
          if (onUpdateRecurringSeries) {
            onUpdateRecurringSeries(editItem.id, eventData);
          } else {
            const origEvent = editItem as CalendarEvent;
            onSaveEvent({
              ...eventData,
              date: origEvent.date,
              exceptDates: origEvent.exceptDates,
              recurringDays: eventData.recurringDays || origEvent.recurringDays,
            }, editItem.id);
          }
          onClose();
        } else {
          setPendingSaveData(eventData);
          setRecurrenceSaveChoice('one');
          setShowRecurrenceSavePrompt(true);
        }
      } else {
        onSaveEvent(
          eventData,
          editMode && editItemType === 'event' ? editItem?.id : undefined
        );
        onClose();
      }
    } else {
      const taskData: Omit<Task, 'id'> = {
        title: finalTitle,
        description: description.trim() || undefined,
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        status: taskStatus,
        groupId: groupId || 'group-1',
        color: color || undefined,
        goalId: goalId || undefined,
        goalName: resolvedGoalName,
      };

      // Handle Event -> Task conversion when editing
      if (editMode && editItem && editItemType === 'event') {
        onDeleteEvent(editItem.id);
        onSaveTask(taskData);
        onClose();
        return;
      }

      onSaveTask(
        taskData,
        editMode && editItemType === 'task' ? editItem?.id : undefined
      );
      onClose();
    }
  };

  const handleDelete = () => {
    if (editItem && editItemType) {
      if (editItemType === 'event') {
        const isRecurring = ((editItem as CalendarEvent).recurringDays && (editItem as CalendarEvent).recurringDays!.length > 0) || !!(editItem as CalendarEvent).recurringParentId;
        if (isRecurring && occurrenceDate) {
          setRecurrenceDeleteChoice('one');
          setShowRecurrenceDeletePrompt(true);
        } else {
          onDeleteEvent(editItem.id);
          onClose();
        }
      } else {
        onDeleteTask(editItem.id, false);
        onClose();
      }
    }
  };

  // Format date readable
  const getFormattedDateLabel = () => {
    if (!date) return '';
    try {
      const [y, m, d] = date.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    } catch {
      return date;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 pointer-events-none bg-transparent transition-opacity duration-200"
          id="timeblock-settings-backdrop"
        >
          {/* Side-anchored / Floating Google Calendar-style Card Directly Beside Time Block */}
          {!showRecurrenceSavePrompt && !showRecurrenceDeletePrompt && (
            <motion.div
              ref={cardRef}
              initial={{ opacity: 0, scale: 0.94, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={computedStyle}
              className={`bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col max-h-[calc(100vh-1rem)] overflow-hidden select-text pointer-events-auto text-slate-900 dark:text-slate-100 ${
                !anchorPosition && !dragPosition ? 'fixed top-4 right-4 sm:right-6 w-[calc(100vw-2rem)] max-w-[520px]' : ''
              }`}
              id="google-timeblock-card"
            >
            {/* Top bar: Drag Handle / Event vs Task Chips / Close Button */}
            <div
              onMouseDown={handleHeaderMouseDown}
              className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0 cursor-grab active:cursor-grabbing select-none border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0F172A]/70"
              title="Click and drag to move settings card"
            >
          <div className="flex items-center gap-2">
            <div className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded cursor-grab">
              <GripHorizontal className="w-4 h-4" />
            </div>
            {/* Pill chips: Event / Task */}
            <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-full border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setActiveType('task')}
                className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeType === 'task'
                    ? 'bg-[#0b57d0] dark:bg-[#0066FF] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CheckSquare className="w-3 h-3" />
                <span>Task</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveType('event')}
                className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeType === 'event'
                    ? 'bg-[#0b57d0] dark:bg-[#0066FF] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TagIcon className="w-3 h-3" />
                <span>Event</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Content Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="px-5 py-3 space-y-3.5 overflow-y-auto flex-1 min-h-0">
            {/* Large Title Input with Google Calendar blue baseline */}
            <div className="relative group">
              <input
                ref={titleInputRef}
                type="text"
                placeholder={activeType === 'event' ? 'Add title' : 'Add task title'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-lg sm:text-xl font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border-b-2 border-slate-200 dark:border-slate-700 pb-1.5 focus:outline-none focus:border-[#0b57d0] dark:focus:border-[#0066FF] transition-colors bg-transparent"
              />
            </div>

            {/* Time & Recurrence Row */}
            <div className="space-y-2 pt-0.5">
              <div className="flex items-start gap-3.5">
                <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-1" />
                <div className="flex-1 space-y-2">
                  {/* Date & Time display / inputs */}
                  {/* Date & Time display / inputs in single horizontal row */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setDate(newDate);
                        if (onTimeChange) onTimeChange(newDate, startTime, endTime);
                      }}
                      className="text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0b57d0] dark:focus:ring-[#0066FF] bg-slate-50/50 dark:bg-slate-800/80 shrink-0"
                      required
                    />

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 shrink-0">
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setStartTime(newStart);
                          if (onTimeChange) onTimeChange(date, newStart, endTime);
                        }}
                        className="text-xs font-sans tabular-nums text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0b57d0] dark:focus:ring-[#0066FF] bg-slate-50/50 dark:bg-slate-800/80 shrink-0"
                      />
                      <span className="text-slate-400 dark:text-slate-500 font-medium">–</span>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => {
                          const newEnd = e.target.value;
                          setEndTime(newEnd);
                          if (onTimeChange) onTimeChange(date, startTime, newEnd);
                        }}
                        className="text-xs font-sans tabular-nums text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0b57d0] dark:focus:ring-[#0066FF] bg-slate-50/50 dark:bg-slate-800/80 shrink-0"
                      />
                        {/* Duration pill only shown if planned */}
                        {(() => {
                          if (!startTime || !endTime) return null;
                          const [sH, sM] = startTime.split(':').map(Number);
                          const [eH, eM] = endTime.split(':').map(Number);
                          if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return null;
                          const diff = (eH * 60 + eM) - (sH * 60 + sM);
                          if (diff <= 0) return null;
                          const hrs = Math.floor(diff / 60);
                          const mins = diff % 60;
                          const durStr = hrs > 0 && mins > 0 ? `${hrs} hr ${mins} mins` : hrs > 0 ? `${hrs} hr${hrs > 1 ? 's' : ''}` : `${mins} mins`;
                          return (
                            <span className="text-[10px] font-bold text-[#0b57d0] dark:text-[#60A5FA] bg-blue-50/90 dark:bg-blue-950/50 px-2.5 py-1 rounded-full border border-blue-200/80 dark:border-blue-900/50 font-sans tabular-nums shrink-0 whitespace-nowrap ml-0.5">
                              {durStr}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                  {/* Recurrence Chips (Event Only) */}
                  {activeType === 'event' && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Repeat className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          {recurringDays.length > 0 ? (
                            <span className="font-bold text-[#0b57d0] dark:text-[#60A5FA]">Repeats on:</span>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Repeat:</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {recurringDays.length > 0 ? (
                            <button
                              type="button"
                              onClick={clearRecurrence}
                              className="text-[10px] text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-semibold cursor-pointer"
                            >
                              Clear
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={setAllWeekdays}
                              className="text-[10px] text-[#0b57d0] dark:text-[#60A5FA] hover:underline font-semibold cursor-pointer"
                            >
                              Weekdays
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        {DAYS_OF_WEEK.map((d) => {
                          const isSelected = recurringDays.includes(d.value);
                          return (
                            <button
                              key={d.fullName}
                              type="button"
                              onClick={() => toggleDayOfWeek(d.value)}
                              className={`w-7 h-7 rounded-full text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                                isSelected
                                  ? 'bg-[#0b57d0] dark:bg-[#0066FF] text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                              title={`Repeat on ${d.fullName}`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Daily Task Connection Selector (Task Only) */}
            {activeType === 'task' && (
              <div className="flex items-start gap-3.5 pt-0.5 relative" ref={dailyTaskDropdownRef}>
                <ListTodo className="w-4 h-4 text-slate-400 shrink-0 mt-2" />
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                    Daily Task Connection
                  </label>

                  {/* Custom Daily Task Dropdown Trigger */}
                  <button
                    ref={dailyTaskTriggerBtnRef}
                    type="button"
                    onClick={toggleDailyTaskDropdown}
                    className="w-full text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0b57d0] dark:focus:ring-[#0066FF] mt-0.5 bg-white dark:bg-slate-800/80 cursor-pointer flex items-center justify-between text-left shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <span className="truncate flex items-center gap-1.5">
                      {(() => {
                        const matched = tasks.find((t) => t.title === title && t.groupId === groupId);
                        if (matched) {
                          const matchedGroup = groups.find((g) => g.id === matched.groupId);
                          const groupColor = matchedGroup?.color || '#64748b';
                          return (
                            <>
                              <span className="font-semibold text-slate-800 dark:text-white truncate">{matched.title}</span>
                              {matched.groupId && (
                                <span
                                  className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full shrink-0"
                                  style={{ backgroundColor: groupColor }}
                                >
                                  {matchedGroup?.name || 'Group'}
                                </span>
                              )}
                            </>
                          );
                        } else {
                          return (
                            <span className="text-slate-400 dark:text-slate-500">-- No Connection --</span>
                          );
                        }
                      })()}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform ${isDailyTaskDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Daily Task Custom Dropdown Menu - Fixed Top Layer */}
                  {isDailyTaskDropdownOpen && dailyTaskMenuCoords && (
                    <div
                      ref={dailyTaskMenuRef}
                      style={{
                        position: 'fixed',
                        top: dailyTaskMenuCoords.top !== undefined ? dailyTaskMenuCoords.top : undefined,
                        bottom: dailyTaskMenuCoords.bottom !== undefined ? dailyTaskMenuCoords.bottom : undefined,
                        left: dailyTaskMenuCoords.left,
                        width: dailyTaskMenuCoords.width,
                        zIndex: 9999,
                      }}
                      className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden text-xs max-h-72 overflow-y-auto animate-fade-in flex flex-col"
                    >
                      {/* Dropdown Header Bar with nice button toggle */}
                      <div className="px-3 py-2 bg-[#F5F6F8] dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {showAllPlannedDailyTasks ? 'All Planned Tasks' : "Today's Tasks"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAllPlannedDailyTasks(!showAllPlannedDailyTasks);
                          }}
                          className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                        >
                          {showAllPlannedDailyTasks ? "Show Today's Only" : 'Show All Planned'}
                        </button>
                      </div>

                      <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                        {/* Option: Clear connection */}
                        <button
                          type="button"
                          onClick={() => {
                            setTitle('');
                            setIsDailyTaskDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                        >
                          -- No Connection --
                        </button>

                        {(() => {
                          const list = (showAllPlannedDailyTasks ? tasks : tasks.filter(t => t.date === date))
                            .filter(t => t.status !== 'done' && (!t.startTime || (title === t.title && groupId === t.groupId)));
                          if (list.length === 0) {
                            return (
                              <div className="px-4 py-6 text-center text-slate-400 dark:text-slate-500 italic">
                                {showAllPlannedDailyTasks ? 'No tasks exist.' : "No tasks planned for today."}
                              </div>
                            );
                          }
                          return list.map((t) => {
                            const isSelected = title === t.title && groupId === t.groupId;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setTitle(t.title);
                                  if (t.groupId) setGroupId(t.groupId);
                                  if (t.goalId) setGoalId(t.goalId);
                                  setIsDailyTaskDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-indigo-50/50 dark:hover:bg-slate-800/60 transition ${
                                  isSelected ? 'bg-indigo-50 dark:bg-indigo-950/50 font-semibold text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <span className="truncate">{t.title}</span>
                                  {t.groupId && (() => {
                                    const g = groups.find((gr) => gr.id === t.groupId);
                                    const badgeColor = g?.color || '#64748b';
                                    return (
                                      <span
                                        className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full shrink-0"
                                        style={{ backgroundColor: badgeColor }}
                                      >
                                        {g?.name || 'Group'}
                                      </span>
                                    );
                                  })()}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Task Status (Task Only) */}
            {activeType === 'task' && (
              <div className="flex items-center gap-3.5 pt-0.5">
                <CheckSquare className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-sans">Status</label>
                  <div className="flex gap-2 mt-1">
                    {(['todo', 'done'] as TaskStatus[]).map((status) => {
                      const isSelected = taskStatus === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setTaskStatus(status)}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {status === 'todo' ? 'To Do' : 'Completed'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Calendar Tag / Group Selector */}
            <div className="flex items-center gap-3.5 pt-0.5">
              <TagIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-sans">
                  {activeType === 'event' ? 'Tag Category' : 'Task group'}
                </label>
                {activeType === 'event' ? (
                  <select
                    value={tagId}
                    onChange={(e) => setTagId(e.target.value)}
                    className="w-full text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0b57d0] dark:focus:ring-[#0066FF] mt-0.5 bg-white dark:bg-slate-800 cursor-pointer"
                  >
                    {tags.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0b57d0] dark:focus:ring-[#0066FF] mt-0.5 bg-white dark:bg-slate-800 cursor-pointer"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Goal Link Selector */}
            {activeType === 'task' && activeGoals && activeGoals.length > 0 && (
              <div className="flex items-start gap-3.5 pt-0.5 relative" ref={targetDropdownRef}>
                <Target className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-2" />
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-sans">
                    Target group
                  </label>

                  {/* Custom Target Dropdown Trigger */}
                  <button
                    ref={targetTriggerBtnRef}
                    type="button"
                    onClick={toggleTargetDropdown}
                    className="w-full text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0b57d0] dark:focus:ring-[#0066FF] mt-0.5 bg-white dark:bg-slate-800/80 cursor-pointer flex items-center justify-between text-left shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <span className="truncate flex items-center gap-1.5">
                      {goalId ? (
                        <>
                          <Target className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {activeGoals.find((g) => g.id === goalId)?.title || 'Selected Target'}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-- No connected target --</span>
                      )}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform ${isTargetDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Target Custom Dropdown Menu - Fixed Top Layer */}
                  {isTargetDropdownOpen && targetMenuCoords && (
                    <div
                      ref={targetMenuRef}
                      style={{
                        position: 'fixed',
                        top: targetMenuCoords.top !== undefined ? targetMenuCoords.top : undefined,
                        bottom: targetMenuCoords.bottom !== undefined ? targetMenuCoords.bottom : undefined,
                        left: targetMenuCoords.left,
                        width: targetMenuCoords.width,
                        zIndex: 9999,
                      }}
                      className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden text-xs max-h-72 overflow-y-auto animate-fade-in flex flex-col"
                    >
                      {/* Section Renderer Helper */}
                      {(() => {
                        // Recommended Block
                        const RecommendedBlock = (
                          <div className="border-b border-slate-100 dark:border-slate-800">
                            <div className="px-3 py-1.5 bg-indigo-50/80 dark:bg-indigo-950/60 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center justify-between">
                              <span>Recommended for {activeCategoryName || 'this task'}</span>
                              <span className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[9px]">Matched</span>
                            </div>

                            {/* Option: Clear / No target (placed inside Recommended) */}
                            <button
                              type="button"
                              onClick={() => {
                                setGoalId('');
                                setIsTargetDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition ${
                                !goalId ? 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              <span>-- No connected target --</span>
                              {!goalId && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                            </button>

                            {recommendedGoals.map((g) => {
                              const isSelected = goalId === g.id;
                              return (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => {
                                    setGoalId(g.id);
                                    setIsTargetDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-indigo-50/50 dark:hover:bg-slate-800/60 transition ${
                                    isSelected ? 'bg-indigo-50 dark:bg-indigo-950/50 font-semibold text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 truncate">
                                    <Target className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                                    <span className="truncate">{g.title}</span>
                                  </span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        );

                        // Other Targets Block
                        const OtherBlock = otherGoals.length > 0 && (
                          <div className="border-t border-slate-100 dark:border-slate-800">
                            {!showOtherTargets ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowOtherTargets(true);
                                }}
                                className="w-full text-left px-3 py-2 text-indigo-600 dark:text-indigo-400 font-semibold bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center justify-between transition text-xs cursor-pointer"
                              >
                                <span className="flex items-center gap-1.5">
                                  <span>Other target groups</span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">({otherGoals.length})</span>
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                              </button>
                            ) : (
                              <div>
                                <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  Other target groups
                                </div>
                                {otherGoals.map((g) => {
                                  const isSelected = goalId === g.id;
                                  return (
                                    <button
                                      key={g.id}
                                      type="button"
                                      onClick={() => {
                                        setGoalId(g.id);
                                        setIsTargetDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition ${
                                        isSelected ? 'bg-indigo-50 dark:bg-indigo-950/50 font-semibold text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      <span className="flex items-center gap-2 truncate">
                                        <Target className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                                        <span className="truncate">{g.title}</span>
                                      </span>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );

                        // If direction is UP, invert so Recommended is at the bottom (closest to button)
                        if (dropdownDirection === 'up') {
                          return (
                            <>
                              {OtherBlock}
                              {RecommendedBlock}
                            </>
                          );
                        }

                        // Default DOWN: Recommended on top (closest to button)
                        return (
                          <>
                            {RecommendedBlock}
                            {OtherBlock}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Color Dots Row (Events Only - Tasks automate color from Task Group) */}
            {activeType === 'event' && (
              <div className="flex items-start gap-3.5 pt-0.5">
                <div
                  className="w-4 h-4 rounded-full border border-slate-300 shrink-0 mt-1.5"
                  style={{ backgroundColor: color || '#f1f5f9' }}
                />
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Color</label>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {GOOGLE_COLORS.map((col) => {
                      const isSelected = color === col.hex;
                      const bgStyle = col.hex ? col.hex : '#cbd5e1';
                      return (
                        <button
                          key={col.name}
                          type="button"
                          onClick={() => setColor(col.hex)}
                          style={{ backgroundColor: bgStyle }}
                          className={`w-5 h-5 rounded-full border relative transition-transform duration-100 cursor-pointer ${
                            isSelected ? 'scale-110 ring-2 ring-[#0b57d0] ring-offset-1 border-white' : 'border-slate-200 hover:scale-105'
                          }`}
                          title={col.name === 'Default' ? 'Use Default Color' : col.name}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white absolute inset-0 m-auto stroke-[3px]" />
                          )}
                          {col.name === 'Default' && !color && (
                            <span className="text-[9px] text-slate-500 font-bold absolute inset-0 flex items-center justify-center">D</span>
                          )}
                        </button>
                      );
                    })}

                    {/* Rainbow Custom Color Picker */}
                    <div className="relative w-5 h-5 rounded-full border border-slate-200 hover:scale-105 transition-transform bg-gradient-to-tr from-rose-400 via-emerald-400 to-indigo-500 flex items-center justify-center overflow-hidden cursor-pointer">
                      <input
                        type="color"
                        value={color || '#3b82f6'}
                        onChange={(e) => setColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
                        title="Custom Color"
                      />
                      <span className="text-[7px] text-white font-extrabold pointer-events-none">🌈</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Description / Notes */}
            <div className="flex items-start gap-3.5 pt-0.5">
              <AlignLeft className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-1.5" />
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-sans">Description</label>
                <textarea
                  placeholder="Add description or notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0b57d0] dark:focus:ring-[#0066FF] mt-0.5 resize-none bg-slate-50/50 dark:bg-slate-800/80 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Pinned Bottom Actions Bar (Always visible at the base of the card) */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0F172A]/70 flex items-center justify-between shrink-0">
            {editMode ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-semibold px-2.5 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                id="modal-delete-btn"
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-1.5 rounded-full text-xs font-medium bg-[#0b57d0] dark:bg-[#0066FF] hover:bg-[#0842a0] dark:hover:bg-blue-600 text-white shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                id="modal-save-btn"
              >
                <span>Save</span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>
      )}

      {/* Recurrence Save Choice Dialog */}
      {showRecurrenceSavePrompt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-60 p-4 pointer-events-auto animate-in fade-in duration-150" id="recurrence-save-modal-backdrop">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto" id="recurrence-save-modal-card">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4" id="recurrence-save-modal-header">Edit Repeating Event</h3>

            <div className="flex flex-col gap-2.5">
              <div
                onClick={() => setRecurrenceSaveChoice('one')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition cursor-pointer select-none ${
                  recurrenceSaveChoice === 'one'
                    ? 'border-[#0066FF] bg-[#0066FF]/5 dark:bg-[#0066FF]/15 text-slate-900 dark:text-white font-medium'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  recurrenceSaveChoice === 'one' ? 'border-[#0066FF]' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {recurrenceSaveChoice === 'one' && (
                    <div className="w-2 h-2 rounded-full bg-[#0066FF]" />
                  )}
                </div>
                <span className="text-sm">This event</span>
              </div>

              <div
                onClick={() => setRecurrenceSaveChoice('all')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition cursor-pointer select-none ${
                  recurrenceSaveChoice === 'all'
                    ? 'border-[#0066FF] bg-[#0066FF]/5 dark:bg-[#0066FF]/15 text-slate-900 dark:text-white font-medium'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  recurrenceSaveChoice === 'all' ? 'border-[#0066FF]' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {recurrenceSaveChoice === 'all' && (
                    <div className="w-2 h-2 rounded-full bg-[#0066FF]" />
                  )}
                </div>
                <span className="text-sm">All events</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6" id="recurrence-save-modal-actions">
              <button
                type="button"
                onClick={() => setShowRecurrenceSavePrompt(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingSaveData && editItem && occurrenceDate) {
                    if (recurrenceSaveChoice === 'one') {
                      const singleData = {
                        ...pendingSaveData,
                        date: pendingSaveData.date || occurrenceDate,
                        recurringDays: undefined,
                        exceptDates: undefined,
                      };

                      if (onSplitRecurringEvent) {
                        onSplitRecurringEvent(editItem.id, occurrenceDate, singleData);
                      } else {
                        const currentExcepts = (editItem as CalendarEvent).exceptDates || [];
                        const updatedExcepts = [...currentExcepts, occurrenceDate];
                        onSaveEvent({
                          ...(editItem as CalendarEvent),
                          exceptDates: updatedExcepts,
                        }, editItem.id);
                        onSaveEvent(singleData);
                      }
                    } else {
                      if (onUpdateRecurringSeries) {
                        onUpdateRecurringSeries(editItem.id, pendingSaveData);
                      } else {
                        const origEvent = editItem as CalendarEvent;
                        onSaveEvent({
                          ...pendingSaveData,
                          date: origEvent.date,
                          exceptDates: origEvent.exceptDates,
                          recurringDays: pendingSaveData.recurringDays || origEvent.recurringDays,
                        }, editItem.id);
                      }
                    }
                  }
                  setShowRecurrenceSavePrompt(false);
                  onClose();
                }}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0066FF] hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recurrence Delete Choice Dialog */}
      {showRecurrenceDeletePrompt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-60 p-4 pointer-events-auto animate-in fade-in duration-150" id="recurrence-delete-modal-backdrop">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto" id="recurrence-delete-modal-card">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4" id="recurrence-delete-modal-header">Delete Repeating Event</h3>

            <div className="flex flex-col gap-2.5">
              <div
                onClick={() => setRecurrenceDeleteChoice('one')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition cursor-pointer select-none ${
                  recurrenceDeleteChoice === 'one'
                    ? 'border-rose-500 bg-rose-500/5 dark:bg-rose-500/15 text-slate-900 dark:text-white font-medium'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  recurrenceDeleteChoice === 'one' ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {recurrenceDeleteChoice === 'one' && (
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </div>
                <span className="text-sm">This event</span>
              </div>

              <div
                onClick={() => setRecurrenceDeleteChoice('all')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition cursor-pointer select-none ${
                  recurrenceDeleteChoice === 'all'
                    ? 'border-rose-500 bg-rose-500/5 dark:bg-rose-500/15 text-slate-900 dark:text-white font-medium'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  recurrenceDeleteChoice === 'all' ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {recurrenceDeleteChoice === 'all' && (
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </div>
                <span className="text-sm">All events</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6" id="recurrence-delete-modal-actions">
              <button
                type="button"
                onClick={() => setShowRecurrenceDeletePrompt(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editItem && occurrenceDate) {
                    if (recurrenceDeleteChoice === 'one') {
                      const calEvent = editItem as CalendarEvent;
                      if (calEvent.recurringParentId) {
                        // It was already a split child instance, delete this individual instance
                        onDeleteEvent(editItem.id);
                      } else {
                        // It is the master event occurrence, add to exceptDates
                        const currentExcepts = calEvent.exceptDates || [];
                        const updatedExcepts = currentExcepts.includes(occurrenceDate) ? currentExcepts : [...currentExcepts, occurrenceDate];
                        onSaveEvent({
                          ...calEvent,
                          exceptDates: updatedExcepts,
                        }, editItem.id);
                      }
                    } else {
                      // Delete all in series: if it is a child split, delete master ID; otherwise delete this ID
                      const masterId = (editItem as CalendarEvent).recurringParentId || editItem.id;
                      onDeleteEvent(masterId);
                    }
                  }
                  setShowRecurrenceDeletePrompt(false);
                  onClose();
                }}
                className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    )}
  </AnimatePresence>
  );
}
