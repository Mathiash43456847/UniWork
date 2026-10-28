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
  GraduationCap,
  Library,
  Atom,
  Briefcase,
  Code,
  Compass,
  X,
  BookOpen,
  AlarmClockCheck
} from 'lucide-react';
import { ActiveTab, User, CalendarEvent, Task, Tag as TagType, TaskGroup, Goal } from '../types';
import CalendarView from './CalendarView';
import TasksView from './TasksView';
import GoalsView from './GoalsView';
import { FocusRoomView } from './FocusRoomView';
import { UNIWORK_FULL_LOGO_BASE64, UNIWORK_DARK_LOGO_BASE64, UNIAL_CORP_LOGO_BASE64 } from '../assets/logoData';
import uniworkFullLogoUrl from '../assets/iwork-full-logo.png';
import { UniWorkAuraGlow } from './UniWorkAuraGlow';
import { UnifiedWorkspaceShowcase } from './UnifiedWorkspaceShowcase';
import { CompetitorComparison } from './CompetitorComparison';

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
  style?: React.CSSProperties;
}

function StatCounter({ end, decimals = 0, prefix = '', suffix = '', duration = 1.8, className = '', style }: StatCounterProps) {
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
    <span ref={ref} className={className} style={style}>
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
  const [previewTab, setPreviewTab] = useState<'calendar' | 'tasks' | 'targets' | 'focus'>('calendar');
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
    id?: string;
    type: 'event' | 'task' | 'target';
    title: string;
    category?: string;
    groupId?: string;
    tagId?: string;
    goalId?: string;
    time?: string;
    startTime?: string;
    endTime?: string;
    date?: string;
    status?: string;
    color?: string;
  } | null>(null);

  // Ref and state for scroll-triggered and initial appear mesh aura on "Sign up now, it's free" button
  const signUpButtonRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
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
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date(2026, 7, 31));
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
      goalId: 'goal-1',
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
      goalId: 'goal-1',
      color: '#9333ea',
    },
    {
      id: 'task-3',
      title: 'Geography and History Exam Analysis',
      date: '2026-08-30',
      startTime: '17:40',
      endTime: '18:40',
      status: 'done',
      groupId: 'group-humanities',
      goalId: 'goal-1',
      color: '#ec4899',
    },
    {
      id: 'task-4',
      title: 'Modern Philosophy Ethics Essay Outline',
      date: '2026-08-30',
      startTime: '19:00',
      endTime: '20:15',
      status: 'done',
      groupId: 'group-humanities',
      goalId: 'goal-1',
      color: '#ec4899',
    },
    // Monday Aug 31
    {
      id: 'task-mon-1',
      title: 'CS 101 Binary Search Tree Implementation',
      date: '2026-08-31',
      startTime: '13:30',
      endTime: '15:00',
      status: 'in-progress',
      groupId: 'group-econ',
      goalId: 'goal-4',
      color: '#2563eb',
    },
    {
      id: 'task-mon-2',
      title: 'Linear Algebra Problem Set 4',
      date: '2026-08-31',
      startTime: '15:30',
      endTime: '17:00',
      status: 'todo',
      groupId: 'group-math',
      goalId: 'goal-1',
      color: '#9333ea',
    },
    {
      id: 'task-mon-3',
      title: 'Macroeconomics Fiscal Policy Review',
      date: '2026-08-31',
      startTime: '17:30',
      endTime: '19:00',
      status: 'todo',
      groupId: 'group-econ',
      goalId: 'goal-1',
      color: '#2563eb',
    },
    {
      id: 'task-mon-4',
      title: 'Organic Chemistry Reaction Mechanisms',
      date: '2026-08-31',
      startTime: '19:30',
      endTime: '21:00',
      status: 'todo',
      groupId: 'group-science',
      goalId: 'goal-2',
      color: '#10b981',
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
      goalId: 'goal-3',
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
      goalId: 'goal-1',
      color: '#9333ea',
    },
    {
      id: 'task-tue-3',
      title: 'Algorithmic Complexity Quiz Review',
      date: '2026-09-01',
      startTime: '19:00',
      endTime: '20:00',
      status: 'todo',
      groupId: 'group-econ',
      goalId: 'goal-4',
      color: '#2563eb',
    },
    // Wednesday Sep 2
    {
      id: 'task-wed-1',
      title: 'Physics Mechanics Midterm Review',
      date: '2026-09-02',
      startTime: '14:00',
      endTime: '16:00',
      status: 'todo',
      groupId: 'group-science',
      goalId: 'goal-2',
      color: '#10b981',
    },
    {
      id: 'task-wed-2',
      title: 'Molecular Genetics Lab Preparation',
      date: '2026-09-02',
      startTime: '16:30',
      endTime: '18:00',
      status: 'todo',
      groupId: 'group-science',
      goalId: 'goal-3',
      color: '#10b981',
    },
    {
      id: 'task-wed-3',
      title: 'World Economic Forum Case Study',
      date: '2026-09-02',
      startTime: '18:30',
      endTime: '19:45',
      status: 'todo',
      groupId: 'group-econ',
      goalId: 'goal-1',
      color: '#2563eb',
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
      groupIds: ['group-math', 'group-econ', 'group-humanities'],
      deadlineType: 'monthly',
      dueDate: '2026-09-30',
      completed: false,
    },
    {
      id: 'goal-2',
      title: 'Prepare for Physics & Chemistry Midterms',
      color: '#10b981',
      timeBudget: 10,
      tagIds: ['tag-emerald', 'tag-blue'],
      groupIds: ['group-science', 'group-math'],
      deadlineType: 'weekly',
      dueDate: '2026-09-06',
      completed: false,
    },
    {
      id: 'goal-3',
      title: 'Complete Biology Thesis Literature Review',
      color: '#0891b2',
      timeBudget: 12,
      tagIds: ['tag-emerald'],
      groupIds: ['group-science'],
      deadlineType: 'monthly',
      dueDate: '2026-09-25',
      completed: false,
    },
    {
      id: 'goal-4',
      title: 'Master Data Structures & Algorithm Design',
      color: '#2563eb',
      timeBudget: 8,
      tagIds: ['tag-blue'],
      groupIds: ['group-econ'],
      deadlineType: 'weekly',
      dueDate: '2026-09-06',
      completed: false,
    },
    {
      id: 'goal-5',
      title: 'Consistent Daily Deep Work Habits',
      color: '#ea580c',
      timeBudget: 6,
      tagIds: ['tag-orange', 'tag-green'],
      groupIds: ['group-math', 'group-science', 'group-econ', 'group-humanities'],
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

  const isScrolled = scrollTop > 20;
  const isScrolledPastHero = scrollTop > 420;

  return (
    <div
      className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-[#0a0e1a] text-slate-100 font-sans selection:bg-cyan-500 selection:text-white"
      id="uniwork-about-page"
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      
      {/* Top Floating/Glass Header */}
      <div className={`z-[100] px-3 md:px-6 py-3 transition-all duration-300 ${isScrolled ? 'fixed top-0 left-0 right-0 bg-[#0a0e1a]/85 backdrop-blur-md border-b border-white/[0.08] shadow-lg shadow-black/25' : 'absolute top-0 left-0 right-0 bg-transparent border-transparent'}`}>
        <div className="w-full max-w-full px-1 md:px-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={UNIWORK_DARK_LOGO_BASE64}
              alt="UniWork Dark Logo"
              className="h-8 md:h-9 w-auto object-contain brightness-110 cursor-pointer"
              onClick={() => {
                const container = document.getElementById('uniwork-about-page');
                if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
                else window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            {!currentUser && onOpenSignIn && (
              isScrolledPastHero ? (
                <button
                  onClick={onOpenSignIn}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs shadow-[0_2px_12px_rgba(0,0,0,0.2)] transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>Get Started</span>
                  <ArrowRight className="w-3 h-3 text-slate-800" />
                </button>
              ) : (
                <button
                  onClick={onOpenSignIn}
                  className="px-5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] text-slate-200 hover:text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Sign In</span>
                </button>
              )
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
      </div>

      <div className="pb-24 w-full">
            {/* HERO SECTION */}
            <section id="about-hero" className="relative section flex flex-col items-center pt-32 md:pt-36 bg-gradient-to-b from-[#0a0e1a] via-[#0d1326] to-[#0a0e1a] border-b border-white/[0.08]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
              
              <div className="container relative z-10 flex flex-col items-center justify-center text-center">
                <div className="w-full flex flex-col items-center mb-8">
                  <h1 className="w-full mb-6">
                    <LiquidInkText text="Your Unified Workspace" />
                  </h1>

                  <p className="text-body max-w-2xl mx-auto">
                    Plan your day, stay focused and track your progress, all in one place.
                  </p>
                </div>

                {/* Primary CTA Button */}
                <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
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
                </div>

              </div>

              {/* SKELETON WIREFRAME ICON PERSONA TICKER MARQUEE WITH EDGE GRADIENT MASK */}
              <div className="w-full max-w-full overflow-hidden relative z-10 py-8">
                <div className="relative overflow-hidden w-full [mask-image:linear-gradient(90deg,transparent_0%,black_15%,black_85%,transparent_100%)] [-webkit-mask-image:linear-gradient(90deg,transparent_0%,black_15%,black_85%,transparent_100%)]">
                  <div className="animate-marquee hover:[animation-play-state:paused] flex items-center gap-12 sm:gap-20 whitespace-nowrap cursor-default px-12">
                    {[...PERSONA_ITEMS, ...PERSONA_ITEMS].map((persona, index) => {
                      const IconComp = persona.icon;
                      return (
                        <div
                          key={`${persona.id}-${index}`}
                          className="inline-flex items-center gap-3 text-white/90 flex-shrink-0 text-sm tracking-[0.1em] font-sans font-bold uppercase py-2 select-none"
                        >
                          <IconComp className="w-5 h-5 text-cyan-400 stroke-[2]" />
                          <span className="text-white/90">{persona.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SUBTLE EXPLORE UNIWORK CUE */}
              <div className="w-full text-center pb-8 pt-4 relative z-10">
                <button
                  onClick={() => {
                    const hero = document.getElementById('about-hero');
                    const targetTop = hero ? hero.offsetHeight : window.innerHeight;
                    window.scrollTo({ top: targetTop, behavior: 'smooth' });
                  }}
                  className="text-xs sm:text-[13px] font-bold text-slate-400 hover:text-cyan-400 tracking-widest transition-colors cursor-pointer inline-flex items-center gap-2 uppercase px-6 py-3"
                >
                  <span>Explore UniWork</span>
                  <span className="text-cyan-400 animate-bounce">↓</span>
                </button>
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
                    className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90dvh] overflow-y-auto shadow-2xl relative text-left"
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

            {/* PAGE 2: ONE WORKSPACE SHOWCASE & INTERACTIVE SYSTEM EXPLORER (COMBINED) */}
            <UnifiedWorkspaceShowcase
              onOpenSignIn={onOpenSignIn}
              currentUser={currentUser}
              onLaunch={() => setActiveTab('calendar')}
            />

            {/* INTERACTIVE SYSTEM PREVIEW / LIVE EXPLORER */}
            <section id="ui-visualizer" className="section relative">
              <div className="container">

                {/* VIEW SWITCHER TABS - CLEAN SEGMENTED CONTROL */}
                <div className="text-center mb-12">
                  <div className="grid grid-cols-2 lg:flex lg:flex-wrap items-center justify-center p-2 rounded-3xl bg-slate-900/95 border border-slate-700/50 gap-2 shadow-[0_12px_40px_rgba(0,0,0,0.5)] relative z-20 w-full sm:w-auto">
                    <button
                      onClick={() => setPreviewTab('calendar')}
                      className={`w-full sm:w-auto sm:min-w-[156px] min-h-[48px] justify-center px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        previewTab === 'calendar'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-400/50'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <CalendarIcon className="w-5 h-5 text-blue-300" />
                      <span>Calendar</span>
                    </button>

                    <button
                      onClick={() => setPreviewTab('tasks')}
                      className={`w-full sm:w-auto sm:min-w-[156px] min-h-[48px] justify-center px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        previewTab === 'tasks'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-1 ring-indigo-400/50'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <CheckSquare className="w-5 h-5 text-indigo-300" />
                      <span>Tasks</span>
                    </button>

                    <button
                      onClick={() => setPreviewTab('targets')}
                      className={`w-full sm:w-auto sm:min-w-[156px] min-h-[48px] justify-center px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        previewTab === 'targets'
                          ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/30 ring-1 ring-cyan-400/50'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Target className="w-5 h-5 text-cyan-300" />
                      <span>Targets</span>
                    </button>

                    <button
                      onClick={() => setPreviewTab('focus')}
                      className={`w-full sm:w-auto sm:min-w-[156px] min-h-[48px] justify-center px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        previewTab === 'focus'
                          ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30 ring-1 ring-amber-400/50'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <AlarmClockCheck className="w-5 h-5 text-amber-300" />
                      <span>Focus Room</span>
                    </button>
                  </div>
                </div>

                {/* STAGE CANVAS CONTAINING THE AUTHENTIC 1:1 REPLICAS WITH CONFINED WATERMARK */}
                <div className="w-full aspect-[4/3] lg:aspect-video rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
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
                          onOpenCreateModal={(date, startTime, endTime) => {
                            setSelectedPreviewItem({
                              id: `event-${Date.now()}`,
                              type: 'event',
                              title: 'New Calendar Event',
                              date: date || '2026-08-31',
                              startTime: startTime || '12:00',
                              endTime: endTime || '13:00',
                              groupId: 'group-math',
                              goalId: 'goal-1',
                              color: '#2563eb',
                              status: 'Scheduled',
                              category: 'Math & Calculus'
                            });
                          }}
                          onOpenEditModal={(type, item) => {
                            const isEvent = type === 'event';
                            setSelectedPreviewItem({
                              id: item.id,
                              type,
                              title: item.title,
                              groupId: (item as any).groupId || 'group-math',
                              tagId: (item as any).tagId,
                              goalId: (item as any).goalId || 'goal-1',
                              category: sampleGroups.find(g => g.id === (item as any).groupId)?.name || sampleTags.find(t => t.id === (item as any).tagId)?.name || 'Coursework',
                              startTime: item.startTime || '12:00',
                              endTime: item.endTime || '13:00',
                              date: item.date || '2026-08-31',
                              status: (item as any).status || (isEvent ? 'Scheduled' : 'todo'),
                              color: (item as any).color || (isEvent ? '#2563eb' : '#9333ea')
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
                      className="bg-white dark:bg-[#070A11] text-slate-900 dark:text-white rounded-2xl shadow-2xl font-sans relative overflow-hidden flex flex-col h-full flex-1 p-1 md:p-3"
                    >
                      <div className="w-full h-full overflow-y-auto max-h-[480px] sm:max-h-[560px]">
                        <TasksView
                          tasks={sampleTasks}
                          groups={sampleGroups}
                          goals={sampleGoals}
                          selectedDate={selectedCalendarDate}
                          onAddTask={handleAddTask}
                          onUpdateTask={handleUpdateTask}
                          onDeleteTask={handleDeleteTask}
                          onOpenEditModal={(type, item) => {
                            setSelectedPreviewItem({
                              id: item.id,
                              type: 'task',
                              title: item.title,
                              groupId: item.groupId || 'group-math',
                              goalId: item.goalId || 'goal-1',
                              category: sampleGroups.find(g => g.id === item.groupId)?.name || 'Coursework',
                              startTime: item.startTime || '14:00',
                              endTime: item.endTime || '15:30',
                              date: item.date || '2026-08-31',
                              status: item.status || 'todo',
                              color: item.color || '#9333ea'
                            });
                          }}
                          onOpenCreateModal={() => {
                            setSelectedPreviewItem({
                              id: `task-${Date.now()}`,
                              type: 'task',
                              title: 'New Study Task',
                              date: '2026-08-31',
                              startTime: '14:00',
                              endTime: '15:00',
                              groupId: 'group-math',
                              goalId: 'goal-1',
                              status: 'todo',
                              color: '#9333ea',
                              category: 'Math & Calculus'
                            });
                          }}
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
                      className="bg-white dark:bg-[#070A11] text-slate-900 dark:text-white rounded-2xl shadow-2xl font-sans relative overflow-hidden flex flex-col h-full flex-1 p-1 md:p-3"
                    >
                      <div className="w-full h-full overflow-y-auto max-h-[480px] sm:max-h-[560px]">
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

                  {/* TAB 4: AUTHENTIC FOCUS ROOM VIEW */}
                  {previewTab === 'focus' && (
                    <motion.div
                      key="focus-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-white dark:bg-[#070A11] text-slate-900 dark:text-white rounded-2xl shadow-2xl font-sans relative overflow-hidden flex flex-col h-full flex-1"
                    >
                      <div className="w-full h-full overflow-y-auto max-h-[540px] sm:max-h-[600px]">
                        <FocusRoomView
                          task={sampleTasks.find(t => t.id === 'task-1') || sampleTasks[0]}
                          allTasks={sampleTasks}
                          tags={sampleTags as any}
                          userId="demo-preview-user"
                          isPreview={true}
                          onCompleteTask={(completedTask) => {
                            if (completedTask) {
                              setSampleTasks(prev => prev.map(t => t.id === completedTask.id ? { ...t, status: 'done' } : t));
                            }
                          }}
                          onEndIncomplete={() => {}}
                        />
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>

                {/* AUTHENTIC UNIWORK EVENT/TASK/TARGET SETTING CARD MODAL OVERLAY */}
                <AnimatePresence>
                  {selectedPreviewItem && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative text-slate-900 dark:text-white"
                      >
                        {/* Header Tabs: Event vs Task */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                            <button
                              type="button"
                              onClick={() => setSelectedPreviewItem(prev => prev ? { ...prev, type: 'event', color: prev.color || '#2563eb' } : null)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                selectedPreviewItem.type === 'event'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              <CalendarIcon className="w-3.5 h-3.5" />
                              <span>Event</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedPreviewItem(prev => prev ? { ...prev, type: 'task', color: prev.color || '#9333ea' } : null)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                selectedPreviewItem.type === 'task'
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>Task</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedPreviewItem(null)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Title Input */}
                        <div className="mb-4">
                          <input
                            type="text"
                            value={selectedPreviewItem.title}
                            onChange={(e) => setSelectedPreviewItem(prev => prev ? { ...prev, title: e.target.value } : null)}
                            placeholder="Add title"
                            className="w-full text-base sm:text-lg font-bold text-slate-900 dark:text-white bg-transparent border-b border-slate-200 dark:border-slate-700 pb-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
                          />
                        </div>

                        {/* Date & Time Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <input
                              type="date"
                              value={selectedPreviewItem.date || '2026-08-31'}
                              onChange={(e) => setSelectedPreviewItem(prev => prev ? { ...prev, date: e.target.value } : null)}
                              className="bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none w-full"
                            />
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <div className="flex items-center gap-1 w-full justify-center">
                              <input
                                type="time"
                                value={selectedPreviewItem.startTime || '12:00'}
                                onChange={(e) => setSelectedPreviewItem(prev => prev ? { ...prev, startTime: e.target.value } : null)}
                                className="bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none text-center w-14"
                              />
                              <span className="text-slate-400">-</span>
                              <input
                                type="time"
                                value={selectedPreviewItem.endTime || '13:00'}
                                onChange={(e) => setSelectedPreviewItem(prev => prev ? { ...prev, endTime: e.target.value } : null)}
                                className="bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none text-center w-14"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Subject Group & Linked Target Selectors */}
                        <div className="space-y-2 mb-4 text-xs">
                          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                              <span>Subject Group</span>
                            </span>
                            <select
                              value={selectedPreviewItem.groupId || 'group-math'}
                              onChange={(e) => setSelectedPreviewItem(prev => prev ? { ...prev, groupId: e.target.value } : null)}
                              className="bg-transparent text-slate-800 dark:text-slate-200 font-semibold focus:outline-none text-right cursor-pointer"
                            >
                              {sampleGroups.map(g => (
                                <option key={g.id} value={g.id} className="dark:bg-slate-800 text-slate-900 dark:text-white">
                                  {g.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                              <Target className="w-3.5 h-3.5 text-cyan-500" />
                              <span>Linked Target</span>
                            </span>
                            <select
                              value={selectedPreviewItem.goalId || 'goal-1'}
                              onChange={(e) => setSelectedPreviewItem(prev => prev ? { ...prev, goalId: e.target.value } : null)}
                              className="bg-transparent text-slate-800 dark:text-slate-200 font-semibold focus:outline-none text-right cursor-pointer max-w-[200px] truncate"
                            >
                              {sampleGoals.map(g => (
                                <option key={g.id} value={g.id} className="dark:bg-slate-800 text-slate-900 dark:text-white">
                                  {g.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Color Swatches */}
                        <div className="flex items-center gap-2 mb-5">
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-1">Color:</span>
                          {['#2563eb', '#9333ea', '#10b981', '#ea580c', '#ec4899', '#0891b2', '#64748b'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setSelectedPreviewItem(prev => prev ? { ...prev, color: c } : null)}
                              style={{ backgroundColor: c }}
                              className={`w-5 h-5 rounded-full transition cursor-pointer flex items-center justify-center ${
                                selectedPreviewItem.color === c ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-900 scale-110' : 'hover:scale-105'
                              }`}
                            >
                              {selectedPreviewItem.color === c && <Check className="w-3 h-3 text-white" />}
                            </button>
                          ))}
                        </div>

                        {/* Footer Action Bar */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700/80">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedPreviewItem.id) {
                                if (selectedPreviewItem.type === 'event') {
                                  setSampleEvents(prev => prev.filter(e => e.id !== selectedPreviewItem.id));
                                } else {
                                  setSampleTasks(prev => prev.filter(t => t.id !== selectedPreviewItem.id));
                                }
                              }
                              setSelectedPreviewItem(null);
                            }}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPreviewItem(null)}
                              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedPreviewItem) {
                                  const updatedColor = selectedPreviewItem.color || (selectedPreviewItem.type === 'event' ? '#2563eb' : '#9333ea');
                                  if (selectedPreviewItem.type === 'event') {
                                    setSampleEvents(prev => {
                                      const exists = prev.some(e => e.id === selectedPreviewItem.id);
                                      if (exists) {
                                        return prev.map(e => e.id === selectedPreviewItem.id ? {
                                          ...e,
                                          title: selectedPreviewItem.title,
                                          date: selectedPreviewItem.date || e.date,
                                          startTime: selectedPreviewItem.startTime || e.startTime,
                                          endTime: selectedPreviewItem.endTime || e.endTime,
                                          color: updatedColor,
                                        } : e);
                                      } else {
                                        return [...prev, {
                                          id: selectedPreviewItem.id || `event-${Date.now()}`,
                                          title: selectedPreviewItem.title,
                                          date: selectedPreviewItem.date || '2026-08-31',
                                          startTime: selectedPreviewItem.startTime || '12:00',
                                          endTime: selectedPreviewItem.endTime || '13:00',
                                          color: updatedColor,
                                        }];
                                      }
                                    });
                                  } else {
                                    setSampleTasks(prev => {
                                      const exists = prev.some(t => t.id === selectedPreviewItem.id);
                                      if (exists) {
                                        return prev.map(t => t.id === selectedPreviewItem.id ? {
                                          ...t,
                                          title: selectedPreviewItem.title,
                                          date: selectedPreviewItem.date || t.date,
                                          startTime: selectedPreviewItem.startTime || t.startTime,
                                          endTime: selectedPreviewItem.endTime || t.endTime,
                                          groupId: selectedPreviewItem.groupId || t.groupId,
                                          goalId: selectedPreviewItem.goalId || t.goalId,
                                          color: updatedColor,
                                        } : t);
                                      } else {
                                        return [...prev, {
                                          id: selectedPreviewItem.id || `task-${Date.now()}`,
                                          title: selectedPreviewItem.title,
                                          date: selectedPreviewItem.date || '2026-08-31',
                                          startTime: selectedPreviewItem.startTime || '12:00',
                                          endTime: selectedPreviewItem.endTime || '13:00',
                                          status: 'todo',
                                          groupId: selectedPreviewItem.groupId || 'group-math',
                                          goalId: selectedPreviewItem.goalId || 'goal-1',
                                          color: updatedColor,
                                        }];
                                      }
                                    });
                                  }
                                }
                                setSelectedPreviewItem(null);
                              }}
                              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-blue-500/20"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>

            {/* Subtle Separator Line between Page 2 and Page 3 */}
            <div className="w-full max-w-5xl mx-auto px-4 my-10">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-700/80 to-transparent" />
            </div>

            {/* PAGE 3: WHY IS UNIWORK BETTER THAN COMPETITORS / OTHER APPS */}
            <CompetitorComparison />
      </div>

      {/* Global Footer with Legal Links & Contact Support */}
      <footer className="mt-16 border-t border-slate-800/80 bg-slate-950/80 py-8 px-4 text-center">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>© 2026 UniWork. All rights reserved.</span>
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