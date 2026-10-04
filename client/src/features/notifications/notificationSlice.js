import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

const errMsg = (e, fallback) =>
  e?.response?.data?.message || e?.message || fallback;

const ok = (res) => res.data.data;

// GET /api/notifications
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return ok(await api.get('/notifications'));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not load notifications'));
    }
  },
);

// PATCH /api/notifications/:id {read:true}
export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id, { rejectWithValue }) => {
    try {
      return ok(await api.patch(`/notifications/${id}`, { read: true }));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not mark notification read'));
    }
  },
);

// PATCH /api/notifications/read-all
export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await api.patch('/notifications/read-all');
      return true;
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not mark all notifications read'));
    }
  },
);

const initialState = {
  items: [],
  unread: 0,
  status: 'idle',
  error: null,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearNotifications(state) {
      state.items = [];
      state.unread = 0;
    },
    /** Live socket delivery: prepend, dedupe by _id. */
    notificationReceived(state, action) {
      const n = action.payload;
      if (!n) return;
      if (state.items.some((x) => String(x._id) === String(n._id))) return;
      state.items.unshift(n);
      if (!n.read) state.unread += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        const items = action.payload || [];
        state.items = items;
        state.unread = items.filter((n) => !n.read).length;
        state.status = 'succeeded';
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        // Backend returns the updated notification; fall back to the requested id.
        const updated = action.payload || {};
        const id = String(updated._id || action.meta.arg);
        const idx = state.items.findIndex((n) => String(n._id) === id);
        if (idx >= 0) {
          if (!state.items[idx].read) state.unread = Math.max(0, state.unread - 1);
          state.items[idx] = { ...state.items[idx], ...updated, read: true };
        }
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items = state.items.map((n) => ({ ...n, read: true }));
        state.unread = 0;
      });
  },
});

export const { clearNotifications, notificationReceived } = notificationSlice.actions;
export const selectNotifications = (s) => s.notifications.items;
export const selectUnreadCount = (s) => s.notifications.unread;
export default notificationSlice.reducer;
