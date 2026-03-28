/* ===================================================
   PROPOSAL.JS — Sistema de Pedido de Namoro
   Kevin & Iara 💍
   Versão Final — Integrado com splash-screen.js
   =================================================== */

(function () {
    'use strict';

    // ===== CONFIGURAÇÃO =====
    const CONFIG = {
        HOLD_MS:       2800,  // ms para completar o hold (era 1900)
        SIM_REVEAL_AT: 6,     // tentativas no "Não" antes do "Sim" aparecer (era 4)
        VOL_INIT:      0.20,
        VOL_MID:       0.45,
        VOL_FULL:      1.00,
    };

    // ===== ESTADO =====
    const S = {
        phase:        0,      // 0=aguardando splash, 1=anel, 2=pedido, 3=aceito, 4=entrada
        noCount:      0,
        settled:      false,
        holding:      false,
        noMsgEl:      null,
        noMsgTimer:   null,
        music:        null,
        musicPlaying: false,
    };

    // Hold
    let holdStart = null;
    let holdRaf   = null;
    let lastStage = -1;

    // Estágios progressivos do shake + brilho ao segurar o anel
    // Proporcionais ao novo HOLD_MS — os percentuais (at) não mudam,
    // mas agora cada estágio dura ~560ms em vez de ~380ms
    const STAGES = [
        { at:0.00, cls:'',         gA:0.65, gB:0.35, aura:1.0, orbit:'rgba(255,140,200,.18)' },
        { at:0.20, cls:'shake-s',  gA:0.85, gB:0.50, aura:1.2, orbit:'rgba(255,140,200,.35)' },
        { at:0.45, cls:'shake-m',  gA:1.10, gB:0.75, aura:1.5, orbit:'rgba(255,160,220,.55)' },
        { at:0.70, cls:'shake-l',  gA:1.40, gB:1.00, aura:1.9, orbit:'rgba(255,180,230,.75)' },
        { at:0.88, cls:'shake-xl', gA:2.00, gB:1.50, aura:2.5, orbit:'rgba(255,210,240,.95)' },
    ];

    // Mensagens do botão "Não" — 9 mensagens para cobrir as 6 tentativas com variedade
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

    // Hints progressivos enquanto o Sim não aparece
    const HINTS = [
        '',
        'Hmm... tem certeza? 🤔',
        'Pensa bem...',
        'Será que é isso mesmo?',
        'Só mais uma chance...',
        'Última oportunidade! 😄',
    ];

    // Paletas de partículas
    const SPARKS   = ['#ffb3d9','#ff80c0','#fff','#ffd700','#ff60a0','#ffc0e8','#c0a0ff','#80d0ff'];
    const CONFETTI = ['#ff80b0','#ffb3d4','#fff','#ffd0e8','#ffccff','#ff60a0','#ffa0c8','#ffe0f0','#ffd700','#c0a0ff'];
    const HEARTS   = ['💕','💗','💖','💝','❤️','🌹','✨','💫','🌸','💍'];

    // ===== HELPERS =====
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
        if (localStorage.getItem('proposal_answered') === 'true') {
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

    // ===== BUILD DOM =====
    function buildDOM() {
        const screen = $('proposalScreen');
        if (!screen) return;

        screen.innerHTML = `
            <canvas id="proposalCanvas"></canvas>
            <div id="proposalFlash"></div>

            <!-- FASE 1: ANEL -->
            <div class="proposal-layer" id="phaseRing">
                <p class="proposal-eyebrow">Eu tenho algo para te mostrar...</p>
                <div class="ring-wrap" id="ringWrap">
                    <div class="ring-aura"  id="ringAura"></div>
                    <div class="ring-orbit" id="ringOrbit"></div>
                    <span class="ring-emoji" id="ringEmoji">💍</span>
                </div>
                <div class="hold-track" id="holdTrack">
                    <div class="hold-fill" id="holdFill"></div>
                </div>
                <p class="hold-hint" id="holdHint">Pressione e segure o anel...</p>
            </div>

            <!-- FASE 2: PEDIDO -->
            <div class="proposal-layer" id="phaseProposal">
                <p class="proposal-text">
                    Cada conversa, cada risada,<br>
                    cada momento ao seu lado<br>
                    me mostrou que é você<br>
                    que eu quero ao meu lado.<br>
                    <span class="proposal-highlight">Você aceita ser a minha namorada?</span>
                </p>
                <div class="buttons-area">
                    <button class="btn-no"  id="btnNo">Não 😅</button>
                    <button class="btn-yes" id="btnYes">Sim 💕</button>
                </div>
                <p class="attempt-hint" id="attemptHint"></p>
                <p class="phase35-text"  id="phase35Text">Deixando claro que o "não"\nnunca será uma opção entre nós 😄</p>
            </div>

            <!-- FASE 3: ACEITO -->
            <div class="proposal-layer" id="phaseAccepted">
                <div class="heart-explosion">💍</div>
                <h1 class="accepted-title">Ela disse SIM! 🎉</h1>
                <p class="accepted-subtitle">O amor à primeira vista está\nvirando amor para a vida toda 💕</p>
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

        setupHoldEvents();
        setupButtonEvents();
    }

    // ===== ESTRELAS DE FUNDO =====
    function setupStars() {
        const canvas = $('proposalCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let stars = [];

        function resize() {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            stars = [];
            const n = Math.floor((canvas.width * canvas.height) / 4200);
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
                ctx.fillStyle = `rgba(${s.hue},${Math.max(0, Math.min(1, s.o + fl))})`;
                ctx.fill();
            });
            requestAnimationFrame(loop);
        }

        resize();
        window.addEventListener('resize', resize);
        loop(0);
    }

    // ===== MÚSICA =====
    function setupMusic() {
        const audio   = document.createElement('audio');
        audio.loop    = true;
        audio.volume  = 0;
        audio.preload = 'auto';
        audio.src     = 'audio/proposal-music.mp3';
        document.body.appendChild(audio);
        S.music = audio;
    }

    function playMusic(vol) {
        if (!S.music || S.musicPlaying) return;
        S.music.play().then(() => {
            S.musicPlaying = true;
            fadeVol(0, vol || CONFIG.VOL_INIT, 2000);
            $('musicIndicator')?.classList.add('visible');
        }).catch(() => {});
    }

    function fadeVol(from, to, dur) {
        if (!S.music) return;
        const steps = 40, dt = dur / steps, delta = (to - from) / steps;
        let cur = from;
        S.music.volume = Math.max(0, Math.min(1, from));
        const iv = setInterval(() => {
            cur += delta;
            if ((delta > 0 && cur >= to) || (delta < 0 && cur <= to)) {
                S.music.volume = Math.max(0, Math.min(1, to));
                clearInterval(iv);
            } else {
                S.music.volume = Math.max(0, Math.min(1, cur));
            }
        }, dt);
    }

    function preventScroll(e) {
        if (S.phase !== 0) {
            e.preventDefault();
        }
    }

    function lockScroll() {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        window.addEventListener('wheel', preventScroll, { passive: false });
        window.addEventListener('touchmove', preventScroll, { passive: false });
    }

    function unlockScroll() {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        window.removeEventListener('wheel', preventScroll, { passive: false });
        window.removeEventListener('touchmove', preventScroll, { passive: false });
    }

    function applyHeartTheme() {
        if (typeof changeTheme === 'function') {
            changeTheme('hearts', true);
        } else {
            localStorage.setItem('kevinIaraTheme', 'hearts');
        }
    }

    // ===== SPLASH TERMINOU =====
    function onSplashEnd() {
        console.log('✨ onSplashEnd() recebido — iniciando fase 1');
        setTimeout(startPhase1, 300);
    }

    // ===== FASE 1 — ANEL =====
    function startPhase1() {
        S.phase = 1;
        lockScroll();
        applyHeartTheme();
        activateLayer('phaseRing');
        playMusic(CONFIG.VOL_INIT);
    }

    // ===== HOLD — PRESSIONAR E SEGURAR =====
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

        $('holdTrack')?.classList.add('visible');
        const hint = $('holdHint');
        if (hint) hint.style.opacity = '0';

        spawnSparks(e, 6, ['#ffb3d9','#ff80c0','#fff','#ffccee']);
        holdRaf = requestAnimationFrame(tickHold);
    }

    function tickHold(now) {
        if (!S.holding) return;

        const pct   = Math.min(1, (now - holdStart) / CONFIG.HOLD_MS);
        const fill  = $('holdFill');
        const emoji = $('ringEmoji');
        const aura  = $('ringAura');
        const orbit = $('ringOrbit');
        const wrap  = $('ringWrap');

        if (fill) fill.style.width = (pct * 100) + '%';

        let stage = STAGES[0], stageIdx = 0;
        for (let i = STAGES.length - 1; i >= 0; i--) {
            if (pct >= STAGES[i].at) { stage = STAGES[i]; stageIdx = i; break; }
        }

        if (stageIdx !== lastStage) {
            lastStage = stageIdx;
            if (wrap) {
                wrap.classList.remove('shake-s','shake-m','shake-l','shake-xl');
                if (stage.cls) wrap.classList.add(stage.cls);
            }
            if (orbit) {
                orbit.style.borderColor = stage.orbit;
                orbit.style.boxShadow   = stageIdx >= 2
                    ? `0 0 ${stageIdx * 8}px rgba(255,160,220,${stageIdx * 0.18})`
                    : '';
            }
            if (stageIdx > 0 && wrap) {
                const r = wrap.getBoundingClientRect();
                spawnSparks(
                    { clientX: r.left + r.width/2, clientY: r.top + r.height/2 },
                    stageIdx * 4, SPARKS
                );
            }
        }

        if (emoji) {
            emoji.style.filter = `
                drop-shadow(0 0 ${18 * stage.gA}px rgba(255,130,200,${Math.min(.95, stage.gA * .7)}))
                drop-shadow(0 0 ${38 * stage.gB}px rgba(220,80,180,${Math.min(.8,  stage.gB * .6)}))
                drop-shadow(0 0 ${60 * pct}px rgba(255,200,240,${pct * .5}))
            `;
            emoji.style.fontSize = (90 + pct * 18) + 'px';
        }

        if (aura) {
            aura.style.transform = `scale(${stage.aura})`;
            aura.style.opacity   = String(Math.min(1, .55 + pct * .7));
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

        const wrap  = $('ringWrap');
        const emoji = $('ringEmoji');
        const aura  = $('ringAura');
        const orbit = $('ringOrbit');
        const fill  = $('holdFill');
        const track = $('holdTrack');
        const hint  = $('holdHint');

        if (fill)  fill.style.width   = '0%';
        if (wrap)  wrap.classList.remove('shake-s','shake-m','shake-l','shake-xl');
        if (emoji) { emoji.style.filter = ''; emoji.style.fontSize = '90px'; }
        if (aura)  { aura.style.transform = 'scale(1)'; aura.style.opacity = '.55'; }
        if (orbit) { orbit.style.borderColor = 'rgba(255,140,200,.18)'; orbit.style.boxShadow = ''; }

        if (S.phase === 1) {
            track?.classList.remove('visible');
            if (hint) hint.style.opacity = '1';
        }
    }

    function onHoldComplete() {
        S.holding = false;
        lastStage = -1;
        $('ringWrap')?.classList.remove('shake-s','shake-m','shake-l','shake-xl');

        const wrap = $('ringWrap');
        const rect = wrap
            ? wrap.getBoundingClientRect()
            : { left: window.innerWidth/2, top: window.innerHeight/2, width:0, height:0 };
        const cx = rect.left + rect.width  / 2;
        const cy = rect.top  + rect.height / 2;

        fadeVol(S.music?.volume || 0, CONFIG.VOL_MID, 500);

        [0, 120, 250].forEach((delay, i) => {
            setTimeout(() => {
                const ring = document.createElement('div');
                ring.className = 'burst-ring';
                const sz = (180 + i * 120) + 'px';
                ring.style.cssText = `left:${cx}px;top:${cy}px;width:${sz};height:${sz};animation-duration:${.55 + i * .15}s;border-color:rgba(255,${140 + i*30},220,${.9 - i*.25})`;
                document.body.appendChild(ring);
                ring.addEventListener('animationend', () => ring.remove());
            }, delay);
        });

        spawnSparks({ clientX:cx, clientY:cy }, 55, SPARKS);
        setTimeout(() => spawnSparks({ clientX:cx, clientY:cy }, 40, SPARKS), 80);
        setTimeout(() => spawnSparks({ clientX:cx, clientY:cy }, 30, ['#fff','#ffd700','#ffe0f0']), 180);

        [
            {x:cx-180,y:cy-120},{x:cx+180,y:cy-120},
            {x:cx-220,y:cy+80 },{x:cx+220,y:cy+80 },
            {x:cx,    y:cy-200},{x:cx-100,y:cy+150},{x:cx+100,y:cy+150},
        ].forEach((p, i) => setTimeout(() => fireworkBurst(p.x, p.y, SPARKS), i * 60 + 40));

        spawnReaction('✨', cx,      cy - 90);
        setTimeout(() => spawnReaction('💕', cx - 55, cy - 60),  80);
        setTimeout(() => spawnReaction('🌸', cx + 55, cy - 60), 160);
        setTimeout(() => spawnReaction('💖', cx,      cy - 130), 240);

        setTimeout(() => startPhase2(), 700);
    }

    // ===== FASE 2 — PEDIDO =====
    function startPhase2() {
        S.phase = 2;
        activateLayer('phaseProposal');
        updateHint();
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

        btnYes.addEventListener('click', startPhase3);
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

        if (!S.settled) {
            const btn = $('btnNo');
            if (btn) {
                btn.style.position  = 'fixed';
                btn.style.left      = (50 + Math.random() * (window.innerWidth  - (btn.offsetWidth  || 110) - 100)) + 'px';
                btn.style.top       = (50 + Math.random() * (window.innerHeight - (btn.offsetHeight || 46)  - 100)) + 'px';
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

        if (btnNo) {
            btnNo.style.position  = 'relative';
            btnNo.style.left      = 'auto';
            btnNo.style.top       = 'auto';
            btnNo.style.zIndex    = '';
        }

        if (btnYes) {
            btnYes.classList.add('revealed');
            const r = btnYes.getBoundingClientRect();
            spawnSparks(
                { clientX: r.left + r.width/2, clientY: r.top + r.height/2 },
                22, ['#ffb3d9','#ff80c0','#fff','#ffd700']
            );
            spawnReaction('💕', r.left + r.width/2, r.top - 30);
        }

        if (note) note.classList.add('visible');
        if (hint) hint.textContent = '';

        fadeVol(S.music?.volume || 0, 0.6, 1000);
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
        fadeVol(S.music?.volume || 0, CONFIG.VOL_FULL, 600);
        launchBigExplosion();
        setTimeout(startPhase4, 7000);
    }

    // ===== FASE 4 — ENTRADA =====
    function startPhase4() {
        S.phase = 4;
        activateLayer('phaseEntrance');
        fadeVol(S.music?.volume || 0, 0, 2500);
        localStorage.setItem('proposal_answered', 'true');

        setTimeout(() => {
            const screen = $('proposalScreen');
            if (!screen) return;
            screen.classList.add('fading-out');
            screen.addEventListener('animationend', () => {
                screen.classList.add('hidden');
                unlockScroll();
            }, { once: true });
        }, 3000);
    }

    // ===== GRANDE EXPLOSÃO — ao clicar Sim =====
    function launchBigExplosion() {
        const cx = window.innerWidth  / 2;
        const cy = window.innerHeight / 2;

        [0, 100, 210, 340].forEach((delay, i) => {
            setTimeout(() => {
                const ring = document.createElement('div');
                ring.className = 'burst-ring';
                const sz = (200 + i * 160) + 'px';
                ring.style.cssText = `left:${cx}px;top:${cy}px;width:${sz};height:${sz};animation-duration:${.6 + i * .15}s;border-color:rgba(255,${120 + i*25},${180 + i*15},${.9 - i*.2})`;
                document.body.appendChild(ring);
                ring.addEventListener('animationend', () => ring.remove());
            }, delay);
        });

        for (let i = 0; i < 12; i++) {
            setTimeout(() => fireworkBurst(
                80 + Math.random() * (window.innerWidth  - 160),
                60 + Math.random() * (window.innerHeight * 0.65),
                CONFETTI
            ), i * 55);
        }

        setTimeout(() => {
            for (let i = 0; i < 8; i++) {
                setTimeout(() => fireworkBurst(
                    80 + Math.random() * (window.innerWidth  - 160),
                    60 + Math.random() * (window.innerHeight * 0.6),
                    CONFETTI
                ), i * 70);
            }
        }, 950);

        for (let i = 0; i < 40; i++) {
            setTimeout(() => {
                const b = document.createElement('div');
                b.className   = 'heart-bubble';
                b.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
                b.style.cssText = `left:${Math.random()*100}vw;top:100vh;font-size:${1.3+Math.random()*2.6}rem;animation-duration:${2.2+Math.random()*3.8}s;`;
                document.body.appendChild(b);
                b.addEventListener('animationend', () => b.remove());
            }, i * 55);
        }

        for (let i = 0; i < 160; i++) {
            setTimeout(() => {
                const p = document.createElement('div');
                p.className = 'confetti-piece';
                const col = CONFETTI[Math.floor(Math.random() * CONFETTI.length)];
                p.style.cssText = `left:${Math.random()*100}vw;top:-20px;background:${col};width:${5+Math.random()*10}px;height:${5+Math.random()*10}px;border-radius:${Math.random()>.5?'50%':'3px'};animation-duration:${2.5+Math.random()*4}s;`;
                document.body.appendChild(p);
                p.addEventListener('animationend', () => p.remove());
            }, i * 15);
        }
    }

    // ===== FOGOS DE ARTIFÍCIO =====
    function fireworkBurst(x, y, colors) {
        for (let i = 0; i < 18; i++) {
            const fw  = document.createElement('div');
            fw.className = 'firework';
            const angle = (Math.PI * 2 * i) / 18;
            const dist  = 70 + Math.random() * 80;
            const col   = colors[Math.floor(Math.random() * colors.length)];
            const sz    = 3 + Math.random() * 4;
            fw.style.cssText = `left:${x}px;top:${y}px;background:${col};width:${sz}px;height:${sz}px;box-shadow:0 0 6px ${col};--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;animation-duration:${.55+Math.random()*.3}s;`;
            document.body.appendChild(fw);
            fw.addEventListener('animationend', () => fw.remove());
        }
    }

    // ===== FAÍSCAS =====
    function spawnSparks(ev, count, colors) {
        let x = window.innerWidth / 2, y = window.innerHeight / 2;
        if (ev?.clientX != null) { x = ev.clientX; y = ev.clientY; }

        for (let i = 0; i < count; i++) {
            const sp = document.createElement('div');
            sp.className = 'spark';
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.8;
            const dist  = 50 + Math.random() * 130;
            const col   = colors[Math.floor(Math.random() * colors.length)];
            const sz    = 3 + Math.random() * 6;
            sp.style.cssText = `left:${x}px;top:${y}px;background:${col};width:${sz}px;height:${sz}px;box-shadow:0 0 5px ${col};--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist-30}px;animation-duration:${.45+Math.random()*.6}s;`;
            document.body.appendChild(sp);
            sp.addEventListener('animationend', () => sp.remove());
        }
    }

    // ===== REAÇÕES FLUTUANTES =====
    function spawnReaction(emoji, x, y) {
        const el = document.createElement('div');
        el.className   = 'reaction-emoji';
        el.textContent = emoji;
        el.style.cssText = `left:${x - 18}px;top:${y - 18}px;`;
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
    }

    // ===== FLASH DE TELA =====
    function flashScreen(dur) {
        const fl = $('proposalFlash');
        if (!fl) return;
        fl.classList.add('flash');
        setTimeout(() => fl.classList.remove('flash'), dur || 160);
    }

    // ===== START =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();