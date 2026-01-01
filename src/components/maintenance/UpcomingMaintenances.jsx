import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    Chip,
    IconButton,
    Paper,
    Divider,
    CircularProgress,
    Alert,
    Tooltip,
    Button,
    Collapse
} from '@mui/material';
import {
    Warning,
    Schedule,
    Today,
    CalendarMonth,
    CheckCircle,
    Build,
    ExpandMore,
    ExpandLess,
    Refresh,
    Notifications,
    NotificationsActive
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
    getMaintenanceSummary,
    checkAndNotifyMaintenances,
    requestNotificationPermission,
    isNotificationSupported
} from '../../services/maintenanceNotificationService';

const UpcomingMaintenances = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        overdue: [],
        today: [],
        upcoming: [],
        overdueCount: 0,
        todayCount: 0,
        upcomingCount: 0,
        totalPending: 0
    });
    const [expandedSections, setExpandedSections] = useState({
        overdue: true,
        today: true,
        upcoming: false
    });
    const [notificationStatus, setNotificationStatus] = useState('unknown');

    useEffect(() => {
        loadData();
        checkNotificationStatus();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getMaintenanceSummary();
            setSummary(data);

            // Verificar e enviar notificações
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

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit'
        });
    };

    const getDaysText = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoje';
        if (diffDays === 1) return 'Amanhã';
        if (diffDays === -1) return 'Ontem';
        if (diffDays < 0) return `${Math.abs(diffDays)} dias atrás`;
        return `em ${diffDays} dias`;
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critica': return 'error';
            case 'alta': return 'warning';
            case 'media': return 'info';
            case 'baixa': return 'default';
            default: return 'default';
        }
    };

    const renderMaintenanceItem = (item, isOverdue = false) => (
        <ListItem
            key={item.id}
            sx={{
                bgcolor: isOverdue ? 'error.light' : 'transparent',
                borderRadius: 1,
                mb: 0.5,
                '&:hover': {
                    bgcolor: isOverdue ? 'error.light' : 'action.hover'
                }
            }}
        >
            <ListItemIcon>
                {isOverdue ? (
                    <Warning color="error" />
                ) : item.type === 'corretiva' || item.type === 'reparo' ? (
                    <Build color="warning" />
                ) : (
                    <Schedule color="primary" />
                )}
            </ListItemIcon>
            <ListItemText
                primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                            {item.materialDescription}
                        </Typography>
                        {item.isRecurrent && (
                            <Chip label="Recorrente" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                    </Box>
                }
                secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                            label={item.type}
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                        <Typography variant="caption" color={isOverdue ? 'error' : 'text.secondary'}>
                            {formatDate(item.dueDate)} ({getDaysText(item.dueDate)})
                        </Typography>
                    </Box>
                }
            />
            <ListItemSecondaryAction>
                <Chip
                    label={item.priority}
                    color={getPriorityColor(item.priority)}
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                />
            </ListItemSecondaryAction>
        </ListItem>
    );

    const renderSection = (title, icon, items, sectionKey, color, isOverdue = false) => {
        if (items.length === 0) return null;

        return (
            <Box sx={{ mb: 2 }}>
                <Button
                    fullWidth
                    onClick={() => toggleSection(sectionKey)}
                    sx={{
                        justifyContent: 'space-between',
                        py: 1,
                        px: 2,
                        bgcolor: `${color}.light`,
                        color: `${color}.dark`,
                        '&:hover': {
                            bgcolor: `${color}.main`,
                            color: 'white'
                        }
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {icon}
                        <Typography variant="subtitle2">
                            {title} ({items.length})
                        </Typography>
                    </Box>
                    {expandedSections[sectionKey] ? <ExpandLess /> : <ExpandMore />}
                </Button>
                <Collapse in={expandedSections[sectionKey]}>
                    <Paper variant="outlined" sx={{ mt: 0.5, maxHeight: 200, overflow: 'auto' }}>
                        <List dense disablePadding>
                            {items.slice(0, 5).map(item => renderMaintenanceItem(item, isOverdue))}
                            {items.length > 5 && (
                                <ListItem>
                                    <ListItemText
                                        primary={
                                            <Typography variant="caption" color="text.secondary" align="center" sx={{ width: '100%', display: 'block' }}>
                                                + {items.length - 5} mais...
                                            </Typography>
                                        }
                                    />
                                </ListItem>
                            )}
                        </List>
                    </Paper>
                </Collapse>
            </Box>
        );
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    return (
        <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarMonth color="primary" />
                    <Typography variant="h6">
                        Próximas Manutenções
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {notificationStatus !== 'granted' && notificationStatus !== 'unsupported' && (
                        <Tooltip title="Ativar notificações do navegador">
                            <IconButton size="small" onClick={handleEnableNotifications}>
                                <Notifications />
                            </IconButton>
                        </Tooltip>
                    )}
                    {notificationStatus === 'granted' && (
                        <Tooltip title="Notificações ativas">
                            <NotificationsActive color="success" sx={{ mr: 1 }} />
                        </Tooltip>
                    )}
                    <Tooltip title="Atualizar">
                        <IconButton size="small" onClick={loadData}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {summary.totalPending === 0 ? (
                <Alert severity="success" icon={<CheckCircle />}>
                    Nenhuma manutenção pendente!
                </Alert>
            ) : (
                <>
                    {renderSection(
                        'Atrasadas',
                        <Warning fontSize="small" />,
                        summary.overdue,
                        'overdue',
                        'error',
                        true
                    )}

                    {renderSection(
                        'Para Hoje',
                        <Today fontSize="small" />,
                        summary.today,
                        'today',
                        'warning'
                    )}

                    {renderSection(
                        'Próximos 7 dias',
                        <Schedule fontSize="small" />,
                        summary.upcoming,
                        'upcoming',
                        'info'
                    )}

                    <Divider sx={{ my: 2 }} />

                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => navigate('/manutencao')}
                        startIcon={<CalendarMonth />}
                    >
                        Ver Cronograma Completo
                    </Button>
                </>
            )}
        </Paper>
    );
};

export default UpcomingMaintenances;
