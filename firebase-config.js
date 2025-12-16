// ===== CONFIGURAÇÃO DO FIREBASE (SEM STORAGE) =====

// COLE AQUI AS SUAS CREDENCIAIS
const firebaseConfig = {
  apiKey: "AIzaSyCgt_eD3M_n9bhuhSzOxpf5f_ck43ZZZ-o",
  authDomain: "kevin-iara-site.firebaseapp.com",
  projectId: "kevin-iara-site",
  storageBucket: "kevin-iara-site.firebasestorage.app",
  messagingSenderId: "236663809364",
  appId: "1:236663809364:web:c0103bf11a1c37064214c1"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar APENAS Firestore (sem Storage)
const db = firebase.firestore();

console.log('🔥 Firebase inicializado (sem Storage)!');




// ===== CONFIGURAÇÃO DO IMGBB =====

// VERIFICAR se já foi declarado em outro arquivo
if (typeof IMGBB_API_KEY === 'undefined') {
    // COLE AQUI SUA API KEY DO IMGBB (se não tiver imgbb-config.js)
    var IMGBB_API_KEY = 'ca7a2dbb851032d7d3ed05ce9e8a6d67';
    console.log('📸 API Key do ImgBB carregada do firebase-config.js');
} else {
    console.log('📸 API Key do ImgBB já estava carregada');
}

// ===== FUNÇÃO PARA CONVERTER E REDIMENSIONAR IMAGEM =====
function imageToBase64(file, maxWidth = 1200) {
    return new Promise((resolve, reject) => {
        // Validar se é uma imagem
        if (!file.type.startsWith('image/')) {
            reject(new Error('Arquivo não é uma imagem válida'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                // Criar canvas para redimensionar
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calcular novo tamanho mantendo proporção
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                // Configurar canvas
                canvas.width = width;
                canvas.height = height;
                
                // Desenhar imagem redimensionada
                ctx.drawImage(img, 0, 0, width, height);
                
                // Converter para base64 (JPEG com qualidade 85%)
                const base64 = canvas.toDataURL('image/jpeg', 0.85);
                resolve(base64);
            };
            
            img.onerror = () => {
                reject(new Error('Erro ao carregar a imagem'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('Erro ao ler o arquivo'));
        };
        
        reader.readAsDataURL(file);
    });
}

// ===== FUNÇÃO PARA UPLOAD NO IMGBB =====
async function uploadToImgBB(file, maxWidth = 1200) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`📤 Iniciando upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
            
            // Validar tamanho (ImgBB aceita até 32MB)
            if (file.size > 32 * 1024 * 1024) {
                reject(new Error('Arquivo muito grande! Máximo 32MB'));
                return;
            }
            
            // Converter e redimensionar imagem
            const base64 = await imageToBase64(file, maxWidth);
            
            // Remover prefixo "data:image/...;base64,"
            const base64Clean = base64.split(',')[1];
            
            // Criar FormData para enviar
            const formData = new FormData();
            formData.append('image', base64Clean);
            
            console.log('📡 Enviando para ImgBB...');
            
            // Enviar para ImgBB
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Erro no upload para ImgBB');
            }
            
            const data = await response.json();
            
            if (data.success && data.data && data.data.url) {
                const imageUrl = data.data.url;
                console.log('✅ Upload concluído:', imageUrl);
                resolve(imageUrl);
            } else {
                reject(new Error('ImgBB não retornou URL válida'));
            }
            
        } catch (error) {
            console.error('❌ Erro no upload ImgBB:', error);
            reject(error);
        }
    });
}

// ===== VALIDAÇÃO DA API KEY =====
async function validateImgBBKey() {
    try {
        // Criar uma imagem de teste pequena (1x1 pixel transparente)
        const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        
        const formData = new FormData();
        formData.append('image', testImage);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            console.log('✅ API Key do ImgBB válida!');
            return true;
        } else {
            console.error('❌ API Key do ImgBB inválida!');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao validar ImgBB:', error);
        return false;
    }
}

// Validar ao carregar
setTimeout(() => {
    validateImgBBKey();
}, 1000);

console.log('📸 ImgBB configurado e pronto!');
