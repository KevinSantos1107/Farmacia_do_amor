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
    
    carousel.style.transition = 'transform 0.3s ease';
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
            
            <audio id="${audioId}" preload="metadata"></audio>
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
    
    audio.preload = 'metadata';
    audio.volume = 0.8;
    
    loadTrack(currentTrackIndex);
    
    playPauseBtn.addEventListener('click', () => {
        if (audio.paused) {
            AudioManager.play(audio, playerId);
            
            audio.play().then(() => {
                isPlaying = true;
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                document.getElementById(playerId).classList.add('playing');
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

        
        const coverImg = document.getElementById(`${playerId}-coverImg`);
        if (coverImg) {
            const newCover = track.cover || playlist.cover || 'images/capas-albuns/default-music.jpg';
            coverImg.src = newCover;
        }
        
        if (progressBarFill) progressBarFill.style.width = '0%';
        if (currentTimeEl) currentTimeEl.textContent = '0:00';
        if (totalTimeEl) totalTimeEl.textContent = '0:00';
        
        audio.pause();
        audio.currentTime = 0;
        
        loadTimeout = setTimeout(() => {
            audio.src = track.src;
            audio.load();
            
            if (isPlaying) {
                AudioManager.play(audio, playerId);
                
                audio.play()
                    .then(() => {
                        isLoading = false;
                    })
                    .catch(err => {
                        console.warn('⚠️ Erro ao tocar:', err.message);
                        isLoading = false;
                    });
            } else {
                isLoading = false;
            }
        }, 100);
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
