/* ===================================================
   PROPOSAL.JS — Sistema de Pedido de Namoro
   Kevin & Iara 💍
   Versão Final — Sakura Update
   =================================================== */

(function () {
    'use strict';

    // ===== CONFIGURAÇÃO =====
    const CONFIG = {
        HOLD_MS:       2800,
        SIM_REVEAL_AT: 6,
        NO_DELAY_MS:   3000,
        POEM_LINE_INTERVAL: 700,
        POEM_PAUSE_BEFORE_Q: 2500,
        POEM_Q_ANIM_MS: 900,
        VOL_INIT:      0.20,
        VOL_MID:       0.45,
        VOL_FULL:      1.00,
    };

    // ===== ESTADO =====
    const S = {
        phase:             0,
        noCount:           0,
        settled:           false,
        holding:           false,
        noMsgEl:           null,
        noMsgTimer:        null,
        externalMusic:     null,
        musicPlaying:      false,
        audioUnlockPrompt: null,
    };

    let holdStart = null;
    let holdRaf   = null;
    let lastStage = -1;
    let starsRaf  = null;

    const HOLD_ELS = {
        fill:  null,
        emoji: null,
        aura:  null,
        orbit: null,
        wrap:  null,
        track: null,
        hint:  null,
    };

    const STAGES = [
        { at:0.00, cls:'',         gA:0.65, gB:0.35, aura:1.0, orbit:'rgba(255,140,200,.18)' },
        { at:0.20, cls:'shake-s',  gA:0.85, gB:0.50, aura:1.2, orbit:'rgba(255,140,200,.35)' },
        { at:0.45, cls:'shake-m',  gA:1.10, gB:0.75, aura:1.5, orbit:'rgba(255,160,220,.55)' },
        { at:0.70, cls:'shake-l',  gA:1.40, gB:1.00, aura:1.9, orbit:'rgba(255,180,230,.75)' },
        { at:0.88, cls:'shake-xl', gA:2.00, gB:1.50, aura:2.5, orbit:'rgba(255,210,240,.95)' },
    ];

    const NO_MSGS = [
        { t:'Ei, eu fugi! 😂',                            e:'😂' },
        { t:'Aqui não, tente de novo!',                   e:'🏃' },
        { t:'Esse botão tem vida própria...',              e:'😅' },
        { t:'Tá ficando difícil né? 😄',                  e:'😄' },
        { t:'Acho que ele não quer ser clicado...',        e:'🙈' },
        { t:'Ok, talvez o Sim seja melhor opção 💕',       e:'💕' },
        { t:'Esse "não" simplesmente não existe aqui 😏',  e:'😏' },
        { t:'Definitivamente não clicável!',               e:'⚡' },
        { t:'Só o Sim funciona aqui 💕',                   e:'💕' },
    ];

    const HINTS = [
        '',
        'Hmm... tem certeza? 🤔',
        'Pensa bem...',
        'Será que é isso mesmo?',
        'Só mais uma chance...',
        'Última oportunidade! 😄',
    ];

    const SPARKS   = ['#ffb3d9','#ff80c0','#fff','#ffd700','#ff60a0','#ffc0e8','#c0a0ff','#80d0ff'];
    const CONFETTI = ['#ff80b0','#ffb3d4','#fff','#ffd0e8','#ffccff','#ff60a0','#ffa0c8','#ffe0f0','#ffd700','#c0a0ff'];
    const HEARTS   = ['💕','💗','💖','💝','❤️','🌹','✨','💫','🌸','💍'];
    const SAKURA_PETALS = ['🌸','🌺','✿'];

    const $ = id => document.getElementById(id);

    function activateLayer(id) {
        document.querySelectorAll('.proposal-layer').forEach(el => {
            if (el.id === id) {
                el.classList.remove('fading-out-layer');
                el.classList.add('active');
            } else if (el.classList.contains('active')) {
                el.classList.remove('active');
                el.classList.add('fading-out-layer');
                setTimeout(() => el.classList.remove('fading-out-layer'), 900);
            }
        });
    }

    // ===== INIT =====
    function init() {
        if (lsGet('proposal_answered') === 'true') {
            const s = $('proposalScreen');
            if (s) s.classList.add('hidden');
            return;
        }

        buildDOM();
        setupStars();
        setupMusic();

        window.proposalAPI = { onSplashEnd };
        console.log('💍 proposal.js pronto — aguardando splash');
    }

    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch(e) {} }
    function lsGet(k)    { try { return localStorage.getItem(k); } catch(e) { return null; } }

    // ===== BUILD DOM =====
    function buildDOM() {
        const screen = $('proposalScreen');
        if (!screen) return;

        screen.innerHTML = `
            <canvas id="proposalCanvas"></canvas>
            <div id="proposalFlash"></div>

            <!-- FASE 0: TOQUE PARA COMEÇAR -->
            <div class="proposal-layer" id="phaseZero">

                <!-- Coração com ECG -->
                <div class="phase0-heart-wrap">
                    <span class="phase0-icon" id="phase0Heart">💗</span>
                    <div class="phase0-ecg-wrap">
                        <svg class="phase0-ecg-svg" viewBox="0 0 200 50" preserveAspectRatio="none">
                            <line class="phase0-ecg-baseline" x1="0" y1="25" x2="200" y2="25"/>
                            <path class="phase0-ecg-path" id="ecgPath"
                                d="M0,25 L55,25 L65,25 L70,18 L75,25 L82,8 L88,42 L94,22 L100,25 L200,25"/>
                            <circle class="phase0-ecg-dot" r="3">
                                <animateMotion dur="3.8s" repeatCount="indefinite"
                                    path="M0,25 L55,25 L65,25 L70,18 L75,25 L82,8 L88,42 L94,22 L100,25 L200,25"
                                    calcMode="linear"/>
                            </circle>
                        </svg>
                    </div>
                </div>

                <!-- Divisor decorativo -->
                <div class="phase0-divider">
                    <div class="phase0-divider-line"></div>
                    <span class="phase0-divider-gem">✦</span>
                    <div class="phase0-divider-line r"></div>
                </div>

                <p class="phase0-title">A distância até tentou impedir,<br>mas a hora chegou...</p>
                <p class="phase0-name">Iara</p>
                <button class="phase0-btn" id="phase0Btn">Toque quando estiver pronta</button>

                <!-- Hint de volume -->
                <div class="phase0-volume-hint">
                    <span class="phase0-volume-icon">🔊</span>
                    <span>aumente o volume</span>
                </div>

            </div>

            <!-- FASE 1: ANEL -->
            <div class="proposal-layer" id="phaseRing">
                <p class="proposal-eyebrow">Esse anel tem algo pra te dizer...</p>
                <div class="ring-wrap" id="ringWrap">
                    <div class="ring-aura"  id="ringAura"></div>
                    <div class="ring-orbit" id="ringOrbit"></div>
                    <span class="ring-emoji" id="ringEmoji">💍</span>
                </div>
                <div class="hold-track" id="holdTrack">
                    <div class="hold-fill" id="holdFill"></div>
                </div>
                <p class="hold-hint" id="holdHint">Não solta não...</p>
            </div>

            <!-- FASE 2: PEDIDO -->
            <div class="proposal-layer" id="phaseProposal">
                <div class="proposal-poem" id="proposalPoem">
                    <span class="poem-line" id="poemLine0">Cada conversa em plena madrugada,</span>
                    <span class="poem-line" id="poemLine1">cada plano maluco que fizemos juntos</span>
                    <span class="poem-line" id="poemLine2">me mostrou que é você</span>
                    <span class="poem-line" id="poemLine3">que eu escolho todos os dias.</span>
                </div>
                <div class="proposal-question-wrap" id="proposalQuestionWrap">
                    <span class="proposal-highlight" id="proposalHighlight">Você aceita ser a minha namorada?</span>
                </div>
                <div class="buttons-area" id="buttonsArea">
                    <button class="btn-no"  id="btnNo">Não 😅</button>
                    <button class="btn-yes" id="btnYes">Sim 💕</button>
                </div>
                <p class="attempt-hint" id="attemptHint"></p>
                <p class="phase35-text" id="phase35Text">Isso é para deixar bem claro que o "não"\nnão existe e nunca será uma opção entre a gente</p>
            </div>

            <!-- FASE 3: ACEITO -->
            <div class="proposal-layer" id="phaseAccepted">
                <div class="heart-explosion">💍</div>
                <h1 class="accepted-title">SIM! 💍🎉</h1>
                <p class="accepted-subtitle">O amor que começou com um olhar\nagora se torna uma promessa para toda a eternidade 💕</p>
            </div>

            <!-- FASE 4: ENTRADA -->
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

        setupSakuraPetals();
        setupPhaseZeroEvents();
        setupHoldEvents();
        setupButtonEvents();
    }

    // ===== PÉTALAS DE SAKURA (Fase 0) =====
    function setupSakuraPetals() {
        const layer = $('phaseZero');
        if (!layer) return;
        // Menos pétalas em telas pequenas
        const count = window.innerWidth < 480 ? 10 : 16;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'phase0-petal';
            p.textContent = SAKURA_PETALS[i % SAKURA_PETALS.length];
            p.style.left             = (Math.random() * 92) + '%';
            p.style.fontSize         = (11 + Math.random() * 6) + 'px';
            p.style.animationDelay   = (Math.random() * 10) + 's';
            p.style.animationDuration= (7 + Math.random() * 6) + 's';
            layer.appendChild(p);
        }
    }

    // ===== ESTRELAS (canvas fundo geral) =====
    function setupStars() {
        const canvas = $('proposalCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let stars = [];
        let W = 0, H = 0;
        let rafPaused = false;

        function resize() {
            W = canvas.width  = window.innerWidth;
            H = canvas.height = window.innerHeight;
            stars = [];
            const n = Math.floor((W * H) / 4800); // menos estrelas — era 4200
            for (let i = 0; i < n; i++) {
                stars.push({
                    x:   Math.random() * W,
                    y:   Math.random() * H,
                    r:   Math.random() * 1.3 + 0.2,
                    o:   Math.random() * 0.55 + 0.18,
                    s:   Math.random() * 0.35 + 0.05,
                    p:   Math.random() * Math.PI * 2,
                    hue: Math.random() > 0.5 ? '255,160,220' : '200,160,255',
                });
            }
        }

        function loop(t) {
            if (rafPaused) { starsRaf = null; return; }
            ctx.clearRect(0, 0, W, H);
            const len = stars.length;
            for (let i = 0; i < len; i++) {
                const s  = stars[i];
                const fl = Math.sin(t * 0.001 * s.s + s.p) * 0.22;
                const op = fl < 0 ? Math.max(0, s.o + fl) : Math.min(1, s.o + fl);
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${s.hue},${op})`;
                ctx.fill();
            }
            starsRaf = requestAnimationFrame(loop);
        }

        // Pausa o canvas quando a aba some do foco
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                rafPaused = true;
                if (starsRaf) { cancelAnimationFrame(starsRaf); starsRaf = null; }
            } else if (S.phase <= 1) {
                rafPaused = false;
                starsRaf = requestAnimationFrame(loop);
            }
        });

        // Expõe pause para o JS poder chamar quando avança de fase
        window._starsControl = {
            pause() { rafPaused = true; if (starsRaf) { cancelAnimationFrame(starsRaf); starsRaf = null; } },
            resume() { if (!rafPaused) return; rafPaused = false; starsRaf = requestAnimationFrame(loop); },
        };

        resize();
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resize, 200);
        });
        starsRaf = requestAnimationFrame(loop);
    }

    // ===== MÚSICA =====
    function setupMusic() {
        S.externalMusic = detectExternalMusic();
        S.audioUnlockPrompt = null;
    }

    function detectExternalMusic() {
        if (window.AudioManager?.currentAudio instanceof HTMLMediaElement) {
            return window.AudioManager.currentAudio;
        }
        const foundAudio = document.querySelector('.music-player-section audio, .music-player audio');
        return foundAudio instanceof HTMLMediaElement ? foundAudio : null;
    }

    function getActiveAudio() { return S.externalMusic; }

    function syncExternalPlayerUI() {
        if (!S.externalMusic || !window.AudioManager?.findPlayerByAudio || !window.AudioManager?.updatePlayerUI) return;
        const player = window.AudioManager.findPlayerByAudio(S.externalMusic);
        if (player) window.AudioManager.updatePlayerUI(player, S.externalMusic.paused ? 'paused' : 'playing');
    }

    function fadeVol(audio, to, dur, from) {
        const targetAudio = audio || getActiveAudio();
        if (!targetAudio) return;
        const start = typeof from === 'number' ? from : targetAudio.volume;
        const startTime = performance.now();
        targetAudio.volume = Math.max(0, Math.min(1, start));

        function tick(now) {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / dur);
            targetAudio.volume = Math.max(0, Math.min(1, start + (to - start) * progress));
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    // ===== SPLASH TERMINOU =====
    function onSplashEnd() {
        console.log('✨ onSplashEnd() recebido — iniciando fase 0');
        setTimeout(startPhaseZero, 300);
    }

    // ===== FASE 0 =====
    function startPhaseZero() {
        S.phase = 0;
        document.body.classList.add('proposal-active');
        S.externalMusic = detectExternalMusic();
        activateLayer('phaseZero');
    }

    function setupPhaseZeroEvents() {
        document.addEventListener('click',    _phase0Handler);
        document.addEventListener('touchend', _phase0Handler, { passive: true });
    }

    function _phase0Handler(e) {
        if (S.phase !== 0) return;

        const btn   = $('phase0Btn');
        const heart = $('phase0Heart');
        if (!btn || !heart) return;

        const onBtn   = btn   === e.target || btn.contains(e.target);
        const onHeart = heart === e.target || heart.contains(e.target);
        if (!onBtn && !onHeart) return;

        document.removeEventListener('click',    _phase0Handler);
        document.removeEventListener('touchend', _phase0Handler);

        // Toca música DENTRO do gesto — obrigatório para iOS
        if (S.externalMusic) {
            if (window.AudioManager?.play) {
                window.AudioManager.play(S.externalMusic, window.AudioManager.currentPlayerId || null);
            }
            const p = S.externalMusic.play();
            if (p && typeof p.then === 'function') {
                p.then(() => {
                    S.musicPlaying = true;
                    $('musicIndicator')?.classList.add('visible');
                    syncExternalPlayerUI();
                    fadeVol(S.externalMusic, CONFIG.VOL_INIT, 800, 0);
                }).catch(err => console.warn('⚠️ áudio bloqueado:', err));
            }
        }

        const layer = $('phaseZero');
        if (layer) layer.classList.add('phase0-exit');
        setTimeout(startPhase1, 550);
    }

    // ===== FASE 1 — ANEL =====
    function startPhase1() {
        S.phase = 1;
        activateLayer('phaseRing');
        // Canvas de estrelas continua visível na fase 1 (fundo ainda aparece)
        // Mas pausa na fase 2+ para liberar CPU para partículas
    }

    // ===== HOLD =====
    function setupHoldEvents() {
        const wrap = $('ringWrap');
        if (!wrap) return;

        wrap.addEventListener('mousedown', onHoldStart);
        document.addEventListener('mouseup', onHoldCancel);

        wrap.addEventListener('touchstart', e => {
            e.preventDefault();
            onHoldStart(e.touches[0]);
        }, { passive: false });
        document.addEventListener('touchend',    onHoldCancel, { passive: true });
        document.addEventListener('touchcancel', onHoldCancel, { passive: true });
    }

    function onHoldStart(e) {
        if (S.phase !== 1 || S.holding) return;
        S.holding = true;
        holdStart = performance.now();
        lastStage = -1;

        HOLD_ELS.fill  = $('holdFill');
        HOLD_ELS.emoji = $('ringEmoji');
        HOLD_ELS.aura  = $('ringAura');
        HOLD_ELS.orbit = $('ringOrbit');
        HOLD_ELS.wrap  = $('ringWrap');
        HOLD_ELS.track = $('holdTrack');
        HOLD_ELS.hint  = $('holdHint');

        HOLD_ELS.track?.classList.add('visible');
        if (HOLD_ELS.hint) HOLD_ELS.hint.style.opacity = '0';

        spawnSparks(e, 6, ['#ffb3d9','#ff80c0','#fff','#ffccee']);
        holdRaf = requestAnimationFrame(tickHold);
    }

    function tickHold(now) {
        if (!S.holding) return;
        const pct = Math.min(1, (now - holdStart) / CONFIG.HOLD_MS);
        if (HOLD_ELS.fill) HOLD_ELS.fill.style.width = (pct * 100) + '%';

        let stage = STAGES[0], stageIdx = 0;
        for (let i = STAGES.length - 1; i >= 0; i--) {
            if (pct >= STAGES[i].at) { stage = STAGES[i]; stageIdx = i; break; }
        }

        if (stageIdx !== lastStage) {
            lastStage = stageIdx;
            if (HOLD_ELS.wrap) {
                HOLD_ELS.wrap.classList.remove('shake-s','shake-m','shake-l','shake-xl');
                if (stage.cls) HOLD_ELS.wrap.classList.add(stage.cls);
            }
            if (HOLD_ELS.orbit) {
                HOLD_ELS.orbit.style.borderColor = stage.orbit;
                HOLD_ELS.orbit.style.boxShadow   = stageIdx >= 2
                    ? `0 0 ${stageIdx * 8}px rgba(255,160,220,${stageIdx * 0.18})`
                    : '';
            }
            if (stageIdx > 0 && HOLD_ELS.wrap) {
                const r = HOLD_ELS.wrap.getBoundingClientRect();
                spawnSparks(
                    { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 },
                    stageIdx * 4, SPARKS
                );
            }
        }

        if (HOLD_ELS.emoji) {
            HOLD_ELS.emoji.style.filter = `
                drop-shadow(0 0 ${18 * stage.gA}px rgba(255,130,200,${Math.min(.95, stage.gA * .7)}))
                drop-shadow(0 0 ${38 * stage.gB}px rgba(220,80,180,${Math.min(.8,  stage.gB * .6)}))
                drop-shadow(0 0 ${60 * pct}px rgba(255,200,240,${pct * .5}))
            `;
            HOLD_ELS.emoji.style.fontSize = (90 + pct * 18) + 'px';
        }

        if (HOLD_ELS.aura) {
            HOLD_ELS.aura.style.transform = `scale(${stage.aura})`;
            HOLD_ELS.aura.style.opacity   = String(Math.min(1, .55 + pct * .7));
        }

        if (pct < 1) {
            holdRaf = requestAnimationFrame(tickHold);
        } else {
            onHoldComplete();
        }
    }

    function onHoldCancel() {
        if (!S.holding) return;
        S.holding = false;
        cancelAnimationFrame(holdRaf);
        lastStage = -1;

        if (HOLD_ELS.fill)  HOLD_ELS.fill.style.width   = '0%';
        if (HOLD_ELS.wrap)  HOLD_ELS.wrap.classList.remove('shake-s','shake-m','shake-l','shake-xl');
        if (HOLD_ELS.emoji) { HOLD_ELS.emoji.style.filter = ''; HOLD_ELS.emoji.style.fontSize = '90px'; }
        if (HOLD_ELS.aura)  { HOLD_ELS.aura.style.transform = 'scale(1)'; HOLD_ELS.aura.style.opacity = '.55'; }
        if (HOLD_ELS.orbit) { HOLD_ELS.orbit.style.borderColor = 'rgba(255,140,200,.18)'; HOLD_ELS.orbit.style.boxShadow = ''; }

        if (S.phase === 1) {
            HOLD_ELS.track?.classList.remove('visible');
            if (HOLD_ELS.hint) HOLD_ELS.hint.style.opacity = '1';
        }
    }

    // ===== HOLD COMPLETO =====
    function onHoldComplete() {
        S.holding = false;
        lastStage = -1;
        HOLD_ELS.wrap?.classList.remove('shake-s','shake-m','shake-l','shake-xl');

        const rect = HOLD_ELS.wrap
            ? HOLD_ELS.wrap.getBoundingClientRect()
            : { left: window.innerWidth/2, top: window.innerHeight/2, width:0, height:0 };
        const cx = rect.left + rect.width  / 2;
        const cy = rect.top  + rect.height / 2;

        fadeVol(getActiveAudio(), CONFIG.VOL_MID, 500);

        [0, 170, 360].forEach((delay, i) => {
            setTimeout(() => {
                const ring = document.createElement('div');
                ring.className = 'burst-ring';
                const sz = (180 + i * 120) + 'px';
                ring.style.cssText = `left:${cx}px;top:${cy}px;width:${sz};height:${sz};animation-duration:${.75 + i * .2}s;border-color:rgba(255,${140 + i*30},220,${.9 - i*.25})`;
                document.body.appendChild(ring);
                ring.addEventListener('animationend', () => ring.remove());
            }, delay);
        });

        spawnSparks({ clientX:cx, clientY:cy }, 55, SPARKS);
        setTimeout(() => spawnSparks({ clientX:cx, clientY:cy }, 40, SPARKS), 110);
        setTimeout(() => spawnSparks({ clientX:cx, clientY:cy }, 30, ['#fff','#ffd700','#ffe0f0']), 260);

        [
            {x:cx-180,y:cy-120},{x:cx+180,y:cy-120},
            {x:cx-220,y:cy+80 },{x:cx+220,y:cy+80 },
            {x:cx,    y:cy-200},{x:cx-100,y:cy+150},{x:cx+100,y:cy+150},
        ].forEach((p, i) => setTimeout(() => fireworkBurst(p.x, p.y, SPARKS), i * 85 + 55));

        spawnReaction('✨', cx,      cy - 90);
        setTimeout(() => spawnReaction('💕', cx - 55, cy - 60),  110);
        setTimeout(() => spawnReaction('🌸', cx + 55, cy - 60),  220);
        setTimeout(() => spawnReaction('💖', cx,      cy - 130), 330);

        setTimeout(() => startPhase2(), 900);
    }

    // ===== FASE 2 — PEDIDO =====
    function startPhase2() {
        S.phase = 2;
        // Para o canvas de estrelas — partículas vão usar essa CPU
        window._starsControl?.pause();
        activateLayer('phaseProposal');

        const area      = $('buttonsArea');
        const highlight = $('proposalHighlight');
        const qWrap     = $('proposalQuestionWrap');

        if (area)  { area.style.opacity = '0'; area.style.pointerEvents = 'none'; }
        if (qWrap) { qWrap.style.opacity = '0'; }

        const lines = ['poemLine0','poemLine1','poemLine2','poemLine3'];
        const lineDelay = 400;

        lines.forEach((id, i) => {
            setTimeout(() => {
                const el = $(id);
                if (el) el.classList.add('visible');
            }, lineDelay + i * CONFIG.POEM_LINE_INTERVAL);
        });

        const questionAt = lineDelay + lines.length * CONFIG.POEM_LINE_INTERVAL + CONFIG.POEM_PAUSE_BEFORE_Q;

        setTimeout(() => {
            if (qWrap) { qWrap.style.transition = 'opacity 0.5s ease'; qWrap.style.opacity = '1'; }
            if (highlight) highlight.classList.add('visible');

            const cx = window.innerWidth  / 2;
            const cy = window.innerHeight * 0.58;
            setTimeout(() => {
                spawnSparks({ clientX: cx, clientY: cy }, 14, ['#ffb3d9','#fff','#ffd700','#ff80c0']);
                spawnReaction('💕', cx, cy - 60);
            }, CONFIG.POEM_Q_ANIM_MS * 0.6);

            setTimeout(() => {
                if (area) {
                    area.style.transition    = 'opacity 0.7s ease';
                    area.style.opacity       = '1';
                    area.style.pointerEvents = 'auto';
                }
                updateHint();
            }, CONFIG.POEM_Q_ANIM_MS + CONFIG.NO_DELAY_MS);
        }, questionAt);
    }

    // ===== BOTÕES =====
    function setupButtonEvents() {
        const btnNo  = $('btnNo');
        const btnYes = $('btnYes');
        if (!btnNo || !btnYes) return;

        btnNo.addEventListener('mouseenter', handleNo);
        btnNo.addEventListener('touchstart', e => {
            e.preventDefault();
            handleNo(e);
        }, { passive: false });

        btnYes.addEventListener('click', () => startPhase3());
        btnYes.addEventListener('touchend', e => {
            e.preventDefault();
            startPhase3();
        }, { passive: false });
    }

    function handleNo(ev) {
        if (S.phase !== 2) return;
        S.noCount++;

        let x = window.innerWidth / 2, y = window.innerHeight / 2;
        if (ev?.clientX != null)   { x = ev.clientX; y = ev.clientY; }
        else if (ev?.touches?.[0]) { x = ev.touches[0].clientX; y = ev.touches[0].clientY; }

        const msg = NO_MSGS[Math.min(S.noCount - 1, NO_MSGS.length - 1)];
        showNoMsg(msg.t, x, y);
        spawnReaction(msg.e, x, y - 50);

        const isLastNo = S.noCount >= CONFIG.SIM_REVEAL_AT;
        if (!S.settled && !isLastNo) {
            const btn = $('btnNo');
            if (btn) {
                const bw = btn.offsetWidth || 110, bh = btn.offsetHeight || 46, margin = 16;
                btn.style.position  = 'fixed';
                btn.style.left      = (margin + Math.random() * (window.innerWidth  - bw - margin * 2)) + 'px';
                btn.style.top       = (margin + Math.random() * (window.innerHeight - bh - margin * 2)) + 'px';
                btn.style.transform = 'none';
                btn.style.zIndex    = '9990';
            }
        }

        updateHint();
        if (S.noCount >= CONFIG.SIM_REVEAL_AT && !S.settled) {
            S.settled = true;
            setTimeout(revealYes, 700);
        }
    }

    function revealYes() {
        const btnNo  = $('btnNo');
        const btnYes = $('btnYes');
        const note   = $('phase35Text');
        const hint   = $('attemptHint');

        if (btnNo) { btnNo.style.position = 'relative'; btnNo.style.left = 'auto'; btnNo.style.top = 'auto'; btnNo.style.zIndex = ''; }

        if (btnYes) {
            btnYes.classList.add('revealed');
            const r = btnYes.getBoundingClientRect();
            spawnSparks({ clientX: r.left + r.width/2, clientY: r.top + r.height/2 }, 22, ['#ffb3d9','#ff80c0','#fff','#ffd700']);
            spawnReaction('💕', r.left + r.width/2, r.top - 30);
        }

        if (note) note.classList.add('visible');
        if (hint) hint.textContent = '';
        fadeVol(getActiveAudio(), 0.6, 1000);
    }

    function updateHint() {
        const el = $('attemptHint');
        if (!el) return;
        const rem = Math.max(0, CONFIG.SIM_REVEAL_AT - S.noCount);
        if (S.noCount === 0) {
            el.textContent = ''; el.classList.remove('nudge');
        } else if (rem > 0) {
            el.textContent = HINTS[Math.min(S.noCount, HINTS.length - 1)];
            el.classList.add('nudge');
        } else {
            el.textContent = '';
        }
    }

    function showNoMsg(text, x, y) {
        if (S.noMsgEl) {
            S.noMsgEl.classList.add('fading');
            const old = S.noMsgEl;
            setTimeout(() => old.remove(), 380);
        }
        clearTimeout(S.noMsgTimer);

        const el = document.createElement('div');
        el.className   = 'no-attempt-msg';
        el.textContent = text;
el.style.position = 'fixed';
el.style.zIndex   = '99999';
el.style.left  = Math.max(10, Math.min(window.innerWidth  - 250, x - 90)) + 'px';
el.style.top   = Math.max(10, Math.min(window.innerHeight -  60, y - 58)) + 'px';
        document.body.appendChild(el);
        S.noMsgEl = el;

        S.noMsgTimer = setTimeout(() => {
            el.classList.add('fading');
            setTimeout(() => el.remove(), 380);
        }, 2100);
    }

    // ===== FASE 3 — ACEITO =====
    function startPhase3() {
        if (S.phase !== 2) return;
        S.phase = 3;
        activateLayer('phaseAccepted');
        fadeVol(getActiveAudio(), CONFIG.VOL_FULL, 600);
        launchBigExplosion();
        setTimeout(startPhase4, 7000);
    }

    // ===== FASE 4 — ENTRADA =====
    function startPhase4() {
        S.phase = 4;
        activateLayer('phaseEntrance');

        if (starsRaf) { cancelAnimationFrame(starsRaf); starsRaf = null; }

        lsSet('proposal_answered', 'true');

        if (typeof changeTheme === 'function') changeTheme('hearts', true);
        else lsSet('kevinIaraTheme', 'hearts');

        setTimeout(() => {
            const screen = $('proposalScreen');
            if (!screen) return;
            screen.classList.add('fading-out');
            screen.addEventListener('animationend', () => {
                screen.classList.add('hidden');
                document.body.classList.remove('proposal-active');
            }, { once: true });
        }, 3000);
    }

    // ===== GRANDE EXPLOSÃO =====
    function safeAppend(el, durationSec) {
        document.body.appendChild(el);
        setTimeout(() => { if (el.parentNode) el.remove(); }, (durationSec + 0.6) * 1000);
    }

    function launchBigExplosion() {
        const cx = window.innerWidth  / 2;
        const cy = window.innerHeight / 2;
        const isMobile = window.innerWidth < 480;

        [0, 140, 295, 475].forEach((delay, i) => {
            setTimeout(() => {
                const ring = document.createElement('div');
                ring.className = 'burst-ring';
                const dur = .8 + i * .2;
                const sz = (200 + i * 160) + 'px';
                ring.style.cssText = `left:${cx}px;top:${cy}px;width:${sz};height:${sz};animation-duration:${dur}s;border-color:rgba(255,${120 + i*25},${180 + i*15},${.9 - i*.2})`;
                ring.addEventListener('animationend', () => ring.remove());
                safeAppend(ring, dur);
            }, delay);
        });

        // Menos fogos em mobile
        const batchFireworks = (count, interval, offsetMs) => {
            setTimeout(() => {
                for (let i = 0; i < count; i++) {
                    setTimeout(() => fireworkBurst(
                        80 + Math.random() * (window.innerWidth  - 160),
                        60 + Math.random() * (window.innerHeight * 0.65),
                        CONFETTI
                    ), i * interval);
                }
            }, offsetMs);
        };
        if (isMobile) {
            batchFireworks(7,  90,   0);
            batchFireworks(5, 110, 1300);
        } else {
            batchFireworks(12, 75,   0);
            batchFireworks(8,  95, 1300);
        }

        // Bolhas de coração — menos em mobile
        const bubbleCount = isMobile ? 24 : 40;
        for (let i = 0; i < bubbleCount; i++) {
            setTimeout(() => {
                const b = document.createElement('div');
                b.className   = 'heart-bubble';
                b.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
                const dur = 2.8 + Math.random() * 4.2;
                b.style.cssText = `left:${Math.random()*100}vw;top:100vh;font-size:${1.3+Math.random()*2.6}rem;animation-duration:${dur}s;`;
                b.addEventListener('animationend', () => b.remove());
                safeAppend(b, dur);
            }, i * 70);
        }

        // Confetti — batches menores e menos em mobile
        const BATCH      = isMobile ? 12 : 20;
        const NUM_BATCHES = isMobile ? 5  : 8;
        for (let batch = 0; batch < NUM_BATCHES; batch++) {
            setTimeout(() => {
                const frag = document.createDocumentFragment();
                for (let j = 0; j < BATCH; j++) {
                    const p   = document.createElement('div');
                    const col = CONFETTI[Math.floor(Math.random() * CONFETTI.length)];
                    const dur = 3.2 + Math.random() * 4.8;
                    p.className = 'confetti-piece';
                    p.style.cssText = `left:${Math.random()*100}vw;top:-20px;background:${col};width:${5+Math.random()*10}px;height:${5+Math.random()*10}px;border-radius:${Math.random()>.5?'50%':'3px'};animation-duration:${dur}s;`;
                    p.addEventListener('animationend', () => p.remove());
                    frag.appendChild(p);
                    setTimeout(() => { if (p.parentNode) p.remove(); }, (dur + 0.6) * 1000);
                }
                document.body.appendChild(frag);
            }, batch * (BATCH * 20));
        }
    }

    function fireworkBurst(x, y, colors) {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < 18; i++) {
            const fw     = document.createElement('div');
            fw.className = 'firework';
            const angle  = (Math.PI * 2 * i) / 18;
            const dist   = 70 + Math.random() * 80;
            const col    = colors[Math.floor(Math.random() * colors.length)];
            const sz     = 3 + Math.random() * 4;
            const dur    = .75 + Math.random() * .4;
            fw.style.cssText = `left:${x}px;top:${y}px;background:${col};width:${sz}px;height:${sz}px;box-shadow:0 0 6px ${col};--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;animation-duration:${dur}s;`;
            fw.addEventListener('animationend', () => fw.remove());
            setTimeout(() => { if (fw.parentNode) fw.remove(); }, (dur + 0.6) * 1000);
            frag.appendChild(fw);
        }
        document.body.appendChild(frag);
    }

    function spawnSparks(ev, count, colors) {
        let x = window.innerWidth / 2, y = window.innerHeight / 2;
        if (ev?.clientX != null) { x = ev.clientX; y = ev.clientY; }

        // Reduz partículas em mobile para manter fluidez
        const finalCount = window.innerWidth < 480 ? Math.ceil(count * 0.6) : count;

        const frag = document.createDocumentFragment();
        for (let i = 0; i < finalCount; i++) {
            const sp     = document.createElement('div');
            sp.className = 'spark';
            const angle  = (Math.PI * 2 * i) / finalCount + Math.random() * 0.8;
            const dist   = 50 + Math.random() * 130;
            const col    = colors[Math.floor(Math.random() * colors.length)];
            const sz     = 3 + Math.random() * 6;
            const dur    = .6 + Math.random() * .7;
            sp.style.cssText = `left:${x}px;top:${y}px;background:${col};width:${sz}px;height:${sz}px;box-shadow:0 0 5px ${col};--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist-30}px;animation-duration:${dur}s;`;
            sp.addEventListener('animationend', () => sp.remove());
            setTimeout(() => { if (sp.parentNode) sp.remove(); }, (dur + 0.6) * 1000);
            frag.appendChild(sp);
        }
        document.body.appendChild(frag);
    }

    function spawnReaction(emoji, x, y) {
        const el = document.createElement('div');
        el.className   = 'reaction-emoji';
        el.textContent = emoji;
        el.style.cssText = `left:${x - 18}px;top:${y - 18}px;`;
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
        setTimeout(() => { if (el.parentNode) el.remove(); }, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
