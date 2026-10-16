/**
 * SCRIPT DE MIGRAÇÃO MULTI-TENANT (RAIZ -> SITES/{siteId}/...)
 * 
 * Copia com segurança os dados das coleções globais da raiz para a estrutura isolada por site:
 *   sites/{siteId}/{collection}
 * 
 * REGRAS DE SEGURANÇA:
 * - NUNCA move nem deleta documentos da raiz (somente COPIA idempotente).
 * - Gera backup local em JSON antes de qualquer escrita no modo --execute.
 * - Modo padrão: --dry-run (nenhuma alteração é feita sem --execute).
 * - Verifica as claims de admin antes de prosseguir.
 * - Aborta caso o destino já possua documentos anteriores, a menos que --force seja informado.
 * 
 * Uso:
 *   node scripts/migrate-to-site-layout.mjs [opções]
 * 
 * Opções:
 *   --site <id>     ID do site de destino (padrão: 'meu-site')
 *   --dry-run       Modo simulação (PADRÃO, não altera dados)
 *   --execute       Executa o backup local e a cópia para o Firestore
 *   --verify        Verifica e compara documentos de origem vs destino sem gravar
 *   --force         Permite continuar mesmo se o destino já contiver documentos
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Coleções a migrar da raiz para sites/{siteId}/... ───────────────────────
const COLLECTIONS_TO_MIGRATE = [
  'albums',
  'album_photos',
  'timeline',
  'custom_playlists',
  'playlist_tracks',
  'word_game',
  'game_records',
  'sync_rooms',
  'sync_presence',
  'player_tokens',
  'player_links',
  'cloudinary_deletions_queue',
];

// ─── Parser simples de argumentos de linha de comando ────────────────────────
const args = process.argv.slice(2);

function getArgValue(name, defaultValue = null) {
  const idx = args.indexOf(name);
  if (idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith('--')) {
    return args[idx + 1];
  }
  return defaultValue;
}

const hasFlag = (flag) => args.includes(flag);

const siteId = getArgValue('--site', 'meu-site');
const isExecute = hasFlag('--execute');
const isVerify = hasFlag('--verify');
const isForce = hasFlag('--force');
const isDryRun = hasFlag('--dry-run') || (!isExecute && !isVerify);

// ─── Inicialização do Firebase Admin ─────────────────────────────────────────
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8'));
} catch {
  console.error('❌ ERRO: Arquivo scripts/serviceAccountKey.json não encontrado.');
  console.error('   Baixe a chave de conta de serviço no Firebase Console -> Configurações -> Contas de Serviço.');
  process.exit(1);
}

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const auth = getAuth(app);

// ─── Validação de Admin e Claims ─────────────────────────────────────────────
async function validateAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('⚠️  AVISO: Variável de ambiente ADMIN_EMAIL não definida.');
    console.warn('   Recomenda-se definir ADMIN_EMAIL=<seu-email> para validação de claims.');
    return;
  }

  console.log(`🔍 Verificando credenciais de admin para: ${adminEmail}...`);
  try {
    const user = await auth.getUserByEmail(adminEmail);
    const claims = user.customClaims || {};
    console.log(`   UID: ${user.uid}`);
    console.log(`   Claims: ${JSON.stringify(claims)}`);

    if (claims.siteId && claims.siteId !== siteId) {
      console.error(`❌ ABORTADO: A claim siteId do admin ('${claims.siteId}') é diferente do site alvo ('${siteId}').`);
      process.exit(1);
    }

    if (!claims.siteId) {
      console.log(`   ℹ️  A conta de admin não possui claim siteId explícita. Usando fallback '${siteId}'.`);
    }
  } catch (err) {
    console.error(`❌ Erro ao buscar usuário admin (${adminEmail}):`, err.message);
    process.exit(1);
  }
}

// ─── Verificação de colisão prévia no destino ─────────────────────────────────
async function checkDestinationCollisions() {
  console.log(`\n🔍 Verificando se já existem dados em 'sites/${siteId}/'...`);
  const collisions = {};

  for (const collName of COLLECTIONS_TO_MIGRATE) {
    const targetCollRef = db.collection('sites').doc(siteId).collection(collName);
    const snapshot = await targetCollRef.get();
    const nonPlaceholders = snapshot.docs.filter((d) => !d.id.startsWith('_'));
    if (nonPlaceholders.length > 0) {
      collisions[collName] = nonPlaceholders.map((d) => d.id);
    }
  }

  const collNames = Object.keys(collisions);
  if (collNames.length > 0) {
    console.warn(`\n⚠️  ATENÇÃO: Foram encontrados documentos pré-existentes no destino 'sites/${siteId}/':`);
    for (const [coll, ids] of Object.entries(collisions)) {
      console.warn(`   - ${coll}: ${ids.length} documento(s) (Exemplos: ${ids.slice(0, 5).join(', ')})`);
    }

    if (!isForce) {
      console.error('\n❌ OPERAÇÃO ABORTADA para evitar sobrescrita acidental.');
      console.error('   O script antigo migrate_data.mjs pode ter gravado dados parciais.');
      console.error('   Use a flag --force caso deseje prosseguir e sobrescrever os documentos do destino.');
      process.exit(1);
    } else {
      console.warn('   --force ativo: continuando mesmo com documentos no destino.\n');
    }
  } else {
    console.log('   ✅ Destino limpo ou apenas com placeholders.\n');
  }
}

// ─── Criação de backup local antes de executar ────────────────────────────────
async function createLocalBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = join(__dirname, `backup-${timestamp}`);
  mkdirSync(backupDir, { recursive: true });

  console.log(`\n💾 Criando backup local em: ${backupDir}`);

  for (const collName of COLLECTIONS_TO_MIGRATE) {
    const snap = await db.collection(collName).get();
    const docs = snap.docs.map((d) => ({
      _id: d.id,
      ...d.data(),
    }));

    const filePath = join(backupDir, `${collName}.json`);
    writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
    console.log(`   📦 ${collName}: ${docs.length} documentos salvos em ${filePath}`);
  }

  console.log('✅ Backup local concluído com sucesso.\n');
}

// ─── Execução da Cópia (Idempotente em batches de até 400) ───────────────────
async function executeMigration() {
  console.log(`\n🚀 INICIANDO CÓPIA DE COLEÇÕES: Raiz -> sites/${siteId}/...`);
  const BATCH_SIZE = 400;

  for (const collName of COLLECTIONS_TO_MIGRATE) {
    const sourceSnap = await db.collection(collName).get();
    const docsToCopy = sourceSnap.docs.filter((d) => !d.id.startsWith('_'));

    if (docsToCopy.length === 0) {
      console.log(`   ⚪ ${collName}: 0 documentos na raiz (ignorado).`);
      continue;
    }

    console.log(`   🔄 Copiando ${collName} (${docsToCopy.length} documentos)...`);

    for (let i = 0; i < docsToCopy.length; i += BATCH_SIZE) {
      const chunk = docsToCopy.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const docSnap of chunk) {
        const targetRef = db.collection('sites').doc(siteId).collection(collName).doc(docSnap.id);
        batch.set(targetRef, docSnap.data(), { merge: true });
      }

      await batch.commit();
      console.log(`      ↳ Batch gravado: ${Math.min(i + BATCH_SIZE, docsToCopy.length)} / ${docsToCopy.length}`);
    }

    console.log(`   ✅ ${collName}: concluído com sucesso.`);
  }

  console.log('\n🎉 Migração concluída com sucesso!');
}

// ─── Verificação e Comparação (--verify) ──────────────────────────────────────
async function verifyMigration() {
  console.log(`\n🔎 VERIFICAÇÃO DE INTEGRIDADE (Origem vs sites/${siteId}/...):`);
  console.log('═'.repeat(70));
  console.log(`${'Coleção'.padEnd(28)} | ${'Origem'.padEnd(10)} | ${'Destino'.padEnd(10)} | Status`);
  console.log('─'.repeat(70));

  let totalSource = 0;
  let totalTarget = 0;
  let allMatched = true;

  for (const collName of COLLECTIONS_TO_MIGRATE) {
    const sourceSnap = await db.collection(collName).get();
    const sourceDocs = sourceSnap.docs.filter((d) => !d.id.startsWith('_'));
    const sourceIds = new Set(sourceDocs.map((d) => d.id));

    const targetSnap = await db.collection('sites').doc(siteId).collection(collName).get();
    const targetDocs = targetSnap.docs.filter((d) => !d.id.startsWith('_'));
    const targetIds = new Set(targetDocs.map((d) => d.id));

    totalSource += sourceDocs.length;
    totalTarget += targetDocs.length;

    let isMatch = sourceDocs.length === targetDocs.length;
    if (isMatch) {
      for (const id of sourceIds) {
        if (!targetIds.has(id)) {
          isMatch = false;
          break;
        }
      }
    }

    if (!isMatch) allMatched = false;

    const statusStr = isMatch ? '✅ OK' : '⚠️ DIVERGÊNCIA';
    console.log(
      `${collName.padEnd(28)} | ${String(sourceDocs.length).padEnd(10)} | ${String(targetDocs.length).padEnd(10)} | ${statusStr}`
    );
  }

  console.log('═'.repeat(70));
  console.log(`Total geral: Origem = ${totalSource} docs | Destino = ${totalTarget} docs`);
  if (allMatched) {
    console.log('✅ Todos os documentos e IDs conferem perfeitamente entre raiz e destino.');
  } else {
    console.warn('⚠️ Foram encontradas divergências nas contagens ou IDs.');
  }
}

// ─── Modo Simulação (--dry-run) ──────────────────────────────────────────────
async function runDryRun() {
  console.log(`\n📋 MODO SIMULAÇÃO (--dry-run) — NENHUMA ALTERAÇÃO SERÁ FEITA NO BANCO.`);
  console.log(`Alvo planejado: sites/${siteId}/...`);
  console.log('═'.repeat(70));
  console.log(`${'Coleção'.padEnd(30)} | Documentos a copiar da raiz`);
  console.log('─'.repeat(70));

  let total = 0;
  for (const collName of COLLECTIONS_TO_MIGRATE) {
    const snap = await db.collection(collName).get();
    const docs = snap.docs.filter((d) => !d.id.startsWith('_'));
    total += docs.length;
    console.log(`${collName.padEnd(30)} | ${docs.length} documento(s)`);
  }

  console.log('═'.repeat(70));
  console.log(`Total de documentos a serem copiados: ${total}`);
  console.log('\nPara executar de verdade com backup local automático, execute:');
  console.log(`  node scripts/migrate-to-site-layout.mjs --site ${siteId} --execute`);
  console.log('\nPara apenas verificar os dados após migração:');
  console.log(`  node scripts/migrate-to-site-layout.mjs --site ${siteId} --verify\n`);
}

// ─── Fluxo Principal ─────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('           ROMANTIC ENGINE — MIGRAÇÃO DE LAYOUT MULTI-TENANT           ');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`Site Alvo: '${siteId}'`);
  console.log(`Modo: ${isExecute ? '🚀 EXECUTE' : isVerify ? '🔎 VERIFY' : '🛡️ DRY-RUN'}`);

  await validateAdmin();

  if (isVerify) {
    await verifyMigration();
    return;
  }

  if (isDryRun) {
    await runDryRun();
    return;
  }

  if (isExecute) {
    await checkDestinationCollisions();
    await createLocalBackup();
    await executeMigration();
    await verifyMigration();
  }
}

main().catch((err) => {
  console.error('\n❌ Erro fatal durante o processo:', err);
  process.exit(1);
});
