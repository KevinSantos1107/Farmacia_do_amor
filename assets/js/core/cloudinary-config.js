// ===== CLOUDINARY v3.0 - UPLOAD UNIVERSAL (iOS + Android + Desktop) =====
// Estratégia: converter tudo para base64 JPEG antes de enviar.
// Isso contorna TODOS os bugs do Safari iOS com FormData, Blob, HEIC e Content-Type.

const CLOUDINARY_CLOUD_NAME = 'dxxnqs4gf';
const CLOUDINARY_AUDIO_PRESET = 'music_uploads';
const CLOUDINARY_IMAGE_PRESET = 'image_uploads';

// ===== CONFIGURAÇÕES DE QUALIDADE =====
const IMAGE_CONFIGS = {
    thumb: {
        width: 400,
        quality: 75,
        crop: 'fill'
    },
    medium: {
        width: 800,
        quality: 82,
        crop: 'limit'
    },
    large: {
        width: 1600,
        quality: 88,
        crop: 'limit'
    },
    original: {
        quality: 95,
        crop: 'limit'
    }
};

// ===== GERAR URL OTIMIZADA =====
function generateOptimizedUrl(publicId, options = {}) {
    const {
        width = null,
        quality = 82,
        crop = 'limit',
        format = 'auto'
    } = options;

    const transformations = [];

    if (width) transformations.push(`w_${width}`);
    transformations.push(`c_${crop}`);
    transformations.push(`q_${quality}`);
    transformations.push(`f_${format}`);
    transformations.push('fl_progressive');
    transformations.push('fl_lossy');

    const transformString = transformations.join(',');

    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformString}/${publicId}`;
}

// ===== GERAR VERSÕES RESPONSIVAS =====
function generateResponsiveUrls(publicId) {
    return {
        thumb: generateOptimizedUrl(publicId, IMAGE_CONFIGS.thumb),
        medium: generateOptimizedUrl(publicId, IMAGE_CONFIGS.medium),
        large: generateOptimizedUrl(publicId, IMAGE_CONFIGS.large),
        original: generateOptimizedUrl(publicId, IMAGE_CONFIGS.original),
        webp: generateOptimizedUrl(publicId, {
            width: IMAGE_CONFIGS.medium.width,
            quality: IMAGE_CONFIGS.medium.quality,
            format: 'webp'
        })
    };
}

// ===== PLACEHOLDER BLUR =====
function generatePlaceholder(publicId) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_40,q_30,e_blur:1000,f_auto/${publicId}`;
}

// ===== NÚCLEO: CONVERTER QUALQUER IMAGEM PARA BASE64 JPEG =====
// Esta função é o coração da solução. Ela:
// 1. Lê o arquivo via FileReader (funciona com HEIC, JPEG, PNG, qualquer coisa)
// 2. Carrega no canvas via elemento <img>
// 3. Exporta como JPEG base64 com qualidade controlada
// 4. Retorna uma string base64 que o Cloudinary aceita diretamente como campo "file"
//
// Por que base64?
// - Evita TODOS os problemas de FormData + Blob + Content-Type do Safari iOS
// - Funciona com HEIC sem nenhuma detecção de tipo
// - Comportamento idêntico em iOS, Android e Desktop
// - O Cloudinary aceita data URIs como valor do campo "file" na API unsigned
async function imageFileToBase64Jpeg(file, maxDimension = 2048, quality = 0.88) {
    return new Promise((resolve, reject) => {
        // Passo 1: Ler o arquivo como Data URL
        const reader = new FileReader();

        reader.onerror = () => {
            reject(new Error('Falha ao ler o arquivo de imagem'));
        };

        reader.onload = (readerEvent) => {
            const dataUrl = readerEvent.target.result;

            // Passo 2: Carregar no elemento <img> para decodificar
            const img = new Image();

            img.onerror = () => {
                reject(new Error('Falha ao decodificar a imagem (formato não suportado?)'));
            };

            img.onload = () => {
                try {
                    // Passo 3: Calcular dimensões respeitando o limite
                    let { width, height } = img;
                    if (width === 0 || height === 0) {
                        reject(new Error('Imagem com dimensões inválidas (0x0)'));
                        return;
                    }

                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = Math.round((height / width) * maxDimension);
                            width = maxDimension;
                        } else {
                            width = Math.round((width / height) * maxDimension);
                            height = maxDimension;
                        }
                    }

                    // Passo 4: Desenhar no canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    // Fundo branco para evitar transparência (PNG com alpha → JPEG)
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);

                    // Passo 5: Exportar como JPEG base64
                    const base64 = canvas.toDataURL('image/jpeg', quality);

                    if (!base64 || base64 === 'data:,') {
                        reject(new Error('Canvas retornou base64 vazio'));
                        return;
                    }

                    console.log(`✅ Imagem convertida: ${width}x${height}px, q${Math.round(quality * 100)}`);
                    resolve(base64);
                } catch (canvasError) {
                    reject(new Error('Erro ao processar canvas: ' + canvasError.message));
                }
            };

            img.src = dataUrl;
        };

        reader.readAsDataURL(file);
    });
}

// ===== UPLOAD DE IMAGEM (UNIVERSAL) =====
async function uploadImageToCloudinary(imageFile, maxWidth = null, generateVersions = false) {
    // Validação básica — aceita qualquer tipo de imagem incluindo HEIC
    const isImage = (imageFile.type && imageFile.type.startsWith('image/')) ||
                    /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|tiff|avif)$/i.test(imageFile.name || '');

    if (!isImage) {
        throw new Error('Arquivo não é uma imagem válida!');
    }

    console.log(`🖼️ Upload iniciado: ${imageFile.name || 'sem nome'} (${(imageFile.size / 1024).toFixed(0)} KB, tipo: ${imageFile.type || 'desconhecido'})`);

    if (imageFile.size > 100 * 1024 * 1024) {
        throw new Error('Arquivo muito grande! Máximo 100MB.');
    }

    try {
        // ─────────────────────────────────────────────────────────────
        // ETAPA 1: Converter para base64 JPEG (contorna todos os bugs iOS)
        // Dimensão máxima: usa maxWidth se fornecido, senão 2048px
        // ─────────────────────────────────────────────────────────────
        const resolvedMaxDim = maxWidth ? Math.min(maxWidth, 2048) : 2048;

        // Qualidade inicial: 0.88 (boa qualidade)
        // Se o resultado ainda for muito grande, reduzir automaticamente
        let base64;
        let quality = 0.88;

        while (quality >= 0.50) {
            base64 = await imageFileToBase64Jpeg(imageFile, resolvedMaxDim, quality);

            // Calcular tamanho aproximado do base64 em bytes
            const approxBytes = Math.round((base64.length * 3) / 4);
            console.log(`📊 Base64 com q${Math.round(quality * 100)}: ~${(approxBytes / 1024).toFixed(0)} KB`);

            // Se for menor que 10MB já está bom
            if (approxBytes < 10 * 1024 * 1024) break;

            quality -= 0.10;
            console.log(`⚙️ Ainda grande, reduzindo qualidade para q${Math.round(quality * 100)}...`);
        }

        // ─────────────────────────────────────────────────────────────
        // ETAPA 2: Enviar para Cloudinary
        // Usamos FormData com a string base64 como valor do campo "file".
        // Isso funciona em TODOS os browsers/plataformas porque é uma string,
        // não um Blob — sem nenhum dos problemas de Content-Type do iOS.
        // ─────────────────────────────────────────────────────────────
        const formData = new FormData();
        formData.append('upload_preset', CLOUDINARY_IMAGE_PRESET);
        formData.append('folder', 'kevin-iara/images');
        formData.append('file', base64);  // ← string base64, não Blob/File

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

        console.log('☁️ Enviando para Cloudinary...');

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
            const errorData = await response.json().catch(() => ({}));
            const msg = errorData?.error?.message || `HTTP ${response.status}`;
            console.error('❌ Erro Cloudinary:', errorData);
            throw new Error(msg);
        }

        const data = await response.json();

        if (!data.secure_url) {
            throw new Error('Resposta inválida do Cloudinary (sem secure_url)');
        }

        const publicId = data.public_id;
        console.log('✅ Upload concluído:', publicId);
        console.log(`📊 Tamanho no servidor: ${(data.bytes / 1024).toFixed(1)} KB`);

        // ─────────────────────────────────────────────────────────────
        // ETAPA 3: Retornar URLs
        // ─────────────────────────────────────────────────────────────
        if (generateVersions) {
            const urls = generateResponsiveUrls(publicId);
            console.log('✅ URLs responsivas geradas');
            return urls;
        } else {
            // Caminho legado: retornar URL única otimizada
            const config = !maxWidth ? IMAGE_CONFIGS.large :
                           maxWidth <= 400 ? IMAGE_CONFIGS.thumb :
                           maxWidth <= 800 ? IMAGE_CONFIGS.medium :
                           IMAGE_CONFIGS.large;

            return generateOptimizedUrl(publicId, {
                width: maxWidth || config.width,
                quality: config.quality,
                crop: config.crop
            });
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Timeout: upload demorou mais de 5 minutos');
        }
        console.error('❌ Erro no upload de imagem:', error.message);
        throw error;
    }
}

// ===== CRIAR IMAGEM RESPONSIVA COM LAZY LOADING =====
function createResponsiveImage(urls, alt = '', usePlaceholder = true) {
    const img = document.createElement('img');

    img.src = urls.medium || urls.original;
    img.srcset = `
        ${urls.thumb} 400w,
        ${urls.medium} 800w,
        ${urls.large} 1600w
    `.trim();
    img.sizes = `
        (max-width: 400px) 400px,
        (max-width: 800px) 800px,
        1600px
    `.trim();
    img.alt = alt;
    img.loading = 'lazy';
    img.decoding = 'async';

    if (usePlaceholder && urls.medium) {
        const match = urls.medium.match(/\/upload\/[^/]+\/(.+)$/);
        if (match) {
            const publicId = match[1];
            const placeholder = generatePlaceholder(publicId);
            img.style.backgroundImage = `url('${placeholder}')`;
            img.style.backgroundSize = 'cover';
            img.style.backgroundPosition = 'center';
            img.style.transition = 'background-image 0.5s ease-in-out';
            img.addEventListener('load', () => {
                img.style.backgroundImage = 'none';
            }, { once: true });
        }
    }

    return img;
}

// ===== OTIMIZAR URL EXISTENTE (FALLBACK) =====
function optimizeExistingUrl(cloudinaryUrl, targetWidth = 800) {
    if (cloudinaryUrl.includes('i.ibb.co') || cloudinaryUrl.includes('ibb.co')) {
        return cloudinaryUrl;
    }
    if (cloudinaryUrl.includes('/w_')) {
        return cloudinaryUrl;
    }
    if (!cloudinaryUrl.includes('cloudinary.com')) {
        return cloudinaryUrl;
    }

    const match = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    if (!match) {
        console.warn('⚠️ URL Cloudinary não reconhecida:', cloudinaryUrl);
        return cloudinaryUrl;
    }

    const publicId = match[1];
    const config = targetWidth <= 400 ? IMAGE_CONFIGS.thumb :
                   targetWidth <= 800 ? IMAGE_CONFIGS.medium :
                   IMAGE_CONFIGS.large;

    return generateOptimizedUrl(publicId, {
        width: config.width,
        quality: config.quality,
        crop: config.crop
    });
}

// ===== CRIAR FALLBACK PARA ÁLBUNS ANTIGOS =====
function createFallbackImage(originalUrl, alt = '') {
    const img = document.createElement('img');
    let finalUrl = originalUrl;

    if (originalUrl.includes('cloudinary.com')) {
        finalUrl = optimizeExistingUrl(originalUrl, 800);
        img.style.filter = 'blur(10px)';
        img.style.transition = 'filter 0.3s ease';
        img.addEventListener('load', () => {
            img.style.filter = 'none';
        }, { once: true });
    }

    img.src = finalUrl;
    img.alt = alt;
    img.loading = 'lazy';
    img.decoding = 'async';

    return img;
}

// ===== UPLOAD DE ÁUDIO =====
async function uploadAudioToCloudinary(audioFile) {
    if (!audioFile.type.startsWith('audio/') && !audioFile.name.match(/\.(mp3|m4a|wav|ogg|flac)$/i)) {
        throw new Error('Arquivo não é um áudio válido!');
    }

    console.log('🎵 Upload de áudio iniciado...');

    try {
        if (audioFile.size > 100 * 1024 * 1024) {
            throw new Error('Arquivo muito grande! Máximo 100MB.');
        }

        const formData = new FormData();
        formData.append('upload_preset', CLOUDINARY_AUDIO_PRESET);
        formData.append('folder', 'kevin-iara/music');
        formData.append('file', audioFile, audioFile.name || 'audio.mp3');

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
            { method: 'POST', body: formData }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Áudio enviado:', data.public_id);

        return {
            url: data.secure_url,
            publicId: data.public_id,
            duration: data.duration || 0,
            format: data.format,
            bytes: data.bytes
        };

    } catch (error) {
        console.error('❌ Erro upload áudio:', error);
        throw error;
    }
}

// ===== VALIDAÇÃO =====
function validateCloudinaryConfig() {
    if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === 'SEU_CLOUD_NAME_AQUI') {
        console.error('❌ Cloud Name não configurado!');
        return false;
    }

    console.log('╔════════════════════════════════════════════╗');
    console.log('║  ☁️  CLOUDINARY v3.0 — Upload Universal    ║');
    console.log('╠════════════════════════════════════════════╣');
    console.log(`║  📦 Cloud: ${CLOUDINARY_CLOUD_NAME.padEnd(26)} ║`);
    console.log('║  🔄 Estratégia: base64 JPEG (iOS-safe)     ║');
    console.log('║  📱 HEIC/HEIF: conversão automática        ║');
    console.log('║  🎨 Versões: Thumb/Medium/Large/WebP       ║');
    console.log('╚════════════════════════════════════════════╝');

    return true;
}

setTimeout(validateCloudinaryConfig, 1000);

// ===== EXPORTAR GLOBALMENTE =====
window.uploadAudioToCloudinary = uploadAudioToCloudinary;
window.uploadImageToCloudinary = uploadImageToCloudinary;
window.generateResponsiveUrls = generateResponsiveUrls;
window.createResponsiveImage = createResponsiveImage;
window.optimizeExistingUrl = optimizeExistingUrl;
window.createFallbackImage = createFallbackImage;
window.generatePlaceholder = generatePlaceholder;
window.imageFileToBase64Jpeg = imageFileToBase64Jpeg;

console.log('✅ Cloudinary v3.0 (Upload Universal) carregado!');
