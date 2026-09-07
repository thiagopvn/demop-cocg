import { doc, setDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import db from '../firebase/db';

/**
 * Notificações push (Firebase Cloud Messaging) para as mensagens do chat.
 * Precisa da chave Web Push (VAPID) em VITE_FIREBASE_VAPID_KEY. Sem a chave,
 * o app segue só com as notificações internas (badge + som).
 */
const CHAVE_TOKEN = 'demop-fcm-token';
const VAPID = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export const pushDisponivel = () =>
    typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window && Boolean(VAPID);

export const pushPermissao = () => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

let messagingPromise = null;
async function obterMessaging() {
    if (!messagingPromise) {
        messagingPromise = (async () => {
            const { getMessaging, isSupported } = await import('firebase/messaging');
            if (!(await isSupported())) return null;
            const { getApp } = await import('firebase/app');
            return getMessaging(getApp());
        })();
    }
    return messagingPromise;
}

/** Espera o service worker do push ficar ativo (senão o PushManager recusa a inscrição). */
const aguardarAtivo = (registration) => new Promise((resolve) => {
    if (registration.active) { resolve(); return; }
    const sw = registration.installing || registration.waiting;
    if (!sw) { resolve(); return; }
    const t = setTimeout(resolve, 10000);
    sw.addEventListener('statechange', () => { if (sw.state === 'activated') { clearTimeout(t); resolve(); } });
});

/** Pede permissão (se necessário) e registra o token deste aparelho para o militar. */
export async function ativarPush(userId) {
    if (!pushDisponivel() || !userId) return { ok: false, motivo: 'indisponivel' };
    const permissao = await Notification.requestPermission();
    if (permissao !== 'granted') return { ok: false, motivo: permissao };
    try {
        const messaging = await obterMessaging();
        if (!messaging) return { ok: false, motivo: 'indisponivel' };
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/firebase-cloud-messaging-push-scope' });
        await aguardarAtivo(registration);
        const { getToken } = await import('firebase/messaging');
        const token = await getToken(messaging, { vapidKey: VAPID, serviceWorkerRegistration: registration });
        if (!token) return { ok: false, motivo: 'sem-token' };
        const anterior = localStorage.getItem(CHAVE_TOKEN);
        const ref = doc(db, 'fcm_tokens', userId);
        if (anterior && anterior !== token) await setDoc(ref, { tokens: arrayRemove(anterior) }, { merge: true });
        await setDoc(ref, { tokens: arrayUnion(token), atualizado_em: serverTimestamp(), plataforma: navigator.userAgent.slice(0, 120) }, { merge: true });
        localStorage.setItem(CHAVE_TOKEN, token);
        return { ok: true, token };
    } catch (e) {
        console.warn('push:', e?.message || e);
        return { ok: false, motivo: 'erro', erro: e };
    }
}

/** Remove o token deste aparelho (logout). */
export async function desativarPushDesteAparelho(userId) {
    const token = localStorage.getItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_TOKEN);
    if (!userId || !token) return;
    try { await setDoc(doc(db, 'fcm_tokens', userId), { tokens: arrayRemove(token) }, { merge: true }); } catch { /* ignora */ }
}

/** Mensagens recebidas com o app aberto (em primeiro plano). */
export async function aoReceberPushEmPrimeiroPlano(cb) {
    if (!pushDisponivel()) return () => {};
    try {
        const messaging = await obterMessaging();
        if (!messaging) return () => {};
        const { onMessage } = await import('firebase/messaging');
        return onMessage(messaging, (payload) => cb(payload));
    } catch {
        return () => {};
    }
}
