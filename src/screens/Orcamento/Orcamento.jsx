import { lazy, Suspense, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Snackbar,
    Tab,
    Tabs,
    Typography,
    alpha,
    styled,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    AccountBalanceWallet,
    Add,
    BarChartOutlined,
    Category,
    Paid,
    ReceiptLong,
    TrendingDown,
} from '@mui/icons-material';
import MenuContext from '../../contexts/MenuContext';
import PrivateRoute from '../../contexts/PrivateRoute';
import useCurrentUser from '../../hooks/useCurrentUser';
import { useFornecedores, useMovimentosCaixa, useNotasFiscais, useSetoresOrcamento, useSugestoesMilitares, useValoresDistintos } from '../../hooks/useOrcamento';
import { alterarPagamentoNota, calcularSaldoCaixa, excluirMovimentoCaixa, excluirNota, fmtMoeda, TIPOS_CAIXA } from '../../services/orcamentoService';
import OrcamentoPainel from './OrcamentoPainel';
import OrcamentoNotas from './OrcamentoNotas';
import OrcamentoCaixa from './OrcamentoCaixa';
import OrcamentoSetores from './OrcamentoSetores';

const NotaFiscalDialog = lazy(() => import('../../dialogs/NotaFiscalDialog'));
const CaixaMovimentoDialog = lazy(() => import('../../dialogs/CaixaMovimentoDialog'));
const SetorDialog = lazy(() => import('../../dialogs/SetorDialog'));

const ABAS = [
    { chave: 'painel', label: 'Painel', icon: BarChartOutlined },
    { chave: 'notas', label: 'Notas fiscais', icon: ReceiptLong },
    { chave: 'caixa', label: 'Caixa', icon: AccountBalanceWallet },
    { chave: 'setores', label: 'Setores', icon: Category },
];

const StatCard = styled(Card)(({ theme }) => ({
    padding: theme.spacing(1.5, 2),
    borderRadius: 12,
    flex: 1,
    minWidth: 210,
    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.primary.main, 0.02)})`,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
}));

/**
 * Orçamento do GOCG — controle das notas fiscais (o que foi comprado, por quem, para qual setor,
 * quanto custou) e do caixa (saques no banco, devoluções, conferências).
 * Módulo isolado do papel BensPatrimoniais (e admingeral). Cada aba é um arquivo próprio.
 */
export default function Orcamento() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const currentUser = useCurrentUser();
    const user = useMemo(() => ({ userId: currentUser.userId, userName: currentUser.fullName || currentUser.username || '' }), [currentUser.userId, currentUser.fullName, currentUser.username]);

    const { notas, loading: loadingNotas } = useNotasFiscais();
    const { movimentos, loading: loadingCaixa } = useMovimentosCaixa();
    const { setores, loading: loadingSetores } = useSetoresOrcamento();
    const sugestoesMilitares = useSugestoesMilitares(notas, movimentos);
    const fornecedores = useFornecedores(notas);
    const sugestoesObjeto = useValoresDistintos(notas, 'objeto');

    const [aba, setAba] = useState('painel');
    const [notaDialog, setNotaDialog] = useState({ open: false, nota: null });
    const [caixaDialog, setCaixaDialog] = useState({ open: false, movimento: null, tipo: 'saque' });
    const [setorDialog, setSetorDialog] = useState(false);
    const [alterandoPagamento, setAlterandoPagamento] = useState(null);
    const [confirmar, setConfirmar] = useState(null); // { titulo, texto, onConfirm }
    const [excluindo, setExcluindo] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const avisar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

    const saldoCaixa = useMemo(() => calcularSaldoCaixa(movimentos, notas), [movimentos, notas]);
    const resumo = useMemo(() => {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = hoje.getMonth() + 1;
        const noAno = notas.filter((n) => Number(n.ano) === ano);
        const noMes = noAno.filter((n) => Number(n.mes) === mes);
        const soma = (l) => l.reduce((s, n) => s + (Number(n.valor) || 0), 0);
        return { gastoMes: soma(noMes), gastoAno: soma(noAno), notasAno: noAno.length, notasMes: noMes.length };
    }, [notas]);

    const abrirNota = (nota = null) => setNotaDialog({ open: true, nota });
    const abrirCaixa = (tipo = 'saque', movimento = null) => setCaixaDialog({ open: true, movimento, tipo });

    const alterarPagamento = async (nota, pago) => {
        setAlterandoPagamento(nota.id);
        try {
            await alterarPagamentoNota(nota, pago, user);
            avisar(pago ? `Nota de ${fmtMoeda(nota.valor)} marcada como paga.` : `Nota de ${fmtMoeda(nota.valor)} marcada como não paga.`);
        } catch (e) {
            console.error(e);
            avisar(e?.message || 'Não foi possível alterar o pagamento.', 'error');
        } finally {
            setAlterandoPagamento(null);
        }
    };

    const pedirExclusaoNota = (nota) => setConfirmar({
        titulo: 'Excluir nota fiscal?',
        texto: `${nota.cnpjFormatado} · ${fmtMoeda(nota.valor)}${nota.objeto ? ` · ${nota.objeto}` : ''}. O valor sai dos gráficos e volta para o saldo do caixa.`,
        onConfirm: async () => { await excluirNota(nota, user); avisar('Nota excluída.'); },
    });
    const pedirExclusaoMovimento = (mov) => setConfirmar({
        titulo: 'Excluir movimento do caixa?',
        texto: `${TIPOS_CAIXA[mov.tipo]?.label || mov.tipo} · ${fmtMoeda(mov.valor)}. O saldo do caixa será recalculado.`,
        onConfirm: async () => { await excluirMovimentoCaixa(mov, user); avisar('Movimento excluído.'); },
    });

    const confirmarExclusao = async () => {
        if (!confirmar) return;
        setExcluindo(true);
        try {
            await confirmar.onConfirm();
            setConfirmar(null);
        } catch (e) {
            console.error(e);
            avisar(e?.message || 'Não foi possível excluir.', 'error');
        } finally {
            setExcluindo(false);
        }
    };

    const loading = loadingNotas || loadingCaixa || loadingSetores;
    const corSaldo = saldoCaixa < 0 ? theme.palette.error.main : theme.palette.success.main;

    return (
        <PrivateRoute allowedRoles={['BensPatrimoniais', 'admingeral']}>
            <MenuContext>
                <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
                    {/* Cabeçalho */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2, py: { xs: 1, sm: 2 } }}>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', fontSize: { xs: '1.15rem', sm: '1.5rem' }, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Paid /> Orçamento GOCG
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Notas fiscais, caixa e gastos por setor e por militar
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button variant="outlined" startIcon={<AccountBalanceWallet />} onClick={() => abrirCaixa('saque')} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                                Movimentar caixa
                            </Button>
                            <Button variant="contained" startIcon={<Add />} onClick={() => abrirNota()} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3, boxShadow: 2, '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
                                Lançar nota
                            </Button>
                        </Box>
                    </Box>

                    {/* Resumo */}
                    <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, mb: { xs: 2, sm: 3 }, overflowX: { xs: 'auto', sm: 'visible' }, pb: { xs: 0.5, sm: 0 } }}>
                        <StatCard sx={{ borderColor: alpha(corSaldo, 0.3), background: `linear-gradient(135deg, ${alpha(corSaldo, 0.1)} 0%, ${alpha(corSaldo, 0.03)} 100%)`, cursor: 'pointer' }} onClick={() => setAba('caixa')}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: alpha(corSaldo, 0.12), color: corSaldo, display: 'flex' }}><AccountBalanceWallet /></Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="h6" fontWeight={800} sx={{ color: corSaldo, lineHeight: 1.2 }} noWrap>{loading ? '…' : fmtMoeda(saldoCaixa)}</Typography>
                                    <Typography variant="caption" color="text.secondary">Em caixa</Typography>
                                </Box>
                            </Box>
                        </StatCard>
                        <StatCard sx={{ cursor: 'pointer' }} onClick={() => setAba('notas')}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: alpha(theme.palette.secondary.main, 0.12), color: 'secondary.main', display: 'flex' }}><TrendingDown /></Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="h6" fontWeight={800} color="secondary.main" sx={{ lineHeight: 1.2 }} noWrap>{loading ? '…' : fmtMoeda(resumo.gastoMes)}</Typography>
                                    <Typography variant="caption" color="text.secondary">Gasto este mês · {resumo.notasMes} nota(s)</Typography>
                                </Box>
                            </Box>
                        </StatCard>
                        <StatCard sx={{ cursor: 'pointer' }} onClick={() => setAba('painel')}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', display: 'flex' }}><ReceiptLong /></Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ lineHeight: 1.2 }} noWrap>{loading ? '…' : fmtMoeda(resumo.gastoAno)}</Typography>
                                    <Typography variant="caption" color="text.secondary">Gasto no ano · {resumo.notasAno} nota(s)</Typography>
                                </Box>
                            </Box>
                        </StatCard>
                    </Box>

                    {/* Abas */}
                    <Tabs
                        value={aba}
                        onChange={(_, v) => setAba(v)}
                        variant={isMobile ? 'fullWidth' : 'standard'}
                        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 } }}
                    >
                        {ABAS.map((a) => {
                            const Icon = a.icon;
                            return <Tab key={a.chave} value={a.chave} label={isMobile ? undefined : a.label} icon={<Icon sx={{ fontSize: 20 }} />} iconPosition="start" aria-label={a.label} />;
                        })}
                    </Tabs>

                    {aba === 'painel' && (
                        <OrcamentoPainel notas={notas} movimentos={movimentos} setores={setores} saldoCaixa={saldoCaixa} loading={loading} onNovaNota={() => abrirNota()} />
                    )}
                    {aba === 'notas' && (
                        <OrcamentoNotas notas={notas} setores={setores} sugestoesMilitares={sugestoesMilitares} loading={loadingNotas} onNova={() => abrirNota()} onNovoSetor={() => setSetorDialog(true)} onEditar={abrirNota} onExcluir={pedirExclusaoNota} onAlterarPagamento={alterarPagamento} alterandoPagamento={alterandoPagamento} onAviso={avisar} emitidoPor={user.userName} />
                    )}
                    {aba === 'caixa' && (
                        <OrcamentoCaixa movimentos={movimentos} notas={notas} saldoCaixa={saldoCaixa} loading={loadingCaixa} onNovo={abrirCaixa} onEditar={(m) => abrirCaixa(m.tipo, m)} onExcluir={pedirExclusaoMovimento} />
                    )}
                    {aba === 'setores' && (
                        <OrcamentoSetores setores={setores} notas={notas} user={user} onAviso={avisar} />
                    )}
                </Box>

                <Suspense fallback={null}>
                    {notaDialog.open && (
                        <NotaFiscalDialog
                            open
                            onClose={() => setNotaDialog({ open: false, nota: null })}
                            nota={notaDialog.nota}
                            setores={setores}
                            sugestoesMilitares={sugestoesMilitares}
                            fornecedores={fornecedores}
                            sugestoesObjeto={sugestoesObjeto}
                            user={user}
                            onSaved={avisar}
                        />
                    )}
                    {setorDialog && (
                        <SetorDialog open onClose={() => setSetorDialog(false)} setores={setores} user={user} onSaved={(msg) => avisar(msg)} />
                    )}
                    {caixaDialog.open && (
                        <CaixaMovimentoDialog
                            open
                            onClose={() => setCaixaDialog({ open: false, movimento: null, tipo: 'saque' })}
                            movimento={caixaDialog.movimento}
                            tipoInicial={caixaDialog.tipo}
                            saldoCaixa={saldoCaixa}
                            saldoAtual={saldoCaixa}
                            sugestoesMilitares={sugestoesMilitares}
                            user={user}
                            onSaved={avisar}
                        />
                    )}
                </Suspense>

                <Dialog open={Boolean(confirmar)} onClose={excluindo ? undefined : () => setConfirmar(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                    <DialogTitle sx={{ fontWeight: 700 }}>{confirmar?.titulo}</DialogTitle>
                    <DialogContent><Typography variant="body2" color="text.secondary">{confirmar?.texto}</Typography></DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={() => setConfirmar(null)} disabled={excluindo} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
                        <Button variant="contained" color="error" onClick={confirmarExclusao} disabled={excluindo} startIcon={excluindo ? <CircularProgress size={16} color="inherit" /> : null} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                            Excluir
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
