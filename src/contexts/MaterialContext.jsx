import { createContext, useState, useEffect, useContext } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import db from '../firebase/db';

const MaterialContext = createContext();

export const MaterialProvider = ({ children }) => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'materials'), orderBy('description'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const materialsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMaterials(materialsData);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao buscar materiais: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <MaterialContext.Provider value={{ materials, loading }}>
            {children}
        </MaterialContext.Provider>
    );
};

export const useMaterials = () => {
    const context = useContext(MaterialContext);
    if (!context) {
        throw new Error('useMaterials must be used within a MaterialProvider');
    }
    return context;
};

export default MaterialContext;