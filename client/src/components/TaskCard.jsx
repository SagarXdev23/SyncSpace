import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Icon from './Icon';
import Avatar from './Avatar';
import Badge, { PRIORITY_VARIANTS } from './Badge';
import { dueLabel } from '../utils/formatDate';

/**
 * Draggable kanban card. useSortable id = task._id; the column droppable id is
 * the status string, so onDragEnd can distinguish "dropped on card" vs
 * "dropped on column".
 */
export default function TaskCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const assignedName = task.assignedTo?.name || task.assignedTo?.email;
  const commentCount = task.commentCount ?? task.comments?.length ?? 0;
  const due = dueLabel(task.dueDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab rounded-xl border border-line bg-white p-3.5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpen(task)}
          className="min-w-0 flex-1 text-left text-sm font-semibold text-ink transition hover:text-primary-dark"
        >
          <span className="line-clamp-2">{task.title}</span>
        </button>
        <span
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab p-1 text-muted/60 transition hover:text-body active:cursor-grabbing"
          title="Drag to move"
          aria-label="Drag task"
        >
          <Icon name="grip" className="h-4 w-4" />
        </span>
      </div>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-body">{task.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {task.priority && (
          <Badge variant={PRIORITY_VARIANTS[task.priority] || 'slate'}>
            <Icon name="flag" className="h-3 w-3" />
            {task.priority}
          </Badge>
        )}
        {due && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
              due.overdue ? 'text-[#D63A3A]' : 'text-body'
            }`}
          >
            <Icon name="clock" className="h-3 w-3" />
            {due.text}
          </span>
        )}
        {commentCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-body">
            <Icon name="chat" className="h-3 w-3" />
            {commentCount}
          </span>
        )}
        <span className="ml-auto">
          {assignedName ? (
            <Avatar name={assignedName} src={task.assignedTo?.avatar} size="xs" />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-input text-muted/70">
              <Icon name="user" className="h-3 w-3" />
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
