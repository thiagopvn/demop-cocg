import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import db from './db';

const bensDivergentesCollection = collection(db, 'bens_divergentes');

const stripUndefined = (obj) => {
  const out = {};
  Object.keys(obj).forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
};

const normalizeText = (v) => (typeof v === 'string' ? v.trim() : v ?? '');

export const subscribeBensDivergentes = (onData, onError) => {
  const q = query(bensDivergentesCollection, orderBy('created_at', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(items);
    },
    (err) => {
      console.error('Erro ao escutar bens_divergentes:', err);
      if (onError) onError(err);
    }
  );
};

export const createBemDivergente = async (data, userInfo = null) => {
  try {
    const payload = stripUndefined({
      descricao: normalizeText(data.descricao),
      quantidade: Number.isFinite(Number(data.quantidade)) ? Number(data.quantidade) : 1,
      observacoes: normalizeText(data.observacoes),
      localidade: normalizeText(data.localidade),
      viatura_bens_id: data.viatura_bens_id || null,
      viatura_bens_nome: data.viatura_bens_nome ? normalizeText(data.viatura_bens_nome) : '',
      created_by_id: userInfo?.userId || null,
      created_by_nome: userInfo?.userName || '',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    const ref = await addDoc(bensDivergentesCollection, payload);
    return ref.id;
  } catch (err) {
    console.error('Erro ao criar item divergente:', err);
    throw err;
  }
};

export const updateBemDivergente = async (docId, data) => {
  try {
    const ref = doc(db, 'bens_divergentes', docId);
    const payload = stripUndefined({
      descricao: data.descricao !== undefined ? normalizeText(data.descricao) : undefined,
      quantidade:
        data.quantidade !== undefined && Number.isFinite(Number(data.quantidade))
          ? Number(data.quantidade)
          : undefined,
      observacoes:
        data.observacoes !== undefined ? normalizeText(data.observacoes) : undefined,
      localidade:
        data.localidade !== undefined ? normalizeText(data.localidade) : undefined,
      viatura_bens_id:
        data.viatura_bens_id !== undefined ? data.viatura_bens_id || null : undefined,
      viatura_bens_nome:
        data.viatura_bens_nome !== undefined
          ? normalizeText(data.viatura_bens_nome)
          : undefined,
      updated_at: serverTimestamp(),
    });
    await updateDoc(ref, payload);
  } catch (err) {
    console.error('Erro ao atualizar item divergente:', err);
    throw err;
  }
};

export const deleteBemDivergente = async (docId) => {
  try {
    const ref = doc(db, 'bens_divergentes', docId);
    await deleteDoc(ref);
  } catch (err) {
    console.error('Erro ao excluir item divergente:', err);
    throw err;
  }
};
