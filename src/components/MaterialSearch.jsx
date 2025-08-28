import { useState, useMemo, useRef } from "react";
import {
    TextField,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    IconButton,
    Typography,
    Popover,
    styled,
    useMediaQuery,
    InputAdornment,
    CircularProgress,
    Box,
    Card,
    CardContent,
    Fade,
    Skeleton,
    Chip,
    Tooltip,
    alpha,
    Divider
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";
import ClearIcon from "@mui/icons-material/Clear";
import InventoryIcon from "@mui/icons-material/Inventory";
import CategoryIcon from "@mui/icons-material/Category";
import { useTheme } from '@mui/material/styles';
import { useMaterials } from '../contexts/MaterialContext';
import { useDebounce } from '../hooks/useDebounce';

const StyledSearchContainer = styled(Box)(({ theme }) => ({
    position: 'relative',
    marginBottom: theme.spacing(2),
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
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.04),
        transform: 'translateX(4px)',
        boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`,
    },
    '&.selected': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`,
        transform: 'translateX(4px)',
    },
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    padding: theme.spacing(2),
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
}));

const EmptyStateContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(6, 2),
    textAlign: 'center',
    color: theme.palette.text.secondary,
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(4),
    gap: theme.spacing(2),
}));

const MaterialSearch = ({ onSelectMaterial, selectedItem }) => {
    const { materials, loading } = useMaterials();
    const [searchTerm, setSearchTerm] = useState("");
    const [anchorEls, setAnchorEls] = useState({});
    const [isFocused, setIsFocused] = useState(false);
    const searchRef = useRef(null);
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // CRITICAL: Always recalculate from the complete materials list
    const filteredMaterials = useMemo(() => {
        // If search is empty, return empty array (clean table)
        if (!debouncedSearchTerm || debouncedSearchTerm.trim().length === 0) {
            return [];
        }

        // Parse search keywords
        const searchKeywords = debouncedSearchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
        
        // ALWAYS filter from the complete materials list from context
        // NEVER reference previous filteredMaterials state
        const filtered = materials.filter(material => {
            const materialDescription = (material.description || '').toLowerCase();
            const materialCategoria = (material.categoria || '').toLowerCase();
            
            // Combine searchable fields
            const searchableText = `${materialDescription} ${materialCategoria}`;
            
            // Check if ALL keywords are present
            return searchKeywords.every(keyword => searchableText.includes(keyword));
        });

        return filtered;
    }, [debouncedSearchTerm, materials]);

    // Determine what to display based on current state
    const displayMaterials = useMemo(() => {
        // If we have a selected item and it's in the filtered results, show only that
        if (selectedItem && filteredMaterials.some(m => m.id === selectedItem.id)) {
            return filteredMaterials.filter(m => m.id === selectedItem.id);
        }
        // Otherwise show all filtered results
        return filteredMaterials;
    }, [filteredMaterials, selectedItem]);

    const handlePopoverOpen = (event, materialId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [materialId]: { anchorEl: event.currentTarget, open: true },
        }));
    };

    const handlePopoverClose = (materialId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [materialId]: { anchorEl: null, open: false },
        }));
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

    // Loading skeleton rows
    const renderLoadingSkeleton = () => (
        Array.from({ length: 3 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
                <StyledTableCell>
                    <Skeleton variant="text" height={24} />
                </StyledTableCell>
                <StyledTableCell>
                    <Skeleton variant="text" height={24} width={80} />
                </StyledTableCell>
                {!isSmallScreen && (
                    <StyledTableCell>
                        <Skeleton variant="circular" width={32} height={32} />
                    </StyledTableCell>
                )}
            </TableRow>
        ))
    );

    // Search stats
    const searchStats = useMemo(() => {
        if (!debouncedSearchTerm) return null;
        
        const totalResults = filteredMaterials.length;
        const totalMaterials = materials.length;
        
        return {
            results: totalResults,
            total: totalMaterials,
            percentage: totalMaterials > 0 ? Math.round((totalResults / totalMaterials) * 100) : 0
        };
    }, [filteredMaterials.length, materials.length, debouncedSearchTerm]);

    return (
        <Box>
            <StyledSearchContainer>
                <StyledTextField
                    ref={searchRef}
                    size="small"
                    label="Pesquisar Material"
                    variant="outlined"
                    fullWidth
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite o código, descrição ou categoria do material..."
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon 
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
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </InputAdornment>
                            ),
                        },
                    }}
                />
                
                {/* Search Stats */}
                {searchStats && (
                    <Fade in={Boolean(searchStats)}>
                        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                                size="small"
                                icon={<InventoryIcon />}
                                label={`${searchStats.results} resultado${searchStats.results !== 1 ? 's' : ''}`}
                                color={searchStats.results > 0 ? 'primary' : 'default'}
                                variant={searchStats.results > 0 ? 'filled' : 'outlined'}
                            />
                            <Chip
                                size="small"
                                label={`${searchStats.percentage}% do total`}
                                variant="outlined"
                                sx={{ color: 'text.secondary' }}
                            />
                        </Box>
                    </Fade>
                )}
            </StyledSearchContainer>

            <StyledTableContainer>
                <Table size="small">
                    <StyledTableHead>
                        <TableRow>
                            <TableCell 
                                sx={{ 
                                    color: 'white', 
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <InventoryIcon fontSize="small" />
                                    Descrição
                                </Box>
                            </TableCell>
                            <TableCell 
                                sx={{ 
                                    color: 'white', 
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    letterSpacing: '0.05em',
                                    textAlign: 'center'
                                }}
                            >
                                Estoque
                            </TableCell>
                            {!isSmallScreen && (
                                <TableCell 
                                    sx={{ 
                                        color: 'white', 
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        letterSpacing: '0.05em',
                                        textAlign: 'center',
                                        width: 80
                                    }}
                                >
                                    Info
                                </TableCell>
                            )}
                        </TableRow>
                    </StyledTableHead>
                    <TableBody>
                        {loading ? (
                            <>
                                {renderLoadingSkeleton()}
                                <TableRow>
                                    <TableCell colSpan={isSmallScreen ? 2 : 3}>
                                        <LoadingContainer>
                                            <CircularProgress size={24} />
                                            <Typography variant="body2" color="text.secondary">
                                                Carregando materiais...
                                            </Typography>
                                        </LoadingContainer>
                                    </TableCell>
                                </TableRow>
                            </>
                        ) : !debouncedSearchTerm || debouncedSearchTerm.trim().length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isSmallScreen ? 2 : 3} sx={{ p: 0 }}>
                                    <EmptyStateContainer>
                                        <SearchIcon 
                                            sx={{ 
                                                fontSize: 48, 
                                                color: 'text.disabled',
                                                mb: 2
                                            }} 
                                        />
                                        <Typography variant="h6" gutterBottom>
                                            Pesquisar Materiais
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Digite para encontrar materiais por código, descrição ou categoria
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                                            <Chip label="Dica: Use múltiplas palavras" size="small" variant="outlined" />
                                            <Chip label="Pressione Esc para limpar" size="small" variant="outlined" />
                                        </Box>
                                    </EmptyStateContainer>
                                </TableCell>
                            </TableRow>
                        ) : displayMaterials.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isSmallScreen ? 2 : 3} sx={{ p: 0 }}>
                                    <EmptyStateContainer>
                                        <InventoryIcon 
                                            sx={{ 
                                                fontSize: 48, 
                                                color: 'text.disabled',
                                                mb: 2
                                            }} 
                                        />
                                        <Typography variant="h6" gutterBottom>
                                            Nenhum material encontrado
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Não encontramos materiais para "{debouncedSearchTerm}"
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                                            <Chip label="Tente termos mais específicos" size="small" variant="outlined" />
                                            <Chip label="Verifique a ortografia" size="small" variant="outlined" />
                                        </Box>
                                    </EmptyStateContainer>
                                </TableCell>
                            </TableRow>
                        ) : (
                            // RENDER ONLY the displayMaterials array
                            displayMaterials.map((material, index) => (
                                <Fade in={true} timeout={300 + index * 50} key={material.id}>
                                    <StyledTableRow
                                        onClick={() => onSelectMaterial(material)}
                                        className={selectedItem?.id === material.id ? 'selected' : ''}
                                    >
                                        <StyledTableCell>
                                            <Box>
                                                <Typography 
                                                    variant="body2" 
                                                    fontWeight={selectedItem?.id === material.id ? 600 : 400}
                                                    color={selectedItem?.id === material.id ? 'primary.main' : 'text.primary'}
                                                    sx={{ 
                                                        lineHeight: 1.4,
                                                        wordBreak: 'break-word'
                                                    }}
                                                >
                                                    {material.description}
                                                </Typography>
                                                {material.categoria && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                        <CategoryIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            {material.categoria}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </StyledTableCell>
                                        <StyledTableCell sx={{ textAlign: 'center' }}>
                                            <Typography 
                                                variant="body2" 
                                                fontWeight={500}
                                                color={material.estoque_atual > 0 ? 'success.main' : 'error.main'}
                                            >
                                                {material.estoque_atual || 0}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                de {material.estoque_total || 0}
                                            </Typography>
                                        </StyledTableCell>
                                        {!isSmallScreen && (
                                            <StyledTableCell sx={{ textAlign: 'center' }}>
                                                <Tooltip title="Ver detalhes">
                                                    <IconButton
                                                        onMouseEnter={(e) => handlePopoverOpen(e, material.id)}
                                                        onMouseLeave={() => handlePopoverClose(material.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        size="small"
                                                        sx={{
                                                            color: 'primary.main',
                                                            '&:hover': {
                                                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                            },
                                                        }}
                                                    >
                                                        <InfoIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Popover
                                                    sx={{ pointerEvents: "none" }}
                                                    open={anchorEls[material.id]?.open || false}
                                                    anchorEl={anchorEls[material.id]?.anchorEl}
                                                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                                                    transformOrigin={{ vertical: "top", horizontal: "center" }}
                                                    onClose={() => handlePopoverClose(material.id)}
                                                    disableRestoreFocus
                                                >
                                                    <Card sx={{ maxWidth: 300, p: 2 }}>
                                                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                                            <Typography variant="subtitle2" gutterBottom color="primary.main">
                                                                {material.description}
                                                            </Typography>
                                                            <Divider sx={{ my: 1 }} />
                                                            <Box sx={{ display: 'grid', gap: 1 }}>
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        ID:
                                                                    </Typography>
                                                                    <Typography variant="caption" fontWeight={500}>
                                                                        {material.id}
                                                                    </Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        Categoria:
                                                                    </Typography>
                                                                    <Typography variant="caption" fontWeight={500}>
                                                                        {material.categoria || 'N/A'}
                                                                    </Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        Disponível:
                                                                    </Typography>
                                                                    <Typography 
                                                                        variant="caption" 
                                                                        fontWeight={500}
                                                                        color={material.estoque_atual > 0 ? 'success.main' : 'error.main'}
                                                                    >
                                                                        {material.estoque_atual || 0}
                                                                    </Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        Total:
                                                                    </Typography>
                                                                    <Typography variant="caption" fontWeight={500}>
                                                                        {material.estoque_total || 0}
                                                                    </Typography>
                                                                </Box>
                                                                {material.maintenance_status && (
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            Status:
                                                                        </Typography>
                                                                        <Chip
                                                                            label={material.maintenance_status}
                                                                            size="small"
                                                                            color="primary"
                                                                            variant="outlined"
                                                                        />
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                        </CardContent>
                                                    </Card>
                                                </Popover>
                                            </StyledTableCell>
                                        )}
                                    </StyledTableRow>
                                </Fade>
                            ))
                        )}
                    </TableBody>
                </Table>
            </StyledTableContainer>
        </Box>
    );
};

export default MaterialSearch;