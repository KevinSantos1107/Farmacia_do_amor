// Timeline logic extracted from admin.js, firebase-config.js and script.js
// Este arquivo agrupa o comportamento da timeline para o site e o painel admin.

console.log('🔧 timeline.js carregado');

// ═══════════════════════════════════════════════════════════════
// ESTADO GLOBAL (frontend)
// ═══════════════════════════════════════════════════════════════

const timelineState = {
    eventsClickAttached: false
};

// ═══════════════════════════════════════════════════════════════
// FRONTEND — MODAL DA TIMELINE (site principal)
// ═══════════════════════════════════════════════════════════════

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

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            console.log('📖 Timeline fechada');
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal && closeBtn) {
            closeBtn.click();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (secretModal && secretModal.style.display === 'flex') {
                closeSecretBtn?.click();
            } else if (modal.style.display === 'block') {
                closeBtn?.click();
            }
        }
    });

    secretMessageBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const message = btn.getAttribute('data-message');
            if (message) showSecretMessage(message);
        });
    });

    if (closeSecretBtn) {
        closeSecretBtn.addEventListener('click', () => {
            secretModal.style.display = 'none';
        });
    }

    if (secretModal) {
        secretModal.addEventListener('click', (e) => {
            if (e.target === secretModal && closeSecretBtn) {
                closeSecretBtn.click();
            }
        });
    }

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
        const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        timelineContainer.style.setProperty('--progress-height', `${scrollPercent}%`);
    });
}

// ═══════════════════════════════════════════════════════════════
// FRONTEND — RECONSTRUÇÃO DA TIMELINE
// ═══════════════════════════════════════════════════════════════

async function rebuildTimeline() {
    const container = document.querySelector('.timeline-container');
    if (!container) {
        console.warn('⚠️ Container da timeline não encontrado');
        return;
    }

    try {
        const snapshot = await db.collection('timeline').orderBy('createdAt', 'asc').limit(50).get();
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

        const assignedOrders = await normalizeTimelineOrderOnLoad(snapshot.docs);
        const docs = sortTimelineDocs(snapshot.docs, assignedOrders);
        const fragment = document.createDocumentFragment();

        docs.forEach((doc, index) => {
            const event = doc.data();
            const item = createTimelineItem(event, doc.id, index);
            fragment.appendChild(item);
        });

        container.insertBefore(fragment, timelineEnd);
        applyTimelineIntercalation();

        const secretBtns = document.querySelectorAll('.secret-message-btn');
        secretBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const message = btn.getAttribute('data-message');
                if (message) showSecretMessage(message);
            });
        });

        console.log(`✅ Timeline reconstruída com ${docs.length} eventos`);
    } catch (error) {
        console.error('❌ Erro ao reconstruir timeline:', error);
    }
}

window.rebuildTimeline = rebuildTimeline;

// ═══════════════════════════════════════════════════════════════
// FRONTEND — UTILITÁRIOS DE ORDENAÇÃO
// ═══════════════════════════════════════════════════════════════

function getCreatedAt(doc) {
    const ts = doc.data().createdAt;
    if (!ts) return 0;
    return typeof ts.toMillis === 'function' ? ts.toMillis() : Number(ts) || 0;
}

function sortTimelineDocs(docs, assignedOrders = {}) {
    return docs.slice().sort((a, b) => {
        const aData = a.data();
        const bData = b.data();
        const aOrder = aData.orderIndex != null ? aData.orderIndex : assignedOrders[a.id];
        const bOrder = bData.orderIndex != null ? bData.orderIndex : assignedOrders[b.id];

        if (aOrder != null && bOrder != null) return aOrder - bOrder;
        if (aOrder != null) return -1;
        if (bOrder != null) return 1;
        return getCreatedAt(a) - getCreatedAt(b);
    });
}

async function normalizeTimelineOrderOnLoad(docs) {
    const missingDocs = docs.filter(doc => doc.data().orderIndex == null);
    if (missingDocs.length === 0) return {};

    let maxOrder = docs.reduce((max, doc) => {
        const order = doc.data().orderIndex;
        return order != null ? Math.max(max, order) : max;
    }, -1);

    const assignedOrders = {};
    const missingSorted = missingDocs.slice().sort((a, b) => getCreatedAt(a) - getCreatedAt(b));

    const updatePromises = missingSorted.map(doc => {
        maxOrder += 1;
        assignedOrders[doc.id] = maxOrder;
        return db.collection('timeline').doc(doc.id).update({
            orderIndex: maxOrder
        }).catch(error => {
            console.warn(`⚠️ Não foi possível normalizar orderIndex para ${doc.id}:`, error);
        });
    });

    await Promise.all(updatePromises);
    return assignedOrders;
}

// ═══════════════════════════════════════════════════════════════
// FRONTEND — CRIAÇÃO DE ITENS DA TIMELINE
// ═══════════════════════════════════════════════════════════════

function createTimelineItem(event, id, index) {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.setAttribute('data-id', id);
    item.setAttribute('data-index', index);
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
    } else if (event.photo) {
        img.src = typeof optimizeExistingUrl === 'function'
            ? optimizeExistingUrl(event.photo, 1600)
            : event.photo;
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

    return item;
}

window.createTimelineItem = createTimelineItem;

function applyTimelineIntercalation() {
    const items = document.querySelectorAll('.timeline-item[data-id]');
    if (items.length === 0) return;

    items.forEach(item => item.classList.remove('left', 'right'));
    items.forEach((item, index) => {
        const side = index % 2 === 0 ? 'left' : 'right';
        item.classList.add(side);
        updateFirebaseSide(item.getAttribute('data-id'), side);
    });

    console.log(`✅ Timeline intercalada: ${items.length} eventos`);
}

window.applyTimelineIntercalation = applyTimelineIntercalation;

async function updateFirebaseSide(eventId, side) {
    try {
        await db.collection('timeline').doc(eventId).update({
            side: side,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.warn(`⚠️ Não foi possível atualizar lado do evento ${eventId}:`, error);
    }
}

window.updateFirebaseSide = updateFirebaseSide;

// ═══════════════════════════════════════════════════════════════
// ADMIN — FORMULÁRIO DE CRIAÇÃO DE EVENTOS
// ═══════════════════════════════════════════════════════════════

function initTimelineForms() {
    const addTimelineForm = document.getElementById('addTimelineForm');
    if (!addTimelineForm) return;

    // 🆕 Inicializar o manager de admin da timeline
    timelineAdminManager.setup();

    addTimelineForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const eventDate = document.getElementById('eventDate').value;
        const eventTitle = document.getElementById('eventTitle').value;
        const eventSecret = document.getElementById('eventSecret').value;
        const photoFile = document.getElementById('eventPhoto').files[0];
        const photoCaption = document.getElementById('photoCaption').value;

        if (!photoFile) {
            timelineAdminManager.showToast('Selecione uma foto para o evento', 'error');
            return;
        }

        if (photoFile.size > 32 * 1024 * 1024) {
            timelineAdminManager.showToast('Imagem muito grande! Limite de 32MB.', 'error');
            return;
        }

        const toastId = timelineAdminManager.showToast('Preparando foto...', 'loading');

        try {
            const btn = addTimelineForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.disabled = true;

            let processedPhoto = photoFile;
            try {
                processedPhoto = await compressImageIfNeeded(photoFile, 10);
            } catch (compressError) {
                console.warn('⚠️ Erro ao comprimir, usando original:', compressError);
            }

            if (processedPhoto.size > 32 * 1024 * 1024) {
                timelineAdminManager.showToast('Foto ainda muito grande após compressão!', 'error', toastId);
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }

            timelineAdminManager.showToast('Enviando imagem...', 'loading', toastId);
            const photoUrls = await uploadImageToCloudinary(processedPhoto, 1600, true);

            timelineAdminManager.showToast('Calculando posição...', 'loading', toastId);
            let eventSide = 'left';
            let orderIndex = 0;
            try {
                const allEvents = await db.collection('timeline').orderBy('createdAt', 'asc').get();
                const totalEvents = allEvents.size;
                eventSide = totalEvents % 2 === 0 ? 'left' : 'right';
                orderIndex = totalEvents;
            } catch (error) {
                console.log('Primeiro evento - usando lado esquerdo');
            }

            timelineAdminManager.showToast('Salvando no Firebase...', 'loading', toastId);
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
                orderIndex: orderIndex,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            timelineAdminManager.showToast(`Evento "${eventTitle}" adicionado!`, 'success', toastId);
            addTimelineForm.reset();
            btn.innerHTML = originalText;
            btn.disabled = false;

            if (typeof loadExistingContent === 'function') loadExistingContent();
            await timelineAdminManager.loadEvents();
            await window.rebuildTimeline();

        } catch (error) {
            console.error('❌ Erro ao criar evento:', error);
            timelineAdminManager.showToast('Erro ao criar evento: ' + error.message, 'error', toastId);
            const btn = addTimelineForm.querySelector('button[type="submit"]');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-save"></i> Adicionar Evento';
                btn.disabled = false;
            }
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// ADMIN — TIMELINE ADMIN MANAGER
// ═══════════════════════════════════════════════════════════════

class TimelineAdminManager {
    constructor() {
        this.reorderMode = false;
        this.currentEditId = null;
        this.timelineDocs = [];
        this.isSaving = false;
        this.currentOpenMenuId = null;
        this.initialReorderState = null;
        this._clickOutsideHandler = null;

        // Drag and drop
        this.isDragging = false;
        this.draggedElement = null;
        this.draggedIndex = null;
        this.lastSwapIndex = null;
    }

    // ─────────────────────────────────────────
    // TOAST NOTIFICATIONS
    // ─────────────────────────────────────────

    createToastContainer() {
        if (document.getElementById('tlToastContainer')) return;

        const container = document.createElement('div');
        container.id = 'tlToastContainer';
        container.className = 'tl-toast-container';
        document.body.appendChild(container);
    }

    showToast(message, type = 'success', toastId = null) {
        const container = document.getElementById('tlToastContainer');
        if (!container) return null;

        const icon = type === 'success' ? 'fa-check-circle' :
                     type === 'error'   ? 'fa-exclamation-circle' :
                     type === 'loading' ? 'fa-spinner fa-spin' : 'fa-info-circle';

        // Atualizar toast existente
        if (toastId) {
            const existing = document.getElementById(toastId);
            if (existing) {
                existing.className = `tl-toast tl-toast-${type} show`;
                existing.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;

                if (existing._removeTimeout) {
                    clearTimeout(existing._removeTimeout);
                    existing._removeTimeout = null;
                }
                if (type !== 'loading') {
                    existing._removeTimeout = setTimeout(() => {
                        existing.classList.remove('show');
                        setTimeout(() => existing.remove(), 300);
                    }, 3000);
                }
                return toastId;
            }
        }

        // Criar novo toast
        const newId = toastId || `tl-toast-${Date.now()}`;
        const toast = document.createElement('div');
        toast.id = newId;
        toast.className = `tl-toast tl-toast-${type}`;
        toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);

        if (type !== 'loading') {
            toast._removeTimeout = setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        return newId;
    }

    // ─────────────────────────────────────────
    // MODAL DE EDIÇÃO
    // ─────────────────────────────────────────

    createEditModal() {
        if (document.getElementById('timelineEditModal')) return;

        const modal = document.createElement('div');
        modal.id = 'timelineEditModal';
        modal.className = 'tl-edit-modal';
        modal.innerHTML = `
            <div class="tl-edit-container">
                <div class="tl-edit-header">
                    <h2 class="tl-edit-title">
                        <i class="fas fa-clock-rotate-left"></i>
                        <span>Editar Evento</span>
                    </h2>
                    <button class="tl-edit-close" onclick="timelineAdminManager.closeEditModal()">&times;</button>
                </div>

                <div class="tl-edit-body">
                    <div class="tl-field-group">
                        <label for="editEventDate">
                            <i class="fas fa-calendar-alt"></i>
                            Data do Evento
                        </label>
                        <input type="text" id="editEventDate" placeholder="Ex: Setembro 2022" required>
                    </div>

                    <div class="tl-field-group">
                        <label for="editEventTitle">
                            <i class="fas fa-heading"></i>
                            Título do Evento
                        </label>
                        <input type="text" id="editEventTitle" placeholder="Título do evento" required>
                    </div>

                    <div class="tl-field-group">
                        <label for="editEventSecret">
                            <i class="fas fa-lock"></i>
                            Mensagem Secreta
                        </label>
                        <textarea id="editEventSecret" rows="3" placeholder="Mensagem secreta (opcional)"></textarea>
                    </div>

                    <div class="tl-field-group">
                        <label for="editPhotoCaption">
                            <i class="fas fa-tag"></i>
                            Legenda da Foto
                        </label>
                        <input type="text" id="editPhotoCaption" placeholder="Legenda da foto (opcional)">
                    </div>

                    <p class="tl-edit-hint">
                        <i class="fas fa-info-circle"></i>
                        A foto não pode ser alterada. Para trocar, remova e recrie o evento.
                    </p>
                </div>

                <div class="tl-edit-footer">
                    <button class="tl-modal-btn secondary" onclick="timelineAdminManager.closeEditModal()">
                        <i class="fas fa-times"></i>
                        Cancelar
                    </button>
                    <button class="tl-modal-btn primary" onclick="timelineAdminManager.saveEdit()">
                        <i class="fas fa-save"></i>
                        Salvar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeEditModal();
        });

        console.log('✅ Modal de edição da timeline criado');
    }

    async openEditModal(eventId) {
        const modal = document.getElementById('timelineEditModal');
        if (!modal) return;

        let docData = null;
        const cached = this.timelineDocs.find(d => d.id === eventId);
        if (cached) {
            docData = cached.data();
        } else {
            try {
                const snap = await db.collection('timeline').doc(eventId).get();
                if (!snap.exists) {
                    this.showToast('Evento não encontrado', 'error');
                    return;
                }
                docData = snap.data();
            } catch (error) {
                this.showToast('Erro ao carregar evento', 'error');
                return;
            }
        }

        this.currentEditId = eventId;
        document.getElementById('editEventDate').value = docData.date || '';
        document.getElementById('editEventTitle').value = docData.title || '';
        document.getElementById('editEventSecret').value = docData.secret || '';
        document.getElementById('editPhotoCaption').value = docData.caption || '';

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        setTimeout(() => document.getElementById('editEventTitle')?.focus(), 100);
    }

    closeEditModal() {
        const modal = document.getElementById('timelineEditModal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
        this.currentEditId = null;
    }

    async saveEdit() {
        if (!this.currentEditId) return;

        const eventDate = document.getElementById('editEventDate').value.trim();
        const eventTitle = document.getElementById('editEventTitle').value.trim();
        const eventSecret = document.getElementById('editEventSecret').value.trim();
        const photoCaption = document.getElementById('editPhotoCaption').value.trim();

        if (!eventDate || !eventTitle) {
            this.showToast('Preencha data e título', 'error');
            return;
        }

        const toastId = this.showToast('Salvando...', 'loading');

        try {
            this.isSaving = true;

            await db.collection('timeline').doc(this.currentEditId).update({
                date: eventDate,
                title: eventTitle,
                secret: eventSecret || null,
                caption: photoCaption || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.closeEditModal();
            this.showToast('Evento atualizado', 'success', toastId);

            await this.loadEvents();
            await window.rebuildTimeline();

        } catch (error) {
            console.error('❌ Erro ao salvar edição:', error);
            this.showToast('Erro ao salvar: ' + error.message, 'error', toastId);
        } finally {
            this.isSaving = false;
        }
    }

    // ─────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────

    async deleteEvent(eventId) {
        const doc = this.timelineDocs.find(d => d.id === eventId);
        const title = doc ? doc.data().title : 'este evento';

        if (!confirm(`⚠️ Deletar "${title}"?`)) return;

        const toastId = this.showToast('Deletando...', 'loading');

        try {
            const item = document.querySelector(`[data-event-id="${eventId}"]`);
            if (item) {
                item.style.opacity = '0.5';
                item.style.pointerEvents = 'none';
            }

            await db.collection('timeline').doc(eventId).delete();

            this.showToast('Evento removido', 'success', toastId);
            await this.loadEvents();
            await window.rebuildTimeline();

        } catch (error) {
            console.error('❌ Erro ao deletar:', error);
            this.showToast('Erro ao deletar: ' + error.message, 'error', toastId);
        }
    }

    // ─────────────────────────────────────────
    // MENU DE 3 PONTOS
    // ─────────────────────────────────────────

    toggleMenu(eventId, event) {
        event.stopPropagation();

        if (this.currentOpenMenuId === eventId) {
            this.closeAllMenus();
            return;
        }

        this.closeAllMenus();

        const menu = document.getElementById(`tl-menu-${eventId}`);
        const button = event.currentTarget;

        if (menu && button) {
            menu.classList.add('active');
            this.currentOpenMenuId = eventId;
            this.positionMenu(menu, button);
        }
    }

    positionMenu(menu, button) {
        const buttonRect = button.getBoundingClientRect();
        const menuHeight = menu.offsetHeight || 150;
        const viewportHeight = window.innerHeight;

        const container = document.querySelector('.admin-modal-content');
        const containerRect = container ? container.getBoundingClientRect() : null;

        let spaceBelow = viewportHeight - buttonRect.bottom;

        if (containerRect && containerRect.bottom < viewportHeight) {
            spaceBelow = containerRect.bottom - buttonRect.bottom;
        }

        menu.classList.remove('tl-menu-up', 'tl-menu-down');

        if (spaceBelow < (menuHeight + 20) && buttonRect.top > spaceBelow) {
            menu.classList.add('tl-menu-up');
        } else {
            menu.classList.add('tl-menu-down');
        }
    }

    closeAllMenus() {
        document.querySelectorAll('.tl-dropdown-menu').forEach(m => m.classList.remove('active'));
        this.currentOpenMenuId = null;
    }

    // ─────────────────────────────────────────
    // MODO REORDENAÇÃO
    // ─────────────────────────────────────────

    async toggleReorderMode() {
        this.reorderMode = !this.reorderMode;

        const list = document.getElementById('tlEventList');
        const controls = document.getElementById('tlReorderControls');

        if (this.reorderMode) {
            console.log('🔄 Modo reordenação ATIVADO');
            list?.classList.add('reorder-mode');
            controls?.classList.add('active');
            this.closeAllMenus();
            this.initialReorderState = this.timelineDocs.map(d => d.id);
        } else {
            console.log('✅ Modo reordenação DESATIVADO');
            list?.classList.remove('reorder-mode');
            controls?.classList.remove('active');

            const currentOrder = this.timelineDocs.map(d => d.id);
            const hasChanges = JSON.stringify(this.initialReorderState) !== JSON.stringify(currentOrder);

            if (hasChanges) {
                console.log('🔄 Ordem alterada, salvando...');
                await this.saveOrder();
            } else {
                console.log('ℹ️ Nenhuma mudança na ordem');
            }

            this.initialReorderState = null;
        }
    }

    async saveOrder() {
        const toastId = this.showToast('Salvando ordem...', 'loading');

        try {
            const promises = this.timelineDocs.map((doc, index) =>
                db.collection('timeline').doc(doc.id).update({
                    orderIndex: index,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                })
            );

            await Promise.all(promises);

            this.showToast('Ordem salva', 'success', toastId);
            await window.rebuildTimeline();

        } catch (error) {
            console.error('❌ Erro ao salvar ordem:', error);
            this.showToast('Erro ao salvar ordem: ' + error.message, 'error', toastId);
        }
    }

    // ─────────────────────────────────────────
    // RENDERIZAÇÃO DA LISTA
    // ─────────────────────────────────────────

    renderEventList(docs) {
        const container = document.getElementById('existingEvents');
        if (!container) return;

        container.innerHTML = '';

        if (!docs.length) {
            container.innerHTML = `
                <div class="tl-empty-state">
                    <div class="tl-empty-icon"><i class="fas fa-clock"></i></div>
                    <div class="tl-empty-text">Nenhum evento criado ainda</div>
                </div>
            `;
            return;
        }

        // Wrapper com barra de reordenação
        const wrapper = document.createElement('div');
        wrapper.className = 'tl-list-wrapper';

        const reorderBar = document.createElement('div');
        reorderBar.className = 'tl-reorder-controls';
        reorderBar.id = 'tlReorderControls';
        if (this.reorderMode) reorderBar.classList.add('active');
        reorderBar.innerHTML = `
            <div class="tl-reorder-text">
                <i class="fas fa-arrows-alt"></i>
                <span>Modo Reordenação Ativo</span>
            </div>
            <button class="tl-finish-reorder-btn" onclick="timelineAdminManager.toggleReorderMode()">
                <i class="fas fa-check"></i>
                Concluir
            </button>
        `;

        // Lista de eventos
        const list = document.createElement('div');
        list.className = 'tl-event-list';
        list.id = 'tlEventList';
        if (this.reorderMode) list.classList.add('reorder-mode');

        docs.forEach((doc, index) => {
            const event = doc.data();
            const item = document.createElement('div');
            item.className = 'tl-event-item';
            item.dataset.eventId = doc.id;
            item.dataset.index = index;

            const photoSrc = event.photoThumb || event.photo || 'images/capas-albuns/default-music.jpg';

            item.innerHTML = `
                <!-- DRAG HANDLE (só aparece no modo reordenação) -->
                <div class="tl-drag-handle">
                    <div class="tl-bars"><span></span><span></span><span></span></div>
                </div>

                <!-- FOTO DO EVENTO -->
                <div class="tl-event-photo">
                    <img src="${photoSrc}" alt="${event.title}" loading="lazy">
                </div>

                <!-- INFORMAÇÕES -->
                <div class="tl-event-info">
                    <div class="tl-event-title">${event.title || 'Sem título'}</div>
                    <div class="tl-event-meta">
                        <i class="far fa-calendar"></i>
                        ${event.date || ''}
                        ${event.secret ? ' &nbsp;·&nbsp; <i class="fas fa-lock" style="font-size:0.75rem;"></i>' : ''}
                    </div>
                </div>

                <!-- BOTÃO MENU (3 pontos) -->
                <button class="tl-menu-btn" onclick="timelineAdminManager.toggleMenu('${doc.id}', event)">
                    <i class="fas fa-ellipsis-v"></i>
                </button>

                <!-- DROPDOWN MENU -->
                <div class="tl-dropdown-menu" id="tl-menu-${doc.id}">
                    <div class="tl-menu-item tl-item-reorder" onclick="timelineAdminManager.toggleReorderMode(); timelineAdminManager.closeAllMenus();">
                        <i class="fas fa-arrows-alt"></i>
                        <span>Reordenar</span>
                    </div>
                    <div class="tl-menu-item tl-item-edit" onclick="timelineAdminManager.openEditModal('${doc.id}'); timelineAdminManager.closeAllMenus();">
                        <i class="fas fa-edit"></i>
                        <span>Editar</span>
                    </div>
                    <div class="tl-menu-item tl-item-delete" onclick="timelineAdminManager.deleteEvent('${doc.id}'); timelineAdminManager.closeAllMenus();">
                        <i class="fas fa-trash-alt"></i>
                        <span>Deletar</span>
                    </div>
                </div>
            `;

            list.appendChild(item);
        });

        wrapper.appendChild(reorderBar);
        wrapper.appendChild(list);
        container.appendChild(wrapper);

        this.initDragAndDrop();
        this.setupClickOutside();

        console.log(`✅ Lista de eventos renderizada: ${docs.length} eventos`);
    }

    // ─────────────────────────────────────────
    // DRAG AND DROP
    // ─────────────────────────────────────────

    initDragAndDrop() {
        const items = document.querySelectorAll('.tl-event-item');

        items.forEach(item => {
            const handle = item.querySelector('.tl-drag-handle');
            if (!handle) return;

            handle.addEventListener('mousedown', (e) => {
                if (!this.reorderMode) return;
                e.preventDefault();
                this.startDrag(item, e);
            });

            handle.addEventListener('touchstart', (e) => {
                if (!this.reorderMode) return;
                e.preventDefault();
                this.startDrag(item, e.touches[0]);
            }, { passive: false });
        });

        console.log('🎯 Drag and drop configurado para timeline');
    }

    startDrag(item, event) {
        this.isDragging = true;
        this.draggedElement = item;
        this.draggedIndex = parseInt(item.dataset.index);
        this.lastSwapIndex = this.draggedIndex;

        item.classList.add('tl-is-dragging');

        const moveHandler = (e) => {
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            this.handleDragMove(clientY);
        };

        const endHandler = () => {
            this.endDrag();
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

    handleDragMove(clientY) {
        if (!this.isDragging || !this.draggedElement) return;

        const list = document.getElementById('tlEventList');
        if (!list) return;

        const items = Array.from(list.querySelectorAll('.tl-event-item'));

        for (let i = 0; i < items.length; i++) {
            if (items[i] === this.draggedElement) continue;

            const rect = items[i].getBoundingClientRect();

            if (clientY >= rect.top && clientY <= rect.bottom) {
                const targetIndex = parseInt(items[i].dataset.index);

                if (targetIndex !== this.lastSwapIndex) {
                    // Trocar no array
                    const temp = this.timelineDocs[this.lastSwapIndex];
                    this.timelineDocs[this.lastSwapIndex] = this.timelineDocs[targetIndex];
                    this.timelineDocs[targetIndex] = temp;

                    // Trocar no DOM
                    const currentDOMIndex = Array.from(list.children).indexOf(this.draggedElement);
                    const targetDOMIndex = Array.from(list.children).indexOf(items[i]);

                    if (targetDOMIndex < currentDOMIndex) {
                        list.insertBefore(this.draggedElement, items[i]);
                    } else {
                        list.insertBefore(this.draggedElement, items[i].nextSibling);
                    }

                    this.draggedElement.dataset.index = targetIndex;
                    items[i].dataset.index = this.lastSwapIndex;
                    this.lastSwapIndex = targetIndex;

                    console.log(`🔄 Trocando posição ${this.lastSwapIndex} ↔ ${targetIndex}`);
                }
                break;
            }
        }
    }

    endDrag() {
        if (this.draggedElement) {
            this.draggedElement.classList.remove('tl-is-dragging');
        }

        this.isDragging = false;
        this.draggedElement = null;
        this.draggedIndex = null;

        setTimeout(() => {
            document.querySelectorAll('.tl-event-item').forEach((item, idx) => {
                item.dataset.index = idx;
            });
            console.log('✅ Índices atualizados');
        }, 10);
    }

    // ─────────────────────────────────────────
    // CLICK OUTSIDE — FECHAR MENUS
    // ─────────────────────────────────────────

    setupClickOutside() {
        if (this._clickOutsideHandler) {
            document.removeEventListener('click', this._clickOutsideHandler);
        }

        this._clickOutsideHandler = (e) => {
            if (!this.currentOpenMenuId) return;
            const clickedMenu = e.target.closest('.tl-dropdown-menu');
            const clickedBtn = e.target.closest('.tl-menu-btn');
            if (!clickedMenu && !clickedBtn) this.closeAllMenus();
        };

        document.addEventListener('click', this._clickOutsideHandler);
    }

    // ─────────────────────────────────────────
    // CARREGAR EVENTOS DO FIREBASE
    // ─────────────────────────────────────────

    async loadEvents() {
        const container = document.getElementById('existingEvents');
        if (!container) return;

        container.innerHTML = `
            <div class="tl-empty-state">
                <div class="tl-empty-icon"><i class="fas fa-spinner fa-spin"></i></div>
                <div class="tl-empty-text">Carregando eventos...</div>
            </div>
        `;

        try {
            const snapshot = await db.collection('timeline').orderBy('createdAt', 'asc').limit(50).get();

            if (snapshot.empty) {
                this.timelineDocs = [];
                this.renderEventList([]);
                return;
            }

            const assignedOrders = await normalizeTimelineOrderOnLoad(snapshot.docs);
            const docs = sortTimelineDocs(snapshot.docs, assignedOrders);
            this.timelineDocs = docs;
            this.renderEventList(docs);

        } catch (error) {
            console.error('❌ Erro ao carregar eventos:', error);
            container.innerHTML = `
                <div class="tl-empty-state">
                    <div class="tl-empty-icon" style="color: #ff6b6b;"><i class="fas fa-exclamation-circle"></i></div>
                    <div class="tl-empty-text" style="color: #ff6b6b;">Erro ao carregar eventos</div>
                </div>
            `;
        }
    }

    // ─────────────────────────────────────────
    // INICIALIZAÇÃO
    // ─────────────────────────────────────────

    setup() {
        this.createToastContainer();
        this.createEditModal();

        // Remover toolbar antiga se ainda existir
        document.getElementById('timelineAdminToolbar')?.remove();
        document.getElementById('timelineReorderNote')?.remove();

        this.loadEvents();

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.reorderMode) this.toggleReorderMode();
                this.closeEditModal();
                this.closeAllMenus();
            }
        });

        console.log('✅ TimelineAdminManager inicializado');
    }
}

// ─────────────────────────────────────────
// INSTÂNCIA GLOBAL
// ─────────────────────────────────────────

window.timelineAdminManager = new TimelineAdminManager();

// Compatibilidade com chamadas globais existentes
window.loadExistingEvents = () => timelineAdminManager.loadEvents();
window.deleteEvent = (id) => timelineAdminManager.deleteEvent(id);