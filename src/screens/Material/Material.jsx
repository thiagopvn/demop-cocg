import { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Paper, 
    IconButton, 
    Chip,
    TextField,
    InputAdornment,
    Toolbar,
    Tooltip,
    Alert,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText,
    Snackbar
} from '@mui/material';
import { 
    Add, 
    Edit, 
    Delete, 
    CalendarMonth, 
    Search,
    Build,
    Warning,
    CheckCircle,
    Refresh
} from '@mui/icons-material';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import db from '../../firebase/db';
import MenuContext from '../../contexts/MenuContext';
import MaintenanceDialog from '../../dialogs/MaintenanceDialog';
import MaterialDialog from '../../dialogs/MaterialDialog';

const Material = () => {
    const [materials, setMaterials] = useState([]);
    const [filteredMaterials, setFilteredMaterials] = useState([]);
    const [openMaintenanceDialog, setOpenMaintenanceDialog] = useState(false);
    const [openMaterialDialog, setOpenMaterialDialog] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [maintenanceFilter, setMaintenanceFilter] = useState('todos'); // todos, operante, em_manutencao, inoperante
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [materialToDelete, setMaterialToDelete] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'materials'), orderBy('description', 'asc'));
        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                try {
                    const materialsData = snapshot.docs.map(doc => ({ 
                        id: doc.id, 
                        ...doc.data(),
                        // Garantir que maintenance_status tenha um valor padrão
                        maintenance_status: doc.data().maintenance_status || 'operante'
                    }));
                    setMaterials(materialsData);
                    setLoading(false);
                } catch (err) {
                    console.error('Erro ao processar dados dos materiais:', err);
                    setError('Erro ao carregar materiais');
                    setLoading(false);
                }
            },
            (err) => {
                console.error('Erro ao buscar materiais:', err);
                setError('Erro ao conectar com o banco de dados');
                setLoading(false);
            }
        );
        
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [materials, searchTerm, maintenanceFilter]);

    const applyFilters = () => {
        let filtered = [...materials];

        // Filtro por termo de busca
        if (searchTerm) {
            filtered = filtered.filter(material =>
                material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                material.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtro por status de manutenção
        if (maintenanceFilter !== 'todos') {
            filtered = filtered.filter(material => 
                material.maintenance_status === maintenanceFilter
            );
        }

        setFilteredMaterials(filtered);
    };
    
    const handleOpenMaintenanceDialog = (material) => {
        setSelectedMaterial(material);
        setOpenMaintenanceDialog(true);
    };

    const handleCloseMaintenanceDialog = (wasUpdated = false) => {
        setSelectedMaterial(null);
        setOpenMaintenanceDialog(false);
        
        if (wasUpdated) {
            // Opcionalmente mostrar mensagem de sucesso
            console.log('Manutenção agendada com sucesso');
        }
    };

    const handleOpenMaterialDialog = () => {
        setSelectedMaterial(null);
        setOpenMaterialDialog(true);
    };

    const handleCloseMaterialDialog = () => {
        setSelectedMaterial(null);
        setOpenMaterialDialog(false);
    };

    const handleCreateMaterial = async (materialData) => {
        try {
            await addDoc(collection(db, 'materials'), {
                ...materialData,
                estoque_atual: parseInt(materialData.estoque_atual) || 0,
                estoque_total: parseInt(materialData.estoque_total) || 0,
                maintenance_status: 'operante',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            handleCloseMaterialDialog();
            setSuccessMessage('Material criado com sucesso!');
            setSnackbarOpen(true);
        } catch (error) {
            console.error('Erro ao criar material:', error);
            setError('Erro ao criar material');
        }
    };

    const handleDeleteMaterial = (material) => {
        console.log('handleDeleteMaterial called with:', material);
        setMaterialToDelete(material);
        setDeleteDialogOpen(true);
    };

    const confirmDeleteMaterial = async () => {
        if (!materialToDelete) return;
        
        console.log('Material to delete:', materialToDelete);
        console.log('Material ID:', materialToDelete.id);
        
        try {
            if (!materialToDelete.id) {
                throw new Error('ID do material não encontrado');
            }
            
            const materialRef = doc(db, 'materials', materialToDelete.id);
            console.log('Document reference:', materialRef);
            
            await deleteDoc(materialRef);
            setDeleteDialogOpen(false);
            setMaterialToDelete(null);
            setSuccessMessage('Material excluído com sucesso!');
            setSnackbarOpen(true);
        } catch (error) {
            console.error('Erro ao excluir material:', error);
            setError('Erro ao excluir material: ' + error.message);
            setDeleteDialogOpen(false);
            setMaterialToDelete(null);
        }
    };

    const cancelDeleteMaterial = () => {
        setDeleteDialogOpen(false);
        setMaterialToDelete(null);
    };

    const handleCloseSnackbar = () => {
        setSnackbarOpen(false);
        setSuccessMessage('');
    };

    const getStatusChip = (status) => {
        const statusConfig = {
            em_manutencao: { 
                label: 'Em Manutenção', 
                color: 'primary',
                icon: <Build fontSize="small" />
            },
            inoperante: { 
                label: 'Inoperante', 
                color: 'error',
                icon: <Warning fontSize="small" />
            },
            operante: { 
                label: 'Operante', 
                color: 'success',
                icon: <CheckCircle fontSize="small" />
            }
        };
        
        const config = statusConfig[status] || statusConfig.operante;
        
        return (
            <Chip 
                label={config.label} 
                color={config.color} 
                size="small"
                icon={config.icon}
                variant={status === 'operante' ? 'outlined' : 'filled'}
            />
        );
    };

    const getMaintenanceButtonColor = (status) => {
        switch (status) {
            case 'inoperante':
                return 'error';
            case 'em_manutencao':
                return 'warning';
            default:
                return 'primary';
        }
    };

    const getMaintenanceButtonText = (status) => {
        switch (status) {
            case 'inoperante':
                return 'Agendar Reparo';
            case 'em_manutencao':
                return 'Nova Manutenção';
            default:
                return 'Agendar Manutenção';
        }
    };

    const getMaintenanceStats = () => {
        return {
            total: materials.length,
            operante: materials.filter(m => m.maintenance_status === 'operante').length,
            em_manutencao: materials.filter(m => m.maintenance_status === 'em_manutencao').length,
            inoperante: materials.filter(m => m.maintenance_status === 'inoperante').length
        };
    };

    const stats = getMaintenanceStats();

    if (loading) {
        return (
            <MenuContext>
                <Box className="root-protected">
                    <LinearProgress />
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                        Carregando materiais...
                    </Typography>
                </Box>
            </MenuContext>
        );
    }

    if (error) {
        return (
            <MenuContext>
                <Box className="root-protected">
                    <Alert severity="error">{error}</Alert>
                </Box>
            </MenuContext>
        );
    }

    return (
        <MenuContext>
            <Box className="root-protected">
                <Typography variant="h4" gutterBottom>
                    Gestão de Materiais
                </Typography>

                {/* Estatísticas Rápidas */}
                <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip 
                        label={`Total: ${stats.total}`} 
                        color="default" 
                        variant="outlined"
                    />
                    <Chip 
                        label={`Operante: ${stats.operante}`} 
                        color="success" 
                        variant="outlined"
                    />
                    <Chip 
                        label={`Em Manutenção: ${stats.em_manutencao}`} 
                        color="primary" 
                        variant="outlined"
                    />
                    <Chip 
                        label={`Inoperante: ${stats.inoperante}`} 
                        color="error" 
                        variant="outlined"
                    />
                </Box>

                {/* Toolbar de Filtros */}
                <Paper elevation={2} sx={{ mb: 3 }}>
                    <Toolbar>
                        <TextField
                            placeholder="Buscar materiais..."
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
                            sx={{ flexGrow: 1, mr: 2 }}
                        />
                        
                        <TextField
                            select
                            label="Status Manutenção"
                            value={maintenanceFilter}
                            onChange={(e) => setMaintenanceFilter(e.target.value)}
                            size="small"
                            sx={{ minWidth: 150, mr: 2 }}
                            SelectProps={{
                                native: true,
                            }}
                        >
                            <option value="todos">Todos</option>
                            <option value="operante">Operante</option>
                            <option value="em_manutencao">Em Manutenção</option>
                            <option value="inoperante">Inoperante</option>
                        </TextField>

                        <Button
                            variant="outlined"
                            startIcon={<Add />}
                            onClick={handleOpenMaterialDialog}
                            sx={{ mr: 1 }}
                        >
                            Novo Material
                        </Button>

                        <Tooltip title="Atualizar lista">
                            <IconButton>
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                    </Toolbar>
                </Paper>

                {/* Alertas de Status */}
                {stats.inoperante > 0 && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {stats.inoperante} material(is) inoperante(s) necessitam de atenção imediata.
                    </Alert>
                )}
                
                {stats.em_manutencao > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {stats.em_manutencao} material(is) em manutenção.
                    </Alert>
                )}

                {/* Tabela de Materiais */}
                <TableContainer component={Paper} className="table">
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Descrição</TableCell>
                                <TableCell>Categoria</TableCell>
                                <TableCell>Estoque</TableCell>
                                <TableCell>Status Manutenção</TableCell>
                                <TableCell align="right">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredMaterials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography variant="body2" color="textSecondary">
                                            {searchTerm || maintenanceFilter !== 'todos' 
                                                ? 'Nenhum material encontrado com os filtros aplicados'
                                                : 'Nenhum material cadastrado'
                                            }
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMaterials.map((material) => (
                                    <TableRow 
                                        key={material.id}
                                        sx={{
                                            backgroundColor: material.maintenance_status === 'inoperante' 
                                                ? 'error.light' 
                                                : material.maintenance_status === 'em_manutencao'
                                                ? 'warning.light'
                                                : 'inherit',
                                            '&:hover': {
                                                backgroundColor: material.maintenance_status === 'inoperante' 
                                                    ? 'error.main' 
                                                    : material.maintenance_status === 'em_manutencao'
                                                    ? 'warning.main'
                                                    : 'action.hover',
                                            }
                                        }}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {material.description}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{material.categoria || 'N/A'}</TableCell>
                                        <TableCell>
                                            {material.estoque_atual !== undefined && material.estoque_total !== undefined
                                                ? `${material.estoque_atual}/${material.estoque_total}`
                                                : 'N/A'
                                            }
                                        </TableCell>
                                        <TableCell>
                                            {getStatusChip(material.maintenance_status)}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title={getMaintenanceButtonText(material.maintenance_status)}>
                                                <IconButton 
                                                    onClick={() => handleOpenMaintenanceDialog(material)}
                                                    color={getMaintenanceButtonColor(material.maintenance_status)}
                                                    size="small"
                                                >
                                                    <CalendarMonth />
                                                </IconButton>
                                            </Tooltip>
                                            
                                            <Tooltip title="Editar material">
                                                <IconButton size="small">
                                                    <Edit />
                                                </IconButton>
                                            </Tooltip>
                                            
                                            <Tooltip title="Excluir material">
                                                <IconButton 
                                                    size="small" 
                                                    color="error"
                                                    onClick={() => handleDeleteMaterial(material)}
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

                {/* Dialog de Manutenção */}
                <MaintenanceDialog
                    open={openMaintenanceDialog}
                    onClose={handleCloseMaintenanceDialog}
                    material={selectedMaterial}
                />

                {/* Dialog de Material */}
                <MaterialDialog
                    open={openMaterialDialog}
                    onSubmit={handleCreateMaterial}
                    onCancel={handleCloseMaterialDialog}
                    editData={selectedMaterial}
                />

                {/* Dialog de Confirmação de Exclusão */}
                <Dialog
                    open={deleteDialogOpen}
                    onClose={cancelDeleteMaterial}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        ⚠️ Confirmar Exclusão
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Tem certeza que deseja excluir o material <strong>{materialToDelete?.description}</strong>?
                            <br /><br />
                            Esta ação não pode ser desfeita.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, gap: 1 }}>
                        <Button 
                            onClick={cancelDeleteMaterial}
                            variant="outlined"
                            sx={{ borderRadius: '12px' }}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={confirmDeleteMaterial}
                            variant="contained"
                            color="error"
                            sx={{ borderRadius: '12px' }}
                        >
                            Excluir
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Snackbar de Sucesso */}
                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={4000}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Alert 
                        onClose={handleCloseSnackbar} 
                        severity="success" 
                        variant="filled"
                        sx={{ borderRadius: '12px' }}
                    >
                        {successMessage}
                    </Alert>
                </Snackbar>
            </Box>
        </MenuContext>
    );
};

export default Material;