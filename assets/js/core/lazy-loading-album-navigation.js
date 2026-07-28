// ===== LAZY LOADING INTELIGENTE PARA NAVEGAÇÃO ENTRE ÁLBUNS =====
// Versão otimizada que pré-carrega álbuns adjacentes automaticamente
console.log('🚀 Lazy Loading Inteligente v2.0 carregado');

/**
 * Sistema de Pré-carregamento Estratégico para Navegação Entre Álbuns
 * 
 * ESTRATÉGIA:
 * 1. Quando um álbum é aberto, pré-carrega:
 *    - Primeira foto do álbum atual
 *    - Primeira foto do próximo álbum
 *    - Última foto do álbum anterior
 * 
 * 2. Durante navegação de fotos:
 *    - Pré-carrega próximas 2 fotos do álbum atual
 *    - Quando chega perto do fim, pré-carrega primeiro do próximo
 *    - Quando chega perto do início, pré-carrega último do anterior
 */

const IntelligentAlbumLoader = {
    // Cache de imagens pré-carregadas
    cache: new Map(),
    
    // Fila de pré-carregamento
    preloadQueue: [],
    
    // Estado de pré-carregamento
    isPreloading: false,
    
    // Estatísticas
    stats: {
        preloaded: 0,
        cached: 0,
        hits: 0,
        misses: 0
    },
    
    // Configurações
    config: {
        preloadDistance: 2,        // Quantas fotos à frente/atrás pré-carregar
        albumTransitionThreshold: 3, // (Obsoleto) Distância do fim para pré-carregar próximo álbum
        maxCacheSize: 30,          // MÁXIMO AMPLIADO para comportar as transições de swipe
        priorityPreload: true      // Pré-carregamento prioritário para navegação
    },
    
    /**
     * Inicializar sistema
     */
    init() {
        console.log('⚙️ Inicializando Lazy Loading Inteligente...');
        
        // Integrar com openAlbum
        this.patchOpenAlbum();
        
        // Integrar com navegação de fotos
        this.patchPhotoNavigation();
        
        // Integrar com navegação por swipe (goToNext/Previous)
        this.patchAlbumTransitions();
        
        // Integrar com carrossel
        this.patchCarouselNavigation();
        
        console.log('✅ Lazy Loading Inteligente inicializado');
    },
    
    /**
     * PATCH: openAlbum com pré-carregamento inteligente
     */
    patchOpenAlbum() {
        // Salvar função original
        const originalOpenAlbum = window.openAlbum;
        
        if (!originalOpenAlbum) {
            console.warn('⚠️ Função openAlbum não encontrada');
            return;
        }
        
        // Substituir com versão otimizada
        window.openAlbum = (albumId) => {
            // Executar função original
            originalOpenAlbum(albumId);
            
            // Pré-carregar estrategicamente
            setTimeout(() => {
                this.preloadOnAlbumOpen(albumId);
            }, 100);
        };
        
        console.log('✅ openAlbum() patcheado com pré-carregamento');
    },
    
    /**
     * PATCH: Navegação de fotos com pré-carregamento
     */
    patchPhotoNavigation() {
        // Salvar função original de navegação
        const originalNavigatePhoto = window.navigatePhoto;
        
        if (!originalNavigatePhoto) {
            console.warn('⚠️ Função navigatePhoto não encontrada - criando...');
            return;
        }
        
        // Substituir com versão otimizada
        window.navigatePhoto = (direction) => {
            // Executar função original
            originalNavigatePhoto(direction);
            
            // Pré-carregar próximas fotos após navegação
            setTimeout(() => {
                this.preloadAdjacentPhotos();
            }, 50);
        };
        
        console.log('✅ navigatePhoto() patcheado com pré-carregamento');
    },
    
    /**
     * PATCH: Transições de Álbum (Swipe Navigation)
     */
    patchAlbumTransitions() {
        const originalGoToNext = window.goToNextAlbum;
        const originalGoToPrev = window.goToPreviousAlbum;
        
        if (originalGoToNext) {
            window.goToNextAlbum = () => {
                originalGoToNext();
                setTimeout(() => {
                    if (window.currentAlbum) {
                        this.preloadOnAlbumOpen(window.currentAlbum.id);
                    }
                }, 100);
            };
        }
        
        if (originalGoToPrev) {
            window.goToPreviousAlbum = () => {
                originalGoToPrev();
                setTimeout(() => {
                    if (window.currentAlbum) {
                        this.preloadOnAlbumOpen(window.currentAlbum.id);
                    }
                }, 100);
            };
        }
        
        console.log('✅ Transições de swipe (goToNext/Prev) patcheadas');
    },
    
    /**
     * PATCH: Carrossel com pré-carregamento
     */
    patchCarouselNavigation() {
        setTimeout(() => {
            if (!window.albumsCarousel) {
                console.warn('⚠️ Carrossel não encontrado ainda');
                return;
            }
            
            // Patch do updatePositions
            const originalUpdatePositions = AlbumsCarousel3D.prototype.updatePositions;
            
            AlbumsCarousel3D.prototype.updatePositions = function() {
                originalUpdatePositions.call(this);
                
                // Pré-carregar primeiras fotos dos álbuns visíveis
                IntelligentAlbumLoader.preloadVisibleAlbumsFirstPhoto(this.currentIndex);
            };
            
            console.log('✅ Carrossel patcheado com pré-carregamento');
        }, 500);
    },
    
    /**
     * PRÉ-CARREGAMENTO AO ABRIR ÁLBUM
     */
    async preloadOnAlbumOpen(albumId) {
        if (!window.currentAlbum || !window.albums) return;
        
        const currentAlbumIndex = window.albums.findIndex(a => a.id === albumId);
        if (currentAlbumIndex === -1) return;
        
        console.log(`🎯 Pré-carregando ao abrir álbum "${window.currentAlbum.title}"`);
        
        const toPreload = [];
        
        // 1. Primeira foto do álbum atual (prioridade máxima)
        if (window.currentAlbum.photos && window.currentAlbum.photos.length > 0) {
            toPreload.push({
                src: window.currentAlbum.photos[0].src,
                priority: 10,
                context: 'current-first'
            });
        }
        
        // 2. Próximas 2 fotos do álbum atual
        for (let i = 1; i <= this.config.preloadDistance && i < window.currentAlbum.photos.length; i++) {
            toPreload.push({
                src: window.currentAlbum.photos[i].src,
                priority: 8 - i,
                context: `current-next-${i}`
            });
        }
        
        // 3. Primeira foto do PRÓXIMO álbum (para transição suave)
        const nextAlbumIndex = (currentAlbumIndex + 1) % window.albums.length;
        const nextAlbum = window.albums[nextAlbumIndex];
        
        if (nextAlbum && nextAlbum.photos && nextAlbum.photos.length > 0) {
            const targetIndex = window.getAlbumTargetIndex ? window.getAlbumTargetIndex(nextAlbum) : 0;
            toPreload.push({
                src: nextAlbum.photos[targetIndex].src,
                priority: 6,
                context: 'next-album-target'
            });
        }
        
        // 4. Última foto do ÁLBUM ANTERIOR (para navegação reversa)
        const prevAlbumIndex = (currentAlbumIndex - 1 + window.albums.length) % window.albums.length;
        const prevAlbum = window.albums[prevAlbumIndex];
        
        if (prevAlbum && prevAlbum.photos && prevAlbum.photos.length > 0) {
            const targetIndex = window.getAlbumTargetIndex ? window.getAlbumTargetIndex(prevAlbum) : prevAlbum.photos.length - 1;
            toPreload.push({
                src: prevAlbum.photos[targetIndex].src,
                priority: 6,
                context: 'prev-album-target'
            });
        }
        
        // Executar pré-carregamento em ordem de prioridade
        await this.executePreloadQueue(toPreload);
    },
    
    /**
     * PRÉ-CARREGAMENTO DURANTE NAVEGAÇÃO
     */
    async preloadAdjacentPhotos() {
        if (!window.currentAlbum || !window.currentPhotoIndex === undefined) return;
        
        const photos = window.currentAlbum.photos;
        const currentIndex = window.currentPhotoIndex;
        const albumLength = photos.length;
        
        const toPreload = [];
        
        // 1. Próximas fotos do álbum atual
        for (let i = 1; i <= this.config.preloadDistance; i++) {
            const nextIndex = currentIndex + i;
            
            if (nextIndex < albumLength) {
                toPreload.push({
                    src: photos[nextIndex].src,
                    priority: 10 - i,
                    context: `adjacent-next-${i}`
                });
            }
        }
        
        // 2. Fotos anteriores (menor prioridade)
        for (let i = 1; i <= this.config.preloadDistance; i++) {
            const prevIndex = currentIndex - i;
            
            if (prevIndex >= 0) {
                toPreload.push({
                    src: photos[prevIndex].src,
                    priority: 5 - i,
                    context: `adjacent-prev-${i}`
                });
            }
        }
        
        // 3. SEMPRE pré-carregar a primeira foto do PRÓXIMO álbum
        // (O usuário agora pode dar swipe horizontal de qualquer foto)
        const nextAlbum = this.getNextAlbum();
        if (nextAlbum && nextAlbum.photos && nextAlbum.photos.length > 0) {
            const targetIndex = window.getAlbumTargetIndex ? window.getAlbumTargetIndex(nextAlbum) : 0;
            toPreload.push({
                src: nextAlbum.photos[targetIndex].src,
                priority: 7, // Alta prioridade caso façam swipe
                context: 'transition-next-album'
            });
        }
        
        // 4. SEMPRE pré-carregar a última foto do ÁLBUM ANTERIOR
        const prevAlbum = this.getPreviousAlbum();
        if (prevAlbum && prevAlbum.photos && prevAlbum.photos.length > 0) {
            const targetIndex = window.getAlbumTargetIndex ? window.getAlbumTargetIndex(prevAlbum) : prevAlbum.photos.length - 1;
            toPreload.push({
                src: prevAlbum.photos[targetIndex].src,
                priority: 7,
                context: 'transition-prev-album'
            });
        }
        
        // Executar pré-carregamento
        await this.executePreloadQueue(toPreload);
    },
    
    /**
     * PRÉ-CARREGAR PRIMEIRAS FOTOS DOS ÁLBUNS VISÍVEIS NO CARROSSEL
     */
    async preloadVisibleAlbumsFirstPhoto(centerIndex) {
        if (!window.albums || window.albums.length === 0) return;
        
        const total = window.albums.length;
        const leftIndex = (centerIndex - 1 + total) % total;
        const rightIndex = (centerIndex + 1) % total;
        
        const toPreload = [];
        
        [leftIndex, centerIndex, rightIndex].forEach((index, priority) => {
            const album = window.albums[index];
            
            if (album && album.photos && album.photos.length > 0) {
                toPreload.push({
                    src: album.photos[0].src,
                    priority: 5 - priority,
                    context: `carousel-album-${index}`
                });
            }
        });
        
        await this.executePreloadQueue(toPreload);
    },
    
    /**
     * EXECUTAR FILA DE PRÉ-CARREGAMENTO
     */
    async executePreloadQueue(items) {
        if (items.length === 0) return;
        
        // Ordenar por prioridade (maior primeiro)
        items.sort((a, b) => b.priority - a.priority);
        
        // Filtrar apenas os que não estão em cache
        const toLoad = items.filter(item => !this.cache.has(item.src));
        
        if (toLoad.length === 0) {
            console.log('✅ Todas as imagens já estão em cache');
            return;
        }
        
        console.log(`📥 Pré-carregando ${toLoad.length} imagens...`);
        
        // Carregar em paralelo (máximo 3 simultâneas)
        const CONCURRENT_LIMIT = 3;
        
        for (let i = 0; i < toLoad.length; i += CONCURRENT_LIMIT) {
            const batch = toLoad.slice(i, i + CONCURRENT_LIMIT);
            
            await Promise.all(
                batch.map(item => this.preloadImage(item.src, item.context))
            );
        }
    },
    
    /**
     * PRÉ-CARREGAR UMA IMAGEM
     */
    preloadImage(src, context = 'unknown') {
        return new Promise((resolve) => {
            // Verificar se já está em cache
            if (this.cache.has(src)) {
                this.stats.hits++;
                console.log(`✅ Cache hit: ${context}`);
                resolve(true);
                return;
            }
            
            const img = new Image();
            
            img.onload = () => {
                // Adicionar ao cache
                this.cache.set(src, img);
                this.stats.preloaded++;
                this.stats.cached++;
                
                // Limpar cache se muito grande
                this.cleanCache();
                
                console.log(`✅ Pré-carregada: ${context} (${this.stats.cached}/${this.config.maxCacheSize})`);
                resolve(true);
            };
            
            img.onerror = () => {
                this.stats.misses++;
                console.warn(`⚠️ Erro ao pré-carregar: ${context}`);
                resolve(false);
            };
            
            img.src = src;
        });
    },
    
    /**
     * LIMPAR CACHE (FIFO - First In First Out)
     */
    cleanCache() {
        if (this.cache.size <= this.config.maxCacheSize) return;
        
        // Remover as primeiras entradas (mais antigas)
        const keysToRemove = Array.from(this.cache.keys()).slice(
            0, 
            this.cache.size - this.config.maxCacheSize
        );
        
        keysToRemove.forEach(key => {
            this.cache.delete(key);
            this.stats.cached--;
        });
        
        console.log(`🗑️ Cache limpo: removidas ${keysToRemove.length} imagens`);
    },
    
    /**
     * HELPERS: Obter álbuns adjacentes
     */
    getNextAlbum() {
        if (!window.currentAlbum || !window.albums) return null;
        
        const currentIndex = window.albums.findIndex(a => a.id === window.currentAlbum.id);
        if (currentIndex === -1) return null;
        
        const nextIndex = (currentIndex + 1) % window.albums.length;
        return window.albums[nextIndex];
    },
    
    getPreviousAlbum() {
        if (!window.currentAlbum || !window.albums) return null;
        
        const currentIndex = window.albums.findIndex(a => a.id === window.currentAlbum.id);
        if (currentIndex === -1) return null;
        
        const prevIndex = (currentIndex - 1 + window.albums.length) % window.albums.length;
        return window.albums[prevIndex];
    },
    
    /**
     * ESTATÍSTICAS
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            hitRate: this.stats.hits + this.stats.misses > 0 
                ? Math.round((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100) 
                : 0
        };
    }
};

// ===== INTEGRAÇÃO COM LazyLoadManager EXISTENTE =====

if (typeof LazyLoadManager !== 'undefined') {
    console.log('🔗 Integrando com LazyLoadManager existente...');
    
    // Compartilhar estatísticas
    LazyLoadManager.intelligentLoader = IntelligentAlbumLoader;
    
    console.log('✅ Integração concluída');
}

// ===== FUNÇÃO GLOBAL DE ESTATÍSTICAS COMBINADAS =====

window.getAlbumLoadingStats = function() {
    const intelligentStats = IntelligentAlbumLoader.getStats();
    const lazyStats = typeof LazyLoadManager !== 'undefined' 
        ? LazyLoadManager.getStats() 
        : null;
    
    console.log('📊 LAZY LOADING INTELIGENTE:');
    console.log(`   🎯 Imagens pré-carregadas: ${intelligentStats.preloaded}`);
    console.log(`   💾 Cache atual: ${intelligentStats.cacheSize}/${IntelligentAlbumLoader.config.maxCacheSize}`);
    console.log(`   ✅ Cache hits: ${intelligentStats.hits}`);
    console.log(`   ❌ Cache misses: ${intelligentStats.misses}`);
    console.log(`   📈 Taxa de acerto: ${intelligentStats.hitRate}%`);
    
    if (lazyStats) {
        console.log('');
        console.log('📊 LAZY LOADING PADRÃO:');
        console.log(`   ✅ Carregadas: ${lazyStats.loaded}`);
        console.log(`   ⏳ Pendentes: ${lazyStats.pending}`);
        console.log(`   💯 Progresso: ${lazyStats.percentage}%`);
    }
    
    return { intelligent: intelligentStats, lazy: lazyStats };
};

// ===== INICIALIZAÇÃO AUTOMÁTICA =====

function initIntelligentLoading() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                IntelligentAlbumLoader.init();
            }, 1000);
        });
    } else {
        setTimeout(() => {
            IntelligentAlbumLoader.init();
        }, 1000);
    }
}

initIntelligentLoading();

// Exportar para global
window.IntelligentAlbumLoader = IntelligentAlbumLoader;

console.log('✅ Lazy Loading Inteligente v2.0 carregado');
console.log('🧪 Digite getAlbumLoadingStats() para estatísticas');