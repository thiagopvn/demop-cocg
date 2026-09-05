import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    limit,
    writeBatch,
    serverTimestamp,
    deleteDoc,
    updateDoc,
} from 'firebase/firestore';
import db from '../firebase/db';
import { logAudit } from '../firebase/auditLog';
import { getTotalUnidades, getQtdInoperante } from '../utils/materialStatus';

/**
 * Locais de armazenamento do DEMOP.
 *
 * Modelo:
 *  - `locais_armazenamento`: cada prateleira/box/gaveta/armario (ou tipo criado pelo admin).
 *  - `material_locais`: quantas unidades de um material ficam em cada local. O id do
 *    documento e deterministico (`${material_id}_${local_id}`), garantindo uma linha por par.
 *
 * Regra de integracao com o estoque:
 *  A alocacao em local representa o "lugar de casa" das unidades que pertencem ao DEMOP,
 *  ou seja, tudo que NAO esta permanentemente em viatura:
 *      unidadesDemop = estoque_total - estoque_viatura
 *  Unidades cauteladas ou em reparo continuam pertencendo ao seu local (voltam para la),
 *  por isso a cautela/devolucao nao mexe em material_locais — apenas consulta para orientar.
 */

export const TIPOS_PADRAO = [
    { key: 'prateleira', label: 'Prateleira', plural: 'Prateleiras', sigla: 'Prat.', cor: '#2563eb' },
    { key: 'box', label: 'Box', plural: 'Box', sigla: 'Box', cor: '#ea580c' },
    { key: 'gaveta', label: 'Gaveta', plural: 'Gavetas', sigla: 'Gav.', cor: '#7c3aed' },
    { key: 'armario', label: 'Armário', plural: 'Armários', sigla: 'Arm.', cor: '#0d9488' },
];

/** Faixas criadas pelo botao "Criar locais padrao". Prateleira 02 e a de inoperantes. */
export const LOCAIS_PADRAO = [
    { tipo: 'prateleira', de: 1, ate: 14 },
    { tipo: 'box', de: 1, ate: 7 },
    { tipo: 'gaveta', de: 1, ate: 24 },
    { tipo: 'armario', de: 1, ate: 4 },
];
export const LOCAL_INOPERANTES_PADRAO = { tipo: 'prateleira', numero: 2 };

const CORES_EXTRA = ['#0891b2', '#be185d', '#65a30d', '#b45309', '#4f46e5', '#475569'];

export const normalizarTexto = (texto = '') =>
    String(texto)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();

export const slugTipo = (label = '') => normalizarTexto(label).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export const formatarNumero = (numero) => {
    const n = Number(numero);
    if (!Number.isFinite(n)) return '';
    return String(n).padStart(2, '0');
};

export const montarNomeLocal = (tipoLabel, numero) => {
    const num = formatarNumero(numero);
    return num ? `${tipoLabel} ${num}` : tipoLabel;
};

/** Informacoes visuais de um tipo (padrao ou criado pelo admin). */
export const getTipoInfo = (tipoKey, tipoLabel) => {
    const padrao = TIPOS_PADRAO.find(t => t.key === tipoKey);
    if (padrao) return padrao;
    const label = tipoLabel || tipoKey || 'Local';
    let hash = 0;
    for (const ch of String(tipoKey || label)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const siglaBase = label.replace(/[^A-Za-zÀ-ú]/g, '').slice(0, 3);
    return {
        key: tipoKey,
        label,
        plural: label,
        sigla: siglaBase ? `${siglaBase}.` : label,
        cor: CORES_EXTRA[hash % CORES_EXTRA.length],
    };
};

/** Rotulo curto usado em chips: "Prat. 01", "Box 03". */
export const siglaLocal = (local) => {
    if (!local) return '';
    const info = getTipoInfo(local.tipo, local.tipo_label);
    const num = formatarNumero(local.numero);
    return num ? `${info.sigla} ${num}` : (local.nome || info.label);
};

const ordemTipo = (tipoKey) => {
    const idx = TIPOS_PADRAO.findIndex(t => t.key === tipoKey);
    return idx === -1 ? TIPOS_PADRAO.length : idx;
};

export const ordenarLocais = (a, b) => {
    const oa = ordemTipo(a.tipo);
    const ob = ordemTipo(b.tipo);
    if (oa !== ob) return oa - ob;
    const ta = (a.tipo_label || a.tipo || '').localeCompare(b.tipo_label || b.tipo || '', 'pt-BR');
    if (ta !== 0 && oa === TIPOS_PADRAO.length) return ta;
    const na = Number(a.numero);
    const nb = Number(b.numero);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
};

/** Lista de tipos presentes num conjunto de locais (dinamica, respeita a ordem padrao). */
export const extrairTipos = (locais = []) => {
    const mapa = new Map();
    for (const local of locais) {
        const key = local.tipo || slugTipo(local.tipo_label || 'local');
        if (!mapa.has(key)) {
            mapa.set(key, { ...getTipoInfo(key, local.tipo_label), key, label: local.tipo_label || getTipoInfo(key).label, count: 0 });
        }
        mapa.get(key).count += 1;
    }
    return [...mapa.values()].sort((a, b) => {
        const oa = ordemTipo(a.key);
        const ob = ordemTipo(b.key);
        if (oa !== ob) return oa - ob;
        return a.label.localeCompare(b.label, 'pt-BR');
    });
};

// ------------------------------------------------------------------
// Regras de quantidade
// ------------------------------------------------------------------

/** Unidades que pertencem ao DEMOP (nao estao em viatura). */
export const getUnidadesDemop = (material) => {
    const total = getTotalUnidades(material);
    const viatura = Math.max(0, Number(material?.estoque_viatura) || 0);
    return Math.max(0, total - viatura);
};

export const somarAlocacoes = (alocacoes = []) =>
    alocacoes.reduce((acc, a) => acc + (Math.max(0, Number(a.quantidade) || 0)), 0);

/**
 * Resumo da situacao de um material em relacao aos locais.
 *  - semLocal: unidades do DEMOP ainda nao guardadas em nenhum local.
 *  - excedente: alocacoes acima do que existe no DEMOP (material saiu para viatura/consumo
 *    depois de ter sido guardado) — precisa de ajuste.
 */
export const resumirLocalizacao = (material, alocacoes = []) => {
    const unidadesDemop = getUnidadesDemop(material);
    const alocadas = somarAlocacoes(alocacoes);
    return {
        unidadesDemop,
        alocadas,
        semLocal: Math.max(0, unidadesDemop - alocadas),
        excedente: Math.max(0, alocadas - unidadesDemop),
        emViatura: Math.max(0, Number(material?.estoque_viatura) || 0),
        inoperantes: getQtdInoperante(material),
    };
};

/** Texto curto: "Prat. 01 ×10 · Box 03 ×2". */
export const descreverAlocacoes = (alocacoes = []) =>
    [...alocacoes]
        .filter(a => (Number(a.quantidade) || 0) > 0)
        .sort((a, b) => ordenarLocais(alocacaoComoLocal(a), alocacaoComoLocal(b)))
        .map(a => `${siglaLocal(alocacaoComoLocal(a))} ×${a.quantidade}`)
        .join(' · ');

/** Converte uma linha de material_locais no formato de "local" (para siglas/cores). */
export const alocacaoComoLocal = (alocacao) => ({
    id: alocacao.local_id,
    nome: alocacao.local_nome,
    tipo: alocacao.local_tipo,
    tipo_label: alocacao.local_tipo_label,
    numero: alocacao.local_numero,
    inoperantes: Boolean(alocacao.local_inoperantes),
});

export const idAlocacao = (materialId, localId) => `${materialId}_${localId}`;

// ------------------------------------------------------------------
// Locais: CRUD
// ------------------------------------------------------------------

const montarDocLocal = ({ tipo, tipoLabel, numero, observacao, inoperantes }, userId, userName) => {
    const tipoKey = tipo || slugTipo(tipoLabel);
    const info = getTipoInfo(tipoKey, tipoLabel);
    const label = tipoLabel || info.label;
    const num = Number.isFinite(Number(numero)) && numero !== '' && numero !== null ? Number(numero) : null;
    const nome = montarNomeLocal(label, num);
    return {
        tipo: tipoKey,
        tipo_label: label,
        numero: num,
        nome,
        nome_lower: normalizarTexto(nome),
        observacao: (observacao || '').trim(),
        inoperantes: Boolean(inoperantes),
        ativo: true,
        created_at: serverTimestamp(),
        created_by: userId || null,
        created_by_nome: userName || null,
        updated_at: serverTimestamp(),
    };
};

/**
 * Cria varios locais de uma vez ignorando nomes ja existentes.
 * @returns {{ criados: string[], ignorados: string[] }}
 */
export async function criarLocais(itens, { userId, userName } = {}) {
    const existentesSnap = await getDocs(collection(db, 'locais_armazenamento'));
    const nomesExistentes = new Set(existentesSnap.docs.map(d => d.data().nome_lower || normalizarTexto(d.data().nome)));

    const criados = [];
    const ignorados = [];
    let batch = writeBatch(db);
    let pendentes = 0;

    for (const item of itens) {
        const docData = montarDocLocal(item, userId, userName);
        if (nomesExistentes.has(docData.nome_lower)) {
            ignorados.push(docData.nome);
            continue;
        }
        nomesExistentes.add(docData.nome_lower);
        const ref = doc(collection(db, 'locais_armazenamento'));
        batch.set(ref, docData);
        criados.push(docData.nome);
        pendentes += 1;
        if (pendentes >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            pendentes = 0;
        }
    }
    if (pendentes > 0) await batch.commit();

    if (criados.length > 0) {
        logAudit({
            action: 'local_create',
            userId,
            userName,
            targetCollection: 'locais_armazenamento',
            targetName: criados.length === 1 ? criados[0] : `${criados.length} locais`,
            details: { locais: criados.slice(0, 60), ignorados: ignorados.slice(0, 60) },
        });
    }
    return { criados, ignorados };
}

/** Cria as prateleiras, box, gavetas e armarios padrao (Prateleira 02 = inoperantes). */
export async function seedLocaisPadrao(user) {
    const itens = [];
    for (const faixa of LOCAIS_PADRAO) {
        const info = getTipoInfo(faixa.tipo);
        for (let n = faixa.de; n <= faixa.ate; n++) {
            itens.push({
                tipo: faixa.tipo,
                tipoLabel: info.label,
                numero: n,
                inoperantes: faixa.tipo === LOCAL_INOPERANTES_PADRAO.tipo && n === LOCAL_INOPERANTES_PADRAO.numero,
                observacao: faixa.tipo === LOCAL_INOPERANTES_PADRAO.tipo && n === LOCAL_INOPERANTES_PADRAO.numero
                    ? 'Materiais inoperantes'
                    : '',
            });
        }
    }
    return criarLocais(itens, user);
}

export async function atualizarLocal(localId, { tipoLabel, numero, observacao, inoperantes, tipo }, { userId, userName } = {}) {
    const ref = doc(db, 'locais_armazenamento', localId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Local não encontrado.');
    const atual = snap.data();

    const tipoKey = tipo || atual.tipo;
    const label = tipoLabel || atual.tipo_label;
    const num = numero === '' || numero === null || numero === undefined ? null : Number(numero);
    const nome = montarNomeLocal(label, num);
    const nomeLower = normalizarTexto(nome);

    if (nomeLower !== atual.nome_lower) {
        const dupSnap = await getDocs(query(collection(db, 'locais_armazenamento'), where('nome_lower', '==', nomeLower), limit(1)));
        if (!dupSnap.empty) throw new Error(`Já existe um local chamado "${nome}".`);
    }

    const patch = {
        tipo: tipoKey,
        tipo_label: label,
        numero: num,
        nome,
        nome_lower: nomeLower,
        observacao: (observacao ?? atual.observacao ?? '').trim(),
        inoperantes: Boolean(inoperantes),
        updated_at: serverTimestamp(),
        updated_by: userId || null,
        updated_by_nome: userName || null,
    };
    await updateDoc(ref, patch);

    // Mantem a denormalizacao das alocacoes coerente com o novo nome.
    if (nome !== atual.nome || tipoKey !== atual.tipo || Boolean(inoperantes) !== Boolean(atual.inoperantes)) {
        const alocSnap = await getDocs(query(collection(db, 'material_locais'), where('local_id', '==', localId)));
        if (!alocSnap.empty) {
            const batch = writeBatch(db);
            alocSnap.docs.forEach(d => batch.update(d.ref, {
                local_nome: nome,
                local_tipo: tipoKey,
                local_tipo_label: label,
                local_numero: num,
                local_inoperantes: Boolean(inoperantes),
            }));
            await batch.commit();
        }
    }

    logAudit({
        action: 'local_update',
        userId,
        userName,
        targetCollection: 'locais_armazenamento',
        targetId: localId,
        targetName: nome,
        details: { de: atual.nome, para: nome, inoperantes: Boolean(inoperantes) },
    });
    return { ...atual, ...patch, id: localId };
}

/** Exclui um local vazio. Lanca erro se ainda houver material guardado nele. */
export async function excluirLocal(local, { userId, userName } = {}) {
    const alocSnap = await getDocs(query(collection(db, 'material_locais'), where('local_id', '==', local.id), limit(1)));
    if (!alocSnap.empty) {
        throw new Error('Este local ainda tem materiais. Mova ou remova os materiais antes de excluir.');
    }
    await deleteDoc(doc(db, 'locais_armazenamento', local.id));
    logAudit({
        action: 'local_delete',
        userId,
        userName,
        targetCollection: 'locais_armazenamento',
        targetId: local.id,
        targetName: local.nome,
    });
}

export async function listarLocais() {
    const snap = await getDocs(collection(db, 'locais_armazenamento'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(ordenarLocais);
}

export async function buscarLocalInoperantes() {
    const snap = await getDocs(query(collection(db, 'locais_armazenamento'), where('inoperantes', '==', true), limit(1)));
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
}

// ------------------------------------------------------------------
// Alocacoes material <-> local
// ------------------------------------------------------------------

export async function listarAlocacoesDoMaterial(materialId) {
    if (!materialId) return [];
    const snap = await getDocs(query(collection(db, 'material_locais'), where('material_id', '==', materialId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

const camposMaterial = (material) => ({
    material_id: material.id,
    material_description: material.description || '',
    categoria: material.categoria || '',
});

const camposLocal = (local) => ({
    local_id: local.id,
    local_nome: local.nome || '',
    local_tipo: local.tipo || '',
    local_tipo_label: local.tipo_label || '',
    local_numero: Number.isFinite(Number(local.numero)) && local.numero !== null ? Number(local.numero) : null,
    local_inoperantes: Boolean(local.inoperantes),
});

/**
 * Define a quantidade exata de um material num local (0 remove a linha).
 * Nao valida contra o estoque — quem chama decide (o dialog mostra o limite).
 */
export async function definirQuantidadeNoLocal({ material, local, quantidade, userId, userName, motivo }) {
    const qtd = Math.max(0, Math.floor(Number(quantidade) || 0));
    const ref = doc(db, 'material_locais', idAlocacao(material.id, local.id));
    const snap = await getDoc(ref);
    const anterior = snap.exists() ? Number(snap.data().quantidade) || 0 : 0;

    if (qtd === anterior) return { anterior, atual: qtd };

    const batch = writeBatch(db);
    if (qtd === 0) {
        if (snap.exists()) batch.delete(ref);
    } else {
        batch.set(ref, {
            ...camposMaterial(material),
            ...camposLocal(local),
            quantidade: qtd,
            updated_at: serverTimestamp(),
            updated_by: userId || null,
            updated_by_nome: userName || null,
            ...(snap.exists() ? {} : { created_at: serverTimestamp() }),
        }, { merge: true });
    }
    await batch.commit();

    logAudit({
        action: 'material_local_set',
        userId,
        userName,
        targetCollection: 'material_locais',
        targetId: material.id,
        targetName: material.description,
        details: { local: local.nome, de: anterior, para: qtd, motivo: motivo || null },
    });
    return { anterior, atual: qtd };
}

/** Soma `quantidade` unidades num local (cria a linha se nao existir). */
export async function adicionarNoLocal({ material, local, quantidade, userId, userName, motivo }) {
    const ref = doc(db, 'material_locais', idAlocacao(material.id, local.id));
    const snap = await getDoc(ref);
    const anterior = snap.exists() ? Number(snap.data().quantidade) || 0 : 0;
    return definirQuantidadeNoLocal({ material, local, quantidade: anterior + Math.max(0, Number(quantidade) || 0), userId, userName, motivo });
}

/** Move unidades de um local para outro numa unica gravacao. */
export async function moverEntreLocais({ material, deLocal, paraLocal, quantidade, userId, userName, motivo }) {
    const qtd = Math.max(0, Math.floor(Number(quantidade) || 0));
    if (qtd === 0) return null;
    if (!deLocal?.id || !paraLocal?.id || deLocal.id === paraLocal.id) return null;

    const origemRef = doc(db, 'material_locais', idAlocacao(material.id, deLocal.id));
    const destinoRef = doc(db, 'material_locais', idAlocacao(material.id, paraLocal.id));
    const [origemSnap, destinoSnap] = await Promise.all([getDoc(origemRef), getDoc(destinoRef)]);

    const origemQtd = origemSnap.exists() ? Number(origemSnap.data().quantidade) || 0 : 0;
    const mover = Math.min(qtd, origemQtd);
    if (mover <= 0) return null;
    const destinoQtd = destinoSnap.exists() ? Number(destinoSnap.data().quantidade) || 0 : 0;

    const batch = writeBatch(db);
    if (origemQtd - mover <= 0) {
        batch.delete(origemRef);
    } else {
        batch.update(origemRef, { quantidade: origemQtd - mover, updated_at: serverTimestamp(), updated_by: userId || null, updated_by_nome: userName || null });
    }
    batch.set(destinoRef, {
        ...camposMaterial(material),
        ...camposLocal(paraLocal),
        quantidade: destinoQtd + mover,
        updated_at: serverTimestamp(),
        updated_by: userId || null,
        updated_by_nome: userName || null,
        ...(destinoSnap.exists() ? {} : { created_at: serverTimestamp() }),
    }, { merge: true });
    await batch.commit();

    logAudit({
        action: 'material_local_move',
        userId,
        userName,
        targetCollection: 'material_locais',
        targetId: material.id,
        targetName: material.description,
        details: { de: deLocal.nome, para: paraLocal.nome, quantidade: mover, motivo: motivo || null },
    });
    return { movidas: mover };
}

/** Remove todas as linhas de um material (usado ao excluir o material). */
export async function removerAlocacoesDoMaterial(materialId) {
    const alocacoes = await listarAlocacoesDoMaterial(materialId);
    if (alocacoes.length === 0) return 0;
    const batch = writeBatch(db);
    alocacoes.forEach(a => batch.delete(doc(db, 'material_locais', a.id)));
    await batch.commit();
    return alocacoes.length;
}

/**
 * Reduz alocacoes que passaram do que existe no DEMOP (ex.: material foi para viatura).
 * Tira primeiro dos locais com mais unidades. Nunca mexe no estoque.
 */
export async function ajustarExcedente({ material, alocacoes, userId, userName }) {
    const { excedente } = resumirLocalizacao(material, alocacoes);
    if (excedente <= 0) return { ajustadas: 0 };

    let restante = excedente;
    const ordenadas = [...alocacoes].sort((a, b) => (b.quantidade || 0) - (a.quantidade || 0));
    const batch = writeBatch(db);
    const detalhes = [];
    for (const aloc of ordenadas) {
        if (restante <= 0) break;
        const qtd = Number(aloc.quantidade) || 0;
        const tirar = Math.min(qtd, restante);
        const ref = doc(db, 'material_locais', aloc.id);
        if (qtd - tirar <= 0) batch.delete(ref);
        else batch.update(ref, { quantidade: qtd - tirar, updated_at: serverTimestamp(), updated_by: userId || null, updated_by_nome: userName || null });
        detalhes.push({ local: aloc.local_nome, de: qtd, para: qtd - tirar });
        restante -= tirar;
    }
    await batch.commit();
    logAudit({
        action: 'material_local_set',
        userId,
        userName,
        targetCollection: 'material_locais',
        targetId: material.id,
        targetName: material.description,
        details: { motivo: 'Ajuste automático de excedente', ajustes: detalhes },
    });
    return { ajustadas: excedente - restante };
}

/**
 * Mantem o local de inoperantes coerente quando a quantidade inoperante muda.
 *  - delta > 0: leva `delta` unidades para o local de inoperantes (primeiro as que estao
 *    sem local, depois retirando dos outros locais, do maior para o menor).
 *  - delta < 0: tira `|delta|` unidades do local de inoperantes; elas ficam "sem local"
 *    ate o admin guardar de volta (a tela de materiais sinaliza).
 * Se nao existir local marcado como "inoperantes", nao faz nada.
 */
export async function sincronizarInoperantesNoLocal({ material, delta, userId, userName }) {
    const qtd = Math.floor(Number(delta) || 0);
    if (!material?.id || qtd === 0) return null;

    const localInop = await buscarLocalInoperantes();
    if (!localInop) return null;

    const alocacoes = await listarAlocacoesDoMaterial(material.id);
    const noInop = alocacoes.find(a => a.local_id === localInop.id);
    const qtdNoInop = noInop ? Number(noInop.quantidade) || 0 : 0;
    const inopRef = doc(db, 'material_locais', idAlocacao(material.id, localInop.id));
    const batch = writeBatch(db);
    const detalhes = [];

    if (qtd < 0) {
        const tirar = Math.min(qtdNoInop, -qtd);
        if (tirar <= 0) return null;
        if (qtdNoInop - tirar <= 0) batch.delete(inopRef);
        else batch.update(inopRef, { quantidade: qtdNoInop - tirar, updated_at: serverTimestamp(), updated_by: userId || null, updated_by_nome: userName || null });
        detalhes.push({ de: localInop.nome, para: 'sem local', quantidade: tirar });
        await batch.commit();
        logAudit({
            action: 'material_local_move',
            userId, userName,
            targetCollection: 'material_locais',
            targetId: material.id,
            targetName: material.description,
            details: { motivo: 'Unidades voltaram a operante', movimentos: detalhes },
        });
        return { local: localInop, movidas: tirar, direcao: 'saida' };
    }

    // delta > 0: levar para o local de inoperantes
    const { semLocal } = resumirLocalizacao(material, alocacoes);
    let restante = qtd;
    let adicionar = Math.min(semLocal, restante);
    restante -= adicionar;

    const outras = alocacoes
        .filter(a => a.local_id !== localInop.id)
        .sort((a, b) => (b.quantidade || 0) - (a.quantidade || 0));
    for (const aloc of outras) {
        if (restante <= 0) break;
        const atual = Number(aloc.quantidade) || 0;
        const tirar = Math.min(atual, restante);
        if (tirar <= 0) continue;
        const ref = doc(db, 'material_locais', aloc.id);
        if (atual - tirar <= 0) batch.delete(ref);
        else batch.update(ref, { quantidade: atual - tirar, updated_at: serverTimestamp(), updated_by: userId || null, updated_by_nome: userName || null });
        detalhes.push({ de: aloc.local_nome, para: localInop.nome, quantidade: tirar });
        adicionar += tirar;
        restante -= tirar;
    }
    if (adicionar <= 0) return null;

    batch.set(inopRef, {
        ...camposMaterial(material),
        ...camposLocal(localInop),
        quantidade: qtdNoInop + adicionar,
        updated_at: serverTimestamp(),
        updated_by: userId || null,
        updated_by_nome: userName || null,
        ...(noInop ? {} : { created_at: serverTimestamp() }),
    }, { merge: true });
    await batch.commit();

    logAudit({
        action: 'material_local_move',
        userId, userName,
        targetCollection: 'material_locais',
        targetId: material.id,
        targetName: material.description,
        details: { motivo: 'Unidades marcadas como inoperantes', para: localInop.nome, quantidade: adicionar, movimentos: detalhes },
    });
    return { local: localInop, movidas: adicionar, direcao: 'entrada' };
}
