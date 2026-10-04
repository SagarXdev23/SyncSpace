import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import {
  fetchActivity,
  selectActivity,
} from '../../features/workspace/workspaceSlice';
import { timeAgo } from '../../utils/formatDate';

// Backend stores actions dotted ('task.created'); normalise for lookup/display.
const actionKey = (a) => (a || '').toUpperCase().replace(/[.\-]/g, '_');

// Icon per activity action type (falls back to a generic pulse).
const ACTION_ICONS = {
  WORKSPACE_CREATED: 'zap',
  MEMBER_ADDED: 'users',
  MEMBER_REMOVED: 'x',
  MEMBER_ROLE_CHANGED: 'user',
  WORKSPACE_INVITE: 'mail',
  PROJECT_CREATED: 'board',
  TASK_CREATED: 'plus',
  TASK_ASSIGNED: 'user',
  TASK_COMPLETED: 'check',
  FILE_UPLOADED: 'upload',
  COMMENT_ADDED: 'chat',
};

// Human-readable verb phrase per action; falls back to a prettified key.
const ACTION_LABELS = {
  WORKSPACE_CREATED: 'created this workspace',
  MEMBER_ADDED: 'joined the workspace',
  MEMBER_REMOVED: 'left the workspace',
  MEMBER_ROLE_CHANGED: 'had their role changed',
  WORKSPACE_INVITE: 'was invited to the workspace',
  PROJECT_CREATED: 'created a project',
  TASK_CREATED: 'created a task',
  TASK_ASSIGNED: 'was assigned a task',
  TASK_COMPLETED: 'completed a task',
  FILE_UPLOADED: 'uploaded a file',
  COMMENT_ADDED: 'commented',
};

const actionLabel = (a) =>
  ACTION_LABELS[actionKey(a)] ||
  actionKey(a).toLowerCase().replace(/_/g, ' ');

export default function ActivityTab() {
  const { workspaceId } = useParams();
  const dispatch = useDispatch();
  const activity = useSelector(selectActivity);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    dispatch(fetchActivity(workspaceId)).finally(() => setLoading(false));
  }, [dispatch, workspaceId]);

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-5 text-xl font-semibold tracking-tight text-ink">Activity</h2>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" label="Loading activity" />
        </div>
      ) : activity.length === 0 ? (
        <EmptyState
          icon="activity"
          title="Quiet for now"
          hint="Every team's story starts somewhere — new projects, tasks, members and files will show up here."
        />
      ) : (
        <ol className="relative space-y-4 border-l border-line pl-6">
          {activity.map((a) => (
            <li key={a._id} className="relative">
              <span className="absolute -left-[37px] flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-primary shadow-sm">
                <Icon name={ACTION_ICONS[actionKey(a.action)] || 'zap'} className="h-4 w-4" />
              </span>
              <div className="card p-3.5">
                <p className="text-sm text-ink">
                  <span className="font-semibold">{a.user?.name || 'Someone'}</span>{' '}
                  <span className="text-body">{actionLabel(a.action)}</span>
                  {a.entityName && (
                    <span className="font-medium text-ink"> “{a.entityName}”</span>
                  )}
                </p>
                <p className="mt-1 text-[11px] text-body/70">{timeAgo(a.createdAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
