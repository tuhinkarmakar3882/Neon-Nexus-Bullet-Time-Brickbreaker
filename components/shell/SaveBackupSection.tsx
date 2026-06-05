'use client';

import { useCallback, useRef } from 'react';
import { NeonButton } from '@/components/shell/AppShell';
import { useAuth } from '@/lib/auth/AuthProvider';
import { SHELL_COPY } from '@/lib/copy/shell';
import { buildLocalSaveDocument, applySaveDocument } from '@/lib/persistence/saveDocument';
import { getIdToken } from '@/lib/auth/firebaseClient';
import type { PlayerSaveDocument } from '@/lib/persistence/types';

const COPY = SHELL_COPY.account;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export function SaveBackupSection() {
  const { user, signOut } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportSave = useCallback(() => {
    const doc = buildLocalSaveDocument();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neon-nexus-save-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importSave = useCallback(async (file: File) => {
    const text = await file.text();
    const doc = JSON.parse(text) as PlayerSaveDocument;
    applySaveDocument(doc);
    window.dispatchEvent(new CustomEvent('neon:save-synced'));
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!user) return;
    if (!window.confirm('Delete your cloud save and sign out? This cannot be undone.')) return;
    const token = await getIdToken();
    if (token) {
      await fetch(`${API_BASE}/api/saves/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    await signOut();
  }, [user, signOut]);

  return (
    <div className="settings-section__actions">
      <NeonButton type="button" variant="secondary" onClick={exportSave}>
        {COPY.exportSave}
      </NeonButton>
      <NeonButton
        type="button"
        variant="secondary"
        onClick={() => fileRef.current?.click()}
      >
        {COPY.importSave}
      </NeonButton>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importSave(f);
          e.target.value = '';
        }}
      />
      {user ? (
        <NeonButton type="button" variant="danger" onClick={() => void deleteAccount()}>
          {COPY.deleteAccount}
        </NeonButton>
      ) : null}
    </div>
  );
}
