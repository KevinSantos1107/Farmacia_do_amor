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
        
        // Mesclar com álbuns originais (se existirem)
        let allAlbums = firebaseAlbums;
        
        if (typeof window.albums !== 'undefined' && window.albums.length > 0) {
            // Filtrar álbuns originais (não duplicar)
            const originalAlbums = window.albums.filter(a => !a.id || !firebaseAlbums.find(fb => fb.id === a.id));
            allAlbums = [...originalAlbums, ...firebaseAlbums];
            console.log(`📚 Total (originais + Firebase): ${allAlbums.length}`);
        }
        
        // Atualizar álbuns globais
        window.albums = allAlbums;
        
        // RENDERIZAR OS ÁLBUNS
        renderAlbums(allAlbums);
        
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
        setTimeout(forceLoadAlbums, 1000);
    });
} else {
    setTimeout(forceLoadAlbums, 1000);
}

console.log('✅ Sistema de renderização de álbuns carregado!');