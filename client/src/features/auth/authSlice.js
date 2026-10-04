import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api, { getToken, setToken, clearToken } from '../../services/api';
import { resetSocket } from '../../services/socket';

const errMsg = (e, fallback) =>
  e?.response?.data?.message || e?.message || fallback;

// POST /api/auth/register {name,email,password} -> { success, message, data: { accessToken, user } }
export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/register', { name, email, password });
      setToken(res.data.data.accessToken);
      return res.data.data;
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Registration failed'));
    }
  },
);

// POST /api/auth/login {email,password} -> { accessToken, user }
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      setToken(res.data.data.accessToken);
      return res.data.data;
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Login failed'));
    }
  },
);

// GET /api/auth/me -> { user }  (restores the session on app boot)
export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/auth/me');
    return res.data.data.user;
  } catch (e) {
    return rejectWithValue(errMsg(e, 'Session expired'));
  }
});

// PUT /api/auth/profile — update name, bio, avatar.
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ name, bio, avatar }, { rejectWithValue }) => {
    try {
      const res = await api.put('/auth/profile', { name, bio, avatar });
      return res.data.data.user;
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not update profile'));
    }
  },
);

// POST /api/auth/profile/avatar — upload a profile photo and update auth state.
export const uploadProfileAvatar = createAsyncThunk(
  'auth/uploadProfileAvatar',
  async (file, { rejectWithValue }) => {
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await api.post('/auth/profile/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data.user;
    } catch (e) {
      return rejectWithValue(errMsg(e, 'Could not upload profile photo'));
    }
  },
);

// POST /api/auth/logout — always clears local state even if the call fails.
export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    /* logout is best-effort; local cleanup still runs */
  } finally {
    clearToken();
    resetSocket();
  }
});

const initialState = {
  user: null,
  token: getToken(),
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Synchronous logout used by the api 401 interceptor path. */
    logoutNow(state) {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => {
      state.status = 'loading';
      state.error = null;
    };
    builder
      .addCase(registerUser.pending, pending)
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(loginUser.pending, pending)
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchMe.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(uploadProfileAvatar.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.user = null;
        state.token = null;
        clearToken(); // drop the dead token from storage too
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.status = 'idle';
        state.error = null;
      });
  },
});

export const { logoutNow, clearAuthError } = authSlice.actions;
export const selectUser = (s) => s.auth.user;
export const selectIsAuthenticated = (s) => Boolean(s.auth.token && s.auth.user);
export const selectAuthStatus = (s) => s.auth.status;
export const selectAuthError = (s) => s.auth.error;
export default authSlice.reducer;
