import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box, Paper, Typography, TextField, IconButton, InputAdornment, List, ListItemButton, ListItemAvatar, ListItemText, Badge, Chip, Button, Menu, MenuItem, Tooltip, CircularProgress, Snackbar, Alert, Tabs, Tab, alpha, useTheme, useMediaQuery,
} from '@mui/material';
import { Send, Add, Search, ArrowBack, Draw, AssignmentReturn, SwapHoriz, Campaign, PersonAddAlt1, NotificationsActive, Forum, MoreVert } from '@mui/icons-material';
import { collection, onSnapshot, doc, getDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import db from '../../firebase/db';
import MenuContext from '../../contexts/MenuContext';
import PrivateRoute from '../../contexts/PrivateRoute';
import useCurrentUser from '../../hooks/useCurrentUser';
import UserAvatar, { ROLE_LABELS } from '../../components/UserAvatar';
import { Bolha, fmtDia, fmtHora } from '../../components/chat/Bolhas';
import { DialogoContatos, DialogoAviso, DialogoEscolherCautela, DialogoSenha } from '../../components/chat/Dialogos';
import {
    escutarConversas, escutarMensagens, escutarAmizades, escutarPresencaOnline, abrirConversa, enviarMensagem, marcarConversaLida,
    pedirAmizade, aceitarAmizade, desfazerAmizade, cardDeCautela, textoCobranca, solicitarTransferencia, cancelarTransferencia, idPar, podeTransferirPara,
} from '../../services/chatService';
import { estaOnline } from '../../services/presencaService';
import { nomeComPosto } from '../../hooks/useListasMilitares';
import { callEnviarAviso, callResponderTransferencia } from '../../firebase/functions';
import { ativarPush, pushDisponivel, pushPermissao } from '../../services/pushService';
import { logAudit } from '../../firebase/auditLog';

const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const PontoOnline = ({ online, size = 12, children }) => (
    <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} variant="dot" invisible={!online} sx={{ '& .MuiBadge-badge': { bgcolor: '#22c55e', boxShadow: '0 0 0 2px var(--mui-palette-background-paper, #fff)', width: size, height: size, borderRadius: '50%' } }}>
        {children}
    </Badge>
);

const vistoPorUltimo = (p) => {
    if (!p) return 'sem registro de acesso';
    if (estaOnline(p)) return 'online agora';
    const d = (p.ultimo_logout || p.ultima_atividade)?.toDate?.();
    return d ? `visto por último ${fmtDia(d).toLowerCase()} às ${fmtHora(d)}` : 'offline';
};

export default function Mensagens() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const eu = useCurrentUser();
    const escuro = theme.palette.mode === 'dark';

    const [usuarios, setUsuarios] = useState(new Map());
    const [conversas, setConversas] = useState([]);
    const [amizades, setAmizades] = useState([]);
    const [online, setOnline] = useState(new Map());
    const [presencaOutro, setPresencaOutro] = useState(null);
    const [ativa, setAtiva] = useState(null);
    const [mensagens, setMensagens] = useState([]);
    const [carregandoMsgs, setCarregandoMsgs] = useState(false);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [ocupadoCard, setOcupadoCard] = useState(false);
    const [busca, setBusca] = useState('');
    const [abaLista, setAbaLista] = useState('conversas'); // 'conversas' | 'amigos'
    const [dialogo, setDialogo] = useState(null); // 'contatos' | 'aviso' | 'assinatura' | 'devolucao' | 'transferencia'
    const [menuMais, setMenuMais] = useState(null);
    const [pedirSenha, setPedirSenha] = useState(null); // { tipo: 'transferir' | 'aceitar', cautela | msg, destino? }
    const [transferirDoDashboard, setTransferirDoDashboard] = useState(null); // cautela escolhida no Dashboard, falta o destinatario
    const [aviso, setAviso] = useState({ open: false, msg: '', sev: 'info' });
    const [erroPermissao, setErroPermissao] = useState('');
    const [pushEstado, setPushEstado] = useState(pushPermissao());
    const fimRef = useRef(null);
    const inputRef = useRef(null);

    const notificar = (msg, sev = 'info') => setAviso({ open: true, msg, sev });
    const euId = eu.userId;

    // Cadastro dos militares (nome, foto, papel) ---------------------------
    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'users'), orderBy('full_name')), (snap) => {
            const m = new Map(); snap.forEach(d => m.set(d.id, { id: d.id, ...d.data() })); setUsuarios(m);
        }, () => {});
        return () => unsub();
    }, []);

    // Conversas, amizades e presença ---------------------------------------
    useEffect(() => {
        if (!euId) return undefined;
        const u1 = escutarConversas(euId, setConversas, (e) => setErroPermissao(e?.message || ''));
        const u2 = escutarAmizades(euId, setAmizades, () => {});
        const u3 = escutarPresencaOnline(setOnline, () => {});
        return () => { u1(); u2(); u3(); };
    }, [euId]);

    // Mensagens da conversa ativa -------------------------------------------
    useEffect(() => {
        if (!ativa) { setMensagens([]); return undefined; }
        setCarregandoMsgs(true);
        const unsub = escutarMensagens(ativa, (lista) => { setMensagens(lista); setCarregandoMsgs(false); }, () => setCarregandoMsgs(false));
        return () => unsub();
    }, [ativa]);

    // Presença de quem está do outro lado ------------------------------------
    const outroId = useMemo(() => (ativa ? ativa.split('_').find(x => x !== euId) : null), [ativa, euId]);
    useEffect(() => {
        if (!outroId) { setPresencaOutro(null); return undefined; }
        const unsub = onSnapshot(doc(db, 'presenca', outroId), (s) => setPresencaOutro(s.exists() ? s.data() : null), () => {});
        return () => unsub();
    }, [outroId]);

    // Marca como lida ao abrir / receber -------------------------------------
    useEffect(() => {
        if (!ativa || !euId) return;
        const conv = conversas.find(c => c.id === ativa);
        if (conv && (conv.naoLidas?.[euId] || 0) > 0) marcarConversaLida(ativa, euId);
    }, [ativa, euId, conversas]);

    // Rolagem para o fim
    useEffect(() => { fimRef.current?.scrollIntoView({ block: 'end' }); }, [mensagens, ativa]);

    // Deep-link: ?c=conversaId  |  ?com=userId[&cobrar=assinatura|devolucao]
    useEffect(() => {
        if (!euId) return;
        const c = params.get('c'); const com = params.get('com'); const cobrar = params.get('cobrar'); const acao = params.get('acao'); const transferir = params.get('transferir');
        if (transferir) {
            getDoc(doc(db, 'movimentacoes', transferir)).then((snap) => {
                if (!snap.exists()) { notificar('Cautela não encontrada.', 'warning'); return; }
                setTransferirDoDashboard({ id: snap.id, ...snap.data() });
                setDialogo('contatos');
            }).catch(() => notificar('Não foi possível abrir a cautela.', 'error'));
            setParams({}, { replace: true });
            return;
        }
        if (c) { setAtiva(c); if (acao === 'transferir') setTimeout(() => setDialogo('transferencia'), 400); setParams({}, { replace: true }); return; }
        if (com) {
            abrirConversa(euId, com).then((id) => { setAtiva(id); if (cobrar === 'assinatura' || cobrar === 'devolucao') setDialogo(cobrar); })
                .catch(() => notificar('Você não pode iniciar conversa com este militar. Envie um pedido de amizade.', 'warning'));
            setParams({}, { replace: true });
        }
    }, [euId, params, setParams]);

    const amigosIds = useMemo(() => new Set(amizades.filter(a => a.status === 'aceita').map(a => a.usuarios.find(u => u !== euId))), [amizades, euId]);
    const pedidosRecebidos = amizades.filter(a => a.status === 'pendente' && a.destinatario === euId).length;
    const outro = outroId ? (usuarios.get(outroId) || { id: outroId, full_name: 'Militar' }) : null;
    const outroEhAmigo = outroId ? amigosIds.has(outroId) : false;
    const totalNaoLidas = conversas.reduce((s, c) => s + (c.naoLidas?.[euId] || 0), 0);
    const amigos = useMemo(() => {
        const b = norm(busca);
        return [...amigosIds].map(id => usuarios.get(id)).filter(Boolean)
            .filter(u => !b || norm(`${u.full_name} ${u.username} ${u.rg} ${u.OBM}`).includes(b))
            .sort((a, b2) => (online.has(b2.id) ? 1 : 0) - (online.has(a.id) ? 1 : 0) || (a.full_name || '').localeCompare(b2.full_name || '', 'pt-BR'));
    }, [amigosIds, usuarios, busca, online]);

    const conversasFiltradas = useMemo(() => {
        const b = norm(busca);
        return conversas.filter(c => {
            const o = c.participantes.find(p => p !== euId); const u = usuarios.get(o);
            return !b || norm(`${u?.full_name} ${u?.username} ${u?.rg} ${c.ultima?.texto}`).includes(b);
        });
    }, [conversas, busca, usuarios, euId]);

    // Ações ------------------------------------------------------------------
    const abrirCom = useCallback(async (u) => {
        try {
            const id = await abrirConversa(euId, u.id); setAtiva(id); setDialogo(null);
            if (transferirDoDashboard) { setPedirSenha({ tipo: 'transferir', cautela: transferirDoDashboard, destino: u }); setTransferirDoDashboard(null); }
            else setTimeout(() => inputRef.current?.focus(), 200);
        }
        catch (e) { notificar(e?.code === 'permission-denied' ? 'Você só pode conversar com administradores do DEMOP ou com amigos. Envie um pedido de amizade.' : (e?.message || 'Erro ao abrir conversa'), 'warning'); }
    }, [euId, transferirDoDashboard]);

    const enviarTexto = async () => {
        const t = texto.trim();
        if (!t || !ativa || !outroId) return;
        setEnviando(true);
        try { await enviarMensagem({ conversaId: ativa, de: euId, deNome: eu.fullName || eu.username, para: outroId, texto: t }); setTexto(''); }
        catch (e) { notificar(e?.code === 'permission-denied' ? 'Sem permissão para enviar nesta conversa.' : 'Não foi possível enviar.', 'error'); }
        finally { setEnviando(false); inputRef.current?.focus(); }
    };

    const enviarCobranca = async (m, subtipo) => {
        await enviarMensagem({ conversaId: ativa, de: euId, deNome: eu.fullName || eu.username, para: outroId, texto: textoCobranca(outro?.full_name, m, subtipo), tipo: 'cobranca', card: cardDeCautela(m, subtipo) });
        logAudit({ action: 'movimentacao_cobranca', userId: euId, userName: eu.username, targetCollection: 'movimentacoes', targetId: m.id, targetName: m.material_description, details: { tipo: subtipo, militar: outro?.full_name, militarId: outroId } });
        notificar('Cobrança enviada.', 'success');
    };

    // Transferir: escolhe a cautela e confirma com a senha (a Cloud Function confere)
    const transferir = async (m) => { setPedirSenha({ tipo: 'transferir', cautela: m }); };
    const confirmarTransferencia = async (senha) => {
        await solicitarTransferencia({ amigo: pedirSenha.destino || outro, cautela: pedirSenha.cautela, senha });
        notificar('Pedido de transferência enviado. Aguarde o aceite.', 'success');
    };

    const assinarPeloCard = async (msg) => {
        setOcupadoCard(true);
        try {
            await updateDoc(doc(db, 'movimentacoes', msg.card.movimentacaoId), { signed: true, signed_date: serverTimestamp() });
            await updateDoc(doc(db, 'conversas', ativa, 'mensagens', msg.id), { 'card.signed': true });
            await enviarMensagem({ conversaId: ativa, de: euId, deNome: eu.fullName || eu.username, para: outroId, texto: `Assinei a cautela de ${msg.card.material_description}.`, tipo: 'sistema' });
            notificar('Cautela assinada!', 'success');
        } catch (e) { notificar(e?.code === 'permission-denied' ? 'Só o responsável pela cautela pode assinar.' : 'Erro ao assinar.', 'error'); }
        finally { setOcupadoCard(false); }
    };

    // Aceitar = assinar com a senha; recusar não pede senha
    const responderTransferencia = async (msg, aceitar) => {
        if (aceitar) { setPedirSenha({ tipo: 'aceitar', msg }); return; }
        setOcupadoCard(true);
        try { await callResponderTransferencia(msg.card.transferenciaId, false); notificar('Transferência recusada.', 'info'); }
        catch (e) { notificar(e?.message || 'Erro ao responder.', 'error'); }
        finally { setOcupadoCard(false); }
    };
    const confirmarAceite = async (senha) => {
        await callResponderTransferencia(pedirSenha.msg.card.transferenciaId, true, senha);
        notificar('Transferência aceita e assinada. A cautela agora está no seu nome.', 'success');
    };

    const cancelarTransf = async (msg) => {
        setOcupadoCard(true);
        try { await cancelarTransferencia(msg.card.transferenciaId); await updateDoc(doc(db, 'conversas', ativa, 'mensagens', msg.id), { 'card.status': 'cancelada' }); notificar('Transferência cancelada.'); }
        catch { notificar('Não foi possível cancelar.', 'error'); }
        finally { setOcupadoCard(false); }
    };

    const enviarAviso = async (t) => { const r = await callEnviarAviso(t); notificar(`Aviso enviado para ${r.enviados} militares.`, 'success'); };

    const ligarPush = async () => {
        const r = await ativarPush(euId);
        setPushEstado(pushPermissao());
        notificar(r.ok ? 'Notificações ativadas neste aparelho.' : r.motivo === 'denied' ? 'Permissão negada no navegador. Libere as notificações nas configurações do site.' : 'Não foi possível ativar as notificações aqui.', r.ok ? 'success' : 'warning');
    };

    // Render ------------------------------------------------------------------
    const podeCobrar = Boolean(outro) && (['admingeral', 'admin', 'BensPatrimoniais', 'chefe'].includes(eu.role) || outroEhAmigo);
    const podeTransferir = Boolean(outro) && podeTransferirPara({ outroRole: outro?.role, amigos: outroEhAmigo });
    const mostrarLista = !isMobile || !ativa;
    const mostrarChat = !isMobile || Boolean(ativa);

    const itemConversa = (c) => {
        const o = c.participantes.find(p => p !== euId); const u = usuarios.get(o) || { id: o, full_name: 'Militar' };
        const n = c.naoLidas?.[euId] || 0; const minha = c.ultima?.de === euId;
        return (
            <ListItemButton key={c.id} selected={ativa === c.id} onClick={() => setAtiva(c.id)} sx={{ borderRadius: 2.5, mb: 0.25, alignItems: 'flex-start', py: 1, '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.1) } }}>
                <ListItemAvatar sx={{ mt: 0.25 }}><PontoOnline online={online.has(o)}><UserAvatar src={u.foto_url} name={u.full_name} role={u.role} size={44} /></PontoOnline></ListItemAvatar>
                <ListItemText
                    primary={<Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}><Typography variant="body2" sx={{ fontWeight: n ? 900 : 700, flex: 1 }} noWrap>{nomeComPosto(u) || u.username}</Typography><Typography variant="caption" color={n ? 'secondary.main' : 'text.disabled'} sx={{ fontWeight: n ? 800 : 500 }}>{c.ultima?.em ? (fmtDia(c.ultima.em) === 'Hoje' ? fmtHora(c.ultima.em) : fmtDia(c.ultima.em)) : ''}</Typography></Box>}
                    secondary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><Typography variant="caption" color={n ? 'text.primary' : 'text.secondary'} sx={{ flex: 1, fontWeight: n ? 700 : 400 }} noWrap>{minha ? 'Você: ' : ''}{c.ultima?.texto || 'Sem mensagens'}</Typography>{n > 0 && <Chip label={n} size="small" color="secondary" sx={{ height: 18, fontSize: '0.66rem', fontWeight: 800, '& .MuiChip-label': { px: 0.75 } }} />}</Box>}
                    slotProps={{ secondary: { component: 'div' } }}
                />
            </ListItemButton>
        );
    };

    let diaAnterior = '';

    return (
        <PrivateRoute allowedRoles={['user', 'chefe', 'admin', 'admingeral', 'BensPatrimoniais']}>
            <MenuContext>
                <Box sx={{ p: { xs: 0, md: 2 }, height: { xs: 'calc(100dvh - 56px - var(--demop-bottom-nav, 64px))', md: 'calc(100vh - 32px)' }, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <Paper elevation={0} sx={{ flex: 1, minHeight: 0, display: 'flex', borderRadius: { xs: 0, md: 4 }, overflow: 'hidden', border: { md: `1px solid ${alpha(theme.palette.divider, 1)}` } }}>
                        {/* Lista ------------------------------------------------ */}
                        {mostrarLista && (
                            <Box sx={{ width: { xs: '100%', md: 340 }, flexShrink: 0, borderRight: { md: `1px solid ${alpha(theme.palette.divider, 1)}` }, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                <Box sx={{ p: 1.5, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Forum color="primary" />
                                    <Typography variant="h6" sx={{ fontWeight: 900, flex: 1 }}>Mensagens</Typography>
                                    {pushDisponivel() && pushEstado !== 'granted' && (
                                        <Tooltip title="Ativar notificações no celular"><IconButton size="small" color="secondary" onClick={ligarPush} aria-label="Ativar notificações"><NotificationsActive /></IconButton></Tooltip>
                                    )}
                                    {eu.role === 'admingeral' && (
                                        <Tooltip title="Aviso para todos"><IconButton size="small" color="info" onClick={() => setDialogo('aviso')} aria-label="Aviso para todos"><Campaign /></IconButton></Tooltip>
                                    )}
                                    <Tooltip title="Nova conversa / contatos">
                                        <IconButton size="small" onClick={() => setDialogo('contatos')} aria-label="Nova conversa" sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }}>
                                            <Badge badgeContent={pedidosRecebidos} color="secondary"><Add /></Badge>
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                                <Tabs value={abaLista} onChange={(_, v) => setAbaLista(v)} variant="fullWidth" sx={{ px: 1.5, minHeight: 38, mb: 0.5, '& .MuiTab-root': { minHeight: 38, textTransform: 'none', fontWeight: 800, fontSize: '0.85rem' } }}>
                                    <Tab value="conversas" label={<Badge badgeContent={totalNaoLidas} color="secondary" max={99} sx={{ '& .MuiBadge-badge': { right: -12, top: 2 } }}>Conversas</Badge>} />
                                    <Tab value="amigos" label={<Badge badgeContent={amigosIds.size} color="success" max={99} sx={{ '& .MuiBadge-badge': { right: -12, top: 2 } }}>Amigos</Badge>} />
                                </Tabs>
                                <Box sx={{ px: 1.5, pb: 1 }}>
                                    <TextField fullWidth size="small" placeholder={abaLista === 'amigos' ? 'Buscar amigo' : 'Buscar conversa'} value={busca} onChange={(e) => setBusca(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>, sx: { borderRadius: 3 } } }} />
                                </Box>
                                {pedidosRecebidos > 0 && (
                                    <Button size="small" startIcon={<PersonAddAlt1 />} onClick={() => setDialogo('contatos')} sx={{ mx: 1.5, mb: 1, borderRadius: 2, textTransform: 'none', fontWeight: 700, justifyContent: 'flex-start', bgcolor: alpha(theme.palette.secondary.main, 0.1) }}>
                                        {pedidosRecebidos} pedido(s) de amizade para responder
                                    </Button>
                                )}
                                <Box sx={{ flex: 1, overflowY: 'auto', px: 1, pb: 1 }}>
                                    {abaLista === 'amigos' && (
                                        <>
                                            {amigos.length === 0 && (
                                                <Box sx={{ textAlign: 'center', p: 3, color: 'text.secondary' }}>
                                                    <PersonAddAlt1 sx={{ fontSize: 40, opacity: 0.3 }} />
                                                    <Typography variant="body2" sx={{ mt: 1 }}>{amigosIds.size === 0 ? 'Você ainda não tem amigos aceitos.' : 'Nenhum amigo com essa busca.'}</Typography>
                                                    <Button size="small" startIcon={<Add />} onClick={() => setDialogo('contatos')} sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}>Adicionar amigo</Button>
                                                </Box>
                                            )}
                                            <List dense disablePadding>
                                                {amigos.map((u) => (
                                                    <ListItemButton key={u.id} onClick={() => abrirCom(u)} sx={{ borderRadius: 2.5, mb: 0.25, py: 1 }}>
                                                        <ListItemAvatar><PontoOnline online={online.has(u.id)}><UserAvatar src={u.foto_url} name={u.full_name} role={u.role} size={44} /></PontoOnline></ListItemAvatar>
                                                        <ListItemText
                                                            primary={<Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{nomeComPosto(u) || u.username}</Typography>}
                                                            secondary={<Typography variant="caption" color={online.has(u.id) ? 'success.main' : 'text.secondary'} noWrap sx={{ fontWeight: online.has(u.id) ? 700 : 400 }}>{online.has(u.id) ? 'online agora' : `${ROLE_LABELS[u.role] || ''}${u.OBM ? ` · ${u.OBM}` : ''}`}</Typography>}
                                                            slotProps={{ secondary: { component: 'div' } }}
                                                        />
                                                        <Chip size="small" label="Amigo" variant="outlined" color="success" sx={{ fontWeight: 700 }} />
                                                    </ListItemButton>
                                                ))}
                                            </List>
                                        </>
                                    )}
                                    {abaLista === 'conversas' && erroPermissao && <Alert severity="warning" sx={{ m: 1, borderRadius: 2 }}>Não foi possível carregar as conversas. Saia e entre de novo no app.</Alert>}
                                    {abaLista === 'conversas' && conversas.length === 0 && !erroPermissao && (
                                        <Box sx={{ textAlign: 'center', p: 3, color: 'text.secondary' }}>
                                            <Forum sx={{ fontSize: 40, opacity: 0.3 }} />
                                            <Typography variant="body2" sx={{ mt: 1 }}>Nenhuma conversa ainda.</Typography>
                                            <Button size="small" startIcon={<Add />} onClick={() => setDialogo('contatos')} sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}>Começar uma conversa</Button>
                                        </Box>
                                    )}
                                    {abaLista === 'conversas' && <List dense disablePadding>{conversasFiltradas.map(itemConversa)}</List>}
                                </Box>
                            </Box>
                        )}

                        {/* Chat ------------------------------------------------- */}
                        {mostrarChat && (
                            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, bgcolor: escuro ? alpha('#000', 0.2) : alpha(theme.palette.primary.main, 0.035) }}>
                                {!ativa ? (
                                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', p: 3, textAlign: 'center' }}>
                                        <Forum sx={{ fontSize: 56, opacity: 0.25 }} />
                                        <Typography variant="h6" sx={{ fontWeight: 800, mt: 1 }}>Chat do DEMOP</Typography>
                                        <Typography variant="body2" sx={{ maxWidth: 380 }}>Escolha uma conversa ao lado ou comece uma nova. Cobre assinaturas e devoluções com um card, e transfira cautelas entre amigos.</Typography>
                                        {totalNaoLidas > 0 && <Chip color="secondary" label={`${totalNaoLidas} mensagem(ns) não lida(s)`} sx={{ mt: 2, fontWeight: 700 }} />}
                                    </Box>
                                ) : (
                                    <>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: { xs: 1, md: 2 }, py: 1, bgcolor: 'background.paper', borderBottom: `1px solid ${alpha(theme.palette.divider, 1)}` }}>
                                            {isMobile && <IconButton onClick={() => setAtiva(null)} aria-label="Voltar"><ArrowBack /></IconButton>}
                                            <PontoOnline online={online.has(outroId)}><UserAvatar src={outro?.foto_url} name={outro?.full_name} role={outro?.role} size={40} /></PontoOnline>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>{nomeComPosto(outro) || outro?.username}</Typography>
                                                <Typography variant="caption" sx={{ color: estaOnline(presencaOutro) ? 'success.main' : 'text.secondary', fontWeight: estaOnline(presencaOutro) ? 700 : 400 }} noWrap>
                                                    {ROLE_LABELS[outro?.role] || ''}{outro?.OBM ? ` · ${outro.OBM}` : ''} · {vistoPorUltimo(presencaOutro)}
                                                </Typography>
                                            </Box>
                                            {outroEhAmigo && <Chip size="small" label="Amigo" variant="outlined" color="success" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'flex' } }} />}
                                            <IconButton size="small" onClick={(e) => setMenuMais(e.currentTarget)} aria-label="Mais opções"><MoreVert /></IconButton>
                                            <Menu anchorEl={menuMais} open={Boolean(menuMais)} onClose={() => setMenuMais(null)}>
                                                {outroEhAmigo && <MenuItem onClick={async () => { setMenuMais(null); const a = amizades.find(x => x.id === idPar(euId, outroId)); if (a) { await desfazerAmizade(a.id); notificar('Amizade desfeita.'); } }}>Desfazer amizade</MenuItem>}
                                                <MenuItem onClick={() => { setMenuMais(null); navigate('/perfil'); }}>Meu perfil</MenuItem>
                                                {pushDisponivel() && pushEstado !== 'granted' && <MenuItem onClick={() => { setMenuMais(null); ligarPush(); }}>Ativar notificações</MenuItem>}
                                            </Menu>
                                        </Box>

                                        <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 1.25, md: 3 }, py: 1.5 }}>
                                            {carregandoMsgs && mensagens.length === 0 && <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={26} /></Box>}
                                            {!carregandoMsgs && mensagens.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 3 }}>Diga oi para {String(outro?.full_name || '').split(' ')[0]}.</Typography>}
                                            {mensagens.map((m) => {
                                                const dia = fmtDia(m.criada_em); const mostrarDia = dia && dia !== diaAnterior; diaAnterior = dia || diaAnterior;
                                                return (
                                                    <Box key={m.id}>
                                                        {mostrarDia && <Box sx={{ display: 'flex', justifyContent: 'center', my: 1.5 }}><Chip label={dia} size="small" sx={{ fontWeight: 700, fontSize: '0.66rem', bgcolor: alpha(theme.palette.text.primary, 0.06) }} /></Box>}
                                                        <Bolha msg={m} euId={euId} ocupado={ocupadoCard} onAssinar={assinarPeloCard} onResponderTransferencia={responderTransferencia} onCancelarTransferencia={cancelarTransf} onIrParaPendencias={() => navigate('/home')} />
                                                    </Box>
                                                );
                                            })}
                                            <div ref={fimRef} />
                                        </Box>

                                        <Box sx={{ bgcolor: 'background.paper', borderTop: `1px solid ${alpha(theme.palette.divider, 1)}` }}>
                                            {/* Ações da conversa: botões visíveis (nada escondido em menu) */}
                                            <Box sx={{ display: 'flex', gap: 1, px: { xs: 1, md: 1.5 }, pt: 1, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
                                                <Tooltip title={podeTransferir ? 'Passar esta cautela para este militar. Você confirma com a sua senha e ele assina com a dele.' : 'A transferência é só entre amigos. Para este militar, envie um pedido de amizade e aguarde o aceite. Para devolver ao DEMOP, leve o material: o DEMOP registra a devolução e você recebe o comprovante.'}>
                                                    <span style={{ flexShrink: 0 }}>
                                                        <Button
                                                            size="small" variant="contained" disabled={!podeTransferir} onClick={() => setDialogo('transferencia')} startIcon={<SwapHoriz />}
                                                            sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 800, px: 2, whiteSpace: 'nowrap', background: podeTransferir ? `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.secondary.main} 100%)` : undefined, color: '#fff', boxShadow: podeTransferir ? `0 6px 16px ${alpha(theme.palette.secondary.main, 0.35)}` : 'none', '&.Mui-disabled': { bgcolor: alpha(theme.palette.text.primary, 0.08), color: 'text.disabled' } }}
                                                        >
                                                            Transferir cautela
                                                        </Button>
                                                    </span>
                                                </Tooltip>
                                                {podeCobrar && (
                                                    <Button size="small" variant="outlined" color="secondary" onClick={() => setDialogo('assinatura')} startIcon={<Draw />} sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>Cobrar assinatura</Button>
                                                )}
                                                {podeCobrar && (
                                                    <Button size="small" variant="outlined" color="info" onClick={() => setDialogo('devolucao')} startIcon={<AssignmentReturn />} sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>Cobrar devolução</Button>
                                                )}
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-end', p: { xs: 1, md: 1.5 } }}>
                                                <TextField
                                                    inputRef={inputRef} fullWidth multiline maxRows={5} size="small" placeholder="Escreva uma mensagem" value={texto}
                                                    onChange={(e) => setTexto(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isMobile) { e.preventDefault(); enviarTexto(); } }}
                                                    slotProps={{ input: { sx: { borderRadius: 3, bgcolor: escuro ? alpha('#fff', 0.04) : alpha(theme.palette.primary.main, 0.04) } }, htmlInput: { 'aria-label': 'Mensagem', maxLength: 4000 } }}
                                                />
                                                <IconButton color="primary" onClick={enviarTexto} disabled={!texto.trim() || enviando} aria-label="Enviar" sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { bgcolor: alpha(theme.palette.primary.main, 0.25), color: '#fff' } }}>
                                                    {enviando ? <CircularProgress size={18} color="inherit" /> : <Send fontSize="small" />}
                                                </IconButton>
                                            </Box>
                                        </Box>
                                    </>
                                )}
                            </Box>
                        )}
                    </Paper>
                </Box>

                <DialogoContatos
                    open={dialogo === 'contatos'} onClose={() => { setDialogo(null); setTransferirDoDashboard(null); }} eu={eu} usuarios={usuarios} amizades={amizades} online={online}
                    transferindo={transferirDoDashboard}
                    onAbrirConversa={abrirCom}
                    onPedirAmizade={async (u) => { try { await pedirAmizade(eu, u); notificar(`Pedido enviado para ${u.full_name}.`, 'success'); } catch (e) { console.error('pedirAmizade:', e); notificar(`Não foi possível enviar o pedido${e?.code ? ` (${e.code})` : ''}.`, 'error'); } }}
                    onAceitarAmizade={async (a) => { try { await aceitarAmizade(a, eu); notificar('Agora vocês são amigos.', 'success'); } catch (e) { console.error('aceitarAmizade:', e); notificar(`Erro ao aceitar${e?.code ? ` (${e.code})` : ''}.`, 'error'); } }}
                    onRecusarAmizade={async (a) => { try { await desfazerAmizade(a.id); } catch { notificar('Erro ao remover pedido.', 'error'); } }}
                />
                <DialogoAviso open={dialogo === 'aviso'} onClose={() => setDialogo(null)} onEnviar={enviarAviso} totalDestinatarios={[...usuarios.values()].filter(u => u.ativo !== false && u.id !== euId).length} />
                <DialogoEscolherCautela open={dialogo === 'assinatura' || dialogo === 'devolucao'} modo={dialogo === 'devolucao' ? 'devolucao' : 'assinatura'} dono={outro} onClose={() => setDialogo(null)} onEscolher={(m) => enviarCobranca(m, dialogo)} />
                <DialogoEscolherCautela open={dialogo === 'transferencia'} modo="transferencia" dono={{ id: euId, full_name: eu.fullName }} onClose={() => setDialogo(null)} onEscolher={transferir} />
                <DialogoSenha
                    open={Boolean(pedirSenha)} onClose={() => setPedirSenha(null)}
                    titulo={pedirSenha?.tipo === 'aceitar' ? 'Assinar a cautela' : 'Confirmar transferência'}
                    descricao={pedirSenha?.tipo === 'aceitar'
                        ? `Ao confirmar com a sua senha, você assina a cautela de ${pedirSenha?.msg?.card?.material_description || 'material'} e passa a ser o responsável por ela.`
                        : `Confirme com a sua senha a transferência de ${pedirSenha?.cautela?.material_description || 'material'} para ${nomeComPosto(pedirSenha?.destino || outro) || (pedirSenha?.destino || outro)?.username || 'o militar'}.`}
                    rotuloBotao={pedirSenha?.tipo === 'aceitar' ? 'Assinar e aceitar' : 'Confirmar'}
                    onConfirmar={pedirSenha?.tipo === 'aceitar' ? confirmarAceite : confirmarTransferencia}
                />

                <Snackbar open={aviso.open} autoHideDuration={4000} onClose={() => setAviso(a => ({ ...a, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                    <Alert severity={aviso.sev} variant="filled" onClose={() => setAviso(a => ({ ...a, open: false }))} sx={{ borderRadius: 2 }}>{aviso.msg}</Alert>
                </Snackbar>
            </MenuContext>
        </PrivateRoute>
    );
}

