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
    Button
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
    Repeat
} from '@mui/icons-material';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import db from '../../firebase/db';
import UpcomingMaintenances from './UpcomingMaintenances';
import NotificationSettings from './NotificationSettings';

const MaintenanceDashboard = () => {
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

    useEffect(() => {
        fetchStats();
    }, []);

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
            icon: <Build sx={{ fontSize: 40 }} />,
            color: 'primary.main',
            bgColor: 'primary.light'
        },
        {
            title: 'Tarefas Atrasadas',
            value: stats.overdue,
            icon: <EventBusy sx={{ fontSize: 40 }} />,
            color: 'error.main',
            bgColor: 'error.light'
        },
        {
            title: 'Materiais Inoperantes',
            value: stats.inoperant,
            icon: <Warning sx={{ fontSize: 40 }} />,
            color: 'warning.main',
            bgColor: 'warning.light'
        },
        {
            title: 'Agendadas',
            value: stats.scheduled,
            icon: <Schedule sx={{ fontSize: 40 }} />,
            color: 'info.main',
            bgColor: 'info.light'
        },
        {
            title: 'Concluídas',
            value: stats.completed,
            icon: <CheckCircle sx={{ fontSize: 40 }} />,
            color: 'success.main',
            bgColor: 'success.light'
        },
        {
            title: 'Recorrentes Ativas',
            value: stats.recurrent,
            icon: <Repeat sx={{ fontSize: 40 }} />,
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

            {/* Cards de estatísticas */}
            <Grid container spacing={3}>
                {statCards.map((card, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
                        <Card
                            elevation={3}
                            sx={{
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6
                                }
                            }}
                        >
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography color="textSecondary" gutterBottom variant="body2" noWrap>
                                            {card.title}
                                        </Typography>
                                        <Typography variant="h3" component="h2" sx={{ color: card.color, fontWeight: 'bold' }}>
                                            {card.value}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            backgroundColor: card.bgColor,
                                            borderRadius: '50%',
                                            p: 1,
                                            color: card.color,
                                            opacity: 0.9
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
        </Box>
    );
};

export default MaintenanceDashboard;
