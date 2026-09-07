import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper, Box, Typography, Button, IconButton, CircularProgress, alpha, useTheme, Tooltip } from '@mui/material';
import { PersonAddAlt1, Check, Close, Forum } from '@mui/icons-material';
import { doc, getDoc } from 'firebase/firestore';
import db from '../../firebase/db';
import useCurrentUser from '../../hooks/useCurrentUser';
import UserAvatar, { ROLE_LABELS } from '../UserAvatar';
import { escutarAmizades, aceitarAmizade, desfazerAmizade } from '../../services/chatService';
import { nomeComPosto } from '../../hooks/useListasMilitares';

/** Card do Dashboard com os pedidos de amizade recebidos (some quando não há nenhum). */
export default function PedidosAmizadeCard() {
    const theme = useTheme();
    const navigate = useNavigate();
    const eu = useCurrentUser();
    const [pedidos, setPedidos] = useState([]);
    const [pessoas, setPessoas] = useState({});
    const [ocupado, setOcupado] = useState('');

    useEffect(() => {
        if (!eu.userId) return undefined;
        return escutarAmizades(eu.userId, (lista) => setPedidos(lista.filter((a) => a.status === 'pendente' && a.destinatario === eu.userId)), () => {});
    }, [eu.userId]);

    useEffect(() => {
        pedidos.forEach((p) => {
            if (pessoas[p.solicitante]) return;
            getDoc(doc(db, 'users', p.solicitante)).then((s) => { if (s.exists()) setPessoas((m) => ({ ...m, [p.solicitante]: { id: s.id, ...s.data() } })); }).catch(() => {});
        });
    }, [pedidos]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!eu.userId || pedidos.length === 0) return null;
    const agir = async (id, fn) => { setOcupado(id); try { await fn(); } catch { /* listener atualiza */ } finally { setOcupado(''); } };

    return (
        <Paper elevation={0} sx={{ mb: 2, p: { xs: 1.5, sm: 2 }, borderRadius: 3, border: `1px solid ${alpha(theme.palette.secondary.main, 0.45)}`, background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette.secondary.main, 0.15), color: 'secondary.main' }}><PersonAddAlt1 /></Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>Pedidos de amizade</Typography>
                    <Typography variant="caption" color="text.secondary">{pedidos.length === 1 ? '1 militar quer' : `${pedidos.length} militares querem`} conversar e transferir cautelas com você</Typography>
                </Box>
                <Tooltip title="Abrir mensagens"><IconButton size="small" onClick={() => navigate('/mensagens')} aria-label="Abrir mensagens"><Forum fontSize="small" /></IconButton></Tooltip>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {pedidos.map((p) => { const u = pessoas[p.solicitante] || { full_name: p.solicitante_nome }; return (
                    <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1, borderRadius: 2, bgcolor: 'background.paper', border: `1px solid ${alpha(theme.palette.divider, 1)}` }}>
                        <UserAvatar src={u.foto_url} name={u.full_name} role={u.role} size={40} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{nomeComPosto(u) || u.full_name || 'Militar'}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{ROLE_LABELS[u.role] || ''}{u.OBM ? ` · ${u.OBM}` : ''}{u.rg ? ` · RG ${u.rg}` : ''}</Typography>
                        </Box>
                        <Button size="small" variant="contained" color="success" disabled={Boolean(ocupado)} startIcon={ocupado === p.id ? <CircularProgress size={12} color="inherit" /> : <Check />} onClick={() => agir(p.id, () => aceitarAmizade(p, eu))} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}>Aceitar</Button>
                        <IconButton size="small" disabled={Boolean(ocupado)} onClick={() => agir(p.id, () => desfazerAmizade(p.id))} aria-label="Recusar" sx={{ color: 'text.secondary' }}><Close fontSize="small" /></IconButton>
                    </Box>
                ); })}
            </Box>
        </Paper>
    );
}
