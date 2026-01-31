// ===== CONFIGURAÇÃO DO FIREBASE (COM CLOUDINARY PARA IMAGENS) =====

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

// Inicializar APENAS Firestore (storage no Cloudinary)
const db = firebase.firestore();

console.log('🔥 Firebase inicializado! Cloudinary para imagens.');

// ===== FUNÇÕES DE OTIMIZAÇÃO CLOUDINARY =====

/**
 * Otimiza URL do Cloudinary com parâmetros de transformação
 * @param {string} originalUrl - URL original da imagem
 * @param {object} options - Opções de otimização
 * @returns {string} URL otimizada
 */
function getOptimizedCloudinaryUrl(originalUrl, options = {}) {
    // Se não for URL do Cloudinary, retornar original
    if (!originalUrl || !originalUrl.includes('cloudinary.com')) {
        console.warn('⚠️ URL não é do Cloudinary:', originalUrl?.substring(0, 50));
        return originalUrl;
    }
    
    const {
        width = null,
        height = null,
        quality = 'auto',
        format = 'auto',
        crop = 'fill',
        gravity = 'auto',
        effect = null,
        blur = null
    } = options;
    
    // Extrair partes da URL do Cloudinary
    // Formato esperado: https://res.cloudinary.com/NOME/image/upload/vTIMESTAMP/FOLDER/IMAGE.jpg
    
    try {
        const urlParts = originalUrl.split('/upload/');
        if (urlParts.length !== 2) return originalUrl;
        
        const [base, path] = urlParts;
        
        // Construir transformações
        const transformations = [];
        
        if (width && height) {
            transformations.push(`c_${crop},g_${gravity},w_${width},h_${height}`);
        } else if (width) {
            transformations.push(`w_${width}`);
        } else if (height) {
            transformations.push(`h_${height}`);
        }
        
        if (quality) {
            transformations.push(`q_${quality}`);
        }
        
        if (format && format !== 'auto') {
            transformations.push(`f_${format}`);
        }
        
        if (effect) {
            transformations.push(`e_${effect}`);
        }
        
        if (blur) {
            transformations.push(`e_blur:${blur}`);
        }
        
        // Montar URL final
        if (transformations.length > 0) {
            return `${base}/upload/${transformations.join(',')}/${path}`;
        }
        
        return originalUrl;
        
    } catch (error) {
        console.error('❌ Erro ao otimizar URL Cloudinary:', error);
        return originalUrl;
    }
}

/**
 * Obtém URL da thumbnail (pequena e rápida)
 */
function getThumbnailUrl(originalUrl) {
    return getOptimizedCloudinaryUrl(originalUrl, {
        width: 400,
        height: 300,
        quality: 40,
        crop: 'fill',
        gravity: 'auto',
        format: 'webp'
    });
}

/**
 * Obtém URL da imagem média (para carrossel)
 */
function getMediumImageUrl(originalUrl) {
    return getOptimizedCloudinaryUrl(originalUrl, {
        width: 800,
        height: 600,
        quality: 70,
        crop: 'fill',
        gravity: 'auto',
        format: 'webp'
    });
}

/**
 * Obtém URL da imagem grande (para modal)
 */
function getLargeImageUrl(originalUrl) {
    return getOptimizedCloudinaryUrl(originalUrl, {
        width: 1200,
        quality: 85,
        format: 'webp'
    });
}

/**
 * Obtém URL para placeholder borrado (LQIP - Low Quality Image Placeholder)
 */
function getBlurredPlaceholderUrl(originalUrl) {
    return getOptimizedCloudinaryUrl(originalUrl, {
        width: 100,
        quality: 10,
        effect: 'blur:1000',
        format: 'webp'
    });
}

// ===== FUNÇÃO AUXILIAR: CRIAR IMAGEM COM CLOUDINARY =====

function createCloudinaryImage(album) {
    const img = document.createElement('img');
    img.alt = album.title;
    img.loading = 'lazy';
    img.className = 'album-cover-img';
    
    // Se não tiver URL ou não for Cloudinary
    if (!album.cover || !album.cover.includes('cloudinary.com')) {
        console.warn(`⚠️ Álbum "${album.title}" não tem URL Cloudinary`);
        img.src = album.cover || 'images/capas-albuns/default-music.jpg';
        return img;
    }
    
    // ✅ USANDO CLOUDINARY COM VERSÕES OTIMIZADAS
    
    // 1. Começar com placeholder borrado (instantâneo)
    const placeholderUrl = getBlurredPlaceholderUrl(album.cover);
    img.src = placeholderUrl;
    
    // 2. Pré-carregar thumbnail
    const thumbUrl = getThumbnailUrl(album.cover);
    const thumbImg = new Image();
    thumbImg.src = thumbUrl;
    
    thumbImg.onload = () => {
        // Mostrar thumbnail
        img.src = thumbUrl;
        img.classList.add('lazy-thumb-loaded');
        
        // 3. Pré-carregar imagem média em background
        const mediumUrl = getMediumImageUrl(album.cover);
        const mediumImg = new Image();
        mediumImg.src = mediumUrl;
        
        mediumImg.onload = () => {
            img.src = mediumUrl;
            img.classList.remove('lazy-thumb-loaded');
            img.classList.add('lazy-medium-loaded');
            
            // 4. Opcional: carregar imagem grande se for importante
            if (album.isFeatured) {
                const largeUrl = getLargeImageUrl(album.cover);
                const largeImg = new Image();
                largeImg.src = largeUrl;
                
                largeImg.onload = () => {
                    img.src = largeUrl;
                    img.classList.remove('lazy-medium-loaded');
                    img.classList.add('lazy-full-loaded');
                };
            }
        };
    };
    
    return img;
}

// ===== SISTEMA DE RENDERIZAÇÃO DE ÁLBUNS =====

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
        
        // ✅ USAR CLOUDINARY PARA OTIMIZAÇÃO
        const coverImg = createCloudinaryImage(album);
        
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
    
    // Mostrar primeira foto COM OTIMIZAÇÃO CLOUDINARY
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
    const photoUrl = photo.src || photo.url || photo;
    
    // Se for Cloudinary, otimizar
    let optimizedUrl = photoUrl;
    if (photoUrl && photoUrl.includes('cloudinary.com')) {
        optimizedUrl = getLargeImageUrl(photoUrl);
    }
    
    // Aplicar placeholder e carregamento progressivo
    modalPhoto.classList.add('lazy-loading');
    
    // Primeiro mostrar thumbnail
    const thumbUrl = getThumbnailUrl(photoUrl);
    modalPhoto.src = thumbUrl;
    
    // Depois carregar imagem completa
    const fullImg = new Image();
    fullImg.src = optimizedUrl;
    
    fullImg.onload = () => {
        modalPhoto.src = optimizedUrl;
        modalPhoto.classList.remove('lazy-loading');
        modalPhoto.classList.add('lazy-full-loaded');
    };
    
    modalPhoto.alt = photo.description || `Foto ${window.currentPhotoIndex + 1}`;
    currentPhotoSpan.textContent = window.currentPhotoIndex + 1;
}

// ===== CARREGAR ÁLBUNS DO FIREBASE =====
async function loadAlbumsFromFirebase() {
    console.log('🔄 Carregando álbuns do Firebase...');
    
    try {
        const snapshot = await db.collection('albums').orderBy('createdAt', 'asc').limit(20).get();
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
                if (pageData.photos && Array.isArray(pageData.photos)) {
                    allPhotos.push(...pageData.photos);
                }
            });
            
            console.log(`   ✅ ${allPhotos.length} fotos carregadas`);
            
            firebaseAlbums.push({
                id: doc.id,
                title: albumData.title,
                date: albumData.date,
                cover: albumData.cover,
                description: albumData.description,
                photoCount: allPhotos.length,
                photos: allPhotos,
                isFeatured: albumData.isFeatured || false
            });
        }
        
        console.log(`✅ Total de álbuns carregados: ${firebaseAlbums.length}`);
        
        // Atualizar álbuns globais
        window.albums = firebaseAlbums;

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

// ===== FUNÇÃO TIMELINE OTIMIZADA CLOUDINARY =====

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
    
    // ✅ OTIMIZAR COM CLOUDINARY
    if (event.photo) {
        if (event.photo.includes('cloudinary.com')) {
            // Usar thumbnail para timeline
            const thumbUrl = getThumbnailUrl(event.photo);
            img.src = thumbUrl;
            
            // Pré-carregar versão média
            const mediumImg = new Image();
            mediumImg.src = getMediumImageUrl(event.photo);
            
            mediumImg.onload = () => {
                img.src = mediumImg.src;
                img.classList.add('loaded');
            };
        } else {
            // Fallback para URLs não-Cloudinary
            img.src = event.photo;
        }
    } else {
        img.src = 'images/capas-albuns/default-music.jpg';
    }

    img.alt = event.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.classList.add('img-placeholder');
    
    img.addEventListener('load', () => {
        img.classList.remove('img-placeholder');
        img.classList.add('lazy-loaded');
    }, { once: true });

    const polaroid = item.querySelector('.photo-polaroid');
    const caption = polaroid.querySelector('.polaroid-caption');
    polaroid.insertBefore(img, caption);
    
    return item;
}

// ===== INICIALIZAR QUANDO A PÁGINA CARREGAR =====
console.log('📋 Estado do documento:', document.readyState);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📋 DOMContentLoaded disparado');
        setTimeout(async () => {
            console.log('🚀 Iniciando carregamento de álbuns...');
            await loadAlbumsFromFirebase();
            await loadTimelineFromFirebase();
        }, 1000);
    });
} else {
    console.log('📋 Documento já carregado, iniciando imediatamente');
    setTimeout(async () => {
        console.log('🚀 Iniciando carregamento de álbuns...');
        await loadAlbumsFromFirebase();
        await loadTimelineFromFirebase();
    }, 1000);
}

// ===== CARREGAR TIMELINE DO FIREBASE =====
async function loadTimelineFromFirebase() {
    try {
        console.log('📖 Carregando timeline do Firebase...');
        
        if (typeof rebuildTimeline !== 'function') {
            console.log('⏳ Aguardando carregamento do admin.js para rebuildTimeline...');
            const checkInterval = setInterval(async () => {
                if (typeof rebuildTimeline === 'function') {
                    clearInterval(checkInterval);
                    await window.rebuildTimeline();
                }
            }, 500);
            
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('⚠️ Timeout aguardando rebuildTimeline');
            }, 10000);
        } else {
            await window.rebuildTimeline();
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar timeline:', error);
    }
}

// ===== EXPORTAR FUNÇÕES DE OTIMIZAÇÃO =====
window.getOptimizedCloudinaryUrl = getOptimizedCloudinaryUrl;
window.getThumbnailUrl = getThumbnailUrl;
window.getMediumImageUrl = getMediumImageUrl;
window.getLargeImageUrl = getLargeImageUrl;

console.log('✅ Sistema Firebase com Cloudinary carregado!');
