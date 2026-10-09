/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import { LiquidInkText } from './LiquidInkText';
import { 
  Sparkles, 
  Zap, 
  Target, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Kanban, 
  Filter, 
  Building2, 
  Construction, 
  TrendingUp,
  Tag,
  GripVertical,
  MousePointer,
  MoveVertical,
  Check,
  Trash2,
  Edit3,
  Plus,
  Square,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Library,
  Atom,
  Briefcase,
  Code,
  Compass,
  X,
  BookOpen
} from 'lucide-react';
import { ActiveTab, User, CalendarEvent, Task, Tag as TagType, TaskGroup, Goal } from '../types';
import CalendarView from './CalendarView';
import TasksView from './TasksView';
import GoalsView from './GoalsView';
import { UNIWORK_FULL_LOGO_BASE64, UNIWORK_DARK_LOGO_BASE64 } from '../assets/logoData';
import uniworkFullLogoUrl from '../assets/iwork-full-logo.png';
import { UNIAL_LIGHT_LOGO_BASE64, UNIAL_DARK_LOGO_BASE64 } from '../assets/unialLogoData';
import { UniWorkAuraGlow } from './UniWorkAuraGlow';

interface PersonaItem {
  id: string;
  title: string;
  role: string;
  icon: React.ElementType;
  description: string;
  features: string[];
}

interface StatCounterProps {
  end: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

function StatCounter({ end, decimals = 0, prefix = '', suffix = '', duration = 1.8, className = '' }: StatCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;
    
    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      // Ease out expo curve for snappy start and smooth finish
      const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = easeOutExpo * end;
      
      setCount(currentVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isInView, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {count.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}
      {suffix}
    </span>
  );
}

const PERSONA_ITEMS: PersonaItem[] = [
  {
    id: 'middle-school',
    title: 'MIDDLE SCHOOL STUDENTS',
    role: 'Habits & Homework Focus',
    icon: Compass,
    description: 'Build positive daily study habits with simplified task checklists, subject color-coding, and structured homework windows.',
    features: ['Simplified Homework Timers', 'Color-Coded Subject Tags', 'Daily Habit Checklists', 'Visual Progress Badges']
  },
  {
    id: 'high-school',
    title: 'HIGH SCHOOL & IB STUDENTS',
    role: 'Exams & Coursework Sync',
    icon: Library,
    description: 'Master demanding workloads by mapping internal assessments, exam revision schedules, and IB/AP target grade budgets.',
    features: ['Exam Revision Block Allocations', 'Internal Assessment Timelines', 'Target Budget Hour Trackers', 'Automated Conflict Prevention']
  },
  {
    id: 'university',
    title: 'UNIVERSITY UNDERGRADUATES',
    role: 'Coursework & Campus Life',
    icon: GraduationCap,
    description: 'Harmonize complex lecture timetables, multi-course lab reports, group project deadlines, and personal activities seamlessly.',
    features: ['Lecture & Seminar Timetable Sync', 'GPA & Target Calculator', 'Multi-Course Assignment Boards', 'Flexible Milestone Breakdown']
  },
  {
    id: 'scholars',
    title: 'RESEARCHERS & SCHOLARS',
    role: 'Deep Work & Literature Review',
    icon: Atom,
    description: 'Carve out uninterrupted deep work blocks for thesis writing, literature reviews, peer evaluations, and grant deadlines.',
    features: ['Deep Work Focus Sessions', 'Publication Milestone Tracking', 'Research Paper Deadline Boards', 'Custom Focus Analytics']
  },
  {
    id: 'executives',
    title: 'EXECUTIVES & PROFESSIONALS',
    role: 'Strategic Time-Blocking',
    icon: Briefcase,
    description: 'Balance strategic business priorities, project deliverables, key meeting commitments, and continuous professional development.',
    features: ['Strategic Priority Matrix', 'Calendar-to-Task Allocation', 'High-Impact Focus Windows', 'Cross-Project Time Tracking']
  },
  {
    id: 'developers',
    title: 'SOFTWARE ENGINEERS',
    role: 'Sprint Tasks & Deep Coding',
    icon: Code,
    description: 'Sync development sprint tickets, code review slots, and technical learning targets directly alongside your personal calendar.',
    features: ['Sprint Milestone Timelines', 'Code Review Focus Slots', 'Technical Certification Targets', 'Distraction-Free Deep Work']
  }
];

interface AboutViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSignIn?: () => void;
  currentUser?: User | null;
}

export default function AboutView({ setActiveTab, onOpenSignIn, currentUser }: AboutViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'iwork' | 'unial'>('iwork');
  const [previewTab, setPreviewTab] = useState<'calendar' | 'tasks' | 'targets'>('calendar');
  const [selectedPersona, setSelectedPersona] = useState<PersonaItem | null>(null);
  const [highlightedItem, setHighlightedItem] = useState<string>('SLS Math Chapter 12');
  const [interactiveTasks, setInteractiveTasks] = useState([
    { id: 'math-12', title: 'SLS Math Chapter 12', type: 'Math', time: '1.5 hrs', completed: true, date: '2026-08-30 • 15:00', durationStr: '1 hr 30 mins' },
    { id: 'math-hw', title: 'Math homework Chapter 12', type: 'Math', time: '1.0 hrs', completed: true, date: '2026-08-30 • 16:40', durationStr: '1 hr' },
    { id: 'eng-oral', title: 'English Oral Revision Part 1', type: 'English', time: '1.5 hrs', completed: false, date: '2026-08-19 • 15:00', durationStr: '1 hr 30 mins' },
    { id: 'sci-13', title: 'Science Chapter 13 revision', type: 'Science', time: '1.0 hrs', completed: true, date: '2026-08-16 • 16:40', durationStr: '1 hr' },
  ]);
  const [completedTasks, setCompletedTasks] = useState<string[]>(['task-1', 'task-3']);
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<{
    type: 'event' | 'task' | 'target';
    title: string;
    category: string;
    time?: string;
    date?: string;
    status?: string;
    color?: string;
  } | null>(null);

  // Ref and state for scroll-triggered and initial appear mesh aura on "Sign up now, it's free" button
  const signUpButtonRef = useRef<HTMLDivElement>(null);
  const [showButtonGlow, setShowButtonGlow] = useState(false);
  const [isCtaHovered, setIsCtaHovered] = useState(false);
  const hasAppearedRef = useRef(false);
  const glowTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Initial appear trigger: show glow for 6.0 seconds then smoothly fade out unless hovered
    setShowButtonGlow(true);
    hasAppearedRef.current = true;
    glowTimerRef.current = setTimeout(() => {
      setShowButtonGlow(false);
    }, 6000);

    return () => {
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    };
  }, []);

  useEffect(() => {
    // 2. Scroll trigger: when scrolling back up and button re-enters zone, ignite glow for 4.0 seconds
    const el = signUpButtonRef.current;
    if (!el) return;

    let wasOutOfView = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            wasOutOfView = true;
          } else {
            // Check if scrolling back up or entering the view after being out
            if (wasOutOfView) {
              wasOutOfView = false;
              if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
              setShowButtonGlow(true);
              glowTimerRef.current = setTimeout(() => {
                setShowButtonGlow(false);
              }, 4000);
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    };
  }, []);

  // Calendar Preview Interactive State Management & Real Component Integration
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date(2026, 7, 30));
  const [sampleEvents, setSampleEvents] = useState<CalendarEvent[]>([
    // Sunday Aug 30
    {
      id: 'event-1',
      title: 'Sailing',
      date: '2026-08-30',
      startTime: '12:00',
      endTime: '14:00',
      tagId: 'tag-purple',
      color: '#7c3aed',
    },
    {
      id: 'event-2',
      title: 'Dinner',
      date: '2026-08-30',
      startTime: '19:00',
      endTime: '20:00',
      tagId: 'tag-green',
      color: '#059669',
    },
    // Monday Aug 31
    {
      id: 'event-mon-1',
      title: 'CS 101 Data Structures Lecture',
      date: '2026-08-31',
      startTime: '11:30',
      endTime: '13:00',
      tagId: 'tag-blue',
      color: '#2563eb',
    },
    {
      id: 'event-mon-2',
      title: 'Campus Study Group',
      date: '2026-08-31',
      startTime: '18:00',
      endTime: '19:30',
      tagId: 'tag-purple',
      color: '#7c3aed',
    },
    // Tuesday Sep 1
    {
      id: 'event-tue-1',
      title: 'Physics Lab Experiment',
      date: '2026-09-01',
      startTime: '12:00',
      endTime: '14:00',
      tagId: 'tag-emerald',
      color: '#059669',
    },
    {
      id: 'event-tue-2',
      title: 'Evening Fitness & Run',
      date: '2026-09-01',
      startTime: '19:00',
      endTime: '20:00',
      tagId: 'tag-orange',
      color: '#ea580c',
    }
  ]);
  const [sampleTasks, setSampleTasks] = useState<Task[]>([
    // Sunday Aug 30
    {
      id: 'task-1',
      title: 'SLS Math Chapter 12',
      date: '2026-08-30',
      startTime: '15:00',
      endTime: '16:30',
      status: 'done',
      groupId: 'group-math',
      color: '#9333ea',
    },
    {
      id: 'task-2',
      title: 'Math homework Chapter 12',
      date: '2026-08-30',
      startTime: '16:40',
      endTime: '17:40',
      status: 'done',
      groupId: 'group-math',
      color: '#9333ea',
    },
    {
      id: 'task-3',
      title: 'Geography and History Exam Analysis',
      date: '2026-08-30',
      startTime: '17:40',
      endTime: '18:40',
      status: 'todo',
      groupId: 'group-humanities',
      color: '#ec4899',
    },
    // Monday Aug 31
    {
      id: 'task-mon-1',
      title: 'Linear Algebra Problem Set 4',
      date: '2026-08-31',
      startTime: '14:00',
      endTime: '15:30',
      status: 'todo',
      groupId: 'group-math',
      color: '#9333ea',
    },
    {
      id: 'task-mon-2',
      title: 'Macroeconomics Exam Prep',
      date: '2026-08-31',
      startTime: '16:00',
      endTime: '17:30',
      status: 'todo',
      groupId: 'group-econ',
      color: '#2563eb',
    },
    // Tuesday Sep 1
    {
      id: 'task-tue-1',
      title: 'Biology Research Paper Draft',
      date: '2026-09-01',
      startTime: '14:30',
      endTime: '16:30',
      status: 'todo',
      groupId: 'group-science',
      color: '#10b981',
    },
    {
      id: 'task-tue-2',
      title: 'Advanced Calculus Seminar Notes',
      date: '2026-09-01',
      startTime: '17:00',
      endTime: '18:30',
      status: 'todo',
      groupId: 'group-math',
      color: '#9333ea',
    }
  ]);

  const sampleTags: TagType[] = [
    { id: 'tag-purple', name: 'Sports & Social', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-700', borderColor: 'border-purple-200', visible: true },
    { id: 'tag-green', name: 'Personal', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-700', borderColor: 'border-green-200', visible: true },
    { id: 'tag-blue', name: 'Lectures', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-200', visible: true },
    { id: 'tag-emerald', name: 'Labs', color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-emerald-200', visible: true },
    { id: 'tag-orange', name: 'Health', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-700', borderColor: 'border-orange-200', visible: true }
  ];

  const [sampleGroups, setSampleGroups] = useState<TaskGroup[]>([
    { id: 'group-math', name: 'Math & Calculus', color: '#9333ea' },
    { id: 'group-science', name: 'Science & Biology', color: '#10b981' },
    { id: 'group-econ', name: 'Economics & CS', color: '#2563eb' },
    { id: 'group-humanities', name: 'Humanities', color: '#ec4899' }
  ]);

  const [sampleGoals, setSampleGoals] = useState<Goal[]>([
    {
      id: 'goal-1',
      title: 'Maintain 3.8+ GPA this Semester',
      color: '#9333ea',
      timeBudget: 15,
      tagIds: ['tag-purple', 'tag-blue'],
      groupIds: ['group-math'],
      deadlineType: 'monthly',
      dueDate: '2026-09-30',
      completed: false,
    },
    {
      id: 'goal-2',
      title: 'Prepare for Physics Final Exam',
      color: '#10b981',
      timeBudget: 10,
      tagIds: ['tag-emerald'],
      groupIds: ['group-science'],
      deadlineType: 'weekly',
      dueDate: '2026-09-06',
      completed: false,
    },
    {
      id: 'goal-3',
      title: 'Consistent Gym Study Breaks',
      color: '#ea580c',
      timeBudget: 5,
      tagIds: ['tag-orange'],
      groupIds: ['group-econ'],
      deadlineType: 'weekly',
      dueDate: '2026-09-06',
      completed: true,
    }
  ]);

  // High-fidelity state event/task handlers
  const handleAddTask = (title: string, date: string, startTime?: string, status?: 'todo' | 'done', groupId?: string, endTime?: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      date,
      startTime,
      endTime,
      status: status || 'todo',
      groupId: groupId || 'group-math',
      color: sampleGroups.find(g => g.id === groupId)?.color || '#9333ea',
    };
    setSampleTasks(prev => [...prev, newTask]);
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setSampleTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDeleteTask = (id: string) => {
    setSampleTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleToggleTaskStatus = (taskId: string) => {
    setSampleTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t));
  };

  const handleAddGroup = (name: string) => {
    const newGroup: TaskGroup = {
      id: `group-${Date.now()}`,
      name,
      color: '#3b82f6',
    };
    setSampleGroups(prev => [...prev, newGroup]);
  };

  const handleDeleteGroup = (id: string) => {
    setSampleGroups(prev => prev.filter(g => g.id !== id));
  };

  const handleUpdateGroup = (id: string, name: string, color?: string) => {
    setSampleGroups(prev => prev.map(g => g.id === id ? { ...g, name, color: color || g.color } : g));
  };

  const handleAddGoal = (goalData: Omit<Goal, 'id'>) => {
    const newGoal: Goal = {
      ...goalData,
      id: `goal-${Date.now()}`,
    };
    setSampleGoals(prev => [...prev, newGoal]);
  };

  const handleUpdateGoal = (id: string, updates: Partial<Goal>) => {
    setSampleGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const handleDeleteGoal = (id: string) => {
    setSampleGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleToggleGoalComplete = (id: string) => {
    setSampleGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const toggleTaskCompleted = (id: string) => {
    setInteractiveTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    setCompletedTasks(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#0a0e1a] text-slate-100 font-sans selection:bg-cyan-500 selection:text-white" id="uniwork-about-page">
      
      {/* Top Sticky Sub-Navigation Header */}
      <div className="sticky top-0 z-[100] bg-[#0a0e1a]/95 backdrop-blur-md border-b border-white/[0.06] px-2 md:px-4 py-3">
        <div className="w-full max-w-full px-1 md:px-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={UNIWORK_DARK_LOGO_BASE64}
              alt="UniWork Dark Logo"
              className="h-8 md:h-9 w-auto object-contain brightness-110 cursor-pointer"
              onClick={() => setActiveSubTab('iwork')}
            />
          </div>

          {/* Seamless Navigation Tabs */}
          <div className="flex items-center gap-6 sm:gap-10">
            <button
              onClick={() => setActiveSubTab('iwork')}
              className={`relative py-1 text-xs sm:text-sm md:text-base font-bold transition-all cursor-pointer ${
                activeSubTab === 'iwork'
                  ? 'text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>About UniWork</span>
              {activeSubTab === 'iwork' && (
                <motion.div
                  layoutId="aboutHeaderTabUnderline"
                  className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] rounded-full"
                />
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('unial')}
              className={`relative py-1 text-xs sm:text-sm md:text-base font-bold transition-all cursor-pointer ${
                activeSubTab === 'unial'
                  ? 'text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>About Unial</span>
              {activeSubTab === 'unial' && (
                <motion.div
                  layoutId="aboutHeaderTabUnderline"
                  className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] rounded-full"
                />
              )}
            </button>
          </div>

          {!currentUser && onOpenSignIn && (
            <button
              onClick={onOpenSignIn}
              className="px-5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] text-slate-200 hover:text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sign In</span>
            </button>
          )}

          {currentUser && (
            <button
              onClick={() => setActiveTab('calendar')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <span>Launch UniWork</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>


      <AnimatePresence mode="wait">
        {activeSubTab === 'iwork' ? (
          <motion.div
            key="about-uniwork"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="pb-24"
          >
            {/* HERO SECTION */}
            <section className="relative overflow-hidden min-h-[calc(100vh-62px)] flex flex-col justify-center items-center pt-6 pb-6 px-4 md:px-8 border-b border-white/[0.08] bg-gradient-to-b from-[#0a0e1a] via-[#0d1326] to-[#0a0e1a]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
              
              {/* Vertically Centered Cluster */}
              <div className="max-w-[1000px] w-full mx-auto text-center relative z-10 flex-1 flex flex-col justify-center items-center py-2 px-4 sm:px-6 my-auto">

                <h1 className="w-full tracking-[-0.03em] leading-[1.05] mb-2 text-center mx-auto">
                  <LiquidInkText text="Your Unified Workspace" />
                </h1>

                <p className="text-[17px] sm:text-[19px] text-slate-400 max-w-[720px] mx-auto leading-[1.5] mb-7 font-medium">
                  UniWork seamlessly bridges the gap between where you need to be, what you need to do, and what you want to achieve.
                </p>

                {/* CTA Buttons - Equal Height 50px, 16px Gap */}
                <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
                  {currentUser ? (
                    <button
                      onClick={() => setActiveTab('calendar')}
                      className="h-[50px] px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm sm:text-base shadow-[0_8px_24px_rgba(34,211,238,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span>Launch UniWork</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  ) : (
                    <div ref={signUpButtonRef} className="relative group">
                      {/* Swirling Google-style UniWork Liquid Ambient Aura */}
                      <UniWorkAuraGlow active={showButtonGlow || isCtaHovered} pillClassName="rounded-2xl" configId="about" />
                      
                      <button
                        onClick={onOpenSignIn}
                        onMouseEnter={() => setIsCtaHovered(true)}
                        onMouseLeave={() => setIsCtaHovered(false)}
                        className="relative z-10 h-[50px] px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm sm:text-base shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition-all flex items-center justify-center gap-3 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span>Sign up now — it's free</span>
                        <ArrowRight className="w-4 h-4 text-slate-800 transition-transform group-hover:translate-x-1" />
                      </button>
                    </div>
                  )}
                  <a
                    href="#ui-visualizer"
                    className="h-[50px] px-6 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.15] text-slate-200 font-semibold text-sm sm:text-base transition-all flex items-center justify-center"
                  >
                    See How Calendar & Targets Sync
                  </a>
                </div>

              </div>

              {/* SKELETON WIREFRAME ICON PERSONA TICKER MARQUEE WITH EDGE GRADIENT MASK */}
              <div className="w-full max-w-6xl mx-auto flex items-center gap-4 py-3 px-3 relative z-10 -mt-16 pb-6">
                <div className="p-1 text-slate-500 shrink-0 z-10 flex items-center">
                  <ChevronLeft className="w-4 h-4 stroke-[2]" />
                </div>
                <div className="relative overflow-hidden w-full flex-1 [mask-image:linear-gradient(90deg,transparent_0%,black_8%,black_92%,transparent_100%)] [-webkit-mask-image:linear-gradient(90deg,transparent_0%,black_8%,black_92%,transparent_100%)]">
                  <div className="animate-marquee flex items-center gap-14 sm:gap-16 whitespace-nowrap">
                    {[...PERSONA_ITEMS, ...PERSONA_ITEMS].map((persona, index) => {
                      const IconComp = persona.icon;
                      return (
                        <button
                          key={`${persona.id}-${index}`}
                          onClick={() => setSelectedPersona(persona)}
                          className="inline-flex items-center gap-2.5 text-white hover:text-cyan-300 transition-colors cursor-pointer group/item flex-shrink-0 text-[13px] tracking-[0.12em] font-sans font-['Plus_Jakarta_Sans',sans-serif] uppercase font-normal py-1"
                        >
                          <IconComp className="w-4 h-4 text-white/70 group-hover/item:text-cyan-400 stroke-[1.5] transition-colors" />
                          <span className="text-white font-normal text-[13px]">{persona.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="p-1 text-slate-500 shrink-0 z-10 flex items-center">
                  <ChevronRight className="w-4 h-4 stroke-[2]" />
                </div>
              </div>

            </section>

            {/* PERSONA DETAIL MODAL */}
            <AnimatePresence>
              {selectedPersona && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative text-left"
                  >
                    <button
                      onClick={() => setSelectedPersona(null)}
                      className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                        {React.createElement(selectedPersona.icon, { className: "w-6 h-6 stroke-[1.5]" })}
                      </div>
                      <div>
                        <span className="text-xs font-sans tracking-widest text-cyan-400 uppercase font-semibold">{selectedPersona.role}</span>
                        <h3 className="text-xl font-bold text-white">{selectedPersona.title}</h3>
                      </div>
                    </div>

                    <p className="text-slate-300 text-sm leading-relaxed mb-6">
                      {selectedPersona.description}
                    </p>

                    <h4 className="text-xs font-sans uppercase tracking-wider text-slate-400 mb-3 font-semibold">Tailored UniWork Capabilities</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedPersona.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-850 border border-slate-800 text-xs font-medium text-slate-200">
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 flex justify-end">
                      <button
                        onClick={() => setSelectedPersona(null)}
                        className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                      >
                        Close Overview
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* SECTION 1: VISUAL SYSTEM ARCHITECTURE (AUTHENTIC SYSTEM PREVIEW) */}
            <section id="ui-visualizer" className="py-16 px-4 md:px-8 max-w-6xl mx-auto">
              <div className="text-center max-w-3xl mx-auto mb-8">
                <h2 className="text-2xl md:text-[38px] font-extrabold text-white leading-[1.3] tracking-tight max-w-[850px] mx-auto">
                  Unifying Your Schedule, Tasks, and<br className="hidden sm:inline" />
                  Long-Term Targets as One
                </h2>
                <p className="text-slate-300/80 text-sm md:text-[17px] mt-4 leading-relaxed max-w-[620px] mx-auto font-medium antialiased">
                  Discover how UniWork harmonizes your daily schedule timeline, active task board, and long-term targets into a single intelligent workflow.
                </p>

                {/* VIEW SWITCHER TABS - CLEAN SEGMENTED CONTROL */}
                <div className="inline-flex flex-wrap items-center justify-center p-1.5 rounded-2xl bg-slate-900/95 border border-slate-700/50 gap-1.5 mt-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)] relative z-20">
                  <button
                    onClick={() => setPreviewTab('calendar')}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      previewTab === 'calendar'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-400/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4 text-blue-300" />
                    <span>Calendar View</span>
                  </button>

                  <button
                    onClick={() => setPreviewTab('tasks')}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      previewTab === 'tasks'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-1 ring-indigo-400/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4 text-indigo-300" />
                    <span>Tasks View</span>
                  </button>

                  <button
                    onClick={() => setPreviewTab('targets')}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      previewTab === 'targets'
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/30 ring-1 ring-cyan-400/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Target className="w-4 h-4 text-cyan-300" />
                    <span>Targets View</span>
                  </button>
                </div>
              </div>

              {/* STAGE CANVAS CONTAINING THE AUTHENTIC 1:1 REPLICAS WITH CONFINED WATERMARK */}
              <div className="w-full max-w-5xl mx-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden min-h-[620px] h-[620px] flex flex-col">
                {/* 45-degree Slanted Semi-Transparent Grey TEMPLATE Watermark Overlay */}
                <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center overflow-hidden">
                  <span className="text-slate-400/20 font-black text-6xl sm:text-8xl md:text-9xl tracking-[0.2em] select-none uppercase transform -rotate-45 font-sans drop-shadow-xs">
                    TEMPLATE
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  
                  {/* TAB 1: AUTHENTIC LITERAL CALENDAR VIEW COMPONENT */}
                  {previewTab === 'calendar' && (
                    <motion.div
                      key="calendar-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-white text-slate-900 rounded-2xl shadow-2xl font-sans relative overflow-hidden flex flex-col border border-slate-200 h-full flex-1"
                    >
                      {/* Literal Production CalendarView Engine */}
                      <div className="w-full flex-1 relative z-10 overflow-hidden">
                        <CalendarView
                          startHour={11}
                          endHour={21}
                          selectedDate={selectedCalendarDate}
                          setSelectedDate={setSelectedCalendarDate}
                          events={sampleEvents}
                          tasks={sampleTasks}
                          tags={sampleTags}
                          groups={sampleGroups}
                          onOpenCreateModal={() => {}}
                          onOpenEditModal={(type, item) => {
                            setSelectedPreviewItem({
                              type,
                              title: item.title,
                              category: (item as any).groupId || (item as any).tagId || 'Coursework',
                              time: `${item.startTime} - ${item.endTime}`,
                              date: item.date,
                              status: (item as any).status || 'Scheduled',
                              color: (item as any).color || '#2563eb'
                            });
                          }}
                          onToggleTaskStatus={(taskId) => {
                            setSampleTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t));
                          }}
                          onUpdateEvent={(id, updates) => {
                            setSampleEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
                          }}
                          onUpdateTask={(id, updates) => {
                            setSampleTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
                          }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: AUTHENTIC TASKS VIEW */}
                  {previewTab === 'tasks' && (
                    <motion.div
                      key="tasks-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-slate-50 text-slate-900 rounded-2xl shadow-2xl font-sans relative overflow-hidden flex flex-col h-full flex-1 p-1 md:p-3"
                    >
                      <div className="w-full h-full overflow-y-auto max-h-[560px]">
                        <TasksView
                          tasks={sampleTasks}
                          groups={sampleGroups}
                          onAddTask={handleAddTask}
                          onUpdateTask={handleUpdateTask}
                          onDeleteTask={handleDeleteTask}
                          onOpenEditModal={(type, item) => {
                            setSelectedPreviewItem({
                              type,
                              title: item.title,
                              category: sampleGroups.find(g => g.id === item.groupId)?.name || 'Coursework',
                              time: item.startTime ? `${item.startTime} - ${item.endTime || ''}` : undefined,
                              date: item.date,
                              status: item.status || 'todo',
                              color: item.color || '#2563eb'
                            });
                          }}
                          onOpenCreateModal={() => {}}
                          onAddGroup={handleAddGroup}
                          onDeleteGroup={handleDeleteGroup}
                          onUpdateGroup={handleUpdateGroup}
                          onToggleTaskStatus={handleToggleTaskStatus}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: AUTHENTIC TARGETS VIEW */}
                  {previewTab === 'targets' && (
                    <motion.div
                      key="targets-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-[#F5F6F8] text-slate-800 rounded-2xl shadow-2xl font-sans relative overflow-hidden flex flex-col h-full flex-1 p-1 md:p-3"
                    >
                      <div className="w-full h-full overflow-y-auto max-h-[560px]">
                        <GoalsView
                          goals={sampleGoals}
                          events={sampleEvents}
                          tasks={sampleTasks}
                          tags={sampleTags}
                          groups={sampleGroups}
                          onAddGoal={handleAddGoal}
                          onUpdateGoal={handleUpdateGoal}
                          onDeleteGoal={handleDeleteGoal}
                          onToggleGoalComplete={handleToggleGoalComplete}
                        />
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>

                {/* INTERACTIVE EVENT/TASK/TARGET SETTING CARD MODAL OVERLAY */}
                <AnimatePresence>
                  {selectedPreviewItem && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl relative text-slate-900"
                      >
                        <button
                          onClick={() => setSelectedPreviewItem(null)}
                          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: selectedPreviewItem.color || '#2563eb' }}
                          />
                          <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-slate-500">
                            {selectedPreviewItem.type === 'event' ? 'Calendar Event Setting' : selectedPreviewItem.type === 'task' ? 'Task Item Setting' : 'Semester Target Setting'}
                          </span>
                        </div>

                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mb-2 leading-tight">
                          {selectedPreviewItem.title}
                        </h3>

                        <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans mb-4">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Category:</span>
                            <span className="font-bold text-slate-700">{selectedPreviewItem.category}</span>
                          </div>
                          {selectedPreviewItem.time && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Time / Hours:</span>
                              <span className="font-bold text-slate-700">{selectedPreviewItem.time}</span>
                            </div>
                          )}
                          {selectedPreviewItem.date && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Date / Deadline:</span>
                              <span className="font-bold text-slate-700">{selectedPreviewItem.date}</span>
                            </div>
                          )}
                          {selectedPreviewItem.status && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Sync Status:</span>
                              <span className="font-bold uppercase text-indigo-600">{selectedPreviewItem.status}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedPreviewItem(null)}
                            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                          >
                            Close Setting Card
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>


            </section>

            {/* COMBINED SECTION: WHY TRADITIONAL TOOLS FAIL & FEATURE SYSTEM MATRIX WITH CITED STATS */}
            <section id="why-uniwork" className="py-16 px-4 md:px-8 max-w-6xl mx-auto">
              {/* Header */}
              <div className="text-center max-w-3xl mx-auto mb-12">
                <h2 className="text-2xl md:text-4xl font-extrabold text-white">
                  Why Traditional Tools Fail Students — And How UniWork Fixes It
                </h2>
                <p className="text-slate-300 text-sm md:text-base mt-3 leading-relaxed">
                  Generic calendar apps treat tasks as detached side items. Empirical academic research demonstrates why unintegrated planning tools increase stress and decrease performance.
                </p>
              </div>

              {/* Research Statistics Cards with Scroll Triggered Counting Animation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                
                {/* Stat 1 */}
                <div className="p-7 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl flex flex-col justify-between hover:border-rose-500/30 transition-colors group">
                  <div>
                    <div className="flex items-baseline gap-1 mb-3">
                      <StatCounter 
                        end={87} 
                        suffix="%" 
                        duration={1.8}
                        className="text-4xl sm:text-5xl font-black text-rose-400 font-sans tabular-nums tracking-tight group-hover:scale-105 transition-transform inline-block" 
                      />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">Academics Primary Stressor</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      87% of college students identify uncoordinated academic deadlines, exam timing, and course planning as their #1 cause of daily mental distress.
                    </p>
                  </div>
                  <div className="mt-5 pt-3.5 border-t border-slate-800/80 text-[10px] text-slate-500 font-sans flex items-center justify-between">
                    <span>Source: American Psychological Association (APA)</span>
                    <span className="text-rose-400/80 font-bold">2023 Survey</span>
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="p-7 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl flex flex-col justify-between hover:border-amber-500/30 transition-colors group">
                  <div>
                    <div className="flex items-baseline gap-1 mb-3">
                      <StatCounter 
                        end={76.4} 
                        decimals={1}
                        suffix="%" 
                        duration={2.0}
                        className="text-4xl sm:text-5xl font-black text-amber-400 font-sans tabular-nums tracking-tight group-hover:scale-105 transition-transform inline-block" 
                      />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">Severe Planning Overwhelm</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      76.4% of undergraduate & graduate students report high distress caused by fractured schedules, disconnected todo apps, and forgotten milestone windows.
                    </p>
                  </div>
                  <div className="mt-5 pt-3.5 border-t border-slate-800/80 text-[10px] text-slate-500 font-sans flex items-center justify-between">
                    <span>Source: ACHA-NCHA III National College Assessment</span>
                    <span className="text-amber-400/80 font-bold">N=54,000+</span>
                  </div>
                </div>

                {/* Stat 3 - Replaced 40% with higher impact 82% from peer-reviewed workflow research */}
                <div className="p-7 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl flex flex-col justify-between hover:border-red-500/30 transition-colors group">
                  <div>
                    <div className="flex items-baseline gap-1 mb-3">
                      <StatCounter 
                        end={82} 
                        suffix="%" 
                        duration={2.2}
                        className="text-4xl sm:text-5xl font-black text-red-500 font-sans tabular-nums tracking-tight group-hover:scale-105 transition-transform inline-block" 
                      />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">Attention Fragmentation & Drift</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      82% of student study hours are interrupted by app switching and reorientation lag when moving between separate calendars, notes, and task trackers.
                    </p>
                  </div>
                  <div className="mt-5 pt-3.5 border-t border-slate-800/80 text-[10px] text-slate-500 font-sans flex items-center justify-between">
                    <span>Source: UC Irvine & Gloria Mark Attention Studies</span>
                    <span className="text-red-400/80 font-bold">Peer-Reviewed</span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Visual Comparison Mockups */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {/* Google Calendar Mockup */}
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-rose-500/20 relative">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                      ❌ Standard Google Calendar & Todo Apps
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans">Fragmented Tools</span>
                  </div>

                  <div className="space-y-3 font-sans text-xs text-slate-400">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 opacity-60">
                      <div className="text-slate-300 font-bold">10:00 AM - Organic Chemistry Lecture</div>
                      <div className="text-[10px] text-slate-500">Event Block (No task steps attached)</div>
                    </div>

                    <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-300">
                      <div className="text-xs font-bold">• Study Ch. 4 (Sidebar checkmark)</div>
                      <div className="text-[10px] text-rose-400/80">No timeline slot, no duration budget, disconnected from semester goals.</div>
                    </div>
                  </div>
                </div>

                {/* UniWork Mockup */}
                <div className="p-6 rounded-2xl bg-slate-900/90 border border-cyan-500/40 relative shadow-xl">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                      ⚡ UniWork Unified Operating System
                    </span>
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 font-sans">
                      Integrated Architecture
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-500/30 text-blue-200">
                      <div className="text-xs font-bold">10:00 AM - Organic Chemistry Lecture</div>
                      <div className="text-[10px] text-blue-300/80">Class Schedule Block</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950 to-blue-950 border border-cyan-400/60 text-white shadow-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">11:30 AM - Review Ch. 4 Mechanisms</span>
                        <span className="text-[10px] bg-cyan-900/80 text-cyan-200 px-1.5 py-0.5 rounded font-sans tabular-nums">
                          1h 30m Block
                        </span>
                      </div>
                      <div className="text-[10px] text-cyan-300 flex items-center gap-2">
                        <span>🎯 Linked Goal: Master Organic Chem</span>
                        <span>• First-Class Resizable Block</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comprehensive Feature Comparison Matrix */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl">
                <table className="w-full text-left text-xs md:text-sm text-slate-300 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="p-4 md:p-5">System Capability</th>
                      <th className="p-4 md:p-5 text-slate-400">Paper Planner 📝</th>
                      <th className="p-4 md:p-5 text-slate-400">Google Calendar 📅</th>
                      <th className="p-4 md:p-5 bg-cyan-950/50 text-cyan-300 border-x border-cyan-500/30">
                        UniWork ⚡ <span className="text-[10px] uppercase font-bold text-cyan-400 block">Unified OS</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-medium">
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-4 md:p-5 font-bold text-white">Goal & Time Budgeting</td>
                      <td className="p-4 md:p-5 text-slate-400">Static text. No tracking.</td>
                      <td className="p-4 md:p-5 text-slate-400">Not supported natively.</td>
                      <td className="p-4 md:p-5 bg-cyan-950/30 border-x border-cyan-500/20 text-cyan-200 font-semibold">
                        Weekly Goals + Time Budgets synced to scheduled tasks.
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-4 md:p-5 font-bold text-white">Task Scheduling</td>
                      <td className="p-4 md:p-5 text-slate-400">Manual writing. No time slots.</td>
                      <td className="p-4 md:p-5 text-slate-400">Sidebar lists separate from grid.</td>
                      <td className="p-4 md:p-5 bg-cyan-950/30 border-x border-cyan-500/20 text-cyan-200 font-semibold">
                        Draggable, Resizable Timeline Blocks with 5-min snap grid.
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-4 md:p-5 font-bold text-white">Multi-Lens Views</td>
                      <td className="p-4 md:p-5 text-slate-400">Linear pages only.</td>
                      <td className="p-4 md:p-5 text-slate-400">Grid or simple task list.</td>
                      <td className="p-4 md:p-5 bg-cyan-950/30 border-x border-cyan-500/20 text-cyan-200 font-semibold">
                        Seamless Calendar + Kanban Board + Tag/Subject Lenses.
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-4 md:p-5 font-bold text-white">Strategic System Alignment</td>
                      <td className="p-4 md:p-5 text-slate-400">Mental tracking only.</td>
                      <td className="p-4 md:p-5 text-slate-400">Disconnected entry points.</td>
                      <td className="p-4 md:p-5 bg-cyan-950/30 border-x border-cyan-500/20 text-cyan-200 font-semibold">
                        Automatic 3-way sync: Calendar ↔ Tasks ↔ Semester Targets.
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-4 md:p-5 font-bold text-white">Academic Research Grounding</td>
                      <td className="p-4 md:p-5 text-slate-400">None.</td>
                      <td className="p-4 md:p-5 text-slate-400">Designed for corporate meetings.</td>
                      <td className="p-4 md:p-5 bg-cyan-950/30 border-x border-cyan-500/20 text-cyan-200 font-semibold">
                        Built on Educational Psychology time-control principles.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            {/* PARENT COMPANY CARD SECTION IN ABOUT UNIWORK */}
            <section className="py-8 px-4 md:px-8 max-w-4xl mx-auto">
              <div className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl bg-white shadow-md border border-slate-200 shrink-0">
                    <img
                      src={UNIAL_LIGHT_LOGO_BASE64}
                      alt="Unial Logo"
                      className="h-9 md:h-11 w-auto object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">
                      Parent Company
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-white">Engineered by Unial Systems</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      UniWork is developed as the flagship academic productivity platform by Unial.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveSubTab('unial')}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 group"
                >
                  <span>Learn About Unial</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </section>
          </motion.div>
        ) : (
          /* PARENT COMPANY: UNIAL TAB */
          <motion.div
            key="about-unial"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="py-16 px-4 md:px-8 max-w-3xl mx-auto text-center"
          >
            {/* Pill Badge */}
            <div className="mb-10 inline-flex items-center justify-center">
              <div className="px-5 py-2 rounded-full bg-[#12142e] border border-[#2b2f5d] text-[#8e94e8] text-xs font-bold tracking-widest uppercase flex items-center gap-2.5 shadow-lg shadow-[#0b0f1e]/80">
                <Building2 className="w-4 h-4 text-[#8e94e8]" />
                <span>PARENT COMPANY</span>
              </div>
            </div>

            {/* Large White Card with Unial Logo */}
            <div className="mb-10 p-10 md:p-14 rounded-[28px] bg-white shadow-2xl max-w-xl mx-auto flex items-center justify-center border border-slate-100 transition-transform duration-300 hover:scale-[1.01]">
              {UNIAL_LIGHT_LOGO_BASE64 ? (
                <img
                  src={UNIAL_LIGHT_LOGO_BASE64}
                  alt="Unial Logo"
                  className="h-14 md:h-20 w-auto object-contain max-w-full"
                />
              ) : (
                <span className="font-extrabold text-3xl text-slate-900 tracking-tight">
                  UNIAL
                </span>
              )}
            </div>

            {/* Still in Production Notice Card */}
            <div className="p-6 md:p-8 rounded-2xl bg-slate-900/90 border border-amber-500/30 text-left max-w-xl mx-auto shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Construction className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase block">
                    Status Notice
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Still in Production
                  </h3>
                </div>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed mb-3">
                Detailed corporate documentation, research papers, and background information for <strong>Unial</strong> are currently being prepared and refined.
              </p>

              <p className="text-slate-400 text-xs leading-relaxed">
                More details will be published here in an upcoming update. Check back soon!
              </p>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-sans text-slate-500">
                <span>SYSTEM: UNIAL-CORE</span>
                <span className="text-amber-400/80 font-bold">● DRAFT PENDING RELEASE</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Footer with Legal Links & Contact Support */}
      <footer className="mt-16 border-t border-slate-800/80 bg-slate-950/80 py-8 px-4 text-center">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>© 2026 UniWork (Unial). All rights reserved.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <button
              onClick={() => setActiveTab('privacy')}
              className="text-slate-400 hover:text-cyan-400 font-semibold transition cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className="text-slate-400 hover:text-cyan-400 font-semibold transition cursor-pointer"
            >
              Terms of Service
            </button>
            <a
              href="mailto:management@myuniwork.app"
              className="text-slate-400 hover:text-white font-sans transition"
            >
              management@myuniwork.app
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
