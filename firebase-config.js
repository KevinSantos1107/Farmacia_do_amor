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
        
        // ✅ USAR createLazyImage()
        const coverImg = createLazyImage(album.cover, album.title, 'album-cover-img');
        
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
        
        // Inserir imagem lazy
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