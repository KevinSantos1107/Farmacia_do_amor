import { useWordDuel } from './useWordDuel';
import { useWordDictionary } from '../word/useWordDictionary';
import { WordDuelLobby } from './WordDuelLobby';
import { WordDuelSetup } from './WordDuelSetup';
import { WordDuelBattle } from './WordDuelBattle';
import { WordDuelGameOver } from './WordDuelGameOver';
import { Spinner } from '../../../shared/ui/Spinner';

export function WordDuelGame() {
  const {
    myPlayerId,
    myDisplayName,
    partnerDisplayName,
    playerAvatar,
    partnerAvatar,
    partnerPresence,
    isPartnerOnline,
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
    winnerId,
    isWinner,
    myRevealedSecret,
    partnerRevealedSecret,
    startDuel,
    cancelInvite,
    syncMyDraft,
    lockMyWord,
    makeGuess,
    playAgain,
  } = useWordDuel();

  const { isValidWord } = useWordDictionary();

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

  return (
    <div className="flex flex-col flex-1 w-full min-h-full">
      {(status === 'lobby' || status === 'inviting') && (
        <WordDuelLobby
          playerName={myDisplayName}
          partnerName={partnerDisplayName}
          playerAvatar={playerAvatar}
          partnerAvatar={partnerAvatar}
          isPartnerOnline={isPartnerOnline}
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
        isOpen={status === 'round_over'}
        isWinner={isWinner}
        winnerDisplayName={winnerDisplayName}
        myDisplayName={myDisplayName}
        partnerDisplayName={partnerDisplayName}
        myAttempts={myGuesses.length}
        partnerAttempts={partnerGuesses.length}
        myRevealedSecret={myRevealedSecret}
        partnerRevealedSecret={partnerRevealedSecret}
        onPlayAgain={playAgain}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
