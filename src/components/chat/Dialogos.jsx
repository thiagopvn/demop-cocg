import { useEffect, useMemo, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, InputAdornment, List, ListItemButton, ListItemAvatar, ListItemText, Typography, Box, Chip, IconButton, Tabs, Tab, CircularProgress, Badge, alpha, useTheme, useMediaQuery, Alert,
} from '@mui/material';
import { Search, Close, PersonAdd, Check, Campaign, Draw, AssignmentReturn, SwapHoriz, HourglassEmpty } from '@mui/icons-material';
import UserAvatar, { ROLE_LABELS } from '../UserAvatar';
import { podeIniciarConversa, cautelasPendentesDe, podeTransferirCautela, PASSAGENS_MAX } from '../../services/chatService';
import { nomeComPosto } from '../../hooks/useListasMilitares';

const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const PontoOnline = ({ online, children }) => (
    <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} variant="dot" invisible={!online} sx={{ '& .MuiBadge-badge': { bgcolor: '#22c55e', boxShadow: '0 0 0 2px #fff', width: 11, height: 11, borderRadius: '50%' } }}>
        {children}
    </Badge>
);

/**
 * Nova conversa / contatos / amigos.
 *  - Contatos: quem eu posso chamar agora (admingeral, amigos e, para admin/admingeral, todo mundo).
 *  - Pedidos: pedidos de amizade recebidos e enviados.
 *  - Adicionar: procurar qualquer militar e pedir amizade.
 */
export function DialogoContatos({ open, onClose, eu, usuarios, amizades, online, onAbrirConversa, onPedirAmizade, onAceitarAmizade, onRecusarAmizade }) {
    const theme = useTheme();
    const cheio = useMediaQuery(theme.breakpoints.down('sm'));
    const [aba, setAba] = useState(0);
    const [busca, setBusca] = useState('');
    const [ocupado, setOcupado] = useState('');

    const amigosIds = useMemo(() => new Set(amizades.filter(a => a.status === 'aceita').map(a => a.usuarios.find(u => u !== eu.userId))), [amizades, eu.userId]);
    const pendentesRecebidos = useMemo(() => amizades.filter(a => a.status === 'pendente' && a.destinatario === eu.userId), [amizades, eu.userId]);
    const pendentesEnviados = useMemo(() => amizades.filter(a => a.status === 'pendente' && a.solicitante === eu.userId), [amizades, eu.userId]);
    const lista = useMemo(() => [...usuarios.values()].filter(u => u.id !== eu.userId && u.ativo !== false).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'pt-BR')), [usuarios, eu.userId]);
    const bate = (u) => !busca || norm(`${u.full_name} ${u.username} ${u.rg} ${u.OBM}`).includes(norm(busca));
    const contatos = lista.filter(u => bate(u) && podeIniciarConversa({ meuRole: eu.role, outroRole: u.role, amigos: amigosIds.has(u.id) }));
    const candidatos = lista.filter(u => bate(u) && !amigosIds.has(u.id) && !pendentesEnviados.some(p => p.destinatario === u.id) && !pendentesRecebidos.some(p => p.solicitante === u.id));

    useEffect(() => { if (open) { setBusca(''); setAba(pendentesRecebidos.length ? 1 : 0); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const agir = async (chave, fn) => { setOcupado(chave); try { await fn(); } finally { setOcupado(''); } };

    const linha = ({ u, secundario, acao }) => (
        <ListItemButton key={u.id} onClick={acao ? undefined : () => onAbrirConversa(u)} sx={{ borderRadius: 2, mb: 0.25 }}>
            <ListItemAvatar><PontoOnline online={online.has(u.id)}><UserAvatar src={u.foto_url} name={u.full_name} role={u.role} size={40} /></PontoOnline></ListItemAvatar>
            <ListItemText primary={<Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{nomeComPosto(u) || u.username}</Typography>} secondary={secundario ?? `${ROLE_LABELS[u.role] || u.role}${u.OBM ? ` · ${u.OBM}` : ''}${u.rg ? ` · RG ${u.rg}` : ''}`} secondaryTypographyProps={{ noWrap: true, variant: 'caption' }} />
            {acao}
        </ListItemButton>
    );

    return (
        <Dialog open={open} onClose={onClose} fullScreen={cheio} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: cheio ? 0 : 3, height: cheio ? '100%' : '80vh' } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, flex: 1 }}>Contatos</Typography>
                <IconButton onClick={onClose} aria-label="Fechar"><Close /></IconButton>
            </DialogTitle>
            <Tabs value={aba} onChange={(_, v) => setAba(v)} variant="fullWidth" sx={{ px: 2, minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 700 } }}>
                <Tab label="Conversar" />
                <Tab label={<Badge badgeContent={pendentesRecebidos.length} color="secondary" sx={{ '& .MuiBadge-badge': { right: -10 } }}>Pedidos</Badge>} />
                <Tab label="Adicionar amigo" />
            </Tabs>
            <DialogContent sx={{ pt: 1.5 }}>
                {aba !== 1 && (
                    <TextField fullWidth size="small" autoFocus placeholder="Buscar por nome, RG, usuário ou OBM" value={busca} onChange={(e) => setBusca(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} sx={{ mb: 1 }} />
                )}
                {aba === 0 && (
                    <>
                        {!['admingeral', 'admin'].includes(eu.role) && <Alert severity="info" sx={{ mb: 1, borderRadius: 2 }}>Você pode conversar com os administradores do DEMOP e com seus amigos. Para falar com outro militar, envie um pedido de amizade em "Adicionar amigo".</Alert>}
                        <List dense disablePadding>
                            {contatos.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>Nenhum contato encontrado.</Typography>}
                            {contatos.slice(0, 200).map(u => linha({ u, secundario: amigosIds.has(u.id) ? `Amigo · ${ROLE_LABELS[u.role] || u.role}${u.OBM ? ` · ${u.OBM}` : ''}` : undefined }))}
                        </List>
                    </>
                )}
                {aba === 1 && (
                    <>
                        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Recebidos</Typography>
                        <List dense disablePadding>
                            {pendentesRecebidos.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>Nenhum pedido pendente.</Typography>}
                            {pendentesRecebidos.map(a => { const u = usuarios.get(a.solicitante) || { id: a.solicitante, full_name: a.solicitante_nome }; return (
                                <Box key={a.id}>{linha({ u, secundario: 'Quer ser seu amigo', acao: (
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <Button size="small" variant="contained" color="success" startIcon={ocupado === a.id ? <CircularProgress size={12} color="inherit" /> : <Check />} disabled={Boolean(ocupado)} onClick={() => agir(a.id, () => onAceitarAmizade(a))} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Aceitar</Button>
                                        <IconButton size="small" disabled={Boolean(ocupado)} onClick={() => agir(a.id, () => onRecusarAmizade(a))} aria-label="Recusar"><Close fontSize="small" /></IconButton>
                                    </Box>
                                ) })}</Box>
                            ); })}
                        </List>
                        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, mt: 2, display: 'block' }}>Enviados</Typography>
                        <List dense disablePadding>
                            {pendentesEnviados.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>Você não tem pedidos aguardando resposta.</Typography>}
                            {pendentesEnviados.map(a => { const u = usuarios.get(a.destinatario) || { id: a.destinatario, full_name: a.destinatario_nome }; return (
                                <Box key={a.id}>{linha({ u, secundario: 'Aguardando aceitar', acao: <Chip size="small" icon={<HourglassEmpty sx={{ fontSize: 14 }} />} label="Pendente" variant="outlined" onDelete={() => agir(a.id, () => onRecusarAmizade(a))} deleteIcon={<Close />} /> })}</Box>
                            ); })}
                        </List>
                    </>
                )}
                {aba === 2 && (
                    <List dense disablePadding>
                        {candidatos.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>Ninguém para adicionar com essa busca.</Typography>}
                        {candidatos.slice(0, 100).map(u => (
                            <Box key={u.id}>{linha({ u, acao: (
                                <Button size="small" variant="outlined" startIcon={ocupado === u.id ? <CircularProgress size={12} /> : <PersonAdd />} disabled={Boolean(ocupado)} onClick={() => agir(u.id, () => onPedirAmizade(u))} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>Pedir amizade</Button>
                            ) })}</Box>
                        ))}
                    </List>
                )}
            </DialogContent>
        </Dialog>
    );
}

/** Aviso do admingeral para todos os militares. */
export function DialogoAviso({ open, onClose, onEnviar, totalDestinatarios }) {
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState('');
    useEffect(() => { if (open) { setTexto(''); setErro(''); } }, [open]);
    const enviar = async () => {
        setEnviando(true); setErro('');
        try { await onEnviar(texto.trim()); onClose(); } catch (e) { setErro(e?.message || 'Não foi possível enviar o aviso.'); } finally { setEnviando(false); }
    };
    return (
        <Dialog open={open} onClose={enviando ? undefined : onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800 }}><Campaign color="info" /> Aviso para todos os militares</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>A mensagem chega na conversa de cada militar ativo ({totalDestinatarios}) e dispara notificação no celular de quem ativou o push.</Typography>
                <TextField fullWidth multiline minRows={4} maxRows={10} autoFocus placeholder="Escreva o aviso..." value={texto} onChange={(e) => setTexto(e.target.value)} slotProps={{ htmlInput: { maxLength: 2000 } }} helperText={`${texto.length}/2000`} />
                {erro && <Alert severity="error" sx={{ mt: 1 }}>{erro}</Alert>}
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
                <Button onClick={onClose} disabled={enviando} sx={{ textTransform: 'none' }}>Cancelar</Button>
                <Button variant="contained" onClick={enviar} disabled={enviando || !texto.trim()} startIcon={enviando ? <CircularProgress size={14} color="inherit" /> : <Campaign />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}>Enviar para todos</Button>
            </DialogActions>
        </Dialog>
    );
}

/**
 * Escolher uma cautela para cobrar (assinatura/devolução) ou transferir.
 * modo: 'assinatura' | 'devolucao' | 'transferencia'
 */
export function DialogoEscolherCautela({ open, onClose, modo, dono, onEscolher }) {
    const theme = useTheme();
    const [lista, setLista] = useState(null);
    const [erro, setErro] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const titulo = modo === 'assinatura' ? 'Cobrar assinatura' : modo === 'devolucao' ? 'Cobrar devolução' : 'Transferir cautela';
    const Icone = modo === 'assinatura' ? Draw : modo === 'devolucao' ? AssignmentReturn : SwapHoriz;
    useEffect(() => {
        if (!open || !dono?.id) return undefined;
        let ativo = true;
        setLista(null); setErro('');
        cautelasPendentesDe(dono.id, { apenasNaoAssinadas: modo === 'assinatura' })
            .then(r => { if (ativo) setLista(modo === 'transferencia' ? r.filter(podeTransferirCautela) : r); })
            .catch(e => { if (ativo) { setErro(e?.message || 'Erro ao buscar cautelas'); setLista([]); } });
        return () => { ativo = false; };
    }, [open, dono?.id, modo]);
    const escolher = async (m) => { setOcupado(true); try { await onEscolher(m); onClose(); } finally { setOcupado(false); } };
    const nome = dono?.full_name || dono?.username || '';
    return (
        <Dialog open={open} onClose={ocupado ? undefined : onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800 }}><Icone color={modo === 'transferencia' ? 'warning' : 'secondary'} /> {titulo}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {modo === 'assinatura' && `Cautelas de ${nome} ainda sem assinatura. Escolha uma para enviar a cobrança com o card no chat.`}
                    {modo === 'devolucao' && `Cautelas de ${nome} em aberto. Escolha uma para cobrar a devolução.`}
                    {modo === 'transferencia' && `Suas cautelas assinadas e em aberto (até ${PASSAGENS_MAX} passagens por cautela; depois disso o material deve voltar ao DEMOP). Ao aceitar, o amigo assina e passa a ser o responsável.`}
                </Typography>
                {lista === null && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>}
                {erro && <Alert severity="error">{erro}</Alert>}
                {lista && lista.length === 0 && !erro && <Alert severity="success" sx={{ borderRadius: 2 }}>{modo === 'assinatura' ? 'Nenhuma cautela pendente de assinatura.' : modo === 'transferencia' ? 'Nenhuma cautela assinada disponível para transferir.' : 'Nenhuma cautela em aberto.'}</Alert>}
                <List dense disablePadding>
                    {(lista || []).map(m => (
                        <ListItemButton key={m.id} disabled={ocupado} onClick={() => escolher(m)} sx={{ borderRadius: 2, mb: 0.5, border: `1px solid ${alpha(theme.palette.divider, 1)}` }}>
                            <ListItemText
                                primary={<Typography variant="body2" sx={{ fontWeight: 700 }}>{m.material_description}</Typography>}
                                secondary={`${m.quantity} un. · ${m.date?.toDate ? m.date.toDate().toLocaleDateString('pt-BR') : ''} · ${m.signed ? 'assinada' : 'sem assinatura'}${modo === 'transferencia' ? ` · passagem ${(Number(m.passagens) || 0) + 1} de ${PASSAGENS_MAX}` : ''}`}
                            />
                            <Chip size="small" label={m.signed ? 'Assinada' : 'Pendente'} color={m.signed ? 'success' : 'warning'} sx={{ fontWeight: 700 }} />
                        </ListItemButton>
                    ))}
                </List>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}><Button onClick={onClose} disabled={ocupado} sx={{ textTransform: 'none' }}>Fechar</Button></DialogActions>
        </Dialog>
    );
}
