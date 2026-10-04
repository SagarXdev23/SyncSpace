import { useState } from 'react';
import GlobalSidebar from './GlobalSidebar';
import Topbar from './Topbar';

/**
 * Global app shell: dark sidebar + topbar + content. All global pages
 * (Dashboard, Workspaces, Projects, Tasks, Calendar, Messages, Files,
 * Notifications, Profile) render inside this.
 */
export default function Shell({ children, onSearch, searchPlaceholder }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-canvas">
      <GlobalSidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-navy/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onMenu={() => setMobileOpen(true)}
          onSearch={onSearch}
          searchPlaceholder={searchPlaceholder}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
