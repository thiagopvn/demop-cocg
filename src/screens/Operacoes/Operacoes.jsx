import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Menu,
    MenuItem,
    Paper,
    Skeleton,
    Snackbar,
    TextField,
    Tooltip,
    Typography,
    alpha,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    Add,
    Clear,
    CloudDownloadOutlined,
    InfoOutlined,
    MoreVert,
    Search,
    ShieldOutlined,
    WarningAmberRounded,
} from '@mui/icons-material';
import MenuContext from '../../contexts/MenuContext';
import PrivateRoute from '../../contexts/PrivateRoute';
import useCurrentUser from '../../hooks/useCurrentUser';
import { useDebounce } from '../../hooks/useDebounce';
import { useMaterials } from '../../contexts/MaterialContext';
import { useAlocacoesLocais } from '../../hooks/useLocais';
import { useMateriaisEmViatura, useOperacoes } from '../../hooks/useOperacoes';
import { CATEGORIAS_OPERACAO, combinaBusca, contarItens, excluirOperacao, resumirOperacao, salvarSecoes, semearOperacoes, textoBusca } from '../../services/operacoesService';
import { SOBRE_LEVANTAMENTO } from '../../data/operacoesCbmerj';
import OperacaoIcone from '../../components/operacoes/OperacaoIcone';
import BuscaPorFoto from '../../components/BuscaPorFoto';
import OperacaoDetalhe from './OperacaoDetalhe';

const OperacaoDialog = lazy(() => import('../../dialogs/OperacaoDialog'));
const OperacaoMaterialDialog = lazy(() => import('../../dialogs/OperacaoMaterialDialog'));

/** Cartão de uma operação na lista lateral. */
function OperacaoListaItem({ op, selecionada, resumo, onClick }) {
    const theme = useTheme();
    const cor = op.cor || theme.palette.primary.main;
    const dark = theme.palette.mode === 'dark';
    return (
        <Paper
            elevation={0}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
            sx={{
                display: 'flex',
                gap: 1.25,
                alignItems: 'center',
                p: 1.25,
                borderRadius: 2.5,
                cursor: 'pointer',
                border: '2px solid',
                borderColor: selecionada ? cor : alpha(theme.palette.divider, 1),
                bgcolor: selecionada ? alpha(cor, dark ? 0.18 : 0.07) : 'background.paper',
                transition: 'all .18s',
                '&:hover': { borderColor: alpha(cor, 0.6), transform: 'translateX(2px)' },
                '&:focus-visible': { outline: `3px solid ${alpha(cor, 0.4)}`, outlineOffset: 1 },
            }}
        >
            <OperacaoIcone icone={op.icone} cor={cor} tamanho={40} variante={selecionada ? 'solida' : 'suave'} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>{op.nome}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {op.nota || op.subtitulo || '—'}{op.nota && op.subtitulo ? ` · ${op.subtitulo}` : ''}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    {resumo.total > 0 && <Chip size="small" label={`${resumo.total} materiais`} sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha(cor, 0.12), color: dark ? '#fff' : cor }} />}
                    {(op.links || []).length > 0 && <Chip size="small" label={`${op.links.length} ${op.links.length === 1 ? 'link' : 'links'}`} sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }} />}
                    {resumo.abaixo > 0 && (
                        <Chip size="small" icon={<WarningAmberRounded sx={{ fontSize: '12px !important' }} />} label={resumo.abaixo} color="warning" variant="outlined" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, '& .MuiChip-label': { px: 0.6 } }} />
                    )}
                </Box>
            </Box>
        </Paper>
    );
}

/**
 * Materiais das Operações do CBMERJ — o que cada nota prevê por GRD/viatura/PC,
 * links do Drive e onde cada material está no DEMOP (em tempo real).
 * admin/BensPatrimoniais só consultam; admingeral cadastra, edita e exclui.
 */
export default function Operacoes() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const { id: idSelecionado } = useParams();
    const currentUser = useCurrentUser();
    const podeEditar = currentUser.role === 'admingeral';
    const user = useMemo(() => ({ userId: currentUser.userId, userName: currentUser.fullName || currentUser.username || '' }), [currentUser.userId, currentUser.fullName, currentUser.username]);

    const { operacoes, porId, loading } = useOperacoes({ semearSe: podeEditar, user });
    const { materials } = useMaterials();
    const { porMaterial: alocacoesPorMaterial } = useAlocacoesLocais();
    const { porMaterial: viaturaPorMaterial } = useMateriaisEmViatura();
    const materialsById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);

    const [busca, setBusca] = useState('');
    const termo = useDebounce(busca, 250);
    const [sobreAberto, setSobreAberto] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [opDialog, setOpDialog] = useState({ open: false, operacao: null });
    const [itemDialog, setItemDialog] = useState({ open: false, item: null, secaoId: null });
    const [secaoDialog, setSecaoDialog] = useState({ open: false, secao: null, titulo: '', referencia: '' });
    const [confirmar, setConfirmar] = useState(null);
    const [ocupado, setOcupado] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const avisar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

    const resumos = useMemo(() => new Map(operacoes.map((o) => [o.id, resumirOperacao(o, materialsById)])), [operacoes, materialsById]);
    const textos = useMemo(() => new Map(operacoes.map((o) => [o.id, textoBusca(o)])), [operacoes]);
    const filtradas = useMemo(() => operacoes.filter((o) => combinaBusca(textos.get(o.id) || '', termo)), [operacoes, textos, termo]);

    const selecionada = idSelecionado ? porId.get(idSelecionado) : null;

    // Sem seleção no desktop: abre a primeira da lista filtrada (sem trocar a URL).
    const exibida = selecionada || (!isMobile ? filtradas[0] : null);

    // Se a operação da URL sumiu (excluída), volta para a lista.
    useEffect(() => {
        if (!loading && idSelecionado && !porId.has(idSelecionado)) navigate('/operacoes', { replace: true });
    }, [loading, idSelecionado, porId, navigate]);

    const selecionar = (op) => navigate(op ? `/operacoes/${op.id}` : '/operacoes');

    /* ---------------- ações do admingeral ---------------- */
    const pedirExclusaoOperacao = (op) => setConfirmar({
        titulo: 'Excluir operação?',
        texto: `"${op.nome}" e seus ${contarItens(op)} materiais previstos serão removidos. Os materiais do estoque não são afetados.`,
        onConfirm: async () => { await excluirOperacao(op, user); avisar('Operação excluída.'); navigate('/operacoes', { replace: true }); },
    });

    const pedirExclusaoItem = (op, item) => setConfirmar({
        titulo: 'Remover material da operação?',
        texto: `"${item.nome}" deixa de constar em ${op.nome}. O cadastro do material no estoque continua igual.`,
        onConfirm: async () => {
            const secoes = op.secoes.map((s) => ({ ...s, itens: (s.itens || []).filter((i) => i.id !== item.id) }));
            await salvarSecoes(op, secoes, user, { acao: 'remover_item', item: item.nome });
            avisar('Material removido da operação.');
        },
    });

    const pedirExclusaoSecao = (op, secao) => setConfirmar({
        titulo: 'Excluir seção?',
        texto: `"${secao.titulo}" e seus ${(secao.itens || []).length} itens deixam de constar em ${op.nome}.`,
        onConfirm: async () => {
            await salvarSecoes(op, op.secoes.filter((s) => s.id !== secao.id), user, { acao: 'remover_secao', secao: secao.titulo });
            avisar('Seção excluída.');
        },
    });

    const vincular = async (op, item, material) => {
        if (!material) { setItemDialog({ open: true, item, secaoId: item.secaoId }); return; }
        try {
            const secoes = op.secoes.map((s) => ({ ...s, itens: (s.itens || []).map((i) => (i.id === item.id ? { ...i, material_id: material.id } : i)) }));
            await salvarSecoes(op, secoes, user, { acao: 'vincular_material', item: item.nome, material_id: material.id, material: material.description });
            avisar(`"${item.nome}" vinculado a ${material.description}.`);
        } catch (e) {
            console.error(e);
            avisar(e?.message || 'Não foi possível vincular o material.', 'error');
        }
    };

    const salvarSecao = async () => {
        const op = exibida;
        if (!op || !secaoDialog.titulo.trim()) return;
        setOcupado(true);
        try {
            const secoes = secaoDialog.secao
                ? op.secoes.map((s) => (s.id === secaoDialog.secao.id ? { ...s, titulo: secaoDialog.titulo, referencia: secaoDialog.referencia } : s))
                : [...(op.secoes || []), { titulo: secaoDialog.titulo, referencia: secaoDialog.referencia, itens: [] }];
            await salvarSecoes(op, secoes, user, { acao: secaoDialog.secao ? 'editar_secao' : 'nova_secao', secao: secaoDialog.titulo });
            avisar(secaoDialog.secao ? 'Seção atualizada.' : 'Seção criada.');
            setSecaoDialog({ open: false, secao: null, titulo: '', referencia: '' });
        } catch (e) {
            console.error(e);
            avisar(e?.message || 'Não foi possível salvar a seção.', 'error');
        } finally {
            setOcupado(false);
        }
    };

    const restaurarPadrao = async () => {
        setMenuAnchor(null);
        setOcupado(true);
        try {
            const n = await semearOperacoes(user, { existentes: operacoes });
            avisar(n ? `${n} operação(ões) do levantamento carregada(s).` : 'Todas as operações do levantamento já estão cadastradas.', n ? 'success' : 'info');
        } catch (e) {
            console.error(e);
            avisar(e?.message || 'Não foi possível carregar as operações padrão.', 'error');
        } finally {
            setOcupado(false);
        }
    };

    const confirmarAcao = async () => {
        if (!confirmar) return;
        setOcupado(true);
        try {
            await confirmar.onConfirm();
            setConfirmar(null);
        } catch (e) {
            console.error(e);
            avisar(e?.message || 'Não foi possível concluir.', 'error');
        } finally {
            setOcupado(false);
        }
    };

    /* ---------------- render ---------------- */
    const mostrarLista = !isMobile || !selecionada;
    const mostrarDetalhe = exibida && (!isMobile || selecionada);

    const grupos = CATEGORIAS_OPERACAO.map((c) => ({ ...c, itens: filtradas.filter((o) => o.categoria === c.key) })).filter((g) => g.itens.length > 0);

    return (
        <PrivateRoute allowedRoles={['admin', 'admingeral', 'BensPatrimoniais']}>
            <MenuContext>
                <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
                    {/* Cabeçalho */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2, py: { xs: 1, sm: 2 } }}>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', fontSize: { xs: '1.15rem', sm: '1.5rem' }, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ShieldOutlined /> Materiais das Operações do CBMERJ
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Material previsto por nota, links do Drive e onde cada item está no DEMOP · quantidades fixadas pela nota
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Tooltip title="Sobre o levantamento">
                                <IconButton onClick={() => setSobreAberto((v) => !v)} color={sobreAberto ? 'primary' : 'default'} aria-label="Sobre o levantamento"><InfoOutlined /></IconButton>
                            </Tooltip>
                            {podeEditar && (
                                <>
                                    <Button variant="contained" startIcon={<Add />} onClick={() => setOpDialog({ open: true, operacao: null })} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3, boxShadow: 2, '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
                                        Nova operação
                                    </Button>
                                    <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Mais opções"><MoreVert /></IconButton>
                                    <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                                        <MenuItem onClick={restaurarPadrao} disabled={ocupado}>
                                            <CloudDownloadOutlined fontSize="small" sx={{ mr: 1.25 }} /> Carregar operações do levantamento que faltam
                                        </MenuItem>
                                    </Menu>
                                </>
                            )}
                        </Box>
                    </Box>

                    <Collapse in={sobreAberto}>
                        <Alert severity="info" icon={<InfoOutlined />} onClose={() => setSobreAberto(false)} sx={{ mb: 2, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Sobre o levantamento</Typography>
                            <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
                                {SOBRE_LEVANTAMENTO.map((t, i) => <Typography key={i} component="li" variant="body2" sx={{ mb: 0.4 }}>{t}</Typography>)}
                                <Typography component="li" variant="body2">
                                    A localização de cada material vem do estoque do DEMOP (Locais e Viaturas) e muda sozinha quando o material é guardado em outro local ou embarcado. A quantidade prevista não muda com o estoque.
                                </Typography>
                            </Box>
                        </Alert>
                    </Collapse>

                    {/* Busca */}
                    <TextField
                        fullWidth
                        size="medium"
                        placeholder="Buscar operação, nota, boletim ou material… (ex.: Pluvian, rádio, tesourão)"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: <InputAdornment position="start"><Search color="action" /></InputAdornment>,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        {busca && <IconButton size="small" onClick={() => setBusca('')} aria-label="Limpar busca"><Clear fontSize="small" /></IconButton>}
                                        <BuscaPorFoto onTermo={(termo) => setBusca(termo)} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                        sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
                    />

                    {/* Lista + detalhe */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 340px) 1fr' }, gap: { xs: 2, md: 3 }, alignItems: 'start' }}>
                        {mostrarLista && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, position: { md: 'sticky' }, top: { md: 88 }, maxHeight: { md: 'calc(100dvh - 120px)' }, overflowY: { md: 'auto' }, pr: { md: 0.5 } }}>
                                {loading ? (
                                    [1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 2.5 }} />)
                                ) : filtradas.length === 0 ? (
                                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, textAlign: 'center', border: `1px dashed ${alpha(theme.palette.text.secondary, 0.35)}` }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {operacoes.length === 0
                                                ? (podeEditar ? 'Carregando as operações do levantamento…' : 'Nenhuma operação cadastrada ainda. Peça ao admingeral para abrir este painel.')
                                                : `Nada encontrado para "${termo}".`}
                                        </Typography>
                                    </Paper>
                                ) : grupos.map((g) => (
                                    <Box key={g.key}>
                                        <Typography variant="overline" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1, color: 'text.secondary', mb: 0.75, pl: 0.5 }}>
                                            {g.label} <Typography component="span" variant="caption" sx={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· {g.descricao}</Typography>
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {g.itens.map((op) => (
                                                <OperacaoListaItem key={op.id} op={op} selecionada={exibida?.id === op.id} resumo={resumos.get(op.id)} onClick={() => selecionar(op)} />
                                            ))}
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        )}

                        {mostrarDetalhe ? (
                            <OperacaoDetalhe
                                operacao={exibida}
                                materials={materials}
                                materialsById={materialsById}
                                alocacoesPorMaterial={alocacoesPorMaterial}
                                viaturaPorMaterial={viaturaPorMaterial}
                                podeEditar={podeEditar}
                                termoBusca={termo}
                                onVoltar={isMobile ? () => selecionar(null) : undefined}
                                onEditar={(op) => setOpDialog({ open: true, operacao: op })}
                                onExcluir={pedirExclusaoOperacao}
                                onNovoItem={(secaoId) => setItemDialog({ open: true, item: null, secaoId })}
                                onEditarItem={(item) => setItemDialog({ open: true, item, secaoId: item.secaoId })}
                                onExcluirItem={(item) => pedirExclusaoItem(exibida, item)}
                                onVincular={(item, material) => vincular(exibida, item, material)}
                                onEditarSecao={(secao) => setSecaoDialog({ open: true, secao, titulo: secao.titulo, referencia: secao.referencia || '' })}
                                onExcluirSecao={(secao) => pedirExclusaoSecao(exibida, secao)}
                            />
                        ) : !isMobile && !loading ? (
                            <Paper elevation={0} sx={{ borderRadius: 3, border: `1px dashed ${alpha(theme.palette.text.secondary, 0.35)}`, p: 4, textAlign: 'center' }}>
                                <ShieldOutlined sx={{ fontSize: 44, color: 'text.disabled' }} />
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Selecione uma operação para ver o material previsto e onde ele está no DEMOP.</Typography>
                            </Paper>
                        ) : null}
                    </Box>
                </Box>

                {/* Diálogos (só chegam a montar para admingeral) */}
                <Suspense fallback={null}>
                    {opDialog.open && (
                        <OperacaoDialog
                            open
                            onClose={() => setOpDialog({ open: false, operacao: null })}
                            operacao={opDialog.operacao}
                            user={user}
                            onSaved={(msg, id) => { avisar(msg); if (id && !opDialog.operacao) navigate(`/operacoes/${id}`); }}
                        />
                    )}
                    {itemDialog.open && exibida && (
                        <OperacaoMaterialDialog
                            open
                            onClose={() => setItemDialog({ open: false, item: null, secaoId: null })}
                            operacao={exibida}
                            item={itemDialog.item}
                            secaoId={itemDialog.secaoId}
                            materials={materials}
                            user={user}
                            onSaved={avisar}
                        />
                    )}
                </Suspense>

                {/* Seção: título / referência */}
                <Dialog open={secaoDialog.open} onClose={ocupado ? undefined : () => setSecaoDialog({ open: false, secao: null, titulo: '', referencia: '' })} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                    <DialogTitle sx={{ fontWeight: 700 }}>{secaoDialog.secao ? 'Editar seção' : 'Nova seção de material'}</DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: '8px !important' }}>
                        <TextField size="small" label="Título" placeholder="Ex.: Material por GRD" value={secaoDialog.titulo} onChange={(e) => setSecaoDialog((s) => ({ ...s, titulo: e.target.value }))} autoFocus />
                        <TextField size="small" label="Referência na nota" placeholder="Ex.: item 5.4.3" value={secaoDialog.referencia} onChange={(e) => setSecaoDialog((s) => ({ ...s, referencia: e.target.value }))} />
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={() => setSecaoDialog({ open: false, secao: null, titulo: '', referencia: '' })} disabled={ocupado} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
                        <Button variant="contained" onClick={salvarSecao} disabled={ocupado || !secaoDialog.titulo.trim()} startIcon={ocupado ? <CircularProgress size={16} color="inherit" /> : null} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Salvar</Button>
                    </DialogActions>
                </Dialog>

                {/* Confirmação */}
                <Dialog open={Boolean(confirmar)} onClose={ocupado ? undefined : () => setConfirmar(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                    <DialogTitle sx={{ fontWeight: 700 }}>{confirmar?.titulo}</DialogTitle>
                    <DialogContent><Typography variant="body2" color="text.secondary">{confirmar?.texto}</Typography></DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={() => setConfirmar(null)} disabled={ocupado} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
                        <Button variant="contained" color="error" onClick={confirmarAcao} disabled={ocupado} startIcon={ocupado ? <CircularProgress size={16} color="inherit" /> : null} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                            Confirmar
                        </Button>
                    </DialogActions>
                </Dialog>

                <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
                </Snackbar>
            </MenuContext>
        </PrivateRoute>
    );
}
