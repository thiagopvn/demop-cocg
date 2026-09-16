import { addDoc, deleteDoc, doc, getDocs, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import db, { operacoesCollection } from '../firebase/db';
import { logAudit } from '../firebase/auditLog';
import { OPERACOES_PADRAO } from '../data/operacoesCbmerj';
import { calculateSimilarity, normalizeName } from '../utils/materialSimilarity';
import { getQtdInoperante, getTotalUnidades } from '../utils/materialStatus';

/* ------------------------------------------------------------------ */
/* Constantes                                                          */
/* ------------------------------------------------------------------ */

/** Grupos em que a lista da tela é dividida (na ordem de exibição). */
export const CATEGORIAS_OPERACAO = [
    { key: 'operacao', label: 'Operações recorrentes', descricao: 'Planos tático-operacionais com material previsto por nota' },
    { key: 'norma', label: 'Normas de base', descricao: 'Valem para todas as operações' },
    { key: 'outra', label: 'Outras operações', descricao: 'Sem lista própria de material' },
];

/** Ícones disponíveis para uma operação (o componente OperacaoIcone resolve o desenho). */
export const ICONES_OPERACAO = [
    { key: 'fogo', label: 'Fogo em vegetação' },
    { key: 'chuva', label: 'Chuvas / desastres' },
    { key: 'mar', label: 'Salvamento marítimo' },
    { key: 'festa', label: 'Grande evento' },
    { key: 'carnaval', label: 'Carnaval' },
    { key: 'norma', label: 'Norma / instrução' },
    { key: 'epi', label: 'EPI' },
    { key: 'evento', label: 'Evento pontual' },
    { key: 'pc', label: 'Posto de comando' },
];

/** Paleta sugerida no cadastro (o admingeral pode escolher qualquer uma). */
export const CORES_OPERACAO = ['#ea580c', '#2563eb', '#0d9488', '#7c3aed', '#db2777', '#1e3a5f', '#b45309', '#475569', '#16a34a', '#dc2626'];

export const TIPOS_LINK = [
    { key: 'boletim', label: 'Boletim' },
    { key: 'recorte', label: 'Nota recortada' },
    { key: 'outro', label: 'Outro' },
];

/* ------------------------------------------------------------------ */
/* Normalização                                                        */
/* ------------------------------------------------------------------ */

export const gerarId = () =>
    (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 14);

const limpar = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

const qtdOuNull = (v) => {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
};

/** "bomba costal, mochila de combate" -> ['bomba costal', 'mochila de combate'] */
export const parseSinonimos = (v) =>
    (Array.isArray(v) ? v : String(v ?? '').split(/[,;]/)).map(limpar).filter(Boolean);

export const normalizarItem = (i = {}) => ({
    id: i.id || gerarId(),
    nome: limpar(i.nome),
    quantidade: qtdOuNull(i.quantidade),
    unidade: limpar(i.unidade),
    observacao: limpar(i.observacao),
    sinonimos: parseSinonimos(i.sinonimos),
    material_id: i.material_id || null,
});

export const normalizarSecao = (s = {}) => ({
    id: s.id || gerarId(),
    titulo: limpar(s.titulo) || 'Material',
    referencia: limpar(s.referencia),
    itens: (s.itens || []).map(normalizarItem).filter((i) => i.nome),
});

export const normalizarLink = (l = {}) => ({
    id: l.id || gerarId(),
    rotulo: limpar(l.rotulo) || 'Link',
    url: limpar(l.url),
    tipo: l.tipo || 'outro',
});

export const normalizarObservacao = (o = {}) => ({
    id: o.id || gerarId(),
    titulo: limpar(o.titulo),
    texto: limpar(o.texto),
});

/** Monta o documento completo da operação a partir do que veio do diálogo/semente. */
export const normalizarOperacao = (dados = {}) => ({
    chave: limpar(dados.chave) || null,
    nome: limpar(dados.nome),
    subtitulo: limpar(dados.subtitulo),
    categoria: CATEGORIAS_OPERACAO.some((c) => c.key === dados.categoria) ? dados.categoria : 'operacao',
    icone: ICONES_OPERACAO.some((i) => i.key === dados.icone) ? dados.icone : 'evento',
    cor: /^#[0-9a-fA-F]{6}$/.test(dados.cor || '') ? dados.cor : '#1e3a5f',
    nota: limpar(dados.nota),
    boletim: limpar(dados.boletim),
    folhas: limpar(dados.folhas),
    vigencia: limpar(dados.vigencia),
    descricao: limpar(dados.descricao),
    links: (dados.links || []).map(normalizarLink).filter((l) => l.url),
    secoes: (dados.secoes || []).map(normalizarSecao),
    observacoes: (dados.observacoes || []).map(normalizarObservacao).filter((o) => o.texto || o.titulo),
    ordem: Number.isFinite(Number(dados.ordem)) ? Number(dados.ordem) : 99,
    ativa: dados.ativa !== false,
});

export const validarOperacao = (dados) => {
    if (!limpar(dados?.nome)) return 'Informe o nome da operação.';
    const linkInvalido = (dados.links || []).find((l) => limpar(l.url) && !/^https?:\/\//i.test(limpar(l.url)));
    if (linkInvalido) return `O link "${linkInvalido.rotulo || linkInvalido.url}" precisa começar com http:// ou https://.`;
    return null;
};

/* ------------------------------------------------------------------ */
/* Leitura derivada                                                    */
/* ------------------------------------------------------------------ */

export const listarItens = (op) =>
    (op?.secoes || []).flatMap((s) => (s.itens || []).map((i) => ({ ...i, secaoId: s.id, secaoTitulo: s.titulo })));

export const contarItens = (op) => listarItens(op).length;

export const ordenarOperacoes = (a, b) => {
    const ca = CATEGORIAS_OPERACAO.findIndex((c) => c.key === a.categoria);
    const cb = CATEGORIAS_OPERACAO.findIndex((c) => c.key === b.categoria);
    if (ca !== cb) return ca - cb;
    const oa = Number(a.ordem) || 99;
    const ob = Number(b.ordem) || 99;
    if (oa !== ob) return oa - ob;
    return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
};

/** Texto pesquisável de uma operação (nome, nota, boletim, materiais, observações). */
export const textoBusca = (op) =>
    normalizeName([
        op.nome, op.subtitulo, op.nota, op.boletim, op.vigencia, op.descricao,
        ...(op.links || []).map((l) => l.rotulo),
        ...(op.secoes || []).flatMap((s) => [s.titulo, ...(s.itens || []).map((i) => i.nome)]),
        ...(op.observacoes || []).flatMap((o) => [o.titulo, o.texto]),
    ].filter(Boolean).join(' '));

export const combinaBusca = (texto, termo) => {
    const palavras = normalizeName(termo).split(/\s+/).filter(Boolean);
    if (!palavras.length) return true;
    return palavras.every((p) => texto.includes(p));
};

/* ------------------------------------------------------------------ */
/* Situação do item frente ao estoque do DEMOP                         */
/* ------------------------------------------------------------------ */

/**
 * Compara a quantidade fixada pela nota com o que existe no DEMOP.
 * `disponivel` é o `estoque_atual` (o que pode ser retirado agora: cautelas,
 * inoperantes e viaturas já foram descontados dele).
 *
 * nivel: 'ok' | 'parcial' | 'zerado' | 'sem_vinculo' | 'checklist'
 */
export const avaliarItem = (item, material) => {
    if (!material) return { nivel: 'sem_vinculo', disponivel: 0, emViatura: 0, total: 0, inoperantes: 0, previsto: item?.quantidade ?? null, falta: 0 };
    const disponivel = Math.max(0, Number(material.estoque_atual) || 0);
    const emViatura = Math.max(0, Number(material.estoque_viatura) || 0);
    const total = getTotalUnidades(material);
    const inoperantes = getQtdInoperante(material);
    const previsto = item?.quantidade ?? null;
    if (previsto === null) return { nivel: 'checklist', disponivel, emViatura, total, inoperantes, previsto, falta: 0 };
    const falta = Math.max(0, previsto - disponivel);
    const nivel = falta === 0 ? 'ok' : disponivel === 0 ? 'zerado' : 'parcial';
    return { nivel, disponivel, emViatura, total, inoperantes, previsto, falta };
};

export const NIVEL_ITEM = {
    ok: { label: 'Disponível', cor: '#16a34a' },
    parcial: { label: 'Abaixo do previsto', cor: '#d97706' },
    zerado: { label: 'Sem disponível', cor: '#dc2626' },
    sem_vinculo: { label: 'Sem vínculo com o estoque', cor: '#64748b' },
    checklist: { label: 'Checklist (sem quantidade)', cor: '#0891b2' },
};

/** Resumo de uma operação: quantos itens estão ok / abaixo / sem vínculo. */
export const resumirOperacao = (op, materialsById) => {
    const itens = listarItens(op);
    const resumo = { total: itens.length, ok: 0, abaixo: 0, semVinculo: 0, checklist: 0, vinculados: 0 };
    for (const item of itens) {
        const material = item.material_id ? materialsById.get(item.material_id) : null;
        if (material) resumo.vinculados += 1;
        const { nivel } = avaliarItem(item, material);
        if (nivel === 'ok') resumo.ok += 1;
        else if (nivel === 'parcial' || nivel === 'zerado') resumo.abaixo += 1;
        else if (nivel === 'checklist') resumo.checklist += 1;
        else resumo.semVinculo += 1;
    }
    return resumo;
};

/**
 * Sugere o material do DEMOP mais parecido com o nome que consta na nota
 * (para o admingeral confirmar o vínculo). Retorna null abaixo do limiar.
 */
export const sugerirMaterial = (nomeItem, materials = [], { limiar = 0.55, sinonimos = [] } = {}) => {
    const nomes = [nomeItem, ...parseSinonimos(sinonimos)]
        .map((n) => limpar(n).replace(/\(.*?\)/g, '').replace(/\b(c\/|e\/ou|ou mais|mínimo|minimo)\b.*$/i, '').trim())
        .filter((n) => n.length >= 3);
    if (!nomes.length) return null;
    let melhor = null;
    for (const m of materials) {
        for (const nome of nomes) {
            const s = calculateSimilarity(nome, m.description || '');
            if (s >= limiar && (!melhor || s > melhor.similaridade)) melhor = { material: m, similaridade: s };
        }
    }
    return melhor;
};

/* ------------------------------------------------------------------ */
/* Escrita                                                             */
/* ------------------------------------------------------------------ */

const auditoria = (action, op, user, details) => logAudit({
    action,
    userId: user?.userId || null,
    userName: user?.userName || '',
    targetCollection: 'operacoes',
    targetId: op?.id || null,
    targetName: op?.nome || null,
    details,
});

export async function criarOperacao(dados, user) {
    const erro = validarOperacao(dados);
    if (erro) throw new Error(erro);
    const docData = normalizarOperacao(dados);
    const ref = await addDoc(operacoesCollection, {
        ...docData,
        createdAt: serverTimestamp(),
        createdBy: user?.userId || null,
        updatedAt: serverTimestamp(),
        updatedBy: user?.userId || null,
    });
    await auditoria('operacao_create', { id: ref.id, nome: docData.nome }, user, { nota: docData.nota, categoria: docData.categoria });
    return ref.id;
}

export async function atualizarOperacao(op, dados, user) {
    const erro = validarOperacao({ ...op, ...dados });
    if (erro) throw new Error(erro);
    const docData = normalizarOperacao({ ...op, ...dados });
    await updateDoc(doc(db, 'operacoes', op.id), { ...docData, updatedAt: serverTimestamp(), updatedBy: user?.userId || null });
    await auditoria('operacao_update', { id: op.id, nome: docData.nome }, user, { nota: docData.nota });
}

export async function excluirOperacao(op, user) {
    await deleteDoc(doc(db, 'operacoes', op.id));
    await auditoria('operacao_delete', op, user, { nota: op.nota, itens: contarItens(op) });
}

/** Grava as seções (e seus itens) de uma operação; `detalhe` descreve o que mudou para a auditoria. */
export async function salvarSecoes(op, secoes, user, detalhe = {}) {
    const normalizadas = (secoes || []).map(normalizarSecao);
    await updateDoc(doc(db, 'operacoes', op.id), { secoes: normalizadas, updatedAt: serverTimestamp(), updatedBy: user?.userId || null });
    await auditoria('operacao_material', op, user, detalhe);
    return normalizadas;
}

/** Cria só as operações padrão que ainda não existem (comparadas pela `chave`). */
export async function semearOperacoes(user, { existentes = null } = {}) {
    const atuais = existentes ?? (await getDocs(operacoesCollection)).docs.map((d) => d.data());
    const chaves = new Set(atuais.map((o) => o.chave).filter(Boolean));
    const faltando = OPERACOES_PADRAO.filter((o) => !chaves.has(o.chave));
    if (!faltando.length) return 0;
    const batch = writeBatch(db);
    for (const o of faltando) {
        batch.set(doc(operacoesCollection), {
            ...normalizarOperacao(o),
            createdAt: serverTimestamp(),
            createdBy: user?.userId || null,
            updatedAt: serverTimestamp(),
            updatedBy: user?.userId || null,
        });
    }
    await batch.commit();
    await auditoria('operacao_seed', null, user, { criadas: faltando.map((o) => o.nome) });
    return faltando.length;
}
