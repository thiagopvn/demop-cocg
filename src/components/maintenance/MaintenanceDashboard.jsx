import { useEffect, useState } from 'react';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    LinearProgress,
    Alert,
    Paper,
    IconButton,
    Tooltip,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Checkbox,
    FormControlLabel,
    alpha,
    useTheme
} from '@mui/material';
import {
    Build,
    Warning,
    EventBusy,
    CheckCircle,
    Schedule,
    Engineering,
    Settings,
    Refresh,
    Today,
    CalendarMonth,
    TrendingUp,
    Repeat,
    NotificationsActive,
    AccessTime,
    PriorityHigh
} from '@mui/icons-material';
import { collection, query, where, getDocs, Timestamp, doc, updateDoc, addDoc, orderBy } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import db from '../../firebase/db';
import { verifyToken } from '../../firebase/token';
import { logAudit } from '../../firebase/auditLog';
import { createNextRecurrentMaintenance } from '../../services/maintenanceNotificationService';
import UpcomingMaintenances from './UpcomingMaintenances';
import NotificationSettings from './NotificationSettings';

const MaintenanceDashboard = () => {
    const theme = useTheme();
    const [stats, setStats] = useState({
        inMaintenance: 0,
        overdue: 0,
        inoperant: 0,
        scheduled: 0,
        completed: 0,
        pending: 0,
        recurrent: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [chartData, setChartData] = useState({
        byType: [],
        byPriority: [],
        byMonth: []
    });

    // Manutenções do dia + atrasadas
    const [todayItems, setTodayItems] = useState([]);
    const [overdueItems, setOverdueItems] = useState([]);
    const [currentUser, setCurrentUser] = useState({ userId: '', userName: '' });

    // Dialog de conclusão
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [completionData, setCompletionData] = useState({
        completionNotes: '',
        confirmedAsPlanned: false,
        maintenanceId: null,
        maintenance: null
    });

    useEffect(() => {
        fetchStats();
        fetchTodayMaintenances();
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const token = localStorage.getItem('token');
            const user = await verifyToken(token);
            if (user) setCurrentUser({ userId: user.userId || '', userName: user.username || '' });
        } catch {}
    };

    const fetchTodayMaintenances = async () => {
        try {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

            // Pendentes para hoje
            const todayQ = query(
                collection(db, 'manutencoes'),
                where('status', 'in', ['pendente', 'em_andamento']),
                orderBy('dueDate', 'asc')
            );
            const snapshot = await getDocs(todayQ);
            const all = snapshot.docs.map(d => {
                const raw = d.data();
                return {
                    id: d.id,
                    ...raw,
                    dueDate: raw.dueDate?.toDate() || new Date(),
                    completedAt: raw.completedAt?.toDate() || null,
                    lastCompletedAt: raw.lastCompletedAt?.toDate() || null,
                    createdAt: raw.createdAt?.toDate() || null
                };
            });

            const today = all.filter(m => m.dueDate >= startOfDay && m.dueDate <= endOfDay);
            const overdue = all.filter(m => m.dueDate < startOfDay);

            setTodayItems(today);
            setOverdueItems(overdue);
        } catch (err) {
            console.error('Erro ao buscar manutenções do dia:', err);
        }
    };

    const handleOpenComplete = (maintenance) => {
        setCompletionData({
            completionNotes: '',
            confirmedAsPlanned: false,
            maintenanceId: maintenance.id,
            maintenance
        });
        setCompleteDialogOpen(true);
    };

    const handleConfirmComplete = async () => {
        const { maintenanceId, maintenance, completionNotes, confirmedAsPlanned } = completionData;
        const finalNotes = confirmedAsPlanned
            ? `[CONFORME PREVISTO] ${completionNotes || ''}`.trim()
            : completionNotes;

        try {
            const now = Timestamp.now();
            const nowDate = now.toDate();
            await updateDoc(doc(db, 'manutencoes', maintenanceId), {
                status: 'concluida',
                updatedAt: now,
                completedAt: now,
                completionNotes: finalNotes || '',
                completedBy: currentUser.userName || ''
            });

            // Histórico
            await addDoc(collection(db, 'historico_manutencoes'), {
                materialId: maintenance.materialId,
                materialDescription: maintenance.materialDescription,
                materialCategory: maintenance.materialCategory,
                type: maintenance.type,
                dueDate: maintenance.dueDate instanceof Date ? Timestamp.fromDate(maintenance.dueDate) : maintenance.dueDate,
                description: maintenance.description || '',
                priority: maintenance.priority || 'media',
                estimatedDuration: maintenance.estimatedDuration || null,
                requiredParts: maintenance.requiredParts || [],
                isRecurrent: maintenance.isRecurrent || false,
                recurrenceType: maintenance.recurrenceType || null,
                recurrenceCount: maintenance.recurrenceCount || 0,
                responsibleName: '',
                completedBy: currentUser.userName || '',
                createdAt: maintenance.createdAt instanceof Date ? Timestamp.fromDate(maintenance.createdAt) : (maintenance.createdAt || Timestamp.now()),
                createdBy: maintenance.createdBy || '',
                completedAt: now,
                completionNotes: finalNotes || '',
                originalId: maintenance.id
            });

            // Recorrência
            if (maintenance?.isRecurrent && maintenance?.recurrenceType) {
                await createNextRecurrentMaintenance({ ...maintenance, completedAt: nowDate, completionNotes: finalNotes });
            }

            // Material operante
            if (maintenance?.materialId) {
                try {
                    await updateDoc(doc(db, 'materials', maintenance.materialId), {
                        maintenance_status: 'operante',
                        last_maintenance_update: now,
                        last_maintenance_date: now
                    });
                } catch {}
            }

            logAudit({
                action: 'manutencao_complete',
                userId: currentUser.userId,
                userName: currentUser.userName,
                targetCollection: 'manutencoes',
                targetId: maintenanceId,
                targetName: maintenance?.materialDescription || '',
                details: {
                    tipo: maintenance?.type,
                    descricao: maintenance?.description || '',
                    o_que_foi_feito: finalNotes,
                    recorrente: maintenance?.isRecurrent ? maintenance?.recurrenceType : 'não',
                    concluido_em: nowDate.toLocaleString('pt-BR')
                }
            });

            setCompleteDialogOpen(false);
            setCompletionData({ completionNotes: '', confirmedAsPlanned: false, maintenanceId: null, maintenance: null });
            fetchTodayMaintenances();
            fetchStats();
        } catch (error) {
            console.error('Erro ao concluir manutenção:', error);
        }
    };

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);

            // Materiais em manutenção
            const inMaintenanceQuery = query(
                collection(db, 'materials'),
                where('maintenance_status', '==', 'em_manutencao')
            );
            const inMaintenanceSnapshot = await getDocs(inMaintenanceQuery);

            // Tarefas atrasadas
            const today = Timestamp.now();
            const overdueQuery = query(
                collection(db, 'manutencoes'),
                where('dueDate', '<', today),
                where('status', '==', 'pendente')
            );
            const overdueSnapshot = await getDocs(overdueQuery);

            // Materiais inoperantes
            const inoperantQuery = query(
                collection(db, 'materials'),
                where('maintenance_status', '==', 'inoperante')
            );
            const inoperantSnapshot = await getDocs(inoperantQuery);

            // Manutenções agendadas (futuras)
            const scheduledQuery = query(
                collection(db, 'manutencoes'),
                where('dueDate', '>=', today),
                where('status', '==', 'pendente')
            );
            const scheduledSnapshot = await getDocs(scheduledQuery);

            // Manutenções concluídas
            const completedQuery = query(
                collection(db, 'manutencoes'),
                where('status', '==', 'concluida')
            );
            const completedSnapshot = await getDocs(completedQuery);

            // Manutenções pendentes
            const pendingQuery = query(
                collection(db, 'manutencoes'),
                where('status', '==', 'pendente')
            );
            const pendingSnapshot = await getDocs(pendingQuery);

            // Manutenções recorrentes ativas
            const recurrentQuery = query(
                collection(db, 'manutencoes'),
                where('isRecurrent', '==', true),
                where('status', 'in', ['pendente', 'em_andamento'])
            );
            const recurrentSnapshot = await getDocs(recurrentQuery);

            // Buscar dados para gráficos
            const allMaintenances = await getDocs(collection(db, 'manutencoes'));
            const maintenanceData = allMaintenances.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Processar dados para gráficos
            processChartData(maintenanceData);

            setStats({
                inMaintenance: inMaintenanceSnapshot.size,
                overdue: overdueSnapshot.size,
                inoperant: inoperantSnapshot.size,
                scheduled: scheduledSnapshot.size,
                completed: completedSnapshot.size,
                pending: pendingSnapshot.size,
                recurrent: recurrentSnapshot.size
            });
        } catch (err) {
            console.error('Erro ao buscar estatísticas:', err);
            setError('Erro ao carregar dados do dashboard');
        } finally {
            setLoading(false);
        }
    };

    const processChartData = (data) => {
        // Por tipo
        const typeCount = {};
        data.forEach(item => {
            const type = item.type || 'outros';
            typeCount[type] = (typeCount[type] || 0) + 1;
        });
        const byType = Object.entries(typeCount).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value
        }));

        // Por prioridade
        const priorityCount = { baixa: 0, media: 0, alta: 0, critica: 0 };
        data.forEach(item => {
            const priority = item.priority || 'media';
            priorityCount[priority] = (priorityCount[priority] || 0) + 1;
        });
        const byPriority = [
            { name: 'Baixa', value: priorityCount.baixa, color: '#9e9e9e' },
            { name: 'Média', value: priorityCount.media, color: '#2196f3' },
            { name: 'Alta', value: priorityCount.alta, color: '#ff9800' },
            { name: 'Crítica', value: priorityCount.critica, color: '#f44336' }
        ].filter(item => item.value > 0);

        // Por mês (últimos 6 meses)
        const monthCount = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            monthCount[key] = { programadas: 0, concluidas: 0 };
        }

        data.forEach(item => {
            const dueDate = item.dueDate?.toDate?.() || new Date(item.dueDate);
            const key = dueDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            if (monthCount[key]) {
                monthCount[key].programadas++;
                if (item.status === 'concluida') {
                    monthCount[key].concluidas++;
                }
            }
        });

        const byMonth = Object.entries(monthCount).map(([name, values]) => ({
            name,
            ...values
        }));

        setChartData({ byType, byPriority, byMonth });
    };

    const statCards = [
        {
            title: 'Em Manutenção',
            value: stats.inMaintenance,
            icon: <Build sx={{ fontSize: 28 }} />,
            color: 'primary.main',
            bgColor: 'primary.light'
        },
        {
            title: 'Atrasadas',
            value: stats.overdue,
            icon: <EventBusy sx={{ fontSize: 28 }} />,
            color: 'error.main',
            bgColor: 'error.light'
        },
        {
            title: 'Inoperantes',
            value: stats.inoperant,
            icon: <Warning sx={{ fontSize: 28 }} />,
            color: 'warning.main',
            bgColor: 'warning.light'
        },
        {
            title: 'Agendadas',
            value: stats.scheduled,
            icon: <Schedule sx={{ fontSize: 28 }} />,
            color: 'info.main',
            bgColor: 'info.light'
        },
        {
            title: 'Concluídas',
            value: stats.completed,
            icon: <CheckCircle sx={{ fontSize: 28 }} />,
            color: 'success.main',
            bgColor: 'success.light'
        },
        {
            title: 'Recorrentes',
            value: stats.recurrent,
            icon: <Repeat sx={{ fontSize: 28 }} />,
            color: 'secondary.main',
            bgColor: 'secondary.light'
        }
    ];

    const COLORS = ['#1e3a5f', '#ff6b35', '#4caf50', '#2196f3', '#9c27b0', '#ff9800'];

    if (loading) {
        return (
            <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                    Carregando dados do dashboard...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                {error}
            </Alert>
        );
    }

    return (
        <Box>
            {/* Header com ações */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 1 }}>
                <Tooltip title="Configurações de Notificação">
                    <IconButton onClick={() => setSettingsOpen(true)}>
                        <Settings />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Atualizar Dados">
                    <IconButton onClick={fetchStats}>
                        <Refresh />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* === CARD DESTAQUE: Manutenções do dia e atrasadas === */}
            {(todayItems.length > 0 || overdueItems.length > 0) && (
                <Paper
                    elevation={6}
                    sx={{
                        mb: 3,
                        borderRadius: 3,
                        overflow: 'hidden',
                        border: '2px solid',
                        borderColor: overdueItems.length > 0 ? 'error.main' : 'warning.main',
                        animation: 'pulse-border 2s ease-in-out infinite',
                        '@keyframes pulse-border': {
                            '0%, 100%': { boxShadow: `0 0 0 0 ${overdueItems.length > 0 ? 'rgba(244,67,54,0.4)' : 'rgba(255,152,0,0.4)'}` },
                            '50%': { boxShadow: `0 0 20px 4px ${overdueItems.length > 0 ? 'rgba(244,67,54,0.2)' : 'rgba(255,152,0,0.2)'}` },
                        },
                    }}
                >
                    {/* Header do card */}
                    <Box
                        sx={{
                            background: overdueItems.length > 0
                                ? `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`
                                : `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark || '#e65100'} 100%)`,
                            color: 'white',
                            px: 3,
                            py: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <NotificationsActive sx={{ fontSize: 32, animation: 'ring 1.5s ease-in-out infinite', '@keyframes ring': { '0%, 100%': { transform: 'rotate(0)' }, '10%, 30%': { transform: 'rotate(8deg)' }, '20%, 40%': { transform: 'rotate(-8deg)' }, '50%': { transform: 'rotate(0)' } } }} />
                            <Box>
                                <Typography variant="h6" fontWeight={700}>
                                    {overdueItems.length > 0 ? 'Atenção! Manutenções Pendentes' : 'Manutenções Previstas para Hoje'}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    {overdueItems.length > 0 && `${overdueItems.length} atrasada${overdueItems.length > 1 ? 's' : ''}`}
                                    {overdueItems.length > 0 && todayItems.length > 0 && ' | '}
                                    {todayItems.length > 0 && `${todayItems.length} para hoje`}
                                </Typography>
                            </Box>
                        </Box>
                        <Chip
                            label={overdueItems.length + todayItems.length}
                            sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 800, fontSize: '1.1rem', height: 36, minWidth: 36 }}
                        />
                    </Box>

                    {/* Lista de manutenções atrasadas */}
                    {overdueItems.length > 0 && (
                        <Box sx={{ px: 2, pt: 2, pb: todayItems.length > 0 ? 1 : 2 }}>
                            <Typography variant="subtitle2" color="error.main" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PriorityHigh fontSize="small" /> ATRASADAS
                            </Typography>
                            {overdueItems.slice(0, 10).map((item) => (
                                <Box
                                    key={item.id}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        p: 1.5,
                                        mb: 1,
                                        borderRadius: 2,
                                        bgcolor: alpha(theme.palette.error.main, 0.06),
                                        border: '1px solid',
                                        borderColor: alpha(theme.palette.error.main, 0.2),
                                        transition: 'all 0.2s',
                                        '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) },
                                    }}
                                >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={600} noWrap>
                                            {item.materialDescription}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'normal', lineHeight: 1.3 }}>
                                            {item.description}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                            <Chip label={item.type?.charAt(0).toUpperCase() + item.type?.slice(1)} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                                            <Chip
                                                icon={<AccessTime sx={{ fontSize: 12 }} />}
                                                label={item.dueDate.toLocaleDateString('pt-BR')}
                                                size="small"
                                                color="error"
                                                variant="outlined"
                                                sx={{ height: 20, fontSize: '0.65rem' }}
                                            />
                                        </Box>
                                    </Box>
                                    <Tooltip title="Concluir manutenção">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleOpenComplete(item)}
                                            sx={{
                                                bgcolor: 'success.main',
                                                color: 'white',
                                                '&:hover': { bgcolor: 'success.dark' },
                                                width: 36,
                                                height: 36,
                                            }}
                                        >
                                            <CheckCircle fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            ))}
                            {overdueItems.length > 10 && (
                                <Typography variant="caption" color="error.main" sx={{ pl: 1 }}>
                                    + {overdueItems.length - 10} atrasadas adicionais
                                </Typography>
                            )}
                        </Box>
                    )}

                    {/* Lista de manutenções de hoje */}
                    {todayItems.length > 0 && (
                        <Box sx={{ px: 2, pt: overdueItems.length > 0 ? 1 : 2, pb: 2 }}>
                            {overdueItems.length > 0 && <Divider sx={{ mb: 1.5 }} />}
                            <Typography variant="subtitle2" color="warning.main" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Today fontSize="small" /> PARA HOJE
                            </Typography>
                            {todayItems.slice(0, 10).map((item) => (
                                <Box
                                    key={item.id}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        p: 1.5,
                                        mb: 1,
                                        borderRadius: 2,
                                        bgcolor: alpha(theme.palette.warning.main, 0.06),
                                        border: '1px solid',
                                        borderColor: alpha(theme.palette.warning.main, 0.15),
                                        transition: 'all 0.2s',
                                        '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.1) },
                                    }}
                                >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={600} noWrap>
                                            {item.materialDescription}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'normal', lineHeight: 1.3 }}>
                                            {item.description}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                            <Chip label={item.type?.charAt(0).toUpperCase() + item.type?.slice(1)} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                                            {item.priority === 'alta' || item.priority === 'critica' ? (
                                                <Chip label={item.priority === 'alta' ? 'Alta' : 'Crítica'} size="small" color={item.priority === 'critica' ? 'error' : 'warning'} sx={{ height: 20, fontSize: '0.65rem' }} />
                                            ) : null}
                                        </Box>
                                    </Box>
                                    <Tooltip title="Concluir manutenção">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleOpenComplete(item)}
                                            sx={{
                                                bgcolor: 'success.main',
                                                color: 'white',
                                                '&:hover': { bgcolor: 'success.dark' },
                                                width: 36,
                                                height: 36,
                                            }}
                                        >
                                            <CheckCircle fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            ))}
                            {todayItems.length > 10 && (
                                <Typography variant="caption" color="warning.main" sx={{ pl: 1 }}>
                                    + {todayItems.length - 10} adicionais para hoje
                                </Typography>
                            )}
                        </Box>
                    )}
                </Paper>
            )}

            {/* Cards de estatísticas */}
            <Grid container spacing={2}>
                {statCards.map((card, index) => (
                    <Grid item xs={6} sm={4} md={4} lg={2} key={index}>
                        <Card
                            elevation={3}
                            sx={{
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                height: '100%',
                                minHeight: 100,
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6
                                }
                            }}
                        >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography
                                            color="textSecondary"
                                            variant="caption"
                                            sx={{
                                                display: 'block',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            {card.title}
                                        </Typography>
                                        <Typography
                                            variant="h4"
                                            component="h2"
                                            sx={{
                                                color: card.color,
                                                fontWeight: 'bold',
                                                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
                                            }}
                                        >
                                            {card.value}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            backgroundColor: card.bgColor,
                                            borderRadius: '50%',
                                            p: 0.75,
                                            color: card.color,
                                            opacity: 0.9,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            ml: 1
                                        }}
                                    >
                                        {card.icon}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Alertas */}
            <Box sx={{ mt: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Alert severity={stats.overdue > 0 ? "warning" : "success"}>
                            {stats.overdue > 0
                                ? `Atenção: Existem ${stats.overdue} manutenções atrasadas que precisam de atenção imediata.`
                                : "Todas as manutenções estão em dia."}
                        </Alert>
                    </Grid>
                    {stats.inoperant > 0 && (
                        <Grid item xs={12}>
                            <Alert severity="error">
                                {`${stats.inoperant} material(is) encontram-se inoperantes e necessitam de reparo.`}
                            </Alert>
                        </Grid>
                    )}
                </Grid>
            </Box>

            {/* Seção de Próximas Manutenções e Gráficos */}
            <Grid container spacing={3} sx={{ mt: 2 }}>
                {/* Próximas Manutenções */}
                <Grid item xs={12} md={6}>
                    <UpcomingMaintenances />
                </Grid>

                {/* Gráficos */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <TrendingUp color="primary" />
                            <Typography variant="h6">
                                Distribuição por Tipo
                            </Typography>
                        </Box>

                        {chartData.byType.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={chartData.byType}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {chartData.byType.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
                                <Typography color="text.secondary">
                                    Nenhum dado disponível
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Gráfico de barras - Manutenções por mês */}
                <Grid item xs={12}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <CalendarMonth color="primary" />
                            <Typography variant="h6">
                                Manutenções por Mês (Últimos 6 meses)
                            </Typography>
                        </Box>

                        {chartData.byMonth.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData.byMonth}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Legend />
                                    <Bar dataKey="programadas" fill="#1e3a5f" name="Programadas" />
                                    <Bar dataKey="concluidas" fill="#4caf50" name="Concluídas" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                                <Typography color="text.secondary">
                                    Nenhum dado disponível
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Gráfico de prioridades */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Warning color="warning" />
                            <Typography variant="h6">
                                Distribuição por Prioridade
                            </Typography>
                        </Box>

                        {chartData.byPriority.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={chartData.byPriority}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, value }) => `${name}: ${value}`}
                                        outerRadius={70}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {chartData.byPriority.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                                <Typography color="text.secondary">
                                    Nenhum dado disponível
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Resumo Rápido */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Engineering color="primary" />
                            <Typography variant="h6">
                                Resumo Rápido
                            </Typography>
                        </Box>

                        <List dense>
                            <ListItem>
                                <ListItemIcon>
                                    <Chip label={stats.pending} color="warning" size="small" />
                                </ListItemIcon>
                                <ListItemText primary="Manutenções pendentes no total" />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon>
                                    <Chip label={stats.overdue} color="error" size="small" />
                                </ListItemIcon>
                                <ListItemText primary="Manutenções atrasadas" />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon>
                                    <Chip label={stats.recurrent} color="secondary" size="small" />
                                </ListItemIcon>
                                <ListItemText primary="Manutenções recorrentes ativas" />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon>
                                    <Chip
                                        label={stats.pending > 0 ? ((stats.completed / (stats.completed + stats.pending)) * 100).toFixed(0) + '%' : '100%'}
                                        color="success"
                                        size="small"
                                    />
                                </ListItemIcon>
                                <ListItemText primary="Taxa de conclusão" />
                            </ListItem>
                        </List>
                    </Paper>
                </Grid>
            </Grid>

            {/* Dialog de Configurações */}
            <NotificationSettings
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
            />

            {/* Dialog de Conclusão de Manutenção */}
            <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
                <Box sx={{ bgcolor: 'success.main', color: 'white', px: 3, py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CheckCircle sx={{ fontSize: 28 }} />
                        <Box>
                            <Typography variant="h6" fontWeight={700}>Concluir Manutenção</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                {new Date().toLocaleString('pt-BR')}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                <DialogContent sx={{ px: 3, py: 2 }}>
                    {completionData.maintenance && (
                        <>
                            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200', mb: 2.5 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Material</Typography>
                                <Typography variant="body1" fontWeight={600} gutterBottom>
                                    {completionData.maintenance.materialDescription}
                                </Typography>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1.5 }}>Manutenção prevista</Typography>
                                <Typography variant="body2" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                    {completionData.maintenance.description || 'N/A'}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                                    <Chip label={completionData.maintenance.type?.charAt(0).toUpperCase() + completionData.maintenance.type?.slice(1)} size="small" color="primary" variant="outlined" />
                                    {completionData.maintenance.isRecurrent && (
                                        <Chip icon={<Repeat sx={{ fontSize: 14 }} />} label={`Recorrente (${completionData.maintenance.recurrenceType})`} size="small" color="secondary" variant="outlined" />
                                    )}
                                </Box>
                            </Box>

                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={completionData.confirmedAsPlanned}
                                        onChange={(e) => setCompletionData(prev => ({ ...prev, confirmedAsPlanned: e.target.checked }))}
                                        color="success"
                                        sx={{ '& .MuiSvgIcon-root': { fontSize: 28 } }}
                                    />
                                }
                                label={
                                    <Typography variant="body1" fontWeight={600}>
                                        Manutenção realizada conforme o previsto
                                    </Typography>
                                }
                                sx={{
                                    mb: 2, p: 1.5, borderRadius: 2,
                                    border: '2px solid',
                                    borderColor: completionData.confirmedAsPlanned ? 'success.main' : 'grey.300',
                                    bgcolor: completionData.confirmedAsPlanned ? alpha(theme.palette.success.main, 0.06) : 'transparent',
                                    transition: 'all 0.2s ease',
                                    width: '100%', mx: 0,
                                }}
                            />

                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Observações (opcional)"
                                placeholder="Peças trocadas, desvios do procedimento, problemas encontrados..."
                                value={completionData.completionNotes}
                                onChange={(e) => setCompletionData(prev => ({ ...prev, completionNotes: e.target.value }))}
                                helperText="Este registro ficará no histórico de manutenções do equipamento"
                            />

                            {completionData.maintenance.isRecurrent && (
                                <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                                    Uma nova manutenção será criada automaticamente para a próxima data programada.
                                </Alert>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setCompleteDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
                    <Button
                        onClick={handleConfirmComplete}
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircle />}
                        disabled={!completionData.confirmedAsPlanned}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
                    >
                        Confirmar Conclusão
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MaintenanceDashboard;
