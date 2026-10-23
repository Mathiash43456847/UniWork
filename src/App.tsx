/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, AlarmClockCheck, CheckSquare, Target, Settings, BarChart2, Sparkles } from 'lucide-react';
import { Tag, CalendarEvent, Task, ActiveTab, TaskStatus, TaskGroup, Goal, User, getLocalISODate } from './types';
import Sidebar from './components/Sidebar';
import CalendarView from './components/CalendarView';
import TasksView from './components/TasksView';
import Modal from './components/Modal';
import SettingsView from './components/SettingsView';
import GoalsView from './components/GoalsView';
import AboutView from './components/AboutView';
import SignInView from './components/SignInView';
import LegalView from './components/LegalView';
import InsightsView from './components/InsightsView';
import { FocusRoomView } from './components/FocusRoomView';
import { AdminView } from './components/AdminView';
import { encryptData, decryptData } from './lib/encryption';


const INITIAL_GOALS: Goal[] = [
  { id: 'goal-1', title: 'Launch Syllabi Productivity Platform', color: 'indigo', timeBudget: 20 },
  { id: 'goal-2', title: 'Maintain Active Health & Gym Routine', color: 'green', timeBudget: 8 },
];

// Helper to format ISO Date relative to today
const getRelativeDateString = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Initial data for beautiful fallback / onboarding layout
const INITIAL_TAGS: Tag[] = [
  { id: 'default-work', name: 'Work Project', color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-700', borderColor: 'border-indigo-200', visible: true },
  { id: 'default-personal', name: 'Personal Life', color: 'green', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-emerald-200', visible: true },
  { id: 'default-urgent', name: 'Urgent Milestones', color: 'rose', bgColor: 'bg-rose-100', textColor: 'text-rose-700', borderColor: 'border-rose-200', visible: true },
];

const INITIAL_GROUPS = [
  { id: 'group-1', name: 'Default Group' },
  { id: 'group-2', name: 'default 2' },
];

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'ev-1',
    title: 'Syllabi Design Review',
    description: 'Go over Google Calendar style event tags and Lark style Kanban boards.',
    date: getRelativeDateString(0),
    startTime: '10:00',
    endTime: '11:30',
    tagId: 'default-work',
  },
  {
    id: 'ev-2',
    title: 'Gym & Cardio session',
    description: 'Keep up with the healthy life streak!',
    date: getRelativeDateString(0),
    startTime: '18:00',
    endTime: '19:00',
    tagId: 'default-personal',
  }
];

const INITIAL_TASKS: Task[] = [];

// Helper to parse path into valid ActiveTab
function getTabFromPath(path: string): ActiveTab | null {
  const cleanPath = path.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (cleanPath.startsWith('admin')) {
    return 'admin';
  }
  if (cleanPath.startsWith('focus')) {
    return 'focus';
  }
  if (['calendar', 'focus', 'tasks', 'goals', 'insights', 'settings', 'about', 'privacy', 'terms'].includes(cleanPath)) {
    return cleanPath as ActiveTab;
  }
  return null;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('uniwork_user_session');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (e) {
      console.warn('Failed to parse user session:', e);
    }
    return null;
  });

  // Admin Security States
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    try {
      return localStorage.getItem('uniwork_admin_pw') || '';
    } catch {
      return '';
    }
  });

  const SUPER_ADMIN_IDS = ['usr_g_8cced70b14994d07', 'usr_g_100319333273050289112'];

  const [allowedAdminUserIds, setAllowedAdminUserIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('uniwork_admin_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return Array.from(new Set([...parsed, ...SUPER_ADMIN_IDS]));
        }
      }
    } catch {
      // ignore
    }
    return SUPER_ADMIN_IDS;
  });

  const [isGuideModeArmed, setIsGuideModeArmed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('uniwork_guide_mode_armed') === 'true';
    } catch {
      return false;
    }
  });

  const isAdminAuthorized = Boolean(
    currentUser?.id && 
    (SUPER_ADMIN_IDS.includes(currentUser.id) || allowedAdminUserIds.includes(currentUser.id))
  );

  useEffect(() => {
    const fetchAdminAccountsList = async () => {
      try {
        const res = await fetch('/api/admin/accounts');
        const data = await res.json();
        if (data.success && Array.isArray(data.accounts)) {
          const ids = data.accounts.map((a: any) => a.id);
          const combined = Array.from(new Set([...ids, ...SUPER_ADMIN_IDS]));
          setAllowedAdminUserIds(combined);
          localStorage.setItem('uniwork_admin_users', JSON.stringify(combined));
        }
      } catch (err) {
        // ignore
      }
    };
    fetchAdminAccountsList();
  }, []);

  const [insightsAccessMode, setInsightsAccessMode] = useState<'all' | 'admin'>('all');
  const isInsightsVisible = insightsAccessMode === 'all' || isAdminAuthorized;

  useEffect(() => {
    const fetchInsightsAccess = () => {
      fetch('/api/settings/insights_access')
        .then((r) => r.json())
        .then((d) => {
          if (d.success && (d.value === 'all' || d.value === 'admin')) {
            setInsightsAccessMode(d.value);
          }
        })
        .catch(() => {});
    };
    fetchInsightsAccess();
  }, []);

  // Admin Sub-Tab & Unread Messages
  const [adminSubTab, setAdminSubTabState] = useState<'general' | 'chat' | 'reports'>(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/admin/chat')) return 'chat';
    if (path.includes('/admin/reports')) return 'reports';
    return 'general';
  });

  const setAdminSubTab = (subTab: 'general' | 'chat' | 'reports') => {
    setAdminSubTabState(subTab);
    try {
      const targetPath = `/admin/${subTab}`;
      if (window.location.pathname !== targetPath && activeTab === 'admin') {
        window.history.pushState({ tab: 'admin', subTab }, '', targetPath);
      }
    } catch (e) {
      console.warn('Browser history state update skipped:', e);
    }
  };

  const [adminUnreadCount, setAdminUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!isAdminAuthorized || !currentUser?.id) {
      setAdminUnreadCount(0);
      return;
    }

    const fetchUnread = async () => {
      try {
        const res = await fetch(`/api/admin/messages/unread-count?userId=${encodeURIComponent(currentUser.id)}`);
        const data = await res.json();
        if (data.success && typeof data.count === 'number') {
          setAdminUnreadCount(data.count);
        }
      } catch (err) {
        // ignore
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 4000);
    return () => clearInterval(interval);
  }, [isAdminAuthorized, currentUser?.id]);

  const [themePreference, setThemePreference] = useState<'day' | 'night'>(() => {
    try {
      const saved = localStorage.getItem('uniwork_theme_pref');
      if (saved === 'day' || saved === 'night') return saved;
    } catch {}
    return 'day';
  });

  const [autoThemeMode, setAutoThemeMode] = useState<'day' | 'night'>(() => {
    const hour = new Date().getHours();
    const isNightByTime = hour >= 19 || hour < 6;
    const isSystemDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return (isNightByTime || isSystemDark) ? 'night' : 'day';
  });

  useEffect(() => {
    const checkTheme = () => {
      const hour = new Date().getHours();
      const isNightByTime = hour >= 19 || hour < 6;
      const isSystemDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setAutoThemeMode((isNightByTime || isSystemDark) ? 'night' : 'day');
    };

    checkTheme();
    const interval = setInterval(checkTheme, 30000);
    const mediaQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const handleChange = () => checkTheme();
    if (mediaQuery) {
      mediaQuery.addEventListener('change', handleChange);
    }

    return () => {
      clearInterval(interval);
      if (mediaQuery) {
        mediaQuery.removeEventListener('change', handleChange);
      }
    };
  }, []);

  // Universal Effective Theme Mode: All accounts (including Admin) follow time/system lighting rules
  const effectiveThemeMode = autoThemeMode;
  const themeMode = autoThemeMode;

  // Apply data-theme attribute and dark class on <html> root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveThemeMode);
    if (effectiveThemeMode === 'night') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [effectiveThemeMode]);

  const handleSetThemePreference = (pref: 'auto' | 'day' | 'night') => {
    const targetMode = pref === 'night' ? 'night' : 'day';
    setThemePreference(targetMode);
    setAutoThemeMode(targetMode);
    try {
      localStorage.setItem('uniwork_theme_pref', targetMode);
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themePreference: targetMode, userId: getActiveUserId() }),
      }).catch(e => console.warn('Failed to persist theme preference:', e));
    } catch (e) {
      console.warn('Failed to save theme preference in localStorage:', e);
    }
  };

  const handleToggleGuideModeArmed = async (armed: boolean) => {
    setIsGuideModeArmed(armed);
    try {
      localStorage.setItem('uniwork_guide_mode_armed', String(armed));
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isGuideModeArmed: String(armed), userId: getActiveUserId() }),
      });
    } catch (e) {
      console.warn('Failed to save guide armed state:', e);
    }
  };

  const handleUpdateAdminPassword = async (newPw: string) => {
    setAdminPassword(newPw);
    try {
      localStorage.setItem('uniwork_admin_pw', newPw);
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: newPw, userId: 'global' }),
      });
    } catch (e) {
      console.warn('Failed to save admin pw:', e);
    }
  };

  const handleAddAdminUserId = (id: string) => {
    setAllowedAdminUserIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem('uniwork_admin_users', JSON.stringify(updated));
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ allowedAdminUserIds: JSON.stringify(updated), userId: 'global' }),
        }).catch(e => console.warn('Failed to save admin users to DB:', e));
      } catch (e) {
        console.warn('Failed to save admin users:', e);
      }
      return updated;
    });
  };

  const handleRemoveAdminUserId = (id: string) => {
    setAllowedAdminUserIds((prev) => {
      const updated = prev.filter((u) => u !== id);
      try {
        localStorage.setItem('uniwork_admin_users', JSON.stringify(updated));
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ allowedAdminUserIds: JSON.stringify(updated), userId: 'global' }),
        }).catch(e => console.warn('Failed to save admin users to DB:', e));
      } catch (e) {
        console.warn('Failed to save admin users:', e);
      }
      return updated;
    });
  };

  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(null);
  const [isFocusRunning, setIsFocusRunning] = useState<boolean>(() => {
    try {
      return localStorage.getItem('focus_timer_running') === 'true';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => {
    // 1. Check URL search params (e.g. ?tab=calendar)
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as ActiveTab;
      if (tabParam && ['calendar', 'focus', 'tasks', 'goals', 'insights', 'settings', 'about', 'privacy', 'terms', 'admin'].includes(tabParam)) {
        window.history.replaceState({}, '', `/${tabParam}`);
        return tabParam;
      }
    } catch {}

    // 2. Check current URL path
    const urlTab = getTabFromPath(window.location.pathname);
    const hasUser = !!localStorage.getItem('uniwork_user_session');

    if (urlTab) {
      // Whitelist public legal and about pages
      if (!hasUser && !['about', 'privacy', 'terms', 'focus'].includes(urlTab)) {
        return 'about';
      }
      return urlTab;
    }

    // Default: 'calendar' if authenticated, otherwise 'about'
    return hasUser ? 'calendar' : 'about';
  });

  const [initialFocusRoomCode, setInitialFocusRoomCode] = useState<string | null>(() => {
    try {
      const match = window.location.pathname.match(/^\/focus\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) return match[1];
      return null;
    } catch {
      return null;
    }
  });

  // Safe wrapper for changing active tab that synchronizes the browser address bar & history
  const setActiveTab = (tab: ActiveTab, replaceHistory: boolean = false) => {
    setActiveTabState(tab);
    try {
      const targetPath = tab === 'admin' ? `/admin/${adminSubTab}` : `/${tab}`;
      if (window.location.pathname !== targetPath) {
        if (replaceHistory) {
          window.history.replaceState({ tab, subTab: tab === 'admin' ? adminSubTab : undefined }, '', targetPath);
        } else {
          window.history.pushState({ tab, subTab: tab === 'admin' ? adminSubTab : undefined }, '', targetPath);
        }
      }
    } catch (e) {
      console.warn('Browser history state update skipped:', e);
    }
  };

  // Redirect away from insights if locked behind admin and user is not an admin
  useEffect(() => {
    if (activeTab === 'insights' && !isInsightsVisible) {
      setActiveTab('tasks');
    }
  }, [activeTab, isInsightsVisible]);

  // Sync initial URL on first mount and handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname.toLowerCase();
      const urlTab = getTabFromPath(pathname);
      const hasUser = !!localStorage.getItem('uniwork_user_session');

      if (urlTab) {
        if (!hasUser && !['about', 'privacy', 'terms', 'focus'].includes(urlTab)) {
          setActiveTabState('about');
          window.history.replaceState({ tab: 'about' }, '', '/about');
        } else {
          setActiveTabState(urlTab);
          if (urlTab === 'admin') {
            const sub = pathname.includes('/admin/chat') ? 'chat' : 'general';
            setAdminSubTabState(sub);
          }
        }
      } else {
        // Fallback for root "/"
        const defaultTab: ActiveTab = hasUser ? 'calendar' : 'about';
        setActiveTabState(defaultTab);
        window.history.replaceState({ tab: defaultTab }, '', `/${defaultTab}`);
      }
    };

    // Ensure the initial address bar matches activeTab if at "/"
    const initialTab = getTabFromPath(window.location.pathname);
    if (!initialTab) {
      const targetPath = activeTab === 'admin' ? `/admin/${adminSubTab}` : `/${activeTab}`;
      window.history.replaceState({ tab: activeTab, subTab: activeTab === 'admin' ? adminSubTab : undefined }, '', targetPath);
    } else if (initialTab === 'admin') {
      // Sync address bar to correct format /admin/general or /admin/chat
      const targetPath = `/admin/${adminSubTab}`;
      window.history.replaceState({ tab: 'admin', subTab: adminSubTab }, '', targetPath);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab, adminSubTab]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAboutTabVisible, setIsAboutTabVisible] = useState<boolean>(false);

  // Hide About tab in sidebar instantly if navigating to another tab
  useEffect(() => {
    if (activeTab !== 'about') {
      setIsAboutTabVisible(false);
    }
  }, [activeTab]);

  // Automatically collapse sidebar when accessing legal pages (Privacy Policy / Terms of Service)
  useEffect(() => {
    if (activeTab === 'privacy' || activeTab === 'terms') {
      setSidebarCollapsed(true);
    }
  }, [activeTab]);

  const [isSignInModalOpen, setIsSignInModalOpen] = useState<boolean>(false);

  const handleSignInSuccess = (user: User, destination: ActiveTab = 'calendar') => {
    console.log('App: Sign-in success, updating user state and navigating to:', destination);
    setCurrentUser(user);
    localStorage.setItem('uniwork_user_session', JSON.stringify(user));
    setIsSignInModalOpen(false);
    setActiveTab(destination);
    console.log('App: State updated, modal closed, tab set to:', destination);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('uniwork_user_session');
    setActiveTab('about');
    setIsSignInModalOpen(false);
  };

  const handleDeleteAccountAndData = async () => {
    const userId = currentUser?.id || null;
    try {
      // 1. Call server API to delete account and all rows from PostgreSQL database tables
      await fetch(`/api/account?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        }
      });

      // 2. Clear all local cached states
      localStorage.removeItem('uniwork_user_session');
      localStorage.removeItem(`uniwork_tags_${userId}`);
      localStorage.removeItem(`uniwork_events_${userId}`);
      localStorage.removeItem(`uniwork_tasks_${userId}`);
      localStorage.removeItem(`uniwork_task_groups_${userId}`);
      localStorage.removeItem(`uniwork_goals_${userId}`);

      // 3. Reset React runtime states to empty
      setEvents([]);
      setTasks([]);
      setGoals([]);
      setCurrentUser(null);
      setActiveTab('about');
      setIsSignInModalOpen(false);

      setToastMessage({
        message: 'Account and all data successfully removed from database',
        type: 'success'
      });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to wipe account and data:', err);
      setToastMessage({
        message: 'Failed to delete account data',
        type: 'error'
      });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };


  // Real-time device type detection, viewport tracking, and adaptive layout profile orchestrator
  const [deviceType, setDeviceType] = useState<'Laptop' | 'Tablet' | 'Phone'>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1440;
    if (width < 768) return 'Phone';
    if (width < 1024) return 'Tablet';
    return 'Laptop';
  });

  const [deviceOverride, setDeviceOverride] = useState<'auto' | 'Phone' | 'Tablet' | 'Laptop'>(() => {
    return (localStorage.getItem('uniwork_device_override') as any) || 'auto';
  });

  const handleSetDeviceOverride = (mode: 'auto' | 'Phone' | 'Tablet' | 'Laptop') => {
    setDeviceOverride(mode);
    localStorage.setItem('uniwork_device_override', mode);
  };

  const effectiveDeviceType = deviceOverride !== 'auto' ? deviceOverride : deviceType;

  const [screenSize, setScreenSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setScreenSize({ width, height });

      // Determine Device Category
      let detected: 'Laptop' | 'Tablet' | 'Phone' = 'Laptop';
      if (width < 768) {
        detected = 'Phone';
      } else if (width < 1024) {
        detected = 'Tablet';
      } else {
        // Double-check touch screen laptop sized tablets (e.g., iPad Pro)
        const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        if (width <= 1280 && isTouch && isMobileUA) {
          detected = 'Tablet';
        }
      }
      setDeviceType(detected);

      // Apply the ideal responsive layout design
      if (detected === 'Phone' || detected === 'Tablet') {
        setSidebarCollapsed(true);
      } else {
        if (activeTab !== 'about') {
          setSidebarCollapsed(false);
        }
      }
    };

    handleResize(); // Trigger initial execution
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  // Auto-collapse sidebar immediately when About page is opened or on mobile/tablet
  useEffect(() => {
    if (activeTab === 'about' || effectiveDeviceType === 'Phone' || effectiveDeviceType === 'Tablet') {
      setSidebarCollapsed(true);
    }
  }, [activeTab, effectiveDeviceType]);

  // Core Data States
  const [tags, setTags] = useState<Tag[]>(() => {
    const userId = 'usr-mathias-cheow-primary';
    const saved = localStorage.getItem(`uniwork_tags_${userId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Tag[];
        const savedOrder = localStorage.getItem(`uniwork_tag_order_${userId}`);
        if (savedOrder) {
          const orderIds = JSON.parse(savedOrder) as string[];
          parsed.sort((a, b) => {
            const idxA = orderIds.indexOf(a.id);
            const idxB = orderIds.indexOf(b.id);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
        }
        return parsed;
      } catch (e) {
        console.warn('Failed parsing cached tags:', e);
      }
    }
    return INITIAL_TAGS;
  });
  const [groups, setGroups] = useState<TaskGroup[]>(INITIAL_GROUPS);
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);

  // Automatically restore active server-side focus session from PostgreSQL on page reload
  useEffect(() => {
    const userId = currentUser?.id || null;
    fetch(`/api/focus/active?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.session) {
          const s = data.session;
          const matchingTask = tasks.find((t) => t.id === s.taskId);
          if (matchingTask) {
            setActiveFocusTask(matchingTask);
          } else {
            setActiveFocusTask({
              id: s.taskId || 'open',
              title: s.taskId === 'open' ? 'Focus Session' : 'Active Focus Task',
              status: 'in-progress',
            });
          }
          setIsFocusRunning(Boolean(s.isRunning));
        }
      })
      .catch(() => {});
  }, [currentUser, tasks.length]);

  // Modal Control States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>(undefined);
  const [modalDefaultStartTime, setModalDefaultStartTime] = useState<string | undefined>(undefined);
  const [modalDefaultEndTime, setModalDefaultEndTime] = useState<string | undefined>(undefined);
  const [modalAnchorPosition, setModalAnchorPosition] = useState<{ top: number; left: number; right: number; bottom: number; width: number; height: number } | null>(null);
  
  const [modalEditMode, setModalEditMode] = useState(false);
  const [modalEditItemType, setModalEditItemType] = useState<'event' | 'task' | undefined>(undefined);
  const [modalEditItem, setModalEditItem] = useState<CalendarEvent | Task | null>(null);
  const [modalEditOccurrenceDate, setModalEditOccurrenceDate] = useState<string | undefined>(undefined);
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error'>('synced');
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [flyingPointsBanner, setFlyingPointsBanner] = useState<{ taskTitle: string; points: number } | null>(null);
  const [calendarGap, setCalendarGap] = useState<number>(2);
  const [snapInterval, setSnapInterval] = useState<number>(10);
  const [recurrenceBehavior, setRecurrenceBehavior] = useState<'ask' | 'one' | 'all'>('ask');

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Timestamp and dynamic protection window (1/4 second initial, 1/2 second on failure/retry)
  const lastLocalMutationTimeRef = useRef<number>(0);
  const currentProtectionWindowRef = useRef<number>(250);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isProtectedFromSync = () => {
    return Date.now() - lastLocalMutationTimeRef.current < currentProtectionWindowRef.current;
  };

  // Poll DB status every 30 seconds to keep logo/connection state updated cleanly in real-time
  useEffect(() => {
    const checkDbStatus = () => {
      fetch('/api/db-status')
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.connected === 'boolean') {
            setDbConnected(data.connected);
          }
        })
        .catch(() => setDbConnected(false));
    };

    checkDbStatus(); // Check immediately on mount
    const interval = setInterval(checkDbStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Safe fetch functions for real-time synchronization with dynamic quiet protection
  const fetchTags = (force = false) => {
    if (!force && isProtectedFromSync()) return;
    const userId = currentUser?.id || null;
    fetch(`/api/tags?userId=${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then((data: Tag[]) => {
        if (!force && isProtectedFromSync()) return;
        if (Array.isArray(data)) {
          const formatted = data.map(t => ({
            ...t,
            bgColor: t.bgColor || `bg-${t.color}-100`,
            textColor: t.textColor || `text-${t.color}-700`,
            borderColor: t.borderColor || `border-${t.color}-200`,
            visible: t.visible ?? true
          }));

          // Sort formatted tags based on the saved order in localStorage
          const savedOrder = localStorage.getItem(`uniwork_tag_order_${userId}`);
          if (savedOrder) {
            try {
              const orderIds = JSON.parse(savedOrder) as string[];
              formatted.sort((a, b) => {
                const idxA = orderIds.indexOf(a.id);
                const idxB = orderIds.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
              });
            } catch (e) {
              console.warn('Failed to sort tags:', e);
            }
          }

          setTags(formatted);
        }
      })
      .catch(() => {
        const saved = localStorage.getItem(`uniwork_tags_${userId}`);
        if (saved && !isProtectedFromSync()) {
          try {
            const parsed = JSON.parse(saved) as Tag[];
            const savedOrder = localStorage.getItem(`uniwork_tag_order_${userId}`);
            if (savedOrder) {
              const orderIds = JSON.parse(savedOrder) as string[];
              parsed.sort((a, b) => {
                const idxA = orderIds.indexOf(a.id);
                const idxB = orderIds.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
              });
            }
            setTags(parsed);
          } catch (e) {
            setTags(JSON.parse(saved));
          }
        }
      });
  };

  const fetchEvents = (force = false) => {
    if (!force && isProtectedFromSync()) return;
    const userId = currentUser?.id || null;
    fetch(`/api/events?userId=${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then((data: CalendarEvent[]) => {
        if (!force && isProtectedFromSync()) return;
        if (Array.isArray(data)) {
          setEvents(data);
        }
      })
      .catch(() => {
        const saved = localStorage.getItem(`uniwork_events_${userId}`);
        if (saved && !isProtectedFromSync()) setEvents(JSON.parse(saved));
      });
  };

  const fetchTasks = (force = false) => {
    if (!force && isProtectedFromSync()) return;
    const userId = currentUser?.id || null;
    fetch(`/api/tasks?userId=${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then((data: Task[]) => {
        if (!force && isProtectedFromSync()) return;
        if (Array.isArray(data)) {
          const mapped = data.map(t => ({
            ...t,
            groupId: t.groupId || 'group-1'
          }));
          setTasks(mapped);

          // Restore or clear active server focus session
          fetch(`/api/focus/active?userId=${encodeURIComponent(userId)}`)
            .then(r => r.json())
            .then(focusData => {
              if (focusData.success && focusData.session && focusData.session.taskId) {
                const found = mapped.find(t => t.id === focusData.session.taskId);
                if (found && found.status !== 'done') {
                  setActiveFocusTask(found);
                  setIsFocusRunning(focusData.session.isRunning);
                } else {
                  setActiveFocusTask(null);
                  setIsFocusRunning(false);
                }
              } else if (focusData.success && !focusData.session) {
                setActiveFocusTask(null);
                setIsFocusRunning(false);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        const saved = localStorage.getItem(`uniwork_tasks_${userId}`);
        if (saved && !isProtectedFromSync()) setTasks(JSON.parse(saved));
      });
  };

  const fetchGroups = (force = false) => {
    if (!force && isProtectedFromSync()) return;
    const userId = currentUser?.id || null;
    fetch(`/api/groups?userId=${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then((data: TaskGroup[]) => {
        if (!force && isProtectedFromSync()) return;
        if (Array.isArray(data)) {
          setGroups(data);
        }
      })
      .catch(() => {
        const saved = localStorage.getItem(`uniwork_groups_${userId}`);
        if (saved && !isProtectedFromSync()) setGroups(JSON.parse(saved));
      });
  };

  const fetchGoals = (force = false) => {
    if (!force && isProtectedFromSync()) return;
    const userId = currentUser?.id || null;
    fetch(`/api/goals?userId=${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then((data: Goal[]) => {
        if (!force && isProtectedFromSync()) return;
        if (Array.isArray(data)) {
          setGoals(data);
        }
      })
      .catch(() => {
        const saved = localStorage.getItem(`uniwork_goals_${userId}`);
        if (saved && !isProtectedFromSync()) setGoals(JSON.parse(saved));
      });
  };

  const fetchSettings = (force = false) => {
    if (!force && isProtectedFromSync()) return;
    const userId = currentUser?.id || null;
    fetch(`/api/settings?userId=${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then((data: Record<string, string>) => {
        if (!force && isProtectedFromSync()) return;
        if (data) {
          if (data.calendarGap !== undefined) {
            const val = parseInt(data.calendarGap, 10);
            if (!isNaN(val)) setCalendarGap(val);
          }
          if (data.snapInterval !== undefined) {
            const val = parseInt(data.snapInterval, 10);
            if (!isNaN(val) && [5, 10, 15, 30].includes(val)) setSnapInterval(val);
          }
          if (data.recurrenceBehavior !== undefined) {
            const b = data.recurrenceBehavior as 'ask' | 'one' | 'all';
            if (['ask', 'one', 'all'].includes(b)) {
              setRecurrenceBehavior(b);
            }
          }
          if (data.themePreference === 'auto' || data.themePreference === 'day' || data.themePreference === 'night') {
            setThemePreference(data.themePreference);
            localStorage.setItem('uniwork_theme_pref', data.themePreference);
          }
          if (data.adminPassword) {
            setAdminPassword(data.adminPassword);
            localStorage.setItem('uniwork_admin_pw', data.adminPassword);
          }
          if (data.allowedAdminUserIds) {
            try {
              const parsed = JSON.parse(data.allowedAdminUserIds);
              if (Array.isArray(parsed)) {
                setAllowedAdminUserIds(parsed);
                localStorage.setItem('uniwork_admin_users', JSON.stringify(parsed));
              }
            } catch (e) {}
          }
          if (data.isGuideModeArmed !== undefined) {
            const armed = data.isGuideModeArmed === 'true';
            setIsGuideModeArmed(armed);
            localStorage.setItem('uniwork_guide_mode_armed', String(armed));
          }
          if (data.tagOrder) {
            try {
              const orderIds = JSON.parse(data.tagOrder) as string[];
              setTags(prevTags => {
                const sorted = [...prevTags];
                sorted.sort((a, b) => {
                  const idxA = orderIds.indexOf(a.id);
                  const idxB = orderIds.indexOf(b.id);
                  if (idxA === -1 && idxB === -1) return 0;
                  if (idxA === -1) return 1;
                  if (idxB === -1) return -1;
                  return idxA - idxB;
                });
                return sorted;
              });
            } catch (e) {
              console.warn('Failed parsing tagOrder setting:', e);
            }
          }
        }
      })
      .catch(() => {
        const savedGap = localStorage.getItem('larkcal_calendar_gap');
        if (savedGap) {
          const val = parseInt(savedGap, 10);
          if (!isNaN(val)) setCalendarGap(val);
        }
        const savedSnap = localStorage.getItem('larkcal_snap_interval');
        if (savedSnap) {
          const val = parseInt(savedSnap, 10);
          if (!isNaN(val)) setSnapInterval(val);
        }
        const savedBehavior = localStorage.getItem('larkcal_recurrence_behavior');
        if (savedBehavior && ['ask', 'one', 'all'].includes(savedBehavior)) {
          setRecurrenceBehavior(savedBehavior as 'ask' | 'one' | 'all');
        }
      });
  };

  // Safe unified sync function that honors the 1/4s - 1/2s quiet window
  const safeSyncAll = (force = false) => {
    if (!force && isProtectedFromSync()) {
      const remaining = Math.max(50, currentProtectionWindowRef.current - (Date.now() - lastLocalMutationTimeRef.current));
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        safeSyncAll(false);
      }, remaining);
      return;
    }

    fetchTags(force);
    fetchEvents(force);
    fetchTasks(force);
    fetchGroups(force);
    fetchGoals(force);
    fetchSettings(force);
  };

  const handleSaveTagsOrder = async (orderedTags: Tag[]) => {
    setTags(orderedTags);
    const userId = getActiveUserId();
    const orderIds = orderedTags.map(t => t.id);
    localStorage.setItem(`uniwork_tag_order_${userId}`, JSON.stringify(orderIds));
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagOrder: JSON.stringify(orderIds), userId }),
      });
    } catch (err) {
      console.error('Error saving tagOrder to DB:', err);
    }
    showToast('Tag order priority updated', 'success');
  };

  const getActiveUserId = (): string => {
    if (currentUser?.id) return currentUser.id;
    try {
      const savedUser = localStorage.getItem('uniwork_user_session');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u && u.id) return u.id;
      }
    } catch {}
    return 'usr-mathias-cheow-primary';
  };

  const handleSaveCalendarGap = async (gap: number) => {
    setCalendarGap(gap);
    localStorage.setItem('larkcal_calendar_gap', String(gap));
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarGap: String(gap), userId: getActiveUserId() }),
      });
    } catch (err) {
      console.error('Error saving calendarGap to DB:', err);
    }
  };

  const handleSaveSnapInterval = async (interval: number) => {
    setSnapInterval(interval);
    localStorage.setItem('larkcal_snap_interval', String(interval));
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapInterval: String(interval), userId: getActiveUserId() }),
      });
    } catch (err) {
      console.error('Error saving snapInterval to DB:', err);
    }
  };

  const handleSaveRecurrenceBehavior = async (behavior: 'ask' | 'one' | 'all') => {
    setRecurrenceBehavior(behavior);
    localStorage.setItem('larkcal_recurrence_behavior', behavior);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recurrenceBehavior: behavior, userId: getActiveUserId() }),
      });
    } catch (err) {
      console.error('Error saving recurrenceBehavior to DB:', err);
    }
  };

  // Prevent browser from programmatically scrolling layout out of viewport limits (e.g. on focus/layout shifts)
  useEffect(() => {
    const preventAccidentalScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
      if (document.body.scrollTop !== 0 || document.body.scrollLeft !== 0) {
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
      }
      if (document.documentElement.scrollTop !== 0 || document.documentElement.scrollLeft !== 0) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
      }
    };
    window.addEventListener('scroll', preventAccidentalScroll, { passive: true });
    document.addEventListener('scroll', preventAccidentalScroll, { passive: true });
    
    // Quick interval check on startup and mount to enforce layout lock
    const layoutLockInterval = setInterval(preventAccidentalScroll, 100);
    const stopTimer = setTimeout(() => clearInterval(layoutLockInterval), 2000);
    
    return () => {
      window.removeEventListener('scroll', preventAccidentalScroll);
      document.removeEventListener('scroll', preventAccidentalScroll);
      clearInterval(layoutLockInterval);
      clearTimeout(stopTimer);
    };
  }, []);

  // 1. Initial hydration on user mount or change
  useEffect(() => {
    safeSyncAll(true);
  }, [currentUser?.id]);

  // 2. Real-time SSE updates with 10-second protection window
  useEffect(() => {
    const eventSource = new EventSource('/api/events-stream');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'update') {
          safeSyncAll(false);
        }
      } catch (err) {
        console.error("Error parsing SSE update:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser?.id]);

  // 3. Multi-Device Focus Sync: Safe re-fetch with 10-second quiet window
  useEffect(() => {
    const handleSync = () => {
      safeSyncAll(false);
    };

    window.addEventListener('focus', handleSync);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser?.id]);

  // Sync to localstorage as quick local cache fallback
  useEffect(() => {
    const uid = getActiveUserId();
    localStorage.setItem(`uniwork_tags_${uid}`, JSON.stringify(tags));
    localStorage.setItem('larkcal_tags', JSON.stringify(tags));
  }, [tags, currentUser?.id]);

  useEffect(() => {
    const uid = getActiveUserId();
    localStorage.setItem(`uniwork_events_${uid}`, JSON.stringify(events));
    localStorage.setItem('larkcal_events', JSON.stringify(events));
  }, [events, currentUser?.id]);

  useEffect(() => {
    const uid = getActiveUserId();
    localStorage.setItem(`uniwork_tasks_${uid}`, JSON.stringify(tasks));
    localStorage.setItem('larkcal_tasks', JSON.stringify(tasks));
  }, [tasks, currentUser?.id]);

  useEffect(() => {
    const uid = getActiveUserId();
    localStorage.setItem(`uniwork_groups_${uid}`, JSON.stringify(groups));
    localStorage.setItem('larkcal_groups', JSON.stringify(groups));
  }, [groups, currentUser?.id]);

  useEffect(() => {
    const uid = getActiveUserId();
    localStorage.setItem(`uniwork_goals_${uid}`, JSON.stringify(goals));
    localStorage.setItem('larkcal_goals', JSON.stringify(goals));
  }, [goals, currentUser?.id]);

  // Asynchronous Database Mutation Handler with 1/4s - 1/2s dynamic quiet window & persistent optimistic state
  const performVerifiedMutation = async (
    optimisticUpdate: () => void,
    rollback: () => void,
    apiCall: () => Promise<Response>,
    onSuccess?: () => void
  ) => {
    // 1/4 second (250ms) initial quiet window
    lastLocalMutationTimeRef.current = Date.now();
    currentProtectionWindowRef.current = 250;
    setSyncStatus('saving');
    optimisticUpdate();

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }

    try {
      let res = await apiCall();
      if (!res.ok) {
        // If 1/4 second response fails, extend quiet buffer to 500ms (1/2 second) and retry
        console.warn(`Database write response ${res.status}, extending buffer to 1/2 second and retrying`);
        currentProtectionWindowRef.current = 500;
        await new Promise(r => setTimeout(r, 250)); // wait 1/4 second before second attempt
        res = await apiCall();
      }

      if (!res.ok) {
        console.warn(`Database returned status ${res.status}, keeping local state with 1/2 second window`);
        currentProtectionWindowRef.current = 500;
        setSyncStatus('saving');
      } else {
        const data = await res.json().catch(() => ({ success: true }));
        if (data && data.success === false) {
          console.warn('Database note:', data.error);
        }
        setSyncStatus('synced');
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      console.warn('Database write delayed or error, extending buffer to 1/2 second:', err);
      currentProtectionWindowRef.current = 500;
      setSyncStatus('saving');
    } finally {
      // Reconcile after the active buffer (250ms or 500ms) has elapsed
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        if (!isProtectedFromSync()) {
          setSyncStatus('synced');
          safeSyncAll(false);
        }
      }, currentProtectionWindowRef.current);
    }
  };

  // Tag Handlers with Verified Write & Rollback
  const handleAddTag = (name: string, color: string) => {
    const prevTags = [...tags];
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name,
      color,
      bgColor: `bg-${color}-100`,
      textColor: `text-${color}-700`,
      borderColor: `border-${color}-200`,
      visible: true,
    };
    performVerifiedMutation(
      () => setTags([...tags, newTag]),
      () => setTags(prevTags),
      () => fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTag, userId: getActiveUserId() }),
      })
    );
  };

  const handleUpdateTag = (id: string, name: string, color: string) => {
    const prevTags = [...tags];
    const updatedTags = tags.map((tag) =>
      tag.id === id
        ? {
            ...tag,
            name,
            color,
            bgColor: `bg-${color}-100`,
            textColor: `text-${color}-700`,
            borderColor: `border-${color}-200`,
          }
        : tag
    );
    const updated = updatedTags.find(t => t.id === id);
    if (!updated) return;

    performVerifiedMutation(
      () => setTags(updatedTags),
      () => setTags(prevTags),
      () => fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updated, userId: getActiveUserId() }),
      })
    );
  };

  const handleDeleteTag = (id: string) => {
    if (id === 'default-work' || id === 'default-personal') return;

    const prevTags = [...tags];
    const prevEvents = [...events];
    const reassignedEvents = events.map((ev) => (ev.tagId === id ? { ...ev, tagId: 'default-work' } : ev));

    performVerifiedMutation(
      () => {
        setTags(tags.filter((t) => t.id !== id));
        setEvents(reassignedEvents);
      },
      () => {
        setTags(prevTags);
        setEvents(prevEvents);
      },
      () => fetch(`/api/tags/${id}`, { method: 'DELETE' })
    );
  };

  const handleToggleTagVisibility = (id: string) => {
    const prevTags = [...tags];
    const updated = tags.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t));
    const target = updated.find(t => t.id === id);
    if (!target) return;

    performVerifiedMutation(
      () => setTags(updated),
      () => setTags(prevTags),
      () => fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, userId: getActiveUserId() }),
      })
    );
  };

  // Event Handlers (Create, Edit, Delete) with Verified Write & Rollback
  const handleSaveEvent = (eventData: Omit<CalendarEvent, 'id'>, id?: string) => {
    const prevEvents = [...events];
    let payload: CalendarEvent;
    let nextEvents: CalendarEvent[];

    if (id) {
      // Edit mode
      nextEvents = events.map((ev) => (ev.id === id ? { ...ev, ...eventData } : ev));
      payload = nextEvents.find(e => e.id === id)!;
    } else {
      // Create mode
      payload = {
        id: `ev-${Date.now()}`,
        ...eventData,
      };
      nextEvents = [...events, payload];
    }

    performVerifiedMutation(
      () => setEvents(nextEvents),
      () => setEvents(prevEvents),
      () => fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, userId: getActiveUserId() }),
      })
    );
  };

  const handleUpdateEventFields = (id: string, updates: Partial<CalendarEvent>) => {
    const prevEvents = [...events];
    const updatedEvents = events.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev));
    const target = updatedEvents.find(e => e.id === id);
    if (!target) return;

    performVerifiedMutation(
      () => setEvents(updatedEvents),
      () => setEvents(prevEvents),
      () => fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, userId: getActiveUserId() }),
      })
    );
  };

  const handleSplitRecurringEvent = (
    recurringEventId: string,
    exceptDate: string,
    singleEventData: Omit<CalendarEvent, 'id'>
  ) => {
    const targetEv = events.find(e => e.id === recurringEventId);
    const masterId = targetEv?.recurringParentId || recurringEventId;
    const isAlreadySplit = targetEv && !!targetEv.recurringParentId;

    if (isAlreadySplit && targetEv) {
      // It's already a split single event being updated again as "This event"
      const prevEvents = [...events];
      const updatedEvents = events.map(ev => {
        if (ev.id === targetEv.id) {
          return {
            ...ev,
            ...singleEventData,
            recurringParentId: masterId,
            recurringOriginalDate: targetEv.recurringOriginalDate || exceptDate,
            recurringDays: undefined,
            exceptDates: undefined,
          };
        }
        return ev;
      });
      const updatedItem = updatedEvents.find(e => e.id === targetEv.id);
      performVerifiedMutation(
        () => setEvents(updatedEvents),
        () => setEvents(prevEvents),
        () => fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...updatedItem, userId: getActiveUserId() }),
        })
      );
      return;
    }

    const newSingleId = `ev-${Date.now()}`;
    const newSingle: CalendarEvent = {
      id: newSingleId,
      ...singleEventData,
      recurringParentId: masterId,
      recurringOriginalDate: exceptDate,
      recurringDays: undefined,
      exceptDates: undefined,
    };

    let updatedOriginal: CalendarEvent | undefined;

    const prevEvents = [...events];
    const nextEvents = events.map((ev) => {
      if (ev.id === masterId) {
        const currentExcepts = ev.exceptDates || [];
        const nextExcepts = currentExcepts.includes(exceptDate) ? currentExcepts : [...currentExcepts, exceptDate];
        updatedOriginal = { ...ev, exceptDates: nextExcepts };
        return updatedOriginal;
      }
      return ev;
    }).concat(newSingle);

    performVerifiedMutation(
      () => setEvents(nextEvents),
      () => setEvents(prevEvents),
      async () => {
        if (updatedOriginal) {
          await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...updatedOriginal, userId: getActiveUserId() }),
          });
        }
        return fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newSingle, userId: getActiveUserId() }),
        });
      }
    );
  };

  const handleUpdateRecurringSeries = (
    eventId: string,
    updates: Partial<CalendarEvent>
  ) => {
    const targetEv = events.find(e => e.id === eventId);
    const masterId = targetEv?.recurringParentId || eventId;
    const prevEvents = [...events];

    // Update the master event and clear obsolete split overrides for this series so new series timing takes effect cleanly
    let updatedMaster: CalendarEvent | undefined;
    const nextEvents = events
      .filter(ev => {
        // If this is a split child of the series, remove it so the updated series applies cleanly across all occurrences
        if (ev.recurringParentId === masterId) return false;
        return true;
      })
      .map(ev => {
        if (ev.id === masterId) {
          updatedMaster = {
            ...ev,
            ...updates,
            exceptDates: [], // Reset exceptDates when updating entire series
          };
          return updatedMaster;
        }
        return ev;
      });

    performVerifiedMutation(
      () => setEvents(nextEvents),
      () => setEvents(prevEvents),
      async () => {
        if (updatedMaster) {
          return fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...updatedMaster, userId: getActiveUserId() }),
          });
        }
      }
    );
  };

  const handleDeleteEvent = (id: string) => {
    const prevEvents = [...events];
    performVerifiedMutation(
      () => setEvents(events.filter((ev) => ev.id !== id && ev.recurringParentId !== id)),
      () => setEvents(prevEvents),
      () => fetch(`/api/events/${id}`, { method: 'DELETE' })
    );
  };

  // Task Handlers with Verified Write & Rollback
  const handleAddTask = (
    title: string,
    date: string,
    startTime?: string,
    status: TaskStatus = 'todo',
    groupId: string = 'group-1',
    endTime?: string,
    goalId?: string,
    goalName?: string
  ) => {
    const prevTasks = [...tasks];
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      date,
      startTime,
      endTime,
      status,
      groupId,
      goalId,
      goalName,
    };
    performVerifiedMutation(
      () => setTasks([...tasks, newTask]),
      () => setTasks(prevTasks),
      () => fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, userId: getActiveUserId() }),
      })
    );
  };

  const handleSaveTask = (taskData: Omit<Task, 'id'>, id?: string) => {
    const prevTasks = [...tasks];
    let payload: Task;
    let nextTasks: Task[];

    // Check if we are creating a new calendar block but it is linked to an existing daily task of the same title/group/date
    const linkedTask = !id ? tasks.find((t) => t.title === taskData.title && t.groupId === taskData.groupId && t.date === taskData.date) : null;

    if (id) {
      nextTasks = tasks.map((t) => (t.id === id ? { ...t, ...taskData } : t));
      payload = nextTasks.find(t => t.id === id)!;
    } else if (linkedTask) {
      // Write back directly to the existing daily task instead of creating a duplicate!
      nextTasks = tasks.map((t) => (t.id === linkedTask.id ? { ...t, ...taskData } : t));
      payload = nextTasks.find(t => t.id === linkedTask.id)!;
    } else {
      payload = {
        id: `task-${Date.now()}`,
        ...taskData,
        groupId: taskData.groupId || 'group-1',
      };
      nextTasks = [...tasks, payload];
    }

    if (id && activeFocusTask?.id === id) {
      setActiveFocusTask(payload);
    }

    performVerifiedMutation(
      () => setTasks(nextTasks),
      () => setTasks(prevTasks),
      () => fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, userId: getActiveUserId() }),
      })
    );
  };

  const handleUpdateTaskFields = (id: string, updates: Partial<Task>) => {
    const prevTasks = [...tasks];
    const updatedTasks = tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
    const target = updatedTasks.find(t => t.id === id);
    if (!target) return;

    if (activeFocusTask?.id === id) {
      setActiveFocusTask(target);
    }

    performVerifiedMutation(
      () => setTasks(updatedTasks),
      () => setTasks(prevTasks),
      () => fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, userId: getActiveUserId() }),
      })
    );
  };

  const handleDeleteTask = (id: string, hardDelete = false) => {
    if (!hardDelete) {
      // Soft-unschedule: clear calendar coordinates so task becomes unplanned but is NOT deleted
      handleUpdateTaskFields(id, { startTime: undefined, endTime: undefined });
      return;
    }
    const prevTasks = [...tasks];
    if (activeFocusTask?.id === id) {
      setActiveFocusTask(null);
    }
    fetch('/api/focus/session/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: id, userId: getActiveUserId() }),
    }).catch(() => {});

    performVerifiedMutation(
      () => setTasks(tasks.filter((t) => t.id !== id)),
      () => setTasks(prevTasks),
      () => fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    );
  };

  const handleToggleTaskStatus = (taskId: string) => {
    const prevTasks = [...tasks];
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, status: (t.status === 'done' ? 'todo' : 'done') as TaskStatus } : t
    );
    const target = updatedTasks.find(t => t.id === taskId);
    if (!target) return;

    if (target.status === 'done') {
      if (activeFocusTask?.id === taskId) {
        setActiveFocusTask(null);
      }
      fetch('/api/focus/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, userId: getActiveUserId() }),
      }).catch(() => {});
    }

    performVerifiedMutation(
      () => setTasks(updatedTasks),
      () => setTasks(prevTasks),
      () => fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, userId: getActiveUserId() }),
      })
    );
  };

  // Focus Timer Handlers
  const handleStartTaskInFocus = (task: Task) => {
    setActiveFocusTask(task);
    setIsFocusRunning(false); // Only runs when user explicitly presses Start Timer in the Focus Room
    setSidebarCollapsed(true);
    setActiveTab('focus');
  };

  const handleCompleteFocusTask = (
    focusTask: Task | null,
    timeDeltaMinutes: number,
    resolution: 'keep' | 'push' | 'shorten' | 'pull' | 'keep_original'
  ) => {
    if (focusTask) {
      const prevTasks = [...tasks];
      const prevEvents = [...events];

      // Helper to parse "HH:MM" into minutes
      const timeToMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      // Helper to format minutes to "HH:MM"
      const minToTime = (min: number) => {
        const clamped = Math.max(0, Math.min(23 * 60 + 59, min));
        const h = Math.floor(clamped / 60);
        const m = clamped % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      let updatedTasks = [...tasks];
      let updatedEvents = [...events];

      if ((resolution === 'shorten' || resolution === 'pull') && timeDeltaMinutes > 0 && focusTask.startTime && focusTask.endTime) {
        const startMin = timeToMin(focusTask.startTime);
        const oldEndMin = timeToMin(focusTask.endTime);
        const newEndMin = Math.max(startMin + 1, oldEndMin - timeDeltaMinutes);

        updatedTasks = updatedTasks.map((t) =>
          t.id === focusTask.id
            ? {
                ...t,
                status: 'done' as TaskStatus,
                completedAt: new Date().toISOString(),
                endTime: minToTime(newEndMin),
              }
            : t
        );

        if (resolution === 'pull' && focusTask.date) {
          // Pull subsequent tasks up on the same date
          updatedTasks = updatedTasks.map((t) => {
            if (t.id !== focusTask.id && t.date === focusTask.date && t.startTime && t.endTime) {
              const tStartMin = timeToMin(t.startTime);
              if (tStartMin >= oldEndMin) {
                const newStartMin = Math.max(newEndMin, tStartMin - timeDeltaMinutes);
                const duration = timeToMin(t.endTime) - tStartMin;
                return {
                  ...t,
                  startTime: minToTime(newStartMin),
                  endTime: minToTime(newStartMin + duration),
                };
              }
            }
            return t;
          });

          // Pull subsequent events up on the same date
          updatedEvents = updatedEvents.map((ev) => {
            if (ev.date === focusTask.date && ev.startTime && ev.endTime) {
              const evStartMin = timeToMin(ev.startTime);
              if (evStartMin >= oldEndMin) {
                const newStartMin = Math.max(newEndMin, evStartMin - timeDeltaMinutes);
                const duration = timeToMin(ev.endTime) - evStartMin;
                return {
                  ...ev,
                  startTime: minToTime(newStartMin),
                  endTime: minToTime(newStartMin + duration),
                };
              }
            }
            return ev;
          });
        }
      } else if ((resolution === 'keep' || resolution === 'push') && timeDeltaMinutes > 0 && focusTask.endTime) {
        // Overtime completion with 'keep' (allow overlap) or 'push' (shift schedule down)
        const oldEndMin = timeToMin(focusTask.endTime);
        const newEndMin = oldEndMin + timeDeltaMinutes;

        updatedTasks = updatedTasks.map((t) =>
          t.id === focusTask.id
            ? {
                ...t,
                status: 'done' as TaskStatus,
                completedAt: new Date().toISOString(),
                endTime: minToTime(newEndMin),
              }
            : t
        );

        // If push resolution selected, shift subsequent tasks & events on that date
        if (resolution === 'push' && focusTask.date) {
          const taskEndMin = oldEndMin;

          // Shift subsequent tasks on same date
          updatedTasks = updatedTasks.map((t) => {
            if (t.id !== focusTask.id && t.date === focusTask.date && t.startTime && t.endTime) {
              const tStartMin = timeToMin(t.startTime);
              if (tStartMin >= taskEndMin) {
                const newStartMin = tStartMin + timeDeltaMinutes;
                const newEndMinVal = timeToMin(t.endTime) + timeDeltaMinutes;
                return {
                  ...t,
                  startTime: minToTime(newStartMin),
                  endTime: minToTime(newEndMinVal),
                };
              }
            }
            return t;
          });

          // Shift subsequent events on same date
          updatedEvents = updatedEvents.map((ev) => {
            if (ev.date === focusTask.date && ev.startTime && ev.endTime) {
              const evStartMin = timeToMin(ev.startTime);
              if (evStartMin >= taskEndMin) {
                const newStartMin = evStartMin + timeDeltaMinutes;
                const newEndMinVal = timeToMin(ev.endTime) + timeDeltaMinutes;
                return {
                  ...ev,
                  startTime: minToTime(newStartMin),
                  endTime: minToTime(newEndMinVal),
                };
              }
            }
            return ev;
          });
        }
      } else {
        // Standard completion or keep_original
        updatedTasks = updatedTasks.map((t) =>
          t.id === focusTask.id
            ? {
                ...t,
                status: 'done' as TaskStatus,
                completedAt: new Date().toISOString(),
              }
            : t
        );
      }

      performVerifiedMutation(
        () => {
          setTasks(updatedTasks);
          setEvents(updatedEvents);
        },
        () => {
          setTasks(prevTasks);
          setEvents(prevEvents);
        },
        () => {
          const updatedTask = updatedTasks.find((t) => t.id === focusTask.id);
          return fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...(updatedTask || focusTask), status: 'done', userId: getActiveUserId() }),
          });
        }
      );
    }

    if (focusTask) {
      const calculatedPoints = Math.max(5, Math.round(timeDeltaMinutes * 2));
      setFlyingPointsBanner({
        taskTitle: focusTask.title,
        points: calculatedPoints,
      });
      setTimeout(() => {
        setFlyingPointsBanner(null);
      }, 4000);
    }

    setActiveFocusTask(null);
    setIsFocusRunning(false);
    setActiveTab('calendar');
  };

  const handleEndFocusIncomplete = () => {
    if (activeFocusTask) {
      fetch('/api/focus/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: activeFocusTask.id,
          userId: getActiveUserId(),
          status: 'incomplete',
          isIncomplete: true,
        }),
      }).catch(() => {});
    }
    setActiveFocusTask(null);
    setIsFocusRunning(false);
    setActiveTab('calendar');
  };

  // Goals Handlers with Verified Write & Rollback
  const handleAddGoal = (goalData: Omit<Goal, 'id'>) => {
    const prevGoals = [...goals];
    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      startDate: getLocalISODate(),
      deadlineType: goalData.deadlineType || 'weekly',
      completed: false,
      ...goalData,
    };
    performVerifiedMutation(
      () => setGoals([...goals, newGoal]),
      () => setGoals(prevGoals),
      () => fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newGoal, userId: getActiveUserId() }),
      })
    );
  };

  const handleUpdateGoal = (id: string, updates: Partial<Goal>) => {
    const prevGoals = [...goals];
    const updated = goals.map(g => g.id === id ? { ...g, ...updates } : g);
    const target = updated.find(g => g.id === id);
    if (!target) return;

    performVerifiedMutation(
      () => setGoals(updated),
      () => setGoals(prevGoals),
      () => fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, userId: getActiveUserId() }),
      })
    );
  };

  const handleToggleGoalComplete = (id: string) => {
    const prevGoals = [...goals];
    const target = goals.find(g => g.id === id);
    if (!target) return;
    const isNowCompleted = !target.completed;
    const updated = goals.map(g => g.id === id ? { 
      ...g, 
      completed: isNowCompleted,
      completedAt: isNowCompleted ? new Date().toISOString() : undefined 
    } : g);
    const updatedTarget = updated.find(g => g.id === id);

    performVerifiedMutation(
      () => setGoals(updated),
      () => setGoals(prevGoals),
      () => fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedTarget, userId: getActiveUserId() }),
      })
    );
  };

  const handleDeleteGoal = (id: string) => {
    const prevGoals = [...goals];
    const prevEvents = [...events];
    const prevTasks = [...tasks];

    performVerifiedMutation(
      () => {
        setGoals(goals.filter(g => g.id !== id));
        setEvents(events.map(e => e.goalId === id ? { ...e, goalId: undefined } : e));
        setTasks(tasks.map(t => t.goalId === id ? { ...t, goalId: undefined } : t));
      },
      () => {
        setGoals(prevGoals);
        setEvents(prevEvents);
        setTasks(prevTasks);
      },
      () => fetch(`/api/goals/${id}`, { method: 'DELETE' })
    );
  };

  // Group Handlers with Verified Write & Rollback
  const handleAddGroup = (name: string, color?: string) => {
    const prevGroups = [...groups];
    const newGroup = {
      id: `group-${Date.now()}`,
      name,
      color,
    };
    performVerifiedMutation(
      () => setGroups([...groups, newGroup]),
      () => setGroups(prevGroups),
      () => fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newGroup, userId: getActiveUserId() }),
      })
    );
  };

  const handleUpdateGroup = (id: string, name: string, color?: string) => {
    const prevGroups = [...groups];
    const updated = groups.map(g => g.id === id ? { ...g, name, color: color !== undefined ? color : g.color } : g);
    const target = updated.find(g => g.id === id);
    if (!target) return;

    performVerifiedMutation(
      () => setGroups(updated),
      () => setGroups(prevGroups),
      () => fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, userId: getActiveUserId() }),
      })
    );
  };

  const handleDeleteGroup = (id: string) => {
    if (id === 'group-1') return; // Cannot delete core group
    const prevGroups = [...groups];
    const prevTasks = [...tasks];

    performVerifiedMutation(
      () => {
        setGroups(groups.filter(g => g.id !== id));
        setTasks(tasks.map(t => t.groupId === id ? { ...t, groupId: 'group-1' } : t));
      },
      () => {
        setGroups(prevGroups);
        setTasks(prevTasks);
      },
      () => fetch(`/api/groups/${id}`, { method: 'DELETE' })
    );
  };

  // Modal Open Hooks
  const handleModalTimeChange = (date: string, startTime: string, endTime: string) => {
    setModalDefaultDate(date);
    setModalDefaultStartTime(startTime);
    setModalDefaultEndTime(endTime);
  };

  const handleOpenCreateModal = (dateString: string, startTime?: string, endTime?: string, anchorPos?: { top: number; left: number; right: number; bottom: number; width: number; height: number } | null) => {
    setModalDefaultDate(dateString);
    setModalDefaultStartTime(startTime);
    setModalDefaultEndTime(endTime);
    setModalAnchorPosition(anchorPos || null);
    setModalEditMode(false);
    setModalEditItem(null);
    setModalEditItemType(undefined);
    setModalEditOccurrenceDate(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (type: 'event' | 'task', item: CalendarEvent | Task, occurrenceDate?: string, anchorPos?: { top: number; left: number; right: number; bottom: number; width: number; height: number } | null) => {
    setModalEditMode(true);
    setModalEditItemType(type);
    setModalEditItem(item);
    setModalEditOccurrenceDate(occurrenceDate);
    setModalAnchorPosition(anchorPos || null);
    setIsModalOpen(true);
  };

  if (isSignInModalOpen) {
    return (
      <SignInView
        onSignInSuccess={handleSignInSuccess}
        onExploreAbout={() => {
          setActiveTab('about');
          setIsSignInModalOpen(false);
        }}
        onNavigateLegal={(type) => {
          setActiveTab(type);
          setIsSignInModalOpen(false);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen h-[100dvh] w-screen w-[100dvw] max-w-full max-h-full bg-slate-100 dark:bg-[#070A11] text-slate-800 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200" id="larkcal-root-layout">
      {/* 1. Left Sidebar - Visible ONLY when a user is authenticated */}
      {currentUser && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tags={tags}
          onAddTag={handleAddTag}
          onUpdateTag={handleUpdateTag}
          onDeleteTag={handleDeleteTag}
          onToggleTagVisibility={handleToggleTagVisibility}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          dbConnected={dbConnected}
          syncStatus={syncStatus}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          currentUser={currentUser}
          onOpenSignIn={() => setIsSignInModalOpen(true)}
          onSignOut={handleSignOut}
          allowedAdminUserIds={allowedAdminUserIds}
          isAboutTabVisible={isAboutTabVisible}
          isDark={effectiveThemeMode === 'night'}
          adminSubTab={adminSubTab}
          onSelectAdminSubTab={setAdminSubTab}
          adminUnreadCount={adminUnreadCount}
          isInsightsVisible={isInsightsVisible}
        />
      )}

      {/* Real-Time Sync & Rollback Notification Toast */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2.5 transition-all duration-300 border ${
          toastMessage.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            : toastMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-blue-50 dark:bg-blue-950/80 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            toastMessage.type === 'error' ? 'bg-rose-600 animate-ping' : 'bg-emerald-600'
          }`} />
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Floating Points Banner: Flies down in the middle displaying [Task Name] · +[Points] pts */}
      <AnimatePresence>
        {flyingPointsBanner && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 25 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] pointer-events-none select-none max-w-[90vw]"
          >
            <div className="flex items-center gap-2 sm:gap-2.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-slate-900/95 dark:bg-slate-950/95 text-white border border-cyan-500/40 shadow-2xl backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-100 max-w-[160px] sm:max-w-xs truncate">
                {flyingPointsBanner.taskTitle}
              </span>
              <span className="text-cyan-400 font-extrabold text-xs sm:text-sm">·</span>
              <span className="font-mono font-extrabold text-xs sm:text-sm text-cyan-400 whitespace-nowrap">
                +{flyingPointsBanner.points} pts
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main Content Display Area */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative bg-slate-100 dark:bg-[#070A11] ${currentUser && effectiveDeviceType === 'Phone' ? 'pb-16 md:pb-0' : ''}`} id="larkcal-main-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.995 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col h-full w-full overflow-hidden bg-slate-50 dark:bg-[#070A11]"
          >
            {activeTab === 'calendar' ? (
              <CalendarView
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                events={events}
                tasks={tasks}
                tags={tags}
                groups={groups}
                onOpenCreateModal={handleOpenCreateModal}
                onOpenEditModal={handleOpenEditModal}
                onToggleTaskStatus={handleToggleTaskStatus}
                onUpdateEvent={handleUpdateEventFields}
                onUpdateTask={handleUpdateTaskFields}
                onSaveEvent={handleSaveEvent}
                onSplitRecurringEvent={handleSplitRecurringEvent}
                onUpdateRecurringSeries={handleUpdateRecurringSeries}
                calendarGap={calendarGap}
                snapInterval={snapInterval}
                recurrenceBehavior={recurrenceBehavior}
                onSaveRecurrenceBehavior={handleSaveRecurrenceBehavior}
                isModalOpen={isModalOpen}
                modalDefaultDate={modalDefaultDate}
                modalDefaultStartTime={modalDefaultStartTime}
                modalDefaultEndTime={modalDefaultEndTime}
                modalEditItem={modalEditItem}
                onUpdateModalTimes={handleModalTimeChange}
                onStartTask={handleStartTaskInFocus}
                activeFocusTaskId={activeFocusTask?.id || null}
                activeFocusTask={activeFocusTask}
                isFocusRunning={isFocusRunning}
                onNavigateToFocus={() => setActiveTab('focus')}
                deviceType={effectiveDeviceType}
              />
            ) : activeTab === 'focus' ? (
              <FocusRoomView
                task={activeFocusTask}
                allTasks={tasks}
                tags={tags}
                userId={getActiveUserId()}
                initialRoomCode={initialFocusRoomCode}
                onCompleteTask={handleCompleteFocusTask}
                onEndIncomplete={handleEndFocusIncomplete}
                onTimerRunningChange={(running) => setIsFocusRunning(running)}
                onSetSidebarCollapsed={setSidebarCollapsed}
              />
            ) : activeTab === 'tasks' ? (
              <TasksView
                tasks={tasks}
                groups={groups}
                goals={goals}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTaskFields}
                onDeleteTask={handleDeleteTask}
                onOpenEditModal={handleOpenEditModal}
                onOpenCreateModal={handleOpenCreateModal}
                onAddGroup={handleAddGroup}
                onDeleteGroup={handleDeleteGroup}
                onUpdateGroup={handleUpdateGroup}
                onToggleTaskStatus={handleToggleTaskStatus}
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                activeFocusTask={activeFocusTask}
                isFocusRunning={isFocusRunning}
                onNavigateToFocus={() => setActiveTab('focus')}
              />
            ) : activeTab === 'goals' ? (
              <GoalsView
                goals={goals}
                events={events}
                tasks={tasks}
                tags={tags}
                groups={groups}
                onAddGoal={handleAddGoal}
                onUpdateGoal={handleUpdateGoal}
                onDeleteGoal={handleDeleteGoal}
                onToggleGoalComplete={handleToggleGoalComplete}
                activeFocusTask={activeFocusTask}
                isFocusRunning={isFocusRunning}
                onNavigateToFocus={() => setActiveTab('focus')}
              />
            ) : activeTab === 'insights' ? (
              <InsightsView
                tasks={tasks}
                events={events}
                tags={tags}
                groups={groups}
                goals={goals}
                onNavigateToFocus={() => setActiveTab('focus')}
              />
            ) : activeTab === 'about' ? (
              <AboutView 
                setActiveTab={setActiveTab} 
                onOpenSignIn={() => setIsSignInModalOpen(true)}
                currentUser={currentUser}
              />
            ) : activeTab === 'privacy' || activeTab === 'terms' ? (
              <LegalView
                type={activeTab}
                setActiveTab={setActiveTab}
              />
            ) : activeTab === 'admin' ? (
              <AdminView
                currentUser={currentUser}
                adminPassword={adminPassword}
                onUpdateAdminPassword={handleUpdateAdminPassword}
                allowedAdminUserIds={allowedAdminUserIds}
                onAddAdminUserId={handleAddAdminUserId}
                onRemoveAdminUserId={handleRemoveAdminUserId}
                isGuideModeArmed={isGuideModeArmed}
                onToggleGuideModeArmed={handleToggleGuideModeArmed}
                themeMode={effectiveThemeMode}
                onToggleThemeMode={(mode) => handleSetThemePreference(mode)}
                subTab={adminSubTab}
                onSelectSubTab={setAdminSubTab}
                unreadCount={adminUnreadCount}
                onUnreadCountChange={setAdminUnreadCount}
                onSetSidebarCollapsed={setSidebarCollapsed}
              />
            ) : (
              <SettingsView
                snapInterval={snapInterval}
                onSaveSnapInterval={handleSaveSnapInterval}
                recurrenceBehavior={recurrenceBehavior}
                onSaveRecurrenceBehavior={handleSaveRecurrenceBehavior}
                tags={tags}
                onSaveTagsOrder={handleSaveTagsOrder}
                currentUser={currentUser}
                onSignOut={handleSignOut}
                onOpenSignIn={() => setIsSignInModalOpen(true)}
                onDeleteAccountAndData={handleDeleteAccountAndData}
                setActiveTab={setActiveTab}
                onViewAboutPage={() => {
                  setIsAboutTabVisible(true);
                  setActiveTab('about');
                }}
                themePreference={themePreference}
                onSetThemePreference={handleSetThemePreference}
                activeFocusTask={activeFocusTask}
                isFocusRunning={isFocusRunning}
                onNavigateToFocus={() => setActiveTab('focus')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. Unified Create/Edit Event & Task Modal Dialog */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tags={tags}
        groups={groups}
        goals={goals}
        defaultDate={modalDefaultDate}
        defaultStartTime={modalDefaultStartTime}
        defaultEndTime={modalDefaultEndTime}
        editMode={modalEditMode}
        editItemType={modalEditItemType}
        editItem={modalEditItem}
        occurrenceDate={modalEditOccurrenceDate}
        anchorPosition={modalAnchorPosition}
        onSaveEvent={handleSaveEvent}
        onSaveTask={handleSaveTask}
        onSplitRecurringEvent={handleSplitRecurringEvent}
        onUpdateRecurringSeries={handleUpdateRecurringSeries}
        onDeleteEvent={handleDeleteEvent}
        onDeleteTask={handleDeleteTask}
        recurrenceBehavior={recurrenceBehavior}
        onSaveRecurrenceBehavior={handleSaveRecurrenceBehavior}
        onTimeChange={handleModalTimeChange}
        tasks={tasks}
      />

      {/* Mobile-Adaptive Touch Bottom Tab Bar (Visible only on Phone layout widths) */}
      {currentUser && effectiveDeviceType === 'Phone' && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/80 h-16 pb-safe flex items-center justify-around select-none">
          {[
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'focus', label: 'Focus Room', icon: AlarmClockCheck },
            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
            { id: 'goals', label: 'Targets', icon: Target },
            ...(isInsightsVisible ? [{ id: 'insights', label: 'Insights', icon: BarChart2 }] : []),
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className="flex-1 flex flex-col items-center justify-center h-full text-center relative focus:outline-none cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                <IconComponent
                  className={`w-5 h-5 transition-transform duration-150 active:scale-90 ${
                    isActive
                      ? 'text-[#0066FF] dark:text-[#60A5FA]'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                />
                <span
                  className={`text-[10px] font-medium tracking-tight mt-1 ${
                    isActive
                      ? 'text-[#0066FF] dark:text-[#60A5FA] font-bold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#0066FF] dark:bg-[#60A5FA]" />
                )}
              </button>
            );
          })}
        </nav>
      )}

    </div>
  );
}
