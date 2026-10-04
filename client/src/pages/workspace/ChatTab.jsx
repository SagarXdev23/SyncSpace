import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import Spinner from '../../components/Spinner';
import { useSocket } from '../../hooks/SocketContext';
import { getSocket } from '../../services/socket';
import {
  fetchMessages,
  sendMessage,
  selectMessages,
  selectTypingMap,
  selectOnlineUserIds,
} from '../../features/chat/chatSlice';
import { selectCurrentWorkspace } from '../../features/workspace/workspaceSlice';
import { selectUser } from '../../features/auth/authSlice';
import { normalizeMember, SOCKET_EVENTS } from '../../utils/constants';
import { formatDate, timeAgo } from '../../utils/formatDate';

const TYPING_IDLE_MS = 1500;

/** "Today" / "Yesterday" / "Oct 3, 2026" label for chat day dividers. */
function dayLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return formatDate(iso);
}

/** Real-time workspace chat: REST history + socket live delivery, typing, presence. */
export default function ChatTab() {
  const { workspaceId } = useParams();
  const dispatch = useDispatch();
  const { joinWorkspace } = useSocket();
  const user = useSelector(selectUser);
  const workspace = useSelector(selectCurrentWorkspace);
  const messages = useSelector(selectMessages(workspaceId));
  // Stable map ref from the selector; stale (>5s) and self entries filtered here.
  const typingMap = useSelector(selectTypingMap(workspaceId));
  const typingNames = useMemo(() => {
    const now = Date.now();
    return Object.entries(typingMap)
      .filter(([uid, v]) => String(uid) !== String(user?._id) && now - v.at < 5000)
      .map(([, v]) => v.name);
  }, [typingMap, user?._id]);
  const onlineIds = useSelector(selectOnlineUserIds);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const wasTyping = useRef(false);

  useEffect(() => {
    joinWorkspace(workspaceId);
    setLoading(true);
    dispatch(fetchMessages(workspaceId)).finally(() => setLoading(false));
  }, [dispatch, workspaceId, joinWorkspace]);

  // Auto-scroll on new messages.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  useEffect(
    () => () => {
      // Stop typing indicator when leaving.
      getSocket().emit(SOCKET_EVENTS.TYPING_STOP, { workspaceId });
      clearTimeout(typingTimer.current);
    },
    [workspaceId],
  );

  const setTyping = (isTyping) => {
    const socket = getSocket();
    if (isTyping && !wasTyping.current) {
      socket.emit(SOCKET_EVENTS.TYPING_START, { workspaceId });
      wasTyping.current = true;
    }
    clearTimeout(typingTimer.current);
    if (isTyping) {
      typingTimer.current = setTimeout(() => {
        socket.emit(SOCKET_EVENTS.TYPING_STOP, { workspaceId });
        wasTyping.current = false;
      }, TYPING_IDLE_MS);
    } else if (wasTyping.current) {
      socket.emit(SOCKET_EVENTS.TYPING_STOP, { workspaceId });
      wasTyping.current = false;
    }
  };

  const onSend = async (e) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setTyping(false);
    setDraft('');
    const result = await dispatch(sendMessage({ workspaceId, content }));
    setSending(false);
    if (sendMessage.rejected.match(result)) setDraft(content); // restore on failure
  };

  const members = (workspace?.members || []).map(normalizeMember);
  const senderOf = (m) => m.sender?.name || m.sender?.email || 'Unknown';

  /** Messages interleaved with day dividers — pure presentational grouping. */
  const renderMessages = () => {
    const rows = [];
    let lastDay = null;
    messages.forEach((m) => {
      const dayKey = new Date(m.createdAt).toDateString();
      if (dayKey !== lastDay) {
        lastDay = dayKey;
        rows.push(
          <div key={`day-${m._id}`} className="flex items-center gap-3 pt-1">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-body">
              {dayLabel(m.createdAt)}
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>,
        );
      }
      const mine = String(m.sender?._id || m.sender) === String(user?._id);
      rows.push(
        <div key={m._id} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
          <Avatar name={senderOf(m)} src={m.sender?.avatar} size="sm" />
          <div className={`max-w-[75%] ${mine ? 'text-right' : ''}`}>
            <p className="mb-1 text-[11px] text-body">
              {senderOf(m)} · {timeAgo(m.createdAt)}
            </p>
            <div
              className={`inline-block rounded-2xl px-3.5 py-2 text-left text-sm leading-relaxed shadow-card ${
                mine
                  ? 'bg-primary text-white'
                  : 'border border-line bg-white text-ink'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
            </div>
          </div>
        </div>,
      );
    });
    return rows;
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-3xl flex-col">
      {/* Presence strip */}
      {members.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {members.map((m) => {
            const online = onlineIds.includes(m.id);
            return (
              <span key={m.id} className="flex items-center gap-1.5" title={`${m.name}${online ? ' (online)' : ''}`}>
                <span className="relative">
                  <Avatar name={m.name} src={m.avatar} size="xs" />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                      online ? 'bg-emerald-500' : 'bg-soft/30'
                    }`}
                  />
                </span>
              </span>
            );
          })}
          <span className="ml-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-body">
            {onlineIds.length} online
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="card flex-1 overflow-y-auto p-4 sm:p-5" aria-live="polite">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner className="h-8 w-8" label="Loading messages" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg font-semibold tracking-tight text-ink">
              Nothing said yet
            </p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-body">
              Break the ice — say hello to the team.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {renderMessages()}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Typing indicator */}
      <div className="h-5 px-1 pt-1 text-xs italic text-body">
        {typingNames.length > 0 &&
          (typingNames.length === 1
            ? `${typingNames[0]} is typing…`
            : `${typingNames.slice(0, 2).join(', ')}${typingNames.length > 2 ? ` and ${typingNames.length - 2} more` : ''} are typing…`)}
      </div>

      {/* Composer */}
      <form onSubmit={onSend} className="flex gap-2">
        <input
          className="input !rounded-full !py-2.5 !pl-5 shadow-card"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setTyping(e.target.value.trim().length > 0);
          }}
          placeholder={`Message #${workspace?.name || 'workspace'}`}
          maxLength={2000}
          aria-label="Chat message"
        />
        <button
          type="submit"
          className="btn-primary !rounded-full !px-4 shrink-0"
          disabled={sending || !draft.trim()}
          aria-label="Send message"
        >
          {sending ? <Spinner className="h-4 w-4" /> : <Icon name="send" className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
