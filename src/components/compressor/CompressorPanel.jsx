import { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Chip,
    Grid,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Tooltip,
    Alert,
    Collapse,
    Divider,
    Snackbar,
    CircularProgress,
    alpha,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Bolt,
    PlayArrow,
    Pause,
    Stop,
    Build,
    AccessTime,
    Edit,
    DeleteOutline,
    History,
    EventAvailable,
    Warning,
    CheckCircle,
    ExpandMore,
    ExpandLess,
    TrendingUp,
    Timer,
} from '@mui/icons-material';
import { useCompressor } from '../../hooks/useCompressor';
import {
    formatDuration,
    formatClock,
    toDate,
    NIVEL_CONFIG,
    HORAS_LIMITE_MANUTENCAO,
    HORAS_ALERTA_VERMELHO,
    MESES_LIMITE_MANUTENCAO,
    getTipoManutencaoLabel,
    TIPOS_MANUTENCAO,
} from '../../services/compressorService';
import CompressorControlModal from './CompressorControlModal';
import CompressorConcludeDialog from './CompressorConcludeDialog';
import CompressorMaintenanceDialog from './CompressorMaintenanceDialog';

// ---- Medidor circular (SVG) do progresso de horas ----
const Gauge = ({ value, color, size = 132, stroke = 12, children }) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const pct = Math.min(100, Math.max(0, value));
    const offset = c - (pct / 100) * c;
    return (
        <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={alpha(color, 0.15)} strokeWidth={stroke} />
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                    strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
            </svg>
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {children}
            </Box>
        </Box>
    );
};

const formatDT = (val) => {
    const d = toDate(val);
    if (!d) return '-';
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};
const formatD = (val) => {
    const d = toDate(val);
    return d ? d.toLocaleDateString('pt-BR') : '-';
};

const CompressorPanel = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { compressor, usos, manutencoes, loading, status, actions, isAdminGeral } = useCompressor();

    const [controlOpen, setControlOpen] = useState(false);
    const [concludeOpen, setConcludeOpen] = useState(false);
    const [maintOpen, setMaintOpen] = useState(false);
    const [editUso, setEditUso] = useState(null);
    const [showAllUsos, setShowAllUsos] = useState(false);
    const [showManut, setShowManut] = useState(false);
    const [snack, setSnack] = useState('');

    if (loading || !compressor) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, py: 4 }}>
                <CircularProgress size={22} />
                <Typography color="text.secondary">Carregando controle do compressor...</Typography>
            </Box>
        );
    }

    const nivel = NIVEL_CONFIG[status.nivel] || NIVEL_CONFIG.ok;
    const running = status.isRunning;
    const paused = status.isPaused;
    const isRedAlert = status.nivel === 'alerta' || status.nivel === 'vencida';

    const usosVisiveis = showAllUsos ? usos : usos.slice(0, 6);

    const notify = (m) => setSnack(m);

    const handleQuickToggle = async (e) => {
        e.stopPropagation();
        try {
            if (running) {
                await actions.pause();
                notify('Cronômetro pausado');
            } else {
                await actions.start();
                notify(paused ? 'Cronômetro retomado' : 'Compressor iniciado');
            }
        } catch { notify('Erro ao atualizar o cronômetro'); }
    };

    const handleConcludeSave = async (durationSeconds, observacao, editado) => {
        await actions.conclude({ durationSeconds, observacao, editado });
        setConcludeOpen(false);
        notify('Sessão registrada no histórico de uso');
    };

    const handleEditUsoSave = async (durationSeconds, observacao) => {
        await actions.editUso(editUso.id, durationSeconds, observacao);
        setEditUso(null);
        notify('Sessão atualizada');
    };

    const handleDeleteUso = async (u) => {
        if (!window.confirm(`Excluir esta sessão de uso (${formatDuration(u.durationSeconds)})? A duração será abatida do total do ciclo.`)) return;
        try {
            await actions.deleteUso(u.id);
            notify('Sessão de uso excluída');
        } catch { notify('Erro ao excluir a sessão'); }
    };

    const handleDeleteManutencao = async (m) => {
        if (!window.confirm(`Excluir o registro de manutenção "${getTipoManutencaoLabel(m.tipo)}" de ${formatD(m.data)}?`)) return;
        try {
            await actions.deleteManutencao(m.id);
            notify('Registro de manutenção excluído');
        } catch { notify('Erro ao excluir a manutenção'); }
    };

    const handleRegistrarManutencao = async (opts) => {
        const res = await actions.registrar(opts);
        notify(res.resetaCiclo ? 'Manutenção registrada — ciclo reiniciado!' : 'Manutenção registrada');
    };

    return (
        <Box>
            {/* ============ HERO / CARD CLICÁVEL ============ */}
            <Paper
                elevation={0}
                onClick={() => setControlOpen(true)}
                sx={{
                    p: { xs: 2, sm: 3 },
                    mb: 3,
                    borderRadius: 3,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: nivel.color,
                    background: theme.palette.mode === 'dark'
                        ? `linear-gradient(135deg, ${alpha(nivel.color, 0.16)} 0%, ${alpha('#1e3a5f', 0.2)} 100%)`
                        : `linear-gradient(135deg, ${alpha(nivel.color, 0.06)} 0%, ${alpha('#1e3a5f', 0.04)} 100%)`,
                    boxShadow: `0 8px 32px ${alpha(nivel.color, 0.2)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 12px 40px ${alpha(nivel.color, 0.3)}` },
                    animation: isRedAlert ? 'compPulse 3s ease-in-out infinite' : 'none',
                    '@keyframes compPulse': {
                        '0%,100%': { boxShadow: `0 8px 32px ${alpha(nivel.color, 0.2)}` },
                        '50%': { boxShadow: `0 8px 48px ${alpha(nivel.color, 0.5)}` },
                    },
                    '&::before': {
                        content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 6,
                        background: `linear-gradient(90deg, ${nivel.color} 0%, ${alpha(nivel.color, 0.5)} 100%)`,
                    },
                }}
            >
                <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="center">
                    {/* Medidor */}
                    <Grid item xs={12} sm="auto" sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Gauge value={status.progressoHoras} color={nivel.color} size={isMobile ? 120 : 140}>
                            <Typography variant="h4" fontWeight={900} sx={{ color: nivel.color, lineHeight: 1, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
                                {status.horas.toFixed(1)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                h de uso
                            </Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                                de {HORAS_LIMITE_MANUTENCAO}h p/ manutenção
                            </Typography>
                        </Gauge>
                    </Grid>

                    {/* Info */}
                    <Grid item xs={12} sm>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                            <Bolt sx={{ color: nivel.color }} />
                            <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1.05rem', sm: '1.3rem' } }}>
                                {compressor.nome}
                            </Typography>
                            <Chip
                                size="small"
                                icon={
                                    <Box sx={{
                                        width: 8, height: 8, borderRadius: '50%', bgcolor: nivel.color,
                                        ...(running && { animation: 'blink 1.2s infinite', '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.2 } } }),
                                    }} />
                                }
                                label={running ? 'Em operação' : paused ? 'Pausado' : nivel.label}
                                sx={{ fontWeight: 700, bgcolor: alpha(nivel.color, 0.12), color: nivel.color, border: `1px solid ${alpha(nivel.color, 0.3)}` }}
                            />
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {compressor.local}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, lineHeight: 1.4 }}>
                            O cronômetro soma o <strong>tempo de uso abastecendo cilindros</strong>. Ao atingir{' '}
                            <strong>{HORAS_LIMITE_MANUTENCAO}h de uso</strong> ou <strong>{MESES_LIMITE_MANUTENCAO} meses</strong> desde a última
                            manutenção, é necessária uma nova manutenção.
                        </Typography>

                        {/* Barras de progresso */}
                        <Box sx={{ mb: 0.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                <Typography variant="caption" fontWeight={700}>Uso acumulado (abastecimento)</Typography>
                                <Typography variant="caption" fontWeight={700} sx={{ color: nivel.color }}>
                                    faltam {status.horasRestantes.toFixed(1)}h p/ manutenção
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate" value={status.progressoHoras}
                                sx={{ height: 8, borderRadius: 5, bgcolor: alpha(nivel.color, 0.12), '& .MuiLinearProgress-bar': { bgcolor: nivel.color, borderRadius: 5 } }}
                            />
                        </Box>
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3, mt: 1 }}>
                                <Typography variant="caption" fontWeight={700}>Prazo (2 meses desde a manutenção)</Typography>
                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                    {status.diasAteData > 0 ? `${status.diasAteData} dias restantes` : 'vencido'}
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate" value={status.progressoData}
                                sx={{ height: 6, borderRadius: 5, bgcolor: alpha('#3b82f6', 0.12), '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6', borderRadius: 5 } }}
                            />
                        </Box>
                    </Grid>

                    {/* Ações rápidas */}
                    <Grid item xs={12} sm="auto">
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'row', sm: 'column' }, gap: 1 }}>
                            <Button
                                onClick={handleQuickToggle}
                                variant="contained"
                                startIcon={running ? <Pause /> : <PlayArrow />}
                                sx={{
                                    flex: 1, fontWeight: 800, minWidth: 120,
                                    bgcolor: running ? '#f59e0b' : '#22c55e',
                                    '&:hover': { bgcolor: running ? '#d97706' : '#16a34a' },
                                }}
                            >
                                {running ? 'Pausar' : paused ? 'Retomar' : 'Iniciar'}
                            </Button>
                            {(running || paused) ? (
                                <Button
                                    onClick={(e) => { e.stopPropagation(); setConcludeOpen(true); }}
                                    variant="contained"
                                    startIcon={<Stop />}
                                    sx={{ flex: 1, fontWeight: 800, minWidth: 120, bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#0d1f3c' } }}
                                >
                                    Concluir
                                </Button>
                            ) : (
                                <Button
                                    onClick={(e) => { e.stopPropagation(); setControlOpen(true); }}
                                    variant="outlined"
                                    startIcon={<Timer />}
                                    sx={{ flex: 1, fontWeight: 700, minWidth: 120 }}
                                >
                                    Cronômetro
                                </Button>
                            )}
                        </Box>
                    </Grid>
                </Grid>

                {/* Selo do cronômetro rodando */}
                {(running || paused) && (
                    <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${alpha(nivel.color, 0.15)}`, display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                        <Timer sx={{ fontSize: 18, color: running ? '#22c55e' : '#f59e0b' }} />
                        <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', color: running ? '#22c55e' : '#f59e0b' }}>
                            {formatClock(status.sessionSeconds)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {running ? 'abastecendo cilindros' : 'abastecimento pausado'}
                        </Typography>
                    </Box>
                )}
            </Paper>

            {/* ============ ALERTA VERMELHO ============ */}
            {isRedAlert && (
                <Alert
                    severity="error"
                    icon={<Warning />}
                    sx={{ mb: 3, borderRadius: 2, fontWeight: 600, border: '1px solid', borderColor: 'error.main' }}
                    action={
                        <Button color="error" size="small" variant="contained" onClick={() => setMaintOpen(true)} startIcon={<Build />}>
                            Registrar manutenção
                        </Button>
                    }
                >
                    {status.vencida
                        ? `Manutenção VENCIDA — ${status.vencidaPorHoras ? `${status.horas.toFixed(1)}h de uso (limite ${HORAS_LIMITE_MANUTENCAO}h)` : `prazo de ${MESES_LIMITE_MANUTENCAO} meses ultrapassado`}. Realize a manutenção preventiva.`
                        : `Atenção: o compressor atingiu ${status.horas.toFixed(1)}h de uso (alerta em ${HORAS_ALERTA_VERMELHO}h). Programe a manutenção antes das ${HORAS_LIMITE_MANUTENCAO}h.`}
                </Alert>
            )}

            {/* ============ MINI STATS ============ */}
            <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 3 }}>
                {[
                    { icon: <TrendingUp />, label: 'Uso desde a manutenção', value: `${status.horas.toFixed(1)}h`, color: nivel.color },
                    { icon: <AccessTime />, label: 'Falta p/ manutenção', value: `${status.horasRestantes.toFixed(1)}h`, color: '#3b82f6' },
                    { icon: <EventAvailable />, label: 'Próxima manutenção', value: formatD(status.proximaPorData), color: '#8b5cf6' },
                    { icon: <History />, label: 'Última manutenção', value: formatD(status.ultimaManutencao), color: '#22c55e' },
                ].map((s, i) => (
                    <Grid item xs={6} sm={3} key={i}>
                        <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Box sx={{ color: s.color, display: 'flex' }}>{s.icon}</Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.62rem', sm: '0.72rem' } }}>
                                    {s.label}
                                </Typography>
                            </Box>
                            <Typography variant="h6" fontWeight={800} sx={{ color: s.color, fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
                                {s.value}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* ============ AÇÕES ============ */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
                <Button variant="contained" startIcon={<Timer />} onClick={() => setControlOpen(true)} sx={{ fontWeight: 700 }}>
                    Abrir controle / cronômetro
                </Button>
                <Button variant="outlined" startIcon={<Build />} onClick={() => setMaintOpen(true)} sx={{ fontWeight: 700 }}>
                    Registrar manutenção
                </Button>
            </Box>

            {/* ============ HISTÓRICO DE USO ============ */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', mb: 3 }}>
                <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, bgcolor: alpha('#1e3a5f', 0.04), display: 'flex', alignItems: 'center', gap: 1 }}>
                    <History sx={{ color: 'primary.main' }} />
                    <Typography variant="subtitle1" fontWeight={800} sx={{ flex: 1 }}>
                        Histórico de uso
                    </Typography>
                    <Chip label={`${usos.length} sessões`} size="small" sx={{ fontWeight: 700 }} />
                </Box>
                {usos.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="text.secondary">Nenhuma sessão registrada ainda.</Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Início</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Fim</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Duração</TableCell>
                                    <TableCell sx={{ fontWeight: 700, display: { xs: 'none', sm: 'table-cell' } }}>Operador</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="center">Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {usosVisiveis.map((u) => (
                                    <TableRow key={u.id} hover>
                                        <TableCell sx={{ fontSize: '0.78rem' }}>{formatDT(u.startAt)}</TableCell>
                                        <TableCell sx={{ fontSize: '0.78rem' }}>{formatDT(u.endAt)}</TableCell>
                                        <TableCell align="right">
                                            <Chip label={formatDuration(u.durationSeconds)} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                                            {u.editado && (
                                                <Tooltip title="Duração editada manualmente">
                                                    <Edit sx={{ fontSize: 13, ml: 0.5, color: 'text.disabled', verticalAlign: 'middle' }} />
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.78rem', display: { xs: 'none', sm: 'table-cell' } }}>
                                            {u.operador || '-'}
                                            {u.observacao && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                    {u.observacao}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                                <Tooltip title="Corrigir duração">
                                                    <IconButton size="small" onClick={() => setEditUso(u)}>
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                {isAdminGeral && (
                                                    <Tooltip title="Excluir sessão (admingeral)">
                                                        <IconButton size="small" color="error" onClick={() => handleDeleteUso(u)}>
                                                            <DeleteOutline fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                {usos.length > 6 && (
                    <Box sx={{ textAlign: 'center', py: 1 }}>
                        <Button size="small" onClick={() => setShowAllUsos((v) => !v)} endIcon={showAllUsos ? <ExpandLess /> : <ExpandMore />}>
                            {showAllUsos ? 'Ver menos' : `Ver todas (${usos.length})`}
                        </Button>
                    </Box>
                )}
            </Paper>

            {/* ============ HISTÓRICO DE MANUTENÇÕES ============ */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <Box
                    onClick={() => setShowManut((v) => !v)}
                    sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, bgcolor: alpha('#8b5cf6', 0.06), display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                >
                    <Build sx={{ color: '#8b5cf6' }} />
                    <Typography variant="subtitle1" fontWeight={800} sx={{ flex: 1 }}>
                        Histórico de manutenções
                    </Typography>
                    <Chip label={`${manutencoes.length}`} size="small" sx={{ fontWeight: 700 }} />
                    {showManut ? <ExpandLess /> : <ExpandMore />}
                </Box>
                <Collapse in={showManut}>
                    {manutencoes.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography color="text.secondary">Nenhuma manutenção registrada.</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                            {manutencoes.map((m, idx) => {
                                const cfg = TIPOS_MANUTENCAO[m.tipo] || { color: '#64748b' };
                                return (
                                    <Box key={m.id}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1 }}>
                                            <Box sx={{ mt: 0.5, width: 12, height: 12, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0, border: `3px solid ${alpha(cfg.color, 0.2)}` }} />
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                    <Typography variant="body2" fontWeight={700}>{getTipoManutencaoLabel(m.tipo)}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{formatD(m.data)}</Typography>
                                                    {m.resetouCiclo && <Chip label="Ciclo reiniciado" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.62rem' }} />}
                                                </Box>
                                                {m.observacao && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{m.observacao}</Typography>}
                                                <Typography variant="caption" color="text.disabled">
                                                    {m.horasNoMomento != null ? `${m.horasNoMomento}h no momento` : ''} {m.realizadoPor ? `• ${m.realizadoPor}` : ''}
                                                </Typography>
                                            </Box>
                                            {isAdminGeral && (
                                                <Tooltip title="Excluir registro (admingeral)">
                                                    <IconButton size="small" color="error" onClick={() => handleDeleteManutencao(m)} sx={{ flexShrink: 0 }}>
                                                        <DeleteOutline fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                        {idx < manutencoes.length - 1 && <Divider />}
                                    </Box>
                                );
                            })}
                        </Box>
                    )}
                </Collapse>
            </Paper>

            {/* ============ MODAIS ============ */}
            <CompressorControlModal
                open={controlOpen}
                onClose={() => setControlOpen(false)}
                compressor={compressor}
                status={status}
                actions={actions}
                onNotify={notify}
            />
            <CompressorMaintenanceDialog
                open={maintOpen}
                onClose={() => setMaintOpen(false)}
                onSave={handleRegistrarManutencao}
                status={status}
            />
            <CompressorConcludeDialog
                open={concludeOpen}
                onClose={() => setConcludeOpen(false)}
                initialSeconds={status.sessionSeconds}
                onSave={handleConcludeSave}
                mode="concluir"
            />
            <CompressorConcludeDialog
                open={!!editUso}
                onClose={() => setEditUso(null)}
                initialSeconds={editUso?.durationSeconds || 0}
                onSave={handleEditUsoSave}
                mode="editar"
                title="Corrigir sessão de uso"
            />

            <Snackbar
                open={!!snack}
                autoHideDuration={3500}
                onClose={() => setSnack('')}
                message={snack}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Box>
    );
};

export default CompressorPanel;
