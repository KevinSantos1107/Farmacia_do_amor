// ===== CONFIGURAÇÕES INICIAIS =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando site Kevin & Iara...');
    
    // 1. PRIMEIRO: Verificar se elementos existem
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    
    if (!hamburgerBtn || !sideMenu || !menuOverlay) {
        console.error('❌ ERRO CRÍTICO: Elementos do menu não encontrados!');
        console.error('hamburgerBtn:', hamburgerBtn);
        console.error('sideMenu:', sideMenu);
        console.error('menuOverlay:', menuOverlay);
        return;
    }
    
    console.log('✅ Elementos do menu encontrados');
    
    // 2. Inicializar animações
    setTimeout(() => {
        if (typeof initAnimations === 'function') {
            initAnimations();
        } else {
            console.warn('⚠️ initAnimations não encontrada');
        }
    }, 100);
    
    // 3. Carregar tema salvo
    setTimeout(() => {
        const savedTheme = loadSavedTheme();
        if (savedTheme && themes[savedTheme]) {
            console.log(`🎯 Aplicando tema salvo: ${themes[savedTheme].name}`);
            currentTheme = savedTheme;
            changeTheme(savedTheme, false);
        }
    }, 200);
    
    // 4. Inicializar componentes
    setTimeout(() => {
        initThemeSelector();
        initTimeCounter();
        initMusicPlayer();
        initAlbums();
        initMessages();
        initModal();
        initTimelineModal();
        initHamburgerMenu(); // ← CHAMADA ÚNICA AQUI
        updateCurrentDate();
        
        console.log('✅ Site inicializado com sucesso!');
    }, 300);
});

// ===== RESTANTE DO CÓDIGO CONTINUA IGUAL... =====

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
                // ATUALIZAR BOTÕES IMEDIATAMENTE
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
                
                changeTheme(theme, true); // true = salvar no localStorage
                
                // Mudar animação também
                if (window.Animations && typeof window.Animations.changeTheme === 'function') {
                    window.Animations.changeTheme(theme);
                }
            });
        });
    }

    // ===== FUNÇÃO ATUALIZADA PARA MUDAR TEMA (SUBSTITUI A ANTIGA) =====
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
        
        // Mudar animação também
        if (window.Animations && typeof window.Animations.changeTheme === 'function') {
            window.Animations.changeTheme(themeName);
        }
        
        // ATUALIZAR BOTÕES ANTIGOS (.theme-btn)
        const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === themeName) {
                btn.classList.add('active');
            }
        });
        
        // ATUALIZAR CARDS NOVOS DO MENU HAMBÚRGUER (.theme-card)
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
    // Tornar albums uma variável global mutável
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

    // Atualizar photoCount automaticamente
    window.albums.forEach(album => {
        album.photoCount = album.photos.length;
    });

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
        
        // Adicionar transição suave apenas no reset
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
        
        // Remover transição depois
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
        
        // Ajustar zoom de forma mais suave
        if (delta > 0) {
            zoomLevel = Math.min(zoomLevel * 1.05, 4);
        } else {
            zoomLevel = Math.max(zoomLevel * 0.95, 1);
        }
        
        // Se voltou ao zoom 1x, centralizar
        if (zoomLevel === 1) {
            translateX = 0;
            translateY = 0;
            isDragging = false;
        } else if (centerX !== undefined && centerY !== undefined) {
            // Ajustar posição baseado no ponto de zoom
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
            // ZOOM IN
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
            // ZOOM OUT
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
            
            // Guardar posições iniciais
            for (let i = 0; i < touches.length; i++) {
                touchStart[i] = {
                    x: touches[i].clientX,
                    y: touches[i].clientY
                };
            }
            
            touchCount = touches.length;
            
            // Se tiver 2 dedos, é PINCH
            if (touches.length === 2) {
                console.log('🔍 Pinch detectado (2 dedos)');
                isPinching = true;
                initialPinchDistance = getTouchDistance(touches[0], touches[1]);
                lastPinchDistance = initialPinchDistance;
                
                // Cancelar qualquer duplo toque pendente
                if (doubleTapTimeout) {
                    clearTimeout(doubleTapTimeout);
                    doubleTapTimeout = null;
                }
                return;
            }
            
            // Se tiver 1 dedo, pode ser duplo toque ou arraste
            if (touches.length === 1) {
                const touch = touches[0];
                const timeSinceLastTouch = now - lastTouchTime;
                
                // Verificar se é duplo toque
                if (timeSinceLastTouch < 300 && timeSinceLastTouch > 0) {
                    console.log('👆👆 Duplo toque detectado');
                    handleDoubleTap(touch.clientX, touch.clientY);
                    
                    // Resetar timer
                    lastTouchTime = 0;
                    return;
                }
                
                // Iniciar arraste se estiver com zoom
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
            
            // PINCH TO ZOOM
            if (touches.length === 2 && isPinching) {
                blockNavigation = true;
                
                const currentDistance = getTouchDistance(touches[0], touches[1]);
                const delta = currentDistance - lastPinchDistance;
                
                // Calcular centro do pinch
                const centerX = (touches[0].clientX + touches[1].clientX) / 2;
                const centerY = (touches[0].clientY + touches[1].clientY) / 2;
                
                // Aplicar zoom proporcional
                const zoomFactor = 0.01;
                if (delta !== 0) {
                    const oldZoom = zoomLevel;
                    
                    if (delta > 0) {
                        zoomLevel = Math.min(zoomLevel * (1 + delta * zoomFactor), 4);
                    } else {
                        zoomLevel = Math.max(zoomLevel / (1 - delta * zoomFactor), 1);
                    }
                    
                    // Ajustar posição baseada no centro do pinch
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
            
            // DRAG (arrastar imagem com zoom)
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
            
            // Se todos os dedos saíram
            if (touches.length === 0) {
                // Finalizar pinch
                if (isPinching) {
                    console.log('✅ Pinch finalizado');
                    isPinching = false;
                    
                    // Se ainda estiver com zoom, bloquear navegação temporariamente
                    if (zoomLevel > 1) {
                        blockNavigation = true;
                        setTimeout(() => {
                            blockNavigation = false;
                            console.log('🔓 Navegação liberada após pinch');
                        }, 300);
                    }
                }
                
                // Finalizar drag
                if (isDragging) {
                    console.log('✅ Drag finalizado');
                    isDragging = false;
                    modalPhoto.style.cursor = zoomLevel > 1 ? 'grab' : 'pointer';
                    
                    // Se ainda estiver com zoom, manter bloqueio
                    if (zoomLevel > 1) {
                        blockNavigation = true;
                    }
                }
                
                // Se não estava fazendo gestos complexos, permitir navegação
                if (!isPinching && !isDragging && zoomLevel === 1) {
                    blockNavigation = false;
                }
                
                // Resetar contagem
                touchCount = 0;
            }
            
            // Se sobrou 1 dedo (transição de pinch para drag)
            else if (touches.length === 1 && isPinching) {
                console.log('🔄 Transição: pinch → drag');
                isPinching = false;
                isDragging = true;
                
                // Configurar para drag
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
                
                // Só processar swipe rápido (não gestos lentos)
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
                    // Swipe para a esquerda = próxima foto
                    nextBtn.click();
                } else {
                    // Swipe para a direita = foto anterior
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
        
        // Usar window.albums para permitir atualização dinâmica
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
    
    // ✅ ADICIONE ESTAS 3 LINHAS AQUI
    if (!currentAlbum.photos || currentAlbum.photos.length === 0) {
        alert('📷 Este álbum ainda não possui fotos!');
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

    // ===== VERIFICADOR DE SINCRONIZAÇÃO =====
    function checkThemeSync() {
        const bodyTheme = document.body.className.match(/theme-(\w+)/);
        const canvasAnimation = currentAnimation; // de animations.js
        
        if (bodyTheme && bodyTheme[1] !== canvasAnimation) {
            console.warn('⚠️ Tema dessincronizado! Corrigindo...');
            console.log(`Body: ${bodyTheme[1]}, Canvas: ${canvasAnimation}`);
            
            // Forçar sincronização
            if (window.Animations && typeof window.Animations.changeTheme === 'function') {
                window.Animations.changeTheme(bodyTheme[1]);
            }
        }
    }

    // Executar após a página carregar
    window.addEventListener('load', () => {
        setTimeout(checkThemeSync, 1000);
    });

    // ===== ADICIONAR NO FINAL DO ARQUIVO script.js =====

    // ===== CONTROLE DA TIMELINE MODAL =====
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
        
        // Abrir modal da timeline
        openBtn.addEventListener('click', () => {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            console.log('📖 Timeline aberta');
        });
        
        // Fechar modal da timeline
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            console.log('📖 Timeline fechada');
        });
        
        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeBtn.click();
            }
        });
        
        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (secretModal.style.display === 'flex') {
                    closeSecretBtn.click();
                } else if (modal.style.display === 'block') {
                    closeBtn.click();
                }
            }
        });
        
        // ===== BOTÕES DE MENSAGEM SECRETA =====
        secretMessageBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const message = btn.getAttribute('data-message');
                
                if (message) {
                    showSecretMessage(message);
                }
            });
        });
        
        // Fechar modal secreto
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
            
            console.log('🔓 Mensagem secreta revelada');
        }
    }

    // ===== BARRA DE PROGRESSO NA TIMELINE =====
    function updateTimelineProgress() {
        const timelineScroll = document.querySelector('.timeline-scroll');
        const timelineContainer = document.querySelector('.timeline-container');
        
        if (!timelineScroll || !timelineContainer) return;
        
        timelineScroll.addEventListener('scroll', () => {
            const scrollTop = timelineScroll.scrollTop;
            const scrollHeight = timelineScroll.scrollHeight - timelineScroll.clientHeight;
            const scrollPercent = (scrollTop / scrollHeight) * 100;
            
            // Atualizar a altura da barra de progresso
            timelineContainer.style.setProperty('--progress-height', `${scrollPercent}%`);
        });
    }

// ===== MENU HAMBÚRGUER PREMIUM COM AUTO-FECHAMENTO =====
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

    // Verificação de segurança
    if (!hamburgerBtn || !sideMenu || !menuOverlay) {
        console.error('❌ Elementos do menu não encontrados!');
        return false;
    }

    console.log('✅ Elementos do menu encontrados');

    // ===== FUNÇÃO PARA FECHAR O MENU =====
    function closeMenu() {
        hamburgerBtn.classList.remove('active');
        sideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
        console.log('🔒 Menu fechado');
    }

    // ===== FUNÇÃO PARA ABRIR O MENU =====
    function openMenu() {
        hamburgerBtn.classList.add('active');
        sideMenu.classList.add('active');
        menuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        console.log('🔓 Menu aberto');
    }

    // ===== ALTERNAR MENU =====
    function toggleMenu() {
        const isActive = sideMenu.classList.contains('active');
        if (isActive) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    // ===== EVENTOS DOS BOTÕES =====
    hamburgerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
    });

    menuOverlay.addEventListener('click', (e) => {
        e.preventDefault();
        closeMenu();
    });


    // ===== NAVEGAÇÃO INTERNA =====
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            console.log('🔗 Navegação:', targetId);
            
            // Fechar menu imediatamente
            closeMenu();
            
            // Aguardar animação de fechamento (300ms)
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

    // ===== SELETOR DE TEMAS =====
    themeCards.forEach(card => {
        card.addEventListener('click', () => {
            const theme = card.dataset.theme;
            console.log('🎨 Tema selecionado:', theme);
            
            // Atualizar visual
            themeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            // Aplicar tema
            if (typeof changeTheme === 'function') {
                changeTheme(theme, true);
            }
            
            // NÃO fechar o menu ao trocar de tema
        });
    });

    // Carregar tema salvo
    const savedTheme = localStorage.getItem('kevinIaraTheme') || 'meteors';
    themeCards.forEach(card => {
        if (card.dataset.theme === savedTheme) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });

    // ===== INTEGRAÇÃO COM ADMIN =====
    let isAdminUnlocked = false;

    if (adminMenuBtn) {
        adminMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔐 Botão admin clicado');
            
            if (!isAdminUnlocked) {
                // Solicitar senha
                const password = prompt('🔐 Digite a senha de admin:');
                
                if (password === 'iara2023') {
                    isAdminUnlocked = true;
                    adminMenuBtn.classList.add('unlocked');
                    adminMenuBtn.innerHTML = '<i class="fas fa-lock-open"></i><span>Admin</span>';
                    
                    // Fechar menu
                    closeMenu();
                    
                    // Aguardar animação
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
                // Admin já desbloqueado
                closeMenu();
                
                setTimeout(() => {
                    const adminModal = document.getElementById('adminModal');
                    if (adminModal) {
                        adminModal.style.display = 'block';
                        document.body.style.overflow = 'hidden';
                        
                        if (typeof loadExistingContent === 'function') {
                            loadExistingContent();
                        }
                    }
                }, 300);
            }
        });
    }

    // ===== ATALHO ESC PARA FECHAR =====
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sideMenu.classList.contains('active')) {
            closeMenu();
        }
    });

    // ===== AUTO-FECHAR AO ABRIR MODAIS =====
    // Observar quando qualquer modal é aberto
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style') {
                const target = mutation.target;
                
                // Se um modal foi aberto
                if (target.style.display === 'flex' || target.style.display === 'block') {
                    // E o menu está aberto
                    if (sideMenu.classList.contains('active')) {
                        // Fechar o menu
                        closeMenu();
                        console.log('🔒 Menu fechado automaticamente (modal aberto)');
                    }
                }
            }
        });
    });

    // Observar todos os modais
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
