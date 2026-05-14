import {
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import db, { bensViaturasCollection, bensPatrimoniaisCollection } from './db';

const stripUndefined = (obj) => {
  const out = {};
  Object.keys(obj).forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
};

const norm = (v) => (typeof v === 'string' ? v.trim() : v ?? '');

export const buildViaturaLabel = (v) => {
  if (!v) return '';
  const prefixo = norm(v.prefixo);
  const placa = norm(v.placa);
  if (prefixo && placa) return `${prefixo} — ${placa}`;
  return prefixo || placa || norm(v.modelo) || 'Viatura sem identificação';
};

export const subscribeBensViaturas = (onData, onError) => {
  const q = query(bensViaturasCollection, orderBy('prefixo_lower'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(items);
    },
    (err) => {
      console.error('Erro ao escutar bens_viaturas:', err);
      if (onError) onError(err);
    }
  );
};

export const createBensViatura = async (data) => {
  try {
    const prefixo = norm(data.prefixo);
    const payload = stripUndefined({
      prefixo,
      placa: norm(data.placa),
      modelo: norm(data.modelo),
      observacoes: norm(data.observacoes),
      prefixo_lower: prefixo.toLowerCase(),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    const ref = await addDoc(bensViaturasCollection, payload);
    return ref.id;
  } catch (err) {
    console.error('Erro ao criar viatura (bens):', err);
    throw err;
  }
};

export const updateBensViatura = async (docId, data) => {
  try {
    const ref = doc(db, 'bens_viaturas', docId);
    const payload = stripUndefined({
      prefixo: data.prefixo !== undefined ? norm(data.prefixo) : undefined,
      placa: data.placa !== undefined ? norm(data.placa) : undefined,
      modelo: data.modelo !== undefined ? norm(data.modelo) : undefined,
      observacoes: data.observacoes !== undefined ? norm(data.observacoes) : undefined,
      updated_at: serverTimestamp(),
    });
    if (data.prefixo !== undefined) {
      payload.prefixo_lower = norm(data.prefixo).toLowerCase();
    }
    await updateDoc(ref, payload);
  } catch (err) {
    console.error('Erro ao atualizar viatura (bens):', err);
    throw err;
  }
};

export const deleteBensViatura = async (docId) => {
  try {
    const ref = doc(db, 'bens_viaturas', docId);
    await deleteDoc(ref);
  } catch (err) {
    console.error('Erro ao excluir viatura (bens):', err);
    throw err;
  }
};

export const getBensViaturaById = async (docId) => {
  try {
    const ref = doc(db, 'bens_viaturas', docId);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error('Erro ao buscar viatura (bens):', err);
    throw err;
  }
};

// Retorna quantos bens patrimoniais estão atualmente alocados nesta viatura.
export const countBensInViatura = async (viaturaId) => {
  if (!viaturaId) return 0;
  try {
    const q = query(bensPatrimoniaisCollection, where('viatura_bens_id', '==', viaturaId));
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    console.error('Erro ao contar bens da viatura:', err);
    return 0;
  }
};

// Lista os bens patrimoniais alocados em uma viatura específica.
export const subscribeBensByViatura = (viaturaId, onData, onError) => {
  if (!viaturaId) {
    onData([]);
    return () => {};
  }
  const q = query(bensPatrimoniaisCollection, where('viatura_bens_id', '==', viaturaId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(items);
    },
    (err) => {
      console.error('Erro ao escutar bens por viatura:', err);
      if (onError) onError(err);
    }
  );
};

// Busca a primeira viatura cujo prefixo (case-insensitive) bata exatamente.
export const findBensViaturaByPrefixo = async (prefixo) => {
  const p = norm(prefixo).toLowerCase();
  if (!p) return null;
  try {
    const q = query(bensViaturasCollection, where('prefixo_lower', '==', p), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  } catch (err) {
    console.error('Erro ao buscar viatura por prefixo:', err);
    return null;
  }
};
