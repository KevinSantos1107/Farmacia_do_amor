// ===== RETROSPECTIVA DO ANO — MÓDULO PRINCIPAL =====
// Data do aniversário: 27/10/2025
// Abre automaticamente todo dia 27/10 e pode ser acessada manualmente pelo menu

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
        this.confettiCanvas = document.getElementById('retroConfettiCanvas');
        this.navPrev        = document.getElementById('retroNavPrev');
        this.navNext        = document.getElementById('retroNavNext');
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
        this.config          = null;     // dados do Firebase
        this.selectedPhotos  = [];       // fotos escolhidas para a retrospectiva
        this.currentSlide    = 0;
        this.totalSlides     = 5;       // intro, fotos, lugares, favoritos, final
        this.isPlaying       = true;
        // Auto-advance desativado — usuário navega manualmente
        this.autoAdvanceTimer= null;
        this.isMuted         = false;
        this.audioEl         = null;
        this.starsCtx        = null;
        this.starsAnimId     = null;
        this.starParticles   = [];
        this.touchStartX     = 0;
        this.touchStartY     = 0;

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

        // Chave de localStorage para garantir que abre só uma vez por dia
        const todayKey = `retro_opened_${now.toISOString().slice(0, 10)}`;

        if (isAnniversary && !localStorage.getItem(todayKey)) {
            // Pequeno delay para garantir que o site já carregou
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

        // Fechar com Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display !== 'none') this.closeModal();
            if (e.key === 'ArrowRight' && this.modal.style.display !== 'none') this._goNext();
            if (e.key === 'ArrowLeft'  && this.modal.style.display !== 'none') this._goPrev();
        });

        if (this.startBtn)  this.startBtn.addEventListener('click', () => this._startSlides());
        if (this.navNext)   this.navNext.addEventListener('click', () => this._goNext());
        if (this.navPrev)   this.navPrev.addEventListener('click', () => this._goPrev());
        if (this.muteBtn)   this.muteBtn.addEventListener('click', () => this._toggleMute());

        // Swipe mobile
        if (this.slidesContainer) {
            this.slidesContainer.addEventListener('touchstart', (e) => {
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
            }, { passive: true });

            this.slidesContainer.addEventListener('touchend', (e) => {
                const dx = e.changedTouches[0].clientX - this.touchStartX;
                const dy = e.changedTouches[0].clientY - this.touchStartY;
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
                    dx < 0 ? this._goNext() : this._goPrev();
                }
            }, { passive: true });
        }
    }

    // =========================================================================
    //  ABRIR / FECHAR MODAL
    // =========================================================================
    async openModal() {
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Resetar estado
        this.currentSlide = 0;
        this._stopStars();
        if (this.audioEl) { this.audioEl.pause(); this.audioEl.currentTime = 0; }

        // Calcular dias juntos
        this._updateDaysCounter();

        // Iniciar estrelas de fundo
        this._initStars();

        // Verificar se o aniversário de 1 ano já passou (27/10/2026)
        // Usando ano, mês (0-indexado, 9=Out), dia para evitar bugs no Safari
        const firstAnniversary = new Date(2026, 9, 27, 0, 0, 0);
        const now = new Date();

        // Verificar desbloqueio por qualquer um dos métodos de dev/teste
        const devByURL       = new URLSearchParams(window.location.search).get('retroTest') === '1';
        const devByStorage   = localStorage.getItem('retroDevMode') === '1';
        const isUnlocked     = RETRO_DEV_MODE || devByURL || devByStorage || now >= firstAnniversary;

        if (isUnlocked) {
            console.info('🔓 Retrospectiva liberada. Motivo:', 
                RETRO_DEV_MODE ? 'RETRO_DEV_MODE=true' : 
                devByURL ? 'URL retroTest=1' : 
                devByStorage ? 'localStorage retroDevMode=1' : 'Data alcançada');
        }

        // Mostrar tela correta
        if (this.lockedScreen) this.lockedScreen.style.display = 'none';
        if (this.introScreen)  this.introScreen.style.display = 'flex';
        if (this.slidesContainer) {
            this.slidesContainer.classList.remove('active');
        }

        // Se não atingiu 1 ano ainda, mostrar tela de espera
        if (!isUnlocked) {
            this._showLockedScreen(firstAnniversary, now);
            return;
        }

        // Carregar config do Firebase em background
        this._loadConfig();
    }

    closeModal() {
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        this._stopStars();
        this._stopConfetti();

        if (this.audioEl) {
            this._fadeOutAudio(() => {
                this.audioEl.pause();
                this.audioEl.currentTime = 0;
            });
        }

        // Resetar slides
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
    //  TELA DE BLOQUEIO (antes do 1º aniversário)
    // =========================================================================
    _showLockedScreen(targetDate, now) {
        if (this.introScreen) this.introScreen.style.display = 'none';
        if (this.lockedScreen) this.lockedScreen.style.display = 'flex';

        // Countdown até 27/10/2026
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
    //  DIAS JUNTOS
    // =========================================================================
    _updateDaysCounter() {
        if (!this.daysNumberEl) return;
        const now  = new Date();
        const diff = Math.floor((now - this.anniversaryDate) / 86400000);
        // Animação de contagem
        let count = 0;
        const target = Math.max(diff, 0);
        const step = Math.ceil(target / 60);
        const tick = setInterval(() => {
            count = Math.min(count + step, target);
            this.daysNumberEl.textContent = count;
            if (count >= target) clearInterval(tick);
        }, 24);
    }

    // =========================================================================
    //  FIREBASE — CARREGAR CONFIG
    // =========================================================================
    async _loadConfig() {
        try {
            if (typeof db === 'undefined') return;
            const doc = await db.collection('retrospective_config').doc('settings').get();
            if (doc.exists) {
                this.config = doc.data();
            }
            // Carregar fotos selecionadas
            const photosSnap = await db.collection('retrospective_config').doc('photos').get();
            if (photosSnap.exists && photosSnap.data().list) {
                this.selectedPhotos = photosSnap.data().list;
            }
        } catch (e) {
            console.warn('⚠️ Retrospectiva: erro ao carregar config', e);
        }
    }

    // =========================================================================
    //  INICIAR SLIDES
    // =========================================================================
    async _startSlides() {
        // Fade out da intro
        if (this.introScreen) {
            this.introScreen.classList.add('fade-out');
            await this._wait(1200);
            this.introScreen.style.display = 'none';
        }

        // Mostrar container de slides
        if (this.slidesContainer) {
            this.slidesContainer.classList.add('active');
        }

        // Renderizar slides com os dados carregados
        this._renderSlides();

        // Iniciar música
        this._startMusic();

        // Ir para o slide 0
        this.currentSlide = 0;
        this._showSlide(0, 'enter');
    }

    // =========================================================================
    //  RENDERIZAR SLIDES DINAMICAMENTE
    // =========================================================================
    _renderSlides() {
        const cfg = this.config || {};

        // --- Slide 0: Bem-vindo (já no HTML, só atualiza conteúdo dinâmico) ---
        // --- Slide 1: Fotos ---
        this._renderPhotosSlide();
        // --- Slide 2: Lugares ---
        this._renderPlacesSlide();
        // --- Slide 3: Favoritos ---
        this._renderFavoritesSlide();
        // --- Slide 4: Mensagem Final ---
        this._renderFinalSlide();
    }

    _renderPhotosSlide() {
        const grid = document.getElementById('retroPhotosGrid');
        if (!grid) return;
        grid.innerHTML = '';

        if (!this.selectedPhotos || this.selectedPhotos.length === 0) {
            grid.innerHTML = `<div class="retro-no-photos"><i class="fas fa-camera-retro"></i><p>As fotos aparecerão aqui depois de configuradas no painel admin.</p></div>`;
            return;
        }

        this.selectedPhotos.forEach((photo, idx) => {
            const card = document.createElement('div');
            card.className = 'retro-photo-card';
            card.style.animationDelay = `${idx * 0.07}s`;

            // Campos reais do Firebase: src, description, timestamp, location (manual)
            const photoUrl  = photo.url || photo.src || '';
            const caption   = photo.caption || photo.description || '';
            const dateTaken = photo.dateTaken || photo.timestamp || '';
            const locStr    = photo.location || '';

            const img = document.createElement('img');
            img.src = photoUrl;
            img.alt = caption || `Foto ${idx + 1}`;
            img.loading = 'lazy';
            img.onerror = () => card.remove();

            const meta = document.createElement('div');
            meta.className = 'retro-photo-meta';

            const dateStr = dateTaken ? this._formatPhotoDate(dateTaken) : '';

            meta.innerHTML = `
                ${dateStr ? `<span class="retro-photo-meta-date"><i class="fas fa-calendar-alt"></i> ${dateStr}</span>` : ''}
                ${locStr  ? `<span class="retro-photo-meta-location"><i class="fas fa-map-marker-alt"></i> ${locStr}</span>` : ''}
                ${caption && !dateStr && !locStr ? `<span class="retro-photo-meta-date">${caption}</span>` : ''}
            `;

            card.appendChild(img);
            if (dateStr || locStr || (caption && !dateStr && !locStr)) card.appendChild(meta);

            // Lightbox ao clicar
            card.addEventListener('click', () => this._openLightbox({...photo, url: photoUrl, caption}, dateStr, locStr));
            grid.appendChild(card);
        });
    }

    _renderPlacesSlide() {
        const list = document.getElementById('retroPlacesList');
        if (!list) return;
        list.innerHTML = '';

        // Extrair lugares únicos das fotos selecionadas
        const placesFromPhotos = [];
        if (this.selectedPhotos && this.selectedPhotos.length > 0) {
            const seen = new Set();
            this.selectedPhotos.forEach(p => {
                if (p.location && !seen.has(p.location)) {
                    seen.add(p.location);
                    placesFromPhotos.push({
                        name: p.location,
                        date: p.dateTaken ? this._formatPhotoDate(p.dateTaken) : ''
                    });
                }
            });
        }

        // Lugares extras configurados no admin
        const extraPlaces = (this.config && this.config.places) ? this.config.places : [];
        const allPlaces   = [...placesFromPhotos, ...extraPlaces];

        if (allPlaces.length === 0) {
            list.innerHTML = `<div class="retro-no-places"><i class="fas fa-map-marked-alt" style="font-size:2.5rem;color:rgba(180,100,255,0.3);display:block;margin-bottom:12px;"></i><p style="color:rgba(255,255,255,0.35);font-size:0.9rem;">Os lugares aparecerão aqui com base nas fotos adicionadas.</p></div>`;
            return;
        }

        const colors = ['#7c3aed', '#db2777', '#2563eb', '#059669', '#d97706'];
        allPlaces.forEach((place, idx) => {
            const item = document.createElement('div');
            item.className = 'retro-place-item';
            item.style.animationDelay = `${0.3 + idx * 0.12}s`;
            const color = colors[idx % colors.length];
            item.innerHTML = `
                <div class="retro-place-pin" style="background:linear-gradient(135deg,${color},${color}99);">
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
            card.style.animationDelay = `${0.2 + i * 0.08}s`;
            card.innerHTML = `
                <span class="retro-fav-icon">${item.icon}</span>
                <span class="retro-fav-category">${item.category}</span>
                <span class="retro-fav-value ${val ? '' : 'retro-fav-empty'}">${val || 'A definir...'}</span>
            `;
            grid.appendChild(card);
        });
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

    // =========================================================================
    //  LIGHTBOX DE FOTO
    // =========================================================================
    _openLightbox(photo, dateStr, locStr) {
        const lb = document.createElement('div');
        lb.className = 'retro-photo-lightbox';
        lb.innerHTML = `
            <button class="retro-lightbox-close" id="retroLbClose"><i class="fas fa-times"></i></button>
            <img src="${photo.url || photo.src || ''}" alt="${photo.caption || ''}">
            <div class="retro-lightbox-info">
                ${dateStr ? `<div>${dateStr}</div>` : ''}
                ${locStr  ? `<div><i class="fas fa-map-marker-alt"></i> ${locStr}</div>` : ''}
                ${photo.caption ? `<div style="margin-top:4px;font-style:italic;opacity:0.6">${photo.caption}</div>` : ''}
            </div>
        `;
        document.body.appendChild(lb);
        lb.querySelector('#retroLbClose').addEventListener('click', () => lb.remove());
        lb.addEventListener('click', (e) => { if (e.target === lb) lb.remove(); });
    }

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
            // Reset animação de entrada
            target.style.transform = direction === 'back' ? 'translateX(-60px)' : 'translateX(60px)';
            target.style.opacity = '0';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    target.style.transform = '';
                    target.style.opacity   = '';
                    target.classList.add('active');
                });
            });
        }

        // Atualizar barra de capítulos
        this._updateChapterBar(index);

        // Atualizar botões de navegação
        if (this.navPrev) this.navPrev.disabled = index === 0;
        if (this.navNext) this.navNext.disabled = index >= slides.length - 1;

        // Confete no último slide
        if (index === slides.length - 1) {
            setTimeout(() => this._burstConfetti(), 800);
        }
    }

    _goNext() {
        const slides = document.querySelectorAll('.retro-slide');
        if (this.currentSlide < slides.length - 1) {
            this.currentSlide++;
            this._showSlide(this.currentSlide, 'enter');
        }
    }

    _goPrev() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this._showSlide(this.currentSlide, 'back');
        }
    }

    replay() {
        this.currentSlide = 0;
        document.querySelectorAll('.retro-slide').forEach(s => s.classList.remove('active', 'exit-left'));
        this._showSlide(0, 'enter');
        if (this.audioEl) {
            this.audioEl.currentTime = 0;
            this.audioEl.play().catch(() => {});
        }
    }

    // =========================================================================
    //  BARRA DE CAPÍTULOS (estática — preenchida ao avançar)
    // =========================================================================
    _updateChapterBar(slideIndex) {
        const segments = document.querySelectorAll('.retro-chapter-segment');
        segments.forEach((seg, i) => {
            seg.classList.remove('active', 'done');
            const fill = seg.querySelector('.retro-chapter-segment-fill');
            // Segmentos passados: cheios. Atual: parcialmente cheio via CSS. Futuros: vazios.
            if (fill) fill.style.width = i <= slideIndex ? '100%' : '0%';
            if (i < slideIndex)  seg.classList.add('done');
            if (i === slideIndex) seg.classList.add('active');
        });
    }

    // =========================================================================
    //  ESTRELAS DE FUNDO
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
        for (let i = 0; i < 180; i++) {
            this.starParticles.push({
                x:      Math.random() * this.starsCanvas.width,
                y:      Math.random() * this.starsCanvas.height,
                r:      Math.random() * 1.4 + 0.3,
                alpha:  Math.random(),
                speed:  Math.random() * 0.006 + 0.002,
                phase:  Math.random() * Math.PI * 2
            });
        }

        const draw = (t) => {
            ctx.clearRect(0, 0, this.starsCanvas.width, this.starsCanvas.height);
            this.starParticles.forEach(s => {
                const a = 0.3 + 0.7 * Math.abs(Math.sin(s.phase + t * s.speed));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
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
    //  CONFETE NO SLIDE FINAL
    // =========================================================================
    _burstConfetti() {
        if (!this.confettiCanvas) return;
        const canvas = this.confettiCanvas;
        canvas.width  = this.modal.offsetWidth;
        canvas.height = this.modal.offsetHeight;
        const ctx = canvas.getContext('2d');
        const colors = ['#b47cff', '#ff5fa3', '#fff', '#ffd700', '#7c3aed'];
        const particles = [];

        for (let i = 0; i < 90; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2;
            particles.push({
                x:   canvas.width / 2,
                y:   canvas.height / 2,
                vx:  Math.cos(angle) * speed,
                vy:  Math.sin(angle) * speed - 4,
                size: Math.random() * 8 + 5,
                rot:  Math.random() * Math.PI * 2,
                rotV: (Math.random() - 0.5) * 0.25,
                color: colors[Math.floor(Math.random() * colors.length)],
                isHeart: Math.random() > 0.45
            });
        }

        let frame = 0;
        const maxF = 140;
        const draw = () => {
            frame++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.vy += 0.14;
                p.x  += p.vx;
                p.y  += p.vy;
                p.rot+= p.rotV;
                const life = Math.max(1 - frame / maxF, 0);
                ctx.save();
                ctx.globalAlpha = life;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                if (p.isHeart) {
                    this._drawHeart(ctx, p.size);
                } else {
                    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
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
    //  MÚSICA DE FUNDO
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

            // Fade in suave
            this._fadeInAudio();

            // Indicador de música
            if (this.musicTitle && this.config.musicName) {
                this.musicTitle.textContent = this.config.musicName;
            }
            if (this.musicIndicator) this.musicIndicator.style.display = 'flex';
        } catch (e) {
            console.warn('🎵 Música não pôde ser reproduzida automaticamente:', e);
            // Mostra botão discreto para o usuário iniciar manualmente
            if (this.musicIndicator) {
                this.musicIndicator.style.display = 'flex';
                if (this.musicTitle) this.musicTitle.textContent = 'Toque para ativar música';
                this.musicIndicator.style.cursor = 'pointer';
                this.musicIndicator.addEventListener('click', () => {
                    if (this.audioEl) this.audioEl.play().then(() => this._fadeInAudio());
                }, { once: true });
            }
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
            const d = new Date(dateTaken);
            if (isNaN(d)) return dateTaken;
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
                const d = doc.data();
                _fillRetroAdminFields(d);
            }
            // Fotos selecionadas
            const photosDoc = await db.collection('retrospective_config').doc('photos').get();
            if (photosDoc.exists && photosDoc.data().list) {
                window._retroSelectedPhotos = photosDoc.data().list.map(p => p.url || p.src);
            }
        }
    } catch (e) {
        console.error('Erro ao carregar config retrospectiva:', e);
    }

    // Carregar grid de fotos dos álbuns
    await _loadAlbumPhotosForAdmin();

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

            // Salvar fotos selecionadas
            const selected = _getSelectedAdminPhotos();
            await db.collection('retrospective_config').doc('photos').set({ list: selected }, { merge: false });

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
            // Sempre busca do Firebase para ter os campos mais atualizados (dateTaken, location do EXIF)
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
                                location:   photo.location  || '',  // vem do EXIF salvo no upload
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

    // Buscar localizações salvas anteriormente nas fotos selecionadas
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
    // Mapa url → localização manual salva anteriormente
    const savedLocMap = {};
    savedPhotosList.forEach(p => { savedLocMap[p.url || p.src || ''] = p.location || ''; });

    allPhotos.forEach((photo, idx) => {
        const item = document.createElement('div');
        item.className = 'retro-admin-photo-item';

        const photoUrl  = photo.url || photo.src || '';
        const caption   = photo.caption  || photo.description || '';
        const autoLoc   = photo.location || '';   // localização automática do EXIF
        const manualLoc = savedLocMap[photoUrl] || ''; // localização salva manualmente
        // Prioridade: EXIF automático > manual salvo anteriormente
        const displayLoc = autoLoc || manualLoc;
        const hasAutoLoc = Boolean(autoLoc);

        // Data formatada
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
        item.dataset.autoLoc   = autoLoc;   // para distinguir ao salvar

        if (preSelectedUrls.has(photoUrl)) item.classList.add('selected');

        // Badge de localização: automática (verde + cadeado) ou manual (roxa + editável)
        const locBadge = hasAutoLoc
            ? `<div class="retro-admin-loc-badge retro-admin-loc-auto" title="Localização detectada automaticamente pelo GPS da foto">
                   <i class="fas fa-map-marker-alt"></i> ${autoLoc}
                   <i class="fas fa-lock" style="opacity:.5;font-size:.55em;margin-left:3px;"></i>
               </div>`
            : `<div class="retro-admin-location-wrap">
                   <input
                       type="text"
                       class="retro-admin-location-input"
                       placeholder="📍 Local (ex: Parque Estadual)"
                       value="${manualLoc}"
                       title="Digite o local onde essa foto foi tirada"
                   >
               </div>`;

        item.innerHTML = `
            <img src="${photoUrl}" alt="${caption}" loading="lazy"
                 onerror="this.closest('.retro-admin-photo-item').remove()">
            <div class="retro-photo-check"><i class="fas fa-check"></i></div>
            <div class="retro-admin-photo-meta">
                ${dateDisplay ? `<div><i class="fas fa-calendar-alt"></i> ${dateDisplay}</div>` : ''}
                ${caption     ? `<div style="font-style:italic;opacity:.65">${caption}</div>` : ''}
            </div>
            ${locBadge}
        `;

        // Clicar na foto/check/meta = selecionar
        ['img', '.retro-photo-check', '.retro-admin-photo-meta'].forEach(sel => {
            const el = item.querySelector(sel);
            if (el) el.addEventListener('click', e => {
                e.stopPropagation();
                item.classList.toggle('selected');
            });
        });

        // Input manual não propaga toggle + atualiza dataset
        const locInput = item.querySelector('.retro-admin-location-input');
        if (locInput) {
            locInput.addEventListener('click', e => e.stopPropagation());
            locInput.addEventListener('input', () => {
                item.dataset.location = locInput.value;
            });
        }

        grid.appendChild(item);
    });
}


function _getSelectedAdminPhotos() {
    const items = document.querySelectorAll('.retro-admin-photo-item.selected');
    return Array.from(items).map(item => {
        const locInput = item.querySelector('.retro-admin-location-input');
        return {
            url:       item.dataset.url       || '',
            src:       item.dataset.url       || '',  // alias para compatibilidade
            caption:   item.dataset.caption   || '',
            dateTaken: item.dataset.dateTaken || '',
            location:  locInput ? locInput.value.trim() : (item.dataset.location || ''),
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

        // Atalho: PlaylistManager já carregou as playlists em memória
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

        // Fallback: buscar direto do Firebase com as coleções corretas
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

        // Popular o <select>
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

        // Restaurar seleção salva
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
