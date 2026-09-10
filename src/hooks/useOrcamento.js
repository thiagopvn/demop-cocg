import { useEffect, useMemo, useRef, useState } from 'react';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, orcamentoCaixaCollection, orcamentoNotasCollection, orcamentoSetoresCollection } from '../firebase/db';
import { MILITARES_GOCG } from '../data/militaresGocg';
import { semearSetores, somenteDigitos } from '../services/orcamentoService';

/**
 * Assina a query só depois que o Firebase Auth resolver o usuário
 * (mesmo padrão de useLocais), evitando "permission denied" no primeiro render.
 */
function assinarQuando(buildQuery, onData, onDone, rotulo) {
    let unsubFirestore = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
        if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }
        if (!user) { onData([]); onDone?.(); return; }
        unsubFirestore = onSnapshot(
            buildQuery(),
            (snap) => { onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); onDone?.(); },
            (err) => { console.error(`Erro no listener de ${rotulo}:`, err); onData([]); onDone?.(); },
        );
    });
    return () => { unsubAuth(); if (unsubFirestore) unsubFirestore(); };
}

/** Notas fiscais em tempo real, da mais recente para a mais antiga. */
export function useNotasFiscais() {
    const [notas, setNotas] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => assinarQuando(
        () => query(orcamentoNotasCollection, orderBy('data', 'desc')),
        setNotas,
        () => setLoading(false),
        'orcamento_notas',
    ), []);
    return { notas, loading };
}

/** Movimentos do caixa (saques, devoluções, ajustes) em tempo real. */
export function useMovimentosCaixa() {
    const [movimentos, setMovimentos] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => assinarQuando(
        () => query(orcamentoCaixaCollection, orderBy('data', 'desc')),
        setMovimentos,
        () => setLoading(false),
        'orcamento_caixa',
    ), []);
    return { movimentos, loading };
}

/** Setores de destino (lista editável). Cria os padrão na primeira vez que a lista vem vazia. */
export function useSetoresOrcamento() {
    const [setores, setSetores] = useState([]);
    const [loading, setLoading] = useState(true);
    const semeado = useRef(false);
    useEffect(() => assinarQuando(
        () => query(orcamentoSetoresCollection, orderBy('ordem', 'asc')),
        setSetores,
        () => setLoading(false),
        'orcamento_setores',
    ), []);
    useEffect(() => {
        if (loading || setores.length > 0 || semeado.current) return;
        semeado.current = true;
        semearSetores().catch((e) => console.error('Erro ao criar setores padrão:', e));
    }, [loading, setores.length]);
    const nomes = useMemo(() => setores.map((s) => s.nome), [setores]);
    return { setores, nomes, loading };
}

/**
 * Sugestões de militar para o autopreenchimento: a lista do PDF da DGP (N. Guerra + RG)
 * mais os nomes já lançados em notas/caixa (para quem não está no relatório).
 * Cada item: { nomeGuerra, rg, rotulo, origem: 'dgp' | 'lancamento' }.
 */
export function useSugestoesMilitares(notas = [], movimentos = []) {
    return useMemo(() => {
        const mapa = new Map();
        const chaveDe = (nome, rg) => `${nome}|${rg}`;
        MILITARES_GOCG.forEach((m) => mapa.set(chaveDe(m.nomeGuerra, m.rg), { nomeGuerra: m.nomeGuerra, rg: m.rg, origem: 'dgp' }));
        const lancados = new Map();
        [...notas, ...movimentos].forEach((x) => {
            const nome = String(x.militarNome || '').trim().toUpperCase();
            if (!nome) return;
            const rg = somenteDigitos(x.militarRg);
            const chave = chaveDe(nome, rg);
            if (mapa.has(chave)) return;
            lancados.set(chave, (lancados.get(chave) || 0) + 1);
            if (!mapa.has(chave)) mapa.set(chave, { nomeGuerra: nome, rg, origem: 'lancamento' });
        });
        const lista = [...mapa.values()].map((m) => ({ ...m, rotulo: m.rg ? `${m.nomeGuerra} — RG ${m.rg}` : m.nomeGuerra }));
        lista.sort((a, b) => a.nomeGuerra.localeCompare(b.nomeGuerra, 'pt-BR') || a.rg.localeCompare(b.rg));
        return lista;
    }, [notas, movimentos]);
}

/** Valores distintos já usados em um campo (empresa, objeto...) para sugerir enquanto digita. */
export function useValoresDistintos(itens, campo) {
    return useMemo(() => {
        const contagem = new Map();
        itens.forEach((it) => {
            const v = String(it?.[campo] || '').trim();
            if (v) contagem.set(v, (contagem.get(v) || 0) + 1);
        });
        return [...contagem.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR')).map(([v]) => v);
    }, [itens, campo]);
}

/** Fornecedores já lançados: { cnpj, cnpjFormatado, empresa, qtd } (empresa = último nome informado). */
export function useFornecedores(notas) {
    return useMemo(() => {
        const mapa = new Map();
        // notas vêm da mais recente para a mais antiga: o primeiro nome encontrado é o mais atual
        notas.forEach((n) => {
            if (!n.cnpj) return;
            const atual = mapa.get(n.cnpj);
            if (atual) { atual.qtd += 1; if (!atual.empresa && n.empresa) atual.empresa = n.empresa; return; }
            mapa.set(n.cnpj, { cnpj: n.cnpj, cnpjFormatado: n.cnpjFormatado, empresa: n.empresa || '', qtd: 1 });
        });
        return [...mapa.values()].sort((a, b) => b.qtd - a.qtd);
    }, [notas]);
}
