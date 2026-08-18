import { collection, query, where, getDocs, doc, updateDoc, deleteField } from 'firebase/firestore';
import db from '../firebase/db';

/**
 * Campos gravados quando um material volta de viatura como inoperante
 * (ver Movimentacoes). Precisam ser limpos quando ele volta a ser operante,
 * senao o motivo/SEI antigo fica colado no material para sempre.
 */
export const limparCamposInoperancia = () => ({
    inoperante_sei: deleteField(),
    inoperante_motivo: deleteField(),
    inoperante_registrado_em: deleteField(),
});

/**
 * Ajusta o status do material depois que UMA manutencao e concluida.
 *
 * Concluir uma manutencao nao significa que o material esta operante: ele pode
 * ter outras manutencoes em aberto, ou ter sido marcado inoperante por outro
 * motivo. So voltamos para "operante" quando nao resta nenhuma pendencia.
 *
 * @param {string} materialId
 * @param {string} manutencaoConcluidaId - ignorada na contagem de pendencias
 * @param {import('firebase/firestore').Timestamp} timestamp
 */
export async function sincronizarStatusAposConclusao(materialId, manutencaoConcluidaId, timestamp) {
    if (!materialId) return;

    let pendentes = [];
    try {
        const snap = await getDocs(query(
            collection(db, 'manutencoes'),
            where('materialId', '==', materialId),
            where('status', 'in', ['pendente', 'em_andamento'])
        ));
        pendentes = snap.docs.filter(d => d.id !== manutencaoConcluidaId);
    } catch (e) {
        console.error('Erro ao verificar manutencoes pendentes do material:', e);
        return; // na duvida, nao mexe no status
    }

    const update = {
        last_maintenance_update: timestamp,
        last_maintenance_date: timestamp,
    };

    // Ainda ha pendencias: preserva o status atual (em_manutencao/inoperante).
    if (pendentes.length === 0) {
        update.maintenance_status = 'operante';
        Object.assign(update, limparCamposInoperancia());
    }

    try {
        await updateDoc(doc(db, 'materials', materialId), update);
    } catch (e) {
        console.error('Erro ao atualizar status do material:', e);
    }
}
