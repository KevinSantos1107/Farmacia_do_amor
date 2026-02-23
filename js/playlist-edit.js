// ===== SISTEMA DE EDIÇÃO DE PLAYLISTS - MENU DE 3 PONTOS + MODO REORDENAÇÃO =====

class PlaylistEditManager {
    constructor() {
        this.currentPlaylistId = null;
        this.currentPlaylistData = null;
        this.selectedTracks = new Set();
        this.allTracks = [];
        this.isReady = false;
        
        // Variáveis para o drag and drop
        this.isDragging = false;
        this.draggedElement = null;
        this.draggedIndex = null;
        this.placeholder = null;
        
        // Variável para indicar se está salvando
        this.isSaving = false;
        
        // Variável para armazenar nova capa
        this.newCoverData = null;
        
        // 🔥 SISTEMA DE FILA DE SALVAMENTO
        this.saveQueue = [];
        this.isProcessingQueue = false;
        this.pendingSaveType = null; // 'info' ou 'tracks'
        
        // 🆕 MODO REORDENAÇÃO
        this.reorderMode = false;
        this.currentOpenMenuId = null;
        this.initialReorderState = null; // Armazena ordem inicial para comparar
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.createModalHTML();
        this.setupEventListeners();
        this.createToastContainer();
        this.isReady = true;
        console.log('✅ PlaylistEditManager inicializado');
    }

    createToastContainer() {
        if (document.getElementById('toastContainer')) return;
        
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    showToast(message, type = 'success', toastId = null) {
        const container = document.getElementById('toastContainer');
        if (!container) return null;

        // Se toastId foi fornecido, tentar atualizar toast existente
        if (toastId) {
            const existingToast = document.getElementById(toastId);
            if (existingToast) {
                const icon = type === 'success' ? 'fa-check-circle' : 
                             type === 'error' ? 'fa-exclamation-circle' : 
                             type === 'loading' ? 'fa-spinner fa-spin' :
                             'fa-info-circle';
                
                existingToast.className = `toast toast-${type} show`; // Sempre com 'show'
                existingToast.innerHTML = `
                    <i class="fas ${icon}"></i>
                    <span>${message}</span>
                `;

                // Limpar timeout anterior se existir
                if (existingToast._removeTimeout) {
                    clearTimeout(existingToast._removeTimeout);
                    existingToast._removeTimeout = null;
                }

                // Se não for loading, remover após 3 segundos
                if (type !== 'loading') {
                    existingToast._removeTimeout = setTimeout(() => {
                        existingToast.classList.remove('show');
                        setTimeout(() => existingToast.remove(), 300);
                    }, 3000);
                }

                return toastId;
            }
        }

        // Criar novo toast
        const newToastId = toastId || `toast-${Date.now()}`;
        const toast = document.createElement('div');
        toast.id = newToastId;
        toast.className = `toast toast-${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-exclamation-circle' : 
                     type === 'loading' ? 'fa-spinner fa-spin' :
                     'fa-info-circle';
        
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Animação de entrada
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remover após 3 segundos (exceto se for loading)
        if (type !== 'loading') {
            toast._removeTimeout = setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        return newToastId;
    }

    createModalHTML() {
        const modalHTML = `
            <div id="playlistEditModal" class="playlist-edit-modal">
                <div class="playlist-edit-container">
                    <div class="playlist-edit-header">
                        <h2 class="playlist-edit-title">
                            <i class="fas fa-compact-disc"></i>
                            <span id="editModalTitle">Editar Playlist</span>
                        </h2>
                        <button class="playlist-edit-close" onclick="playlistEditManager.closeModal()">&times;</button>
                    </div>

                    <div class="playlist-edit-content">
                        <div class="playlist-info-section">
                            <h3 class="section-title">
                                <i class="fas fa-info-circle"></i>
                                Informações da Playlist
                            </h3>

                            <div class="playlist-info-grid">
                                <div class="info-field">
                                    <label for="editPlaylistName">Nome</label>
                                    <input type="text" id="editPlaylistName" placeholder="Nome da playlist">
                                </div>

                                <div class="info-field">
                                    <label for="editPlaylistIcon">Ícone</label>
                                    <select id="editPlaylistIcon" style="
                                        background: rgba(255, 255, 255, 0.05);
                                        border: 1px solid var(--theme-card-border);
                                        border-radius: 10px;
                                        padding: 12px 15px;
                                        color: var(--theme-text);
                                        font-size: 1rem;
                                    ">
                                        <option value="fa-heart">❤️ Coração</option>
                                        <option value="fa-music">🎵 Música</option>
                                        <option value="fa-guitar">🎸 Guitarra</option>
                                        <option value="fa-fire">🔥 Fogo</option>
                                        <option value="fa-star">⭐ Estrela</option>
                                        <option value="fa-headphones">🎧 Headphones</option>
                                    </select>
                                </div>
                            </div>

                            <div class="cover-upload-section">
                                <div class="cover-preview">
                                    <img id="playlistCoverPreview" src="images/capas-albuns/default-playlist.jpg" alt="Capa">
                                </div>
                                <div class="cover-upload-controls">
                                    <div class="upload-btn-group">
                                        <button class="upload-btn primary" onclick="document.getElementById('playlistCoverInput').click()">
                                            <i class="fas fa-upload"></i>
                                            Alterar Capa
                                        </button>
                                    </div>
                                    <input type="file" id="playlistCoverInput" accept="image/*" style="display: none;">
                                    <p class="cover-upload-hint">Formatos: JPG, PNG (máx. 5MB)</p>
                                </div>
                            </div>
                        </div>

                        <div class="playlist-music-section">
                            <div class="music-section-header">
                                <div>
                                    <h3 class="section-title">
                                        <i class="fas fa-headphones"></i>
                                        Suas Músicas
                                    </h3>
                                    <div class="music-count" id="playlistEditMusicCount">0 músicas</div>
                                </div>
                            </div>

                            <!-- CONTROLES DO MODO REORDENAÇÃO -->
                            <div class="reorder-mode-controls" id="reorderModeControls">
                                <div class="reorder-mode-text">
                                    <i class="fas fa-arrows-alt"></i>
                                    <span>Modo Reordenação Ativo</span>
                                </div>
                                <button class="finish-reorder-btn" onclick="playlistEditManager.toggleReorderMode()">
                                    <i class="fas fa-check"></i>
                                    Concluir
                                </button>
                            </div>

                            <div id="musicGridContainer">
                                <div class="empty-state">
                                    <div class="empty-state-icon">
                                        <i class="fas fa-music"></i>
                                    </div>
                                    <div class="empty-state-text">Nenhuma música adicionada ainda</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const musicEditModalHTML = `
            <div id="musicEditModal" class="music-edit-modal">
                <div class="music-edit-dialog">
                    <div class="music-edit-header">
                        <h3 class="music-edit-title">Editar Música</h3>
                        <button class="music-edit-close" onclick="playlistEditManager.closeMusicEditModal()">&times;</button>
                    </div>
                    <div class="music-edit-body">
                        <div class="music-edit-cover">
                            <img id="musicEditCoverPreview" src="images/capas-albuns/default-music.jpg" alt="Capa">
                        </div>
                        <form class="music-edit-form" id="musicEditForm">
                            <div class="edit-form-group">
                                <label for="editMusicTitle">Título</label>
                                <input type="text" id="editMusicTitle" required placeholder="Título da música">
                            </div>
                            <div class="edit-form-group">
                                <label for="editMusicArtist">Artista</label>
                                <input type="text" id="editMusicArtist" placeholder="Nome do artista">
                            </div>
                            <div class="edit-form-group">
                                <label for="editMusicAlbum">Álbum</label>
                                <input type="text" id="editMusicAlbum" placeholder="Nome do álbum (opcional)">
                            </div>
                        </form>
                    </div>
                    <div class="music-edit-footer">
                        <button class="modal-btn secondary" onclick="playlistEditManager.closeMusicEditModal()">
                            <i class="fas fa-times"></i>
                            Cancelar
                        </button>
                        <button class="modal-btn primary" id="saveMusicBtn" onclick="playlistEditManager.saveMusicEdit()">
                            <i class="fas fa-save"></i>
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (document.getElementById('playlistEditModal')) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = modalHTML + musicEditModalHTML;
        
        const modals = Array.from(wrapper.children);
        modals.forEach(modal => {
            document.body.appendChild(modal);
        });

        console.log('✅ Modal HTML injetado');
    }

    setupEventListeners() {
        const coverInput = document.getElementById('playlistCoverInput');
        if (coverInput) {
            coverInput.addEventListener('change', (e) => this.handleCoverUpload(e));
        }

        // Save automático ao alterar nome (blur = quando sai do campo)
        const nameInput = document.getElementById('editPlaylistName');
        if (nameInput) {
            nameInput.addEventListener('blur', () => this.savePlaylistInfo('Nome atualizado'));
        }

        // Save automático ao alterar ícone
        const iconSelect = document.getElementById('editPlaylistIcon');
        if (iconSelect) {
            iconSelect.addEventListener('change', () => this.savePlaylistInfo('Ícone atualizado'));
        }

        // Fechar menus ao pressionar ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeMusicEditModal();
                this.closeAllMenus();
            }
        });

        // 🆕 FECHAR MENUS AO CLICAR FORA
        document.addEventListener('click', (e) => {
            // Se não há menu aberto, não fazer nada
            if (!this.currentOpenMenuId) return;

            // Verificar se o clique foi dentro de um menu ou botão de menu
            const clickedInsideMenu = e.target.closest('.music-dropdown-menu');
            const clickedMenuButton = e.target.closest('.music-menu-btn');

            // Se clicou fora do menu e fora do botão, fechar
            if (!clickedInsideMenu && !clickedMenuButton) {
                this.closeAllMenus();
            }
        });
    }

    async openModal(playlistId) {
        try {
            // 🚀 GARANTIR QUE O MODAL EXISTE (sem setTimeout)
            if (!document.getElementById('playlistEditModal')) {
                this.createModalHTML();
            }

            this.currentPlaylistId = playlistId;
            this.selectedTracks.clear();
            
            // 🔥 ABRIR MODAL IMEDIATAMENTE (antes de carregar dados)
            const modal = document.getElementById('playlistEditModal');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Mostrar loading state
            const container = document.getElementById('musicGridContainer');
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <div class="empty-state-text">Carregando músicas...</div>
                </div>
            `;

            // Resetar estados
            this.newCoverData = null;
            this.reorderMode = false;

            // 📋 CARREGAR DADOS DA PLAYLIST (em paralelo)
            const playlistDoc = await db.collection('custom_playlists').doc(playlistId).get();
            if (!playlistDoc.exists) {
                this.showToast('Playlist não encontrada', 'error');
                this.closeModal();
                return;
            }

            this.currentPlaylistData = { id: playlistId, ...playlistDoc.data() };

            // 🎨 ATUALIZAR INTERFACE COM DADOS DA PLAYLIST
            document.getElementById('editModalTitle').textContent = `Editar: ${this.currentPlaylistData.name}`;
            document.getElementById('editPlaylistName').value = this.currentPlaylistData.name || '';
            document.getElementById('editPlaylistIcon').value = this.currentPlaylistData.icon || 'fa-heart';
            document.getElementById('playlistCoverPreview').src = this.currentPlaylistData.cover || 'images/capas-albuns/default-playlist.jpg';

            // 🎵 CARREGAR TRACKS (pode demorar, mas modal já está aberto)
            await this.loadPlaylistTracks();

            // Re-adicionar event listeners após renderizar o modal
            this.setupEventListeners();

            console.log('✅ Modal aberto e dados carregados');
        } catch (error) {
            console.error('❌ Erro ao abrir modal:', error);
            this.showToast('Erro ao abrir modal: ' + error.message, 'error');
            this.closeModal();
        }
    }

    async loadPlaylistTracks() {
        try {
            const snapshot = await db.collection('playlist_tracks')
                .where('playlistId', '==', this.currentPlaylistId)
                .get();

            const docs = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
            const pages = docs.filter(d => Array.isArray(d.data.tracks));
            const singleTrackDocs = docs.filter(d => !Array.isArray(d.data.tracks));

            const flattened = [];

            if (pages.length > 0) {
                pages.sort((a, b) => (a.data.pageNumber ?? 0) - (b.data.pageNumber ?? 0));
                pages.forEach(page => {
                    const pageTracks = page.data.tracks || [];
                    pageTracks.forEach((trackObj, idx) => {
                        const genId = `${page.id}::${idx}`;
                        flattened.push(Object.assign({}, trackObj, {
                            id: genId,
                            _pageDocId: page.id,
                            _pageIndex: idx
                        }));
                    });
                });
            }

            singleTrackDocs.forEach(doc => {
                flattened.push(Object.assign({}, doc.data, { id: doc.id }));
            });

            this.allTracks = flattened;
            
            // 🚀 RENDERIZAR IMEDIATAMENTE (sem aguardar nada)
            this.renderMusicGrid();
            
            console.log(`✅ ${this.allTracks.length} músicas carregadas e renderizadas`);
        } catch (error) {
            console.error('❌ Erro ao carregar:', error);
            this.allTracks = [];
            this.renderMusicGrid();
        }
    }

    async persistTracksToPages() {
        if (!this.currentPlaylistId) throw new Error('Playlist não definida');

        console.log('💾 === INICIANDO persistTracksToPages ===');
        console.log('   Playlist ID:', this.currentPlaylistId);
        console.log('   Total de tracks:', this.allTracks.length);

        try {
            console.log('🗑️ Removendo tracks antigos do Firebase...');

            const snapshot = await db.collection('playlist_tracks')
                .where('playlistId', '==', this.currentPlaylistId)
                .get();

            console.log(`   Encontrados ${snapshot.docs.length} documentos antigos`);

            const deletePromises = [];
            snapshot.forEach(doc => {
                deletePromises.push(db.collection('playlist_tracks').doc(doc.id).delete());
            });
            await Promise.all(deletePromises);
            console.log('✅ Tracks antigos removidos');

            const tracksToSave = this.allTracks.map(t => {
                const copy = Object.assign({}, t);
                delete copy.id;
                delete copy._pageDocId;
                delete copy._pageIndex;
                return copy;
            });

            console.log('📋 Ordem das tracks que serão salvas:');
            tracksToSave.forEach((t, i) => {
                console.log(`   ${i + 1}. ${t.title} - ${t.artist}`);
            });

            const TRACKS_PER_PAGE = 200;
            const pages = [];
            for (let i = 0; i < tracksToSave.length; i += TRACKS_PER_PAGE) {
                pages.push(tracksToSave.slice(i, i + TRACKS_PER_PAGE));
            }

            console.log(`💾 Salvando em ${pages.length} página(s)...`);

            for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                const docRef = await db.collection('playlist_tracks').add({
                    playlistId: this.currentPlaylistId,
                    pageNumber: pageIndex,
                    tracks: pages[pageIndex],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log(`   ✅ Página ${pageIndex} salva - ${pages[pageIndex].length} tracks - Doc: ${docRef.id}`);
            }

            await db.collection('custom_playlists').doc(this.currentPlaylistId).update({
                trackCount: tracksToSave.length,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('✅ trackCount atualizado:', tracksToSave.length);
            console.log('✅ === persistTracksToPages CONCLUÍDO ===');
        } catch (error) {
            console.error('❌ Erro no persistTracksToPages:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // SAVE AUTOMÁTICO - INFORMAÇÕES DA PLAYLIST
    // ═══════════════════════════════════════════════════════════

    async processSaveQueue() {
        if (this.isProcessingQueue || this.saveQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;
        const queueLength = this.saveQueue.length;
        
        console.log(`📋 Processando ${queueLength} alteração(ões) na fila...`);

        while (this.saveQueue.length > 0) {
            const saveTask = this.saveQueue.shift();
            
            try {
                await saveTask.execute();
            } catch (error) {
                console.error('❌ Erro ao processar fila:', error);
            }
        }

        this.isProcessingQueue = false;
        console.log('✅ Fila processada completamente');
    }

    async savePlaylistInfo(successMessage = 'Playlist atualizada') {
        // Se já está salvando, adicionar à fila
        if (this.isSaving) {
            console.log('⏳ Save em andamento, adicionando à fila...');
            
            this.saveQueue.push({
                execute: () => this._executeSavePlaylistInfo(successMessage, true) // true = está na fila
            });
            
            return;
        }

        const toastId = this.showToast('Salvando...', 'loading');
        await this._executeSavePlaylistInfo(successMessage, false, toastId);
        
        // Processar fila se houver itens pendentes
        if (this.saveQueue.length > 0) {
            console.log(`📋 ${this.saveQueue.length} alteração(ões) na fila, processando...`);
            
            // Atualizar toast para mostrar que está processando fila
            this.showToast('Salvando alteração(ões)...', 'loading', toastId);
            
            await this.processSaveQueue();
            
            // Toast final de sucesso
            this.showToast('Todas alterações salvas', 'success', toastId);
        }
    }

    async _executeSavePlaylistInfo(successMessage = 'Playlist atualizada', isFromQueue = false, toastId = null) {
        if (!this.currentPlaylistId) {
            console.warn('⚠️ Nenhuma playlist selecionada');
            return;
        }

        try {
            this.isSaving = true;

            const name = document.getElementById('editPlaylistName').value.trim();
            const icon = document.getElementById('editPlaylistIcon').value;

            if (!name) {
                if (toastId) {
                    this.showToast('Nome não pode ser vazio', 'error', toastId);
                }
                return;
            }

            console.log('💾 Salvando informações da playlist...');
            console.log('   Nome:', name);
            console.log('   Ícone:', icon);
            console.log('   Nova capa?', this.newCoverData ? 'Sim' : 'Não');

            const updateData = {
                name: name,
                icon: icon,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Adicionar capa apenas se houver uma nova
            if (this.newCoverData) {
                updateData.cover = this.newCoverData;
            }

            await db.collection('custom_playlists').doc(this.currentPlaylistId).update(updateData);

            // Atualizar título do modal
            document.getElementById('editModalTitle').textContent = `Editar: ${name}`;

            // Atualizar dados locais
            this.currentPlaylistData.name = name;
            this.currentPlaylistData.icon = icon;
            if (this.newCoverData) {
                this.currentPlaylistData.cover = this.newCoverData;
            }

            // Recarregar player para refletir mudanças
            if (typeof window.PlaylistManager !== 'undefined' && window.PlaylistManager.reload) {
                await window.PlaylistManager.reload();
                console.log('✅ PlaylistManager.reload() executado');
            }

            // 🔥 ATUALIZAR LISTA DE PLAYLISTS NO ADMIN
            if (typeof window.loadExistingPlaylists === 'function') {
                await window.loadExistingPlaylists();
                console.log('✅ Lista de playlists no admin atualizada');
            }

            // Só mostrar toast de sucesso se NÃO estiver na fila (fila mostra toast único no final)
            if (!isFromQueue && toastId) {
                this.showToast(successMessage, 'success', toastId);
            }
            
            console.log('✅ Informações da playlist salvas');

        } catch (error) {
            console.error('❌ Erro ao salvar playlist:', error);
            if (toastId) {
                this.showToast('Erro ao salvar: ' + error.message, 'error', toastId);
            }
        } finally {
            this.isSaving = false;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // MODO REORDENAÇÃO
    // ═══════════════════════════════════════════════════════════

    async toggleReorderMode() {
        this.reorderMode = !this.reorderMode;
        
        const musicList = document.getElementById('musicList');
        const controls = document.getElementById('reorderModeControls');
        
        if (this.reorderMode) {
            console.log('🔄 Modo reordenação ATIVADO');
            musicList?.classList.add('reorder-mode');
            controls?.classList.add('active');
            this.closeAllMenus();
            
            // Armazenar ordem inicial para comparar depois
            this.initialReorderState = this.allTracks.map(t => t.id);
            console.log('📋 Ordem inicial salva:', this.initialReorderState.length, 'tracks');
        } else {
            console.log('✅ Modo reordenação DESATIVADO');
            musicList?.classList.remove('reorder-mode');
            controls?.classList.remove('active');
            
            // Verificar se houve mudanças na ordem
            const currentOrder = this.allTracks.map(t => t.id);
            const hasChanges = JSON.stringify(this.initialReorderState) !== JSON.stringify(currentOrder);
            
            if (hasChanges) {
                console.log('🔄 Ordem foi alterada, salvando...');
                console.log('   Ordem inicial:', this.initialReorderState);
                console.log('   Ordem final:', currentOrder);
                
                // SAVE AUTOMÁTICO ao sair do modo reordenação
                await this.autoSave('Ordem atualizada');
            } else {
                console.log('ℹ️ Nenhuma mudança na ordem');
            }
            
            // Limpar estado inicial
            this.initialReorderState = null;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // MENU DE 3 PONTOS
    // ═══════════════════════════════════════════════════════════

    toggleMenu(trackId, event) {
        event.stopPropagation();
        
        // Se clicar no mesmo menu, fecha
        if (this.currentOpenMenuId === trackId) {
            this.closeAllMenus();
            return;
        }
        
        // Fechar qualquer menu aberto
        this.closeAllMenus();
        
        // Abrir novo menu
        const menu = document.getElementById(`menu-${trackId}`);
        const button = event.currentTarget;
        
        if (menu && button) {
            menu.classList.add('active');
            this.currentOpenMenuId = trackId;
            
            // 🆕 POSICIONAMENTO DINÂMICO (cima ou baixo)
            this.positionMenuDynamically(menu, button);
            
            console.log('📋 Menu aberto:', trackId);
        }
    }

    positionMenuDynamically(menu, button) {
        // Obter posições
        const buttonRect = button.getBoundingClientRect();
        const menuHeight = menu.offsetHeight || 150; // Altura estimada do menu
        const viewportHeight = window.innerHeight;
        
        // 🆕 VERIFICAR O CONTAINER SCROLLÁVEL
        const container = document.querySelector('.playlist-edit-container');
        const containerRect = container ? container.getBoundingClientRect() : null;
        
        // Calcular espaço disponível embaixo e em cima
        let spaceBelow = viewportHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        
        // 🔥 AJUSTAR spaceBelow SE O CONTAINER TEM LIMITE
        if (containerRect) {
            // Se o bottom do container está visível e é menor que o viewport
            const containerBottom = containerRect.bottom;
            if (containerBottom < viewportHeight) {
                // Recalcular espaço embaixo baseado no container, não no viewport
                spaceBelow = containerBottom - buttonRect.bottom;
                console.log('📐 Container tem limite! Ajustando spaceBelow para:', spaceBelow, 'px');
            }
        }
        
        console.log('📐 Espaço embaixo:', spaceBelow, 'px');
        console.log('📐 Espaço em cima:', spaceAbove, 'px');
        console.log('📐 Altura do menu:', menuHeight, 'px');
        
        // Remover classes anteriores
        menu.classList.remove('open-upward', 'open-downward');
        
        // Decidir posição: se não tem espaço embaixo, abre para cima
        // 🆕 Adicionar margem de segurança de 20px
        if (spaceBelow < (menuHeight + 20) && spaceAbove > spaceBelow) {
            menu.classList.add('open-upward');
            console.log('⬆️ Abrindo menu para CIMA');
        } else {
            menu.classList.add('open-downward');
            console.log('⬇️ Abrindo menu para BAIXO');
        }
    }

    closeAllMenus() {
        const allMenus = document.querySelectorAll('.music-dropdown-menu');
        
        allMenus.forEach(menu => menu.classList.remove('active'));
        this.currentOpenMenuId = null;
    }

    // ═══════════════════════════════════════════════════════════
    // RENDERIZAÇÃO DA GRID
    // ═══════════════════════════════════════════════════════════
    
    renderMusicGrid() {
        const container = document.getElementById('musicGridContainer');
        
        if (this.allTracks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fas fa-music"></i></div>
                    <div class="empty-state-text">Nenhuma música adicionada ainda</div>
                </div>
            `;
            return;
        }

        const countEl = document.getElementById('playlistEditMusicCount');
        if (countEl) {
            countEl.textContent = `${this.allTracks.length} ${this.allTracks.length === 1 ? 'música' : 'músicas'}`;
        }

        const list = document.createElement('div');
        list.className = 'music-list';
        list.id = 'musicList';
        
        // Aplicar modo reordenação se estiver ativo
        if (this.reorderMode) {
            list.classList.add('reorder-mode');
        }

        this.allTracks.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = 'music-list-item';
            item.dataset.trackId = track.id;
            item.dataset.index = index;

            item.innerHTML = `
                <!-- DRAG HANDLE (visível apenas no modo reordenação) -->
                <div class="drag-handle">
                    <div class="bars"><span></span><span></span><span></span></div>
                </div>
                
                <!-- CAPA -->
                <div class="music-list-cover">
                    <img src="${track.cover || 'images/capas-albuns/default-music.jpg'}" alt="${track.title}">
                </div>
                
                <!-- INFORMAÇÕES -->
                <div class="music-list-info">
                    <div class="music-list-title">${track.title || 'Sem título'}</div>
                    <div class="music-list-artist">${track.artist || 'Artista desconhecido'}</div>
                </div>
                
                <!-- BOTÃO DE MENU (3 pontos) -->
                <button class="music-menu-btn" onclick="playlistEditManager.toggleMenu('${track.id}', event)">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                
                <!-- DROPDOWN MENU -->
                <div class="music-dropdown-menu" id="menu-${track.id}">
                    <div class="menu-item reorder-item" onclick="playlistEditManager.toggleReorderMode(); playlistEditManager.closeAllMenus();">
                        <i class="fas fa-arrows-alt"></i>
                        <span>Reordenar</span>
                    </div>
                    <div class="menu-item edit-item" onclick="playlistEditManager.editMusicMetadata('${track.id}'); playlistEditManager.closeAllMenus();">
                        <i class="fas fa-edit"></i>
                        <span>Editar</span>
                    </div>
                    <div class="menu-item delete-item" onclick="playlistEditManager.deleteTrack('${track.id}'); playlistEditManager.closeAllMenus();">
                        <i class="fas fa-trash-alt"></i>
                        <span>Deletar</span>
                    </div>
                </div>
            `;

            list.appendChild(item);
        });

        container.innerHTML = '';
        container.appendChild(list);

        this.initSwapDragAndDrop();
        
        console.log('✅ Grid renderizado:', this.allTracks.length, 'itens');
    }

    // ═══════════════════════════════════════════════════════════
    // SISTEMA DE DRAG AND DROP (funciona apenas no modo reordenação)
    // ═══════════════════════════════════════════════════════════

    initSwapDragAndDrop() {
        const items = document.querySelectorAll('.music-list-item');
        
        items.forEach(item => {
            const handle = item.querySelector('.drag-handle');
            if (!handle) return;

            handle.addEventListener('mousedown', (e) => {
                if (!this.reorderMode) return; // Só funciona no modo reordenação
                e.preventDefault();
                this.startSwapDrag(item, e);
            });

            handle.addEventListener('touchstart', (e) => {
                if (!this.reorderMode) return; // Só funciona no modo reordenação
                e.preventDefault();
                this.startSwapDrag(item, e.touches[0]);
            }, { passive: false });
        });

        console.log('🎯 Drag and drop configurado');
    }

    startSwapDrag(item, event) {
        this.isDragging = true;
        this.draggedElement = item;
        this.draggedIndex = parseInt(item.dataset.index);
        this.lastSwapIndex = this.draggedIndex;

        console.log('🚀 Iniciando drag - Index:', this.draggedIndex);

        // Adicionar classe de dragging
        item.classList.add('is-dragging');

        // Armazenar posição inicial
        const rect = item.getBoundingClientRect();
        this.dragStartY = event.clientY;
        this.itemHeight = rect.height;

        const moveHandler = (e) => {
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            this.handleSwapDragMove(clientY);
        };

        const endHandler = () => {
            this.endSwapDrag();
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', endHandler);
            document.removeEventListener('touchmove', moveHandler);
            document.removeEventListener('touchend', endHandler);
        };

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', endHandler);
        document.addEventListener('touchmove', moveHandler, { passive: false });
        document.addEventListener('touchend', endHandler);
    }

    handleSwapDragMove(clientY) {
        if (!this.isDragging || !this.draggedElement) return;

        const list = document.getElementById('musicList');
        if (!list) return;

        const items = Array.from(list.querySelectorAll('.music-list-item'));
        
        // Encontrar o item sobre o qual o mouse está
        let targetItem = null;
        let targetIndex = -1;

        for (let i = 0; i < items.length; i++) {
            if (items[i] === this.draggedElement) continue;
            
            const rect = items[i].getBoundingClientRect();
            const middle = rect.top + rect.height / 2;

            if (clientY >= rect.top && clientY <= rect.bottom) {
                targetItem = items[i];
                targetIndex = parseInt(items[i].dataset.index);
                break;
            }
        }

        // Se encontrou um item válido e é diferente do último swap
        if (targetItem && targetIndex !== -1 && targetIndex !== this.lastSwapIndex) {
            console.log(`🔄 Trocando posição ${this.lastSwapIndex} ↔ ${targetIndex}`);
            
            // Trocar no array
            const temp = this.allTracks[this.lastSwapIndex];
            this.allTracks[this.lastSwapIndex] = this.allTracks[targetIndex];
            this.allTracks[targetIndex] = temp;

            // Trocar no DOM
            const currentIndex = Array.from(list.children).indexOf(this.draggedElement);
            const targetDOMIndex = Array.from(list.children).indexOf(targetItem);

            if (targetDOMIndex < currentIndex) {
                list.insertBefore(this.draggedElement, targetItem);
            } else {
                list.insertBefore(this.draggedElement, targetItem.nextSibling);
            }

            // Atualizar índices dos datasets
            this.draggedElement.dataset.index = targetIndex;
            targetItem.dataset.index = this.lastSwapIndex;

            // Atualizar lastSwapIndex
            this.lastSwapIndex = targetIndex;
        }
    }

    async endSwapDrag() {
        if (!this.isDragging || !this.draggedElement) {
            this.resetSwapDragState();
            return;
        }

        console.log('🏁 Finalizando drag - Posição final:', this.lastSwapIndex);

        this.draggedElement.classList.remove('is-dragging');

        // Verificar se houve mudança de posição
        if (this.draggedIndex !== this.lastSwapIndex) {
            console.log('📋 Posição mudou de', this.draggedIndex, 'para', this.lastSwapIndex);
            console.log('📋 Nova ordem:', this.allTracks.map(t => t.title));
            
            // ✅ NÃO FAZ SAVE AQUI - só quando clicar em "Concluir"
            console.log('ℹ️ Aguardando clicar em "Concluir" para salvar...');
        } else {
            console.log('ℹ️ Mesma posição - sem reordenação');
        }

        this.resetSwapDragState();
        
        // Reindexar todos os itens
        setTimeout(() => {
            const items = document.querySelectorAll('.music-list-item');
            items.forEach((item, idx) => {
                item.dataset.index = idx;
            });
            console.log('✅ Índices atualizados');
        }, 10);
    }

    resetSwapDragState() {
        this.isDragging = false;
        this.draggedElement = null;
        this.draggedIndex = null;
        this.lastSwapIndex = null;
        this.dragStartY = null;
        this.itemHeight = null;

        document.querySelectorAll('.music-list-item').forEach(item => {
            item.classList.remove('is-dragging');
        });
    }

    // ═══════════════════════════════════════════════════════════
    // SAVE AUTOMÁTICO - TRACKS
    // ═══════════════════════════════════════════════════════════

    async autoSave(successMessage = 'Alterações salvas') {
        // Se já está salvando, adicionar à fila
        if (this.isSaving) {
            console.log('⏳ Save em andamento, adicionando à fila...');
            
            this.saveQueue.push({
                execute: () => this._executeAutoSave(successMessage, true) // true = está na fila
            });
            
            return;
        }

        const toastId = this.showToast('Salvando...', 'loading');
        await this._executeAutoSave(successMessage, false, toastId);
        
        // Processar fila se houver itens pendentes
        if (this.saveQueue.length > 0) {
            console.log(`📋 ${this.saveQueue.length} alteração(ões) na fila, processando...`);
            
            // Atualizar toast para mostrar que está processando fila
            this.showToast('Salvando alteração(ões)...', 'loading', toastId);
            
            await this.processSaveQueue();
            
            // Toast final de sucesso
            this.showToast('Todas alterações salvas', 'success', toastId);
        }
    }

    async _executeAutoSave(successMessage = 'Alterações salvas', isFromQueue = false, toastId = null) {
        try {
            this.isSaving = true;

            console.log('💾 Iniciando save automático...');
            await this.persistTracksToPages();

            // Aguardar um pouco para garantir que Firebase processou
            await new Promise(resolve => setTimeout(resolve, 300));

            // Recarregar player
            if (typeof window.PlaylistManager !== 'undefined' && window.PlaylistManager.reload) {
                await window.PlaylistManager.reload();
                console.log('✅ PlaylistManager.reload() executado');
            }

            // 🔥 ATUALIZAR LISTA DE PLAYLISTS NO ADMIN (atualiza contador de músicas)
            if (typeof window.loadExistingPlaylists === 'function') {
                await window.loadExistingPlaylists();
                console.log('✅ Lista de playlists no admin atualizada');
            }

            // Só mostrar toast de sucesso se NÃO estiver na fila
            if (!isFromQueue && toastId) {
                this.showToast(successMessage, 'success', toastId);
            }
            
            console.log('✅ Save automático concluído');

        } catch (error) {
            console.error('❌ Erro no save automático:', error);
            if (toastId) {
                this.showToast('Erro ao salvar: ' + error.message, 'error', toastId);
            }
        } finally {
            this.isSaving = false;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // DELETE COM SAVE AUTOMÁTICO
    // ═══════════════════════════════════════════════════════════

    async deleteTrack(trackId) {
        const track = this.allTracks.find(t => t.id === trackId);
        if (!track) return;

        if (!confirm(`⚠️ Deletar "${track.title}"?`)) return;

        try {
            // Adicionar loading visual no item
            const item = document.querySelector(`[data-track-id="${trackId}"]`);
            if (item) {
                item.style.opacity = '0.5';
                item.style.pointerEvents = 'none';
            }

            console.log('🗑️ Deletando track:', track.title);
            
            this.allTracks = this.allTracks.filter(t => t.id !== trackId);
            
            // SAVE AUTOMÁTICO após delete
            await this.autoSave('Música removida');
            
            // Re-renderizar grid
            this.renderMusicGrid();

        } catch (error) {
            console.error('❌ Erro ao deletar:', error);
            this.showToast('Erro ao deletar: ' + error.message, 'error');
            
            // Reverter opacity se der erro
            if (item) {
                item.style.opacity = '1';
                item.style.pointerEvents = 'auto';
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // EDIÇÃO DE METADADOS
    // ═══════════════════════════════════════════════════════════

    editMusicMetadata(trackId) {
        const track = this.allTracks.find(t => t.id === trackId);
        if (!track) return;

        // Fechar menus imediatamente
        this.closeAllMenus();

        // Preencher dados do modal
        this.currentEditTrackId = trackId;
        document.getElementById('editMusicTitle').value = track.title || '';
        document.getElementById('editMusicArtist').value = track.artist || '';
        document.getElementById('editMusicAlbum').value = track.album || '';
        document.getElementById('musicEditCoverPreview').src = track.cover || 'images/capas-albuns/default-music.jpg';

        // Abrir modal IMEDIATAMENTE (sem setTimeout)
        const modal = document.getElementById('musicEditModal');
        modal.classList.add('active');
        
        // Focar no primeiro input após abrir (melhora UX)
        setTimeout(() => {
            document.getElementById('editMusicTitle')?.focus();
        }, 100);
    }

    async saveMusicEdit() {
        if (!this.currentEditTrackId) return;

        try {
            const title = document.getElementById('editMusicTitle').value.trim();
            if (!title) {
                this.showToast('Título é obrigatório', 'error');
                return;
            }

            const trackIndex = this.allTracks.findIndex(t => t.id === this.currentEditTrackId);
            if (trackIndex !== -1) {
                this.allTracks[trackIndex].title = title;
                this.allTracks[trackIndex].artist = document.getElementById('editMusicArtist').value.trim() || 'Artista desconhecido';
                this.allTracks[trackIndex].album = document.getElementById('editMusicAlbum').value.trim() || '';
            }

            await this.persistTracksToPages();
            this.renderMusicGrid();
            this.closeMusicEditModal();
            this.showToast('Música atualizada', 'success');

        } catch (error) {
            console.error('❌ Erro:', error);
            this.showToast('Erro ao salvar: ' + error.message, 'error');
        }
    }

    closeMusicEditModal() {
        document.getElementById('musicEditModal').classList.remove('active');
        this.currentEditTrackId = null;
    }

    // ═══════════════════════════════════════════════════════════
    // OTIMIZADOR DE IMAGENS
    // ═══════════════════════════════════════════════════════════

    async optimizeImage(file, maxWidth = 800, maxHeight = 800, quality = 0.85) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    // Calcular novas dimensões mantendo proporção
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }
                    
                    // Criar canvas para redimensionar
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    
                    // Melhorar qualidade do redimensionamento
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // Desenhar imagem redimensionada
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Converter para data URL (JPEG com compressão)
                    const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    
                    // Calcular redução de tamanho
                    const originalSize = file.size;
                    const optimizedSize = Math.round((optimizedDataUrl.length * 3) / 4); // Aproximação do tamanho base64
                    const reduction = Math.round((1 - optimizedSize / originalSize) * 100);
                    
                    console.log('📊 Otimização de imagem:');
                    console.log(`   Original: ${(originalSize / 1024).toFixed(2)} KB`);
                    console.log(`   Otimizada: ${(optimizedSize / 1024).toFixed(2)} KB`);
                    console.log(`   Redução: ${reduction}%`);
                    console.log(`   Dimensões: ${width}x${height}`);
                    
                    resolve({
                        dataUrl: optimizedDataUrl,
                        originalSize,
                        optimizedSize,
                        reduction,
                        width,
                        height
                    });
                };
                
                img.onerror = () => reject(new Error('Erro ao carregar imagem'));
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsDataURL(file);
        });
    }

    async handleCoverUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToast('Arquivo inválido', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showToast('Imagem muito grande (máx. 5MB)', 'error');
            return;
        }

        try {
            // Otimizar imagem silenciosamente (sem toast)
            const optimized = await this.optimizeImage(file, 800, 800, 0.85);
            
            // Atualizar preview
            document.getElementById('playlistCoverPreview').src = optimized.dataUrl;
            this.newCoverData = optimized.dataUrl;
            
            // SAVE AUTOMÁTICO após upload da capa
            await this.savePlaylistInfo('Capa atualizada');
            
        } catch (error) {
            console.error('❌ Erro:', error);
            this.showToast('Erro ao processar imagem', 'error');
        }
    }

    closeModal() {
        document.getElementById('playlistEditModal').classList.remove('active');
        document.body.style.overflow = '';
        this.currentPlaylistId = null;
        this.currentPlaylistData = null;
        this.selectedTracks.clear();
        this.allTracks = [];
        this.newCoverData = null;
        this.reorderMode = false;
        this.closeAllMenus();
    }
}

window.playlistEditManager = new PlaylistEditManager();
