/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Award, AlertTriangle, Check, ShieldAlert } from 'lucide-react';

export interface PeerProfile {
  id: string;
  name: string;
  avatarUrl: string;
  points: number;
  status: 'studying' | 'break' | 'lunch';
  timeLeftMinutes: number;
  timeLeftSeconds: number;
  studyDurationFormatted: string;
  isFixedTest?: boolean;
}

interface StudentProfileViewProps {
  peer: PeerProfile;
  currentUserId?: string;
  onBack: () => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  peer,
  currentUserId = 'usr-mathias-cheow-primary',
  onBack,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Parse total planned duration in seconds from peer.studyDurationFormatted (e.g. "45 min" or "1h 15m")
  const plannedDurationSec = React.useMemo(() => {
    if (!peer.studyDurationFormatted) return 25 * 60;
    const str = peer.studyDurationFormatted.toLowerCase();
    let totalSec = 0;
    const hrsMatch = str.match(/(\d+)\s*h/);
    const minsMatch = str.match(/(\d+)\s*m/);
    if (hrsMatch) totalSec += parseInt(hrsMatch[1], 10) * 3600;
    if (minsMatch) totalSec += parseInt(minsMatch[1], 10) * 60;
    if (totalSec === 0) {
      const numOnly = str.match(/(\d+)/);
      if (numOnly) totalSec = parseInt(numOnly[1], 10) * 60;
    }
    return totalSec > 0 ? totalSec : 25 * 60;
  }, [peer.studyDurationFormatted]);

  // Live ticking timer for time remaining & overtime tracking
  const [liveSecondsLeft, setLiveSecondsLeft] = useState<number>(() => {
    return peer.timeLeftSeconds > 0 ? peer.timeLeftSeconds : 0;
  });
  const [overtimeSeconds, setOvertimeSeconds] = useState<number>(() => {
    return peer.timeLeftSeconds <= 0 ? Math.abs(peer.timeLeftSeconds) : 0;
  });
  const [isOvertime, setIsOvertime] = useState<boolean>(peer.timeLeftSeconds <= 0);

  useEffect(() => {
    if (peer.timeLeftSeconds > 0) {
      setLiveSecondsLeft(peer.timeLeftSeconds);
      setOvertimeSeconds(0);
      setIsOvertime(false);
    } else {
      setLiveSecondsLeft(0);
      setOvertimeSeconds(Math.abs(peer.timeLeftSeconds));
      setIsOvertime(true);
    }
  }, [peer.timeLeftSeconds, peer.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isOvertime) {
        setOvertimeSeconds((prev) => prev + 1);
      } else {
        setLiveSecondsLeft((prev) => {
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
    return () => clearInterval(timer);
  }, [isOvertime]);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const handleCheer = (emoji: string) => {
    setToastMessage(`You cheered ${peer.name.split(' ')[0]} with a ${emoji}!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReport(true);

    try {
      await fetch('/api/reports/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: peer.id,
          reportedName: peer.name,
          reporterUserId: currentUserId,
          reason: reportReason.trim() || 'Inappropriate display name',
        }),
      });
      setReportSubmitted(true);
      setTimeout(() => {
        setIsReportModalOpen(false);
        setReportSubmitted(false);
        setReportReason('');
      }, 1800);
    } catch {
      setIsReportModalOpen(false);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Formatted String Calculations
  const formattedMins = Math.floor(liveSecondsLeft / 60);

  const otMins = Math.floor(overtimeSeconds / 60);
  const otSecs = overtimeSeconds % 60;

  const totalElapsedSeconds = plannedDurationSec - liveSecondsLeft + overtimeSeconds;

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

  const standardPct = Math.min(100, Math.max(0, ((plannedDurationSec - liveSecondsLeft) / plannedDurationSec) * 100));

  return (
    <div
      className="flex-1 flex flex-col h-full bg-white dark:bg-[#070A11] text-slate-800 dark:text-[#F4F4F5] overflow-y-auto select-none font-sans transition-colors duration-200"
      id="uniwork-student-profile-view"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#0066FF] text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-xl flex items-center gap-2 animate-bounce">
          <Award className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP BAR: Return Button & Report Name Header */}
      <div className="h-16 px-6 md:px-10 flex items-center justify-between flex-shrink-0 bg-white dark:bg-[#070A11] border-b border-slate-200/80 dark:border-slate-800/80 select-none">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#0066FF] dark:hover:text-[#60A5FA] transition cursor-pointer px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Focus Room</span>
        </button>

        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition cursor-pointer px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/50"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Report Name</span>
        </button>
      </div>

      {/* MAIN PROFILE BODY */}
      <div className="max-w-4xl w-full mx-auto px-6 py-10 flex-1 flex flex-col justify-center gap-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Left Side: Avatar Profile, Name below Avatar, Points below Name */}
          <div className="md:col-span-4 flex flex-col items-center text-center">
            {/* Profile Pic */}
            <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden bg-white dark:bg-slate-900 p-1 border-2 border-slate-200 dark:border-slate-800 shadow-md mb-3">
              <img
                src={peer.avatarUrl}
                alt={peer.name}
                className="w-full h-full object-cover rounded-full"
              />
            </div>

            {/* Name below Profile Pic */}
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {peer.name}
            </h1>

            {/* Points below Name */}
            <span className="text-xs md:text-sm font-semibold font-mono text-slate-500 dark:text-slate-400 mt-1">
              {peer.points} pts
            </span>
          </div>

          {/* Right Side: Exact Focus Room Timer Layout (Item 1 in design screenshot) */}
          <div className="md:col-span-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch lg:items-center">
              {/* Left Column: Clock (5 cols - Monospace Stopwatch, No pause button) */}
              <div className="lg:col-span-5 flex flex-col justify-center pr-0 lg:pr-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                    Focus Timer
                  </span>
                  <div className="flex items-center gap-3.5">
                    <span className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-bold tracking-tight font-mono tabular-nums text-slate-900 dark:text-white select-all leading-none">
                      {formatTime(totalElapsedSeconds)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Dedicated Time Left / Task Card (7 cols, No action buttons) */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 md:p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate min-w-0 flex-1 pr-2">
                    Task: Active Focus Session
                  </span>
                  {isOvertime ? (
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 flex-shrink-0 whitespace-nowrap animate-pulse">
                      +{otMins}:{otSecs < 10 ? '0' : ''}{otSecs} overtime
                    </span>
                  ) : (
                    <span className="font-mono font-bold text-[#0066FF] dark:text-[#60A5FA] flex-shrink-0 whitespace-nowrap">
                      {formattedMins}m left
                    </span>
                  )}
                </div>

                {/* Progress Bar Track - Red in Overtime */}
                <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden relative">
                  {isOvertime ? (
                    <div className="h-full w-full bg-rose-600 dark:bg-rose-500 rounded-full transition-all duration-300 relative shadow-sm" />
                  ) : (
                    <div
                      className="h-full bg-gradient-to-r from-[#0066FF] via-blue-500 to-[#38BDF8] rounded-full transition-all duration-300 relative"
                      style={{ width: `${standardPct}%` }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* EMOJI CHEER SECTION - Big, High Visibility, Easy to See & Tap (Item 2 in design screenshot) */}
        <div className="w-full max-w-xl mx-auto text-center pt-2">
          <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-4">
              Send Emoji Cheer to {peer.name.split(' ')[0]}
            </span>

            <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
              {[
                { emoji: '👍', label: 'Thumbs Up' },
                { emoji: '🔥', label: 'Fire' },
                { emoji: '💪', label: 'Flex' },
                { emoji: '🎉', label: 'Party' },
                { emoji: '⭐', label: 'Star' },
              ].map((item) => (
                <button
                  key={item.emoji}
                  type="button"
                  onClick={() => handleCheer(item.emoji)}
                  title={`Send ${item.label}`}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200/90 dark:border-slate-700/80 flex items-center justify-center text-3xl sm:text-4xl hover:scale-115 active:scale-90 hover:border-[#0066FF] dark:hover:border-[#60A5FA] hover:shadow-md transition-all duration-200 cursor-pointer shadow-2xs"
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* REPORT NAME MODAL */}
      {isReportModalOpen && (
        <div
          onClick={() => setIsReportModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative"
          >
            {reportSubmitted ? (
              <div className="py-6 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <Check className="w-6 h-6 stroke-[2.5px]" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Report Submitted</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Thank you for keeping UniWork safe. The report has been sent to UniWork Admin.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-4 text-left">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Report Student Name</h3>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Report display name <strong className="text-slate-800 dark:text-slate-200">"{peer.name}"</strong> to UniWork Admin for inappropriate or offensive language.
                </p>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="e.g. Offensive or inappropriate display name"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0066FF]"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
