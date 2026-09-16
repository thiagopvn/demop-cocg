import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import db, { auth, operacoesCollection } from '../firebase/db';
import { ordenarOperacoes, semearOperacoes } from '../services/operacoesService';

/** Assina a query só depois que o Firebase Auth resolver o usuário (mesmo padrão de useLocais). */
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

/**
 * Operações do CBMERJ em tempo real, já ordenadas por categoria/ordem.
 * Quando `semearSe` é verdadeiro (admingeral) e a coleção vem vazia, cria as
 * operações padrão do levantamento uma única vez.
 */
export function useOperacoes({ semearSe = false, user = null } = {}) {
    const [operacoesRaw, setOperacoesRaw] = useState([]);
    const [loading, setLoading] = useState(true);
    const semeado = useRef(false);

    useEffect(() => assinarQuando(
        () => operacoesCollection,
        setOperacoesRaw,
        () => setLoading(false),
        'operacoes',
    ), []);

    useEffect(() => {
        if (!semearSe || loading || operacoesRaw.length > 0 || semeado.current) return;
        semeado.current = true;
        semearOperacoes(user, { existentes: [] }).catch((e) => console.error('Erro ao criar operações padrão:', e));
    }, [semearSe, loading, operacoesRaw.length, user]);

    return useMemo(() => {
        const operacoes = [...operacoesRaw].sort(ordenarOperacoes);
        const porId = new Map(operacoes.map((o) => [o.id, o]));
        return { operacoes, porId, loading };
    }, [operacoesRaw, loading]);
}

/**
 * Unidades embarcadas em viatura (viatura_materiais com status 'alocado'),
 * indexadas por material: Map<material_id, [{ viatura_id, viatura_prefixo, quantidade }]>.
 */
export function useMateriaisEmViatura() {
    const [linhas, setLinhas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => assinarQuando(
        () => query(collection(db, 'viatura_materiais'), where('status', '==', 'alocado')),
        setLinhas,
        () => setLoading(false),
        'viatura_materiais',
    ), []);

    return useMemo(() => {
        const porMaterial = new Map();
        for (const l of linhas) {
            const qtd = Number(l.quantidade) || 0;
            if (qtd <= 0 || !l.material_id) continue;
            if (!porMaterial.has(l.material_id)) porMaterial.set(l.material_id, []);
            porMaterial.get(l.material_id).push({
                id: l.id,
                viatura_id: l.viatura_id,
                viatura_prefixo: l.viatura_prefixo || '',
                viatura_description: l.viatura_description || '',
                quantidade: qtd,
            });
        }
        for (const lista of porMaterial.values()) lista.sort((a, b) => (a.viatura_prefixo || '').localeCompare(b.viatura_prefixo || '', 'pt-BR'));
        return { porMaterial, loading };
    }, [linhas, loading]);
}
