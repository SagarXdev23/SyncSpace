import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getSocket, connectSocket, disconnectSocket } from '../services/socket';
import { messageReceived, typingUpdated, presenceUpdated } from '../features/chat/chatSlice';
import { taskUpsert, taskRemoved, commentUpsert } from '../features/tasks/taskSlice';
import { notificationReceived } from '../features/notifications/notificationSlice';
import { SOCKET_EVENTS } from '../utils/constants';

/**
 * SocketProvider
 *
 * - Opens one socket connection (handshake auth { token }) when the user is
 *   authenticated, closes it on logout/unmount.
 * - Registers global listeners ONCE and routes server events into Redux with
 *   targeted updates (no full-list refetches):
 *     message:new        -> chat slice (deduped by _id)
 *     typing:update      -> typing indicators per workspace
 *     presence:update    -> online user ids
 *     task:*             -> upsert/remove task in the board
 *     comment:added      -> append comment in the task modal
 *     notification:new   -> prepend to notifications
 * - Exposes joinWorkspace / leaveWorkspace for pages that need a room.
 */
const SocketContext = createContext(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);
  const joinedRef = useRef(new Set());

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return undefined;
    }

    const socket = connectSocket();

    const onMessageNew = (payload) => {
      // Server may send the message bare or wrapped with workspaceId.
      const message = payload?.message || payload;
      const workspaceId =
        payload?.workspaceId || message?.workspace?._id || message?.workspace;
      dispatch(messageReceived({ workspaceId, message }));
    };
    const onTyping = (payload) =>
      dispatch(typingUpdated({ ...payload, workspaceId: payload?.workspaceId }));
    const onPresence = (payload) => dispatch(presenceUpdated(payload));
    const onTaskUpsert = (payload) => dispatch(taskUpsert(payload?.task || payload));
    const onTaskRemoved = (payload) => dispatch(taskRemoved(payload?.task || payload));
    const onCommentAdded = (payload) => dispatch(commentUpsert(payload?.comment || payload));
    const onNotification = (payload) =>
      dispatch(notificationReceived(payload?.notification || payload));

    socket.on(SOCKET_EVENTS.MESSAGE_NEW, onMessageNew);
    socket.on(SOCKET_EVENTS.TYPING_UPDATE, onTyping);
    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, onPresence);
    socket.on(SOCKET_EVENTS.TASK_CREATED, onTaskUpsert);
    socket.on(SOCKET_EVENTS.TASK_UPDATED, onTaskUpsert);
    socket.on(SOCKET_EVENTS.TASK_ASSIGNED, onTaskUpsert);
    socket.on(SOCKET_EVENTS.TASK_STATUS_CHANGED, onTaskUpsert);
    socket.on(SOCKET_EVENTS.TASK_DELETED, onTaskRemoved);
    socket.on(SOCKET_EVENTS.COMMENT_ADDED, onCommentAdded);
    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, onNotification);

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_NEW, onMessageNew);
      socket.off(SOCKET_EVENTS.TYPING_UPDATE, onTyping);
      socket.off(SOCKET_EVENTS.PRESENCE_UPDATE, onPresence);
      socket.off(SOCKET_EVENTS.TASK_CREATED, onTaskUpsert);
      socket.off(SOCKET_EVENTS.TASK_UPDATED, onTaskUpsert);
      socket.off(SOCKET_EVENTS.TASK_ASSIGNED, onTaskUpsert);
      socket.off(SOCKET_EVENTS.TASK_STATUS_CHANGED, onTaskUpsert);
      socket.off(SOCKET_EVENTS.TASK_DELETED, onTaskRemoved);
      socket.off(SOCKET_EVENTS.COMMENT_ADDED, onCommentAdded);
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, onNotification);
      joinedRef.current.clear();
    };
  }, [token, dispatch]);

  const joinWorkspace = useCallback((workspaceId) => {
    if (!workspaceId) return;
    const socket = getSocket();
    if (!joinedRef.current.has(String(workspaceId))) {
      socket.emit(SOCKET_EVENTS.JOIN_WORKSPACE, { workspaceId });
      joinedRef.current.add(String(workspaceId));
    }
  }, []);

  const leaveWorkspace = useCallback((workspaceId) => {
    if (!workspaceId) return;
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.LEAVE_WORKSPACE, { workspaceId });
    joinedRef.current.delete(String(workspaceId));
  }, []);

  return (
    <SocketContext.Provider value={{ joinWorkspace, leaveWorkspace, getSocket }}>
      {children}
    </SocketContext.Provider>
  );
}
