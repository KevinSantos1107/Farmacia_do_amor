// ===== EXTRATOR DE CAPA DE MP3 (ALBUM ART) - VERSÃO CORRIGIDA =====
console.log('🎨 Sistema de extração de capas MP3 carregado');

/**
 * Extrai a capa embutida em um arquivo MP3
 * @param {File} mp3File - Arquivo MP3
 * @returns {Promise<Object | null>}
 */
async function extractMP3Cover(mp3File) {
    return new Promise((resolve) => {
        console.log('🔍 Iniciando extração de capa do MP3...');
        
        window.jsmediatags.read(mp3File, {
            onSuccess: function(tag) {
                const tags = tag.tags;
                console.log('✅ Tags lidas:', {
                    title: tags.title,
                    artist: tags.artist,
                    album: tags.album,
                    hasPicture: !!tags.picture
                });
                
                if (tags.picture) {
                    const picture = tags.picture;
                    
                    // Converter array de bytes para Blob
                    const byteArray = new Uint8Array(picture.data);
                    const blob = new Blob([byteArray], { type: picture.format });
                    
                    // Criar URL para preview
                    const coverUrl = URL.createObjectURL(blob);
                    
                    console.log('✅ Capa extraída com sucesso:', {
                        format: picture.format,
                        size: `${(blob.size / 1024).toFixed(2)} KB`
                    });
                    
                    resolve({
                        coverBlob: blob,
                        coverUrl: coverUrl,
                        format: picture.format,
                        title: tags.title || 'Sem título',
                        artist: tags.artist || 'Artista desconhecido',
                        album: tags.album || ''
                    });
                } else {
                    console.warn('⚠️ MP3 não possui capa embutida');
                    resolve(null);
                }
            },
            onError: function(error) {
                console.error('❌ Erro ao ler metadata do MP3:', error);
                resolve(null);
            }
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