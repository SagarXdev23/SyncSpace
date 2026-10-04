import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Icon from './Icon';
import Avatar from './Avatar';
import Spinner from './Spinner';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  selectNotifications,
  selectUnreadCount,
} from '../features/notifications/notificationSlice';
import { logoutUser, selectUser } from '../features/auth/authSlice';
import { clearChat } from '../features/chat/chatSlice';
import { clearNotifications } from '../features/notifications/notificationSlice';
import { clearTasks } from '../features/tasks/taskSlice';
import { clearProjects } from '../features/projects/projectSlice';
import { clearCurrentWorkspace } from '../features/workspace/workspaceSlice';
import { timeAgo } from '../utils/formatDate';

const NOTIF_DOT = {
  task: 'bg-primary',
  mention: 'bg-[#C47B12]',
  comment: 'bg-[#2B6CB0]',
  file: 'bg-[#1F9D57]',
  member: 'bg-[#8B7CFF]',
  default: 'bg-muted',
};

function dotFor(type = '') {
  const t = type.toLowerCase();
  if (t.includes('assign')) return NOTIF_DOT.task;
  if (t.includes('mention')) return NOTIF_DOT.mention;
  if (t.includes('comment')) return NOTIF_DOT.comment;
  if (t.includes('file')) return NOTIF_DOT.file;
  if (t.includes('member') || t.includes('invit')) return NOTIF_DOT.member;
  return NOTIF_DOT.default;
}

export function NotificationBell() {
  const dispatch = useDispatch();
  const items = useSelector(selectNotifications);
  const unread = useSelector(selectUnreadCount);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('all'); // all | unread | mentions
  const ref = useRef(null);

  useEffect(() => {
    setLoading(true);
    dispatch(fetchNotifications()).finally(() => setLoading(false));
  }, [dispatch]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const openOne = (n) => {
    if (!n.read) dispatch(markNotificationRead(n._id));
  };

  const filtered = items.filter((n) => {
    if (tab === 'unread') return !n.read;
    if (tab === 'mentions') return (n.type || '').toLowerCase().includes('mention');
    return true;
  });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="icon-btn relative"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="bell" className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-white shadow-pop sm:w-96">
          <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
            <span className="text-[15px] font-semibold text-ink">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs font-semibold text-primary hover:text-primary-dark"
                onClick={() => dispatch(markAllNotificationsRead())}
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="flex gap-1 px-4 pb-2">
            {[
              ['all', 'All'],
              ['unread', 'Unread'],
              ['mentions', 'Mentions'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  tab === id ? 'bg-primary-soft text-primary-dark' : 'text-body hover:bg-canvas'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="max-h-80 overflow-y-auto border-t border-line">
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-body">
                {tab === 'all'
                  ? 'All quiet. Task assignments and mentions will land here.'
                  : 'Nothing here yet.'}
              </p>
            ) : (
              filtered.map((n) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => openOne(n)}
                  className={`flex w-full items-start gap-3 border-b border-line/70 px-4 py-3 text-left transition last:border-0 hover:bg-canvas/60 ${
                    n.read ? 'opacity-60' : ''
                  }`}
                >
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotFor(n.type)}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] leading-snug text-ink">{n.message}</span>
                    <span className="mt-1 block text-[11px] text-muted">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function UserChip() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const handleLogout = async () => {
    setOpen(false);
    await dispatch(logoutUser());
    dispatch(clearChat());
    dispatch(clearNotifications());
    dispatch(clearTasks());
    dispatch(clearProjects());
    dispatch(clearCurrentWorkspace());
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-canvas"
        title="Account"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user?.name} src={user?.avatar} size="sm" />
        <span className="hidden max-w-32 truncate text-sm font-semibold text-ink sm:block">
          {user?.name}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-line bg-white shadow-lg"
        >
          <Link
            to="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-canvas"
          >
            <Icon name="user" className="h-4 w-4 text-muted" />
            Profile
          </Link>
          <Link
            to="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-canvas"
          >
            <Icon name="settings" className="h-4 w-4 text-muted" />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-left text-sm font-medium text-[#D63A3A] transition hover:bg-canvas"
          >
            <Icon name="logout" className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

/** Bell + profile chip for page headers (single source of truth). */
export default function HeaderActions() {
  return (
    <div className="flex items-center gap-1.5">
      <NotificationBell />
      <UserChip />
    </div>
  );
}
