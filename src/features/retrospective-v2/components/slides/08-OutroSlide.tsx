import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, X } from 'lucide-react';
import { useRetroV2Store } from '../../store/useRetroV2Store';

export function OutroSlide({ onReplay }: { onReplay?: () => void }) {
  void onReplay;
  const { config } = useRetroV2Store();
  const [isOpen, setIsOpen] = useState(false);

  const title = config.outroTitle || 'Feliz 1 ano pra nós, meu amor!';
  const message =
    config.outroMessage ||
    'Obrigado por cada momento incrível. Essa é só uma parte da nossa história.';

  // Partículas delicadas de confete flutuante
  const PARTICLES = Array.from({ length: 32 }, (_, i) => ({
    width: ((i * 13) % 5) + 4,
    height: ((i * 7) % 9) + 6,
    color: ['#f43f5e', '#ec4899', '#f59e0b', '#a855f7', '#38bdf8'][i % 5],
    left: (i * 7919) % 100,
    duration: ((i * 17) % 3) + 3,
    delay: (i * 31) % 5,
  }));

  return (
    <div className="flex-1 bg-[#07050f] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Luz ambiente romântica */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <div className="w-[320px] sm:w-[500px] h-[320px] sm:h-[500px] bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-800 rounded-full blur-[120px]" />
      </div>

      {/* Confetes lentos de celebração */}
      <div className="absolute inset-0 pointer-events-none">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="retro-v2-particle absolute"
            style={{
              width: `${p.width}px`,
              height: `${p.height}px`,
              backgroundColor: p.color,
              left: `${p.left}%`,
              animation: `retro-v2-fall ${p.duration}s linear infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Container Principal */}
      <div className="z-10 w-full max-w-md flex flex-col items-center text-center">
        {/* Título com caligrafia romântica e glow */}
        <motion.h2
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-white font-bold leading-tight mb-6 px-2 drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]"
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: 'clamp(2.4rem, 10vw, 3.8rem)',
          }}
        >
          {title}
        </motion.h2>

        {/* Envelope Romântico Interativo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="w-full flex flex-col items-center"
        >
          {/* Card do Envelope */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }}
            className="group relative w-full max-w-[320px] sm:max-w-[340px] cursor-pointer active:scale-[0.98] transition-transform"
          >
            {/* Glow pulsante no fundo do envelope */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-pink-500/40 blur-lg opacity-70 group-hover:opacity-100 transition-opacity animate-pulse" />

            <div className="relative bg-[#180f2b] border border-pink-500/40 rounded-3xl p-6 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex flex-col items-center overflow-hidden">
              {/* Selo e Aba do envelope */}
              <div className="w-full flex items-center justify-between text-pink-300/60 mb-4 px-1">
                <span className="text-[10px] uppercase tracking-widest font-bold">Carta Especial</span>
                <Heart className="w-4 h-4 text-pink-400 fill-pink-400/40" />
              </div>

              {/* Ícone de Selo de Cera com Coração */}
              <div className="relative my-3">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 via-pink-600 to-rose-700 p-1 shadow-[0_0_25px_rgba(225,29,72,0.6)] border-2 border-rose-300/40 flex items-center justify-center"
                >
                  <div className="w-full h-full rounded-full border border-dashed border-white/40 flex items-center justify-center">
                    <Heart className="w-9 h-9 text-white fill-white drop-shadow-md" />
                  </div>
                </motion.div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </motion.div>
              </div>

              <h3 className="text-white font-serif text-lg sm:text-xl font-bold mt-2 mb-1">
                Você tem uma carta
              </h3>
              <p className="text-pink-200/60 text-xs sm:text-sm">
                Toque no envelope para abrir e ler
              </p>

              {/* Botão de abrir */}
              <div className="mt-5 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold tracking-wider uppercase shadow-md flex items-center justify-center gap-2 group-hover:brightness-110 transition-all">
                <span>Abrir Carta</span>
                <span>💌</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modal da Carta Aberta em Pergaminho Romântico */}
      <AnimatePresence>
        {isOpen && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 40, rotateX: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 40, rotateX: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg max-h-[82vh] bg-gradient-to-b from-[#fffaf3] to-[#f7eedc] text-[#332219] rounded-3xl p-6 sm:p-9 shadow-[0_20px_70px_rgba(0,0,0,0.8)] border border-amber-900/20 flex flex-col overflow-hidden"
              style={{
                boxShadow:
                  '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(244, 114, 182, 0.25)',
              }}
            >
              {/* Textura sutil e linhas de pergaminho */}
              <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-pink-500/40" />

              {/* Botão Fechar no Canto */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-amber-900/10 hover:bg-amber-900/20 text-amber-950/70 hover:text-amber-950 flex items-center justify-center transition-all cursor-pointer z-20"
                aria-label="Fechar carta"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Cabeçalho da Carta */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-950/15">
                <Heart className="w-5 h-5 text-rose-600 fill-rose-600 shrink-0" />
                <span
                  className="font-bold text-rose-800 text-lg sm:text-xl tracking-wide"
                  style={{ fontFamily: "'Dancing Script', cursive" }}
                >
                  De todo o meu coração...
                </span>
              </div>

              {/* Conteúdo com Rolagem Perfeita e Tipografia Impecável */}
              <div className="flex-1 overflow-y-auto pr-2 custom-retro-scrollbar space-y-4">
                <p className="text-stone-800 text-base sm:text-lg leading-relaxed whitespace-pre-wrap font-serif italic selection:bg-rose-200">
                  {message}
                </p>
              </div>

              {/* Rodapé / Selo Final */}
              <div className="mt-4 pt-3 border-t border-amber-950/15 flex items-center justify-between text-xs text-amber-950/60 font-serif">
                <span>Com amor e carinho eterno</span>
                <span className="text-rose-600 font-bold">♥</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
