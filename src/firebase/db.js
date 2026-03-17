import { initializeApp } from 'firebase/app';
import { getFirestore, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

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
export const auth = getAuth(app);
export const storage = getStorage(app);

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

// --- COLEÇÃO DE MATERIAIS EM VIATURAS ---
export const viaturaMaterialsCollection = collection(db, 'viatura_materiais');
// ------------------------------------

// --- COLEÇÃO DE CONFERÊNCIAS DE VIATURAS ---
export const conferenciasViaturasCollection = collection(db, 'conferencias_viaturas');
// ------------------------------------

// --- COLEÇÃO DE SENHAS (apenas admingeral pode ler via Firestore rules) ---
export const userSecretsCollection = collection(db, 'user_secrets');
// ------------------------------------

// --- COLEÇÃO DE TAREFAS/ORDENS DO DEMOP ---
export const tarefasDemopCollection = collection(db, 'tarefas_demop');
// ------------------------------------

export default db;