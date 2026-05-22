export type CategoryColor = 'blue' | 'amber' | 'green' | 'pink' | 'purple' | 'coral' | 'teal' | 'red';

export const COLOR_MAP: Record<CategoryColor, { border: string; bg: string; text: string }> = {
  blue:   { border: '#4A90D9', bg: '#EBF4FF', text: '#1E40AF' },
  amber:  { border: '#D97706', bg: '#FFFBEB', text: '#92400E' },
  green:  { border: '#059669', bg: '#ECFDF5', text: '#065F46' },
  pink:   { border: '#DB2777', bg: '#FDF2F8', text: '#9D174D' },
  purple: { border: '#7C3AED', bg: '#F5F3FF', text: '#4C1D95' },
  coral:  { border: '#DC4A2A', bg: '#FFF3EE', text: '#9A3412' },
  teal:   { border: '#0D9488', bg: '#F0FDFA', text: '#134E4A' },
  red:    { border: '#DC2626', bg: '#FEF2F2', text: '#991B1B' },
};

export const COLOR_LABELS: Record<CategoryColor, string> = {
  blue: 'Blue', amber: 'Amber', green: 'Green', pink: 'Pink',
  purple: 'Purple', coral: 'Coral', teal: 'Teal', red: 'Red',
};

export const ALL_COLORS: CategoryColor[] = ['blue', 'amber', 'green', 'pink', 'purple', 'coral', 'teal', 'red'];

export interface Category {
  id: string;
  name: string;
  color: CategoryColor;
}

export interface Task {
  id: string;
  title: string;
  categoryId: string;
  estimatedMinutes: number;
  note?: string;
  completed: boolean;
  dueDate?: string; // YYYY-MM-DD
}

export interface ScheduledEvent {
  id: string;
  taskId: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM 24h
  durationMinutes: number;
  completed: boolean;
}

export interface Reflection {
  date: string; // YYYY-MM-DD
  text: string;
}
