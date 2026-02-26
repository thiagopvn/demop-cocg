import React, { createContext, useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import db, { auth } from "../firebase/db";

export const CategoriaContext = createContext();

export const CategoriaProvider = ({ children }) => {
    const [categorias, setCategorias] = useState([]);

    const updateCategorias = useCallback(async () => {
        try {
            const categoriasCollection = collection(db, 'categorias');
            const categoriasSnapshot = await getDocs(categoriasCollection);
            const categoriasList = categoriasSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCategorias(categoriasList);
        } catch (_) {
            // Sem permissão (usuário não autenticado)
        }
    }, []);

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                updateCategorias();
            } else {
                setCategorias([]);
            }
        });
        return () => unsubAuth();
    }, [updateCategorias]);

    return (
        <CategoriaContext.Provider value={{ categorias, updateCategorias }}>
            {children}
        </CategoriaContext.Provider>
    );
};
