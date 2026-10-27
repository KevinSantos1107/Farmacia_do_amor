import { useState, useEffect, useCallback, useRef } from 'react';
import {
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../../services/firebase/config';
import { siteDoc } from '../../../services/firestore/paths';
import { usePlayerIdentityStore } from '../../../store/usePlayerIdentityStore';
import { useSiteConfigStore } from '../../../store/siteConfigStore';
import { getPlayerIds, getPlayerDisplayName } from '../../auth/playerIds';
import { generateSessionPlan, getCardsForType, type CategoryType } from './categories';
import { isSameWord, getRoundTitle } from './syncLogic';
import type { SyncPresenceState, SyncPresenceDoc } from './components/SyncPresenceBeacon';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SyncRoomHistory {
  round: number;
  words: Record<string, string>;
}

export interface SyncRoomResult {
  category: string;
  rounds: number;
  word: string;
  title: string;
}

export interface SyncRoom {
  status: 'inviting' | 'lobby' | 'choosing' | 'playing' | 'revealed' | 'partDone' | 'sessionDone';
  inviteExpiresAt?: number | null;
  turbo: boolean;
  categoryIndex: number;
  hostId: string;
  sessionPlan: CategoryType[];
  cards: string[];
  category: string | null;
  roundNumber: number;
  words: Record<string, string>;
  locked: Record<string, boolean>;
  ready: Record<string, boolean>;
  history: SyncRoomHistory[];
  lastRoundSynced: boolean;
  lastWord: string | null;
  synonymProposal: { by: string } | null;
  endGameProposal?: { by: string } | null;
  leftBy?: string | null;
  leftAt?: number | null;
  skipsLeft: Record<string, number>;
  results: SyncRoomResult[];
  presence: Record<string, number>;
  deadline: number | null;
  playAgainDeadline: number | null;
  nextAt?: number | null;
  recordSaved: boolean;
  updatedAt: unknown;
}

const PRESENCE_INTERVAL_MS = 15_000;
const PRESENCE_ONLINE_THRESHOLD_MS = 35_000;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSyncRoom() {
  const player = usePlayerIdentityStore((s) => s.player);
  const config = useSiteConfigStore((s) => s.config);
  const { p1Id, p2Id } = getPlayerIds(config);

  const [room, setRoom] = useState<SyncRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const roomId = `${p1Id}_${p2Id}`;
  const isPlayer = player === p1Id || player === p2Id;
  const partnerId = player === p1Id ? p2Id : p1Id;

  const partnerName = getPlayerDisplayName(partnerId, config);
  const playerName = getPlayerDisplayName(player, config);
  const playerAvatar = player === p1Id ? config?.couple?.partner1?.avatar : config?.couple?.partner2?.avatar;
  const partnerAvatar = partnerId === p1Id ? config?.couple?.partner1?.avatar : config?.couple?.partner2?.avatar;

  // Stable ref for docRef to avoid re-creating on every render
  const docRefStable = useRef(siteDoc('sync_rooms', roomId));
  useEffect(() => {
    docRefStable.current = siteDoc('sync_rooms', roomId);
  }, [roomId]);

  const [now, setNow] = useState(Date.now());
  const [partnerPresence, setPartnerPresence] = useState<SyncPresenceState>('offline');
  // ── Online/offline tracking ───────────────────────────────────────────────
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // ── 5s ticker for online ghost fix ─────────────────────────────────────────
  useEffect(() => {
    const ticker = setInterval(() => {
      if (!document.hidden) setNow(Date.now());
    }, 5000);
    return () => clearInterval(ticker);
  }, []);

  // ── Snapshot listener + presence heartbeat ────────────────────────────────
  useEffect(() => {
    if (!isPlayer) {
      setError('Abra pelo seu link pessoal para jogar');
      setLoading(false);
      return;
    }

    const ref = siteDoc('sync_rooms', roomId);

    const unsubSnap = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setRoom(snap.data() as SyncRoom);
        } else {
          setRoom(null);
        }
        setLoading(false);
      },
      () => {
        setError('Erro ao carregar a sala');
        setLoading(false);
      },
    );

    const presenceRef = siteDoc('sync_presence', roomId);
    const unsubPresence = onSnapshot(presenceRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SyncPresenceDoc;
        const pId = player === p1Id ? p2Id : p1Id;
        const status = data.presence?.[pId] || 'offline';
        const lastSeen = data.lastSeen?.[pId] || 0;
        // Se o status explicitamente for offline ou se faz mais de 20s sem heartbeat, considera offline
        if (status === 'offline' || Date.now() - lastSeen > 20000) {
          setPartnerPresence('offline');
        } else {
          setPartnerPresence(status);
        }
      } else {
        setPartnerPresence('offline');
      }
    });

    const updatePresence = async () => {
      if (document.hidden || !navigator.onLine) return;
      try {
        await updateDoc(ref, {
          [`presence.${player}`]: Date.now(),
          updatedAt: serverTimestamp(),
        });
      } catch (e: unknown) {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'not-found') {
          const p1 = player;
          const p2 = p1 === p1Id ? p2Id : p1Id;
          await setDoc(ref, {
            status: 'lobby',
            presence: { [p1]: Date.now(), [p2]: 0 },
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }
    };

    updatePresence();
    const presenceInterval = setInterval(updatePresence, PRESENCE_INTERVAL_MS);

    // Pause heartbeat when hidden, resume when visible
    const onVisibility = () => {
      if (!document.hidden) updatePresence();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Clear presence on unmount / pagehide (best-effort)
    const clearPresence = () => {
      if (navigator.onLine) {
        updateDoc(ref, {
          [`presence.${player}`]: 0,
          updatedAt: serverTimestamp(),
        }).catch(() => { /* best-effort */ });
      }
    };
    window.addEventListener('pagehide', clearPresence);

    return () => {
      unsubSnap();
      unsubPresence();
      clearInterval(presenceInterval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', clearPresence);
      clearPresence();
    };
  }, [isPlayer, player, roomId, p1Id, p2Id]);

  // ── Invite auto-expire ────────────────────────────────────────────────────
  const roomStatus = room?.status;
  const inviteExpiresAt = room?.inviteExpiresAt;
  const roomHostId = room?.hostId;

  useEffect(() => {
    if (roomStatus !== 'inviting' || roomHostId !== player) return;
    if (!inviteExpiresAt) return;
    const ref = docRefStable.current;
    const delay = inviteExpiresAt - Date.now();
    const expire = () => {
      runTransaction(db, async (t) => {
        const snap = await t.get(ref);
        if (!snap.exists()) return;
        if (snap.data().status !== 'inviting') return;
        t.update(ref, { status: 'lobby', inviteExpiresAt: null });
      }).catch(() => {});
    };
    if (delay <= 0) { expire(); return; }
    const timer = setTimeout(expire, delay);
    return () => clearTimeout(timer);
  }, [roomStatus, inviteExpiresAt, roomHostId, player]);



  const assertOnline = useCallback(() => {
    if (!navigator.onLine) {
      setActionError('Sem conexão');
      throw new Error('Sem conexão');
    }
  }, []);

  const wrapAction = useCallback(
    (fn: () => Promise<void>) => async () => {
      setActionError(null);
      try {
        await fn();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erro desconhecido';
        setActionError(msg);
      }
    },
    [],
  );

  const getRef = () => docRefStable.current;

  // ── Presence helpers exposed to UI ────────────────────────────────────────

  const isPartnerOnline = useCallback(
    (r: SyncRoom | null): boolean => {
      if (!r) return false;
      const ts = r.presence?.[partnerId];
      if (!ts) return false;
      return now - ts < PRESENCE_ONLINE_THRESHOLD_MS;
    },
    [partnerId, now],
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const startNewSession = useCallback(
    async (turbo: boolean) => {
      assertOnline();
      const plan = generateSessionPlan();
      const initialCards = getCardsForType(plan[0], [], 3);

      await runTransaction(db, async (t) => {
        const snap = await t.get(getRef());
        const currentPresence = snap.exists() && snap.data().presence ? snap.data().presence : { [p1Id]: Date.now(), [p2Id]: 0 };

        if (snap.exists()) {
          const status = snap.data().status;
          if (status && status !== 'lobby' && status !== 'sessionDone') {
            return;
          }
        }

        const isInviting = partnerPresence === 'site';

        const newRoom: SyncRoom = {
          status: isInviting ? 'inviting' : 'choosing',
          inviteExpiresAt: isInviting ? Date.now() + 60000 : null,
          turbo,
          categoryIndex: 0,
          hostId: player,
          sessionPlan: plan,
          cards: initialCards,
          category: null,
          roundNumber: 1,
          words: { [p1Id]: '', [p2Id]: '' },
          locked: { [p1Id]: false, [p2Id]: false },
          ready: { [p1Id]: false, [p2Id]: false },
          history: [],
          lastRoundSynced: false,
          lastWord: null,
          synonymProposal: null,
          leftBy: null,
          leftAt: null,
          skipsLeft: { [p1Id]: 1, [p2Id]: 1 },
          results: [],
          presence: currentPresence,
          deadline: null,
          playAgainDeadline: null,
          recordSaved: false,
          updatedAt: serverTimestamp(),
        };
        t.set(getRef(), newRoom);
      });
    },
    [assertOnline, p1Id, p2Id, partnerPresence, player],
  );

  const cancelInvite = useCallback(async () => {
    assertOnline();
    await runTransaction(db, async (t) => {
      const snap = await t.get(getRef());
      if (!snap.exists()) return;
      if (snap.data().status !== 'inviting') return;
      t.update(getRef(), { status: 'lobby', inviteExpiresAt: null });
    });
  }, [assertOnline]);


  const chooseCategory = useCallback(
    async (selectedCategory: string) => {
      assertOnline();
      await runTransaction(db, async (t) => {
        const snap = await t.get(getRef());
        if (!snap.exists()) return;
        const data = snap.data() as SyncRoom;
        if (data.status !== 'choosing' || data.hostId !== player) return;

        t.update(getRef(), {
          status: 'playing',
          category: selectedCategory,
          roundNumber: 1,
          words: { [p1Id]: '', [p2Id]: '' },
          locked: { [p1Id]: false, [p2Id]: false },
          ready: { [p1Id]: false, [p2Id]: false },
          history: [],
          synonymProposal: null,
          lastRoundSynced: false,
          lastWord: null,
          deadline: data.turbo ? Date.now() + 30_000 : null,
          updatedAt: serverTimestamp(),
        });
      });
    },
    [assertOnline, player, p1Id, p2Id],
  );

  const skipCategory = useCallback(async () => {
    assertOnline();
    await runTransaction(db, async (t) => {
      const snap = await t.get(getRef());
      if (!snap.exists()) return;
      const data = snap.data() as SyncRoom;
      if (data.status !== 'choosing') return;
      
      const remaining = data.skipsLeft?.[player] ?? 0;
      if (remaining <= 0) return;

      const usedCategories = [
        ...data.cards,
        ...(data.results?.map((r) => r.category) ?? []),
      ];
      const newCards = getCardsForType(
        data.sessionPlan[data.categoryIndex],
        usedCategories,
        3,
      );

      t.update(getRef(), {
        [`skipsLeft.${player}`]: remaining - 1,
        cards: newCards,
        updatedAt: serverTimestamp(),
      });
    });
  }, [assertOnline, player]);

  const lockWord = useCallback(
    async (word: string) => {
      assertOnline();
      await runTransaction(db, async (t) => {
        const snap = await t.get(getRef());
        if (!snap.exists()) return;
        const data = snap.data() as SyncRoom;
        if (data.status !== 'playing') return;
        if (data.locked?.[player]) return;

        const newWords = { ...data.words, [player]: word };
        const newLocked = { ...data.locked, [player]: true };
        const bothLocked = newLocked[p1Id] && newLocked[p2Id];

        const updates: Record<string, unknown> = {
          words: newWords,
          locked: newLocked,
          updatedAt: serverTimestamp(),
        };

        if (bothLocked) {
          updates.status = 'revealed';
          updates.deadline = null;

          const w1 = newWords[p1Id] || '';
          const w2 = newWords[p2Id] || '';
          const synced = w1.trim() !== '' && w2.trim() !== '' && isSameWord(w1, w2);

          updates.lastRoundSynced = synced;
          updates.lastWord = synced ? w1 : null;

          if (!synced && data.roundNumber < 6) {
            updates.nextAt = Date.now() + (data.turbo ? 5000 : 8000);
          }
        }

        t.update(getRef(), updates);
      });
    },
    [assertOnline, player, p1Id, p2Id],
  );

  const proposeSynonym = useCallback(async () => {
    assertOnline();
    await runTransaction(db, async (t) => {
      const snap = await t.get(getRef());
      if (!snap.exists()) return;
      const data = snap.data() as SyncRoom;
      if (data.status !== 'revealed') return;
      if (data.synonymProposal) return;
      if (data.lastRoundSynced) return;

      t.update(getRef(), {
        synonymProposal: { by: player },
        nextAt: null,
        updatedAt: serverTimestamp(),
      });
    });
  }, [assertOnline, player]);

  const acceptSynonym = useCallback(async () => {
    assertOnline();
    await runTransaction(db, async (t) => {
      const snap = await t.get(getRef());
      if (!snap.exists()) return;
      const data = snap.data() as SyncRoom;
      if (data.status !== 'revealed') return;
      if (!data.synonymProposal || data.synonymProposal.by === player) return;

      const word = data.words[data.synonymProposal.by] || data.words[player] || '';

      t.update(getRef(), {
        lastRoundSynced: true,
        lastWord: word,
        synonymProposal: null,
        updatedAt: serverTimestamp(),
      });
    });
  }, [assertOnline, player]);

  const rejectSynonym = useCallback(async () => {
    assertOnline();
    await runTransaction(db, async (t) => {
      const snap = await t.get(getRef());
      if (!snap.exists()) return;
      const data = snap.data() as SyncRoom;
      if (data.status !== 'revealed') return;

      t.update(getRef(), {
        synonymProposal: null,
        nextAt: Date.now() + 5000,
        updatedAt: serverTimestamp(),
      });
    });
  }, [assertOnline]);

  const nextRound = useCallback(async () => {
    assertOnline();
    await runTransaction(db, async (t) => {
      const snap = await t.get(getRef());
      if (!snap.exists()) return;
      const data = snap.data() as SyncRoom;
      if (data.status !== 'revealed') return;

      const newReady = { ...data.ready, [player]: true };

      // Only one player ready so far — just mark and return
      if (!newReady[p1Id] || !newReady[p2Id]) {
        t.update(getRef(), { [`ready.${player}`]: true });
        return;
      }

      // Both ready — decide whether to end part or continue
      const currentHistory: SyncRoomHistory[] = [
        ...data.history,
        { round: data.roundNumber, words: data.words },
      ];

      if (data.lastRoundSynced || data.roundNumber >= 6) {
        // Part done
        const synced = data.lastRoundSynced;
        const rounds = synced ? data.roundNumber : 7;
        const word = synced ? (data.lastWord || data.words[p1Id] || '') : '';
        const title = getRoundTitle(data.roundNumber, synced);

        const newResult: SyncRoomResult = {
          category: data.category || '',
          rounds,
          word,
          title,
        };

        const allResults = [...data.results, newResult];
        const nextIdx = data.categoryIndex + 1;

        if (nextIdx >= 5) {
          // Session done
          t.update(getRef(), {
            status: 'sessionDone',
            results: allResults,
            history: currentHistory,
            ready: { [p1Id]: false, [p2Id]: false },
            updatedAt: serverTimestamp(),
          });
        } else {
          // Next category
          const nextHost = data.hostId === p1Id ? p2Id : p1Id;
          const usedCategories = allResults.map((r) => r.category);
          const nextCards = getCardsForType(
            data.sessionPlan[nextIdx],
            usedCategories,
            3,
          );

          t.update(getRef(), {
            status: 'choosing',
            categoryIndex: nextIdx,
            hostId: nextHost,
            cards: nextCards,
            category: null,
            results: allResults,
            history: [],
            ready: { [p1Id]: false, [p2Id]: false },
            lastRoundSynced: false,
            lastWord: null,
            synonymProposal: null,
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        // Next round in current category
        t.update(getRef(), {
          status: 'playing',
          roundNumber: data.roundNumber + 1,
          history: currentHistory,
          words: { [p1Id]: '', [p2Id]: '' },
          locked: { [p1Id]: false, [p2Id]: false },
          ready: { [p1Id]: false, [p2Id]: false },
          synonymProposal: null,
          lastRoundSynced: false,
          lastWord: null,
          deadline: data.turbo ? Date.now() + 30_000 : null,
          updatedAt: serverTimestamp(),
        });
      }
    });
  }, [assertOnline, player, p1Id, p2Id]);

  const triggerTurboOut = useCallback(
    async (expectedRound: number) => {
      assertOnline();
      await runTransaction(db, async (t) => {
        const snap = await t.get(getRef());
        if (!snap.exists()) return;
        const data = snap.data() as SyncRoom;
        // Idempotent: only fire if still on the expected round and deadline passed (with 2s tolerance for clock skew)
        if (data.status !== 'playing') return;
        if (data.roundNumber !== expectedRound) return;
        if (!data.deadline || Date.now() < data.deadline - 2000) return;

        const newWords = { ...data.words };
        if (!data.locked[p1Id]) newWords[p1Id] = '';
        if (!data.locked[p2Id]) newWords[p2Id] = '';

        const w1 = newWords[p1Id] || '';
        const w2 = newWords[p2Id] || '';
        const synced = w1.trim() !== '' && w2.trim() !== '' && isSameWord(w1, w2);

        t.update(getRef(), {
          status: 'revealed',
          locked: { [p1Id]: true, [p2Id]: true },
          words: newWords,
          deadline: null,
          lastRoundSynced: synced,
          lastWord: synced ? w1 : null,
          updatedAt: serverTimestamp(),
        });
      });
    },
    [assertOnline, p1Id, p2Id],
  );

  const saveRecordFlag = useCallback(async (): Promise<boolean> => {
    return runTransaction(db, async (t) => {
      const snap = await t.get(getRef());
      if (!snap.exists()) return false;
      const data = snap.data() as SyncRoom;
      if (data.status !== 'sessionDone' || data.recordSaved) return false;
      t.update(getRef(), { recordSaved: true });
      return true;
    });
  }, []);

  const leaveGame = useCallback(async (targetPlayerId?: string) => {
    assertOnline();
    const leaver = targetPlayerId || player;
    await runTransaction(db, async (t) => {
      const snap = await t.get(getRef());
      if (!snap.exists()) return;
      const data = snap.data() as SyncRoom;
      if (data.status === 'lobby' || data.status === 'sessionDone') {
        t.update(getRef(), { status: 'lobby', leftBy: null, leftAt: null, updatedAt: serverTimestamp() });
        return;
      }
      if (data.leftBy) return; // already left
      
      t.update(getRef(), {
        leftBy: leaver,
        leftAt: Date.now(),
        [`presence.${leaver}`]: 0,
        updatedAt: serverTimestamp(),
      });
    });
  }, [assertOnline, player]);

  const proposeEndGame = useCallback(async () => {
    assertOnline();
    await runTransaction(db, async (t) => {
      const snap = await t.get(getRef());
      if (!snap.exists()) return;
      t.update(getRef(), { endGameProposal: { by: player }, updatedAt: serverTimestamp() });
    });
  }, [assertOnline, player]);

  const acceptEndGame = useCallback(async () => {
    assertOnline();
    await runTransaction(db, async (t) => {
      const snap = await t.get(getRef());
      if (!snap.exists()) return;
      // Ends the game nicely
      t.update(getRef(), { 
        status: 'lobby', 
        endGameProposal: null,
        words: { [p1Id]: '', [p2Id]: '' },
        locked: { [p1Id]: false, [p2Id]: false },
        ready: { [p1Id]: false, [p2Id]: false },
        history: [],
        updatedAt: serverTimestamp() 
      });
    });
  }, [assertOnline, p1Id, p2Id]);

  const rejectEndGame = useCallback(async () => {
    assertOnline();
    await runTransaction(db, async (t) => {
      const snap = await t.get(getRef());
      if (!snap.exists()) return;
      t.update(getRef(), { endGameProposal: null, updatedAt: serverTimestamp() });
    });
  }, [assertOnline]);

  // Fallback for dead tab: if partner hasn't sent presence in 20s
  const deadTabStatus = room?.status;
  const deadTabLeftBy = room?.leftBy;
  const deadTabPartnerTs = room?.presence?.[partnerId] || 0;

  useEffect(() => {
    if (!deadTabStatus || deadTabStatus === 'lobby' || deadTabStatus === 'sessionDone' || deadTabLeftBy) return;
    if (deadTabPartnerTs > 0 && now - deadTabPartnerTs > 20000) {
      leaveGame(partnerId).catch(() => {});
    }
  }, [deadTabStatus, deadTabLeftBy, deadTabPartnerTs, partnerId, now, leaveGame]);

  const returnToGame = useCallback(async () => {
    assertOnline();
    await runTransaction(db, async (t) => {
      const snap = await t.get(getRef());
      if (!snap.exists()) return;
      t.update(getRef(), {
        leftBy: null,
        leftAt: null,
        updatedAt: serverTimestamp(),
      });
    });
  }, [assertOnline]);

  const forceEndGame = useCallback(async () => {
    assertOnline();
    await runTransaction(db, async (t) => {
      const snap = await t.get(getRef());
      if (!snap.exists()) return;
      t.update(getRef(), {
        status: 'lobby',
        leftBy: null,
        leftAt: null,
        updatedAt: serverTimestamp(),
      });
    });
  }, [assertOnline]);

  const playAgain = useCallback(async () => {
    assertOnline();
    await runTransaction(db, async (t) => {
      const snap = await t.get(getRef());
      if (!snap.exists()) return;
      const data = snap.data() as SyncRoom;
      if (data.status !== 'sessionDone') return;

      const newReady = { ...data.ready, [player]: true };

      if (!newReady[p1Id] || !newReady[p2Id]) {
        // First one ready
        t.update(getRef(), {
          [`ready.${player}`]: true,
          playAgainDeadline: Date.now() + 30000,
          updatedAt: serverTimestamp(),
        });
        return;
      }

      // Both ready
      const plan = generateSessionPlan();
      const initialCards = getCardsForType(plan[0], [], 3);
      t.update(getRef(), {
        status: 'choosing',
        turbo: false,
        categoryIndex: 0,
        hostId: p1Id,
        sessionPlan: plan,
        cards: initialCards,
        category: null,
        roundNumber: 1,
        words: { [p1Id]: '', [p2Id]: '' },
        locked: { [p1Id]: false, [p2Id]: false },
        ready: { [p1Id]: false, [p2Id]: false },
        history: [],
        lastRoundSynced: false,
        lastWord: null,
        synonymProposal: null,
        endGameProposal: null,
        skipsLeft: { [p1Id]: 1, [p2Id]: 1 },
        results: [],
        deadline: null,
        playAgainDeadline: null,
        recordSaved: false,
        updatedAt: serverTimestamp(),
      });
    });
  }, [assertOnline, player, p1Id, p2Id]);

  return {
    room,
    loading,
    error,
    actionError,
    isOffline,
    isPlayer,
    player,
    partnerId,
    partnerName,
    playerName,
    playerAvatar,
    partnerAvatar,
    p1Id,
    p2Id,
    now,
    partnerPresence,
    isPartnerOnline,
    startNewSession: wrapAction(() => startNewSession(false)),
    startNewSessionTurbo: wrapAction(() => startNewSession(true)),
    cancelInvite: wrapAction(cancelInvite),
    chooseCategory: async (cat: string) => {
      setActionError(null);
      try { await chooseCategory(cat); } catch (e: unknown) {
        setActionError(e instanceof Error ? e.message : 'Erro');
      }
    },
    skipCategory: wrapAction(skipCategory),
    lockWord: async (word: string) => {
      setActionError(null);
      try { await lockWord(word); } catch (e: unknown) {
        setActionError(e instanceof Error ? e.message : 'Erro');
      }
    },
    proposeSynonym: wrapAction(proposeSynonym),
    acceptSynonym: wrapAction(acceptSynonym),
    rejectSynonym: wrapAction(rejectSynonym),
    nextRound: wrapAction(nextRound),
    triggerTurboOut: async (round: number) => {
      setActionError(null);
      try { await triggerTurboOut(round); } catch (e: unknown) {
        setActionError(e instanceof Error ? e.message : 'Erro');
      }
    },
    saveRecordFlag,
    leaveGame: wrapAction(leaveGame),
    returnToGame: wrapAction(returnToGame),
    forceEndGame: wrapAction(forceEndGame),
    playAgain: wrapAction(playAgain),
    proposeEndGame: wrapAction(proposeEndGame),
    acceptEndGame: wrapAction(acceptEndGame),
    rejectEndGame: wrapAction(rejectEndGame),
  };
}
