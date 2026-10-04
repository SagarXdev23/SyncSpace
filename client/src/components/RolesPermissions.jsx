import Icon from './Icon';

const PERMISSIONS = [
  { label: 'View Projects', owner: true, admin: true, member: true, guest: false },
  { label: 'Create Projects', owner: true, admin: true, member: false, guest: false },
  { label: 'Edit Projects', owner: true, admin: true, member: false, guest: false },
  { label: 'Delete Projects', owner: true, admin: true, member: false, guest: false },
  { label: 'Manage Team', owner: true, admin: true, member: false, guest: false },
  { label: 'View Files', owner: true, admin: true, member: false, guest: false },
  { label: 'Upload Files', owner: true, admin: true, member: false, guest: false },
  { label: 'Delete Files', owner: true, admin: true, member: false, guest: false },
  { label: 'Manage Settings', owner: true, admin: true, member: false, guest: false },
];

const ROLES = [
  { key: 'owner', label: 'Owner' },
  { key: 'admin', label: 'Admin' },
  { key: 'member', label: 'Member' },
  { key: 'guest', label: 'Guest' },
];

function PermIcon({ allowed }) {
  return allowed ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#22C55E]/15">
      <Icon name="check" className="h-3.5 w-3.5 text-[#22C55E]" />
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EF4444]/10">
      <Icon name="x" className="h-3.5 w-3.5 text-[#EF4444]" />
    </span>
  );
}

export default function RolesPermissions() {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight text-ink">Roles & Permissions</h2>
          <p className="mt-1 text-[13px] text-body">Manage what each role can do.</p>
        </div>
        <button type="button" className="btn-primary !rounded-[10px]">
          <Icon name="plus" className="h-4 w-4" />
          Create Role
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
                Permission
              </th>
              {ROLES.map((r) => (
                <th
                  key={r.key}
                  className="px-4 py-3.5 text-center text-[12px] font-semibold uppercase tracking-wide text-muted"
                >
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {PERMISSIONS.map((p) => (
              <tr key={p.label} className="transition hover:bg-canvas/50">
                <td className="px-5 py-3 text-[13.5px] font-medium text-ink">{p.label}</td>
                {ROLES.map((r) => (
                  <td key={r.key} className="px-4 py-3 text-center">
                    <PermIcon allowed={p[r.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
