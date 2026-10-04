import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import Shell from '../components/Shell';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import {
  fetchStats,
  fetchRecentProjects,
  fetchRecentActivity,
  selectStats,
  selectRecentProjects,
  selectRecentActivity,
} from '../features/dashboard/dashboardSlice';
import { selectUser } from '../features/auth/authSlice';
import { timeAgo } from '../utils/formatDate';

const STATS = [
  { key: 'workspaces', label: 'Workspaces', icon: 'users', bg: 'bg-statPurple' },
  { key: 'projects', label: 'Projects', icon: 'folder', bg: 'bg-statGreen' },
  { key: 'tasks', label: 'Tasks', icon: 'check', bg: 'bg-statOrange' },
];

const ACTIVITY_ICONS = {
  'workspace.created': 'zap',
  'member.added': 'users',
  'member.removed': 'x',
  'project.created': 'folder',
  'task.created': 'plus',
  'task.assigned': 'user',
  'task.completed': 'check',
  'file.uploaded': 'upload',
  'comment.added': 'chat',
};

function humanizeAction(action = '') {
  return action.replace(/\./g, ' ').replace(/_/g, ' ');
}

const PROJECT_ICON_COLORS = ['bg-[#F87171]', 'bg-[#2DD4BF]', 'bg-[#FB923C]', 'bg-[#34D399]'];

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const stats = useSelector(selectStats);
  const recentProjects = useSelector(selectRecentProjects);
  const recentActivity = useSelector(selectRecentActivity);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dispatch(fetchStats()),
      dispatch(fetchRecentProjects()),
      dispatch(fetchRecentActivity(5)),
    ]).finally(() => setLoading(false));
  }, [dispatch]);

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <Shell>
      <div className="px-4 py-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-ink">
              Welcome back, {firstName}!
            </h1>
            <p className="mt-1 text-[13px] text-body">
              Here&apos;s what&apos;s happening in your workspaces.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary !rounded-[10px]"
            onClick={() => setModalOpen(true)}
          >
            <Icon name="plus" className="h-4 w-4" />
            Create Workspace
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8" label="Loading dashboard" />
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
              {STATS.map((s) => (
                <div key={s.key} className="card flex items-center gap-4 p-5">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${s.bg}`}>
                    <Icon name={s.icon} className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-[26px] font-extrabold leading-none tracking-tight text-ink">
                      {stats?.[s.key] ?? 0}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-body">{s.label}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Recent projects + activity */}
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <section className="card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-[15px] font-bold text-ink">Recent Projects</h2>
                  <Link to="/projects" className="text-xs font-semibold text-primary hover:text-primary-dark">
                    View all
                  </Link>
                </div>
                {recentProjects.length === 0 ? (
                  <p className="py-8 text-center text-sm text-body">
                    No projects yet — create one inside a workspace.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {recentProjects.slice(0, 4).map((p, i) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => navigate(`/project/${p._id}`)}
                        className="rounded-xl border border-line/70 p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
                      >
                        <span className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-white ${PROJECT_ICON_COLORS[i % PROJECT_ICON_COLORS.length]}`}>
                          <Icon name="folder" className="h-4 w-4" />
                        </span>
                        <span className="mt-2.5 block truncate text-[13.5px] font-bold text-ink">
                          {p.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {p.updatedAt ? timeAgo(p.updatedAt) : p.workspace?.name || ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="card p-5">
                <h2 className="mb-2 text-[15px] font-bold text-ink">Recent Activity</h2>
                {recentActivity.length === 0 ? (
                  <p className="py-8 text-center text-sm text-body">
                    Nothing here yet — activity across your workspaces will show up here.
                  </p>
                ) : (
                  <ul className="divide-y divide-line/70">
                    {recentActivity.slice(0, 5).map((a) => (
                      <li key={a._id} className="flex items-center gap-3 py-2.5">
                        {a.user?.name ? (
                          <Avatar name={a.user.name} src={a.user.avatar} size="sm" />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                            <Icon name={ACTIVITY_ICONS[a.action] || 'zap'} className="h-4 w-4" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-ink">
                            <span className="font-semibold">{a.user?.name || 'Someone'}</span>{' '}
                            <span className="text-body">{humanizeAction(a.action)}</span>
                          </p>
                          <p className="text-[11px] text-muted">{timeAgo(a.createdAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <CreateWorkspaceModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            dispatch(fetchStats());
            navigate('/workspaces');
          }}
        />
      )}
    </Shell>
  );
}
