import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useWordDuel } from './useWordDuel';
import { useWordDictionary } from '../word/useWordDictionary';
import { WordDuelLobby } from './WordDuelLobby';
import { WordDuelSetup } from './WordDuelSetup';
import { WordDuelBattle } from './WordDuelBattle';
import { WordDuelGameOver } from './WordDuelGameOver';
import { Spinner } from '../../../shared/ui/Spinner';

interface WordDuelGameProps {
  onClose?: () => void;
  registerLeaveGame?: (fn: () => void) => void;
}

export function WordDuelGame({ registerLeaveGame }: WordDuelGameProps = {}) {
  const {
    myPlayerId,
    partnerId,
    myDisplayName,
    partnerDisplayName,
    playerAvatar,
    partnerAvatar,
    partnerPresence,
    status,
    isInviting,
    loading,
    isSubmitting,
    errorMsg,
    myLocked,
    partnerLocked,
    myGuesses,
    partnerGuesses,
    partnerDraft,
    isMyTurn,
    currentTurn,
    winnerId,
    isWinner,
    myRevealedSecret,
    partnerRevealedSecret,
    leftBy,
    leftAt,
    startDuel,
    cancelInvite,
    leaveGame,
    forceEndGame,
    syncMyDraft,
    lockMyWord,
    makeGuess,
    playAgain,
  } = useWordDuel();

  const { isValidWord } = useWordDictionary();

  // Registra o handler para quando o modal fechar
  useEffect(() => {
    if (registerLeaveGame) {
      registerLeaveGame(leaveGame);
    }
  }, [registerLeaveGame, leaveGame]);

  // Contagem regressiva se o parceiro saiu
  const [partnerLeftCountdown, setPartnerLeftCountdown] = useState(60);
  useEffect(() => {
    if (leftBy !== partnerId || !leftAt) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - leftAt) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setPartnerLeftCountdown(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        forceEndGame();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [leftBy, partnerId, leftAt, forceEndGame]);

  // Atraso de 2.8s para exibir o Game Over para permitir que a animação da
  // última palavra (5 letras verdes + bounce) termine e o jogador possa ver antes do modal abrir
  const [showGameOver, setShowGameOver] = useState(false);
  useEffect(() => {
    if (status === 'round_over') {
      const timer = setTimeout(() => {
        setShowGameOver(true);
      }, 2800);
      return () => clearTimeout(timer);
    } else {
      setShowGameOver(false);
    }
  }, [status]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-16 gap-3">
        <Spinner size="lg" />
        <span className="text-sm text-neutral-400">Conectando ao duelo...</span>
      </div>
    );
  }

  const winnerDisplayName =
    winnerId === myPlayerId ? myDisplayName : partnerDisplayName;

  const isPartnerLeft = leftBy === partnerId && (status === 'waiting_words' || status === 'dueling');

  return (
    <div className="relative flex flex-col flex-1 w-full min-h-full">
      {/* Banner de Parceiro Saiu (idêntico ao Sincronia, responsivo) */}
      {isPartnerLeft && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm sm:max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center gap-4 text-center"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
              {partnerAvatar ? (
                <img
                  src={partnerAvatar}
                  alt={partnerDisplayName}
                  className="w-full h-full object-cover opacity-50 grayscale"
                />
              ) : (
                <span className="text-2xl sm:text-3xl font-bold opacity-50 text-white">
                  {partnerDisplayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">{partnerDisplayName} saiu da partida.</h3>
            <p className="text-neutral-400 text-xs sm:text-sm">
              Aguardando retorno... ({partnerLeftCountdown}s)
            </p>
            <button
              onClick={forceEndGame}
              className="mt-2 w-full py-3 sm:py-3.5 rounded-2xl text-sm sm:text-base font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all active:scale-95 cursor-pointer"
            >
              Encerrar Partida
            </button>
          </motion.div>
        </div>
      )}
      {(status === 'lobby' || status === 'inviting') && (
        <WordDuelLobby
          playerName={myDisplayName}
          partnerName={partnerDisplayName}
          playerAvatar={playerAvatar}
          partnerAvatar={partnerAvatar}
          partnerPresence={partnerPresence}
          isInviting={isInviting}
          onStart={startDuel}
          onCancelInvite={cancelInvite}
          isSubmitting={isSubmitting}
        />
      )}

      {status === 'waiting_words' && (
        <WordDuelSetup
          myDisplayName={myDisplayName}
          partnerDisplayName={partnerDisplayName}
          isLocked={myLocked}
          partnerLocked={partnerLocked}
          isValidWord={isValidWord}
          onLockWord={lockMyWord}
          isSubmitting={isSubmitting}
          errorMsg={errorMsg}
        />
      )}

      {(status === 'dueling' || status === 'round_over') && (
        <WordDuelBattle
          myPlayerId={myPlayerId}
          currentTurn={currentTurn}
          myDisplayName={myDisplayName}
          partnerDisplayName={partnerDisplayName}
          myGuesses={myGuesses}
          partnerGuesses={partnerGuesses}
          partnerDraft={partnerDraft}
          isMyTurn={isMyTurn}
          isValidWord={isValidWord}
          onMakeGuess={makeGuess}
          onDraftChange={syncMyDraft}
          isSubmitting={isSubmitting}
          errorMsg={errorMsg}
        />
      )}

      <WordDuelGameOver
        isOpen={showGameOver}
        isWinner={isWinner}
        winnerDisplayName={winnerDisplayName}
        myDisplayName={myDisplayName}
        partnerDisplayName={partnerDisplayName}
        myAttempts={myGuesses.length}
        partnerAttempts={partnerGuesses.length}
        myRevealedSecret={myRevealedSecret ?? null}
        partnerRevealedSecret={partnerRevealedSecret ?? null}
        onPlayAgain={playAgain}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
