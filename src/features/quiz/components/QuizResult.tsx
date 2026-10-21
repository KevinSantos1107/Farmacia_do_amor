import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuizStore } from '../store/useQuizStore';
import { Trophy, RefreshCw, Flame } from 'lucide-react';


// Particle types for the 100% celebration
interface Particle {
  id: number;
  x: number;
  emoji: string;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

const EMOJIS = ['❤️', '💕', '✨', '💫', '🌟', '💖', '🩷', '💗'];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    size: 0.8 + Math.random() * 1.2,
    duration: 3 + Math.random() * 3,
    delay: Math.random() * 2,
    drift: (Math.random() - 0.5) * 80,
  }));
}

function PerfectCelebration() {
  const particles = useRef(generateParticles(30)).current;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute text-2xl select-none"
          style={{
            left: `${p.x}%`,
            bottom: '-10%',
            fontSize: `${p.size}rem`,
          }}
          initial={{ y: 0, x: 0, opacity: 1, rotate: 0 }}
          animate={{
            y: [0, -(window.innerHeight * 1.2)],
            x: [0, p.drift],
            opacity: [0, 1, 1, 0],
            rotate: [0, p.drift * 0.5],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
            repeat: Infinity,
            repeatDelay: Math.random() * 2,
          }}
        >
          {p.emoji}
        </motion.div>
      ))}
    </div>
  );
}

export function QuizResult() {
  const { score, correctAnswers, questions, maxCombo, config, resetGame } = useQuizStore();
  
  const percentage = (correctAnswers / questions.length) * 100;
  
  let message = config.messages.bad;
  if (percentage === 100) message = config.messages.perfect;
  else if (percentage >= 80) message = config.messages.great;
  else if (percentage >= 50) message = config.messages.good;
  
  const isPerfect = percentage === 100;

  return (
    <>
      {isPerfect && <PerfectCelebration />}

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto w-full relative"
      >
        {/* Glow background on perfect */}
        {isPerfect && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
            <div className="absolute w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(var(--theme-primary-rgb),0.2)_0%,transparent_50%)] animate-pulse" />
          </div>
        )}

        {/* Trophy icon with bounce on perfect */}
        <motion.div
          className="relative z-10 w-24 h-24 rounded-full bg-[var(--theme-primary)]/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(var(--theme-primary-rgb),0.3)]"
          animate={isPerfect ? { scale: [1, 1.12, 1], rotate: [0, -5, 5, 0] } : {}}
          transition={{ delay: 0.3, duration: 0.6, ease: 'easeInOut' }}
        >
          <Trophy className="w-12 h-12 text-[var(--theme-primary)]" />
        </motion.div>

        <motion.h2
          className="text-3xl md:text-4xl font-serif font-bold text-white mb-2"
          animate={isPerfect ? { scale: [1, 1.05, 1] } : {}}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {percentage.toFixed(0)}% de Acerto
          {isPerfect && (
            <motion.span
              className="block text-2xl mt-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              🏆 Gabaritou!
            </motion.span>
          )}
        </motion.h2>

        <p className="text-white/70 text-lg mb-8 px-4">
          {message}
        </p>

        {/* Secret reward — only on 100% */}
        <AnimatePresence>
          {isPerfect && config.secretReward && config.secretReward.type !== 'none' && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
              className="w-full bg-white/10 border border-yellow-500/50 rounded-2xl p-6 mb-10 shadow-[0_0_30px_rgba(234,179,8,0.2)]"
            >
              <div className="flex items-center justify-center gap-2 mb-4 text-yellow-400">
                <Trophy className="w-5 h-5" />
                <h3 className="font-bold uppercase tracking-wider text-sm">Recompensa Secreta Desbloqueada</h3>
                <Trophy className="w-5 h-5" />
              </div>
              
              {config.secretReward.type === 'message' && (
                <p className="text-xl font-serif text-white leading-relaxed">
                  {config.secretReward.content}
                </p>
              )}
              
              {config.secretReward.type === 'photo' && (
                config.secretReward.content ? (
                  <div className="rounded-xl overflow-hidden shadow-lg mx-auto max-w-sm">
                    <img src={config.secretReward.content} alt="Recompensa Secreta" className="w-full h-auto object-cover" />
                  </div>
                ) : (
                  <p className="text-white/50 italic text-sm">📷 Nenhuma foto adicionada ainda... mas você merecia uma!</p>
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-4 w-full mb-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center">
            <span className="text-white/50 text-sm mb-1">Pontuação</span>
            <span className="text-2xl font-bold text-white">{score}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center">
            <span className="text-white/50 text-sm mb-1">Acertos</span>
            <span className="text-2xl font-bold text-white">{correctAnswers}/{questions.length}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center col-span-2">
            <span className="text-white/50 text-sm mb-1">Maior Combo</span>
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-2xl font-bold text-orange-400">x{maxCombo}</span>
            </div>
          </div>
        </div>

        <div className="w-full">
          <button
            onClick={resetGame}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[var(--theme-primary)] hover:bg-[var(--theme-accent)] text-white font-bold rounded-2xl transition-transform active:scale-95 shadow-[0_0_20px_rgba(var(--theme-primary-rgb),0.3)]"
          >
            <RefreshCw className="w-5 h-5" /> Jogar Novamente
          </button>
        </div>
      </motion.div>
    </>
  );
}
