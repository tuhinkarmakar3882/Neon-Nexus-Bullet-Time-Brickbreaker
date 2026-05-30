/** Share copy + game URL for screenshots and Web Share API. */

const HASHTAGS = '#NeonNexus #BrickBreaker #IndieGame #Jardinains';

export function getGameUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const path = window.location.pathname
      .replace(/index\.html?$/i, '')
      .replace(/\/$/, '');
    return `${window.location.origin}${path || ''}`;
  }
  const env = import.meta.env.VITE_GAME_URL;
  if (env) return String(env).replace(/\/$/, '');
  return 'https://github.com/tuhinkarmakar3882/Neon-Nexus-Bullet-Time-Brickbreaker';
}

function fmt(n) {
  return Number(n ?? 0).toLocaleString();
}

/**
 * Prebuilt share message with URL (for text + navigator.share url field).
 * @param {'progress'|'gameover'|'levelComplete'} kind
 */
export function buildShareMessage(kind, data = {}) {
  const url = getGameUrl();
  const hook = 'Neon Nexus — bullet-time brick breaker with Jardinains, 27 power-ups & infinite levels.';

  if (kind === 'gameover') {
    const score = fmt(data.score);
    const best = fmt(data.highScore);
    const beat = data.isNewBest ? '🔥 NEW HIGH SCORE! ' : '';
    return `${beat}I scored ${score} in Neon Nexus! Can you beat ${best}?\n\n${hook}\n\n▶ Play free: ${url}\n\n${HASHTAGS}`;
  }

  if (kind === 'levelComplete') {
    const level = data.level ?? 1;
    const score = fmt(data.score);
    const stars = '★'.repeat(data.stars ?? 1);
    const gems = data.gemsEarned != null ? `\n💎 +${data.gemsEarned} gems earned` : '';
    return `Level ${level} CLEARED ${stars} — ${score} pts!${gems}\n\n${hook}\n\n▶ Play free: ${url}\n\n${HASHTAGS}`;
  }

  const gems = fmt(data.gems ?? 0);
  const high = fmt(data.highScore ?? 0);
  const run = data.runLevel
    ? `\n🎮 Current run: Level ${data.runLevel} · ${fmt(data.runScore)} pts`
    : '';
  return `🌿 My Neon Nexus garden siege — ${gems} gems · ${high} high score!${run}\n\n${hook}\n\n▶ Play free: ${url}\n\n${HASHTAGS}`;
}

export function shareTitle(kind) {
  if (kind === 'gameover') return 'Neon Nexus — Can you beat my score?';
  if (kind === 'levelComplete') return 'Neon Nexus — Level cleared!';
  return 'Neon Nexus — Garden Siege';
}
