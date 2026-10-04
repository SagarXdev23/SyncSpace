import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Logo from '../components/Logo';
import Avatar from '../components/Avatar';

/** Mini kanban inside the laptop mockup. */
function LaptopScreen() {
  const cols = [
    {
      name: 'To Do',
      tint: 'bg-[#F1F0F7]',
      dot: 'bg-slate-400',
      cards: [
        { t: 'Design homepage', p: 'HIGH', pc: 'bg-red-50 text-red-500' },
        { t: 'Write docs', p: 'LOW', pc: 'bg-emerald-50 text-emerald-600' },
      ],
    },
    {
      name: 'In Progress',
      tint: 'bg-[#FFF4E8]',
      dot: 'bg-statOrange',
      cards: [{ t: 'Implement auth', p: 'MEDIUM', pc: 'bg-amber-50 text-amber-600' }],
    },
    {
      name: 'Completed',
      tint: 'bg-[#EAF7F0]',
      dot: 'bg-statGreen',
      cards: [{ t: 'Setup repo', p: 'LOW', pc: 'bg-emerald-50 text-emerald-600' }],
    },
  ];
  return (
    <div className="rounded-t-xl bg-white px-4 pb-4 pt-3 text-left">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold text-ink">Projects</span>
        <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-white">
          + New
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {cols.map((c) => (
          <div key={c.name} className={`rounded-xl ${c.tint} p-2.5`}>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold text-ink">
              <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
              {c.name}
            </p>
            <div className="space-y-2">
              {c.cards.map((card) => (
                <div key={card.t} className="rounded-lg bg-white p-2 shadow-sm">
                  <p className="text-[10px] font-semibold leading-tight text-ink">{card.t}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${card.pc}`}>
                      {card.p}
                    </span>
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-statPurple text-[7px] font-bold text-white">
                      JD
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FloatBadge({ className = '', icon, iconBg, label }) {
  return (
    <div className={`z-10 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-lift ${className}`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-white ${iconBg}`}>
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="text-xs font-semibold text-ink">{label}</span>
    </div>
  );
}

export default function Landing() {
  useEffect(() => {
    const scrollToHash = () => {
      const target = document.getElementById(window.location.hash.slice(1));
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const frame = window.requestAnimationFrame(scrollToHash);
    window.addEventListener('hashchange', scrollToHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', scrollToHash);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
        <Logo />
        <div className="hidden items-center gap-7 text-sm font-medium text-body md:flex">
          <a href="#features" className="transition hover:text-ink">Features</a>
          <a href="#pricing" className="transition hover:text-ink">Pricing</a>
          <a href="#about" className="transition hover:text-ink">About</a>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link to="/login" className="text-sm font-semibold text-ink transition hover:text-primary">
            Login
          </Link>
          <Link to="/register" className="btn-primary !rounded-[10px]">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-12 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-3.5 py-1.5 text-xs font-semibold text-primary">
          <Icon name="zap" className="h-3.5 w-3.5" />
          All-in-one Workspace
        </span>
        <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-extrabold tracking-tight text-ink md:text-[44px] md:leading-[1.15]">
          Plan, Collaborate, <span className="text-primary">Build Together.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-body">
          SyncSpace brings your teams, tasks, conversations and files into one powerful workspace.
        </p>

        {/* Laptop */}
        <div className="relative mx-auto mt-12 max-w-2xl">
          {/* Floating badges — vertical stack on the left, per mockup */}
          <div className="absolute -left-36 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
            <FloatBadge icon="chat" iconBg="bg-statPurple" label="Team Chat" />
            <FloatBadge icon="check" iconBg="bg-statGreen" label="Tasks" />
            <FloatBadge icon="folder" iconBg="bg-statBlue" label="Projects" />
            <FloatBadge icon="file" iconBg="bg-[#EC4899]" label="File Sharing" />
          </div>

          <div className="relative rounded-2xl border border-line bg-[#E9EBF5] p-3 shadow-lift">
            <div className="overflow-hidden rounded-xl border border-line">
              <LaptopScreen />
            </div>
            <div className="absolute -bottom-10 left-6 z-10 hidden items-center gap-3 rounded-2xl bg-white p-3 pr-5 text-left shadow-lift md:flex">
              <div className="flex -space-x-2">
                {['John Doe', 'Sarah Khan', 'Alex Turner'].map((n) => (
                  <Avatar key={n} name={n} size="sm" className="ring-2 ring-white" />
                ))}
              </div>
              <div>
                <p className="text-xs font-bold text-ink">Team Collaboration</p>
                <p className="text-[11px] text-body">Work together in real time</p>
              </div>
            </div>
          </div>
          <div className="mx-auto h-3 w-[110%] -translate-x-[4.5%] rounded-b-2xl bg-[#D9DCEA]" />
        </div>
      </section>

      {/* Feature strip */}
      <section id="features" className="border-t border-line bg-canvas/60 py-14">
        <div className="mx-auto grid max-w-6xl gap-5 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: 'board', bg: 'bg-statPurple', t: 'Kanban Boards', d: 'Drag-and-drop tasks across To Do, In Progress and Completed.' },
            { icon: 'chat', bg: 'bg-statGreen', t: 'Team Chat', d: 'Real-time conversations per workspace with mentions.' },
            { icon: 'file', bg: 'bg-statBlue', t: 'File Sharing', d: 'Upload and share files with your team in one place.' },
            { icon: 'zap', bg: 'bg-statOrange', t: 'Live Updates', d: 'Presence, notifications and activity streams as they happen.' },
          ].map((f) => (
            <div key={f.t} className="card p-5">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${f.bg}`}>
                <Icon name={f.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-[15px] font-bold">{f.t}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-body">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-6 border-t border-line bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-[1fr_0.8fr] md:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
              About SyncSpace
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
              Less tool switching. More teamwork.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-body">
              SyncSpace is a collaborative workspace built to keep a team&apos;s
              plans and conversations together. Organize work in projects and
              task boards, share updates in workspace chat, and keep files and
              activity close to the work they belong to.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-body">
              It combines a React web app with an API and real-time updates, with
              workspace roles controlling access to shared resources.
            </p>
            <Link to="/register" className="btn-primary mt-6 !rounded-[10px]">
              Try SyncSpace
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: 'board', title: 'Plan', text: 'Projects, boards, priorities, and due dates.' },
              { icon: 'users', title: 'Coordinate', text: 'Workspace membership and role-based access.' },
              { icon: 'chat', title: 'Collaborate', text: 'Persistent chat with live typing and presence.' },
              { icon: 'zap', title: 'Stay updated', text: 'Activity and notifications around team work.' },
            ].map((item) => (
              <div key={item.title} className="card p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon name={item.icon} className="h-4 w-4" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-ink">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-body">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-6 border-t border-line bg-canvas/60 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
            Free to try while SyncSpace is in preview.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-body">
            There are no paid plans or billing in the app right now. Create an
            account and explore the available workspace features at no charge.
          </p>

          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-primary/30 bg-white p-6 text-left shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-ink">Preview</h3>
                <p className="mt-1 text-sm text-body">All currently available features</p>
              </div>
              <p className="text-2xl font-extrabold text-ink">
                Free<span className="sr-only">, no charge</span>
              </p>
            </div>
            <ul className="mt-5 space-y-3 text-sm text-body">
              {[
                'Workspaces, members, and role-based access',
                'Projects, Kanban tasks, and comments',
                'Real-time chat, activity, and notifications',
                'File and profile-photo uploads when Cloudinary is configured',
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-statGreen" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="btn-primary mt-6 w-full !rounded-[10px]"
            >
              Create a free account
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">
            Preview availability and included features may change as the product develops.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">Bring your team together today</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-body">Free to start. No credit card required.</p>
        <Link to="/register" className="btn-primary mx-auto mt-6 !rounded-[10px] !px-8 !py-3 !text-[15px]">
          Get Started Free
        </Link>
      </section>

      <footer className="border-t border-line py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-[13px] text-body">
          <Logo />
          <span>© 2026 SyncSpace. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
