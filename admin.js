// ===== SISTEMA COMPLETO DE EDIÇÃO COM DRAG & DROP =====

console.log('✏️ Sistema de edição avançado carregado');

// ===== BOTÃO ADMIN DISCRETO E ELEGANTE =====
function createDiscreetAdminButton() {
    // REMOVER botão antigo se existir
    const oldBtn = document.getElementById('adminToggleBtn');
    if (oldBtn) oldBtn.remove();
    
    // CRIAR novo botão discreto
    const adminBtn = document.createElement('div');
    adminBtn.id = 'adminToggleBtn';
    adminBtn.className = 'discreet-admin-btn';
    adminBtn.title = 'Admin (clique 3x)';
    adminBtn.innerHTML = '<i class="fas fa-heart"></i>';
    
    document.body.appendChild(adminBtn);
    
    // Sistema de cliques triplos para ativar
    let clickCount = 0;
    let clickTimer = null;
    
    adminBtn.addEventListener('click', () => {
        clickCount++;
        
        // Animação de feedback
        adminBtn.style.transform = 'scale(1.2)';
        setTimeout(() => {
            adminBtn.style.transform = 'scale(1)';
        }, 200);
        
        // Reset após 2 segundos
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 2000);
        
        // 3 cliques = abrir admin
        if (clickCount === 3) {
            clickCount = 0;
            openAdminModal();
        }
    });
    
    console.log('💖 Botão admin discreto criado (clique 3x no coração)');
}

// ===== ABRIR MODAL DE ADMIN (CORRIGIDO) =====
function openAdminModal() {
    const adminModal = document.getElementById('adminModal');
    
    if (!isAdminUnlocked) {
        const password = prompt('🔐 Digite a senha de admin:');
        
        if (password === 'iara2023') {
            isAdminUnlocked = true;
            const adminBtn = document.getElementById('adminToggleBtn');
            adminBtn.classList.add('unlocked');
            adminBtn.innerHTML = '<i class="fas fa-unlock"></i>';
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
}

// ===== ADICIONAR ABA DE EDIÇÃO NO PAINEL ADMIN =====
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
        <div class="admin-section">
            <h3><i class="fas fa-edit"></i> Selecione um Álbum para Editar</h3>
            <select id="editAlbumSelect" class="admin-select">
                <option value="">Escolha um álbum...</option>
            </select>
            <button id="loadEditAlbumBtn" class="admin-btn" style="margin-top: 10px;">
                <i class="fas fa-folder-open"></i> Carregar Álbum
            </button>
        </div>
        
        <div class="admin-section" id="editAlbumSection" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                <h3 style="margin: 0;"><i class="fas fa-images"></i> <span id="albumPhotoCount">0</span> Fotos</h3>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="selectAllPhotos" class="admin-btn">
                        <i class="fas fa-check-double"></i> Selecionar Todas
                    </button>
                    <button id="deleteSelectedPhotos" class="admin-btn" style="background: #ff4444;">
                        <i class="fas fa-trash"></i> Deletar Selecionadas
                    </button>
                    <button id="saveOrderBtn" class="admin-btn" style="background: #4CAF50; display: none;">
                        <i class="fas fa-save"></i> Salvar Ordem
                    </button>
                </div>
            </div>
            
            <div id="editPhotosGrid" class="edit-photos-grid sortable-grid"></div>
            
            <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 10px;">
                <p style="color: var(--theme-text-secondary); margin: 0; font-size: 14px;">
                    <i class="fas fa-info-circle"></i> 
                    <strong>Como usar:</strong><br>
                    • <strong>Deletar:</strong> Clique nas fotos para selecionar, depois em "Deletar Selecionadas"<br>
                    • <strong>Reorganizar:</strong> Arraste e solte as fotos para mudar a ordem, depois clique em "Salvar Ordem"
                </p>
            </div>
        </div>
    `;
    
    contentArea.appendChild(editContent);
    
    // Eventos da aba (CORRIGIDO)
    editTab.addEventListener('click', () => {
        // Remover active de todas as tabs
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        editTab.classList.add('active');
        
        // Remover active de todos os conteúdos
        document.querySelectorAll('.admin-content').forEach(c => c.classList.remove('active'));
        editContent.classList.add('active');
        
        // Resetar seção de edição quando mudar de aba
        document.getElementById('editAlbumSection').style.display = 'none';
        document.getElementById('editPhotosGrid').innerHTML = '';
        
        updateEditAlbumSelect();
    });
    
    document.getElementById('loadEditAlbumBtn').addEventListener('click', loadAlbumForEdit);
    document.getElementById('selectAllPhotos').addEventListener('click', selectAllPhotos);
    document.getElementById('deleteSelectedPhotos').addEventListener('click', deleteSelectedPhotos);
    document.getElementById('saveOrderBtn').addEventListener('click', savePhotoOrder);
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
        
    } catch (error) {
        console.error('❌ Erro ao carregar álbuns:', error);
    }
}

// ===== CARREGAR ÁLBUM PARA EDIÇÃO (CORRIGIDO) =====
async function loadAlbumForEdit() {
    const select = document.getElementById('editAlbumSelect');
    const albumId = select.value;
    
    if (!albumId) {
        alert('⚠️ Selecione um álbum primeiro!');
        return;
    }
    
    try {
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
        
        // Juntar todas as fotos
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
            photos: allPhotos,
            originalOrder: JSON.parse(JSON.stringify(allPhotos))
        };
        
        // Renderizar fotos
        renderPhotosForEdit(allPhotos, albumData.title);
        
        // CORREÇÃO: Resetar botão corretamente
        btn.innerHTML = '<i class="fas fa-folder-open"></i> Carregar Álbum';
        btn.disabled = false;
        
        document.getElementById('editAlbumSection').style.display = 'block';
        document.getElementById('albumPhotoCount').textContent = allPhotos.length;
        
        console.log(`✅ ${allPhotos.length} fotos carregadas para edição`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar álbum:', error);
        alert('❌ Erro ao carregar álbum: ' + error.message);
        
        const btn = document.getElementById('loadEditAlbumBtn');
        btn.innerHTML = '<i class="fas fa-folder-open"></i> Carregar Álbum';
        btn.disabled = false;
    }
}

// ===== RENDERIZAR FOTOS PARA EDIÇÃO COM DRAG & DROP =====
function renderPhotosForEdit(photos, albumTitle) {
    const grid = document.getElementById('editPhotosGrid');
    
    grid.innerHTML = '';
    
    if (photos.length === 0) {
        grid.innerHTML = '<p style="color: var(--theme-text-secondary); text-align: center; padding: 2rem;">Este álbum está vazio</p>';
        return;
    }
    
    photos.forEach((photo, index) => {
        const photoCard = document.createElement('div');
        photoCard.className = 'edit-photo-card';
        photoCard.setAttribute('data-index', index);
        photoCard.setAttribute('data-photo-id', photo.src); // ID único para drag & drop
        
        photoCard.innerHTML = `
            <div class="drag-handle">
                <i class="fas fa-grip-vertical"></i>
            </div>
            <div class="edit-photo-checkbox">
                <input type="checkbox" id="photo-${index}">
            </div>
            <img src="${photo.src}" alt="${photo.description || 'Foto'}" loading="lazy">
            <div class="edit-photo-info">
                <span class="photo-number">#${index + 1}</span>
            </div>
        `;
        
        // Click na imagem seleciona/deseleciona
        photoCard.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT' && !e.target.closest('.drag-handle')) {
                const checkbox = photoCard.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                photoCard.classList.toggle('selected', checkbox.checked);
            }
        });
        
        // Checkbox
        const checkbox = photoCard.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', (e) => {
            photoCard.classList.toggle('selected', e.target.checked);
        });
        
        grid.appendChild(photoCard);
    });
    
    // Inicializar Drag & Drop
    initDragAndDrop();
}

// ===== INICIALIZAR DRAG & DROP (USANDO SORTABLEJS VIA CDN) =====
function initDragAndDrop() {
    const grid = document.getElementById('editPhotosGrid');
    
    // Carregar SortableJS do CDN
    if (typeof Sortable === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js';
        script.onload = () => {
            createSortable();
        };
        document.head.appendChild(script);
    } else {
        createSortable();
    }
    
    function createSortable() {
        new Sortable(grid, {
            animation: 200,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            chosenClass: 'sortable-chosen',
            
            onStart: function() {
                grid.classList.add('is-dragging');
            },
            
            onEnd: function(evt) {
                grid.classList.remove('is-dragging');
                
                // Atualizar numeração
                updatePhotoNumbers();
                
                // Mostrar botão "Salvar Ordem"
                document.getElementById('saveOrderBtn').style.display = 'inline-flex';
                
                console.log(`📦 Foto movida de #${evt.oldIndex + 1} para #${evt.newIndex + 1}`);
            }
        });
        
        console.log('✅ Drag & Drop inicializado (arraste pela alça)');
    }
}

// ===== ATUALIZAR NUMERAÇÃO DAS FOTOS =====
function updatePhotoNumbers() {
    const cards = document.querySelectorAll('.edit-photo-card');
    cards.forEach((card, index) => {
        const numberSpan = card.querySelector('.photo-number');
        numberSpan.textContent = `#${index + 1}`;
        card.setAttribute('data-index', index);
    });
}

// ===== SALVAR NOVA ORDEM DAS FOTOS =====
async function savePhotoOrder() {
    if (!confirm('💾 Salvar a nova ordem das fotos?')) {
        return;
    }
    
    try {
        const btn = document.getElementById('saveOrderBtn');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        btn.disabled = true;
        
        // Coletar nova ordem das fotos
        const cards = document.querySelectorAll('.edit-photo-card');
        const newOrder = Array.from(cards).map(card => {
            const photoSrc = card.getAttribute('data-photo-id');
            return window.currentEditAlbum.photos.find(p => p.src === photoSrc);
        });
        
        console.log(`💾 Salvando nova ordem (${newOrder.length} fotos)...`);
        
        // Reorganizar em páginas
        const PHOTOS_PER_PAGE = 200;
        const newPages = [];
        
        for (let i = 0; i < newOrder.length; i += PHOTOS_PER_PAGE) {
            newPages.push(newOrder.slice(i, i + PHOTOS_PER_PAGE));
        }
        
        // Deletar páginas antigas
        const oldPagesSnapshot = await db.collection('album_photos')
            .where('albumId', '==', window.currentEditAlbum.id)
            .get();
        
        const deletePromises = [];
        oldPagesSnapshot.forEach(doc => {
            deletePromises.push(db.collection('album_photos').doc(doc.id).delete());
        });
        
        await Promise.all(deletePromises);
        
        // Criar novas páginas com ordem atualizada
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
        
        alert('✅ Ordem das fotos salva com sucesso!');
        
        btn.innerHTML = '<i class="fas fa-save"></i> Salvar Ordem';
        btn.disabled = false;
        btn.style.display = 'none';
        
        // Atualizar galeria principal
        await loadAlbumsFromFirebase();
        
        console.log('✅ Nova ordem salva no Firebase');
        
    } catch (error) {
        console.error('❌ Erro ao salvar ordem:', error);
        alert('❌ Erro ao salvar ordem: ' + error.message);
        
        const btn = document.getElementById('saveOrderBtn');
        btn.innerHTML = '<i class="fas fa-save"></i> Salvar Ordem';
        btn.disabled = false;
    }
}

// ===== SELECIONAR TODAS AS FOTOS =====
function selectAllPhotos() {
    const checkboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        cb.closest('.edit-photo-card').classList.toggle('selected', !allChecked);
    });
    
    const btn = document.getElementById('selectAllPhotos');
    if (allChecked) {
        btn.innerHTML = '<i class="fas fa-check-double"></i> Selecionar Todas';
    } else {
        btn.innerHTML = '<i class="fas fa-times"></i> Desmarcar Todas';
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
        
        // Coletar fotos a serem mantidas
        const remainingPhotos = [];
        const cards = document.querySelectorAll('.edit-photo-card');
        
        cards.forEach(card => {
            const checkbox = card.querySelector('input[type="checkbox"]');
            if (!checkbox.checked) {
                const photoSrc = card.getAttribute('data-photo-id');
                const photo = window.currentEditAlbum.photos.find(p => p.src === photoSrc);
                if (photo) remainingPhotos.push(photo);
            }
        });
        
        console.log(`🗑️ Deletando ${checkboxes.length} fotos, restam ${remainingPhotos.length}`);
        
        // Reorganizar em páginas
        const PHOTOS_PER_PAGE = 200;
        const newPages = [];
        
        for (let i = 0; i < remainingPhotos.length; i += PHOTOS_PER_PAGE) {
            newPages.push(remainingPhotos.slice(i, i + PHOTOS_PER_PAGE));
        }
        
        // Deletar páginas antigas
        const oldPagesSnapshot = await db.collection('album_photos')
            .where('albumId', '==', window.currentEditAlbum.id)
            .get();
        
        const deletePromises = [];
        oldPagesSnapshot.forEach(doc => {
            deletePromises.push(db.collection('album_photos').doc(doc.id).delete());
        });
        
        await Promise.all(deletePromises);
        
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
        }
        
        // Atualizar contador
        await db.collection('albums').doc(window.currentEditAlbum.id).update({
            photoCount: remainingPhotos.length
        });
        
        alert(`✅ ${checkboxes.length} foto(s) deletada(s)!\n\n⚠️ As imagens continuam no ImgBB.`);
        
        // Recarregar álbum
        await loadAlbumForEdit();
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

// ===== CSS PARA O SISTEMA (BOTÃO DISCRETO + DRAG & DROP) =====
function injectEditStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* ===== BOTÃO ADMIN DISCRETO ===== */
        .discreet-admin-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, rgba(255,64,129,0.1), rgba(255,105,180,0.1));
            border: 1px solid rgba(255,64,129,0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            opacity: 0.3;
            z-index: 998;
            backdrop-filter: blur(10px);
        }
        
        .discreet-admin-btn:hover {
            opacity: 0.8;
            transform: scale(1.1);
            background: linear-gradient(135deg, rgba(255,64,129,0.2), rgba(255,105,180,0.2));
            box-shadow: 0 0 20px rgba(255,64,129,0.3);
        }
        
        .discreet-admin-btn i {
            color: rgba(255,64,129,0.6);
            font-size: 18px;
            transition: all 0.3s ease;
        }
        
        .discreet-admin-btn:hover i {
            color: rgba(255,64,129,1);
        }
        
        .discreet-admin-btn.unlocked {
            background: linear-gradient(135deg, rgba(76,175,80,0.2), rgba(139,195,74,0.2));
            border-color: rgba(76,175,80,0.3);
        }
        
        .discreet-admin-btn.unlocked i {
            color: rgba(76,175,80,0.8);
        }
        
        /* ===== GRID DE EDIÇÃO ===== */
        .edit-photos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 15px;
            padding: 10px;
            min-height: 200px;
        }
        
        .edit-photos-grid.is-dragging {
            background: rgba(255,255,255,0.02);
            border: 2px dashed rgba(255,64,129,0.3);
            border-radius: 10px;
        }
        
        /* ===== CARD DE FOTO ===== */
        .edit-photo-card {
            position: relative;
            aspect-ratio: 1;
            border-radius: 10px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 3px solid transparent;
            background: rgba(255,255,255,0.05);
        }
        
        .edit-photo-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        
        .edit-photo-card.selected {
            border-color: #ff4081;
            box-shadow: 0 0 20px rgba(255,64,129,0.5);
        }
        
        .edit-photo-card img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            pointer-events: none;
        }
        
        /* ===== ALÇA DE DRAG ===== */
        .drag-handle {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 30px;
            height: 30px;
            background: rgba(0,0,0,0.7);
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: grab;
            z-index: 10;
            opacity: 0;
            transition: all 0.3s ease;
        }
        
        .edit-photo-card:hover .drag-handle {
            opacity: 1;
        }
        
        .drag-handle:active {
            cursor: grabbing;
        }
        
        .drag-handle i {
            color: white;
            font-size: 14px;
        }
        
        /* ===== CHECKBOX ===== */
        .edit-photo-checkbox {
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 10;
        }
        
        .edit-photo-checkbox input[type="checkbox"] {
            width: 24px;
            height: 24px;
            cursor: pointer;
            accent-color: #ff4081;
        }
        
        /* ===== INFO DA FOTO ===== */
        .edit-photo-info {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 10px;
            background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
            color: white;
            font-size: 12px;
        }
        
        .photo-number {
            background: rgba(255,64,129,0.8);
            padding: 3px 8px;
            border-radius: 5px;
            font-weight: bold;
        }
        
        /* ===== ESTADOS DO SORTABLE ===== */
        .sortable-ghost {
            opacity: 0.3;
            background: rgba(255,64,129,0.2);
        }
        
        .sortable-drag {
            opacity: 1;
            transform: rotate(5deg);
            box-shadow: 0 15px 40px rgba(0,0,0,0.5);
        }
        
        .sortable-chosen {
            cursor: grabbing;
        }
        
        /* ===== RESPONSIVO ===== */
        @media (max-width: 768px) {
            .edit-photos-grid {
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                gap: 10px;
            }
            
            .discreet-admin-btn {
                width: 35px;
                height: 35px;
                bottom: 15px;
                right: 15px;
            }
            
            .discreet-admin-btn i {
                font-size: 16px;
            }
        }
    `;
    document.head.appendChild(style);
}

// ===== INICIALIZAR SISTEMA DE EDIÇÃO =====
function initEditSystem() {
    // Criar botão discreto
    createDiscreetAdminButton();
    
    // Aguardar admin modal estar pronto
    const checkInterval = setInterval(() => {
        if (document.getElementById('adminModal')) {
            clearInterval(checkInterval);
            
            addEditTabToAdmin();
            injectEditStyles();
            
            console.log('✅ Sistema de edição completo inicializado');
        }
    }, 500);
}

// Inicializar quando o DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditSystem);
} else {
    initEditSystem();
}

console.log('✏️ Módulo completo de edição carregado!');
