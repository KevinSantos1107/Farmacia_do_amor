// ===== SISTEMA DE LAZY LOADING OTIMIZADO - SEM TRAVAMENTO =====
console.log('🖼️ Sistema de Lazy Loading inicializado');

/**
 * Gerenciador de Lazy Loading
 * ✅ OTIMIZADO: Carrega apenas imagens visíveis
 */
const LazyLoadManager = {
    observer: null,
    observedImages: new Set(),
    stats: {
        total: 0,
        loaded: 0,
        errors: 0
    },
    
    init() {
        console.log('🔄 Configurando Lazy Loading...');
        
        if (!('IntersectionObserver' in window)) {
            console.warn('⚠️ IntersectionObserver não suportado');
            this.fallbackLoadAll();
            return;
        }
        
        // ✅ CORREÇÃO: rootMargin maior para pré-carregar suavemente
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            {
                root: null,
                rootMargin: '200px', // Carregar quando estiver a 200px
                threshold: 0.01
            }
        );
        
        // Observar imagens existentes
        this.observeExistingImages();
        
        // Monitorar novas imagens
        this.setupMutationObserver();
        
        // ✅ Integração LEVE com carrossel (só quando necessário)
        this.setupCarouselIntegration();
        
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
    
    loadImage(img) {
        const src = img.getAttribute('data-lazy-src');
        
        if (!src || img.src === src) return;
        
        // ✅ CORREÇÃO: Não logar CADA imagem (evita spam no console)
        // console.log(`🔥 Carregando: ${src.substring(0, 50)}...`);
        
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
    
    // ===== ✅ INTEGRAÇÃO LEVE COM CARROSSEL =====
    
    setupCarouselIntegration() {
        // Aguardar carrossel (SEM interval constante)
        let attempts = 0;
        const checkCarousel = setInterval(() => {
            attempts++;
            
            if (typeof AlbumsCarousel3D !== 'undefined') {
                clearInterval(checkCarousel);
                this.patchCarouselRenderCards();
                // ✅ REMOVIDO: setupCarouselObserver() que estava causando carregamento em massa
                console.log('✅ Carrossel integrado (modo leve)');
            }
            
            if (attempts > 10) {
                clearInterval(checkCarousel);
            }
        }, 500);
    },
    
    patchCarouselRenderCards() {
        // ✅ APENAS sobrescrever renderCards - sem forçar carregamento
        AlbumsCarousel3D.prototype.renderCards = function() {
            this.track.innerHTML = '';
            
            window.albums.forEach((album, index) => {
                const card = document.createElement('div');
                card.className = 'carousel-album-card';
                card.dataset.index = index;
                card.dataset.id = album.id;
                
                // ✅ Usar createLazyImage (Observer natural carregará)
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
            this.loadImage(img);
        }
    },
    
    getStats() {
        return {
            ...this.stats,
            pending: this.stats.total - this.stats.loaded - this.stats.errors,
            percentage: this.stats.total > 0 ? Math.round((this.stats.loaded / this.stats.total) * 100) : 0
        };
    }
};

// ===== HELPER: CRIAR IMAGEM COM LAZY LOADING =====

function createLazyImage(src, alt = '', className = '') {
    const img = document.createElement('img');
    
    // ✅ data-lazy-src = Observer carregará naturalmente
    img.setAttribute('data-lazy-src', src);
    
    // Placeholder SVG leve
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
    
    console.log('📊 LAZY LOADING:');
    console.log(`   ✅ Carregadas: ${stats.loaded}`);
    console.log(`   ❌ Erros: ${stats.errors}`);
    console.log(`   ⏳ Pendentes: ${stats.pending}`);
    console.log(`   📈 Total: ${stats.total}`);
    console.log(`   💯 Progresso: ${stats.percentage}%`);
    
    return stats;
};

// ✅ REMOVIDO: Log periódico automático (evita spam no console)

window.LazyLoadManager = LazyLoadManager;
window.createLazyImage = createLazyImage;
window.convertToLazy = convertToLazy;

console.log('✅ Lazy Loading otimizado carregado');
console.log('🧪 Digite getLazyLoadStats() para estatísticas');
