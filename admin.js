// ===== SISTEMA COMPLETO COM MENU HAMBÚRGUER MODERNO =====

console.log('🍔 Sistema de menu moderno carregado');

let isAdminUnlocked = false;

// ===== CRIAR MENU HAMBÚRGUER NO TOPO =====
function createModernMenu() {
    // REMOVER botão antigo se existir
    const oldBtn = document.getElementById('adminToggleBtn');
    if (oldBtn) oldBtn.remove();
    
    // CRIAR botão hambúrguer
    const menuBtn = document.createElement('button');
    menuBtn.className = 'hamburger-menu';
    menuBtn.id = 'hamburgerMenu';
    menuBtn.setAttribute('aria-label', 'Menu');
    menuBtn.innerHTML = `
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
    `;
    
    // CRIAR sidebar
    const sidebar = document.createElement('div');
    sidebar.className = 'menu-sidebar';
    sidebar.id = 'menuSidebar';
    sidebar.innerHTML = `
        <div class="sidebar-header">
            <h2><i class="fas fa-heart"></i> Kevin & Iara</h2>
            <button class="close-sidebar" id="closeSidebar">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <nav class="sidebar-nav">
            <a href="#" class="nav-item" data-scroll="main-section">
                <i class="fas fa-home"></i>
                <span>Início</span>
            </a>
            
            <a href="#" class="nav-item" data-scroll="time-counter-section">
                <i class="far fa-clock"></i>
                <span>Contador</span>
            </a>
            
            <a href="#" class="nav-item" data-scroll="music-player-section">
                <i class="fas fa-music"></i>
                <span>Músicas</span>
            </a>
            
            <a href="#" class="nav-item" data-scroll="albums-section">
                <i class="fas fa-images"></i>
                <span>Álbuns</span>
            </a>
            
            <a href="#" class="nav-item" data-scroll="messages-section">
                <i class="fas fa-envelope"></i>
                <span>Mensagens</span>
            </a>
            
            <div class="nav-divider"></div>
            
            <a href="#" class="nav-item nav-item-admin" id="adminMenuItem">
                <i class="fas fa-cog"></i>
                <span>Admin</span>
                <i class="fas fa-lock" style="margin-left: auto; font-size: 12px;"></i>
            </a>
        </nav>
        
        <div class="sidebar-footer">
            <p>Feito com 💖 por Kevin</p>
        </div>
    `;
    
    // CRIAR overlay
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    overlay.id = 'menuOverlay';
    
    document.body.appendChild(menuBtn);
    document.body.appendChild(sidebar);
    document.body.appendChild(overlay);
    
    // EVENTOS
    menuBtn.addEventListener('click', openSidebar);
    document.getElementById('closeSidebar').addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
    
    // Navegação por scroll
    document.querySelectorAll('.nav-item[data-scroll]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionClass = item.getAttribute('data-scroll');
            const section = document.querySelector(`.${sectionClass}`);
            
            if (section) {
                closeSidebar();
                setTimeout(() => {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 300);
            }
        });
    });
    
    // Item Admin
    document.getElementById('adminMenuItem').addEventListener('click', (e) => {
        e.preventDefault();
        openAdminModal();
    });
    
    console.log('✅ Menu hambúrguer criado');
}

// ===== ABRIR/FECHAR SIDEBAR =====
function openSidebar() {
    const sidebar = document.getElementById('menuSidebar');
    const overlay = document.getElementById('menuOverlay');
    const hamburger = document.getElementById('hamburgerMenu');
    
    sidebar.classList.add('active');
    overlay.classList.add('active');
    hamburger.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    const sidebar = document.getElementById('menuSidebar');
    const overlay = document.getElementById('menuOverlay');
    const hamburger = document.getElementById('hamburgerMenu');
    
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    hamburger.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ===== ABRIR MODAL DE ADMIN =====
function openAdminModal() {
    const adminModal = document.getElementById('adminModal');
    
    if (!isAdminUnlocked) {
        const password = prompt('🔐 Digite a senha de admin:');
        
        if (password === 'iara2023') {
            isAdminUnlocked = true;
            
            // Atualizar ícone do menu
            const adminMenuItem = document.getElementById('adminMenuItem');
            const lockIcon = adminMenuItem.querySelector('.fa-lock');
            if (lockIcon) {
                lockIcon.className = 'fas fa-unlock';
                lockIcon.style.color = '#4CAF50';
            }
            
            closeSidebar();
            setTimeout(() => {
                adminModal.style.display = 'block';
                document.body.style.overflow = 'hidden';
                if (typeof loadExistingContent === 'function') {
                    loadExistingContent();
                }
            }, 300);
            
            console.log('✅ Admin desbloqueado');
        } else {
            alert('❌ Senha incorreta!');
        }
    } else {
        closeSidebar();
        setTimeout(() => {
            adminModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            if (typeof loadExistingContent === 'function') {
                loadExistingContent();
            }
        }, 300);
    }
}

// ===== ADICIONAR ABA DE EDIÇÃO NO PAINEL ADMIN =====
function addEditTabToAdmin() {
    const tabsContainer = document.querySelector('.admin-tabs');
    
    if (!tabsContainer) {
        console.warn('⚠️ Tabs container não encontrado');
        return;
    }
    
    const contentArea = tabsContainer.parentElement;
    
    // Verificar se já existe
    if (document.querySelector('[data-tab="edit"]')) {
        console.log('✅ Aba de edição já existe');
        return;
    }
    
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
    
    // Eventos da aba
    editTab.addEventListener('click', () => {
        // Remover active de todas as tabs
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        editTab.classList.add('active');
        
        // Remover active de todos os conteúdos
        document.querySelectorAll('.admin-content').forEach(c => c.classList.remove('active'));
        editContent.classList.add('active');
        
        // Resetar seção de edição
        document.getElementById('editAlbumSection').style.display = 'none';
        document.getElementById('editPhotosGrid').innerHTML = '';
        document.getElementById('saveOrderBtn').style.display = 'none';
        
        updateEditAlbumSelect();
    });
    
    // Eventos dos botões
    const loadBtn = document.getElementById('loadEditAlbumBtn');
    const selectAllBtn = document.getElementById('selectAllPhotos');
    const deleteBtn = document.getElementById('deleteSelectedPhotos');
    const saveBtn = document.getElementById('saveOrderBtn');
    
    if (loadBtn) loadBtn.addEventListener('click', loadAlbumForEdit);
    if (selectAllBtn) selectAllBtn.addEventListener('click', selectAllPhotos);
    if (deleteBtn) deleteBtn.addEventListener('click', deleteSelectedPhotos);
    if (saveBtn) saveBtn.addEventListener('click', savePhotoOrder);
    
    console.log('✅ Aba de edição adicionada');
}

// ===== ATUALIZAR SELECT DE ÁLBUNS PARA EDIÇÃO =====
async function updateEditAlbumSelect() {
    const select = document.getElementById('editAlbumSelect');
    if (!select) return;
    
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
        
        console.log(`✅ ${snapshot.size} álbuns carregados para edição`);
        
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
        
        // Resetar botão
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
        photoCard.setAttribute('data-photo-id', photo.src);
        
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

// ===== INICIALIZAR DRAG & DROP =====
function initDragAndDrop() {
    const grid = document.getElementById('editPhotosGrid');
    
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
            
            onEnd: function() {
                updatePhotoNumbers();
                document.getElementById('saveOrderBtn').style.display = 'inline-flex';
            }
        });
        
        console.log('✅ Drag & Drop inicializado');
    }
}

// ===== ATUALIZAR NUMERAÇÃO =====
function updatePhotoNumbers() {
    const cards = document.querySelectorAll('.edit-photo-card');
    cards.forEach((card, index) => {
        const numberSpan = card.querySelector('.photo-number');
        numberSpan.textContent = `#${index + 1}`;
        card.setAttribute('data-index', index);
    });
}

// ===== SALVAR NOVA ORDEM =====
async function savePhotoOrder() {
    if (!confirm('💾 Salvar a nova ordem das fotos?')) return;
    
    try {
        const btn = document.getElementById('saveOrderBtn');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        btn.disabled = true;
        
        const cards = document.querySelectorAll('.edit-photo-card');
        const newOrder = Array.from(cards).map(card => {
            const photoSrc = card.getAttribute('data-photo-id');
            return window.currentEditAlbum.photos.find(p => p.src === photoSrc);
        });
        
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
        
        // Criar novas páginas
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
        
        await loadAlbumsFromFirebase();
        
    } catch (error) {
        console.error('❌ Erro ao salvar ordem:', error);
        alert('❌ Erro ao salvar ordem: ' + error.message);
        
        const btn = document.getElementById('saveOrderBtn');
        btn.innerHTML = '<i class="fas fa-save"></i> Salvar Ordem';
        btn.disabled = false;
    }
}

// ===== SELECIONAR TODAS =====
function selectAllPhotos() {
    const checkboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        cb.closest('.edit-photo-card').classList.toggle('selected', !allChecked);
    });
    
    const btn = document.getElementById('selectAllPhotos');
    btn.innerHTML = allChecked 
        ? '<i class="fas fa-check-double"></i> Selecionar Todas'
        : '<i class="fas fa-times"></i> Desmarcar Todas';
}

// ===== DELETAR SELECIONADAS =====
async function deleteSelectedPhotos() {
    const checkboxes = document.querySelectorAll('#editPhotosGrid input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
        alert('⚠️ Selecione pelo menos uma foto para deletar!');
        return;
    }
    
    const confirmMsg = checkboxes.length === 1 
        ? '❌ Deletar esta foto?' 
        : `❌ Deletar ${checkboxes.length} fotos?`;
    
    if (!confirm(confirmMsg)) return;
    
    try {
        const btn = document.getElementById('deleteSelectedPhotos');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deletando...';
        btn.disabled = true;
        
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
        
        // Criar novas páginas
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
        
        alert(`✅ ${checkboxes.length} foto(s) deletada(s)!`);
        
        await loadAlbumForEdit();
        await loadAlbumsFromFirebase();
        
        btn.innerHTML = '<i class="fas fa-trash"></i> Deletar Selecionadas';
        btn.disabled = false;
        
    } catch (error) {
        console.error('❌ Erro ao deletar fotos:', error);
        alert('❌ Erro: ' + error.message);
        
        const btn = document.getElementById('deleteSelectedPhotos');
        btn.innerHTML = '<i class="fas fa-trash"></i> Deletar Selecionadas';
        btn.disabled = false;
    }
}

// ===== CSS DO MENU E SISTEMA DE EDIÇÃO =====
function injectMenuStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* ===== BOTÃO HAMBÚRGUER ===== */
        .hamburger-menu {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 5px;
            cursor: pointer;
            z-index: 1000;
            transition: all 0.3s ease;
            padding: 0;
        }
        
        .hamburger-menu:hover {
            background: rgba(255, 64, 129, 0.2);
            border-color: rgba(255, 64, 129, 0.4);
            transform: scale(1.05);
        }
        
        .hamburger-line {
            width: 24px;
            height: 2px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 2px;
            transition: all 0.3s ease;
        }
        
        .hamburger-menu:hover .hamburger-line {
            background: #ff4081;
        }
        
        .hamburger-menu.active .hamburger-line:nth-child(1) {
            transform: translateY(7px) rotate(45deg);
        }
        
        .hamburger-menu.active .hamburger-line:nth-child(2) {
            opacity: 0;
        }
        
        .hamburger-menu.active .hamburger-line:nth-child(3) {
            transform: translateY(-7px) rotate(-45deg);
        }
        
        /* ===== OVERLAY ===== */
        .menu-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
            z-index: 1001;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .menu-overlay.active {
            opacity: 1;
            visibility: visible;
        }
        
        /* ===== SIDEBAR ===== */
        .menu-sidebar {
            position: fixed;
            top: 0;
            right: -350px;
            width: 320px;
            height: 100%;
            background: linear-gradient(135deg, rgba(20, 20, 30, 0.98), rgba(30, 20, 40, 0.98));
            backdrop-filter: blur(20px);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 1002;
            transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            display: flex;
            flex-direction: column;
            box-shadow: -10px 0 50px rgba(0, 0, 0, 0.5);
        }
        
        .menu-sidebar.active {
            right: 0;
        }
        
        /* ===== HEADER DA SIDEBAR ===== */
        .sidebar-header {
            padding: 25px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .sidebar-header h2 {
            font-family: 'Dancing Script', cursive;
            font-size: 24px;
            color: #ff4081;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .close-sidebar {
            width: 35px;
            height: 35px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .close-sidebar:hover {
            background: rgba(255, 64, 129, 0.3);
            transform: rotate(90deg);
        }
        
        /* ===== NAVEGAÇÃO ===== */
        .sidebar-nav {
            flex: 1;
            padding: 20px 0;
            overflow-y: auto;
        }
        
        .nav-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px 25px;
            color: rgba(255, 255, 255, 0.7);
            text-decoration: none;
            font-size: 16px;
            transition: all 0.3s ease;
            border-left: 3px solid transparent;
        }
        
        .nav-item:hover {
            background: rgba(255, 255, 255, 0.05);
            color: white;
            border-left-color: #ff4081;
        }
        
        .nav-item i {
            font-size: 20px;
            width: 25px;
            text-align: center;
        }
        
        .nav-item-admin {
            margin-top: 10px;
            color: rgba(255, 200, 100, 0.8);
        }
        
        .nav-item-admin:hover {
            border-left-color: #ffc107;
        }
        
        .nav-divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 15px 20px;
        }
        
        /* ===== FOOTER DA SIDEBAR ===== */
        .sidebar-footer {
            padding: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            text-align: center;
        }
        
        .sidebar-footer p {
            margin: 0;
            color: rgba(255, 255, 255, 0.4);
            font-size: 14px;
        }
        
        /* ===== GRID DE EDIÇÃO ===== */
        .edit-photos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 15px;
            padding: 10px;
        }
        
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
        }
        
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
        
        .sortable-ghost {
            opacity: 0.3;
        }
        
        .sortable-drag {
            opacity: 1;
            transform: rotate(5deg);
        }
        
        /* ===== RESPONSIVO ===== */
        @media (max-width: 768px) {
            .menu-sidebar {
                width: 280px;
                right: -280px;
            }
            
            .hamburger-menu {
                width: 45px;
                height: 45px;
                top: 15px;
                right: 15px;
            }
            
            .edit-photos-grid {
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                gap: 10px;
            }
        }
    `;
    document.head.appendChild(style);
}

// ===== INICIALIZAR SISTEMA =====
function initCompleteSystem() {
    createModernMenu();
    injectMenuStyles();
    
    // Aguardar admin modal estar pronto
    const checkInterval = setInterval(() => {
        if (document.getElementById('adminModal')) {
            clearInterval(checkInterval);
            addEditTabToAdmin();
            console.log('✅ Sistema completo inicializado');
        }
    }, 500);
}

// Inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCompleteSystem);
} else {
    initCompleteSystem();
}

console.log('✅ Sistema com menu hambúrguer carregado!');
