// ===== ANIMAÇÕES DE FUNDO PREMIUM - VERSÃO COM CORAÇÕES CONTÍNUOS =====

let canvas, ctx;
let particles = [];
let stars = [];
let snowAccumulation = [];
let animationId = null;
let currentAnimation = 'meteors';

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
    }
    ,
winter: {
        name: 'Inverno Mágico',
        snowflakes: 80,
        smallSnow: 120,
        sparkles: 60,
        icePatches: 8,
        frostLines: 15,
        snowColors: ['#ffffff', '#f0f8ff', '#e6f7ff', '#fafbfc'],
        sparkleColors: ['#e3f2fd', '#b3e5fc', '#ffffff'],
        iceColors: ['#e3f2fd', '#b3e5fc', '#81d4fa'],
        skyGradient: [
            '#0f1c2e',
            '#1a2839',
            '#243447',
            '#2d4057',
            '#364a5f',
            '#3f5268',
            '#4a5d70'
        ],
        snowSpeed: 0.6,
        windStrength: 0.3,
        rotationSpeed: 0.02,
        accumulation: true,
        glowIntensity: 0.4,
        fogOpacity: 0.15
    },
    cruzeiro: {
        name: 'Cruzeiro - Noite das 5 Estrelas ⭐💙',
        stars: 5,
        crowdWaves: 8,
        spotlights: 6,
        energyParticles: 150,
        flares: 25,
        
        colors: {
            cruzeiroBlue: '#003DA5',
            royalBlue: '#1E4D9B',
            lightBlue: '#4A90E2',
            gold: '#FFD700',
            darkGold: '#FFA500',
            white: '#FFFFFF',
            smokeBlue: '#1E4D9B'
        },
        
        skyGradient: [
            '#000814',
            '#001233',
            '#001a3d',
            '#002855',
            '#003366'
        ],
        
        nebulaColors: [
            'rgba(0, 61, 165, 0.15)',
            'rgba(30, 77, 155, 0.1)',
            'rgba(74, 144, 226, 0.08)'
        ],
        
        starPulseSpeed: 0.002,
        energySpeed: 0.8,
        spotlightRotation: 0.0005,
        waveSpeed: 0.003,
        flareSpeed: 0.4
    }
};



// ===== INICIALIZAÇÃO COM PERSISTÊNCIA DE TEMA =====
function initAnimations(forcedTheme) {
    console.log('🎨 Iniciando animações premium...');
    
    // NOVO: Carregar tema salvo do localStorage
    if (!forcedTheme) {
        try {
            const savedTheme = localStorage.getItem('kevinIaraTheme');
            if (savedTheme && settings[savedTheme]) {
                currentAnimation = savedTheme;
                console.log(`💾 Animação do tema salvo carregada: ${settings[savedTheme].name}`);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar tema da animação:', error);
        }
    } else {
        currentAnimation = forcedTheme;
        console.log(`🎯 Animação forçada para: ${settings[forcedTheme].name}`);
    }
    
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
    
    setupCanvas();
    createElements();
    startAnimation();
    
    console.log(`✅ ${settings[currentAnimation].name} iniciado com sucesso!`);
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

function handleResize() {
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Não recriar elementos, apenas ajustar posições se necessário
    if (currentAnimation === 'hearts') {
        // Para corações que saíram da tela devido ao resize
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
        
        // Ajustar sparkles
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

function resizeCanvas() {
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
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
    } else if (currentAnimation === 'cruzeiro') {
        createCruzeiroScene();
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
    const style = config.heartStyles[Math.floor(Math.random() * config.heartStyles.length)];
    const isOutline = style === 'outline';
    
    particles.push({
        type: 'heart',
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height, // Começar em posições aleatórias na tela
        size: Math.random() * 20 + 15, // Tamanho reduzido para melhor performance
        speedY: Math.random() * config.heartSpeed + 0.6,
        speedX: (Math.random() - 0.5) * 0.8, // Velocidade horizontal reduzida
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
        age: 0 // Para controlar tempo de vida
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
    
    for (let i = 0; i < config.frostLines; i++) {
        createFrostLine();
    }
    
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
        age: 0,
        landed: false
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
    drawFrostLines();
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
        
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = particle.opacity * particle.depth;
        
        ctx.beginPath();
        ctx.arc(0, 0, particle.size * particle.depth, 0, Math.PI * 2);
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size * particle.depth * 2);
        gradient.addColorStop(0, particle.color);
        gradient.addColorStop(0.5, particle.color + 'aa');
        gradient.addColorStop(1, particle.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.restore();
    });
}

function drawMainSnowflakes() {
    const time = Date.now();
    const config = settings.winter;
    
    particles.forEach((particle, index) => {
        if (particle.type !== 'mainSnow') return;
        
        if (particle.landed) return;
        
        particle.age += 0.01;
        particle.speedY += 0.002;
        particle.y += particle.speedY;
        
        const swing = Math.sin(time * particle.swingSpeed + particle.swing) * particle.swingAmplitude;
        particle.x += swing * 0.15 + particle.speedX;
        
        particle.rotation += particle.rotationSpeed;
        particle.rotation += Math.sin(time * particle.wobble + particle.wobbleOffset) * 0.01;
        
        if (particle.y > canvas.height - 60) {
            accumulateSnow(particle);
            particle.landed = true;
            
            setTimeout(() => {
                createMainSnowflake();
            }, Math.random() * 2000);
            return;
        }
        
        if (particle.x < -50) particle.x = canvas.width + 50;
        if (particle.x > canvas.width + 50) particle.x = -50;
        
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = particle.opacity;
        
        const scale = particle.size * particle.depth;
        
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
    });
}

function drawDetailedSnowflake(size, color, glow) {
    for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((Math.PI * 2 * i) / 6);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -size);
        ctx.strokeStyle = color;
        ctx.lineWidth = size * 0.12;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        for (let j = 1; j <= 3; j++) {
            const y = -size * (j / 3.5);
            const branchSize = size * 0.25;
            
            ctx.beginPath();
            ctx.moveTo(-branchSize, y);
            ctx.lineTo(branchSize, y);
            ctx.strokeStyle = color;
            ctx.lineWidth = size * 0.08;
            ctx.stroke();
            
            if (j === 3) {
                ctx.beginPath();
                ctx.moveTo(-branchSize * 0.6, y - branchSize * 0.5);
                ctx.lineTo(0, y);
                ctx.lineTo(branchSize * 0.6, y - branchSize * 0.5);
                ctx.strokeStyle = color;
                ctx.lineWidth = size * 0.06;
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
    
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.3);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, color + 'cc');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    if (glow > 0.2) {
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.3, 0, Math.PI * 2);
        const glowGradient = ctx.createRadialGradient(0, 0, size * 0.8, 0, 0, size * 1.3);
        glowGradient.addColorStop(0, color + Math.floor(glow * 60).toString(16).padStart(2, '0'));
        glowGradient.addColorStop(1, color + '00');
        ctx.fillStyle = glowGradient;
        ctx.fill();
    }
}

function drawStarSnowflake(size, color, glow) {
    for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((Math.PI * 2 * i) / 8);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -size * 0.9);
        ctx.lineTo(-size * 0.15, -size * 0.7);
        ctx.lineTo(0, -size);
        ctx.lineTo(size * 0.15, -size * 0.7);
        ctx.lineTo(0, -size * 0.9);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, 0, 0, -size);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.7, color);
        gradient.addColorStop(1, '#ffffff');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff88';
        ctx.lineWidth = size * 0.04;
        ctx.stroke();
        
        ctx.restore();
    }
    
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawCrystalSnowflake(size, color, glow) {
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
    
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.8);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.4, color + 'ee');
    gradient.addColorStop(0.7, color + 'aa');
    gradient.addColorStop(1, color + '66');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.08;
    ctx.stroke();
    
    for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((Math.PI * 2 * i) / 6);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -size * 0.5);
        ctx.strokeStyle = '#ffffffaa';
        ctx.lineWidth = size * 0.06;
        ctx.stroke();
        
        ctx.restore();
    }
    
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, size * (0.15 + i * 0.15), 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff44';
        ctx.lineWidth = size * 0.03;
        ctx.stroke();
    }
}

function drawWinterSparkles() {
    const time = Date.now();
    
    stars.forEach(star => {
        if (star.type !== 'winterSparkle') return;
        
        star.age += 0.01;
        star.y += star.speedY;
        star.x += star.speedX;
        
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.4 + 0.6;
        const pulse = Math.sin(time * star.pulseSpeed + star.pulseOffset) * 0.3 + 0.7;
        const brightness = star.brightness * twinkle * pulse;
        
        if (star.y > canvas.height + 30) {
            star.y = -30;
            star.x = Math.random() * canvas.width;
        }
        if (star.x < -30) star.x = canvas.width + 30;
        if (star.x > canvas.width + 30) star.x = -30;
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        
        const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.size * 4
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${brightness})`);
        gradient.addColorStop(0.3, `${star.color}${Math.floor(brightness * 180).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.7, `${star.color}${Math.floor(brightness * 80).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${star.color}00`);
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        if (star.size > 1.2 && brightness > 0.6) {
            ctx.save();
            ctx.translate(star.x, star.y);
            ctx.rotate(time * 0.001);
            
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI) / 2;
                const length = star.size * 3 * brightness;
                
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
                ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.4})`;
                ctx.lineWidth = 1;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            
            ctx.restore();
        }
    });
}

function drawWinterFog() {
    const time = Date.now();
    const config = settings.winter;
    
    for (let layer = 0; layer < 3; layer++) {
        const yPos = canvas.height * 0.3 + layer * (canvas.height * 0.25);
        const waveOffset = Math.sin(time * 0.0003 + layer) * 50;
        
        ctx.beginPath();
        ctx.moveTo(0, yPos);
        
        for (let x = 0; x <= canvas.width; x += 20) {
            const wave = Math.sin((x + waveOffset) * 0.01 + time * 0.0002) * 20;
            ctx.lineTo(x, yPos + wave);
        }
        
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, yPos - 100, 0, yPos + 100);
        gradient.addColorStop(0, `rgba(227, 242, 253, 0)`);
        gradient.addColorStop(0.5, `rgba(227, 242, 253, ${config.fogOpacity * (1 - layer * 0.3)})`);
        gradient.addColorStop(1, `rgba(227, 242, 253, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
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
    
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    
    for (let i = 0; i < snowAccumulation.length; i++) {
        const segment = snowAccumulation[i];
        const x = segment.x;
        const y = canvas.height - segment.height;
        
        if (i === 0) {
            ctx.lineTo(x, y);
        } else {
            const prevSegment = snowAccumulation[i - 1];
            const prevX = prevSegment.x;
            const prevY = canvas.height - prevSegment.height;
            
            const cpX = (prevX + x) / 2;
            const cpY = (prevY + y) / 2;
            
            ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
        }
    }
    
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, canvas.height - 50, 0, canvas.height);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#f8f9fa');
    gradient.addColorStop(0.6, '#e3f2fd');
    gradient.addColorStop(1, '#cfe2f3');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    
    for (let i = 0; i < snowAccumulation.length; i++) {
        const segment = snowAccumulation[i];
        const x = segment.x;
        const y = canvas.height - segment.height;
        
        if (i === 0) {
            ctx.lineTo(x, y);
        } else {
            const prevSegment = snowAccumulation[i - 1];
            const prevX = prevSegment.x;
            const prevY = canvas.height - prevSegment.height;
            
            const cpX = (prevX + x) / 2;
            const cpY = (prevY + y) / 2;
            
            ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
        }
    }
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    for (let i = 0; i < snowAccumulation.length; i += 3) {
        const segment = snowAccumulation[i];
        if (segment.height > 5) {
            const x = segment.x + (Math.random() - 0.5) * 10;
            const y = canvas.height - segment.height - Math.random() * 5;
            
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            const sparkleGrad = ctx.createRadialGradient(x, y, 0, x, y, 4);
            sparkleGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            sparkleGrad.addColorStop(0.5, 'rgba(227, 242, 253, 0.5)');
            sparkleGrad.addColorStop(1, 'rgba(227, 242, 253, 0)');
            ctx.fillStyle = sparkleGrad;
            ctx.fill();
        }
    }
}

// ===== TEMA: CRUZEIRO - NOITE DAS 5 ESTRELAS ⭐💙 =====

function createCruzeiroScene() {
    const config = settings.cruzeiro;
    
    console.log('⚽💙 Criando cena épica do Cruzeiro...');
    
    createCruzeiroStars();
    createSpotlights();
    createEnergyParticles();
    createCrowdWaves();
    createFlares();
    createNebula();
    
    console.log('✅ Cena do Cruzeiro criada com sucesso!');
}

function createCruzeiroStars() {
    const config = settings.cruzeiro;
    
    const starPositions = [
        { x: 0.5, y: 0.25 },
        { x: 0.3, y: 0.4 },
        { x: 0.5, y: 0.4 },
        { x: 0.7, y: 0.4 },
        { x: 0.5, y: 0.55 }
    ];
    
    starPositions.forEach((pos, index) => {
        const isCentral = index === 2;
        
        particles.push({
            type: 'cruzeiroStar',
            x: canvas.width * pos.x,
            y: canvas.height * pos.y,
            baseX: canvas.width * pos.x,
            baseY: canvas.height * pos.y,
            size: isCentral ? 80 : 65,
            isCentral: isCentral,
            points: 5,
            pulseSpeed: 0.002 + Math.random() * 0.001,
            pulseOffset: Math.random() * Math.PI * 2,
            glowIntensity: 1,
            rotationAngle: 0,
            rotationSpeed: isCentral ? 0.0003 : 0.0005,
            orbitRadius: isCentral ? 0 : 3,
            orbitSpeed: 0.001,
            orbitOffset: Math.random() * Math.PI * 2,
            rayCount: 8,
            innerRingParticles: [],
            energyRings: []
        });
    });
    
    particles.forEach(star => {
        if (star.type === 'cruzeiroStar') {
            for (let i = 0; i < (star.isCentral ? 16 : 12); i++) {
                star.innerRingParticles.push({
                    angle: (i / (star.isCentral ? 16 : 12)) * Math.PI * 2,
                    distance: star.size * 0.8,
                    speed: 0.01,
                    size: star.isCentral ? 3 : 2.5
                });
            }
            
            for (let i = 0; i < 3; i++) {
                star.energyRings.push({
                    radius: star.size * (1.3 + i * 0.4),
                    opacity: 0.6 - i * 0.15,
                    pulseOffset: i * Math.PI / 3
                });
            }
        }
    });
}

function createSpotlights() {
    const config = settings.cruzeiro;
    
    for (let i = 0; i < config.spotlights; i++) {
        const angle = (i / config.spotlights) * Math.PI * 2;
        
        stars.push({
            type: 'spotlight',
            startX: canvas.width * 0.5 + Math.cos(angle) * canvas.width * 0.4,
            startY: canvas.height * 0.9,
            angle: angle + Math.PI / 2,
            baseAngle: angle + Math.PI / 2,
            length: canvas.height * 1.2,
            width: 80,
            rotationSpeed: 0.0003,
            swayAmplitude: 0.15,
            swaySpeed: 0.0008,
            swayOffset: Math.random() * Math.PI * 2,
            opacity: 0.12,
            color: i % 2 === 0 ? config.colors.cruzeiroBlue : config.colors.gold
        });
    }
}

function createEnergyParticles() {
    const config = settings.cruzeiro;
    
    for (let i = 0; i < config.energyParticles; i++) {
        particles.push({
            type: 'energyParticle',
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.7,
            baseX: Math.random() * canvas.width,
            baseY: Math.random() * canvas.height * 0.7,
            size: Math.random() * 2.5 + 1,
            orbitRadius: Math.random() * 30 + 15,
            orbitSpeed: Math.random() * 0.01 + 0.005,
            orbitAngle: Math.random() * Math.PI * 2,
            color: Math.random() > 0.6 ? config.colors.gold : config.colors.lightBlue,
            opacity: Math.random() * 0.6 + 0.3,
            twinkleSpeed: Math.random() * 0.008 + 0.003,
            twinkleOffset: Math.random() * Math.PI * 2
        });
    }
}

function createCrowdWaves() {
    const config = settings.cruzeiro;
    
    for (let i = 0; i < config.crowdWaves; i++) {
        const yPos = canvas.height * 0.65 + (i * 25);
        
        stars.push({
            type: 'crowdWave',
            y: yPos,
            baseY: yPos,
            waveOffset: Math.random() * Math.PI * 2,
            amplitude: 15 + Math.random() * 10,
            waveLength: 200 + Math.random() * 100,
            speed: config.waveSpeed + Math.random() * 0.002,
            height: 20 + Math.random() * 15,
            opacity: 0.08 + (i * 0.01),
            color: i % 3 === 0 ? config.colors.gold : 
                   i % 3 === 1 ? config.colors.cruzeiroBlue : 
                   config.colors.white,
            pulseSpeed: 0.004 + Math.random() * 0.002,
            pulseOffset: Math.random() * Math.PI * 2
        });
    }
}

function createFlares() {
    const config = settings.cruzeiro;
    
    for (let i = 0; i < config.flares; i++) {
        particles.push({
            type: 'flare',
            x: Math.random() * canvas.width,
            y: canvas.height * (0.7 + Math.random() * 0.25),
            baseX: Math.random() * canvas.width,
            baseY: canvas.height * (0.7 + Math.random() * 0.25),
            size: Math.random() * 40 + 25,
            color: Math.random() > 0.5 ? config.colors.cruzeiroBlue : config.colors.gold,
            opacity: Math.random() * 0.15 + 0.05,
            smokeHeight: Math.random() * 80 + 60,
            pulseSpeed: 0.003 + Math.random() * 0.002,
            pulseOffset: Math.random() * Math.PI * 2,
            swayAmplitude: Math.random() * 20 + 10,
            swaySpeed: 0.002 + Math.random() * 0.001,
            swayOffset: Math.random() * Math.PI * 2
        });
    }
}

function createNebula() {
    const config = settings.cruzeiro;
    
    for (let i = 0; i < 4; i++) {
        stars.push({
            type: 'nebula',
            layer: i,
            y: canvas.height * (0.2 + i * 0.15),
            waveOffset: Math.random() * Math.PI * 2,
            amplitude: 40 + Math.random() * 30,
            waveLength: 250 + Math.random() * 150,
            speed: 0.0004 + Math.random() * 0.0002,
            height: 100 + Math.random() * 60,
            opacity: config.nebulaColors[i % config.nebulaColors.length],
            color: config.colors.cruzeiroBlue
        });
    }
}

function drawCruzeiroScene() {
    drawCruzeiroSky();
    drawNebula();
    drawSpotlights();
    drawCrowdWaves();
    drawFlares();
    drawEnergyParticles();
    drawCruzeiroStars();
}

function drawCruzeiroSky() {
    const config = settings.cruzeiro;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    config.skyGradient.forEach((color, index) => {
        gradient.addColorStop(index / (config.skyGradient.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const stadiumGlow = ctx.createRadialGradient(
        canvas.width / 2, canvas.height,
        0,
        canvas.width / 2, canvas.height,
        canvas.height * 0.6
    );
    stadiumGlow.addColorStop(0, 'rgba(0, 61, 165, 0.15)');
    stadiumGlow.addColorStop(0.5, 'rgba(0, 61, 165, 0.05)');
    stadiumGlow.addColorStop(1, 'rgba(0, 61, 165, 0)');
    
    ctx.fillStyle = stadiumGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawNebula() {
    const time = Date.now();
    
    stars.forEach(nebula => {
        if (nebula.type !== 'nebula') return;
        
        const waveTime = time * nebula.speed + nebula.waveOffset;
        
        ctx.beginPath();
        ctx.moveTo(0, nebula.y);
        
        for (let x = 0; x <= canvas.width; x += 25) {
            const wave = Math.sin(x / nebula.waveLength + waveTime) * nebula.amplitude;
            ctx.lineTo(x, nebula.y + wave);
        }
        
        ctx.lineTo(canvas.width, nebula.y + nebula.height);
        ctx.lineTo(0, nebula.y + nebula.height);
        ctx.closePath();
        
        ctx.fillStyle = nebula.opacity;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

function drawSpotlights() {
    const time = Date.now();
    
    stars.forEach(spotlight => {
        if (spotlight.type !== 'spotlight') return;
        
        const sway = Math.sin(time * spotlight.swaySpeed + spotlight.swayOffset) * spotlight.swayAmplitude;
        spotlight.angle = spotlight.baseAngle + sway;
        
        const endX = spotlight.startX + Math.cos(spotlight.angle) * spotlight.length;
        const endY = spotlight.startY + Math.sin(spotlight.angle) * spotlight.length;
        
        const gradient = ctx.createLinearGradient(
            spotlight.startX, spotlight.startY,
            endX, endY
        );
        
        const colorAlpha = spotlight.color === settings.cruzeiro.colors.gold ? 
            `rgba(255, 215, 0, ${spotlight.opacity})` :
            `rgba(0, 61, 165, ${spotlight.opacity})`;
        
        gradient.addColorStop(0, colorAlpha);
        gradient.addColorStop(0.3, colorAlpha.replace(/[\d.]+\)/, `${spotlight.opacity * 0.6})`));
        gradient.addColorStop(1, colorAlpha.replace(/[\d.]+\)/, '0)'));
        
        ctx.save();
        ctx.globalAlpha = 0.7;
        
        ctx.beginPath();
        const perpAngle = spotlight.angle + Math.PI / 2;
        const halfWidth = spotlight.width / 2;
        
        ctx.moveTo(
            spotlight.startX + Math.cos(perpAngle) * halfWidth * 0.3,
            spotlight.startY + Math.sin(perpAngle) * halfWidth * 0.3
        );
        ctx.lineTo(
            spotlight.startX - Math.cos(perpAngle) * halfWidth * 0.3,
            spotlight.startY - Math.sin(perpAngle) * halfWidth * 0.3
        );
        ctx.lineTo(
            endX - Math.cos(perpAngle) * halfWidth,
            endY - Math.sin(perpAngle) * halfWidth
        );
        ctx.lineTo(
            endX + Math.cos(perpAngle) * halfWidth,
            endY + Math.sin(perpAngle) * halfWidth
        );
        ctx.closePath();
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.restore();
    });
}

function drawCrowdWaves() {
    const time = Date.now();
    
    stars.forEach(wave => {
        if (wave.type !== 'crowdWave') return;
        
        const waveTime = time * wave.speed + wave.waveOffset;
        const pulse = Math.sin(time * wave.pulseSpeed + wave.pulseOffset) * 0.3 + 0.7;
        
        ctx.beginPath();
        ctx.moveTo(0, wave.y);
        
        for (let x = 0; x <= canvas.width; x += 15) {
            const waveY = Math.sin(x / wave.waveLength + waveTime) * wave.amplitude;
            ctx.lineTo(x, wave.y + waveY);
        }
        
        ctx.lineTo(canvas.width, wave.y + wave.height);
        ctx.lineTo(0, wave.y + wave.height);
        ctx.closePath();
        
        const baseColor = wave.color;
        let r, g, b;
        
        if (baseColor === settings.cruzeiro.colors.gold) {
            r = 255; g = 215; b = 0;
        } else if (baseColor === settings.cruzeiro.colors.cruzeiroBlue) {
            r = 0; g = 61; b = 165;
        } else {
            r = 255; g = 255; b = 255;
        }
        
        const gradient = ctx.createLinearGradient(0, wave.y, 0, wave.y + wave.height);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${wave.opacity * pulse})`);
        gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${wave.opacity * pulse * 0.6})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

function drawFlares() {
    const time = Date.now();
    
    particles.forEach(flare => {
        if (flare.type !== 'flare') return;
        
        const pulse = Math.sin(time * flare.pulseSpeed + flare.pulseOffset) * 0.4 + 0.6;
        const sway = Math.sin(time * flare.swaySpeed + flare.swayOffset) * flare.swayAmplitude;
        
        const currentX = flare.baseX + sway;
        const currentY = flare.baseY;
        
        for (let i = 0; i < 8; i++) {
            const smokeY = currentY - (i / 8) * flare.smokeHeight;
            const smokeSize = flare.size * (1 + i * 0.15);
            const smokeOpacity = flare.opacity * (1 - i / 8) * pulse;
            
            const swayOffset = Math.sin(smokeY * 0.02 + time * 0.001) * 15;
            
            const gradient = ctx.createRadialGradient(
                currentX + swayOffset, smokeY, 0,
                currentX + swayOffset, smokeY, smokeSize
            );
            
            let r, g, b;
            if (flare.color === settings.cruzeiro.colors.gold) {
                r = 255; g = 215; b = 0;
            } else {
                r = 0; g = 61; b = 165;
            }
            
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${smokeOpacity})`);
            gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${smokeOpacity * 0.5})`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(currentX + swayOffset, smokeY, smokeSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const baseGlow = ctx.createRadialGradient(
            currentX, currentY, 0,
            currentX, currentY, flare.size * 2
        );
        
        let r, g, b;
        if (flare.color === settings.cruzeiro.colors.gold) {
            r = 255; g = 215; b = 0;
        } else {
            r = 0; g = 61; b = 165;
        }
        
        baseGlow.addColorStop(0, `rgba(255, 255, 255, ${flare.opacity * pulse * 1.5})`);
        baseGlow.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${flare.opacity * pulse})`);
        baseGlow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.fillStyle = baseGlow;
        ctx.beginPath();
        ctx.arc(currentX, currentY, flare.size * 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawEnergyParticles() {
    const time = Date.now();
    
    particles.forEach(particle => {
        if (particle.type !== 'energyParticle') return;
        
        particle.orbitAngle += particle.orbitSpeed;
        particle.x = particle.baseX + Math.cos(particle.orbitAngle) * particle.orbitRadius;
        particle.y = particle.baseY + Math.sin(particle.orbitAngle) * particle.orbitRadius;
        
        const twinkle = Math.sin(time * particle.twinkleSpeed + particle.twinkleOffset) * 0.4 + 0.6;
        const brightness = particle.opacity * twinkle;
        
        const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size * 3
        );
        
        let r, g, b;
        if (particle.color === settings.cruzeiro.colors.gold) {
            r = 255; g = 215; b = 0;
        } else {
            r = 74; g = 144; b = 226;
        }
        
        gradient.addColorStop(0, `rgba(255, 255, 255, ${brightness})`);
        gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${brightness * 0.8})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.9})`;
        ctx.fill();
    });
}

function drawCruzeiroStars() {
    const time = Date.now();
    const config = settings.cruzeiro;
    
    particles.forEach(star => {
        if (star.type !== 'cruzeiroStar') return;
        
        const pulse = Math.sin(time * star.pulseSpeed + star.pulseOffset) * 0.15 + 0.85;
        const currentSize = star.size * pulse;
        
        if (star.orbitRadius > 0) {
            star.x = star.baseX + Math.cos(time * star.orbitSpeed + star.orbitOffset) * star.orbitRadius;
            star.y = star.baseY + Math.sin(time * star.orbitSpeed + star.orbitOffset) * star.orbitRadius;
        }
        
        star.rotationAngle += star.rotationSpeed;
        
        ctx.save();
        ctx.translate(star.x, star.y);
        ctx.rotate(star.rotationAngle);
        
        star.energyRings.forEach((ring, index) => {
            const ringPulse = Math.sin(time * 0.003 + ring.pulseOffset) * 0.3 + 0.7;
            
            ctx.beginPath();
            ctx.arc(0, 0, ring.radius * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 215, 0, ${ring.opacity * ringPulse * 0.6})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        
        for (let i = 0; i < star.rayCount; i++) {
            const angle = (i / star.rayCount) * Math.PI * 2;
            const rayLength = currentSize * (star.isCentral ? 2.5 : 2);
            
            const gradient = ctx.createLinearGradient(
                0, 0,
                Math.cos(angle) * rayLength,
                Math.sin(angle) * rayLength
            );
            
            gradient.addColorStop(0, `rgba(255, 215, 0, ${0.8 * pulse})`);
            gradient.addColorStop(0.5, `rgba(255, 215, 0, ${0.4 * pulse})`);
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * rayLength, Math.sin(angle) * rayLength);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = star.isCentral ? 4 : 3;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        
        drawCruzeiroPentagonalStar(currentSize, config.colors.gold, pulse, star.isCentral);
        
        star.innerRingParticles.forEach(particle => {
            particle.angle += particle.speed;
            
            const px = Math.cos(particle.angle) * particle.distance;
            const py = Math.sin(particle.angle) * particle.distance;
            
            ctx.beginPath();
            ctx.arc(px, py, particle.size, 0, Math.PI * 2);
            
            const particleGrad = ctx.createRadialGradient(px, py, 0, px, py, particle.size * 2);
            particleGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * pulse})`);
            particleGrad.addColorStop(0.5, `rgba(74, 144, 226, ${0.6 * pulse})`);
            particleGrad.addColorStop(1, 'rgba(74, 144, 226, 0)');
            
            ctx.fillStyle = particleGrad;
            ctx.fill();
        });
        
        const outerGlow = ctx.createRadialGradient(0, 0, currentSize * 0.8, 0, 0, currentSize * 3);
        outerGlow.addColorStop(0, `rgba(255, 215, 0, ${0.3 * pulse})`);
        outerGlow.addColorStop(0.5, `rgba(0, 61, 165, ${0.15 * pulse})`);
        outerGlow.addColorStop(1, 'rgba(0, 61, 165, 0)');
        
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(0, 0, currentSize * 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
}

function drawCruzeiroPentagonalStar(size, color, pulse, isCentral) {
    const points = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    
    ctx.beginPath();
    
    for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.closePath();
    
    const gradient = ctx.createRadialGradient(0, -size * 0.2, 0, 0, 0, size);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${pulse})`);
    gradient.addColorStop(0.3, `rgba(255, 235, 100, ${pulse})`);
    gradient.addColorStop(0.6, color);
    gradient.addColorStop(1, `rgba(255, 165, 0, ${pulse * 0.9})`);
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.strokeStyle = `rgba(255, 255, 255, ${pulse * 0.9})`;
    ctx.lineWidth = isCentral ? 4 : 3;
    ctx.lineJoin = 'miter';
    ctx.stroke();
    
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    const innerGlow = ctx.createRadialGradient(0, -size * 0.3, 0, 0, 0, size * 0.6);
    innerGlow.addColorStop(0, `rgba(255, 255, 255, ${0.8 * pulse})`);
    innerGlow.addColorStop(0.5, `rgba(255, 235, 150, ${0.4 * pulse})`);
    innerGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    
    ctx.fillStyle = innerGlow;
    ctx.fill();
    
    ctx.restore();
    
    for (let i = 0; i < points; i++) {
        const angle = (i * 2 * Math.PI) / points - Math.PI / 2;
        const x = Math.cos(angle) * outerRadius;
        const y = Math.sin(angle) * outerRadius;
        
        const pointGlow = ctx.createRadialGradient(x, y, 0, x, y, size * 0.25);
        pointGlow.addColorStop(0, `rgba(255, 255, 255, ${0.7 * pulse})`);
        pointGlow.addColorStop(0.6, `rgba(255, 215, 0, ${0.3 * pulse})`);
        pointGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
        
        ctx.fillStyle = pointGlow;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ===== FIM TEMA CRUZEIRO =====

// ===== ANIMAÇÃO PRINCIPAL =====
function animate() {
    if (!ctx || !canvas) return;
    
    // Desenhar fundo
    if (currentAnimation === 'winter') {
        // Gradiente de céu invernal
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        settings.winter.skyGradient.forEach((color, index) => {
            gradient.addColorStop(index / (settings.winter.skyGradient.length - 1), color);
        });
        ctx.fillStyle = gradient;
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
    } else if (currentAnimation === 'cruzeiro') {
        drawCruzeiroScene();
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
    snowAccumulation = []; // ← ADICIONAR
    
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
    snowAccumulation = []; // ← ADICIONAR
    
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
console.log('⚽💙 Tema CRUZEIRO - Noite das 5 Estrelas implementado!');
