import { useEffect, useState } from 'react';
import Icon from './Icon';

/**
 * Minimal toast system. Any module can call toast('msg', 'error'|'success'|'info');
 * <ToastHost/> renders them. Auto-dismisses after 4s.
 */
let push = null;
let nextId = 1;

export function toast(message, type = 'info') {
  if (push) push({ id: nextId++, message, type });
  else console.log(`[toast:${type}]`, message); // host not mounted yet
}

const STYLES = {
  success: { icon: 'text-[#1F9D57]' },
  error: { icon: 'text-[#D63A3A]' },
  info: { icon: 'text-primary' },
};

export function ToastHost() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    push = (item) => {
      setItems((prev) => [...prev.slice(-3), item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      }, 4000);
    };
    return () => {
      push = null;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink shadow-pop"
          role="alert"
        >
          <Icon
            name={t.type === 'error' ? 'x' : t.type === 'success' ? 'check' : 'bell'}
            className={`mt-0.5 h-4 w-4 shrink-0 ${(STYLES[t.type] || STYLES.info).icon}`}
          />
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            className="text-muted transition hover:text-ink"
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
