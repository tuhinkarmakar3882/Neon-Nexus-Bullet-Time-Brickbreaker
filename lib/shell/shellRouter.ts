/** Client-side navigation bridge — Phaser/JS call sites use this instead of location.href. */
type ShellNavigate = (href: string) => void;

let navigateFn: ShellNavigate | null = null;

export function registerShellRouter(navigate: ShellNavigate): void {
  navigateFn = navigate;
}

export function unregisterShellRouter(): void {
  navigateFn = null;
}

export function shellNavigate(href: string): void {
  if (typeof window === 'undefined') return;
  if (navigateFn) {
    navigateFn(href);
    return;
  }
  // Pre-hydration fallback — Next <Link> renders as <a> until the router is ready.
  window.location.assign(href);
}
