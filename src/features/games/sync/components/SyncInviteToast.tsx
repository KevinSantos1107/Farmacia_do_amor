import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSyncRoom } from '../useSyncRoom';
import { X, Check } from 'lucide-react';
import { runTransaction } from 'firebase/firestore';
import { siteDoc } from '../../../../services/firestore/paths';
import { db } from '../../../../services/firebase/config';

export function SyncInviteToast() {
  const navigate = useNavigate();
  const { room, isPlayer, player, p1Id, p2Id, partnerName } = useSyncRoom();

  const isInvited = isPlayer && room?.status === 'inviting' && room.hostId !== player;

  const handleAccept = async () => {
    navigate('/sync');
    const roomId = `${p1Id}_${p2Id}`;
    const ref = siteDoc('sync_rooms', roomId);
    await runTransaction(db, async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists()) return;
      if (snap.data().status !== 'inviting') return;
      t.update(ref, { status: 'choosing', leftBy: null, leftAt: null });
    });
  };

  const handleReject = async () => {
    const roomId = `${p1Id}_${p2Id}`;
    const ref = siteDoc('sync_rooms', roomId);
    await runTransaction(db, async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists()) return;
      if (snap.data().status !== 'inviting') return;
      t.update(ref, { status: 'lobby' });
    });
  };

  if (!isInvited) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 p-4 bg-gray-900 border border-[var(--theme-primary)]/50 rounded-2xl shadow-2xl w-80"
      >
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-white font-bold text-sm">Convite para jogar</h4>
            <p className="text-white/60 text-xs mt-0.5">{partnerName} te convidou para o Sincronia</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReject}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-gray-400 bg-white/5 hover:bg-white/10 transition-all"
          >
            <X className="w-3 h-3" />
            Recusar
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-[var(--theme-bg)] bg-[var(--theme-primary)] hover:opacity-90 transition-all"
          >
            <Check className="w-3 h-3" />
            Aceitar
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
