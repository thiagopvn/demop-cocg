import { useState } from 'react';
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
    CircularProgress,
    TextField,
    InputAdornment,
    Chip
} from '@mui/material';
import { 
    Add, 
    Edit, 
    Delete,
    Search
} from '@mui/icons-material';
import MenuContext from '../../contexts/MenuContext';
import { useMaterials } from '../../contexts/MaterialContext';
import MaterialDialog from '../../dialogs/MaterialDialog';
import { deleteDoc, doc } from 'firebase/firestore';
import db from '../../firebase/db';

const Material = () => {
    const { materials, loading } = useMaterials();
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleOpenDialog = (material = null) => {
        setSelectedMaterial(material);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedMaterial(null);
    };

    const handleDeleteMaterial = async (materialId) => {
        if (window.confirm('Tem certeza que deseja excluir este material?')) {
            try {
                await deleteDoc(doc(db, 'materials', materialId));
            } catch (error) {
                console.error('Erro ao excluir material:', error);
                alert('Erro ao excluir material');
            }
        }
    };

    const getMaintenanceStatusColor = (status) => {
        switch (status) {
            case 'operante':
                return 'success';
            case 'em_manutencao':
                return 'warning';
            case 'inoperante':
                return 'error';
            default:
                return 'default';
        }
    };

    const getMaintenanceStatusLabel = (status) => {
        switch (status) {
            case 'operante':
                return 'Operante';
            case 'em_manutencao':
                return 'Em Manutenção';
            case 'inoperante':
                return 'Inoperante';
            default:
                return 'Desconhecido';
        }
    };

    const filteredMaterials = materials.filter(material =>
        material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <MenuContext>
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" gutterBottom>
                        Gestão de Materiais
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => handleOpenDialog()}
                        sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600
                        }}
                    >
                        Novo Material
                    </Button>
                </Box>

                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Pesquisar por descrição ou categoria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ mb: 3 }}
                />
                
                <TableContainer component={Paper} elevation={2}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: 'primary.main' }}>
                                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Descrição</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Categoria</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Estoque (Disp./Total)</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                                <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : filteredMaterials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography variant="body2" color="text.secondary">
                                            Nenhum material encontrado
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMaterials.map((material) => (
                                    <TableRow key={material.id} hover>
                                        <TableCell>{material.description}</TableCell>
                                        <TableCell>{material.categoria}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {material.estoque_atual || 0} / {material.estoque_total || 0}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={getMaintenanceStatusLabel(material.maintenance_status)}
                                                color={getMaintenanceStatusColor(material.maintenance_status)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton 
                                                onClick={() => handleOpenDialog(material)} 
                                                color="primary"
                                                size="small"
                                                title="Editar Material"
                                            >
                                                <Edit />
                                            </IconButton>
                                            <IconButton 
                                                onClick={() => handleDeleteMaterial(material.id)}
                                                color="error"
                                                size="small"
                                                title="Excluir Material"
                                            >
                                                <Delete />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
            
            <MaterialDialog
                open={openDialog}
                onClose={handleCloseDialog}
                material={selectedMaterial}
            />
        </MenuContext>
    );
};

export default Material;