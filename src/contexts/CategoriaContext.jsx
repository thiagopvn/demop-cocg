import React, { createContext, useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import db from "../firebase/db";

export const CategoriaContext = createContext();

export const CategoriaProvider = ({ children }) => {
    const [categorias, setCategorias] = useState([]);

    // Função para atualizar as categorias (exposta via contexto)
    const updateCategorias = useCallback(async () => {
        const categoriasCollection = collection(db, 'categorias');
        const categoriasSnapshot = await getDocs(categoriasCollection);
        const categoriasList = categoriasSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setCategorias(categoriasList);
    }, []);

    // Carrega as categorias inicialmente
    useEffect(() => {
        updateCategorias();
    }, [updateCategorias]);

    return (
        <CategoriaContext.Provider value={{ categorias, updateCategorias }}>
            {children}
        </CategoriaContext.Provider>
    );
};