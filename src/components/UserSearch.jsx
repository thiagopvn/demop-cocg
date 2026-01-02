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
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import db from "../firebase/db";
import { useDebounce } from '../hooks/useDebounce';

const MAX_RESULTS = 30;

// Componente de linha memoizado
const UserRow = memo(({ user, isSelected, onSelect, onPopoverOpen, onPopoverClose, isSmallScreen }) => (
    <TableRow
        hover
        onClick={() => onSelect(user)}
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
                {user.full_name}
            </Typography>
            {user.OBM && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <BadgeIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary">
                        {user.OBM}
                    </Typography>
                </Box>
            )}
        </TableCell>
        {!isSmallScreen && (
            <TableCell sx={{ textAlign: 'center', py: 1.5, width: 60 }}>
                <IconButton
                    size="small"
                    onMouseEnter={(e) => onPopoverOpen(e, user)}
                    onMouseLeave={onPopoverClose}
                    onClick={(e) => e.stopPropagation()}
                >
                    <InfoIcon fontSize="small" color="primary" />
                </IconButton>
            </TableCell>
        )}
    </TableRow>
));

const UserSearch = ({ userCritery, onSetUserCritery, onSelectUser, selectedItem }) => {
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [popoverData, setPopoverData] = useState({ anchorEl: null, user: null });
    const [searchTerm, setSearchTerm] = useState(userCritery || "");
    const searchRef = useRef(null);
    const isSmallScreen = window.innerWidth < 900;

    const debouncedSearchTerm = useDebounce(searchTerm, 250);

    // Carregar usuários uma vez
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

    // Sincronizar com prop externa apenas quando necessário
    useEffect(() => {
        if (userCritery !== undefined && userCritery !== searchTerm) {
            setSearchTerm(userCritery);
        }
    }, [userCritery]);

    // Notificar parent apenas quando debounced muda
    useEffect(() => {
        if (onSetUserCritery && debouncedSearchTerm !== userCritery) {
            onSetUserCritery(debouncedSearchTerm);
        }
    }, [debouncedSearchTerm]);

    // Filtro otimizado
    const filteredUsers = useMemo(() => {
        if (!debouncedSearchTerm || debouncedSearchTerm.trim().length === 0) {
            return [];
        }

        const searchLower = debouncedSearchTerm.toLowerCase().trim();
        const keywords = searchLower.split(/\s+/).filter(k => k.length > 0);

        const results = [];
        for (let i = 0; i < allUsers.length && results.length < MAX_RESULTS; i++) {
            const user = allUsers[i];
            const text = `${user.full_name || ''} ${user.full_name_lower || ''} ${user.username || ''} ${user.rg || ''} ${user.OBM || ''}`.toLowerCase();

            let match = true;
            for (const keyword of keywords) {
                if (!text.includes(keyword)) {
                    match = false;
                    break;
                }
            }

            if (match) {
                results.push(user);
            }
        }

        return results;
    }, [debouncedSearchTerm, allUsers]);

    const handlePopoverOpen = useCallback((event, user) => {
        setPopoverData({ anchorEl: event.currentTarget, user });
    }, []);

    const handlePopoverClose = useCallback(() => {
        setPopoverData({ anchorEl: null, user: null });
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
                    label="Pesquisar Usuário"
                    variant="outlined"
                    fullWidth
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite o nome, RG ou OBM..."
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
                            label={`${filteredUsers.length} resultado${filteredUsers.length !== 1 ? 's' : ''}`}
                            color={filteredUsers.length > 0 ? 'primary' : 'default'}
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
                                    <PersonIcon fontSize="small" />
                                    Nome
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
                                        Digite para buscar usuários
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isSmallScreen ? 1 : 2} sx={{ textAlign: 'center', py: 4 }}>
                                    <PersonIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="body1" color="text.secondary">
                                        Nenhum usuário encontrado
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <UserRow
                                    key={user.id}
                                    user={user}
                                    isSelected={selectedItem?.id === user.id}
                                    onSelect={onSelectUser}
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
                {popoverData.user && (
                    <Card sx={{ maxWidth: 280, p: 1.5 }}>
                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                            <Typography variant="subtitle2" color="primary.main" gutterBottom>
                                {popoverData.user.full_name}
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'grid', gap: 0.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary">RG:</Typography>
                                    <Typography variant="caption" fontWeight={500}>
                                        {popoverData.user.rg || 'N/A'}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary">Telefone:</Typography>
                                    <Typography variant="caption" fontWeight={500}>
                                        {popoverData.user.telefone || 'N/A'}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary">OBM:</Typography>
                                    <Typography variant="caption" fontWeight={500}>
                                        {popoverData.user.OBM || 'N/A'}
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

export default UserSearch;
