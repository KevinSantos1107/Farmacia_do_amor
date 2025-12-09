// ===== SISTEMA DE ADMINISTRAÇÃO =====
const ADMIN_PASSWORD = "kevin&iara2024"; // Senha para acessar o painel
let adminData = {
    albums: [],
    playlist: [],
    settings: {}
};

// ===== CONFIGURAÇÕES INICIAIS =====
document.addEventListener('DOMContentLoaded', function() {
    // Carregar dados salvos
    loadSavedData();
    
    // Inicializar tudo
    initThemeMenu();
    initThemeSelector();
    initTimeCounter();
    initMusicPlayer();
    initAlbums();
    initMessages();
    initModal();
    updateCurrentDate();
    
    // Inicializar sistema de administração
    initAdminPanel();
    
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
    const themeDrawer = document.getElementById('themeDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const closeDrawer = document.getElementById('closeDrawer');
    const themeOptions = document.querySelectorAll('.theme-option');
    const swipeArea = document.createElement('div');
    
    // Criar área de swipe
    swipeArea.className = 'swipe-area';
    document.body.appendChild(swipeArea);
    
    // Variáveis para controle de swipe
    let touchStartX = 0;
    let touchStartY = 0;
    let drawerOpen = false;
    
    // Abrir drawer ao clicar na área de swipe
    swipeArea.addEventListener('click', () => {
        openThemeDrawer();
    });
    
    // Swipe para abrir/fechar
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;
        
        // Só considerar swipe horizontal
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            if (diffX > 0 && !drawerOpen && touchStartX > window.innerWidth - 50) {
                // Swipe da direita para esquerda (abrir)
                openThemeDrawer();
            } else if (diffX < 0 && drawerOpen) {
                // Swipe da esquerda para direita (fechar)
                closeThemeDrawer();
            }
        }
    }, { passive: true });
    
    // Tecla ESC para fechar
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawerOpen) {
            closeThemeDrawer();
        }
    });
    
    // Fechar drawer
    closeDrawer.addEventListener('click', closeThemeDrawer);
    drawerOverlay.addEventListener('click', closeThemeDrawer);
    
    // Selecionar tema
    themeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const theme = this.dataset.theme;
            
            // Atualizar seleção visual
            themeOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Mudar tema
            changeTheme(theme);
            
            // Fechar drawer após selecionar
            setTimeout(closeThemeDrawer, 300);
        });
    });
    
    // Funções para abrir/fechar drawer
    function openThemeDrawer() {
        themeDrawer.classList.add('open');
        drawerOverlay.classList.add('show');
        drawerOpen = true;
        document.body.style.overflow = 'hidden'; // Previne scroll
    }
    
    function closeThemeDrawer() {
        themeDrawer.classList.remove('open');
        drawerOverlay.classList.remove('show');
        drawerOpen = false;
        document.body.style.overflow = ''; // Restaura scroll
    }
    
    // Botão rápido para tema (opcional)
    const quickThemeBtn = document.createElement('button');
    quickThemeBtn.className = 'quick-theme-btn';
    quickThemeBtn.innerHTML = '<i class="fas fa-palette"></i>';
    quickThemeBtn.title = 'Mudar tema';
    document.body.appendChild(quickThemeBtn);
    
    quickThemeBtn.addEventListener('click', openThemeDrawer);
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
        currentTrackIndex = (currentTrackIndex - 1 + adminData.playlist.length) % adminData.playlist.length;
        loadTrack(currentTrackIndex);
        if (isPlaying) {
            setTimeout(() => audio.play(), 100);
        }
    }
}

function nextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % adminData.playlist.length;
    loadTrack(currentTrackIndex);
    if (isPlaying) {
        document.getElementById('audioPlayer').play();
    }
}

function loadTrack(index) {
    if (adminData.playlist.length === 0) return;
    
    const track = adminData.playlist[index];
    const audio = document.getElementById('audioPlayer');
    
    if (!audio) return;
    
    audio.src = track.src;
    document.getElementById('songTitle').textContent = track.title;
    document.getElementById('songArtist').textContent = track.artist;
    document.getElementById('currentTrack').textContent = index + 1;
    document.getElementById('totalTracks').textContent = adminData.playlist.length;
    
    document.getElementById('progressBarFill').style.width = '0%';
    document.getElementById('currentTime').textContent = '0:00';
    
    if (isPlaying) {
        setTimeout(() => audio.play(), 100);
    }
}

function togglePlayPause() {
    const audio = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    
    if (!audio.src || audio.src === '') return;
    
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
    shuffleBtn.classList.toggle('active', isShuffled);
    shuffleBtn.style.color = isShuffled ? 'var(--theme-primary)' : '';
}

function toggleRepeat() {
    const repeatBtn = document.getElementById('repeatBtn');
    repeatMode = (repeatMode + 1) % 2;
    
    repeatBtn.classList.toggle('active', repeatMode > 0);
    
    if (repeatMode === 0) {
        repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
        repeatBtn.title = "Repetir desligado";
        repeatBtn.style.color = '';
    } else {
        repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
        repeatBtn.title = "Repetir uma música";
        repeatBtn.style.color = 'var(--theme-primary)';
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
let currentAlbum = null;
let currentPhotoIndex = 0;

function initAlbums() {
    const container = document.getElementById('albumsContainer');
    
    if (!container) {
        console.warn('⚠️ Container de álbuns não encontrado');
        return;
    }
    
    renderAlbums();
}

function renderAlbums() {
    const container = document.getElementById('albumsContainer');
    
    if (!container || !adminData.albums) return;
    
    container.innerHTML = '';
    
    if (adminData.albums.length === 0) {
        container.innerHTML = `
            <div class="no-albums">
                <i class="fas fa-images" style="font-size: 3rem; color: var(--theme-text-secondary); margin-bottom: 15px;"></i>
                <h3 style="color: var(--theme-text); margin-bottom: 10px;">Nenhum álbum ainda</h3>
                <p style="color: var(--theme-text-secondary);">Use o painel de administração para adicionar álbuns!</p>
            </div>
        `;
        return;
    }
    
    adminData.albums.forEach(album => {
        const albumCard = document.createElement('div');
        albumCard.className = 'album-card';
        albumCard.dataset.id = album.id;
        
        albumCard.innerHTML = `
            <img src="${album.cover || 'images/capas-albuns/default.jpg'}" alt="${album.title}" class="album-cover-img">
            <div class="album-info">
                <h3>${album.title}</h3>
                <p class="album-date">
                    <i class="far fa-calendar-alt"></i> ${album.date}
                </p>
                <p>${album.description}</p>
                <div class="album-stats">
                    <span>
                        <i class="far fa-images"></i> ${album.photos ? album.photos.length : 0} fotos
                    </span>
                </div>
            </div>
        `;
        
        albumCard.addEventListener('click', () => openAlbum(album.id));
        container.appendChild(albumCard);
    });
    
    console.log(`✅ ${adminData.albums.length} álbuns carregados`);
}

function openAlbum(albumId) {
    currentAlbum = adminData.albums.find(a => a.id === albumId);
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
    
    if (modalPhoto && photo) {
        modalPhoto.src = photo.src;
        modalPhoto.alt = photo.description || `Foto ${currentPhotoIndex + 1}`;
    } else if (modalPhoto) {
        modalPhoto.src = '';
        modalPhoto.alt = 'Sem foto';
    }
    
    document.getElementById('currentPhoto').textContent = currentPhotoIndex + 1;
    document.getElementById('totalPhotos').textContent = currentAlbum.photos ? currentAlbum.photos.length : 0;
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
        if (currentAlbum && currentAlbum.photos) {
            currentPhotoIndex = (currentPhotoIndex - 1 + currentAlbum.photos.length) % currentAlbum.photos.length;
            updateAlbumViewer();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentAlbum && currentAlbum.photos) {
            currentPhotoIndex = (currentPhotoIndex + 1) % currentAlbum.photos.length;
            updateAlbumViewer();
        }
    });
    
    // ===== NAVEGAÇÃO ESTILO INSTAGRAM =====
    const albumViewer = document.querySelector('.album-viewer');
    if (albumViewer) {
        albumViewer.addEventListener('click', (e) => {
            if (!currentAlbum || !currentAlbum.photos) return;
            
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
const defaultMessages = [
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
    const messages = adminData.messages || defaultMessages;
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

// ===== SISTEMA DE ADMINISTRAÇÃO =====
function initAdminPanel() {
    const adminAccessBtn = document.getElementById('adminAccessBtn');
    const adminOverlay = document.getElementById('adminOverlay');
    const closeAdmin = document.getElementById('closeAdmin');
    const adminTabs = document.querySelectorAll('.admin-tab');
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    const resetDataBtn = document.getElementById('resetDataBtn');
    const adminTouchArea = document.getElementById('adminTouchArea');
    
    if (!adminAccessBtn || !adminOverlay) {
        console.warn('⚠️ Elementos do painel admin não encontrados');
        return;
    }
    
    // Controle do botão discreto
    let adminBtnVisible = false;
    let hideTimeout;
    
    // Mostrar botão ao tocar na área
    adminTouchArea.addEventListener('touchstart', () => {
        adminAccessBtn.classList.add('show');
        adminBtnVisible = true;
        
        // Limpar timeout anterior
        if (hideTimeout) clearTimeout(hideTimeout);
        
        // Esconder após 5 segundos
        hideTimeout = setTimeout(() => {
            if (adminBtnVisible) {
                adminAccessBtn.classList.remove('show');
                adminBtnVisible = false;
            }
        }, 5000);
    }, { passive: true });
    
    // Para desktop - mostrar sempre
    if (window.innerWidth >= 768) {
        adminAccessBtn.classList.add('show');
    }
    
    // Acesso ao painel (acesso direto sem senha)
    adminAccessBtn.addEventListener('click', () => {
        adminOverlay.style.display = 'flex';
        loadAdminData();
        
        // Esconder botão após abrir
        adminAccessBtn.classList.remove('show');
        adminBtnVisible = false;
    });
    
    // Fechar painel
    closeAdmin.addEventListener('click', () => {
        adminOverlay.style.display = 'none';
    });
    
    // Fechar ao clicar fora
    adminOverlay.addEventListener('click', (e) => {
        if (e.target === adminOverlay) {
            adminOverlay.style.display = 'none';
        }
    });
    
    // Tabs
    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            
            // Atualizar tabs
            adminTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Mostrar conteúdo da tab
            document.querySelectorAll('.admin-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabId}Tab`).classList.add('active');
        });
    });
    
    // Salvar alterações
    saveChangesBtn.addEventListener('click', saveAllChanges);
    
    // Resetar dados
    resetDataBtn.addEventListener('click', () => {
        if (confirm("Tem certeza que deseja restaurar os dados padrão? Isso apagará todas as suas alterações.")) {
            resetToDefault();
        }
    });
    
    // Inicializar funcionalidades específicas
    initPhotoManagement();
    initMusicManagement();
    initAlbumManagement();
}
function loadAdminData() {
    // Carregar select de álbuns
    const albumSelect = document.getElementById('albumSelect');
    if (albumSelect) {
        albumSelect.innerHTML = '<option value="">Selecione um álbum</option>';
        
        adminData.albums.forEach(album => {
            const option = document.createElement('option');
            option.value = album.id;
            option.textContent = album.title;
            albumSelect.appendChild(option);
        });
    }
    
    // Carregar preview de fotos
    updatePhotosPreview();
    
    // Carregar lista de músicas
    updateMusicList();
    
    // Carregar lista de álbuns
    updateAdminAlbumsList();
}

function initPhotoManagement() {
    const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
    const albumSelect = document.getElementById('albumSelect');
    
    if (!uploadPhotoBtn || !albumSelect) return;
    
    uploadPhotoBtn.addEventListener('click', async () => {
        const albumId = albumSelect.value;
        const photoFile = document.getElementById('photoUpload').files[0];
        const description = document.getElementById('photoDescription').value.trim();
        
        if (!albumId) {
            showAlert('Selecione um álbum primeiro!', 'error');
            return;
        }
        
        if (!photoFile) {
            showAlert('Selecione uma foto para upload!', 'error');
            return;
        }
        
        const album = adminData.albums.find(a => a.id == albumId);
        if (!album) {
            showAlert('Álbum não encontrado!', 'error');
            return;
        }
        
        try {
            // Converter imagem para base64
            const base64Image = await fileToBase64(photoFile);
            
            // Criar nova foto
            const newPhoto = {
                id: Date.now(),
                src: base64Image,
                description: description || `Foto ${album.photos.length + 1}`
            };
            
            // Adicionar ao álbum
            if (!album.photos) album.photos = [];
            album.photos.push(newPhoto);
            
            // Atualizar preview
            updatePhotosPreview();
            
            // Limpar formulário
            document.getElementById('photoUpload').value = '';
            document.getElementById('photoDescription').value = '';
            
            showAlert('Foto adicionada com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao processar foto:', error);
            showAlert('Erro ao processar a foto. Tente novamente.', 'error');
        }
    });
}

function initMusicManagement() {
    const uploadMusicBtn = document.getElementById('uploadMusicBtn');
    
    if (!uploadMusicBtn) return;
    
    uploadMusicBtn.addEventListener('click', async () => {
        const title = document.getElementById('musicTitle').value.trim();
        const artist = document.getElementById('musicArtist').value.trim();
        const album = document.getElementById('musicAlbum').value.trim();
        const cover = document.getElementById('musicCover').value.trim();
        const musicFile = document.getElementById('musicUpload').files[0];
        
        if (!title || !artist) {
            showAlert('Preencha título e artista!', 'error');
            return;
        }
        
        if (!musicFile) {
            showAlert('Selecione um arquivo de música!', 'error');
            return;
        }
        
        try {
            // Converter áudio para base64
            const base64Audio = await fileToBase64(musicFile);
            
            // Criar nova música
            const newMusic = {
                id: Date.now(),
                title: title,
                artist: artist,
                src: base64Audio,
                album: album || 'Nossa Trilha Sonora',
                cover: cover || 'images/capa-musica.jpg'
            };
            
            // Adicionar à playlist
            adminData.playlist.push(newMusic);
            
            // Atualizar lista
            updateMusicList();
            
            // Limpar formulário
            document.getElementById('musicTitle').value = '';
            document.getElementById('musicArtist').value = '';
            document.getElementById('musicAlbum').value = '';
            document.getElementById('musicCover').value = '';
            document.getElementById('musicUpload').value = '';
            
            showAlert('Música adicionada com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao processar música:', error);
            showAlert('Erro ao processar a música. Tente novamente.', 'error');
        }
    });
}

function initAlbumManagement() {
    const createAlbumBtn = document.getElementById('createAlbumBtn');
    
    if (!createAlbumBtn) return;
    
    createAlbumBtn.addEventListener('click', async () => {
        const title = document.getElementById('albumTitle').value.trim();
        const date = document.getElementById('albumDate').value.trim();
        const description = document.getElementById('albumDescription').value.trim();
        const coverFile = document.getElementById('albumCover').files[0];
        const coverUrl = document.getElementById('albumCoverUrl').value.trim();
        
        if (!title || !date) {
            showAlert('Preencha título e data!', 'error');
            return;
        }
        
        try {
            let coverImage = coverUrl || 'images/capas-albuns/default.jpg';
            
            if (coverFile) {
                // Converter capa para base64
                coverImage = await fileToBase64(coverFile);
            }
            
            // Criar novo álbum
            const newAlbum = {
                id: Date.now(),
                title: title,
                date: date,
                cover: coverImage,
                description: description,
                photos: []
            };
            
            // Adicionar aos álbuns
            adminData.albums.push(newAlbum);
            
            // Atualizar select de álbuns e lista
            updateAlbumSelect();
            updateAdminAlbumsList();
            
            // Limpar formulário
            document.getElementById('albumTitle').value = '';
            document.getElementById('albumDate').value = '';
            document.getElementById('albumDescription').value = '';
            document.getElementById('albumCover').value = '';
            document.getElementById('albumCoverUrl').value = '';
            
            showAlert('Álbum criado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao criar álbum:', error);
            showAlert('Erro ao criar álbum. Tente novamente.', 'error');
        }
    });
}

// Funções auxiliares
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function updatePhotosPreview() {
    const albumSelect = document.getElementById('albumSelect');
    const photosGrid = document.getElementById('photosGrid');
    
    if (!albumSelect || !photosGrid) return;
    
    const albumId = albumSelect.value;
    if (!albumId) {
        photosGrid.innerHTML = '<p style="color: var(--theme-text-secondary); text-align: center;">Selecione um álbum</p>';
        return;
    }
    
    const album = adminData.albums.find(a => a.id == albumId);
    if (!album || !album.photos || album.photos.length === 0) {
        photosGrid.innerHTML = '<p style="color: var(--theme-text-secondary); text-align: center;">Nenhuma foto neste álbum</p>';
        return;
    }
    
    photosGrid.innerHTML = '';
    
    album.photos.forEach((photo, index) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.innerHTML = `
            <img src="${photo.src}" alt="${photo.description}">
            <div class="photo-actions">
                <button class="delete-photo" data-index="${index}" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        photosGrid.appendChild(photoItem);
    });
    
    // Adicionar event listeners para deletar fotos
    document.querySelectorAll('.delete-photo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            if (confirm('Tem certeza que deseja excluir esta foto?')) {
                album.photos.splice(index, 1);
                updatePhotosPreview();
                showAlert('Foto excluída!', 'success');
            }
        });
    });
}

function updateMusicList() {
    const musicItems = document.getElementById('musicItems');
    
    if (!musicItems) return;
    
    if (!adminData.playlist || adminData.playlist.length === 0) {
        musicItems.innerHTML = '<p style="color: var(--theme-text-secondary); text-align: center;">Nenhuma música na playlist</p>';
        return;
    }
    
    musicItems.innerHTML = '';
    
    adminData.playlist.forEach((music, index) => {
        const musicItem = document.createElement('div');
        musicItem.className = 'music-item';
        musicItem.innerHTML = `
            <div class="music-info">
                <h6>${music.title}</h6>
                <p>${music.artist} • ${music.album}</p>
            </div>
            <div class="music-actions">
                <button class="delete-music" data-index="${index}" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        musicItems.appendChild(musicItem);
    });
    
    // Adicionar event listeners para deletar músicas
    document.querySelectorAll('.delete-music').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            if (confirm('Tem certeza que deseja excluir esta música?')) {
                adminData.playlist.splice(index, 1);
                updateMusicList();
                showAlert('Música excluída!', 'success');
            }
        });
    });
}

function updateAdminAlbumsList() {
    const adminAlbumsGrid = document.getElementById('adminAlbumsGrid');
    
    if (!adminAlbumsGrid) return;
    
    if (!adminData.albums || adminData.albums.length === 0) {
        adminAlbumsGrid.innerHTML = '<p style="color: var(--theme-text-secondary); text-align: center;">Nenhum álbum criado</p>';
        return;
    }
    
    adminAlbumsGrid.innerHTML = '';
    
    adminData.albums.forEach((album, index) => {
        const albumItem = document.createElement('div');
        albumItem.className = 'admin-album-item';
        albumItem.innerHTML = `
            <div class="admin-album-info">
                <h6>${album.title}</h6>
                <p>${album.date} • ${album.photos ? album.photos.length : 0} fotos</p>
            </div>
            <div class="album-actions">
                <button class="delete-album" data-index="${index}" title="Excluir álbum">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        adminAlbumsGrid.appendChild(albumItem);
    });
    
    // Adicionar event listeners para deletar álbuns
    document.querySelectorAll('.delete-album').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            if (confirm('Tem certeza que deseja excluir este álbum? Todas as fotos serão perdidas.')) {
                adminData.albums.splice(index, 1);
                updateAdminAlbumsList();
                updateAlbumSelect();
                showAlert('Álbum excluído!', 'success');
            }
        });
    });
}

function updateAlbumSelect() {
    const albumSelect = document.getElementById('albumSelect');
    
    if (!albumSelect) return;
    
    albumSelect.innerHTML = '<option value="">Selecione um álbum</option>';
    
    adminData.albums.forEach(album => {
        const option = document.createElement('option');
        option.value = album.id;
        option.textContent = album.title;
        albumSelect.appendChild(option);
    });
}

function showAlert(message, type = 'info') {
    // Remover alertas anteriores
    const existingAlert = document.querySelector('.admin-alert');
    if (existingAlert) existingAlert.remove();
    
    // Criar novo alerta
    const alert = document.createElement('div');
    alert.className = `admin-alert ${type}`;
    alert.textContent = message;
    
    // Adicionar ao painel
    const adminContent = document.querySelector('.admin-content');
    if (adminContent) {
        adminContent.insertBefore(alert, adminContent.firstChild);
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
}

function saveAllChanges() {
    try {
        // Salvar no localStorage
        localStorage.setItem('kevinIaraData', JSON.stringify(adminData));
        
        // Atualizar o site
        renderAlbums();
        
        // Se houver player de música, recarregar
        if (adminData.playlist.length > 0) {
            loadTrack(currentTrackIndex);
        }
        
        showAlert('Todas as alterações foram salvas com sucesso! O site foi atualizado.', 'success');
        
        // Fechar painel após salvar
        setTimeout(() => {
            document.getElementById('adminOverlay').style.display = 'none';
        }, 1500);
        
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        showAlert('Erro ao salvar dados. Tente novamente.', 'error');
    }
}

function resetToDefault() {
    if (confirm("Isso restaurará TODOS os dados para os valores padrão. Tem certeza?")) {
        // Criar dados padrão
        const defaultData = {
            albums: [
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
            ],
            playlist: [
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
            ],
            messages: defaultMessages,
            settings: {}
        };
        
        // Aplicar dados padrão
        adminData = defaultData;
        
        // Salvar
        saveAllChanges();
    }
}

function loadSavedData() {
    try {
        const savedData = localStorage.getItem('kevinIaraData');
        
        if (savedData) {
            adminData = JSON.parse(savedData);
            console.log('✅ Dados carregados do armazenamento local');
        } else {
            // Usar dados padrão
            resetToDefault();
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        resetToDefault();
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

// ===== INICIALIZAÇÃO COMPLETA =====
console.log(`
╔══════════════════════════════════════════════════════╗
║   💖 SITE KEVIN & IARA INICIADO 💖                    ║
╠══════════════════════════════════════════════════════╣
║   📱 Otimizado para Mobile                           ║
║   🎵 Player original restaurado                       ║
║   📸 Sistema de administração ativo                   ║
║   🎨 ${Object.keys(themes).length} temas disponíveis           ║
║   👉 Arraste da direita para temas                   ║
║   ⚙️ Toque canto inferior direito para admin        ║
╚══════════════════════════════════════════════════════╝
`);
