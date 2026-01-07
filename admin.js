// ===== SISTEMA DE ADMIN COM FIREBASE + IMGBB (VERDADEIRAMENTE ILIMITADO) =====

console.log('🔐 Sistema de Admin ILIMITADO carregado');

// ===== VARIÁVEIS GLOBAIS =====
let isAdminUnlocked = false;

// ===== FUNÇÕES DE INICIALIZAÇÃO =====


// ===== HELPER: Remove campos undefined antes de salvar no Firebase =====
function cleanFirebaseData(obj) {
    const cleaned = {};
    for (const key in obj) {
        if (obj[key] !== undefined && obj[key] !== null) {
            if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                cleaned[key] = cleanFirebaseData(obj[key]);
            } else if (Array.isArray(obj[key])) {
                cleaned[key] = obj[key].map(item => 
                    typeof item === 'object' ? cleanFirebaseData(item) : item
                );
            } else {
                cleaned[key] = obj[key];
            }
        }
    }
    return cleaned;
}


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
                
                if (targetTab === 'edit') {
                    if (typeof updateEditAlbumSelect === 'function') {
                        updateEditAlbumSelect();
                    }
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
    console.log('✅ Tabs arrastáveis inicializadas (versão suave otimizada)');
}

// ===== CONTROLE DO MODAL =====
async function initAdmin() {
    await waitForServices();
    
    const adminToggleBtn = document.getElementById('adminToggleBtn');
    const adminModal = document.getElementById('adminModal');
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    
    if (!adminToggleBtn || !adminModal) {
        console.warn('⚠️ Elementos de admin não encontrados');
        return;
    }
    
    adminToggleBtn.addEventListener('click', () => {
        if (!isAdminUnlocked) {
            const password = prompt('🔐 Digite a senha de admin:');
            
            if (password === 'iara2023') {
                isAdminUnlocked = true;
                adminToggleBtn.classList.add('unlocked');
                adminToggleBtn.innerHTML = '<i class="fas fa-lock-open"></i>';
                adminModal.style.display = 'block';
                document.body.style.overflow = 'hidden';
                loadExistingContent();
                console.log('✅ Admin desbloqueado');
            } else {
                alert('❌ Senha incorreta!');
            }
        } else {
            adminModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            loadExistingContent();
        }
    });
    
    closeAdminBtn.addEventListener('click', () => {
        adminModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        console.log('🔐 Admin fechado manualmente');
    });
    
    adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            adminModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            console.log('🔐 Admin fechado (clique fora)');
        }
    });

    
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            if (targetTab === 'edit') {
                console.log('📝 Aba de edição aberta - adicionado ao histórico');
            }
        });
    });

    setupTabListeners();
    initAlbumForms();
    initTimelineForms();
    
    console.log('✅ Sistema de admin inicializado');
}

// ===== GERENCIAMENTO DE ÁLBUNS COM IMGBB (ILIMITADO) =====
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
            alert('❌ Imagem muito grande! O ImgBB aceita até 32MB por imagem.');
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
        const photoFiles = document.getElementById('photoFile').files;
        
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
                `Isso pode demorar vários minutos para processar.\n` +
                `Deseja continuar?`
            );
            if (!confirm) return;
        }
        
        try {
            const btn = addPhotoForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            
            const photoUrls = [];
            let uploadErrors = 0;
            
            for (let i = 0; i < photoFiles.length; i++) {
                if (photoFiles[i].size > 32 * 1024 * 1024) {
                    uploadErrors++;
                    console.warn(`⚠️ Foto ${i + 1} ignorada (maior que 32MB)`);
                    continue;
                }
                
                btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Enviando ${i + 1}/${photoFiles.length} para ImgBB...`;
                
                try {
                    const urls = await uploadImageToCloudinary(photoFiles[i], 1600, true);
                    
                    photoUrls.push({
                        src: urls.medium,
                        srcThumb: urls.thumb,
                        srcLarge: urls.large,
                        srcWebP: urls.webp,
                        description: '',
                        timestamp: Date.now() + i
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (uploadError) {
                    uploadErrors++;
                    console.error(`❌ Erro no upload da foto ${i + 1}:`, uploadError);
                }
            }
            
            if (photoUrls.length === 0) {
                alert('❌ Nenhuma foto foi enviada com sucesso!');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando no Firebase...';
            
            const PHOTOS_PER_PAGE = 200;
            const pages = [];
            
            for (let i = 0; i < photoUrls.length; i += PHOTOS_PER_PAGE) {
                pages.push(photoUrls.slice(i, i + PHOTOS_PER_PAGE));
            }
            
            for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                await db.collection('album_photos').add({
                    albumId: albumId,
                    pageNumber: pageIndex,
                    photos: pages[pageIndex],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            const albumDoc = await db.collection('albums').doc(albumId).get();
            const currentCount = albumDoc.data().photoCount || 0;
            
            await db.collection('albums').doc(albumId).update({
                photoCount: currentCount + photoUrls.length
            });
            
            let successMsg = `✅ ${photoUrls.length} foto(s) adicionada(s) ao ImgBB e Firebase!`;
            if (uploadErrors > 0) {
                successMsg += `\n\n⚠️ ${uploadErrors} foto(s) não foram enviadas (verifique o tamanho ou formato).`;
            }
            alert(successMsg);
            
            addPhotoForm.reset();
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            loadExistingContent();
            await loadAlbumsFromFirebase();
            
        } catch (error) {
            console.error('❌ Erro ao adicionar fotos:', error);
            alert('❌ Erro ao adicionar fotos: ' + error.message);
            const btn = addPhotoForm.querySelector('button');
            btn.innerHTML = '<i class="fas fa-upload"></i> Adicionar Fotos';
            btn.disabled = false;
        }
    });
    
    updateAlbumSelect();
}

// ===== GERENCIAMENTO DE TIMELINE COM IMGBB =====
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
            alert('❌ Imagem muito grande! O ImgBB aceita até 32MB.');
            return;
        }
        
        try {
            const btn = addTimelineForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando para ImgBB...';
            btn.disabled = true;
            
            const photoUrls = await uploadImageToCloudinary(photoFile, 1600, true);

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando posição...';

            let eventSide = 'left';
            try {
                const allEvents = await db.collection('timeline').get();
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
            await rebuildTimeline();
            
        } catch (error) {
            console.error('❌ Erro ao criar evento:', error);
            alert('❌ Erro ao criar evento: ' + error.message);
            const btn = addTimelineForm.querySelector('button');
            btn.innerHTML = '<i class="fas fa-save"></i> Adicionar Evento';
            btn.disabled = false;
        }
    });
}

// ===== CARREGAR ÁLBUNS DO FIREBASE =====
async function loadAlbumsFromFirebase() {
    try {
        const snapshot = await db.collection('albums').orderBy('createdAt', 'desc').get();
        const firebaseAlbums = [];
        
        for (const doc of snapshot.docs) {
            const albumData = doc.data();
            
            const photoPagesSnapshot = await db.collection('album_photos')
                .where('albumId', '==', doc.id)
                .orderBy('pageNumber', 'asc')
                .get();
            
            const allPhotos = [];
            photoPagesSnapshot.forEach(pageDoc => {
                const pageData = pageDoc.data();
                allPhotos.push(...pageData.photos);
            });
            
            firebaseAlbums.push({
                id: doc.id,
                ...albumData,
                photos: allPhotos
            });
        }
        
        window.albums = firebaseAlbums;
        
        if (typeof initAlbums === 'function') {
            initAlbums();
        }
        
        console.log(`✅ ${firebaseAlbums.length} álbuns carregados (ImgBB + Firebase)`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar álbuns:', error);
    }
}

// ===== REBUILD TIMELINE =====
async function rebuildTimeline() {
    const container = document.querySelector('.timeline-container');
    if (!container) {
        console.warn('⚠️ Container da timeline não encontrado');
        return;
    }
    
    try {
        const snapshot = await db.collection('timeline').orderBy('createdAt', 'asc').get();
        
        const allItems = container.querySelectorAll('.timeline-item');
        allItems.forEach(item => item.remove());
        
        let timelineEnd = container.querySelector('.timeline-end');
        
        if (!timelineEnd) {
            timelineEnd = document.createElement('div');
            timelineEnd.className = 'timeline-end';
            timelineEnd.innerHTML = `
                <div class="timeline-heart"><i class="fas fa-infinity"></i></div>
                <p>E nossa história continua...</p>
            `;
            container.appendChild(timelineEnd);
        }
        
        if (snapshot.empty) {
            console.log('📖 Nenhum evento na timeline');
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        snapshot.forEach((doc, index) => {
            const event = doc.data();
            
            const item = document.createElement('div');
            item.className = `timeline-item ${event.side}`;
            item.setAttribute('data-custom', 'true');
            item.setAttribute('data-id', doc.id);
            item.style.animationDelay = `${(index + 1) * 0.1}s`;
            
            item.innerHTML = `
                <div class="timeline-content">
                    <div class="timeline-text">
                        <div class="timeline-date">
                            <i class="far fa-calendar"></i>
                            <span>${event.date}</span>
                        </div>
                        <h3>${event.title}</h3>
                        ${event.secret ? `
                            <button class="secret-message-btn" data-message="${event.secret.replace(/"/g, '&quot;')}">
                                <i class="fas fa-lock"></i> Mensagem Secreta
                            </button>
                        ` : ''}
                    </div>
                    <div class="timeline-photo">
                        <div class="photo-polaroid">
                            <p class="polaroid-caption">${event.caption || ''}</p>
                        </div>
                    </div>
                </div>
                <div class="timeline-line"></div>
            `;

            const img = document.createElement('img');

            if (event.photoLarge) {
                img.src = event.photoLarge;
                console.log(`✅ Timeline: LARGE para "${event.title}"`);
            } else if (event.photo) {
                if (typeof optimizeExistingUrl === 'function') {
                    img.src = optimizeExistingUrl(event.photo, 1600);
                    console.log(`♻️ Timeline: URL otimizada para "${event.title}"`);
                } else {
                    img.src = event.photo;
                    console.warn(`⚠️ Timeline: URL não otimizada para "${event.title}"`);
                }
            } else {
                img.src = 'images/capas-albuns/default-music.jpg';
            }

            img.alt = event.title;
            img.loading = 'lazy';
            img.decoding = 'async';
            img.style.filter = 'blur(10px)';
            img.style.transition = 'filter 0.4s ease-out';

            img.addEventListener('load', () => {
                img.style.filter = 'none';
            }, { once: true });

            const polaroid = item.querySelector('.photo-polaroid');
            const caption = polaroid.querySelector('.polaroid-caption');
            polaroid.insertBefore(img, caption);
            
            fragment.appendChild(item);
        });
        
        container.insertBefore(fragment, timelineEnd);
        
        const secretBtns = document.querySelectorAll('.secret-message-btn');
        secretBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const message = btn.getAttribute('data-message');
                if (message && typeof showSecretMessage === 'function') {
                    showSecretMessage(message);
                }
            });
        });
        
        console.log(`✅ Timeline reconstruída com ${snapshot.size} eventos`);
        
    } catch (error) {
        console.error('❌ Erro ao reconstruir timeline:', error);
        console.error('Stack:', error.stack);
    }
}

// ===== ATUALIZAR SELECT DE ÁLBUNS =====
async function updateAlbumSelect() {
    const selectAlbum = document.getElementById('selectAlbum');
    
    try {
        const snapshot = await db.collection('albums').orderBy('createdAt', 'desc').get();
        
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

// ===== CARREGAR CONTEÚDO EXISTENTE =====
async function loadExistingContent() {
    await loadExistingAlbumsRedesign();
    await loadExistingEventsRedesign();
}

// ===== FUNÇÕES DE EXCLUSÃO =====
window.deleteAlbum = async function(albumId) {
    if (!confirm('❌ Tem certeza que deseja excluir este álbum?\n\nISSO NÃO DELETARÁ as imagens do ImgBB (elas ficarão lá para sempre).')) {
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
        
        alert('✅ Álbum excluído do Firebase!\n\n⚠️ As imagens continuam no ImgBB.');
        loadExistingContent();
        updateAlbumSelect();
        await loadAlbumsFromFirebase();
        
    } catch (error) {
        console.error('❌ Erro ao excluir álbum:', error);
        alert('❌ Erro ao excluir: ' + error.message);
    }
};

window.deleteEvent = async function(eventId) {
    if (!confirm('❌ Tem certeza que deseja excluir este evento?\n\nISO NÃO DELETARÁ a imagem do ImgBB.')) {
        return;
    }
    
    try {
        await db.collection('timeline').doc(eventId).delete();
        
        alert('✅ Evento excluído do Firebase!\n\n⚠️ A imagem continua no ImgBB.');
        loadExistingContent();
        await rebuildTimeline();
        
    } catch (error) {
        console.error('❌ Erro ao excluir evento:', error);
        alert('❌ Erro ao excluir: ' + error.message);
    }
};


// ===== SISTEMA DE GERENCIAMENTO DE PLAYLISTS VIA ADMIN =====
console.log('🎵 Sistema de gerenciamento de playlists carregado');

function setupPlaylistTabListeners() {
    setTimeout(() => {
        const createForm = document.getElementById('createPlaylistForm');
        const selectPlaylist = document.getElementById('selectPlaylistForMusic');
        const addForm = document.getElementById('addMusicForm');
        const audioInput = document.getElementById('musicAudioFile');
        
        if (createForm && !createForm.dataset.listenerAttached) {
            createForm.addEventListener('submit', createNewPlaylist);
            createForm.dataset.listenerAttached = 'true';
            console.log('✅ Listener do formulário de criar playlist configurado');
        }
        
        if (selectPlaylist && !selectPlaylist.dataset.listenerAttached) {
            selectPlaylist.addEventListener('change', showMusicForm);
            selectPlaylist.dataset.listenerAttached = 'true';
            console.log('✅ Listener do select de playlist configurado');
        }
        
        if (addForm && !addForm.dataset.listenerAttached) {
            addForm.addEventListener('submit', addMusicToPlaylist);
            addForm.dataset.listenerAttached = 'true';
            console.log('✅ Listener do formulário de adicionar música configurado');
        }
        
        if (audioInput && !audioInput.dataset.listenerAttached) {
            setupAudioPreview(audioInput);
            audioInput.dataset.listenerAttached = 'true';
            console.log('✅ Listener de preview de áudio configurado');
        }
    }, 500);
}

function setupAudioPreview(audioInput) {
    audioInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        const previewContainer = document.getElementById('coverPreviewContainer');
        
        if (!file) {
            if (previewContainer) previewContainer.style.display = 'none';
            return;
        }
        
        if (!file.type.includes('audio') && !file.name.match(/\.(mp3|m4a)$/i)) {
            if (previewContainer) previewContainer.style.display = 'none';
            return;
        }
        
        if (previewContainer) {
            previewContainer.style.display = 'block';
            const infoEl = document.getElementById('coverPreviewInfo');
            if (infoEl) infoEl.textContent = '🔍 Extraindo capa...';
        }
        
        try {
            const extracted = await extractMP3Cover(file);
            
            if (extracted) {
                const imgEl = document.getElementById('coverPreviewImage');
                const infoEl = document.getElementById('coverPreviewInfo');
                
                if (imgEl) imgEl.src = extracted.coverUrl;
                if (infoEl) {
                    infoEl.innerHTML = `
                        <strong>${extracted.title}</strong><br>
                        ${extracted.artist}${extracted.album ? ` • ${extracted.album}` : ''}
                    `;
                }
                
                const titleInput = document.getElementById('musicTitle');
                const artistInput = document.getElementById('musicArtist');
                
                if (titleInput && !titleInput.value && extracted.title) {
                    titleInput.value = extracted.title;
                    titleInput.style.background = 'rgba(100, 255, 100, 0.1)';
                    setTimeout(() => { titleInput.style.background = ''; }, 2000);
                }
                
                if (artistInput && !artistInput.value && extracted.artist) {
                    artistInput.value = extracted.artist;
                    artistInput.style.background = 'rgba(100, 255, 100, 0.1)';
                    setTimeout(() => { artistInput.style.background = ''; }, 2000);
                }
                
                console.log('✅ Preview da capa carregado!');
            } else {
                const imgEl = document.getElementById('coverPreviewImage');
                const infoEl = document.getElementById('coverPreviewInfo');
                
                if (imgEl) imgEl.src = 'images/capas-albuns/default-music.jpg';
                if (infoEl) infoEl.innerHTML = '⚠️ MP3 sem capa embutida<br>Será usada capa padrão';
            }
            
        } catch (error) {
            console.error('❌ Erro ao extrair preview:', error);
            const infoEl = document.getElementById('coverPreviewInfo');
            if (infoEl) infoEl.textContent = '❌ Erro ao extrair capa';
        }
    });
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
        const snapshot = await db.collection('custom_playlists').orderBy('createdAt', 'desc').get();
        
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
            container.appendChild(card);
        }
        
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
        const snapshot = await db.collection('custom_playlists').orderBy('createdAt', 'desc').get();
        
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
    alert('🚧 Função de edição em desenvolvimento...');
};

async function reloadAllPlaylists() {
    if (typeof window.PlaylistManager !== 'undefined' && window.PlaylistManager.reload) {
        await window.PlaylistManager.reload();
    }
}

function initPlaylistAdminSystem() {
    const checkInterval = setInterval(() => {
        const playlistsTab = document.getElementById('playlists-tab');
        
        if (playlistsTab) {
            clearInterval(checkInterval);
            
            setupPlaylistTabListeners();
            
            setTimeout(() => {
                loadExistingPlaylists();
                updatePlaylistSelects();
                console.log('✅ Sistema de playlists totalmente integrado');
            }, 1000);
        }
    }, 500);
    
    setTimeout(() => {
        clearInterval(checkInterval);
    }, 10000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlaylistAdminSystem);
} else {
    initPlaylistAdminSystem();
}

console.log('✅ Módulo de gerenciamento de playlists carregado!');

async function addMusicToPlaylist(e) {
    e.preventDefault();
    
    const playlistId = document.getElementById('selectPlaylistForMusic').value;
    const audioFile = document.getElementById('musicAudioFile').files[0];
    let title = document.getElementById('musicTitle').value.trim();
    let artist = document.getElementById('musicArtist').value.trim();
    
    if (!playlistId) {
        alert('⚠️ Selecione uma playlist!');
        return;
    }
    
    if (!audioFile) {
        alert('⚠️ Selecione um arquivo de áudio!');
        return;
    }
    
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
        
        if (!audioFile.type.startsWith('audio/') && !audioFile.name.match(/\.(mp3|m4a|wav|ogg|flac)$/i)) {
            alert('❌ Arquivo inválido! Use MP3, M4A, WAV, OGG ou FLAC.');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }
        
        if (audioFile.size > 100 * 1024 * 1024) {
            alert('❌ Arquivo muito grande! Máximo 100MB.');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Extraindo capa do MP3...';

        let coverUrl = 'images/capas-albuns/default-music.jpg';
        let metadata = {
            title: title || audioFile.name.replace(/\.[^/.]+$/, ""),
            artist: artist || 'Artista desconhecido',
            album: ''
        };

        console.log('🎵 Tentando extrair capa do arquivo de áudio...');

        if (typeof extractAndUploadMP3Cover === 'function') {
            try {
                const extracted = await extractAndUploadMP3Cover(audioFile);
                
                if (extracted && extracted.coverUrl && !extracted.coverUrl.includes('default-music.jpg')) {
                    coverUrl = extracted.coverUrl;
                    console.log('✅ CAPA EXTRAÍDA E SALVA:', coverUrl);
                } else {
                    console.warn('⚠️ Nenhuma capa embutida encontrada - usando padrão');
                }
                
                if (!title && extracted.metadata.title) {
                    metadata.title = extracted.metadata.title;
                    document.getElementById('musicTitle').value = metadata.title;
                }
                
                if (!artist && extracted.metadata.artist) {
                    metadata.artist = extracted.metadata.artist;
                    document.getElementById('musicArtist').value = metadata.artist;
                }
                
                if (extracted.metadata.album) {
                    metadata.album = extracted.metadata.album;
                }
                
            } catch (extractError) {
                console.error('❌ Erro ao extrair capa:', extractError);
                console.warn('⚠️ Usando capa padrão devido ao erro');
            }
        } else {
            console.error('❌ Função extractAndUploadMP3Cover não encontrada!');
            alert('⚠️ Sistema de extração de capa não está carregado. Recarregue a página.');
        }

        console.log('📋 RESUMO DA EXTRAÇÃO:');
        console.log('   🖼️ Capa final:', coverUrl);
        console.log('   🎵 Título:', metadata.title);
        console.log('   🎤 Artista:', metadata.artist);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fazendo upload do áudio...';
        
        if (typeof uploadAudioToCloudinary === 'undefined') {
            throw new Error('Sistema de upload não está pronto. Recarregue a página.');
        }
        
        const audioData = await uploadAudioToCloudinary(audioFile);
        
        if (!audioData || !audioData.url) {
            throw new Error('Não foi possível obter a URL do áudio!');
        }
        
        console.log('✅ Áudio enviado com sucesso:', audioData.url);
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando no Firebase...';
        
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

        const newTrack = {
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            src: audioData.url,
            cover: coverUrl,
            duration: audioData.duration || 0,
            cloudinaryId: audioData.publicId || null,
            source: 'upload',
            addedAt: Date.now()
        };
        
        console.log('🎵 MÚSICA QUE SERÁ SALVA NO FIREBASE:');
        console.log('   📝 Título:', newTrack.title);
        console.log('   🎤 Artista:', newTrack.artist);
        console.log('   🖼️ Capa:', newTrack.cover);
        console.log('   🔊 Áudio:', newTrack.src);
        
        if (newTrack.cover.includes('default-music.jpg')) {
            console.warn('⚠️ ATENÇÃO: Capa padrão será salva (capa não foi extraída)');
        } else {
            console.log('✅ Capa personalizada será salva!');
        }
        
        currentTracks.push(newTrack);
        
        const TRACKS_PER_PAGE = 200;
        const pages = [];
        
        for (let i = 0; i < currentTracks.length; i += TRACKS_PER_PAGE) {
            pages.push(currentTracks.slice(i, i + TRACKS_PER_PAGE));
        }
        
        const deletePromises = [];
        musicSnapshot.forEach(doc => {
            deletePromises.push(db.collection('playlist_tracks').doc(doc.id).delete());
        });
        await Promise.all(deletePromises);
        
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
            await db.collection('playlist_tracks').add({
                playlistId: playlistId,
                pageNumber: pageIndex,
                tracks: pages[pageIndex],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        await db.collection('custom_playlists').doc(playlistId).update({
            trackCount: currentTracks.length
        });
        
        alert(`✅ Música "${metadata.title}" adicionada com ${coverUrl.includes('default') ? 'capa padrão' : 'capa extraída do MP3'}!`);
        
        document.getElementById('addMusicForm').reset();
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        await loadExistingPlaylists();

        const currentPlaylistIndex = window.PlaylistManager?.state?.currentPlaylistIndex || 0;
        console.log(`💾 Playlist atual antes do reload: ${currentPlaylistIndex}`);

        if (typeof PlaylistManager !== 'undefined' && PlaylistManager.reload) {
            await PlaylistManager.reload();
        }

        console.log('✅ Música adicionada com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao adicionar música:', error);
        console.error('Stack trace:', error.stack);
        alert(`❌ Erro: ${error.message}`);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ===== REDESIGN ADMIN - FUNÇÕES NOVAS =====

async function loadExistingAlbumsRedesign() {
    const container = document.getElementById('existingAlbums');
    
    try {
        const snapshot = await db.collection('albums').orderBy('createdAt', 'desc').get();
        
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-images"></i>
                    <p>Nenhum álbum criado ainda</p>
                </div>
            `;
            return;
        }
        
        for (const doc of snapshot.docs) {
            const album = doc.data();
            
            const card = document.createElement('div');
            card.className = 'album-item-card';
            card.innerHTML = `
                <div class="album-item-cover">
                    <img src="${album.cover}" alt="${album.title}">
                </div>
                
                <div class="album-item-info">
                    <h4>${album.title}</h4>
                    <div class="album-item-meta">
                        <span>
                            <i class="fas fa-calendar"></i>
                            ${album.date}
                        </span>
                        <span>
                            <i class="fas fa-images"></i>
                            ${album.photoCount || 0} foto${album.photoCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
                
                <div class="album-item-actions">
                    <button class="action-btn edit" onclick="openAlbumEditModal('${doc.id}')" title="Editar álbum">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteAlbum('${doc.id}')" title="Deletar álbum">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(card);
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar álbuns:', error);
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-exclamation-triangle" style="color: #ff5050;"></i>
                <p style="color: #ff5050;">Erro ao carregar álbuns</p>
            </div>
        `;
    }
}

async function loadExistingEventsRedesign() {
    const container = document.getElementById('existingEvents');
    
    try {
        const snapshot = await db.collection('timeline').orderBy('createdAt', 'desc').get();
        
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-clock"></i>
                    <p>Nenhum evento criado ainda</p>
                </div>
            `;
            return;
        }
        
        snapshot.forEach(doc => {
            const event = doc.data();
            
            const card = document.createElement('div');
            card.className = 'timeline-event-card';
            card.innerHTML = `
                <div class="timeline-event-photo">
                    <img src="${event.photo}" alt="${event.title}">
                </div>
                
                <div class="timeline-event-info">
                    <h4>${event.title}</h4>
                    <div class="timeline-event-date">
                        <i class="fas fa-calendar"></i>
                        ${event.date}
                    </div>
                </div>
                
                <div class="timeline-event-actions">
                    <button class="action-btn edit" onclick="openEventEditModal('${doc.id}')" title="Editar evento">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteEvent('${doc.id}')" title="Deletar evento">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('❌ Erro ao carregar eventos:', error);
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-exclamation-triangle" style="color: #ff5050;"></i>
                <p style="color: #ff5050;">Erro ao carregar eventos</p>
            </div>
        `;
    }
}

window.openAlbumEditModal = async function(albumId) {
    const modal = document.getElementById('albumEditModalPopup');
    
    // ✅ TRAVA O SCROLL DO BODY
    document.body.style.overflow = 'hidden';
    
    // ✅ MOSTRA O MODAL
    modal.style.display = 'block';
    
    // ✅ FORÇA SCROLL PARA O TOPO IMEDIATAMENTE
    setTimeout(() => {
        modal.scrollTop = 0;
        const modalContent = modal.querySelector('.album-edit-modal-content');
        if (modalContent) modalContent.scrollTop = 0;
    }, 10);
    
    window.currentEditingAlbumId = albumId;
    
    try {
        const albumDoc = await db.collection('albums').doc(albumId).get();
        const albumData = albumDoc.data();
        
        document.getElementById('popupAlbumTitle').value = albumData.title || '';
        document.getElementById('popupAlbumDate').value = albumData.date || '';
        document.getElementById('popupAlbumDescription').value = albumData.description || '';
        document.getElementById('popupAlbumCoverPreview').src = albumData.cover || '';
        
        console.log(`✅ Álbum "${albumData.title}" carregado no popup`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar álbum:', error);
        alert('❌ Erro ao carregar álbum: ' + error.message);
    }
};
window.closeAlbumEditModal = function() {
    const modal = document.getElementById('albumEditModal');
    modal.style.display = 'none';
    window.currentEditingAlbumId = null;
    window.currentEditingAlbumPhotos = null;
};

document.getElementById('closeAlbumEdit')?.addEventListener('click', closeAlbumEditModal);

document.getElementById('saveAlbumInfoBtn')?.addEventListener('click', async function() {
    if (!window.currentEditingAlbumId) return;
    
    const btn = this;
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        btn.disabled = true;
        
        const newTitle = document.getElementById('editAlbumTitle').value.trim();
        const newDate = document.getElementById('editAlbumDate').value.trim();
        const newDescription = document.getElementById('editAlbumDescription').value.trim();
        
        if (!newTitle || !newDate) {
            alert('⚠️ Título e Data são obrigatórios!');
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }
        
        const updateData = {
            title: newTitle,
            date: newDate,
            description: newDescription
        };
        
        const coverInput = document.getElementById('editAlbumCoverInput');
        if (coverInput.files.length > 0) {
            const coverFile = coverInput.files[0];
            
            if (coverFile.size > 32 * 1024 * 1024) {
                alert('❌ Imagem muito grande! Máximo 32MB.');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando capa...';
            const coverUrl = await uploadImageToCloudinary(coverFile, 800);
            updateData.cover = coverUrl;
        }
        
        await db.collection('albums').doc(window.currentEditingAlbumId).update(updateData);
        
        alert('✅ Álbum atualizado com sucesso!');
        
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        await loadExistingAlbumsRedesign();
        await loadAlbumsFromFirebase();
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        alert('❌ Erro ao salvar: ' + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

document.getElementById('editAlbumCoverInput')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('editAlbumCoverPreview').src = e.target.result;
    };
    reader.readAsDataURL(file);
});

function renderEditPhotosGrid(photos) {
    const grid = document.getElementById('editPhotosGrid');
    grid.innerHTML = '';
    
    if (photos.length === 0) {
        grid.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-images"></i>
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
            <input type="checkbox" class="photo-checkbox" id="photo-edit-${index}">
            <div class="photo-wrapper">
                <img src="${photo.src}" alt="Foto ${index + 1}" loading="lazy">
                <div class="photo-checkmark">
                    <i class="fas fa-check"></i>
                </div>
            </div>
        `;
        
        grid.appendChild(photoCard);
    });
    
    setupPhotoSelection();
}

window.openEventEditModal = async function(eventId) {
    const modal = document.getElementById('eventEditModal');
    modal.style.display = 'block';
    modal.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    window.currentEditingEventId = eventId;
    
    try {
        const eventDoc = await db.collection('timeline').doc(eventId).get();
        const eventData = eventDoc.data();
        
        document.getElementById('editEventDate').value = eventData.date || '';
        document.getElementById('editEventTitle').value = eventData.title || '';
        document.getElementById('editEventCaption').value = eventData.caption || '';
        document.getElementById('editEventSecret').value = eventData.secret || '';
        document.getElementById('editEventPhotoPreview').src = eventData.photo || '';
        
        console.log(`✅ Evento "${eventData.title}" carregado para edição`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar evento:', error);
        alert('❌ Erro ao carregar evento: ' + error.message);
    }
};

window.closeEventEditModal = function() {
    const modal = document.getElementById('eventEditModal');
    modal.style.display = 'none';
    window.currentEditingEventId = null;
};

document.getElementById('closeEventEdit')?.addEventListener('click', closeEventEditModal);

document.getElementById('saveEventInfoBtn')?.addEventListener('click', async function() {
    if (!window.currentEditingEventId) return;
    
    const btn = this;
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        btn.disabled = true;
        
        const newDate = document.getElementById('editEventDate').value.trim();
        const newTitle = document.getElementById('editEventTitle').value.trim();
        const newCaption = document.getElementById('editEventCaption').value.trim();
        const newSecret = document.getElementById('editEventSecret').value.trim();
        
        if (!newDate || !newTitle) {
            alert('⚠️ Data e Título são obrigatórios!');
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }
        
        const updateData = {
            date: newDate,
            title: newTitle,
            caption: newCaption,
            secret: newSecret || null
        };
        
        const photoInput = document.getElementById('editEventPhotoInput');
        if (photoInput.files.length > 0) {
            const photoFile = photoInput.files[0];
            
            if (photoFile.size > 32 * 1024 * 1024) {
                alert('❌ Imagem muito grande! Máximo 32MB.');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando foto...';
            const photoUrl = await uploadImageToCloudinary(photoFile, 1600);
            updateData.photo = photoUrl;
        }
        
        await db.collection('timeline').doc(window.currentEditingEventId).update(updateData);
        
        alert('✅ Evento atualizado com sucesso!');
        
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        await loadExistingEventsRedesign();
        await rebuildTimeline();
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        alert('❌ Erro ao salvar: ' + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

document.getElementById('editEventPhotoInput')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('editEventPhotoPreview').src = e.target.result;
    };
    reader.readAsDataURL(file);
});

document.getElementById('selectAlbum')?.addEventListener('change', function() {
    const form = document.getElementById('addPhotoForm');
    if (this.value) {
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
});

async function loadExistingContentRedesign() {
    await loadExistingAlbumsRedesign();
    await loadExistingEventsRedesign();
}

// ===== INICIALIZAÇÃO COMPLETA =====
document.addEventListener('DOMContentLoaded', async () => {
    await waitForServices();
    
    initAdmin();
    
    setTimeout(async () => {
        await loadAlbumsFromFirebase();
        await rebuildTimeline();
    }, 1000);
});


console.log('✅ admin.js com Firebase + ImgBB VERDADEIRAMENTE ILIMITADO carregado!');

// ===== EVENT LISTENERS DO POPUP DE EDIÇÃO =====
document.getElementById('closeAlbumEditPopup')?.addEventListener('click', function() {
    document.getElementById('albumEditModalPopup').style.display = 'none';
    document.body.style.overflow = 'auto';
});

document.getElementById('cancelAlbumEditPopup')?.addEventListener('click', function() {
    document.getElementById('albumEditModalPopup').style.display = 'none';
    document.body.style.overflow = 'auto';
});

document.getElementById('popupAlbumCoverInput')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('popupAlbumCoverPreview').src = e.target.result;
    };
    reader.readAsDataURL(file);
});

document.getElementById('saveAlbumEditPopup')?.addEventListener('click', async function() {
    if (!window.currentEditingAlbumId) return;
    
    const btn = this;
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        btn.disabled = true;
        
        const albumId = window.currentEditingAlbumId;
        const newTitle = document.getElementById('popupAlbumTitle').value.trim();
        const newDate = document.getElementById('popupAlbumDate').value.trim();
        const newDescription = document.getElementById('popupAlbumDescription').value.trim();
        
        if (!newTitle || !newDate) {
            alert('⚠️ Título e Data são obrigatórios!');
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }
        
        const updateData = {
            title: newTitle,
            date: newDate,
            description: newDescription
        };
        
        const coverInput = document.getElementById('popupAlbumCoverInput');
        if (coverInput.files.length > 0) {
            const coverFile = coverInput.files[0];
            
            if (coverFile.size > 32 * 1024 * 1024) {
                alert('❌ Imagem muito grande! Máximo 32MB.');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando capa...';
            const coverUrls = await uploadImageToCloudinary(coverFile, 1600, true);
            updateData.cover = coverUrls.medium;
            updateData.coverThumb = coverUrls.thumb;
            updateData.coverLarge = coverUrls.large;
        }
        
        await db.collection('albums').doc(albumId).update(updateData);
        
        alert('✅ Álbum atualizado com sucesso!');
        
        document.getElementById('albumEditModalPopup').style.display = 'none';
        document.body.style.overflow = 'auto';
        
        await loadExistingAlbumsRedesign();
        await loadAlbumsFromFirebase();
        
        btn.innerHTML = originalText;
        btn.disabled = false;
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        alert('❌ Erro ao salvar: ' + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// Função auxiliar para otimização de URLs existentes
function optimizeExistingUrl(url, maxWidth) {
    // Implementação da otimização de URLs
    return url;
}

// ===== SISTEMA DE GERENCIAMENTO DE FOTOS DO ÁLBUM (VERSÃO FINALIZADA) =====

let isReorganizing = false;
let draggedElement = null;
let draggedIndex = null;
let touchedElement = null;
let touchStartYPos = 0;
let touchStartXPos = 0;
let isTouchDragging = false;
let touchStartTimestamp = 0;
let longPressTouchTimer = null;
const LONG_PRESS_THRESHOLD = 400;
const MOVE_THRESHOLD = 15;

// ===== EVENT LISTENERS DO MODAL =====
function initAlbumEditModal() {
    document.getElementById('closeAlbumEditPopup')?.addEventListener('click', closePopup);
    document.getElementById('cancelAlbumEditPopup')?.addEventListener('click', closePopup);
    document.getElementById('popupAlbumCoverInput')?.addEventListener('change', previewNewCoverPopup);
    document.getElementById('saveAlbumEditPopup')?.addEventListener('click', saveAlbumInfoPopup);
    document.getElementById('managePhotosBtn')?.addEventListener('click', loadPhotosForManagement);
    
    // Listeners da Toolbar
    document.getElementById('cancelSelection')?.addEventListener('click', cancelSelection);
    document.getElementById('reorganizePhotos')?.addEventListener('click', enterReorganizeMode);
    document.getElementById('deleteSelectedPhotos')?.addEventListener('click', deleteSelectedPhotos);
    
    console.log('✅ Event listeners do modal de edição configurados');
}

// Inicializar quando o DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAlbumEditModal);
} else {
    initAlbumEditModal();
}

function closePopup() {
    const modal = document.getElementById('albumEditModalPopup');
    const toolbar = document.getElementById('bottomToolbar');
    
    if (modal) modal.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';
    
    // ✅ LIBERA O SCROLL DO BODY
    document.body.style.overflow = 'auto';
    
    // Limpar grid
    const grid = document.getElementById('editPhotosGrid');
    if (grid) {
        grid.style.display = 'none';
        grid.innerHTML = '';
    }
    
    // Resetar estado
    isReorganizing = false;
    window.currentEditingAlbumId = null;
    window.currentEditingAlbumPhotos = null;
    
    console.log('🔐 Modal fechado e estado resetado');
}

function previewNewCoverPopup(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 32 * 1024 * 1024) {
        alert('❌ Imagem muito grande! Máximo 32MB.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('popupAlbumCoverPreview');
        if (preview) preview.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function saveAlbumInfoPopup() {
    if (!window.currentEditingAlbumId) {
        alert('⚠️ Nenhum álbum selecionado para editar');
        return;
    }
    
    const saveBtn = document.getElementById('saveAlbumEditPopup');
    if (!saveBtn) return;
    
    const originalText = saveBtn.innerHTML;
    
    try {
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        saveBtn.disabled = true;
        
        const albumId = window.currentEditingAlbumId;
        const newTitle = document.getElementById('popupAlbumTitle')?.value.trim();
        const newDate = document.getElementById('popupAlbumDate')?.value.trim();
        const newDescription = document.getElementById('popupAlbumDescription')?.value.trim();
        
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
        
        // Upload nova capa se houver
        const coverInput = document.getElementById('popupAlbumCoverInput');
        if (coverInput && coverInput.files.length > 0) {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando capa...';
            
            if (typeof uploadImageToCloudinary !== 'function') {
                throw new Error('Sistema de upload não está disponível');
            }
            
            const coverUrls = await uploadImageToCloudinary(coverInput.files[0], 1600, true);
            updateData.cover = coverUrls.medium;
            updateData.coverThumb = coverUrls.thumb;
            updateData.coverLarge = coverUrls.large;
            updateData.coverWebP = coverUrls.webp;
        }
        
        await db.collection('albums').doc(albumId).update(updateData);
        
        alert('✅ Informações do álbum atualizadas com sucesso!');
        
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        
        // Recarregar listas
        if (typeof loadExistingAlbumsRedesign === 'function') {
            await loadExistingAlbumsRedesign();
        }
        
        if (typeof loadAlbumsFromFirebase === 'function') {
            await loadAlbumsFromFirebase();
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        alert('❌ Erro ao salvar: ' + error.message);
        
        if (saveBtn) {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
}

async function loadPhotosForManagement() {
    if (!window.currentEditingAlbumId) {
        alert('⚠️ Nenhum álbum selecionado');
        return;
    }
    
    const btn = document.getElementById('managePhotosBtn');
    const grid = document.getElementById('editPhotosGrid');
    
    if (!btn || !grid) {
        console.error('❌ Elementos não encontrados');
        return;
    }
    
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
        btn.disabled = true;
        
        // Buscar fotos do álbum
        const photoPagesSnapshot = await db.collection('album_photos')
            .where('albumId', '==', window.currentEditingAlbumId)
            .orderBy('pageNumber', 'asc')
            .get();
        
        const allPhotos = [];
        photoPagesSnapshot.forEach(pageDoc => {
            const pageData = pageDoc.data();
            if (pageData.photos && Array.isArray(pageData.photos)) {
                pageData.photos.forEach((photo, index) => {
                    allPhotos.push({
                        ...photo,
                        pageId: pageDoc.id,
                        pageNumber: pageData.pageNumber,
                        indexInPage: index
                    });
                });
            }
        });
        
        window.currentEditingAlbumPhotos = allPhotos;
        
        // Renderizar fotos
        renderPhotosForEdit(allPhotos);
        
        grid.style.display = 'grid';
        // Esconder estado vazio
        const emptyState = document.getElementById('emptyPhotosState');
        if (emptyState) emptyState.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-sync"></i> Recarregar Fotos';
        btn.disabled = false;
        
        console.log(`✅ ${allPhotos.length} fotos carregadas para gerenciamento`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar fotos:', error);
        alert('❌ Erro ao carregar fotos: ' + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function renderPhotosForEdit(photos) {
    const grid = document.getElementById('editPhotosGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (!photos || photos.length === 0) {
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
            <input type="checkbox" class="photo-checkbox" id="photo-${index}">
            <div class="photo-wrapper">
                <div class="photo-checkmark">
                    <i class="fas fa-check"></i>
                </div>
                <div class="photo-number" style="display: none;">${index + 1}</div>
            </div>
        `;
        
        grid.appendChild(photoCard);
        
        // Criar imagem com lazy loading
        const wrapper = photoCard.querySelector('.photo-wrapper');
        const img = document.createElement('img');
        img.src = photo.srcThumb || photo.src || 'images/capas-albuns/default-music.jpg';
        img.alt = `Foto ${index + 1}`;
        img.loading = 'lazy';
        img.decoding = 'async';
        wrapper.insertBefore(img, wrapper.firstChild);
        
        // Configurar eventos
        setupPhotoEvents(photoCard);
    });
    
    updateSelectionUI();
}

function setupPhotoEvents(photoCard) {
    const checkbox = photoCard.querySelector('input[type="checkbox"]');
    const wrapper = photoCard.querySelector('.photo-wrapper');
    
    if (!checkbox || !wrapper) return;
    
    let longPressTimer;
    let touchStartTime;
    let touchMoved = false;
    
    // Bloquear menu de contexto
    wrapper.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });
    
    // ===== TOUCH EVENTS (MOBILE) =====
    wrapper.addEventListener('touchstart', (e) => {
        if (isReorganizing) return;
        
        touchMoved = false;
        touchStartTime = Date.now();
        
        longPressTimer = setTimeout(() => {
            if (!touchMoved && !isReorganizing) {
                if (navigator.vibrate) navigator.vibrate(50);
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
    
    wrapper.addEventListener('touchend', () => {
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
    
    // ===== MOUSE EVENTS (DESKTOP) =====
    wrapper.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (isReorganizing) return;
        
        longPressTimer = setTimeout(() => {
            checkbox.checked = !checkbox.checked;
            photoCard.classList.toggle('selected', checkbox.checked);
            updateSelectionUI();
        }, 500);
    });
    
    wrapper.addEventListener('mouseup', () => clearTimeout(longPressTimer));
    wrapper.addEventListener('mouseleave', () => clearTimeout(longPressTimer));
    
    // Bloquear arrastar imagem
    wrapper.addEventListener('dragstart', (e) => {
        if (!isReorganizing) {
            e.preventDefault();
            return false;
        }
    });
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
    
    if (!bottomToolbar || !selectionCountSpan) return;
    
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
    if (isReorganizing) {
        exitReorganizeMode(false);
        return;
    }
    
    const checkboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]');
    
    checkboxes.forEach(cb => {
        cb.checked = false;
        const photoCard = cb.closest('.gallery-photo');
        if (photoCard) photoCard.classList.remove('selected');
    });
    
    updateSelectionUI();
    console.log('✅ Seleção cancelada');
}

function enterReorganizeMode() {
    const reorganizeBtn = document.getElementById('reorganizePhotos');
    
    if (!reorganizeBtn) return;
    
    if (isReorganizing) {
        saveNewPhotoOrder();
        return;
    }
    
    isReorganizing = true;
    
    reorganizeBtn.innerHTML = '<i class="fas fa-save"></i><span>Salvar</span>';
    reorganizeBtn.classList.add('active');
    
    const deleteBtn = document.getElementById('deleteSelectedPhotos');
    const cancelBtn = document.getElementById('cancelSelection');
    
    if (deleteBtn) deleteBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.innerHTML = '<i class="fas fa-times"></i><span>Cancelar</span>';
    
    // Limpar seleção antes de entrar no modo reorganizar
    const checkboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = false;
        const photoCard = cb.closest('.gallery-photo');
        if (photoCard) photoCard.classList.remove('selected');
    });
    
    const selectionCountSpan = document.getElementById('selectionCount');
    const toolbar = document.getElementById('bottomToolbar');
    
    if (selectionCountSpan) selectionCountSpan.textContent = 'Arraste para reorganizar';
    if (toolbar) toolbar.style.display = 'flex';
    
    // Ativar arrastar
    const photos = document.querySelectorAll('.gallery-photo');
    photos.forEach((photo, index) => {
        photo.classList.add('draggable');
        photo.setAttribute('draggable', 'true');
        
        const numberEl = photo.querySelector('.photo-number');
        if (numberEl) {
            numberEl.style.display = 'flex';
            numberEl.textContent = index + 1;
        }
        
        // Desktop drag
        photo.addEventListener('dragstart', handleDragStart);
        photo.addEventListener('dragover', handleDragOver);
        photo.addEventListener('drop', handleDrop);
        photo.addEventListener('dragend', handleDragEnd);
        
        // Mobile touch
        photo.addEventListener('touchstart', handleTouchStartReorganize, { passive: true });
        photo.addEventListener('touchmove', handleTouchMoveReorganize, { passive: false });
        photo.addEventListener('touchend', handleTouchEndReorganize, { passive: true });
    });
    
    console.log('📱 Modo reorganizar ativado');
}

function exitReorganizeMode(save = false) {
    isReorganizing = false;
    
    const reorganizeBtn = document.getElementById('reorganizePhotos');
    
    if (!reorganizeBtn) return;
    
    if (save) {
        saveNewPhotoOrder();
        return;
    }
    
    reorganizeBtn.innerHTML = '<i class="fas fa-sort"></i><span>Reorganizar</span>';
    reorganizeBtn.classList.remove('active');
    reorganizeBtn.disabled = false;
    
    const deleteBtn = document.getElementById('deleteSelectedPhotos');
    const cancelBtn = document.getElementById('cancelSelection');
    const toolbar = document.getElementById('bottomToolbar');
    
    if (deleteBtn) deleteBtn.style.display = 'flex';
    if (cancelBtn) cancelBtn.innerHTML = '<i class="fas fa-times"></i><span>Cancelar</span>';
    if (toolbar) toolbar.style.display = 'none';
    
    const photos = document.querySelectorAll('.gallery-photo');
    photos.forEach(photo => {
        photo.classList.remove('draggable');
        photo.removeAttribute('draggable');
        
        const numberEl = photo.querySelector('.photo-number');
        if (numberEl) numberEl.style.display = 'none';
        
        // Remover listeners
        photo.removeEventListener('dragstart', handleDragStart);
        photo.removeEventListener('dragover', handleDragOver);
        photo.removeEventListener('drop', handleDrop);
        photo.removeEventListener('dragend', handleDragEnd);
        photo.removeEventListener('touchstart', handleTouchStartReorganize);
        photo.removeEventListener('touchmove', handleTouchMoveReorganize);
        photo.removeEventListener('touchend', handleTouchEndReorganize);
    });
    
    console.log('📱 Modo reorganizar desativado');
}

// ===== DRAG & DROP HANDLERS (DESKTOP) =====
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

function handleDragEnd() {
    this.classList.remove('dragging');
    
    document.querySelectorAll('.gallery-photo').forEach(photo => {
        photo.classList.remove('drag-over');
    });
}

// ===== TOUCH HANDLERS (MOBILE) - REORGANIZAR =====
function handleTouchStartReorganize(e) {
    if (!isReorganizing) return;
    
    isTouchDragging = false;
    touchedElement = this;
    draggedIndex = parseInt(this.getAttribute('data-index'));
    
    const touch = e.touches[0];
    touchStartXPos = touch.clientX;
    touchStartYPos = touch.clientY;
    touchStartTimestamp = Date.now();
    
    longPressTouchTimer = setTimeout(() => {
        if (touchedElement && !isTouchDragging) {
            isTouchDragging = true;
            touchedElement.classList.add('dragging');
            if (navigator.vibrate) navigator.vibrate(50);
        }
    }, LONG_PRESS_THRESHOLD);
}

function handleTouchMoveReorganize(e) {
    if (!isReorganizing || !touchedElement) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartXPos);
    const deltaY = Math.abs(touch.clientY - touchStartYPos);
    
    if (!isTouchDragging) {
        if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
            clearTimeout(longPressTouchTimer);
            touchedElement = null;
            return;
        }
        return;
    }
    
    if (e.cancelable) e.preventDefault();
    
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const photoBelow = elementBelow?.closest('.gallery-photo');
    
    document.querySelectorAll('.gallery-photo').forEach(p => {
        if (p !== touchedElement) p.classList.remove('drag-over');
    });
    
    if (photoBelow && photoBelow !== touchedElement) {
        const targetIndex = parseInt(photoBelow.getAttribute('data-index'));
        if (draggedIndex !== targetIndex) {
            photoBelow.classList.add('drag-over');
        }
    }
}

function handleTouchEndReorganize(e) {
    if (!isReorganizing) return;
    
    clearTimeout(longPressTouchTimer);
    
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
        }
    }
    
    if (touchedElement) touchedElement.classList.remove('dragging');
    
    document.querySelectorAll('.gallery-photo').forEach(p => {
        p.classList.remove('drag-over');
    });
    
    touchedElement = null;
    isTouchDragging = false;
}

function swapPhotos(fromIndex, toIndex) {
    if (!window.currentEditingAlbumPhotos) return;
    
    const photos = window.currentEditingAlbumPhotos;
    
    const movedPhoto = photos.splice(fromIndex, 1)[0];
    photos.splice(toIndex, 0, movedPhoto);
    
    renderPhotosForEditInReorganizeMode(photos);
    
    console.log(`📸 Foto ${fromIndex + 1} movida para posição ${toIndex + 1}`);
}

function renderPhotosForEditInReorganizeMode(photos) {
    const grid = document.getElementById('editPhotosGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    photos.forEach((photo, index) => {
        const photoCard = document.createElement('div');
        photoCard.className = 'gallery-photo draggable';
        photoCard.setAttribute('data-index', index);
        photoCard.setAttribute('draggable', 'true');
        
        photoCard.innerHTML = `
            <div class="photo-wrapper">
                <img src="${photo.srcThumb || photo.src}" alt="Foto ${index + 1}" loading="lazy" decoding="async">
                <div class="photo-number" style="display: flex;">${index + 1}</div>
            </div>
        `;
        
        // Desktop drag
        photoCard.addEventListener('dragstart', handleDragStart);
        photoCard.addEventListener('dragover', handleDragOver);
        photoCard.addEventListener('drop', handleDrop);
        photoCard.addEventListener('dragend', handleDragEnd);
        
        // Mobile touch
        photoCard.addEventListener('touchstart', handleTouchStartReorganize, { passive: true });
        photoCard.addEventListener('touchmove', handleTouchMoveReorganize, { passive: false });
        photoCard.addEventListener('touchend', handleTouchEndReorganize, { passive: true });
        
        grid.appendChild(photoCard);
    });
}

async function saveNewPhotoOrder() {
    if (!window.currentEditingAlbumId || !window.currentEditingAlbumPhotos) {
        alert('⚠️ Nenhum álbum carregado');
        return;
    }
    
    const reorganizeBtn = document.getElementById('reorganizePhotos');
    if (!reorganizeBtn) return;
    
    const originalText = reorganizeBtn.innerHTML;
    
    try {
        reorganizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Salvando...</span>';
        reorganizeBtn.disabled = true;
        
        const photos = window.currentEditingAlbumPhotos;
        const albumId = window.currentEditingAlbumId;
        
        const PHOTOS_PER_PAGE = 200;
        const newPages = [];
        
        for (let i = 0; i < photos.length; i += PHOTOS_PER_PAGE) {
            newPages.push(photos.slice(i, i + PHOTOS_PER_PAGE));
        }
        
        // Deletar páginas antigas
        const oldPagesSnapshot = await db.collection('album_photos')
            .where('albumId', '==', albumId)
            .get();
        
        const deletePromises = [];
        oldPagesSnapshot.forEach(doc => {
            deletePromises.push(db.collection('album_photos').doc(doc.id).delete());
        });
        
        await Promise.all(deletePromises);
        
 // Criar novas páginas
for (let pageIndex = 0; pageIndex < newPages.length; pageIndex++) {
    // ✅ LIMPA dados antes de salvar
    const cleanedPhotos = newPages[pageIndex].map(p => cleanFirebaseData({
        src: p.src,
        srcThumb: p.srcThumb,
        srcLarge: p.srcLarge,
        srcWebP: p.srcWebP,
        description: p.description || '',
        timestamp: Date.now() + (pageIndex * PHOTOS_PER_PAGE) + newPages[pageIndex].indexOf(p)
    }));
    
    await db.collection('album_photos').add({
        albumId: albumId,
        pageNumber: pageIndex,
        photos: cleanedPhotos,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}
        
        alert('✅ Nova ordem das fotos salva com sucesso!');
        
        exitReorganizeMode(false);
        
        if (typeof loadAlbumsFromFirebase === 'function') {
            await loadAlbumsFromFirebase();
        }
        
        await loadPhotosForManagement();
        
        reorganizeBtn.innerHTML = originalText;
        reorganizeBtn.disabled = false;
        
    } catch (error) {
        console.error('❌ Erro ao salvar nova ordem:', error);
        alert('❌ Erro ao salvar: ' + error.message);
        
        if (reorganizeBtn) {
            reorganizeBtn.innerHTML = originalText;
            reorganizeBtn.disabled = false;
        }
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
    
    if (!confirm(confirmMsg + '\n\nISTO NÃO DELETARÁ as imagens do ImgBB.')) {
        return;
    }
    
    const currentAlbumId = window.currentEditingAlbumId;
    const btn = document.getElementById('deleteSelectedPhotos');
    const toolbar = document.getElementById('bottomToolbar');
    
    if (!btn || !toolbar) return;
    
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deletando...';
        btn.disabled = true;
        
        const selectedIndices = Array.from(checkboxes).map(cb => {
            return parseInt(cb.closest('.gallery-photo').getAttribute('data-index'));
        }).sort((a, b) => b - a);
        
        const remainingPhotos = window.currentEditingAlbumPhotos.filter((photo, index) => {
            return !selectedIndices.includes(index);
        });
        
        const PHOTOS_PER_PAGE = 200;
        const newPages = [];
        
        for (let i = 0; i < remainingPhotos.length; i += PHOTOS_PER_PAGE) {
            newPages.push(remainingPhotos.slice(i, i + PHOTOS_PER_PAGE));
        }
        
        // Deletar páginas antigas
        const oldPagesSnapshot = await db.collection('album_photos')
            .where('albumId', '==', currentAlbumId)
            .get();
        
        const deletePromises = [];
        oldPagesSnapshot.forEach(doc => {
            deletePromises.push(db.collection('album_photos').doc(doc.id).delete());
        });
        
        await Promise.all(deletePromises);
        
// Criar novas páginas (se houver fotos restantes)
if (newPages.length > 0) {
    for (let pageIndex = 0; pageIndex < newPages.length; pageIndex++) {
        // ✅ LIMPA dados antes de salvar
        const cleanedPhotos = newPages[pageIndex].map(p => cleanFirebaseData({
            src: p.src,
            srcThumb: p.srcThumb,
            srcLarge: p.srcLarge,
            srcWebP: p.srcWebP,
            description: p.description || '',
            timestamp: p.timestamp || Date.now()
        }));
        
        await db.collection('album_photos').add({
            albumId: currentAlbumId,
            pageNumber: pageIndex,
            photos: cleanedPhotos,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}
        
        // Atualizar contador
        await db.collection('albums').doc(currentAlbumId).update({
            photoCount: remainingPhotos.length
        });
        
        alert(`✅ ${selectedIndices.length} foto(s) deletada(s) com sucesso!`);
        
        btn.innerHTML = originalText;
        btn.disabled = false;
        toolbar.style.display = 'none';
        
        // Limpar seleções
const allCheckboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]');
allCheckboxes.forEach(cb => {
cb.checked = false;
const photoCard = cb.closest('.gallery-photo');
if (photoCard) {
photoCard.classList.remove('selected', 'selection-mode');
}
});
    // Atualizar array local
    window.currentEditingAlbumPhotos = remainingPhotos;
    
    // Recarregar
    await loadPhotosForManagement();
    
    if (typeof loadAlbumsFromFirebase === 'function') {
        await loadAlbumsFromFirebase();
    }
    
    if (typeof loadExistingAlbumsRedesign === 'function') {
        await loadExistingAlbumsRedesign();
    }
    
} catch (error) {
    console.error('❌ Erro ao deletar fotos:', error);
    alert('❌ Erro ao deletar fotos: ' + error.message);
    
    if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
}

// ===== SISTEMA DE TABS DO POPUP DE EDIÇÃO =====
function initAlbumEditTabs() {
    const tabs = document.querySelectorAll('.album-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            // Remove active de todas as tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Adiciona active na tab clicada
            this.classList.add('active');
            
            // Mostra/esconde conteúdo
            document.querySelectorAll('.album-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const targetContent = document.getElementById(`${targetTab}-content`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
    
    console.log('✅ Tabs do popup de edição inicializadas');
}

// Inicializar quando o DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAlbumEditTabs);
} else {
    initAlbumEditTabs();
}

console.log('✅ Sistema completo de gerenciamento de fotos do álbum carregado!');
