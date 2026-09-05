import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import db, { auth } from '../firebase/db';
import { ordenarLocais, extrairTipos } from '../services/localizacaoService';

/**
 * Assina uma query so depois que o Firebase Auth resolver o usuario
 * (mesmo padrao do MaterialContext), evitando "permission denied" no primeiro render.
 */
function subscribeQuando(buildQuery, onData, onDone) {
    let unsubFirestore = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
        if (unsubFirestore) {
            unsubFirestore();
            unsubFirestore = null;
        }
        if (!user) {
            onData([]);
            onDone?.();
            return;
        }
        unsubFirestore = onSnapshot(
            buildQuery(),
            (snap) => {
                onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                onDone?.();
            },
            (err) => {
                console.error('Erro no listener de locais:', err);
                onData([]);
                onDone?.();
            }
        );
    });
    return () => {
        unsubAuth();
        if (unsubFirestore) unsubFirestore();
    };
}

/** Lista de locais de armazenamento em tempo real, ja ordenada por tipo/numero. */
export function useLocaisArmazenamento() {
    const [locaisRaw, setLocaisRaw] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => subscribeQuando(
        () => collection(db, 'locais_armazenamento'),
        setLocaisRaw,
        () => setLoading(false),
    ), []);

    return useMemo(() => {
        const locais = [...locaisRaw].sort(ordenarLocais);
        const locaisById = new Map(locais.map(l => [l.id, l]));
        const tipos = extrairTipos(locais);
        const localInoperantes = locais.find(l => l.inoperantes) || null;
        return { locais, locaisById, tipos, localInoperantes, loading };
    }, [locaisRaw, loading]);
}

/** Todas as alocacoes material -> local em tempo real, indexadas por material e por local. */
export function useAlocacoesLocais() {
    const [alocacoes, setAlocacoes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => subscribeQuando(
        () => collection(db, 'material_locais'),
        setAlocacoes,
        () => setLoading(false),
    ), []);

    return useMemo(() => {
        const porMaterial = new Map();
        const porLocal = new Map();
        for (const a of alocacoes) {
            if ((Number(a.quantidade) || 0) <= 0) continue;
            if (!porMaterial.has(a.material_id)) porMaterial.set(a.material_id, []);
            porMaterial.get(a.material_id).push(a);
            if (!porLocal.has(a.local_id)) porLocal.set(a.local_id, []);
            porLocal.get(a.local_id).push(a);
        }
        return { alocacoes, porMaterial, porLocal, loading };
    }, [alocacoes, loading]);
}

/** Alocacoes de um unico material (tempo real). Passa null para desligar. */
export function useAlocacoesDoMaterial(materialId) {
    const [alocacoes, setAlocacoes] = useState([]);
    const [loading, setLoading] = useState(Boolean(materialId));

    useEffect(() => {
        if (!materialId) {
            setAlocacoes([]);
            setLoading(false);
            return undefined;
        }
        setLoading(true);
        return subscribeQuando(
            () => query(collection(db, 'material_locais'), where('material_id', '==', materialId)),
            setAlocacoes,
            () => setLoading(false),
        );
    }, [materialId]);

    return { alocacoes: alocacoes.filter(a => (Number(a.quantidade) || 0) > 0), loading };
}
