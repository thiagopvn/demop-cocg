import { initializeApp } from 'firebase/app';
import { getFirestore, collection } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const usersCollection = collection(db, 'users');
export const materialsCollection = collection(db, 'materials');
export const categoriesCollection = collection(db, 'categorias');
export const viaturasCollection = collection(db, 'viaturas');
export const movimentacoesCollection = collection(db, 'movimentacoes');
export const ringsCollection = collection(db, 'rings');

// --- NOVAS COLEÇÕES PARA MANUTENÇÃO ---
export const manutencoesCollection = collection(db, 'manutencoes');
export const historicoManutencoesCollection = collection(db, 'historico_manutencoes');
// ------------------------------------

export default db;