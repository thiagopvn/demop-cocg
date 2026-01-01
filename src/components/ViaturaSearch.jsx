import { useState, useMemo, useRef, useEffect } from "react";
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
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import db from "../firebase/db";
import { useTheme } from '@mui/material/styles';
import { useDebounce } from '../hooks/useDebounce';

// Styled Components
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

const ViaturaSearch = ({ viaturaCritery, onSetViaturaCritery, onSelectViatura, selectedItem }) => {
    const [allViaturas, setAllViaturas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [anchorEls, setAnchorEls] = useState({});
    const [isFocused, setIsFocused] = useState(false);
    const [searchTerm, setSearchTerm] = useState(viaturaCritery || "");
    const searchRef = useRef(null);
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Load all viaturas with real-time listener
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

    // Sync local search term with parent prop
    useEffect(() => {
        if (viaturaCritery !== undefined && viaturaCritery !== searchTerm) {
            setSearchTerm(viaturaCritery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viaturaCritery]);

    // Notify parent of search term changes
    useEffect(() => {
        if (onSetViaturaCritery && searchTerm !== viaturaCritery) {
            onSetViaturaCritery(searchTerm);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    // Filter viaturas based on search term - NO FILTER THAT HIDES RESULTS
    const filteredViaturas = useMemo(() => {
        if (!debouncedSearchTerm || debouncedSearchTerm.trim().length === 0) {
            return [];
        }

        const searchKeywords = debouncedSearchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);

        return allViaturas.filter(viatura => {
            const description = (viatura.description || '').toLowerCase();
            const descriptionLower = (viatura.description_lower || '').toLowerCase();
            const prefixo = (viatura.prefixo || '').toLowerCase();

            const searchableText = `${description} ${descriptionLower} ${prefixo}`;

            return searchKeywords.every(keyword => searchableText.includes(keyword));
        });
    }, [debouncedSearchTerm, allViaturas]);

    // Show all filtered results - NO SPECIAL FILTERING FOR SELECTED ITEM
    const displayViaturas = filteredViaturas;

    const handlePopoverOpen = (event, viaturaId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [viaturaId]: { anchorEl: event.currentTarget, open: true },
        }));
    };

    const handlePopoverClose = (viaturaId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [viaturaId]: { anchorEl: null, open: false },
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

    // Loading skeleton
    const renderLoadingSkeleton = () => (
        Array.from({ length: 3 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
                <StyledTableCell>
                    <Skeleton variant="text" height={24} />
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

        const totalResults = filteredViaturas.length;
        const totalViaturas = allViaturas.length;

        return {
            results: totalResults,
            total: totalViaturas,
            percentage: totalViaturas > 0 ? Math.round((totalResults / totalViaturas) * 100) : 0
        };
    }, [filteredViaturas.length, allViaturas.length, debouncedSearchTerm]);

    return (
        <Box sx={{ width: '100%' }}>
            <StyledSearchContainer>
                <StyledTextField
                    inputRef={searchRef}
                    size="small"
                    label="Pesquisar Viatura"
                    variant="outlined"
                    fullWidth
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite o prefixo ou descricao da viatura..."
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
                                icon={<DirectionsCarIcon />}
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
                                    <DirectionsCarIcon fontSize="small" />
                                    Descricao
                                </Box>
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
                                    <TableCell colSpan={isSmallScreen ? 1 : 2}>
                                        <LoadingContainer>
                                            <CircularProgress size={24} />
                                            <Typography variant="body2" color="text.secondary">
                                                Carregando viaturas...
                                            </Typography>
                                        </LoadingContainer>
                                    </TableCell>
                                </TableRow>
                            </>
                        ) : !debouncedSearchTerm || debouncedSearchTerm.trim().length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isSmallScreen ? 1 : 2} sx={{ p: 0 }}>
                                    <EmptyStateContainer>
                                        <SearchIcon
                                            sx={{
                                                fontSize: 48,
                                                color: 'text.disabled',
                                                mb: 2
                                            }}
                                        />
                                        <Typography variant="h6" gutterBottom>
                                            Pesquisar Viaturas
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Digite para encontrar viaturas por prefixo ou descricao
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                                            <Chip label="Busca em tempo real" size="small" variant="outlined" />
                                            <Chip label="Pressione Esc para limpar" size="small" variant="outlined" />
                                        </Box>
                                    </EmptyStateContainer>
                                </TableCell>
                            </TableRow>
                        ) : displayViaturas.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isSmallScreen ? 1 : 2} sx={{ p: 0 }}>
                                    <EmptyStateContainer>
                                        <DirectionsCarIcon
                                            sx={{
                                                fontSize: 48,
                                                color: 'text.disabled',
                                                mb: 2
                                            }}
                                        />
                                        <Typography variant="h6" gutterBottom>
                                            Nenhuma viatura encontrada
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Nao encontramos viaturas para "{debouncedSearchTerm}"
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                                            <Chip label="Tente termos mais especificos" size="small" variant="outlined" />
                                            <Chip label="Verifique a ortografia" size="small" variant="outlined" />
                                        </Box>
                                    </EmptyStateContainer>
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayViaturas.map((viatura, index) => (
                                <Fade in={true} timeout={300 + index * 50} key={viatura.id}>
                                    <StyledTableRow
                                        onClick={() => onSelectViatura(viatura)}
                                        className={selectedItem?.id === viatura.id ? 'selected' : ''}
                                    >
                                        <StyledTableCell>
                                            <Box>
                                                {viatura.prefixo && (
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={600}
                                                        color="primary.main"
                                                        sx={{ lineHeight: 1.4 }}
                                                    >
                                                        {viatura.prefixo}
                                                    </Typography>
                                                )}
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={selectedItem?.id === viatura.id ? 600 : 400}
                                                    color={selectedItem?.id === viatura.id ? 'primary.main' : 'text.primary'}
                                                    sx={{
                                                        lineHeight: 1.4,
                                                        wordBreak: 'break-word'
                                                    }}
                                                >
                                                    {viatura.description}
                                                </Typography>
                                            </Box>
                                        </StyledTableCell>
                                        {!isSmallScreen && (
                                            <StyledTableCell sx={{ textAlign: 'center' }}>
                                                <Tooltip title="Ver detalhes">
                                                    <IconButton
                                                        onMouseEnter={(e) => handlePopoverOpen(e, viatura.id)}
                                                        onMouseLeave={() => handlePopoverClose(viatura.id)}
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
                                                    open={anchorEls[viatura.id]?.open || false}
                                                    anchorEl={anchorEls[viatura.id]?.anchorEl}
                                                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                                                    transformOrigin={{ vertical: "top", horizontal: "center" }}
                                                    onClose={() => handlePopoverClose(viatura.id)}
                                                    disableRestoreFocus
                                                >
                                                    <Card sx={{ maxWidth: 300, p: 2 }}>
                                                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                                            <Typography variant="subtitle2" gutterBottom color="primary.main">
                                                                {viatura.prefixo || viatura.description}
                                                            </Typography>
                                                            {viatura.prefixo && (
                                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                                                    {viatura.description}
                                                                </Typography>
                                                            )}
                                                            <Divider sx={{ my: 1 }} />
                                                            <Box sx={{ display: 'grid', gap: 1 }}>
                                                                {viatura.prefixo && (
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            Prefixo:
                                                                        </Typography>
                                                                        <Typography variant="caption" fontWeight={600} color="primary.main">
                                                                            {viatura.prefixo}
                                                                        </Typography>
                                                                    </Box>
                                                                )}
                                                                {viatura.created_at && (
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            Criado em:
                                                                        </Typography>
                                                                        <Typography variant="caption" fontWeight={500}>
                                                                            {new Date(viatura.created_at.toDate()).toLocaleString()}
                                                                        </Typography>
                                                                    </Box>
                                                                )}
                                                                {viatura.ultima_movimentacao && (
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            Ultima Mov.:
                                                                        </Typography>
                                                                        <Typography variant="caption" fontWeight={500}>
                                                                            {new Date(viatura.ultima_movimentacao.toDate()).toLocaleString()}
                                                                        </Typography>
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

export default ViaturaSearch;
