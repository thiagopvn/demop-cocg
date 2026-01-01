import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import {
    TextField,
    IconButton,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Popover,
    Typography,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Card,
    CardContent,
    Chip,
    InputAdornment,
    CircularProgress,
    alpha,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import VisibilityIcon from "@mui/icons-material/Visibility";
import InventoryIcon from "@mui/icons-material/Inventory";
import {
    where,
    query,
    getDocs,
    collection,
    orderBy,
    addDoc,
    updateDoc,
    doc,
    deleteDoc,
} from "firebase/firestore";
import db from "../../firebase/db";
import ViaturaDialog from "../../dialogs/ViaturaDialog";
import { verifyToken } from "../../firebase/token";

export default function Viaturas() {
    const navigate = useNavigate();
    const [critery, setCritery] = useState("");
    const [filteredViaturas, setFilteredViaturas] = useState([]);
    const [materiaisCount, setMateriaisCount] = useState({});
    const [anchorEls, setAnchorEls] = useState({});
    const [dialogSaveOpen, setDialogSaveOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [dialogEditOpen, setDialogEditOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [viaturaToDeleteId, setViaturaToDeleteId] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchUserRole = async () => {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    const decodedToken = await verifyToken(token);
                    setUserRole(decodedToken.role);
                } catch (error) {
                    console.error("Erro ao verificar token:", error);
                    setUserRole(null);
                }
            } else {
                setUserRole(null);
            }
        };

        fetchUserRole();
        // Carregar viaturas ao iniciar
        filter("");
    }, []);

    // Buscar contagem de materiais para cada viatura
    const fetchMateriaisCount = async (viaturas) => {
        const counts = {};
        const viaturaMaterialsCollection = collection(db, "viatura_materiais");

        for (const viatura of viaturas) {
            try {
                const q = query(
                    viaturaMaterialsCollection,
                    where("viatura_id", "==", viatura.id),
                    where("status", "==", "alocado")
                );
                const snapshot = await getDocs(q);
                counts[viatura.id] = snapshot.size;
            } catch {
                counts[viatura.id] = 0;
            }
        }

        setMateriaisCount(counts);
    };

    const filter = async (searchCritery) => {
        setLoading(true);
        try {
            const viaturaCollection = collection(db, "viaturas");
            let viaturas = [];

            if (searchCritery.trim()) {
                const critery_lower = searchCritery.toLowerCase();
                const start = critery_lower;
                const end = critery_lower + "\uf8ff";

                // Buscar por descricao
                const qDesc = query(
                    viaturaCollection,
                    where("description_lower", ">=", start),
                    where("description_lower", "<=", end),
                    orderBy("description_lower")
                );
                const descSnapshot = await getDocs(qDesc);
                descSnapshot.forEach((doc) => {
                    viaturas.push({ id: doc.id, ...doc.data() });
                });

                // Buscar por prefixo (se nao encontrou por descricao)
                if (viaturas.length === 0) {
                    const prefixoUpper = searchCritery.toUpperCase();
                    const qPrefixo = query(
                        viaturaCollection,
                        where("prefixo", ">=", prefixoUpper),
                        where("prefixo", "<=", prefixoUpper + "\uf8ff"),
                        orderBy("prefixo")
                    );
                    const prefixoSnapshot = await getDocs(qPrefixo);
                    prefixoSnapshot.forEach((doc) => {
                        viaturas.push({ id: doc.id, ...doc.data() });
                    });
                }
            } else {
                // Buscar todas ordenadas por prefixo
                const qAll = query(viaturaCollection, orderBy("prefixo"));
                const allSnapshot = await getDocs(qAll);
                allSnapshot.forEach((doc) => {
                    viaturas.push({ id: doc.id, ...doc.data() });
                });
            }

            setFilteredViaturas(viaturas);
            await fetchMateriaisCount(viaturas);
        } catch (error) {
            console.error("Erro ao buscar viaturas:", error);
            setFilteredViaturas([]);
        } finally {
            setLoading(false);
        }
    };

    const handleEnterKeyDown = (e) => {
        if (e.key === "Enter") {
            filter(critery);
        }
    };

    const handlePopoverOpen = (event, viaturaId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [viaturaId]: {
                anchorEl: event.currentTarget,
                open: true,
            },
        }));
    };

    const handlePopoverClose = (viaturaId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [viaturaId]: {
                anchorEl: null,
                open: false,
            },
        }));
    };

    const handleOpenSaveDialog = () => {
        if (userRole === "admin" || userRole === "editor") {
            setDialogSaveOpen(true);
        } else {
            alert("Voce nao tem permissao para adicionar viaturas.");
        }
    };

    const handleSaveViatura = async (data) => {
        const viaturaCollection = collection(db, "viaturas");

        // Verificar se prefixo ja existe
        const qPrefixo = query(
            viaturaCollection,
            where("prefixo", "==", data.prefixo.toUpperCase())
        );
        const prefixoSnapshot = await getDocs(qPrefixo);
        if (!prefixoSnapshot.empty) {
            alert("Ja existe uma viatura com este prefixo");
            return;
        }

        // Verificar se descricao ja existe
        const qDesc = query(
            viaturaCollection,
            where("description_lower", "==", data.description.toLowerCase())
        );
        const descSnapshot = await getDocs(qDesc);
        if (!descSnapshot.empty) {
            alert("Ja existe uma viatura com esta descricao");
            return;
        }

        try {
            await addDoc(viaturaCollection, {
                prefixo: data.prefixo.toUpperCase(),
                description: data.description,
                description_lower: data.description.toLowerCase(),
                created_at: new Date(),
                ultima_movimentacao: new Date(),
            });
            filter("");
            setDialogSaveOpen(false);
        } catch (error) {
            console.error("Erro ao salvar viatura:", error);
            alert("Erro ao salvar viatura");
        }
    };

    const handleDelete = (id) => {
        setViaturaToDeleteId(id);
        setDeleteDialogOpen(true);
    };

    const confirmDeleteViatura = async () => {
        if (userRole === "admin") {
            try {
                // Verificar se ha materiais alocados
                const viaturaMaterialsCollection = collection(db, "viatura_materiais");
                const q = query(
                    viaturaMaterialsCollection,
                    where("viatura_id", "==", viaturaToDeleteId),
                    where("status", "==", "alocado")
                );
                const materiaisSnapshot = await getDocs(q);

                if (!materiaisSnapshot.empty) {
                    alert("Nao e possivel excluir viatura com materiais alocados. Desaloque os materiais primeiro.");
                    setDeleteDialogOpen(false);
                    setViaturaToDeleteId(null);
                    return;
                }

                const viaturaDocRef = doc(db, "viaturas", viaturaToDeleteId);
                await deleteDoc(viaturaDocRef);
                filter("");
            } catch (error) {
                console.error("Erro ao excluir viatura:", error);
            }
        } else {
            alert("Voce nao tem permissao para deletar viaturas.");
        }
        setDeleteDialogOpen(false);
        setViaturaToDeleteId(null);
    };

    const cancelDeleteViatura = () => {
        setDeleteDialogOpen(false);
        setViaturaToDeleteId(null);
    };

    const handleOpenEditDialog = async (data) => {
        if (userRole !== "admin" && userRole !== "editor") {
            alert("Voce nao tem permissao para editar viaturas.");
            return;
        }
        setEditData(data);
        setDialogEditOpen(true);
    };

    const handleEditViatura = async (data) => {
        try {
            // Verificar se prefixo ja existe em outra viatura
            const viaturaCollection = collection(db, "viaturas");
            const qPrefixo = query(
                viaturaCollection,
                where("prefixo", "==", data.prefixo.toUpperCase())
            );
            const prefixoSnapshot = await getDocs(qPrefixo);
            const existingWithPrefixo = prefixoSnapshot.docs.find(d => d.id !== data.id);
            if (existingWithPrefixo) {
                alert("Ja existe outra viatura com este prefixo");
                return;
            }

            const viaturaDocRef = doc(db, "viaturas", data.id);
            await updateDoc(viaturaDocRef, {
                prefixo: data.prefixo.toUpperCase(),
                description: data.description,
                description_lower: data.description.toLowerCase(),
                ultima_movimentacao: new Date(),
            });
            filter("");
            setDialogEditOpen(false);
            setEditData(null);
        } catch (error) {
            console.error("Erro ao atualizar viatura:", error);
        }
    };

    const handleViewDetails = (viatura) => {
        navigate(`/viatura/${viatura.id}`);
    };

    return (
        <PrivateRoute>
            <MenuContext>
                <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh' }}>
                    {userRole === "user" && (
                        <Box
                            sx={{
                                backgroundColor: '#fff3cd',
                                color: '#856404',
                                p: 2,
                                borderRadius: 2,
                                mb: 3,
                                textAlign: 'center',
                                fontWeight: 500
                            }}
                        >
                            Voce tem permissao apenas para visualizar os registros
                        </Box>
                    )}

                    {/* Header */}
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 3,
                        flexWrap: 'wrap',
                        gap: 2
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <DirectionsCarIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                    Viaturas
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Gerenciamento de frota e materiais
                                </Typography>
                            </Box>
                        </Box>

                        {(userRole === "admin" || userRole === "editor") && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleOpenSaveDialog}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    px: 3,
                                    py: 1.5,
                                    boxShadow: 2,
                                    '&:hover': {
                                        boxShadow: 4,
                                        transform: 'translateY(-2px)'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Nova Viatura
                            </Button>
                        )}
                    </Box>

                    {/* Search */}
                    <Card sx={{ mb: 3, borderRadius: 2 }}>
                        <CardContent sx={{ p: 2 }}>
                            <TextField
                                size="small"
                                label="Pesquisar por prefixo ou descricao"
                                variant="outlined"
                                onKeyDown={handleEnterKeyDown}
                                fullWidth
                                value={critery}
                                onChange={(e) => setCritery(e.target.value)}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    }
                                }}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon color="action" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    onClick={() => filter(critery)}
                                                    sx={{ borderRadius: 1.5, textTransform: 'none' }}
                                                >
                                                    Buscar
                                                </Button>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                        </CardContent>
                    </Card>

                    {/* Table */}
                    <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        <Box sx={{
                            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}>
                            <DirectionsCarIcon sx={{ color: 'white' }} />
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                                Lista de Viaturas ({filteredViaturas.length})
                            </Typography>
                        </Box>

                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Table size="medium">
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                        <TableCell sx={{ fontWeight: 700, color: '#1565c0' }}>
                                            Prefixo
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1565c0' }}>
                                            Descricao
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1565c0', textAlign: 'center' }}>
                                            Materiais
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#1565c0', textAlign: 'center' }}>
                                            Acoes
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredViaturas.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                                                <DirectionsCarIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                                <Typography color="text.secondary">
                                                    Nenhuma viatura encontrada
                                                </Typography>
                                                <Typography variant="caption" color="text.disabled">
                                                    Clique em "Buscar" ou adicione uma nova viatura
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredViaturas.map((viatura) => (
                                            <TableRow
                                                key={viatura.id}
                                                hover
                                                sx={{
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        backgroundColor: alpha('#1976d2', 0.04)
                                                    }
                                                }}
                                                onClick={() => handleViewDetails(viatura)}
                                            >
                                                <TableCell>
                                                    <Chip
                                                        label={viatura.prefixo || 'N/A'}
                                                        color="primary"
                                                        variant="outlined"
                                                        size="small"
                                                        sx={{ fontWeight: 700, fontSize: '0.9rem' }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {viatura.description}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ textAlign: 'center' }}>
                                                    <Chip
                                                        icon={<InventoryIcon />}
                                                        label={`${materiaisCount[viatura.id] || 0} itens`}
                                                        size="small"
                                                        color={materiaisCount[viatura.id] > 0 ? "success" : "default"}
                                                        variant={materiaisCount[viatura.id] > 0 ? "filled" : "outlined"}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ textAlign: 'center' }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                                        <Tooltip title="Ver detalhes">
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewDetails(viatura);
                                                                }}
                                                                sx={{
                                                                    color: 'primary.main',
                                                                    '&:hover': { backgroundColor: alpha('#1976d2', 0.1) }
                                                                }}
                                                            >
                                                                <VisibilityIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>

                                                        <Tooltip title="Informacoes">
                                                            <IconButton
                                                                size="small"
                                                                onMouseEnter={(e) => {
                                                                    e.stopPropagation();
                                                                    handlePopoverOpen(e, viatura.id);
                                                                }}
                                                                onMouseLeave={() => handlePopoverClose(viatura.id)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                sx={{
                                                                    color: 'info.main',
                                                                    '&:hover': { backgroundColor: alpha('#0288d1', 0.1) }
                                                                }}
                                                            >
                                                                <InfoIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>

                                                        {(userRole === "admin" || userRole === "editor") && (
                                                            <>
                                                                <Tooltip title="Editar">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleOpenEditDialog(viatura);
                                                                        }}
                                                                        sx={{
                                                                            color: 'success.main',
                                                                            '&:hover': { backgroundColor: alpha('#4caf50', 0.1) }
                                                                        }}
                                                                    >
                                                                        <EditIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>

                                                                {userRole === "admin" && (
                                                                    <Tooltip title="Excluir">
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDelete(viatura.id);
                                                                            }}
                                                                            sx={{
                                                                                color: 'error.main',
                                                                                '&:hover': { backgroundColor: alpha('#f44336', 0.1) }
                                                                            }}
                                                                        >
                                                                            <DeleteIcon fontSize="small" />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                )}
                                                            </>
                                                        )}

                                                        <Popover
                                                            sx={{ pointerEvents: "none" }}
                                                            open={anchorEls[viatura.id]?.open || false}
                                                            anchorEl={anchorEls[viatura.id]?.anchorEl}
                                                            anchorOrigin={{
                                                                vertical: "bottom",
                                                                horizontal: "center",
                                                            }}
                                                            transformOrigin={{
                                                                vertical: "top",
                                                                horizontal: "center",
                                                            }}
                                                            onClose={() => handlePopoverClose(viatura.id)}
                                                            disableRestoreFocus
                                                        >
                                                            <Card sx={{ maxWidth: 300, p: 2 }}>
                                                                <Typography variant="subtitle2" color="primary.main" gutterBottom>
                                                                    {viatura.prefixo} - {viatura.description}
                                                                </Typography>
                                                                <Box sx={{ display: 'grid', gap: 0.5, mt: 1 }}>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        <strong>ID:</strong> {viatura.id}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        <strong>Materiais:</strong> {materiaisCount[viatura.id] || 0} itens
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        <strong>Criado em:</strong>{" "}
                                                                        {viatura.created_at?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        <strong>Ultima Mov.:</strong>{" "}
                                                                        {viatura.ultima_movimentacao?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}
                                                                    </Typography>
                                                                </Box>
                                                            </Card>
                                                        </Popover>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </Card>
                </Box>

                <ViaturaDialog
                    open={dialogSaveOpen}
                    onSubmit={handleSaveViatura}
                    onCancel={() => setDialogSaveOpen(false)}
                />

                {editData && (
                    <ViaturaDialog
                        open={dialogEditOpen}
                        onSubmit={handleEditViatura}
                        onCancel={() => {
                            setDialogEditOpen(false);
                            setEditData(null);
                        }}
                        editData={editData}
                    />
                )}

                <Dialog
                    open={deleteDialogOpen}
                    onClose={cancelDeleteViatura}
                    PaperProps={{ sx: { borderRadius: 2 } }}
                >
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DeleteIcon color="error" />
                        Excluir Viatura?
                    </DialogTitle>
                    <DialogContent>
                        <Typography>
                            Tem certeza que deseja excluir esta viatura? Esta acao nao pode ser desfeita.
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={cancelDeleteViatura} variant="outlined">
                            Cancelar
                        </Button>
                        <Button onClick={confirmDeleteViatura} variant="contained" color="error">
                            Excluir
                        </Button>
                    </DialogActions>
                </Dialog>
            </MenuContext>
        </PrivateRoute>
    );
}
