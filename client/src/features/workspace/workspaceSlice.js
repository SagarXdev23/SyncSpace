import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

const errMsg = (e, fallback) =>
  e?.response?.data?.message || e?.message || fallback;

const ok = (res) => res.data.data;

// GET /api/workspaces
export const fetchWorkspaces = createAsyncThunk(
  'workspace/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return ok(await api.get('/workspaces'));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not load workspaces'));
    }
  },
);

// GET /api/workspaces/:id
export const fetchWorkspace = createAsyncThunk(
  'workspace/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      return ok(await api.get(`/workspaces/${id}`));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not load workspace'));
    }
  },
);

// POST /api/workspaces {name}
export const createWorkspace = createAsyncThunk(
  'workspace/create',
  async ({ name, description, logoFile }, { rejectWithValue }) => {
    try {
      const form = new FormData();
      form.append('name', name);
      if (description) form.append('description', description);
      if (logoFile) form.append('logo', logoFile);
      return ok(await api.post('/workspaces', form));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not create workspace'));
    }
  },
);

// PATCH /api/workspaces/:id {name}
export const updateWorkspace = createAsyncThunk(
  'workspace/update',
  async ({ id, name }, { rejectWithValue }) => {
    try {
      return ok(await api.patch(`/workspaces/${id}`, { name }));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not update workspace'));
    }
  },
);

// DELETE /api/workspaces/:id
export const deleteWorkspace = createAsyncThunk(
  'workspace/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/workspaces/${id}`);
      return id;
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not delete workspace'));
    }
  },
);

// POST /api/workspaces/:id/members {email, role}
export const addMember = createAsyncThunk(
  'workspace/addMember',
  async ({ id, email, role }, { rejectWithValue }) => {
    try {
      return ok(await api.post(`/workspaces/${id}/members`, { email, role }));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not add member'));
    }
  },
);

// PATCH /api/workspaces/:id/members/:userId {role}
export const updateMemberRole = createAsyncThunk(
  'workspace/updateMemberRole',
  async ({ id, userId, role }, { rejectWithValue }) => {
    try {
      return ok(await api.patch(`/workspaces/${id}/members/${userId}`, { role }));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not change role'));
    }
  },
);

// DELETE /api/workspaces/:id/members/:userId
export const removeMember = createAsyncThunk(
  'workspace/removeMember',
  async ({ id, userId }, { rejectWithValue }) => {
    try {
      await api.delete(`/workspaces/${id}/members/${userId}`);
      return { id, userId };
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not remove member'));
    }
  },
);

// GET /api/workspaces/:id/activity
export const fetchActivity = createAsyncThunk(
  'workspace/fetchActivity',
  async (id, { rejectWithValue }) => {
    try {
      return { id, activity: ok(await api.get(`/workspaces/${id}/activity`)) };
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not load activity'));
    }
  },
);

const initialState = {
  list: [],
  current: null, // workspace detail incl. members
  activity: [],
  activityFor: null,
  status: 'idle',
  error: null,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    clearCurrentWorkspace(state) {
      state.current = null;
      state.activity = [];
      state.activityFor = null;
    },
    clearWorkspaceError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.list = action.payload || [];
        state.status = 'succeeded';
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchWorkspace.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(createWorkspace.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updateWorkspace.fulfilled, (state, action) => {
        const w = action.payload;
        state.list = state.list.map((x) => (String(x._id) === String(w._id) ? w : x));
        if (state.current && String(state.current._id) === String(w._id)) {
          state.current = { ...state.current, ...w };
        }
      })
      .addCase(deleteWorkspace.fulfilled, (state, action) => {
        state.list = state.list.filter((x) => String(x._id) !== String(action.payload));
        if (state.current && String(state.current._id) === String(action.payload)) {
          state.current = null;
        }
      })
      .addCase(deleteWorkspace.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Member endpoints return the updated workspace; fall back to local patch.
      .addCase(addMember.fulfilled, (state, action) => {
        if (action.payload && action.payload.members) state.current = action.payload;
      })
      .addCase(addMember.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updateMemberRole.fulfilled, (state, action) => {
        if (action.payload && action.payload.members) state.current = action.payload;
      })
      .addCase(updateMemberRole.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        const { userId } = action.payload;
        if (state.current?.members) {
          state.current.members = state.current.members.filter(
            (m) => String(m.user?._id || m.user || m.userId) !== String(userId),
          );
        }
      })
      .addCase(removeMember.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(fetchActivity.fulfilled, (state, action) => {
        state.activity = action.payload.activity || [];
        state.activityFor = action.payload.id;
      });
  },
});

export const { clearCurrentWorkspace, clearWorkspaceError } = workspaceSlice.actions;
export const selectWorkspaces = (s) => s.workspace.list;
export const selectCurrentWorkspace = (s) => s.workspace.current;
export const selectWorkspaceError = (s) => s.workspace.error;
export const selectActivity = (s) => s.workspace.activity;
export default workspaceSlice.reducer;
