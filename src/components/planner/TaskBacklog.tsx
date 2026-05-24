import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { addDays, format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { usePlanner } from '../../contexts/PlannerContext';
import type { Task, Category, CategoryColor } from '../../types/planner';
import { COLOR_MAP, COLOR_LABELS, ALL_COLORS } from '../../types/planner';

// ─── Draggable Task Card ───────────────────────────────────────────────────────
function TaskCard({ task, category }: { task: Task; category: Category }) {
  const { updateTask, deleteTask, toggleTask, events, viewWeekStart } = usePlanner();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editNote, setEditNote] = useState(task.note ?? '');
  const [editMins, setEditMins] = useState(task.estimatedMinutes);
  const [editDueDate, setEditDueDate] = useState(task.dueDate ?? '');

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `backlog-${task.id}`,
    data: { type: 'backlog-task', taskId: task.id },
  });

  const colors = COLOR_MAP[category.color];

  // 이번 주 그리드에 배치된 태스크인지 확인
  const weekDateStrs = Array.from({ length: 7 }, (_, i) =>
    format(addDays(viewWeekStart, i), 'yyyy-MM-dd')
  );
  const isScheduled = events.some(e => e.taskId === task.id && weekDateStrs.includes(e.date));

  // 전체 스케줄 블럭의 소요시간 합산 (0이면 estimatedMinutes 표시)
  const scheduledTotal = events
    .filter(e => e.taskId === task.id)
    .reduce((sum, e) => sum + e.durationMinutes, 0);

  // 보더: 배치됨 = solid, 미배치 = dashed
  const borderStyle = isScheduled
    ? `3px solid ${colors.border}`
    : `2px dashed ${colors.border}66`;
  // 배경: 미배치는 배경색을 더 연하게
  const bgColor = isDragging
    ? `${colors.bg}99`
    : isScheduled
      ? colors.bg
      : `${colors.bg}88`;

  const saveEdit = () => {
    updateTask(task.id, { title: editTitle, note: editNote, estimatedMinutes: editMins, dueDate: editDueDate || undefined });
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ borderLeft: borderStyle, background: bgColor, borderRadius: 4, padding: '8px 10px', marginBottom: 4 }}>
        <input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          style={{ width: '100%', border: '1px solid #e0ddd5', borderRadius: 3, padding: '3px 6px', fontSize: 11, fontFamily: 'Georgia, serif', background: '#faf8f3', outline: 'none', marginBottom: 4, boxSizing: 'border-box' }}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
        />
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <input
            type="number"
            value={editMins}
            onChange={e => setEditMins(Number(e.target.value))}
            placeholder="분"
            min={5}
            step={5}
            style={{ width: 60, border: '1px solid #e0ddd5', borderRadius: 3, padding: '2px 5px', fontSize: 10, fontFamily: 'Georgia, serif', background: '#faf8f3', outline: 'none' }}
          />
          <span style={{ fontSize: 10, color: '#8c8580', lineHeight: '22px' }}>분</span>
        </div>
        <div style={{ marginBottom: 4 }}>
          <label style={{ fontSize: 9, color: '#8c8580', display: 'block', marginBottom: 2, letterSpacing: 0.5 }}>마감일</label>
          <input
            type="date"
            value={editDueDate}
            onChange={e => setEditDueDate(e.target.value)}
            style={{ width: '100%', border: '1px solid #e0ddd5', borderRadius: 3, padding: '3px 6px', fontSize: 10, fontFamily: 'Georgia, serif', background: '#faf8f3', outline: 'none', boxSizing: 'border-box', color: '#3d3730' }}
          />
        </div>
        <textarea
          value={editNote}
          onChange={e => setEditNote(e.target.value)}
          placeholder="메모..."
          style={{ width: '100%', border: '1px solid #e0ddd5', borderRadius: 3, padding: '3px 6px', fontSize: 10, fontFamily: 'Georgia, serif', background: '#faf8f3', outline: 'none', resize: 'none', height: 44, boxSizing: 'border-box', marginBottom: 4 }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={saveEdit} style={{ ...smallBtn, background: colors.border, color: '#fff', border: 'none' }}>저장</button>
          <button onClick={() => setEditing(false)} style={smallBtn}>취소</button>
          <button onClick={() => deleteTask(task.id)} style={{ ...smallBtn, marginLeft: 'auto', color: '#dc2626' }}>삭제</button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        borderLeft: borderStyle,
        background: bgColor,
        borderRadius: 4,
        padding: '6px 8px',
        marginBottom: 4,
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        transform: CSS.Translate.toString(transform),
        transition: 'opacity 0.15s, border 0.2s, background 0.2s',
        userSelect: 'none',
      }}
      {...attributes}
      {...listeners}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); toggleTask(task.id); }}
          style={{ flexShrink: 0, width: 12, height: 12, borderRadius: '50%', border: `1.5px solid ${colors.border}`, background: task.completed ? colors.border : 'transparent', cursor: 'pointer', marginTop: 2, padding: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontFamily: 'Georgia, serif', fontWeight: 600, color: colors.text,
            textDecoration: task.completed ? 'line-through' : 'none',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {task.title}
          </div>
          {(() => {
            const displayMins = scheduledTotal > 0 ? scheduledTotal : task.estimatedMinutes;
            const hasMins = displayMins > 0;
            const hasDue = !!task.dueDate;
            if (!hasMins && !hasDue && !task.note) return null;
            const today = format(new Date(), 'yyyy-MM-dd');
            const overdue = hasDue && task.dueDate! < today;
            const urgent = hasDue && !overdue && task.dueDate! <= format(addDays(new Date(), 2), 'yyyy-MM-dd');
            const dueColor = overdue ? '#dc2626' : urgent ? '#d97706' : '#8c8580';
            const dueFontWeight = overdue || urgent ? 600 : 400;
            const d = hasDue ? parseISO(task.dueDate!) : null;
            const dueLabel = d ? `${overdue ? '⚠ ' : ''}마감 ${d.getMonth() + 1}/${d.getDate()}` : null;
            const parts: React.ReactNode[] = [];
            if (hasMins) parts.push(<span key="mins">{displayMins}분</span>);
            if (dueLabel) parts.push(
              <span key="due" style={{ color: dueColor, fontWeight: dueFontWeight }}>{dueLabel}</span>
            );
            if (task.note) parts.push(<span key="note">{task.note}</span>);
            return (
              <div style={{ fontSize: 9, color: '#8c8580', marginTop: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0 }}>
                {parts.map((p, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
                    {i > 0 && <span style={{ margin: '0 3px', color: '#c8c0b8' }}>·</span>}
                    {p}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setEditing(true); }}
          style={{ flexShrink: 0, background: 'none', border: 'none', color: '#b5ada4', cursor: 'pointer', padding: '0 2px', fontSize: 12, lineHeight: 1 }}
        >
          ···
        </button>
      </div>
    </div>
  );
}

// ─── Add Task Form ─────────────────────────────────────────────────────────────
function AddTaskForm({ onClose }: { onClose: () => void }) {
  const { categories, addTask } = usePlanner();
  const [title, setTitle] = useState('');
  const [catId, setCatId] = useState(categories[0]?.id ?? '');
  const [mins, setMins] = useState(60);
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({ title: title.trim(), categoryId: catId, estimatedMinutes: mins, note, dueDate: dueDate || undefined });
    onClose();
  };

  return (
    <form onSubmit={submit} style={{ padding: '10px 12px', background: '#f5f2ea', borderTop: '0.5px solid #e0ddd5' }}>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="작업 제목..."
        autoFocus
        style={{ width: '100%', border: '1px solid #e0ddd5', borderRadius: 4, padding: '5px 8px', fontSize: 12, fontFamily: 'Georgia, serif', background: '#faf8f3', outline: 'none', marginBottom: 6, boxSizing: 'border-box' }}
        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
      />
      <select
        value={catId}
        onChange={e => setCatId(e.target.value)}
        style={{ width: '100%', border: '1px solid #e0ddd5', borderRadius: 4, padding: '4px 6px', fontSize: 11, fontFamily: 'Georgia, serif', background: '#faf8f3', outline: 'none', marginBottom: 6, color: '#3d3730' }}
      >
        {categories.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input
          type="number"
          value={mins}
          onChange={e => setMins(Number(e.target.value))}
          min={5} step={5}
          style={{ width: 60, border: '1px solid #e0ddd5', borderRadius: 4, padding: '4px 6px', fontSize: 11, fontFamily: 'Georgia, serif', background: '#faf8f3', outline: 'none' }}
        />
        <span style={{ fontSize: 11, color: '#8c8580', lineHeight: '26px' }}>분 예상</span>
      </div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="메모 (선택)"
        style={{ width: '100%', border: '1px solid #e0ddd5', borderRadius: 4, padding: '4px 6px', fontSize: 10, fontFamily: 'Georgia, serif', background: '#faf8f3', outline: 'none', resize: 'none', height: 40, boxSizing: 'border-box', marginBottom: 6 }}
      />
      <div style={{ marginBottom: 6 }}>
        <label style={{ fontSize: 9, color: '#8c8580', display: 'block', marginBottom: 2, letterSpacing: 0.5 }}>마감일 (선택)</label>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          style={{ width: '100%', border: '1px solid #e0ddd5', borderRadius: 4, padding: '4px 6px', fontSize: 11, fontFamily: 'Georgia, serif', background: '#faf8f3', outline: 'none', boxSizing: 'border-box', color: '#3d3730' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="submit" style={{ flex: 1, background: '#4A90D9', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 11, fontFamily: 'Georgia, serif', cursor: 'pointer' }}>추가</button>
        <button type="button" onClick={onClose} style={{ ...smallBtn, flex: 1 }}>취소</button>
      </div>
    </form>
  );
}

// ─── Category Settings Modal ───────────────────────────────────────────────────
function CategoryModal({ onClose }: { onClose: () => void }) {
  const { categories, addCategory, updateCategory, deleteCategory } = usePlanner();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<CategoryColor>('blue');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#faf8f3', borderRadius: 8, padding: 20, width: 280, maxHeight: '80vh', overflowY: 'auto', fontFamily: 'Georgia, serif', border: '0.5px solid #e0ddd5', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#3d3730' }}>카테고리 관리</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c8580', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        {categories.map(cat => {
          const c = COLOR_MAP[cat.color];
          return (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.border, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 11, color: '#3d3730' }}>{cat.name}</span>
              <button onClick={() => deleteCategory(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b5ada4', fontSize: 13 }}>×</button>
            </div>
          );
        })}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid #e0ddd5' }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="새 카테고리 이름..."
            style={{ width: '100%', border: '1px solid #e0ddd5', borderRadius: 4, padding: '5px 8px', fontSize: 11, fontFamily: 'Georgia, serif', background: '#faf8f3', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { addCategory(newName.trim(), newColor); setNewName(''); }}}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {ALL_COLORS.map(col => (
              <button
                key={col}
                onClick={() => setNewColor(col)}
                title={COLOR_LABELS[col]}
                style={{ width: 18, height: 18, borderRadius: '50%', background: COLOR_MAP[col].border, border: newColor === col ? '2px solid #3d3730' : '2px solid transparent', cursor: 'pointer', padding: 0 }}
              />
            ))}
          </div>
          <button
            onClick={() => { if (newName.trim()) { addCategory(newName.trim(), newColor); setNewName(''); }}}
            style={{ width: '100%', background: '#4A90D9', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 0', fontSize: 11, fontFamily: 'Georgia, serif', cursor: 'pointer' }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Completed Tasks by Month Dropdown ────────────────────────────────────────
function CompletedMonthSection({ monthKey, tasks: monthTasks, categories }: {
  monthKey: string;
  tasks: Task[];
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const date = parseISO(`${monthKey}-01`);
  const label = format(date, 'yyyy년 M월', { locale: ko });

  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
          fontFamily: 'Georgia, serif',
        }}
      >
        <span style={{ fontSize: 9, color: '#a09890', letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 600 }}>
          {label} ({monthTasks.length})
        </span>
        <span style={{ fontSize: 10, color: '#b5ada4', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▾</span>
      </button>
      {open && (
        <div style={{ paddingLeft: 0 }}>
          {monthTasks.map(task => {
            const cat = categories.find(c => c.id === task.categoryId) ?? { id: '', name: '기타', color: 'red' as const };
            return <TaskCard key={task.id} task={task} category={cat} />;
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main TaskBacklog ──────────────────────────────────────────────────────────
export function TaskBacklog() {
  const { categories, tasks, showAddTask, setShowAddTask, viewWeekStart } = usePlanner();
  const [showCatModal, setShowCatModal] = useState(false);

  const weekStartStr = format(viewWeekStart, 'yyyy-MM-dd');

  // 완료 태스크
  const completedTasks = tasks.filter(t => t.completed);

  // 활성 태스크: 미완료이거나, 마감일 있는 미완료
  const activeTasks = tasks.filter(t => {
    if (t.completed) return false;
    if (t.dueDate) return t.dueDate >= weekStartStr;
    return true;
  });

  const tasksByCategory = categories.map(cat => ({
    cat,
    tasks: activeTasks.filter(t => t.categoryId === cat.id),
  })).filter(g => g.tasks.length > 0);

  const uncategorized = activeTasks.filter(t => !categories.some(c => c.id === t.categoryId));

  // 완료 태스크를 월별 그룹핑 (completedAt 없으면 'unknown')
  const completedByMonth: Record<string, Task[]> = {};
  for (const t of completedTasks) {
    const monthKey = t.completedAt ? t.completedAt.slice(0, 7) : 'unknown';
    if (!completedByMonth[monthKey]) completedByMonth[monthKey] = [];
    completedByMonth[monthKey].push(t);
  }
  // 최신 월부터 정렬
  const sortedMonths = Object.keys(completedByMonth).sort((a, b) => b.localeCompare(a));

  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderTop: '0.5px solid #e0ddd5' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 6px', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontFamily: 'Georgia, serif', fontWeight: 700, color: '#8c8580', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Task Backlog
          </span>
          <button
            onClick={() => setShowCatModal(true)}
            title="카테고리 관리"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b5ada4', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
          >
            ⊞
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
          {/* 활성 태스크 */}
          {tasksByCategory.map(({ cat, tasks: catTasks }) => {
            const c = COLOR_MAP[cat.color];
            return (
              <div key={cat.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.border, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: '#8c8580', fontFamily: 'Georgia, serif', letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 600 }}>
                    {cat.name}
                  </span>
                </div>
                {catTasks.map(task => (
                  <TaskCard key={task.id} task={task} category={cat} />
                ))}
              </div>
            );
          })}
          {uncategorized.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: '#b5ada4', fontFamily: 'Georgia, serif', marginBottom: 4, letterSpacing: 0.8, textTransform: 'uppercase' }}>기타</div>
              {uncategorized.map(task => (
                <TaskCard key={task.id} task={task} category={{ id: '', name: '기타', color: 'red' }} />
              ))}
            </div>
          )}
          {activeTasks.length === 0 && completedTasks.length === 0 && (
            <p style={{ fontSize: 10, color: '#c8c0b8', fontFamily: 'Georgia, serif', fontStyle: 'italic', textAlign: 'center', marginTop: 12 }}>
              작업을 추가하세요
            </p>
          )}

          {/* 완료 태스크 구분선 + 월별 드롭다운 */}
          {completedTasks.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ flex: 1, height: '0.5px', background: '#d8d3ca' }} />
                <span style={{ fontSize: 8, color: '#b5ada4', fontFamily: 'Georgia, serif', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  완료 {completedTasks.length}
                </span>
                <div style={{ flex: 1, height: '0.5px', background: '#d8d3ca' }} />
              </div>
              {sortedMonths.map(monthKey => (
                <CompletedMonthSection
                  key={monthKey}
                  monthKey={monthKey === 'unknown' ? format(new Date(), 'yyyy-MM') : monthKey}
                  tasks={completedByMonth[monthKey]}
                  categories={categories}
                />
              ))}
            </div>
          )}
        </div>

        {showAddTask ? (
          <AddTaskForm onClose={() => setShowAddTask(false)} />
        ) : (
          <button
            onClick={() => setShowAddTask(true)}
            style={{ margin: '8px 10px 10px', padding: '7px 0', border: '1px dashed #c8c0b8', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: '#8c8580', fontSize: 11, fontFamily: 'Georgia, serif', letterSpacing: 0.5, flexShrink: 0 }}
          >
            + Add Task
          </button>
        )}
      </div>

      {showCatModal && <CategoryModal onClose={() => setShowCatModal(false)} />}
    </>
  );
}

const smallBtn: React.CSSProperties = {
  border: '1px solid #e0ddd5',
  borderRadius: 3,
  background: '#faf8f3',
  color: '#3d3730',
  fontSize: 10,
  fontFamily: 'Georgia, serif',
  cursor: 'pointer',
  padding: '3px 8px',
};
