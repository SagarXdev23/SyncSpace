import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { SocketProvider } from './hooks/SocketContext';
import { ToastHost } from './components/Toast';
import Spinner from './components/Spinner';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Workspaces = lazy(() => import('./pages/Workspaces'));
const Workspace = lazy(() => import('./pages/Workspace'));
const Project = lazy(() => import('./pages/Project'));
const Projects = lazy(() => import('./pages/Projects'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Messages = lazy(() => import('./pages/Messages'));
const Files = lazy(() => import('./pages/Files'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Activity = lazy(() => import('./pages/Activity'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Team = lazy(() => import('./pages/Team'));
const TeamInvite = lazy(() => import('./pages/TeamInvite'));
const InviteAcceptance = lazy(() => import('./pages/InviteAcceptance'));
const OverviewTab = lazy(() => import('./pages/workspace/OverviewTab'));
const MembersTab = lazy(() => import('./pages/workspace/MembersTab'));
const BoardTab = lazy(() => import('./pages/workspace/BoardTab'));
const FilesTab = lazy(() => import('./pages/workspace/FilesTab'));
const SettingsTab = lazy(() => import('./pages/workspace/SettingsTab'));
import { fetchMe, selectUser, selectAuthStatus } from './features/auth/authSlice';
import { getToken } from './services/api';

/**
 * "/" renders the marketing landing page for visitors and the dashboard for
 * signed-in users. While a persisted session is being restored we show a
 * spinner instead of bouncing — deep links keep working after hard refresh.
 */
function HomeRoute() {
  const user = useSelector(selectUser);
  const status = useSelector(selectAuthStatus);
  const token = getToken();

  if (token && !user && (status === 'loading' || status === 'idle')) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <Spinner className="h-8 w-8" label="Loading SyncSpace" />
      </div>
    );
  }
  if (user) return <Dashboard />;
  return <Landing />;
}

const Guard = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;

function RouteLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-canvas">
      <Spinner className="h-8 w-8" label="Loading page" />
    </div>
  );
}

export default function App() {
  const dispatch = useDispatch();

  // On app boot, if a token was persisted, restore the session via /auth/me.
  useEffect(() => {
    if (getToken()) dispatch(fetchMe());
  }, [dispatch]);

  return (
    <SocketProvider>
      <ToastHost />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/invite/:token" element={<InviteAcceptance />} />

          {/* Global pages */}
          <Route path="/workspaces" element={<Guard><Workspaces /></Guard>} />
          <Route path="/projects" element={<Guard><Projects /></Guard>} />
          <Route path="/tasks" element={<Guard><Tasks /></Guard>} />
          <Route path="/calendar" element={<Guard><Calendar /></Guard>} />
          <Route path="/messages" element={<Guard><Messages /></Guard>} />
          <Route path="/files" element={<Guard><Files /></Guard>} />
          <Route path="/team" element={<Guard><Team /></Guard>} />
          <Route path="/team/invite" element={<Guard><TeamInvite /></Guard>} />
          <Route path="/notifications" element={<Guard><Notifications /></Guard>} />
          <Route path="/activity" element={<Guard><Activity /></Guard>} />
          <Route path="/profile" element={<Guard><Profile /></Guard>} />
          <Route path="/settings" element={<Guard><Settings /></Guard>} />

          {/* Workspace details (mockup 9): Overview / Members / Projects / Files / Settings */}
          <Route
            path="/workspace/:workspaceId"
            element={
              <Guard>
                <Workspace />
              </Guard>
            }
          >
            <Route index element={<OverviewTab />} />
            <Route path="members" element={<MembersTab />} />
            <Route path="projects" element={<BoardTab />} />
            <Route path="files" element={<FilesTab />} />
            <Route path="settings" element={<SettingsTab />} />
          </Route>
          <Route
            path="/project/:projectId"
            element={
              <Guard>
                <Project />
              </Guard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </SocketProvider>
  );
}
