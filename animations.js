// ===== ANIMAÇÕES DE FUNDO PREMIUM - VERSÃO COM CORAÇÕES BONITOS =====

let canvas, ctx;
let particles = [];
let stars = [];
let animationId = null;
let currentAnimation = 'meteors';

// Configurações avançadas para cada tema
const settings = {
    meteors: {
        name: 'Chuva de Meteoros',
        stars: 150,
        meteors: 8,
        starColors: ['#ffffff', '#f0f0ff', '#e6f7ff', '#fffacd'],
        meteorColors: ['#6a11cb', '#2575fc', '#ff6b8b', '#ffd700'],
        backgroundColor: '#0a0e17',
        meteorSpeed: 2.5,
        twinkleSpeed: 0.003
    },
    hearts: {
        name: 'Chuva de Corações',
        hearts: 65, // Mais corações
        sparkles: 80,
        heartColors: [
            '#ff2e63', '#ff4081', '#e91e63', // Rosa/vermelho vibrante
            '#ff6b8b', '#ff9a9e', '#ffccd5', // Rosa suave
            '#ff7676', '#ff5252', '#ff4040'  // Vermelho puro
        ],
        sparkleColors: ['#ffffff', '#ffe6e6', '#ffccd5', '#ffebee'],
        backgroundColor: '#1a0b2e',
        heartSpeed: 1.8,
        floatAmplitude: 1.2,
        rotationSpeed: 0.02,
        heartStyles: ['solid', 'gradient', 'outline'] // Estilos diferentes de coração
    },
    aurora: {
        name: 'Aurora Boreal',
        layers: 4,
        particles: 100,
        auroraColors: [
            ['#00ff9d', '#00b894', '#00a085'],
            ['#00cec9', '#00b7c2', '#009d9a'],
            ['#0984e3', '#074b83', '#032b50'],
            ['#6c5ce7', '#5a4fcf', '#483cb7']
        ],
        starColors: ['#ffffff', '#f0f8ff', '#e6f7ff'],
        backgroundColor: '#0a1929',
        waveSpeed: 0.0008,
        particleSpeed: 0.6
    }
};

// ===== INICIALIZAÇÃO =====
function initAnimations() {
    console.log('🎨 Iniciando animações premium...');
    
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
    
    console.log(`✅ ${settings[currentAnimation].name} iniciado`);
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
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    createElements();
}

// ===== CRIAÇÃO DE ELEMENTOS =====
function createElements() {
    particles = [];
    stars = [];
    
    if (currentAnimation === 'meteors') {
        createStars();
        createMeteors();
    } else if (currentAnimation === 'hearts') {
        createBeautifulHearts();
        createSparkles();
    } else if (currentAnimation === 'aurora') {
        createAurora();
        createAuroraStars();
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

// ===== TEMA: CHUVA DE CORAÇÕES BONITOS =====
function createBeautifulHearts() {
    const config = settings.hearts;
    
    for (let i = 0; i < config.hearts; i++) {
        const style = config.heartStyles[Math.floor(Math.random() * config.heartStyles.length)];
        const isOutline = style === 'outline';
        
        particles.push({
            type: 'heart',
            x: Math.random() * canvas.width,
            y: Math.random() * -200 - 100,
            size: Math.random() * 28 + 16,
            speedY: Math.random() * config.heartSpeed + 0.6,
            speedX: (Math.random() - 0.5) * 1.2,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * config.rotationSpeed,
            color: config.heartColors[Math.floor(Math.random() * config.heartColors.length)],
            opacity: isOutline ? Math.random() * 0.6 + 0.4 : Math.random() * 0.7 + 0.5,
            pulseSpeed: Math.random() * 0.015 + 0.005,
            pulseOffset: Math.random() * Math.PI * 2,
            swing: Math.random() * Math.PI * 2,
            swingSpeed: Math.random() * 0.015 + 0.005,
            style: style,
            wobble: Math.random() * 0.05 + 0.02,
            wobbleOffset: Math.random() * Math.PI * 2,
            scale: Math.random() * 0.2 + 0.9,
            glow: Math.random() * 0.3 + 0.1
        });
    }
}

function createSparkles() {
    const config = settings.hearts;
    
    for (let i = 0; i < config.sparkles; i++) {
        stars.push({
            type: 'sparkle',
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2.5 + 1,
            speedY: Math.random() * 0.7 + 0.3,
            speedX: (Math.random() - 0.5) * 0.5,
            color: config.sparkleColors[Math.floor(Math.random() * config.sparkleColors.length)],
            brightness: Math.random() * 0.9 + 0.3,
            twinkleSpeed: Math.random() * 0.008 + 0.003,
            twinkleOffset: Math.random() * Math.PI * 2,
            trail: [],
            maxTrail: 5
        });
    }
}

function drawHearts() {
    const time = Date.now();
    const config = settings.hearts;
    
    particles.forEach(particle => {
        if (particle.type !== 'heart') return;
        
        // Movimento natural e suave
        particle.y += particle.speedY;
        const swing = Math.sin(time * particle.swingSpeed + particle.swing) * config.floatAmplitude;
        particle.x += swing * 0.3 + particle.speedX;
        
        // Efeito de pulsação
        const pulse = Math.sin(time * particle.pulseSpeed + particle.pulseOffset) * 0.1 + 0.9;
        const currentSize = particle.size * pulse * particle.scale;
        const currentOpacity = particle.opacity * pulse;
        
        // Efeito de balanço
        particle.rotation += particle.rotationSpeed;
        particle.rotation += Math.sin(time * particle.wobble + particle.wobbleOffset) * 0.02;
        
        // Resetar se sair da tela
        if (particle.y > canvas.height + 150) {
            particle.y = -100;
            particle.x = Math.random() * canvas.width;
        }
        if (particle.x < -100) particle.x = canvas.width + 100;
        if (particle.x > canvas.width + 100) particle.x = -100;
        
        // Desenhar coração
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = currentOpacity;
        
        // Escolher estilo de desenho
        switch(particle.style) {
            case 'solid':
                drawSolidHeart(currentSize, particle.color, particle.glow);
                break;
            case 'gradient':
                drawGradientHeart(currentSize, particle.color);
                break;
            case 'outline':
                drawOutlineHeart(currentSize, particle.color);
                break;
        }
        
        ctx.restore();
    });
}

// Coração sólido e bonito
function drawSolidHeart(size, color, glow) {
    // Desenhar brilho externo
    ctx.beginPath();
    drawHeartShape(size * 1.1);
    
    const outerGlow = ctx.createRadialGradient(0, 0, size * 0.8, 0, 0, size * 1.3);
    outerGlow.addColorStop(0, color + '40');
    outerGlow.addColorStop(1, color + '00');
    
    ctx.fillStyle = outerGlow;
    ctx.fill();
    
    // Coração principal
    ctx.beginPath();
    drawHeartShape(size);
    
    // Gradiente interno
    const gradient = ctx.createRadialGradient(0, size * 0.1, 0, 0, size * 0.1, size);
    gradient.addColorStop(0, lightenColor(color, 40));
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, darkenColor(color, 20));
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Brilho interno
    ctx.beginPath();
    drawHeartShape(size * 0.7);
    
    ctx.fillStyle = `rgba(255, 255, 255, ${glow})`;
    ctx.fill();
    
    // Contorno suave
    ctx.beginPath();
    drawHeartShape(size);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.2)`;
    ctx.lineWidth = 1;
    ctx.stroke();
}

// Coração com gradiente
function drawGradientHeart(size, color) {
    ctx.beginPath();
    drawHeartShape(size);
    
    // Gradiente vertical
    const gradient = ctx.createLinearGradient(0, -size, 0, size);
    gradient.addColorStop(0, lightenColor(color, 60));
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, darkenColor(color, 30));
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Detalhe central
    ctx.beginPath();
    drawHeartShape(size * 0.5);
    
    const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.5);
    innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = innerGradient;
    ctx.fill();
    
    // Contorno brilhante
    ctx.beginPath();
    drawHeartShape(size);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Coração apenas contorno
function drawOutlineHeart(size, color) {
    // Sombra do contorno
    ctx.beginPath();
    drawHeartShape(size * 1.05);
    ctx.strokeStyle = color + '30';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Contorno principal
    ctx.beginPath();
    drawHeartShape(size);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    // Pontilhado interno
    ctx.beginPath();
    drawHeartShape(size * 0.8);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = color + '80';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Brilho nos pontos
    ctx.beginPath();
    ctx.arc(0, -size * 0.1, 2, 0, Math.PI * 2);
    ctx.arc(-size * 0.4, size * 0.3, 2, 0, Math.PI * 2);
    ctx.arc(size * 0.4, size * 0.3, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();
}

// Função auxiliar para desenhar forma de coração
function drawHeartShape(size) {
    const topCurveHeight = size * 0.9;
    const bottomCurveWidth = size * 0.8;
    
    // Coração mais bonito e proporcional
    ctx.moveTo(0, -size * 0.25);
    
    // Curva esquerda superior
    ctx.bezierCurveTo(
        -size * 0.8, -size * 0.25,
        -size * 1.1, topCurveHeight * 0.2,
        -bottomCurveWidth * 0.5, topCurveHeight * 0.7
    );
    
    // Curva esquerda inferior
    ctx.bezierCurveTo(
        -bottomCurveWidth * 0.2, size * 1.05,
        0, size * 0.85,
        0, size * 0.85
    );
    
    // Curva direita inferior
    ctx.bezierCurveTo(
        0, size * 0.85,
        bottomCurveWidth * 0.2, size * 1.05,
        bottomCurveWidth * 0.5, topCurveHeight * 0.7
    );
    
    // Curva direita superior
    ctx.bezierCurveTo(
        size * 1.1, topCurveHeight * 0.2,
        size * 0.8, -size * 0.25,
        0, -size * 0.25
    );
    
    ctx.closePath();
}

// Funções auxiliares para cores
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

function drawSparkles() {
    const time = Date.now();
    const config = settings.hearts;
    
    stars.forEach(star => {
        if (star.type !== 'sparkle') return;
        
        star.y += star.speedY;
        star.x += star.speedX;
        
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5;
        const brightness = star.brightness * twinkle;
        
        star.trail.push({ x: star.x, y: star.y });
        if (star.trail.length > star.maxTrail) {
            star.trail.shift();
        }
        
        if (star.y > canvas.height + 10) {
            star.y = -10;
            star.x = Math.random() * canvas.width;
            star.trail = [];
        }
        if (star.x < -10) star.x = canvas.width + 10;
        if (star.x > canvas.width + 10) star.x = -10;
        
        // Desenhar trilha
        if (star.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(star.trail[0].x, star.trail[0].y);
            
            for (let i = 1; i < star.trail.length; i++) {
                ctx.lineTo(star.trail[i].x, star.trail[i].y);
            }
            
            ctx.strokeStyle = `${star.color}20`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Desenhar brilho
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        
        const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.size * 3
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${brightness})`);
        gradient.addColorStop(0.7, `${star.color}${Math.floor(brightness * 200).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Raios para brilhos maiores
        if (star.size > 1.5) {
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4;
                const length = star.size * 4;
                ctx.moveTo(star.x, star.y);
                ctx.lineTo(
                    star.x + Math.cos(angle) * length,
                    star.y + Math.sin(angle) * length
                );
            }
            ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.3})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    });
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

// ===== ANIMAÇÃO PRINCIPAL =====
function animate() {
    if (!ctx || !canvas) return;
    
    const bgColor = settings[currentAnimation].backgroundColor;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (currentAnimation === 'meteors') {
        drawStars();
        drawMeteors();
    } else if (currentAnimation === 'hearts') {
        drawSparkles();
        drawHearts();
    } else if (currentAnimation === 'aurora') {
        drawAuroraStars();
        drawAurora();
    }
    
    animationId = requestAnimationFrame(animate);
}

function startAnimation() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
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
    
    createElements();
    animate();
    
    document.body.style.backgroundColor = settings[animationName].backgroundColor;
    
    console.log(`✅ ${settings[animationName].name} ativado`);
}

// ===== EXPORT PARA USO =====
window.Animations = {
    init: initAnimations,
    changeTheme: changeAnimation
};

window.initAnimations = initAnimations;

console.log('💖 animations.js com CORAÇÕES BONITOS carregado!');
console.log('❤️ Corações agora têm: 3 estilos diferentes, gradientes, brilhos e movimento natural');