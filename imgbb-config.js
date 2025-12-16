// ===== CONFIGURAÇÃO DO IMGBB =====

// COLE AQUI SUA API KEY DO IMGBB
const IMGBB_API_KEY = 'ca7a2dbb851032d7d3ed05ce9e8a6d67';

// Função para fazer upload de imagem para ImgBB
async function uploadToImgBB(file, maxWidth = 1200) {
    return new Promise(async (resolve, reject) => {
        try {
            // Converter e redimensionar imagem
            const base64 = await imageToBase64(file, maxWidth);
            
            // Remover prefixo "data:image/...;base64,"
            const base64Clean = base64.split(',')[1];
            
            // Criar FormData para enviar
            const formData = new FormData();
            formData.append('image', base64Clean);
            
            // Enviar para ImgBB
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Erro no upload para ImgBB');
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Retornar URL da imagem
                resolve(data.data.url);
                console.log('✅ Imagem enviada para ImgBB:', data.data.url);
            } else {
                reject(new Error('ImgBB retornou erro'));
            }
            
        } catch (error) {
            console.error('❌ Erro no upload ImgBB:', error);
            reject(error);
        }
    });
}

console.log('📸 ImgBB configurado e pronto!');