import { useState } from 'react';
import {
    Card,
    CardContent,
    Box,
    Typography,
    Button,
    Chip,
    IconButton,
    LinearProgress,
    Tooltip,
    Snackbar,
    Skeleton,
    alpha,
} from '@mui/material';
import {
    Bolt,
    PlayArrow,
    Pause,
    Stop,
    Timer,
    OpenInNew,
    Warning,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCompressor } from '../../hooks/useCompressor';
import {
    formatClock,
    NIVEL_CONFIG,
    HORAS_LIMITE_MANUTENCAO,
} from '../../services/compressorService';
import CompressorControlModal from './CompressorControlModal';
import CompressorConcludeDialog from './CompressorConcludeDialog';

/**
 * Card compacto do compressor para o Dashboard (Home).
 * Permite iniciar/pausar direto e abrir o cronômetro completo — pensado para
 * uso rápido no celular pelos admins.
 */
const CompressorQuickCard = () => {
    const navigate = useNavigate();
    const { compressor, loading, status, actions } = useCompressor();
    const [controlOpen, setControlOpen] = useState(false);
    const [concludeOpen, setConcludeOpen] = useState(false);
    const [snack, setSnack] = useState('');

    if (loading || !compressor) {
        return <Skeleton variant="rounded" height={150} sx={{ borderRadius: 3 }} />;
    }

    const nivel = NIVEL_CONFIG[status.nivel] || NIVEL_CONFIG.ok;
    const running = status.isRunning;
    const paused = status.isPaused;
    const isRedAlert = status.nivel === 'alerta' || status.nivel === 'vencida';
    const notify = (m) => setSnack(m);

    const handleToggle = async (e) => {
        e.stopPropagation();
        try {
            if (running) { await actions.pause(); notify('Cronômetro pausado'); }
            else { await actions.start(); notify(paused ? 'Cronômetro retomado' : 'Compressor iniciado'); }
        } catch { notify('Erro ao atualizar o cronômetro'); }
    };

    const handleConcludeSave = async (durationSeconds, observacao, editado) => {
        await actions.conclude({ durationSeconds, observacao, editado });
        setConcludeOpen(false);
        notify('Sessão registrada no histórico de uso');
    };

    return (
        <>
            <Card
                sx={{
                    height: '100%',
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: nivel.color,
                    background: (t) => t.palette.mode === 'dark'
                        ? `linear-gradient(135deg, ${alpha(nivel.color, 0.16)} 0%, ${alpha('#1e3a5f', 0.25)} 100%)`
                        : `linear-gradient(135deg, ${alpha(nivel.color, 0.07)} 0%, ${alpha('#1e3a5f', 0.03)} 100%)`,
                    '&:hover': { transform: 'none' },
                    animation: isRedAlert ? 'qcPulse 3s ease-in-out infinite' : 'none',
                    '@keyframes qcPulse': {
                        '0%,100%': { boxShadow: `0 4px 20px ${alpha(nivel.color, 0.2)}` },
                        '50%': { boxShadow: `0 4px 32px ${alpha(nivel.color, 0.5)}` },
                    },
                    '&::before': {
                        content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 5,
                        background: `linear-gradient(90deg, ${nivel.color} 0%, ${alpha(nivel.color, 0.5)} 100%)`,
                    },
                }}
            >
                <CardContent sx={{ p: { xs: 1.75, sm: 2.25 }, '&:last-child': { pb: { xs: 1.75, sm: 2.25 } } }}>
                    {/* Cabeçalho */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: alpha(nivel.color, 0.15), color: nivel.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Bolt sx={{ fontSize: 20 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {compressor.nome}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Uso p/ abastecimento de cilindros</Typography>
                        </Box>
                        <Tooltip title="Abrir no cronograma">
                            <IconButton size="small" onClick={() => navigate('/manutencao?tab=1')}>
                                <OpenInNew fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {/* Estado + horas */}
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
                        <Typography variant="h4" fontWeight={900} sx={{ color: nivel.color, fontSize: { xs: '1.5rem', sm: '1.9rem' }, lineHeight: 1 }}>
                            {status.horas.toFixed(1)}h
                        </Typography>
                        <Typography variant="caption" color="text.secondary">de uso / {HORAS_LIMITE_MANUTENCAO}h p/ manutenção</Typography>
                        {isRedAlert && (
                            <Chip icon={<Warning sx={{ fontSize: '13px !important' }} />} label={status.vencida ? 'Vencida' : 'Alerta'} size="small" color="error" sx={{ height: 20, fontWeight: 700, fontSize: '0.62rem', ml: 'auto' }} />
                        )}
                    </Box>

                    <LinearProgress
                        variant="determinate" value={status.progressoHoras}
                        sx={{ height: 6, borderRadius: 4, mb: 1.25, bgcolor: alpha(nivel.color, 0.12), '& .MuiLinearProgress-bar': { bgcolor: nivel.color, borderRadius: 4 } }}
                    />

                    {/* Cronômetro ao vivo */}
                    {(running || paused) && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
                            <Timer sx={{ fontSize: 16, color: running ? '#22c55e' : '#f59e0b' }} />
                            <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', color: running ? '#22c55e' : '#f59e0b' }}>
                                {formatClock(status.sessionSeconds)}
                            </Typography>
                            <Chip
                                size="small"
                                label={running ? 'abastecendo' : 'pausado'}
                                sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha(running ? '#22c55e' : '#f59e0b', 0.12), color: running ? '#16a34a' : '#d97706' }}
                            />
                        </Box>
                    )}

                    {/* Ações */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            fullWidth size="small" variant="contained"
                            startIcon={running ? <Pause /> : <PlayArrow />}
                            onClick={handleToggle}
                            sx={{ fontWeight: 800, bgcolor: running ? '#f59e0b' : '#22c55e', '&:hover': { bgcolor: running ? '#d97706' : '#16a34a' } }}
                        >
                            {running ? 'Pausar' : paused ? 'Retomar' : 'Iniciar'}
                        </Button>
                        {(running || paused) ? (
                            <Button
                                fullWidth size="small" variant="contained"
                                startIcon={<Stop />}
                                onClick={() => setConcludeOpen(true)}
                                sx={{ fontWeight: 800, bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#0d1f3c' } }}
                            >
                                Concluir
                            </Button>
                        ) : (
                            <Button
                                fullWidth size="small" variant="outlined"
                                startIcon={<Timer />}
                                onClick={() => setControlOpen(true)}
                                sx={{ fontWeight: 700 }}
                            >
                                Controle
                            </Button>
                        )}
                    </Box>
                </CardContent>
            </Card>

            <CompressorControlModal
                open={controlOpen}
                onClose={() => setControlOpen(false)}
                compressor={compressor}
                status={status}
                actions={actions}
                onNotify={notify}
            />
            <CompressorConcludeDialog
                open={concludeOpen}
                onClose={() => setConcludeOpen(false)}
                initialSeconds={status.sessionSeconds}
                onSave={handleConcludeSave}
                mode="concluir"
            />
            <Snackbar
                open={!!snack}
                autoHideDuration={3000}
                onClose={() => setSnack('')}
                message={snack}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </>
    );
};

export default CompressorQuickCard;
