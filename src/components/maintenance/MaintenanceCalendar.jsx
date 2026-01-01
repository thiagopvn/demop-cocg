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
    Repeat
} from '@mui/icons-material';
import { collection, query, getDocs, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import db from '../../firebase/db';
import { createNextRecurrentMaintenance } from '../../services/maintenanceNotificationService';

const MaintenanceCalendar = () => {
    const [maintenances, setMaintenances] = useState([]);
    const [filteredMaintenances, setFilteredMaintenances] = useState([]);
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        fetchMaintenances();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [maintenances, filter]);

    const fetchMaintenances = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, 'manutencoes'), orderBy('dueDate', 'asc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                dueDate: doc.data().dueDate?.toDate() || new Date()
            }));
            setMaintenances(data);
        } catch (error) {
            console.error('Erro ao buscar manutenções:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...maintenances];

        // Filtro por status
        if (filter.status !== 'todos') {
            filtered = filtered.filter(m => m.status === filter.status);
        }

        // Filtro por tipo
        if (filter.type !== 'todos') {
            filtered = filtered.filter(m => m.type === filter.type);
        }

        // Filtro por período
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

    const handleStatusChange = async (maintenanceId, newStatus) => {
        try {
            const docRef = doc(db, 'manutencoes', maintenanceId);
            await updateDoc(docRef, {
                status: newStatus,
                updatedAt: Timestamp.now(),
                ...(newStatus === 'concluida' ? { completedAt: Timestamp.now() } : {})
            });

            // Se concluída, adicionar ao histórico e criar próxima se for recorrente
            if (newStatus === 'concluida') {
                const maintenance = maintenances.find(m => m.id === maintenanceId);
                await addToHistory(maintenance);

                // Criar próxima manutenção se for recorrente
                if (maintenance?.isRecurrent && maintenance?.recurrenceType) {
                    const nextMaintenance = await createNextRecurrentMaintenance(maintenance);
                    if (nextMaintenance) {
                        console.log('Próxima manutenção recorrente criada:', nextMaintenance.id);
                    }
                }

                // Atualizar status do material para operacional se estava em manutenção
                if (maintenance?.materialId) {
                    try {
                        const materialRef = doc(db, 'materials', maintenance.materialId);
                        await updateDoc(materialRef, {
                            maintenance_status: 'operacional',
                            last_maintenance_update: Timestamp.now(),
                            last_maintenance_date: Timestamp.now()
                        });
                    } catch {
                        console.log('Material não encontrado ou já atualizado');
                    }
                }
            }

            fetchMaintenances();
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
        }
    };

    const addToHistory = async (maintenance) => {
        try {
            const historyDoc = {
                ...maintenance,
                completedAt: Timestamp.now(),
                originalId: maintenance.id
            };
            delete historyDoc.id;
            await collection(db, 'historico_manutencoes').add(historyDoc);
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
            trimestral: <CalendarMonth fontSize="small" />,
            semestral: <CalendarMonth fontSize="small" />,
            anual: <CalendarMonth fontSize="small" />,
            corretiva: <Warning fontSize="small" color="error" />,
            reparo: <Warning fontSize="small" color="error" />
        };
        return icons[type] || <Build fontSize="small" />;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const isOverdue = (dueDate, status) => {
        return status === 'pendente' && new Date(dueDate) < new Date();
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
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Material</TableCell>
                            <TableCell>Data Prevista</TableCell>
                            <TableCell>Responsável</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell align="center">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredMaintenances.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    <Typography variant="body2" color="textSecondary">
                                        Nenhuma manutenção encontrada
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMaintenances.map((maintenance) => (
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
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {getTypeIcon(maintenance.type)}
                                            <Typography variant="body2">
                                                {maintenance.type.charAt(0).toUpperCase() + maintenance.type.slice(1)}
                                            </Typography>
                                            {maintenance.isRecurrent && (
                                                <Tooltip title={`Recorrente: ${maintenance.recurrenceType || 'Sim'}`}>
                                                    <Repeat fontSize="small" color="secondary" />
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>{maintenance.materialDescription}</TableCell>
                                    <TableCell>
                                        {formatDate(maintenance.dueDate)}
                                        {isOverdue(maintenance.dueDate, maintenance.status) && (
                                            <Chip 
                                                label="Atrasada" 
                                                color="error" 
                                                size="small" 
                                                sx={{ ml: 1 }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>{maintenance.responsibleName || '-'}</TableCell>
                                    <TableCell>{getStatusChip(maintenance.status)}</TableCell>
                                    <TableCell>
                                        <Tooltip title={maintenance.description || 'Sem descrição'}>
                                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                                {maintenance.description || '-'}
                                            </Typography>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="center">
                                        {maintenance.status === 'pendente' && (
                                            <>
                                                <Tooltip title="Marcar como concluída">
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
                                            <Tooltip title="Concluir">
                                                <IconButton
                                                    size="small"
                                                    color="success"
                                                    onClick={() => handleStatusChange(maintenance.id, 'concluida')}
                                                >
                                                    <CheckCircle />
                                                </IconButton>
                                            </Tooltip>
                                        )}
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
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

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