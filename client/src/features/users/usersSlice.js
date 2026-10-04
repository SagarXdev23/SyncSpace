import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

const errMsg = (e, fallback) =>
  e?.response?.data?.message || e?.message || fallback;

const ok = (res) => res.data.data;

// GET /api/users/stats -> { total, admins, members, guests }
export const fetchUserStats = createAsyncThunk(
  'users/fetchUserStats',
  async (_, { rejectWithValue }) => {
    try {
      return ok(await api.get('/users/stats'));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not load user stats'));
    }
  },
);

// GET /api/users?search=&role=&page=
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async ({ search = '', role = '', page = 1 } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      if (page > 1) params.set('page', page);
      const res = await api.get(`/users?${params.toString()}`);
      return { users: res.data.data, pagination: res.data.pagination };
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not load users'));
    }
  },
);

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    list: [],
    stats: null,
    pagination: null,
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.stats = action.payload || null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.list = action.payload.users || [];
        state.pagination = action.payload.pagination || null;
        state.status = 'succeeded';
      })
      .addCase(fetchUsers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const selectUsers = (s) => s.users.list;
export const selectUserStats = (s) => s.users.stats;
export const selectUsersStatus = (s) => s.users.status;
export default usersSlice.reducer;
