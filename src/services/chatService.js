import {
    doc, collection, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, writeBatch,
} from 'firebase/firestore';
import db from '../firebase/db';
import { logAudit } from '../firebase/auditLog';

/** Id determinístico da conversa/amizade entre dois militares. */
export const idPar = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);

export const PAPEIS_QUE_INICIAM_COM_QUALQUER_UM = ['admingeral', 'admin'];

/** Quem pode iniciar conversa com quem (mesma regra do firestore.rules): admins com todos; os demais com administradores ou amigos. */
export const podeIniciarConversa = ({ meuRole, outroRole, amigos }) =>
    PAPEIS_QUE_INICIAM_COM_QUALQUER_UM.includes(meuRole) || PAPEIS_QUE_INICIAM_COM_QUALQUER_UM.includes(outroRole) || Boolean(amigos);

const infoUsuario = (u) => ({ nome: u?.full_name || u?.username || 'Militar', username: u?.username || '', foto: u?.foto_url || null, role: u?.role || 'user' });

/** Garante que a conversa existe (cria se necessário) e devolve o id. */
export async function abrirConversa(euId, outroId) {
    const id = idPar(euId, outroId);
    const ref = doc(db, 'conversas', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, { participantes: [euId, outroId].sort(), tipo: 'direta', criada_em: serverTimestamp(), atualizada_em: serverTimestamp(), ultima: null, naoLidas: { [euId]: 0, [outroId]: 0 } });
    }
    return id;
}

/** Escuta as conversas do militar (mais recentes primeiro). */
export function escutarConversas(euId, cb, onErro) {
    const q = query(collection(db, 'conversas'), where('participantes', 'array-contains', euId), orderBy('atualizada_em', 'desc'), limit(200));
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onErro);
}

/** Escuta as mensagens de uma conversa (ordem cronológica). */
export function escutarMensagens(conversaId, cb, onErro, maximo = 300) {
    const q = query(collection(db, 'conversas', conversaId, 'mensagens'), orderBy('criada_em', 'asc'), limit(maximo));
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onErro);
}

/** Envia uma mensagem (texto ou card) e atualiza o resumo da conversa. */
export async function enviarMensagem({ conversaId, de, deNome, para, texto = '', tipo = 'texto', card = null }) {
    const convRef = doc(db, 'conversas', conversaId);
    const msgRef = doc(collection(convRef, 'mensagens'));
    const batch = writeBatch(db);
    const resumo = tipo === 'cobranca' ? (card?.subtipo === 'devolucao' ? 'Cobrança de devolução' : 'Cobrança de assinatura')
        : tipo === 'transferencia' ? `Transferência: ${card?.material_description || 'cautela'}`
            : texto;
    batch.set(msgRef, { de, de_nome: deNome || '', para, texto, tipo, card, criada_em: serverTimestamp(), lida: false });
    batch.set(convRef, {
        participantes: [de, para].sort(), tipo: 'direta', atualizada_em: serverTimestamp(),
        ultima: { texto: String(resumo).slice(0, 140), de, em: serverTimestamp(), tipo },
        naoLidas: { [para]: increment(1), [de]: 0 },
    }, { merge: true });
    await batch.commit();
    return msgRef.id;
}

/** Zera as não lidas de quem abriu a conversa. */
export async function marcarConversaLida(conversaId, euId) {
    try { await updateDoc(doc(db, 'conversas', conversaId), { [`naoLidas.${euId}`]: 0 }); } catch { /* sem permissão ainda */ }
}

// ------------------------------------------------------------------ amizades
export function escutarAmizades(euId, cb, onErro) {
    const q = query(collection(db, 'amizades'), where('usuarios', 'array-contains', euId));
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onErro);
}

export async function pedirAmizade(eu, outro) {
    const id = idPar(eu.userId, outro.id);
    await setDoc(doc(db, 'amizades', id), {
        usuarios: [eu.userId, outro.id].sort(), solicitante: eu.userId, solicitante_nome: eu.fullName || eu.username || '', destinatario: outro.id, destinatario_nome: outro.full_name || outro.username || '',
        status: 'pendente', criada_em: serverTimestamp(), aceita_em: null,
    });
    logAudit({ action: 'amizade_solicitada', userId: eu.userId, userName: eu.username, targetCollection: 'amizades', targetId: id, targetName: outro.full_name || outro.username, details: {} });
    return id;
}

export async function aceitarAmizade(amizade, eu) {
    await updateDoc(doc(db, 'amizades', amizade.id), { status: 'aceita', aceita_em: serverTimestamp() });
    logAudit({ action: 'amizade_aceita', userId: eu.userId, userName: eu.username, targetCollection: 'amizades', targetId: amizade.id, targetName: amizade.solicitante_nome || '', details: {} });
}

export async function desfazerAmizade(amizadeId) {
    await deleteDoc(doc(db, 'amizades', amizadeId));
}

// ------------------------------------------------------------------ pendências de um militar (para cobrar)
export async function cautelasPendentesDe(userId, { apenasNaoAssinadas = false } = {}) {
    const base = [where('user', '==', userId), where('status', '==', 'cautelado')];
    if (apenasNaoAssinadas) base.push(where('signed', '==', false));
    const snap = await getDocs(query(collection(db, 'movimentacoes'), ...base));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((m) => m.type === 'cautela').sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));
}

export const cardDeCautela = (m, subtipo) => ({
    subtipo, movimentacaoId: m.id, material_description: m.material_description || '', quantidade: m.quantity || 0,
    data: m.date?.toDate?.() ? m.date.toDate().toISOString() : null, signed: Boolean(m.signed), status: m.status || 'cautelado',
});

/** Texto padrão da cobrança. */
export const textoCobranca = (nome, m, subtipo) => {
    const data = m.date?.toDate?.() ? m.date.toDate().toLocaleDateString('pt-BR') : '';
    const primeiro = String(nome || '').split(' ')[0];
    if (subtipo === 'devolucao') return `${primeiro}, a cautela de ${m.material_description} (${m.quantity} un.)${data ? `, feita em ${data},` : ''} ainda está em aberto. Por favor, devolva o material no DEMOP.`;
    return `${primeiro}, você tem uma cautela pendente de assinatura: ${m.material_description} (${m.quantity} un.)${data ? `, de ${data}` : ''}. Assine pelo app, na tela inicial em "Suas pendências", ou pelo botão abaixo.`;
};

// ------------------------------------------------------------------ transferência de cautela
export const PASSAGENS_MAX = 3;
export const PAPEIS_DEMOP = ['admingeral', 'admin', 'BensPatrimoniais'];
export const podeTransferirCautela = (m) => Boolean(m) && m.status === 'cautelado' && Boolean(m.signed) && (Number(m.passagens) || 0) < PASSAGENS_MAX;
/** Para quem posso transferir: amigos ou qualquer militar do DEMOP (admin / Bens / admingeral). */
export const podeTransferirPara = ({ outroRole, amigos }) => Boolean(amigos) || PAPEIS_DEMOP.includes(outroRole);

/** Pede a transferência pela Cloud Function (que confere a senha de quem envia e cria o card no chat). */
export async function solicitarTransferencia({ amigo, cautela, senha }) {
    if (!podeTransferirCautela(cautela)) throw new Error('Só cautelas assinadas e com menos de 3 passagens podem ser transferidas.');
    const { callSolicitarTransferencia } = await import('../firebase/functions');
    return callSolicitarTransferencia({ movimentacaoId: cautela.id, para: amigo.id, senha });
}

export async function cancelarTransferencia(transferenciaId) {
    await updateDoc(doc(db, 'transferencias', transferenciaId), { status: 'cancelada', respondida_em: serverTimestamp() });
}

// ------------------------------------------------------------------ presença
export function escutarPresencaOnline(cb, onErro) {
    const q = query(collection(db, 'presenca'), where('online', '==', true));
    return onSnapshot(q, (snap) => { const mapa = new Map(); snap.forEach((d) => mapa.set(d.id, { id: d.id, ...d.data() })); cb(mapa); }, onErro);
}

export { infoUsuario };
