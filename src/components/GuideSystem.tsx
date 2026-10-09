/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  Check, 
  Info, 
  HelpCircle, 
  Layers, 
  MousePointer, 
  Eye, 
  KeyRound,
  Zap,
  ArrowRight
} from 'lucide-react';
import { UniWorkAuraGlow } from './UniWorkAuraGlow';

export interface GuideStep {
  id: string;
  stepOrder: number;
  targetSelector: string;
  title: string;
  description: string;
  actionType: 'click_target' | 'click_next';
  position: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  createdAt?: string;
}

interface GuideSystemProps {
  isGuideModeArmed: boolean;
  onToggleGuideModeArmed?: (armed: boolean) => void;
  currentUser?: { id: string } | null;
}

export const GuideSystem: React.FC<GuideSystemProps> = ({
  isGuideModeArmed,
  onToggleGuideModeArmed,
  currentUser
}) => {
  const [guideSteps, setGuideSteps] = useState<GuideStep[]>([]);
  const [isAuthoringActive, setIsAuthoringActive] = useState<boolean>(false);
  const [isGuideTourActive, setIsGuideTourActive] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Authoring state
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);
  const [selectedSelector, setSelectedSelector] = useState<string>('');
  
  // Modal & Form state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [stepTitle, setStepTitle] = useState<string>('');
  const [stepDesc, setStepDesc] = useState<string>('');
  const [stepActionType, setStepActionType] = useState<'click_target' | 'click_next'>('click_next');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Tour Target Rect & Border Radius
  const [activeTourRect, setActiveTourRect] = useState<DOMRect | null>(null);
  const [activeTourBorderRadius, setActiveTourBorderRadius] = useState<string>('9999px');

  // Show Toast Helper
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // 1. Fetch saved guide steps on mount
  const fetchGuideSteps = useCallback(async () => {
    try {
      const res = await fetch('/api/guide-steps');
      const data = await res.json();
      if (data.success && Array.isArray(data.steps)) {
        setGuideSteps(data.steps);
      }
    } catch (err) {
      console.warn('Failed to load guide steps from server, falling back to localStorage:', err);
      try {
        const saved = localStorage.getItem('uniwork_guide_steps');
        if (saved) {
          setGuideSteps(JSON.parse(saved));
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    fetchGuideSteps();
  }, [fetchGuideSteps]);

  // Persist local steps
  const saveGuideStepsToServer = async (steps: GuideStep[]) => {
    setGuideSteps(steps);
    try {
      localStorage.setItem('uniwork_guide_steps', JSON.stringify(steps));
      await fetch('/api/guide-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps })
      });
    } catch (err) {
      console.error('Failed to sync guide steps with server:', err);
    }
  };

  // 2. Keyboard Shortcut Listener: Shift + Tab + Q
  const shiftPressedRef = useRef(false);
  const tabPressedRef = useRef(false);
  const qPressedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftPressedRef.current = true;
      if (e.key === 'Tab') tabPressedRef.current = true;
      if (e.key.toLowerCase() === 'q' || e.code === 'KeyQ') qPressedRef.current = true;

      const isShift = e.shiftKey || shiftPressedRef.current;
      const isTab = e.key === 'Tab' || tabPressedRef.current;
      const isQ = e.key.toLowerCase() === 'q' || e.code === 'KeyQ';

      if (isShift && isTab && isQ) {
        e.preventDefault();
        e.stopPropagation();

        if (!isGuideModeArmed) {
          showToast('⚠️ Enable "Edit Guide Mode" in Admin Panel first to activate Shift+Tab+Q shortcut.');
          return;
        }

        setIsAuthoringActive((prev) => {
          const nextState = !prev;
          if (nextState) {
            showToast('✨ Guide Authoring Mode ACTIVATED! Hover & click any button or icon to add a guide step.');
          } else {
            showToast('🔒 Guide Authoring Mode OFF');
            setSelectedElement(null);
            setSelectedRect(null);
            setIsAddModalOpen(false);
          }
          return nextState;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftPressedRef.current = false;
      if (e.key === 'Tab') tabPressedRef.current = false;
      if (e.key.toLowerCase() === 'q' || e.code === 'KeyQ') qPressedRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [isGuideModeArmed]);

  // Helper to generate CSS selector for an element
  const getSelectorForElement = (el: HTMLElement): string => {
    if (el.getAttribute('data-guide-id')) {
      return `[data-guide-id="${el.getAttribute('data-guide-id')}"]`;
    }
    if (el.id) {
      return `#${el.id}`;
    }
    if (el.getAttribute('aria-label')) {
      return `[aria-label="${el.getAttribute('aria-label')}"]`;
    }
    if (el.tagName === 'BUTTON') {
      const text = el.innerText.trim();
      if (text) {
        return `button:has-text("${text.slice(0, 20)}")`;
      }
    }
    // Tag + Classes
    const classes = Array.from(el.classList)
      .filter((c) => !c.startsWith('hover:') && !c.startsWith('focus:') && !c.includes(':'))
      .slice(0, 2)
      .join('.');
    return `${el.tagName.toLowerCase()}${classes ? '.' + classes : ''}`;
  };

  // 3. Mouse Inspectors during Authoring Mode
  useEffect(() => {
    if (!isAuthoringActive || isAddModalOpen || isManageModalOpen) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore elements inside authoring controls or modals
      if (target.closest('[data-guide-ui="true"]')) {
        setHoveredElement(null);
        setHoverRect(null);
        return;
      }

      // Find best element wrapper (button, link, input, tab, icon container)
      const clickable = target.closest('button, a, input, select, [role="button"], [data-guide-id], td, th, h1, h2, h3, .cursor-pointer') as HTMLElement | null;
      const elToHighlight = clickable || target;

      setHoveredElement(elToHighlight);
      setHoverRect(elToHighlight.getBoundingClientRect());
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('[data-guide-ui="true"]')) {
        return; // Allow interactions inside authoring bar/modals
      }

      e.preventDefault();
      e.stopPropagation();

      const clickable = target.closest('button, a, input, select, [role="button"], [data-guide-id], td, th, h1, h2, h3, .cursor-pointer') as HTMLElement | null;
      const selected = clickable || target;

      const selector = getSelectorForElement(selected);
      setSelectedElement(selected);
      setSelectedRect(selected.getBoundingClientRect());
      setSelectedSelector(selector);

      // Pre-fill form
      const elText = selected.innerText || selected.getAttribute('title') || selected.getAttribute('aria-label') || 'Selected Item';
      setStepTitle(elText.slice(0, 35));
      setStepDesc(`Click or interact with ${elText.slice(0, 25)} to perform action.`);
      setStepActionType('click_next');
      setIsAddModalOpen(true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick, true);
    };
  }, [isAuthoringActive, isAddModalOpen, isManageModalOpen]);

  // Recalculate selected rect on resize/scroll
  useEffect(() => {
    if (!selectedElement) return;
    const updateRect = () => {
      setSelectedRect(selectedElement.getBoundingClientRect());
    };
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [selectedElement]);

  // Save new step
  const handleSaveNewStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepTitle.trim() || !stepDesc.trim() || !selectedSelector) {
      showToast('Please fill in title and description.');
      return;
    }

    const newStep: GuideStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      stepOrder: guideSteps.length + 1,
      targetSelector: selectedSelector,
      title: stepTitle.trim(),
      description: stepDesc.trim(),
      actionType: stepActionType,
      position: 'auto',
      createdAt: new Date().toISOString()
    };

    const updated = [...guideSteps, newStep];
    await saveGuideStepsToServer(updated);

    showToast(`✅ Added guide step: "${newStep.title}"`);
    setIsAddModalOpen(false);
    setSelectedElement(null);
    setSelectedRect(null);
  };

  // Manage steps handlers
  const handleDeleteStep = async (id: string) => {
    const updated = guideSteps.filter((s) => s.id !== id).map((s, idx) => ({ ...s, stepOrder: idx + 1 }));
    await saveGuideStepsToServer(updated);
    showToast('Removed guide step.');
  };

  const handleMoveStep = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === guideSteps.length - 1) return;

    const newArr = [...guideSteps];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;

    const reordered = newArr.map((s, idx) => ({ ...s, stepOrder: idx + 1 }));
    await saveGuideStepsToServer(reordered);
  };

  // 4. Tour Runner Logic
  const currentTourStep = guideSteps[currentStepIndex];

  // Find DOM element for current step
  const prevElevatedElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isGuideTourActive || !currentTourStep) {
      setActiveTourRect(null);
      if (prevElevatedElRef.current) {
        prevElevatedElRef.current.style.position = prevElevatedElRef.current.dataset.origPosition || '';
        prevElevatedElRef.current.style.zIndex = prevElevatedElRef.current.dataset.origZIndex || '';
        delete prevElevatedElRef.current.dataset.origPosition;
        delete prevElevatedElRef.current.dataset.origZIndex;
        prevElevatedElRef.current = null;
      }
      return;
    }

    const findTarget = () => {
      let el: HTMLElement | null = null;
      try {
        if (currentTourStep.targetSelector.startsWith('button:has-text(')) {
          const textMatch = currentTourStep.targetSelector.match(/"([^"]+)"/);
          if (textMatch) {
            const buttons = Array.from(document.querySelectorAll('button'));
            el = buttons.find((b) => b.innerText.includes(textMatch[1])) || null;
          }
        } else {
          el = document.querySelector(currentTourStep.targetSelector) as HTMLElement | null;
        }
      } catch (err) {
        // fallback
      }

      // Restore previously elevated element if target changed
      if (prevElevatedElRef.current && prevElevatedElRef.current !== el) {
        prevElevatedElRef.current.style.position = prevElevatedElRef.current.dataset.origPosition || '';
        prevElevatedElRef.current.style.zIndex = prevElevatedElRef.current.dataset.origZIndex || '';
        delete prevElevatedElRef.current.dataset.origPosition;
        delete prevElevatedElRef.current.dataset.origZIndex;
        prevElevatedElRef.current = null;
      }

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        setActiveTourRect(el.getBoundingClientRect());
        try {
          const cs = window.getComputedStyle(el);
          const br = cs.borderRadius && cs.borderRadius !== '0px' ? cs.borderRadius : '9999px';
          setActiveTourBorderRadius(br);
        } catch (e) {
          setActiveTourBorderRadius('9999px');
        }

        // Elevate element so it sits ON TOP of aura glow (glow stays BEHIND button)
        if (!el.dataset.origPosition) {
          el.dataset.origPosition = el.style.position || '';
          el.dataset.origZIndex = el.style.zIndex || '';
        }
        const curPos = window.getComputedStyle(el).position;
        el.style.position = curPos && curPos !== 'static' ? curPos : 'relative';
        el.style.zIndex = '99975';
        prevElevatedElRef.current = el;
      } else {
        setActiveTourRect(null);
      }
    };

    findTarget();
    const interval = setInterval(findTarget, 400);

    window.addEventListener('resize', findTarget);
    window.addEventListener('scroll', findTarget, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', findTarget);
      window.removeEventListener('scroll', findTarget, true);
      if (prevElevatedElRef.current) {
        prevElevatedElRef.current.style.position = prevElevatedElRef.current.dataset.origPosition || '';
        prevElevatedElRef.current.style.zIndex = prevElevatedElRef.current.dataset.origZIndex || '';
        delete prevElevatedElRef.current.dataset.origPosition;
        delete prevElevatedElRef.current.dataset.origZIndex;
        prevElevatedElRef.current = null;
      }
    };
  }, [isGuideTourActive, currentStepIndex, currentTourStep]);

  // Click target step listener
  useEffect(() => {
    if (!isGuideTourActive || !currentTourStep || currentTourStep.actionType !== 'click_target') return;

    const handleTargetClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      let el: HTMLElement | null = null;
      try {
        el = document.querySelector(currentTourStep.targetSelector) as HTMLElement | null;
      } catch {
        // ignore
      }

      if (el && (el === target || el.contains(target))) {
        // Advance tour
        setTimeout(() => {
          if (currentStepIndex < guideSteps.length - 1) {
            setCurrentStepIndex((prev) => prev + 1);
          } else {
            setIsGuideTourActive(false);
            showToast('🎉 You completed the UniWork tour!');
          }
        }, 150);
      }
    };

    window.addEventListener('click', handleTargetClick, true);
    return () => {
      window.removeEventListener('click', handleTargetClick, true);
    };
  }, [isGuideTourActive, currentStepIndex, currentTourStep, guideSteps.length]);

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            data-guide-ui="true"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[100000] px-5 py-3 rounded-2xl bg-slate-900/95 border border-cyan-500/40 text-white text-xs font-semibold shadow-2xl backdrop-blur-xl flex items-center gap-3"
          >
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP AUTHORING MODE BAR */}
      <AnimatePresence>
        {isAuthoringActive && (
          <motion.div
            data-guide-ui="true"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[99990] bg-slate-900 border-b border-cyan-500/40 px-4 py-2.5 shadow-2xl flex items-center justify-between gap-4 text-xs font-sans text-white"
          >
            <div className="flex items-center gap-3">
              <div className="px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Guide Authoring Mode Active</span>
              </div>
              <p className="hidden md:block text-slate-300 text-[11px]">
                Hover and click any button or icon to highlight it and attach a guide step. Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-[10px]">Shift + Tab + Q</kbd> to exit.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsManageModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Manage Steps ({guideSteps.length})</span>
              </button>

              <button
                onClick={() => {
                  if (guideSteps.length > 0) {
                    setCurrentStepIndex(0);
                    setIsGuideTourActive(true);
                  } else {
                    showToast('No guide steps saved yet. Add a step first!');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-300" />
                <span>Preview Tour</span>
              </button>

              <button
                onClick={() => {
                  setIsAuthoringActive(false);
                  setSelectedElement(null);
                  setSelectedRect(null);
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition cursor-pointer ml-1"
                title="Exit Authoring Mode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AUTHORING HOVER OUTLINE */}
      {isAuthoringActive && hoverRect && !isAddModalOpen && !isManageModalOpen && (
        <div
          data-guide-ui="true"
          style={{
            position: 'fixed',
            left: `${hoverRect.left - 4}px`,
            top: `${hoverRect.top - 4}px`,
            width: `${hoverRect.width + 8}px`,
            height: `${hoverRect.height + 8}px`,
            pointerEvents: 'none',
            zIndex: 99980,
          }}
          className="rounded-xl border-2 border-dashed border-cyan-400 bg-cyan-500/10 transition-all duration-75 flex items-start justify-end p-1"
        >
          <span className="px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 font-mono text-[9px] font-bold shadow-sm">
            Click to target
          </span>
        </div>
      )}

      {/* SELECTED ELEMENT RAINBOW AURA PREVIEW & FORM MODAL */}
      <AnimatePresence>
        {isAuthoringActive && isAddModalOpen && selectedRect && (
          <>
            {/* Rainbow Aura Glow surrounding the selected target! */}
            <div
              data-guide-ui="true"
              style={{
                position: 'fixed',
                left: `${selectedRect.left - 6}px`,
                top: `${selectedRect.top - 6}px`,
                width: `${selectedRect.width + 12}px`,
                height: `${selectedRect.height + 12}px`,
                pointerEvents: 'none',
                zIndex: 99985,
              }}
              className="rounded-2xl"
            >
              <UniWorkAuraGlow active={true} intensity="card" configId="guide" />
            </div>

            {/* Modal Overlay / Form */}
            <div
              data-guide-ui="true"
              className="fixed inset-0 z-[99995] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-white space-y-5"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Add Guide Step</h3>
                      <p className="text-[11px] text-slate-400">Target: {selectedSelector}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setSelectedElement(null);
                      setSelectedRect(null);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveNewStep} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Step Title
                    </label>
                    <input
                      type="text"
                      value={stepTitle}
                      onChange={(e) => setStepTitle(e.target.value)}
                      placeholder="e.g. Focus Lock Timer"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-white focus:outline-none focus:border-cyan-500 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Explanation ("Why press or use this")
                    </label>
                    <textarea
                      value={stepDesc}
                      onChange={(e) => setStepDesc(e.target.value)}
                      placeholder="Explain why the user should click or use this feature..."
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-white focus:outline-none focus:border-cyan-500 transition resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      User Progression Trigger
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setStepActionType('click_next')}
                        className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                          stepActionType === 'click_next'
                            ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-200 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="block font-bold mb-0.5">Show 'Next' Button</span>
                        <span className="text-[10px] opacity-80 block">User advances by clicking Next</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStepActionType('click_target')}
                        className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                          stepActionType === 'click_target'
                            ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-200 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="block font-bold mb-0.5">Require Target Click</span>
                        <span className="text-[10px] opacity-80 block">User must click highlighted button</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddModalOpen(false);
                        setSelectedElement(null);
                        setSelectedRect(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold transition cursor-pointer shadow-lg shadow-cyan-500/20"
                    >
                      Save Step
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* MANAGE STEPS MODAL */}
      <AnimatePresence>
        {isManageModalOpen && (
          <div
            data-guide-ui="true"
            className="fixed inset-0 z-[99998] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-white space-y-5 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Manage Guide Steps</h3>
                    <p className="text-[11px] text-slate-400">Reorder, edit or remove walkthrough steps</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsManageModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {guideSteps.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                    No steps created yet. Hover and click any button in UniWork during Authoring mode to create a step!
                  </div>
                ) : (
                  guideSteps.map((s, idx) => (
                    <div
                      key={s.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-cyan-400 flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-white">{s.title}</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{s.description}</p>
                          <span className="inline-block mt-1 text-[9px] font-mono text-cyan-400/80">
                            {s.actionType === 'click_target' ? 'Action: Target Click' : 'Action: Next Button'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMoveStep(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveStep(idx, 'down')}
                          disabled={idx === guideSteps.length - 1}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStep(s.id)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 cursor-pointer ml-1"
                          title="Delete Step"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
                <button
                  onClick={() => {
                    setIsManageModalOpen(false);
                    if (guideSteps.length > 0) {
                      setCurrentStepIndex(0);
                      setIsGuideTourActive(true);
                    }
                  }}
                  disabled={guideSteps.length === 0}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-cyan-300 transition cursor-pointer flex items-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Full Tour</span>
                </button>

                <button
                  onClick={() => setIsManageModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* USER WALKTHROUGH TOUR RUNNER OVERLAY */}
      <AnimatePresence>
        {isGuideTourActive && currentTourStep && (
          <>
            {/* Target Highlight Aura Glow */}
            {activeTourRect && (
              <div
                data-guide-ui="true"
                style={{
                  position: 'fixed',
                  left: `${activeTourRect.left}px`,
                  top: `${activeTourRect.top}px`,
                  width: `${activeTourRect.width}px`,
                  height: `${activeTourRect.height}px`,
                  pointerEvents: 'none',
                  zIndex: 99970,
                  borderRadius: activeTourBorderRadius || '12px',
                }}
                className="transition-all duration-300 overflow-visible"
              >
                <UniWorkAuraGlow active={true} intensity="button" borderRadius={activeTourBorderRadius || '9999px'} configId="guide" />
              </div>
            )}

            {/* Floating Contextual Tooltip Popover Card */}
            <div
              data-guide-ui="true"
              style={
                activeTourRect
                  ? {
                      position: 'fixed',
                      left: Math.max(16, Math.min(window.innerWidth - 340, activeTourRect.left)),
                      top: activeTourRect.bottom + 16 > window.innerHeight - 200 
                        ? Math.max(16, activeTourRect.top - 210) 
                        : activeTourRect.bottom + 16,
                      zIndex: 99975,
                    }
                  : {
                      position: 'fixed',
                      bottom: '24px',
                      right: '24px',
                      zIndex: 99975,
                    }
              }
              className="w-80 rounded-2xl bg-slate-900/95 border border-cyan-500/40 p-5 shadow-2xl text-white backdrop-blur-xl transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase tracking-wider border border-cyan-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Step {currentStepIndex + 1} of {guideSteps.length}</span>
                </span>

                <button
                  onClick={() => setIsGuideTourActive(false)}
                  className="text-slate-400 hover:text-white transition text-xs font-semibold cursor-pointer"
                >
                  Skip Tour
                </button>
              </div>

              <h3 className="text-sm font-bold text-white mb-1.5">{currentTourStep.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">{currentTourStep.description}</p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentStepIndex === 0}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-semibold text-slate-300 transition cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                {currentTourStep.actionType === 'click_target' ? (
                  <span className="text-[10px] font-bold text-amber-400 animate-pulse flex items-center gap-1">
                    <MousePointer className="w-3 h-3" />
                    <span>Click highlighted button</span>
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      if (currentStepIndex < guideSteps.length - 1) {
                        setCurrentStepIndex((prev) => prev + 1);
                      } else {
                        setIsGuideTourActive(false);
                        showToast('🎉 Tour completed!');
                      }
                    }}
                    className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold transition cursor-pointer flex items-center gap-1 shadow-md shadow-cyan-500/20"
                  >
                    <span>{currentStepIndex === guideSteps.length - 1 ? 'Finish' : 'Next'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
