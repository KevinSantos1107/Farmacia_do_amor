// ===== CONFIGURAÇÕES INICIAIS =====
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar tudo
    initThemeMenu();
    initThemeSelector();
    initTimeCounter();
    initMusicPlayer();
    initAlbums();
    initMessages();
    initModal();
    updateCurrentDate();
    initImageSkeletons();
    initCouplePhotoSkeleton();
    
    console.log('💖 Site Kevin & Iara carregado com sucesso!');
    
    // Inicializar animações depois de um delay
    setTimeout(() => {
        if (typeof initAnimations === 'function') {
            initAnimations();
        }
    }, 500);
});

// ===== CONFIGURAÇÕES DE DATAS =====
const START_DATE = new Date('2023-06-15T00:00:00');
const START_DATE_DISPLAY = '15/06/2023';

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
    }
};

let currentTheme = 'meteors';

function initThemeSelector() {
    const themeButtons = document.querySelectorAll('.theme-btn');
    
    themeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const theme = this.dataset.theme;
            
            themeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            changeTheme(theme);
            
            if (window.Animations && typeof window.Animations.changeTheme === 'function') {
                window.Animations.changeTheme(theme);
            }
        });
    });
}

function changeTheme(themeName) {
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
        title: "menina-da-farmacia",
        artist: "Seu Artista",
        src: "audio/menina-da-farmacia.mp3",
        album: "Nossa Trilha Sonora"
    },
    {
        title: "menina-da-farmacia-2",
        artist: "Seu Artista",
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

     // Skeleton inicial do player
    const albumCover = document.querySelector('.album-cover');
    const albumImg = albumCover?.querySelector('img');
    
    if (albumImg && albumCover) {
        albumCover.classList.add('loading');
        
        albumImg.addEventListener('load', function() {
            this.classList.add('loaded');
            albumCover.classList.add('loaded');
            albumCover.classList.remove('loading');
        }, { once: true });
        
        if (albumImg.complete && albumImg.naturalHeight !== 0) {
            albumImg.classList.add('loaded');
            albumCover.classList.add('loaded');
            albumCover.classList.remove('loading');
        }
    }
    
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
    
    const albumCover = document.querySelector('.album-cover');
    const albumImg = albumCover?.querySelector('img');
    
    if (albumImg && albumCover) {
        albumImg.classList.remove('loaded');
        albumCover.classList.remove('loaded');
        albumCover.classList.add('loading');
    }
    
    audio.src = track.src;
    document.getElementById('songTitle').textContent = track.title;
    document.getElementById('songArtist').textContent = track.artist;
    document.getElementById('currentTrack').textContent = index + 1;
    document.getElementById('totalTracks').textContent = playlist.length;
    
    document.getElementById('progressBarFill').style.width = '0%';
    document.getElementById('currentTime').textContent = '0:00';
    
    if (albumImg && albumCover) {
        albumImg.addEventListener('load', function() {
            this.classList.add('loaded');
            albumCover.classList.add('loaded');
            albumCover.classList.remove('loading');
        }, { once: true });
    }
    
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

// ===== ÁLBUNS DE FOTOS - VERSÃO SEGURA COM CONTAGEM DINÂMICA =====
const albums = [
    {
        id: 1,
        title: "Primeiros Encontros",
        date: "Junho 2023",
        cover: "images/capas-albuns/primeiro-encontro.jpg",
        description: "Os primeiros momentos mágicos que deram início à nossa história.",
        photos: [
            { src: "images/fotos/album1/1.jpg", description: "Nosso primeiro café juntos" }
            // ✅ Adicione apenas as fotos que REALMENTE EXISTEM
            // ✅ O sistema calculará photoCount automaticamente
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
            { src: "images/fotos/album2/2.jpg", description: "Paisagem deslumbrante" }
            // ✅ Apenas 2 fotos? Sistema mostrará "2 fotos" automaticamente
        ]
    }
];

let currentAlbum = null;
let currentPhotoIndex = 0;

// ===== FUNÇÃO SEGURA: INICIALIZAÇÃO COM VALIDAÇÃO =====
function initAlbums() {
    const container = document.getElementById('albumsContainer');
    
    if (!container) {
        console.warn('⚠️ Container de álbuns não encontrado');
        return;
    }
    
    container.innerHTML = '';
    
    albums.forEach(album => {
        // ✅ CALCULA photoCount DINAMICAMENTE
        const photoCount = album.photos.length;
        
        // ⚠️ VALIDAÇÃO: Não exibe álbum vazio
        if (photoCount === 0) {
            console.warn(`⚠️ Álbum "${album.title}" não possui fotos`);
            return; // Pula este álbum
        }
        
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
                        <i class="far fa-images"></i> ${photoCount} ${photoCount === 1 ? 'foto' : 'fotos'}
                    </span>
                </div>
            </div>
        `;
        
        albumCard.addEventListener('click', () => openAlbum(album.id));
        container.appendChild(albumCard);

        // Skeleton para imagem do card
        const img = albumCard.querySelector('.album-cover-img');
        
        if (img) {
            img.classList.add('loading');
            
            img.addEventListener('load', function() {
                this.classList.add('loaded');
                this.classList.remove('loading');
            });
            
            // ⚠️ Fallback: remove loading após 3 segundos
            setTimeout(() => {
                if (!img.classList.contains('loaded')) {
                    img.classList.add('loaded');
                    img.classList.remove('loading');
                    console.warn(`⚠️ Capa do álbum "${album.title}" demorou para carregar`);
                }
            }, 3000);
            
            if (img.complete && img.naturalHeight !== 0) {
                img.classList.add('loaded');
                img.classList.remove('loading');
            }
        }
    });
    
    console.log(`✅ ${albums.length} álbuns carregados com total de ${albums.reduce((sum, a) => sum + a.photos.length, 0)} fotos`);
}

function openAlbum(albumId) {
    currentAlbum = albums.find(a => a.id === albumId);
    if (!currentAlbum) {
        console.warn('⚠️ Álbum não encontrado:', albumId);
        return;
    }
    
    currentPhotoIndex = 0;

    const viewer = document.querySelector('.album-viewer');
    if (viewer) {
        viewer.classList.add('loading');
        viewer.classList.remove('loaded');
    }
    
    updateAlbumViewer();
    
    const modal = document.getElementById('albumModal');
    if (modal) {
        modal.style.display = 'flex';
    }
    
    const titleElement = document.getElementById('modalAlbumTitle');
    if (titleElement) {
        titleElement.textContent = currentAlbum.title;
    }
    
    console.log(`📸 Álbum aberto: ${currentAlbum.title} (${currentAlbum.photos.length} fotos)`);
}

// ===== FUNÇÃO SEGURA: ANTI-LOADING INFINITO =====
function updateAlbumViewer() {
    if (!currentAlbum) return;
    
    // ✅ VALIDAÇÃO: Verifica se índice é válido
    if (currentPhotoIndex >= currentAlbum.photos.length) {
        currentPhotoIndex = 0;
    }
    
    const photo = currentAlbum.photos[currentPhotoIndex];
    const modalPhoto = document.getElementById('modalPhoto');
    const viewer = document.querySelector('.album-viewer');
    
    if (modalPhoto && viewer) {
        // Remove classes antigas
        modalPhoto.classList.remove('loaded');
        viewer.classList.remove('loaded');
        
        // Adiciona loading
        viewer.classList.add('loading');
        
        modalPhoto.src = photo.src;
        modalPhoto.alt = `Foto ${currentPhotoIndex + 1}`;
        
        // ⚠️ TIMEOUT DE SEGURANÇA: 5 segundos
        const loadingTimeout = setTimeout(() => {
            if (!modalPhoto.classList.contains('loaded')) {
                modalPhoto.classList.add('loaded');
                viewer.classList.add('loaded');
                viewer.classList.remove('loading');
                console.warn(`⚠️ Foto ${currentPhotoIndex + 1} (${photo.src}) não carregou a tempo`);
            }
        }, 5000);
        
        // Quando carregar
        modalPhoto.addEventListener('load', function() {
            clearTimeout(loadingTimeout); // ✅ Cancela timeout
            this.classList.add('loaded');
            viewer.classList.add('loaded');
            viewer.classList.remove('loading');
        }, { once: true });
        
        // ⚠️ ERRO: Remove loading se imagem falhar
        modalPhoto.addEventListener('error', function() {
            clearTimeout(loadingTimeout);
            this.classList.add('loaded');
            viewer.classList.add('loaded');
            viewer.classList.remove('loading');
            console.error(`❌ Erro ao carregar: ${photo.src}`);
        }, { once: true });
    }
    
    // Atualiza contador
    document.getElementById('currentPhoto').textContent = currentPhotoIndex + 1;
    document.getElementById('totalPhotos').textContent = currentAlbum.photos.length;
}

function initModal() {
    const modal = document.getElementById('albumModal');
    const closeBtn = document.getElementById('closeModal');
    const prevBtn = document.getElementById('prevPhotoBtn');
    const nextBtn = document.getElementById('nextPhotoBtn');
    
    if (!modal || !closeBtn || !prevBtn || !nextBtn) {
        console.warn('⚠️ Elementos do modal não encontrados');
        return;
    }
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    prevBtn.addEventListener('click', () => {
        if (currentAlbum) {
            currentPhotoIndex = (currentPhotoIndex - 1 + currentAlbum.photos.length) % currentAlbum.photos.length;
            updateAlbumViewer();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentAlbum) {
            currentPhotoIndex = (currentPhotoIndex + 1) % currentAlbum.photos.length;
            updateAlbumViewer();
        }
    });
    
    // Navegação estilo Instagram
    const albumViewer = document.querySelector('.album-viewer');
    if (albumViewer) {
        albumViewer.addEventListener('click', (e) => {
            if (!currentAlbum) return;
            
            const rect = albumViewer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const width = rect.width;
            
            if (clickX < width / 2) {
                prevBtn.click();
            } else {
                nextBtn.click();
            }
        });
        
        albumViewer.style.cursor = 'pointer';
        
        albumViewer.addEventListener('mousedown', () => {
            albumViewer.style.opacity = '0.9';
        });
        
        albumViewer.addEventListener('mouseup', () => {
            albumViewer.style.opacity = '1';
        });
        
        albumViewer.addEventListener('touchstart', () => {
            albumViewer.style.opacity = '0.9';
        }, { passive: true });
        
        albumViewer.addEventListener('touchend', () => {
            albumViewer.style.opacity = '1';
        }, { passive: true });
    }
    
    // Swipe para mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    modal.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    modal.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
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
    
    console.log('✅ Modal inicializado com navegação Instagram');
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

function initMessages() {
    showRandomMessage();
    
    const newMessageBtn = document.getElementById('newMessageBtn');
    if (newMessageBtn) {
        newMessageBtn.addEventListener('click', showRandomMessage);
    }
}

function showRandomMessage() {
    const randomIndex = Math.floor(Math.random() * messages.length);
    const message = messages[randomIndex];
    
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

// ===== SKELETON PARA FOTO DO CASAL =====
function initCouplePhotoSkeleton() {
    const couplePhoto = document.querySelector('.couple-photo');
    const coupleImg = couplePhoto?.querySelector('img');
    
    if (coupleImg && couplePhoto) {
        couplePhoto.classList.add('loading');
        
        coupleImg.addEventListener('load', function() {
            this.classList.add('loaded');
            couplePhoto.classList.add('loaded');
            couplePhoto.classList.remove('loading');
        });
        
        if (coupleImg.complete && coupleImg.naturalHeight !== 0) {
            coupleImg.classList.add('loaded');
            couplePhoto.classList.add('loaded');
            couplePhoto.classList.remove('loading');
        }
    }
}

// ===== FUNÇÃO UTILITÁRIA PARA SKELETON =====
function setupImageSkeleton(imgElement, containerElement = null) {
    if (!imgElement) return;
    
    const container = containerElement || imgElement.parentElement;
    
    imgElement.classList.add('loading');
    if (container) container.classList.add('loading');
    
    imgElement.addEventListener('load', function() {
        this.classList.add('loaded');
        this.classList.remove('loading');
        if (container) {
            container.classList.add('loaded');
            container.classList.remove('loading');
        }
    }, { once: true });
    
    if (imgElement.complete && imgElement.naturalHeight !== 0) {
        imgElement.classList.add('loaded');
        imgElement.classList.remove('loading');
        if (container) {
            container.classList.add('loaded');
            container.classList.remove('loading');
        }
    }
}

function initImageSkeletons() {
    const coupleImg = document.querySelector('.couple-photo img');
    const couplePhoto = document.querySelector('.couple-photo');
    setupImageSkeleton(coupleImg, couplePhoto);
    
    const albumImg = document.querySelector('.album-cover img');
    const albumCover = document.querySelector('.album-cover');
    setupImageSkeleton(albumImg, albumCover);
    
    document.querySelectorAll('.album-cover-img').forEach(img => {
        setupImageSkeleton(img);
    });
}

// ===== INICIALIZAÇÃO COMPLETA =====
console.log(`
╔══════════════════════════════════════╗
║   💖 SITE KEVIN & IARA INICIADO 💖   ║
╠══════════════════════════════════════╣
║   📱 Otimizado para Mobile          ║
║   🎵 Player original restaurado     ║
║   📸 Sistema de álbuns dinâmico     ║
║   🎨 3 temas disponíveis            ║
║   🔒 Proteção anti-loading infinito ║
╚══════════════════════════════════════╝
`);

// ===== FIX PARA FOCUS STATE EM MOBILE =====
// (código completo incluído)

// ===== LAZY LOADING E SKELETON PARA IMAGENS =====
// (código completo incluído)
