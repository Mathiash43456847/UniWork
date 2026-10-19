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

// Smooth monotonic deceleration: expands directly to full big size with zero bounce or shrink-back
function easeOutQuart(u: number): number {
  const c = Math.max(0, Math.min(1, u));
  return 1 - Math.pow(1 - c, 4);
}

export const UnifiedWorkspaceShowcase: React.FC<UnifiedWorkspaceShowcaseProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const triggerPointRef = useRef<HTMLDivElement | null>(null);

  // Direct element DOM refs for 60fps composite-thread updates
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const logoRef = useRef<HTMLDivElement | null>(null);

  const [stageWidth, setStageWidth] = useState(700);
  const stageWidthRef = useRef(700);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const hasTriggeredRef = useRef(false);
  const isInZoneRef = useRef(false);
  const isHoveredRef = useRef(false);

  // Four tools configured for Option C (4-Way Cardinal Blossom):
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

  // Layout sizing metrics:
  // Tab rectangles and words enlarged with generous, balanced margins on all sides (top, bottom, left, right)
  // Gap between each tab is strictly constant and equal across all 4 tabs
  // Center-to-center pitch = tabWidth + tabGap guarantees positive gap and zero overlap at all times
  const getLayoutMetrics = useCallback((stageW: number) => {
    // Increased base width to 154px for Focus Room and uniform sizing
    let tabWidth = 154; 
    let tabGap = 12;    
    let Ry = 180;       
    let spreadXDelta = 15; // Balanced bloom radius (Rx ≈ Ry)

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

    // Critical: pitch MUST be tabWidth + tabGap.
    const pitch = tabWidth + tabGap;
    // Normalized Rx for symmetrical blossom
    const Rx = 1.0 * pitch + spreadXDelta;
    return { tabWidth, tabGap, pitch, Rx, Ry, spreadXDelta };
  }, []);

  // Compute starting resting slot X offset (centered row around X = 0)
  // Indices: 0 (-1.5), 1 (-0.5), 2 (+0.5), 3 (+1.5)
  const getInitialSlotX = useCallback((idx: number, pitch: number) => {
    return (idx - 1.5) * pitch;
  }, []);

  // Set initial lineup state on DOM with strictly uniform tab widths and identical spaces in between
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

  // Responsive stage width listener adapted to actual stage canvas width
  useEffect(() => {
    const updateDimensions = () => {
      if (typeof window === 'undefined') return;
      const stageW = stageRef.current ? stageRef.current.clientWidth : (window.innerWidth >= 1024 ? window.innerWidth * 0.55 : window.innerWidth - 32);
      setStageWidth(stageW);
      stageWidthRef.current = stageW;
      if (!isRunningRef.current) {
        applyInitialPositions(stageW);
      }
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

  // 60fps cinematic physics loop:
  // Phase 0 (0 to tRest): 1 full second wait so tabs are clearly registered before movement begins
  // Phase 1 (tRest to tSpread): Tabs smoothly blossom outward into 4 cardinal points (N, S, E, W)
  // Phase 2 (tSpread to tSmash): Accelerating inward vortex swirl and violent SMASH collision at center
  // Phase 3 (tSmash to tLogoReveal): UniWork logo expands directly to full big size (monotonically, no shrink)
  // Phase 4 (tLogoReveal to tHold): Confident brand hold on UniWork logo (paused if user hovers)
  // Phase 5 (tHold to tCycleBack): Elegant dissolve & 4 tabs smoothly emerge from center back to horizontal lineup
  // Phase 6 (tCycleBack to totalCycle): Tabs rest in row for 1 full second before next cycle automatically starts
  const runAnimation = useCallback((immediate = false) => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const { tabWidth, pitch, Rx: baseRx, Ry } = getLayoutMetrics(stageWidthRef.current);

    // Compute live outward distance Rx bounded safely within stage width so tabs never clip the left text column or period
    let Rx = baseRx;
    if (stageRef.current && typeof window !== 'undefined') {
      const stageW = stageRef.current.clientWidth || stageWidthRef.current;
      const maxAllowedRx = (stageW / 2) - (tabWidth / 2) - 16;
      Rx = Math.min(baseRx, Math.max(1.5 * pitch + 10, maxAllowedRx));
    }

    const tRest = immediate ? 0.04 : 1.00; // 1 full second wait before animation starts
    const tSpread = tRest + 1.15;          // Outward cardinal glide (all 4 directions blossom outward)
    const tSmash = tSpread + 0.90;         // Accelerating inward swirl & collision
    const tLogoReveal = tSmash + 0.80;     // Logo expands smoothly straight to full big size (no overshoot/shrink)
    const tHold = tLogoReveal + 3.20;      // 3.2s logo showcase hold
    const tCycleBack = tHold + 0.70;       // Smooth dissolve & tabs emerge from center
    const totalCycle = tCycleBack + 1.00;  // 1 full second rest on tabs in horizontal lineup before next cycle

    startTimeRef.current = performance.now();
    lastFrameTimeRef.current = performance.now();
    isRunningRef.current = true;

    const tick = (now: number) => {
      if (!startTimeRef.current) return;

      // If user hovers over the showcase, slow down animation (progress at 25% speed so users can read)
      if (lastFrameTimeRef.current !== null) {
        const delta = now - lastFrameTimeRef.current;
        const timeScale = isHoveredRef.current ? 0.25 : 1.0;
        startTimeRef.current += delta * (1 - timeScale);
      }
      lastFrameTimeRef.current = now;

      const t = (now - startTimeRef.current) / 1000;
      const logoEl = logoRef.current;

      if (t <= tRest) {
        // Phase 0: 1 full second initial wait with tabs clearly visible
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
        // Phase 1: Smooth outward blossom into cardinal points
        // Left tab (Calendar) and Right tab (Focus Room) visibly move OUTWARD to -Rx and +Rx!
        // Top tab (Tasks) and Bottom tab (Targets) move OUTWARD to -Ry and +Ry!
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
          const rowY = eased * targetBloomY + Math.sin(u * Math.PI) * 18 * (idx % 2 === 0 ? 1 : -1);

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
        // Phase 2: Accelerating inward swirl and violent smash collision into center
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
          // Tabs stay fully visible until the exact impact moment
          const opacity = u >= 0.94 ? Math.max(0, (1 - u) / 0.06) : 1;

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
        // Phase 3: Exact collision impact triggers UniWork logo to expand to full big size (monotonically, no shrink)
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
          const easedLogoP = easeOutQuart(uLogo);
          const logoOpacity = Math.min(1, uLogo * 2.8);

          logoEl.style.transform = `translate3d(-50%, -50%, 0px) scale(${easedLogoP})`;
          logoEl.style.opacity = `${logoOpacity}`;
        }
      } else if (t <= tHold) {
        // Phase 4: UniWork brand hold
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
        // Phase 5: Cinematic dissolve of logo while 4 tabs smoothly emerge from center
        const u = (t - tHold) / (tCycleBack - tHold);
        const eased = easeInOutCubic(u);

        if (logoEl) {
          logoEl.style.display = 'flex';
          logoEl.style.transform = `translate3d(-50%, -50%, 0px) scale(${1 - 0.15 * eased})`;
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
      } else if (t <= totalCycle) {
        // Phase 6: Tabs rest in lineup for 1 full second before next cycle begins
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

      // Continuous loop control
      if (t >= totalCycle) {
        if (isInZoneRef.current) {
          // Tabs have already rested for 1 full second during Phase 6, so seamlessly transition directly into blossom
          startTimeRef.current = performance.now() - (tRest * 1000);
          lastFrameTimeRef.current = performance.now();
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          isRunningRef.current = false;
        }
      } else {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [getLayoutMetrics, getInitialSlotX]);

  // Scroll trigger: triggers and loops ONLY when the animation focal point touches the middle zone
  // (Viewport divided horizontally into 4 blocks; the 2 closest blocks in contact with the middle: 25% to 75%)
  useEffect(() => {
    applyInitialPositions(stageWidthRef.current);

    const getPointY = () => {
      if (triggerPointRef.current) {
        const r = triggerPointRef.current.getBoundingClientRect();
        return r.top + r.height / 2;
      }
      if (stageRef.current) {
        const r = stageRef.current.getBoundingClientRect();
        return r.top + r.height / 2;
      }
      return null;
    };

    const checkZone = () => {
      const pointY = getPointY();
      if (pointY === null) return;

      const vh = window.innerHeight || document.documentElement.clientHeight;
      // Viewport divided into 4 horizontal blocks:
      // Block 1: 0% - 25% (Top block)
      // Block 2: 25% - 50% (Upper middle block, touches middle line)
      // Block 3: 50% - 75% (Lower middle block, touches middle line)
      // Block 4: 75% - 100% (Bottom block)
      // The 2 closest blocks in contact with the middle: 25% to 75% of viewport
      const topQuarter = vh * 0.25;
      const bottomQuarter = vh * 0.75;

      const isTouchingMiddleZone = pointY >= topQuarter && pointY <= bottomQuarter;

      if (isTouchingMiddleZone) {
        isInZoneRef.current = true;
        if (!isRunningRef.current) {
          hasTriggeredRef.current = true;
          runAnimation(false);
        }
      } else {
        isInZoneRef.current = false;
        // If the element has scrolled completely away from viewport, reset so it replays smoothly when scrolled back
        if (stageRef.current) {
          const stageRect = stageRef.current.getBoundingClientRect();
          const isCompletelyOutOfView = stageRect.bottom < -50 || stageRect.top > vh + 50;
          if (isCompletelyOutOfView && hasTriggeredRef.current && !isRunningRef.current) {
            hasTriggeredRef.current = false;
            applyInitialPositions(stageWidthRef.current);
          }
        }
      }
    };

    // IntersectionObserver with rootMargin shrinking top and bottom by 25%
    // so intersection happens strictly in the middle 2 quarters
    let observer: IntersectionObserver | null = null;
    const pointEl = triggerPointRef.current || stageRef.current;
    if (pointEl && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              isInZoneRef.current = true;
              if (!isRunningRef.current) {
                hasTriggeredRef.current = true;
                runAnimation(false);
              }
            } else {
              isInZoneRef.current = false;
            }
          });
        },
        {
          rootMargin: '-25% 0px -25% 0px',
          threshold: 0,
        }
      );
      observer.observe(pointEl);
    }

    // Passive scroll listeners on both window and custom scroll container
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          checkZone();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    const scrollContainer = document.getElementById('uniwork-about-page');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        isRunningRef.current = false;
      } else {
        checkZone();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Initial check on mount
    checkZone();

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', onScroll);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [applyInitialPositions, runAnimation]);

  const { tabWidth, pitch } = getLayoutMetrics(stageWidth);

  return (
    <section 
      ref={containerRef}
      id="one-workspace" 
      className="py-8 md:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative"
    >
      {/* 12-Column Responsive Grid: 5 cols for text copy, 7 cols for animation stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 xl:gap-20 items-center relative z-10">
        
        {/* LEFT COLUMN: 5 columns */}
        <div className="lg:col-span-5 flex flex-col justify-center text-left">
          <h2 className="text-3xl sm:text-4xl lg:text-[40px] xl:text-[46px] font-extrabold text-white tracking-tight leading-[1.18]">
            Everything you need. <br />
            <span className="inline-block whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              One connected workspace.
            </span>
          </h2>

          <p className="mt-5 text-slate-300 text-sm sm:text-base lg:text-lg leading-relaxed font-normal max-w-xl">
            UniWork brings your calendar, tasks, goals and focus sessions into one connected workspace. Organise your daily schedule, stay on top of your work and turn plans into consistent progress without having to juggle separate productivity tools.
          </p>
        </div>

        {/* RIGHT COLUMN: 7 columns (58.4% width) - Generous horizontal clearance so Focus Room never gets stuck at the side */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center w-full min-w-0">
          <div 
            ref={stageRef}
            onMouseEnter={() => { isHoveredRef.current = true; }}
            onMouseLeave={() => { isHoveredRef.current = false; }}
            className="w-full relative min-h-[380px] sm:min-h-[420px] lg:min-h-[465px] flex items-center justify-center select-none overflow-visible"
          >
            {/* Focal animation center point for viewport middle-zone scroll detection */}
            <div
              ref={triggerPointRef}
              className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 z-0"
              aria-hidden="true"
            />

            {/* THE FOUR COMPONENT BUTTONS / NODES - Uniform length, strictly equal space, no overlap */}
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

            {/* CENTRAL REVEAL: PURE UNIWORK LOGO (NO CARD, NO GLOW, PROMINENT SCALE) */}
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
