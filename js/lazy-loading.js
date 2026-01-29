// ===== SISTEMA DE LAZY LOADING OTIMIZADO - COM PRÉ-CARREGAMENTO INTELIGENTE =====
console.log('🔼 Sistema de Lazy Loading Otimizado inicializado');

/**
 * Gerenciador de Lazy Loading com Pré-carregamento Estratégico
 */
const LazyLoadManager = {
    observer: null,
    observedImages: new Set(),
    preloadedAlbums: new Set(), // 🆕 Cache de álbuns pré-carregados
    preloadedPhotos: new Map(), // 🆕 Cache de fotos pré-carregadas por álbum
    stats: {
        total: 0,
        loaded: 0,
        errors: 0,
        preloaded: 0 // 🆕 Contador de pré-carregamentos
    },
    
    // 🆕 Configuração de otimização Instagram
    instagramConfig: {
        preloadPhotosPerAlbum: 3, // Carregar as primeiras 3 fotos de cada álbum
        preloadAdjacentAlbums: 2, // Pré-carregar 2 álbuns para cada lado
        prioritizeCenterAlbum: true // Priorizar álbum central do carrossel
    },
    
    init() {
        console.log('⚙️ Configurando Lazy Loading otimizado para Instagram...');
        
        if (!('IntersectionObserver' in window)) {
            console.warn('⚠️ IntersectionObserver não suportado');
            this.fallbackLoadAll();
            return;
        }
        
        // Observer para imagens normais
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            {
                root: null,
                rootMargin: '200px',
                threshold: 0.01
            }
        );
        
        // Observar imagens existentes
        this.observeExistingImages();
        
        // Monitorar novas imagens
        this.setupMutationObserver();
        
        // 🆕 Integração com carrossel
        this.setupCarouselIntegration();
        
        // 🆕 Integração com sistema Instagram
        this.setupInstagramIntegration();
        
        console.log('✅ Lazy Loading Instagram otimizado');
    },
    
    observeExistingImages() {
        const images = document.querySelectorAll('img[data-lazy-src]');
        
        images.forEach(img => {
            if (!this.observedImages.has(img)) {
                this.observer.observe(img);
                this.observedImages.add(img);
            }
        });
        
        console.log(`👀 Observando ${images.length} imagens`);
    },
    
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                this.loadImage(img);
            }
        });
    },
    
    loadImage(img, isPriority = false) {
        const src = img.getAttribute('data-lazy-src');
        
        if (!src || img.src === src) return;
        
        img.classList.add('lazy-loading');
        this.stats.total++;
        
        const tempImg = new Image();
        
        tempImg.onload = () => {
            img.src = src;
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-loaded');
            img.removeAttribute('data-lazy-src');
            
            if (this.observer) {
                this.observer.unobserve(img);
            }
            
            this.observedImages.delete(img);
            this.stats.loaded++;
            
            if (isPriority) {
                console.log(`⚡ Pré-carregada: ${src.substring(0, 50)}...`);
            }
        };
        
        tempImg.onerror = () => {
            console.error('❌ Erro ao carregar:', src.substring(0, 50));
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-error');
            img.src = 'images/capas-albuns/default-music.jpg';
            this.stats.errors++;
        };
        
        tempImg.src = src;
    },
    
    setupMutationObserver() {
        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'IMG' && node.hasAttribute('data-lazy-src')) {
                            if (!this.observedImages.has(node)) {
                                this.observer.observe(node);
                                this.observedImages.add(node);
                            }
                        }
                        
                        const images = node.querySelectorAll('img[data-lazy-src]');
                        images.forEach(img => {
                            if (!this.observedImages.has(img)) {
                                this.observer.observe(img);
                                this.observedImages.add(img);
                            }
                        });
                    }
                });
            });
        });
        
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    },
    
    // ===== 🆕 INTEGRAÇÃO COM CARROSSEL - PRÉ-CARREGAMENTO INTELIGENTE =====
    
    setupCarouselIntegration() {
        let attempts = 0;
        const checkCarousel = setInterval(() => {
            attempts++;
            
            if (typeof AlbumsCarousel3D !== 'undefined') {
                clearInterval(checkCarousel);
                this.patchCarouselForLazyLoad();
                console.log('✅ Carrossel integrado com pré-carregamento inteligente');
            }
            
            if (attempts > 10) {
                clearInterval(checkCarousel);
            }
        }, 500);
    },
    
    patchCarouselForLazyLoad() {
        // 🎯 PATCH: renderCards usa lazy loading
        AlbumsCarousel3D.prototype.renderCards = function() {
            this.track.innerHTML = '';
            
            window.albums.forEach((album, index) => {
                const card = document.createElement('div');
                card.className = 'carousel-album-card';
                card.dataset.index = index;
                card.dataset.id = album.id;
                
                // ✅ Usar createLazyImage
                const img = createLazyImage(album.cover, album.title, 'carousel-album-cover');
                img.style.width = '100%';
                img.style.height = '65%';
                img.style.objectFit = 'cover';
                
                const infoDiv = document.createElement('div');
                infoDiv.className = 'carousel-album-info';
                infoDiv.innerHTML = `
                    <h3>${album.title}</h3>
                    <p class="carousel-album-date">
                        <i class="far fa-calendar-alt"></i> ${album.date}
                    </p>
                    <p class="carousel-album-stats">
                        <i class="far fa-images"></i> ${album.photoCount} ${album.photoCount === 1 ? 'foto' : 'fotos'}
                    </p>
                `;
                
                card.appendChild(img);
                card.appendChild(infoDiv);
                this.track.appendChild(card);
            });
        };
        
        // 🎯 PATCH: updatePositions chama pré-carregamento
        const originalUpdatePositions = AlbumsCarousel3D.prototype.updatePositions;
        
        AlbumsCarousel3D.prototype.updatePositions = function() {
            originalUpdatePositions.call(this);
            
            // 🆕 Pré-carregar primeira foto dos álbuns visíveis
            LazyLoadManager.preloadVisibleAlbums(this.currentIndex);
        };
    },
    
    // 🆕 PRÉ-CARREGAR PRIMEIRA FOTO DOS ÁLBUNS VISÍVEIS
    preloadVisibleAlbums(centerIndex) {
        if (!window.albums || window.albums.length === 0) return;
        
        const total = window.albums.length;
        
        // Calcular índices dos álbuns visíveis
        const leftIndex = (centerIndex - 1 + total) % total;
        const rightIndex = (centerIndex + 1) % total;
        
        const visibleIndices = [centerIndex, leftIndex, rightIndex];
        
        // ✨ PRIORIZAR: Pré-carregar mais fotos do álbum central
        this.preloadAlbumPhotos(centerIndex);
        
        // Pré-carregar primeira foto dos adjacentes
        [leftIndex, rightIndex].forEach(index => {
            const album = window.albums[index];
            
            if (!album.photos || album.photos.length === 0) {
                return;
            }
            
            const firstPhoto = album.photos[0];
            this.preloadFirstPhoto(album.id, firstPhoto.src);
        });
        
        console.log(`🎯 Álbuns visíveis otimizados: centro=${centerIndex}, adjacentes=[${leftIndex}, ${rightIndex}]`);
    },
    
    // 🆕 PRÉ-CARREGAR UMA FOTO ESPECÍFICA
    preloadFirstPhoto(albumId, photoSrc) {
        const img = new Image();
        
        img.onload = () => {
            this.preloadedAlbums.add(albumId);
            this.stats.preloaded++;
            console.log(`✅ Primeira foto pré-carregada para álbum ${albumId}`);
        };
        
        img.onerror = () => {
            console.warn(`⚠️ Erro ao pré-carregar foto do álbum ${albumId}`);
        };
        
        img.src = photoSrc;
    },

    // 🆕 INTEGRAÇÃO COM SISTEMA INSTAGRAM - PRÉ-CARREGAMENTO AGRESSIVO
    setupInstagramIntegration() {
        let attempts = 0;
        const checkInstagram = setInterval(() => {
            attempts++;
            
            if (typeof InstagramNavigation !== 'undefined') {
                clearInterval(checkInstagram);
                this.patchInstagramNavigation();
                console.log('🎬 Instagram Navigation integrada com pré-carregamento');
            }
            
            if (attempts > 10) {
                clearInterval(checkInstagram);
            }
        }, 500);
    },
    
    /**
     * 🆕 OTIMIZAÇÃO INSTAGRAM: Pré-carregar fotos quando navegar entre álbuns
     */
    patchInstagramNavigation() {
        const originalSwitchAlbum = InstagramNavigation.switchAlbum.bind(InstagramNavigation);
        
        InstagramNavigation.switchAlbum = async function(newAlbumIndex, direction = 'forward') {
            // ✅ Pré-carregar fotos do novo álbum ANTES da transição
            LazyLoadManager.preloadAlbumPhotos(newAlbumIndex);
            
            // Executar transição normalmente
            return await originalSwitchAlbum(newAlbumIndex, direction);
        };
        
        console.log('✅ Patch Instagram Navigation ativado');
    },
    
    /**
     * 🆕 PRÉ-CARREGAR MÚLTIPLAS FOTOS DE UM ÁLBUM
     * Carrega as primeiras N fotos de um álbum com prioridade
     */
    preloadAlbumPhotos(albumIndex) {
        if (!window.albums || !window.albums[albumIndex]) return;
        
        const album = window.albums[albumIndex];
        const cacheKey = album.id;
        
        // ✅ Verificar se já foi pré-carregado
        if (this.preloadedPhotos.has(cacheKey)) {
            console.log(`⚡ Álbum ${album.title} já está em cache`);
            return;
        }
        
        if (!album.photos || album.photos.length === 0) return;
        
        console.log(`📸 Pré-carregando ${this.instagramConfig.preloadPhotosPerAlbum} fotos do álbum: ${album.title}`);
        
        // Pré-carregar as primeiras N fotos
        const photosToPreload = album.photos.slice(0, this.instagramConfig.preloadPhotosPerAlbum);
        const preloadedCount = 0;
        
        photosToPreload.forEach((photo, index) => {
            this.preloadPhoto(photo.src, album.id, index);
        });
        
        // Marcar álbum como pré-carregado
        this.preloadedPhotos.set(cacheKey, {
            albumId: album.id,
            albumTitle: album.title,
            timestamp: Date.now(),
            count: photosToPreload.length
        });
    },
    
    /**
     * 🆕 PRÉ-CARREGAR FOTOS ADJACENTES (PRÓXIMO/ANTERIOR ÁLBUM)
     * Otimizar para transições suaves entre álbuns
     */
    preloadAdjacentAlbumPhotos(currentAlbumIndex) {
        if (!window.albums || window.albums.length === 0) return;
        
        const total = window.albums.length;
        
        // Calcular índices adjacentes
        const nextIndex = (currentAlbumIndex + 1) % total;
        const prevIndex = (currentAlbumIndex - 1 + total) % total;
        
        // Pré-carregar fotos dos álbuns adjacentes em segundo plano
        setTimeout(() => {
            // ✅ Próximo álbum: carregar primeiras fotos
            this.preloadAlbumPhotos(nextIndex);
            
            // ✅ Álbum anterior: carregar PRIMEIRAS + ÚLTIMAS fotos
            this.preloadAlbumPhotos(prevIndex);
            this.preloadLastPhotosOfAlbum(prevIndex); // 🆕 NOVO: Últimas fotos
            
            console.log(`🔄 Álbuns adjacentes otimizados: próx=${nextIndex}, ant=${prevIndex}`);
        }, 100);
    },
    
    /**
     * 🆕 PRÉ-CARREGAR ÚLTIMAS FOTOS DE UM ÁLBUM
     * Essencial para navegação backward (volta para última foto do anterior)
     */
    preloadLastPhotosOfAlbum(albumIndex) {
        if (!window.albums || !window.albums[albumIndex]) return;
        
        const album = window.albums[albumIndex];
        
        if (!album.photos || album.photos.length === 0) return;
        
        const numPhotosToPreload = 3; // Carregar últimas 3 fotos
        const startIndex = Math.max(0, album.photos.length - numPhotosToPreload);
        const lastPhotos = album.photos.slice(startIndex);
        
        console.log(`📸 Pré-carregando ${lastPhotos.length} ÚLTIMAS fotos do álbum anterior: ${album.title}`);
        
        lastPhotos.forEach((photo, index) => {
            const actualIndex = album.photos.length - numPhotosToPreload + index;
            this.preloadPhoto(photo.src, album.id, actualIndex, true); // 🆕 true = é última foto
        });
    },
    
    /**
     * 🆕 PRÉ-CARREGAR UMA FOTO COM PRIORIDADE
     */
    preloadPhoto(photoSrc, albumId, photoIndex, isLastPhoto = false) {
        const img = new Image();
        
        img.onload = () => {
            this.stats.preloaded++;
            const indicator = isLastPhoto ? '⬅️' : '⚡';
            console.log(`${indicator} Foto ${photoIndex + 1} pré-carregada (álbum: ${albumId}${isLastPhoto ? ' - ÚLTIMA' : ''})`);
        };
        
        img.onerror = () => {
            console.warn(`⚠️ Erro ao pré-carregar foto do álbum ${albumId}`);
        };
        
        img.src = photoSrc;
    },
    
    /**
     * 🆕 LIMPAR CACHE DE FOTOS ANTIGAS
     * Manter apenas os últimos N álbuns em cache para economizar memória
     */
    cleanupOldCache() {
        const maxCachedAlbums = 5;
        
        if (this.preloadedPhotos.size > maxCachedAlbums) {
            const entries = Array.from(this.preloadedPhotos.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            // Remover os mais antigos
            for (let i = 0; i < entries.length - maxCachedAlbums; i++) {
                this.preloadedPhotos.delete(entries[i][0]);
                console.log(`🧹 Cache limpado: ${entries[i][0]}`);
            }
        }
    },
    
    fallbackLoadAll() {
        const images = document.querySelectorAll('img[data-lazy-src]');
        images.forEach(img => {
            const src = img.getAttribute('data-lazy-src');
            if (src) {
                img.src = src;
                img.removeAttribute('data-lazy-src');
            }
        });
    },
    
    forceLoad(img) {
        if (img && img.hasAttribute('data-lazy-src')) {
            this.loadImage(img, true);
        }
    },
    
    getStats() {
        return {
            ...this.stats,
            pending: this.stats.total - this.stats.loaded - this.stats.errors,
            percentage: this.stats.total > 0 ? Math.round((this.stats.loaded / this.stats.total) * 100) : 0,
            cachedAlbums: this.preloadedPhotos.size,
            instagramOptimized: true
        };
    }
};

// ===== HELPER: CRIAR IMAGEM COM LAZY LOADING =====

function createLazyImage(src, alt = '', className = '') {
    const img = document.createElement('img');
    
    img.setAttribute('data-lazy-src', src);
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23222" width="400" height="300"/%3E%3C/svg%3E';
    img.loading = 'lazy';
    img.alt = alt;
    
    if (className) {
        img.className = className;
    }
    
    return img;
}

function convertToLazy(img) {
    const currentSrc = img.src;
    
    if (!currentSrc || currentSrc.startsWith('data:')) return;
    
    img.setAttribute('data-lazy-src', currentSrc);
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23222" width="400" height="300"/%3E%3C/svg%3E';
    img.loading = 'lazy';
    
    if (LazyLoadManager.observer && !LazyLoadManager.observedImages.has(img)) {
        LazyLoadManager.observer.observe(img);
        LazyLoadManager.observedImages.add(img);
    }
}

// ===== ESTILOS CSS =====

const lazyLoadStyles = `
img[data-lazy-src] {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
    min-height: 100px;
}

img.lazy-loading {
    opacity: 0.5;
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.7; }
}

img.lazy-loaded {
    animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

img.lazy-error {
    background: rgba(255, 50, 50, 0.1);
    border: 1px dashed rgba(255, 50, 50, 0.3);
}
`;

if (!document.getElementById('lazy-load-styles')) {
    const styleTag = document.createElement('style');
    styleTag.id = 'lazy-load-styles';
    styleTag.textContent = lazyLoadStyles;
    document.head.appendChild(styleTag);
}

// ===== INICIALIZAÇÃO =====

function initLazyLoading() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            LazyLoadManager.init();
        });
    } else {
        LazyLoadManager.init();
    }
}

initLazyLoading();

// ===== FUNÇÃO GLOBAL DE ESTATÍSTICAS =====

window.getLazyLoadStats = function() {
    const stats = LazyLoadManager.getStats();
    
    console.log('📊 LAZY LOADING - INSTAGRAM OTIMIZADO:');
    console.log(`   ✅ Carregadas: ${stats.loaded}`);
    console.log(`   ❌ Erros: ${stats.errors}`);
    console.log(`   ⏳ Pendentes: ${stats.pending}`);
    console.log(`   📊 Total: ${stats.total}`);
    console.log(`   ⚡ Pré-carregadas: ${stats.preloaded}`);
    console.log(`   📦 Álbuns em cache: ${stats.cachedAlbums}`);
    console.log(`   💯 Progresso: ${stats.percentage}%`);
    console.log(`   🎬 Instagram Otimizado: ${stats.instagramOptimized ? 'SIM' : 'NÃO'}`);
    
    return stats;
};

window.LazyLoadManager = LazyLoadManager;
window.createLazyImage = createLazyImage;
window.convertToLazy = convertToLazy;

console.log('✅ Lazy Loading Instagram OTIMIZADO carregado');
console.log('🧪 Digite getLazyLoadStats() para estatísticas');
console.log('📸 Sistema pré-carrega fotos de álbuns adjacentes automaticamente');