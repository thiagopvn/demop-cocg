import { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, Box, LinearProgress, Alert } from '@mui/material';
import { Build, Warning, EventBusy, CheckCircle, Schedule, Engineering } from '@mui/icons-material';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import db from '../../firebase/db';

const MaintenanceDashboard = () => {
    const [stats, setStats] = useState({
        inMaintenance: 0,
        overdue: 0,
        inoperant: 0,
        scheduled: 0,
        completed: 0,
        pending: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
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

                setStats({
                    inMaintenance: inMaintenanceSnapshot.size,
                    overdue: overdueSnapshot.size,
                    inoperant: inoperantSnapshot.size,
                    scheduled: scheduledSnapshot.size,
                    completed: completedSnapshot.size,
                    pending: pendingSnapshot.size
                });
            } catch (err) {
                console.error('Erro ao buscar estatísticas:', err);
                setError('Erro ao carregar dados do dashboard');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

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
            title: 'Pendentes Total', 
            value: stats.pending, 
            icon: <Engineering sx={{ fontSize: 40 }} />, 
            color: 'secondary.main',
            bgColor: 'secondary.light'
        }
    ];

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
            <Grid container spacing={3}>
                {statCards.map((card, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
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
                                        <Typography color="textSecondary" gutterBottom variant="body2">
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
                                            p: 1.5,
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

            <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                    Resumo Rápido
                </Typography>
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
        </Box>
    );
};

export default MaintenanceDashboard;