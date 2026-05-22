import { useState, useEffect, useRef, type RefObject } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { addDays, format, isToday, isSameDay } from 'date-fns';
import { usePlanner } from '../../contexts/PlannerContext';
import type { ScheduledEvent, Task, Category } from '../../types/planner';
import { COLOR_MAP } from '../../types/planner';

const HOUR_PX = 64;
const SLOT_PX = 32; // 30 min
const TOTAL_PX = 24 * HOUR_PX;
const GUTTER_W = 44;
const START_HOUR = 6;

function minutesToTop(minutes: number) {
  return (minutes / 30) * SLOT_PX;
}

function durationToHeight(minutes: number) {
  return Math.max(SLOT_PX, (minutes / 30) * SLOT_PX);
}

function formatHour(h: number) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function format12(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function endTime(startHHMM: string, durationMins: number) {
  const [h, m] = startHHMM.split(':').map(Number);
  const total = h * 60 + m + durationMins;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return format12(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`);
}

// ─── Scheduled Block ────────────────────────────────────────────────────────
interface BlockProps {
  event: ScheduledEvent;
  task: Task;
  category: Category;
}

function ScheduledBlock({ event, task, category }: BlockProps) {
  const { updateEvent, updateTask, deleteEvent, toggleEvent, addEvent, events } = usePlanner();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const resizingRef = useRef(false);
  const colors = COLOR_MAP[category.color];

  const top = minutesToTop(
    parseInt(event.startTime.split(':')[0]) * 60 + parseInt(event.startTime.split(':')[1])
  );
  const height = durationToHeight(event.durationMinutes);

  // Sync duration to both event and source task
  const applyDuration = (newDur: number) => {
    updateEvent(event.id, { durationMinutes: newDur });
    updateTask(event.taskId, { estimatedMinutes: newDur });
  };

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `event-${event.id}`,
    data: { type: 'scheduled-event', eventId: event.id, taskId: event.taskId, durationMinutes: event.durationMinutes },
    disabled: resizingRef.current,
  });

  const handleResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizingRef.current = true;
    const startY = e.clientY;
    const startDur = event.durationMinutes;

    const onMove = (me: PointerEvent) => {
      const delta = me.clientY - startY;
      const slots = Math.round(delta / SLOT_PX);
      const newDur = Math.max(30, startDur + slots * 30);
      applyDuration(newDur);
    };
    const onUp = () => {
      resizingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [contextMenu]);

  return (
    <>
      <div
        ref={setNodeRef}
        onContextMenu={handleContextMenu}
        onClick={() => !isDragging && setEditing(true)}
        style={{
          position: 'absolute',
          top,
          left: 2,
          right: 2,
          height,
          borderLeft: `3px solid ${colors.border}`,
          background: colors.bg,
          borderRadius: '0 4px 4px 0',
          padding: '3px 6px',
          cursor: isDragging ? 'grabbing' : 'grab',
          opacity: isDragging ? 0 : event.completed ? 0.5 : 1,
          transform: CSS.Translate.toString(transform),
          overflow: 'hidden',
          zIndex: 10,
          boxSizing: 'border-box',
          transition: isDragging ? 'none' : 'opacity 0.15s',
          userSelect: 'none',
        }}
        {...attributes}
        {...listeners}
      >
        <div style={{
          fontSize: 10, fontWeight: 600, fontFamily: 'Georgia, serif',
          color: colors.text, lineHeight: 1.3,
          textDecoration: event.completed ? 'line-through' : 'none',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {task.title}
        </div>
        {height >= 44 && (
          <div style={{ fontSize: 9, color: '#8c8580', fontFamily: 'Georgia, serif', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {event.durationMinutes}분
            {task.dueDate && ` · ${(() => { const d = new Date(task.dueDate + 'T00:00:00'); return `${d.getMonth() + 1}/${d.getDate()}`; })()}`}
          </div>
        )}
        {height >= 60 && (
          <div style={{ fontSize: 9, color: '#b5ada4', fontFamily: 'Georgia, serif', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {format12(event.startTime)} – {endTime(event.startTime, event.durationMinutes)}
          </div>
        )}
        {/* Resize handle */}
        <div
          onPointerDown={handleResizeDown}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, cursor: 'ns-resize', background: 'transparent', zIndex: 11 }}
        />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, background: '#faf8f3', border: '0.5px solid #e0ddd5', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 2000, overflow: 'hidden', fontFamily: 'Georgia, serif', minWidth: 130 }}
          onPointerDown={e => e.stopPropagation()}
        >
          {[
            { label: editing ? '편집 닫기' : '편집', action: () => { setEditing(true); setContextMenu(null); } },
            {
              label: event.completed ? '완료 취소' : '완료',
              action: () => {
                const newCompleted = !event.completed;
                toggleEvent(event.id);
                const allDone = events
                  .filter(e => e.taskId === event.taskId)
                  .every(e => (e.id === event.id ? newCompleted : e.completed));
                updateTask(event.taskId, { completed: allDone });
                setContextMenu(null);
              }
            },
            {
              label: '복제', action: () => {
                const existingTotal = events.filter(e => e.taskId === event.taskId).reduce((sum, e) => sum + e.durationMinutes, 0);
                addEvent({ taskId: event.taskId, date: event.date, startTime: event.startTime, durationMinutes: event.durationMinutes });
                updateTask(event.taskId, { estimatedMinutes: existingTotal + event.durationMinutes });
                setContextMenu(null);
              }
            },
            { label: '삭제', action: () => { deleteEvent(event.id); setContextMenu(null); }, danger: true },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              style={{ display: 'block', width: '100%', padding: '7px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 11, color: item.danger ? '#dc2626' : '#3d3730', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0ede6')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Edit popover — live: inputs read directly from event prop, onChange updates immediately */}
      {editing && (
        <div
          style={{ position: 'absolute', top: Math.min(top, TOTAL_PX - 140), left: 4, width: 188, background: '#faf8f3', border: '0.5px solid #e0ddd5', borderRadius: 6, padding: 10, zIndex: 300, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontFamily: 'Georgia, serif' }}
          onPointerDown={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: '#3d3730', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{task.title}</span>
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b5ada4', fontSize: 15, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 9, color: '#8c8580', display: 'block', marginBottom: 2, letterSpacing: 0.5 }}>시작 시간</label>
            <input
              type="time"
              value={event.startTime}
              onChange={e => { if (e.target.value) updateEvent(event.id, { startTime: e.target.value }); }}
              style={{ width: '100%', border: '1px solid #e0ddd5', borderRadius: 3, padding: '3px 5px', fontSize: 10, fontFamily: 'Georgia, serif', background: '#faf8f3', outline: 'none', boxSizing: 'border-box', color: '#3d3730' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 9, color: '#8c8580', display: 'block', marginBottom: 2, letterSpacing: 0.5 }}>소요 시간 (분)</label>
            <input
              type="number"
              value={event.durationMinutes}
              onChange={e => { const v = Math.max(15, Number(e.target.value)); applyDuration(v); }}
              min={15} step={15}
              style={{ width: '100%', border: '1px solid #e0ddd5', borderRadius: 3, padding: '3px 5px', fontSize: 10, fontFamily: 'Georgia, serif', background: '#faf8f3', outline: 'none', boxSizing: 'border-box', color: '#3d3730' }}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Drag Preview Ghost ─────────────────────────────────────────────────────
interface DragPreview {
  dayIndex: number;
  startMinutes: number;
  durationMinutes: number;
  color: string;
}

// ─── Weekly Grid ────────────────────────────────────────────────────────────
interface WeeklyGridProps {
  gridAreaRef: RefObject<HTMLDivElement | null>;
  scrollRef: RefObject<HTMLDivElement | null>;
  dragPreview: DragPreview | null;
  weekStart: Date;
}

export function WeeklyGrid({ gridAreaRef, scrollRef, dragPreview, weekStart }: WeeklyGridProps) {
  const { events, tasks, categories, reflections, setReflection } = usePlanner();
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

  useEffect(() => {
    const timer = setInterval(() => {
      const n = new Date();
      setCurrentMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Scroll to START_HOUR on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = START_HOUR * HOUR_PX - 16;
    }
  }, [scrollRef]);

  const currentTop = minutesToTop(currentMinutes);
  const isCurrentWeek = days.some(d => isToday(d));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Day headers */}
      <div style={{ display: 'flex', flexShrink: 0, borderBottom: '0.5px solid #e0ddd5', background: '#f5f2ea' }}>
        <div style={{ width: GUTTER_W, flexShrink: 0 }} />
        {days.map((day, i) => {
          const today = isToday(day);
          const dateStr = format(day, 'yyyy-MM-dd');
          return (
            <div key={i} style={{ flex: 1, padding: '8px 4px 6px', textAlign: 'center', borderLeft: i === 0 ? '0.5px solid #e0ddd5' : undefined }}>
              <div style={{ fontSize: 9, color: '#8c8580', fontFamily: 'Georgia, serif', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>
                {DAY_LABELS[i]}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%',
                background: today ? '#4A90D9' : 'transparent',
                color: today ? '#fff' : '#3d3730',
                fontSize: 14, fontFamily: 'Georgia, serif', fontWeight: today ? 700 : 400,
                margin: '0 auto',
              }}>
                {format(day, 'd')}
              </div>
              {/* Reflection input */}
              <div style={{ marginTop: 5, padding: '0 2px' }}>
                {expandedDay === dateStr ? (
                  <textarea
                    autoFocus
                    value={reflections.find(r => r.date === dateStr)?.text ?? ''}
                    onChange={e => setReflection(dateStr, e.target.value)}
                    onBlur={() => setExpandedDay(null)}
                    placeholder="오늘의 회고..."
                    style={{ width: '100%', resize: 'none', height: 52, border: '0.5px solid #c8c0b8', borderRadius: 3, padding: '3px 5px', fontSize: 9, fontFamily: 'Georgia, serif', background: '#faf8f3', color: '#3d3730', outline: 'none', boxSizing: 'border-box' }}
                  />
                ) : (
                  <input
                    value={reflections.find(r => r.date === dateStr)?.text ?? ''}
                    readOnly
                    onClick={() => setExpandedDay(dateStr)}
                    placeholder="오늘의 회고..."
                    style={{ width: '100%', border: '0.5px solid #e0ddd5', borderRadius: 3, padding: '3px 5px', fontSize: 9, fontFamily: 'Georgia, serif', background: 'transparent', color: '#8c8580', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid body */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <div style={{ height: TOTAL_PX, position: 'relative', display: 'flex' }}>
          {/* Time gutter */}
          <div style={{ width: GUTTER_W, flexShrink: 0, position: 'relative' }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} style={{ position: 'absolute', top: h * HOUR_PX - 9, right: 6, width: GUTTER_W - 6, textAlign: 'right' }}>
                {h > 0 && (
                  <span style={{ fontSize: 9, color: '#b5ada4', fontFamily: 'Georgia, serif' }}>
                    {formatHour(h)}
                  </span>
                )}
              </div>
            ))}
            {/* Current time pill */}
            {isCurrentWeek && (
              <div style={{ position: 'absolute', top: currentTop - 9, right: 4, background: '#e53e3e', color: '#fff', borderRadius: 10, padding: '1px 5px', fontSize: 8, fontFamily: 'Georgia, serif', whiteSpace: 'nowrap', zIndex: 20 }}>
                {format12(`${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}`)}
              </div>
            )}
          </div>

          {/* Grid area */}
          <div
            ref={gridAreaRef}
            style={{ flex: 1, position: 'relative', borderLeft: '0.5px solid #e0ddd5' }}
          >
            {/* Hour + half-hour lines */}
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h}>
                <div style={{ position: 'absolute', top: h * HOUR_PX, left: 0, right: 0, borderTop: '0.5px solid #e0ddd5', zIndex: 1 }} />
                <div style={{ position: 'absolute', top: h * HOUR_PX + SLOT_PX, left: 0, right: 0, borderTop: '0.5px dashed #eae7df', zIndex: 1 }} />
              </div>
            ))}

            {/* Current time indicator */}
            {isCurrentWeek && (
              <div style={{ position: 'absolute', top: currentTop, left: 0, right: 0, zIndex: 15, pointerEvents: 'none' }}>
                <div style={{ height: 1.5, background: '#e53e3e', opacity: 0.8 }} />
                <div style={{ position: 'absolute', top: -4, left: 0, width: 8, height: 8, borderRadius: '50%', background: '#e53e3e' }} />
              </div>
            )}

            {/* Day columns */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
              {days.map((day, i) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayEvents = events.filter(e => e.date === dateStr);

                return (
                  <div
                    key={i}
                    style={{ flex: 1, position: 'relative', borderLeft: i > 0 ? '0.5px solid #e0ddd5' : undefined }}
                  >
                    {dayEvents.map(event => {
                      const task = tasks.find(t => t.id === event.taskId);
                      const cat = categories.find(c => c.id === task?.categoryId);
                      if (!task || !cat) return null;
                      return (
                        <ScheduledBlock key={event.id} event={event} task={task} category={cat} />
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Drag preview ghost */}
            {dragPreview && (
              <div
                style={{
                  position: 'absolute',
                  top: minutesToTop(dragPreview.startMinutes),
                  left: `calc(${(dragPreview.dayIndex / 7) * 100}% + 2px)`,
                  width: `calc(${100 / 7}% - 4px)`,
                  height: durationToHeight(dragPreview.durationMinutes),
                  borderLeft: `3px solid ${dragPreview.color}`,
                  background: `${dragPreview.color}33`,
                  borderRadius: '0 4px 4px 0',
                  zIndex: 50,
                  pointerEvents: 'none',
                  opacity: 0.75,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
