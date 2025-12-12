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
        
        console.log('💖 Site Kevin & Iara carregado com sucesso!');
        
        // Inicializar animações COM O TEMA CORRETO depois de um delay
        setTimeout(() => {
            if (typeof initAnimations === 'function') {
                initAnimations(savedTheme || 'meteors'); // Passa o tema salvo para as animações
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
                changeTheme(savedTheme, false); // false = não salvar novamente
                
                // Marcar o botão correto como ativo
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
                return savedTheme; // Retorna o tema para usar nas animações
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
                
                changeTheme(theme, true); // true = salvar no localStorage
                
                // Mudar animação também
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
        
        // Salvar tema se solicitado
        if (shouldSave) {
            saveTheme(themeName);
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
        album.photoCount = album.photos.length; // Define photoCount como o tamanho real do array
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
    let lastTouchDistance = 0;
    let isPinching = false;
    let initialPinchDistance = 0;
    let lastGestureTime = 0;

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
            
            // Resetar zoom ao trocar de foto
            resetZoom();
        }
        
        document.getElementById('currentPhoto').textContent = currentPhotoIndex + 1;
        document.getElementById('totalPhotos').textContent = currentAlbum.photos.length;
    }

    // ===== FUNÇÕES DE ZOOM =====
function resetZoom() {
    const modalPhoto = document.getElementById('modalPhoto');
    
    // Adicionar transição suave apenas no reset
    modalPhoto.classList.add('zoom-transition');
    
    zoomLevel = 1;
    translateX = 0;
    translateY = 0;
    isDragging = false;
    updateImageTransform();
    
    // Remover transição depois
    setTimeout(() => {
        modalPhoto.classList.remove('zoom-transition');
    }, 300);
}

    function updateImageTransform() {
        const modalPhoto = document.getElementById('modalPhoto');
        if (!modalPhoto) return;
        
        modalPhoto.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoomLevel})`;
        modalPhoto.style.cursor = zoomLevel > 1 ? 'grab' : 'pointer';
    }

function handleZoom(delta, centerX, centerY) {
    const oldZoom = zoomLevel;
    
    // Ajustar zoom de forma mais suave
    if (delta > 0) {
        zoomLevel = Math.min(zoomLevel * 1.05, 4); // Máximo 4x, mais suave
    } else {
        zoomLevel = Math.max(zoomLevel * 0.95, 1); // Mínimo 1x, mais suave
    }
    
    // Se voltou ao zoom 1x, centralizar
    if (zoomLevel === 1) {
        translateX = 0;
        translateY = 0;
        isDragging = false; // ← ADICIONAR: resetar drag
    } else if (centerX !== undefined && centerY !== undefined) {
        // Ajustar posição baseado no ponto de zoom
        const modalPhoto = document.getElementById('modalPhoto');
        const rect = modalPhoto.getBoundingClientRect();
        
        const offsetX = centerX - rect.left - rect.width / 2;
        const offsetY = centerY - rect.top - rect.height / 2;
        
        // ===== MELHORADO: Cálculo mais preciso =====
        const zoomRatio = zoomLevel / oldZoom - 1;
        translateX -= offsetX * zoomRatio;
        translateY -= offsetY * zoomRatio;
    }
    
    updateImageTransform();
}

    function getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
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
        resetZoom(); // ← ADICIONAR
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
        
    const albumViewer = document.querySelector('.album-viewer');
    const modalPhoto = document.getElementById('modalPhoto');

    if (albumViewer && modalPhoto) {
        // ===== DUPLO CLIQUE PARA ZOOM =====
        let lastTap = 0;
        modalPhoto.addEventListener('click', (e) => {
            const now = Date.now();
            const timeSince = now - lastTap;
            
            if (timeSince < 300 && timeSince > 0) {
                // Duplo clique detectado
                e.stopPropagation();
                
                if (zoomLevel === 1) {
                    // Zoom in no ponto clicado
                    handleZoom(1, e.clientX, e.clientY);
                    zoomLevel = 2;
                    updateImageTransform();
                } else {
                    // Zoom out
                    resetZoom();
                }
            }
            
            lastTap = now;
        });
        
        // ===== SCROLL DO MOUSE PARA ZOOM (DESKTOP) =====
        albumViewer.addEventListener('wheel', (e) => {
            e.preventDefault();
            handleZoom(-e.deltaY, e.clientX, e.clientY);
        }, { passive: false });
        
        // ===== PINCH TO ZOOM (MOBILE) =====

albumViewer.addEventListener('touchstart', (e) => {
    lastGestureTime = Date.now(); // Atualizar tempo do último gesto
    
    if (e.touches.length === 2) {
        // MODO PINCH
        e.preventDefault();
        isPinching = true;
        isDragging = false; // Desabilitar drag durante pinch
        
        initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);
        lastTouchDistance = initialPinchDistance;
        
        // NÃO iniciar drag aqui
        
    } else if (e.touches.length === 1 && zoomLevel > 1) {
        // MODO DRAG (apenas com 1 dedo e zoom ativo)
        e.preventDefault();
        isPinching = false;
        isDragging = true;
        startX = e.touches[0].clientX - translateX;
        startY = e.touches[0].clientY - translateY;
        modalPhoto.style.cursor = 'grabbing';
    }
}, { passive: false });

albumViewer.addEventListener('touchmove', (e) => {
    lastGestureTime = Date.now(); // Atualizar tempo do último gesto
    
    if (e.touches.length === 2 && isPinching) {
        // ===== MODO PINCH PURO (SEM DRAG SIMULTÂNEO) =====
        e.preventDefault();
        
        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const delta = currentDistance - lastTouchDistance;
        
        // Calcular centro do pinch para zoom focal
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        
        // Aplicar zoom
        handleZoom(delta * 2, centerX, centerY); // *2 para sensibilidade melhor
        
        lastTouchDistance = currentDistance;
        
    } else if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
        // ===== MODO DRAG PURO (APENAS COM 1 DEDO) =====
        e.preventDefault();
        
        translateX = e.touches[0].clientX - startX;
        translateY = e.touches[0].clientY - startY;
        updateImageTransform();
    }
}, { passive: false });
        
albumViewer.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
        // Todos os dedos foram retirados
        isPinching = false;
        isDragging = false;
        modalPhoto.style.cursor = zoomLevel > 1 ? 'grab' : 'pointer';
        lastGestureTime = Date.now(); // Atualizar ao soltar
        
    } else if (e.touches.length === 1 && isPinching) {
        // Transição de 2 dedos para 1 dedo (pinch -> possível drag)
        isPinching = false;
        
        if (zoomLevel > 1) {
            // Preparar para drag se ainda tiver zoom
            isDragging = true;
            startX = e.touches[0].clientX - translateX;
            startY = e.touches[0].clientY - translateY;
        }
    }
});

albumViewer.addEventListener('click', (e) => {
    // Bloquear clique se acabou de fazer zoom/drag ou se está com zoom
    const timeSinceGesture = Date.now() - lastGestureTime;
    if (zoomLevel > 1 || timeSinceGesture < 300) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    
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
