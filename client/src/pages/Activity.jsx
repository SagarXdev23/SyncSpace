import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Shell from '../components/Shell';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import {
  fetchRecentActivity,
  selectRecentActivity,
} from '../features/dashboard/dashboardSlice';
import { timeAgo } from '../utils/formatDate';

const FILTERS = ['All Activities', 'Tasks', 'Files', 'Projects', 'Team'];

const ACTIVITY_STYLE = {
  'comment.added': { icon: 'user', bg: 'bg-[#F59E0B]' },
  'task.assigned': { icon: 'edit', bg: 'bg-[#7C6FF7]' },
  'file.uploaded': { icon: 'upload', bg: 'bg-[#3B82F6]' },
  'project.created': { icon: 'check', bg: 'bg-[#22C55E]' },
  'task.completed': { icon: 'check', bg: 'bg-[#22C55E]' },
  'task.updated': { icon: 'edit', bg: 'bg-[#EF4444]' },
  'member.added': { icon: 'users', bg: 'bg-[#7C6FF7]' },
  'workspace.created': { icon: 'zap', bg: 'bg-[#7C6FF7]' },
};

function humanize(action = '') {
  return action.replace(/\./g, ' ').replace(/_/g, ' ');
}

function highlight(text) {
  // Render quoted/file-like tokens in primary color, like the mockup.
  const parts = String(text).split(/("[^"]+"|\b[\w-]+\.(pdf|zip|png|docx?)\b)/gi);
  return parts.map((p, i) =>
    /^"/.test(p) || /\.(pdf|zip|png|docx?)$/i.test(p) ? (
      <span key={i} className="font-semibold text-primary">
        {p.replace(/"/g, '')}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export default function Activity() {
  const dispatch = useDispatch();
  const activities = useSelector(selectRecentActivity) || [];
  const [filter, setFilter] = useState('All Activities');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    dispatch(fetchRecentActivity(30)).finally(() => setLoading(false));
  }, [dispatch]);

  const filtered = activities.filter((a) => {
    if (filter === 'All Activities') return true;
    const act = String(a.action || '').toLowerCase();
    if (filter === 'Tasks') return act.includes('task');
    if (filter === 'Files') return act.includes('file');
    if (filter === 'Projects') return act.includes('project');
    if (filter === 'Team') return act.includes('member') || act.includes('workspace');
    return true;
  });

  return (
    <Shell>
      <div className="px-4 py-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[22px] font-bold tracking-tight text-ink">Recent Activity</h1>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input !w-auto !rounded-xl"
            aria-label="Filter activities"
          >
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8" label="Loading activity" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-sm text-body">No activity yet.</p>
          </div>
        ) : (
          <div className="card divide-y divide-line/70 p-2">
            {filtered.map((a) => {
              const style = ACTIVITY_STYLE[a.action] || { icon: 'zap', bg: 'bg-[#7C6FF7]' };
              const text = `${a.user?.name || 'Someone'} ${humanize(a.action)}`;
              return (
                <div key={a._id} className="flex items-center gap-3 px-3 py-3.5">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${style.bg}`}
                  >
                    <Icon name={style.icon} className="h-4 w-4" />
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[13.5px] text-ink">
                    {highlight(text)}
                  </p>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(a.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
