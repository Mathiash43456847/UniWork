import React, { useState, useEffect, useRef } from 'react';
import { Lock, ShieldCheck, ArrowRight, KeyRound, UserPlus, Trash2, Check, AlertCircle, Eye, EyeOff, Star, MessageSquare, Search, RefreshCw, Sparkles, HelpCircle, Sliders, RotateCcw, Sun, Moon, Edit3, X, BarChart2 } from 'lucide-react';
import { UNIWORK_FULL_LOGO_BASE64 } from '../assets/logoData';
import uniworkFullLogoUrl from '../assets/iwork-full-logo.png';
import { UniWorkAuraGlow } from './UniWorkAuraGlow';
import { useAuraConfig } from '../lib/auraConfig';
import { AdminChatView } from './AdminChatView';

interface AdminViewProps {
  currentUser: { id: string } | null;
  adminPassword: string;
  onUpdateAdminPassword: (newPassword: string) => void;
  allowedAdminUserIds: string[];
  onAddAdminUserId: (userId: string) => void;
  onRemoveAdminUserId: (userId: string) => void;
  isGuideModeArmed?: boolean;
  onToggleGuideModeArmed?: (armed: boolean) => void;
  themeMode?: 'day' | 'night';
  onToggleThemeMode?: (mode: 'day' | 'night') => void;
  subTab?: 'general' | 'chat' | 'reports';
  onSelectSubTab?: (tab: 'general' | 'chat' | 'reports') => void;
  unreadCount?: number;
  onUnreadCountChange?: (count: number) => void;
  onSetSidebarCollapsed?: (collapsed: boolean) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  adminPassword,
  onUpdateAdminPassword,
  allowedAdminUserIds,
  onAddAdminUserId,
  onRemoveAdminUserId,
  isGuideModeArmed = false,
  onToggleGuideModeArmed,
  themeMode = 'day',
  onToggleThemeMode,
  subTab,
  onSelectSubTab,
  unreadCount = 0,
  onUnreadCountChange,
  onSetSidebarCollapsed,
}) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [inputPin, setInputPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sub-Tab Switcher State (General vs Chat vs Reports)
  const [localSubTab, setLocalSubTab] = useState<'general' | 'chat' | 'reports'>('general');
  const activeSubTab = subTab !== undefined ? subTab : localSubTab;
  const handleSwitchSubTab = (t: 'general' | 'chat' | 'reports') => {
    setLocalSubTab(t);
    if (onSelectSubTab) onSelectSubTab(t);
  };

  // Reported Names State
  const [reportedNamesList, setReportedNamesMap] = useState<Array<{
    reportedUserId: string;
    reportedName: string;
    reportCount: number;
    latestReportId: string;
    latestTimestamp: string;
    reasons: string[];
  }>>([]);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false);
  const [reportsActionToast, setReportsActionToast] = useState<string | null>(null);

  const fetchReportedNames = async () => {
    setIsLoadingReports(true);
    try {
      const res = await fetch('/api/admin/reports');
      const data = await res.json();
      if (data.success && Array.isArray(data.reports)) {
        setReportedNamesMap(data.reports);
      }
    } catch (err) {
      console.warn('Failed to fetch reported names:', err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    if (isUnlocked && activeSubTab === 'reports') {
      fetchReportedNames();
    }
  }, [isUnlocked, activeSubTab]);

  const handleIgnoreReport = async (reportedUserId: string) => {
    try {
      const res = await fetch('/api/admin/reports/ignore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportedUserId }),
      });
      const data = await res.json();
      if (data.success) {
        setReportedNamesMap((prev) => prev.filter((r) => r.reportedUserId !== reportedUserId));
        setReportsActionToast('Report dismissed.');
        setTimeout(() => setReportsActionToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to ignore report:', err);
    }
  };

  const handleClearReportedName = async (reportedUserId: string, currentName: string) => {
    try {
      const res = await fetch('/api/admin/reports/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportedUserId }),
      });
      const data = await res.json();
      if (data.success) {
        setReportedNamesMap((prev) => prev.filter((r) => r.reportedUserId !== reportedUserId));
        setReportsActionToast(`Reported name '${currentName}' reset to '${data.newName}'!`);
        setTimeout(() => setReportsActionToast(null), 4000);
      }
    } catch (err) {
      console.error('Failed to clear reported name:', err);
    }
  };

  // Super Admin Check
  const isSuperAdmin = currentUser?.id === 'usr_g_8cced70b14994d07';

  // Admin Account Names State
  const [adminNamesMap, setAdminNamesMap] = useState<Record<string, string>>({});
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [editingAdminNameInput, setEditingAdminNameInput] = useState<string>('');
  const [newAdminNameInput, setNewAdminNameInput] = useState<string>('');

  const fetchAdminAccounts = async () => {
    try {
      const res = await fetch('/api/admin/accounts');
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        const mapping: Record<string, string> = {};
        data.accounts.forEach((a: any) => {
          mapping[a.id] = a.name;
        });
        setAdminNamesMap(mapping);
      }
    } catch (err) {
      console.warn('Failed to fetch admin accounts:', err);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchAdminAccounts();
    }
  }, [isUnlocked]);

  const handleSaveAdminName = async (id: string, name: string) => {
    if (!isSuperAdmin) return;
    const cleanName = name.trim();
    if (!cleanName) return;

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: cleanName,
          callerUserId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminNamesMap((prev) => ({ ...prev, [id]: cleanName }));
        setEditingAdminId(null);
      }
    } catch (err) {
      console.error('Failed to update admin name:', err);
    }
  };

  // Settings in Unlocked View
  const [newPassword, setNewPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [securityMode, setSecurityMode] = useState<'normal' | 'lockdown'>('lockdown');
  const [isSavingSecurityMode, setIsSavingSecurityMode] = useState<boolean>(false);

  // Load security mode and insights access on mount
  const [insightsAccess, setInsightsAccess] = useState<'all' | 'admin'>('all');
  const [isSavingInsightsAccess, setIsSavingInsightsAccess] = useState<boolean>(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [secRes, insRes] = await Promise.all([
          fetch('/api/admin/settings/security_mode'),
          fetch('/api/admin/settings/insights_access')
        ]);
        const secData = await secRes.json();
        if (secData.success && (secData.value === 'normal' || secData.value === 'lockdown')) {
          setSecurityMode(secData.value);
          if (secData.value === 'normal') {
            setIsUnlocked(true);
          }
        }
        const insData = await insRes.json();
        if (insData.success && (insData.value === 'all' || insData.value === 'admin')) {
          setInsightsAccess(insData.value);
        }
      } catch (err) {
        console.warn('Failed to load admin settings:', err);
      }
    };
    loadSettings();
  }, []);

  const handleUpdateSecurityMode = async (mode: 'normal' | 'lockdown') => {
    setIsSavingSecurityMode(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'security_mode', value: mode }),
      });
      const data = await res.json();
      if (data.success) {
        setSecurityMode(mode);
        if (mode === 'normal') {
          setIsUnlocked(true);
        } else {
          setIsUnlocked(false);
        }
      }
    } catch (err) {
      console.error('Failed to update security mode:', err);
    } finally {
      setIsSavingSecurityMode(false);
    }
  };

  const handleUpdateInsightsAccess = async (mode: 'all' | 'admin') => {
    setIsSavingInsightsAccess(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'insights_access', value: mode }),
      });
      const data = await res.json();
      if (data.success) {
        setInsightsAccess(mode);
      }
    } catch (err) {
      console.error('Failed to update insights access mode:', err);
    } finally {
      setIsSavingInsightsAccess(false);
    }
  };

  const [newUserIdInput, setNewUserIdInput] = useState<string>('');
  const [userIdError, setUserIdError] = useState<string | null>(null);
  const [userIdSuccess, setUserIdSuccess] = useState<string | null>(null);

  // Reviews state in Admin Panel
  const [allReviews, setAllReviews] = useState<Array<{ id: string; userId: string; rating: number; comment: string; createdAt: string }>>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(false);
  const [starFilter, setStarFilter] = useState<number | 'all'>('all');
  const [reviewSearchQuery, setReviewSearchQuery] = useState<string>('');

  // Tour Rainbow Aura Customization Studio state
  const [activeAuraTab, setActiveAuraTab] = useState<'guide' | 'about'>('guide');

  const guideAura = useAuraConfig('guide');
  const aboutAura = useAuraConfig('about');

  const activeAura = activeAuraTab === 'guide' ? guideAura : aboutAura;

  const [localScale, setLocalScale] = useState<number>(75);
  const [localOpacity, setLocalOpacity] = useState<number>(85);
  const [localBlur, setLocalBlur] = useState<number>(80);
  const [localOutline, setLocalOutline] = useState<boolean>(false);
  const [previewBg, setPreviewBg] = useState<'checker' | 'dark' | 'light'>('checker');
  const [saveAuraToast, setSaveAuraToast] = useState<boolean>(false);
  const isEditingAuraRef = useRef<boolean>(false);

  useEffect(() => {
    // Sync state whenever active config or DB values change
    if (!isEditingAuraRef.current) {
      setLocalScale(activeAura.auraScalePercent ?? 75);
      setLocalOpacity(activeAura.opacityPercent ?? 85);
      setLocalBlur(activeAura.blurRadiusPercent ?? 80);
      setLocalOutline(activeAura.showOutline ?? false);
    }
  }, [activeAura.auraScalePercent, activeAura.opacityPercent, activeAura.blurRadiusPercent, activeAura.showOutline, activeAuraTab]);

  const handleAuraTabChange = (tab: 'guide' | 'about') => {
    isEditingAuraRef.current = false;
    setActiveAuraTab(tab);
  };

  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const res = await fetch('/api/reviews');
      const data = await res.json();
      if (data.success && Array.isArray(data.reviews)) {
        setAllReviews(data.reviews);
      }
    } catch (err) {
      console.warn('Failed to fetch admin reviews:', err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchReviews();
    }
  }, [isUnlocked]);

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAllReviews((prev) => prev.filter((r) => r.id !== reviewId));
      }
    } catch (err) {
      console.error('Failed to delete review:', err);
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus hidden input on lock screen
  useEffect(() => {
    if (!isUnlocked && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isUnlocked]);

  const targetLength = Math.max(8, Math.min(12, adminPassword.length || 8));

  // Handle PIN Submission
  const handleVerifyPin = (pinToTest?: string) => {
    const pin = pinToTest !== undefined ? pinToTest : inputPin;
    if (pin === adminPassword) {
      setIsUnlocked(true);
      setErrorMsg(null);
      setInputPin('');
    } else {
      setErrorMsg('Incorrect password. Please try again.');
      setInputPin('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, targetLength);
    setInputPin(val);
    setErrorMsg(null);

    // Auto submit when length matches target
    if (val.length === targetLength) {
      handleVerifyPin(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerifyPin();
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!/^\d+$/.test(newPassword)) {
      setPasswordError('Password must contain digits only.');
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 12) {
      setPasswordError('Password length must be between 8 and 12 numbers.');
      return;
    }

    onUpdateAdminPassword(newPassword);
    setPasswordSuccess('Admin password updated successfully!');
    setNewPassword('');
  };

  const handleAddUserIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserIdError(null);
    setUserIdSuccess(null);

    const cleanId = newUserIdInput.trim();
    if (!cleanId) {
      setUserIdError('Please enter a valid User ID.');
      return;
    }
    if (allowedAdminUserIds.includes(cleanId)) {
      setUserIdError('This User ID already has admin access.');
      return;
    }

    onAddAdminUserId(cleanId);
    if (isSuperAdmin && newAdminNameInput.trim()) {
      handleSaveAdminName(cleanId, newAdminNameInput.trim());
      setNewAdminNameInput('');
    }
    setUserIdSuccess(`User ID ${cleanId} added to admin access list.`);
    setNewUserIdInput('');
  };

  const logoSrc = UNIWORK_FULL_LOGO_BASE64 || uniworkFullLogoUrl;

  // Render Lock Screen if not unlocked
  if (!isUnlocked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-[#070A11] p-6 select-none" id="admin-lock-screen">
        <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 max-w-sm w-full p-8 text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
          
          {/* Lock Icon Header */}
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/50 flex items-center justify-center text-[#0066FF] dark:text-[#60A5FA] shadow-xs mb-4">
            <Lock className="w-8 h-8 stroke-[2.2px]" />
          </div>

          {/* Uniwork Light Logo */}
          <div className="mb-6 flex justify-center">
            <img
              src={logoSrc}
              alt="Uniwork"
              className="h-8 w-auto object-contain pointer-events-none select-none"
            />
          </div>

          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-6">
            Enter Admin Password
          </p>

          {/* Hidden HTML Input capturing typing */}
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            value={inputPin}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="sr-only"
            maxLength={targetLength}
            autoFocus
          />

          {/* Visual Dashes Slot Display */}
          <div
            onClick={() => inputRef.current?.focus()}
            className="flex items-center justify-center gap-2 mb-6 cursor-pointer group"
          >
            {Array.from({ length: targetLength }).map((_, idx) => {
              const char = inputPin[idx];
              const isFilled = char !== undefined;
              return (
                <div key={idx} className="flex flex-col items-center">
                  <div className="h-6 flex items-center justify-center text-lg font-bold text-slate-900 dark:text-slate-100 min-w-[14px]">
                    {isFilled ? '•' : ''}
                  </div>
                  <div
                    className={`h-0.5 w-6 rounded-full transition-all ${
                      isFilled
                        ? 'bg-[#0066FF] shadow-xs'
                        : idx === inputPin.length
                        ? 'bg-blue-400 animate-pulse'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/50 px-3 py-1.5 rounded-lg mb-4 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Arrow Submit Button */}
          <button
            type="button"
            onClick={() => handleVerifyPin()}
            disabled={inputPin.length === 0}
            className="w-12 h-12 rounded-2xl bg-[#0066FF] hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Unlock"
            id="admin-unlock-arrow-btn"
          >
            <ArrowRight className="w-5 h-5 stroke-[2.5px]" />
          </button>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-6">
            Authorized Personnel Only
          </p>
        </div>
      </div>
    );
  }

  // Render Unlocked Admin Control Panel
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#070A11] overflow-hidden" id="admin-view">
      {/* Top Admin Sub-Tab Bar */}
      <div className="bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 px-8 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSwitchSubTab('general')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'general'
                ? 'bg-[#0066FF] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            General Controls
          </button>
          <button
            type="button"
            onClick={() => handleSwitchSubTab('chat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'chat'
                ? 'bg-[#0066FF] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Admin Chat</span>
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white font-mono font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleSwitchSubTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'reports'
                ? 'bg-[#0066FF] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Reported Names</span>
            {reportedNamesList.length > 0 && (
              <span className="bg-rose-500 text-white font-mono font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                {reportedNamesList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeSubTab === 'reports' ? (
        /* Reported Names Management View */
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl w-full mx-auto space-y-6">
          {reportsActionToast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 stroke-[2.5px]" />
              <span>{reportsActionToast}</span>
            </div>
          )}

          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <span>Reported Student Names</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Review student display names reported for inappropriate language. Press <strong>Clear Name</strong> to automatically convert them to a clean, unique name like <code>student_1</code>.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchReportedNames}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Refresh reports"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingReports ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {reportedNamesList.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500">
                <ShieldCheck className="w-12 h-12 mb-3 text-emerald-500/60" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No Pending Name Reports
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
                  All student display names in UniWork are currently clean and compliant!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {reportedNamesList.map((item) => (
                  <div key={item.reportedUserId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white font-mono bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-lg border border-rose-200/60 dark:border-rose-900/50">
                          "{item.reportedName}"
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-400 dark:text-slate-500">
                          ({item.reportedUserId})
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-0.5">
                        <span className="font-semibold text-rose-600 dark:text-rose-400">{item.reportCount} report{item.reportCount > 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>{item.reasons.join(', ')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleIgnoreReport(item.reportedUserId)}
                        className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                      >
                        Ignore
                      </button>

                      <button
                        type="button"
                        onClick={() => handleClearReportedName(item.reportedUserId, item.reportedName)}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear Name</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeSubTab === 'chat' ? (
        <div className="flex-1 flex overflow-hidden">
          <AdminChatView
            currentUser={currentUser}
            allowedAdminUserIds={allowedAdminUserIds}
            themeMode={themeMode}
            onUnreadCountChange={onUnreadCountChange}
            onOpenGeneral={() => handleSwitchSubTab('general')}
            onSetSidebarCollapsed={onSetSidebarCollapsed}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl w-full mx-auto space-y-8">
        
        {/* Interactive Guide System Authoring Card */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-800/50 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                <Sparkles className="w-5 h-5 stroke-[2.2px]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">UniWork Onboarding Guide System</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                    isGuideModeArmed 
                      ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300' 
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {isGuideModeArmed ? 'Armed (Press Shift+Tab+Q)' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure interactive walkthroughs with the signature UniWork rainbow aura glow for new users.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleGuideModeArmed && onToggleGuideModeArmed(!isGuideModeArmed)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 shadow-2xs ${
                isGuideModeArmed
                  ? 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-cyan-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGuideModeArmed ? 'Edit Guide Mode Enabled' : 'Enable Edit Guide Mode'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>How Guide Authoring Works:</span>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1">
              <li>Toggle <strong>"Enable Edit Guide Mode"</strong> above to arm the system (you will remain in normal mode).</li>
              <li>Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200 shadow-2xs">Shift + Tab + Q</kbd> anywhere in UniWork to officially turn Authoring Mode ON or OFF.</li>
              <li>Hover and click any button, icon, or tab across UniWork to preview the rainbow aura glow and attach explanation text.</li>
              <li>Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200 shadow-2xs">Shift + Tab + Q</kbd> again when finished to save and turn off Authoring Mode.</li>
            </ol>
          </div>

          {/* Tour Rainbow Aura Customization Studio & Live Preview */}
          <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-600 dark:text-cyan-400 stroke-[2.2px]" />
                  <span>UniWork Rainbow Aura Customization Studio</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Adjust and preview separate, independent spectrum configurations for the interactive onboarding Guide and the About Page CTA button.
                </p>
              </div>

              {/* Canvas Background Tester */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs shrink-0 self-start sm:self-auto border border-slate-200/60 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPreviewBg('checker')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    previewBg === 'checker' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Checkerboard
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewBg('dark')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    previewBg === 'dark' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Dark Slate
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewBg('light')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    previewBg === 'light' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Light
                </button>
              </div>
            </div>

            {/* Segmented Selector for Guide vs About Aura */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 gap-6 text-sm font-bold">
              <button
                type="button"
                onClick={() => handleAuraTabChange('guide')}
                className={`pb-2.5 relative transition-colors cursor-pointer ${
                  activeAuraTab === 'guide'
                    ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                Onboarding Guide Aura Config
              </button>
              <button
                type="button"
                onClick={() => handleAuraTabChange('about')}
                className={`pb-2.5 relative transition-colors cursor-pointer ${
                  activeAuraTab === 'about'
                    ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                About Page CTA Aura Config
              </button>
            </div>

            {/* Interactive Live Preview Stage */}
            <div
              className={`relative h-48 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center transition-colors ${
                previewBg === 'dark'
                  ? 'bg-slate-950 border-slate-800'
                  : previewBg === 'light'
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] bg-slate-100/80 border-slate-200'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 absolute top-3 left-4 select-none pointer-events-none">
                Live Preview Sandbox ({activeAuraTab === 'guide' ? 'Walkthrough Guide Aura' : 'About Page CTA Aura'})
              </div>

              {/* Sample Button with Aura Glowing Behind It */}
              <div className="relative group cursor-pointer">
                <UniWorkAuraGlow active={true} intensity="button" configId={activeAuraTab} />

                <button
                  type="button"
                  className="relative z-10 px-8 py-3.5 rounded-full bg-white text-slate-950 font-bold text-sm shadow-xl hover:scale-102 transition-transform flex items-center gap-2.5 border border-slate-200/80 cursor-pointer"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5px] text-slate-900" />
                </button>
              </div>
            </div>

            {/* Aura Sliders Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
              {/* 1. Aura Scale / Size Spread */}
              <div>
                <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span>Aura Spread / Size Scale</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{localScale}%</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={140}
                  step={5}
                  value={localScale}
                  onMouseDown={() => { isEditingAuraRef.current = true; }}
                  onTouchStart={() => { isEditingAuraRef.current = true; }}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLocalScale(val);
                    activeAura.applyLocalAuraConfig({
                      auraScalePercent: val,
                      opacityPercent: localOpacity,
                      blurRadiusPercent: localBlur,
                      showOutline: localOutline,
                      placement: 'behind',
                    });
                  }}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                  <span>Compact (40%)</span>
                  <span>Google AI (75%)</span>
                  <span>Large (140%)</span>
                </div>
              </div>

              {/* 2. Boldness / Opacity */}
              <div>
                <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span>Intensity / Boldness (Opacity)</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{localOpacity}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  step={5}
                  value={localOpacity}
                  onMouseDown={() => { isEditingAuraRef.current = true; }}
                  onTouchStart={() => { isEditingAuraRef.current = true; }}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLocalOpacity(val);
                    activeAura.applyLocalAuraConfig({
                      auraScalePercent: localScale,
                      opacityPercent: val,
                      blurRadiusPercent: localBlur,
                      showOutline: localOutline,
                      placement: 'behind',
                    });
                  }}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                  <span>Faint (20%)</span>
                  <span>Balanced (85%)</span>
                  <span>Bold (100%)</span>
                </div>
              </div>

              {/* 3. Blur Softness */}
              <div>
                <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span>Blur Radius / Softness</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{localBlur}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={150}
                  step={5}
                  value={localBlur}
                  onMouseDown={() => { isEditingAuraRef.current = true; }}
                  onTouchStart={() => { isEditingAuraRef.current = true; }}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLocalBlur(val);
                    activeAura.applyLocalAuraConfig({
                      auraScalePercent: localScale,
                      opacityPercent: localOpacity,
                      blurRadiusPercent: val,
                      showOutline: localOutline,
                      placement: 'behind',
                    });
                  }}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                  <span>Crisp Edge</span>
                  <span>Soft Bloom</span>
                </div>
              </div>

              {/* 4. Button Edge Outline Ring Toggle */}
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Button Edge Outline Ring</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Outer crisp glow highlight rim</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !localOutline;
                    setLocalOutline(nextVal);
                    activeAura.applyLocalAuraConfig({
                      auraScalePercent: localScale,
                      opacityPercent: localOpacity,
                      blurRadiusPercent: localBlur,
                      showOutline: nextVal,
                      placement: 'behind',
                    });
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    localOutline ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                      localOutline ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setLocalScale(75);
                  setLocalOpacity(85);
                  setLocalBlur(80);
                  setLocalOutline(false);
                  activeAura.applyLocalAuraConfig({
                    auraScalePercent: 75,
                    opacityPercent: 85,
                    blurRadiusPercent: 80,
                    showOutline: false,
                    placement: 'behind',
                  });
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Google Style Baseline</span>
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {saveAuraToast && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-fade-in">
                    <Check className="w-4 h-4" />
                    <span>Saved to Neon Database!</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    isEditingAuraRef.current = false;
                    const ok = await activeAura.updateAuraSettings({
                      auraScalePercent: localScale,
                      opacityPercent: localOpacity,
                      blurRadiusPercent: localBlur,
                      showOutline: localOutline,
                      placement: 'behind',
                    });
                    if (ok) {
                      setSaveAuraToast(true);
                      setTimeout(() => setSaveAuraToast(false), 3000);
                    }
                  }}
                  disabled={activeAura.isSaving}
                  className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-extrabold shadow-md shadow-cyan-600/20 transition cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[2.5px]" />
                  <span>{activeAura.isSaving ? 'Saving to Database...' : 'Save Aura Settings to Database'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Access Security Mode Switcher Card */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <ShieldCheck className="w-5 h-5 text-[#0066FF] dark:text-[#60A5FA]" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Admin Access Security Mode</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Configure whether accessing the Admin Panel requires password entry or is unlocked by default for authorized workspace accounts.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            {/* Normal Mode Selection */}
            <button
              type="button"
              onClick={() => handleUpdateSecurityMode('normal')}
              disabled={isSavingSecurityMode}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer select-none group relative overflow-hidden ${
                securityMode === 'normal'
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/80 shadow-2xs'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-extrabold uppercase tracking-wider ${
                    securityMode === 'normal' ? 'text-[#0066FF] dark:text-[#60A5FA]' : 'text-slate-400'
                  }`}>
                    Normal Mode
                  </span>
                  {securityMode === 'normal' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">No Password Required</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  Clicking the Admin button in the sidebar enters directly without prompting for a password PIN. Fully unrestricted.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#0066FF] dark:text-[#60A5FA]">
                <span>Active Status</span>
                <Check className={`w-3.5 h-3.5 transition-transform duration-200 ${securityMode === 'normal' ? 'scale-100' : 'scale-0'}`} />
              </div>
            </button>

            {/* Lockdown Mode Selection */}
            <button
              type="button"
              onClick={() => handleUpdateSecurityMode('lockdown')}
              disabled={isSavingSecurityMode}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer select-none group relative overflow-hidden ${
                securityMode === 'lockdown'
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/80 shadow-2xs'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-extrabold uppercase tracking-wider ${
                    securityMode === 'lockdown' ? 'text-[#0066FF] dark:text-[#60A5FA]' : 'text-slate-400'
                  }`}>
                    Lockdown Mode
                  </span>
                  {securityMode === 'lockdown' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">Password Prompts Enabled</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  Entering the Admin panel forces a secure PIN verification screen. Maximum hardening for production setups.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#0066FF] dark:text-[#60A5FA]">
                <span>Active Status</span>
                <Check className={`w-3.5 h-3.5 transition-transform duration-200 ${securityMode === 'lockdown' ? 'scale-100' : 'scale-0'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Insights Feature Access Switcher Card */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <BarChart2 className="w-5 h-5 text-[#0066FF] dark:text-[#60A5FA]" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Insights Tab Access</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Choose whether the Study Insights page is available to all users or locked behind admin access.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            {/* Public to All Users */}
            <button
              type="button"
              onClick={() => handleUpdateInsightsAccess('all')}
              disabled={isSavingInsightsAccess}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer select-none group relative overflow-hidden ${
                insightsAccess === 'all'
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/80 shadow-2xs'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-extrabold uppercase tracking-wider ${
                    insightsAccess === 'all' ? 'text-[#0066FF] dark:text-[#60A5FA]' : 'text-slate-400'
                  }`}>
                    Public
                  </span>
                  {insightsAccess === 'all' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">All Users</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  The Insights tab is visible to every workspace user in their navigation.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#0066FF] dark:text-[#60A5FA]">
                <span>Active Status</span>
                <Check className={`w-3.5 h-3.5 transition-transform duration-200 ${insightsAccess === 'all' ? 'scale-100' : 'scale-0'}`} />
              </div>
            </button>

            {/* Admin Only / Locked */}
            <button
              type="button"
              onClick={() => handleUpdateInsightsAccess('admin')}
              disabled={isSavingInsightsAccess}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer select-none group relative overflow-hidden ${
                insightsAccess === 'admin'
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/80 shadow-2xs'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-extrabold uppercase tracking-wider ${
                    insightsAccess === 'admin' ? 'text-[#0066FF] dark:text-[#60A5FA]' : 'text-slate-400'
                  }`}>
                    Admin Only
                  </span>
                  {insightsAccess === 'admin' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">Locked Behind Admin</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  The Insights tab is hidden from regular users and only visible to authorized administrators.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#0066FF] dark:text-[#60A5FA]">
                <span>Active Status</span>
                <Check className={`w-3.5 h-3.5 transition-transform duration-200 ${insightsAccess === 'admin' ? 'scale-100' : 'scale-0'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Security Password Section */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <KeyRound className="w-5 h-5 text-[#0066FF] dark:text-[#60A5FA]" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Admin Master Password</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Configure the 8 to 12 digit numeric PIN required to unlock the Admin Panel.
          </p>

          <form onSubmit={handleChangePasswordSubmit} className="max-w-md space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                New Admin Password (8-12 digits)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 8-12 digits"
                  maxLength={12}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:bg-white dark:focus:bg-slate-800 focus:border-[#0066FF] dark:focus:border-blue-500 focus:outline-hidden transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passwordError && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/50 p-2.5 rounded-lg">
                {passwordError}
              </p>
            )}

            {passwordSuccess && (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/50 p-2.5 rounded-lg flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>{passwordSuccess}</span>
              </p>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0066FF] hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Update Admin Password
            </button>
          </form>
        </div>

        {/* User Authorizations Section */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <UserPlus className="w-5 h-5 text-[#0066FF] dark:text-[#60A5FA]" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Authorized Admin Accounts</h2>
            </div>
            {isSuperAdmin ? (
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 px-2.5 py-0.5 rounded-full w-fit">
                Super Admin: Naming Privileges Active
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                Only Super Admin can assign or edit admin names
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Only users with matching account IDs will see the Admin tab in their sidebar.
          </p>

          {/* List of Allowed Accounts */}
          <div className="space-y-2 mb-6">
            {allowedAdminUserIds.map((id) => {
              const isCurrent = currentUser?.id === id;
              const isPrimary = id === 'usr_g_8cced70b14994d07';
              const displayName = adminNamesMap[id] || (isPrimary ? 'Super Admin' : 'Admin');
              const isEditing = editingAdminId === id;

              return (
                <div
                  key={id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap">
                    {/* Admin Name & Edit Mode */}
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 min-w-[200px]">
                        <input
                          type="text"
                          value={editingAdminNameInput}
                          onChange={(e) => setEditingAdminNameInput(e.target.value)}
                          placeholder="Admin Name"
                          className="px-2.5 py-1 rounded-lg border border-[#0066FF] bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveAdminName(id, editingAdminNameInput)}
                          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer shrink-0"
                          title="Save Name"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAdminId(null)}
                          className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition cursor-pointer shrink-0"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg shadow-2xs">
                          {displayName}
                        </span>

                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAdminId(id);
                              setEditingAdminNameInput(displayName);
                            }}
                            className="p-1 text-slate-400 hover:text-[#0066FF] dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                            title="Edit Admin Name (Super Admin only)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold truncate">
                      {id}
                    </span>

                    {isPrimary && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-[#0066FF] dark:text-blue-300 px-2 py-0.5 rounded-md shrink-0">
                        Primary Super Admin
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md shrink-0">
                        Your Current Account
                      </span>
                    )}
                  </div>

                  {!isPrimary && (
                    <button
                      type="button"
                      onClick={() => onRemoveAdminUserId(id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer shrink-0 self-end sm:self-auto"
                      title="Remove Admin Access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add New Admin ID Form */}
          <form onSubmit={handleAddUserIdSubmit} className="max-w-lg space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Add Authorized User ID {isSuperAdmin ? '& Assign Name' : ''}
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={newUserIdInput}
                onChange={(e) => setNewUserIdInput(e.target.value)}
                placeholder="e.g. usr_g_1234567890"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:bg-white dark:focus:bg-slate-800 focus:border-[#0066FF] dark:focus:border-blue-500 focus:outline-hidden transition font-mono"
              />
              {isSuperAdmin && (
                <input
                  type="text"
                  value={newAdminNameInput}
                  onChange={(e) => setNewAdminNameInput(e.target.value)}
                  placeholder="Admin Name (e.g. Alice)"
                  className="w-full sm:w-44 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:bg-white dark:focus:bg-slate-800 focus:border-[#0066FF] dark:focus:border-blue-500 focus:outline-hidden transition font-sans"
                />
              )}
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#0066FF] hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
              >
                Add User ID
              </button>
            </div>

            {userIdError && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/50 p-2.5 rounded-lg">
                {userIdError}
              </p>
            )}

            {userIdSuccess && (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/50 p-2.5 rounded-lg flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>{userIdSuccess}</span>
              </p>
            )}
          </form>
        </div>

        {/* User Reviews & Feedback Section */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">User Reviews & Star Ratings</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live user feedback submitted from Settings</p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchReviews}
              disabled={isLoadingReviews}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReviews ? 'animate-spin' : ''}`} />
              <span>Refresh Reviews</span>
            </button>
          </div>

          {/* Review Analytics Summary Bar */}
          {allReviews.length > 0 && (() => {
            const total = allReviews.length;
            const avg = (allReviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{avg}</div>
                  <div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= Math.round(Number(avg)) ? 'fill-amber-400 text-amber-500' : 'text-slate-300 dark:text-slate-700 fill-slate-100 dark:fill-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Average Rating</div>
                  </div>
                </div>

                <div className="flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-3 sm:pt-0 sm:pl-4">
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-200">{total}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Reviews Submitted</div>
                </div>

                <div className="flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-3 sm:pt-0 sm:pl-4">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Rating Filters</div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setStarFilter('all')}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        starFilter === 'all'
                          ? 'bg-[#0066FF] text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      All
                    </button>
                    {[5, 4, 3, 2, 1].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStarFilter(st)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-0.5 ${
                          starFilter === st
                            ? 'bg-amber-500 text-white'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{st}</span>
                        <Star className="w-3 h-3 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={reviewSearchQuery}
              onChange={(e) => setReviewSearchQuery(e.target.value)}
              placeholder="Search reviews by User ID or text..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:bg-white dark:focus:bg-slate-800 focus:border-[#0066FF] dark:focus:border-blue-500 focus:outline-hidden transition"
            />
          </div>

          {/* List of Reviews */}
          {(() => {
            const filtered = allReviews.filter((r) => {
              if (starFilter !== 'all' && r.rating !== starFilter) return false;
              if (reviewSearchQuery.trim()) {
                const q = reviewSearchQuery.toLowerCase();
                return r.userId.toLowerCase().includes(q) || r.comment.toLowerCase().includes(q);
              }
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                  <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No user reviews found</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Reviews submitted from the Settings tab will appear here automatically.</p>
                </div>
              );
            }

            return (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {filtered.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/80 transition space-y-2 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-md">
                          {rev.userId}
                        </span>
                        <div className="flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 px-2 py-0.5 rounded-md">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s <= rev.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300 dark:text-slate-700 fill-slate-100 dark:fill-slate-800'
                              }`}
                            />
                          ))}
                          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 ml-1">{rev.rating}/5</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {new Date(rev.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(rev.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                          title="Delete Review"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans pl-1">{rev.comment}</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

      </div>
      )}
    </div>
  );
};

export default AdminView;
