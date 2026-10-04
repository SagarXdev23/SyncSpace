import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

const errMsg = (e, fallback) =>
  e?.response?.data?.message || e?.message || fallback;

const ok = (res) => res.data.data;

// GET /api/stats -> { workspaces, projects, tasks, members }
export const fetchStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      return ok(await api.get('/stats'));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not load stats'));
    }
  },
);

// GET /api/stats/admin -> { totalUsers, activeProjects, totalTasks, filesStored }
export const fetchAdminStats = createAsyncThunk(
  'dashboard/fetchAdminStats',
  async (_, { rejectWithValue }) => {
    try {
      return ok(await api.get('/stats/admin'));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not load admin stats'));
    }
  },
);

// GET /api/projects -> recent-first, workspace{name} populated
export const fetchRecentProjects = createAsyncThunk(
  'dashboard/fetchRecentProjects',
  async (_, { rejectWithValue }) => {
    try {
      return ok(await api.get('/projects'));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not load recent projects'));
    }
  },
);

// GET /api/activity/recent?limit=N
export const fetchRecentActivity = createAsyncThunk(
  'dashboard/fetchRecentActivity',
  async (limit = 5, { rejectWithValue }) => {
    try {
      return ok(await api.get(`/activity/recent?limit=${limit}`));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not load recent activity'));
    }
  },
);

const initialState = {
  stats: null,
  recentProjects: [],
  recentActivity: [],
  status: 'idle',
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboard(state) {
      state.stats = null;
      state.recentProjects = [];
      state.recentActivity = [];
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload || null;
      })
      .addCase(fetchAdminStats.fulfilled, (state, action) => {
        state.adminStats = action.payload || null;
      })
      .addCase(fetchRecentProjects.fulfilled, (state, action) => {
        state.recentProjects = action.payload || [];
      })
      .addCase(fetchRecentActivity.fulfilled, (state, action) => {
        state.recentActivity = action.payload || [];
      })
      .addMatcher(
        (a) => a.type.startsWith('dashboard/') && a.type.endsWith('/rejected'),
        (state, action) => {
          state.error = action.payload;
        },
      );
  },
});

export const { clearDashboard } = dashboardSlice.actions;
export const selectStats = (s) => s.dashboard.stats;
export const selectAdminStats = (s) => s.dashboard.adminStats;
export const selectRecentProjects = (s) => s.dashboard.recentProjects;
export const selectRecentActivity = (s) => s.dashboard.recentActivity;
export default dashboardSlice.reducer;
