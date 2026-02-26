import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, deleteUser } from 'firebase/auth';
import { auth, firebaseConfig } from './db';

const AUTH_SALT = 'cocg-demop-auth-2024';

function getAuthPassword(email) {
  return btoa(email + ':' + AUTH_SALT).slice(0, 30);
}

export async function firebaseAuthSignIn(email) {
  const pwd = getAuthPassword(email);
  try {
    await signInWithEmailAndPassword(auth, email, pwd);
  } catch (error) {
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
      await createUserWithEmailAndPassword(auth, email, pwd);
    }
  }
}

export async function firebaseAuthCreateUser(email) {
  const tempApp = initializeApp(firebaseConfig, 'temp-create-' + Date.now());
  const tempAuth = getAuth(tempApp);
  try {
    const pwd = getAuthPassword(email);
    await createUserWithEmailAndPassword(tempAuth, email, pwd);
  } catch (error) {
    console.error('Erro ao criar usuário no Firebase Auth:', error);
  } finally {
    try { await signOut(tempAuth); } catch { /* ignore */ }
    await deleteApp(tempApp);
  }
}

export async function firebaseAuthDeleteUser(email) {
  const tempApp = initializeApp(firebaseConfig, 'temp-delete-' + Date.now());
  const tempAuth = getAuth(tempApp);
  try {
    const pwd = getAuthPassword(email);
    await signInWithEmailAndPassword(tempAuth, email, pwd);
    if (tempAuth.currentUser) {
      await deleteUser(tempAuth.currentUser);
    }
  } catch (error) {
    console.error('Erro ao deletar usuário do Firebase Auth:', error);
  } finally {
    await deleteApp(tempApp);
  }
}

export async function firebaseAuthSignOut() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Erro ao sair do Firebase Auth:', error);
  }
}
