/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, Check, X, AlarmClockCheck, Lock } from 'lucide-react';
import { Task, Tag } from '../types';
import { formatTo12Hour } from './CalendarView';

interface FocusTimerViewProps {
  task?: Task | null;
  allTasks?: Task[];
  tags: Tag[];
  onCompleteTask: (
    task: Task | null,
    timeDeltaMinutes: number,
    resolution: 'keep' | 'push' | 'shorten' | 'pull' | 'keep_original'
  ) => void;
  onEndIncomplete: () => void;
  userId?: string;
  onTimerRunningChange?: (running: boolean) => void;
}

interface ActiveWave {
  id: number;
  bornAt: number;
}

export const FocusTimerView: React.FC<FocusTimerViewProps> = ({
  task,
  allTasks = [],
  tags,
  onCompleteTask,
  onEndIncomplete,
  userId = 'usr-mathias-cheow-primary',
  onTimerRunningChange,
}) => {
  const activeTask = task || null;
  const isLockMode = !activeTask;
  const taskId = activeTask ? activeTask.id : 'open';

  // Calculate initial remaining seconds based on task's scheduled timing & date
  const initialCalculated = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentSecondsInMin = now.getSeconds();

    if (!activeTask) {
      return { remainingSeconds: 0, isOvertime: false, initialOvertime: 0, plannedSec: 0 };
    }

    // Past date (e.g. yesterday's task) -> starts immediately as Overdue Stopwatch
    if (activeTask.date && activeTask.date < todayStr) {
      return { remainingSeconds: 0, isOvertime: true, initialOvertime: 0, plannedSec: 0 };
    }

    // Scheduled with an end time (if today or date-agnostic)
    if ((!activeTask.date || activeTask.date === todayStr) && activeTask.endTime) {
      const [eh, em] = activeTask.endTime.split(':').map(Number);
      const endMinutes = eh * 60 + em;
      if (currentMinutes >= endMinutes) {
        // Overdue / overtime past today's end time
        const otSec = (currentMinutes - endMinutes) * 60 + currentSecondsInMin;
        return { remainingSeconds: 0, isOvertime: true, initialOvertime: otSec, plannedSec: 0 };
      } else {
        const diffSeconds = (endMinutes - currentMinutes) * 60 - currentSecondsInMin;
        const validRemaining = Math.max(0, diffSeconds);
        return { remainingSeconds: validRemaining, isOvertime: false, initialOvertime: 0, plannedSec: validRemaining };
      }
    }

    // Task with scheduled duration (e.g. start & end time)
    if (activeTask.startTime && activeTask.endTime) {
      const [sh, sm] = activeTask.startTime.split(':').map(Number);
      const [eh, em] = activeTask.endTime.split(':').map(Number);
      const durationSec = Math.max(5 * 60, (eh * 60 + em - (sh * 60 + sm)) * 60);
      return { remainingSeconds: durationSec, isOvertime: false, initialOvertime: 0, plannedSec: durationSec };
    }

    return { remainingSeconds: 25 * 60, isOvertime: false, initialOvertime: 0, plannedSec: 25 * 60 };
  }, [activeTask]);

  const initialElapsed = useMemo(() => {
    if (initialCalculated.isOvertime) {
      return initialCalculated.plannedSec + initialCalculated.initialOvertime;
    }
    if (initialCalculated.plannedSec > 0) {
      return Math.max(0, initialCalculated.plannedSec - initialCalculated.remainingSeconds);
    }
    return 0;
  }, [initialCalculated]);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialCalculated.remainingSeconds);
  const [overtimeSeconds, setOvertimeSeconds] = useState<number>(initialCalculated.initialOvertime);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(initialElapsed);
  const [isRunning, setIsRunning] = useState<boolean>(!isLockMode);
  const [isOvertime, setIsOvertime] = useState<boolean>(initialCalculated.isOvertime);
  const [isPendingStart, setIsPendingStart] = useState<boolean>(false);

  // Sync state instantly when initialCalculated changes and the timer is not running
  useEffect(() => {
    if (!isRunning || isPendingStart) {
      setSecondsRemaining(initialCalculated.remainingSeconds);
      setOvertimeSeconds(initialCalculated.initialOvertime);
      setIsOvertime(initialCalculated.isOvertime);
      setElapsedSeconds(initialElapsed);
    }
  }, [initialCalculated, initialElapsed, isRunning, isPendingStart]);

  useEffect(() => {
    localStorage.setItem('focus_timer_running', String(isRunning));
    if (onTimerRunningChange) {
      onTimerRunningChange(isRunning);
    }
  }, [isRunning, onTimerRunningChange]);

  // Server Session Synchronization
  useEffect(() => {
    if (isLockMode) {
      setIsRunning(false);
      return;
    }

    let isMounted = true;

    fetch(`/api/focus/session/${encodeURIComponent(taskId)}?userId=${encodeURIComponent(userId)}&plannedDurationSec=${initialCalculated.plannedSec}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.session) {
          // Sync with authoritative server time
          setSecondsRemaining(data.session.remainingSec);
          setOvertimeSeconds(data.session.overtimeSec);
          setIsOvertime(data.session.isOvertime);
          setIsRunning(data.session.isRunning);
          if (typeof data.session.totalElapsedSec === 'number') {
            setElapsedSeconds(data.session.totalElapsedSec);
          }
          setIsPendingStart(false);
        } else {
          // If no active session yet for a scheduled task, display "Start Task" prompt
          setIsPendingStart(true);
          setIsRunning(false);
        }
      })
      .catch(() => {
        setIsPendingStart(true);
        setIsRunning(false);
      });

    return () => {
      isMounted = false;
    };
  }, [taskId, userId, isLockMode, initialCalculated]);

  const [pauseNoticeMessage, setPauseNoticeMessage] = useState<string | null>(null);

  // Handle Play/Pause or Start Pending Task
  const handleTogglePlayPause = () => {
    if (isLockMode) return;

    if (isPendingStart) {
      setIsPendingStart(false);
      setIsRunning(true);
      setElapsedSeconds(initialElapsed);
      fetch('/api/focus/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          userId,
          plannedDurationSec: initialCalculated.plannedSec,
          initialOvertimeSec: initialCalculated.initialOvertime,
        }),
      }).catch((err) => console.warn('Server session init failed:', err));
      return;
    }

    const nextRunning = !isRunning;
    setIsRunning(nextRunning);

    if (!nextRunning && !isOvertime) {
      const currentCount = parseInt(localStorage.getItem('focus_pause_notice_count') || '0', 10);
      if (currentCount < 5) {
        localStorage.setItem('focus_pause_notice_count', String(currentCount + 1));
        setPauseNoticeMessage('Timer paused. Resuming continues tracking your active focus time.');
        setTimeout(() => setPauseNoticeMessage(null), 4000);
      }
    } else if (nextRunning) {
      setPauseNoticeMessage(null);
    }

    const endpoint = nextRunning ? '/api/focus/session/resume' : '/api/focus/session/pause';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, userId }),
    }).catch((err) => console.warn('Failed to update server session state:', err));
  };

  // Dynamic Wave Rings
  const [waves, setWaves] = useState<ActiveWave[]>([]);
  const waveIdRef = useRef<number>(0);

  const activeTick = elapsedSeconds;
  useEffect(() => {
    if (!isRunning || isLockMode) return;

    const id = ++waveIdRef.current;
    const now = Date.now();
    setWaves((prev) => [...prev.filter((w) => now - w.bornAt < 5000), { id, bornAt: now }]);
  }, [activeTick, isRunning, isLockMode]);

  useEffect(() => {
    const gcInterval = setInterval(() => {
      const now = Date.now();
      setWaves((prev) => {
        const active = prev.filter((w) => now - w.bornAt < 5000);
        return active.length === prev.length ? prev : active;
      });
    }, 500);
    return () => clearInterval(gcInterval);
  }, []);

  // Schedule conflict modal state (Overtime)
  const [showConflictModal, setShowConflictModal] = useState<boolean>(false);
  const [conflictChoice, setConflictChoice] = useState<'keep' | 'push' | 'keep_original'>('keep');

  // Early completion modal state
  const [showEarlyModal, setShowEarlyModal] = useState<boolean>(false);
  const [earlyChoice, setEarlyChoice] = useState<'shorten' | 'pull' | 'keep_original'>('shorten');

  // Timer interval
  useEffect(() => {
    if (!isRunning || isLockMode) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prevElapsed) => prevElapsed + 1);
      if (isOvertime) {
        setOvertimeSeconds((ot) => ot + 1);
      } else {
        setSecondsRemaining((prev) => {
          if (prev > 1) {
            return prev - 1;
          } else {
            setIsOvertime(true);
            setOvertimeSeconds(0);
            return 0;
          }
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isOvertime, isLockMode]);

  // Format seconds into MM:SS or HH:MM:SS
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Formatted timing range
  const timeRangeStr = useMemo(() => {
    if (!activeTask || !activeTask.startTime || !activeTask.endTime) return null;
    return `${formatTo12Hour(activeTask.startTime)} to ${formatTo12Hour(activeTask.endTime)}`;
  }, [activeTask]);

  // Complete click handler
  const handleCompleteClick = () => {
    fetch('/api/focus/session/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, userId }),
    }).catch(() => {});

    if (isOvertime) {
      setShowConflictModal(true);
    } else {
      const earlyMins = Math.floor(secondsRemaining / 60);
      if (earlyMins >= 1) {
        setShowEarlyModal(true);
      } else {
        onCompleteTask(activeTask || null, 0, 'keep_original');
      }
    }
  };

  // Handle End as Incomplete
  const handleEndIncompleteClick = () => {
    fetch('/api/focus/session/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, userId }),
    }).catch(() => {});

    onEndIncomplete();
  };

  // Confirm resolution in overtime modal
  const handleConfirmConflict = () => {
    const overtimeMins = Math.max(1, Math.round(overtimeSeconds / 60));
    setShowConflictModal(false);
    onCompleteTask(activeTask || null, overtimeMins, conflictChoice);
  };

  // Confirm resolution in early completion modal
  const handleConfirmEarly = () => {
    const earlyMins = Math.max(1, Math.floor(secondsRemaining / 60));
    setShowEarlyModal(false);
    onCompleteTask(activeTask || null, earlyMins, earlyChoice);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#13151A] text-slate-800 dark:text-[#F4F4F5] select-none relative overflow-hidden transition-colors duration-200" id="focus-timer-view">
      {/* Calendar-Style Top Bar Header */}
      <div className="absolute top-0 inset-x-0 h-16 border-b border-slate-200 dark:border-[#2A2E39] px-6 flex items-center justify-between flex-shrink-0 bg-slate-50/80 dark:bg-[#13151A]/80 backdrop-blur-md z-30" id="focus-timer-header">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-[#F4F4F5] flex items-center gap-2.5">
            <AlarmClockCheck className="w-6 h-6 text-[#0066FF]" />
            <span>Focus Timer</span>
          </h1>
        </div>

        {activeTask && (
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-slate-800 dark:text-[#F4F4F5] text-sm truncate max-w-xs md:max-w-md">
              {activeTask.title}
            </span>
            {timeRangeStr && (
              <>
                <div className="w-px h-4 bg-slate-200 dark:bg-[#2A2E39] mx-1" />
                <span
                  className="text-sm font-semibold text-slate-500 dark:text-[#9CA3AF] font-inter tabular-nums"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {timeRangeStr}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Center Stage */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-6 min-h-0 relative z-10">
        {/* Concentric Animated Ripple Stage */}
        <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center">
          {!isLockMode && waves.map((wave) => (
            <div
              key={wave.id}
              className={`absolute inset-0 rounded-full border-[1.25px] animate-single-ripple pointer-events-none transition-colors duration-500 ${
                isOvertime
                  ? 'border-red-500/32 shadow-[0_0_8px_rgba(239,68,68,0.08)] bg-red-500/[0.008]'
                  : 'border-[#0066FF]/28 shadow-[0_0_8px_rgba(0,102,255,0.06)] bg-[#0066FF]/[0.008]'
              }`}
            />
          ))}

          {/* Central Timer Display Circle */}
          <div className="relative z-10 w-72 h-72 md:w-80 md:h-80 rounded-full bg-white dark:bg-[#1C1F26] shadow-xl border border-slate-200 dark:border-[#2A2E39] flex flex-col items-center justify-center p-6 transition-all">
            {isLockMode ? (
              <span className="text-3xl md:text-4xl font-extrabold text-slate-500 dark:text-[#9CA3AF] font-sans tracking-tight">
                No Tasks
              </span>
            ) : (
              <>
                {/* Massive number: amount of time working */}
                <div
                  className="text-6xl md:text-7xl font-extrabold font-inter tabular-nums tracking-tight text-slate-800 dark:text-[#F4F4F5] transition-colors"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {formatTime(elapsedSeconds)}
                </div>

                {/* Sub-label below the massive number */}
                <div className="mt-2.5 flex items-center justify-center gap-1.5 select-none">
                  {isPendingStart ? (
                    <span className="text-xs font-semibold text-[#0066FF] bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full animate-pulse border border-blue-100 dark:border-blue-800/50">
                      Click play to start
                    </span>
                  ) : isOvertime ? (
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-1 rounded-full border border-red-100 dark:border-red-800/50 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                      <span>Overtime: {formatTime(overtimeSeconds)}</span>
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-500 dark:text-[#9CA3AF] font-sans tracking-wide">
                      Time remaining: <span className="font-semibold text-slate-800 dark:text-[#F4F4F5] font-inter tabular-nums">{formatTime(secondsRemaining)}</span>
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pause Toast Notification */}
        {pauseNoticeMessage && (
          <div className="mt-3 px-3.5 py-1.5 bg-amber-50 border border-amber-200/80 rounded-full shadow-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span className="text-xs font-semibold text-amber-800 font-sans">
              {pauseNoticeMessage}
            </span>
          </div>
        )}

        {/* Play / Pause / Lock Circular Button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={isLockMode ? undefined : handleTogglePlayPause}
            disabled={isLockMode}
            className={`w-14 h-14 rounded-full border-2 border-white shadow-lg ring-4 flex items-center justify-center transition-all ${
              isLockMode
                ? 'bg-slate-100 text-slate-300 ring-slate-900/10 cursor-not-allowed opacity-60'
                : isOvertime
                ? 'bg-rose-600 hover:bg-rose-700 text-white ring-rose-500/30 cursor-pointer hover:scale-105 active:scale-95'
                : 'bg-[#18181b] hover:bg-black text-white ring-slate-900/10 cursor-pointer hover:scale-105 active:scale-95'
            }`}
            title={isLockMode ? 'No Task Available' : isPendingStart ? 'Start Task' : isRunning ? 'Pause Timer' : 'Resume Timer'}
          >
            {isLockMode ? (
              <Lock className="w-5 h-5 text-slate-400" />
            ) : isRunning ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Bottom Action Controls - Hidden during Lock Mode */}
        {!isLockMode && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleCompleteClick}
              className="px-6 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white font-semibold text-sm shadow-xs transition-all cursor-pointer flex items-center gap-2 hover:scale-102 active:scale-98"
              id="focus-complete-task-btn"
            >
              <Check className="w-4 h-4 stroke-[2.5px]" />
              <span>Complete Task</span>
            </button>

            <button
              type="button"
              onClick={handleEndIncompleteClick}
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 hover:scale-102 active:scale-98"
              id="focus-end-incomplete-btn"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span>End as Incomplete</span>
            </button>
          </div>
        )}
      </div>

      {/* Schedule Conflict Modal (Overtime) */}
      {showConflictModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="calendar-tasks-settings-modal">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Calendar Tasks Settings</h3>
            <p className="text-xs text-slate-500 mb-4">
              You worked {Math.max(1, Math.round(overtimeSeconds / 60))} minute{Math.round(overtimeSeconds / 60) === 1 ? '' : 's'} overtime!
            </p>

            <div className="space-y-2.5 mb-6">
              <label
                onClick={() => setConflictChoice('push')}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  conflictChoice === 'push'
                    ? 'border-[#0066FF] bg-[#0066FF]/5 text-slate-900 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    conflictChoice === 'push' ? 'border-[#0066FF]' : 'border-slate-300'
                  }`}
                >
                  {conflictChoice === 'push' && <div className="w-2 h-2 rounded-full bg-[#0066FF]" />}
                </div>
                <span className="text-sm">Push following schedule downwards</span>
              </label>

              <label
                onClick={() => setConflictChoice('keep')}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  conflictChoice === 'keep'
                    ? 'border-[#0066FF] bg-[#0066FF]/5 text-slate-900 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    conflictChoice === 'keep' ? 'border-[#0066FF]' : 'border-slate-300'
                  }`}
                >
                  {conflictChoice === 'keep' && <div className="w-2 h-2 rounded-full bg-[#0066FF]" />}
                </div>
                <span className="text-sm">Keep existing schedule (Allow overlap)</span>
              </label>

              <label
                onClick={() => setConflictChoice('keep_original')}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  conflictChoice === 'keep_original'
                    ? 'border-[#0066FF] bg-[#0066FF]/5 text-slate-900 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    conflictChoice === 'keep_original' ? 'border-[#0066FF]' : 'border-slate-300'
                  }`}
                >
                  {conflictChoice === 'keep_original' && <div className="w-2 h-2 rounded-full bg-[#0066FF]" />}
                </div>
                <span className="text-sm">Don't change calendar</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConflictModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConflict}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0066FF] hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Early Completion Modal */}
      {showEarlyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="early-completion-settings-modal">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Calendar Tasks Settings</h3>
            <p className="text-xs text-slate-500 mb-4">
              You finished {Math.max(1, Math.floor(secondsRemaining / 60))} minute{Math.floor(secondsRemaining / 60) === 1 ? '' : 's'} early!
            </p>

            <div className="space-y-2.5 mb-6">
              <label
                onClick={() => setEarlyChoice('shorten')}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  earlyChoice === 'shorten'
                    ? 'border-[#0066FF] bg-[#0066FF]/5 text-slate-900 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    earlyChoice === 'shorten' ? 'border-[#0066FF]' : 'border-slate-300'
                  }`}
                >
                  {earlyChoice === 'shorten' && <div className="w-2 h-2 rounded-full bg-[#0066FF]" />}
                </div>
                <span className="text-sm">Shorten timeblock</span>
              </label>

              <label
                onClick={() => setEarlyChoice('pull')}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  earlyChoice === 'pull'
                    ? 'border-[#0066FF] bg-[#0066FF]/5 text-slate-900 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    earlyChoice === 'pull' ? 'border-[#0066FF]' : 'border-slate-300'
                  }`}
                >
                  {earlyChoice === 'pull' && <div className="w-2 h-2 rounded-full bg-[#0066FF]" />}
                </div>
                <span className="text-sm">Pull remaining schedule up</span>
              </label>

              <label
                onClick={() => setEarlyChoice('keep_original')}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  earlyChoice === 'keep_original'
                    ? 'border-[#0066FF] bg-[#0066FF]/5 text-slate-900 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    earlyChoice === 'keep_original' ? 'border-[#0066FF]' : 'border-slate-300'
                  }`}
                >
                  {earlyChoice === 'keep_original' && <div className="w-2 h-2 rounded-full bg-[#0066FF]" />}
                </div>
                <span className="text-sm">Don't change calendar</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowEarlyModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEarly}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0066FF] hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
