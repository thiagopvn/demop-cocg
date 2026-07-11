import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    TextField,
    MenuItem,
    Button,
    FormControlLabel,
    Checkbox,
    Alert,
    Chip,
} from '@mui/material';
import { Build, Save } from '@mui/icons-material';
import { TIPOS_MANUTENCAO, getTipoManutencaoLabel } from '../../services/compressorService';

/**
 * Diálogo para registrar uma manutenção realizada no compressor.
 * Manutenção preventiva/corretiva reinicia o ciclo de 50h e a contagem de datas.
 */
const CompressorMaintenanceDialog = ({ open, onClose, onSave, status }) => {
    const [tipo, setTipo] = useState('preventiva');
    const [data, setData] = useState('');
    const [observacao, setObservacao] = useState('');
    const [realizadoPor, setRealizadoPor] = useState('');
    const [resetar, setResetar] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setTipo('preventiva');
            setData(new Date().toISOString().split('T')[0]);
            setObservacao('');
            setRealizadoPor('');
            setResetar(true);
            setSaving(false);
        }
    }, [open]);

    // Ao trocar o tipo, sugere o comportamento padrão de reinício de ciclo
    const handleTipo = (novo) => {
        setTipo(novo);
        setResetar(TIPOS_MANUTENCAO[novo]?.resetaCiclo ?? false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({
                tipo,
                data: data ? new Date(data + 'T12:00:00') : new Date(),
                observacao: observacao.trim(),
                realizadoPor: realizadoPor.trim(),
                resetarCiclo: resetar,
            });
            onClose();
        } catch (e) {
            console.error('Erro ao registrar manutenção:', e);
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
            <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', px: { xs: 2, sm: 3 }, py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Build sx={{ fontSize: 26 }} />
                    <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }}>
                            Registrar manutenção
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            {status ? `${status.horas.toFixed(1)}h de uso no ciclo atual` : 'Compressor Fixo'}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
                <TextField
                    select
                    label="Tipo de manutenção"
                    value={tipo}
                    onChange={(e) => handleTipo(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                >
                    {Object.entries(TIPOS_MANUTENCAO).map(([key, cfg]) => (
                        <MenuItem key={key} value={key}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cfg.color }} />
                                {cfg.label}
                            </Box>
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    label="Data da manutenção"
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ mb: 2 }}
                />

                <TextField
                    label="Responsável"
                    value={realizadoPor}
                    onChange={(e) => setRealizadoPor(e.target.value)}
                    fullWidth
                    placeholder="Quem realizou a manutenção"
                    sx={{ mb: 2 }}
                />

                <TextField
                    label="Observações / peças trocadas"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    sx={{ mb: 1.5 }}
                />

                <FormControlLabel
                    control={<Checkbox checked={resetar} onChange={(e) => setResetar(e.target.checked)} />}
                    label={
                        <Typography variant="body2" fontWeight={600}>
                            Reiniciar contador (zerar horas e renovar ciclo de 50h / 2 meses)
                        </Typography>
                    }
                />
                {resetar ? (
                    <Alert severity="success" sx={{ mt: 1, borderRadius: 2, py: 0.5 }}>
                        As horas de uso voltarão a <strong>0h</strong> e o próximo vencimento será recalculado.
                    </Alert>
                ) : (
                    <Alert severity="info" sx={{ mt: 1, borderRadius: 2, py: 0.5 }}>
                        Registro apenas informativo — o contador de horas <strong>não</strong> será zerado.
                        <Box sx={{ mt: 0.5 }}>
                            <Chip size="small" label={getTipoManutencaoLabel(tipo)} sx={{ fontWeight: 600 }} />
                        </Box>
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, gap: 1 }}>
                <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={saving}
                    startIcon={<Save />}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    Registrar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CompressorMaintenanceDialog;
