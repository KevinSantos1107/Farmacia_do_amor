// ===== SISTEMA GLOBAL DE HISTÓRICO (BACK BUTTON) - VERSÃO COMPLETA =====
const HistoryManager = {
    stack: [],
    
    push(state) {
        this.stack.push(state);
        history.pushState({ customState: state }, '');
        console.log('📍 Estado adicionado:', state, '| Pilha:', this.stack.length);
    },
    
    pop() {
        if (this.stack.length > 0) {
            const state = this.stack.pop();
            console.log('⬅️ Voltando de:', state, '| Pilha restante:', this.stack.length);
            return state;
        }
        return null;
    },
    
    clear() {
        this.stack = [];
        console.log('🗑️ Histórico limpo');
    },
    
    getCurrentState() {
        return this.stack[this.stack.length - 1] || null;
    },
    
    remove(state) {
        const index = this.stack.lastIndexOf(state);
        if (index > -1) {
            this.stack.splice(index, 1);
            console.log('🗑️ Estado removido:', state);
        }
    }
};

// Interceptar botão back global
window.addEventListener('popstate', (e) => {
    const currentState = HistoryManager.pop();
    
    if (!currentState) {
        console.log('ℹ️ Pilha vazia - deixando navegador processar');
        return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    console.log('🔙 Processando back para:', currentState);
    
    switch(currentState) {
        case 'album-modal':
            document.getElementById('closeModal')?.click();
            break;
            
        case 'timeline-modal':
            document.getElementById('closeTimelineBtn')?.click();
            break;
            
        case 'secret-modal':
            document.getElementById('closeSecretBtn')?.click();
            break;
            
        case 'hamburger-menu':
            const sideMenu = document.getElementById('sideMenu');
            const menuOverlay = document.getElementById('menuOverlay');
            const hamburgerBtn = document.getElementById('hamburgerBtn');
            
            if (sideMenu && sideMenu.classList.contains('active')) {
                hamburgerBtn?.classList.remove('active');
                sideMenu.classList.remove('active');
                menuOverlay?.classList.remove('active');
                document.body.style.overflow = 'auto';
                console.log('🍔 Menu hambúrguer fechado pelo back');
            }
            break;
        
        case 'admin-modal':
            console.log('🎯 CASE ADMIN-MODAL ATIVADO!');
            const adminModal = document.getElementById('adminModal');
            
            if (adminModal) {
                adminModal.setAttribute('style', 'display: none !important;');
                document.body.style.overflow = 'auto';
                
                const editSection = document.getElementById('editAlbumSection');
                const editInfoSection = document.getElementById('editAlbumInfoSection');
                const toolbar = document.getElementById('bottomToolbar');
                const albumInfoForm = document.getElementById('albumInfoEditForm');
                
                if (editSection) editSection.style.display = 'none';
                if (editInfoSection) editInfoSection.style.display = 'none';
                if (toolbar) toolbar.style.display = 'none';
                if (albumInfoForm) albumInfoForm.style.display = 'none';
                
                console.log('🔐 Admin fechado pelo back');
            }
            break;
            
        case 'album-info-edit':
            const albumInfoForm2 = document.getElementById('albumInfoEditForm');
            const toggleBtn = document.getElementById('toggleAlbumInfoEdit');
            
            if (albumInfoForm2 && albumInfoForm2.style.display !== 'none') {
                albumInfoForm2.style.display = 'none';
                if (toggleBtn) {
                    toggleBtn.innerHTML = '<i class="fas fa-edit"></i><span>Editar Álbum</span>';
                }
                console.log('✏️ Formulário de edição fechado pelo back');
            }
            break;
            
        case 'reorganize-mode':
            if (typeof isReorganizing !== 'undefined' && isReorganizing) {
                if (typeof exitReorganizeMode === 'function') {
                    exitReorganizeMode(false);
                }
                console.log('🔄 Modo reorganizar cancelado pelo back');
            }
            break;
            
        case 'edit-mode-selection':
            if (typeof cancelSelection === 'function') {
                cancelSelection();
                console.log('☑️ Seleção cancelada pelo back');
            }
            break;
            
        case 'edit-tab':
            const editTab = document.getElementById('edit-tab');
            const createTab = document.querySelector('[data-tab="create"]');
            
            if (editTab && createTab) {
                editTab.classList.remove('active');
                document.getElementById('create-tab')?.classList.add('active');
                
                document.querySelectorAll('.admin-tab').forEach(tab => {
                    tab.classList.remove('active');
                    if (tab.dataset.tab === 'create') {
                        tab.classList.add('active');
                    }
                });
                
                console.log('📝 Voltou para aba de criação');
            }
            break;
            
        default:
            console.warn('⚠️ Estado desconhecido:', currentState);
    }
    
    if (HistoryManager.stack.length > 0) {
        history.pushState({ customState: HistoryManager.getCurrentState() }, '');
    }
});

// ===== CONFIGURAÇÕES INICIAIS =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando site Kevin & Iara...');
    
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    
    if (!hamburgerBtn || !sideMenu || !menuOverlay) {
        console.error('❌ ERRO CRÍTICO: Elementos do menu não encontrados!');
        return;
    }
    
    console.log('✅ Elementos do menu encontrados');
    
    setTimeout(() => {
        if (typeof initAnimations === 'function') {
            initAnimations();
        }
    }, 100);
    
    setTimeout(() => {
        const savedTheme = loadSavedTheme();
        if (savedTheme && themes[savedTheme]) {
            console.log(`🎯 Aplicando tema salvo: ${themes[savedTheme].name}`);
            currentTheme = savedTheme;
            changeTheme(savedTheme, false);
        }
    }, 200);
    
    setTimeout(() => {
        initThemeSelector();
        initTimeCounter();

        initMessages();
        initModal();
        initTimelineModal();
        initHamburgerMenu();
        updateCurrentDate();
        
        console.log('✅ Site inicializado com sucesso!');
    }, 300);
});

// ===== CONFIGURAÇÕES DE DATAS =====
const START_DATE = new Date('2025-10-11T00:00:00');
const START_DATE_DISPLAY = '11/10/2025';

// ===== SISTEMA DE TEMAS =====
const themes = {
    meteors: {
        name: 'Meteoros',
        colors: {
            bg: '#0a0e17',
            primary: '#6a11cb',
            secondary: '#2575fc',
            accent: '#ff6b8b',
            text: '#ffffff',
            textSecondary: '#b8b8d1'
        }
    },
    hearts: {
        name: 'Chuva de Corações',
        colors: {
            bg: '#1a0b2e',
            primary: '#ff2e63',
            secondary: '#ff9a9e',
            accent: '#ffd166',
            text: '#ffffff',
            textSecondary: '#e0c3fc'
        }
    },
    aurora: {
        name: 'Aurora Boreal',
        colors: {
            bg: '#0c1b33',
            primary: '#00b4d8',
            secondary: '#90e0ef',
            accent: '#caf0f8',
            text: '#ffffff',
            textSecondary: '#a8dadc'
        }
    },
    winter: {
        name: 'Inverno Mágico',
        colors: {
            bg: '#1a2332',
            primary: '#e3f2fd',
            secondary: '#81d4fa',
            accent: '#b3e5fc',
            text: '#ffffff',
            textSecondary: '#e1f5fe'
        }
    }
};

let currentTheme = 'meteors';

function saveTheme(themeName) {
    try {
        localStorage.setItem('kevinIaraTheme', themeName);
        console.log(`💾 Tema "${themes[themeName].name}" salvo no navegador`);
    } catch (error) {
        console.warn('⚠️ Não foi possível salvar o tema:', error);
    }
}

function loadSavedTheme() {
    try {
        const savedTheme = localStorage.getItem('kevinIaraTheme');
        
        if (savedTheme && themes[savedTheme]) {
            setTimeout(() => {
                const themeButtons = document.querySelectorAll('.theme-btn');
                themeButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.theme === savedTheme) {
                        btn.classList.add('active');
                    }
                });
            }, 100);
            
            console.log(`✅ Tema "${themes[savedTheme].name}" carregado`);
            return savedTheme;
        }
        return 'meteors';
    } catch (error) {
        console.warn('⚠️ Erro ao carregar tema:', error);
        return 'meteors';
    }
}

function initThemeSelector() {
    const themeButtons = document.querySelectorAll('.theme-btn');
    
    themeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const theme = this.dataset.theme;
            
            themeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            changeTheme(theme, true);
            
            if (window.Animations && typeof window.Animations.changeTheme === 'function') {
                window.Animations.changeTheme(theme);
            }
        });
    });
}

function changeTheme(themeName, shouldSave = true) {
    if (!themes[themeName]) return;
    
    currentTheme = themeName;
    const theme = themes[themeName];
    
    document.body.className = '';
    document.body.classList.add(`theme-${themeName}`);
    
    const root = document.documentElement;
    root.style.setProperty('--theme-bg', theme.colors.bg);
    root.style.setProperty('--theme-primary', theme.colors.primary);
    root.style.setProperty('--theme-secondary', theme.colors.secondary);
    root.style.setProperty('--theme-accent', theme.colors.accent);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary);
    
    if (shouldSave) {
        saveTheme(themeName);
    }
    
    if (window.Animations && typeof window.Animations.changeTheme === 'function') {
        window.Animations.changeTheme(themeName);
    }
    
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === themeName) {
            btn.classList.add('active');
        }
    });
    
    const themeCards = document.querySelectorAll('.theme-card');
    themeCards.forEach(card => {
        card.classList.remove('active');
        if (card.dataset.theme === themeName) {
            card.classList.add('active');
        }
    });
    
    console.log(`🎨 Tema alterado para: ${theme.name}`);
}

// ===== CONTADOR DE TEMPO =====
function initTimeCounter() {
    document.getElementById('startDateDisplay').textContent = START_DATE_DISPLAY;
    updateTimeCounter();
    setInterval(updateTimeCounter, 1000);
}

function updateTimeCounter() {
    const now = new Date();
    const diff = now - START_DATE;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const years = Math.floor(days / 365.25);
    const months = Math.floor((days % 365.25) / 30.44);
    const remainingDays = Math.floor(days % 30.44);
    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    
    document.getElementById('years').textContent = years.toString().padStart(2, '0');
    document.getElementById('months').textContent = months.toString().padStart(2, '0');
    document.getElementById('days').textContent = remainingDays.toString().padStart(2, '0');
    document.getElementById('hours').textContent = remainingHours.toString().padStart(2, '0');
    document.getElementById('minutes').textContent = remainingMinutes.toString().padStart(2, '0');
    document.getElementById('seconds').textContent = remainingSeconds.toString().padStart(2, '0');
}

// ===== ÁLBUNS DE FOTOS (CARREGADOS DO FIREBASE) =====
// Inicializar array vazio - será preenchido pelo Firebase
window.albums = [];

let currentAlbum = null;
let currentPhotoIndex = 0;
const preloadCache = new Map();

let zoomLevel = 1;
let isDragging = false;
let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;
let tapStartX = 0;
let tapStartY = 0;
let tapStartTime = 0;
let isTapping = false;
let tapTimeout = null;
const TAP_THRESHOLD = 10;
const TAP_DURATION = 300;
const TAP_DELAY = 250;

let lastTouchTime = 0;
let touchStartTime = 0;
let touchEndX = 0;
let lastGestureTime = Date.now();
let isPinching = false;
let initialPinchDistance = 0;
let lastPinchDistance = 0;
let blockNavigation = false;
let doubleTapTimeout = null;
let touchCount = 0;

function getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function resetZoom() {
    const modalPhoto = document.getElementById('modalPhoto');
    
    if (modalPhoto) {
        modalPhoto.classList.add('zoom-transition');
    }
    
    zoomLevel = 1;
    translateX = 0;
    translateY = 0;
    isDragging = false;
    isPinching = false;
    blockNavigation = false;
    updateImageTransform();
    
    setTimeout(() => {
        if (modalPhoto) {
            modalPhoto.classList.remove('zoom-transition');
        }
    }, 300);
    
    lastGestureTime = Date.now();
}

function updateImageTransform() {
    const modalPhoto = document.getElementById('modalPhoto');
    if (!modalPhoto) return;
    
    modalPhoto.classList.remove('slide-out-left', 'slide-out-right', 'slide-in-left', 'slide-in-right', 'active');
    
    modalPhoto.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoomLevel})`;
    modalPhoto.style.cursor = zoomLevel > 1 ? 'grab' : 'pointer';
}

function handleZoom(delta, centerX, centerY) {
    const oldZoom = zoomLevel;
    
    if (delta > 0) {
        zoomLevel = Math.min(zoomLevel * 1.05, 4);
    } else {
        zoomLevel = Math.max(zoomLevel * 0.95, 1);
    }
    
    if (zoomLevel === 1) {
        translateX = 0;
        translateY = 0;
        isDragging = false;
    } else if (centerX !== undefined && centerY !== undefined) {
        const modalPhoto = document.getElementById('modalPhoto');
        const rect = modalPhoto.getBoundingClientRect();
        
        const offsetX = centerX - rect.left - rect.width / 2;
        const offsetY = centerY - rect.top - rect.height / 2;
        
        const zoomRatio = zoomLevel / oldZoom - 1;
        translateX -= offsetX * zoomRatio;
        translateY -= offsetY * zoomRatio;
    }
    
    updateImageTransform();
}

function handleDoubleTap(x, y) {
    console.log('🔍 Duplo toque/clique detectado! Zoom atual:', zoomLevel);

    isTapping = false;
    blockNavigation = true;
    
    const modalPhoto = document.getElementById('modalPhoto');
    if (!modalPhoto) return;
    
    if (zoomLevel === 1) {
        zoomLevel = 2;
        
        const rect = modalPhoto.getBoundingClientRect();
        const offsetX = x - rect.left - rect.width / 2;
        const offsetY = y - rect.top - rect.height / 2;
        
        translateX = -offsetX * (zoomLevel - 1);
        translateY = -offsetY * (zoomLevel - 1);
        
        updateImageTransform();
        blockNavigation = true;
        console.log('✅ Zoom IN aplicado');
    } else {
        resetZoom();
        console.log('✅ Zoom OUT aplicado');
    }
    
    setTimeout(() => {
        if (zoomLevel === 1) {
            blockNavigation = false;
        }
    }, 150);
}

function initModal() {
    const modal = document.getElementById('albumModal');
    const closeBtn = document.getElementById('closeModal');
    const prevBtn = document.getElementById('prevPhotoBtn');
    const nextBtn = document.getElementById('nextPhotoBtn');
    const albumViewer = document.querySelector('.album-viewer');
    const modalPhoto = document.getElementById('modalPhoto');
    
    if (!modal || !closeBtn || !prevBtn || !nextBtn || !albumViewer || !modalPhoto) {
        console.warn('⚠️ Elementos do modal não encontrados');
        return;
    }
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        resetZoom();
    });
    
    prevBtn.addEventListener('click', () => {
        if (zoomLevel > 1) return;
        
        if (currentAlbum) {
            currentPhotoIndex = (currentPhotoIndex - 1 + currentAlbum.photos.length) % currentAlbum.photos.length;
            updateAlbumViewer();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (zoomLevel > 1) return;
        
        if (currentAlbum) {
            currentPhotoIndex = (currentPhotoIndex + 1) % currentAlbum.photos.length;
            updateAlbumViewer();
        }
    });
    
    modalPhoto.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleDoubleTap(e.clientX, e.clientY);
    });
    
    albumViewer.addEventListener('wheel', (e) => {
        e.preventDefault();
        handleZoom(-e.deltaY, e.clientX, e.clientY);
    }, { passive: false });
    
    let touchStart = {};
    
    albumViewer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const now = Date.now();
        const touches = e.touches;
        
        if (tapTimeout) {
            clearTimeout(tapTimeout);
            tapTimeout = null;
        }
        
        if (touches.length === 1 && zoomLevel === 1) {
            isTapping = true;
            tapStartX = touches[0].clientX;
            tapStartY = touches[0].clientY;
            tapStartTime = now;
        }
        
        for (let i = 0; i < touches.length; i++) {
            touchStart[i] = {
                x: touches[i].clientX,
                y: touches[i].clientY
            };
        }
        
        touchCount = touches.length;
        
        if (touches.length === 2) {
            console.log('🔍 Pinch detectado (2 dedos)');
            isPinching = true;
            isTapping = false;
            initialPinchDistance = getTouchDistance(touches[0], touches[1]);
            lastPinchDistance = initialPinchDistance;
            
            if (doubleTapTimeout) {
                clearTimeout(doubleTapTimeout);
                doubleTapTimeout = null;
            }
            return;
        }
        
        if (touches.length === 1) {
            const touch = touches[0];
            const timeSinceLastTouch = now - lastTouchTime;
            
            if (timeSinceLastTouch < 300 && timeSinceLastTouch > 0) {
                console.log('👆👆 Duplo toque detectado');
                isTapping = false;
                if (tapTimeout) {
                    clearTimeout(tapTimeout);
                    tapTimeout = null;
                    console.log('❌ Tap pendente cancelado pelo duplo toque');
                }
                
                blockNavigation = true;
                handleDoubleTap(touch.clientX, touch.clientY);
                
                setTimeout(() => {
                    blockNavigation = false;
                }, 100);
                
                lastTouchTime = 0;
                return;
            }
            
            if (zoomLevel > 1) {
                isTapping = false;
                isDragging = true;
                startX = touch.clientX - translateX;
                startY = touch.clientY - translateY;
                modalPhoto.style.cursor = 'grabbing';
            }
            
            lastTouchTime = now;
        }
    }, { passive: false });
    
    albumViewer.addEventListener('touchmove', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const touches = e.touches;
        lastGestureTime = Date.now();

        if (isTapping && touches.length === 1) {
            const moveX = Math.abs(touches[0].clientX - tapStartX);
            const moveY = Math.abs(touches[0].clientY - tapStartY);
            
            if (moveX > TAP_THRESHOLD || moveY > TAP_THRESHOLD) {
                isTapping = false;
                
                if (tapTimeout) {
                    clearTimeout(tapTimeout);
                    tapTimeout = null;
                }
                
                console.log('❌ Tap cancelado - movimento detectado');
            }
        }
        
        if (touches.length === 2 && isPinching) {
            blockNavigation = true;
            isTapping = false;
            
            const currentDistance = getTouchDistance(touches[0], touches[1]);
            const delta = currentDistance - lastPinchDistance;
            
            const centerX = (touches[0].clientX + touches[1].clientX) / 2;
            const centerY = (touches[0].clientY + touches[1].clientY) / 2;
            
            const zoomFactor = 0.01;
            if (delta !== 0) {
                const oldZoom = zoomLevel;
                
                if (delta > 0) {
                    zoomLevel = Math.min(zoomLevel * (1 + delta * zoomFactor), 4);
                } else {
                    zoomLevel = Math.max(zoomLevel / (1 - delta * zoomFactor), 1);
                }
                
                const zoomChange = zoomLevel / oldZoom;
                const rect = modalPhoto.getBoundingClientRect();
                const offsetX = centerX - rect.left - rect.width / 2;
                const offsetY = centerY - rect.top - rect.height / 2;
                
                translateX = translateX * zoomChange - offsetX * (zoomChange - 1);
                translateY = translateY * zoomChange - offsetY * (zoomChange - 1);
                
                updateImageTransform();
            }
            
            lastPinchDistance = currentDistance;
        }
        
        else if (touches.length === 1 && isDragging && zoomLevel > 1) {
            blockNavigation = true;
            isTapping = false;
            
            const touch = touches[0];
            translateX = touch.clientX - startX;
            translateY = touch.clientY - startY;
            updateImageTransform();
        }
    }, { passive: false });
    
    albumViewer.addEventListener('touchend', (e) => {
        const touches = e.touches;
        const changedTouch = e.changedTouches[0];
        
        if (isTapping && touches.length === 0 && zoomLevel === 1 && !blockNavigation) {
            const tapDuration = Date.now() - tapStartTime;
            const moveX = Math.abs(changedTouch.clientX - tapStartX);
            const moveY = Math.abs(changedTouch.clientY - tapStartY);
            
            if (tapDuration < TAP_DURATION && 
                moveX < TAP_THRESHOLD && 
                moveY < TAP_THRESHOLD) {
                
                if (tapTimeout) {
                    clearTimeout(tapTimeout);
                }
                
                const savedTapX = tapStartX;
                
                tapTimeout = setTimeout(() => {
                    if (zoomLevel === 1 && !blockNavigation && !isPinching && !isDragging) {
                        console.log('✅ Tap confirmado após delay');
                        handleTapNavigation(savedTapX);
                    } else {
                        console.log('❌ Tap cancelado - condições mudaram');
                    }
                    tapTimeout = null;
                }, TAP_DELAY);
                
                console.log('⏳ Aguardando confirmação do tap...');
            }
            
            isTapping = false;
        }
        
        if (touches.length === 0) {
            if (isPinching) {
                console.log('✅ Pinch finalizado');
                isPinching = false;
                
                if (zoomLevel > 1) {
                    blockNavigation = true;
                    setTimeout(() => {
                        blockNavigation = false;
                        console.log('🔓 Navegação liberada após pinch');
                    }, 300);
                }
            }
            
            if (isDragging) {
                console.log('✅ Drag finalizado');
                isDragging = false;
                modalPhoto.style.cursor = zoomLevel > 1 ? 'grab' : 'pointer';
                
                if (zoomLevel > 1) {
                    blockNavigation = true;
                }
            }
            
            if (!isPinching && !isDragging && zoomLevel === 1) {
                blockNavigation = false;
            }
            
            touchCount = 0;
        }
        
        else if (touches.length === 1 && isPinching) {
            console.log('🔄 Transição: pinch → drag');
            isPinching = false;
            isDragging = true;
            isTapping = false;
            
            const touch = touches[0];
            startX = touch.clientX - translateX;
            startY = touch.clientY - translateY;
            modalPhoto.style.cursor = 'grabbing';
        }
    });
    
    let swipeStartX = 0;
    let swipeStartTime = 0;
    
    modal.addEventListener('touchstart', (e) => {
        if (touchCount === 0 && !isPinching && !isDragging && zoomLevel === 1) {
            swipeStartX = e.changedTouches[0].screenX;
            swipeStartTime = Date.now();
        }
    }, { passive: true });
    
    
    modal.addEventListener('touchend', (e) => {
        if (!isPinching && !isDragging && !blockNavigation && zoomLevel === 1) {
            const swipeEndX = e.changedTouches[0].screenX;
            const touchDuration = Date.now() - swipeStartTime;
            
            if (touchDuration < 300) {
                handleSwipe(swipeStartX, swipeEndX);
            }
        }
    }, { passive: true });
    
    function handleSwipe(startX, endX) {
        if (blockNavigation || zoomLevel > 1 || isPinching || isDragging) {
            console.log('🚫 Swipe bloqueado');
            return;
        }
        
        const swipeThreshold = 50;
        const diff = startX - endX;
        
        if (Math.abs(diff) > swipeThreshold) {
            console.log('✅ Swipe detectado - navegando');
            if (diff > 0) {
                nextBtn.click();
            } else {
                prevBtn.click();
            }
        }
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeBtn.click();
        }
    });
    
    document.addEventListener('keydown', (event) => {
        if (modal.style.display === 'flex') {
            if (event.key === 'Escape') {
                closeBtn.click();
            } else if (event.key === 'ArrowLeft') {
                prevBtn.click();
            } else if (event.key === 'ArrowRight') {
                nextBtn.click();
            }
        }
    });
    
    console.log('✅ Modal inicializado com gestos separados');
}

function handleTapNavigation(tapX) {
    if (blockNavigation || zoomLevel > 1 || isPinching || isDragging) {
        console.log('🚫 Tap navigation bloqueada');
        return;
    }
    
    const screenWidth = window.innerWidth;
    const middlePoint = screenWidth / 2;
    
    if (tapX < middlePoint) {
        console.log('👈 Tap esquerda: foto anterior');
        const prevBtn = document.getElementById('prevPhotoBtn');
        if (prevBtn) {
            prevBtn.click();
        }
    } else {
        console.log('👉 Tap direita: próxima foto');
        const nextBtn = document.getElementById('nextPhotoBtn');
        if (nextBtn) {
            nextBtn.click();
        }
    }
}

// ===== CARROSSEL 3D PROFISSIONAL - GESTOS PRECISOS =====
class AlbumsCarousel3D {
    constructor() {
        this.currentIndex = 0;
        this.previousIndex = 0;
        this.track = document.getElementById('carouselTrack');
        this.indicators = document.getElementById('carouselIndicators');
        
        // ===== CONTROLES DE GESTO - SISTEMA PROFISSIONAL =====
        this.gesture = {
            // Estado do gesto
            isActive: false,
            type: null, // 'tap', 'drag', 'scroll'
            
            // Posições
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            lastX: 0,
            lastY: 0,
            
            // Medições
            distanceX: 0,
            distanceY: 0,
            velocity: 0,
            
            // Timing
            startTime: 0,
            lastMoveTime: 0,
            
            // Configurações
            tapMaxDistance: 10,
            tapMaxDuration: 200,
            dragThreshold: 80,
            directionThreshold: 20,
            velocityThreshold: 0.3
        };
        
        // ===== CONTROLES DE NAVEGAÇÃO - OTIMIZADO =====
        this.navigation = {
            isAnimating: false,
            animationDuration: 300, 
            debounceTime: 30, 
            lastNavigationTime: 0
        };
        
        // ===== CONTROLES DE CLIQUE EM CARDS =====
        this.cardClick = {
            enabled: true,
            tapData: new Map()
        };
        
        this.init();
    }
    
    init() {
        if (!this.track || window.albums.length === 0) {
            console.warn('⚠️ Carrossel não inicializado');
            return;
        }
        
        this.renderCards();
        this.renderIndicators('forward')
        this.updatePositions();
        this.attachEvents();
        
        console.log(`✅ Carrossel profissional inicializado com ${window.albums.length} álbuns`);
    }
    
    renderCards() {
        this.track.innerHTML = '';
        
        window.albums.forEach((album, index) => {
            const card = document.createElement('div');
            card.className = 'carousel-album-card';
            card.dataset.index = index;
            card.dataset.id = album.id;
            
            card.innerHTML = `
                <img src="${album.cover}" alt="${album.title}" class="carousel-album-cover lazy-image" loading="lazy">
                <div class="carousel-album-info">
                    <h3>${album.title}</h3>
                    <p class="carousel-album-date">
                        <i class="far fa-calendar-alt"></i> ${album.date}
                    </p>
                    <p class="carousel-album-stats">
                        <i class="far fa-images"></i> ${album.photoCount} ${album.photoCount === 1 ? 'foto' : 'fotos'}
                    </p>
                </div>
            `;
            
            this.track.appendChild(card);
        });
    }

renderIndicators(direction = 'forward') {
    if (!this.indicators) return;
    
    const VISIBLE = 4;
    const total = window.albums.length;
    
    // ===== CASO SIMPLES: 4 OU MENOS ÁLBUNS =====
    if (total <= VISIBLE) {
        this.indicators.innerHTML = '';
        for (let i = 0; i < total; i++) {
            const dot = this.createDot(i);
            this.indicators.appendChild(dot);
        }
        console.log('📍 Modo simples (≤4 álbuns)');
        return;
    }
    
    // ===== DETECTAR LOOP INFINITO (SALTO EXTREMO) =====
    const current = this.currentIndex;
    const prev = this.previousIndex;
    
    // Loop: última → primeira (voltando)
    const isLoopBackward = prev === total - 1 && current === 0;
    
    // Loop: primeira → última (avançando)
    const isLoopForward = prev === 0 && current === total - 1;
    
    if (isLoopBackward || isLoopForward) {
        console.log(`🔁 LOOP DETECTADO: ${prev} → ${current}`);
        
        // RESET INSTANTÂNEO sem animação
        this.indicators.innerHTML = '';
        
        let start, end;
        
        if (isLoopBackward) {
            // Voltou para o início: mostrar [0,1,2,3]
            start = 0;
            end = 3;
        } else {
            // Avançou para o final: mostrar últimos 4
            start = total - 4;
            end = total - 1;
        }
        
        for (let i = start; i <= end; i++) {
            this.indicators.appendChild(this.createDot(i));
        }
        
        console.log(`✨ Reset no loop: [${start}-${end}]`);
        return;
    }
    
    // ===== CALCULAR RANGE - LÓGICA NORMAL =====
    
    let start, end;
    
    if (direction === 'forward') {
        // AVANÇANDO: índice atual fica na POSIÇÃO 2 (3ª bolinha)
        
        if (current <= 2) {
            start = 0;
            end = 3;
        } else if (current >= total - 1) {
            start = total - 4;
            end = total - 1;
        } else {
            start = current - 2;
            end = current + 1;
        }
        
    } else if (direction === 'backward') {
        // VOLTANDO: índice atual fica na POSIÇÃO 1 (2ª bolinha)
        
        if (current >= total - 2) {
            start = total - 4;
            end = total - 1;
        } else if (current <= 1) {
            start = 0;
            end = 3;
        } else {
            start = current - 1;
            end = current + 2;
        }
        
    } else {
        // INICIAL/CLIQUE: centralizar o índice
        if (current <= 1) {
            start = 0;
            end = 3;
        } else if (current >= total - 2) {
            start = total - 4;
            end = total - 1;
        } else {
            start = current - 1;
            end = current + 2;
        }
    }
    
    // Garantir limites válidos
    start = Math.max(0, start);
    end = Math.min(total - 1, end);
    
    console.log(`🎯 [${start}-${end}] | atual=${current} | dir=${direction}`);
    
    // ===== PEGAR ÍNDICES ANTIGOS =====
    const oldDots = Array.from(this.indicators.children);
    const oldIndices = oldDots.map(d => parseInt(d.dataset.index));
    
    // ===== DETECTAR RESET (SALTO GRANDE NORMAL) =====
    let isReset = false;
    
    if (oldIndices.length > 0) {
        const oldMin = Math.min(...oldIndices);
        const oldMax = Math.max(...oldIndices);
        
        // Reset se o novo range está muito longe do antigo
        isReset = start > oldMax + 1 || end < oldMin - 1;
        
        if (isReset) {
            console.log('🔄 RESET - Salto grande detectado');
        }
    }
    
    // ===== APLICAR MUDANÇAS =====
    
    if (isReset) {
        // RESET INSTANTÂNEO: limpar tudo
        this.indicators.innerHTML = '';
        
        for (let i = start; i <= end; i++) {
            this.indicators.appendChild(this.createDot(i));
        }
        
        console.log('✨ Reset instantâneo normal');
        
    } else {
        // ANIMAÇÃO SUAVE
        
        const newIndices = [];
        for (let i = start; i <= end; i++) {
            newIndices.push(i);
        }
        
        // 1️⃣ REMOVER dots que saíram
        oldDots.forEach(dot => {
            const idx = parseInt(dot.dataset.index);
            
            if (!newIndices.includes(idx)) {
                // Aplicar animação de saída
                if (direction === 'forward') {
                    dot.classList.add('slide-out-left');
                } else {
                    dot.classList.add('slide-out-right');
                }
                
                // Remover após animação
                setTimeout(() => {
                    if (dot.parentNode) dot.parentNode.removeChild(dot);
                }, 400);
                
                console.log(`🗑️ Remove ${idx} (${direction === 'forward' ? '←' : '→'})`);
            }
        });
        
        // 2️⃣ ADICIONAR dots novos
        for (let i = start; i <= end; i++) {
            if (!oldIndices.includes(i)) {
                const dot = this.createDot(i);
                
                // Aplicar animação de entrada
                if (direction === 'forward') {
                    dot.classList.add('slide-in-right');
                } else {
                    dot.classList.add('slide-in-left');
                }
                
                // Inserir na posição correta
                const inserted = this.insertDotInOrder(dot, i);
                
                if (inserted) {
                    console.log(`✅ Adiciona ${i} (${direction === 'forward' ? '→' : '←'})`);
                }
            }
        }
        
        // 3️⃣ ATUALIZAR estado active
        Array.from(this.indicators.children).forEach(dot => {
            const idx = parseInt(dot.dataset.index);
            
            if (idx === current) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
}

// ===== FUNÇÃO AUXILIAR: CRIAR DOT =====
createDot(index) {
    const dot = document.createElement('div');
    dot.className = 'carousel-indicator';
    dot.dataset.index = index;
    
    if (index === this.currentIndex) {
        dot.classList.add('active');
    }
    
    dot.addEventListener('click', () => this.goToSlide(index));
    
    return dot;
}

// ===== FUNÇÃO AUXILIAR: INSERIR NA ORDEM =====
insertDotInOrder(newDot, newIndex) {
    const children = Array.from(this.indicators.children);
    
    // Encontrar posição correta
    let inserted = false;
    
    for (let i = 0; i < children.length; i++) {
        const existingIndex = parseInt(children[i].dataset.index);
        
        if (newIndex < existingIndex) {
            this.indicators.insertBefore(newDot, children[i]);
            inserted = true;
            break;
        }
    }
    
    // Se não inseriu, adiciona no final
    if (!inserted) {
        this.indicators.appendChild(newDot);
    }
    
    return true;
}

// ===== FUNÇÃO AUXILIAR: CRIAR DOT =====
createDot(index) {
    const dot = document.createElement('div');
    dot.className = 'carousel-indicator';
    dot.dataset.index = index;
    
    if (index === this.currentIndex) {
        dot.classList.add('active');
    }
    
    dot.addEventListener('click', () => this.goToSlide(index));
    
    return dot;
}

// ===== FUNÇÃO AUXILIAR: INSERIR NA ORDEM =====
insertDotInOrder(newDot, newIndex) {
    const children = Array.from(this.indicators.children);
    
    // Encontrar posição correta
    let inserted = false;
    
    for (let i = 0; i < children.length; i++) {
        const existingIndex = parseInt(children[i].dataset.index);
        
        if (newIndex < existingIndex) {
            this.indicators.insertBefore(newDot, children[i]);
            inserted = true;
            break;
        }
    }
    
    // Se não inseriu, adiciona no final
    if (!inserted) {
        this.indicators.appendChild(newDot);
    }
    
    return true;
}
// ===== FUNÇÃO AUXILIAR: CRIAR DOT =====
createDot(index) {
    const dot = document.createElement('div');
    dot.className = 'carousel-indicator';
    dot.dataset.index = index;
    
    if (index === this.currentIndex) {
        dot.classList.add('active');
    }
    
    dot.addEventListener('click', () => this.goToSlide(index));
    
    return dot;
}

// ===== FUNÇÃO AUXILIAR: INSERIR NA ORDEM =====
insertDotInOrder(newDot, newIndex) {
    const children = Array.from(this.indicators.children);
    
    // Encontrar posição correta
    let inserted = false;
    
    for (let i = 0; i < children.length; i++) {
        const existingIndex = parseInt(children[i].dataset.index);
        
        if (newIndex < existingIndex) {
            this.indicators.insertBefore(newDot, children[i]);
            inserted = true;
            break;
        }
    }
    
    // Se não inseriu, adiciona no final
    if (!inserted) {
        this.indicators.appendChild(newDot);
    }
    
    return true;
}

// ===== FUNÇÃO AUXILIAR: CRIAR DOT =====
createDot(index) {
    const dot = document.createElement('div');
    dot.className = 'carousel-indicator';
    dot.dataset.index = index;
    
    if (index === this.currentIndex) {
        dot.classList.add('active');
    }
    
    dot.addEventListener('click', () => this.goToSlide(index));
    
    return dot;
}

// ===== FUNÇÃO AUXILIAR: INSERIR NA ORDEM =====
insertDotInOrder(newDot, newIndex) {
    const children = Array.from(this.indicators.children);
    
    // Encontrar posição correta
    let inserted = false;
    
    for (let i = 0; i < children.length; i++) {
        const existingIndex = parseInt(children[i].dataset.index);
        
        if (newIndex < existingIndex) {
            this.indicators.insertBefore(newDot, children[i]);
            inserted = true;
            break;
        }
    }
    
    // Se não inseriu, adiciona no final
    if (!inserted) {
        this.indicators.appendChild(newDot);
    }
    
    return true;
}

    updatePositions() {
        const cards = this.track.querySelectorAll('.carousel-album-card');
        const total = cards.length;
        
        cards.forEach((card, index) => {
            card.classList.remove('center', 'left', 'right', 'hidden');
            
            const diff = index - this.currentIndex;
            const normalizedDiff = ((diff % total) + total) % total;
            
            if (normalizedDiff === 0) {
                card.classList.add('center');
            } else if (normalizedDiff === 1) {
                card.classList.add('right');
            } else if (normalizedDiff === total - 1) {
                card.classList.add('left');
            } else {
                card.classList.add('hidden');
            }
        });
        
    }
    
    // ===== NAVEGAÇÃO COM DEBOUNCE =====
    
    next() {
        // Permitir navegação imediata - apenas debounce mínimo
        const timeSinceLastNav = Date.now() - this.navigation.lastNavigationTime;
        if (timeSinceLastNav < 20) return; // Debounce de apenas 20ms
        
        this.navigation.lastNavigationTime = Date.now();
        
        this.previousIndex = this.currentIndex;
        this.currentIndex = (this.currentIndex + 1) % window.albums.length;
        this.updatePositions();
        this.renderIndicators('forward');
        
        console.log('➡️ Próximo álbum');
    }
    
    prev() {
        // Permitir navegação imediata - apenas debounce mínimo
        const timeSinceLastNav = Date.now() - this.navigation.lastNavigationTime;
        if (timeSinceLastNav < 20) return; // Debounce de apenas 20ms
        
        this.navigation.lastNavigationTime = Date.now();
        
        this.previousIndex = this.currentIndex;
        this.currentIndex = (this.currentIndex - 1 + window.albums.length) % window.albums.length;
        this.updatePositions();
        this.renderIndicators('backward');
        
        console.log('⬅️ Álbum anterior');
    }

    goToSlide(index) {
        if (index === this.currentIndex) return;
        
        // Permitir navegação imediata
        const timeSinceLastNav = Date.now() - this.navigation.lastNavigationTime;
        if (timeSinceLastNav < 20) return; // Debounce de apenas 20ms
        
        this.navigation.lastNavigationTime = Date.now();
        
        this.previousIndex = this.currentIndex;
        
        // Detectar direção do click
        const direction = index > this.currentIndex ? 'forward' : 'backward';
        
        this.currentIndex = index;
        this.updatePositions();
        this.renderIndicators(direction);
        
        console.log(`🎯 Indo para álbum ${index + 1}`);
    }
    
    canNavigate() {
        // Sempre permitir navegação (removido bloqueio de animação)
        return true;
    }
    
    // ===== SISTEMA DE GESTOS PROFISSIONAL =====
    
    attachEvents() {
        this.setupCardClicks();
        this.setupKeyboardNavigation();
        this.setupGestureListeners();
    }
    
 setupCardClicks() {
        const cards = this.track.querySelectorAll('.carousel-album-card');
        
        cards.forEach(card => {
            const cardIndex = parseInt(card.dataset.index);
            
            // Touch start - registrar dados do tap
            card.addEventListener('touchstart', (e) => {
                this.cardClick.tapData.set(cardIndex, {
                    startTime: Date.now(),
                    startX: e.touches[0].clientX,
                    startY: e.touches[0].clientY,
                    wasDrag: false // ← ADICIONAR flag de controle
                });
            }, { passive: true });
            
            // Touch end - validar tap
            card.addEventListener('touchend', (e) => {
                if (!this.cardClick.enabled) return;
                
                const tapData = this.cardClick.tapData.get(cardIndex);
                if (!tapData) return;
                
                const duration = Date.now() - tapData.startTime;
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                
                const moveX = Math.abs(touchEndX - tapData.startX);
                const moveY = Math.abs(touchEndY - tapData.startY);
                const totalMove = Math.sqrt(moveX * moveX + moveY * moveY);
                
                // ← VALIDAÇÃO MAIS RIGOROSA: só processar se NÃO foi drag
                if (totalMove < 15 && duration < 300 && !tapData.wasDrag) {
                    this.handleCardClick(card);
                }
                
                this.cardClick.tapData.delete(cardIndex);
            }, { passive: true });
            
            // Click (desktop)
            card.addEventListener('click', (e) => {
                // ← BLOQUEIO MAIS FORTE: só processar se não teve movimento
                if (this.gesture.type === 'drag' || this.gesture.distanceX !== 0) {
                    e.preventDefault();
                    return;
                }
                this.handleCardClick(card);
            });
        });
    }
    
    handleCardClick(card) {
        if (this.navigation.isAnimating || this.gesture.type === 'drag') return;
        
        const index = parseInt(card.dataset.index);
        const diff = index - this.currentIndex;
        const total = window.albums.length;
        const normalizedDiff = ((diff % total) + total) % total;
        
        if (normalizedDiff === 1) {
            this.next();
        } else if (normalizedDiff === total - 1) {
            this.prev();
        } else if (normalizedDiff === 0) {
            openAlbum(card.dataset.id);
        }
    }
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prev();
            if (e.key === 'ArrowRight') this.next();
        });
    }
    
    setupGestureListeners() {
        // Mouse
        this.track.addEventListener('mousedown', (e) => this.onGestureStart(e));
        document.addEventListener('mousemove', (e) => this.onGestureMove(e));
        document.addEventListener('mouseup', (e) => this.onGestureEnd(e));
        
        // Touch
        this.track.addEventListener('touchstart', (e) => this.onGestureStart(e), { passive: true });
        document.addEventListener('touchmove', (e) => this.onGestureMove(e), { passive: true });
        document.addEventListener('touchend', (e) => this.onGestureEnd(e), { passive: true });
    }
    
    // ===== HANDLERS DE GESTO =====
    
    onGestureStart(e) {
        if (this.navigation.isAnimating) return;
        
        const isTouch = e.type.includes('touch');
        const point = isTouch ? e.touches[0] : e;
        
        // Reset do estado
        this.gesture.isActive = true;
        this.gesture.type = null;
        this.gesture.startX = point.clientX;
        this.gesture.startY = point.clientY;
        this.gesture.currentX = point.clientX;
        this.gesture.currentY = point.clientY;
        this.gesture.lastX = point.clientX;
        this.gesture.lastY = point.clientY;
        this.gesture.startTime = Date.now();
        this.gesture.lastMoveTime = Date.now();
        this.gesture.distanceX = 0;
        this.gesture.distanceY = 0;
        this.gesture.velocity = 0;
        
        console.log('👆 Gesto iniciado');
    }
    
    onGestureMove(e) {
        if (!this.gesture.isActive || this.navigation.isAnimating) return;
        
        const isTouch = e.type.includes('touch');
        const point = isTouch ? e.touches[0] : e;
        
        // Atualizar posições
        this.gesture.currentX = point.clientX;
        this.gesture.currentY = point.clientY;
        
        // Calcular distâncias desde o início
        this.gesture.distanceX = this.gesture.currentX - this.gesture.startX;
        this.gesture.distanceY = this.gesture.currentY - this.gesture.startY;
        
        const absDistanceX = Math.abs(this.gesture.distanceX);
        const absDistanceY = Math.abs(this.gesture.distanceY);
        
        // ===== DETECÇÃO DE TIPO DE GESTO =====
        
        if (this.gesture.type === null) {
            // Aguardar movimento mínimo antes de decidir
            if (absDistanceX < this.gesture.directionThreshold && 
                absDistanceY < this.gesture.directionThreshold) {
                return;
            }
            
            // Determinar tipo baseado na direção DOMINANTE
            const ratio = absDistanceX / absDistanceY;
            
        if (ratio > 2.0) {
            // Movimento CLARAMENTE horizontal
            this.gesture.type = 'drag';
            this.cardClick.enabled = false;
            
            // ← MARCAR TODOS OS TAPS COMO DRAG
            this.cardClick.tapData.forEach((data) => {
                data.wasDrag = true;
            });
            
            console.log('↔️ DRAG horizontal detectado');
            } else if (ratio < 0.5) {
                // Movimento CLARAMENTE vertical
                this.gesture.type = 'scroll';
                console.log('↕️ SCROLL vertical detectado');
                return;
            } else {
                // Movimento diagonal - interpretar como scroll
                this.gesture.type = 'scroll';
                console.log('↗️ Movimento diagonal - interpretado como scroll');
                return;
            }
        }
        
        // ===== PROCESSAR APENAS SE FOR DRAG =====
        
        if (this.gesture.type === 'drag') {
            // Calcular velocidade
            const now = Date.now();
            const deltaTime = now - this.gesture.lastMoveTime;
            
            if (deltaTime > 0) {
                const deltaX = this.gesture.currentX - this.gesture.lastX;
                this.gesture.velocity = Math.abs(deltaX / deltaTime);
            }
            
            this.gesture.lastX = this.gesture.currentX;
            this.gesture.lastY = this.gesture.currentY;
            this.gesture.lastMoveTime = now;
        }
    }
    
    onGestureEnd(e) {
        if (!this.gesture.isActive) return;
        
        const gestureDuration = Date.now() - this.gesture.startTime;
        
        console.log(`🏁 Gesto finalizado - Tipo: ${this.gesture.type}, Duração: ${gestureDuration}ms`);
        
        // ===== PROCESSAR BASEADO NO TIPO =====
        
        if (this.gesture.type === 'drag') {
            this.processDrag();
        } else if (this.gesture.type === null) {
            // Gesto muito pequeno - pode ser um tap
            const totalDistance = Math.sqrt(
                this.gesture.distanceX ** 2 + 
                this.gesture.distanceY ** 2
            );
            
            if (totalDistance < this.gesture.tapMaxDistance && 
                gestureDuration < this.gesture.tapMaxDuration) {
                console.log('👆 TAP detectado');
            }
        }
        
        // Reset
        this.resetGesture();
    }
    
    processDrag() {
        const absDistance = Math.abs(this.gesture.distanceX);
        const isSwipe = this.gesture.velocity > this.gesture.velocityThreshold;
        
        console.log(`📊 Drag - Distância: ${absDistance}px, Velocidade: ${this.gesture.velocity.toFixed(3)}, Swipe: ${isSwipe}`);
        
        // Navegação por distância OU velocidade
        const shouldNavigate = absDistance > this.gesture.dragThreshold || isSwipe;
        
        if (shouldNavigate) {
            if (this.gesture.distanceX > 0) {
                console.log('⬅️ Navegando para anterior (swipe direita)');
                this.prev();
            } else {
                console.log('➡️ Navegando para próximo (swipe esquerda)');
                this.next();
            }
        } else {
            console.log('❌ Movimento insuficiente - sem navegação');
        }
    }
    
    resetGesture() {
        this.gesture.isActive = false;
        this.gesture.type = null;
        this.gesture.distanceX = 0;
        this.gesture.distanceY = 0;
        this.gesture.velocity = 0;
        
        // Reabilitar cliques após delay
        setTimeout(() => {
            this.cardClick.enabled = true;
        }, 50);
    }
}

// Instância global do carrossel
let albumsCarousel = null;

function initAlbums() {
    if (!window.albums || window.albums.length === 0) {
        console.warn('⚠️ Nenhum álbum para exibir');
        return;
    }
    
    albumsCarousel = new AlbumsCarousel3D();
}

function openAlbum(albumId) {
    currentAlbum = window.albums.find(a => a.id === albumId);
    if (!currentAlbum) {
        console.warn('⚠️ Álbum não encontrado:', albumId);
        return;
    }
    
    if (!currentAlbum.photos || currentAlbum.photos.length === 0) {
        alert('📷 Este álbum ainda não possui fotos!');
        return;
    }
    
    currentPhotoIndex = 0;
    updateAlbumViewer();
    
    const modal = document.getElementById('albumModal');
    if (modal) {
        modal.style.display = 'flex';
        HistoryManager.push('album-modal');
    }
    
    const titleElement = document.getElementById('modalAlbumTitle');
    if (titleElement) {
        titleElement.textContent = currentAlbum.title;
    }
    
    console.log(`📸 Álbum aberto: ${currentAlbum.title}`);
}

let lastPhotoIndex = 0;

function updateAlbumViewer() {
    if (!currentAlbum) return;
    
    const photo = currentAlbum.photos[currentPhotoIndex];
    const modalPhoto = document.getElementById('modalPhoto');
    
    if (!modalPhoto) return;
    
    if (zoomLevel > 1) {
        resetZoom();
        setTimeout(() => {
            changePhoto();
        }, 100);
    } else {
        changePhoto();
    }
    
    function changePhoto() {
        modalPhoto.classList.remove('slide-out-left', 'slide-out-right', 'slide-in-left', 'slide-in-right', 'active');
        
        modalPhoto.src = photo.src;
        modalPhoto.alt = `Foto ${currentPhotoIndex + 1}`;
        
        preloadAdjacentPhotos();
        
        lastPhotoIndex = currentPhotoIndex;
        
        document.getElementById('currentPhoto').textContent = currentPhotoIndex + 1;
        document.getElementById('totalPhotos').textContent = currentAlbum.photos.length;
        updateProgressBar();
    }
}

function updateProgressBar() {
    const progressBar = document.getElementById('photoProgressBar');
    if (!progressBar || !currentAlbum) return;
    
    progressBar.innerHTML = '';
    
    for (let i = 0; i < currentAlbum.photos.length; i++) {
        const segment = document.createElement('div');
        segment.className = 'progress-segment';
        
        if (i < currentPhotoIndex) {
            segment.classList.add('passed');
        } else if (i === currentPhotoIndex) {
            segment.classList.add('active');
        }
        
        progressBar.appendChild(segment);
    }
}

function preloadAdjacentPhotos() {
    if (!currentAlbum || !currentAlbum.photos) return;
    
    const total = currentAlbum.photos.length;
    
    const prevIndex = (currentPhotoIndex - 1 + total) % total;
    const nextIndex = (currentPhotoIndex + 1) % total;
    const next2Index = (currentPhotoIndex + 2) % total;
    
    [prevIndex, nextIndex, next2Index].forEach(index => {
        const src = currentAlbum.photos[index].src;
        
        if (!preloadCache.has(src)) {
            const img = new Image();
            img.src = src;
            preloadCache.set(src, img);
            
            console.log(`📥 Pré-carregada: foto ${index + 1}`);
        }
    });
    
    if (preloadCache.size > 5) {
        const firstKey = preloadCache.keys().next().value;
        preloadCache.delete(firstKey);
    }
}

// ===== MENSAGENS DO DIA =====
const messages = [
    {
        text: "Cada dia ao seu lado é uma página nova em nosso livro de amor, escrita com sorrisos, carinho e cumplicidade.",
        author: "Kevin para Iara"
    },
    {
        text: "Se eu pudesse escolher novamente entre todas as pessoas do mundo, escolheria você, sempre você.",
        author: "Kevin para Iara"
    },
    {
        text: "Nos seus olhos encontro meu lugar favorito no mundo, onde posso ser apenas eu e saber que sou amado.",
        author: "Kevin para Iara"
    },
    {
        text: "O amor que sinto por você não cabe em palavras, mas transborda em cada gesto, cada olhar, cada momento juntos.",
        author: "Kevin para Iara"
    }
];

let currentMessageIndex = 0;

function initMessages() {
    showMessage();
    
    const newMessageBtn = document.getElementById('newMessageBtn');
    if (newMessageBtn) {
        newMessageBtn.addEventListener('click', showNextMessage);
    }
}

function showMessage() {
    const message = messages[currentMessageIndex];
    
    const messageElement = document.getElementById('dailyMessage');
    if (messageElement) {
        messageElement.innerHTML = `
            <p class="message-text">"${message.text}"</p>
            <p class="message-author">— ${message.author}</p>
        `;
        
        messageElement.style.opacity = '0';
        setTimeout(() => {
            messageElement.style.transition = 'opacity 0.3s ease';
            messageElement.style.opacity = '1';
        }, 10);
    }
    
    console.log(`💌 Mensagem ${currentMessageIndex + 1}/${messages.length} exibida`);
}

function showNextMessage() {
    currentMessageIndex = (currentMessageIndex + 1) % messages.length;
    showMessage();
}

function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    const dateString = now.toLocaleDateString('pt-BR', options);
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = `Hoje é ${dateString}`;
    }
}

function initTimelineModal() {
    const openBtn = document.getElementById('openTimelineBtn');
    const closeBtn = document.getElementById('closeTimelineBtn');
    const modal = document.getElementById('timelineModal');
    const secretModal = document.getElementById('secretModal');
    const closeSecretBtn = document.getElementById('closeSecretBtn');
    const secretMessageBtns = document.querySelectorAll('.secret-message-btn');
    
    if (!openBtn || !modal) {
        console.warn('⚠️ Elementos da timeline não encontrados');
        return;
    }
    
    openBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        HistoryManager.push('timeline-modal');
        console.log('📖 Timeline aberta');
    });
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        console.log('📖 Timeline fechada');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeBtn.click();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (secretModal.style.display === 'flex') {
                closeSecretBtn.click();
            } else if (modal.style.display === 'block') {
                closeBtn.click();
            }
        }
    });
    
    secretMessageBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const message = btn.getAttribute('data-message');
            
            if (message) {
                showSecretMessage(message);
            }
        });
    });
    
    closeSecretBtn.addEventListener('click', () => {
        secretModal.style.display = 'none';
    });
    
    secretModal.addEventListener('click', (e) => {
        if (e.target === secretModal) {
            closeSecretBtn.click();
        }
    });

    updateTimelineProgress();
    
    console.log('✅ Timeline modal inicializada');
    console.log(`🔒 ${secretMessageBtns.length} mensagens secretas encontradas`);
}

function showSecretMessage(message) {
    const secretModal = document.getElementById('secretModal');
    const secretMessageText = document.getElementById('secretMessageText');
    
    if (secretModal && secretMessageText) {
        secretMessageText.textContent = message;
        secretModal.style.display = 'flex';
        HistoryManager.push('secret-modal');
        
        console.log('🔓 Mensagem secreta revelada');
    }
}

function updateTimelineProgress() {
    const timelineScroll = document.querySelector('.timeline-scroll');
    const timelineContainer = document.querySelector('.timeline-container');
    
    if (!timelineScroll || !timelineContainer) return;
    
    timelineScroll.addEventListener('scroll', () => {
        const scrollTop = timelineScroll.scrollTop;
        const scrollHeight = timelineScroll.scrollHeight - timelineScroll.clientHeight;
        const scrollPercent = (scrollTop / scrollHeight) * 100;
        
        timelineContainer.style.setProperty('--progress-height', `${scrollPercent}%`);
    });
}

function initHamburgerMenu() {
    console.log('🍔 Inicializando menu hambúrguer premium...');
    
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const menuLinks = document.querySelectorAll('.menu-nav a');
    const themeCards = document.querySelectorAll('.theme-card');
    const adminMenuBtn = document.getElementById('adminMenuBtn');
    const menuCloseBtn = document.querySelector('.menu-close-btn');

    if (menuCloseBtn) {
        menuCloseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMenu();
        });
    }

    if (!hamburgerBtn || !sideMenu || !menuOverlay) {
        console.error('❌ Elementos do menu não encontrados!');
        return false;
    }

    console.log('✅ Elementos do menu encontrados');

    function closeMenu() {
        hamburgerBtn.classList.remove('active');
        sideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
        console.log('🔒 Menu fechado');
    }

    function openMenu() {
        hamburgerBtn.classList.add('active');
        sideMenu.classList.add('active');
        menuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        HistoryManager.push('hamburger-menu');
        console.log('🔓 Menu aberto');
    }

    function toggleMenu() {
        const isActive = sideMenu.classList.contains('active');
        if (isActive) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    hamburgerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
    });

    menuOverlay.addEventListener('click', (e) => {
        e.preventDefault();
        closeMenu();
    });

    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            console.log('🔗 Navegação:', targetId);
            
            closeMenu();
            
            setTimeout(() => {
                if (targetId === '#home') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } 
                else if (targetId === '#contador') {
                    const counterSection = document.querySelector('.time-counter-section');
                    if (counterSection) {
                        counterSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
                else if (targetId === '#musicas') {
                    const musicSection = document.querySelector('.music-player-section');
                    if (musicSection) {
                        musicSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
                else if (targetId === '#albuns') {
                    const albumsSection = document.querySelector('.albums-section');
                    if (albumsSection) {
                        albumsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
                else if (targetId === '#mensagens') {
                    const messagesSection = document.querySelector('.messages-section');
                    if (messagesSection) {
                        messagesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }, 300);
        });
    });

    themeCards.forEach(card => {
        card.addEventListener('click', () => {
            const theme = card.dataset.theme;
            console.log('🎨 Tema selecionado:', theme);
            
            themeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            if (typeof changeTheme === 'function') {
                changeTheme(theme, true);
            }
            
            closeMenu();
        });
    });

    const savedTheme = localStorage.getItem('kevinIaraTheme') || 'meteors';
    themeCards.forEach(card => {
        if (card.dataset.theme === savedTheme) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });

    let isAdminUnlocked = false;

    if (adminMenuBtn) {
        adminMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔐 Botão admin clicado');
            
            if (!isAdminUnlocked) {
                const password = prompt('🔐 Digite a senha de admin:');
                
                if (password === 'iara2023') {
                    isAdminUnlocked = true;
                    adminMenuBtn.classList.add('unlocked');
                    adminMenuBtn.innerHTML = '<i class="fas fa-lock-open"></i><span>Admin</span>';
                    
                    closeMenu();
                    
                    setTimeout(() => {
                        const adminModal = document.getElementById('adminModal');
                        const adminToggleBtn = document.getElementById('adminToggleBtn');
                        
                        if (adminModal) {
                            if (adminToggleBtn) {
                                adminToggleBtn.classList.add('unlocked');
                                adminToggleBtn.innerHTML = '<i class="fas fa-lock-open"></i>';
                            }
                            
                            adminModal.style.display = 'block';
                            document.body.style.overflow = 'hidden';
                            HistoryManager.push('admin-modal'); // ← ADICIONAR ESTA LINHA
                            
                            if (typeof loadExistingContent === 'function') {
                                loadExistingContent();
                            }
                        }
                        
                        console.log('✅ Admin desbloqueado');
                    }, 300);
                } else if (password !== null) {
                    alert('❌ Senha incorreta!');
                }
            } else {
                closeMenu();
                
            setTimeout(() => {
                const adminModal = document.getElementById('adminModal');
                if (adminModal) {
                    // ← LIMPAR O ESTADO DO MENU ANTES
                    HistoryManager.remove('hamburger-menu');
                    
                    adminModal.style.display = 'block';
                    document.body.style.overflow = 'hidden';
                    HistoryManager.push('admin-modal'); // ← ADICIONAR ESTA LINHA
                    
                    if (typeof loadExistingContent === 'function') {
                        loadExistingContent();
                    }
                }
            }, 300);
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sideMenu.classList.contains('active')) {
            closeMenu();
        }
    });

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style') {
                const target = mutation.target;
                
                if (target.style.display === 'flex' || target.style.display === 'block') {
                    if (sideMenu.classList.contains('active')) {
                        closeMenu();
                        console.log('🔒 Menu fechado automaticamente (modal aberto)');
                    }
                }
            }
        });
    });

    const modals = [
        document.getElementById('albumModal'),
        document.getElementById('timelineModal'),
        document.getElementById('secretModal'),
        document.getElementById('adminModal')
    ];

    modals.forEach(modal => {
        if (modal) {
            observer.observe(modal, {
                attributes: true,
                attributeFilter: ['style']
            });
        }
    });

    console.log('✅ Menu hambúrguer premium inicializado!');
    console.log('✅ Auto-fechamento de menu configurado');
    return true;
}

console.log(`
╔══════════════════════════════════════╗
║   💖 SITE KEVIN & IARA INICIADO 💖   ║
╠══════════════════════════════════════╣
║   📱 Otimizado para Mobile          ║
║   🎵 Player corrigido                ║
║   📸 ${window.albums ? window.albums.length : 0} álbuns organizados        ║
║   🎨 ${Object.keys(themes).length} temas disponíveis            ║
║   💾 Tema persistente                ║
╚══════════════════════════════════════╝
`);
