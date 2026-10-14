import { motion } from 'framer-motion';

export function Confetti() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.8 + Math.random() * 1.5,
    size: 4 + Math.random() * 6,
    color: [
      'var(--theme-primary)',
      'var(--theme-secondary)',
      'var(--theme-accent)',
      '#16a34a',
      '#f59e0b',
      '#ec4899',
      '#818cf8',
    ][Math.floor(Math.random() * 7)],
    rotation: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: '-5%',
            width: p.size,
            height: p.size * 1.4,
            backgroundColor: p.color,
            rotate: p.rotation,
          }}
          initial={{ y: 0, opacity: 1 }}
          animate={{
            y: '120vh',
            opacity: [1, 1, 0.8, 0],
            rotate: p.rotation + 720,
            x: [0, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 120],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  );
}
