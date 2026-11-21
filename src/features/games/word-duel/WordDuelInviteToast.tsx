/**
 * WordDuelInviteToast
 *
 * Toast de convite para o Modo Duelo — exibido para o parceiro convidado.
 * Usa um hook LEVE e dedicado em vez do useWordDuel completo para evitar
 * múltiplas subscriptions pesadas ao Firestore.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Swords, X, Check } from 'lucide-react';
import { siteDoc } from '../../../services/firestore/paths';
import { useSiteConfigStore } from '../../../store/siteConfigStore';
import { usePlayerIdentityStore } from '../../../store/usePlayerIdentityStore';
import { getPlayerIds, getPlayerDisplayName } from '../../auth/playerIds';
import { getCurrentSiteId } from '../../../services/firestore/paths';
import { getTopToastOffset } from '../../../shared/utils/safeArea';
import type { WordDuelRoom } from './types';

export function WordDuelInviteToast() {
  const navigate = useNavigate();
  const config = useSiteConfigStore((s) => s.config);
  const myPlayerId = usePlayerIdentityStore((s) => s.player);

  const { p1Id, p2Id } = useMemo(() => getPlayerIds(config), [config]);
  const roomId = `${p1Id}_${p2Id}`;
  const isPlayer = myPlayerId === p1Id || myPlayerId === p2Id;
  const isP1 = myPlayerId === p1Id;
  const partnerId = isP1 ? p2Id : p1Id;
  const partnerName = getPlayerDisplayName(partnerId, config);

  const [room, setRoom] = useState<WordDuelRoom | null>(null);
  const [topOffset, setTopOffset] = useState(() => getTopToastOffset());

  // Escuta leve da sala do duelo
  useEffect(() => {
    if (!isPlayer || !roomId) return;
    const siteId = getCurrentSiteId();
    const docRef = siteDoc('word_duel_rooms', roomId, siteId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setRoom(snap.data() as WordDuelRoom);
      } else {
        setRoom(null);
      }
    });
    return () => unsub();
  }, [isPlayer, roomId]);

  // Ajuste de offset ao redimensionar
  useEffect(() => {
    const updateOffset = () => setTopOffset(getTopToastOffset());
    window.addEventListener('resize', updateOffset);
    window.addEventListener('orientationchange', updateOffset);
    return () => {
      window.removeEventListener('resize', updateOffset);
      window.removeEventListener('orientationchange', updateOffset);
    };
  }, []);

  const isInvited =
    isPlayer &&
    room?.status === 'inviting' &&
    room.hostId !== myPlayerId;

  const handleAccept = async () => {
    navigate('/word-duel');
    const siteId = getCurrentSiteId();
    const docRef = siteDoc('word_duel_rooms', roomId, siteId);
    try {
      await updateDoc(docRef, {
        status: 'waiting_words',
        inviteExpiresAt: null,
        leftBy: null,
        leftAt: null,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // se a sala foi cancelada entre o clique e o update, tudo bem
    }
  };

  const handleReject = async () => {
    const siteId = getCurrentSiteId();
    const docRef = siteDoc('word_duel_rooms', roomId, siteId);
    try {
      await updateDoc(docRef, {
        status: 'lobby',
        inviteExpiresAt: null,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // best-effort
    }
  };

  return (
    <AnimatePresence>
      {isInvited && (
        <motion.div
          key="word-duel-invite-toast"
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          style={{ top: topOffset }}
          className="fixed left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 p-4 bg-gray-900 border border-amber-500/50 rounded-2xl shadow-2xl w-80"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Desafio de Palavras!</h4>
              <p className="text-white/60 text-xs mt-0.5">{partnerName} te chamou para um duelo</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-gray-400 bg-white/5 hover:bg-white/10 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Recusar
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90 shadow-lg shadow-rose-500/25 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Aceitar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
