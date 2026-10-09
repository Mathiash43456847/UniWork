/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, AlarmClockCheck, CheckSquare, Plus, Edit2, Trash2, Check, X, ChevronLeft, ChevronRight, Settings, Target, Hourglass, Info, User as UserIcon, LogIn, LogOut, ShieldCheck, ChevronDown, Sliders, MessageSquare, BarChart2 } from 'lucide-react';
import { Tag, ActiveTab, User } from '../types';
import { UNIWORK_FULL_LOGO_BASE64, UNIWORK_DARK_LOGO_BASE64, UNIWORK_MINI_LOGO_BASE64 } from '../assets/logoData';
import uniworkFullLogoUrl from '../assets/iwork-full-logo.png';
import uniworkMiniLogoUrl from '../assets/iwork-mini-logo.png';

interface LogoDisplayProps {
  mini?: boolean;
  isDark?: boolean;
}

const LogoDisplay: React.FC<LogoDisplayProps> = ({ mini, isDark }) => {
  const fullSrc = (isDark ? UNIWORK_DARK_LOGO_BASE64 : UNIWORK_FULL_LOGO_BASE64) || UNIWORK_FULL_LOGO_BASE64 || uniworkFullLogoUrl;
  const miniSrc = uniworkMiniLogoUrl || fullSrc;

  return (
    <div className="flex items-center h-full select-none overflow-hidden">
      {!mini ? (
        <img
          src={fullSrc}
          alt=""
          loading="eager"
          decoding="sync"
          className="h-8 w-auto max-w-[185px] object-contain block shrink-0 select-none pointer-events-none transition-opacity duration-200"
        />
      ) : (
        <img
          src={miniSrc}
          alt=""
          loading="eager"
          decoding="sync"
          className="h-8 w-auto object-contain block shrink-0 select-none pointer-events-none transition-opacity duration-200"
        />
      )}
    </div>
  );
};

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  tags: Tag[];
  onAddTag: (name: string, color: string) => void;
  onUpdateTag: (id: string, name: string, color: string) => void;
  onDeleteTag: (id: string) => void;
  onToggleTagVisibility: (id: string) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  dbConnected?: boolean;
  syncStatus?: 'synced' | 'saving' | 'error';
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  currentUser?: User | null;
  onOpenSignIn?: () => void;
  onSignOut?: () => void;
  allowedAdminUserIds?: string[];
  isAboutTabVisible?: boolean;
  isDark?: boolean;
  adminSubTab?: 'general' | 'chat';
  onSelectAdminSubTab?: (subTab: 'general' | 'chat') => void;
  adminUnreadCount?: number;
  isInsightsVisible?: boolean;
}


// Preset colors with beautiful Tailwind mappings
export const COLOR_PRESETS = [
  { key: 'blue', label: 'Sky Blue', bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200', fill: 'bg-sky-500' },
  { key: 'green', label: 'Emerald', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', fill: 'bg-emerald-500' },
  { key: 'amber', label: 'Amber Gold', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', fill: 'bg-amber-500' },
  { key: 'rose', label: 'Rose Red', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', fill: 'bg-rose-500' },
  { key: 'violet', label: 'Violet', bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', fill: 'bg-violet-500' },
  { key: 'indigo', label: 'Indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', fill: 'bg-indigo-500' },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  tags,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
  onToggleTagVisibility,
  selectedDate,
  setSelectedDate,
  dbConnected = false,
  syncStatus = 'synced',
  sidebarCollapsed,
  setSidebarCollapsed,
  currentUser,
  onOpenSignIn,
  onSignOut,
  allowedAdminUserIds = ['usr_g_8cced70b14994d07'],
  isAboutTabVisible = false,
  isDark = false,
  adminSubTab = 'general',
  onSelectAdminSubTab,
  adminUnreadCount = 0,
  isInsightsVisible = true,
}: SidebarProps) {

  const isAdminAuthorized = Boolean(currentUser?.id && allowedAdminUserIds.includes(currentUser.id));
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(activeTab === 'admin');

  useEffect(() => {
    if (activeTab === 'admin') {
      setIsAdminDropdownOpen(true);
    }
  }, [activeTab]);

  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('blue');

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [editingTagColor, setEditingTagColor] = useState('blue');

  const handleCreateTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    onAddTag(newTagName.trim(), newTagColor);
    setNewTagName('');
    setIsCreatingTag(false);
  };

  const startEditing = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
    setEditingTagColor(tag.color);
  };

  const handleSaveEdit = (tagId: string) => {
    if (!editingTagName.trim()) return;
    onUpdateTag(tagId, editingTagName.trim(), editingTagColor);
    setEditingTagId(null);
  };

  const isLegalPage = activeTab === 'privacy' || activeTab === 'terms';

  return (
    <aside
      className={`${
        isLegalPage
          ? 'w-0 opacity-0 border-r-0 pointer-events-none p-0 hidden'
          : sidebarCollapsed
            ? 'w-16 bg-[#F8FAFC] dark:bg-[#0B0F17] border-r border-slate-200 dark:border-slate-800'
            : 'w-68 bg-[#F8FAFC] dark:bg-[#0B0F17] border-r border-slate-200 dark:border-slate-800'
      } hidden md:flex flex-col h-full flex-shrink-0 transition-all duration-300 overflow-hidden`}
      id="larkcal-sidebar"
    >
      {/* Brand Header */}
      <div className={`h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center ${sidebarCollapsed ? 'justify-center py-2' : 'justify-between'} transition-all`}>
        <div className="flex items-center h-full gap-2 overflow-hidden flex-1 py-2">
          <LogoDisplay mini={sidebarCollapsed} isDark={isDark} />
        </div>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer shrink-0 ml-1"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="p-3 space-y-1">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-sm font-medium transition-all duration-150 ${
            activeTab === 'calendar'
              ? 'bg-[#E8F2FF] text-[#0066FF] dark:bg-[#0066FF]/20 dark:text-[#60A5FA] font-bold shadow-2xs dark:border dark:border-[#0066FF]/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          id="nav-calendar-btn"
          data-guide-id="calendar-tab"
          title={sidebarCollapsed ? "Calendar" : undefined}
        >
          <div className="flex items-center gap-2.5">
            <CalendarIcon className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'} ${activeTab === 'calendar' ? 'text-[#0066FF] dark:text-[#60A5FA]' : 'text-slate-500 dark:text-slate-400'}`} />
            {!sidebarCollapsed && <span>Calendar</span>}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('focus')}
          className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-sm font-medium transition-all duration-150 ${
            activeTab === 'focus'
              ? 'bg-[#E8F2FF] text-[#0066FF] dark:bg-[#0066FF]/20 dark:text-[#60A5FA] font-bold shadow-2xs dark:border dark:border-[#0066FF]/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          id="nav-focus-btn"
          data-guide-id="focus-tab"
          title={sidebarCollapsed ? "Focus Room" : undefined}
        >
          <div className="flex items-center gap-2.5">
            <AlarmClockCheck className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'} ${activeTab === 'focus' ? 'text-[#0066FF] dark:text-[#60A5FA]' : 'text-slate-500 dark:text-slate-400'}`} />
            {!sidebarCollapsed && <span>Focus Room</span>}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-sm font-medium transition-all duration-150 ${
            activeTab === 'tasks'
              ? 'bg-[#E8F2FF] text-[#0066FF] dark:bg-[#0066FF]/20 dark:text-[#60A5FA] font-bold shadow-2xs dark:border dark:border-[#0066FF]/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          id="nav-tasks-btn"
          data-guide-id="tasks-tab"
          title={sidebarCollapsed ? "Tasks" : undefined}
        >
          <div className="flex items-center gap-2.5">
            <CheckSquare className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'} ${activeTab === 'tasks' ? 'text-[#0066FF] dark:text-[#60A5FA]' : 'text-slate-500 dark:text-slate-400'}`} />
            {!sidebarCollapsed && <span>Tasks</span>}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('goals')}
          className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-sm font-medium transition-all duration-150 ${
            activeTab === 'goals'
              ? 'bg-[#E8F2FF] text-[#0066FF] dark:bg-[#0066FF]/20 dark:text-[#60A5FA] font-bold shadow-2xs dark:border dark:border-[#0066FF]/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          id="nav-goals-btn"
          data-guide-id="goals-tab"
          title={sidebarCollapsed ? "Targets" : undefined}
        >
          <div className="flex items-center gap-2.5">
            <Target className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'} ${activeTab === 'goals' ? 'text-[#0066FF] dark:text-[#60A5FA]' : 'text-slate-500 dark:text-slate-400'}`} />
            {!sidebarCollapsed && <span>Targets</span>}
          </div>
        </button>

        {isInsightsVisible && (
          <button
            onClick={() => setActiveTab('insights')}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-sm font-medium transition-all duration-150 ${
              activeTab === 'insights'
                ? 'bg-[#E8F2FF] text-[#0066FF] dark:bg-[#0066FF]/20 dark:text-[#60A5FA] font-bold shadow-2xs dark:border dark:border-[#0066FF]/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            id="nav-insights-btn"
            data-guide-id="insights-tab"
            title={sidebarCollapsed ? "Insights" : undefined}
          >
            <div className="flex items-center gap-2.5">
              <BarChart2 className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'} ${activeTab === 'insights' ? 'text-[#0066FF] dark:text-[#60A5FA]' : 'text-slate-500 dark:text-slate-400'}`} />
              {!sidebarCollapsed && <span>Insights</span>}
            </div>
          </button>
        )}

        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-sm font-medium transition-all duration-150 ${
            activeTab === 'settings'
              ? 'bg-[#E8F2FF] text-[#0066FF] dark:bg-[#0066FF]/20 dark:text-[#60A5FA] font-bold shadow-2xs dark:border dark:border-[#0066FF]/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          id="nav-settings-btn"
          title={sidebarCollapsed ? "Settings" : undefined}
        >
          <div className="flex items-center gap-2.5">
            <Settings className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'} ${activeTab === 'settings' ? 'text-[#0066FF] dark:text-[#60A5FA]' : 'text-slate-500 dark:text-slate-400'}`} />
            {!sidebarCollapsed && <span>Settings</span>}
          </div>
        </button>

        {(isAboutTabVisible || activeTab === 'about') && (
          <button
            onClick={() => setActiveTab('about')}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-sm font-medium transition-all duration-150 ${
              activeTab === 'about'
                ? 'bg-[#E8F2FF] text-[#0066FF] dark:bg-[#0066FF]/20 dark:text-[#60A5FA] font-bold shadow-2xs dark:border dark:border-[#0066FF]/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            id="nav-about-btn"
            title={sidebarCollapsed ? "About" : undefined}
          >
            <div className="flex items-center gap-2.5">
              <Info className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'} ${activeTab === 'about' ? 'text-[#0066FF] dark:text-[#60A5FA]' : 'text-slate-500 dark:text-slate-400'}`} />
              {!sidebarCollapsed && <span>About</span>}
            </div>
          </button>
        )}

        {isAdminAuthorized && (
          sidebarCollapsed ? (
            <div className="relative">
              <button
                onClick={() => {
                  setActiveTab('admin');
                  onSelectAdminSubTab?.(adminSubTab || 'general');
                }}
                className={`w-full flex items-center justify-center p-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-[#E8F2FF] text-[#0066FF] dark:bg-[#0066FF]/20 dark:text-[#60A5FA] font-bold shadow-2xs dark:border dark:border-[#0066FF]/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                id="nav-admin-btn"
                title="Admin (Click to toggle)"
              >
                <div className="relative flex items-center justify-center">
                  <ShieldCheck className={`w-5 h-5 ${activeTab === 'admin' ? 'text-[#0066FF] dark:text-[#60A5FA]' : 'text-slate-500 dark:text-slate-400'}`} />
                  {adminUnreadCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-slate-900 pointer-events-none"
                      title={`${adminUnreadCount} unread admin messages`}
                    >
                      {adminUnreadCount > 99 ? '99+' : adminUnreadCount}
                    </span>
                  )}
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                onClick={() => {
                  setIsAdminDropdownOpen(!isAdminDropdownOpen);
                  if (activeTab !== 'admin') {
                    setActiveTab('admin');
                    onSelectAdminSubTab?.(adminSubTab || 'general');
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-[#E8F2FF] text-[#0066FF] dark:bg-[#0066FF]/20 dark:text-[#60A5FA] font-bold shadow-2xs dark:border dark:border-[#0066FF]/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                id="nav-admin-btn"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative flex items-center justify-center">
                    <ShieldCheck className={`w-4 h-4 ${activeTab === 'admin' ? 'text-[#0066FF] dark:text-[#60A5FA]' : 'text-slate-500 dark:text-slate-400'}`} />
                    {adminUnreadCount > 0 && (
                      <span
                        className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs ring-1 ring-white dark:ring-slate-900 pointer-events-none"
                        title={`${adminUnreadCount} unread admin messages`}
                      >
                        {adminUnreadCount > 99 ? '99+' : adminUnreadCount}
                      </span>
                    )}
                  </div>
                  <span>Admin</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isAdminDropdownOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'text-slate-400'
                  }`}
                />
              </button>

              {/* Admin Submenu Dropdown */}
              {isAdminDropdownOpen && (
                <div className="pl-6 pr-1 py-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('admin');
                      onSelectAdminSubTab?.('general');
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'admin' && adminSubTab === 'general'
                        ? 'bg-blue-100/80 dark:bg-blue-900/40 text-[#0066FF] dark:text-[#60A5FA] font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>General</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('admin');
                      onSelectAdminSubTab?.('chat');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'admin' && adminSubTab === 'chat'
                        ? 'bg-blue-100/80 dark:bg-blue-900/40 text-[#0066FF] dark:text-[#60A5FA] font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </div>
                    {adminUnreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                        {adminUnreadCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* My Calendars / Tag Filter Widget */}
      {!sidebarCollapsed && (
        <div className="flex-1 overflow-y-auto px-4 py-4 border-t border-slate-200/60 dark:border-slate-800 flex flex-col min-h-0 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider font-sans">
              EVENT CALENDARS
            </span>
            <button
              onClick={() => setIsCreatingTag(!isCreatingTag)}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
              title="Create new category tag"
              id="create-tag-btn"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Create Tag Mini-Form */}
          {isCreatingTag && (
            <form onSubmit={handleCreateTagSubmit} className="mb-4 p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs space-y-2">
              <input
                type="text"
                placeholder="Tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
                required
              />
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color.key}
                      type="button"
                      onClick={() => setNewTagColor(color.key)}
                      className={`w-4.5 h-4.5 rounded-full ${color.fill} border-2 transition-transform duration-100 ${
                        newTagColor === color.key ? 'scale-115 border-slate-600 shadow-xs' : 'border-transparent hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingTag(false)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="submit"
                    className="p-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Lists of Tags */}
          <div className="space-y-1.5 flex-1 overflow-y-auto">
            {tags.map((tag) => {
              const preset = COLOR_PRESETS.find(p => p.key === tag.color) || COLOR_PRESETS[0];
              const isEditing = editingTagId === tag.id;

              return (
                <div
                  key={tag.id}
                  className="group flex items-center justify-between px-1.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                  id={`tag-row-${tag.id}`}
                >
                  {isEditing ? (
                    <div className="flex-1 space-y-1.5 p-1 bg-white border border-slate-200 rounded-md">
                      <input
                        type="text"
                        value={editingTagName}
                        onChange={(e) => setEditingTagName(e.target.value)}
                        className="w-full text-xs px-1.5 py-1 border border-slate-200 rounded"
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {COLOR_PRESETS.map((color) => (
                            <button
                              key={color.key}
                              type="button"
                              onClick={() => setEditingTagColor(color.key)}
                              className={`w-3.5 h-3.5 rounded-full ${color.fill} border transition-transform ${
                                editingTagColor === color.key ? 'scale-115 border-slate-700 shadow-xs' : 'border-transparent'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex gap-0.5">
                          <button
                            type="button"
                            onClick={() => setEditingTagId(null)}
                            className="p-0.5 rounded text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(tag.id)}
                            className="p-0.5 rounded text-emerald-500 hover:text-emerald-700"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {/* Checkbox for Toggle Visibility */}
                        <label className="relative flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tag.visible}
                            onChange={() => onToggleTagVisibility(tag.id)}
                            className="sr-only peer"
                          />
                          <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                            tag.visible
                              ? `${preset.fill} border-transparent text-white`
                              : 'border-slate-300 hover:border-slate-400 text-transparent'
                          }`}>
                            <Check className="w-3 h-3 stroke-[3px]" />
                          </div>
                        </label>

                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                          {tag.name}
                        </span>
                      </div>

                      {/* Controls (Hidden by default, shown on hover) */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={() => startEditing(tag)}
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
                          title="Rename Tag"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {/* Only allow deleting if not the default tag */}
                        {tag.id !== 'default-work' && tag.id !== 'default-personal' && (
                          <button
                            onClick={() => onDeleteTag(tag.id)}
                            className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-rose-600 transition"
                            title="Delete Tag"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
