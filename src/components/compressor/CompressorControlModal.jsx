import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    Box,
    Typography,
    Button,
    IconButton,
    Chip,
    alpha,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    PlayArrow,
    Pause,
    Stop,
    Close,
    DeleteOutline,
    Bolt,
    AccessTime,
} from '@mui/icons-material';
import {
    formatClock,
    NIVEL_CONFIG,
    HORAS_LIMITE_MANUTENCAO,
} from '../../services/compressorService';
import CompressorConcludeDialog from './CompressorConcludeDialog';

/**
 * Modal com o cronômetro do compressor: iniciar / pausar / concluir.
 * Recebe o estado e as ações do hook do componente pai (evita assinaturas
 * duplicadas). Totalmente responsivo — pensado para uso no celular.
 */
const CompressorControlModal = ({ open, onClose, compressor, status, actions, onNotify }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [concludeOpen, setConcludeOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    if (!status) return null;

    const nivel = NIVEL_CONFIG[status.nivel] || NIVEL_CONFIG.ok;
    const running = status.isRunning;
    const paused = status.isPaused;
    const idle = !running && !paused;

    const notify = (msg) => onNotify && onNotify(msg);

    const run = async (fn, okMsg) => {
        setBusy(true);
        try {
            await fn();
            if (okMsg) notify(okMsg);
        } catch (e) {
            console.error(e);
            notify('Ocorreu um erro. Tente novamente.');
        } finally {
            setBusy(false);
        }
    };

    const handleStart = () => run(actions.start, 'Compressor iniciado');
    const handlePause = () => run(actions.pause, 'Cronômetro pausado');
    const handleDiscard = () => {
        if (!window.confirm('Descartar esta sessão sem registrar o tempo?')) return;
        run(actions.discard, 'Sessão descartada');
    };
    const handleConcludeSave = async (durationSeconds, observacao, editado) => {
        await actions.conclude({ durationSeconds, observacao, editado });
        setConcludeOpen(false);
        notify('Sessão registrada no histórico de uso');
    };

    // Cor dinâmica do mostrador conforme o estado do cronômetro
    const displayColor = running ? '#22c55e' : paused ? '#f59e0b' : theme.palette.text.secondary;

    return (
        <>
            <Dialog
                open={open}
                onClose={busy ? undefined : onClose}
                fullScreen={isMobile}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, overflow: 'hidden' } }}
            >
                {/* Cabeçalho */}
                <Box
                    sx={{
                        px: { xs: 2, sm: 3 },
                        py: 2,
                        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                    }}
                >
                    <Box
                        sx={{
                            width: 44, height: 44, borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Bolt sx={{ fontSize: 26 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1rem', sm: '1.2rem' }, lineHeight: 1.2 }}>
                            {compressor?.nome || 'Compressor Fixo'}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.85 }}>
                            Controle de uso — cronômetro
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} disabled={busy} sx={{ color: 'white' }}>
                        <Close />
                    </IconButton>
                </Box>

                <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 4 }, textAlign: 'center' }}>
                    {/* Selo de estado */}
                    <Chip
                        icon={
                            <Box
                                sx={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    bgcolor: displayColor,
                                    ...(running && {
                                        animation: 'blink 1.2s ease-in-out infinite',
                                        '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.25 } },
                                    }),
                                }}
                            />
                        }
                        label={running ? 'EM OPERAÇÃO' : paused ? 'PAUSADO' : 'PARADO'}
                        sx={{
                            fontWeight: 800, letterSpacing: 0.5, mb: 2,
                            bgcolor: alpha(displayColor, 0.12), color: displayColor,
                            border: `1px solid ${alpha(displayColor, 0.3)}`,
                        }}
                    />

                    {/* Mostrador do cronômetro (sessão atual) */}
                    <Box
                        sx={{
                            position: 'relative',
                            mx: 'auto',
                            mb: 1,
                            py: { xs: 2, sm: 2.5 },
                            borderRadius: 4,
                            border: `2px solid ${alpha(displayColor, 0.25)}`,
                            bgcolor: alpha(displayColor, 0.05),
                            boxShadow: running ? `0 0 0 6px ${alpha(displayColor, 0.06)}` : 'none',
                            transition: 'all 0.3s ease',
                        }}
                    >
                        <Typography
                            sx={{
                                fontFamily: '"Roboto Mono", "Courier New", monospace',
                                fontWeight: 800,
                                fontSize: { xs: '2.8rem', sm: '3.4rem' },
                                lineHeight: 1,
                                color: displayColor,
                                fontVariantNumeric: 'tabular-nums',
                                letterSpacing: 1,
                            }}
                        >
                            {formatClock(status.sessionSeconds)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            tempo desta sessão
                        </Typography>
                    </Box>

                    {/* Total desde a manutenção */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3, flexWrap: 'wrap', mt: 1.5 }}>
                        <Chip
                            icon={<AccessTime sx={{ fontSize: 16 }} />}
                            label={`Total no ciclo: ${status.horas.toFixed(1)}h / ${HORAS_LIMITE_MANUTENCAO}h`}
                            size="small"
                            sx={{ fontWeight: 700, bgcolor: alpha(nivel.color, 0.1), color: nivel.color }}
                        />
                    </Box>

                    {/* Botões de ação */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {idle && (
                            <Button
                                onClick={handleStart}
                                disabled={busy}
                                variant="contained"
                                size="large"
                                startIcon={<PlayArrow />}
                                sx={{ py: 1.5, fontSize: '1.05rem', fontWeight: 800, bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}
                            >
                                Ligar / Iniciar
                            </Button>
                        )}

                        {running && (
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <Button
                                    onClick={handlePause}
                                    disabled={busy}
                                    variant="outlined"
                                    size="large"
                                    startIcon={<Pause />}
                                    sx={{ flex: 1, py: 1.5, fontWeight: 800, color: '#f59e0b', borderColor: '#f59e0b', '&:hover': { borderColor: '#d97706', bgcolor: alpha('#f59e0b', 0.08) } }}
                                >
                                    Pausar
                                </Button>
                                <Button
                                    onClick={() => setConcludeOpen(true)}
                                    disabled={busy}
                                    variant="contained"
                                    size="large"
                                    startIcon={<Stop />}
                                    sx={{ flex: 1, py: 1.5, fontWeight: 800, bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#0d1f3c' } }}
                                >
                                    Concluir
                                </Button>
                            </Box>
                        )}

                        {paused && (
                            <>
                                <Box sx={{ display: 'flex', gap: 1.5 }}>
                                    <Button
                                        onClick={handleStart}
                                        disabled={busy}
                                        variant="contained"
                                        size="large"
                                        startIcon={<PlayArrow />}
                                        sx={{ flex: 1, py: 1.5, fontWeight: 800, bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}
                                    >
                                        Retomar
                                    </Button>
                                    <Button
                                        onClick={() => setConcludeOpen(true)}
                                        disabled={busy}
                                        variant="contained"
                                        size="large"
                                        startIcon={<Stop />}
                                        sx={{ flex: 1, py: 1.5, fontWeight: 800, bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#0d1f3c' } }}
                                    >
                                        Concluir
                                    </Button>
                                </Box>
                                <Button
                                    onClick={handleDiscard}
                                    disabled={busy}
                                    size="small"
                                    startIcon={<DeleteOutline />}
                                    color="error"
                                    sx={{ textTransform: 'none' }}
                                >
                                    Descartar sessão
                                </Button>
                            </>
                        )}
                    </Box>

                    {(running || paused) && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                            Esqueceu de pausar? Ao concluir você poderá ajustar o tempo antes de salvar.
                        </Typography>
                    )}
                </DialogContent>
            </Dialog>

            <CompressorConcludeDialog
                open={concludeOpen}
                onClose={() => setConcludeOpen(false)}
                initialSeconds={status.sessionSeconds}
                onSave={handleConcludeSave}
                mode="concluir"
            />
        </>
    );
};

export default CompressorControlModal;
