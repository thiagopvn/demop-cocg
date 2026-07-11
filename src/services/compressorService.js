// ============================================================================
// Serviço de Controle de Manutenção de Compressores (ex.: Compressor Fixo)
// ----------------------------------------------------------------------------
// Regras de negócio:
//  - A manutenção preventiva é devida a cada 50 HORAS de uso OU a cada 2 MESES,
//    o que ocorrer primeiro.
//  - Ao atingir 40 horas de uso desde a última manutenção, dispara ALERTA
//    VERMELHO (aproximando do limite de 50h).
//  - O tempo de uso é medido por um cronômetro: iniciar (ligar), pausar
//    (desligar temporariamente) e concluir (finaliza a sessão -> vai para o
//    histórico de uso e soma no total desde a última manutenção).
//  - O estado do cronômetro fica no Firestore, então qualquer dispositivo
//    (dashboard no celular, tela de cronograma no desktop) enxerga o mesmo
//    cronômetro em tempo real.
// ============================================================================

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    addDoc,
    getDocs,
    query,
    where,
    Timestamp,
    increment,
} from 'firebase/firestore';
import db, {
    compressoresCollection,
    compressorUsosCollection,
    compressorManutencoesCollection,
} from '../firebase/db';
import { logAudit } from '../firebase/auditLog';

// ---------------------------------------------------------------------------
// Constantes de negócio
// ---------------------------------------------------------------------------
export const COMPRESSOR_FIXO_ID = 'compressor-fixo';
export const HORAS_LIMITE_MANUTENCAO = 50;   // manutenção a cada 50h de uso
export const MESES_LIMITE_MANUTENCAO = 2;    // ...ou a cada 2 meses
export const HORAS_ALERTA_VERMELHO = 40;     // alerta vermelho ao atingir 40h
export const HORAS_ATENCAO = 35;             // atenção (amarelo) antes do alerta

// Data e carga inicial exigidas pelo pedido
const SEED_ULTIMA_MANUTENCAO = new Date(2026, 5, 10, 9, 0, 0); // 10/06/2026 09:00
const SEED_HORAS_USO = 30; // 30 horas já acumuladas, distribuídas no último mês

// ---------------------------------------------------------------------------
// Tipos de manutenção suportados (permite controle por tipo de intervenção)
// ---------------------------------------------------------------------------
export const TIPOS_MANUTENCAO = {
    preventiva: { label: 'Manutenção Preventiva (50h)', color: '#22c55e', resetaCiclo: true, icon: 'build' },
    corretiva: { label: 'Manutenção Corretiva', color: '#ef4444', resetaCiclo: true, icon: 'warning' },
    filtro: { label: 'Troca de Filtro', color: '#3b82f6', resetaCiclo: false, icon: 'filter' },
    tubulacao: { label: 'Troca de Tubulação', color: '#8b5cf6', resetaCiclo: false, icon: 'pipe' },
    oleo: { label: 'Troca de Óleo', color: '#f59e0b', resetaCiclo: false, icon: 'oil' },
    inspecao: { label: 'Inspeção / Verificação', color: '#06b6d4', resetaCiclo: false, icon: 'check' },
};

export const getTipoManutencaoLabel = (tipo) =>
    TIPOS_MANUTENCAO[tipo]?.label || tipo || 'Manutenção';

// ---------------------------------------------------------------------------
// Helpers de tempo / formatação
// ---------------------------------------------------------------------------
export const toDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds != null) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

/** Formata segundos em "HH:MM:SS" para o mostrador do cronômetro. */
export const formatClock = (totalSeconds) => {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

/** Formata segundos em texto amigável "Xh Ymin". */
export const formatDuration = (totalSeconds) => {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}min`;
    return `${s}s`;
};

/** Converte horas decimais em texto "Xh Ymin". */
export const formatHoursDecimal = (hours) => formatDuration((hours || 0) * 3600);

// ---------------------------------------------------------------------------
// Estado derivado do compressor
// ---------------------------------------------------------------------------

/**
 * Segundos totais da sessão em andamento (0 se não houver sessão ativa).
 * A "sessão" acumula intervalos de operação; ao pausar guardamos o acumulado,
 * ao rodar somamos o tempo desde o último "resume".
 */
export const getSessionSeconds = (compressor, nowMs = Date.now()) => {
    if (!compressor) return 0;
    const base = compressor.sessionAccumulatedSeconds || 0;
    if (compressor.status === 'running' && compressor.sessionLastResumeAt) {
        const resumeMs = toDate(compressor.sessionLastResumeAt)?.getTime() || nowMs;
        return base + Math.max(0, (nowMs - resumeMs) / 1000);
    }
    return base;
};

/**
 * Retorna o estado completo/derivado do compressor:
 * horas desde a manutenção, dias, próxima data prevista, nível de alerta, etc.
 * @param {object} compressor documento do compressor
 * @param {number} nowMs timestamp atual (ms) — permite atualização a cada tick
 */
export const getCompressorStatus = (compressor, nowMs = Date.now()) => {
    const accumulated = compressor?.horasAcumuladasSegundos || 0;
    const sessionSeconds = getSessionSeconds(compressor, nowMs);
    const totalSeconds = accumulated + sessionSeconds;
    const horas = totalSeconds / 3600;

    const ultimaManutencao = toDate(compressor?.ultimaManutencao) || new Date();
    const proximaPorData = new Date(ultimaManutencao);
    proximaPorData.setMonth(proximaPorData.getMonth() + MESES_LIMITE_MANUTENCAO);

    const now = new Date(nowMs);
    const msPorDia = 1000 * 60 * 60 * 24;
    const diasDesdeManutencao = Math.floor((now - ultimaManutencao) / msPorDia);
    const diasAteData = Math.ceil((proximaPorData - now) / msPorDia);

    const horasRestantes = Math.max(0, HORAS_LIMITE_MANUTENCAO - horas);
    const progressoHoras = Math.min(100, (horas / HORAS_LIMITE_MANUTENCAO) * 100);
    const progressoData = Math.min(
        100,
        Math.max(0, ((now - ultimaManutencao) / (proximaPorData - ultimaManutencao)) * 100)
    );

    const vencidaPorHoras = horas >= HORAS_LIMITE_MANUTENCAO;
    const vencidaPorData = now >= proximaPorData;
    const vencida = vencidaPorHoras || vencidaPorData;

    // Nível de severidade para UI
    let nivel = 'ok'; // verde
    if (vencida) nivel = 'vencida'; // vermelho crítico
    else if (horas >= HORAS_ALERTA_VERMELHO) nivel = 'alerta'; // vermelho (>=40h)
    else if (horas >= HORAS_ATENCAO || diasAteData <= 7) nivel = 'atencao'; // amarelo

    return {
        totalSeconds,
        sessionSeconds,
        horas,
        horasRestantes,
        progressoHoras,
        progressoData,
        ultimaManutencao,
        proximaPorData,
        diasDesdeManutencao,
        diasAteData,
        vencida,
        vencidaPorHoras,
        vencidaPorData,
        nivel,
        isRunning: compressor?.status === 'running',
        isPaused: compressor?.status === 'paused',
        temSessaoAtiva: compressor?.status === 'running' || compressor?.status === 'paused',
    };
};

export const NIVEL_CONFIG = {
    ok: { color: '#22c55e', label: 'Em dia', descricao: 'Operação dentro do intervalo seguro.' },
    atencao: { color: '#f59e0b', label: 'Atenção', descricao: 'Aproximando-se do limite de manutenção.' },
    alerta: { color: '#ef4444', label: 'Alerta — 40h atingidas', descricao: 'Programe a manutenção preventiva.' },
    vencida: { color: '#b91c1c', label: 'Manutenção Vencida', descricao: 'Limite de 50h ou 2 meses ultrapassado.' },
};

// ---------------------------------------------------------------------------
// Seed idempotente (cria o compressor fixo + histórico de 30h + manutenção)
// ---------------------------------------------------------------------------
let _seedPromise = null;

const gerarSessoesAleatorias = (inicio, fim, horasTotais) => {
    // Distribui `horasTotais` em sessões aleatórias de 0,5h a 4h entre inicio e fim.
    const sessoes = [];
    let restanteSeg = horasTotais * 3600;
    const inicioMs = inicio.getTime();
    const fimMs = Math.max(fim.getTime(), inicioMs + 24 * 3600 * 1000);

    let guarda = 0;
    while (restanteSeg > 60 && guarda < 60) {
        guarda += 1;
        const maxSeg = Math.min(restanteSeg, 4 * 3600);
        const minSeg = Math.min(restanteSeg, 30 * 60);
        const durSeg = Math.round(minSeg + Math.random() * (maxSeg - minSeg));
        const startMs = inicioMs + Math.random() * (fimMs - inicioMs - durSeg * 1000);
        const start = new Date(startMs);
        const end = new Date(startMs + durSeg * 1000);
        sessoes.push({ start, end, durSeg });
        restanteSeg -= durSeg;
    }
    // Ajusta a última sessão para fechar exatamente as horas pedidas
    if (restanteSeg > 0 && sessoes.length > 0) {
        const ultima = sessoes[sessoes.length - 1];
        ultima.durSeg += restanteSeg;
        ultima.end = new Date(ultima.start.getTime() + ultima.durSeg * 1000);
    }
    sessoes.sort((a, b) => a.start - b.start);
    return sessoes;
};

/**
 * Garante que o compressor fixo exista com a carga inicial pedida.
 * Idempotente: se o documento já existe, não recria nada.
 */
export const ensureCompressorFixoSeed = async () => {
    if (_seedPromise) return _seedPromise;
    _seedPromise = (async () => {
        const ref = doc(compressoresCollection, COMPRESSOR_FIXO_ID);
        const snap = await getDoc(ref);
        if (snap.exists()) return { id: ref.id, ...snap.data() };

        const agora = new Date();
        const fimJanela = agora > SEED_ULTIMA_MANUTENCAO ? agora : new Date(SEED_ULTIMA_MANUTENCAO.getTime() + 30 * 24 * 3600 * 1000);
        const sessoes = gerarSessoesAleatorias(SEED_ULTIMA_MANUTENCAO, fimJanela, SEED_HORAS_USO);
        const totalSeg = sessoes.reduce((acc, s) => acc + s.durSeg, 0);

        // Cria o documento do compressor
        await setDoc(ref, {
            nome: 'Compressor Fixo',
            tipo: 'fixo',
            local: 'DEMOP — Sala de Compressores',
            descricao: 'Compressor de ar fixo. Manutenção preventiva a cada 50h de uso ou 2 meses.',
            horasLimite: HORAS_LIMITE_MANUTENCAO,
            mesesLimite: MESES_LIMITE_MANUTENCAO,
            horasAlerta: HORAS_ALERTA_VERMELHO,
            horasAcumuladasSegundos: totalSeg,
            ultimaManutencao: Timestamp.fromDate(SEED_ULTIMA_MANUTENCAO),
            status: 'idle',
            sessionStartAt: null,
            sessionLastResumeAt: null,
            sessionAccumulatedSeconds: 0,
            sessionOperador: null,
            createdAt: Timestamp.now(),
            seededAt: Timestamp.now(),
        });

        // Cria as sessões de uso históricas
        await Promise.all(
            sessoes.map((s) =>
                addDoc(compressorUsosCollection, {
                    compressorId: COMPRESSOR_FIXO_ID,
                    startAt: Timestamp.fromDate(s.start),
                    endAt: Timestamp.fromDate(s.end),
                    durationSeconds: s.durSeg,
                    operador: 'Registro histórico',
                    observacao: '',
                    editado: false,
                    origem: 'seed',
                    createdAt: Timestamp.fromDate(s.end),
                })
            )
        );

        // Registra a manutenção inicial (10/06/2026)
        await addDoc(compressorManutencoesCollection, {
            compressorId: COMPRESSOR_FIXO_ID,
            tipo: 'preventiva',
            data: Timestamp.fromDate(SEED_ULTIMA_MANUTENCAO),
            horasNoMomento: 0,
            resetouCiclo: true,
            observacao: 'Manutenção preventiva inicial de referência (ciclo de 50h / 2 meses).',
            realizadoPor: 'Sistema',
            origem: 'seed',
            createdAt: Timestamp.fromDate(SEED_ULTIMA_MANUTENCAO),
        });

        const novo = await getDoc(ref);
        return { id: ref.id, ...novo.data() };
    })();
    return _seedPromise;
};

// ---------------------------------------------------------------------------
// Ações do cronômetro
// ---------------------------------------------------------------------------

/** Inicia (ou reinicia) uma sessão de uso — "ligar o compressor". */
export const startCompressor = async (compressorId, operador = '') => {
    const ref = doc(compressoresCollection, compressorId);
    const snap = await getDoc(ref);
    const data = snap.data() || {};
    const now = Timestamp.now();
    // Se já havia sessão pausada, apenas retoma; senão inicia uma nova.
    const isRetomada = data.status === 'paused';
    await updateDoc(ref, {
        status: 'running',
        sessionLastResumeAt: now,
        sessionStartAt: isRetomada ? (data.sessionStartAt || now) : now,
        sessionAccumulatedSeconds: isRetomada ? (data.sessionAccumulatedSeconds || 0) : 0,
        sessionOperador: operador || data.sessionOperador || null,
    });
    return { retomada: isRetomada };
};

/** Pausa a sessão em andamento — "desligar temporariamente". */
export const pauseCompressor = async (compressorId) => {
    const ref = doc(compressoresCollection, compressorId);
    const snap = await getDoc(ref);
    const data = snap.data() || {};
    if (data.status !== 'running') return;
    const resumeMs = toDate(data.sessionLastResumeAt)?.getTime() || Date.now();
    const decorrido = Math.max(0, (Date.now() - resumeMs) / 1000);
    await updateDoc(ref, {
        status: 'paused',
        sessionAccumulatedSeconds: (data.sessionAccumulatedSeconds || 0) + decorrido,
        sessionLastResumeAt: null,
    });
};

/**
 * Conclui a sessão atual, gravando no histórico de uso e somando ao total.
 * Permite ajustar a duração final (caso tenham esquecido de pausar/concluir).
 * @param {string} compressorId
 * @param {object} opts
 * @param {number} opts.durationSeconds duração final (segundos) — já editável
 * @param {string} opts.observacao
 * @param {string} opts.operador
 * @param {boolean} opts.editado se a duração foi ajustada manualmente
 */
export const concludeCompressorSession = async (compressorId, opts = {}) => {
    const ref = doc(compressoresCollection, compressorId);
    const snap = await getDoc(ref);
    const data = snap.data() || {};

    const sessionSeconds = getSessionSeconds({ ...data, status: data.status }, Date.now());
    const durationSeconds = Math.max(0, Math.round(opts.durationSeconds ?? sessionSeconds));

    const startAt = toDate(data.sessionStartAt) || new Date(Date.now() - durationSeconds * 1000);
    const endAt = new Date();

    // Grava a sessão no histórico
    await addDoc(compressorUsosCollection, {
        compressorId,
        startAt: Timestamp.fromDate(startAt),
        endAt: Timestamp.fromDate(endAt),
        durationSeconds,
        cronometroSeconds: Math.round(sessionSeconds),
        operador: opts.operador || data.sessionOperador || '',
        observacao: opts.observacao || '',
        editado: !!opts.editado,
        origem: 'cronometro',
        createdAt: Timestamp.now(),
    });

    // Soma ao total desde a última manutenção e zera a sessão
    await updateDoc(ref, {
        horasAcumuladasSegundos: increment(durationSeconds),
        status: 'idle',
        sessionStartAt: null,
        sessionLastResumeAt: null,
        sessionAccumulatedSeconds: 0,
        sessionOperador: null,
    });

    logAudit({
        action: 'manutencao_create',
        userId: 'compressor',
        userName: opts.operador || '',
        targetCollection: 'compressor_usos',
        targetId: compressorId,
        targetName: 'Compressor Fixo — sessão de uso',
        details: {
            duracao: formatDuration(durationSeconds),
            editado: !!opts.editado,
            observacao: opts.observacao || '',
        },
    });

    return { durationSeconds };
};

/** Descarta a sessão atual sem gravar (ex.: acionamento por engano). */
export const discardCompressorSession = async (compressorId) => {
    const ref = doc(compressoresCollection, compressorId);
    await updateDoc(ref, {
        status: 'idle',
        sessionStartAt: null,
        sessionLastResumeAt: null,
        sessionAccumulatedSeconds: 0,
        sessionOperador: null,
    });
};

/**
 * Ajusta manualmente uma sessão de uso já concluída (corrige horas/minutos
 * lançados errado). Atualiza o total desde a manutenção pela diferença.
 */
export const editUsoSession = async (usoId, compressorId, novaDuracaoSeconds, observacao) => {
    const usoRef = doc(db, 'compressor_usos', usoId);
    const usoSnap = await getDoc(usoRef);
    if (!usoSnap.exists()) return;
    const antiga = usoSnap.data().durationSeconds || 0;
    const nova = Math.max(0, Math.round(novaDuracaoSeconds));
    const diff = nova - antiga;

    await updateDoc(usoRef, {
        durationSeconds: nova,
        observacao: observacao ?? usoSnap.data().observacao ?? '',
        editado: true,
        editadoEm: Timestamp.now(),
    });
    if (diff !== 0) {
        await updateDoc(doc(compressoresCollection, compressorId), {
            horasAcumuladasSegundos: increment(diff),
        });
    }
};

/**
 * Registra uma manutenção realizada. Se o tipo reinicia o ciclo (preventiva/
 * corretiva) ou `resetarCiclo` for true, zera o contador de horas e atualiza
 * a data da última manutenção.
 */
export const registrarManutencao = async (compressorId, opts = {}) => {
    const ref = doc(compressoresCollection, compressorId);
    const snap = await getDoc(ref);
    const data = snap.data() || {};
    const status = getCompressorStatus({ id: compressorId, ...data });

    const tipo = opts.tipo || 'preventiva';
    const resetaCiclo = opts.resetarCiclo ?? TIPOS_MANUTENCAO[tipo]?.resetaCiclo ?? false;
    const dataManutencao = opts.data ? new Date(opts.data) : new Date();

    await addDoc(compressorManutencoesCollection, {
        compressorId,
        tipo,
        data: Timestamp.fromDate(dataManutencao),
        horasNoMomento: Number(status.horas.toFixed(2)),
        resetouCiclo: resetaCiclo,
        observacao: opts.observacao || '',
        realizadoPor: opts.realizadoPor || '',
        pecasTrocadas: opts.pecasTrocadas || [],
        origem: 'manual',
        createdAt: Timestamp.now(),
    });

    if (resetaCiclo) {
        await updateDoc(ref, {
            horasAcumuladasSegundos: 0,
            ultimaManutencao: Timestamp.fromDate(dataManutencao),
        });
    }

    logAudit({
        action: 'manutencao_complete',
        userId: 'compressor',
        userName: opts.realizadoPor || '',
        targetCollection: 'compressor_manutencoes',
        targetId: compressorId,
        targetName: `Compressor — ${getTipoManutencaoLabel(tipo)}`,
        details: {
            tipo: getTipoManutencaoLabel(tipo),
            horas_no_momento: status.horas.toFixed(1),
            reiniciou_ciclo: resetaCiclo ? 'sim' : 'não',
            observacao: opts.observacao || '',
        },
    });

    return { resetaCiclo };
};

// ---------------------------------------------------------------------------
// Consultas de histórico
// ---------------------------------------------------------------------------
export const fetchUsos = async (compressorId) => {
    const q = query(compressorUsosCollection, where('compressorId', '==', compressorId));
    const snap = await getDocs(q);
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (toDate(b.endAt)?.getTime() || 0) - (toDate(a.endAt)?.getTime() || 0));
};

export const fetchManutencoes = async (compressorId) => {
    const q = query(compressorManutencoesCollection, where('compressorId', '==', compressorId));
    const snap = await getDocs(q);
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (toDate(b.data)?.getTime() || 0) - (toDate(a.data)?.getTime() || 0));
};
