import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import { toast } from '../../components/Toast';
import {
  fetchProjects,
  createProject,
  deleteProject,
  selectProjects,
} from '../../features/projects/projectSlice';
import { formatDate } from '../../utils/formatDate';

/** Board tab: project list + create/delete. Clicking a project opens its kanban. */
export default function BoardTab() {
  const { workspaceId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const projects = useSelector(selectProjects);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setLoading(true);
    dispatch(fetchProjects(workspaceId)).finally(() => setLoading(false));
  }, [dispatch, workspaceId]);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const result = await dispatch(
      createProject({ workspaceId, name: name.trim(), description: description.trim() }),
    );
    setCreating(false);
    if (createProject.fulfilled.match(result)) {
      setModalOpen(false);
      setName('');
      setDescription('');
      toast('Project created', 'success');
    } else {
      toast(result.payload || 'Could not create project', 'error');
    }
  };

  const onDelete = async (e, p) => {
    e.stopPropagation();
    if (!window.confirm(`Delete project "${p.name}" and all its tasks?`)) return;
    const result = await dispatch(deleteProject(p._id));
    if (deleteProject.fulfilled.match(result)) toast('Project deleted', 'success');
    else toast(result.payload || 'Could not delete project', 'error');
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Projects</h2>
        <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
          <Icon name="plus" className="h-4 w-4" />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" label="Loading projects" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon="board"
          title="No projects yet — plant the first flag."
          hint="Projects group your kanban tasks. Create one to start planning."
          action={
            <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
              <Icon name="plus" className="h-4 w-4" />
              Create project
            </button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p._id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/project/${p._id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/project/${p._id}`)}
              className="card group cursor-pointer p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-sm font-bold text-primary">
                  {(p.name || '?').slice(0, 2).toUpperCase()}
                </span>
                <button
                  type="button"
                  className="icon-btn opacity-0 transition group-hover:opacity-100 hover:!text-[#D63A3A]"
                  title="Delete project"
                  aria-label={`Delete project ${p.name}`}
                  onClick={(e) => onDelete(e, p)}
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
              <h3 className="mt-3 truncate text-lg font-semibold tracking-tight text-ink transition group-hover:text-primary-dark">{p.name}</h3>
              {p.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-body">{p.description}</p>
              )}
              <p className="mt-3 text-[11px] text-body/70">
                Created {formatDate(p.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title="New project" onClose={() => setModalOpen(false)}>
          <form onSubmit={onCreate} className="space-y-4">
            <div>
              <label className="label" htmlFor="proj-name">Project name</label>
              <input
                id="proj-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Website Redesign"
                autoFocus
                maxLength={80}
              />
            </div>
            <div>
              <label className="label" htmlFor="proj-desc">Description (optional)</label>
              <textarea
                id="proj-desc"
                className="input min-h-20 resize-y"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project about?"
                maxLength={500}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={creating || !name.trim()}>
                {creating && <Spinner className="h-4 w-4" />}
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
