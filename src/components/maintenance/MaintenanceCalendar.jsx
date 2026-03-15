import { useState, useEffect } from 'react';
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
    LinearProgress
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
    History
} from '@mui/icons-material';
import { collection, query, getDocs, updateDoc, deleteDoc, doc, addDoc, Timestamp, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import db from '../../firebase/db';
import { verifyToken } from '../../firebase/token';
import { logAudit } from '../../firebase/auditLog';
import { createNextRecurrentMaintenance } from '../../services/maintenanceNotificationService';

// Calcular a previsão da próxima manutenção baseado na periodicidade
const calcNextDueDate = (fromDate, recurrenceType, customDays) => {
    if (!fromDate || !recurrenceType) return null;
    const d = fromDate instanceof Date ? new Date(fromDate) : fromDate?.toDate ? new Date(fromDate.toDate()) : null;
    if (!d) return null;
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
    const [filteredMaintenances, setFilteredMaintenances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState({ userId: '', userName: '' });
    const [filter, setFilter] = useState({
        status: 'todos',
        type: 'todos',
        period: 'todos'
    });
    const [selectedMaintenance, setSelectedMaintenance] = useState(null);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [editData, setEditData] = useState({
        dueDate: '',
        responsibleName: '',
        description: '',
        type: '',
        status: ''
    });

    // Estado para o dialog de conclusão
    const [openCompleteDialog, setOpenCompleteDialog] = useState(false);
    const [completionData, setCompletionData] = useState({
        completionNotes: '',
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
                    setCurrentUser({ userId: user.userId || '', userName: user.username || '' });
                }
            } catch (e) {
                console.error('Erro ao carregar usuário:', e);
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [maintenances, filter]);

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

    const applyFilters = () => {
        let filtered = [...maintenances];

        if (filter.status !== 'todos') {
            filtered = filtered.filter(m => m.status === filter.status);
        }

        if (filter.type !== 'todos') {
            filtered = filtered.filter(m => m.type === filter.type);
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
            default:
                break;
        }

        setFilteredMaintenances(filtered);
    };

    // Abrir dialog de conclusão
    const handleOpenCompleteDialog = (maintenanceId) => {
        const maintenance = maintenances.find(m => m.id === maintenanceId);
        setCompletionData({
            completionNotes: '',
            maintenanceId,
            maintenance
        });
        setOpenCompleteDialog(true);
    };

    // Confirmar conclusão com notas - salva data/hora exata
    const handleConfirmComplete = async () => {
        const { maintenanceId, maintenance, completionNotes } = completionData;
        try {
            const now = Timestamp.now();
            const nowDate = now.toDate();
            const docRef = doc(db, 'manutencoes', maintenanceId);
            await updateDoc(docRef, {
                status: 'concluida',
                updatedAt: now,
                completedAt: now,
                completionNotes: completionNotes || '',
                completedBy: currentUser.userName || ''
            });

            // Adicionar ao histórico
            await addToHistory(maintenance, completionNotes, now);

            // Criar próxima manutenção se for recorrente
            if (maintenance?.isRecurrent && maintenance?.recurrenceType) {
                const completedMaintenance = {
                    ...maintenance,
                    completedAt: nowDate,
                    completionNotes
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
                    o_que_foi_feito: completionNotes,
                    recorrente: maintenance?.isRecurrent ? maintenance?.recurrenceType : 'não',
                    concluido_em: nowDate.toLocaleString('pt-BR')
                }
            });

            setOpenCompleteDialog(false);
            setCompletionData({ completionNotes: '', maintenanceId: null, maintenance: null });
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
            trimestral: <CalendarMonth fontSize="small" />,
            semestral: <CalendarMonth fontSize="small" />,
            anual: <CalendarMonth fontSize="small" />,
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
            {/* Filtros */}
            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
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
                    <Grid item xs={12} sm={3}>
                        <TextField
                            select
                            fullWidth
                            label="Tipo"
                            value={filter.type}
                            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                            size="small"
                        >
                            <MenuItem value="todos">Todos</MenuItem>
                            <MenuItem value="diaria">Diária</MenuItem>
                            <MenuItem value="semanal">Semanal</MenuItem>
                            <MenuItem value="trimestral">Trimestral</MenuItem>
                            <MenuItem value="semestral">Semestral</MenuItem>
                            <MenuItem value="anual">Anual</MenuItem>
                            <MenuItem value="corretiva">Corretiva</MenuItem>
                            <MenuItem value="reparo">Reparo</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={3}>
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
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={fetchMaintenances}
                        >
                            Atualizar
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabela de Manutenções */}
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'primary.main' }}>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Tipo</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Material</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Data Prevista</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Última Conclusão</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Próxima Previsão</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Descrição</TableCell>
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
                            filteredMaintenances.map((maintenance) => {
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
                                                    {maintenance.type.charAt(0).toUpperCase() + maintenance.type.slice(1)}
                                                </Typography>
                                                {maintenance.isRecurrent && (
                                                    <Tooltip title={`Recorrente: ${maintenance.recurrenceType || 'Sim'}`}>
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
                                            {nextPreview ? (
                                                <Tooltip title={`Próxima: ${formatDateTime(nextPreview)} (${maintenance.recurrenceType})`}>
                                                    <Chip
                                                        label={formatDate(nextPreview)}
                                                        size="small"
                                                        color="info"
                                                        variant="outlined"
                                                        sx={{ fontSize: '0.7rem', height: 24 }}
                                                    />
                                                </Tooltip>
                                            ) : (
                                                <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
                                                    {maintenance.isRecurrent ? '-' : 'Não recorrente'}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title={maintenance.description || 'Sem descrição'}>
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 150, fontSize: '0.8rem' }}>
                                                    {maintenance.description || '-'}
                                                </Typography>
                                            </Tooltip>
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
                                                <Tooltip title="Excluir">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDelete(maintenance.id)}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dialog de Conclusão */}
            <Dialog open={openCompleteDialog} onClose={() => setOpenCompleteDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle color="success" />
                        Concluir Manutenção
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {completionData.maintenance && (
                        <Box sx={{ mb: 2, mt: 1 }}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    <strong>Material:</strong> {completionData.maintenance.materialDescription}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Tipo:</strong> {completionData.maintenance.type}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Descrição prevista:</strong> {completionData.maintenance.description || 'N/A'}
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    <strong>Data/hora atual:</strong> {new Date().toLocaleString('pt-BR')}
                                </Typography>
                                {completionData.maintenance.isRecurrent && (
                                    <Typography variant="body2" sx={{ mt: 1, color: 'secondary.main', fontWeight: 600 }}>
                                        Recorrente ({completionData.maintenance.recurrenceType}) - Uma nova manutenção será criada automaticamente
                                    </Typography>
                                )}
                            </Alert>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="O que foi realizado? *"
                                placeholder="Descreva os procedimentos executados, peças trocadas, observações..."
                                value={completionData.completionNotes}
                                onChange={(e) => setCompletionData(prev => ({ ...prev, completionNotes: e.target.value }))}
                                helperText="Este registro ficará no histórico de manutenções do equipamento"
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCompleteDialog(false)}>Cancelar</Button>
                    <Button
                        onClick={handleConfirmComplete}
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircle />}
                        disabled={!completionData.completionNotes.trim()}
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
                                <MenuItem value="diaria">Diária</MenuItem>
                                <MenuItem value="semanal">Semanal</MenuItem>
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
        </Box>
    );
};

export default MaintenanceCalendar;
