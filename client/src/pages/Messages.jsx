import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Shell from '../components/Shell';
import Icon from '../components/Icon';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import Avatar from '../components/Avatar';
import Spinner from '../components/Spinner';
import { toast } from '../components/Toast';
import api from '../services/api';
import { timeAgo } from '../utils/formatDate';
import {
  fetchWorkspaces,
  selectWorkspaces,
} from '../features/workspace/workspaceSlice';
import { selectUser } from '../features/auth/authSlice';

const ok = (res) => res?.data?.data ?? [];

const CHANNEL_COLORS = [
  'bg-[#7C6FF7]',
  'bg-[#EC4899]',
  'bg-[#F59E0B]',
  'bg-[#3B82F6]',
  'bg-[#22C55E]',
  'bg-[#8B7CFF]',
];

function colorFor(name, i = 0) {
  if (i < CHANNEL_COLORS.length && name) {
    let h = 0;
    const str = String(name);
    for (let j = 0; j < str.length; j++) h = (h * 31 + str.charCodeAt(j)) >>> 0;
    return CHANNEL_COLORS[h % CHANNEL_COLORS.length];
  }
  return CHANNEL_COLORS[i % CHANNEL_COLORS.length];
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/** Team Chat — channel list + thread, per mockup screen 14. */
export default function Messages() {
  const dispatch = useDispatch();
  const workspaces = useSelector(selectWorkspaces);
  const user = useSelector(selectUser);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    dispatch(fetchWorkspaces()).finally(() => setLoading(false));
  }, [dispatch]);

  useEffect(() => {
    if (!selectedId && workspaces.length > 0) setSelectedId(workspaces[0]._id);
  }, [workspaces, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoading(true);
    api
      .get(`/messages/${selectedId}`)
      .then((res) => {
        if (!cancelled) setMessages(ok(res));
      })
      .catch(() => {
        if (!cancelled) toast('Could not load messages', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = false;
    };
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const selected = workspaces.find((w) => String(w._id) === String(selectedId));

  const send = async (e) => {
    e?.preventDefault();
    const content = draft.trim();
    if (!content || !selectedId || sending) return;
    setSending(true);
    try {
      const res = await api.post('/messages/', { workspaceId: selectedId, content });
      const saved = res?.data?.data;
      if (saved) setMessages((m) => [...m, saved]);
      setDraft('');
    } catch (err) {
      toast(err?.response?.data?.message || 'Could not send message', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Shell>
      <div className="px-4 py-6 lg:px-8">
        <h1 className="mb-5 text-[22px] font-bold tracking-tight text-ink">All Messages</h1>
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Channel list */}
          <div className="card w-full shrink-0 p-3 lg:w-72">
            {loading && workspaces.length === 0 ? (
              <div className="flex justify-center py-10">
                <Spinner className="h-6 w-6" label="Loading channels" />
              </div>
            ) : workspaces.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-body">No channels yet.</p>
            ) : (
              <ul className="space-y-1">
                {workspaces.map((w, i) => {
                  const active = String(w._id) === String(selectedId);
                  const memberCount = w.members?.length || 0;
                  return (
                    <li key={w._id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(w._id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          active ? 'bg-canvas' : 'hover:bg-canvas/60'
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${colorFor(w.name, i)}`}
                        >
                          <Icon name="hash" className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink">
                            {w.name}
                          </span>
                          <span className="block text-xs text-muted">
                            {memberCount} {memberCount === 1 ? 'member' : 'members'}
                          </span>
                        </span>
                        {active && (
                          <Icon name="chevronDown" className="h-4 w-4 shrink-0 text-muted" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Thread */}
          <div className="card flex min-h-[28rem] flex-1 flex-col overflow-hidden">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-8">
                <p className="text-sm text-body">Select a channel to view messages.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-line px-5 py-4">
                  <Avatar name={selected.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold tracking-tight text-ink">
                      {selected.name}
                    </p>
                    <p className="text-xs text-muted">
                      {selected.members?.length || 0} members online
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Create workspace channel"
                    title="Create workspace channel"
                    onClick={() => setWorkspaceModalOpen(true)}
                    className="rounded-lg p-1.5 text-muted transition hover:bg-canvas hover:text-ink"
                  >
                    <Icon name="plus" className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                  {loading ? (
                    <div className="flex justify-center py-10">
                      <Spinner className="h-6 w-6" label="Loading messages" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="py-10 text-center text-sm text-body">
                      No messages yet. Say hello.
                    </p>
                  ) : (
                    messages.map((m) => (
                      <div key={m._id} className="flex gap-3">
                        <Avatar
                          name={m.sender?.name || 'Unknown'}
                          src={m.sender?.avatar}
                          size="md"
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-baseline gap-2">
                            <span className="text-sm font-bold text-ink">
                              {String(m.sender?._id) === String(user?._id)
                                ? 'You'
                                : m.sender?.name || 'Unknown'}
                            </span>
                            <span className="text-[11px] text-muted">
                              {formatTime(m.createdAt)}
                            </span>
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-ink">
                            {m.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>

                <form
                  onSubmit={send}
                  className="flex items-center gap-2 border-t border-line px-4 py-3"
                >
                  <button
                    type="button"
                    aria-label="Add emoji"
                    className="rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
                  >
                    <Icon name="smile" className="h-5 w-5" />
                  </button>
                  <input
                    className="input flex-1 !rounded-xl"
                    placeholder="Type a message..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={2000}
                    aria-label="Type a message"
                  />
                  <button
                    type="submit"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary-dark disabled:opacity-40"
                    disabled={sending || !draft.trim()}
                    aria-label="Send message"
                  >
                    <Icon name="send" className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
      {workspaceModalOpen && (
        <CreateWorkspaceModal
          onClose={() => setWorkspaceModalOpen(false)}
          onCreated={(workspace) => {
            if (workspace?._id) setSelectedId(workspace._id);
          }}
        />
      )}
    </Shell>
  );
}
