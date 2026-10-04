import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

const errMsg = (e, fallback) =>
  e?.response?.data?.message || e?.message || fallback;

const ok = (res) => res.data.data;

// GET /api/messages/:workspaceId
export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (workspaceId, { rejectWithValue }) => {
    try {
      return { workspaceId, messages: ok(await api.get(`/messages/${workspaceId}`)) };
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not load messages'));
    }
  },
);

// POST /api/messages {workspaceId, content}
// The server persists and broadcasts 'message:new' to the room; the echo is
// deduped by _id in messageReceived, so every client (incl. the sender) sees it.
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ workspaceId, content }, { rejectWithValue }) => {
    try {
      return { workspaceId, message: ok(await api.post('/messages', { workspaceId, content })) };
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not send message'));
    }
  },
);

const appendMessage = (state, workspaceId, message) => {
  if (!message || !workspaceId) return;
  const key = String(workspaceId);
  const list = state.byWorkspace[key] || [];
  if (list.some((m) => String(m._id) === String(message._id))) return; // socket echo / retry dupe
  state.byWorkspace[key] = [...list, message];
};

const initialState = {
  byWorkspace: {}, // workspaceId -> [message]
  typingByWorkspace: {}, // workspaceId -> { userId: { name, isTyping, at } }
  onlineUserIds: [],
  status: 'idle',
  error: null,
};

// Shared empty references so selectors never return a fresh object on every
// call (a new reference each render would loop useSelector re-renders).
const EMPTY_ARRAY = [];
const EMPTY_OBJ = {};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearChat(state) {
      state.byWorkspace = {};
      state.typingByWorkspace = {};
      state.onlineUserIds = [];
    },
    messageReceived(state, action) {
      const { workspaceId, message } = action.payload || {};
      appendMessage(state, workspaceId, message);
    },
    typingUpdated(state, action) {
      const { workspaceId, userId, name, isTyping } = action.payload || {};
      if (!workspaceId || !userId) return;
      const key = String(workspaceId);
      const current = { ...(state.typingByWorkspace[key] || {}) };
      if (isTyping) current[String(userId)] = { name, isTyping: true, at: Date.now() };
      else delete current[String(userId)];
      state.typingByWorkspace[key] = current;
    },
    presenceUpdated(state, action) {
      // Server sends { workspaceId, online: [{userId, name, lastSeen}] };
      // also accept the { onlineUserIds: [...] } shape.
      const p = action.payload || {};
      const ids = p.onlineUserIds || (p.online || []).map((u) => u.userId);
      state.onlineUserIds = (ids || []).map(String);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.byWorkspace[String(action.payload.workspaceId)] = action.payload.messages || [];
        state.status = 'succeeded';
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        appendMessage(state, action.payload.workspaceId, action.payload.message);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearChat, messageReceived, typingUpdated, presenceUpdated } = chatSlice.actions;

export const selectMessages = (workspaceId) => (s) =>
  s.chat.byWorkspace[String(workspaceId)] || EMPTY_ARRAY;

/** Raw typing map for a workspace (stable ref); stale/self filtering happens in the component. */
export const selectTypingMap = (workspaceId) => (s) =>
  s.chat.typingByWorkspace[String(workspaceId)] || EMPTY_OBJ;

export const selectOnlineUserIds = (s) => s.chat.onlineUserIds;
export default chatSlice.reducer;
