// ===== SNAKE GAME — TEMÁTICO KEVIN & IARA =====

class SnakeGame {

    /* ──────── CONFIG DE NÍVEIS ──────── */
    LEVELS = {
        1: { name: 'Clássico',     color: '#22c55e', walls: 0, poison: false, bombs: false, multi: 1,   bombDur: 0    },
        2: { name: 'Obstáculos',   color: '#eab308', walls: 4, poison: false, bombs: false, multi: 2,   bombDur: 0    },
        3: { name: 'Envenenado',   color: '#f97316', walls: 4, poison: true,  bombs: false, multi: 3,   bombDur: 0    },
        4: { name: 'Campo Minado', color: '#ef4444', walls: 6, poison: false, bombs: true,  multi: 4,   bombDur: 4000 },
        5: { name: 'Caos Total',   color: '#a855f7', walls: 8, poison: true,  bombs: true,  multi: 5,   bombDur: 2500 },
    };

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
        this.overlayStart = document.getElementById('snakeOverlayStart');
        this.overlayEnd   = document.getElementById('snakeOverlayEnd');
        this.overlayLevel = document.getElementById('snakeOverlayLevel');

        if (!this.modal || !this.canvas) return;

        this.ctx  = this.canvas.getContext('2d');
        this.CELL = 20;
        this.COLS = 0;
        this.ROWS = 0;

        // Estado do jogo
        this.snake       = [];
        this.dir         = { x: 1, y: 0 };
        this.dirQueue    = [];
        this.food        = null;
        this.bonus       = null;
        this.poison      = null;
        this.walls       = [];
        this.bombs       = [];
        this.explosions  = [];
        this.score       = 0;
        
        // Limpa placar antigo devido ao novo balanceamento
        if (localStorage.getItem('snakeHighScore')) {
            localStorage.removeItem('snakeHighScore');
        }
        this.highScore   = parseInt(localStorage.getItem('snakeHighScoreV2') || '0');
        this.difficulty  = parseInt(localStorage.getItem('snakeDifficulty') || '1');
        this.running     = false;
        this.waitingForInput = false;
        this.coyoteUsed  = false;
        this.justTurned  = false;
        this.justAte     = false;
        this.loopId      = null;
        this.bonusTimer  = null;
        this.poisonTimer = null;
        this.particles   = [];

        // Emojis por tema
        this.themeItems = {
            meteors : { food: '☄️',  bonus: '💫', snake: '#8a2be2', head: '#00ffff' },
            hearts  : { food: '❤️',  bonus: '💛', snake: '#ff0055', head: '#ff66b2' },
            aurora  : { food: '🌿',  bonus: '💜', snake: '#00ffaa', head: '#00ccff' },
            winter  : { food: '❄️',  bonus: '⭐', snake: '#00f2fe', head: '#ffffff'  },
        };

        this.buildLevelOverlay();
        this.bindEvents();
        this.updateHighScore();
    }

    /* ──────── TEMA ──────── */
    getTheme() {
        const t = document.documentElement.getAttribute('data-theme') || 'meteors';
        return this.themeItems[t] || this.themeItems['meteors'];
    }

    /* ──────── MONTA OVERLAY DE NÍVEL ──────── */
    buildLevelOverlay() {
        const overlay = this.overlayLevel;
        if (!overlay) return;

        const ICONS = { 1: '🟢', 2: '🟡', 3: '🟠', 4: '🔴', 5: '💜' };
        const DESC  = {
            1: 'Sem obstáculos. Perfeito para começar!',
            2: 'Blocos fixos espalhados pelo grid.',
            3: 'Blocos + comida envenenada mortal!',
            4: 'Blocos + bombas com temporizador.',
            5: 'Tudo junto. Máxima pontuação!',
        };
        const FEATS = {
            1: { walls: false, poison: false, bombs: false },
            2: { walls: true,  poison: false, bombs: false },
            3: { walls: true,  poison: true,  bombs: false },
            4: { walls: true,  poison: false, bombs: true  },
            5: { walls: true,  poison: true,  bombs: true  },
        };

        overlay.innerHTML = `
            <h3 class="snake-level-title">Escolha a Dificuldade</h3>
            <p class="snake-level-subtitle">Quanto maior o nível, mais pontos por comida!</p>
            <div class="snake-level-grid">
                ${[1,2,3,4,5].map(n => {
                    const cfg = this.LEVELS[n];
                    const f   = FEATS[n];
                    return `<button class="snake-level-card" data-difficulty="${n}" style="--slc-color:${cfg.color}">
                        <div class="slc-top">
                            <span class="slc-icon">${ICONS[n]}</span>
                            <span class="slc-multi">×${cfg.multi} pts</span>
                        </div>
                        <span class="slc-name">${cfg.name}</span>
                        <span class="slc-desc">${DESC[n]}</span>
                        <div class="slc-feats">
                            <span class="${f.walls   ? 'on' : 'off'}" title="Blocos">🟧</span>
                            <span class="${f.poison  ? 'on' : 'off'}" title="Veneno">🍄</span>
                            <span class="${f.bombs   ? 'on' : 'off'}" title="Bombas">💣</span>
                        </div>
                    </button>`;
                }).join('')}
            </div>`;

        // Bind cliques nos cards
        overlay.querySelectorAll('.snake-level-card').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectDifficulty(parseInt(btn.dataset.difficulty));
            });
        });
    }

    /* ──────── BIND ──────── */
    bindEvents() {
        this.openBtn?.addEventListener('click', () => this.openModal());

        // Fechar — apenas botão X (evita dblclick acidental)
        this.closeBtn?.addEventListener('click', () => this.closeModal());
        this.modal.addEventListener('dblclick',  (e) => e.stopPropagation());
        this.modal.addEventListener('mousedown', (e) => e.stopPropagation());

        // Botões de jogo
        this.startBtn?.addEventListener('click',   () => this.showLevelSelect());
        this.restartBtn?.addEventListener('click', () => this.showLevelSelect());

        // Teclado — capture phase + stopImmediatePropagation para não vazar para outros módulos
        document.addEventListener('keydown', (e) => {
            if (!this.modal || this.modal.style.display !== 'flex') return;
            e.stopImmediatePropagation();
            this.handleKey(e.key);
        }, true);

        this.bindSwipe();
    }

    /* ──────── SWIPE MOBILE ──────── */
    bindSwipe() {
        let sx = 0, sy = 0, swipeHandled = false;

        this.modal.addEventListener('touchstart', e => {
            sx = e.touches[0].clientX;
            sy = e.touches[0].clientY;
            swipeHandled = false;
        }, { passive: true });

        this.modal.addEventListener('touchmove', e => {
            if (!this.running || swipeHandled) return;
            const dx = e.touches[0].clientX - sx;
            const dy = e.touches[0].clientY - sy;
            if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.handleKey(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
                } else {
                    this.handleKey(dy > 0 ? 'ArrowDown' : 'ArrowUp');
                }
                swipeHandled = true;
            }
        }, { passive: true });
    }

    /* ──────── INPUT ──────── */
    handleKey(key) {
        if (!this.running) return;
        const map = {
            'ArrowUp':    { x: 0, y: -1 },
            'ArrowDown':  { x: 0, y:  1 },
            'ArrowLeft':  { x: -1, y: 0 },
            'ArrowRight': { x:  1, y: 0 },
            'w': { x: 0, y: -1 }, 's': { x: 0, y:  1 },
            'a': { x: -1, y: 0 }, 'd': { x:  1, y: 0 },
        };
        const d = map[key];
        if (!d) return;

        // Primeiro toque → acorda o jogo
        if (this.waitingForInput) {
            if (d.x === -1 && d.y === 0) return; // não pode ir para trás no início
            this.dir = d;
            this.dirQueue = [];
            this.waitingForInput = false;

            // Agenda os itens especiais do nível
            this.scheduleBonus();
            const cfg = this.LEVELS[this.difficulty];
            if (cfg.poison) this.schedulePoison();
            if (cfg.bombs)  this.scheduleBomb();

            this.loopId = requestAnimationFrame((t) => {
                this.lastTick = t;
                this.loop(t);
            });
            return;
        }

        // Panic Overwrite: cancela último comando se o oposto for pressionado
        if (this.dirQueue.length > 0) {
            const last = this.dirQueue[this.dirQueue.length - 1];
            if (d.x === -last.x && d.y === -last.y) this.dirQueue.pop();
        }

        const lastDir = this.dirQueue.length > 0 ? this.dirQueue[this.dirQueue.length - 1] : this.dir;
        if (d.x === -lastDir.x && d.y === -lastDir.y) return; // suicídio
        if (d.x ===  lastDir.x && d.y ===  lastDir.y) return; // repetido

        if (this.dirQueue.length < 2) this.dirQueue.push(d);

        // Coyote Time — perdão de input atrasado
        if (!this.waitingForInput && this.running && this.loopId && !this.coyoteUsed && !this.justTurned) {
            const dt       = performance.now() - this.lastTick;
            const progress = dt / this.speed();
            let limit = 0.35;
            if (this.isDoomed(this.dir)) limit = 0.90; // Emergency Save perto de obstáculo
            if (progress < limit) {
                this.dir = this.dirQueue.shift();
                this.coyoteUsed = true;
            }
        }
    }

    /* ──────── VERIFICAÇÃO DE MORTE ──────── */
    isDoomed(d) {
        if (!this.snake || this.snake.length === 0) return false;
        const nx = this.snake[0].x + d.x;
        const ny = this.snake[0].y + d.y;
        if (nx < 0 || nx >= this.COLS || ny < 0 || ny >= this.ROWS) return true;
        for (let i = 0; i < this.snake.length - 1; i++) {
            if (this.snake[i].x === nx && this.snake[i].y === ny) return true;
        }
        if (this.walls.some(w => w.x === nx && w.y === ny)) return true;
        if (this.bombs.some(b => b.x === nx && b.y === ny)) return true;
        return false;
    }

    /* ──────── MODAL ──────── */
    openModal() {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        this._savedScroll = (window.menuScrollPosition !== undefined && document.body.classList.contains('menu-open'))
            ? window.menuScrollPosition
            : (window.scrollY || document.documentElement.scrollTop);

        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (typeof HistoryManager !== 'undefined') HistoryManager.push('snake-game-modal');

        // Garante que se reabrir, mostramos a tela inicial e não uma tela preta/travada
        if (this.overlayStart && this.overlayEnd && this.overlayLevel) {
            this.overlayStart.style.display = 'flex';
            this.overlayEnd.style.display = 'none';
            this.overlayLevel.style.display = 'none';
        }

        this.resizeCanvas();
        this.drawIdle();
        this.updateHighScore();
        this.updateLegend();
        this._syncLevelHighlight();
    }

    closeModal() {
        this.stopGame();
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        if (typeof HistoryManager !== 'undefined') HistoryManager.remove('snake-game-modal');
        if (this._savedScroll !== undefined) {
            document.documentElement.style.scrollBehavior = 'auto';
            window.scrollTo(0, this._savedScroll);
            document.documentElement.style.scrollBehavior = '';
        }
        if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
    }

    showLevelSelect() {
        this.overlayStart.style.display = 'none';
        this.overlayEnd.style.display   = 'none';
        this.overlayLevel.style.display = 'flex';
        this._syncLevelHighlight();
    }

    selectDifficulty(n) {
        this.difficulty = n;
        localStorage.setItem('snakeDifficulty', String(n));
        this.overlayLevel.style.display = 'none';
        this.startGame();
    }

    _syncLevelHighlight() {
        if (!this.overlayLevel) return;
        this.overlayLevel.querySelectorAll('.snake-level-card').forEach(btn => {
            btn.classList.toggle('selected', parseInt(btn.dataset.difficulty) === this.difficulty);
        });
    }

    /* ──────── LEGENDA ──────── */
    updateLegend() {
        const theme = this.getTheme();
        const foodEl  = document.getElementById('snakeLegendFood');
        const bonusEl = document.getElementById('snakeLegendBonus');
        if (foodEl)  foodEl.textContent = theme.food;
        if (bonusEl) bonusEl.textContent = theme.bonus;
    }

    /* ──────── CANVAS ──────── */
    resizeCanvas() {
        const wrapper = this.canvas.parentElement;
        const sizeW   = Math.min(wrapper.clientWidth, 600);
        this.COLS = 17;
        this.ROWS = 15;
        this.CELL = Math.floor(sizeW / this.COLS);
        this.canvas.width  = this.COLS * this.CELL;
        this.canvas.height = this.ROWS * this.CELL;
    }

    /* ──────── INÍCIO DO JOGO ──────── */
    startGame() {
        this.stopGame();
        this.resizeCanvas();

        const startX = 4;
        const startY = Math.floor(this.ROWS / 2);

        this.snake     = [
            { x: startX,     y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY },
        ];
        this.dir       = { x: 1, y: 0 };
        this.dirQueue  = [];
        this.score     = 0;
        this.bonus     = null;
        this.poison    = null;
        this.walls     = [];
        this.bombs     = [];
        this.explosions= [];
        this.running   = true;
        this.waitingForInput = true;
        this.justAte   = false;
        this.particles = [];

        this.setScore(0);
        this.setLevelDisplay(this.difficulty);
        this.spawnFood();

        // Spawna blocos fixos do nível
        const cfg = this.LEVELS[this.difficulty];
        this.spawnWalls(cfg.walls);

        this.overlayStart.style.display = 'none';
        this.overlayEnd.style.display   = 'none';
        this.overlayLevel.style.display = 'none';

        this.draw(0); // Renderiza estado estático esperando input
    }

    stopGame() {
        this.running = false;
        if (this.loopId)     { cancelAnimationFrame(this.loopId);   this.loopId     = null; }
        if (this.bonusTimer) { clearTimeout(this.bonusTimer);        this.bonusTimer = null; }
        if (this.poisonTimer){ clearTimeout(this.poisonTimer);       this.poisonTimer = null; }
        // Cancela timers de bomba
        this.bombs.forEach(b => { if (b.timerId) clearTimeout(b.timerId); });
        this.bombs  = [];
        this.explosions = [];
        this.poison = null;
    }

    speed() { return 135; } // ms por tick — otimizado para grid 17x15

    loop(timestamp) {
        if (!this.running) return;
        const speed = this.speed();
        let dt = timestamp - this.lastTick;
        if (dt >= speed) {
            this.tick();
            if (!this.running) return;
            this.lastTick = timestamp - (dt % speed);
            dt = timestamp - this.lastTick;
        }
        const progress = Math.min(dt / speed, 1);
        this.draw(progress);
        this.loopId = requestAnimationFrame((t) => this.loop(t));
    }

    tick() {
        this.coyoteUsed = false;

        const head = {
            x: this.snake[0].x + this.dir.x,
            y: this.snake[0].y + this.dir.y,
        };

        // Colisão com parede do mapa
        if (head.x < 0 || head.x >= this.COLS || head.y < 0 || head.y >= this.ROWS) {
            this.gameOver(); return;
        }
        // Colisão com o próprio corpo
        for (let i = 0; i < this.snake.length - 1; i++) {
            if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                this.gameOver(); return;
            }
        }
        // Colisão com bloco fixo
        if (this.walls.some(w => w.x === head.x && w.y === head.y)) {
            this.gameOver(); return;
        }
        // Colisão com bomba
        if (this.bombs.some(b => b.x === head.x && b.y === head.y)) {
            this.gameOver(); return;
        }

        this.snake.unshift(head);

        let ate = false;

        if (this.food && head.x === this.food.x && head.y === this.food.y) {
            // Comida normal
            this.addScore(1 * this.LEVELS[this.difficulty].multi);
            this.food = null;
            this.spawnFood();
            this.spawnParticles(head.x * this.CELL + this.CELL / 2, head.y * this.CELL + this.CELL / 2, false);
            ate = true;
        } else if (this.bonus && head.x === this.bonus.x && head.y === this.bonus.y) {
            // Item bônus
            this.addScore(5 * this.LEVELS[this.difficulty].multi);
            this.bonus = null;
            this.spawnParticles(head.x * this.CELL + this.CELL / 2, head.y * this.CELL + this.CELL / 2, true);
            ate = true;
        } else if (this.poison && head.x === this.poison.x && head.y === this.poison.y) {
            // Veneno = game over imediato
            this.gameOver(); return;
        }

        if (!ate) {
            this.snake.pop();
            this.justAte = false;
        } else {
            this.justAte = true;
        }

        // Aplica próxima direção da fila
        if (this.dirQueue.length > 0) {
            this.dir = this.dirQueue.shift();
            this.justTurned = true;
        } else {
            this.justTurned = false;
        }
    }

    /* ──────── CÉLULA OCUPADA ──────── */
    isCellOccupied(x, y) {
        if (this.snake.some(s => s.x === x && s.y === y))   return true;
        if (this.food   && this.food.x   === x && this.food.y   === y) return true;
        if (this.bonus  && this.bonus.x  === x && this.bonus.y  === y) return true;
        if (this.poison && this.poison.x === x && this.poison.y === y) return true;
        if (this.walls.some(w => w.x === x && w.y === y))   return true;
        if (this.bombs.some(b => b.x === x && b.y === y))   return true;
        return false;
    }

    randomFreeCell() {
        let pos, attempts = 0;
        do {
            pos = {
                x: Math.floor(Math.random() * this.COLS),
                y: Math.floor(Math.random() * this.ROWS),
            };
            attempts++;
        } while (this.isCellOccupied(pos.x, pos.y) && attempts < 500);
        return pos;
    }

    /* ──────── SPAWN: COMIDA ──────── */
    spawnFood() {
        // Primeira comida: posição clássica do Google Snake
        if (this.score === 0 && !this.food) {
            this.food = { x: 12, y: Math.floor(this.ROWS / 2) };
            return;
        }
        this.food = this.randomFreeCell();
    }

    /* ──────── SPAWN: BLOCOS FIXOS ──────── */
    spawnWalls(count) {
        this.walls = [];
        if (count === 0) return;
        const startY = Math.floor(this.ROWS / 2);
        let attempts = 0;
        while (this.walls.length < count && attempts < 500) {
            attempts++;
            const pos = {
                x: Math.floor(Math.random() * this.COLS),
                y: Math.floor(Math.random() * this.ROWS),
            };
            const inSafeZone  = pos.x <= 6  && Math.abs(pos.y - startY) <= 2;
            const nearInitFood = pos.x >= 10 && pos.y === startY;
            const duplicate   = this.walls.some(w => w.x === pos.x && w.y === pos.y);
            if (!inSafeZone && !nearInitFood && !duplicate) {
                this.walls.push(pos);
            }
        }
    }

    /* ──────── SPAWN: BÔNUS ──────── */
    scheduleBonus() {
        const delay = 8000 + Math.random() * 7000;
        this.bonusTimer = setTimeout(() => {
            if (!this.running) return;
            this.bonus = this.randomFreeCell();
            this.bonusTimer = setTimeout(() => {
                this.bonus = null;
                if (this.running) this.scheduleBonus();
            }, 5000);
        }, delay);
    }

    /* ──────── SPAWN: VENENO ──────── */
    schedulePoison() {
        const delay = 6000 + Math.random() * 5000;
        this.poisonTimer = setTimeout(() => {
            if (!this.running) return;
            this.poison = this.randomFreeCell();
            this.poisonTimer = setTimeout(() => {
                this.poison = null;
                if (this.running) this.schedulePoison();
            }, 5000);
        }, delay);
    }

    /* ──────── SPAWN: BOMBA ──────── */
    scheduleBomb() {
        const cfg   = this.LEVELS[this.difficulty];
        const delay = 4000 + Math.random() * 4000;
        setTimeout(() => {
            if (!this.running) return;
            const pos  = this.randomFreeCell();
            const bomb = { x: pos.x, y: pos.y, spawnTime: Date.now(), duration: cfg.bombDur, timerId: null };
            this.bombs.push(bomb);
            // Explode após duração e agenda nova bomba
            const removeId = setTimeout(() => {
                this.bombs = this.bombs.filter(b => b !== bomb);
                if (this.running) {
                    this.triggerExplosion(bomb.x, bomb.y);
                    this.scheduleBomb();
                }
            }, cfg.bombDur);
            bomb.timerId = removeId;
        }, delay);
    }

    triggerExplosion(cx, cy) {
        this.explosions.push({ x: cx, y: cy, life: 1.0 });
        
        // Partículas de explosão
        for(let i=0; i<20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 5;
            this.particles.push({
                x: cx * this.CELL + this.CELL/2, 
                y: cy * this.CELL + this.CELL/2,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 1,
                color: '#ff3300',
                size: 3 + Math.random() * 4
            });
        }

        // Verifica se a cobra foi atingida na área 3x3
        // Apenas a CABEÇA toma dano! O corpo é imune para ser justo com o jogador caso a cobra esteja muito grande.
        let hit = false;
        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                const ex = cx + c;
                const ey = cy + r;
                if (this.snake[0].x === ex && this.snake[0].y === ey) {
                    hit = true;
                }
            }
        }
        
        if (hit) {
            this.gameOver();
        }
    }

    /* ──────── PONTUAÇÃO ──────── */
    addScore(pts) {
        this.score += pts;
        this.setScore(this.score);
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScoreV2', this.highScore);
            this.updateHighScore();
        }
    }

    setScore(v)        { if (this.scoreEl) this.scoreEl.textContent = v; }
    setLevelDisplay(v) { if (this.levelEl) this.levelEl.textContent = v; }
    updateHighScore()  { if (this.highEl)  this.highEl.textContent  = this.highScore; }

    /* ──────── GAME OVER ──────── */
    gameOver() {
        this.stopGame();
        this.canvas.classList.add('snake-shake');
        setTimeout(() => this.canvas.classList.remove('snake-shake'), 500);
        if (this.finalEl) this.finalEl.textContent = this.score;
        this.overlayEnd.style.display = 'flex';
    }

    /* ──────── PARTÍCULAS ──────── */
    spawnParticles(cx, cy, isBonus) {
        const theme = this.getTheme();
        const count = isBonus ? 12 : 6;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const spd   = 1.5 + Math.random() * 2;
            this.particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 1,
                color: isBonus ? theme.head : theme.snake,
                size:  isBonus ? 5 : 3,
            });
        }
    }

    updateParticles() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx; p.y += p.vy;
            p.life -= 0.05;
            return p.life > 0;
        });
    }

    drawParticles() {
        for (const p of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha  = p.life;
            this.ctx.fillStyle    = p.color;
            this.ctx.shadowBlur   = 8;
            this.ctx.shadowColor  = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    /* ──────── DESENHO PRINCIPAL ──────── */
    draw(progress) {
        const ctx   = this.ctx;
        const C     = this.CELL;
        const theme = this.getTheme();

        // Fundo xadrez
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                ctx.fillStyle = (r + c) % 2 === 0
                    ? 'rgba(128,128,128,0.05)'
                    : 'rgba(128,128,128,0.12)';
                ctx.fillRect(c * C, r * C, C, C);
            }
        }

        // ── Blocos fixos (paredes) ──
        this.walls.forEach(w => {
            ctx.save();
            ctx.fillStyle  = '#f97316'; // Laranja vibrante
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(249, 115, 22, 0.5)';
            this.roundRect(ctx, w.x * C + 1, w.y * C + 1, C - 2, C - 2, 4);
            ctx.fill();
            
            // Borda interna 3D em vez de emoji
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            this.roundRect(ctx, w.x * C + 4, w.y * C + 4, C - 8, C - 8, 2);
            ctx.stroke();
            ctx.restore();
        });

        // ── Cobra (Polyline contínua e suave) ──
        const pts = [];
        const last = this.snake.length - 1;
        let tailX, tailY;
        if (!this.justAte) {
            tailX = this.snake[last].x + (this.snake[last - 1].x - this.snake[last].x) * progress;
            tailY = this.snake[last].y + (this.snake[last - 1].y - this.snake[last].y) * progress;
        } else {
            tailX = this.snake[last - 1].x;
            tailY = this.snake[last - 1].y;
        }
        pts.push({ x: tailX, y: tailY });
        for (let i = last - 1; i >= 0; i--) {
            pts.push({ x: this.snake[i].x, y: this.snake[i].y });
        }
        const headX = this.snake[0].x + this.dir.x * progress;
        const headY = this.snake[0].y + this.dir.y * progress;
        pts.push({ x: headX, y: headY });

        ctx.beginPath();
        pts.forEach((p, i) => {
            const px = p.x * C + C / 2, py = p.y * C + C / 2;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.lineWidth   = Math.max(C * 0.75, 10);
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.strokeStyle = theme.snake;
        ctx.stroke();

        // Cabeça com brilho
        const hx = headX * C + C / 2, hy = headY * C + C / 2;
        ctx.beginPath();
        ctx.arc(hx, hy, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle   = theme.head;
        ctx.shadowBlur  = 10;
        ctx.shadowColor = theme.head;
        ctx.fill();
        ctx.shadowBlur  = 0;

        // Olhinhos
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        const eo = C * 0.18, es = Math.max(2, C * 0.12);
        ctx.beginPath();
        if      (this.dir.x ===  1) { ctx.arc(hx + eo, hy - eo, es, 0, Math.PI*2); ctx.arc(hx + eo, hy + eo, es, 0, Math.PI*2); }
        else if (this.dir.x === -1) { ctx.arc(hx - eo, hy - eo, es, 0, Math.PI*2); ctx.arc(hx - eo, hy + eo, es, 0, Math.PI*2); }
        else if (this.dir.y === -1) { ctx.arc(hx - eo, hy - eo, es, 0, Math.PI*2); ctx.arc(hx + eo, hy - eo, es, 0, Math.PI*2); }
        else                        { ctx.arc(hx - eo, hy + eo, es, 0, Math.PI*2); ctx.arc(hx + eo, hy + eo, es, 0, Math.PI*2); }
        ctx.fill();

        // ── Comida ──
        if (this.food) {
            const fx = this.food.x * C + C / 2, fy = this.food.y * C + C / 2;
            const pulse = 1 + Math.sin(Date.now() / 300) * 0.1;
            ctx.save();
            ctx.translate(fx, fy); ctx.scale(pulse, pulse);
            ctx.font = `${Math.floor(C * 0.85)}px serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(theme.food, 0, 1);
            ctx.restore();
        }

        // ── Bônus ──
        if (this.bonus) {
            const bx = this.bonus.x * C + C / 2, by = this.bonus.y * C + C / 2;
            const p2 = 1 + Math.sin(Date.now() / 200) * 0.15;
            ctx.save();
            ctx.translate(bx, by); ctx.scale(p2, p2);
            ctx.shadowBlur = 20; ctx.shadowColor = theme.head;
            ctx.font = `${Math.floor(C * 0.9)}px serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(theme.bonus, 0, 1);
            ctx.restore();
        }

        // ── Veneno 🍄 ──
        if (this.poison) {
            const px = this.poison.x * C + C / 2, py = this.poison.y * C + C / 2;
            const pp = 1 + Math.sin(Date.now() / 220) * 0.13;
            ctx.save();
            ctx.translate(px, py); ctx.scale(pp, pp);
            ctx.shadowBlur = 18; ctx.shadowColor = '#bb00ff';
            ctx.font = `${Math.floor(C * 0.85)}px serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('🍄', 0, 1);
            ctx.restore();
        }

        // ── Explosões 💥 ──
        this.explosions = this.explosions.filter(exp => {
            ctx.save();
            ctx.fillStyle = `rgba(255, 60, 0, ${exp.life * 0.6})`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff3300';
            for(let r = -1; r <= 1; r++) {
                for(let c = -1; c <= 1; c++) {
                    const ex = exp.x + c;
                    const ey = exp.y + r;
                    if(ex >= 0 && ex < this.COLS && ey >= 0 && ey < this.ROWS) {
                        this.roundRect(ctx, ex * C + 2, ey * C + 2, C - 4, C - 4, 4);
                        ctx.fill();
                    }
                }
            }
            ctx.restore();
            
            ctx.save();
            ctx.translate(exp.x * C + C/2, exp.y * C + C/2);
            ctx.scale(1 + (1 - exp.life), 1 + (1 - exp.life));
            ctx.globalAlpha = exp.life;
            ctx.font = `${Math.floor(C * 1.5)}px serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('💥', 0, 0);
            ctx.restore();

            exp.life -= 0.05;
            return exp.life > 0;
        });

        // ── Bombas 💣 com anel de countdown ──
        const now = Date.now();
        this.bombs.forEach(b => {
            const bx      = b.x * C + C / 2, by = b.y * C + C / 2;
            const elapsed  = now - b.spawnTime;
            const timerPct = Math.max(0, 1 - elapsed / b.duration); // 1 = novo, 0 = explodindo
            const danger   = 1 - timerPct;

            // Anel de countdown (arco encolhendo)
            ctx.save();
            ctx.beginPath();
            ctx.arc(bx, by, C * 0.46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerPct);
            ctx.strokeStyle = `rgba(255, ${Math.floor(160 * timerPct)}, 0, 0.9)`;
            ctx.lineWidth   = Math.max(2, C * 0.09);
            ctx.stroke();
            ctx.restore();

            // Emoji pulsando mais rápido com o perigo
            const bpulse = 1 + Math.sin(Date.now() / Math.max(40, 180 - 140 * danger)) * (0.07 + 0.13 * danger);
            ctx.save();
            ctx.translate(bx, by); ctx.scale(bpulse, bpulse);
            ctx.shadowBlur  = 8 + 22 * danger;
            ctx.shadowColor = `rgba(255, 40, 0, ${0.35 + 0.65 * danger})`;
            ctx.font = `${Math.floor(C * 0.82)}px serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('💣', 0, 1);
            ctx.restore();
        });

        // Partículas
        this.updateParticles();
        this.drawParticles();
    }

    /* ──────── TELA IDLE (sem jogo ativo) ──────── */
    drawIdle() {
        const ctx   = this.ctx;
        const C     = this.CELL;
        const theme = this.getTheme();

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth   = 0.5;
        for (let c = 0; c <= this.COLS; c++) {
            ctx.beginPath(); ctx.moveTo(c * C, 0); ctx.lineTo(c * C, this.canvas.height); ctx.stroke();
        }
        for (let r = 0; r <= this.ROWS; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * C); ctx.lineTo(this.canvas.width, r * C); ctx.stroke();
        }

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
                ctx.shadowBlur = 15; ctx.shadowColor = theme.head; ctx.fillStyle = theme.head;
            } else {
                ctx.shadowBlur = 6; ctx.shadowColor = theme.snake;
                ctx.fillStyle  = this.hexToRgba(theme.snake, 0.9 - i * 0.15);
            }
            this.roundRect(ctx,
                seg.x * C + (i === 0 ? 1 : 2),
                seg.y * C + (i === 0 ? 1 : 2),
                C - (i === 0 ? 2 : 4),
                C - (i === 0 ? 2 : 4),
                i === 0 ? 5 : 4);
            ctx.fill();
            ctx.restore();
        });

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
    setTimeout(() => { window.snakeGame = new SnakeGame(); }, 200);
});
