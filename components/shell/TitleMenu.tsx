'use client';

import type { ReactNode } from 'react';
import type { IconNode } from 'lucide';
import { ChevronRight } from 'lucide';
import { LucideIcon } from '@/components/shell/LucideIcon';
import { WorldBackdrop } from '@/components/shell/WorldBackdrop';
import { ROUTES } from '@/lib/shell/routes';
import { SHELL_COPY } from '@/lib/copy/shell';
import { HOME_ICONS } from '@/lib/shell/homeIcons';
import { hubFeaturedEntries, hubPrimaryEntry, hubSettingsEntry } from '@/lib/shell/navConfig';
import { APP_VERSION } from '@/src/config/Version.js';

import { ProgressStrip } from '@/components/shell/ProgressStrip';
import { HomeCloudSyncCard } from '@/components/shell/HomeCloudSyncCard';

type SavedRun = {
  level: number;
  score: number;
  lives: number;
};

type TitleMenuProps = {
  gems: number;
  highScore: number;
  totalStars: number;
  dailyBest: number;
  returnStreak?: number;
  levelsCleared?: number;
  run: SavedRun | null;
  hydrated?: boolean;
  hint: string;
  showInstall: boolean;
  installPromptReady: boolean;
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
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }

  return (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  );
}

export function TitleMenu({
  gems,
  highScore,
  totalStars,
  dailyBest,
  returnStreak = 0,
  levelsCleared = 0,
  run,
  hydrated = false,
  hint,
  showInstall,
  installPromptReady,
  onPlay,
  onNewGame,
  onShare,
  onInstall,
  onTutorial,
}: TitleMenuProps) {
  const c = SHELL_COPY.home;
  const brand = SHELL_COPY.brand;
  const savedRun = hydrated ? run : null;
  const primary = hubPrimaryEntry(!!savedRun);
  const featured = hubFeaturedEntries();
  const settings = hubSettingsEntry();
  const showGemPromise = hydrated && levelsCleared === 0;
  const showStreak = hydrated && (returnStreak ?? 0) > 1;

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

      <a
        href={ROUTES.settings}
        className="title-corner-btn title-corner-btn--settings"
        aria-label={settings.label}
      >
        <LucideIcon icon={settings.icon} size={18} className="title-corner-btn__icon" />
        <span className="title-corner-btn__label">{settings.label}</span>
      </a>

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

        <ProgressStrip
          gems={gems}
          highScore={highScore}
          totalStars={totalStars}
          dailyBest={dailyBest}
          returnStreak={returnStreak}
          compact
          hydrated={hydrated}
        />

        <HomeCloudSyncCard />

        {showGemPromise ? (
          <p className="title-screen__gem-promise" aria-label="First clear earns gems">
            <LucideIcon icon={HOME_ICONS.gems} size={14} className="title-screen__gem-promise-icon" />
            Clear your first level to earn gems for Garden Shop
          </p>
        ) : null}

        {showStreak ? (
          <p className="title-screen__streak-badge" aria-label={`${returnStreak} day return streak`}>
            <LucideIcon icon={HOME_ICONS.streak} size={14} />
            {returnStreak}-day garden streak
          </p>
        ) : null}

        <nav className="title-menu title-menu--premium" aria-label={c.menuLabel}>
          <span className="title-menu__badge">{c.menuLabel}</span>
          <ul className="title-menu__list">
            <li className="title-menu__item title-menu__item--delay-1">
              <MenuEntry
                icon={primary.icon}
                variant="primary"
                onClick={() => onPlay(!!savedRun)}
                className={`title-menu__entry--hero${savedRun ? '' : ' title-menu__entry--pulse'}`}
                subtitle={savedRun ? c.savedRun(savedRun.level, savedRun.score, savedRun.lives) : undefined}
              >
                {primary.label}
              </MenuEntry>
            </li>
            {featured.map((entry, i) => (
              <li key={entry.id} className={`title-menu__item title-menu__item--delay-${i + 3}`}>
                <MenuEntry icon={entry.icon} variant="featured" href={entry.href}>
                  {entry.label}
                </MenuEntry>
              </li>
            ))}
          </ul>
          {savedRun ? (
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
            {showInstall ? (
              installPromptReady ? (
                <button type="button" className="title-screen__utility-pill" onClick={onInstall}>
                  <LucideIcon icon={HOME_ICONS.install} size={15} />
                  <span>{c.nav.installShort}</span>
                </button>
              ) : (
                <a href={ROUTES.install} className="title-screen__utility-pill">
                  <LucideIcon icon={HOME_ICONS.install} size={15} />
                  <span>{c.nav.installShort}</span>
                </a>
              )
            ) : null}
            <a href={ROUTES.connect} className="title-screen__utility-pill">
              <LucideIcon icon={HOME_ICONS.connect} size={15} />
              <span>{c.nav.connectShort}</span>
            </a>
          </div>

          <div className="title-screen__legal">
            <a href={ROUTES.terms} className="title-screen__legal-link">
              Terms
            </a>
            <span className="title-screen__legal-sep" aria-hidden>
              ·
            </span>
            <a href={ROUTES.privacy} className="title-screen__legal-link">
              Privacy
            </a>
          </div>

          <p className="title-screen__version" aria-label={`Version ${APP_VERSION}`}>
            v{APP_VERSION}
          </p>
        </footer>
      </div>
    </div>
  );
}
