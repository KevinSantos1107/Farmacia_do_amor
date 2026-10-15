import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Carrega as variáveis do .env na raiz do projeto
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { VITE_FIREBASE_PROJECT_ID, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("ERRO: CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET devem estar no arquivo .env");
  process.exit(1);
}

if (!process.env.VITE_CLOUDINARY_CLOUD_NAME) {
  console.error("ERRO: VITE_CLOUDINARY_CLOUD_NAME deve estar configurado no arquivo .env");
  process.exit(1);
}

// Configura o Cloudinary com credenciais completas
cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true
});

// Inicializa o Firebase Admin usando a flag que usa o projeto padrão e auth local (se disponível)
// ou requer o serviceAccountKey.json
let app;
try {
  const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    app = initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("Firebase Admin inicializado com serviceAccountKey.json");
  } else {
    // Fallback: se não tiver serviceAccountKey, tenta com credenciais padrão do ambiente
    console.log("AVISO: serviceAccountKey.json não encontrado. Tentando inicializar com Application Default Credentials (ADC)...");
    console.log("Se falhar, crie o arquivo serviceAccountKey.json na raiz do projeto (gerado no painel do Firebase > Configurações do Projeto > Contas de Serviço).");
    app = initializeApp();
  }
} catch (e) {
  console.error("Falha ao inicializar Firebase Admin:", e.message);
  process.exit(1);
}

const db = getFirestore(app);

async function runCleanup() {
  console.log("Iniciando varredura da fila de deleção do Cloudinary...");
  const queueRef = db.collection('cloudinary_deletions_queue');
  const snapshot = await queueRef.get();

  if (snapshot.empty) {
    console.log("Nenhum item na fila de deleção.");
    return;
  }

  console.log(`Encontrados ${snapshot.size} itens na fila. Processando...`);

  let successCount = 0;
  let errorCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const publicId = data.publicId;

    if (!publicId) {
      console.warn(`Doc ${doc.id} ignorado pois não possui publicId.`);
      continue;
    }

    try {
      // 1. Deletar do Cloudinary
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok' || result.result === 'not found') {
        // 2. Se a deleção foi bem-sucedida ou se a imagem já não existia mais, remover da fila
        await queueRef.doc(doc.id).delete();
        console.log(`✅ [${doc.id}] Imagem deletada com sucesso: ${publicId}`);
        successCount++;
      } else {
        console.error(`❌ [${doc.id}] Erro retornado pelo Cloudinary para ${publicId}:`, result);
        errorCount++;
      }
    } catch (e) {
      console.error(`❌ [${doc.id}] Falha ao processar ${publicId}:`, e.message);
      errorCount++;
    }
  }

  console.log("-----------------------------------------");
  console.log("Varredura concluída!");
  console.log(`✅ Sucesso: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  if (errorCount > 0) {
    console.log("Os itens com erro permaneceram na fila para a próxima execução.");
  }
}

runCleanup().catch(e => {
  console.error("Erro fatal durante a execução:", e);
  process.exit(1);
});
