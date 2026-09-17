import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography, alpha, useTheme } from '@mui/material';
import { Close, CategoryOutlined } from '@mui/icons-material';
import { criarCategoria, materiaisDaCategoria, nomeCategoria, normalizarNomeCategoria, renomearCategoria } from '../services/categoriaService';

/**
 * Cria ou renomeia uma categoria. Ao renomear, o nome novo é propagado para todos os
 * materiais da categoria (mostra quantos serão atualizados antes de salvar).
 */
export default function CategoriaDialog({ open, onClose, categoria = null, categorias = [], materials = [], user, onSaved }) {
    const theme = useTheme();
    const editando = Boolean(categoria?.id);
    const [nome, setNome] = useState('');
    const [busy, setBusy] = useState(false);
    const [erro, setErro] = useState(null);

    useEffect(() => { if (open) { setNome(nomeCategoria(categoria)); setErro(null); } }, [open, categoria]);

    const nomeNorm = normalizarNomeCategoria(nome);
    const duplicada = useMemo(() => categorias.find((c) => c.id !== categoria?.id && nomeCategoria(c).toLowerCase() === nomeNorm.toLowerCase()), [categorias, categoria, nomeNorm]);
    const afetados = useMemo(() => (editando ? materiaisDaCategoria(categoria, materials).length : 0), [editando, categoria, materials]);
    const semMudanca = editando && nomeNorm === nomeCategoria(categoria);

    const salvar = async () => {
        setErro(null); setBusy(true);
        try {
            if (editando) {
                const r = await renomearCategoria(categoria, nomeNorm, materials, user);
                onSaved?.(`Categoria renomeada para ${nomeNorm}${r.materiais ? ` · ${r.materiais} material(is) atualizado(s)` : ''}.`, { id: categoria.id, description: nomeNorm });
            } else {
                const c = await criarCategoria(nomeNorm, user);
                onSaved?.(c.jaExistia ? `A categoria ${nomeNorm} já existia.` : `Categoria ${nomeNorm} criada.`, c);
            }
            onClose();
        } catch (e) {
            console.error(e);
            setErro(e?.message || 'Não foi possível salvar a categoria.');
        } finally {
            setBusy(false);
        }
    };

    const cor = theme.palette.primary.main;
    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
            <DialogTitle sx={{ background: `linear-gradient(135deg, ${cor} 0%, ${alpha(cor, 0.75)} 100%)`, color: '#fff', display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#fff', 0.18), display: 'flex' }}><CategoryOutlined /></Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{editando ? 'Renomear categoria' : 'Nova categoria'}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>{editando ? 'O nome novo vai para todos os materiais dela' : 'Fica disponível na hora no cadastro de material'}</Typography>
                </Box>
                <IconButton onClick={onClose} disabled={busy} sx={{ color: '#fff' }} size="small" aria-label="Fechar"><Close /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 2.5, sm: 3 } }}>
                <TextField
                    label="Nome da categoria"
                    placeholder="Ex.: MATERIAIS DE SALVAMENTO"
                    value={nome}
                    onChange={(e) => setNome(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter' && nomeNorm && !duplicada && !semMudanca) salvar(); }}
                    autoFocus
                    fullWidth
                    size="small"
                    error={Boolean(duplicada)}
                    helperText={duplicada ? `Já existe a categoria "${nomeCategoria(duplicada)}".` : 'Gravado em caixa alta.'}
                    slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
                    sx={{ mt: 0.5 }}
                />
                {editando && afetados > 0 && !semMudanca && (
                    <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                        {afetados} material(is) passará(ão) a mostrar o nome novo.
                    </Alert>
                )}
                {erro && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{erro}</Alert>}
            </DialogContent>
            <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, pt: 1 }}>
                <Button onClick={onClose} disabled={busy} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" onClick={salvar} disabled={busy || !nomeNorm || Boolean(duplicada) || semMudanca} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3 }}>
                    {editando ? 'Salvar' : 'Criar categoria'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
