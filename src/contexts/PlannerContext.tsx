import React, { createContext, useContext, useState, useEffect } from 'react';
import { startOfWeek, startOfMonth, format } from 'date-fns';
import type { Category, CategoryColor, Task, ScheduledEvent, Reflection } from '../types/planner';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: '현대차 과제', color: 'blue' },
  { id: 'cat-2', name: '대학원 수업', color: 'amber' },
  { id: 'cat-3', name: '연구', color: 'green' },
  { id: 'cat-4', name: '개인', color: 'purple' },
];

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

interface PlannerCtx {
  viewWeekStart: Date;
  setViewWeekStart: (d: Date) => void;
  miniCalMonth: Date;
  setMiniCalMonth: (d: Date) => void;

  categories: Category[];
  addCategory: (name: string, color: CategoryColor) => void;
  updateCategory: (id: string, updates: Partial<Omit<Category, 'id'>>) => void;
  deleteCategory: (id: string) => void;

  tasks: Task[];
  addTask: (t: Omit<Task, 'id' | 'completed'>) => void;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id'>>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;

  events: ScheduledEvent[];
  addEvent: (e: Omit<ScheduledEvent, 'id' | 'completed'>) => void;
  updateEvent: (id: string, updates: Partial<Omit<ScheduledEvent, 'id'>>) => void;
  deleteEvent: (id: string) => void;
  toggleEvent: (id: string) => void;

  reflections: Reflection[];
  setReflection: (date: string, text: string) => void;

  showAddTask: boolean;
  setShowAddTask: (v: boolean) => void;
}

const Ctx = createContext<PlannerCtx | null>(null);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(() =>
    loadStorage('analog_categories', DEFAULT_CATEGORIES)
  );
  const [tasks, setTasks] = useState<Task[]>(() => loadStorage('analog_tasks', []));
  const [events, setEvents] = useState<ScheduledEvent[]>(() => loadStorage('analog_events', []));
  const [reflections, setReflections] = useState<Reflection[]>(() =>
    loadStorage('analog_reflections', [])
  );
  const [viewWeekStart, setViewWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [miniCalMonth, setMiniCalMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [showAddTask, setShowAddTask] = useState(false);

  useEffect(() => saveStorage('analog_categories', categories), [categories]);
  useEffect(() => saveStorage('analog_tasks', tasks), [tasks]);
  useEffect(() => saveStorage('analog_events', events), [events]);
  useEffect(() => saveStorage('analog_reflections', reflections), [reflections]);

  return (
    <Ctx.Provider value={{
      viewWeekStart, setViewWeekStart,
      miniCalMonth, setMiniCalMonth,

      categories,
      addCategory: (name, color) =>
        setCategories(p => [...p, { id: crypto.randomUUID(), name, color }]),
      updateCategory: (id, u) =>
        setCategories(p => p.map(c => c.id === id ? { ...c, ...u } : c)),
      deleteCategory: id =>
        setCategories(p => p.filter(c => c.id !== id)),

      tasks,
      addTask: t =>
        setTasks(p => [...p, { ...t, id: crypto.randomUUID(), completed: false }]),
      updateTask: (id, u) =>
        setTasks(p => p.map(t => t.id === id ? { ...t, ...u } : t)),
      deleteTask: id => setTasks(p => p.filter(t => t.id !== id)),
      toggleTask: id =>
        setTasks(p => p.map(t => t.id === id
          ? { ...t, completed: !t.completed, completedAt: !t.completed ? format(new Date(), 'yyyy-MM-dd') : undefined }
          : t
        )),

      events,
      addEvent: e =>
        setEvents(p => [...p, { ...e, id: crypto.randomUUID(), completed: false }]),
      updateEvent: (id, u) =>
        setEvents(p => p.map(e => e.id === id ? { ...e, ...u } : e)),
      deleteEvent: id => setEvents(p => p.filter(e => e.id !== id)),
      toggleEvent: id =>
        setEvents(p => p.map(e => e.id === id ? { ...e, completed: !e.completed } : e)),

      reflections,
      setReflection: (date, text) =>
        setReflections(p => {
          const exists = p.some(r => r.date === date);
          return exists ? p.map(r => r.date === date ? { ...r, text } : r)
                        : [...p, { date, text }];
        }),

      showAddTask, setShowAddTask,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePlanner() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePlanner must be inside PlannerProvider');
  return ctx;
}
