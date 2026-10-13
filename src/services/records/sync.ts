import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { waitForAuth } from './common';

// ─── Sync Game Records ────────────────────────────────────────────────────────

export interface SyncRecord {
  bestSession: number;
  bestPart: number;
  maxStreak: number;
}

export async function getSyncRecord(): Promise<SyncRecord | null> {
  try {
    const ref = doc(db, 'game_records', 'sync_couple');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      return {
        bestSession: d.bestSession ?? 0,
        bestPart: d.bestPart ?? 0,
        maxStreak: d.maxStreak ?? 0,
      };
    }
    return null;
  } catch (e) {
    console.error('Erro ao ler recorde do Sincronia:', e);
    return null;
  }
}

export async function saveSyncRecordIfBetter(
  total: number,
  bestPart: number,
  maxStreak: number
): Promise<boolean> {
  try {
    await waitForAuth();
    const ref = doc(db, 'game_records', 'sync_couple');
    const snap = await getDoc(ref);

    let updated = false;
    const dataToSave: Record<string, unknown> = { game: 'sync', updatedAt: serverTimestamp() };

    if (snap.exists()) {
      const current = snap.data();
      if (!current.bestSession || total < current.bestSession) {
        dataToSave.bestSession = total;
        updated = true;
      }
      if (!current.bestPart || bestPart < current.bestPart) {
        dataToSave.bestPart = bestPart;
        updated = true;
      }
      if (!current.maxStreak || maxStreak > current.maxStreak) {
        dataToSave.maxStreak = maxStreak;
        updated = true;
      }
    } else {
      dataToSave.bestSession = total;
      dataToSave.bestPart = bestPart;
      dataToSave.maxStreak = maxStreak;
      updated = true;
    }

    if (updated) {
      await setDoc(ref, dataToSave, { merge: true });
      return true;
    }
    return false;
  } catch (e) {
    console.error('Erro ao salvar recorde do Sincronia:', e);
    return false;
  }
}
