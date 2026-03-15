import { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Button,
    TextField,
    MenuItem,
    Grid,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    LinearProgress,
    TableSortLabel,
    TablePagination,
    InputAdornment,
    Checkbox,
    FormControlLabel,
    alpha
} from '@mui/material';
import {
    Edit,
    Delete,
    CheckCircle,
    Cancel,
    Add,
    FilterList,
    Refresh,
    CalendarMonth,
    Build,
    Warning,
    Repeat,
    History,
    Search,
    ClearAll
} from '@mui/icons-material';
import { collection, query, getDocs, updateDoc, deleteDoc, doc, addDoc, Timestamp, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import db from '../../firebase/db';
import { verifyToken } from '../../firebase/token';
import { logAudit } from '../../firebase/auditLog';
import { createNextRecurrentMaintenance } from '../../services/maintenanceNotificationService';
import { useDebounce } from '../../hooks/useDebounce';
import { getMaintenanceTypeLabel, MAINTENANCE_TYPE_DAYS } from '../../data/maintenanceTemplates';
import MigrateMaintenancesDialog from '../../dialogs/MigrateMaintenancesDialog';

// Calcular a previsão da próxima manutenção baseado na periodicidade
const calcNextDueDate = (fromDate, recurrenceType, customDays) => {
    if (!fromDate || !recurrenceType) return null;
    const d = fromDate instanceof Date ? new Date(fromDate) : fromDate?.toDate ? new Date(fromDate.toDate()) : null;
    if (!d) return null;
    // Verificar se é um tipo de dias fixos
    if (MAINTENANCE_TYPE_DAYS[recurrenceType]) {
        d.setDate(d.getDate() + MAINTENANCE_TYPE_DAYS[recurrenceType]);
        return d;
    }
    switch (recurrenceType) {
        case 'diaria': d.setDate(d.getDate() + 1); break;
        case 'semanal': d.setDate(d.getDate() + 7); break;
        case 'quinzenal': d.setDate(d.getDate() + 15); break;
        case 'mensal': d.setMonth(d.getMonth() + 1); break;
        case 'bimestral': d.setMonth(d.getMonth() + 2); break;
        case 'trimestral': d.setMonth(d.getMonth() + 3); break;
        case 'semestral': d.setMonth(d.getMonth() + 6); break;
        case 'anual': d.setFullYear(d.getFullYear() + 1); break;
        case 'customizado':
            if (customDays) d.setDate(d.getDate() + customDays);
            else return null;
            break;
        default: return null;
    }
    return d;
};

const MaintenanceCalendar = () => {
    const navigate = useNavigate();
    const [maintenances, setMaintenances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState({ userId: '', userName: '', role: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState({
        status: 'todos',
        type: 'todos',
        period: 'todos',
        priority: 'todos',
    });
    const debouncedSearch = useDebounce(searchTerm, 300);
    const [sortField, setSortField] = useState('dueDate');
    const [sortDirection, setSortDirection] = useState('asc');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selectedMaintenance, setSelectedMaintenance] = useState(null);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [editData, setEditData] = useState({
        dueDate: '',
        responsibleName: '',
        description: '',
        type: '',
        status: ''
    });

    // Estado para o dialog de migração
    const [openMigrateDialog, setOpenMigrateDialog] = useState(false);

    // Estado para o dialog de conclusão
    const [openCompleteDialog, setOpenCompleteDialog] = useState(false);
    const [completionData, setCompletionData] = useState({
        completionNotes: '',
        confirmedAsPlanned: false,
        maintenanceId: null,
        maintenance: null
    });

    useEffect(() => {
        fetchMaintenances();
        const loadUser = async () => {
            try {
                const token = localStorage.getItem('token');
                const user = await verifyToken(token);
                if (user) {
                    setCurrentUser({ userId: user.userId || '', userName: user.username || '', role: user.role || '' });
                }
            } catch (e) {
                console.error('Erro ao carregar usuário:', e);
            }
        };
        loadUser();
    }, []);

    const fetchMaintenances = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, 'manutencoes'), orderBy('dueDate', 'asc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => {
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
            setMaintenances(data);
        } catch (error) {
            console.error('Erro ao buscar manutenções:', error);
        } finally {
            setLoading(false);
        }
    };

    const TYPE_ORDER = { diaria: 1, semanal: 2, mensal: 3, cada_90_dias: 3.5, trimestral: 4, cada_120_dias: 4.5, semestral: 5, cada_180_dias: 5.5, anual: 6, cada_365_dias: 6.5, corretiva: 7, reparo: 8 };
    const STATUS_ORDER = { pendente: 1, em_andamento: 2, concluida: 3, cancelada: 4 };
    const PRIORITY_ORDER = { critica: 1, alta: 2, media: 3, baixa: 4 };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilter({ status: 'todos', type: 'todos', period: 'todos', priority: 'todos' });
        setSortField('dueDate');
        setSortDirection('asc');
        setPage(0);
    };

    // Reset page when filters change
    useEffect(() => {
        setPage(0);
    }, [debouncedSearch, filter.status, filter.type, filter.priority, filter.period]);

    const hasActiveFilters = filter.status !== 'todos' || filter.type !== 'todos' || filter.period !== 'todos' || filter.priority !== 'todos' || searchTerm;

    const filteredMaintenances = useMemo(() => {
        let filtered = [...maintenances];

        // Busca por texto - usa debouncedSearch
        if (debouncedSearch) {
            const terms = debouncedSearch.toLowerCase().split(/\s+/).filter(Boolean);
            filtered = filtered.filter(m => {
                const text = `${m.materialDescription || ''} ${m.description || ''}`.toLowerCase();
                return terms.every(t => text.includes(t));
            });
        }

        if (filter.status !== 'todos') {
            filtered = filtered.filter(m => m.status === filter.status);
        }

        if (filter.type !== 'todos') {
            filtered = filtered.filter(m => m.type === filter.type);
        }

        if (filter.priority !== 'todos') {
            filtered = filtered.filter(m => m.priority === filter.priority);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (filter.period) {
            case 'atrasadas':
                filtered = filtered.filter(m =>
                    new Date(m.dueDate) < today && m.status === 'pendente'
                );
                break;
            case 'hoje':
                filtered = filtered.filter(m => {
                    const mDate = new Date(m.dueDate);
                    mDate.setHours(0, 0, 0, 0);
                    return mDate.getTime() === today.getTime();
                });
                break;
            case 'semana': {
                const weekFromNow = new Date(today);
                weekFromNow.setDate(weekFromNow.getDate() + 7);
                filtered = filtered.filter(m =>
                    new Date(m.dueDate) >= today && new Date(m.dueDate) <= weekFromNow
                );
                break;
            }
            case 'mes': {
                const monthFromNow = new Date(today);
                monthFromNow.setMonth(monthFromNow.getMonth() + 1);
                filtered = filtered.filter(m =>
                    new Date(m.dueDate) >= today && new Date(m.dueDate) <= monthFromNow
                );
                break;
            }
            case 'trimestre': {
                const qtrFromNow = new Date(today);
                qtrFromNow.setMonth(qtrFromNow.getMonth() + 3);
                filtered = filtered.filter(m =>
                    new Date(m.dueDate) >= today && new Date(m.dueDate) <= qtrFromNow
                );
                break;
            }
            default:
                break;
        }

        // Ordenação
        filtered.sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
                case 'type':
                    cmp = (TYPE_ORDER[a.type] || 99) - (TYPE_ORDER[b.type] || 99);
                    break;
                case 'materialDescription':
                    cmp = (a.materialDescription || '').localeCompare(b.materialDescription || '', 'pt-BR');
                    break;
                case 'status':
                    cmp = (STATUS_ORDER[a.status] || 99) - (STATUS_ORDER[b.status] || 99);
                    break;
                case 'dueDate':
                    cmp = new Date(a.dueDate) - new Date(b.dueDate);
                    break;
                case 'lastCompletedAt': {
                    const aDate = a.lastCompletedAt || a.completedAt;
                    const bDate = b.lastCompletedAt || b.completedAt;
                    if (!aDate && !bDate) cmp = 0;
                    else if (!aDate) cmp = 1;
                    else if (!bDate) cmp = -1;
                    else cmp = new Date(aDate) - new Date(bDate);
                    break;
                }
                case 'priority':
                    cmp = (PRIORITY_ORDER[a.priority] || 99) - (PRIORITY_ORDER[b.priority] || 99);
                    break;
                case 'description':
                    cmp = (a.description || '').localeCompare(b.description || '', 'pt-BR');
                    break;
                default:
                    cmp = new Date(a.dueDate) - new Date(b.dueDate);
            }
            return sortDirection === 'asc' ? cmp : -cmp;
        });

        return filtered;
    }, [maintenances, debouncedSearch, filter.status, filter.type, filter.priority, filter.period, sortField, sortDirection]);

    // Abrir dialog de conclusão
    const handleOpenCompleteDialog = (maintenanceId) => {
        const maintenance = maintenances.find(m => m.id === maintenanceId);
        setCompletionData({
            completionNotes: '',
            confirmedAsPlanned: false,
            maintenanceId,
            maintenance
        });
        setOpenCompleteDialog(true);
    };

    // Confirmar conclusão com notas - salva data/hora exata
    const handleConfirmComplete = async () => {
        const { maintenanceId, maintenance, completionNotes, confirmedAsPlanned } = completionData;
        const finalNotes = confirmedAsPlanned
            ? `[CONFORME PREVISTO] ${completionNotes || ''}`.trim()
            : completionNotes;
        try {
            const now = Timestamp.now();
            const nowDate = now.toDate();
            const docRef = doc(db, 'manutencoes', maintenanceId);
            await updateDoc(docRef, {
                status: 'concluida',
                updatedAt: now,
                completedAt: now,
                completionNotes: finalNotes || '',
                completedBy: currentUser.userName || ''
            });

            // Adicionar ao histórico
            await addToHistory(maintenance, finalNotes, now);

            // Criar próxima manutenção se for recorrente
            if (maintenance?.isRecurrent && maintenance?.recurrenceType) {
                const completedMaintenance = {
                    ...maintenance,
                    completedAt: nowDate,
                    completionNotes: finalNotes
                };
                const nextMaintenance = await createNextRecurrentMaintenance(completedMaintenance);
                if (nextMaintenance) {
                    console.log('Próxima manutenção recorrente criada:', nextMaintenance.id, 'para', nextMaintenance.dueDate?.toDate?.());
                }
            }

            // Atualizar status do material para operante
            if (maintenance?.materialId) {
                try {
                    const materialRef = doc(db, 'materials', maintenance.materialId);
                    await updateDoc(materialRef, {
                        maintenance_status: 'operante',
                        last_maintenance_update: now,
                        last_maintenance_date: now
                    });
                } catch {
                    console.log('Material não encontrado ou já atualizado');
                }
            }

            // Registrar no audit log
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

            setOpenCompleteDialog(false);
            setCompletionData({ completionNotes: '', confirmedAsPlanned: false, maintenanceId: null, maintenance: null });
            fetchMaintenances();
        } catch (error) {
            console.error('Erro ao concluir manutenção:', error);
        }
    };

    const handleStatusChange = async (maintenanceId, newStatus) => {
        if (newStatus === 'concluida') {
            handleOpenCompleteDialog(maintenanceId);
            return;
        }

        try {
            const docRef = doc(db, 'manutencoes', maintenanceId);
            await updateDoc(docRef, {
                status: newStatus,
                updatedAt: Timestamp.now()
            });
            fetchMaintenances();
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
        }
    };

    const addToHistory = async (maintenance, completionNotes = '', nowTimestamp) => {
        try {
            const historyDoc = {
                materialId: maintenance.materialId,
                materialDescription: maintenance.materialDescription,
                materialCategory: maintenance.materialCategory,
                type: maintenance.type,
                dueDate: maintenance.dueDate instanceof Date
                    ? Timestamp.fromDate(maintenance.dueDate)
                    : maintenance.dueDate,
                description: maintenance.description || '',
                priority: maintenance.priority || 'media',
                estimatedDuration: maintenance.estimatedDuration || null,
                requiredParts: maintenance.requiredParts || [],
                isRecurrent: maintenance.isRecurrent || false,
                recurrenceType: maintenance.recurrenceType || null,
                recurrenceCount: maintenance.recurrenceCount || 0,
                responsibleName: maintenance.responsibleName || '',
                completedBy: currentUser.userName || '',
                createdAt: maintenance.createdAt instanceof Date
                    ? Timestamp.fromDate(maintenance.createdAt)
                    : (maintenance.createdAt || Timestamp.now()),
                createdBy: maintenance.createdBy || '',
                completedAt: nowTimestamp || Timestamp.now(),
                completionNotes: completionNotes || '',
                originalId: maintenance.id
            };
            await addDoc(collection(db, 'historico_manutencoes'), historyDoc);
        } catch (error) {
            console.error('Erro ao adicionar ao histórico:', error);
        }
    };

    const handleDelete = async (maintenanceId) => {
        if (!window.confirm('Tem certeza que deseja excluir esta manutenção?')) return;
        try {
            await deleteDoc(doc(db, 'manutencoes', maintenanceId));
            fetchMaintenances();
        } catch (error) {
            console.error('Erro ao excluir manutenção:', error);
        }
    };

    const handleEditOpen = (maintenance) => {
        setSelectedMaintenance(maintenance);
        setEditData({
            dueDate: maintenance.dueDate.toISOString().split('T')[0],
            responsibleName: maintenance.responsibleName || '',
            description: maintenance.description || '',
            type: maintenance.type,
            status: maintenance.status
        });
        setOpenEditDialog(true);
    };

    const handleEditSave = async () => {
        try {
            const docRef = doc(db, 'manutencoes', selectedMaintenance.id);
            await updateDoc(docRef, {
                ...editData,
                dueDate: Timestamp.fromDate(new Date(editData.dueDate)),
                updatedAt: Timestamp.now()
            });
            setOpenEditDialog(false);
            fetchMaintenances();
        } catch (error) {
            console.error('Erro ao atualizar manutenção:', error);
        }
    };

    const handleViewHistory = (maintenance) => {
        navigate(`/manutencao?tab=2&materialId=${maintenance.materialId}`);
    };

    const getStatusChip = (status) => {
        const statusConfig = {
            pendente: { label: 'Pendente', color: 'warning' },
            em_andamento: { label: 'Em Andamento', color: 'info' },
            concluida: { label: 'Concluída', color: 'success' },
            cancelada: { label: 'Cancelada', color: 'error' }
        };
        const config = statusConfig[status] || statusConfig.pendente;
        return <Chip label={config.label} color={config.color} size="small" />;
    };

    const getTypeIcon = (type) => {
        const icons = {
            diaria: <Build fontSize="small" />,
            semanal: <Build fontSize="small" />,
            mensal: <CalendarMonth fontSize="small" />,
            trimestral: <CalendarMonth fontSize="small" />,
            semestral: <CalendarMonth fontSize="small" />,
            anual: <CalendarMonth fontSize="small" />,
            cada_90_dias: <CalendarMonth fontSize="small" />,
            cada_120_dias: <CalendarMonth fontSize="small" />,
            cada_180_dias: <CalendarMonth fontSize="small" />,
            cada_365_dias: <CalendarMonth fontSize="small" />,
            corretiva: <Warning fontSize="small" color="error" />,
            reparo: <Warning fontSize="small" color="error" />
        };
        return icons[type] || <Build fontSize="small" />;
    };

    const formatDateTime = (date) => {
        if (!date) return '-';
        const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
        return d.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const isOverdue = (dueDate, status) => {
        return status === 'pendente' && new Date(dueDate) < new Date();
    };

    // Para manutenções concluídas: previsão da próxima = dueDate + periodicidade
    // Para manutenções pendentes/em_andamento que são recorrentes: previsão = dueDate atual
    const getNextForecast = (m) => {
        if (!m.isRecurrent || !m.recurrenceType) return null;
        if (m.status === 'concluida') {
            // Calcular a partir da data de conclusão
            const base = m.completedAt || m.dueDate;
            return calcNextDueDate(base, m.recurrenceType, m.customRecurrenceDays);
        }
        // Para pendentes, a própria dueDate é a previsão atual
        return null;
    };

    if (loading) {
        return (
            <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                    Carregando cronograma...
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Busca */}
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar por material ou descrição da manutenção..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search color="action" fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: searchTerm ? (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setSearchTerm('')}>
                                    <Cancel fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : null,
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
            </Paper>

            {/* Filtros */}
            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={6} sm={2.4}>
                        <TextField
                            select
                            fullWidth
                            label="Status"
                            value={filter.status}
                            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                            size="small"
                        >
                            <MenuItem value="todos">Todos</MenuItem>
                            <MenuItem value="pendente">Pendente</MenuItem>
                            <MenuItem value="em_andamento">Em Andamento</MenuItem>
                            <MenuItem value="concluida">Concluída</MenuItem>
                            <MenuItem value="cancelada">Cancelada</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                        <TextField
                            select
                            fullWidth
                            label="Tipo"
                            value={filter.type}
                            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                            size="small"
                        >
                            <MenuItem value="todos">Todos</MenuItem>
                            <MenuItem value="cada_90_dias">A cada 90 dias</MenuItem>
                            <MenuItem value="cada_120_dias">A cada 120 dias</MenuItem>
                            <MenuItem value="cada_180_dias">A cada 180 dias</MenuItem>
                            <MenuItem value="cada_365_dias">A cada 365 dias</MenuItem>
                            <MenuItem value="diaria">Diária</MenuItem>
                            <MenuItem value="semanal">Semanal</MenuItem>
                            <MenuItem value="mensal">Mensal</MenuItem>
                            <MenuItem value="trimestral">Trimestral</MenuItem>
                            <MenuItem value="semestral">Semestral</MenuItem>
                            <MenuItem value="anual">Anual</MenuItem>
                            <MenuItem value="corretiva">Corretiva</MenuItem>
                            <MenuItem value="reparo">Reparo</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                        <TextField
                            select
                            fullWidth
                            label="Prioridade"
                            value={filter.priority}
                            onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
                            size="small"
                        >
                            <MenuItem value="todos">Todas</MenuItem>
                            <MenuItem value="baixa">Baixa</MenuItem>
                            <MenuItem value="media">Média</MenuItem>
                            <MenuItem value="alta">Alta</MenuItem>
                            <MenuItem value="critica">Crítica</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                        <TextField
                            select
                            fullWidth
                            label="Período"
                            value={filter.period}
                            onChange={(e) => setFilter({ ...filter, period: e.target.value })}
                            size="small"
                        >
                            <MenuItem value="todos">Todos</MenuItem>
                            <MenuItem value="atrasadas">Atrasadas</MenuItem>
                            <MenuItem value="hoje">Hoje</MenuItem>
                            <MenuItem value="semana">Esta Semana</MenuItem>
                            <MenuItem value="mes">Este Mês</MenuItem>
                            <MenuItem value="trimestre">Este Trimestre</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={2.4}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<Refresh />}
                                onClick={fetchMaintenances}
                                size="small"
                            >
                                Atualizar
                            </Button>
                            {hasActiveFilters && (
                                <Tooltip title="Limpar todos os filtros">
                                    <IconButton size="small" onClick={handleClearFilters} color="secondary">
                                        <ClearAll />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {currentUser.role === 'admin' && (
                                <Tooltip title="Migrar cronograma rebalanceado">
                                    <Button
                                        variant="outlined"
                                        color="warning"
                                        size="small"
                                        onClick={() => setOpenMigrateDialog(true)}
                                        sx={{ minWidth: 'auto', whiteSpace: 'nowrap' }}
                                    >
                                        Migrar
                                    </Button>
                                </Tooltip>
                            )}
                        </Box>
                    </Grid>
                </Grid>
                {/* Contador de resultados */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                    <Chip
                        label={`${filteredMaintenances.length} de ${maintenances.length}`}
                        size="small"
                        color={hasActiveFilters ? 'primary' : 'default'}
                        variant={hasActiveFilters ? 'filled' : 'outlined'}
                        sx={{ fontSize: '0.75rem', height: 24 }}
                    />
                    {hasActiveFilters && (
                        <Typography variant="caption" color="text.secondary">
                            filtros ativos
                        </Typography>
                    )}
                </Box>
            </Paper>

            {/* Tabela de Manutenções */}
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'primary.main' }}>
                            {[
                                { id: 'type', label: 'Tipo' },
                                { id: 'materialDescription', label: 'Material' },
                                { id: 'status', label: 'Status' },
                                { id: 'dueDate', label: 'Data Prevista' },
                                { id: 'lastCompletedAt', label: 'Última Conclusão' },
                                { id: 'priority', label: 'Prioridade' },
                            ].map((col) => (
                                <TableCell key={col.id} sx={{ color: 'white', fontWeight: 600 }}>
                                    <TableSortLabel
                                        active={sortField === col.id}
                                        direction={sortField === col.id ? sortDirection : 'asc'}
                                        onClick={() => handleSort(col.id)}
                                        sx={{
                                            color: 'white !important',
                                            '&.Mui-active': { color: 'white !important' },
                                            '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.7) !important' },
                                        }}
                                    >
                                        {col.label}
                                    </TableSortLabel>
                                </TableCell>
                            ))}
                            <TableCell sx={{ color: 'white', fontWeight: 600, minWidth: 250 }}>
                                <TableSortLabel
                                    active={sortField === 'description'}
                                    direction={sortField === 'description' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('description')}
                                    sx={{
                                        color: 'white !important',
                                        '&.Mui-active': { color: 'white !important' },
                                        '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.7) !important' },
                                    }}
                                >
                                    Descrição
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredMaintenances.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    <Typography variant="body2" color="textSecondary">
                                        Nenhuma manutenção encontrada
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMaintenances
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((maintenance) => {
                                const nextForecast = getNextForecast(maintenance);
                                // lastCompletedAt = conclusão da manutenção anterior (para recorrentes)
                                // completedAt = conclusão desta manutenção (se concluída)
                                const lastCompletion = maintenance.status === 'concluida'
                                    ? maintenance.completedAt
                                    : maintenance.lastCompletedAt;

                                // Próxima previsão:
                                // - Se concluída e recorrente: calcular a partir da conclusão
                                // - Se pendente/em_andamento: a própria dueDate é a previsão
                                let nextPreview = null;
                                if (maintenance.isRecurrent && maintenance.recurrenceType) {
                                    if (maintenance.status === 'concluida' && maintenance.completedAt) {
                                        nextPreview = calcNextDueDate(maintenance.completedAt, maintenance.recurrenceType, maintenance.customRecurrenceDays);
                                    } else {
                                        nextPreview = maintenance.dueDate;
                                    }
                                }

                                return (
                                    <TableRow
                                        key={maintenance.id}
                                        sx={{
                                            backgroundColor: isOverdue(maintenance.dueDate, maintenance.status)
                                                ? 'error.light'
                                                : 'inherit',
                                            opacity: maintenance.status === 'concluida' ? 0.7 : 1
                                        }}
                                    >
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {getTypeIcon(maintenance.type)}
                                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                                    {getMaintenanceTypeLabel(maintenance.type, maintenance.customRecurrenceDays)}
                                                </Typography>
                                                {maintenance.isRecurrent && (
                                                    <Tooltip title={`Recorrente: ${getMaintenanceTypeLabel(maintenance.recurrenceType, maintenance.customRecurrenceDays)}`}>
                                                        <Repeat fontSize="small" color="secondary" />
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                                {maintenance.materialDescription}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusChip(maintenance.status)}
                                            {isOverdue(maintenance.dueDate, maintenance.status) && (
                                                <Chip label="Atrasada" color="error" size="small" sx={{ ml: 0.5 }} />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                                {formatDate(maintenance.dueDate)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {lastCompletion ? (
                                                <Tooltip title={`Concluída em ${formatDateTime(lastCompletion)}`}>
                                                    <Chip
                                                        label={formatDateTime(lastCompletion)}
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                        sx={{ fontSize: '0.7rem', height: 24 }}
                                                    />
                                                </Tooltip>
                                            ) : (
                                                <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
                                                    -
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={
                                                    maintenance.priority === 'critica' ? 'Crítica' :
                                                    maintenance.priority === 'alta' ? 'Alta' :
                                                    maintenance.priority === 'media' ? 'Média' : 'Baixa'
                                                }
                                                size="small"
                                                color={
                                                    maintenance.priority === 'critica' ? 'error' :
                                                    maintenance.priority === 'alta' ? 'warning' :
                                                    maintenance.priority === 'media' ? 'default' : 'success'
                                                }
                                                variant={maintenance.priority === 'critica' || maintenance.priority === 'alta' ? 'filled' : 'outlined'}
                                                sx={{ fontSize: '0.7rem', height: 24 }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ minWidth: 250, maxWidth: 400 }}>
                                            <Typography variant="body2" sx={{ fontSize: '0.8rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                {maintenance.description || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                {maintenance.status === 'pendente' && (
                                                    <>
                                                        <Tooltip title="Concluir manutenção">
                                                            <IconButton
                                                                size="small"
                                                                color="success"
                                                                onClick={() => handleStatusChange(maintenance.id, 'concluida')}
                                                            >
                                                                <CheckCircle />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Iniciar">
                                                            <IconButton
                                                                size="small"
                                                                color="info"
                                                                onClick={() => handleStatusChange(maintenance.id, 'em_andamento')}
                                                            >
                                                                <Build />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                )}
                                                {maintenance.status === 'em_andamento' && (
                                                    <Tooltip title="Concluir manutenção">
                                                        <IconButton
                                                            size="small"
                                                            color="success"
                                                            onClick={() => handleStatusChange(maintenance.id, 'concluida')}
                                                        >
                                                            <CheckCircle />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Histórico do material">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleViewHistory(maintenance)}
                                                    >
                                                        <History />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Editar">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEditOpen(maintenance)}
                                                    >
                                                        <Edit />
                                                    </IconButton>
                                                </Tooltip>
                                                {currentUser.role === 'admingeral' && (
                                                    <Tooltip title="Excluir">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDelete(maintenance.id)}
                                                        >
                                                            <Delete />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={filteredMaintenances.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    labelRowsPerPage="Por página:"
                />
            </TableContainer>

            {/* Dialog de Conclusão */}
            <Dialog open={openCompleteDialog} onClose={() => setOpenCompleteDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
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
                                    <Chip label={getMaintenanceTypeLabel(completionData.maintenance.type, completionData.maintenance.customRecurrenceDays)} size="small" color="primary" variant="outlined" />
                                    <Chip label={completionData.maintenance.priority === 'alta' ? 'Alta' : completionData.maintenance.priority === 'critica' ? 'Crítica' : completionData.maintenance.priority === 'media' ? 'Média' : 'Baixa'} size="small" color={completionData.maintenance.priority === 'alta' ? 'warning' : completionData.maintenance.priority === 'critica' ? 'error' : 'default'} />
                                    {completionData.maintenance.isRecurrent && (
                                        <Chip icon={<Repeat sx={{ fontSize: 14 }} />} label={`Recorrente (${getMaintenanceTypeLabel(completionData.maintenance.recurrenceType, completionData.maintenance.customRecurrenceDays)})`} size="small" color="secondary" variant="outlined" />
                                    )}
                                </Box>
                            </Box>

                            {/* Checkbox obrigatório */}
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
                                    mb: 2,
                                    p: 1.5,
                                    borderRadius: 2,
                                    border: '2px solid',
                                    borderColor: completionData.confirmedAsPlanned ? 'success.main' : 'grey.300',
                                    bgcolor: completionData.confirmedAsPlanned ? (theme) => alpha(theme.palette.success.main, 0.06) : 'transparent',
                                    transition: 'all 0.2s ease',
                                    width: '100%',
                                    mx: 0,
                                }}
                            />

                            {/* Observações opcionais */}
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
                    <Button onClick={() => setOpenCompleteDialog(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
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

            {/* Dialog de Edição */}
            <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Editar Manutenção</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Data Prevista"
                                type="date"
                                value={editData.dueDate}
                                onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                select
                                fullWidth
                                label="Tipo"
                                value={editData.type}
                                onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                            >
                                <MenuItem value="cada_90_dias">A cada 90 dias</MenuItem>
                                <MenuItem value="cada_120_dias">A cada 120 dias</MenuItem>
                                <MenuItem value="cada_180_dias">A cada 180 dias</MenuItem>
                                <MenuItem value="cada_365_dias">A cada 365 dias</MenuItem>
                                <MenuItem value="diaria">Diária</MenuItem>
                                <MenuItem value="semanal">Semanal</MenuItem>
                                <MenuItem value="mensal">Mensal</MenuItem>
                                <MenuItem value="trimestral">Trimestral</MenuItem>
                                <MenuItem value="semestral">Semestral</MenuItem>
                                <MenuItem value="anual">Anual</MenuItem>
                                <MenuItem value="corretiva">Corretiva</MenuItem>
                                <MenuItem value="reparo">Reparo</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                select
                                fullWidth
                                label="Status"
                                value={editData.status}
                                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                            >
                                <MenuItem value="pendente">Pendente</MenuItem>
                                <MenuItem value="em_andamento">Em Andamento</MenuItem>
                                <MenuItem value="concluida">Concluída</MenuItem>
                                <MenuItem value="cancelada">Cancelada</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Responsável"
                                value={editData.responsibleName}
                                onChange={(e) => setEditData({ ...editData, responsibleName: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Descrição"
                                value={editData.description}
                                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEditDialog(false)}>Cancelar</Button>
                    <Button onClick={handleEditSave} variant="contained">Salvar</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog de Migração */}
            <MigrateMaintenancesDialog
                open={openMigrateDialog}
                onClose={(changed) => {
                    setOpenMigrateDialog(false);
                    if (changed) fetchMaintenances();
                }}
            />
        </Box>
    );
};

export default MaintenanceCalendar;
