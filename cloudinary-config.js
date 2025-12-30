// ===== CONFIGURAÇÃO DO CLOUDINARY - COMPATÍVEL COM IMGBB =====

const CLOUDINARY_CLOUD_NAME = 'dxxnqs4gf';
const CLOUDINARY_AUDIO_PRESET = 'music_uploads';
const CLOUDINARY_IMAGE_PRESET = 'image_uploads';

// ===== FUNÇÃO UNIVERSAL DE UPLOAD (RETORNA STRING COMO O IMGBB) =====
async function uploadToCloudinary(file, preset, folder) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!file) {
                reject(new Error('Nenhum arquivo fornecido'));
                return;
            }
            
            console.log(`☁️ Iniciando upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
            
            // Validar tamanho (100MB)
            if (file.size > 100 * 1024 * 1024) {
                reject(new Error('Arquivo muito grande! Máximo 100MB.'));
                return;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', preset);
            formData.append('folder', folder);
            
            console.log('📡 Enviando para Cloudinary...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);
            
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
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
            
            console.log('✅ Upload concluído:', data.secure_url);
            console.log(`📊 Tamanho: ${(data.bytes / 1024).toFixed(2)} KB`);
            
            // 🔥 RETORNA STRING COMO O IMGBB FAZIA
            resolve(data.secure_url);
            
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

// ===== UPLOAD DE ÁUDIO (RETORNA OBJETO COM METADADOS) =====
async function uploadAudioToCloudinary(audioFile) {
    // Validar tipo
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
            
            // Áudio precisa retornar objeto com metadados
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

// ===== UPLOAD DE IMAGEM (RETORNA STRING COMO O IMGBB) =====
async function uploadImageToCloudinary(imageFile, maxWidth = null) {
    // Validar tipo
    if (!imageFile.type.startsWith('image/')) {
        throw new Error('Arquivo não é uma imagem válida!');
    }
    
    console.log('🖼️ Iniciando upload de imagem...');
    
    // 🔥 RETORNA STRING DIRETAMENTE
    return uploadToCloudinary(imageFile, CLOUDINARY_IMAGE_PRESET, 'kevin-iara/images');
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
    
    console.log('✅ Cloudinary configurado (compatível com ImgBB):');
    console.log(`   📦 Cloud Name: ${CLOUDINARY_CLOUD_NAME}`);
    console.log(`   🎵 Audio Preset: ${CLOUDINARY_AUDIO_PRESET}`);
    console.log(`   🖼️ Image Preset: ${CLOUDINARY_IMAGE_PRESET}`);
    console.log(`   🔄 Modo compatibilidade: STRING (como ImgBB)`);
    
    return true;
}

// Validar ao carregar
setTimeout(() => {
    validateCloudinaryConfig();
}, 1000);

// Exportar para uso global
window.uploadAudioToCloudinary = uploadAudioToCloudinary;
window.uploadImageToCloudinary = uploadImageToCloudinary;

console.log('☁️ Cloudinary configurado e compatível com ImgBB!');
