import { doc, setDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import db from '../firebase/db';

/**
 * Presença e sessões.
 *  - presenca/{userId}: online, última atividade, último login/logout (todos leem).
 *  - sessoes/{id}: uma por login (aba), com início, fim e como terminou (só admingeral lê).
 * O batimento roda a cada minuto enquanto o app está aberto; sessões sem batimento
 * há mais de 3 minutos são encerradas pela Cloud Function encerrarSessoesInativas.
 */
const CHAVE_SESSAO = 'demop-sessao-id';
const INTERVALO_MS = 60 * 1000;
export const LIMITE_ONLINE_MS = 3 * 60 * 1000;

const plataforma = () => {
    const ua = navigator.userAgent || '';
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const mobile = /android|iphone|ipad|ipod/i.test(ua);
    if (standalone) return mobile ? 'app' : 'app-desktop';
    return mobile ? 'celular' : 'computador';
};

export const estaOnline = (p) => {
    if (!p || !p.online) return false;
    const t = p.ultima_atividade?.toDate?.() || null;
    return Boolean(t) && Date.now() - t.getTime() < LIMITE_ONLINE_MS;
};

/** Inicia (ou retoma) a sessão desta aba e devolve uma função para parar o batimento. */
export function iniciarPresenca(user) {
    if (!user?.userId) return () => {};
    const userId = user.userId;
    const base = { userId, nome: user.fullName || user.username || '', username: user.username || '', role: user.role || 'user', OBM: user.obm || '', foto_url: user.fotoUrl || null };
    let sessaoId = sessionStorage.getItem(CHAVE_SESSAO) || null;
    let parado = false;
    let timer = null;

    const bater = async () => {
        if (parado || document.visibilityState === 'hidden') return;
        try {
            if (!sessaoId) {
                const ref = await addDoc(collection(db, 'sessoes'), { ...base, inicio: serverTimestamp(), ultima_atividade: serverTimestamp(), fim: null, ativa: true, plataforma: plataforma(), userAgent: (navigator.userAgent || '').slice(0, 200) });
                sessaoId = ref.id;
                sessionStorage.setItem(CHAVE_SESSAO, sessaoId);
                await setDoc(doc(db, 'presenca', userId), { ...base, online: true, ultima_atividade: serverTimestamp(), ultimo_login: serverTimestamp(), sessaoId, plataforma: plataforma(), encerrada_por: null }, { merge: true });
            } else {
                await setDoc(doc(db, 'presenca', userId), { ...base, online: true, ultima_atividade: serverTimestamp(), sessaoId, plataforma: plataforma() }, { merge: true });
                await updateDoc(doc(db, 'sessoes', sessaoId), { ultima_atividade: serverTimestamp(), ativa: true }).catch(() => {});
            }
        } catch (e) {
            // Sem permissão ou offline: tenta no próximo batimento
            if (import.meta.env.DEV) console.warn('presenca:', e?.message);
        }
    };

    const aoVoltar = () => { if (document.visibilityState === 'visible') bater(); };
    bater();
    timer = setInterval(bater, INTERVALO_MS);
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);

    return () => {
        parado = true;
        if (timer) clearInterval(timer);
        document.removeEventListener('visibilitychange', aoVoltar);
        window.removeEventListener('focus', aoVoltar);
    };
}

/** Marca a saída (logout explícito). */
export async function encerrarPresenca(userId) {
    const sessaoId = sessionStorage.getItem(CHAVE_SESSAO);
    sessionStorage.removeItem(CHAVE_SESSAO);
    if (!userId) return;
    try {
        await setDoc(doc(db, 'presenca', userId), { online: false, ultimo_logout: serverTimestamp(), encerrada_por: 'logout' }, { merge: true });
        if (sessaoId) await updateDoc(doc(db, 'sessoes', sessaoId), { fim: serverTimestamp(), ativa: false, encerrada_por: 'logout' });
    } catch { /* ignora */ }
}
