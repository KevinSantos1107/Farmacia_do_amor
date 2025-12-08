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
    
    console.log('💖 Site Kevin & Iara carregado com sucesso!');
    
    // Inicializar animações depois de um delay
    setTimeout(() => {
        initAnimations();  // ← CHAMADA DIRETA
    }, 500);
});

// ===== CONFIGURAÇÕES DE DATAS =====
const START_DATE = new Date('2023-06-15T00:00:00'); // ALTERE PARA SUA DATA
const START_DATE_DISPLAY = '15/06/2023'; // Formato de exibição

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
            
            // Remover classe ativa de todos os botões
            themeButtons.forEach(btn => btn.classList.remove('active'));
            // Adicionar classe ativa ao botão clicado
            this.classList.add('active');
            
            // Alterar tema
            changeTheme(theme);
            
            // Alterar animação de fundo
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
    
    // Alterar classe do body
    document.body.className = '';
    document.body.classList.add(`theme-${themeName}`);
    
    // Atualizar variáveis CSS
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
    
    themeToggle.addEventListener('click', function(e) {
        e.stopPropagation(); // Evita que o clique se propague
        themeSelector.classList.toggle('hidden');
    });
    
    // Fechar menu quando clicar fora
    document.addEventListener('click', function(e) {
        if (!themeSelector.contains(e.target) && e.target !== themeToggle) {
            themeSelector.classList.add('hidden');
        }
    });
    
    // Fechar menu quando trocar de tema
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(button => {
        button.addEventListener('click', function() {
            themeSelector.classList.add('hidden');
        });
    });
}

// ===== CONTADOR DE TEMPO =====
function initTimeCounter() {
    // Exibir data de início
    document.getElementById('startDateDisplay').textContent = START_DATE_DISPLAY;
    
    // Atualizar contador imediatamente e a cada segundo
    updateTimeCounter();
    setInterval(updateTimeCounter, 1000);
}

function updateTimeCounter() {
    const now = new Date();
    const diff = now - START_DATE;
    
    // Calcular unidades de tempo
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
    
    // Atualizar elementos
    document.getElementById('years').textContent = years.toString().padStart(2, '0');
    document.getElementById('months').textContent = months.toString().padStart(2, '0');
    document.getElementById('days').textContent = remainingDays.toString().padStart(2, '0');
    document.getElementById('hours').textContent = remainingHours.toString().padStart(2, '0');
    document.getElementById('minutes').textContent = remainingMinutes.toString().padStart(2, '0');
    document.getElementById('seconds').textContent = remainingSeconds.toString().padStart(2, '0');
}

// ===== PLAYER DE MÚSICA (RESTAURADO - FUNCIONALIDADES ORIGINAIS) =====
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
let repeatMode = 0; // 0 = off, 1 = all, 2 = one
let lastPrevClickTime = 0; // Variável declarada aqui

function initMusicPlayer() {
    const audio = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const repeatBtn = document.getElementById('repeatBtn');
    const progressBarFill = document.getElementById('progressBarFill');
    
    // Carregar primeira música
    loadTrack(currentTrackIndex);
    
    // Event Listeners ORIGINAIS - MODIFICADOS
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', handlePrevTrack);  // ← Agora usa handlePrevTrack
    nextBtn.addEventListener('click', handleNextTrack);  // ← Agora usa handleNextTrack
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);
    
    // Barra de progresso clicável
    progressBarFill.parentElement.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audio.currentTime = audio.duration * percent;
        updateProgressBar();
    });
    
    audio.addEventListener('timeupdate', updateProgressBar);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleTrackEnd);
    audio.addEventListener('play', () => {
        document.querySelector('.music-player').classList.add('playing');
    });
    audio.addEventListener('pause', () => {
        document.querySelector('.music-player').classList.remove('playing');
    });
    
    // Volume fixo para mobile
    audio.volume = 0.8;
}

// FUNÇÕES DE NAVEGAÇÃO MODIFICADAS
function handlePrevTrack() {
    const audio = document.getElementById('audioPlayer');
    
    // SEMPRE verifica se está após 3 segundos
    if (audio.currentTime > 3) {
        // Está depois de 3 segundos - volta ao início
        audio.currentTime = 0;
        updateProgressBar();
        console.log('⏪ Voltou ao início da música (tempo > 3s)');
    } else {
        // Está antes de 3 segundos - vai para música anterior
        currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        loadTrack(currentTrackIndex);
        
        if (isPlaying) {
            setTimeout(() => {
                audio.play();
            }, 100);
        }
        console.log('⏮️ Foi para música anterior (tempo < 3s)');
    }
}

function handleNextTrack() {
    const now = Date.now();
    
    // Se clicou rapidamente 2 vezes, avança
    if (now - lastPrevClickTime < 1500) {
        nextTrack();
        console.log('⏭️ Foi para próxima música');
    } else {
        // Primeiro clique, apenas avança
        nextTrack();
    }
    
    lastPrevClickTime = now;
}

function loadTrack(index) {
    const track = playlist[index];
    const audio = document.getElementById('audioPlayer');
    
    audio.src = track.src;
    document.getElementById('songTitle').textContent = track.title;
    document.getElementById('songArtist').textContent = track.artist;
    document.getElementById('currentTrack').textContent = index + 1;
    document.getElementById('totalTracks').textContent = playlist.length;
    
    // Reset da barra de progresso
    document.getElementById('progressBarFill').style.width = '0%';
    document.getElementById('currentTime').textContent = '0:00';
    
    // Se estava tocando, continua
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

function prevTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    loadTrack(currentTrackIndex);
    
    if (isPlaying) {
        document.getElementById('audioPlayer').play();
    }
    
    console.log('⏮️ Foi para música anterior');
}

function nextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    loadTrack(currentTrackIndex);
    
    if (isPlaying) {
        document.getElementById('audioPlayer').play();
    }
    
    console.log('⏭️ Foi para próxima música');
}

function toggleShuffle() {
    const shuffleBtn = document.getElementById('shuffleBtn');
    isShuffled = !isShuffled;
    shuffleBtn.classList.toggle('active', isShuffled);
    
    if (isShuffled) {
        // Embaralhar playlist (apenas visual, não altera ordem original)
        shuffleBtn.style.color = 'var(--theme-primary)';
    } else {
        shuffleBtn.style.color = '';
    }
}

function toggleRepeat() {
    const repeatBtn = document.getElementById('repeatBtn');
    repeatMode = (repeatMode + 1) % 2;
    
    repeatBtn.classList.toggle('active', repeatMode > 0);
    
    switch (repeatMode) {
        case 0:
            // Repeat off
            repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
            repeatBtn.title = "Repetir desligado";
            repeatBtn.style.color = '';
            console.log('🔁 Repeat: Off');
            break;
        case 1:
            // Repeat one
            repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
            repeatBtn.title = "Repetir uma música";
            repeatBtn.style.color = 'var(--theme-primary)';
            console.log('🔂 Repeat: One');
            break;
    }
}

function updateProgressBar() {
    const audio = document.getElementById('audioPlayer');
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

function updateDuration() {
    const audio = document.getElementById('audioPlayer');
    const totalTime = document.getElementById('totalTime');
    totalTime.textContent = formatTime(audio.duration);
}

function handleTrackEnd() {
    if (repeatMode === 1) {
        // Repetir mesma música
        document.getElementById('audioPlayer').currentTime = 0;
        document.getElementById('audioPlayer').play();
    } else {
        // Próxima música
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
        cover: "images/capas-albuns/primeiro-encontro.jpg", // NOVO CAMINHO
        photoCount: 4,
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
        cover: "images/capas-albuns/viagem.jpg", // NOVO CAMINHO
        photoCount: 4,
        description: "Nossa primeira viagem juntos, cheia de aventuras e momentos especiais.",
        photos: [
            { src: "images/fotos/album2/1.jpg", description: "Chegada ao destino" },
            { src: "images/fotos/album2/2.jpg", description: "Paisagem deslumbrante" },
            { src: "images/fotos/album2/3.jpg", description: "Aventuras pela cidade" },
            { src: "images/fotos/album2/4.jpg", description: "Comidas típicas" }
        ]
    }
];

let currentAlbum = null;
let currentPhotoIndex = 0;

function initAlbums() {
    const container = document.getElementById('albumsContainer');
    
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
                        <i class="far fa-images"></i> ${album.photoCount} fotos
                    </span>
                </div>
            </div>
        `;
        
        albumCard.addEventListener('click', () => openAlbum(album.id));
        container.appendChild(albumCard);
    });
}

function openAlbum(albumId) {
    currentAlbum = albums.find(a => a.id === albumId);
    if (!currentAlbum) return;
    
    currentPhotoIndex = 0;
    updateAlbumViewer();
    
    // Mostrar modal
    const modal = document.getElementById('albumModal');
    modal.style.display = 'flex';
    // LINHA REMOVIDA: document.body.style.overflow = 'hidden';
    
    // Atualizar informações do modal
    document.getElementById('modalAlbumTitle').textContent = currentAlbum.title;
}

function updateAlbumViewer() {
    if (!currentAlbum) return;
    
    const photo = currentAlbum.photos[currentPhotoIndex];
    const modalPhoto = document.getElementById('modalPhoto');
    
    modalPhoto.src = photo.src;
    modalPhoto.alt = `Foto ${currentPhotoIndex + 1}`;
    
    // Atualizar contador e descrição
    document.getElementById('currentPhoto').textContent = currentPhotoIndex + 1;
    document.getElementById('totalPhotos').textContent = currentAlbum.photos.length;
    document.getElementById('photoDescription').textContent = photo.description;
}

function initModal() {
    const modal = document.getElementById('albumModal');
    const closeBtn = document.getElementById('closeModal');
    const prevBtn = document.getElementById('prevPhotoBtn');
    const nextBtn = document.getElementById('nextPhotoBtn');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        // LINHA REMOVIDA: document.body.style.overflow = 'auto';
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
                // Swipe para esquerda - próxima foto
                nextBtn.click();
            } else {
                // Swipe para direita - foto anterior
                prevBtn.click();
            }
        }
    }
    
    // Fechar modal clicando no fundo (fora do conteúdo)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeBtn.click();
        }
    });
    
    // Navegação por teclado
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
    // Mostrar mensagem aleatória inicial
    showRandomMessage();
    
    // Event listener para o botão
    document.getElementById('newMessageBtn').addEventListener('click', showRandomMessage);
}

function showRandomMessage() {
    const randomIndex = Math.floor(Math.random() * messages.length);
    const message = messages[randomIndex];
    
    const messageElement = document.getElementById('dailyMessage');
    messageElement.innerHTML = `
        <p class="message-text">"${message.text}"</p>
        <p class="message-author">— ${message.author}</p>
    `;
    
    // Efeito de transição
    messageElement.style.opacity = '0';
    setTimeout(() => {
        messageElement.style.transition = 'opacity 0.3s ease';
        messageElement.style.opacity = '1';
    }, 10);
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
    document.getElementById('currentDate').textContent = `Hoje é ${dateString}`;
}

// ===== INICIALIZAÇÃO COMPLETA =====
console.log(`
╔══════════════════════════════════════╗
║   💖 SITE KEVIN & IARA INICIADO 💖   ║
╠══════════════════════════════════════╣
║   📱 Otimizado para Mobile          ║
║   🎵 Player original restaurado     ║
║   📸 ${albums.length} álbuns organizados ║
║   🎨 ${Object.keys(themes).length} temas disponíveis ║
╚══════════════════════════════════════╝
`);
