// ===== STAR MAP PRELOADER - CARREGA TUDO ANTES DO MODAL ABRIR =====

console.log('🚀 Star Map Preloader iniciado');

// ===== ESTADO GLOBAL DO STAR MAP =====
window.starMapState = {
    isLoaded: false,
    isConfigLoaded: false,
    config: null,
    constellations: null,
    lastUpdate: null
};

// ===== FUNÇÃO: CARREGAR CONFIGURAÇÕES DO FIREBASE =====
async function preloadStarMapConfig() {
    try {
        console.log('📡 Carregando configurações do Star Map do Firebase...');
        
        // Aguardar Firebase estar pronto
        if (typeof db === 'undefined') {
            console.warn('⏳ Aguardando Firebase...');
            await new Promise(resolve => {
                const checkFirebase = setInterval(() => {
                    if (typeof db !== 'undefined') {
                        clearInterval(checkFirebase);
                        resolve();
                    }
                }, 100);
            });
        }
        
        // Buscar configurações
        const configDoc = await db.collection('star_map_config').doc('settings').get();
        
        if (configDoc.exists) {
            window.starMapState.config = configDoc.data();
            window.starMapState.isConfigLoaded = true;
            window.starMapState.lastUpdate = Date.now();
            
            console.log('✅ Configurações carregadas:', {
                data: window.starMapState.config.specialDate || 'Atual',
                localização: window.starMapState.config.customLocation ? 'Manual' : 'Auto'
            });
        } else {
            console.log('ℹ️ Sem configurações personalizadas - usando padrões');
            window.starMapState.config = null;
            window.starMapState.isConfigLoaded = true;
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar configurações:', error);
        window.starMapState.isConfigLoaded = true; // Marcar como carregado mesmo com erro
        window.starMapState.config = null;
    }
}

// ===== FUNÇÃO: PRÉ-CALCULAR CONSTELAÇÕES =====
async function precalculateConstellations() {
    try {
        console.log('🌌 Pré-calculando constelações...');
        
        let specialDate, latitude, longitude;
        
        // Usar config se existir
        if (window.starMapState.config && window.starMapState.config.specialDate) {
            specialDate = new Date(window.starMapState.config.specialDate + 'T12:00:00');
        } else {
            specialDate = new Date();
        }
        
        if (window.starMapState.config && window.starMapState.config.customLocation) {
            latitude = window.starMapState.config.customLocation.lat;
            longitude = window.starMapState.config.customLocation.lng;
        } else {
            // Tentar geolocalização (com timeout curto)
            try {
                const position = await Promise.race([
                    new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
                ]);
                latitude = position.coords.latitude;
                longitude = position.coords.longitude;
            } catch (geoError) {
                // Fallback: Harvard, Illinois
                latitude = 42.4164;
                longitude = -88.6137;
                console.log('📍 Usando localização padrão (Harvard, IL)');
            }
        }
        
        // Calcular constelações (se a função existir)
        if (typeof selectVisibleConstellations === 'function') {
            window.starMapState.constellations = selectVisibleConstellations(specialDate, latitude, longitude);
            console.log(`✅ ${window.starMapState.constellations.length} constelações calculadas`);
        } else {
            console.warn('⚠️ Função selectVisibleConstellations ainda não carregada');
        }
        
    } catch (error) {
        console.error('❌ Erro ao pré-calcular constelações:', error);
    }
}

// ===== FUNÇÃO: INICIALIZAR TUDO =====
async function initializeStarMapPreloader() {
    console.log('🔄 Inicializando Star Map Preloader...');
    
    // 1. Carregar configurações
    await preloadStarMapConfig();
    
    // 2. Aguardar funções do star-map.js estarem disponíveis
    await new Promise(resolve => {
        const checkFunctions = setInterval(() => {
            if (typeof selectVisibleConstellations === 'function') {
                clearInterval(checkFunctions);
                resolve();
            }
        }, 100);
        
        // Timeout de segurança (5 segundos)
        setTimeout(() => {
            clearInterval(checkFunctions);
            resolve();
        }, 5000);
    });
    
    // 3. Pré-calcular constelações
    await precalculateConstellations();
    
    window.starMapState.isLoaded = true;
    console.log('✅ Star Map Preloader completo! Pronto para abrir o modal instantaneamente.');
}

// ===== FUNÇÃO: FORÇAR RELOAD (CHAMADA PELO ADMIN) =====
window.forceReloadStarMapConfig = async function() {
    console.log('🔄 Forçando reload das configurações...');
    
    window.starMapState.isLoaded = false;
    window.starMapState.isConfigLoaded = false;
    
    await preloadStarMapConfig();
    await precalculateConstellations();
    
    window.starMapState.isLoaded = true;
    
    // Se o modal estiver aberto, recriar o Star Map
    const modal = document.getElementById('starMapModal');
    if (modal && modal.style.display === 'flex') {
        console.log('🔄 Modal aberto - recriando Star Map...');
        window.starMap = null;
        await initializeStarMapWithConfig();
    }
    
    console.log('✅ Reload completo!');
    return true;
};

// ===== INICIALIZAR QUANDO A PÁGINA CARREGAR (OTIMIZADO PARA MOBILE) =====
async function startPreloaderWhenReady() {
    // 1. Aguardar Firebase estar 100% pronto
    while (typeof db === 'undefined') {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('🔥 Firebase pronto - iniciando preloader...');
    
    // 2. Aguardar função selectVisibleConstellations estar disponível
    let attempts = 0;
    while (typeof selectVisibleConstellations !== 'function' && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (typeof selectVisibleConstellations === 'function') {
        console.log('✅ star-map.js carregado - iniciando pré-cálculo...');
        await initializeStarMapPreloader();
    } else {
        console.warn('⚠️ star-map.js não carregou a tempo - preloader pulado');
    }
}

// Iniciar assim que possível
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPreloaderWhenReady);
} else {
    startPreloaderWhenReady();
}

console.log('✅ Star Map Preloader carregado!');