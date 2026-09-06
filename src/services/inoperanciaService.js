import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    query,
    where,
    serverTimestamp,
} from 'firebase/firestore';
import db from '../firebase/db';
import { logAudit } from '../firebase/auditLog';
import {
    getTotalUnidades,
    getQtdInoperante,
    montarPatchInoperancia,
    derivarStatus,
    STATUS_INOPERANTE,
} from '../utils/materialStatus';
import { sincronizarInoperantesNoLocal } from './localizacaoService';
import { pausarRecorrenciasDoMaterial, retomarRecorrenciasDoMaterial } from './maintenanceNotificationService';

/**
 * Controle unificado de inoperância. Uma unidade inoperante existe em tres lugares
 * ao mesmo tempo, e este servico mantem os tres coerentes:
 *
 *  1. `materials.qtd_inoperante` (+ maintenance_status derivado) — o que a tela de
 *     materiais mostra e o que bloqueia o ciclo de manutencao programada.
 *  2. Uma movimentacao `type: 'reparo'` com `status: 'emReparo'` — o que a aba
 *     Pesquisa > Inoperantes lista.
 *  3. As unidades guardadas no local marcado como "inoperantes" (ex.: Prateleira 03).
 *
 * Qualquer entrada (movimentacao, edicao do material, troca, prateleira, conclusao
 * de manutencao, retorno de reparo) chama uma funcao daqui, que propaga para as outras.
 * Nenhuma funcao lanca erro para nao derrubar o fluxo principal.
 */

const ORIGEM_LABEL = {
    prateleira: 'Prateleira de inoperantes',
    edicao: 'Edição do material',
    movimentacao: 'Movimentação',
    troca: 'Troca com viatura',
    manutencao: 'Manutenção',
};

// ------------------------------------------------------------------
// Movimentacoes de reparo (o que aparece na Pesquisa > Inoperantes)
// ------------------------------------------------------------------

/** Cria a movimentacao de reparo que representa `quantidade` unidades inoperantes. */
export async function registrarMovimentacaoReparo({ material, quantidade, motivo, sei, localReparo, origem, userId, userName }) {
    const qtd = Math.max(0, Math.floor(Number(quantidade) || 0));
    if (!material?.id || qtd === 0) return null;
    const ref = await addDoc(collection(db, 'movimentacoes'), {
        type: 'reparo',
        material: material.id,
        material_description: material.description || '',
        categoria: material.categoria || '',
        quantity: qtd,
        date: new Date(),
        sender: userId || null,
        sender_name: userName || 'Sistema',
        signed: false,
        viatura: null,
        viatura_description: null,
        observacoes: motivo || null,
        status: 'emReparo',
        repairLocation: localReparo || ORIGEM_LABEL[origem] || 'DEMOP',
        seiNumber: sei || '',
        motivoReparo: motivo || ORIGEM_LABEL[origem] || 'Inoperante',
        origem_inoperancia: origem || 'sistema',
    });
    return ref.id;
}

/**
 * Encerra (marca como devolvidas do reparo) ate `quantidade` unidades das
 * movimentacoes de reparo abertas do material, das mais antigas para as mais novas.
 * Se uma movimentacao tiver mais unidades que o necessario, ela e dividida.
 * @returns {Promise<number>} unidades encerradas
 */
export async function encerrarMovimentacoesReparo({ materialId, quantidade, userId, userName, motivo, ignorarIds = [] }) {
    let restante = Math.max(0, Math.floor(Number(quantidade) || 0));
    if (!materialId || restante === 0) return 0;

    const snap = await getDocs(query(
        collection(db, 'movimentacoes'),
        where('material', '==', materialId),
        where('type', '==', 'reparo'),
        where('status', '==', 'emReparo'),
    ));
    const abertas = snap.docs
        .filter(d => !ignorarIds.includes(d.id))
        .map(d => ({ id: d.id, ref: d.ref, ...d.data() }))
        .sort((a, b) => {
            const da = a.date?.toDate?.() || new Date(a.date || 0);
            const dbb = b.date?.toDate?.() || new Date(b.date || 0);
            return da - dbb;
        });

    let encerradas = 0;
    for (const mov of abertas) {
        if (restante <= 0) break;
        const q = Math.max(0, Number(mov.quantity) || 0);
        if (q <= restante) {
            await updateDoc(mov.ref, {
                status: 'devolvidaDeReparo',
                returned_date: serverTimestamp(),
                devolvido_por: userId || null,
                devolvido_por_nome: userName || null,
                observacoes_devolucao: motivo || null,
            });
            restante -= q;
            encerradas += q;
        } else {
            // Divide: parte volta a operante, o resto continua em reparo
            await updateDoc(mov.ref, { quantity: q - restante });
            const { id: _id, ref: _ref, ...dados } = mov;
            await addDoc(collection(db, 'movimentacoes'), {
                ...dados,
                quantity: restante,
                status: 'devolvidaDeReparo',
                returned_date: serverTimestamp(),
                devolvido_por: userId || null,
                devolvido_por_nome: userName || null,
                observacoes_devolucao: motivo || null,
                dividida_de: mov.id,
            });
            encerradas += restante;
            restante = 0;
        }
    }
    return encerradas;
}

// ------------------------------------------------------------------
// Propagacao
// ------------------------------------------------------------------

/**
 * Efeitos colaterais de uma mudanca na quantidade inoperante de um material.
 * Chamado DEPOIS que o documento do material ja foi gravado.
 *
 *  - Local fisico: leva/tira unidades do local de inoperantes.
 *  - Manutencao programada: pausa quando 100% inoperante, retoma ao voltar.
 *  - Pesquisa de inoperantes (se `sincronizarMovimentacoes`): cria a movimentacao
 *    de reparo quando aumenta e encerra movimentacoes abertas quando diminui.
 */
export async function aoAlterarInoperancia({
    materialId,
    materialData,
    qtdAntes,
    qtdDepois,
    userId,
    userName,
    sincronizarMovimentacoes = false,
    motivo,
    sei,
    localReparo,
    origem,
    ignorarMovimentacoes = [],
}) {
    const resultado = { local: null, recorrencias: {}, movimentacoes: null };
    if (!materialId) return resultado;

    const antes = Math.max(0, Number(qtdAntes) || 0);
    const depois = Math.max(0, Number(qtdDepois) || 0);
    const material = { id: materialId, ...(materialData || {}) };
    const total = getTotalUnidades(material);
    const delta = depois - antes;

    if (delta !== 0) {
        try {
            resultado.local = await sincronizarInoperantesNoLocal({ material, delta, userId, userName });
        } catch (e) {
            console.error('Erro ao sincronizar local de inoperantes:', e);
        }
    }

    if (delta !== 0 && sincronizarMovimentacoes) {
        try {
            if (delta > 0) {
                const id = await registrarMovimentacaoReparo({ material, quantidade: delta, motivo, sei, localReparo, origem, userId, userName });
                resultado.movimentacoes = { criadas: id ? delta : 0 };
            } else {
                const encerradas = await encerrarMovimentacoesReparo({ materialId, quantidade: -delta, userId, userName, motivo, ignorarIds: ignorarMovimentacoes });
                resultado.movimentacoes = { encerradas };
            }
        } catch (e) {
            console.error('Erro ao sincronizar movimentações de reparo:', e);
        }
    }

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

/**
 * Entrada pela prateleira: o admin guardou/tirou unidades do local de inoperantes.
 * A quantidade inoperante do material passa a ser exatamente o que esta nesse local
 * (limitado ao total). Unidades que ficam inoperantes saem do estoque disponivel e
 * ganham movimentacao de reparo; as que voltam a operante fazem o caminho inverso.
 *
 * NAO mexe em material_locais (quem chamou acabou de gravar la).
 * @returns {Promise<{ delta: number, qtdInoperante: number } | null>}
 */
export async function aplicarInoperanciaPeloLocal({ material, unidadesNoLocalInoperantes, localNome, userId, userName }) {
    if (!material?.id) return null;
    try {
        const ref = doc(db, 'materials', material.id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        const dados = snap.data();
        const total = getTotalUnidades(dados);
        const atual = getQtdInoperante(dados);
        const alvo = Math.max(0, Math.min(Math.floor(Number(unidadesNoLocalInoperantes) || 0), total));
        const delta = alvo - atual;
        if (delta === 0) return null;

        const patch = montarPatchInoperancia(dados, alvo, dados.maintenance_status);
        const estoqueAtual = Math.max(0, Number(dados.estoque_atual) || 0);
        if (delta > 0) {
            patch.estoque_atual = Math.max(0, estoqueAtual - delta);
            patch.inoperante_motivo = `Guardado em ${localNome}`;
            patch.inoperante_registrado_em = serverTimestamp();
            if (!dados.inoperante_sei) patch.inoperante_sei = '';
        } else {
            patch.estoque_atual = Math.min(total || Infinity, estoqueAtual + (-delta));
        }
        patch.ultima_movimentacao = serverTimestamp();
        await updateDoc(ref, patch);

        const materialCompleto = { id: material.id, ...dados, ...patch };
        if (delta > 0) {
            await registrarMovimentacaoReparo({
                material: materialCompleto,
                quantidade: delta,
                motivo: `Guardado na ${localNome} (prateleira de inoperantes)`,
                localReparo: localNome,
                origem: 'prateleira',
                userId,
                userName,
            });
        } else {
            await encerrarMovimentacoesReparo({ materialId: material.id, quantidade: -delta, userId, userName, motivo: `Retirado da ${localNome}` });
        }

        try {
            const statusDepois = patch.maintenance_status;
            if (statusDepois === STATUS_INOPERANTE) await pausarRecorrenciasDoMaterial(material.id);
            else if (delta < 0) await retomarRecorrenciasDoMaterial(material.id);
        } catch (e) {
            console.error('Erro ao pausar/retomar recorrências:', e);
        }

        logAudit({
            action: 'material_update',
            userId,
            userName,
            targetCollection: 'materials',
            targetId: material.id,
            targetName: material.description || dados.description,
            details: {
                categoria: dados.categoria,
                alteracoes: [
                    { campo: 'qtd_inoperante', de: atual, para: alvo },
                    { campo: 'estoque_atual', de: estoqueAtual, para: patch.estoque_atual },
                ],
                motivo: delta > 0 ? `Guardado na ${localNome}` : `Retirado da ${localNome}`,
            },
        });

        return { delta, qtdInoperante: alvo };
    } catch (e) {
        console.error('Erro ao aplicar inoperância pela prateleira:', e);
        return null;
    }
}

/**
 * Retorno de reparo (Pesquisa > Inoperantes ou Devolucoes > reparo): a quantidade
 * devolvida deixa de ser inoperante, volta ao estoque disponivel (se ainda nao voltou),
 * sai do local de inoperantes e retoma recorrencias.
 * @param {boolean} estoqueJaRestaurado quem chamou ja somou ao estoque_atual
 */
export async function aposRetornoDeReparo({ movimentacao, userId, userName, estoqueJaRestaurado = false }) {
    const materialId = movimentacao?.material;
    const qtd = Math.max(0, Math.floor(Number(movimentacao?.quantity) || 0));
    if (!materialId || qtd === 0) return null;
    try {
        const ref = doc(db, 'materials', materialId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        const dados = snap.data();
        const antes = getQtdInoperante(dados);
        const depois = Math.max(0, antes - qtd);
        const patch = montarPatchInoperancia(dados, depois, dados.maintenance_status);
        if (!estoqueJaRestaurado) {
            patch.estoque_atual = Math.min(getTotalUnidades(dados) || Infinity, Math.max(0, Number(dados.estoque_atual) || 0) + qtd);
        }
        patch.ultima_movimentacao = serverTimestamp();
        await updateDoc(ref, patch);

        return aoAlterarInoperancia({
            materialId,
            materialData: { ...dados, ...patch },
            qtdAntes: antes,
            qtdDepois: depois,
            userId,
            userName,
            sincronizarMovimentacoes: false, // a movimentacao devolvida ja foi encerrada por quem chamou
        });
    } catch (e) {
        console.error('Erro ao processar retorno de reparo:', e);
        return null;
    }
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
    if (resultado.movimentacoes?.criadas > 0) partes.push('lançado na pesquisa de inoperantes');
    if (resultado.movimentacoes?.encerradas > 0) partes.push(`${resultado.movimentacoes.encerradas} un. baixada(s) da pesquisa de inoperantes`);
    if (resultado.recorrencias?.pausadas > 0) partes.push(`${resultado.recorrencias.pausadas} manutenção(ões) recorrente(s) pausada(s)`);
    if (resultado.recorrencias?.retomadas > 0) partes.push(`${resultado.recorrencias.retomadas} manutenção(ões) recorrente(s) retomada(s)`);
    return partes.length > 0 ? partes.join(' · ') : null;
}

/** Frase para o resultado de aplicarInoperanciaPeloLocal. */
export function descreverInoperanciaPeloLocal(inop) {
    if (!inop || !inop.delta) return null;
    return inop.delta > 0
        ? `${inop.delta} un. marcada(s) como inoperante(s) e lançada(s) na pesquisa de inoperantes`
        : `${-inop.delta} un. voltaram a operante e saíram da pesquisa de inoperantes`;
}
