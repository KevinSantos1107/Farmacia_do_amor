// ================================================================
// ALBUM CUBE TRANSITION — Gesture-driven 3D cube between albums
//
// ESCOPO: Opera EXCLUSIVAMENTE dentro do .album-viewer / #albumModal.
// NÃO toca: carrossel principal, openAlbum, layout do modal.
// ================================================================
'use strict';

console.log('🎲 AlbumCubeTransition v1.2 (True 3D Cube sem Zoom) carregado');

const AlbumCubeTransition = (() => {

    // ── Configurações ────────────────────────────────────────────
    const CFG = {
        COMMIT_THRESHOLD:    0.30,   // 30% da largura confirma transição
        VELOCITY_THRESHOLD:  0.45,   // px/ms — flick rápido confirma
        AXIS_LOCK_PX:        10,     // px mínimos para travar eixo
        SHADOW_MAX_CURRENT:  0.25,   // opacidade máx sombra (face saindo)
        SHADOW_MAX_ADJACENT: 0.12,   // opacidade máx luz (face entrando)
        SPRING_DURATION:     420,    // ms — retorno por spring
        COMPLETE_DURATION:   380,    // ms — conclusão gestural
        TRIGGER_DURATION:    500,    // ms — conclusão programática (borda)
    };

    // ── Referências DOM ──────────────────────────────────────────
    let stage          = null;
    let wrapper        = null; // Novo: agrupa as faces para rotação sem zoom
    let faceCurrent    = null;
    let faceAdjacent   = null;
    let imgCurrent     = null;
    let imgAdjacent    = null;
    let shadowCurrent  = null;
    let shadowAdjacent = null;
    let viewer         = null;

    // ── Estado do módulo ─────────────────────────────────────────
    let isActive    = false;
    let isSwiping   = false;
    let isAnimating = false;

    // ── Estado do gesto ──────────────────────────────────────────
    let gestureStartX    = 0;
    let gestureStartY    = 0;
    let gesturePrevX     = 0;
    let gesturePrevTime  = 0;
    let gestureVelocityX = 0; // px/ms
    let swipeDirection   = 0; // -1 = esq (próximo) | +1 = dir (anterior)
    let axisLocked       = null; // 'h' | 'v' | null
    let halfWidth        = 0;
    let viewportWidth    = 0;
    let swipeProgress    = 0;   // [0, 1]

    let adjacentAlbum = null;
    let _cubeIsCommitting = false;

    // ════════════════════════════════════════════════════════════
    // PATCH — goToNextAlbum / goToPreviousAlbum
    // ════════════════════════════════════════════════════════════
    function patchAlbumNavigationFunctions() {
        function tryPatch() {
            const origNext = window.goToNextAlbum;
            const origPrev = window.goToPreviousAlbum;

            if (typeof origNext !== 'function' || typeof origPrev !== 'function') {
                setTimeout(tryPatch, 300);
                return;
            }

            // Quando o cubo já fez a animação completa (_cubeIsCommitting=true),
            // apenas atualiza o estado interno silenciosamente (sem re-animar).
            // Caso contrário, chama a função original normalmente.
            window.goToNextAlbum = function() {
                if (_cubeIsCommitting) { _silentAlbumSwitch('next'); return Promise.resolve(); }
                return origNext.apply(this, arguments);
            };

            window.goToPreviousAlbum = function() {
                if (_cubeIsCommitting) { _silentAlbumSwitch('prev'); return Promise.resolve(); }
                return origPrev.apply(this, arguments);
            };

            console.log('✅ CubeTransition: goToNext/Prev patcheados');
        }
        setTimeout(tryPatch, 1300);
    }

    // ════════════════════════════════════════════════════════════
    // TROCA SILENCIOSA
    // ════════════════════════════════════════════════════════════
    async function _silentAlbumSwitch(dir) {
        const albums = window.albums;
        const cur    = window.currentAlbum;
        if (!albums || !cur) return;

        const idx = albums.findIndex(a => a.id === cur.id);
        if (idx === -1) return;

        const adjIdx = dir === 'next'
            ? (idx + 1) % albums.length
            : (idx - 1 + albums.length) % albums.length;

        const target = albums[adjIdx];
        if (!target) return;

        // Garantir fotos (devem já estar pelo prefetch, mas safety net)
        if (!target.photos || target.photos.length === 0) {
            if (typeof window.ensureAlbumPhotos === 'function') {
                const ok = await window.ensureAlbumPhotos(target);
                if (!ok) return;
            } else {
                return;
            }
        }

        window.currentAlbum       = target;
        window.currentPhotoIndex  = typeof window.getAlbumTargetIndex === 'function'
            ? window.getAlbumTargetIndex(target) : 0;

        // Atualizar título com fade
        const titleEl = document.getElementById('modalAlbumTitle');
        if (titleEl) {
            titleEl.style.transition = 'opacity 0.2s ease';
            titleEl.style.opacity    = '0';
            setTimeout(() => {
                titleEl.textContent   = target.title;
                titleEl.style.opacity = '1';
                setTimeout(() => { titleEl.style.transition = ''; }, 220);
            }, 120);
        }

        if (typeof syncCarouselWithCurrentAlbum === 'function') {
            syncCarouselWithCurrentAlbum();
        }

        // NÃO chamar updateAlbumViewer() — o cubo já fez a transição visual.
        // Apenas atualizar silenciosamente os labels e o src do modalPhoto.
        const photo      = target.photos[window.currentPhotoIndex];
        const modalPhoto = document.getElementById('modalPhoto');
        if (modalPhoto && photo) {
            // O src já pode ter sido setado em completeCubeGesture;
            // garantir consistência sem reaplicar animações CSS.
            if (modalPhoto.src !== (photo.src || photo)) {
                modalPhoto.src = photo.src || photo;
            }
        }

        const currentPhotoEl = document.getElementById('currentPhoto');
        const totalPhotosEl  = document.getElementById('totalPhotos');
        if (currentPhotoEl) currentPhotoEl.textContent = window.currentPhotoIndex + 1;
        if (totalPhotosEl)  totalPhotosEl.textContent  = target.photos.length;

        if (typeof updateProgressBar === 'function') updateProgressBar();

        if (window.sessionAlbumProgress) {
            window.sessionAlbumProgress.set(target.id, window.currentPhotoIndex);
        }

        // Continuar prefetch em cascata
        if (typeof window.prefetchAdjacentAlbumsData === 'function') {
            window.prefetchAdjacentAlbumsData(target.id);
        }
    }

    // ════════════════════════════════════════════════════════════
    // CONSTRUÇÃO DO DOM — Com Elemento Wrapper
    // ════════════════════════════════════════════════════════════
    function buildDOM() {
        const old = document.getElementById('album-cube-stage');
        if (old) old.remove();

        stage = document.createElement('div');
        stage.id = 'album-cube-stage';

        wrapper = document.createElement('div');
        wrapper.className = 'cube-wrapper';
        stage.appendChild(wrapper);

        faceCurrent = document.createElement('div');
        faceCurrent.className = 'cube-face cube-face-current';
        imgCurrent = new Image();
        imgCurrent.draggable = false;
        shadowCurrent = document.createElement('div');
        shadowCurrent.className = 'cube-shadow-overlay';
        faceCurrent.appendChild(imgCurrent);
        faceCurrent.appendChild(shadowCurrent);

        faceAdjacent = document.createElement('div');
        faceAdjacent.className = 'cube-face cube-face-adjacent';
        imgAdjacent = new Image();
        imgAdjacent.draggable = false;
        shadowAdjacent = document.createElement('div');
        shadowAdjacent.className = 'cube-shadow-overlay';
        faceAdjacent.appendChild(imgAdjacent);
        faceAdjacent.appendChild(shadowAdjacent);

        wrapper.appendChild(faceCurrent);
        wrapper.appendChild(faceAdjacent);

        viewer.insertBefore(stage, viewer.firstChild);
    }

    // ════════════════════════════════════════════════════════════
    // TRANSFORMS 3D — GEOMETRIA CORRETA (Sem Zoom)
    // 
    // Em vez de empurrar o cubo inteiro para perto da câmera (zoom),
    // empurramos o "ponto de pivô" (wrapper) para TRÁS via translateZ(-hz),
    // e empurramos cada face para FRENTE via translateZ(hz).
    //
    // Resultado: a face frontal fica exatamente em translateZ(0)
    // no espaço da tela, mantendo escala 1:1 absoluta (zero zoom).
    // ════════════════════════════════════════════════════════════
    function applyTransform(p) {
        const cp    = Math.max(0, Math.min(1, p));
        const angle = cp * 90;
        const hz    = halfWidth;

        if (!wrapper) return;

        if (swipeDirection === -1) {
            // ← Próximo (Wrapper gira para a esquerda)
            wrapper.style.transform = `translateZ(${-hz}px) rotateY(${-angle}deg)`;
        } else {
            // → Anterior (Wrapper gira para a direita)
            wrapper.style.transform = `translateZ(${-hz}px) rotateY(${angle}deg)`;
        }

        shadowCurrent.style.opacity  = String(cp * CFG.SHADOW_MAX_CURRENT);
        shadowAdjacent.style.opacity = String((1 - cp) * CFG.SHADOW_MAX_ADJACENT);
    }

    function resetTransforms() {
        if (wrapper) wrapper.style.transform = '';
        if (faceCurrent) faceCurrent.style.transform = '';
        if (faceAdjacent) faceAdjacent.style.transform = '';
        if (shadowCurrent) shadowCurrent.style.opacity  = '0';
        if (shadowAdjacent) shadowAdjacent.style.opacity = '0';
    }

    // ════════════════════════════════════════════════════════════
    // INÍCIO DO GESTO
    // ════════════════════════════════════════════════════════════
    function onGestureStart(clientX, clientY) {
        if (isAnimating) return;
        if (!window.currentAlbum || !window.albums || window.albums.length < 2) return;
        if (typeof zoomLevel !== 'undefined' && zoomLevel > 1) return;
        if (typeof isPinching !== 'undefined' && isPinching) return;

        isSwiping        = true;
        gestureStartX    = clientX;
        gestureStartY    = clientY;
        gesturePrevX     = clientX;
        gesturePrevTime  = Date.now();
        gestureVelocityX = 0;
        axisLocked       = null;
        swipeDirection   = 0;
        swipeProgress    = 0;

        viewportWidth = viewer.offsetWidth || window.innerWidth;
        halfWidth     = viewportWidth / 2;

        const modalPhoto = document.getElementById('modalPhoto');
        if (modalPhoto) {
            imgCurrent.src       = modalPhoto.src;
            imgCurrent.alt       = modalPhoto.alt;
            modalPhoto.style.opacity = '0';
        }

        stage.classList.add('cube-active');
        faceAdjacent.classList.remove('cube-visible');
        adjacentAlbum = null;
        window._cubeHandlingSwipe = false;
    }

    // ════════════════════════════════════════════════════════════
    // PREPARAR FACE ADJACENTE E POSIÇÕES ESTÁTICAS
    // ════════════════════════════════════════════════════════════
    function prepareFaceAdjacent(dir) {
        swipeDirection = dir;

        const albums = window.albums;
        const cur    = window.currentAlbum;
        if (!albums || !cur) return;

        const idx = albums.findIndex(a => a.id === cur.id);
        if (idx === -1) return;

        const adjIdx = dir === -1
            ? (idx + 1) % albums.length
            : (idx - 1 + albums.length) % albums.length;

        adjacentAlbum = albums[adjIdx];

        // Segurança: se as fotos ainda não estão carregadas (prefetch em andamento
        // ou conexão lenta), abortar silenciosamente o cubo para este gesto.
        // O próximo swipe já vai encontrar os dados em cache.
        if (!adjacentAlbum || !adjacentAlbum.photos || adjacentAlbum.photos.length === 0) {
            console.log('⚠️ CubeTransition: fotos do álbum adjacente ainda não carregadas — aguardando prefetch.');
            adjacentAlbum = null;
            return;
        }

        const targetIdx = typeof window.getAlbumTargetIndex === 'function'
            ? window.getAlbumTargetIndex(adjacentAlbum)
            : 0;

        imgAdjacent.src = adjacentAlbum.photos[targetIdx].src;
        imgAdjacent.alt = adjacentAlbum.title;
        faceAdjacent.classList.add('cube-visible');

        const hz = halfWidth;
        faceCurrent.style.transform = `rotateY(0deg) translateZ(${hz}px)`;

        if (dir === -1) {
            faceAdjacent.style.transform = `rotateY(90deg) translateZ(${hz}px)`;
        } else {
            faceAdjacent.style.transform = `rotateY(-90deg) translateZ(${hz}px)`;
        }

        window._cubeHandlingSwipe = true;
        applyTransform(0);
    }

    // ════════════════════════════════════════════════════════════
    // DURANTE O GESTO
    // ════════════════════════════════════════════════════════════
    function onGestureMove(clientX, clientY) {
        if (!isSwiping || isAnimating) return;

        const now  = Date.now();
        const dx   = clientX - gestureStartX;
        const dy   = clientY - gestureStartY;
        const adx  = Math.abs(dx);
        const ady  = Math.abs(dy);

        const dt = now - gesturePrevTime;
        if (dt > 0) gestureVelocityX = (clientX - gesturePrevX) / dt;
        gesturePrevX    = clientX;
        gesturePrevTime = now;

        if (!axisLocked && (adx > CFG.AXIS_LOCK_PX || ady > CFG.AXIS_LOCK_PX)) {
            axisLocked = adx > ady ? 'h' : 'v';
        }

        if (axisLocked !== 'h') return;

        if (swipeDirection === 0 && adx > CFG.AXIS_LOCK_PX) {
            prepareFaceAdjacent(dx < 0 ? -1 : 1);
        }

        if (!adjacentAlbum || swipeDirection === 0) return;

        swipeProgress = adx / viewportWidth;
        applyTransform(swipeProgress);
    }

    // ════════════════════════════════════════════════════════════
    // FIM DO GESTO
    // ════════════════════════════════════════════════════════════
    function onGestureEnd() {
        if (!isSwiping) return;
        isSwiping = false;
        viewer.classList.remove('cube-dragging');

        if (axisLocked !== 'h' || !adjacentAlbum || swipeDirection === 0) {
            cancelCube();
            return;
        }

        const absVel = Math.abs(gestureVelocityX);
        const commit = swipeProgress >= CFG.COMMIT_THRESHOLD
                    || absVel >= CFG.VELOCITY_THRESHOLD;

        if (commit) {
            completeCubeGesture();
        } else {
            springBack();
        }
    }

    function cancelCube() {
        window._cubeHandlingSwipe = false;
        const modalPhoto = document.getElementById('modalPhoto');
        if (modalPhoto) modalPhoto.style.opacity = '';
        resetTransforms();
        stage.classList.remove('cube-active');
        faceAdjacent.classList.remove('cube-visible');
        swipeProgress  = 0;
        swipeDirection = 0;
    }

    function springBack() {
        isAnimating = true;
        animateTo(Math.min(1, swipeProgress), 0, CFG.SPRING_DURATION, easeOutBack, () => {
            stage.classList.remove('cube-active');
            faceAdjacent.classList.remove('cube-visible');
            resetTransforms();
            const modalPhoto = document.getElementById('modalPhoto');
            if (modalPhoto) modalPhoto.style.opacity = '';
            window._cubeHandlingSwipe = false;
            swipeProgress  = 0;
            swipeDirection = 0;
            isAnimating    = false;
        });
    }

    function completeCubeGesture() {
        isAnimating = true;
        const committedDir = swipeDirection;
        
        // Pré-carrega a foto real no modalPhoto enquanto a animação do cubo termina
        // Isso evita o "reajuste" de layout/flicker quando o modalPhoto fica visível
        if (adjacentAlbum) {
            const targetIdx = typeof window.getAlbumTargetIndex === 'function'
                ? window.getAlbumTargetIndex(adjacentAlbum) : 0;
            const modalPhoto = document.getElementById('modalPhoto');
            if (modalPhoto && adjacentAlbum.photos && adjacentAlbum.photos[targetIdx]) {
                modalPhoto.src = adjacentAlbum.photos[targetIdx].src;
            }
        }
        
        animateTo(Math.min(1, swipeProgress), 1, CFG.COMPLETE_DURATION, easeOutCubic, () => {
            _finalizeCubeTransition(committedDir);
        });
    }

    // ════════════════════════════════════════════════════════════
    // TRIGGAR TRANSIÇÃO PROGRAMÁTICA (borda da foto)
    // ════════════════════════════════════════════════════════════
    function triggerTransition(dir) {
        if (isAnimating || isSwiping) return;

        const numDir = dir === 'next' ? -1 : 1;

        viewportWidth = viewer.offsetWidth || window.innerWidth;
        halfWidth     = viewportWidth / 2;

        const modalPhoto = document.getElementById('modalPhoto');
        if (modalPhoto) {
            imgCurrent.src       = modalPhoto.src;
            imgCurrent.alt       = modalPhoto.alt;
            modalPhoto.style.opacity = '0';
        }

        swipeDirection = numDir;
        prepareFaceAdjacent(numDir);

        if (!adjacentAlbum) {
            if (modalPhoto) modalPhoto.style.opacity = '';
            swipeDirection = 0;
            window._cubeHandlingSwipe = false;
            return;
        }

        // Pré-carrega a foto alvo no modalPhoto antes de começar a animar
        const targetIdx = typeof window.getAlbumTargetIndex === 'function'
            ? window.getAlbumTargetIndex(adjacentAlbum) : 0;
        if (modalPhoto && adjacentAlbum.photos && adjacentAlbum.photos[targetIdx]) {
            modalPhoto.src = adjacentAlbum.photos[targetIdx].src;
        }

        stage.classList.add('cube-active');
        swipeProgress = 0;
        isAnimating   = true;

        animateTo(0, 1, CFG.TRIGGER_DURATION, easeInOutCubic, () => {
            _finalizeCubeTransition(numDir);
        });
    }

    function _finalizeCubeTransition(dir) {
        stage.classList.remove('cube-active');
        faceAdjacent.classList.remove('cube-visible');
        resetTransforms();

        const modalPhoto = document.getElementById('modalPhoto');
        if (modalPhoto) modalPhoto.style.opacity = '';

        _cubeIsCommitting = true;
        if (dir === -1) {
            if (typeof window.goToNextAlbum === 'function') window.goToNextAlbum();
        } else {
            if (typeof window.goToPreviousAlbum === 'function') window.goToPreviousAlbum();
        }
        _cubeIsCommitting = false;

        window._cubeHandlingSwipe = false;
        swipeProgress  = 0;
        swipeDirection = 0;
        isAnimating    = false;
    }

    // ════════════════════════════════════════════════════════════
    // ANIMAÇÃO RAF
    // ════════════════════════════════════════════════════════════
    function animateTo(from, to, duration, easingFn, onDone) {
        const startT = performance.now();
        const delta  = to - from;

        function tick(now) {
            const elapsed = now - startT;
            const t       = Math.min(1, elapsed / duration);
            applyTransform(from + delta * easingFn(t));
            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                applyTransform(to);
                if (onDone) onDone();
            }
        }
        requestAnimationFrame(tick);
    }

    function easeOutBack(t) {
        const c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // ════════════════════════════════════════════════════════════
    // LISTENERS
    // ════════════════════════════════════════════════════════════
    function attachListeners() {
        if (!viewer) return;

        viewer.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            if (typeof zoomLevel !== 'undefined' && zoomLevel > 1) return;
            if (typeof isPinching !== 'undefined' && isPinching) return;
            onGestureStart(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });

        viewer.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            if (e.touches.length !== 1) { isSwiping = false; cancelCube(); return; }

            const dx = Math.abs(e.touches[0].clientX - gestureStartX);
            const dy = Math.abs(e.touches[0].clientY - gestureStartY);

            if (axisLocked === 'h') {
                e.preventDefault();
            } else if (!axisLocked && dx > dy && dx > CFG.AXIS_LOCK_PX) {
                e.preventDefault();
            }

            onGestureMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        viewer.addEventListener('touchend', () => {
            if (!isSwiping) return;
            onGestureEnd();
        }, { passive: true });

        viewer.addEventListener('touchcancel', () => {
            if (isSwiping) { isSwiping = false; cancelCube(); }
        }, { passive: true });

        let mouseIsDown = false;
        viewer.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest('button')) return;
            mouseIsDown = true;
            viewer.classList.add('cube-dragging');
            onGestureStart(e.clientX, e.clientY);
            e.preventDefault();
        }, { passive: false });

        window.addEventListener('mousemove', (e) => {
            if (!mouseIsDown || !isSwiping) return;
            onGestureMove(e.clientX, e.clientY);
        }, { passive: true });

        window.addEventListener('mouseup', () => {
            if (!mouseIsDown) return;
            mouseIsDown = false;
            viewer.classList.remove('cube-dragging');
            if (isSwiping) onGestureEnd();
        }, { passive: true });
    }

    // ════════════════════════════════════════════════════════════
    // INIT
    // ════════════════════════════════════════════════════════════
    function init() {
        viewer = document.querySelector('.album-viewer');
        if (!viewer) return;

        buildDOM();
        attachListeners();
        patchAlbumNavigationFunctions();

        window._cubeHandlingSwipe = false;
        isActive = true;
    }

    return { init, triggerTransition, get isActive() { return isActive; } };
})();

(function autoInit() {
    function tryInit() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(tryInit, 700));
            return;
        }
        if (!document.querySelector('.album-viewer')) {
            setTimeout(tryInit, 400);
            return;
        }
        AlbumCubeTransition.init();
    }
    setTimeout(tryInit, 1100);
})();

window.AlbumCubeTransition = AlbumCubeTransition;
