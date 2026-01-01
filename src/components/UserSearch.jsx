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
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
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

const UserSearch = ({ userCritery, onSetUserCritery, onSelectUser, selectedItem }) => {
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [anchorEls, setAnchorEls] = useState({});
    const [isFocused, setIsFocused] = useState(false);
    const [searchTerm, setSearchTerm] = useState(userCritery || "");
    const searchRef = useRef(null);
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Load all users with real-time listener
    useEffect(() => {
        const usersCollection = collection(db, "users");
        const q = query(usersCollection, orderBy("full_name_lower"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAllUsers(usersData);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao carregar usuários:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Sync local search term with parent prop
    useEffect(() => {
        if (userCritery !== undefined && userCritery !== searchTerm) {
            setSearchTerm(userCritery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userCritery]);

    // Notify parent of search term changes
    useEffect(() => {
        if (onSetUserCritery && searchTerm !== userCritery) {
            onSetUserCritery(searchTerm);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    // Filter users based on search term - NO FILTER THAT HIDES RESULTS
    const filteredUsers = useMemo(() => {
        if (!debouncedSearchTerm || debouncedSearchTerm.trim().length === 0) {
            return [];
        }

        const searchKeywords = debouncedSearchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);

        return allUsers.filter(user => {
            const userName = (user.full_name || '').toLowerCase();
            const userNameLower = (user.full_name_lower || '').toLowerCase();
            const username = (user.username || '').toLowerCase();
            const rg = (user.rg || '').toLowerCase();
            const obm = (user.OBM || '').toLowerCase();

            const searchableText = `${userName} ${userNameLower} ${username} ${rg} ${obm}`;

            return searchKeywords.every(keyword => searchableText.includes(keyword));
        });
    }, [debouncedSearchTerm, allUsers]);

    // Show all filtered results - NO SPECIAL FILTERING FOR SELECTED ITEM
    const displayUsers = filteredUsers;

    const handlePopoverOpen = (event, userId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [userId]: { anchorEl: event.currentTarget, open: true },
        }));
    };

    const handlePopoverClose = (userId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [userId]: { anchorEl: null, open: false },
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

        const totalResults = filteredUsers.length;
        const totalUsers = allUsers.length;

        return {
            results: totalResults,
            total: totalUsers,
            percentage: totalUsers > 0 ? Math.round((totalResults / totalUsers) * 100) : 0
        };
    }, [filteredUsers.length, allUsers.length, debouncedSearchTerm]);

    return (
        <Box sx={{ width: '100%' }}>
            <StyledSearchContainer>
                <StyledTextField
                    inputRef={searchRef}
                    size="small"
                    label="Pesquisar Usuario"
                    variant="outlined"
                    fullWidth
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite o nome, RG ou OBM do usuario..."
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
                                icon={<PersonIcon />}
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
                                    <PersonIcon fontSize="small" />
                                    Nome
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
                                                Carregando usuarios...
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
                                            Pesquisar Usuarios
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Digite para encontrar usuarios por nome, RG ou OBM
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                                            <Chip label="Busca em tempo real" size="small" variant="outlined" />
                                            <Chip label="Pressione Esc para limpar" size="small" variant="outlined" />
                                        </Box>
                                    </EmptyStateContainer>
                                </TableCell>
                            </TableRow>
                        ) : displayUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isSmallScreen ? 1 : 2} sx={{ p: 0 }}>
                                    <EmptyStateContainer>
                                        <PersonIcon
                                            sx={{
                                                fontSize: 48,
                                                color: 'text.disabled',
                                                mb: 2
                                            }}
                                        />
                                        <Typography variant="h6" gutterBottom>
                                            Nenhum usuario encontrado
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Nao encontramos usuarios para "{debouncedSearchTerm}"
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                                            <Chip label="Tente termos mais especificos" size="small" variant="outlined" />
                                            <Chip label="Verifique a ortografia" size="small" variant="outlined" />
                                        </Box>
                                    </EmptyStateContainer>
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayUsers.map((usuario, index) => (
                                <Fade in={true} timeout={300 + index * 50} key={usuario.id}>
                                    <StyledTableRow
                                        onClick={() => onSelectUser(usuario)}
                                        className={selectedItem?.id === usuario.id ? 'selected' : ''}
                                    >
                                        <StyledTableCell>
                                            <Box>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={selectedItem?.id === usuario.id ? 600 : 400}
                                                    color={selectedItem?.id === usuario.id ? 'primary.main' : 'text.primary'}
                                                    sx={{
                                                        lineHeight: 1.4,
                                                        wordBreak: 'break-word'
                                                    }}
                                                >
                                                    {usuario.full_name}
                                                </Typography>
                                                {usuario.OBM && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                        <BadgeIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            {usuario.OBM}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </StyledTableCell>
                                        {!isSmallScreen && (
                                            <StyledTableCell sx={{ textAlign: 'center' }}>
                                                <Tooltip title="Ver detalhes">
                                                    <IconButton
                                                        onMouseEnter={(e) => handlePopoverOpen(e, usuario.id)}
                                                        onMouseLeave={() => handlePopoverClose(usuario.id)}
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
                                                    open={anchorEls[usuario.id]?.open || false}
                                                    anchorEl={anchorEls[usuario.id]?.anchorEl}
                                                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                                                    transformOrigin={{ vertical: "top", horizontal: "center" }}
                                                    onClose={() => handlePopoverClose(usuario.id)}
                                                    disableRestoreFocus
                                                >
                                                    <Card sx={{ maxWidth: 300, p: 2 }}>
                                                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                                            <Typography variant="subtitle2" gutterBottom color="primary.main">
                                                                {usuario.full_name}
                                                            </Typography>
                                                            <Divider sx={{ my: 1 }} />
                                                            <Box sx={{ display: 'grid', gap: 1 }}>
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        ID:
                                                                    </Typography>
                                                                    <Typography variant="caption" fontWeight={500} sx={{ wordBreak: 'break-all', maxWidth: '150px', textAlign: 'right' }}>
                                                                        {usuario.id}
                                                                    </Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        Username:
                                                                    </Typography>
                                                                    <Typography variant="caption" fontWeight={500}>
                                                                        {usuario.username || 'N/A'}
                                                                    </Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        RG:
                                                                    </Typography>
                                                                    <Typography variant="caption" fontWeight={500}>
                                                                        {usuario.rg || 'N/A'}
                                                                    </Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        Telefone:
                                                                    </Typography>
                                                                    <Typography variant="caption" fontWeight={500}>
                                                                        {usuario.telefone || 'N/A'}
                                                                    </Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        OBM:
                                                                    </Typography>
                                                                    <Typography variant="caption" fontWeight={500}>
                                                                        {usuario.OBM || 'N/A'}
                                                                    </Typography>
                                                                </Box>
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

export default UserSearch;
