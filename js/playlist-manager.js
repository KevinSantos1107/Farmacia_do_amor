// ===== GERENCIADOR DE PLAYLISTS COM FIREBASE - CRIA PLAYER INICIAL =====
console.log('🎵 Sistema de Playlists com Firebase carregado');

// ===== GERENCIADOR GLOBAL DE ÁUDIO COM CLEANUP =====
const AudioManager = {
    currentAudio: null,
    currentPlayerId: null,
    audioCache: new Map(),
    
    play(audioElement, playerId) {
        if (this.currentAudio && this.currentAudio !== audioElement) {
            this.currentAudio.pause();
            if (this.currentPlayerId) {
                this.updatePlayerUI(this.currentPlayerId, false);
            }
        }

        const resolvedPlayerId = playerId || this.findPlayerIdByAudio(audioElement);
        this.currentAudio = audioElement;
        this.currentPlayerId = resolvedPlayerId;
        
        if (resolvedPlayerId) {
            this.updatePlayerUI(resolvedPlayerId, true);
        }
        
        console.log(`🎵 AudioManager: Tocando em ${resolvedPlayerId || 'audio desconhecido'}`);
    },
    
    pause() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            if (this.currentPlayerId) {
                this.updatePlayerUI(this.currentPlayerId, false);
            }
        }
    },
    
    isPlaying(audioElement) {
        return this.currentAudio === audioElement && !audioElement.paused;
    },

    findPlayerIdByAudio(audioElement) {
        if (!audioElement) return null;
        if (audioElement.id) {
            const playerId = audioElement.id.replace('custom-audio-', 'custom-player-');
            if (document.getElementById(playerId)) return playerId;
        }
        const players = document.querySelectorAll('.music-player');
        for (const player of players) {
            if (player.contains(audioElement)) return player.id;
        }
        return null;
    },

    updatePlayerUI(playerId, isPlaying) {
        if (!playerId) return;
        const player = document.getElementById(playerId);
        if (!player) return;
        const playPauseBtn = player.querySelector('.play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        }
        player.classList.toggle('playing', Boolean(isPlaying));
    },
    
    registerAudio(audioElement, playerId) {
        this.audioCache.set(playerId, audioElement);
    },
    
    cleanupPlayer(playerId) {
        if (!this.audioCache.has(playerId)) return;
        const audio = this.audioCache.get(playerId);
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (e) {}
        if (this.currentPlayerId === playerId) {
            this.currentAudio = null;
            this.currentPlayerId = null;
        }
        console.log(`🧹 Audio cleanup: ${playerId}`);
    },
    
    cleanupPlayersExcept(exceptPlayerId) {
        if (this.audioCache.size === 0) return;
        const playersToClean = Array.from(this.audioCache.keys()).filter(id => id !== exceptPlayerId);
        playersToClean.forEach(playerId => this.cleanupPlayer(playerId));
        if (playersToClean.length > 0) {
            console.log(`🧹 Cleanup: ${playersToClean.length} players antigos resetados`);
        }
    },
    
    cleanupAll() {
        this.audioCache.forEach((audio) => {
            audio.pause();
            audio.currentTime = 0;
        });
        this.audioCache.clear();
        this.currentAudio = null;
        this.currentPlayerId = null;
        console.log('🧹 Cleanup total: Todos os players deletados do cache');
    }
};

window.AudioManager = AudioManager;

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
        if (PlaylistManager.customPlaylists.length > 0) {
            createInitialPlayer();
        } else {
            console.warn('⚠️ Nenhuma playlist encontrada no Firebase.');
        }
        
        setupIndicatorClicks();
        
        if (getTotalPlaylists() > 1) {
            showNavigationButtons();
        }
        
        PlaylistManager.initialized = true;
        console.log('✅ Playlists prontas!');

        if (window.MediaControlsManager) {
            window.MediaControlsManager.init();
        }
    });
}

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

function createInitialPlayer() {
    const playerSection = document.querySelector('.music-player-section');
    if (!playerSection) {
        console.error('❌ Seção do player não encontrada');
        return;
    }
    
    const firstPlaylist = PlaylistManager.customPlaylists[0];
    console.log(`🎵 Criando player inicial com playlist: ${firstPlaylist.name}`);
    
    const playlistContainer = document.createElement('div');
    playlistContainer.className = 'playlist-carousel-container';
    playlistContainer.innerHTML = `
        <div class="playlist-indicators" id="playlistIndicators"></div>
        <div class="playlist-carousel-wrapper">
            <div class="playlist-carousel" id="playlistCarousel"></div>
        </div>
    `;
    
    playerSection.appendChild(playlistContainer);
    
    const carousel = document.getElementById('playlistCarousel');
    const indicators = document.getElementById('playlistIndicators');
    
    PlaylistManager.customPlaylists.forEach((playlist, index) => {
        const slide = document.createElement('div');
        slide.className = `playlist-slide ${index === 0 ? 'active' : ''}`;
        slide.setAttribute('data-playlist', index);
        slide.innerHTML = `<div id="playlist-${index}-container"></div>`;
        carousel.appendChild(slide);
        
        const indicator = document.createElement('button');
        indicator.className = `playlist-indicator ${index === 0 ? 'active' : ''}`;
        indicator.setAttribute('data-index', index);
        indicator.innerHTML = `<i class="fas ${playlist.icon}"></i><span>${playlist.name}</span>`;
        indicator.addEventListener('click', () => switchToPlaylist(index));
        indicators.appendChild(indicator);
        
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
    
    PlaylistManager.currentPlaylistIndex = index;
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
    
    const audioElement = document.getElementById(audioId);
    AudioManager.registerAudio(audioElement, playerId);

    if (window.MediaControlsManager) {
        window.MediaControlsManager.attachAudioListeners(audioElement);
    }
    
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
    let shuffleOrder = [];
    let shufflePosition = 0;
    let repeatMode = 0;
    let isLoading = false;
    let loadTimeout = null;

    function createShuffleOrder(startIndex = 0) {
        const indices = playlist.tracks.map((_, i) => i).filter(i => i !== startIndex);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        shuffleOrder = [startIndex, ...indices];
        shufflePosition = 0;
    }

    audio.preload = 'metadata';
    audio.volume = 0.8;
    
    loadTrack(currentTrackIndex);
    
    playPauseBtn.addEventListener('click', () => {
        if (audio.paused) {
            AudioManager.play(audio, playerId);

            if (audio.dataset && audio.dataset.src) {
                audio.src = audio.dataset.src;
                delete audio.dataset.src;
                try { audio.load(); } catch (e) {}
            }
            
            AudioManager.cleanupPlayersExcept(playerId);

            audio.play().then(() => {
                isPlaying = true;
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                document.getElementById(playerId).classList.add('playing');
                
                if (window.MediaControlsManager) {
                    window.MediaControlsManager.registerPlayer(playerId, playlist, currentTrackIndex);
                }
            }).catch(err => {
                console.warn('⚠️ Erro ao tocar:', err.message);
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
            if (isShuffled && shuffleOrder.length > 0) {
                shufflePosition = (shufflePosition - 1 + shuffleOrder.length) % shuffleOrder.length;
                currentTrackIndex = shuffleOrder[shufflePosition];
            } else {
                currentTrackIndex = (currentTrackIndex - 1 + playlist.tracks.length) % playlist.tracks.length;
            }
            loadTrack(currentTrackIndex);
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (isLoading) return;
        if (isShuffled && shuffleOrder.length > 0) {
            shufflePosition = (shufflePosition + 1) % shuffleOrder.length;
            currentTrackIndex = shuffleOrder[shufflePosition];
        } else {
            currentTrackIndex = (currentTrackIndex + 1) % playlist.tracks.length;
        }
        loadTrack(currentTrackIndex);
    });
    
    shuffleBtn.addEventListener('click', () => {
        isShuffled = !isShuffled;
        shuffleBtn.classList.toggle('active', isShuffled);
        if (isShuffled) {
            createShuffleOrder(currentTrackIndex);
        } else {
            shuffleOrder = [];
            shufflePosition = 0;
        }
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
        
        if (loadTimeout) clearTimeout(loadTimeout);
        
        console.log(`🎵 Carregando: ${track.title}`);
        
        if (isShuffled) {
            if (!shuffleOrder.length || shuffleOrder[shufflePosition] !== index) {
                if (shuffleOrder.length && shuffleOrder.includes(index)) {
                    shufflePosition = shuffleOrder.indexOf(index);
                } else {
                    createShuffleOrder(index);
                }
            }
        } else {
            shuffleOrder = [];
            shufflePosition = 0;
        }

        document.getElementById(`${playerId}-title`).textContent = track.title;
        document.getElementById(`${playerId}-artist`).textContent = track.artist;
        document.getElementById(`${playerId}-currentTrack`).textContent = index + 1;

        // ✅ Atualizar Media Session IMEDIATAMENTE ao trocar faixa
        // (não esperar o play; isso preenche a notificação mesmo antes de tocar)
        if (window.MediaControlsManager) {
            window.MediaControlsManager.registerPlayer(playerId, playlist, index);
        }

        const coverImg = document.getElementById(`${playerId}-coverImg`);
        if (coverImg) {
            const newCover = track.cover || playlist.cover || 'images/capas-albuns/default-music.jpg';
            if (track.coverThumb && track.coverLarge) {
                coverImg.src = track.cover;
                coverImg.srcset = `${track.coverThumb} 400w, ${track.cover} 800w, ${track.coverLarge} 1600w`;
                coverImg.sizes = '400px';
            } else {
                coverImg.src = newCover;
            }
        }
        
        preloadAdjacentCovers(index);
        
        if (progressBarFill) progressBarFill.style.width = '0%';
        if (currentTimeEl) currentTimeEl.textContent = '0:00';
        if (totalTimeEl) totalTimeEl.textContent = '0:00';
        
        audio.pause();
        audio.currentTime = 0;
        audio.src = track.src;

        if (isPlaying) {
            try { audio.load(); } catch (e) { console.warn('Erro ao carregar:', e); }
            
            AudioManager.play(audio, playerId);
            
            audio.play()
                .then(() => {
                    isLoading = false;
                    if (window.MediaControlsManager) {
                        window.MediaControlsManager.registerPlayer(playerId, playlist, index);
                    }
                })
                .catch(err => {
                    console.warn('⚠️ Erro ao tocar:', err.message);
                    isLoading = false;
                });
        } else {
            try { audio.load(); } catch (e) { console.warn('Erro ao carregar metadados:', e); }
            isLoading = false;
        }
    }

    function preloadAdjacentCovers(currentIndex) {
        const nextIndex = (currentIndex + 1) % playlist.tracks.length;
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
    AudioManager.cleanupAll();
    
    const currentIndex = PlaylistManager.currentPlaylistIndex;
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
            switchToPlaylist(currentIndex < PlaylistManager.customPlaylists.length ? currentIndex : 0);
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


// ===================================================================
// ===== MEDIA CONTROLS MANAGER — INTEGRAÇÃO COM NOTIFICAÇÕES =====
// ===================================================================
class MediaControlsManager {
    constructor() {
        this.currentPlayerId  = null;
        this.currentPlaylist  = null;
        this.currentTrackIndex = 0;
        this.isInitialized    = false;
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log('🎵 Inicializando MediaControlsManager...');
        this._setupMediaSession();
        this._setupVisibilitySync();
        this._attachToExistingAudios();
        console.log('✅ MediaControlsManager inicializado');
    }

    // ------------------------------------------------------------------
    // SETUP DA MEDIA SESSION API
    // ------------------------------------------------------------------
    _setupMediaSession() {
        if (!('mediaSession' in navigator)) {
            console.warn('⚠️ Media Session API não suportada neste browser');
            return;
        }

        const actions = {
            play          : () => this._externalPlay(),
            pause         : () => this._externalPause(),
            stop          : () => this._externalPause(),
            nexttrack     : () => this._externalNext(),
            previoustrack : () => this._externalPrev(),
            seekto        : (d) => this._externalSeek(d.seekTime),
            seekbackward  : (d) => this._externalSkip(-(d.seekOffset || 10)),
            seekforward   : (d) => this._externalSkip( (d.seekOffset || 10)),
        };

        for (const [action, handler] of Object.entries(actions)) {
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch (e) {
                // Alguns browsers não suportam todas as ações; ignorar silenciosamente
            }
        }

        console.log('✅ Handlers da Media Session configurados');
    }

    // ------------------------------------------------------------------
    // SINCRONIZAR ESTADO QUANDO O USUÁRIO VOLTA PARA A ABA
    // ------------------------------------------------------------------
    _setupVisibilitySync() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => this._syncState(), 200);
            }
        });
    }

    // ------------------------------------------------------------------
    // REGISTRAR LISTENERS NOS ÁUDIOS JÁ EXISTENTES NO DOM
    // ------------------------------------------------------------------
    _attachToExistingAudios() {
        document.querySelectorAll('audio').forEach(a => this.attachAudioListeners(a));
    }

    // ------------------------------------------------------------------
    // EVENTOS DO ELEMENTO <audio>
    // ------------------------------------------------------------------
    attachAudioListeners(audio) {
        if (!audio || audio._mcmAttached) return;
        audio._mcmAttached = true;

        audio.addEventListener('play',       () => this._onPlay(audio));
        audio.addEventListener('pause',      () => this._onPause(audio));
        audio.addEventListener('ended',      () => this._onEnded(audio));
        audio.addEventListener('timeupdate', () => this._onTimeUpdate(audio));
        audio.addEventListener('loadedmetadata', () => this._onMetadataLoaded(audio));
    }

    _onPlay(audio) {
        const player = this._playerOf(audio);
        if (player) {
            this._setPlayerState(player, 'playing');
            this._pushMetadata(player);          // ✅ garante metadados na notificação
        }
        this._setPlaybackState('playing');
    }

    _onPause(audio) {
        const player = this._playerOf(audio);
        if (player) this._setPlayerState(player, 'paused');
        this._setPlaybackState('paused');
    }

    _onEnded(audio) {
        const player = this._playerOf(audio);
        if (player) {
            const nextBtn = player.querySelector('[id$="-nextBtn"]');
            nextBtn?.click();
        }
    }

    _onTimeUpdate(audio) {
        // ✅ Só atualiza posição quando os valores são válidos
        // Evita erros que fazem o OS descartar a notificação
        if (!('mediaSession' in navigator)) return;
        const dur = audio.duration;
        if (!dur || isNaN(dur) || !isFinite(dur) || dur <= 0) return;
        if (audio.paused) return;

        try {
            navigator.mediaSession.setPositionState({
                duration    : dur,
                playbackRate: audio.playbackRate || 1,
                position    : Math.min(audio.currentTime || 0, dur),
            });
        } catch (e) {
            // Ignorar; alguns browsers rejeitam setPositionState em certos estados
        }
    }

    _onMetadataLoaded(audio) {
        // Assim que a duração fica disponível, empurrar posição inicial
        this._onTimeUpdate(audio);
    }

    // ------------------------------------------------------------------
    // CONTROLES EXTERNOS (fone de ouvido, notificação, Bluetooth)
    // ------------------------------------------------------------------
    _externalPlay() {
        const a = AudioManager.currentAudio;
        if (a && a.paused) a.play().catch(() => {});
    }

    _externalPause() {
        const a = AudioManager.currentAudio;
        if (a && !a.paused) a.pause();
    }

    _externalNext() {
        const btn = document.getElementById(`${AudioManager.currentPlayerId}-nextBtn`);
        btn?.click();
    }

    _externalPrev() {
        const btn = document.getElementById(`${AudioManager.currentPlayerId}-prevBtn`);
        btn?.click();
    }

    _externalSeek(time) {
        const a = AudioManager.currentAudio;
        if (a && time >= 0) a.currentTime = time;
    }

    _externalSkip(delta) {
        const a = AudioManager.currentAudio;
        if (!a) return;
        const next = a.currentTime + delta;
        a.currentTime = Math.max(0, a.duration ? Math.min(a.duration, next) : next);
    }

    // ------------------------------------------------------------------
    // HELPERS INTERNOS
    // ------------------------------------------------------------------
    _playerOf(audio) {
        if (!audio) return null;
        if (audio.id) {
            const p = document.getElementById(audio.id.replace('custom-audio-', 'custom-player-'));
            if (p) return p;
        }
        for (const p of document.querySelectorAll('.music-player')) {
            if (p.contains(audio)) return p;
        }
        return null;
    }

    _setPlayerState(player, state) {
        const btn = player.querySelector('.play-pause-btn');
        if (!btn) return;
        if (state === 'playing') {
            btn.innerHTML = '<i class="fas fa-pause"></i>';
            player.classList.add('playing');
        } else {
            btn.innerHTML = '<i class="fas fa-play"></i>';
            player.classList.remove('playing');
        }
    }

    _setPlaybackState(state) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = state;
        }
    }

    // ------------------------------------------------------------------
    // EMPURRAR METADADOS PARA A NOTIFICAÇÃO DO CELULAR
    // ------------------------------------------------------------------
    _pushMetadata(player) {
        if (!('mediaSession' in navigator)) return;

        const titleEl  = player.querySelector('[id$="-title"]');
        const artistEl = player.querySelector('[id$="-artist"]');
        const coverEl  = player.querySelector('[id$="-coverImg"]');

        const title  = titleEl?.textContent?.trim()  || 'Música';
        const artist = artistEl?.textContent?.trim() || 'Artista';

        // ✅ Converter src da imagem para URL absoluta
        // A API exige URL absoluta; URLs relativas resultam em capa cinza
        let artworkSrc = '';
        if (coverEl && coverEl.src) {
            try {
                // coverEl.src já retorna URL absoluta no browser
                artworkSrc = new URL(coverEl.src, window.location.href).href;
            } catch (e) {
                artworkSrc = coverEl.src;
            }
        }

        // ✅ Montar lista de artwork com múltiplos tamanhos para melhor qualidade
        const artwork = artworkSrc
            ? [
                { src: artworkSrc, sizes: '96x96',   type: 'image/jpeg' },
                { src: artworkSrc, sizes: '128x128',  type: 'image/jpeg' },
                { src: artworkSrc, sizes: '192x192',  type: 'image/jpeg' },
                { src: artworkSrc, sizes: '256x256',  type: 'image/jpeg' },
                { src: artworkSrc, sizes: '384x384',  type: 'image/jpeg' },
                { src: artworkSrc, sizes: '512x512',  type: 'image/jpeg' },
            ]
            : [];

        navigator.mediaSession.metadata = new MediaMetadata({
            title,
            artist,
            album  : 'Kevin & Iara',
            artwork,
        });

        console.log(`🎵 Media Session atualizada: "${title}" — ${artist} | capa: ${artworkSrc || 'nenhuma'}`);
    }

    _syncState() {
        const a  = AudioManager.currentAudio;
        const id = AudioManager.currentPlayerId;
        if (!a || !id) return;
        const player = document.getElementById(id);
        if (player) {
            this._setPlayerState(player, a.paused ? 'paused' : 'playing');
            this._pushMetadata(player);
        }
        this._setPlaybackState(a.paused ? 'paused' : 'playing');
    }

    // ------------------------------------------------------------------
    // API PÚBLICA — chamada pelo player ao trocar de faixa
    // ------------------------------------------------------------------
    registerPlayer(playerId, playlist, trackIndex) {
        this.currentPlayerId   = playerId;
        this.currentPlaylist   = playlist;
        this.currentTrackIndex = trackIndex;

        const player = document.getElementById(playerId);
        if (player) {
            // ✅ Empurrar metadados imediatamente, sem esperar evento de play
            this._pushMetadata(player);
        }
    }

    // Compatibilidade com chamadas legadas que passavam o player element
    updateMediaSession(playerOrId) {
        const player = typeof playerOrId === 'string'
            ? document.getElementById(playerOrId)
            : playerOrId;
        if (player) this._pushMetadata(player);
    }
}

// ------------------------------------------------------------------
// INSTÂNCIA GLOBAL
// ------------------------------------------------------------------
const mediaControlsManager = new MediaControlsManager();

document.addEventListener('DOMContentLoaded', () => {
    // Aguardar os players estarem no DOM antes de inicializar
    setTimeout(() => {
        mediaControlsManager.init();
        console.log('🎵 MediaControlsManager pronto');
    }, 500);
});

window.MediaControlsManager = mediaControlsManager;