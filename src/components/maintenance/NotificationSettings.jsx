import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControlLabel,
    Switch,
    Slider,
    Typography,
    Box,
    Divider,
    Alert,
    Chip
} from '@mui/material';
import {
    Notifications,
    NotificationsActive,
    NotificationsOff,
    Settings,
    Schedule,
    Warning,
    Today
} from '@mui/icons-material';
import {
    getNotificationSettings,
    saveNotificationSettings,
    isNotificationSupported,
    requestNotificationPermission,
    sendBrowserNotification
} from '../../services/maintenanceNotificationService';

const NotificationSettings = ({ open, onClose }) => {
    const [settings, setSettings] = useState(getNotificationSettings());
    const [permissionStatus, setPermissionStatus] = useState('unknown');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (open) {
            setSettings(getNotificationSettings());
            checkPermission();
            setSaved(false);
        }
    }, [open]);

    const checkPermission = () => {
        if (!isNotificationSupported()) {
            setPermissionStatus('unsupported');
            return;
        }
        setPermissionStatus(Notification.permission);
    };

    const handleRequestPermission = async () => {
        const permission = await requestNotificationPermission();
        setPermissionStatus(permission);
    };

    const handleTestNotification = () => {
        sendBrowserNotification('Teste de Notificação', {
            body: 'As notificações estão funcionando corretamente!',
            tag: 'test-notification'
        });
    };

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleSave = () => {
        saveNotificationSettings(settings);
        setSaved(true);
    };

    const handleClose = () => {
        onClose();
    };

    const getPermissionIcon = () => {
        switch (permissionStatus) {
            case 'granted':
                return <NotificationsActive color="success" />;
            case 'denied':
                return <NotificationsOff color="error" />;
            case 'unsupported':
                return <NotificationsOff color="disabled" />;
            default:
                return <Notifications color="warning" />;
        }
    };

    const getPermissionText = () => {
        switch (permissionStatus) {
            case 'granted':
                return 'Notificações permitidas';
            case 'denied':
                return 'Notificações bloqueadas no navegador';
            case 'unsupported':
                return 'Navegador não suporta notificações';
            default:
                return 'Permissão não solicitada';
        }
    };

    const getPermissionColor = () => {
        switch (permissionStatus) {
            case 'granted':
                return 'success';
            case 'denied':
                return 'error';
            case 'unsupported':
                return 'default';
            default:
                return 'warning';
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Settings color="primary" />
                    <Typography variant="h6">
                        Configurações de Notificação
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent>
                {/* Status de Permissão */}
                <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getPermissionIcon()}
                            <Typography variant="subtitle2">
                                Status das Notificações
                            </Typography>
                        </Box>
                        <Chip
                            label={getPermissionText()}
                            color={getPermissionColor()}
                            size="small"
                        />
                    </Box>

                    {permissionStatus === 'default' && (
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<Notifications />}
                            onClick={handleRequestPermission}
                            sx={{ mt: 1 }}
                        >
                            Permitir Notificações
                        </Button>
                    )}

                    {permissionStatus === 'granted' && (
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleTestNotification}
                            sx={{ mt: 1 }}
                        >
                            Testar Notificação
                        </Button>
                    )}

                    {permissionStatus === 'denied' && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                            As notificações foram bloqueadas. Acesse as configurações do navegador para permitir.
                        </Alert>
                    )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Configurações Gerais */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Configurações Gerais
                    </Typography>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.enabled}
                                onChange={(e) => handleChange('enabled', e.target.checked)}
                            />
                        }
                        label="Ativar sistema de lembretes"
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.showBrowserNotifications}
                                onChange={(e) => handleChange('showBrowserNotifications', e.target.checked)}
                                disabled={!settings.enabled || permissionStatus !== 'granted'}
                            />
                        }
                        label="Mostrar notificações do navegador"
                    />
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Tipos de Notificação */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Tipos de Notificação
                    </Typography>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.notifyOverdue}
                                onChange={(e) => handleChange('notifyOverdue', e.target.checked)}
                                disabled={!settings.enabled}
                            />
                        }
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Warning fontSize="small" color="error" />
                                <span>Manutenções atrasadas</span>
                            </Box>
                        }
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.notifyToday}
                                onChange={(e) => handleChange('notifyToday', e.target.checked)}
                                disabled={!settings.enabled}
                            />
                        }
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Today fontSize="small" color="warning" />
                                <span>Manutenções para hoje</span>
                            </Box>
                        }
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.notifyUpcoming}
                                onChange={(e) => handleChange('notifyUpcoming', e.target.checked)}
                                disabled={!settings.enabled}
                            />
                        }
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Schedule fontSize="small" color="info" />
                                <span>Manutenções próximas</span>
                            </Box>
                        }
                    />
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Configuração de Antecedência */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Antecedência do Lembrete (padrão)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Notificar {settings.daysBeforeReminder} dia(s) antes da data prevista
                    </Typography>
                    <Slider
                        value={settings.daysBeforeReminder}
                        onChange={(e, value) => handleChange('daysBeforeReminder', value)}
                        min={1}
                        max={30}
                        step={1}
                        marks={[
                            { value: 1, label: '1d' },
                            { value: 7, label: '7d' },
                            { value: 14, label: '14d' },
                            { value: 30, label: '30d' }
                        ]}
                        valueLabelDisplay="auto"
                        disabled={!settings.enabled}
                    />
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Intervalo de Verificação */}
                <Box>
                    <Typography variant="subtitle2" gutterBottom>
                        Intervalo de Verificação
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Verificar manutenções a cada {settings.checkIntervalMinutes} minuto(s)
                    </Typography>
                    <Slider
                        value={settings.checkIntervalMinutes}
                        onChange={(e, value) => handleChange('checkIntervalMinutes', value)}
                        min={5}
                        max={120}
                        step={5}
                        marks={[
                            { value: 5, label: '5min' },
                            { value: 30, label: '30min' },
                            { value: 60, label: '1h' },
                            { value: 120, label: '2h' }
                        ]}
                        valueLabelDisplay="auto"
                        disabled={!settings.enabled}
                    />
                </Box>

                {saved && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        Configurações salvas com sucesso!
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleClose}>
                    Fechar
                </Button>
                <Button onClick={handleSave} variant="contained">
                    Salvar Configurações
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default NotificationSettings;
