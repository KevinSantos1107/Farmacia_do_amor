document.addEventListener('DOMContentLoaded', (event) => {
    // =========================================================
    // 1. Contador de Tempo
    // =========================================================

    const startDate = new Date(2024, 9, 20, 17, 0, 0); 
    const countdownDisplay = document.getElementById('countdown-display');

    if (countdownDisplay) {
        function updateCountdown() {
            const now = new Date();
            const diff = now.getTime() - startDate.getTime();

            if (diff < 0) {
                countdownDisplay.innerHTML = `<span style="color: #ff6b6b;">Aguardando o início...</span>`;
                return;
            }

            const totalSeconds = Math.floor(diff / 1000);
            const totalMinutes = Math.floor(totalSeconds / 60);
            const totalHours = Math.floor(totalMinutes / 60);
            const totalDays = Math.floor(totalHours / 24);
            
            const years = Math.floor(totalDays / 365);
            const months = Math.floor((totalDays % 365) / 30);
            const days = (totalDays % 365) % 30;
            const hours = totalHours % 24;
            const minutes = totalMinutes % 60;
            const seconds = totalSeconds % 60;

            const yearText = years > 0 ? `${years} ano${years !== 1 ? 's' : ''}, ` : '';
            const monthText = months > 0 ? `${months} mês${months !== 1 ? 'es' : ''}, ` : '';
            const dayText = `${days} dia${days !== 1 ? 's' : ''}`;

            countdownDisplay.innerHTML = `
                <span style="color: #1db954;">${yearText}${monthText}${dayText}</span><br>
                ${hours.toString().padStart(2, '0')}h : 
                ${minutes.toString().padStart(2, '0')}m : 
                ${seconds.toString().padStart(2, '0')}s
            `;
        }
        
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    // =========================================================
    // 2. Player de Áudio - COM LOOP CONTÍNUO
    // =========================================================

    // --- PLAYLIST ---
    const playlist = [
        { 
            title: "Menina da Farmácia 2", 
            artist: "Kevin Santos / Nossa Canção", 
            src: "audio/menina-da-farmacia-2.mp3",
            cover: "images/capa_principal.jpg"
        },
        { 
            title: "Menina da Farmácia", 
            artist: "Kevin Santos / Nossa Canção", 
            src: "audio/menina-da-farmacia.mp3",
            cover: "images/capa2.jpg" 
        }
    ];
    
    // --- VARIÁVEIS DE ESTADO ---
    let currentTrackIndex = 0;
    let isShuffleOn = false;
    let shuffledPlaylist = [];
    let repeatState = 0; // 0=Desligado, 1=Repetir Playlist, 2=Repetir Música

    // --- ELEMENTOS HTML ---
    const audio = document.getElementById('audio');
    const btnPlayPause = document.getElementById('btnPlayPause');
    const btnPrev = document.getElementById('btnPrev'); 
    const btnNext = document.getElementById('btnNext'); 
    const btnShuffle = document.getElementById('btnShuffle'); 
    const btnRepeat = document.getElementById('btnRepeat'); 
    const progressBar = document.getElementById('progressBar');
    const currentTimeDisplay = document.getElementById('currentTimeDisplay');
    const durationDisplay = document.getElementById('durationDisplay');
    const songTitleDisplay = document.querySelector('.song-title');
    const songArtistDisplay = document.querySelector('.song-artist');
    const musicCoverImage = document.querySelector('.music-cover img');
    const currentTrackNumber = document.getElementById('currentTrackNumber');
    const totalTracks = document.getElementById('totalTracks');
    const audioCard = document.querySelector('.audio-card');

    // Controle de clique duplo
    let lastClickTime = 0;
    const doubleClickThreshold = 500;
    const restartThreshold = 3;

    // --- FUNÇÕES AUXILIARES ---
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function updateProgressFill() {
        if (!audio.duration || isNaN(audio.duration)) return;
        const currentTime = audio.currentTime || 0;
        const duration = audio.duration;
        const progress = (currentTime / duration) * 100;
        
        // Atualiza visual da barra com gradiente
        progressBar.style.background = `linear-gradient(to right, 
            #1db954 0%, #1db954 ${progress}%, 
            rgba(255, 255, 255, 0.1) ${progress}%, 
            rgba(255, 255, 255, 0.1) 100%)`;
    }

    function updateTrackCounter() {
        if (currentTrackNumber) {
            currentTrackNumber.textContent = currentTrackIndex + 1;
        }
    }

    function getCurrentPlaylist() {
        return isShuffleOn ? shuffledPlaylist : playlist;
    }

    // --- FUNÇÕES DE CONTROLE ---

    function loadTrack(index, shouldPlay = false) {
        const currentList = getCurrentPlaylist();
        
        if (index < 0 || index >= currentList.length) {
            console.error("Índice inválido:", index);
            return;
        }
        
        const track = currentList[index];
        currentTrackIndex = index;
        
        console.log("Carregando faixa:", track.title, "Índice:", index, "Play:", shouldPlay);
        
        // Atualiza interface
        songTitleDisplay.textContent = track.title;
        songArtistDisplay.textContent = track.artist;
        
        if (musicCoverImage) {
            musicCoverImage.src = track.cover;
            musicCoverImage.alt = `Capa: ${track.title}`;
        }
        
        updateTrackCounter();
        
        // Define a nova fonte do áudio
        audio.src = track.src;
        
        // Limpa event listeners antigos para evitar duplicação
        audio.onloadedmetadata = null;
        audio.oncanplay = null;
        
        // Quando os metadados carregarem
        audio.onloadedmetadata = () => {
            console.log("Metadados carregados para:", track.title, "Duração:", audio.duration);
            
            if (audio.duration && !isNaN(audio.duration)) {
                progressBar.max = Math.floor(audio.duration);
                durationDisplay.textContent = formatTime(audio.duration);
                
                // RESET: Define tempo atual para 0
                audio.currentTime = 0;
                progressBar.value = 0;
                currentTimeDisplay.textContent = '0:00';
                updateProgressFill();
            }
            
            // Se deve tocar após carregar
            if (shouldPlay) {
                audio.play().then(() => {
                    console.log("Tocando após loadTrack:", track.title);
                    btnPlayPause.textContent = '⏸';
                    btnPlayPause.classList.add('playing');
                    if (audioCard) audioCard.classList.add('playing');
                }).catch(e => {
                    console.error("Erro ao tocar:", e);
                });
            } else {
                btnPlayPause.textContent = '▶';
                btnPlayPause.classList.remove('playing');
                if (audioCard) audioCard.classList.remove('playing');
            }
        };
        
        // Tratamento de erro
        audio.onerror = () => {
            console.error("Erro ao carregar áudio:", track.src);
            // Tenta próxima música
            setTimeout(() => nextTrack(false), 1000);
        };
        
        // Força o carregamento
        audio.load();
    }

    function playPause() {
        if (audio.paused) {
            audio.play().then(() => {
                btnPlayPause.textContent = '⏸';
                btnPlayPause.classList.add('playing');
                if (audioCard) audioCard.classList.add('playing');
                console.log("Iniciou playback");
            }).catch(e => {
                console.error("Erro ao tocar:", e);
            });
        } else {
            audio.pause();
            btnPlayPause.textContent = '▶';
            btnPlayPause.classList.remove('playing');
            if (audioCard) audioCard.classList.remove('playing');
        }
    }

    function nextTrack(fromEnded = false) {
        console.log("nextTrack chamado, fromEnded:", fromEnded, "repeatState:", repeatState);
        
        const currentList = getCurrentPlaylist();
        const wasPlaying = !audio.paused || fromEnded;
        
        if (repeatState === 2) {
            // Repetir música atual
            audio.currentTime = 0;
            if (wasPlaying) {
                audio.play();
            }
            return;
        }
        
        // Calcula próximo índice
        let nextIndex = currentTrackIndex + 1;
        
        // VERIFICA SE É A ÚLTIMA MÚSICA - LOOP CONTÍNUO
        if (nextIndex >= currentList.length) {
            // Volta para a primeira música (loop contínuo)
            nextIndex = 0;
            
            // Se shuffle está ativo, pega a primeira da lista embaralhada
            if (isShuffleOn && shuffledPlaylist.length > 0) {
                // Mantém a lista embaralhada, mas volta para o início
                nextIndex = 0;
            }
        }
        
        console.log("Indice atual:", currentTrackIndex, "Próximo índice:", nextIndex, "Total:", currentList.length);
        
        // Carrega próxima música e toca se estava tocando
        loadTrack(nextIndex, wasPlaying);
    }

    function prevTrack() {
        const now = Date.now();
        const isDoubleClick = (now - lastClickTime < doubleClickThreshold);
        const hasPassedThreshold = audio.currentTime > restartThreshold;
        const wasPlaying = !audio.paused;
        
        if (isDoubleClick || !hasPassedThreshold) {
            // Volta para faixa anterior
            const currentList = getCurrentPlaylist();
            let prevIndex = currentTrackIndex - 1;
            
            // Se for a primeira música, vai para a última (LOOP)
            if (prevIndex < 0) {
                prevIndex = currentList.length - 1;
            }
            
            loadTrack(prevIndex, wasPlaying);
            
            if (isDoubleClick) {
                lastClickTime = 0;
            }
        } else {
            // Reinicia a faixa atual
            audio.currentTime = 0;
            if (wasPlaying) {
                audio.play().catch(e => console.error("Erro ao tocar:", e));
            }
        }
        
        lastClickTime = now;
    }

    function toggleShuffle() {
        console.log("toggleShuffle chamado, estado atual:", isShuffleOn);
        
        // Salva se estava tocando
        const wasPlaying = !audio.paused;
        
        isShuffleOn = !isShuffleOn;
        
        if (isShuffleOn) {
            // Ativa shuffle
            btnShuffle.classList.add('active');
            
            // Cria lista embaralhada
            shuffledPlaylist = [...playlist];
            
            // Embaralha TODO o array (incluindo a música atual)
            for (let i = shuffledPlaylist.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledPlaylist[i], shuffledPlaylist[j]] = [shuffledPlaylist[j], shuffledPlaylist[i]];
            }
            
            // Encontra a posição da música atual na nova lista embaralhada
            const currentTrackTitle = playlist[currentTrackIndex].title;
            const newIndex = shuffledPlaylist.findIndex(t => t.title === currentTrackTitle);
            
            if (newIndex !== -1) {
                currentTrackIndex = newIndex;
            }
            
            console.log("Shuffle ativado. Nova lista:", shuffledPlaylist.map(t => t.title));
            
        } else {
            // Desativa shuffle
            btnShuffle.classList.remove('active');
            
            // Encontra a posição da música atual na playlist original
            const currentTrackTitle = shuffledPlaylist[currentTrackIndex].title;
            const originalIndex = playlist.findIndex(t => t.title === currentTrackTitle);
            
            if (originalIndex !== -1) {
                currentTrackIndex = originalIndex;
            }
            
            shuffledPlaylist = [];
            console.log("Shuffle desativado. Voltando para playlist original.");
        }
        
        // Carrega a MESMA música (não reinicia do zero)
        const currentList = getCurrentPlaylist();
        const track = currentList[currentTrackIndex];
        
        // Atualiza interface
        songTitleDisplay.textContent = track.title;
        songArtistDisplay.textContent = track.artist;
        
        if (musicCoverImage) {
            musicCoverImage.src = track.cover;
        }
        
        updateTrackCounter();
        
        // Se tinha uma fonte de áudio, mantém tocando no mesmo ponto
        if (audio.src && audio.src.includes(track.src)) {
            // Já está na música certa, apenas continua
            if (wasPlaying && audio.paused) {
                audio.play().then(() => {
                    btnPlayPause.textContent = '⏸';
                    btnPlayPause.classList.add('playing');
                    if (audioCard) audioCard.classList.add('playing');
                });
            }
        } else {
            // Precisa carregar nova música
            loadTrack(currentTrackIndex, wasPlaying);
        }
    }

    function toggleRepeat() {
        repeatState = (repeatState + 1) % 3;
        
        switch(repeatState) {
            case 0: // Desligado
                btnRepeat.classList.remove('active');
                btnRepeat.textContent = '🔁';
                audio.loop = false;
                break;
            case 1: // Repetir playlist
                btnRepeat.classList.add('active');
                btnRepeat.textContent = '🔁';
                audio.loop = false;
                break;
            case 2: // Repetir música
                btnRepeat.classList.add('active');
                btnRepeat.textContent = '🔂';
                audio.loop = true;
                break;
        }
        console.log("Repeat state alterado para:", repeatState);
    }

    // --- EVENT LISTENERS ---
    btnPlayPause.addEventListener('click', playPause);
    btnNext.addEventListener('click', () => nextTrack(false));
    btnPrev.addEventListener('click', prevTrack);
    btnShuffle.addEventListener('click', toggleShuffle);
    btnRepeat.addEventListener('click', toggleRepeat);
    
    // Atualiza tempo atual e barra de progresso
    audio.addEventListener('timeupdate', () => {
        if (audio.duration && !isNaN(audio.duration)) {
            const currentTime = Math.floor(audio.currentTime);
            progressBar.value = currentTime;
            currentTimeDisplay.textContent = formatTime(currentTime);
            
            // Tempo restante
            const remaining = audio.duration - audio.currentTime;
            durationDisplay.textContent = `-${formatTime(remaining)}`;
            
            // Atualiza visual da barra
            updateProgressFill();
        }
    });
    
    // Quando os metadados são carregados
    audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && !isNaN(audio.duration)) {
            progressBar.max = Math.floor(audio.duration);
            durationDisplay.textContent = formatTime(audio.duration);
            updateProgressFill();
        }
    });
    
    // Barra de progresso interativa
    progressBar.addEventListener('input', () => {
        const wasPlaying = !audio.paused;
        const newTime = parseFloat(progressBar.value);
        
        if (!isNaN(newTime)) {
            audio.currentTime = newTime;
            
            if (wasPlaying) {
                audio.play().catch(e => console.error("Erro ao retomar:", e));
            }
            
            // Atualiza visual imediatamente
            updateProgressFill();
        }
    });
    
    // Quando a música acaba
    audio.addEventListener('ended', () => {
        console.log("Música acabou, chamando nextTrack...");
        nextTrack(true);
    });
    
    // --- INICIALIZAÇÃO ---
    console.log("Inicializando player...");
    
    // Define volume máximo
    audio.volume = 1.0;
    
    // Inicializa total de faixas
    if (totalTracks) {
        totalTracks.textContent = playlist.length;
    }
    
    // Carrega primeira música
    loadTrack(0, false);
    btnPlayPause.textContent = '▶';
    updateTrackCounter();

    console.log("Player inicializado com sucesso!");

    // =========================================================
    // 3. Galeria de Fotos Interativa
    // =========================================================

    const galleryItems = document.querySelectorAll('.gallery-item');
    const photoModal = document.getElementById('photoModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    const photoCounter = document.getElementById('photoCounter');
    const btnPrevPhoto = document.getElementById('btnPrevPhoto');
    const btnNextPhoto = document.getElementById('btnNextPhoto');
    const closeModal = document.querySelector('.close-modal');
    const btnViewAllPhotos = document.getElementById('btnViewAllPhotos');

    let currentPhotoIndex = 0;
    const photos = [
        { src: 'images/mini/foto_01.jpg', title: 'Viagem 2024', description: 'Aquele dia inesquecível na praia, com o pôr do sol mais lindo que já vimos.' },
        { src: 'images/mini/foto_02.jpg', title: 'Primeiro Encontro', description: 'O começo de tudo. Nem imaginávamos o que estava por vir!' },
        { src: 'images/mini/foto_03.jpg', title: 'Nosso Aniversário', description: 'Celebrando mais um ano de amor e cumplicidade.' },
        { src: 'images/mini/foto_04.jpg', title: 'Nosso dia D', description: 'Um momento especial que ficará para sempre em nossa memória.' }
    ];

    function openPhotoModal(index) {
        if (index < 0 || index >= photos.length) return;
        
        currentPhotoIndex = index;
        const photo = photos[currentPhotoIndex];
        
        modalImage.src = photo.src;
        modalImage.alt = photo.title;
        modalTitle.textContent = photo.title;
        modalDescription.textContent = photo.description;
        photoCounter.textContent = `${currentPhotoIndex + 1} / ${photos.length}`;
        
        photoModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closePhotoModal() {
        photoModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    function nextPhoto() {
        currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
        openPhotoModal(currentPhotoIndex);
    }

    function prevPhoto() {
        currentPhotoIndex = (currentPhotoIndex - 1 + photos.length) % photos.length;
        openPhotoModal(currentPhotoIndex);
    }

    // Event Listeners para a galeria
    if (galleryItems.length > 0) {
        galleryItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                openPhotoModal(index);
            });
        });
    }

    if (btnViewAllPhotos) {
        btnViewAllPhotos.addEventListener('click', () => {
            openPhotoModal(0);
        });
    }

    if (btnPrevPhoto) btnPrevPhoto.addEventListener('click', prevPhoto);
    if (btnNextPhoto) btnNextPhoto.addEventListener('click', nextPhoto);
    if (closeModal) closeModal.addEventListener('click', closePhotoModal);

    // Fechar modal clicando fora
    window.addEventListener('click', (event) => {
        if (event.target === photoModal) {
            closePhotoModal();
        }
    });

    // Navegação por teclado
    document.addEventListener('keydown', (event) => {
        if (photoModal.style.display === 'block') {
            if (event.key === 'Escape') {
                closePhotoModal();
            } else if (event.key === 'ArrowRight') {
                nextPhoto();
            } else if (event.key === 'ArrowLeft') {
                prevPhoto();
            }
        }
    });

    // =========================================================
    // 4. Mensagens do Dia
    // =========================================================

    const dailyMessage = document.getElementById('dailyMessage');
    const btnNewMessage = document.getElementById('btnNewMessage');

    const messages = [
        "O verdadeiro amor não é algo que se encontra, é algo que se constrói dia após dia.",
        "Nosso amor é como uma música: tem altos e baixos, mas sempre mantém um ritmo perfeito.",
        "Em seus olhos encontrei meu lar, em seu abraço encontrei minha paz.",
        "Cada dia ao seu lado é uma página nova em nossa história de amor.",
        "Você é a razão do meu sorriso mais sincero e do meu coração mais cheio.",
        "Amor não é olhar um para o outro, é olhar na mesma direção juntos.",
        "Nossa história é minha favorita, e mal posso esperar pelos próximos capítulos.",
        "Você transformou momentos comuns em memórias extraordinárias.",
        "O melhor presente que a vida me deu foi você, e eu vou agradecer todos os dias.",
        "Nosso amor é a prova de que os finais felizes existem."
    ];

    function getRandomMessage() {
        const randomIndex = Math.floor(Math.random() * messages.length);
        return messages[randomIndex];
    }

    function updateDailyMessage() {
        const today = new Date().toDateString();
        const storedDate = localStorage.getItem('messageDate');
        const storedMessage = localStorage.getItem('dailyMessage');
        
        if (storedDate === today && storedMessage && dailyMessage) {
            dailyMessage.innerHTML = `<p>"${storedMessage}"</p><p class="message-signature">Com todo meu amor, sempre.</p>`;
        } else if (dailyMessage) {
            const newMessage = getRandomMessage();
            dailyMessage.innerHTML = `<p>"${newMessage}"</p><p class="message-signature">Com todo meu amor, sempre.</p>`;
            
            localStorage.setItem('messageDate', today);
            localStorage.setItem('dailyMessage', newMessage);
        }
    }

    if (btnNewMessage) {
        btnNewMessage.addEventListener('click', () => {
            const newMessage = getRandomMessage();
            if (dailyMessage) {
                dailyMessage.innerHTML = `<p>"${newMessage}"</p><p class="message-signature">Com todo meu amor, sempre.</p>`;
            }
            
            localStorage.setItem('messageDate', new Date().toDateString());
            localStorage.setItem('dailyMessage', newMessage);
        });
    }

    // =========================================================
    // 5. Data Atual no Footer
    // =========================================================

    const currentDateElement = document.getElementById('currentDate');

    function updateCurrentDate() {
        if (currentDateElement) {
            const now = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            currentDateElement.textContent = now.toLocaleDateString('pt-BR', options);
        }
    }

    // =========================================================
    // 6. Inicialização Final
    // =========================================================

    // Atualiza data no footer
    updateCurrentDate();
    
    // Atualiza mensagem do dia
    updateDailyMessage();

    console.log('Página completamente inicializada!');
});
