// ===== EXTRATOR DE CAPA DE MP3 (ALBUM ART) - VERSÃO CORRIGIDA =====
console.log('🎨 Sistema de extração de capas MP3 carregado');

/**
 * Extrai a capa embutida em um arquivo MP3 usando Web Worker
 * @param {File} mp3File - Arquivo MP3
 * @returns {Promise<Object | null>}
 */
async function extractMP3Cover(mp3File) {
    return new Promise((resolve) => {
        console.log('🔍 Iniciando extração de capa do MP3 via Web Worker...');

        // Criar Web Worker
        const worker = new Worker('mp3-worker.js');

        worker.onmessage = function(e) {
            const { success, result, error } = e.data;
            worker.terminate();

            if (success && result) {
                // Criar URL para preview
                const coverUrl = URL.createObjectURL(result.coverBlob);

                console.log('✅ Capa extraída com sucesso:', {
                    format: result.format,
                    size: `${(result.coverBlob.size / 1024).toFixed(2)} KB`
                });

                resolve({
                    coverBlob: result.coverBlob,
                    coverUrl: coverUrl,
                    format: result.format,
                    title: result.title,
                    artist: result.artist,
                    album: result.album
                });
            } else {
                console.warn('⚠️ Erro na extração:', error);
                resolve(null);
            }
        };

        worker.onerror = function(error) {
            console.error('❌ Erro no Web Worker:', error);
            worker.terminate();
            resolve(null);
        };

        // Enviar arquivo como ArrayBuffer
        mp3File.arrayBuffer().then(buffer => {
            worker.postMessage({ mp3File: buffer });
        });
    });
}

/**
 * Converte Blob para File
 */
function blobToFile(blob, fileName) {
    return new File([blob], fileName, { 
        type: blob.type,
        lastModified: Date.now()
    });
}

/**
 * Função principal: extrair capa e fazer upload
 * @param {File} mp3File - Arquivo MP3
 * @returns {Promise<{coverUrl: string, metadata: object}>}
 */
async function extractAndUploadMP3Cover(mp3File) {
    try {
        console.log('🔍 Iniciando processo de extração de capa...');
        
        // Extrair capa
        const extracted = await extractMP3Cover(mp3File);
        
        if (!extracted) {
            console.log('📦 MP3 sem capa embutida - usando padrão');
            return {
                coverUrl: 'images/capas-albuns/default-music.jpg',
                metadata: {
                    title: mp3File.name.replace(/\.[^/.]+$/, ""),
                    artist: 'Artista desconhecido',
                    album: ''
                }
            };
        }
        
        console.log('✅ Capa extraída! Convertendo para arquivo...');
        
        // Converter Blob para File
        const extension = extracted.format.split('/')[1] || 'jpg';
        const coverFile = blobToFile(
            extracted.coverBlob, 
            `cover-${Date.now()}.${extension}`
        );
        
        console.log('📦 Arquivo de capa preparado:', {
            name: coverFile.name,
            type: coverFile.type,
            size: `${(coverFile.size / 1024).toFixed(2)} KB`
        });
        
        // Verificar se função de upload existe
// Verificar se função de upload existe
if (typeof uploadImageToCloudinary === 'undefined') {
    throw new Error('❌ uploadImageToCloudinary não está disponível! Verifique cloudinary-config.js');
}

console.log('☁️ Fazendo upload da capa para Cloudinary...');

// ✅ Chamar SEM o segundo parâmetro (maxWidth)
const uploadResult = await uploadImageToCloudinary(coverFile);

// ✅ VALIDAÇÃO MAIS RIGOROSA
let coverUrl;

if (typeof uploadResult === 'string') {
    coverUrl = uploadResult;
} else if (uploadResult && uploadResult.url) {
    coverUrl = uploadResult.url;
} else {
    console.error('❌ Resultado inválido do upload:', uploadResult);
    throw new Error('Upload não retornou URL válida');
}

// ✅ VERIFICAR SE A URL É VÁLIDA
if (!coverUrl || coverUrl.trim() === '') {
    throw new Error('URL da capa está vazia');
}

console.log('✅ URL DA CAPA VALIDADA:', coverUrl);        
        console.log('✅ Capa enviada com sucesso:', coverUrl);
        
        return {
            coverUrl: coverUrl,
            metadata: {
                title: extracted.title,
                artist: extracted.artist,
                album: extracted.album
            }
        };
        
    } catch (error) {
        console.error('❌ Erro ao processar capa:', error.message);
        console.error('Stack:', error.stack);
        
        // Retornar capa padrão em caso de erro
        console.log('📦 Usando capa padrão devido ao erro');
        return {
            coverUrl: 'images/capas-albuns/default-music.jpg',
            metadata: {
                title: mp3File.name.replace(/\.[^/.]+$/, ""),
                artist: 'Artista desconhecido',
                album: ''
            }
        };
    }
}

// Exportar para uso global
window.extractMP3Cover = extractMP3Cover;
window.extractAndUploadMP3Cover = extractAndUploadMP3Cover;

console.log('✅ Extrator de capas MP3 pronto!');