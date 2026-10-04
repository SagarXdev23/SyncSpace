import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

const errMsg = (e, fallback) =>
  e?.response?.data?.message || e?.message || fallback;

const ok = (res) => res.data.data;

// GET /api/projects/:workspaceId
export const fetchProjects = createAsyncThunk(
  'projects/fetchByWorkspace',
  async (workspaceId, { rejectWithValue }) => {
    try {
      return { workspaceId, projects: ok(await api.get(`/projects/${workspaceId}`)) };
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not load projects'));
    }
  },
);

// GET /api/projects/:id
export const fetchProject = createAsyncThunk(
  'projects/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      return ok(await api.get(`/projects/${id}`));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not load project'));
    }
  },
);

// POST /api/projects {workspaceId, name, description}
export const createProject = createAsyncThunk(
  'projects/create',
  async ({ workspaceId, name, description }, { rejectWithValue }) => {
    try {
      return ok(await api.post('/projects', { workspaceId, name, description }));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not create project'));
    }
  },
);

// PATCH /api/projects/:id
export const updateProject = createAsyncThunk(
  'projects/update',
  async ({ id, ...patch }, { rejectWithValue }) => {
    try {
      return ok(await api.patch(`/projects/${id}`, patch));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not update project'));
    }
  },
);

// DELETE /api/projects/:id
export const deleteProject = createAsyncThunk(
  'projects/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/projects/${id}`);
      return id;
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not delete project'));
    }
  },
);

const initialState = {
  list: [],
  workspaceId: null,
  current: null,
  status: 'idle',
  error: null,
};

const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    clearProjects(state) {
      state.list = [];
      state.workspaceId = null;
      state.current = null;
      state.error = null;
    },
    clearProjectError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload.projects || [];
        state.workspaceId = action.payload.workspaceId;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(createProject.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const p = action.payload;
        state.list = state.list.map((x) => (String(x._id) === String(p._id) ? p : x));
        if (state.current && String(state.current._id) === String(p._id)) state.current = p;
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.list = state.list.filter((x) => String(x._id) !== String(action.payload));
        if (state.current && String(state.current._id) === String(action.payload)) {
          state.current = null;
        }
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearProjects, clearProjectError } = projectSlice.actions;
export const selectProjects = (s) => s.projects.list;
export const selectCurrentProject = (s) => s.projects.current;
export const selectProjectError = (s) => s.projects.error;
export default projectSlice.reducer;
