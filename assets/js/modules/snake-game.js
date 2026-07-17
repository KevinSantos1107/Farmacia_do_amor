// ===== SNAKE GAME — TEMÁTICO KEVIN & IARA =====
// Coleta itens do tema atual: meteoro, coração, flocos ou aurora

class SnakeGame {
    constructor() {
        this.modal      = document.getElementById('snakeGameModal');
        this.openBtn    = document.getElementById('openSnakeGameBtn');
        this.closeBtn   = document.getElementById('closeSnakeGameBtn');
        this.canvas     = document.getElementById('snakeCanvas');
        this.startBtn   = document.getElementById('snakeStartBtn');
        this.restartBtn = document.getElementById('snakeRestartBtn');
        this.scoreEl    = document.getElementById('snakeScore');
        this.highEl     = document.getElementById('snakeHigh');
        this.finalEl    = document.getElementById('snakeFinalScore');
        this.levelEl    = document.getElementById('snakeLevel');
        this.overlayStart  = document.getElementById('snakeOverlayStart');
        this.overlayEnd    = document.getElementById('snakeOverlayEnd');

        if (!this.modal || !this.canvas) return;

        this.ctx    = this.canvas.getContext('2d');
        this.CELL   = 20;
        this.COLS   = 0;
        this.ROWS   = 0;

        // Estado do jogo
        this.snake      = [];
        this.dir        = { x: 1, y: 0 };
        this.nextDir    = { x: 1, y: 0 };
        this.food       = null;
        this.bonus      = null;    // item bônus aparece ocasionalmente
        this.score      = 0;
        this.highScore  = parseInt(localStorage.getItem('snakeHighScore') || '0');
        this.level      = 1;
        this.running    = false;
        this.loopId     = null;
        this.bonusTimer = null;

        // Emojis por tema
        this.themeItems = {
            meteors : { food: '☄️', bonus: '💫', snake: '#8a2be2', head: '#00ffff' },
            hearts  : { food: '❤️', bonus: '💛', snake: '#ff0055', head: '#ff66b2' },
            aurora  : { food: '🌿', bonus: '💜', snake: '#00ffaa', head: '#00ccff' },
            winter  : { food: '❄️', bonus: '⭐', snake: '#00f2fe', head: '#ffffff' }
        };

        this.bindEvents();
        this.updateHighScore();
    }

    /* ──────── TEMA ATUAL ──────── */
    getTheme() {
        const t = document.documentElement.getAttribute('data-theme') || 'meteors';
        return this.themeItems[t] || this.themeItems['meteors'];
    }

    /* ──────── BIND ──────── */
    bindEvents() {
        // Abrir modal
        this.openBtn?.addEventListener('click', () => this.openModal());

        // Fechar modal
        this.closeBtn?.addEventListener('click', () => this.closeModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

        // Botões do jogo
        this.startBtn?.addEventListener('click', () => this.startGame());
        this.restartBtn?.addEventListener('click', () => this.startGame());

        // Teclado
        document.addEventListener('keydown', (e) => {
            if (!this.modal || this.modal.style.display === 'none') return;
            this.handleKey(e.key);
        });

        // Controles mobile (swipe)
        this.bindSwipe();

        // Botões direcionais na tela — removidos (swipe + teclado)
    }

    bindSwipe() {
        let sx = 0, sy = 0;
        this.canvas.addEventListener('touchstart', e => {
            sx = e.touches[0].clientX;
            sy = e.touches[0].clientY;
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - sx;
            const dy = e.changedTouches[0].clientY - sy;
            if (Math.abs(dx) > Math.abs(dy)) {
                this.handleKey(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
            } else {
                this.handleKey(dy > 0 ? 'ArrowDown' : 'ArrowUp');
            }
            e.preventDefault();
        }, { passive: false });
    }

    handleKey(key) {
        if (!this.running) return;
        const map = {
            'ArrowUp':    { x: 0, y: -1 },
            'ArrowDown':  { x: 0, y: 1  },
            'ArrowLeft':  { x: -1, y: 0 },
            'ArrowRight': { x: 1, y: 0  },
            'w': { x: 0, y: -1 },
            's': { x: 0, y: 1  },
            'a': { x: -1, y: 0 },
            'd': { x: 1, y: 0  },
        };
        const d = map[key];
        if (!d) return;
        // Não permite inverter direção
        if (d.x === -this.dir.x && d.y === -this.dir.y) return;
        this.nextDir = d;
    }

    /* ──────── MODAL ──────── */
    openModal() {
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (typeof HistoryManager !== 'undefined') {
            HistoryManager.push('snake-game-modal');
        }
        this.resizeCanvas();
        this.drawIdle();
        this.updateHighScore();
        this.updateLegend();
    }

    closeModal() {
        this.stopGame();
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        if (typeof HistoryManager !== 'undefined') {
            HistoryManager.remove('snake-game-modal');
        }
    }

    updateLegend() {
        const theme = this.getTheme();
        const foodEl  = document.getElementById('snakeLegendFood');
        const bonusEl = document.getElementById('snakeLegendBonus');
        if (foodEl)  foodEl.textContent  = theme.food;
        if (bonusEl) bonusEl.textContent = theme.bonus;
    }

    /* ──────── CANVAS ──────── */
    resizeCanvas() {
        const wrapper = this.canvas.parentElement;
        const size = Math.min(wrapper.clientWidth, wrapper.clientHeight, 360);
        // Garante múltiplo do CELL
        const cells = Math.floor(size / this.CELL);
        const px = cells * this.CELL;
        this.canvas.width  = px;
        this.canvas.height = px;
        this.COLS = cells;
        this.ROWS = cells;
    }

    /* ──────── JOGO ──────── */
    startGame() {
        this.stopGame();
        this.resizeCanvas();

        // Cobra começa no centro, 3 segmentos
        const mid = Math.floor(this.COLS / 2);
        this.snake = [
            { x: mid,     y: Math.floor(this.ROWS / 2) },
            { x: mid - 1, y: Math.floor(this.ROWS / 2) },
            { x: mid - 2, y: Math.floor(this.ROWS / 2) },
        ];
        this.dir     = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };
        this.score   = 0;
        this.level   = 1;
        this.bonus   = null;
        this.running = true;

        this.setScore(0);
        this.setLevel(1);
        this.spawnFood();

        this.overlayStart.style.display = 'none';
        this.overlayEnd.style.display   = 'none';

        this.scheduleBonus();
        this.loop();
    }

    stopGame() {
        this.running = false;
        if (this.loopId)     { clearTimeout(this.loopId);   this.loopId = null; }
        if (this.bonusTimer) { clearTimeout(this.bonusTimer); this.bonusTimer = null; }
    }

    speed() {
        // Aumenta conforme nível: começa 180ms, mínimo 80ms
        return Math.max(80, 180 - (this.level - 1) * 15);
    }

    loop() {
        if (!this.running) return;
        this.update();
        this.draw();
        this.loopId = setTimeout(() => this.loop(), this.speed());
    }

    update() {
        this.dir = { ...this.nextDir };

        const head = {
            x: this.snake[0].x + this.dir.x,
            y: this.snake[0].y + this.dir.y
        };

        // Colisão com parede
        if (head.x < 0 || head.x >= this.COLS || head.y < 0 || head.y >= this.ROWS) {
            this.gameOver(); return;
        }

        // Colisão consigo mesmo
        for (const seg of this.snake) {
            if (seg.x === head.x && seg.y === head.y) {
                this.gameOver(); return;
            }
        }

        this.snake.unshift(head);

        // Comeu comida principal
        if (this.food && head.x === this.food.x && head.y === this.food.y) {
            this.addScore(10 * this.level);
            this.food = null;
            this.spawnFood();
            this.updateLevel();
            this.spawnParticles(head.x * this.CELL + this.CELL/2, head.y * this.CELL + this.CELL/2, false);
        }
        // Comeu bônus
        else if (this.bonus && head.x === this.bonus.x && head.y === this.bonus.y) {
            this.addScore(50 * this.level);
            this.bonus = null;
            this.spawnParticles(head.x * this.CELL + this.CELL/2, head.y * this.CELL + this.CELL/2, true);
        }
        else {
            this.snake.pop();
        }
    }

    spawnFood() {
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * this.COLS),
                y: Math.floor(Math.random() * this.ROWS)
            };
        } while (this.snake.some(s => s.x === pos.x && s.y === pos.y));
        this.food = pos;
    }

    scheduleBonus() {
        const delay = 8000 + Math.random() * 7000;
        this.bonusTimer = setTimeout(() => {
            if (!this.running) return;
            if (!this.bonus) this.spawnBonus();
            // Remove após 5 seg se não comer
            this.bonusTimer = setTimeout(() => {
                this.bonus = null;
                this.scheduleBonus();
            }, 5000);
        }, delay);
    }

    spawnBonus() {
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * this.COLS),
                y: Math.floor(Math.random() * this.ROWS)
            };
        } while (
            this.snake.some(s => s.x === pos.x && s.y === pos.y) ||
            (this.food && this.food.x === pos.x && this.food.y === pos.y)
        );
        this.bonus = pos;
    }

    updateLevel() {
        const newLevel = Math.floor(this.score / 100) + 1;
        if (newLevel !== this.level) {
            this.level = newLevel;
            this.setLevel(newLevel);
        }
    }

    /* ──────── PONTUAÇÃO ──────── */
    addScore(pts) {
        this.score += pts;
        this.setScore(this.score);
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore);
            this.updateHighScore();
        }
    }

    setScore(v) {
        if (this.scoreEl) this.scoreEl.textContent = v;
    }

    setLevel(v) {
        if (this.levelEl) this.levelEl.textContent = v;
    }

    updateHighScore() {
        if (this.highEl) this.highEl.textContent = this.highScore;
    }

    /* ──────── GAME OVER ──────── */
    gameOver() {
        this.stopGame();

        // Efeito de tremer canvas
        this.canvas.classList.add('snake-shake');
        setTimeout(() => this.canvas.classList.remove('snake-shake'), 500);

        if (this.finalEl) this.finalEl.textContent = this.score;
        this.overlayEnd.style.display = 'flex';
    }

    /* ──────── PARTÍCULAS ──────── */
    particles = [];

    spawnParticles(cx, cy, isBonus) {
        const theme = this.getTheme();
        const count = isBonus ? 12 : 6;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 1.5 + Math.random() * 2;
            this.particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                color: isBonus ? theme.head : theme.snake,
                size: isBonus ? 5 : 3
            });
        }
    }

    updateParticles() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            return p.life > 0;
        });
    }

    drawParticles() {
        for (const p of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    /* ──────── DESENHO ──────── */
    draw() {
        const ctx  = this.ctx;
        const C    = this.CELL;
        const theme = this.getTheme();

        // Fundo
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grade sutil
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        for (let c = 0; c < this.COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * C, 0);
            ctx.lineTo(c * C, this.canvas.height);
            ctx.stroke();
        }
        for (let r = 0; r < this.ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * C);
            ctx.lineTo(this.canvas.width, r * C);
            ctx.stroke();
        }

        // Cobra
        this.snake.forEach((seg, i) => {
            const isHead = i === 0;
            const progress = i / this.snake.length;

            if (isHead) {
                // Cabeça: cor vibrante com brilho
                ctx.save();
                ctx.shadowBlur  = 15;
                ctx.shadowColor = theme.head;
                ctx.fillStyle   = theme.head;
                this.roundRect(ctx, seg.x * C + 1, seg.y * C + 1, C - 2, C - 2, 5);
                ctx.fill();
                ctx.restore();

                // Olhos
                ctx.fillStyle = '#000';
                const eyeSize = 3;
                const eyeOffset = 4;
                if (this.dir.x === 1) {
                    // olhando direita
                    ctx.fillRect(seg.x * C + C - eyeOffset - eyeSize, seg.y * C + eyeOffset, eyeSize, eyeSize);
                    ctx.fillRect(seg.x * C + C - eyeOffset - eyeSize, seg.y * C + C - eyeOffset - eyeSize, eyeSize, eyeSize);
                } else if (this.dir.x === -1) {
                    ctx.fillRect(seg.x * C + eyeOffset, seg.y * C + eyeOffset, eyeSize, eyeSize);
                    ctx.fillRect(seg.x * C + eyeOffset, seg.y * C + C - eyeOffset - eyeSize, eyeSize, eyeSize);
                } else if (this.dir.y === -1) {
                    ctx.fillRect(seg.x * C + eyeOffset, seg.y * C + eyeOffset, eyeSize, eyeSize);
                    ctx.fillRect(seg.x * C + C - eyeOffset - eyeSize, seg.y * C + eyeOffset, eyeSize, eyeSize);
                } else {
                    ctx.fillRect(seg.x * C + eyeOffset, seg.y * C + C - eyeOffset - eyeSize, eyeSize, eyeSize);
                    ctx.fillRect(seg.x * C + C - eyeOffset - eyeSize, seg.y * C + C - eyeOffset - eyeSize, eyeSize, eyeSize);
                }
            } else {
                // Corpo: gradiente de transparência
                const alpha = 0.9 - progress * 0.5;
                ctx.save();
                ctx.shadowBlur  = 6;
                ctx.shadowColor = theme.snake;
                ctx.fillStyle   = this.hexToRgba(theme.snake, alpha);
                this.roundRect(ctx, seg.x * C + 2, seg.y * C + 2, C - 4, C - 4, 4);
                ctx.fill();
                ctx.restore();
            }
        });

        // Comida principal (emoji)
        if (this.food) {
            const fx = this.food.x * C + C / 2;
            const fy = this.food.y * C + C / 2;
            const pulse = 1 + Math.sin(Date.now() / 300) * 0.1;
            ctx.save();
            ctx.translate(fx, fy);
            ctx.scale(pulse, pulse);
            ctx.font = `${Math.floor(C * 0.85)}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.getTheme().food, 0, 1);
            ctx.restore();
        }

        // Item bônus (emoji diferente com brilho)
        if (this.bonus) {
            const bx = this.bonus.x * C + C / 2;
            const by = this.bonus.y * C + C / 2;
            const pulse2 = 1 + Math.sin(Date.now() / 200) * 0.15;
            ctx.save();
            ctx.translate(bx, by);
            ctx.scale(pulse2, pulse2);
            ctx.shadowBlur  = 20;
            ctx.shadowColor = theme.head;
            ctx.font = `${Math.floor(C * 0.9)}px serif`;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.getTheme().bonus, 0, 1);
            ctx.restore();
        }

        // Partículas
        this.updateParticles();
        this.drawParticles();
    }

    drawIdle() {
        const ctx   = this.ctx;
        const C     = this.CELL;
        const theme = this.getTheme();

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grade decorativa
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;
        for (let c = 0; c <= this.COLS; c++) {
            ctx.beginPath(); ctx.moveTo(c * C, 0); ctx.lineTo(c * C, this.canvas.height); ctx.stroke();
        }
        for (let r = 0; r <= this.ROWS; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * C); ctx.lineTo(this.canvas.width, r * C); ctx.stroke();
        }

        // Cobra decorativa
        const mid = Math.floor(this.COLS / 2);
        const demo = [
            { x: mid,     y: Math.floor(this.ROWS / 2) },
            { x: mid - 1, y: Math.floor(this.ROWS / 2) },
            { x: mid - 2, y: Math.floor(this.ROWS / 2) },
            { x: mid - 3, y: Math.floor(this.ROWS / 2) },
        ];
        demo.forEach((seg, i) => {
            ctx.save();
            if (i === 0) {
                ctx.shadowBlur  = 15;
                ctx.shadowColor = theme.head;
                ctx.fillStyle   = theme.head;
            } else {
                ctx.shadowBlur  = 6;
                ctx.shadowColor = theme.snake;
                ctx.fillStyle   = this.hexToRgba(theme.snake, 0.9 - i * 0.15);
            }
            this.roundRect(ctx, seg.x * C + (i === 0 ? 1 : 2), seg.y * C + (i === 0 ? 1 : 2), C - (i === 0 ? 2 : 4), C - (i === 0 ? 2 : 4), i === 0 ? 5 : 4);
            ctx.fill();
            ctx.restore();
        });

        // Emoji da comida acima
        ctx.font = `${Math.floor(C * 0.85)}px serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(theme.food, (mid + 2) * C + C / 2, Math.floor(this.ROWS / 2) * C + C / 2);
    }

    /* ──────── UTILS ──────── */
    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    // Pequeno delay para garantir que o DOM esteja pronto
    setTimeout(() => {
        window.snakeGame = new SnakeGame();
    }, 200);
});
