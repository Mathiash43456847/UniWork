/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  List,
  ListTodo,
  Kanban,
  Plus,
  Calendar,
  Check,
  CheckSquare,
  Trash2,
  ChevronDown,
  ChevronRight,
  Edit3,
  FolderPlus,
  MoreHorizontal,
  Clock,
  Filter,
  ArrowUpDown,
  Sliders,
  Layers,
  ChevronLast,
  Target,
  GripVertical,
  CornerDownLeft
} from 'lucide-react';
import { Task, TaskViewType, TaskStatus, TaskGroup, Goal, getLocalISODate } from '../types';

const formatTimeRange = (start?: string, end?: string): string => {
  if (!start) return 'Unplanned';
  const formatSingle = (t: string) => {
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = String(m).padStart(2, '0');
    return `${displayH}:${displayM} ${ampm}`;
  };
  if (!end) return formatSingle(start);
  return `${formatSingle(start)} – ${formatSingle(end)}`;
};

interface TasksViewProps {
  tasks: Task[];
  groups: TaskGroup[];
  goals?: Goal[];
  onAddTask: (title: string, date: string, startTime?: string, status?: TaskStatus, groupId?: string, endTime?: string, goalId?: string, goalName?: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string, hardDelete?: boolean) => void;
  onOpenEditModal: (type: 'event' | 'task', item: Task) => void;
  onOpenCreateModal: (dateString: string, startTime?: string, endTime?: string) => void;
  onAddGroup: (name: string) => void;
  onDeleteGroup: (id: string) => void;
  onUpdateGroup: (id: string, name: string, color?: string) => void;
  onToggleTaskStatus: (taskId: string) => void;
  sidebarCollapsed?: boolean;
  setSidebarCollapsed?: (collapsed: boolean) => void;
  selectedDate?: Date | string;
}

export default function TasksView({
  tasks,
  groups,
  goals = [],
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onOpenEditModal,
  onOpenCreateModal,
  onAddGroup,
  onDeleteGroup,
  onUpdateGroup,
  onToggleTaskStatus,
  sidebarCollapsed,
  setSidebarCollapsed,
  selectedDate,
}: TasksViewProps) {
  const [viewType, setViewType] = useState<TaskViewType>('list');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  // Date selection state for Daily Tasks view
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(() => {
    if (selectedDate) {
      if (selectedDate instanceof Date) {
        return getLocalISODate(selectedDate);
      }
      return selectedDate;
    }
    return getLocalISODate();
  });

  useEffect(() => {
    if (selectedDate) {
      const dStr = selectedDate instanceof Date ? getLocalISODate(selectedDate) : selectedDate;
      setSelectedDailyDate(dStr);
    }
  }, [selectedDate]);

  // New States for 2 Days View and Drag and Drop
  const [dailyViewType, setDailyViewType] = useState<'day' | '2days'>('day');
  const [hoveredDropDate, setHoveredDropDate] = useState<string | null>(null);
  const [hoveredDailyTaskId, setHoveredDailyTaskId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const draggedTask = draggedTaskId ? tasks.find((t) => t.id === draggedTaskId) || null : null;
  const [colQuickAddTitles, setColQuickAddTitles] = useState<Record<string, string>>({});
  const [colQuickAddGroups, setColQuickAddGroups] = useState<Record<string, string>>({});
  const [colQuickAddGoals, setColQuickAddGoals] = useState<Record<string, string>>({});
  const [activeColQuickAdds, setActiveColQuickAdds] = useState<Record<string, boolean>>({});
  const [activeFlatQuickAdd, setActiveFlatQuickAdd] = useState(false);

  // Kanban Drag-and-Drop High Fidelity State
  const [hoveredDropGroupId, setHoveredDropGroupId] = useState<string | null>(null);
  const [hoveredTaskCardId, setHoveredTaskCardId] = useState<string | null>(null);

  const getActiveUserId = (): string => {
    try {
      const savedUser = localStorage.getItem('uniwork_user_session');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u && u.id) return u.id;
      }
    } catch {}
    return 'usr-mathias-cheow-primary';
  };

  const getSortedDailyTasks = (dateStr: string, dayTasks: Task[]): Task[] => {
    const userId = getActiveUserId();
    const key = `uniwork_daily_task_order_${userId}_${dateStr}`;
    const savedOrder = localStorage.getItem(key);
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder) as string[];
        return [...dayTasks].sort((a, b) => {
          const idxA = orderIds.indexOf(a.id);
          const idxB = orderIds.indexOf(b.id);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
      } catch (e) {
        console.warn('Failed to sort daily tasks:', e);
      }
    }
    return dayTasks;
  };

  const handleDailyTaskDrop = (e: React.DragEvent, targetTask: Task, targetDate: string) => {
    e.preventDefault();
    e.stopPropagation();

    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId || taskId === targetTask.id) {
      setHoveredDailyTaskId(null);
      return;
    }

    const draggedTask = tasks.find(t => t.id === taskId);
    if (!draggedTask) {
      setHoveredDailyTaskId(null);
      return;
    }

    const sourceDate = draggedTask.date;
    if (sourceDate !== targetDate) {
      onUpdateTask(taskId, { date: targetDate, startTime: undefined, endTime: undefined });
    }

    const userId = getActiveUserId();
    const targetKey = `uniwork_daily_task_order_${userId}_${targetDate}`;

    const currentDayTasks = tasks.filter(t => t.date === targetDate && t.id !== taskId);
    const sortedDayTasks = getSortedDailyTasks(targetDate, currentDayTasks);
    const sortedDayIds = sortedDayTasks.map(t => t.id);

    const targetIdx = sortedDayIds.indexOf(targetTask.id);
    if (targetIdx !== -1) {
      sortedDayIds.splice(targetIdx, 0, taskId);
    } else {
      sortedDayIds.push(taskId);
    }

    localStorage.setItem(targetKey, JSON.stringify(sortedDayIds));

    if (sourceDate && sourceDate !== targetDate) {
      const sourceKey = `uniwork_daily_task_order_${userId}_${sourceDate}`;
      let sourceOrder: string[] = [];
      try {
        const saved = localStorage.getItem(sourceKey);
        if (saved) sourceOrder = JSON.parse(saved);
      } catch {}
      sourceOrder = sourceOrder.filter(id => id !== taskId);
      localStorage.setItem(sourceKey, JSON.stringify(sourceOrder));
    }

    setHoveredDailyTaskId(null);
    setHoveredDropDate(null);
    setDraggedTaskId(null);
  };

  const handleDailyContainerDrop = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const draggedTask = tasks.find(t => t.id === taskId);
    if (!draggedTask) return;

    const sourceDate = draggedTask.date;
    if (sourceDate !== targetDate) {
      onUpdateTask(taskId, { date: targetDate, startTime: undefined, endTime: undefined });
    }

    const userId = getActiveUserId();
    const targetKey = `uniwork_daily_task_order_${userId}_${targetDate}`;
    let targetOrder: string[] = [];
    try {
      const saved = localStorage.getItem(targetKey);
      if (saved) targetOrder = JSON.parse(saved);
    } catch {}
    targetOrder = targetOrder.filter(id => id !== taskId && tasks.some(t => t.id === id));
    targetOrder.push(taskId);
    localStorage.setItem(targetKey, JSON.stringify(targetOrder));

    if (sourceDate && sourceDate !== targetDate) {
      const sourceKey = `uniwork_daily_task_order_${userId}_${sourceDate}`;
      let sourceOrder: string[] = [];
      try {
        const saved = localStorage.getItem(sourceKey);
        if (saved) sourceOrder = JSON.parse(saved);
      } catch {}
      sourceOrder = sourceOrder.filter(id => id !== taskId);
      localStorage.setItem(sourceKey, JSON.stringify(sourceOrder));
    }

    setHoveredDailyTaskId(null);
    setHoveredDropDate(null);
    setDraggedTaskId(null);
  };

  const getSortedGroupTasks = (groupId: string, groupTasks: Task[]): Task[] => {
    const userId = getActiveUserId();
    const key = `uniwork_task_order_${userId}_${groupId}`;
    const savedOrder = localStorage.getItem(key);
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder) as string[];
        const sorted = [...groupTasks].sort((a, b) => {
          const idxA = orderIds.indexOf(a.id);
          const idxB = orderIds.indexOf(b.id);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
        return sorted;
      } catch (e) {
        console.warn('Failed to sort group tasks:', e);
      }
    }
    return groupTasks;
  };

  const handleColumnDrop = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) return;

    onUpdateTask(taskId, { groupId: targetGroupId });

    const userId = getActiveUserId();
    const targetKey = `uniwork_task_order_${userId}_${targetGroupId}`;
    let targetOrder: string[] = [];
    try {
      const saved = localStorage.getItem(targetKey);
      if (saved) targetOrder = JSON.parse(saved);
    } catch {}

    targetOrder = targetOrder.filter(id => id !== taskId && tasks.some(t => t.id === id));
    targetOrder.push(taskId);
    localStorage.setItem(targetKey, JSON.stringify(targetOrder));

    const sourceGroupId = taskToMove.groupId;
    if (sourceGroupId && sourceGroupId !== targetGroupId) {
      const sourceKey = `uniwork_task_order_${userId}_${sourceGroupId}`;
      let sourceOrder: string[] = [];
      try {
        const saved = localStorage.getItem(sourceKey);
        if (saved) sourceOrder = JSON.parse(saved);
      } catch {}
      sourceOrder = sourceOrder.filter(id => id !== taskId);
      localStorage.setItem(sourceKey, JSON.stringify(sourceOrder));
    }

    setHoveredDropGroupId(null);
    setHoveredTaskCardId(null);
    setDraggedTaskId(null);
  };

  const handleTaskCardDrop = (e: React.DragEvent, targetTask: Task) => {
    e.preventDefault();
    e.stopPropagation();

    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId || taskId === targetTask.id) {
      setHoveredTaskCardId(null);
      return;
    }

    const draggedTask = tasks.find(t => t.id === taskId);
    if (!draggedTask) {
      setHoveredTaskCardId(null);
      return;
    }

    const sourceGroupId = draggedTask.groupId;
    const targetGroupId = targetTask.groupId;

    if (sourceGroupId !== targetGroupId) {
      onUpdateTask(taskId, { groupId: targetGroupId });
    }

    const userId = getActiveUserId();
    const targetKey = `uniwork_task_order_${userId}_${targetGroupId}`;

    const currentTargetTasks = tasks.filter(t => t.groupId === targetGroupId && t.id !== taskId);
    const sortedTargetTasks = getSortedGroupTasks(targetGroupId, currentTargetTasks);
    const sortedTargetIds = sortedTargetTasks.map(t => t.id);

    const targetIdx = sortedTargetIds.indexOf(targetTask.id);
    if (targetIdx !== -1) {
      sortedTargetIds.splice(targetIdx, 0, taskId);
    } else {
      sortedTargetIds.push(taskId);
    }

    localStorage.setItem(targetKey, JSON.stringify(sortedTargetIds));

    if (sourceGroupId !== targetGroupId) {
      const sourceKey = `uniwork_task_order_${userId}_${sourceGroupId}`;
      let sourceOrder: string[] = [];
      try {
        const saved = localStorage.getItem(sourceKey);
        if (saved) sourceOrder = JSON.parse(saved);
      } catch {}
      sourceOrder = sourceOrder.filter(id => id !== taskId);
      localStorage.setItem(sourceKey, JSON.stringify(sourceOrder));
    }

    setHoveredTaskCardId(null);
    setHoveredDropGroupId(null);
    setDraggedTaskId(null);
  };

  // Auto collapse sidebar when entering 2 Days mode to maximize space
  useEffect(() => {
    if (dailyViewType === '2days' && setSidebarCollapsed) {
      setSidebarCollapsed(true);
    } else if (dailyViewType === 'day' && setSidebarCollapsed) {
      setSidebarCollapsed(false);
    }
  }, [dailyViewType, setSidebarCollapsed]);

  const shiftDailyDate = (days: number) => {
    const parts = selectedDailyDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDailyDate(`${y}-${m}-${day}`);
  };

  const getNextDateStr = (dateStr: string): string => {
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const renderDailyTableForDate = (targetDate: string) => {
    const colKey = targetDate;
    const isDragOver = hoveredDropDate === targetDate;
    const rawDailyTasks = tasks.filter((t) => t.date === targetDate);
    const filteredTasks = getSortedDailyTasks(targetDate, rawDailyTasks);

    // Format header date nicely
    const parts = targetDate.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const headerTitle = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

    return (
      <div 
        className={`flex-1 flex flex-col min-w-[340px] h-full overflow-hidden bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors ${
          isDragOver ? 'bg-blue-50/20 dark:bg-blue-950/20 ring-2 ring-[#0066FF]/30' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          if (hoveredDropDate !== targetDate) setHoveredDropDate(targetDate);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setHoveredDropDate(null);
          }
        }}
        onDrop={(e) => {
          handleDailyContainerDrop(e, targetDate);
        }}
      >
        {/* Connected Column Header - Smooth Rounded Top */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#131B2E]/80 shrink-0 select-none rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4.5 h-4.5 text-[#0066FF] dark:text-[#60A5FA] shrink-0" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>{headerTitle}</span>
              {targetDate === getLocalISODate() && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#0066FF] text-white">
                  Today
                </span>
              )}
            </h4>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold tabular-nums">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {/* Column Header Titles */}
        <div className="flex items-stretch bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 h-9 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider select-none shrink-0">
          <div className="w-12 flex items-center justify-center border-r border-slate-200 dark:border-slate-800 shrink-0">
            <span className="sr-only">Move & Status</span>
          </div>
          <div className="flex-1 min-w-[100px] px-3 flex items-center border-r border-slate-200 dark:border-slate-800 text-left">
            Task Title
          </div>
          <div className="w-28 flex items-center justify-center border-r border-slate-200 dark:border-slate-800 shrink-0">
            Group
          </div>
          <div className="w-28 flex items-center justify-center border-r border-slate-200 dark:border-slate-800 shrink-0">
            Timeblock
          </div>
          <div className="w-8 flex items-center justify-center shrink-0">
            <span className="sr-only">Delete</span>
          </div>
        </div>

        {/* Scrollable Tasks Body */}
        <div
          className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDragLeave={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < rect.left ||
              e.clientX >= rect.right ||
              e.clientY < rect.top ||
              e.clientY >= rect.bottom
            ) {
              if (hoveredDropDate === targetDate) {
                setHoveredDailyTaskId(null);
                setHoveredDropDate(null);
              }
            }
          }}
        >
          {filteredTasks.length === 0 && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (hoveredDailyTaskId !== `__bottom__${targetDate}` || hoveredDropDate !== targetDate) {
                  setHoveredDailyTaskId(`__bottom__${targetDate}`);
                  setHoveredDropDate(targetDate);
                }
              }}
              onDrop={(e) => handleDailyContainerDrop(e, targetDate)}
              className="p-8 text-center text-slate-400 text-xs"
            >
              {hoveredDailyTaskId === `__bottom__${targetDate}` ? null : `No tasks planned for ${headerTitle}.`}
            </div>
          )}

          {filteredTasks.length > 0 &&
            filteredTasks.map((task) => {
              const isDone = task.status === 'done';
              const activeGroup = groups.find((g) => g.id === task.groupId) || groups[0];
              const isBeingDragged = draggedTaskId === task.id;
              const isDailyRowHovered = hoveredDailyTaskId === task.id && hoveredDropDate === targetDate && draggedTaskId && draggedTaskId !== task.id;

              return (
                <div
                  key={task.id}
                  className="relative transition-all duration-150"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    if (draggedTaskId && draggedTaskId !== task.id) {
                      if (hoveredDailyTaskId !== task.id || hoveredDropDate !== targetDate) {
                        setHoveredDailyTaskId(task.id);
                        setHoveredDropDate(targetDate);
                      }
                    }
                  }}
                >
                  {/* Space shift with dedicated drop preview block */}
                  {isDailyRowHovered && draggedTask && (
                    <div 
                      className="p-1 transition-all duration-150 ease-out"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        handleDailyTaskDrop(e, task, targetDate);
                      }}
                    >
                      <div className="h-10 flex items-stretch bg-blue-50/90 dark:bg-blue-950/45 border-2 border-dashed border-[#0066FF] dark:border-[#38BDF8] rounded-xl text-xs text-slate-700 dark:text-slate-200 select-none shadow-3xs transition-all">
                        <div className="w-12 flex items-center justify-between px-1.5 border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 shrink-0 h-full">
                          <GripVertical className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#38BDF8]" />
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-[#0066FF] dark:border-[#38BDF8]" />
                        </div>
                        <div className="flex-1 min-w-[100px] px-3 flex items-center border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 h-full truncate font-semibold text-slate-800 dark:text-slate-100">
                          <span className="truncate">{draggedTask.title}</span>
                        </div>
                        <div className="w-28 px-2 flex items-center justify-center border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 shrink-0 h-full">
                          {(() => {
                            const g = groups.find(grp => grp.id === draggedTask.groupId) || groups[0];
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-3xs">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g?.color || '#3b82f6' }} />
                                <span className="truncate max-w-[70px]">{g?.name}</span>
                              </span>
                            );
                          })()}
                        </div>
                        <div className="w-28 flex items-center justify-center border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 shrink-0 h-full text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          {draggedTask.startTime ? formatTimeRange(draggedTask.startTime, draggedTask.endTime) : 'Unscheduled'}
                        </div>
                        <div className="w-8 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#0066FF] dark:text-[#38BDF8]">
                          Drop
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    draggable
                    onDragStart={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('input, button, select, textarea, [data-no-drag]')) {
                        e.preventDefault();
                        return;
                      }
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData('text/plain', task.id);
                      setTimeout(() => {
                        setDraggedTaskId(task.id);
                      }, 0);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'move';
                      if (draggedTaskId && draggedTaskId !== task.id) {
                        if (hoveredDailyTaskId !== task.id || hoveredDropDate !== targetDate) {
                          setHoveredDailyTaskId(task.id);
                          setHoveredDropDate(targetDate);
                        }
                      }
                    }}
                    onDrop={(e) => {
                      handleDailyTaskDrop(e, task, targetDate);
                    }}
                    onDragEnd={() => {
                      setDraggedTaskId(null);
                      setHoveredDailyTaskId(null);
                      setHoveredDropDate(null);
                    }}
                    className={`relative flex items-stretch h-12 transition-colors text-sm text-slate-700 dark:text-slate-300 select-none group ${
                      isBeingDragged
                        ? 'opacity-35 bg-slate-100/70 dark:bg-slate-800/40 border-dashed border-[#0066FF]/30'
                        : 'bg-white dark:bg-[#0F172A] hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                    }`}
                  >
                      {/* Move Grip & Status Checkbox Container */}
                      <div className="w-12 flex items-center justify-between px-1.5 border-r border-slate-100 dark:border-slate-800 shrink-0 h-full">
                        <div className="w-4 flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0" title="Drag to reorder">
                          <GripVertical className="w-3.5 h-3.5 stroke-[2]" />
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggleTaskStatus(task.id)}
                          className="w-5.5 h-5.5 flex items-center justify-center shrink-0 cursor-pointer select-none"
                        >
                          <span className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${
                            isDone
                              ? 'bg-emerald-500 border-transparent text-white shadow-3xs'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-indigo-500'
                          }`}>
                            {isDone && <Check className="w-3 h-3 stroke-[3px]" />}
                          </span>
                        </button>
                      </div>

                      {/* Task Title */}
                      <div className="flex-1 min-w-[100px] px-3 flex items-center border-r border-slate-100 dark:border-slate-800 h-full truncate">
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => onUpdateTask(task.id, { title: e.target.value })}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`bg-transparent border-0 focus:border-0 focus:ring-0 focus:outline-none p-0 w-full font-semibold text-sm text-slate-800 dark:text-slate-100 ${
                            isDone ? 'line-through text-slate-400 font-normal' : ''
                          }`}
                          placeholder="Task name"
                        />
                      </div>

                      {/* Task Group: Solid Rectangular Badge */}
                      <div className="w-28 px-2 flex items-center justify-center border-r border-slate-100 dark:border-slate-800 shrink-0 h-full relative">
                        <div className="relative group/grp w-full max-w-full">
                          <div 
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white text-center transition truncate cursor-pointer shadow-3xs w-full block hover:brightness-95"
                            style={{
                              backgroundColor: activeGroup?.color || '#3b82f6',
                            }}
                          >
                            <span className="truncate block w-full">{activeGroup?.name || 'General'}</span>
                          </div>
                          <select
                            value={task.groupId || (groups[0]?.id || '')}
                            onChange={(e) => {
                              const newGId = e.target.value;
                              const autoGoal = goals.find((g) => !g.completed && g.groupIds && g.groupIds.includes(newGId));
                              onUpdateTask(task.id, {
                                groupId: newGId,
                                goalId: autoGoal ? autoGoal.id : task.goalId,
                                goalName: autoGoal ? autoGoal.title : task.goalName,
                              });
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          >
                            {groups.map((g) => (
                              <option key={g.id} value={g.id} className="bg-white dark:bg-[#0F172A] text-slate-800 dark:text-slate-100 font-medium">
                                {g.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Timeblock: Calm status */}
                      <div className="w-28 px-2 flex items-center justify-center border-r border-slate-100 dark:border-slate-800 shrink-0 h-full">
                        {task.startTime ? (
                          <button
                            type="button"
                            onClick={() => onOpenEditModal('task', task)}
                            className="px-2.5 py-1 rounded-md flex items-center justify-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer max-w-full truncate shadow-3xs"
                          >
                            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate tabular-nums">{formatTimeRange(task.startTime, task.endTime)}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenEditModal('task', task)}
                            className="px-2.5 py-1 rounded-md flex items-center justify-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition cursor-pointer border border-slate-200/60 dark:border-slate-700/50"
                            title="Schedule on calendar"
                          >
                            <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                            <span>Unscheduled</span>
                          </button>
                        )}
                      </div>

                      {/* Trash Action */}
                      <div className="w-8 flex items-center justify-center shrink-0 h-full">
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id, true)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer shrink-0"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

          {/* End-of-table drop target slot with smooth space preview */}
          {draggedTaskId && draggedTask && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                if (hoveredDailyTaskId !== `__bottom__${targetDate}` || hoveredDropDate !== targetDate) {
                  setHoveredDailyTaskId(`__bottom__${targetDate}`);
                  setHoveredDropDate(targetDate);
                }
              }}
              onDrop={(e) => {
                handleDailyContainerDrop(e, targetDate);
              }}
              className="relative min-h-[38px] p-1 flex flex-col justify-center cursor-pointer"
            >
              {hoveredDailyTaskId === `__bottom__${targetDate}` && hoveredDropDate === targetDate ? (
                <div className="h-10 flex items-stretch bg-blue-50/90 dark:bg-blue-950/45 border-2 border-dashed border-[#0066FF] dark:border-[#38BDF8] rounded-xl text-xs text-slate-700 dark:text-slate-200 select-none shadow-3xs transition-all animate-in fade-in duration-100">
                  <div className="w-12 flex items-center justify-between px-1.5 border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 shrink-0 h-full">
                    <GripVertical className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#38BDF8]" />
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-[#0066FF] dark:border-[#38BDF8]" />
                  </div>
                  <div className="flex-1 min-w-[100px] px-3 flex items-center border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 h-full truncate font-semibold text-slate-800 dark:text-slate-100">
                    <span className="truncate">{draggedTask.title}</span>
                  </div>
                  <div className="w-28 px-2 flex items-center justify-center border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 shrink-0 h-full">
                    {(() => {
                      const g = groups.find(grp => grp.id === draggedTask.groupId) || groups[0];
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-3xs">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g?.color || '#3b82f6' }} />
                          <span className="truncate max-w-[70px]">{g?.name}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <div className="w-28 flex items-center justify-center border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 shrink-0 h-full text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {draggedTask.startTime ? formatTimeRange(draggedTask.startTime, draggedTask.endTime) : 'Unscheduled'}
                  </div>
                  <div className="w-8 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#0066FF] dark:text-[#38BDF8]">
                    Drop
                  </div>
                </div>
              ) : (
                <div className="h-4" />
              )}
            </div>
          )}

          {/* Premium Inline Spreadsheet-style Quick Add Row */}
          <div className="relative flex items-stretch h-10 bg-white dark:bg-[#0F172A] hover:bg-slate-50/30 dark:hover:bg-slate-800/20 text-xs select-none">
            {(() => {
              const currentTitle = colQuickAddTitles[colKey] || '';
              const currentGroupId = colQuickAddGroups[colKey] || groups[0]?.id || '';
              const currentGoalId = colQuickAddGoals[colKey] || '';
              const activeGroup = groups.find((gr) => gr.id === currentGroupId) || groups[0];

              const isActive = activeColQuickAdds[colKey] || !!currentTitle;

              if (!isActive) {
                return (
                  <div
                    onClick={() => setActiveColQuickAdds(prev => ({ ...prev, [colKey]: true }))}
                    className="w-full h-10 flex items-center gap-3 px-5 text-slate-400 dark:text-slate-500 hover:text-[#0066FF] dark:hover:text-[#60A5FA] hover:bg-slate-50/50 dark:hover:bg-[#131B2E]/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                    <span className="font-semibold text-xs tracking-tight">Add task</span>
                  </div>
                );
              }

              return (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!currentTitle.trim()) return;

                    const chosenGoal = goals.find((g) => g.id === currentGoalId);

                    onAddTask(
                      currentTitle.trim(),
                      targetDate,
                      undefined,
                      'todo',
                      currentGroupId,
                      undefined,
                      chosenGoal ? chosenGoal.id : undefined,
                      chosenGoal ? chosenGoal.title : undefined
                    );

                    setColQuickAddTitles(prev => ({ ...prev, [colKey]: '' }));
                    setActiveColQuickAdds(prev => ({ ...prev, [colKey]: false }));
                  }}
                  className="w-full flex items-stretch"
                >
                  {/* Plus Icon cell instead of checkbox */}
                  <div className="w-12 flex items-center justify-center border-r border-slate-100 dark:border-slate-800 shrink-0 h-full text-slate-400 dark:text-slate-600">
                    <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                  </div>

                  {/* Title input field */}
                  <div className="flex-1 min-w-[100px] px-3 flex items-center border-r border-slate-100 dark:border-slate-800 h-full">
                    <input
                      type="text"
                      placeholder="Task name"
                      value={currentTitle}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setColQuickAddTitles(prev => ({ ...prev, [colKey]: '' }));
                          setActiveColQuickAdds(prev => ({ ...prev, [colKey]: false }));
                        }
                      }}
                      onChange={(e) => setColQuickAddTitles(prev => ({ ...prev, [colKey]: e.target.value }))}
                      className="bg-transparent border-0 focus:border-0 focus:ring-0 focus:outline-none p-0 w-full font-medium text-slate-800 dark:text-slate-100 text-xs placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>

                  {/* Group Dropdown select */}
                  <div className="w-28 px-2 flex items-center justify-center border-r border-slate-100 dark:border-slate-800 shrink-0 h-full relative">
                    <div className="relative w-full max-w-full">
                      <div 
                        className="px-2.5 py-1 rounded-md text-[10px] font-bold text-white text-center transition truncate cursor-pointer shadow-sm w-full block hover:brightness-95"
                        style={{
                          backgroundColor: activeGroup?.color || '#3b82f6',
                        }}
                      >
                        <span className="truncate block w-full">{activeGroup?.name || 'General'}</span>
                      </div>
                      <select
                        value={currentGroupId}
                        onChange={(e) => {
                          const newGId = e.target.value;
                          setColQuickAddGroups(prev => ({ ...prev, [colKey]: newGId }));
                          const activeGoals = goals.filter((g) => !g.completed);
                          const recommendedGoals = activeGoals.filter((g) => g.groupIds && g.groupIds.includes(newGId));
                          if (recommendedGoals.length > 0) {
                            setColQuickAddGoals(prev => ({ ...prev, [colKey]: recommendedGoals[0].id }));
                          } else {
                            setColQuickAddGoals(prev => ({ ...prev, [colKey]: '' }));
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id} className="bg-white dark:bg-[#0F172A] text-slate-800 dark:text-slate-100">
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Target Selector */}
                  <div className="w-44 px-2 flex items-center justify-center border-r border-slate-100 dark:border-slate-800 shrink-0 h-full relative">
                    <div className="relative w-full">
                      <div 
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center justify-between gap-1.5 transition truncate cursor-pointer shadow-3xs bg-slate-100/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 w-full"
                      >
                        <span className="flex items-center gap-1 min-w-0 truncate">
                          <Target className="w-2.5 h-2.5 text-indigo-500 shrink-0 opacity-70" />
                          <span className="truncate">
                            {currentGoalId ? (goals.find(g => g.id === currentGoalId)?.title || 'Target') : 'No target'}
                          </span>
                        </span>
                        <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />
                      </div>
                      <select
                        value={currentGoalId}
                        onChange={(e) => setColQuickAddGoals(prev => ({ ...prev, [colKey]: e.target.value }))}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      >
                        <option value="">No Target</option>
                        {goals.filter(g => !g.completed).map((g) => (
                          <option key={g.id} value={g.id} className="bg-white dark:bg-[#0F172A] text-slate-800 dark:text-slate-100 font-semibold">
                            {g.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Save/Add or Cancel Button cell */}
                  <div className="w-8 flex items-center justify-center shrink-0 h-full">
                    {currentTitle.trim() ? (
                      <button
                        type="submit"
                        className="p-1 text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/45 transition cursor-pointer"
                        title="Save Task"
                      >
                        <CornerDownLeft className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setColQuickAddTitles(prev => ({ ...prev, [colKey]: '' }));
                          setActiveColQuickAdds(prev => ({ ...prev, [colKey]: false }));
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/45 transition cursor-pointer"
                        title="Cancel"
                      >
                        <Plus className="w-3.5 h-3.5 rotate-45 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      </div>
    );
  };
  
  // Quick-Add state for lists & boards
  const [addingTaskToGroupId, setAddingTaskToGroupId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(getLocalISODate());
  const [newTaskStartTime, setNewTaskStartTime] = useState('');
  const [newTaskEndTime, setNewTaskEndTime] = useState('');
  const [newTaskGoalId, setNewTaskGoalId] = useState('');

  // Flat layout quick add states
  const [flatTaskTitle, setFlatTaskTitle] = useState('');
  const [flatGroupId, setFlatGroupId] = useState('');
  const [flatGoalId, setFlatGoalId] = useState('');
  const [isFlatTargetDropdownOpen, setIsFlatTargetDropdownOpen] = useState(false);
  const [showFlatOtherTargets, setShowFlatOtherTargets] = useState(false);
  const [flatTargetMenuCoords, setFlatTargetMenuCoords] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

  const flatTargetDropdownRef = useRef<HTMLDivElement>(null);
  const flatTargetTriggerBtnRef = useRef<HTMLButtonElement>(null);
  const flatTargetMenuRef = useRef<HTMLDivElement>(null);

  // 2 Days column layout target dropdown states
  const [activeColDropdownKey, setActiveColDropdownKey] = useState<string | null>(null);
  const [showColOtherTargets, setShowColOtherTargets] = useState<Record<string, boolean>>({});
  const [colTargetMenuCoords, setColTargetMenuCoords] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const activeColTriggerBtnRef = useRef<HTMLButtonElement | null>(null);
  const colTargetMenuRef = useRef<HTMLDivElement>(null);

  const updateColTargetDropdownCoords = () => {
    if (activeColTriggerBtnRef.current) {
      const rect = activeColTriggerBtnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const renderAbove = spaceBelow < 250 && spaceAbove > spaceBelow;

      if (renderAbove) {
        setColTargetMenuCoords({
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          width: Math.max(240, rect.width),
        });
      } else {
        setColTargetMenuCoords({
          top: rect.bottom + 4,
          left: rect.left,
          width: Math.max(240, rect.width),
        });
      }
    }
  };

  useEffect(() => {
    if (activeColDropdownKey) {
      updateColTargetDropdownCoords();
    }
  }, [activeColDropdownKey, showColOtherTargets]);

  useEffect(() => {
    if (!activeColDropdownKey) return;
    const handleScrollOrResize = () => {
      updateColTargetDropdownCoords();
    };
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [activeColDropdownKey]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeColDropdownKey) {
        const clickedInsideMenu = colTargetMenuRef.current?.contains(event.target as Node);
        const clickedInsideTrigger = activeColTriggerBtnRef.current?.contains(event.target as Node);
        if (!clickedInsideMenu && !clickedInsideTrigger) {
          setActiveColDropdownKey(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeColDropdownKey]);

  // Auto-initialize recommended targets for the displayed 2 Days columns
  useEffect(() => {
    if (!goals || !groups || groups.length === 0) return;
    const dates = [selectedDailyDate, getNextDateStr(selectedDailyDate)];
    
    setColQuickAddGoals((prevGoals) => {
      let changed = false;
      const updated = { ...prevGoals };

      for (const d of dates) {
        if (updated[d] !== undefined) continue;

        const currentGId = colQuickAddGroups[d] || groups[0]?.id || '';
        const activeGoals = goals.filter((g) => !g.completed);
        const recommendedGoals = activeGoals.filter((g) => g.groupIds && g.groupIds.includes(currentGId));
        
        updated[d] = recommendedGoals.length > 0 ? recommendedGoals[0].id : '';
        changed = true;
      }

      return changed ? updated : prevGoals;
    });
  }, [selectedDailyDate, groups, goals, colQuickAddGroups]);

  // Floating coordinates math
  const updateFlatTargetDropdownCoords = () => {
    if (flatTargetTriggerBtnRef.current) {
      const rect = flatTargetTriggerBtnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Prefer upward if there is not enough room below (e.g. 250px)
      const renderAbove = spaceBelow < 250 && spaceAbove > spaceBelow;

      if (renderAbove) {
        setFlatTargetMenuCoords({
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          width: Math.max(240, rect.width),
        });
      } else {
        setFlatTargetMenuCoords({
          top: rect.bottom + 4,
          left: rect.left,
          width: Math.max(240, rect.width),
        });
      }
    }
  };

  // Sync coordinate updates on open or when section expands
  useEffect(() => {
    if (isFlatTargetDropdownOpen) {
      updateFlatTargetDropdownCoords();
    }
  }, [isFlatTargetDropdownOpen, showFlatOtherTargets]);

  // Handle scroll or resize to keep floating menu aligned
  useEffect(() => {
    if (!isFlatTargetDropdownOpen) return;
    const handleScrollOrResize = () => {
      updateFlatTargetDropdownCoords();
    };
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isFlatTargetDropdownOpen]);

  // Click outside listener for flat layout target selector
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        flatTargetDropdownRef.current && !flatTargetDropdownRef.current.contains(event.target as Node) &&
        (!flatTargetMenuRef.current || !flatTargetMenuRef.current.contains(event.target as Node))
      ) {
        setIsFlatTargetDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-update flatGoalId with top recommended choice when Task Group changes
  useEffect(() => {
    const activeGId = flatGroupId || (groups && groups[0]?.id) || '';
    if (activeGId && goals) {
      const activeGoals = goals.filter((g) => !g.completed);
      const recommendedGoals = activeGoals.filter((g) => g.groupIds && g.groupIds.includes(activeGId));
      if (recommendedGoals.length > 0) {
        setFlatGoalId(recommendedGoals[0].id);
      } else {
        setFlatGoalId('');
      }
    } else {
      setFlatGoalId('');
    }
  }, [flatGroupId, groups, goals]);

  // Group creation state
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Group edit state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupNameValue, setEditGroupNameValue] = useState('');

  // Toggle group collapse
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    onAddGroup(newGroupName.trim());
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  const handleSaveGroupName = (id: string) => {
    if (!editGroupNameValue.trim()) return;
    onUpdateGroup(id, editGroupNameValue.trim());
    setEditingGroupId(null);
  };

  const handleInlineTaskSubmit = (e: React.FormEvent, groupId: string) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const resolvedGoalTitle = newTaskGoalId ? goals.find(g => g.id === newTaskGoalId)?.title : undefined;
    onAddTask(
      newTaskTitle.trim(),
      newTaskDate,
      newTaskStartTime || undefined,
      'todo',
      groupId,
      newTaskEndTime || undefined,
      newTaskGoalId || undefined,
      resolvedGoalTitle
    );
    setNewTaskTitle('');
    setNewTaskStartTime('');
    setNewTaskEndTime('');
    setNewTaskGoalId('');
    setAddingTaskToGroupId(null);
  };

  const openGlobalCreateTaskModal = () => {
    onOpenCreateModal(getLocalISODate(), '09:00', '10:00');
  };

  // Helper to render inline quick-add form
  const renderInlineTaskForm = (groupId: string) => {
    return (
      <form onSubmit={(e) => handleInlineTaskSubmit(e, groupId)} className="bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-3 mt-2 shadow-2xs space-y-3 animate-fade-in" id={`inline-task-form-${groupId}`}>
        <input
          type="text"
          placeholder="What needs to be done?"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          className="w-full text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
          required
          autoFocus
        />
        
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Picker */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300">
              <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              <input
                type="date"
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
                className="text-[10px] bg-transparent outline-none cursor-pointer focus:ring-0 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Start Time */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300" title="Start Time">
              <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              <input
                type="time"
                value={newTaskStartTime}
                onChange={(e) => setNewTaskStartTime(e.target.value)}
                className="text-[10px] bg-transparent outline-none cursor-pointer focus:ring-0 w-16 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* End Time */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300" title="End Time">
              <Clock className="w-3 h-3 text-emerald-500" />
              <input
                type="time"
                value={newTaskEndTime}
                onChange={(e) => setNewTaskEndTime(e.target.value)}
                className="text-[10px] bg-transparent outline-none cursor-pointer focus:ring-0 w-16 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Target Selector (Optional) - takes up available space */}
            {goals && goals.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 flex-1 min-w-[160px]" title="Connect to Target">
                <Target className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <select
                  value={newTaskGoalId}
                  onChange={(e) => setNewTaskGoalId(e.target.value)}
                  className="text-xs bg-transparent outline-none cursor-pointer focus:ring-0 text-slate-700 dark:text-slate-200 w-full truncate font-medium"
                >
                  <option value="" className="bg-white dark:bg-[#0F172A] text-slate-800 dark:text-slate-200">No Target</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id} className="bg-white dark:bg-[#0F172A] text-slate-800 dark:text-slate-200">
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setAddingTaskToGroupId(null);
                setNewTaskGoalId('');
              }}
              className="px-2.5 py-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] px-3 py-1 rounded shadow-2xs transition cursor-pointer"
            >
              Create
            </button>
          </div>
        </div>
      </form>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#070A11] text-slate-800 dark:text-[#F4F4F5] overflow-hidden font-sans transition-colors duration-200" id="larkcal-tasks-view">
      {/* Task Header Bar */}
      <div className="h-16 px-6 flex items-center justify-between flex-shrink-0 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-[#0066FF] dark:text-[#60A5FA]" />
            <span>Tasks</span>
          </h1>
        </div>

        {/* View Switchers (Daily Tasks / All Tasks) */}
        <div className="flex items-center gap-6 h-full relative" style={{ top: '1px' }}>
          <button
            onClick={() => {
              setViewType('list');
              setAddingTaskToGroupId(null);
            }}
            className={`flex items-center gap-1.5 h-full px-1 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
              viewType === 'list'
                ? 'border-indigo-600 dark:border-[#60A5FA] text-indigo-600 dark:text-[#60A5FA] font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title="Daily Tasks Planner"
            id="task-list-view-btn"
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Daily Tasks</span>
          </button>
          <button
            onClick={() => {
              setViewType('kanban');
              setAddingTaskToGroupId(null);
            }}
            className={`flex items-center gap-1.5 h-full px-1 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
              viewType === 'kanban'
                ? 'border-indigo-600 dark:border-[#60A5FA] text-indigo-600 dark:text-[#60A5FA] font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title="All Tasks Overview"
            id="task-kanban-view-btn"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Tasks</span>
          </button>
        </div>
      </div>

      {/* Connected Sub-Toolbar when in Daily Tasks */}
      {viewType === 'list' && (
        <div className="h-14 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shrink-0 select-none">
          {/* Left: Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftDailyDate(-1)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Previous Day"
            >
              <ChevronDown className="w-4 h-4 rotate-90" />
            </button>
            
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg">
              <Calendar className="w-4 h-4 text-[#0066FF] dark:text-[#60A5FA] shrink-0" />
              <input
                type="date"
                value={selectedDailyDate}
                onChange={(e) => setSelectedDailyDate(e.target.value)}
                className="text-sm font-semibold text-slate-800 dark:text-slate-100 bg-transparent outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => shiftDailyDate(1)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Next Day"
            >
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </button>

            <button
              type="button"
              onClick={() => setSelectedDailyDate(getLocalISODate())}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200/80 dark:border-slate-700 transition cursor-pointer ml-1"
            >
              Today
            </button>
          </div>

          {/* Right: Day / 2 Days View Switcher & Date Range */}
          <div className="flex items-center gap-3.5">
            <span className="text-sm text-slate-600 dark:text-slate-300 font-semibold hidden sm:inline-block">
              {(() => {
                const parts = selectedDailyDate.split('-').map(Number);
                const d = new Date(parts[0], parts[1] - 1, parts[2]);
                if (dailyViewType === 'day') {
                  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
                } else {
                  const nextD = new Date(d);
                  nextD.setDate(d.getDate() + 1);
                  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${nextD.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
                }
              })()}
            </span>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 select-none shrink-0">
              <button
                type="button"
                onClick={() => setDailyViewType('day')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  dailyViewType === 'day'
                    ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setDailyViewType('2days')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  dailyViewType === '2days'
                    ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                2 Days
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col" id="lark-tasks-canvas">
        {viewType === 'list' ? (
          dailyViewType === 'day' ? (
            /* Single Day Connected Table View */
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#070A11]">
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  if (hoveredDropDate !== selectedDailyDate) setHoveredDropDate(selectedDailyDate);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setHoveredDropDate(null);
                  }
                }}
                onDrop={(e) => {
                  handleDailyContainerDrop(e, selectedDailyDate);
                }}
                className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] rounded-2xl overflow-hidden shadow-2xs min-w-[760px] flex flex-col"
              >
                {/* Column Header Titles */}
                <div className="flex items-stretch bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 h-9 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider select-none shrink-0">
                  <div className="w-14 flex items-center justify-center border-r border-slate-200 dark:border-slate-800 shrink-0">
                    <span className="sr-only">Move & Status</span>
                  </div>
                  <div className="flex-1 min-w-[200px] px-3.5 flex items-center border-r border-slate-200 dark:border-slate-800 text-left">
                    Task Title
                  </div>
                  <div className="w-44 flex items-center justify-center border-r border-slate-200 dark:border-slate-800 shrink-0">
                    Task Group
                  </div>
                  <div className="w-44 px-3.5 flex items-center border-r border-slate-200 dark:border-slate-800 shrink-0 text-left">
                    Target Group
                  </div>
                  <div className="w-44 flex items-center justify-center border-r border-slate-200 dark:border-slate-800 shrink-0 font-bold">
                    Timeblock
                  </div>
                  <div className="w-12 flex items-center justify-center shrink-0 flex-shrink-0">
                    <span className="sr-only">Delete</span>
                  </div>
                </div>

                {/* Flat List Rows with smooth space preview */}
                <div
                  className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-[#0F172A] max-h-[460px] overflow-y-auto"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDragLeave={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (
                      e.clientX < rect.left ||
                      e.clientX >= rect.right ||
                      e.clientY < rect.top ||
                      e.clientY >= rect.bottom
                    ) {
                      if (hoveredDropDate === selectedDailyDate) {
                        setHoveredDailyTaskId(null);
                        setHoveredDropDate(null);
                      }
                    }
                  }}
                >
                  {(() => {
                    const rawDailyTasks = tasks.filter((t) => t.date === selectedDailyDate);
                    const dailyTasks = getSortedDailyTasks(selectedDailyDate, rawDailyTasks);
                    
                    if (dailyTasks.length === 0 && !draggedTaskId) {
                      return (
                        <div className="p-10 text-center bg-white dark:bg-[#0F172A] text-slate-400 dark:text-slate-500 text-sm font-medium">
                          No tasks planned for this day. Use the quick add form below to start planning!
                        </div>
                      );
                    }

                    return dailyTasks.map((task) => {
                      const isDone = task.status === 'done';
                      const activeGroup = groups.find((g) => g.id === task.groupId) || groups[0];
                      const matchedGoal = goals.find((g) => g.id === task.goalId || (!g.completed && g.groupIds && activeGroup && g.groupIds.includes(activeGroup.id)));
                      const isBeingDragged = draggedTaskId === task.id;
                      const isDailyRowHovered = hoveredDailyTaskId === task.id && hoveredDropDate === selectedDailyDate && draggedTaskId && draggedTaskId !== task.id;

                      return (
                        <div
                          key={task.id}
                          className="relative transition-all duration-150"
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = 'move';
                            if (draggedTaskId && draggedTaskId !== task.id) {
                              if (hoveredDailyTaskId !== task.id || hoveredDropDate !== selectedDailyDate) {
                                setHoveredDailyTaskId(task.id);
                                setHoveredDropDate(selectedDailyDate);
                              }
                            }
                          }}
                        >
                          {/* Space shift with dedicated drop preview block */}
                          {isDailyRowHovered && draggedTask && (
                            <div 
                              className="p-1 transition-all duration-150 ease-out"
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                              }}
                              onDrop={(e) => {
                                handleDailyTaskDrop(e, task, selectedDailyDate);
                              }}
                            >
                              <div className="h-10 flex items-stretch bg-blue-50/90 dark:bg-blue-950/45 border-2 border-dashed border-[#0066FF] dark:border-[#38BDF8] rounded-xl text-xs text-slate-700 dark:text-slate-200 select-none shadow-3xs transition-all">
                                <div className="w-14 flex items-center justify-between px-2 border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 shrink-0 h-full">
                                  <GripVertical className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#38BDF8]" />
                                  <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-[#0066FF] dark:border-[#38BDF8]" />
                                </div>
                                <div className="flex-1 min-w-[200px] px-3.5 flex items-center border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 h-full truncate font-semibold text-slate-800 dark:text-slate-100">
                                  <span className="truncate">{draggedTask.title}</span>
                                </div>
                                <div className="w-44 px-3 flex items-center justify-center border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 shrink-0 h-full">
                                  {(() => {
                                    const g = groups.find(grp => grp.id === draggedTask.groupId) || groups[0];
                                    return (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-3xs">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g?.color || '#3b82f6' }} />
                                        <span className="truncate max-w-[120px]">{g?.name}</span>
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div className="w-44 px-3.5 flex items-center border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 shrink-0 h-full text-slate-500 dark:text-slate-400 text-xs">
                                  <span className="truncate">
                                    {draggedTask.goalName || (draggedTask.goalId && goals ? goals.find(g => g.id === draggedTask.goalId)?.title : 'No Target')}
                                  </span>
                                </div>
                                <div className="w-44 flex items-center justify-center border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 shrink-0 h-full text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                  {draggedTask.startTime ? formatTimeRange(draggedTask.startTime, draggedTask.endTime) : 'Unscheduled'}
                                </div>
                                <div className="w-12 flex items-center justify-center shrink-0 text-xs font-bold text-[#0066FF] dark:text-[#38BDF8]">
                                  Drop
                                </div>
                              </div>
                            </div>
                          )}

                          <div
                            draggable
                            onDragStart={(e) => {
                              const target = e.target as HTMLElement;
                              if (target.closest('input, button, select, textarea, [data-no-drag]')) {
                                e.preventDefault();
                                return;
                              }
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData('text/plain', task.id);
                              setTimeout(() => {
                                setDraggedTaskId(task.id);
                              }, 0);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'move';
                              if (draggedTaskId && draggedTaskId !== task.id) {
                                if (hoveredDailyTaskId !== task.id || hoveredDropDate !== selectedDailyDate) {
                                  setHoveredDailyTaskId(task.id);
                                  setHoveredDropDate(selectedDailyDate);
                                }
                              }
                            }}
                            onDrop={(e) => {
                              handleDailyTaskDrop(e, task, selectedDailyDate);
                            }}
                            onDragEnd={() => {
                              setDraggedTaskId(null);
                              setHoveredDailyTaskId(null);
                              setHoveredDropDate(null);
                            }}
                            className={`relative flex items-stretch h-12 transition-colors text-sm text-slate-700 dark:text-slate-300 border-b last:border-b-0 border-slate-100 dark:border-slate-800 select-none group ${
                              isBeingDragged
                                ? 'opacity-40 bg-slate-100/70 dark:bg-slate-800/40 border-dashed border-[#0066FF]/30'
                                : 'bg-white dark:bg-[#0F172A] hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                            }`}
                            id={`flat-task-row-${task.id}`}
                          >
                              {/* Grip Handle & Status Checkbox Cell */}
                              <div className="w-14 flex items-center justify-between px-1.5 border-r border-slate-100 dark:border-slate-800 shrink-0 h-full">
                                <div className="w-4 flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0" title="Drag to reorder">
                                  <GripVertical className="w-3.5 h-3.5 stroke-[2]" />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onToggleTaskStatus(task.id)}
                                  className="w-7 h-7 flex items-center justify-center shrink-0 cursor-pointer select-none"
                                >
                                  <span className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${
                                    isDone
                                      ? 'bg-emerald-500 border-transparent text-white shadow-2xs'
                                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-indigo-500'
                                  }`}>
                                    {isDone && <Check className="w-3 h-3 stroke-[3px]" />}
                                  </span>
                                </button>
                              </div>

                              {/* Task Title Inline Input Cell */}
                              <div className="flex-1 min-w-[200px] px-3.5 flex items-center border-r border-slate-100 dark:border-slate-800 h-full truncate">
                                <input
                                  type="text"
                                  value={task.title}
                                  onChange={(e) => onUpdateTask(task.id, { title: e.target.value })}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  className={`bg-transparent border-0 focus:border-0 focus:ring-0 focus:outline-none p-0 w-full font-semibold text-sm text-slate-800 dark:text-slate-100 ${
                                    isDone ? 'line-through text-slate-400 font-normal' : ''
                                  }`}
                                  placeholder="What needs to be done?"
                                />
                              </div>

                              {/* Task Group Dropdown Cell */}
                              <div className="w-44 px-2 flex items-center justify-center border-r border-slate-100 dark:border-slate-800 shrink-0 h-full relative">
                                <div className="relative group/grp w-full max-w-full">
                                  <div 
                                    className="px-3 py-1.5 rounded-md text-xs font-bold text-white text-center transition truncate cursor-pointer shadow-sm w-full block hover:brightness-95"
                                    style={{
                                      backgroundColor: activeGroup?.color || '#3b82f6',
                                    }}
                                  >
                                    <span className="truncate block w-full">{activeGroup?.name || 'General'}</span>
                                  </div>
                                  <select
                                    value={task.groupId || (groups[0]?.id || '')}
                                    onChange={(e) => {
                                      const newGId = e.target.value;
                                      const autoGoal = goals.find((g) => !g.completed && g.groupIds && g.groupIds.includes(newGId));
                                      onUpdateTask(task.id, {
                                        groupId: newGId,
                                        goalId: autoGoal ? autoGoal.id : task.goalId,
                                        goalName: autoGoal ? autoGoal.title : task.goalName,
                                      });
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  >
                                    {groups.map((g) => (
                                      <option key={g.id} value={g.id} className="bg-white dark:bg-[#0F172A] text-slate-800 dark:text-slate-100 font-semibold text-left">
                                        {g.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Target Selector Dropdown */}
                              <div className="w-44 px-3 flex items-center border-r border-slate-100 dark:border-slate-800 shrink-0 h-full relative">
                                <Target className="w-3.5 h-3.5 text-indigo-500 shrink-0 mr-1.5" />
                                <select
                                  value={task.goalId || ''}
                                  onChange={(e) => {
                                    const newGoalId = e.target.value;
                                    const selectedGoal = goals.find((g) => g.id === newGoalId);
                                    onUpdateTask(task.id, {
                                      goalId: newGoalId || undefined,
                                      goalName: selectedGoal ? selectedGoal.title : undefined,
                                    });
                                  }}
                                  className="w-full bg-transparent text-slate-600 dark:text-slate-300 font-medium cursor-pointer text-xs focus:outline-none focus:ring-0 focus:border-0 border-0 p-0 text-left truncate"
                                  title={matchedGoal?.title || "No connected target"}
                                >
                                  <option value="" className="text-slate-400 dark:text-slate-500 bg-white dark:bg-[#0F172A]">No connected target</option>
                                  {goals.map((g) => (
                                    <option key={g.id} value={g.id} className="text-slate-800 dark:text-slate-100 font-semibold bg-white dark:bg-[#0F172A]">
                                      {g.title}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Timeblock Status */}
                              <div className="w-44 px-2 flex items-center justify-center border-r border-slate-100 dark:border-slate-800 shrink-0 h-full">
                                {task.startTime ? (
                                  <button
                                    type="button"
                                    onClick={() => onOpenEditModal('task', task)}
                                    className="px-2.5 py-0.5 rounded-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer max-w-full truncate shadow-3xs"
                                  >
                                    <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span className="truncate tabular-nums">{formatTimeRange(task.startTime, task.endTime)}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onOpenEditModal('task', task)}
                                    className="px-2.5 py-0.5 rounded-full flex items-center justify-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition cursor-pointer border border-slate-200/60 dark:border-slate-700/50"
                                    title="Schedule on calendar"
                                  >
                                    <Clock className="w-3 h-3 opacity-60 shrink-0" />
                                    <span>Unscheduled</span>
                                  </button>
                                )}
                              </div>

                              {/* Trash Action */}
                              <div className="w-12 flex items-center justify-center shrink-0 h-full">
                                <button
                                  type="button"
                                  onClick={() => onDeleteTask(task.id, true)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer shrink-0"
                                  title="Delete Task"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                </button>
                              </div>
                            </div>
                          </div>
                      );
                    });
                  })()}

                  {/* End-of-table drop target slot with smooth space preview */}
                  {draggedTaskId && draggedTask && (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        if (hoveredDailyTaskId !== `__bottom__${selectedDailyDate}` || hoveredDropDate !== selectedDailyDate) {
                          setHoveredDailyTaskId(`__bottom__${selectedDailyDate}`);
                          setHoveredDropDate(selectedDailyDate);
                        }
                      }}
                      onDrop={(e) => {
                        handleDailyContainerDrop(e, selectedDailyDate);
                      }}
                      className="relative min-h-[38px] p-1 flex flex-col justify-center cursor-pointer"
                    >
                      {hoveredDailyTaskId === `__bottom__${selectedDailyDate}` && hoveredDropDate === selectedDailyDate ? (
                        <div className="h-10 flex items-stretch bg-blue-50/90 dark:bg-blue-950/45 border-2 border-dashed border-[#0066FF] dark:border-[#38BDF8] rounded-xl text-xs text-slate-700 dark:text-slate-200 select-none shadow-3xs transition-all animate-in fade-in duration-100">
                          <div className="w-14 flex items-center justify-between px-2 border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 shrink-0 h-full">
                            <GripVertical className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#38BDF8]" />
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-[#0066FF] dark:border-[#38BDF8]" />
                          </div>
                          <div className="flex-1 min-w-[200px] px-3.5 flex items-center border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 h-full truncate font-semibold text-slate-800 dark:text-slate-100">
                            <span className="truncate">{draggedTask.title}</span>
                          </div>
                          <div className="w-44 px-3 flex items-center justify-center border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 shrink-0 h-full">
                            {(() => {
                              const g = groups.find(grp => grp.id === draggedTask.groupId) || groups[0];
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-3xs">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g?.color || '#3b82f6' }} />
                                  <span className="truncate max-w-[120px]">{g?.name}</span>
                                </span>
                              );
                            })()}
                          </div>
                          <div className="w-44 px-3.5 flex items-center border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 shrink-0 h-full text-slate-500 dark:text-slate-400 text-xs">
                            <span className="truncate">
                              {draggedTask.goalName || (draggedTask.goalId && goals ? goals.find(g => g.id === draggedTask.goalId)?.title : 'No Target')}
                            </span>
                          </div>
                          <div className="w-44 flex items-center justify-center border-r border-dashed border-[#0066FF]/30 dark:border-[#38BDF8]/30 shrink-0 h-full text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {draggedTask.startTime ? formatTimeRange(draggedTask.startTime, draggedTask.endTime) : 'Unscheduled'}
                          </div>
                          <div className="w-12 flex items-center justify-center shrink-0 text-xs font-bold text-[#0066FF] dark:text-[#38BDF8]">
                            Drop
                          </div>
                        </div>
                      ) : (
                        <div className="h-4" />
                      )}
                    </div>
                  )}
                </div>

                {/* Premium Inline Spreadsheet-style Quick Add Row for 1-Day View */}
                <div className="relative flex items-stretch h-10 bg-white dark:bg-[#0F172A] hover:bg-slate-50/30 dark:hover:bg-slate-800/20 text-xs select-none border-t border-slate-100 dark:border-slate-800">
                  {(() => {
                    const activeGId = flatGroupId || groups[0]?.id || '';
                    const activeGroup = groups.find(g => g.id === activeGId) || groups[0];
                    
                    const isActive = activeFlatQuickAdd || !!flatTaskTitle;

                    if (!isActive) {
                      return (
                        <div
                          onClick={() => setActiveFlatQuickAdd(true)}
                          className="w-full h-10 flex items-center gap-3.5 px-5 text-slate-400 dark:text-slate-500 hover:text-[#0066FF] dark:hover:text-[#60A5FA] hover:bg-slate-50/50 dark:hover:bg-[#131B2E]/20 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                          <span className="font-semibold text-xs tracking-tight">Add a new daily task</span>
                        </div>
                      );
                    }

                    return (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!flatTaskTitle.trim()) return;
                          
                          const chosenGoal = goals.find((g) => g.id === flatGoalId);
                          
                          onAddTask(
                            flatTaskTitle.trim(),
                            selectedDailyDate,
                            undefined,
                            'todo',
                            activeGId,
                            undefined,
                            chosenGoal ? chosenGoal.id : undefined,
                            chosenGoal ? chosenGoal.title : undefined
                          );
                          
                          setFlatTaskTitle('');
                          setIsFlatTargetDropdownOpen(false);
                          setShowFlatOtherTargets(false);
                          setActiveFlatQuickAdd(false);
                        }}
                        className="w-full flex items-stretch"
                      >
                        {/* Plus Icon Cell */}
                        <div className="w-14 flex items-center justify-center border-r border-slate-100 dark:border-slate-800 shrink-0 h-full text-slate-400 dark:text-slate-600">
                          <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                        </div>

                        {/* Task Title Input */}
                        <div className="flex-1 min-w-[200px] px-3.5 flex items-center border-r border-slate-100 dark:border-slate-800 h-full">
                          <input
                            type="text"
                            placeholder="Task name"
                            value={flatTaskTitle}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setFlatTaskTitle('');
                                setActiveFlatQuickAdd(false);
                              }
                            }}
                            onChange={(e) => setFlatTaskTitle(e.target.value)}
                            className="bg-transparent border-0 focus:border-0 focus:ring-0 focus:outline-none p-0 w-full font-medium text-slate-800 dark:text-slate-100 text-xs placeholder-slate-400 dark:placeholder-slate-500"
                          />
                        </div>

                        {/* Task Group Dropdown Select */}
                        <div className="w-44 px-3 flex items-center justify-center border-r border-slate-100 dark:border-slate-800 shrink-0 h-full relative">
                          <div className="relative w-full max-w-full">
                            <div 
                              className="px-3 py-1 rounded-md text-xs font-bold text-white text-center transition truncate cursor-pointer shadow-sm w-full block hover:brightness-95"
                              style={{
                                backgroundColor: activeGroup?.color || '#3b82f6',
                              }}
                            >
                              <span className="truncate block w-full">{activeGroup?.name || 'General'}</span>
                            </div>
                            <select
                              value={activeGId}
                              onChange={(e) => {
                                const newGId = e.target.value;
                                setFlatGroupId(newGId);
                                const activeGoals = goals.filter((g) => !g.completed);
                                const recommendedGoals = activeGoals.filter((g) => g.groupIds && g.groupIds.includes(newGId));
                                if (recommendedGoals.length > 0) {
                                  setFlatGoalId(recommendedGoals[0].id);
                                } else {
                                  setFlatGoalId('');
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            >
                              {groups.map((g) => (
                                <option key={g.id} value={g.id} className="bg-white dark:bg-[#0F172A] text-slate-800 dark:text-slate-100 font-semibold">
                                  {g.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Target Group Dropdown Select */}
                        <div className="w-56 px-3 flex items-center justify-center border-r border-slate-100 dark:border-slate-800 shrink-0 h-full relative">
                          <div className="relative w-full">
                            <div 
                              className="px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center justify-between gap-1.5 transition truncate cursor-pointer shadow-3xs bg-slate-100/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 w-full"
                            >
                              <span className="flex items-center gap-1.5 min-w-0 truncate">
                                <Target className="w-3.5 h-3.5 text-indigo-500 shrink-0 opacity-70" />
                                <span className="truncate">
                                  {flatGoalId ? (goals.find(g => g.id === flatGoalId)?.title || 'Target') : 'No target'}
                                </span>
                              </span>
                              <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                            </div>
                            <select
                              value={flatGoalId}
                              onChange={(e) => setFlatGoalId(e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            >
                              <option value="">No Target</option>
                              {goals.filter(g => !g.completed).map((g) => (
                                <option key={g.id} value={g.id} className="bg-white dark:bg-[#0F172A] text-slate-800 dark:text-slate-100">
                                  {g.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Timeblock display */}
                        <div className="w-44 flex items-center justify-center border-r border-slate-100 dark:border-slate-800 shrink-0 h-full text-slate-400 dark:text-slate-500 text-xs font-medium">
                          <span className="truncate">Schedule after creation</span>
                        </div>

                        {/* Submit or Cancel icon button */}
                        <div className="w-12 flex items-center justify-center shrink-0 h-full">
                          {flatTaskTitle.trim() ? (
                            <button
                              type="submit"
                              className="p-1 text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/45 transition cursor-pointer"
                              title="Save Task"
                            >
                              <CornerDownLeft className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setFlatTaskTitle('');
                                setActiveFlatQuickAdd(false);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/45 transition cursor-pointer"
                              title="Cancel"
                            >
                              <Plus className="w-3.5 h-3.5 rotate-45 stroke-[2.5]" />
                            </button>
                          )}
                        </div>
                      </form>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            /* 2 Days View: High-fidelity wide workspace allowing massive room for tasks and text */
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#070A11] p-4 md:p-6">
              <div className="max-w-[1550px] mx-auto w-full flex flex-col md:flex-row gap-5 min-h-full">
                {renderDailyTableForDate(selectedDailyDate)}
                {renderDailyTableForDate(getNextDateStr(selectedDailyDate))}
              </div>
            </div>
          )
        ) : (
          /* ========================================================
             LARK/NOTION STYLE KANBAN VIEW (Image 2)
             ======================================================== */
          <div className="flex gap-6 overflow-x-auto pb-6 h-full items-start relative" id="lark-kanban-canvas">
            {groups.map((group) => {
              const rawGroupTasks = tasks.filter((t) => t.groupId === group.id);
              const groupTasks = getSortedGroupTasks(group.id, rawGroupTasks);
              const isColumnDropActive = hoveredDropGroupId === group.id && !!draggedTaskId;

              return (
                <div
                  key={group.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (hoveredDropGroupId !== group.id) {
                      setHoveredDropGroupId(group.id);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setHoveredDropGroupId((curr) => (curr === group.id ? null : curr));
                    }
                  }}
                  onDrop={(e) => {
                    handleColumnDrop(e, group.id);
                  }}
                  className={`w-72 flex flex-col shrink-0 max-h-[620px] overflow-hidden px-1.5 py-1 rounded-2xl transition-all duration-150 ${
                    isColumnDropActive
                      ? 'bg-slate-100/50 dark:bg-slate-800/30 ring-1 ring-[#0066FF]/30 dark:ring-[#38BDF8]/30'
                      : 'bg-transparent ring-1 ring-transparent'
                  }`}
                  id={`kanban-group-column-${group.id}`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3.5 shrink-0 select-none px-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 overflow-hidden cursor-pointer hover:scale-110 transition-transform flex items-center justify-center">
                        <input
                          type="color"
                          value={group.color || '#cbd5e1'}
                          onChange={(e) => onUpdateGroup(group.id, group.name, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150 z-10"
                          title="Click to change list color"
                        />
                        <span className="absolute inset-0" style={{ backgroundColor: group.color || '#cbd5e1' }} />
                      </div>
                      {editingGroupId === group.id ? (
                        <input
                          type="text"
                          value={editGroupNameValue}
                          onChange={(e) => setEditGroupNameValue(e.target.value)}
                          onBlur={() => handleSaveGroupName(group.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveGroupName(group.id);
                            if (e.key === 'Escape') setEditingGroupId(null);
                          }}
                          className="text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded px-1.5 py-0.5 focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                          onClick={() => {
                            setEditingGroupId(group.id);
                            setEditGroupNameValue(group.name);
                          }}
                        >
                          {group.name}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-0.5">
                        {groupTasks.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {group.id !== 'group-1' && (
                        <button
                          onClick={() => onDeleteGroup(group.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete Group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tasks Container */}
                  <div 
                    className="space-y-2.5 overflow-y-auto flex-1 pb-2 scrollbar-thin px-0.5"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDragLeave={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (
                        e.clientX < rect.left ||
                        e.clientX >= rect.right ||
                        e.clientY < rect.top ||
                        e.clientY >= rect.bottom
                      ) {
                        setHoveredTaskCardId(null);
                      }
                    }}
                  >
                    {groupTasks.map((task) => {
                      const isDone = task.status === 'done';
                      const isBeingDragged = draggedTaskId === task.id;
                      const isCardHovered = hoveredTaskCardId === task.id && draggedTaskId && draggedTaskId !== task.id;

                      return (
                        <div key={task.id} className="relative group/card">
                          {/* Dedicated drop preview card showing exact position */}
                          {isCardHovered && draggedTask && (
                            <div 
                              className="bg-slate-100/70 dark:bg-slate-800/50 border-2 border-dashed border-[#0066FF]/40 dark:border-[#38BDF8]/40 rounded-xl p-3.5 opacity-70 transition-all my-1.5 shadow-xs cursor-pointer"
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                              }}
                              onDrop={(e) => {
                                handleTaskCardDrop(e, task);
                              }}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="w-4 h-4 rounded-full border border-dashed border-slate-400/60 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-snug truncate">
                                    {draggedTask.title}
                                  </h4>
                                  {(() => {
                                    const targetTitle = draggedTask.goalName || (draggedTask.goalId && goals ? goals.find(g => g.id === draggedTask.goalId)?.title : undefined);
                                    if (!targetTitle) return null;
                                    return (
                                      <div className="mt-1">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
                                          <Target className="w-2.5 h-2.5 opacity-70" />
                                          <span className="truncate max-w-[150px]">{targetTitle}</span>
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                              {(draggedTask.date || draggedTask.startTime || draggedTask.time) && (
                                <div className="mt-2 pt-1.5 border-t border-dashed border-slate-300/60 dark:border-slate-700/60 flex items-center text-[10px] text-slate-400">
                                  <span className="flex items-center gap-1 font-sans tabular-nums">
                                    <Calendar className="w-2.5 h-2.5 opacity-60" />
                                    {draggedTask.date}
                                    {(draggedTask.startTime || draggedTask.time) && ` • ${draggedTask.startTime || draggedTask.time}`}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          <div
                            draggable
                            onDragStart={(e) => {
                              const target = e.target as HTMLElement;
                              if (target.closest('button, input, select, textarea, [data-no-drag]')) {
                                e.preventDefault();
                                return;
                              }
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData('text/plain', task.id);
                              setTimeout(() => {
                                setDraggedTaskId(task.id);
                              }, 0);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'move';
                              if (draggedTaskId && draggedTaskId !== task.id && hoveredTaskCardId !== task.id) {
                                setHoveredTaskCardId(task.id);
                              }
                            }}
                            onDrop={(e) => {
                              handleTaskCardDrop(e, task);
                            }}
                            onDragEnd={() => {
                              setDraggedTaskId(null);
                              setHoveredDropGroupId(null);
                              setHoveredTaskCardId(null);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenEditModal('task', task);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onOpenEditModal('task', task);
                            }}
                            className={`bg-white dark:bg-[#0F172A] rounded-xl p-3.5 transition-all relative select-none ${
                              isBeingDragged
                                ? 'opacity-40 border-2 border-dashed border-[#0066FF]/40 dark:border-[#38BDF8]/40 bg-slate-50/60 dark:bg-slate-900/30 shadow-none'
                                : 'border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs cursor-grab active:cursor-grabbing'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              {/* Checkbox */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleTaskStatus(task.id);
                                }}
                                className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 cursor-pointer select-none group/chk"
                                title={isDone ? "Mark incomplete" : "Mark complete"}
                              >
                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                  isDone
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover/chk:border-[#0066FF]'
                                }`}>
                                  {isDone && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                                </span>
                              </button>

                              {/* Title & Info */}
                              <div className="flex-1 min-w-0">
                                <h4
                                  className={`text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug break-words ${
                                    isDone ? 'line-through text-slate-400 font-normal' : ''
                                  }`}
                                >
                                  {task.title}
                                </h4>
                                {(() => {
                                  const targetTitle = task.goalName || (task.goalId && goals ? goals.find(g => g.id === task.goalId)?.title : undefined);
                                  if (!targetTitle) return null;
                                  return (
                                    <div className="mt-1.5">
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/40 select-none">
                                        <Target className="w-3 h-3 text-indigo-500 shrink-0" />
                                        <span className="truncate max-w-[170px]">{targetTitle}</span>
                                      </span>
                                    </div>
                                  );
                                })()}
                                {task.description && (
                                  <p className="text-[11px] mt-1 text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                                    {task.description}
                                  </p>
                                )}
                              </div>

                              {/* Edit action */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenEditModal('task', task);
                                }}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0 p-1 rounded-md opacity-80 md:opacity-0 md:group-hover/card:opacity-100 cursor-pointer"
                                title="Edit Details"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Footer details */}
                            {(task.date || task.startTime || task.time) && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                <span className="flex items-center gap-1 font-sans tabular-nums">
                                  <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                  {task.date}
                                  {(task.startTime || task.time) && ` • ${task.startTime || task.time}`}
                                </span>

                                {/* Hover Quick actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteTask(task.id, true);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                                    title="Delete task"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* End-of-column drop target slot with slightly greyed preview */}
                    {draggedTaskId && draggedTask && (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (hoveredTaskCardId !== `__bottom__${group.id}`) {
                            setHoveredTaskCardId(`__bottom__${group.id}`);
                          }
                        }}
                        onDragLeave={() => {
                          if (hoveredTaskCardId === `__bottom__${group.id}`) {
                            setHoveredTaskCardId(null);
                          }
                        }}
                        onDrop={(e) => {
                          handleColumnDrop(e, group.id);
                        }}
                        className="relative min-h-[32px] flex flex-col justify-center cursor-pointer"
                      >
                        {hoveredTaskCardId === `__bottom__${group.id}` ? (
                          <div className="bg-slate-100/70 dark:bg-slate-800/50 border-2 border-dashed border-[#0066FF]/40 dark:border-[#38BDF8]/40 rounded-xl p-3.5 opacity-70 pointer-events-none transition-all my-1 shadow-xs">
                            <div className="flex items-start gap-2.5">
                              <div className="w-4 h-4 rounded-full border border-dashed border-slate-400/60 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-snug truncate">
                                  {draggedTask.title}
                                </h4>
                              </div>
                            </div>
                            {(draggedTask.date || draggedTask.startTime || draggedTask.time) && (
                              <div className="mt-2 pt-1.5 border-t border-dashed border-slate-300/60 dark:border-slate-700/60 flex items-center text-[10px] text-slate-400">
                                <span className="flex items-center gap-1 font-sans tabular-nums">
                                  <Calendar className="w-2.5 h-2.5 opacity-60" />
                                  {draggedTask.date}
                                  {(draggedTask.startTime || draggedTask.time) && ` • ${draggedTask.startTime || draggedTask.time}`}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-4" />
                        )}
                      </div>
                    )}

                    {groupTasks.length === 0 && addingTaskToGroupId !== group.id && (
                      <div className={`text-center py-8 border border-dashed rounded-xl text-xs transition-colors select-none ${
                        isColumnDropActive
                          ? 'border-[#0066FF]/50 dark:border-[#38BDF8]/50 bg-blue-50/20 dark:bg-blue-950/20 text-[#0066FF] dark:text-[#38BDF8]'
                          : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 bg-white/40 dark:bg-slate-900/40'
                      }`}>
                        {isColumnDropActive ? 'Drop task into this list' : 'No active tasks'}
                      </div>
                    )}

                    {/* Inline Task adding inside column */}
                    {addingTaskToGroupId === group.id && renderInlineTaskForm(group.id)}
                  </div>

                  {/* Add task column trigger */}
                  {addingTaskToGroupId !== group.id && (
                    <button
                      onClick={() => {
                        setAddingTaskToGroupId(group.id);
                        setNewTaskTitle('');
                        setNewTaskStartTime('');
                        setNewTaskEndTime('');
                      }}
                      className="w-full py-2 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl flex items-center justify-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>New Task</span>
                    </button>
                  )}
                </div>
              );
            })}

            {/* + New Group Column (Far Right) */}
            <div className="w-72 shrink-0 select-none">
              {isAddingGroup ? (
                <form onSubmit={handleCreateGroup} className="space-y-3 w-full bg-white dark:bg-[#0F172A] p-3 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs">
                  <input
                    type="text"
                    placeholder="New list name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                    required
                    autoFocus
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAddingGroup(false)}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-1 rounded-lg"
                    >
                      Create
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingGroup(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all py-2.5 px-3 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl w-full justify-start cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span>Add Group</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
