import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCgt_eD3M_n9bhuhSzOxpf5f_ck43ZZZ-o',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'kevin-iara-site.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'kevin-iara-site',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'kevin-iara-site.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '236663809364',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:236663809364:web:c0103bf11a1c37064214c1',
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
    return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    // Já inicializado (ex.: hot reload em dev) → reutiliza a instância existente
    return getFirestore(app);
  }
}

export const db = createFirestore();
export const auth = getAuth(app);

export default app;
