import { useState, useMemo, useRef, memo, useCallback } from "react";
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
    InputAdornment,
    CircularProgress,
    Box,
    Card,
    CardContent,
    Chip,
    Tooltip,
    Divider
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";
import ClearIcon from "@mui/icons-material/Clear";
import InventoryIcon from "@mui/icons-material/Inventory";
import CategoryIcon from "@mui/icons-material/Category";
import { useMaterials } from '../contexts/MaterialContext';
import { useDebounce } from '../hooks/useDebounce';

// Limite de resultados para evitar renderizar muitos itens
const MAX_RESULTS = 30;

// Componente de linha memoizado para evitar re-renders
const MaterialRow = memo(({ material, isSelected, onSelect, onPopoverOpen, onPopoverClose, isSmallScreen }) => (
    <TableRow
        hover
        onClick={() => onSelect(material)}
        sx={{
            cursor: 'pointer',
            bgcolor: isSelected ? 'action.selected' : 'inherit',
            '&:hover': { bgcolor: 'action.hover' }
        }}
    >
        <TableCell sx={{ py: 1.5 }}>
            <Typography
                variant="body2"
                fontWeight={isSelected ? 600 : 400}
                color={isSelected ? 'primary.main' : 'text.primary'}
            >
                {material.description}
            </Typography>
            {material.categoria && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <CategoryIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary">
                        {material.categoria}
                    </Typography>
                </Box>
            )}
        </TableCell>
        <TableCell sx={{ textAlign: 'center', py: 1.5 }}>
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
        </TableCell>
        {!isSmallScreen && (
            <TableCell sx={{ textAlign: 'center', py: 1.5, width: 60 }}>
                <IconButton
                    size="small"
                    onMouseEnter={(e) => onPopoverOpen(e, material)}
                    onMouseLeave={onPopoverClose}
                    onClick={(e) => e.stopPropagation()}
                >
                    <InfoIcon fontSize="small" color="primary" />
                </IconButton>
            </TableCell>
        )}
    </TableRow>
));

const MaterialSearch = ({ onSelectMaterial, selectedItem }) => {
    const { materials, loading } = useMaterials();
    const [searchTerm, setSearchTerm] = useState("");
    const [popoverData, setPopoverData] = useState({ anchorEl: null, material: null });
    const searchRef = useRef(null);
    const isSmallScreen = window.innerWidth < 900; // Evita useMediaQuery que causa re-render

    const debouncedSearchTerm = useDebounce(searchTerm, 250);

    // Filtro simplificado e otimizado
    const filteredMaterials = useMemo(() => {
        if (!debouncedSearchTerm || debouncedSearchTerm.trim().length === 0) {
            return [];
        }

        const searchLower = debouncedSearchTerm.toLowerCase().trim();
        const keywords = searchLower.split(/\s+/).filter(k => k.length > 0);

        // Filtro simples com includes - muito mais rápido que regex
        const results = [];
        for (let i = 0; i < materials.length && results.length < MAX_RESULTS; i++) {
            const material = materials[i];
            const text = `${material.description || ''} ${material.categoria || ''}`.toLowerCase();

            // Verifica se todas as palavras-chave estão presentes
            let match = true;
            for (const keyword of keywords) {
                if (!text.includes(keyword)) {
                    match = false;
                    break;
                }
            }

            if (match) {
                results.push(material);
            }
        }

        return results;
    }, [debouncedSearchTerm, materials]);

    const totalFiltered = useMemo(() => {
        if (!debouncedSearchTerm || debouncedSearchTerm.trim().length === 0) return 0;

        const searchLower = debouncedSearchTerm.toLowerCase().trim();
        const keywords = searchLower.split(/\s+/).filter(k => k.length > 0);

        let count = 0;
        for (const material of materials) {
            const text = `${material.description || ''} ${material.categoria || ''}`.toLowerCase();
            let match = true;
            for (const keyword of keywords) {
                if (!text.includes(keyword)) {
                    match = false;
                    break;
                }
            }
            if (match) count++;
        }
        return count;
    }, [debouncedSearchTerm, materials]);

    const handlePopoverOpen = useCallback((event, material) => {
        setPopoverData({ anchorEl: event.currentTarget, material });
    }, []);

    const handlePopoverClose = useCallback(() => {
        setPopoverData({ anchorEl: null, material: null });
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchTerm("");
        searchRef.current?.focus();
    }, []);

    const handleKeyDown = useCallback((event) => {
        if (event.key === 'Escape') {
            handleClearSearch();
        }
    }, [handleClearSearch]);

    return (
        <Box>
            {/* Campo de busca */}
            <Box sx={{ mb: 2 }}>
                <TextField
                    ref={searchRef}
                    size="small"
                    label="Pesquisar Material"
                    variant="outlined"
                    fullWidth
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite o código, descrição ou categoria..."
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: searchTerm && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={handleClearSearch}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                />

                {/* Stats de busca */}
                {debouncedSearchTerm && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <Chip
                            size="small"
                            label={`${filteredMaterials.length}${totalFiltered > MAX_RESULTS ? ` de ${totalFiltered}` : ''} resultado${filteredMaterials.length !== 1 ? 's' : ''}`}
                            color={filteredMaterials.length > 0 ? 'primary' : 'default'}
                            variant="outlined"
                        />
                    </Box>
                )}
            </Box>

            {/* Tabela de resultados */}
            <Card variant="outlined">
                <Table size="small">
                    <TableHead sx={{ bgcolor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <InventoryIcon fontSize="small" />
                                    Descrição
                                </Box>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600, textAlign: 'center' }}>
                                Estoque
                            </TableCell>
                            {!isSmallScreen && (
                                <TableCell sx={{ color: 'white', fontWeight: 600, textAlign: 'center', width: 60 }}>
                                    Info
                                </TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={isSmallScreen ? 2 : 3} sx={{ textAlign: 'center', py: 4 }}>
                                    <CircularProgress size={24} />
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Carregando...
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : !debouncedSearchTerm ? (
                            <TableRow>
                                <TableCell colSpan={isSmallScreen ? 2 : 3} sx={{ textAlign: 'center', py: 4 }}>
                                    <SearchIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="body1" color="text.secondary">
                                        Digite para buscar materiais
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : filteredMaterials.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isSmallScreen ? 2 : 3} sx={{ textAlign: 'center', py: 4 }}>
                                    <InventoryIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="body1" color="text.secondary">
                                        Nenhum material encontrado
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMaterials.map((material) => (
                                <MaterialRow
                                    key={material.id}
                                    material={material}
                                    isSelected={selectedItem?.id === material.id}
                                    onSelect={onSelectMaterial}
                                    onPopoverOpen={handlePopoverOpen}
                                    onPopoverClose={handlePopoverClose}
                                    isSmallScreen={isSmallScreen}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Popover único reutilizado */}
            <Popover
                sx={{ pointerEvents: "none" }}
                open={Boolean(popoverData.anchorEl)}
                anchorEl={popoverData.anchorEl}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                transformOrigin={{ vertical: "top", horizontal: "center" }}
                onClose={handlePopoverClose}
                disableRestoreFocus
            >
                {popoverData.material && (
                    <Card sx={{ maxWidth: 280, p: 1.5 }}>
                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                            <Typography variant="subtitle2" color="primary.main" gutterBottom>
                                {popoverData.material.description}
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'grid', gap: 0.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary">Categoria:</Typography>
                                    <Typography variant="caption" fontWeight={500}>
                                        {popoverData.material.categoria || 'N/A'}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary">Disponível:</Typography>
                                    <Typography
                                        variant="caption"
                                        fontWeight={500}
                                        color={popoverData.material.estoque_atual > 0 ? 'success.main' : 'error.main'}
                                    >
                                        {popoverData.material.estoque_atual || 0}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary">Total:</Typography>
                                    <Typography variant="caption" fontWeight={500}>
                                        {popoverData.material.estoque_total || 0}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                )}
            </Popover>
        </Box>
    );
};

export default MaterialSearch;