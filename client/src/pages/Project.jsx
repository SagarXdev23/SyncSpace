import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Shell from '../components/Shell';
import TaskCard from '../components/TaskCard';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import Badge, { PRIORITY_VARIANTS, ROLE_VARIANTS } from '../components/Badge';
import { toast } from '../components/Toast';
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  fetchComments,
  addComment,
  updateComment,
  deleteComment,
  clearTasks,
  taskStatusOptimistic,
  setSelectedTaskId,
  selectTasks,
  selectCommentsForTask,
  selectSelectedTask,
} from '../features/tasks/taskSlice';
import {
  fetchProject,
  selectCurrentProject,
} from '../features/projects/projectSlice';
import { fetchWorkspace, selectCurrentWorkspace } from '../features/workspace/workspaceSlice';
import { selectUser } from '../features/auth/authSlice';
import { TASK_STATUSES, PRIORITIES, normalizeMember, getMyRole } from '../utils/constants';
import { formatDateTime, toInputDate } from '../utils/formatDate';

const STATUS_IDS = TASK_STATUSES.map((s) => s.id);

/** One droppable kanban column — lightly tinted per status. */
const COLUMN_TINTS = {
  TODO: 'bg-colTodo',
  IN_PROGRESS: 'bg-colProg',
  COMPLETED: 'bg-colDone',
};

/** Status dot color per column. */
const COLUMN_DOTS = {
  TODO: 'bg-[#A7A3C0]',
  IN_PROGRESS: 'bg-[#F5A524]',
  COMPLETED: 'bg-[#22C55E]',
};

function Column({ status, tasks, onOpen, onNewTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = TASK_STATUSES.find((s) => s.id === status);

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[19rem] flex-1 flex-col rounded-2xl border p-3 transition ${
        isOver
          ? 'border-primary/60 bg-primary-soft/60'
          : `border-line ${COLUMN_TINTS[status] || 'bg-canvas'}`
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${COLUMN_DOTS[status] || 'bg-muted'}`} />
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            {meta?.label}
          </span>
          <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[11px] font-semibold text-body">
            {tasks.length}
          </span>
        </span>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-input text-body transition hover:border-primary hover:text-primary"
          title={`Add task to ${meta?.label}`}
          aria-label={`Add task to ${meta?.label}`}
          onClick={onNewTask}
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
      </div>
      <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-24 flex-1 space-y-2.5">
          {tasks.map((t) => (
            <TaskCard key={t._id} task={t} onOpen={onOpen} />
          ))}
          {tasks.length === 0 && (
            <p className="rounded-xl border border-dashed border-line bg-white/50 px-3 py-6 text-center text-xs text-body/70">
              Drop tasks here
            </p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

/** Task detail modal: edit fields, assignee, comments thread. */
function TaskDetail({ task, members, onClose }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const comments = useSelector(selectCommentsForTask(task._id));
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status || 'TODO');
  const [priority, setPriority] = useState(task.priority || 'MEDIUM');
  const [assignedTo, setAssignedTo] = useState(task.assignedTo?._id || task.assignedTo || '');
  const [dueDate, setDueDate] = useState(toInputDate(task.dueDate));
  const [saving, setSaving] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    dispatch(fetchComments(task._id));
  }, [dispatch, task._id]);

  const save = async (patch) => {
    setSaving(true);
    const result = await dispatch(updateTask({ id: task._id, patch }));
    setSaving(false);
    if (updateTask.fulfilled.match(result)) toast('Task updated', 'success');
    else toast(result.payload || 'Could not update task', 'error');
  };

  const onSaveFields = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast('Title is required', 'error');
      return;
    }
    save({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignedTo: assignedTo || null,
      dueDate: dueDate || null,
    });
  };

  const onDelete = async () => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    const result = await dispatch(deleteTask(task._id));
    if (deleteTask.fulfilled.match(result)) {
      toast('Task deleted', 'success');
      onClose();
    } else toast(result.payload || 'Could not delete task', 'error');
  };

  const onAddComment = async (e) => {
    e.preventDefault();
    const content = commentDraft.trim();
    if (!content) return;
    setCommentDraft('');
    const result = await dispatch(addComment({ taskId: task._id, content }));
    if (addComment.rejected.match(result)) {
      setCommentDraft(content);
      toast(result.payload || 'Could not add comment', 'error');
    }
  };

  const startEditComment = (c) => {
    setEditingId(c._id);
    setEditingText(c.content);
  };

  const onSaveComment = async (c) => {
    const result = await dispatch(
      updateComment({ id: c._id, taskId: task._id, content: editingText.trim() }),
    );
    if (updateComment.fulfilled.match(result)) {
      setEditingId(null);
      setEditingText('');
    } else toast(result.payload || 'Could not update comment', 'error');
  };

  const onDeleteComment = async (c) => {
    if (!window.confirm('Delete this comment?')) return;
    const result = await dispatch(deleteComment({ id: c._id, taskId: task._id }));
    if (deleteComment.rejected.match(result)) toast(result.payload || 'Could not delete comment', 'error');
  };

  const canEditComment = (c) => String(c.author?._id || c.author) === String(user?._id);

  return (
    <Modal title="Task details" onClose={onClose} wide>
      <div className="grid gap-8 md:grid-cols-2">
        <form onSubmit={onSaveFields} className="space-y-4">
        <div>
          <label className="label" htmlFor="task-title">Title</label>
          <input
            id="task-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </div>
        <div>
          <label className="label" htmlFor="task-desc">Description</label>
          <textarea
            id="task-desc"
            className="input min-h-20 resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="task-status">Status</label>
            <select id="task-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {TASK_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="task-priority">Priority</label>
            <select id="task-priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="task-assignee">Assignee</label>
            <select
              id="task-assignee"
              className="input"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="task-due">Due date</label>
            <input
              id="task-due"
              type="date"
              className="input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={onDelete} className="btn-danger !px-3 !py-1.5 text-xs">
            <Icon name="trash" className="h-3.5 w-3.5" />
            Delete
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Spinner className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </form>

      {/* Comments */}
      <div className="border-t border-line pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
        <p className="label">Comments ({comments.length})</p>
        <div className="mb-3 max-h-64 space-y-3 overflow-y-auto pr-1">
          {comments.length === 0 && (
            <p className="text-xs text-body">No comments yet — start the discussion.</p>
          )}
          {comments.map((c) => {
            const authorName = c.author?.name || c.author?.email || 'Unknown';
            const editing = String(editingId) === String(c._id);
            return (
              <div key={c._id} className="flex gap-2.5">
                <Avatar name={authorName} src={c.author?.avatar} size="xs" />
                <div className="min-w-0 flex-1 rounded-xl border border-line bg-canvas/60 p-2.5">
                  <p className="text-[11px] text-body">
                    {authorName} · {formatDateTime(c.createdAt)}
                    {c.updatedAt && c.updatedAt !== c.createdAt && ' (edited)'}
                  </p>
                  {editing ? (
                    <div className="mt-1.5 flex gap-2">
                      <input
                        className="input !py-1.5 text-xs"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        autoFocus
                      />
                      <button type="button" className="btn-primary !px-2.5 !py-1.5 text-xs" onClick={() => onSaveComment(c)}>
                        <Icon name="check" className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary !px-2.5 !py-1.5 text-xs"
                        onClick={() => setEditingId(null)}
                      >
                        <Icon name="x" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{c.content}</p>
                  )}
                  {canEditComment(c) && !editing && (
                    <div className="mt-1.5 flex gap-3 text-[11px] font-medium">
                      <button type="button" className="text-primary hover:text-primary-dark" onClick={() => startEditComment(c)}>
                        Edit
                      </button>
                      <button type="button" className="text-[#D63A3A] hover:text-[#B92F2F]" onClick={() => onDeleteComment(c)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={onAddComment} className="flex gap-2">
          <input
            className="input"
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            placeholder="Write a comment…"
            maxLength={1000}
            aria-label="Add a comment"
          />
          <button type="submit" className="btn-secondary shrink-0" disabled={!commentDraft.trim()}>
            <Icon name="send" className="h-4 w-4" />
          </button>
        </form>
      </div>
      </div>
    </Modal>
  );
}

/** New-task modal (status prefilled from the column it was opened in). */
function NewTaskModal({ projectId, status, onClose }) {
  const dispatch = useDispatch();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [creating, setCreating] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast('Title is required', 'error');
      return;
    }
    setCreating(true);
    const result = await dispatch(
      createTask({ projectId, title: title.trim(), description: description.trim(), status, priority }),
    );
    setCreating(false);
    if (createTask.fulfilled.match(result)) {
      toast('Task created', 'success');
      onClose();
    } else toast(result.payload || 'Could not create task', 'error');
  };

  return (
    <Modal title={`New task — ${TASK_STATUSES.find((s) => s.id === status)?.label}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="nt-title">Title</label>
          <input
            id="nt-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
            autoFocus
            maxLength={200}
          />
        </div>
        <div>
          <label className="label" htmlFor="nt-desc">Description (optional)</label>
          <textarea
            id="nt-desc"
            className="input min-h-20 resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </div>
        <div>
          <label className="label" htmlFor="nt-priority">Priority</label>
          <select id="nt-priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={creating || !title.trim()}>
            {creating && <Spinner className="h-4 w-4" />}
            Create task
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Project() {
  const { projectId } = useParams();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const tasks = useSelector(selectTasks);
  const project = useSelector(selectCurrentProject);
  const workspace = useSelector(selectCurrentWorkspace);
  const selectedTask = useSelector(selectSelectedTask);

  const [loading, setLoading] = useState(true);
  const [newTaskStatus, setNewTaskStatus] = useState(null);
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const proj = await dispatch(fetchProject(projectId)).unwrap();
        const wsId = proj.workspace?._id || proj.workspace;
        if (wsId) await dispatch(fetchWorkspace(wsId)).unwrap();
        await dispatch(fetchTasks(projectId)).unwrap();
      } catch (e) {
        toast(e || 'Could not load project', 'error');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      dispatch(clearTasks());
    };
  }, [dispatch, projectId]);

  const members = (workspace?.members || []).map(normalizeMember);
  const myRole = getMyRole(workspace, user?._id);
  const workspaceId = workspace?._id;

  const tasksByStatus = (status) => tasks.filter((t) => t.status === status);

  const handleDragStart = (event) => {
    const t = tasks.find((x) => String(x._id) === String(event.active.id));
    setActiveTask(t || null);
  };

  const handleDragEnd = async (event) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = String(active.id);
    const task = tasks.find((t) => String(t._id) === taskId);
    if (!task) return;

    // Dropped on a column (id = status) or on another card (id = task id).
    let newStatus = null;
    if (STATUS_IDS.includes(over.id)) newStatus = over.id;
    else {
      const overTask = tasks.find((t) => String(t._id) === String(over.id));
      if (overTask) newStatus = overTask.status;
    }
    if (!newStatus || newStatus === task.status) return;

    // Optimistic move; revert if the PATCH fails.
    const prev = task.status;
    dispatch(taskStatusOptimistic({ id: taskId, status: newStatus }));
    const result = await dispatch(updateTask({ id: taskId, patch: { status: newStatus } }));
    if (updateTask.rejected.match(result)) {
      dispatch(taskStatusOptimistic({ id: taskId, status: prev }));
      toast(result.payload || 'Could not move task', 'error');
    }
  };

  const openTask = (task) => dispatch(setSelectedTaskId(task._id));
  const closeTask = () => dispatch(setSelectedTaskId(null));

  // Keep the modal in sync with live socket updates (e.g. another user edits it).
  const liveTask = selectedTask;

  return (
    <Shell>
      {/* Project sub-header inside the global shell */}
      <div className="border-b border-line bg-white/85 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
          {workspaceId && (
            <Link to={`/workspace/${workspaceId}/projects`} className="icon-btn shrink-0" title="Back to projects" aria-label="Back to projects">
              <Icon name="chevronLeft" className="h-5 w-5" />
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-ink">
              {loading ? 'Loading…' : project?.name}
            </h1>
            {project?.description && (
              <p className="truncate text-xs text-body">{project.description}</p>
            )}
          </div>
          {myRole && (
            <span className="ml-auto shrink-0">
              <Badge variant={ROLE_VARIANTS[myRole] || 'slate'}>
                {myRole}
              </Badge>
            </span>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-x-auto p-4 lg:p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8" label="Loading board" />
          </div>
        ) : !project ? (
          <EmptyState icon="board" title="Project not found" hint="It may have been deleted or you don't have access." />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex min-h-[60vh] items-start gap-4">
              {TASK_STATUSES.map((s) => (
                <Column
                  key={s.id}
                  status={s.id}
                  tasks={tasksByStatus(s.id)}
                  onOpen={openTask}
                  onNewTask={() => setNewTaskStatus(s.id)}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <div className="w-[19rem] rotate-2">
                  <TaskCard task={activeTask} onOpen={() => {}} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {newTaskStatus && (
        <NewTaskModal projectId={projectId} status={newTaskStatus} onClose={() => setNewTaskStatus(null)} />
      )}
      {liveTask && (
        <TaskDetail task={liveTask} members={members} onClose={closeTask} />
      )}
    </Shell>
  );
}
