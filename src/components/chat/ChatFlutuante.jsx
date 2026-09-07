import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper, Box, Typography, IconButton, TextField, CircularProgress, Slide, Tooltip, alpha, useTheme, useMediaQuery, Chip } from '@mui/material';
import { Close, Send, OpenInNew } from '@mui/icons-material';
import { doc, onSnapshot } from 'firebase/firestore';
import db from '../../firebase/db';
import UserAvatar, { ROLE_LABELS } from '../UserAvatar';
import { Bolha, fmtDia } from './Bolhas';
import { escutarMensagens, enviarMensagem, marcarConversaLida } from '../../services/chatService';
import { nomeComPosto } from '../../hooks/useListasMilitares';
import { estaOnline } from '../../services/presencaService';

/**
 * Janela de chat que abre sozinha quando chega uma mensagem, em qualquer tela.
 * Permite responder na hora; para cards (cobrança/transferência) leva para a tela de Mensagens.
 */
export default function ChatFlutuante({ conversaId, eu, onClose }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const [mensagens, setMensagens] = useState([]);
    const [outro, setOutro] = useState(null);
    const [presenca, setPresenca] = useState(null);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const fimRef = useRef(null);
    const euId = eu?.userId;
    const outroId = conversaId ? conversaId.split('_').find((x) => x !== euId) : null;

    useEffect(() => {
        if (!conversaId || !euId) return undefined;
        const u1 = escutarMensagens(conversaId, setMensagens, () => {}, 80);
        const u2 = outroId ? onSnapshot(doc(db, 'users', outroId), (s) => setOutro(s.exists() ? { id: s.id, ...s.data() } : null), () => {}) : () => {};
        const u3 = outroId ? onSnapshot(doc(db, 'presenca', outroId), (s) => setPresenca(s.exists() ? s.data() : null), () => {}) : () => {};
        marcarConversaLida(conversaId, euId);
        return () => { u1(); u2(); u3(); };
    }, [conversaId, euId, outroId]);

    useEffect(() => { fimRef.current?.scrollIntoView({ block: 'end' }); if (conversaId && euId && mensagens.length) marcarConversaLida(conversaId, euId); }, [mensagens, conversaId, euId]);

    const enviar = async () => {
        const t = texto.trim();
        if (!t || !outroId) return;
        setEnviando(true);
        try { await enviarMensagem({ conversaId, de: euId, deNome: eu.fullName || eu.username, para: outroId, texto: t }); setTexto(''); } catch { /* mostra na tela completa */ } finally { setEnviando(false); }
    };
    const abrirCompleto = () => { onClose(); navigate(`/mensagens?c=${conversaId}`); };

    if (!conversaId) return null;
    let diaAnterior = '';
    return (
        <Slide in direction="up" mountOnEnter unmountOnExit>
            <Paper
                elevation={12}
                role="dialog"
                aria-label="Nova mensagem"
                sx={{
                    position: 'fixed', zIndex: 1350, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    right: isMobile ? 8 : 24, left: isMobile ? 8 : 'auto', bottom: isMobile ? 'calc(var(--demop-bottom-nav, 64px) + 8px)' : 24,
                    width: isMobile ? 'auto' : 380, height: isMobile ? '70vh' : 520, maxHeight: '80vh',
                    borderRadius: 4, border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`, bgcolor: 'background.paper',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, bgcolor: theme.palette.primary.main, color: '#fff' }}>
                    <UserAvatar src={outro?.foto_url} name={outro?.full_name} role={outro?.role} size={36} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>{nomeComPosto(outro) || 'Militar'}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.85 }} noWrap>{ROLE_LABELS[outro?.role] || ''}{estaOnline(presenca) ? ' · online' : ''}</Typography>
                    </Box>
                    <Tooltip title="Abrir tela de mensagens"><IconButton size="small" onClick={abrirCompleto} sx={{ color: '#fff' }} aria-label="Abrir tela de mensagens"><OpenInNew fontSize="small" /></IconButton></Tooltip>
                    <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }} aria-label="Fechar chat"><Close fontSize="small" /></IconButton>
                </Box>
                <Box sx={{ flex: 1, overflowY: 'auto', px: 1.25, py: 1, bgcolor: theme.palette.mode === 'dark' ? alpha('#000', 0.2) : alpha(theme.palette.primary.main, 0.04) }}>
                    {mensagens.length === 0 && <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={22} /></Box>}
                    {mensagens.map((m) => {
                        const dia = fmtDia(m.criada_em); const mostrarDia = dia && dia !== diaAnterior; diaAnterior = dia || diaAnterior;
                        return (
                            <Box key={m.id}>
                                {mostrarDia && <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}><Chip label={dia} size="small" sx={{ fontWeight: 700, fontSize: '0.64rem' }} /></Box>}
                                <Bolha msg={m} euId={euId} onAssinar={abrirCompleto} onResponderTransferencia={abrirCompleto} onCancelarTransferencia={abrirCompleto} onIrParaPendencias={() => { onClose(); navigate('/home'); }} />
                            </Box>
                        );
                    })}
                    <div ref={fimRef} />
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-end', p: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 1)}` }}>
                    <TextField fullWidth multiline maxRows={3} size="small" placeholder="Responder..." value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isMobile) { e.preventDefault(); enviar(); } }} slotProps={{ input: { sx: { borderRadius: 3 } }, htmlInput: { 'aria-label': 'Responder', maxLength: 4000 } }} />
                    <IconButton color="primary" onClick={enviar} disabled={!texto.trim() || enviando} aria-label="Enviar resposta" sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { bgcolor: alpha(theme.palette.primary.main, 0.25), color: '#fff' } }}>
                        {enviando ? <CircularProgress size={16} color="inherit" /> : <Send fontSize="small" />}
                    </IconButton>
                </Box>
            </Paper>
        </Slide>
    );
}
