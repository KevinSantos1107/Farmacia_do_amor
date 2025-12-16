// ===== CONFIGURAÇÃO DO FIREBASE (SEM STORAGE) =====

// COLE AQUI AS SUAS CREDENCIAIS
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

console.log('🔥 Firebase inicializado (sem Storage)!');




// ===== CONFIGURAÇÃO DO IMGBB =====

// VERIFICAR se já foi declarado em outro arquivo
if (typeof IMGBB_API_KEY === 'undefined') {
    // COLE AQUI SUA API KEY DO IMGBB (se não tiver imgbb-config.js)
    var IMGBB_API_KEY = 'ca7a2dbb851032d7d3ed05ce9e8a6d67';
    console.log('📸 API Key do ImgBB carregada do firebase-config.js');
} else {
    console.log('📸 API Key do ImgBB já estava carregada');
}

// ===== FUNÇÃO PARA CONVERTER E REDIMENSIONAR IMAGEM =====
function imageToBase64(file, maxWidth = 1200) {
    return new Promise((resolve, reject) => {
        // Validar se é uma imagem
        if (!file.type.startsWith('image/')) {
            reject(new Error('Arquivo não é uma imagem válida'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                // Criar canvas para redimensionar
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calcular novo tamanho mantendo proporção
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                // Configurar canvas
                canvas.width = width;
                canvas.height = height;
                
                // Desenhar imagem redimensionada
                ctx.drawImage(img, 0, 0, width, height);
                
                // Converter para base64 (JPEG com qualidade 85%)
                const base64 = canvas.toDataURL('image/jpeg', 0.85);
                resolve(base64);
            };
            
            img.onerror = () => {
                reject(new Error('Erro ao carregar a imagem'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('Erro ao ler o arquivo'));
        };
        
        reader.readAsDataURL(file);
    });
}

// ===== FUNÇÃO PARA UPLOAD NO IMGBB =====
async function uploadToImgBB(file, maxWidth = 1200) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`📤 Iniciando upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
            
            // Validar tamanho (ImgBB aceita até 32MB)
            if (file.size > 32 * 1024 * 1024) {
                reject(new Error('Arquivo muito grande! Máximo 32MB'));
                return;
            }
            
            // Converter e redimensionar imagem
            const base64 = await imageToBase64(file, maxWidth);
            
            // Remover prefixo "data:image/...;base64,"
            const base64Clean = base64.split(',')[1];
            
            // Criar FormData para enviar
            const formData = new FormData();
            formData.append('image', base64Clean);
            
            console.log('📡 Enviando para ImgBB...');
            
            // Enviar para ImgBB
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Erro no upload para ImgBB');
            }
            
            const data = await response.json();
            
            if (data.success && data.data && data.data.url) {
                const imageUrl = data.data.url;
                console.log('✅ Upload concluído:', imageUrl);
                resolve(imageUrl);
            } else {
                reject(new Error('ImgBB não retornou URL válida'));
            }
            
        } catch (error) {
            console.error('❌ Erro no upload ImgBB:', error);
            reject(error);
        }
    });
}

// ===== VALIDAÇÃO DA API KEY =====
async function validateImgBBKey() {
    try {
        // Criar uma imagem de teste pequena (1x1 pixel transparente)
        const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        
        const formData = new FormData();
        formData.append('image', testImage);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            console.log('✅ API Key do ImgBB válida!');
            return true;
        } else {
            console.error('❌ API Key do ImgBB inválida!');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao validar ImgBB:', error);
        return false;
    }
}

// Validar ao carregar
setTimeout(() => {
    validateImgBBKey();
}, 1000);

// ===== CORREÇÃO: SISTEMA DE RENDERIZAÇÃO DE ÁLBUNS =====
// Adicione este código ao final do seu firebase-config.js ou admin.js

// ===== FUNÇÃO PARA RENDERIZAR ÁLBUNS NA PÁGINA =====
function renderAlbums(albums) {
    const container = document.getElementById('albumsContainer');
    
    if (!container) {
        console.error('❌ Container de álbuns não encontrado (#albumsContainer)');
        return;
    }
    
    console.log(`🖼️ Renderizando ${albums.length} álbuns...`);
    
    // Limpar container
    container.innerHTML = '';
    
    if (albums.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--theme-text-secondary);">
                <i class="fas fa-images" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>Nenhum álbum disponível ainda</p>
            </div>
        `;
        return;
    }
    
    // Renderizar cada álbum
    albums.forEach((album, index) => {
        const albumCard = document.createElement('div');
        albumCard.className = 'album-card';
        albumCard.style.animationDelay = `${index * 0.1}s`;
        albumCard.setAttribute('data-album-id', album.id || index);
        
        albumCard.innerHTML = `
            <div class="album-cover">
                <img src="${album.cover}" alt="${album.title}" loading="lazy">
                <div class="album-overlay">
                    <div class="album-info">
                        <h3>${album.title}</h3>
                        <p><i class="far fa-calendar"></i> ${album.date}</p>
                        <p><i class="fas fa-images"></i> ${album.photos?.length || album.photoCount || 0} fotos</p>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar evento de clique
        albumCard.addEventListener('click', () => {
            openAlbumModal(album);
        });
        
        container.appendChild(albumCard);
    });
    
    console.log('✅ Álbuns renderizados com sucesso!');
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

// ===== CONTROLES DO MODAL =====
document.addEventListener('DOMContentLoaded', () => {
    // Botão fechar modal
    const closeModal = document.getElementById('closeModal');
    const albumModal = document.getElementById('albumModal');
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            albumModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }
    
    // Clicar fora do modal
    if (albumModal) {
        albumModal.addEventListener('click', (e) => {
            if (e.target === albumModal) {
                closeModal.click();
            }
        });
    }
    
    // Botão anterior
    const prevPhotoBtn = document.getElementById('prevPhotoBtn');
    if (prevPhotoBtn) {
        prevPhotoBtn.addEventListener('click', () => {
            if (window.currentAlbum && window.currentPhotoIndex > 0) {
                window.currentPhotoIndex--;
                updateModalPhoto();
            }
        });
    }
    
    // Botão próximo
    const nextPhotoBtn = document.getElementById('nextPhotoBtn');
    if (nextPhotoBtn) {
        nextPhotoBtn.addEventListener('click', () => {
            if (window.currentAlbum && window.currentPhotoIndex < window.currentAlbum.photos.length - 1) {
                window.currentPhotoIndex++;
                updateModalPhoto();
            }
        });
    }
    
    // Teclas do teclado
    document.addEventListener('keydown', (e) => {
        if (albumModal && albumModal.style.display === 'flex') {
            if (e.key === 'Escape') {
                closeModal.click();
            } else if (e.key === 'ArrowLeft') {
                prevPhotoBtn.click();
            } else if (e.key === 'ArrowRight') {
                nextPhotoBtn.click();
            }
        }
    });
});

// ===== VERSÃO MELHORADA DE loadAlbumsFromFirebase =====
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
        
        if (typeof window.originalAlbums !== 'undefined' && window.originalAlbums.length > 0) {
            allAlbums = [...window.originalAlbums, ...firebaseAlbums];
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
        if (typeof window.originalAlbums !== 'undefined') {
            console.log('⚠️ Renderizando apenas álbuns originais devido ao erro');
            renderAlbums(window.originalAlbums);
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

console.log('📸 ImgBB configurado e pronto!');

