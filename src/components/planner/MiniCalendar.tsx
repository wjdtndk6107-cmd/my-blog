import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, addMonths, subMonths, addDays,
  format, isSameDay, isToday, isSameMonth, isSameWeek,
} from 'date-fns';
import { usePlanner } from '../../contexts/PlannerContext';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export function MiniCalendar() {
  const { miniCalMonth, setMiniCalMonth, viewWeekStart, setViewWeekStart } = usePlanner();

  const firstOfMonth = startOfMonth(miniCalMonth);
  const lastOfMonth = endOfMonth(miniCalMonth);
  const calStart = startOfWeek(firstOfMonth, { weekStartsOn: 0 });
  let calEnd = lastOfMonth;
  while (calEnd.getDay() !== 6) calEnd = addDays(calEnd, 1);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const handleDate = (date: Date) => {
    const ws = startOfWeek(date, { weekStartsOn: 1 });
    setViewWeekStart(ws);
    if (!isSameMonth(date, miniCalMonth)) setMiniCalMonth(startOfMonth(date));
  };

  return (
    <div style={{ padding: '14px 12px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={() => setMiniCalMonth(subMonths(miniCalMonth, 1))} style={navBtn}>‹</button>
        <span style={{ fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: 700, color: '#3d3730', letterSpacing: 0.5 }}>
          {format(miniCalMonth, 'yyyy년 M월')}
        </span>
        <button onClick={() => setMiniCalMonth(addMonths(miniCalMonth, 1))} style={navBtn}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DOW.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, color: '#b5ada4', fontFamily: 'Georgia, serif', letterSpacing: 0.5, paddingBottom: 3 }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {days.map(day => {
          const inWeek = isSameWeek(day, viewWeekStart, { weekStartsOn: 1 });
          const todayDate = isToday(day);
          const inMonth = isSameMonth(day, miniCalMonth);
          const isWeekStart = isSameDay(day, viewWeekStart);
          const isWeekEnd = isSameDay(day, addDays(viewWeekStart, 6));

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDate(day)}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: todayDate ? '50%' : inWeek ? (isWeekStart ? '50% 0 0 50%' : isWeekEnd ? '0 50% 50% 0' : '0') : '50%',
                border: 'none',
                cursor: 'pointer',
                fontSize: 10,
                fontFamily: 'Georgia, serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: todayDate ? '#4A90D9' : inWeek ? '#deeef8' : 'transparent',
                color: todayDate ? '#fff' : inMonth ? '#3d3730' : '#c8c0b8',
                fontWeight: todayDate ? 700 : 400,
                transition: 'background 0.1s',
                position: 'relative',
                zIndex: todayDate ? 2 : 1,
              }}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#8c8580',
  fontSize: 16,
  padding: '0 4px',
  lineHeight: 1,
  fontFamily: 'Georgia, serif',
};
