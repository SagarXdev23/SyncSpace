import { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import Modal from './Modal';
import Spinner from './Spinner';
import Icon from './Icon';
import { toast } from './Toast';
import { createWorkspace } from '../features/workspace/workspaceSlice';

/**
 * Create Workspace modal — exact per mockup 8: name, optional description,
 * logo upload (PNG/JPG up to 2MB), Cancel/Create.
 */
export default function CreateWorkspaceModal({ onClose, onCreated }) {
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoName, setLogoName] = useState('');
  const [creating, setCreating] = useState(false);
  const fileRef = useRef(null);

  const pickLogo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g)$/i.test(f.type)) {
      toast('Only PNG or JPG images are allowed', 'error');
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      toast('Logo must be under 2MB', 'error');
      return;
    }
    setLogoName(f.name);
    setLogoFile(f);
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(f);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const result = await dispatch(
      createWorkspace({ name: name.trim(), description: description.trim(), logoFile }),
    );
    setCreating(false);
    if (createWorkspace.fulfilled.match(result)) {
      toast('Workspace created', 'success');
      onCreated?.(result.payload);
      onClose();
    }
  };

  return (
    <Modal title="Create Workspace" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="cws-name">Workspace Name</label>
          <input
            id="cws-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter workspace name"
            autoFocus
            maxLength={80}
          />
        </div>
        <div>
          <label className="label" htmlFor="cws-desc">Description (optional)</label>
          <input
            id="cws-desc"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
            maxLength={200}
          />
        </div>
        <div>
          <span className="label">Workspace Logo</span>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={pickLogo} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-input bg-canvas/50 px-4 py-3.5 text-left transition hover:border-primary hover:bg-primary-soft/40"
          >
            {logo ? (
              <img src={logo} alt="Workspace logo preview" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-muted">
                <Icon name="upload" className="h-4 w-4" />
              </span>
            )}
            <span>
              <span className="block text-sm font-semibold text-ink">
                {logoName || 'Upload Logo'}
              </span>
              <span className="block text-xs text-muted">PNG, JPG up to 2MB</span>
            </span>
          </button>
        </div>
        <div className="flex justify-end gap-2.5 pt-1">
          <button type="button" className="btn-secondary !rounded-[10px]" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary !rounded-[10px]"
            disabled={creating || !name.trim()}
          >
            {creating && <Spinner className="h-4 w-4" />}
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}
