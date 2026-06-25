// ===== SCRATCH CARD MODAL - RASPADINHA DO AMOR (EDIÇÃO LUXO DOURADO/ROSÉ) =====

class ScratchCard {
    constructor() {
        this.modal = document.getElementById('scratchCardModal');
        this.openBtn = document.getElementById('openScratchCardBtn');
        this.closeBtn = document.getElementById('closeScratchCardBtn');
        this.canvas = document.getElementById('scratchCardCanvas');
        this.prizeText = document.getElementById('scratchCardPrizeText');
        this.wrapper = document.querySelector('.scratch-card-wrapper');
        this.ambient = document.getElementById('scratchAmbient');
        this.progressWrap = document.getElementById('scratchProgressWrap');
        this.progressFill = document.getElementById('scratchProgressFill');
        this.hint = document.getElementById('scratchHint');

        if (!this.canvas || !this.modal) return;

        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.isRevealed = false;
        this.lastPos = null;
        this.lastCheckTime = 0;

        // Tamanho do pincel (raio limpo a cada toque, em px)
        this.brushSize = 28;
        // % da área raspada necessária para revelar tudo
        this.revealThreshold = 45;

        this.init();
    }

    init() {
        if (this.openBtn) {
            this.openBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal();
            });
        }

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Fechar clicando fora do conteúdo
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

        // Mouse
        this.canvas.addEventListener('mousedown', (e) => this.startScratching(e));
        this.canvas.addEventListener('mousemove', (e) => this.scratch(e));
        this.canvas.addEventListener('mouseup', () => this.stopScratching());
        this.canvas.addEventListener('mouseleave', () => this.stopScratching());

        // Touch
        this.canvas.addEventListener('touchstart', (e) => this.startScratching(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.scratch(e), { passive: false });
        this.canvas.addEventListener('touchend', () => this.stopScratching());
    }

    async openModal() {
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Reseta o estado visual para uma raspadinha nova a cada abertura
        this.isRevealed = false;
        this.isDrawing = false;
        this.lastPos = null;
        this.lastCheckTime = 0;

        this.canvas.style.display = 'block';
        this.canvas.style.transition = 'none';
        this.canvas.style.opacity = '1';
        this.canvas.style.transform = 'scale(1)';
        // Reativa a transição no próximo frame (evita "saltar" visualmente no reset)
        requestAnimationFrame(() => {
            this.canvas.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
        });

        if (this.wrapper) this.wrapper.classList.remove('scratch-revealed');
        if (this.progressWrap) this.progressWrap.style.opacity = '1';
        if (this.progressFill) this.progressFill.style.width = '0%';
        if (this.hint) this.hint.textContent = 'Arraste para começar a raspar...';

        this.prizeText.textContent = 'Carregando surpresa...';

        this.spawnAmbient();

        // Redimensiona o canvas para o tamanho atual do cartão
        const rect = this.wrapper.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        this.fillCanvas();

        // Busca a mensagem configurada no Firebase
        try {
            if (typeof db !== 'undefined') {
                const docRef = await db.collection('scratch_card_config').doc('settings').get();
                if (docRef.exists && docRef.data().message) {
                    this.prizeText.textContent = docRef.data().message;
                } else {
                    this.prizeText.textContent = 'Vale um abraço bem apertado! ❤️';
                }
            } else {
                this.prizeText.textContent = 'Vale um abraço bem apertado! ❤️';
            }
        } catch (error) {
            console.error('Erro ao carregar raspadinha:', error);
            this.prizeText.textContent = 'Vale um beijo! 😘';
        }
    }

    closeModal() {
        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.clearAmbient();

        // Remove qualquer confete que ainda esteja na tela
        this.modal.querySelectorAll('.scratch-confetti-canvas').forEach((el) => el.remove());
    }

    /* ---------- Visual do cartão (camada dourada/rosé) ---------- */

    fillCanvas() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, w, h);

        // Fundo metálico dourado/rosé
        const gradient = ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, '#f9e4c8');
        gradient.addColorStop(0.25, '#e0b878');
        gradient.addColorStop(0.5, '#f3c6c1');
        gradient.addColorStop(0.75, '#d9a05b');
        gradient.addColorStop(1, '#f7e7c1');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Textura de metal escovado (linhas diagonais sutis)
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        for (let i = -h; i < w; i += 6) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + h, h);
            ctx.stroke();
        }
        ctx.restore();

        // Poeira de brilho espalhada
        for (let i = 0; i < 70; i++) {
            this.drawSparkleShape(
                ctx,
                Math.random() * w,
                Math.random() * h,
                Math.random() * 2.5 + 1.2,
                'rgba(255, 255, 255, 0.85)'
            );
        }

        // Corações sutis no fundo
        ctx.save();
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = '#7a4a1f';
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < 16; i++) {
            ctx.fillText('♥', Math.random() * w, Math.random() * h);
        }
        ctx.restore();

        // Vinheta para dar profundidade
        const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.72);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(70, 35, 10, 0.28)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);

        // Selo/monograma no centro
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(110, 65, 25, 0.6)';
        ctx.font = "600 16px 'Playfair Display', serif";
        ctx.fillText('K ♥ I', w / 2, h / 2 - 26);

        ctx.font = "700 21px 'Poppins', sans-serif";
        ctx.fillStyle = 'rgba(90, 55, 20, 0.68)';
        ctx.fillText('✦ RASPE AQUI ✦', w / 2, h / 2 + 8);

        ctx.font = "400 12.5px 'Poppins', sans-serif";
        ctx.fillStyle = 'rgba(90, 55, 20, 0.48)';
        ctx.fillText('para revelar sua surpresa', w / 2, h / 2 + 33);
    }

    drawSparkleShape(ctx, x, y, size, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.quadraticCurveTo(size * 0.25, -size * 0.25, size, 0);
        ctx.quadraticCurveTo(size * 0.25, size * 0.25, 0, size);
        ctx.quadraticCurveTo(-size * 0.25, size * 0.25, -size, 0);
        ctx.quadraticCurveTo(-size * 0.25, -size * 0.25, 0, -size);
        ctx.fill();
        ctx.restore();
    }

    /* ---------- Mecânica de raspar ---------- */

    getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    startScratching(e) {
        if (this.isRevealed) return;
        this.isDrawing = true;
        this.lastPos = null;
        this.scratch(e);
    }

    stopScratching() {
        this.isDrawing = false;
        this.lastPos = null;
    }

    scratch(e) {
        if (!this.isDrawing || this.isRevealed) return;

        if (e.cancelable) {
            e.preventDefault(); // Evita rolar a página durante o toque
        }

        const pos = this.getPointerPos(e);

        this.ctx.globalCompositeOperation = 'destination-out';
        if (this.lastPos) {
            // Preenche o traço entre o ponto anterior e o atual (evita "buracos" em gestos rápidos)
            this.scratchLine(this.lastPos, pos);
        } else {
            this.stampBrush(pos.x, pos.y);
        }
        this.lastPos = pos;

        this.spawnSparkleTrail(pos.x, pos.y);

        // Vibração sutil em telas touch
        if (e.touches && navigator.vibrate && Math.random() > 0.8) {
            navigator.vibrate(8);
        }

        // Throttle por tempo (não por contagem) para performance estável em qualquer dispositivo
        const now = Date.now();
        if (now - this.lastCheckTime > 80) {
            this.lastCheckTime = now;
            this.checkReveal();
        }
    }

    scratchLine(from, to) {
        const dist = Math.hypot(to.x - from.x, to.y - from.y);
        const steps = Math.max(1, Math.floor(dist / (this.brushSize / 3)));
        for (let i = 0; i <= steps; i++) {
            const x = from.x + (to.x - from.x) * (i / steps);
            const y = from.y + (to.y - from.y) * (i / steps);
            this.stampBrush(x, y);
        }
    }

    stampBrush(x, y) {
        // Pincel com borda suave (gradiente radial) em vez de um círculo "duro"
        const ctx = this.ctx;
        const r = this.brushSize;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(0.7, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    spawnSparkleTrail(x, y) {
        if (!this.wrapper || Math.random() > 0.45) return;

        const span = document.createElement('span');
        span.className = 'scratch-sparkle-particle';
        span.textContent = Math.random() > 0.5 ? '✦' : '✨';
        span.style.left = x + 'px';
        span.style.top = y + 'px';
        span.style.color = Math.random() > 0.5 ? '#fff3d6' : '#ffd9c2';
        this.wrapper.appendChild(span);

        setTimeout(() => span.remove(), 700);
    }

    /* ---------- Progresso e revelação ---------- */

    checkReveal() {
        const ctx = this.ctx;
        const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;
        let transparentPixels = 0;

        // Checa 1 em cada 16 pixels (canal alfa) para economizar CPU
        for (let i = 3; i < pixels.length; i += 64) {
            if (pixels[i] < 50) transparentPixels++;
        }

        const totalSamplePixels = pixels.length / 64;
        const percentCleared = (transparentPixels / totalSamplePixels) * 100;

        this.updateProgress(percentCleared);

        if (percentCleared > this.revealThreshold) {
            this.revealAll();
        }
    }

    updateProgress(percent) {
        if (this.progressFill) {
            const visual = Math.min((percent / this.revealThreshold) * 100, 100);
            this.progressFill.style.width = visual + '%';
        }

        if (this.hint) {
            if (percent < 12) {
                this.hint.textContent = 'Arraste para começar a raspar...';
            } else if (percent < 28) {
                this.hint.textContent = 'Isso, continue raspando...';
            } else {
                this.hint.textContent = 'Quase lá... mais um pouquinho ✨';
            }
        }
    }

    revealAll() {
        if (this.isRevealed) return;
        this.isRevealed = true;
        this.isDrawing = false;
        this.lastPos = null;

        if (this.progressWrap) this.progressWrap.style.opacity = '0';

        // A folha dourada se dissolve com um leve "zoom"
        this.canvas.style.opacity = '0';
        this.canvas.style.transform = 'scale(1.12)';

        if (this.wrapper) this.wrapper.classList.add('scratch-revealed');

        this.burstConfetti();

        if (navigator.vibrate) {
            navigator.vibrate([15, 40, 15]);
        }

        setTimeout(() => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.canvas.style.display = 'none';
        }, 950);
    }

    /* ---------- Confete de corações/brilhos dourados (sem depender de lib externa) ---------- */

    burstConfetti() {
        if (!this.modal || !this.wrapper) return;

        const rect = this.modal.getBoundingClientRect();
        const canvas = document.createElement('canvas');
        canvas.className = 'scratch-confetti-canvas';
        canvas.width = rect.width;
        canvas.height = rect.height;
        this.modal.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const colors = ['#f7c873', '#e8b4b8', '#fff3d6', '#d9a05b', '#ffffff'];
        const wrapperRect = this.wrapper.getBoundingClientRect();
        const originX = wrapperRect.left - rect.left + wrapperRect.width / 2;
        const originY = wrapperRect.top - rect.top + wrapperRect.height / 2;

        const particles = [];
        for (let i = 0; i < 80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 7 + 3;
            particles.push({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 5,
                size: Math.random() * 9 + 7,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.3,
                color: colors[Math.floor(Math.random() * colors.length)],
                isHeart: Math.random() > 0.4
            });
        }

        let frame = 0;
        const maxFrames = 130;

        const draw = () => {
            frame++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p) => {
                p.vy += 0.12; // gravidade
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotSpeed;
                const life = Math.max(1 - frame / maxFrames, 0);

                ctx.save();
                ctx.globalAlpha = life;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                if (p.isHeart) {
                    this.drawHeartShape(ctx, p.size);
                } else {
                    this.drawSparkleShape(ctx, 0, 0, p.size * 0.6, p.color);
                }
                ctx.restore();
            });

            if (frame < maxFrames) {
                requestAnimationFrame(draw);
            } else {
                canvas.remove();
            }
        };

        requestAnimationFrame(draw);
    }

    drawHeartShape(ctx, size) {
        const s = size / 2;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.6);
        ctx.bezierCurveTo(-s, -s * 0.5, -s * 1.6, s * 0.6, 0, s * 1.6);
        ctx.bezierCurveTo(s * 1.6, s * 0.6, s, -s * 0.5, 0, s * 0.6);
        ctx.fill();
    }

    /* ---------- Partículas ambiente de fundo (enquanto o modal está aberto) ---------- */

    spawnAmbient() {
        if (!this.ambient) return;
        this.ambient.innerHTML = '';

        const symbols = ['♥', '✦', '✨', '♥'];
        for (let i = 0; i < 16; i++) {
            const el = document.createElement('span');
            el.className = 'scratch-ambient-item';
            el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            el.style.left = Math.random() * 100 + '%';
            el.style.fontSize = (Math.random() * 14 + 10) + 'px';
            el.style.animationDuration = (Math.random() * 6 + 7) + 's';
            el.style.animationDelay = (Math.random() * 6) + 's';
            el.style.setProperty('--drift', (Math.random() * 60 - 30) + 'px');
            this.ambient.appendChild(el);
        }
    }

    clearAmbient() {
        // Para as partículas quando o modal fecha (evita gasto de CPU em segundo plano)
        if (this.ambient) this.ambient.innerHTML = '';
    }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.scratchCard = new ScratchCard();
});