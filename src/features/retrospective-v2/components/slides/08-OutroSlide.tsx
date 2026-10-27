import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import { useRetroV2Store } from '../../store/useRetroV2Store';

export function OutroSlide({ onReplay }: { onReplay?: () => void }) {
  void onReplay;
  const { config } = useRetroV2Store();
  const [isOpen, setIsOpen] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);

  const title = config.outroTitle || 'Feliz 1 ano para nós!';
  const message =
    config.outroMessage ||
    'Obrigado por cada momento incrível ao seu lado. Essa é só uma parte da nossa história...';

  // Efeito de máquina de escrever / caligrafia viva quando a carta abre
  useEffect(() => {
    if (!isOpen) {
      setDisplayedText('');
      setIsTypingDone(false);
      return;
    }

    let i = 0;
    setDisplayedText('');
    setIsTypingDone(false);

    // Digita suavemente e com dinamismo revelando as palavras
    const timer = setInterval(() => {
      i += 3;
      if (i >= message.length) {
        setDisplayedText(message);
        setIsTypingDone(true);
        clearInterval(timer);
      } else {
        setDisplayedText(message.slice(0, i));
      }
    }, 18);

    return () => clearInterval(timer);
  }, [isOpen, message]);

  // Partículas delicadas flutuando suavemente pelo espaço escuro
  const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
    size: (i % 3) + 3,
    color: ['#fb7185', '#fda4af', '#f43f5e', '#fbcfe8', '#e879f9'][i % 5],
    left: (i * 29) % 100,
    top: (i * 37) % 100,
    duration: (i % 4) + 4,
    delay: (i % 5) * 0.8,
  }));

  return (
    <div
      className="flex-1 bg-[#120517] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at center, #26072b 0%, #110314 60%, #07010a 100%)',
      }}
    >
      {/* Luz ambiente central suave no fundo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
        <div className="w-[340px] sm:w-[540px] h-[340px] sm:h-[540px] bg-gradient-to-tr from-pink-800/30 via-purple-900/30 to-transparent rounded-full blur-[140px]" />
      </div>

      {/* Partículas e coraçõezinhos flutuantes como no print de referência */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            animate={{
              y: [-10, 15, -10],
              x: [-8, 8, -8],
              opacity: [0.3, 0.8, 0.3],
              rotate: [0, 45, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute rounded-full"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              boxShadow: `0 0 8px ${p.color}`,
            }}
          />
        ))}
      </div>

      {/* Bloco Central */}
      <div className="z-10 w-full max-w-lg flex flex-col items-center text-center">
        {/* Título com caligrafia idêntica à referência: "Feliz 1 ano para nós!" */}
        <motion.h2
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-[#fce7f3] font-normal leading-tight mb-2 drop-shadow-[0_2px_12px_rgba(251,113,133,0.45)]"
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: 'clamp(2.6rem, 8vw, 4.2rem)',
          }}
        >
          {title}
        </motion.h2>

        {/* Mini coração decorativo abaixo do título */}
        <div className="flex items-center justify-center mb-2">
          <Heart className="w-3.5 h-3.5 text-pink-300/80 fill-pink-300/80" />
        </div>

        {/* Subtítulo elegante */}
        <p className="text-pink-200/70 text-xs sm:text-sm font-serif italic tracking-wide mb-8">
          Uma história que ainda está só começando
        </p>

        {/* ENVELOPE REALISTA - IDÊNTICO AO PRINT DE REFERÊNCIA */}
        <div
          role="button"
          tabIndex={0}
          data-interactive="true"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              setIsOpen(true);
            }
          }}
          className="relative w-[300px] sm:w-[380px] h-[200px] sm:h-[235px] cursor-pointer group focus:outline-none transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
          style={{ perspective: 1000 }}
        >
          {/* Brilho suave sob o envelope */}
          <div className="absolute -inset-2 bg-pink-700/25 rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition-opacity" />

          {/* Sombra realista projetada */}
          <div className="absolute inset-x-4 -bottom-3 h-8 bg-black/70 blur-xl rounded-full" />

          {/* Papel da carta espreitando por dentro da aba superior aberta */}
          <div className="absolute top-[8px] sm:top-[10px] inset-x-[16px] sm:inset-x-[20px] h-[75px] sm:h-[88px] bg-gradient-to-b from-[#fbf5ea] to-[#ebdcc3] rounded-t-md shadow-sm border border-[#d6c2a1] flex flex-col items-center pt-2.5 z-[2] overflow-hidden">
            {/* Desenho do mini coração com arabescos como no print */}
            <div className="flex items-center gap-2 opacity-60">
              <span className="w-6 sm:w-10 h-[1px] bg-amber-900/40" />
              <Heart className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-900/60" />
              <span className="w-6 sm:w-10 h-[1px] bg-amber-900/40" />
            </div>
          </div>

          {/* CORPO DO ENVELOPE (Bordô escuro texturizado com dobras triangulares e bordas douradas finas) */}
          <div className="absolute inset-0 rounded-lg overflow-hidden shadow-[0_12px_35px_rgba(0,0,0,0.8)] z-[3] border border-pink-900/40 bg-[#400720]">
            {/* Textura sutil do tecido/papel linho do envelope */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(#fff 1px, transparent 1px), radial-gradient(#000 1px, transparent 1px)',
                backgroundSize: '4px 4px',
              }}
            />

            {/* Triângulo Esquerdo (com borda dourada suave) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                clipPath: 'polygon(0% 0%, 50% 50%, 0% 100%)',
                background: 'linear-gradient(135deg, #4d0a29 0%, #300418 100%)',
                filter: 'drop-shadow(1px 0px 1px rgba(253, 230, 138, 0.35))',
              }}
            />

            {/* Triângulo Direito (com borda dourada suave) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                clipPath: 'polygon(100% 0%, 50% 50%, 100% 100%)',
                background: 'linear-gradient(-135deg, #4d0a29 0%, #300418 100%)',
                filter: 'drop-shadow(-1px 0px 1px rgba(253, 230, 138, 0.35))',
              }}
            />

            {/* Triângulo Inferior (frente fechando o envelope) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                clipPath: 'polygon(0% 100%, 50% 50%, 100% 100%)',
                background: 'linear-gradient(0deg, #3d0720 0%, #5c0d32 100%)',
                borderBottom: '1px solid rgba(253, 230, 138, 0.4)',
                filter: 'drop-shadow(0px -1px 2px rgba(0, 0, 0, 0.5))',
              }}
            />

            {/* Triângulo Superior aberto parcialmente revelando o papel */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                clipPath: 'polygon(0% 0%, 50% 48%, 100% 0%)',
                background: 'linear-gradient(180deg, #590c30 0%, #36051c 100%)',
                filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.6))',
              }}
            />

            {/* Filete dourado fino nas dobras do envelope como no print */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <line x1="0" y1="0" x2="50" y2="50" stroke="rgba(253, 230, 138, 0.45)" strokeWidth="0.6" />
              <line x1="100" y1="0" x2="50" y2="50" stroke="rgba(253, 230, 138, 0.45)" strokeWidth="0.6" />
              <line x1="0" y1="100" x2="50" y2="50" stroke="rgba(253, 230, 138, 0.35)" strokeWidth="0.6" />
              <line x1="100" y1="100" x2="50" y2="50" stroke="rgba(253, 230, 138, 0.35)" strokeWidth="0.6" />
            </svg>
          </div>

          {/* SELO DE CERA VERMELHO/ROSA COM CORAÇÃO NO CENTRO (idêntico à imagem) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[10] pointer-events-none">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
              {/* Borda irregular do selo de cera */}
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-br from-[#c81e51] via-[#9f1239] to-[#6b0924] shadow-[0_4px_15px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.4)] border border-pink-400/30"
                style={{
                  clipPath:
                    'polygon(50% 0%, 65% 5%, 80% 2%, 92% 14%, 98% 30%, 95% 48%, 100% 65%, 92% 80%, 80% 95%, 65% 98%, 50% 95%, 35% 99%, 18% 92%, 5% 82%, 1% 65%, 4% 48%, 0% 32%, 8% 18%, 20% 5%, 35% 2%)',
                }}
              />
              {/* Miolo prensado com relevo de coração */}
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#881337] to-[#4c0519] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_1px_2px_rgba(255,255,255,0.2)] flex items-center justify-center border border-pink-500/20">
                <Heart className="w-5 h-5 text-pink-200/90 fill-pink-300/40 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé abaixo do envelope — exatamente como no print */}
        <div
          role="button"
          tabIndex={0}
          data-interactive="true"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="mt-8 flex flex-col items-center gap-2 cursor-pointer group"
        >
          {/* Linha com UMA CARTA PARA VOCÊ */}
          <div className="flex items-center gap-3">
            <span className="w-8 sm:w-12 h-[1px] bg-pink-300/30" />
            <span className="text-[11px] sm:text-xs uppercase tracking-[0.25em] text-pink-200/80 font-medium">
              Uma carta para você
            </span>
            <span className="w-8 sm:w-12 h-[1px] bg-pink-300/30" />
          </div>

          <Heart className="w-3.5 h-3.5 text-pink-400/50 group-hover:text-pink-300 transition-colors" />
        </div>
      </div>

      {/* CARTA ABERTA: PORTAL NO BODY PARA GARANTIR TOPO ABSOLUTO E CLICKS IMEDIATOS */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div
              data-interactive="true"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="fixed inset-0 z-[9999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0, y: 50, rotateX: 25 }}
                animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
                exit={{ scale: 0.6, opacity: 0, y: 50, rotateX: 25 }}
                transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                onClick={(e) => e.stopPropagation()}
                data-interactive="true"
                className="relative w-full max-w-lg max-h-[85vh] rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(244,63,94,0.2)] flex flex-col overflow-hidden"
                style={{
                  backgroundColor: '#fbf7ee',
                  backgroundImage: `
                    radial-gradient(#d6c7af 0.75px, transparent 0.75px),
                    linear-gradient(180deg, rgba(230,215,190,0.3) 0%, rgba(255,255,255,0.8) 10%, rgba(250,242,228,0.9) 100%)
                  `,
                  backgroundSize: '16px 16px, 100% 100%',
                  border: '1px solid #d4c2a3',
                }}
              >
                {/* Detalhe vintage no topo do papel */}
                <div className="h-2 w-full bg-gradient-to-r from-amber-700/30 via-rose-700/30 to-amber-700/30" />

                {/* Botão de Fechar */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-amber-900/10 hover:bg-amber-900/20 text-amber-900/70 hover:text-amber-900 flex items-center justify-center transition-all cursor-pointer z-30"
                  aria-label="Fechar carta"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Cabeçalho da Carta Escrita à Mão */}
                <div className="px-6 sm:px-8 pt-6 pb-3 flex items-center justify-between border-b border-amber-900/15">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-700 fill-rose-700/30" />
                    <span
                      className="text-rose-900 font-bold text-2xl tracking-wide"
                      style={{ fontFamily: "'Dancing Script', cursive" }}
                    >
                      Meu Amor...
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-900/50 uppercase tracking-widest font-serif mr-8">
                    Nossa História
                  </span>
                </div>

                {/* Conteúdo com Pautas Sutis de Caderno/Carta e Tipografia Caligráfica Escrita na Hora */}
                <div
                  className="flex-1 overflow-y-auto px-6 sm:px-8 py-5 custom-retro-scrollbar space-y-4"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(180, 150, 110, 0.15) 31px, rgba(180, 150, 110, 0.15) 32px)',
                    lineHeight: '32px',
                  }}
                >
                  <div className="text-[#2b170c] text-lg sm:text-xl font-normal leading-[32px] whitespace-pre-wrap selection:bg-rose-200"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontStyle: 'italic',
                    }}
                  >
                    {displayedText}
                    {!isTypingDone && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6 }}
                        className="inline-block w-1.5 h-5 ml-1 bg-rose-700 align-middle"
                      />
                    )}
                  </div>
                </div>

                {/* Assinatura / Rodapé da Carta */}
                <div className="px-6 sm:px-8 py-3.5 bg-[#f4ece0] border-t border-amber-900/15 flex items-center justify-between text-xs text-amber-950/70 font-serif">
                  <span className="italic">Para sempre seu, para sempre nós</span>
                  <span className="text-rose-700 font-serif font-bold text-base">♥</span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
