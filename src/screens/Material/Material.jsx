import { useState, useMemo, useRef } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableRow, 
    IconButton, 
    CircularProgress,
    TextField,
    InputAdornment,
    Chip,
    Card,
    Fade,
    Skeleton,
    Tooltip,
    alpha,
    styled
} from '@mui/material';
import { 
    Add, 
    Edit, 
    Delete,
    Search,
    Clear,
    Inventory,
    Warning
} from '@mui/icons-material';
import MenuContext from '../../contexts/MenuContext';
import { useMaterials } from '../../contexts/MaterialContext';
import { useDebounce } from '../../hooks/useDebounce';
import MaterialDialog from '../../dialogs/MaterialDialog';
import { deleteDoc, doc } from 'firebase/firestore';
import db from '../../firebase/db';
import { useTheme } from '@mui/material/styles';

const StyledHeader = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2, 0),
    [theme.breakpoints.down('sm')]: {
        flexDirection: 'column',
        gap: theme.spacing(2),
        alignItems: 'stretch',
    },
}));

const StyledSearchContainer = styled(Box)(({ theme }) => ({
    position: 'relative',
    marginBottom: theme.spacing(3),
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
    '& .MuiOutlinedInput-root': {
        backgroundColor: theme.palette.background.paper,
        borderRadius: theme.spacing(1.5),
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
            '& .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(theme.palette.primary.main, 0.3),
            },
        },
        '&.Mui-focused': {
            boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
            '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
                borderWidth: 2,
            },
        },
    },
    '& .MuiInputLabel-root': {
        color: theme.palette.text.secondary,
        '&.Mui-focused': {
            color: theme.palette.primary.main,
        },
    },
}));

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
        transform: 'translateX(2px)',
        boxShadow: `inset 3px 0 0 ${theme.palette.primary.main}`,
    },
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
    padding: theme.spacing(1.5, 2),
}));

const StatsContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
    [theme.breakpoints.down('sm')]: {
        flexDirection: 'column',
        gap: theme.spacing(1),
    },
}));

const StatCard = styled(Card)(({ theme }) => ({
    padding: theme.spacing(2),
    borderRadius: theme.spacing(1.5),
    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[4],
        borderColor: alpha(theme.palette.primary.main, 0.3),
    },
}));

const Material = () => {
    const { materials, loading } = useMaterials();
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const searchRef = useRef(null);
    const theme = useTheme();

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

    const handleClearSearch = () => {
        setSearchTerm("");
        if (searchRef.current) {
            searchRef.current.focus();
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            handleClearSearch();
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

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // CRITICAL: Always recalculate from the complete materials list
    const filteredMaterials = useMemo(() => {
        // If search is empty, return complete list
        if (!debouncedSearchTerm || debouncedSearchTerm.trim().length === 0) {
            return materials;
        }

        // Parse search keywords
        const searchWords = debouncedSearchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
        
        // ALWAYS filter from the complete materials list from context
        // NEVER reference previous filteredMaterials state
        const filtered = materials.filter(material => {
            const description = material.description?.toLowerCase() || '';
            const categoria = material.categoria?.toLowerCase() || '';
            const searchableText = `${description} ${categoria}`;
            
            // Check if ALL keywords are present
            return searchWords.every(word => searchableText.includes(word));
        });

        return filtered;
    }, [materials, debouncedSearchTerm]); // Dependencies: only materials and debouncedSearchTerm

    // Statistics
    const stats = useMemo(() => {
        const totalMaterials = materials.length;
        const filteredCount = filteredMaterials.length;
        const lowStock = materials.filter(m => (m.estoque_atual || 0) <= 5).length;
        const outOfStock = materials.filter(m => (m.estoque_atual || 0) === 0).length;
        
        return {
            total: totalMaterials,
            filtered: filteredCount,
            lowStock,
            outOfStock,
            showing: debouncedSearchTerm ? filteredCount : totalMaterials
        };
    }, [materials, filteredMaterials, debouncedSearchTerm]);

    // Loading skeleton rows
    const renderLoadingSkeleton = () => (
        Array.from({ length: 5 }).map((_, index) => (
            <StyledTableRow key={`skeleton-${index}`}>
                <StyledTableCell>
                    <Skeleton variant="text" height={20} />
                </StyledTableCell>
                <StyledTableCell>
                    <Skeleton variant="text" height={20} width={80} />
                </StyledTableCell>
                <StyledTableCell>
                    <Skeleton variant="text" height={20} width={60} />
                </StyledTableCell>
                <StyledTableCell>
                    <Skeleton variant="rectangular" height={24} width={80} />
                </StyledTableCell>
                <StyledTableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Skeleton variant="circular" width={32} height={32} />
                        <Skeleton variant="circular" width={32} height={32} />
                    </Box>
                </StyledTableCell>
            </StyledTableRow>
        ))
    );

    return (
        <MenuContext>
            <Box sx={{ p: 3 }}>
                <StyledHeader>
                    <Box>
                        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
                            Gestão de Materiais
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Gerencie o inventário completo de materiais e equipamentos
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => handleOpenDialog()}
                        sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                            py: 1.5,
                            boxShadow: 2,
                            '&:hover': {
                                boxShadow: 4,
                                transform: 'translateY(-2px)',
                            },
                        }}
                    >
                        Novo Material
                    </Button>
                </StyledHeader>

                {/* Statistics Cards */}
                <StatsContainer>
                    <StatCard sx={{ flex: 1, minWidth: 200 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ 
                                p: 1.5, 
                                borderRadius: 2, 
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                color: 'primary.main'
                            }}>
                                <Inventory />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight={600} color="primary.main">
                                    {stats.showing}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {debouncedSearchTerm ? 'Resultados' : 'Total de Materiais'}
                                </Typography>
                            </Box>
                        </Box>
                    </StatCard>
                    
                    {stats.lowStock > 0 && (
                        <StatCard sx={{ flex: 1, minWidth: 200 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ 
                                    p: 1.5, 
                                    borderRadius: 2, 
                                    backgroundColor: alpha(theme.palette.warning.main, 0.1),
                                    color: 'warning.main'
                                }}>
                                    <Warning />
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={600} color="warning.main">
                                        {stats.lowStock}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Estoque Baixo
                                    </Typography>
                                </Box>
                            </Box>
                        </StatCard>
                    )}
                </StatsContainer>

                <StyledSearchContainer>
                    <StyledTextField
                        ref={searchRef}
                        fullWidth
                        variant="outlined"
                        label="Pesquisar materiais"
                        placeholder="Digite descrição, categoria ou código do material..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={handleKeyDown}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search 
                                            sx={{ 
                                                color: isFocused ? 'primary.main' : 'text.secondary',
                                                transition: 'color 0.2s ease-in-out'
                                            }} 
                                        />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm && (
                                    <InputAdornment position="end">
                                        <Tooltip title="Limpar busca (Esc)">
                                            <IconButton
                                                size="small"
                                                onClick={handleClearSearch}
                                                sx={{
                                                    color: 'text.secondary',
                                                    '&:hover': {
                                                        color: 'primary.main',
                                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                    },
                                                }}
                                            >
                                                <Clear fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                    
                    {/* Search Results Info */}
                    {debouncedSearchTerm && (
                        <Fade in={Boolean(debouncedSearchTerm)}>
                            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                    size="small"
                                    icon={<Inventory />}
                                    label={`${stats.filtered} resultado${stats.filtered !== 1 ? 's' : ''} encontrado${stats.filtered !== 1 ? 's' : ''}`}
                                    color={stats.filtered > 0 ? 'primary' : 'default'}
                                    variant={stats.filtered > 0 ? 'filled' : 'outlined'}
                                />
                                <Chip
                                    size="small"
                                    label={`"${debouncedSearchTerm}"`}
                                    variant="outlined"
                                    onDelete={handleClearSearch}
                                    deleteIcon={<Clear fontSize="small" />}
                                    sx={{ color: 'text.secondary' }}
                                />
                            </Box>
                        </Fade>
                    )}
                </StyledSearchContainer>
                
                <StyledTableContainer>
                    <Table>
                        <StyledTableHead>
                            <TableRow>
                                <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Inventory fontSize="small" />
                                        Descrição
                                    </Box>
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                                    Categoria
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>
                                    Estoque (Disp./Total)
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>
                                    Status
                                </TableCell>
                                <TableCell align="right" sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                                    Ações
                                </TableCell>
                            </TableRow>
                        </StyledTableHead>
                        <TableBody>
                            {loading ? (
                                <>
                                    {renderLoadingSkeleton()}
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                                <CircularProgress size={24} />
                                                <Typography variant="body2" color="text.secondary">
                                                    Carregando materiais...
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                </>
                            ) : filteredMaterials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                            <Inventory sx={{ fontSize: 48, color: 'text.disabled' }} />
                                            <Typography variant="h6" color="text.secondary">
                                                {debouncedSearchTerm ? 'Nenhum material encontrado' : 'Nenhum material cadastrado'}
                                            </Typography>
                                            <Typography variant="body2" color="text.disabled">
                                                {debouncedSearchTerm 
                                                    ? `Não encontramos materiais para "${debouncedSearchTerm}"`
                                                    : 'Comece adicionando um novo material ao sistema'
                                                }
                                            </Typography>
                                            {!debouncedSearchTerm && (
                                                <Button
                                                    variant="contained"
                                                    startIcon={<Add />}
                                                    onClick={() => handleOpenDialog()}
                                                    sx={{ mt: 2 }}
                                                >
                                                    Adicionar Primeiro Material
                                                </Button>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMaterials.map((material, index) => (
                                    <Fade in={true} timeout={300 + index * 30} key={material.id}>
                                        <StyledTableRow hover>
                                            <StyledTableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.4 }}>
                                                    {material.description}
                                                </Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {material.categoria || '-'}
                                                </Typography>
                                            </StyledTableCell>
                                            <StyledTableCell align="center">
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <Typography 
                                                        variant="body2" 
                                                        fontWeight={600}
                                                        color={material.estoque_atual > 0 ? 'success.main' : 'error.main'}
                                                    >
                                                        {material.estoque_atual || 0}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        de {material.estoque_total || 0}
                                                    </Typography>
                                                </Box>
                                            </StyledTableCell>
                                            <StyledTableCell align="center">
                                                <Chip
                                                    label={getMaintenanceStatusLabel(material.maintenance_status)}
                                                    color={getMaintenanceStatusColor(material.maintenance_status)}
                                                    size="small"
                                                    sx={{ minWidth: 90 }}
                                                />
                                            </StyledTableCell>
                                            <StyledTableCell align="right">
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <Tooltip title="Editar Material">
                                                        <IconButton 
                                                            onClick={() => handleOpenDialog(material)} 
                                                            color="primary"
                                                            size="small"
                                                            sx={{
                                                                '&:hover': {
                                                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                                },
                                                            }}
                                                        >
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Excluir Material">
                                                        <IconButton 
                                                            onClick={() => handleDeleteMaterial(material.id)}
                                                            color="error"
                                                            size="small"
                                                            sx={{
                                                                '&:hover': {
                                                                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                                                                },
                                                            }}
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </StyledTableCell>
                                        </StyledTableRow>
                                    </Fade>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </StyledTableContainer>
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