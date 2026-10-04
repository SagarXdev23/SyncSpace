import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import Shell from '../components/Shell';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  selectNotifications,
  selectUnreadCount,
} from '../features/notifications/notificationSlice';
import { timeAgo } from '../utils/formatDate';

const TABS = ['All', 'Unread', 'Mentions'];

function iconFor(type = '') {
  const t = String(type).toLowerCase();
  if (t.includes('assign')) return { icon: 'user', bg: 'bg-[#F59E0B]' };
  if (t.includes('mention')) return { icon: 'atSign', bg: 'bg-[#7C6FF7]' };
  if (t.includes('comment')) return { icon: 'chat', bg: 'bg-[#3B82F6]' };
  if (t.includes('file')) return { icon: 'upload', bg: 'bg-[#3B82F6]' };
  if (t.includes('task') && t.includes('complet')) return { icon: 'check', bg: 'bg-[#22C55E]' };
  if (t.includes('task')) return { icon: 'check', bg: 'bg-[#22C55E]' };
  if (t.includes('member') || t.includes('invit')) return { icon: 'users', bg: 'bg-[#7C6FF7]' };
  if (t.includes('project')) return { icon: 'user', bg: 'bg-[#F59E0B]' };
  return { icon: 'bell', bg: 'bg-[#7C6FF7]' };
}

export default function Notifications() {
  const dispatch = useDispatch();
  const items = useSelector(selectNotifications) || [];
  const unread = useSelector(selectUnreadCount) || 0;
  const [tab, setTab] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    dispatch(fetchNotifications()).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [dispatch]);

  const filtered = items.filter((n) => {
    if (tab === 'Unread') return !n.read;
    if (tab === 'Mentions')
      return String(n.type || '').toLowerCase().includes('mention');
    return true;
  });

  const openOne = (n) => {
    if (!n.read) dispatch(markNotificationRead(n._id));
  };

  return (
    <Shell>
      <div className="px-4 py-6 lg:px-8">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[22px] font-bold tracking-tight text-ink">Notifications</h1>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => dispatch(markAllNotificationsRead())}
              className="text-[13px] font-semibold text-primary hover:text-primary-dark"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-line">
          <div className="flex gap-6">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`relative pb-3 text-[13.5px] font-semibold transition ${
                  tab === t ? 'text-primary' : 'text-body hover:text-ink'
                }`}
              >
                {t}
                {tab === t && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8" label="Loading notifications" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon="bell"
              title={tab === 'All' ? 'No notifications' : 'Nothing here'}
              hint="Task assignments and mentions will land here."
            />
          </div>
        ) : (
          <div className="card mt-4 divide-y divide-line/70 p-2">
            {filtered.map((n) => {
              const { icon, bg } = iconFor(n.type);
              return (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => openOne(n)}
                  className="flex w-full items-center gap-3 px-3 py-3.5 text-left transition hover:bg-canvas/60"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${bg}`}
                  >
                    <Icon name={icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] text-ink">
                      {n.message}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                  {!n.read && (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
                      title="Unread"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-center text-[13px] text-body">
          Want the full history?{' '}
          <Link to="/activity" className="font-semibold text-primary hover:text-primary-dark">
            View activity feed
          </Link>
        </p>
      </div>
    </Shell>
  );
}
