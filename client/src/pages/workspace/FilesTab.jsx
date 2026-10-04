import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import Icon from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import { toast } from '../../components/Toast';
import { formatDateTime } from '../../utils/formatDate';

function formatSize(bytes) {
  if (bytes == null || Number.isNaN(Number(bytes))) return '';
  const b = Number(bytes);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

/** Colored type chip per file extension: PDF red, ZIP orange, image green, doc blue. */
function fileChip(filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return { cls: 'bg-[#FDE8E8] text-[#D63A3A]', label: 'PDF' };
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { cls: 'bg-[#FFF0E6] text-[#C45A12]', label: 'ZIP' };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(ext)) return { cls: 'bg-[#E6F7EE] text-[#1F9D57]', label: 'IMG' };
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) return { cls: 'bg-[#E8F1FD] text-[#2B6CB0]', label: 'DOC' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { cls: 'bg-[#E6F7EE] text-[#1F9D57]', label: 'XLS' };
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return { cls: 'bg-primary-soft text-primary-dark', label: 'VID' };
  if (['mp3', 'wav', 'ogg'].includes(ext)) return { cls: 'bg-primary-soft text-primary-dark', label: 'AUD' };
  return { cls: 'bg-[#F1F0F7] text-body', label: (ext || '?').slice(0, 3).toUpperCase() };
}

/**
 * File sharing. Upload flow: client -> backend (multipart field "file") ->
 * Cloudinary -> URL stored in MongoDB. We never store file bytes ourselves.
 */
export default function FilesTab() {
  const { workspaceId } = useParams();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/files/${workspaceId}`);
      setFiles(res.data.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('workspaceId', workspaceId);
      const res = await api.post('/files', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => {
          if (ev.total) setProgress(Math.round((ev.loaded / ev.total) * 100));
        },
      });
      const uploaded = res.data.data;
      if (uploaded) setFiles((prev) => [uploaded, ...prev]);
      toast('File uploaded', 'success');
    } catch (err) {
      // Backend returns 503 when Cloudinary is not configured — surface it honestly.
      toast(err.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const onDelete = async (f) => {
    if (!window.confirm(`Delete "${f.filename}"?`)) return;
    try {
      await api.delete(`/files/${f._id}`);
      setFiles((prev) => prev.filter((x) => String(x._id) !== String(f._id)));
      toast('File deleted', 'success');
    } catch (e) {
      toast(e.response?.data?.message || 'Could not delete file', 'error');
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Files</h2>
        <div className="flex items-center gap-3">
          {uploading && (
            <span className="text-xs text-body">Uploading… {progress}%</span>
          )}
          <input ref={inputRef} type="file" className="hidden" onChange={onUpload} />
          <button
            type="button"
            className="btn-primary"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Spinner className="h-4 w-4" /> : <Icon name="upload" className="h-4 w-4" />}
            Upload file
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" label="Loading files" />
        </div>
      ) : error ? (
        <p className="rounded-xl border border-[#D63A3A]/25 bg-[#FDE8E8] px-4 py-3 text-sm text-[#D63A3A]">
          {error}
        </p>
      ) : files.length === 0 ? (
        <EmptyState
          icon="folder"
          title="No files yet — the shelf is empty."
          hint="Upload docs, designs or anything the team needs. Shared files live here."
        />
      ) : (
        <ul className="space-y-2.5">
          {files.map((f) => {
            const chip = fileChip(f.filename);
            return (
            <li key={f._id} className="card flex items-center gap-3 p-3 transition hover:shadow-lift">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${chip.cls}`}>
                {chip.label}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{f.filename}</p>
                <p className="text-[11px] text-body">
                  {formatSize(f.size)}
                  {f.uploadedBy?.name ? ` · ${f.uploadedBy.name}` : ''}
                  {f.createdAt ? ` · ${formatDateTime(f.createdAt)}` : ''}
                </p>
              </div>
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="icon-btn"
                title="Open / download"
                aria-label={`Download ${f.filename}`}
              >
                <Icon name="download" className="h-4 w-4" />
              </a>
              <button
                type="button"
                className="icon-btn hover:text-[#D63A3A]"
                title="Delete file"
                aria-label={`Delete ${f.filename}`}
                onClick={() => onDelete(f)}
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
