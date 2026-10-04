import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import { toast } from '../../components/Toast';
import {
  addMember,
  updateMemberRole,
  removeMember,
  fetchWorkspace,
  selectCurrentWorkspace,
  selectWorkspaceError,
  clearWorkspaceError,
} from '../../features/workspace/workspaceSlice';
import { selectUser } from '../../features/auth/authSlice';
import { normalizeMember, getMyRole, ROLES } from '../../utils/constants';

const ROLE_BADGE = {
  OWNER: 'bg-[#FEF3E2] text-[#C47B12]',
  ADMIN: 'bg-[#FDE8E8] text-[#E5484D]',
  MEMBER: 'bg-[#E8F1FD] text-[#2B6CB0]',
};

export default function MembersTab() {
  const { workspaceId } = useParams();
  const dispatch = useDispatch();
  const workspace = useSelector(selectCurrentWorkspace);
  const user = useSelector(selectUser);
  const wsError = useSelector(selectWorkspaceError);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (wsError) {
      toast(wsError, 'error');
      dispatch(clearWorkspaceError());
    }
  }, [wsError, dispatch]);

  const members = (workspace?.members || []).map(normalizeMember);
  const myRole = getMyRole(workspace, user?._id);
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';

  const onInvite = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast('Enter a valid email address', 'error');
      return;
    }
    setInviting(true);
    const result = await dispatch(addMember({ id: workspaceId, email: email.trim(), role }));
    setInviting(false);
    if (addMember.fulfilled.match(result)) {
      setEmail('');
      setInviteOpen(false);
      toast('Member added', 'success');
      dispatch(fetchWorkspace(workspaceId));
    }
  };

  const onRoleChange = async (m, newRole) => {
    const result = await dispatch(
      updateMemberRole({ id: workspaceId, userId: m.id, role: newRole }),
    );
    if (updateMemberRole.fulfilled.match(result)) {
      toast('Role updated', 'success');
      dispatch(fetchWorkspace(workspaceId));
    }
  };

  const onRemove = async (m) => {
    if (!window.confirm(`Remove ${m.name} from this workspace?`)) return;
    const result = await dispatch(removeMember({ id: workspaceId, userId: m.id }));
    if (removeMember.fulfilled.match(result)) toast('Member removed', 'success');
  };

  const copyEmail = async (member) => {
    try {
      await navigator.clipboard.writeText(member.email);
      toast('Email copied', 'success');
    } catch {
      toast('Could not copy email', 'error');
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[18px] font-bold tracking-tight text-ink">Workspace Members</h2>
        {canManage && (
          <button
            type="button"
            className="btn-primary !rounded-[10px] !py-2"
            onClick={() => setInviteOpen(true)}
          >
            <Icon name="plus" className="h-4 w-4" />
            Invite
          </button>
        )}
      </div>

      <ul className="space-y-3">
        {members.map((m) => {
          const isSelf = String(m.id) === String(user?._id);
          const isOwnerRow = m.role === 'OWNER';
          return (
            <li
              key={m.id}
              className="card flex items-center gap-3.5 p-4 transition hover:shadow-lift"
            >
              <Avatar name={m.name} src={m.avatar} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">
                  {m.name}
                  {isSelf && <span className="ml-2 text-xs font-normal text-body">(you)</span>}
                </p>
                <p className="truncate text-xs text-muted">{m.email}</p>
              </div>
              {canManage && !isOwnerRow && !isSelf ? (
                <select
                  className="input w-28 !py-1.5 text-xs"
                  value={m.role}
                  onChange={(e) => onRoleChange(m, e.target.value)}
                  aria-label={`Role for ${m.name}`}
                >
                  {ROLES.filter((r) => r !== 'OWNER').map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              ) : (
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${ROLE_BADGE[m.role] || ROLE_BADGE.MEMBER}`}>
                  {m.role.toLowerCase()}
                </span>
              )}
              {canManage && !isOwnerRow && !isSelf ? (
                <button
                  type="button"
                  className="icon-btn hover:text-[#D63A3A]"
                  title={`Remove ${m.name}`}
                  aria-label={`Remove ${m.name}`}
                  onClick={() => onRemove(m)}
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              ) : (
                <details className="relative">
                  <summary
                    className="icon-btn list-none cursor-pointer"
                    aria-label={`Actions for ${m.name}`}
                    title={`Actions for ${m.name}`}
                  >
                    <Icon name="dots" className="h-5 w-5" />
                  </summary>
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg"
                  >
                    {canManage && (
                      <button
                        type="button"
                        role="menuitem"
                        className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-canvas"
                        onClick={(e) => {
                          e.currentTarget.closest('details').open = false;
                          setInviteOpen(true);
                        }}
                      >
                        Invite member
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-canvas"
                      onClick={(e) => {
                        e.currentTarget.closest('details').open = false;
                        copyEmail(m);
                      }}
                    >
                      Copy email
                    </button>
                  </div>
                </details>
              )}
            </li>
          );
        })}
      </ul>

      {inviteOpen && (
        <Modal title="Invite member" onClose={() => setInviteOpen(false)}>
          <form onSubmit={onInvite} className="space-y-4">
            <div>
              <label className="label" htmlFor="invite-email">Email address</label>
              <input
                id="invite-email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@company.com"
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="invite-role">Role</label>
              <select
                id="invite-role"
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {ROLES.filter((r) => r !== 'OWNER').map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2.5">
              <button type="button" className="btn-secondary !rounded-[10px]" onClick={() => setInviteOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary !rounded-[10px]" disabled={inviting || !email.trim()}>
                {inviting ? <Spinner className="h-4 w-4" /> : <Icon name="plus" className="h-4 w-4" />}
                Invite
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
