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
    Close,
    Add,
    Remove,
    Delete,
    SwapHoriz,
    Edit,
    Tune,
    ReportProblem,
    Inventory,
} from '@mui/icons-material';
import {
    getTipoInfo,
    resumirLocalizacao,
    adicionarNoLocal,
    definirQuantidadeNoLocal,
    moverEntreLocais,
} from '../services/localizacaoService';
import { TipoLocalIcon } from '../components/locais/LocalChip';

/**
 * Conteudo de um local: quais materiais estao guardados nele, com acoes rapidas.
 *
 * @param local            documento do local
 * @param alocacoes        linhas de material_locais deste local (tempo real, vindas da tela)
 * @param alocacoesPorMaterial  Map material_id -> todas as alocacoes (para calcular "sem local")
 * @param materials        lista completa de materiais (useMaterials)
 * @param locais           todos os locais (destinos de "mover")
 * @param onGerenciarMaterial(material)  abre o MaterialLocalDialog
 * @param onEditarLocal(local)
 */
export default function LocalConteudoDialog({
    open,
    onClose,
    local,
    alocacoes = [],
    alocacoesPorMaterial,
    materials = [],
    locais = [],
    loggedUserId,
    loggedUserName,
    onGerenciarMaterial,
    onEditarLocal,
}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const info = getTipoInfo(local?.tipo, local?.tipo_label);
    const cor = info.cor;

    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const [novoMaterial, setNovoMaterial] = useState(null);
    const [novaQtd, setNovaQtd] = useState(1);
    const [moverDe, setMoverDe] = useState(null);
    const [moverPara, setMoverPara] = useState(null);
    const [moverQtd, setMoverQtd] = useState(1);

    const materialsById = useMemo(() => new Map(materials.map(m => [m.id, m])), [materials]);

    useEffect(() => {
        if (!open) return;
        setMsg(null);
        setNovoMaterial(null);
        setNovaQtd(1);
        setMoverDe(null);
        setMoverPara(null);
    }, [open, local?.id]);

    const linhas = useMemo(() => {
        return [...alocacoes]
            .map(a => {
                const material = materialsById.get(a.material_id) || { id: a.material_id, description: a.material_description, categoria: a.categoria };
                const resumo = resumirLocalizacao(material, alocacoesPorMaterial?.get(a.material_id) || [a]);
                return { aloc: a, material, resumo };
            })
            .sort((x, y) => (x.material.description || '').localeCompare(y.material.description || '', 'pt-BR'));
    }, [alocacoes, materialsById, alocacoesPorMaterial]);

    const totalUnidades = linhas.reduce((acc, l) => acc + (Number(l.aloc.quantidade) || 0), 0);

    const opcoesMateriais = useMemo(() => {
        const jaAqui = new Set(alocacoes.map(a => a.material_id));
        return materials
            .map(m => ({ material: m, resumo: resumirLocalizacao(m, alocacoesPorMaterial?.get(m.id) || []) }))
            .filter(o => o.resumo.unidadesDemop > 0)
            .sort((a, b) => {
                const sa = a.resumo.semLocal > 0 ? 0 : 1;
                const sb = b.resumo.semLocal > 0 ? 0 : 1;
                if (sa !== sb) return sa - sb;
                return (a.material.description || '').localeCompare(b.material.description || '', 'pt-BR');
            })
            .map(o => ({ ...o, jaAqui: jaAqui.has(o.material.id) }));
    }, [materials, alocacoesPorMaterial, alocacoes]);

    const user = { userId: loggedUserId, userName: loggedUserName };
    const executar = async (fn, sucesso) => {
        setBusy(true);
        setMsg(null);
        try {
            const r = await fn();
            if (sucesso) setMsg({ tipo: 'success', texto: typeof sucesso === 'function' ? sucesso(r) : sucesso });
        } catch (e) {
            console.error(e);
            setMsg({ tipo: 'error', texto: e?.message || 'Não foi possível salvar.' });
        } finally {
            setBusy(false);
        }
    };

    const handleAdicionar = () => {
        if (!novoMaterial) return;
        const qtd = Math.max(0, Math.floor(Number(novaQtd) || 0));
        if (qtd <= 0) return;
        if (qtd > novoMaterial.resumo.semLocal) {
            return setMsg({ tipo: 'warning', texto: `"${novoMaterial.material.description}" tem só ${novoMaterial.resumo.semLocal} unidade(s) sem local. Para trazer mais, mova a partir do outro local.` });
        }
        executar(
            () => adicionarNoLocal({ material: novoMaterial.material, local, quantidade: qtd, ...user }),
            `${qtd} un. de "${novoMaterial.material.description}" guardada(s) em ${local.nome}.`
        ).then(() => { setNovoMaterial(null); setNovaQtd(1); });
    };

    const handleSetQtd = (linha, valor) => {
        const nova = Math.max(0, Math.floor(Number(valor) || 0));
        const atual = Number(linha.aloc.quantidade) || 0;
        if (nova === atual) return;
        const outras = linha.resumo.alocadas - atual;
        if (outras + nova > linha.resumo.unidadesDemop) {
            return setMsg({ tipo: 'warning', texto: `Máximo aqui: ${Math.max(0, linha.resumo.unidadesDemop - outras)} (o DEMOP tem ${linha.resumo.unidadesDemop} un. deste material).` });
        }
        executar(
            () => definirQuantidadeNoLocal({ material: linha.material, local, quantidade: nova, ...user }),
            nova === 0 ? `"${linha.material.description}" removido de ${local.nome}.` : `"${linha.material.description}": ${nova} un.`
        );
    };

    const handleMover = () => {
        if (!moverDe || !moverPara) return;
        const qtd = Math.max(0, Math.floor(Number(moverQtd) || 0));
        if (qtd <= 0) return;
        executar(
            () => moverEntreLocais({ material: moverDe.material, deLocal: local, paraLocal: moverPara, quantidade: qtd, ...user }),
            `${qtd} un. de "${moverDe.material.description}" movida(s) para ${moverPara.nome}.`
        ).then(() => { setMoverDe(null); setMoverPara(null); });
    };

    if (!local) return null;

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, overflow: 'hidden' } }}>
            <DialogTitle sx={{ background: `linear-gradient(135deg, ${cor} 0%, ${alpha(cor, 0.72)} 100%)`, color: 'white', display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#fff', 0.18), display: 'flex' }}>
                    <TipoLocalIcon tipo={local.tipo} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{local.nome}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }} noWrap>
                        {linhas.length} materia{linhas.length === 1 ? 'l' : 'is'} · {totalUnidades} unidade{totalUnidades === 1 ? '' : 's'}
                        {local.observacao ? ` · ${local.observacao}` : ''}
                    </Typography>
                </Box>
                {local.inoperantes && (
                    <Chip icon={<ReportProblem sx={{ color: 'white !important' }} />} label="Inoperantes" size="small" sx={{ bgcolor: alpha('#000', 0.25), color: 'white', fontWeight: 700 }} />
                )}
                {onEditarLocal && (
                    <Tooltip title="Editar local">
                        <IconButton onClick={() => onEditarLocal(local)} sx={{ color: 'white' }} size="small"><Edit /></IconButton>
                    </Tooltip>
                )}
                <IconButton onClick={onClose} disabled={busy} sx={{ color: 'white' }} size="small"><Close /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, mt: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Inventory fontSize="small" sx={{ color: cor }} />
                    Materiais neste local
                </Typography>

                {linhas.length === 0 ? (
                    <Box sx={{ py: 3, textAlign: 'center', borderRadius: 2, border: `1px dashed ${alpha(cor, 0.4)}`, bgcolor: alpha(cor, 0.03), mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Local vazio</Typography>
                        <Typography variant="caption" color="text.disabled">Adicione um material abaixo.</Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                        {linhas.map((linha) => {
                            const qtd = Number(linha.aloc.quantidade) || 0;
                            const movendo = moverDe?.aloc.id === linha.aloc.id;
                            return (
                                <Box key={linha.aloc.id} sx={{ borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.9)}`, bgcolor: 'background.paper', overflow: 'hidden' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, pl: 1.5, flexWrap: 'wrap' }}>
                                        {linha.material.image_url ? (
                                            <Box component="img" src={linha.material.image_url} alt="" sx={{ width: 34, height: 34, borderRadius: 1, objectFit: 'cover', border: '1px solid', borderColor: 'divider' }} />
                                        ) : (
                                            <Box sx={{ width: 34, height: 34, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Inventory sx={{ fontSize: 16, color: 'text.disabled' }} />
                                            </Box>
                                        )}
                                        <Box sx={{ flex: 1, minWidth: 140 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.25 }}>{linha.material.description}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {linha.material.categoria || 'Sem categoria'} · DEMOP: {linha.resumo.unidadesDemop}
                                                {linha.resumo.semLocal > 0 && <Box component="span" sx={{ color: 'warning.main', fontWeight: 700 }}> · {linha.resumo.semLocal} sem local</Box>}
                                                {linha.resumo.excedente > 0 && <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}> · {linha.resumo.excedente} a ajustar</Box>}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                            <IconButton size="small" disabled={busy} onClick={() => handleSetQtd(linha, qtd - 1)}><Remove fontSize="small" /></IconButton>
                                            <Chip label={qtd} size="small" sx={{ fontWeight: 800, minWidth: 40, bgcolor: alpha(cor, 0.12), color: cor }} />
                                            <Tooltip title={linha.resumo.semLocal > 0 ? 'Guardar +1' : 'Sem unidades sem local'}>
                                                <span><IconButton size="small" disabled={busy || linha.resumo.semLocal <= 0} onClick={() => handleSetQtd(linha, qtd + 1)}><Add fontSize="small" /></IconButton></span>
                                            </Tooltip>
                                        </Box>
                                        <Tooltip title="Mover para outro local">
                                            <span>
                                                <IconButton size="small" color={movendo ? 'primary' : 'default'} disabled={busy || locais.length < 2} onClick={() => { setMoverDe(movendo ? null : linha); setMoverPara(null); setMoverQtd(qtd); }}>
                                                    <SwapHoriz fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        {onGerenciarMaterial && (
                                            <Tooltip title="Todos os locais deste material">
                                                <IconButton size="small" onClick={() => onGerenciarMaterial(linha.material)}><Tune fontSize="small" /></IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title="Remover deste local">
                                            <span><IconButton size="small" color="error" disabled={busy} onClick={() => handleSetQtd(linha, 0)}><Delete fontSize="small" /></IconButton></span>
                                        </Tooltip>
                                    </Box>
                                    <Collapse in={movendo}>
                                        <Divider />
                                        <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                                            <Autocomplete
                                                size="small"
                                                options={locais.filter(l => l.id !== local.id)}
                                                groupBy={(o) => o.tipo_label || o.tipo}
                                                getOptionLabel={(o) => o.nome || ''}
                                                isOptionEqualToValue={(a, b) => a.id === b.id}
                                                value={moverPara}
                                                onChange={(_, v) => setMoverPara(v)}
                                                renderInput={(params) => <TextField {...params} label="Mover para" />}
                                                sx={{ flex: 1, minWidth: 180 }}
                                            />
                                            <TextField size="small" type="number" label="Qtd" value={moverQtd} onChange={(e) => setMoverQtd(Math.min(qtd, Math.max(1, parseInt(e.target.value) || 1)))} slotProps={{ input: { inputProps: { min: 1, max: qtd } } }} sx={{ width: 84 }} />
                                            <Button size="small" variant="contained" onClick={handleMover} disabled={busy || !moverPara} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Mover</Button>
                                            <Button size="small" onClick={() => setMoverDe(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
                                        </Box>
                                    </Collapse>
                                </Box>
                            );
                        })}
                    </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Add fontSize="small" color="success" />
                    Guardar material aqui
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                    <Autocomplete
                        size="small"
                        options={opcoesMateriais}
                        getOptionLabel={(o) => o.material.description || ''}
                        isOptionEqualToValue={(a, b) => a.material.id === b.material.id}
                        value={novoMaterial}
                        onChange={(_, v) => { setNovoMaterial(v); setNovaQtd(v ? Math.max(1, v.resumo.semLocal) : 1); }}
                        groupBy={(o) => (o.resumo.semLocal > 0 ? 'Com unidades sem local' : 'Já totalmente guardados')}
                        renderOption={(props, o) => {
                            const { key, ...rest } = props;
                            return (
                                <li key={key} {...rest} style={{ ...rest.style, alignItems: 'flex-start' }}>
                                    <Box sx={{ width: '100%', minWidth: 0 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3, wordBreak: 'break-word' }}>{o.material.description}</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 0.4 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>{o.material.categoria || 'Sem categoria'} · DEMOP {o.resumo.unidadesDemop}</Typography>
                                            {o.jaAqui && <Chip label="já aqui" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />}
                                            {o.resumo.semLocal > 0 && <Chip label={`${o.resumo.semLocal} sem local`} size="small" color="warning" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />}
                                        </Box>
                                    </Box>
                                </li>
                            );
                        }}
                        renderInput={(params) => <TextField {...params} label="Material" placeholder="Buscar material..." />}
                        slotProps={{ listbox: { sx: { maxHeight: { xs: 220, sm: 320 } } } }}
                        sx={{ flex: 1, minWidth: 220 }}
                        disabled={busy}
                        noOptionsText="Nenhum material com unidades no DEMOP"
                    />
                    <TextField size="small" type="number" label="Qtd" value={novaQtd} onChange={(e) => setNovaQtd(Math.max(1, parseInt(e.target.value) || 1))} slotProps={{ input: { inputProps: { min: 1 } } }} sx={{ width: 90 }} disabled={busy} />
                    <Button variant="contained" color="success" onClick={handleAdicionar} disabled={busy || !novoMaterial} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <Add />} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, whiteSpace: 'nowrap', height: 40 }}>
                        Guardar
                    </Button>
                </Box>

                <Collapse in={Boolean(msg)}>
                    {msg && <Alert severity={msg.tipo} sx={{ mt: 2, borderRadius: 2 }} onClose={() => setMsg(null)}>{msg.texto}</Alert>}
                </Collapse>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}` }}>
                <Button onClick={onClose} variant="outlined" disabled={busy} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Fechar</Button>
            </DialogActions>
        </Dialog>
    );
}
