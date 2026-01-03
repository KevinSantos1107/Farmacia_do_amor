// ===== SISTEMA DE LAZY LOADING COMPLETO 100% =====
console.log('🖼️ Sistema de Lazy Loading 100% inicializado');

/**
 * Gerenciador de Lazy Loading
 * Usa Intersection Observer + loading="lazy" para máxima performance
 */
const LazyLoadManager = {
    observer: null,
    observedImages: new Set(),
    stats: {
        total: 0,
        loaded: 0,
        errors: 0
    },
    
    /**
     * Inicializa o sistema de lazy loading
     */
    init() {
        console.log('🔄 Configurando Lazy Loading...');
        
        // Verificar suporte ao Intersection Observer
        if (!('IntersectionObserver' in window)) {
            console.warn('⚠️ IntersectionObserver não suportado - carregando todas as imagens');
            this.fallbackLoadAll();
            return;
        }
        
        // Criar observer
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            {
                root: null,
                rootMargin: '50px', // Começa a carregar 50px antes de aparecer
                threshold: 0.01
            }
        );
        
        // Observar todas as imagens lazy existentes
        this.observeExistingImages();
        
        // Monitorar novas imagens (álbuns, timeline, etc)
        this.setupMutationObserver();
        
        console.log('✅ Lazy Loading configurado');
    },
    
    /**
     * Observa todas as imagens que já existem na página
     */
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
    
    /**
     * Handler quando imagem entra na viewport
     */
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                this.loadImage(img);
            }
        });
    },
    
    /**
     * Carrega uma imagem específica
     */
    loadImage(img) {
        const src = img.getAttribute('data-lazy-src');
        
        if (!src || img.src === src) return;
        
        console.log(`🔥 Carregando: ${src.substring(0, 50)}...`);
        
        // Adicionar classe de loading
        img.classList.add('lazy-loading');
        
        // Incrementar contador
        this.stats.total++;
        
        // Criar nova imagem para preload
        const tempImg = new Image();
        
        tempImg.onload = () => {
            // Aplicar src real
            img.src = src;
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-loaded');
            
            // Remover atributos de lazy
            img.removeAttribute('data-lazy-src');
            
            // Parar de observar
            if (this.observer) {
                this.observer.unobserve(img);
            }
            
            this.observedImages.delete(img);
            
            // Atualizar estatísticas
            this.stats.loaded++;
            console.log(`✅ Imagem carregada (${this.stats.loaded}/${this.stats.total})`);
        };
        
        tempImg.onerror = () => {
            console.error('❌ Erro ao carregar imagem:', src);
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-error');
            
            // Tentar carregar imagem padrão
            img.src = 'images/capas-albuns/default-music.jpg';
            
            // Atualizar estatísticas
            this.stats.errors++;
        };
        
        // Iniciar carregamento
        tempImg.src = src;
    },
    
    /**
     * Monitora DOM para novas imagens (álbuns, timeline, etc)
     */
    setupMutationObserver() {
        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Verificar se é uma imagem
                        if (node.tagName === 'IMG' && node.hasAttribute('data-lazy-src')) {
                            if (!this.observedImages.has(node)) {
                                this.observer.observe(node);
                                this.observedImages.add(node);
                            }
                        }
                        
                        // Verificar imagens dentro do elemento
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
        
        // Observar todo o body
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('👁️ MutationObserver ativo para novas imagens');
    },
    
    /**
     * Fallback para navegadores sem Intersection Observer
     */
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
    
    /**
     * Força carregamento imediato de uma imagem
     */
    forceLoad(img) {
        if (img.hasAttribute('data-lazy-src')) {
            this.loadImage(img);
        }
    },
    
    /**
     * Força carregamento de todas as imagens (útil para modal de álbum)
     */
    forceLoadAll() {
        const images = document.querySelectorAll('img[data-lazy-src]');
        images.forEach(img => this.loadImage(img));
    },
    
    /**
     * Retorna estatísticas de carregamento
     */
    getStats() {
        return {
            ...this.stats,
            pending: this.stats.total - this.stats.loaded - this.stats.errors,
            percentage: this.stats.total > 0 ? Math.round((this.stats.loaded / this.stats.total) * 100) : 0
        };
    }
};

// ===== HELPERS PARA INTEGRAÇÃO =====

/**
 * Cria tag <img> com lazy loading
 * @param {string} src - URL da imagem
 * @param {string} alt - Texto alternativo
 * @param {string} className - Classes CSS
 * @returns {HTMLImageElement}
 */
function createLazyImage(src, alt = '', className = '') {
    const img = document.createElement('img');
    
    // IMPORTANTE: usar data-lazy-src ao invés de src
    img.setAttribute('data-lazy-src', src);
    
    // Placeholder baixa resolução (opcional)
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3C/svg%3E';
    
    // Atributo loading="lazy" nativo (dupla proteção)
    img.loading = 'lazy';
    
    img.alt = alt;
    
    if (className) {
        img.className = className;
    }
    
    // Adicionar ao observer automaticamente quando inserido no DOM
    // (MutationObserver detectará)
    
    return img;
}

/**
 * Converte imagem existente para lazy loading
 * @param {HTMLImageElement} img - Elemento de imagem
 */
function convertToLazy(img) {
    const currentSrc = img.src;
    
    if (!currentSrc || currentSrc.startsWith('data:')) return;
    
    // Mover src para data-lazy-src
    img.setAttribute('data-lazy-src', currentSrc);
    
    // Placeholder
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3C/svg%3E';
    
    img.loading = 'lazy';
    
    // Adicionar ao observer
    if (LazyLoadManager.observer && !LazyLoadManager.observedImages.has(img)) {
        LazyLoadManager.observer.observe(img);
        LazyLoadManager.observedImages.add(img);
    }
}

// ===== ESTILOS CSS (adicionar ao styles.css) =====
const lazyLoadStyles = `
/* Placeholder enquanto carrega */
img[data-lazy-src] {
    background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.1) 0%,
        rgba(255, 255, 255, 0.05) 100%
    );
    min-height: 100px;
}

/* Loading state */
img.lazy-loading {
    opacity: 0.5;
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.7; }
}

/* Loaded state */
img.lazy-loaded {
    animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* Error state */
img.lazy-error {
    background: rgba(255, 50, 50, 0.1);
    border: 1px dashed rgba(255, 50, 50, 0.3);
}
`;

// Injetar estilos
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

// Inicializar automaticamente
initLazyLoading();

// ===== FUNÇÃO GLOBAL DE ESTATÍSTICAS =====
window.getLazyLoadStats = function() {
    const stats = LazyLoadManager.getStats();
    
    console.log('📊 ESTATÍSTICAS DE LAZY LOADING:');
    console.log(`   ✅ Carregadas: ${stats.loaded}`);
    console.log(`   ❌ Erros: ${stats.errors}`);
    console.log(`   ⏳ Pendentes: ${stats.pending}`);
    console.log(`   📈 Total: ${stats.total}`);
    console.log(`   💯 Progresso: ${stats.percentage}%`);
    
    return stats;
};

// Exportar para uso global
window.LazyLoadManager = LazyLoadManager;
window.createLazyImage = createLazyImage;
window.convertToLazy = convertToLazy;

console.log('✅ Sistema de Lazy Loading 100% completo carregado!');
console.log('🧪 Para ver estatísticas, digite: getLazyLoadStats()');
