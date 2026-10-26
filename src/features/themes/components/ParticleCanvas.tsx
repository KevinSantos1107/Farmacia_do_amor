import { useEffect, useRef } from 'react';

// ─── Particles ───────────────────────────────────────────────────────────────
export function ParticleCanvas({ theme }: { theme: 'meteors' | 'hearts' | 'aurora' | 'snow' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;

    let lastWidth = -1;
    let lastHeight = -1;
    let isPaused = false;
    let resumeLoop: (() => void) | null = null;

    // Pausa a animação quando a aba está oculta OU quando um overlay (modal de álbum)
    // está aberto. No iPhone, o canvas de partículas compete com o modal pela GPU
    // e causa tela preta/travamento. Para garantir que a pausa seja IMEDIATA (sem esperar
    // o próximo frame do requestAnimationFrame), cancelamos o animId existente e só
    // retomamos quando o overlay fechar.
    const handlePause = () => {
      const shouldPause = document.hidden || document.documentElement.hasAttribute('data-overlay-open');
      if (shouldPause && !isPaused) {
        isPaused = true;
        // Cancela o frame atual para liberar GPU imediatamente
        cancelAnimationFrame(animId);
        // Garante que o canvas fique limpo enquanto pausado
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else if (!shouldPause && isPaused) {
        isPaused = false;
        // Retoma o loop de animação específico do tema ativo
        resumeLoop?.();
      }
    };
    document.addEventListener('visibilitychange', handlePause);
    window.addEventListener('app:overlay-change', handlePause);

    if (theme === 'snow') {
      const snowFlakes: {
        x: number; y: number; r: number;
        speedY: number; speedX: number;
        sway: number; phase: number;
        type: 'orb' | 'flake' | 'dot';
      }[] = [];

      let mouseX = -1000;
      let mouseY = -1000;
      const onMouseMove = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; };
      const onTouchMove = (e: TouchEvent) => { mouseX = e.touches[0].clientX; mouseY = e.touches[0].clientY; };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onTouchMove, { passive: true });

      const createSprite = (type: 'orb' | 'flake' | 'dot') => {
        const c = document.createElement('canvas');
        const cCtx = c.getContext('2d')!;
        if (type === 'orb') {
          c.width = 40; c.height = 40;
          const grad = cCtx.createRadialGradient(20, 20, 0, 20, 20, 20);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
          grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.2)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          cCtx.fillStyle = grad;
          cCtx.fillRect(0, 0, 40, 40);
        } else if (type === 'flake') {
          c.width = 24; c.height = 24;
          cCtx.translate(12, 12);
          cCtx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          cCtx.lineWidth = 1.5;
          cCtx.lineCap = 'round';
          for (let i = 0; i < 6; i++) {
            cCtx.beginPath();
            cCtx.moveTo(0, 0);
            cCtx.lineTo(0, -10);
            cCtx.moveTo(0, -4);
            cCtx.lineTo(3, -7);
            cCtx.moveTo(0, -4);
            cCtx.lineTo(-3, -7);
            cCtx.stroke();
            cCtx.rotate(Math.PI / 3);
          }
        } else {
          c.width = 4; c.height = 4;
          cCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          cCtx.beginPath();
          cCtx.arc(2, 2, 1.5, 0, Math.PI * 2);
          cCtx.fill();
        }
        return c;
      };

      const sprites = {
        orb: createSprite('orb'),
        flake: createSprite('flake'),
        dot: createSprite('dot'),
      };

      const init = () => {
        snowFlakes.length = 0;
        for (let i = 0; i < 110; i++) {
          let type: 'orb' | 'flake' | 'dot';
          let r, speedY;
          if (i < 12) { type = 'orb'; r = Math.random() * 4 + 8; speedY = Math.random() * 0.8 + 0.8; }
          else if (i < 40) { type = 'flake'; r = Math.random() * 2 + 3; speedY = Math.random() * 0.5 + 0.5; }
          else { type = 'dot'; r = Math.random() * 1 + 1; speedY = Math.random() * 0.3 + 0.2; }

          snowFlakes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r, speedY, speedX: 0,
            sway: (Math.random() - 0.5) * 0.5,
            phase: Math.random() * Math.PI * 2,
            type,
          });
        }
      };

      const resize = () => {
        if (canvas.width !== 0 && window.innerWidth === lastWidth && Math.abs(window.innerHeight - lastHeight) < 150) return;
        lastWidth = window.innerWidth;
        lastHeight = window.innerHeight;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        init();
      };

      const draw = () => {
        // Quando pausado, o handleVisibilityChange já cancelou o animId.
        // O draw() só é chamado de novo quando o overlay fechar (isPaused = false → draw()).
        if (isPaused) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        snowFlakes.forEach((f) => {
          f.phase += 0.01;
          
          let targetSpeedX = Math.sin(f.phase) * f.sway;
          
          const dx = mouseX - f.x;
          const dy = mouseY - f.y;
          const distSq = dx * dx + dy * dy;
          const repelRadius = 150;
          
          if (distSq < repelRadius * repelRadius) {
            const dist = Math.sqrt(distSq);
            const force = (repelRadius - dist) / repelRadius;
            targetSpeedX += (dx / dist) * force * 4; 
            f.y += (dy / dist) * force * 1.5; 
          }

          f.speedX += (targetSpeedX - f.speedX) * 0.05;
          f.x += f.speedX;
          f.y += f.speedY;

          if (f.y > canvas.height + f.r) { f.y = -f.r; f.x = Math.random() * canvas.width; }
          if (f.x > canvas.width + f.r) f.x = -f.r;
          if (f.x < -f.r) f.x = canvas.width + f.r;

          const sprite = sprites[f.type];
          ctx.drawImage(sprite, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
        });
        animId = requestAnimationFrame(draw);
      };
      
      window.addEventListener('resize', resize);
      resize();
      resumeLoop = draw;
      draw();
      
      return () => {
        resumeLoop = null;
        window.removeEventListener('resize', resize);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('visibilitychange', handlePause);
        window.removeEventListener('app:overlay-change', handlePause);
        cancelAnimationFrame(animId);
      };
    }

    if (theme === 'aurora') {
      const stars: {
        x: number;
        y: number;
        r: number;
        baseAlpha: number;
        speed: number;
        phase: number;
        color: string;
      }[] = [];
      const starColors = [
        'rgba(255, 255, 255,',
        'rgba(200, 240, 255,',
        'rgba(180, 255, 220,',
        'rgba(220, 220, 255,',
      ];
      let time = 0;

      const init = () => {
        stars.length = 0;
        for (let i = 0; i < 80; i++) {
          stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.75,
            r: Math.random() * 1.5 + 0.3,
            baseAlpha: Math.random() * 0.5 + 0.2,
            speed: Math.random() * 0.6 + 0.2,
            phase: Math.random() * Math.PI * 2,
            color: starColors[Math.floor(Math.random() * starColors.length)],
          });
        }
      };

      const resize = () => {
        if (canvas.width !== 0 && window.innerWidth === lastWidth && Math.abs(window.innerHeight - lastHeight) < 150) {
          return;
        }
        lastWidth = window.innerWidth;
        lastHeight = window.innerHeight;
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        init(); 
      };

      const draw = () => {
        if (isPaused) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        time += 0.016;
        stars.forEach((s) => {
          const alpha = s.baseAlpha * (0.4 + 0.6 * Math.abs(Math.sin(time * s.speed + s.phase)));
          ctx.fillStyle = `${s.color}${alpha})`;
          ctx.fillRect(s.x, s.y, s.r * 2, s.r * 2);
        });
        animId = requestAnimationFrame(draw);
      };
      window.addEventListener('resize', resize);
      resize();
      resumeLoop = draw;
      draw();
      return () => {
        resumeLoop = null;
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', handlePause);
        window.removeEventListener('app:overlay-change', handlePause);
        cancelAnimationFrame(animId);
      };
    }

    if (theme === 'meteors') {
      const stars: {
        x: number; y: number; r: number;
        baseAlpha: number; speed: number; phase: number;
        isBlinker: boolean;
      }[] = [];
      let time = 0;

      const init = () => {
        stars.length = 0;
        const count = window.innerWidth < 640 ? 60 : 120;
        for (let i = 0; i < count; i++) {
          stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.2 + 0.3,
            baseAlpha: Math.random() * 0.5 + 0.3,
            speed: Math.random() * 0.5 + 0.2,
            phase: Math.random() * Math.PI * 2,
            isBlinker: Math.random() > 0.6,
          });
        }
      };

      const resize = () => {
        if (canvas.width !== 0 && window.innerWidth === lastWidth && Math.abs(window.innerHeight - lastHeight) < 150) return;
        lastWidth = window.innerWidth;
        lastHeight = window.innerHeight;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        init();
      };

      const draw = () => {
        if (isPaused) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        time += 0.016;
        
        ctx.fillStyle = '#ffffff'; 
        
        stars.forEach((s) => {
          let alpha = s.baseAlpha;
          if (s.isBlinker) {
            alpha *= (0.3 + 0.7 * Math.abs(Math.sin(time * s.speed + s.phase)));
          }
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        animId = requestAnimationFrame(draw);
      };
      
      window.addEventListener('resize', resize);
      resize();
      resumeLoop = draw;
      draw();
      
      return () => {
        resumeLoop = null;
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', handlePause);
        window.removeEventListener('app:overlay-change', handlePause);
        cancelAnimationFrame(animId);
      };
    }

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
      color: string;
    }[] = [];

    const colors = ['rgba(255, 0, 85,', 'rgba(255, 42, 122,', 'rgba(255, 77, 148,'];

    const init = () => {
      particles.length = 0;
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.5 - 0.1,
          r: Math.random() * 2.5 + 0.5,
          alpha: Math.random() * 0.4 + 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const resize = () => {
      if (canvas.width !== 0 && window.innerWidth === lastWidth && Math.abs(window.innerHeight - lastHeight) < 150) {
        return;
      }
      lastWidth = window.innerWidth;
      lastHeight = window.innerHeight;
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    const draw = () => {
      if (isPaused) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
      });
      animId = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', resize);
    resize();
    resumeLoop = draw;
    draw();
    return () => {
      resumeLoop = null;
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handlePause);
      window.removeEventListener('app:overlay-change', handlePause);
      cancelAnimationFrame(animId);
    };
  }, [theme]);
  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-screen h-[100lvh] pointer-events-none z-0 opacity-60" />;
}
