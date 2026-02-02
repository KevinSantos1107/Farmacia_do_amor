// ===== SPLASH SCREEN - CARREGAMENTO ESTELAR PERSONALIZADO =====

class SplashScreen {
    constructor() {
        this.canvas = document.getElementById('splashCanvas');
        this.loadingBar = document.getElementById('loadingBar');
        this.loadingText = document.getElementById('loadingText');
        this.splashScreen = document.getElementById('splashScreen');

        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.animationId = null;
        this.isLoading = true;

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

// Bloqueia a rolagem da página enquanto o splash estiver visível
document.documentElement.classList.add('splash-active');
document.body.classList.add('splash-active');

this._preventTouchMove = (e) => { 
    e.preventDefault(); 
    e.stopPropagation();
    return false;
};

this._preventWheel = (e) => { 
    e.preventDefault(); 
    e.stopPropagation();
    return false;
};

this._preventScroll = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
};

document.addEventListener('touchmove', this._preventTouchMove, { passive: false });
document.addEventListener('wheel', this._preventWheel, { passive: false });
document.addEventListener('scroll', this._preventScroll, { passive: false });

        this.initStars();
        this.startAnimation();
        this.startLoading();
    }

    initStars() {
        const starCount = Math.min(300, Math.floor((this.canvas.width * this.canvas.height) / 10000));

        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.8 + 0.2,
                twinkleSpeed: Math.random() * 0.02 + 0.01,
                twinklePhase: Math.random() * Math.PI * 2,
                brightness: Math.random()
            });
        }
    }

    drawStars() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Background gradient
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 2
        );
        gradient.addColorStop(0, 'rgba(10, 10, 26, 0.9)');
        gradient.addColorStop(0.5, 'rgba(20, 20, 40, 0.7)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw stars
        this.stars.forEach(star => {
            const time = Date.now() * star.twinkleSpeed;
            const twinkle = Math.sin(time + star.twinklePhase) * 0.3 + 0.7;

            this.ctx.save();
            this.ctx.globalAlpha = star.opacity * twinkle;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;

            // Draw star shape
            this.ctx.beginPath();
            const spikes = 4;
            const outerRadius = star.size;
            const innerRadius = star.size * 0.4;

            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI * i) / spikes;
                const x = star.x + Math.cos(angle) * radius;
                const y = star.y + Math.sin(angle) * radius;

                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();

            // Add glow effect for brighter stars
            if (star.brightness > 0.7) {
                this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
                this.ctx.shadowBlur = star.size * 3;
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }

            this.ctx.restore();
        });
    }

    startAnimation() {
        const animate = () => {
            if (!this.isLoading) return;

            this.drawStars();
            this.animationId = requestAnimationFrame(animate);
        };

        animate();
    }

    async startLoading() {
        const loadingSteps = [
            { text: 'Preparando constelações...', weight: 10 },
            { text: 'Carregando músicas...', weight: 30 },
            { text: 'Organizando memórias...', weight: 30 },
            { text: 'Configurando mapa das estrelas...', weight: 20 },
            { text: 'Finalizando...', weight: 10 }
        ];

        let totalProgress = 0;

        for (const step of loadingSteps) {
            this.loadingText.textContent = step.text;
            this.loadingText.style.animation = 'none';
            setTimeout(() => {
                this.loadingText.style.animation = 'textFade 0.5s ease-in-out';
            }, 10);

            // Simulate loading time
            await this.delay(800 + Math.random() * 400);

            totalProgress += step.weight;
            this.loadingBar.style.width = `${totalProgress}%`;

            // Actually load content during these steps
            if (step.text.includes('músicas')) {
                await this.preloadPlaylists();
            } else if (step.text.includes('memórias')) {
                await this.preloadAlbums();
            } else if (step.text.includes('mapa das estrelas')) {
                await this.preloadStarMap();
            }
        }

        // Final delay for smooth transition
        await this.delay(500);

        this.hideSplash();
    }

    async preloadPlaylists() {
        try {
            // Wait for Firebase to be ready
            if (typeof db === 'undefined') {
                console.log('⏳ Aguardando Firebase...');
                await this.waitForFirebase();
            }

            // Load playlists
            const snapshot = await db.collection('custom_playlists').get();
            console.log(`✅ ${snapshot.docs.length} playlists encontradas`);

            // Load tracks for each playlist
            for (const doc of snapshot.docs) {
                const tracksSnapshot = await db.collection('playlist_tracks')
                    .where('playlistId', '==', doc.id)
                    .get();
                console.log(`   📀 ${tracksSnapshot.docs.length} páginas de tracks carregadas`);
            }

        } catch (error) {
            console.warn('⚠️ Erro ao pré-carregar playlists:', error);
        }
    }

    async preloadAlbums() {
        try {
            if (typeof db === 'undefined') {
                await this.waitForFirebase();
            }

            const snapshot = await db.collection('albums').get();
            console.log(`✅ ${snapshot.docs.length} álbuns encontrados`);

            // Preload album covers
            for (const doc of snapshot.docs) {
                const albumData = doc.data();
                if (albumData.cover) {
                    await this.preloadImage(albumData.cover);
                }
            }

        } catch (error) {
            console.warn('⚠️ Erro ao pré-carregar álbuns:', error);
        }
    }

    async preloadStarMap() {
        try {
            if (typeof db === 'undefined') {
                await this.waitForFirebase();
            }

            // Load star map config
            const configDoc = await db.collection('star_map_config').doc('settings').get();
            if (configDoc.exists) {
                console.log('✅ Configurações do mapa das estrelas carregadas');
            }

        } catch (error) {
            console.warn('⚠️ Erro ao pré-carregar mapa das estrelas:', error);
        }
    }

    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (typeof db !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = src;
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

hideSplash() {
    this.isLoading = false;

    if (this.animationId) {
        cancelAnimationFrame(this.animationId);
    }

    this.splashScreen.classList.add('fade-out');

    setTimeout(() => {
        // Remove classes de bloqueio
        document.documentElement.classList.remove('splash-active');
        document.body.classList.remove('splash-active');
        
        // Restaura estilos inline
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.top = '';
        document.body.style.left = '';
        
        // Remove listeners
        if (this._preventTouchMove) {
            document.removeEventListener('touchmove', this._preventTouchMove);
        }
        if (this._preventWheel) {
            document.removeEventListener('wheel', this._preventWheel);
        }
        if (this._preventScroll) {
            document.removeEventListener('scroll', this._preventScroll);
        }
        
        // Esconde splash
        this.splashScreen.style.display = 'none';
        
        console.log('✨ Splash screen oculto - scroll liberado!');
    }, 1000);
}
}

// Initialize splash screen when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only show splash if not already loaded (prevent showing again on page refresh)
    if (!sessionStorage.getItem('splashShown')) {
        sessionStorage.setItem('splashShown', 'true');
        new SplashScreen();
    } else {
        // Hide splash immediately if already shown
        const splash = document.getElementById('splashScreen');
        if (splash) {
            splash.style.display = 'none';
        }
    }
});