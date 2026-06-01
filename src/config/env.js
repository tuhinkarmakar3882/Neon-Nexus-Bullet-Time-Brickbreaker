/** Env bridge — Vite (`import.meta.env`) and Next (`process.env.NEXT_PUBLIC_*`). */

export function getEnv(key, fallback = '') {
  if (typeof import.meta !== 'undefined') {
    const viteVal = import.meta.env?.[key];
    if (typeof viteVal === 'string' && viteVal.length > 0) return viteVal;
  }
  if (typeof process !== 'undefined' && process.env) {
    const direct = process.env[key];
    if (typeof direct === 'string' && direct.length > 0) return direct;
    if (key.startsWith('VITE_')) {
      const nextKey = `NEXT_PUBLIC_${key.slice(5)}`;
      const nextVal = process.env[nextKey];
      if (typeof nextVal === 'string' && nextVal.length > 0) return nextVal;
    }
  }
  return fallback;
}

export function envStr(key, fallback = '') {
  return getEnv(key, fallback);
}

export function envBool(key, fallback = false) {
  const v = getEnv(key, '');
  if (!v) return fallback;
  return v === '1' || v === 'true' || v === 'yes';
}
