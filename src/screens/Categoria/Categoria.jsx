import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Skeleton,
    Snackbar,
    TextField,
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import {
    Add,
    ArrowForwardRounded,
    CategoryOutlined,
    Clear,
    DeleteOutline,
    EditOutlined,
    Inventory2Outlined,
    LabelOffOutlined,
    Search,
    WarningAmberRounded,
    PhotoCameraBackOutlined,
    DriveFileMoveOutlined,
} from '@mui/icons-material';
import MenuContext from '../../contexts/MenuContext';
import PrivateRoute from '../../contexts/PrivateRoute';
import { useCategorias } from '../../contexts/CategoriaContext';
import { useMaterials } from '../../contexts/MaterialContext';
import useCurrentUser from '../../hooks/useCurrentUser';
import { useDebounce } from '../../hooks/useDebounce';
import CategoriaDialog from '../../dialogs/CategoriaDialog';
import { SEM_CATEGORIA, atribuirCategoria, excluirCategoria, materiaisSemCategoria, nomeCategoria, resumirCategorias } from '../../services/categoriaService';
import { normalizeName } from '../../utils/materialSimilarity';

const PAPEIS_EDITAM = new Set(['admin', 'admingeral', 'BensPatrimoniais']);

/**
 * Categorias de material, integradas ao /material:
 *  - cada cartão mostra quantos materiais, unidades e inoperantes a categoria tem e abre a lista filtrada;
 *  - renomear propaga para os materiais; excluir exige mover os materiais para outra categoria;
 *  - materiais sem categoria aparecem num cartão à parte e podem receber uma categoria em lote.
 */
export default function Categoria() {
    const theme = useTheme();
    const navigate = useNavigate();
    const currentUser = useCurrentUser();
    const podeEditar = PAPEIS_EDITAM.has(currentUser.role);
    const user = useMemo(() => ({ userId: currentUser.userId, userName: currentUser.fullName || currentUser.username || '' }), [currentUser.userId, currentUser.fullName, currentUser.username]);

    const { categorias, loading } = useCategorias();
    const { materials } = useMaterials();

    const [busca, setBusca] = useState('');
    const termo = useDebounce(busca, 200);
    const [dialog, setDialog] = useState({ open: false, categoria: null });
    const [excluir, setExcluir] = useState(null); // { categoria, destinoId }
    const [atribuir, setAtribuir] = useState(null); // { destinoId }
    const [busy, setBusy] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const avisar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

    const resumo = useMemo(() => resumirCategorias(categorias, materials), [categorias, materials]);
    const semCategoria = useMemo(() => materiaisSemCategoria(materials, categorias), [materials, categorias]);
    const filtradas = useMemo(() => {
        const t = normalizeName(termo);
        return t ? categorias.filter((c) => normalizeName(nomeCategoria(c)).includes(t)) : categorias;
    }, [categorias, termo]);

    const totais = useMemo(() => ({
        categorias: categorias.length,
        materiais: materials.length,
        semCategoria: semCategoria.length,
        vazias: categorias.filter((c) => (resumo.get(c.id)?.materiais || 0) === 0).length,
    }), [categorias, materials.length, semCategoria.length, resumo]);

    const verMateriais = (c) => navigate(`/material?categoria=${encodeURIComponent(c ? nomeCategoria(c) : SEM_CATEGORIA)}`);

    const confirmarExclusao = async () => {
        if (!excluir) return;
        setBusy(true);
        try {
            const destino = categorias.find((c) => c.id === excluir.destinoId) || null;
            const r = await excluirCategoria(excluir.categoria, { destino, materials }, user);
            avisar(`Categoria ${nomeCategoria(excluir.categoria)} excluída${r.materiais ? ` · ${r.materiais} material(is) movido(s) para ${nomeCategoria(destino)}` : ''}.`);
            setExcluir(null);
        } catch (e) {
            console.error(e);
            avisar(e?.message || 'Não foi possível excluir.', 'error');
        } finally {
            setBusy(false);
        }
    };

    const confirmarAtribuicao = async () => {
        if (!atribuir?.destinoId) return;
        setBusy(true);
        try {
            const destino = categorias.find((c) => c.id === atribuir.destinoId);
            const n = await atribuirCategoria(destino, semCategoria, user);
            avisar(`${n} material(is) agora em ${nomeCategoria(destino)}.`);
            setAtribuir(null);
        } catch (e) {
            console.error(e);
            avisar(e?.message || 'Não foi possível atribuir a categoria.', 'error');
        } finally {
            setBusy(false);
        }
    };

    const dark = theme.palette.mode === 'dark';
    const excluirTemMateriais = excluir ? (resumo.get(excluir.categoria.id)?.materiais || 0) : 0;

    return (
        <PrivateRoute>
            <MenuContext>
                <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
                    {/* Cabeçalho */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2, py: { xs: 0.5, sm: 1 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, minWidth: 0 }}>
                            <Box sx={{ width: 48, height: 48, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.3)}`, flexShrink: 0 }}>
                                <CategoryOutlined />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', fontSize: { xs: '1.15rem', sm: '1.5rem' }, lineHeight: 1.2 }}>Categorias de material</Typography>
                                <Typography variant="body2" color="text.secondary">Organizam o estoque e o filtro da tela de Material · renomear ou excluir aqui atualiza todos os materiais</Typography>
                            </Box>
                        </Box>
                        {podeEditar && (
                            <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({ open: true, categoria: null })} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3, boxShadow: 2, whiteSpace: 'nowrap' }}>
                                Nova categoria
                            </Button>
                        )}
                    </Box>

                    {/* Números */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2.5 }}>
                        {[
                            { n: totais.categorias, rotulo: 'Categorias', icone: <CategoryOutlined />, cor: theme.palette.primary.main },
                            { n: totais.materiais, rotulo: 'Materiais cadastrados', icone: <Inventory2Outlined />, cor: theme.palette.info.main },
                            { n: totais.semCategoria, rotulo: 'Sem categoria', icone: <LabelOffOutlined />, cor: totais.semCategoria ? theme.palette.warning.main : theme.palette.success.main, onClick: totais.semCategoria ? () => verMateriais(null) : undefined },
                            { n: totais.vazias, rotulo: 'Categorias vazias', icone: <WarningAmberRounded />, cor: totais.vazias ? theme.palette.warning.main : theme.palette.success.main },
                        ].map((t) => (
                            <Paper key={t.rotulo} elevation={0} onClick={t.onClick} sx={{ p: 1.5, borderRadius: 2.5, display: 'flex', alignItems: 'center', gap: 1.25, border: `1px solid ${alpha(t.cor, 0.25)}`, background: `linear-gradient(135deg, ${alpha(t.cor, 0.1)} 0%, ${alpha(t.cor, 0.02)} 100%)`, cursor: t.onClick ? 'pointer' : 'default' }}>
                                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(t.cor, 0.14), color: t.cor, display: 'flex' }}>{t.icone}</Box>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, color: t.cor }}>{loading ? '…' : t.n}</Typography>
                                    <Typography variant="caption" color="text.secondary">{t.rotulo}</Typography>
                                </Box>
                            </Paper>
                        ))}
                    </Box>

                    {/* Materiais sem categoria */}
                    {semCategoria.length > 0 && (
                        <Alert
                            severity="warning"
                            icon={<LabelOffOutlined />}
                            sx={{ mb: 2.5, borderRadius: 2.5, alignItems: 'center' }}
                            action={
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button size="small" color="inherit" onClick={() => verMateriais(null)} sx={{ textTransform: 'none', fontWeight: 700 }}>Ver</Button>
                                    {podeEditar && <Button size="small" variant="contained" color="warning" startIcon={<DriveFileMoveOutlined />} onClick={() => setAtribuir({ destinoId: '' })} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Atribuir categoria</Button>}
                                </Box>
                            }
                        >
                            <strong>{semCategoria.length} material(is) sem categoria</strong> ou com uma categoria que não existe mais. Eles não aparecem no filtro por categoria da tela de Material.
                        </Alert>
                    )}

                    {/* Busca */}
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Buscar categoria…"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        slotProps={{ input: {
                            startAdornment: <InputAdornment position="start"><Search color="action" /></InputAdornment>,
                            endAdornment: busca ? <InputAdornment position="end"><IconButton size="small" onClick={() => setBusca('')} aria-label="Limpar"><Clear fontSize="small" /></IconButton></InputAdornment> : null,
                        } }}
                        sx={{ mb: 2, maxWidth: 480, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
                    />

                    {/* Cartões */}
                    {loading ? (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                            {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={150} sx={{ borderRadius: 3 }} />)}
                        </Box>
                    ) : filtradas.length === 0 ? (
                        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 3, border: `1px dashed ${alpha(theme.palette.text.secondary, 0.35)}` }}>
                            <CategoryOutlined sx={{ fontSize: 40, color: 'text.disabled' }} />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{categorias.length === 0 ? 'Nenhuma categoria cadastrada ainda.' : `Nada encontrado para "${termo}".`}</Typography>
                        </Paper>
                    ) : (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                            {filtradas.map((c) => {
                                const r = resumo.get(c.id) || { materiais: 0, unidades: 0, inoperantes: 0, semFoto: 0 };
                                const vazia = r.materiais === 0;
                                const cor = vazia ? theme.palette.text.secondary : theme.palette.primary.main;
                                return (
                                    <Paper
                                        key={c.id}
                                        elevation={0}
                                        sx={{ p: 2, borderRadius: 3, border: `1px solid ${alpha(cor, 0.25)}`, display: 'flex', flexDirection: 'column', gap: 1.25, transition: 'transform .15s, box-shadow .15s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}` } }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                                            <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(cor, 0.12), color: cor, flexShrink: 0 }}><CategoryOutlined /></Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, textTransform: 'uppercase', wordBreak: 'break-word' }}>{nomeCategoria(c)}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {vazia ? 'Nenhum material usa esta categoria' : `${r.materiais} ${r.materiais === 1 ? 'material' : 'materiais'} · ${r.unidades} unidade(s)`}
                                                </Typography>
                                            </Box>
                                            {podeEditar && (
                                                <Box sx={{ display: 'flex', flexShrink: 0 }}>
                                                    <Tooltip title="Renomear"><IconButton size="small" onClick={() => setDialog({ open: true, categoria: c })} aria-label="Renomear"><EditOutlined fontSize="small" /></IconButton></Tooltip>
                                                    <Tooltip title={vazia ? 'Excluir' : 'Excluir e mover os materiais'}><IconButton size="small" color="error" onClick={() => setExcluir({ categoria: c, destinoId: '' })} aria-label="Excluir"><DeleteOutline fontSize="small" /></IconButton></Tooltip>
                                                </Box>
                                            )}
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
                                            {r.inoperantes > 0 && <Chip size="small" icon={<WarningAmberRounded sx={{ fontSize: '14px !important' }} />} label={`${r.inoperantes} inoperante(s)`} color="warning" variant="outlined" sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700 }} />}
                                            {r.semFoto > 0 && <Chip size="small" icon={<PhotoCameraBackOutlined sx={{ fontSize: '14px !important' }} />} label={`${r.semFoto} sem foto`} variant="outlined" sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }} />}
                                            {vazia && <Chip size="small" label="vazia" sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700, bgcolor: alpha(theme.palette.warning.main, dark ? 0.2 : 0.12), color: dark ? '#fde68a' : '#b45309' }} />}
                                        </Box>
                                        <Button size="small" endIcon={<ArrowForwardRounded />} onClick={() => verMateriais(c)} disabled={vazia} sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700, borderRadius: 2, mt: 'auto' }}>
                                            Ver materiais
                                        </Button>
                                    </Paper>
                                );
                            })}
                        </Box>
                    )}
                </Box>

                {dialog.open && (
                    <CategoriaDialog open onClose={() => setDialog({ open: false, categoria: null })} categoria={dialog.categoria} categorias={categorias} materials={materials} user={user} onSaved={(msg) => avisar(msg)} />
                )}

                {/* Excluir (com destino dos materiais) */}
                <Dialog open={Boolean(excluir)} onClose={busy ? undefined : () => setExcluir(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                    <DialogTitle sx={{ fontWeight: 700 }}>Excluir categoria?</DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">
                            <strong>{excluir ? nomeCategoria(excluir.categoria) : ''}</strong>
                            {excluirTemMateriais ? ` tem ${excluirTemMateriais} material(is). Escolha para onde eles vão; nada fica sem categoria.` : ' não tem materiais e será removida.'}
                        </Typography>
                        {excluirTemMateriais > 0 && (
                            <TextField select size="small" label="Mover materiais para" value={excluir?.destinoId || ''} onChange={(e) => setExcluir((x) => ({ ...x, destinoId: e.target.value }))} fullWidth>
                                {categorias.filter((c) => c.id !== excluir?.categoria.id).map((c) => <MenuItem key={c.id} value={c.id}>{nomeCategoria(c)}</MenuItem>)}
                            </TextField>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={() => setExcluir(null)} disabled={busy} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
                        <Button variant="contained" color="error" onClick={confirmarExclusao} disabled={busy || (excluirTemMateriais > 0 && !excluir?.destinoId)} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                            {excluirTemMateriais ? 'Mover e excluir' : 'Excluir'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Atribuir categoria aos sem categoria */}
                <Dialog open={Boolean(atribuir)} onClose={busy ? undefined : () => setAtribuir(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                    <DialogTitle sx={{ fontWeight: 700 }}>Atribuir categoria</DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">Os {semCategoria.length} materiais sem categoria passam para a categoria escolhida. Depois dá para ajustar um a um na tela de Material.</Typography>
                        <TextField select size="small" label="Categoria" value={atribuir?.destinoId || ''} onChange={(e) => setAtribuir({ destinoId: e.target.value })} fullWidth>
                            {categorias.map((c) => <MenuItem key={c.id} value={c.id}>{nomeCategoria(c)}</MenuItem>)}
                        </TextField>
                        <Box sx={{ maxHeight: 160, overflowY: 'auto', display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {semCategoria.slice(0, 40).map((m) => <Chip key={m.id} label={m.description} size="small" sx={{ fontSize: '0.68rem' }} />)}
                            {semCategoria.length > 40 && <Chip label={`+${semCategoria.length - 40}`} size="small" />}
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={() => setAtribuir(null)} disabled={busy} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
                        <Button variant="contained" onClick={confirmarAtribuicao} disabled={busy || !atribuir?.destinoId} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Atribuir</Button>
                    </DialogActions>
                </Dialog>

                <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
                </Snackbar>
            </MenuContext>
        </PrivateRoute>
    );
}
