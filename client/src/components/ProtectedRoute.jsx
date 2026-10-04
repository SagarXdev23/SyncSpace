import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser, selectAuthStatus } from '../features/auth/authSlice';
import { getToken } from '../services/api';
import Spinner from './Spinner';

/**
 * Guards private routes.
 * - No token at all -> /login.
 * - Token present but user not yet restored (App is calling /auth/me) -> spinner.
 */
export default function ProtectedRoute({ children }) {
  const user = useSelector(selectUser);
  const status = useSelector(selectAuthStatus);
  const location = useLocation();
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  // Token exists but the session hasn't been restored yet (App is calling
  // /auth/me on boot). Wait for it instead of bouncing to /login — otherwise
  // a hard refresh on any deep link (/workspace/:id, /project/:id) would
  // redirect to /login and then to /, losing the original destination.
  if (!user && (status === 'loading' || status === 'idle')) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <Spinner className="h-8 w-8" label="Restoring session" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}
