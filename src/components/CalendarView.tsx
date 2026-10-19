/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Check, Clock, Edit3, Plus, Sparkles, Play } from 'lucide-react';
import { CalendarEvent, Task, Tag, CalendarViewType, TaskGroup } from '../types';
import { COLOR_PRESETS } from './Sidebar';

interface CalendarViewProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  events: CalendarEvent[];
  tasks: Task[];
  tags: Tag[];
  groups: TaskGroup[];
  onOpenCreateModal: (dateString: string, startTime?: string, endTime?: string, anchorPos?: { top: number; left: number; right: number; bottom: number; width: number; height: number } | null) => void;
  onOpenEditModal: (type: 'event' | 'task', item: CalendarEvent | Task, occurrenceDate?: string, anchorPos?: { top: number; left: number; right: number; bottom: number; width: number; height: number } | null) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onUpdateEvent?: (id: string, updates: Partial<CalendarEvent>) => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
  onSaveEvent?: (eventData: Omit<CalendarEvent, 'id'>, id?: string) => void;
  onSplitRecurringEvent?: (recurringEventId: string, exceptDate: string, singleEventData: Omit<CalendarEvent, 'id'>) => void;
  onUpdateRecurringSeries?: (eventId: string, updates: Partial<CalendarEvent>) => void;
  calendarGap?: number;
  snapInterval?: number;
  recurrenceBehavior?: 'ask' | 'one' | 'all';
  onSaveRecurrenceBehavior?: (behavior: 'ask' | 'one' | 'all') => void;
  isModalOpen?: boolean;
  modalDefaultDate?: string;
  modalDefaultStartTime?: string;
  modalDefaultEndTime?: string;
  modalEditItem?: CalendarEvent | Task | null;
  onUpdateModalTimes?: (date: string, startTime: string, endTime: string) => void;
  startHour?: number;
  endHour?: number;
  onStartTask?: (task: Task) => void;
  activeFocusTaskId?: string | null;
  isFocusRunning?: boolean;
  deviceType?: 'Laptop' | 'Tablet' | 'Phone';
}

// Convert minutes to "HH:MM"
const minutesToTimeString = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Convert "HH:MM" to minutes from midnight
const timeStringToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Convert "HH:MM" style to 12-hour AM/PM (e.g., 6pm or 6:30pm)
export const formatTo12Hour = (timeStr?: string): string => {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const ampm = h >= 12 ? 'pm' : 'am';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${displayHour}${ampm}` : `${displayHour}:${String(m).padStart(2, '0')}${ampm}`;
};

const formatDuration = (startMin: number, endMin: number): string => {
  const diff = Math.max(0, endMin - startMin);
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hrs > 0 && mins > 0) {
    return `${hrs} hr ${mins} mins`;
  } else if (hrs > 0) {
    return `${hrs} hr${hrs > 1 ? 's' : ''}`;
  } else {
    return `${mins} mins`;
  }
};

// Helper to format Date object to YYYY-MM-DD
const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface PositionedItem {
  id: string;
  type: 'event' | 'task';
  item: any;
  startMin: number;
  endMin: number;
}

function calculatePositions(items: PositionedItem[]): Record<string, { left: number; width: number }> {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin);
  const groups: PositionedItem[][] = [];

  for (const item of sorted) {
    const itemStart = item.startMin;
    const itemEnd = item.startMin + Math.max(35, item.endMin - item.startMin);
    let placed = false;

    for (const group of groups) {
      // Check if item overlaps visually with any item in this group
      const overlaps = group.some((g) => {
        const gStart = g.startMin;
        const gEnd = g.startMin + Math.max(35, g.endMin - g.startMin);
        return !(itemEnd <= gStart || itemStart >= gEnd);
      });
      if (!overlaps) {
        group.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push([item]);
    }
  }

  const positions: Record<string, { left: number; width: number }> = {};
  const numGroups = groups.length;
  groups.forEach((group, groupIdx) => {
    const width = 100 / (numGroups || 1);
    const left = groupIdx * width;
    for (const item of group) {
      positions[item.id] = { left, width };
    }
  });

  return positions;
}

const isEventOnDate = (ev: CalendarEvent, targetDate: Date, dateStr: string): boolean => {
  if (ev.exceptDates && ev.exceptDates.includes(dateStr)) return false;
  if (ev.date === dateStr) return true;
  
  if (ev.recurringDays && ev.recurringDays.length > 0) {
    const [year, month, day] = ev.date.split('-').map(Number);
    const evStartDate = new Date(year, month - 1, day);
    const cellDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    
    if (cellDate >= evStartDate) {
      const dayOfWeek = cellDate.getDay();
      return ev.recurringDays.includes(dayOfWeek);
    }
  }
  
  return false;
};

const COLOR_MAP: Record<string, { solid: string; lightBg: string; text: string; border: string }> = {
  blue:   { solid: '#0066FF', lightBg: '#E8F2FF', text: '#0066FF', border: '#0066FF' },
  green:  { solid: '#059669', lightBg: '#ECFDF5', text: '#059669', border: '#059669' },
  amber:  { solid: '#d97706', lightBg: '#FFFBEB', text: '#d97706', border: '#d97706' },
  rose:   { solid: '#e11d48', lightBg: '#FFF1F2', text: '#e11d48', border: '#e11d48' },
  violet: { solid: '#7c3aed', lightBg: '#F5F3FF', text: '#7c3aed', border: '#7c3aed' },
  purple: { solid: '#7c3aed', lightBg: '#F5F3FF', text: '#7c3aed', border: '#7c3aed' },
  indigo: { solid: '#0066FF', lightBg: '#E8F2FF', text: '#0066FF', border: '#0066FF' },
  sky:    { solid: '#0284c7', lightBg: '#E0F2FE', text: '#0284c7', border: '#0284c7' },
  emerald:{ solid: '#059669', lightBg: '#ECFDF5', text: '#059669', border: '#059669' },
};

export const getSystemColor = (colorKeyOrHex?: string) => {
  if (!colorKeyOrHex) return COLOR_MAP.blue;
  const lower = colorKeyOrHex.toLowerCase();
  if (COLOR_MAP[lower]) {
    return COLOR_MAP[lower];
  }
  if (colorKeyOrHex.startsWith('#')) {
    return {
      solid: colorKeyOrHex,
      lightBg: `${colorKeyOrHex}15`,
      text: colorKeyOrHex,
      border: colorKeyOrHex,
    };
  }
  return COLOR_MAP.blue;
};

const getEventStyle = (ev: CalendarEvent, tag: Tag | undefined) => {
  const colorKey = ev.color || tag?.color;
  const sysColor = getSystemColor(colorKey);
  return {
    backgroundColor: sysColor.solid,
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
  };
};

const getTaskStyle = (task: Task, group: TaskGroup | undefined, completed: boolean, isDark: boolean = false) => {
  if (isDark) {
    if (completed) {
      return {
        backgroundColor: '#1E293B',
        color: '#64748b',
        borderLeft: '3px solid #475569',
        borderRadius: '6px',
      };
    }
    const colorKey = task.color || group?.color;
    const sysColor = getSystemColor(colorKey);
    return {
      backgroundColor: `${sysColor.solid}1F`,
      color: '#f8fafc',
      borderLeft: `3px solid ${sysColor.solid}`,
      borderRadius: '6px',
    };
  }

  if (completed) {
    return {
      backgroundColor: '#f1f5f9',
      color: '#94a3b8',
      borderLeft: '3px solid #cbd5e1',
      borderRadius: '6px',
    };
  }
  const colorKey = task.color || group?.color;
  const sysColor = getSystemColor(colorKey);
  return {
    backgroundColor: sysColor.lightBg,
    color: '#0f172a',
    borderLeft: `3px solid ${sysColor.solid}`,
    borderRadius: '6px',
  };
};

export default function CalendarView({
  selectedDate,
  setSelectedDate,
  events,
  tasks,
  tags,
  groups,
  onOpenCreateModal,
  onOpenEditModal,
  onToggleTaskStatus,
  onUpdateEvent,
  onUpdateTask,
  onSaveEvent,
  onSplitRecurringEvent,
  onUpdateRecurringSeries,
  calendarGap = 2,
  snapInterval = 10,
  recurrenceBehavior = 'ask',
  onSaveRecurrenceBehavior,
  isModalOpen,
  modalDefaultDate,
  modalDefaultStartTime,
  modalDefaultEndTime,
  modalEditItem,
  onUpdateModalTimes,
  startHour = 0,
  endHour = 24,
  onStartTask,
  activeFocusTaskId,
  isFocusRunning = false,
  deviceType = 'Laptop',
}: CalendarViewProps) {
  const [viewType, setViewType] = useState<CalendarViewType>('three-day');
  const [isDark, setIsDark] = useState(false);

  // Auto-optimize default viewType based on device detection
  useEffect(() => {
    if (deviceType === 'Phone') {
      if (viewType === 'week' || viewType === 'month') {
        setViewType('day');
      }
    } else if (deviceType === 'Tablet') {
      if (viewType === 'week' || viewType === 'month') {
        setViewType('three-day');
      }
    }
  }, [deviceType, viewType]);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Custom tap-detection and click prevention refs
  const dragStartPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const clickBlockedRef = useRef<boolean>(false);

  // Tracks if the mouse actually moved during a drag/resize to prevent accidental click triggers
  const [hasMoved, setHasMoved] = useState<boolean>(false);

  // Drag creation states
  const [dragStart, setDragStart] = useState<{ dateStr: string; minutes: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ minutes: number } | null>(null);

  // Existing item drag states (move start / end)
  const [activeDragItem, setActiveDragItem] = useState<{
    id: string;
    type: 'event' | 'task';
    originalDateStr: string;
    originalStartMin: number;
    originalEndMin: number;
    startClientX: number;
    startClientY: number;
    currentOffsetMinutes: number;
  } | null>(null);

  // Existing item resize states (top or bottom edge)
  const [activeResizeItem, setActiveResizeItem] = useState<{
    id: string;
    type: 'event' | 'task';
    edge: 'top' | 'bottom';
    originalDateStr: string;
    originalStartMin: number;
    originalEndMin: number;
    startClientY: number;
    currentOffsetMinutes: number;
  } | null>(null);

  // Hover target for dropping items into a different column/day
  const [hoveredDateStr, setHoveredDateStr] = useState<string | null>(null);

  // Recurrence confirmation overlay state
  const [recurrencePrompt, setRecurrencePrompt] = useState<{
    id: string;
    type: 'drag' | 'resize';
    originalDateStr: string;
    newDateStr?: string;
    newStartTime?: string;
    newEndTime?: string;
    newEndTimeOnly?: string;
  } | null>(null);
  const [recurrenceChoice, setRecurrenceChoice] = useState<'one' | 'all'>('one');

  // Current time tracker (for indicator line)
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date());
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll timeline to current time (or active hour) on view change / mount
  useEffect(() => {
    if (viewType !== 'month') {
      const scrollToTime = () => {
        if (scrollContainerRef.current) {
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          // Position scroll so current time is ~120px from top, or minimum 7:00 AM (420px) if early morning
          const targetScrollTop = Math.max(0, currentMinutes - 120);
          scrollContainerRef.current.scrollTop = targetScrollTop;
        }
      };
      scrollToTime();
      const timer = setTimeout(scrollToTime, 50);
      return () => clearTimeout(timer);
    }
  }, [viewType, selectedDate]);

  // Touch gesture & mobile adaptation states
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [swipeHint, setSwipeHint] = useState<string | null>(null);

  // Auto-adapt view mode for mobile touch screens on load / resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640 && viewType === 'week') {
        setViewType('three-day');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Touch Swipe navigation handlers for touchscreen swipe across days/weeks
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && !activeDragItem && !activeResizeItem) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    if (touch) {
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const elapsed = Date.now() - touchStartRef.current.time;

      // Swipe horizontally if horizontal distance > 65px and vertical movement < 50px within 450ms
      if (Math.abs(deltaX) > 65 && Math.abs(deltaY) < 50 && elapsed < 450) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(12);
        }
        if (deltaX < 0) {
          handleNext();
          setSwipeHint('Next →');
        } else {
          handlePrev();
          setSwipeHint('← Prev');
        }
        setTimeout(() => setSwipeHint(null), 1200);
      }
    }
    touchStartRef.current = null;
  };

  // Scroll to 7:00 AM on initial render/view load to focus working hours
  useEffect(() => {
    if (scrollContainerRef.current && viewType !== 'month') {
      scrollContainerRef.current.scrollTop = 420; // 7 AM * 60px = 420px
    }
  }, [viewType]);

  // Unified pointer tracking for smooth, non-stuck dragging/resizing with touch/mouse support
  useEffect(() => {
    if (!activeDragItem && !activeResizeItem) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (activeResizeItem) {
        const deltaY = e.clientY - activeResizeItem.startClientY;
        if (Math.abs(deltaY) > 2) {
          setHasMoved(true);
        }
        setActiveResizeItem({
          ...activeResizeItem,
          currentOffsetMinutes: deltaY,
        });
      } else if (activeDragItem) {
        const deltaY = e.clientY - activeDragItem.startClientY;
        const deltaX = e.clientX - activeDragItem.startClientX;
        if (Math.abs(deltaY) > 2 || Math.abs(deltaX) > 2) {
          setHasMoved(true);
        }
        setActiveDragItem({
          ...activeDragItem,
          currentOffsetMinutes: deltaY,
        });
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      handleGlobalMouseUp(e);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeDragItem, activeResizeItem, hoveredDateStr, events, tasks, onUpdateEvent, onUpdateTask]);

  const handlePrev = () => {
    const offset = viewType === 'day' ? 1 : viewType === 'three-day' ? 3 : viewType === 'week' ? 7 : 30;
    if (viewType === 'month') {
      setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, selectedDate.getDate()));
    } else {
      setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - offset));
    }
  };

  const handleNext = () => {
    const offset = viewType === 'day' ? 1 : viewType === 'three-day' ? 3 : viewType === 'week' ? 7 : 30;
    if (viewType === 'month') {
      setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate()));
    } else {
      setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + offset));
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Get date range arrays based on view
  const getActiveDates = (): Date[] => {
    const dates: Date[] = [];
    if (viewType === 'day') {
      dates.push(new Date(selectedDate));
    } else if (viewType === 'three-day') {
      for (let i = 0; i < 3; i++) {
        const d = new Date(selectedDate);
        d.setDate(selectedDate.getDate() + i);
        dates.push(d);
      }
    } else if (viewType === 'week') {
      const currentDay = (selectedDate.getDay() + 6) % 7; // 0 Monday, 1 Tuesday, ..., 6 Sunday
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - currentDay);
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        dates.push(d);
      }
    }
    return dates;
  };

  // Month View Days list (classic 42 cells)
  const getMonthDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];
    
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, prevMonthTotalDays - i),
        isCurrentMonth: false,
      });
    }
    for (let i = 1; i <= totalDays; i++) {
      cells.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    const remainingCells = 42 - cells.length;
    for (let i = 1; i <= remainingCells; i++) {
      cells.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    return cells;
  };

  const activeDates = getActiveDates();
  const monthCells = getMonthDays();
  const hours = Array.from({ length: Math.max(1, endHour - startHour) }, (_, i) => startHour + i);

  // Drag interaction handlers
  const snapStep = snapInterval || 10;

  const handleColMouseDown = (dateStr: string, e: React.PointerEvent<HTMLDivElement>) => {
    if (activeDragItem || activeResizeItem) return; // Prevent creating new event if actively dragging/resizing
    if (e.button !== 0) return; // Left click/tap only
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = Math.max(startHour * 60, Math.min(endHour * 60 - 1, Math.round(y / snapStep) * snapStep + startHour * 60));
    setDragStart({ dateStr, minutes });
    setDragCurrent({ minutes });
  };

  const handleColMouseMove = (dateStr: string, e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart || dragStart.dateStr !== dateStr) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = Math.max(0, Math.min(1439, Math.round(y / snapStep) * snapStep));
    setDragCurrent({ minutes });
  };

  const handleColMouseUp = (dateStr: string, e?: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart || dragStart.dateStr !== dateStr || !dragCurrent) return;

    const minMinutes = Math.min(dragStart.minutes, dragCurrent.minutes);
    let maxMinutes = Math.max(dragStart.minutes, dragCurrent.minutes);

    if (maxMinutes - minMinutes < 30) {
      maxMinutes = minMinutes + 60; // default to 1 hr if brief click
    }

    const startStr = minutesToTimeString(minMinutes);
    const endStr = minutesToTimeString(Math.min(1439, maxMinutes));

    let anchorPos: { top: number; left: number; right: number; bottom: number; width: number; height: number } | null = null;
    if (e && e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      const slotTop = rect.top + minMinutes;
      const slotHeight = Math.max(30, maxMinutes - minMinutes);
      anchorPos = {
        top: slotTop,
        left: rect.left,
        right: rect.right,
        bottom: slotTop + slotHeight,
        width: rect.width,
        height: slotHeight,
      };
    }

    // Open creation modal pre-filled directly beside clicked slot
    onOpenCreateModal(dateStr, startStr, endStr, anchorPos);

    setDragStart(null);
    setDragCurrent(null);
  };

  const handleCardMouseDown = (
    id: string,
    type: 'event' | 'task',
    startMin: number,
    endMin: number,
    itemDate: string,
    e: React.PointerEvent<any> | React.MouseEvent<any>
  ) => {
    if (e.button !== 0) return; // Left click/tap only
    if ((e.target as HTMLElement).closest('button')) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }

    setHasMoved(false);
    dragStartPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };

    setActiveDragItem({
      id,
      type,
      originalDateStr: itemDate,
      originalStartMin: startMin,
      originalEndMin: endMin,
      startClientX: e.clientX,
      startClientY: e.clientY,
      currentOffsetMinutes: 0,
    });
    setHoveredDateStr(itemDate);
  };

  const handleResizeStart = (
    id: string,
    type: 'event' | 'task',
    startMin: number,
    endMin: number,
    itemDate: string,
    edge: 'top' | 'bottom',
    e: React.PointerEvent<any> | React.MouseEvent<any>
  ) => {
    if (e.button !== 0) return; // Left click/tap only
    e.stopPropagation();
    e.preventDefault();

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }

    setHasMoved(false);
    setActiveResizeItem({
      id,
      type,
      edge,
      originalDateStr: itemDate,
      originalStartMin: startMin,
      originalEndMin: endMin,
      startClientY: e.clientY,
      currentOffsetMinutes: 0,
    });
  };

  const handleGlobalMouseUp = (e?: PointerEvent) => {
    dragStartPosRef.current = null;

    if (hasMoved) {
      clickBlockedRef.current = true;
      setTimeout(() => {
        clickBlockedRef.current = false;
        setHasMoved(false);
      }, 150);
    }

    if (activeResizeItem) {
      const shift = Math.round(activeResizeItem.currentOffsetMinutes / snapStep) * snapStep;
      const isActuallyResized = shift !== 0;

      if (activeResizeItem.id === 'draft') {
        let finalStartMin = activeResizeItem.originalStartMin;
        let finalEndMin = activeResizeItem.originalEndMin;
        if (activeResizeItem.edge === 'top') {
          finalStartMin = Math.max(0, Math.min(activeResizeItem.originalEndMin - snapStep, activeResizeItem.originalStartMin + shift));
        } else {
          finalEndMin = Math.max(activeResizeItem.originalStartMin + snapStep, Math.min(1440, activeResizeItem.originalEndMin + shift));
        }
        if (onUpdateModalTimes) {
          onUpdateModalTimes(activeResizeItem.originalDateStr, minutesToTimeString(finalStartMin), minutesToTimeString(finalEndMin));
        }
      } else if (activeResizeItem.edge === 'top') {
        const snappedStartMin = Math.max(0, Math.min(activeResizeItem.originalEndMin - snapStep, activeResizeItem.originalStartMin + shift));
        const startStr = minutesToTimeString(snappedStartMin);

        if (isActuallyResized) {
          if (activeResizeItem.type === 'event') {
            const ev = events.find(item => item.id === activeResizeItem.id);
            const isEvRecurring = ev && ((ev.recurringDays && ev.recurringDays.length > 0) || !!ev.recurringParentId);
            if (isEvRecurring && ev) {
              if (recurrenceBehavior === 'one') {
                const originalDateStr = activeResizeItem.originalDateStr;
                const newSingleData = {
                  title: ev.title,
                  description: ev.description,
                  tagId: ev.tagId,
                  color: ev.color,
                  goalId: ev.goalId,
                  goalName: ev.goalName,
                  date: originalDateStr,
                  startTime: startStr,
                  endTime: ev.endTime,
                };
                if (onSplitRecurringEvent) {
                  onSplitRecurringEvent(ev.id, originalDateStr, newSingleData);
                } else {
                  const currentExcepts = ev.exceptDates || [];
                  if (!currentExcepts.includes(originalDateStr)) {
                    if (onUpdateEvent) onUpdateEvent(ev.id, { exceptDates: [...currentExcepts, originalDateStr] });
                  }
                  if (onSaveEvent) onSaveEvent(newSingleData);
                }
              } else if (recurrenceBehavior === 'all') {
                if (onUpdateRecurringSeries) {
                  onUpdateRecurringSeries(ev.id, { startTime: startStr });
                } else if (onUpdateEvent) {
                  onUpdateEvent(ev.id, { startTime: startStr });
                }
              } else {
                setRecurrencePrompt({
                  id: ev.id,
                  type: 'resize',
                  originalDateStr: activeResizeItem.originalDateStr,
                  newStartTime: startStr,
                  newEndTime: ev.endTime,
                });
                setRecurrenceChoice('one');
                setActiveResizeItem(null);
                clickBlockedRef.current = true;
                setTimeout(() => {
                  clickBlockedRef.current = false;
                }, 150);
                return;
              }
            } else if (onUpdateEvent) {
              onUpdateEvent(activeResizeItem.id, { startTime: startStr });
            }
          } else if (activeResizeItem.type === 'task' && onUpdateTask) {
            onUpdateTask(activeResizeItem.id, { startTime: startStr });
          }
        }
      } else {
        // Bottom edge resize
        const snappedEndMin = Math.max(activeResizeItem.originalStartMin + snapStep, Math.min(1440, activeResizeItem.originalEndMin + shift));
        const endStr = minutesToTimeString(snappedEndMin);

        if (isActuallyResized) {
          if (activeResizeItem.type === 'event') {
            const ev = events.find(item => item.id === activeResizeItem.id);
            const isEvRecurring = ev && ((ev.recurringDays && ev.recurringDays.length > 0) || !!ev.recurringParentId);
            if (isEvRecurring && ev) {
              if (recurrenceBehavior === 'one') {
                const originalDateStr = activeResizeItem.originalDateStr;
                const newSingleData = {
                  title: ev.title,
                  description: ev.description,
                  tagId: ev.tagId,
                  color: ev.color,
                  goalId: ev.goalId,
                  goalName: ev.goalName,
                  date: originalDateStr,
                  startTime: ev.startTime,
                  endTime: endStr,
                };
                if (onSplitRecurringEvent) {
                  onSplitRecurringEvent(ev.id, originalDateStr, newSingleData);
                } else {
                  const currentExcepts = ev.exceptDates || [];
                  if (!currentExcepts.includes(originalDateStr)) {
                    if (onUpdateEvent) onUpdateEvent(ev.id, { exceptDates: [...currentExcepts, originalDateStr] });
                  }
                  if (onSaveEvent) onSaveEvent(newSingleData);
                }
              } else if (recurrenceBehavior === 'all') {
                if (onUpdateRecurringSeries) {
                  onUpdateRecurringSeries(ev.id, { endTime: endStr });
                } else if (onUpdateEvent) {
                  onUpdateEvent(ev.id, { endTime: endStr });
                }
              } else {
                setRecurrencePrompt({
                  id: ev.id,
                  type: 'resize',
                  originalDateStr: activeResizeItem.originalDateStr,
                  newStartTime: ev.startTime,
                  newEndTime: endStr,
                });
                setRecurrenceChoice('one');
                setActiveResizeItem(null);
                clickBlockedRef.current = true;
                setTimeout(() => {
                  clickBlockedRef.current = false;
                }, 150);
                return;
              }
            } else if (onUpdateEvent) {
              onUpdateEvent(activeResizeItem.id, { endTime: endStr });
            }
          } else if (activeResizeItem.type === 'task' && onUpdateTask) {
            onUpdateTask(activeResizeItem.id, { endTime: endStr });
          }
        }
      }

      setActiveResizeItem(null);
    } else if (activeDragItem) {
      const shift = Math.round(activeDragItem.currentOffsetMinutes / snapStep) * snapStep;
      const duration = activeDragItem.originalEndMin - activeDragItem.originalStartMin;
      const finalStartMin = Math.max(0, Math.min(1440 - duration, activeDragItem.originalStartMin + shift));
      const finalEndMin = finalStartMin + duration;

      const finalDate = hoveredDateStr || activeDragItem.originalDateStr;
      const isActuallyMoved = shift !== 0 || finalDate !== activeDragItem.originalDateStr;
      const startStr = minutesToTimeString(finalStartMin);
      const endStr = minutesToTimeString(finalEndMin);

      if (activeDragItem.id === 'draft') {
        if (onUpdateModalTimes) {
          onUpdateModalTimes(finalDate, startStr, endStr);
        }
      } else if (isActuallyMoved) {
        if (activeDragItem.type === 'event') {
          const ev = events.find(item => item.id === activeDragItem.id);
          const isEvRecurring = ev && ((ev.recurringDays && ev.recurringDays.length > 0) || !!ev.recurringParentId);
          if (isEvRecurring && ev) {
            if (recurrenceBehavior === 'one') {
              // Automatically apply to just this single occurrence
              const originalDateStr = activeDragItem.originalDateStr;
              const newSingleData = {
                title: ev.title,
                description: ev.description,
                tagId: ev.tagId,
                color: ev.color,
                goalId: ev.goalId,
                goalName: ev.goalName,
                date: finalDate,
                startTime: startStr,
                endTime: endStr,
              };
              if (onSplitRecurringEvent) {
                onSplitRecurringEvent(ev.id, originalDateStr, newSingleData);
              } else {
                const currentExcepts = ev.exceptDates || [];
                if (!currentExcepts.includes(originalDateStr)) {
                  if (onUpdateEvent) onUpdateEvent(ev.id, { exceptDates: [...currentExcepts, originalDateStr] });
                }
                if (onSaveEvent) onSaveEvent(newSingleData);
              }
            } else if (recurrenceBehavior === 'all') {
              // Automatically apply all events
              let updatedRecurringDays = ev.recurringDays;
              const originalDateStr = activeDragItem.originalDateStr;
              if (finalDate && originalDateStr) {
                const origDayOfWeek = new Date(originalDateStr + 'T12:00:00').getDay();
                const newDayOfWeek = new Date(finalDate + 'T12:00:00').getDay();
                if (origDayOfWeek !== newDayOfWeek && ev.recurringDays) {
                  updatedRecurringDays = ev.recurringDays.map(d => d === origDayOfWeek ? newDayOfWeek : d);
                }
              }
              const updates = {
                date: finalDate,
                startTime: startStr,
                endTime: endStr,
                recurringDays: updatedRecurringDays,
              };
              if (onUpdateRecurringSeries) {
                onUpdateRecurringSeries(ev.id, updates);
              } else if (onUpdateEvent) {
                onUpdateEvent(ev.id, updates);
              }
            } else {
              // It's a recurring event, ask the user!
              setRecurrencePrompt({
                id: ev.id,
                type: 'drag',
                originalDateStr: activeDragItem.originalDateStr,
                newDateStr: finalDate,
                newStartTime: startStr,
                newEndTime: endStr,
              });
              setRecurrenceChoice('one');
              setActiveDragItem(null);
              setHoveredDateStr(null);
              clickBlockedRef.current = true;
              setTimeout(() => {
                clickBlockedRef.current = false;
              }, 150);
              return;
            }
          } else if (onUpdateEvent) {
            onUpdateEvent(activeDragItem.id, {
              date: finalDate,
              startTime: startStr,
              endTime: endStr,
            });
          }
        } else if (activeDragItem.type === 'task' && onUpdateTask) {
          onUpdateTask(activeDragItem.id, {
            date: finalDate,
            startTime: startStr,
            endTime: endStr,
          });
        }
      }

      setActiveDragItem(null);
      setHoveredDateStr(null);
    }
  };

  const handleRecurrenceChoice = (choice: 'one' | 'all') => {
    if (!recurrencePrompt) return;
    const { id, type, originalDateStr, newDateStr, newStartTime, newEndTime, newEndTimeOnly } = recurrencePrompt;
    const ev = events.find(item => item.id === id);

    if (ev) {
      if (choice === 'one') {
        const newSingleData: Omit<CalendarEvent, 'id'> = {
          title: ev.title,
          description: ev.description,
          tagId: ev.tagId,
          color: ev.color,
          goalId: ev.goalId,
          goalName: ev.goalName,
          date: type === 'drag' ? (newDateStr || originalDateStr) : originalDateStr,
          startTime: newStartTime || ev.startTime,
          endTime: newEndTime || newEndTimeOnly || ev.endTime,
        };

        if (onSplitRecurringEvent) {
          onSplitRecurringEvent(ev.id, originalDateStr, newSingleData);
        } else {
          // 1. Exclude this date from the original event
          const currentExcepts = ev.exceptDates || [];
          if (!currentExcepts.includes(originalDateStr)) {
            const updatedExcepts = [...currentExcepts, originalDateStr];
            if (onUpdateEvent) {
              onUpdateEvent(ev.id, { exceptDates: updatedExcepts });
            }
          }
          // 2. Create a new single non-recurring copy
          if (onSaveEvent) {
            onSaveEvent(newSingleData);
          }
        }
      } else {
        // "all" - Apply to all occurrences in the series
        if (type === 'resize') {
          const updates = {
            startTime: newStartTime || ev.startTime,
            endTime: newEndTime || newEndTimeOnly || ev.endTime,
          };
          if (onUpdateRecurringSeries) {
            onUpdateRecurringSeries(ev.id, updates);
          } else if (onUpdateEvent) {
            onUpdateEvent(ev.id, updates);
          }
        } else if (type === 'drag') {
          // If the day of the week changed, we should update the recurringDays
          let updatedRecurringDays = ev.recurringDays;
          if (newDateStr && originalDateStr) {
            const origDayOfWeek = new Date(originalDateStr + 'T12:00:00').getDay();
            const newDayOfWeek = new Date(newDateStr + 'T12:00:00').getDay();
            if (origDayOfWeek !== newDayOfWeek && ev.recurringDays) {
              updatedRecurringDays = ev.recurringDays.map(d => d === origDayOfWeek ? newDayOfWeek : d);
            }
          }

          const updates = {
            date: newDateStr || ev.date,
            startTime: newStartTime || ev.startTime,
            endTime: newEndTime || ev.endTime,
            recurringDays: updatedRecurringDays,
          };
          if (onUpdateRecurringSeries) {
            onUpdateRecurringSeries(ev.id, updates);
          } else if (onUpdateEvent) {
            onUpdateEvent(ev.id, updates);
          }
        }
      }
    }

    setRecurrencePrompt(null);
  };

  // Check if a date is "Today"
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const visibleTagIds = new Set(tags.filter(t => t.visible).map(t => t.id));

  return (
    <div
      className="flex-1 flex flex-col bg-slate-50 dark:bg-[#070A11] text-slate-800 dark:text-[#F4F4F5] overflow-hidden transition-colors duration-200"
      id="larkcal-calendar-view"
    >
      {/* Calendar Header with Navigation and View Selection - Mobile Adaptive */}
      <div className="h-auto md:h-14 py-3 md:py-0 gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] px-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between flex-shrink-0">
        <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-auto">
          <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-white tracking-tight font-sans min-w-[120px] md:min-w-44">
            {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
 
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={handleToday}
              className="px-2.5 md:px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xs rounded-md transition cursor-pointer"
              id="today-btn"
            >
              Today
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
            <button
              onClick={handlePrev}
              className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xs transition cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xs transition cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
 
        {/* View Switchers: Day, 3 Days, Week, Month */}
        <div className="flex w-full md:w-auto bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60 justify-between md:justify-start overflow-x-auto scrollbar-none">
          {((['day', 'three-day', 'week', 'month'] as CalendarViewType[])
            .filter(v => deviceType !== 'Phone' || v === 'day')
          ).map((v) => {
            const labels: Record<CalendarViewType, string> = {
              day: 'Day',
              'three-day': '3 Days',
              week: 'Week',
              month: 'Month',
            };
            return (
              <button
                key={v}
                onClick={() => setViewType(v)}
                className={`flex-1 md:flex-initial text-center px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  viewType === v
                    ? 'bg-white dark:bg-[#0066FF] text-[#0066FF] dark:text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {labels[v]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Weekday Column Headers (Only for Timeline hourly views) */}
      {viewType !== 'month' && (
        <div className="flex border-b border-slate-200 dark:border-[#2A2E39] bg-slate-50 dark:bg-[#13151A] flex-shrink-0">
          <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-[#2A2E39] bg-slate-50 dark:bg-[#13151A]" /> {/* Spacer for Time Column */}
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${activeDates.length}, minmax(0, 1fr))` }}>
            {activeDates.map((date, idx) => {
              const current = isToday(date);
              const formattedDay = date.toLocaleString('default', { weekday: 'short' }).toUpperCase();
              return (
                <div key={idx} className="text-center py-2 border-r border-slate-200 dark:border-[#2A2E39] flex items-center justify-center gap-2 bg-white dark:bg-[#1C1F26]">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-[#9CA3AF] tracking-wider">
                    {formattedDay}
                  </span>
                  <span className={`text-sm font-extrabold w-6 h-6 flex items-center justify-center rounded-full ${
                    current ? 'bg-[#0066FF] text-white shadow-xs' : 'text-slate-800 dark:text-[#F4F4F5]'
                  }`}>
                    {date.getDate()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MAIN CALENDAR TIMELINE BODY */}
      {viewType === 'month' ? (
        /* ---------------- MONTH VIEW GRID ---------------- */
        <div className="flex-1 overflow-hidden min-h-0 bg-slate-50 dark:bg-[#070A17] p-4 flex flex-col">
          <div className="grid grid-cols-7 border-b border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-[#0F172A]/70 text-center py-1.5 rounded-t-xl flex-shrink-0">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, idx) => (
              <span key={idx} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider font-sans">
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 grid-rows-6 flex-1 min-h-[350px] border-b border-r border-slate-200 dark:border-slate-800 rounded-b-xl overflow-hidden shadow-xs">
            {monthCells.map((cell, cellIdx) => {
              const dateStr = formatDateString(cell.date);
              const dayEvents = events.filter(e => isEventOnDate(e, cell.date, dateStr) && visibleTagIds.has(e.tagId));
              const dayTasks = tasks.filter(t => t.date === dateStr && t.startTime && t.startTime !== '');
              const isSelected = formatDateString(selectedDate) === dateStr;
              const isCurrent = isToday(cell.date);

              return (
                <div
                  key={cellIdx}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setSelectedDate(cell.date);
                    }
                  }}
                  onDoubleClick={() => onOpenCreateModal(dateStr, '09:00', '10:00')}
                  className={`border-t border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-1.5 flex flex-col justify-start min-h-[85px] group transition-all relative ${
                    !cell.isCurrentMonth ? 'opacity-45 bg-slate-50/40 dark:bg-slate-900/40' : ''
                  } ${isSelected ? 'ring-2 ring-[#0066FF]/20 z-10' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1.5 pointer-events-none">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      isCurrent
                        ? 'bg-[#0066FF] text-white'
                        : 'text-slate-600 dark:text-slate-300 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'
                    }`}>
                      {cell.date.getDate()}
                    </span>
                  </div>

                  <div className="flex flex-col overflow-y-auto flex-1 max-h-[100px] scrollbar-thin" style={{ gap: `${calendarGap ?? 4}px` }}>
                    {dayEvents.map((ev) => {
                      const tag = tags.find(t => t.id === ev.tagId);
                      const styleVal = getEventStyle(ev, tag);
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            onOpenEditModal('event', ev, dateStr, {
                              top: rect.top,
                              left: rect.left,
                              right: rect.right,
                              bottom: rect.bottom,
                              width: rect.width,
                              height: rect.height,
                            });
                          }}
                          style={styleVal}
                          className="px-2 py-1 text-[11px] font-semibold truncate cursor-pointer flex items-center justify-between gap-1 shadow-2xs hover:brightness-95 transition-all text-white"
                        >
                          <span className="truncate">{ev.title}</span>
                          {ev.startTime && <span className="text-[9px] font-sans font-semibold tabular-nums opacity-90 shrink-0">{formatTo12Hour(ev.startTime)}</span>}
                        </div>
                      );
                    })}

                    {dayTasks.map((t) => {
                      const completed = t.status === 'done';
                      const grp = groups.find(g => g.id === t.groupId);
                      const styleVal = getTaskStyle(t, grp, completed, isDark);
                      const colorKey = t.color || grp?.color;
                      const sysColor = getSystemColor(colorKey);

                      return (
                        <div
                          key={t.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            onOpenEditModal('task', t, undefined, {
                              top: rect.top,
                              left: rect.left,
                              right: rect.right,
                              bottom: rect.bottom,
                              width: rect.width,
                              height: rect.height,
                            });
                          }}
                          style={styleVal}
                          className="px-2 py-1 text-[11px] font-semibold cursor-pointer flex items-center justify-between gap-1 shadow-2xs hover:brightness-95 transition-all text-slate-900 dark:text-slate-100"
                          title="Click to edit, checkbox to toggle status"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleTaskStatus(t.id);
                              }}
                              className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer"
                              style={{
                                borderColor: completed ? (isDark ? '#475569' : '#cbd5e1') : sysColor.solid,
                                backgroundColor: completed ? (isDark ? '#475569' : '#cbd5e1') : (isDark ? '#1e293b' : '#ffffff'),
                              }}
                            >
                              {completed && <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />}
                            </button>
                            <span className={`truncate text-slate-900 dark:text-slate-100 ${completed ? 'line-through text-slate-400' : ''}`}>
                              {t.title}
                            </span>
                          </div>
                          {t.startTime && (
                            <span className="text-[9px] font-sans font-bold tabular-nums shrink-0" style={{ color: completed ? '#94a3b8' : sysColor.solid }}>
                              {formatTo12Hour(t.startTime)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ---------------- TIMELINE HOURLY HOVER-DRAG GRID ---------------- */
        <div 
          ref={scrollContainerRef} 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex-1 overflow-y-auto min-h-0 relative select-none bg-slate-50 dark:bg-[#13151A] text-slate-800 dark:text-[#F4F4F5] touch-pan-y" 
          id="timeline-scroll-container"
        >
          <div className="flex relative flex-shrink-0" style={{ height: `${(endHour - startHour) * 60}px` }}>
            
            {/* Hour Labels Column (Left) */}
            <div className="w-16 flex-shrink-0 bg-slate-50 dark:bg-[#13151A] border-r border-slate-200 dark:border-[#2A2E39] select-none relative" style={{ height: `${(endHour - startHour) * 60}px` }}>
              {hours.map((hour) => {
                const displayHour = hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
                const currentTotalMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
                const hourMinutes = hour * 60;
                const minutesDiff = Math.abs(currentTotalMinutes - hourMinutes);
                const isNearCurrentTime = activeDates.some(d => isToday(d)) && minutesDiff < 14;

                return (
                  <div 
                    key={hour} 
                    className={`absolute right-2 -translate-y-1/2 flex items-center justify-end transition-opacity duration-200 ${
                      isNearCurrentTime ? 'opacity-15' : 'opacity-100'
                    }`}
                    style={{ top: `${(hour - startHour) * 60}px` }}
                  >
                    <span className="text-[11px] font-bold text-slate-500 dark:text-[#9CA3AF] font-sans tabular-nums tracking-tight">
                      {displayHour}
                    </span>
                  </div>
                );
              })}

              {/* Red Current Time Badge in Hour Column */}
              {activeDates.some(d => isToday(d)) && (
                <div
                  className="absolute right-1 -translate-y-1/2 z-40 pointer-events-none bg-rose-500 text-white text-[10px] font-bold font-sans tabular-nums px-1.5 py-0.5 rounded shadow-xs"
                  style={{ top: `${currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60 - startHour * 60}px` }}
                >
                  {formatTo12Hour(minutesToTimeString(currentTime.getHours() * 60 + currentTime.getMinutes()))}
                </div>
              )}
            </div>

            {/* Time Grid Columns Column (Right) */}
            <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${activeDates.length}, minmax(0, 1fr))` }}>
              
              {/* Hourly Grid Background Lines (Absolute Layer) */}
              <div className="absolute inset-0 pointer-events-none z-10">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-slate-200 dark:border-[#2A2E39]"
                    style={{ top: `${(hour - startHour) * 60}px`, height: '60px' }}
                  />
                ))}
              </div>

              {/* RED CURRENT TIME INDICATOR LINE spanning across all columns */}
              {activeDates.some(d => isToday(d)) && (
                <div
                  className="absolute left-0 right-0 flex items-center z-40 pointer-events-none -translate-y-1/2"
                  style={{ top: `${currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60 - startHour * 60}px` }}
                >
                  {/* Dot on the left */}
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm -ml-1.5 shrink-0" />
                  {/* Red line */}
                  <div className="flex-1 h-[2px] bg-rose-500 shadow-xs" />
                </div>
              )}

              {/* Day Columns */}
              {activeDates.map((date) => {
                const dateStr = formatDateString(date);

                // Combine items in this column to calculate overlapping positions
                const eventColumnItems = events
                  .filter((e) => visibleTagIds.has(e.tagId))
                  .map((e) => {
                    const start = timeStringToMinutes(e.startTime || '09:00');
                    const end = timeStringToMinutes(e.endTime || '10:00');

                    const isBeingDragged = activeDragItem && activeDragItem.id === e.id && activeDragItem.type === 'event';
                    const isBeingResized = activeResizeItem && activeResizeItem.id === e.id && activeResizeItem.type === 'event';
                    const isBeingPrompted = recurrencePrompt && recurrencePrompt.id === e.id;

                    if (isBeingPrompted) {
                      if (recurrencePrompt.type === 'drag') {
                        const targetDate = recurrencePrompt.newDateStr || recurrencePrompt.originalDateStr;
                        if (dateStr === targetDate) {
                          const previewStart = timeStringToMinutes(recurrencePrompt.newStartTime || e.startTime || '09:00');
                          const previewEnd = timeStringToMinutes(recurrencePrompt.newEndTime || e.endTime || '10:00');
                          return {
                            id: e.id,
                            type: 'event' as const,
                            item: e,
                            date: dateStr,
                            startMin: previewStart,
                            endMin: previewEnd,
                          };
                        } else if (isEventOnDate(e, date, dateStr)) {
                          if (dateStr === recurrencePrompt.originalDateStr) {
                            return null;
                          }
                          return {
                            id: e.id,
                            type: 'event' as const,
                            item: e,
                            date: dateStr,
                            startMin: start,
                            endMin: end,
                          };
                        }
                        return null;
                      } else if (recurrencePrompt.type === 'resize') {
                        if (isEventOnDate(e, date, dateStr)) {
                          if (dateStr === recurrencePrompt.originalDateStr) {
                            const previewStart = timeStringToMinutes(recurrencePrompt.newStartTime || e.startTime || '09:00');
                            const previewEnd = timeStringToMinutes(recurrencePrompt.newEndTime || recurrencePrompt.newEndTimeOnly || e.endTime || '10:00');
                            return {
                              id: e.id,
                              type: 'event' as const,
                              item: e,
                              date: dateStr,
                              startMin: previewStart,
                              endMin: previewEnd,
                            };
                          } else {
                            return {
                              id: e.id,
                              type: 'event' as const,
                              item: e,
                              date: dateStr,
                              startMin: start,
                              endMin: end,
                            };
                          }
                        }
                        return null;
                      }
                    }

                    if (isBeingDragged) {
                      const targetDragDate = hoveredDateStr || activeDragItem.originalDateStr;
                      if (dateStr === targetDragDate) {
                        const duration = end - start;
                        const shift = Math.round(activeDragItem.currentOffsetMinutes / snapStep) * snapStep;
                        const previewStart = Math.max(0, Math.min(1440 - duration, activeDragItem.originalStartMin + shift));
                        const previewEnd = previewStart + duration;
                        return {
                          id: e.id,
                          type: 'event' as const,
                          item: e,
                          date: dateStr,
                          startMin: previewStart,
                          endMin: previewEnd,
                        };
                      } else if (isEventOnDate(e, date, dateStr) && dateStr !== activeDragItem.originalDateStr) {
                        return {
                          id: e.id,
                          type: 'event' as const,
                          item: e,
                          date: dateStr,
                          startMin: start,
                          endMin: end,
                        };
                      }
                      return null;
                    }

                    if (isBeingResized) {
                      if (isEventOnDate(e, date, dateStr)) {
                        if (dateStr === activeResizeItem.originalDateStr) {
                          const shift = Math.round(activeResizeItem.currentOffsetMinutes / snapStep) * snapStep;
                          let previewStart = start;
                          let previewEnd = end;
                          if (activeResizeItem.edge === 'top') {
                            previewStart = Math.max(0, Math.min(activeResizeItem.originalEndMin - snapStep, activeResizeItem.originalStartMin + shift));
                          } else {
                            previewEnd = Math.max(activeResizeItem.originalStartMin + snapStep, Math.min(1440, activeResizeItem.originalEndMin + shift));
                          }
                          return {
                            id: e.id,
                            type: 'event' as const,
                            item: e,
                            date: dateStr,
                            startMin: previewStart,
                            endMin: previewEnd,
                          };
                        } else {
                          return {
                            id: e.id,
                            type: 'event' as const,
                            item: e,
                            date: dateStr,
                            startMin: start,
                            endMin: end,
                          };
                        }
                      }
                      return null;
                    }

                    // Normal state (no active drag/resize for this event)
                    if (isEventOnDate(e, date, dateStr)) {
                      return {
                        id: e.id,
                        type: 'event' as const,
                        item: e,
                        date: dateStr,
                        startMin: start,
                        endMin: end,
                      };
                    }

                    return null;
                  })
                  .filter((item): item is NonNullable<typeof item> => item !== null);

                const taskColumnItems = tasks
                  .filter((t) => t.startTime && t.startTime !== '')
                  .map((t) => {
                    const start = timeStringToMinutes(t.startTime!);
                    const end = t.endTime ? timeStringToMinutes(t.endTime) : start + 45;

                    const isBeingDragged = activeDragItem && activeDragItem.id === t.id && activeDragItem.type === 'task';
                    const isBeingResized = activeResizeItem && activeResizeItem.id === t.id && activeResizeItem.type === 'task';

                    if (isBeingDragged) {
                      const targetDragDate = hoveredDateStr || activeDragItem.originalDateStr;
                      if (dateStr === targetDragDate) {
                        const duration = Math.max(15, end - start);
                        const shift = Math.round(activeDragItem.currentOffsetMinutes / snapStep) * snapStep;
                        const previewStart = Math.max(0, Math.min(1440 - duration, activeDragItem.originalStartMin + shift));
                        const previewEnd = previewStart + duration;
                        return {
                          id: t.id,
                          type: 'task' as const,
                          item: t,
                          date: dateStr,
                          startMin: previewStart,
                          endMin: previewEnd,
                        };
                      }
                      return null;
                    }

                    if (isBeingResized) {
                      if (dateStr === t.date) {
                        const shift = Math.round(activeResizeItem.currentOffsetMinutes / snapStep) * snapStep;
                        let previewStart = start;
                        let previewEnd = end;
                        if (activeResizeItem.edge === 'top') {
                          previewStart = Math.max(0, Math.min(activeResizeItem.originalEndMin - snapStep, activeResizeItem.originalStartMin + shift));
                        } else {
                          previewEnd = Math.max(activeResizeItem.originalStartMin + snapStep, Math.min(1440, activeResizeItem.originalEndMin + shift));
                        }
                        return {
                          id: t.id,
                          type: 'task' as const,
                          item: t,
                          date: dateStr,
                          startMin: previewStart,
                          endMin: previewEnd,
                        };
                      }
                      return null;
                    }

                    if (t.date === dateStr) {
                      return {
                        id: t.id,
                        type: 'task' as const,
                        item: t,
                        date: dateStr,
                        startMin: start,
                        endMin: end,
                      };
                    }

                    return null;
                  })
                  .filter((item): item is NonNullable<typeof item> => item !== null);

                // Combine items in this column
                const columnItems = [...eventColumnItems, ...taskColumnItems];

                // Check active drag preview on this column
                const isDraggingThisCol = dragStart?.dateStr === dateStr;
                const dragMin = isDraggingThisCol && dragCurrent ? Math.min(dragStart.minutes, dragCurrent.minutes) : 0;
                const dragMax = isDraggingThisCol && dragCurrent ? Math.max(dragStart.minutes, dragCurrent.minutes) : 0;
                const dragHeight = dragMax - dragMin;

                const sortedColumnItems = [...columnItems].sort((a, b) => a.startMin - b.startMin);

                // Group overlapping items into clusters for beautiful side-by-side horizontal rendering
                const clusters: typeof sortedColumnItems[] = [];
                for (const item of sortedColumnItems) {
                  let placed = false;
                  for (const cluster of clusters) {
                    const overlaps = cluster.some(cItem => 
                      item.startMin < cItem.endMin && cItem.startMin < item.endMin
                    );
                    if (overlaps) {
                      cluster.push(item);
                      placed = true;
                      break;
                    }
                  }
                  if (!placed) {
                    clusters.push([item]);
                  }
                }

                const layoutData: Record<string, { left: string; width: string; top: number; height: number; totalLanes: number }> = {};

                for (const cluster of clusters) {
                  // Sort by startMin, then duration descending
                  cluster.sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));
                  const lanes: (typeof sortedColumnItems[number])[] = [];
                  const itemLaneIndex: Record<string, number> = {};

                  for (const item of cluster) {
                    let laneIdx = 0;
                    while (laneIdx < lanes.length) {
                      const lastInLane = lanes[laneIdx];
                      if (item.startMin >= lastInLane.endMin) {
                        lanes[laneIdx] = item;
                        itemLaneIndex[item.id] = laneIdx;
                        break;
                      }
                      laneIdx++;
                    }
                    if (laneIdx === lanes.length) {
                      lanes.push(item);
                      itemLaneIndex[item.id] = laneIdx;
                    }
                  }

                  const totalLanes = lanes.length;
                  for (const item of cluster) {
                    const laneIdx = itemLaneIndex[item.id];
                    const leftPercent = (laneIdx / totalLanes) * 100;
                    const widthPercent = (1 / totalLanes) * 100;

                    const gap = Math.min(calendarGap ?? 2, 2);
                    const halfGap = gap / 2;

                    // Calibrate top and height so card starts exactly 1px below start time and ends 1px before end time
                    const top = item.startMin - (startHour * 60) + halfGap;
                    const rawDuration = item.endMin - item.startMin;
                    const height = Math.max(20, rawDuration - gap);

                    const leftStr = `calc(${leftPercent}% + ${halfGap + 2}px)`;
                    const widthStr = `calc(${widthPercent}% - ${gap + 4}px)`;

                    layoutData[item.id] = {
                      left: leftStr,
                      width: widthStr,
                      top,
                      height,
                      totalLanes
                    };
                  }
                }

                const fallbackGap = calendarGap ?? 4;
                const fallbackHalfGap = fallbackGap / 2;

                return (
                  <div
                    key={dateStr}
                    onPointerDown={(e) => handleColMouseDown(dateStr, e)}
                    onPointerMove={(e) => handleColMouseMove(dateStr, e)}
                    onPointerUp={(e) => handleColMouseUp(dateStr, e)}
                    onPointerEnter={() => {
                      if (activeDragItem) {
                        setHoveredDateStr(dateStr);
                      }
                    }}
                    className={`h-full border-r border-slate-200 dark:border-[#2A2E39] relative bg-white dark:bg-[#1C1F26] transition-colors ${dragStart ? 'cursor-ns-resize' : 'cursor-default'}`}
                  >
                    {/* Drag Highlight Selection Block */}
                    {isDraggingThisCol && dragHeight > 0 && (
                       <div
                         className="absolute left-1.5 right-1.5 bg-[#0066FF]/20 border-2 border-[#0066FF] rounded-[6px] flex items-center justify-center pointer-events-none z-30 shadow-xs"
                         style={{ top: `${dragMin}px`, height: `${dragHeight}px` }}
                       >
                         <span className="text-[10px] font-bold text-[#0066FF] bg-white/90 px-1.5 py-0.5 rounded shadow-2xs font-sans tabular-nums">
                           {formatTo12Hour(minutesToTimeString(dragMin))} - {formatTo12Hour(minutesToTimeString(dragMax))} ({formatDuration(dragMin, dragMax)})
                         </span>
                       </div>
                    )}

                    {/* Draft Block preview while Creation Settings Card Modal is open - dynamic drag-and-resize enabled */}
                    {isModalOpen && !modalEditItem && (() => {
                      const isDraggedThisCol = activeDragItem && activeDragItem.id === 'draft' && (hoveredDateStr || activeDragItem.originalDateStr) === dateStr;
                      const isResizedThisCol = activeResizeItem && activeResizeItem.id === 'draft' && activeResizeItem.originalDateStr === dateStr;
                      const isDefaultThisCol = !activeDragItem && !activeResizeItem && modalDefaultDate === dateStr;

                      if (!isDraggedThisCol && !isResizedThisCol && !isDefaultThisCol) return null;

                      let startMin = timeStringToMinutes(modalDefaultStartTime) || 540;
                      let endMin = timeStringToMinutes(modalDefaultEndTime) || (startMin + 60);

                      if (isDraggedThisCol && activeDragItem) {
                        const shift = Math.round(activeDragItem.currentOffsetMinutes / snapStep) * snapStep;
                        const duration = activeDragItem.originalEndMin - activeDragItem.originalStartMin;
                        startMin = Math.max(0, Math.min(1440 - duration, activeDragItem.originalStartMin + shift));
                        endMin = startMin + duration;
                      } else if (isResizedThisCol && activeResizeItem) {
                        const shift = Math.round(activeResizeItem.currentOffsetMinutes / snapStep) * snapStep;
                        if (activeResizeItem.edge === 'top') {
                          startMin = Math.max(0, Math.min(activeResizeItem.originalEndMin - snapStep, activeResizeItem.originalStartMin + shift));
                        } else {
                          endMin = Math.max(activeResizeItem.originalStartMin + snapStep, Math.min(1440, activeResizeItem.originalEndMin + shift));
                        }
                      }

                      const duration = Math.max(20, endMin - startMin);
                      const isDragged = activeDragItem && activeDragItem.id === 'draft';
                      const isResized = activeResizeItem && activeResizeItem.id === 'draft';
                      const handleHClass = duration <= 22 ? 'h-1' : duration <= 34 ? 'h-1.5' : duration <= 48 ? 'h-2' : 'h-2.5';

                      return (
                        <div
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            handleCardMouseDown('draft', 'event', startMin, endMin, dateStr, e);
                          }}
                          style={{
                            top: `${startMin}px`,
                            height: `${duration}px`,
                            transform: isDragged ? 'scale(1.02)' : 'none',
                            zIndex: isDragged || isResized ? 50 : 30,
                            opacity: isDragged ? 0.6 : 1,
                          }}
                          className="absolute left-1.5 right-1.5 bg-[#0066FF]/20 border-2 border-dashed border-[#0066FF] rounded-[8px] flex flex-col justify-start p-2 text-white group cursor-grab active:cursor-grabbing hover:shadow-md transition-all overflow-hidden"
                          title="Drag body to move • Drag edges to resize"
                        >
                          <div className="min-w-0 pointer-events-none select-none w-full">
                            <span className="text-xs font-bold leading-none tracking-tight block truncate text-[#0066FF] dark:text-blue-300">
                              New Block (Draft)
                            </span>
                            <span className="text-[10px] font-bold font-sans tabular-nums text-[#0066FF]/90 dark:text-blue-300/90 block mt-0.5 whitespace-nowrap">
                              {formatTo12Hour(minutesToTimeString(startMin))} – {formatTo12Hour(minutesToTimeString(endMin))} ({formatDuration(startMin, endMin)})
                            </span>
                          </div>

                          {/* TOP RESIZE HANDLE BAR (Visible only on hover) */}
                          <div
                            className={`absolute top-0 left-0 right-0 ${handleHClass} cursor-ns-resize z-30 flex items-center justify-center bg-white/0 hover:bg-white/20 transition-colors touch-none group/resize-top`}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              handleResizeStart('draft', 'event', startMin, endMin, dateStr, 'top', e);
                            }}
                          >
                            {duration >= 28 && (
                              <div className="w-8 h-1 rounded-full bg-[#0066FF]/70 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xs" />
                            )}
                          </div>

                          {/* BOTTOM RESIZE HANDLE BAR (Visible only on hover) */}
                          <div
                            className={`absolute bottom-0 left-0 right-0 ${handleHClass} cursor-ns-resize z-30 flex items-center justify-center bg-white/0 hover:bg-white/20 transition-colors touch-none group/resize-bottom`}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              handleResizeStart('draft', 'event', startMin, endMin, dateStr, 'bottom', e);
                            }}
                          >
                            {duration >= 28 && (
                              <div className="w-8 h-1 rounded-full bg-[#0066FF]/70 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xs" />
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Render Event & Task Blocks using exact time calibrations */}
                    {sortedColumnItems.map((colItem) => {
                      const itemPos = layoutData[colItem.id] || {
                        left: `calc(0% + ${fallbackHalfGap + 2}px)`,
                        width: `calc(100% - ${fallbackGap + 4}px)`,
                        top: colItem.startMin + fallbackHalfGap,
                        height: Math.max(20, (colItem.endMin - colItem.startMin) - fallbackGap),
                        totalLanes: 1
                      };
                      const topPx = itemPos.top;
                      const heightPx = itemPos.height;
                      const leftVal = itemPos.left;
                      const widthVal = itemPos.width;
                      const totalLanes = itemPos.totalLanes || 1;
                      const isDragged = activeDragItem && activeDragItem.id === colItem.id && activeDragItem.type === colItem.type;
                      const isResized = activeResizeItem && activeResizeItem.id === colItem.id && activeResizeItem.type === colItem.type;

                      // Calculate dynamic resize handle hit zone height depending on event card height
                      const handleHClass = heightPx <= 22 ? 'h-1' : heightPx <= 34 ? 'h-1.5' : heightPx <= 48 ? 'h-2' : 'h-2.5';

                      if (colItem.type === 'event') {
                        const ev = colItem.item as CalendarEvent;
                        const tag = tags.find((t) => t.id === ev.tagId);
                        const styleVal = getEventStyle(ev, tag);

                        return (
                          <div
                            key={ev.id}
                            onPointerDown={(e) => {
                              e.stopPropagation(); // Stop background column drag-to-create triggering
                              handleCardMouseDown(ev.id, 'event', colItem.startMin, colItem.endMin, colItem.date, e);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hasMoved || clickBlockedRef.current) return; // Only open edit modal if we didn't just drag
                              const rect = e.currentTarget.getBoundingClientRect();
                              onOpenEditModal('event', ev, colItem.date, {
                                top: rect.top,
                                left: rect.left,
                                right: rect.right,
                                bottom: rect.bottom,
                                width: rect.width,
                                height: rect.height,
                              });
                            }}
                            style={{
                              ...styleVal,
                              top: `${topPx}px`,
                              height: `${heightPx}px`,
                              left: leftVal,
                              width: widthVal,
                              opacity: isDragged ? 0.6 : 1,
                              transform: isDragged ? 'scale(1.02)' : 'none',
                              zIndex: isDragged || isResized ? 50 : 20,
                            }}
                            className={`absolute shadow-2xs hover:shadow-md cursor-grab active:cursor-grabbing hover:brightness-95 transition-all flex flex-col overflow-hidden text-white touch-none group ${
                              heightPx <= 40 ? 'px-2.5 py-1 justify-center' : 'p-2 md:p-2.5 justify-start gap-0.5'
                            }`}
                          >
                            {/* Standardized top-right action button */}
                            <button
                              type="button"
                              onPointerDown={(e) => {
                                e.stopPropagation(); // Prevents dragging from starting
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const parent = e.currentTarget.closest('.group') || e.currentTarget;
                                const rect = parent.getBoundingClientRect();
                                onOpenEditModal('event', ev, colItem.date, {
                                  top: rect.top,
                                  left: rect.left,
                                  right: rect.right,
                                  bottom: rect.bottom,
                                  width: rect.width,
                                  height: rect.height,
                                });
                              }}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-black/20 hover:bg-black/40 flex items-center justify-center shrink-0 transition-all cursor-pointer text-white border border-white/10 opacity-75 md:opacity-0 md:group-hover:opacity-100 hover:scale-105 active:scale-95 z-30"
                              title="Edit Event"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>

                            {/* Event Title & Single-line or Multi-line Layout */}
                            {heightPx <= 40 ? (
                              <div className="min-w-0 pointer-events-none select-none pr-7 flex items-center gap-1.5 w-full truncate">
                                <span className="text-xs md:text-[13px] font-bold leading-none tracking-tight truncate text-white">
                                  {ev.title}
                                </span>
                                <span className="text-[10px] md:text-[11px] font-medium font-sans tabular-nums text-white/80 shrink-0">
                                  · {formatTo12Hour(minutesToTimeString(colItem.startMin))}
                                </span>
                              </div>
                            ) : (
                              <div className="min-w-0 pointer-events-none select-none pr-7 w-full">
                                <span className="text-xs md:text-[13px] font-bold leading-snug tracking-tight block truncate text-white">
                                  {ev.title}
                                </span>
                                {/* Adaptive time layout: single-line with ellipsis and no-wrap if wide, stacked cleanly if narrow */}
                                <div className="mt-0.5 pointer-events-none select-none text-[10px] md:text-[11px] font-medium font-sans tabular-nums text-white/85 leading-tight">
                                  {totalLanes > 1 || viewType === 'week' ? (
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-1 min-w-0">
                                        <Clock className="w-3 h-3 shrink-0 opacity-80" />
                                        <span className="truncate whitespace-nowrap">
                                          {formatTo12Hour(minutesToTimeString(colItem.startMin))} – {formatTo12Hour(minutesToTimeString(colItem.endMin))}
                                        </span>
                                      </div>
                                      <span className="text-[9.5px] md:text-[10px] text-white/75 font-normal pl-4 whitespace-nowrap">
                                        {formatDuration(colItem.startMin, colItem.endMin)}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                      <div className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                                        <Clock className="w-3 h-3 shrink-0 opacity-80" />
                                        <span>
                                          {formatTo12Hour(minutesToTimeString(colItem.startMin))} – {formatTo12Hour(minutesToTimeString(colItem.endMin))}
                                        </span>
                                      </div>
                                      <div className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                                        <span className="opacity-50">·</span>
                                        <span className="opacity-90 font-semibold">
                                          {formatDuration(colItem.startMin, colItem.endMin)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {ev.description && heightPx > 65 && (
                              <p className="text-[10px] md:text-[11px] text-white/80 mt-1 line-clamp-2 leading-tight pointer-events-none select-none">
                                {ev.description}
                              </p>
                            )}

                            {/* TOP RESIZE HANDLE BAR (Visible only on hover) */}
                            <div
                              className={`absolute top-0 left-0 right-0 ${handleHClass} cursor-ns-resize z-30 flex items-center justify-center bg-white/0 hover:bg-white/20 transition-colors touch-none group/resize-top`}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                handleResizeStart(ev.id, 'event', colItem.startMin, colItem.endMin, colItem.date, 'top', e);
                              }}
                            >
                              {heightPx >= 28 && (
                                <div className="w-8 h-1 rounded-full bg-white/70 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xs" />
                              )}
                            </div>

                            {/* BOTTOM RESIZE HANDLE BAR (Visible only on hover) */}
                            <div
                              className={`absolute bottom-0 left-0 right-0 ${handleHClass} cursor-ns-resize z-30 flex items-center justify-center bg-white/0 hover:bg-white/20 transition-colors touch-none group/resize-bottom`}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                handleResizeStart(ev.id, 'event', colItem.startMin, colItem.endMin, colItem.date, 'bottom', e);
                              }}
                            >
                              {heightPx >= 28 && (
                                <div className="w-8 h-1 rounded-full bg-white/70 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xs" />
                              )}
                            </div>
                          </div>
                        );
                      } else {
                        const task = colItem.item as Task;
                        const completed = task.status === 'done';
                        const grp = groups.find(g => g.id === task.groupId);
                        const styleVal = getTaskStyle(task, grp, completed, isDark);
                        const colorKey = task.color || grp?.color;
                        const sysColor = getSystemColor(colorKey);

                        const now = new Date();
                        const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                        const isColToday = colItem.date === todayDateStr;
                        const currentMin = currentTime.getHours() * 60 + currentTime.getMinutes();
                        const isActivelyRunning = isColToday && !completed && currentMin >= colItem.startMin && currentMin < colItem.endMin;
                        const isFocusActive = !completed && activeFocusTaskId === task.id && isFocusRunning;

                        return (
                          <div
                            key={task.id}
                            onPointerDown={(e) => {
                              e.stopPropagation(); // Stop background column drag-to-create triggering
                              handleCardMouseDown(task.id, 'task', colItem.startMin, colItem.endMin, colItem.date, e);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hasMoved || clickBlockedRef.current) return; // Prevent edit modal on drag release
                              const rect = e.currentTarget.getBoundingClientRect();
                              onOpenEditModal('task', task, undefined, {
                                top: rect.top,
                                left: rect.left,
                                right: rect.right,
                                bottom: rect.bottom,
                                width: rect.width,
                                height: rect.height,
                              });
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              onOpenEditModal('task', task, undefined, {
                                top: rect.top,
                                left: rect.left,
                                right: rect.right,
                                bottom: rect.bottom,
                                width: rect.width,
                                height: rect.height,
                              });
                            }}
                            style={{
                              ...styleVal,
                              top: `${topPx}px`,
                              height: `${heightPx}px`,
                              left: leftVal,
                              width: widthVal,
                              opacity: isDragged ? 0.6 : 1,
                              transform: isDragged ? 'scale(1.02)' : 'none',
                              zIndex: isDragged || isResized ? 50 : 25,
                            }}
                            className={`absolute bg-white dark:bg-[#1E293B] shadow-2xs hover:shadow-md cursor-grab active:cursor-grabbing hover:brightness-98 transition-all flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 touch-none group pl-3 ${
                              heightPx <= 40 ? 'px-2.5 py-1 justify-center' : 'p-2 md:p-2.5 justify-start gap-0.5'
                            }`}
                            title="Left-click to edit, Checkbox to toggle status"
                          >
                            {/* Standardized top-right action button (Play / Running indicator - permanently visible & high contrast) */}
                            {!completed && (
                              isFocusActive ? (
                                <button
                                  type="button"
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onStartTask) onStartTask(task);
                                  }}
                                  className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-[#0066FF] hover:bg-blue-700 text-white text-[10px] font-bold tracking-tight shadow-sm z-30 flex items-center justify-center whitespace-nowrap cursor-pointer transition border border-white/20 select-none"
                                  title="Task Started - Click to open Focus Room"
                                >
                                  Task Started
                                </button>
                              ) : isActivelyRunning ? (
                                <button
                                  type="button"
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onStartTask) onStartTask(task);
                                  }}
                                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-950/80 text-[#0066FF] dark:text-[#60A5FA] hover:bg-[#0066FF] hover:text-white dark:hover:bg-[#0066FF] dark:hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm border border-[#0066FF]/35 hover:scale-105 active:scale-95 z-30"
                                  title="Current task timeblock - Start in Focus Timer"
                                >
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onStartTask) onStartTask(task);
                                  }}
                                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-blue-50/95 dark:bg-slate-800 text-[#0066FF] dark:text-[#60A5FA] hover:bg-[#0066FF] hover:text-white dark:hover:bg-[#0066FF] dark:hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 z-30 border border-[#0066FF]/20 dark:border-[#60A5FA]/30"
                                  title="Start Task in Focus Timer"
                                >
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                </button>
                              )
                            )}

                            {/* Checkbox and Title Row */}
                            <div className="flex items-center gap-1.5 min-w-0 w-full pr-7">
                              <button
                                type="button"
                                onPointerDown={(e) => {
                                  e.stopPropagation(); // Stop dragging on pointer down
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleTaskStatus(task.id);
                                }}
                                className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer select-none"
                                style={{
                                  borderColor: completed ? (isDark ? '#475569' : '#cbd5e1') : sysColor.solid,
                                  backgroundColor: completed ? (isDark ? '#475569' : '#cbd5e1') : (isDark ? '#1e293b' : '#ffffff'),
                                }}
                                title={completed ? "Mark incomplete" : "Mark complete"}
                              >
                                {completed && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                              </button>
                              <div className="min-w-0 flex-1 truncate">
                                <span className={`text-xs md:text-[13px] font-bold block truncate leading-snug pointer-events-none select-none ${completed ? 'line-through text-slate-400 font-medium' : 'text-slate-900 dark:text-slate-100'}`}>
                                  {task.title}
                                </span>
                              </div>
                            </div>

                            {/* Time beneath title as quiet text (NO PILL BADGE) */}
                            {heightPx > 40 && (
                              <div className="mt-0.5 pl-5.5 pointer-events-none select-none text-[10px] md:text-[11px] font-medium font-sans tabular-nums text-slate-500 dark:text-slate-400 leading-tight">
                                {totalLanes > 1 || viewType === 'week' ? (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <Clock className="w-3 h-3 shrink-0 opacity-70" />
                                      <span className="truncate whitespace-nowrap">
                                        {formatTo12Hour(minutesToTimeString(colItem.startMin))} – {formatTo12Hour(minutesToTimeString(colItem.endMin))}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[9.5px] md:text-[10px] pl-4 whitespace-nowrap">
                                      <span className="text-slate-400 dark:text-slate-500 font-normal">
                                        {formatDuration(colItem.startMin, colItem.endMin)}
                                      </span>
                                      {isActivelyRunning && !completed && (
                                        <span className="text-amber-500 dark:text-amber-400 font-bold">
                                          · {Math.max(0, colItem.endMin - currentMin)}m left
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                    <div className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                                      <Clock className="w-3 h-3 shrink-0 opacity-70" />
                                      <span>
                                        {formatTo12Hour(minutesToTimeString(colItem.startMin))} – {formatTo12Hour(minutesToTimeString(colItem.endMin))}
                                      </span>
                                    </div>
                                    <div className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                                      <span className="opacity-50">·</span>
                                      <span className="opacity-80 font-semibold">
                                        {formatDuration(colItem.startMin, colItem.endMin)}
                                      </span>
                                    </div>
                                    {isActivelyRunning && !completed && (
                                      <div className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap text-amber-500 dark:text-amber-400 font-bold">
                                        <span>·</span>
                                        <span>{Math.max(0, colItem.endMin - currentMin)}m left</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {task.description && heightPx > 65 && (
                              <p className="text-[10px] md:text-[11px] text-slate-600 dark:text-slate-400 mt-1 pl-5.5 line-clamp-2 leading-tight pointer-events-none select-none">
                                {task.description}
                              </p>
                            )}

                            {/* TOP RESIZE HANDLE BAR (Visible only on hover) */}
                            <div
                              className={`absolute top-0 left-0 right-0 ${handleHClass} cursor-ns-resize z-30 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors touch-none group/resize-top`}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                handleResizeStart(task.id, 'task', colItem.startMin, colItem.endMin, colItem.date, 'top', e);
                              }}
                            >
                              {heightPx >= 28 && (
                                <div className="w-8 h-1 rounded-full bg-slate-400/80 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xs" />
                              )}
                            </div>

                            {/* BOTTOM RESIZE HANDLE BAR (Visible only on hover) */}
                            <div
                              className={`absolute bottom-0 left-0 right-0 ${handleHClass} cursor-ns-resize z-30 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors touch-none group/resize-bottom`}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                handleResizeStart(task.id, 'task', colItem.startMin, colItem.endMin, colItem.date, 'bottom', e);
                              }}
                            >
                              {heightPx >= 28 && (
                                <div className="w-8 h-1 rounded-full bg-slate-400/80 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xs" />
                              )}
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* Touch Screen Swipe Feedback Indicator Overlay */}
      {swipeHint && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-4 py-2 rounded-full text-xs font-bold tracking-wide shadow-lg backdrop-blur-xs flex items-center gap-2 animate-bounce">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{swipeHint}</span>
        </div>
      )}

      {/* Mobile Touch Screen Quick-Add Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 md:hidden z-40">
        <button
          onClick={() => {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(20);
            }
            const todayStr = formatDateString(selectedDate);
            const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
            const roundedStartMin = Math.ceil(nowMin / 30) * 30;
            const startStr = minutesToTimeString(Math.min(1380, roundedStartMin));
            const endStr = minutesToTimeString(Math.min(1439, roundedStartMin + 60));
            onOpenCreateModal(todayStr, startStr, endStr);
          }}
          className="w-14 h-14 rounded-full bg-[#0066FF] text-white shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center border-2 border-white cursor-pointer"
          title="Quick Add Event/Task"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      </div>

      {/* Recurrence Choice Confirmation Dialog Modal Overlay */}
      {recurrencePrompt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="recurrence-modal-backdrop">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150" id="recurrence-modal-card">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4" id="recurrence-modal-header">Edit Repeating Event</h3>
            
            <div className="flex flex-col gap-2.5">
              <div
                onClick={() => setRecurrenceChoice('one')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition cursor-pointer select-none ${
                  recurrenceChoice === 'one'
                    ? 'border-[#0066FF] bg-[#0066FF]/5 dark:bg-[#0066FF]/15 text-slate-900 dark:text-white font-medium'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  recurrenceChoice === 'one' ? 'border-[#0066FF]' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {recurrenceChoice === 'one' && (
                    <div className="w-2 h-2 rounded-full bg-[#0066FF]" />
                  )}
                </div>
                <span className="text-sm">This event</span>
              </div>

              <div
                onClick={() => setRecurrenceChoice('all')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition cursor-pointer select-none ${
                  recurrenceChoice === 'all'
                    ? 'border-[#0066FF] bg-[#0066FF]/5 dark:bg-[#0066FF]/15 text-slate-900 dark:text-white font-medium'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  recurrenceChoice === 'all' ? 'border-[#0066FF]' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {recurrenceChoice === 'all' && (
                    <div className="w-2 h-2 rounded-full bg-[#0066FF]" />
                  )}
                </div>
                <span className="text-sm">All events</span>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2.5 mt-6" id="recurrence-modal-actions">
              <button
                type="button"
                onClick={() => setRecurrencePrompt(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRecurrenceChoice(recurrenceChoice)}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0066FF] hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
