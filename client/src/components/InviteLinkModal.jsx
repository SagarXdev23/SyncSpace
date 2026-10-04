import { useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';
import api from '../services/api';

const EXPIRY = [
  { label: '1 day', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'Never', days: 0 },
];
const MAX_USES = [
  { label: '1 use', value: 1 },
  { label: '5 uses', value: 5 },
  { label: '10 uses', value: 10 },
  { label: 'Unlimited', value: null },
];

export default function InviteLinkModal({ onClose, workspace }) {
  const [role, setRole] = useState('MEMBER');
  const [expiry, setExpiry] = useState(7);
  const [maxUses, setMaxUses] = useState(null);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const createLink = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await api.post('/invites', {
        workspaceId: workspace._id,
        role,
        expiresInDays: expiry,
        maxUses,
      });
      const token = res.data.data.token;
      setLink(`${window.location.origin}/invite/${token}`);
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not create invite link');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async () => {
    if (!link) {
      await createLink();
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="invite-link-title">
      <div className="w-full max-w-md">
        <h2 id="invite-link-title" className="text-[20px] font-bold tracking-tight text-ink">
          Invite Link
        </h2>
        <p className="mt-1 text-[13px] text-body">
          Share this link to invite people to {workspace.name}.
        </p>

        <div className="mt-5 flex gap-2">
          <input
            type="text"
            readOnly
            value={link}
            placeholder="https://syncspace.app/invite/abc123"
            className="input flex-1 !bg-canvas/50"
            aria-label="Invitation link"
          />
          <button
            type="button"
            onClick={copyLink}
            aria-label="Copy invitation link"
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-line text-muted transition hover:border-primary/40 hover:text-primary"
          >
            <Icon name={copied ? 'check' : 'copy'} className="h-[18px] w-[18px]" />
          </button>
        </div>
        {copied && (
          <p className="mt-1 text-xs font-medium text-green-600">Link copied!</p>
        )}

        <h3 className="mb-3 mt-6 text-[14px] font-bold text-ink">Link Settings</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="link-role" className="mb-1.5 block text-[13px] font-medium text-body">
              Role
            </label>
            <select
              id="link-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="link-expiry" className="mb-1.5 block text-[13px] font-medium text-body">
                Link Expiry
              </label>
              <select
                id="link-expiry"
                value={expiry}
                onChange={(e) => setExpiry(Number(e.target.value))}
                className="input"
              >
                {EXPIRY.map((o) => (
                  <option key={o.label} value={o.days}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="link-uses" className="mb-1.5 block text-[13px] font-medium text-body">
                Max Uses
              </label>
              <select
                id="link-uses"
                value={maxUses === null ? '' : maxUses}
                onChange={(e) =>
                  setMaxUses(e.target.value === '' ? null : Number(e.target.value))
                }
                className="input"
              >
                {MAX_USES.map((o) => (
                  <option key={o.label} value={o.value === null ? '' : o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-[#D63A3A]/25 bg-[#FDE8E8] px-3 py-2 text-sm text-[#D63A3A]">
            {error}
          </p>
        )}

        {!link && (
          <button
            type="button"
            onClick={createLink}
            disabled={creating}
            className="btn-primary mt-6 w-full !rounded-[10px] !py-2.5"
          >
            {creating ? 'Creating...' : 'Create Link'}
          </button>
        )}

        {link && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={onClose} className="btn-secondary !rounded-[10px] !py-2.5">
              Cancel
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="btn-primary !rounded-[10px] !py-2.5"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
