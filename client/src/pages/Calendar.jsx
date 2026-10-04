import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Shell from '../components/Shell';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';
import Badge, { STATUS_VARIANTS } from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { toast } from '../components/Toast';
import api from '../services/api';
import { formatDate } from '../utils/formatDate';

const ok = (res) => res?.data?.data ?? [];

const CHIP_COLORS = {
  TODO: 'bg-[#F1F0F7] text-slate-600',
  IN_PROGRESS: 'bg-[#FFF3E0] text-[#C47B12]',
  COMPLETED: 'bg-[#E6F7EE] text-[#1F9D57]',
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Global calendar: every task due date across all projects, month grid. */
export default function Calendar() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => {
    const d = new Date();
    return dayKey(d.getFullYear(), d.getMonth(), d.getDate());
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const projects = ok(await api.get('/projects'));
        const perProject = await Promise.all(
          projects.map((p) =>
            api
              .get(`/tasks/${p._id}`)
              .then((res) =>
                ok(res)
                  .filter((t) => t.dueDate)
                  .map((t) => ({ ...t, projectName: p.name })),
              )
              .catch(() => []),
          ),
        );
        if (!cancelled) setTasks(perProject.flat());
      } catch (e) {
        if (!cancelled) toast('Could not load tasks', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byDay = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      const d = new Date(t.dueDate);
      const k = dayKey(d.getFullYear(), d.getMonth(), d.getDate());
      (map[k] = map[k] || []).push(t);
    }
    return map;
  }, [tasks]);

  const cells = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrev = new Date(y, m, 0).getDate();
    const out = [];
    for (let i = firstDow - 1; i >= 0; i--) {
      out.push({ y, m: m - 1, d: daysInPrev - i, other: true });
    }
    for (let d = 1; d <= daysInMonth; d++) out.push({ y, m, d, other: false });
    while (out.length % 7 !== 0) {
      const last = out[out.length - 1];
      out.push({ y: last.y, m: last.m, d: last.d + 1, other: true });
    }
    return out;
  }, [cursor]);

  const monthLabel = cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();
  const todayKey = dayKey(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedTasks = byDay[selected] || [];

  const shift = (dir) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  const goToday = () => {
    const d = new Date();
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelected(dayKey(d.getFullYear(), d.getMonth(), d.getDate()));
  };

  return (
    <Shell>
      <div className="px-4 py-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-bold tracking-tight text-ink">Calendar</h1>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="icon-btn"
              onClick={() => shift(-1)}
              aria-label="Previous month"
            >
              <Icon name="chevronLeft" className="h-5 w-5" />
            </button>
            <span className="min-w-36 text-center text-sm font-semibold text-ink">
              {monthLabel}
            </span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => shift(1)}
              aria-label="Next month"
            >
              <Icon name="chevronRight" className="h-5 w-5" />
            </button>
            <button type="button" className="btn-secondary" onClick={goToday}>
              Today
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8" label="Loading calendar" />
          </div>
        ) : (
          <>
            <div className="card overflow-hidden">
              <div className="grid grid-cols-7 border-b border-line">
                {DOW.map((d) => (
                  <div
                    key={d}
                    className="px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-muted"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((c, i) => {
                  const k = dayKey(c.y, c.m, c.d);
                  const dayTasks = byDay[k] || [];
                  const isToday = k === todayKey;
                  const isSelected = k === selected;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelected(k)}
                      className={`min-h-24 border-b border-r border-line/70 p-1.5 text-left align-top transition last:border-r-0 hover:bg-canvas/60 ${
                        c.other ? 'bg-canvas/40' : 'bg-white'
                      } ${isSelected ? 'ring-2 ring-inset ring-primary/40' : ''}`}
                    >
                      <span
                        className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isToday
                            ? 'bg-primary text-white'
                            : c.other
                              ? 'text-muted'
                              : 'text-ink'
                        }`}
                      >
                        {c.d}
                      </span>
                      <span className="flex flex-col gap-1">
                        {dayTasks.slice(0, 3).map((t) => (
                          <span
                            key={t._id}
                            role="link"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/project/${t.project}`);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') navigate(`/project/${t.project}`);
                            }}
                            className={`truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium ${CHIP_COLORS[t.status] || CHIP_COLORS.TODO}`}
                            title={t.title}
                          >
                            {t.title}
                          </span>
                        ))}
                        {dayTasks.length > 3 && (
                          <span className="px-1 text-[11px] font-semibold text-muted">
                            +{dayTasks.length - 3} more
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card mt-5 p-5">
              <h2 className="mb-4 text-[15px] font-bold tracking-tight text-ink">
                Tasks due {formatDate(new Date(`${selected}T12:00:00`))}
              </h2>
              {selectedTasks.length === 0 ? (
                <EmptyState
                  icon="calendar"
                  title="Nothing due"
                  hint="No tasks are due on this day."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {selectedTasks.map((t) => (
                    <li key={t._id} className="flex items-center gap-3 py-3">
                      <Icon name="check" className="h-4 w-4 shrink-0 text-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{t.title}</p>
                        <p className="truncate text-xs text-body">{t.projectName}</p>
                      </div>
                      <Badge variant={STATUS_VARIANTS[t.status] || 'slate'}>
                        {(t.status || 'TODO').replace('_', ' ')}
                      </Badge>
                      <button
                        type="button"
                        className="btn-secondary !px-3 !py-1.5 text-xs"
                        onClick={() => navigate(`/project/${t.project}`)}
                      >
                        Open
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
