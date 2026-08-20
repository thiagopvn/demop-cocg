import { collection, query, where, getDocs, getDoc, doc, updateDoc, deleteField } from 'firebase/firestore';
import db from '../firebase/db';

export const STATUS_OPERANTE = 'operante';
export const STATUS_PARCIAL = 'parcialmente_inoperante';
export const STATUS_EM_MANUTENCAO = 'em_manutencao';
export const STATUS_INOPERANTE = 'inoperante';

export const MAINTENANCE_STATUS_LABELS = {
    [STATUS_OPERANTE]: 'Operante',
    [STATUS_PARCIAL]: 'Parcial',
    [STATUS_EM_MANUTENCAO]: 'Em Manutenção',
    [STATUS_INOPERANTE]: 'Inoperante',
};

export const MAINTENANCE_STATUS_COLORS = {
    [STATUS_OPERANTE]: 'success',
    [STATUS_PARCIAL]: 'warning',
    [STATUS_EM_MANUTENCAO]: 'info',
    [STATUS_INOPERANTE]: 'error',
};

export const getMaintenanceStatusLabel = (status) => MAINTENANCE_STATUS_LABELS[status] || 'Operante';
export const getMaintenanceStatusColor = (status) => MAINTENANCE_STATUS_COLORS[status] || 'default';

/** Total de unidades do material (cai para estoque_atual quando estoque_total nao existe). */
export const getTotalUnidades = (material) => {
    const total = Number(material?.estoque_total);
    if (Number.isFinite(total) && total > 0) return total;
    const atual = Number(material?.estoque_atual);
    return Number.isFinite(atual) && atual > 0 ? atual : 0;
};

/**
 * Quantas unidades estao inoperantes.
 *
 * Materiais antigos nao tem qtd_inoperante; para eles inferimos a partir do
 * maintenance_status legado (inoperante = todas as unidades).
 */
export const getQtdInoperante = (material) => {
    const qtd = Number(material?.qtd_inoperante);
    if (Number.isFinite(qtd) && qtd >= 0) return Math.min(qtd, getTotalUnidades(material));
    return material?.maintenance_status === STATUS_INOPERANTE ? getTotalUnidades(material) : 0;
};

export const getQtdOperante = (material) => Math.max(0, getTotalUnidades(material) - getQtdInoperante(material));

/**
 * Deriva o maintenance_status a partir da quantidade inoperante.
 *
 * `statusAtual` so e usado para preservar "em_manutencao" quando nenhuma
 * unidade esta inoperante — esse estado e controlado pelas manutencoes, nao
 * pela contagem.
 */
export const derivarStatus = (qtdInoperante, total, statusAtual) => {
    const qtd = Math.max(0, Number(qtdInoperante) || 0);
    if (qtd <= 0) return statusAtual === STATUS_EM_MANUTENCAO ? STATUS_EM_MANUTENCAO : STATUS_OPERANTE;
    if (total > 0 && qtd >= total) return STATUS_INOPERANTE;
    return STATUS_PARCIAL;
};

/** Campos de inoperancia gravados por Movimentacoes, limpos quando zera. */
export const CAMPOS_INOPERANCIA = ['inoperante_sei', 'inoperante_motivo', 'inoperante_registrado_em'];

export const limparCamposInoperancia = () =>
    Object.fromEntries(CAMPOS_INOPERANCIA.map(campo => [campo, deleteField()]));

/**
 * Monta o patch que grava a nova quantidade inoperante e o status derivado.
 * Nao escreve no Firestore — devolve o objeto para quem chama (batch ou update).
 *
 * `paraCriacao` deve ser true quando o objeto vai para addDoc()/setDoc() sem
 * merge: sentinelas deleteField() sao invalidas nesses casos, e o documento
 * novo nao tem os campos de inoperancia para limpar de qualquer forma.
 */
export const montarPatchInoperancia = (material, novaQtdInoperante, statusAtual, { paraCriacao = false } = {}) => {
    const total = getTotalUnidades(material);
    const qtd = Math.max(0, Math.min(Number(novaQtdInoperante) || 0, total || Infinity));
    const patch = {
        qtd_inoperante: qtd,
        maintenance_status: derivarStatus(qtd, total, statusAtual ?? material?.maintenance_status),
    };
    if (qtd === 0 && !paraCriacao) Object.assign(patch, limparCamposInoperancia());
    return patch;
};

/**
 * Ajusta o status do material depois que UMA manutencao e concluida.
 *
 * Concluir uma manutencao devolve ao estoque as unidades que ela cobria
 * (`unidadesAfetadas`). O material so volta a "operante" quando nao resta
 * nenhuma unidade inoperante nem outra manutencao em aberto.
 */
export async function sincronizarStatusAposConclusao(materialId, manutencaoConcluidaId, timestamp, unidadesAfetadas = 0) {
    if (!materialId) return;

    const materialRef = doc(db, 'materials', materialId);

    let pendentes = [];
    let materialData = null;
    try {
        const [pendentesSnap, materialSnap] = await Promise.all([
            getDocs(query(
                collection(db, 'manutencoes'),
                where('materialId', '==', materialId),
                where('status', 'in', ['pendente', 'em_andamento'])
            )),
            getDoc(materialRef),
        ]);
        pendentes = pendentesSnap.docs.filter(d => d.id !== manutencaoConcluidaId);
        materialData = materialSnap.exists() ? materialSnap.data() : null;
    } catch (e) {
        console.error('Erro ao verificar pendencias do material:', e);
        return; // na duvida, nao mexe no status
    }
    if (!materialData) return;

    const qtdAtual = getQtdInoperante(materialData);
    const novaQtd = Math.max(0, qtdAtual - Math.max(0, Number(unidadesAfetadas) || 0));

    const update = {
        last_maintenance_update: timestamp,
        last_maintenance_date: timestamp,
        ...montarPatchInoperancia(materialData, novaQtd, STATUS_OPERANTE),
    };

    // Ainda ha manutencao aberta e nenhuma unidade inoperante: segue em manutencao.
    if (pendentes.length > 0 && novaQtd === 0) {
        update.maintenance_status = STATUS_EM_MANUTENCAO;
    }

    try {
        await updateDoc(materialRef, update);
    } catch (e) {
        console.error('Erro ao atualizar status do material:', e);
    }
}

/**
 * Backfill: normaliza qtd_inoperante/maintenance_status de todos os materiais.
 *
 * Necessario porque o campo qtd_inoperante nao existia antes, e porque
 * materiais com inoperancia registrada (inoperante_sei/motivo) ou com
 * manutencao corretiva aberta ficaram com maintenance_status 'operante'.
 *
 * @returns {Promise<{ total: number, atualizados: number, detalhes: Array }>}
 */
export async function backfillStatusMateriais() {
    const [materiaisSnap, manutencoesSnap] = await Promise.all([
        getDocs(collection(db, 'materials')),
        getDocs(query(collection(db, 'manutencoes'), where('status', 'in', ['pendente', 'em_andamento']))),
    ]);

    // materialId -> unidades marcadas como inoperantes por manutencoes abertas
    const inopPorManutencao = new Map();
    const temManutencaoAberta = new Set();
    manutencoesSnap.docs.forEach(d => {
        const m = d.data();
        if (!m.materialId) return;
        temManutencaoAberta.add(m.materialId);
        const unidades = Number(m.inoperantQuantity) || 0;
        if (unidades > 0) {
            inopPorManutencao.set(m.materialId, (inopPorManutencao.get(m.materialId) || 0) + unidades);
        }
    });

    const detalhes = [];
    let atualizados = 0;

    for (const docSnap of materiaisSnap.docs) {
        const material = docSnap.data();
        const total = getTotalUnidades(material);
        const statusAtual = material.maintenance_status || STATUS_OPERANTE;

        // Fonte da verdade, na ordem: contagem ja existente > manutencoes abertas
        // > registro de inoperancia vindo de Movimentacoes > status legado.
        let qtd = Number(material.qtd_inoperante);
        if (!Number.isFinite(qtd) || qtd < 0) {
            const porManutencao = inopPorManutencao.get(docSnap.id) || 0;
            const temRegistroInoperancia = Boolean(material.inoperante_sei || material.inoperante_motivo);
            if (porManutencao > 0) qtd = porManutencao;
            else if (statusAtual === STATUS_INOPERANTE) qtd = total;
            else if (temRegistroInoperancia) qtd = total; // marcado inoperante mas status nao acompanhou
            else qtd = 0;
        }
        qtd = Math.max(0, Math.min(qtd, total));

        const statusDerivado = derivarStatus(
            qtd,
            total,
            temManutencaoAberta.has(docSnap.id) ? STATUS_EM_MANUTENCAO : STATUS_OPERANTE
        );

        const precisaAtualizar = Number(material.qtd_inoperante) !== qtd || statusAtual !== statusDerivado;
        if (!precisaAtualizar) continue;

        try {
            await updateDoc(doc(db, 'materials', docSnap.id), {
                qtd_inoperante: qtd,
                maintenance_status: statusDerivado,
            });
            atualizados += 1;
            detalhes.push({
                id: docSnap.id,
                description: material.description || '',
                de: statusAtual,
                para: statusDerivado,
                qtd_inoperante: qtd,
                total,
            });
        } catch (e) {
            console.error('Falha ao normalizar material', docSnap.id, e);
        }
    }

    return { total: materiaisSnap.size, atualizados, detalhes };
}
