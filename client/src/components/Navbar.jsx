import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Icon from './Icon';
import Logo from './Logo';
import HeaderActions from './HeaderActions';
import {
  logoutUser,
} from '../features/auth/authSlice';
import { clearChat } from '../features/chat/chatSlice';
import { clearNotifications } from '../features/notifications/notificationSlice';
import { clearTasks } from '../features/tasks/taskSlice';
import { clearProjects } from '../features/projects/projectSlice';
import { clearCurrentWorkspace } from '../features/workspace/workspaceSlice';

/**
 * Topbar: logo left, optional centered search pill (Dashboard passes onSearch),
 * bell + avatar + logout right.
 */
export default function Navbar({ onSearch, searchPlaceholder = 'Search…' }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logoutUser());
    dispatch(clearChat());
    dispatch(clearNotifications());
    dispatch(clearTasks());
    dispatch(clearProjects());
    dispatch(clearCurrentWorkspace());
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-line bg-white/85 px-4 backdrop-blur lg:px-6">
      <Link to="/" className="shrink-0">
        <Logo />
      </Link>
      {onSearch && (
        <div className="relative mx-auto w-full max-w-md">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            aria-label="Search workspaces"
            placeholder={searchPlaceholder}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full rounded-full border border-transparent bg-canvas py-2 pl-10 pr-4 text-sm text-ink placeholder-muted/80 transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}
      <div className="ml-auto flex items-center gap-1.5">
        <HeaderActions />
        <button type="button" onClick={handleLogout} className="icon-btn" title="Log out" aria-label="Log out">
          <Icon name="logout" className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
