import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import Shell from '../components/Shell';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import {
  fetchWorkspaces,
  deleteWorkspace,
  selectWorkspaces,
  selectWorkspaceError,
  clearWorkspaceError,
} from '../features/workspace/workspaceSlice';
import { selectUser } from '../features/auth/authSlice';
import { getMyRole } from '../utils/constants';
import { toast } from '../components/Toast';

const CARD_COLORS = ['bg-statPurple', 'bg-statOrange', 'bg-statGreen', 'bg-statBlue', 'bg-[#F472B6]', 'bg-[#2DD4BF]'];

export default function Workspaces() {
  const dispatch = useDispatch();
  const workspaces = useSelector(selectWorkspaces);
  const user = useSelector(selectUser);
  const wsError = useSelector(selectWorkspaceError);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    dispatch(fetchWorkspaces()).finally(() => setLoading(false));
  }, [dispatch]);

  useEffect(() => {
    if (wsError) {
      toast(wsError, 'error');
      dispatch(clearWorkspaceError());
    }
  }, [wsError, dispatch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((w) => (w.name || '').toLowerCase().includes(q));
  }, [workspaces, query]);

  const onDeleteWorkspace = async (workspace) => {
    if (!window.confirm(`Delete "${workspace.name}"? This cannot be undone.`)) return;
    const result = await dispatch(deleteWorkspace(workspace._id));
    if (deleteWorkspace.fulfilled.match(result)) toast('Workspace deleted', 'success');
  };

  return (
    <Shell onSearch={setQuery} searchPlaceholder="Search workspaces…">
      <div className="px-4 py-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[22px] font-bold tracking-tight text-ink">My Workspaces</h1>
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
            <Spinner className="h-8 w-8" label="Loading workspaces" />
          </div>
        ) : workspaces.length === 0 ? (
          <EmptyState
            icon="users"
            title="No workspaces yet"
            hint="Create a workspace and invite your team. Boards, chat and files are waiting."
            action={
              <button type="button" className="btn-primary !rounded-[10px]" onClick={() => setModalOpen(true)}>
                <Icon name="plus" className="h-4 w-4" />
                Create Workspace
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title="No workspaces match your search"
            hint="Try a different name, or create a new workspace."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((w, i) => {
              const memberCount = w.members?.length || 0;
              const isOwner = getMyRole(w, user?._id) === 'OWNER';
              return (
                <article
                  key={w._id}
                  className="card group relative p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <details className="absolute right-5 top-5 z-10">
                    <summary
                      className="icon-btn list-none cursor-pointer"
                      aria-label={`Actions for ${w.name}`}
                      title={`Actions for ${w.name}`}
                    >
                      <Icon name="dots" className="h-5 w-5" />
                    </summary>
                    <div
                      role="menu"
                      className="absolute right-0 top-full mt-1 w-44 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg"
                    >
                      <Link
                        role="menuitem"
                        to={`/workspace/${w._id}`}
                        className="block px-3 py-2 text-sm text-ink hover:bg-canvas"
                      >
                        Open workspace
                      </Link>
                      <Link
                        role="menuitem"
                        to={`/workspace/${w._id}/settings`}
                        className="block px-3 py-2 text-sm text-ink hover:bg-canvas"
                      >
                        Workspace settings
                      </Link>
                      {isOwner && (
                        <button
                          type="button"
                          role="menuitem"
                          className="block w-full px-3 py-2 text-left text-sm text-[#D63A3A] hover:bg-canvas"
                          onClick={() => onDeleteWorkspace(w)}
                        >
                          Delete workspace
                        </button>
                      )}
                    </div>
                  </details>
                  <Link to={`/workspace/${w._id}`} className="block pr-10">
                    {w.logo ? (
                      <img src={w.logo} alt="" className="h-11 w-11 rounded-xl object-cover" />
                    ) : (
                      <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${CARD_COLORS[i % CARD_COLORS.length]}`}>
                        <Icon name="users" className="h-5 w-5" />
                      </span>
                    )}
                    <h3 className="mt-4 truncate text-[15px] font-bold text-ink transition group-hover:text-primary-dark">
                      {w.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted">
                      {memberCount} member{memberCount === 1 ? '' : 's'}
                    </p>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <CreateWorkspaceModal
          onClose={() => setModalOpen(false)}
          onCreated={() => dispatch(fetchWorkspaces())}
        />
      )}
    </Shell>
  );
}
