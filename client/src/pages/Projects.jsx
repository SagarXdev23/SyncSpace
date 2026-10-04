import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../components/Shell';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import api from '../services/api';
import { timeAgo } from '../utils/formatDate';

const TINTS = ['bg-statPurple', 'bg-statOrange', 'bg-statGreen', 'bg-statBlue'];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .get('/projects')
      .then((res) => {
        if (alive) setProjects(res.data?.data || []);
      })
      .catch(() => {
        if (alive) setProjects([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Shell>
      <div className="px-4 py-6 lg:px-8">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Projects</h1>
        <p className="mt-1 text-sm text-body">Every project across your workspaces.</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8" />
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon="folder"
              title="No projects yet"
              hint="Projects live inside workspaces — create one from a workspace to get started."
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p, i) => (
              <Link
                key={p._id}
                to={`/project/${p._id}`}
                className="card block p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${TINTS[i % TINTS.length]}`}
                >
                  <Icon name="folder" className="h-5 w-5 text-white" />
                </div>
                <h2 className="mt-4 truncate text-[15px] font-semibold text-ink">{p.name}</h2>
                <p className="mt-1 truncate text-xs text-muted">
                  {p.workspace?.name || 'Workspace'}
                  <span className="mx-1.5">·</span>
                  Updated {timeAgo(p.updatedAt)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
