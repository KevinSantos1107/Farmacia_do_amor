import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

// Garante que o aplicativo não inicialize com credenciais vazias ou mascaradas
if (!apiKey || !projectId) {
  const missing = [
    !apiKey && 'VITE_FIREBASE_API_KEY',
    !projectId && 'VITE_FIREBASE_PROJECT_ID',
  ]
    .filter(Boolean)
    .join(', ');

  throw new Error(
    `[Firebase Config] Variáveis de ambiente obrigatórias ausentes: ${missing}. ` +
      'Configure seu arquivo .env com base no .env.example.'
  );
}

const firebaseConfig = {
  apiKey,
  authDomain: authDomain || `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: storageBucket || `${projectId}.firebasestorage.app`,
  messagingSenderId: messagingSenderId || '',
  appId: appId || '',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

function isAppleOrSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // Detecta iPhone, iPad, iPod ou navegador Safari (mobile ou desktop)
  const isApple = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return isApple || isSafari;
}

// Initialize Firebase services
// No iOS/Safari (WebKit), o streaming contínuo padrão do WebChannel do Firestore sofre com
// retenção de buffer e travamentos de socket, fazendo as consultas travarem por até 2 MINUTOS
// (timeout de streaming do backend) antes de cair no fallback.
// Forçar long-polling direto (experimentalForceLongPolling) no iOS/Safari elimina essa espera
// de 2 minutos e faz as consultas (como as fotos dos álbuns) responderem de imediato (~100ms).
function createFirestore() {
  try {
    if (isAppleOrSafari()) {
      return initializeFirestore(app, {
        experimentalForceLongPolling: true,
        experimentalLongPollingOptions: {
          timeoutSeconds: 15,
        },
      });
    }
    return initializeFirestore(app, {});
  } catch {
    // Já inicializado (ex.: hot reload em dev) → reutiliza a instância existente
    return getFirestore(app);
  }
}

export const db = createFirestore();
export const auth = getAuth(app);

export default app;
