
    // ===== ANIMAÇÕES DE FUNDO PREMIUM - VERSÃO COM CORAÇÕES CONTÍNUOS =====

    let canvas, ctx;
    let particles = [];
    let stars = [];
    let snowAccumulation = [];
    let animationId = null;
    let currentAnimation = 'meteors';
    let skyGradientCache = null; // Cache do gradiente do céu

    // Configurações avançadas para cada tema
    const settings = {
        meteors: {
            name: 'Chuva de Meteoros',
            stars: 150,
            meteors: 8,
            starColors: ['#ffffff', '#f0f0ff', '#e6f7ff', '#fffacd'],
            meteorColors: ['#8a2be2', '#00ffff', '#ff00ff', '#ffd700'],
            backgroundColor: '#0a0a1a',
            meteorSpeed: 2.5,
            twinkleSpeed: 0.003
        },
        hearts: {
            name: 'Chuva de Corações',
            hearts: 25, // Número de corações na tela
            sparkles: 40, // Número de brilhos na tela
            heartColors: [
                '#ff0055', '#ff3366', '#e91e63', // Rosa/vermelho vibrante
                '#ff6b8b', '#ff9a9e', '#ffccd5', // Rosa suave
                '#ff7676', '#ff5252', '#ff4040'  // Vermelho puro
            ],
            sparkleColors: ['#ffffff', '#ffe6e6', '#ffccd5', '#ffebee'],
            backgroundColor: '#1a001a',
            heartSpeed: 0.8,
            floatAmplitude: 0.5,
            rotationSpeed: 0.01,
            heartStyles: ['solid', 'gradient', 'outline']
        },
        aurora: {
            name: 'Aurora Boreal',
            layers: 4,
            particles: 100,
            auroraColors: [
                ['#00ff88', '#00cc66', '#009944'],
                ['#22ffaa', '#00aa55', '#008844'],
                ['#44ffcc', '#00cc88', '#009966'],
                ['#66ffee', '#00eeaa', '#00aa77']
            ],
            starColors: ['#ffffff', '#f0f8ff', '#e6f7ff'],
            backgroundColor: '#001122',
            waveSpeed: 0.0008,
            particleSpeed: 0.6
        },

        winter: {
            name: 'Inverno Mágico',
            snowflakes: 50,
            smallSnow: 80,
            sparkles: 30,
            icePatches: 8,
            frostLines: 0,
            snowColors: ['#ffffff', '#f0f9ff', '#dbeafe', '#e0f2fe'], // ← Tons de branco com leve azul
            sparkleColors: ['#60a5fa', '#93c5fd', '#ffffff'], // ← Azul diamante + branco
            iceColors: ['#60a5fa', '#93c5fd', '#3b82f6'], // ← Azul diamante + azul royal
            skyGradient: [
                '#0f172a', // ← Azul escuro profundo (topo)
                '#1e293b',
                '#334155',
                '#475569',
                '#64748b',
                '#94a3b8',
                '#cbd5e1'  // ← Azul claro (base)
            ],
            snowSpeed: 0.6,
            windStrength: 0.3,
            rotationSpeed: 0.02,
            accumulation: true,
            glowIntensity: 0.2,
            fogOpacity: 0.1
        },
    };



    // ===== INICIALIZAÇÃO =====
    function initAnimations(themeName = 'meteors') {
        console.log('🎨 Iniciando animações...');
        
        // 1. Garantir que o canvas existe
        if (!document.getElementById('backgroundCanvas')) {
            createCanvas();
        }
        
        canvas = document.getElementById('backgroundCanvas');
        if (!canvas) {
            console.error('❌ Canvas não encontrado');
            return;
        }
        
        ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('❌ Contexto 2D não disponível');
            return;
        }
        
        // 2. Configurar canvas
        setupCanvas();
        
        // 3. Usar tema fornecido ou detectar
        if (themeName && settings[themeName]) {
            currentAnimation = themeName;
            console.log(`🎯 Usando tema: ${settings[themeName].name}`);
        } else {
            // Tentar detectar do body
            const bodyTheme = document.body.className.match(/theme-(\w+)/);
            if (bodyTheme && bodyTheme[1] && settings[bodyTheme[1]]) {
                currentAnimation = bodyTheme[1];
                console.log(`🎨 Tema detectado do body: ${settings[currentAnimation].name}`);
            } else {
                currentAnimation = 'meteors';
                console.log('📌 Usando tema padrão: Meteoros');
            }
        }
        
        // 4. Criar elementos e iniciar
        createElements();
        startAnimation();
        
        console.log(`✅ ${settings[currentAnimation].name} iniciado!`);
    }
    function createCanvas() {
        canvas = document.createElement('canvas');
        canvas.id = 'backgroundCanvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '-1';
        canvas.style.pointerEvents = 'none';
        document.body.insertBefore(canvas, document.body.firstChild);
    }

    function setupCanvas() {
        resizeCanvas();
        window.addEventListener('resize', handleResize);
    }

// Substituir a função handleResize() existente por esta:
function handleResize() {
    if (!canvas) return;
    
    // Debounce para evitar múltiplos resizes
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        const newWidth = window.innerWidth;
        const newHeight = Math.max(
            window.innerHeight,
            document.documentElement.clientHeight,
            window.screen.height * 0.9
        );
        
        // Só redimensionar se mudou significativamente
        if (Math.abs(canvas.width - newWidth) > 10 || 
            Math.abs(canvas.height - newHeight) > 10) {
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            // Reajustar posições dos elementos (já existente no seu código)
            if (currentAnimation === 'hearts') {
                particles.forEach(particle => {
                    if (particle.type === 'heart') {
                        if (particle.x > canvas.width + 100 || particle.x < -100) {
                            particle.x = Math.random() * canvas.width;
                        }
                        if (particle.y > canvas.height + 100 || particle.y < -100) {
                            particle.y = Math.random() * canvas.height;
                        }
                    }
                });
                
                stars.forEach(star => {
                    if (star.type === 'sparkle') {
                        if (star.x > canvas.width + 100 || star.x < -100) {
                            star.x = Math.random() * canvas.width;
                        }
                        if (star.y > canvas.height + 100 || star.y < -100) {
                            star.y = Math.random() * canvas.height;
                        }
                    }
                });
            }
        }
    }, 100); // Espera 100ms após o último resize
}

function resizeCanvas() {
    if (!canvas) return;
    
    // ✨ SOLUÇÃO: Usar a altura MÁXIMA disponível
    const maxHeight = Math.max(
        window.innerHeight,
        document.documentElement.clientHeight,
        window.screen.height * 0.9 // Garante cobertura extra em mobile
    );
    
    canvas.width = window.innerWidth;
    canvas.height = maxHeight;
    
    // 🔧 IMPORTANTE: Ajustar também o estilo CSS para cobrir sempre
    canvas.style.height = '100vh';
    canvas.style.minHeight = '100vh';
}

    // ===== CRIAÇÃO DE ELEMENTOS =====
    function createElements() {
        particles = [];
        stars = [];
        snowAccumulation = []; // ← ADICIONAR
        
        if (currentAnimation === 'meteors') {
            createStars();
            createMeteors();
        } else if (currentAnimation === 'hearts') {
            createBeautifulHearts();
            createSparkles();
        } else if (currentAnimation === 'aurora') {
            createAurora();
            createAuroraStars();
    } else if (currentAnimation === 'winter') {
            createWinterScene();
    } 
    }



    // ===== TEMA: CHUVA DE METEOROS (MANTIDO) =====
    function createStars() {
        const config = settings.meteors;
        
        for (let i = 0; i < config.stars; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 1.5 + 0.5,
                brightness: Math.random() * 0.7 + 0.3,
                twinkleSpeed: Math.random() * 0.005 + 0.001,
                twinkleOffset: Math.random() * Math.PI * 2,
                color: config.starColors[Math.floor(Math.random() * config.starColors.length)]
            });
        }
    }

    function createMeteors() {
        const config = settings.meteors;
        
        for (let i = 0; i < config.meteors; i++) {
            particles.push({
                type: 'meteor',
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height * 0.3,
                length: Math.random() * 60 + 30,
                speed: Math.random() * config.meteorSpeed + 1.5,
                angle: Math.random() * Math.PI / 6 + Math.PI / 12,
                size: Math.random() * 2 + 1,
                color: config.meteorColors[Math.floor(Math.random() * config.meteorColors.length)],
                trail: [],
                maxTrail: 15,
                brightness: Math.random() * 0.5 + 0.5
            });
        }
    }

    function drawStars() {
        const time = Date.now();
        
        stars.forEach(star => {
            const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
            const currentBrightness = star.brightness * twinkle;
            
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            
            const gradient = ctx.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, star.size * 2
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${currentBrightness})`);
            gradient.addColorStop(0.5, `rgba(255, 255, 255, ${currentBrightness * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            if (star.size > 1) {
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${currentBrightness * 0.1})`;
                ctx.fill();
            }
        });
    }

    function drawMeteors() {
        particles.forEach(particle => {
            if (particle.type !== 'meteor') return;
            
            particle.x += Math.cos(particle.angle) * particle.speed;
            particle.y += Math.sin(particle.angle) * particle.speed;
            
            particle.trail.push({ x: particle.x, y: particle.y });
            if (particle.trail.length > particle.maxTrail) {
                particle.trail.shift();
            }
            
            if (particle.x > canvas.width + 100 || particle.y > canvas.height + 100) {
                particle.x = Math.random() * canvas.width * 0.5;
                particle.y = Math.random() * canvas.height * 0.3;
                particle.trail = [];
            }
            
            if (particle.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
                
                for (let i = 1; i < particle.trail.length; i++) {
                    ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
                }
                
                const gradient = ctx.createLinearGradient(
                    particle.trail[0].x, particle.trail[0].y,
                    particle.x, particle.y
                );
                gradient.addColorStop(0, `${particle.color}00`);
                gradient.addColorStop(0.3, `${particle.color}${Math.floor(particle.brightness * 150).toString(16).padStart(2, '0')}`);
                gradient.addColorStop(1, `${particle.color}ff`);
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = particle.size;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 1.5, 0, Math.PI * 2);
            
            const headGradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size * 3
            );
            headGradient.addColorStop(0, `rgba(255, 255, 255, ${particle.brightness})`);
            headGradient.addColorStop(0.5, `${particle.color}${Math.floor(particle.brightness * 200).toString(16).padStart(2, '0')}`);
            headGradient.addColorStop(1, `${particle.color}00`);
            
            ctx.fillStyle = headGradient;
            ctx.fill();
        });
    }

    // ===== TEMA: CHUVA DE CORAÇÕES CONTÍNUA =====
    function createBeautifulHearts() {
        const config = settings.hearts;
        
        for (let i = 0; i < config.hearts; i++) {
            createSingleHeart();
        }
    }

    function createSingleHeart() {
        const config = settings.hearts;
        
        // VERIFICAÇÃO DE SEGURANÇA - CANVAS DEVE EXISTIR
        if (!canvas || !ctx) {
            console.error('❌ Canvas não está pronto para criar corações');
            return;
        }
        
        const style = config.heartStyles[Math.floor(Math.random() * config.heartStyles.length)];
        const isOutline = style === 'outline';
        
        particles.push({
            type: 'heart',
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 20 + 15,
            speedY: Math.random() * config.heartSpeed + 0.6,
            speedX: (Math.random() - 0.5) * 0.8,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * config.rotationSpeed,
            color: config.heartColors[Math.floor(Math.random() * config.heartColors.length)],
            opacity: isOutline ? Math.random() * 0.4 + 0.3 : Math.random() * 0.5 + 0.4,
            pulseSpeed: Math.random() * 0.008 + 0.003,
            pulseOffset: Math.random() * Math.PI * 2,
            swing: Math.random() * Math.PI * 2,
            swingSpeed: Math.random() * 0.008 + 0.002,
            style: style,
            wobble: Math.random() * 0.02 + 0.005,
            wobbleOffset: Math.random() * Math.PI * 2,
            scale: Math.random() * 0.1 + 0.9,
            glow: Math.random() * 0.15 + 0.05,
            age: 0
        });
    }

    function createSparkles() {
        const config = settings.hearts;
        
        for (let i = 0; i < config.sparkles; i++) {
            createSingleSparkle();
        }
    }

    function createSingleSparkle() {
        const config = settings.hearts;
        
        stars.push({
            type: 'sparkle',
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.8,
            speedY: Math.random() * 0.5 + 0.2,
            speedX: (Math.random() - 0.5) * 0.3,
            color: config.sparkleColors[Math.floor(Math.random() * config.sparkleColors.length)],
            brightness: Math.random() * 0.8 + 0.3,
            twinkleSpeed: Math.random() * 0.006 + 0.002,
            twinkleOffset: Math.random() * Math.PI * 2,
            trail: [],
            maxTrail: 3,
            age: 0
        });
    }

    function drawHearts() {
        const time = Date.now();
        const config = settings.hearts;
        
        particles.forEach((particle, index) => {
            if (particle.type !== 'heart') return;
            
            particle.age += 0.01;
            
            // Movimento com leve aceleração
            particle.speedY += 0.002; // Gravidade muito suave
            particle.y += particle.speedY;
            
            // Oscilação horizontal natural
            const swing = Math.sin(time * particle.swingSpeed + particle.swing) * config.floatAmplitude;
            particle.x += swing * 0.2 + particle.speedX;
            
            // Resistência do ar no movimento horizontal
            particle.speedX *= 0.998;
            
            // Efeito de pulsação
            const pulse = Math.sin(time * particle.pulseSpeed + particle.pulseOffset) * 0.08 + 0.92;
            const currentSize = particle.size * pulse * particle.scale;
            const currentOpacity = particle.opacity * pulse;
            
            // Efeito de balanço natural
            particle.rotation += particle.rotationSpeed;
            particle.rotation += Math.sin(time * particle.wobble + particle.wobbleOffset) * 0.015;
            
            // Verificar se saiu da tela
            const isOffScreen = particle.y > canvas.height + 100 || 
                            particle.y < -100 || 
                            particle.x < -100 || 
                            particle.x > canvas.width + 100;
            
            // Reciclar corações que saíram da tela ou são muito antigos
            if (isOffScreen || particle.age > 50) {
                recycleHeart(particle);
                return;
            }
            
            // Desenhar coração
            ctx.save();
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            ctx.globalAlpha = currentOpacity;
            
            // Efeito de profundidade baseado na posição Y
            const depthFactor = 1 - Math.min(particle.y / canvas.height, 0.5) * 0.4;
            
            // Escolher estilo de desenho
            switch(particle.style) {
                case 'solid':
                    drawSolidHeart(currentSize * depthFactor, particle.color, particle.glow * depthFactor);
                    break;
                case 'gradient':
                    drawGradientHeart(currentSize * depthFactor, particle.color);
                    break;
                case 'outline':
                    drawOutlineHeart(currentSize * depthFactor, particle.color);
                    break;
            }
            
            ctx.restore();
        });
    }

    function recycleHeart(heart) {
        // Resetar para posição acima da tela
        heart.y = -30;
        heart.x = Math.random() * canvas.width;
        
        // Resetar propriedades de movimento
        heart.speedY = Math.random() * settings.hearts.heartSpeed + 0.6;
        heart.speedX = (Math.random() - 0.5) * 0.8;
        heart.rotation = Math.random() * Math.PI * 2;
        heart.age = 0;
        
        // 15% de chance de mudar de estilo
        if (Math.random() < 0.15) {
            heart.style = settings.hearts.heartStyles[
                Math.floor(Math.random() * settings.hearts.heartStyles.length)
            ];
            heart.color = settings.hearts.heartColors[
                Math.floor(Math.random() * settings.hearts.heartColors.length)
            ];
        }
    }

    function drawSparkles() {
        const time = Date.now();
        const config = settings.hearts;
        
        stars.forEach(star => {
            if (star.type !== 'sparkle') return;
            
            star.age += 0.01;
            star.y += star.speedY;
            star.x += star.speedX;
            
            const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.4 + 0.6;
            const brightness = star.brightness * twinkle;
            
            star.trail.push({ x: star.x, y: star.y });
            if (star.trail.length > star.maxTrail) {
                star.trail.shift();
            }
            
            // Verificar se saiu da tela ou é muito antigo
            const isOffScreen = star.y > canvas.height + 50 || 
                            star.y < -50 || 
                            star.x < -50 || 
                            star.x > canvas.width + 50;
            
            if (isOffScreen || star.age > 40) {
                recycleSparkle(star);
                return;
            }
            
            // Desenhar trilha suave
            if (star.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(star.trail[0].x, star.trail[0].y);
                
                for (let i = 1; i < star.trail.length; i++) {
                    ctx.lineTo(star.trail[i].x, star.trail[i].y);
                }
                
                ctx.strokeStyle = `${star.color}15`;
                ctx.lineWidth = 1;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            
            // Desenhar sparkle
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            
            const gradient = ctx.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, star.size * 2.5
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${brightness * 0.9})`);
            gradient.addColorStop(0.6, `${star.color}${Math.floor(brightness * 100).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Raios para sparkles maiores
            if (star.size > 1.3) {
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI) / 3;
                    const length = star.size * 2.5;
                    ctx.moveTo(star.x, star.y);
                    ctx.lineTo(
                        star.x + Math.cos(angle) * length,
                        star.y + Math.sin(angle) * length
                    );
                }
                ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.2})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });
    }

    function recycleSparkle(sparkle) {
        // Resetar para posição acima ou na tela
        sparkle.y = Math.random() * canvas.height;
        sparkle.x = Math.random() * canvas.width;
        sparkle.trail = [];
        sparkle.age = 0;
        
        // Resetar propriedades
        sparkle.speedY = Math.random() * 0.5 + 0.2;
        sparkle.speedX = (Math.random() - 0.5) * 0.3;
        sparkle.size = Math.random() * 2 + 0.8;
        sparkle.brightness = Math.random() * 0.8 + 0.3;
    }

    // Funções auxiliares para desenhar corações (MANTIDAS)
    function drawSolidHeart(size, color, glow) {
        ctx.beginPath();
        drawHeartShape(size);
        
        const gradient = ctx.createLinearGradient(0, -size * 0.8, 0, size * 0.8);
        gradient.addColorStop(0, lightenColor(color, 40));
        gradient.addColorStop(0.3, color);
        gradient.addColorStop(0.7, color);
        gradient.addColorStop(1, darkenColor(color, 20));
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.beginPath();
        drawHeartShape(size);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function drawGradientHeart(size, color) {
        ctx.beginPath();
        drawHeartShape(size);
        
        const gradient = ctx.createRadialGradient(
            0, -size * 0.3, 0,
            0, -size * 0.3, size
        );
        gradient.addColorStop(0, lightenColor(color, 50));
        gradient.addColorStop(0.3, color);
        gradient.addColorStop(0.7, darkenColor(color, 10));
        gradient.addColorStop(1, darkenColor(color, 25));
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.beginPath();
        drawHeartShape(size);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function drawOutlineHeart(size, color) {
        ctx.beginPath();
        drawHeartShape(size);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        ctx.beginPath();
        drawHeartShape(size * 0.7);
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = color + '80';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawHeartShape(size) {
        ctx.moveTo(0, -size/2);
        ctx.bezierCurveTo(-size/2, -size, -size, 0, 0, size/2);
        ctx.bezierCurveTo(size, 0, size/2, -size, 0, -size/2);
        ctx.closePath();
    }

    function lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return "#" + (
            0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1);
    }

    function darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        
        return "#" + (
            0x1000000 +
            (R > 0 ? R : 0) * 0x10000 +
            (G > 0 ? G : 0) * 0x100 +
            (B > 0 ? B : 0)
        ).toString(16).slice(1);
    }

    // ===== TEMA: AURORA BOREAL (MANTIDO) =====
    function createAurora() {
        const config = settings.aurora;
        
        for (let layer = 0; layer < config.layers; layer++) {
            const yOffset = canvas.height * 0.15 + (layer * 35);
            const colors = config.auroraColors[layer % config.auroraColors.length];
            
            particles.push({
                type: 'aurora',
                layer: layer,
                y: yOffset,
                waveOffset: Math.random() * Math.PI * 2,
                amplitude: Math.random() * 40 + 25,
                waveLength: Math.random() * 180 + 250,
                speed: Math.random() * config.waveSpeed + 0.0004,
                colors: colors,
                opacity: 0.08 + (layer * 0.04),
                points: [],
                height: Math.random() * 40 + 60
            });
        }
        
        for (let i = 0; i < config.particles; i++) {
            particles.push({
                type: 'auroraParticle',
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height * 0.8,
                size: Math.random() * 2.5 + 0.8,
                speedY: Math.random() * 0.4 + 0.1,
                speedX: (Math.random() - 0.5) * 0.2,
                color: config.auroraColors[Math.floor(Math.random() * config.auroraColors.length)][1],
                opacity: Math.random() * 0.4 + 0.1,
                floatSpeed: Math.random() * 0.015 + 0.005,
                floatOffset: Math.random() * Math.PI * 2
            });
        }
    }

    function createAuroraStars() {
        const config = settings.aurora;
        
        for (let i = 0; i < 120; i++) {
            stars.push({
                type: 'auroraStar',
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height * 0.9,
                size: Math.random() * 1.8 + 0.5,
                brightness: Math.random() * 0.9 + 0.3,
                twinkleSpeed: Math.random() * 0.003 + 0.0008,
                twinkleOffset: Math.random() * Math.PI * 2,
                color: config.starColors[Math.floor(Math.random() * config.starColors.length)]
            });
        }
    }

    function drawAurora() {
        const time = Date.now();
        
        particles.forEach(particle => {
            if (particle.type !== 'auroraParticle') return;
            
            particle.y += particle.speedY;
            particle.x += Math.sin(time * particle.floatSpeed + particle.floatOffset) * 0.3;
            particle.x += particle.speedX;
            
            if (particle.y > canvas.height * 0.9) {
                particle.y = Math.random() * canvas.height * 0.2;
                particle.x = Math.random() * canvas.width;
            }
            if (particle.x < -10) particle.x = canvas.width + 10;
            if (particle.x > canvas.width + 10) particle.x = -10;
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            
            const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size * 3
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity})`);
            gradient.addColorStop(0.5, `${particle.color}${Math.floor(particle.opacity * 100).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fill();
        });
        
        particles.forEach(particle => {
            if (particle.type !== 'aurora') return;
            
            const waveTime = time * particle.speed + particle.waveOffset;
            
            particle.points = [];
            const segments = 80;
            
            for (let i = 0; i <= segments; i++) {
                const x = (i / segments) * canvas.width;
                const wave = Math.sin(x / particle.waveLength + waveTime) * particle.amplitude;
                const y = particle.y + wave;
                
                particle.points.push({ x, y });
            }
            
            const gradient = ctx.createLinearGradient(0, particle.y - particle.height/2, 0, particle.y + particle.height/2);
            
            particle.colors.forEach((color, index) => {
                const pos = index / (particle.colors.length - 1);
                const alpha = Math.floor(particle.opacity * 255).toString(16).padStart(2, '0');
                gradient.addColorStop(pos, color + alpha);
            });
            
            ctx.beginPath();
            ctx.moveTo(particle.points[0].x, particle.points[0].y - particle.height/2);
            
            for (let i = 1; i < particle.points.length; i++) {
                const x = particle.points[i].x;
                const y = particle.points[i].y - particle.height/2;
                ctx.lineTo(x, y);
            }
            
            for (let i = particle.points.length - 1; i >= 0; i--) {
                const x = particle.points[i].x;
                const y = particle.points[i].y + particle.height/2;
                ctx.lineTo(x, y);
            }
            
            ctx.closePath();
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(particle.points[0].x, particle.points[0].y - particle.height/2);
            
            for (let i = 1; i < particle.points.length; i++) {
                ctx.lineTo(particle.points[i].x, particle.points[i].y - particle.height/2);
            }
            
            const glowGradient = ctx.createLinearGradient(0, particle.y - particle.height/2, 0, particle.y - particle.height/4);
            glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.strokeStyle = glowGradient;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
        });
    }

    function drawAuroraStars() {
        const time = Date.now();
        
        stars.forEach(star => {
            if (star.type !== 'auroraStar') return;
            
            const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.4 + 0.6;
            const brightness = star.brightness * twinkle;
            
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            
            const gradient = ctx.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, star.size * 4
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${brightness})`);
            gradient.addColorStop(0.3, `rgba(255, 255, 255, ${brightness * 0.7})`);
            gradient.addColorStop(0.7, `rgba(255, 255, 255, ${brightness * 0.3})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            if (star.size > 1.2) {
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    const angle = (i * Math.PI) / 2;
                    const x1 = star.x + Math.cos(angle) * star.size;
                    const y1 = star.y + Math.sin(angle) * star.size;
                    const x2 = star.x + Math.cos(angle) * star.size * 3;
                    const y2 = star.y + Math.sin(angle) * star.size * 3;
                    
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                }
                ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.3})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });
    }

    // ===== TEMA: INVERNO MÁGICO =====
    function createWinterScene() {
        const config = settings.winter;
        
        for (let i = 0; i < config.snowflakes; i++) {
            createMainSnowflake();
        }
        
        for (let i = 0; i < config.smallSnow; i++) {
            createSmallSnowflake();
        }
        
        for (let i = 0; i < config.sparkles; i++) {
            createWinterSparkle();
        }
        
        // Desabilitar frostLines por performance
        // for (let i = 0; i < config.frostLines; i++) {
        //     createFrostLine();
        // }
        
        initSnowAccumulation();
    }

    function createMainSnowflake() {
        const config = settings.winter;
        const types = ['detailed', 'star', 'crystal'];
        
        particles.push({
            type: 'mainSnow',
            snowType: types[Math.floor(Math.random() * types.length)],
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height, // ← MUDANÇA: Começar em posições aleatórias na tela inteira
            size: Math.random() * 8 + 6,
            speedY: Math.random() * config.snowSpeed + 0.4,
            speedX: (Math.random() - 0.5) * config.windStrength,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * config.rotationSpeed,
            swing: Math.random() * Math.PI * 2,
            swingSpeed: Math.random() * 0.01 + 0.003,
            swingAmplitude: Math.random() * 1.5 + 0.5,
            color: config.snowColors[Math.floor(Math.random() * config.snowColors.length)],
            opacity: Math.random() * 0.4 + 0.6,
            wobble: Math.random() * 0.015 + 0.005,
            wobbleOffset: Math.random() * Math.PI * 2,
            depth: Math.random() * 0.5 + 0.7,
            glow: Math.random() * config.glowIntensity + 0.1,
            age: 0
        });
    }

    function createSmallSnowflake() {
        const config = settings.winter;
        
        particles.push({
            type: 'smallSnow',
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speedY: Math.random() * 0.3 + 0.1,
            speedX: (Math.random() - 0.5) * 0.2,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.01,
            color: config.snowColors[Math.floor(Math.random() * config.snowColors.length)],
            opacity: Math.random() * 0.2 + 0.1,
            depth: Math.random() * 0.3 + 0.3,
            age: 0
        });
    }

    function createWinterSparkle() {
        const config = settings.winter;
        
        stars.push({
            type: 'winterSparkle',
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.7,
            size: Math.random() * 2 + 0.5,
            speedY: Math.random() * 0.2 + 0.05,
            speedX: (Math.random() - 0.5) * 0.15,
            color: config.sparkleColors[Math.floor(Math.random() * config.sparkleColors.length)],
            brightness: Math.random() * 0.8 + 0.3,
            twinkleSpeed: Math.random() * 0.008 + 0.003,
            twinkleOffset: Math.random() * Math.PI * 2,
            pulseSpeed: Math.random() * 0.01 + 0.005,
            pulseOffset: Math.random() * Math.PI * 2,
            age: 0
        });
    }

    function createIcePatch() {
        const config = settings.winter;
        
        particles.push({
            type: 'icePatch',
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.6,
            width: Math.random() * 80 + 40,
            height: Math.random() * 50 + 30,
            speedY: Math.random() * 0.15 + 0.05,
            speedX: (Math.random() - 0.5) * 0.1,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.005,
            color: config.iceColors[Math.floor(Math.random() * config.iceColors.length)],
            opacity: Math.random() * 0.15 + 0.05,
            wobble: Math.random() * 0.01 + 0.003,
            wobbleOffset: Math.random() * Math.PI * 2,
            age: 0
        });
    }

    function createFrostLine() {
        const config = settings.winter;
        const isHorizontal = Math.random() > 0.5;
        
        stars.push({
            type: 'frostLine',
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.8,
            length: Math.random() * 150 + 80,
            thickness: Math.random() * 1.5 + 0.5,
            angle: isHorizontal ? (Math.random() - 0.5) * 0.3 : Math.PI / 2 + (Math.random() - 0.5) * 0.3,
            speedY: Math.random() * 0.08 + 0.02,
            speedX: (Math.random() - 0.5) * 0.08,
            color: config.iceColors[Math.floor(Math.random() * config.iceColors.length)],
            opacity: Math.random() * 0.2 + 0.1,
            shimmer: Math.random() * 0.01 + 0.005,
            shimmerOffset: Math.random() * Math.PI * 2,
            branches: [],
            age: 0
        });
        
        const numBranches = Math.floor(Math.random() * 3) + 2;
        const lastFrost = stars[stars.length - 1];
        
        for (let i = 0; i < numBranches; i++) {
            lastFrost.branches.push({
                position: Math.random(),
                angle: (Math.random() - 0.5) * Math.PI / 3,
                length: Math.random() * 30 + 15
            });
        }
    }

    function initSnowAccumulation() {
        const segments = Math.floor(canvas.width / 15);
        
        for (let i = 0; i <= segments; i++) {
            snowAccumulation.push({
                x: i * 15,
                height: 0,
                maxHeight: Math.random() * 30 + 20,
                growthRate: 0.02
            });
        }
    }

    function drawWinterScene() {
        const time = Date.now();
        const config = settings.winter;
        
        drawWinterFog();
        // Desabilitar drawFrostLines para melhor performance
        // drawFrostLines();
        drawWinterSparkles();
        drawSmallSnowflakes();
        drawMainSnowflakes();
        drawSnowAccumulation();
    }

    function drawSmallSnowflakes() {
        particles.forEach(particle => {
            if (particle.type !== 'smallSnow') return;
            
            particle.age += 0.01;
            particle.y += particle.speedY;
            particle.x += particle.speedX;
            particle.rotation += particle.rotationSpeed;
            
            if (particle.y > canvas.height + 20) {
                particle.y = -20;
                particle.x = Math.random() * canvas.width;
            }
            if (particle.x < -20) particle.x = canvas.width + 20;
            if (particle.x > canvas.width + 20) particle.x = -20;
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * particle.depth, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.opacity * particle.depth;
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }

    function drawMainSnowflakes() {
        const time = Date.now();
        const config = settings.winter;
        
        particles.forEach((particle, index) => {
            if (particle.type !== 'mainSnow') return;
            
            particle.age += 0.01;
            particle.speedY += 0.002;
            particle.y += particle.speedY;
            
            const swing = Math.sin(time * particle.swingSpeed + particle.swing) * particle.swingAmplitude;
            particle.x += swing * 0.15 + particle.speedX;
            
            particle.rotation += particle.rotationSpeed;
            particle.rotation += Math.sin(time * particle.wobble + particle.wobbleOffset) * 0.01;
            
            // RECICLAGEM: Quando atinge o fundo, volta para o topo
            if (particle.y > canvas.height - 60) {
                accumulateSnow(particle);
                
                // Resetar o floco para o topo (RECICLAGEM)
                particle.y = -20;
                particle.x = Math.random() * canvas.width;
                particle.speedY = Math.random() * config.snowSpeed + 0.4;
                particle.rotation = Math.random() * Math.PI * 2;
                return;
            }
            
            if (particle.x < -50) particle.x = canvas.width + 50;
            if (particle.x > canvas.width + 50) particle.x = -50;
            
            ctx.globalAlpha = particle.opacity;
            
            const scale = particle.size * particle.depth;
            const cosRot = Math.cos(particle.rotation);
            const sinRot = Math.sin(particle.rotation);
            
            ctx.save();
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            
            switch(particle.snowType) {
                case 'detailed':
                    drawDetailedSnowflake(scale, particle.color, particle.glow);
                    break;
                case 'star':
                    drawStarSnowflake(scale, particle.color, particle.glow);
                    break;
                case 'crystal':
                    drawCrystalSnowflake(scale, particle.color, particle.glow);
                    break;
            }
            
            ctx.restore();
            ctx.globalAlpha = 1;
        });
    }

    function drawDetailedSnowflake(size, color, glow) {
        // Versão SIMPLIFICADA - apenas desenha um padrão simples de 6 pontos
        for (let i = 0; i < 6; i++) {
            ctx.save();
            ctx.rotate((Math.PI * 2 * i) / 6);
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -size);
            ctx.strokeStyle = color;
            ctx.lineWidth = size * 0.1;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            // Apenas 2 branches ao invés de 3
            for (let j = 1; j <= 2; j++) {
                const y = -size * (j / 3);
                const branchSize = size * 0.2;
                
                ctx.beginPath();
                ctx.moveTo(-branchSize, y);
                ctx.lineTo(branchSize, y);
                ctx.lineWidth = size * 0.06;
                ctx.stroke();
            }
            
            ctx.restore();
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function drawStarSnowflake(size, color, glow) {
        for (let i = 0; i < 8; i++) {
            ctx.save();
            ctx.rotate((Math.PI * 2 * i) / 8);
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -size * 0.8);
            ctx.strokeStyle = color;
            ctx.lineWidth = size * 0.08;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            ctx.restore();
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function drawCrystalSnowflake(size, color, glow) {
        // Versão simplificada - apenas hexágono + círculos
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            const x = Math.cos(angle) * size * 0.6;
            const y = Math.sin(angle) * size * 0.6;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = size * 0.06;
        ctx.stroke();
    }

    function drawWinterSparkles() {
        const time = Date.now();
        
        stars.forEach(star => {
            if (star.type !== 'winterSparkle') return;
            
            star.age += 0.01;
            star.y += star.speedY;
            star.x += star.speedX;
            
            const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.4 + 0.6;
            
            if (star.y > canvas.height + 30) {
                star.y = -30;
                star.x = Math.random() * canvas.width;
            }
            if (star.x < -30) star.x = canvas.width + 30;
            if (star.x > canvas.width + 30) star.x = -30;
            
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fillStyle = star.color;
            ctx.globalAlpha = star.brightness * twinkle;
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }

    // Cache para fog gradient (otimização de performance)
    let fogGradientCache = null;
    let fogGradientCacheTime = 0;
    
    function drawWinterFog() {
        const time = Date.now();
        const config = settings.winter;
        
        // Desenhar fog simplificado - apenas 1 layer ao invés de 3
        const yPos = canvas.height * 0.4;
        const waveOffset = Math.sin(time * 0.0003) * 40;
        
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = 'rgba(96, 165, 250, 0.15)';
        
        ctx.fillRect(0, yPos, canvas.width, canvas.height - yPos);
        
        ctx.globalAlpha = 1;
    }

    function drawIcePatches() {
        const time = Date.now();
        
        particles.forEach(particle => {
            if (particle.type !== 'icePatch') return;
            
            particle.age += 0.01;
            particle.y += particle.speedY;
            particle.x += particle.speedX;
            particle.rotation += particle.rotationSpeed;
            
            const wobble = Math.sin(time * particle.wobble + particle.wobbleOffset) * 5;
            
            if (particle.y > canvas.height + particle.height) {
                particle.y = -particle.height;
                particle.x = Math.random() * canvas.width;
            }
            if (particle.x < -particle.width) particle.x = canvas.width + particle.width;
            if (particle.x > canvas.width + particle.width) particle.x = -particle.width;
            
            ctx.save();
            ctx.translate(particle.x, particle.y + wobble);
            ctx.rotate(particle.rotation);
            ctx.globalAlpha = particle.opacity;
            
            ctx.beginPath();
            const points = 8;
            for (let i = 0; i < points; i++) {
                const angle = (i / points) * Math.PI * 2;
                const radiusVariation = 0.7 + Math.random() * 0.3;
                const x = Math.cos(angle) * particle.width * 0.5 * radiusVariation;
                const y = Math.sin(angle) * particle.height * 0.5 * radiusVariation;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.width * 0.6);
            gradient.addColorStop(0, particle.color + 'dd');
            gradient.addColorStop(0.5, particle.color + '99');
            gradient.addColorStop(1, particle.color + '00');
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            ctx.strokeStyle = particle.color + '66';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const lineAngle = (i / 3) * Math.PI * 2;
                const x1 = Math.cos(lineAngle) * particle.width * 0.1;
                const y1 = Math.sin(lineAngle) * particle.height * 0.1;
                const x2 = Math.cos(lineAngle) * particle.width * 0.4;
                const y2 = Math.sin(lineAngle) * particle.height * 0.4;
                
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.restore();
        });
    }

    function drawFrostLines() {
        const time = Date.now();
        
        stars.forEach(star => {
            if (star.type !== 'frostLine') return;
            
            star.age += 0.01;
            star.y += star.speedY;
            star.x += star.speedX;
            
            const shimmer = Math.sin(time * star.shimmer + star.shimmerOffset) * 0.4 + 0.6;
            
            if (star.y > canvas.height + 50) {
                star.y = -50;
                star.x = Math.random() * canvas.width;
            }
            if (star.x < -100) star.x = canvas.width + 100;
            if (star.x > canvas.width + 100) star.x = -100;
            
            ctx.save();
            ctx.globalAlpha = star.opacity * shimmer;
            
            ctx.beginPath();
            ctx.moveTo(star.x, star.y);
            
            const endX = star.x + Math.cos(star.angle) * star.length;
            const endY = star.y + Math.sin(star.angle) * star.length;
            
            ctx.lineTo(endX, endY);
            
            const gradient = ctx.createLinearGradient(star.x, star.y, endX, endY);
            gradient.addColorStop(0, star.color + '00');
            gradient.addColorStop(0.2, star.color + 'aa');
            gradient.addColorStop(0.5, '#ffffff');
            gradient.addColorStop(0.8, star.color + 'aa');
            gradient.addColorStop(1, star.color + '00');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = star.thickness;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            star.branches.forEach(branch => {
                const branchX = star.x + Math.cos(star.angle) * star.length * branch.position;
                const branchY = star.y + Math.sin(star.angle) * star.length * branch.position;
                
                const branchAngle = star.angle + branch.angle;
                const branchEndX = branchX + Math.cos(branchAngle) * branch.length;
                const branchEndY = branchY + Math.sin(branchAngle) * branch.length;
                
                ctx.beginPath();
                ctx.moveTo(branchX, branchY);
                ctx.lineTo(branchEndX, branchEndY);
                
                const branchGrad = ctx.createLinearGradient(branchX, branchY, branchEndX, branchEndY);
                branchGrad.addColorStop(0, star.color + 'aa');
                branchGrad.addColorStop(0.5, '#ffffff99');
                branchGrad.addColorStop(1, star.color + '00');
                
                ctx.strokeStyle = branchGrad;
                ctx.lineWidth = star.thickness * 0.6;
                ctx.stroke();
            });
            
            if (shimmer > 0.7) {
                for (let i = 0; i < 5; i++) {
                    const pos = i / 4;
                    const glowX = star.x + Math.cos(star.angle) * star.length * pos;
                    const glowY = star.y + Math.sin(star.angle) * star.length * pos;
                    
                    ctx.beginPath();
                    ctx.arc(glowX, glowY, star.thickness * 2, 0, Math.PI * 2);
                    
                    const glowGrad = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, star.thickness * 2);
                    glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
                    glowGrad.addColorStop(0.5, star.color + '44');
                    glowGrad.addColorStop(1, star.color + '00');
                    
                    ctx.fillStyle = glowGrad;
                    ctx.fill();
                }
            }
            
            ctx.restore();
        });
    }

    function accumulateSnow(snowflake) {
        const segmentIndex = Math.floor(snowflake.x / 15);
        
        if (segmentIndex >= 0 && segmentIndex < snowAccumulation.length) {
            const segment = snowAccumulation[segmentIndex];
            
            if (segment.height < segment.maxHeight) {
                segment.height += segment.growthRate * snowflake.size * 0.3;
            }
        }
    }

    function drawSnowAccumulation() {
        if (snowAccumulation.length === 0) return;
        
        // Apenas desenha sparkles SIMPLES no acúmulo, sem silhueta pesada
        for (let i = 0; i < snowAccumulation.length; i += 4) {
            const segment = snowAccumulation[i];
            if (segment.height > 5) {
                const x = segment.x + (Math.random() - 0.5) * 8;
                const y = canvas.height - segment.height - Math.random() * 3;
                
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fill();
            }
        }
    }

    // ===== ANIMAÇÃO PRINCIPAL =====
    function animate() {
        if (!ctx || !canvas) return;
        
        // Desenhar fundo
        if (currentAnimation === 'winter') {
            // Reusar gradiente cacheado (criar apenas 1x)
            if (!skyGradientCache || skyGradientCache.height !== canvas.height) {
                skyGradientCache = { gradient: null, height: canvas.height };
                skyGradientCache.gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                settings.winter.skyGradient.forEach((color, index) => {
                    skyGradientCache.gradient.addColorStop(index / (settings.winter.skyGradient.length - 1), color);
                });
            }
            ctx.fillStyle = skyGradientCache.gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            const bgColor = settings[currentAnimation].backgroundColor;
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        if (currentAnimation === 'meteors') {
            drawStars();
            drawMeteors();
        } else if (currentAnimation === 'hearts') {
            drawSparkles();
            drawHearts();
        } else if (currentAnimation === 'aurora') {
            drawAuroraStars();
            drawAurora();
        } else if (currentAnimation === 'winter') {
            drawWinterScene();
        }
        
        animationId = requestAnimationFrame(animate);
    }

    function startAnimation() {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        // Limpar arrays
        particles = [];
        stars = [];
        snowAccumulation = [];
        
        // Criar elementos baseado no tema atual
        createElements();
        
        // Iniciar animação
        animate();
    }

    // ===== CONTROLE DE TEMAS =====
    function changeAnimation(animationName) {
        if (!settings[animationName]) {
            console.error('Tema não encontrado:', animationName);
            return;
        }
        
        console.log(`🔄 Alterando para: ${settings[animationName].name}`);
        currentAnimation = animationName;
        
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        // Limpar arrays
        particles = [];
        stars = [];
        snowAccumulation = [];
        
        // Recriar elementos
        createElements();
        
        // Reiniciar animação
        animate();
        
        console.log(`✅ ${settings[animationName].name} ativado`);
    }

    // ===== EXPORT PARA USO =====
    window.Animations = {
        init: initAnimations,
        changeTheme: changeAnimation
    };

    window.initAnimations = initAnimations;


    console.log('💖 animations.js com CORAÇÕES CONTÍNUOS carregado!');
    console.log('❤️ Corações agora fluem continuamente com reciclagem automática');
    console.log('✨ Animações premium carregadas!')
