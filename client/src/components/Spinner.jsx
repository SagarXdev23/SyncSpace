export default function Spinner({ className = 'h-5 w-5', label = 'Loading' }) {
  return (
    <span role="status" aria-label={label} className={`inline-block ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full animate-spin text-primary">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
