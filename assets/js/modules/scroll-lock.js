// ===== BLOQUEIO IMEDIATO DE SCROLL - MOBILE + DESKTOP =====
(function() {
    if (!sessionStorage.getItem('splashShown')) {
        // Adiciona classes imediatamente
        document.documentElement.classList.add('splash-active');
        
        // Previne TODOS os tipos de scroll (mobile precisa de mais eventos)
        const preventScroll = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };
        
        // Desktop
        window.addEventListener('scroll', preventScroll, { passive: false });
        window.addEventListener('wheel', preventScroll, { passive: false });
        
        // Mobile (CRÍTICO)
        document.addEventListener('touchmove', preventScroll, { passive: false });
        document.addEventListener('touchstart', function(e) {
            if (e.touches.length > 1) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }, { passive: false });
        
        // Adiciona classe no body quando ele existir
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                document.body.classList.add('splash-active');
                
                // Salva posição do scroll no mobile
                const scrollY = window.pageYOffset || document.documentElement.scrollTop;
                document.body.style.top = `-${scrollY}px`;
            });
        } else {
            document.body.classList.add('splash-active');
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            document.body.style.top = `-${scrollY}px`;
        }
        
        // Observer para limpar quando o splash sumir
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'style') {
                    const splash = document.getElementById('splashScreen');
                    if (splash && splash.style.display === 'none') {
                        // Remove tudo
                        document.documentElement.classList.remove('splash-active');
                        document.body.classList.remove('splash-active');
                        
                        // Restaura scroll
                        const scrollY = document.body.style.top;
                        document.body.style.top = '';
                        if (scrollY) {
                            window.scrollTo(0, parseInt(scrollY || '0') * -1);
                        }
                        
                        window.removeEventListener('scroll', preventScroll);
                        window.removeEventListener('wheel', preventScroll);
                        document.removeEventListener('touchmove', preventScroll);
                        observer.disconnect();
                        console.log('🔓 Scroll liberado (mobile + desktop)!');
                    }
                }
            });
        });
        
        // Observa mudanças no splash
        window.addEventListener('DOMContentLoaded', function() {
            const splash = document.getElementById('splashScreen');
            if (splash) {
                observer.observe(splash, { attributes: true, attributeFilter: ['style'] });
            }
        });
    } else {
        // Se já mostrou antes, garante que não há bloqueio
        document.documentElement.classList.remove('splash-active');
        if (document.body) {
            document.body.classList.remove('splash-active');
        }
    }
})();
