/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Target, 
  AlarmClockCheck 
} from 'lucide-react';
import { UNIWORK_DARK_LOGO_BASE64 } from '../assets/logoData';

interface UnifiedWorkspaceShowcaseProps {
  onOpenSignIn?: () => void;
  currentUser?: any;
  onLaunch?: () => void;
}

// Precision easing functions for smooth continuous physics
function easeInOutCubic(u: number): number {
  const c = Math.max(0, Math.min(1, u));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

// Snappy spring deceleration: pops up to 1.05 and settles crisp and locked at 1.0
function easeOutBack(u: number): number {
  const c1 = 1.35;
  const c3 = c1 + 1;
  const c = Math.max(0, Math.min(1, u));
  return 1 + c3 * Math.pow(c - 1, 3) + c1 * Math.pow(c - 1, 2);
}

// Smooth monotonic deceleration
function easeOutQuart(u: number): number {
  const c = Math.max(0, Math.min(1, u));
  return 1 - Math.pow(1 - c, 4);
}

export const UnifiedWorkspaceShowcase: React.FC<UnifiedWorkspaceShowcaseProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Direct element DOM refs for 60fps composite-thread updates
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const logoRef = useRef<HTMLDivElement | null>(null);

  const [stageWidth, setStageWidth] = useState(700);
  const stageWidthRef = useRef(700);

  // Four tools configured for 4-Way Cardinal Blossom:
  // 0: Calendar -> West (Left, PI)
  // 1: Tasks -> North (Top, PI / 2)
  // 2: Targets -> South (Bottom, 3*PI / 2)
  // 3: Focus Room -> East (Right, 0)
  const items = [
    {
      id: 'calendar',
      label: 'Calendar',
      icon: CalendarIcon,
      accentColor: 'text-blue-400',
      borderColor: 'border-blue-500/30',
      baseAngle: Math.PI,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      accentColor: 'text-indigo-400',
      borderColor: 'border-indigo-500/30',
      baseAngle: Math.PI / 2,
    },
    {
      id: 'targets',
      label: 'Targets',
      icon: Target,
      accentColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/30',
      baseAngle: (3 * Math.PI) / 2,
    },
    {
      id: 'focus',
      label: 'Focus Room',
      icon: AlarmClockCheck,
      accentColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      baseAngle: 0,
    },
  ];

  const getLayoutMetrics = useCallback((stageW: number) => {
    let tabWidth = 154; 
    let tabGap = 12;    
    let Ry = 180;       
    let spreadXDelta = 15;

    if (stageW < 400) {
      tabWidth = Math.max(110, Math.floor((stageW - 28) / 4.1));
      tabGap = 6;
      Ry = 110;
      spreadXDelta = 10;
    } else if (stageW < 520) {
      tabWidth = 120;
      tabGap = 8;
      Ry = 135;
      spreadXDelta = 12;
    } else if (stageW < 660) {
      tabWidth = 135;
      tabGap = 10;
      Ry = 155;
      spreadXDelta = 14;
    } else {
      tabWidth = 154;
      tabGap = 12;
      Ry = 180;
      spreadXDelta = 15;
    }

    const pitch = tabWidth + tabGap;
    const Rx = 1.0 * pitch + spreadXDelta;
    return { tabWidth, tabGap, pitch, Rx, Ry, spreadXDelta };
  }, []);

  const getInitialSlotX = useCallback((idx: number, pitch: number) => {
    return (idx - 1.5) * pitch;
  }, []);

  const applyInitialPositions = useCallback((stageW: number) => {
    const { tabWidth, pitch } = getLayoutMetrics(stageW);
    items.forEach((item, idx) => {
      const el = itemRefs.current[idx];
      if (el) {
        const initX = getInitialSlotX(idx, pitch);
        el.style.width = `${tabWidth}px`;
        el.style.transform = `translate3d(calc(-50% + ${initX}px), -50%, 0px) scale(1)`;
        el.style.opacity = '1';
        el.style.display = 'flex';
      }
    });
    if (logoRef.current) {
      logoRef.current.style.transform = `translate3d(-50%, -50%, 0px) scale(0)`;
      logoRef.current.style.opacity = '0';
      logoRef.current.style.display = 'none';
    }
  }, [getLayoutMetrics, getInitialSlotX]);

  // Responsive stage width listener
  useEffect(() => {
    const updateDimensions = () => {
      if (typeof window === 'undefined') return;
      const stageW = stageRef.current ? stageRef.current.clientWidth : (window.innerWidth >= 1024 ? window.innerWidth * 0.55 : window.innerWidth - 32);
      setStageWidth(stageW);
      stageWidthRef.current = stageW;
      applyInitialPositions(stageW);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && stageRef.current) {
      ro = new ResizeObserver(() => updateDimensions());
      ro.observe(stageRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (ro) ro.disconnect();
    };
  }, [applyInitialPositions]);

  const isVisibleRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);

  // Check if stage is visible in viewport
  const updateVisibility = useCallback(() => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    // Section is visible if top is within viewport and bottom has not scrolled past
    const inView = rect.top < vh * 0.88 && rect.bottom > 80;
    isVisibleRef.current = inView;
  }, []);

  // Autonomous cinematic animation loop with snappy pop-up for the UniWork logo
  useEffect(() => {
    applyInitialPositions(stageWidthRef.current);
    let animId: number;
    startTimeRef.current = null;
    updateVisibility();

    const cycleDurationMs = 7200; // 7.2 seconds full cycle

    const renderLoop = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = isVisibleRef.current ? (timestamp - startTimeRef.current) % cycleDurationMs : 0;
      const t = elapsed / 1000; // time in seconds

      const tRest = 1.20;
      const tSpread = 2.45;
      const tSmash = 3.35;
      const tLogoReveal = 4.25;
      const tHold = 6.05;
      const tCycleBack = 7.20;

      const { tabWidth, pitch, Rx: baseRx, Ry } = getLayoutMetrics(stageWidthRef.current);

      let Rx = baseRx;
      if (stageRef.current && typeof window !== 'undefined') {
        const stageW = stageRef.current.clientWidth || stageWidthRef.current;
        const maxAllowedRx = (stageW / 2) - (tabWidth / 2) - 16;
        Rx = Math.min(baseRx, Math.max(1.5 * pitch + 10, maxAllowedRx));
      }

      const logoEl = logoRef.current;

      if (t <= tRest) {
        // Initial clean lineup dock
        items.forEach((_, idx) => {
          const el = itemRefs.current[idx];
          if (!el) return;
          const initX = getInitialSlotX(idx, pitch);
          el.style.width = `${tabWidth}px`;
          el.style.display = 'flex';
          el.style.transform = `translate3d(calc(-50% + ${initX}px), -50%, 0px) scale(1)`;
          el.style.opacity = '1';
        });
        if (logoEl) {
          logoEl.style.display = 'none';
          logoEl.style.opacity = '0';
          logoEl.style.transform = 'translate3d(-50%, -50%, 0px) scale(0)';
        }
      } else if (t <= tSpread) {
        // Outward blossom into cardinal points
        const u = (t - tRest) / (tSpread - tRest);
        const eased = easeInOutCubic(u);

        items.forEach((item, idx) => {
          const el = itemRefs.current[idx];
          if (!el) return;

          const initX = getInitialSlotX(idx, pitch);
          const baseAngle = item.baseAngle;

          const targetBloomX = Rx * Math.cos(baseAngle);
          const targetBloomY = -Ry * Math.sin(baseAngle);

          const rowX = (1 - eased) * initX + eased * targetBloomX;
          const rowY = eased * targetBloomY + Math.sin(u * Math.PI) * 16 * (idx % 2 === 0 ? 1 : -1);

          el.style.display = 'flex';
          el.style.transform = `translate3d(calc(-50% + ${rowX}px), calc(-50% + ${rowY}px), 0px) scale(1)`;
          el.style.opacity = '1';
        });

        if (logoEl) {
          logoEl.style.display = 'none';
          logoEl.style.opacity = '0';
          logoEl.style.transform = 'translate3d(-50%, -50%, 0px) scale(0)';
        }
      } else if (t <= tSmash) {
        // Inward swirl & smash convergence
        const u = (t - tSpread) / (tSmash - tSpread);
        const easedPlunge = Math.pow(u, 1.75);
        const currentRx = Rx * (1 - easedPlunge);
        const currentRy = Ry * (1 - easedPlunge);

        items.forEach((item, idx) => {
          const el = itemRefs.current[idx];
          if (!el) return;

          const baseAngle = item.baseAngle;
          const currentAngle = baseAngle + u * (Math.PI * 1.35);

          const targetX = currentRx * Math.cos(currentAngle);
          const targetY = -currentRy * Math.sin(currentAngle);
          const scale = 1 - u * 0.15;
          const opacity = u >= 0.92 ? Math.max(0, (1 - u) / 0.08) : 1;

          el.style.display = 'flex';
          el.style.transform = `translate3d(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px), 0px) scale(${scale})`;
          el.style.opacity = `${opacity}`;
        });

        if (logoEl) {
          logoEl.style.display = 'none';
          logoEl.style.opacity = '0';
          logoEl.style.transform = 'translate3d(-50%, -50%, 0px) scale(0)';
        }
      } else if (t <= tLogoReveal) {
        // Pop-up reveal of the UniWork Logo with snappy spring easeOutBack
        items.forEach((_, idx) => {
          const el = itemRefs.current[idx];
          if (el) {
            el.style.display = 'none';
            el.style.opacity = '0';
          }
        });

        if (logoEl) {
          logoEl.style.display = 'flex';
          const uLogo = Math.min(1, (t - tSmash) / (tLogoReveal - tSmash));
          const easedLogoScale = easeOutBack(uLogo);
          const logoOpacity = Math.min(1, uLogo * 2.8);

          logoEl.style.transform = `translate3d(-50%, -50%, 0px) scale(${easedLogoScale})`;
          logoEl.style.opacity = `${logoOpacity}`;
        }
      } else if (t <= tHold) {
        // Brand showcase hold at crisp full scale
        items.forEach((_, idx) => {
          const el = itemRefs.current[idx];
          if (el) {
            el.style.display = 'none';
            el.style.opacity = '0';
          }
        });

        if (logoEl) {
          logoEl.style.display = 'flex';
          logoEl.style.transform = 'translate3d(-50%, -50%, 0px) scale(1)';
          logoEl.style.opacity = '1';
        }
      } else if (t <= tCycleBack) {
        // Smooth dissolve of logo & return to 4 tabs lineup
        const u = (t - tHold) / (tCycleBack - tHold);
        const eased = easeInOutCubic(u);

        if (logoEl) {
          logoEl.style.display = 'flex';
          logoEl.style.transform = `translate3d(-50%, -50%, 0px) scale(${1 - 0.12 * eased})`;
          logoEl.style.opacity = `${1 - eased}`;
        }

        items.forEach((item, idx) => {
          const el = itemRefs.current[idx];
          if (!el) return;

          const initX = getInitialSlotX(idx, pitch);
          const currentX = initX * eased;
          const currentScale = 0.88 + 0.12 * eased;

          el.style.width = `${tabWidth}px`;
          el.style.display = 'flex';
          el.style.transform = `translate3d(calc(-50% + ${currentX}px), -50%, 0px) scale(${currentScale})`;
          el.style.opacity = `${eased}`;
        });
      } else {
        // Lineup dock rest
        if (logoEl) {
          logoEl.style.display = 'none';
          logoEl.style.opacity = '0';
        }

        items.forEach((_, idx) => {
          const el = itemRefs.current[idx];
          if (!el) return;

          const initX = getInitialSlotX(idx, pitch);
          el.style.width = `${tabWidth}px`;
          el.style.display = 'flex';
          el.style.transform = `translate3d(calc(-50% + ${initX}px), -50%, 0px) scale(1)`;
          el.style.opacity = '1';
        });
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    const onScrollOrResize = () => {
      updateVisibility();
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    const scrollContainer = document.getElementById('uniwork-about-page');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', onScrollOrResize, { passive: true });
    }

    updateVisibility();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', onScrollOrResize);
      }
    };
  }, [applyInitialPositions, updateVisibility, getLayoutMetrics, getInitialSlotX]);

  const { tabWidth, pitch } = getLayoutMetrics(stageWidth);

  return (
    <section 
      ref={containerRef}
      id="one-workspace" 
      className="py-8 md:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 xl:gap-20 items-center relative z-10">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-5 flex flex-col justify-center text-left">
          <h2 className="text-3xl sm:text-4xl lg:text-[40px] xl:text-[46px] font-extrabold text-white tracking-tight leading-[1.18]">
            Everything you need. <br />
            <span className="inline-block whitespace-normal sm:whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              One connected workspace.
            </span>
          </h2>

          <p className="mt-5 text-slate-300 text-sm sm:text-base lg:text-lg leading-relaxed font-normal max-w-xl">
            UniWork brings your calendar, tasks, goals and focus sessions into one connected workspace. Organise your daily schedule, stay on top of your work and turn plans into consistent progress without having to juggle separate productivity tools.
          </p>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center w-full min-w-0">
          <div 
            ref={stageRef}
            className="w-full relative min-h-[380px] sm:min-h-[420px] lg:min-h-[465px] flex items-center justify-center select-none overflow-visible"
          >
            {/* THE FOUR COMPONENT BUTTONS / NODES */}
            {items.map((item, idx) => {
              const Icon = item.icon;
              const initialSlotX = getInitialSlotX(idx, pitch);

              return (
                <div
                  key={item.id}
                  ref={(el) => (itemRefs.current[idx] = el)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: `${tabWidth}px`,
                    transform: `translate3d(calc(-50% + ${initialSlotX}px), -50%, 0px)`,
                    willChange: 'transform, opacity',
                  }}
                  className={`z-20 h-11 sm:h-12 md:h-[48px] lg:h-[50px] flex items-center justify-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 md:px-5 rounded-xl sm:rounded-2xl bg-slate-900/95 border ${item.borderColor} shadow-xl shadow-black/50 backdrop-blur-md pointer-events-none transition-shadow ring-1 ring-white/10 shrink-0 text-center`}
                >
                  <Icon className={`w-4.5 h-4.5 sm:w-[18px] sm:h-[18px] md:w-[19px] md:h-[19px] flex-shrink-0 ${item.accentColor}`} />
                  <span className="text-white text-[12px] sm:text-[13px] md:text-[13.5px] lg:text-[14px] font-bold tracking-tight whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              );
            })}

            {/* CENTRAL REVEAL: PURE UNIWORK LOGO */}
            <div
              ref={logoRef}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate3d(-50%, -50%, 0px) scale(0)',
                opacity: 0,
                display: 'none',
                willChange: 'transform, opacity',
              }}
              className="z-30 flex items-center justify-center pointer-events-none"
            >
              <img 
                src={UNIWORK_DARK_LOGO_BASE64} 
                alt="UniWork" 
                className="h-20 sm:h-24 md:h-28 lg:h-32 w-auto object-contain select-none"
              />
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
