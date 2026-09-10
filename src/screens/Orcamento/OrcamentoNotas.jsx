import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    alpha,
    styled,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { Add, Category, Clear, Delete, Edit, FileDownload, FilterAltOff, PictureAsPdf, Search, StickyNote2Outlined } from '@mui/icons-material';
import { useDebounce } from '../../hooks/useDebounce';
import { CampoCaixaAlta } from '../../components/orcamento/CamposOrcamento';
import PagamentoChip from '../../components/orcamento/PagamentoChip';
import { MESES, anosDisponiveis, caixaAlta, estaPaga, filtrarNotas, fmtData, fmtMoeda, resumoPendentes, somenteDigitos } from '../../services/orcamentoService';
import { exportToExcel } from '../../firebase/xlsx';
import { exportarNotasPdf } from '../../utils/orcamentoPdf';

const HeaderCell = styled(TableCell)(({ theme }) => ({
    color: 'white',
    fontWeight: 700,
    fontSize: '0.78rem',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    borderBottom: 'none',
    [theme.breakpoints.down('md')]: { fontSize: '0.72rem' },
}));

const FILTRO_VAZIO = { ano: 'todos', mes: 'todos', militarNome: '', militarRg: '', setor: 'todos', pagamento: 'todos', busca: '' };

/**
 * Tabela de consulta das notas fiscais (CRUD) com filtros por ano, mês, nome de guerra,
 * RG, setor e busca livre (CNPJ, empresa, objeto, observações).
 */
export default function OrcamentoNotas({ notas, setores, sugestoesMilitares, loading, onNova, onNovoSetor, onEditar, onExcluir, onAlterarPagamento, alterandoPagamento, onAviso, emitidoPor = '' }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [filtro, setFiltro] = useState(FILTRO_VAZIO);
    const buscaDebounced = useDebounce(filtro.busca, 300);
    const nomeDebounced = useDebounce(filtro.militarNome, 300);
    const rgDebounced = useDebounce(filtro.militarRg, 300);
    const [pagina, setPagina] = useState(0);
    const [porPagina, setPorPagina] = useState(25);
    const [exportando, setExportando] = useState(null); // 'excel' | 'pdf'

    const anos = useMemo(() => anosDisponiveis(notas), [notas]);
    const nomesSetor = useMemo(() => {
        const s = new Set(setores.map((x) => x.nome));
        notas.forEach((n) => { if (n.setor) s.add(n.setor); });
        return [...s];
    }, [setores, notas]);

    const filtradas = useMemo(
        () => filtrarNotas(notas, { ...filtro, busca: buscaDebounced, militarNome: nomeDebounced, militarRg: rgDebounced }),
        [notas, filtro, buscaDebounced, nomeDebounced, rgDebounced],
    );
    const total = useMemo(() => filtradas.reduce((s, n) => s + (Number(n.valor) || 0), 0), [filtradas]);
    const pendentes = useMemo(() => resumoPendentes(filtradas), [filtradas]);
    useEffect(() => { setPagina(0); }, [filtradas.length]);

    const set = (campo) => (v) => setFiltro((f) => ({ ...f, [campo]: v }));
    const temFiltro = JSON.stringify(filtro) !== JSON.stringify(FILTRO_VAZIO);
    const pagina_ = filtradas.slice(pagina * porPagina, pagina * porPagina + porPagina);

    const exportar = async () => {
        if (filtradas.length === 0) return;
        setExportando('excel');
        try {
            const linhas = filtradas.map((n) => ({
                data: fmtData(n.data),
                cnpj: n.cnpjFormatado,
                empresa: n.empresa || '',
                objeto: n.objeto || '',
                setor: n.setor || '',
                pagamento: estaPaga(n) ? 'PAGO' : 'NÃO PAGO',
                pagoEm: estaPaga(n) && n.pagoEm ? fmtData(n.pagoEm) : '',
                militar: n.militarNome || '',
                rg: n.militarRg || '',
                valor: Number(n.valor) || 0,
                numeroNota: n.numeroNota || '',
                observacoes: n.observacoes || '',
            }));
            await exportToExcel(linhas, 'notas_fiscais_gocg', 'Notas fiscais', {
                data: 'Data', cnpj: 'CNPJ', empresa: 'Empresa', objeto: 'Objeto', setor: 'Setor', pagamento: 'Pagamento', pagoEm: 'Pago em', militar: 'Militar', rg: 'RG', valor: 'Valor (R$)', numeroNota: 'Nº da nota', observacoes: 'Observações',
            });
            onAviso?.(`${linhas.length} nota(s) exportada(s).`);
        } catch (e) {
            console.error(e);
            onAviso?.('Não foi possível exportar.', 'error');
        } finally {
            setExportando(null);
        }
    };

    const exportarPdf = async () => {
        if (filtradas.length === 0) return;
        setExportando('pdf');
        try {
            const filtroAtual = { ...filtro, busca: buscaDebounced, militarNome: nomeDebounced, militarRg: rgDebounced };
            await exportarNotasPdf(filtradas, filtroAtual, { emitidoPor });
            onAviso?.(`PDF com ${filtradas.length} nota(s) gerado.`);
        } catch (e) {
            console.error(e);
            onAviso?.('Não foi possível gerar o PDF.', 'error');
        } finally {
            setExportando(null);
        }
    };

    return (
        <Box>
            {/* Filtros */}
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        size="small"
                        placeholder="CNPJ, empresa, objeto, observação…"
                        value={filtro.busca}
                        onChange={(e) => set('busca')(caixaAlta(e.target.value))}
                        slotProps={{
                            input: {
                                startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                                endAdornment: filtro.busca ? <InputAdornment position="end"><IconButton size="small" onClick={() => set('busca')('')} aria-label="Limpar busca"><Clear fontSize="small" /></IconButton></InputAdornment> : null,
                            },
                        }}
                        sx={{ flex: 2, minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <FormControl size="small" sx={{ minWidth: 110 }}>
                        <InputLabel id="notas-ano">Ano</InputLabel>
                        <Select labelId="notas-ano" label="Ano" value={filtro.ano} onChange={(e) => set('ano')(e.target.value)} sx={{ borderRadius: 2 }}>
                            <MenuItem value="todos">Todos</MenuItem>
                            {anos.map((a) => <MenuItem key={a} value={String(a)}>{a}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel id="notas-mes">Mês</InputLabel>
                        <Select labelId="notas-mes" label="Mês" value={filtro.mes} onChange={(e) => set('mes')(e.target.value)} sx={{ borderRadius: 2 }}>
                            <MenuItem value="todos">Todos</MenuItem>
                            {MESES.map((m, i) => <MenuItem key={m} value={String(i + 1)}>{m}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel id="notas-setor">Setor</InputLabel>
                        <Select labelId="notas-setor" label="Setor" value={filtro.setor} onChange={(e) => set('setor')(e.target.value)} sx={{ borderRadius: 2 }}>
                            <MenuItem value="todos">Todos</MenuItem>
                            {nomesSetor.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel id="notas-pagamento">Pagamento</InputLabel>
                        <Select labelId="notas-pagamento" label="Pagamento" value={filtro.pagamento} onChange={(e) => set('pagamento')(e.target.value)} sx={{ borderRadius: 2 }}>
                            <MenuItem value="todos">Todas</MenuItem>
                            <MenuItem value="pagas">Pagas</MenuItem>
                            <MenuItem value="pendentes">Não pagas</MenuItem>
                        </Select>
                    </FormControl>
                    <CampoCaixaAlta
                        label="Nome de guerra"
                        value={filtro.militarNome}
                        onChange={set('militarNome')}
                        sx={{ minWidth: 160, flex: 1 }}
                        slotProps={{ htmlInput: { list: 'notas-sugestoes-militar', style: { textTransform: 'uppercase' } } }}
                    />
                    <datalist id="notas-sugestoes-militar">
                        {sugestoesMilitares.slice(0, 300).map((m) => <option key={`${m.nomeGuerra}|${m.rg}`} value={m.nomeGuerra} />)}
                    </datalist>
                    <TextField
                        size="small"
                        label="RG"
                        value={filtro.militarRg}
                        onChange={(e) => set('militarRg')(somenteDigitos(e.target.value))}
                        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                        sx={{ width: 120, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    {temFiltro && (
                        <Tooltip title="Limpar filtros">
                            <IconButton onClick={() => setFiltro(FILTRO_VAZIO)} aria-label="Limpar filtros"><FilterAltOff /></IconButton>
                        </Tooltip>
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                        {loading ? 'Carregando…' : (
                            <>
                                {filtradas.length} nota(s) · total <b style={{ color: theme.palette.text.primary }}>{fmtMoeda(total)}</b>
                                {pendentes.qtd > 0 && <> · <b style={{ color: theme.palette.warning.main }}>{pendentes.qtd} não paga(s) · {fmtMoeda(pendentes.valor)}</b></>}
                            </>
                        )}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button size="small" variant="outlined" startIcon={<Category />} onClick={onNovoSetor} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                            Novo setor
                        </Button>
                        <Button size="small" variant="outlined" startIcon={exportando === 'excel' ? <CircularProgress size={14} /> : <FileDownload />} onClick={exportar} disabled={Boolean(exportando) || filtradas.length === 0} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                            Excel
                        </Button>
                        <Button size="small" variant="outlined" startIcon={exportando === 'pdf' ? <CircularProgress size={14} /> : <PictureAsPdf />} onClick={exportarPdf} disabled={Boolean(exportando) || filtradas.length === 0} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                            PDF
                        </Button>
                        <Button size="small" variant="contained" startIcon={<Add />} onClick={onNova} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                            Lançar nota
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Tabela */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 'calc(100vh - 380px)', minHeight: 240 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow sx={{ '& th': { bgcolor: 'primary.main' } }}>
                                <HeaderCell>Data</HeaderCell>
                                <HeaderCell>Fornecedor</HeaderCell>
                                {!isMobile && <HeaderCell>Objeto</HeaderCell>}
                                <HeaderCell>Setor</HeaderCell>
                                <HeaderCell>Militar</HeaderCell>
                                <HeaderCell align="right">Valor</HeaderCell>
                                <HeaderCell align="center">Ações</HeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {!loading && pagina_.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                                        {notas.length === 0 ? 'Nenhuma nota fiscal lançada ainda.' : 'Nenhuma nota bate com os filtros.'}
                                    </TableCell>
                                </TableRow>
                            )}
                            {pagina_.map((n) => (
                                <TableRow key={n.id} hover sx={{ '&:nth-of-type(even)': { bgcolor: alpha(theme.palette.text.primary, 0.02) } }}>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtData(n.data)}</TableCell>
                                    <TableCell sx={{ maxWidth: 240 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap title={n.empresa}>{n.empresa || '—'}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{n.cnpjFormatado}{n.numeroNota ? ` · NF ${n.numeroNota}` : ''}</Typography>
                                    </TableCell>
                                    {!isMobile && (
                                        <TableCell sx={{ maxWidth: 260 }}>
                                            <Typography variant="body2" noWrap title={n.objeto}>{n.objeto || '—'}</Typography>
                                        </TableCell>
                                    )}
                                    <TableCell>{n.setor ? <Chip label={n.setor} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }} /> : <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{n.militarNome || '—'}</Typography>
                                        {n.militarRg && <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>RG {n.militarRg}</Typography>}
                                    </TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 800 }}>{fmtMoeda(n.valor)}</TableCell>
                                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                        <PagamentoChip pago={estaPaga(n)} pagoEm={n.pagoEm} busy={alterandoPagamento === n.id} onChange={(pago) => onAlterarPagamento(n, pago)} sx={{ mr: 0.5 }} />
                                        {n.observacoes && (
                                            <Tooltip title={n.observacoes} arrow>
                                                <IconButton size="small" aria-label="Observações"><StickyNote2Outlined fontSize="small" /></IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title="Editar"><IconButton size="small" onClick={() => onEditar(n)} aria-label="Editar nota"><Edit fontSize="small" /></IconButton></Tooltip>
                                        <Tooltip title="Excluir"><IconButton size="small" color="error" onClick={() => onExcluir(n)} aria-label="Excluir nota"><Delete fontSize="small" /></IconButton></Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={filtradas.length}
                    page={pagina}
                    onPageChange={(_, p) => setPagina(p)}
                    rowsPerPage={porPagina}
                    onRowsPerPageChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(0); }}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    labelRowsPerPage="Por página"
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
                />
            </Paper>
        </Box>
    );
}
