'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { IconNode } from 'lucide';
import { ChevronRight } from 'lucide';
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
  onTutorial: () => void;
};

function MenuEntry({
  children,
  icon,
  onClick,
  href,
  variant = 'default',
  className = '',
  subtitle,
}: {
  children: ReactNode;
  icon?: IconNode;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'featured' | 'default';
  className?: string;
  subtitle?: string;
}) {
  const cls = ['title-menu__entry', `title-menu__entry--${variant}`, className].filter(Boolean).join(' ');

  const inner = (
    <>
      {icon ? <LucideIcon icon={icon} size={variant === 'primary' ? 22 : 18} className="title-menu__icon" /> : null}
      <span className="title-menu__label-block">
        <span className="title-menu__label">{children}</span>
        {subtitle ? <span className="title-menu__subtitle">{subtitle}</span> : null}
      </span>
      <LucideIcon icon={ChevronRight} size={18} className="title-menu__chevron" aria-hidden />
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

export function TitleMenu({
  run,
  hint,
  installReady,
  onPlay,
  onNewGame,
  onShare,
  onInstall,
  onTutorial,
}: TitleMenuProps) {
  const c = SHELL_COPY.home;
  const brand = SHELL_COPY.brand;

  return (
    <div className="shell-page shell-page--title">
      <WorldBackdrop variant="hub" />
      <button
        type="button"
        className="title-corner-btn title-corner-btn--info"
        onClick={onTutorial}
        aria-label={c.nav.tutorial}
      >
        <LucideIcon icon={HOME_ICONS.tutorial} size={18} className="title-corner-btn__icon" />
        <span className="title-corner-btn__label">{c.nav.tutorial}</span>
      </button>
      <Link
        href={ROUTES.settings}
        className="title-corner-btn title-corner-btn--settings"
        prefetch
        aria-label={c.nav.settings}
      >
        <LucideIcon icon={HOME_ICONS.settings} size={18} className="title-corner-btn__icon" />
        <span className="title-corner-btn__label">{c.nav.settings}</span>
      </Link>

      <div className="title-screen" role="group" aria-label="Game main menu">
        <header className="title-screen__brand">
          <div className="title-screen__emblem" aria-hidden>
            <LucideIcon icon={HOME_ICONS.brand} size={44} className="title-screen__emblem-icon" />
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

        <nav className="title-menu title-menu--premium" aria-label={c.menuLabel}>
          <span className="title-menu__badge">{c.menuLabel}</span>
          <ul className="title-menu__list">
            {run ? (
              <li className="title-menu__item title-menu__item--delay-1">
                <MenuEntry
                  icon={HOME_ICONS.resume}
                  variant="primary"
                  onClick={() => onPlay(true)}
                  className="title-menu__entry--hero"
                  subtitle={c.savedRun(run.level, run.score, run.lives)}
                >
                  {c.nav.resume}
                </MenuEntry>
              </li>
            ) : (
              <li className="title-menu__item title-menu__item--delay-1">
                <MenuEntry
                  icon={HOME_ICONS.play}
                  variant="primary"
                  onClick={() => onPlay(false)}
                  className="title-menu__entry--pulse title-menu__entry--hero"
                >
                  {c.nav.play}
                </MenuEntry>
              </li>
            )}
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
          {run ? (
            <button type="button" className="title-menu__secondary-link" onClick={onNewGame}>
              {c.nav.newGame}
            </button>
          ) : null}
        </nav>

        {hint ? <p className="title-screen__hint">{hint}</p> : null}

        <footer className="title-screen__dock">
          <button type="button" className="title-screen__share-cta" onClick={onShare}>
            <span className="title-screen__share-cta-glow" aria-hidden />
            <LucideIcon icon={HOME_ICONS.share} size={20} className="title-screen__share-cta-icon" />
            <span className="title-screen__share-cta-text">{c.nav.share}</span>
          </button>

          <div className="title-screen__utility-row">
            {installReady ? (
              <button type="button" className="title-screen__utility-pill" onClick={onInstall}>
                <LucideIcon icon={HOME_ICONS.install} size={15} />
                <span>{c.nav.installShort}</span>
              </button>
            ) : (
              <Link href={ROUTES.install} className="title-screen__utility-pill" prefetch>
                <LucideIcon icon={HOME_ICONS.install} size={15} />
                <span>{c.nav.installShort}</span>
              </Link>
            )}
            <Link href={ROUTES.connect} className="title-screen__utility-pill" prefetch>
              <LucideIcon icon={HOME_ICONS.connect} size={15} />
              <span>{c.nav.connectShort}</span>
            </Link>
          </div>

          <div className="title-screen__legal">
            <Link href={ROUTES.terms} className="title-screen__legal-link" prefetch>
              Terms
            </Link>
            <span className="title-screen__legal-sep" aria-hidden>
              ·
            </span>
            <Link href={ROUTES.privacy} className="title-screen__legal-link" prefetch>
              Privacy
            </Link>
          </div>

          <p className="title-screen__version" aria-label={`Version ${APP_VERSION}`}>
            v{APP_VERSION}
          </p>
        </footer>
      </div>
    </div>
  );
}
