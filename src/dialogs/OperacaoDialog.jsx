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
    Divider,
    IconButton,
    MenuItem,
    TextField,
    Tooltip,
    Typography,
    alpha,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { Add, Close, DeleteOutline, LinkOutlined, NotesOutlined } from '@mui/icons-material';
import OperacaoIcone, { IconeOperacao } from '../components/operacoes/OperacaoIcone';
import { CATEGORIAS_OPERACAO, CORES_OPERACAO, ICONES_OPERACAO, TIPOS_LINK, atualizarOperacao, criarOperacao, gerarId } from '../services/operacoesService';

const vazio = () => ({
    nome: '', subtitulo: '', categoria: 'operacao', icone: 'evento', cor: '#1e3a5f',
    nota: '', boletim: '', folhas: '', vigencia: '', descricao: '', ordem: '',
    links: [], observacoes: [],
});

/**
 * Cadastro/edição da operação (dados da nota, links do Drive e observações).
 * As seções de material são editadas na própria tela de detalhe.
 */
export default function OperacaoDialog({ open, onClose, operacao = null, user, onSaved }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const editando = Boolean(operacao?.id);

    const [f, setF] = useState(vazio());
    const [busy, setBusy] = useState(false);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        if (!open) return;
        setF(operacao ? {
            ...vazio(),
            ...operacao,
            ordem: operacao.ordem ?? '',
            links: (operacao.links || []).map((l) => ({ ...l })),
            observacoes: (operacao.observacoes || []).map((o) => ({ ...o })),
        } : vazio());
        setErro(null);
    }, [open, operacao]);

    const set = (campo) => (e) => setF((p) => ({ ...p, [campo]: e.target.value }));
    const setLink = (id, campo, valor) => setF((p) => ({ ...p, links: p.links.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)) }));
    const setObs = (id, campo, valor) => setF((p) => ({ ...p, observacoes: p.observacoes.map((o) => (o.id === id ? { ...o, [campo]: valor } : o)) }));

    const salvar = async () => {
        setErro(null);
        setBusy(true);
        try {
            const dados = { ...f, ordem: f.ordem === '' ? (editando ? operacao.ordem : 99) : Number(f.ordem) };
            if (editando) {
                await atualizarOperacao(operacao, dados, user);
                onSaved?.(`"${f.nome.trim()}" atualizada.`, operacao.id);
            } else {
                const id = await criarOperacao({ ...dados, secoes: [] }, user);
                onSaved?.(`"${f.nome.trim()}" cadastrada.`, id);
            }
            onClose();
        } catch (e) {
            console.error(e);
            setErro(e?.message || 'Não foi possível salvar a operação.');
        } finally {
            setBusy(false);
        }
    };

    const cor = f.cor || theme.palette.primary.main;

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md" fullWidth fullScreen={fullScreen} PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 3, overflow: 'hidden' } }}>
            <DialogTitle sx={{ background: `linear-gradient(135deg, ${cor} 0%, ${alpha(cor, 0.75)} 100%)`, color: 'white', display: 'flex', alignItems: 'center', gap: 1.5, py: 2, transition: 'background .3s' }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#fff', 0.18), display: 'flex' }}><IconeOperacao icone={f.icone} /></Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{editando ? 'Editar operação' : 'Nova operação'}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }} noWrap>{f.nome || 'Dados da nota, links do Drive e observações'}</Typography>
                </Box>
                <IconButton onClick={onClose} disabled={busy} sx={{ color: 'white' }} size="small" aria-label="Fechar"><Close /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 2.5, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Identificação */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 1.5, mt: 0.5 }}>
                    <TextField size="small" label="Nome da operação" placeholder="Ex.: Operação Extinctus 2026" value={f.nome} onChange={set('nome')} required autoFocus={!editando} />
                    <TextField size="small" select label="Grupo" value={f.categoria} onChange={set('categoria')}>
                        {CATEGORIAS_OPERACAO.map((c) => <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>)}
                    </TextField>
                </Box>
                <TextField size="small" label="Subtítulo" placeholder="Ex.: Fogo em vegetação / estiagem" value={f.subtitulo} onChange={set('subtitulo')} />

                {/* Aparência */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField size="small" select label="Ícone" value={f.icone} onChange={set('icone')} sx={{ minWidth: 200 }}>
                        {ICONES_OPERACAO.map((i) => (
                            <MenuItem key={i.key} value={i.key}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><IconeOperacao icone={i.key} fontSize="small" /> {i.label}</Box>
                            </MenuItem>
                        ))}
                    </TextField>
                    <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {CORES_OPERACAO.map((c) => (
                            <Tooltip key={c} title={c}>
                                <Box
                                    onClick={() => setF((p) => ({ ...p, cor: c }))}
                                    sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: '3px solid', borderColor: f.cor === c ? 'background.paper' : 'transparent', boxShadow: f.cor === c ? `0 0 0 2px ${c}` : 'none', transition: 'transform .15s', '&:hover': { transform: 'scale(1.12)' } }}
                                />
                            </Tooltip>
                        ))}
                        <OperacaoIcone icone={f.icone} cor={f.cor} tamanho={34} variante="solida" sx={{ ml: 0.5 }} />
                    </Box>
                    <TextField size="small" type="number" label="Ordem" value={f.ordem} onChange={set('ordem')} sx={{ width: 90 }} slotProps={{ htmlInput: { min: 0 } }} />
                </Box>

                <Divider />

                {/* Nota */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                    <TextField size="small" label="Nota" placeholder="Ex.: Nota CHEMG 624/2026" value={f.nota} onChange={set('nota')} />
                    <TextField size="small" label="Boletim" placeholder="Ex.: Bol SEDEC/CBMERJ nº 101, de 10/06/2026" value={f.boletim} onChange={set('boletim')} />
                    <TextField size="small" label="Folhas" placeholder="Ex.: fls. 7-11" value={f.folhas} onChange={set('folhas')} />
                    <TextField size="small" label="Vigência" placeholder="Ex.: 09/06/2026 a 15/10/2026" value={f.vigencia} onChange={set('vigencia')} />
                </Box>
                <TextField size="small" label="Descrição" placeholder="Ex.: Plano tático-operacional…" value={f.descricao} onChange={set('descricao')} multiline minRows={2} />

                {/* Links */}
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LinkOutlined fontSize="small" color="primary" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>Links do Drive</Typography>
                        <Button size="small" startIcon={<Add />} onClick={() => setF((p) => ({ ...p, links: [...p.links, { id: gerarId(), rotulo: '', url: '', tipo: 'boletim' }] }))} sx={{ textTransform: 'none', fontWeight: 700 }}>
                            Adicionar link
                        </Button>
                    </Box>
                    {f.links.length === 0 && <Typography variant="caption" color="text.secondary">Nenhum link. Adicione o boletim e, se houver, a nota recortada no Livro de Ordens.</Typography>}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {f.links.map((l) => (
                            <Box key={l.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '150px 1fr 2fr auto' }, gap: 1, alignItems: 'center', p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.03), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                                <TextField size="small" select label="Tipo" value={l.tipo || 'outro'} onChange={(e) => setLink(l.id, 'tipo', e.target.value)}>
                                    {TIPOS_LINK.map((t) => <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>)}
                                </TextField>
                                <TextField size="small" label="Rótulo" placeholder="Ex.: Boletim" value={l.rotulo} onChange={(e) => setLink(l.id, 'rotulo', e.target.value)} />
                                <TextField size="small" label="URL" placeholder="https://drive.google.com/…" value={l.url} onChange={(e) => setLink(l.id, 'url', e.target.value)} />
                                <IconButton size="small" color="error" onClick={() => setF((p) => ({ ...p, links: p.links.filter((x) => x.id !== l.id) }))} aria-label="Remover link"><DeleteOutline fontSize="small" /></IconButton>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Observações */}
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <NotesOutlined fontSize="small" color="primary" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>Outras determinações da nota</Typography>
                        <Button size="small" startIcon={<Add />} onClick={() => setF((p) => ({ ...p, observacoes: [...p.observacoes, { id: gerarId(), titulo: '', texto: '' }] }))} sx={{ textTransform: 'none', fontWeight: 700 }}>
                            Adicionar
                        </Button>
                    </Box>
                    {f.observacoes.length === 0 && <Typography variant="caption" color="text.secondary">Ex.: composição da GRD, uniforme, EPI, determinações de logística.</Typography>}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {f.observacoes.map((o) => (
                            <Box key={o.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '220px 1fr auto' }, gap: 1, alignItems: 'start', p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.03), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                                <TextField size="small" label="Título" placeholder="Ex.: GRD (item 6.1)" value={o.titulo} onChange={(e) => setObs(o.id, 'titulo', e.target.value)} />
                                <TextField size="small" label="Texto" value={o.texto} onChange={(e) => setObs(o.id, 'texto', e.target.value)} multiline minRows={1} />
                                <IconButton size="small" color="error" onClick={() => setF((p) => ({ ...p, observacoes: p.observacoes.filter((x) => x.id !== o.id) }))} aria-label="Remover observação"><DeleteOutline fontSize="small" /></IconButton>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {erro && <Alert severity="error" sx={{ borderRadius: 2 }}>{erro}</Alert>}
            </DialogContent>

            <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, pt: 1 }}>
                <Button onClick={onClose} disabled={busy} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" onClick={salvar} disabled={busy || !f.nome.trim()} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3 }}>
                    {editando ? 'Salvar' : 'Cadastrar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
