// ===== GERENCIADOR DE PLAYLISTS COM FIREBASE - CRIA PLAYER INICIAL =====
console.log('🎵 Sistema de Playlists com Firebase carregado');

// ===== GERENCIADOR GLOBAL DE ÁUDIO =====
const AudioManager = {
    currentAudio: null,
    currentPlayerId: null,
    
    play(audioElement, playerId) {
        if (this.currentAudio && this.currentAudio !== audioElement) {
            this.currentAudio.pause();
            
            if (this.currentPlayerId) {
                const oldBtn = document.getElementById(`${this.currentPlayerId}-playPauseBtn`) || 
                               document.getElementById('playPauseBtn');
                if (oldBtn) {
                    oldBtn.innerHTML = '<i class="fas fa-play"></i>';
                }
                
                const oldPlayer = document.getElementById(this.currentPlayerId) ||
                                 document.querySelector('.music-player.playing');
                if (oldPlayer) {
                    oldPlayer.classList.remove('playing');
                }
            }
        }
        
        this.currentAudio = audioElement;
        this.currentPlayerId = playerId;
        
        console.log(`🎵 AudioManager: Tocando em ${playerId}`);
    },
    
    pause() {
        if (this.currentAudio) {
            this.currentAudio.pause();
        }
    },
    
    isPlaying(audioElement) {
        return this.currentAudio === audioElement && !audioElement.paused();
    }
};

const PlaylistManager = {
    currentPlaylistIndex: 0,
    customPlaylists: [],
    initialized: false
};

// ===== CARREGAR PLAYLISTS DO FIREBASE =====
async function loadPlaylistsFromFirebase() {
    try {
        console.log('🔄 Carregando playlists do Firebase...');
        
        const snapshot = await db.collection('custom_playlists').get();
        
        const sortedDocs = Array.from(snapshot.docs).sort((a, b) => {
            const aTime = a.data().createdAt?.toMillis() || 0;
            const bTime = b.data().createdAt?.toMillis() || 0;
            return aTime - bTime;
        });
        
        PlaylistManager.customPlaylists = [];
        
        for (const doc of sortedDocs) {
            const playlistData = doc.data();
            
            console.log(`📂 Carregando músicas da playlist: ${playlistData.name}`);
            
            const tracksSnapshot = await db.collection('playlist_tracks')
                .where('playlistId', '==', doc.id)
                .get();
            
            const sortedTrackDocs = Array.from(tracksSnapshot.docs).sort((a, b) => {
                return (a.data().pageNumber || 0) - (b.data().pageNumber || 0);
            });
            
            const allTracks = [];
            sortedTrackDocs.forEach(trackDoc => {
                const trackData = trackDoc.data();
                if (trackData.tracks && Array.isArray(trackData.tracks)) {
                    allTracks.push(...trackData.tracks);
                }
            });

            console.log(`   ✅ ${allTracks.length} músicas carregadas`);

            allTracks.forEach((track, i) => {
                console.log(`      Música ${i + 1}: ${track.title} - Capa: ${track.cover || 'NENHUMA'}`);
            });

            PlaylistManager.customPlaylists.push({
                id: doc.id,
                name: playlistData.name,
                icon: playlistData.icon || 'fa-music',
                cover: playlistData.cover || 'images/capas-albuns/nossa-trilha.jpg',
                tracks: allTracks
            });
        }
        
        console.log(`✅ Total de playlists carregadas: ${PlaylistManager.customPlaylists.length}`);
        
        return PlaylistManager.customPlaylists;
        
    } catch (error) {
        console.error('❌ Erro ao carregar playlists do Firebase:', error);
        console.error('Stack completo:', error.stack);
        return [];
    }
}

// ===== INICIALIZAR =====
async function initPlaylistManager() {
    if (PlaylistManager.initialized) return;
    
    console.log('🔧 Inicializando playlists...');
    
    await waitForFirebase();
    await loadPlaylistsFromFirebase();
    
    waitForPlayerSection(async () => {
        // ✅ CRIAR PLAYER INICIAL SE HOUVER PLAYLISTS
        if (PlaylistManager.customPlaylists.length > 0) {
            createInitialPlayer();
        } else {
            console.warn('⚠️ Nenhuma playlist encontrada no Firebase. Crie uma playlist no admin.');
        }
        
        setupIndicatorClicks();
        
        if (getTotalPlaylists() > 1) {
            showNavigationButtons();
        }
        
        PlaylistManager.initialized = true;
        console.log('✅ Playlists prontas!');
    });
}

// ===== AGUARDAR FIREBASE =====
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (typeof firebase !== 'undefined' && 
                firebase.apps.length > 0 &&
                typeof db !== 'undefined') {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });
}

// ===== AGUARDAR SEÇÃO DO PLAYER =====
function waitForPlayerSection(callback) {
    let attempts = 0;
    const checkInterval = setInterval(() => {
        attempts++;
        const playerSection = document.querySelector('.music-player-section');
        
        if (playerSection) {
            clearInterval(checkInterval);
            callback();
        } else if (attempts >= 50) {
            clearInterval(checkInterval);
            console.error('❌ Seção do player não encontrada após 5 segundos');
        }
    }, 100);
}

// ===== CRIAR PLAYER INICIAL (PRIMEIRA PLAYLIST DO FIREBASE) =====
function createInitialPlayer() {
    const playerSection = document.querySelector('.music-player-section');
    if (!playerSection) {
        console.error('❌ Seção do player não encontrada');
        return;
    }
    
    const firstPlaylist = PlaylistManager.customPlaylists[0];
    console.log(`🎵 Criando player inicial com playlist: ${firstPlaylist.name}`);
    
    // Criar container do carousel
    const playlistContainer = document.createElement('div');
    playlistContainer.className = 'playlist-carousel-container';
    playlistContainer.innerHTML = `
        <div class="playlist-indicators" id="playlistIndicators">
            <!-- Indicadores serão adicionados aqui -->
        </div>
        
        <div class="playlist-carousel-wrapper">
            <div class="playlist-carousel" id="playlistCarousel">
                <!-- Players serão adicionados aqui -->
            </div>
        </div>
    `;
    
    playerSection.appendChild(playlistContainer);
    
    const carousel = document.getElementById('playlistCarousel');
    const indicators = document.getElementById('playlistIndicators');
    
    // Criar players para cada playlist
    PlaylistManager.customPlaylists.forEach((playlist, index) => {
        // Criar slide
        const slide = document.createElement('div');
        slide.className = `playlist-slide ${index === 0 ? 'active' : ''}`;
        slide.setAttribute('data-playlist', index);
        slide.innerHTML = `<div id="playlist-${index}-container"></div>`;
        carousel.appendChild(slide);
        
        // Criar indicador
        const indicator = document.createElement('button');
        indicator.className = `playlist-indicator ${index === 0 ? 'active' : ''}`;
        indicator.setAttribute('data-index', index);
        indicator.innerHTML = `<i class="fas ${playlist.icon}"></i><span>${playlist.name}</span>`;
        indicator.addEventListener('click', () => switchToPlaylist(index));
        indicators.appendChild(indicator);
        
        // Criar player
        const container = document.getElementById(`playlist-${index}-container`);
        createCustomPlayer(container, playlist, index);
        
        console.log(`✅ Playlist "${playlist.name}" renderizada (${playlist.tracks.length} músicas)`);
    });
}

function setupIndicatorClicks() {
    document.querySelectorAll('.playlist-indicator').forEach(indicator => {
        indicator.addEventListener('click', function() {
            switchToPlaylist(parseInt(this.getAttribute('data-index')));
        });
    });
}

function switchToPlaylist(index) {
    const carousel = document.getElementById('playlistCarousel');
    const slides = carousel?.querySelectorAll('.playlist-slide');
    const indicators = document.querySelectorAll('.playlist-indicator');
    
    if (!carousel || !slides) {
        console.error('❌ Carousel ou slides não encontrados');
        return;
    }
    
    console.log(`🔄 Mudando para playlist ${index}`);
    
    PlaylistManager.currentPlaylistIndex = index;
    
    // ✅ APLICAR TRANSFORM SEMPRE, com transição bonita
    carousel.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    carousel.style.transform = `translateX(-${index * 100}%)`;
    
    slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
    indicators.forEach((ind, i) => ind.classList.toggle('active', i === index));
}

// ===== CRIAR PLAYER CUSTOM =====
function createCustomPlayer(container, playlist, playlistIndex) {
    const playerId = `custom-player-${playlistIndex}`;
    const audioId = `custom-audio-${playlistIndex}`;
    
    if (playlist.tracks.length === 0) {
        container.innerHTML = `
            <div class="music-player">
                <div class="empty-playlist">
                    <i class="fas fa-music"></i>
                    <p>Esta playlist está vazia</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="music-player" id="${playerId}">
            <div class="album-cover">
                <img id="${playerId}-coverImg" src="${playlist.tracks[0].cover || playlist.cover}" alt="${playlist.name}">
                <div class="vinyl-effect"></div>
            </div>
            
            <div class="song-info">
                <h3 id="${playerId}-title">${playlist.tracks[0].title}</h3>
                <p id="${playerId}-artist">${playlist.tracks[0].artist}</p>
            </div>
            
            <div class="player-controls">
                <div class="progress-container">
                    <div class="progress-bar-bg" id="${playerId}-progressBg">
                        <div class="progress-bar-fill" id="${playerId}-progressFill"></div>
                    </div>
                    <div class="time-display">
                        <span id="${playerId}-currentTime">0:00</span>
                        <span id="${playerId}-totalTime">0:00</span>
                    </div>
                </div>
                
                <div class="control-buttons">
                    <button class="control-btn" id="${playerId}-shuffleBtn">
                        <i class="fas fa-random"></i>
                    </button>
                    
                    <button class="control-btn" id="${playerId}-prevBtn">
                        <i class="fas fa-step-backward"></i>
                    </button>
                    
                    <button class="control-btn play-pause-btn" id="${playerId}-playPauseBtn">
                        <i class="fas fa-play"></i>
                    </button>
                    
                    <button class="control-btn" id="${playerId}-nextBtn">
                        <i class="fas fa-step-forward"></i>
                    </button>
                    
                    <button class="control-btn" id="${playerId}-repeatBtn">
                        <i class="fas fa-redo"></i>
                    </button>
                </div>
            </div>
            
            <div class="playlist-info">
                <span id="${playerId}-currentTrack">1</span> / <span id="${playerId}-totalTracks">${playlist.tracks.length}</span>
            </div>
            
            <audio id="${audioId}" preload="none"></audio>
        </div>
    `;
    
    initCustomPlayerControls(playerId, audioId, playlist);
}

// ===== CONTROLES DO PLAYER =====
function initCustomPlayerControls(playerId, audioId, playlist) {
    const audio = document.getElementById(audioId);
    const playPauseBtn = document.getElementById(`${playerId}-playPauseBtn`);
    const prevBtn = document.getElementById(`${playerId}-prevBtn`);
    const nextBtn = document.getElementById(`${playerId}-nextBtn`);
    const shuffleBtn = document.getElementById(`${playerId}-shuffleBtn`);
    const repeatBtn = document.getElementById(`${playerId}-repeatBtn`);
    const progressBarFill = document.getElementById(`${playerId}-progressFill`);
    const progressBarBg = document.getElementById(`${playerId}-progressBg`);
    const currentTimeEl = document.getElementById(`${playerId}-currentTime`);
    const totalTimeEl = document.getElementById(`${playerId}-totalTime`);
    
    let currentTrackIndex = 0;
    let isPlaying = false;
    let isShuffled = false;
    let repeatMode = 0;
    let isLoading = false;
    let loadTimeout = null;
    
    // Evitar preload para não forçar downloads antes do usuário tocar
    audio.preload = 'metadata';
    audio.volume = 0.8;
    
    loadTrack(currentTrackIndex);
    
    playPauseBtn.addEventListener('click', () => {
        if (audio.paused) {
            AudioManager.play(audio, playerId);

            // Se a fonte estiver guardada para carregamento sob demanda, atribuí-la agora
            if (audio.dataset && audio.dataset.src) {
                audio.src = audio.dataset.src;
                delete audio.dataset.src;
                try { audio.load(); } catch (e) { /* noop */ }
            }

            audio.play().then(() => {
                isPlaying = true;
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                document.getElementById(playerId).classList.add('playing');
                
                // Registrar player no MediaControlsManager
                if (window.MediaControlsManager) {
                    window.MediaControlsManager.registerPlayer(playerId, playlist, currentTrackIndex);
                }
            });
        } else {
            audio.pause();
            isPlaying = false;
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            document.getElementById(playerId).classList.remove('playing');
        }
    });
    
    prevBtn.addEventListener('click', () => {
        if (isLoading) return;
        
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
        } else {
            currentTrackIndex = (currentTrackIndex - 1 + playlist.tracks.length) % playlist.tracks.length;
            loadTrack(currentTrackIndex);
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (isLoading) return;
        
        currentTrackIndex = (currentTrackIndex + 1) % playlist.tracks.length;
        loadTrack(currentTrackIndex);
    });
    
    shuffleBtn.addEventListener('click', () => {
        isShuffled = !isShuffled;
        shuffleBtn.classList.toggle('active', isShuffled);
    });
    
    repeatBtn.addEventListener('click', () => {
        repeatMode = (repeatMode + 1) % 2;
        repeatBtn.classList.toggle('active', repeatMode === 1);
        repeatBtn.innerHTML = repeatMode === 1 ? '<i class="fas fa-redo-alt"></i>' : '<i class="fas fa-redo"></i>';
    });
    
    progressBarBg.addEventListener('click', (e) => {
        if (audio.duration && !isNaN(audio.duration)) {
            const rect = progressBarBg.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audio.currentTime = audio.duration * percent;
        }
    });
    
    audio.addEventListener('timeupdate', () => {
        const hasDuration = audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0;
        
        if (hasDuration) {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressBarFill.style.width = `${progress}%`;
            currentTimeEl.textContent = formatTime(audio.currentTime);
            
            if (totalTimeEl.textContent === '0:00' || totalTimeEl.textContent === '') {
                totalTimeEl.textContent = formatTime(audio.duration);
            }
        }
    });
    
    audio.addEventListener('loadedmetadata', () => {
        if (totalTimeEl && audio.duration && !isNaN(audio.duration)) {
            totalTimeEl.textContent = formatTime(audio.duration);
        }
    });
    
    audio.addEventListener('ended', () => {
        if (repeatMode === 1) {
            audio.currentTime = 0;
            audio.play();
        } else {
            nextBtn.click();
        }
    });
    
    function loadTrack(index) {
        if (isLoading) return;
        
        const track = playlist.tracks[index];
        if (!track) return;
        
        isLoading = true;
        
        if (loadTimeout) {
            clearTimeout(loadTimeout);
        }
        
        console.log(`🎵 Carregando: ${track.title}`);
        
        document.getElementById(`${playerId}-title`).textContent = track.title;
        document.getElementById(`${playerId}-artist`).textContent = track.artist;
        document.getElementById(`${playerId}-currentTrack`).textContent = index + 1;

        // ✅ CARREGAR CAPA INSTANTANEAMENTE (SEM LAZY LOADING)
        const coverImg = document.getElementById(`${playerId}-coverImg`);
        if (coverImg) {
            const newCover = track.cover || playlist.cover || 'images/capas-albuns/default-music.jpg';
            
            // ✅ Verificar se tem versões responsivas
            if (track.coverThumb && track.coverLarge) {
                coverImg.src = track.cover;
                
                coverImg.srcset = `
                    ${track.coverThumb} 400w,
                    ${track.cover} 800w,
                    ${track.coverLarge} 1600w
                `;
                
                coverImg.sizes = '400px';  // Player sempre 400px
            } else {
                // Fallback
                coverImg.src = newCover;
            }
        }
        
        // ✅ PRÉ-CARREGAR PRÓXIMAS CAPAS EM BACKGROUND
        preloadAdjacentCovers(index);
        
        if (progressBarFill) progressBarFill.style.width = '0%';
        if (currentTimeEl) currentTimeEl.textContent = '0:00';
        if (totalTimeEl) totalTimeEl.textContent = '0:00';
        
        audio.pause();
        audio.currentTime = 0;
        
        // ✅ SEM TIMEOUT - CARREGAR IMEDIATAMENTE
        // Atribuir fonte mas só forçar carregamento se já estiver tocando.
        audio.src = track.src;

        if (isPlaying) {
            // Se estiver tocando, fazer load completo
            try { 
                audio.load(); 
            } catch (e) { 
                console.warn('Erro ao carregar:', e); 
            }
            
            AudioManager.play(audio, playerId);
            
            audio.play()
                .then(() => {
                    isLoading = false;
                    
                    // Registrar player no MediaControlsManager quando começa a tocar
                    if (window.MediaControlsManager) {
                        window.MediaControlsManager.registerPlayer(playerId, playlist, currentTrackIndex);
                    }
                })
                .catch(err => {
                    console.warn('⚠️ Erro ao tocar:', err.message);
                    isLoading = false;
                });
        } else {
            // ✅ Se NÃO estiver tocando, carregar apenas metadados
            try {
                audio.load();
            } catch (e) {
                console.warn('Erro ao carregar metadados:', e);
            }
            
            isLoading = false;
        }
    }

    function preloadAdjacentCovers(currentIndex) {
        const totalTracks = playlist.tracks.length;
        
        // Pré-carregar apenas a próxima capa (1 item) para economizar banda
        const nextIndex = (currentIndex + 1) % totalTracks;
        const nextTrack = playlist.tracks[nextIndex];
        if (nextTrack && nextTrack.cover) {
            const img = new Image();
            img.src = nextTrack.cover;
        }
    }

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Detecta se o título da música é muito longo e precisa de animação
     */
    function checkLongTitle(playerId) {
        const titleElement = document.getElementById(`${playerId}-title`);
        
        if (!titleElement) return;
        
        // Verificar se o texto é maior que o container
        const isOverflowing = titleElement.scrollWidth > titleElement.clientWidth;
        
        if (isOverflowing) {
            titleElement.setAttribute('data-long-title', 'true');
            console.log(`📏 Título longo detectado: "${titleElement.textContent}"`);
        } else {
            titleElement.removeAttribute('data-long-title');
        }
    }
}

function showNavigationButtons() {
    const navButtons = document.getElementById('playlistNavButtons');
    if (navButtons && getTotalPlaylists() > 1) {
        navButtons.style.display = 'flex';
    }
}

function getTotalPlaylists() {
    return PlaylistManager.customPlaylists.length;
}

PlaylistManager.reload = async function() {
    console.log('🔄 Recarregando playlists...');
    
    const currentIndex = PlaylistManager.currentPlaylistIndex;
    console.log(`💾 Salvando índice atual: ${currentIndex}`);
    
    await loadPlaylistsFromFirebase();
    
    const carousel = document.getElementById('playlistCarousel');
    const indicators = document.getElementById('playlistIndicators');
    
    if (carousel && indicators) {
        carousel.innerHTML = '';
        indicators.innerHTML = '';
        
        PlaylistManager.customPlaylists.forEach((playlist, index) => {
            const slide = document.createElement('div');
            slide.className = `playlist-slide ${index === currentIndex ? 'active' : ''}`;
            slide.setAttribute('data-playlist', index);
            slide.innerHTML = `<div id="playlist-${index}-container"></div>`;
            carousel.appendChild(slide);
            
            const indicator = document.createElement('button');
            indicator.className = `playlist-indicator ${index === currentIndex ? 'active' : ''}`;
            indicator.setAttribute('data-index', index);
            indicator.innerHTML = `<i class="fas ${playlist.icon}"></i><span>${playlist.name}</span>`;
            indicator.addEventListener('click', () => switchToPlaylist(index));
            indicators.appendChild(indicator);
            
            const container = document.getElementById(`playlist-${index}-container`);
            createCustomPlayer(container, playlist, index);
        });
        
        setupIndicatorClicks();
        
        setTimeout(() => {
            if (currentIndex < PlaylistManager.customPlaylists.length) {
                switchToPlaylist(currentIndex);
            } else {
                switchToPlaylist(0);
            }
        }, 100);
    }
    
    console.log('✅ Playlists recarregadas!');
};

window.PlaylistManager = {
    init: initPlaylistManager,
    switchTo: switchToPlaylist,
    reload: PlaylistManager.reload,
    state: PlaylistManager
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initPlaylistManager, 1500));
} else {
    setTimeout(initPlaylistManager, 1500);
}


console.log('✅ playlist-manager.js carregado!');

// ===== SUPORTE A CONTROLES EXTERNOS (FONE DE OUVIDO E NOTIFICAÇÕES) =====
class MediaControlsManager {
    constructor() {
        this.currentPlayer = null;
        this.currentPlaylist = null;
        this.currentTrackIndex = 0;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        console.log('🎵 Inicializando MediaControlsManager...');

        // Configurar Media Session API para notificações do celular
        this.setupMediaSession();

        // Configurar event listeners para controles externos
        this.setupExternalControls();

        // Anexar listeners aos elementos de áudio existentes imediatamente
        this.attachListenersToExistingAudios();

        console.log('🎵 MediaControlsManager inicializado');
    }

    setupMediaSession() {
        if (!('mediaSession' in navigator)) {
            console.log('⚠️ Media Session API não suportado');
            return;
        }

        // Configurar ações básicas
        navigator.mediaSession.setActionHandler('play', () => {
            this.handleExternalPlay();
        });

        navigator.mediaSession.setActionHandler('pause', () => {
            this.handleExternalPause();
        });

        navigator.mediaSession.setActionHandler('nexttrack', () => {
            this.handleExternalNext();
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
            this.handleExternalPrevious();
        });

        navigator.mediaSession.setActionHandler('seekto', (details) => {
            this.handleExternalSeek(details.seekTime);
        });

        console.log('✅ Media Session API configurado');
    }

    setupExternalControls() {
        // Event listener para mudanças no estado do áudio (útil para fones de ouvido)
        document.addEventListener('visibilitychange', () => {
            // Quando o usuário volta para a aba, verificar se o estado mudou
            setTimeout(() => this.syncPlayerState(), 100);
        });

        // ✅ REMOVIDO: this.monitorAudioElements() - método não definido

        console.log('✅ Controles externos configurados');
    }

    attachListenersToExistingAudios() {
        // Anexar listeners aos elementos de áudio que já existem
        const existingAudios = document.querySelectorAll('audio');
        console.log(`🎵 Anexando listeners a ${existingAudios.length} elementos de áudio existentes`);

        existingAudios.forEach(audio => {
            this.attachAudioListeners(audio);
        });
    }

    attachAudioListeners(audio) {
        // Remover listeners antigos para evitar duplicatas
        audio.removeEventListener('play', this.onAudioPlay);
        audio.removeEventListener('pause', this.onAudioPause);
        audio.removeEventListener('ended', this.onAudioEnded);
        audio.removeEventListener('timeupdate', this.onAudioTimeUpdate);

        // Adicionar novos listeners
        this.onAudioPlay = () => this.handleAudioPlay(audio);
        this.onAudioPause = () => this.handleAudioPause(audio);
        this.onAudioEnded = () => this.handleAudioEnded(audio);
        this.onAudioTimeUpdate = () => this.handleAudioTimeUpdate(audio);

        audio.addEventListener('play', this.onAudioPlay);
        audio.addEventListener('pause', this.onAudioPause);
        audio.addEventListener('ended', this.onAudioEnded);
        audio.addEventListener('timeupdate', this.onAudioTimeUpdate);

        console.log(`🎵 Event listeners anexados ao áudio: ${audio.id}`);
    }

    handleAudioPlay(audio) {
        console.log('🎵 Evento play detectado no áudio:', audio.id);
        // Encontrar o player correspondente
        const player = this.findPlayerByAudio(audio);
        if (player) {
            console.log('✅ Player encontrado, atualizando UI para playing');
            this.updatePlayerUI(player, 'playing');
            this.updateMediaSession(player);
        } else {
            console.log('❌ Player não encontrado para áudio:', audio.id);
        }
    }

    handleAudioPause(audio) {
        console.log('⏸️ Evento pause detectado no áudio:', audio.id);
        // Encontrar o player correspondente
        const player = this.findPlayerByAudio(audio);
        if (player) {
            console.log('✅ Player encontrado, atualizando UI para paused');
            this.updatePlayerUI(player, 'paused');
        } else {
            console.log('❌ Player não encontrado para áudio:', audio.id);
        }
    }

    handleAudioEnded(audio) {
        // Encontrar o player correspondente e tocar próxima música
        const player = this.findPlayerByAudio(audio);
        if (player) {
            const nextBtn = player.querySelector('[id$="-nextBtn"]');
            if (nextBtn) {
                nextBtn.click();
            }
        }
    }

    handleAudioTimeUpdate(audio) {
        // Atualizar Media Session com progresso atual
        if ('mediaSession' in navigator && !audio.paused) {
            navigator.mediaSession.setPositionState({
                duration: audio.duration || 0,
                playbackRate: audio.playbackRate || 1,
                position: audio.currentTime || 0
            });
        }
    }

    handleExternalPlay() {
        const currentAudio = AudioManager.currentAudio;
        if (currentAudio && currentAudio.paused) {
            currentAudio.play().catch(err => console.warn('Erro ao tocar:', err));
        }
    }

    handleExternalPause() {
        const currentAudio = AudioManager.currentAudio;
        if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
        }
    }

    handleExternalNext() {
        const currentPlayer = AudioManager.currentPlayerId;
        if (currentPlayer) {
            const nextBtn = document.getElementById(`${currentPlayer}-nextBtn`);
            if (nextBtn) {
                nextBtn.click();
            }
        }
    }

    handleExternalPrevious() {
        const currentPlayer = AudioManager.currentPlayerId;
        if (currentPlayer) {
            const prevBtn = document.getElementById(`${currentPlayer}-prevBtn`);
            if (prevBtn) {
                prevBtn.click();
            }
        }
    }

    handleExternalSeek(seekTime) {
        const currentAudio = AudioManager.currentAudio;
        if (currentAudio && seekTime >= 0) {
            currentAudio.currentTime = seekTime;
        }
    }

    findPlayerByAudio(audio) {
        // Encontrar o player container baseado no elemento de áudio
        const audioId = audio.id;
        console.log('🔍 Procurando player para áudio ID:', audioId);

        if (audioId) {
            const playerId = audioId.replace('custom-audio-', 'custom-player-');
            console.log('🎯 Player ID esperado:', playerId);
            const player = document.getElementById(playerId);
            if (player) {
                console.log('✅ Player encontrado:', playerId);
                return player;
            } else {
                console.log('❌ Player não encontrado com ID:', playerId);
            }
        }

        // Fallback: procurar pelo áudio dentro do player
        console.log('🔄 Tentando fallback - procurando player que contém este áudio');
        const players = document.querySelectorAll('.music-player');
        for (const player of players) {
            if (player.contains(audio)) {
                console.log('✅ Player encontrado via fallback');
                return player;
            }
        }

        console.log('❌ Nenhum player encontrado');
        return null;
    }

    updatePlayerUI(player, state) {
        console.log('🎨 Atualizando UI do player para estado:', state);
        const playPauseBtn = player.querySelector('.play-pause-btn');
        const playerContainer = player.closest('.music-player');

        console.log('🔍 Botão play/pause encontrado:', !!playPauseBtn);
        console.log('🔍 Container do player encontrado:', !!playerContainer);

        if (state === 'playing') {
            if (playPauseBtn) {
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                console.log('✅ Ícone alterado para PAUSE');
            }
            if (playerContainer) {
                playerContainer.classList.add('playing');
                console.log('✅ Classe "playing" adicionada');
            }
        } else if (state === 'paused') {
            if (playPauseBtn) {
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                console.log('✅ Ícone alterado para PLAY');
            }
            if (playerContainer) {
                playerContainer.classList.remove('playing');
                console.log('✅ Classe "playing" removida');
            }
        }
    }

    updateMediaSession(player) {
        if (!('mediaSession' in navigator)) return;

        const titleEl = player.querySelector('[id$="-title"]');
        const artistEl = player.querySelector('[id$="-artist"]');
        const coverImg = player.querySelector('[id$="-coverImg"]');
        const audio = player.querySelector('audio');

        if (titleEl && artistEl) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: titleEl.textContent,
                artist: artistEl.textContent,
                album: 'Kevin & Iara',
                artwork: coverImg ? [{ src: coverImg.src, sizes: '400x400', type: 'image/jpeg' }] : []
            });
        }

        // Atualizar estado de reprodução
        if (audio) {
            navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
        }
    }

    syncPlayerState() {
        // Sincronizar estado quando o usuário volta para a aba
        const currentAudio = AudioManager.currentAudio;
        const currentPlayerId = AudioManager.currentPlayerId;

        if (currentAudio && currentPlayerId) {
            const player = document.getElementById(currentPlayerId);
            if (player) {
                this.updatePlayerUI(player, currentAudio.paused ? 'paused' : 'playing');
                this.updateMediaSession(player);
            }
        }
    }

    // Método para registrar um player ativo
    registerPlayer(playerId, playlist, trackIndex) {
        this.currentPlayer = playerId;
        this.currentPlaylist = playlist;
        this.currentTrackIndex = trackIndex;

        const player = document.getElementById(playerId);
        if (player) {
            this.updateMediaSession(player);
        }
    }
}

// Instância global
const mediaControlsManager = new MediaControlsManager();

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar imediatamente após os players serem criados
    setTimeout(() => {
        mediaControlsManager.init();
        console.log('🎵 MediaControlsManager inicializado após criação dos players');
    }, 500); // Reduzido para 500ms
});

// Exportar para uso global
window.MediaControlsManager = mediaControlsManager;