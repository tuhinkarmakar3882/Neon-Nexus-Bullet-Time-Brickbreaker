'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { HOW_TO_PLAY } from '@/src/config/HowToPlay.js';
import {
  POWERS,
  POWER_KEYS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  categoryColor,
  powerDisplayName,
} from '@/src/config/PowerUps.js';
import { GNOME_TIERS } from '@/src/config/GnomeTiers.js';
import { MetaProgress } from '@/src/systems/MetaProgress.js';
import { cssHex } from '@/src/config/Palette.js';
import { SHELL_COPY } from '@/lib/copy/shell';
import { PremiumLoader } from '@/components/shell/PremiumLoader';
import { SegmentedControl } from '@/components/shell/SegmentedControl';
import { codexDiscovery } from '@/lib/shell/progression';

const TABS = [
  { id: 'guide', label: SHELL_COPY.codex.tabs.guide },
  { id: 'powers', label: SHELL_COPY.codex.tabs.powers },
  { id: 'bestiary', label: SHELL_COPY.codex.tabs.bestiary },
  { id: 'journal', label: SHELL_COPY.codex.tabs.journal },
] as const;

function CodexContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '';
  const [tab, setTab] = useState('guide');
  const archive = codexDiscovery();

  return (
    <AppShell title={HOW_TO_PLAY.title} subtitle={HOW_TO_PLAY.subtitle} from={from} tone="codex">
      <div className="codex-terminal-bar">
        <span>
          DISCOVERY · <strong>{archive.pct}%</strong> UNLOCKED
        </span>
        <span>
          POWERS {archive.powersFound}/{archive.powerTotal} · GNOMES {archive.gnomesFound}/
          {archive.gnomeTotal}
        </span>
      </div>

      <SegmentedControl
        idPrefix="codex"
        options={TABS.map((t) => t.id)}
        value={tab}
        onChange={setTab}
        formatLabel={(id) => TABS.find((t) => t.id === id)?.label ?? id}
        ariaLabel="Codex sections"
      />

      <div className="shell-scroll-panel codex-section">
        <div
          id="codex-panel-guide"
          role="tabpanel"
          aria-labelledby="codex-tab-guide"
          hidden={tab !== 'guide'}
        >
        {tab === 'guide' && (
          <>
            <h3>BASICS</h3>
            <ul>
              {HOW_TO_PLAY.basics.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {HOW_TO_PLAY.sections.map((sec) => (
              <div key={sec.title}>
                <h3>{sec.title}</h3>
                <ul>
                  {sec.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
            <h3>GNOME TIERS</h3>
            <ul>
              {HOW_TO_PLAY.gnomeTiers.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        )}
        </div>

        <div
          id="codex-panel-powers"
          role="tabpanel"
          aria-labelledby="codex-tab-powers"
          hidden={tab !== 'powers'}
        >
        {tab === 'powers' && CATEGORY_ORDER.map((catId: string) => {
          const keys = POWER_KEYS.filter((k) => POWERS[k as keyof typeof POWERS].category === catId);
          if (!keys.length) return null;
          const cat = categoryColor(catId);
          return (
            <div key={catId}>
              <h3 style={{ color: cssHex(cat) }}>{(CATEGORY_LABELS[catId as keyof typeof CATEGORY_LABELS] ?? catId).toUpperCase()}</h3>
              {keys.map((key) => {
                const def = POWERS[key as keyof typeof POWERS];
                return (
                  <div key={key} className="shop-row" style={{ borderLeft: `4px solid ${cssHex(cat)}` }}>
                    <div className="shop-row-main">
                      <div className="shop-row-title">{powerDisplayName(key)}</div>
                      <div className="shop-row-desc">{def.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        </div>

        <div
          id="codex-panel-bestiary"
          role="tabpanel"
          aria-labelledby="codex-tab-bestiary"
          hidden={tab !== 'bestiary'}
        >
        {tab === 'bestiary' && (
          <>
            {Object.entries(GNOME_TIERS).map(([id, info]) => {
              const unlocked = MetaProgress.getCodex().gnomes?.includes(id);
              return (
                <div
                  key={id}
                  className="shop-row"
                  style={{ opacity: unlocked ? 1 : 0.55 }}
                  aria-disabled={!unlocked}
                  aria-label={unlocked ? undefined : `${info.label ?? id} — locked`}
                >
                  <div className="shop-row-main">
                    <div className="shop-row-title">{info.label ?? id}</div>
                    <p className="shop-row-desc">
                      {unlocked
                        ? `Projectiles: ${(info.projectiles ?? ['pot']).join(', ')}${info.tracking ? ' · tracking shots' : ''}`
                        : 'Locked — defeat this tier to unlock.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </>
        )}
        </div>

        <div
          id="codex-panel-journal"
          role="tabpanel"
          aria-labelledby="codex-tab-journal"
          hidden={tab !== 'journal'}
        >
        {tab === 'journal' && (() => {
          const stats = MetaProgress.getStats();
          const achievements = MetaProgress.getJournalAchievements();
          return (
            <>
              <h3>STATS</h3>
              <ul>
                <li>{SHELL_COPY.codex.stats.games}: {stats.gamesPlayed ?? 0}</li>
                <li>{SHELL_COPY.codex.stats.bricks}: {(stats.bricksCleared ?? 0).toLocaleString()}</li>
                <li>{SHELL_COPY.codex.stats.gnomes}: {(stats.gnomesPopped ?? 0).toLocaleString()}</li>
                <li>{SHELL_COPY.codex.stats.combo}: ×{stats.maxCombo ?? 1}</li>
              </ul>
              <h3>ACHIEVEMENTS</h3>
              {achievements.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{SHELL_COPY.codex.journalEmpty}</p>
              ) : (
                <ul>
                  {achievements.map((a) => (
                    <li key={a.id} style={{ opacity: a.done ? 1 : 0.55 }}>
                      <strong>{a.label}</strong>
                      {a.done ? ' ✓' : ''}
                    </li>
                  ))}
                </ul>
              )}
            </>
          );
        })()}
        </div>
      </div>
    </AppShell>
  );
}

export default function CodexPage() {
  return (
    <Suspense fallback={<PremiumLoader compact />}>
      <CodexContent />
    </Suspense>
  );
}
