import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './db';

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
  // Force refresh token to get latest Custom Claims
  if (auth.currentUser) {
    await auth.currentUser.getIdToken(true);
  }
}

export async function firebaseAuthSignOut() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Erro ao sair do Firebase Auth:', error);
  }
}
