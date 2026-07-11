import { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    TextField,
    Button,
    Alert,
    InputAdornment,
    Chip,
    Divider,
} from '@mui/material';
import { CheckCircle, Edit, Save, RestartAlt, Timer } from '@mui/icons-material';
import { formatDuration } from '../../services/compressorService';

/**
 * Diálogo de conclusão/edição de uma sessão de uso do compressor.
 * Prefill com o tempo do cronômetro, permitindo REDUZIR horas/minutos caso
 * o operador tenha esquecido de pausar/concluir.
 *
 * @param {boolean} open
 * @param {function} onClose
 * @param {number} initialSeconds tempo inicial (segundos)
 * @param {function} onSave (durationSeconds, observacao, editado) => Promise
 * @param {'concluir'|'editar'} mode
 * @param {string} title
 */
const CompressorConcludeDialog = ({ open, onClose, initialSeconds = 0, onSave, mode = 'concluir', title }) => {
    const [horas, setHoras] = useState(0);
    const [minutos, setMinutos] = useState(0);
    const [observacao, setObservacao] = useState('');
    const [saving, setSaving] = useState(false);
    // Congela o tempo no momento em que o modal abre. Sem isso, o cronômetro
    // (que continua rodando) atualizaria initialSeconds a cada segundo e
    // resetaria os campos enquanto o usuário digita — impedindo aumentar/editar.
    const [baseSeconds, setBaseSeconds] = useState(0);
    const initedRef = useRef(false);

    useEffect(() => {
        if (open && !initedRef.current) {
            initedRef.current = true;
            const s = Math.max(0, Math.round(initialSeconds));
            setBaseSeconds(s);
            setHoras(Math.floor(s / 3600));
            setMinutos(Math.round((s % 3600) / 60));
            setObservacao('');
            setSaving(false);
        } else if (!open) {
            initedRef.current = false;
        }
    }, [open, initialSeconds]);

    const novaDuracao = (Number(horas) || 0) * 3600 + (Number(minutos) || 0) * 60;
    const foiEditado = Math.abs(novaDuracao - baseSeconds) > 30; // >30s de diferença
    const isConcluir = mode === 'concluir';

    const clampMin = (v) => Math.max(0, Math.min(59, Number(v) || 0));
    const clampHoras = (v) => Math.max(0, Math.min(999, Number(v) || 0));

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(novaDuracao, observacao.trim(), foiEditado);
            onClose();
        } catch (e) {
            console.error('Erro ao salvar sessão:', e);
            setSaving(false);
        }
    };

    const cor = isConcluir ? '#22c55e' : '#3b82f6';

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
            <Box sx={{ bgcolor: cor, color: 'white', px: { xs: 2, sm: 3 }, py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {isConcluir ? <CheckCircle sx={{ fontSize: 28 }} /> : <Edit sx={{ fontSize: 26 }} />}
                    <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }}>
                            {title || (isConcluir ? 'Concluir sessão de uso' : 'Editar sessão')}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Confira e ajuste o tempo antes de salvar
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Timer sx={{ color: 'text.secondary', fontSize: 20 }} />
                    <Typography variant="body2" color="text.secondary">
                        Cronômetro registrou:
                    </Typography>
                    <Chip label={formatDuration(baseSeconds)} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                </Box>

                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Tempo de uso a registrar
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                    <TextField
                        label="Horas"
                        type="number"
                        value={horas}
                        onChange={(e) => setHoras(clampHoras(e.target.value))}
                        fullWidth
                        inputProps={{ min: 0, max: 999, inputMode: 'numeric' }}
                        InputProps={{ endAdornment: <InputAdornment position="end">h</InputAdornment> }}
                    />
                    <TextField
                        label="Minutos"
                        type="number"
                        value={minutos}
                        onChange={(e) => setMinutos(clampMin(e.target.value))}
                        fullWidth
                        inputProps={{ min: 0, max: 59, inputMode: 'numeric' }}
                        InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
                    />
                </Box>

                {foiEditado && (
                    <Alert severity="info" icon={<Edit fontSize="inherit" />} sx={{ mb: 1.5, borderRadius: 2, py: 0.5 }}>
                        Tempo ajustado manualmente — será marcado como editado no histórico.
                    </Alert>
                )}

                <Button
                    size="small"
                    startIcon={<RestartAlt />}
                    onClick={() => {
                        setHoras(Math.floor(baseSeconds / 3600));
                        setMinutos(Math.round((baseSeconds % 3600) / 60));
                    }}
                    sx={{ mb: 1.5, textTransform: 'none' }}
                >
                    Restaurar tempo do cronômetro
                </Button>

                <Divider sx={{ my: 1 }} />

                <TextField
                    label="Observação (opcional)"
                    placeholder="Ex.: teste de pressão, atendimento a viatura, etc."
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    sx={{ mt: 1 }}
                />
            </DialogContent>

            <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, gap: 1 }}>
                <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={saving || novaDuracao <= 0}
                    startIcon={isConcluir ? <CheckCircle /> : <Save />}
                    sx={{ textTransform: 'none', fontWeight: 700, bgcolor: cor, '&:hover': { bgcolor: cor, filter: 'brightness(0.92)' } }}
                >
                    {isConcluir ? 'Salvar e concluir' : 'Salvar alterações'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CompressorConcludeDialog;
