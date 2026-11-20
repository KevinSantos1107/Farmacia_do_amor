import { useWordDuel } from './useWordDuel';
import { useWordDictionary } from '../word/useWordDictionary';
import { WordDuelSetup } from './WordDuelSetup';
import { WordDuelBattle } from './WordDuelBattle';
import { WordDuelGameOver } from './WordDuelGameOver';
import { Spinner } from '../../../shared/ui/Spinner';

export function WordDuelGame() {
  const {
    myPlayerId,
    myDisplayName,
    partnerDisplayName,
    status,
    loading,
    isSubmitting,
    errorMsg,
    myLocked,
    partnerLocked,
    myGuesses,
    partnerGuesses,
    isMyTurn,
    winnerId,
    isWinner,
    myRevealedSecret,
    partnerRevealedSecret,
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
          isMyTurn={isMyTurn}
          isValidWord={isValidWord}
          onMakeGuess={makeGuess}
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
