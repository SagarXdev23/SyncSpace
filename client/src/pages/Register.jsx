import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, clearAuthError, selectAuthError, selectAuthStatus, selectUser } from '../features/auth/authSlice';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import AuthLayout from '../components/AuthLayout';

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const inviteToken = new URLSearchParams(location.search).get('invite');
  const afterAuth = inviteToken ? `/invite/${encodeURIComponent(inviteToken)}` : '/';
  const user = useSelector(selectUser);
  const status = useSelector(selectAuthStatus);
  const apiError = useSelector(selectAuthError);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) navigate(afterAuth, { replace: true });
  }, [user, navigate, afterAuth]);

  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);

  const validate = () => {
    const e = {};
    if (name.trim().length < 2) e.name = 'Enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
    if (password.length < 8) e.password = 'Password must be at least 8 characters';
    if (confirm !== password) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const result = await dispatch(
      registerUser({ name: name.trim(), email: email.trim(), password }),
    );
    if (registerUser.fulfilled.match(result)) navigate(afterAuth, { replace: true });
  };

  const pwField = (id, label, value, setValue, show, setShow) => (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className="input pr-10"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
        >
          <Icon name={show ? 'eye' : 'eyeOff'} className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );

  return (
    <AuthLayout>
      <h1 className="text-center text-[22px] font-bold tracking-tight text-ink">Create your account</h1>
      <p className="mt-1 text-center text-[13px] text-body">Join SyncSpace and start collaborating.</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            autoComplete="name"
          />
          {errors.name && <p className="mt-1 text-xs text-[#D63A3A]">{errors.name}</p>}
        </div>
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
        {pwField('password', 'Password', password, setPassword, showPw, setShowPw)}
        {errors.password && <p className="-mt-2 text-xs text-[#D63A3A]">{errors.password}</p>}
        {pwField('confirm', 'Confirm Password', confirm, setConfirm, showConfirm, setShowConfirm)}
        {errors.confirm && <p className="-mt-2 text-xs text-[#D63A3A]">{errors.confirm}</p>}

        {apiError && (
          <p role="alert" className="rounded-xl border border-[#D63A3A]/25 bg-[#FDE8E8] px-3 py-2 text-sm text-[#D63A3A]">
            {apiError}
          </p>
        )}

        <button type="submit" className="btn-primary w-full !rounded-[10px] !py-2.5" disabled={status === 'loading'}>
          {status === 'loading' && <Spinner className="h-4 w-4" />}
          Create Account
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-body">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:text-primary-dark">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}
