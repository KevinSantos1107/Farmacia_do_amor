import { useState, useRef, useEffect } from 'react';
import { useRetroV2Store } from '../../store/useRetroV2Store';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';

// Cores mais vibrantes e românticas (neon)
const WHEEL_COLORS = [
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#a855f7', // Purple
  '#db2777', // Deep Pink
  '#6366f1', // Indigo
];

export function RouletteSlide() {
  const { config } = useRetroV2Store();
  const rawOptions = (config.rouletteOptions && config.rouletteOptions.length > 0)
    ? config.rouletteOptions
    : ['Jantar', 'Cinema', 'Viagem', 'Surpresa'];
  const sanitized = rawOptions
    .map((o) => (typeof o === 'string' ? o.trim() : String(o ?? '')))
    .filter(Boolean);
  const options = sanitized.length > 0 ? sanitized : ['Jantar', 'Cinema', 'Viagem', 'Surpresa'];

  const rotation = useMotionValue(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  
  // --- Charge Mechanic State (Botão) ---
  const [isCharging, setIsCharging] = useState(false);
  const [chargePower, setChargePower] = useState(0);
  const chargeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
    };
  }, []);

  // --- Lógica de Vencedor ---
  const calculateWinner = (rot: number) => {
    let deg = rot % 360;
    if (deg < 0) deg += 360; // Positivo 0-359
    
    // A fatia vencedora é a que para no topo
    const pointerDeg = (360 - deg) % 360; 
    const sliceSize = 360 / Math.max(1, options.length);
    const winningIndex = Math.floor(pointerDeg / sliceSize) % options.length;
    
    setWinner(options[winningIndex] || options[0]);
  };

  const spinTo = (targetRotation: number, duration: number) => {
    setIsSpinning(true);
    animate(rotation, targetRotation, {
      duration,
      ease: [0.2, 0.8, 0.1, 1], // Desaceleração suave
      onComplete: () => {
        setIsSpinning(false);
        calculateWinner(targetRotation);
      }
    });
  };

  // --- Eventos do Botão de Carga ---
  const handleButtonPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isSpinning) rotation.stop(); // Interrompe giro se houver
    setIsCharging(true);
    setChargePower(0);
    setWinner(null);
    setIsSpinning(false);
    
    chargeIntervalRef.current = setInterval(() => {
      setChargePower(prev => {
        if (prev >= 100) return 100;
        return prev + 1.5; 
      });
    }, 20);
  };

  const handleButtonPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isCharging) return;
    
    setIsCharging(false);
    if (chargeIntervalRef.current) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }

    const finalPower = Math.max(chargePower, 15);
    setChargePower(0);

    const duration = 3 + (finalPower / 100) * 5;
    const spins = Math.floor(2 + (finalPower / 100) * 10);
    const randomDegree = Math.floor(Math.random() * 360);
    
    const target = rotation.get() + spins * 360 + randomDegree;
    spinTo(target, duration);
  };

  // --- Eventos de Arrasto (Touch/Física na Roleta) ---
  const isDragging = useRef(false);
  const center = useRef({ x: 0, y: 0 });
  const lastAngle = useRef(0);
  const velocities = useRef<number[]>([]);
  const lastTime = useRef(0);

  const handleWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    rotation.stop(); // Freia a roleta na mão se estiver girando
    setIsSpinning(false);
    setWinner(null);
    
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    isDragging.current = true;
    velocities.current = [];
    
    const rect = e.currentTarget.getBoundingClientRect();
    center.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    const angle = Math.atan2(e.clientY - center.current.y, e.clientX - center.current.x) * (180 / Math.PI);
    lastAngle.current = angle;
    lastTime.current = Date.now();
  };

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!isDragging.current) return;
    
    const angle = Math.atan2(e.clientY - center.current.y, e.clientX - center.current.x) * (180 / Math.PI);
    let delta = angle - lastAngle.current;
    
    // Evita saltos caso passe do 180 para -180 (wrap-around)
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    
    rotation.set(rotation.get() + delta);
    
    const now = Date.now();
    const dt = Math.max(1, now - lastTime.current);
    const velocity = delta / dt; // Graus por milissegundo
    
    velocities.current.push(velocity);
    if (velocities.current.length > 5) velocities.current.shift(); // Guarda apenas as 5 últimas velocidades
    
    lastAngle.current = angle;
    lastTime.current = now;
  };

  const handleWheelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!isDragging.current) return;
    isDragging.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    
    // Média de velocidade para inércia do arremesso
    const avgVelocity = velocities.current.length 
      ? velocities.current.reduce((a, b) => a + b, 0) / velocities.current.length 
      : 0;
      
    const momentum = avgVelocity * 700; // Multiplicador de fluidez 
    const current = rotation.get();
    let targetRotation = current + momentum;
    
    // Se soltou quase parado, dá um "tapinha" pra frente pra alinhar gostoso
    if (Math.abs(momentum) < 25) {
      targetRotation += (momentum >= 0 ? 45 : -45);
    }
    
    const distance = Math.abs(targetRotation - current);
    let duration = Math.max(1.5, distance / 360); // 1 seg por volta completa aprox.
    duration = Math.min(duration, 5); // limite de 5s girando por arrasto
    
    // Apenas gira livremente sem acionar o sorteio
    animate(rotation, targetRotation, {
      duration,
      ease: [0.2, 0.8, 0.1, 1],
    });
  };

  const isMaxPower = chargePower === 100;

  return (
    <div className="flex-1 bg-[#09090b] flex flex-col items-center justify-center text-center p-4 relative overflow-hidden select-none">
      {/* Background com glow */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.3) 0%, transparent 70%)',
        }}
      />

      <div className="z-10 text-center mb-6 sm:mb-10 pointer-events-none">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-transparent bg-clip-text font-black text-3xl sm:text-4xl mb-2 uppercase tracking-widest"
          style={{ backgroundImage: 'linear-gradient(to right, #f472b6, #a78bfa)' }}
        >
          Onde Sair
        </motion.h2>
      </div>

      <div className="relative z-10 flex items-center justify-center w-full max-w-[260px] sm:max-w-[320px] aspect-square my-4">
        {/* Pointer */}
        <div className="absolute -top-5 z-20 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-white pointer-events-none" 
             style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))' }} 
        />

        {/* Wheel com Interatividade por Arrasto */}
        <motion.div
          onPointerDown={handleWheelPointerDown}
          onPointerMove={handleWheelPointerMove}
          onPointerUp={handleWheelPointerUp}
          onPointerCancel={handleWheelPointerUp}
          className="w-full h-full relative overflow-hidden rounded-full shadow-2xl border-[6px] border-white/10 touch-none cursor-grab active:cursor-grabbing"
          style={{
            rotate: rotation,
            boxShadow: '0 0 50px rgba(139,92,246,0.25), inset 0 0 20px rgba(0,0,0,0.5)',
            background: `conic-gradient(${options
              .map((_, i) => {
                const start = (i * 360) / options.length;
                const end = ((i + 1) * 360) / options.length;
                const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
                return `${color} ${start}deg ${end}deg`;
              })
              .join(', ')})`,
          }}
        >
          {/* Labels */}
          {options.map((opt, i) => {
            const angle = (i * 360) / options.length + 360 / options.length / 2;
            
            // Lógica inteligente de zoom e quebra de linha
            const optStr = typeof opt === 'string' ? opt : String(opt ?? '');
            const lines = optStr.split(' ');
            const longestLine = Math.max(...lines.map(l => l.length), 1);
            
            // Baseia o zoom na maior palavra para caber na vertical
            let scale = longestLine <= 7 ? 1 : Math.max(0.4, 7 / longestLine);
            
            // Se for uma frase (várias palavras), tira um pouco mais o zoom para caber na horizontal (largura da fatia)
            if (lines.length > 1) {
              scale *= Math.max(0.6, 1 - (lines.length - 1) * 0.15);
            }

            return (
              <div
                key={i}
                className="absolute w-full h-full flex justify-center items-start pt-5 sm:pt-6 select-none pointer-events-none"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <span
                  className="text-white font-black text-xs sm:text-sm tracking-widest uppercase"
                  style={{ 
                    writingMode: 'vertical-rl', 
                    textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 10px rgba(255,255,255,0.3)',
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    textAlign: 'center',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.2'
                  }}
                >
                  {lines.join('\n')}
                </span>
              </div>
            );
          })}
        </motion.div>

        {/* Center dot */}
        <div className="absolute z-20 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-md rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] border-2 border-white/30 flex items-center justify-center pointer-events-none">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full shadow-[0_0_10px_white]" />
        </div>
      </div>

      {/* Charge Indicator & Button */}
      <div className="mt-8 flex flex-col items-center w-full max-w-[200px] z-10">
        <motion.button
          animate={isMaxPower ? { x: [-2, 2, -2, 2, 0] } : {}}
          transition={isMaxPower ? { repeat: Infinity, duration: 0.2 } : {}}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onPointerDown={handleButtonPointerDown}
          onPointerUp={handleButtonPointerUp}
          onPointerLeave={handleButtonPointerUp} 
          onPointerCancel={handleButtonPointerUp}
          className="w-full px-8 py-3.5 rounded-full font-black text-xs sm:text-sm uppercase tracking-[0.2em] text-white relative overflow-hidden group touch-none"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            boxShadow: '0 10px 30px -10px rgba(139,92,246,0.5)',
            border: '2px solid rgba(139,92,246,0.3)'
          }}
        >
          {/* Progress fill */}
          <div 
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] transition-all duration-75 ease-linear opacity-80"
            style={{ width: `${isSpinning ? 0 : chargePower}%` }}
          />
          <span className="relative z-10 drop-shadow-md">
            {isSpinning ? 'Sorteando...' : 'Segure e Solte'}
          </span>
        </motion.button>
      </div>

      {/* Winner Popup */}
      <AnimatePresence>
        {winner && !isSpinning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="absolute z-50 flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="bg-[#110c22]/90 backdrop-blur-xl border border-[#8b5cf6]/50 px-10 py-8 rounded-3xl shadow-[0_0_60px_rgba(139,92,246,0.4)] flex flex-col items-center">
              <motion.span 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[#f472b6] text-xs font-bold uppercase tracking-[0.3em] mb-2"
              >
                O destino escolheu:
              </motion.span>
              
              <motion.h3 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="text-white text-4xl sm:text-5xl font-black tracking-tight max-w-[280px] text-center"
                style={{ textShadow: '0 0 30px rgba(255,255,255,0.4)', wordWrap: 'break-word' }}
              >
                {winner}
              </motion.h3>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4 flex gap-1 text-2xl"
              >
                ✨ 🎉 ✨
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
