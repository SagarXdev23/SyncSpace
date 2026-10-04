import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useSocket } from '../hooks/SocketContext';
import Shell from '../components/Shell';
import Spinner from '../components/Spinner';
import { toast } from '../components/Toast';
import {
  fetchWorkspace,
  selectCurrentWorkspace,
  selectWorkspaceError,
  clearWorkspaceError,
  clearCurrentWorkspace,
} from '../features/workspace/workspaceSlice';

const TABS = [
  { to: '', label: 'Overview', end: true },
  { to: 'members', label: 'Members' },
  { to: 'projects', label: 'Projects' },
  { to: 'files', label: 'Files' },
  { to: 'settings', label: 'Settings' },
];

/**
 * Workspace details — exact per mockup 9: global sidebar via Shell,
 * workspace header (icon + name), horizontal tabs
 * (Overview/Members/Projects/Files/Settings), tab content via <Outlet/>.
 * Joins the socket workspace room on mount.
 */
export default function Workspace() {
  const { workspaceId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { joinWorkspace, leaveWorkspace } = useSocket();
  const workspace = useSelector(selectCurrentWorkspace);
  const wsError = useSelector(selectWorkspaceError);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    dispatch(fetchWorkspace(workspaceId))
      .unwrap()
      .catch((msg) => {
        toast(msg || 'Workspace not found or access denied', 'error');
        navigate('/workspaces');
      })
      .finally(() => setLoading(false));
    joinWorkspace(workspaceId);
    return () => {
      leaveWorkspace(workspaceId);
      dispatch(clearCurrentWorkspace());
    };
  }, [dispatch, workspaceId, navigate, joinWorkspace, leaveWorkspace]);

  useEffect(() => {
    if (wsError) {
      toast(wsError, 'error');
      dispatch(clearWorkspaceError());
    }
  }, [wsError, dispatch]);

  const base = `/workspace/${workspaceId}`;

  return (
    <Shell>
      <div className="px-4 py-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8" label="Loading workspace" />
          </div>
        ) : (
          <>
            {/* Workspace header — icon + name, per mockup 9 */}
            <div className="flex items-center gap-4">
              {workspace?.logo ? (
                <img
                  src={workspace.logo}
                  alt=""
                  className="h-14 w-14 rounded-2xl object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 text-xl font-bold text-white">
                  {workspace?.name?.charAt(0)?.toUpperCase() || 'W'}
                </span>
              )}
              <h1 className="text-[22px] font-bold tracking-tight text-ink">
                {workspace?.name || 'Workspace'}
              </h1>
            </div>

            {/* Horizontal tabs — Overview / Members / Projects / Files / Settings */}
            <nav className="mt-4 flex gap-6 border-b border-line" aria-label="Workspace sections">
              {TABS.map((t) => (
                <NavLink
                  key={t.label}
                  to={t.to ? `${base}/${t.to}` : base}
                  end={t.end}
                  className={({ isActive }) =>
                    `relative pb-3 text-sm font-semibold transition ${
                      isActive ? 'text-primary' : 'text-body hover:text-ink'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {t.label}
                      {isActive && (
                        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="mt-6">
              <Outlet />
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
