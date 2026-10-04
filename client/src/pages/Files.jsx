import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Shell from '../components/Shell';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { toast } from '../components/Toast';
import api from '../services/api';
import { fetchWorkspaces, selectWorkspaces } from '../features/workspace/workspaceSlice';

function formatSize(bytes) {
  if (bytes === undefined || bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fileIcon(filename = '', mime = '') {
  const ext = String(filename).split('.').pop()?.toLowerCase() || '';
  const m = String(mime).toLowerCase();
  if (ext === 'pdf' || m.includes('pdf')) return { bg: 'bg-[#E5484D]', icon: 'fileText' };
  if (['zip', 'rar', '7z'].includes(ext)) return { bg: 'bg-[#22C55E]', icon: 'archive' };
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext) || m.startsWith('image/'))
    return { bg: 'bg-[#F59E0B]', icon: 'image' };
  if (['doc', 'docx'].includes(ext)) return { bg: 'bg-[#3B82F6]', icon: 'fileText' };
  return { bg: 'bg-[#7C6FF7]', icon: 'file' };
}

export default function Files() {
  const dispatch = useDispatch();
  const workspaces = useSelector(selectWorkspaces);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, [dispatch]);

  const loadFiles = async () => {
    if (!workspaces || workspaces.length === 0) {
      setFiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const all = [];
    await Promise.all(
      workspaces.map(async (w) => {
        try {
          const r = await api.get(`/files/${w._id}`);
          (r.data?.data || []).forEach((f) =>
            all.push({ ...f, workspaceName: w.name, workspaceId: w._id }),
          );
        } catch {
          // skip unreadable workspace
        }
      }),
    );
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setFiles(all);
    setLoading(false);
  };

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces]);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !workspaces.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('workspaceId', workspaces[0]._id);
      await api.post('/files', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast('File uploaded', 'success');
      loadFiles();
    } catch (err) {
      toast(err?.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const deleteFile = async (file) => {
    if (!window.confirm(`Delete "${file.filename}"?`)) return;
    try {
      await api.delete(`/files/${file._id}`);
      setFiles((current) => current.filter((item) => item._id !== file._id));
      toast('File deleted', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Could not delete file', 'error');
    }
  };

  return (
    <Shell>
      <div className="px-4 py-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[22px] font-bold tracking-tight text-ink">Workspace Files</h1>
          <div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={upload}
              aria-label="Upload file"
            />
            <button
              type="button"
              className="btn-primary !rounded-[10px]"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || workspaces.length === 0}
            >
              <Icon name="upload" className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8" label="Loading files" />
          </div>
        ) : files.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon="file"
              title="No files yet"
              hint="Upload a file to get started."
            />
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
                    Name
                  </th>
                  <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
                    Uploader
                  </th>
                  <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
                    Size
                  </th>
                  <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
                    Upload Date
                  </th>
                  <th className="px-4 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wide text-muted">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {files.map((f) => {
                  const { bg, icon } = fileIcon(f.filename, f.mimeType);
                  return (
                    <tr key={f._id} className="transition hover:bg-canvas/50">
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-white ${bg}`}
                          >
                            <Icon name={icon} className="h-4 w-4" />
                          </span>
                          <span className="truncate text-[13.5px] font-semibold text-ink">
                            {f.filename}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-2">
                          <Avatar
                            name={f.uploader?.name || f.uploadedBy?.name || '?'}
                            src={f.uploader?.avatar || f.uploadedBy?.avatar}
                            size="xs"
                          />
                          <span className="text-[13px] text-body">
                            {f.uploader?.name || f.uploadedBy?.name || 'Unknown'}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-body">
                        {formatSize(f.size)}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-body">
                        {formatDate(f.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="flex items-center justify-end gap-1">
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="rounded-lg p-1.5 text-muted transition hover:bg-canvas hover:text-ink"
                            title={`Download ${f.filename}`}
                            aria-label={`Download ${f.filename}`}
                          >
                            <Icon name="download" className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            aria-label={`Delete ${f.filename}`}
                            title={`Delete ${f.filename}`}
                            className="rounded-lg p-1.5 text-muted transition hover:bg-[#FDE8E8] hover:text-[#D63A3A]"
                            onClick={() => deleteFile(f)}
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
