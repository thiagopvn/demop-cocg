import { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    Chip,
    TextField,
    InputAdornment,
    IconButton,
    Tooltip,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Tabs,
    Tab,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Snackbar,
    Alert,
    Skeleton,
    Badge,
    alpha,
    styled,
    useTheme,
    useMediaQuery,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
} from '@mui/material';
import {
    Warehouse,
    Add,
    Search,
    Clear,
    MoreVert,
    Edit,
    Delete,
    ReportProblem,
    Inventory,
    AutoAwesome,
    Flag,
    PlaylistAddCheck,
    AddLocationAlt,
    Tune,
} from '@mui/icons-material';
import { doc, getDoc } from 'firebase/firestore';
import db from '../../firebase/db';
import MenuContext from '../../contexts/MenuContext';
import { useMaterials } from '../../contexts/MaterialContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useLocaisArmazenamento, useAlocacoesLocais } from '../../hooks/useLocais';
import { verifyToken } from '../../firebase/token';
import {
    getTipoInfo,
    resumirLocalizacao,
    seedLocaisPadrao,
    excluirLocal,
    definirLocalInoperantes,
    normalizarTexto,
    LOCAIS_PADRAO,
} from '../../services/localizacaoService';
import { TipoLocalIcon } from '../../components/locais/LocalChip';

const LocalDialog = lazy(() => import('../../dialogs/LocalDialog'));
const LocalConteudoDialog = lazy(() => import('../../dialogs/LocalConteudoDialog'));
const MaterialLocalDialog = lazy(() => import('../../dialogs/MaterialLocalDialog'));

const StatCard = styled(Card)(({ theme }) => ({
    padding: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(1.25, 1.5),
        flex: '0 0 auto',
        minWidth: 190,
        '& .MuiTypography-h6': { fontSize: '1.15rem' },
    },
    borderRadius: theme.spacing(1.5),
    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
    flex: 1,
    minWidth: 0,
    transition: 'all 0.25s ease',
    '&:hover': { transform: 'translateY(-2px)', boxShadow: theme.shadows[3] },
}));

const LocalCard = styled(Card, { shouldForwardProp: (p) => p !== 'cor' && p !== 'vazio' })(({ theme, cor, vazio }) => ({
    position: 'relative',
    padding: theme.spacing(1.75, 2),
    borderRadius: theme.spacing(1.75),
    cursor: 'pointer',
    border: `1px solid ${alpha(cor, vazio ? 0.18 : 0.35)}`,
    background: vazio
        ? theme.palette.background.paper
        : `linear-gradient(160deg, ${alpha(cor, 0.1)} 0%, ${alpha(cor, 0.02)} 100%)`,
    boxShadow: 'none',
    transition: 'all 0.2s ease',
    '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: `0 10px 24px ${alpha(cor, 0.18)}`,
        borderColor: alpha(cor, 0.6),
    },
    '&::before': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: 12,
        bottom: 12,
        width: 4,
        borderRadius: 4,
        background: vazio ? alpha(cor, 0.25) : cor,
    },
}));

const nomeTipoPlural = (tipo) => getTipoInfo(tipo.key, tipo.label).plural || tipo.label;

export default function Locais() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { materials, loading: loadingMaterials } = useMaterials();
    const { locais, tipos, loading: loadingLocais } = useLocaisArmazenamento();
    const { porMaterial, porLocal, loading: loadingAloc } = useAlocacoesLocais();

    const [loggedUserId, setLoggedUserId] = useState(null);
    const [loggedUserName, setLoggedUserName] = useState(null);
    const [tab, setTab] = useState(0);
    const [busca, setBusca] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [localDialog, setLocalDialog] = useState({ open: false, local: null });
    const [conteudoLocal, setConteudoLocal] = useState(null);
    const [materialDialog, setMaterialDialog] = useState(null);
    const [menu, setMenu] = useState({ anchor: null, local: null });
    const [confirmExcluir, setConfirmExcluir] = useState(null);
    const [seeding, setSeeding] = useState(false);
    const debouncedBusca = useDebounce(busca, 250);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        verifyToken(token).then(async (decoded) => {
            setLoggedUserId(decoded.userId);
            try {
                const snap = await getDoc(doc(db, 'users', decoded.userId));
                setLoggedUserName(snap.exists() ? (snap.data().full_name || snap.data().username) : decoded.username);
            } catch {
                setLoggedUserName(decoded.username || null);
            }
        }).catch(() => {});
    }, []);

    const notificar = useCallback((message, severity = 'success') => setSnackbar({ open: true, message, severity }), []);
    const user = useMemo(() => ({ userId: loggedUserId, userName: loggedUserName }), [loggedUserId, loggedUserName]);

    // ---------- Derivados ----------
    const materialsById = useMemo(() => new Map(materials.map(m => [m.id, m])), [materials]);

    const situacaoMateriais = useMemo(() => {
        const lista = materials.map(m => ({ material: m, resumo: resumirLocalizacao(m, porMaterial.get(m.id) || []) }));
        const semLocal = lista.filter(x => x.resumo.semLocal > 0).sort((a, b) => b.resumo.semLocal - a.resumo.semLocal);
        const excedentes = lista.filter(x => x.resumo.excedente > 0);
        const comLocal = lista.filter(x => x.resumo.alocadas > 0).length;
        const unidadesSemLocal = semLocal.reduce((acc, x) => acc + x.resumo.semLocal, 0);
        return { semLocal, excedentes, comLocal, unidadesSemLocal };
    }, [materials, porMaterial]);

    const locaisFiltrados = useMemo(() => {
        const termo = normalizarTexto(debouncedBusca);
        return locais.filter(l => {
            if (tipoFiltro && l.tipo !== tipoFiltro) return false;
            if (!termo) return true;
            if (normalizarTexto(l.nome).includes(termo)) return true;
            if (normalizarTexto(l.observacao || '').includes(termo)) return true;
            const conteudo = porLocal.get(l.id) || [];
            return conteudo.some(a => normalizarTexto(a.material_description || materialsById.get(a.material_id)?.description || '').includes(termo));
        });
    }, [locais, tipoFiltro, debouncedBusca, porLocal, materialsById]);

    const grupos = useMemo(() => {
        const mapa = new Map();
        for (const l of locaisFiltrados) {
            const key = l.tipo;
            if (!mapa.has(key)) mapa.set(key, { tipo: tipos.find(t => t.key === key) || { key, label: l.tipo_label, ...getTipoInfo(key, l.tipo_label) }, locais: [] });
            mapa.get(key).locais.push(l);
        }
        return [...mapa.values()];
    }, [locaisFiltrados, tipos]);

    const totalUnidadesGuardadas = useMemo(() => {
        let total = 0;
        for (const lista of porLocal.values()) for (const a of lista) total += Number(a.quantidade) || 0;
        return total;
    }, [porLocal]);

    // ---------- Acoes ----------
    const handleSeed = async () => {
        setSeeding(true);
        try {
            const { criados, ignorados } = await seedLocaisPadrao(user);
            notificar(`${criados.length} locais criados${ignorados.length ? ` (${ignorados.length} já existiam)` : ''}.`);
        } catch (e) {
            console.error(e);
            notificar('Erro ao criar locais padrão.', 'error');
        } finally {
            setSeeding(false);
        }
    };

    const handleExcluir = async () => {
        const local = confirmExcluir;
        setConfirmExcluir(null);
        if (!local) return;
        try {
            await excluirLocal(local, user);
            notificar(`Local "${local.nome}" excluído.`);
            if (conteudoLocal?.id === local.id) setConteudoLocal(null);
        } catch (e) {
            notificar(e?.message || 'Erro ao excluir local.', 'error');
        }
    };

    const handleDefinirInoperantes = async (local) => {
        if (!local) return;
        try {
            const r = await definirLocalInoperantes(local.id, user);
            const partes = [`${local.nome} agora é o local de inoperantes.`];
            if (r.anteriores.length > 0) partes.push(`${r.anteriores.join(', ')} deixou de ser.`);
            if (r.transferidos > 0) partes.push(`${r.transferidos} un. transferida(s) para cá.`);
            notificar(partes.join(' '));
        } catch (e) {
            notificar(e?.message || 'Erro ao definir local de inoperantes.', 'error');
        }
    };

    const abrirMenu = (e, local) => { e.stopPropagation(); setMenu({ anchor: e.currentTarget, local }); };
    const fecharMenu = () => setMenu({ anchor: null, local: null });

    const loading = loadingLocais || loadingAloc || loadingMaterials;
    const conteudoAtual = conteudoLocal ? (locais.find(l => l.id === conteudoLocal.id) || conteudoLocal) : null;
    const descricaoPadrao = LOCAIS_PADRAO.map(f => `${getTipoInfo(f.tipo).plural} ${String(f.de).padStart(2, '0')}–${String(f.ate).padStart(2, '0')}`).join(', ');

    return (
        <MenuContext>
            <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3, py: 2 }}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', fontSize: { xs: '1.15rem', sm: '1.5rem' }, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Warehouse /> Locais de Armazenamento
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Onde cada material fica guardado no DEMOP — prateleiras, box, gavetas e armários
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {!loadingLocais && locais.length === 0 && (
                            <Tooltip title={descricaoPadrao}>
                                <Button variant="outlined" color="secondary" startIcon={seeding ? <CircularProgress size={16} /> : <AutoAwesome />} onClick={handleSeed} disabled={seeding} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                                    Criar locais padrão
                                </Button>
                            </Tooltip>
                        )}
                        <Button variant="contained" startIcon={<Add />} onClick={() => setLocalDialog({ open: true, local: null })} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3, boxShadow: 2, '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
                            Novo local
                        </Button>
                    </Box>
                </Box>

                {/* Stats */}
                <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, mb: { xs: 2, sm: 3 }, overflowX: { xs: 'auto', sm: 'visible' }, pb: { xs: 0.5, sm: 0 } }}>
                    <StatCard>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', display: 'flex' }}><Warehouse /></Box>
                            <Box>
                                <Typography variant="h6" fontWeight={700} color="primary.main">{loadingLocais ? '…' : locais.length}</Typography>
                                <Typography variant="caption" color="text.secondary">Locais cadastrados</Typography>
                            </Box>
                        </Box>
                    </StatCard>
                    <StatCard>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main', display: 'flex' }}><PlaylistAddCheck /></Box>
                            <Box>
                                <Typography variant="h6" fontWeight={700} color="success.main">{loading ? '…' : situacaoMateriais.comLocal}</Typography>
                                <Typography variant="caption" color="text.secondary">Materiais com local · {totalUnidadesGuardadas} un.</Typography>
                            </Box>
                        </Box>
                    </StatCard>
                    <StatCard
                        onClick={() => setTab(1)}
                        sx={{
                            cursor: 'pointer',
                            ...(situacaoMateriais.semLocal.length > 0 && {
                                background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.03)} 100%)`,
                                borderColor: alpha(theme.palette.warning.main, 0.3),
                            }),
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.12), color: 'warning.dark', display: 'flex' }}><ReportProblem /></Box>
                            <Box>
                                <Typography variant="h6" fontWeight={700} sx={{ color: situacaoMateriais.semLocal.length > 0 ? 'warning.dark' : 'text.secondary' }}>
                                    {loading ? '…' : situacaoMateriais.semLocal.length}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">Materiais sem local · {situacaoMateriais.unidadesSemLocal} un.</Typography>
                            </Box>
                        </Box>
                    </StatCard>
                </Box>

                {/* Tabs */}
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, borderRadius: 2, minHeight: 44 } }}>
                    <Tab icon={<Warehouse fontSize="small" />} iconPosition="start" label="Locais" />
                    <Tab
                        icon={<Badge badgeContent={situacaoMateriais.semLocal.length} color="warning" max={999} sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}><Inventory fontSize="small" /></Badge>}
                        iconPosition="start"
                        label={<Box component="span" sx={{ ml: situacaoMateriais.semLocal.length > 0 ? 1 : 0 }}>Materiais sem local</Box>}
                    />
                </Tabs>

                {tab === 0 && (
                    <>
                        {/* Busca + filtro de tipo */}
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Buscar local ou material guardado (ex.: prateleira 3, motosserra)..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Escape') setBusca(''); }}
                            slotProps={{
                                input: {
                                    startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment>,
                                    endAdornment: busca && <InputAdornment position="end"><IconButton size="small" onClick={() => setBusca('')}><Clear fontSize="small" /></IconButton></InputAdornment>,
                                },
                            }}
                            sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
                        />
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2.5, alignItems: 'center' }}>
                            <Chip label={`Todos (${locais.length})`} onClick={() => setTipoFiltro('')} color={!tipoFiltro ? 'primary' : 'default'} variant={!tipoFiltro ? 'filled' : 'outlined'} sx={{ fontWeight: 600 }} />
                            {tipos.map(t => (
                                <Chip
                                    key={t.key}
                                    icon={<TipoLocalIcon tipo={t.key} sx={{ fontSize: '1rem !important', color: `${tipoFiltro === t.key ? '#fff' : t.cor} !important` }} />}
                                    label={`${nomeTipoPlural(t)} (${t.count})`}
                                    onClick={() => setTipoFiltro(prev => (prev === t.key ? '' : t.key))}
                                    sx={{
                                        fontWeight: 600,
                                        bgcolor: tipoFiltro === t.key ? t.cor : alpha(t.cor, 0.08),
                                        color: tipoFiltro === t.key ? '#fff' : t.cor,
                                        border: `1px solid ${alpha(t.cor, 0.3)}`,
                                        '&:hover': { bgcolor: tipoFiltro === t.key ? t.cor : alpha(t.cor, 0.18) },
                                    }}
                                />
                            ))}
                        </Box>

                        {loadingLocais ? (
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} variant="rounded" height={96} sx={{ borderRadius: 2 }} />)}
                            </Box>
                        ) : locais.length === 0 ? (
                            <Card sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3, textAlign: 'center', border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`, boxShadow: 'none' }}>
                                <Warehouse sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>Nenhum local cadastrado</Typography>
                                <Typography variant="body2" color="text.disabled" sx={{ mb: 2.5, maxWidth: 520, mx: 'auto' }}>
                                    Crie os locais do DEMOP de uma vez ({descricaoPadrao}; a Prateleira 03 fica marcada como local de inoperantes) ou cadastre um a um.
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <Button variant="contained" color="secondary" startIcon={seeding ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />} onClick={handleSeed} disabled={seeding} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                                        Criar locais padrão
                                    </Button>
                                    <Button variant="outlined" startIcon={<AddLocationAlt />} onClick={() => setLocalDialog({ open: true, local: null })} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                                        Cadastrar manualmente
                                    </Button>
                                </Box>
                            </Card>
                        ) : locaisFiltrados.length === 0 ? (
                            <Card sx={{ p: 4, borderRadius: 3, textAlign: 'center', boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
                                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>Nenhum local encontrado para essa busca</Typography>
                            </Card>
                        ) : (
                            grupos.map(grupo => (
                                <Box key={grupo.tipo.key} sx={{ mb: 3.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                        <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: alpha(grupo.tipo.cor, 0.12), color: grupo.tipo.cor, display: 'flex' }}>
                                            <TipoLocalIcon tipo={grupo.tipo.key} fontSize="small" />
                                        </Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: grupo.tipo.cor }}>{nomeTipoPlural(grupo.tipo)}</Typography>
                                        <Chip label={grupo.locais.length} size="small" sx={{ fontWeight: 700, bgcolor: alpha(grupo.tipo.cor, 0.1), color: grupo.tipo.cor, height: 22 }} />
                                    </Box>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                                        {grupo.locais.map(local => {
                                            const conteudo = porLocal.get(local.id) || [];
                                            const unidades = conteudo.reduce((acc, a) => acc + (Number(a.quantidade) || 0), 0);
                                            const nomes = conteudo
                                                .map(a => materialsById.get(a.material_id)?.description || a.material_description || '')
                                                .filter(Boolean)
                                                .sort((a, b) => a.localeCompare(b, 'pt-BR'));
                                            const vazio = conteudo.length === 0;
                                            return (
                                                <LocalCard key={local.id} cor={grupo.tipo.cor} vazio={vazio ? 1 : 0} onClick={() => setConteudoLocal(local)}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                        <Box sx={{ flex: 1, minWidth: 0, pl: 0.5 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                                                <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{local.nome}</Typography>
                                                                {local.inoperantes && (
                                                                    <Tooltip title="Local de materiais inoperantes">
                                                                        <ReportProblem sx={{ fontSize: 16, color: 'error.main' }} />
                                                                    </Tooltip>
                                                                )}
                                                            </Box>
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                                                                {vazio ? 'vazio' : `${conteudo.length} materia${conteudo.length === 1 ? 'l' : 'is'} · ${unidades} un.`}
                                                                {local.observacao ? ` · ${local.observacao}` : ''}
                                                            </Typography>
                                                            {!vazio && (
                                                                <Typography variant="body2" sx={{ fontSize: '0.78rem', color: 'text.primary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35 }}>
                                                                    {nomes.slice(0, 4).join(' · ')}{nomes.length > 4 ? ` · +${nomes.length - 4}` : ''}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                        <IconButton size="small" onClick={(e) => abrirMenu(e, local)} sx={{ mt: -0.5, mr: -0.75 }}>
                                                            <MoreVert fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                </LocalCard>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            ))
                        )}
                    </>
                )}

                {tab === 1 && (
                    <Card sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
                        {situacaoMateriais.excedentes.length > 0 && (
                            <Alert severity="warning" sx={{ borderRadius: 0 }}>
                                {situacaoMateriais.excedentes.length} materia{situacaoMateriais.excedentes.length === 1 ? 'l tem' : 'is têm'} mais unidades guardadas do que existem no DEMOP (saíram para viatura/consumo). Abra o material e use "Ajustar".
                            </Alert>
                        )}
                        <Box sx={{ overflowX: 'auto' }}>
                            <Table sx={{ minWidth: 640 }}>
                                <TableHead sx={{ background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)` }}>
                                    <TableRow>
                                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Material</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Categoria</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">No DEMOP</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">Com local</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">Sem local</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Ação</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
                                    ) : situacaoMateriais.semLocal.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                                <PlaylistAddCheck sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                                                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>Tudo guardado</Typography>
                                                <Typography variant="body2" color="text.disabled">Todos os materiais do DEMOP têm local definido.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        situacaoMateriais.semLocal.map(({ material, resumo }) => (
                                            <TableRow key={material.id} hover sx={{ cursor: 'pointer' }} onClick={() => setMaterialDialog(material)}>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{material.description}</Typography>
                                                    {resumo.alocadas > 0 && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {(porMaterial.get(material.id) || []).map(a => `${a.local_nome} ×${a.quantidade}`).join(' · ')}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell><Typography variant="body2" color="text.secondary">{material.categoria || '-'}</Typography></TableCell>
                                                <TableCell align="center"><Typography variant="body2" fontWeight={600}>{resumo.unidadesDemop}</Typography></TableCell>
                                                <TableCell align="center"><Typography variant="body2" color="success.main" fontWeight={600}>{resumo.alocadas}</Typography></TableCell>
                                                <TableCell align="center"><Chip label={resumo.semLocal} size="small" color="warning" sx={{ fontWeight: 800, minWidth: 40 }} /></TableCell>
                                                <TableCell align="right">
                                                    <Button size="small" variant="outlined" startIcon={<AddLocationAlt />} onClick={(e) => { e.stopPropagation(); setMaterialDialog(material); }} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                        {isMobile ? 'Local' : 'Definir local'}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Box>
                    </Card>
                )}
            </Box>

            {/* Menu do card */}
            <Menu anchorEl={menu.anchor} open={Boolean(menu.anchor)} onClose={fecharMenu} PaperProps={{ sx: { borderRadius: 2, minWidth: 190 } }}>
                <MenuItem onClick={() => { setConteudoLocal(menu.local); fecharMenu(); }}>
                    <ListItemIcon><Tune fontSize="small" /></ListItemIcon>
                    <ListItemText>Ver conteúdo</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { setLocalDialog({ open: true, local: menu.local }); fecharMenu(); }}>
                    <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
                    <ListItemText>Editar</ListItemText>
                </MenuItem>
                {!menu.local?.inoperantes && (
                    <MenuItem onClick={() => { const l = menu.local; fecharMenu(); handleDefinirInoperantes(l); }}>
                        <ListItemIcon><Flag fontSize="small" color="error" /></ListItemIcon>
                        <ListItemText primary="Definir como local de inoperantes" secondary="Transfere o papel e o conteúdo do atual" />
                    </MenuItem>
                )}
                <MenuItem onClick={() => { setConfirmExcluir(menu.local); fecharMenu(); }} sx={{ color: 'error.main' }}>
                    <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText>Excluir</ListItemText>
                </MenuItem>
            </Menu>

            {/* Confirmar exclusao */}
            <Dialog open={Boolean(confirmExcluir)} onClose={() => setConfirmExcluir(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Excluir local</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Excluir <strong>{confirmExcluir?.nome}</strong>? {(porLocal.get(confirmExcluir?.id) || []).length > 0
                            ? 'Este local ainda tem materiais — mova ou remova antes.'
                            : 'Esta ação não pode ser desfeita.'}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setConfirmExcluir(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
                    <Button onClick={handleExcluir} color="error" variant="contained" disabled={(porLocal.get(confirmExcluir?.id) || []).length > 0} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Excluir</Button>
                </DialogActions>
            </Dialog>

            <Suspense fallback={null}>
                {localDialog.open && (
                    <LocalDialog
                        open={localDialog.open}
                        onClose={() => setLocalDialog({ open: false, local: null })}
                        local={localDialog.local}
                        tipos={tipos}
                        loggedUserId={loggedUserId}
                        loggedUserName={loggedUserName}
                        onSaved={(m) => notificar(m)}
                    />
                )}
                {conteudoAtual && (
                    <LocalConteudoDialog
                        open={Boolean(conteudoAtual)}
                        onClose={() => setConteudoLocal(null)}
                        local={conteudoAtual}
                        alocacoes={porLocal.get(conteudoAtual.id) || []}
                        alocacoesPorMaterial={porMaterial}
                        materials={materials}
                        locais={locais}
                        loggedUserId={loggedUserId}
                        loggedUserName={loggedUserName}
                        onGerenciarMaterial={(m) => setMaterialDialog(m)}
                        onEditarLocal={(l) => setLocalDialog({ open: true, local: l })}
                    />
                )}
                {materialDialog && (
                    <MaterialLocalDialog
                        open={Boolean(materialDialog)}
                        onClose={() => setMaterialDialog(null)}
                        material={materialsById.get(materialDialog.id) || materialDialog}
                        loggedUserId={loggedUserId}
                        loggedUserName={loggedUserName}
                    />
                )}
            </Suspense>

            <Snackbar open={snackbar.open} autoHideDuration={4500} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
            </Snackbar>
        </MenuContext>
    );
}
