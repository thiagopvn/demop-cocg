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
    LinearProgress
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
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import db from '../../firebase/db';
import { MenuContext } from '../../contexts/MenuContext';
import MaintenanceDialog from '../../dialogs/MaintenanceDialog';

const Material = () => {
    const [materials, setMaterials] = useState([]);
    const [filteredMaterials, setFilteredMaterials] = useState([]);
    const [openMaintenanceDialog, setOpenMaintenanceDialog] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [maintenanceFilter, setMaintenanceFilter] = useState('todos'); // todos, operante, em_manutencao, inoperante

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
                                                <IconButton size="small" color="error">
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
            </Box>
        </MenuContext>
    );
};

export default Material;