'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { HUB_NAV_ENTRIES, HUB_UTILITY_ENTRIES, type HubNavEntry } from '@/lib/shell/navConfig';
import { isExternalHref } from '@/lib/shell/routes';
import { LucideIcon } from '@/components/shell/LucideIcon';

type HubCommandPaletteProps = {
  hasRun: boolean;
  onPlay: (resume: boolean) => void;
  onShare: () => void;
  onInstall: () => void;
  onTutorial: () => void;
  showInstall: boolean;
};

function filterEntries(entries: HubNavEntry[], hasRun: boolean, showInstall: boolean) {
  return entries.filter((e) => {
    if (e.showWhenRun && !hasRun) return false;
    if (e.showWhenNoRun && hasRun) return false;
    if (e.action === 'install' && !showInstall) return false;
    return true;
  });
}

export function HubCommandPalette({
  hasRun,
  onPlay,
  onShare,
  onInstall,
  onTutorial,
  showInstall,
}: HubCommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  useFocusTrap(panelRef, open);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape' && open) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const runAction = (entry: HubNavEntry) => {
    close();
    if (entry.action === 'play') onPlay(false);
    else if (entry.action === 'resume') onPlay(true);
    else if (entry.action === 'share') onShare();
    else if (entry.action === 'install') onInstall();
    else if (entry.action === 'tutorial') onTutorial();
  };

  const all = [
    ...filterEntries(HUB_NAV_ENTRIES, hasRun, showInstall),
    ...filterEntries(HUB_UTILITY_ENTRIES, hasRun, showInstall),
  ];
  const q = query.trim().toLowerCase();
  const filtered = q ? all.filter((e) => e.label.toLowerCase().includes(q) || e.id.includes(q)) : all;

  if (!open) return null;

  return (
    <div className="hub-palette" role="presentation" onClick={close}>
      <div
        ref={panelRef}
        className="hub-palette__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="search"
          className="hub-palette__input"
          placeholder="Search garden actions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-controls="hub-palette-list"
        />
        <ul id="hub-palette-list" className="hub-palette__list" role="listbox">
          {filtered.map((entry) => (
            <li key={entry.id} role="option">
              {entry.href && isExternalHref(entry.href) ? (
                <a
                  href={entry.href}
                  className="hub-palette__item"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={close}
                >
                  <LucideIcon icon={entry.icon} size={18} />
                  <span>{entry.label}</span>
                </a>
              ) : entry.href ? (
                <Link href={entry.href} className="hub-palette__item" prefetch onClick={close}>
                  <LucideIcon icon={entry.icon} size={18} />
                  <span>{entry.label}</span>
                </Link>
              ) : (
                <button type="button" className="hub-palette__item" onClick={() => runAction(entry)}>
                  <LucideIcon icon={entry.icon} size={18} />
                  <span>{entry.label}</span>
                </button>
              )}
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="hub-palette__empty">No matching actions</li>
          ) : null}
        </ul>
        <p className="hub-palette__hint">
          <kbd>⌘</kbd>
          <kbd>K</kbd> toggle · <kbd>Esc</kbd> close
        </p>
      </div>
    </div>
  );
}
