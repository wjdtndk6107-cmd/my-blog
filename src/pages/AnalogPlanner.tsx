import { useRef, useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { addDays, addWeeks, subWeeks, format, startOfWeek } from 'date-fns';
import { PlannerProvider, usePlanner } from '../contexts/PlannerContext';
import { MiniCalendar } from '../components/planner/MiniCalendar';
import { TaskBacklog } from '../components/planner/TaskBacklog';
import { WeeklyGrid } from '../components/planner/WeeklyGrid';
import { PlannerStats } from '../components/planner/PlannerStats';
import { COLOR_MAP } from '../types/planner';

const SLOT_PX = 32;
const GUTTER_W = 44;

interface DragPreview {
  dayIndex: number;
  startMinutes: number;
  durationMinutes: number;
  color: string;
}

interface ActiveDrag {
  type: 'backlog-task' | 'scheduled-event';
  taskId?: string;
  eventId?: string;
  durationMinutes: number;
  color: string;
  title: string;
}

function PlannerLayout() {
  const {
    viewWeekStart, setViewWeekStart, miniCalMonth, setMiniCalMonth,
    tasks, events, categories, addEvent, updateEvent, setShowAddTask,
  } = usePlanner();

  const gridAreaRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [showStats, setShowStats] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  // Track pointer globally
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // Update drag preview during drag
  const updatePreview = useCallback((ad: ActiveDrag | null) => {
    if (!ad) { setDragPreview(null); return; }
    const gridEl = gridAreaRef.current;
    const scrollEl = scrollRef.current;
    if (!gridEl || !scrollEl) return;
    const gridRect = gridEl.getBoundingClientRect();   // X: stable (no horizontal scroll)
    const scrollRect = scrollEl.getBoundingClientRect(); // Y: stable viewport top of scroll container
    const { x, y } = pointerRef.current;
    if (x < gridRect.left || x > gridRect.right || y < scrollRect.top || y > scrollRect.bottom) {
      setDragPreview(null);
      return;
    }
    const relX = x - gridRect.left;
    // scrollRect.top is stable; scrollTop gives offset within virtual grid
    const relY = y - scrollRect.top + scrollEl.scrollTop;
    const colW = gridRect.width / 7;
    const dayIndex = Math.max(0, Math.min(6, Math.floor(relX / colW)));
    const rawSlot = Math.floor(relY / SLOT_PX);
    const startMinutes = Math.max(0, Math.min(23 * 60 + 30, rawSlot * 30));
    setDragPreview({ dayIndex, startMinutes, durationMinutes: ad.durationMinutes, color: ad.color });
  }, []);

  // Continuously update preview while dragging
  useEffect(() => {
    if (!activeDrag) return;
    let raf: number;
    const loop = () => {
      updatePreview(activeDrag);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [activeDrag, updatePreview]);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as Record<string, unknown> | undefined;
    if (!data) return;

    if (data.type === 'backlog-task') {
      const taskId = data.taskId as string;
      const task = tasks.find(t => t.id === taskId);
      const cat = categories.find(c => c.id === task?.categoryId);
      if (!task) return;
      setActiveDrag({
        type: 'backlog-task',
        taskId,
        durationMinutes: task.estimatedMinutes || 60,
        color: cat ? COLOR_MAP[cat.color].border : '#4A90D9',
        title: task.title,
      });
    } else if (data.type === 'scheduled-event') {
      const eventId = data.eventId as string;
      const ev = events.find(e => e.id === eventId);
      const task = ev ? tasks.find(t => t.id === ev.taskId) : undefined;
      const cat = categories.find(c => c.id === task?.categoryId);
      if (!ev || !task) return;
      setActiveDrag({
        type: 'scheduled-event',
        eventId,
        taskId: ev.taskId,
        durationMinutes: ev.durationMinutes,
        color: cat ? COLOR_MAP[cat.color].border : '#4A90D9',
        title: task.title,
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const ad = activeDrag;
    setActiveDrag(null);
    setDragPreview(null);

    if (!ad) return;

    const gridEl = gridAreaRef.current;
    const scrollEl = scrollRef.current;
    if (!gridEl || !scrollEl) return;

    const gridRect = gridEl.getBoundingClientRect();
    const scrollRect = scrollEl.getBoundingClientRect();
    const { x, y } = pointerRef.current;

    if (x < gridRect.left || x > gridRect.right || y < scrollRect.top || y > scrollRect.bottom) return;

    const relX = x - gridRect.left;
    const relY = y - scrollRect.top + scrollEl.scrollTop;
    const colW = gridRect.width / 7;
    const dayIndex = Math.max(0, Math.min(6, Math.floor(relX / colW)));
    const rawSlot = Math.floor(relY / SLOT_PX);
    const startMinutes = Math.max(0, Math.min(23 * 60 + 30, rawSlot * 30));

    const hours = Math.floor(startMinutes / 60);
    const mins = startMinutes % 60;
    const startTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    const date = format(addDays(viewWeekStart, dayIndex), 'yyyy-MM-dd');

    if (ad.type === 'backlog-task' && ad.taskId) {
      addEvent({ taskId: ad.taskId, date, startTime, durationMinutes: ad.durationMinutes });
    } else if (ad.type === 'scheduled-event' && ad.eventId) {
      updateEvent(ad.eventId, { date, startTime });
    }

    void event; // suppress unused warning
  };

  // Keyboard: N to open add task
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'n' || e.key === 'N') setShowAddTask(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setShowAddTask]);

  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(viewWeekStart, i));
  const weekLabel = `${format(viewWeekStart, 'yyyy년 M월 d일')} – ${format(weekDays[6], 'M월 d일')}`;

  const goToToday = () => {
    const ws = startOfWeek(today, { weekStartsOn: 1 });
    setViewWeekStart(ws);
    setMiniCalMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div
        className="analog-planner"
        style={{
          display: 'flex',
          height: '100vh',
          background: '#faf8f3',
          fontFamily: "Georgia, 'Times New Roman', serif",
          overflow: 'hidden',
          minWidth: 1024,
        }}
      >
        {/* ── Left Sidebar ── */}
        <aside style={{
          width: 220,
          flexShrink: 0,
          background: '#f5f2ea',
          borderRight: '0.5px solid #e0ddd5',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <MiniCalendar />
          <TaskBacklog />
        </aside>

        {/* ── Main Area ── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Week navigation bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 16px',
            borderBottom: '0.5px solid #e0ddd5',
            background: '#f5f2ea',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <button
                onClick={() => setViewWeekStart(subWeeks(viewWeekStart, 1))}
                style={navBtnStyle}
              >
                ‹
              </button>
              <span style={{ fontSize: 13, fontFamily: 'Georgia, serif', color: '#3d3730', fontWeight: 400, letterSpacing: 0.3 }}>
                {weekLabel}
              </span>
              <button
                onClick={() => setViewWeekStart(addWeeks(viewWeekStart, 1))}
                style={navBtnStyle}
              >
                ›
              </button>
            </div>
            <button
              onClick={goToToday}
              style={{
                border: '0.5px solid #c8c0b8',
                borderRadius: 4,
                background: '#faf8f3',
                color: '#3d3730',
                fontSize: 11,
                fontFamily: 'Georgia, serif',
                cursor: 'pointer',
                padding: '4px 12px',
                letterSpacing: 0.3,
              }}
            >
              Today
            </button>
            <button
              onClick={() => setShowStats(true)}
              style={{
                border: '0.5px solid #c8c0b8',
                borderRadius: 4,
                background: showStats ? '#3d3730' : '#faf8f3',
                color: showStats ? '#faf8f3' : '#3d3730',
                fontSize: 11,
                fontFamily: 'Georgia, serif',
                cursor: 'pointer',
                padding: '4px 12px',
                letterSpacing: 0.3,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                <rect x="0" y="6" width="2.5" height="6" rx="0.5" fill="currentColor" />
                <rect x="3.5" y="3" width="2.5" height="9" rx="0.5" fill="currentColor" />
                <rect x="7" y="0" width="2.5" height="12" rx="0.5" fill="currentColor" />
                <rect x="10.5" y="4" width="1.5" height="8" rx="0.5" fill="currentColor" opacity="0.5" />
              </svg>
              통계
            </button>
          </div>

          {/* Weekly Grid */}
          <WeeklyGrid
            gridAreaRef={gridAreaRef}
            scrollRef={scrollRef}
            dragPreview={dragPreview}
            weekStart={viewWeekStart}
          />
        </main>
      </div>

      {/* Stats dashboard panel */}
      {showStats && <PlannerStats onClose={() => setShowStats(false)} />}

      {/* Drag overlay ghost */}
      <DragOverlay>
        {activeDrag && (
          <div style={{
            borderLeft: `3px solid ${activeDrag.color}`,
            background: `${activeDrag.color}22`,
            borderRadius: '0 4px 4px 0',
            padding: '6px 8px',
            width: 140,
            pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'Georgia, serif', color: '#3d3730', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeDrag.title}
            </div>
            <div style={{ fontSize: 9, color: '#8c8580', marginTop: 2 }}>
              {activeDrag.durationMinutes}분
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#8c8580',
  fontSize: 20,
  padding: '0 4px',
  lineHeight: 1,
  fontFamily: 'Georgia, serif',
};

export function AnalogPlanner() {
  return (
    <PlannerProvider>
      <PlannerLayout />
    </PlannerProvider>
  );
}
