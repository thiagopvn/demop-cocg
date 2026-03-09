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
} from '@mui/icons-material';
import { collection, query, orderBy, onSnapshot, where, Timestamp } from 'firebase/firestore';
import db from '../../firebase/db';
import { verifyToken } from '../../firebase/token';
import { ACTION_LABELS, ACTION_COLORS } from '../../firebase/auditLog';
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

    const debouncedSearch = useDebounce(searchTerm, 300);

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decoded = await verifyToken(token);
                    setUserRole(decoded.role);
                } catch (error) {
                    console.error('Erro ao verificar token:', error);
                }
            }
        };
        fetchUserData();
    }, []);

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
                                                        <Tooltip title="Viaturas + Manutenções + Categorias + Usuários">
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
                                                            <Typography variant="body2" fontWeight={(stat.viaturas + stat.manutencoes + stat.categorias + stat.usuarios) > 0 ? 600 : 400}
                                                                color={(stat.viaturas + stat.manutencoes + stat.categorias + stat.usuarios) > 0 ? '#9c27b0' : 'text.disabled'}>
                                                                {stat.viaturas + stat.manutencoes + stat.categorias + stat.usuarios}
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
                </Box>
            </MenuContext>
        </PrivateRoute>
    );
}
