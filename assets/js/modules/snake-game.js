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
        this.dirQueue   = [];
        this.food       = null;
        this.bonus      = null;    // item bônus aparece ocasionalmente
        this.score      = 0;
        this.highScore  = parseInt(localStorage.getItem('snakeHighScore') || '0');
        this.level      = 1;
        this.running    = false;
        this.waitingForInput = false;
        this.coyoteUsed = false;
        this.justTurned = false;
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
        // Bloqueia dblclick no modal (no desktop, dblclick em área vazia vazava para o body)
        this.modal.addEventListener('dblclick', (e) => e.stopPropagation());
        // Bloqueia todos os cliques de propagar para fora do modal
        this.modal.addEventListener('mousedown', (e) => e.stopPropagation());

        // Botões do jogo
        this.startBtn?.addEventListener('click', () => this.startGame());
        this.restartBtn?.addEventListener('click', () => this.startGame());

        // Teclado — usa CAPTURE PHASE para interceptar ANTES dos outros listeners do document
        // stopImmediatePropagation impede que o evento chegue aos outros handlers (album, galeria, etc.)
        document.addEventListener('keydown', (e) => {
            if (!this.modal || this.modal.style.display !== 'flex') return;
            e.stopImmediatePropagation(); // Bloqueia TODOS os outros listeners do document
            this.handleKey(e.key);
        }, true); // true = capture phase (roda antes dos listeners bubble)

        // Controles mobile (swipe)
        this.bindSwipe();
    }

    bindSwipe() {
        let sx = 0, sy = 0;
        let swipeHandled = false; // Flag para impedir múltiplos triggers no mesmo toque

        this.modal.addEventListener('touchstart', e => {
            sx = e.touches[0].clientX;
            sy = e.touches[0].clientY;
            swipeHandled = false;
        }, { passive: true });

        // Usa touchmove para registrar imediatamente (0 delay), não espera soltar o dedo
        this.modal.addEventListener('touchmove', e => {
            if (!this.running || swipeHandled) return;
            const dx = e.touches[0].clientX - sx;
            const dy = e.touches[0].clientY - sy;
            
            // Requer uma distância mínima
            if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.handleKey(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
                } else {
                    this.handleKey(dy > 0 ? 'ArrowDown' : 'ArrowUp');
                }
                swipeHandled = true; // Bloqueia até o próximo toque
            }
        }, { passive: true });
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

        // Se o jogo estava parado esperando o primeiro movimento, ele começa agora!
        if (this.waitingForInput) {
            // Ignora ir direto para trás (contra o corpo)
            if (d.x === -1 && d.y === 0) return;
            
            this.dir = d;
            this.dirQueue = [];
            this.waitingForInput = false;
            this.scheduleBonus();
            this.loopId = requestAnimationFrame((t) => {
                this.lastTick = t; // Sincroniza exato com a tela para não dar "tranco"
                this.loop(t);
            });
            return; // Já consumiu o input
        }

        // Panic Overwrite: se o jogador apertar o oposto do ÚLTIMO comando salvo, 
        // cancelamos esse comando salvo para ele poder corrigir a tempo
        if (this.dirQueue.length > 0) {
            const last = this.dirQueue[this.dirQueue.length - 1];
            if (d.x === -last.x && d.y === -last.y) {
                this.dirQueue.pop();
            }
        }
        
        // A referência é o último na fila, ou a direção atual
        const lastDir = this.dirQueue.length > 0 ? this.dirQueue[this.dirQueue.length - 1] : this.dir;

        // Evita suicídio no pescoço e movimentos repetidos
        if (d.x === -lastDir.x && d.y === -lastDir.y) return;
        if (d.x === lastDir.x && d.y === lastDir.y) return;
        
        // Buffer de 2 para permitir U-Turns suaves
        if (this.dirQueue.length < 2) {
            this.dirQueue.push(d);
        }

        // COYOTE TIME (Perdão de Input):
        // Se a cobra acabou de passar o centro e ele apertou atrasado
        if (!this.waitingForInput && this.running && this.loopId && !this.coyoteUsed && !this.justTurned) {
            let dt = performance.now() - this.lastTick;
            let progress = dt / this.speed();
            
            let limit = 0.35;
            // EMERGENCY SAVE: Se a direção ATUAL vai matar a cobra no próximo tick (parede ou corpo),
            // estendemos a janela de perdão para absurdos 90% do bloco! O jogo SALVA o jogador se ele 
            // apertar o botão antes de bater literalmente de cara.
            if (this.isDoomed(this.dir)) {
                limit = 0.90;
            }

            if (progress < limit) {
                this.dir = this.dirQueue.shift();
                this.coyoteUsed = true; // Permite apenas 1 correção retroativa por bloco
            }
        }
    }

    isDoomed(d) {
        if (!this.snake || this.snake.length === 0) return false;
        const nextX = this.snake[0].x + d.x;
        const nextY = this.snake[0].y + d.y;
        
        // Parede
        if (nextX < 0 || nextX >= this.COLS || nextY < 0 || nextY >= this.ROWS) return true;
        
        // Próprio corpo (ignorando a ponta do rabo que vai andar)
        for (let i = 0; i < this.snake.length - 1; i++) {
            if (this.snake[i].x === nextX && this.snake[i].y === nextY) return true;
        }
        
        return false;
    }

    /* ──────── MODAL ──────── */
    openModal() {
        // Desativa a restauração automática de scroll do browser (para podermos controlar manualmente)
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        // Salva a posição do scroll ANTES de bloquear o body
        this._savedScroll = window.scrollY || document.documentElement.scrollTop;
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
        // Restaura scroll imediatamente (funciona para X e para o botão Voltar)
        // history.scrollRestoration = 'manual' já garante que o browser não sobrescreve
        if (this._savedScroll !== undefined) {
            document.documentElement.style.scrollBehavior = 'auto';
            window.scrollTo(0, this._savedScroll);
            document.documentElement.style.scrollBehavior = '';
        }
        // Reativa restauração automática do browser após sair do jogo
        if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
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
        // Permite que o jogo expanda mais no desktop (até 600px) para ter quadrados confortáveis
        const sizeW = Math.min(wrapper.clientWidth, 600);
        
        // Define um grid estático de 17x15 (Idêntico ao Google Snake)
        this.COLS = 17;
        this.ROWS = 15;
        this.CELL = Math.floor(sizeW / this.COLS);
        
        // Recalcula o px exato para evitar sobras
        this.canvas.width  = this.COLS * this.CELL;
        this.canvas.height = this.ROWS * this.CELL;
    }

/* ──────── JOGO ──────── */
    startGame() {
        this.stopGame();
        this.resizeCanvas();

        // Posição inicial clássica do Google Snake (cabeça no índice 4, mais à esquerda)
        const startX = 4;
        const startY = Math.floor(this.ROWS / 2);
        this.snake = [
            { x: startX,     y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY },
        ];
        this.dir      = { x: 1, y: 0 };
        this.dirQueue = [];
        this.score    = 0;
        this.level    = 1;
        this.bonus    = null;
        this.running  = true;
        this.waitingForInput = true; // Jogo vivo, mas cobra parada
        this.justAte  = false;

        this.setScore(0);
        this.setLevel(1);
        this.spawnFood();

        this.overlayStart.style.display = 'none';
        this.overlayEnd.style.display   = 'none';

        // Desenha a tela inicial estática, esperando input
        this.draw(0);
    }

    stopGame() {
        this.running = false;
        if (this.loopId)     { cancelAnimationFrame(this.loopId);   this.loopId = null; }
        if (this.bonusTimer) { clearTimeout(this.bonusTimer); this.bonusTimer = null; }
    }

    speed() {
        // Velocidade otimizada para o grid de 15x15 com quadrados maiores
        return 135;
    }

    loop(timestamp) {
        if (!this.running) return;
        
        const speed = this.speed();
        let dt = timestamp - this.lastTick;
        
        // Se passou o tempo do tick, executa a lógica do movimento
        if (dt >= speed) {
            this.tick();
            if (!this.running) return; // Se bateu na parede, para
            this.lastTick = timestamp - (dt % speed); // Mantém timing preciso
            dt = timestamp - this.lastTick;
        }
        
        // Desenha interpolando o progresso (entre 0 e 1)
        const progress = Math.min(dt / speed, 1);
        this.draw(progress);
        
        this.loopId = requestAnimationFrame((t) => this.loop(t));
    }

    tick() {
        this.coyoteUsed = false; // Reseta a flag de perdão para o novo quadrado
        
        const head = {
            x: this.snake[0].x + this.dir.x,
            y: this.snake[0].y + this.dir.y
        };

        // Verifica colisão com parede
        if (head.x < 0 || head.x >= this.COLS || head.y < 0 || head.y >= this.ROWS) {
            this.gameOver(); return;
        }

        // Verifica colisão consigo mesmo (ignora o último pedaço do rabo, pois ele vai andar)
        for (let i = 0; i < this.snake.length - 1; i++) {
            if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                this.gameOver(); return;
            }
        }

        this.snake.unshift(head);

        let ate = false;
        // Comeu comida principal
        if (this.food && head.x === this.food.x && head.y === this.food.y) {
            this.addScore(10 * this.level);
            this.food = null;
            this.spawnFood();
            this.updateLevel();
            this.spawnParticles(head.x * this.CELL + this.CELL/2, head.y * this.CELL + this.CELL/2, false);
            ate = true;
        }
        // Comeu bônus
        else if (this.bonus && head.x === this.bonus.x && head.y === this.bonus.y) {
            this.addScore(50 * this.level);
            this.bonus = null;
            this.spawnParticles(head.x * this.CELL + this.CELL/2, head.y * this.CELL + this.CELL/2, true);
            ate = true;
        }

        if (!ate) {
            this.snake.pop();
            this.justAte = false;
        } else {
            this.justAte = true;
        }

        // Atualiza a direção APENAS no final do tick lendo a fila.
        if (this.dirQueue.length > 0) {
            this.dir = this.dirQueue.shift();
            this.justTurned = true; // Protege contra Coyote Time duplo acidental
        } else {
            this.justTurned = false;
        }
    }

    spawnFood() {
        // Primeira maçã do jogo sempre aparece fixa à direita, na mesma linha, igual ao Google Snake
        if (this.score === 0 && !this.food) {
            this.food = { x: 12, y: Math.floor(this.ROWS / 2) };
            return;
        }

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
    draw(progress) {
        const ctx  = this.ctx;
        const C    = this.CELL;
        const theme = this.getTheme();

        // --- Fundo Xadrez Intercalado ---
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if ((r + c) % 2 === 0) {
                    ctx.fillStyle = 'rgba(128, 128, 128, 0.05)';
                } else {
                    ctx.fillStyle = 'rgba(128, 128, 128, 0.12)';
                }
                ctx.fillRect(c * C, r * C, C, C);
            }
        }
        // --- Cobra (Caminho Contínuo) ---
        const pts = [];
        const last = this.snake.length - 1;
        const tail = this.snake[last];
        const prevTail = this.snake[last - 1];
        
        let tailX, tailY;
        if (!this.justAte) {
            // Cauda encolhe interpolando
            tailX = tail.x + (prevTail.x - tail.x) * progress;
            tailY = tail.y + (prevTail.y - tail.y) * progress;
        } else {
            // Se acabou de comer, a cauda fica parada para a cobra crescer
            tailX = prevTail.x;
            tailY = prevTail.y;
        }
        pts.push({ x: tailX, y: tailY });
        
        // Pontos centrais
        for (let i = last - 1; i >= 0; i--) {
            pts.push({ x: this.snake[i].x, y: this.snake[i].y });
        }
        
        // Cabeça avança
        const headX = this.snake[0].x + this.dir.x * progress;
        const headY = this.snake[0].y + this.dir.y * progress;
        pts.push({ x: headX, y: headY });

        // Desenha o tubo
        ctx.beginPath();
        pts.forEach((p, i) => {
            const px = p.x * C + C / 2;
            const py = p.y * C + C / 2;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        
        ctx.lineWidth = Math.max(C * 0.75, 10);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = theme.snake;
        ctx.stroke();

        // Desenha a "Bola" da cabeça com cor diferente e brilho
        const hx = headX * C + C / 2;
        const hy = headY * C + C / 2;
        
        ctx.beginPath();
        ctx.arc(hx, hy, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = theme.head;
        ctx.shadowBlur = 10;
        ctx.shadowColor = theme.head;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
        
        // Olhinhos
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        const eyeOffset = C * 0.18;
        const eyeSize = Math.max(2, C * 0.12);
        
        ctx.beginPath();
        if (this.dir.x === 1) { // direita
            ctx.arc(hx + eyeOffset, hy - eyeOffset, eyeSize, 0, Math.PI*2);
            ctx.arc(hx + eyeOffset, hy + eyeOffset, eyeSize, 0, Math.PI*2);
        } else if (this.dir.x === -1) { // esquerda
            ctx.arc(hx - eyeOffset, hy - eyeOffset, eyeSize, 0, Math.PI*2);
            ctx.arc(hx - eyeOffset, hy + eyeOffset, eyeSize, 0, Math.PI*2);
        } else if (this.dir.y === -1) { // cima
            ctx.arc(hx - eyeOffset, hy - eyeOffset, eyeSize, 0, Math.PI*2);
            ctx.arc(hx + eyeOffset, hy - eyeOffset, eyeSize, 0, Math.PI*2);
        } else if (this.dir.y === 1) { // baixo
            ctx.arc(hx - eyeOffset, hy + eyeOffset, eyeSize, 0, Math.PI*2);
            ctx.arc(hx + eyeOffset, hy + eyeOffset, eyeSize, 0, Math.PI*2);
        }
        ctx.fill();

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
