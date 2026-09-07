import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper, Box, Typography, Button, IconButton, CircularProgress, Chip, Tooltip, Snackbar, Alert, alpha, useTheme } from '@mui/material';
import { SwapHoriz, CheckCircle, Cancel, Forum } from '@mui/icons-material';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import db from '../../firebase/db';
import useCurrentUser from '../../hooks/useCurrentUser';
import UserAvatar from '../UserAvatar';
import { nomeComPosto } from '../../hooks/useListasMilitares';
import { callResponderTransferencia } from '../../firebase/functions';
import { DialogoSenha } from './Dialogos';

/** Card do Dashboard: transferências de cautela aguardando a assinatura deste militar. */
export default function TransferenciasPendentesCard() {
    const theme = useTheme();
    const navigate = useNavigate();
    const eu = useCurrentUser();
    const [pendentes, setPendentes] = useState([]);
    const [pessoas, setPessoas] = useState({});
    const [ocupado, setOcupado] = useState('');
    const [aceitando, setAceitando] = useState(null);
    const [aviso, setAviso] = useState('');

    useEffect(() => {
        if (!eu.userId) return undefined;
        const q = query(collection(db, 'transferencias'), where('para', '==', eu.userId), where('status', '==', 'pendente'));
        return onSnapshot(q, (snap) => setPendentes(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.criada_em?.toMillis?.() || 0) - (a.criada_em?.toMillis?.() || 0))), () => {});
    }, [eu.userId]);

    useEffect(() => {
        pendentes.forEach((t) => {
            if (pessoas[t.de]) return;
            getDoc(doc(db, 'users', t.de)).then((s) => { if (s.exists()) setPessoas((m) => ({ ...m, [t.de]: { id: s.id, ...s.data() } })); }).catch(() => {});
        });
    }, [pendentes]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!eu.userId || pendentes.length === 0) return null;

    const recusar = async (t) => {
        setOcupado(t.id);
        try { await callResponderTransferencia(t.id, false); setAviso('Transferência recusada.'); }
        catch (e) { setAviso(e?.message || 'Não foi possível recusar.'); }
        finally { setOcupado(''); }
    };
    const confirmarAceite = async (senha) => {
        await callResponderTransferencia(aceitando.id, true, senha);
        setAviso('Cautela assinada e transferida para o seu nome.');
    };

    return (
        <Paper elevation={0} sx={{ mb: 2, p: { xs: 1.5, sm: 2 }, borderRadius: 3, border: `1px solid ${alpha(theme.palette.warning.main, 0.55)}`, background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.02)} 100%)` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette.warning.main, 0.18), color: 'warning.dark' }}><SwapHoriz /></Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>Cautela aguardando a sua assinatura</Typography>
                    <Typography variant="caption" color="text.secondary">{pendentes.length === 1 ? 'Um amigo quer transferir' : `${pendentes.length} amigos querem transferir`} material para você. Ao aceitar, você assina com a sua senha e passa a ser o responsável.</Typography>
                </Box>
                <Tooltip title="Abrir no chat"><IconButton size="small" onClick={() => navigate('/mensagens')} aria-label="Abrir no chat"><Forum fontSize="small" /></IconButton></Tooltip>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {pendentes.map((t) => { const u = pessoas[t.de] || { full_name: t.de_nome }; return (
                    <Box key={t.id} sx={{ p: 1.25, borderRadius: 2, bgcolor: 'background.paper', border: `1px solid ${alpha(theme.palette.divider, 1)}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                            <UserAvatar src={u.foto_url} name={u.full_name} role={u.role} size={40} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{t.material_description}</Typography>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{t.quantidade} un. · de {nomeComPosto(u) || t.de_nome}{t.criada_em?.toDate ? ` · ${t.criada_em.toDate().toLocaleDateString('pt-BR')} ${t.criada_em.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}</Typography>
                            </Box>
                            <Chip size="small" label="Aguardando você" color="warning" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'flex' } }} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1.25, flexWrap: 'wrap' }}>
                            <Button size="small" variant="contained" color="success" disabled={Boolean(ocupado)} startIcon={<CheckCircle />} onClick={() => setAceitando(t)} sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 800, px: 2 }}>Aceitar e assinar (senha)</Button>
                            <Button size="small" variant="outlined" color="error" disabled={Boolean(ocupado)} startIcon={ocupado === t.id ? <CircularProgress size={12} color="inherit" /> : <Cancel />} onClick={() => recusar(t)} sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}>Recusar</Button>
                        </Box>
                    </Box>
                ); })}
            </Box>
            <DialogoSenha
                open={Boolean(aceitando)} onClose={() => setAceitando(null)}
                titulo="Assinar a cautela"
                descricao={`Ao confirmar com a sua senha, você assina a cautela de ${aceitando?.material_description || 'material'} (${aceitando?.quantidade || 0} un.) vinda de ${aceitando?.de_nome || 'um amigo'} e passa a ser o responsável por ela.`}
                rotuloBotao="Assinar e aceitar"
                onConfirmar={confirmarAceite}
            />
            <Snackbar open={Boolean(aviso)} autoHideDuration={4000} onClose={() => setAviso('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert severity="info" variant="filled" onClose={() => setAviso('')} sx={{ borderRadius: 2 }}>{aviso}</Alert>
            </Snackbar>
        </Paper>
    );
}
