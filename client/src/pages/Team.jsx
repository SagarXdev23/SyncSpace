import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Shell from '../components/Shell';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import RolesPermissions from '../components/RolesPermissions';
import api from '../services/api';
import { toast } from '../components/Toast';

const TABS = ['All Members', 'Active', 'Invite Links', 'Roles'];

const STATS = [
  { key: 'total', label: 'Total Members', icon: 'users', bg: 'bg-[#7C6FF7]' },
  { key: 'active', label: 'Active Members', icon: 'user', bg: 'bg-[#22C55E]' },
  { key: 'invites', label: 'Active Invite Links', icon: 'clock', bg: 'bg-[#F59E0B]' },
];

const ROLE_BADGE = {
  OWNER: 'bg-[#F59E0B]/15 text-[#D97706]',
  ADMIN: 'bg-[#7C6FF7]/10 text-[#7C6FF7]',
  MEMBER: 'bg-[#3B82F6]/10 text-[#3B82F6]',
};

export default function Team() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All Members');
  const [workspaces, setWorkspaces] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/workspaces')
      .then((res) => {
        if (active) setWorkspaces(res.data.data || []);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Could not load workspace members');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    api.get('/invites')
      .then((res) => {
        if (active) setInvites(res.data.data || []);
      })
      .catch((err) => {
        if (active) toast(err.response?.data?.message || 'Could not load invite links', 'error');
      });
    return () => {
      active = false;
    };
  }, []);

  const members = useMemo(
    () =>
      workspaces.flatMap((workspace) =>
        (workspace.members || [])
          .filter((membership) => membership.user?._id)
          .map((membership) => ({
            ...membership.user,
            role: membership.role,
            workspaceId: workspace._id,
            workspaceName: workspace.name,
          })),
      ),
    [workspaces],
  );
  const activeInvites = invites.filter(
    (invite) =>
      (!invite.expiresAt || new Date(invite.expiresAt) > new Date()) &&
      (invite.maxUses === null || invite.usedCount < invite.maxUses),
  );
  const displayStats = {
    total: members.length,
    active: members.length,
    invites: activeInvites.length,
  };

  return (
    <Shell>
      <div className="px-4 py-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-ink">Team</h1>
            <p className="mt-1 text-[13px] text-body">Manage your team members</p>
          </div>
          <button
            type="button"
            className="btn-primary !rounded-[10px]"
            onClick={() => navigate('/team/invite')}
          >
            <Icon name="plus" className="h-4 w-4" />
            Invite Member
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {STATS.map((s) => (
            <div key={s.key} className="card flex items-center gap-4 p-5">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${s.bg}`}>
                <Icon name={s.icon} className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-[26px] font-extrabold leading-none tracking-tight text-ink">
                  {displayStats[s.key]}
                </span>
                <span className="mt-1 block text-xs font-medium text-body">{s.label}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-line">
          <div className="flex gap-6">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative pb-3 text-[13.5px] font-semibold transition ${
                  activeTab === tab ? 'text-primary' : 'text-body hover:text-ink'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="mt-4">
          {activeTab === 'Roles' ? (
            <RolesPermissions />
          ) : activeTab === 'Invite Links' ? (
            activeInvites.length ? (
              <div className="card divide-y divide-line/70 p-2">
                {activeInvites.map((invite) => (
                  <div key={invite._id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold text-ink">
                        {invite.workspace?.name || 'Workspace'}
                      </p>
                      <p className="text-xs text-muted">
                        {invite.role.toLowerCase()} · {invite.maxUses === null
                          ? 'unlimited uses'
                          : `${invite.usedCount}/${invite.maxUses} uses`}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary !rounded-[10px] !py-2"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(`${window.location.origin}/invite/${invite.token}`);
                          toast('Invite link copied', 'success');
                        } catch {
                          toast('Could not copy invite link', 'error');
                        }
                      }}
                    >
                      <Icon name="copy" className="h-4 w-4" />
                      Copy link
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-8 text-center">
                <p className="text-sm text-body">No active invite links.</p>
                <button
                  type="button"
                  className="btn-primary mx-auto mt-4 !rounded-[10px]"
                  onClick={() => navigate('/team/invite')}
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Create invite link
                </button>
              </div>
            )
          ) : loading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-8 w-8" label="Loading team" />
            </div>
          ) : error ? (
            <p role="alert" className="card px-4 py-5 text-sm text-[#D63A3A]">{error}</p>
          ) : (
            <div className="card divide-y divide-line/70 p-2">
              {members.map((u) => (
                <div key={`${u.workspaceId}-${u._id}`} className="flex items-center gap-3 px-3 py-3">
                  <Avatar name={u.name} src={u.avatar} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold text-ink">{u.name}</p>
                    <p className="truncate text-xs text-muted">{u.email} · {u.workspaceName}</p>
                  </div>
                  <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${
                    ROLE_BADGE[u.role] || ROLE_BADGE.MEMBER
                  }`}
                  >
                  {(u.role || 'MEMBER').toLowerCase()}
                  </span>
                </div>
              ))}
              {members.length === 0 && (
                <p className="py-8 text-center text-sm text-body">No members found.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
