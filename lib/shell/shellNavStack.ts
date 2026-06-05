/** Session-scoped hub route stack — backs resolve to the previous shell screen. */

const STACK_KEY = 'neon_shell_nav';

function readStack(): string[] {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-24)));
  } catch {
    /* private mode */
  }
}

/** Normalize to trailing-slash paths (matches static export routes). */
export function normalizeShellPath(pathname: string, search = ''): string {
  let path = pathname || '/';
  if (!path.endsWith('/')) path = `${path}/`;
  if (!search) return path;
  return `${path}${search.startsWith('?') ? search : `?${search}`}`;
}

export function recordShellNavigation(pathname: string, search = '') {
  if (typeof window === 'undefined') return;
  if (pathname.startsWith('/play')) return;

  const entry = normalizeShellPath(pathname, search);
  const stack = readStack();
  if (stack[stack.length - 1] === entry) return;
  stack.push(entry);
  writeStack(stack);
}

/** Align stack after browser back/forward. */
export function syncShellStackOnPop(pathname: string, search = '') {
  const entry = normalizeShellPath(pathname, search);
  const stack = readStack();
  const idx = stack.lastIndexOf(entry);
  if (idx >= 0) {
    writeStack(stack.slice(0, idx + 1));
    return;
  }
  recordShellNavigation(pathname, search);
}

/** Drop the current route and return the previous hub path, if any. */
export function popShellNavigation(): string | null {
  const stack = readStack();
  if (stack.length <= 1) return null;
  stack.pop();
  const prev = stack[stack.length - 1] ?? null;
  writeStack(stack);
  return prev;
}
