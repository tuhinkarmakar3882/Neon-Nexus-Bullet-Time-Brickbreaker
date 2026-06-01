'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { IconNode } from 'lucide';
import { LucideIcon } from '@/components/shell/LucideIcon';
import { WorldBackdrop } from '@/components/shell/WorldBackdrop';
import { ROUTES } from '@/lib/shell/routes';
import { SHELL_COPY } from '@/lib/copy/shell';
import { HOME_ICONS } from '@/lib/shell/homeIcons';
import { APP_VERSION } from '@/src/config/Version.js';

type SavedRun = {
  level: number;
  score: number;
  lives: number;
};

type TitleMenuProps = {
  run: SavedRun | null;
  hint: string;
  installReady: boolean;
  onPlay: (resume: boolean) => void;
  onNewGame: () => void;
  onShare: () => void;
  onInstall: () => void;
};

function MenuEntry({
  children,
  icon,
  onClick,
  href,
  variant = 'default',
  className = '',
}: {
  children: ReactNode;
  icon?: IconNode;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'featured' | 'default';
  className?: string;
}) {
  const cls = ['title-menu__entry', `title-menu__entry--${variant}`, className].filter(Boolean).join(' ');

  const inner = (
    <>
      {icon ? <LucideIcon icon={icon} size={variant === 'primary' ? 22 : 18} className="title-menu__icon" /> : null}
      <span className="title-menu__label">{children}</span>
      <span className="title-menu__chevron" aria-hidden>
        ›
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls} prefetch>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  );
}

function FooterLink({
  children,
  icon,
  href,
  onClick,
}: {
  children: ReactNode;
  icon?: IconNode;
  href?: string;
  onClick?: () => void;
}) {
  const cls = 'title-screen__footer-link';
  const label = (
    <span className="title-screen__footer-label">
      {icon ? <LucideIcon icon={icon} size={14} /> : null}
      <span>{children}</span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={cls} prefetch>
        {label}
      </Link>
    );
  }

  return (
    <button type="button" className={cls} onClick={onClick}>
      {label}
    </button>
  );
}

export function TitleMenu({
  run,
  hint,
  installReady,
  onPlay,
  onNewGame,
  onShare,
  onInstall,
}: TitleMenuProps) {
  const c = SHELL_COPY.home;
  const brand = SHELL_COPY.brand;

  return (
    <div className="shell-page shell-page--title">
      <WorldBackdrop variant="hub" />
      <div className="title-screen" role="group" aria-label="Game main menu">
        <header className="title-screen__brand">
          <div className="title-screen__emblem" aria-hidden>
            <div className="title-screen__emblem-glow" />
            <LucideIcon icon={HOME_ICONS.brand} size={48} className="title-screen__emblem-icon" />
          </div>
          <p className="title-screen__chapter">
            <LucideIcon icon={HOME_ICONS.garden} size={13} className="title-screen__chapter-icon" />
            {c.chapter}
          </p>
          <h1 className="title-screen__logo">
            <span className="title-screen__logo-line">{brand.nameLine1}</span>
            <span className="title-screen__logo-line title-screen__logo-line--accent">{brand.nameLine2}</span>
          </h1>
          <p className="title-screen__tagline">{brand.taglineShort}</p>
        </header>

        {run ? (
          <p className="title-screen__continue" role="status">
            <LucideIcon icon={HOME_ICONS.savedRun} size={15} className="title-screen__continue-icon" />
            <span>{c.savedRun(run.level, run.score, run.lives)}</span>
          </p>
        ) : null}

        <nav className="title-menu" aria-label={c.menuLabel}>
          <span className="title-menu__badge">{c.menuLabel}</span>
          <ul className="title-menu__list">
            {run ? (
              <>
                <li className="title-menu__item title-menu__item--delay-1">
                  <MenuEntry icon={HOME_ICONS.resume} variant="primary" onClick={() => onPlay(true)}>
                    {c.nav.resume}
                  </MenuEntry>
                </li>
                <li className="title-menu__item title-menu__item--delay-2">
                  <MenuEntry icon={HOME_ICONS.newGame} variant="featured" onClick={onNewGame}>
                    {c.nav.newGame}
                  </MenuEntry>
                </li>
              </>
            ) : (
              <li className="title-menu__item title-menu__item--delay-1">
                <MenuEntry
                  icon={HOME_ICONS.play}
                  variant="primary"
                  onClick={() => onPlay(false)}
                  className="title-menu__entry--pulse"
                >
                  {c.nav.play}
                </MenuEntry>
              </li>
            )}
            <li className="title-menu__rule" aria-hidden />
            <li className="title-menu__item title-menu__item--delay-3">
              <MenuEntry icon={HOME_ICONS.codex} variant="featured" href={ROUTES.codex}>
                {c.nav.codex}
              </MenuEntry>
            </li>
            <li className="title-menu__item title-menu__item--delay-4">
              <MenuEntry icon={HOME_ICONS.shop} variant="featured" href={ROUTES.shop}>
                {c.nav.shop}
              </MenuEntry>
            </li>
          </ul>
        </nav>

        {hint ? <p className="title-screen__hint">{hint}</p> : null}

        <footer className="title-screen__footer">
          <FooterLink icon={HOME_ICONS.settings} href={ROUTES.settings}>
            {c.nav.settings}
          </FooterLink>
          <FooterLink icon={HOME_ICONS.share} onClick={onShare}>
            {c.nav.shareShort}
          </FooterLink>
          {installReady ? (
            <FooterLink icon={HOME_ICONS.install} onClick={onInstall}>
              {c.nav.installShort}
            </FooterLink>
          ) : (
            <FooterLink icon={HOME_ICONS.install} href={ROUTES.install}>
              {c.nav.installShort}
            </FooterLink>
          )}
          <FooterLink icon={HOME_ICONS.connect} href={ROUTES.connect}>
            {c.nav.connectShort}
          </FooterLink>
        </footer>

        <p className="title-screen__version" aria-label={`Version ${APP_VERSION}`}>
          v{APP_VERSION}
        </p>
      </div>
    </div>
  );
}
