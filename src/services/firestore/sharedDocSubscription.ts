import {
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type Unsubscribe,
} from 'firebase/firestore';

interface Listener<T> {
  onUpdate: (data: T | null) => void;
  onError?: (err: Error) => void;
}

interface SharedEntry<T> {
  listeners: Set<Listener<T>>;
  hasSnapshot: boolean;
  lastData: T | null;
  unsub: Unsubscribe;
}

const activeSubscriptions = new Map<string, SharedEntry<unknown>>();

/**
 * Compartilha uma única assinatura `onSnapshot` do Firestore entre múltiplos
 * componentes interessados no mesmo documento (ex.: toasts globais + página do jogo).
 * Faz referência contada e encerra o listener automaticamente quando o último assinante sair.
 */
export function subscribeSharedDoc<T>(
  docRef: DocumentReference<DocumentData>,
  onUpdate: (data: T | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const key = docRef.path;
  let entry = activeSubscriptions.get(key) as SharedEntry<T> | undefined;

  const listener: Listener<T> = { onUpdate, onError };

  if (!entry) {
    const listeners = new Set<Listener<T>>([listener]);
    const newEntry: SharedEntry<T> = {
      listeners,
      hasSnapshot: false,
      lastData: null,
      unsub: () => {},
    };

    newEntry.unsub = onSnapshot(
      docRef,
      (snap) => {
        const data = snap.exists() ? (snap.data() as T) : null;
        newEntry.hasSnapshot = true;
        newEntry.lastData = data;
        for (const sub of newEntry.listeners) {
          sub.onUpdate(data);
        }
      },
      (err) => {
        for (const sub of newEntry.listeners) {
          if (sub.onError) sub.onError(err);
        }
      }
    );

    activeSubscriptions.set(key, newEntry as SharedEntry<unknown>);
    entry = newEntry;
  } else {
    entry.listeners.add(listener);
    if (entry.hasSnapshot) {
      onUpdate(entry.lastData);
    }
  }

  return () => {
    const current = activeSubscriptions.get(key) as SharedEntry<T> | undefined;
    if (!current) return;
    current.listeners.delete(listener);
    if (current.listeners.size === 0) {
      current.unsub();
      activeSubscriptions.delete(key);
    }
  };
}
