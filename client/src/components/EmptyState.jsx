import Icon from './Icon';

/** Friendly placeholder for empty lists — honest, helpful voice. */
export default function EmptyState({ icon = 'folder', title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[18px] border border-dashed border-line bg-white/70 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <p className="text-lg font-semibold tracking-tight text-ink">{title}</p>
      {hint && <p className="max-w-sm text-sm text-body">{hint}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
