// ==========================================
// API SEARCH & IMPORT SYSTEM (YOUTUBE)
// ==========================================

const API_BACKEND_URL = 'https://backend-musica-864u.onrender.com/api';

// Injetar CSS de animação para o botão de download
const apiStyle = document.createElement('style');
apiStyle.textContent = `
@keyframes dl-pulse {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7); }
    50% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(231, 76, 60, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
}
.dl-animating {
    animation: dl-pulse 1.5s infinite;
    background: #f39c12 !important; /* Laranja para indicar carregamento */
}
`;
document.head.appendChild(apiStyle);

document.addEventListener('DOMContentLoaded', () => {
    initApiSearchSystem();
});

function initApiSearchSystem() {
    const tabLocalUpload = document.getElementById('tabLocalUpload');
    const tabApiSearch   = document.getElementById('tabApiSearch');

    const localUploadGroup   = document.getElementById('localUploadGroup');
    const apiSearchContainer = document.getElementById('apiSearchContainer');

    const apiSearchInput   = document.getElementById('apiSearchInput');
    const apiSearchBtn     = document.getElementById('apiSearchBtn');
    const apiSearchResults = document.getElementById('apiSearchResults');

    const addMusicForm   = document.getElementById('addMusicForm');
    const selectPlaylist = document.getElementById('selectPlaylistForMusic');

    if (!tabLocalUpload || !tabApiSearch) return;

    // --------------------------------------------------
    // TAB SWITCHING
    // --------------------------------------------------
    tabLocalUpload.addEventListener('click', () => {
        tabLocalUpload.style.borderBottomColor = '#2ecc71';
        tabLocalUpload.style.color = 'white';
        tabApiSearch.style.borderBottomColor = 'transparent';
        tabApiSearch.style.color = 'rgba(255,255,255,0.5)';

        localUploadGroup.style.display = 'block';
        apiSearchContainer.style.display = 'none';

        if (selectPlaylist && selectPlaylist.value && addMusicForm) {
            addMusicForm.style.display = 'block';
        }
    });

    tabApiSearch.addEventListener('click', () => {
        tabApiSearch.style.borderBottomColor = '#e74c3c';
        tabApiSearch.style.color = 'white';
        tabLocalUpload.style.borderBottomColor = 'transparent';
        tabLocalUpload.style.color = 'rgba(255,255,255,0.5)';

        localUploadGroup.style.display = 'none';
        apiSearchContainer.style.display = 'block';

        // Esconde o form de upload local — não é necessário na aba YouTube
        if (addMusicForm) addMusicForm.style.display = 'none';
    });

    // --------------------------------------------------
    // SEARCH
    // --------------------------------------------------
    apiSearchBtn.addEventListener('click', performSearch);
    apiSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); performSearch(); }
    });

    async function performSearch() {
        const query = apiSearchInput.value.trim();
        if (!query) return;

        apiSearchBtn.innerHTML  = '<i class="fas fa-spinner fa-spin"></i>';
        apiSearchBtn.disabled   = true;
        apiSearchResults.innerHTML = '<div style="text-align:center;padding:20px;color:var(--theme-text-secondary)">Buscando no YouTube… <i class="fas fa-spinner fa-spin"></i></div>';

        try {
            const res  = await fetch(`${API_BACKEND_URL}/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();

            if (data.results && data.results.length > 0) {
                renderResults(data.results);
            } else {
                apiSearchResults.innerHTML = '<div style="text-align:center;color:#e74c3c;padding:20px">Nenhum resultado encontrado.</div>';
            }
        } catch (err) {
            console.error('Erro na busca API:', err);
            apiSearchResults.innerHTML = '<div style="text-align:center;color:#e74c3c;padding:20px">Erro ao conectar com o servidor. Verifique se o Backend está rodando.</div>';
        } finally {
            apiSearchBtn.innerHTML = '<i class="fas fa-search"></i>';
            apiSearchBtn.disabled  = false;
        }
    }

    // --------------------------------------------------
    // RENDER RESULTS
    // --------------------------------------------------
    function renderResults(results) {
        apiSearchResults.innerHTML = '';

        results.forEach(track => {
            const item = document.createElement('div');
            item.style.cssText = `
                display:flex; align-items:center; gap:15px; padding:10px;
                background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
                border-radius:12px; cursor:pointer; transition:0.2s;
            `;
            item.onmouseover = () => item.style.background = 'rgba(255,255,255,0.1)';
            item.onmouseout  = () => item.style.background = 'rgba(255,255,255,0.05)';

            item.innerHTML = `
                <img src="${track.coverUrl}" alt="Cover"
                     style="width:60px;height:60px;object-fit:cover;border-radius:8px;flex-shrink:0">
                <div style="flex:1;min-width:0">
                    <div style="font-weight:bold;font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${track.title}</div>
                    <div style="color:var(--theme-text-secondary);font-size:.8rem">${track.artist} • ${track.duration}</div>
                </div>
                <button class="dl-api-btn" style="background:#e74c3c;color:white;border:none;width:38px;height:38px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.9rem">
                    <i class="fas fa-download"></i>
                </button>
            `;

            item.querySelector('.dl-api-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                handleMusicImport(track, item);
            });

            apiSearchResults.appendChild(item);
        });
    }

    // --------------------------------------------------
    // IMPORT — baixa o áudio e salva direto na playlist
    // --------------------------------------------------
    async function handleMusicImport(track, itemElement) {
        const btn = itemElement.querySelector('.dl-api-btn');

        // Verificar playlist selecionada ANTES de baixar
        const playlistId = selectPlaylist.value;
        if (!playlistId) {
            if (typeof showAdminToast === 'function')
                showAdminToast('⚠️ Selecione uma playlist antes de baixar!', 'warning');
            return;
        }

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled  = true;
            btn.classList.add('dl-animating');
            itemElement.style.pointerEvents = 'none';

            if (typeof showAdminToast === 'function')
                showAdminToast(`⬇️ Baixando: ${track.title}…`, 'info');

            // 1. Buscar áudio do backend
            const response = await fetch(`${API_BACKEND_URL}/download?id=${track.id}`);
            if (!response.ok) throw new Error(`Download falhou (${response.status})`);
            const blob = await response.blob();

            // Detecta o tipo de áudio retornado pelo servidor
            const contentType = response.headers.get('Content-Type') || 'audio/mp4';
            const ext = contentType.includes('webm') ? 'webm' : contentType.includes('ogg') ? 'ogg' : 'm4a';

            const safeTitle = track.title.replace(/[^\w\s-]/g, '').trim();
            const audioFile = new File([blob], `${safeTitle}.${ext}`, { type: contentType });

            // 2. Upload do áudio para Cloudinary
            if (typeof showAdminToast === 'function')
                showAdminToast('☁️ Enviando áudio para o servidor…', 'info');

            if (typeof uploadAudioToCloudinary === 'undefined')
                throw new Error('uploadAudioToCloudinary não disponível');

            const audioData = await uploadAudioToCloudinary(audioFile);
            if (!audioData || !audioData.url) throw new Error('Falha no upload do áudio para Cloudinary');

            console.log('✅ [api-search] Áudio enviado:', audioData.url);

            // 3. Montar objeto da faixa (mesma estrutura que addMusicToPlaylist usa)
            const newTrack = {
                title:        track.title,
                artist:       track.artist,
                album:        'YouTube',
                src:          audioData.url,
                cover:        track.coverUrl,
                duration:     audioData.duration || track.durationSeconds || 0,
                cloudinaryId: audioData.publicId || null,
                source:       'youtube',
                addedAt:      Date.now()
            };

            // 4. Ler músicas existentes no Firestore
            if (typeof showAdminToast === 'function')
                showAdminToast('💾 Salvando na playlist…', 'info');

            console.log('[api-search] Buscando tracks da playlist:', playlistId);
            const musicSnapshot = await db.collection('playlist_tracks')
                .where('playlistId', '==', playlistId)
                .get();

            const currentTracks = [];
            const sortedDocs = Array.from(musicSnapshot.docs)
                .sort((a, b) => (a.data().pageNumber || 0) - (b.data().pageNumber || 0));
            sortedDocs.forEach(doc => currentTracks.push(...(doc.data().tracks || [])));

            console.log(`[api-search] Tracks existentes: ${currentTracks.length}. Adicionando nova música.`);

            // 5. Adicionar nova música ao array
            currentTracks.push(newTrack);

            // 6. Paginar (200 por página — igual ao addMusicToPlaylist)
            const TRACKS_PER_PAGE = 200;
            const pages = [];
            for (let i = 0; i < currentTracks.length; i += TRACKS_PER_PAGE)
                pages.push(currentTracks.slice(i, i + TRACKS_PER_PAGE));

            // 7. Deletar páginas antigas
            await Promise.all(musicSnapshot.docs.map(doc =>
                db.collection('playlist_tracks').doc(doc.id).delete()
            ));

            // 8. Criar novas páginas
            for (let pi = 0; pi < pages.length; pi++) {
                await db.collection('playlist_tracks').add({
                    playlistId,
                    pageNumber: pi,
                    tracks: pages[pi],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // 9. Atualizar contador na playlist
            await db.collection('custom_playlists').doc(playlistId).update({
                trackCount: currentTracks.length
            });

            console.log(`✅ [api-search] "${track.title}" salva. Total: ${currentTracks.length} músicas.`);

            // 10. Recarregar UI — igual ao addMusicToPlaylist faz após salvar
            if (typeof loadExistingPlaylists === 'function')
                await loadExistingPlaylists();

            if (typeof PlaylistManager !== 'undefined' && PlaylistManager.reload)
                await PlaylistManager.reload();

            if (typeof window.playlistEditManager !== 'undefined' &&
                window.playlistEditManager.currentPlaylistId === playlistId &&
                typeof window.playlistEditManager.loadPlaylistTracks === 'function') {
                await window.playlistEditManager.loadPlaylistTracks();
            }

            // ✅ Sucesso!
            btn.innerHTML        = '<i class="fas fa-check"></i>';
            btn.classList.remove('dl-animating');
            btn.style.background = '#2ecc71';
            btn.disabled         = false;

            if (typeof showAdminToast === 'function')
                showAdminToast(`✅ "${track.title}" adicionada à playlist!`, 'success');

        } catch (err) {
            console.error('❌ [api-search] Erro na importação:', err);
            btn.innerHTML        = '<i class="fas fa-times"></i>';
            btn.classList.remove('dl-animating');
            btn.style.background = '#e74c3c';
            btn.disabled         = false;

            if (typeof showAdminToast === 'function')
                showAdminToast(`❌ Erro: ${err.message}`, 'error');
        } finally {
            itemElement.style.pointerEvents = 'auto';
        }
    }
}
