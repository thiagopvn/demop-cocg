import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, collection, query, where, onSnapshot as onSnap } from 'firebase/firestore';
import db from '../firebase/db';
import { verifyToken } from '../firebase/token';
import {
    COMPRESSOR_FIXO_ID,
    ensureCompressorFixoSeed,
    getCompressorStatus,
    startCompressor,
    pauseCompressor,
    concludeCompressorSession,
    discardCompressorSession,
    registrarManutencao,
    editUsoSession,
    deleteUsoSession,
    deleteManutencaoRegistro,
} from '../services/compressorService';

/**
 * Hook central do controle de compressor.
 * - Garante o seed do compressor fixo.
 * - Assina o documento e os históricos (uso/manutenção) em tempo real.
 * - Mantém um "tick" de 1s para o cronômetro avançar quando estiver rodando.
 * - Expõe o estado derivado (getCompressorStatus) e as ações.
 */
export const useCompressor = (compressorId = COMPRESSOR_FIXO_ID) => {
    const [compressor, setCompressor] = useState(null);
    const [usos, setUsos] = useState([]);
    const [manutencoes, setManutencoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(Date.now());
    const [operador, setOperador] = useState('');
    const [role, setRole] = useState('');
    const seeded = useRef(false);

    // Carrega o operador (usuário logado) para carimbar as ações
    useEffect(() => {
        (async () => {
            try {
                const user = await verifyToken(localStorage.getItem('token'));
                if (user) {
                    setOperador(user.username || '');
                    setRole(user.role || '');
                }
            } catch { /* ignore */ }
        })();
    }, []);

    // Seed + assinaturas em tempo real
    useEffect(() => {
        let unsubDoc = () => {};
        let unsubUsos = () => {};
        let unsubManut = () => {};
        let mounted = true;

        (async () => {
            try {
                if (!seeded.current) {
                    seeded.current = true;
                    await ensureCompressorFixoSeed();
                }
            } catch (e) {
                console.error('Erro no seed do compressor:', e);
            }
            if (!mounted) return;

            unsubDoc = onSnapshot(
                doc(collection(db, 'compressores'), compressorId),
                (d) => {
                    if (!mounted) return;
                    setCompressor(d.exists() ? { id: d.id, ...d.data() } : null);
                    setLoading(false);
                },
                (err) => {
                    console.error('Listener compressor:', err);
                    if (mounted) setLoading(false);
                }
            );

            // Ordenação feita no cliente (evita exigir índice composto no Firestore)
            const ms = (v) => {
                if (!v) return 0;
                if (typeof v.toMillis === 'function') return v.toMillis();
                if (typeof v.toDate === 'function') return v.toDate().getTime();
                if (v.seconds != null) return v.seconds * 1000;
                const d = new Date(v);
                return isNaN(d.getTime()) ? 0 : d.getTime();
            };

            unsubUsos = onSnap(
                query(collection(db, 'compressor_usos'), where('compressorId', '==', compressorId)),
                (snap) => {
                    if (!mounted) return;
                    const arr = snap.docs.map((x) => ({ id: x.id, ...x.data() }));
                    arr.sort((a, b) => ms(b.endAt) - ms(a.endAt));
                    setUsos(arr);
                },
                (err) => console.error('Listener usos:', err)
            );

            unsubManut = onSnap(
                query(collection(db, 'compressor_manutencoes'), where('compressorId', '==', compressorId)),
                (snap) => {
                    if (!mounted) return;
                    const arr = snap.docs.map((x) => ({ id: x.id, ...x.data() }));
                    arr.sort((a, b) => ms(b.data) - ms(a.data));
                    setManutencoes(arr);
                },
                (err) => console.error('Listener manutenções:', err)
            );
        })();

        return () => {
            mounted = false;
            unsubDoc();
            unsubUsos();
            unsubManut();
        };
    }, [compressorId]);

    // Tick de 1s apenas quando estiver rodando (economiza renders)
    useEffect(() => {
        if (compressor?.status !== 'running') return;
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [compressor?.status]);

    const status = getCompressorStatus(compressor, now);

    // Ações memoizadas
    const start = useCallback(() => startCompressor(compressorId, operador), [compressorId, operador]);
    const pause = useCallback(() => pauseCompressor(compressorId), [compressorId]);
    const conclude = useCallback(
        (opts) => concludeCompressorSession(compressorId, { operador, ...opts }),
        [compressorId, operador]
    );
    const discard = useCallback(() => discardCompressorSession(compressorId), [compressorId]);
    const registrar = useCallback(
        (opts) => registrarManutencao(compressorId, { realizadoPor: operador, ...opts }),
        [compressorId, operador]
    );
    const editUso = useCallback(
        (usoId, novaDuracaoSeconds, observacao) => editUsoSession(usoId, compressorId, novaDuracaoSeconds, observacao),
        [compressorId]
    );
    const deleteUso = useCallback(
        (usoId) => deleteUsoSession(usoId, compressorId, { userName: operador }),
        [compressorId, operador]
    );
    const deleteManutencao = useCallback(
        (manutId) => deleteManutencaoRegistro(manutId, { userName: operador }),
        [operador]
    );

    const isAdminGeral = role === 'admingeral';

    return {
        compressor,
        usos,
        manutencoes,
        loading,
        status,
        operador,
        role,
        isAdminGeral,
        now,
        actions: { start, pause, conclude, discard, registrar, editUso, deleteUso, deleteManutencao },
    };
};

export default useCompressor;
