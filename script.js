// ===== SISTEMA GLOBAL DE HISTÓRICO (BACK BUTTON) - VERSÃO COMPLETA =====
const HistoryManager = {
    stack: [],
    
    push(state) {
        this.stack.push(state);
        history.pushState({ customState: state }, '');
        console.log('📍 Estado adicionado:', state, '| Pilha:', this.stack.length);
    },
    
    pop() {
        if (this.stack.length > 0) {
            const state = this.stack.pop();
            console.log('⬅️ Voltando de:', state, '| Pilha restante:', this.stack.length);
            return state;
        }
        return null;
    },
    
    clear() {
        this.stack = [];
        console.log('🗑️ Histórico limpo');
    },
    
    getCurrentState() {
        return this.stack[this.stack.length - 1] || null;
    },
    
    remove(state) {
        const index = this.stack.lastIndexOf(state);
        if (index > -1) {
            this.stack.splice(index, 1);
            console.log('🗑️ Estado removido:', state);
        }
    }
};

// Interceptar botão back global
window.addEventListener('popstate', (e) => {
    const currentState = HistoryManager.pop();
    
    if (!currentState) {
        console.log('ℹ️ Pilha vazia - deixando navegador processar');
        return;
    }
    
    e.preventDefault();
    e.stopPropagation(); // ← ADICIONAR ESTA LINHA
    console.log('🔙 Processando back para:', currentState);
    
    switch(currentState) {
        // ===== MODAIS PRINCIPAIS =====
        case 'album-modal':
            document.getElementById('closeModal')?.click();
            break;
            
        case 'timeline-modal':
            document.getElementById('closeTimelineBtn')?.click();
            break;
            
        case 'secret-modal':
            document.getElementById('closeSecretBtn')?.click();
            break;
            
        // ===== MENU HAMBÚRGUER =====
        case 'hamburger-menu':
            const sideMenu = document.getElementById('sideMenu');
            const menuOverlay = document.getElementById('menuOverlay');
            const hamburgerBtn = document.getElementById('hamburgerBtn');
            
            if (sideMenu && sideMenu.classList.contains('active')) {
                hamburgerBtn?.classList.remove('active');
                sideMenu.classList.remove('active');
                menuOverlay?.classList.remove('active');
                document.body.style.overflow = 'auto';
                console.log('🍔 Menu hambúrguer fechado pelo back');
            }
            break;
        
// ===== ADMIN MODAL =====
case 'admin-modal':
    console.log('🎯 CASE ADMIN-MODAL ATIVADO!');
    const adminModal = document.getElementById('adminModal');
    console.log('🔍 Admin modal encontrado?', !!adminModal);
    console.log('🔍 Display atual:', adminModal?.style.display);
    
    if (adminModal) {
        // ← FORÇAR COM setAttribute (ignora CSS externo)
        adminModal.setAttribute('style', 'display: none !important;');
        document.body.style.overflow = 'auto';
        
        // Limpar estados internos
        const editSection = document.getElementById('editAlbumSection');
        const editInfoSection = document.getElementById('editAlbumInfoSection');
        const toolbar = document.getElementById('bottomToolbar');
        const albumInfoForm = document.getElementById('albumInfoEditForm');
        
        if (editSection) editSection.style.display = 'none';
        if (editInfoSection) editInfoSection.style.display = 'none';
        if (toolbar) toolbar.style.display = 'none';
        if (albumInfoForm) albumInfoForm.style.display = 'none';
        
        console.log('🔐 Admin fechado pelo back - Display agora:', adminModal.style.display);
    }
    break;
            
        // ===== EDIÇÃO DE INFORMAÇÕES DO ÁLBUM =====
        case 'album-info-edit':
            const albumInfoForm = document.getElementById('albumInfoEditForm');
            const toggleBtn = document.getElementById('toggleAlbumInfoEdit');
            
            if (albumInfoForm && albumInfoForm.style.display !== 'none') {
                albumInfoForm.style.display = 'none';
                if (toggleBtn) {
                    toggleBtn.innerHTML = '<i class="fas fa-edit"></i><span>Editar Álbum</span>';
                }
                console.log('✏️ Formulário de edição fechado pelo back');
            }
            break;
            
        // ===== MODO DE REORGANIZAÇÃO =====
        case 'reorganize-mode':
            if (typeof isReorganizing !== 'undefined' && isReorganizing) {
                if (typeof exitReorganizeMode === 'function') {
                    exitReorganizeMode(false); // false = não salvar
                }
                console.log('🔄 Modo reorganizar cancelado pelo back');
            }
            break;
            
        // ===== MODO DE SELEÇÃO =====
        case 'edit-mode-selection':
            if (typeof cancelSelection === 'function') {
                cancelSelection();
                console.log('☑️ Seleção cancelada pelo back');
            }
            break;
            
        // ===== ABA DE EDIÇÃO (VOLTAR PARA CRIAR) =====
        case 'edit-tab':
            const editTab = document.getElementById('edit-tab');
            const createTab = document.querySelector('[data-tab="create"]');
            
            if (editTab && createTab) {
                // Esconder aba de edição
                editTab.classList.remove('active');
                
                // Mostrar aba de criar
                document.getElementById('create-tab')?.classList.add('active');
                
                // Atualizar botões de tab
                document.querySelectorAll('.admin-tab').forEach(tab => {
                    tab.classList.remove('active');
                    if (tab.dataset.tab === 'create') {
                        tab.classList.add('active');
                    }
                });
                
                console.log('📝 Voltou para aba de criação');
            }
            break;
            
        default:
            console.warn('⚠️ Estado desconhecido:', currentState);
    }
    
    // Re-adicionar estado anterior se ainda houver
    if (HistoryManager.stack.length > 0) {
        history.pushState({ customState: HistoryManager.getCurrentState() }, '');
    }
});

// ===== CONFIGURAÇÕES INICIAIS =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando site Kevin & Iara...');
    
    // Verificar elementos essenciais
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    
    if (!hamburgerBtn || !sideMenu || !menuOverlay) {
        console.error('❌ ERRO CRÍTICO: Elementos do menu não encontrados!');
        return;
    }
    
    console.log('✅ Elementos do menu encontrados');
    
    // Inicializar componentes em sequência
    setTimeout(() => {
        if (typeof initAnimations === 'function') {
            initAnimations();
        }
    }, 100);
    
    setTimeout(() => {
        const savedTheme = loadSavedTheme();
        if (savedTheme && themes[savedTheme]) {
            console.log(`🎯 Aplicando tema salvo: ${themes[savedTheme].name}`);
            currentTheme = savedTheme;
            changeTheme(savedTheme, false);
        }
    }, 200);
    
    setTimeout(() => {
        initThemeSelector();
        initTimeCounter();
        initMusicPlayer();
        initAlbums();
        initMessages();
        initModal();
        initTimelineModal();
        initHamburgerMenu();
        updateCurrentDate();
        
        console.log('✅ Site inicializado com sucesso!');
    }, 300);
});

// ===== CONFIGURAÇÕES DE DATAS =====
const START_DATE = new Date('2025-10-11T00:00:00');
const START_DATE_DISPLAY = '11/10/2025';

// ===== SISTEMA DE TEMAS =====
const themes = {
    meteors: {
        name: 'Meteoros',
        colors: {
            bg: '#0a0e17',
            primary: '#6a11cb',
            secondary: '#2575fc',
            accent: '#ff6b8b',
            text: '#ffffff',
            textSecondary: '#b8b8d1'
        }
    },
    hearts: {
        name: 'Chuva de Corações',
        colors: {
            bg: '#1a0b2e',
            primary: '#ff2e63',
            secondary: '#ff9a9e',
            accent: '#ffd166',
            text: '#ffffff',
            textSecondary: '#e0c3fc'
        }
    },
    aurora: {
        name: 'Aurora Boreal',
        colors: {
            bg: '#0c1b33',
            primary: '#00b4d8',
            secondary: '#90e0ef',
            accent: '#caf0f8',
            text: '#ffffff',
            textSecondary: '#a8dadc'
        }
    },
    winter: {
        name: 'Inverno Mágico',
        colors: {
            bg: '#1a2332',
            primary: '#e3f2fd',
            secondary: '#81d4fa',
            accent: '#b3e5fc',
            text: '#ffffff',
            textSecondary: '#e1f5fe'
        }
    }
};

let currentTheme = 'meteors';

function saveTheme(themeName) {
    try {
        localStorage.setItem('kevinIaraTheme', themeName);
        console.log(`💾 Tema "${themes[themeName].name}" salvo no navegador`);
    } catch (error) {
        console.warn('⚠️ Não foi possível salvar o tema:', error);
    }
}

function loadSavedTheme() {
    try {
        const savedTheme = localStorage.getItem('kevinIaraTheme');
        
        if (savedTheme && themes[savedTheme]) {
            setTimeout(() => {
                const themeButtons = document.querySelectorAll('.theme-btn');
                themeButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.theme === savedTheme) {
                        btn.classList.add('active');
                    }
                });
            }, 100);
            
            console.log(`✅ Tema "${themes[savedTheme].name}" carregado`);
            return savedTheme;
        }
        return 'meteors';
    } catch (error) {
        console.warn('⚠️ Erro ao carregar tema:', error);
        return 'meteors';
    }
}

function initThemeSelector() {
    const themeButtons = document.querySelectorAll('.theme-btn');
    
    themeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const theme = this.dataset.theme;
            
            themeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            changeTheme(theme, true);
            
            if (window.Animations && typeof window.Animations.changeTheme === 'function') {
                window.Animations.changeTheme(theme);
            }
        });
    });
}

function changeTheme(themeName, shouldSave = true) {
    if (!themes[themeName]) return;
    
    currentTheme = themeName;
    const theme = themes[themeName];
    
    document.body.className = '';
    document.body.classList.add(`theme-${themeName}`);
    
    const root = document.documentElement;
    root.style.setProperty('--theme-bg', theme.colors.bg);
    root.style.setProperty('--theme-primary', theme.colors.primary);
    root.style.setProperty('--theme-secondary', theme.colors.secondary);
    root.style.setProperty('--theme-accent', theme.colors.accent);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary);
    
    if (shouldSave) {
        saveTheme(themeName);
    }
    
    if (window.Animations && typeof window.Animations.changeTheme === 'function') {
        window.Animations.changeTheme(themeName);
    }
    
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === themeName) {
            btn.classList.add('active');
        }
    });
    
    const themeCards = document.querySelectorAll('.theme-card');
    themeCards.forEach(card => {
        card.classList.remove('active');
        if (card.dataset.theme === themeName) {
            card.classList.add('active');
        }
    });
    
    console.log(`🎨 Tema alterado para: ${theme.name}`);
}

// ===== CONTADOR DE TEMPO =====
function initTimeCounter() {
    document.getElementById('startDateDisplay').textContent = START_DATE_DISPLAY;
    updateTimeCounter();
    setInterval(updateTimeCounter, 1000);
}

function updateTimeCounter() {
    const now = new Date();
    const diff = now - START_DATE;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const years = Math.floor(days / 365.25);
    const months = Math.floor((days % 365.25) / 30.44);
    const remainingDays = Math.floor(days % 30.44);
    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    
    document.getElementById('years').textContent = years.toString().padStart(2, '0');
    document.getElementById('months').textContent = months.toString().padStart(2, '0');
    document.getElementById('days').textContent = remainingDays.toString().padStart(2, '0');
    document.getElementById('hours').textContent = remainingHours.toString().padStart(2, '0');
    document.getElementById('minutes').textContent = remainingMinutes.toString().padStart(2, '0');
    document.getElementById('seconds').textContent = remainingSeconds.toString().padStart(2, '0');
}

// ===== PLAYER DE MÚSICA (VERSÃO CORRIGIDA) =====
const playlist = [
    {
        title: "Menina da Farmácia",
        artist: "Kevin Santos / Nossa Canção",
        src: "audio/menina-da-farmacia.mp3",
        album: "Nossa Trilha Sonora"
    },
    {
        title: "Menina da Farmácia 2",
        artist: "Kevin Santos / Nossa Canção",
        src: "audio/menina-da-farmacia-2.mp3",
        album: "Nossa Trilha Sonora"
    }
];

// ===== PLAYER DE MÚSICA - VERSÃO FINAL CORRIGIDA =====

let currentTrackIndex = 0;
let isPlaying = false;
let isShuffled = false;
let repeatMode = 0;

function initMusicPlayer() {
    console.log('🎵 Inicializando player de música...');
    
    const audio = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const repeatBtn = document.getElementById('repeatBtn');
    const progressBarFill = document.getElementById('progressBarFill');
    const progressBarBg = progressBarFill?.parentElement;
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    
    if (!audio) {
        console.error('❌ Elemento de áudio não encontrado!');
        return;
    }
    
    console.log('✅ Elemento de áudio encontrado');
    
    audio.preload = 'metadata';
    audio.volume = 0.8;
    
    // Carregar primeira faixa
    loadTrack(currentTrackIndex);
    
    // ===== EVENT LISTENERS DOS BOTÕES =====
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', () => handlePrevTrack(audio));
    nextBtn.addEventListener('click', nextTrack);
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);
    
    // Click na barra de progresso
    if (progressBarBg) {
        progressBarBg.addEventListener('click', function(e) {
            if (audio.duration && !isNaN(audio.duration)) {
                const rect = this.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                audio.currentTime = audio.duration * percent;
                console.log('⏩ Pulando para:', formatTime(audio.currentTime));
            }
        });
    }
    
    // ===== EVENTOS DO ÁUDIO =====
    audio.addEventListener('timeupdate', function() {
        if (!progressBarFill || !currentTimeEl || !totalTimeEl) return;
        
        const hasDuration = audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0;
        
        if (hasDuration) {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressBarFill.style.width = `${progress}%`;
            currentTimeEl.textContent = formatTime(audio.currentTime);
            
            if (totalTimeEl.textContent === '0:00' || totalTimeEl.textContent === '') {
                totalTimeEl.textContent = formatTime(audio.duration);
            }
        } else {
            progressBarFill.style.width = '0%';
            currentTimeEl.textContent = '0:00';
        }
    });
    
    audio.addEventListener('loadedmetadata', function() {
        console.log('✅ Metadados carregados - Duração:', formatTime(audio.duration));
        if (totalTimeEl && audio.duration && !isNaN(audio.duration)) {
            totalTimeEl.textContent = formatTime(audio.duration);
        }
    });
    
    audio.addEventListener('loadeddata', function() {
        console.log('✅ Dados de áudio carregados');
        if (totalTimeEl && audio.duration && !isNaN(audio.duration)) {
            totalTimeEl.textContent = formatTime(audio.duration);
        }
    });
    
    audio.addEventListener('canplay', function() {
        console.log('✅ Áudio pronto para reprodução');
        if (totalTimeEl && audio.duration && !isNaN(audio.duration)) {
            totalTimeEl.textContent = formatTime(audio.duration);
        }
    });
    
    audio.addEventListener('ended', handleTrackEnd);
    
    audio.addEventListener('play', () => {
        document.querySelector('.music-player')?.classList.add('playing');
        console.log('▶️ Reproduzindo');
    });
    
    audio.addEventListener('pause', () => {
        document.querySelector('.music-player')?.classList.remove('playing');
        console.log('⏸️ Pausado');
    });
    
    audio.addEventListener('error', (e) => {
        console.error('❌ Erro no áudio:', e);
    });
    
    setTimeout(() => {
        console.log('📊 Estado do áudio:', {
            readyState: audio.readyState,
            duration: audio.duration,
            src: audio.src
        });
        
        if (audio.readyState >= 1 && totalTimeEl && audio.duration && !isNaN(audio.duration)) {
            totalTimeEl.textContent = formatTime(audio.duration);
        }
    }, 500);
    
    console.log('✅ Player de música inicializado com sucesso!');
}

// ===== VARIÁVEIS DE CONTROLE =====
let isLoadingTrack = false; // ← ADICIONAR NO TOPO DO ARQUIVO
let loadTrackTimeout = null; // ← ADICIONAR NO TOPO DO ARQUIVO

// ===== FUNÇÃO loadTrack - VERSÃO PROTEGIDA =====
function loadTrack(index) {
    // ✅ PROTEÇÃO CONTRA CLIQUES RÁPIDOS
    if (isLoadingTrack) {
        console.log('⏳ Aguarde o áudio carregar...');
        return;
    }
    
    const track = playlist[index];
    const audio = document.getElementById('audioPlayer');
    
    if (!audio) return;
    
    isLoadingTrack = true;
    
    // Limpar timeout anterior se existir
    if (loadTrackTimeout) {
        clearTimeout(loadTrackTimeout);
    }
    
    console.log(`🎵 Carregando faixa ${index + 1}: ${track.title}`);
    
    // Resetar UI
    const progressBarFill = document.getElementById('progressBarFill');
    const currentTime = document.getElementById('currentTime');
    const totalTime = document.getElementById('totalTime');
    
    if (progressBarFill) progressBarFill.style.width = '0%';
    if (currentTime) currentTime.textContent = '0:00';
    if (totalTime) totalTime.textContent = '0:00';
    
    // Atualizar informações
    document.getElementById('songTitle').textContent = track.title;
    document.getElementById('songArtist').textContent = track.artist;
    document.getElementById('currentTrack').textContent = index + 1;
    document.getElementById('totalTracks').textContent = playlist.length;
    
    // Parar áudio atual ANTES de carregar novo
    audio.pause();
    audio.currentTime = 0;
    
    // ✅ AGUARDAR UM POUCO ANTES DE CARREGAR NOVO ÁUDIO
    loadTrackTimeout = setTimeout(() => {
        audio.src = track.src;
        audio.load();
        
// Tentar tocar se estava tocando
if (isPlaying) {
    // 🎯 NOTIFICAR AUDIOMANAGER
    if (typeof AudioManager !== 'undefined') {
        AudioManager.play(audio, 'original-player');
    }
    
    audio.play()
        .then(() => {
            isLoadingTrack = false;
            console.log(`✅ Faixa ${track.title} carregada e tocando`);
        })
        .catch(err => {
            console.warn('⚠️ Erro ao tocar:', err.message);
            isLoadingTrack = false;
        });
} else {
    isLoadingTrack = false;
    console.log(`✅ Faixa ${track.title} carregada`);
}
    }, 100); // ← Aguarda 100ms antes de carregar
}

function togglePlayPause() {
    const audio = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    
    if (audio.paused) {
        // 🎯 NOTIFICAR AUDIOMANAGER ANTES DE TOCAR
        if (typeof AudioManager !== 'undefined') {
            AudioManager.play(audio, 'original-player');
        }
        
        audio.play().then(() => {
            isPlaying = true;
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            console.log('▶️ Play');
        }).catch(err => {
            console.error('❌ Erro ao tocar:', err);
        });
    } else {
        audio.pause();
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        console.log('⏸️ Pause');
    }
}

function handlePrevTrack(audio) {

    if (isLoadingTrack) return;

    if (audio.currentTime > 3) {
        audio.currentTime = 0;
    } else {
        if (isShuffled) {
            let randomIndex;
            do {
                randomIndex = Math.floor(Math.random() * playlist.length);
            } while (randomIndex === currentTrackIndex && playlist.length > 1);
            currentTrackIndex = randomIndex;
        } else {
            currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        }
        
        loadTrack(currentTrackIndex);
        if (isPlaying) {
            setTimeout(() => audio.play(), 100);
        }
    }
}

function nextTrack() {

    if (isLoadingTrack) return;

    if (isShuffled) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * playlist.length);
        } while (randomIndex === currentTrackIndex && playlist.length > 1);
        currentTrackIndex = randomIndex;
    } else {
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    }
    
    loadTrack(currentTrackIndex);
    if (isPlaying) {
        document.getElementById('audioPlayer').play();
    }
}

function toggleShuffle() {
    const shuffleBtn = document.getElementById('shuffleBtn');
    isShuffled = !isShuffled;
    
    shuffleBtn.classList.toggle('active', isShuffled);
    console.log(isShuffled ? '🔀 Shuffle ativado' : '➡️ Shuffle desativado');
}

function toggleRepeat() {
    const repeatBtn = document.getElementById('repeatBtn');
    repeatMode = (repeatMode + 1) % 2;
    
    repeatBtn.classList.toggle('active', repeatMode === 1);
    
    if (repeatMode === 0) {
        repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
        console.log('🔁 Repeat desativado');
    } else {
        repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
        console.log('🔂 Repeat uma música');
    }
}

function handleTrackEnd() {
    if (repeatMode === 1) {
        document.getElementById('audioPlayer').currentTime = 0;
        document.getElementById('audioPlayer').play();
    } else {
        nextTrack();
        if (isPlaying) {
            document.getElementById('audioPlayer').play();
        }
    }
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ===== ÁLBUNS DE FOTOS =====
window.albums = [
    {
        id: 1,
        title: "Primeiros Encontros",
        date: "Junho 2023",
        cover: "images/capas-albuns/primeiro-encontro.jpg",
        description: "Os primeiros momentos mágicos que deram início à nossa história.",
        photos: [
            { src: "images/fotos/album1/1.jpg", description: "Nosso primeiro café juntos" },
            { src: "images/fotos/album1/2.jpg", description: "Passeio no parque" },
            { src: "images/fotos/album1/3.jpg", description: "Primeiro cinema" },
            { src: "images/fotos/album1/4.jpg", description: "Jantar especial" }
        ]
    },
    {
        id: 2,
        title: "Viagem Inesquecível",
        date: "Dezembro 2023",
        cover: "images/capas-albuns/viagem.jpg",
        description: "Nossa primeira viagem juntos, cheia de aventuras e momentos especiais.",
        photos: [
            { src: "images/fotos/album2/1.jpg", description: "Chegada ao destino" },
            { src: "images/fotos/album2/2.jpg", description: "Paisagem deslumbrante" },
            { src: "images/fotos/album2/3.jpg", description: "Aventuras pela cidade" },
            { src: "images/fotos/album2/4.jpg", description: "Comidas típicas" }
        ]
    }
];

window.albums.forEach(album => {
    album.photoCount = album.photos.length;
});

let currentAlbum = null;
let currentPhotoIndex = 0;
const preloadCache = new Map();

let zoomLevel = 1;
let isDragging = false;
let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;
let tapStartX = 0;
let tapStartY = 0;
let tapStartTime = 0;
let isTapping = false;
let tapTimeout = null;
const TAP_THRESHOLD = 10;
const TAP_DURATION = 300;
const TAP_DELAY = 250;

let lastTouchTime = 0;
let touchStartTime = 0;
let touchEndX = 0;
let lastGestureTime = Date.now();
let isPinching = false;
let initialPinchDistance = 0;
let lastPinchDistance = 0;
let blockNavigation = false;
let doubleTapTimeout = null;
let touchCount = 0;

function getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function resetZoom() {
    const modalPhoto = document.getElementById('modalPhoto');
    
    if (modalPhoto) {
        modalPhoto.classList.add('zoom-transition');
    }
    
    zoomLevel = 1;
    translateX = 0;
    translateY = 0;
    isDragging = false;
    isPinching = false;
    blockNavigation = false;
    updateImageTransform();
    
    setTimeout(() => {
        if (modalPhoto) {
            modalPhoto.classList.remove('zoom-transition');
        }
    }, 300);
    
    lastGestureTime = Date.now();
}

function updateImageTransform() {
    const modalPhoto = document.getElementById('modalPhoto');
    if (!modalPhoto) return;
    
    modalPhoto.classList.remove('slide-out-left', 'slide-out-right', 'slide-in-left', 'slide-in-right', 'active');
    
    modalPhoto.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoomLevel})`;
    modalPhoto.style.cursor = zoomLevel > 1 ? 'grab' : 'pointer';
}

function handleZoom(delta, centerX, centerY) {
    const oldZoom = zoomLevel;
    
    if (delta > 0) {
        zoomLevel = Math.min(zoomLevel * 1.05, 4);
    } else {
        zoomLevel = Math.max(zoomLevel * 0.95, 1);
    }
    
    if (zoomLevel === 1) {
        translateX = 0;
        translateY = 0;
        isDragging = false;
    } else if (centerX !== undefined && centerY !== undefined) {
        const modalPhoto = document.getElementById('modalPhoto');
        const rect = modalPhoto.getBoundingClientRect();
        
        const offsetX = centerX - rect.left - rect.width / 2;
        const offsetY = centerY - rect.top - rect.height / 2;
        
        const zoomRatio = zoomLevel / oldZoom - 1;
        translateX -= offsetX * zoomRatio;
        translateY -= offsetY * zoomRatio;
    }
    
    updateImageTransform();
}

function handleDoubleTap(x, y) {
    console.log('🔍 Duplo toque/clique detectado! Zoom atual:', zoomLevel);

    isTapping = false;
    blockNavigation = true;
    
    const modalPhoto = document.getElementById('modalPhoto');
    if (!modalPhoto) return;
    
    if (zoomLevel === 1) {
        zoomLevel = 2;
        
        const rect = modalPhoto.getBoundingClientRect();
        const offsetX = x - rect.left - rect.width / 2;
        const offsetY = y - rect.top - rect.height / 2;
        
        translateX = -offsetX * (zoomLevel - 1);
        translateY = -offsetY * (zoomLevel - 1);
        
        updateImageTransform();
        blockNavigation = true;
        console.log('✅ Zoom IN aplicado');
    } else {
        resetZoom();
        console.log('✅ Zoom OUT aplicado');
    }
    
    setTimeout(() => {
        if (zoomLevel === 1) {
            blockNavigation = false;
        }
    }, 150);
}

function initModal() {
    const modal = document.getElementById('albumModal');
    const closeBtn = document.getElementById('closeModal');
    const prevBtn = document.getElementById('prevPhotoBtn');
    const nextBtn = document.getElementById('nextPhotoBtn');
    const albumViewer = document.querySelector('.album-viewer');
    const modalPhoto = document.getElementById('modalPhoto');
    
    if (!modal || !closeBtn || !prevBtn || !nextBtn || !albumViewer || !modalPhoto) {
        console.warn('⚠️ Elementos do modal não encontrados');
        return;
    }
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        resetZoom();
    });
    
    prevBtn.addEventListener('click', () => {
        if (zoomLevel > 1) return;
        
        if (currentAlbum) {
            currentPhotoIndex = (currentPhotoIndex - 1 + currentAlbum.photos.length) % currentAlbum.photos.length;
            updateAlbumViewer();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (zoomLevel > 1) return;
        
        if (currentAlbum) {
            currentPhotoIndex = (currentPhotoIndex + 1) % currentAlbum.photos.length;
            updateAlbumViewer();
        }
    });
    
    modalPhoto.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleDoubleTap(e.clientX, e.clientY);
    });
    
    albumViewer.addEventListener('wheel', (e) => {
        e.preventDefault();
        handleZoom(-e.deltaY, e.clientX, e.clientY);
    }, { passive: false });
    
    let touchStart = {};
    
    albumViewer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const now = Date.now();
        const touches = e.touches;
        
        if (tapTimeout) {
            clearTimeout(tapTimeout);
            tapTimeout = null;
        }
        
        if (touches.length === 1 && zoomLevel === 1) {
            isTapping = true;
            tapStartX = touches[0].clientX;
            tapStartY = touches[0].clientY;
            tapStartTime = now;
        }
        
        for (let i = 0; i < touches.length; i++) {
            touchStart[i] = {
                x: touches[i].clientX,
                y: touches[i].clientY
            };
        }
        
        touchCount = touches.length;
        
        if (touches.length === 2) {
            console.log('🔍 Pinch detectado (2 dedos)');
            isPinching = true;
            isTapping = false;
            initialPinchDistance = getTouchDistance(touches[0], touches[1]);
            lastPinchDistance = initialPinchDistance;
            
            if (doubleTapTimeout) {
                clearTimeout(doubleTapTimeout);
                doubleTapTimeout = null;
            }
            return;
        }
        
        if (touches.length === 1) {
            const touch = touches[0];
            const timeSinceLastTouch = now - lastTouchTime;
            
            if (timeSinceLastTouch < 300 && timeSinceLastTouch > 0) {
                console.log('👆👆 Duplo toque detectado');
                isTapping = false;
                if (tapTimeout) {
                    clearTimeout(tapTimeout);
                    tapTimeout = null;
                    console.log('❌ Tap pendente cancelado pelo duplo toque');
                }
                
                blockNavigation = true;
                handleDoubleTap(touch.clientX, touch.clientY);
                
                setTimeout(() => {
                    blockNavigation = false;
                }, 100);
                
                lastTouchTime = 0;
                return;
            }
            
            if (zoomLevel > 1) {
                isTapping = false;
                isDragging = true;
                startX = touch.clientX - translateX;
                startY = touch.clientY - translateY;
                modalPhoto.style.cursor = 'grabbing';
            }
            
            lastTouchTime = now;
        }
    }, { passive: false });
    
    albumViewer.addEventListener('touchmove', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const touches = e.touches;
        lastGestureTime = Date.now();

        if (isTapping && touches.length === 1) {
            const moveX = Math.abs(touches[0].clientX - tapStartX);
            const moveY = Math.abs(touches[0].clientY - tapStartY);
            
            if (moveX > TAP_THRESHOLD || moveY > TAP_THRESHOLD) {
                isTapping = false;
                
                if (tapTimeout) {
                    clearTimeout(tapTimeout);
                    tapTimeout = null;
                }
                
                console.log('❌ Tap cancelado - movimento detectado');
            }
        }
        
        if (touches.length === 2 && isPinching) {
            blockNavigation = true;
            isTapping = false;
            
            const currentDistance = getTouchDistance(touches[0], touches[1]);
            const delta = currentDistance - lastPinchDistance;
            
            const centerX = (touches[0].clientX + touches[1].clientX) / 2;
            const centerY = (touches[0].clientY + touches[1].clientY) / 2;
            
            const zoomFactor = 0.01;
            if (delta !== 0) {
                const oldZoom = zoomLevel;
                
                if (delta > 0) {
                    zoomLevel = Math.min(zoomLevel * (1 + delta * zoomFactor), 4);
                } else {
                    zoomLevel = Math.max(zoomLevel / (1 - delta * zoomFactor), 1);
                }
                
                const zoomChange = zoomLevel / oldZoom;
                const rect = modalPhoto.getBoundingClientRect();
                const offsetX = centerX - rect.left - rect.width / 2;
                const offsetY = centerY - rect.top - rect.height / 2;
                
                translateX = translateX * zoomChange - offsetX * (zoomChange - 1);
                translateY = translateY * zoomChange - offsetY * (zoomChange - 1);
                
                updateImageTransform();
            }
            
            lastPinchDistance = currentDistance;
        }
        
        else if (touches.length === 1 && isDragging && zoomLevel > 1) {
            blockNavigation = true;
            isTapping = false;
            
            const touch = touches[0];
            translateX = touch.clientX - startX;
            translateY = touch.clientY - startY;
            updateImageTransform();
        }
    }, { passive: false });
    
    albumViewer.addEventListener('touchend', (e) => {
        const touches = e.touches;
        const changedTouch = e.changedTouches[0];
        
        if (isTapping && touches.length === 0 && zoomLevel === 1 && !blockNavigation) {
            const tapDuration = Date.now() - tapStartTime;
            const moveX = Math.abs(changedTouch.clientX - tapStartX);
            const moveY = Math.abs(changedTouch.clientY - tapStartY);
            
            if (tapDuration < TAP_DURATION && 
                moveX < TAP_THRESHOLD && 
                moveY < TAP_THRESHOLD) {
                
                if (tapTimeout) {
                    clearTimeout(tapTimeout);
                }
                
                const savedTapX = tapStartX;
                
                tapTimeout = setTimeout(() => {
                    if (zoomLevel === 1 && !blockNavigation && !isPinching && !isDragging) {
                        console.log('✅ Tap confirmado após delay');
                        handleTapNavigation(savedTapX);
                    } else {
                        console.log('❌ Tap cancelado - condições mudaram');
                    }
                    tapTimeout = null;
                }, TAP_DELAY);
                
                console.log('⏳ Aguardando confirmação do tap...');
            }
            
            isTapping = false;
        }
        
        if (touches.length === 0) {
            if (isPinching) {
                console.log('✅ Pinch finalizado');
                isPinching = false;
                
                if (zoomLevel > 1) {
                    blockNavigation = true;
                    setTimeout(() => {
                        blockNavigation = false;
                        console.log('🔓 Navegação liberada após pinch');
                    }, 300);
                }
            }
            
            if (isDragging) {
                console.log('✅ Drag finalizado');
                isDragging = false;
                modalPhoto.style.cursor = zoomLevel > 1 ? 'grab' : 'pointer';
                
                if (zoomLevel > 1) {
                    blockNavigation = true;
                }
            }
            
            if (!isPinching && !isDragging && zoomLevel === 1) {
                blockNavigation = false;
            }
            
            touchCount = 0;
        }
        
        else if (touches.length === 1 && isPinching) {
            console.log('🔄 Transição: pinch → drag');
            isPinching = false;
            isDragging = true;
            isTapping = false;
            
            const touch = touches[0];
            startX = touch.clientX - translateX;
            startY = touch.clientY - translateY;
            modalPhoto.style.cursor = 'grabbing';
        }
    });
    
    let swipeStartX = 0;
    let swipeStartTime = 0;
    
    modal.addEventListener('touchstart', (e) => {
        if (touchCount === 0 && !isPinching && !isDragging && zoomLevel === 1) {
            swipeStartX = e.changedTouches[0].screenX;
            swipeStartTime = Date.now();
        }
    }, { passive: true });
    
    modal.addEventListener('touchend', (e) => {
        if (!isPinching && !isDragging && !blockNavigation && zoomLevel === 1) {
            const swipeEndX = e.changedTouches[0].screenX;
            const touchDuration = Date.now() - swipeStartTime;
            
            if (touchDuration < 300) {
                handleSwipe(swipeStartX, swipeEndX);
            }
        }
    }, { passive: true });
    
    function handleSwipe(startX, endX) {
        if (blockNavigation || zoomLevel > 1 || isPinching || isDragging) {
            console.log('🚫 Swipe bloqueado');
            return;
        }
        
        const swipeThreshold = 50;
        const diff = startX - endX;
        
        if (Math.abs(diff) > swipeThreshold) {
            console.log('✅ Swipe detectado - navegando');
            if (diff > 0) {
                nextBtn.click();
            } else {
                prevBtn.click();
            }
        }
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeBtn.click();
        }
    });
    
    document.addEventListener('keydown', (event) => {
        if (modal.style.display === 'flex') {
            if (event.key === 'Escape') {
                closeBtn.click();
            } else if (event.key === 'ArrowLeft') {
                prevBtn.click();
            } else if (event.key === 'ArrowRight') {
                nextBtn.click();
            }
        }
    });
    
    console.log('✅ Modal inicializado com gestos separados');
}

function handleTapNavigation(tapX) {
    if (blockNavigation || zoomLevel > 1 || isPinching || isDragging) {
        console.log('🚫 Tap navigation bloqueada');
        return;
    }
    
    const screenWidth = window.innerWidth;
    const middlePoint = screenWidth / 2;
    
    if (tapX < middlePoint) {
        console.log('👈 Tap esquerda: foto anterior');
        const prevBtn = document.getElementById('prevPhotoBtn');
        if (prevBtn) {
            prevBtn.click();
        }
    } else {
        console.log('👉 Tap direita: próxima foto');
        const nextBtn = document.getElementById('nextPhotoBtn');
        if (nextBtn) {
            nextBtn.click();
        }
    }
}

function initAlbums() {
    const container = document.getElementById('albumsContainer');
    
    if (!container) {
        console.warn('⚠️ Container de álbuns não encontrado');
        return;
    }
    
    container.innerHTML = '';
    
    window.albums.forEach(album => {
        const albumCard = document.createElement('div');
        albumCard.className = 'album-card';
        albumCard.dataset.id = album.id;
        
        albumCard.innerHTML = `
            <img src="${album.cover}" alt="${album.title}" class="album-cover-img">
            <div class="album-info">
                <h3>${album.title}</h3>
                <p class="album-date">
                    <i class="far fa-calendar-alt"></i> ${album.date}
                </p>
                <p>${album.description}</p>
                <div class="album-stats">
                    <span>
                        <i class="far fa-images"></i> ${album.photoCount} ${album.photoCount === 1 ? 'foto' : 'fotos'}
                    </span>
                </div>
            </div>
        `;
        
        albumCard.addEventListener('click', () => openAlbum(album.id));
        container.appendChild(albumCard);
    });
    
    console.log(`✅ ${albums.length} álbuns carregados`);
}

function openAlbum(albumId) {
    currentAlbum = window.albums.find(a => a.id === albumId);
    if (!currentAlbum) {
        console.warn('⚠️ Álbum não encontrado:', albumId);
        return;
    }
    
    if (!currentAlbum.photos || currentAlbum.photos.length === 0) {
        alert('📷 Este álbum ainda não possui fotos!');
        return;
    }
    
    currentPhotoIndex = 0;
    updateAlbumViewer();
    
    const modal = document.getElementById('albumModal');
    if (modal) {
        modal.style.display = 'flex';
        HistoryManager.push('album-modal');
    }
    
    const titleElement = document.getElementById('modalAlbumTitle');
    if (titleElement) {
        titleElement.textContent = currentAlbum.title;
    }
    
    console.log(`📸 Álbum aberto: ${currentAlbum.title}`);
}

let lastPhotoIndex = 0;

function updateAlbumViewer() {
    if (!currentAlbum) return;
    
    const photo = currentAlbum.photos[currentPhotoIndex];
    const modalPhoto = document.getElementById('modalPhoto');
    
    if (!modalPhoto) return;
    
    if (zoomLevel > 1) {
        resetZoom();
        setTimeout(() => {
            changePhoto();
        }, 100);
    } else {
        changePhoto();
    }
    
    function changePhoto() {
        modalPhoto.classList.remove('slide-out-left', 'slide-out-right', 'slide-in-left', 'slide-in-right', 'active');
        
        modalPhoto.src = photo.src;
        modalPhoto.alt = `Foto ${currentPhotoIndex + 1}`;
        
        preloadAdjacentPhotos();
        
        lastPhotoIndex = currentPhotoIndex;
        
        document.getElementById('currentPhoto').textContent = currentPhotoIndex + 1;
        document.getElementById('totalPhotos').textContent = currentAlbum.photos.length;
        updateProgressBar();
    }
}

function updateProgressBar() {
    const progressBar = document.getElementById('photoProgressBar');
    if (!progressBar || !currentAlbum) return;
    
    progressBar.innerHTML = '';
    
    for (let i = 0; i < currentAlbum.photos.length; i++) {
        const segment = document.createElement('div');
        segment.className = 'progress-segment';
        
        if (i < currentPhotoIndex) {
            segment.classList.add('passed');
        } else if (i === currentPhotoIndex) {
            segment.classList.add('active');
        }
        
        progressBar.appendChild(segment);
    }
}

function preloadAdjacentPhotos() {
    if (!currentAlbum || !currentAlbum.photos) return;
    
    const total = currentAlbum.photos.length;
    
    const prevIndex = (currentPhotoIndex - 1 + total) % total;
    const nextIndex = (currentPhotoIndex + 1) % total;
    const next2Index = (currentPhotoIndex + 2) % total;
    
    [prevIndex, nextIndex, next2Index].forEach(index => {
        const src = currentAlbum.photos[index].src;
        
        if (!preloadCache.has(src)) {
            const img = new Image();
            img.src = src;
            preloadCache.set(src, img);
            
            console.log(`📥 Pré-carregada: foto ${index + 1}`);
        }
    });
    
    if (preloadCache.size > 5) {
        const firstKey = preloadCache.keys().next().value;
        preloadCache.delete(firstKey);
    }
}

// ===== MENSAGENS DO DIA =====
const messages = [
    {
        text: "Cada dia ao seu lado é uma página nova em nosso livro de amor, escrita com sorrisos, carinho e cumplicidade.",
        author: "Kevin para Iara"
    },
    {
        text: "Se eu pudesse escolher novamente entre todas as pessoas do mundo, escolheria você, sempre você.",
        author: "Kevin para Iara"
    },
    {
        text: "Nos seus olhos encontro meu lugar favorito no mundo, onde posso ser apenas eu e saber que sou amado.",
        author: "Kevin para Iara"
    },
    {
        text: "O amor que sinto por você não cabe em palavras, mas transborda em cada gesto, cada olhar, cada momento juntos.",
        author: "Kevin para Iara"
    }
];

let currentMessageIndex = 0;

function initMessages() {
    showMessage();
    
    const newMessageBtn = document.getElementById('newMessageBtn');
    if (newMessageBtn) {
        newMessageBtn.addEventListener('click', showNextMessage);
    }
}

function showMessage() {
    const message = messages[currentMessageIndex];
    
    const messageElement = document.getElementById('dailyMessage');
    if (messageElement) {
        messageElement.innerHTML = `
            <p class="message-text">"${message.text}"</p>
            <p class="message-author">— ${message.author}</p>
        `;
        
        messageElement.style.opacity = '0';
        setTimeout(() => {
            messageElement.style.transition = 'opacity 0.3s ease';
            messageElement.style.opacity = '1';
        }, 10);
    }
    
    console.log(`💌 Mensagem ${currentMessageIndex + 1}/${messages.length} exibida`);
}

function showNextMessage() {
    currentMessageIndex = (currentMessageIndex + 1) % messages.length;
    showMessage();
}

function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    const dateString = now.toLocaleDateString('pt-BR', options);
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = `Hoje é ${dateString}`;
    }
}

function initTimelineModal() {
    const openBtn = document.getElementById('openTimelineBtn');
    const closeBtn = document.getElementById('closeTimelineBtn');
    const modal = document.getElementById('timelineModal');
    const secretModal = document.getElementById('secretModal');
    const closeSecretBtn = document.getElementById('closeSecretBtn');
    const secretMessageBtns = document.querySelectorAll('.secret-message-btn');
    
    if (!openBtn || !modal) {
        console.warn('⚠️ Elementos da timeline não encontrados');
        return;
    }
    
    openBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        HistoryManager.push('timeline-modal');
        console.log('📖 Timeline aberta');
    });
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        console.log('📖 Timeline fechada');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeBtn.click();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (secretModal.style.display === 'flex') {
                closeSecretBtn.click();
            } else if (modal.style.display === 'block') {
                closeBtn.click();
            }
        }
    });
    
    secretMessageBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const message = btn.getAttribute('data-message');
            
            if (message) {
                showSecretMessage(message);
            }
        });
    });
    
    closeSecretBtn.addEventListener('click', () => {
        secretModal.style.display = 'none';
    });
    
    secretModal.addEventListener('click', (e) => {
        if (e.target === secretModal) {
            closeSecretBtn.click();
        }
    });

    updateTimelineProgress();
    
    console.log('✅ Timeline modal inicializada');
    console.log(`🔒 ${secretMessageBtns.length} mensagens secretas encontradas`);
}

function showSecretMessage(message) {
    const secretModal = document.getElementById('secretModal');
    const secretMessageText = document.getElementById('secretMessageText');
    
    if (secretModal && secretMessageText) {
        secretMessageText.textContent = message;
        secretModal.style.display = 'flex';
        HistoryManager.push('secret-modal');
        
        console.log('🔓 Mensagem secreta revelada');
    }
}

function updateTimelineProgress() {
    const timelineScroll = document.querySelector('.timeline-scroll');
    const timelineContainer = document.querySelector('.timeline-container');
    
    if (!timelineScroll || !timelineContainer) return;
    
    timelineScroll.addEventListener('scroll', () => {
        const scrollTop = timelineScroll.scrollTop;
        const scrollHeight = timelineScroll.scrollHeight - timelineScroll.clientHeight;
        const scrollPercent = (scrollTop / scrollHeight) * 100;
        
        timelineContainer.style.setProperty('--progress-height', `${scrollPercent}%`);
    });
}

function initHamburgerMenu() {
    console.log('🍔 Inicializando menu hambúrguer premium...');
    
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const menuLinks = document.querySelectorAll('.menu-nav a');
    const themeCards = document.querySelectorAll('.theme-card');
    const adminMenuBtn = document.getElementById('adminMenuBtn');
    const menuCloseBtn = document.querySelector('.menu-close-btn');

    if (menuCloseBtn) {
        menuCloseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMenu();
        });
    }

    if (!hamburgerBtn || !sideMenu || !menuOverlay) {
        console.error('❌ Elementos do menu não encontrados!');
        return false;
    }

    console.log('✅ Elementos do menu encontrados');

    function closeMenu() {
        hamburgerBtn.classList.remove('active');
        sideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
        console.log('🔒 Menu fechado');
    }

    function openMenu() {
        hamburgerBtn.classList.add('active');
        sideMenu.classList.add('active');
        menuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        HistoryManager.push('hamburger-menu');
        console.log('🔓 Menu aberto');
    }

    function toggleMenu() {
        const isActive = sideMenu.classList.contains('active');
        if (isActive) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    hamburgerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
    });

    menuOverlay.addEventListener('click', (e) => {
        e.preventDefault();
        closeMenu();
    });

    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            console.log('🔗 Navegação:', targetId);
            
            closeMenu();
            
            setTimeout(() => {
                if (targetId === '#home') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } 
                else if (targetId === '#contador') {
                    const counterSection = document.querySelector('.time-counter-section');
                    if (counterSection) {
                        counterSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
                else if (targetId === '#musicas') {
                    const musicSection = document.querySelector('.music-player-section');
                    if (musicSection) {
                        musicSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
                else if (targetId === '#albuns') {
                    const albumsSection = document.querySelector('.albums-section');
                    if (albumsSection) {
                        albumsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
                else if (targetId === '#mensagens') {
                    const messagesSection = document.querySelector('.messages-section');
                    if (messagesSection) {
                        messagesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }, 300);
        });
    });

    themeCards.forEach(card => {
        card.addEventListener('click', () => {
            const theme = card.dataset.theme;
            console.log('🎨 Tema selecionado:', theme);
            
            themeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            if (typeof changeTheme === 'function') {
                changeTheme(theme, true);
            }
            
            closeMenu();
        });
    });

    const savedTheme = localStorage.getItem('kevinIaraTheme') || 'meteors';
    themeCards.forEach(card => {
        if (card.dataset.theme === savedTheme) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });

    let isAdminUnlocked = false;

    if (adminMenuBtn) {
        adminMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔐 Botão admin clicado');
            
            if (!isAdminUnlocked) {
                const password = prompt('🔐 Digite a senha de admin:');
                
                if (password === 'iara2023') {
                    isAdminUnlocked = true;
                    adminMenuBtn.classList.add('unlocked');
                    adminMenuBtn.innerHTML = '<i class="fas fa-lock-open"></i><span>Admin</span>';
                    
                    closeMenu();
                    
                    setTimeout(() => {
                        const adminModal = document.getElementById('adminModal');
                        const adminToggleBtn = document.getElementById('adminToggleBtn');
                        
                        if (adminModal) {
                            if (adminToggleBtn) {
                                adminToggleBtn.classList.add('unlocked');
                                adminToggleBtn.innerHTML = '<i class="fas fa-lock-open"></i>';
                            }
                            
                            adminModal.style.display = 'block';
                            document.body.style.overflow = 'hidden';
                            HistoryManager.push('admin-modal'); // ← ADICIONAR ESTA LINHA
                            
                            if (typeof loadExistingContent === 'function') {
                                loadExistingContent();
                            }
                        }
                        
                        console.log('✅ Admin desbloqueado');
                    }, 300);
                } else if (password !== null) {
                    alert('❌ Senha incorreta!');
                }
            } else {
                closeMenu();
                
            setTimeout(() => {
                const adminModal = document.getElementById('adminModal');
                if (adminModal) {
                    // ← LIMPAR O ESTADO DO MENU ANTES
                    HistoryManager.remove('hamburger-menu');
                    
                    adminModal.style.display = 'block';
                    document.body.style.overflow = 'hidden';
                    HistoryManager.push('admin-modal'); // ← ADICIONAR ESTA LINHA
                    
                    if (typeof loadExistingContent === 'function') {
                        loadExistingContent();
                    }
                }
            }, 300);
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sideMenu.classList.contains('active')) {
            closeMenu();
        }
    });

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style') {
                const target = mutation.target;
                
                if (target.style.display === 'flex' || target.style.display === 'block') {
                    if (sideMenu.classList.contains('active')) {
                        closeMenu();
                        console.log('🔒 Menu fechado automaticamente (modal aberto)');
                    }
                }
            }
        });
    });

    const modals = [
        document.getElementById('albumModal'),
        document.getElementById('timelineModal'),
        document.getElementById('secretModal'),
        document.getElementById('adminModal')
    ];

    modals.forEach(modal => {
        if (modal) {
            observer.observe(modal, {
                attributes: true,
                attributeFilter: ['style']
            });
        }
    });

    console.log('✅ Menu hambúrguer premium inicializado!');
    console.log('✅ Auto-fechamento de menu configurado');
    return true;
}

console.log(`
╔══════════════════════════════════════╗
║   💖 SITE KEVIN & IARA INICIADO 💖   ║
╠══════════════════════════════════════╣
║   📱 Otimizado para Mobile          ║
║   🎵 Player corrigido                ║
║   📸 ${window.albums ? window.albums.length : 0} álbuns organizados        ║
║   🎨 ${Object.keys(themes).length} temas disponíveis            ║
║   💾 Tema persistente                ║
╚══════════════════════════════════════╝
`);