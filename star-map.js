// ===== STAR MAP MODAL - MAPA DAS ESTRELAS =====
// Sistema completo mantendo funcionalidade das estrelas do código original

// ===== GERENCIAMENTO DO MODAL =====
function initStarMapModal() {
    const modal = document.getElementById('starMapModal');
    const closeBtn = document.getElementById('closeStarMapBtn');
    const openBtn = document.getElementById('openStarMapBtn');
    
    if (!modal || !closeBtn) {
        console.warn('⚠️ Elementos do Star Map Modal não encontrados');
        return;
    }
    
    // Abrir modal
    if (openBtn) {
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Adicionar ao histórico
            if (typeof HistoryManager !== 'undefined') {
                HistoryManager.push('star-map-modal');
            }
            
            // Inicializar Star Map se ainda não foi
            if (!window.starMap) {
                window.starMap = new StarMap();
            }
            
            console.log('✨ Star Map Modal aberto');
        });
    }
    
    // Fechar modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        console.log('✨ Star Map Modal fechado');
    });
    
    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeBtn.click();
        }
    });
    
    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeBtn.click();
        }
    });
    
    console.log('✅ Star Map Modal inicializado');
}

// ===== INTEGRAÇÃO COM HISTORY MANAGER =====
if (typeof window !== 'undefined') {
    window.addEventListener('popstate', (e) => {
        const modal = document.getElementById('starMapModal');
        if (modal && modal.style.display === 'flex') {
            const closeBtn = document.getElementById('closeStarMapBtn');
            if (closeBtn) closeBtn.click();
        }
    });
}

class StarMap {
    constructor() {
        this.canvas = document.getElementById('starMapCanvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.tunnelEffect = document.getElementById('starTunnelEffect');
        this.startWarpButton = document.getElementById('startStarWarp');
        
        // Configurações do canvas
        this.canvas.width = 800;
        this.canvas.height = 800;
        
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.radius = this.canvas.width / 2 - 20;
        
        // Estado da animação
        this.animationProgress = 0;
        this.animationDuration = 6000;
        this.pulseDuration = 0.6;
        this.startTime = null;
        this.isAnimationComplete = false;
        
        // Estado do warp
        this.warpActive = false;
        this.warpStartTime = 0;
        this.warpDuration = 30000;
        this.warpTransitionStart = 0;
        this.warpTransitionDuration = 2000;
        this.returningToStart = false;
        this.returnStartTime = 0;
        this.returnDuration = 1000;
        this.warpEnded = false;
        
        // Zoom (não usado mais, mas mantido por compatibilidade)
        this.zoomDepth = 0;
        this.isZooming = false;
        this.zoomSpeed = 0;
        this.maxZoomSpeed = 0.05;
        
        // Partículas para efeito warp
        this.particles = [];
        this.particleCount = 800;
        
        // Mensagens "Eu te amo" em várias línguas
        this.loveMessages = [
            { depth: 5, text: "Eu te amo", lang: "Português", color: "#ff1493" },
            { depth: 12, text: "I love you", lang: "English", color: "#ff69b4" },
            { depth: 19, text: "Je t'aime", lang: "Français", color: "#ff85c1" },
            { depth: 26, text: "Ti amo", lang: "Italiano", color: "#ff9ed5" },
            { depth: 33, text: "Te quiero", lang: "Español", color: "#ffa8d8" },
            { depth: 40, text: "Ich liebe dich", lang: "Deutsch", color: "#ffb3db" },
            { depth: 47, text: "愛してる", lang: "日本語", color: "#ffc2e0" },
            { depth: 54, text: "사랑해", lang: "한국어", color: "#ffd1e8" },
            { depth: 61, text: "我爱你", lang: "中文", color: "#ffe0f0" },
            { depth: 68, text: "Σ' αγαπώ", lang: "Ελληνικά", color: "#ffccdd" },
            { depth: 75, text: "Я тебя люблю", lang: "Русский", color: "#ffd5e5" },
            { depth: 82, text: "Te iubesc", lang: "Română", color: "#ffe3ef" },
            { depth: 89, text: "Kocham cię", lang: "Polski", color: "#fff0f5" },
            { depth: 96, text: "Ik hou van jou", lang: "Nederlands", color: "#ffb8d1" },
            { depth: 103, text: "Jag älskar dig", lang: "Svenska", color: "#ffa0c4" },
            { depth: 110, text: "אני אוהב אותך", lang: "עברית", color: "#ff88b7" },
            { depth: 117, text: "أحبك", lang: "العربية", color: "#ff70aa" },
            { depth: 124, text: "Seni seviyorum", lang: "Türkçe", color: "#ff589d" },
            { depth: 131, text: "Mahal kita", lang: "Tagalog", color: "#ff4090" }
        ];
        
        // Estrelas de fundo
        this.backgroundStars = [];
        this.initBackgroundStars();
        
        // Constelações (MANTIDAS DO CÓDIGO ORIGINAL)
        this.constellations = [
            {
                name: 'Cassiopeia',
                stars: [
                    {x: 520, y: 180},
                    {x: 420, y: 260},
                    {x: 540, y: 320},
                    {x: 440, y: 400},
                    {x: 560, y: 460}
                ]
            },
            {
                name: 'Orion',
                stars: [
                    {x: 200, y: 300},
                    {x: 140, y: 400},
                    {x: 240, y: 480},
                    {x: 180, y: 580}
                ]
            },
            {
                name: 'Crux',
                stars: [
                    {x: 460, y: 560},
                    {x: 380, y: 660},
                    {x: 440, y: 720}
                ]
            }
        ];
        
        this.init();
    }
    
    init() {
        if (!this.canvas || !this.ctx) return;
        
        // Event listener do botão warp
        if (this.startWarpButton) {
            this.startWarpButton.addEventListener('click', () => this.startWarpEffect());
        }
        
        // Iniciar animação
        requestAnimationFrame((timestamp) => this.animate(timestamp));
        
        console.log('✨ Star Map inicializado');
    }
    
    initBackgroundStars() {
        for (let i = 0; i < 500; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.sqrt(Math.random()) * this.radius;
            const x = this.centerX + Math.cos(angle) * dist;
            const y = this.centerY + Math.sin(angle) * dist;
            const type = Math.random();
            const size = Math.random() * 1.2 + 0.3;
            const baseOpacity = Math.random() * 0.4 + 0.4;
            const armLength = Math.random() * 2 + 1.5;
            
            this.backgroundStars.push({ x, y, type, size, baseOpacity, armLength });
        }
    }
    
    createParticle(forceNew = false) {
        const angle = Math.random() * Math.PI * 2;
        const distance = forceNew ? 0 : Math.random() * 300;
        return {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            z: forceNew ? 100 : Math.random() * 100,
            size: Math.random() * 2 + 0.5,
            brightness: Math.random() * 0.5 + 0.5,
            speed: Math.random() * 0.5 + 0.5
        };
    }
    
    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(this.createParticle());
        }
    }
    
    startWarpEffect() {
        this.warpActive = true;
        this.warpStartTime = Date.now();
        this.warpTransitionStart = Date.now();
        this.isZooming = true;
        this.zoomSpeed = 0;
        this.zoomDepth = 0;
        this.warpEnded = false;
        this.initParticles();
        if (this.startWarpButton) {
            this.startWarpButton.style.display = 'none';
        }
        console.log('🚀 Viagem warp iniciada!');
    }
    
    // ===== ANIMAÇÃO INICIAL DAS ESTRELAS (MANTIDA DO ORIGINAL) =====
    drawInitialAnimation(progress) {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.scale(1, 1);
        this.ctx.translate(-this.centerX, -this.centerY);
        
        // Círculo de borda
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Estrelas de fundo
        const totalWaves = 5;
        this.backgroundStars.forEach((star, index) => {
            const waveIndex = Math.floor((index / this.backgroundStars.length) * totalWaves);
            const waveStart = waveIndex / totalWaves;
            const waveEnd = (waveIndex + 1) / totalWaves;
            const waveProgress = Math.max(0, Math.min(1, (progress - waveStart) / (waveEnd - waveStart)));
            const opacity = waveProgress;
            
            if (opacity > 0) {
                if (star.type < 0.6) {
                    // Estrela simples
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${star.baseOpacity * opacity})`;
                    this.ctx.beginPath();
                    this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (star.type < 0.85) {
                    // Estrela com brilho
                    const glowRadius = star.size * 3;
                    const gradient = this.ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowRadius);
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.7 * opacity})`);
                    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.2 * opacity})`);
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    
                    this.ctx.fillStyle = gradient;
                    this.ctx.beginPath();
                    this.ctx.arc(star.x, star.y, glowRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * opacity})`;
                    this.ctx.beginPath();
                    this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    // Estrela com cruz
                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${star.baseOpacity * opacity})`;
                    this.ctx.lineWidth = 0.5;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(star.x - star.armLength, star.y);
                    this.ctx.lineTo(star.x + star.armLength, star.y);
                    this.ctx.stroke();
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(star.x, star.y - star.armLength);
                    this.ctx.lineTo(star.x, star.y + star.armLength);
                    this.ctx.stroke();
                    
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${star.baseOpacity * opacity})`;
                    this.ctx.beginPath();
                    this.ctx.arc(star.x, star.y, 0.8, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        });
        
        // Desenhar constelações
        this.constellations.forEach((constellation, constIndex) => {
            const totalStars = constellation.stars.length;
            const starsPerConstellation = 1 / this.constellations.length;
            const constellationStart = constIndex * starsPerConstellation;
            const constellationProgress = Math.max(0, Math.min(1, (progress - constellationStart) / starsPerConstellation));
            
            let pulseEffect = 0;
            if (constellationProgress >= 1) {
                const rawProgress = this.animationProgress;
                const timeSinceComplete = (rawProgress - (constellationStart + starsPerConstellation)) / starsPerConstellation;
                if (timeSinceComplete >= 0 && timeSinceComplete < this.pulseDuration) {
                    const t = timeSinceComplete / this.pulseDuration;
                    pulseEffect = Math.sin(t * Math.PI) * (1 - t * 0.5) * 0.8;
                }
            }
            
            // Linhas da constelação
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 + pulseEffect * 0.5})`;
            this.ctx.lineWidth = 3 + pulseEffect * 3;
            
            for (let i = 0; i < totalStars - 1; i++) {
                const lineProgress = Math.max(0, Math.min(1, (constellationProgress * totalStars) - i));
                
                if (lineProgress > 0) {
                    const start = constellation.stars[i];
                    const end = constellation.stars[i + 1];
                    const currentEndX = start.x + (end.x - start.x) * lineProgress;
                    const currentEndY = start.y + (end.y - start.y) * lineProgress;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(start.x, start.y);
                    this.ctx.lineTo(currentEndX, currentEndY);
                    this.ctx.stroke();
                }
            }
            
            // Estrelas da constelação
            constellation.stars.forEach((star, starIndex) => {
                const starProgress = Math.max(0, Math.min(1, (constellationProgress * totalStars) - starIndex + 0.5));
                
                if (starProgress > 0) {
                    const currentSize = starProgress;
                    const glowBoost = 1 + pulseEffect * 1.5;
                    
                    const gradient = this.ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, 16 * currentSize * glowBoost);
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${1 * currentSize})`);
                    gradient.addColorStop(0.3, `rgba(255, 255, 255, ${0.6 * currentSize})`);
                    gradient.addColorStop(0.7, `rgba(255, 255, 255, ${0.2 * currentSize})`);
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    
                    this.ctx.fillStyle = gradient;
                    this.ctx.beginPath();
                    this.ctx.arc(star.x, star.y, 16 * currentSize * glowBoost, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${currentSize})`;
                    this.ctx.beginPath();
                    this.ctx.arc(star.x, star.y, 6 * currentSize, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * currentSize})`;
                    this.ctx.beginPath();
                    this.ctx.arc(star.x, star.y, 3 * currentSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });
            
            // Nome da constelação
            if (constellationProgress > 0.8) {
                const nameOpacity = (constellationProgress - 0.8) / 0.2;
                const avgX = constellation.stars.reduce((sum, star) => sum + star.x, 0) / constellation.stars.length;
                const maxY = Math.max(...constellation.stars.map(star => star.y));
                
                this.ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
                this.ctx.shadowBlur = 10;
                this.ctx.font = 'italic 13px Georgia, serif';
                this.ctx.fillStyle = `rgba(255, 255, 255, ${(0.8 + pulseEffect * 0.2) * nameOpacity})`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(constellation.name, avgX, maxY + 30);
                
                const textWidth = this.ctx.measureText(constellation.name).width;
                this.ctx.shadowBlur = 4;
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${(0.4 + pulseEffect * 0.2) * nameOpacity})`;
                this.ctx.lineWidth = 0.8;
                this.ctx.beginPath();
                this.ctx.moveTo(avgX - textWidth / 2 - 6, maxY + 34);
                this.ctx.lineTo(avgX + textWidth / 2 + 6, maxY + 34);
                this.ctx.stroke();
                
                this.ctx.fillStyle = `rgba(255, 255, 255, ${(0.5 + pulseEffect * 0.2) * nameOpacity})`;
                this.ctx.beginPath();
                this.ctx.arc(avgX - textWidth / 2 - 6, maxY + 34, 1.5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(avgX + textWidth / 2 + 6, maxY + 34, 1.5, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.shadowBlur = 0;
                this.ctx.shadowColor = 'transparent';
            }
        });
        
        this.ctx.restore();
    }
    
    // ===== EFEITO WARP SPEED =====
    drawWarpSpeed() {
        const warpElapsed = Date.now() - this.warpStartTime;
        const warpProgress = Math.min(warpElapsed / this.warpDuration, 1);
        
        const transitionElapsed = Date.now() - this.warpTransitionStart;
        const transitionProgress = Math.min(transitionElapsed / this.warpTransitionDuration, 1);
        
        if (transitionProgress < 1) {
            this.drawInitialAnimation(1);
            const fadeOpacity = transitionProgress;
            this.ctx.fillStyle = `rgba(0, 0, 0, ${fadeOpacity * 0.7})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        const gradient = this.ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, this.radius);
        gradient.addColorStop(0, '#000814');
        gradient.addColorStop(0.5, '#001d3d');
        gradient.addColorStop(1, '#000000');
        this.ctx.fillStyle = gradient;
        this.ctx.globalAlpha = transitionProgress;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalAlpha = 1;
        
        // Ajuste de velocidade
        if (warpProgress < 0.4) {
            this.zoomSpeed = Math.min(this.zoomSpeed + 0.003, this.maxZoomSpeed * 0.3);
        } else if (warpProgress < 0.8) {
            this.zoomSpeed = Math.min(this.zoomSpeed + 0.002, this.maxZoomSpeed * 0.6);
        } else {
            this.zoomSpeed = Math.max(this.zoomSpeed - 0.005, 0);
        }
        
        this.zoomDepth += this.zoomSpeed * 1.5;
        
        const particleOpacity = transitionProgress;
        
        // Desenhar partículas
        this.particles.forEach((p, index) => {
            p.z -= this.zoomSpeed * 80 * p.speed;
            
            if (p.z <= 0) {
                this.particles[index] = this.createParticle(true);
            }
            
            const scale = 200 / (200 + p.z);
            const x2d = this.centerX + p.x * scale;
            const y2d = this.centerY + p.y * scale;
            const size = p.size * scale * 3;
            
            const trailLength = 25 * this.zoomSpeed / this.maxZoomSpeed;
            const trailGradient = this.ctx.createLinearGradient(
                x2d, y2d,
                x2d + p.x * scale * trailLength * 0.1,
                y2d + p.y * scale * trailLength * 0.1
            );
            trailGradient.addColorStop(0, `rgba(255, 255, 255, ${p.brightness * scale * 0.8 * particleOpacity})`);
            trailGradient.addColorStop(0.5, `rgba(255, 255, 255, ${p.brightness * scale * 0.3 * particleOpacity})`);
            trailGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            this.ctx.strokeStyle = trailGradient;
            this.ctx.lineWidth = size * 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x2d, y2d);
            this.ctx.lineTo(
                x2d + p.x * scale * trailLength * 0.1,
                y2d + p.y * scale * trailLength * 0.1
            );
            this.ctx.stroke();
        });
        
        // Vinheta túnel
        const tunnelGradient = this.ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, this.radius);
        tunnelGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        tunnelGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.5)');
        tunnelGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        this.ctx.fillStyle = tunnelGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Mostrar mensagens "Eu te amo"
        if (warpProgress > 0.15 && warpProgress < 0.90) {
            const adjustedProgress = warpProgress - 0.15;
            
            this.loveMessages.forEach((msg, index) => {
                const msgProgress = adjustedProgress - (index * 0.10);
                
                if (msgProgress > 0 && msgProgress < 0.12) {
                    const scale = Math.min(1, msgProgress * 8);
                    const fadeOut = msgProgress > 0.1 ? 1 - ((msgProgress - 0.1) / 0.02) : 1;
                    const opacity = scale * fadeOut;
                    
                    if (opacity > 0) {
                        this.ctx.save();
                        this.ctx.translate(this.centerX, this.centerY);
                        this.ctx.scale(1 + scale * 0.5, 1 + scale * 0.5);
                        
                        this.ctx.font = 'italic bold 48px Georgia, serif';
                        this.ctx.fillStyle = msg.color.replace(')', `, ${opacity})`).replace('rgb', 'rgba');
                        this.ctx.textAlign = 'center';
                        this.ctx.shadowColor = msg.color;
                        this.ctx.shadowBlur = 50 * scale;
                        this.ctx.fillText(msg.text, 0, -30);
                        
                        this.ctx.font = 'italic 20px Georgia, serif';
                        this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
                        this.ctx.shadowBlur = 25 * scale;
                        this.ctx.fillText(`(${msg.lang})`, 0, 10);
                        
                        this.ctx.restore();
                    }
                }
            });
        }
        
        // Info de debug
        this.ctx.font = 'italic 14px Georgia, serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Velocidade Warp: ${Math.floor(this.zoomSpeed * 100)}%`, this.canvas.width - 20, this.canvas.height - 40);
        this.ctx.fillText(`Profundidade: ${Math.floor(this.zoomDepth)}`, this.canvas.width - 20, this.canvas.height - 20);
        
        // Terminar warp
        if (warpProgress >= 0.85 || (warpProgress >= 0.80 && this.zoomSpeed < 0.005)) {
            this.warpActive = false;
            this.warpEnded = true;
            this.isZooming = false;
            this.zoomSpeed = 0;
            this.particles = [];
            
            if (this.tunnelEffect) {
                this.tunnelEffect.style.opacity = '0';
            }
            this.returningToStart = true;
            this.returnStartTime = Date.now();
            this.zoomDepth = 0;
            if (this.startWarpButton) {
                this.startWarpButton.style.display = 'block';
            }
        }
        
        if (warpProgress >= 1) {
            this.warpActive = false;
            this.warpEnded = true;
            this.isZooming = false;
            this.zoomSpeed = 0;
            this.particles = [];
            
            if (this.tunnelEffect) {
                this.tunnelEffect.style.opacity = '0';
            }
            this.returningToStart = true;
            this.returnStartTime = Date.now();
            this.zoomDepth = 0;
            if (this.startWarpButton) {
                this.startWarpButton.style.display = 'block';
            }
        }
    }
    
    drawScene(progress) {
        if (this.returningToStart) {
            const returnElapsed = Date.now() - this.returnStartTime;
            const returnProgress = Math.min(returnElapsed / this.returnDuration, 1);
            
            if (returnProgress < 1) {
                const fadeOpacity = 1 - returnProgress;
                
                const gradient = this.ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, this.radius);
                gradient.addColorStop(0, `rgba(0, 8, 20, ${fadeOpacity})`);
                gradient.addColorStop(0.5, `rgba(0, 29, 61, ${fadeOpacity})`);
                gradient.addColorStop(1, `rgba(0, 0, 0, ${fadeOpacity})`);
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                this.ctx.fillStyle = `rgba(0, 0, 0, ${returnProgress})`;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            } else {
                this.returningToStart = false;
                this.warpEnded = false;
                this.isAnimationComplete = false;
                this.animationProgress = 0;
                this.startTime = null;
            }
        } else if (this.warpActive) {
            this.drawWarpSpeed();
        } else if (!this.isAnimationComplete) {
            this.drawInitialAnimation(progress);
        } else {
            this.drawInitialAnimation(1);
        }
    }
    
    animate(timestamp) {
        if (!this.startTime) this.startTime = timestamp;
        const elapsed = timestamp - this.startTime;
        
        const totalConstellations = this.constellations.length;
        const starsPerConstellation = 1 / totalConstellations;
        const totalDuration = this.animationDuration * (1 + (starsPerConstellation * this.pulseDuration));
        
        this.animationProgress = elapsed / this.animationDuration;
        
        this.drawScene(Math.min(this.animationProgress, 1));
        
        if (elapsed < totalDuration && !this.returningToStart) {
            requestAnimationFrame((ts) => this.animate(ts));
        } else {
            if (!this.isAnimationComplete && !this.returningToStart) {
                this.isAnimationComplete = true;
                this.initParticles();
            }
            requestAnimationFrame((ts) => this.continuousRender(ts));
        }
    }
    
    continuousRender(timestamp) {
        if (this.returningToStart) {
            this.drawScene(1);
            requestAnimationFrame((ts) => this.continuousRender(ts));
        } else if (!this.isAnimationComplete) {
            requestAnimationFrame((ts) => this.animate(ts));
        } else {
            this.drawScene(1);
            requestAnimationFrame((ts) => this.continuousRender(ts));
        }
    }
}

// Inicializar Star Map Modal quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initStarMapModal();
        
        // Star Map será inicializado apenas quando o modal abrir
        console.log('✨ Star Map Modal pronto para uso');
    }, 500);
});
