// ===== CONFIGURAÇÃO DO CLOUDINARY - OTIMIZADO COM WEBP E RESPONSIVO =====

const CLOUDINARY_CLOUD_NAME = 'dxxnqs4gf';
const CLOUDINARY_AUDIO_PRESET = 'music_uploads';
const CLOUDINARY_IMAGE_PRESET = 'image_uploads';

// ===== CONFIGURAÇÕES DE OTIMIZAÇÃO =====
const IMAGE_CONFIGS = {
    thumb: {
        width: 400,
        quality: 80,  
        crop: 'fill'
    },
    medium: {
        width: 800,
        quality: 85,  
        crop: 'limit'
    },
    large: {
        width: 1600,
        quality: 90,  
        crop: 'limit'
    },
    original: {
        quality: 95, 
        crop: 'limit'
    }
};

/**
 * Gera URL otimizada do Cloudinary com WebP e compressão
 * @param {string} publicId - ID público da imagem no Cloudinary
 * @param {object} options - Opções de transformação
 * @returns {string} URL otimizada
 */
function generateOptimizedUrl(publicId, options = {}) {
    const {
        width = null,
        quality = 'auto',
        crop = 'limit',
        format = 'auto',
        fetchFormat = 'auto'
    } = options;
    
    const transformations = [];
    
    // Dimensões
    if (width) {
        transformations.push(`w_${width}`);
    }
    
    // Modo de crop
    transformations.push(`c_${crop}`);
    
    // Qualidade
    transformations.push(`q_${quality}`);
    
    // Formato (auto detecta WebP se suportado)
    transformations.push(`f_${format}`);
    
    // Otimizações adicionais
    transformations.push('fl_progressive'); // Progressive JPEG
    transformations.push('fl_lossy'); // Compressão com perda (melhor para web)
    
    const transformString = transformations.join(',');
    
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformString}/${publicId}`;
}

/**
 * Gera todas as versões responsivas de uma imagem
 * @param {string} publicId - ID público da imagem
 * @returns {object} URLs de todas as versões
 */
function generateResponsiveUrls(publicId) {
    return {
        thumb: generateOptimizedUrl(publicId, IMAGE_CONFIGS.thumb),
        medium: generateOptimizedUrl(publicId, IMAGE_CONFIGS.medium),
        large: generateOptimizedUrl(publicId, IMAGE_CONFIGS.large),
        original: generateOptimizedUrl(publicId, IMAGE_CONFIGS.original),
        // URL WebP explícita para navegadores que suportam
        webp: generateOptimizedUrl(publicId, {
            ...IMAGE_CONFIGS.medium,
            format: 'webp'
        })
    };
}

/**
 * Upload de imagem com otimização automática
 * @param {File} imageFile - Arquivo de imagem
 * @param {number|null} maxWidth - Largura máxima (null = sem limite)
 * @param {boolean} generateVersions - Se deve gerar versões responsivas
 * @returns {Promise<string|object>} URL otimizada ou objeto com todas as versões
 */
async function uploadImageToCloudinary(imageFile, maxWidth = null, generateVersions = false) {
    // Validar tipo
    if (!imageFile.type.startsWith('image/')) {
        throw new Error('Arquivo não é uma imagem válida!');
    }
    
    console.log('🖼️ Iniciando upload otimizado de imagem...');
    
    return new Promise(async (resolve, reject) => {
        try {
            if (!imageFile) {
                reject(new Error('Nenhum arquivo fornecido'));
                return;
            }
            
            console.log(`☁️ Upload: ${imageFile.name} (${(imageFile.size / 1024 / 1024).toFixed(2)} MB)`);
            
            // Validar tamanho (100MB)
            if (imageFile.size > 100 * 1024 * 1024) {
                reject(new Error('Arquivo muito grande! Máximo 100MB.'));
                return;
            }
            
            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('upload_preset', CLOUDINARY_IMAGE_PRESET);
            formData.append('folder', 'kevin-iara/images');
            
            // ❌ REMOVIDO: eager transforms (causava erro)
            // NÃO usar formData.append('eager', ...) 
            
            console.log('📡 Enviando para Cloudinary...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);
            
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                }
            );
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Erro do Cloudinary:', errorData);
                throw new Error(errorData.error?.message || `Erro HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.secure_url) {
                throw new Error('Cloudinary não retornou URL válida');
            }
            
            console.log('✅ Upload concluído:', data.public_id);
            console.log(`📊 Tamanho original: ${(data.bytes / 1024).toFixed(2)} KB`);
            
            // ===== GERAR URLS OTIMIZADAS =====
            const publicId = data.public_id;
            
            if (generateVersions) {
                // Retornar objeto com todas as versões
                const urls = generateResponsiveUrls(publicId);
                
                console.log('✅ Versões geradas:');
                console.log(`   📱 Thumb: ${urls.thumb.substring(0, 60)}...`);
                console.log(`   💻 Medium: ${urls.medium.substring(0, 60)}...`);
                console.log(`   🖥️ Large: ${urls.large.substring(0, 60)}...`);
                
                resolve(urls);
            } else {
                // Retornar apenas URL otimizada (compatível com código existente)
                const optimizedUrl = generateOptimizedUrl(publicId, {
                    width: maxWidth,
                    quality: 80,
                    format: 'auto',
                    crop: 'limit'
                });
                
                console.log(`✅ URL otimizada: ${optimizedUrl.substring(0, 80)}...`);
                
                resolve(optimizedUrl);
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('❌ Timeout: Upload demorou mais de 5 minutos');
                reject(new Error('Upload demorou muito. Tente um arquivo menor.'));
            } else {
                console.error('❌ Erro no upload:', error);
                reject(error);
            }
        }
    });
}

/**
 * Helper para criar tag <img> com srcset responsivo
 * @param {object} urls - Objeto com URLs responsivas
 * @param {string} alt - Texto alternativo
 * @returns {HTMLImageElement}
 */
function createResponsiveImage(urls, alt = '') {
    const img = document.createElement('img');
    
    // URL principal (medium)
    img.src = urls.medium || urls.original;
    
    // Srcset para diferentes tamanhos
    img.srcset = `
        ${urls.thumb} 400w,
        ${urls.medium} 800w,
        ${urls.large} 1600w
    `;
    
    // Sizes (adapta ao viewport)
    img.sizes = `
        (max-width: 400px) 400px,
        (max-width: 800px) 800px,
        1600px
    `;
    
    img.alt = alt;
    img.loading = 'lazy';
    
    return img;
}

/**
 * Otimizar URL existente do Cloudinary
 * @param {string} cloudinaryUrl - URL original do Cloudinary
 * @param {object} options - Opções de otimização
 * @returns {string} URL otimizada
 */
function optimizeExistingUrl(cloudinaryUrl, options = {}) {
    const {
        width = null,
        quality = 80,
        format = 'auto'
    } = options;
    
    // Extrair public_id da URL
    const matches = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    
    if (!matches) {
        console.warn('⚠️ URL não reconhecida, retornando original');
        return cloudinaryUrl;
    }
    
    const publicId = matches[1];
    
    return generateOptimizedUrl(publicId, { width, quality, format });
}

// ===== UPLOAD DE ÁUDIO (SEM MUDANÇAS) =====
async function uploadAudioToCloudinary(audioFile) {
    if (!audioFile.type.startsWith('audio/') && !audioFile.name.match(/\.(mp3|m4a|wav|ogg|flac)$/i)) {
        throw new Error('Arquivo não é um áudio válido! Use MP3, M4A, WAV, OGG ou FLAC.');
    }
    
    console.log('🎵 Iniciando upload de áudio...');
    
    return new Promise(async (resolve, reject) => {
        try {
            const formData = new FormData();
            formData.append('file', audioFile);
            formData.append('upload_preset', CLOUDINARY_AUDIO_PRESET);
            formData.append('folder', 'kevin-iara/music');
            
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `Erro HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            resolve({
                url: data.secure_url,
                publicId: data.public_id,
                duration: data.duration || 0,
                format: data.format,
                bytes: data.bytes
            });
            
        } catch (error) {
            console.error('❌ Erro no upload de áudio:', error);
            reject(error);
        }
    });
}

// ===== VALIDAÇÃO =====
function validateCloudinaryConfig() {
    if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === 'SEU_CLOUD_NAME_AQUI') {
        console.error('❌ Cloud Name não configurado!');
        return false;
    }
    
    if (!CLOUDINARY_AUDIO_PRESET || CLOUDINARY_AUDIO_PRESET === 'SEU_PRESET_AQUI') {
        console.error('❌ Audio Preset não configurado!');
        return false;
    }
    
    if (!CLOUDINARY_IMAGE_PRESET || CLOUDINARY_IMAGE_PRESET === 'SEU_PRESET_AQUI') {
        console.error('❌ Image Preset não configurado!');
        return false;
    }
    
    console.log('✅ Cloudinary OTIMIZADO configurado:');
    console.log(`   📦 Cloud Name: ${CLOUDINARY_CLOUD_NAME}`);
    console.log(`   🎵 Audio Preset: ${CLOUDINARY_AUDIO_PRESET}`);
    console.log(`   🖼️ Image Preset: ${CLOUDINARY_IMAGE_PRESET}`);
    console.log(`   ⚡ WebP: Ativado`);
    console.log(`   📐 Versões: thumb (400px), medium (800px), large (1600px)`);
    console.log(`   🗜️ Compressão: Quality 70-85, Progressive, Lossy`);
    console.log(`   ❌ Eager: Desabilitado (gera URLs sob demanda)`);
    
    return true;
}

// Validar ao carregar
setTimeout(() => {
    validateCloudinaryConfig();
}, 1000);

// Exportar para uso global
window.uploadAudioToCloudinary = uploadAudioToCloudinary;
window.uploadImageToCloudinary = uploadImageToCloudinary;
window.generateResponsiveUrls = generateResponsiveUrls;
window.createResponsiveImage = createResponsiveImage;
window.optimizeExistingUrl = optimizeExistingUrl;

console.log('☁️ Cloudinary OTIMIZADO com WebP e Responsivo carregado (SEM eager)!');