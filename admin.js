// ===== SISTEMA DE ADMIN COM FIREBASE (BASE64 - SEM STORAGE) =====

console.log('🔐 Sistema de Admin com Firebase (Base64) carregado');

let isAdminUnlocked = false;

// ===== AGUARDAR FIREBASE ESTAR PRONTO =====
function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
}

// ===== CONTROLE DO MODAL =====
async function initAdmin() {
    await waitForFirebase();
    
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

// ===== FUNÇÃO PARA CONVERTER IMAGEM EM BASE64 =====
function imageToBase64(file, maxWidth = 1200) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                // Criar canvas para redimensionar
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Redimensionar se for muito grande
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Converter para Base64 com qualidade reduzida
                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                resolve(base64);
            };
            
            img.onerror = reject;
            img.src = e.target.result;
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ===== GERENCIAMENTO DE ÁLBUNS COM BASE64 =====
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
        
        // Verificar tamanho do arquivo
        if (coverFile.size > 5 * 1024 * 1024) { // 5MB
            alert('❌ Imagem muito grande! Use uma imagem menor que 5MB.');
            return;
        }
        
        try {
            const btn = addAlbumForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Convertendo...';
            btn.disabled = true;
            
            // Converter imagem para Base64
            const coverBase64 = await imageToBase64(coverFile, 800);
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            
            // Criar documento no Firestore
            await db.collection('albums').add({
                title: title,
                date: date,
                cover: coverBase64,
                description: description,
                photoCount: 0,
                photos: [],
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
    
    // Adicionar fotos ao álbum
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
        
        // Limitar quantidade de fotos
        if (photoFiles.length > 10) {
            alert('❌ Máximo de 10 fotos por vez!');
            return;
        }
        
        try {
            const btn = addPhotoForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            
            // Converter todas as fotos para Base64
            const photoUrls = [];
            for (let i = 0; i < photoFiles.length; i++) {
                // Verificar tamanho
                if (photoFiles[i].size > 5 * 1024 * 1024) {
                    alert(`❌ Foto ${i + 1} muito grande! Use imagens menores que 5MB.`);
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    return;
                }
                
                btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Convertendo ${i + 1}/${photoFiles.length}...`;
                
                const base64 = await imageToBase64(photoFiles[i], 1200);
                photoUrls.push({
                    src: base64,
                    description: description || `Foto ${i + 1}`
                });
            }
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            
            // Buscar álbum atual
            const albumDoc = await db.collection('albums').doc(albumId).get();
            const albumData = albumDoc.data();
            
            // Atualizar com novas fotos
            const updatedPhotos = [...(albumData.photos || []), ...photoUrls];
            
            // Verificar limite do Firestore (1MB por documento)
            const dataSize = JSON.stringify(updatedPhotos).length;
            if (dataSize > 900000) { // 900KB (margem de segurança)
                alert('❌ Álbum está muito grande! O Firestore tem limite de 1MB por álbum.\n\nDica: Crie um novo álbum ou use imagens menores.');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }
            
            await db.collection('albums').doc(albumId).update({
                photos: updatedPhotos,
                photoCount: updatedPhotos.length
            });
            
            alert(`✅ ${photoFiles.length} foto(s) adicionada(s)!`);
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

// ===== GERENCIAMENTO DE TIMELINE COM BASE64 =====
function initTimelineForms() {
    const addTimelineForm = document.getElementById('addTimelineForm');
    
addTimelineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const eventDate = document.getElementById('eventDate').value;
        const eventTitle = document.getElementById('eventTitle').value;
        const eventSecret = document.getElementById('eventSecret').value;
        const photoFile = document.getElementById('eventPhoto').files[0];
        const photoCaption = document.getElementById('photoCaption').value;
        
        // DETERMINAR LADO AUTOMATICAMENTE
        let eventSide = 'left'; // padrão
        try {
            const lastEvent = await db.collection('timeline')
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
            
            if (!lastEvent.empty) {
                const lastSide = lastEvent.docs[0].data().side;
                eventSide = lastSide === 'left' ? 'right' : 'left';
            }
        } catch (error) {
            console.log('Primeiro evento - usando lado esquerdo');
        }
        
        if (!photoFile) {
            alert('❌ Selecione uma foto para o evento!');
            return;
        }
        
        if (photoFile.size > 5 * 1024 * 1024) {
            alert('❌ Imagem muito grande! Use uma imagem menor que 5MB.');
            return;
        }
        
        try {
            const btn = addTimelineForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Convertendo...';
            btn.disabled = true;
            
            // Converter foto para Base64
            const photoBase64 = await imageToBase64(photoFile, 1000);
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            
            // Criar evento no Firestore
            await db.collection('timeline').add({
                date: eventDate,
                title: eventTitle,
                secret: eventSecret || null,
                photo: photoBase64,
                caption: photoCaption || '',
                side: eventSide,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            alert(`✅ Evento "${eventTitle}" adicionado!`);
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
        
        snapshot.forEach(doc => {
            firebaseAlbums.push({
                id: doc.id,
                ...doc.data(),
                photos: doc.data().photos || []
            });
        });
        
        // Mesclar com álbuns originais
        if (typeof window.albums !== 'undefined') {
            window.albums = [...window.originalAlbums, ...firebaseAlbums];
        }
        
        // Recarregar galeria
        if (typeof initAlbums === 'function') {
            initAlbums();
        }
        
        console.log(`✅ ${firebaseAlbums.length} álbuns carregados do Firebase`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar álbuns:', error);
    }
}

// ===== RECONSTRUIR TIMELINE COM BASE64 =====
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
                    <div class="existing-item-meta">${event.date}</div>
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
    if (!confirm('❌ Tem certeza que deseja excluir este álbum? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        await db.collection('albums').doc(albumId).delete();
        
        alert('✅ Álbum excluído com sucesso!');
        loadExistingContent();
        updateAlbumSelect();
        await loadAlbumsFromFirebase();
        
    } catch (error) {
        console.error('❌ Erro ao excluir álbum:', error);
        alert('❌ Erro ao excluir: ' + error.message);
    }
};

window.deleteEvent = async function(eventId) {
    if (!confirm('❌ Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        await db.collection('timeline').doc(eventId).delete();
        
        alert('✅ Evento excluído com sucesso!');
        loadExistingContent();
        await rebuildTimeline();
        
    } catch (error) {
        console.error('❌ Erro ao excluir evento:', error);
        alert('❌ Erro ao excluir: ' + error.message);
    }
};

// ===== INICIALIZAR NO CARREGAMENTO =====
document.addEventListener('DOMContentLoaded', async () => {
    await waitForFirebase();
    
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

console.log('✅ admin.js com Firebase Base64 totalmente carregado (100% GRATUITO)');