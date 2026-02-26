import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from './db';

export async function firebaseAuthSignIn(customToken) {
  if (!customToken) return;
  await signInWithCustomToken(auth, customToken);
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
