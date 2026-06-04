'use client';

import { useEffect, useState } from 'react';
import { TitleMenu } from '@/components/shell/TitleMenu';
import { TutorialOverlay } from '@/components/shell/TutorialOverlay';
import { SharePreviewModal } from '@/components/shell/SharePreviewModal';
import { FTUE_HOME_STEPS, hasSeenHomeFtue, markHomeFtueSeen } from '@/lib/shell/ftue';
import { useGameMeta } from '@/components/shell/useGameMeta';
import { navigateToPlay } from '@/lib/shell/routes';
import { SHELL_COPY } from '@/lib/copy/shell';
import { RunPersistence } from '@/src/systems/RunPersistence.js';
import {
  canOfferInstall,
  onInstallPromptReady,
  triggerInstallPrompt,
} from '@/src/systems/InstallPrompt.js';
import { audio } from '@/src/systems/AudioManager.js';
import { SaveManager } from '@/src/systems/SaveManager.js';
import { DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME } from '@/src/config/Constants.js';

export default function HomePage() {
  const { gems, highScore, run } = useGameMeta();
  const [hint, setHint] = useState('');
  const [installReady, setInstallReady] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const c = SHELL_COPY.home;

  useEffect(() => {
    if (!hasSeenHomeFtue()) setShowTutorial(true);
  }, []);

  useEffect(() => {
    setInstallReady(canOfferInstall());
    const off = onInstallPromptReady(() => setInstallReady(canOfferInstall()));
    return () => {
      off();
    };
  }, []);

  const unlockAudio = () => {
    audio.init();
    audio.resume();
    const s = SaveManager.loadSettings();
    audio.applySettings({
      sound: s.sound,
      music: s.music,
      sfxVolume: s.sfxVolume ?? DEFAULT_SFX_VOLUME,
      musicVolume: s.musicVolume ?? DEFAULT_MUSIC_VOLUME,
    });
    audio.setMusicEnabled(s.music);
    audio.setMenuMusic();
  };

  const onPlay = (resume: boolean) => {
    unlockAudio();
    navigateToPlay({ resume });
  };

  const onNewGame = () => {
    unlockAudio();
    RunPersistence.clearRun();
    navigateToPlay({ resume: false });
  };

  const onInstall = async () => {
    const { outcome } = await triggerInstallPrompt();
    if (outcome === 'accepted') setHint(c.installAccepted);
    else if (outcome === 'unavailable') setHint(c.installManual);
  };

  const onShare = () => {
    setShowSharePreview(true);
  };

  const closeTutorial = () => {
    markHomeFtueSeen();
    setShowTutorial(false);
  };

  return (
    <>
      {showTutorial ? (
        <TutorialOverlay
          steps={FTUE_HOME_STEPS}
          onComplete={closeTutorial}
          ariaLabel="How to play"
          completeLabel="Enter the garden"
        />
      ) : null}
      {showSharePreview ? (
        <SharePreviewModal
          gems={gems}
          highScore={highScore}
          onClose={() => setShowSharePreview(false)}
        />
      ) : null}
      <TitleMenu
        run={run}
        hint={hint}
        installReady={installReady}
        onPlay={onPlay}
        onNewGame={onNewGame}
        onShare={onShare}
        onInstall={onInstall}
        onTutorial={() => setShowTutorial(true)}
      />
    </>
  );
}
