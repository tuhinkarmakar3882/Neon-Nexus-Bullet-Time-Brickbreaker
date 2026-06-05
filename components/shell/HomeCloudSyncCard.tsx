'use client';

import { Link2 } from 'lucide';
import { useAuth } from '@/lib/auth/AuthProvider';
import { NeonButton } from '@/components/shell/AppShell';
import { LucideIcon } from '@/components/shell/LucideIcon';
import { SHELL_COPY } from '@/lib/copy/shell';

function formatSyncTime(ts: number | null): string {
  if (!ts) return 'Never';
  const d = new Date(ts);
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

/** Hub top-middle cloud sync — only rendered when Firebase is configured. */
export function HomeCloudSyncCard() {
  const { user, loading, configured, syncState, signIn, signOut, syncNow } = useAuth();
  const copy = SHELL_COPY.account;

  if (!configured) return null;

  if (loading) {
    return (
      <section className="home-cloud-sync" aria-label={copy.title} aria-busy="true">
        <p className="home-cloud-sync__hint">{copy.loading}</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="home-cloud-sync" aria-labelledby="home-cloud-sync-title">
        <div className="home-cloud-sync__head">
          <LucideIcon icon={Link2} size={14} className="home-cloud-sync__icon" label="" />
          <h2 id="home-cloud-sync-title" className="home-cloud-sync__title">
            {copy.title}
          </h2>
        </div>
        <p className="home-cloud-sync__hint">{copy.guestHint}</p>
        <div className="home-cloud-sync__actions">
          <NeonButton type="button" variant="primary" onClick={() => void signIn()}>
            {copy.enableCloudSync}
          </NeonButton>
        </div>
      </section>
    );
  }

  return (
    <section className="home-cloud-sync home-cloud-sync--signed-in" aria-labelledby="home-cloud-sync-title">
      <div className="home-cloud-sync__head">
        <LucideIcon icon={Link2} size={14} className="home-cloud-sync__icon" label="" />
        <h2 id="home-cloud-sync-title" className="home-cloud-sync__title">
          {copy.title}
        </h2>
      </div>
      <p className="home-cloud-sync__hint">{copy.signedInAs(user.email ?? user.displayName ?? 'Player')}</p>
      <p className="home-cloud-sync__status">
        {syncState.dirty ? copy.syncPending : copy.lastSynced(formatSyncTime(syncState.lastPushedAt))}
      </p>
      {syncState.lastSyncError ? (
        <p className="home-cloud-sync__warn">{syncState.lastSyncError}</p>
      ) : null}
      <div className="home-cloud-sync__actions">
        <NeonButton type="button" variant="secondary" onClick={() => void syncNow()}>
          {copy.syncNow}
        </NeonButton>
        <NeonButton type="button" variant="muted" onClick={() => void signOut()}>
          {copy.signOut}
        </NeonButton>
      </div>
    </section>
  );
}
