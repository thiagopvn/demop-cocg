import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import db, { auth } from '../firebase/db';
import { verifyToken } from '../firebase/token';

/**
 * Usuario logado: papel/username vem do JWT (imediato) e nome completo, foto e
 * demais campos vem do documento `users/{id}` em tempo real (a foto atualiza
 * assim que o perfil e salvo).
 */
export default function useCurrentUser() {
    const [user, setUser] = useState({ userId: null, username: '', role: null, fullName: '', fotoUrl: null, loading: true });

    useEffect(() => {
        let unsubDoc = null;
        let unsubAuth = null;
        let cancelado = false;

        const token = localStorage.getItem('token');
        if (!token) {
            setUser(u => ({ ...u, loading: false }));
            return undefined;
        }

        verifyToken(token).then((decoded) => {
            if (cancelado || !decoded) {
                setUser(u => ({ ...u, loading: false }));
                return;
            }
            setUser(u => ({ ...u, userId: decoded.userId || null, username: decoded.username || '', role: decoded.role || null, loading: false }));
            if (!decoded.userId) return;

            unsubAuth = onAuthStateChanged(auth, (fbUser) => {
                if (unsubDoc) { unsubDoc(); unsubDoc = null; }
                if (!fbUser) return;
                unsubDoc = onSnapshot(doc(db, 'users', decoded.userId), (snap) => {
                    if (!snap.exists()) return;
                    const d = snap.data();
                    setUser(u => ({
                        ...u,
                        fullName: d.full_name || u.fullName,
                        username: d.username || u.username,
                        role: d.role || u.role,
                        fotoUrl: d.foto_url || null,
                        obm: d.OBM || '',
                        posto: d.posto || '',
                    }));
                }, () => {});
            });
        }).catch(() => setUser(u => ({ ...u, loading: false })));

        return () => {
            cancelado = true;
            if (unsubAuth) unsubAuth();
            if (unsubDoc) unsubDoc();
        };
    }, []);

    return user;
}
