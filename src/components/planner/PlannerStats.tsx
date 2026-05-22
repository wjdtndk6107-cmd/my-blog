import { useMemo, useState } from 'react';
import { addDays, format, startOfWeek, subWeeks } from 'date-fns';
import { usePlanner } from '../../contexts/PlannerContext';
import { COLOR_MAP } from '../../types/planner';

// ─── Mini chart primitives ────────────────────────────────────────────────────

function DonutRing({
  pct, color, size = 72,
}: { pct: number; color: string; size?: number }) {
  const stroke = 7;
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e0ddd5" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

function HBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 7, background: '#e8e4dc', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function VBar({ values, colors, dayLabels, today }: {
  values: number[]; colors: string[]; dayLabels: string[]; today: number;
}) {
  const max = Math.max(...values, 30);
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 90 }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
            <div style={{
              width: '100%',
              height: `${(v / max) * 100}%`,
              minHeight: v > 0 ? 3 : 0,
              background: colors[i],
              borderRadius: '2px 2px 0 0',
              opacity: i === today ? 1 : 0.55,
              transition: 'height 0.4s ease',
            }} />
          </div>
          <span style={{ fontSize: 9, fontFamily: 'Georgia, serif', color: i === today ? '#3d3730' : '#b5ada4', fontWeight: i === today ? 700 : 400 }}>
            {dayLabels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div style={{ background: '#faf8f3', border: '0.5px solid #e0ddd5', borderRadius: 8, padding: '14px 16px', flex: 1 }}>
      <div style={{ fontSize: 9, color: '#b5ada4', fontFamily: 'Georgia, serif', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 700, color: accent ?? '#3d3730', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#8c8580', fontFamily: 'Georgia, serif', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
interface Props { onClose: () => void; }

export function PlannerStats({ onClose }: Props) {
  const { viewWeekStart, events, tasks, categories, reflections } = usePlanner();

  // allow browsing past weeks inside dashboard
  const [offset, setOffset] = useState(0);
  const weekStart = offset === 0 ? viewWeekStart : subWeeks(viewWeekStart, -offset);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekDateStrs = weekDays.map(d => format(d, 'yyyy-MM-dd'));
  const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

  const todayDayIdx = useMemo(() => {
    const t = format(new Date(), 'yyyy-MM-dd');
    return weekDateStrs.indexOf(t);
  }, [weekDateStrs]);

  // ── This-week stats ────────────────────────────────────────────────────────
  const weekEvents = useMemo(() => events.filter(e => weekDateStrs.includes(e.date)), [events, weekDateStrs]);
  const completedEvents = weekEvents.filter(e => e.completed);
  const totalScheduledMins = weekEvents.reduce((s, e) => s + e.durationMinutes, 0);
  const eventCompletionPct = weekEvents.length > 0 ? Math.round(completedEvents.length / weekEvents.length * 100) : 0;
  const completedTasks = tasks.filter(t => t.completed);
  const taskCompletionPct = tasks.length > 0 ? Math.round(completedTasks.length / tasks.length * 100) : 0;
  const reflectionCount = weekDateStrs.filter(d => reflections.find(r => r.date === d && r.text.trim())).length;

  const formatMins = (m: number) => m >= 60
    ? `${Math.floor(m / 60)}h ${m % 60 > 0 ? `${m % 60}m` : ''}`.trim()
    : `${m}m`;

  // ── Per-day mins ──────────────────────────────────────────────────────────
  const dailyMins = weekDateStrs.map(d =>
    events.filter(e => e.date === d).reduce((s, e) => s + e.durationMinutes, 0)
  );

  // ── Category breakdown ────────────────────────────────────────────────────
  const catStats = useMemo(() => {
    return categories.map(cat => {
      const catTaskIds = tasks.filter(t => t.categoryId === cat.id).map(t => t.id);
      const weekCatEvents = weekEvents.filter(e => catTaskIds.includes(e.taskId));
      const allCatEvents = events.filter(e => catTaskIds.includes(e.taskId));
      const weekMins = weekCatEvents.reduce((s, e) => s + e.durationMinutes, 0);
      const catTasks = tasks.filter(t => t.categoryId === cat.id);
      const doneTasks = catTasks.filter(t => t.completed);
      return { cat, weekMins, totalEvents: allCatEvents.length, catTasks, doneTasks };
    }).filter(s => s.catTasks.length > 0 || s.weekMins > 0);
  }, [categories, tasks, weekEvents, events]);

  const maxCatMins = Math.max(...catStats.map(s => s.weekMins), 1);

  // ── All-time totals ───────────────────────────────────────────────────────
  const allTimeMins = events.reduce((s, e) => s + e.durationMinutes, 0);
  const busyDayIdx = dailyMins.indexOf(Math.max(...dailyMins));

  // ── Daily bar colors (by dominant category that day) ──────────────────────
  const dayBarColors = weekDateStrs.map(d => {
    const dayEvts = events.filter(e => e.date === d);
    if (!dayEvts.length) return '#c8c0b8';
    const catMinMap: Record<string, number> = {};
    dayEvts.forEach(e => {
      const task = tasks.find(t => t.id === e.taskId);
      const cat = categories.find(c => c.id === task?.categoryId);
      if (cat) catMinMap[cat.id] = (catMinMap[cat.id] ?? 0) + e.durationMinutes;
    });
    const topCatId = Object.entries(catMinMap).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topCat = categories.find(c => c.id === topCatId);
    return topCat ? COLOR_MAP[topCat.color].border : '#4A90D9';
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(61,55,48,0.35)',
      display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
    }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        style={{
          width: 540, background: '#faf8f3',
          borderLeft: '0.5px solid #e0ddd5',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "Georgia, 'Times New Roman', serif",
          boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '0.5px solid #e0ddd5', background: '#f5f2ea', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: '#b5ada4', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Analog</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#3d3730' }}>주간 대시보드</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c8580', fontSize: 20, padding: '2px 6px' }}>×</button>
          </div>
          {/* Week picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setOffset(o => o - 1)} style={smallNavBtn}>‹</button>
            <span style={{ fontSize: 11, color: '#3d3730', flex: 1, textAlign: 'center' }}>
              {format(weekStart, 'yyyy년 M월 d일')} – {format(weekDays[6], 'M월 d일')}
            </span>
            <button onClick={() => setOffset(o => o + 1)} style={smallNavBtn}>›</button>
            {offset !== 0 && (
              <button onClick={() => setOffset(0)} style={{ ...smallNavBtn, fontSize: 10, padding: '2px 8px' }}>이번 주</button>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Summary cards ── */}
          <div style={{ display: 'flex', gap: 10 }}>
            <StatCard
              label="스케줄 시간"
              value={formatMins(totalScheduledMins)}
              sub={`${weekEvents.length}개 이벤트`}
              accent="#4A90D9"
            />
            <StatCard
              label="이벤트 완료율"
              value={`${eventCompletionPct}%`}
              sub={`${completedEvents.length} / ${weekEvents.length}개 완료`}
              accent={eventCompletionPct >= 70 ? '#059669' : eventCompletionPct >= 40 ? '#D97706' : '#DC2626'}
            />
            <StatCard
              label="태스크 완료"
              value={`${taskCompletionPct}%`}
              sub={`${completedTasks.length} / ${tasks.length}개`}
            />
            <StatCard
              label="회고 작성"
              value={`${reflectionCount} / 7`}
              sub="일 작성됨"
              accent={reflectionCount >= 5 ? '#059669' : '#8c8580'}
            />
          </div>

          {/* ── Completion rings ── */}
          <Section title="완료율 현황">
            <div style={{ display: 'flex', gap: 28, padding: '4px 0' }}>
              {[
                { label: '이벤트', pct: eventCompletionPct, color: '#4A90D9' },
                { label: '태스크', pct: taskCompletionPct, color: '#059669' },
                { label: '회고', pct: Math.round(reflectionCount / 7 * 100), color: '#7C3AED' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ position: 'relative' }}>
                    <DonutRing pct={item.pct} color={item.color} size={68} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.pct}%</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: '#8c8580', letterSpacing: 0.5 }}>{item.label}</span>
                </div>
              ))}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, paddingLeft: 12, borderLeft: '0.5px solid #e0ddd5' }}>
                <MiniStat label="이번 주 최고 활동" value={dailyMins[busyDayIdx] > 0 ? `${DAY_LABELS[busyDayIdx]}요일 (${formatMins(dailyMins[busyDayIdx])})` : '—'} />
                <MiniStat label="누적 스케줄 시간" value={formatMins(allTimeMins)} />
                <MiniStat label="총 이벤트 수" value={`${events.length}개`} />
              </div>
            </div>
          </Section>

          {/* ── Daily activity bar ── */}
          <Section title="일별 스케줄 시간">
            <div style={{ marginBottom: 6 }}>
              <VBar values={dailyMins} colors={dayBarColors} dayLabels={DAY_LABELS} today={todayDayIdx} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {weekDateStrs.map((d, i) => {
                const mins = dailyMins[i];
                return (
                  <div key={d} style={{ fontSize: 9, color: '#8c8580', fontFamily: 'Georgia, serif', background: '#f5f2ea', borderRadius: 3, padding: '2px 6px' }}>
                    {DAY_LABELS[i]} {mins > 0 ? formatMins(mins) : '—'}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── Category breakdown ── */}
          <Section title="카테고리별 시간 (이번 주)">
            {catStats.length === 0 ? (
              <p style={{ fontSize: 11, color: '#c8c0b8', fontStyle: 'italic', margin: 0 }}>이번 주 스케줄된 이벤트가 없습니다</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {catStats
                  .sort((a, b) => b.weekMins - a.weekMins)
                  .map(({ cat, weekMins, catTasks, doneTasks }) => {
                    const colors = COLOR_MAP[cat.color];
                    return (
                      <div key={cat.id}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.border, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: '#3d3730', fontFamily: 'Georgia, serif' }}>{cat.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: colors.text, fontWeight: 600 }}>{weekMins > 0 ? formatMins(weekMins) : '—'}</span>
                            <span style={{ fontSize: 9, color: '#b5ada4' }}>{doneTasks.length}/{catTasks.length} 완료</span>
                          </div>
                        </div>
                        <HBar pct={(weekMins / maxCatMins) * 100} color={colors.border} />
                      </div>
                    );
                  })}
              </div>
            )}
          </Section>

          {/* ── Task status per category ── */}
          <Section title="태스크 현황">
            {catStats.length === 0 ? (
              <p style={{ fontSize: 11, color: '#c8c0b8', fontStyle: 'italic', margin: 0 }}>등록된 태스크가 없습니다</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {catStats.map(({ cat, catTasks, doneTasks }) => {
                  if (catTasks.length === 0) return null;
                  const colors = COLOR_MAP[cat.color];
                  const donePct = Math.round(doneTasks.length / catTasks.length * 100);
                  return (
                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors.border, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: '#3d3730', width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                      <div style={{ flex: 1 }}>
                        <HBar pct={donePct} color={colors.border} />
                      </div>
                      <span style={{ fontSize: 9, color: '#8c8580', flexShrink: 0, width: 56, textAlign: 'right' }}>
                        {doneTasks.length}/{catTasks.length} ({donePct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* ── Reflections this week ── */}
          <Section title="이번 주 회고">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {weekDateStrs.map((d, i) => {
                const ref = reflections.find(r => r.date === d);
                if (!ref?.text.trim()) return (
                  <div key={d} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: '#c8c0b8', width: 30, flexShrink: 0 }}>{DAY_LABELS[i]}</span>
                    <span style={{ fontSize: 10, color: '#d4cfc9', fontStyle: 'italic' }}>—</span>
                  </div>
                );
                return (
                  <div key={d} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 10, color: '#8c8580', width: 30, flexShrink: 0, paddingTop: 2 }}>{DAY_LABELS[i]}</span>
                    <div style={{ flex: 1, background: '#f5f2ea', borderLeft: '2px solid #c8c0b8', borderRadius: '0 4px 4px 0', padding: '4px 8px' }}>
                      <p style={{ margin: 0, fontSize: 10, color: '#3d3730', lineHeight: 1.6 }}>{ref.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: '#b5ada4', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'Georgia, serif', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        {title}
        <div style={{ flex: 1, height: '0.5px', background: '#e0ddd5' }} />
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 8, color: '#b5ada4', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#3d3730', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

const smallNavBtn: React.CSSProperties = {
  background: 'none',
  border: '0.5px solid #e0ddd5',
  borderRadius: 3,
  cursor: 'pointer',
  color: '#8c8580',
  fontSize: 14,
  padding: '2px 8px',
  fontFamily: 'Georgia, serif',
  lineHeight: 1.4,
};
