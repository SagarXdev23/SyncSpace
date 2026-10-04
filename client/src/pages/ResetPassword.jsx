import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import AuthLayout from '../components/AuthLayout';

/**
 * Set a new password from a reset link (/reset-password/:token).
 */
export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
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
      <h1 className="text-center text-[22px] font-bold tracking-tight text-ink">Create new password</h1>
      <p className="mt-1 text-center text-[13px] text-body">Enter your new password below.</p>

      {done ? (
        <div className="mt-6 rounded-xl border border-[#1F9D57]/25 bg-[#E6F7EE] px-4 py-3 text-sm text-[#1F9D57]">
          Your password has been reset. You can now log in with your new password.
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          {pwField('password', 'New Password', password, setPassword, showPw, setShowPw)}
          {pwField('confirm', 'Confirm New Password', confirm, setConfirm, showConfirm, setShowConfirm)}
          {error && (
            <p role="alert" className="rounded-xl border border-[#D63A3A]/25 bg-[#FDE8E8] px-3 py-2 text-sm text-[#D63A3A]">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full !rounded-[10px] !py-2.5" disabled={saving}>
            {saving && <Spinner className="h-4 w-4" />}
            Reset Password
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-[13px]">
        <Link to="/login" className="font-semibold text-primary hover:text-primary-dark">
          Back to Login
        </Link>
      </p>
    </AuthLayout>
  );
}
