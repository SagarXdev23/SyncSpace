/**
 * Deterministic gradient initial-avatars in the purple family.
 */
const AVATAR_GRADIENTS = [
  ['#6D5DF7', '#4A3FD1'], // primary purple
  ['#8B7CFF', '#5B4EE0'], // light violet
  ['#A78BFA', '#6D5DF7'], // lavender
  ['#7C6CF0', '#4E44C4'], // deep indigo
  ['#9D8DF8', '#6A5AE0'], // periwinkle
  ['#5B4EE0', '#3D33B8'], // royal
];

function gradientFor(name) {
  const str = String(name || '?');
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

export function initialsFor(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Round initial-avatar; falls back to a deterministic purple gradient per name. */
export default function Avatar({ name, src, size = 'md', className = '' }) {
  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
    xl: 'h-20 w-20 text-2xl',
  };
  const [from, to] = gradientFor(name);
  return (
    <div
      title={name}
      role="img"
      aria-label={name || 'User'}
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ${sizes[size] || sizes.md} ${className}`}
    >
      {initialsFor(name)}
      {src && (
        <img
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full rounded-full object-cover"
          onError={(event) => event.currentTarget.remove()}
        />
      )}
    </div>
  );
}
