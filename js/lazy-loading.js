// ===== SISTEMA DE LAZY LOADING INTELIGENTE V2.0 - PRIORIDADES E PRÉ-CARREGAMENTO =====
console.log('🔼 Sistema de Lazy Loading Inteligente V2.0 inicializado');

/**
 * Gerenciador de Lazy Loading com Sistema de Prioridades
 */
const LazyLoadManager = {
    observer: null,
    observedImages: new Set(),
    preloadedUrls: new Set(), // Cache de URLs já pré-carregadas
    preloadQueue: [], // Fila de pré-carregamento
    isPreloading: false,
    stats: {
        total: 0,
        loaded: 0,
        errors: 0,
        preloadedHigh: 0,
        preloadedMedium: 0,
        preloadedLow: 0
    },
    
    init() {
        console.log('⚙️ Configurando Lazy Loading Inteligente...');
        
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
        
        console.log('✅ Lazy Loading configurado');
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
    
    loadImage(img, priority = 'normal') {
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
            
            if (priority !== 'normal') {
                console.log(`⚡ [${priority.toUpperCase()}] Carregada: ${src.substring(src.lastIndexOf('/') + 1)}`);
            }
        };
        
        tempImg.onerror = () => {
            console.error('❌ Erro ao carregar:', src.substring(0, 50));
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-error');
            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-size="20"%3EImagem indisponível%3C/text%3E%3C/svg%3E';
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
    
    // ===== 🔥 SISTEMA DE PRIORIDADES =====
    
    /**
     * Pré-carrega uma imagem com prioridade
     * @param {string} url - URL da imagem
     * @param {string} priority - 'critical' | 'high' | 'medium' | 'low'
     */
    preload(url, priority = 'medium') {
        if (!url || this.preloadedUrls.has(url)) {
            return Promise.resolve(); // Já carregada
        }
        
        // Adicionar à fila com prioridade
        this.preloadQueue.push({ url, priority });
        
        // Ordenar fila por prioridade
        this.sortPreloadQueue();
        
        // Processar fila
        this.processPreloadQueue();
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.preloadedUrls.add(url);
                
                if (priority === 'critical' || priority === 'high') {
                    this.stats.preloadedHigh++;
                } else if (priority === 'medium') {
                    this.stats.preloadedMedium++;
                } else {
                    this.stats.preloadedLow++;
                }
                
                console.log(`✅ [${priority.toUpperCase()}] Pré-carregada: ${url.substring(url.lastIndexOf('/') + 1)}`);
                resolve();
            };
            
            img.onerror = () => {
                console.warn(`⚠️ Erro ao pré-carregar [${priority}]:`, url.substring(url.lastIndexOf('/') + 1));
                reject();
            };
            
            img.src = url;
        });
    },
    
    sortPreloadQueue() {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        
        this.preloadQueue.sort((a, b) => {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    },
    
    async processPreloadQueue() {
        if (this.isPreloading || this.preloadQueue.length === 0) return;
        
        this.isPreloading = true;
        
        // Processar até 3 por vez (paralelo)
        const batch = this.preloadQueue.splice(0, 3);
        
        await Promise.all(
            batch.map(item => this.preload(item.url, item.priority))
        );
        
        this.isPreloading = false;
        
        // Continuar processando se houver mais na fila
        if (this.preloadQueue.length > 0) {
            setTimeout(() => this.processPreloadQueue(), 100);
        }
    },
    
    // ===== 🎯 PRÉ-CARREGAMENTO ESTRATÉGICO PARA CARROSSEL =====
    
    /**
     * Pré-carrega capas dos álbuns visíveis no carrossel
     */
    preloadCarouselCovers(centerIndex) {
        if (!window.albums || window.albums.length === 0) return;
        
        const total = window.albums.length;
        const leftIndex = (centerIndex - 1 + total) % total;
        const rightIndex = (centerIndex + 1) % total;
        
        // PRIORIDADE CRITICAL: Capa do álbum central
        const centerAlbum = window.albums[centerIndex];
        if (centerAlbum && centerAlbum.cover) {
            this.preload(centerAlbum.cover, 'critical');
        }
        
        // PRIORIDADE HIGH: Capas dos álbuns adjacentes
        const leftAlbum = window.albums[leftIndex];
        const rightAlbum = window.albums[rightIndex];
        
        if (leftAlbum && leftAlbum.cover) {
            this.preload(leftAlbum.cover, 'high');
        }
        
        if (rightAlbum && rightAlbum.cover) {
            this.preload(rightAlbum.cover, 'high');
        }
        
        // PRIORIDADE MEDIUM: Primeira foto dos álbuns visíveis
        [centerAlbum, leftAlbum, rightAlbum].forEach(album => {
            if (album && album.photos && album.photos.length > 0) {
                this.preload(album.photos[0].src, 'medium');
            }
        });
        
        console.log(`🎨 Carrossel: pré-carregados álbuns [${leftIndex}, ${centerIndex}, ${rightIndex}]`);
    },
    
    /**
     * Pré-carrega fotos adjacentes no modal
     */
    preloadAdjacentPhotos(albumId, currentPhotoIndex) {
        const album = window.albums.find(a => a.id === albumId);
        if (!album || !album.photos) return;
        
        const total = album.photos.length;
        
        // PRIORIDADE HIGH: Próximas 2 fotos
        const next1 = (currentPhotoIndex + 1) % total;
        const next2 = (currentPhotoIndex + 2) % total;
        
        if (album.photos[next1]) {
            this.preload(album.photos[next1].src, 'high');
        }
        
        if (album.photos[next2]) {
            this.preload(album.photos[next2].src, 'high');
        }
        
        // PRIORIDADE MEDIUM: Foto anterior
        const prev1 = (currentPhotoIndex - 1 + total) % total;
        
        if (album.photos[prev1]) {
            this.preload(album.photos[prev1].src, 'medium');
        }
        
        console.log(`📸 Modal: pré-carregadas fotos adjacentes do álbum ${albumId}`);
    },
    
    /**
     * Pré-carrega primeira/última foto dos álbuns adjacentes (para navegação Instagram)
     */
    preloadAdjacentAlbumsFirstLast(currentAlbumIndex) {
        if (!window.albums || window.albums.length === 0) return;
        
        const total = window.albums.length;
        
        const nextAlbumIndex = (currentAlbumIndex + 1) % total;
        const prevAlbumIndex = (currentAlbumIndex - 1 + total) % total;
        
        const nextAlbum = window.albums[nextAlbumIndex];
        const prevAlbum = window.albums[prevAlbumIndex];
        
        // PRIORIDADE HIGH: Primeira foto do próximo álbum
        if (nextAlbum && nextAlbum.photos && nextAlbum.photos.length > 0) {
            this.preload(nextAlbum.photos[0].src, 'high');
            console.log(`➡️ Pré-carregada primeira foto do próximo álbum (${nextAlbum.title})`);
        }
        
        // PRIORIDADE MEDIUM: Última foto do álbum anterior
        if (prevAlbum && prevAlbum.photos && prevAlbum.photos.length > 0) {
            const lastIndex = prevAlbum.photos.length - 1;
            this.preload(prevAlbum.photos[lastIndex].src, 'medium');
            console.log(`⬅️ Pré-carregada última foto do álbum anterior (${prevAlbum.title})`);
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
            this.loadImage(img, 'critical');
        }
    },
    
    getStats() {
        return {
            ...this.stats,
            preloadedTotal: this.stats.preloadedHigh + this.stats.preloadedMedium + this.stats.preloadedLow,
            pending: this.stats.total - this.stats.loaded - this.stats.errors,
            percentage: this.stats.total > 0 ? Math.round((this.stats.loaded / this.stats.total) * 100) : 0,
            queueSize: this.preloadQueue.length,
            cachedUrls: this.preloadedUrls.size
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
    
    console.log('📊 LAZY LOADING INTELIGENTE V2.0:');
    console.log(`   ✅ Carregadas: ${stats.loaded}`);
    console.log(`   ❌ Erros: ${stats.errors}`);
    console.log(`   ⏳ Pendentes: ${stats.pending}`);
    console.log(`   📊 Total: ${stats.total}`);
    console.log(`   🔥 Pré-carregadas (HIGH): ${stats.preloadedHigh}`);
    console.log(`   ⚡ Pré-carregadas (MEDIUM): ${stats.preloadedMedium}`);
    console.log(`   🌊 Pré-carregadas (LOW): ${stats.preloadedLow}`);
    console.log(`   📦 Total em cache: ${stats.cachedUrls}`);
    console.log(`   📋 Fila de espera: ${stats.queueSize}`);
    console.log(`   💯 Progresso: ${stats.percentage}%`);
    
    return stats;
};

window.LazyLoadManager = LazyLoadManager;
window.createLazyImage = createLazyImage;
window.convertToLazy = convertToLazy;

console.log('✅ Lazy Loading Inteligente V2.0 carregado');
console.log('🧪 Digite getLazyLoadStats() para estatísticas');