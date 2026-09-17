import { addDoc, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import db, { categoriesCollection } from '../firebase/db';
import { logAudit } from '../firebase/auditLog';

/**
 * Categorias de material — regras de negócio compartilhadas pela tela /categoria e pelo
 * cadastro de material. Um material guarda `categoria` (nome) e `categoria_id`; toda
 * alteração de nome ou exclusão aqui propaga para os materiais para não deixar órfãos.
 */

export const SEM_CATEGORIA = '__sem_categoria__';

export const normalizarNomeCategoria = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
const chave = (s) => normalizarNomeCategoria(s).toLowerCase();

export const nomeCategoria = (c) => c?.description || c?.name || '';

/** Materiais de uma categoria: pelo id ou, nos cadastros antigos sem id, pelo nome. */
export const materiaisDaCategoria = (categoria, materials = []) => {
    const k = chave(nomeCategoria(categoria));
    return materials.filter((m) => (m.categoria_id && m.categoria_id === categoria.id) || (!m.categoria_id && chave(m.categoria) === k));
};

export const materiaisSemCategoria = (materials = [], categorias = []) => {
    const ids = new Set(categorias.map((c) => c.id));
    const nomes = new Set(categorias.map((c) => chave(nomeCategoria(c))));
    return materials.filter((m) => !(m.categoria_id && ids.has(m.categoria_id)) && !nomes.has(chave(m.categoria)));
};

/** Resumo por categoria: quantidade de materiais, unidades e inoperantes. */
export const resumirCategorias = (categorias = [], materials = []) => {
    const mapa = new Map();
    for (const c of categorias) {
        const lista = materiaisDaCategoria(c, materials);
        mapa.set(c.id, {
            materiais: lista.length,
            unidades: lista.reduce((s, m) => s + Math.max(Number(m.estoque_total) || 0, (Number(m.estoque_atual) || 0) + (Number(m.estoque_viatura) || 0)), 0),
            inoperantes: lista.reduce((s, m) => s + (Number(m.qtd_inoperante) || 0), 0),
            semFoto: lista.filter((m) => !m.image_url).length,
        });
    }
    return mapa;
};

const auditoria = (action, cat, user, details) => logAudit({
    action, userId: user?.userId || null, userName: user?.userName || '', targetCollection: 'categorias', targetId: cat?.id || null, targetName: nomeCategoria(cat) || cat?.description || null, details,
});

/** Cria a categoria (nome em caixa alta). Se já existir uma com o mesmo nome, devolve a existente. */
export async function criarCategoria(nome, user) {
    const description = normalizarNomeCategoria(nome);
    if (!description) throw new Error('Informe o nome da categoria.');
    const existente = await getDocs(query(categoriesCollection, where('description_lower', '==', description.toLowerCase())));
    if (!existente.empty) return { id: existente.docs[0].id, ...existente.docs[0].data(), jaExistia: true };
    const ref = await addDoc(categoriesCollection, {
        description,
        description_lower: description.toLowerCase(),
        created_at: serverTimestamp(),
        created_by: user?.userId || null,
        created_by_nome: user?.userName || null,
    });
    await auditoria('categoria_create', { id: ref.id, description }, user);
    return { id: ref.id, description, description_lower: description.toLowerCase(), jaExistia: false };
}

/** Atualiza o nome/campos nos materiais de uma categoria (em lotes de 400). */
async function propagarNosMateriais(materiais, patch) {
    for (let i = 0; i < materiais.length; i += 400) {
        const batch = writeBatch(db);
        for (const m of materiais.slice(i, i + 400)) batch.update(doc(db, 'materials', m.id), patch);
        await batch.commit();
    }
}

/** Renomeia a categoria e atualiza o nome em todos os materiais dela. */
export async function renomearCategoria(categoria, novoNome, materials, user) {
    const description = normalizarNomeCategoria(novoNome);
    if (!description) throw new Error('Informe o nome da categoria.');
    const anterior = nomeCategoria(categoria);
    if (description === anterior) return { materiais: 0 };
    const duplicada = await getDocs(query(categoriesCollection, where('description_lower', '==', description.toLowerCase())));
    if (duplicada.docs.some((d) => d.id !== categoria.id)) throw new Error(`Já existe a categoria "${description}". Use "Excluir e mover" para juntar as duas.`);

    await updateDoc(doc(db, 'categorias', categoria.id), { description, description_lower: description.toLowerCase(), updated_at: serverTimestamp(), updated_by: user?.userId || null });
    const afetados = materiaisDaCategoria(categoria, materials);
    await propagarNosMateriais(afetados, { categoria: description, categoria_id: categoria.id });
    await auditoria('categoria_update', { id: categoria.id, description }, user, { alteracoes: [{ campo: 'description', de: anterior, para: description }], materiais_atualizados: afetados.length });
    return { materiais: afetados.length };
}

/**
 * Exclui a categoria. Se tiver materiais, é obrigatório informar `destino`
 * (outra categoria) para onde eles vão antes da exclusão.
 */
export async function excluirCategoria(categoria, { destino = null, materials = [] } = {}, user) {
    const afetados = materiaisDaCategoria(categoria, materials);
    if (afetados.length > 0) {
        if (!destino?.id || destino.id === categoria.id) throw new Error('Escolha para qual categoria os materiais vão antes de excluir.');
        await propagarNosMateriais(afetados, { categoria: nomeCategoria(destino), categoria_id: destino.id });
    }
    await deleteDoc(doc(db, 'categorias', categoria.id));
    await auditoria('categoria_delete', categoria, user, { materiais_movidos: afetados.length, destino: destino ? nomeCategoria(destino) : null });
    return { materiais: afetados.length };
}

/** Coloca `categoria` em todos os materiais informados (ex.: os que estão sem categoria). */
export async function atribuirCategoria(categoria, materiais, user) {
    if (!categoria?.id || !materiais.length) return 0;
    await propagarNosMateriais(materiais, { categoria: nomeCategoria(categoria), categoria_id: categoria.id });
    await auditoria('categoria_update', categoria, user, { materiais_atribuidos: materiais.length, materiais: materiais.slice(0, 40).map((m) => m.description) });
    return materiais.length;
}

/** Cadastros antigos com o nome certo mas sem `categoria_id` ganham o id (self-heal silencioso). */
export async function vincularIdsFaltantes(categorias, materials) {
    const porNome = new Map(categorias.map((c) => [chave(nomeCategoria(c)), c]));
    const pendentes = materials.filter((m) => !m.categoria_id && m.categoria && porNome.has(chave(m.categoria)));
    for (const m of pendentes) {
        const c = porNome.get(chave(m.categoria));
        await updateDoc(doc(db, 'materials', m.id), { categoria: nomeCategoria(c), categoria_id: c.id });
    }
    return pendentes.length;
}
