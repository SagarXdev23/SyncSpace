import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Shell from '../components/Shell';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import api from '../services/api';
import { selectUser } from '../features/auth/authSlice';
import { formatDate } from '../utils/formatDate';
import { TASK_STATUSES } from '../utils/constants';

const PRIORITY_DOT = {
  HIGH: 'bg-[#E5484D]',
  MEDIUM: 'bg-statOrange',
  LOW: 'bg-statGreen',
};

function isOverdue(task) {
  return (
    task.dueDate && task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date()
  );
}

export default function Tasks() {
  const user = useSelector(selectUser);
  const userId = user?._id;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await api.get('/projects');
        const projects = res.data?.data || [];
        const mine = [];
        await Promise.all(
          projects.map(async (p) => {
            try {
              const r = await api.get(`/tasks/project/${p._id}`);
              (r.data?.data || []).forEach((t) => {
                const assigneeId = t.assignedTo?._id || t.assignedTo;
                if (assigneeId && String(assigneeId) === String(userId)) {
                  mine.push({ ...t, projectId: p._id, projectName: p.name });
                }
              });
            } catch {
              // A project we cannot read simply contributes no tasks.
            }
          }),
        );
        if (alive) setTasks(mine);
      } catch {
        if (alive) setTasks([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const grouped = useMemo(() => {
    const map = { TODO: [], IN_PROGRESS: [], COMPLETED: [] };
    tasks.forEach((t) => {
      (map[t.status] || map.TODO).push(t);
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }),
    );
    return map;
  }, [tasks]);

  const total = tasks.length;

  return (
    <Shell>
      <div className="px-4 py-6 lg:px-8">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">My Tasks</h1>
        <p className="mt-1 text-sm text-body">
          {total === 0 ? 'Tasks assigned to you.' : `${total} task${total === 1 ? '' : 's'} assigned to you.`}
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8" />
          </div>
        ) : total === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon="check"
              title="Nothing assigned"
              hint="When someone assigns you a task, it will show up here."
            />
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {TASK_STATUSES.map((s) => {
              const list = grouped[s.id] || [];
              if (list.length === 0) return null;
              return (
                <section key={s.id}>
                  <div className="mb-3 flex items-center gap-2">
                    <h2 className="text-sm font-bold tracking-tight text-ink">{s.label}</h2>
                    <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-body">
                      {list.length}
                    </span>
                  </div>
                  <div className="card divide-y divide-line overflow-hidden">
                    {list.map((t) => {
                      const overdue = isOverdue(t);
                      return (
                        <Link
                          key={t._id}
                          to={`/project/${t.projectId}`}
                          className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-canvas/60"
                        >
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_DOT[t.priority] || PRIORITY_DOT.MEDIUM}`}
                            title={`${t.priority} priority`}
                          />
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block truncate text-sm font-semibold ${
                                t.status === 'COMPLETED' ? 'text-muted line-through' : 'text-ink'
                              }`}
                            >
                              {t.title}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted">
                              {t.projectName}
                            </span>
                          </span>
                          {t.dueDate && (
                            <span
                              className={`flex shrink-0 items-center gap-1 text-xs font-medium ${
                                overdue ? 'text-[#E5484D]' : 'text-muted'
                              }`}
                            >
                              <Icon name="clock" className="h-3.5 w-3.5" />
                              {formatDate(t.dueDate)}
                            </span>
                          )}
                          <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-muted" />
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
