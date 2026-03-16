import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    IconButton,
    Button,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Tooltip,
    Alert,
    Snackbar,
    useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
    ChevronLeft,
    ChevronRight,
    Today,
    Edit as EditIcon,
} from '@mui/icons-material';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import db from '../../firebase/db';
import { callGetCalendarMaintenances } from '../../firebase/functions';
import { getMaintenanceTypeLabel } from '../../data/maintenanceTemplates';

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const PRIORITY_COLORS = {
    critica: '#f44336',
    alta: '#ff9800',
    media: '#2196f3',
    baixa: '#9e9e9e',
};

const PRIORITY_LABELS = {
    critica: 'Crítica',
    alta: 'Alta',
    media: 'Média',
    baixa: 'Baixa',
};

const MaintenanceCalendarView = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarData, setCalendarData] = useState({});
    const [selectedDay, setSelectedDay] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [editDialog, setEditDialog] = useState({ open: false, maintenance: null });
    const [editDate, setEditDate] = useState('');
    const [saving, setSaving] = useState(false);

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const fetchCalendarData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await callGetCalendarMaintenances(year, month + 1);
            setCalendarData(result.calendarDays || {});
        } catch (err) {
            console.error('Erro ao buscar dados do calendário:', err);
            setError('Erro ao carregar dados do calendário. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, [year, month]);

    useEffect(() => {
        fetchCalendarData();
    }, [fetchCalendarData]);

    const weeks = useMemo(() => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDow = new Date(year, month, 1).getDay();
        const wks = [];
        let day = 1;

        for (let w = 0; day <= daysInMonth; w++) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                if ((w === 0 && d < firstDow) || day > daysInMonth) {
                    week.push(null);
                } else {
                    week.push(day++);
                }
            }
            wks.push(week);
        }

        return wks;
    }, [year, month]);

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayDate = today.getDate();

    const goToPrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
        setSelectedDay(null);
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
        setSelectedDay(null);
    };

    const goToToday = () => {
        const now = new Date();
        setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
        setSelectedDay(now.getDate());
    };

    const handleDayClick = (day) => {
        setSelectedDay(selectedDay === day ? null : day);
    };

    const handleOpenEdit = (maintenance) => {
        const date = new Date(maintenance.dueDate);
        setEditDate(date.toISOString().split('T')[0]);
        setEditDialog({ open: true, maintenance });
    };

    const handleCloseEdit = () => {
        setEditDialog({ open: false, maintenance: null });
        setEditDate('');
    };

    const handleSaveEdit = async () => {
        if (!editDate || !editDialog.maintenance) return;

        setSaving(true);
        try {
            const newDate = new Date(editDate + 'T12:00:00');
            const maintenanceRef = doc(db, 'manutencoes', editDialog.maintenance.id);
            await updateDoc(maintenanceRef, {
                dueDate: Timestamp.fromDate(newDate),
                updatedAt: Timestamp.now(),
            });

            setSnackbar({ open: true, message: 'Data da manutenção atualizada com sucesso!', severity: 'success' });
            handleCloseEdit();
            await fetchCalendarData();

            if (newDate.getMonth() !== month || newDate.getFullYear() !== year) {
                setCurrentDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
                setSelectedDay(newDate.getDate());
            } else {
                setSelectedDay(newDate.getDate());
            }
        } catch (err) {
            console.error('Erro ao atualizar data:', err);
            setSnackbar({ open: true, message: 'Erro ao atualizar data. Tente novamente.', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const selectedDayMaintenances = selectedDay ? (calendarData[String(selectedDay)] || []) : [];

    // Count total maintenances in the month
    const monthTotal = useMemo(() => {
        return Object.values(calendarData).reduce((sum, arr) => sum + arr.length, 0);
    }, [calendarData]);

    return (
        <Box>
            {/* Month Navigation */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
                flexWrap: 'wrap',
                gap: 1,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton onClick={goToPrevMonth} size={isMobile ? 'small' : 'medium'}>
                        <ChevronLeft />
                    </IconButton>
                    <Typography
                        variant={isMobile ? 'h6' : 'h5'}
                        sx={{
                            fontWeight: 'bold',
                            minWidth: isMobile ? 160 : 220,
                            textAlign: 'center',
                            userSelect: 'none',
                        }}
                    >
                        {MONTH_NAMES[month]} {year}
                    </Typography>
                    <IconButton onClick={goToNextMonth} size={isMobile ? 'small' : 'medium'}>
                        <ChevronRight />
                    </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {!loading && monthTotal > 0 && (
                        <Chip
                            label={`${monthTotal} manutenç${monthTotal === 1 ? 'ão' : 'ões'} no mês`}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                    )}
                    <Button variant="outlined" size="small" startIcon={<Today />} onClick={goToToday}>
                        Hoje
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {/* Calendar Grid */}
                    <Paper elevation={1} sx={{ overflow: 'hidden', borderRadius: 2 }}>
                        {/* Day of week headers */}
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            borderBottom: `1px solid ${theme.palette.divider}`,
                        }}>
                            {DAY_NAMES.map((name, idx) => (
                                <Box key={name} sx={{
                                    py: 1,
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                                    color: idx === 0 || idx === 6
                                        ? theme.palette.error.main
                                        : theme.palette.text.secondary,
                                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                                }}>
                                    {name}
                                </Box>
                            ))}
                        </Box>

                        {/* Week rows */}
                        {weeks.map((week, wIdx) => (
                            <Box key={wIdx} sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(7, 1fr)',
                                borderBottom: wIdx < weeks.length - 1
                                    ? `1px solid ${theme.palette.divider}`
                                    : 'none',
                            }}>
                                {week.map((day, dIdx) => {
                                    const dayData = day ? (calendarData[String(day)] || []) : [];
                                    const isToday = isCurrentMonth && day === todayDate;
                                    const isSelected = day === selectedDay;
                                    const hasMaintenances = dayData.length > 0;

                                    return (
                                        <Box
                                            key={dIdx}
                                            onClick={() => day && handleDayClick(day)}
                                            sx={{
                                                minHeight: isMobile ? 52 : 76,
                                                p: 0.5,
                                                cursor: day ? 'pointer' : 'default',
                                                borderRight: dIdx < 6
                                                    ? `1px solid ${theme.palette.divider}`
                                                    : 'none',
                                                bgcolor: isSelected
                                                    ? alpha(theme.palette.primary.main, 0.12)
                                                    : isToday
                                                        ? alpha(theme.palette.warning.main, 0.08)
                                                        : day
                                                            ? 'transparent'
                                                            : alpha(theme.palette.action.disabled, 0.04),
                                                transition: 'background-color 0.15s',
                                                '&:hover': day ? {
                                                    bgcolor: isSelected
                                                        ? alpha(theme.palette.primary.main, 0.18)
                                                        : alpha(theme.palette.action.hover, 0.08),
                                                } : {},
                                            }}
                                        >
                                            {day && (
                                                <>
                                                    <Typography
                                                        variant="body2"
                                                        component="div"
                                                        sx={{
                                                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                                                            ...(isToday ? {
                                                                fontWeight: 'bold',
                                                                bgcolor: theme.palette.primary.main,
                                                                color: '#fff',
                                                                borderRadius: '50%',
                                                                width: isMobile ? 22 : 28,
                                                                height: isMobile ? 22 : 28,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            } : {
                                                                color: dIdx === 0 || dIdx === 6
                                                                    ? theme.palette.error.light
                                                                    : theme.palette.text.primary,
                                                            }),
                                                        }}
                                                    >
                                                        {day}
                                                    </Typography>

                                                    {hasMaintenances && (
                                                        <Box sx={{
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            gap: 0.3,
                                                            mt: 0.3,
                                                        }}>
                                                            {!isMobile && dayData.length <= 4 ? (
                                                                dayData.map((m, i) => (
                                                                    <Box key={i} sx={{
                                                                        width: 8,
                                                                        height: 8,
                                                                        borderRadius: '50%',
                                                                        bgcolor: m.isProjected
                                                                            ? 'transparent'
                                                                            : (PRIORITY_COLORS[m.priority] || PRIORITY_COLORS.media),
                                                                        border: `2px ${m.isProjected ? 'dashed' : 'solid'} ${PRIORITY_COLORS[m.priority] || PRIORITY_COLORS.media}`,
                                                                    }} />
                                                                ))
                                                            ) : (
                                                                <Chip
                                                                    label={dayData.length}
                                                                    size="small"
                                                                    sx={{
                                                                        height: isMobile ? 18 : 22,
                                                                        fontSize: isMobile ? '0.65rem' : '0.7rem',
                                                                        fontWeight: 'bold',
                                                                        bgcolor: dayData.some(m => m.priority === 'critica')
                                                                            ? PRIORITY_COLORS.critica
                                                                            : dayData.some(m => m.priority === 'alta')
                                                                                ? PRIORITY_COLORS.alta
                                                                                : PRIORITY_COLORS.media,
                                                                        color: '#fff',
                                                                        '& .MuiChip-label': { px: 0.5 },
                                                                    }}
                                                                />
                                                            )}
                                                        </Box>
                                                    )}
                                                </>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        ))}
                    </Paper>

                    {/* Legend */}
                    <Box sx={{
                        display: 'flex',
                        gap: 2,
                        mt: 1.5,
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                    }}>
                        {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: PRIORITY_COLORS[key],
                                }} />
                                <Typography variant="caption" color="text.secondary">{label}</Typography>
                            </Box>
                        ))}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                border: '2px dashed #999',
                                bgcolor: 'transparent',
                            }} />
                            <Typography variant="caption" color="text.secondary">Projeção</Typography>
                        </Box>
                    </Box>

                    {/* Selected Day Details */}
                    {selectedDay !== null && (
                        <Paper elevation={2} sx={{ mt: 2, p: 2, borderRadius: 2 }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                {selectedDay} de {MONTH_NAMES[month]} de {year}
                            </Typography>

                            {selectedDayMaintenances.length === 0 ? (
                                <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                                    Nenhuma manutenção programada para este dia.
                                </Typography>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {selectedDayMaintenances.map((m, idx) => (
                                        <Paper
                                            key={idx}
                                            variant="outlined"
                                            sx={{
                                                p: 1.5,
                                                borderLeft: `4px solid ${PRIORITY_COLORS[m.priority] || PRIORITY_COLORS.media}`,
                                                borderLeftStyle: 'solid',
                                                borderStyle: m.isProjected ? 'dashed' : 'solid',
                                                opacity: m.isProjected ? 0.85 : 1,
                                            }}
                                        >
                                            <Box sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                            }}>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                        {m.materialDescription || 'Material não identificado'}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{ mt: 0.5 }}
                                                    >
                                                        {m.description || 'Sem descrição'}
                                                    </Typography>
                                                    <Box sx={{
                                                        display: 'flex',
                                                        gap: 0.75,
                                                        mt: 1,
                                                        flexWrap: 'wrap',
                                                    }}>
                                                        <Chip
                                                            label={getMaintenanceTypeLabel(m.type, m.customRecurrenceDays)}
                                                            size="small"
                                                            sx={{ fontSize: '0.7rem' }}
                                                        />
                                                        <Chip
                                                            label={PRIORITY_LABELS[m.priority] || 'Média'}
                                                            size="small"
                                                            sx={{
                                                                fontSize: '0.7rem',
                                                                bgcolor: alpha(
                                                                    PRIORITY_COLORS[m.priority] || PRIORITY_COLORS.media,
                                                                    0.15
                                                                ),
                                                                color: PRIORITY_COLORS[m.priority] || PRIORITY_COLORS.media,
                                                                fontWeight: 'bold',
                                                            }}
                                                        />
                                                        {m.isProjected && (
                                                            <Chip
                                                                label="Projeção"
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{
                                                                    fontSize: '0.7rem',
                                                                    borderStyle: 'dashed',
                                                                }}
                                                            />
                                                        )}
                                                        {m.materialCategory && (
                                                            <Chip
                                                                label={m.materialCategory}
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{ fontSize: '0.7rem' }}
                                                            />
                                                        )}
                                                    </Box>
                                                </Box>

                                                {!m.isProjected && (
                                                    <Tooltip title="Antecipar / Postergar">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenEdit(m)}
                                                            color="primary"
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </Paper>
                                    ))}
                                </Box>
                            )}
                        </Paper>
                    )}
                </>
            )}

            {/* Edit Date Dialog */}
            <Dialog open={editDialog.open} onClose={handleCloseEdit} maxWidth="xs" fullWidth>
                <DialogTitle>Antecipar / Postergar Manutenção</DialogTitle>
                <DialogContent>
                    {editDialog.maintenance && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                {editDialog.maintenance.materialDescription}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {editDialog.maintenance.description}
                            </Typography>
                        </Box>
                    )}
                    <TextField
                        label="Nova data"
                        type="date"
                        fullWidth
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEdit} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSaveEdit}
                        variant="contained"
                        disabled={saving || !editDate}
                    >
                        {saving ? <CircularProgress size={20} /> : 'Salvar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default MaintenanceCalendarView;
