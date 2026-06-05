'use client';

import { useEffect, useState } from 'react';
import { TitleMenu } from '@/components/shell/TitleMenu';
import { HubRewardToasts } from '@/components/shell/HubRewardToasts';
import { HubCommandPalette } from '@/components/shell/HubCommandPalette';
import { MetaProgress } from '@/src/systems/MetaProgress.js';
import { TutorialOverlay } from '@/components/shell/TutorialOverlay';
import { SharePreviewModal } from '@/components/shell/SharePreviewModal';
import { FTUE_HOME_STEPS, hasSeenHomeFtue, markHomeFtueSeen } from '@/lib/shell/ftue';
import { useGameMeta } from '@/components/shell/useGameMeta';
import { navigateToPlay } from '@/lib/shell/routes';
import { SHELL_COPY } from '@/lib/copy/shell';
import { RunPersistence } from '@/src/systems/RunPersistence.js';
import {
  canOfferInstall,
  isStandaloneDisplay,
  onInstallPromptReady,
  triggerInstallPrompt,
} from '@/src/systems/InstallPrompt.js';
import { audio } from '@/src/systems/AudioManager.js';
import { SaveManager } from '@/src/systems/SaveManager.js';
import { DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME } from '@/src/config/Constants.js';

export default function HomePage() {
  const { gems, highScore, totalStars, dailyBest, returnStreak, levelsCleared, run, hydrated } = useGameMeta();
  const [hint, setHint] = useState('');
  const [showInstall, setShowInstall] = useState(false);
  const [installPromptReady, setInstallPromptReady] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const c = SHELL_COPY.home;

  useEffect(() => {
    if (!hasSeenHomeFtue()) setShowTutorial(true);
    MetaProgress.recordReturnVisit();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('share') !== '1') return;
    setShowSharePreview(true);
    params.delete('share');
    const q = params.toString();
    window.history.replaceState(null, '', q ? `/?${q}` : '/');
  }, []);

  useEffect(() => {
    const refresh = () => {
      setShowInstall(!isStandaloneDisplay());
      setInstallPromptReady(canOfferInstall());
    };
    refresh();
    const off = onInstallPromptReady(refresh);
    window.addEventListener('appinstalled', refresh);
    return () => {
      off();
      window.removeEventListener('appinstalled', refresh);
    };
  }, []);

  const unlockAudio = () => {
    audio.init();
    audio.gestureUnlock();
    const s = SaveManager.loadSettings();
    audio.applySettings({
      sound: s.sound,
      music: s.music,
      sfxVolume: s.sfxVolume ?? DEFAULT_SFX_VOLUME,
      musicVolume: s.musicVolume ?? DEFAULT_MUSIC_VOLUME,
    });
    audio.setMusicEnabled(s.music);
    if (s.music) audio.setMenuMusic();
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
      <HubRewardToasts />
      <HubCommandPalette
        hasRun={hydrated && !!run}
        onPlay={onPlay}
        onShare={onShare}
        onInstall={onInstall}
        onTutorial={() => setShowTutorial(true)}
        showInstall={showInstall}
      />
      <TitleMenu
        gems={gems}
        highScore={highScore}
        totalStars={totalStars}
        dailyBest={dailyBest}
        returnStreak={returnStreak}
        levelsCleared={levelsCleared}
        run={run}
        hydrated={hydrated}
        hint={hint}
        showInstall={showInstall}
        installPromptReady={installPromptReady}
        onPlay={onPlay}
        onNewGame={onNewGame}
        onShare={onShare}
        onInstall={onInstall}
        onTutorial={() => setShowTutorial(true)}
      />
    </>
  );
}
