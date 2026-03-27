/* ===================================================
   PROPOSAL.JS — Sistema de Pedido de Namoro
   Kevin & Iara 💍
   Anel com Segurar (Hold Ring Interaction)
   =================================================== */

(function () {
    'use strict';

    // ===== ESTADO =====
    const proposal = {
        noAttempts: 0,
        simVisible: false,
        musicPlaying: false,
        phase: 0,
        music: null,
        noMsgEl: null,
        noMsgTimeout: null,
        settled: false,
    };

    // ===== ESTADO DO ANEL =====
    const ring = {
        holding: false,
        holdStart: null,
        rafId: null,
        lastStage: -1,
    };

    // ===== CONSTANTES DO HOLD =====
    const HOLD_MS = 1900;
    const SIM_REVEAL_AT = 4;

    const SHAKE_STAGES = [
        { at: 0.00, cls: '',         glowA: 0.65, glowB: 0.35, auraScale: 1.0, orbitColor: 'rgba(255,140,200,.18)' },
        { at: 0.20, cls: 'shake-s',  glowA: 0.85, glowB: 0.50, auraScale: 1.2, orbitColor: 'rgba(255,140,200,.35)' },
        { at: 0.45, cls: 'shake-m',  glowA: 1.10, glowB: 0.75, auraScale: 1.5, orbitColor: 'rgba(255,160,220,.55)' },
        { at: 0.70, cls: 'shake-l',  glowA: 1.40, glowB: 1.00, auraScale: 1.9, orbitColor: 'rgba(255,180,230,.75)' },
        { at: 0.88, cls: 'shake-xl', glowA: 2.00, glowB: 1.50, auraScale: 2.5, orbitColor: 'rgba(255,210,240,.95)' },
    ];

    const noMessages = [
        { text: 'Ops, fugiu! 😂',                      emoji: '😂' },
        { text: 'Aqui não, tente de novo!',             emoji: '🏃' },
        { text: 'Esse botão tem vida própria...',       emoji: '😅' },
        { text: 'Tá ficando difícil né? 😄',            emoji: '😄' },
        { text: 'Ok, talvez o Sim seja melhor opção 💕',emoji: '💕' },
        { text: 'Definitivamente não clicável!',        emoji: '⚡' },
        { text: 'Apenas o Sim funciona aqui 💕',        emoji: '💕' },
    ];

    const hintMsgs = ['', 'Hmm... tem certeza? 🤔', 'Pensa bem...', 'Só mais uma chance...', 'Última oportunidade! 😄'];

    function $(id) { return document.getElementById(id); }

    function activateLayer(id) {
        document.querySelectorAll('.proposal-layer').forEach(el => el.classList.remove('active'));
        const t = $(id);
        if (t) t.classList.add('active');
    }

    // ===== INIT =====
    function init() {
        if (localStorage.getItem('proposal_answered') === 'true') {
            const s = $('proposalScreen');
            if (s) s.classList.add('hidden');
            return;
        }
        buildDOM();
        setupMusic();
        setupParticles();
        window.proposalAPI = { onSplashEnd };
        console.log('💍 Proposta inicializada');
    }

    // ===== BUILD DOM =====
    function buildDOM() {
        const screen = $('proposalScreen');
        if (!screen) return;

        screen.innerHTML = `
            <canvas id="proposalCanvas"></canvas>

            <!-- FASE 2: Segurar o Anel -->
            <div class="proposal-layer" id="phaseRing">
                <p class="eyebrow">✨ Tenho algo especial para você ✨</p>
                <div class="ring-wrap" id="ringWrap">
                    <div class="ring-aura" id="ringAura"></div>
                    <div class="ring-orbit" id="ringOrbit"></div>
                    <span class="ring-emoji" id="ringEmoji">💍</span>
                </div>
                <div class="hold-track" id="holdTrack">
                    <div class="hold-fill" id="holdFill"></div>
                </div>
                <p class="hold-hint" id="holdHint">Pressione e segure o anel...</p>
            </div>

            <!-- FASE 3: Pedido -->
            <div class="proposal-layer" id="phaseProposal">
                <p class="proposal-text" id="proposalText">
                    Cada conversa, cada risada,<br>
                    cada momento ao seu lado<br>
                    me mostrou que é você<br>
                    que eu quero ao meu lado.<br>
                    <span class="proposal-highlight">Você aceita ser a minha namorada?</span>
                </p>
                <div class="buttons-area" id="buttonsArea">
                    <button class="btn-no" id="btnNo">Não 😅</button>
                    <button class="btn-yes" id="btnYes">Sim 💕</button>
                </div>
                <p class="attempt-hint" id="attemptHint"></p>
                <p class="phase35-text" id="phase35Text"></p>
            </div>

            <!-- FASE 4: Aceita -->
            <div class="proposal-layer" id="phaseAccepted">
                <div class="big-ring">💍</div>
                <h1 class="accepted-title" id="acceptedTitle">Ela disse SIM! 🎉</h1>
                <p class="accepted-subtitle" id="acceptedSubtitle"></p>
            </div>

            <!-- FASE 5: Entrada -->
            <div class="proposal-layer" id="phaseEntrance">
                <p class="welcome-text">Bem-vinda ao nosso mundo, meu amor 💕</p>
            </div>

            <div class="music-indicator" id="musicIndicator">
                <div class="music-bar"></div>
                <div class="music-bar"></div>
                <div class="music-bar"></div>
                <div class="music-bar"></div>
                <div class="music-bar"></div>
            </div>
        `;

        setupRingEvents();
        setupButtonEvents();
    }

    // ===== SETUP RING EVENTS =====
    function setupRingEvents() {
        const wrap = $('ringWrap');
        if (!wrap) return;
        wrap.addEventListener('mousedown', startHold);
        wrap.addEventListener('touchstart', (e) => { e.preventDefault(); startHold(e.touches[0]); }, { passive: false });
        document.addEventListener('mouseup', cancelHold);
        document.addEventListener('touchend', cancelHold);
    }

    // ===== HOLD: INICIAR =====
    function startHold(e) {
        if (proposal.phase !== 2 || ring.holding) return;
        ring.holding  = true;
        ring.holdStart = performance.now();

        const trackEl = $('holdTrack');
        const hintEl  = $('holdHint');
        if (trackEl) trackEl.classList.add('visible');
        if (hintEl)  hintEl.style.opacity = '0';

        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? window.innerWidth  / 2;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? window.innerHeight / 2;
        spawnSparks({ clientX, clientY }, 6, ['#ffb3d9', '#ff80c0', '#fff', '#ffccee']);

        ring.rafId = requestAnimationFrame(tickHold);
    }

    // ===== HOLD: CANCELAR =====
    function cancelHold() {
        if (!ring.holding) return;
        ring.holding = false;
        if (ring.rafId) cancelAnimationFrame(ring.rafId);
        ring.lastStage = -1;

        const fillEl  = $('holdFill');
        const trackEl = $('holdTrack');
        const hintEl  = $('holdHint');
        const wrap    = $('ringWrap');
        const emojiEl = $('ringEmoji');
        const auraEl  = $('ringAura');
        const orbitEl = $('ringOrbit');

        if (fillEl)  fillEl.style.width = '0%';
        if (wrap)    wrap.classList.remove('shake-s', 'shake-m', 'shake-l', 'shake-xl');
        if (emojiEl) { emojiEl.style.filter = ''; emojiEl.style.fontSize = ''; }
        if (auraEl)  { auraEl.style.transform = 'scale(1)'; auraEl.style.opacity = '0.55'; }
        if (orbitEl) { orbitEl.style.borderColor = 'rgba(255,140,200,.18)'; orbitEl.style.boxShadow = ''; }

        if (proposal.phase === 2) {
            if (trackEl) trackEl.classList.remove('visible');
            if (hintEl)  hintEl.style.opacity = '1';
        }
    }

    // ===== HOLD: TICK (RAF) =====
    function tickHold(now) {
        if (!ring.holding) return;

        const fillEl  = $('holdFill');
        const wrap    = $('ringWrap');
        const emojiEl = $('ringEmoji');
        const auraEl  = $('ringAura');
        const orbitEl = $('ringOrbit');

        const pct = Math.min(1, (now - ring.holdStart) / HOLD_MS);
        if (fillEl) fillEl.style.width = (pct * 100) + '%';

        // Determina estágio
        let stage = SHAKE_STAGES[0];
        for (let i = SHAKE_STAGES.length - 1; i >= 0; i--) {
            if (pct >= SHAKE_STAGES[i].at) { stage = SHAKE_STAGES[i]; break; }
        }
        const idx = SHAKE_STAGES.indexOf(stage);

        if (idx !== ring.lastStage) {
            ring.lastStage = idx;
            if (wrap) {
                wrap.classList.remove('shake-s', 'shake-m', 'shake-l', 'shake-xl');
                if (stage.cls) wrap.classList.add(stage.cls);
            }
            if (orbitEl) {
                orbitEl.style.borderColor = stage.orbitColor;
                if (idx >= 2) orbitEl.style.boxShadow = `0 0 ${idx * 8}px rgba(255,160,220,${idx * 0.18})`;
            }
            if (idx > 0 && wrap) {
                const r = wrap.getBoundingClientRect();
                spawnSparks(
                    { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 },
                    idx * 4,
                    ['#ffb3d9', '#ff80c0', '#fff', '#ffd700']
                );
            }
        }

        // Glow e tamanho do emoji
        const gA = stage.glowA, gB = stage.glowB;
        if (emojiEl) {
            emojiEl.style.filter = `drop-shadow(0 0 ${18 * gA}px rgba(255,130,200,${Math.min(0.95, gA * 0.7)})) drop-shadow(0 0 ${38 * gB}px rgba(220,80,180,${Math.min(0.8, gB * 0.6)})) drop-shadow(0 0 ${60 * pct}px rgba(255,200,240,${pct * 0.5}))`;
            emojiEl.style.fontSize = (90 + pct * 18) + 'px';
        }
        if (auraEl) {
            auraEl.style.transform = `scale(${stage.auraScale})`;
            auraEl.style.opacity   = String(Math.min(1, 0.55 + pct * 0.7));
        }

        if (pct < 1) {
            ring.rafId = requestAnimationFrame(tickHold);
        } else {
            onHoldComplete();
        }
    }

    // ===== HOLD COMPLETO → explosão + fase 3 =====
    function onHoldComplete() {
        ring.holding   = false;
        ring.lastStage = -1;
        const wrap = $('ringWrap');
        if (wrap) wrap.classList.remove('shake-s', 'shake-m', 'shake-l', 'shake-xl');

        const rect = wrap ? wrap.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
        const cx = rect.left + rect.width  / 2;
        const cy = rect.top  + rect.height / 2;

        // Anéis expansivos
        [0, 120, 250].forEach((delay, i) => {
            setTimeout(() => {
                const el = document.createElement('div');
                el.className = 'burst-ring';
                const size = (180 + i * 120) + 'px';
                el.style.cssText = `left:${cx}px;top:${cy}px;width:${size};height:${size};animation-duration:${0.55 + i * 0.15}s;border-color:rgba(255,${140 + i * 30},220,${0.9 - i * 0.25})`;
                document.body.appendChild(el);
                el.addEventListener('animationend', () => el.remove());
            }, delay);
        });

        const sparkColors = ['#ffb3d9', '#ff80c0', '#fff', '#ffd700', '#ff60a0', '#ffc0e8', '#c0a0ff', '#80d0ff'];
        spawnSparks({ clientX: cx, clientY: cy }, 55, sparkColors);
        setTimeout(() => spawnSparks({ clientX: cx, clientY: cy }, 40, sparkColors), 80);
        setTimeout(() => spawnSparks({ clientX: cx, clientY: cy }, 30, ['#fff', '#ffd700', '#ffe0f0']), 180);

        const fwPositions = [
            { x: cx - 180, y: cy - 120 }, { x: cx + 180, y: cy - 120 },
            { x: cx - 220, y: cy + 80  }, { x: cx + 220, y: cy + 80  },
            { x: cx, y: cy - 200 },
            { x: cx - 100, y: cy + 150 }, { x: cx + 100, y: cy + 150 },
        ];
        fwPositions.forEach((pos, i) => {
            setTimeout(() => fireworkBurst(pos.x, pos.y, sparkColors), i * 60 + 40);
        });

        spawnReaction('✨', cx, cy - 90);
        setTimeout(() => spawnReaction('💕', cx - 55, cy - 60),  80);
        setTimeout(() => spawnReaction('🌸', cx + 55, cy - 60), 160);
        setTimeout(() => spawnReaction('💖', cx,       cy - 130), 240);

        if (proposal.music) fadeVolume(proposal.music, proposal.music.volume, 0.4, 800);
        setTimeout(() => startPhase3(), 700);
    }

    // ===== MÚSICA =====
    function setupMusic() {
        const audio   = document.createElement('audio');
        audio.loop    = true;
        audio.volume  = 0;
        audio.src     = 'audio/proposal-music.mp3';
        audio.preload = 'auto';
        document.body.appendChild(audio);
        proposal.music = audio;
    }

    function playMusic(vol = 0.3) {
        if (!proposal.music) return;
        proposal.music.play().then(() => {
            proposal.musicPlaying = true;
            fadeVolume(proposal.music, 0, vol, 2000);
            $('musicIndicator')?.classList.add('visible');
        }).catch(() => {});
    }

    function fadeVolume(audio, from, to, dur) {
        const steps = 40, dt = dur / steps, delta = (to - from) / steps;
        let cur = from;
        audio.volume = Math.max(0, Math.min(1, from));
        const iv = setInterval(() => {
            cur += delta;
            if ((delta > 0 && cur >= to) || (delta < 0 && cur <= to)) {
                audio.volume = Math.max(0, Math.min(1, to));
                clearInterval(iv);
            } else {
                audio.volume = Math.max(0, Math.min(1, cur));
            }
        }, dt);
    }

    // ===== PARTÍCULAS DE FUNDO (estrelas) =====
    function setupParticles() {
        const canvas = $('proposalCanvas');
        if (!canvas) return;
        const ctx  = canvas.getContext('2d');
        let stars  = [];

        function resize() {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            stars = [];
            const n = Math.floor((canvas.width * canvas.height) / 4800);
            for (let i = 0; i < n; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    r: Math.random() * 1.3 + 0.2,
                    o: Math.random() * 0.55 + 0.18,
                    s: Math.random() * 0.35 + 0.05,
                    p: Math.random() * Math.PI * 2,
                    hue: Math.random() > 0.5 ? '255,160,220' : '200,160,255',
                });
            }
        }

        function loop(t) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(s => {
                const fl = Math.sin(t * 0.001 * s.s + s.p) * 0.22;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${s.hue}, ${Math.max(0, Math.min(1, s.o + fl))})`;
                ctx.fill();
            });
            requestAnimationFrame(loop);
        }

        resize();
        window.addEventListener('resize', resize);
        loop(0);
    }

    // ===== UTILITÁRIOS DE PARTÍCULAS =====
    function spawnSparks(ev, count, colors) {
        let x = window.innerWidth / 2, y = window.innerHeight / 2;
        if (ev?.clientX) { x = ev.clientX; y = ev.clientY; }
        for (let i = 0; i < count; i++) {
            const sp    = document.createElement('div');
            sp.className = 'spark';
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.8;
            const dist  = 50 + Math.random() * 130;
            const col   = colors[Math.floor(Math.random() * colors.length)];
            const size  = 3 + Math.random() * 6;
            sp.style.cssText = `left:${x}px;top:${y}px;background:${col};width:${size}px;height:${size}px;box-shadow:0 0 5px ${col};--tx:${Math.cos(angle) * dist}px;--ty:${Math.sin(angle) * dist - 30}px;animation-duration:${0.45 + Math.random() * 0.6}s;`;
            document.body.appendChild(sp);
            sp.addEventListener('animationend', () => sp.remove());
        }
    }

    function spawnReaction(emo, x, y) {
        const el       = document.createElement('div');
        el.className   = 'reaction-emoji';
        el.textContent = emo;
        el.style.cssText = `left:${x - 18}px;top:${y - 18}px;`;
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
    }

    function fireworkBurst(x, y, colors) {
        const count = 18;
        for (let i = 0; i < count; i++) {
            const fw   = document.createElement('div');
            fw.className = 'firework';
            const angle = (Math.PI * 2 * i) / count;
            const dist  = 70 + Math.random() * 80;
            const col   = colors[Math.floor(Math.random() * colors.length)];
            const size  = 3 + Math.random() * 4;
            fw.style.cssText = `left:${x}px;top:${y}px;background:${col};width:${size}px;height:${size}px;box-shadow:0 0 6px ${col};--tx:${Math.cos(angle) * dist}px;--ty:${Math.sin(angle) * dist}px;animation-duration:${0.55 + Math.random() * 0.3}s;`;
            document.body.appendChild(fw);
            fw.addEventListener('animationend', () => fw.remove());
        }
    }

    // ===== SPLASH TERMINOU =====
    function onSplashEnd() {
        setTimeout(() => startPhase2(), 400);
    }

    // ===== FASE 2 — ANEL =====
    function startPhase2() {
        proposal.phase = 2;
        activateLayer('phaseRing');
        playMusic(0.2);
        console.log('💍 Fase 2: Anel — segure para revelar');
    }

    // ===== FASE 3 — PEDIDO =====
    function startPhase3() {
        proposal.phase = 3;
        activateLayer('phaseProposal');

        const btnNo  = $('btnNo');
        const btnYes = $('btnYes');
        if (btnNo)  { btnNo.style.position = 'relative'; btnNo.style.left = 'auto'; btnNo.style.top = 'auto'; }
        if (btnYes) { /* oculto via CSS (max-width: 0 / opacity: 0) */ }

        setTimeout(() => {
            const text = $('proposalText');
            if (text) text.classList.add('visible');
        }, 300);

        updateHintText();
        console.log('💬 Fase 3: Pedido');
    }

    function updateHintText() {
        const el = $('attemptHint');
        if (!el) return;
        if (proposal.noAttempts === 0) {
            el.textContent = '';
            el.classList.remove('nudge');
        } else if (proposal.noAttempts < SIM_REVEAL_AT) {
            el.textContent = hintMsgs[Math.min(proposal.noAttempts, hintMsgs.length - 1)];
            el.classList.add('nudge');
        } else {
            el.textContent = '';
        }
    }

    // ===== BOTÕES =====
    function setupButtonEvents() {
        // Fuga ao hover (desktop)
        document.addEventListener('mouseenter', (e) => {
            if (e.target?.id === 'btnNo' && proposal.phase === 3) handleNoApproach(e);
        }, true);

        // Fuga ao toque próximo (mobile)
        document.addEventListener('touchstart', (e) => {
            const b = $('btnNo');
            if (!b || proposal.phase !== 3) return;
            const t = e.touches[0];
            const r = b.getBoundingClientRect();
            const pad = 30;
            if (t.clientX >= r.left - pad && t.clientX <= r.right  + pad &&
                t.clientY >= r.top  - pad && t.clientY <= r.bottom + pad) {
                handleNoApproach(e);
            }
        }, { passive: true });

        document.addEventListener('click', (e) => {
            if (e.target?.id === 'btnNo'  && proposal.phase === 3) handleNoClick(e);
            if (e.target?.id === 'btnYes' && proposal.phase === 3) startPhase4();
        });
    }

    function getEventCoords(e) {
        if (e?.clientX  !== undefined) return { x: e.clientX, y: e.clientY };
        if (e?.touches?.[0])           return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }

    function handleNoApproach(e) {
        if (proposal.settled) { addBtnShake($('btnNo')); return; }
        proposal.noAttempts++;
        const msg = noMessages[Math.min(proposal.noAttempts - 1, noMessages.length - 1)];
        const { x, y } = getEventCoords(e);
        showNoMessage(msg.text, x, y);
        spawnReaction(msg.emoji, x, y - 50);
        runAwayBtn($('btnNo'));
        updateHintText();
        if (proposal.noAttempts >= SIM_REVEAL_AT && !proposal.simVisible) {
            setTimeout(() => startPhase35(), 600);
        }
    }

    function handleNoClick(e) {
        if (!proposal.settled) return;
        proposal.noAttempts++;
        const btnNo = $('btnNo');
        if (btnNo) runAwayBtn(btnNo);
        const msg = noMessages[Math.min((proposal.noAttempts - 1) % noMessages.length, noMessages.length - 1)];
        const { x, y } = getEventCoords(e);
        showNoMessage(msg.text, x, y);
        spawnReaction(msg.emoji, x, y - 50);
    }

    function runAwayBtn(btnNo) {
        if (!btnNo) return;
        btnNo.style.position = 'fixed';
        const m = 50, bw = btnNo.offsetWidth || 110, bh = btnNo.offsetHeight || 46;
        btnNo.style.left      = (m + Math.random() * (window.innerWidth  - bw - m * 2)) + 'px';
        btnNo.style.top       = (m + Math.random() * (window.innerHeight - bh - m * 2)) + 'px';
        btnNo.style.transform = 'none';
        btnNo.style.zIndex    = '9990';
        addBtnShake(btnNo);
    }

    function addBtnShake(btnNo) {
        if (!btnNo) return;
        btnNo.classList.remove('shaking-btn');
        void btnNo.offsetWidth;
        btnNo.classList.add('shaking-btn');
        setTimeout(() => btnNo.classList.remove('shaking-btn'), 400);
    }

    function showNoMessage(text, x, y) {
        if (proposal.noMsgEl) {
            proposal.noMsgEl.classList.add('fading');
            const old = proposal.noMsgEl;
            setTimeout(() => old.remove(), 380);
        }
        clearTimeout(proposal.noMsgTimeout);
        const msg       = document.createElement('div');
        msg.className   = 'no-attempt-msg';
        msg.textContent = text;
        msg.style.left  = Math.max(10, Math.min(window.innerWidth  - 240, x - 90)) + 'px';
        msg.style.top   = Math.max(10, Math.min(window.innerHeight -  60, y - 58)) + 'px';
        document.body.appendChild(msg);
        proposal.noMsgEl = msg;
        proposal.noMsgTimeout = setTimeout(() => {
            msg.classList.add('fading');
            setTimeout(() => msg.remove(), 380);
        }, 2100);
    }

    // ===== FASE 3.5 — SIM REVELADO =====
    function startPhase35() {
        if (proposal.simVisible) return;
        proposal.simVisible = true;
        proposal.settled    = true;

        const btnNo  = $('btnNo');
        const btnYes = $('btnYes');
        const p35    = $('phase35Text');
        const hint   = $('attemptHint');

        if (btnNo) {
            btnNo.style.position  = 'relative';
            btnNo.style.left      = 'auto';
            btnNo.style.top       = 'auto';
            btnNo.style.transform = 'none';
            btnNo.style.zIndex    = '';
        }
        if (btnYes) setTimeout(() => btnYes.classList.add('visible'), 100);
        if (p35) {
            p35.textContent = 'Deixando claro que o "não"\nnunca será uma opção entre nós 😄';
            setTimeout(() => p35.classList.add('visible'), 400);
        }
        if (hint) hint.textContent = '';

        setTimeout(() => {
            const rectBtn = $('btnYes')?.getBoundingClientRect();
            if (rectBtn) {
                spawnSparks(
                    { clientX: rectBtn.left + rectBtn.width / 2, clientY: rectBtn.top + rectBtn.height / 2 },
                    22,
                    ['#ffb3d9', '#ff80c0', '#fff', '#ffd700']
                );
                spawnReaction('💕', rectBtn.left + rectBtn.width / 2, rectBtn.top - 30);
            }
        }, 800);

        if (proposal.music) fadeVolume(proposal.music, proposal.music.volume, 0.55, 1500);
    }

    // ===== FASE 4 — SIM! =====
    function startPhase4() {
        proposal.phase = 4;
        activateLayer('phaseAccepted');
        if (proposal.music) fadeVolume(proposal.music, proposal.music.volume, 1.0, 800);

        launchBigExplosion();

        setTimeout(() => {
            const s = $('acceptedSubtitle');
            if (s) {
                s.textContent = 'O amor à primeira vista está\nvirando amor para a vida toda 💍';
                s.classList.add('visible');
            }
        }, 3500);

        setTimeout(() => { if (proposal.music) fadeVolume(proposal.music, proposal.music.volume, 0, 2000); }, 5500);
        setTimeout(() => startPhase5(), 7000);
    }

    function launchBigExplosion() {
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;

        [0, 100, 200, 320].forEach((delay, i) => {
            setTimeout(() => {
                const el = document.createElement('div');
                el.className = 'burst-ring';
                const size = (200 + i * 160) + 'px';
                el.style.cssText = `left:${cx}px;top:${cy}px;width:${size};height:${size};animation-duration:${0.6 + i * 0.15}s;border-color:rgba(255,${120 + i * 25},${180 + i * 15},${0.9 - i * 0.2})`;
                document.body.appendChild(el);
                el.addEventListener('animationend', () => el.remove());
            }, delay);
        });

        const fwColors = ['#ff80b0', '#ffb3d4', '#fff', '#ffd700', '#ff60a0', '#ffa0c8', '#c0a0ff', '#80d0ff', '#ffccff'];
        const positions = [];
        for (let i = 0; i < 12; i++) {
            positions.push({ x: 80 + Math.random() * (window.innerWidth - 160), y: 60 + Math.random() * (window.innerHeight * 0.65) });
        }
        positions.forEach((p, i) => setTimeout(() => fireworkBurst(p.x, p.y, fwColors), i * 55));

        const hearts = ['💕', '💗', '💖', '💝', '❤️', '🌹', '✨', '💫', '🌸', '💍'];
        for (let i = 0; i < 40; i++) {
            setTimeout(() => {
                const hDiv       = document.createElement('div');
                hDiv.className   = 'heart-bubble';
                hDiv.textContent = hearts[Math.floor(Math.random() * hearts.length)];
                hDiv.style.cssText = `left:${Math.random() * 100}vw;bottom:0;font-size:${1.3 + Math.random() * 2.6}rem;animation-duration:${2.2 + Math.random() * 3.8}s;`;
                document.body.appendChild(hDiv);
                hDiv.addEventListener('animationend', () => hDiv.remove());
            }, i * 55);
        }

        const confettiColors = ['#ff80b0', '#ffb3d4', '#fff', '#ffd0e8', '#ffccff', '#ff60a0', '#ffa0c8', '#ffe0f0', '#ffd700', '#c0a0ff'];
        for (let i = 0; i < 160; i++) {
            setTimeout(() => {
                const conf       = document.createElement('div');
                conf.className   = 'confetti-piece';
                conf.style.cssText = `left:${Math.random() * 100}vw;top:-20px;background:${confettiColors[Math.floor(Math.random() * confettiColors.length)]};width:${5 + Math.random() * 10}px;height:${5 + Math.random() * 10}px;border-radius:${Math.random() > 0.5 ? '50%' : '3px'};animation-duration:${2.5 + Math.random() * 4}s;`;
                document.body.appendChild(conf);
                conf.addEventListener('animationend', () => conf.remove());
            }, i * 15);
        }

        setTimeout(() => {
            for (let i = 0; i < 8; i++) {
                setTimeout(() => fireworkBurst(80 + Math.random() * (window.innerWidth - 160), 60 + Math.random() * (window.innerHeight * 0.6), fwColors), i * 70);
            }
        }, 900);
    }

    // ===== FASE 5 — ENTRADA =====
    function startPhase5() {
        proposal.phase = 5;
        activateLayer('phaseEntrance');
        localStorage.setItem('proposal_answered', 'true');
        setTimeout(() => {
            const screen = $('proposalScreen');
            if (screen) {
                screen.classList.add('fading-out');
                screen.addEventListener('animationend', () => {
                    screen.classList.add('hidden');
                    if (typeof changeTheme === 'function') changeTheme('hearts', true);
                    else localStorage.setItem('kevinIaraTheme', 'hearts');
                }, { once: true });
            }
        }, 2500);
    }

    // ===== HOOK SPLASH =====
    function hookSplashEnd() {
        const iv = setInterval(() => {
            if (window.SplashScreen && typeof window.SplashScreen.onEnd === 'function') {
                window.SplashScreen.onEnd = () => onSplashEnd();
                clearInterval(iv);
            }
        }, 50);
        // Fallback: se o splash não chamar em 10s, inicia direto
        setTimeout(() => { clearInterval(iv); if (proposal.phase < 2) onSplashEnd(); }, 10000);
    }

    // ===== START =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { init(); hookSplashEnd(); });
    } else {
        init();
        hookSplashEnd();
    }

})();