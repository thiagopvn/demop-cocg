import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography, alpha, useTheme } from '@mui/material';
import { Close, Category } from '@mui/icons-material';
import { CampoCaixaAlta } from '../components/orcamento/CamposOrcamento';
import { adicionarSetor } from '../services/orcamentoService';

/**
 * Cria um setor de destino sem passar pelo lançamento de nota
 * (botão "Novo setor" na aba Notas fiscais; a aba Setores faz a gestão completa).
 */
export default function SetorDialog({ open, onClose, setores = [], user, onSaved }) {
    const theme = useTheme();
    const [nome, setNome] = useState('');
    const [busy, setBusy] = useState(false);
    const [erro, setErro] = useState(null);

    useEffect(() => { if (open) { setNome(''); setErro(null); } }, [open]);

    const jaExiste = setores.some((s) => s.nome === nome.trim());

    const salvar = async () => {
        setErro(null);
        setBusy(true);
        try {
            const n = await adicionarSetor(nome, setores, user);
            onSaved?.(`Setor ${n} criado.`, n);
            onClose();
        } catch (e) {
            console.error(e);
            setErro(e?.message || 'Não foi possível criar o setor.');
        } finally {
            setBusy(false);
        }
    };

    const cor = theme.palette.primary.main;
    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
            <DialogTitle sx={{ background: `linear-gradient(135deg, ${cor} 0%, ${alpha(cor, 0.75)} 100%)`, color: 'white', display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#fff', 0.18), display: 'flex' }}><Category /></Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Novo setor de destino</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>Passa a aparecer em "Destino da compra"</Typography>
                </Box>
                <IconButton onClick={onClose} disabled={busy} sx={{ color: 'white' }} size="small" aria-label="Fechar"><Close /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 2.5, sm: 3 } }}>
                <CampoCaixaAlta
                    label="Nome do setor"
                    placeholder="Ex.: SUBCOMANDO, ALMOXARIFADO"
                    value={nome}
                    onChange={setNome}
                    autoFocus
                    fullWidth
                    onKeyDown={(e) => { if (e.key === 'Enter' && nome.trim() && !jaExiste) salvar(); }}
                    helperText={jaExiste ? 'Esse setor já existe.' : ' '}
                    error={jaExiste}
                    sx={{ mt: 0.5 }}
                />
                {setores.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Já cadastrados</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {setores.map((s) => <Chip key={s.id} label={s.nome} size="small" sx={{ fontWeight: 600 }} />)}
                        </Box>
                    </Box>
                )}
                {erro && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{erro}</Alert>}
            </DialogContent>
            <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, pt: 1 }}>
                <Button onClick={onClose} disabled={busy} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" onClick={salvar} disabled={busy || !nome.trim() || jaExiste} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3 }}>
                    Criar setor
                </Button>
            </DialogActions>
        </Dialog>
    );
}
