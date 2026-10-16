import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useSyncRoom } from './useSyncRoom';
import { Lobby } from './components/Lobby';
import { ChooseCard } from './components/ChooseCard';
import { WordInput } from './components/WordInput';
import { Reveal } from './components/Reveal';
import { SessionResult } from './components/SessionResult';
import { getSyncRecord, saveSyncRecordIfBetter } from '../../../services/gameRecords';

export function SyncGame({ onClose, registerLeaveGame }: { onClose: () => void; registerLeaveGame?: (fn: (() => void) | null) => void }) {
  const {
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
    isPartnerOnline,
    partnerPresence,
    startNewSession,
    startNewSessionTurbo,
    cancelInvite,
    chooseCategory,
    skipCategory,
    lockWord,
    proposeSynonym,
    acceptSynonym,
    rejectSynonym,
    nextRound,
    triggerTurboOut,
    saveRecordFlag,
    leaveGame,
    returnToGame,
    forceEndGame,
    playAgain,
    proposeEndGame,
    acceptEndGame,
    rejectEndGame,
  } = useSyncRoom();

  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const [partnerLeftTimeout, setPartnerLeftTimeout] = useState(30);

  // Register leaveGame with the modal so the X button can trigger it
  // Only register when in an active game (not lobby/sessionDone)
  const isInGame = !!room && room.status !== 'lobby' && room.status !== 'sessionDone' && room.status !== 'inviting' && !room.leftBy;
  useEffect(() => {
    if (!registerLeaveGame) return;
    if (isInGame) {
      registerLeaveGame(leaveGame);
    } else {
      registerLeaveGame(null);
    }
  }, [isInGame, leaveGame, registerLeaveGame]);

  useEffect(() => {
    if (room?.leftBy !== partnerId) {
      setPartnerLeftTimeout(30);
      return;
    }
    const interval = setInterval(() => {
      setPartnerLeftTimeout((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          forceEndGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.leftBy, partnerId, forceEndGame]);

  // If WE left, and we are mounting the modal, we automatically clear it!
  // This satisfies "ReturnToGameToast clicked -> opens modal -> returns to game"
  useEffect(() => {
    if (room?.leftBy === player) {
      returnToGame();
    }
  }, [room?.leftBy, player, returnToGame]);

  // Load previous best on mount
  useEffect(() => {
    getSyncRecord().then((rec) => {
      if (rec) setPreviousBest(rec.bestSession);
    });
  }, []);

  // Save record when session done
  useEffect(() => {
    if (!room || room.status !== 'sessionDone' || room.recordSaved) return;

    const total = room.results.reduce((sum, r) => sum + r.rounds, 0);
    const bestPart = Math.min(...room.results.map((r) => r.rounds));

    let maxStreak = 0;
    let currentStreak = 0;
    for (const r of room.results) {
      if (r.rounds <= 2) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    saveRecordFlag().then((shouldSave) => {
      if (shouldSave) {
        saveSyncRecordIfBetter(total, bestPart, maxStreak).then(() => {
          setPreviousBest((prev) =>
            prev === null ? total : Math.min(prev, total),
          );
        });
      }
    });
  }, [room, saveRecordFlag]);


  // Play again timeout checker
  const isSessionDone = room?.status === 'sessionDone';
  const playAgainDeadline = room?.playAgainDeadline;
  useEffect(() => {
    if (!isSessionDone || !playAgainDeadline) return;
    const interval = setInterval(() => {
      if (Date.now() > playAgainDeadline) {
        forceEndGame();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isSessionDone, playAgainDeadline, forceEndGame]);

  // ── Auto-advance on non-synced revealed rounds (2.3) ──────────────────────
  const autoAdvanceRef = useRef(false);
  useEffect(() => {
    autoAdvanceRef.current = false;
  }, [room?.roundNumber, room?.status]);

  const isRevealed = room?.status === 'revealed';
  const lastRoundSynced = room?.lastRoundSynced;
  const roundNumber = room?.roundNumber ?? 0;
  const hasSynonymProposal = !!room?.synonymProposal;
  const nextAt = room?.nextAt;

  useEffect(() => {
    if (!isRevealed) return;
    // Only auto-advance on non-synced rounds 1–5
    if (lastRoundSynced) return;
    if (roundNumber >= 6) return;
    // Pause if synonym proposal pending
    if (hasSynonymProposal) return;
    if (!nextAt) return;

    const remaining = Math.max(0, nextAt - now);
    if (remaining <= 0 && !autoAdvanceRef.current) {
      autoAdvanceRef.current = true;
      nextRound();
    }
  }, [isRevealed, lastRoundSynced, roundNumber, hasSynonymProposal, nextAt, now, nextRound]);

  // ── Vibrate when partner locks ─────────────────────────────────────────────
  const partnerLockedRef = useRef(false);
  const isPlaying = room?.status === 'playing';
  const partnerNowLocked = room?.locked?.[partnerId] ?? false;
  useEffect(() => {
    if (!isPlaying) {
      partnerLockedRef.current = false;
      return;
    }
    if (partnerNowLocked && !partnerLockedRef.current) {
      navigator.vibrate?.(30);
    }
    partnerLockedRef.current = partnerNowLocked;
  }, [isPlaying, partnerNowLocked]);

  // ── WaitingFor items builder ───────────────────────────────────────────────
  const buildWaitingItems = useCallback(
    (playerDone: boolean, partnerDone: boolean) => [
      { id: player, name: playerName, avatarUrl: playerAvatar, done: playerDone },
      { id: partnerId, name: partnerName, avatarUrl: partnerAvatar, done: partnerDone },
    ],
    [player, partnerId, playerName, partnerName, playerAvatar, partnerAvatar],
  );

  // ── Loading / error states ────────────────────────────────────────────────

  if (!isPlayer) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-12">
        <p className="text-white/60 text-sm text-center">
          {error || 'Abra pelo seu link pessoal para jogar'}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--theme-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  // ── Overlays and banners ──────────────────────────────────────────────────

  const offlineBanner = isOffline ? (
    <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-center">
      <span className="text-red-400 text-xs">Sem conexão — as ações estão desativadas</span>
    </div>
  ) : null;

  const errorBanner = actionError ? (
    <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-center">
      <span className="text-red-400 text-xs">{actionError}</span>
    </div>
  ) : null;



  const partnerLeftBanner = room?.leftBy === partnerId ? (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
          {partnerAvatar ? (
            <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover rounded-full opacity-50 grayscale" />
          ) : (
            <span className="text-2xl opacity-50">{partnerName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <h3 className="text-xl font-bold text-white">{partnerName} saiu.</h3>
        <p className="text-white/60 text-sm">
          Aguardando retorno... ({partnerLeftTimeout}s)
        </p>
        <button
          onClick={forceEndGame}
          className="mt-4 w-full py-3 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all"
        >
          Encerrar Partida
        </button>
      </motion.div>
    </div>
  ) : null;

  // The in-game "leave" button proposes an end.
  // The X of the modal calls leaveGame directly (registered via registerLeaveGame).
  const endGameButton = room && room.status !== 'lobby' && room.status !== 'sessionDone' && room.status !== 'inviting' && !room.leftBy ? (
    <button
      onClick={proposeEndGame}
      className="sticky top-2 self-end mr-2 p-2 rounded-full text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors z-40"
      title="Sair da partida"
      aria-label="Sair da partida"
    >
      <LogOut className="w-5 h-5" />
    </button>
  ) : null;

  // Overlay for endGameProposal
  let exitConfirmOverlay = null;
  if (room && room.endGameProposal) {
    const isSender = room.endGameProposal.by === player;
    exitConfirmOverlay = (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center"
        >
          {isSender ? (
            <>
              <h3 className="text-xl font-bold text-white">Aguardando...</h3>
              <p className="text-white/60 text-sm">
                Esperando resposta de {partnerName} para encerrar a partida.
              </p>
              <button
                onClick={rejectEndGame}
                className="mt-2 w-full py-3 rounded-xl text-sm font-semibold text-white/70 bg-white/5 hover:bg-white/10 transition-all"
              >
                Cancelar pedido
              </button>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-white">Encerrar partida?</h3>
              <p className="text-white/60 text-sm">
                {partnerName} pediu para encerrar a partida. Aceitar?
              </p>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={rejectEndGame}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/70 bg-white/5 hover:bg-white/10 transition-all"
                >
                  Continuar jogando
                </button>
                <button
                  onClick={() => {
                    acceptEndGame();
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all"
                >
                  Encerrar
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  // ── No room: Lobby ────────────────────────────────────────────────────────

  if (!room || !room.status || room.status === 'lobby' || room.status === 'inviting') {
    return (
      <div className="flex-1 flex flex-col">
        {offlineBanner}
        {errorBanner}
        <Lobby
          playerName={playerName}
          partnerName={partnerName}
          playerAvatar={playerAvatar}
          partnerAvatar={partnerAvatar}
          isPartnerOnline={room ? isPartnerOnline(room) : false}
          partnerPresence={partnerPresence}
          isInviting={room?.status === 'inviting' && room?.hostId === player}
          onStart={startNewSession}
          onStartTurbo={startNewSessionTurbo}
          onCancelInvite={cancelInvite}
        />
      </div>
    );
  }

  // ── Views ─────────────────────────────────────────────────────────────────

  const renderView = () => {
    switch (room.status) {
      case 'choosing':
        return (
          <ChooseCard
            cards={room.cards || []}
            isHost={room.hostId === player}
            hostName={room.hostId === player ? playerName : partnerName}
            canSkip={(room.skipsLeft?.[player] ?? 0) > 0}
            categoryIndex={room.categoryIndex}
            onChoose={chooseCategory}
            onSkip={skipCategory}
            waitingItems={buildWaitingItems(room.hostId === player, room.hostId === partnerId)}
          />
        );
      case 'playing':
        return (
          <WordInput
            category={room.category || ''}
            roundNumber={room.roundNumber}
            isLocked={room.locked?.[player] ?? false}
            partnerLocked={room.locked?.[partnerId] ?? false}
            history={room.history || []}
            deadline={room.deadline}
            onLock={lockWord}
            onTurboOut={triggerTurboOut}
            waitingItems={buildWaitingItems(
              room.locked?.[player] ?? false,
              room.locked?.[partnerId] ?? false,
            )}
          />
        );
      case 'revealed': {
        const autoAdvanceMs = room.nextAt && !room.lastRoundSynced && room.roundNumber < 6 && !room.synonymProposal
          ? Math.max(0, room.nextAt - now)
          : null;
        return (
          <Reveal
            words={room.words || {}}
            p1Id={p1Id}
            p2Id={p2Id}
            playerName={playerName}
            partnerName={partnerName}
            player={player}
            synced={room.lastRoundSynced}
            lastWord={room.lastWord}
            roundNumber={room.roundNumber}
            synonymProposal={room.synonymProposal}
            isReady={room.ready?.[player] ?? false}
            partnerReady={room.ready?.[partnerId] ?? false}
            onNext={nextRound}
            onProposeSynonym={proposeSynonym}
            onAcceptSynonym={acceptSynonym}
            onRejectSynonym={rejectSynonym}
            waitingItems={buildWaitingItems(
              room.ready?.[player] ?? false,
              room.ready?.[partnerId] ?? false,
            )}
            autoAdvanceMs={autoAdvanceMs}
          />
        );
      }
      case 'sessionDone':
        return (
          <SessionResult
            results={room.results || []}
            previousBest={previousBest}
            onPlayAgain={playAgain}
            onClose={onClose}
            isReady={room.ready?.[player] ?? false}
            waitingItems={buildWaitingItems(
              room.ready?.[player] ?? false,
              room.ready?.[partnerId] ?? false,
            )}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative flex-1 flex flex-col">
      {offlineBanner}
      {errorBanner}
      {endGameButton}
      <AnimatePresence>
        {partnerLeftBanner}
      </AnimatePresence>
      <AnimatePresence>
        {exitConfirmOverlay}
      </AnimatePresence>
      {renderView()}
    </div>
  );
}
