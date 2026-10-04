import { NavLink } from 'react-router-dom';
import Icon from './Icon';
import { LogoMark } from './Logo';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/workspaces', label: 'Workspaces', icon: 'users' },
  { to: '/projects', label: 'Projects', icon: 'folder' },
  { to: '/tasks', label: 'Tasks', icon: 'check' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/messages', label: 'Messages', icon: 'chat' },
  { to: '/files', label: 'Files', icon: 'file' },
  { to: '/team', label: 'Team', icon: 'users' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
  { to: '/profile', label: 'Profile', icon: 'user' },
];

/**
 * Global dark sidebar — per team mockups (screens 10-14). Logo top,
 * 10 nav items, indigo active pill.
 */
export default function GlobalSidebar({ mobileOpen, onNavigate }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 transform flex-col bg-navy text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex h-16 shrink-0 items-center gap-2 px-5">
        <LogoMark className="h-7 w-7" />
        <span className="text-[17px] font-bold tracking-tight text-white">SyncSpace</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => onNavigate?.()}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition ${
                isActive
                  ? 'bg-primary text-white shadow-[0_4px_14px_rgba(79,70,229,.45)]'
                  : 'text-[#9AA3BE] hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
