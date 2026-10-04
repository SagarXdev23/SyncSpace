import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AuthLayout from '../components/AuthLayout';
import Spinner from '../components/Spinner';
import api from '../services/api';
import { selectUser } from '../features/auth/authSlice';

export default function InviteAcceptance() {
  const { token } = useParams();
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .get(`/invites/${encodeURIComponent(token)}`)
      .then((res) => {
        if (active) setInvite(res.data.data);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Could not load this invite link.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const onAccept = async () => {
    setAccepting(true);
    setError('');
    try {
      const res = await api.post('/invites/accept', { token });
      navigate(`/workspace/${res.data.data.workspace._id}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not accept this invite.');
    } finally {
      setAccepting(false);
    }
  };

  const invitePath = `/invite/${encodeURIComponent(token)}`;

  return (
    <AuthLayout>
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-8 w-8" label="Loading invitation" />
        </div>
      ) : error && !invite ? (
        <>
          <h1 className="text-center text-[22px] font-bold tracking-tight text-ink">Invite unavailable</h1>
          <p role="alert" className="mt-4 rounded-xl border border-[#D63A3A]/25 bg-[#FDE8E8] px-3 py-2 text-sm text-[#D63A3A]">
            {error}
          </p>
          <Link to="/" className="btn-secondary mt-5 block text-center">Go to SyncSpace</Link>
        </>
      ) : (
        <>
          <h1 className="text-center text-[22px] font-bold tracking-tight text-ink">Join {invite.workspace.name}</h1>
          <p className="mt-2 text-center text-[13px] text-body">
            You&apos;ve been invited to join this workspace as a {invite.role.toLowerCase()}.
          </p>
          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-[#D63A3A]/25 bg-[#FDE8E8] px-3 py-2 text-sm text-[#D63A3A]">
              {error}
            </p>
          )}
          {user ? (
            <button
              type="button"
              className="btn-primary mt-6 w-full !rounded-[10px] !py-2.5"
              onClick={onAccept}
              disabled={accepting}
            >
              {accepting && <Spinner className="h-4 w-4" />}
              Join workspace
            </button>
          ) : (
            <div className="mt-6 space-y-3">
              <Link
                to={`/register?invite=${encodeURIComponent(token)}`}
                className="btn-primary block w-full !rounded-[10px] !py-2.5 text-center"
              >
                Create account and join
              </Link>
              <Link
                to={`/login?invite=${encodeURIComponent(token)}`}
                className="btn-secondary block w-full !rounded-[10px] !py-2.5 text-center"
                state={{ from: invitePath }}
              >
                Already have an account? Log in
              </Link>
            </div>
          )}
        </>
      )}
    </AuthLayout>
  );
}
