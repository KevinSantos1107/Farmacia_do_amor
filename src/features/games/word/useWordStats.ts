import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameStats } from './types';
import { usePlayerIdentityStore } from '../../../store/usePlayerIdentityStore';
import { useSiteConfigStore } from '../../../store/siteConfigStore';
import { getWordRecord, saveWordGameResult } from '../../../services/gameRecords';
import { getPlayerIds } from '../../auth/playerIds';
import { MAX_ATTEMPTS } from './wordConstants';

const INITIAL_STATS: GameStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  currentStreak: 0,
  bestStreak: 0,
  winsByAttempt: [0, 0, 0, 0, 0, 0],
};

export function useWordStats() {
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const statsRef = useRef<GameStats>(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  const player = usePlayerIdentityStore((s) => s.player);
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const { config } = useSiteConfigStore();

  // Sincroniza estatísticas do Firestore
  useEffect(() => {
    const { p1Id, p2Id } = getPlayerIds(config);
    if (player === p1Id || player === p2Id || player === 'kevin' || player === 'iara') {
      getWordRecord(player).then((record) => {
        if (record) {
          setStats({
            gamesPlayed: record.gamesPlayed,
            wins: record.wins,
            losses: record.losses ?? Math.max(0, record.gamesPlayed - record.wins),
            currentStreak: record.streak,
            bestStreak: record.bestStreak,
            winsByAttempt: record.winsByAttempt,
          });
        }
      });
    } else {
      // Visitante usa estado vazio / sem persistência
      setStats(INITIAL_STATS);
    }
  }, [player, config]);

  const recordRoundResult = useCallback(
    (isWin: boolean, attempts: number) => {
      const latestStats = statsRef.current;
      const currentPlayer = playerRef.current;
      const { p1Id, p2Id } = getPlayerIds(config);
      const isEligiblePlayer =
        currentPlayer === p1Id ||
        currentPlayer === p2Id ||
        currentPlayer === 'kevin' ||
        currentPlayer === 'iara';

      if (isWin) {
        const attemptIdx = attempts - 1;
        const newWinsByAttempt = [...(latestStats.winsByAttempt || [0, 0, 0, 0, 0, 0])];
        newWinsByAttempt[attemptIdx] = (newWinsByAttempt[attemptIdx] || 0) + 1;
        const newStreak = latestStats.currentStreak + 1;
        const newStats: GameStats = {
          gamesPlayed: latestStats.gamesPlayed + 1,
          wins: latestStats.wins + 1,
          losses: latestStats.losses ?? Math.max(0, latestStats.gamesPlayed - latestStats.wins),
          currentStreak: newStreak,
          bestStreak: Math.max(latestStats.bestStreak, newStreak),
          winsByAttempt: newWinsByAttempt,
        };
        setStats(newStats);

        // Pontuação: quanto menos tentativas, mais pontos (1ª = 6pts, 6ª = 1pt)
        const wordScore = MAX_ATTEMPTS - attemptIdx;
        if (isEligiblePlayer) {
          void saveWordGameResult(
            currentPlayer,
            wordScore,
            true,
            newStats.currentStreak,
            newStats.bestStreak,
            newWinsByAttempt
          );
        }
      } else {
        const newStats: GameStats = {
          ...latestStats,
          gamesPlayed: latestStats.gamesPlayed + 1,
          losses: (latestStats.losses ?? Math.max(0, latestStats.gamesPlayed - latestStats.wins)) + 1,
          currentStreak: 0,
        };
        setStats(newStats);

        if (isEligiblePlayer) {
          void saveWordGameResult(
            currentPlayer,
            0,
            false,
            0,
            newStats.bestStreak,
            newStats.winsByAttempt
          );
        }
      }
    },
    [config]
  );

  return { stats, recordRoundResult };
}
