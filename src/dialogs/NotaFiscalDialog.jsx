import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
    alpha,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { Close, ReceiptLong, Edit, Add } from '@mui/icons-material';
import { CampoCaixaAlta, CampoCnpj, CampoMilitar, CampoMoeda, CampoTextoSugestoes } from '../components/orcamento/CamposOrcamento';
import { adicionarSetor, atualizarNota, cnpjValido, criarNota, dataParaInput, inputParaDate, fmtMoeda, caixaAlta } from '../services/orcamentoService';

const NOVO_SETOR = '__novo';

const formVazio = () => ({
    cnpj: '',
    empresa: '',
    valor: '',
    objeto: '',
    setor: '',
    militarNome: '',
    militarRg: '',
    observacoes: '',
    numeroNota: '',
    data: dataParaInput(new Date()),
});

/**
 * Lançamento / edição de nota fiscal do Orçamento GOCG.
 * Obrigatórios: CNPJ e valor. Tudo o que é digitado vai para caixa alta.
 *
 * @param {object|null} nota          nota em edição (null = nova)
 * @param {object[]}    setores       [{ id, nome }] lista editável de destinos
 * @param {object[]}    sugestoesMilitares  [{ nomeGuerra, rg }] (PDF da DGP + já lançados)
 * @param {object[]}    fornecedores  [{ cnpj, cnpjFormatado, empresa }]
 * @param {string[]}    sugestoesObjeto
 * @param {object}      user          { userId, userName }
 */
export default function NotaFiscalDialog({ open, onClose, nota = null, setores = [], sugestoesMilitares = [], fornecedores = [], sugestoesObjeto = [], user, onSaved }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const editando = Boolean(nota?.id);

    const [form, setForm] = useState(formVazio);
    const [novoSetor, setNovoSetor] = useState('');
    const [busy, setBusy] = useState(false);
    const [erro, setErro] = useState(null);
    const [continuar, setContinuar] = useState(false);

    useEffect(() => {
        if (!open) return;
        setErro(null);
        setNovoSetor('');
        setContinuar(false);
        if (nota) {
            setForm({
                cnpj: nota.cnpj || '',
                empresa: nota.empresa || '',
                valor: nota.valor ?? '',
                objeto: nota.objeto || '',
                setor: nota.setor || '',
                militarNome: nota.militarNome || '',
                militarRg: nota.militarRg || '',
                observacoes: nota.observacoes || '',
                numeroNota: nota.numeroNota || '',
                data: dataParaInput(nota.data),
            });
        } else {
            setForm(formVazio());
        }
    }, [open, nota]);

    const set = (campo) => (v) => setForm((f) => ({ ...f, [campo]: v }));

    const opcoesSetor = useMemo(() => {
        const nomes = setores.map((s) => s.nome);
        // setor de uma nota antiga que não existe mais na lista continua selecionável
        if (form.setor && !nomes.includes(form.setor)) nomes.push(form.setor);
        return nomes;
    }, [setores, form.setor]);

    const setorEscolhido = form.setor === NOVO_SETOR ? caixaAlta(novoSetor).trim() : form.setor;
    const podeSalvar = form.cnpj.length === 14 && cnpjValido(form.cnpj) && Number(form.valor) > 0 && !busy;

    const handleSalvar = async (manterAberto = false) => {
        setErro(null);
        setBusy(true);
        try {
            let setor = form.setor;
            if (form.setor === NOVO_SETOR) {
                if (!setorEscolhido) throw new Error('Informe o nome do novo setor.');
                setor = await adicionarSetor(setorEscolhido, setores, user);
            }
            const dados = { ...form, setor, data: inputParaDate(form.data) };
            if (editando) {
                await atualizarNota(nota.id, dados, user);
                onSaved?.(`Nota de ${fmtMoeda(dados.valor)} atualizada.`);
                onClose();
            } else {
                await criarNota(dados, user);
                onSaved?.(`Nota de ${fmtMoeda(dados.valor)} lançada${setor ? ` para ${setor}` : ''}.`);
                if (manterAberto) {
                    // mantém data e setor para agilizar o lançamento de várias notas seguidas
                    setForm({ ...formVazio(), data: form.data, setor });
                    setNovoSetor('');
                    setContinuar(true);
                } else {
                    onClose();
                }
            }
        } catch (e) {
            console.error(e);
            setErro(e?.message || 'Não foi possível salvar a nota.');
        } finally {
            setBusy(false);
        }
    };

    const cor = theme.palette.primary.main;

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, overflow: 'hidden' } }}>
            <DialogTitle sx={{ background: `linear-gradient(135deg, ${cor} 0%, ${alpha(cor, 0.75)} 100%)`, color: 'white', display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#fff', 0.18), display: 'flex' }}>
                    {editando ? <Edit /> : <ReceiptLong />}
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {editando ? 'Editar nota fiscal' : 'Lançar nota fiscal'}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>
                        {editando ? nota.cnpjFormatado : 'CNPJ e valor são obrigatórios; o restante é opcional'}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} disabled={busy} sx={{ color: 'white' }} size="small" aria-label="Fechar"><Close /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 2.5, sm: 3 } }}>
                {continuar && !erro && (
                    <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setContinuar(false)}>
                        Nota lançada. Pode lançar a próxima.
                    </Alert>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        <CampoCnpj
                            value={form.cnpj}
                            onChange={set('cnpj')}
                            fornecedores={fornecedores}
                            onEscolherFornecedor={(f) => setForm((x) => ({ ...x, cnpj: f.cnpj, empresa: x.empresa || f.empresa || '' }))}
                            autoFocus={!isMobile}
                            sx={{ flex: 1, minWidth: 220 }}
                        />
                        <CampoMoeda value={form.valor} onChange={set('valor')} label="Valor da nota" required sx={{ width: { xs: '100%', sm: 170 } }} helperText=" " />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        <CampoTextoSugestoes
                            value={form.empresa}
                            onChange={set('empresa')}
                            sugestoes={fornecedores.map((f) => f.empresa).filter(Boolean)}
                            label="Empresa (opcional)"
                            placeholder="Razão social / nome fantasia"
                            sx={{ flex: 1, minWidth: 200 }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label="Data da nota"
                            value={form.data}
                            onChange={(e) => set('data')(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                            sx={{ width: { xs: '100%', sm: 170 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                    </Box>

                    <CampoTextoSugestoes
                        value={form.objeto}
                        onChange={set('objeto')}
                        sugestoes={sugestoesObjeto}
                        label="Objeto comprado"
                        placeholder="Ex.: MATERIAL DE LIMPEZA, PEÇA PARA VIATURA"
                    />

                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
                            <InputLabel id="nota-setor-label">Destino da compra</InputLabel>
                            <Select
                                labelId="nota-setor-label"
                                label="Destino da compra"
                                value={form.setor}
                                onChange={(e) => set('setor')(e.target.value)}
                                sx={{ borderRadius: 2 }}
                            >
                                <MenuItem value=""><em>Não informado</em></MenuItem>
                                {opcoesSetor.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                <MenuItem value={NOVO_SETOR}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontStyle: 'italic' }}>
                                        <Add sx={{ fontSize: 18 }} /> Outro setor…
                                    </Box>
                                </MenuItem>
                            </Select>
                        </FormControl>
                        {form.setor === NOVO_SETOR && (
                            <CampoCaixaAlta
                                label="Nome do novo setor"
                                placeholder="Ex.: SUBCOMANDO"
                                value={novoSetor}
                                onChange={setNovoSetor}
                                autoFocus
                                sx={{ flex: 1, minWidth: 180 }}
                            />
                        )}
                    </Box>

                    <CampoMilitar
                        value={{ militarNome: form.militarNome, militarRg: form.militarRg }}
                        onChange={(v) => setForm((f) => ({ ...f, ...v }))}
                        sugestoes={sugestoesMilitares}
                    />

                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        <CampoCaixaAlta label="Nº da nota (opcional)" value={form.numeroNota} onChange={set('numeroNota')} sx={{ width: { xs: '100%', sm: 200 } }} />
                    </Box>

                    <CampoCaixaAlta
                        label="Observações"
                        value={form.observacoes}
                        onChange={set('observacoes')}
                        multiline
                        minRows={2}
                        placeholder="Qualquer informação extra sobre a compra"
                    />

                    {erro && <Alert severity="error" sx={{ borderRadius: 2 }}>{erro}</Alert>}
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, pt: 1, gap: 1, flexWrap: 'wrap' }}>
                <Button onClick={onClose} disabled={busy} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
                <Box sx={{ flex: 1 }} />
                {!editando && (
                    <Button variant="outlined" onClick={() => handleSalvar(true)} disabled={!podeSalvar} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                        Salvar e lançar outra
                    </Button>
                )}
                <Button
                    variant="contained"
                    onClick={() => handleSalvar(false)}
                    disabled={!podeSalvar}
                    startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3 }}
                >
                    {editando ? 'Salvar alterações' : 'Lançar nota'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
