import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Icon from './Icon';
import HeaderActions from './HeaderActions';
import { fetchWorkspaces, selectWorkspaces } from '../features/workspace/workspaceSlice';

function WorkspacePill() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const workspaces = useSelector(selectWorkspaces);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, [dispatch]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = workspaces.find((w) => String(w._id) === String(workspaceId));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pl-2 pr-3 text-sm font-semibold text-ink shadow-card transition hover:border-muted/50"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">
          {(current?.name || 'W').slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-32 truncate">{current?.name || 'Workspace'}</span>
        <Icon name="chevronDown" className="h-4 w-4 text-muted" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
          <div className="max-h-64 overflow-y-auto py-1.5">
            {workspaces.map((w) => (
              <button
                key={w._id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate(`/workspace/${w._id}`);
                }}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition hover:bg-canvas ${
                  String(w._id) === String(workspaceId)
                    ? 'font-semibold text-primary'
                    : 'text-ink'
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-[11px] font-bold text-primary">
                  {w.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate">{w.name}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/workspaces');
            }}
            className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-sm font-semibold text-primary transition hover:bg-canvas"
          >
            All workspaces
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Topbar — exact per mockups: workspace switcher pill left, centered search,
 * bell + avatar right.
 */
export default function Topbar({ onSearch, searchPlaceholder = 'Search…', onMenu }) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur lg:px-6">
      {onMenu && (
        <button type="button" className="icon-btn lg:hidden" onClick={onMenu} aria-label="Open menu">
          <Icon name="dashboard" className="h-5 w-5" />
        </button>
      )}
      <WorkspacePill />
      {onSearch ? (
        <div className="relative mx-auto hidden w-full max-w-md sm:block">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            aria-label="Search"
            placeholder={searchPlaceholder}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full rounded-full border border-transparent bg-canvas py-2 pl-10 pr-4 text-sm text-ink placeholder-muted transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      ) : (
        <div className="mx-auto hidden w-full max-w-md sm:block" />
      )}
      <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
        <HeaderActions />
      </div>
    </header>
  );
}
