/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Tag {
  id: string;
  name: string;
  color: string; // Tailwind color class name, e.g., 'blue', 'green', etc.
  bgColor: string; // Tailwind bg class
  textColor: string; // Tailwind text class
  borderColor: string; // Tailwind border class
  visible: boolean; // For filtering
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  tagId: string; // Associated event tag
  color?: string; // Hex color code
  recurringDays?: number[]; // Array of weekdays 0-6 (0 = Sun, 1 = Mon, etc.)
  exceptDates?: string[]; // Array of YYYY-MM-DD dates excluded from recurrence
  recurringParentId?: string; // Links standalone split occurrences back to the master series
  recurringOriginalDate?: string; // The original recurrence date this was split from
  goalId?: string; // Connected goal ID
  goalName?: string; // Preserved Goal Name string
}

export type TaskStatus = 'todo' | 'done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD (due date connected to calendar)
  time?: string; // HH:MM (due time)
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  status: TaskStatus;
  groupId: string; // Associated TaskGroup
  color?: string; // Hex color code
  goalId?: string; // Connected goal ID
  goalName?: string; // Preserved Goal Name string
}

export interface TaskGroup {
  id: string;
  name: string;
  color?: string; // Hex color code
}

export interface Goal {
  id: string;
  title: string;
  color: string; // Tailwind color name or hex
  timeBudget?: number; // target hours
  tagIds?: string[]; // Associated tag IDs (subjects like Science, Math)
  groupIds?: string[]; // Associated task group IDs
  deadlineType?: 'weekly' | 'monthly' | 'custom';
  dueDate?: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  completed?: boolean;
  completedAt?: string; // ISO string
}

export type ActiveTab = 'calendar' | 'focus' | 'tasks' | 'settings' | 'goals' | 'insights' | 'about' | 'privacy' | 'terms' | 'admin';
export type CalendarViewType = 'day' | 'three-day' | 'week' | 'month';
export type TaskViewType = 'list' | 'kanban';

export interface User {
  id: string;
  isGuest: boolean;
  encryptionEnabled: boolean;
  signedInAt: string;
  authProvider?: 'google' | 'guest';
}

export interface UserReview {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export function getLocalISODate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

