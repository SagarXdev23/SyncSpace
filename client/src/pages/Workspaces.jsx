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
  selectWorkspaces,
  selectWorkspaceError,
  clearWorkspaceError,
} from '../features/workspace/workspaceSlice';
import { toast } from '../components/Toast';

const CARD_COLORS = ['bg-statPurple', 'bg-statOrange', 'bg-statGreen', 'bg-statBlue', 'bg-[#F472B6]', 'bg-[#2DD4BF]'];

export default function Workspaces() {
  const dispatch = useDispatch();
  const workspaces = useSelector(selectWorkspaces);
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
              return (
                <Link
                  key={w._id}
                  to={`/workspace/${w._id}`}
                  className="card group p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div className="flex items-start justify-between">
                    {w.logo ? (
                      <img src={w.logo} alt="" className="h-11 w-11 rounded-xl object-cover" />
                    ) : (
                      <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${CARD_COLORS[i % CARD_COLORS.length]}`}>
                        <Icon name="users" className="h-5 w-5" />
                      </span>
                    )}
                    <span className="icon-btn pointer-events-none">
                      <Icon name="dots" className="h-5 w-5" />
                    </span>
                  </div>
                  <h3 className="mt-4 truncate text-[15px] font-bold text-ink transition group-hover:text-primary-dark">
                    {w.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted">
                    {memberCount} member{memberCount === 1 ? '' : 's'}
                  </p>
                </Link>
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
