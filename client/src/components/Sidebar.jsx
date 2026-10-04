import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Icon from './Icon';
import Avatar from './Avatar';
import Badge, { ROLE_VARIANTS } from './Badge';
import {
  fetchWorkspaces,
  selectWorkspaces,
  selectCurrentWorkspace,
} from '../features/workspace/workspaceSlice';
import { fetchProjects, selectProjects } from '../features/projects/projectSlice';
import { selectUser } from '../features/auth/authSlice';
import { getMyRole } from '../utils/constants';

const TABS = [
  { to: '', label: 'Board', icon: 'board', end: true },
  { to: 'chat', label: 'Chat', icon: 'chat' },
  { to: 'files', label: 'Files', icon: 'folder' },
  { to: 'activity', label: 'Activity', icon: 'activity' },
  { to: 'members', label: 'Members', icon: 'users' },
];

/**
 * Left sidebar for the workspace area: workspace switcher, main nav tabs,
 * project list, and profile/settings links. Deep navy with a purple active
 * pill. Collapses to an icon-only rail on desktop via `collapsed`; becomes a
 * drawer on mobile via `mobileOpen`.
 */
export default function Sidebar({ mobileOpen, onNavigate, collapsed }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const user = useSelector(selectUser);
  const workspaces = useSelector(selectWorkspaces);
  const workspace = useSelector(selectCurrentWorkspace);
  const projects = useSelector(selectProjects);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    if (workspaces.length === 0) dispatch(fetchWorkspaces());
  }, [dispatch, workspaces.length]);

  useEffect(() => {
    if (workspaceId) dispatch(fetchProjects(workspaceId));
  }, [dispatch, workspaceId]);

  const myRole = getMyRole(workspace, user?._id);

  // Desktop: full w-64 or collapsed icon rail w-20. Mobile drawer always w-64.
  const base = `fixed inset-y-0 left-0 z-40 w-64 transform bg-navy text-white transition-all duration-200 lg:static lg:translate-x-0 ${
    mobileOpen ? 'translate-x-0' : '-translate-x-full'
  } ${collapsed ? 'lg:w-20' : ''}`;

  // Labels stay visible in the mobile drawer; hide them on desktop when collapsed.
  const labelCls = collapsed ? 'lg:hidden' : '';
  const centerCls = collapsed ? 'lg:justify-center lg:px-2' : '';

  return (
    <aside className={base} aria-label="Workspace sidebar">
      <div className="flex h-full flex-col overflow-y-auto">
        {/* Workspace switcher (brand lives in the top navbar — no duplicate logo here) */}
        <div className="relative px-3 pb-1 pt-3">
          {collapsed ? (
            <button
              type="button"
              onClick={() => setSwitcherOpen((o) => !o)}
              title={workspace?.name || 'Select workspace'}
              aria-label="Switch workspace"
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white transition hover:bg-white/15"
            >
              {(workspace?.name || '?').slice(0, 2).toUpperCase()}
            </button>
          ) : (
          <>
          <button
            type="button"
            onClick={() => setSwitcherOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl px-2 py-2 transition hover:bg-white/5"
          >
            <span className="min-w-0 text-left">
              <span className="block truncate text-[15px] font-semibold tracking-tight text-white">
                {workspace?.name || 'Select workspace'}
              </span>
              {myRole && (
                <Badge variant={ROLE_VARIANTS[myRole] || 'slate'} className="mt-1.5">
                  {myRole}
                </Badge>
              )}
            </span>
            <Icon name="chevronDown" className="h-4 w-4 shrink-0 text-muted" />
          </button>
          {switcherOpen && (
            <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-white shadow-pop">
              {workspaces.map((w) => (
                <button
                  key={w._id}
                  type="button"
                  onClick={() => {
                    setSwitcherOpen(false);
                    onNavigate?.();
                    navigate(`/workspace/${w._id}`);
                  }}
                  className={`block w-full truncate px-3 py-2 text-left text-sm transition hover:bg-canvas ${
                    String(w._id) === String(workspaceId) ? 'font-semibold text-primary' : 'text-ink'
                  }`}
                >
                  {w.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSwitcherOpen(false);
                  onNavigate?.();
                  navigate('/workspaces');
                }}
                className="flex w-full items-center gap-2 border-t border-line px-3 py-2 text-left text-sm font-semibold text-primary transition hover:bg-canvas"
              >
                All workspaces
              </button>
            </div>
          )}
          </>
          )}
        </div>

        {/* Nav tabs */}
        <nav className="px-3 py-2">
          {TABS.map((t) => (
            <NavLink
              key={t.label}
              to={t.to}
              end={t.end}
              onClick={() => onNavigate?.()}
              title={collapsed ? t.label : undefined}
              className={({ isActive }) =>
                `mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${centerCls} ${
                  isActive
                    ? 'bg-primary text-white shadow-card'
                    : 'text-muted hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon name={t.icon} className="h-4 w-4 shrink-0" />
              <span className={labelCls}>{t.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Projects */}
        <div className={`flex-1 border-t border-white/10 px-3 py-3 ${labelCls}`}>
          <p className="micro-label px-1 !text-white/40">Projects</p>
          <div className="mt-1 space-y-1">
            {projects.map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => {
                  onNavigate?.();
                  navigate(`/project/${p._id}`);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[11px] font-bold text-white/80">
                  {(p.name || '?').slice(0, 2).toUpperCase()}
                </span>
                <span className="truncate">{p.name}</span>
              </button>
            ))}
            {projects.length === 0 && (
              <p className="px-3 py-2 text-xs text-white/35">No projects yet.</p>
            )}
          </div>
        </div>

        {/* Profile + Settings */}
        <div className="border-t border-white/10 px-3 py-2">
          <NavLink
            to="/profile"
            onClick={() => onNavigate?.()}
            title={collapsed ? 'Profile' : undefined}
            className={({ isActive }) =>
              `mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${centerCls} ${
                isActive ? 'bg-primary text-white' : 'text-muted hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon name="user" className="h-4 w-4 shrink-0" />
            <span className={labelCls}>Profile</span>
          </NavLink>
          <NavLink
            to="/settings"
            onClick={() => onNavigate?.()}
            title={collapsed ? 'Settings' : undefined}
            className={({ isActive }) =>
              `mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${centerCls} ${
                isActive ? 'bg-primary text-white' : 'text-muted hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon name="settings" className="h-4 w-4 shrink-0" />
            <span className={labelCls}>Settings</span>
          </NavLink>
        </div>

        {/* Current user */}
        <Link
          to="/profile"
          onClick={() => onNavigate?.()}
          className={`flex items-center gap-2 border-t border-white/10 p-3 transition hover:bg-white/5 ${centerCls}`}
        >
          <Avatar name={user?.name} src={user?.avatar} size="sm" />
          <div className={`min-w-0 ${labelCls}`}>
            <p className="truncate text-xs font-semibold text-white">{user?.name}</p>
            <p className="truncate text-[11px] text-white/45">{user?.email}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
