/** In-game React overlay copy (pause, game over, HUD). */

export const PLAY_COPY = {
  pause: {
    eyebrow: 'Siege halted',
    title: 'Game paused',
    resume: 'RESUME',
    quit: 'QUIT TO MENU',
    adLabel: 'Advertisement',
    hint: 'Press P or Esc to resume',
    stats: {
      level: 'Level',
      score: 'Score',
      combo: 'Combo',
    },
  },
  gameOver: {
    title: 'Game over',
    newBest: 'New personal best',
    score: 'Score',
    best: 'Personal best',
    continue: 'Watch video & continue',
    continueNoAd: 'Continue',
    inventoryContinue: (n: number) =>
      `Use siege continue${n === 1 ? '' : 's'} (${n} left)`,
    restart: 'Restart from level 1',
    menu: 'Main menu',
    shareNewBest: 'Share your new best',
    shareChallenge: 'Challenge friends',
    adLabel: 'Advertisement',
    preparingShare: 'Preparing share card…',
    loadingVideo: 'Loading video…',
    hint: 'Esc — confirm quit to menu',
    quitConfirm: 'Leave the garden? Your current run will end.',
    quitConfirmAction: 'Quit to menu',
    quitCancel: 'Stay',
    quitConfirmHint: 'Esc — cancel',
  },
} as const;
