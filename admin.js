// ===== SISTEMA DE ADMIN COM FIREBASE + IMGBB (VERDADEIRAMENTE ILIMITADO) =====

console.log('🔐 Sistema de Admin ILIMITADO carregado');

let isAdminUnlocked = false;

// ===== AGUARDAR FIREBASE E IMGBB ESTAREM PRONTOS =====
function waitForServices() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (typeof firebase !== 'undefined' && 
                firebase.apps.length > 0 && 
                typeof IMGBB_API_KEY !== 'undefined') {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });
}

// ===== SISTEMA DE TABS GLOBAL (SUPORTA TABS DINÂMICAS) =====
function setupTabListeners() {
    const allTabs = document.querySelectorAll('.admin-tab');
    
    allTabs.forEach(tab => {
        // Remover listeners antigos (prevenir duplicação)
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
    });
    
    // Adicionar novos listeners
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Remover active de todas as tabs
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
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
                    updateEditAlbumSelect();
                }
            }
        });
    });
    
    console.log(`✅ ${document.querySelectorAll('.admin-tab').length} tabs configuradas`);
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
    });
    
    adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            closeAdminBtn.click();
        }
    });
    
    // Configurar sistema de tabs
    setupTabListeners();
    
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
            const coverUrl = await uploadToImgBB(coverFile, 800);
            
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
                const url = await uploadToImgBB(photoFiles[i], 1600);
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
            const photoUrl = await uploadToImgBB(photoFile, 1200);
            
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

// ===== ADICIONAR ABA DE EDIÇÃO - DESIGN GALERIA REAL =====
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
        
        <!-- Área de edição -->
        <div id="editAlbumSection" style="display: none;">
            <!-- Barra de ações fixa -->
            <div class="edit-toolbar">
                <div class="edit-toolbar-left">
                    <h3 id="editAlbumTitle"><i class="fas fa-images"></i> Álbum</h3>
                    <span class="edit-count" id="editPhotoCount">0 fotos</span>
                </div>
                <div class="edit-toolbar-right">
                    <button id="selectAllPhotos" class="toolbar-btn">
                        <i class="fas fa-check-square"></i>
                        <span>Selecionar</span>
                    </button>
                    <button id="deleteSelectedPhotos" class="toolbar-btn delete-btn" style="display: none;">
                        <i class="fas fa-trash"></i>
                        <span id="deleteCount">Deletar</span>
                    </button>
                </div>
            </div>
            
            <!-- Grid de fotos (estilo galeria real) -->
            <div id="editPhotosGrid" class="edit-photos-grid"></div>
        </div>
    `;
    
    contentArea.appendChild(editContent);
    
    // Re-inicializar listeners de todas as tabs
    setupTabListeners();
    
    // Event listeners
    document.getElementById('loadEditAlbumBtn').addEventListener('click', loadAlbumForEdit);
    document.getElementById('selectAllPhotos').addEventListener('click', selectAllPhotos);
    document.getElementById('deleteSelectedPhotos').addEventListener('click', deleteSelectedPhotos);
    
    console.log('✅ Aba de edição com design galeria real criada');
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
        
        document.getElementById('editAlbumSection').style.display = 'block';
        
        console.log(`✅ ${allPhotos.length} fotos carregadas para edição`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar álbum:', error);
        alert('❌ Erro ao carregar álbum: ' + error.message);
        
        const btn = document.getElementById('loadEditAlbumBtn');
        btn.innerHTML = '<i class="fas fa-folder-open"></i> Carregar Álbum';
        btn.disabled = false;
    }
}

// ===== RENDERIZAR FOTOS - ESTILO GALERIA REAL 3 COLUNAS =====
function renderPhotosForEdit(photos, albumTitle) {
    const grid = document.getElementById('editPhotosGrid');
    const countElement = document.getElementById('editPhotoCount');
    const titleElement = document.getElementById('editAlbumTitle');
    
    if (titleElement) {
        titleElement.innerHTML = `<i class="fas fa-images"></i> ${albumTitle}`;
    }
    
    if (countElement) {
        countElement.textContent = `${photos.length} foto${photos.length !== 1 ? 's' : ''}`;
    }
    
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
            <input type="checkbox" class="photo-checkbox" id="photo-${index}">
            <label for="photo-${index}" class="photo-label">
                <img src="${photo.src}" alt="Foto ${index + 1}" loading="lazy">
                <div class="photo-checkmark">
                    <i class="fas fa-check"></i>
                </div>
            </label>
        `;
        
        // Checkbox change
        const checkbox = photoCard.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            photoCard.classList.toggle('selected', checkbox.checked);
            updateSelectionCount();
        });
        
        grid.appendChild(photoCard);
    });
    
    updateSelectionCount();
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
    
    try {
        const btn = document.getElementById('deleteSelectedPhotos');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deletando...';
        btn.disabled = true;
        
        // Coletar índices das fotos selecionadas
        const selectedIndices = Array.from(checkboxes).map(cb => {
            return parseInt(cb.closest('.edit-photo-card').getAttribute('data-index'));
        }).sort((a, b) => b - a); // Ordem decrescente para deletar de trás pra frente
        
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
            .where('albumId', '==', window.currentEditAlbum.id)
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
                    albumId: window.currentEditAlbum.id,
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
        await db.collection('albums').doc(window.currentEditAlbum.id).update({
            photoCount: remainingPhotos.length
        });
        
        alert(`✅ ${selectedIndices.length} foto(s) deletada(s) com sucesso!\n\n⚠️ As imagens continuam no ImgBB.`);
        
        // Recarregar álbum
        await loadAlbumForEdit();
        
        // Atualizar galeria principal
        await loadAlbumsFromFirebase();
        
        btn.innerHTML = '<i class="fas fa-trash"></i> Deletar Selecionadas';
        btn.disabled = false;
        
    } catch (error) {
        console.error('❌ Erro ao deletar fotos:', error);
        alert('❌ Erro ao deletar fotos: ' + error.message);
        
        const btn = document.getElementById('deleteSelectedPhotos');
        btn.innerHTML = '<i class="fas fa-trash"></i> Deletar Selecionadas';
        btn.disabled = false;
    }
}

// ===== CSS GALERIA REAL - 3 COLUNAS MINIMALISTA =====
function injectEditStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* ===== TOOLBAR FIXA NO TOPO ===== */
        .edit-toolbar {
            position: sticky;
            top: 0;
            z-index: 100;
            background: var(--theme-card-bg);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--theme-card-border);
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 15px;
            margin: 0 -25px 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        
        .edit-toolbar-left {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        
        .edit-toolbar-left h3 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 500;
            color: var(--theme-text);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .edit-count {
            font-size: 0.85rem;
            color: var(--theme-text-secondary);
            font-family: 'Poppins', sans-serif;
        }
        
        .edit-toolbar-right {
            display: flex;
            gap: 10px;
        }
        
        /* ===== BOTÕES DA TOOLBAR ===== */
        .toolbar-btn {
            padding: 10px 16px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid var(--theme-card-border);
            border-radius: 8px;
            color: var(--theme-text);
            font-family: 'Poppins', sans-serif;
            font-size: 0.9rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        
        .toolbar-btn:hover {
            background: rgba(255, 255, 255, 0.12);
            transform: translateY(-1px);
        }
        
        .toolbar-btn:active {
            transform: translateY(0);
        }
        
        .toolbar-btn.delete-btn {
            background: rgba(255, 70, 70, 0.15);
            border-color: rgba(255, 70, 70, 0.3);
            color: #ff6b6b;
        }
        
        .toolbar-btn.delete-btn:hover {
            background: rgba(255, 70, 70, 0.25);
            border-color: rgba(255, 70, 70, 0.5);
        }
        
        /* ===== GRID GALERIA REAL - 3 COLUNAS ===== */
        .edit-photos-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            overflow: hidden;
        }
        
        /* ===== CARD DE FOTO - MINIMALISTA ===== */
        .gallery-photo {
            position: relative;
            aspect-ratio: 1;
            overflow: hidden;
            background: rgba(0, 0, 0, 0.5);
        }
        
        .gallery-photo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            transition: all 0.3s ease;
        }
        
        /* Checkbox escondido */
        .photo-checkbox {
            position: absolute;
            opacity: 0;
            pointer-events: none;
        }
        
        /* Label clicável */
        .photo-label {
            display: block;
            width: 100%;
            height: 100%;
            cursor: pointer;
            position: relative;
        }
        
        /* Checkmark */
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
        }
        
        .photo-checkmark i {
            color: white;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        
        /* Hover - mostrar checkmark */
        .gallery-photo:hover .photo-checkmark {
            opacity: 1;
        }
        
        /* Estado selecionado */
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
        
        /* ===== RESPONSIVO ===== */
        @media (max-width: 768px) {
            .edit-toolbar {
                padding: 12px 15px;
                margin: 0 -15px 15px;
                flex-wrap: wrap;
            }
            
            .edit-toolbar-right {
                width: 100%;
                order: 3;
            }
            
            .toolbar-btn {
                flex: 1;
                justify-content: center;
                padding: 12px 14px;
                font-size: 0.85rem;
            }
            
            .toolbar-btn span {
                display: none;
            }
            
            .toolbar-btn i {
                margin: 0;
            }
            
            .edit-photos-grid {
                gap: 1px;
                border-radius: 4px;
            }
            
            .photo-checkmark {
                width: 28px;
                height: 28px;
            }
            
            .photo-checkmark i {
                font-size: 14px;
            }
        }
        
        @media (max-width: 480px) {
            .edit-toolbar-left h3 {
                font-size: 1rem;
            }
            
            .edit-count {
                font-size: 0.8rem;
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

// Inicializar quando o DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditSystem);
} else {
    initEditSystem();
}

console.log('✏️ Módulo de edição de álbuns carregado!');

console.log('✅ admin.js com Firebase + ImgBB VERDADEIRAMENTE ILIMITADO carregado!');
