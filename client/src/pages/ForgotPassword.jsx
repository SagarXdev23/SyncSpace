import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Spinner from '../components/Spinner';
import AuthLayout from '../components/AuthLayout';

/**
 * Request a password reset link. The backend always returns a generic message
 * (no account enumeration), which we display verbatim.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setSending(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage(res.data.message || 'Check your inbox for a reset link.');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-center text-[22px] font-bold tracking-tight text-ink">Reset your password</h1>
      <p className="mt-1 text-center text-[13px] text-body">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {message ? (
        <div className="mt-6 rounded-xl border border-[#1F9D57]/25 bg-[#E6F7EE] px-4 py-3 text-sm text-[#1F9D57]">
          {message}
        </div>
      ) : (
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
              autoFocus
            />
            {error && <p className="mt-1 text-xs text-[#D63A3A]">{error}</p>}
          </div>
          <button type="submit" className="btn-primary w-full !rounded-[10px] !py-2.5" disabled={sending}>
            {sending && <Spinner className="h-4 w-4" />}
            Send Reset Link
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
