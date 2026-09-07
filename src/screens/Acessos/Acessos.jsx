import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, TextField, InputAdornment, Chip, Table, TableHead, TableRow, TableCell, TableBody, ToggleButtonGroup, ToggleButton, Tooltip, IconButton, Skeleton, alpha, useTheme, useMediaQuery,
} from '@mui/material';
import { Search, Circle, Logout, Login, Timer, Groups, Refresh, Forum, Smartphone, Computer, PhoneIphone } from '@mui/icons-material';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import db from '../../firebase/db';
import MenuContext from '../../contexts/MenuContext';
import PrivateRoute from '../../contexts/PrivateRoute';
import UserAvatar, { ROLE_LABELS } from '../../components/UserAvatar';
import { estaOnline } from '../../services/presencaService';

const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const fmt = (ts) => { const d = ts?.toDate?.(); return d ? d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'; };
const fmtHora = (ts) => { const d = ts?.toDate?.(); return d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'; };
const duracao = (ini, fim) => {
    const a = ini?.toDate?.(); const b = fim?.toDate?.() || new Date();
    if (!a) return '—';
    const min = Math.max(0, Math.round((b - a) / 60000));
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60); return `${h}h ${String(min % 60).padStart(2, '0')}min`;
};
const ENCERRADA = { logout: ['Saiu (logout)', 'default'], inatividade: ['Fechou o app / inativo', 'warning'], fechou: ['Fechou', 'default'] };
const IconePlataforma = ({ p }) => (p === 'app' || p === 'celular' ? <PhoneIphone fontSize="inherit" /> : p === 'app-desktop' ? <Smartphone fontSize="inherit" /> : <Computer fontSize="inherit" />);
const LABEL_PLAT = { app: 'App instalado', celular: 'Navegador no celular', computador: 'Computador', 'app-desktop': 'App no computador' };

/** Tela do admingeral: quem está online agora e o histórico de entradas e saídas. */
export default function Acessos() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const [presencas, setPresencas] = useState([]);
    const [sessoes, setSessoes] = useState(null);
    const [usuarios, setUsuarios] = useState(new Map());
    const [busca, setBusca] = useState('');
    const [periodo, setPeriodo] = useState('hoje');
    const [agora, setAgora] = useState(Date.now());

    useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 30000); return () => clearInterval(t); }, []);
    useEffect(() => {
        const u1 = onSnapshot(collection(db, 'presenca'), (snap) => setPresencas(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
        const u2 = onSnapshot(collection(db, 'users'), (snap) => { const m = new Map(); snap.forEach(d => m.set(d.id, { id: d.id, ...d.data() })); setUsuarios(m); }, () => {});
        return () => { u1(); u2(); };
    }, []);
    useEffect(() => {
        const inicio = new Date();
        if (periodo === 'hoje') inicio.setHours(0, 0, 0, 0);
        else if (periodo === '7') { inicio.setDate(inicio.getDate() - 6); inicio.setHours(0, 0, 0, 0); }
        else if (periodo === '30') { inicio.setDate(inicio.getDate() - 29); inicio.setHours(0, 0, 0, 0); }
        const cons = periodo === 'tudo' ? [orderBy('inicio', 'desc'), limit(500)] : [where('inicio', '>=', inicio), orderBy('inicio', 'desc'), limit(1000)];
        setSessoes(null);
        const unsub = onSnapshot(query(collection(db, 'sessoes'), ...cons), (snap) => setSessoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setSessoes([]));
        return () => unsub();
    }, [periodo]);

    const online = useMemo(() => presencas.filter(p => estaOnline(p)).sort((a, b) => (b.ultima_atividade?.toMillis?.() || 0) - (a.ultima_atividade?.toMillis?.() || 0)), [presencas, agora]); // eslint-disable-line react-hooks/exhaustive-deps
    const bate = (userId) => { const u = usuarios.get(userId); return !busca || norm(`${u?.full_name} ${u?.username} ${u?.rg} ${u?.OBM}`).includes(norm(busca)); };
    const sessoesFiltradas = useMemo(() => (sessoes || []).filter(s => bate(s.userId)), [sessoes, busca, usuarios]); // eslint-disable-line react-hooks/exhaustive-deps
    const hoje = useMemo(() => { const i = new Date(); i.setHours(0, 0, 0, 0); return (sessoes || []).filter(s => (s.inicio?.toDate?.() || 0) >= i); }, [sessoes]);
    const militaresHoje = new Set(hoje.map(s => s.userId)).size;
    const mediaMin = hoje.length ? Math.round(hoje.reduce((t, s) => { const a = s.inicio?.toDate?.(); const b = s.fim?.toDate?.() || s.ultima_atividade?.toDate?.() || a; return t + (a && b ? (b - a) / 60000 : 0); }, 0) / hoje.length) : 0;

    const kpi = ({ titulo, valor, icone, cor }) => (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 1)}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(cor, 0.12), color: cor }}>{icone}</Box>
            <Box><Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1 }}>{valor}</Typography><Typography variant="caption" color="text.secondary">{titulo}</Typography></Box>
        </Paper>
    );

    const militar = ({ userId, secundario }) => { const u = usuarios.get(userId) || {}; return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <UserAvatar src={u.foto_url} name={u.full_name} role={u.role} size={34} />
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>{u.full_name || u.username || userId}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{secundario ?? `${ROLE_LABELS[u.role] || ''}${u.OBM ? ` · ${u.OBM}` : ''}${u.rg ? ` · RG ${u.rg}` : ''}`}</Typography>
            </Box>
        </Box>
    ); };

    return (
        <PrivateRoute allowedRoles={['admingeral']}>
            <MenuContext>
                <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1300, mx: 'auto', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: 1, minWidth: 200 }}>
                            <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>Acessos ao sistema</Typography>
                            <Typography variant="body2" color="text.secondary">Quem está online agora, quando entrou e quando saiu. Atualiza sozinho.</Typography>
                        </Box>
                        <Tooltip title="Atualizar"><IconButton onClick={() => setAgora(Date.now())}><Refresh /></IconButton></Tooltip>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
                        {kpi({ titulo: 'Online agora', valor: online.length, icone: <Circle />, cor: '#22c55e' })}
                        {kpi({ titulo: 'Entradas hoje', valor: hoje.length, icone: <Login />, cor: theme.palette.primary.main })}
                        {kpi({ titulo: 'Militares diferentes hoje', valor: militaresHoje, icone: <Groups />, cor: theme.palette.info.main })}
                        {kpi({ titulo: 'Tempo médio por acesso (hoje)', valor: mediaMin < 60 ? `${mediaMin} min` : `${Math.floor(mediaMin / 60)}h ${mediaMin % 60}min`, icone: <Timer />, cor: theme.palette.warning.main })}
                    </Box>

                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 1)}`, mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}><Circle sx={{ color: '#22c55e', fontSize: 12 }} /> Online agora ({online.length})</Typography>
                        {online.length === 0 && <Typography variant="body2" color="text.secondary">Ninguém online neste momento.</Typography>}
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 1 }}>
                            {online.map(p => (
                                <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 2, bgcolor: alpha('#22c55e', 0.06), border: `1px solid ${alpha('#22c55e', 0.25)}` }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>{militar({ userId: p.id, secundario: `Entrou às ${fmtHora(p.ultimo_login)} · ${LABEL_PLAT[p.plataforma] || p.plataforma || ''}` })}</Box>
                                    <Tooltip title="Enviar mensagem"><IconButton size="small" onClick={() => navigate(`/mensagens?com=${p.id}`)} aria-label="Enviar mensagem"><Forum fontSize="small" /></IconButton></Tooltip>
                                </Box>
                            ))}
                        </Box>
                    </Paper>

                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 1)}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, flex: 1 }}>Histórico de entradas e saídas</Typography>
                            <ToggleButtonGroup size="small" exclusive value={periodo} onChange={(_, v) => v && setPeriodo(v)} sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 700, px: 1.5 } }}>
                                <ToggleButton value="hoje">Hoje</ToggleButton><ToggleButton value="7">7 dias</ToggleButton><ToggleButton value="30">30 dias</ToggleButton><ToggleButton value="tudo">Tudo</ToggleButton>
                            </ToggleButtonGroup>
                            <TextField size="small" placeholder="Buscar militar" value={busca} onChange={(e) => setBusca(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} sx={{ width: { xs: '100%', sm: 240 } }} />
                        </Box>
                        {sessoes === null && <Box>{[1, 2, 3].map(i => <Skeleton key={i} height={44} />)}</Box>}
                        {sessoes && sessoesFiltradas.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>Nenhum acesso no período.</Typography>}
                        {sessoes && sessoesFiltradas.length > 0 && (isMobile ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {sessoesFiltradas.map(s => { const ativa = s.ativa && estaOnline(presencas.find(p => p.id === s.userId)); const [txt, cor] = ativa ? ['Online', 'success'] : (ENCERRADA[s.encerrada_por] || ['Encerrada', 'default']); return (
                                    <Box key={s.id} sx={{ p: 1.25, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 1)}` }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ flex: 1, minWidth: 0 }}>{militar({ userId: s.userId })}</Box><Chip size="small" label={txt} color={cor === 'default' ? undefined : cor} sx={{ fontWeight: 700 }} /></Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}><Login sx={{ fontSize: 13, verticalAlign: 'text-bottom' }} /> {fmt(s.inicio)} · <Logout sx={{ fontSize: 13, verticalAlign: 'text-bottom' }} /> {s.fim ? fmt(s.fim) : (ativa ? 'ainda online' : fmt(s.ultima_atividade))} · {duracao(s.inicio, s.fim || s.ultima_atividade)} · <IconePlataforma p={s.plataforma} /> {LABEL_PLAT[s.plataforma] || ''}</Typography>
                                    </Box>
                                ); })}
                            </Box>
                        ) : (
                            <Box sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead><TableRow>{['Militar', 'Entrou', 'Saiu', 'Tempo', 'Como terminou', 'Onde'].map(h => <TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>)}</TableRow></TableHead>
                                    <TableBody>
                                        {sessoesFiltradas.map(s => { const ativa = s.ativa && estaOnline(presencas.find(p => p.id === s.userId)); const [txt, cor] = ativa ? ['Online agora', 'success'] : (ENCERRADA[s.encerrada_por] || ['Encerrada', 'default']); return (
                                            <TableRow key={s.id} hover>
                                                <TableCell sx={{ minWidth: 220 }}>{militar({ userId: s.userId })}</TableCell>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(s.inicio)}</TableCell>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{s.fim ? fmt(s.fim) : (ativa ? '—' : fmt(s.ultima_atividade))}</TableCell>
                                                <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{duracao(s.inicio, s.fim || (ativa ? null : s.ultima_atividade))}</TableCell>
                                                <TableCell><Chip size="small" label={txt} color={cor === 'default' ? undefined : cor} variant={cor === 'default' ? 'outlined' : 'filled'} sx={{ fontWeight: 700 }} /></TableCell>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 16 }}><IconePlataforma p={s.plataforma} /><Typography variant="caption">{LABEL_PLAT[s.plataforma] || s.plataforma || '—'}</Typography></Box></TableCell>
                                            </TableRow>
                                        ); })}
                                    </TableBody>
                                </Table>
                            </Box>
                        ))}
                    </Paper>
                </Box>
            </MenuContext>
        </PrivateRoute>
    );
}
