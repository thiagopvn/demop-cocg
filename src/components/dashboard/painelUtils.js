import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import db from '../../firebase/db';
import { getTotalUnidades, getQtdInoperante } from '../../utils/materialStatus';
import { resumirLocalizacao } from '../../services/localizacaoService';

/* ------------------------------------------------------------------ */
/* Paleta (referencia validada para daltonismo, claro e escuro)        */
/* ------------------------------------------------------------------ */
export const SERIES_CLARO = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
export const SERIES_ESCURO = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

/** Cada tipo de movimentacao tem um slot fixo (cor segue a entidade, nunca a posicao). */
export const TIPOS_MOV = [
    { key: 'cautela', label: 'Cautela', slot: 0 },
    { key: 'entrada', label: 'Entrada', slot: 2 },
    { key: 'saída', label: 'Saída', slot: 1 },
    { key: 'reparo', label: 'Inoperante/Reparo', slot: 7 },
    { key: 'troca', label: 'Troca c/ viatura', slot: 6 },
];
export const corTipo = (key, escuro) => {
    const t = TIPOS_MOV.find(x => x.key === key);
    const paleta = escuro ? SERIES_ESCURO : SERIES_CLARO;
    return paleta[t ? t.slot : 4];
};
export const labelTipo = (key) => TIPOS_MOV.find(x => x.key === key)?.label || key || '—';

export const STATUS_MOV = {
    cautelado: 'Em aberto',
    devolvido: 'Devolvido',
    emEstoque: 'Entrada',
    descartado: 'Saída concluída',
    emReparo: 'Em reparo',
    devolvidaDeReparo: 'Voltou do reparo',
};

/* ------------------------------------------------------------------ */
/* Datas                                                               */
/* ------------------------------------------------------------------ */
export const toDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v.toDate === 'function') return v.toDate();
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

export const PERIODOS = [
    { value: '7', label: '7 dias' },
    { value: '30', label: '30 dias' },
    { value: '90', label: '90 dias' },
    { value: '365', label: '12 meses' },
    { value: 'ano', label: 'Este ano' },
    { value: 'tudo', label: 'Tudo' },
    { value: 'custom', label: 'Personalizado' },
];

/** Devolve { inicio, fim } do periodo (fim exclusivo) ou nulls para "tudo". */
export const intervaloDoPeriodo = (periodo, customInicio, customFim) => {
    const fim = new Date();
    fim.setHours(23, 59, 59, 999);
    if (periodo === 'tudo') return { inicio: null, fim: null };
    if (periodo === 'custom') {
        const i = customInicio ? new Date(customInicio + 'T00:00:00') : null;
        const f = customFim ? new Date(customFim + 'T23:59:59') : fim;
        return { inicio: i, fim: f };
    }
    if (periodo === 'ano') {
        return { inicio: new Date(fim.getFullYear(), 0, 1), fim };
    }
    const dias = parseInt(periodo, 10) || 30;
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    inicio.setDate(inicio.getDate() - (dias - 1));
    return { inicio, fim };
};

/** Periodo imediatamente anterior, com a mesma duracao (para comparar). */
export const intervaloAnterior = ({ inicio, fim }) => {
    if (!inicio || !fim) return null;
    const dur = fim - inicio;
    return { inicio: new Date(inicio.getTime() - dur - 1), fim: new Date(inicio.getTime() - 1) };
};

export const dentro = (data, { inicio, fim }) => {
    if (!data) return false;
    if (inicio && data < inicio) return false;
    if (fim && data > fim) return false;
    return true;
};

export const normalizar = (t = '') => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const fmtData = (d) => (d ? d.toLocaleDateString('pt-BR') : '—');
export const fmtDataHora = (d) => (d ? `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '—');
export const fmtNum = (n) => new Intl.NumberFormat('pt-BR').format(Number(n) || 0);
export const diasEntre = (a, b) => Math.max(0, Math.round((b - a) / 86400000));

/** Escolhe a granularidade da serie temporal pelo tamanho do intervalo. */
export const granularidade = ({ inicio, fim }, datas) => {
    let i = inicio;
    let f = fim || new Date();
    if (!i) {
        const ordenadas = datas.filter(Boolean).sort((a, b) => a - b);
        i = ordenadas[0] || new Date();
    }
    const dias = diasEntre(i, f);
    if (dias <= 45) return 'dia';
    if (dias <= 200) return 'semana';
    return 'mes';
};

export const chaveDia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const inicioSemana = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; };
export const chaveMes = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
/** Chave de agrupamento de uma data numa granularidade (dia | semana | mes). */
export const chaveNaGranularidade = (d, gran) => (gran === 'dia' ? chaveDia(d) : gran === 'semana' ? chaveDia(inicioSemana(d)) : chaveMes(d));
export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const FAIXAS_DEVOLUCAO = [['Mesmo dia', 0, 0], ['1-3 dias', 1, 3], ['4-7 dias', 4, 7], ['8-15 dias', 8, 15], ['16-30 dias', 16, 30], ['+30 dias', 31, Infinity]];
/** Rotulo legivel de um filtro de data vindo do grafico de linha (gran:chave). */
export const rotuloDataSel = (dataSel) => {
    if (!dataSel) return '';
    const [gran, chave] = dataSel.split(':');
    if (gran === 'mes') { const [y, m] = chave.split('-'); return `Mês: ${new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}`; }
    const [, m, d] = chave.split('-');
    return gran === 'semana' ? `Semana de ${d}/${m}` : `Dia: ${d}/${m}`;
};

/**
 * Serie temporal de movimentacoes por tipo, preenchendo buracos com zero.
 * @returns [{ chave, rotulo, data, total, cautela, entrada, ... }]
 */
export const serieTemporal = (movs, intervalo) => {
    const datas = movs.map(m => toDate(m.date));
    const gran = granularidade(intervalo, datas);
    const chaveDe = (d) => {
        if (gran === 'dia') return chaveDia(d);
        if (gran === 'semana') return chaveDia(inicioSemana(d));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const rotuloDe = (chave) => {
        if (gran === 'mes') {
            const [y, m] = chave.split('-');
            return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        }
        const [, m, d] = chave.split('-');
        return `${d}/${m}${gran === 'semana' ? '' : ''}`;
    };

    const mapa = new Map();
    for (const m of movs) {
        const d = toDate(m.date);
        if (!d) continue;
        const k = chaveDe(d);
        if (!mapa.has(k)) mapa.set(k, { chave: k, rotulo: rotuloDe(k), total: 0 });
        const linha = mapa.get(k);
        linha.total += 1;
        linha[m.type] = (linha[m.type] || 0) + 1;
    }

    // Preenche buracos
    let i = intervalo.inicio ? new Date(intervalo.inicio) : (datas.filter(Boolean).sort((a, b) => a - b)[0] || new Date());
    const f = intervalo.fim || new Date();
    i = new Date(i); i.setHours(0, 0, 0, 0);
    if (gran === 'semana') i = inicioSemana(i);
    if (gran === 'mes') i = new Date(i.getFullYear(), i.getMonth(), 1);
    let guarda = 0;
    while (i <= f && guarda < 400) {
        const k = chaveDe(i);
        if (!mapa.has(k)) mapa.set(k, { chave: k, rotulo: rotuloDe(k), total: 0 });
        if (gran === 'dia') i.setDate(i.getDate() + 1);
        else if (gran === 'semana') i.setDate(i.getDate() + 7);
        else i.setMonth(i.getMonth() + 1);
        guarda += 1;
    }
    return { gran, pontos: [...mapa.values()].sort((a, b) => a.chave.localeCompare(b.chave)) };
};

export const contar = (lista, chaveFn, rotuloFn = (k) => k) => {
    const mapa = new Map();
    for (const item of lista) {
        const k = chaveFn(item);
        if (k === null || k === undefined || k === '') continue;
        if (!mapa.has(k)) mapa.set(k, { chave: k, nome: rotuloFn(k, item), valor: 0 });
        mapa.get(k).valor += 1;
    }
    return [...mapa.values()].sort((a, b) => b.valor - a.valor);
};

export const somar = (lista, chaveFn, valorFn, rotuloFn = (k) => k) => {
    const mapa = new Map();
    for (const item of lista) {
        const k = chaveFn(item);
        if (k === null || k === undefined || k === '') continue;
        if (!mapa.has(k)) mapa.set(k, { chave: k, nome: rotuloFn(k, item), valor: 0 });
        mapa.get(k).valor += Number(valorFn(item)) || 0;
    }
    return [...mapa.values()].sort((a, b) => b.valor - a.valor);
};

/* ------------------------------------------------------------------ */
/* Dados                                                               */
/* ------------------------------------------------------------------ */

const docsDe = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));

/**
 * Carrega, uma vez, tudo que o painel precisa. `recarregar()` refaz a leitura.
 * Materiais e locais chegam por props (contextos em tempo real).
 */
export function usePainelDados() {
    const [dados, setDados] = useState({ movimentacoes: [], users: [], viaturas: [], viaturaMateriais: [], manutencoes: [], historico: [], conferencias: [] });
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);
    const [versao, setVersao] = useState(0);

    const recarregar = useCallback(() => setVersao(v => v + 1), []);

    useEffect(() => {
        let cancelado = false;
        setLoading(true);
        (async () => {
            try {
                const [mov, users, viaturas, vm, man, hist, conf] = await Promise.all([
                    getDocs(collection(db, 'movimentacoes')),
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'viaturas')),
                    getDocs(query(collection(db, 'viatura_materiais'), where('status', '==', 'alocado'))),
                    getDocs(collection(db, 'manutencoes')),
                    getDocs(collection(db, 'historico_manutencoes')),
                    getDocs(collection(db, 'conferencias_viaturas')).catch(() => ({ docs: [] })),
                ]);
                if (cancelado) return;
                setDados({
                    movimentacoes: docsDe(mov),
                    users: docsDe(users),
                    viaturas: docsDe(viaturas),
                    viaturaMateriais: docsDe(vm),
                    manutencoes: docsDe(man),
                    historico: docsDe(hist),
                    conferencias: docsDe(conf),
                });
                setErro(null);
            } catch (e) {
                console.error('Erro ao carregar o painel:', e);
                if (!cancelado) setErro('Não foi possível carregar os dados do painel.');
            } finally {
                if (!cancelado) setLoading(false);
            }
        })();
        return () => { cancelado = true; };
    }, [versao]);

    const usersById = useMemo(() => new Map(dados.users.map(u => [u.id, u])), [dados.users]);
    const viaturasById = useMemo(() => new Map(dados.viaturas.map(v => [v.id, v])), [dados.viaturas]);

    return { ...dados, usersById, viaturasById, loading, erro, recarregar };
}

/** Nome exibivel do militar de uma movimentacao (nunca o RG). */
export const nomeMilitar = (mov, usersById) => {
    const u = mov.user ? usersById?.get(mov.user) : null;
    return u?.full_name || mov.user_name || (mov.user ? 'Militar' : '—');
};

export const nomeViatura = (mov, viaturasById) => {
    const v = mov.viatura ? viaturasById?.get(mov.viatura) : null;
    if (v) return v.prefixo ? `${v.prefixo} - ${v.description || ''}`.trim() : (v.description || '—');
    return mov.viatura_description || '—';
};

/* ------------------------------------------------------------------ */
/* Indicadores                                                         */
/* ------------------------------------------------------------------ */

/**
 * Aplica os filtros e calcula todos os indicadores do painel.
 * Tudo puro: recebe arrays, devolve numeros e listas prontas para os graficos.
 */
export function calcularPainel({ dados, materials, locais, alocacoesPorMaterial, filtros }) {
    const { movimentacoes, usersById, viaturasById, viaturaMateriais, manutencoes, historico, viaturas } = dados;
    const intervalo = intervaloDoPeriodo(filtros.periodo, filtros.inicio, filtros.fim);
    const anterior = intervaloAnterior(intervalo);
    const agora = new Date();

    // Busca livre: sem acentos, varias palavras (todas precisam bater)
    const termos = normalizar(filtros.busca || '').split(/\s+/).filter(Boolean);
    const bate = (...partes) => {
        if (termos.length === 0) return true;
        const alvo = normalizar(partes.filter(Boolean).join(' '));
        return termos.every(t => alvo.includes(t));
    };
    const locaisDoMaterial = (materialId) => (alocacoesPorMaterial?.get(materialId) || []).map(a => a.local_nome || '').join(' ');
    const textoUsuario = (u) => (u ? `${u.full_name || ''} ${u.username || ''} ${u.rg || ''} ${u.OBM || ''} ${u.email || ''}` : '');

    // Filtros que agem sobre os materiais (status, composicao, local) ------
    const locaisById = new Map((locais || []).map(l => [l.id, l]));
    const bateStatus = (m) => !filtros.statusMaterial || (m.maintenance_status || 'operante') === filtros.statusMaterial;
    const bateComposicao = (m) => {
        if (filtros.composicao === 'disponivel') return (Number(m.estoque_atual) || 0) > 0;
        if (filtros.composicao === 'viatura') return (Number(m.estoque_viatura) || 0) > 0;
        if (filtros.composicao === 'inoperante') return getQtdInoperante(m) > 0;
        return true;
    };
    const bateLocal = (m) => {
        if (!filtros.local && !filtros.tipoLocal) return true;
        const alocs = (alocacoesPorMaterial?.get(m.id) || []).filter(a => (Number(a.quantidade) || 0) > 0);
        if (filtros.local && !alocs.some(a => a.local_id === filtros.local)) return false;
        if (filtros.tipoLocal && !alocs.some(a => { const l = locaisById.get(a.local_id); return l && (l.tipo_label || l.tipo) === filtros.tipoLocal; })) return false;
        return true;
    };
    const materiaisBase = materials.filter(m => {
        if (filtros.categoria && (m.categoria || 'Sem categoria') !== filtros.categoria) return false;
        if (filtros.material && m.id !== filtros.material) return false;
        if (termos.length && !bate(m.description, m.categoria, locaisDoMaterial(m.id))) return false;
        return true;
    });
    // KPIs de manutencao: materiais que tem manutencao naquela situacao
    const manAbertasTodas = manutencoes.filter(x => x.status === 'pendente' || x.status === 'em_andamento');
    const manNaSituacao = (item, situacao, ehHistorico) => {
        if (situacao === 'concluidas') return ehHistorico && dentro(toDate(item.completedAt), intervalo);
        if (ehHistorico) return false;
        const aberto = item.status === 'pendente' || item.status === 'em_andamento';
        const d = toDate(item.dueDate);
        if (situacao === 'abertas') return aberto;
        if (situacao === 'pausadas') return item.status === 'pausada';
        if (situacao === 'atrasadas') return aberto && Boolean(d) && d < agora;
        if (situacao === 'proximas') return aberto && Boolean(d) && d >= agora && diasEntre(agora, d) <= 30;
        return true;
    };
    const idsSituacaoMan = filtros.situacaoMan
        ? new Set([...manutencoes.filter(x => manNaSituacao(x, filtros.situacaoMan, false)), ...historico.filter(h => manNaSituacao(h, filtros.situacaoMan, true))].map(x => x.materialId))
        : null;
    const bateKpiMaterial = (m) => {
        if (filtros.zerado && !((Number(m.estoque_atual) || 0) === 0 && getTotalUnidades(m) > 0)) return false;
        if (filtros.comLocal || filtros.semLocal) {
            const alocs = alocacoesPorMaterial?.get(m.id) || [];
            if (filtros.comLocal && alocs.reduce((t, a) => t + (Number(a.quantidade) || 0), 0) <= 0) return false;
            if (filtros.semLocal && resumirLocalizacao(m, alocs).semLocal <= 0) return false;
        }
        if (idsSituacaoMan && !idsSituacaoMan.has(m.id)) return false;
        return true;
    };
    const materiaisFiltrados = materiaisBase.filter(m => bateStatus(m) && bateComposicao(m) && bateLocal(m) && bateKpiMaterial(m));
    const idsMateriaisFiltrados = new Set(materiaisFiltrados.map(m => m.id));
    // Quando um filtro de material esta ativo (status, composicao, local, KPI), todo o painel passa a olhar so esses materiais
    const restringePorMaterial = Boolean(filtros.statusMaterial || filtros.composicao || filtros.local || filtros.tipoLocal || filtros.zerado || filtros.comLocal || filtros.semLocal || filtros.situacaoMan);

    const passaFiltrosSemPeriodo = (m) => {
        if (restringePorMaterial && !idsMateriaisFiltrados.has(m.material)) return false;
        if (filtros.tipos.length && !filtros.tipos.includes(m.type)) return false;
        if (filtros.categoria && (m.categoria || 'Sem categoria') !== filtros.categoria) return false;
        if (filtros.militar && m.user !== filtros.militar) return false;
        if (filtros.viatura && m.viatura !== filtros.viatura) return false;
        if (filtros.material && m.material !== filtros.material) return false;
        if (filtros.obm) {
            const u = m.user ? usersById.get(m.user) : null;
            if ((u?.OBM || '') !== filtros.obm) return false;
        }
        if (termos.length) {
            const u = m.user ? usersById.get(m.user) : null;
            const ok = bate(
                m.material_description, m.categoria, m.observacoes,
                nomeMilitar(m, usersById), m.user_name, m.user_rg, textoUsuario(u),
                nomeViatura(m, viaturasById), m.viatura_description,
                m.sender_name, labelTipo(m.type), STATUS_MOV[m.status] || m.status,
                m.repairLocation, m.seiNumber, m.motivoReparo,
                locaisDoMaterial(m.material),
            );
            if (!ok) return false;
        }
        return true;
    };

    // Filtros vindos de cliques em graficos de tempo/etapa. Cada grafico e calculado
    // ignorando o proprio filtro (para continuar mostrando todas as opcoes) e aplicando os demais.
    const faixaSel = FAIXAS_DEVOLUCAO.find(f => f[0] === filtros.faixaDevolucao);
    const extras = {
        calor: (m) => {
            if (filtros.diaSemana === '' && filtros.hora === '') return true;
            const d = toDate(m.date); if (!d) return false;
            if (filtros.diaSemana !== '' && d.getDay() !== Number(filtros.diaSemana)) return false;
            if (filtros.hora !== '' && d.getHours() !== Number(filtros.hora)) return false;
            return true;
        },
        data: (m) => {
            if (!filtros.dataSel) return true;
            const [gran, chave] = filtros.dataSel.split(':');
            const d = toDate(m.date); return Boolean(d) && chaveNaGranularidade(d, gran) === chave;
        },
        etapa: (m) => {
            if (!filtros.etapa) return true;
            if (m.type !== 'cautela') return false;
            if (filtros.etapa === 'assinadas') return Boolean(m.signed);
            if (filtros.etapa === 'devolvidas') return m.status === 'devolvido';
            return true;
        },
        situacao: (m) => {
            switch (filtros.situacao) {
                case 'abertas': return m.type === 'cautela' && m.status === 'cautelado';
                case 'semAssinatura': return m.type === 'cautela' && m.status === 'cautelado' && !m.signed;
                case 'emReparo': return m.type === 'reparo' && m.status === 'emReparo';
                case 'comViatura': return Boolean(m.viatura);
                case 'atrasadas': { if (m.type !== 'cautela' || m.status !== 'cautelado') return false; const d = toDate(m.date); return Boolean(d) && diasEntre(d, agora) > 30; }
                default: return true;
            }
        },
        faixa: (m) => {
            if (!faixaSel) return true;
            if (m.type !== 'cautela' || !m.returned_date) return false;
            const n = diasEntre(toDate(m.date), toDate(m.returned_date));
            return Number.isFinite(n) && n >= faixaSel[1] && n <= faixaSel[2];
        },
    };
    const passaExtras = (m, exceto) => Object.keys(extras).every(k => k === exceto || extras[k](m));

    const movsBase = movimentacoes.filter(m => passaFiltrosSemPeriodo(m) && passaExtras(m));
    const movsSem = (exceto) => movimentacoes.filter(m => passaFiltrosSemPeriodo(m) && passaExtras(m, exceto) && dentro(toDate(m.date), intervalo));
    const movs = movsBase.filter(m => dentro(toDate(m.date), intervalo));
    const movsAnt = anterior ? movsBase.filter(m => dentro(toDate(m.date), anterior)) : [];

    // KPIs de fluxo (periodo) --------------------------------------------
    const cautelasPeriodo = movs.filter(m => m.type === 'cautela');
    const cautelasAnt = movsAnt.filter(m => m.type === 'cautela');
    const devolucoesPeriodo = movsBase.filter(m => (m.status === 'devolvido' || m.status === 'devolvidaDeReparo') && dentro(toDate(m.returned_date), intervalo));
    const devolucoesAnt = anterior ? movsBase.filter(m => (m.status === 'devolvido' || m.status === 'devolvidaDeReparo') && dentro(toDate(m.returned_date), anterior)) : [];

    // KPIs de situacao (agora, respeitando filtros de entidade) ----------
    const abertas = movsBase.filter(m => m.type === 'cautela' && m.status === 'cautelado');
    const pendentesAssinatura = abertas.filter(m => !m.signed);
    const emReparo = movsBase.filter(m => m.type === 'reparo' && m.status === 'emReparo');
    const unidadesEmReparo = emReparo.reduce((s, m) => s + (Number(m.quantity) || 0), 0);

    // Serie temporal ------------------------------------------------------
    const serie = serieTemporal(filtros.dataSel ? movsSem('data') : movs, intervalo);

    // Composicoes --------------------------------------------------------
    const porTipo = contar(movs, m => m.type, k => labelTipo(k));
    const porCategoria = contar(movs, m => m.categoria || 'Sem categoria');
    const topMateriais = somar(cautelasPeriodo, m => m.material, m => Number(m.quantity) || 1, (k, m) => m.material_description || 'Material').slice(0, 10);
    const topMilitares = contar(cautelasPeriodo, m => m.user || m.user_name, (k, m) => nomeMilitar(m, usersById)).slice(0, 10);
    const topViaturas = somar(movs.filter(m => m.viatura), m => m.viatura, m => Number(m.quantity) || 1, (k, m) => nomeViatura(m, viaturasById)).slice(0, 10);

    // Mapa de calor dia da semana x hora --------------------------------
    const calor = Array.from({ length: 7 }, () => Array(24).fill(0));
    let calorMax = 0;
    for (const m of (filtros.diaSemana !== '' || filtros.hora !== '') ? movsSem('calor') : movs) {
        const d = toDate(m.date);
        if (!d) continue;
        calor[d.getDay()][d.getHours()] += 1;
        calorMax = Math.max(calorMax, calor[d.getDay()][d.getHours()]);
    }

    // Cautelas: tempo de devolucao ----------------------------------------
    const baseDuracoes = faixaSel ? movimentacoes.filter(m => passaFiltrosSemPeriodo(m) && passaExtras(m, 'faixa')) : movsBase;
    const duracoes = baseDuracoes
        .filter(m => m.type === 'cautela' && m.returned_date && dentro(toDate(m.returned_date), intervalo))
        .map(m => diasEntre(toDate(m.date), toDate(m.returned_date)))
        .filter(n => Number.isFinite(n));
    const tempoMedio = duracoes.length ? duracoes.reduce((a, b) => a + b, 0) / duracoes.length : 0;
    const histDuracao = FAIXAS_DEVOLUCAO.map(([nome, a, b]) => ({ nome, valor: duracoes.filter(n => n >= a && n <= b).length }));

    const abertasDetalhe = abertas.map(m => {
        const d = toDate(m.date);
        return { id: m.id, material: m.material_description || '—', militar: nomeMilitar(m, usersById), militarId: m.user, quantidade: m.quantity || 0, data: d, dias: d ? diasEntre(d, agora) : 0, assinada: Boolean(m.signed) };
    }).sort((a, b) => b.dias - a.dias);
    const abertasPorMilitar = contar(abertas, m => m.user || m.user_name, (k, m) => nomeMilitar(m, usersById));
    const cautelasFunil = (filtros.etapa ? movsSem('etapa') : movs).filter(m => m.type === 'cautela');
    const funil = [
        { chave: 'todas', nome: 'Cautelas', valor: cautelasFunil.length },
        { chave: 'assinadas', nome: 'Assinadas', valor: cautelasFunil.filter(m => m.signed).length },
        { chave: 'devolvidas', nome: 'Devolvidas', valor: cautelasFunil.filter(m => m.status === 'devolvido').length },
    ];

    // Materiais ------------------------------------------------------------
    const movsMateriais = movs;
    const listaMateriais = materiaisFiltrados.map(m => {
        const r = resumirLocalizacao(m, alocacoesPorMaterial?.get(m.id) || []);
        return {
            id: m.id, description: m.description || '', categoria: m.categoria || '—', status: m.maintenance_status || 'operante',
            total: getTotalUnidades(m), disponivel: Number(m.estoque_atual) || 0, viatura: Number(m.estoque_viatura) || 0, inoperante: getQtdInoperante(m),
            locais: (alocacoesPorMaterial?.get(m.id) || []).map(a => `${a.local_nome} ×${a.quantidade}`).join(' · ') || '—', semLocal: r.semLocal,
            movimentacoes: movsMateriais.filter(x => x.material === m.id).length,
        };
    }).sort((a, b) => b.movimentacoes - a.movimentacoes || a.description.localeCompare(b.description, 'pt-BR'));
    const estoque = materiaisBase.filter(bateStatus).reduce((acc, m) => {
        const total = getTotalUnidades(m);
        const inop = getQtdInoperante(m);
        const viatura = Number(m.estoque_viatura) || 0;
        const atual = Number(m.estoque_atual) || 0;
        acc.total += total; acc.viatura += viatura; acc.disponivel += atual; acc.inoperante += inop;
        return acc;
    }, { total: 0, viatura: 0, disponivel: 0, inoperante: 0 });
    const statusMateriais = contar(materiaisBase.filter(bateComposicao), m => m.maintenance_status || 'operante', k => ({ operante: 'Operante', parcialmente_inoperante: 'Parcial', em_manutencao: 'Em manutenção', inoperante: 'Inoperante' }[k] || k));
    const estoquePorCategoria = (() => {
        const mapa = new Map();
        for (const m of materiaisFiltrados) {
            const k = m.categoria || 'Sem categoria';
            if (!mapa.has(k)) mapa.set(k, { nome: k, disponivel: 0, viatura: 0, inoperante: 0 });
            const l = mapa.get(k);
            l.disponivel += Math.max(0, (Number(m.estoque_atual) || 0) - 0);
            l.viatura += Number(m.estoque_viatura) || 0;
            l.inoperante += getQtdInoperante(m);
        }
        return [...mapa.values()].sort((a, b) => (b.disponivel + b.viatura + b.inoperante) - (a.disponivel + a.viatura + a.inoperante)).slice(0, 12);
    })();
    const estoqueZerado = materiaisFiltrados.filter(m => (Number(m.estoque_atual) || 0) === 0 && getTotalUnidades(m) > 0);
    const semLocal = materiaisFiltrados
        .map(m => ({ m, r: resumirLocalizacao(m, alocacoesPorMaterial?.get(m.id) || []) }))
        .filter(x => x.r.semLocal > 0)
        .sort((a, b) => b.r.semLocal - a.r.semLocal);
    const materiaisMaisMovimentados = contar(movsMateriais, m => m.material, (k, m) => m.material_description || 'Material').slice(0, 10);
    const semConferencia = materiaisFiltrados.filter(m => {
        const d = toDate(m.ultima_conferencia) || toDate(m.ultima_movimentacao);
        return !d || diasEntre(d, agora) > 180;
    });

    // Viaturas ------------------------------------------------------------
    const viaturasResumo = viaturas.filter(v => {
        if (filtros.viatura && v.id !== filtros.viatura) return false;
        if (termos.length && !bate(v.prefixo, v.description) && !movs.some(m => m.viatura === v.id)) return false;
        return true;
    }).map(v => {
        const itens = viaturaMateriais.filter(x => x.viatura_id === v.id);
        const unidades = itens.reduce((s, x) => s + (Number(x.quantidade) || 0), 0);
        const conf = toDate(v.ultima_conferencia);
        return { id: v.id, nome: v.prefixo ? `${v.prefixo} - ${v.description || ''}`.trim() : (v.description || v.id), itens: itens.length, unidades, ultimaConferencia: conf, diasConferencia: conf ? diasEntre(conf, agora) : null, movimentacoes: movs.filter(m => m.viatura === v.id).length };
    }).sort((a, b) => b.unidades - a.unidades);

    // Manutencao ----------------------------------------------------------
    // Manutencoes seguem os filtros de material (material, categoria, status, local, busca) e os cliques de mes/tipo
    const idsMateriaisBase = new Set(materiaisFiltrados.map(m => m.id));
    // (a situacao clicada nos KPIs de manutencao nao restringe as proprias manutencoes pelos materiais, para os numeros baterem)
    const filtraMaterialMan = Boolean(filtros.material || filtros.categoria || filtros.statusMaterial || filtros.composicao || filtros.local || filtros.tipoLocal || filtros.zerado || filtros.comLocal || filtros.semLocal || termos.length);
    const bateMan = (item, { ignorarTipo = false, ignorarMes = false, campoData } = {}) => {
        if (filtraMaterialMan && !idsMateriaisBase.has(item.materialId)) return false;
        if (filtros.situacaoMan && !manNaSituacao(item, filtros.situacaoMan, campoData === 'completedAt')) return false;
        if (!ignorarTipo && filtros.tipoManutencao && (item.type || 'outro') !== filtros.tipoManutencao) return false;
        if (!ignorarMes && filtros.mesManutencao) { const d = toDate(item[campoData]); if (!d || chaveMes(d) !== filtros.mesManutencao) return false; }
        return true;
    };
    const manutencoesF = manutencoes.filter(m => bateMan(m, { campoData: 'createdAt' }));
    const historicoF = historico.filter(h => bateMan(h, { campoData: 'completedAt' }));
    const manAbertas = manutencoesF.filter(m => m.status === 'pendente' || m.status === 'em_andamento');
    const manAtrasadas = manAbertas.filter(m => { const d = toDate(m.dueDate); return d && d < agora; });
    const manProximas = manAbertas.filter(m => { const d = toDate(m.dueDate); return d && d >= agora && diasEntre(agora, d) <= 30; }).sort((a, b) => toDate(a.dueDate) - toDate(b.dueDate));
    const manPausadas = manutencoesF.filter(m => m.status === 'pausada');
    const concluidasPeriodo = historicoF.filter(h => dentro(toDate(h.completedAt), intervalo));
    const manPorTipo = contar(manAbertasTodas.filter(m => bateMan(m, { ignorarTipo: true, campoData: 'createdAt' })), m => m.type || 'outro');
    const manPorMes = (() => {
        const mapa = new Map();
        const add = (d, campo) => { if (!d) return; const k = chaveMes(d); if (!mapa.has(k)) mapa.set(k, { chave: k, rotulo: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), concluidas: 0, agendadas: 0 }); mapa.get(k)[campo] += 1; };
        historico.filter(h => bateMan(h, { ignorarMes: true, campoData: 'completedAt' })).forEach(h => add(toDate(h.completedAt), 'concluidas'));
        manutencoes.filter(m => bateMan(m, { ignorarMes: true, campoData: 'createdAt' })).forEach(m => add(toDate(m.createdAt), 'agendadas'));
        return [...mapa.values()].sort((a, b) => a.chave.localeCompare(b.chave)).slice(-12);
    })();
    const materiaisComMaisManutencao = contar(historicoF, h => h.materialId, (k, h) => h.materialDescription || 'Material').slice(0, 8);

    // Militares -----------------------------------------------------------
    const militares = (() => {
        const mapa = new Map();
        for (const m of movsBase) {
            if (m.type !== 'cautela' || !m.user) continue;
            const u = usersById.get(m.user);
            if (!mapa.has(m.user)) mapa.set(m.user, { id: m.user, nome: u?.full_name || m.user_name || 'Militar', rg: u?.rg || u?.username || m.user_rg || '—', obm: u?.OBM || '—', foto: u?.foto_url || null, total: 0, periodo: 0, abertas: 0, atrasadas: 0, devolvidas: 0, somaDias: 0, nDias: 0, ultima: null });
            const r = mapa.get(m.user);
            r.total += 1; // historico completo (fora do periodo)
            const d = toDate(m.date);
            if (d && (!r.ultima || d > r.ultima)) r.ultima = d;
            if (!dentro(d, intervalo)) continue; // demais indicadores respeitam o periodo do filtro
            r.periodo += 1;
            if (m.status === 'cautelado') { r.abertas += 1; if (d && diasEntre(d, agora) > 30) r.atrasadas += 1; }
            if (m.status === 'devolvido') { r.devolvidas += 1; const rd = toDate(m.returned_date); if (d && rd) { r.somaDias += diasEntre(d, rd); r.nDias += 1; } }
        }
        // So entram no ranking militares com cautela dentro do periodo (ou que batem com a busca)
        for (const [id, r] of mapa) if (r.periodo === 0 && !(termos.length && bate(textoUsuario(usersById.get(id) || {}), r.nome, r.rg))) mapa.delete(id);
        if (termos.length) {
            for (const u of usersById.values()) {
                if (mapa.has(u.id) || !bate(textoUsuario(u))) continue;
                mapa.set(u.id, { id: u.id, nome: u.full_name || u.username || 'Militar', rg: u.rg || u.username || '—', obm: u.OBM || '—', foto: u.foto_url || null, total: 0, periodo: 0, abertas: 0, atrasadas: 0, devolvidas: 0, somaDias: 0, nDias: 0, ultima: null });
            }
        }
        return [...mapa.values()].map(r => ({ ...r, tempoMedio: r.nDias ? r.somaDias / r.nDias : null })).sort((a, b) => b.periodo - a.periodo || b.total - a.total);
    })();
    const porOBM = contar(cautelasPeriodo, m => (usersById.get(m.user)?.OBM || 'Sem OBM'));

    // Locais --------------------------------------------------------------
    const unidadesPorLocal = (() => {
        const mapa = new Map();
        const idsMateriais = new Set(materiaisFiltrados.map(m => m.id));
        for (const l of locais) mapa.set(l.id, { id: l.id, nome: l.nome, tipo: l.tipo, tipoLabel: l.tipo_label, inoperantes: Boolean(l.inoperantes), unidades: 0, materiais: 0, bateNome: !termos.length || bate(l.nome, l.tipo_label, l.observacao) });
        for (const [materialId, lista] of alocacoesPorMaterial || []) {
            if (termos.length && !idsMateriais.has(materialId)) continue;
            for (const a of lista) {
                const l = mapa.get(a.local_id);
                if (!l) continue;
                l.unidades += Number(a.quantidade) || 0;
                l.materiais += 1;
            }
        }
        return [...mapa.values()].filter(l => !termos.length || l.bateNome || l.unidades > 0);
    })();
    const unidadesPorTipoLocal = somar(unidadesPorLocal, l => l.tipoLabel || l.tipo, l => l.unidades);
    const totalSemLocal = semLocal.reduce((s, x) => s + x.r.semLocal, 0);

    // Recentes ------------------------------------------------------------
    const recentes = [...movs].sort((a, b) => (toDate(b.date) || 0) - (toDate(a.date) || 0)).slice(0, 12).map(m => ({
        id: m.id, materialId: m.material, militarId: m.user, tipo: m.type, tipoLabel: labelTipo(m.type), material: m.material_description || '—', militar: nomeMilitar(m, usersById), viatura: m.viatura ? nomeViatura(m, viaturasById) : null, quantidade: m.quantity || 0, data: toDate(m.date), status: STATUS_MOV[m.status] || m.status || '—', quem: m.sender_name || '—',
    }));

    return {
        intervalo,
        movs,
        kpis: {
            movimentacoes: { valor: movs.length, anterior: anterior ? movsAnt.length : null },
            cautelas: { valor: cautelasPeriodo.length, anterior: anterior ? cautelasAnt.length : null },
            devolucoes: { valor: devolucoesPeriodo.length, anterior: anterior ? devolucoesAnt.length : null },
            abertas: abertas.length,
            pendentesAssinatura: pendentesAssinatura.length,
            emReparo: emReparo.length,
            unidadesEmReparo,
            materiais: materiaisFiltrados.length,
            estoque,
            manAtrasadas: manAtrasadas.length,
            manProximas: manProximas.length,
            totalSemLocal,
            tempoMedio,
        },
        serie, porTipo, porCategoria, topMateriais, topMilitares, topViaturas, calor, calorMax,
        histDuracao, abertasDetalhe, abertasPorMilitar, funil,
        statusMateriais, estoquePorCategoria, estoqueZerado, semLocal, materiaisMaisMovimentados, semConferencia, listaMateriais,
        viaturasResumo,
        manAbertas, manAtrasadas, manProximas, manPausadas, concluidasPeriodo, manPorTipo, manPorMes, materiaisComMaisManutencao,
        militares, porOBM,
        unidadesPorLocal, unidadesPorTipoLocal,
        recentes,
    };
}

/** CSV das movimentacoes filtradas (separador ; para o Excel em pt-BR). */
export const csvMovimentacoes = (movs, usersById, viaturasById) => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const linhas = [['Data', 'Tipo', 'Material', 'Quantidade', 'Militar', 'Viatura', 'Situação', 'Registrado por', 'Devolvido em', 'Observações']];
    for (const m of movs) {
        linhas.push([fmtDataHora(toDate(m.date)), labelTipo(m.type), m.material_description || '', m.quantity ?? '', nomeMilitar(m, usersById), m.viatura ? nomeViatura(m, viaturasById) : '', STATUS_MOV[m.status] || m.status || '', m.sender_name || '', fmtDataHora(toDate(m.returned_date)), m.observacoes || '']);
    }
    return '﻿' + linhas.map(l => l.map(esc).join(';')).join('\r\n');
};
