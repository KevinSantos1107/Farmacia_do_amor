// ===== SISTEMA DE LAZY LOADING INTELIGENTE V3.0 - THUMBNAILS + LQIP =====
console.log('🔼 Sistema de Lazy Loading Inteligente V3.0 com Thumbnails inicializado');

/**
 * Gerenciador de Lazy Loading com Sistema de Prioridades e Thumbnails
 */
const LazyLoadManager = {
    observer: null,
    observedImages: new Set(),
    preloadedUrls: new Set(), // Cache de URLs já pré-carregadas
    preloadQueue: [], // Fila de pré-carregamento
    thumbnailsCache: new Map(), // Cache de thumbnails já carregadas
    isPreloading: false,
    useWebP: false,
    connectionType: '4g', // Assume boa conexão por padrão
    
    stats: {
        total: 0,
        loaded: 0,
        errors: 0,
        preloadedHigh: 0,
        preloadedMedium: 0,
        preloadedLow: 0,
        thumbnailsLoaded: 0,
        fullImagesLoaded: 0
    },
    
    init() {
        console.log('⚙️ Configurando Lazy Loading Inteligente V3.0...');
        
        // Detectar suporte a WebP
        this.detectWebPSupport();
        
        // Detectar velocidade de conexão
        this.detectConnectionType();
        
        if (!('IntersectionObserver' in window)) {
            console.warn('⚠️ IntersectionObserver não suportado');
            this.fallbackLoadAll();
            return;
        }
        
        // Configurar observer baseado na conexão
        const rootMargin = this.getRootMarginForConnection();
        
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            {
                root: null,
                rootMargin: rootMargin,
                threshold: 0.01
            }
        );
        
        // Observar imagens existentes
        this.observeExistingImages();
        
        // Monitorar novas imagens
        this.setupMutationObserver();
        
        console.log('✅ Lazy Loading V3.0 configurado');
        console.log(`   🌐 Conexão: ${this.connectionType}`);
        console.log(`   🖼️ WebP: ${this.useWebP ? 'Suportado' : 'Não suportado'}`);
        console.log(`   📏 Root Margin: ${rootMargin}`);
    },
    
    detectWebPSupport() {
        const canvas = document.createElement('canvas');
        if (canvas.toDataURL) {
            this.useWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        }
        return this.useWebP;
    },
    
    detectConnectionType() {
        if ('connection' in navigator && navigator.connection.effectiveType) {
            this.connectionType = navigator.connection.effectiveType;
            
            // Monitorar mudanças na conexão
            navigator.connection.addEventListener('change', () => {
                this.connectionType = navigator.connection.effectiveType;
                console.log(`📶 Conexão alterada para: ${this.connectionType}`);
            });
        }
    },
    
    getRootMarginForConnection() {
        switch(this.connectionType) {
            case 'slow-2g':
            case '2g':
                return '50px'; // Carrega apenas quando está muito próximo
            case '3g':
                return '100px'; // Carrega quando está próximo
            case '4g':
            default:
                return '200px'; // Carrega com antecedência
        }
    },
    
    // ===== 🔥 SISTEMA DE THUMBNAILS =====
    
    /**
     * Gera URL otimizada para thumbnail
     * @param {string} originalUrl - URL original da imagem
     * @param {object} options - Opções de otimização
     * @returns {string} URL otimizada
     */
    getOptimizedUrl(originalUrl, options = {}) {
        const {
            width = 800,
            quality = 80,
            format = 'auto'
        } = options;
        
        // Se for Firebase Storage, usar parâmetros de URL
        if (originalUrl.includes('firebasestorage.googleapis.com')) {
            let optimizedUrl = originalUrl;
            const params = [];
            
            // Adicionar parâmetros se não existirem
            if (width && !optimizedUrl.includes('width=')) {
                params.push(`width=${width}`);
            }
            
            if (quality && !optimizedUrl.includes('quality=')) {
                params.push(`quality=${quality}`);
            }
            
            if (format === 'webp' && this.useWebP && !optimizedUrl.includes('format=')) {
                params.push('format=webp');
            }
            
            if (params.length > 0) {
                optimizedUrl += (optimizedUrl.includes('?') ? '&' : '?') + params.join('&');
            }
            
            return optimizedUrl;
        }
        
        // Para outros serviços ou local, retornar URL original
        // Em produção, você implementaria um proxy de imagens aqui
        return originalUrl;
    },
    
    getThumbnailUrl(originalUrl) {
        return this.getOptimizedUrl(originalUrl, {
            width: 300,
            quality: 40, // Qualidade muito baixa para thumbnail
            format: this.useWebP ? 'webp' : 'auto'
        });
    },
    
    getFullImageUrl(originalUrl) {
        // Para conexões lentas, carregar imagem menor
        let width = 1200;
        let quality = 85;
        
        if (this.connectionType === 'slow-2g' || this.connectionType === '2g') {
            width = 600;
            quality = 70;
        } else if (this.connectionType === '3g') {
            width = 800;
            quality = 75;
        }
        
        return this.getOptimizedUrl(originalUrl, {
            width: width,
            quality: quality,
            format: this.useWebP ? 'webp' : 'auto'
        });
    },
    
    // ===== CARREGAMENTO DE IMAGENS =====
    
    observeExistingImages() {
        const images = document.querySelectorAll('img[data-lazy-src]');
        
        images.forEach(img => {
            if (!this.observedImages.has(img)) {
                // Pré-carregar thumbnail se for uma capa de álbum
                if (img.classList.contains('carousel-album-cover') || 
                    img.classList.contains('album-cover')) {
                    this.preloadThumbnail(img);
                }
                
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
                this.loadImageWithThumbnail(img);
            }
        });
    },
    
    async loadImageWithThumbnail(img) {
        const originalSrc = img.getAttribute('data-lazy-src');
        
        if (!originalSrc || img.src === originalSrc) return;
        
        // Marcar como carregando
        img.classList.add('lazy-loading');
        this.stats.total++;
        
        try {
            // 1. Carregar thumbnail primeiro (rápido)
            const thumbnailSrc = this.getThumbnailUrl(originalSrc);
            
            // Verificar se já temos a thumbnail no cache
            if (this.thumbnailsCache.has(thumbnailSrc)) {
                img.src = this.thumbnailsCache.get(thumbnailSrc);
            } else {
                await this.loadThumbnail(img, thumbnailSrc);
            }
            
            // 2. Carregar imagem completa em segundo plano
            this.loadFullImage(img, originalSrc);
            
        } catch (error) {
            console.error('❌ Erro ao carregar imagem:', error);
            this.handleImageError(img, originalSrc);
        }
    },
    
    async loadThumbnail(img, thumbnailSrc) {
        return new Promise((resolve, reject) => {
            const tempImg = new Image();
            
            tempImg.onload = () => {
                // Mostrar thumbnail imediatamente
                img.src = thumbnailSrc;
                img.classList.remove('lazy-loading');
                img.classList.add('lazy-thumb-loaded');
                
                // Armazenar no cache
                this.thumbnailsCache.set(thumbnailSrc, thumbnailSrc);
                this.stats.thumbnailsLoaded++;
                
                console.log(`✨ Thumbnail carregada: ${this.getFilename(thumbnailSrc)}`);
                resolve();
            };
            
            tempImg.onerror = () => {
                reject(new Error(`Thumbnail failed: ${thumbnailSrc}`));
            };
            
            tempImg.src = thumbnailSrc;
        });
    },
    
    loadFullImage(img, originalSrc) {
        const fullImageSrc = this.getFullImageUrl(originalSrc);
        
        const tempImg = new Image();
        
        tempImg.onload = () => {
            // Transição suave da thumbnail para imagem completa
            img.src = fullImageSrc;
            img.classList.remove('lazy-thumb-loaded');
            img.classList.add('lazy-full-loaded');
            img.removeAttribute('data-lazy-src');
            
            // Limpar observer
            if (this.observer) {
                this.observer.unobserve(img);
            }
            
            this.observedImages.delete(img);
            this.stats.loaded++;
            this.stats.fullImagesLoaded++;
            
            console.log(`✅ Imagem completa carregada: ${this.getFilename(fullImageSrc)}`);
            
            // Limpar cache de thumbnail depois de um tempo
            setTimeout(() => {
                const thumbnailSrc = this.getThumbnailUrl(originalSrc);
                this.thumbnailsCache.delete(thumbnailSrc);
            }, 5000);
        };
        
        tempImg.onerror = () => {
            console.warn(`⚠️ Imagem completa falhou, mantendo thumbnail: ${this.getFilename(fullImageSrc)}`);
            
            // Marcar como carregada mesmo com erro
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-error');
            this.stats.errors++;
        };
        
        tempImg.src = fullImageSrc;
    },
    
    preloadThumbnail(img) {
        const originalSrc = img.getAttribute('data-lazy-src');
        if (!originalSrc) return;
        
        const thumbnailSrc = this.getThumbnailUrl(originalSrc);
        
        if (this.thumbnailsCache.has(thumbnailSrc)) return;
        
        // Pré-carregar thumbnail em background
        const tempImg = new Image();
        tempImg.src = thumbnailSrc;
        
        tempImg.onload = () => {
            this.thumbnailsCache.set(thumbnailSrc, thumbnailSrc);
            console.log(`📥 Thumbnail pré-carregada: ${this.getFilename(thumbnailSrc)}`);
        };
    },
    
    handleImageError(img, originalSrc) {
        img.classList.remove('lazy-loading');
        img.classList.add('lazy-error');
        
        // Fallback: tentar carregar a imagem original diretamente
        const fallbackImg = new Image();
        fallbackImg.src = originalSrc;
        
        fallbackImg.onload = () => {
            img.src = originalSrc;
            img.classList.remove('lazy-error');
            img.classList.add('lazy-loaded');
        };
        
        fallbackImg.onerror = () => {
            // Último fallback: placeholder SVG
            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-size="16"%3EImagem indisponível%3C/text%3E%3C/svg%3E';
        };
        
        this.stats.errors++;
    },
    
    getFilename(url) {
        return url.substring(url.lastIndexOf('/') + 1).split('?')[0].substring(0, 30) + '...';
    },
    
    // ===== 🔥 SISTEMA DE PRIORIDADES (ATUALIZADO) =====
    
    /**
     * Pré-carrega uma imagem com prioridade
     */
    preload(url, priority = 'medium') {
        if (!url || this.preloadedUrls.has(url)) {
            return Promise.resolve();
        }
        
        // Para conexões lentas, ignorar pré-carregamento de baixa prioridade
        if ((this.connectionType === 'slow-2g' || this.connectionType === '2g') && 
            (priority === 'low' || priority === 'medium')) {
            return Promise.resolve();
        }
        
        this.preloadQueue.push({ url, priority });
        this.sortPreloadQueue();
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
                
                console.log(`✅ [${priority.toUpperCase()}] Pré-carregada: ${this.getFilename(url)}`);
                resolve();
            };
            
            img.onerror = () => {
                console.warn(`⚠️ Erro ao pré-carregar [${priority}]:`, this.getFilename(url));
                reject();
            };
            
            // Usar URL otimizada para pré-carregamento
            const optimizedUrl = priority === 'critical' || priority === 'high' 
                ? this.getFullImageUrl(url)
                : this.getThumbnailUrl(url);
            
            img.src = optimizedUrl;
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
        
        // Limitar paralelismo baseado na conexão
        let maxParallel = 3;
        if (this.connectionType === '3g') maxParallel = 2;
        if (this.connectionType === 'slow-2g' || this.connectionType === '2g') maxParallel = 1;
        
        const batch = this.preloadQueue.splice(0, maxParallel);
        
        await Promise.all(
            batch.map(item => this.preload(item.url, item.priority))
        );
        
        this.isPreloading = false;
        
        if (this.preloadQueue.length > 0) {
            setTimeout(() => this.processPreloadQueue(), 100);
        }
    },
    
    // ===== 🎯 PRÉ-CARREGAMENTO ESTRATÉGICO (ATUALIZADO) =====
    
    /**
     * Pré-carrega capas dos álbuns visíveis no carrossel
     */
    preloadCarouselCovers(centerIndex) {
        if (!window.albums || window.albums.length === 0) return;
        
        const total = window.albums.length;
        const leftIndex = (centerIndex - 1 + total) % total;
        const rightIndex = (centerIndex + 1) % total;
        
        // PRIORIDADE CRITICAL: Thumbnail do álbum central (já deve estar carregando)
        const centerAlbum = window.albums[centerIndex];
        if (centerAlbum && centerAlbum.cover) {
            this.preload(centerAlbum.cover, 'critical');
        }
        
        // PRIORIDADE HIGH: Thumbnails dos álbuns adjacentes
        const leftAlbum = window.albums[leftIndex];
        const rightAlbum = window.albums[rightIndex];
        
        if (leftAlbum && leftAlbum.cover) {
            this.preload(leftAlbum.cover, 'high');
        }
        
        if (rightAlbum && rightAlbum.cover) {
            this.preload(rightAlbum.cover, 'high');
        }
        
        // PRIORIDADE MEDIUM: Thumbnails da primeira foto dos álbuns visíveis
        [centerAlbum, leftAlbum, rightAlbum].forEach(album => {
            if (album && album.photos && album.photos.length > 0) {
                const thumbnailUrl = this.getThumbnailUrl(album.photos[0].src);
                this.preload(thumbnailUrl, 'medium');
            }
        });
        
        console.log(`🎨 Carrossel: pré-carregados thumbnails [${leftIndex}, ${centerIndex}, ${rightIndex}]`);
    },
    
    /**
     * Pré-carrega fotos adjacentes no modal
     */
    preloadAdjacentPhotos(albumId, currentPhotoIndex) {
        const album = window.albums.find(a => a.id === albumId);
        if (!album || !album.photos) return;
        
        const total = album.photos.length;
        
        // PRIORIDADE HIGH: Thumbnails das próximas 2 fotos
        const next1 = (currentPhotoIndex + 1) % total;
        const next2 = (currentPhotoIndex + 2) % total;
        
        if (album.photos[next1]) {
            const thumbUrl = this.getThumbnailUrl(album.photos[next1].src);
            this.preload(thumbUrl, 'high');
        }
        
        if (album.photos[next2]) {
            const thumbUrl = this.getThumbnailUrl(album.photos[next2].src);
            this.preload(thumbUrl, 'high');
        }
        
        // PRIORIDADE MEDIUM: Thumbnail da foto anterior
        const prev1 = (currentPhotoIndex - 1 + total) % total;
        
        if (album.photos[prev1]) {
            const thumbUrl = this.getThumbnailUrl(album.photos[prev1].src);
            this.preload(thumbUrl, 'medium');
        }
        
        console.log(`📸 Modal: pré-carregadas thumbnails adjacentes`);
    },
    
    /**
     * Pré-carrega primeira/última foto dos álbuns adjacentes
     */
    preloadAdjacentAlbumsFirstLast(currentAlbumIndex) {
        if (!window.albums || window.albums.length === 0) return;
        
        const total = window.albums.length;
        
        const nextAlbumIndex = (currentAlbumIndex + 1) % total;
        const prevAlbumIndex = (currentAlbumIndex - 1 + total) % total;
        
        const nextAlbum = window.albums[nextAlbumIndex];
        const prevAlbum = window.albums[prevAlbumIndex];
        
        // PRIORIDADE HIGH: Thumbnail da primeira foto do próximo álbum
        if (nextAlbum && nextAlbum.photos && nextAlbum.photos.length > 0) {
            const thumbUrl = this.getThumbnailUrl(nextAlbum.photos[0].src);
            this.preload(thumbUrl, 'high');
        }
        
        // PRIORIDADE MEDIUM: Thumbnail da última foto do álbum anterior
        if (prevAlbum && prevAlbum.photos && prevAlbum.photos.length > 0) {
            const lastIndex = prevAlbum.photos.length - 1;
            const thumbUrl = this.getThumbnailUrl(prevAlbum.photos[lastIndex].src);
            this.preload(thumbUrl, 'medium');
        }
    },
    
    // ===== UTILIDADES =====
    
    setupMutationObserver() {
        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'IMG' && node.hasAttribute('data-lazy-src')) {
                            if (!this.observedImages.has(node)) {
                                // Pré-carregar thumbnail para capas
                                if (node.classList.contains('carousel-album-cover')) {
                                    this.preloadThumbnail(node);
                                }
                                
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
    
    fallbackLoadAll() {
        const images = document.querySelectorAll('img[data-lazy-src]');
        images.forEach(img => {
            const src = img.getAttribute('data-lazy-src');
            if (src) {
                // Usar URL otimizada no fallback também
                const optimizedSrc = this.getFullImageUrl(src);
                img.src = optimizedSrc;
                img.removeAttribute('data-lazy-src');
            }
        });
    },
    
    forceLoad(img) {
        if (img && img.hasAttribute('data-lazy-src')) {
            this.loadImageWithThumbnail(img);
        }
    },
    
    getStats() {
        return {
            ...this.stats,
            preloadedTotal: this.stats.preloadedHigh + this.stats.preloadedMedium + this.stats.preloadedLow,
            pending: this.stats.total - this.stats.loaded - this.stats.errors,
            percentage: this.stats.total > 0 ? Math.round((this.stats.loaded / this.stats.total) * 100) : 0,
            queueSize: this.preloadQueue.length,
            cachedUrls: this.preloadedUrls.size,
            thumbnailsCached: this.thumbnailsCache.size,
            connectionType: this.connectionType,
            webpSupported: this.useWebP
        };
    },
    
    clearCache() {
        this.preloadedUrls.clear();
        this.thumbnailsCache.clear();
        this.preloadQueue = [];
        console.log('🗑️ Cache limpo');
    }
};

// ===== HELPER: CRIAR IMAGEM COM LAZY LOADING OTIMIZADO =====

function createLazyImage(src, alt = '', className = '', isImportant = false) {
    const img = document.createElement('img');
    
    img.setAttribute('data-lazy-src', src);
    
    // Iniciar com placeholder SVG pequeno
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"%3E%3Crect fill="%23222" width="10" height="10"/%3E%3C/svg%3E';
    img.loading = 'lazy';
    img.alt = alt;
    
    // Adicionar classe de placeholder para shimmer effect
    img.classList.add('img-placeholder');
    
    if (className) {
        img.className += ' ' + className;
    }
    
    // Se for importante, pré-carregar thumbnail imediatamente
    if (isImportant && LazyLoadManager && src) {
        const thumbSrc = LazyLoadManager.getThumbnailUrl(src);
        const tempImg = new Image();
        tempImg.src = thumbSrc;
        tempImg.onload = () => {
            img.src = thumbSrc;
            img.classList.remove('img-placeholder');
            img.classList.add('lazy-thumb-loaded');
        };
    }
    
    return img;
}

function convertToLazy(img) {
    const currentSrc = img.src;
    
    if (!currentSrc || currentSrc.startsWith('data:')) return;
    
    img.setAttribute('data-lazy-src', currentSrc);
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"%3E%3Crect fill="%23222" width="10" height="10"/%3E%3C/svg%3E';
    img.classList.add('img-placeholder');
    img.loading = 'lazy';
    
    if (LazyLoadManager.observer && !LazyLoadManager.observedImages.has(img)) {
        // Pré-carregar thumbnail se for uma capa
        if (img.classList.contains('carousel-album-cover') || 
            img.classList.contains('album-cover')) {
            LazyLoadManager.preloadThumbnail(img);
        }
        
        LazyLoadManager.observer.observe(img);
        LazyLoadManager.observedImages.add(img);
    }
}

// ===== ESTILOS CSS OTIMIZADOS =====

const lazyLoadStyles = `
/* Placeholder animado */
.img-placeholder {
    background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.03) 0%,
        rgba(255, 255, 255, 0.08) 50%,
        rgba(255, 255, 255, 0.03) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    min-height: 100px;
    border-radius: 4px;
}

@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

/* Estados de carregamento */
img[data-lazy-src] {
    transition: all 0.3s ease-in-out;
    opacity: 0.9;
}

img.lazy-loading {
    opacity: 0.7;
    filter: blur(5px);
    transform: scale(0.98);
}

img.lazy-thumb-loaded {
    opacity: 0.9;
    filter: blur(2px);
    transform: scale(1);
    animation: sharpenThumb 0.3s ease-out;
}

img.lazy-full-loaded {
    opacity: 1;
    filter: blur(0);
    transform: scale(1);
    animation: sharpenFull 0.5s ease-out;
}

@keyframes sharpenThumb {
    from { 
        opacity: 0.7;
        filter: blur(5px);
    }
    to { 
        opacity: 0.9;
        filter: blur(2px);
    }
}

@keyframes sharpenFull {
    from { 
        opacity: 0.9;
        filter: blur(2px);
    }
    to { 
        opacity: 1;
        filter: blur(0);
    }
}

img.lazy-error {
    background: rgba(255, 50, 50, 0.05);
    border: 1px dashed rgba(255, 50, 50, 0.2);
    opacity: 0.7;
}

/* Para o carrossel específico */
.carousel-album-cover {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.carousel-album-cover.lazy-thumb-loaded {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.carousel-album-cover.lazy-full-loaded {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Para fotos no modal */
#modalPhoto {
    transition: filter 0.3s ease, opacity 0.3s ease;
}

#modalPhoto.lazy-thumb-loaded {
    cursor: wait;
}

#modalPhoto.lazy-full-loaded {
    cursor: default;
}
`;

// Adicionar estilos
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
            setTimeout(() => LazyLoadManager.init(), 100);
        });
    } else {
        setTimeout(() => LazyLoadManager.init(), 100);
    }
}

// Inicializar com delay para não competir com outros scripts
setTimeout(initLazyLoading, 500);

// ===== FUNÇÃO GLOBAL DE ESTATÍSTICAS =====

window.getLazyLoadStats = function() {
    const stats = LazyLoadManager.getStats();
    
    console.log('📊 LAZY LOADING INTELIGENTE V3.0:');
    console.log(`   🌐 Conexão: ${stats.connectionType}`);
    console.log(`   🖼️ WebP: ${stats.webpSupported ? '✅ Suportado' : '❌ Não suportado'}`);
    console.log('   ---');
    console.log(`   📈 Thumbnails carregadas: ${stats.thumbnailsLoaded}`);
    console.log(`   📈 Imagens completas: ${stats.fullImagesLoaded}`);
    console.log(`   ❌ Erros: ${stats.errors}`);
    console.log(`   ⏳ Pendentes: ${stats.pending}`);
    console.log(`   📊 Total processado: ${stats.total}`);
    console.log('   ---');
    console.log(`   🔥 Pré-carregadas (HIGH): ${stats.preloadedHigh}`);
    console.log(`   ⚡ Pré-carregadas (MEDIUM): ${stats.preloadedMedium}`);
    console.log(`   🌊 Pré-carregadas (LOW): ${stats.preloadedLow}`);
    console.log(`   📦 Thumbnails em cache: ${stats.thumbnailsCached}`);
    console.log(`   📋 Fila de espera: ${stats.queueSize}`);
    console.log(`   💯 Progresso: ${stats.percentage}%`);
    
    return stats;
};

// Função para forçar carregamento de uma imagem específica
window.forceLoadImage = function(imgElement) {
    if (imgElement && imgElement.hasAttribute('data-lazy-src')) {
        LazyLoadManager.forceLoad(imgElement);
    }
};

// Função para limpar cache
window.clearImageCache = function() {
    LazyLoadManager.clearCache();
};

// Exportar para uso global
window.LazyLoadManager = LazyLoadManager;
window.createLazyImage = createLazyImage;
window.convertToLazy = convertToLazy;

console.log('✅ Lazy Loading Inteligente V3.0 carregado');
console.log('🧪 Comandos disponíveis:');
console.log('   • getLazyLoadStats() - Ver estatísticas');
console.log('   • forceLoadImage(element) - Forçar carregamento');
console.log('   • clearImageCache() - Limpar cache');
