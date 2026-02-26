import { createContext, useState, useEffect, useContext } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import db, { auth } from '../firebase/db';

const MaterialContext = createContext();

export const MaterialProvider = ({ children }) => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubFirestore = null;

        const unsubAuth = onAuthStateChanged(auth, (user) => {
            // Limpa listener anterior se existir
            if (unsubFirestore) {
                unsubFirestore();
                unsubFirestore = null;
            }

            if (!user) {
                setMaterials([]);
                setLoading(false);
                return;
            }

            // Usuário autenticado — inicia listener do Firestore
            setLoading(true);
            const q = query(collection(db, 'materials'), orderBy('description'));
            unsubFirestore = onSnapshot(q, (snapshot) => {
                const materialsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setMaterials(materialsData);
                setLoading(false);
            }, () => {
                setLoading(false);
            });
        });

        return () => {
            unsubAuth();
            if (unsubFirestore) unsubFirestore();
        };
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
