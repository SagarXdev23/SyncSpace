import { configureStore } from '@reduxjs/toolkit';
import authReducer, { logoutNow } from './features/auth/authSlice';
import workspaceReducer from './features/workspace/workspaceSlice';
import projectReducer from './features/projects/projectSlice';
import taskReducer from './features/tasks/taskSlice';
import chatReducer from './features/chat/chatSlice';
import notificationReducer from './features/notifications/notificationSlice';
import dashboardReducer from './features/dashboard/dashboardSlice';
import usersReducer from './features/users/usersSlice';
import { onAuthFailure } from './services/api';
import { resetSocket } from './services/socket';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workspace: workspaceReducer,
    projects: projectReducer,
    tasks: taskReducer,
    chat: chatReducer,
    notifications: notificationReducer,
    dashboard: dashboardReducer,
    users: usersReducer,
  },
});

// When the 401 -> refresh-token retry chain fails, api.js calls this: wipe
// auth + socket state through Redux (avoids a store<->api circular import).
onAuthFailure(() => {
  resetSocket();
  store.dispatch(logoutNow());
});

export default store;
