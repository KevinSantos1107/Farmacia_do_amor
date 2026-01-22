// ===== CONFIGURAÇÃO DO FIREBASE (SEM IMGBB) =====

// Suas credenciais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCgt_eD3M_n9bhuhSzOxpf5f_ck43ZZZ-o",
  authDomain: "kevin-iara-site.firebaseapp.com",
  projectId: "kevin-iara-site",
  storageBucket: "kevin-iara-site.firebasestorage.app",
  messagingSenderId: "236663809364",
  appId: "1:236663809364:web:c0103bf11a1c37064214c1"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar APENAS Firestore (sem Storage)
const db = firebase.firestore();

console.log('🔥 Firebase inicializado!');

// ===== FUNÇÕES DE UPLOAD - AGORA USAM O IMGBB DO imgbb-config.js =====

// ===== SISTEMA DE RENDERIZAÇÃO DE ÁLBUNS =====

// ===== FUNÇÃO PARA ABRIR MODAL DO ÁLBUM =====
function openAlbumModal(album) {
    const modal = document.getElementById('albumModal');
    const modalTitle = document.getElementById('modalAlbumTitle');
    const modalPhoto = document.getElementById('modalPhoto');
    const currentPhotoSpan = document.getElementById('currentPhoto');
    const totalPhotosSpan = document.getElementById('totalPhotos');
    
    if (!modal || !album.photos || album.photos.length === 0) {
        console.warn('⚠️ Álbum sem fotos ou modal não encontrado');
        return;
    }
    
    // Configurar modal
    window.currentAlbum = album;
    window.currentPhotoIndex = 0;
    
    modalTitle.textContent = album.title;
    totalPhotosSpan.textContent = album.photos.length;
    
    // Mostrar primeira foto
    updateModalPhoto();
    
    // Abrir modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    console.log(`📖 Álbum aberto: ${album.title} (${album.photos.length} fotos)`);
}

// ===== FUNÇÃO PARA ATUALIZAR FOTO NO MODAL =====
function updateModalPhoto() {
    const modalPhoto = document.getElementById('modalPhoto');
    const currentPhotoSpan = document.getElementById('currentPhoto');
    
    if (!window.currentAlbum || !window.currentAlbum.photos) return;
    
    const photo = window.currentAlbum.photos[window.currentPhotoIndex];
    
    modalPhoto.src = photo.src || photo;
    modalPhoto.alt = photo.description || `Foto ${window.currentPhotoIndex + 1}`;
    currentPhotoSpan.textContent = window.currentPhotoIndex + 1;
}

// ===== CARREGAR ÁLBUNS DO FIREBASE =====
async function loadAlbumsFromFirebase() {
    console.log('🔄 Carregando álbuns do Firebase...');
    
    try {
        const snapshot = await db.collection('albums').orderBy('createdAt', 'desc').limit(20).get();
        const firebaseAlbums = [];
        
        console.log(`📦 ${snapshot.size} álbuns encontrados no Firebase`);
        
        for (const doc of snapshot.docs) {
            const albumData = doc.data();
            
            console.log(`📂 Carregando fotos do álbum: ${albumData.title}`);
            
            // Buscar todas as páginas de fotos
            const photoPagesSnapshot = await db.collection('album_photos')
                .where('albumId', '==', doc.id)
                .orderBy('pageNumber', 'asc')
                .get();
            
            // Juntar todas as fotos
            const allPhotos = [];
            photoPagesSnapshot.forEach(pageDoc => {
                const pageData = pageDoc.data();
                allPhotos.push(...pageData.photos);
            });
            
            console.log(`   ✅ ${allPhotos.length} fotos carregadas`);
            
            firebaseAlbums.push({
                id: doc.id,
                title: albumData.title,
                date: albumData.date,
                cover: albumData.cover,
                description: albumData.description,
                photoCount: allPhotos.length,
                photos: allPhotos
            });
        }
        
        console.log(`✅ Total de álbuns carregados: ${firebaseAlbums.length}`);
        
        // 🧪 TESTE: Adicionar álbuns de teste se nenhum foi carregado
        if (firebaseAlbums.length === 0) {
            console.log('🧪 Nenhum álbum no Firebase, adicionando álbuns de teste...');
            firebaseAlbums.push(
                {
                    id: 'test1',
                    title: 'Nosso Primeiro Encontro',
                    date: '15 Jan 2024',
                    cover: 'https://via.placeholder.com/400x300/FF69B4/FFFFFF?text=Album+1',
                    description: 'Momentos especiais do nosso primeiro encontro',
                    photoCount: 5,
                    photos: [
                        { url: 'https://via.placeholder.com/800x600/FF69B4/FFFFFF?text=Foto+1', alt: 'Foto 1' },
                        { url: 'https://via.placeholder.com/800x600/FF1493/FFFFFF?text=Foto+2', alt: 'Foto 2' },
                        { url: 'https://via.placeholder.com/800x600/DC143C/FFFFFF?text=Foto+3', alt: 'Foto 3' },
                        { url: 'https://via.placeholder.com/800x600/C71585/FFFFFF?text=Foto+4', alt: 'Foto 4' },
                        { url: 'https://via.placeholder.com/800x600/DB7093/FFFFFF?text=Foto+5', alt: 'Foto 5' }
                    ]
                },
                {
                    id: 'test2',
                    title: 'Viagem Romântica',
                    date: '20 Fev 2024',
                    cover: 'https://via.placeholder.com/400x300/FF1493/FFFFFF?text=Album+2',
                    description: 'Nossa viagem inesquecível',
                    photoCount: 3,
                    photos: [
                        { url: 'https://via.placeholder.com/800x600/FF1493/FFFFFF?text=Viagem+1', alt: 'Viagem 1' },
                        { url: 'https://via.placeholder.com/800x600/DC143C/FFFFFF?text=Viagem+2', alt: 'Viagem 2' },
                        { url: 'https://via.placeholder.com/800x600/C71585/FFFFFF?text=Viagem+3', alt: 'Viagem 3' }
                    ]
                }
            );
        }

        // Atualizar álbuns globais (APENAS Firebase)
        window.albums = firebaseAlbums;

        // RENDERIZAR OS ÁLBUNS - REMOVIDO: renderAlbums é feito pelo AlbumsCarousel3D
        // renderAlbums(firebaseAlbums);
        
        // ✅ INICIALIZAR O CARROSSEL APÓS CARREGAR OS ÁLBUNS
        if (typeof initAlbums === 'function') {
            setTimeout(() => {
                console.log('🎠 Inicializando carrossel com', firebaseAlbums.length, 'álbuns...');
                initAlbums();
            }, 200);
        } else {
            console.warn('⚠️ Função initAlbums não encontrada');
        }
        
        return firebaseAlbums;
        
    } catch (error) {
        console.error('❌ Erro ao carregar álbuns do Firebase:', error);
        
        // Tentar renderizar álbuns originais se houver erro
        if (typeof window.albums !== 'undefined') {
            console.log('⚠️ Renderizando apenas álbuns originais devido ao erro');
            renderAlbums(window.albums);
        }
        
        throw error;
    }
}

// ===== FUNÇÃO AUXILIAR: CRIAR IMAGEM COM FALLBACK INTELIGENTE =====
function createAlbumCoverImage(album) {
    const coverImg = document.createElement('img');
    coverImg.alt = album.title;
    coverImg.loading = 'lazy';
    coverImg.className = 'album-cover-img';
    
    // ✅ VERIFICAR SE TEM VERSÕES RESPONSIVAS
    if (album.coverThumb && album.coverLarge) {
        // ✅ TEM versões - usar createResponsiveImage
        console.log(`✅ Álbum "${album.title}" com versões responsivas`);
        
        coverImg.src = album.cover;  // Padrão (medium)
        
        coverImg.srcset = `
            ${album.coverThumb} 400w,
            ${album.cover} 800w,
            ${album.coverLarge} 1600w
        `.trim();
        
        coverImg.sizes = `
            (max-width: 400px) 400px,
            (max-width: 800px) 800px,
            1600px
        `.trim();
        
        // Blur placeholder
        coverImg.style.filter = 'blur(10px)';
        coverImg.style.transition = 'filter 0.3s ease';
        
        coverImg.addEventListener('load', () => {
            coverImg.style.filter = 'none';
        }, { once: true });
        
    } else {
        // ❌ NÃO TEM versões - usar fallback inteligente
        console.warn(`⚠️ Álbum "${album.title}" sem versões - aplicando fallback`);
        
        // Tentar otimizar URL antiga
        if (typeof optimizeExistingUrl === 'function') {
            coverImg.src = optimizeExistingUrl(album.cover, 800);
            console.log(`♻️ URL otimizada para "${album.title}"`);
        } else {
            coverImg.src = album.cover;
            console.warn(`⚠️ Função optimizeExistingUrl não disponível`);
        }
        
        // Aplicar blur placeholder mesmo sem versões
        coverImg.style.filter = 'blur(10px)';
        coverImg.style.transition = 'filter 0.3s ease';
        
        coverImg.addEventListener('load', () => {
            coverImg.style.filter = 'none';
        }, { once: true });
    }
    
    return coverImg;
}

function renderAlbums(albums) {
    const container = document.getElementById('albumsCarousel');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (albums.length === 0) {
        container.innerHTML = `<div>Nenhum álbum criado ainda</div>`;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    albums.forEach(album => {
        const albumCard = document.createElement('div');
        albumCard.className = 'album-card';
        albumCard.dataset.id = album.id;
        
        // ✅ USAR FUNÇÃO AUXILIAR (cria imagem com fallback automático)
        const coverImg = createAlbumCoverImage(album);
        
        albumCard.innerHTML = `
            <div class="album-cover-container"></div>
            <div class="album-info">
                <h3>${album.title}</h3>
                <p class="album-date">
                    <i class="far fa-calendar-alt"></i> ${album.date}
                </p>
                <p>${album.description}</p>
                <div class="album-stats">
                    <span>
                        <i class="far fa-images"></i> ${album.photoCount || 0} ${album.photoCount === 1 ? 'foto' : 'fotos'}
                    </span>
                </div>
            </div>
        `;
        
        // Adicionar imagem ao container
        albumCard.querySelector('.album-cover-container').appendChild(coverImg);
        albumCard.addEventListener('click', () => openAlbum(album.id));
        
        fragment.appendChild(albumCard);
    });
    
    container.appendChild(fragment);
}


// ===== FORÇAR CARREGAMENTO DOS ÁLBUNS =====
async function forceLoadAlbums() {
    console.log('🔄 FORÇANDO carregamento de álbuns...');
    
    // Aguardar Firebase estar pronto
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        console.warn('⚠️ Firebase ainda não está pronto, aguardando...');
        setTimeout(forceLoadAlbums, 500);
        return;
    }
    
    try {
        await loadAlbumsFromFirebase();
    } catch (error) {
        console.error('❌ Erro ao forçar carregamento:', error);
    }
}

// ===== INICIALIZAR QUANDO A PÁGINA CARREGAR =====
console.log('📋 Estado do documento:', document.readyState);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📋 DOMContentLoaded disparado');
        setTimeout(async () => {
            console.log('🚀 Iniciando carregamento de álbuns...');
            await forceLoadAlbums();
            await loadTimelineFromFirebase();
        }, 1000);
    });
} else {
    console.log('📋 Documento já carregado, iniciando imediatamente');
    setTimeout(async () => {
        console.log('🚀 Iniciando carregamento de álbuns...');
        await forceLoadAlbums();
        await loadTimelineFromFirebase();
    }, 1000);
}

// ===== CARREGAR TIMELINE DO FIREBASE =====
async function loadTimelineFromFirebase() {
    try {
        console.log('📖 Carregando timeline do Firebase...');
        
        // Aguardar admin.js ser carregado se necessário
        if (typeof rebuildTimeline !== 'function') {
            console.log('⏳ Aguardando carregamento do admin.js para rebuildTimeline...');
            // Tentar novamente em intervalos até que admin seja carregado
            const checkInterval = setInterval(async () => {
                if (typeof rebuildTimeline === 'function') {
                    clearInterval(checkInterval);
                    await window.rebuildTimeline();
                }
            }, 500);
            
            // Timeout após 10 segundos
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('⚠️ Timeout aguardando rebuildTimeline - timeline pode não ser atualizada');
            }, 10000);
        } else {
            await window.rebuildTimeline();
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar timeline:', error);
    }
}

console.log('✅ Sistema de renderização de álbuns carregado!');

// ===== FUNÇÃO AUXILIAR: CARREGAR CONFIGURAÇÕES DO STAR MAP =====

/**
 * Carrega as configurações do Mapa das Estrelas do Firebase
 * @returns {Promise<Object|null>} Configurações ou null se não existir
 */
async function loadStarMapConfigFromFirebase() {
    try {
        const doc = await db.collection('star_map_config').doc('settings').get();
        
        if (doc.exists) {
            const config = doc.data();
            console.log('✅ Configurações do Star Map carregadas do Firebase');
            console.log('   📅 Data especial:', config.specialDate || 'Não definida');
            console.log('   📍 Localização:', config.customLocation ? 'Manual' : 'Automática');
            console.log('   💬 Frase:', config.romanticQuote);
            return config;
        } else {
            console.log('⚠️ Nenhuma configuração do Star Map encontrada');
            return null;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar configurações do Star Map:', error);
        return null;
    }
}

/**
 * Salva as configurações do Mapa das Estrelas no Firebase
 * @param {Object} config - Objeto com specialDate, customLocation, romanticQuote
 * @returns {Promise<boolean>} True se salvou com sucesso
 */
async function saveStarMapConfigToFirebase(config) {
    try {
        await db.collection('star_map_config').doc('settings').set({
            specialDate: config.specialDate || null,
            customLocation: config.customLocation || null,
            romanticQuote: config.romanticQuote || "O céu quando nossos mundos se colidiram",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Configurações do Star Map salvas com sucesso');
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar configurações do Star Map:', error);
        return false;
    }
}

/**
 * ✨ FORÇA ATUALIZAÇÃO COMPLETA DO STAR MAP
 * Recarrega todas as configurações e recria o mapa
 */
async function forceReloadStarMap() {
    try {
        console.log('🔄 Forçando reload completo do Star Map...');
        
        // 1. Resetar o objeto global
        window.starMap = null;
        
        // 2. Recarregar configurações do Firebase
        const config = await loadStarMapConfigFromFirebase();
        
        // 3. Reinicializar o Star Map com novas configurações
        if (typeof initializeStarMapWithConfig === 'function') {
            await initializeStarMapWithConfig();
            console.log('✅ Star Map recarregado com sucesso!');
        } else {
            console.warn('⚠️ Função initializeStarMapWithConfig não encontrada');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao forçar reload do Star Map:', error);
        return false;
    }
}

// ✅ TORNAR FUNÇÃO GLOBAL
window.forceReloadStarMap = forceReloadStarMap;

console.log('✅ Funções auxiliares do Star Map carregadas');

// ===== FUNÇÕES DA TIMELINE (MOVIDAS DE admin.js PARA DISPONIBILIDADE GLOBAL) =====

async function rebuildTimeline() {
    const container = document.querySelector('.timeline-container');
    if (!container) {
        console.warn('⚠️ Container da timeline não encontrado');
        return;
    }
    
    try {
        const snapshot = await db.collection('timeline').orderBy('createdAt', 'asc').limit(50).get();
        
        const allItems = container.querySelectorAll('.timeline-item');
        allItems.forEach(item => item.remove());
        
        let timelineEnd = container.querySelector('.timeline-end');
        
        if (!timelineEnd) {
            timelineEnd = document.createElement('div');
            timelineEnd.className = 'timeline-end';
            timelineEnd.innerHTML = `
                <div class="timeline-heart"><i class="fas fa-infinity"></i></div>
                <p>E nossa história continua...</p>
            `;
            container.appendChild(timelineEnd);
        }
        
        if (snapshot.empty) {
            console.log('📖 Nenhum evento na timeline');
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        snapshot.forEach((doc, index) => {
            const event = doc.data();
            const item = window.createTimelineItem(event, doc.id, index);
            fragment.appendChild(item);
        });
        
        container.insertBefore(fragment, timelineEnd);
        
        applyTimelineIntercalation();
        
        const secretBtns = document.querySelectorAll('.secret-message-btn');
        secretBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const message = btn.getAttribute('data-message');
                if (message && typeof showSecretMessage === 'function') {
                    showSecretMessage(message);
                }
            });
        });
        
        console.log(`✅ Timeline reconstruída com ${snapshot.size} eventos`);
        
    } catch (error) {
        console.error('❌ Erro ao reconstruir timeline:', error);
    }
}

window.rebuildTimeline = rebuildTimeline;

function createTimelineItem(event, id, index) {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.setAttribute('data-id', id);
    item.setAttribute('data-index', index);
    item.style.animationDelay = `${(index + 1) * 0.1}s`;
    
    item.innerHTML = `
        <div class="timeline-content">
            <div class="timeline-text">
                <div class="timeline-date">
                    <i class="far fa-calendar"></i>
                    <span>${event.date}</span>
                </div>
                <h3>${event.title}</h3>
                ${event.secret ? `
                    <button class="secret-message-btn" data-message="${event.secret.replace(/"/g, '&quot;')}">
                        <i class="fas fa-lock"></i> Mensagem Secreta
                    </button>
                ` : ''}
            </div>
            <div class="timeline-photo">
                <div class="photo-polaroid">
                    <p class="polaroid-caption">${event.caption || ''}</p>
                </div>
            </div>
        </div>
        <div class="timeline-line"></div>
    `;

    const img = document.createElement('img');
    
    if (event.photoLarge) {
        img.src = event.photoLarge;
    } else if (event.photo) {
        if (typeof optimizeExistingUrl === 'function') {
            img.src = optimizeExistingUrl(event.photo, 1600);
        } else {
            img.src = event.photo;
        }
    } else {
        img.src = 'images/capas-albuns/default-music.jpg';
    }

    img.alt = event.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.style.filter = 'blur(10px)';
    img.style.transition = 'filter 0.4s ease-out';

    img.addEventListener('load', () => {
        img.style.filter = 'none';
    }, { once: true });

    const polaroid = item.querySelector('.photo-polaroid');
    const caption = polaroid.querySelector('.polaroid-caption');
    polaroid.insertBefore(img, caption);
    
    return item;
}

window.createTimelineItem = createTimelineItem;

function applyTimelineIntercalation() {
    const items = document.querySelectorAll('.timeline-item[data-id]');
    
    if (items.length === 0) return;
    
    items.forEach(item => {
        item.classList.remove('left', 'right');
    });
    
    items.forEach((item, index) => {
        const side = index % 2 === 0 ? 'left' : 'right';
        item.classList.add(side);
        
        updateFirebaseSide(item.getAttribute('data-id'), side);
    });
    
    console.log(`✅ Timeline intercalada: ${items.length} eventos`);
}

window.applyTimelineIntercalation = applyTimelineIntercalation;

window.applyTimelineIntercalation = applyTimelineIntercalation;

async function updateFirebaseSide(eventId, side) {
    try {
        await db.collection('timeline').doc(eventId).update({
            side: side,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.warn(`⚠️ Não foi possível atualizar lado do evento ${eventId}:`, error);
    }
}

window.updateFirebaseSide = updateFirebaseSide;

console.log('✅ Sistema de renderização de álbuns e timeline carregado!');