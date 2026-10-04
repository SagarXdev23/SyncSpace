import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearAuthError, selectAuthError, selectAuthStatus, selectUser } from '../features/auth/authSlice';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import { toast } from '../components/Toast';
import AuthLayout from '../components/AuthLayout';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const inviteToken = new URLSearchParams(location.search).get('invite');
  const requestedRedirect = new URLSearchParams(location.search).get('redirect');
  const safeRedirect = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//')
    ? requestedRedirect
    : null;
  const from = location.state?.from || safeRedirect || (inviteToken ? `/invite/${encodeURIComponent(inviteToken)}` : '/');
  const registerPath = from.startsWith('/invite/')
    ? `/register?invite=${encodeURIComponent(from.slice('/invite/'.length))}`
    : '/register';
  const user = useSelector(selectUser);
  const status = useSelector(selectAuthStatus);
  const apiError = useSelector(selectAuthError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);

  const validate = () => {
    const e = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
    if (password.length < 8) e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const result = await dispatch(loginUser({ email: email.trim(), password, remember }));
    if (loginUser.fulfilled.match(result)) navigate(from, { replace: true });
  };

  return (
    <AuthLayout>
      <h1 className="text-center text-[22px] font-bold tracking-tight text-ink">Welcome Back</h1>
      <p className="mt-1 text-center text-[13px] text-body">Login to your account</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            autoComplete="email"
          />
          {errors.email && <p className="mt-1 text-xs text-[#D63A3A]">{errors.email}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              className="input pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              <Icon name={showPw ? 'eye' : 'eyeOff'} className="h-[18px] w-[18px]" />
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-[#D63A3A]">{errors.password}</p>}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-body">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-[13px] font-semibold text-primary hover:text-primary-dark">
            Forgot password?
          </Link>
        </div>

        {apiError && (
          <p role="alert" className="rounded-xl border border-[#D63A3A]/25 bg-[#FDE8E8] px-3 py-2 text-sm text-[#D63A3A]">
            {apiError}
          </p>
        )}

        <button type="submit" className="btn-primary w-full !rounded-[10px] !py-2.5" disabled={status === 'loading'}>
          {status === 'loading' && <Spinner className="h-4 w-4" />}
          Login
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-muted">Or continue with</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn-secondary !rounded-[10px] !py-2.5" aria-label="Continue with Google"
          onClick={() => toast('Google sign-in is not available yet — please use email', 'info')}>
          <Icon name="google" className="h-5 w-5" />
        </button>
        <button type="button" className="btn-secondary !rounded-[10px] !py-2.5" aria-label="Continue with GitHub"
          onClick={() => toast('GitHub sign-in is not available yet — please use email', 'info')}>
          <Icon name="github" className="h-5 w-5 text-ink" />
        </button>
      </div>

      <p className="mt-6 text-center text-[13px] text-body">
        Don&apos;t have an account?{' '}
        <Link to={registerPath} className="font-semibold text-primary hover:text-primary-dark">
          Register
        </Link>
      </p>
    </AuthLayout>
  );
}
