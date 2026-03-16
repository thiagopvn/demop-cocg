import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Chip,
    IconButton,
    Paper,
    CircularProgress,
    Alert,
    Tooltip,
    Button,
    Avatar,
    alpha
} from '@mui/material';
import {
    CalendarMonth,
    CheckCircle,
    Build,
    Refresh,
    Notifications,
    NotificationsActive,
    AccessTime,
    ErrorOutline
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
    getTodayMaintenances,
    checkAndNotifyMaintenances,
    requestNotificationPermission,
    isNotificationSupported
} from '../../services/maintenanceNotificationService';
import { getMaintenanceTypeLabel } from '../../data/maintenanceTemplates';

const UpcomingMaintenances = ({ onComplete }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [todayItems, setTodayItems] = useState([]);
    const [notificationStatus, setNotificationStatus] = useState('unknown');

    useEffect(() => {
        loadData();
        checkNotificationStatus();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getTodayMaintenances();
            setTodayItems(data);
            await checkAndNotifyMaintenances();
        } catch (error) {
            console.error('Erro ao carregar manutenções:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkNotificationStatus = async () => {
        if (!isNotificationSupported()) {
            setNotificationStatus('unsupported');
            return;
        }
        setNotificationStatus(Notification.permission);
    };

    const handleEnableNotifications = async () => {
        const permission = await requestNotificationPermission();
        setNotificationStatus(permission);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit'
        });
    };

    const getDaysText = (date) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const diffTime = targetDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'HOJE';
        if (diffDays === 1) return 'AMANHA';
        if (diffDays === -1) return '1 DIA ATRASADA';
        if (diffDays < 0) return `${Math.abs(diffDays)} DIAS ATRASADA`;
        return `EM ${diffDays} DIAS`;
    };

    const getPriorityConfig = (priority) => {
        switch (priority) {
            case 'critica': return { label: 'CRITICA', color: '#ef4444' };
            case 'alta': return { label: 'ALTA', color: '#f59e0b' };
            case 'media': return { label: 'MEDIA', color: '#3b82f6' };
            case 'baixa': return { label: 'BAIXA', color: '#6b7280' };
            default: return { label: 'MEDIA', color: '#3b82f6' };
        }
    };

    // Renderiza cada manutenção como um card grande no estilo da missão DEMOP
    const renderMaintenanceCard = (item, isOverdue, isToday) => {
        const priorityConfig = getPriorityConfig(item.priority);
        const borderColor = isOverdue ? '#ef4444' : isToday ? '#f59e0b' : '#3b82f6';
        const iconColor = isOverdue ? '#ef4444' : isToday ? '#f59e0b' : '#1e3a5f';
        const labelText = isOverdue ? 'MANUTENÇÃO ATRASADA' : isToday ? 'MANUTENÇÃO PARA HOJE' : 'PRÓXIMA MANUTENÇÃO';
        const shouldPulse = isOverdue;

        return (
            <Paper
                key={item.id}
                elevation={isOverdue ? 8 : 4}
                sx={{
                    p: { xs: 2, sm: 3 },
                    mb: 2,
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: borderColor,
                    background: (t) => t.palette.mode === 'dark'
                        ? `linear-gradient(135deg, ${alpha(iconColor, 0.15)} 0%, ${alpha(borderColor, 0.1)} 100%)`
                        : `linear-gradient(135deg, ${alpha(iconColor, 0.06)} 0%, ${alpha(borderColor, 0.04)} 100%)`,
                    boxShadow: `0 8px 32px ${alpha(borderColor, 0.25)}`,
                    animation: shouldPulse ? 'maintPulse 3s ease-in-out infinite' : 'none',
                    '@keyframes maintPulse': {
                        '0%, 100%': { boxShadow: `0 8px 32px ${alpha(borderColor, 0.25)}` },
                        '50%': { boxShadow: `0 8px 48px ${alpha(borderColor, 0.45)}` },
                    },
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0, left: 0, right: 0,
                        height: 6,
                        background: `linear-gradient(90deg, ${iconColor} 0%, ${borderColor} 50%, ${iconColor} 100%)`,
                        backgroundSize: '200% 100%',
                        animation: shouldPulse ? 'maintShimmer 2s linear infinite' : 'none',
                        '@keyframes maintShimmer': {
                            '0%': { backgroundPosition: '200% 0' },
                            '100%': { backgroundPosition: '-200% 0' },
                        },
                    },
                }}
            >
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1.5, sm: 2 }, mb: 1.5 }}>
                    <Avatar
                        sx={{
                            bgcolor: alpha(iconColor, 0.15),
                            color: iconColor,
                            width: { xs: 40, sm: 56 },
                            height: { xs: 40, sm: 56 },
                            border: `2px solid ${alpha(iconColor, 0.3)}`,
                        }}
                    >
                        {isOverdue ? <ErrorOutline sx={{ fontSize: { xs: 20, sm: 28 } }} /> : <Build sx={{ fontSize: { xs: 20, sm: 28 } }} />}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant="overline"
                            sx={{
                                fontWeight: 800,
                                letterSpacing: 1.5,
                                color: borderColor,
                                fontSize: { xs: '0.6rem', sm: '0.7rem' },
                            }}
                        >
                            {labelText}
                        </Typography>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 800,
                                fontSize: { xs: '1rem', sm: '1.35rem' },
                                lineHeight: 1.3,
                                color: 'text.primary',
                            }}
                        >
                            {item.description || item.materialDescription}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                mt: 0.5,
                                color: 'text.secondary',
                                fontSize: { xs: '0.8rem', sm: '0.92rem' },
                                lineHeight: 1.5,
                                fontWeight: 500,
                            }}
                        >
                            Material: {item.materialDescription}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, flexShrink: 0 }}>
                        <Chip
                            label={priorityConfig.label}
                            size="small"
                            sx={{
                                fontWeight: 800,
                                fontSize: { xs: '0.6rem', sm: '0.7rem' },
                                bgcolor: alpha(priorityConfig.color, 0.15),
                                color: priorityConfig.color,
                                border: `1px solid ${alpha(priorityConfig.color, 0.3)}`,
                            }}
                        />
                        <Chip
                            label={getMaintenanceTypeLabel(item.type, item.customRecurrenceDays)}
                            size="small"
                            sx={{
                                fontWeight: 600,
                                fontSize: { xs: '0.55rem', sm: '0.65rem' },
                                bgcolor: alpha(iconColor, 0.1),
                                color: iconColor,
                            }}
                        />
                    </Box>
                </Box>

                {/* Footer */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 1,
                    pt: 1,
                    borderTop: `1px solid ${alpha(borderColor, 0.15)}`,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
                        <Chip
                            icon={<AccessTime sx={{ fontSize: '14px !important' }} />}
                            label={`${formatDate(item.dueDate)} - ${getDaysText(item.dueDate)}`}
                            size="small"
                            sx={{
                                fontWeight: 700,
                                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                bgcolor: alpha(borderColor, 0.1),
                                color: borderColor,
                                '& .MuiChip-icon': { color: borderColor },
                            }}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => navigate('/manutencao?tab=1')}
                            sx={{
                                fontWeight: 700,
                                borderRadius: 2,
                                fontSize: { xs: '0.65rem', sm: '0.72rem' },
                                px: { xs: 1, sm: 1.5 },
                                borderColor: borderColor,
                                color: borderColor,
                                '&:hover': { borderColor: borderColor, bgcolor: alpha(borderColor, 0.08) },
                            }}
                        >
                            Ver no Cronograma
                        </Button>
                        {onComplete && (item.status === 'pendente' || item.status === 'em_andamento') && (
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
                                onClick={() => onComplete(item)}
                                sx={{
                                    bgcolor: '#22c55e',
                                    fontWeight: 700,
                                    borderRadius: 2,
                                    fontSize: { xs: '0.7rem', sm: '0.78rem' },
                                    px: { xs: 1.5, sm: 2.5 },
                                    '&:hover': { bgcolor: '#16a34a' },
                                }}
                            >
                                Concluir
                            </Button>
                        )}
                    </Box>
                </Box>
            </Paper>
        );
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (todayItems.length === 0) {
        return (
            <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: 2 }}>
                Nenhuma manutenção para hoje!
            </Alert>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Build sx={{ color: '#f59e0b', fontSize: 28 }} />
                    <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.4rem' } }}>
                        Manutenções de Hoje ({todayItems.length})
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {notificationStatus !== 'granted' && notificationStatus !== 'unsupported' && (
                        <Tooltip title="Ativar notificações do navegador">
                            <IconButton size="small" onClick={handleEnableNotifications}>
                                <Notifications />
                            </IconButton>
                        </Tooltip>
                    )}
                    {notificationStatus === 'granted' && (
                        <Tooltip title="Notificações ativas">
                            <NotificationsActive color="success" sx={{ mr: 0.5 }} />
                        </Tooltip>
                    )}
                    <Tooltip title="Atualizar">
                        <IconButton size="small" onClick={loadData}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Cards de manutenções de hoje */}
            {todayItems.map(item => renderMaintenanceCard(item, false, true))}

            {/* Botão ver cronograma completo */}
            <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/manutencao')}
                startIcon={<CalendarMonth />}
                sx={{ mt: 1, fontWeight: 700, borderRadius: 2 }}
            >
                Ver Cronograma Completo
            </Button>
        </Box>
    );
};

export default UpcomingMaintenances;
