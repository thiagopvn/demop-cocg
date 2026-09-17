/**
 * Controle de carga (cheio / vazio) — separado da inoperância.
 *
 * Um extintor ou cilindro descarregado não está inoperante: ele está íntegro, só
 * precisa de recarga. `qtd_vazios` conta quantas unidades do DISPONÍVEL (estoque_atual)
 * estão vazias aguardando recarga. Cheios = disponível − vazios.
 *
 *  - `controla_carga` (bool) liga o controle no material; se o campo não existir,
 *    é inferido pelo nome (extintor, cilindro).
 *  - Unidades em viatura, cauteladas ou inoperantes não entram na conta.
 */

const PADRAO_CARGA = /\b(extintor|extintores|cilindro|cilindros)\b/i;

export const sugereControleCarga = (descricao = '') => PADRAO_CARGA.test(String(descricao || ''));

export const controlaCarga = (material) => {
    if (!material) return false;
    if (typeof material.controla_carga === 'boolean') return material.controla_carga;
    return sugereControleCarga(material.description);
};

export const getDisponivel = (material) => Math.max(0, Number(material?.estoque_atual) || 0);

export const getQtdVazios = (material) => {
    const v = Number(material?.qtd_vazios);
    if (!Number.isFinite(v) || v <= 0) return 0;
    return Math.min(v, getDisponivel(material));
};

export const getQtdCheios = (material) => Math.max(0, getDisponivel(material) - getQtdVazios(material));

/** Resumo para a interface. `nivel`: ok | atencao (há vazios) | critico (nenhum cheio). */
export const resumoCarga = (material) => {
    const disponivel = getDisponivel(material);
    const vazios = getQtdVazios(material);
    const cheios = getQtdCheios(material);
    const nivel = disponivel === 0 ? 'sem_disponivel' : vazios === 0 ? 'ok' : cheios === 0 ? 'critico' : 'atencao';
    return { disponivel, vazios, cheios, nivel, percentualCheios: disponivel ? Math.round((cheios / disponivel) * 100) : 0 };
};

export const CORES_CARGA = {
    cheio: '#16a34a',
    vazio: '#d97706',
    critico: '#dc2626',
};

/** Soma de vazios/cheios de uma lista de materiais com controle de carga. */
export const totalizarCarga = (materials = []) => {
    const lista = materials.filter(controlaCarga);
    return lista.reduce((acc, m) => {
        const r = resumoCarga(m);
        acc.materiais += 1;
        acc.vazios += r.vazios;
        acc.cheios += r.cheios;
        if (r.vazios > 0) acc.comVazios += 1;
        return acc;
    }, { materiais: 0, vazios: 0, cheios: 0, comVazios: 0 });
};
