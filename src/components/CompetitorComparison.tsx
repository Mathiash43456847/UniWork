/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { YPT_LOGO_BASE64, TICK_LOGO_BASE64, FOREST_LOGO_BASE64, GOOGLE_LOGO_BASE64, UNIWORK_DARK_LOGO_BASE64 } from '../assets/logoData';
import { AlertCircle, Sliders, Move, RotateCcw, X, Check, AlignLeft, AlignCenter, Database, Save } from 'lucide-react';

interface FeatureRow {
  feature: string;
  uniwork: 'check' | 'cross' | 'limited' | string;
  competitorFree: 'check' | 'cross' | 'limited' | string;
  competitorNormal: 'check' | 'cross' | 'limited' | string;
}

interface CompetitorConfig {
  id: string;
  name: string;
  logo?: string;
  freePlanName: string;
  normalPlanName: string;
  isInDevelopment?: boolean;
  subHeader: string;
  subText: string;
  rows: FeatureRow[];
}

interface LogoTransform {
  x: number;
  y: number;
  scale: number;
}

interface GuideLine {
  type: 'vertical';
  position: number; // in pixels relative to sidebar container
  label: string;
  matchedCompetitors: string[];
}

const STORAGE_KEY = 'uniwork_competitor_logo_transforms';

const DEFAULT_TRANSFORMS: Record<string, LogoTransform> = {
  'google-calendar': { x: 0, y: 0, scale: 1 },
  'ypt': { x: -10, y: 0, scale: 1 },
  'ticktick': { x: -1, y: 0, scale: 1 },
  'forest': { x: -2, y: 0, scale: 1 },
};

const GreenCheckBadge: React.FC = () => (
  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#10b981] shadow-sm shadow-emerald-950/40 shrink-0">
    <svg 
      className="w-3 h-3 text-white" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </span>
);

const LimitedBadge: React.FC = () => (
  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
    Limited
  </span>
);

// Red circular cross badge matching the uploaded user reference image
const RedCrossBadge: React.FC = () => (
  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#f87171] shadow-sm shadow-rose-950/40 shrink-0">
    <svg 
      className="w-3 h-3 text-white" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </span>
);

const renderCellValue = (val: 'check' | 'cross' | 'limited' | string, isUniWork = false) => {
  if (val === 'check') return <GreenCheckBadge />;
  if (val === 'cross') return <RedCrossBadge />;
  if (val === 'limited') return <LimitedBadge />;
  return (
    <span className={`font-semibold text-xs sm:text-sm ${isUniWork ? 'text-cyan-400 font-bold' : 'text-slate-200'}`}>
      {val}
    </span>
  );
};

export const CompetitorComparison: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('google-calendar');
  const [isAdjustMode, setIsAdjustMode] = useState<boolean>(false);
  const [activeAdjustLogoId, setActiveAdjustLogoId] = useState<string>('google-calendar');
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState<number>(240);
  const [dbStatus, setDbStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Load saved transforms from localStorage initial, then from Database on mount
  const [transforms, setTransforms] = useState<Record<string, LogoTransform>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_TRANSFORMS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_TRANSFORMS;
  });

  const sidebarRef = useRef<HTMLDivElement>(null);
  const logoRefs = useRef<Record<string, HTMLElement | null>>({});
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const lastTabPressRef = useRef<number>(0);
  const saveTimeoutRef = useRef<any>(null);

  // Measure sidebar container width for exact middle/center line calculations
  useEffect(() => {
    if (!sidebarRef.current) return;
    const updateWidth = () => {
      if (sidebarRef.current) {
        setSidebarWidth(sidebarRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    const ro = new ResizeObserver(updateWidth);
    ro.observe(sidebarRef.current);
    return () => {
      window.removeEventListener('resize', updateWidth);
      ro.disconnect();
    };
  }, []);

  // Fetch saved transforms directly from PostgreSQL Database on initial load
  useEffect(() => {
    fetch('/api/competitor-transforms')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.transforms) {
          setTransforms((prev) => ({ ...prev, ...data.transforms }));
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.transforms));
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch transforms from DB, using cached values:', err);
      });
  }, []);

  // Save transforms to PostgreSQL Database & File API
  const saveToDatabase = useCallback(async (currentTransforms: Record<string, LogoTransform>) => {
    setDbStatus('saving');
    try {
      const res = await fetch('/api/competitor-transforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transforms: currentTransforms }),
      });
      if (res.ok) {
        setDbStatus('saved');
        setTimeout(() => setDbStatus('idle'), 2500);
      } else {
        setDbStatus('error');
      }
    } catch {
      setDbStatus('error');
    }
  }, []);

  // Debounced database sync
  const debouncedSaveToDb = useCallback((newTransforms: Record<string, LogoTransform>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToDatabase(newTransforms);
    }, 450);
  }, [saveToDatabase]);

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transforms));
    } catch {
      // ignore
    }
  }, [transforms]);

  // Compute alignment guides (Left, Middle/Center, Right, and Container Middle)
  const checkAlignments = useCallback((targetId: string) => {
    const container = sidebarRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const containerCenter = cRect.width / 2;

    const bounds: Record<string, { left: number; right: number; center: number }> = {};
    Object.keys(logoRefs.current).forEach((id) => {
      const el = logoRefs.current[id];
      if (el) {
        const r = el.getBoundingClientRect();
        bounds[id] = {
          left: r.left - cRect.left,
          right: r.right - cRect.left,
          center: r.left - cRect.left + r.width / 2,
        };
      }
    });

    const active = bounds[targetId];
    if (!active) {
      setGuideLines([]);
      return;
    }

    const lines: GuideLine[] = [];
    const activeName = competitors.find((c) => c.id === targetId)?.name || targetId;

    // Check Container Middle (Center 50%) alignment
    if (Math.abs(active.center - containerCenter) <= 4) {
      lines.push({
        type: 'vertical',
        position: containerCenter,
        label: 'Snapped to Middle (Center 50%)',
        matchedCompetitors: [activeName],
      });
    }

    Object.keys(bounds).forEach((id) => {
      if (id === targetId) return;
      const other = bounds[id];
      const otherName = competitors.find((c) => c.id === id)?.name || id;

      // Check Left alignment (threshold within 4px)
      if (Math.abs(active.left - other.left) <= 4) {
        lines.push({
          type: 'vertical',
          position: other.left,
          label: 'Left Aligned',
          matchedCompetitors: [activeName, otherName],
        });
      }

      // Check Center / Middle alignment with another logo
      if (Math.abs(active.center - other.center) <= 4) {
        lines.push({
          type: 'vertical',
          position: other.center,
          label: 'Middle Aligned',
          matchedCompetitors: [activeName, otherName],
        });
      }

      // Check Right alignment
      if (Math.abs(active.right - other.right) <= 4) {
        lines.push({
          type: 'vertical',
          position: other.right,
          label: 'Right Aligned',
          matchedCompetitors: [activeName, otherName],
        });
      }
    });

    setGuideLines(lines);
  }, [sidebarWidth]);

  // Keyboard shortcut listener: Shift + Tab + Q to toggle, Arrow commands to nudge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      pressedKeysRef.current.add(k);
      pressedKeysRef.current.add(e.code.toLowerCase());

      if (e.key === 'Tab' || e.code === 'Tab') {
        if (e.shiftKey) {
          lastTabPressRef.current = Date.now();
        }
      }

      const isShift = e.shiftKey || pressedKeysRef.current.has('shift');
      const isQ = k === 'q' || e.code === 'KeyQ';
      const isTabRecent = Date.now() - lastTabPressRef.current < 2500;
      const hasTab = pressedKeysRef.current.has('tab') || isTabRecent;

      // Primary requested command: Shift + Tab + Q (also support Shift + Q as fallback)
      const isToggleCommand = (isShift && hasTab && isQ) || (isShift && isQ);

      if (isToggleCommand) {
        e.preventDefault();
        e.stopPropagation();
        setIsAdjustMode((prev) => {
          const next = !prev;
          if (!next) {
            // Save to database on closing
            saveToDatabase(transforms);
          }
          return next;
        });
        return;
      }

      // Arrow commands when in Adjust Mode: Nudge logo position
      if (isAdjustMode) {
        if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) {
          e.preventDefault();
          e.stopPropagation();
          const step = e.shiftKey ? 5 : 1;
          let dx = 0;
          let dy = 0;
          if (k === 'arrowleft') dx = -step;
          if (k === 'arrowright') dx = step;
          if (k === 'arrowup') dy = -step;
          if (k === 'arrowdown') dy = step;

          setTransforms((prev) => {
            const cur = prev[activeAdjustLogoId] || { x: 0, y: 0, scale: 1 };
            const nextX = Math.round(cur.x + dx);
            const nextY = Math.round(cur.y + dy);
            const updated = {
              ...prev,
              [activeAdjustLogoId]: {
                ...cur,
                x: nextX,
                y: nextY,
              },
            };
            debouncedSaveToDb(updated);
            return updated;
          });

          setTimeout(() => checkAlignments(activeAdjustLogoId), 20);
          return;
        }
      }

      if (e.key === 'Escape' && isAdjustMode) {
        setIsAdjustMode(false);
        saveToDatabase(transforms);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeysRef.current.delete(e.key.toLowerCase());
      pressedKeysRef.current.delete(e.code.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [isAdjustMode, activeAdjustLogoId, transforms, checkAlignments, debouncedSaveToDb, saveToDatabase]);

  // Dragging & corner resizing logic
  const dragInfoRef = useRef<{
    isDragging: boolean;
    isResizing: boolean;
    corner?: 'nw' | 'ne' | 'se' | 'sw';
    competitorId: string;
    startX: number;
    startY: number;
    initialTransform: LogoTransform;
  } | null>(null);

  const startDrag = (compItId: string, e: React.MouseEvent) => {
    if (!isAdjustMode) return;
    e.stopPropagation();
    setActiveAdjustLogoId(compItId);

    const initial = transforms[compItId] || { x: 0, y: 0, scale: 1 };
    dragInfoRef.current = {
      isDragging: true,
      isResizing: false,
      competitorId: compItId,
      startX: e.clientX,
      startY: e.clientY,
      initialTransform: { ...initial },
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragInfoRef.current || !dragInfoRef.current.isDragging) return;
      const dx = ev.clientX - dragInfoRef.current.startX;
      const dy = ev.clientY - dragInfoRef.current.startY;
      const id = dragInfoRef.current.competitorId;

      let nextX = Math.round(dragInfoRef.current.initialTransform.x + dx);
      let nextY = Math.round(dragInfoRef.current.initialTransform.y + dy);

      // Check for alignment snap
      const container = sidebarRef.current;
      const activeEl = logoRefs.current[id];
      if (container && activeEl) {
        const cRect = container.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        const currentLeft = activeRect.left - cRect.left;

        // Check for alignment snap with other logos
        competitors.forEach((other) => {
          if (other.id === id) return;
          const otherEl = logoRefs.current[other.id];
          if (otherEl) {
            const otherRect = otherEl.getBoundingClientRect();
            const otherLeft = otherRect.left - cRect.left;
            if (Math.abs(currentLeft - otherLeft) <= 5) {
              nextX += Math.round(otherLeft - currentLeft);
            }
          }
        });

        // Check for container middle/center snap (50%)
        const currentCenter = currentLeft + activeRect.width / 2;
        const containerCenter = cRect.width / 2;
        if (Math.abs(currentCenter - containerCenter) <= 5) {
          nextX += Math.round(containerCenter - currentCenter);
        }
      }

      setTransforms((prev) => {
        const updated = {
          ...prev,
          [id]: {
            ...(prev[id] || { scale: 1 }),
            x: nextX,
            y: nextY,
          },
        };
        return updated;
      });

      checkAlignments(id);
    };

    const handleMouseUp = () => {
      dragInfoRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setTransforms((cur) => {
        debouncedSaveToDb(cur);
        return cur;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const startResize = (compItId: string, corner: 'nw' | 'ne' | 'se' | 'sw', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveAdjustLogoId(compItId);

    const initial = transforms[compItId] || { x: 0, y: 0, scale: 1 };
    dragInfoRef.current = {
      isDragging: false,
      isResizing: true,
      corner,
      competitorId: compItId,
      startX: e.clientX,
      startY: e.clientY,
      initialTransform: { ...initial },
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragInfoRef.current || !dragInfoRef.current.isResizing) return;
      const dx = ev.clientX - dragInfoRef.current.startX;
      const dy = ev.clientY - dragInfoRef.current.startY;
      const id = dragInfoRef.current.competitorId;

      let factor = (dx + dy) * 0.007;
      if (corner === 'sw' || corner === 'nw') {
        factor = (-dx + dy) * 0.007;
      }

      const newScale = Math.max(0.4, Math.min(2.5, dragInfoRef.current.initialTransform.scale + factor));
      const roundedScale = Math.round(newScale * 100) / 100;

      setTransforms((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] || { x: 0, y: 0 }),
          scale: roundedScale,
        },
      }));

      checkAlignments(id);
    };

    const handleMouseUp = () => {
      dragInfoRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setTransforms((cur) => {
        debouncedSaveToDb(cur);
        return cur;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const competitors: CompetitorConfig[] = [
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      logo: GOOGLE_LOGO_BASE64,
      freePlanName: 'Google Calendar (Free)',
      normalPlanName: 'Google Workspace',
      subHeader: 'Why choose UniWork over Google Calendar?',
      subText: 'UniWork integrates advanced task management, dedicated focus timers, long-term targets and shared study rooms directly into your calendar. Google Calendar provides scheduling alone, without native focus or target tracking.',
      rows: [
        { feature: 'Price', uniwork: '$0', competitorFree: '$0', competitorNormal: '$6/mo' },
        { feature: 'Calendar planning', uniwork: 'check', competitorFree: 'check', competitorNormal: 'check' },
        { feature: 'Advanced to-dos', uniwork: 'check', competitorFree: 'limited', competitorNormal: 'check' },
        { feature: 'Focus timer', uniwork: 'check', competitorFree: 'cross', competitorNormal: 'cross' },
        { feature: 'Shared focus rooms', uniwork: 'check', competitorFree: 'cross', competitorNormal: 'cross' },
        { feature: 'Long-term target planning', uniwork: 'check', competitorFree: 'cross', competitorNormal: 'cross' },
        { feature: 'Ad-free', uniwork: 'check', competitorFree: 'check', competitorNormal: 'check' },
      ],
    },
    {
      id: 'ypt',
      name: 'YPT',
      logo: YPT_LOGO_BASE64,
      freePlanName: 'YPT (Free)',
      normalPlanName: 'YPT',
      subHeader: 'Why choose UniWork over YPT?',
      subText: 'UniWork brings Kanban task boards, calendar scheduling, linked goals and shared focus rooms together, completely free. YPT offers free access with optional paid purchases; UniWork gives you its current feature set with no paid upgrade required.',
      rows: [
        { feature: 'Starting price', uniwork: '$0', competitorFree: '$0', competitorNormal: '$3.98/mo' },
        { feature: 'Advanced to-dos', uniwork: 'check', competitorFree: 'limited', competitorNormal: 'limited' },
        { feature: 'Focus timer', uniwork: 'check', competitorFree: 'check', competitorNormal: 'check' },
        { feature: 'Shared focus rooms', uniwork: 'check', competitorFree: 'check', competitorNormal: 'check' },
        { feature: 'Calendar planning', uniwork: 'check', competitorFree: 'limited', competitorNormal: 'limited' },
        { feature: 'Long-term target planning', uniwork: 'check', competitorFree: 'cross', competitorNormal: 'cross' },
        { feature: 'Unlimited focus rooms', uniwork: 'check', competitorFree: 'limited', competitorNormal: 'check' },
        { feature: 'Ad-free', uniwork: 'check', competitorFree: 'cross', competitorNormal: 'check' },
      ],
    },
    {
      id: 'ticktick',
      name: 'TickTick',
      logo: TICK_LOGO_BASE64,
      freePlanName: 'TickTick (Free)',
      normalPlanName: 'TickTick',
      subHeader: 'Why choose UniWork over TickTick?',
      subText: 'UniWork combines advanced task boards, calendar planning, long-term targets and shared focus rooms in one free workspace. Unlike TickTick, UniWork requires no Premium upgrade to access its complete planning experience.',
      rows: [
        { feature: 'Starting price', uniwork: '$0', competitorFree: '$0', competitorNormal: '$49.99/yr' },
        { feature: 'Advanced to-dos', uniwork: 'check', competitorFree: 'limited', competitorNormal: 'check' },
        { feature: 'Kanban task boards', uniwork: 'check', competitorFree: 'check', competitorNormal: 'check' },
        { feature: 'Calendar planning', uniwork: 'check', competitorFree: 'limited', competitorNormal: 'check' },
        { feature: 'Long-term target planning', uniwork: 'check', competitorFree: 'cross', competitorNormal: 'cross' },
        { feature: 'Focus timer', uniwork: 'check', competitorFree: 'check', competitorNormal: 'check' },
        { feature: 'Shared focus rooms', uniwork: 'check', competitorFree: 'cross', competitorNormal: 'cross' },
        { feature: 'Habit tracking', uniwork: 'cross', competitorFree: 'limited', competitorNormal: 'check' },
        { feature: 'Productivity statistics', uniwork: 'cross', competitorFree: 'limited', competitorNormal: 'check' },
      ],
    },
    {
      id: 'forest',
      name: 'Forest',
      logo: FOREST_LOGO_BASE64,
      freePlanName: 'Forest (Free)',
      normalPlanName: 'Forest',
      subHeader: 'Why choose UniWork over Forest?',
      subText: 'Forest makes focus rewarding. UniWork turns that focus into progress. Plan tasks on Kanban boards, organise your schedule, work towards long-term targets and focus alongside others, all from one free workspace.',
      rows: [
        { feature: 'Price', uniwork: '$0', competitorFree: '$0', competitorNormal: '$5.99/mo' },
        { feature: 'Advanced to-dos', uniwork: 'check', competitorFree: 'cross', competitorNormal: 'cross' },
        { feature: 'Calendar planning', uniwork: 'check', competitorFree: 'cross', competitorNormal: 'cross' },
        { feature: 'Long-term target planning', uniwork: 'check', competitorFree: 'cross', competitorNormal: 'cross' },
        { feature: 'Focus timer', uniwork: 'check', competitorFree: 'check', competitorNormal: 'check' },
        { feature: 'Shared focus rooms', uniwork: 'check', competitorFree: 'check', competitorNormal: 'check' },
      ],
    },
  ];

  const currentCompetitor = competitors.find((c) => c.id === selectedId) || competitors[0];
  const activeTransform = transforms[activeAdjustLogoId] || { x: 0, y: 0, scale: 1 };

  return (
    <section id="why-uniwork" className="section container relative font-sans">
      
      {/* SECTION MAIN TITLE (Clean, professional view without any mode indicator) */}
      <div className="text-center max-w-2xl mx-auto mb-10 relative">
        <h2 className="text-h2 font-extrabold tracking-tight leading-tight text-white font-['Plus_Jakarta_Sans']">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
            UniWork
          </span>{' '}
          vs Other Apps
        </h2>
      </div>

      {/* ADJUST MODE TOOLBAR (Appears ONLY when Shift + Tab + Q is pressed) */}
      {isAdjustMode && (
        <div className="mb-6 p-4 rounded-xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4 text-xs animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-white flex items-center gap-1.5 font-jakarta">
              <Move className="w-4 h-4 text-cyan-400" />
              Editing: <span className="text-cyan-300">{competitors.find(c => c.id === activeAdjustLogoId)?.name}</span>
            </span>

            {/* Position controls */}
            <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 text-slate-300">
              <span className="text-slate-400 font-mono">X:</span>
              <button 
                onClick={() => {
                  setTransforms(p => {
                    const next = { ...p, [activeAdjustLogoId]: { ...(p[activeAdjustLogoId] || { y:0, scale:1 }), x: (p[activeAdjustLogoId]?.x || 0) - 1 } };
                    debouncedSaveToDb(next);
                    return next;
                  });
                  setTimeout(() => checkAlignments(activeAdjustLogoId), 20);
                }}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold"
              >
                -
              </button>
              <span className="font-mono min-w-[32px] text-center text-cyan-400">{activeTransform.x}px</span>
              <button 
                onClick={() => {
                  setTransforms(p => {
                    const next = { ...p, [activeAdjustLogoId]: { ...(p[activeAdjustLogoId] || { y:0, scale:1 }), x: (p[activeAdjustLogoId]?.x || 0) + 1 } };
                    debouncedSaveToDb(next);
                    return next;
                  });
                  setTimeout(() => checkAlignments(activeAdjustLogoId), 20);
                }}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold"
              >
                +
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 text-slate-300">
              <span className="text-slate-400 font-mono">Y:</span>
              <button 
                onClick={() => {
                  setTransforms(p => {
                    const next = { ...p, [activeAdjustLogoId]: { ...(p[activeAdjustLogoId] || { x:0, scale:1 }), y: (p[activeAdjustLogoId]?.y || 0) - 1 } };
                    debouncedSaveToDb(next);
                    return next;
                  });
                  setTimeout(() => checkAlignments(activeAdjustLogoId), 20);
                }}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold"
              >
                -
              </button>
              <span className="font-mono min-w-[32px] text-center text-cyan-400">{activeTransform.y}px</span>
              <button 
                onClick={() => {
                  setTransforms(p => {
                    const next = { ...p, [activeAdjustLogoId]: { ...(p[activeAdjustLogoId] || { x:0, scale:1 }), y: (p[activeAdjustLogoId]?.y || 0) + 1 } };
                    debouncedSaveToDb(next);
                    return next;
                  });
                  setTimeout(() => checkAlignments(activeAdjustLogoId), 20);
                }}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold"
              >
                +
              </button>
            </div>

            {/* Scale controls */}
            <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 text-slate-300">
              <span className="text-slate-400 font-mono">Scale:</span>
              <button 
                onClick={() => {
                  setTransforms(p => {
                    const next = { ...p, [activeAdjustLogoId]: { ...(p[activeAdjustLogoId] || { x:0, y:0 }), scale: Math.max(0.4, Math.round(((p[activeAdjustLogoId]?.scale || 1) - 0.05) * 100) / 100) } };
                    debouncedSaveToDb(next);
                    return next;
                  });
                }}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold"
              >
                -
              </button>
              <span className="font-mono min-w-[38px] text-center text-cyan-400">{Math.round((activeTransform.scale || 1) * 100)}%</span>
              <button 
                onClick={() => {
                  setTransforms(p => {
                    const next = { ...p, [activeAdjustLogoId]: { ...(p[activeAdjustLogoId] || { x:0, y:0 }), scale: Math.min(2.5, Math.round(((p[activeAdjustLogoId]?.scale || 1) + 0.05) * 100) / 100) } };
                    debouncedSaveToDb(next);
                    return next;
                  });
                }}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold"
              >
                +
              </button>
            </div>

            {/* Quick center middle button */}
            <button
              onClick={() => {
                const activeEl = logoRefs.current[activeAdjustLogoId];
                if (activeEl) {
                  const logoWidth = activeEl.getBoundingClientRect().width;
                  const targetX = Math.round((sidebarWidth - logoWidth) / 2);
                  setTransforms(prev => {
                    const updated = {
                      ...prev,
                      [activeAdjustLogoId]: {
                        ...(prev[activeAdjustLogoId] || { y: 0, scale: 1 }),
                        x: targetX,
                      }
                    };
                    debouncedSaveToDb(updated);
                    return updated;
                  });
                  setTimeout(() => checkAlignments(activeAdjustLogoId), 50);
                }
              }}
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 cursor-pointer"
            >
              <AlignCenter className="w-3.5 h-3.5" />
              <span>Center Logo</span>
            </button>

            {/* Quick align left button */}
            <button
              onClick={() => {
                const topId = competitors[0].id;
                const topRef = transforms[topId] || { x: 0, y: 0, scale: 1 };
                setTransforms(prev => {
                  const updated = {
                    ...prev,
                    [activeAdjustLogoId]: {
                      ...(prev[activeAdjustLogoId] || { y: 0, scale: 1 }),
                      x: topRef.x,
                    }
                  };
                  debouncedSaveToDb(updated);
                  return updated;
                });
                setTimeout(() => checkAlignments(activeAdjustLogoId), 50);
              }}
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 cursor-pointer"
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Align with {competitors[0].name}</span>
            </button>

            {/* Reset button */}
            <button
              onClick={() => {
                setTransforms(prev => {
                  const updated = {
                    ...prev,
                    [activeAdjustLogoId]: { x: 0, y: 0, scale: 1 },
                  };
                  debouncedSaveToDb(updated);
                  return updated;
                });
                setGuideLines([]);
              }}
              type="button"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Arrow keys shortcut badge */}
            <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950/60 px-2 py-1 rounded-md border border-slate-800">
              <span className="font-mono text-cyan-400">↑ ↓ ← →</span>
              <span>Arrow keys to nudge (Shift for 5px)</span>
            </div>

            {/* Database sync status indicator and manual save */}
            <div className="flex items-center gap-1.5">
              {dbStatus === 'saving' && (
                <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 font-mono">
                  <Database className="w-3 h-3 animate-pulse" />
                  <span>Saving...</span>
                </span>
              )}
              {dbStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Saved to Database</span>
                </span>
              )}
              <button
                onClick={() => saveToDatabase(transforms)}
                type="button"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-cyan-400" />
                <span>Save to DB</span>
              </button>
            </div>

            <button
              onClick={() => {
                saveToDatabase(transforms);
                setIsAdjustMode(false);
              }}
              type="button"
              className="inline-flex items-center gap-1 px-3.5 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}

      {/* 2-COLUMN LAYOUT: LEFT SIDEBAR FOR COMPETITOR TABS, RIGHT SIDE FOR 3-COLUMN COMPARISON SHEET */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT SIDEBAR: Competitor Selector Tabs with relative guide line overlay */}
        <div ref={sidebarRef} className="lg:col-span-3 flex flex-col gap-1.5 relative">
          
          {/* PERMANENT MIDDLE / CENTER GUIDE LINE WHEN IN ADJUST MODE */}
          {isAdjustMode && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-30 flex flex-col items-center"
              style={{ left: `${sidebarWidth / 2}px` }}
            >
              <div className="w-0 h-full border-l-2 border-dotted border-cyan-400/50" />
              <div className="absolute top-0 -translate-x-1/2 bg-slate-950/90 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/40 shadow-sm whitespace-nowrap z-30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Middle (50%)</span>
              </div>
            </div>
          )}

          {/* DOTTED ALIGNMENT GUIDE LINES */}
          {isAdjustMode && guideLines.map((guide, idx) => (
            <div
              key={idx}
              className="absolute top-0 bottom-0 pointer-events-none z-40 flex flex-col items-center"
              style={{ left: `${guide.position}px` }}
            >
              {/* Dotted line spanning across all competitor tabs */}
              <div className="w-0 h-full border-l-2 border-dotted border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />

              {/* High-visibility alignment badge */}
              <div className="absolute top-1 -translate-x-1/2 bg-cyan-950/95 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-400 shadow-md shadow-cyan-950/80 whitespace-nowrap z-50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>{guide.label}: {guide.matchedCompetitors.join(' & ')}</span>
              </div>
            </div>
          ))}

          {competitors.map((comp) => {
            const isSelected = comp.id === selectedId;
            const isAdjustActive = isAdjustMode && activeAdjustLogoId === comp.id;
            const transform = transforms[comp.id] || { x: 0, y: 0, scale: 1 };

            return (
              <button
                key={comp.id}
                onClick={() => {
                  if (isAdjustMode) {
                    setActiveAdjustLogoId(comp.id);
                  }
                  setSelectedId(comp.id);
                }}
                type="button"
                className={`w-[220px] h-[64px] transition-all cursor-pointer select-none relative flex items-center justify-center px-4 rounded-xl border ${
                  isSelected
                    ? 'bg-slate-900/95 border-slate-700 shadow-lg shadow-black/30'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40 hover:border-slate-800/40'
                } ${isAdjustActive ? 'ring-1 ring-cyan-500/50' : ''}`}
              >
                {/* LOGO CONTAINER WITH INTERACTIVE TRANSFORM, CORNER HANDLES & ALIGNMENT GUIDES */}
                <div
                  ref={(el) => {
                    logoRefs.current[comp.id] = el;
                  }}
                  onMouseDown={(e) => startDrag(comp.id, e)}
                  style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transformOrigin: 'left center',
                  }}
                  className={`relative flex items-center transition-transform ${
                    isAdjustMode ? 'cursor-grab active:cursor-grabbing p-1 rounded-lg' : ''
                  } ${
                    isAdjustActive ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : isAdjustMode ? 'border border-dashed border-slate-600/60' : ''
                  }`}
                >
                  {/* CORNER RESIZE HANDLES (Visible when this logo is selected in Adjust Mode) */}
                  {isAdjustActive && (
                    <>
                      {/* Top-Left Corner Handle */}
                      <div
                        onMouseDown={(e) => startResize(comp.id, 'nw', e)}
                        title="Drag corner to resize logo"
                        className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-950 cursor-nw-resize shadow-md hover:scale-125 transition-transform z-30"
                      />
                      {/* Top-Right Corner Handle */}
                      <div
                        onMouseDown={(e) => startResize(comp.id, 'ne', e)}
                        title="Drag corner to resize logo"
                        className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-950 cursor-ne-resize shadow-md hover:scale-125 transition-transform z-30"
                      />
                      {/* Bottom-Left Corner Handle */}
                      <div
                        onMouseDown={(e) => startResize(comp.id, 'sw', e)}
                        title="Drag corner to resize logo"
                        className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-950 cursor-sw-resize shadow-md hover:scale-125 transition-transform z-30"
                      />
                      {/* Bottom-Right Corner Handle (Main "corner thing") */}
                      <div
                        onMouseDown={(e) => startResize(comp.id, 'se', e)}
                        title="Drag corner to resize logo"
                        className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-950 cursor-se-resize shadow-md hover:scale-125 transition-transform z-30 flex items-center justify-center"
                      >
                        <div className="w-1 h-1 bg-slate-950 rounded-full" />
                      </div>
                    </>
                  )}

                  {/* GOOGLE CALENDAR LOGO */}
                  {comp.id === 'google-calendar' && comp.logo && (
                    <img 
                      src={comp.logo} 
                      alt={comp.name} 
                      draggable={false}
                      className={`${
                        isSelected ? 'h-11 sm:h-12 brightness-110' : 'h-10 sm:h-11 opacity-90 hover:opacity-100'
                      } w-auto max-w-[190px] object-contain shrink-0 select-none pointer-events-none`} 
                    />
                  )}

                  {/* YPT LOGO & TEXT */}
                  {comp.id === 'ypt' && (
                    <div className="flex items-center gap-2.5">
                      {comp.logo ? (
                        <img 
                          src={comp.logo} 
                          alt={comp.name} 
                          draggable={false}
                          className={`${
                            isSelected ? 'w-9.5 h-9.5' : 'w-9 h-9'
                          } rounded-lg object-contain shrink-0 brightness-110 select-none pointer-events-none`} 
                        />
                      ) : (
                        <span className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-base font-black text-cyan-400 shrink-0 select-none">
                          Y
                        </span>
                      )}
                      <span className="text-white text-base sm:text-lg font-bold tracking-tight font-jakarta select-none">
                        {comp.name}
                      </span>
                    </div>
                  )}

                  {/* TICKTICK LOGO */}
                  {comp.id === 'ticktick' && comp.logo && (
                    <img 
                      src={comp.logo} 
                      alt={comp.name} 
                      draggable={false}
                      className={`${
                        isSelected ? 'h-[70px] sm:h-[74px] brightness-125 contrast-110' : 'h-[64px] sm:h-[68px] brightness-120 contrast-105 opacity-90 hover:opacity-100'
                      } w-auto max-w-[210px] object-contain shrink-0 select-none pointer-events-none`} 
                    />
                  )}

                  {/* FOREST LOGO */}
                  {comp.id === 'forest' && comp.logo && (
                    <img 
                      src={comp.logo} 
                      alt={comp.name} 
                      draggable={false}
                      className={`${
                        isSelected ? 'h-7 sm:h-7.5 brightness-110' : 'h-6 sm:h-6.5 opacity-90 hover:opacity-100'
                      } w-auto max-w-[190px] object-contain shrink-0 select-none pointer-events-none`} 
                    />
                  )}
                </div>

                {comp.isInDevelopment && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400">
                    In Dev
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* RIGHT SIDE: 3-Column Comparison Sheet */}
        <div className="lg:col-span-9 flex flex-col bg-slate-900/95 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-xl overflow-hidden w-full">
          
          {/* Sub-header & Sub-text Card Header with exact user text */}
          <div className="p-5 sm:p-6 border-b border-slate-800/80">
            <h3 className="text-h3 font-extrabold text-white tracking-tight mb-2">
              {currentCompetitor.subHeader}
            </h3>
            <p className="text-body leading-relaxed font-normal">
              {currentCompetitor.subText}
            </p>

            {currentCompetitor.isInDevelopment && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>Comparison metrics for {currentCompetitor.name} are currently in development preview mode.</span>
              </div>
            )}
          </div>

          {/* 3-Column Comparison Table */}
          <motion.div
            key={currentCompetitor.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-x-auto w-full"
          >
            <table className="w-full text-left text-xs sm:text-sm text-slate-300 border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold tracking-wider text-[11px] font-jakarta">
                  <th className="p-3.5 sm:p-4 text-white font-bold w-[32%] font-jakarta"></th>
                  
                  {/* UNIWORK COLUMN */}
                  <th className="p-3.5 sm:p-4 text-white bg-cyan-950/35 border-x border-cyan-500/30 text-center font-extrabold text-sm w-[22%] font-jakarta whitespace-nowrap">
                    UniWork
                  </th>

                  {/* COMPETITOR FREE COLUMN */}
                  <th className="p-3.5 sm:p-4 text-center text-slate-200 font-bold text-sm w-[23%] font-jakarta whitespace-nowrap">
                    {currentCompetitor.freePlanName}
                  </th>

                  {/* COMPETITOR NORMAL COLUMN */}
                  <th className="p-3.5 sm:p-4 text-center text-slate-200 font-bold text-sm w-[23%] font-jakarta whitespace-nowrap">
                    {currentCompetitor.normalPlanName}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/80 font-medium">
                {currentCompetitor.rows.map((row, idx) => (
                  <tr 
                    key={idx}
                    className="hover:bg-slate-800/35 transition-colors"
                  >
                    <td className="p-3.5 sm:p-4 font-bold text-white whitespace-nowrap text-xs sm:text-sm">
                      {row.feature}
                    </td>

                    <td className="p-3.5 sm:p-4 bg-cyan-950/20 border-x border-cyan-500/20 text-center">
                      <div className="flex items-center justify-center">
                        {renderCellValue(row.uniwork, true)}
                      </div>
                    </td>

                    <td className="p-3.5 sm:p-4 text-center">
                      <div className="flex items-center justify-center">
                        {renderCellValue(row.competitorFree, false)}
                      </div>
                    </td>

                    <td className="p-3.5 sm:p-4 text-center">
                      <div className="flex items-center justify-center">
                        {renderCellValue(row.competitorNormal, false)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

        </div>

      </div>

    </section>
  );
};
