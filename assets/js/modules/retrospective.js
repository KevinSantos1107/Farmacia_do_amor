// ===== RETROSPECTIVA DO ANO — CINEMATIC EXPERIENCE =====
// Premium UI/UX — Spotify Wrapped meets Apple Keynote
// Data do aniversário: 27/10/2025

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 MODO DESENVOLVEDOR
// Para testar a retrospectiva SEM esperar o aniversário, use qualquer um desses:
//
//  1. Mude a linha abaixo para: const RETRO_DEV_MODE = true;
//     (lembre de voltar para false antes de publicar)
//
//  2. No console do navegador, rode:
//     localStorage.setItem('retroDevMode', '1')   → ativa
//     localStorage.removeItem('retroDevMode')      → desativa
//
//  3. Adicione ?retroTest=1 na URL do site
//     Ex: https://seusite.com?retroTest=1
// ─────────────────────────────────────────────────────────────────────────────
const RETRO_DEV_MODE = false;

class Retrospective {
    constructor() {
        // ── Referências DOM ──────────────────────────────────────────────────
        this.modal          = document.getElementById('retrospectiveModal');
        this.openBtn        = document.getElementById('openRetrospectiveBtn');
        this.closeBtn       = document.getElementById('retroCloseBtn');
        this.introScreen    = document.getElementById('retroIntroScreen');
        this.startBtn       = document.getElementById('retroStartBtn');
        this.slidesContainer= document.getElementById('retroSlidesContainer');
        this.starsCanvas    = document.getElementById('retroStarsCanvas');
        this.blobCanvas     = document.getElementById('retroBlobCanvas');
        this.confettiCanvas = document.getElementById('retroConfettiCanvas');
        this.blackout       = document.getElementById('retroBlackout');
        this.muteBtn        = document.getElementById('retroMuteBtn');
        this.musicIndicator = document.getElementById('retroMusicIndicator');
        this.musicTitle     = document.getElementById('retroMusicTitle');
        this.chapterBar     = document.getElementById('retroChapterBar');
        this.daysNumberEl   = document.getElementById('retroDaysNumber');
        this.lockedScreen   = document.getElementById('retroLockedScreen');
        this.lockedCdown    = document.getElementById('retroLockedCountdown');

        if (!this.modal) return;

        // ── Configuração de Data ─────────────────────────────────────────────
        this.anniversaryDate  = new Date('2025-10-27T00:00:00');
        this.anniversaryDay   = 27;
        this.anniversaryMonth = 9; // mês 0-indexado (outubro = 9)

        // ── Estado ───────────────────────────────────────────────────────────
        this.config          = null;
        this.selectedPhotos  = [];
        this.currentSlide    = 0;
        this.totalSlides     = 7;
        this.isPlaying       = true;
        this.autoAdvanceTimer= null;
        this.isMuted         = false;
        this.audioEl         = null;
        this.starsCtx        = null;
        this.starsAnimId     = null;
        this.starParticles   = [];
        this.blobAnimId      = null;
        this.blobs           = [];
        this.touchStartX     = 0;
        this.touchStartY     = 0;

        // ── Audio-reactive ───────────────────────────────────────────────────
        this.audioContext    = null;
        this.analyser        = null;
        this.audioDataArray  = null;
        this.audioBass       = 0;

        // ── Photo state ─────────────────────────────────────────────────────
        this.totalPhotosInYear = 0; // count of ALL photos in the year (for stats)

        // ── Ken Burns ────────────────────────────────────────────────────────
        this.kbCurrentIndex  = 0;
        this.kbInterval      = null;

        // ── Blob color themes per slide ──────────────────────────────────────
        this.slideThemes = [
            // Slide 0: Welcome — deep purple/pink
            [{ r: 80, g: 20, b: 160 }, { r: 180, g: 30, b: 100 }],
            // Slide 1: Stats — vibrant purple/magenta
            [{ r: 100, g: 20, b: 200 }, { r: 200, g: 50, b: 120 }],
            // Slide 2: Photos — warm amber/rose
            [{ r: 160, g: 60, b: 20 }, { r: 200, g: 40, b: 100 }],
            // Slide 3: Places — ocean blue/teal
            [{ r: 20, g: 60, b: 180 }, { r: 10, g: 130, b: 120 }],
            // Slide 4: Timeline — amber/emerald
            [{ r: 180, g: 100, b: 10 }, { r: 10, g: 150, b: 100 }],
            // Slide 5: Favorites — gold/purple
            [{ r: 180, g: 120, b: 20 }, { r: 120, g: 40, b: 200 }],
            // Slide 6: Final — deep pink/purple (grand finale)
            [{ r: 160, g: 20, b: 100 }, { r: 100, g: 30, b: 180 }],
        ];
        this.currentThemeColors = this.slideThemes[0];
        this.targetThemeColors  = this.slideThemes[0];

        // ── Inicializar ──────────────────────────────────────────────────────
        this._bindEvents();
        this._checkAutoOpen();
    }

    // =========================================================================
    //  VERIFICAÇÃO DE ANIVERSÁRIO
    // =========================================================================
    _checkAutoOpen() {
        const now = new Date();
        const isAnniversary = (
            now.getDate()  === this.anniversaryDay &&
            now.getMonth() === this.anniversaryMonth
        );
        const todayKey = `retro_opened_${now.toISOString().slice(0, 10)}`;
        if (isAnniversary && !localStorage.getItem(todayKey)) {
            setTimeout(() => {
                localStorage.setItem(todayKey, '1');
                this.openModal();
            }, 2500);
        }
    }

    // =========================================================================
    //  EVENTOS
    // =========================================================================
    _bindEvents() {
        if (this.openBtn)  this.openBtn.addEventListener('click', (e) => { e.preventDefault(); this.openModal(); });
        if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.closeModal());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display !== 'none') this.closeModal();
            if (e.key === 'ArrowRight' && this.modal.style.display !== 'none') this._goNext();
            if (e.key === 'ArrowLeft'  && this.modal.style.display !== 'none') this._goPrev();
        });

        if (this.startBtn)  this.startBtn.addEventListener('click', () => this._startSlides());
        if (this.muteBtn)   this.muteBtn.addEventListener('click', () => this._toggleMute());

        // Identificador de elementos interativos para bloquear swipe/tap da retrospectiva
        const isInteractive = (el) => {
            return el.closest('button, a, input, select, textarea, .retro-thumb-strip, .retro-kb-slide, .retro-fav-card, .interactive');
        };

        if (this.slidesContainer) {
            // Navegação por toque lateral (Stories)
            this.slidesContainer.addEventListener('click', (e) => {
                if (isInteractive(e.target)) return;
                
                const rect = this.slidesContainer.getBoundingClientRect();
                const x = e.clientX - rect.left;
                
                if (x < rect.width / 2) {
                    this._goPrev();
                } else {
                    this._goNext();
                }
            });

            // Swipe mobile
            this.slidesContainer.addEventListener('touchstart', (e) => {
                if (isInteractive(e.target)) return;
                this.touchStartX = e.touches[0].clientX;
            }, { passive: true });

            this.slidesContainer.addEventListener('touchend', (e) => {
                if (isInteractive(e.target)) return;
                if (!this.touchStartX) return;
                
                const dx = e.changedTouches[0].clientX - this.touchStartX;
                if (Math.abs(dx) > 60) {
                    dx < 0 ? this._goNext() : this._goPrev();
                }
                this.touchStartX = 0;
            }, { passive: true });
        }
    }

    // =========================================================================
    //  ABRIR / FECHAR MODAL
    // =========================================================================
    async openModal() {
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        this.currentSlide = 0;
        this._stopStars();
        this._stopBlobs();
        if (this.audioEl) { this.audioEl.pause(); this.audioEl.currentTime = 0; }

        this._updateDaysCounter();
        this._initTypewriter();
        this._initBlobs();
        this._initStars();

        const firstAnniversary = new Date(2026, 9, 27, 0, 0, 0);
        const now = new Date();
        const devByURL       = new URLSearchParams(window.location.search).get('retroTest') === '1';
        const devByStorage   = localStorage.getItem('retroDevMode') === '1';
        const isUnlocked     = RETRO_DEV_MODE || devByURL || devByStorage || now >= firstAnniversary;

        if (isUnlocked) {
            console.info('🔓 Retrospectiva liberada.');
        }

        if (this.lockedScreen) this.lockedScreen.style.display = 'none';
        if (this.introScreen)  this.introScreen.style.display = 'flex';
        if (this.slidesContainer) this.slidesContainer.classList.remove('active');

        if (!isUnlocked) {
            this._showLockedScreen(firstAnniversary, now);
            return;
        }

        this._loadConfig();
    }

    closeModal() {
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        this._stopStars();
        this._stopBlobs();
        this._stopConfetti();
        this._stopKenBurns();

        if (this.audioEl) {
            this._fadeOutAudio(() => {
                this.audioEl.pause();
                this.audioEl.currentTime = 0;
            });
        }

        document.querySelectorAll('.retro-slide').forEach(s => {
            s.classList.remove('active', 'exit-left');
        });
        if (this.slidesContainer) this.slidesContainer.classList.remove('active');
        if (this.introScreen) {
            this.introScreen.style.display = 'flex';
            this.introScreen.classList.remove('fade-out');
        }
    }

    // =========================================================================
    //  TELA DE BLOQUEIO
    // =========================================================================
    _showLockedScreen(targetDate, now) {
        if (this.introScreen) this.introScreen.style.display = 'none';
        if (this.lockedScreen) this.lockedScreen.style.display = 'flex';

        const update = () => {
            const diff = targetDate - new Date();
            if (diff <= 0) { this.closeModal(); return; }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            if (this.lockedCdown) {
                this.lockedCdown.textContent = `Faltam ${d}d ${h}h ${m}min para o nosso primeiro aniversário ✨`;
            }
        };
        update();
        this._lockedInterval = setInterval(update, 60000);
    }

    // =========================================================================
    //  DIAS JUNTOS — Animated Counter
    // =========================================================================
    _updateDaysCounter() {
        if (!this.daysNumberEl) return;
        const now  = new Date();
        const diff = Math.floor((now - this.anniversaryDate) / 86400000);
        let count = 0;
        const target = Math.max(diff, 0);
        const step = Math.ceil(target / 80);
        const tick = setInterval(() => {
            count = Math.min(count + step, target);
            this.daysNumberEl.textContent = count;
            if (count >= target) clearInterval(tick);
        }, 18);
    }

    // =========================================================================
    //  TYPEWRITER — Intro Logo Animation
    // =========================================================================
    _initTypewriter() {
        const logo = document.querySelector('.retro-intro-logo');
        if (!logo) return;
        logo.classList.remove('typewriter-done');
        logo.classList.add('typewriter');
        // Remove caret after typewriter finishes
        setTimeout(() => {
            logo.classList.remove('typewriter');
            logo.classList.add('typewriter-done');
        }, 3500);
    }

    // =========================================================================
    //  FIREBASE — CARREGAR CONFIG + FOTOS INTELIGENTES
    // =========================================================================
    async _loadConfig() {
        try {
            if (typeof db === 'undefined') return;

            // 1️⃣ Carregar configurações salvas
            const doc = await db.collection('retrospective_config').doc('settings').get();
            if (doc.exists) {
                this.config = doc.data();
            }

            // 2️⃣ Carregar Marcos da Timeline Principal
            this.timelineEvents = [];
            const timelineSnap = await db.collection('timeline').orderBy('createdAt', 'asc').get();
            timelineSnap.forEach(tDoc => {
                const data = tDoc.data();
                this.timelineEvents.push({
                    date: data.date || '',
                    text: data.title || ''
                });
            });

            // 3️⃣ Carregar TODAS as fotos dos álbuns (para contar + selecionar)
            await this._loadAndSelectPhotosIntelligently();

        } catch (e) {
            console.warn('⚠️ Retrospectiva: erro ao carregar config', e);
        }
    }

    // =========================================================================
    //  SISTEMA DE SELEÇÃO INTELIGENTE DE FOTOS
    // =========================================================================
    async _loadAndSelectPhotosIntelligently() {
        const MAX_PHOTOS     = 20;   // Máximo de fotos na retrospectiva
        const RETRO_START    = new Date('2025-10-27T00:00:00'); // Início do relacionamento
        const RETRO_END      = new Date(RETRO_START);
        RETRO_END.setFullYear(RETRO_END.getFullYear() + 1);     // 1 ano depois

        let allPhotos = [];
        let globalIndex = 0;

        try {
            const albumsSnap = await db.collection('albums').get();

            // Ordenar álbuns por data de criação se existir (fallback)
            const sortedAlbums = Array.from(albumsSnap.docs).sort((a, b) => {
                const ta = a.data().createdAt || 0;
                const tb = b.data().createdAt || 0;
                return ta - tb;
            });

            for (const albumDoc of sortedAlbums) {
                const pagesSnap = await db.collection('album_photos')
                    .where('albumId', '==', albumDoc.id).get();

                const sortedPages = Array.from(pagesSnap.docs).sort(
                    (a, b) => (a.data().pageNumber || 0) - (b.data().pageNumber || 0)
                );

                sortedPages.forEach(pageDoc => {
                    const photos = pageDoc.data().photos || [];
                    photos.forEach(photo => {
                        const url = photo.src || photo.url || '';
                        if (!url) return;

                        // Determinar a data da foto
                        let photoDate = null;
                        if (photo.dateTaken) {
                            let dStr = photo.dateTaken.trim();
                            // Suporte para DD/MM/YYYY (comum no Brasil)
                            if (dStr.includes('/')) {
                                const parts = dStr.split('/');
                                if (parts.length === 3) {
                                    const day = parseInt(parts[0], 10);
                                    const month = parseInt(parts[1], 10) - 1;
                                    let year = parseInt(parts[2], 10);
                                    if (year < 100) year += 2000; // yy -> yyyy
                                    photoDate = new Date(year, month, day);
                                }
                            } else {
                                // Fallback para YYYY-MM-DD ou Date strings válidas
                                photoDate = new Date(dStr);
                            }
                            if (photoDate && isNaN(photoDate.getTime())) photoDate = null;
                        }

                        allPhotos.push({
                            url,
                            src: url,
                            caption:   photo.description || photo.alt || '',
                            dateTaken: photo.dateTaken   || '',
                            date:      photoDate,
                            albumTitle: albumDoc.data().title || '',
                            _originalIndex: globalIndex++
                        });
                    });
                });
            }
        } catch (e) {
            console.warn('⚠️ Erro ao carregar fotos dos álbuns:', e);
        }

        console.log(`📸 Total de fotos encontradas: ${allPhotos.length}`);

        // 1️⃣ Filtrar fotos do período do relacionamento
        const yearPhotos = allPhotos.filter(p => {
            if (!p.date) return true; // sem data = incluir (não sabemos quando foi)
            return p.date >= RETRO_START && p.date <= RETRO_END;
        });

        // Usar yearPhotos se tiver fotos com data; senão usar todas
        const pool = yearPhotos.length > 0 ? yearPhotos : allPhotos;

        // 2️⃣ Salvar contagem total para o slide de estatísticas
        this.totalPhotosInYear = pool.length;
        console.log(`📸 Fotos no período do relacionamento: ${this.totalPhotosInYear}`);

        if (pool.length === 0) {
            this.selectedPhotos = [];
            return;
        }

        // 3️⃣ Pontuação Base de Qualidade
        // Fotos com mais metadados são mais "memoravelmente documentadas"
        pool.forEach(p => {
            let score = 0;
            if (p.caption && p.caption.trim().length > 2) score += 50;  // Tem descrição = muito importante
            if (p.dateTaken) score += 20; // Tem data
            p._baseScore = score + (Math.random() * 5); // Fator aleatório leve para desempate
        });

        const selected = [];
        const selectedUrls = new Set();

        // 4️⃣ Seleção Dinâmica (Algoritmo de Diversidade estilo Google Photos)
        // Seleciona uma por uma, aplicando penalidades baseadas nas fotos já escolhidas
        while (selected.length < Math.min(MAX_PHOTOS, pool.length)) {
            let bestPhoto = null;
            let bestScore = -Infinity;

            for (const p of pool) {
                if (selectedUrls.has(p.url)) continue;

                let currentScore = p._baseScore;

                // Penalidade 1: Álbum repetido
                // Evita que muitas fotos do mesmo álbum (mesmo evento) dominem
                if (p.albumTitle) {
                    const sameAlbumCount = selected.filter(s => s.albumTitle === p.albumTitle).length;
                    currentScore -= (sameAlbumCount * 40); 
                }

                // Penalidade 2: Proximidade temporal
                // Evita pegar fotos tiradas no mesmo dia ou mesma semana
                if (p.date) {
                    let minDaysDiff = Infinity;
                    for (const s of selected) {
                        if (s.date) {
                            const diffDays = Math.abs((p.date - s.date) / (1000 * 60 * 60 * 24));
                            if (diffDays < minDaysDiff) minDaysDiff = diffDays;
                        }
                    }

                    if (minDaysDiff === 0) {
                        currentScore -= 30; // Mesmo dia
                    } else if (minDaysDiff < 7) {
                        currentScore -= 15; // Mesma semana
                    } else if (minDaysDiff < 30) {
                        currentScore -= 5;  // Mesmo mês
                    }
                }

                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    bestPhoto = p;
                }
            }

            if (bestPhoto) {
                selected.push(bestPhoto);
                selectedUrls.add(bestPhoto.url);
            } else {
                break;
            }
        }

        // 5️⃣ Ordenar cronologicamente para a apresentação
        // Usa a data real se existir, senão usa a ordem original em que foram adicionadas
        this.selectedPhotos = selected
            .sort((a, b) => {
                if (a.date && b.date) return a.date - b.date;
                if (!a.date && !b.date) return (a._originalIndex || 0) - (b._originalIndex || 0);
                if (!a.date) return 1;  // Fotos sem data vão para o final
                if (!b.date) return -1; 
                return 0;
            });

        console.log(`✨ Seleção inteligente concluída: ${this.selectedPhotos.length} fotos escolhidas de ${pool.length}`);
    }

    // =========================================================================
    //  INICIAR SLIDES
    // =========================================================================
    async _startSlides() {
        if (this.introScreen) {
            this.introScreen.classList.add('fade-out');
            await this._wait(1400);
            this.introScreen.style.display = 'none';
        }

        if (this.slidesContainer) {
            this.slidesContainer.classList.add('active');
        }

        this._renderSlides();
        this._startMusic();

        this.currentSlide = 0;
        this._showSlide(0, 'enter');
    }

    // =========================================================================
    //  RENDERIZAR SLIDES
    // =========================================================================
    _renderSlides() {
        this._renderStatsSlide();
        this._renderPhotosSlide();
        this._renderPlacesSlide();
        this._renderTimelineSlide();
        this._renderFavoritesSlide();
        this._renderFinalSlide();
    }

    // ── Slide 1: Ken Burns Photo Carousel ────────────────────────────────────
    _renderPhotosSlide() {
        const container = document.getElementById('retroPhotosGrid');
        if (!container) return;
        container.innerHTML = '';

        if (!this.selectedPhotos || this.selectedPhotos.length === 0) {
            container.innerHTML = `<div class="retro-no-photos"><i class="fas fa-camera-retro"></i><p>As fotos aparecerão aqui depois de configuradas no painel admin.</p></div>`;
            return;
        }

        container.className = '';
        container.style.cssText = 'width:100%;max-width:340px;display:flex;flex-direction:column;align-items:center;';

        const kbContainer = document.createElement('div');
        kbContainer.className = 'retro-ken-burns-container';

        this.selectedPhotos.forEach((photo, idx) => {
            const photoUrl = photo.url || photo.src || '';
            const caption  = photo.caption || photo.description || '';
            const dateTaken = photo.dateTaken || photo.timestamp || '';
            const dateStr  = dateTaken ? this._formatPhotoDate(dateTaken) : '';

            const slide = document.createElement('div');
            slide.className = 'retro-kb-slide' + (idx === 0 ? ' active' : '');

            const img = document.createElement('img');
            img.src = photoUrl;
            img.alt = caption || `Foto ${idx + 1}`;
            img.loading = idx < 2 ? 'eager' : 'lazy';
            img.onerror = () => slide.remove();

            img.style.animationDuration = `${6 + Math.random() * 4}s`;

            const captionEl = document.createElement('div');
            captionEl.className = 'retro-kb-caption';
            captionEl.innerHTML = `
                ${dateStr ? `<div class="retro-kb-caption-date">${dateStr}</div>` : ''}
                ${caption ? `<div class="retro-kb-caption-text">${caption}</div>` : ''}
            `;

            slide.appendChild(img);
            if (dateStr || caption) slide.appendChild(captionEl);

            slide.addEventListener('click', (e) => {
                const rect = slide.getBoundingClientRect();
                const x = e.clientX - rect.left;
                if (x < rect.width / 2) {
                    if (idx > 0) this._goToKBSlide(idx - 1);
                } else {
                    if (idx < this.selectedPhotos.length - 1) this._goToKBSlide(idx + 1);
                }
            });

            kbContainer.appendChild(slide);
        });

        container.appendChild(kbContainer);

        const counter = document.createElement('div');
        counter.className = 'retro-photo-counter';
        counter.id = 'retroPhotoCounter';
        counter.textContent = `1 / ${this.selectedPhotos.length}`;
        container.appendChild(counter);

        if (this.selectedPhotos.length > 1) {
            const strip = document.createElement('div');
            strip.className = 'retro-thumb-strip';
            
            const preventSwipe = (e) => e.stopPropagation();
            strip.addEventListener('touchstart', preventSwipe, { passive: false });
            strip.addEventListener('touchmove', preventSwipe, { passive: false });
            strip.addEventListener('mousedown', preventSwipe);

            this.selectedPhotos.forEach((photo, idx) => {
                const thumb = document.createElement('div');
                thumb.className = 'retro-thumb' + (idx === 0 ? ' active' : '');
                const img = document.createElement('img');
                img.src = photo.url || photo.src || '';
                img.loading = 'lazy';
                thumb.appendChild(img);
                thumb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._goToKBSlide(idx);
                });
                strip.appendChild(thumb);
            });

            container.appendChild(strip);
        }
    }

    // Ken Burns auto-advance
    _startKenBurns() {
        if (this.selectedPhotos.length <= 1) return;
        this._stopKenBurns();
        this.kbCurrentIndex = 0;
        this.kbInterval = setInterval(() => {
            this.kbCurrentIndex = (this.kbCurrentIndex + 1) % this.selectedPhotos.length;
            this._goToKBSlide(this.kbCurrentIndex);
        }, 5000);
    }

    _stopKenBurns() {
        if (this.kbInterval) {
            clearInterval(this.kbInterval);
            this.kbInterval = null;
        }
    }

    _goToKBSlide(index) {
        const slides = document.querySelectorAll('.retro-kb-slide');
        const thumbs = document.querySelectorAll('.retro-thumb');
        const counter = document.getElementById('retroPhotoCounter');

        slides.forEach((s, i) => {
            s.classList.toggle('active', i === index);
        });
        thumbs.forEach((t, i) => {
            t.classList.toggle('active', i === index);
        });
        if (counter) counter.textContent = `${index + 1} / ${this.selectedPhotos.length}`;
        this.kbCurrentIndex = index;
    }

    // ── Slide 2: Places with journey animation ───────────────────────────────
    _renderPlacesSlide() {
        const list = document.getElementById('retroPlacesList');
        if (!list) return;
        list.innerHTML = '';

        const placesText = (this.config && this.config.visitedPlaces) ? this.config.visitedPlaces : '';
        const allPlaces = placesText.split('\n')
                                    .map(p => p.trim())
                                    .filter(p => p)
                                    .map(name => ({ name: name, date: '' }));

        if (allPlaces.length === 0) {
            list.innerHTML = `<div class="retro-no-places"><i class="fas fa-map-marked-alt" style="font-size:2.5rem;color:rgba(180,100,255,0.3);display:block;margin-bottom:12px;"></i><p style="color:rgba(255,255,255,0.35);font-size:0.9rem;">Os lugares que vocês visitaram aparecerão aqui.</p></div>`;
            return;
        }

        const colors = ['#7c3aed', '#db2777', '#2563eb', '#059669', '#d97706', '#dc2626'];
        allPlaces.forEach((place, idx) => {
            const item = document.createElement('div');
            item.className = 'retro-place-item';
            item.style.animationDelay = `${0.4 + idx * 0.15}s`;
            const color = colors[idx % colors.length];
            item.innerHTML = `
                <div class="retro-place-pin" style="background:linear-gradient(135deg,${color},${color}bb);color:${color};">
                    <i class="fas fa-map-marker-alt"></i>
                </div>
                <div class="retro-place-info">
                    <div class="retro-place-name">${place.name}</div>
                    ${place.date ? `<div class="retro-place-date">${place.date}</div>` : ''}
                </div>
            `;
            list.appendChild(item);
        });
    }

    // ── Slide 3: Favorites with 3D flip cards ────────────────────────────────
    _renderFavoritesSlide() {
        const grid = document.getElementById('retroFavoritesGrid');
        if (!grid) return;
        const cfg = (this.config && this.config.favorites) ? this.config.favorites : {};

        const items = [
            { icon: '🎵', category: 'Música favorita', key: 'music' },
            { icon: '🎬', category: 'Filme favorito',  key: 'movie' },
            { icon: '📍', category: 'Lugar favorito',  key: 'place' },
            { icon: '🍽️', category: 'Comida favorita', key: 'food' },
            { icon: '💌', category: 'Momento favorito',key: 'moment' },
            { icon: '🎮', category: 'Rolê favorito',    key: 'activity' },
        ];

        grid.innerHTML = '';
        items.forEach((item, i) => {
            const val = cfg[item.key] || '';
            const card = document.createElement('div');
            card.className = 'retro-fav-card';
            card.style.animationDelay = `${0.3 + i * 0.1}s`;

            card.innerHTML = `
                <div class="retro-fav-card-inner">
                    <div class="retro-fav-card-front">
                        <span class="retro-fav-icon">${item.icon}</span>
                        <span class="retro-fav-category">${item.category}</span>
                        <span class="retro-fav-tap-hint">toque para revelar</span>
                    </div>
                    <div class="retro-fav-card-back">
                        <span class="retro-fav-icon">${item.icon}</span>
                        <span class="retro-fav-category">${item.category}</span>
                        <span class="retro-fav-value ${val ? '' : 'retro-fav-empty'}">${val || 'A definir...'}</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                card.classList.toggle('flipped');
            });

            grid.appendChild(card);
        });

        this._autoFlipTimeout = setTimeout(() => {
            const cards = grid.querySelectorAll('.retro-fav-card');
            cards.forEach((c, i) => {
                setTimeout(() => c.classList.add('flipped'), 600 + i * 400);
            });
        }, 1200);
    }

    _renderFinalSlide() {
        const msgEl = document.getElementById('retroFinalMessage');
        const sigEl = document.getElementById('retroFinalSignature');
        if (msgEl && this.config && this.config.finalMessage) {
            msgEl.textContent = this.config.finalMessage;
        }
        if (sigEl && this.config && this.config.signature) {
            sigEl.textContent = this.config.signature;
        }
    }

    // ── Stats Slide — Spotify Wrapped style numbers ──────────────────────────
    _renderStatsSlide() {
        const grid = document.getElementById('retroStatsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const photosCount = this.totalPhotosInYear || (this.selectedPhotos && this.selectedPhotos.length) || 0;
        const placesText = (this.config && this.config.visitedPlaces) || '';
        const placesCount = placesText.split('\n').map(p => p.trim()).filter(p => p).length;
        const milestonesCount = (this.timelineEvents && this.timelineEvents.length) || 0;
        const daysCount = Math.max(Math.floor((new Date() - this.anniversaryDate) / 86400000), 0);

        const stats = [
            { icon: '📸', number: photosCount, label: 'Fotos juntos', delay: 0.3 },
            { icon: '📍', number: placesCount, label: 'Lugares visitados', delay: 0.5 },
            { icon: '🏆', number: milestonesCount, label: 'Marcos especiais', delay: 0.7 },
            { icon: '💜', number: daysCount, label: 'Dias de amor', delay: 0.9 },
        ];

        stats.forEach(stat => {
            const card = document.createElement('div');
            card.className = 'retro-stat-card';
            card.style.animationDelay = `${stat.delay}s`;
            card.innerHTML = `
                <span class="retro-stat-icon">${stat.icon}</span>
                <span class="retro-stat-number" data-target="${stat.number}">0</span>
                <span class="retro-stat-label">${stat.label}</span>
            `;
            grid.appendChild(card);
        });

        const phrase = document.createElement('div');
        phrase.className = 'retro-stat-phrase';
        phrase.innerHTML = `<p>"Em ${daysCount} dias, cada segundo ao seu lado valeu a pena"</p>`;
        grid.appendChild(phrase);
    }

    _animateStats() {
        const numbers = document.querySelectorAll('.retro-stat-number[data-target]');
        numbers.forEach(el => {
            const target = parseInt(el.dataset.target) || 0;
            if (target === 0) { el.textContent = '0'; return; }
            let count = 0;
            const step = Math.max(Math.ceil(target / 50), 1);
            const tick = setInterval(() => {
                count = Math.min(count + step, target);
                el.textContent = count;
                if (count >= target) clearInterval(tick);
            }, 30);
        });
    }

    // ── Timeline Slide — Relationship milestones ─────────────────────────────
    _renderTimelineSlide() {
        const list = document.getElementById('retroTimelineList');
        if (!list) return;
        list.innerHTML = '';

        const milestones = this.timelineEvents || [];

        if (milestones.length === 0) {
            list.innerHTML = '<div class="retro-no-milestones"><i class="fas fa-flag" style="font-size:2rem;color:rgba(180,100,255,0.3);display:block;margin-bottom:12px;"></i><p>Os marcos do relacionamento aparecerão aqui.</p></div>';
            return;
        }

        const colors = ['#7c3aed', '#db2777', '#f59e0b', '#059669', '#2563eb', '#e879f9'];
        const icons  = ['fa-heart', 'fa-star', 'fa-gem', 'fa-bolt', 'fa-sun', 'fa-crown'];

        milestones.forEach((milestone, idx) => {
            const item = document.createElement('div');
            item.className = 'retro-timeline-item';
            // Delay escalonado para entrada sequencial elegante
            item.style.animationDelay = `${0.35 + idx * 0.14}s`;

            const color = colors[idx % colors.length];
            const icon  = icons[idx % icons.length];

            // Cor como CSS custom property para uso nos pseudo-elementos
            item.style.setProperty('--retro-dot-color', color + '80');

            item.innerHTML = `
                <div class="retro-timeline-icon-col">
                    <div class="retro-timeline-dot"
                         style="background: linear-gradient(145deg, ${color}, ${color}99);
                                --retro-dot-color: ${color}80;">
                        <i class="fas ${icon}"></i>
                    </div>
                </div>
                <div class="retro-timeline-card" style="--retro-dot-color:${color};">
                    ${milestone.date && milestone.date !== milestone.text
                        ? `<div class="retro-timeline-date">${milestone.date}</div>`
                        : ''}
                    <div class="retro-timeline-text">${milestone.text}</div>
                </div>
            `;
            list.appendChild(item);
        });
    }

    // =========================================================================


    // =========================================================================
    //  NAVEGAÇÃO DE SLIDES
    // =========================================================================
    _showSlide(index, direction = 'enter') {
        const slides = document.querySelectorAll('.retro-slide');
        if (!slides.length) return;

        slides.forEach((slide, i) => {
            slide.classList.remove('active', 'exit-left');
            if (i < index) slide.classList.add('exit-left');
        });

        const target = slides[index];
        if (target) {
            target.style.transform = direction === 'back' ? 'translateX(-80px) scale(0.96)' : 'translateX(80px) scale(0.96)';
            target.style.opacity = '0';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    target.style.transform = '';
                    target.style.opacity   = '';
                    target.classList.add('active');
                });
            });
        }

        this._updateChapterBar(index);

        if (this.navPrev) this.navPrev.disabled = index === 0;
        if (this.navNext) this.navNext.disabled = index >= slides.length - 1;

        // Transition blob colors
        if (this.slideThemes[index]) {
            this.targetThemeColors = this.slideThemes[index];
        }

        // Animate stats when entering stats slide (slide 1)
        if (index === 1) {
            setTimeout(() => this._animateStats(), 400);
        }

        // Start/stop Ken Burns based on slide (slide 2)
        if (index === 2) {
            this._startKenBurns();
        } else {
            this._stopKenBurns();
        }

        // Reset flip cards when entering favorites (slide 5)
        if (index === 5) {
            const cards = document.querySelectorAll('.retro-fav-card');
            cards.forEach(c => c.classList.remove('flipped'));
            clearTimeout(this._autoFlipTimeout);
            this._autoFlipTimeout = setTimeout(() => {
                cards.forEach((c, i) => {
                    setTimeout(() => c.classList.add('flipped'), 600 + i * 400);
                });
            }, 800);
        }

        // Confete no último slide (slide 6)
        if (index === slides.length - 1) {
            setTimeout(() => this._burstConfetti(), 800);
        }
    }

    _goNext() {
        const slides = document.querySelectorAll('.retro-slide');
        if (this.currentSlide < slides.length - 1) {
            this._blackoutTransition(() => {
                this.currentSlide++;
                this._showSlide(this.currentSlide, 'enter');
            });
        }
    }

    _goPrev() {
        if (this.currentSlide > 0) {
            this._blackoutTransition(() => {
                this.currentSlide--;
                this._showSlide(this.currentSlide, 'back');
            });
        }
    }

    // Cinematic blackout transition between slides
    _blackoutTransition(callback) {
        if (!this.blackout) { callback(); return; }
        this.blackout.classList.add('active');
        setTimeout(() => {
            callback();
            setTimeout(() => {
                this.blackout.classList.remove('active');
            }, 100);
        }, 350);
    }

    replay() {
        this.currentSlide = 0;
        document.querySelectorAll('.retro-slide').forEach(s => s.classList.remove('active', 'exit-left'));
        this._renderFavoritesSlide(); // Reset flip cards
        this._showSlide(0, 'enter');
        if (this.audioEl) {
            this.audioEl.currentTime = 0;
            this.audioEl.play().catch(() => {});
        }
    }

    // =========================================================================
    //  BARRA DE CAPÍTULOS
    // =========================================================================
    _updateChapterBar(slideIndex) {
        const segments = document.querySelectorAll('.retro-chapter-segment');
        segments.forEach((seg, i) => {
            seg.classList.remove('active', 'done');
            const fill = seg.querySelector('.retro-chapter-segment-fill');
            if (fill) fill.style.width = i <= slideIndex ? '100%' : '0%';
            if (i < slideIndex)  seg.classList.add('done');
            if (i === slideIndex) seg.classList.add('active');
        });
    }

    // =========================================================================
    //  GRADIENT BLOB BACKGROUND — Fluid Animated Background
    // =========================================================================
    _initBlobs() {
        if (!this.blobCanvas) return;
        const ctx = this.blobCanvas.getContext('2d');

        const resize = () => {
            this.blobCanvas.width  = this.modal.offsetWidth;
            this.blobCanvas.height = this.modal.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Create 4 blobs
        this.blobs = [];
        for (let i = 0; i < 4; i++) {
            this.blobs.push({
                x: Math.random() * this.blobCanvas.width,
                y: Math.random() * this.blobCanvas.height,
                r: 150 + Math.random() * 200,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                phase: Math.random() * Math.PI * 2,
                colorIdx: i % 2,
            });
        }

        const draw = (t) => {
            ctx.clearRect(0, 0, this.blobCanvas.width, this.blobCanvas.height);

            // Lerp current colors toward target
            this.currentThemeColors = this.currentThemeColors.map((color, ci) => ({
                r: color.r + (this.targetThemeColors[ci].r - color.r) * 0.02,
                g: color.g + (this.targetThemeColors[ci].g - color.g) * 0.02,
                b: color.b + (this.targetThemeColors[ci].b - color.b) * 0.02,
            }));

            // Audio reactivity: scale blob radius with bass
            const bassScale = 1 + this.audioBass * 0.3;

            this.blobs.forEach(blob => {
                blob.x += blob.vx;
                blob.y += blob.vy;
                blob.phase += 0.003;

                // Bounce off edges
                if (blob.x < -blob.r) blob.x = this.blobCanvas.width + blob.r;
                if (blob.x > this.blobCanvas.width + blob.r) blob.x = -blob.r;
                if (blob.y < -blob.r) blob.y = this.blobCanvas.height + blob.r;
                if (blob.y > this.blobCanvas.height + blob.r) blob.y = -blob.r;

                const pulsate = 1 + 0.15 * Math.sin(blob.phase);
                const radius = blob.r * pulsate * bassScale;
                const c = this.currentThemeColors[blob.colorIdx];

                const gradient = ctx.createRadialGradient(
                    blob.x, blob.y, 0,
                    blob.x, blob.y, radius
                );
                gradient.addColorStop(0, `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, 0.35)`);
                gradient.addColorStop(0.5, `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, 0.1)`);
                gradient.addColorStop(1, `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, 0)`);

                ctx.beginPath();
                ctx.arc(blob.x, blob.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
            });

            this.blobAnimId = requestAnimationFrame(draw);
        };
        this.blobAnimId = requestAnimationFrame(draw);
    }

    _stopBlobs() {
        if (this.blobAnimId) {
            cancelAnimationFrame(this.blobAnimId);
            this.blobAnimId = null;
        }
    }

    // =========================================================================
    //  AUDIO-REACTIVE STARS
    // =========================================================================
    _initStars() {
        if (!this.starsCanvas) return;
        const ctx = this.starsCanvas.getContext('2d');
        this.starsCtx = ctx;

        const resize = () => {
            this.starsCanvas.width  = this.modal.offsetWidth;
            this.starsCanvas.height = this.modal.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        this.starParticles = [];
        for (let i = 0; i < 200; i++) {
            this.starParticles.push({
                x:      Math.random() * this.starsCanvas.width,
                y:      Math.random() * this.starsCanvas.height,
                r:      Math.random() * 1.5 + 0.2,
                alpha:  Math.random(),
                speed:  Math.random() * 0.005 + 0.002,
                phase:  Math.random() * Math.PI * 2,
                drift:  (Math.random() - 0.5) * 0.15, // slow horizontal drift
            });
        }

        const draw = (t) => {
            ctx.clearRect(0, 0, this.starsCanvas.width, this.starsCanvas.height);

            // Audio reactivity: brighter stars on bass hit
            const bassBrightness = this.audioBass * 0.5;

            this.starParticles.forEach(s => {
                s.x += s.drift;
                s.y -= 0.05; // slow upward drift like rising particles

                // Wrap around
                if (s.x < 0) s.x = this.starsCanvas.width;
                if (s.x > this.starsCanvas.width) s.x = 0;
                if (s.y < 0) s.y = this.starsCanvas.height;

                const baseAlpha = 0.3 + 0.5 * Math.abs(Math.sin(s.phase + t * s.speed));
                const a = Math.min(baseAlpha + bassBrightness, 1);
                const r = s.r * (1 + bassBrightness * 0.5);

                ctx.beginPath();
                ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
                ctx.fill();
            });
            this.starsAnimId = requestAnimationFrame(draw);
        };
        this.starsAnimId = requestAnimationFrame(draw);
    }

    _stopStars() {
        if (this.starsAnimId) {
            cancelAnimationFrame(this.starsAnimId);
            this.starsAnimId = null;
        }
        if (this.starsCtx && this.starsCanvas) {
            this.starsCtx.clearRect(0, 0, this.starsCanvas.width, this.starsCanvas.height);
        }
    }

    // =========================================================================
    //  CONFETE 2.0 — Physics-based with hearts
    // =========================================================================
    _burstConfetti() {
        if (!this.confettiCanvas) return;
        const canvas = this.confettiCanvas;
        canvas.width  = this.modal.offsetWidth;
        canvas.height = this.modal.offsetHeight;
        const ctx = canvas.getContext('2d');
        const colors = ['#b47cff', '#ff5fa3', '#fff', '#ffd700', '#7c3aed', '#db2777', '#ff8fd8'];
        const particles = [];

        // Multiple burst sources
        const sources = [
            { x: canvas.width * 0.3, y: canvas.height * 0.4 },
            { x: canvas.width * 0.7, y: canvas.height * 0.4 },
            { x: canvas.width * 0.5, y: canvas.height * 0.3 },
        ];

        sources.forEach(src => {
            for (let i = 0; i < 40; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 8 + 3;
                particles.push({
                    x:    src.x,
                    y:    src.y,
                    vx:   Math.cos(angle) * speed,
                    vy:   Math.sin(angle) * speed - 5,
                    size: Math.random() * 8 + 4,
                    rot:  Math.random() * Math.PI * 2,
                    rotV: (Math.random() - 0.5) * 0.2,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    isHeart: Math.random() > 0.4,
                    gravity: 0.08 + Math.random() * 0.06,
                    drag: 0.98 + Math.random() * 0.015,
                });
            }
        });

        let frame = 0;
        const maxF = 180;
        const draw = () => {
            frame++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.vy += p.gravity;
                p.vx *= p.drag;
                p.vy *= p.drag;
                p.x  += p.vx;
                p.y  += p.vy;
                p.rot += p.rotV;
                const life = Math.max(1 - frame / maxF, 0);
                ctx.save();
                ctx.globalAlpha = life * life; // quadratic fade
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                if (p.isHeart) {
                    this._drawHeart(ctx, p.size);
                } else {
                    // Confetti ribbon
                    ctx.fillRect(-p.size / 2, -p.size / 5, p.size, p.size / 2.5);
                }
                ctx.restore();
            });
            if (frame < maxF) requestAnimationFrame(draw);
            else ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
        requestAnimationFrame(draw);
    }

    _drawHeart(ctx, size) {
        const s = size / 2;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.6);
        ctx.bezierCurveTo(-s, -s * 0.5, -s * 1.6, s * 0.6, 0, s * 1.6);
        ctx.bezierCurveTo(s * 1.6, s * 0.6, s, -s * 0.5, 0, s * 0.6);
        ctx.fill();
    }

    _stopConfetti() {
        if (this.confettiCanvas) {
            const ctx = this.confettiCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
        }
    }

    // =========================================================================
    //  MÚSICA — Audio-Reactive
    // =========================================================================
    async _startMusic() {
        if (!this.config || !this.config.musicUrl) return;

        try {
            if (this.audioEl) {
                this.audioEl.pause();
                this.audioEl.remove();
            }
            this.audioEl = new Audio(this.config.musicUrl);
            this.audioEl.loop   = true;
            this.audioEl.volume = 0;
            this.audioEl.crossOrigin = 'anonymous';

            await this.audioEl.play();
            this._fadeInAudio();
            this._initAudioReactive();

            if (this.musicTitle && this.config.musicName) {
                this.musicTitle.textContent = this.config.musicName;
            }
            if (this.musicIndicator) this.musicIndicator.style.display = 'flex';
        } catch (e) {
            console.warn('🎵 Música não pôde ser reproduzida automaticamente:', e);
            if (this.musicIndicator) {
                this.musicIndicator.style.display = 'flex';
                if (this.musicTitle) this.musicTitle.textContent = 'Toque para ativar música';
                this.musicIndicator.style.cursor = 'pointer';
                this.musicIndicator.addEventListener('click', () => {
                    if (this.audioEl) {
                        this.audioEl.play().then(() => {
                            this._fadeInAudio();
                            this._initAudioReactive();
                        });
                    }
                }, { once: true });
            }
        }
    }

    // Web Audio API — extract bass for reactivity
    _initAudioReactive() {
        try {
            if (!this.audioEl || this.audioContext) return;
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaElementSource(this.audioEl);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            this.audioDataArray = new Uint8Array(this.analyser.frequencyBinCount);

            const updateBass = () => {
                if (!this.analyser) return;
                this.analyser.getByteFrequencyData(this.audioDataArray);
                // Average of first 8 bins = bass frequencies
                let bassSum = 0;
                for (let i = 0; i < 8; i++) bassSum += this.audioDataArray[i];
                this.audioBass = (bassSum / 8) / 255; // normalize 0-1
                requestAnimationFrame(updateBass);
            };
            updateBass();
        } catch (e) {
            console.warn('Web Audio API não disponível:', e);
        }
    }

    _fadeInAudio(duration = 2000) {
        if (!this.audioEl) return;
        const target  = 0.45;
        const steps   = 40;
        const interval = duration / steps;
        const step    = target / steps;
        let vol = 0;
        const t = setInterval(() => {
            vol = Math.min(vol + step, target);
            if (this.audioEl) this.audioEl.volume = vol;
            if (vol >= target) clearInterval(t);
        }, interval);
    }

    _fadeOutAudio(cb, duration = 800) {
        if (!this.audioEl) { if (cb) cb(); return; }
        const steps    = 20;
        const interval = duration / steps;
        const step     = this.audioEl.volume / steps;
        const t = setInterval(() => {
            if (!this.audioEl) { clearInterval(t); if (cb) cb(); return; }
            this.audioEl.volume = Math.max(this.audioEl.volume - step, 0);
            if (this.audioEl.volume <= 0) { clearInterval(t); if (cb) cb(); }
        }, interval);
    }

    _toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.audioEl) this.audioEl.muted = this.isMuted;
        if (this.muteBtn) {
            this.muteBtn.innerHTML = this.isMuted
                ? '<i class="fas fa-volume-mute"></i>'
                : '<i class="fas fa-volume-up"></i>';
        }
        if (this.musicIndicator) {
            this.musicIndicator.classList.toggle('retro-music-paused', this.isMuted);
        }
    }

    // =========================================================================
    //  HELPERS
    // =========================================================================
    _wait(ms) { return new Promise(r => setTimeout(r, ms)); }

    _formatPhotoDate(dateTaken) {
        if (!dateTaken) return '';
        try {
            let dStr = dateTaken.trim();
            let d;
            if (dStr.includes('/')) {
                const parts = dStr.split('/');
                if (parts.length === 3) {
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1;
                    let year = parseInt(parts[2], 10);
                    if (year < 100) year += 2000;
                    d = new Date(year, month, day);
                }
            } else {
                d = new Date(dStr);
            }
            if (d && isNaN(d.getTime())) return dateTaken;
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return dateTaken; }
    }
}

// =========================================================================
//  ADMIN: Carregar + Salvar Config da Retrospectiva
// =========================================================================
async function initRetrospectiveAdminTab() {
    console.log('🎬 Inicializando aba Retrospectiva...');
    const saveBtn = document.getElementById('retroSaveBtn');
    if (!saveBtn) return;
    if (saveBtn.dataset.retroListenerAttached === 'true') return;
    saveBtn.dataset.retroListenerAttached = 'true';

    // Carregar config atual
    try {
        if (typeof db !== 'undefined') {
            const doc = await db.collection('retrospective_config').doc('settings').get();
            if (doc.exists) {
                _fillRetroAdminFields(doc.data());
            }
        }
    } catch (e) {
        console.error('Erro ao carregar config retrospectiva:', e);
    }

    // Carregar músicas das playlists
    await _loadPlaylistsForAdmin();

    // Botão salvar
    saveBtn.addEventListener('click', async () => {
        const originalHtml = saveBtn.innerHTML;
        saveBtn.innerHTML  = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        saveBtn.disabled   = true;

        try {
            const payload = _collectRetroAdminData();
            await db.collection('retrospective_config').doc('settings').set(payload, { merge: true });

            saveBtn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
            saveBtn.style.background = 'linear-gradient(135deg,#059669,#34d399)';
            setTimeout(() => {
                saveBtn.innerHTML = originalHtml;
                saveBtn.style.background = '';
                saveBtn.disabled = false;
            }, 2200);
        } catch (err) {
            console.error('Erro ao salvar retrospectiva:', err);
            saveBtn.innerHTML = '<i class="fas fa-times"></i> Erro ao salvar';
            saveBtn.style.background = 'linear-gradient(135deg,#dc2626,#f87171)';
            setTimeout(() => {
                saveBtn.innerHTML = originalHtml;
                saveBtn.style.background = '';
                saveBtn.disabled = false;
            }, 3000);
        }
    });
}

function _fillRetroAdminFields(data) {
    const fields = {
        'retroFinalMessageInput': data.finalMessage || '',
        'retroSignatureInput':    data.signature    || '',
        'retroFavMusic':          (data.favorites && data.favorites.music)    || '',
        'retroFavMovie':          (data.favorites && data.favorites.movie)    || '',
        'retroFavPlace':          (data.favorites && data.favorites.place)    || '',
        'retroFavFood':           (data.favorites && data.favorites.food)     || '',
        'retroFavMoment':         (data.favorites && data.favorites.moment)   || '',
        'retroFavActivity':       (data.favorites && data.favorites.activity) || '',
        'retroVisitedPlacesInput': data.visitedPlaces || ''
    };
    Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    });
}

function _collectRetroAdminData() {
    const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    return {
        finalMessage: g('retroFinalMessageInput'),
        signature:    g('retroSignatureInput'),
        favorites: {
            music:    g('retroFavMusic'),
            movie:    g('retroFavMovie'),
            place:    g('retroFavPlace'),
            food:     g('retroFavFood'),
            moment:   g('retroFavMoment'),
            activity: g('retroFavActivity'),
        },
        visitedPlaces: g('retroVisitedPlacesInput'),
        musicUrl:  _getSelectedMusicUrl(),
        musicName: _getSelectedMusicName(),
    };
}

// ── Fotos dos álbuns para seleção no admin ───────────────────────────────────
async function _loadAlbumPhotosForAdmin() {
    const grid = document.getElementById('retroAdminPhotosGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="retro-admin-loading"><i class="fas fa-spinner fa-spin"></i> Carregando fotos...</div>';

    const allPhotos = [];
    try {
        if (typeof db !== 'undefined') {
            const snap = await db.collection('albums').get();
            for (const albumDoc of snap.docs) {
                const album = albumDoc.data();
                const photoPagesSnap = await db.collection('album_photos')
                    .where('albumId', '==', albumDoc.id).get();
                const sortedPages = Array.from(photoPagesSnap.docs).sort(
                    (a, b) => (a.data().pageNumber || 0) - (b.data().pageNumber || 0)
                );
                sortedPages.forEach(pageDoc => {
                    const pageData = pageDoc.data();
                    if (pageData.photos) {
                        pageData.photos.forEach(photo => {
                            allPhotos.push({
                                url:        photo.src || photo.url || '',
                                albumTitle: album.title || '',
                                caption:    photo.description || photo.alt || '',
                                dateTaken:  photo.dateTaken || '',
                                location:   photo.location  || '',
                            });
                        });
                    }
                });
            }
        }
    } catch (e) {
        console.warn('Erro ao carregar fotos para admin:', e);
    }

    grid.innerHTML = '';

    if (allPhotos.length === 0) {
        grid.innerHTML = '<div class="retro-admin-loading" style="color:rgba(255,255,255,0.3);">Nenhuma foto encontrada nos álbuns.<br><small>Faça upload de fotos nos álbuns primeiro.</small></div>';
        return;
    }

    let savedPhotosList = [];
    try {
        if (typeof db !== 'undefined') {
            const savedPhotosDoc = await db.collection('retrospective_config').doc('photos').get();
            if (savedPhotosDoc.exists && savedPhotosDoc.data().list) {
                savedPhotosList = savedPhotosDoc.data().list;
            }
        }
    } catch (e) {}

    const preSelectedUrls = new Set(savedPhotosList.map(p => p.url || p.src || ''));
    const savedLocMap = {};
    savedPhotosList.forEach(p => { savedLocMap[p.url || p.src || ''] = p.location || ''; });

    allPhotos.forEach((photo, idx) => {
        const item = document.createElement('div');
        item.className = 'retro-admin-photo-item';

        const photoUrl  = photo.url || photo.src || '';
        const caption   = photo.caption  || photo.description || '';
        const autoLoc   = photo.location || '';
        const manualLoc = savedLocMap[photoUrl] || '';
        const displayLoc = autoLoc || manualLoc;
        const hasAutoLoc = Boolean(autoLoc);

        let dateDisplay = '';
        if (photo.dateTaken) {
            try {
                dateDisplay = new Date(photo.dateTaken).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'short', year: 'numeric'
                });
            } catch (e) { dateDisplay = photo.dateTaken; }
        }

        item.dataset.url       = photoUrl;
        item.dataset.caption   = caption;
        item.dataset.dateTaken = photo.dateTaken || '';
        item.dataset.location  = displayLoc;
        item.dataset.autoLoc   = autoLoc;

        if (preSelectedUrls.has(photoUrl)) item.classList.add('selected');

        item.innerHTML = `
            <img src="${photoUrl}" alt="${caption}" loading="lazy"
                 onerror="this.closest('.retro-admin-photo-item').remove()">
            <div class="retro-photo-check"><i class="fas fa-check"></i></div>
            <div class="retro-admin-photo-meta">
                ${dateDisplay ? `<div><i class="fas fa-calendar-alt"></i> ${dateDisplay}</div>` : ''}
                ${caption     ? `<div style="font-style:italic;opacity:.65">${caption}</div>` : ''}
            </div>
        `;

        ['img', '.retro-photo-check', '.retro-admin-photo-meta'].forEach(sel => {
            const el = item.querySelector(sel);
            if (el) el.addEventListener('click', e => {
                e.stopPropagation();
                item.classList.toggle('selected');
            });
        });

        grid.appendChild(item);
    });
}


function _getSelectedAdminPhotos() {
    const items = document.querySelectorAll('.retro-admin-photo-item.selected');
    return Array.from(items).map(item => {
        return {
            url:       item.dataset.url       || '',
            src:       item.dataset.url       || '',
            caption:   item.dataset.caption   || '',
            dateTaken: item.dataset.dateTaken || ''
        };
    });
}

// ── Playlists para escolha de música ────────────────────────────────────────────
async function _loadPlaylistsForAdmin() {
    const select = document.getElementById('retroMusicSelect');
    if (!select) return;

    select.innerHTML = '<option value="">— Sem música —</option>';

    try {
        let musicsFromPlaylists = [];

        if (typeof PlaylistManager !== 'undefined' &&
            PlaylistManager.customPlaylists &&
            PlaylistManager.customPlaylists.length > 0) {

            PlaylistManager.customPlaylists.forEach(playlist => {
                if (playlist.tracks && Array.isArray(playlist.tracks)) {
                    playlist.tracks.forEach(track => {
                        const audioUrl = track.src || track.url || track.audioUrl || '';
                        if (audioUrl) {
                            musicsFromPlaylists.push({
                                name:     track.title  || track.name || 'Música sem nome',
                                artist:   track.artist || '',
                                url:      audioUrl,
                                playlist: playlist.name || '',
                            });
                        }
                    });
                }
            });
            console.log('🎵 Retrospectiva: ' + musicsFromPlaylists.length + ' músicas do PlaylistManager');
        }

        if (musicsFromPlaylists.length === 0 && typeof db !== 'undefined') {
            const playlistsSnap = await db.collection('custom_playlists').get();

            for (const playlistDoc of playlistsSnap.docs) {
                const playlistData = playlistDoc.data();
                const tracksSnap  = await db.collection('playlist_tracks')
                    .where('playlistId', '==', playlistDoc.id).get();

                const sorted = Array.from(tracksSnap.docs).sort(
                    (a, b) => (a.data().pageNumber || 0) - (b.data().pageNumber || 0)
                );

                sorted.forEach(trackDoc => {
                    const trackData = trackDoc.data();
                    if (trackData.tracks && Array.isArray(trackData.tracks)) {
                        trackData.tracks.forEach(track => {
                            const audioUrl = track.src || track.url || track.audioUrl || '';
                            if (audioUrl) {
                                musicsFromPlaylists.push({
                                    name:     track.title  || track.name || 'Música sem nome',
                                    artist:   track.artist || '',
                                    url:      audioUrl,
                                    playlist: playlistData.name || '',
                                });
                            }
                        });
                    }
                });
            }
            console.log('🎵 Retrospectiva: ' + musicsFromPlaylists.length + ' músicas do Firebase');
        }

        if (musicsFromPlaylists.length > 0) {
            musicsFromPlaylists.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.url;
                opt.textContent = m.playlist ? `${m.name} (${m.playlist})` : m.name;
                select.appendChild(opt);
            });
        } else {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Nenhuma música encontrada nas playlists';
            opt.disabled = true;
            select.appendChild(opt);
        }

        if (typeof db !== 'undefined') {
            const doc = await db.collection('retrospective_config').doc('settings').get();
            if (doc.exists && doc.data().musicUrl) {
                select.value = doc.data().musicUrl;
            }
        }
    } catch (e) {
        console.warn('Erro ao carregar músicas para admin:', e);
    }
}

function _getSelectedMusicUrl() {
    const select = document.getElementById('retroMusicSelect');
    return select ? select.value : '';
}

function _getSelectedMusicName() {
    const select = document.getElementById('retroMusicSelect');
    if (!select || !select.value) return '';
    const opt = select.querySelector(`option[value="${select.value}"]`);
    return opt ? opt.textContent.split('(')[0].trim() : '';
}

// ── Hook nas tabs admin ──────────────────────────────────────────────────────
function hookRetrospectiveTab() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        if (tab.dataset.retroHookAttached === 'true') return;
        tab.dataset.retroHookAttached = 'true';
        tab.addEventListener('click', () => {
            if (tab.dataset.tab === 'retrospective') {
                initRetrospectiveAdminTab();
            }
        });
    });
}

// ── Inicializar ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    window.retrospective = new Retrospective();
    hookRetrospectiveTab();
});

if (document.readyState !== 'loading') {
    if (!window.retrospective) {
        window.retrospective = new Retrospective();
    }
    hookRetrospectiveTab();
}
