import { useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    IconButton,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    ToggleButton,
    ToggleButtonGroup,
    FormControlLabel,
    Switch,
    Chip,
    Alert,
    Collapse,
    CircularProgress,
    alpha,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { Close, AddLocationAlt, Edit, ReportProblem } from '@mui/icons-material';
import {
    TIPOS_PADRAO,
    getTipoInfo,
    slugTipo,
    montarNomeLocal,
    criarLocais,
    atualizarLocal,
} from '../services/localizacaoService';
import { TipoLocalIcon } from '../components/locais/LocalChip';

const NOVO_TIPO = '__novo';

/**
 * Cria (um ou varios em sequencia) ou edita um local de armazenamento.
 * `tipos` vem do hook useLocaisArmazenamento (tipos ja existentes, inclusive os criados pelo admin).
 */
export default function LocalDialog({ open, onClose, local = null, tipos = [], loggedUserId, loggedUserName, onSaved }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const editando = Boolean(local?.id);

    const [tipoKey, setTipoKey] = useState('prateleira');
    const [novoTipoLabel, setNovoTipoLabel] = useState('');
    const [modo, setModo] = useState('um');
    const [numero, setNumero] = useState('');
    const [numeroDe, setNumeroDe] = useState(1);
    const [numeroAte, setNumeroAte] = useState(5);
    const [observacao, setObservacao] = useState('');
    const [inoperantes, setInoperantes] = useState(false);
    const [busy, setBusy] = useState(false);
    const [erro, setErro] = useState(null);

    const opcoesTipo = useMemo(() => {
        const mapa = new Map(TIPOS_PADRAO.map(t => [t.key, { key: t.key, label: t.label, cor: t.cor }]));
        for (const t of tipos) if (!mapa.has(t.key)) mapa.set(t.key, { key: t.key, label: t.label, cor: t.cor });
        return [...mapa.values()];
    }, [tipos]);

    useEffect(() => {
        if (!open) return;
        setErro(null);
        if (local) {
            setTipoKey(local.tipo || 'prateleira');
            setNovoTipoLabel('');
            setModo('um');
            setNumero(local.numero ?? '');
            setObservacao(local.observacao || '');
            setInoperantes(Boolean(local.inoperantes));
        } else {
            setTipoKey('prateleira');
            setNovoTipoLabel('');
            setModo('um');
            setNumero('');
            setNumeroDe(1);
            setNumeroAte(5);
            setObservacao('');
            setInoperantes(false);
        }
    }, [open, local]);

    const tipoSelecionado = useMemo(() => (
        tipoKey === NOVO_TIPO
            ? { key: slugTipo(novoTipoLabel), label: novoTipoLabel.trim(), cor: getTipoInfo(slugTipo(novoTipoLabel), novoTipoLabel).cor }
            : opcoesTipo.find(t => t.key === tipoKey) || opcoesTipo[0]
    ), [tipoKey, novoTipoLabel, opcoesTipo]);

    const previewNomes = useMemo(() => {
        if (!tipoSelecionado?.label) return [];
        if (modo === 'faixa' && !editando) {
            const de = Math.max(0, parseInt(numeroDe) || 0);
            const ate = Math.max(de, parseInt(numeroAte) || de);
            const lista = [];
            for (let n = de; n <= ate && lista.length < 200; n++) lista.push(montarNomeLocal(tipoSelecionado.label, n));
            return lista;
        }
        return [montarNomeLocal(tipoSelecionado.label, numero === '' ? null : Number(numero))];
    }, [tipoSelecionado, modo, numero, numeroDe, numeroAte, editando]);

    const handleSalvar = async () => {
        setErro(null);
        if (!tipoSelecionado?.label) return setErro('Informe o tipo do local.');
        if (modo === 'faixa' && previewNomes.length === 0) return setErro('Faixa de números inválida.');
        setBusy(true);
        try {
            const user = { userId: loggedUserId, userName: loggedUserName };
            if (editando) {
                await atualizarLocal(local.id, {
                    tipo: tipoSelecionado.key,
                    tipoLabel: tipoSelecionado.label,
                    numero: numero === '' ? null : Number(numero),
                    observacao,
                    inoperantes,
                }, user);
                onSaved?.(`Local "${previewNomes[0]}" atualizado.`);
            } else {
                const itens = modo === 'faixa'
                    ? previewNomes.map((_, i) => ({
                        tipo: tipoSelecionado.key,
                        tipoLabel: tipoSelecionado.label,
                        numero: (parseInt(numeroDe) || 0) + i,
                        observacao,
                        inoperantes: false,
                    }))
                    : [{
                        tipo: tipoSelecionado.key,
                        tipoLabel: tipoSelecionado.label,
                        numero: numero === '' ? null : Number(numero),
                        observacao,
                        inoperantes,
                    }];
                const { criados, ignorados } = await criarLocais(itens, user);
                const partes = [];
                if (criados.length > 0) partes.push(`${criados.length} local(is) criado(s)`);
                if (ignorados.length > 0) partes.push(`${ignorados.length} já existia(m): ${ignorados.slice(0, 4).join(', ')}${ignorados.length > 4 ? '…' : ''}`);
                onSaved?.(partes.join(' · ') || 'Nada a criar.');
            }
            onClose();
        } catch (e) {
            console.error(e);
            setErro(e?.message || 'Não foi possível salvar.');
        } finally {
            setBusy(false);
        }
    };

    const cor = tipoSelecionado?.cor || theme.palette.primary.main;

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, overflow: 'hidden' } }}>
            <DialogTitle sx={{ background: `linear-gradient(135deg, ${cor} 0%, ${alpha(cor, 0.75)} 100%)`, color: 'white', display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#fff', 0.18), display: 'flex' }}>
                    {editando ? <Edit /> : <AddLocationAlt />}
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {editando ? 'Editar local' : 'Novo local de armazenamento'}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>
                        {editando ? local.nome : 'Prateleira, box, gaveta, armário ou um tipo novo'}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} disabled={busy} sx={{ color: 'white' }} size="small"><Close /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 2.5, sm: 3 } }}>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 0.5 }}>
                    <FormControl size="small" sx={{ flex: 1, minWidth: 180 }}>
                        <InputLabel id="local-tipo-label">Tipo</InputLabel>
                        <Select labelId="local-tipo-label" label="Tipo" value={tipoKey} onChange={(e) => setTipoKey(e.target.value)} sx={{ borderRadius: 2 }}>
                            {opcoesTipo.map(t => (
                                <MenuItem key={t.key} value={t.key}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <TipoLocalIcon tipo={t.key} sx={{ fontSize: 18, color: t.cor }} />
                                        {t.label}
                                    </Box>
                                </MenuItem>
                            ))}
                            <MenuItem value={NOVO_TIPO}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontStyle: 'italic' }}>
                                    <AddLocationAlt sx={{ fontSize: 18 }} />
                                    Outro tipo…
                                </Box>
                            </MenuItem>
                        </Select>
                    </FormControl>
                    {tipoKey === NOVO_TIPO && (
                        <TextField
                            size="small"
                            label="Nome do novo tipo"
                            placeholder="Ex.: Estante, Contêiner"
                            value={novoTipoLabel}
                            onChange={(e) => setNovoTipoLabel(e.target.value)}
                            autoFocus
                            sx={{ flex: 1, minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                    )}
                </Box>

                {!editando && (
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={modo}
                        onChange={(_, v) => v && setModo(v)}
                        sx={{ mt: 2, '& .MuiToggleButton-root': { textTransform: 'none', px: 2, borderRadius: 2, fontWeight: 600 } }}
                    >
                        <ToggleButton value="um">Um local</ToggleButton>
                        <ToggleButton value="faixa">Vários em sequência</ToggleButton>
                    </ToggleButtonGroup>
                )}

                <Box sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
                    {modo === 'faixa' && !editando ? (
                        <>
                            <TextField size="small" type="number" label="Do nº" value={numeroDe} onChange={(e) => setNumeroDe(e.target.value)} slotProps={{ input: { inputProps: { min: 0 } } }} sx={{ width: 120 }} />
                            <TextField size="small" type="number" label="Até o nº" value={numeroAte} onChange={(e) => setNumeroAte(e.target.value)} slotProps={{ input: { inputProps: { min: 0 } } }} sx={{ width: 120 }} />
                        </>
                    ) : (
                        <TextField size="small" type="number" label="Número (opcional)" value={numero} onChange={(e) => setNumero(e.target.value)} slotProps={{ input: { inputProps: { min: 0 } } }} sx={{ width: 170 }} helperText="Sem número o local usa só o nome do tipo" />
                    )}
                </Box>

                <TextField
                    size="small"
                    label="Observação (opcional)"
                    placeholder="Ex.: materiais de altura, EPIs, inoperantes..."
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    fullWidth
                    sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />

                {modo !== 'faixa' && (
                    <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, border: `1px solid ${alpha(theme.palette.error.main, inoperantes ? 0.5 : 0.15)}`, bgcolor: alpha(theme.palette.error.main, inoperantes ? 0.06 : 0.02) }}>
                        <FormControlLabel
                            control={<Switch color="error" checked={inoperantes} onChange={(e) => setInoperantes(e.target.checked)} />}
                            label={
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <ReportProblem sx={{ fontSize: 16, color: 'error.main' }} /> Local de materiais inoperantes
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Unidades marcadas como inoperantes são levadas automaticamente para cá.
                                    </Typography>
                                </Box>
                            }
                            sx={{ m: 0, alignItems: 'flex-start', '& .MuiFormControlLabel-label': { mt: 0.5 } }}
                        />
                    </Box>
                )}

                <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {editando ? 'Novo nome' : previewNomes.length > 1 ? `Serão criados ${previewNomes.length} locais` : 'Será criado'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
                        {previewNomes.slice(0, 12).map(n => (
                            <Chip key={n} label={n} size="small" icon={<TipoLocalIcon tipo={tipoSelecionado?.key} sx={{ fontSize: '0.95rem !important', color: `${cor} !important` }} />} sx={{ bgcolor: alpha(cor, 0.1), color: cor, fontWeight: 600 }} />
                        ))}
                        {previewNomes.length > 12 && <Chip label={`+${previewNomes.length - 12}`} size="small" variant="outlined" />}
                    </Box>
                </Box>

                <Collapse in={Boolean(erro)}>
                    {erro && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }} onClose={() => setErro(null)}>{erro}</Alert>}
                </Collapse>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}` }}>
                <Button onClick={onClose} disabled={busy} sx={{ textTransform: 'none', borderRadius: 2 }}>Cancelar</Button>
                <Button
                    onClick={handleSalvar}
                    variant="contained"
                    disabled={busy || !tipoSelecionado?.label || previewNomes.length === 0}
                    startIcon={busy ? <CircularProgress size={16} color="inherit" /> : (editando ? <Edit /> : <AddLocationAlt />)}
                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, px: 3, bgcolor: cor, '&:hover': { bgcolor: alpha(cor, 0.85) } }}
                >
                    {editando ? 'Salvar' : previewNomes.length > 1 ? `Criar ${previewNomes.length} locais` : 'Criar local'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
