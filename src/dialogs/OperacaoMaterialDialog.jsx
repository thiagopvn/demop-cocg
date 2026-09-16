import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Autocomplete,
    Avatar,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    MenuItem,
    TextField,
    Typography,
    alpha,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { Close, Inventory2Outlined, LinkOutlined } from '@mui/icons-material';
import MaterialLocalHint from '../components/locais/MaterialLocalHint';
import { normalizarItem, salvarSecoes, sugerirMaterial } from '../services/operacoesService';

const NOVA_SECAO = '__nova__';

/**
 * Inclui ou edita um material previsto numa operação (só admingeral).
 * A quantidade é a fixada pela nota; o vínculo com o material do DEMOP traz
 * nome/foto/local em tempo real na tela.
 */
export default function OperacaoMaterialDialog({ open, onClose, operacao, item = null, secaoId = null, materials = [], user, onSaved }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const editando = Boolean(item?.id);

    const [nome, setNome] = useState('');
    const [quantidade, setQuantidade] = useState('');
    const [semQuantidade, setSemQuantidade] = useState(false);
    const [unidade, setUnidade] = useState('');
    const [observacao, setObservacao] = useState('');
    const [sinonimos, setSinonimos] = useState('');
    const [materialSel, setMaterialSel] = useState(null);
    const [secao, setSecao] = useState('');
    const [novaSecaoTitulo, setNovaSecaoTitulo] = useState('');
    const [novaSecaoRef, setNovaSecaoRef] = useState('');
    const [busy, setBusy] = useState(false);
    const [erro, setErro] = useState(null);

    const secoes = operacao?.secoes || [];

    useEffect(() => {
        if (!open) return;
        setNome(item?.nome || '');
        setQuantidade(item?.quantidade ?? '');
        setSemQuantidade(item ? item.quantidade === null || item.quantidade === undefined : false);
        setUnidade(item?.unidade || '');
        setObservacao(item?.observacao || '');
        setSinonimos((item?.sinonimos || []).join(', '));
        setMaterialSel(item?.material_id ? (materials.find((m) => m.id === item.material_id) || null) : null);
        const secaoInicial = item?.secaoId || secaoId || secoes[0]?.id || NOVA_SECAO;
        setSecao(secaoInicial);
        setNovaSecaoTitulo('');
        setNovaSecaoRef('');
        setErro(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const sugestao = useMemo(() => (materialSel ? null : sugerirMaterial(nome, materials, { sinonimos })), [nome, sinonimos, materials, materialSel]);

    const opcoes = useMemo(() => [...materials].sort((a, b) => (a.description || '').localeCompare(b.description || '', 'pt-BR')), [materials]);

    const salvar = async () => {
        setErro(null);
        if (!nome.trim()) { setErro('Informe o nome do material como consta na nota.'); return; }
        if (secao === NOVA_SECAO && !novaSecaoTitulo.trim()) { setErro('Informe o título da nova seção.'); return; }
        if (!semQuantidade && quantidade !== '' && !(Number(quantidade) >= 0)) { setErro('Quantidade inválida.'); return; }

        const novoItem = normalizarItem({
            id: item?.id,
            nome,
            quantidade: semQuantidade ? null : (quantidade === '' ? null : Number(quantidade)),
            unidade,
            observacao,
            sinonimos,
            material_id: materialSel?.id || null,
        });

        // Remove o item de onde estava e insere na seção escolhida (mantendo a posição se for a mesma).
        let novas = secoes.map((s) => ({ ...s, itens: [...(s.itens || [])] }));
        let destinoId = secao;
        if (secao === NOVA_SECAO) {
            const nova = { id: undefined, titulo: novaSecaoTitulo, referencia: novaSecaoRef, itens: [] };
            novas.push(nova);
            destinoId = null;
        }
        let inserido = false;
        novas = novas.map((s) => {
            const idx = s.itens.findIndex((i) => i.id === novoItem.id);
            const ehDestino = destinoId ? s.id === destinoId : s.id === undefined;
            if (idx >= 0 && ehDestino) { s.itens[idx] = novoItem; inserido = true; }
            else if (idx >= 0) s.itens.splice(idx, 1);
            return s;
        });
        if (!inserido) {
            const alvo = novas.find((s) => (destinoId ? s.id === destinoId : s.id === undefined));
            alvo?.itens.push(novoItem);
        }

        setBusy(true);
        try {
            await salvarSecoes(operacao, novas, user, { acao: editando ? 'editar_item' : 'incluir_item', item: novoItem.nome, quantidade: novoItem.quantidade, material_id: novoItem.material_id });
            onSaved?.(editando ? `"${novoItem.nome}" atualizado.` : `"${novoItem.nome}" incluído na operação.`);
            onClose();
        } catch (e) {
            console.error(e);
            setErro(e?.message || 'Não foi possível salvar o material.');
        } finally {
            setBusy(false);
        }
    };

    const cor = operacao?.cor || theme.palette.primary.main;

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth fullScreen={fullScreen} PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 3, overflow: 'hidden' } }}>
            <DialogTitle sx={{ background: `linear-gradient(135deg, ${cor} 0%, ${alpha(cor, 0.75)} 100%)`, color: 'white', display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#fff', 0.18), display: 'flex' }}><Inventory2Outlined /></Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{editando ? 'Editar material previsto' : 'Incluir material previsto'}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }} noWrap>{operacao?.nome}</Typography>
                </Box>
                <IconButton onClick={onClose} disabled={busy} sx={{ color: 'white' }} size="small" aria-label="Fechar"><Close /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 2.5, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    select
                    size="small"
                    label="Seção da nota"
                    value={secao}
                    onChange={(e) => setSecao(e.target.value)}
                    sx={{ mt: 0.5 }}
                >
                    {secoes.map((s) => <MenuItem key={s.id} value={s.id}>{s.titulo}{s.referencia ? ` · ${s.referencia}` : ''}</MenuItem>)}
                    <MenuItem value={NOVA_SECAO}>+ Nova seção…</MenuItem>
                </TextField>
                {secao === NOVA_SECAO && (
                    <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <TextField size="small" label="Título da seção" placeholder="Ex.: Material por GRD" value={novaSecaoTitulo} onChange={(e) => setNovaSecaoTitulo(e.target.value)} fullWidth />
                        <TextField size="small" label="Referência na nota" placeholder="Ex.: item 5.4.3" value={novaSecaoRef} onChange={(e) => setNovaSecaoRef(e.target.value)} fullWidth />
                    </Box>
                )}

                <TextField
                    size="small"
                    label="Material como consta na nota"
                    placeholder="Ex.: Rádio portátil c/ bateria reserva"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    autoFocus={!editando}
                    required
                />

                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexDirection: { xs: 'column', sm: 'row' } }}>
                    <TextField
                        size="small"
                        type="number"
                        label="Quantidade prevista"
                        value={semQuantidade ? '' : quantidade}
                        onChange={(e) => setQuantidade(e.target.value)}
                        disabled={semQuantidade}
                        slotProps={{ htmlInput: { min: 0, inputMode: 'numeric' } }}
                        sx={{ width: { xs: '100%', sm: 170 } }}
                    />
                    <TextField
                        size="small"
                        label="Unidade / observação de medida"
                        placeholder="Ex.: pares, por militar, rolo"
                        value={unidade}
                        onChange={(e) => setUnidade(e.target.value)}
                        fullWidth
                    />
                </Box>
                <FormControlLabel
                    control={<Checkbox size="small" checked={semQuantidade} onChange={(e) => setSemQuantidade(e.target.checked)} />}
                    label={<Typography variant="body2">Item de checklist (a nota não fixa quantidade)</Typography>}
                    sx={{ mt: -1 }}
                />

                <TextField
                    size="small"
                    label="Observação"
                    placeholder="Ex.: com par de remos e motor de rabeta abastecido"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    multiline
                    minRows={1}
                />
                <TextField
                    size="small"
                    label="Outros nomes usados no estoque"
                    placeholder="Ex.: bomba costal, mochila de combate (separe por vírgula)"
                    value={sinonimos}
                    onChange={(e) => setSinonimos(e.target.value)}
                    helperText="Ajuda a encontrar o material do DEMOP quando a nota usa outro nome."
                />

                {/* Vínculo com o estoque */}
                <Box sx={{ p: 1.75, borderRadius: 2.5, border: `1px dashed ${alpha(theme.palette.primary.main, 0.4)}`, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <LinkOutlined fontSize="small" /> Vínculo com o material do DEMOP
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        O nome, a foto e o local de guarda passam a vir do cadastro em tempo real. A quantidade continua sendo a da nota.
                    </Typography>
                    <Autocomplete
                        size="small"
                        options={opcoes}
                        value={materialSel}
                        onChange={(_, v) => setMaterialSel(v)}
                        getOptionLabel={(o) => o?.description || ''}
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                        noOptionsText="Nenhum material encontrado"
                        renderOption={(props, o) => {
                            const { key, ...rest } = props;
                            return (
                                <Box component="li" key={key} {...rest} sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
                                    <Avatar variant="rounded" src={o.image_url || undefined} sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}><Inventory2Outlined sx={{ fontSize: 16 }} /></Avatar>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography variant="body2" noWrap>{o.description}</Typography>
                                        <Typography variant="caption" color="text.secondary">{o.categoria || 'Sem categoria'} · {Number(o.estoque_atual) || 0} disponível(is){Number(o.estoque_viatura) > 0 ? ` · ${o.estoque_viatura} em viatura` : ''}</Typography>
                                    </Box>
                                </Box>
                            );
                        }}
                        renderInput={(params) => <TextField {...params} label="Material do estoque" placeholder="Digite para buscar…" />}
                    />
                    {!materialSel && sugestao && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.25, flexWrap: 'wrap' }}>
                            <Typography variant="caption" color="text.secondary">Parece ser <strong>{sugestao.material.description}</strong>.</Typography>
                            <Button size="small" onClick={() => setMaterialSel(sugestao.material)} sx={{ textTransform: 'none', fontWeight: 700, py: 0, minWidth: 0 }}>Usar este</Button>
                        </Box>
                    )}
                    {materialSel && (
                        <MaterialLocalHint materialId={materialSel.id} titulo="Onde está no DEMOP" compact sx={{ mt: 1.25 }} />
                    )}
                </Box>

                {erro && <Alert severity="error" sx={{ borderRadius: 2 }}>{erro}</Alert>}
            </DialogContent>

            <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, pt: 1 }}>
                <Button onClick={onClose} disabled={busy} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" onClick={salvar} disabled={busy || !nome.trim()} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3 }}>
                    {editando ? 'Salvar' : 'Incluir'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
