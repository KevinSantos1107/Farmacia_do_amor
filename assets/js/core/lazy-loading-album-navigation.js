// ===== SISTEMA DE PRÉ-CARREGAMENTO DE IMAGENS =====
// v3.0 — Responsabilidade única: pré-carregar pixels de imagens no browser.
//
// O controle de DADOS (Firestore) agora é feito em firebase-config.js via:
//   - ensureAlbumPhotos(album)
//   - prefetchAdjacentAlbumsData(albumId)
//
// Este arquivo lida apenas com o pré-carregamento de imagens (Image objects)
// para que o browser já tenha os pixels em memória antes do usuário ver.
// ============================================================

console.log('🚀 Image Preloader v3.0 carregado');

const IntelligentAlbumLoader = {

    // Cache de objetos Image já baixados pelo browser
    cache: new Map(),

    // Estatísticas
    stats: { preloaded: 0, hits: 0, misses: 0 },

    // Configurações
    config: {
        preloadDistance: 2,  // Fotos adjacentes para pré-carregar
        maxCacheSize:    40, // Limite do cache de imagens
    },

    // ── Inicialização ────────────────────────────────────────────
    init() {
        console.log('⚙️ Inicializando Image Preloader...');

        // Monitorar abertura de álbuns via evento customizado
        // (evita monkey-patching de funções para não causar conflitos)
        document.addEventListener('albumOpened', (e) => {
            const albumId = e.detail && e.detail.albumId;
            if (albumId) {
                setTimeout(() => this.preloadOnAlbumOpen(albumId), 150);
            }
        });

        // Monitorar navegação de fotos
        document.addEventListener('photoNavigated', () => {
            setTimeout(() => this.preloadAdjacentPhotos(), 50);
        });

        console.log('✅ Image Preloader inicializado');
    },

    // ── Pré-carregar ao abrir álbum ──────────────────────────────
    async preloadOnAlbumOpen(albumId) {
        if (!window.currentAlbum || !window.albums) return;

        const albumIndex = window.albums.findIndex(a => a.id === albumId);
        if (albumIndex === -1) return;

        const toPreload = [];
        const currentAlbum = window.currentAlbum;

        // 1. Primeiras fotos do álbum atual
        if (currentAlbum.photos && currentAlbum.photos.length > 0) {
            for (let i = 0; i < Math.min(3, currentAlbum.photos.length); i++) {
                toPreload.push({ src: currentAlbum.photos[i].src, priority: 10 - i, context: `current-${i}` });
            }
        }

        // 2. Primeira foto do próximo álbum (se já carregada pelo prefetch de dados)
        const total     = window.albums.length;
        const nextAlbum = window.albums[(albumIndex + 1) % total];
        const prevAlbum = window.albums[(albumIndex - 1 + total) % total];

        if (nextAlbum && nextAlbum.photos && nextAlbum.photos.length > 0) {
            const idx = window.getAlbumTargetIndex ? window.getAlbumTargetIndex(nextAlbum) : 0;
            toPreload.push({ src: nextAlbum.photos[idx].src, priority: 7, context: 'next-album-cover' });
        }

        if (prevAlbum && prevAlbum.photos && prevAlbum.photos.length > 0) {
            const idx = window.getAlbumTargetIndex ? window.getAlbumTargetIndex(prevAlbum) : 0;
            toPreload.push({ src: prevAlbum.photos[idx].src, priority: 6, context: 'prev-album-cover' });
        }

        await this._executeQueue(toPreload);
    },

    // ── Pré-carregar fotos adjacentes durante navegação ──────────
    async preloadAdjacentPhotos() {
        if (!window.currentAlbum) return;

        const photos       = window.currentAlbum.photos;
        const currentIndex = window.currentPhotoIndex || 0;
        if (!photos || photos.length === 0) return;

        const toPreload = [];

        for (let i = 1; i <= this.config.preloadDistance; i++) {
            const nextIdx = currentIndex + i;
            const prevIdx = currentIndex - i;
            if (nextIdx < photos.length)
                toPreload.push({ src: photos[nextIdx].src, priority: 10 - i, context: `adjacent-next-${i}` });
            if (prevIdx >= 0)
                toPreload.push({ src: photos[prevIdx].src, priority: 5 - i, context: `adjacent-prev-${i}` });
        }

        await this._executeQueue(toPreload);
    },

    // ── Pré-carregar fotos visíveis no carrossel ─────────────────
    async preloadVisibleAlbumsFirstPhoto(centerIndex) {
        if (!window.albums || window.albums.length === 0) return;

        const total    = window.albums.length;
        const indices  = [
            (centerIndex - 1 + total) % total,
            centerIndex,
            (centerIndex + 1) % total
        ];

        const toPreload = [];
        indices.forEach((idx, priority) => {
            const album = window.albums[idx];
            if (album && album.photos && album.photos.length > 0) {
                toPreload.push({ src: album.photos[0].src, priority: 5 - priority, context: `carousel-${idx}` });
            }
        });

        await this._executeQueue(toPreload);
    },

    // ── Executar fila de pré-carregamento ────────────────────────
    async _executeQueue(items) {
        if (!items || items.length === 0) return;

        items.sort((a, b) => b.priority - a.priority);
        const toLoad = items.filter(item => item.src && !this.cache.has(item.src));

        if (toLoad.length === 0) {
            console.log('✅ Todas as imagens já estão em cache de pixels');
            return;
        }

        const CONCURRENT = 3;
        for (let i = 0; i < toLoad.length; i += CONCURRENT) {
            const batch = toLoad.slice(i, i + CONCURRENT);
            await Promise.all(batch.map(item => this._preloadImage(item.src, item.context)));
        }
    },

    // ── Pré-carregar uma imagem ───────────────────────────────────
    _preloadImage(src, context = 'unknown') {
        return new Promise((resolve) => {
            if (!src) { resolve(false); return; }
            if (this.cache.has(src)) { this.stats.hits++; resolve(true); return; }

            const img   = new Image();
            img.onload  = () => {
                this.cache.set(src, img);
                this.stats.preloaded++;
                this._cleanCache();
                console.log(`✅ Pré-carregada: ${context} (cache: ${this.cache.size})`);
                resolve(true);
            };
            img.onerror = () => { this.stats.misses++; resolve(false); };
            img.src     = src;
        });
    },

    // ── Limpeza de cache (FIFO) ───────────────────────────────────
    _cleanCache() {
        if (this.cache.size <= this.config.maxCacheSize) return;
        const removeCount = this.cache.size - this.config.maxCacheSize;
        const keys        = Array.from(this.cache.keys()).slice(0, removeCount);
        keys.forEach(k => this.cache.delete(k));
        console.log(`🗑️ Cache limpo: ${removeCount} imagens removidas`);
    },

    // ── Estatísticas ─────────────────────────────────────────────
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            hitRate:   total > 0 ? Math.round((this.stats.hits / total) * 100) : 0
        };
    }
};

// ── Integrar com LazyLoadManager (compatibilidade) ───────────────
if (typeof LazyLoadManager !== 'undefined') {
    LazyLoadManager.intelligentLoader = IntelligentAlbumLoader;
}

// ── Estatísticas globais ──────────────────────────────────────────
window.getAlbumLoadingStats = function() {
    const s = IntelligentAlbumLoader.getStats();
    console.log(`📊 Image Preloader — Cache: ${s.cacheSize}/${IntelligentAlbumLoader.config.maxCacheSize} | Pré-carregadas: ${s.preloaded} | Hit rate: ${s.hitRate}%`);
    return s;
};

// ── Inicialização automática ──────────────────────────────────────
function initIntelligentLoading() {
    const run = () => setTimeout(() => IntelligentAlbumLoader.init(), 1200);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
}
initIntelligentLoading();

window.IntelligentAlbumLoader = IntelligentAlbumLoader;
console.log('✅ Image Preloader v3.0 — sem monkey-patching, sem conflitos');