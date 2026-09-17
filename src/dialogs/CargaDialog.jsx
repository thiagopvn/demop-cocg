import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, ToggleButton, ToggleButtonGroup, Typography, alpha } from '@mui/material';
import { Close, LocalFireDepartmentOutlined, Add, Remove } from '@mui/icons-material';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import db from '../firebase/db';
import { logAudit } from '../firebase/auditLog';
import { CORES_CARGA, getQtdVazios, getDisponivel } from '../utils/carga';

/**
 * Registra quantas unidades disponíveis de um extintor/cilindro estão vazias
 * (aguardando recarga). Não mexe em estoque, inoperância nem reparo.
 */
export default function CargaDialog({ open, onClose, material, user, onSaved }) {
    const disponivel = getDisponivel(material);
    const [vazios, setVazios] = useState(0);
    const [motivo, setMotivo] = useState('');
    const [busy, setBusy] = useState(false);
    const [erro, setErro] = useState(null);

    useEffect(() => { if (open) { setVazios(getQtdVazios(material)); setMotivo(''); setErro(null); } }, [open, material]);

    const v = Math.max(0, Math.min(Number(vazios) || 0, disponivel));
    const cheios = disponivel - v;
    const antes = getQtdVazios(material);

    const salvar = async () => {
        setBusy(true); setErro(null);
        try {
            await updateDoc(doc(db, 'materials', material.id), {
                qtd_vazios: v,
                controla_carga: true,
                carga_atualizada_em: serverTimestamp(),
                carga_atualizada_por: user?.userName || null,
            });
            logAudit({
                action: 'material_carga',
                userId: user?.userId, userName: user?.userName,
                targetCollection: 'materials', targetId: material.id, targetName: material.description,
                details: { alteracoes: [{ campo: 'qtd_vazios', de: antes, para: v }], cheios, disponivel, motivo: motivo || null },
            });
            onSaved?.(v === 0 ? `${material.description}: todas as ${disponivel} unidades disponíveis estão cheias.` : `${material.description}: ${v} vazio(s) e ${cheios} cheio(s).`);
            onClose();
        } catch (e) {
            console.error(e);
            setErro(e?.message || 'Não foi possível registrar.');
        } finally {
            setBusy(false);
        }
    };

    const cor = v === 0 ? CORES_CARGA.cheio : cheios === 0 ? CORES_CARGA.critico : CORES_CARGA.vazio;

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
            <DialogTitle sx={{ background: `linear-gradient(135deg, ${cor} 0%, ${alpha(cor, 0.7)} 100%)`, color: '#fff', display: 'flex', alignItems: 'center', gap: 1.5, py: 2, transition: 'background .3s' }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#fff', 0.18), display: 'flex' }}><LocalFireDepartmentOutlined /></Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Cheios e vazios</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }} noWrap>{material?.description}</Typography>
                </Box>
                <IconButton onClick={onClose} disabled={busy} sx={{ color: '#fff' }} size="small" aria-label="Fechar"><Close /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 2.5, sm: 3 } }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {disponivel} unidade(s) disponíveis no DEMOP. Informe quantas estão <strong>vazias</strong> (descarregadas, aguardando recarga). Vazio não é inoperante: o material continua íntegro.
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 2 }}>
                    <IconButton onClick={() => setVazios(Math.max(0, v - 1))} disabled={v <= 0} sx={{ border: '1px solid', borderColor: 'divider' }} aria-label="Menos um vazio"><Remove /></IconButton>
                    <TextField
                        type="number"
                        value={vazios}
                        onChange={(e) => setVazios(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={() => setVazios(v)}
                        slotProps={{ htmlInput: { min: 0, max: disponivel, style: { textAlign: 'center', fontSize: '1.6rem', fontWeight: 800, width: 90 } } }}
                        size="small"
                    />
                    <IconButton onClick={() => setVazios(Math.min(disponivel, v + 1))} disabled={v >= disponivel} sx={{ border: '1px solid', borderColor: 'divider' }} aria-label="Mais um vazio"><Add /></IconButton>
                </Box>

                <ToggleButtonGroup exclusive size="small" fullWidth value={v === 0 ? 'nenhum' : v === disponivel ? 'todos' : null} onChange={(_, val) => { if (val === 'nenhum') setVazios(0); if (val === 'todos') setVazios(disponivel); }} sx={{ mb: 2 }}>
                    <ToggleButton value="nenhum" sx={{ textTransform: 'none', fontWeight: 700 }}>Todos cheios</ToggleButton>
                    <ToggleButton value="todos" sx={{ textTransform: 'none', fontWeight: 700 }}>Todos vazios</ToggleButton>
                </ToggleButtonGroup>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: alpha(cor, 0.06), border: `1px solid ${alpha(cor, 0.3)}`, mb: 2 }}>
                    <Box sx={{ textAlign: 'center', flex: 1 }}><Typography variant="h5" sx={{ fontWeight: 900, color: CORES_CARGA.cheio, lineHeight: 1 }}>{cheios}</Typography><Typography variant="caption" color="text.secondary">cheios</Typography></Box>
                    <Box sx={{ flex: 3, display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', bgcolor: alpha('#94a3b8', 0.25) }}>
                        <Box sx={{ flex: cheios, bgcolor: CORES_CARGA.cheio, transition: 'flex .2s' }} />
                        <Box sx={{ flex: v, bgcolor: cor, transition: 'flex .2s' }} />
                    </Box>
                    <Box sx={{ textAlign: 'center', flex: 1 }}><Typography variant="h5" sx={{ fontWeight: 900, color: v ? cor : 'text.disabled', lineHeight: 1 }}>{v}</Typography><Typography variant="caption" color="text.secondary">vazios</Typography></Box>
                </Box>

                <TextField size="small" fullWidth label="Observação (opcional)" placeholder="Ex.: usados no treinamento de 15/09; enviados para recarga" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                {erro && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{erro}</Alert>}
            </DialogContent>
            <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, pt: 1 }}>
                <Button onClick={onClose} disabled={busy} sx={{ borderRadius: 2, textTransform: 'none' }}>Cancelar</Button>
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" onClick={salvar} disabled={busy || v === antes} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3, bgcolor: cor, '&:hover': { bgcolor: alpha(cor, 0.85) } }}>
                    Registrar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
