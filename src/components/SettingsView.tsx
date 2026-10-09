/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sliders, Save, Check, RefreshCw, AppWindow, CalendarRange, User as UserIcon, LogOut, ShieldCheck, Lock, LogIn, Tags, ChevronDown, ChevronUp, GripVertical, ArrowUp, ArrowDown, Trash2, AlertTriangle, Info, Star, MessageSquare, Send, Sun, Moon, Smartphone, Tablet, Laptop, Cpu, Sparkles, Shuffle, Search } from 'lucide-react';
import { User, Tag, ActiveTab } from '../types';
import { UNIWORK_FULL_LOGO_BASE64 } from '../assets/logoData';
import uniworkFullLogoUrl from '../assets/iwork-full-logo.png';

interface SettingsViewProps {
  calendarGap: number;
  onSaveCalendarGap: (gap: number) => Promise<void>;
  snapInterval: number;
  onSaveSnapInterval: (interval: number) => Promise<void>;
  recurrenceBehavior: 'ask' | 'one' | 'all';
  onSaveRecurrenceBehavior: (behavior: 'ask' | 'one' | 'all') => Promise<void>;
  currentUser?: User | null;
  onSignOut?: () => void;
  onOpenSignIn?: () => void;
  tags: Tag[];
  onSaveTagsOrder: (orderedTags: Tag[]) => void;
  onDeleteAccountAndData?: () => Promise<void>;
  setActiveTab?: (tab: ActiveTab) => void;
  onViewAboutPage?: () => void;
  themeMode?: 'day' | 'night';
  themePreference?: 'auto' | 'day' | 'night';
  onSetThemePreference?: (pref: 'auto' | 'day' | 'night') => void;
  deviceType?: 'Laptop' | 'Tablet' | 'Phone';
  screenSize?: { width: number; height: number };
}

export default function SettingsView({
  calendarGap,
  onSaveCalendarGap,
  snapInterval,
  onSaveSnapInterval,
  recurrenceBehavior,
  onSaveRecurrenceBehavior,
  currentUser,
  onSignOut,
  onOpenSignIn,
  tags,
  onSaveTagsOrder,
  onDeleteAccountAndData,
  setActiveTab,
  onViewAboutPage,
  themeMode = 'day',
  themePreference = 'auto',
  onSetThemePreference,
  deviceType = 'Laptop',
  screenSize = { width: 1440, height: 900 },
}: SettingsViewProps) {

  const [gapValue, setGapValue] = useState<number>(calendarGap);
  const [snapValue, setSnapValue] = useState<number>(snapInterval);
  const [behaviorValue, setBehaviorValue] = useState<'ask' | 'one' | 'all'>(recurrenceBehavior);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Reorder default tags priority accordion states
  const [isTagsAccordionOpen, setIsTagsAccordionOpen] = useState(false);
  const [localOrderedTags, setLocalOrderedTags] = useState<Tag[]>(tags);

  // Review & Rating States
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [userReviews, setUserReviews] = useState<Array<{ id: string; userId: string; rating: number; comment: string; createdAt: string }>>([]);

  const fetchUserReviews = async () => {
    try {
      const res = await fetch('/api/reviews');
      const data = await res.json();
      if (data.success && Array.isArray(data.reviews)) {
        const currentUserId = currentUser?.id || 'usr-mathias-cheow-primary';
        const userRevs = data.reviews.filter((r: any) => r.userId === currentUserId);
        setUserReviews(userRevs);
      }
    } catch (err) {
      console.warn('Failed to fetch user reviews:', err);
    }
  };

  // Focus Room Avatar & Display Name Customization
  const [displayName, setDisplayName] = useState<string>(() => {
    return localStorage.getItem('uniwork_user_name') || 'Student';
  });
  const [nameSaveSuccess, setNameSaveSuccess] = useState<boolean>(false);

  const [avatarData, setAvatarData] = useState<{ avatarUrl: string; style: string; seed: string }>({
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=student&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf',
    style: 'adventurer',
    seed: 'student',
  });
  const [avatarSearchQuery, setAvatarSearchQuery] = useState<string>('');
  const [selectedAvatarStyle, setSelectedAvatarStyle] = useState<string>('adventurer');
  const [avatarSaveSuccess, setAvatarSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    const currentUserId = currentUser?.id || 'usr-mathias-cheow-primary';
    fetch(`/api/user/avatar?userId=${encodeURIComponent(currentUserId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.avatarUrl) {
          setAvatarData({ avatarUrl: d.avatarUrl, style: d.style || 'adventurer', seed: d.seed || 'student' });
        }
      })
      .catch(() => {});
  }, [currentUser]);

  const handleSaveDisplayName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim() || 'Student';
    setDisplayName(cleanName);
    localStorage.setItem('uniwork_user_name', cleanName);
    setNameSaveSuccess(true);
    setTimeout(() => setNameSaveSuccess(false), 2500);
  };

  const handleSelectAvatar = async (style: string, seed: string) => {
    const avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    setAvatarData({ avatarUrl, style, seed });
    setAvatarSaveSuccess(true);
    setTimeout(() => setAvatarSaveSuccess(false), 2500);

    const currentUserId = currentUser?.id || 'usr-mathias-cheow-primary';
    try {
      await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, avatarUrl, style, seed }),
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUserReviews();
  }, [currentUser]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) return;
    setIsSubmittingReview(true);
    setReviewSuccessMsg(null);

    try {
      const currentUserId = currentUser?.id || 'usr-mathias-cheow-primary';
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          rating,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewSuccessMsg('Review submitted successfully! Thank you for your feedback.');
        setReviewComment('');
        fetchUserReviews();
        setTimeout(() => setReviewSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    setLocalOrderedTags(tags);
  }, [tags]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    const updated = [...localOrderedTags];
    const [movedItem] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, movedItem);
    setLocalOrderedTags(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...localOrderedTags];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setLocalOrderedTags(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === localOrderedTags.length - 1) return;
    const updated = [...localOrderedTags];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setLocalOrderedTags(updated);
  };

  const handleToggleAccordion = () => {
    if (isTagsAccordionOpen) {
      // Save order when folding back up!
      onSaveTagsOrder(localOrderedTags);
    }
    setIsTagsAccordionOpen(!isTagsAccordionOpen);
  };

  useEffect(() => {
    setGapValue(calendarGap);
  }, [calendarGap]);

  useEffect(() => {
    setSnapValue(snapInterval);
  }, [snapInterval]);

  useEffect(() => {
    setBehaviorValue(recurrenceBehavior);
  }, [recurrenceBehavior]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveCalendarGap(gapValue);
      await onSaveSnapInterval(snapValue);
      await onSaveRecurrenceBehavior(behaviorValue);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setGapValue(2);
    setSnapValue(10);
    setBehaviorValue('ask');
    onSaveCalendarGap(2);
    onSaveSnapInterval(10);
    onSaveRecurrenceBehavior('ask');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-100 dark:bg-[#070A11] text-slate-800 dark:text-slate-100 transition-colors duration-200" id="larkcal-settings-view">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <Sliders className="w-6 h-6 text-indigo-600 dark:text-[#60A5FA]" />
              Settings
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure user session, layout properties, spacing options, and defaults for your UniWork dashboard.
            </p>
          </div>
        </div>

        {/* User Account Card */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Account Profile</div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-2">
                <span>User ID:</span>
                <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-md border border-slate-200/80 dark:border-slate-700 font-bold">
                  {currentUser?.id || 'usr-mathias-cheow-primary'}
                </span>
              </div>
            </div>

            <div>
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 font-semibold text-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenSignIn}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Display Name & Focus Room Avatar Customizer */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6 space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0066FF] dark:text-[#60A5FA]" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Focus Room Avatar & Student Name
              </h3>
            </div>

            {/* Display Name Input Form */}
            <form onSubmit={handleSaveDisplayName} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your student name..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:border-[#0066FF]"
                />
              </div>
              <button
                type="submit"
                className="mt-0 sm:mt-5 px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                {nameSaveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{nameSaveSuccess ? 'Saved' : 'Save Name'}</span>
              </button>
            </form>

            {/* Avatar Selection Studio */}
            <div className="bg-slate-50/80 dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 shrink-0 shadow-xs">
                    <img src={avatarData.avatarUrl} alt="Active Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Current Focus Avatar</span>
                    <span className="text-[11px] text-slate-400 capitalize">Style: {avatarData.style} • Seed: {avatarData.seed}</span>
                  </div>
                </div>

                {avatarSaveSuccess && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                    <Check className="w-3.5 h-3.5" />
                    <span>Avatar Updated!</span>
                  </span>
                )}
              </div>

              {/* Keyword Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={avatarSearchQuery}
                  onChange={(e) => setAvatarSearchQuery(e.target.value)}
                  placeholder="Search avatar keywords (e.g. ninja, cat, star, student, hero, astro)..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-hidden focus:border-[#0066FF]"
                />
              </div>

              {/* Style Switcher Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'adventurer', name: 'Adventurer' },
                  { id: 'lorelei', name: 'Lorelei (Anime)' },
                  { id: 'pixel-art', name: 'Pixel Art' },
                  { id: 'bottts', name: 'Robots' },
                  { id: 'fun-emoji', name: 'Fun Emoji' },
                  { id: 'notionists', name: 'Notionist' },
                  { id: 'micah', name: 'Flat Art' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedAvatarStyle(st.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      selectedAvatarStyle === st.id
                        ? 'bg-[#0066FF] text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700'
                    }`}
                  >
                    {st.name}
                  </button>
                ))}
              </div>

              {/* Preview Grids to select avatar */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {(avatarSearchQuery.trim()
                  ? [avatarSearchQuery.trim(), `${avatarSearchQuery.trim()}-1`, `${avatarSearchQuery.trim()}-2`, `${avatarSearchQuery.trim()}-3`, `${avatarSearchQuery.trim()}-star`, `${avatarSearchQuery.trim()}-ninja`]
                  : ['Atlas', 'Pixel', 'Cyber', 'Astro', 'Ninja', 'Fox', 'Spark', 'Zen', 'Echo', 'Nova', 'Leo', 'Sky']
                ).map((seed) => {
                  const url = `https://api.dicebear.com/7.x/${selectedAvatarStyle}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
                  const isCurrent = avatarData.seed === seed && avatarData.style === selectedAvatarStyle;

                  return (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => handleSelectAvatar(selectedAvatarStyle, seed)}
                      className={`flex flex-col items-center p-2 rounded-xl bg-white dark:bg-slate-900 border transition cursor-pointer group hover:border-[#0066FF] relative ${
                        isCurrent
                          ? 'border-[#0066FF] ring-2 ring-[#0066FF]/20 bg-blue-50/50 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 p-0.5 mb-1">
                        <img src={url} alt={seed} className="w-full h-full object-contain group-hover:scale-105 transition" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[60px] capitalize">
                        {seed}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Review & Feedback Rating Section */}
          <div className="pt-1">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Submit App Review & Feedback</h3>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4 bg-slate-50/80 dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 rounded-xl p-4">
              {/* Star Rating Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Star Rating:
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const activeVal = hoverRating !== null ? hoverRating : rating;
                    const isFilled = starVal <= activeVal;
                    return (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRating(starVal)}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 text-amber-400 hover:scale-115 transition-transform cursor-pointer focus:outline-hidden"
                        title={`${starVal} Star${starVal > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            isFilled
                              ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                              : 'text-slate-300 dark:text-slate-600 fill-slate-100 dark:fill-slate-800'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 ml-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 px-2.5 py-0.5 rounded-full">
                    {hoverRating !== null
                      ? hoverRating === 5
                        ? '5 Stars - Excellent!'
                        : hoverRating === 4
                        ? '4 Stars - Very Good'
                        : hoverRating === 3
                        ? '3 Stars - Good'
                        : hoverRating === 2
                        ? '2 Stars - Fair'
                        : '1 Star - Poor'
                      : rating === 5
                      ? '5 Stars - Excellent!'
                      : rating === 4
                      ? '4 Stars - Very Good'
                      : rating === 3
                      ? '3 Stars - Good'
                      : rating === 2
                      ? '2 Stars - Fair'
                      : '1 Star - Poor'}
                  </span>
                </div>
              </div>

              {/* Review Comment Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Your Review / Feedback
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Tell us what you like about UniWork or what features you'd like to see..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 text-xs focus:border-[#0066FF] focus:outline-hidden transition resize-none leading-relaxed animate-none"
                  required
                />
              </div>

              {reviewSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{reviewSuccessMsg}</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingReview || !reviewComment.trim()}
                  className="px-4 py-2.5 bg-[#0066FF] hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingReview ? 'Submitting...' : 'Submit Review'}</span>
                </button>
              </div>
            </form>

            {/* List of user's submitted reviews */}
            {userReviews.length > 0 && (
              <div className="mt-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Your Submitted Reviews</h4>
                <div className="space-y-2">
                  {userReviews.map((rev) => (
                    <div key={rev.id} className="p-3.5 bg-slate-50 dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rev.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300 dark:text-slate-600 fill-slate-100 dark:fill-slate-800'
                              }`}
                            />
                          ))}
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 ml-1.5">{rev.rating}/5</span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {new Date(rev.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Theme & Appearance Settings */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-[#60A5FA] flex items-center justify-center shrink-0">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight">
                Theme & Appearance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Choose your preferred appearance mode or let UniWork sync with your system.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'auto', label: 'System Auto', desc: 'Sync with system or local time' },
              { key: 'day', label: 'Day Mode', desc: 'Crisp light design aesthetic' },
              { key: 'night', label: 'Night Mode', desc: 'Premium dark design aesthetic' },
            ].map((opt) => {
              const isActive = themePreference === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onSetThemePreference && onSetThemePreference(opt.key as any)}
                  className={`flex flex-col text-left p-4 border rounded-xl cursor-pointer transition select-none ${
                    isActive
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20 dark:ring-indigo-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0F172A]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2 font-semibold text-sm">
                    {opt.key === 'day' ? (
                      <Sun className="w-4 h-4 text-amber-500" />
                    ) : opt.key === 'night' ? (
                      <Moon className="w-4 h-4 text-[#60A5FA]" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-indigo-500" />
                    )}
                    {opt.label}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* System & Device Optimization Card */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-[#34D399] flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight">
                System & Device Optimization
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                UniWork adapts its core components, side navigation, and interactive spacing dynamically based on your device hardware.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Device Type */}
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#131D31]/40 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Detected Device</span>
                <div className="flex items-center gap-2.5">
                  <div className="text-[#0066FF] dark:text-[#60A5FA]">
                    {deviceType === 'Phone' ? (
                      <Smartphone className="w-5 h-5" />
                    ) : deviceType === 'Tablet' ? (
                      <Tablet className="w-5 h-5" />
                    ) : (
                      <Laptop className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    {deviceType === 'Phone' ? 'Smartphone / Mobile' : deviceType === 'Tablet' ? 'Tablet Touchscreen' : 'Laptop / Desktop'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                Hardware classification determined via viewport queries and touch interfaces.
              </p>
            </div>

            {/* 2. Screen Telemetry */}
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#131D31]/40 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Screen Resolution</span>
                <div className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 font-mono">
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700/60 tabular-nums">
                    {screenSize.width}
                  </span>
                  <span className="text-slate-400 font-sans font-normal">×</span>
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700/60 tabular-nums">
                    {screenSize.height}
                  </span>
                  <span className="text-xs text-slate-400 font-sans font-normal ml-1">pixels</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 leading-relaxed flex items-center gap-1">
                <span>Touch support:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {typeof window !== 'undefined' && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window) ? 'Supported' : 'No touch'}
                </span>
              </div>
            </div>

            {/* 3. Layout Spacing Mode */}
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#131D31]/40 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Adaptive Spacing Profile</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-[#60A5FA]">
                  {deviceType === 'Phone' ? 'Compact Bottom-Tab Touch' : deviceType === 'Tablet' ? 'Compact Tablet Sidebar' : 'Expanded Desktop Layout'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                {deviceType === 'Phone' 
                  ? 'Collapses full sidebar menu to provide raw workspace area. Deploys pattern-native fixed bottom app tabs.' 
                  : deviceType === 'Tablet' 
                  ? 'Keeps full sidebar collapsed into a sleek 16-pixel dock. Supports multi-column workflows.' 
                  : 'Displays full-width wordmark header and expanded navigation sidebar for max efficiency.'}
              </p>
            </div>
          </div>
        </div>

        {/* About UniWork Card */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131C31] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#0b57d0] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight">
                  About UniWork
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Learn more about UniWork's mission, platform capabilities, and system specifications.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0F172A]">
            <div className="space-y-1 max-w-xl">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Platform Overview & Version Details</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Explore our fully integrated focus ecosystem, interactive time blocks, and target trackers designed for modern workforces.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onViewAboutPage) onViewAboutPage();
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0b57d0] hover:bg-[#0845a4] text-white font-semibold text-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs"
            >
              <Info className="w-4 h-4" />
              <span>View About Page</span>
            </button>
          </div>
        </div>

        {/* Reorder Default Tags Section */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <button
            onClick={handleToggleAccordion}
            className="w-full text-left p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-[#60A5FA] flex items-center justify-center shrink-0">
                <Tags className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white text-sm tracking-tight flex items-center gap-2">
                  Event Tag Priority & Pre-selection Ordering
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Expand to assemble default pre-selection order. Your #1 tag is used for new events.
                </p>
              </div>
            </div>
            <div>
              {isTagsAccordionOpen ? (
                <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              )}
            </div>
          </button>

          {isTagsAccordionOpen && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-[#131C31]/50 space-y-4 animate-in slide-in-from-top-2 duration-150">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                Drag and drop or use the arrow controls to arrange your event tags. The top-most tag (labeled **#1**) automatically becomes your **default pre-selected tag** when creating new events, and selection menus across the calendar follow this exact priority order.
              </p>

              <div className="space-y-2 max-w-md">
                {localOrderedTags.map((tag, idx) => (
                  <div
                    key={tag.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, idx)}
                    className="flex items-center justify-between bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-xs transition duration-150 group cursor-grab active:cursor-grabbing select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 transition-colors">
                        <GripVertical className="w-4 h-4 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-sans tabular-nums text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-850 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${tag.bgColor} ${tag.textColor} border ${tag.borderColor}`}>
                          {tag.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMoveUp(idx); }}
                        disabled={idx === 0}
                        className="p-1 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMoveDown(idx); }}
                        disabled={idx === localOrderedTags.length - 1}
                        className="p-1 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleToggleAccordion}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Done & Fold Panel</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Calendar Grid & Layout Spacing Setting */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131C31]">
            <h3 className="font-semibold text-slate-850 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
              <AppWindow className="w-4 h-4 text-indigo-500 dark:text-[#60A5FA]" />
              Calendar Block Spacing
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Adjust the vertical pixel gap size used between stacked events/tasks when they overlap or occur consecutively.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pixel Gap Size</span>
                  <span className="text-sm font-sans tabular-nums font-bold text-indigo-600 dark:text-[#60A5FA] bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/40">
                    {gapValue} px
                  </span>
                </div>
                
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={gapValue}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setGapValue(val);
                    onSaveCalendarGap(val);
                  }}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-sans tabular-nums">
                  <span>0px (Tight)</span>
                  <span>4px (Default)</span>
                  <span>15px (Medium)</span>
                  <span>30px (Wide)</span>
                </div>
              </div>

              <div className="flex flex-row md:flex-col gap-2 self-start md:self-center">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-900 transition cursor-pointer"
                  title="Reset to default 4px"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset to Default
                </button>
              </div>
            </div>

            {/* Live Interactive Preview */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-slate-50 dark:bg-[#131C31]/40 space-y-4">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Live Layout Spacing Preview
              </span>
              
              <div className="relative border border-dashed border-slate-300 dark:border-slate-700 rounded-md p-4 bg-white dark:bg-[#0F172A] h-48 flex flex-col overflow-hidden">
                {/* Simulated day grid hours */}
                <div className="absolute top-4 left-2 right-2 border-t border-slate-100 dark:border-slate-800/50 text-[10px] text-slate-400 dark:text-slate-500 font-sans tabular-nums pt-1">
                  09:00 AM
                </div>
                <div className="absolute top-24 left-2 right-2 border-t border-slate-100 dark:border-slate-800/50 text-[10px] text-slate-400 dark:text-slate-500 font-sans tabular-nums pt-1">
                  10:00 AM
                </div>

                {/* Event 1 */}
                <div className="relative z-10 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded p-2 text-indigo-700 dark:text-indigo-300 h-14 flex flex-col justify-center shadow-xs transition-all duration-200" style={{ marginBottom: `${gapValue}px` }}>
                  <span className="text-xs font-bold leading-tight truncate">Team Sync & Standup</span>
                  <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-sans tabular-nums">09:00 - 09:30 AM</span>
                </div>

                {/* Gap Indicator Line */}
                {gapValue > 0 && (
                  <div className="relative h-0 flex items-center justify-center" style={{ top: `-${gapValue / 2}px` }}>
                    <div className="absolute left-0 right-0 border-t border-dashed border-indigo-400 dark:border-indigo-500/50 opacity-60"></div>
                    <span className="relative z-15 bg-indigo-600 text-white font-sans tabular-nums text-[9px] px-1.5 py-0.5 rounded-full shadow-xs">
                      {gapValue}px Gap
                    </span>
                  </div>
                )}

                {/* Event 2 */}
                <div className="relative z-10 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded p-2 text-emerald-700 dark:text-emerald-300 h-14 flex flex-col justify-center shadow-xs transition-all duration-200">
                  <span className="text-xs font-bold leading-tight truncate">Review Design Assets</span>
                  <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-sans tabular-nums">09:30 - 10:00 AM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Micro-Adjustment Snap Interval Setting */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131C31]">
            <h3 className="font-semibold text-slate-850 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-indigo-500 dark:text-[#60A5FA]" />
              Calendar Micro-Adjustment & Drag Snapping
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Set the minute interval used when dragging time blocks or resizing from the top or bottom edge of events and tasks.
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { min: 5, label: '5 Minutes', desc: 'Ultra-fine micro-adjustments' },
                { min: 10, label: '10 Minutes', desc: 'Recommended default snap step' },
                { min: 15, label: '15 Minutes', desc: 'Standard quarter-hour grid' },
                { min: 30, label: '30 Minutes', desc: 'Half-hour structured blocks' },
              ].map((opt) => (
                <label
                  key={opt.min}
                  className={`flex flex-col p-4 border rounded-xl cursor-pointer transition select-none ${
                    snapValue === opt.min
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20 dark:ring-indigo-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0F172A]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5 font-semibold text-sm">
                    <input
                      type="radio"
                      name="snapInterval"
                      value={opt.min}
                      checked={snapValue === opt.min}
                      onChange={() => {
                        setSnapValue(opt.min);
                        onSaveSnapInterval(opt.min);
                      }}
                      className="accent-indigo-600"
                    />
                    {opt.label}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{opt.desc}</p>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Repeating Events Default Action */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131C31]">
            <h3 className="font-semibold text-slate-850 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
              <CalendarRange className="w-4 h-4 text-indigo-500 dark:text-[#60A5FA]" />
              Repeating Events Preference
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose how to handle modifications or deletions of recurring events (such as drag-to-resize, dragging events to new days, or clicking edit/delete in the settings modal).
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { val: 'ask', label: 'Ask every time', desc: 'Prompts you to choose between editing just this occurrence or the entire event series.' },
                { val: 'one', label: 'Just this event', desc: 'Automatically applies edits or deletions only to the selected instance without prompting.' },
                { val: 'all', label: 'All events', desc: 'Automatically applies edits or deletions to all future events in the series without prompting.' },
              ].map((opt) => (
                <label
                  key={opt.val}
                  className={`flex flex-col p-4 border rounded-xl cursor-pointer transition select-none ${
                    behaviorValue === opt.val
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20 dark:ring-indigo-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0F172A]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2 font-semibold text-sm">
                    <input
                      type="radio"
                      name="recurrenceBehavior"
                      value={opt.val}
                      checked={behaviorValue === opt.val}
                      onChange={() => {
                        setBehaviorValue(opt.val as any);
                        onSaveRecurrenceBehavior(opt.val as any);
                      }}
                      className="accent-indigo-600"
                    />
                    {opt.label}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{opt.desc}</p>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Legal, Privacy & Compliance */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131C31] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-[#60A5FA] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-850 dark:text-white text-sm tracking-tight">
                  Legal & Data Privacy
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Review UniWork privacy standards, data retention policy, and service agreement.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#0F172A]">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Data Minimization Guarantee</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Zero personal emails stored. Your data is encrypted and permanently deletable at any time.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab && setActiveTab('privacy')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setActiveTab && setActiveTab('terms')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                Terms of Service
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone: Account & Data Deletion */}
        <div className="bg-white dark:bg-[#0F172A] border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-6 border-b border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-rose-900 dark:text-rose-400 text-sm tracking-tight">
                  Danger Zone: Account & Database Management
                </h3>
                <p className="text-xs text-rose-700/80 dark:text-rose-300/85 mt-0.5">
                  Permanently delete your account profile and purge all associated calendar and task data.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-rose-50/5 dark:bg-rose-950/10">
            <div className="space-y-1 max-w-xl">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Delete Account & Wipe All Data</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Permanently deletes your account and removes all calendar events, tasks, target goals, and custom tag preferences from the PostgreSQL database.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmationText('');
                setShowDeleteAccountModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Account & Data</span>
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-6">
          {saveSuccess && (
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-pulse" id="save-success-indicator">
              <Check className="w-4 h-4 stroke-[3px]" />
              Settings saved successfully!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition text-sm cursor-pointer"
            id="save-settings-btn"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Configuration
          </button>
        </div>
      </div>

      {/* Log Out Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Log out of UniWork?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Are you sure you want to log out of this session?</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  if (onSignOut) onSignOut();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 dark:bg-rose-700 dark:hover:bg-rose-600 text-white font-bold text-xs transition cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account & Wipe Database Confirmation Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/90 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-rose-200 dark:border-rose-900/60 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Account & Wipe Database?</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 rounded-xl text-xs text-rose-900 dark:text-rose-200 space-y-2 leading-relaxed">
              <p className="font-semibold">
                Are you sure you want to delete your account?
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                This will permanently delete your user profile and completely wipe all associated data from the database, including:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300 text-[11.5px]">
                <li>All calendar events, time blocks, and recurring schedules</li>
                <li>All tasks, subtasks, checklists, and task groups</li>
                <li>All targets, goals, progress metrics, and timeline records</li>
                <li>All custom tags, colors, and priority settings</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Type <span className="font-sans text-rose-600 dark:text-rose-400 font-bold tracking-wider">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-sm font-sans focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950"
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => {
                  setShowDeleteAccountModal(false);
                  setDeleteConfirmationText('');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmationText.trim().toLowerCase() !== 'delete' || isDeletingAccount}
                onClick={async () => {
                  if (deleteConfirmationText.trim().toLowerCase() !== 'delete') return;
                  setIsDeletingAccount(true);
                  try {
                    if (onDeleteAccountAndData) {
                      await onDeleteAccountAndData();
                    }
                  } catch (err) {
                    console.error('Failed to delete account:', err);
                  } finally {
                    setIsDeletingAccount(false);
                    setShowDeleteAccountModal(false);
                  }
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                {isDeletingAccount ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
