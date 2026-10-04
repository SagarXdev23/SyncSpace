import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../components/Shell';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';
import InviteLinkModal from '../components/InviteLinkModal';
import api from '../services/api';

export default function TeamInvite() {
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get('/workspaces')
      .then((res) => {
        if (!active) return;
        const list = res.data.data || [];
        setWorkspaces(list);
        if (list.length === 1) setSelectedId(list[0]._id);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Could not load workspaces.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedWorkspace = workspaces.find((workspace) => workspace._id === selectedId);

  return (
    <Shell>
      <div className="px-4 py-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold tracking-tight text-ink">Invite Members</h1>
          <p className="mt-1 text-[13px] text-body">
            Create a workspace invite link and share it with your team.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" label="Loading workspaces" />
          </div>
        ) : error ? (
          <p role="alert" className="max-w-xl rounded-xl border border-[#D63A3A]/25 bg-[#FDE8E8] px-3 py-2 text-sm text-[#D63A3A]">
            {error}
          </p>
        ) : workspaces.length === 0 ? (
          <div className="card max-w-xl p-6">
            <p className="text-sm text-body">Create a workspace before inviting team members.</p>
            <Link to="/workspaces" className="btn-primary mt-4 inline-flex !rounded-[10px]">
              <Icon name="plus" className="h-4 w-4" />
              View workspaces
            </Link>
          </div>
        ) : (
          <div className="card max-w-xl p-6">
            <label htmlFor="invite-workspace" className="label">Workspace</label>
            <select
              id="invite-workspace"
              className="input"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              <option value="">Choose a workspace</option>
              {workspaces.map((workspace) => (
                <option key={workspace._id} value={workspace._id}>{workspace.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn-primary mt-5 !rounded-[10px]"
              onClick={() => setLinkModalOpen(true)}
              disabled={!selectedWorkspace}
            >
              <Icon name="copy" className="h-4 w-4" />
              Create invite link
            </button>
          </div>
        )}
      </div>

      {linkModalOpen && selectedWorkspace && (
        <InviteLinkModal
          workspace={selectedWorkspace}
          onClose={() => setLinkModalOpen(false)}
        />
      )}
    </Shell>
  );
}
