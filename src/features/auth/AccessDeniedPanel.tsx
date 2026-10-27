import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Heart, KeyRound, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AccessDeniedPanel() {
  const [tokenInput, setTokenInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleApplyToken = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    // Redireciona aplicando o token na URL para que o PlayerAuthInit valide
    window.location.href = `/?token=${encodeURIComponent(trimmed)}`;
  };

  return (
    <div className="min-h-screen w-full bg-[#07050f] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-purple-500/30">
      {/* Background radial e luzes decorativas */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-gradient-to-tr from-purple-900/30 via-pink-900/20 to-transparent rounded-full blur-[100px] sm:blur-[140px]" />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-[90px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-600/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md mx-auto"
      >
        <div className="relative bg-[#0f0a1e]/80 border border-purple-500/30 rounded-3xl p-6 sm:p-9 backdrop-blur-2xl shadow-[0_0_60px_rgba(157,78,221,0.2)] text-center">
          {/* Ícone com animação de pulso */}
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 blur-md opacity-50"
            />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-900/90 to-pink-900/90 border border-purple-400/40 flex items-center justify-center shadow-lg">
              <Lock className="w-8 h-8 text-pink-300 drop-shadow-[0_0_10px_rgba(244,114,182,0.6)]" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles className="w-5 h-5 text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.7)]" />
            </motion.div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-400/25 mb-4">
            <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400/50" />
            <span className="text-[11px] uppercase tracking-widest font-semibold text-purple-200">
              Espaço Privado
            </span>
          </div>

          {/* Título & Descrição */}
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-3">
            Acesso Restrito
          </h1>
          <p className="text-sm text-white/60 leading-relaxed mb-6 font-light">
            Este site é um cantinho especial e confidencial. Para desbloquear o acesso, você precisa abrir pelo seu link pessoal ou inserir seu token abaixo.
          </p>

          {/* Input de Token */}
          <form onSubmit={handleApplyToken} className="space-y-3 mb-6">
            <div className="relative">
              <KeyRound className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Insira seu token de acesso..."
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-400 focus:bg-white/[0.08] transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!tokenInput.trim() || isSubmitting}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-semibold shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isSubmitting ? 'Verificando...' : 'Desbloquear Acesso'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Rodapé / Dica */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-4 text-xs text-white/40">
            <span>Você é o administrador?</span>
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="text-purple-300 hover:text-white underline underline-offset-4 transition-colors"
            >
              Entrar no Admin
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
