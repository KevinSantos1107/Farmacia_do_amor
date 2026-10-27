import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Heart } from 'lucide-react';

import type { SyncPresenceState } from './SyncPresenceBeacon';

interface LobbyProps {
  playerName: string;
  partnerName: string;
  playerAvatar?: string;
  partnerAvatar?: string;
  isPartnerOnline: boolean;
  partnerPresence?: SyncPresenceState;
  isInviting?: boolean;
  onStart: () => Promise<void>;
  onStartTurbo: () => Promise<void>;
  onCancelInvite?: () => Promise<void>;
}

export function Lobby({
  playerName,
  partnerName,
  playerAvatar,
  partnerAvatar,
  isPartnerOnline,
  partnerPresence = 'offline',
  isInviting = false,
  onStart,
  onStartTurbo,
  onCancelInvite,
}: LobbyProps) {
  const [starting, setStarting] = useState(false);

  const handleStart = async (turbo: boolean) => {
    setStarting(true);
    try {
      if (turbo) await onStartTurbo();
      else await onStart();
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 md:p-8">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[var(--theme-primary)] opacity-20 rounded-full blur-[100px] -z-10 mix-blend-screen animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-[var(--theme-accent)] opacity-20 rounded-full blur-[80px] -z-10 mix-blend-screen animate-pulse delay-1000" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl flex flex-col items-center gap-6 md:gap-10"
      >
        {/* Header Hero */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-2"
          >
            <span className="text-white/80 text-xs font-medium tracking-widest uppercase">Pronto para jogar</span>
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70">
            Sincronia
          </h2>
          <p className="text-white/60 text-sm md:text-base max-w-md mx-auto">
            Escrevam a mesma palavra sem combinar. Quanto mais rápido sincronizarem, maior a pontuação!
          </p>
        </div>

        {/* Players Area */}
        <div className="flex flex-row items-center justify-center gap-6 md:gap-10 w-full p-6 md:p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
          <PlayerBadge name={playerName} presence="game" avatarUrl={playerAvatar} />
          
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 shrink-0"
          >
            <Heart className="w-4 h-4 text-[var(--theme-primary)] fill-[var(--theme-primary)] opacity-80" />
          </motion.div>

          <PlayerBadge name={partnerName} presence={partnerPresence} avatarUrl={partnerAvatar} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button
            onClick={() => handleStart(false)}
            disabled={!isPartnerOnline || starting}
            className="group relative w-full py-4 rounded-2xl font-semibold text-base text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden shadow-lg"
            aria-label="Começar sessão"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-accent)] opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-center gap-2">
              {starting ? 'Criando sala…' : 'Começar'}
            </div>
          </button>

          <button
            onClick={() => handleStart(true)}
            disabled={!isPartnerOnline || starting}
            className="group w-full py-3 rounded-2xl font-medium text-sm text-white/90 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 backdrop-blur-sm"
            aria-label="Modo turbo"
          >
            <Zap className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
            Modo Turbo (30s)
          </button>
        </div>

        {/* Waiting / Inviting Message */}
        {isInviting && (
          <div className="flex flex-col items-center gap-3">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-[var(--theme-primary)] font-medium text-sm bg-[var(--theme-primary)]/10 px-6 py-2 rounded-full"
              aria-live="polite"
            >
              Convite enviado para {partnerName}… aguardando resposta
            </motion.p>
            {onCancelInvite && (
              <button
                onClick={onCancelInvite}
                className="text-xs text-white/40 hover:text-white/80 transition-colors"
              >
                Cancelar convite
              </button>
            )}
          </div>
        )}
        {!isInviting && !isPartnerOnline && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-[var(--theme-primary)] font-medium text-sm bg-[var(--theme-primary)]/10 px-6 py-2 rounded-full"
            aria-live="polite"
          >
            Aguardando {partnerName} conectar…
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

function PlayerBadge({ name, presence, avatarUrl }: { name: string; presence: SyncPresenceState; avatarUrl?: string }) {
  const online = presence === 'game' || presence === 'site';
  const colorClass = presence === 'game' ? 'bg-green-500' : presence === 'site' ? 'bg-yellow-400' : 'bg-gray-500';
  const label = presence === 'game' ? 'No jogo' : presence === 'site' ? 'No site' : 'Offline';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {online && (
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 rounded-full blur-md"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          />
        )}
        <div
          className="relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl font-serif font-bold border-2 backdrop-blur-md overflow-hidden z-10"
          style={{
            borderColor: online ? 'var(--theme-primary)' : 'rgba(255,255,255,0.1)',
            background: online ? 'rgba(var(--theme-primary-rgb), 0.15)' : 'rgba(255,255,255,0.02)',
            color: online ? 'var(--theme-primary)' : 'rgba(255,255,255,0.3)',
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>
        
        {/* Status indicator */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#121212] flex items-center justify-center">
          <div className={`w-3 h-3 rounded-full flex items-center justify-center ${colorClass}`}>
            {online && (
              <motion.div
                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className={`absolute w-full h-full rounded-full ${colorClass}`}
              />
            )}
          </div>
        </div>
      </div>

      <div className="text-center">
        <span className="text-sm font-medium text-white/90 truncate max-w-[80px] block">{name}</span>
        <span className={`text-xs ${presence === 'game' ? 'text-green-400' : presence === 'site' ? 'text-yellow-400' : 'text-white/30'}`}>
          {label}
        </span>
      </div>
    </div>
  );
}
