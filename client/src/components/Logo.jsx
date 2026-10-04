/**
 * SyncSpace logo: purple rounded-droplet mark + wordmark.
 * `dark` renders the wordmark in white (for dark surfaces like the sidebar).
 */
export function LogoMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M16 2.5c0 0-9.5 11.2-9.5 18a9.5 9.5 0 0 0 19 0c0-6.8-9.5-18-9.5-18Z"
        fill="#4F46E5"
      />
      <path
        d="M16 9.5c0 0-5.2 6.2-5.2 10a5.2 5.2 0 0 0 10.4 0c0-3.8-5.2-10-5.2-10Z"
        fill="#ffffff"
        opacity="0.35"
      />
    </svg>
  );
}

export default function Logo({ dark = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-8 w-8" />
      <span className={`text-lg font-bold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
        SyncSpace
      </span>
    </span>
  );
}
