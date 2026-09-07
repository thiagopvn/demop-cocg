import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import db from '../firebase/db';

/** Postos/graduações na ordem hierárquica. Os extras cadastrados pelo admingeral (coleção `postos`) entram no fim. */
export const POSTOS_PADRAO = ['SD', 'SD TEMP', 'CB', '3º SGT', '2º SGT', '1º SGT', 'SUBTEN', 'ASP OF', '2º TEN', '1º TEN', 'CAP', 'MAJ', 'TEN CEL', 'CEL'];

export const OBMS_PADRAO = [
    '1º GBM', '2 º GBM', '3 º GBM', '4 º GBM', '5 º GBM', '6 º GBM', '7 º GBM', '8 º GBM', '9 º GBM', '10 º GBM', '11 º GBM', '12 º GBM', '13 º GBM', '14 º GBM', '15 º GBM',
    '16 º GBM', '17 º GBM', '18 º GBM', '19 º GBM', '20 º GBM', '21 º GBM', '22 º GBM', '23 º GBM', '24 º GBM', '25 º GBM', '26 º GBM', '27 º GBM', '28 º GBM', '29 º GBM',
    '1 º GMAR', '2 º GMAR', '3 º GMAR', '4 º GMAR', '1 º GSFMA', '2 º GSFMA', 'GOCG', 'GOPP', 'GEP', 'GBMUS', 'DGP', 'DGF', 'DGAF', 'FUNESBOM', 'SUSAU', 'SUAD', 'DGPAT',
    'DGVP', 'DGSE', 'DGO', 'DGS', 'DGAL', 'DGEAO', 'DGST', 'DPPT', 'DGDP', 'DGAS', 'DI', 'DGCCO', 'DGEI', 'ABMDPII', 'CEICS', 'ESCBM', 'CFAP', 'EMG', 'QCG', 'SEDEC', 'CSM',
];

const normalizar = (s) => String(s || '').trim().replace(/\s+/g, ' ');

function useListaFirestore(colecao, padrao) {
    const [extras, setExtras] = useState([]);
    useEffect(() => {
        const unsub = onSnapshot(collection(db, colecao), (snap) => setExtras(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
        return () => unsub();
    }, [colecao]);
    const lista = useMemo(() => {
        const vistos = new Set(padrao.map((p) => p.toUpperCase()));
        const out = [...padrao];
        [...extras].sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999) || String(a.nome).localeCompare(String(b.nome), 'pt-BR')).forEach((e) => {
            const n = normalizar(e.nome);
            if (n && !vistos.has(n.toUpperCase())) { vistos.add(n.toUpperCase()); out.push(n); }
        });
        return out;
    }, [extras, padrao]);
    const adicionar = async (nome, extra = {}) => {
        const n = normalizar(nome);
        if (!n) throw new Error('Informe o nome.');
        if (lista.some((x) => x.toUpperCase() === n.toUpperCase())) return n;
        await addDoc(collection(db, colecao), { nome: n, criado_em: serverTimestamp(), ...extra });
        return n;
    };
    return { lista, adicionar };
}

/** Postos: lista padrão + extras. Só o admingeral consegue adicionar (regra do Firestore). */
export const usePostos = () => useListaFirestore('postos', POSTOS_PADRAO);
/** OBMs: lista padrão + extras criadas ao cadastrar usuário (admin/BensPatrimoniais). */
export const useObms = () => useListaFirestore('obms', OBMS_PADRAO);

/** "3º SGT Fulano" quando há posto; senão só o nome. */
export const nomeComPosto = (u) => {
    if (!u) return '';
    const nome = u.full_name || u.username || '';
    return u.posto ? `${u.posto} ${nome}`.trim() : nome;
};
