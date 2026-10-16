/**
 * SCRIPT DE SETUP INICIAL — Romantic Engine
 * 
 * Executa UMA VEZ para:
 * 1. Criar o documento sites/meu-site no Firestore
 * 2. Criar o usuário Super Admin no Firebase Auth
 * 3. Definir Custom Claims (role: super_admin)
 * 
 * Pré-requisitos:
 * - Node.js instalado
 * - Arquivo serviceAccountKey.json na pasta scripts/ (baixado do Firebase Console)
 * 
 * Como baixar a serviceAccountKey:
 * Firebase Console → Configurações do Projeto → Contas de Serviço → Gerar nova chave privada
 * 
 * Uso: node scripts/seed.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CONFIGURAÇÃO ───────────────────────────────────────────────────────────
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.argv[2];
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.argv[3];
const SITE_ID = process.env.VITE_SITE_ID || 'meu-site';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ ERRO: ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórios.');
  console.error('   Uso: node scripts/seed.mjs <admin-email> <admin-password>');
  console.error('   Ou defina as variáveis de ambiente: ADMIN_EMAIL e ADMIN_PASSWORD');
  process.exit(1);
}
// ────────────────────────────────────────────────────────────────────────────

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8'));
} catch {
  console.error('❌ ERRO: Arquivo serviceAccountKey.json não encontrado em scripts/');
  console.error('   Baixe em: Firebase Console → Configurações → Contas de Serviço → Gerar nova chave');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const authAdmin = getAuth();

// ─── Dados iniciais do site ──────────────────────────────────────────────────
const initialSiteConfig = {
  id: SITE_ID,
  couple: {
    partner1: { name: 'Parceiro 1' },
    partner2: { name: 'Parceiro 2' },
  },
  relationship: {
    startDate: '2025-10-27',
  },
  theme: {
    colors: {
      bg: '#0f172a',
      primary: '#e11d48',
      secondary: '#f43f5e',
      accent: '#fb7185',
      text: '#f8fafc',
      textSecondary: '#94a3b8',
      cardBg: '#1e293b',
      cardBorder: '#334155',
    },
  },
  features: {
    enableTimeline: true,
    enableMap: true,
    enableGames: true,
    enableMusic: true,
    enableAlbum: true,
  },
  _meta: {
    createdAt: new Date().toISOString(),
    version: '2.0',
  },
};

async function run() {
  console.log('\n🚀 Romantic Engine — Script de Setup Inicial\n');

  // 1. Criar documento no Firestore
  console.log(`📄 Criando documento Firestore: sites/${SITE_ID}...`);
  await db.collection('sites').doc(SITE_ID).set(initialSiteConfig, { merge: true });
  console.log('   ✅ Documento criado com sucesso.\n');

  // 2. Criar usuário Super Admin
  console.log(`👤 Criando usuário Super Admin: ${ADMIN_EMAIL}...`);
  let user;
  let isNewUser = false;
  try {
    user = await authAdmin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: 'Super Admin',
    });
    isNewUser = true;
    console.log(`   ✅ Usuário criado: ${user.uid}\n`);
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      user = await authAdmin.getUserByEmail(ADMIN_EMAIL);
      console.log(`   ⚠️  Usuário já existe: ${user.uid}. Atualizando claims...\n`);
    } else {
      throw err;
    }
  }

  // 3. Definir Custom Claims
  if (isNewUser) {
    console.log(`🔑 Definindo Custom Claims para novo usuário (role: super_admin, siteId: ${SITE_ID})...`);
    await authAdmin.setCustomUserClaims(user.uid, { role: 'super_admin', siteId: SITE_ID });
  } else {
    console.log('🔑 Atualizando claims de usuário existente (role: super_admin)...');
    await authAdmin.setCustomUserClaims(user.uid, { role: 'super_admin' });
  }
  console.log('   ✅ Claims definidas.\n');

  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Setup concluído com sucesso!\n');
  console.log('   Acesse: http://localhost:5173/admin/login');
  console.log(`   E-mail: ${ADMIN_EMAIL}`);
  console.log('   Senha:  [definida via argumento/ambiente]');
  console.log('\n⚠️  IMPORTANTE: Troque a senha após o primeiro login!');
  console.log('═══════════════════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('\n❌ Erro durante o setup:', err.message);
  process.exit(1);
});
