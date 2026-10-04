import { useState } from 'react';
import Shell from '../components/Shell';
import Icon from '../components/Icon';

const PREFS_KEY = 'syncspace_notif_prefs';

const DEFAULT_PREFS = {
  email: true,
  assignments: true,
  comments: true,
  mentions: true,
  projectUpdates: true,
  invitations: true,
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

const MENU = [
  { id: 'account', label: 'Account', icon: 'user' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'privacy', label: 'Privacy', icon: 'shield' },
  { id: 'integrations', label: 'Integrations', icon: 'blocks' },
];

const NOTIF_TOGGLES = [
  ['email', 'Email Notifications'],
  ['assignments', 'Task Assignments'],
  ['comments', 'Comments'],
  ['mentions', 'Mentions'],
  ['projectUpdates', 'Project Updates'],
  ['invitations', 'Workspace Invitations'],
];

/**
 * Settings — two-panel layout per mockup screen 19. Notification prefs
 * persist on this device (localStorage).
 */
export default function Settings() {
  const [section, setSection] = useState('notifications');
  const [prefs, setPrefs] = useState(loadPrefs);

  const setPref = (key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

  const active = MENU.find((m) => m.id === section);

  return (
    <Shell>
      <div className="flex flex-col gap-5 px-4 py-6 lg:flex-row lg:px-8">
        {/* Left: settings nav */}
        <div className="card w-full shrink-0 p-4 lg:w-64">
          <h1 className="mb-3 px-2 text-[18px] font-bold tracking-tight text-ink">
            Settings
          </h1>
          <nav className="space-y-1">
            {MENU.map((item) => {
              const isActive = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition ${
                    isActive
                      ? 'bg-primary-soft text-primary'
                      : 'text-body hover:bg-canvas hover:text-ink'
                  }`}
                >
                  <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: section content */}
        <div className="card min-w-0 flex-1 p-6">
          {section === 'notifications' && (
            <>
              <h2 className="text-[18px] font-bold tracking-tight text-ink">
                Notifications
              </h2>
              <div className="mt-2 divide-y divide-line/70">
                {NOTIF_TOGGLES.map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-4 py-3.5">
                    <span className="text-[13.5px] text-ink">{label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!prefs[key]}
                      aria-label={label}
                      onClick={() => setPref(key, !prefs[key])}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        prefs[key] ? 'bg-primary' : 'bg-[#D9D5E8]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          prefs[key] ? 'left-[22px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {section === 'account' && (
            <>
              <h2 className="text-[18px] font-bold tracking-tight text-ink">Account</h2>
              <p className="mt-3 text-sm leading-relaxed text-body">
                Manage your personal information from the{' '}
                <a href="/profile" className="font-semibold text-primary hover:text-primary-dark">
                  Profile
                </a>{' '}
                page.
              </p>
            </>
          )}

          {section === 'appearance' && (
            <>
              <h2 className="text-[18px] font-bold tracking-tight text-ink">Appearance</h2>
              <p className="mt-3 text-sm leading-relaxed text-body">
                SyncSpace uses the light theme. Dark mode is on the roadmap.
              </p>
            </>
          )}

          {section === 'privacy' && (
            <>
              <h2 className="text-[18px] font-bold tracking-tight text-ink">Privacy</h2>
              <p className="mt-3 text-sm leading-relaxed text-body">
                Your data stays in your workspaces. Only members you invite can
                see your projects, tasks, and files.
              </p>
            </>
          )}

          {section === 'integrations' && (
            <>
              <h2 className="text-[18px] font-bold tracking-tight text-ink">Integrations</h2>
              <p className="mt-3 text-sm leading-relaxed text-body">
                No integrations yet. Google and GitHub sign-in are coming soon.
              </p>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
