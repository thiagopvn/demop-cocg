import { createContext, useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import db, { auth } from '../firebase/db';

export const CategoriaContext = createContext();

/**
 * Categorias em tempo real (onSnapshot): qualquer criação/renomeação feita em
 * /categoria ou dentro do cadastro de material aparece na hora em todas as telas.
 * `updateCategorias` é mantido por compatibilidade (o listener já atualiza sozinho).
 */
export const CategoriaProvider = ({ children }) => {
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubFirestore = null;
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }
            if (!user) { setCategorias([]); setLoading(false); return; }
            setLoading(true);
            unsubFirestore = onSnapshot(
                query(collection(db, 'categorias'), orderBy('description_lower')),
                (snap) => { setCategorias(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
                () => { setCategorias([]); setLoading(false); },
            );
        });
        return () => { unsubAuth(); if (unsubFirestore) unsubFirestore(); };
    }, []);

    const updateCategorias = useCallback(async () => {}, []);

    const value = useMemo(() => ({
        categorias,
        categoriasById: new Map(categorias.map((c) => [c.id, c])),
        loading,
        updateCategorias,
    }), [categorias, loading, updateCategorias]);

    return (
        <CategoriaContext.Provider value={value}>
            {children}
        </CategoriaContext.Provider>
    );
};

export const useCategorias = () => {
    const ctx = useContext(CategoriaContext);
    if (!ctx) throw new Error('useCategorias must be used within a CategoriaProvider');
    return ctx;
};
