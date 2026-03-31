// Timeline logic extracted from admin.js, firebase-config.js and script.js
// Este arquivo agrupa o comportamento da timeline para o site e o painel admin.

console.log('🔧 timeline.js carregado');

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
            if (message) {
                showSecretMessage(message);
            }
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

        const fragment = document.createDocumentFragment();
        snapshot.forEach((doc, index) => {
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
                if (message) {
                    showSecretMessage(message);
                }
            });
        });

        console.log(`✅ Timeline reconstruída com ${snapshot.size} eventos`);
    } catch (error) {
        console.error('❌ Erro ao reconstruir timeline:', error);
    }
}

window.rebuildTimeline = rebuildTimeline;

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
        if (typeof optimizeExistingUrl === 'function') {
            img.src = optimizeExistingUrl(event.photo, 1600);
        } else {
            img.src = event.photo;
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

function initTimelineForms() {
    const addTimelineForm = document.getElementById('addTimelineForm');
    if (!addTimelineForm) return;

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
            btn.innerHTML = '<i class="fas fa-compress fa-spin"></i> Preparando foto...';

            let processedPhoto = photoFile;
            try {
                processedPhoto = await compressImageIfNeeded(photoFile, 10);
                console.log(`📦 Foto comprimida: ${(photoFile.size / 1024 / 1024).toFixed(2)}MB → ${(processedPhoto.size / 1024 / 1024).toFixed(2)}MB`);
            } catch (compressError) {
                console.warn('⚠️ Erro ao comprimir, usando original:', compressError);
                processedPhoto = photoFile;
            }

            if (processedPhoto.size > 32 * 1024 * 1024) {
                alert('❌ A foto ainda está muito grande após compressão! Tente uma foto menor.');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }

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

async function loadExistingEvents() {
    const container = document.getElementById('existingEvents');
    if (!container) return;

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
