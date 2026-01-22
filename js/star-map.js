// ===== STAR MAP MODAL - MAPA DAS ESTRELAS COM CONSTELAÇÕES DINÂMICAS =====

// ===== BANCO DE CONSTELAÇÕES =====
const CONSTELLATIONS_DATA = {
    'Cassiopeia': {
        stars: [
            {x: 520, y: 180},
            {x: 420, y: 260},
            {x: 540, y: 320},
            {x: 440, y: 400},
            {x: 560, y: 460}
        ],
        season: 'outono',
        hemisphere: 'norte',
        magnitude: 9
    },
    'Orion': {
        stars: [
            {x: 200, y: 300},
            {x: 140, y: 400},
            {x: 240, y: 480},
            {x: 180, y: 580}
        ],
        season: 'inverno',
        hemisphere: 'both',
        magnitude: 10
    },
    'Crux': {
        stars: [
            {x: 460, y: 560},
            {x: 380, y: 660},
            {x: 440, y: 720}
        ],
        season: 'ano_todo',
        hemisphere: 'sul',
        magnitude: 8
    },
    'Ursa Major': {
        stars: [
            {x: 600, y: 200},
            {x: 650, y: 250},
            {x: 680, y: 300},
            {x: 650, y: 350},
            {x: 600, y: 380},
            {x: 550, y: 340},
            {x: 530, y: 280}
        ],
        season: 'primavera',
        hemisphere: 'norte',
        magnitude: 9
    },
    'Leo': {
        stars: [
            {x: 300, y: 200},
            {x: 350, y: 240},
            {x: 400, y: 220},
            {x: 380, y: 280},
            {x: 320, y: 300}
        ],
        season: 'primavera',
        hemisphere: 'both',
        magnitude: 8
    },
    'Scorpius': {
        stars: [
            {x: 150, y: 500},
            {x: 200, y: 540},
            {x: 250, y: 580},
            {x: 280, y: 620},
            {x: 300, y: 670}
        ],
        season: 'verao',
        hemisphere: 'both',
        magnitude: 9
    },
    'Aquarius': {
        stars: [
            {x: 500, y: 450},
            {x: 540, y: 500},
            {x: 580, y: 540},
            {x: 560, y: 590}
        ],
        season: 'outono',
        hemisphere: 'both',
        magnitude: 7
    },
    'Taurus': {
        stars: [
            {x: 250, y: 250},
            {x: 300, y: 280},
            {x: 340, y: 320},
            {x: 320, y: 370}
        ],
        season: 'inverno',
        hemisphere: 'both',
        magnitude: 8
    },
    'Gemini': {
        stars: [
            {x: 350, y: 180},
            {x: 400, y: 160},
            {x: 420, y: 210},
            {x: 380, y: 250},
            {x: 340, y: 240}
        ],
        season: 'inverno',
        hemisphere: 'norte',
        magnitude: 7
    },
    'Virgo': {
        stars: [
            {x: 450, y: 300},
            {x: 490, y: 350},
            {x: 520, y: 390},
            {x: 480, y: 430}
        ],
        season: 'primavera',
        hemisphere: 'both',
        magnitude: 8
    },
    'Sagittarius': {
        stars: [
            {x: 180, y: 600},
            {x: 220, y: 640},
            {x: 260, y: 680},
            {x: 240, y: 720}
        ],
        season: 'verao',
        hemisphere: 'sul',
        magnitude: 9
    },
    'Cygnus': {
        stars: [
            {x: 600, y: 450},
            {x: 630, y: 500},
            {x: 650, y: 550},
            {x: 620, y: 600},
            {x: 580, y: 580}
        ],
        season: 'verao',
        hemisphere: 'norte',
        magnitude: 8
    }
};

// ===== FUNÇÃO PARA CALCULAR ESTAÇÃO DO ANO =====
function getSeason(date, latitude) {
    const month = date.getMonth(); // 0-11
    const isNorthern = latitude >= 0;
    
    if (isNorthern) {
        if (month >= 2 && month <= 4) return 'primavera';
        if (month >= 5 && month <= 7) return 'verao';
        if (month >= 8 && month <= 10) return 'outono';
        return 'inverno';
    } else {
        if (month >= 2 && month <= 4) return 'outono';
        if (month >= 5 && month <= 7) return 'inverno';
        if (month >= 8 && month <= 10) return 'primavera';
        return 'verao';
    }
}

// ===== FUNÇÃO PARA SELECIONAR 3 CONSTELAÇÕES VISÍVEIS =====
function selectVisibleConstellations(date, latitude, longitude) {
    const season = getSeason(date, latitude);
    const hemisphere = latitude >= 0 ? 'norte' : 'sul';
    
    console.log(`🌍 Calculando constelações para:`);
    console.log(`   📅 Data: ${date.toLocaleDateString()}`);
    console.log(`   📍 Coordenadas: ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);
    console.log(`   🍂 Estação: ${season}`);
    console.log(`   🌐 Hemisfério: ${hemisphere}`);
    
    // Filtrar constelações visíveis (preferência para estação/hemisfério)
    const perfectMatch = Object.entries(CONSTELLATIONS_DATA).filter(([name, data]) => {
        const isSeasonMatch = data.season === season || data.season === 'ano_todo';
        const isHemisphereMatch = data.hemisphere === hemisphere || data.hemisphere === 'both';
        return isSeasonMatch && isHemisphereMatch;
    });
    
    // Se não tiver 3, adicionar constelações de "both" de outras estações
    let available = [...perfectMatch];
    
    if (available.length < 3) {
        const fallback = Object.entries(CONSTELLATIONS_DATA).filter(([name, data]) => {
            const alreadyIncluded = available.some(([n]) => n === name);
            return !alreadyIncluded && data.hemisphere === 'both';
        });
        available = [...available, ...fallback];
    }
    
    // Se ainda não tiver 3, adicionar qualquer uma do mesmo hemisfério
    if (available.length < 3) {
        const sameHemisphere = Object.entries(CONSTELLATIONS_DATA).filter(([name, data]) => {
            const alreadyIncluded = available.some(([n]) => n === name);
            return !alreadyIncluded && (data.hemisphere === hemisphere || data.hemisphere === 'both');
        });
        available = [...available, ...sameHemisphere];
    }
    
    // Última garantia: se ainda não tiver 3, pegar qualquer uma
    if (available.length < 3) {
        const any = Object.entries(CONSTELLATIONS_DATA).filter(([name, data]) => {
            const alreadyIncluded = available.some(([n]) => n === name);
            return !alreadyIncluded;
        });
        available = [...available, ...any];
    }
    
    // Ordenar por magnitude (mais brilhantes primeiro)
    available.sort((a, b) => b[1].magnitude - a[1].magnitude);
    
    // SEMPRE pegar exatamente 3 (garantido)
    const selected = available.slice(0, 3);
    
    console.log(`✨ ${selected.length} constelações selecionadas:`);
    selected.forEach(([name, data]) => {
        console.log(`   ⭐ ${name} (magnitude ${data.magnitude})`);
    });
    
    // ✅ REDISTRIBUIR POSIÇÕES PARA OCUPAR MELHOR O ESPAÇO
    return redistributeConstellations(selected);
}

// ===== FUNÇÃO PARA REDISTRIBUIR CONSTELAÇÕES NO CANVAS =====
function redistributeConstellations(constellations) {
    const centerX = 400; // Centro do canvas 800x800
    const centerY = 400;
    const baseRadius = 200; // Raio médio das posições
    
    // Definir 3 setores (120° cada) para distribuição uniforme
    const sectors = [
        { angle: 0, name: 'superior' },      // Topo
        { angle: 120, name: 'inferior-esq' }, // Inferior esquerdo
        { angle: 240, name: 'inferior-dir' }  // Inferior direito
    ];
    
    return constellations.map(([name, data], index) => {
        const sector = sectors[index];
        const angleRad = (sector.angle * Math.PI) / 180;
        
        // Calcular offset do centro baseado no setor
        const offsetX = Math.sin(angleRad) * baseRadius;
        const offsetY = -Math.cos(angleRad) * baseRadius;
        
        // Reposicionar todas as estrelas da constelação
        const redistributedStars = data.stars.map(star => {
            // Calcular posição relativa ao centro original da constelação
            const originalCenterX = data.stars.reduce((sum, s) => sum + s.x, 0) / data.stars.length;
            const originalCenterY = data.stars.reduce((sum, s) => sum + s.y, 0) / data.stars.length;
            
            const relativeX = star.x - originalCenterX;
            const relativeY = star.y - originalCenterY;
            
            // Nova posição = centro do canvas + offset do setor + posição relativa
            return {
                x: centerX + offsetX + relativeX * 0.8, // 0.8 para escalar um pouco
                y: centerY + offsetY + relativeY * 0.8
            };
        });
        
        console.log(`   📍 ${name} reposicionada no setor ${sector.name} (${sector.angle}°)`);
        
        return {
            name: name,
            stars: redistributedStars
        };
    });
}

// ===== FUNÇÃO PARA ATUALIZAR INFO DO MODAL (sem recriar o canvas) =====
function updateStarMapModalInfo(specialDate, latitude, longitude, romanticQuote, config) {
    console.log('🔄 Atualizando informações do modal...');
    
    // Atualizar frase romântica
    const quoteElement = document.querySelector('.star-map-quote');
    if (quoteElement) {
        quoteElement.innerHTML = `"${romanticQuote}" <span class="sparkle">✨</span>`;
        console.log('✅ Frase atualizada');
    }
    
    // Atualizar detalhes (data, local, coordenadas)
    const detailsElement = document.querySelector('.star-map-details');
    if (detailsElement) {
        const locationName = config?.customLocation?.name || 'LOCALIZAÇÃO ATUAL';
        const hemisphere = latitude >= 0 ? 'N' : 'S';
        const longitudeHemisphere = longitude >= 0 ? 'E' : 'W';
        
        detailsElement.innerHTML = `
            <span class="star-map-location">${locationName.toUpperCase()}</span><br>
            <span class="star-map-date">${specialDate.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
            }).replace(' de ', ' DE ').toUpperCase()}</span><br>
            <span class="star-map-coordinates">${Math.abs(latitude).toFixed(4)}°${hemisphere} ${Math.abs(longitude).toFixed(4)}°${longitudeHemisphere}</span>
        `;
        console.log('✅ Detalhes atualizados');
    }
    
    console.log('✅ Modal atualizado com novas informações');
}

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
        openBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Adicionar ao histórico
            if (typeof HistoryManager !== 'undefined') {
                HistoryManager.push('star-map-modal');
            }
            
            // ✅ SEMPRE RESETAR E RECRIAR (GARANTE ANIMAÇÃO DO ZERO)
            console.log('🎬 Abrindo modal - resetando Star Map...');
            window.starMap = null;
            
            // Se houver config pré-carregada, usar
            if (window.starMapState && window.starMapState.isLoaded) {
                console.log('⚡ Usando dados pré-carregados (instantâneo)');
            } else {
                console.log('⏳ Carregando dados agora...');
            }
            
            await initializeStarMapWithConfig();
            
            console.log('✨ Star Map criado do zero - animação iniciada');
        });
    }
    
    // Fechar modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';

        // Parar animação para economizar recursos
        if (window.starMap && typeof window.starMap.stop === 'function') {
            try { window.starMap.stop(); } catch (e) { console.warn('Erro ao parar StarMap:', e); }
            window.starMap = null;
        }

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

// ===== CARREGAR CONFIGURAÇÕES DO FIREBASE E INICIALIZAR =====
async function initializeStarMapWithConfig() {
    try {
        console.log('🔥 Inicializando Star Map...');
        
        let specialDate, latitude, longitude, romanticQuote, config;
        
        // ✅ USAR DADOS PRÉ-CARREGADOS SE DISPONÍVEIS
        if (window.starMapState && window.starMapState.isConfigLoaded) {
            console.log('⚡ Usando configurações pré-carregadas!');
            config = window.starMapState.config;
        } else {
            console.log('⏳ Carregando configurações do Firebase...');
            const configDoc = await db.collection('star_map_config').doc('settings').get();
            config = configDoc.exists ? configDoc.data() : null;
        }
    if (config && config.specialDate) {
            // ✅ CORRIGIDO: Adicionar horário para evitar problema de fuso horário
            specialDate = new Date(config.specialDate + 'T12:00:00');
            console.log(`📅 Data especial encontrada: ${specialDate.toLocaleDateString('pt-BR')}`);
        } else {
            specialDate = new Date(); // Hoje
            console.log(`📅 Usando data atual: ${specialDate.toLocaleDateString('pt-BR')}`);
        }
        
        if (config && config.customLocation) {
            latitude = config.customLocation.lat;
            longitude = config.customLocation.lng;
            console.log(`📍 Localização manual: ${latitude}, ${longitude}`);
        } else {
            // Tentar geolocalização
            try {
                const position = await getCurrentPosition();
                latitude = position.coords.latitude;
                longitude = position.coords.longitude;
                console.log(`📍 Geolocalização detectada: ${latitude}, ${longitude}`);
            } catch (error) {
                // Fallback: Harvard, Illinois
                latitude = 42.4164;
                longitude = -88.6137;
                console.log(`📍 Usando localização padrão: Harvard, Illinois`);
            }
        }
        
        romanticQuote = config?.romanticQuote || "Não importa as constelações nem o idioma, eu vou te amar de qualquer maneira.";
        
        // ✅ ATUALIZAR ELEMENTOS DO MODAL COM AS NOVAS CONFIGURAÇÕES
        updateStarMapModalInfo(specialDate, latitude, longitude, romanticQuote, config);
        
        // ✅ USAR CONSTELAÇÕES PRÉ-CALCULADAS OU CALCULAR AGORA
        let visibleConstellations;
        
        if (window.starMapState && window.starMapState.constellations) {
            console.log('⚡ Usando constelações pré-calculadas!');
            visibleConstellations = window.starMapState.constellations;
        } else {
            console.log('🔄 Calculando constelações agora...');
            visibleConstellations = selectVisibleConstellations(specialDate, latitude, longitude);
        }
        
        // ✅ SEMPRE CRIAR NOVO STAR MAP (REINICIA ANIMAÇÃO)
        console.log('🎬 Criando novo Star Map com animação do zero...');
        window.starMap = new StarMap(visibleConstellations);

    } catch (error) {
        console.error('❌ Erro ao inicializar Star Map:', error);
        
        // Fallback: usar constelações padrão
        const fallbackConstellations = [
            { name: 'Cassiopeia', stars: CONSTELLATIONS_DATA['Cassiopeia'].stars },
            { name: 'Orion', stars: CONSTELLATIONS_DATA['Orion'].stars },
            { name: 'Crux', stars: CONSTELLATIONS_DATA['Crux'].stars }
        ];
        
        window.starMap = new StarMap(fallbackConstellations);
    }
}

// ===== HELPER: PROMISIFICAR GEOLOCALIZAÇÃO =====
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocalização não suportada'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 0
        });
    });
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
    constructor(constellations) {
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
        
        // Zoom
        this.zoomDepth = 0;
        this.isZooming = false;
        this.zoomSpeed = 0;
        this.maxZoomSpeed = 0.05;
        
        // Partículas para efeito warp (reduzido para melhorar performance)
        this.particles = [];
        this.particleCount = 200;
        
        // Mensagens "Eu te amo" em várias línguas
        this.loveMessages = [
            { depth: 5, text: "Eu te amo", lang: "Português", color: "#ff1493" },
            { depth: 12, text: "I love you", lang: "English", color: "#ff69b4" },
            { depth: 19, text: "Ti amo", lang: "Italiano", color: "#ff9ed5" },
            { depth: 26, text: "Je t'aime", lang: "Français", color: "#ff9ed5" },
            { depth: 33, text: "Te quiero", lang: "Español", color: "#ffa8d8" },
            { depth: 40, text: "Ich liebe dich", lang: "Alemão", color: "#ffb3db" },
            { depth: 47, text: "愛してる", lang: "Japonês", color: "#ffc2e0" },
        ];
        
        // Estrelas de fundo
        this.backgroundStars = [];
        this.initBackgroundStars();

        // Controle de execução da animação
        this.running = true;
        this.rafId = null;
        
        // ✨ CONSTELAÇÕES DINÂMICAS (passadas no construtor)
        this.constellations = constellations || [
            { name: 'Cassiopeia', stars: CONSTELLATIONS_DATA['Cassiopeia'].stars },
            { name: 'Orion', stars: CONSTELLATIONS_DATA['Orion'].stars },
            { name: 'Crux', stars: CONSTELLATIONS_DATA['Crux'].stars }
        ];
        
        console.log('🌟 Constelações carregadas no Star Map:', this.constellations.map(c => c.name).join(', '));
        
        this.init();
    }
    
    init() {
        if (!this.canvas || !this.ctx) return;
        
        // Event listener do botão warp
        if (this.startWarpButton) {
            this.startWarpButton.addEventListener('click', () => this.startWarpEffect());
        }
        
        // Iniciar animação
        this.running = true;
        this.rafId = requestAnimationFrame((timestamp) => this.animate(timestamp));
        
        console.log('✨ Star Map inicializado');
    }
    
    initBackgroundStars() {
        for (let i = 0; i < 250; i++) {
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
    
    drawDecorativeStar(x, y, size, opacity) {
        const points = 4;
        const outerRadius = size;
        const innerRadius = size * 0.4;
        
        this.ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI * i) / points;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            
            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }
        this.ctx.closePath();
        this.ctx.fill();
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
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${star.baseOpacity * opacity})`;
                    this.ctx.beginPath();
                    this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (star.type < 0.85) {
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
            
            // Nome da constelação com estilo artístico
            if (constellationProgress > 0.8) {
                const nameOpacity = (constellationProgress - 0.8) / 0.2;
                const avgX = constellation.stars.reduce((sum, star) => sum + star.x, 0) / constellation.stars.length;
                const maxY = Math.max(...constellation.stars.map(star => star.y));
                
                this.ctx.font = 'italic bold 22px Georgia, serif';
                const textWidth = this.ctx.measureText(constellation.name).width;
                const padding = 18;
                const bgHeight = 40;
                const bgY = maxY + 20;
                
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                this.ctx.shadowBlur = 20;
                this.ctx.fillStyle = `rgba(0, 0, 20, ${0.65 * nameOpacity})`;
                this.ctx.beginPath();
                this.ctx.roundRect(
                    avgX - textWidth / 2 - padding,
                    bgY - 8,
                    textWidth + padding * 2,
                    bgHeight,
                    12
                );
                this.ctx.fill();
                
                this.ctx.shadowBlur = 10;
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${(0.3 + pulseEffect * 0.2) * nameOpacity})`;
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();
                
                this.ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
                this.ctx.shadowBlur = 20;
                this.ctx.fillStyle = `rgba(255, 255, 255, ${(0.98 + pulseEffect * 0.02) * nameOpacity})`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(constellation.name, avgX, bgY + bgHeight / 2 - 2);
                
                const starSize = 3;
                this.ctx.shadowBlur = 12;
                this.ctx.fillStyle = `rgba(255, 223, 100, ${(0.8 + pulseEffect * 0.2) * nameOpacity})`;
                
                this.drawDecorativeStar(avgX - textWidth / 2 - padding + 8, bgY + bgHeight / 2 - 2, starSize, nameOpacity);
                this.drawDecorativeStar(avgX + textWidth / 2 + padding - 8, bgY + bgHeight / 2 - 2, starSize, nameOpacity);
                
                this.ctx.shadowBlur = 0;
                this.ctx.shadowColor = 'transparent';
                this.ctx.textBaseline = 'alphabetic';
            }
        });
        
        this.ctx.restore();
    }
    
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
        
        if (warpProgress < 0.4) {
            this.zoomSpeed = Math.min(this.zoomSpeed + 0.003, this.maxZoomSpeed * 0.3);
        } else if (warpProgress < 0.8) {
            this.zoomSpeed = Math.min(this.zoomSpeed + 0.002, this.maxZoomSpeed * 0.6);
        } else {
            this.zoomSpeed = Math.max(this.zoomSpeed - 0.005, 0);
        }
        
        this.zoomDepth += this.zoomSpeed * 1.5;
        
        const particleOpacity = transitionProgress;
        
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
        
        const tunnelGradient = this.ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, this.radius);
        tunnelGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        tunnelGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.5)');
        tunnelGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        this.ctx.fillStyle = tunnelGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
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
        
        this.ctx.font = 'italic 14px Georgia, serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Velocidade Warp: ${Math.floor(this.zoomSpeed * 100)}%`, this.canvas.width - 20, this.canvas.height - 40);
        this.ctx.fillText(`Profundidade: ${Math.floor(this.zoomDepth)}`, this.canvas.width - 20, this.canvas.height - 20);
        
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
        
        if (!this.running) return;

        if (elapsed < totalDuration && !this.returningToStart) {
            this.rafId = requestAnimationFrame((ts) => this.animate(ts));
        } else {
            if (!this.isAnimationComplete && !this.returningToStart) {
                this.isAnimationComplete = true;
                this.initParticles();
            }
            this.rafId = requestAnimationFrame((ts) => this.continuousRender(ts));
        }
    }
    
    continuousRender(timestamp) {
        if (!this.running) return;

        if (this.returningToStart) {
            this.drawScene(1);
            this.rafId = requestAnimationFrame((ts) => this.continuousRender(ts));
        } else if (!this.isAnimationComplete) {
            this.rafId = requestAnimationFrame((ts) => this.animate(ts));
        } else {
            this.drawScene(1);
            this.rafId = requestAnimationFrame((ts) => this.continuousRender(ts));
        }
    }

    stop() {
        this.running = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.particles = [];
        console.log('🛑 StarMap animation stopped to save resources');
    }
}

// Inicializar Star Map Modal quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initStarMapModal();
        console.log('✨ Star Map Modal pronto para uso');
    }, 500);
});