import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8'));
} catch {
  console.error('❌ ERRO: Arquivo serviceAccountKey.json não encontrado em scripts/');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });

const email = process.env.ADMIN_EMAIL || process.argv[2];
const newPassword = process.env.ADMIN_PASSWORD || process.argv[3];

if (!email || !newPassword) {
  console.error('❌ ERRO: Informe o e-mail e a nova senha.');
  console.error('   Uso: node scripts/update_password.mjs <email> <nova_senha>');
  console.error('   Ou defina ADMIN_EMAIL e ADMIN_PASSWORD no ambiente/.env');
  process.exit(1);
}

async function updatePassword() {
  try {
    const user = await getAuth().getUserByEmail(email);
    await getAuth().updateUser(user.uid, {
      password: newPassword,
    });
    console.log(`Senha atualizada com sucesso para: ${email}`);
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
  }
}

updatePassword();
