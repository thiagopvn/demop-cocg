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
    Button,
    TextField,
    MenuItem,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    LinearProgress,
    TablePagination,
    InputAdornment,
    Tooltip,
    IconButton
} from '@mui/material';
import {
    Search,
    Visibility,
    FilterList,
    Refresh,
    CalendarMonth,
    Build,
    Warning,
    CheckCircle,
    Delete
} from '@mui/icons-material';
import { collection, query, orderBy, getDocs, deleteDoc, doc, where, Timestamp } from 'firebase/firestore';
import db from '../../firebase/db';
import { useDebounce } from '../../hooks/useDebounce';
import { getMaintenanceTypeLabel } from '../../data/maintenanceTemplates';

const MaintenanceHistory = ({ materialIdFilter = '' }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [openDetailDialog, setOpenDetailDialog] = useState(false);
    const [filter, setFilter] = useState({
        type: 'todos',
        period: 'todos',
        material: ''
    });

    const debouncedSearch = useDebounce(searchTerm, 300);

    useEffect(() => {
        fetchHistory();
    }, [materialIdFilter]);

    useEffect(() => {
        setPage(0);
    }, [debouncedSearch, filter.type, filter.material, filter.period]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            let q;
            if (materialIdFilter) {
                q = query(
                    collection(db, 'historico_manutencoes'),
                    where('materialId', '==', materialIdFilter),
                    orderBy('completedAt', 'desc')
                );
            } else {
                q = query(
                    collection(db, 'historico_manutencoes'),
                    orderBy('completedAt', 'desc')
                );
            }
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                dueDate: doc.data().dueDate?.toDate() || new Date(),
                completedAt: doc.data().completedAt?.toDate() || new Date(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));
            setHistory(data);
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = useMemo(() => {
        let filtered = [...history];

        if (debouncedSearch) {
            const lower = debouncedSearch.toLowerCase();
            filtered = filtered.filter(record =>
                record.materialDescription?.toLowerCase().includes(lower) ||
                record.responsibleName?.toLowerCase().includes(lower) ||
                record.description?.toLowerCase().includes(lower) ||
                record.completionNotes?.toLowerCase().includes(lower)
            );
        }

        if (filter.type !== 'todos') {
            filtered = filtered.filter(record => record.type === filter.type);
        }

        if (filter.material) {
            filtered = filtered.filter(record =>
                record.materialDescription?.toLowerCase().includes(filter.material.toLowerCase())
            );
        }

        const today = new Date();
        today.setHours(23, 59, 59, 999);

        switch (filter.period) {
            case 'ultima_semana': {
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                filtered = filtered.filter(record =>
                    new Date(record.completedAt) >= weekAgo
                );
                break;
            }
            case 'ultimo_mes': {
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                filtered = filtered.filter(record =>
                    new Date(record.completedAt) >= monthAgo
                );
                break;
            }
            case 'ultimo_trimestre': {
                const quarterAgo = new Date(today);
                quarterAgo.setMonth(quarterAgo.getMonth() - 3);
                filtered = filtered.filter(record =>
                    new Date(record.completedAt) >= quarterAgo
                );
                break;
            }
            case 'ultimo_ano': {
                const yearAgo = new Date(today);
                yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                filtered = filtered.filter(record =>
                    new Date(record.completedAt) >= yearAgo
                );
                break;
            }
            default:
                break;
        }

        return filtered;
    }, [history, debouncedSearch, filter.type, filter.material, filter.period]);

    const handleViewDetails = (record) => {
        setSelectedRecord(record);
        setOpenDetailDialog(true);
    };

    const handleDeleteRecord = async (recordId) => {
        if (!window.confirm('Tem certeza que deseja excluir este registro do histórico?')) return;
        try {
            await deleteDoc(doc(db, 'historico_manutencoes', recordId));
            fetchHistory();
        } catch (error) {
            console.error('Erro ao excluir registro:', error);
        }
    };



    const getTypeIcon = (type) => {
        const icons = {
            diaria: <Build fontSize="small" />,
            semanal: <Build fontSize="small" />,
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

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const formatDateTime = (date) => {
        return new Date(date).toLocaleString('pt-BR');
    };

    const calculateDuration = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const stats = useMemo(() => {
        const total = filteredHistory.length;
        const preventiva = filteredHistory.filter(r => ['diaria', 'semanal', 'trimestral', 'semestral', 'anual'].includes(r.type)).length;
        const corretiva = filteredHistory.filter(r => ['corretiva', 'reparo'].includes(r.type)).length;
        let avgDuration = 0;
        if (total > 0) {
            const totalDuration = filteredHistory.reduce((acc, record) => {
                return acc + calculateDuration(record.createdAt, record.completedAt);
            }, 0);
            avgDuration = Math.round(totalDuration / total);
        }
        return { total, preventiva, corretiva, avgDuration };
    }, [filteredHistory]);

    if (loading) {
        return (
            <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                    Carregando histórico...
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Indicador de filtro por material */}
            {materialIdFilter && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Exibindo histórico filtrado por material específico.
                    {history.length > 0 && (
                        <strong> Material: {history[0]?.materialDescription}</strong>
                    )}
                </Alert>
            )}

            {/* Estatísticas Resumidas */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={3}>
                    <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="primary.main">{stats.total}</Typography>
                        <Typography variant="body2" color="text.secondary">Total Concluídas</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">{stats.preventiva}</Typography>
                        <Typography variant="body2" color="text.secondary">Preventivas</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="warning.main">{stats.corretiva}</Typography>
                        <Typography variant="body2" color="text.secondary">Corretivas</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="info.main">{stats.avgDuration}</Typography>
                        <Typography variant="body2" color="text.secondary">Dias Médios</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Filtros e Busca */}
            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            placeholder="Buscar por material, responsável, descrição ou notas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                ),
                            }}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} sm={2}>
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
                            <MenuItem value="ultima_semana">Última Semana</MenuItem>
                            <MenuItem value="ultimo_mes">Último Mês</MenuItem>
                            <MenuItem value="ultimo_trimestre">Último Trimestre</MenuItem>
                            <MenuItem value="ultimo_ano">Último Ano</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={1.5}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={fetchHistory}
                            size="small"
                        >
                            Atualizar
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabela de Histórico */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Material</TableCell>
                            <TableCell>Data Prevista</TableCell>
                            <TableCell>Data Conclusão</TableCell>
                            <TableCell>Duração</TableCell>
                            <TableCell>O que foi feito</TableCell>
                            <TableCell align="center">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredHistory.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    <Typography variant="body2" color="textSecondary">
                                        Nenhum registro encontrado no histórico
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredHistory
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {getTypeIcon(record.type)}
                                                <Typography variant="body2">
                                                    {getMaintenanceTypeLabel(record.type, record.customRecurrenceDays)}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title={record.materialDescription}>
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                                    {record.materialDescription}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>{formatDate(record.dueDate)}</TableCell>
                                        <TableCell>{formatDate(record.completedAt)}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${calculateDuration(record.createdAt, record.completedAt)} dias`}
                                                size="small"
                                                color="info"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title={record.completionNotes || 'Sem registro'}>
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                                    {record.completionNotes || '-'}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                                <Tooltip title="Ver detalhes">
                                                    <Button
                                                        size="small"
                                                        startIcon={<Visibility />}
                                                        onClick={() => handleViewDetails(record)}
                                                    >
                                                        Detalhes
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip title="Excluir registro">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDeleteRecord(record.id)}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={filteredHistory.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    labelRowsPerPage="Registros por página:"
                />
            </TableContainer>

            {/* Dialog de Detalhes */}
            <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle color="success" />
                        Detalhes da Manutenção Concluída
                    </Box>
                </DialogTitle>
                {selectedRecord && (
                    <DialogContent>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" gutterBottom>Informações Gerais</Typography>
                                <Box sx={{ pl: 2 }}>
                                    <Typography variant="body2"><strong>Material:</strong> {selectedRecord.materialDescription}</Typography>
                                    <Typography variant="body2"><strong>Tipo:</strong> {selectedRecord.type}</Typography>
                                    <Typography variant="body2"><strong>Responsável:</strong> {selectedRecord.responsibleName || 'N/A'}</Typography>
                                    <Typography variant="body2"><strong>Duração:</strong> {calculateDuration(selectedRecord.createdAt, selectedRecord.completedAt)} dias</Typography>
                                    {selectedRecord.isRecurrent && (
                                        <Typography variant="body2"><strong>Recorrência:</strong> {selectedRecord.recurrenceType} (#{selectedRecord.recurrenceCount || 0})</Typography>
                                    )}
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" gutterBottom>Datas</Typography>
                                <Box sx={{ pl: 2 }}>
                                    <Typography variant="body2"><strong>Agendada em:</strong> {formatDateTime(selectedRecord.createdAt)}</Typography>
                                    <Typography variant="body2"><strong>Data prevista:</strong> {formatDateTime(selectedRecord.dueDate)}</Typography>
                                    <Typography variant="body2"><strong>Concluída em:</strong> {formatDateTime(selectedRecord.completedAt)}</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" gutterBottom>Descrição Prevista</Typography>
                                <Paper elevation={1} sx={{ p: 2, backgroundColor: 'grey.50' }}>
                                    <Typography variant="body2">
                                        {selectedRecord.description || 'Nenhuma descrição fornecida.'}
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" gutterBottom>O que foi realizado</Typography>
                                <Paper elevation={1} sx={{ p: 2, backgroundColor: 'success.light', border: '1px solid', borderColor: 'success.main' }}>
                                    <Typography variant="body2">
                                        {selectedRecord.completionNotes || 'Nenhuma nota de conclusão registrada.'}
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>
                    </DialogContent>
                )}
                <DialogActions>
                    <Button onClick={() => setOpenDetailDialog(false)}>Fechar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MaintenanceHistory;
