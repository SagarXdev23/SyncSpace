const VARIANTS = {
  purple: 'bg-primary-soft text-primary-dark',
  amber: 'bg-[#FFF3E0] text-[#C47B12]',
  slate: 'bg-[#F1F0F7] text-body',
  red: 'bg-[#FDE8E8] text-[#D63A3A]',
  green: 'bg-[#E6F7EE] text-[#1F9D57]',
  blue: 'bg-[#E8F1FD] text-[#2B6CB0]',
  orange: 'bg-[#FFF0E6] text-[#C45A12]',
};

export default function Badge({ variant = 'slate', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${VARIANTS[variant] || VARIANTS.slate} ${className}`}
    >
      {children}
    </span>
  );
}

/** Color maps used across the app. */
export const PRIORITY_VARIANTS = { LOW: 'green', MEDIUM: 'amber', HIGH: 'red' };
export const ROLE_VARIANTS = { OWNER: 'purple', ADMIN: 'amber', MEMBER: 'slate' };
export const STATUS_VARIANTS = { TODO: 'slate', IN_PROGRESS: 'amber', COMPLETED: 'green' };
