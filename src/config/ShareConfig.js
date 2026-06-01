/** Share copy + game URL for screenshots and Web Share API. */

const HASHTAGS = '#NeonNexus #BrickBreaker #BulletTime #Jardinains';

/** User-facing pitch — keep in sync with PWA manifest & app metadata. */
export const MARKETING = {
  pitch:
    'Neon Nexus — bullet-time brick breaker with Jardinain garden gnomes, Nexus slow-mo, and 25+ power-ups across tons of levels.',
  hook: 'Bullet-time bricks · 25+ power-ups · Tons of levels',
  badgeIdle: '✦ NEON NEXUS',
};

export function getGameUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  const env = import.meta.env?.VITE_GAME_URL ?? process.env?.VITE_GAME_URL;
  if (env) return String(env).replace(/\/$/, '');
  return 'https://github.com/tuhinkarmakar3882/Neon-Nexus-Bullet-Time-Brickbreaker';
}

function fmt(n) {
  return Number(n ?? 0).toLocaleString();
}

/**
 * @param {'progress'|'gameover'|'levelComplete'} kind
 */
export function buildShareMessage(kind, data = {}) {
  const url = getGameUrl();
  const pitch = MARKETING.pitch;

  if (kind === 'gameover') {
    const score = fmt(data.score);
    const best = fmt(data.highScore);
    const headline = data.isNewBest
      ? `🏆 NEW PERSONAL BEST — ${score} pts`
      : `💥 Siege ended at ${score} pts`;
    return `${headline}\nMy record: ${best}. Think you can top it?\n\n${pitch}\n\n▶ Play free: ${url}\n\n${HASHTAGS}`;
  }

  if (kind === 'levelComplete') {
    const level = data.level ?? 1;
    const score = fmt(data.score);
    const stars = '★'.repeat(data.stars ?? 1);
    const gems = data.gemsEarned != null ? `\n💎 +${fmt(data.gemsEarned)} gems looted` : '';
    return `🌿 Level ${level} CLEARED ${stars}\n${score} points on the board.${gems}\n\n${pitch}\n\n▶ Play free: ${url}\n\n${HASHTAGS}`;
  }

  const gems = fmt(data.gems ?? 0);
  const high = fmt(data.highScore ?? 0);
  const runLine = data.runLevel
    ? `\n⚡ Live siege — Level ${data.runLevel} · ${fmt(data.runScore)} pts`
    : '\n⚡ How far can you push the twilight garden?';
  return `🌿 My Neon Nexus garden is raging\n\n💎 ${gems} gems · 🏆 PB ${high}${runLine}\n\n${pitch}\n\n▶ Play free: ${url}\n\n${HASHTAGS}`;
}

export function shareTitle(kind) {
  if (kind === 'gameover') return 'Neon Nexus — Beat my score?';
  if (kind === 'levelComplete') return 'Neon Nexus — Level cleared!';
  return 'Neon Nexus — Twilight garden siege';
}
