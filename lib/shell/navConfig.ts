import type { IconNode } from 'lucide';
import { ROUTES } from '@/lib/shell/routes';
import { SHELL_COPY } from '@/lib/copy/shell';
import { HOME_ICONS } from '@/lib/shell/homeIcons';

export type HubNavVariant = 'primary' | 'featured' | 'default';

export type HubNavAction =
  | 'play'
  | 'resume'
  | 'newGame'
  | 'share'
  | 'install'
  | 'tutorial';

export type HubNavEntry = {
  id: string;
  label: string;
  icon: IconNode;
  variant: HubNavVariant;
  href?: string;
  action?: HubNavAction;
  /** Shown on primary CTA when a saved run exists */
  showWhenRun?: boolean;
  /** Shown on primary CTA when no saved run */
  showWhenNoRun?: boolean;
};

const c = SHELL_COPY.home.nav;

/** Declarative hub navigation — consumed by TitleMenu and HubCommandPalette. */
export const HUB_NAV_ENTRIES: HubNavEntry[] = [
  {
    id: 'play',
    label: c.play,
    icon: HOME_ICONS.play,
    variant: 'primary',
    action: 'play',
    showWhenNoRun: true,
  },
  {
    id: 'resume',
    label: c.resume,
    icon: HOME_ICONS.resume,
    variant: 'primary',
    action: 'resume',
    showWhenRun: true,
  },
  {
    id: 'codex',
    label: c.codex,
    icon: HOME_ICONS.codex,
    variant: 'featured',
    href: ROUTES.codex,
  },
  {
    id: 'shop',
    label: c.shop,
    icon: HOME_ICONS.shop,
    variant: 'featured',
    href: ROUTES.shop,
  },
  {
    id: 'settings',
    label: c.settings,
    icon: HOME_ICONS.settings,
    variant: 'featured',
    href: ROUTES.settings,
  },
];

export const HUB_UTILITY_ENTRIES: HubNavEntry[] = [
  { id: 'share', label: c.share, icon: HOME_ICONS.share, variant: 'default', action: 'share' },
  { id: 'install', label: c.installShort, icon: HOME_ICONS.install, variant: 'default', action: 'install' },
  { id: 'connect', label: c.connectShort, icon: HOME_ICONS.connect, variant: 'default', href: ROUTES.connect },
  { id: 'tutorial', label: c.tutorial, icon: HOME_ICONS.tutorial, variant: 'default', action: 'tutorial' },
];

export function hubPrimaryEntry(hasRun: boolean): HubNavEntry {
  return HUB_NAV_ENTRIES.find((e) => (hasRun ? e.showWhenRun : e.showWhenNoRun)) ?? HUB_NAV_ENTRIES[0];
}

export function hubFeaturedEntries(): HubNavEntry[] {
  return HUB_NAV_ENTRIES.filter((e) => e.variant === 'featured' && e.href && e.id !== 'settings');
}

export function hubSettingsEntry(): HubNavEntry {
  return HUB_NAV_ENTRIES.find((e) => e.id === 'settings') ?? HUB_NAV_ENTRIES[HUB_NAV_ENTRIES.length - 1];
}
