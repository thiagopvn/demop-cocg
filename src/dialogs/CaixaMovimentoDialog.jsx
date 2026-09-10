import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    alpha,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { Close, AccountBalanceWallet, Edit } from '@mui/icons-material';
import { CampoCaixaAlta, CampoMilitar, CampoMoeda } from '../components/orcamento/CamposOrcamento';
import { TIPOS_CAIXA, atualizarMovimentoCaixa, centavos, criarMovimentoCaixa, dataParaInput, fmtMoeda, inputParaDate } from '../services/orcamentoService';

const MODO_CONFERENCIA = 'conferencia';

const formVazio = (tipo = 'saque') => ({ tipo, valor: '', militarNome: '', militarRg: '', descricao: '', data: dataParaInput(new Date()) });

/**
 * Lançamento / edição de movimento do caixa do GOCG.
 * Modos: saque no banco, devolução ao banco, ajuste (valor livre, + ou −) e
 * "conferência": o militar informa quanto contou no caixa e o sistema grava a diferença como ajuste.
 *
 * @param {object|null} movimento  em edição (null = novo)
 * @param {number}      saldoAtual saldo calculado hoje (para a conferência)
 * @param {string}      tipoInicial 'saque' | 'retorno' | 'ajuste' | 'conferencia'
 */
export default function CaixaMovimentoDialog({ open, onClose, movimento = null, saldoAtual = 0, tipoInicial = 'saque', sugestoesMilitares = [], user, onSaved }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const editando = Boolean(movimento?.id);

    const [modo, setModo] = useState('saque');
    const [form, setForm] = useState(formVazio);
    const [contado, setContado] = useState('');
    const [busy, setBusy] = useState(false);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        if (!open) return;
        setErro(null);
        setContado('');
        if (movimento) {
            setModo(movimento.tipo || 'saque');
            setForm({
                tipo: movimento.tipo || 'saque',
                valor: movimento.valor ?? '',
                militarNome: movimento.militarNome || '',
                militarRg: movimento.militarRg || '',
                descricao: movimento.descricao || '',
                data: dataParaInput(movimento.data),
            });
        } else {
            setModo(tipoInicial);
            setForm(formVazio(tipoInicial === MODO_CONFERENCIA ? 'ajuste' : tipoInicial));
        }
    }, [open, movimento, tipoInicial]);

    const set = (campo) => (v) => setForm((f) => ({ ...f, [campo]: v }));

    const diferenca = contado === '' ? null : centavos(Number(contado) - saldoAtual);
    const conferencia = modo === MODO_CONFERENCIA;
    const podeSalvar = !busy && (conferencia ? diferenca !== null : (modo === 'ajuste' ? Number(form.valor) !== 0 && form.valor !== '' : Number(form.valor) > 0));

    const handleSalvar = async () => {
        setErro(null);
        setBusy(true);
        try {
            let dados;
            if (conferencia) {
                if (diferenca === 0) throw new Error('O valor contado é igual ao saldo do sistema — não há ajuste a lançar.');
                dados = {
                    tipo: 'ajuste',
                    valor: diferenca,
                    militarNome: form.militarNome,
                    militarRg: form.militarRg,
                    descricao: `CONFERÊNCIA DE CAIXA: CONTADO ${fmtMoeda(contado)} (SISTEMA ${fmtMoeda(saldoAtual)})${form.descricao ? ` — ${form.descricao}` : ''}`,
                    data: inputParaDate(form.data),
                };
            } else {
                dados = { ...form, tipo: modo, data: inputParaDate(form.data) };
            }
            if (editando) {
                await atualizarMovimentoCaixa(movimento.id, dados, user);
                onSaved?.('Movimento do caixa atualizado.');
            } else {
                await criarMovimentoCaixa(dados, user);
                onSaved?.(conferencia ? `Ajuste de ${fmtMoeda(diferenca)} lançado.` : `${TIPOS_CAIXA[modo].label} de ${fmtMoeda(dados.valor)} lançado.`);
            }
            onClose();
        } catch (e) {
            console.error(e);
            setErro(e?.message || 'Não foi possível salvar.');
        } finally {
            setBusy(false);
        }
    };

    const corPorModo = { saque: theme.palette.success.main, retorno: theme.palette.warning.main, ajuste: theme.palette.info.main, [MODO_CONFERENCIA]: theme.palette.info.main };
    const cor = corPorModo[modo] || theme.palette.primary.main;

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, overflow: 'hidden' } }}>
            <DialogTitle sx={{ background: `linear-gradient(135deg, ${cor} 0%, ${alpha(cor, 0.75)} 100%)`, color: 'white', display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#fff', 0.18), display: 'flex' }}>
                    {editando ? <Edit /> : <AccountBalanceWallet />}
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {editando ? 'Editar movimento do caixa' : 'Movimentar o caixa'}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>
                        Saldo atual no sistema: {fmtMoeda(saldoAtual)}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} disabled={busy} sx={{ color: 'white' }} size="small" aria-label="Fechar"><Close /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 2.5, sm: 3 } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
                    {!editando && (
                        <ToggleButtonGroup
                            exclusive
                            fullWidth
                            size="small"
                            value={modo}
                            onChange={(_, v) => { if (v) { setModo(v); setErro(null); } }}
                            sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, borderRadius: 2, lineHeight: 1.2, py: 0.9 } }}
                        >
                            <ToggleButton value="saque">Saque</ToggleButton>
                            <ToggleButton value="retorno">Devolução</ToggleButton>
                            <ToggleButton value="ajuste">Ajuste</ToggleButton>
                            <ToggleButton value={MODO_CONFERENCIA}>Conferir</ToggleButton>
                        </ToggleButtonGroup>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                        {conferencia ? 'Conte o dinheiro do caixa e informe o total. A diferença para o saldo do sistema vira um ajuste.' : TIPOS_CAIXA[modo]?.descricao}
                    </Typography>

                    {conferencia ? (
                        <>
                            <CampoMoeda value={contado} onChange={setContado} label="Total contado no caixa" required autoFocus={!isMobile} helperText=" " />
                            {diferenca !== null && (
                                <Alert severity={diferenca === 0 ? 'success' : diferenca > 0 ? 'info' : 'warning'} sx={{ borderRadius: 2 }}>
                                    {diferenca === 0 ? 'Caixa confere com o sistema.' : `${diferenca > 0 ? 'Sobra' : 'Falta'} de ${fmtMoeda(Math.abs(diferenca))} — será lançado um ajuste de ${fmtMoeda(diferenca)}.`}
                                </Alert>
                            )}
                        </>
                    ) : (
                        <CampoMoeda
                            value={form.valor}
                            onChange={set('valor')}
                            label={modo === 'ajuste' ? 'Valor do ajuste (use − para falta)' : 'Valor'}
                            permitirNegativo={modo === 'ajuste'}
                            required
                            autoFocus={!isMobile}
                            helperText=" "
                        />
                    )}

                    <TextField
                        size="small"
                        type="date"
                        label="Data"
                        value={form.data}
                        onChange={(e) => set('data')(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />

                    <CampoMilitar
                        value={{ militarNome: form.militarNome, militarRg: form.militarRg }}
                        onChange={(v) => setForm((f) => ({ ...f, ...v }))}
                        sugestoes={sugestoesMilitares}
                        label={modo === 'saque' ? 'Quem sacou' : conferencia ? 'Quem conferiu' : 'Responsável'}
                        larguraRg={120}
                    />

                    <CampoCaixaAlta label="Descrição / observações" value={form.descricao} onChange={set('descricao')} multiline minRows={2} />

                    {erro && <Alert severity="error" sx={{ borderRadius: 2 }}>{erro}</Alert>}
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, pt: 1 }}>
                <Button onClick={onClose} disabled={busy} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
                <Box sx={{ flex: 1 }} />
                <Button
                    variant="contained"
                    onClick={handleSalvar}
                    disabled={!podeSalvar}
                    startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3, bgcolor: cor, '&:hover': { bgcolor: alpha(cor, 0.85) } }}
                >
                    {editando ? 'Salvar' : conferencia ? 'Lançar ajuste' : 'Lançar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
