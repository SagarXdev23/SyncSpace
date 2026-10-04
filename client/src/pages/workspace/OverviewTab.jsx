import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import Spinner from '../../components/Spinner';
import { fetchProjects, selectProjects } from '../../features/projects/projectSlice';
import {
  fetchActivity,
  selectActivity,
  selectCurrentWorkspace,
} from '../../features/workspace/workspaceSlice';
import { normalizeMember } from '../../utils/constants';
import { timeAgo } from '../../utils/formatDate';

/**
 * Workspace Overview tab: stat cards + recent activity + member preview.
 */
export default function OverviewTab() {
  const { workspaceId } = useParams();
  const dispatch = useDispatch();
  const workspace = useSelector(selectCurrentWorkspace);
  const projects = useSelector(selectProjects);
  const activity = useSelector(selectActivity);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dispatch(fetchProjects(workspaceId)),
      dispatch(fetchActivity(workspaceId)),
    ]).finally(() => setLoading(false));
  }, [dispatch, workspaceId]);

  const members = (workspace?.members || []).map(normalizeMember);

  const cards = [
    { label: 'Projects', value: projects.length, icon: 'folder', bg: 'bg-statGreen' },
    { label: 'Members', value: members.length, icon: 'users', bg: 'bg-statBlue' },
    { label: 'Tasks', value: projects.reduce((a, p) => a + (p.taskCount || 0), 0), icon: 'check', bg: 'bg-statOrange' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" label="Loading overview" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-5 text-[18px] font-bold tracking-tight text-ink">Overview</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card flex items-center gap-4 p-5">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${c.bg}`}>
              <Icon name={c.icon} className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[26px] font-extrabold leading-none tracking-tight text-ink">
                {c.value}
              </span>
              <span className="mt-1 block text-xs font-medium text-body">{c.label}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-ink">Recent Activity</h3>
          </div>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-body">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {activity.slice(0, 5).map((a) => (
                <li key={a._id} className="flex items-center gap-3 py-2.5">
                  {a.user?.name ? (
                    <Avatar name={a.user.name} src={a.user.avatar} size="sm" />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Icon name="zap" className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink">
                      <span className="font-semibold">{a.user?.name || 'Someone'}</span>{' '}
                      <span className="text-body">{(a.action || '').replace(/\./g, ' ')}</span>
                    </p>
                    <p className="text-[11px] text-muted">{timeAgo(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-ink">Members</h3>
            <Link to="members" className="text-xs font-semibold text-primary hover:text-primary-dark">
              View all
            </Link>
          </div>
          <ul className="space-y-2.5">
            {members.slice(0, 5).map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <Avatar name={m.name} src={m.avatar} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{m.name}</p>
                  <p className="truncate text-xs text-muted">{m.email}</p>
                </div>
                <span className="text-[11px] font-semibold capitalize text-muted">{m.role.toLowerCase()}</span>
              </li>
            ))}
          </ul>
          {members.length === 0 && (
            <p className="py-6 text-center text-sm text-body">No members yet.</p>
          )}
        </section>
      </div>

      {workspace?.description && (
        <section className="card mt-5 p-5">
          <h3 className="text-[15px] font-bold text-ink">About</h3>
          <p className="mt-2 text-sm leading-relaxed text-body">{workspace.description}</p>
        </section>
      )}
    </div>
  );
}
