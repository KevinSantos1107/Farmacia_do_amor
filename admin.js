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

// ===== CONTROLE DO MODAL =====
async function initAdmin() {
    await waitForServices();
    
    const adminToggleBtn = document.getElementById('adminToggleBtn');
    const adminModal = document.getElementById('adminModal');
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    const adminTabs = document.querySelectorAll('.admin-tab');
    
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
    
    // Sistema de tabs
    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            adminTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.admin-content').forEach(content => {
                content.classList.remove('active');
            });
            
            document.getElementById(`${targetTab}-tab`).classList.add('active');
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
        const description = document.getElementById('photoDescription').value;
        
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
                        description: description || `Foto ${i + 1}`,
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
    if (!confirm('❌ Tem certeza que deseja excluir este álbum?\n\nISO NÃO DELETARÁ as imagens do ImgBB (elas ficarão lá para sempre).')) {
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

console.log('✅ admin.js com Firebase + ImgBB VERDADEIRAMENTE ILIMITADO carregado!');
