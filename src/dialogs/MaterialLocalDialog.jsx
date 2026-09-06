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
    Autocomplete,
    Chip,
    Alert,
    Collapse,
    Divider,
    Tooltip,
    CircularProgress,
    alpha,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Warehouse,
    Add,
    Remove,
    Delete,
    SwapHoriz,
    DirectionsCar,
    Close,
    AutoFixHigh,
    ReportProblem,
    Check,
    Inventory,
} from '@mui/icons-material';
import { useLocaisArmazenamento, useAlocacoesDoMaterial } from '../hooks/useLocais';
import {
    resumirLocalizacao,
    alocacaoComoLocal,
    ordenarLocais,
    definirQuantidadeNoLocal,
    adicionarNoLocal,
    moverEntreLocais,
    ajustarExcedente,
    sincronizarInoperantesNoLocal,
    getTipoInfo,
} from '../services/localizacaoService';
import LocalChip, { TipoLocalIcon } from '../components/locais/LocalChip';

const Tile = ({ label, value, color, icon, destaque }) => (
    <Box
        sx={{
            flex: 1,
            minWidth: 0,
            p: 1.25,
            borderRadius: 2,
            bgcolor: (t) => alpha(color || t.palette.primary.main, destaque ? 0.12 : 0.06),
            border: (t) => `1px solid ${alpha(color || t.palette.primary.main, destaque ? 0.4 : 0.12)}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.25,
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color }}>
            {icon}
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, color }}>
                {value}
            </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
            {label}
        </Typography>
    </Box>
);

/**
 * Gerencia em quais locais do DEMOP um material fica guardado.
 * Tudo em tempo real: a lista reflete a colecao material_locais assim que grava.
 */
export default function MaterialLocalDialog({ open, onClose, material, loggedUserId, loggedUserName }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { locais, localInoperantes, loading: loadingLocais } = useLocaisArmazenamento();
    const { alocacoes, loading: loadingAloc } = useAlocacoesDoMaterial(open ? material?.id : null);

    const [novoLocal, setNovoLocal] = useState(null);
    const [novaQtd, setNovaQtd] = useState(1);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const [moverDe, setMoverDe] = useState(null);
    const [moverPara, setMoverPara] = useState(null);
    const [moverQtd, setMoverQtd] = useState(1);
    const [qtdEdicao, setQtdEdicao] = useState({});

    const resumo = useMemo(() => resumirLocalizacao(material || {}, alocacoes), [material, alocacoes]);
    const ordenadas = useMemo(
        () => [...alocacoes].sort((a, b) => ordenarLocais(alocacaoComoLocal(a), alocacaoComoLocal(b))),
        [alocacoes]
    );
    const qtdNoInop = useMemo(() => {
        if (!localInoperantes) return 0;
        const a = alocacoes.find(x => x.local_id === localInoperantes.id);
        return a ? Number(a.quantidade) || 0 : 0;
    }, [alocacoes, localInoperantes]);
    const inopFaltando = localInoperantes ? Math.max(0, Math.min(resumo.inoperantes, resumo.unidadesDemop) - qtdNoInop) : 0;

    useEffect(() => {
        if (!open) return;
        setNovoLocal(null);
        setMsg(null);
        setMoverDe(null);
        setMoverPara(null);
        setQtdEdicao({});
    }, [open, material?.id]);

    useEffect(() => {
        setNovaQtd(resumo.semLocal > 0 ? resumo.semLocal : 1);
    }, [resumo.semLocal]);

    const user = { userId: loggedUserId, userName: loggedUserName };
    const executar = async (fn, sucesso) => {
        setBusy(true);
        setMsg(null);
        try {
            const r = await fn();
            if (sucesso) setMsg({ tipo: 'success', texto: typeof sucesso === 'function' ? sucesso(r) : sucesso });
        } catch (e) {
            console.error(e);
            setMsg({ tipo: 'error', texto: e?.message || 'Não foi possível salvar. Tente novamente.' });
        } finally {
            setBusy(false);
        }
    };

    const handleAdicionar = () => {
        if (!novoLocal) return;
        const qtd = Math.max(0, Math.floor(Number(novaQtd) || 0));
        if (qtd <= 0) return setMsg({ tipo: 'warning', texto: 'Informe uma quantidade maior que zero.' });
        if (resumo.unidadesDemop === 0) return setMsg({ tipo: 'warning', texto: 'Todas as unidades deste material estão em viatura — nada para guardar no DEMOP.' });
        if (qtd > resumo.semLocal) {
            return setMsg({
                tipo: 'warning',
                texto: resumo.semLocal === 0
                    ? 'Todas as unidades já têm local. Para redistribuir, use "Mover" na linha do local de origem.'
                    : `Só há ${resumo.semLocal} unidade(s) sem local. Para mais, mova de outro local.`,
            });
        }
        executar(
            () => adicionarNoLocal({ material, local: novoLocal, quantidade: qtd, ...user }),
            `${qtd} un. guardada(s) em ${novoLocal.nome}.`
        ).then(() => setNovoLocal(null));
    };

    const handleSetQtd = (aloc, valor) => {
        const nova = Math.max(0, Math.floor(Number(valor) || 0));
        const atual = Number(aloc.quantidade) || 0;
        if (nova === atual) return;
        const outras = resumo.alocadas - atual;
        if (outras + nova > resumo.unidadesDemop) {
            return setMsg({ tipo: 'warning', texto: `Máximo neste local: ${Math.max(0, resumo.unidadesDemop - outras)} (o DEMOP tem ${resumo.unidadesDemop} unidade(s) deste material).` });
        }
        const local = alocacaoComoLocal(aloc);
        executar(
            () => definirQuantidadeNoLocal({ material, local, quantidade: nova, ...user }),
            nova === 0 ? `Removido de ${local.nome}.` : `${local.nome}: ${nova} un.`
        );
    };

    const handleMover = () => {
        if (!moverDe || !moverPara) return;
        const qtd = Math.max(0, Math.floor(Number(moverQtd) || 0));
        if (qtd <= 0) return;
        const deLocal = alocacaoComoLocal(moverDe);
        executar(
            () => moverEntreLocais({ material, deLocal, paraLocal: moverPara, quantidade: qtd, ...user }),
            `${qtd} un. movida(s) de ${deLocal.nome} para ${moverPara.nome}.`
        ).then(() => { setMoverDe(null); setMoverPara(null); });
    };

    const handleAjustar = () => executar(
        () => ajustarExcedente({ material, alocacoes, ...user }),
        (r) => `${r.ajustadas} un. retirada(s) dos locais para bater com o estoque do DEMOP.`
    );

    const handleLevarInoperantes = () => executar(
        () => sincronizarInoperantesNoLocal({ material, delta: inopFaltando, ...user }),
        (r) => r ? `${r.movidas} un. inoperante(s) levada(s) para ${localInoperantes.nome}.` : 'Nada a mover.'
    );

    const abrirMover = (aloc) => {
        setMoverDe(prev => (prev?.id === aloc.id ? null : aloc));
        setMoverPara(null);
        setMoverQtd(Number(aloc.quantidade) || 1);
    };

    const loading = loadingLocais || loadingAloc;
    const semLocais = !loadingLocais && locais.length === 0;

    const renderOption = (props, option) => {
        const { key, ...rest } = props;
        const info = getTipoInfo(option.tipo, option.tipo_label);
        return (
            <li key={key} {...rest}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', minWidth: 0 }}>
                    <TipoLocalIcon tipo={option.tipo} sx={{ fontSize: 18, color: info.cor, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{option.nome}</Typography>
                        {option.observacao && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2, wordBreak: 'break-word' }}>{option.observacao}</Typography>
                        )}
                    </Box>
                    {option.inoperantes && <Chip label="inoperantes" size="small" color="error" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', flexShrink: 0 }} />}
                </Box>
            </li>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={busy ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, overflow: 'hidden' } }}
        >
            <DialogTitle
                sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 2,
                }}
            >
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#fff', 0.15), display: 'flex' }}>
                    <Warehouse />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        Local no DEMOP
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }} noWrap>
                        {material?.description}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} disabled={busy} sx={{ color: 'white' }} size="small">
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 } }}>
                {/* Resumo */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, mt: 0.5 }}>
                    <Tile label="No DEMOP" value={resumo.unidadesDemop} color={theme.palette.primary.main} icon={<Inventory sx={{ fontSize: 18 }} />} />
                    <Tile label="Com local" value={resumo.alocadas} color={theme.palette.success.main} icon={<Check sx={{ fontSize: 18 }} />} />
                    <Tile label="Sem local" value={resumo.semLocal} color={resumo.semLocal > 0 ? theme.palette.warning.main : theme.palette.text.secondary} destaque={resumo.semLocal > 0} icon={<ReportProblem sx={{ fontSize: 18 }} />} />
                    <Tile label="Em viatura" value={resumo.emViatura} color={theme.palette.info.main} icon={<DirectionsCar sx={{ fontSize: 18 }} />} />
                </Box>

                {resumo.excedente > 0 && (
                    <Alert
                        severity="warning"
                        sx={{ mb: 2, borderRadius: 2, alignItems: 'center' }}
                        action={
                            <Button color="inherit" size="small" startIcon={<AutoFixHigh />} onClick={handleAjustar} disabled={busy} sx={{ textTransform: 'none', fontWeight: 600 }}>
                                Ajustar
                            </Button>
                        }
                    >
                        Há <strong>{resumo.excedente}</strong> unidade(s) guardada(s) a mais do que existe no DEMOP (material saiu para viatura ou consumo). Ajuste as quantidades.
                    </Alert>
                )}

                {inopFaltando > 0 && (
                    <Alert
                        severity="error"
                        variant="outlined"
                        icon={<ReportProblem />}
                        sx={{ mb: 2, borderRadius: 2, alignItems: 'center' }}
                        action={
                            <Button color="inherit" size="small" onClick={handleLevarInoperantes} disabled={busy} sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                Levar para {localInoperantes.nome}
                            </Button>
                        }
                    >
                        {resumo.inoperantes} unidade(s) inoperante(s) — {inopFaltando} ainda fora de <strong>{localInoperantes.nome}</strong> (local de inoperantes).
                    </Alert>
                )}

                {/* Onde esta */}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Warehouse fontSize="small" color="primary" />
                    Onde está guardado
                </Typography>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
                ) : ordenadas.length === 0 ? (
                    <Box sx={{ py: 2.5, textAlign: 'center', borderRadius: 2, border: `1px dashed ${alpha(theme.palette.warning.main, 0.5)}`, bgcolor: alpha(theme.palette.warning.main, 0.04), mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                            Nenhum local definido
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {resumo.unidadesDemop > 0 ? 'Escolha abaixo onde este material fica guardado.' : 'Todas as unidades estão em viatura.'}
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                        {ordenadas.map((aloc) => {
                            const local = alocacaoComoLocal(aloc);
                            const info = getTipoInfo(local.tipo, local.tipo_label);
                            const qtd = Number(aloc.quantidade) || 0;
                            const emEdicao = qtdEdicao[aloc.id];
                            const movendo = moverDe?.id === aloc.id;
                            return (
                                <Box key={aloc.id} sx={{ borderRadius: 2, border: `1px solid ${alpha(info.cor, movendo ? 0.5 : 0.2)}`, bgcolor: alpha(info.cor, 0.04), overflow: 'hidden' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, pl: 1.5, flexWrap: 'wrap' }}>
                                        <TipoLocalIcon tipo={local.tipo} sx={{ color: info.cor, fontSize: 20 }} />
                                        <Box sx={{ flex: 1, minWidth: 120 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{local.nome}</Typography>
                                            {local.inoperantes && (
                                                <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600 }}>local de inoperantes</Typography>
                                            )}
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                            <Tooltip title="Tirar 1">
                                                <span>
                                                    <IconButton size="small" disabled={busy || qtd <= 0} onClick={() => handleSetQtd(aloc, qtd - 1)}>
                                                        <Remove fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={emEdicao ?? qtd}
                                                onChange={(e) => setQtdEdicao(prev => ({ ...prev, [aloc.id]: e.target.value }))}
                                                onBlur={() => {
                                                    if (emEdicao !== undefined) {
                                                        handleSetQtd(aloc, emEdicao);
                                                        setQtdEdicao(prev => { const n = { ...prev }; delete n[aloc.id]; return n; });
                                                    }
                                                }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                                slotProps={{ input: { inputProps: { min: 0, style: { textAlign: 'center', fontWeight: 700, padding: '6px 4px', width: 48 } } } }}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                                disabled={busy}
                                            />
                                            <Tooltip title={resumo.semLocal > 0 ? 'Guardar +1' : 'Não há unidades sem local'}>
                                                <span>
                                                    <IconButton size="small" disabled={busy || resumo.semLocal <= 0} onClick={() => handleSetQtd(aloc, qtd + 1)}>
                                                        <Add fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                        <Tooltip title="Mover para outro local">
                                            <span>
                                                <IconButton size="small" color={movendo ? 'primary' : 'default'} disabled={busy || locais.length < 2} onClick={() => abrirMover(aloc)}>
                                                    <SwapHoriz fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title="Remover deste local">
                                            <span>
                                                <IconButton size="small" color="error" disabled={busy} onClick={() => handleSetQtd(aloc, 0)}>
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                    <Collapse in={movendo}>
                                        <Divider />
                                        <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                                            <Autocomplete
                                                size="small"
                                                options={locais.filter(l => l.id !== aloc.local_id)}
                                                groupBy={(o) => o.tipo_label || o.tipo}
                                                getOptionLabel={(o) => o.nome || ''}
                                                isOptionEqualToValue={(a, b) => a.id === b.id}
                                                value={moverPara}
                                                onChange={(_, v) => setMoverPara(v)}
                                                renderOption={renderOption}
                                                renderInput={(params) => <TextField {...params} label="Mover para" placeholder="Escolha o destino" />}
                                                sx={{ flex: 1, minWidth: 180 }}
                                                noOptionsText="Nenhum local"
                                            />
                                            <TextField
                                                size="small"
                                                type="number"
                                                label="Qtd"
                                                value={moverQtd}
                                                onChange={(e) => setMoverQtd(Math.min(qtd, Math.max(1, parseInt(e.target.value) || 1)))}
                                                slotProps={{ input: { inputProps: { min: 1, max: qtd } } }}
                                                sx={{ width: 84 }}
                                            />
                                            <Button size="small" variant="contained" onClick={handleMover} disabled={busy || !moverPara || moverQtd <= 0} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
                                                Mover
                                            </Button>
                                            <Button size="small" onClick={() => setMoverDe(null)} sx={{ textTransform: 'none' }}>
                                                Cancelar
                                            </Button>
                                        </Box>
                                    </Collapse>
                                </Box>
                            );
                        })}
                    </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Adicionar */}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Add fontSize="small" color="success" />
                    Guardar em um local
                    {resumo.semLocal > 0 && (
                        <Chip label={`${resumo.semLocal} sem local`} size="small" color="warning" sx={{ ml: 0.5, height: 20, fontWeight: 700, fontSize: '0.68rem' }} />
                    )}
                </Typography>

                {semLocais ? (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                        Nenhum local cadastrado ainda. Cadastre prateleiras, box, gavetas e armários na tela <strong>Locais</strong>.
                    </Alert>
                ) : (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                        <Autocomplete
                            size="small"
                            options={locais}
                            groupBy={(o) => o.tipo_label || o.tipo}
                            getOptionLabel={(o) => o.nome || ''}
                            isOptionEqualToValue={(a, b) => a.id === b.id}
                            value={novoLocal}
                            onChange={(_, v) => setNovoLocal(v)}
                            renderOption={renderOption}
                            renderInput={(params) => <TextField {...params} label="Local" placeholder="Ex.: Prateleira 01, Box 03..." />}
                            sx={{ flex: 1, minWidth: 200 }}
                            disabled={busy || resumo.unidadesDemop === 0}
                            noOptionsText="Nenhum local encontrado"
                        />
                        <TextField
                            size="small"
                            type="number"
                            label="Qtd"
                            value={novaQtd}
                            onChange={(e) => setNovaQtd(Math.max(1, parseInt(e.target.value) || 1))}
                            slotProps={{ input: { inputProps: { min: 1, max: Math.max(1, resumo.semLocal) } } }}
                            sx={{ width: 90 }}
                            disabled={busy || resumo.unidadesDemop === 0}
                        />
                        <Button
                            variant="contained"
                            color="success"
                            onClick={handleAdicionar}
                            disabled={busy || !novoLocal || resumo.unidadesDemop === 0}
                            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <Add />}
                            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, whiteSpace: 'nowrap', px: 2, height: 40 }}
                        >
                            Guardar
                        </Button>
                    </Box>
                )}

                {novoLocal && (
                    <Box sx={{ mt: 1 }}>
                        <LocalChip local={novoLocal} completo />
                        {novoLocal.observacao && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{novoLocal.observacao}</Typography>
                        )}
                    </Box>
                )}

                <Collapse in={Boolean(msg)}>
                    {msg && (
                        <Alert severity={msg.tipo} sx={{ mt: 2, borderRadius: 2 }} onClose={() => setMsg(null)}>
                            {msg.texto}
                        </Alert>
                    )}
                </Collapse>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}` }}>
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                    Cautela e devolução não alteram o local: ele indica onde o material fica guardado.
                </Typography>
                <Button onClick={onClose} variant="outlined" disabled={busy} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                    Fechar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
