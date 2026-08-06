// ===== CONFIGURAÇÃO DO FIREBASE =====

const firebaseConfig = {
  apiKey: "AIzaSyCgt_eD3M_n9bhuhSzOxpf5f_ck43ZZZ-o",
  authDomain: "kevin-iara-site.firebaseapp.com",
  projectId: "kevin-iara-site",
  storageBucket: "kevin-iara-site.firebasestorage.app",
  messagingSenderId: "236663809364",
  appId: "1:236663809364:web:c0103bf11a1c37064214c1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

db.enablePersistence().catch(err => {
    console.warn('⚠️ Cache offline não pôde ser ativado:', err.code);
});

console.log('🔥 Firebase inicializado!');

// ============================================================
// SISTEMA DE FOTOS — CACHE + FETCH UNIFICADO
// ============================================================

// Cache global de Promises por albumId.
// Garante que a mesma Promise não é disparada duas vezes para
// o mesmo álbum (de-duplication) e dados ficam reutilizáveis.
const _photoCache = new Map(); // albumId -> Promise<photos[]>

/**
 * Busca as fotos de um álbum do Firestore.
 * Retorna sempre a MESMA Promise para chamadas simultâneas
 * ao mesmo álbum (request de-duplication).
 */
async function fetchAlbumPhotos(albumId) {
    if (_photoCache.has(albumId)) {
        return _photoCache.get(albumId);
    }

    const promise = (async () => {
        console.log(`🔄 Buscando fotos do álbum ${albumId}...`);
        try {
            const snapshot = await db.collection('album_photos')
                .where('albumId', '==', albumId)
                .orderBy('pageNumber', 'asc')
                .get();

            const photos = [];
            snapshot.forEach(doc => photos.push(...doc.data().photos));
            console.log(`✅ ${photos.length} fotos carregadas para ${albumId}`);
            return photos;
        } catch (err) {
            console.error(`❌ Erro ao buscar fotos do álbum ${albumId}:`, err);
            _photoCache.delete(albumId); // permite retry
            return [];
        }
    })();

    _photoCache.set(albumId, promise);
    return promise;
}
window.fetchAlbumPhotos = fetchAlbumPhotos;

/**
 * Garante que as fotos estão carregadas no objeto de álbum.
 * Muta album.photos in-place se estiver vazio.
 * Retorna true se ok, false se falhou.
 */
async function ensureAlbumPhotos(album) {
    if (!album) return false;
    if (album.photos && album.photos.length > 0) return true;

    album.photos = await fetchAlbumPhotos(album.id);
    return album.photos.length > 0;
}
window.ensureAlbumPhotos = ensureAlbumPhotos;

/**
 * Pré-carrega dados (Firestore) dos álbuns adjacentes em background.
 * Chamado logo após um álbum ser aberto para que o próximo swipe
 * encontre os dados já na memória e a animação do cubo funcione.
 */
async function prefetchAdjacentAlbumsData(currentAlbumId) {
    if (!window.albums || window.albums.length < 2) return;

    const idx   = window.albums.findIndex(a => a.id === currentAlbumId);
    if (idx === -1) return;

    const total     = window.albums.length;
    const nextAlbum = window.albums[(idx + 1) % total];
    const prevAlbum = window.albums[(idx - 1 + total) % total];

    const toFetch = [nextAlbum, prevAlbum].filter(
        a => a && (!a.photos || a.photos.length === 0)
    );

    if (toFetch.length === 0) {
        console.log('🔮 Álbuns adjacentes já estão em cache.');
        return;
    }

    console.log(`🔮 Pré-buscando dados de ${toFetch.length} álbum(ns) adjacente(s) em background...`);
    await Promise.all(toFetch.map(a => ensureAlbumPhotos(a)));
    console.log('✅ Pré-busca de álbuns adjacentes concluída.');
}
window.prefetchAdjacentAlbumsData = prefetchAdjacentAlbumsData;

// ============================================================
// MODAL DO ÁLBUM — compatibilidade com outros pontos do site
// ============================================================
async function openAlbumModal(album) {
    const modal      = document.getElementById('albumModal');
    const modalTitle = document.getElementById('modalAlbumTitle');

    if (!modal) { console.warn('⚠️ Modal de álbum não encontrado'); return; }

    if (!(await ensureAlbumPhotos(album))) {
        console.warn('⚠️ Nenhuma foto encontrada para este álbum.');
        if (modalTitle) modalTitle.textContent = album.title + ' (Vazio)';
        return;
    }

    window.currentAlbum      = album;
    window.currentPhotoIndex = 0;

    if (modalTitle) modalTitle.textContent = album.title;

    const totalPhotosSpan = document.getElementById('totalPhotos');
    if (totalPhotosSpan) totalPhotosSpan.textContent = album.photos.length;

    updateModalPhoto();

    modal.style.display          = 'flex';
    document.body.style.overflow = 'hidden';

    console.log(`📖 openAlbumModal: ${album.title} (${album.photos.length} fotos)`);
}

// ============================================================
// ATUALIZAR FOTO NO MODAL
// ============================================================
function updateModalPhoto() {
    const modalPhoto       = document.getElementById('modalPhoto');
    const currentPhotoSpan = document.getElementById('currentPhoto');

    if (!window.currentAlbum || !window.currentAlbum.photos) return;

    const photo  = window.currentAlbum.photos[window.currentPhotoIndex];
    modalPhoto.src = photo.src || photo;
    modalPhoto.alt = photo.description || `Foto ${window.currentPhotoIndex + 1}`;
    if (currentPhotoSpan) currentPhotoSpan.textContent = window.currentPhotoIndex + 1;
}

// ============================================================
// CARREGAR ÁLBUNS DO FIREBASE (apenas metadados — sem fotos)
// ============================================================
async function loadAlbumsFromFirebase() {
    console.log('🔄 Carregando álbuns do Firebase...');

    try {
        const snapshot = await db.collection('albums').orderBy('createdAt', 'asc').limit(20).get();
        const firebaseAlbums = [];

        console.log(`📦 ${snapshot.size} álbuns encontrados`);

        snapshot.docs.forEach(doc => {
            const d = doc.data();
            firebaseAlbums.push({
                id:          doc.id,
                title:       d.title,
                date:        d.date,
                cover:       d.cover,
                coverThumb:  d.coverThumb,
                coverLarge:  d.coverLarge,
                description: d.description,
                photoCount:  d.photoCount || 0,
                photos:      [] // carregadas sob demanda via ensureAlbumPhotos
            });
        });

        console.log(`✅ ${firebaseAlbums.length} álbuns carregados (metadados)`);

        window.albums = firebaseAlbums;

        if (typeof initAlbums === 'function') {
            setTimeout(() => {
                console.log('🎠 Inicializando carrossel...');
                initAlbums();
            }, 200);
        } else {
            console.warn('⚠️ Função initAlbums não encontrada');
        }

        return firebaseAlbums;

    } catch (error) {
        console.error('❌ Erro ao carregar álbuns do Firebase:', error);
        if (typeof window.albums !== 'undefined' && typeof renderAlbums === 'function') {
            renderAlbums(window.albums);
        }
        throw error;
    }
}

// ============================================================
// CRIAR IMAGEM DE CAPA COM FALLBACK RESPONSIVO
// ============================================================
function createAlbumCoverImage(album) {
    const coverImg       = document.createElement('img');
    coverImg.alt         = album.title;
    coverImg.loading     = 'lazy';
    coverImg.className   = 'album-cover-img';
    coverImg.style.filter     = 'blur(10px)';
    coverImg.style.transition = 'filter 0.3s ease';
    coverImg.addEventListener('load', () => { coverImg.style.filter = 'none'; }, { once: true });

    if (album.coverThumb && album.coverLarge) {
        coverImg.src    = album.cover;
        coverImg.srcset = `${album.coverThumb} 400w, ${album.cover} 800w, ${album.coverLarge} 1600w`;
        coverImg.sizes  = '(max-width: 400px) 400px, (max-width: 800px) 800px, 1600px';
    } else {
        coverImg.src = (typeof optimizeExistingUrl === 'function')
            ? optimizeExistingUrl(album.cover, 800)
            : album.cover;
    }

    return coverImg;
}

// ============================================================
// RENDERIZAR ÁLBUNS (lista simples — compatibilidade)
// ============================================================
function renderAlbums(albums) {
    const container = document.getElementById('albumsCarousel');
    if (!container) return;

    container.innerHTML = '';

    if (!albums || albums.length === 0) {
        container.innerHTML = '<div>Nenhum álbum criado ainda</div>';
        return;
    }

    const fragment = document.createDocumentFragment();

    albums.forEach(album => {
        const albumCard      = document.createElement('div');
        albumCard.className  = 'album-card';
        albumCard.dataset.id = album.id;

        const coverImg = createAlbumCoverImage(album);

        albumCard.innerHTML = `
            <div class="album-cover-container"></div>
            <div class="album-info">
                <h3>${album.title}</h3>
                <p class="album-date"><i class="far fa-calendar-alt"></i> ${album.date}</p>
                <p>${album.description}</p>
                <div class="album-stats">
                    <span><i class="far fa-images"></i> ${album.photoCount || 0} ${album.photoCount === 1 ? 'foto' : 'fotos'}</span>
                </div>
            </div>
        `;

        albumCard.querySelector('.album-cover-container').appendChild(coverImg);
        albumCard.addEventListener('click', () => openAlbum(album.id));
        fragment.appendChild(albumCard);
    });

    container.appendChild(fragment);
}

// ============================================================
// FORÇAR CARREGAMENTO DOS ÁLBUNS
// ============================================================
let forceLoadRetries = 0;
async function forceLoadAlbums() {
    console.log('🔄 FORÇANDO carregamento de álbuns...');

    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        forceLoadRetries++;
        if (forceLoadRetries > 30) {
            console.error('❌ Firebase não carregou após 15 segundos. Desistindo.');
            return;
        }
        console.warn(`⚠️ Firebase ainda não está pronto... (tentativa ${forceLoadRetries})`);
        setTimeout(forceLoadAlbums, 500);
        return;
    }

    try {
        await loadAlbumsFromFirebase();
    } catch (error) {
        console.error('❌ Erro ao forçar carregamento:', error);
    }
}

// ============================================================
// INICIALIZAÇÃO DA PÁGINA
// ============================================================
const _onFirebaseReady = async () => {
    console.log('🚀 Iniciando carregamento de álbuns...');
    await forceLoadAlbums();
    await loadTimelineFromFirebase();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(_onFirebaseReady, 1000));
} else {
    setTimeout(_onFirebaseReady, 1000);
}

// ============================================================
// CARREGAR TIMELINE DO FIREBASE
// ============================================================
async function loadTimelineFromFirebase() {
    try {
        console.log('📖 Carregando timeline do Firebase...');

        if (typeof rebuildTimeline !== 'function') {
            await new Promise((resolve) => {
                const timeout  = setTimeout(() => { console.warn('⚠️ Timeout rebuildTimeline'); resolve(); }, 10000);
                const interval = setInterval(async () => {
                    if (typeof rebuildTimeline === 'function') {
                        clearInterval(interval);
                        clearTimeout(timeout);
                        await window.rebuildTimeline();
                        resolve();
                    }
                }, 500);
            });
        } else {
            await window.rebuildTimeline();
        }
    } catch (error) {
        console.error('❌ Erro ao carregar timeline:', error);
    }
}

// ============================================================
// STAR MAP
// ============================================================
async function loadStarMapConfigFromFirebase() {
    try {
        const doc = await db.collection('star_map_config').doc('settings').get();
        if (doc.exists) { console.log('✅ Configurações do Star Map carregadas'); return doc.data(); }
        console.log('⚠️ Nenhuma configuração do Star Map encontrada');
        return null;
    } catch (error) {
        console.error('❌ Erro ao carregar Star Map:', error);
        return null;
    }
}

async function saveStarMapConfigToFirebase(config) {
    try {
        await db.collection('star_map_config').doc('settings').set({
            specialDate:    config.specialDate    || null,
            customLocation: config.customLocation || null,
            romanticQuote:  config.romanticQuote  || 'O céu quando nossos mundos se colidiram',
            updatedAt:      firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Configurações do Star Map salvas');
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar Star Map:', error);
        return false;
    }
}

async function forceReloadStarMap() {
    try {
        window.starMap = null;
        await loadStarMapConfigFromFirebase();
        if (typeof initializeStarMapWithConfig === 'function') {
            await initializeStarMapWithConfig();
            console.log('✅ Star Map recarregado!');
        }
        return true;
    } catch (error) {
        console.error('❌ Erro ao recarregar Star Map:', error);
        return false;
    }
}

window.forceReloadStarMap = forceReloadStarMap;

console.log('✅ firebase-config.js — Sistema profissional de álbuns carregado!');

// ===== Timeline logic moved to js/timeline.js =====
