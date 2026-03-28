// ===== SISTEMA DE ADMIN COM FIREBASE (UPLOAD EXTERNO) =====

console.log('🔐 Sistema de Admin carregado');

// Estado de desbloqueio em memória: se recarregar a página, o usuário deverá autenticar novamente.
let isAdminUnlocked = false;
window.adminUnlocked = false;

// Senha de admin centralizada
const ADMIN_PASSWORD = 'iara2025';

/**
 * Abre o painel de login admin (modal personalizado) e trata autenticação.
 * Quando a senha estiver correta, abre o painel de admin completo.
 */
function openAdminLogin() {
    const loginModal = document.getElementById('adminLoginModal');
    const loginForm = document.getElementById('adminLoginForm');
    const passwordInput = document.getElementById('adminPasswordInput');
    const cancelBtn = document.getElementById('adminLoginCancel');
    const errorDiv = document.getElementById('adminLoginError');

    if (!loginModal || !loginForm || !passwordInput) {
        // Fallback para prompt se o modal não existir
        const password = prompt('🔐 Digite a senha de admin:');
        if (password === ADMIN_PASSWORD) {
            isAdminUnlocked = true;
            window.adminUnlocked = true;
            showAdminPanel();
        } else if (password !== null) {
            alert('❌ Senha incorreta!');
        }
        return;
    }

    loginModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    passwordInput.value = '';
    passwordInput.focus();

    const cleanUp = () => {
        loginModal.style.display = 'none';
        document.body.style.overflow = '';
        loginForm.removeEventListener('submit', onSubmit);
        if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKey);
    };

    const onSubmit = async (evt) => {
        evt.preventDefault();
        const pwd = passwordInput.value || '';
        if (pwd === ADMIN_PASSWORD) {
            cleanUp();
            isAdminUnlocked = true;
            window.adminUnlocked = true;
            showAdminPanel();
        } else {
            if (errorDiv) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = '❌ Senha incorreta!';
            } else {
                alert('❌ Senha incorreta!');
            }
            passwordInput.value = '';
            passwordInput.focus();
        }
    };

    const onCancel = () => {
        cleanUp();
    };

    const onKey = (ev) => {
        if (ev.key === 'Escape') onCancel();
    };

    loginForm.addEventListener('submit', onSubmit);
    if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
}

function showAdminPanel() {
    const adminModal = document.getElementById('adminModal');
    const adminToggleBtn = document.getElementById('adminToggleBtn');
    const adminMenuBtn = document.getElementById('adminMenuBtn');

    if (adminToggleBtn) {
        adminToggleBtn.classList.add('unlocked');
        adminToggleBtn.innerHTML = '<i class="fas fa-lock-open"></i>';
    }

    if (adminMenuBtn) {
        adminMenuBtn.classList.add('unlocked');
    }

    if (adminModal) {
        adminModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        if (typeof loadExistingContent === 'function') {
            loadExistingContent();
        }
        if (typeof HistoryManager !== 'undefined' && HistoryManager.push) {
            HistoryManager.push('admin-modal');
        }
    }

    console.log('✅ Admin desbloqueado (via admin.js)');
}

// ===== FUNÇÃO DE COMPRESSÃO CLIENT-SIDE =====
async function compressImageIfNeeded(file, maxSizeMB = 10) {
    if (file.size <= maxSizeMB * 1024 * 1024) {
        console.log('✅ Imagem já está no tamanho adequado');
        return file;
    }
    
    console.log(`📦 Comprimindo ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)...`);
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                const maxDimension = 2048;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = (height / width) * maxDimension;
                        width = maxDimension;
                    } else {
                        width = (width / height) * maxDimension;
                        height = maxDimension;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                let quality = 0.9;
                const tryCompress = () => {
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Falha na compressão'));
                            return;
                        }
                        
                        if (blob.size <= maxSizeMB * 1024 * 1024 || quality <= 0.5) {
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            
                            console.log(`✅ Comprimido: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
                            resolve(compressedFile);
                        } else {
                            quality -= 0.1;
                            tryCompress();
                        }
                    }, 'image/jpeg', quality);
                };
                
                tryCompress();
            };
            
            img.onerror = () => reject(new Error('Falha ao carregar imagem'));
            img.src = e.target.result;
        };
        
        reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
        reader.readAsDataURL(file);
    });
}

// ℹ️ Usando PerformanceUtils.debounce() de performance-optimizer.js
// Função removida para evitar duplicação

function waitForServices() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (typeof firebase !== 'undefined' && 
                firebase.apps.length > 0 && 
                typeof uploadImageToCloudinary !== 'undefined') {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });
}

function setupTabListeners() {
    const allTabs = document.querySelectorAll('.admin-tab');
    
    allTabs.forEach(tab => {
        if (tab.dataset.listenerAttached === 'true') {
            console.log('⚠️ Tab já tem listener, pulando...');
            return;
        }
        
        tab.addEventListener('click', function handleTabClick() {
            const targetTab = this.dataset.tab;
            
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.admin-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
                
                // Lazy load content only when tab is first activated
                if (targetTab === 'albums' && !targetContent.dataset.loaded) {
                    if (typeof updateEditAlbumSelect === 'function') {
                        updateEditAlbumSelect();
                    }
                    if (typeof updateAlbumSelect === 'function') {
                        updateAlbumSelect();
                    }
                    targetContent.dataset.loaded = 'true';
                }
                
                if (targetTab === 'playlists' && !targetContent.dataset.loaded) {
                    setTimeout(() => {
                        loadExistingPlaylists();
                        updatePlaylistSelects();
                    }, 100);
                    targetContent.dataset.loaded = 'true';
                }
            }
        });
        
        tab.dataset.listenerAttached = 'true';
    });
    
    initTabsDraggable();
    
    console.log(`✅ ${allTabs.length} tabs configuradas (sem duplicação)`);
}

function initTabsDraggable() {
    const tabsContainer = document.querySelector('.admin-tabs');
    if (!tabsContainer) {
        console.warn('⚠️ Container de tabs não encontrado');
        return;
    }
    
    if (tabsContainer.dataset.draggableInitialized === 'true') {
        console.log('✅ Tabs já inicializadas, pulando...');
        return;
    }
    
    let isDown = false;
    let startX;
    let scrollLeft;
    let velocity = 0;
    let lastX = 0;
    let lastTime = Date.now();
    
    const FRICTION = 0.92;
    const SENSITIVITY = 1.2;
    const MIN_VELOCITY = 0.1;
    
    const handleMouseDown = (e) => {
        if (e.target.classList.contains('admin-tab') || e.target.closest('.admin-tab')) {
            return;
        }
        
        isDown = true;
        tabsContainer.classList.add('dragging');
        tabsContainer.style.cursor = 'grabbing';
        tabsContainer.style.scrollBehavior = 'auto';
        
        startX = e.pageX - tabsContainer.offsetLeft;
        scrollLeft = tabsContainer.scrollLeft;
        lastX = e.pageX;
        lastTime = Date.now();
        velocity = 0;
        
        cancelAnimationFrame(tabsContainer.momentumAnimation);
    };
    
    const handleMouseMove = (e) => {
        if (!isDown) return;
        
        e.preventDefault();
        
        const currentTime = Date.now();
        const deltaTime = currentTime - lastTime;
        
        if (deltaTime > 0) {
            const x = e.pageX - tabsContainer.offsetLeft;
            const walk = (x - startX) * SENSITIVITY;
            
            const deltaX = e.pageX - lastX;
            velocity = deltaX / deltaTime * 16;
            
            tabsContainer.scrollLeft = scrollLeft - walk;
            
            lastX = e.pageX;
            lastTime = currentTime;
        }
    };
    
    const handleMouseUp = () => {
        if (!isDown) return;
        
        isDown = false;
        tabsContainer.classList.remove('dragging');
        tabsContainer.style.cursor = 'grab';
        
        applyMomentum();
    };
    
    const handleMouseLeave = () => {
        if (isDown) {
            handleMouseUp();
        }
    };
    
    let touchStartX = 0;
    let touchScrollLeft = 0;
    let touchLastX = 0;
    let touchLastTime = Date.now();
    let touchVelocity = 0;
    let isTouching = false;
    
    const handleTouchStart = (e) => {
        isTouching = true;
        tabsContainer.classList.add('dragging');
        tabsContainer.style.scrollBehavior = 'auto';
        
        touchStartX = e.touches[0].pageX - tabsContainer.offsetLeft;
        touchScrollLeft = tabsContainer.scrollLeft;
        touchLastX = e.touches[0].pageX;
        touchLastTime = Date.now();
        touchVelocity = 0;
        
        cancelAnimationFrame(tabsContainer.momentumAnimation);
    };
    
    const handleTouchMove = (e) => {
        if (!isTouching) return;
        
        const currentTime = Date.now();
        const deltaTime = currentTime - touchLastTime;
        
        if (deltaTime > 0) {
            const x = e.touches[0].pageX - tabsContainer.offsetLeft;
            const walk = (x - touchStartX) * SENSITIVITY;
            
            const deltaX = e.touches[0].pageX - touchLastX;
            touchVelocity = deltaX / deltaTime * 16;
            
            tabsContainer.scrollLeft = touchScrollLeft - walk;
            
            touchLastX = e.touches[0].pageX;
            touchLastTime = currentTime;
        }
    };
    
    const handleTouchEnd = () => {
        if (!isTouching) return;
        
        isTouching = false;
        tabsContainer.classList.remove('dragging');
        
        velocity = touchVelocity;
        applyMomentum();
    };
    
    function applyMomentum() {
        if (Math.abs(velocity) < MIN_VELOCITY) {
            tabsContainer.style.scrollBehavior = 'smooth';
            return;
        }
        
        tabsContainer.scrollLeft -= velocity;
        velocity *= FRICTION;
        
        tabsContainer.momentumAnimation = requestAnimationFrame(applyMomentum);
    }
    
    tabsContainer.addEventListener('mousedown', handleMouseDown);
    tabsContainer.addEventListener('mousemove', handleMouseMove);
    tabsContainer.addEventListener('mouseup', handleMouseUp);
    tabsContainer.addEventListener('mouseleave', handleMouseLeave);
    
    tabsContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    tabsContainer.addEventListener('touchmove', handleTouchMove, { passive: true });
    tabsContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    tabsContainer.dataset.draggableInitialized = 'true';
    
    console.log('✅ Tabs arrastáveis inicializadas');
}

const smoothDragStyles = `
    .admin-tabs {
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-x: contain;
    }
    
    .admin-tabs.dragging {
        scroll-behavior: auto;
        cursor: grabbing !important;
        user-select: none;
        -webkit-user-select: none;
    }
    
    .admin-tabs.dragging * {
        pointer-events: none;
    }
    
    .admin-tabs {
        will-change: scroll-position;
    }
`;

if (!document.getElementById('smooth-drag-styles')) {
    const styleTag = document.createElement('style');
    styleTag.id = 'smooth-drag-styles';
    styleTag.textContent = smoothDragStyles;
    document.head.appendChild(styleTag);
}

console.log('✅ Sistema de arraste suave aplicado!');

async function initAdmin() {
    await waitForServices();
    
    console.log('🔧 Iniciando initAdmin...');
    
    const adminToggleBtn = document.getElementById('adminToggleBtn');
    const adminModal = document.getElementById('adminModal');
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    
    console.log('🔧 Elementos encontrados:', {
        adminToggleBtn: !!adminToggleBtn,
        adminModal: !!adminModal,
        closeAdminBtn: !!closeAdminBtn
    });
    
    if (!adminToggleBtn || !adminModal) {
        console.warn('⚠️ Elementos de admin não encontrados');
        return;
    }
    
    if (!closeAdminBtn) {
        console.warn('⚠️ Botão de fechar admin não encontrado');
        return;
    }
    
    console.log('🔧 Anexando event listeners...');
    
    // Removido: event listener do adminToggleBtn - agora é global
    
    closeAdminBtn.addEventListener('click', () => {
        console.log('🔐 Botão X clicado - fechando admin');
        if (adminModal) {
            adminModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            console.log('🔐 Admin fechado manualmente');
        } else {
            console.warn('⚠️ adminModal não encontrado ao fechar');
        }
    });
    
    console.log('🔧 Event listener do botão X anexado com sucesso');
    
    adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            adminModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            console.log('🔐 Admin fechado (clique fora)');
        }
    });
    
    setupTabListeners();
    
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            if (targetTab === 'edit') {
                console.log('📝 Aba de edição aberta');
            }
        });
    });
    
    initAlbumForms();
    initTimelineForms();
    
    console.log('✅ Sistema de admin inicializado');
}

function initAlbumForms() {
    const addAlbumForm = document.getElementById('addAlbumForm');
    const addPhotoForm = document.getElementById('addPhotoForm');
    const selectAlbum = document.getElementById('selectAlbum');
    
    addAlbumForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('albumTitle').value;
        const date = document.getElementById('albumDate').value;
        const description = document.getElementById('albumDescription').value;
        const coverFile = document.getElementById('albumCover').files[0];
        
        if (!coverFile) {
            alert('❌ Selecione uma imagem de capa!');
            return;
        }
        
        if (coverFile.size > 32 * 1024 * 1024) {
            alert('❌ Imagem muito grande! Limite de 32MB por imagem.');
            return;
        }
        
        try {
            const btn = addAlbumForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando capa...';
            btn.disabled = true;
            
            const coverUrls = await uploadImageToCloudinary(coverFile, 1600, true);
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando no Firebase...';
            
            await db.collection('albums').add({
                title: title,
                date: date,
                cover: coverUrls.medium,
                coverThumb: coverUrls.thumb,
                coverLarge: coverUrls.large,
                coverWebP: coverUrls.webp,
                description: description,
                photoCount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            alert(`✅ Álbum "${title}" criado com versões responsivas!`);
            addAlbumForm.reset();
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            loadExistingContent();
            updateAlbumSelect();
            await loadAlbumsFromFirebase();
            
        } catch (error) {
            console.error('❌ Erro ao criar álbum:', error);
            alert('❌ Erro ao criar álbum: ' + error.message);
            const btn = addAlbumForm.querySelector('button');
            btn.innerHTML = '<i class="fas fa-save"></i> Criar Álbum';
            btn.disabled = false;
        }
    });
    addPhotoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const albumId = selectAlbum.value;
        const photoFiles = Array.from(document.getElementById('photoFile').files);
        
        if (!albumId) {
            alert('❌ Selecione um álbum primeiro!');
            return;
        }
        
        if (photoFiles.length === 0) {
            alert('❌ Selecione pelo menos uma foto!');
            return;
        }
        
        if (photoFiles.length > 100) {
            const confirm = window.confirm(
                `⚠️ Você selecionou ${photoFiles.length} fotos!\n\n` +
                `Isso pode demorar vários minutos.\nDeseja continuar?`
            );
            if (!confirm) return;
        }
        
        const btn = document.querySelector('#addPhotoForm button');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        
        try {
            const photoUrls = [];
            const uploadErrors = [];
            const CONCURRENT_UPLOADS = 3;
            
            // ETAPA 1: COMPRESSÃO
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparando fotos...';
            
            const compressedFiles = [];
            for (let i = 0; i < photoFiles.length; i++) {
                try {
                    btn.innerHTML = `<i class="fas fa-compress"></i> Comprimindo ${i + 1}/${photoFiles.length}...`;
                    
                    const compressed = await compressImageIfNeeded(photoFiles[i], 10);
                    compressedFiles.push(compressed);
                    
                } catch (compressError) {
                    console.error(`❌ Erro ao comprimir foto ${i + 1}:`, compressError);
                    uploadErrors.push({
                        file: photoFiles[i].name,
                        error: 'Falha na compressão'
                    });
                }
            }
            
            console.log(`✅ ${compressedFiles.length}/${photoFiles.length} fotos preparadas`);
            
            // ETAPA 2: UPLOAD PARALELO
            for (let i = 0; i < compressedFiles.length; i += CONCURRENT_UPLOADS) {
                const batch = compressedFiles.slice(i, i + CONCURRENT_UPLOADS);
                
                btn.innerHTML = `<i class="fas fa-cloud-upload-alt fa-spin"></i> Enviando ${Math.min(i + CONCURRENT_UPLOADS, compressedFiles.length)}/${compressedFiles.length}...`;
                
                const batchPromises = batch.map(async (file, idx) => {
                    const globalIndex = i + idx;
                    
                    try {
                        if (file.size > 32 * 1024 * 1024) {
                            throw new Error('Arquivo ainda muito grande após compressão');
                        }
                        
                        const urls = await uploadImageToCloudinary(file, 1600, true);
                        
                        return {
                            src: urls.medium,
                            srcThumb: urls.thumb,
                            srcLarge: urls.large,
                            srcWebP: urls.webp,
                            description: '',
                            timestamp: Date.now() + globalIndex
                        };
                        
                    } catch (uploadError) {
                        console.error(`❌ Erro no upload da foto ${globalIndex + 1}:`, uploadError);
                        uploadErrors.push({
                            file: file.name,
                            error: uploadError.message
                        });
                        return null;
                    }
                });
                
                const results = await Promise.allSettled(batchPromises);
                
                results.forEach(result => {
                    if (result.status === 'fulfilled' && result.value) {
                        photoUrls.push(result.value);
                    }
                });
                
                if (i + CONCURRENT_UPLOADS < compressedFiles.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            // ETAPA 3: SALVAR NO FIREBASE
            if (photoUrls.length === 0) {
                alert('❌ Nenhuma foto foi enviada com sucesso!');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }
            
            btn.innerHTML = '<i class="fas fa-database fa-spin"></i> Salvando no Firebase...';
            
            const PHOTOS_PER_PAGE = 200;
            const pages = [];
            
            for (let i = 0; i < photoUrls.length; i += PHOTOS_PER_PAGE) {
                pages.push(photoUrls.slice(i, i + PHOTOS_PER_PAGE));
            }
            
            // Calcular o próximo pageNumber disponível para este álbum (anexar ao final)
            const existingPagesSnapshot = await db.collection('album_photos')
                .where('albumId', '==', albumId)
                .get();

            let startPageNumber = 0;
            existingPagesSnapshot.forEach(doc => {
                const pn = doc.data().pageNumber;
                if (typeof pn === 'number' && pn >= startPageNumber) {
                    startPageNumber = pn + 1;
                }
            });

            for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                await db.collection('album_photos').add({
                    albumId: albumId,
                    pageNumber: startPageNumber + pageIndex,
                    photos: pages[pageIndex],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            const albumDoc = await db.collection('albums').doc(albumId).get();
            const currentCount = albumDoc.data().photoCount || 0;
            
            await db.collection('albums').doc(albumId).update({
                photoCount: currentCount + photoUrls.length
            });
            
            // FEEDBACK FINAL
            let successMsg = `✅ ${photoUrls.length} foto(s) adicionada(s) com sucesso!`;
            
            if (uploadErrors.length > 0) {
                successMsg += `\n\n⚠️ ${uploadErrors.length} foto(s) falharam:\n`;
                uploadErrors.slice(0, 5).forEach(err => {
                    successMsg += `\n• ${err.file}: ${err.error}`;
                });
                if (uploadErrors.length > 5) {
                    successMsg += `\n... e mais ${uploadErrors.length - 5}`;
                }
            }
            
            alert(successMsg);
            
            document.getElementById('addPhotoForm').reset();
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            loadExistingContent();
            await loadAlbumsFromFirebase();
            
        } catch (error) {
            console.error('❌ Erro fatal:', error);
            alert('❌ Erro ao adicionar fotos: ' + error.message);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
    
    updateAlbumSelect();
}

function initTimelineForms() {
    const addTimelineForm = document.getElementById('addTimelineForm');
    
    addTimelineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const eventDate = document.getElementById('eventDate').value;
        const eventTitle = document.getElementById('eventTitle').value;
        const eventSecret = document.getElementById('eventSecret').value;
        const photoFile = document.getElementById('eventPhoto').files[0];
        const photoCaption = document.getElementById('photoCaption').value;
        
        if (!photoFile) {
            alert('❌ Selecione uma foto para o evento!');
            return;
        }
        
        if (photoFile.size > 32 * 1024 * 1024) {
            alert('❌ Imagem muito grande! Limite de 32MB.');
            return;
        }
        
        try {
            const btn = addTimelineForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            
            // ✅ ETAPA 1: COMPRIMIR A FOTO
            btn.innerHTML = '<i class="fas fa-compress fa-spin"></i> Preparando foto...';
            
            let processedPhoto = photoFile;
            
            try {
                processedPhoto = await compressImageIfNeeded(photoFile, 10);
                console.log(`📦 Foto comprimida: ${(photoFile.size / 1024 / 1024).toFixed(2)}MB → ${(processedPhoto.size / 1024 / 1024).toFixed(2)}MB`);
            } catch (compressError) {
                console.warn('⚠️ Erro ao comprimir, usando original:', compressError);
                processedPhoto = photoFile;
            }
            
            // Validação final após compressão
            if (processedPhoto.size > 32 * 1024 * 1024) {
                alert('❌ A foto ainda está muito grande após compressão! Tente uma foto menor.');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }
            
            // ✅ ETAPA 2: FAZER UPLOAD
            btn.innerHTML = '<i class="fas fa-cloud-upload-alt fa-spin"></i> Enviando imagem...';
            
            const photoUrls = await uploadImageToCloudinary(processedPhoto, 1600, true);

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando posição...';
            let eventSide = 'left';
            try {
                const allEvents = await db.collection('timeline').orderBy('createdAt', 'asc').get();
                const totalEvents = allEvents.size;
                eventSide = totalEvents % 2 === 0 ? 'left' : 'right';
            } catch (error) {
                console.log('Primeiro evento - usando lado esquerdo');
            }

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando no Firebase...';

            await db.collection('timeline').add({
                date: eventDate,
                title: eventTitle,
                secret: eventSecret || null,
                photo: photoUrls.medium,
                photoThumb: photoUrls.thumb,
                photoLarge: photoUrls.large,
                photoWebP: photoUrls.webp,
                caption: photoCaption || '',
                side: eventSide,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            alert(`✅ Evento "${eventTitle}" adicionado (lado ${eventSide === 'left' ? 'esquerdo' : 'direito'})!`);
            addTimelineForm.reset();
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            loadExistingContent();
            await window.rebuildTimeline();
            
        } catch (error) {
            console.error('❌ Erro ao criar evento:', error);
            alert('❌ Erro ao criar evento: ' + error.message);
            const btn = addTimelineForm.querySelector('button');
            btn.innerHTML = '<i class="fas fa-save"></i> Adicionar Evento';
            btn.disabled = false;
        }
    });
}



// Funções movidas para firebase-config.js - usar versões globais diretamente

async function updateAlbumSelect() {
    const selectAlbum = document.getElementById('selectAlbum');
    
    try {
        const snapshot = await db.collection('albums').orderBy('createdAt', 'desc').limit(50).get();
        
        selectAlbum.innerHTML = '<option value="">Selecione um álbum</option>';
        
        snapshot.forEach(doc => {
            const album = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${album.title} (${album.photoCount || 0} fotos)`;
            selectAlbum.appendChild(option);
        });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar select:', error);
    }
}

async function loadExistingContent() {
    await loadExistingAlbums();
    await loadExistingEvents();
    
    // Atualizar selects para edição e adição de fotos
    if (typeof updateEditAlbumSelect === 'function') {
        await updateEditAlbumSelect();
    }
    if (typeof updateAlbumSelect === 'function') {
        await updateAlbumSelect();
    }
}

async function loadExistingAlbums() {
    const container = document.getElementById('existingAlbums');
    
    try {
        const snapshot = await db.collection('albums').orderBy('createdAt', 'desc').limit(20).get();
        
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="color: var(--theme-text-secondary); text-align: center;">Nenhum álbum criado ainda</p>';
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        snapshot.forEach(doc => {
            const album = doc.data();
            const item = document.createElement('div');
            item.className = 'existing-item';
            item.innerHTML = `
                <div class="existing-item-info">
                    <div class="existing-item-title">${album.title}</div>
                    <div class="existing-item-meta">${album.date} • ${album.photoCount || 0} fotos</div>
                </div>
                <button class="delete-item-btn" onclick="deleteAlbum('${doc.id}')">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            `;
            fragment.appendChild(item);
        });
        
        container.appendChild(fragment);
        
    } catch (error) {
        console.error('❌ Erro ao carregar álbuns:', error);
        container.innerHTML = '<p style="color: #ff5050;">Erro ao carregar álbuns</p>';
    }
}

async function loadExistingEvents() {
    const container = document.getElementById('existingEvents');
    
    try {
        const snapshot = await db.collection('timeline').orderBy('createdAt', 'asc').limit(20).get();
        
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="color: var(--theme-text-secondary); text-align: center;">Nenhum evento criado ainda</p>';
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        snapshot.forEach(doc => {
            const event = doc.data();
            const item = document.createElement('div');
            item.className = 'existing-item';
            
            const ladoExibicao = event.side === 'left' ? 'direito' : 'esquerdo';
            
            item.innerHTML = `
                <div class="existing-item-info">
                    <div class="existing-item-title">${event.title}</div>
                    <div class="existing-item-meta">${event.date} • Lado ${ladoExibicao}</div>
                </div>
                <button class="delete-item-btn" onclick="deleteEvent('${doc.id}')">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            `;
            fragment.appendChild(item);
        });
        
        container.appendChild(fragment);
        
    } catch (error) {
        console.error('❌ Erro ao carregar eventos:', error);
        container.innerHTML = '<p style="color: #ff5050;">Erro ao carregar eventos</p>';
    }
}

window.deleteAlbum = async function(albumId) {
    if (!confirm('Tem certeza de que deseja excluir este álbum? Esta ação removerá o álbum do painel.')) {
        return;
    }
    
    try {
        await db.collection('albums').doc(albumId).delete();
        
        const photoPagesSnapshot = await db.collection('album_photos')
            .where('albumId', '==', albumId)
            .get();
        
        const deletePromises = [];
        photoPagesSnapshot.forEach(doc => {
            deletePromises.push(db.collection('album_photos').doc(doc.id).delete());
        });
        
        await Promise.all(deletePromises);
        
        alert('Álbum excluído com sucesso.');
        loadExistingContent();
        updateAlbumSelect();
        await loadAlbumsFromFirebase();
        
    } catch (error) {
        console.error('❌ Erro ao excluir álbum:', error);
        alert('❌ Erro ao excluir: ' + error.message);
    }
};

window.deleteEvent = async function(eventId) {
    if (!confirm('Tem certeza de que deseja excluir este evento?')) {
        return;
    }
    
    try {
        await db.collection('timeline').doc(eventId).delete();
        
        alert('Evento excluído com sucesso.');
        loadExistingContent();
        await window.rebuildTimeline();
        
    } catch (error) {
        console.error('❌ Erro ao excluir evento:', error);
        alert('❌ Erro ao excluir: ' + error.message);
    }
};

console.log('🔧 Inicializando admin quando DOM estiver pronto...');

async function initializeAdminEntryPoint() {
    console.log('🔧 DOM pronto para admin');

    try {
        await waitForServices();
        console.log('🔧 Serviços carregados, chamando initAdmin()...');

        initAdmin();

        // Removido carregamento duplicado - agora feito pelo firebase-config.js
        console.log('🔧 Admin inicializado (carregamento de dados feito pelo firebase-config.js)');
    } catch (error) {
        console.error('❌ Erro ao inicializar admin:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminEntryPoint);
} else {
    initializeAdminEntryPoint();
}

console.log('✏️ Sistema de edição de álbuns carregado');

// Event listener global para fechar o admin modal
document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('#closeAdminBtn');
    if (closeBtn) {
        const adminModal = document.getElementById('adminModal');
        if (adminModal) {
            adminModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // Event listener global para o botão de toggle do admin
    const adminToggle = e.target.closest('#adminToggleBtn');
    if (adminToggle) {
        if (!isAdminUnlocked) {
            openAdminLogin();
        } else {
            const adminModal = document.getElementById('adminModal');
            if (adminModal) {
                adminModal.style.display = 'block';
                document.body.style.overflow = 'hidden';
                if (typeof loadExistingContent === 'function') loadExistingContent();
            }
        }
    }
});

// A seção de editar álbum agora está no HTML estático (integrada na tab de álbuns)
// Esta função apenas inicializa os event listeners necessários
function initializeAlbumEditSection() {
    // Setup dos event listeners
    setupTabListeners();

    const loadBtn = document.getElementById('loadEditAlbumBtn');
    if (loadBtn) loadBtn.addEventListener('click', loadAlbumForEdit);

    const cancelSel = document.getElementById('cancelSelection');
    if (cancelSel) cancelSel.addEventListener('click', cancelSelection);

    const reorganizeBtn = document.getElementById('reorganizePhotos');
    if (reorganizeBtn) reorganizeBtn.addEventListener('click', enterReorganizeMode);

    const deleteBtn = document.getElementById('deleteSelectedPhotos');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteSelectedPhotos);

    const toggleBtn = document.getElementById('toggleAlbumInfoEdit');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleAlbumInfoEdit);

    const cancelAlbumBtn = document.getElementById('cancelAlbumEdit');
    if (cancelAlbumBtn) cancelAlbumBtn.addEventListener('click', cancelAlbumInfoEdit);

    const saveAlbumBtn = document.getElementById('saveAlbumEdit');
    if (saveAlbumBtn) saveAlbumBtn.addEventListener('click', saveAlbumInfo);

    const newCoverInput = document.getElementById('newCoverInput');
    if (newCoverInput) newCoverInput.addEventListener('change', previewNewCover);

    setTimeout(() => {
        try { initSwipeableEditButton(); console.log('✅ Botão arrastável inicializado'); } catch (e) {}
    }, 1500);

    try { setupBackButtonHandler(); } catch (e) {}

    console.log('✅ Seção de edição de álbuns inicializada com sucesso');
}

async function updateEditAlbumSelect() {
    const select = document.getElementById('editAlbumSelect');
    
    try {
        const snapshot = await db.collection('albums').orderBy('createdAt', 'desc').limit(50).get();
        
        select.innerHTML = '<option value="">Escolha um álbum...</option>';
        
        snapshot.forEach(doc => {
            const album = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${album.title} (${album.photoCount || 0} fotos)`;
            select.appendChild(option);
        });
        
        console.log(`✅ ${snapshot.size} álbuns disponíveis para edição`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar álbuns:', error);
    }
}

function recreateToolbarListeners() {
    console.log('🔄 Recriando listeners da toolbar...');
    
    const cancelBtn = document.getElementById('cancelSelection');
    const reorganizeBtn = document.getElementById('reorganizePhotos');
    const deleteBtn = document.getElementById('deleteSelectedPhotos');
    
    if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        newCancelBtn.addEventListener('click', cancelSelection);
        console.log('✅ Listener de cancelar recriado');
    }
    
    if (reorganizeBtn) {
        const newReorganizeBtn = reorganizeBtn.cloneNode(true);
        reorganizeBtn.parentNode.replaceChild(newReorganizeBtn, reorganizeBtn);
        
        newReorganizeBtn.disabled = false;
        newReorganizeBtn.classList.remove('active');
        newReorganizeBtn.innerHTML = '<i class="fas fa-sort"></i><span>Reorganizar</span>';
        
        newReorganizeBtn.addEventListener('click', enterReorganizeMode);
        console.log('✅ Listener de reorganizar recriado');
    }
    
    if (deleteBtn) {
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
        newDeleteBtn.addEventListener('click', deleteSelectedPhotos);
        console.log('✅ Listener de deletar recriado');
    }
    
    console.log('✅ Todos os listeners da toolbar recriados com sucesso');
}

async function loadAlbumForEdit() {
    const select = document.getElementById('editAlbumSelect');
    const albumId = select.value;
    
    if (!albumId) {
        alert('⚠️ Selecione um álbum primeiro!');
        return;
    }
    
    try {
        console.log(`📂 Carregando álbum ${albumId} para edição...`);
        
        const btn = document.getElementById('loadEditAlbumBtn');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
        btn.disabled = true;

        const toolbar = document.getElementById('bottomToolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
        
        const albumDoc = await db.collection('albums').doc(albumId).get();
        const albumData = albumDoc.data();
        
        const photoPagesSnapshot = await db.collection('album_photos')
            .where('albumId', '==', albumId)
            .orderBy('pageNumber', 'asc')
            .get();
        
        const allPhotos = [];
        photoPagesSnapshot.forEach(pageDoc => {
            const pageData = pageDoc.data();
            pageData.photos.forEach((photo, index) => {
                allPhotos.push({
                    ...photo,
                    pageId: pageDoc.id,
                    pageNumber: pageData.pageNumber,
                    indexInPage: index
                });
            });
        });
        
        window.currentEditAlbum = {
            id: albumId,
            data: albumData,
            photos: allPhotos
        };
        
        renderPhotosForEdit(allPhotos, albumData.title);
        
        btn.innerHTML = '<i class="fas fa-folder-open"></i> Carregar Álbum';
        btn.disabled = false;
        
        recreateToolbarListeners();

        document.getElementById('editAlbumTitle').value = albumData.title || '';
        document.getElementById('editAlbumDate').value = albumData.date || '';
        document.getElementById('editAlbumDescription').value = albumData.description || '';
        document.getElementById('currentCoverPreview').src = albumData.cover || '';
        document.getElementById('editAlbumSection').style.display = 'block';
        document.getElementById('editAlbumInfoSection').style.display = 'block';
        
        console.log(`✅ ${allPhotos.length} fotos carregadas para edição`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar álbum:', error);
        alert('❌ Erro ao carregar álbum: ' + error.message);
        
        const btn = document.getElementById('loadEditAlbumBtn');
        btn.innerHTML = '<i class="fas fa-folder-open"></i> Carregar Álbum';
        btn.disabled = false;
    }
}

function toggleAlbumInfoEdit() {
    const form = document.getElementById('albumInfoEditForm');
    const btn = document.getElementById('toggleAlbumInfoEdit');
    
    if (!form || !btn) return;
    
    if (form.style.display === 'none' || form.style.display === '') {
        form.style.display = 'block';
        btn.querySelector('.edit-text').textContent = 'Fechar';
        btn.querySelector('i').className = 'fas fa-times';
        console.log('✏️ Formulário de edição ABERTO');
    } else {
        form.style.display = 'none';
        btn.querySelector('.edit-text').textContent = 'Editar Álbum';
        btn.querySelector('i').className = 'fas fa-edit';
        console.log('✏️ Formulário de edição FECHADO');
    }
}

function initSwipeableEditButton() {
    const btn = document.getElementById('toggleAlbumInfoEdit');
    if (!btn) {
        console.warn('⚠️ Botão de edição não encontrado');
        return;
    }
    
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🖱️ Clique no botão de edição');
        toggleAlbumInfoEdit();
    });
    
    console.log('✅ Botão de edição inicializado (apenas clique)');
}

function cancelAlbumInfoEdit() {
    if (window.currentEditAlbum) {
        const albumData = window.currentEditAlbum.data;
        document.getElementById('editAlbumTitle').value = albumData.title || '';
        document.getElementById('editAlbumDate').value = albumData.date || '';
        document.getElementById('editAlbumDescription').value = albumData.description || '';
        document.getElementById('currentCoverPreview').src = albumData.cover || '';
    }
    
    document.getElementById('albumInfoEditForm').style.display = 'none';
    
    const btn = document.getElementById('toggleAlbumInfoEdit');
    if (btn) {
        btn.querySelector('.edit-text').textContent = 'Editar Álbum';
        btn.querySelector('i').className = 'fas fa-edit';
    }
    
    console.log('✏️ Edição cancelada');
}

let newCoverFile = null;

function previewNewCover(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 32 * 1024 * 1024) {
        alert('❌ Imagem muito grande! Máximo 32MB.');
        return;
    }
    
    newCoverFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('currentCoverPreview').src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function saveAlbumInfo() {
    if (!window.currentEditAlbum) return;
    
    const saveBtn = document.getElementById('saveAlbumEdit');
    if (!saveBtn) return;
    
    const originalText = saveBtn.innerHTML;
    
    try {
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Salvando...</span>';
        saveBtn.disabled = true;
        
        const albumId = window.currentEditAlbum.id;
        const newTitle = document.getElementById('editAlbumTitle').value.trim();
        const newDate = document.getElementById('editAlbumDate').value.trim();
        const newDescription = document.getElementById('editAlbumDescription').value.trim();
        
        if (!newTitle || !newDate) {
            alert('⚠️ Título e Data são obrigatórios!');
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
            return;
        }
        
        const updateData = {
            title: newTitle,
            date: newDate,
            description: newDescription
        };
        
        if (newCoverFile) {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Enviando capa...</span>';
            const coverUrl = await uploadImageToCloudinary(newCoverFile, 800);
            updateData.cover = coverUrl;
            newCoverFile = null;
        }
        
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Salvando no Firebase...</span>';
        
        await db.collection('albums').doc(albumId).update(updateData);
        
        window.currentEditAlbum.data = {
            ...window.currentEditAlbum.data,
            ...updateData
        };
        
        alert('✅ Informações do álbum atualizadas com sucesso!');
        
        if (document.getElementById('saveAlbumEdit')) {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
        
        await loadAlbumsFromFirebase();
        await updateEditAlbumSelect();
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        alert('❌ Erro ao salvar: ' + error.message);
        
        const btn = document.getElementById('saveAlbumEdit');
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

function renderPhotosForEdit(photos, albumTitle) {
    const grid = document.getElementById('editPhotosGrid');
    
    grid.innerHTML = '';
    
    if (photos.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--theme-text-secondary);">
                <i class="fas fa-images" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <p>Este álbum está vazio</p>
            </div>
        `;
        return;
    }
    
    photos.forEach((photo, index) => {
        const photoCard = document.createElement('div');
        photoCard.className = 'gallery-photo';
        photoCard.setAttribute('data-index', index);
        
        photoCard.innerHTML = `
            <input type="checkbox" class="photo-checkbox" id="photo-${index}" aria-label="Selecionar foto ${index + 1}">
            <div class="photo-wrapper">
                <div class="photo-checkmark">
                    <i class="fas fa-check"></i>
                </div>
                <div class="photo-number" style="display: none;">${index + 1}</div>
            </div>
        `;
        
        grid.appendChild(photoCard);
        
        const wrapper = photoCard.querySelector('.photo-wrapper');
        const img = createLazyImage(photo.src, `Foto ${index + 1}`);
        
        wrapper.insertBefore(img, wrapper.firstChild);
        
        const checkbox = photoCard.querySelector('input[type="checkbox"]');
        
        let longPressTimer;
        let touchStartTime;
        let touchMoved = false;
        
        wrapper.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        wrapper.addEventListener('touchstart', (e) => {
            if (isReorganizing) return;
            
            touchMoved = false;
            touchStartTime = Date.now();
            
            longPressTimer = setTimeout(() => {
                if (!touchMoved && !isReorganizing) {
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                    
                    checkbox.checked = !checkbox.checked;
                    photoCard.classList.toggle('selected', checkbox.checked);
                    updateSelectionUI();
                }
            }, 500);
        }, { passive: true });
        
        wrapper.addEventListener('touchmove', () => {
            touchMoved = true;
            clearTimeout(longPressTimer);
        }, { passive: true });
        
        wrapper.addEventListener('touchend', (e) => {
            clearTimeout(longPressTimer);
            
            if (isReorganizing) return;
            
            if (isInSelectionMode() && !touchMoved) {
                const touchDuration = Date.now() - touchStartTime;
                if (touchDuration < 500) {
                    checkbox.checked = !checkbox.checked;
                    photoCard.classList.toggle('selected', checkbox.checked);
                    updateSelectionUI();
                }
            }
        }, { passive: true });
        
        wrapper.addEventListener('mousedown', (e) => {
            e.preventDefault();
            
            if (isReorganizing) return;
            
            longPressTimer = setTimeout(() => {
                checkbox.checked = !checkbox.checked;
                photoCard.classList.toggle('selected', checkbox.checked);
                updateSelectionUI();
            }, 500);
        });
        
        wrapper.addEventListener('mouseup', () => {
            clearTimeout(longPressTimer);
        });
        
        wrapper.addEventListener('mouseleave', () => {
            clearTimeout(longPressTimer);
        });
        
        wrapper.addEventListener('dragstart', (e) => {
            if (!isReorganizing) {
                e.preventDefault();
                return false;
            }
        });
    });
    
    updateSelectionUI();
}

function isInSelectionMode() {
    const checkboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]:checked');
    return checkboxes.length > 0;
}

function updateSelectionUI() {
    const checkboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]');
    const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    const bottomToolbar = document.getElementById('bottomToolbar');
    const selectionCountSpan = document.getElementById('selectionCount');
    
    if (selectedCount > 0) {
        bottomToolbar.style.display = 'flex';
        selectionCountSpan.textContent = `${selectedCount} selecionada${selectedCount !== 1 ? 's' : ''}`;
        
        document.querySelectorAll('.gallery-photo').forEach(photo => {
            photo.classList.add('selection-mode');
        });
    } else {
        bottomToolbar.style.display = 'none';
        
        document.querySelectorAll('.gallery-photo').forEach(photo => {
            photo.classList.remove('selection-mode');
        });
    }
}

function cancelSelection() {
    const checkboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]');
    
    checkboxes.forEach(cb => {
        cb.checked = false;
        cb.closest('.gallery-photo').classList.remove('selected');
    });
    
    console.log('☑️ Seleção cancelada');
    
    updateSelectionUI();
}

function setupBackButtonHandler() {
    window.addEventListener('popstate', (e) => {
        if (isInSelectionMode()) {
            e.preventDefault();
            cancelSelection();
            
            history.pushState({ editMode: true }, '');
        }
    });
    
    const editSection = document.getElementById('editAlbumSection');
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style') {
                if (editSection.style.display !== 'none') {
                    history.pushState({ editMode: true }, '');
                }
            }
        });
    });
    
    observer.observe(editSection, { attributes: true });
}

let isReorganizing = false;
let draggedElement = null;
let draggedIndex = null;

function enterReorganizeMode() {
    if (isReorganizing) {
        saveNewPhotoOrder();
        return;
    }
    
    isReorganizing = true;
    
    console.log('📝 Modo reorganizar ativado');
    
    const reorganizeBtn = document.getElementById('reorganizePhotos');
    reorganizeBtn.innerHTML = '<i class="fas fa-save"></i><span>Salvar</span>';
    reorganizeBtn.classList.add('active');
    
    document.getElementById('deleteSelectedPhotos').style.display = 'none';
    document.getElementById('cancelSelection').innerHTML = '<i class="fas fa-times"></i><span>Cancelar</span>';
    
    cancelSelection();
    
    const selectionCountSpan = document.getElementById('selectionCount');
    selectionCountSpan.textContent = 'Arraste para reorganizar';
    document.getElementById('bottomToolbar').style.display = 'flex';
    
    const photos = document.querySelectorAll('.gallery-photo');
    photos.forEach((photo, index) => {
        photo.classList.add('draggable');
        photo.setAttribute('draggable', 'true');
        
        const numberEl = photo.querySelector('.photo-number');
        if (numberEl) {
            numberEl.style.display = 'flex';
            numberEl.textContent = index + 1;
        }
        
        photo.addEventListener('dragstart', handleDragStart);
        photo.addEventListener('dragover', handleDragOver);
        photo.addEventListener('drop', handleDrop);
        photo.addEventListener('dragend', handleDragEnd);
        
        photo.addEventListener('touchstart', handleTouchStart, { passive: true });
        photo.addEventListener('touchmove', handleTouchMove, { passive: false });
        photo.addEventListener('touchend', handleTouchEnd, { passive: true });
    });
    
    console.log('📝 Modo reorganizar ativado');
}

function exitReorganizeMode(save = false) {
    isReorganizing = false;
    
    console.log('📝 Modo reorganizar desativado');
    
    const reorganizeBtn = document.getElementById('reorganizePhotos');
    
    if (save) {
        saveNewPhotoOrder();
        return;
    }
    
    reorganizeBtn.innerHTML = '<i class="fas fa-sort"></i><span>Reorganizar</span>';
    reorganizeBtn.classList.remove('active');
    reorganizeBtn.disabled = false;
    
    const deleteBtn = document.getElementById('deleteSelectedPhotos');
    if (deleteBtn) {
        deleteBtn.style.display = 'flex';
    }
    
    document.getElementById('bottomToolbar').style.display = 'none';
    
    const photos = document.querySelectorAll('.gallery-photo');
    photos.forEach(photo => {
        photo.classList.remove('draggable');
        photo.removeAttribute('draggable');
        
        const numberEl = photo.querySelector('.photo-number');
        if (numberEl) {
            numberEl.style.display = 'none';
        }
        
        photo.removeEventListener('dragstart', handleDragStart);
        photo.removeEventListener('dragover', handleDragOver);
        photo.removeEventListener('drop', handleDrop);
        photo.removeEventListener('dragend', handleDragEnd);
        photo.removeEventListener('touchstart', handleTouchStart);
        photo.removeEventListener('touchmove', handleTouchMove);
        photo.removeEventListener('touchend', handleTouchEnd);
    });
    
    console.log('📝 Modo reorganizar desativado');
}

function handleDragStart(e) {
    draggedElement = this;
    draggedIndex = parseInt(this.getAttribute('data-index'));
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const targetIndex = parseInt(this.getAttribute('data-index'));
    if (draggedIndex !== targetIndex) {
        this.classList.add('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    
    const targetIndex = parseInt(this.getAttribute('data-index'));
    
    if (draggedIndex !== targetIndex) {
        swapPhotos(draggedIndex, targetIndex);
    }
    
    this.classList.remove('drag-over');
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    document.querySelectorAll('.gallery-photo').forEach(photo => {
        photo.classList.remove('drag-over');
    });
}

let touchedElement = null;
let touchStartYPos = 0;
let touchStartXPos = 0;
let isTouchDragging = false;
let touchStartTimestamp = 0;
let longPressTimer = null;
const LONG_PRESS_THRESHOLD = 400;
const MOVE_THRESHOLD = 15;

function handleTouchStart(e) {
    if (!isReorganizing) return;
    
    isTouchDragging = false;
    touchedElement = this;
    draggedIndex = parseInt(this.getAttribute('data-index'));
    
    const touch = e.touches[0];
    touchStartXPos = touch.clientX;
    touchStartYPos = touch.clientY;
    touchStartTimestamp = Date.now();
    
    longPressTimer = setTimeout(() => {
        if (touchedElement && !isTouchDragging) {
            isTouchDragging = true;
            touchedElement.classList.add('dragging');
            
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            console.log(`📱 Foto ${draggedIndex + 1} pronta para ser movida`);
        }
    }, LONG_PRESS_THRESHOLD);
}

function handleTouchMove(e) {
    if (!isReorganizing || !touchedElement) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartXPos);
    const deltaY = Math.abs(touch.clientY - touchStartYPos);
    
    if (!isTouchDragging) {
        if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
            clearTimeout(longPressTimer);
            touchedElement = null;
            return;
        }
        return;
    }
    
    if (e.cancelable) {
        e.preventDefault();
    }
    
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const photoBelow = elementBelow?.closest('.gallery-photo');
    
    document.querySelectorAll('.gallery-photo').forEach(p => {
        if (p !== touchedElement) {
            p.classList.remove('drag-over');
        }
    });
    
    if (photoBelow && photoBelow !== touchedElement) {
        const targetIndex = parseInt(photoBelow.getAttribute('data-index'));
        if (draggedIndex !== targetIndex) {
            photoBelow.classList.add('drag-over');
        }
    }
}

function handleTouchEnd(e) {
    if (!isReorganizing) return;
    
    clearTimeout(longPressTimer);
    
    if (!isTouchDragging) {
        touchedElement = null;
        return;
    }
    
    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const photoBelow = elementBelow?.closest('.gallery-photo');
    
    if (photoBelow && photoBelow !== touchedElement) {
        const targetIndex = parseInt(photoBelow.getAttribute('data-index'));
        
        if (draggedIndex !== targetIndex) {
            swapPhotos(draggedIndex, targetIndex);
            console.log(`✅ Foto ${draggedIndex + 1} movida para posição ${targetIndex + 1}`);
        }
    }
    
    if (touchedElement) {
        touchedElement.classList.remove('dragging');
    }
    
    document.querySelectorAll('.gallery-photo').forEach(p => {
        p.classList.remove('drag-over');
    });
    
    touchedElement = null;
    isTouchDragging = false;
}

function swapPhotos(fromIndex, toIndex) {
    const photos = window.currentEditAlbum.photos;
    
    const movedPhoto = photos.splice(fromIndex, 1)[0];
    photos.splice(toIndex, 0, movedPhoto);
    
    renderPhotosForEditInReorganizeMode(photos);
    
    console.log(`🔄 Foto ${fromIndex + 1} movida para posição ${toIndex + 1}`);
}

function renderPhotosForEditInReorganizeMode(photos) {
    const grid = document.getElementById('editPhotosGrid');
    grid.innerHTML = '';
    
    photos.forEach((photo, index) => {
        const photoCard = document.createElement('div');
        photoCard.className = 'gallery-photo draggable';
        photoCard.setAttribute('data-index', index);
        photoCard.setAttribute('draggable', 'true');
        
        photoCard.innerHTML = `
            <div class="photo-wrapper" role="button" aria-label="Arrastar foto ${index + 1} para reorganizar">
                <img src="${photo.src}" alt="Foto ${index + 1}" loading="lazy">
                <div class="photo-number" style="display: flex;">${index + 1}</div>
            </div>
        `;
        
        photoCard.addEventListener('dragstart', handleDragStart);
        photoCard.addEventListener('dragover', handleDragOver);
        photoCard.addEventListener('drop', handleDrop);
        photoCard.addEventListener('dragend', handleDragEnd);
        photoCard.addEventListener('touchstart', handleTouchStart);
        photoCard.addEventListener('touchmove', handleTouchMove);
        photoCard.addEventListener('touchend', handleTouchEnd);
        
        grid.appendChild(photoCard);
    });
}

async function saveNewPhotoOrder() {
    if (!window.currentEditAlbum) return;
    
    const reorganizeBtn = document.getElementById('reorganizePhotos');
    
    try {
        reorganizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Salvando...</span>';
        reorganizeBtn.disabled = true;
        
        const photos = window.currentEditAlbum.photos;
        const albumId = window.currentEditAlbum.id;
        
        const PHOTOS_PER_PAGE = 200;
        const newPages = [];
        
        for (let i = 0; i < photos.length; i += PHOTOS_PER_PAGE) {
            newPages.push(photos.slice(i, i + PHOTOS_PER_PAGE));
        }
        
        const oldPagesSnapshot = await db.collection('album_photos')
            .where('albumId', '==', albumId)
            .get();
        
        const deletePromises = [];
        oldPagesSnapshot.forEach(doc => {
            deletePromises.push(db.collection('album_photos').doc(doc.id).delete());
        });
        
        await Promise.all(deletePromises);
        console.log(`✅ ${oldPagesSnapshot.size} páginas antigas deletadas`);
        
        for (let pageIndex = 0; pageIndex < newPages.length; pageIndex++) {
            await db.collection('album_photos').add({
                albumId: albumId,
                pageNumber: pageIndex,
                photos: newPages[pageIndex].map((p, idx) => ({
                    src: p.src,
                    description: p.description || '',
                    timestamp: Date.now() + (pageIndex * PHOTOS_PER_PAGE) + idx
                })),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        console.log(`✅ ${newPages.length} novas páginas criadas com ordem correta`);
        
        alert('✅ Nova ordem das fotos salva com sucesso!');
        
        exitReorganizeMode(false);
        
        await loadAlbumsFromFirebase();
        
        const select = document.getElementById('editAlbumSelect');
        select.value = albumId;
        
        const loadBtn = document.getElementById('loadEditAlbumBtn');
        loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recarregando...';
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await loadAlbumForEdit();
        await updateEditAlbumSelect();

        reorganizeBtn.disabled = false;

        console.log('✅ Álbum recarregado com nova ordem!');

    } catch (error) {
        console.error('❌ Erro ao salvar nova ordem:', error);
        alert('❌ Erro ao salvar: ' + error.message);
        
        reorganizeBtn.innerHTML = '<i class="fas fa-save"></i><span>Salvar</span>';
        reorganizeBtn.disabled = false;
    }
}

function selectAllPhotos() {
    const checkboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        cb.closest('.gallery-photo').classList.toggle('selected', !allChecked);
    });
    
    updateSelectionCount();
}

function updateSelectionCount() {
    const checkboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]');
    const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    const totalCount = checkboxes.length;
    
    const deleteBtn = document.getElementById('deleteSelectedPhotos');
    const selectAllBtn = document.getElementById('selectAllPhotos');
    const deleteCountSpan = document.getElementById('deleteCount');
    
    if (selectedCount > 0) {
        deleteBtn.style.display = 'flex';
        deleteCountSpan.textContent = `Deletar (${selectedCount})`;
    } else {
        deleteBtn.style.display = 'none';
    }
    
    const allChecked = selectedCount === totalCount && totalCount > 0;
    
    if (allChecked) {
        selectAllBtn.innerHTML = '<i class="fas fa-times"></i><span>Desmarcar</span>';
    } else if (selectedCount > 0) {
        selectAllBtn.innerHTML = `<i class="fas fa-check-square"></i><span>Selecionar (${selectedCount}/${totalCount})</span>`;
    } else {
        selectAllBtn.innerHTML = '<i class="fas fa-check-square"></i><span>Selecionar</span>';
    }
}

async function deleteSelectedPhotos() {
    const checkboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
        alert('⚠️ Selecione pelo menos uma foto para deletar!');
        return;
    }
    
    const confirmMsg = checkboxes.length === 1 
        ? '❌ Tem certeza que deseja deletar esta foto?' 
        : `❌ Tem certeza que deseja deletar ${checkboxes.length} fotos?`;
    
    if (!confirm(confirmMsg + '\n\nTem certeza? Esta ação removerá as imagens selecionadas do painel.')) {
        return;
    }
    
    const currentAlbumId = window.currentEditAlbum.id;
    const btn = document.getElementById('deleteSelectedPhotos');
    const toolbar = document.getElementById('bottomToolbar');
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deletando...';
        btn.disabled = true;
        
        const selectedIndices = Array.from(checkboxes).map(cb => {
            return parseInt(cb.closest('.gallery-photo').getAttribute('data-index'));
        }).sort((a, b) => b - a);
        
        console.log(`🗑️ Deletando ${selectedIndices.length} fotos...`);
        
        const remainingPhotos = window.currentEditAlbum.photos.filter((photo, index) => {
            return !selectedIndices.includes(index);
        });
        
        console.log(`📊 Fotos restantes: ${remainingPhotos.length}`);
        
        const PHOTOS_PER_PAGE = 200;
        const newPages = [];
        
        for (let i = 0; i < remainingPhotos.length; i += PHOTOS_PER_PAGE) {
            newPages.push(remainingPhotos.slice(i, i + PHOTOS_PER_PAGE));
        }
        
        const oldPagesSnapshot = await db.collection('album_photos')
            .where('albumId', '==', currentAlbumId)
            .get();
        
        const deletePromises = [];
        oldPagesSnapshot.forEach(doc => {
            deletePromises.push(db.collection('album_photos').doc(doc.id).delete());
        });
        
        await Promise.all(deletePromises);
        console.log(`✅ ${oldPagesSnapshot.size} páginas antigas deletadas`);
        
        if (newPages.length > 0) {
            for (let pageIndex = 0; pageIndex < newPages.length; pageIndex++) {
                await db.collection('album_photos').add({
                    albumId: currentAlbumId,
                    pageNumber: pageIndex,
                    photos: newPages[pageIndex].map(p => ({
                        src: p.src,
                        description: p.description,
                        timestamp: p.timestamp
                    })),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            console.log(`✅ ${newPages.length} novas páginas criadas`);
        }
        
        await db.collection('albums').doc(currentAlbumId).update({
            photoCount: remainingPhotos.length
        });
        
        alert(`${selectedIndices.length} foto(s) removida(s) com sucesso.`);
        
        btn.innerHTML = '<i class="fas fa-trash"></i> Deletar';
        btn.disabled = false;
        toolbar.style.display = 'none';
        
        const allCheckboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]');
        allCheckboxes.forEach(cb => {
            cb.checked = false;
            const photoCard = cb.closest('.gallery-photo');
            if (photoCard) {
                photoCard.classList.remove('selected', 'selection-mode');
            }
        });
        
        const select = document.getElementById('editAlbumSelect');
        select.value = currentAlbumId;
        
        await loadAlbumForEdit();
        
        await loadAlbumsFromFirebase();
        await updateEditAlbumSelect();
        
        setTimeout(() => {
            select.value = currentAlbumId;
        }, 100);
        
        console.log('✅ Exclusão concluída, toolbar escondida e álbum mantido');
        
    } catch (error) {
        console.error('❌ Erro ao deletar fotos:', error);
        alert('❌ Erro ao deletar fotos: ' + error.message);
        
        btn.innerHTML = '<i class="fas fa-trash"></i> Deletar';
        btn.disabled = false;
        toolbar.style.display = 'none';
    }
}

function injectEditStyles() {
    // ✅ Proteção contra duplicação de estilos
    if (document.getElementById('edit-admin-styles')) {
        console.log('⚠️ Estilos de edição já injetados, pulando...');
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'edit-admin-styles';
    style.textContent = `
        .edit-photos-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 80px;
        }
        
        .gallery-photo {
            position: relative;
            aspect-ratio: 1;
            overflow: hidden;
            background: rgba(0, 0, 0, 0.5);
        }
        
        .photo-wrapper {
            width: 100%;
            height: 100%;
            position: relative;
            cursor: pointer;
            user-select: none;
            -webkit-user-select: none;
        }
        
        .gallery-photo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            transition: all 0.3s ease;
            pointer-events: none;
        }
        
        .photo-checkbox {
            position: absolute;
            opacity: 0;
            pointer-events: none;
        }
        
        .photo-checkmark {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 24px;
            height: 24px;
            background: rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: all 0.2s ease;
            border: 2px solid rgba(255, 255, 255, 0.5);
            pointer-events: none;
        }
        
        .photo-checkmark i {
            color: white;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        
        .gallery-photo.selection-mode .photo-checkmark {
            opacity: 1;
        }
        
        .gallery-photo.selected .photo-checkmark {
            opacity: 1;
            background: var(--theme-primary);
            border-color: var(--theme-primary);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        }
        
        .gallery-photo.selected .photo-checkmark i {
            opacity: 1;
        }
        
        .gallery-photo.selected img {
            opacity: 0.7;
        }
        
        .gallery-photo.selected::before {
            content: '';
            position: absolute;
            inset: 0;
            border: 3px solid var(--theme-primary);
            pointer-events: none;
            z-index: 10;
        }
        
        .gallery-photo.draggable {
            cursor: grab;
        }
        
        .gallery-photo.dragging {
            opacity: 0.5;
            cursor: grabbing;
        }
        
        .gallery-photo.drag-over {
            border: 3px solid var(--theme-accent);
            box-shadow: 0 0 20px var(--theme-accent);
        }
        
        .photo-number {
            position: absolute;
            bottom: 8px;
            left: 8px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: bold;
            font-family: 'Poppins', sans-serif;
            display: none;
            align-items: center;
            justify-content: center;
            min-width: 32px;
        }
        
        .bottom-toolbar {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background: var(--theme-card-bg);
            backdrop-filter: blur(20px);
            border-top: 1px solid var(--theme-card-border);
            padding: 12px 20px;
            display: none;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            z-index: 999999 !important;
            box-shadow: 0 -2px 15px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease-out;
            pointer-events: auto !important;
        }
        
        .bottom-toolbar[style*="display: flex"] {
            display: flex !important;
            position: fixed !important;
        }
        
        @keyframes slideUp {
            from {
                transform: translateY(100%);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        .bottom-info {
            flex: 1;
            text-align: center;
            color: var(--theme-text);
            font-family: 'Poppins', sans-serif;
            font-size: 0.95rem;
            font-weight: 500;
        }
        
        .bottom-btn {
            padding: 10px 16px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid var(--theme-card-border);
            border-radius: 8px;
            color: var(--theme-text);
            font-family: 'Poppins', sans-serif;
            font-size: 0.85rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        
        .bottom-btn:active {
            transform: scale(0.95);
        }
        
        .bottom-btn.cancel-btn {
            background: rgba(150, 150, 150, 0.15);
            border-color: rgba(150, 150, 150, 0.3);
            color: #aaa;
        }
        
        .bottom-btn.reorganize-btn {
            background: rgba(100, 150, 255, 0.15);
            border-color: rgba(100, 150, 255, 0.3);
            color: #6b9bff;
        }
        
        .bottom-btn.reorganize-btn.active {
            background: rgba(100, 255, 100, 0.15);
            border-color: rgba(100, 255, 100, 0.3);
            color: #6bff6b;
        }
        
        .bottom-btn.delete-btn {
            background: rgba(255, 70, 70, 0.15);
            border-color: rgba(255, 70, 70, 0.3);
            color: #ff6b6b;
        }
        
        @media (max-width: 768px) {
            .bottom-toolbar {
                padding: 10px 12px;
            }
            
            .bottom-btn {
                padding: 12px 14px;
                font-size: 0.8rem;
            }
            
            .bottom-btn span {
                display: none;
            }
            
            .bottom-btn i {
                margin: 0;
                font-size: 1.1rem;
            }
            
            .bottom-info {
                font-size: 0.85rem;
            }
            
            .photo-checkmark {
                width: 28px;
                height: 28px;
            }
            
            .photo-checkmark i {
                font-size: 14px;
            }
        }
        
        .simple-edit-btn {
            width: 100%;
            padding: 12px 20px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--theme-card-border);
            border-radius: 10px;
            color: var(--theme-text);
            font-family: 'Poppins', sans-serif;
            font-size: 0.95rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.2s ease;
        }
        
        .simple-edit-btn:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: var(--theme-primary);
        }
        
        .simple-edit-btn:active {
            transform: scale(0.98);
            background: rgba(255, 255, 255, 0.1);
        }
        
        .simple-edit-btn i {
            font-size: 1rem;
        }
        
        .edit-form-grid {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 20px;
            margin-top: 15px;
        }
        
        .cover-preview-container {
            position: relative;
            width: 120px;
            height: 120px;
            border-radius: 10px;
            overflow: hidden;
            background: rgba(0, 0, 0, 0.3);
        }
        
        .cover-preview-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .change-cover-label {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px;
            text-align: center;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }
        
        .change-cover-label:hover {
            background: var(--theme-primary);
        }
        
        .change-cover-label i {
            font-size: 1rem;
        }
        
        .edit-fields-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .edit-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        
        .edit-field label {
            font-size: 0.85rem;
            color: var(--theme-text-secondary);
            font-weight: 500;
        }
        
        .edit-field input,
        .edit-field textarea {
            width: 100%;
            padding: 10px 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--theme-card-border);
            border-radius: 8px;
            color: var(--theme-text);
            font-family: 'Poppins', sans-serif;
            font-size: 0.9rem;
            transition: all 0.2s ease;
        }
        
        .edit-field input:focus,
        .edit-field textarea:focus {
            outline: none;
            border-color: var(--theme-primary);
            background: rgba(255, 255, 255, 0.08);
        }
        
        .edit-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        .minimal-btn {
            flex: 1;
            padding: 10px 20px;
            border: 1px solid var(--theme-card-border);
            border-radius: 8px;
            font-family: 'Poppins', sans-serif;
            font-size: 0.9rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s ease;
        }
        
        .minimal-btn.cancel {
            background: rgba(150, 150, 150, 0.1);
            color: #aaa;
        }
        
        .minimal-btn.cancel:hover {
            background: rgba(150, 150, 150, 0.15);
        }
        
        .minimal-btn.save {
            background: var(--theme-primary);
            color: white;
            border-color: var(--theme-primary);
        }
        
        .minimal-btn.save:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        
        @media (max-width: 768px) {
            .edit-form-grid {
                grid-template-columns: 1fr;
                gap: 15px;
            }
            
            .cover-preview-container {
                width: 100%;
                height: 200px;
                margin: 0 auto;
            }
        }
    `;
    document.head.appendChild(style);
}

function initEditSystem() {
    const checkInterval = setInterval(() => {
        if (document.getElementById('adminModal')) {
            clearInterval(checkInterval);
            
            initializeAlbumEditSection();
            injectEditStyles();
            
            console.log('✅ Sistema de edição de álbuns inicializado');
        }
    }, 500);
}

console.log('🎵 Sistema de gerenciamento de playlists carregado');

function addPlaylistTabToAdmin() {
    // ✅ Tab de playlist já está no HTML estático - apenas inicializar listeners
    
    setupTabListeners();

    const createForm = document.getElementById('createPlaylistForm');
    if (createForm) createForm.addEventListener('submit', createNewPlaylist);

    const selectPlaylist = document.getElementById('selectPlaylistForMusic');
    if (selectPlaylist) selectPlaylist.addEventListener('change', showMusicForm);

    const addMusicForm = document.getElementById('addMusicForm');
    if (addMusicForm) addMusicForm.addEventListener('submit', addMusicToPlaylist);

    console.log('✅ Aba de playlists ativada (HTML existente ou criada dinamicamente)');
}

async function createNewPlaylist(e) {
    e.preventDefault();
    
    const name = document.getElementById('playlistName').value.trim();
    const icon = document.querySelector('input[name="playlistIcon"]:checked').value;
    
    if (!name) {
        alert('⚠️ Digite o nome da playlist!');
        return;
    }
    
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        btn.disabled = true;
        
        await db.collection('custom_playlists').add({
            name: name,
            icon: icon,
            cover: 'images/capas-albuns/default-playlist.jpg',
            trackCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
alert(`✅ Playlist "${name}" criada com sucesso!`);

document.getElementById('createPlaylistForm').reset();
btn.innerHTML = originalText;
btn.disabled = false;

await loadExistingPlaylists();
await updatePlaylistSelects();

const currentPlaylistIndex = window.PlaylistManager?.state?.currentPlaylistIndex || 0;

if (typeof PlaylistManager !== 'undefined' && PlaylistManager.reload) {
    await PlaylistManager.reload();
}

document.getElementById('addMusicSection').style.display = 'block';
    } catch (error) {
        console.error('❌ Erro ao criar playlist:', error);
        alert('❌ Erro: ' + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function showMusicForm() {
    const select = document.getElementById('selectPlaylistForMusic');
    const form = document.getElementById('addMusicForm');
    
    if (select.value) {
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

async function loadExistingPlaylists() {
    const container = document.getElementById('existingPlaylists');
    
    try {
        const snapshot = await db.collection('custom_playlists').orderBy('createdAt', 'desc').limit(20).get();
        
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-music"></i>
                    <p>Nenhuma playlist criada ainda</p>
                </div>
            `;
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        for (const doc of snapshot.docs) {
            const playlist = doc.data();
            
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="playlist-icon-big">
                    <i class="fas ${playlist.icon}"></i>
                </div>
                
                <div class="playlist-info">
                    <div class="playlist-name">${playlist.name}</div>
                    <div class="playlist-stats">
                        <i class="fas fa-music"></i>
                        ${playlist.trackCount || 0} música${playlist.trackCount !== 1 ? 's' : ''}
                    </div>
                </div>
                
                <div class="playlist-actions">
                    <button class="action-btn edit" onclick="editPlaylist('${doc.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deletePlaylist('${doc.id}', '${playlist.name}')" title="Deletar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            fragment.appendChild(card);
        }
        
        container.appendChild(fragment);
        
    } catch (error) {
        console.error('❌ Erro ao carregar playlists:', error);
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-exclamation-triangle" style="color: #ff5050;"></i>
                <p style="color: #ff5050;">Erro ao carregar playlists</p>
            </div>
        `;
    }
}

async function updatePlaylistSelects() {
    const select = document.getElementById('selectPlaylistForMusic');
    
    try {
        const snapshot = await db.collection('custom_playlists').orderBy('createdAt', 'desc').limit(50).get();
        
        select.innerHTML = '<option value="">Escolha uma playlist...</option>';
        
        snapshot.forEach(doc => {
            const playlist = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${playlist.name} (${playlist.trackCount || 0} músicas)`;
            select.appendChild(option);
        });
        
        if (!snapshot.empty) {
            document.getElementById('addMusicSection').style.display = 'block';
        }
        
    } catch (error) {
        console.error('❌ Erro ao atualizar selects:', error);
    }
}

window.deletePlaylist = async function(playlistId, playlistName) {
    if (!confirm(`❌ Tem certeza que deseja deletar a playlist "${playlistName}"?\n\nIsso removerá TODAS as músicas desta playlist.`)) {
        return;
    }
    
    try {
        await db.collection('custom_playlists').doc(playlistId).delete();
        
        const tracksSnapshot = await db.collection('playlist_tracks')
            .where('playlistId', '==', playlistId)
            .get();
        
        const deletePromises = [];
        tracksSnapshot.forEach(doc => {
            deletePromises.push(db.collection('playlist_tracks').doc(doc.id).delete());
        });
        
        await Promise.all(deletePromises);
        
        alert(`✅ Playlist "${playlistName}" deletada com sucesso!`);
        
        await loadExistingPlaylists();
        await updatePlaylistSelects();
        await reloadAllPlaylists();
        
    } catch (error) {
        console.error('❌ Erro ao deletar playlist:', error);
        alert('❌ Erro: ' + error.message);
    }
};

window.editPlaylist = function(playlistId) {
    if (typeof playlistEditManager !== 'undefined') {
        playlistEditManager.openModal(playlistId);
    } else {
        alert('⚠️ Sistema de edição não está pronto. Recarregue a página.');
    }
};

async function reloadAllPlaylists() {
    if (typeof window.PlaylistManager !== 'undefined' && window.PlaylistManager.reload) {
        await window.PlaylistManager.reload();
    }
}

function injectPlaylistAdminStyles() {
    // ✅ Proteção contra duplicação de estilos
    if (document.getElementById('playlist-admin-styles')) {
        console.log('⚠️ Estilos de playlist já injetados, pulando...');
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'playlist-admin-styles';
    style.textContent = `
        .playlist-admin-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--theme-card-border);
            border-radius: 10px;
            margin-bottom: 10px;
            transition: all 0.2s ease;
        }
        
        .playlist-admin-item:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: var(--theme-primary);
        }
        
        .playlist-admin-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .playlist-admin-title {
            font-weight: 600;
            color: var(--theme-text);
            font-size: 1rem;
        }
        
        .playlist-admin-meta {
            font-size: 0.85rem;
            color: var(--theme-text-secondary);
            margin-top: 3px;
        }
        
        .playlist-admin-actions {
            display: flex;
            gap: 8px;
        }
        
        .playlist-action-btn {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        
        .playlist-action-btn.edit {
            background: rgba(100, 150, 255, 0.15);
            color: #6b9bff;
        }
        
        .playlist-action-btn.edit:hover {
            background: rgba(100, 150, 255, 0.25);
        }
        
        .playlist-action-btn.delete {
            background: rgba(255, 70, 70, 0.15);
            color: #ff6b6b;
        }
        
        .playlist-action-btn.delete:hover {
            background: rgba(255, 70, 70, 0.25);
        }
        
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .form-group label {
            font-size: 0.9rem;
            color: var(--theme-text-secondary);
            font-weight: 500;
        }
        
        .form-group input,
        .form-group select {
            padding: 10px 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--theme-card-border);
            border-radius: 8px;
            color: var(--theme-text);
            font-family: 'Poppins', sans-serif;
            font-size: 0.9rem;
        }
        
        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: var(--theme-primary);
            background: rgba(255, 255, 255, 0.08);
        }
        
        .admin-btn.primary {
            background: var(--theme-primary);
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 10px;
            font-family: 'Poppins', sans-serif;
            font-size: 0.95rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.2s ease;
            margin-top: 15px;
        }
        
        .admin-btn.primary:hover {
            opacity: 0.9;
            transform: translateY(-2px);
        }
        
        .admin-btn.primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);
}

function initPlaylistAdminSystem() {
    const checkInterval = setInterval(() => {
        if (document.getElementById('adminModal')) {
            clearInterval(checkInterval);
            
            addPlaylistTabToAdmin();
            injectPlaylistAdminStyles();
            
            setTimeout(() => {
                loadExistingPlaylists();
                updatePlaylistSelects();
            }, 1000);
            
            console.log('✅ Sistema de gerenciamento de playlists inicializado');
        }
    }, 500);
}

// Inicializações consolidadas em um único bloco
function initAdminSystems() {
    initPlaylistAdminSystem();
    initEditSystem();
    initStarMapAdminSystem();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminSystems);
} else {
    initAdminSystems();
}

console.log('✅ Módulos de Admin inicializados (Playlists, Edição, Star Map)!');

async function addMusicToPlaylist(e) {
    e.preventDefault();
    
    const playlistId = document.getElementById('selectPlaylistForMusic').value;
    const audioFiles = Array.from(document.getElementById('musicAudioFile').files); // ✅ Pega todas
    
    if (!playlistId) {
        alert('⚠️ Selecione uma playlist!');
        return;
    }
    
    if (audioFiles.length === 0) {
        alert('⚠️ Selecione pelo menos um arquivo de áudio!');
        return;
    }
    
    // Confirmação para muitos arquivos
    if (audioFiles.length > 20) {
        const confirm = window.confirm(
            `⚠️ Você selecionou ${audioFiles.length} músicas!\n\n` +
            `Isso pode demorar bastante tempo.\nDeseja continuar?`
        );
        if (!confirm) return;
    }
    
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    
    try {
        btn.disabled = true;
        
        const uploadErrors = [];
        const successfulTracks = [];
        
        // ===== PROCESSAR CADA MÚSICA =====
        for (let i = 0; i < audioFiles.length; i++) {
            const audioFile = audioFiles[i];
            const currentNum = i + 1;
            const totalNum = audioFiles.length;
            
            try {
                btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processando ${currentNum}/${totalNum}...`;
                
                // Validações
                if (!audioFile.type.startsWith('audio/') && !audioFile.name.match(/\.(mp3|m4a|wav|ogg|flac)$/i)) {
                    throw new Error('Formato inválido');
                }
                
                if (audioFile.size > 100 * 1024 * 1024) {
                    throw new Error('Arquivo maior que 100MB');
                }
                
                // Extrair capa e metadados
                btn.innerHTML = `<i class="fas fa-image fa-spin"></i> Extraindo capa ${currentNum}/${totalNum}...`;
                
                let coverUrl = 'images/capas-albuns/default-music.jpg';
                let metadata = {
                    title: audioFile.name.replace(/\.[^/.]+$/, ""),
                    artist: 'Artista desconhecido',
                    album: ''
                };
                
                if (typeof extractAndUploadMP3Cover === 'function') {
                    try {
                        const extracted = await extractAndUploadMP3Cover(audioFile);
                        
                        if (extracted && extracted.coverUrl && !extracted.coverUrl.includes('default-music.jpg')) {
                            coverUrl = extracted.coverUrl;
                        }
                        
                        if (extracted.metadata.title) metadata.title = extracted.metadata.title;
                        if (extracted.metadata.artist) metadata.artist = extracted.metadata.artist;
                        if (extracted.metadata.album) metadata.album = extracted.metadata.album;
                        
                    } catch (extractError) {
                        console.warn(`⚠️ Erro ao extrair capa da música ${currentNum}:`, extractError);
                    }
                }
                
                // Upload do áudio
                btn.innerHTML = `<i class="fas fa-cloud-upload-alt fa-spin"></i> Enviando áudio ${currentNum}/${totalNum}...`;
                
                if (typeof uploadAudioToCloudinary === 'undefined') {
                    throw new Error('Sistema de upload não disponível');
                }
                
                const audioData = await uploadAudioToCloudinary(audioFile);
                
                if (!audioData || !audioData.url) {
                    throw new Error('Falha no upload do áudio');
                }
                
                // Música processada com sucesso
                successfulTracks.push({
                    title: metadata.title,
                    artist: metadata.artist,
                    album: metadata.album,
                    src: audioData.url,
                    cover: coverUrl,
                    duration: audioData.duration || 0,
                    cloudinaryId: audioData.publicId || null,
                    source: 'upload',
                    addedAt: Date.now() + i
                });
                
                console.log(`✅ Música ${currentNum}/${totalNum} processada:`, metadata.title);
                
                // Pequeno delay entre músicas
                if (i < audioFiles.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
            } catch (fileError) {
                uploadErrors.push({
                    file: audioFile.name,
                    error: fileError.message
                });
                console.error(`❌ Erro na música ${currentNum}:`, fileError);
            }
        }
        
        // ===== SALVAR NO FIREBASE =====
        if (successfulTracks.length === 0) {
            alert('❌ Nenhuma música foi processada com sucesso!');
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }
        
        btn.innerHTML = '<i class="fas fa-database fa-spin"></i> Salvando no Firebase...';
        
        // Buscar músicas existentes
        const musicSnapshot = await db.collection('playlist_tracks')
            .where('playlistId', '==', playlistId)
            .get();
        
        const currentTracks = [];
        const sortedDocs = Array.from(musicSnapshot.docs).sort((a, b) => {
            return (a.data().pageNumber || 0) - (b.data().pageNumber || 0);
        });
        
        sortedDocs.forEach(doc => {
            const tracks = doc.data().tracks || [];
            currentTracks.push(...tracks);
        });
        
        // Adicionar novas músicas
        currentTracks.push(...successfulTracks);
        
        // Paginar (200 músicas por página)
        const TRACKS_PER_PAGE = 200;
        const pages = [];
        
        for (let i = 0; i < currentTracks.length; i += TRACKS_PER_PAGE) {
            pages.push(currentTracks.slice(i, i + TRACKS_PER_PAGE));
        }
        
        // Deletar páginas antigas
        const deletePromises = [];
        musicSnapshot.forEach(doc => {
            deletePromises.push(db.collection('playlist_tracks').doc(doc.id).delete());
        });
        await Promise.all(deletePromises);
        
        // Criar novas páginas
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
            await db.collection('playlist_tracks').add({
                playlistId: playlistId,
                pageNumber: pageIndex,
                tracks: pages[pageIndex],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Atualizar contador
        await db.collection('custom_playlists').doc(playlistId).update({
            trackCount: currentTracks.length
        });
        
        // ===== FEEDBACK FINAL =====
        let successMsg = `✅ ${successfulTracks.length} música(s) adicionada(s) com sucesso!`;
        
        if (uploadErrors.length > 0) {
            successMsg += `\n\n⚠️ ${uploadErrors.length} música(s) falharam:\n`;
            uploadErrors.slice(0, 5).forEach(err => {
                successMsg += `\n• ${err.file}: ${err.error}`;
            });
            if (uploadErrors.length > 5) {
                successMsg += `\n... e mais ${uploadErrors.length - 5}`;
            }
        }
        
        alert(successMsg);
        
        document.getElementById('addMusicForm').reset();
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        await loadExistingPlaylists();
        
        // Recarregar player
        if (typeof PlaylistManager !== 'undefined' && PlaylistManager.reload) {
            await PlaylistManager.reload();
        }
        
        console.log(`✅ ${successfulTracks.length} músicas adicionadas à playlist!`);
        
    } catch (error) {
        console.error('❌ Erro fatal:', error);
        alert(`❌ Erro: ${error.message}`);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

console.log('✅ admin.js carregado (Firebase + upload externo)');

console.log('🧪 Para testar, digite no console: testBackendConnection()');

// ===== TAB ADMIN: MAPA DAS ESTRELAS =====

console.log('🌌 Sistema de configuração do Star Map carregado');

function addStarMapTabToAdmin() {
    setupTabListeners();

    document.querySelectorAll('input[name="locationType"]').forEach(radio => {
        radio.addEventListener('change', () => {
            toggleManualLocation();
            calculateConstellationPreview();
        });
    });

    const specialDateInput = document.getElementById('specialDate');
    if (specialDateInput) {
        specialDateInput.addEventListener('change', calculateConstellationPreview);
    }

    // Re-calculate when manual coordinates change
    ['latitude', 'longitude'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', calculateConstellationPreview);
    });

    const starForm = document.getElementById('starMapConfigForm');
    if (starForm) starForm.addEventListener('submit', saveStarMapConfig);

    // Auto-calculate on load (after existing config is loaded)
    try {
        loadStarMapConfig().then(() => calculateConstellationPreview());
    } catch (e) {
        calculateConstellationPreview();
    }

    console.log('✅ Tab Mapa das Estrelas ativada');
}
function toggleManualLocation() {
    const locationType = document.querySelector('input[name="locationType"]:checked').value;
    const manualFields = document.getElementById('manualLocationFields');
    
    if (locationType === 'manual') {
        manualFields.style.display = 'block';
    } else {
        manualFields.style.display = 'none';
    }
}

async function loadStarMapConfig() {
    try {
        const doc = await db.collection('star_map_config').doc('settings').get();
        
        if (doc.exists) {
            const config = doc.data();
            
            if (config.specialDate) {
                document.getElementById('specialDate').value = config.specialDate;
            }
            
            if (config.customLocation) {
                document.querySelector('input[name="locationType"][value="manual"]').checked = true;
                document.getElementById('latitude').value = config.customLocation.lat;
                document.getElementById('longitude').value = config.customLocation.lng;
                document.getElementById('locationName').value = config.customLocation.name || '';
                toggleManualLocation();
            }
            
            if (config.romanticQuote) {
                document.getElementById('romanticQuote').value = config.romanticQuote;
            }
            
            console.log('✅ Configurações do Star Map carregadas');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar configurações:', error);
    }
}

async function calculateConstellationPreview() {
    const previewContent = document.getElementById('previewContent');
    if (!previewContent) return;

    // Show subtle loading state (no button to disable)
    previewContent.innerHTML = `
        <div class="preview-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Calculando constelações...</p>
        </div>
    `;

    try {
        const specialDate = document.getElementById('specialDate').value;
        const locationType = document.querySelector('input[name="locationType"]:checked')?.value || 'auto';

        let date, latitude, longitude;

        date = specialDate
            ? new Date(specialDate + 'T12:00:00')
            : new Date();

        if (locationType === 'manual') {
            latitude  = parseFloat(document.getElementById('latitude').value);
            longitude = parseFloat(document.getElementById('longitude').value);

            if (isNaN(latitude) || isNaN(longitude)) {
                previewContent.innerHTML = `
                    <div class="preview-loading">
                        <i class="fas fa-map-marker-alt"></i>
                        <p>Digite coordenadas válidas para ver o preview.</p>
                    </div>
                `;
                return;
            }
        } else {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                latitude  = position.coords.latitude;
                longitude = position.coords.longitude;
            } catch {
                latitude  = 42.4164;
                longitude = -88.6137;
            }
        }

        const constellations = selectVisibleConstellations(date, latitude, longitude);

        previewContent.innerHTML = `
            <div class="constellation-list">
                ${constellations.map((c, i) => `
                    <div class="constellation-item">
                        <div class="constellation-number">${i + 1}</div>
                        <div class="constellation-info">
                            <div class="constellation-name">${c.name}</div>
                            <div class="constellation-stars">${c.stars.length} estrelas</div>
                        </div>
                        <i class="fas fa-star constellation-icon"></i>
                    </div>
                `).join('')}
            </div>
            <div class="preview-details">
                <p><strong>Data:</strong> ${date.toLocaleDateString('pt-BR')}</p>
                <p><strong>Local:</strong> ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°</p>
            </div>
        `;

    } catch (error) {
        console.error('❌ Erro ao calcular preview:', error);
        previewContent.innerHTML = `
            <div class="preview-loading">
                <i class="fas fa-exclamation-triangle" style="color:#ff5050"></i>
                <p style="color:#ff5050">Erro ao calcular: ${error.message}</p>
            </div>
        `;
    }
}

async function saveStarMapConfig(e) {
    e.preventDefault();
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        
        const specialDate = document.getElementById('specialDate').value || null;
        const locationType = document.querySelector('input[name="locationType"]:checked').value;
        const romanticQuote = document.getElementById('romanticQuote').value.trim() || "O céu quando nossos mundos se colidiram";
        
        let customLocation = null;
        
        if (locationType === 'manual') {
            const lat = parseFloat(document.getElementById('latitude').value);
            const lng = parseFloat(document.getElementById('longitude').value);
            const name = document.getElementById('locationName').value.trim();
            
            if (isNaN(lat) || isNaN(lng)) {
                alert('⚠️ Digite coordenadas válidas!');
                btn.disabled = false;
                btn.innerHTML = originalText;
                return;
            }
            
            customLocation = {
                lat: lat,
                lng: lng,
                name: name || `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`
            };
        }

        // Salvar no Firebase
        await db.collection('star_map_config').doc('settings').set({
            specialDate: specialDate,
            customLocation: customLocation,
            romanticQuote: romanticQuote,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
       btn.disabled = false;
        btn.innerHTML = originalText;
        
        // ✅ FORÇAR ATUALIZAÇÃO USANDO O NOVO SISTEMA
        console.log('🔄 Forçando reload via preloader...');
        
        if (typeof window.forceReloadStarMapConfig === 'function') {
            try {
                const reloaded = await window.forceReloadStarMapConfig();
                if (reloaded) {
                    alert('✅ Configurações salvas e Star Map atualizado automaticamente!');
                    console.log('✅ Star Map atualizado via preloader!');
                } else {
                    alert('✅ Configurações salvas!\n\n⚠️ Atualize a página para ver as mudanças.');
                }
            } catch (reloadError) {
                console.error('❌ Erro ao recarregar:', reloadError);
                alert('✅ Configurações salvas!\n\n⚠️ Atualize a página para ver as mudanças.');
            }
        } else {
            alert('✅ Configurações salvas!\n\n⚠️ Atualize a página para ver as mudanças.');
            console.warn('⚠️ Função forceReloadStarMapConfig não encontrada');
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar configurações:', error);
        alert('❌ Erro: ' + error.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function initStarMapAdminSystem() {
    const checkInterval = setInterval(() => {
        if (document.getElementById('adminModal')) {
            clearInterval(checkInterval);
            
            addStarMapTabToAdmin();
            
            console.log('✅ Sistema de configuração do Star Map inicializado');
        }
    }, 500);
}

// ✅ Inicialização movida para o bloco consolidado acima

// ===== SISTEMA DE PREVIEW MÚLTIPLO DE MÚSICAS =====
console.log('🎵 Sistema de preview múltiplo carregado');

let musicPreviews = []; // Armazena dados de cada música

function initMultiMusicPreview() {
    const audioInput = document.getElementById('musicAudioFile');
    
    if (!audioInput) {
        console.warn('⚠️ Input de música não encontrado');
        return;
    }
    
    audioInput.addEventListener('change', async function(e) {
        const files = Array.from(e.target.files);
        const container = document.getElementById('multiMusicPreviewContainer');
        const list = document.getElementById('musicPreviewList');
        const countSpan = document.getElementById('musicCount');
        
        if (files.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        // Mostrar container
        container.style.display = 'block';
        countSpan.textContent = files.length;
        list.innerHTML = '';
        musicPreviews = [];
        
        // Processar cada arquivo
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const itemId = `music-preview-${i}`;
            
            // Criar item na lista
            const item = document.createElement('div');
            item.className = 'music-preview-item loading';
            item.id = itemId;
            item.innerHTML = `
                <div class="preview-mini-cover placeholder">
                    <i class="fas fa-music"></i>
                </div>
                <div class="preview-mini-info">
                    <div class="preview-mini-title">${file.name}</div>
                    <div class="preview-mini-status">
                        <i class="fas fa-spinner fa-spin"></i> Extraindo...
                    </div>
                </div>
            `;
            list.appendChild(item);
            
            // Extrair metadados em background
            extractMusicMetadata(file, i, itemId);
        }
    });
}

async function extractMusicMetadata(file, index, itemId) {
    const item = document.getElementById(itemId);
    
    try {
        // Extrair capa e metadados
        let coverUrl = 'images/capas-albuns/default-music.jpg';
        let metadata = {
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: 'Artista desconhecido',
            album: 'Álbum desconhecido'
        };
        
        if (typeof extractMP3Cover === 'function') {
            const extracted = await extractMP3Cover(file);
            
            if (extracted) {
                coverUrl = extracted.coverUrl;
                metadata.title = extracted.title || metadata.title;
                metadata.artist = extracted.artist || metadata.artist;
                metadata.album = extracted.album || metadata.album;
            }
        }
        
        // Salvar dados
        musicPreviews[index] = {
            file: file,
            coverUrl: coverUrl,
            metadata: metadata,
            hasCover: coverUrl !== 'images/capas-albuns/default-music.jpg'
        };
        
        // Atualizar item
        item.classList.remove('loading');
        item.innerHTML = `
            <img class="preview-mini-cover" src="${coverUrl}" alt="Capa">
            <div class="preview-mini-info">
                <div class="preview-mini-title">${metadata.title}</div>
                <div class="preview-mini-status success">
                    <i class="fas fa-check"></i> ${metadata.artist}
                </div>
            </div>
        `;
        
        // Adicionar evento de clique
        item.addEventListener('click', () => showMusicDetails(index));
        
    } catch (error) {
        console.error(`❌ Erro ao processar música ${index}:`, error);
        
        // Salvar com erro
        musicPreviews[index] = {
            file: file,
            coverUrl: 'images/capas-albuns/default-music.jpg',
            metadata: {
                title: file.name.replace(/\.[^/.]+$/, ""),
                artist: 'Erro ao processar',
                album: '-'
            },
            hasCover: false,
            error: true
        };
        
        // Atualizar item
        item.classList.remove('loading');
        item.innerHTML = `
            <div class="preview-mini-cover placeholder">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="preview-mini-info">
                <div class="preview-mini-title">${file.name}</div>
                <div class="preview-mini-status error">
                    <i class="fas fa-times"></i> Erro ao processar
                </div>
            </div>
        `;
        
        item.addEventListener('click', () => showMusicDetails(index));
    }
}

function showMusicDetails(index) {
    const music = musicPreviews[index];
    
    if (!music) {
        console.warn('⚠️ Música não encontrada:', index);
        return;
    }
    
    // Remover seleção anterior
    document.querySelectorAll('.music-preview-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Marcar como selecionada
    const selectedItem = document.getElementById(`music-preview-${index}`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }
    
    // Mostrar detalhes COM CAMPOS EDITÁVEIS
    const detailsContainer = document.getElementById('selectedMusicDetails');
    detailsContainer.style.display = 'block';
    
    document.getElementById('detailsCoverImage').src = music.coverUrl;
    
    // Campos editáveis
    const titleInput = document.getElementById('detailsTitle');
    const artistInput = document.getElementById('detailsArtist');
    const albumInput = document.getElementById('detailsAlbum');
    
    titleInput.value = music.metadata.title;
    artistInput.value = music.metadata.artist;
    albumInput.value = music.metadata.album || '';
    
    // Atualizar ao editar
    titleInput.oninput = () => {
        musicPreviews[index].metadata.title = titleInput.value;
    };
    artistInput.oninput = () => {
        musicPreviews[index].metadata.artist = artistInput.value;
    };
    albumInput.oninput = () => {
        musicPreviews[index].metadata.album = albumInput.value;
    };
    
    document.getElementById('detailsSize').textContent = `${(music.file.size / 1024 / 1024).toFixed(2)} MB`;
    
    const coverStatus = music.hasCover ? 
        '✅ Capa extraída do MP3' : 
        '⚠️ Usando capa padrão';
    
    document.getElementById('detailsCoverStatus').textContent = coverStatus;
    
    // Scroll suave até os detalhes
    detailsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Inicializar quando o admin abrir
setTimeout(() => {
    initMultiMusicPreview();
    console.log('✅ Preview múltiplo de músicas inicializado');
}, 1000);

console.log('✅ Módulo de configuração do Star Map carregado!');
