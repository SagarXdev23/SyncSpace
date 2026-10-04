import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

const errMsg = (e, fallback) =>
  e?.response?.data?.message || e?.message || fallback;

const ok = (res) => res.data.data;

// ---- Tasks ---------------------------------------------------------------
// GET /api/tasks/:projectId
export const fetchTasks = createAsyncThunk(
  'tasks/fetchByProject',
  async (projectId, { rejectWithValue }) => {
    try {
      return { projectId, tasks: ok(await api.get(`/tasks/${projectId}`)) };
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not load tasks'));
    }
  },
);

// POST /api/tasks {projectId,title,description,status,priority,assignedTo,dueDate}
export const createTask = createAsyncThunk(
  'tasks/create',
  async (payload, { rejectWithValue }) => {
    try {
      return ok(await api.post('/tasks', payload));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not create task'));
    }
  },
);

// PATCH /api/tasks/:id
export const updateTask = createAsyncThunk(
  'tasks/update',
  async ({ id, patch }, { rejectWithValue }) => {
    try {
      return ok(await api.patch(`/tasks/${id}`, patch));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not update task'));
    }
  },
);

// DELETE /api/tasks/:id
export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/tasks/${id}`);
      return id;
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not delete task'));
    }
  },
);

// ---- Comments ------------------------------------------------------------
// GET /api/comments/:taskId
export const fetchComments = createAsyncThunk(
  'tasks/fetchComments',
  async (taskId, { rejectWithValue }) => {
    try {
      return { taskId, comments: ok(await api.get(`/comments/${taskId}`)) };
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not load comments'));
    }
  },
);

// POST /api/comments {taskId, content}
export const addComment = createAsyncThunk(
  'tasks/addComment',
  async ({ taskId, content }, { rejectWithValue }) => {
    try {
      return ok(await api.post('/comments', { taskId, content }));
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not add comment'));
    }
  },
);

// PATCH /api/comments/:id
export const updateComment = createAsyncThunk(
  'tasks/updateComment',
  async ({ id, taskId, content }, { rejectWithValue }) => {
    try {
      const comment = ok(await api.patch(`/comments/${id}`, { content }));
      return { taskId, comment };
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not update comment'));
    }
  },
);

// DELETE /api/comments/:id
export const deleteComment = createAsyncThunk(
  'tasks/deleteComment',
  async ({ id, taskId }, { rejectWithValue }) => {
    try {
      await api.delete(`/comments/${id}`);
      return { id, taskId };
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not delete comment'));
    }
  },
);

const upsertTask = (state, task) => {
  const i = state.items.findIndex((t) => String(t._id) === String(task._id));
  if (i >= 0) state.items[i] = { ...state.items[i], ...task };
  else state.items.push(task);
};

const initialState = {
  items: [],
  projectId: null,
  status: 'idle',
  error: null,
  commentsByTask: {}, // taskId -> [comment]
  selectedTaskId: null,
};

// Shared empty reference so the selector never returns a fresh array per call.
const EMPTY_COMMENTS = [];

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearTasks(state) {
      state.items = [];
      state.projectId = null;
      state.commentsByTask = {};
      state.selectedTaskId = null;
      state.error = null;
    },
    clearTaskError(state) {
      state.error = null;
    },
    setSelectedTaskId(state, action) {
      state.selectedTaskId = action.payload;
    },
    /** Optimistic status change (kanban drag). Reverted by the caller on failure. */
    taskStatusOptimistic(state, action) {
      const { id, status } = action.payload;
      const t = state.items.find((x) => String(x._id) === String(id));
      if (t) t.status = status;
    },
    /** Targeted socket updates — no full-list refetch. */
    taskUpsert(state, action) {
      if (action.payload) upsertTask(state, action.payload);
    },
    taskRemoved(state, action) {
      const id = action.payload?._id || action.payload;
      state.items = state.items.filter((t) => String(t._id) !== String(id));
    },
    commentUpsert(state, action) {
      const comment = action.payload;
      if (!comment) return;
      const taskId = String(comment.task?._id || comment.task);
      const list = state.commentsByTask[taskId] || [];
      const i = list.findIndex((c) => String(c._id) === String(comment._id));
      if (i >= 0) list[i] = comment;
      else list.push(comment);
      state.commentsByTask[taskId] = list;
    },
    commentRemoved(state, action) {
      const { id, taskId } = action.payload || {};
      if (!taskId) return;
      state.commentsByTask[String(taskId)] = (state.commentsByTask[String(taskId)] || []).filter(
        (c) => String(c._id) !== String(id),
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.tasks || [];
        state.projectId = action.payload.projectId;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        upsertTask(state, action.payload);
      })
      .addCase(createTask.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        upsertTask(state, action.payload);
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => String(t._id) !== String(action.payload));
        if (String(state.selectedTaskId) === String(action.payload)) state.selectedTaskId = null;
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.commentsByTask[String(action.payload.taskId)] = action.payload.comments || [];
      })
      .addCase(addComment.fulfilled, (state, action) => {
        const comment = action.payload;
        const taskId = String(comment.task?._id || comment.task);
        const list = state.commentsByTask[taskId] || [];
        if (!list.some((c) => String(c._id) === String(comment._id))) list.push(comment);
        state.commentsByTask[taskId] = list;
      })
      .addCase(addComment.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updateComment.fulfilled, (state, action) => {
        const { taskId, comment } = action.payload;
        const key = String(taskId);
        state.commentsByTask[key] = (state.commentsByTask[key] || []).map((c) =>
          String(c._id) === String(comment._id) ? comment : c,
        );
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { id, taskId } = action.payload;
        const key = String(taskId);
        state.commentsByTask[key] = (state.commentsByTask[key] || []).filter(
          (c) => String(c._id) !== String(id),
        );
      });
  },
});

export const {
  clearTasks,
  clearTaskError,
  setSelectedTaskId,
  taskStatusOptimistic,
  taskUpsert,
  taskRemoved,
  commentUpsert,
  commentRemoved,
} = taskSlice.actions;

export const selectTasks = (s) => s.tasks.items;
export const selectTaskById = (id) => (s) => s.tasks.items.find((t) => String(t._id) === String(id));
export const selectCommentsForTask = (taskId) => (s) =>
  s.tasks.commentsByTask[String(taskId)] || EMPTY_COMMENTS;
export const selectSelectedTask = (s) =>
  s.tasks.items.find((t) => String(t._id) === String(s.tasks.selectedTaskId)) || null;
export const selectTaskError = (s) => s.tasks.error;
export default taskSlice.reducer;
