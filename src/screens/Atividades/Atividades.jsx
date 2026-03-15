import { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Card,
    Chip,
    TextField,
    InputAdornment,
    CircularProgress,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    IconButton,
    Tooltip,
    alpha,
    Paper,
    Tabs,
    Tab,
    TableSortLabel,
    styled,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Avatar,
    LinearProgress,
    Fab,
    Snackbar,
    Alert,
} from '@mui/material';
import {
    Search,
    Clear,
    Assessment,
    Person,
    FilterList,
    Timeline,
    TrendingUp,
    Inventory,
    SwapHoriz,
    LocalShipping,
    Build,
    PersonAdd,
    Delete,
    Edit,
    LockReset,
    Category,
    CalendarMonth,
    Add,
    Assignment,
    AccessTime,
    Flag,
    CheckCircle,
    Cancel,
    Message,
    Visibility,
    PlaylistAddCheck,
} from '@mui/icons-material';
import { collection, query, orderBy, onSnapshot, where, Timestamp, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import db from '../../firebase/db';
import { verifyToken } from '../../firebase/token';
import { ACTION_LABELS, ACTION_COLORS, logAudit } from '../../firebase/auditLog';
import { reconcileTaskProgress } from '../../firebase/taskProgress';
import { useDebounce } from '../../hooks/useDebounce';
import MenuContext from '../../contexts/MenuContext';
import PrivateRoute from '../../contexts/PrivateRoute';
import { useTheme } from '@mui/material/styles';

const StyledTableContainer = styled(Card)(({ theme }) => ({
    borderRadius: theme.spacing(1.5),
    boxShadow: theme.shadows[2],
    overflow: 'hidden',
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
        boxShadow: theme.shadows[4],
    },
}));

const StyledTableHead = styled(TableHead)(({ theme }) => ({
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.04),
    },
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
    padding: theme.spacing(1.5, 2),
}));

const StatCard = styled(Card)(({ theme }) => ({
    padding: theme.spacing(2.5),
    borderRadius: theme.spacing(1.5),
    border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[4],
    },
}));

const ACTION_ICONS = {
    material_create: Inventory,
    material_update: Edit,
    material_delete: Delete,
    material_allocate: LocalShipping,
    movimentacao_create: SwapHoriz,
    devolucao_create: SwapHoriz,
    user_create: PersonAdd,
    user_update: Edit,
    user_delete: Delete,
    user_password_reset: LockReset,
    viatura_create: LocalShipping,
    viatura_update: Edit,
    viatura_delete: Delete,
    manutencao_create: Build,
    manutencao_complete: Build,
    categoria_create: Category,
    categoria_update: Edit,
    categoria_delete: Delete,
    ring_create: Inventory,
    ring_update: Edit,
    ring_delete: Delete,
};

const TASK_TYPES = {
    conferencia: { label: 'Conferencia de Material', icon: Inventory, color: '#3b82f6' },
    contagem: { label: 'Contagem de Material', icon: PlaylistAddCheck, color: '#8b5cf6' },
    verificacao: { label: 'Verificacao', icon: Search, color: '#f59e0b' },
    assinatura: { label: 'Atencao para Assinatura', icon: Assignment, color: '#ef4444' },
    procurar: { label: 'Procurar Material', icon: Search, color: '#06b6d4' },
    atualizar: { label: 'Atualizar Material', icon: Edit, color: '#22c55e' },
    mensagem: { label: 'Mensagem / Recado', icon: Message, color: '#ff6b35' },
};

const PRIORITY_OPTIONS = [
    { value: 'baixa', label: 'Baixa', color: '#22c55e' },
    { value: 'media', label: 'Media', color: '#f59e0b' },
    { value: 'alta', label: 'Alta', color: '#f97316' },
    { value: 'urgente', label: 'Urgente', color: '#ef4444' },
];

const DURATION_OPTIONS = [
    { value: 1, label: '1 dia' },
    { value: 2, label: '2 dias' },
    { value: 3, label: '3 dias' },
    { value: 7, label: '1 semana' },
    { value: 15, label: '15 dias' },
    { value: 30, label: '1 mes' },
];

const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const exp = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
    const now = new Date();
    const diff = exp - now;
    if (diff <= 0) return { expired: true, text: 'Expirada' };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return { expired: false, text: `${days}d ${hours}h restantes` };
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { expired: false, text: `${hours}h ${minutes}min restantes` };
};

export default function Atividades() {
    const theme = useTheme();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterUser, setFilterUser] = useState('all');
    const [filterAction, setFilterAction] = useState('all');
    const [filterPeriod, setFilterPeriod] = useState('all');
    const [tabValue, setTabValue] = useState(0);
    const [sortField, setSortField] = useState('timestamp');
    const [sortDirection, setSortDirection] = useState('desc');

    // Task management state
    const [tasks, setTasks] = useState([]);
    const [taskDialogOpen, setTaskDialogOpen] = useState(false);
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        type: 'conferencia',
        targetCount: '',
        priority: 'media',
        durationDays: 1,
    });
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [loggedUserId, setLoggedUserId] = useState('');
    const [loggedUserName, setLoggedUserName] = useState('');

    const debouncedSearch = useDebounce(searchTerm, 300);

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decoded = await verifyToken(token);
                    setUserRole(decoded.role);
                    setLoggedUserId(decoded.userId || decoded.firestoreId || '');
                    setLoggedUserName(decoded.username || '');
                } catch (error) {
                    console.error('Erro ao verificar token:', error);
                }
            }
        };
        fetchUserData();
    }, []);

    // Reconciliar progresso das tarefas ativas ao abrir a tela
    useEffect(() => {
        if (userRole !== 'admingeral') return;
        reconcileTaskProgress();
    }, [userRole]);

    // Real-time tasks listener
    useEffect(() => {
        if (userRole !== 'admingeral') return;

        const q = query(
            collection(db, 'tarefas_demop'),
            orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // Auto-expire tasks
            const now = new Date();
            list.forEach(task => {
                if (task.status === 'ativa' && task.expiresAt) {
                    const exp = task.expiresAt?.toDate ? task.expiresAt.toDate() : new Date(task.expiresAt);
                    if (exp < now) {
                        updateDoc(doc(db, 'tarefas_demop', task.id), { status: 'expirada' });
                    }
                }
            });
            setTasks(list);
        });

        return () => unsub();
    }, [userRole]);

    useEffect(() => {
        if (userRole !== 'admingeral') return;

        setLoading(true);

        let q;
        if (filterPeriod === 'all') {
            q = query(
                collection(db, 'audit_logs'),
                orderBy('timestamp', 'desc')
            );
        } else {
            const daysAgo = parseInt(filterPeriod) || 30;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysAgo);
            startDate.setHours(0, 0, 0, 0);
            q = query(
                collection(db, 'audit_logs'),
                where('timestamp', '>=', Timestamp.fromDate(startDate)),
                orderBy('timestamp', 'desc')
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
            }));
            setLogs(list);
            setLoading(false);
        }, (error) => {
            console.error('Erro ao carregar logs:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userRole, filterPeriod]);

    // Usuarios unicos
    const uniqueUsers = useMemo(() => {
        const users = new Map();
        logs.forEach(log => {
            if (log.userId && log.userName) {
                users.set(log.userId, log.userName);
            }
        });
        return Array.from(users.entries()).map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }, [logs]);

    // Acoes unicas
    const uniqueActions = useMemo(() => {
        const actions = new Set();
        logs.forEach(log => {
            if (log.action) actions.add(log.action);
        });
        return Array.from(actions).sort();
    }, [logs]);

    // Filtro
    const filteredLogs = useMemo(() => {
        let result = [...logs];

        if (filterUser !== 'all') {
            result = result.filter(log => log.userId === filterUser);
        }

        if (filterAction !== 'all') {
            result = result.filter(log => log.action === filterAction);
        }

        if (debouncedSearch) {
            const search = debouncedSearch.toLowerCase();
            result = result.filter(log =>
                (log.userName || '').toLowerCase().includes(search) ||
                (log.targetName || '').toLowerCase().includes(search) ||
                (ACTION_LABELS[log.action] || '').toLowerCase().includes(search)
            );
        }

        // Ordenacao
        const dir = sortDirection === 'asc' ? 1 : -1;
        result.sort((a, b) => {
            switch (sortField) {
                case 'timestamp': {
                    const tA = a.timestamp?.toDate?.() || new Date(0);
                    const tB = b.timestamp?.toDate?.() || new Date(0);
                    return dir * (tA - tB);
                }
                case 'userName':
                    return dir * (a.userName || '').localeCompare(b.userName || '', 'pt-BR');
                case 'action':
                    return dir * (ACTION_LABELS[a.action] || '').localeCompare(ACTION_LABELS[b.action] || '', 'pt-BR');
                case 'targetName':
                    return dir * (a.targetName || '').localeCompare(b.targetName || '', 'pt-BR');
                default:
                    return 0;
            }
        });

        return result;
    }, [logs, filterUser, filterAction, debouncedSearch, sortField, sortDirection]);

    // Estatisticas por usuario
    const userStats = useMemo(() => {
        const stats = {};
        logs.forEach(log => {
            if (!log.userId) return;
            if (!stats[log.userId]) {
                stats[log.userId] = {
                    userName: log.userName || 'Desconhecido',
                    total: 0,
                    materiais_conferidos: 0,
                    materiais_criados: 0,
                    materiais_excluidos: 0,
                    materiais_alocados: 0,
                    movimentacoes: 0,
                    devolucoes: 0,
                    usuarios: 0,
                    viaturas: 0,
                    manutencoes: 0,
                    categorias: 0,
                    outros: 0,
                };
            }
            const s = stats[log.userId];
            s.total++;

            switch (log.action) {
                case 'material_update': s.materiais_conferidos++; break;
                case 'material_create': s.materiais_criados++; break;
                case 'material_delete': s.materiais_excluidos++; break;
                case 'material_allocate': s.materiais_alocados++; break;
                case 'movimentacao_create': s.movimentacoes++; break;
                case 'devolucao_create': s.devolucoes++; break;
                case 'user_create':
                case 'user_update':
                case 'user_delete':
                case 'user_password_reset':
                    s.usuarios++; break;
                case 'viatura_create':
                case 'viatura_update':
                case 'viatura_delete':
                    s.viaturas++; break;
                case 'manutencao_create':
                case 'manutencao_complete':
                    s.manutencoes++; break;
                case 'categoria_create':
                case 'categoria_update':
                case 'categoria_delete':
                    s.categorias++; break;
                default: s.outros++; break;
            }
        });

        return Object.entries(stats)
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => b.total - a.total);
    }, [logs]);

    // Estatisticas globais
    const globalStats = useMemo(() => {
        const totalActions = logs.length;
        const totalUsers = uniqueUsers.length;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayActions = logs.filter(l => {
            const t = l.timestamp?.toDate?.();
            return t && t >= todayStart;
        }).length;

        const materialConferences = logs.filter(l => l.action === 'material_update').length;

        return { totalActions, totalUsers, todayActions, materialConferences };
    }, [logs, uniqueUsers]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection(field === 'timestamp' ? 'desc' : 'asc');
        }
    };

    // Task handlers
    const handleCreateTask = async () => {
        if (!taskForm.title.trim()) return;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + taskForm.durationDays);
        expiresAt.setHours(23, 59, 59, 999);

        try {
            await addDoc(collection(db, 'tarefas_demop'), {
                title: taskForm.title.trim(),
                description: taskForm.description.trim(),
                type: taskForm.type,
                targetCount: (taskForm.type === 'conferencia' || taskForm.type === 'contagem') && taskForm.targetCount
                    ? Number(taskForm.targetCount) : null,
                priority: taskForm.priority,
                durationDays: taskForm.durationDays,
                expiresAt: Timestamp.fromDate(expiresAt),
                createdAt: serverTimestamp(),
                createdBy: loggedUserId,
                createdByName: loggedUserName,
                status: 'ativa',
                progress: 0,
                completedAt: null,
                completedBy: null,
                completedByName: null,
            });

            logAudit({
                action: 'tarefa_create',
                userId: loggedUserId,
                userName: loggedUserName,
                targetCollection: 'tarefas_demop',
                targetName: taskForm.title.trim(),
                details: { type: taskForm.type, priority: taskForm.priority, duracao: `${taskForm.durationDays} dias` },
            });

            setTaskForm({ title: '', description: '', type: 'conferencia', targetCount: '', priority: 'media', durationDays: 1 });
            setTaskDialogOpen(false);
            setSnackbarMessage('Missao do dia criada com sucesso!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (error) {
            console.error('Erro ao criar tarefa:', error);
            setSnackbarMessage('Erro ao criar missao do dia.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleCancelTask = async (taskId, taskTitle) => {
        try {
            await updateDoc(doc(db, 'tarefas_demop', taskId), {
                status: 'cancelada',
                completedAt: serverTimestamp(),
                completedByName: loggedUserName,
            });
            logAudit({
                action: 'tarefa_cancel',
                userId: loggedUserId,
                userName: loggedUserName,
                targetCollection: 'tarefas_demop',
                targetId: taskId,
                targetName: taskTitle,
            });
            setSnackbarMessage('Missao cancelada.');
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
        } catch (error) {
            console.error('Erro ao cancelar tarefa:', error);
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await deleteDoc(doc(db, 'tarefas_demop', taskId));
            setSnackbarMessage('Missao removida.');
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
        } catch (error) {
            console.error('Erro ao excluir tarefa:', error);
        }
    };

    const activeTasks = useMemo(() => tasks.filter(t => t.status === 'ativa'), [tasks]);
    const completedTasks = useMemo(() => tasks.filter(t => t.status === 'concluida'), [tasks]);
    const cancelledExpiredTasks = useMemo(() => tasks.filter(t => t.status === 'cancelada' || t.status === 'expirada'), [tasks]);

    const formatDate = (timestamp) => {
        if (!timestamp?.toDate) return '-';
        const date = timestamp.toDate();
        return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const getActionIcon = (action) => {
        const Icon = ACTION_ICONS[action] || Timeline;
        return <Icon fontSize="small" />;
    };

    const renderDetailsText = (log) => {
        if (!log.details) return null;
        const parts = [];
        if (log.details.tipo) parts.push(`Tipo: ${log.details.tipo}`);
        if (log.details.quantidade) parts.push(`Qtd: ${log.details.quantidade}`);
        if (log.details.viatura) parts.push(`Viatura: ${log.details.viatura}`);
        if (log.details.militar) parts.push(`Militar: ${log.details.militar}`);
        if (log.details.categoria) parts.push(`Categoria: ${log.details.categoria}`);
        if (log.details.estoque_total) parts.push(`Estoque total: ${log.details.estoque_total}`);
        if (log.details.estoque_atual !== undefined) parts.push(`Estoque atual: ${log.details.estoque_atual}`);
        if (log.details.role) parts.push(`Role: ${log.details.role}`);
        if (log.details.prioridade) parts.push(`Prioridade: ${log.details.prioridade}`);
        if (log.details.recorrente) parts.push(`Recorrente: ${log.details.recorrente}`);
        if (log.details.data_prevista) parts.push(`Data prevista: ${log.details.data_prevista}`);
        if (log.details.o_que_foi_feito) parts.push(`Realizado: ${log.details.o_que_foi_feito}`);
        if (log.details.descricao) parts.push(`Descrição: ${log.details.descricao}`);
        return parts.length > 0 ? parts.join(' | ') : null;
    };

    return (
        <PrivateRoute allowedRoles={['admingeral']}>
            <MenuContext>
                <Box sx={{ p: 3 }}>
                    {/* Header */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
                            Atividade dos Militares
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Acompanhe todas as acoes realizadas por cada militar no sistema
                        </Typography>
                    </Box>

                    {/* Stats Cards */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                        <StatCard sx={{ flex: 1, minWidth: 180, background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)` }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main' }}>
                                    <Assessment />
                                </Box>
                                <Box>
                                    <Typography variant="h5" fontWeight={700} color="primary.main">{globalStats.totalActions}</Typography>
                                    <Typography variant="caption" color="text.secondary">Total de acoes</Typography>
                                </Box>
                            </Box>
                        </StatCard>
                        <StatCard sx={{ flex: 1, minWidth: 180, background: `linear-gradient(135deg, ${alpha('#4caf50', 0.08)} 0%, ${alpha('#4caf50', 0.02)} 100%)` }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: alpha('#4caf50', 0.12), color: '#4caf50' }}>
                                    <Person />
                                </Box>
                                <Box>
                                    <Typography variant="h5" fontWeight={700} color="#4caf50">{globalStats.totalUsers}</Typography>
                                    <Typography variant="caption" color="text.secondary">Militares ativos</Typography>
                                </Box>
                            </Box>
                        </StatCard>
                        <StatCard sx={{ flex: 1, minWidth: 180, background: `linear-gradient(135deg, ${alpha('#ff9800', 0.08)} 0%, ${alpha('#ff9800', 0.02)} 100%)` }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: alpha('#ff9800', 0.12), color: '#ff9800' }}>
                                    <TrendingUp />
                                </Box>
                                <Box>
                                    <Typography variant="h5" fontWeight={700} color="#ff9800">{globalStats.todayActions}</Typography>
                                    <Typography variant="caption" color="text.secondary">Acoes hoje</Typography>
                                </Box>
                            </Box>
                        </StatCard>
                        <StatCard sx={{ flex: 1, minWidth: 180, background: `linear-gradient(135deg, ${alpha('#2196f3', 0.08)} 0%, ${alpha('#2196f3', 0.02)} 100%)` }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: alpha('#2196f3', 0.12), color: '#2196f3' }}>
                                    <Inventory />
                                </Box>
                                <Box>
                                    <Typography variant="h5" fontWeight={700} color="#2196f3">{globalStats.materialConferences}</Typography>
                                    <Typography variant="caption" color="text.secondary">Materiais conferidos</Typography>
                                </Box>
                            </Box>
                        </StatCard>
                    </Box>

                    {/* Tabs */}
                    <Paper sx={{ borderRadius: 2, mb: 3 }}>
                        <Tabs
                            value={tabValue}
                            onChange={(_, v) => setTabValue(v)}
                            sx={{
                                '& .MuiTab-root': {
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                },
                            }}
                        >
                            <Tab icon={<Assessment sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="Resumo por Militar" />
                            <Tab icon={<Timeline sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="Historico Completo" />
                            <Tab
                                icon={<Assignment sx={{ fontSize: '1.1rem' }} />}
                                iconPosition="start"
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        Missao do Dia
                                        {activeTasks.length > 0 && (
                                            <Chip
                                                label={activeTasks.length}
                                                size="small"
                                                sx={{
                                                    height: 20,
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    bgcolor: '#ff6b35',
                                                    color: 'white',
                                                }}
                                            />
                                        )}
                                    </Box>
                                }
                            />
                        </Tabs>
                    </Paper>

                    {/* Tab 0: Resumo por Militar */}
                    {tabValue === 0 && (
                        <Box>
                            <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <InputLabel>Periodo</InputLabel>
                                    <Select
                                        value={filterPeriod}
                                        label="Periodo"
                                        onChange={(e) => setFilterPeriod(e.target.value)}
                                    >
                                        <MenuItem value="all">Todos</MenuItem>
                                        <MenuItem value="7">Ultimos 7 dias</MenuItem>
                                        <MenuItem value="15">Ultimos 15 dias</MenuItem>
                                        <MenuItem value="30">Ultimos 30 dias</MenuItem>
                                        <MenuItem value="60">Ultimos 60 dias</MenuItem>
                                        <MenuItem value="90">Ultimos 90 dias</MenuItem>
                                        <MenuItem value="365">Ultimo ano</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>

                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                                    <CircularProgress />
                                </Box>
                            ) : userStats.length === 0 ? (
                                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                                    <Assessment sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="h6" color="text.secondary">Nenhuma atividade registrada</Typography>
                                    <Typography variant="body2" color="text.disabled">
                                        As acoes dos militares aparecerão aqui conforme forem realizadas
                                    </Typography>
                                </Paper>
                            ) : (
                                <StyledTableContainer>
                                    <Box sx={{ overflowX: 'auto' }}>
                                        <Table>
                                            <StyledTableHead>
                                                <TableRow>
                                                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>Militar</TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>Total</TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>
                                                        <Tooltip title="Materiais conferidos/editados">
                                                            <span>Conferencias</span>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>
                                                        <Tooltip title="Materiais criados">
                                                            <span>Criados</span>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>
                                                        <Tooltip title="Materiais excluidos">
                                                            <span>Excluidos</span>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>
                                                        <Tooltip title="Materiais alocados em viaturas">
                                                            <span>Alocacoes</span>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>
                                                        <Tooltip title="Cautelas e movimentacoes">
                                                            <span>Moviment.</span>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>
                                                        <Tooltip title="Devoluções registradas">
                                                            <span>Devol.</span>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>
                                                        <Tooltip title="Manutenções agendadas e concluídas">
                                                            <span>Manut.</span>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>
                                                        <Tooltip title="Viaturas + Categorias + Usuários">
                                                            <span>Outros</span>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            </StyledTableHead>
                                            <TableBody>
                                                {userStats.map((stat) => (
                                                    <StyledTableRow key={stat.userId}>
                                                        <StyledTableCell>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                                <Box sx={{
                                                                    width: 36, height: 36, borderRadius: '50%',
                                                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    color: 'primary.main', fontWeight: 700, fontSize: '0.85rem',
                                                                }}>
                                                                    {(stat.userName || '?')[0].toUpperCase()}
                                                                </Box>
                                                                <Typography variant="body2" fontWeight={600}>
                                                                    {stat.userName}
                                                                </Typography>
                                                            </Box>
                                                        </StyledTableCell>
                                                        <StyledTableCell align="center">
                                                            <Chip
                                                                label={stat.total}
                                                                size="small"
                                                                color="primary"
                                                                sx={{ fontWeight: 700, minWidth: 48 }}
                                                            />
                                                        </StyledTableCell>
                                                        <StyledTableCell align="center">
                                                            <Typography variant="body2" fontWeight={stat.materiais_conferidos > 0 ? 600 : 400}
                                                                color={stat.materiais_conferidos > 0 ? '#2196f3' : 'text.disabled'}>
                                                                {stat.materiais_conferidos}
                                                            </Typography>
                                                        </StyledTableCell>
                                                        <StyledTableCell align="center">
                                                            <Typography variant="body2" fontWeight={stat.materiais_criados > 0 ? 600 : 400}
                                                                color={stat.materiais_criados > 0 ? '#4caf50' : 'text.disabled'}>
                                                                {stat.materiais_criados}
                                                            </Typography>
                                                        </StyledTableCell>
                                                        <StyledTableCell align="center">
                                                            <Typography variant="body2" fontWeight={stat.materiais_excluidos > 0 ? 600 : 400}
                                                                color={stat.materiais_excluidos > 0 ? '#f44336' : 'text.disabled'}>
                                                                {stat.materiais_excluidos}
                                                            </Typography>
                                                        </StyledTableCell>
                                                        <StyledTableCell align="center">
                                                            <Typography variant="body2" fontWeight={stat.materiais_alocados > 0 ? 600 : 400}
                                                                color={stat.materiais_alocados > 0 ? '#00bcd4' : 'text.disabled'}>
                                                                {stat.materiais_alocados}
                                                            </Typography>
                                                        </StyledTableCell>
                                                        <StyledTableCell align="center">
                                                            <Typography variant="body2" fontWeight={stat.movimentacoes > 0 ? 600 : 400}
                                                                color={stat.movimentacoes > 0 ? '#ff9800' : 'text.disabled'}>
                                                                {stat.movimentacoes}
                                                            </Typography>
                                                        </StyledTableCell>
                                                        <StyledTableCell align="center">
                                                            <Typography variant="body2" fontWeight={stat.devolucoes > 0 ? 600 : 400}
                                                                color={stat.devolucoes > 0 ? '#8bc34a' : 'text.disabled'}>
                                                                {stat.devolucoes}
                                                            </Typography>
                                                        </StyledTableCell>
                                                        <StyledTableCell align="center">
                                                            <Typography variant="body2" fontWeight={stat.manutencoes > 0 ? 600 : 400}
                                                                color={stat.manutencoes > 0 ? '#9c27b0' : 'text.disabled'}>
                                                                {stat.manutencoes}
                                                            </Typography>
                                                        </StyledTableCell>
                                                        <StyledTableCell align="center">
                                                            <Typography variant="body2" fontWeight={(stat.viaturas + stat.categorias + stat.usuarios) > 0 ? 600 : 400}
                                                                color={(stat.viaturas + stat.categorias + stat.usuarios) > 0 ? '#607d8b' : 'text.disabled'}>
                                                                {stat.viaturas + stat.categorias + stat.usuarios}
                                                            </Typography>
                                                        </StyledTableCell>
                                                    </StyledTableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                </StyledTableContainer>
                            )}
                        </Box>
                    )}

                    {/* Tab 1: Historico Completo */}
                    {tabValue === 1 && (
                        <Box>
                            {/* Filtros */}
                            <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                                <TextField
                                    size="small"
                                    placeholder="Pesquisar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    sx={{ minWidth: 220 }}
                                    slotProps={{
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Search fontSize="small" />
                                                </InputAdornment>
                                            ),
                                            endAdornment: searchTerm && (
                                                <InputAdornment position="end">
                                                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                                                        <Clear fontSize="small" />
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                />
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <InputLabel>Militar</InputLabel>
                                    <Select
                                        value={filterUser}
                                        label="Militar"
                                        onChange={(e) => setFilterUser(e.target.value)}
                                    >
                                        <MenuItem value="all">Todos</MenuItem>
                                        {uniqueUsers.map(u => (
                                            <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl size="small" sx={{ minWidth: 180 }}>
                                    <InputLabel>Tipo de acao</InputLabel>
                                    <Select
                                        value={filterAction}
                                        label="Tipo de acao"
                                        onChange={(e) => setFilterAction(e.target.value)}
                                    >
                                        <MenuItem value="all">Todas</MenuItem>
                                        {uniqueActions.map(a => (
                                            <MenuItem key={a} value={a}>{ACTION_LABELS[a] || a}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <InputLabel>Periodo</InputLabel>
                                    <Select
                                        value={filterPeriod}
                                        label="Periodo"
                                        onChange={(e) => setFilterPeriod(e.target.value)}
                                    >
                                        <MenuItem value="all">Todos</MenuItem>
                                        <MenuItem value="7">Ultimos 7 dias</MenuItem>
                                        <MenuItem value="15">Ultimos 15 dias</MenuItem>
                                        <MenuItem value="30">Ultimos 30 dias</MenuItem>
                                        <MenuItem value="60">Ultimos 60 dias</MenuItem>
                                        <MenuItem value="90">Ultimos 90 dias</MenuItem>
                                        <MenuItem value="365">Ultimo ano</MenuItem>
                                    </Select>
                                </FormControl>
                                <Chip
                                    icon={<FilterList />}
                                    label={`${filteredLogs.length} registro${filteredLogs.length !== 1 ? 's' : ''}`}
                                    variant="outlined"
                                    size="small"
                                />
                            </Box>

                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                                    <CircularProgress />
                                </Box>
                            ) : filteredLogs.length === 0 ? (
                                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                                    <Timeline sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="h6" color="text.secondary">Nenhuma atividade encontrada</Typography>
                                    <Typography variant="body2" color="text.disabled">
                                        Ajuste os filtros ou aguarde novas acoes dos militares
                                    </Typography>
                                </Paper>
                            ) : (
                                <StyledTableContainer>
                                    <Box sx={{ overflowX: 'auto' }}>
                                        <Table>
                                            <StyledTableHead>
                                                <TableRow>
                                                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>
                                                        <TableSortLabel
                                                            active={sortField === 'timestamp'}
                                                            direction={sortField === 'timestamp' ? sortDirection : 'desc'}
                                                            onClick={() => handleSort('timestamp')}
                                                            sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.7) !important' } }}
                                                        >
                                                            Data/Hora
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>
                                                        <TableSortLabel
                                                            active={sortField === 'userName'}
                                                            direction={sortField === 'userName' ? sortDirection : 'asc'}
                                                            onClick={() => handleSort('userName')}
                                                            sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.7) !important' } }}
                                                        >
                                                            Militar
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>
                                                        <TableSortLabel
                                                            active={sortField === 'action'}
                                                            direction={sortField === 'action' ? sortDirection : 'asc'}
                                                            onClick={() => handleSort('action')}
                                                            sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.7) !important' } }}
                                                        >
                                                            Acao
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>
                                                        <TableSortLabel
                                                            active={sortField === 'targetName'}
                                                            direction={sortField === 'targetName' ? sortDirection : 'asc'}
                                                            onClick={() => handleSort('targetName')}
                                                            sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.7) !important' } }}
                                                        >
                                                            Item Afetado
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>
                                                        Detalhes
                                                    </TableCell>
                                                </TableRow>
                                            </StyledTableHead>
                                            <TableBody>
                                                {filteredLogs.slice(0, 200).map((log) => (
                                                    <StyledTableRow key={log.id}>
                                                        <StyledTableCell>
                                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                                                {formatDate(log.timestamp)}
                                                            </Typography>
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Box sx={{
                                                                    width: 28, height: 28, borderRadius: '50%',
                                                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    color: 'primary.main', fontWeight: 700, fontSize: '0.75rem',
                                                                }}>
                                                                    {(log.userName || '?')[0].toUpperCase()}
                                                                </Box>
                                                                <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.85rem' }}>
                                                                    {log.userName || 'Desconhecido'}
                                                                </Typography>
                                                            </Box>
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Chip
                                                                icon={getActionIcon(log.action)}
                                                                label={ACTION_LABELS[log.action] || log.action}
                                                                size="small"
                                                                sx={{
                                                                    backgroundColor: alpha(ACTION_COLORS[log.action] || '#666', 0.1),
                                                                    color: ACTION_COLORS[log.action] || '#666',
                                                                    fontWeight: 600,
                                                                    fontSize: '0.75rem',
                                                                    '& .MuiChip-icon': {
                                                                        color: ACTION_COLORS[log.action] || '#666',
                                                                    },
                                                                }}
                                                            />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Typography variant="body2" sx={{ fontSize: '0.85rem', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {log.targetName || '-'}
                                                            </Typography>
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            {(() => {
                                                                const text = renderDetailsText(log);
                                                                return text ? (
                                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                                        {text}
                                                                    </Typography>
                                                                ) : (
                                                                    <Typography variant="caption" color="text.disabled">-</Typography>
                                                                );
                                                            })()}
                                                        </StyledTableCell>
                                                    </StyledTableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                    {filteredLogs.length > 200 && (
                                        <Box sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Exibindo 200 de {filteredLogs.length} registros. Use os filtros para refinar a busca.
                                            </Typography>
                                        </Box>
                                    )}
                                </StyledTableContainer>
                            )}
                        </Box>
                    )}
                    {/* Tab 2: Missao do Dia */}
                    {tabValue === 2 && (
                        <Box>
                            {/* Active Tasks */}
                            <Box sx={{ mb: 4 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Flag sx={{ color: '#ff6b35' }} />
                                        Missoes Ativas
                                        {activeTasks.length > 0 && (
                                            <Chip label={activeTasks.length} size="small" sx={{ fontWeight: 700, bgcolor: '#ff6b35', color: 'white' }} />
                                        )}
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<Add />}
                                        onClick={() => setTaskDialogOpen(true)}
                                        sx={{
                                            bgcolor: '#ff6b35',
                                            fontWeight: 700,
                                            borderRadius: 2,
                                            px: 3,
                                            '&:hover': { bgcolor: '#e55a2b' },
                                        }}
                                    >
                                        Nova Missao
                                    </Button>
                                </Box>

                                {activeTasks.length === 0 ? (
                                    <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, border: '2px dashed', borderColor: 'divider' }}>
                                        <Assignment sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                        <Typography variant="h6" color="text.secondary">Nenhuma missao ativa</Typography>
                                        <Typography variant="body2" color="text.disabled">
                                            Crie uma nova missao do dia para o DEMOP
                                        </Typography>
                                    </Paper>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {activeTasks.map(task => {
                                            const typeInfo = TASK_TYPES[task.type] || TASK_TYPES.mensagem;
                                            const priorityInfo = PRIORITY_OPTIONS.find(p => p.value === task.priority) || PRIORITY_OPTIONS[1];
                                            const timeRemaining = getTimeRemaining(task.expiresAt);
                                            const IconComp = typeInfo.icon;
                                            const progressPercent = task.targetCount ? Math.min((task.progress || 0) / task.targetCount * 100, 100) : null;

                                            return (
                                                <Paper
                                                    key={task.id}
                                                    sx={{
                                                        p: 3,
                                                        borderRadius: 3,
                                                        border: '2px solid',
                                                        borderColor: alpha(priorityInfo.color, 0.4),
                                                        background: `linear-gradient(135deg, ${alpha(typeInfo.color, 0.04)} 0%, ${alpha(priorityInfo.color, 0.04)} 100%)`,
                                                        position: 'relative',
                                                        overflow: 'hidden',
                                                        '&::before': {
                                                            content: '""',
                                                            position: 'absolute',
                                                            top: 0, left: 0, right: 0, height: 5,
                                                            background: `linear-gradient(90deg, ${typeInfo.color} 0%, ${priorityInfo.color} 100%)`,
                                                        },
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                                                        <Avatar sx={{
                                                            bgcolor: alpha(typeInfo.color, 0.15),
                                                            color: typeInfo.color,
                                                            width: 48, height: 48,
                                                        }}>
                                                            <IconComp />
                                                        </Avatar>
                                                        <Box sx={{ flex: 1 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                                <Chip
                                                                    label={typeInfo.label}
                                                                    size="small"
                                                                    sx={{ bgcolor: alpha(typeInfo.color, 0.12), color: typeInfo.color, fontWeight: 600, fontSize: '0.72rem' }}
                                                                />
                                                                <Chip
                                                                    icon={<Flag sx={{ fontSize: '14px !important' }} />}
                                                                    label={priorityInfo.label.toUpperCase()}
                                                                    size="small"
                                                                    sx={{
                                                                        bgcolor: alpha(priorityInfo.color, 0.12),
                                                                        color: priorityInfo.color,
                                                                        fontWeight: 700,
                                                                        fontSize: '0.7rem',
                                                                        '& .MuiChip-icon': { color: priorityInfo.color },
                                                                    }}
                                                                />
                                                            </Box>
                                                            <Typography variant="h6" fontWeight={700}>{task.title}</Typography>
                                                            {task.description && (
                                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                                    {task.description}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                            <Tooltip title="Cancelar missao">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleCancelTask(task.id, task.title)}
                                                                    sx={{ color: '#ef4444' }}
                                                                >
                                                                    <Cancel fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    </Box>

                                                    {/* Progress bar for counting tasks */}
                                                    {task.targetCount && (
                                                        <Box sx={{ mb: 2 }}>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                                <Typography variant="body2" fontWeight={600}>
                                                                    Progresso
                                                                </Typography>
                                                                <Typography variant="body2" fontWeight={700} color={typeInfo.color}>
                                                                    {task.progress || 0} / {task.targetCount}
                                                                </Typography>
                                                            </Box>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={progressPercent}
                                                                sx={{
                                                                    height: 10,
                                                                    borderRadius: 5,
                                                                    bgcolor: alpha(typeInfo.color, 0.1),
                                                                    '& .MuiLinearProgress-bar': {
                                                                        bgcolor: typeInfo.color,
                                                                        borderRadius: 5,
                                                                    },
                                                                }}
                                                            />
                                                        </Box>
                                                    )}

                                                    {/* Footer */}
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                            <Chip
                                                                icon={<AccessTime sx={{ fontSize: '14px !important' }} />}
                                                                label={timeRemaining?.text || ''}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: timeRemaining?.expired ? alpha('#ef4444', 0.1) : alpha('#3b82f6', 0.1),
                                                                    color: timeRemaining?.expired ? '#ef4444' : '#3b82f6',
                                                                    fontWeight: 600,
                                                                    '& .MuiChip-icon': { color: timeRemaining?.expired ? '#ef4444' : '#3b82f6' },
                                                                }}
                                                            />
                                                            <Typography variant="caption" color="text.secondary">
                                                                Criada por {task.createdByName} em {formatDate(task.createdAt)}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Paper>
                                            );
                                        })}
                                    </Box>
                                )}
                            </Box>

                            {/* Completed Tasks */}
                            {completedTasks.length > 0 && (
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircle sx={{ color: '#22c55e' }} />
                                        Concluidas ({completedTasks.length})
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {completedTasks.slice(0, 10).map(task => {
                                            const typeInfo = TASK_TYPES[task.type] || TASK_TYPES.mensagem;
                                            return (
                                                <Paper
                                                    key={task.id}
                                                    sx={{
                                                        p: 2,
                                                        borderRadius: 2,
                                                        border: '1px solid',
                                                        borderColor: alpha('#22c55e', 0.2),
                                                        bgcolor: alpha('#22c55e', 0.03),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 2,
                                                    }}
                                                >
                                                    <CheckCircle sx={{ color: '#22c55e' }} />
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="body2" fontWeight={600}>{task.title}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {task.completedByName ? `Concluida por: ${task.completedByName}` : 'Concluida'} - {formatDate(task.completedAt)}
                                                        </Typography>
                                                    </Box>
                                                    <Chip label={typeInfo.label} size="small" sx={{ bgcolor: alpha(typeInfo.color, 0.1), color: typeInfo.color, fontSize: '0.7rem' }} />
                                                    <Tooltip title="Excluir registro">
                                                        <IconButton size="small" onClick={() => handleDeleteTask(task.id)} sx={{ color: 'text.disabled' }}>
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Paper>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            )}

                            {/* Cancelled/Expired Tasks */}
                            {cancelledExpiredTasks.length > 0 && (
                                <Box>
                                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                                        <Cancel sx={{ color: 'text.disabled' }} />
                                        Canceladas / Expiradas ({cancelledExpiredTasks.length})
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {cancelledExpiredTasks.slice(0, 10).map(task => (
                                            <Paper
                                                key={task.id}
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 2,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    opacity: 0.6,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 2,
                                                }}
                                            >
                                                <Cancel sx={{ color: 'text.disabled' }} />
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body2" fontWeight={500}>{task.title}</Typography>
                                                    <Typography variant="caption" color="text.disabled">
                                                        {task.status === 'expirada' ? 'Expirada' : 'Cancelada'} - {formatDate(task.completedAt || task.expiresAt)}
                                                    </Typography>
                                                </Box>
                                                <Tooltip title="Excluir registro">
                                                    <IconButton size="small" onClick={() => handleDeleteTask(task.id)} sx={{ color: 'text.disabled' }}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Paper>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* Task Creation Dialog */}
                    <Dialog
                        open={taskDialogOpen}
                        onClose={() => setTaskDialogOpen(false)}
                        fullWidth
                        maxWidth="sm"
                        PaperProps={{
                            sx: {
                                borderRadius: 3,
                                overflow: 'hidden',
                            },
                        }}
                    >
                        <Box sx={{
                            height: 5,
                            background: 'linear-gradient(90deg, #ff6b35 0%, #1e3a5f 100%)',
                        }} />
                        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.3rem', pb: 0 }}>
                            Nova Missao do Dia
                        </DialogTitle>
                        <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 2 }}>
                            Crie uma missao ou mensagem para o permanencia do DEMOP
                        </Typography>
                        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '0 !important' }}>
                            <FormControl fullWidth>
                                <InputLabel>Tipo da Missao</InputLabel>
                                <Select
                                    value={taskForm.type}
                                    label="Tipo da Missao"
                                    onChange={(e) => setTaskForm(prev => ({ ...prev, type: e.target.value }))}
                                >
                                    {Object.entries(TASK_TYPES).map(([key, info]) => (
                                        <MenuItem key={key} value={key}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <info.icon sx={{ color: info.color, fontSize: 20 }} />
                                                {info.label}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                label="Titulo da Missao"
                                value={taskForm.title}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Ex: Conferir 40 materiais hoje"
                                fullWidth
                            />

                            <TextField
                                label="Descricao / Mensagem (opcional)"
                                value={taskForm.description}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Detalhes adicionais sobre a tarefa..."
                                fullWidth
                                multiline
                                rows={3}
                            />

                            {(taskForm.type === 'conferencia' || taskForm.type === 'contagem') && (
                                <TextField
                                    label="Meta de materiais a conferir"
                                    type="number"
                                    value={taskForm.targetCount}
                                    onChange={(e) => setTaskForm(prev => ({ ...prev, targetCount: e.target.value }))}
                                    placeholder="Ex: 40"
                                    fullWidth
                                    slotProps={{ input: { inputProps: { min: 1 } } }}
                                    helperText="O progresso sera atualizado automaticamente a cada conferencia de material"
                                />
                            )}

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Prioridade</InputLabel>
                                    <Select
                                        value={taskForm.priority}
                                        label="Prioridade"
                                        onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                                    >
                                        {PRIORITY_OPTIONS.map(p => (
                                            <MenuItem key={p.value} value={p.value}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: p.color }} />
                                                    {p.label}
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth>
                                    <InputLabel>Duracao</InputLabel>
                                    <Select
                                        value={taskForm.durationDays}
                                        label="Duracao"
                                        onChange={(e) => setTaskForm(prev => ({ ...prev, durationDays: e.target.value }))}
                                    >
                                        {DURATION_OPTIONS.map(d => (
                                            <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                        </DialogContent>
                        <DialogActions sx={{ p: 3, pt: 1 }}>
                            <Button onClick={() => setTaskDialogOpen(false)} sx={{ fontWeight: 600 }}>
                                Cancelar
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleCreateTask}
                                disabled={!taskForm.title.trim()}
                                sx={{
                                    bgcolor: '#ff6b35',
                                    fontWeight: 700,
                                    px: 4,
                                    borderRadius: 2,
                                    '&:hover': { bgcolor: '#e55a2b' },
                                }}
                            >
                                Criar Missao
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Snackbar */}
                    <Snackbar
                        open={snackbarOpen}
                        autoHideDuration={4000}
                        onClose={() => setSnackbarOpen(false)}
                        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    >
                        <Alert
                            onClose={() => setSnackbarOpen(false)}
                            severity={snackbarSeverity}
                            sx={{ width: '100%' }}
                        >
                            {snackbarMessage}
                        </Alert>
                    </Snackbar>
                </Box>
            </MenuContext>
        </PrivateRoute>
    );
}
