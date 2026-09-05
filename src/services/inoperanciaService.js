import { getTotalUnidades, STATUS_INOPERANTE, derivarStatus } from '../utils/materialStatus';
import { sincronizarInoperantesNoLocal } from './localizacaoService';
import { pausarRecorrenciasDoMaterial, retomarRecorrenciasDoMaterial } from './maintenanceNotificationService';

/**
 * Efeitos colaterais de uma mudanca na quantidade inoperante de um material.
 *
 * Chamado DEPOIS que o documento do material ja foi gravado (MaterialDialog,
 * troca com viatura, conclusao de manutencao). Nunca lanca: qualquer falha aqui
 * nao pode derrubar o fluxo principal — apenas registra no console.
 *
 *  1. Local fisico: unidades que ficaram inoperantes vao para o local marcado
 *     como "inoperantes" (ex.: Prateleira 02); quando voltam a operante saem de la.
 *  2. Manutencao programada: material 100% inoperante para de renovar o ciclo
 *     (recorrencias pendentes ficam "pausadas"); ao voltar a operante, retoma.
 *
 * @returns {Promise<{ local: object|null, recorrencias: { pausadas?: number, retomadas?: number } }>}
 */
export async function aoAlterarInoperancia({ materialId, materialData, qtdAntes, qtdDepois, userId, userName }) {
    const resultado = { local: null, recorrencias: {} };
    if (!materialId) return resultado;

    const antes = Math.max(0, Number(qtdAntes) || 0);
    const depois = Math.max(0, Number(qtdDepois) || 0);
    const material = { id: materialId, ...(materialData || {}) };
    const total = getTotalUnidades(material);

    // 1) Local de inoperantes
    if (depois !== antes) {
        try {
            resultado.local = await sincronizarInoperantesNoLocal({
                material,
                delta: depois - antes,
                userId,
                userName,
            });
        } catch (e) {
            console.error('Erro ao sincronizar local de inoperantes:', e);
        }
    }

    // 2) Ciclo de manutencao programada
    try {
        const statusDepois = derivarStatus(depois, total);
        const estavaInoperante = total > 0 && antes >= total;
        if (statusDepois === STATUS_INOPERANTE) {
            const pausadas = await pausarRecorrenciasDoMaterial(materialId);
            if (pausadas > 0) resultado.recorrencias.pausadas = pausadas;
        } else if (estavaInoperante || antes > depois) {
            const retomadas = await retomarRecorrenciasDoMaterial(materialId);
            if (retomadas > 0) resultado.recorrencias.retomadas = retomadas;
        }
    } catch (e) {
        console.error('Erro ao pausar/retomar manutenções recorrentes:', e);
    }

    return resultado;
}

/** Monta uma frase curta para o feedback ao usuario (ou null se nada mudou). */
export function descreverEfeitosInoperancia(resultado) {
    if (!resultado) return null;
    const partes = [];
    if (resultado.local?.movidas > 0) {
        partes.push(resultado.local.direcao === 'entrada'
            ? `${resultado.local.movidas} un. movida(s) para ${resultado.local.local?.nome}`
            : `${resultado.local.movidas} un. retirada(s) de ${resultado.local.local?.nome} (sem local)`);
    }
    if (resultado.recorrencias?.pausadas > 0) {
        partes.push(`${resultado.recorrencias.pausadas} manutenção(ões) recorrente(s) pausada(s)`);
    }
    if (resultado.recorrencias?.retomadas > 0) {
        partes.push(`${resultado.recorrencias.retomadas} manutenção(ões) recorrente(s) retomada(s)`);
    }
    return partes.length > 0 ? partes.join(' · ') : null;
}
