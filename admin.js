// ===== SISTEMA DE ADMIN COM FIREBASE + IMGBB (VERDADEIRAMENTE ILIMITADO) =====

console.log('🔐 Sistema de Admin ILIMITADO carregado');

let isAdminUnlocked = false;

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
    
    // 🔥 IMPORTANTE: Remover listeners antigos ANTES de clonar
    allTabs.forEach(tab => {
        // Verificar se já tem listener
        if (tab.dataset.listenerAttached === 'true') {
            console.log('⚠️ Tab já tem listener, pulando...');
            return;
        }
        
        // Adicionar listener direto (sem clonar)
        tab.addEventListener('click', function handleTabClick() {
            const targetTab = this.dataset.tab;
            
            // Remover active de todas as tabs
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Remover active de todos os conteúdos
            document.querySelectorAll('.admin-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Ativar conteúdo correto
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
                
                // Se for a aba de edição, atualizar select
                if (targetTab === 'edit') {
                    if (typeof updateEditAlbumSelect === 'function') {
                        updateEditAlbumSelect();
                    }
                }
            }
        });
        
        // Marcar como inicializado
        tab.dataset.listenerAttached = 'true';
    });
    
    // Inicializar tabs arrastáveis (apenas uma vez)
    initTabsDraggable();
    
    console.log(`✅ ${allTabs.length} tabs configuradas (sem duplicação)`);
}

// ===== SISTEMA DE ARRASTE SUAVE PARA ABAS ADMIN =====
// Substitua a função initTabsDraggable() no seu admin.js

function initTabsDraggable() {
    const tabsContainer = document.querySelector('.admin-tabs');
    if (!tabsContainer) {
        console.warn('⚠️ Container de tabs não encontrado');
        return;
    }
    
    // Prevenir múltiplas inicializações
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
    
    // ===== CONFIGURAÇÕES DE SUAVIZAÇÃO =====
    const FRICTION = 0.92; // Quanto menor, mais rápido para (0.8-0.95)
    const SENSITIVITY = 1.2; // Multiplicador de velocidade (1.0-2.0)
    const MIN_VELOCITY = 0.1; // Velocidade mínima para continuar o movimento
    
    // ===== MOUSE EVENTS (DESKTOP) =====
    const handleMouseDown = (e) => {
        // 🔥 Não arrastar se clicar diretamente em uma aba
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
        
        // Parar qualquer animação de momentum
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
            
            // Calcular velocidade
            const deltaX = e.pageX - lastX;
            velocity = deltaX / deltaTime * 16; // Normalizar para 60fps
            
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
        
        // Aplicar momentum (inércia)
        applyMomentum();
    };
    
    const handleMouseLeave = () => {
        if (isDown) {
            handleMouseUp();
        }
    };
    
    // ===== TOUCH EVENTS (MOBILE) - OTIMIZADO =====
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
        
        // Parar animação anterior
        cancelAnimationFrame(tabsContainer.momentumAnimation);
    };
    
    const handleTouchMove = (e) => {
        if (!isTouching) return;
        
        const currentTime = Date.now();
        const deltaTime = currentTime - touchLastTime;
        
        if (deltaTime > 0) {
            const x = e.touches[0].pageX - tabsContainer.offsetLeft;
            const walk = (x - touchStartX) * SENSITIVITY;
            
            // Calcular velocidade
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
        
        // Aplicar momentum
        velocity = touchVelocity;
        applyMomentum();
    };
    
    // ===== FUNÇÃO DE MOMENTUM (INÉRCIA) =====
    function applyMomentum() {
        if (Math.abs(velocity) < MIN_VELOCITY) {
            tabsContainer.style.scrollBehavior = 'smooth';
            return;
        }
        
        // Aplicar velocidade
        tabsContainer.scrollLeft -= velocity;
        
        // Aplicar fricção
        velocity *= FRICTION;
        
        // Continuar animação
        tabsContainer.momentumAnimation = requestAnimationFrame(applyMomentum);
    }
    
    // ===== ADICIONAR LISTENERS (APENAS UMA VEZ) =====
    tabsContainer.addEventListener('mousedown', handleMouseDown);
    tabsContainer.addEventListener('mousemove', handleMouseMove);
    tabsContainer.addEventListener('mouseup', handleMouseUp);
    tabsContainer.addEventListener('mouseleave', handleMouseLeave);
    
    tabsContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    tabsContainer.addEventListener('touchmove', handleTouchMove, { passive: true });
    tabsContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // Marcar como inicializado
    tabsContainer.dataset.draggableInitialized = 'true';
    
    console.log('✅ Tabs arrastáveis inicializadas (versão suave otimizada)');
}

// ===== CSS ADICIONAL PARA MELHORAR O ARRASTE =====
// Adicione este estilo no seu CSS ou crie uma tag <style>

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
    
    /* Melhorar performance do scroll */
    .admin-tabs {
        will-change: scroll-position;
    }
`;

// Injetar estilos
if (!document.getElementById('smooth-drag-styles')) {
    const styleTag = document.createElement('style');
    styleTag.id = 'smooth-drag-styles';
    styleTag.textContent = smoothDragStyles;
    document.head.appendChild(styleTag);
}

console.log('✅ Sistema de arraste suave aplicado!');


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
    
// Abrir modal (com senha)
    adminToggleBtn.addEventListener('click', () => {
        if (!isAdminUnlocked) {
            const password = prompt('🔐 Digite a senha de admin:');
            
            // ALTERE AQUI A SUA SENHA
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
    
    // Fechar modal
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
    
// Configurar sistema de tabs
    setupTabListeners();
    
    // ← ADICIONAR ESTE BLOCO COMPLETO
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Se for aba de edição, adicionar ao histórico
            if (targetTab === 'edit') {
                console.log('📝 Aba de edição aberta - adicionado ao histórico');
            }
        });
    });
    
    // Inicializar formulários
    initAlbumForms();
    initTimelineForms();
    
    console.log('✅ Sistema de admin inicializado');
}

// ===== GERENCIAMENTO DE ÁLBUNS COM IMGBB (ILIMITADO) =====
function initAlbumForms() {
    const addAlbumForm = document.getElementById('addAlbumForm');
    const addPhotoForm = document.getElementById('addPhotoForm');
    const selectAlbum = document.getElementById('selectAlbum');
    
    // Criar novo álbum
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
        
        // ✅ REMOVIDO: limite de 10MB (agora aceita até 32MB do ImgBB)
        if (coverFile.size > 32 * 1024 * 1024) {
            alert('❌ Imagem muito grande! O ImgBB aceita até 32MB por imagem.');
            return;
        }
        
        try {
            const btn = addAlbumForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando para ImgBB...';
            btn.disabled = true;
            
            // Upload para ImgBB
            const coverUrl = await uploadImageToCloudinary(coverFile, 800);
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando no Firebase...';
            
            // Criar documento no Firebase (apenas URL)
            await db.collection('albums').add({
                title: title,
                date: date,
                cover: coverUrl,
                description: description,
                photoCount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            alert(`✅ Álbum "${title}" criado com sucesso!`);
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
    
    // ✅ ADICIONAR FOTOS AO ÁLBUM (VERDADEIRAMENTE ILIMITADO)
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
        
        // ✅ REMOVIDO: limite de 30 fotos (agora aceita QUANTAS QUISER)
        // Agora apenas avisa se for mais de 100 (por questão de tempo de processamento)
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
            
            // Upload de todas as fotos para ImgBB
            const photoUrls = [];
            let uploadErrors = 0;
            
            for (let i = 0; i < photoFiles.length; i++) {
                // ✅ ALTERADO: Agora aceita até 32MB (limite do ImgBB)
                if (photoFiles[i].size > 32 * 1024 * 1024) {
                    uploadErrors++;
                    console.warn(`⚠️ Foto ${i + 1} ignorada (maior que 32MB)`);
                    continue;
                }
                
                btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Enviando ${i + 1}/${photoFiles.length} para ImgBB...`;
                
                try {
                const url = await uploadImageToCloudinary(photoFiles[i], 1600);
                photoUrls.push({
                    src: url,
                    description: '',
                    timestamp: Date.now() + i
                });
                    
                    // Delay menor para ser mais rápido
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
            
            // ✅ ALTERADO: Agora 200 fotos por página (Firebase aceita até 1MB por documento)
            // Como cada URL tem ~100 bytes, 200 URLs = ~20KB (muito abaixo do limite)
            const PHOTOS_PER_PAGE = 200;
            const pages = [];
            
            for (let i = 0; i < photoUrls.length; i += PHOTOS_PER_PAGE) {
                pages.push(photoUrls.slice(i, i + PHOTOS_PER_PAGE));
            }
            
            // Salvar cada página
            for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                await db.collection('album_photos').add({
                    albumId: albumId,
                    pageNumber: pageIndex,
                    photos: pages[pageIndex],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Atualizar contador
            const albumDoc = await db.collection('albums').doc(albumId).get();
            const currentCount = albumDoc.data().photoCount || 0;
            
            await db.collection('albums').doc(albumId).update({
                photoCount: currentCount + photoUrls.length
            });
            
            // Mensagem de sucesso com avisos se houver erros
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
        
        // ✅ ALTERADO: Aceita até 32MB
        if (photoFile.size > 32 * 1024 * 1024) {
            alert('❌ Imagem muito grande! O ImgBB aceita até 32MB.');
            return;
        }
        
        try {
            const btn = addTimelineForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando para ImgBB...';
            btn.disabled = true;
            
            // Upload para ImgBB
            const photoUrl = await uploadImageToCloudinary(photoFile, 1200);
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando posição...';
            
            // DETERMINAR LADO AUTOMATICAMENTE (sempre começa ESQUERDA)
            let eventSide = 'left';
            try {
                const allEvents = await db.collection('timeline').get();
                const totalEvents = allEvents.size;
                eventSide = totalEvents % 2 === 0 ? 'left' : 'right';
                console.log(`📍 Evento ${totalEvents + 1} será adicionado no lado: ${eventSide}`);
            } catch (error) {
                console.log('Primeiro evento - usando lado esquerdo');
            }
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando no Firebase...';
            
            // Criar evento no Firebase
            await db.collection('timeline').add({
                date: eventDate,
                title: eventTitle,
                secret: eventSecret || null,
                photo: photoUrl,
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
            
            // Buscar todas as páginas de fotos
            const photoPagesSnapshot = await db.collection('album_photos')
                .where('albumId', '==', doc.id)
                .orderBy('pageNumber', 'asc')
                .get();
            
            // Juntar todas as fotos
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
        
        // Mesclar com álbuns originais
        if (typeof window.albums !== 'undefined') {
            window.albums = [...window.originalAlbums, ...firebaseAlbums];
        }
        
        // Recarregar galeria
        if (typeof initAlbums === 'function') {
            initAlbums();
        }
        
        console.log(`✅ ${firebaseAlbums.length} álbuns carregados (ImgBB + Firebase)`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar álbuns:', error);
    }
}

// ===== RECONSTRUIR TIMELINE =====
async function rebuildTimeline() {
    const container = document.querySelector('.timeline-container');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('timeline').orderBy('createdAt', 'asc').get();
        
        // Remover eventos customizados anteriores
        const customItems = container.querySelectorAll('.timeline-item[data-custom="true"]');
        customItems.forEach(item => item.remove());
        
        const timelineEnd = container.querySelector('.timeline-end');
        
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
                            <button class="secret-message-btn" data-message="${event.secret}">
                                <i class="fas fa-lock"></i> Mensagem Secreta
                            </button>
                        ` : ''}
                    </div>
                    <div class="timeline-photo">
                        <div class="photo-polaroid">
                            <img src="${event.photo}" alt="${event.title}">
                            <p class="polaroid-caption">${event.caption}</p>
                        </div>
                    </div>
                </div>
                <div class="timeline-line"></div>
            `;
            
            container.insertBefore(item, timelineEnd);
        });
        
        // Reinicializar botões de mensagem secreta
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
    await loadExistingAlbums();
    await loadExistingEvents();
}

async function loadExistingAlbums() {
    const container = document.getElementById('existingAlbums');
    
    try {
        const snapshot = await db.collection('albums').orderBy('createdAt', 'desc').get();
        
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="color: var(--theme-text-secondary); text-align: center;">Nenhum álbum criado ainda</p>';
            return;
        }
        
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
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error('❌ Erro ao carregar álbuns:', error);
        container.innerHTML = '<p style="color: #ff5050;">Erro ao carregar álbuns</p>';
    }
}

async function loadExistingEvents() {
    const container = document.getElementById('existingEvents');
    
    try {
        const snapshot = await db.collection('timeline').orderBy('createdAt', 'desc').get();
        
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="color: var(--theme-text-secondary); text-align: center;">Nenhum evento criado ainda</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const event = doc.data();
            const item = document.createElement('div');
            item.className = 'existing-item';
            item.innerHTML = `
                <div class="existing-item-info">
                    <div class="existing-item-title">${event.title}</div>
                    <div class="existing-item-meta">${event.date} • Lado ${event.side === 'left' ? 'esquerdo' : 'direito'}</div>
                </div>
                <button class="delete-item-btn" onclick="deleteEvent('${doc.id}')">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            `;
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error('❌ Erro ao carregar eventos:', error);
        container.innerHTML = '<p style="color: #ff5050;">Erro ao carregar eventos</p>';
    }
}

// ===== FUNÇÕES DE EXCLUSÃO =====
window.deleteAlbum = async function(albumId) {
    if (!confirm('❌ Tem certeza que deseja excluir este álbum?\n\nISSO NÃO DELETARÁ as imagens do ImgBB (elas ficarão lá para sempre).')) {
        return;
    }
    
    try {
        // Deletar documento principal
        await db.collection('albums').doc(albumId).delete();
        
        // Deletar todas as páginas de fotos
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

// ===== INICIALIZAR NO CARREGAMENTO =====
document.addEventListener('DOMContentLoaded', async () => {
    await waitForServices();
    
    // Salvar álbuns originais
    if (typeof albums !== 'undefined') {
        window.originalAlbums = JSON.parse(JSON.stringify(albums));
    }
    
    initAdmin();
    
    // Carregar conteúdo do Firebase
    setTimeout(async () => {
        await loadAlbumsFromFirebase();
        await rebuildTimeline();
    }, 1000);
});

// ===== SISTEMA DE EDIÇÃO DE ÁLBUNS (DELETAR E REORGANIZAR FOTOS) =====

console.log('✏️ Sistema de edição de álbuns carregado');

// ===== ADICIONAR ABA DE EDIÇÃO - DESIGN GALERIA NATIVA =====
function addEditTabToAdmin() {
    const tabsContainer = document.querySelector('.admin-tabs');
    const contentArea = tabsContainer.parentElement;
    
    // Verificar se já existe
    if (document.querySelector('[data-tab="edit"]')) return;
    
    // Adicionar botão da aba
    const editTab = document.createElement('button');
    editTab.className = 'admin-tab';
    editTab.setAttribute('data-tab', 'edit');
    editTab.innerHTML = '<i class="fas fa-edit"></i> Editar Álbum';
    tabsContainer.appendChild(editTab);
    
    // Adicionar conteúdo da aba
    const editContent = document.createElement('div');
    editContent.className = 'admin-content';
    editContent.id = 'edit-tab';
    editContent.innerHTML = `
        <!-- Seletor de álbum -->
        <div class="admin-section">
            <h3><i class="fas fa-folder-open"></i> Selecione um Álbum</h3>
            <select id="editAlbumSelect" class="admin-select">
                <option value="">Escolha um álbum...</option>
            </select>
            <button id="loadEditAlbumBtn" class="admin-btn" style="margin-top: 12px;">
                <i class="fas fa-images"></i> Carregar Fotos
            </button>
        </div>
        
        <!-- Área de edição de informações do álbum -->
        <div id="editAlbumInfoSection" style="display: none;">
        <div class="admin-section">
            <h3><i class="fas fa-pen"></i> Editar Informações do Álbum</h3>
            <div class="swipe-edit-container">
                <div class="swipe-edit-wrapper">
                    <button id="toggleAlbumInfoEdit" class="swipeable-edit-btn">
                        <div class="swipe-content">
                            <i class="fas fa-edit"></i>
                            <span class="edit-text">Editar Álbum</span>
                        </div>
                        <div class="swipe-indicator">
                            <i class="fas fa-chevron-left"></i>
                            <span>Arraste</span>
                        </div>
                    </button>
                </div>
            </div>             
                <!-- Form de edição (inicialmente oculto) -->
                <div id="albumInfoEditForm" style="display: none; margin-top: 15px;">
                    <div class="edit-form-grid">
                        <!-- Preview da capa -->
                        <div class="cover-preview-container">
                            <img id="currentCoverPreview" src="" alt="Capa atual">
                            <label for="newCoverInput" class="change-cover-label">
                                <i class="fas fa-camera"></i>
                                <span>Trocar Capa</span>
                            </label>
                            <input type="file" id="newCoverInput" accept="image/*" style="display: none;" aria-label="Selecionar nova capa do álbum">
                        </div>
                        
                        <!-- Campos de texto -->
                        <div class="edit-fields-container">
                            <div class="edit-field">
                                <label>Título</label>
                                <input type="text" id="editAlbumTitle" placeholder="Título do álbum">
                            </div>
                            
                            <div class="edit-field">
                                <label>Data</label>
                                <input type="text" id="editAlbumDate" placeholder="Ex: Junho 2023">
                            </div>
                            
                            <div class="edit-field">
                                <label>Descrição</label>
                                <textarea id="editAlbumDescription" rows="3" placeholder="Descrição do álbum"></textarea>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Botões de ação -->
                    <div class="edit-actions">
                        <button id="cancelAlbumEdit" class="minimal-btn cancel">
                            <i class="fas fa-times"></i>
                            <span>Cancelar</span>
                        </button>
                        <button id="saveAlbumEdit" class="minimal-btn save">
                            <i class="fas fa-check"></i>
                            <span>Salvar</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Área de edição -->
        <div id="editAlbumSection" style="display: none;">
            <!-- Grid de fotos (estilo galeria real) -->
            <div id="editPhotosGrid" class="edit-photos-grid"></div>
        </div>
    `;
    
    contentArea.appendChild(editContent);
    
    // 🔥 CRIAR TOOLBAR FORA DO MODAL (no body)
    let toolbar = document.getElementById('bottomToolbar');
    if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.className = 'bottom-toolbar';
        toolbar.id = 'bottomToolbar';
        toolbar.style.display = 'none';
        toolbar.innerHTML = `
            <button id="cancelSelection" class="bottom-btn cancel-btn">
                <i class="fas fa-times"></i>
                <span>Cancelar</span>
            </button>
            
            <div class="bottom-info">
                <span id="selectionCount">0 selecionadas</span>
            </div>
            
            <button id="reorganizePhotos" class="bottom-btn reorganize-btn">
                <i class="fas fa-sort"></i>
                <span>Reorganizar</span>
            </button>
            
            <button id="deleteSelectedPhotos" class="bottom-btn delete-btn">
                <i class="fas fa-trash"></i>
                <span>Deletar</span>
            </button>
        `;
        document.body.appendChild(toolbar);
    }
    
    // Re-inicializar listeners de todas as tabs
    setupTabListeners();
    
    // Event listeners
    document.getElementById('loadEditAlbumBtn').addEventListener('click', loadAlbumForEdit);
    document.getElementById('cancelSelection').addEventListener('click', cancelSelection);
    document.getElementById('reorganizePhotos').addEventListener('click', enterReorganizeMode);
    document.getElementById('deleteSelectedPhotos').addEventListener('click', deleteSelectedPhotos);
    document.getElementById('toggleAlbumInfoEdit').addEventListener('click', toggleAlbumInfoEdit);
    document.getElementById('cancelAlbumEdit').addEventListener('click', cancelAlbumInfoEdit);
    document.getElementById('saveAlbumEdit').addEventListener('click', saveAlbumInfo);
    document.getElementById('newCoverInput').addEventListener('change', previewNewCover);
        
        // 🔥 INICIALIZAR SISTEMA DE ARRASTAR APÓS CRIAR O BOTÃO
        setTimeout(() => {
            initSwipeableEditButton();
            console.log('✅ Botão arrastável inicializado');
        }, 1500);
        
        // Listener para botão "voltar" do Android
        setupBackButtonHandler();
        
        console.log('✅ Aba de edição com design galeria nativa criada');
    }

// ===== ATUALIZAR SELECT DE ÁLBUNS PARA EDIÇÃO =====
async function updateEditAlbumSelect() {
    const select = document.getElementById('editAlbumSelect');
    
    try {
        const snapshot = await db.collection('albums').orderBy('createdAt', 'desc').get();
        
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

// ===== RECRIAR LISTENERS DA TOOLBAR (CORRIGE BUG DE TRAVAMENTO) =====
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
        
        // 🔥 GARANTIR QUE O BOTÃO ESTÁ HABILITADO
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

// ===== CARREGAR ÁLBUM PARA EDIÇÃO =====
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
        
        // Buscar dados do álbum
        const albumDoc = await db.collection('albums').doc(albumId).get();
        const albumData = albumDoc.data();
        
        // Buscar todas as páginas de fotos
        const photoPagesSnapshot = await db.collection('album_photos')
            .where('albumId', '==', albumId)
            .orderBy('pageNumber', 'asc')
            .get();
        
        // Juntar todas as fotos com seus IDs de página
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
        
        // Armazenar dados globalmente
        window.currentEditAlbum = {
            id: albumId,
            data: albumData,
            photos: allPhotos
        };
        
        // Renderizar fotos
        renderPhotosForEdit(allPhotos, albumData.title);
        
        btn.innerHTML = '<i class="fas fa-folder-open"></i> Carregar Álbum';
        btn.disabled = false;
        
        // 🔥 IMPORTANTE: Recriar listeners dos botões da toolbar
        recreateToolbarListeners();

        // ✅ PREENCHER CAMPOS DE EDIÇÃO
        document.getElementById('editAlbumTitle').value = albumData.title || '';
        document.getElementById('editAlbumDate').value = albumData.date || '';
        document.getElementById('editAlbumDescription').value = albumData.description || '';
        document.getElementById('currentCoverPreview').src = albumData.cover || '';
        document.getElementById('editAlbumSection').style.display = 'block';
        document.getElementById('editAlbumInfoSection').style.display = 'block'; // ← Mostrar seção de edição
        
        console.log(`✅ ${allPhotos.length} fotos carregadas para edição`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar álbum:', error);
        alert('❌ Erro ao carregar álbum: ' + error.message);
        
        const btn = document.getElementById('loadEditAlbumBtn');
        btn.innerHTML = '<i class="fas fa-folder-open"></i> Carregar Álbum';
        btn.disabled = false;
    }
}

// ===== FUNÇÕES DE EDIÇÃO DE INFORMAÇÕES DO ÁLBUM =====

function toggleAlbumInfoEdit() {
    const form = document.getElementById('albumInfoEditForm');
    const btn = document.getElementById('toggleAlbumInfoEdit');
    
    if (form.style.display === 'none') {
        form.style.display = 'block';
        btn.querySelector('.edit-text').textContent = 'Fechar';
        btn.querySelector('.swipe-content i').className = 'fas fa-times';
        console.log('✏️ Formulário de edição aberto');
    } else {
        form.style.display = 'none';
        btn.querySelector('.edit-text').textContent = 'Editar Álbum';
        btn.querySelector('.swipe-content i').className = 'fas fa-edit';
        console.log('✏️ Formulário de edição fechado');
    }
}

// 🔥 NOVO: Sistema de arrastar
function initSwipeableEditButton() {
    const btn = document.getElementById('toggleAlbumInfoEdit');
    if (!btn) return;
    
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    const threshold = 80; // pixels para ativar
    
    function handleStart(e) {
        isDragging = true;
        startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        btn.classList.add('swiping');
        btn.style.transition = 'none';
    }
    
    function handleMove(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const diff = startX - currentX;
        
        if (diff > 0 && diff < 150) {
            btn.style.transform = `translateX(-${diff}px)`;
            
            if (diff > threshold) {
                btn.classList.add('revealed');
            } else {
                btn.classList.remove('revealed');
            }
        }
    }
    
    function handleEnd(e) {
        if (!isDragging) return;
        
        isDragging = false;
        btn.classList.remove('swiping');
        btn.style.transition = 'transform 0.3s ease';
        
        const diff = startX - currentX;
        
        if (diff > threshold) {
            toggleAlbumInfoEdit();
        }
        
        btn.style.transform = 'translateX(0)';
        btn.classList.remove('revealed');
        startX = 0;
        currentX = 0;
    }
    
    // Touch events
    btn.addEventListener('touchstart', handleStart, { passive: false });
    btn.addEventListener('touchmove', handleMove, { passive: false });
    btn.addEventListener('touchend', handleEnd);
    
    // Mouse events (desktop)
    btn.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
}

function cancelAlbumInfoEdit() {
    // Restaurar valores originais
    if (window.currentEditAlbum) {
        const albumData = window.currentEditAlbum.data;
        document.getElementById('editAlbumTitle').value = albumData.title || '';
        document.getElementById('editAlbumDate').value = albumData.date || '';
        document.getElementById('editAlbumDescription').value = albumData.description || '';
        document.getElementById('currentCoverPreview').src = albumData.cover || '';
    }
    
    // Fechar form
    document.getElementById('albumInfoEditForm').style.display = 'none';
    document.getElementById('toggleAlbumInfoEdit').innerHTML = '<i class="fas fa-edit"></i><span>Editar Álbum</span>';
    
    // ← ADICIONAR ESTAS 3 LINHAS
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
    
    // Preview imediato
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('currentCoverPreview').src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function saveAlbumInfo() {
    if (!window.currentEditAlbum) return;
    
    const saveBtn = document.getElementById('saveAlbumEdit');
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
        
        // Upload nova capa se houver
        if (newCoverFile) {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Enviando capa...</span>';
            const coverUrl = await uploadImageToCloudinary(newCoverFile, 800);
            updateData.cover = coverUrl;
            newCoverFile = null; // Resetar
        }
        
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Salvando no Firebase...</span>';
        
        // Atualizar no Firebase
        await db.collection('albums').doc(albumId).update(updateData);
        
        // Atualizar cache local
        window.currentEditAlbum.data = {
            ...window.currentEditAlbum.data,
            ...updateData
        };
        
        alert('✅ Informações do álbum atualizadas com sucesso!');
        
        // Fechar form
        cancelAlbumInfoEdit();
        
        // Recarregar galeria principal
        await loadAlbumsFromFirebase();
        await updateEditAlbumSelect();
        
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        alert('❌ Erro ao salvar: ' + error.message);
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// ===== RENDERIZAR FOTOS - COM LONG PRESS (SEGURAR) =====
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
                <img src="${photo.src}" alt="Foto ${index + 1}" loading="lazy">
                <div class="photo-checkmark">
                    <i class="fas fa-check"></i>
                </div>
                <div class="photo-number" style="display: none;">${index + 1}</div>
            </div>
        `;
        
        const checkbox = photoCard.querySelector('input[type="checkbox"]');
        const wrapper = photoCard.querySelector('.photo-wrapper');
        
        let longPressTimer;
        let touchStartTime;
        let touchMoved = false;
        
        // ===== 🔥 BLOQUEAR MENU DE CONTEXTO =====
        wrapper.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        // ===== LONG PRESS (MOBILE) - CORRIGIDO =====
        wrapper.addEventListener('touchstart', (e) => {
            // 🚫 Não processar se estiver em modo reorganizar
            if (isReorganizing) return;
            
            touchMoved = false;
            touchStartTime = Date.now();
            
            longPressTimer = setTimeout(() => {
                if (!touchMoved && !isReorganizing) {
                    // Vibrar (se suportado)
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                    
                    checkbox.checked = !checkbox.checked;
                    photoCard.classList.toggle('selected', checkbox.checked);
                    updateSelectionUI();
                }
            }, 500); // 500ms = meio segundo
        }, { passive: true }); // ← Importante para performance
        
        wrapper.addEventListener('touchmove', () => {
            touchMoved = true;
            clearTimeout(longPressTimer);
        }, { passive: true });
        
        wrapper.addEventListener('touchend', (e) => {
            clearTimeout(longPressTimer);
            
            // 🚫 Não processar se estiver em modo reorganizar
            if (isReorganizing) return;
            
            // Se já está em modo seleção, tap normal seleciona/desseleciona
            if (isInSelectionMode() && !touchMoved) {
                const touchDuration = Date.now() - touchStartTime;
                if (touchDuration < 500) {
                    checkbox.checked = !checkbox.checked;
                    photoCard.classList.toggle('selected', checkbox.checked);
                    updateSelectionUI();
                }
            }
        }, { passive: true });
        
        // ===== CLICK (DESKTOP) =====
        wrapper.addEventListener('mousedown', (e) => {
            e.preventDefault();
            
            // 🚫 Não processar se estiver em modo reorganizar
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
        
        // ===== 🔥 BLOQUEAR ARRASTAR IMAGEM (importante!) =====
        wrapper.addEventListener('dragstart', (e) => {
            if (!isReorganizing) {
                e.preventDefault();
                return false;
            }
        });
        
        grid.appendChild(photoCard);
    });
    
    updateSelectionUI();
}

// ===== VERIFICAR SE ESTÁ EM MODO SELEÇÃO =====
function isInSelectionMode() {
    const checkboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]:checked');
    return checkboxes.length > 0;
}

// ===== ATUALIZAR UI DE SELEÇÃO =====
function updateSelectionUI() {
    const checkboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]');
    const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    const bottomToolbar = document.getElementById('bottomToolbar');
    const selectionCountSpan = document.getElementById('selectionCount');
    
    if (selectedCount > 0) {
        // Adicionar ao histórico quando entrar em modo seleção
        
        // Mostrar barra inferior
        bottomToolbar.style.display = 'flex';
        selectionCountSpan.textContent = `${selectedCount} selecionada${selectedCount !== 1 ? 's' : ''}`;
        
        // Mostrar checkmarks em TODAS as fotos
        document.querySelectorAll('.gallery-photo').forEach(photo => {
            photo.classList.add('selection-mode');
        });
    } else {
        // Esconder barra inferior
        bottomToolbar.style.display = 'none';
        
        // Esconder checkmarks
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
    
    // ← ADICIONAR ESTAS 3 LINHAS
    console.log('☑️ Seleção cancelada');
    
    updateSelectionUI();
}
// ===== HANDLER PARA BOTÃO "VOLTAR" DO ANDROID =====
function setupBackButtonHandler() {
    // Criar um "estado" no histórico para capturar o back
    window.addEventListener('popstate', (e) => {
        if (isInSelectionMode()) {
            e.preventDefault();
            cancelSelection();
            
            // Re-adicionar estado no histórico
            history.pushState({ editMode: true }, '');
        }
    });
    
    // Adicionar estado inicial quando entrar em modo edição
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

// ===== MODO REORGANIZAR =====
let isReorganizing = false;
let draggedElement = null;
let draggedIndex = null;

function enterReorganizeMode() {
    if (isReorganizing) {
        saveNewPhotoOrder();
        return;
    }
    
    isReorganizing = true;
    
    // ← ADICIONAR ESTAS 3 LINHAS
    console.log('📝 Modo reorganizar ativado');
    
    const reorganizeBtn = document.getElementById('reorganizePhotos');
    reorganizeBtn.innerHTML = '<i class="fas fa-save"></i><span>Salvar</span>';
    reorganizeBtn.classList.add('active');
    
    // Esconder outros botões
    document.getElementById('deleteSelectedPhotos').style.display = 'none';
    document.getElementById('cancelSelection').innerHTML = '<i class="fas fa-times"></i><span>Cancelar</span>';
    
    // Desmarcar todas
    cancelSelection();
    
    // Atualizar UI
    const selectionCountSpan = document.getElementById('selectionCount');
    selectionCountSpan.textContent = 'Arraste para reorganizar';
    document.getElementById('bottomToolbar').style.display = 'flex';
    
    // Ativar arrastar
    const photos = document.querySelectorAll('.gallery-photo');
    photos.forEach((photo, index) => {
        photo.classList.add('draggable');
        photo.setAttribute('draggable', 'true');
        
        // Mostrar número
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
        
        // Mobile touch - 🔥 PASSIVE FALSE AQUI
        photo.addEventListener('touchstart', handleTouchStart, { passive: true });
        photo.addEventListener('touchmove', handleTouchMove, { passive: false }); // ← AQUI
        photo.addEventListener('touchend', handleTouchEnd, { passive: true });
    });
    
    console.log('📝 Modo reorganizar ativado');
}
function exitReorganizeMode(save = false) {
    isReorganizing = false;
    
    // ← ADICIONAR ESTAS 3 LINHAS
    console.log('📝 Modo reorganizar desativado');
    
    const reorganizeBtn = document.getElementById('reorganizePhotos');
    
    if (save) {
        // Salvar antes de sair
        saveNewPhotoOrder();
        return; // saveNewPhotoOrder já chama exitReorganizeMode(false)
    }
    
    // 🔥 GARANTIR QUE O BOTÃO ESTÁ HABILITADO E VISÍVEL
    reorganizeBtn.innerHTML = '<i class="fas fa-sort"></i><span>Reorganizar</span>';
    reorganizeBtn.classList.remove('active');
    reorganizeBtn.disabled = false; // ← ADICIONAR ESTA LINHA
    
    // Mostrar outros botões novamente
    const deleteBtn = document.getElementById('deleteSelectedPhotos');
    if (deleteBtn) {
        deleteBtn.style.display = 'flex';
    }
    
    document.getElementById('bottomToolbar').style.display = 'none';
    
    // Desativar arrastar
    const photos = document.querySelectorAll('.gallery-photo');
    photos.forEach(photo => {
        photo.classList.remove('draggable');
        photo.removeAttribute('draggable');
        
        // Esconder número
        const numberEl = photo.querySelector('.photo-number');
        if (numberEl) {
            numberEl.style.display = 'none';
        }
        
        // Remover listeners
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

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    document.querySelectorAll('.gallery-photo').forEach(photo => {
        photo.classList.remove('drag-over');
    });
}

// ===== TOUCH HANDLERS (MOBILE) - SISTEMA ROBUSTO COM LONG-PRESS =====
let touchedElement = null;
let touchStartYPos = 0;
let touchStartXPos = 0;
let isTouchDragging = false;
let touchStartTimestamp = 0;
let longPressTimer = null;
const LONG_PRESS_THRESHOLD = 400; // 400ms para ativar
const MOVE_THRESHOLD = 15; // pixels de movimento permitido antes de cancelar

function handleTouchStart(e) {
    if (!isReorganizing) return;
    
    // Resetar estados
    isTouchDragging = false;
    touchedElement = this;
    draggedIndex = parseInt(this.getAttribute('data-index'));
    
    const touch = e.touches[0];
    touchStartXPos = touch.clientX;
    touchStartYPos = touch.clientY;
    touchStartTimestamp = Date.now();
    
    // Iniciar timer de long-press
    longPressTimer = setTimeout(() => {
        // Verificar se ainda está tocando no mesmo lugar
        if (touchedElement && !isTouchDragging) {
            // Ativar modo drag
            isTouchDragging = true;
            touchedElement.classList.add('dragging');
            
            // Feedback visual e tátil
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
    
    // Se moveu ANTES de ativar o drag, cancelar long-press
    if (!isTouchDragging) {
        if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
            // Cancelar long-press e permitir scroll
            clearTimeout(longPressTimer);
            touchedElement = null;
            return;
        }
        // Ainda esperando long-press, não fazer nada
        return;
    }
    
    // ✅ Agora SIM está arrastando - prevenir scroll
    if (e.cancelable) {
        e.preventDefault();
    }
    
    // Detectar foto abaixo do dedo
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const photoBelow = elementBelow?.closest('.gallery-photo');
    
    // Limpar highlights anteriores
    document.querySelectorAll('.gallery-photo').forEach(p => {
        if (p !== touchedElement) {
            p.classList.remove('drag-over');
        }
    });
    
    // Highlight na foto alvo
    if (photoBelow && photoBelow !== touchedElement) {
        const targetIndex = parseInt(photoBelow.getAttribute('data-index'));
        if (draggedIndex !== targetIndex) {
            photoBelow.classList.add('drag-over');
        }
    }
}

function handleTouchEnd(e) {
    if (!isReorganizing) return;
    
    // Cancelar timer se ainda estiver rodando
    clearTimeout(longPressTimer);
    
    // Se NÃO estava arrastando, apenas limpar
    if (!isTouchDragging) {
        touchedElement = null;
        return;
    }
    
    // ✅ Estava arrastando - processar troca
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
    
    // Limpar estados visuais
    if (touchedElement) {
        touchedElement.classList.remove('dragging');
    }
    
    document.querySelectorAll('.gallery-photo').forEach(p => {
        p.classList.remove('drag-over');
    });
    
    // Resetar variáveis
    touchedElement = null;
    isTouchDragging = false;
}

// ===== TROCAR POSIÇÃO DAS FOTOS (CORRIGIDO) =====
function swapPhotos(fromIndex, toIndex) {
    const photos = window.currentEditAlbum.photos;
    
    // 🔥 Mover item (não apenas trocar)
    const movedPhoto = photos.splice(fromIndex, 1)[0];
    photos.splice(toIndex, 0, movedPhoto);
    
    // Re-renderizar com nova ordem
    renderPhotosForEditInReorganizeMode(photos);
    
    console.log(`🔄 Foto ${fromIndex + 1} movida para posição ${toIndex + 1}`);
}


// ===== RE-RENDERIZAR NO MODO REORGANIZAR =====
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
        
        // Re-adicionar listeners
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

// ===== SALVAR NOVA ORDEM NO FIREBASE (COM AUTO-RELOAD) =====
async function saveNewPhotoOrder() {
    if (!window.currentEditAlbum) return;
    
    const reorganizeBtn = document.getElementById('reorganizePhotos');
    
    try {
        reorganizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Salvando...</span>';
        reorganizeBtn.disabled = true;
        
        const photos = window.currentEditAlbum.photos;
        const albumId = window.currentEditAlbum.id;
        
        // Reorganizar em páginas
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
        console.log(`✅ ${oldPagesSnapshot.size} páginas antigas deletadas`);
        
        // Criar novas páginas com nova ordem
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
        
        // 🔥 RECARREGAR ÁLBUM AUTOMATICAMENTE
        console.log('🔄 Recarregando álbum automaticamente...');
        
        // Sair do modo reorganizar
        exitReorganizeMode(false);
        
        // Recarregar galeria principal
        await loadAlbumsFromFirebase();
        
        // 🎯 RECARREGAR O ÁLBUM ATUAL (SEM TROCAR)
        const select = document.getElementById('editAlbumSelect');
        select.value = albumId; // Manter álbum selecionado
        
        // Simular clique no botão de carregar
        const loadBtn = document.getElementById('loadEditAlbumBtn');
        loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recarregando...';
        
        // Aguardar um pouco antes de recarregar
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Carregar álbum atualizado
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


// ===== SELECIONAR/DESMARCAR TODAS =====
function selectAllPhotos() {
    const checkboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        cb.closest('.gallery-photo').classList.toggle('selected', !allChecked);
    });
    
    updateSelectionCount();
}

// ===== ATUALIZAR CONTADOR DE SELEÇÃO =====
function updateSelectionCount() {
    const checkboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]');
    const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    const totalCount = checkboxes.length;
    
    const deleteBtn = document.getElementById('deleteSelectedPhotos');
    const selectAllBtn = document.getElementById('selectAllPhotos');
    const deleteCountSpan = document.getElementById('deleteCount');
    
    // Atualizar botão de deletar
    if (selectedCount > 0) {
        deleteBtn.style.display = 'flex';
        deleteCountSpan.textContent = `Deletar (${selectedCount})`;
    } else {
        deleteBtn.style.display = 'none';
    }
    
    // Atualizar botão de selecionar
    const allChecked = selectedCount === totalCount && totalCount > 0;
    
    if (allChecked) {
        selectAllBtn.innerHTML = '<i class="fas fa-times"></i><span>Desmarcar</span>';
    } else if (selectedCount > 0) {
        selectAllBtn.innerHTML = `<i class="fas fa-check-square"></i><span>Selecionar (${selectedCount}/${totalCount})</span>`;
    } else {
        selectAllBtn.innerHTML = '<i class="fas fa-check-square"></i><span>Selecionar</span>';
    }
}

// ===== DELETAR FOTOS SELECIONADAS =====
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
    
    // 🔥 SALVAR REFERÊNCIAS ANTES
    const currentAlbumId = window.currentEditAlbum.id;
    const btn = document.getElementById('deleteSelectedPhotos');
    const toolbar = document.getElementById('bottomToolbar');
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deletando...';
        btn.disabled = true;
        
        // Coletar índices das fotos selecionadas
        const selectedIndices = Array.from(checkboxes).map(cb => {
            return parseInt(cb.closest('.gallery-photo').getAttribute('data-index'));
        }).sort((a, b) => b - a);
        
        console.log(`🗑️ Deletando ${selectedIndices.length} fotos...`);
        
        // Filtrar fotos que NÃO serão deletadas
        const remainingPhotos = window.currentEditAlbum.photos.filter((photo, index) => {
            return !selectedIndices.includes(index);
        });
        
        console.log(`📊 Fotos restantes: ${remainingPhotos.length}`);
        
        // Reorganizar em páginas de 200 fotos
        const PHOTOS_PER_PAGE = 200;
        const newPages = [];
        
        for (let i = 0; i < remainingPhotos.length; i += PHOTOS_PER_PAGE) {
            newPages.push(remainingPhotos.slice(i, i + PHOTOS_PER_PAGE));
        }
        
        // Deletar todas as páginas antigas
        const oldPagesSnapshot = await db.collection('album_photos')
            .where('albumId', '==', currentAlbumId)
            .get();
        
        const deletePromises = [];
        oldPagesSnapshot.forEach(doc => {
            deletePromises.push(db.collection('album_photos').doc(doc.id).delete());
        });
        
        await Promise.all(deletePromises);
        console.log(`✅ ${oldPagesSnapshot.size} páginas antigas deletadas`);
        
        // Criar novas páginas (se ainda houver fotos)
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
        
        // Atualizar contador de fotos no álbum
        await db.collection('albums').doc(currentAlbumId).update({
            photoCount: remainingPhotos.length
        });
        
        alert(`✅ ${selectedIndices.length} foto(s) deletada(s) com sucesso!\n\n⚠️ As imagens continuam no ImgBB.`);
        
        // 🔥 RESETAR BOTÃO E ESCONDER TOOLBAR IMEDIATAMENTE
        btn.innerHTML = '<i class="fas fa-trash"></i> Deletar';
        btn.disabled = false;
        toolbar.style.display = 'none';
        
        // 🔥 LIMPAR TODAS AS SELEÇÕES
        const allCheckboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]');
        allCheckboxes.forEach(cb => {
            cb.checked = false;
            const photoCard = cb.closest('.gallery-photo');
            if (photoCard) {
                photoCard.classList.remove('selected', 'selection-mode');
            }
        });
        
        // 🔥 MANTER ÁLBUM SELECIONADO
        const select = document.getElementById('editAlbumSelect');
        select.value = currentAlbumId;
        
        // Recarregar álbum
        await loadAlbumForEdit();
        
        // Atualizar galeria principal
        await loadAlbumsFromFirebase();
        await updateEditAlbumSelect();
        
        // 🔥 GARANTIR QUE O ÁLBUM PERMANECE SELECIONADO
        setTimeout(() => {
            select.value = currentAlbumId;
        }, 100);
        
        console.log('✅ Exclusão concluída, toolbar escondida e álbum mantido');
        
    } catch (error) {
        console.error('❌ Erro ao deletar fotos:', error);
        alert('❌ Erro ao deletar fotos: ' + error.message);
        
        // 🔥 RESETAR INTERFACE MESMO EM CASO DE ERRO
        btn.innerHTML = '<i class="fas fa-trash"></i> Deletar';
        btn.disabled = false;
        toolbar.style.display = 'none';
    }
}

// ===== CSS GALERIA NATIVA COM BARRA INFERIOR =====
function injectEditStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* ===== GRID GALERIA - 3 COLUNAS ===== */
        .edit-photos-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 80px; /* ← Espaço para a toolbar */
        }
        
        /* ===== CARD DE FOTO ===== */
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
        
        /* Checkbox escondido */
        .photo-checkbox {
            position: absolute;
            opacity: 0;
            pointer-events: none;
        }
        
        /* Checkmark (SÓ APARECE EM MODO SELEÇÃO) */
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
        
        /* Mostrar checkmark quando está em modo seleção */
        .gallery-photo.selection-mode .photo-checkmark {
            opacity: 1;
        }
        
        /* Checkmark ativo */
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
        
        /* ===== MODO REORGANIZAR ===== */
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
        
        /* Número da foto (modo reorganizar) */
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
        
        /* ===== BARRA INFERIOR FIXA (ESTILO GALERIA NATIVA) ===== */
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
            z-index: 999999 !important; /* ← Z-INDEX MÁXIMO */
            box-shadow: 0 -2px 15px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease-out;
            pointer-events: auto !important; /* ← Garantir que é clicável */
        }
        
        /* 🔥 IMPORTANTE: Garantir que toolbar fica visível */
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
        
        /* Botões da barra inferior */
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
        
        /* ===== RESPONSIVO ===== */
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
            /* ===== EDIÇÃO DE INFORMAÇÕES DO ÁLBUM - MINIMALISTA ===== */
        
        .minimal-edit-btn {
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
        
        .minimal-edit-btn:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: var(--theme-primary);
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
            /* ===== BOTÃO ARRASTÁVEL DE EDITAR ÁLBUM ===== */
.swipe-edit-container {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--theme-card-border);
}

.swipe-edit-wrapper {
    position: relative;
    width: 100%;
    overflow: visible;
}

.swipeable-edit-btn {
    width: 100%;
    padding: 0;
    background: transparent;
    border: none;
    cursor: grab;
    display: flex;
    align-items: center;
    position: relative;
    transition: transform 0.3s ease;
    touch-action: pan-y;
}

.swipeable-edit-btn:active {
    cursor: grabbing;
}

.swipe-content {
    width: 100%;
    padding: 12px 20px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    color: var(--theme-text);
    font-family: 'Poppins', sans-serif;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.2s ease;
    position: relative;
    z-index: 2;
}

.swipe-indicator {
    position: absolute;
    right: 15px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--theme-text-secondary);
    font-size: 0.8rem;
    opacity: 0.6;
    pointer-events: none;
    z-index: 1;
}

.swipe-indicator i {
    animation: swipeHint 1.5s ease-in-out infinite;
}

@keyframes swipeHint {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(-5px); }
}

.swipeable-edit-btn.swiping .swipe-indicator {
    opacity: 0;
}

.swipeable-edit-btn.revealed .swipe-content {
    background: var(--theme-primary);
}

.swipeable-edit-btn.revealed .edit-text {
    display: inline;
}

@media (max-width: 768px) {
    .swipe-content {
        padding: 10px 15px;
        font-size: 0.9rem;
    }
    
    .swipe-indicator {
        font-size: 0.75rem;
        right: 10px;
    }
}
    `;
    document.head.appendChild(style);
}

// ===== INICIALIZAR SISTEMA DE EDIÇÃO =====
function initEditSystem() {
    // Aguardar admin modal estar pronto
    const checkInterval = setInterval(() => {
        if (document.getElementById('adminModal')) {
            clearInterval(checkInterval);
            
            addEditTabToAdmin();
            injectEditStyles();
            
            console.log('✅ Sistema de edição de álbuns inicializado');
        }
    }, 500);
}

// ===== SISTEMA DE GERENCIAMENTO DE PLAYLISTS VIA ADMIN =====
console.log('🎵 Sistema de gerenciamento de playlists carregado');

// ===== ADICIONAR ABA DE PLAYLISTS NO ADMIN =====
function addPlaylistTabToAdmin() {
    const tabsContainer = document.querySelector('.admin-tabs');
    const contentArea = tabsContainer.parentElement;
    
    // Verificar se já existe
    if (document.querySelector('[data-tab="playlists"]')) return;
    
    // Adicionar botão da aba
    const playlistTab = document.createElement('button');
    playlistTab.className = 'admin-tab';
    playlistTab.setAttribute('data-tab', 'playlists');
    playlistTab.innerHTML = '<i class="fas fa-music"></i> Playlists';
    tabsContainer.appendChild(playlistTab);
    
    // Adicionar conteúdo da aba
    const playlistContent = document.createElement('div');
    playlistContent.className = 'admin-content';
    playlistContent.id = 'playlists-tab';
    playlistContent.innerHTML = `
        <!-- Criar Nova Playlist - DESIGN MODERNO -->
        <div class="playlist-create-card">
            <div class="card-icon-header">
                <div class="icon-circle">
                    <i class="fas fa-plus"></i>
                </div>
                <h3>Criar Nova Playlist</h3>
            </div>
            
            <form id="createPlaylistForm" class="modern-form">
                <div class="input-group">
                    <label>
                        <i class="fas fa-music"></i>
                        Nome da Playlist
                    </label>
                    <input type="text" id="playlistName" placeholder="Ex: Românticas, Rock, Sertanejo..." required>
                </div>
                
                <div class="input-group">
                    <label>
                        <i class="fas fa-icons"></i>
                        Escolha um Ícone
                    </label>
                    <div class="icon-selector">
                        <input type="radio" name="playlistIcon" id="icon-heart" value="fa-heart" checked>
                        <label for="icon-heart" class="icon-option">
                            <i class="fas fa-heart"></i>
                        </label>
                        
                        <input type="radio" name="playlistIcon" id="icon-music" value="fa-music">
                        <label for="icon-music" class="icon-option">
                            <i class="fas fa-music"></i>
                        </label>
                        
                        <input type="radio" name="playlistIcon" id="icon-guitar" value="fa-guitar">
                        <label for="icon-guitar" class="icon-option">
                            <i class="fas fa-guitar"></i>
                        </label>
                        
                        <input type="radio" name="playlistIcon" id="icon-fire" value="fa-fire">
                        <label for="icon-fire" class="icon-option">
                            <i class="fas fa-fire"></i>
                        </label>
                        
                        <input type="radio" name="playlistIcon" id="icon-star" value="fa-star">
                        <label for="icon-star" class="icon-option">
                            <i class="fas fa-star"></i>
                        </label>
                        
                        <input type="radio" name="playlistIcon" id="icon-headphones" value="fa-headphones">
                        <label for="icon-headphones" class="icon-option">
                            <i class="fas fa-headphones"></i>
                        </label>
                    </div>
                </div>
                
                <button type="submit" class="submit-btn">
                    <i class="fas fa-check-circle"></i>
                    Criar Playlist
                </button>
            </form>
        </div>
        
        <!-- Adicionar Músicas - DESIGN MODERNO -->
        <div class="playlist-add-music-card" id="addMusicSection" style="display: none;">
            <div class="card-icon-header">
                <div class="icon-circle green">
                    <i class="fas fa-compact-disc"></i>
                </div>
                <h3>Adicionar Música</h3>
            </div>
            
            <div class="input-group">
                <label>
                    <i class="fas fa-list-music"></i>
                    Selecione a Playlist
                </label>
                <select id="selectPlaylistForMusic" class="modern-select">
                    <option value="">Escolha uma playlist...</option>
                </select>
            </div>
            
            <form id="addMusicForm" class="modern-form" style="display: none; margin-top: 20px;">
                <div class="form-row">
                    <div class="input-group">
                        <label>
                            <i class="fas fa-font"></i>
                            Título da Música
                        </label>
                        <input type="text" id="musicTitle" placeholder="Nome da música" required>
                    </div>
                    
                    <div class="input-group">
                        <label>
                            <i class="fas fa-user-music"></i>
                            Artista
                        </label>
                        <input type="text" id="musicArtist" placeholder="Nome do artista" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>📁 Arquivo de Áudio</label>
                    <input type="file" id="musicAudioFile" accept="audio/*" required>
                    <small style="color: var(--theme-text-secondary); display: block; margin-top: 5px;">
                        MP3, M4A, WAV, OGG, FLAC (máximo 100MB)
                    </small>
                </div>

                <!-- Preview da capa (ORIGINAL) -->
                <div id="coverPreviewContainer" class="cover-preview-container" style="display: none; margin-top: 10px;">
                    <div style="display: grid; grid-template-columns: 80px 1fr; gap: 12px; padding: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--theme-card-border); border-radius: 8px; align-items: center;">
                        <img id="coverPreviewImage" 
                            style="width: 80px; height: 80px; border-radius: 6px; object-fit: cover; box-shadow: 0 2px 8px rgba(0,0,0,0.4);" 
                            alt="Capa da música">
                        <div style="min-width: 0;">
                            <div style="font-size: 0.75rem; font-weight: 600; color: var(--theme-primary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                                📀 Preview da Capa
                            </div>
                            <div id="coverPreviewInfo" style="font-size: 0.8rem; color: var(--theme-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;">
                                Processando...
                            </div>
                        </div>
                    </div>
                </div>
                <button type="submit" class="submit-btn green">
                    <i class="fas fa-plus-circle"></i>
                    Adicionar à Playlist
                </button>
            </form>
        </div>
        
        <!-- Playlists Existentes - DESIGN TIPO SPOTIFY -->
        <div class="playlists-library">
            <div class="library-header">
                <div class="header-icon">
                    <i class="fas fa-layer-group"></i>
                </div>
                <h3>Suas Playlists</h3>
            </div>
            
            <div id="existingPlaylists" class="playlists-grid">
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Carregando playlists...</p>
                </div>
            </div>
        </div>
    `;
    
    contentArea.appendChild(playlistContent);
    
    // Re-inicializar listeners de todas as tabs
    setupTabListeners();
    
    // Event listeners
    document.getElementById('createPlaylistForm').addEventListener('submit', createNewPlaylist);
    document.getElementById('selectPlaylistForMusic').addEventListener('change', showMusicForm);
    document.getElementById('addMusicForm').addEventListener('submit', addMusicToPlaylist);
    
    // Preview do arquivo de áudio
// ===== MELHORIAS NO FORMULÁRIO DE ADICIONAR MÚSICA (ORIGINAL) =====
setTimeout(() => {
    const audioInput = document.getElementById('musicAudioFile');
    
    if (!audioInput) return;
    
    // Listener para quando selecionar arquivo
    audioInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        const previewContainer = document.getElementById('coverPreviewContainer');
        
        if (!file) {
            if (previewContainer) previewContainer.style.display = 'none';
            return;
        }
        
        // Verificar se é MP3
        if (!file.type.includes('audio') && !file.name.match(/\.(mp3|m4a)$/i)) {
            if (previewContainer) previewContainer.style.display = 'none';
            return;
        }
        
        // Mostrar preview
        if (previewContainer) {
            previewContainer.style.display = 'block';
            document.getElementById('coverPreviewInfo').textContent = '🔍 Extraindo capa...';
        }
        
        try {
            // Extrair capa e metadata
            const extracted = await extractMP3Cover(file);
            
            if (extracted) {
                // Mostrar preview
                document.getElementById('coverPreviewImage').src = extracted.coverUrl;
                document.getElementById('coverPreviewInfo').innerHTML = `
                    <strong>${extracted.title}</strong><br>
                    ${extracted.artist}${extracted.album ? ` • ${extracted.album}` : ''}
                `;
                
                // Preencher campos automaticamente
                const titleInput = document.getElementById('musicTitle');
                const artistInput = document.getElementById('musicArtist');
                
                if (titleInput && !titleInput.value && extracted.title) {
                    titleInput.value = extracted.title;
                    titleInput.style.background = 'rgba(100, 255, 100, 0.1)';
                    setTimeout(() => {
                        titleInput.style.background = '';
                    }, 2000);
                }
                
                if (artistInput && !artistInput.value && extracted.artist) {
                    artistInput.value = extracted.artist;
                    artistInput.style.background = 'rgba(100, 255, 100, 0.1)';
                    setTimeout(() => {
                        artistInput.style.background = '';
                    }, 2000);
                }
                
                console.log('✅ Preview da capa carregado!');
            } else {
                document.getElementById('coverPreviewImage').src = 'images/capas-albuns/default-music.jpg';
                document.getElementById('coverPreviewInfo').innerHTML = '⚠️ MP3 sem capa embutida<br>Será usada capa padrão';
            }
            
        } catch (error) {
            console.error('❌ Erro ao extrair preview:', error);
            if (document.getElementById('coverPreviewInfo')) {
                document.getElementById('coverPreviewInfo').textContent = '❌ Erro ao extrair capa';
            }
        }
    });
}, 1000);
    
    console.log('✅ Aba de playlists criada com design moderno');
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
        
        // Salvar no Firebase (sem capa customizada)
        await db.collection('custom_playlists').add({
            name: name,
            icon: icon,
            cover: 'images/capas-albuns/default-playlist.jpg', // ← Sempre usa capa padrão
            trackCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
alert(`✅ Playlist "${name}" criada com sucesso!`);

// Resetar form
document.getElementById('createPlaylistForm').reset();
btn.innerHTML = originalText;
btn.disabled = false;

// Atualizar lista
await loadExistingPlaylists();
await updatePlaylistSelects();

// 🎯 SALVAR ÍNDICE ANTES DE RECARREGAR
const currentPlaylistIndex = window.PlaylistManager?.state?.currentPlaylistIndex || 0;

// 🔥 Recarregar playlists no player automaticamente
if (typeof PlaylistManager !== 'undefined' && PlaylistManager.reload) {
    await PlaylistManager.reload();
}

// Mostrar seção de adicionar música
document.getElementById('addMusicSection').style.display = 'block';

// Mostrar seção de adicionar música
document.getElementById('addMusicSection').style.display = 'block';        
    } catch (error) {
        console.error('❌ Erro ao criar playlist:', error);
        alert('❌ Erro: ' + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ===== MOSTRAR FORMULÁRIO DE MÚSICA =====
function showMusicForm() {
    const select = document.getElementById('selectPlaylistForMusic');
    const form = document.getElementById('addMusicForm');
    
    if (select.value) {
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

// ===== CARREGAR PLAYLISTS EXISTENTES - DESIGN MODERNO =====
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

// ===== ATUALIZAR SELECTS DE PLAYLIST =====
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
        
        // Mostrar seção se houver playlists
        if (!snapshot.empty) {
            document.getElementById('addMusicSection').style.display = 'block';
        }
        
    } catch (error) {
        console.error('❌ Erro ao atualizar selects:', error);
    }
}

// ===== DELETAR PLAYLIST =====
window.deletePlaylist = async function(playlistId, playlistName) {
    if (!confirm(`❌ Tem certeza que deseja deletar a playlist "${playlistName}"?\n\nIsso removerá TODAS as músicas desta playlist.`)) {
        return;
    }
    
    try {
        // Deletar documento principal
        await db.collection('custom_playlists').doc(playlistId).delete();
        
        // Deletar todas as páginas de músicas
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

// ===== EDITAR PLAYLIST (IMPLEMENTAR DEPOIS) =====
window.editPlaylist = function(playlistId) {
    alert('🚧 Função de edição em desenvolvimento...');
};

// ===== RECARREGAR TODAS AS PLAYLISTS NO PLAYER =====
async function reloadAllPlaylists() {
    if (typeof window.PlaylistManager !== 'undefined' && window.PlaylistManager.reload) {
        await window.PlaylistManager.reload();
    }
}

// ===== ESTILOS CSS =====
function injectPlaylistAdminStyles() {
    const style = document.createElement('style');
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

// ===== INICIALIZAR =====
function initPlaylistAdminSystem() {
    const checkInterval = setInterval(() => {
        if (document.getElementById('adminModal')) {
            clearInterval(checkInterval);
            
            addPlaylistTabToAdmin();
            injectPlaylistAdminStyles();
            
            // Carregar playlists existentes quando a aba for aberta
            setTimeout(() => {
                loadExistingPlaylists();
                updatePlaylistSelects();
            }, 1000);
            
            console.log('✅ Sistema de gerenciamento de playlists inicializado');
        }
    }, 500);
}

// Inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlaylistAdminSystem);
} else {
    initPlaylistAdminSystem();
}

console.log('✅ Módulo de gerenciamento de playlists carregado!');

// Inicializar quando o DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditSystem);
} else {
    initEditSystem();
}

console.log('✏️ Módulo de edição de álbuns carregado!');


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
        
        // ===== VALIDAÇÃO DO ARQUIVO =====
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
        
// ===== 🎨 EXTRAIR CAPA E METADATA =====
btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Extraindo capa do MP3...';

let coverUrl = 'images/capas-albuns/default-music.jpg';
let metadata = {
    title: title || audioFile.name.replace(/\.[^/.]+$/, ""),
    artist: artist || 'Artista desconhecido',
    album: ''
};

// ✅ FORÇA EXTRAÇÃO PARA QUALQUER ÁUDIO
console.log('🎵 Tentando extrair capa do arquivo de áudio...');

if (typeof extractAndUploadMP3Cover === 'function') {
    try {
        const extracted = await extractAndUploadMP3Cover(audioFile);
        
        // ✅ VERIFICAR SE REALMENTE EXTRAIU UMA CAPA VÁLIDA
        if (extracted && extracted.coverUrl && !extracted.coverUrl.includes('default-music.jpg')) {
            coverUrl = extracted.coverUrl;
            console.log('✅ CAPA EXTRAÍDA E SALVA:', coverUrl);
        } else {
            console.warn('⚠️ Nenhuma capa embutida encontrada - usando padrão');
        }
        
        // Atualizar metadata se os campos estiverem vazios
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

// ✅ LOG FINAL PARA DEBUG
console.log('📋 RESUMO DA EXTRAÇÃO:');
console.log('   🖼️ Capa final:', coverUrl);
console.log('   🎵 Título:', metadata.title);
console.log('   🎤 Artista:', metadata.artist);
        
        // Aguardar um pouco antes de fazer upload do áudio
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ===== UPLOAD DO ÁUDIO =====
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
        
        // ===== BUSCAR MÚSICAS ATUAIS DA PLAYLIST =====
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
        
// ===== ADICIONAR NOVA MÚSICA COM CAPA =====
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
        
        // ✅ LOGS DE DEBUG
        console.log('🎵 MÚSICA QUE SERÁ SALVA NO FIREBASE:');
        console.log('   📝 Título:', newTrack.title);
        console.log('   🎤 Artista:', newTrack.artist);
        console.log('   🖼️ Capa:', newTrack.cover);
        console.log('   🔊 Áudio:', newTrack.src);
        
        // ✅ VERIFICAÇÃO DE SEGURANÇA
        if (newTrack.cover.includes('default-music.jpg')) {
            console.warn('⚠️ ATENÇÃO: Capa padrão será salva (capa não foi extraída)');
        } else {
            console.log('✅ Capa personalizada será salva!');
        }
        
        currentTracks.push(newTrack);
        
        // ===== REORGANIZAR EM PÁGINAS =====
        const TRACKS_PER_PAGE = 200;
        const pages = [];
        
        for (let i = 0; i < currentTracks.length; i += TRACKS_PER_PAGE) {
            pages.push(currentTracks.slice(i, i + TRACKS_PER_PAGE));
        }
        
        // ===== DELETAR PÁGINAS ANTIGAS =====
        const deletePromises = [];
        musicSnapshot.forEach(doc => {
            deletePromises.push(db.collection('playlist_tracks').doc(doc.id).delete());
        });
        await Promise.all(deletePromises);
        
        // ===== CRIAR NOVAS PÁGINAS =====
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
            await db.collection('playlist_tracks').add({
                playlistId: playlistId,
                pageNumber: pageIndex,
                tracks: pages[pageIndex],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // ===== ATUALIZAR CONTADOR =====
        await db.collection('custom_playlists').doc(playlistId).update({
            trackCount: currentTracks.length
        });
        
        alert(`✅ Música "${metadata.title}" adicionada com ${coverUrl.includes('default') ? 'capa padrão' : 'capa extraída do MP3'}!`);
        
        // ===== RESETAR FORMULÁRIO =====
        document.getElementById('addMusicForm').reset();
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        // ===== ATUALIZAR LISTAS =====
        await loadExistingPlaylists();
        
// 🎯 SALVAR ÍNDICE ANTES DE RECARREGAR
const currentPlaylistIndex = window.PlaylistManager?.state?.currentPlaylistIndex || 0;
console.log(`💾 Playlist atual antes do reload: ${currentPlaylistIndex}`);

// Recarregar player se existir
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

console.log('✅ admin.js com Firebase + ImgBB VERDADEIRAMENTE ILIMITADO carregado!');

console.log('🧪 Para testar, digite no console: testBackendConnection()');

// ===== MELHORIAS NO FORMULÁRIO DE ADICIONAR MÚSICA =====
// Adicione este código no seu admin.js, logo após criar o formulário

function enhanceMusicForm() {
    const audioInput = document.getElementById('musicAudioFile');
    
    if (!audioInput) return;
    
    // Criar área de preview da capa
    const formGroup = audioInput.closest('.form-group');
    
    const previewContainer = document.createElement('div');
    previewContainer.id = 'coverPreviewContainer';
    previewContainer.className = 'cover-preview-container';
    previewContainer.style.cssText = `
        display: none;
        margin-top: 10px;
    `;
        
previewContainer.innerHTML = `
    <div style="display: grid; grid-template-columns: 80px 1fr; gap: 12px; padding: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--theme-card-border); border-radius: 8px; align-items: center; margin: 0;">
        <img id="coverPreviewImage" 
             style="width: 80px; height: 80px; border-radius: 6px; object-fit: cover; box-shadow: 0 2px 8px rgba(0,0,0,0.4);" 
             alt="Capa da música">
        <div style="min-width: 0;">
            <div style="font-size: 0.75rem; font-weight: 600; color: var(--theme-primary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                📀 Preview da Capa
            </div>
            <div id="coverPreviewInfo" style="font-size: 0.8rem; color: var(--theme-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;">
                Processando...
            </div>
        </div>
    </div>
`;
    
formGroup.appendChild(previewContainer);

// 🔥 AJUSTAR ESPAÇAMENTO DO BOTÃO
const submitBtn = document.querySelector('#addMusicForm button[type="submit"]');
if (submitBtn) {
    submitBtn.style.marginTop = '15px';
}

// 🔥 AJUSTAR ESPAÇAMENTO ENTRE FORM E PREVIEW
const audioFileInput = document.getElementById('musicAudioFile');
if (audioFileInput) {
    audioFileInput.closest('.form-group').style.marginBottom = '0';
}

// Listener para quando selecionar arquivo
audioInput.addEventListener('change', async function(e) {
         const file = e.target.files[0];
        
        if (!file) {
             previewContainer.classList.remove('show');
            return;
        }
        
        // Verificar se é MP3
        if (!file.type.includes('audio') && !file.name.match(/\.(mp3|m4a)$/i)) {
            previewContainer.style.display = 'none';
            return;
        }
        
        // Mostrar preview
        previewContainer.classList.add('show'); // ← NOVA LINHA
        document.getElementById('coverPreviewInfo').textContent = '🔍 Extraindo capa...';
        
        try {
            // Extrair capa e metadata
            const extracted = await extractMP3Cover(file);
            
            if (extracted) {
                // Mostrar preview
                document.getElementById('coverPreviewImage').src = extracted.coverUrl;
                document.getElementById('coverPreviewInfo').innerHTML = `
                    <strong>${extracted.title}</strong><br>
                    ${extracted.artist}${extracted.album ? ` • ${extracted.album}` : ''}
                `;
                
                // Preencher campos automaticamente
                const titleInput = document.getElementById('musicTitle');
                const artistInput = document.getElementById('musicArtist');
                
                if (titleInput && !titleInput.value && extracted.title) {
                    titleInput.value = extracted.title;
                    titleInput.style.background = 'rgba(100, 255, 100, 0.1)';
                    setTimeout(() => {
                        titleInput.style.background = '';
                    }, 2000);
                }
                
                if (artistInput && !artistInput.value && extracted.artist) {
                    artistInput.value = extracted.artist;
                    artistInput.style.background = 'rgba(100, 255, 100, 0.1)';
                    setTimeout(() => {
                        artistInput.style.background = '';
                    }, 2000);
                }
                
                console.log('✅ Preview da capa carregado!');
            } else {
                document.getElementById('coverPreviewImage').src = 'images/capas-albuns/default-music.jpg';
                document.getElementById('coverPreviewInfo').innerHTML = '⚠️ MP3 sem capa embutida<br>Será usada capa padrão';
            }
            
        } catch (error) {
            console.error('❌ Erro ao extrair preview:', error);
            document.getElementById('coverPreviewInfo').textContent = '❌ Erro ao extrair capa';
        }
    });
}
// Inicializar quando o admin carregar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        enhanceMusicForm();
        console.log('✅ Formulário aprimorado com preview de capa!');
    }, 2000);
});
