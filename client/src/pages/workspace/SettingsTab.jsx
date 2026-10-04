import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { toast } from '../../components/Toast';
import {
  updateWorkspace,
  deleteWorkspace,
  selectCurrentWorkspace,
} from '../../features/workspace/workspaceSlice';
import { selectUser } from '../../features/auth/authSlice';
import { getMyRole } from '../../utils/constants';

/**
 * Workspace Settings tab: rename, description, danger zone (delete).
 */
export default function SettingsTab() {
  const { workspaceId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const workspace = useSelector(selectCurrentWorkspace);
  const user = useSelector(selectUser);

  const [name, setName] = useState(workspace?.name || '');
  const [description, setDescription] = useState(workspace?.description || '');
  const [saving, setSaving] = useState(false);

  const myRole = getMyRole(workspace, user?._id);
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';

  const onSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const result = await dispatch(
      updateWorkspace({ id: workspaceId, name: name.trim(), description: description.trim() }),
    );
    setSaving(false);
    if (updateWorkspace.fulfilled.match(result)) toast('Workspace updated', 'success');
  };

  const onDelete = async () => {
    if (
      !window.confirm(
        `Delete "${workspace?.name}"? This removes all projects, tasks and files. This cannot be undone.`,
      )
    )
      return;
    const result = await dispatch(deleteWorkspace(workspaceId));
    if (deleteWorkspace.fulfilled.match(result)) {
      toast('Workspace deleted', 'success');
      navigate('/workspaces');
    }
  };

  return (
    <div className="w-full min-w-0">
      <h2 className="mb-5 text-[18px] font-bold tracking-tight text-ink">Workspace Settings</h2>

      <form onSubmit={onSave} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="ws-settings-name">Workspace Name</label>
          <input
            id="ws-settings-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            disabled={!canManage}
          />
        </div>
        <div>
          <label className="label" htmlFor="ws-settings-desc">Description</label>
          <textarea
            id="ws-settings-desc"
            className="input min-h-24 resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this workspace for?"
            maxLength={1000}
            disabled={!canManage}
          />
        </div>
        {canManage && (
          <div className="flex justify-end">
            <button type="submit" className="btn-primary !rounded-[10px]" disabled={saving || !name.trim()}>
              {saving && <Spinner className="h-4 w-4" />}
              Save changes
            </button>
          </div>
        )}
      </form>

      {myRole === 'OWNER' && (
        <div className="card mt-5 border-[#D63A3A]/25 p-6">
          <h3 className="text-[15px] font-bold text-[#D63A3A]">Danger Zone</h3>
          <p className="mt-1 text-[13px] text-body">
            Deleting a workspace removes all of its projects, tasks, files and messages. This cannot be undone.
          </p>
          <button
            type="button"
            onClick={onDelete}
            className="btn-danger mt-4 !rounded-[10px]"
          >
            <Icon name="trash" className="h-4 w-4" />
            Delete workspace
          </button>
        </div>
      )}
    </div>
  );
}
