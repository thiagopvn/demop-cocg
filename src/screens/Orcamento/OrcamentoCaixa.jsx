import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    FormControl,
    IconButton,
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
    Tooltip,
    Typography,
    alpha,
    styled,
    useTheme,
} from '@mui/material';
import { AccountBalanceWallet, Delete, Edit, FactCheck, Savings, Undo, Tune } from '@mui/icons-material';
import { MESES, TIPOS_CAIXA, anosDisponiveis, efeitoNoCaixa, filtrarMovimentos, fmtData, fmtMoeda } from '../../services/orcamentoService';

const HeaderCell = styled(TableCell)(() => ({
    color: 'white', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: 'none',
}));

const Resumo = ({ icon, titulo, valor, cor, ajuda, onClick }) => {
    const Icon = icon;
    return (
    <Paper elevation={0} onClick={onClick} sx={{ p: 2, borderRadius: 3, flex: 1, minWidth: 160, border: `1px solid ${alpha(cor, 0.25)}`, background: `linear-gradient(160deg, ${alpha(cor, 0.1)} 0%, ${alpha(cor, 0.02)} 100%)`, cursor: onClick ? 'pointer' : 'default', '&:hover': onClick ? { boxShadow: `0 6px 18px ${alpha(cor, 0.2)}` } : {} }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1.1, borderRadius: 2, bgcolor: alpha(cor, 0.14), color: cor, display: 'flex' }}><Icon /></Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: cor, lineHeight: 1.15 }} noWrap>{valor}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>{titulo}</Typography>
                {ajuda && <Typography variant="caption" color="text.disabled" sx={{ display: 'block', lineHeight: 1.2 }}>{ajuda}</Typography>}
            </Box>
        </Box>
    </Paper>
    );
};

/**
 * Caixa do GOCG: quanto foi sacado no banco, quanto voltou, ajustes de conferência e o saldo atual
 * (saques − devoluções ± ajustes − notas fiscais pagas).
 */
export default function OrcamentoCaixa({ movimentos, notas, saldoCaixa, loading, onNovo, onEditar, onExcluir }) {
    const theme = useTheme();
    const [filtro, setFiltro] = useState({ ano: 'todos', mes: 'todos', tipo: 'todos' });
    const [pagina, setPagina] = useState(0);
    const [porPagina, setPorPagina] = useState(25);

    const anos = useMemo(() => anosDisponiveis(movimentos, notas), [movimentos, notas]);
    const totais = useMemo(() => {
        const soma = (tipo) => movimentos.filter((m) => m.tipo === tipo).reduce((s, m) => s + (Number(m.valor) || 0), 0);
        return { sacado: soma('saque'), devolvido: soma('retorno'), ajustes: soma('ajuste'), gasto: notas.reduce((s, n) => s + (Number(n.valor) || 0), 0) };
    }, [movimentos, notas]);

    const filtrados = useMemo(() => filtrarMovimentos(movimentos, filtro), [movimentos, filtro]);
    useEffect(() => { setPagina(0); }, [filtrados.length]);
    const pagina_ = filtrados.slice(pagina * porPagina, pagina * porPagina + porPagina);
    const set = (campo) => (v) => setFiltro((f) => ({ ...f, [campo]: v }));

    const corTipo = { saque: theme.palette.success.main, retorno: theme.palette.warning.main, ajuste: theme.palette.info.main };
    const corSaldo = saldoCaixa < 0 ? theme.palette.error.main : theme.palette.success.main;

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, mb: 2, flexWrap: 'wrap' }}>
                <Resumo icon={AccountBalanceWallet} titulo="Saldo em caixa" valor={loading ? '…' : fmtMoeda(saldoCaixa)} cor={corSaldo} ajuda="saques − devoluções ± ajustes − notas" />
                <Resumo icon={Savings} titulo="Total sacado no banco" valor={loading ? '…' : fmtMoeda(totais.sacado)} cor={theme.palette.success.main} onClick={() => set('tipo')('saque')} />
                <Resumo icon={Undo} titulo="Devolvido ao banco" valor={loading ? '…' : fmtMoeda(totais.devolvido)} cor={theme.palette.warning.main} onClick={() => set('tipo')('retorno')} />
                <Resumo icon={Tune} titulo="Ajustes de conferência" valor={loading ? '…' : fmtMoeda(totais.ajustes)} cor={theme.palette.info.main} onClick={() => set('tipo')('ajuste')} />
                <Resumo icon={FactCheck} titulo="Pago em notas fiscais" valor={loading ? '…' : fmtMoeda(totais.gasto)} cor={theme.palette.secondary.main} ajuda={`${notas.length} nota(s)`} />
            </Box>

            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel id="caixa-ano">Ano</InputLabel>
                    <Select labelId="caixa-ano" label="Ano" value={filtro.ano} onChange={(e) => set('ano')(e.target.value)} sx={{ borderRadius: 2 }}>
                        <MenuItem value="todos">Todos</MenuItem>
                        {anos.map((a) => <MenuItem key={a} value={String(a)}>{a}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel id="caixa-mes">Mês</InputLabel>
                    <Select labelId="caixa-mes" label="Mês" value={filtro.mes} onChange={(e) => set('mes')(e.target.value)} sx={{ borderRadius: 2 }}>
                        <MenuItem value="todos">Todos</MenuItem>
                        {MESES.map((m, i) => <MenuItem key={m} value={String(i + 1)}>{m}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 190 }}>
                    <InputLabel id="caixa-tipo">Tipo</InputLabel>
                    <Select labelId="caixa-tipo" label="Tipo" value={filtro.tipo} onChange={(e) => set('tipo')(e.target.value)} sx={{ borderRadius: 2 }}>
                        <MenuItem value="todos">Todos</MenuItem>
                        {Object.entries(TIPOS_CAIXA).map(([k, t]) => <MenuItem key={k} value={k}>{t.label}</MenuItem>)}
                    </Select>
                </FormControl>
                <Box sx={{ flex: 1 }} />
                <Button size="small" variant="outlined" color="info" startIcon={<FactCheck />} onClick={() => onNovo('conferencia')} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Conferir caixa</Button>
                <Button size="small" variant="outlined" color="warning" startIcon={<Undo />} onClick={() => onNovo('retorno')} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Devolver ao banco</Button>
                <Button size="small" variant="contained" color="success" startIcon={<Savings />} onClick={() => onNovo('saque')} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Lançar saque</Button>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 'calc(100vh - 420px)', minHeight: 220 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow sx={{ '& th': { bgcolor: 'primary.main' } }}>
                                <HeaderCell>Data</HeaderCell>
                                <HeaderCell>Tipo</HeaderCell>
                                <HeaderCell>Responsável</HeaderCell>
                                <HeaderCell>Descrição</HeaderCell>
                                <HeaderCell align="right">Efeito no caixa</HeaderCell>
                                <HeaderCell align="center">Ações</HeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {!loading && pagina_.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                                        {movimentos.length === 0 ? 'Nenhum saque lançado ainda. Comece lançando o que foi sacado no banco.' : 'Nenhum movimento bate com os filtros.'}
                                    </TableCell>
                                </TableRow>
                            )}
                            {pagina_.map((m) => {
                                const efeito = efeitoNoCaixa(m);
                                const cor = corTipo[m.tipo] || theme.palette.text.secondary;
                                return (
                                    <TableRow key={m.id} hover sx={{ '&:nth-of-type(even)': { bgcolor: alpha(theme.palette.text.primary, 0.02) } }}>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtData(m.data)}</TableCell>
                                        <TableCell><Chip label={TIPOS_CAIXA[m.tipo]?.label || m.tipo} size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem', bgcolor: alpha(cor, 0.14), color: cor }} /></TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{m.militarNome || '—'}</Typography>
                                            {m.militarRg && <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>RG {m.militarRg}</Typography>}
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 360 }}><Typography variant="body2" noWrap title={m.descricao}>{m.descricao || '—'}</Typography></TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 800, color: efeito < 0 ? 'error.main' : 'success.main' }}>{efeito > 0 ? '+' : ''}{fmtMoeda(efeito)}</TableCell>
                                        <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                            <Tooltip title="Editar"><IconButton size="small" onClick={() => onEditar(m)} aria-label="Editar movimento"><Edit fontSize="small" /></IconButton></Tooltip>
                                            <Tooltip title="Excluir"><IconButton size="small" color="error" onClick={() => onExcluir(m)} aria-label="Excluir movimento"><Delete fontSize="small" /></IconButton></Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={filtrados.length}
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
