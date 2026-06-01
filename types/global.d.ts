import type Phaser from 'phaser';

export type PlayIntentMode = 'new' | 'resume';

export interface NeonPlayIntent {
  mode: PlayIntentMode;
  extra?: Record<string, unknown>;
  ts?: number;
}

declare global {
  interface Window {
    __NEON?: Phaser.Game;
    __NEON_FLAGS?: { iapEnabled?: boolean };
    __neonGoBack?: () => void;
    __neonInstallPrompt?: BeforeInstallPromptEvent | null;
    __neonPlayIntent?: NeonPlayIntent | null;
    __neonRunResetReason?: string;
    adsbygoogle?: Record<string, unknown>[];
    __googleShowInterstitial?: () => Promise<boolean>;
    __googleShowRewarded?: (placement?: string) => Promise<boolean>;
    __gptShowInterstitial?: (unitPath: string) => Promise<boolean>;
    __gptShowRewarded?: (unitPath: string, placement?: string) => Promise<boolean>;
  }
}

export {};
