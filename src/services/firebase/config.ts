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

// Initialize Firebase services
// Safari/iOS (principalmente em PWA, com bloqueadores de conteúdo ou algumas redes)
// às vezes trava o canal de streaming padrão do Firestore por vários segundos.
// A detecção automática troca para long-polling quando isso acontece, sem
// custo em navegadores que funcionam normalmente.
function createFirestore() {
  try {
    return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    // Já inicializado (ex.: hot reload em dev) → reutiliza a instância existente
    return getFirestore(app);
  }
}

export const db = createFirestore();
export const auth = getAuth(app);

export default app;
