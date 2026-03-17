import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Button,
    IconButton,
    Tooltip,
    Chip,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    Snackbar,
    Fab,
    alpha,
    Divider,
    Paper,
    InputAdornment,
    TableSortLabel,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import AddIcon from "@mui/icons-material/Add";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import EditIcon from "@mui/icons-material/Edit";
import InventoryIcon from "@mui/icons-material/Inventory";
import CategoryIcon from "@mui/icons-material/Category";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FilterListIcon from "@mui/icons-material/FilterList";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    serverTimestamp,
    onSnapshot,
} from "firebase/firestore";
import db from "../../firebase/db";
import { verifyToken } from "../../firebase/token";
import MaterialSearch from "../../components/MaterialSearch";
import { useDebounce } from "../../hooks/useDebounce";
import excelIcon from "../../assets/excel.svg";
import { exportarMovimentacoes } from "../../firebase/xlsx";
import ConferenciaViaturaDialog from "../../dialogs/ConferenciaViaturaDialog";

export default function ViaturaDetalhes() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [viatura, setViatura] = useState(null);
    const [materiaisAlocados, setMateriaisAlocados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userName, setUserName] = useState(null);

    // Search & filter
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState("todos");
    const searchRef = useRef(null);
    const debouncedSearch = useDebounce(searchTerm, 250);

    // Dialog states
    const [alocarDialogOpen, setAlocarDialogOpen] = useState(false);
    const [desalocarDialogOpen, setDesalocarDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [quantidade, setQuantidade] = useState(1);
    const [materialToDesalocar, setMaterialToDesalocar] = useState(null);
    const [materialToEdit, setMaterialToEdit] = useState(null);
    const [editQuantidade, setEditQuantidade] = useState(0);
    const [motivoDesalocacao, setMotivoDesalocacao] = useState("");

    // Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

    // Conferência
    const [conferenciaDialogOpen, setConferenciaDialogOpen] = useState(false);

    // Ordenação por coluna
    const [sortField, setSortField] = useState('material_description');
    const [sortDirection, setSortDirection] = useState('asc');

    const [sortMenuAnchor, setSortMenuAnchor] = useState(null);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleSortMenu = (field, direction) => {
        setSortField(field);
        setSortDirection(direction);
        setSortMenuAnchor(null);
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    const decodedToken = await verifyToken(token);
                    setUserRole(decodedToken.role);
                    setUserId(decodedToken.userId);
                    const userDoc = await getDoc(doc(db, "users", decodedToken.userId));
                    if (userDoc.exists()) {
                        setUserName(userDoc.data().full_name || userDoc.data().username);
                    }
                } catch (error) {
                    console.error("Erro ao verificar token:", error);
                }
            }
        };
        fetchUserData();
    }, []);

    // Buscar dados da viatura
    useEffect(() => {
        const fetchViatura = async () => {
            try {
                const viaturaDoc = await getDoc(doc(db, "viaturas", id));
                if (viaturaDoc.exists()) {
                    setViatura({ id: viaturaDoc.id, ...viaturaDoc.data() });
                } else {
                    setSnackbar({ open: true, message: "Viatura nao encontrada", severity: "error" });
                    navigate("/viaturas");
                }
            } catch (error) {
                console.error("Erro ao buscar viatura:", error);
                setSnackbar({ open: true, message: "Erro ao carregar viatura", severity: "error" });
            }
        };
        if (id) fetchViatura();
    }, [id, navigate]);

    // Listener em tempo real para materiais alocados
    useEffect(() => {
        if (!id) return;
        const q = query(
            collection(db, "viatura_materiais"),
            where("viatura_id", "==", id),
            where("status", "==", "alocado")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const materiais = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setMateriaisAlocados(materiais);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao buscar materiais:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [id]);

    // Categorias unicas para filtros
    const categorias = useMemo(() => {
        const cats = new Set();
        materiaisAlocados.forEach(m => {
            if (m.categoria) cats.add(m.categoria);
        });
        return Array.from(cats).sort();
    }, [materiaisAlocados]);

    // Materiais filtrados, buscados e ordenados
    const materiaisFiltrados = useMemo(() => {
        let result = [...materiaisAlocados];

        // Filtro por categoria
        if (activeFilter !== "todos") {
            result = result.filter(m => m.categoria === activeFilter);
        }

        // Busca por texto
        if (debouncedSearch.trim()) {
            const terms = debouncedSearch.toLowerCase().trim().split(/\s+/);
            result = result.filter(m => {
                const text = `${m.material_description || ''} ${m.categoria || ''}`.toLowerCase();
                return terms.every(t => text.includes(t));
            });
        }

        const dir = sortDirection === 'asc' ? 1 : -1;
        result.sort((a, b) => {
            switch (sortField) {
                case 'material_description':
                    return dir * (a.material_description || '').localeCompare(b.material_description || '', 'pt-BR');
                case 'categoria':
                    return dir * (a.categoria || '').localeCompare(b.categoria || '', 'pt-BR');
                case 'quantidade':
                    return dir * ((a.quantidade || 0) - (b.quantidade || 0));
                case 'data_alocacao': {
                    const dateA = a.data_alocacao?.toDate?.() || new Date(0);
                    const dateB = b.data_alocacao?.toDate?.() || new Date(0);
                    return dir * (dateA - dateB);
                }
                case 'conferencia': {
                    const dateA = a.ultima_atualizacao?.toDate?.() || a.data_alocacao?.toDate?.() || new Date(0);
                    const dateB = b.ultima_atualizacao?.toDate?.() || b.data_alocacao?.toDate?.() || new Date(0);
                    return dir * (dateA - dateB);
                }
                default:
                    return 0;
            }
        });

        return result;
    }, [materiaisAlocados, activeFilter, debouncedSearch, sortField, sortDirection]);

    // Quantidade total alocada
    const totalQuantidade = useMemo(() =>
        materiaisFiltrados.reduce((sum, m) => sum + (m.quantidade || 0), 0),
        [materiaisFiltrados]
    );

    // Alocar material na viatura
    const handleAlocarMaterial = async () => {
        if (!selectedMaterial) {
            setSnackbar({ open: true, message: "Selecione um material", severity: "warning" });
            return;
        }
        if (quantidade <= 0) {
            setSnackbar({ open: true, message: "Quantidade deve ser maior que zero", severity: "warning" });
            return;
        }
        if (quantidade > selectedMaterial.estoque_atual) {
            setSnackbar({ open: true, message: "Quantidade maior que o estoque disponivel", severity: "error" });
            return;
        }

        try {
            const existingQuery = query(
                collection(db, "viatura_materiais"),
                where("viatura_id", "==", id),
                where("material_id", "==", selectedMaterial.id),
                where("status", "==", "alocado")
            );
            const existingDocs = await getDocs(existingQuery);

            if (!existingDocs.empty) {
                const existingDoc = existingDocs.docs[0];
                const existingData = existingDoc.data();
                await updateDoc(doc(db, "viatura_materiais", existingDoc.id), {
                    quantidade: existingData.quantidade + quantidade,
                    ultima_atualizacao: serverTimestamp(),
                    atualizado_por: userId,
                    atualizado_por_nome: userName,
                });
            } else {
                await addDoc(collection(db, "viatura_materiais"), {
                    viatura_id: id,
                    viatura_prefixo: viatura.prefixo,
                    viatura_description: viatura.description,
                    material_id: selectedMaterial.id,
                    material_description: selectedMaterial.description,
                    categoria: selectedMaterial.categoria || "",
                    quantidade: quantidade,
                    data_alocacao: serverTimestamp(),
                    alocado_por: userId,
                    alocado_por_nome: userName,
                    status: "alocado",
                });
            }

            // Atualizar estoque do material
            const materialRef = doc(db, "materials", selectedMaterial.id);
            const materialDoc = await getDoc(materialRef);
            if (materialDoc.exists()) {
                const materialData = materialDoc.data();
                await updateDoc(materialRef, {
                    estoque_atual: (materialData.estoque_atual || 0) - quantidade,
                    estoque_viatura: (materialData.estoque_viatura || 0) + quantidade,
                    ultima_movimentacao: serverTimestamp(),
                });
            }

            await updateDoc(doc(db, "viaturas", id), { ultima_movimentacao: serverTimestamp() });

            setSnackbar({ open: true, message: "Material alocado com sucesso!", severity: "success" });
            setAlocarDialogOpen(false);
            setSelectedMaterial(null);
            setQuantidade(1);
        } catch (error) {
            console.error("Erro ao alocar material:", error);
            setSnackbar({ open: true, message: "Erro ao alocar material", severity: "error" });
        }
    };

    // Editar quantidade do material alocado
    const handleEditQuantidade = async () => {
        if (!materialToEdit) return;

        const novaQtd = Number(editQuantidade);
        const qtdAtual = materialToEdit.quantidade;
        const diferenca = novaQtd - qtdAtual; // positivo = mais na viatura, negativo = devolver

        // Se zero, desalocar
        if (novaQtd === 0) {
            setEditDialogOpen(false);
            setMaterialToDesalocar(materialToEdit);
            setMotivoDesalocacao("Quantidade editada para zero");
            setDesalocarDialogOpen(true);
            return;
        }

        if (novaQtd < 0) {
            setSnackbar({ open: true, message: "Quantidade nao pode ser negativa", severity: "warning" });
            return;
        }

        // Verificar estoque se estiver aumentando
        if (diferenca > 0) {
            const materialRef = doc(db, "materials", materialToEdit.material_id);
            const materialDoc = await getDoc(materialRef);
            if (materialDoc.exists()) {
                const estoqueDisp = materialDoc.data().estoque_atual || 0;
                if (diferenca > estoqueDisp) {
                    setSnackbar({
                        open: true,
                        message: `Estoque insuficiente. Disponivel: ${estoqueDisp}`,
                        severity: "error"
                    });
                    return;
                }
            }
        }

        try {
            // Atualizar viatura_materiais
            await updateDoc(doc(db, "viatura_materiais", materialToEdit.id), {
                quantidade: novaQtd,
                ultima_atualizacao: serverTimestamp(),
                atualizado_por: userId,
                atualizado_por_nome: userName,
            });

            // Atualizar estoque do material
            const materialRef = doc(db, "materials", materialToEdit.material_id);
            const materialDoc = await getDoc(materialRef);
            if (materialDoc.exists()) {
                const materialData = materialDoc.data();
                await updateDoc(materialRef, {
                    estoque_atual: Math.max(0, (materialData.estoque_atual || 0) - diferenca),
                    estoque_viatura: Math.max(0, (materialData.estoque_viatura || 0) + diferenca),
                    ultima_movimentacao: serverTimestamp(),
                });
            }

            await updateDoc(doc(db, "viaturas", id), { ultima_movimentacao: serverTimestamp() });

            setSnackbar({ open: true, message: "Quantidade atualizada com sucesso!", severity: "success" });
            setEditDialogOpen(false);
            setMaterialToEdit(null);
        } catch (error) {
            console.error("Erro ao editar quantidade:", error);
            setSnackbar({ open: true, message: "Erro ao editar quantidade", severity: "error" });
        }
    };

    // Desalocar material da viatura
    const handleDesalocarMaterial = async () => {
        if (!materialToDesalocar) return;

        try {
            await updateDoc(doc(db, "viatura_materiais", materialToDesalocar.id), {
                status: "desalocado",
                data_desalocacao: serverTimestamp(),
                desalocado_por: userId,
                desalocado_por_nome: userName,
                motivo_desalocacao: motivoDesalocacao || null,
            });

            const materialRef = doc(db, "materials", materialToDesalocar.material_id);
            const materialDoc = await getDoc(materialRef);
            if (materialDoc.exists()) {
                const materialData = materialDoc.data();
                await updateDoc(materialRef, {
                    estoque_atual: (materialData.estoque_atual || 0) + materialToDesalocar.quantidade,
                    estoque_viatura: Math.max(0, (materialData.estoque_viatura || 0) - materialToDesalocar.quantidade),
                    ultima_movimentacao: serverTimestamp(),
                });
            }

            await updateDoc(doc(db, "viaturas", id), { ultima_movimentacao: serverTimestamp() });

            setSnackbar({ open: true, message: "Material desalocado com sucesso!", severity: "success" });
            setDesalocarDialogOpen(false);
            setMaterialToDesalocar(null);
            setMotivoDesalocacao("");
        } catch (error) {
            console.error("Erro ao desalocar material:", error);
            setSnackbar({ open: true, message: "Erro ao desalocar material", severity: "error" });
        }
    };

    const handleExportExcel = () => {
        const dataToExport = materiaisFiltrados.map((m) => ({
            material_description: m.material_description,
            categoria: m.categoria,
            quantity: m.quantidade,
            date: m.data_alocacao,
            sender_name: m.alocado_por_nome,
            viatura_description: viatura?.prefixo,
        }));
        exportarMovimentacoes(dataToExport, `materiais_${viatura?.prefixo || 'viatura'}`);
    };

    const handleClearSearch = useCallback(() => {
        setSearchTerm("");
        searchRef.current?.focus();
    }, []);

    const openEditDialog = (material) => {
        setMaterialToEdit(material);
        setEditQuantidade(material.quantidade);
        setEditDialogOpen(true);
    };

    if (loading) {
        return (
            <PrivateRoute>
                <MenuContext>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
                        <CircularProgress />
                    </Box>
                </MenuContext>
            </PrivateRoute>
        );
    }

    return (
        <PrivateRoute>
            <MenuContext>
                <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100dvh' }}>
                    {/* Header */}
                    <Box sx={{ mb: 3 }}>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate("/viaturas")}
                            sx={{ mb: 2, textTransform: 'none' }}
                        >
                            Voltar para Viaturas
                        </Button>

                        <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
                            <Box sx={{
                                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                                p: 3,
                                color: 'white'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                    <DirectionsCarIcon sx={{ fontSize: 48 }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Chip
                                            label={viatura?.prefixo || 'N/A'}
                                            sx={{
                                                backgroundColor: 'rgba(255,255,255,0.2)',
                                                color: 'white',
                                                fontWeight: 700,
                                                fontSize: '1.2rem',
                                                mb: 1
                                            }}
                                        />
                                        <Typography variant="h5" fontWeight={600}>
                                            {viatura?.description}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                            Materiais Alocados
                                        </Typography>
                                        <Typography variant="h3" fontWeight={700}>
                                            {materiaisAlocados.length}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>

                            <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CalendarTodayIcon fontSize="small" color="action" />
                                    <Typography variant="body2" color="text.secondary">
                                        Criado em: {viatura?.created_at?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CalendarTodayIcon fontSize="small" color="action" />
                                    <Typography variant="body2" color="text.secondary">
                                        Ultima Mov.: {viatura?.ultima_movimentacao?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <FactCheckIcon fontSize="small" sx={{ color: '#ff6f00' }} />
                                    <Typography variant="body2" color="text.secondary">
                                        Conferência:{' '}
                                        {(() => {
                                            const confDate = viatura?.ultima_conferencia?.toDate?.();
                                            if (!confDate) return 'Nunca conferido';
                                            const today = new Date();
                                            const isToday =
                                                confDate.getDate() === today.getDate() &&
                                                confDate.getMonth() === today.getMonth() &&
                                                confDate.getFullYear() === today.getFullYear();
                                            const dateStr = confDate.toLocaleDateString('pt-BR');
                                            const timeStr = confDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                            const por = viatura?.conferido_por ? ` por ${viatura.conferido_por}` : '';
                                            return isToday
                                                ? `Hoje às ${timeStr}${por}`
                                                : `${dateStr} às ${timeStr}${por}`;
                                        })()}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Botoes de Ação */}
                    <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {(userRole === "admin" || userRole === "admingeral") && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setAlocarDialogOpen(true)}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    px: 3,
                                    py: 1.5,
                                    background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)',
                                    }
                                }}
                            >
                                Alocar Material
                            </Button>
                        )}
                        {materiaisAlocados.length > 0 && (
                            <Button
                                variant="contained"
                                startIcon={<FactCheckIcon />}
                                onClick={() => setConferenciaDialogOpen(true)}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    px: 3,
                                    py: 1.5,
                                    background: 'linear-gradient(135deg, #ff6f00 0%, #e65100 100%)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #e65100 0%, #bf360c 100%)',
                                    }
                                }}
                            >
                                Conferir Materiais
                            </Button>
                        )}
                    </Box>

                    {/* Barra de busca e filtros */}
                    {materiaisAlocados.length > 0 && (
                        <Card sx={{ mb: 3, borderRadius: 2, p: 2 }}>
                            <TextField
                                ref={searchRef}
                                size="small"
                                fullWidth
                                variant="outlined"
                                placeholder="Buscar material alocado..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Escape' && handleClearSearch()}
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
                                sx={{
                                    mb: categorias.length > 0 ? 2 : 0,
                                    '& .MuiOutlinedInput-root': { borderRadius: 2 },
                                }}
                            />

                            {/* Filtros por categoria */}
                            {categorias.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <FilterListIcon fontSize="small" color="action" />
                                    <Chip
                                        label={`Todos (${materiaisAlocados.length})`}
                                        size="small"
                                        color={activeFilter === "todos" ? "primary" : "default"}
                                        variant={activeFilter === "todos" ? "filled" : "outlined"}
                                        onClick={() => setActiveFilter("todos")}
                                        sx={{ fontWeight: activeFilter === "todos" ? 600 : 400 }}
                                    />
                                    {categorias.map(cat => {
                                        const count = materiaisAlocados.filter(m => m.categoria === cat).length;
                                        return (
                                            <Chip
                                                key={cat}
                                                label={`${cat} (${count})`}
                                                size="small"
                                                color={activeFilter === cat ? "secondary" : "default"}
                                                variant={activeFilter === cat ? "filled" : "outlined"}
                                                onClick={() => setActiveFilter(activeFilter === cat ? "todos" : cat)}
                                                sx={{ fontWeight: activeFilter === cat ? 600 : 400 }}
                                            />
                                        );
                                    })}
                                </Box>
                            )}

                            {/* Ordenação rápida */}
                            <Box sx={{ mt: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Tooltip title="Ordenação rápida">
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<SwapVertIcon />}
                                        onClick={(e) => setSortMenuAnchor(e.currentTarget)}
                                        sx={{
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontWeight: 500,
                                            fontSize: '0.8rem',
                                            color: 'text.secondary',
                                            borderColor: (theme) => alpha(theme.palette.divider, 0.5),
                                            '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                                        }}
                                    >
                                        {sortField === 'material_description' ? `Material ${sortDirection === 'asc' ? 'A→Z' : 'Z→A'}` :
                                         sortField === 'categoria' ? `Categoria ${sortDirection === 'asc' ? 'A→Z' : 'Z→A'}` :
                                         sortField === 'quantidade' ? `Quantidade ${sortDirection === 'asc' ? '↑' : '↓'}` :
                                         sortField === 'data_alocacao' ? `Alocação ${sortDirection === 'asc' ? 'antiga' : 'recente'}` :
                                         `Conferência ${sortDirection === 'asc' ? 'antiga' : 'recente'}`}
                                    </Button>
                                </Tooltip>
                                <Menu
                                    anchorEl={sortMenuAnchor}
                                    open={Boolean(sortMenuAnchor)}
                                    onClose={() => setSortMenuAnchor(null)}
                                    PaperProps={{ sx: { borderRadius: 2, minWidth: 200 } }}
                                >
                                    <MenuItem onClick={() => handleSortMenu('material_description', 'asc')} selected={sortField === 'material_description' && sortDirection === 'asc'}>
                                        <ListItemIcon><SortByAlphaIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText>Material A → Z</ListItemText>
                                    </MenuItem>
                                    <MenuItem onClick={() => handleSortMenu('material_description', 'desc')} selected={sortField === 'material_description' && sortDirection === 'desc'}>
                                        <ListItemIcon><SortByAlphaIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText>Material Z → A</ListItemText>
                                    </MenuItem>
                                    <MenuItem onClick={() => handleSortMenu('conferencia', 'asc')} selected={sortField === 'conferencia' && sortDirection === 'asc'}>
                                        <ListItemIcon><AccessTimeIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText>Conferência mais antiga</ListItemText>
                                    </MenuItem>
                                    <MenuItem onClick={() => handleSortMenu('conferencia', 'desc')} selected={sortField === 'conferencia' && sortDirection === 'desc'}>
                                        <ListItemIcon><AccessTimeIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText>Conferência mais recente</ListItemText>
                                    </MenuItem>
                                </Menu>
                            </Box>

                            {/* Info de resultados */}
                            {(debouncedSearch || activeFilter !== "todos") && (
                                <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                                    <Chip
                                        size="small"
                                        label={`${materiaisFiltrados.length} de ${materiaisAlocados.length} materiais`}
                                        color="info"
                                        variant="outlined"
                                    />
                                    <Chip
                                        size="small"
                                        label={`Total: ${totalQuantidade} unid.`}
                                        color="primary"
                                        variant="outlined"
                                    />
                                </Box>
                            )}
                        </Card>
                    )}

                    {/* Lista de Materiais */}
                    <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        <Box sx={{
                            background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <InventoryIcon sx={{ color: 'white' }} />
                                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                                    Materiais Alocados ({materiaisFiltrados.length})
                                </Typography>
                            </Box>
                            {materiaisFiltrados.length > 0 && (
                                <Chip
                                    label={`${totalQuantidade} unid. total`}
                                    size="small"
                                    sx={{
                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        fontWeight: 600
                                    }}
                                />
                            )}
                        </Box>

                        {materiaisFiltrados.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <InventoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">
                                    {materiaisAlocados.length === 0
                                        ? "Nenhum material alocado"
                                        : "Nenhum material encontrado com os filtros atuais"
                                    }
                                </Typography>
                                <Typography variant="body2" color="text.disabled">
                                    {materiaisAlocados.length === 0
                                        ? (userRole === "admin" || userRole === "admingeral")
                                            ? "Clique em 'Alocar Material' para adicionar materiais a esta viatura"
                                            : "Esta viatura ainda nao possui materiais alocados"
                                        : "Tente alterar os termos de busca ou limpar os filtros"
                                    }
                                </Typography>
                                {materiaisAlocados.length > 0 && (
                                    <Button
                                        size="small"
                                        onClick={() => { setSearchTerm(""); setActiveFilter("todos"); }}
                                        sx={{ mt: 1, textTransform: 'none' }}
                                    >
                                        Limpar filtros
                                    </Button>
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ overflowX: 'auto' }}>
                                <Table size="medium">
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell sx={{ fontWeight: 700 }}>
                                                <TableSortLabel
                                                    active={sortField === 'material_description'}
                                                    direction={sortField === 'material_description' ? sortDirection : 'asc'}
                                                    onClick={() => handleSort('material_description')}
                                                >
                                                    Material
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>
                                                <TableSortLabel
                                                    active={sortField === 'categoria'}
                                                    direction={sortField === 'categoria' ? sortDirection : 'asc'}
                                                    onClick={() => handleSort('categoria')}
                                                >
                                                    Categoria
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>
                                                <TableSortLabel
                                                    active={sortField === 'quantidade'}
                                                    direction={sortField === 'quantidade' ? sortDirection : 'asc'}
                                                    onClick={() => handleSort('quantidade')}
                                                >
                                                    Qtd
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>
                                                <TableSortLabel
                                                    active={sortField === 'data_alocacao'}
                                                    direction={sortField === 'data_alocacao' ? sortDirection : 'asc'}
                                                    onClick={() => handleSort('data_alocacao')}
                                                >
                                                    Data Alocação
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Alocado Por</TableCell>
                                            {(userRole === "admin" || userRole === "admingeral") && (
                                                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Ações</TableCell>
                                            )}
                                            <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>
                                                <TableSortLabel
                                                    active={sortField === 'conferencia'}
                                                    direction={sortField === 'conferencia' ? sortDirection : 'asc'}
                                                    onClick={() => handleSort('conferencia')}
                                                >
                                                    Conferência
                                                </TableSortLabel>
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {materiaisFiltrados.map((material) => (
                                            <TableRow key={material.id} hover>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <InventoryIcon fontSize="small" color="primary" />
                                                        <Typography variant="body2" fontWeight={500}>
                                                            {material.material_description}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        icon={<CategoryIcon />}
                                                        label={material.categoria || 'N/A'}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ textAlign: 'center' }}>
                                                    <Chip
                                                        label={material.quantidade}
                                                        color="primary"
                                                        size="small"
                                                        sx={{ fontWeight: 700 }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {material.data_alocacao?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <PersonIcon fontSize="small" color="action" />
                                                        <Typography variant="body2">
                                                            {material.alocado_por_nome || 'N/A'}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                {(userRole === "admin" || userRole === "admingeral") && (
                                                    <TableCell sx={{ textAlign: 'center' }}>
                                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                            <Tooltip title="Editar quantidade">
                                                                <IconButton
                                                                    color="primary"
                                                                    size="small"
                                                                    onClick={() => openEditDialog(material)}
                                                                    sx={{
                                                                        '&:hover': { backgroundColor: alpha('#1976d2', 0.1) }
                                                                    }}
                                                                >
                                                                    <EditIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Desalocar material">
                                                                <IconButton
                                                                    color="error"
                                                                    size="small"
                                                                    onClick={() => {
                                                                        setMaterialToDesalocar(material);
                                                                        setDesalocarDialogOpen(true);
                                                                    }}
                                                                    sx={{
                                                                        '&:hover': { backgroundColor: alpha('#f44336', 0.1) }
                                                                    }}
                                                                >
                                                                    <RemoveCircleIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    </TableCell>
                                                )}
                                                <TableCell sx={{ textAlign: 'center' }}>
                                                    {(() => {
                                                        const confDate = material.ultima_atualizacao?.toDate?.() || material.data_alocacao?.toDate?.();
                                                        const confPor = material.atualizado_por_nome || material.alocado_por_nome;
                                                        if (!confDate) {
                                                            return (
                                                                <Typography variant="caption" color="text.disabled">—</Typography>
                                                            );
                                                        }
                                                        const diffDays = Math.floor((new Date() - confDate) / 86400000);
                                                        const isVeryOld = diffDays > 180;
                                                        return (
                                                            <Tooltip
                                                                title={confPor ? `Conferido por ${confPor}` : ''}
                                                                arrow
                                                                placement="top"
                                                            >
                                                                <Box sx={{
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    alignItems: 'center',
                                                                    gap: 0.2,
                                                                    cursor: 'default',
                                                                }}>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            fontSize: '0.78rem',
                                                                            fontWeight: 500,
                                                                            color: isVeryOld ? 'error.main' : 'text.primary',
                                                                            whiteSpace: 'nowrap',
                                                                        }}
                                                                    >
                                                                        {confDate.toLocaleDateString('pt-BR')}
                                                                    </Typography>
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{
                                                                            fontSize: '0.7rem',
                                                                            color: isVeryOld ? 'error.main' : 'text.secondary',
                                                                        }}
                                                                    >
                                                                        {confDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                        {confPor ? ` · ${confPor}` : ''}
                                                                    </Typography>
                                                                    {isVeryOld && (
                                                                        <Chip
                                                                            label="+6 meses"
                                                                            size="small"
                                                                            color="error"
                                                                            variant="outlined"
                                                                            sx={{ height: 18, fontSize: '0.6rem', mt: 0.2 }}
                                                                        />
                                                                    )}
                                                                </Box>
                                                            </Tooltip>
                                                        );
                                                    })()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </Card>

                    {/* FAB Exportar Excel */}
                    {materiaisFiltrados.length > 0 && (
                        <Tooltip title="Exportar para Excel">
                            <Fab
                                size="medium"
                                onClick={handleExportExcel}
                                sx={{
                                    position: 'fixed',
                                    bottom: 24,
                                    right: 24,
                                    backgroundColor: '#4caf50',
                                    '&:hover': { backgroundColor: '#388e3c' }
                                }}
                            >
                                <img src={excelIcon} alt="Excel" width={24} />
                            </Fab>
                        </Tooltip>
                    )}
                </Box>

                {/* Dialog Alocar Material */}
                <Dialog
                    open={alocarDialogOpen}
                    onClose={() => {
                        setAlocarDialogOpen(false);
                        setSelectedMaterial(null);
                        setQuantidade(1);
                    }}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{ sx: { borderRadius: 2 } }}
                >
                    <DialogTitle sx={{
                        background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}>
                        <AddIcon />
                        Alocar Material na Viatura
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                            Viatura: <strong>{viatura?.prefixo} - {viatura?.description}</strong>
                        </Typography>

                        <Divider sx={{ mb: 3 }} />

                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                            Buscar Material
                        </Typography>

                        <MaterialSearch
                            selectedItem={selectedMaterial}
                            onSelectMaterial={(material) => setSelectedMaterial(material)}
                        />

                        {selectedMaterial && (
                            <Paper sx={{ p: 2, mt: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                                <Typography variant="subtitle2" color="primary" gutterBottom>
                                    Material Selecionado
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                    {selectedMaterial.description}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                                    <Chip
                                        label={`Categoria: ${selectedMaterial.categoria || 'N/A'}`}
                                        size="small"
                                        variant="outlined"
                                    />
                                    <Chip
                                        label={`Disponivel: ${selectedMaterial.estoque_atual || 0}`}
                                        size="small"
                                        color={selectedMaterial.estoque_atual > 0 ? "success" : "error"}
                                    />
                                </Box>

                                <TextField
                                    label="Quantidade a alocar"
                                    type="number"
                                    value={quantidade}
                                    onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                                    fullWidth
                                    sx={{ mt: 2 }}
                                    slotProps={{
                                        input: {
                                            inputProps: { min: 1, max: selectedMaterial.estoque_atual }
                                        }
                                    }}
                                    helperText={`Maximo disponivel: ${selectedMaterial.estoque_atual || 0}`}
                                />
                            </Paper>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button
                            onClick={() => {
                                setAlocarDialogOpen(false);
                                setSelectedMaterial(null);
                                setQuantidade(1);
                            }}
                            variant="outlined"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleAlocarMaterial}
                            variant="contained"
                            disabled={!selectedMaterial || quantidade <= 0 || quantidade > (selectedMaterial?.estoque_atual || 0)}
                            sx={{
                                background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                                '&:hover': { background: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)' }
                            }}
                        >
                            Confirmar Alocacao
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Dialog Editar Quantidade */}
                <Dialog
                    open={editDialogOpen}
                    onClose={() => { setEditDialogOpen(false); setMaterialToEdit(null); }}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{ sx: { borderRadius: 2 } }}
                >
                    <DialogTitle sx={{
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}>
                        <EditIcon />
                        Editar Quantidade
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        {materialToEdit && (
                            <>
                                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 2, mb: 2 }}>
                                    <Typography variant="subtitle2" color="primary" gutterBottom>
                                        Material
                                    </Typography>
                                    <Typography variant="body1" fontWeight={600}>
                                        {materialToEdit.material_description}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                                        <Chip
                                            label={`Categoria: ${materialToEdit.categoria || 'N/A'}`}
                                            size="small"
                                            variant="outlined"
                                        />
                                        <Chip
                                            label={`Atual na viatura: ${materialToEdit.quantidade}`}
                                            size="small"
                                            color="primary"
                                        />
                                    </Box>
                                </Paper>

                                <TextField
                                    label="Nova quantidade"
                                    type="number"
                                    value={editQuantidade}
                                    onChange={(e) => setEditQuantidade(Math.max(0, parseInt(e.target.value) || 0))}
                                    fullWidth
                                    slotProps={{
                                        input: {
                                            inputProps: { min: 0 }
                                        }
                                    }}
                                    helperText={
                                        editQuantidade === 0
                                            ? "Quantidade zero ira desalocar o material da viatura"
                                            : editQuantidade > materialToEdit.quantidade
                                                ? `Sera retirado mais ${editQuantidade - materialToEdit.quantidade} do estoque`
                                                : editQuantidade < materialToEdit.quantidade
                                                    ? `Sera devolvido ${materialToEdit.quantidade - editQuantidade} ao estoque`
                                                    : "Sem alteracao"
                                    }
                                />

                                {editQuantidade !== materialToEdit.quantidade && (
                                    <Alert
                                        severity={editQuantidade === 0 ? "warning" : "info"}
                                        sx={{ mt: 2 }}
                                    >
                                        {editQuantidade === 0
                                            ? "O material sera completamente desalocado desta viatura e devolvido ao estoque."
                                            : editQuantidade > materialToEdit.quantidade
                                                ? `${editQuantidade - materialToEdit.quantidade} unidade(s) sera(ao) retirada(s) do estoque disponivel.`
                                                : `${materialToEdit.quantidade - editQuantidade} unidade(s) sera(ao) devolvida(s) ao estoque disponivel.`
                                        }
                                    </Alert>
                                )}
                            </>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button
                            onClick={() => { setEditDialogOpen(false); setMaterialToEdit(null); }}
                            variant="outlined"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleEditQuantidade}
                            variant="contained"
                            disabled={editQuantidade === materialToEdit?.quantidade}
                            color={editQuantidade === 0 ? "warning" : "primary"}
                        >
                            {editQuantidade === 0 ? "Desalocar" : "Salvar"}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Dialog Desalocar Material */}
                <Dialog
                    open={desalocarDialogOpen}
                    onClose={() => {
                        setDesalocarDialogOpen(false);
                        setMaterialToDesalocar(null);
                        setMotivoDesalocacao("");
                    }}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{ sx: { borderRadius: 2 } }}
                >
                    <DialogTitle sx={{
                        background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}>
                        <RemoveCircleIcon />
                        Desalocar Material
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        {materialToDesalocar && (
                            <>
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    O material sera devolvido ao estoque do DEMOP
                                </Alert>

                                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                                    <Typography variant="subtitle2" color="error" gutterBottom>
                                        Material a ser desalocado
                                    </Typography>
                                    <Typography variant="body1" fontWeight={600}>
                                        {materialToDesalocar.material_description}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                        <Chip
                                            label={`Quantidade: ${materialToDesalocar.quantidade}`}
                                            size="small"
                                            color="primary"
                                        />
                                        <Chip
                                            label={`Categoria: ${materialToDesalocar.categoria || 'N/A'}`}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </Box>
                                </Paper>

                                <TextField
                                    label="Motivo da desalocacao (opcional)"
                                    value={motivoDesalocacao}
                                    onChange={(e) => setMotivoDesalocacao(e.target.value)}
                                    fullWidth
                                    multiline
                                    rows={2}
                                    sx={{ mt: 2 }}
                                    placeholder="Ex: Material transferido para outra viatura..."
                                />
                            </>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button
                            onClick={() => {
                                setDesalocarDialogOpen(false);
                                setMaterialToDesalocar(null);
                                setMotivoDesalocacao("");
                            }}
                            variant="outlined"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDesalocarMaterial}
                            variant="contained"
                            color="error"
                        >
                            Confirmar Desalocacao
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Dialog Conferência */}
                <ConferenciaViaturaDialog
                    open={conferenciaDialogOpen}
                    onClose={() => setConferenciaDialogOpen(false)}
                    viatura={viatura}
                    userId={userId}
                    userName={userName}
                    onSuccess={async () => {
                        // Recarregar dados da viatura para atualizar header
                        const viaturaDoc = await getDoc(doc(db, "viaturas", id));
                        if (viaturaDoc.exists()) {
                            setViatura({ id: viaturaDoc.id, ...viaturaDoc.data() });
                        }
                        setSnackbar({ open: true, message: "Conferência registrada com sucesso!", severity: "success" });
                    }}
                />

                {/* Snackbar */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Alert
                        onClose={() => setSnackbar({ ...snackbar, open: false })}
                        severity={snackbar.severity}
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </MenuContext>
        </PrivateRoute>
    );
}
