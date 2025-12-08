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

// ===== PLAYER DE MÚSICA =====
let playlist = [
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

// ===== ÁLBUNS DE FOTOS =====
let albums = [
    {
        id: 1,
        title: "Primeiros Encontros",
        date: "Junho 2023",
        cover: "images/capas-albuns/primeiro-encontro.jpg",
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
        cover: "images/capas-albuns/viagem.jpg",
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

// ===== MENSAGENS DO DIA =====
let messages = [
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

// ===== COMPRESSÃO DE IMAGENS SEM PERDA =====
async function compressImage(file, maxWidth = 1200, quality = 0.85) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Redimensionar proporcionalmente se necessário
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                
                // Configurações para manter qualidade
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                
                // Converter para formato WebP para melhor compressão
                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
                        type: 'image/webp',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/webp', quality);
            };
        };
    });
}

// ===== EFEITO DE TRANSIÇÃO DELICADO NAS IMAGENS =====
function addImageTransitions() {
    // Adiciona transição suave a todas as imagens
    document.querySelectorAll('img').forEach(img => {
        if (!img.style.transition) {
            img.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
        }
        
        // Efeito ao carregar
        img.style.opacity = '0';
        img.style.transform = 'scale(0.98)';
        
        img.onload = function() {
            setTimeout(() => {
                img.style.opacity = '1';
                img.style.transform = 'scale(1)';
            }, 100);
        };
        
        // Efeito hover (se não for mobile)
        if (window.innerWidth > 768) {
            img.addEventListener('mouseenter', () => {
                img.style.transform = 'scale(1.02)';
            });
            
            img.addEventListener('mouseleave', () => {
                img.style.transform = 'scale(1)';
            });
        }
    });
}

// ===== SISTEMA DE GERENCIAMENTO LOCAL =====
class LocalDataManager {
    constructor() {
        this.storageKey = 'kevinIaraSiteData';
        this.defaultData = {
            playlist: playlist,
            albums: albums,
            messages: messages
        };
        this.init();
    }
    
    init() {
        // Carregar dados salvos ou usar padrão
        const savedData = localStorage.getItem(this.storageKey);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.playlist) playlist = parsed.playlist;
                if (parsed.albums) albums = parsed.albums;
                if (parsed.messages) messages = parsed.messages;
                console.log('📂 Dados locais carregados');
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                this.saveData();
            }
        } else {
            this.saveData();
        }
    }
    
    saveData() {
        const data = {
            playlist: playlist,
            albums: albums,
            messages: messages,
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(data));
        console.log('💾 Dados salvos localmente');
    }
    
    exportData() {
        const data = this.getFullData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kevin-iara-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.playlist) playlist = data.playlist;
                    if (data.albums) albums = data.albums;
                    if (data.messages) messages = data.messages;
                    this.saveData();
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            }.bind(this);
            reader.readAsText(file);
        });
    }
    
    getFullData() {
        return {
            playlist: playlist,
            albums: albums,
            messages: messages,
            metadata: {
                exportDate: new Date().toISOString(),
                version: '1.0'
            }
        };
    }
    
    resetData() {
        if (confirm('Tem certeza que deseja resetar todos os dados para os valores padrão?')) {
            localStorage.removeItem(this.storageKey);
            playlist = [...this.defaultData.playlist];
            albums = [...this.defaultData.albums];
            messages = [...this.defaultData.messages];
            this.saveData();
            location.reload();
        }
    }
}

// ===== INICIALIZAÇÃO DO SISTEMA ADMIN =====
let dataManager;
let selectedPhotos = [];

function initAdminPanel() {
    dataManager = new LocalDataManager();
    
    // Elementos do DOM
    const adminFloatBtn = document.getElementById('adminFloatBtn');
    const adminModal = document.getElementById('adminModal');
    const adminCloseBtn = document.getElementById('adminCloseBtn');
    const adminTabs = document.querySelectorAll('.admin-tab');
    const importFileInput = document.getElementById('importFileInput');
    
    if (!adminFloatBtn || !adminModal) {
        console.warn('⚠️ Elementos do painel admin não encontrados');
        return;
    }
    
    // Event Listeners
    adminFloatBtn.addEventListener('click', () => {
        adminModal.style.display = 'flex';
        updateAdminLists();
    });
    
    adminCloseBtn.addEventListener('click', () => {
        adminModal.style.display = 'none';
    });
    
    adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            adminModal.style.display = 'none';
        }
    });
    
    // Tabs
    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            adminTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.admin-tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });
    
    // Inicializar funcionalidades específicas
    initMusicAdmin();
    initAlbumsAdmin();
    initPhotosAdmin();
    initMessagesAdmin();
    initAdminButtons();
    
    console.log('✅ Painel admin inicializado');
}

// ===== GERENCIAMENTO DE MÚSICAS =====
function initMusicAdmin() {
    const addMusicBtn = document.getElementById('addMusicBtn');
    const musicFileInput = document.getElementById('musicFile');
    const musicFileName = document.getElementById('musicFileName');
    
    if (!addMusicBtn) return;
    
    musicFileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            musicFileName.textContent = this.files[0].name;
        } else {
            musicFileName.textContent = 'Nenhum arquivo selecionado';
        }
    });
    
    addMusicBtn.addEventListener('click', async () => {
        const title = document.getElementById('musicTitle').value;
        const artist = document.getElementById('musicArtist').value;
        const album = document.getElementById('musicAlbum').value;
        const file = musicFileInput.files[0];
        
        if (!title || !artist || !file) {
            alert('Por favor, preencha todos os campos obrigatórios');
            return;
        }
        
        // Criar URL local para o arquivo
        const audioUrl = URL.createObjectURL(file);
        
        // Adicionar à playlist
        playlist.push({
            title: title,
            artist: artist,
            src: audioUrl,
            album: album,
            file: file.name
        });
        
        // Salvar dados
        dataManager.saveData();
        
        // Resetar formulário
        document.getElementById('musicTitle').value = '';
        document.getElementById('musicArtist').value = '';
        document.getElementById('musicAlbum').value = 'Nossa Trilha Sonora';
        musicFileInput.value = '';
        musicFileName.textContent = 'Nenhum arquivo selecionado';
        
        // Atualizar lista
        updateMusicList();
        
        alert('Música adicionada com sucesso!');
    });
}

function updateMusicList() {
    const musicList = document.getElementById('musicList');
    if (!musicList) return;
    
    musicList.innerHTML = '';
    
    playlist.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = 'admin-item';
        item.innerHTML = `
            <div class="admin-item-title">
                <strong>${track.title}</strong> - ${track.artist}
            </div>
            <div class="admin-item-actions">
                <button class="admin-item-btn play" data-index="${index}" title="Tocar">
                    <i class="fas fa-play"></i>
                </button>
                <button class="admin-item-btn delete" data-index="${index}" title="Remover">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        musicList.appendChild(item);
    });
    
    // Adicionar event listeners aos botões
    document.querySelectorAll('.admin-item-btn.play').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            currentTrackIndex = index;
            loadTrack(index);
            if (!isPlaying) {
                togglePlayPause();
            }
        });
    });
    
    document.querySelectorAll('.admin-item-btn.delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            if (confirm(`Remover "${playlist[index].title}"?`)) {
                playlist.splice(index, 1);
                dataManager.saveData();
                updateMusicList();
            }
        });
    });
}

// ===== GERENCIAMENTO DE ÁLBUNS =====
function initAlbumsAdmin() {
    const createAlbumBtn = document.getElementById('createAlbumBtn');
    const albumCoverInput = document.getElementById('albumCover');
    const albumCoverName = document.getElementById('albumCoverName');
    
    if (!createAlbumBtn) return;
    
    albumCoverInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            albumCoverName.textContent = this.files[0].name;
        } else {
            albumCoverName.textContent = 'Nenhuma imagem selecionada';
        }
    });
    
    createAlbumBtn.addEventListener('click', async () => {
        const title = document.getElementById('albumTitle').value;
        const date = document.getElementById('albumDate').value;
        const description = document.getElementById('albumDescription').value;
        const file = albumCoverInput.files[0];
        
        if (!title || !date || !description || !file) {
            alert('Por favor, preencha todos os campos');
            return;
        }
        
        // Comprimir imagem
        const compressedFile = await compressImage(file);
        const coverUrl = URL.createObjectURL(compressedFile);
        
        // Criar novo álbum
        const newAlbum = {
            id: albums.length + 1,
            title: title,
            date: date,
            cover: coverUrl,
            photoCount: 0,
            description: description,
            photos: []
        };
        
        albums.push(newAlbum);
        dataManager.saveData();
        
        // Resetar formulário
        document.getElementById('albumTitle').value = '';
        document.getElementById('albumDate').value = '';
        document.getElementById('albumDescription').value = '';
        albumCoverInput.value = '';
        albumCoverName.textContent = 'Nenhuma imagem selecionada';
        
        // Atualizar listas
        updateAlbumsList();
        updateAlbumSelect();
        initAlbums(); // Recarregar galeria
        
        alert('Álbum criado com sucesso!');
    });
}

function updateAlbumsList() {
    const albumsList = document.getElementById('albumsList');
    if (!albumsList) return;
    
    albumsList.innerHTML = '';
    
    albums.forEach((album, index) => {
        const item = document.createElement('div');
        item.className = 'admin-item';
        item.innerHTML = `
            <div class="admin-item-title">
                <strong>${album.title}</strong> - ${album.date} (${album.photoCount} fotos)
            </div>
            <div class="admin-item-actions">
                <button class="admin-item-btn view" data-id="${album.id}" title="Ver">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="admin-item-btn delete" data-index="${index}" title="Remover">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        albumsList.appendChild(item);
    });
    
    // Event listeners
    document.querySelectorAll('.admin-item-btn.view').forEach(btn => {
        btn.addEventListener('click', function() {
            const albumId = parseInt(this.dataset.id);
            openAlbum(albumId);
            document.getElementById('adminModal').style.display = 'none';
        });
    });
    
    document.querySelectorAll('.admin-item-btn.delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            if (confirm(`Remover o álbum "${albums[index].title}"?`)) {
                albums.splice(index, 1);
                dataManager.saveData();
                updateAlbumsList();
                updateAlbumSelect();
                initAlbums();
            }
        });
    });
}

// ===== GERENCIAMENTO DE FOTOS =====
function initPhotosAdmin() {
    const photoFilesInput = document.getElementById('photoFiles');
    const photoFilesCount = document.getElementById('photoFilesCount');
    const addPhotosBtn = document.getElementById('addPhotosBtn');
    const photoPreview = document.getElementById('photoPreview');
    
    if (!photoFilesInput) return;
    
    // Atualizar select de álbuns
    updateAlbumSelect();
    
    photoFilesInput.addEventListener('change', async function() {
        photoFilesCount.textContent = `${this.files.length} foto(s) selecionada(s)`;
        photoPreview.innerHTML = '';
        selectedPhotos = Array.from(this.files);
        
        // Preview das fotos
        for (const file of selectedPhotos) {
            const compressedFile = await compressImage(file);
            const url = URL.createObjectURL(compressedFile);
            
            const preview = document.createElement('div');
            preview.className = 'photo-preview';
            preview.innerHTML = `
                <img src="${url}" alt="Preview">
                <button class="photo-preview-remove" data-name="${file.name}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            photoPreview.appendChild(preview);
        }
        
        // Remover fotos do preview
        document.querySelectorAll('.photo-preview-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                const fileName = this.dataset.name;
                selectedPhotos = selectedPhotos.filter(f => f.name !== fileName);
                this.parentElement.remove();
                photoFilesCount.textContent = `${selectedPhotos.length} foto(s) selecionada(s)`;
            });
        });
    });
    
    addPhotosBtn.addEventListener('click', async () => {
        const albumSelect = document.getElementById('photoAlbumSelect');
        const albumId = parseInt(albumSelect.value);
        
        if (!albumId || selectedPhotos.length === 0) {
            alert('Selecione um álbum e pelo menos uma foto');
            return;
        }
        
        const album = albums.find(a => a.id === albumId);
        if (!album) {
            alert('Álbum não encontrado');
            return;
        }
        
        // Processar cada foto
        for (const file of selectedPhotos) {
            const compressedFile = await compressImage(file);
            const photoUrl = URL.createObjectURL(compressedFile);
            
            album.photos.push({
                src: photoUrl,
                description: `Foto ${album.photos.length + 1}`
            });
        }
        
        album.photoCount = album.photos.length;
        dataManager.saveData();
        
        // Resetar
        photoFilesInput.value = '';
        photoFilesCount.textContent = 'Nenhuma foto selecionada';
        photoPreview.innerHTML = '';
        selectedPhotos = [];
        
        alert(`${album.photos.length} fotos adicionadas ao álbum "${album.title}"!`);
    });
}

function updateAlbumSelect() {
    const select = document.getElementById('photoAlbumSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um álbum</option>';
    
    albums.forEach(album => {
        const option = document.createElement('option');
        option.value = album.id;
        option.textContent = `${album.title} (${album.date})`;
        select.appendChild(option);
    });
}

// ===== GERENCIAMENTO DE MENSAGENS =====
function initMessagesAdmin() {
    const addMessageBtn = document.getElementById('addMessageBtn');
    
    if (!addMessageBtn) return;
    
    addMessageBtn.addEventListener('click', () => {
        const text = document.getElementById('messageText').value;
        const author = document.getElementById('messageAuthor').value;
        
        if (!text || !author) {
            alert('Por favor, preencha todos os campos');
            return;
        }
        
        messages.push({
            text: text,
            author: author
        });
        
        dataManager.saveData();
        
        // Resetar
        document.getElementById('messageText').value = '';
        document.getElementById('messageAuthor').value = 'Kevin para Iara';
        
        updateMessagesList();
        alert('Mensagem adicionada com sucesso!');
    });
}

function updateMessagesList() {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;
    
    messagesList.innerHTML = '';
    
    messages.forEach((msg, index) => {
        const item = document.createElement('div');
        item.className = 'admin-item';
        item.innerHTML = `
            <div style="flex: 1;">
                <div class="admin-item-title">"${msg.text.substring(0, 50)}..."</div>
                <div style="font-size: 0.8rem; color: var(--theme-text-secondary);">${msg.author}</div>
            </div>
            <div class="admin-item-actions">
                <button class="admin-item-btn delete" data-index="${index}" title="Remover">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        messagesList.appendChild(item);
    });
    
    document.querySelectorAll('.admin-item-btn.delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            if (confirm('Remover esta mensagem?')) {
                messages.splice(index, 1);
                dataManager.saveData();
                updateMessagesList();
            }
        });
    });
}

// ===== BOTÕES GERAIS DO ADMIN =====
function initAdminButtons() {
    const exportBtn = document.getElementById('exportDataBtn');
    const importBtn = document.getElementById('importDataBtn');
    const resetBtn = document.getElementById('resetDataBtn');
    const importFileInput = document.getElementById('importFileInput');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            dataManager.exportData();
        });
    }
    
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            importFileInput.click();
        });
        
        importFileInput.addEventListener('change', async function() {
            if (this.files.length > 0) {
                try {
                    await dataManager.importData(this.files[0]);
                    alert('Dados importados com sucesso! A página será recarregada.');
                    location.reload();
                } catch (error) {
                    alert('Erro ao importar dados: ' + error.message);
                }
            }
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            dataManager.resetData();
        });
    }
}

// ===== ATUALIZAR TODAS AS LISTAS =====
function updateAdminLists() {
    updateMusicList();
    updateAlbumsList();
    updateMessagesList();
}

// ===== FUNÇÕES ORIGINAIS (MANTIDAS) =====
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
        currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        loadTrack(currentTrackIndex);
        if (isPlaying) {
            setTimeout(() => audio.play(), 100);
        }
    }
}

function nextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
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
        
        // Verificar se a capa é uma URL de objeto
        const coverSrc = album.cover.startsWith('blob:') || 
                        album.cover.startsWith('data:') || 
                        album.cover.startsWith('http') ? 
                        album.cover : 
                        `${album.cover}?t=${Date.now()}`;
        
        albumCard.innerHTML = `
            <img src="${coverSrc}" alt="${album.title}" class="album-cover-img" loading="lazy">
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
        
        // Aplicar transição
        const img = albumCard.querySelector('img');
        img.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
        img.style.opacity = '0';
        img.style.transform = 'scale(0.98)';
        
        img.onload = function() {
            setTimeout(() => {
                img.style.opacity = '1';
                img.style.transform = 'scale(1)';
            }, 100);
        };
        
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
        modalPhoto.style.opacity = '0';
        modalPhoto.style.transform = 'scale(0.98)';
        
        modalPhoto.onload = function() {
            setTimeout(() => {
                modalPhoto.style.opacity = '1';
                modalPhoto.style.transform = 'scale(1)';
            }, 100);
        };
    }
    
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
    
    // ===== NAVEGAÇÃO ESTILO INSTAGRAM =====
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
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado, iniciando site...');
    
    // Verificar elementos
    checkElements();
    
    // Inicializar tudo
    initThemeMenu();
    initThemeSelector();
    initTimeCounter();
    initMusicPlayer();
    initAlbums();
    initMessages();
    initModal();
    updateCurrentDate();
    
    // Aplicar transições nas imagens
    setTimeout(addImageTransitions, 500);
    
    // Inicializar painel admin
    setTimeout(() => {
        initAdminPanel();
    }, 1000);
    
    console.log('💖 Site Kevin & Iara carregado com sucesso!');
    
    // Inicializar animações depois de um delay
    setTimeout(() => {
        if (typeof window.Animations !== 'undefined' && 
            typeof window.Animations.init === 'function') {
            window.Animations.init();
        } else {
            console.warn('⚠️ Animações não carregadas, verificando...');
            if (typeof initAnimations === 'function') {
                initAnimations();
            }
        }
    }, 1500);
});

function checkElements() {
    const elements = {
        'backgroundCanvas': document.getElementById('backgroundCanvas'),
        'audioPlayer': document.getElementById('audioPlayer'),
        'themeToggle': document.getElementById('themeToggle'),
        'albumsContainer': document.getElementById('albumsContainer'),
        'playPauseBtn': document.getElementById('playPauseBtn'),
        'dailyMessage': document.getElementById('dailyMessage'),
        'adminFloatBtn': document.getElementById('adminFloatBtn')
    };
    
    console.log('🔍 Verificando elementos:');
    let missing = [];
    
    for (const [name, element] of Object.entries(elements)) {
        const exists = element !== null;
        console.log(`${exists ? '✅' : '❌'} ${name}`);
        if (!exists) missing.push(name);
    }
    
    if (missing.length > 0) {
        console.warn(`⚠️ Elementos faltando: ${missing.join(', ')}`);
    }
}

// ===== LOGO INICIAL =====
console.log(`
╔══════════════════════════════════════╗
║   💖 SITE KEVIN & IARA INICIADO 💖   ║
╠══════════════════════════════════════╣
║   📱 Otimizado para Mobile          ║
║   🎵 Player original restaurado     ║
║   📸 ${albums.length} álbuns organizados ║
║   🎨 ${Object.keys(themes).length} temas disponíveis ║
║   🛠️  Painel Admin ativado         ║
╚══════════════════════════════════════╝
`);
