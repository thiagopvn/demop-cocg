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
  writeBatch,
} from 'firebase/firestore';
import db, { bensPatrimoniaisCollection } from './db';

const BATCH_LIMIT = 400;

const stripUndefined = (obj) => {
  const out = {};
  Object.keys(obj).forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
};

const normalizeText = (v) => (typeof v === 'string' ? v.trim() : v ?? '');

const buildSearchableFields = (data) => ({
  descricao_lower: (data.descricao || '').toString().toLowerCase().trim(),
});

export const subscribeBensPatrimoniais = (onData, onError) => {
  const q = query(bensPatrimoniaisCollection, orderBy('descricao_lower'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(items);
    },
    (err) => {
      console.error('Erro ao escutar bens_patrimoniais:', err);
      if (onError) onError(err);
    }
  );
};

export const getBemPatrimonialById = async (docId) => {
  try {
    const ref = doc(db, 'bens_patrimoniais', docId);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error('Erro ao buscar bem patrimonial:', err);
    throw err;
  }
};

export const findByIdPatrimonio = async (idPatrimonio) => {
  if (idPatrimonio === undefined || idPatrimonio === null || idPatrimonio === '') return null;
  try {
    const q = query(
      bensPatrimoniaisCollection,
      where('id_patrimonio', '==', idPatrimonio),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  } catch (err) {
    console.error('Erro ao buscar por id_patrimonio:', err);
    throw err;
  }
};

export const createBemPatrimonial = async (data) => {
  try {
    const payload = stripUndefined({
      id_patrimonio: data.id_patrimonio ?? '',
      descricao: normalizeText(data.descricao),
      quantidade: Number.isFinite(Number(data.quantidade)) ? Number(data.quantidade) : 1,
      valor: data.valor ?? '',
      localidade: normalizeText(data.localidade),
      aapat_processo_sei: normalizeText(data.aapat_processo_sei),
      observacoes: normalizeText(data.observacoes),
      viatura_bens_id: data.viatura_bens_id || null,
      viatura_bens_nome: data.viatura_bens_nome ? normalizeText(data.viatura_bens_nome) : '',
      ultima_conferencia: data.ultima_conferencia ?? null,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      ...buildSearchableFields(data),
    });
    const ref = await addDoc(bensPatrimoniaisCollection, payload);
    return ref.id;
  } catch (err) {
    console.error('Erro ao criar bem patrimonial:', err);
    throw err;
  }
};

export const updateBemPatrimonial = async (docId, data) => {
  try {
    const ref = doc(db, 'bens_patrimoniais', docId);
    const payload = stripUndefined({
      id_patrimonio: data.id_patrimonio,
      descricao: data.descricao !== undefined ? normalizeText(data.descricao) : undefined,
      quantidade:
        data.quantidade !== undefined && Number.isFinite(Number(data.quantidade))
          ? Number(data.quantidade)
          : undefined,
      valor: data.valor,
      localidade: data.localidade !== undefined ? normalizeText(data.localidade) : undefined,
      aapat_processo_sei:
        data.aapat_processo_sei !== undefined ? normalizeText(data.aapat_processo_sei) : undefined,
      observacoes: data.observacoes !== undefined ? normalizeText(data.observacoes) : undefined,
      viatura_bens_id:
        data.viatura_bens_id !== undefined ? (data.viatura_bens_id || null) : undefined,
      viatura_bens_nome:
        data.viatura_bens_nome !== undefined ? normalizeText(data.viatura_bens_nome) : undefined,
      updated_at: serverTimestamp(),
    });
    if (data.descricao !== undefined) {
      payload.descricao_lower = (data.descricao || '').toString().toLowerCase().trim();
    }
    await updateDoc(ref, payload);
  } catch (err) {
    console.error('Erro ao atualizar bem patrimonial:', err);
    throw err;
  }
};

export const updateLocalidade = async (docId, localidade, viaturaInfo = null) => {
  try {
    const ref = doc(db, 'bens_patrimoniais', docId);
    const payload = {
      localidade: normalizeText(localidade),
      viatura_bens_id: viaturaInfo?.id || null,
      viatura_bens_nome: viaturaInfo?.nome ? normalizeText(viaturaInfo.nome) : '',
      updated_at: serverTimestamp(),
    };
    await updateDoc(ref, payload);
  } catch (err) {
    console.error('Erro ao atualizar localidade:', err);
    throw err;
  }
};

export const markAsConferido = async (docId) => {
  try {
    const ref = doc(db, 'bens_patrimoniais', docId);
    await updateDoc(ref, {
      ultima_conferencia: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  } catch (err) {
    console.error('Erro ao registrar conferência:', err);
    throw err;
  }
};

export const deleteBemPatrimonial = async (docId) => {
  try {
    const ref = doc(db, 'bens_patrimoniais', docId);
    await deleteDoc(ref);
  } catch (err) {
    console.error('Erro ao excluir bem patrimonial:', err);
    throw err;
  }
};

export const bulkUpsertBensPatrimoniais = async (records, onProgress) => {
  if (!Array.isArray(records) || records.length === 0) {
    return { created: 0, updated: 0, errors: [] };
  }

  const result = { created: 0, updated: 0, errors: [] };
  const existingSnap = await getDocs(bensPatrimoniaisCollection);
  const byIdPatrimonio = new Map();
  existingSnap.docs.forEach((d) => {
    const data = d.data();
    if (data?.id_patrimonio !== undefined && data?.id_patrimonio !== null) {
      byIdPatrimonio.set(String(data.id_patrimonio), d.id);
    }
  });

  let batch = writeBatch(db);
  let ops = 0;
  let processed = 0;

  const commitBatch = async () => {
    if (ops > 0) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  };

  for (const record of records) {
    try {
      const idPatrim = record.id_patrimonio;
      const idKey = idPatrim !== undefined && idPatrim !== null ? String(idPatrim) : null;
      const payload = stripUndefined({
        id_patrimonio: idPatrim ?? '',
        descricao: normalizeText(record.descricao),
        quantidade: Number.isFinite(Number(record.quantidade)) ? Number(record.quantidade) : 1,
        valor: record.valor ?? '',
        localidade: normalizeText(record.localidade),
        aapat_processo_sei: normalizeText(record.aapat_processo_sei),
        observacoes: normalizeText(record.observacoes),
        descricao_lower: (record.descricao || '').toString().toLowerCase().trim(),
        updated_at: serverTimestamp(),
      });
      if (record.ultima_conferencia instanceof Date) {
        payload.ultima_conferencia = record.ultima_conferencia;
      }

      const existingDocId = idKey ? byIdPatrimonio.get(idKey) : null;
      if (existingDocId) {
        const ref = doc(db, 'bens_patrimoniais', existingDocId);
        batch.update(ref, payload);
        result.updated += 1;
      } else {
        const ref = doc(bensPatrimoniaisCollection);
        const createPayload = { ...payload, created_at: serverTimestamp() };
        if (!('ultima_conferencia' in createPayload)) createPayload.ultima_conferencia = null;
        batch.set(ref, createPayload);
        if (idKey) byIdPatrimonio.set(idKey, ref.id);
        result.created += 1;
      }
      ops += 1;
      if (ops >= BATCH_LIMIT) {
        await commitBatch();
      }
    } catch (err) {
      console.error('Falha em registro durante bulk upsert:', record, err);
      result.errors.push({ record, message: err?.message || 'Erro desconhecido' });
    } finally {
      processed += 1;
      if (onProgress) onProgress(processed, records.length);
    }
  }

  await commitBatch();
  return result;
};
