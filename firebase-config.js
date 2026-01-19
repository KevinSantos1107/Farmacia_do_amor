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
        const snapshot = await db.collection('albums').orderBy('createdAt', 'desc').get();
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
        
        // Atualizar álbuns globais (APENAS Firebase)
        window.albums = firebaseAlbums;

        // RENDERIZAR OS ÁLBUNS
        renderAlbums(firebaseAlbums);
        
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
    const container = document.getElementById('albumsContainer');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (albums.length === 0) {
        container.innerHTML = `<div>Nenhum álbum criado ainda</div>`;
        return;
    }
    
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
        
        container.appendChild(albumCard);
    });
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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(async () => {
            await forceLoadAlbums();
            await loadTimelineFromFirebase();
        }, 1000);
    });
} else {
    setTimeout(async () => {
        await forceLoadAlbums();
        await loadTimelineFromFirebase();
    }, 1000);
}

// ===== CARREGAR TIMELINE DO FIREBASE =====
async function loadTimelineFromFirebase() {
    try {
        console.log('📖 Carregando timeline do Firebase...');
        
        if (typeof rebuildTimeline === 'function') {
            await rebuildTimeline();
        } else {
            console.warn('⚠️ Função rebuildTimeline não encontrada');
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