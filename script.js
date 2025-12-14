// ===== CONFIGURAÇÕES INICIAIS =====
document.addEventListener('DOMContentLoaded', function() {
    // Carregar tema salvo ANTES de inicializar tudo
    const savedTheme = loadSavedTheme();
    
    // Inicializar tudo
    initThemeMenu();
    initThemeSelector();
    initTimeCounter();
    initMusicPlayer();
    initAlbums();
    initMessages();
    initModal();
    updateCurrentDate();
    
    // Inicializar animação do Cruzeiro (agora só no tema cruzeiro)
    if (savedTheme === 'cruzeiro') {
        initCruzeiroAnimation();
    }
    
    console.log('💖 Site Kevin & Iara carregado com sucesso!');
    
    // Inicializar animações COM O TEMA CORRETO depois de um delay
    setTimeout(() => {
        if (typeof initAnimations === 'function') {
            initAnimations(savedTheme || 'meteors');
        }
    }, 500);
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
    },
    cruzeiro: {
        name: 'Cruzeiro Esporte Clube',
        colors: {
            bg: '#0a0a1a',
            primary: '#0a2845',
            secondary: '#4a90e2',
            accent: '#ffd700',
            text: '#ffffff',
            textSecondary: '#b8c7e0'
        }
    }
};

let currentTheme = 'meteors';

// ===== PERSISTÊNCIA DE TEMA =====
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
            currentTheme = savedTheme;
            changeTheme(savedTheme, false);
            
            setTimeout(() => {
                const themeButtons = document.querySelectorAll('.theme-btn');
                themeButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.theme === savedTheme) {
                        btn.classList.add('active');
                    }
                });
            }, 100);
            
            console.log(`✅ Tema "${themes[savedTheme].name}" carregado do navegador`);
            return savedTheme;
        } else {
            console.log('📌 Nenhum tema salvo encontrado, usando tema padrão');
            return 'meteors';
        }
    } catch (error) {
        console.warn('⚠️ Erro ao carregar tema salvo:', error);
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
            
            // Ativar animação do Cruzeiro se for o tema
            if (theme === 'cruzeiro') {
                initCruzeiroAnimation();
            }
            
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
    
    // Atualizar animação do Cruzeiro
    updateCruzeiroColors(themeName);
    
    // Salvar tema se solicitado
    if (shouldSave) {
        saveTheme(themeName);
    }
    
    // Mudar animação também
    if (window.Animations && typeof window.Animations.changeTheme === 'function') {
        window.Animations.changeTheme(themeName);
    }
    
    console.log(`🎨 Tema alterado para: ${theme.name}`);
}

// ===== CONTROLE DO MENU DE TEMA =====
function initThemeMenu() {
    const themeToggle = document.getElementById('themeToggle');
    const themeSelector = document.getElementById('themeSelector');
    
    if (!themeToggle || !themeSelector) {
        console.warn('⚠️ Elementos do menu de tema não encontrados');
        return;
    }
    
    themeToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        themeSelector.classList.toggle('hidden');
    });
    
    document.addEventListener('click', function(e) {
        if (!themeSelector.contains(e.target) && e.target !== themeToggle) {
            themeSelector.classList.add('hidden');
        }
    });
    
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(button => {
        button.addEventListener('click', function() {
            themeSelector.classList.add('hidden');
        });
    });
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

// ===== PLAYER DE MÚSICA =====
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

let currentTrackIndex = 0;
let isPlaying = false;  
let isShuffled = false;
let repeatMode = 0;

function initMusicPlayer() {
    const audio = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const repeatBtn = document.getElementById('repeatBtn');
    const progressBarFill = document.getElementById('progressBarFill');
    
    if (!audio) {
        console.warn('⚠️ Elemento de áudio não encontrado');
        return;
    }
    
    loadTrack(currentTrackIndex);
    
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', () => handlePrevTrack(audio));
    nextBtn.addEventListener('click', nextTrack);
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);
    
    progressBarFill.parentElement.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audio.currentTime = audio.duration * percent;
        updateProgressBar(audio);
    });
    
    audio.addEventListener('timeupdate', () => updateProgressBar(audio));
    audio.addEventListener('loadedmetadata', () => updateDuration(audio));
    audio.addEventListener('ended', handleTrackEnd);
    audio.addEventListener('play', () => {
        document.querySelector('.music-player')?.classList.add('playing');
    });
    audio.addEventListener('pause', () => {
        document.querySelector('.music-player')?.classList.remove('playing');
    });
    
    audio.volume = 0.8;
}

function handlePrevTrack(audio) {
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        updateProgressBar(audio);
    } else {
        if (isShuffled) {
            let randomIndex;
            do {
                randomIndex = Math.floor(Math.random() * playlist.length);
            } while (randomIndex === currentTrackIndex && playlist.length > 1);
            
            currentTrackIndex = randomIndex;
            console.log('🔀 Shuffle: tocando música anterior aleatória', currentTrackIndex + 1);
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
    if (isShuffled) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * playlist.length);
        } while (randomIndex === currentTrackIndex && playlist.length > 1);
        
        currentTrackIndex = randomIndex;
        console.log('🔀 Shuffle: tocando música', currentTrackIndex + 1);
    } else {
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    }
    
    loadTrack(currentTrackIndex);
    if (isPlaying) {
        document.getElementById('audioPlayer').play();
    }
}

function loadTrack(index) {
    const track = playlist[index];
    const audio = document.getElementById('audioPlayer');
    
    if (!audio) return;
    
    audio.src = track.src;
    document.getElementById('songTitle').textContent = track.title;
    document.getElementById('songArtist').textContent = track.artist;
    document.getElementById('currentTrack').textContent = index + 1;
    document.getElementById('totalTracks').textContent = playlist.length;
    
    document.getElementById('progressBarFill').style.width = '0%';
    document.getElementById('currentTime').textContent = '0:00';
    
    if (isPlaying) {
        setTimeout(() => audio.play(), 100);
    }
}

function togglePlayPause() {
    const audio = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    
    if (audio.paused) {
        audio.play();
        isPlaying = true;
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        audio.pause();
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

function toggleShuffle() {
    const shuffleBtn = document.getElementById('shuffleBtn');
    isShuffled = !isShuffled;
    
    shuffleBtn.classList.remove('active');
    shuffleBtn.style.color = '';
    
    if (isShuffled) {
        shuffleBtn.classList.add('active');
        console.log('🔀 Modo shuffle ATIVADO');
    } else {
        console.log('▶️ Modo shuffle DESATIVADO - ordem normal');
    }
}

function toggleRepeat() {
    const repeatBtn = document.getElementById('repeatBtn');
    repeatMode = (repeatMode + 1) % 2;
    
    repeatBtn.classList.remove('active');
    
    if (repeatMode === 0) {
        repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
        repeatBtn.title = "Repetir desligado";
        repeatBtn.style.color = '';
    } else {
        repeatBtn.classList.add('active');
        repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
        repeatBtn.title = "Repetir uma música";
        repeatBtn.style.color = '';
    }
}

function updateProgressBar(audio) {
    const progressBarFill = document.getElementById('progressBarFill');
    const currentTime = document.getElementById('currentTime');
    const totalTime = document.getElementById('totalTime');
    
    if (audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        progressBarFill.style.width = `${progress}%`;
        currentTime.textContent = formatTime(audio.currentTime);
        totalTime.textContent = formatTime(audio.duration);
    }
}

function updateDuration(audio) {
    const totalTime = document.getElementById('totalTime');
    totalTime.textContent = formatTime(audio.duration);
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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ===== ÁLBUNS DE FOTOS =====
const albums = [
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

// ===== ATUALIZAR AUTOMATICAMENTE O photoCount =====
albums.forEach(album => {
    album.photoCount = album.photos.length;
});

let currentAlbum = null;
let currentPhotoIndex = 0;

// ===== VARIÁVEIS DE CONTROLE DO ZOOM =====
let zoomLevel = 1;
let isDragging = false;
let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;

// Variáveis específicas para gestos mobile
let lastTouchTime = 0;
let touchStartTime = 0;
let touchStartX = 0;
let touchEndX = 0;
let lastGestureTime = Date.now();
let isPinching = false;
let initialPinchDistance = 0;
let lastPinchDistance = 0;
let blockNavigation = false;
let doubleTapTimeout = null;
let touchCount = 0;

// ===== FUNÇÕES AUXILIARES =====
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
}

// ===== FUNÇÃO ÚNICA E CORRETA initModal =====
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
    
    // ===== FUNÇÕES DE NAVEGAÇÃO =====
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        resetZoom();
    });
    
    prevBtn.addEventListener('click', () => {
        if (zoomLevel > 1) {
            console.log('🚫 Botão prev bloqueado - zoom ativo');
            return;
        }
        
        if (currentAlbum) {
            currentPhotoIndex = (currentPhotoIndex - 1 + currentAlbum.photos.length) % currentAlbum.photos.length;
            updateAlbumViewer();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (zoomLevel > 1) {
            console.log('🚫 Botão next bloqueado - zoom ativo');
            return;
        }
        
        if (currentAlbum) {
            currentPhotoIndex = (currentPhotoIndex + 1) % currentAlbum.photos.length;
            updateAlbumViewer();
        }
    });
    
    // ===== DUPLO CLIQUE (DESKTOP) =====
    modalPhoto.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleDoubleTap(e.clientX, e.clientY);
    });
    
    // ===== SCROLL DO MOUSE (DESKTOP) =====
    albumViewer.addEventListener('wheel', (e) => {
        e.preventDefault();
        handleZoom(-e.deltaY, e.clientX, e.clientY);
    }, { passive: false });
    
    // ===== GESTOS TOUCH (MOBILE) =====
    let touchStart = {};
    
    albumViewer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const now = Date.now();
        const touches = e.touches;
        
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
                handleDoubleTap(touch.clientX, touch.clientY);
                
                lastTouchTime = 0;
                return;
            }
            
            if (zoomLevel > 1) {
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
        
        if (touches.length === 2 && isPinching) {
            blockNavigation = true;
            
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
            
            const touch = touches[0];
            translateX = touch.clientX - startX;
            translateY = touch.clientY - startY;
            updateImageTransform();
        }
    }, { passive: false });
    
    albumViewer.addEventListener('touchend', (e) => {
        const touches = e.touches;
        
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
            
            const touch = touches[0];
            startX = touch.clientX - translateX;
            startY = touch.clientY - translateY;
            modalPhoto.style.cursor = 'grabbing';
        }
    });
    
    // ===== SWIPE PARA NAVEGAÇÃO =====
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

// ===== FUNÇÕES DE ÁLBUM =====
function initAlbums() {
    const container = document.getElementById('albumsContainer');
    
    if (!container) {
        console.warn('⚠️ Container de álbuns não encontrado');
        return;
    }
    
    container.innerHTML = '';
    
    albums.forEach(album => {
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
    currentAlbum = albums.find(a => a.id === albumId);
    if (!currentAlbum) {
        console.warn('⚠️ Álbum não encontrado:', albumId);
        return;
    }
    
    currentPhotoIndex = 0;
    updateAlbumViewer();
    
    const modal = document.getElementById('albumModal');
    if (modal) {
        modal.style.display = 'flex';
    }
    
    const titleElement = document.getElementById('modalAlbumTitle');
    if (titleElement) {
        titleElement.textContent = currentAlbum.title;
    }
    
    console.log(`📸 Álbum aberto: ${currentAlbum.title}`);
}

function updateAlbumViewer() {
    if (!currentAlbum) return;
    
    const photo = currentAlbum.photos[currentPhotoIndex];
    const modalPhoto = document.getElementById('modalPhoto');
    
    if (modalPhoto) {
        modalPhoto.src = photo.src;
        modalPhoto.alt = `Foto ${currentPhotoIndex + 1}`;
        
        resetZoom();
    }
    
    document.getElementById('currentPhoto').textContent = currentPhotoIndex + 1;
    document.getElementById('totalPhotos').textContent = currentAlbum.photos.length;
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

// ===== ANIMAÇÃO DO CRUZEIRO =====
function initCruzeiroAnimation() {
    const logo = document.querySelector('.cruzeiro-logo');
    if (!logo) return;
    
    // Adicionar delay aleatório para cada estrela
    const stars = logo.querySelectorAll('polygon');
    stars.forEach((star, index) => {
        star.style.setProperty('--i', index);
    });
    
    console.log('✅ Animação do Cruzeiro iniciada');
}

function updateCruzeiroColors(themeName) {
    const logo = document.querySelector('.cruzeiro-logo');
    if (!logo) return;
    
    const colors = {
        meteors: { primary: '#8a2be2', secondary: '#00ffff', accent: '#ffffff' },
        hearts: { primary: '#ff0055', secondary: '#ff3366', accent: '#ffcc00' },
        aurora: { primary: '#00ffaa', secondary: '#00ccff', accent: '#ffffff' },
        winter: { primary: '#e3f2fd', secondary: '#81d4fa', accent: '#ffffff' },
        cruzeiro: { primary: '#0a2845', secondary: '#4a90e2', accent: '#ffd700' }
    };
    
    const themeColors = colors[themeName] || colors.meteors;
    
    const stars = logo.querySelectorAll('polygon');
    const circles = logo.querySelectorAll('circle');
    const paths = logo.querySelectorAll('path');
    
    stars.forEach(star => {
        star.style.fill = themeColors.primary;
        star.style.stroke = themeColors.accent;
    });
    
    circles.forEach(circle => {
        if (circle.getAttribute('r') === '65') {
            circle.style.stroke = themeColors.secondary;
        }
    });
    
    paths.forEach(path => {
        path.style.stroke = themeColors.accent;
    });
}

// ===== FUNÇÕES UTILITÁRIAS =====
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

// ===== FIX PARA FOCUS STATE EM MOBILE =====
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll(
        '.control-btn, .album-control-btn, .theme-btn, ' +
        '.theme-menu-toggle, .close-modal, .new-message-btn'
    );
    
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.blur();
        });
        
        button.addEventListener('touchend', function() {
            this.blur();
        });
        
        button.addEventListener('mousedown', function(e) {
            e.preventDefault();
        });
    });
    
    console.log('✅ Fix de focus aplicado em', buttons.length, 'botões');
});

console.log(`
╔══════════════════════════════════════╗
║   💖 SITE KEVIN & IARA INICIADO 💖   ║
╠══════════════════════════════════════╣
║   📱 Otimizado para Mobile          ║
║   🎵 Player original restaurado     ║
║   📸 ${albums.length} álbuns organizados ║
║   🎨 ${Object.keys(themes).length} temas disponíveis ║
║   💾 Tema persistente com localStorage ║
╚══════════════════════════════════════╝
`);