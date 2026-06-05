'use client';

import { useEffect, useState } from 'react';

type ToastDetail = { text: string; ms: number };

/** Lightweight hub toast for native back-exit hints (no Phaser HUD). */
export function ShellHintToast() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      if (!detail?.text) return;
      setMessage(detail.text);
      window.setTimeout(() => setMessage(''), detail.ms ?? 2000);
    };
    window.addEventListener('neon:shell-toast', onToast);
    return () => window.removeEventListener('neon:shell-toast', onToast);
  }, []);

  if (!message) return null;

  return (
    <div className="hub-reward-toasts" aria-live="polite">
      <div className="hub-reward-toast">
        <div className="hub-reward-toast__body">
          <p className="hub-reward-toast__text">{message}</p>
        </div>
      </div>
    </div>
  );
}
