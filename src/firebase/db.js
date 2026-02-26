import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
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
export const auth = getAuth(app);

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

// --- COLEÇÃO DE SENHAS (apenas admingeral pode ler via Firestore rules) ---
export const userSecretsCollection = collection(db, 'user_secrets');
// ------------------------------------

// Expor no window para debug no console do navegador
window.__fb = { db, auth, collection, getDocs };

export default db;