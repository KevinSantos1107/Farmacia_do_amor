import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
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
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
