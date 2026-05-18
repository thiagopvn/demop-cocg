import {
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
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

export const updateLocalidadeBulk = async (docIds, localidade, viaturaInfo = null) => {
  if (!Array.isArray(docIds) || docIds.length === 0) return { updated: 0 };
  try {
    const payload = {
      localidade: normalizeText(localidade),
      viatura_bens_id: viaturaInfo?.id || null,
      viatura_bens_nome: viaturaInfo?.nome ? normalizeText(viaturaInfo.nome) : '',
      updated_at: serverTimestamp(),
    };
    let batch = writeBatch(db);
    let ops = 0;
    let updated = 0;
    for (const id of docIds) {
      const ref = doc(db, 'bens_patrimoniais', id);
      batch.update(ref, payload);
      ops += 1;
      updated += 1;
      if (ops >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();
    return { updated };
  } catch (err) {
    console.error('Erro ao atualizar localidades em massa:', err);
    throw err;
  }
};

export const markAsConferido = async (docId, userInfo = null) => {
  try {
    const ref = doc(db, 'bens_patrimoniais', docId);
    const snap = await getDoc(ref);
    const cur = snap.exists() ? snap.data() : {};

    // Sempre persiste conferido_por — mesmo que o nome do usuário não tenha
    // chegado a tempo, grava 'Usuário não identificado' para que a coluna
    // nunca exiba data sem responsável.
    const nome = userInfo?.userName?.trim?.() || 'Usuário não identificado';
    const payload = {
      ultima_conferencia: serverTimestamp(),
      updated_at: serverTimestamp(),
      conferido_por: nome,
      // Nova conferência sempre limpa o estado "desfeita"
      conferencia_desfeita: deleteField(),
    };
    if (userInfo?.userId) payload.conferido_por_id = userInfo.userId;

    // Snapshot da conferência anterior para permitir "desfazer" voltando ao
    // estado real (e não a "Nunca conferido"). Se não havia conferência antes,
    // garante limpar qualquer snapshot residual.
    if (cur.ultima_conferencia) {
      payload.conferencia_anterior = {
        ultima_conferencia: cur.ultima_conferencia,
        conferido_por: cur.conferido_por ?? null,
        conferido_por_id: cur.conferido_por_id ?? null,
      };
    } else {
      payload.conferencia_anterior = deleteField();
    }

    await updateDoc(ref, payload);
  } catch (err) {
    console.error('Erro ao registrar conferência:', err);
    throw err;
  }
};

export const unmarkAsConferido = async (docId) => {
  try {
    const ref = doc(db, 'bens_patrimoniais', docId);
    const snap = await getDoc(ref);
    const cur = snap.exists() ? snap.data() : {};
    const anterior = cur.conferencia_anterior;

    const payload = {
      updated_at: serverTimestamp(),
      conferencia_anterior: deleteField(),
      // Sinaliza que a conferência foi desfeita — usado pela UI para
      // exibir o item em vermelho mesmo que a data restaurada seja recente.
      conferencia_desfeita: true,
    };

    if (anterior && anterior.ultima_conferencia) {
      // Restaura conferência anterior
      payload.ultima_conferencia = anterior.ultima_conferencia;
      payload.conferido_por = anterior.conferido_por ?? deleteField();
      payload.conferido_por_id = anterior.conferido_por_id ?? deleteField();
    } else {
      // Não havia conferência anterior — volta para "Nunca conferido"
      payload.ultima_conferencia = deleteField();
      payload.conferido_por = deleteField();
      payload.conferido_por_id = deleteField();
    }

    await updateDoc(ref, payload);
    return { restored: Boolean(anterior && anterior.ultima_conferencia) };
  } catch (err) {
    console.error('Erro ao desfazer conferência:', err);
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
