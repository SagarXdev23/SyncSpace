import Logo from './Logo';

/**
 * Auth page shell — exact per mockups: light lavender backdrop with soft
 * decorative shapes, centered white card, logo on top.
 */
export default function AuthLayout({ children, wide = false }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F4F5FB] px-4 py-10">
      {/* Decorative soft shapes */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-10 top-24 h-40 w-24 rounded-[28px] bg-[#E4E6FA] rotate-[24deg]" />
        <div className="absolute -right-8 top-40 h-44 w-24 rounded-[28px] bg-[#E4E6FA] rotate-[-20deg]" />
        <div className="absolute bottom-16 left-[12%] h-28 w-28 rounded-[28px] bg-[#EDEFFE] rotate-[18deg]" />
        <div className="absolute bottom-24 right-[10%] h-32 w-20 rounded-[28px] bg-[#EDEFFE] rotate-[-14deg]" />
        <div className="absolute left-1/2 top-8 h-16 w-40 -translate-x-1/2 rounded-full bg-[#E9EBFB]" />
      </div>
      <div className={`relative w-full ${wide ? 'max-w-md' : 'max-w-[400px]'}`}>
        <div className="rounded-[22px] border border-white bg-white px-8 py-9 shadow-[0_20px_60px_rgba(79,70,229,.10)]">
          <div className="mb-6 flex justify-center">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
