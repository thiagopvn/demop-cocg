import { useState, useMemo, useRef, useEffect, memo, useCallback } from "react";
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
    Divider
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";
import ClearIcon from "@mui/icons-material/Clear";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import db from "../firebase/db";
import { useDebounce } from '../hooks/useDebounce';

const MAX_RESULTS = 30;

// Componente de linha memoizado
const ViaturaRow = memo(({ viatura, isSelected, onSelect, onPopoverOpen, onPopoverClose, isSmallScreen }) => (
    <TableRow
        hover
        onClick={() => onSelect(viatura)}
        sx={{
            cursor: 'pointer',
            bgcolor: isSelected ? 'action.selected' : 'inherit',
            '&:hover': { bgcolor: 'action.hover' }
        }}
    >
        <TableCell sx={{ py: 1.5 }}>
            {viatura.prefixo && (
                <Typography variant="body2" fontWeight={600} color="primary.main">
                    {viatura.prefixo}
                </Typography>
            )}
            <Typography
                variant="body2"
                fontWeight={isSelected ? 600 : 400}
                color={isSelected ? 'primary.main' : 'text.primary'}
            >
                {viatura.description}
            </Typography>
        </TableCell>
        {!isSmallScreen && (
            <TableCell sx={{ textAlign: 'center', py: 1.5, width: 60 }}>
                <IconButton
                    size="small"
                    onMouseEnter={(e) => onPopoverOpen(e, viatura)}
                    onMouseLeave={onPopoverClose}
                    onClick={(e) => e.stopPropagation()}
                >
                    <InfoIcon fontSize="small" color="primary" />
                </IconButton>
            </TableCell>
        )}
    </TableRow>
));

const ViaturaSearch = ({ viaturaCritery, onSetViaturaCritery, onSelectViatura, selectedItem }) => {
    const [allViaturas, setAllViaturas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [popoverData, setPopoverData] = useState({ anchorEl: null, viatura: null });
    const [searchTerm, setSearchTerm] = useState(viaturaCritery || "");
    const searchRef = useRef(null);
    const isSmallScreen = window.innerWidth < 900;

    const debouncedSearchTerm = useDebounce(searchTerm, 250);

    // Carregar viaturas uma vez
    useEffect(() => {
        const viaturasCollection = collection(db, "viaturas");
        const q = query(viaturasCollection, orderBy("description_lower"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const viaturasData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAllViaturas(viaturasData);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao carregar viaturas:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Sincronizar com prop externa apenas quando necessário
    useEffect(() => {
        if (viaturaCritery !== undefined && viaturaCritery !== searchTerm) {
            setSearchTerm(viaturaCritery);
        }
    }, [viaturaCritery]);

    // Notificar parent apenas quando debounced muda
    useEffect(() => {
        if (onSetViaturaCritery && debouncedSearchTerm !== viaturaCritery) {
            onSetViaturaCritery(debouncedSearchTerm);
        }
    }, [debouncedSearchTerm]);

    // Filtro otimizado
    const filteredViaturas = useMemo(() => {
        if (!debouncedSearchTerm || debouncedSearchTerm.trim().length === 0) {
            return [];
        }

        const searchLower = debouncedSearchTerm.toLowerCase().trim();
        const keywords = searchLower.split(/\s+/).filter(k => k.length > 0);

        const results = [];
        for (let i = 0; i < allViaturas.length && results.length < MAX_RESULTS; i++) {
            const viatura = allViaturas[i];
            const text = `${viatura.description || ''} ${viatura.description_lower || ''} ${viatura.prefixo || ''}`.toLowerCase();

            let match = true;
            for (const keyword of keywords) {
                if (!text.includes(keyword)) {
                    match = false;
                    break;
                }
            }

            if (match) {
                results.push(viatura);
            }
        }

        return results;
    }, [debouncedSearchTerm, allViaturas]);

    const handlePopoverOpen = useCallback((event, viatura) => {
        setPopoverData({ anchorEl: event.currentTarget, viatura });
    }, []);

    const handlePopoverClose = useCallback(() => {
        setPopoverData({ anchorEl: null, viatura: null });
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
        <Box sx={{ width: '100%' }}>
            {/* Campo de busca */}
            <Box sx={{ mb: 2 }}>
                <TextField
                    inputRef={searchRef}
                    size="small"
                    label="Pesquisar Viatura"
                    variant="outlined"
                    fullWidth
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite o prefixo ou descrição..."
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

                {debouncedSearchTerm && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <Chip
                            size="small"
                            label={`${filteredViaturas.length} resultado${filteredViaturas.length !== 1 ? 's' : ''}`}
                            color={filteredViaturas.length > 0 ? 'primary' : 'default'}
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
                                    <DirectionsCarIcon fontSize="small" />
                                    Viatura
                                </Box>
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
                                <TableCell colSpan={isSmallScreen ? 1 : 2} sx={{ textAlign: 'center', py: 4 }}>
                                    <CircularProgress size={24} />
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Carregando...
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : !debouncedSearchTerm ? (
                            <TableRow>
                                <TableCell colSpan={isSmallScreen ? 1 : 2} sx={{ textAlign: 'center', py: 4 }}>
                                    <SearchIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="body1" color="text.secondary">
                                        Digite para buscar viaturas
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : filteredViaturas.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isSmallScreen ? 1 : 2} sx={{ textAlign: 'center', py: 4 }}>
                                    <DirectionsCarIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="body1" color="text.secondary">
                                        Nenhuma viatura encontrada
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredViaturas.map((viatura) => (
                                <ViaturaRow
                                    key={viatura.id}
                                    viatura={viatura}
                                    isSelected={selectedItem?.id === viatura.id}
                                    onSelect={onSelectViatura}
                                    onPopoverOpen={handlePopoverOpen}
                                    onPopoverClose={handlePopoverClose}
                                    isSmallScreen={isSmallScreen}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Popover único */}
            <Popover
                sx={{ pointerEvents: "none" }}
                open={Boolean(popoverData.anchorEl)}
                anchorEl={popoverData.anchorEl}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                transformOrigin={{ vertical: "top", horizontal: "center" }}
                onClose={handlePopoverClose}
                disableRestoreFocus
            >
                {popoverData.viatura && (
                    <Card sx={{ maxWidth: 280, p: 1.5 }}>
                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                            <Typography variant="subtitle2" color="primary.main" gutterBottom>
                                {popoverData.viatura.prefixo || popoverData.viatura.description}
                            </Typography>
                            {popoverData.viatura.prefixo && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {popoverData.viatura.description}
                                </Typography>
                            )}
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'grid', gap: 0.5 }}>
                                {popoverData.viatura.prefixo && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="caption" color="text.secondary">Prefixo:</Typography>
                                        <Typography variant="caption" fontWeight={600} color="primary.main">
                                            {popoverData.viatura.prefixo}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                )}
            </Popover>
        </Box>
    );
};

export default ViaturaSearch;
