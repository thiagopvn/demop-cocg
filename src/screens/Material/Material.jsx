import { useState, useMemo, useRef, useEffect, memo, useCallback } from 'react';
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
    Skeleton,
    Tooltip,
    Popover,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Autocomplete,
    Paper,
    Divider,
    Snackbar,
    Alert,
    alpha,
    styled,
    TableSortLabel,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Checkbox,
    FormControl,
    Select,
    InputLabel
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Search,
    Clear,
    Inventory,
    Warning,
    DirectionsCar,
    Build,
    CalendarMonth,
    Visibility,
    LocalShipping,
    SwapVert,
    SortByAlpha,
    AccessTime,
    ContentCopy,
    WarningAmber,
    CheckBox,
    CheckBoxOutlineBlank,
    FactCheck,
    FilterList,
    ClearAll,
    History,
    Sync
} from '@mui/icons-material';
import MenuContext from '../../contexts/MenuContext';
import { useMaterials } from '../../contexts/MaterialContext';
import { useDebounce } from '../../hooks/useDebounce';
import MaterialDialog from '../../dialogs/MaterialDialog';
import MaintenanceDialog from '../../dialogs/MaintenanceDialog';
import HistoricoDialog from '../../dialogs/HistoricoDialog';
import { deleteDoc, doc, collection, query, where, getDocs, orderBy, onSnapshot, addDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import db from '../../firebase/db';
import { verifyToken } from '../../firebase/token';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { logAudit } from '../../firebase/auditLog';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { findDuplicateGroups } from '../../utils/materialSimilarity';
import SeedMaintenancesDialog from '../../dialogs/SeedMaintenancesDialog';

// Limite de itens por página
const ITEMS_PER_PAGE = 50;

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
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const searchRef = useRef(null);
    const theme = useTheme();
    const navigate = useNavigate();

    // Dados do usuario logado
    const [loggedUserId, setLoggedUserId] = useState(null);
    const [loggedUserName, setLoggedUserName] = useState(null);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    const decoded = await verifyToken(token);
                    setLoggedUserId(decoded.userId);
                    setUserRole(decoded.role);
                    const userDoc = await getDoc(doc(db, "users", decoded.userId));
                    if (userDoc.exists()) {
                        setLoggedUserName(userDoc.data().full_name || userDoc.data().username);
                    }
                } catch (error) {
                    console.error("Erro ao verificar token:", error);
                }
            }
        };
        fetchUserData();
    }, []);

    // Estados para manutenção
    const [openMaintenanceDialog, setOpenMaintenanceDialog] = useState(false);
    const [selectedMaterialForMaintenance, setSelectedMaterialForMaintenance] = useState(null);
    const [materialMaintenances, setMaterialMaintenances] = useState({}); // Cache de manutenções por material
    const [materialViaturas, setMaterialViaturas] = useState({}); // Cache de viaturas por material
    const [viaturaPopover, setViaturaPopover] = useState({ anchorEl: null, materialId: null });

    // Estados para alocar em viatura
    const [alocarDialogOpen, setAlocarDialogOpen] = useState(false);
    const [materialToAlocar, setMaterialToAlocar] = useState(null);
    const [viaturasList, setViaturasList] = useState([]);
    const [selectedViatura, setSelectedViatura] = useState(null);
    const [alocarQuantidade, setAlocarQuantidade] = useState(1);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const [historicoOpen, setHistoricoOpen] = useState(false);
    const [historicoTarget, setHistoricoTarget] = useState(null);

    // Ordenação por coluna (clique no cabeçalho)
    const [sortField, setSortField] = useState('description');
    const [sortDirection, setSortDirection] = useState('asc');

    const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
    const [showDuplicatesDialog, setShowDuplicatesDialog] = useState(false);
    const [showUncheckedDialog, setShowUncheckedDialog] = useState(false);
    const [showSeedDialog, setShowSeedDialog] = useState(false);

    // Filter states
    const [filterCategoria, setFilterCategoria] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterEstoque, setFilterEstoque] = useState('');

    // Conference mode states
    const [conferenceMode, setConferenceMode] = useState(false);
    const [selectedForConference, setSelectedForConference] = useState(new Set());

    // Image lightbox
    const [lightboxImage, setLightboxImage] = useState(null);

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

    const handleOpenDialog = (material = null) => {
        setSelectedMaterial(material);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedMaterial(null);
    };

    // Funções para manutenção
    const handleOpenMaintenanceDialog = (material) => {
        setSelectedMaterialForMaintenance(material);
        setOpenMaintenanceDialog(true);
    };

    const handleCloseMaintenanceDialog = (updated) => {
        setOpenMaintenanceDialog(false);
        setSelectedMaterialForMaintenance(null);
        // Se houve atualização, recarregar manutenções
        if (updated) {
            loadMaintenancesForMaterials();
        }
    };

    // Carregar manutenções pendentes para todos os materiais
    const loadMaintenancesForMaterials = async () => {
        try {
            const manutencaoRef = collection(db, 'manutencoes');
            const q = query(
                manutencaoRef,
                where('status', 'in', ['pendente', 'em_andamento']),
                orderBy('dueDate', 'asc')
            );
            const snapshot = await getDocs(q);

            const maintenancesByMaterial = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const materialId = data.materialId;
                if (!maintenancesByMaterial[materialId]) {
                    maintenancesByMaterial[materialId] = [];
                }
                maintenancesByMaterial[materialId].push({
                    id: doc.id,
                    ...data
                });
            });

            setMaterialMaintenances(maintenancesByMaterial);
        } catch (error) {
            console.error('Erro ao carregar manutenções:', error);
        }
    };

    // Carregar manutenções ao montar o componente
    useEffect(() => {
        loadMaintenancesForMaterials();
    }, []);

    // Listener em tempo real para alocações de materiais em viaturas
    useEffect(() => {
        const q = query(
            collection(db, 'viatura_materiais'),
            where('status', '==', 'alocado')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const byMaterial = {};
            snapshot.docs.forEach(d => {
                const data = d.data();
                const mid = data.material_id;
                if (!byMaterial[mid]) byMaterial[mid] = [];
                byMaterial[mid].push({
                    viatura_id: data.viatura_id,
                    prefixo: data.viatura_prefixo || '',
                    description: data.viatura_description || '',
                    quantidade: data.quantidade || 1,
                });
            });
            setMaterialViaturas(byMaterial);
        });
        return () => unsubscribe();
    }, []);

    // Função para verificar se material tem manutenção pendente
    const getMaintenanceInfo = (materialId) => {
        const maintenances = materialMaintenances[materialId] || [];
        if (maintenances.length === 0) return null;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const overdue = maintenances.filter(m => {
            const dueDate = m.dueDate?.toDate ? m.dueDate.toDate() : new Date(m.dueDate);
            return dueDate < now;
        });

        const upcoming = maintenances.filter(m => {
            const dueDate = m.dueDate?.toDate ? m.dueDate.toDate() : new Date(m.dueDate);
            return dueDate >= now;
        });

        return {
            total: maintenances.length,
            overdue: overdue.length,
            upcoming: upcoming.length,
            nextMaintenance: maintenances[0]
        };
    };

    const handleViaturaPopoverOpen = (event, materialId) => {
        setViaturaPopover({ anchorEl: event.currentTarget, materialId });
    };

    const handleViaturaPopoverClose = () => {
        setViaturaPopover({ anchorEl: null, materialId: null });
    };

    // Carregar lista de viaturas para o dialog de alocacao
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'viaturas'),
            (snapshot) => {
                const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                list.sort((a, b) => (a.prefixo || '').localeCompare(b.prefixo || ''));
                setViaturasList(list);
            }
        );
        return () => unsubscribe();
    }, []);

    const handleOpenAlocarDialog = (material) => {
        setMaterialToAlocar(material);
        setSelectedViatura(null);
        setAlocarQuantidade(1);
        setAlocarDialogOpen(true);
    };

    const handleAlocarEmViatura = async () => {
        if (!materialToAlocar || !selectedViatura) return;
        if (alocarQuantidade <= 0) {
            setSnackbar({ open: true, message: "Quantidade deve ser maior que zero", severity: "warning" });
            return;
        }
        if (alocarQuantidade > (materialToAlocar.estoque_atual || 0)) {
            setSnackbar({ open: true, message: "Quantidade maior que o estoque disponivel", severity: "error" });
            return;
        }

        try {
            // Verificar se material ja esta alocado nesta viatura
            const existingQuery = query(
                collection(db, "viatura_materiais"),
                where("viatura_id", "==", selectedViatura.id),
                where("material_id", "==", materialToAlocar.id),
                where("status", "==", "alocado")
            );
            const existingDocs = await getDocs(existingQuery);

            if (!existingDocs.empty) {
                const existingDoc = existingDocs.docs[0];
                const existingData = existingDoc.data();
                await updateDoc(doc(db, "viatura_materiais", existingDoc.id), {
                    quantidade: existingData.quantidade + alocarQuantidade,
                    ultima_atualizacao: serverTimestamp(),
                    atualizado_por: loggedUserId,
                    atualizado_por_nome: loggedUserName,
                });
            } else {
                await addDoc(collection(db, "viatura_materiais"), {
                    viatura_id: selectedViatura.id,
                    viatura_prefixo: selectedViatura.prefixo || "",
                    viatura_description: selectedViatura.description || "",
                    material_id: materialToAlocar.id,
                    material_description: materialToAlocar.description,
                    categoria: materialToAlocar.categoria || "",
                    quantidade: alocarQuantidade,
                    data_alocacao: serverTimestamp(),
                    alocado_por: loggedUserId,
                    alocado_por_nome: loggedUserName,
                    status: "alocado",
                });
            }

            // Atualizar estoque do material
            const materialRef = doc(db, "materials", materialToAlocar.id);
            const materialDoc = await getDoc(materialRef);
            if (materialDoc.exists()) {
                const materialData = materialDoc.data();
                await updateDoc(materialRef, {
                    estoque_atual: (materialData.estoque_atual || 0) - alocarQuantidade,
                    estoque_viatura: (materialData.estoque_viatura || 0) + alocarQuantidade,
                    ultima_movimentacao: serverTimestamp(),
                });
            }

            await updateDoc(doc(db, "viaturas", selectedViatura.id), {
                ultima_movimentacao: serverTimestamp(),
            });

            logAudit({
                action: 'material_allocate',
                userId: loggedUserId,
                userName: loggedUserName,
                targetCollection: 'viatura_materiais',
                targetId: materialToAlocar.id,
                targetName: materialToAlocar.description,
                details: {
                    viatura: selectedViatura.prefixo ? `${selectedViatura.prefixo} - ${selectedViatura.description}` : selectedViatura.description,
                    quantidade: alocarQuantidade,
                },
            });
            setSnackbar({ open: true, message: "Material alocado na viatura com sucesso!", severity: "success" });
            setAlocarDialogOpen(false);
            setMaterialToAlocar(null);
            setSelectedViatura(null);
            setAlocarQuantidade(1);
        } catch (error) {
            console.error("Erro ao alocar material na viatura:", error);
            setSnackbar({ open: true, message: "Erro ao alocar material", severity: "error" });
        }
    };

    const handleDeleteMaterial = async (materialId) => {
        if (window.confirm('Tem certeza que deseja excluir este material?')) {
            try {
                const mat = materials.find(m => m.id === materialId);
                await deleteDoc(doc(db, 'materials', materialId));
                logAudit({
                    action: 'material_delete',
                    userId: loggedUserId,
                    userName: loggedUserName,
                    targetCollection: 'materials',
                    targetId: materialId,
                    targetName: mat?.description || materialId,
                });
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

    const debouncedSearchTerm = useDebounce(searchTerm, 250);

    // Reset visibleCount e filtros quando pesquisa muda
    useEffect(() => {
        setVisibleCount(ITEMS_PER_PAGE);
        setFilterCategoria('');
        setFilterStatus('');
        setFilterEstoque('');
    }, [debouncedSearchTerm]);

    // Unique categories for filter dropdown
    const uniqueCategories = useMemo(() => {
        const cats = new Set();
        materials.forEach(m => {
            if (m.categoria) cats.add(m.categoria);
        });
        return [...cats].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [materials]);

    // Check if any filter is active
    const hasActiveFilters = filterCategoria || filterStatus || filterEstoque;

    const handleClearFilters = useCallback(() => {
        setFilterCategoria('');
        setFilterStatus('');
        setFilterEstoque('');
    }, []);

    // Filtro otimizado - retorna todos os materiais filtrados e ordenados
    const allFilteredMaterials = useMemo(() => {
        let result;
        if (!debouncedSearchTerm || debouncedSearchTerm.trim().length === 0) {
            result = [...materials];
        } else {
            const searchLower = debouncedSearchTerm.toLowerCase().trim();
            const keywords = searchLower.split(/\s+/).filter(k => k.length > 0);

            result = materials.filter(material => {
                const text = `${material.description || ''} ${material.categoria || ''}`.toLowerCase();
                for (const keyword of keywords) {
                    if (!text.includes(keyword)) return false;
                }
                return true;
            });
        }

        // Apply category filter
        if (filterCategoria) {
            result = result.filter(m => m.categoria === filterCategoria);
        }

        // Apply status filter
        if (filterStatus) {
            result = result.filter(m => m.maintenance_status === filterStatus);
        }

        // Apply stock filter
        if (filterEstoque) {
            if (filterEstoque === 'zerado') {
                result = result.filter(m => (m.estoque_atual || 0) === 0);
            } else if (filterEstoque === 'em_estoque') {
                result = result.filter(m => (m.estoque_atual || 0) > 0);
            }
        }

        const dir = sortDirection === 'asc' ? 1 : -1;
        result.sort((a, b) => {
            switch (sortField) {
                case 'description':
                    return dir * (a.description || '').localeCompare(b.description || '', 'pt-BR');
                case 'categoria':
                    return dir * (a.categoria || '').localeCompare(b.categoria || '', 'pt-BR');
                case 'estoque':
                    return dir * ((a.estoque_atual || 0) - (b.estoque_atual || 0));
                case 'conferencia': {
                    const dateA = a.ultima_conferencia?.toDate?.() || a.ultima_movimentacao?.toDate?.() || new Date(0);
                    const dateB = b.ultima_conferencia?.toDate?.() || b.ultima_movimentacao?.toDate?.() || new Date(0);
                    return dir * (dateA - dateB);
                }
                default:
                    return 0;
            }
        });

        return result;
    }, [materials, debouncedSearchTerm, sortField, sortDirection, filterCategoria, filterStatus, filterEstoque]);

    // Materiais visíveis (limitados pelo visibleCount)
    const filteredMaterials = useMemo(() => {
        return allFilteredMaterials.slice(0, visibleCount);
    }, [allFilteredMaterials, visibleCount]);

    // Função para carregar mais
    const handleLoadMore = useCallback(() => {
        setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    }, []);

    // Verifica se há mais itens para carregar
    const hasMore = allFilteredMaterials.length > visibleCount;

    // Conference mode handlers
    const handleToggleConferenceMode = useCallback(() => {
        setConferenceMode(prev => {
            if (prev) {
                setSelectedForConference(new Set());
            }
            return !prev;
        });
    }, []);

    const handleToggleConferenceItem = useCallback((materialId) => {
        setSelectedForConference(prev => {
            const next = new Set(prev);
            if (next.has(materialId)) {
                next.delete(materialId);
            } else {
                next.add(materialId);
            }
            return next;
        });
    }, []);

    const handleSelectAllVisible = useCallback(() => {
        setSelectedForConference(prev => {
            const allVisibleIds = filteredMaterials.map(m => m.id);
            const allSelected = allVisibleIds.every(id => prev.has(id));
            if (allSelected) {
                // Deselect all visible
                const next = new Set(prev);
                allVisibleIds.forEach(id => next.delete(id));
                return next;
            } else {
                // Select all visible
                const next = new Set(prev);
                allVisibleIds.forEach(id => next.add(id));
                return next;
            }
        });
    }, [filteredMaterials]);

    const handleConferirSelecionados = useCallback(async () => {
        if (selectedForConference.size === 0) return;
        try {
            const promises = [...selectedForConference].map(materialId =>
                updateDoc(doc(db, 'materials', materialId), {
                    ultima_conferencia: serverTimestamp(),
                    conferido_por: loggedUserName,
                })
            );
            await Promise.all(promises);
            setSnackbar({
                open: true,
                message: `${selectedForConference.size} materia${selectedForConference.size !== 1 ? 'is' : 'l'} conferido${selectedForConference.size !== 1 ? 's' : ''} com sucesso!`,
                severity: 'success',
            });
            setSelectedForConference(new Set());
            setConferenceMode(false);
        } catch (error) {
            console.error('Erro ao conferir materiais:', error);
            setSnackbar({
                open: true,
                message: 'Erro ao conferir materiais selecionados',
                severity: 'error',
            });
        }
    }, [selectedForConference, loggedUserName]);

    const handleCancelConference = useCallback(() => {
        setSelectedForConference(new Set());
        setConferenceMode(false);
    }, []);

    // Statistics
    const stats = useMemo(() => {
        const totalMaterials = materials.length;
        const filteredCount = allFilteredMaterials.length;
        const lowStock = materials.filter(m => (m.estoque_atual || 0) === 0 && (m.estoque_total || 0) > 0).length;

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const semConferencia = materials.filter(m => {
            const confDate = m.ultima_conferencia?.toDate?.() || m.ultima_movimentacao?.toDate?.();
            return !confDate || confDate < sixMonthsAgo;
        }).length;

        return {
            total: totalMaterials,
            filtered: filteredCount,
            lowStock,
            semConferencia,
            showing: filteredMaterials.length,
            totalFiltered: filteredCount
        };
    }, [materials, allFilteredMaterials, filteredMaterials]);

    const isAdmin = userRole === 'admin' || userRole === 'admingeral';
    const isAdminGeral = userRole === 'admingeral';

    const duplicateGroups = useMemo(() => {
        if (!isAdminGeral) return [];
        return findDuplicateGroups(materials);
    }, [materials, isAdminGeral]);

    const uncheckedMaterials = useMemo(() => {
        if (!isAdmin) return [];
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return materials.filter(m => {
            const confDate = m.ultima_conferencia?.toDate?.() || m.ultima_movimentacao?.toDate?.();
            return !confDate || confDate < sixMonthsAgo;
        }).sort((a, b) => {
            const dateA = a.ultima_conferencia?.toDate?.() || a.ultima_movimentacao?.toDate?.() || new Date(0);
            const dateB = b.ultima_conferencia?.toDate?.() || b.ultima_movimentacao?.toDate?.() || new Date(0);
            return dateA - dateB;
        });
    }, [materials, isAdmin]);

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
                <StyledTableCell align="center">
                    <Skeleton variant="rectangular" height={24} width={50} />
                </StyledTableCell>
                <StyledTableCell>
                    <Skeleton variant="rectangular" height={24} width={80} />
                </StyledTableCell>
                <StyledTableCell align="center">
                    <Skeleton variant="rectangular" height={32} width={100} />
                </StyledTableCell>
                <StyledTableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Skeleton variant="circular" width={32} height={32} />
                        <Skeleton variant="circular" width={32} height={32} />
                    </Box>
                </StyledTableCell>
                <StyledTableCell align="center">
                    <Skeleton variant="text" height={20} width={100} />
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
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                        {isAdmin && (
                            <Button
                                variant={conferenceMode ? 'contained' : 'outlined'}
                                startIcon={<FactCheck />}
                                onClick={handleToggleConferenceMode}
                                color={conferenceMode ? 'success' : 'primary'}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    px: 3,
                                    py: 1.5,
                                    boxShadow: conferenceMode ? 3 : 0,
                                    '&:hover': {
                                        boxShadow: conferenceMode ? 5 : 2,
                                        transform: 'translateY(-2px)',
                                    },
                                }}
                            >
                                {conferenceMode ? 'Sair Conferência' : 'Modo Conferência'}
                            </Button>
                        )}
                        {isAdmin && (
                            <Tooltip title="Criar manutenções preventivas para materiais motomecanizados que ainda não possuem">
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    startIcon={<Sync />}
                                    onClick={() => setShowSeedDialog(true)}
                                    sx={{
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        px: 2,
                                        py: 1.5,
                                        fontSize: '0.8rem',
                                        '&:hover': {
                                            boxShadow: 2,
                                            transform: 'translateY(-2px)',
                                        },
                                    }}
                                >
                                    Criar Manutenções Motomecanizados
                                </Button>
                            </Tooltip>
                        )}
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
                    </Box>
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
                                        Estoque Zerado
                                    </Typography>
                                </Box>
                            </Box>
                        </StatCard>
                    )}

                    {isAdminGeral && duplicateGroups.length > 0 && (
                        <StatCard
                            sx={{
                                flex: 1, minWidth: 200, cursor: 'pointer',
                                background: `linear-gradient(135deg, ${alpha('#ff9800', 0.08)} 0%, ${alpha('#e65100', 0.03)} 100%)`,
                                border: `1px solid ${alpha('#ff9800', 0.15)}`,
                                '&:hover': {
                                    transform: 'translateY(-3px)',
                                    boxShadow: `0 8px 24px ${alpha('#ff9800', 0.15)}`,
                                    borderColor: alpha('#ff9800', 0.35),
                                },
                            }}
                            onClick={() => setShowDuplicatesDialog(true)}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{
                                    p: 1.5, borderRadius: 2.5,
                                    background: `linear-gradient(135deg, ${alpha('#ff9800', 0.2)} 0%, ${alpha('#e65100', 0.12)} 100%)`,
                                    color: '#e65100', display: 'flex',
                                }}>
                                    <ContentCopy />
                                </Box>
                                <Box>
                                    <Typography variant="h5" fontWeight={700} sx={{ color: '#e65100', lineHeight: 1.2 }}>
                                        {duplicateGroups.length}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                        Possíveis Duplicidades
                                    </Typography>
                                </Box>
                            </Box>
                        </StatCard>
                    )}

                    {isAdmin && stats.semConferencia > 0 && (
                        <StatCard
                            sx={{
                                flex: 1, minWidth: 200, cursor: 'pointer',
                                background: `linear-gradient(135deg, ${alpha('#ef5350', 0.08)} 0%, ${alpha('#c62828', 0.03)} 100%)`,
                                border: `1px solid ${alpha('#ef5350', 0.15)}`,
                                '&:hover': {
                                    transform: 'translateY(-3px)',
                                    boxShadow: `0 8px 24px ${alpha('#ef5350', 0.15)}`,
                                    borderColor: alpha('#ef5350', 0.35),
                                },
                            }}
                            onClick={() => setShowUncheckedDialog(true)}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{
                                    p: 1.5, borderRadius: 2.5,
                                    background: `linear-gradient(135deg, ${alpha('#ef5350', 0.2)} 0%, ${alpha('#c62828', 0.12)} 100%)`,
                                    color: '#c62828', display: 'flex',
                                }}>
                                    <WarningAmber />
                                </Box>
                                <Box>
                                    <Typography variant="h5" fontWeight={700} sx={{ color: '#c62828', lineHeight: 1.2 }}>
                                        {stats.semConferencia}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                        Revisão Necessária (+6 meses)
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
                        onKeyDown={handleKeyDown}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search 
                                            sx={{ 
                                                color: 'text.secondary',
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

                    {/* Ordenação rápida */}
                    <Box sx={{ mt: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Tooltip title="Ordenação rápida">
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<SwapVert />}
                                onClick={(e) => setSortMenuAnchor(e.currentTarget)}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    fontSize: '0.8rem',
                                    color: 'text.secondary',
                                    borderColor: alpha(theme.palette.divider, 0.5),
                                    '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                                }}
                            >
                                {sortField === 'description' ? `Descrição ${sortDirection === 'asc' ? 'A→Z' : 'Z→A'}` :
                                 sortField === 'categoria' ? `Categoria ${sortDirection === 'asc' ? 'A→Z' : 'Z→A'}` :
                                 sortField === 'estoque' ? `Estoque ${sortDirection === 'asc' ? '↑' : '↓'}` :
                                 `Conferência ${sortDirection === 'asc' ? 'antiga' : 'recente'}`}
                            </Button>
                        </Tooltip>
                        <Menu
                            anchorEl={sortMenuAnchor}
                            open={Boolean(sortMenuAnchor)}
                            onClose={() => setSortMenuAnchor(null)}
                            PaperProps={{ sx: { borderRadius: 2, minWidth: 200 } }}
                        >
                            <MenuItem onClick={() => handleSortMenu('description', 'asc')} selected={sortField === 'description' && sortDirection === 'asc'}>
                                <ListItemIcon><SortByAlpha fontSize="small" /></ListItemIcon>
                                <ListItemText>Descrição A → Z</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={() => handleSortMenu('description', 'desc')} selected={sortField === 'description' && sortDirection === 'desc'}>
                                <ListItemIcon><SortByAlpha fontSize="small" /></ListItemIcon>
                                <ListItemText>Descrição Z → A</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={() => handleSortMenu('conferencia', 'asc')} selected={sortField === 'conferencia' && sortDirection === 'asc'}>
                                <ListItemIcon><AccessTime fontSize="small" /></ListItemIcon>
                                <ListItemText>Conferência mais antiga</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={() => handleSortMenu('conferencia', 'desc')} selected={sortField === 'conferencia' && sortDirection === 'desc'}>
                                <ListItemIcon><AccessTime fontSize="small" /></ListItemIcon>
                                <ListItemText>Conferência mais recente</ListItemText>
                            </MenuItem>
                        </Menu>
                    </Box>

                    {/* Filters */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1, alignItems: 'center' }}>
                        <FilterList fontSize="small" sx={{ color: 'text.secondary', mr: 0.5 }} />
                        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                            <InputLabel id="filter-categoria-label">Categoria</InputLabel>
                            <Select
                                labelId="filter-categoria-label"
                                value={filterCategoria}
                                label="Categoria"
                                onChange={(e) => setFilterCategoria(e.target.value)}
                                sx={{ borderRadius: 2, fontSize: '0.85rem' }}
                            >
                                <MenuItem value="">Todas</MenuItem>
                                {uniqueCategories.map(cat => (
                                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                            <InputLabel id="filter-status-label">Status</InputLabel>
                            <Select
                                labelId="filter-status-label"
                                value={filterStatus}
                                label="Status"
                                onChange={(e) => setFilterStatus(e.target.value)}
                                sx={{ borderRadius: 2, fontSize: '0.85rem' }}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                <MenuItem value="operante">Operante</MenuItem>
                                <MenuItem value="em_manutencao">Em Manutenção</MenuItem>
                                <MenuItem value="inoperante">Inoperante</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                            <InputLabel id="filter-estoque-label">Estoque</InputLabel>
                            <Select
                                labelId="filter-estoque-label"
                                value={filterEstoque}
                                label="Estoque"
                                onChange={(e) => setFilterEstoque(e.target.value)}
                                sx={{ borderRadius: 2, fontSize: '0.85rem' }}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                <MenuItem value="zerado">Estoque Zerado</MenuItem>
                                <MenuItem value="em_estoque">Em Estoque</MenuItem>
                            </Select>
                        </FormControl>
                        {hasActiveFilters && (
                            <Chip
                                icon={<ClearAll />}
                                label="Limpar Filtros"
                                size="small"
                                color="primary"
                                variant="outlined"
                                onClick={handleClearFilters}
                                onDelete={handleClearFilters}
                                sx={{
                                    borderRadius: 2,
                                    fontWeight: 500,
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                    },
                                }}
                            />
                        )}
                    </Box>

                    {/* Search Results Info */}
                    {debouncedSearchTerm && (
                            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                    size="small"
                                    icon={<Inventory />}
                                    label={`${stats.totalFiltered} resultado${stats.totalFiltered !== 1 ? 's' : ''}`}
                                    color={stats.totalFiltered > 0 ? 'primary' : 'default'}
                                    variant="outlined"
                                />
                            </Box>
                    )}

                    {/* Info de paginação */}
                    {!debouncedSearchTerm && stats.total > ITEMS_PER_PAGE && (
                        <Box sx={{ mt: 1 }}>
                            <Chip
                                size="small"
                                label={`Exibindo ${stats.showing} de ${stats.total} materiais`}
                                variant="outlined"
                            />
                        </Box>
                    )}
                </StyledSearchContainer>
                
                <StyledTableContainer>
                    <Table>
                        <StyledTableHead>
                            <TableRow>
                                {conferenceMode && (
                                    <TableCell sx={{ color: 'white', fontWeight: 600, width: 48, p: 0.5 }} align="center">
                                        <Checkbox
                                            checked={filteredMaterials.length > 0 && filteredMaterials.every(m => selectedForConference.has(m.id))}
                                            indeterminate={filteredMaterials.some(m => selectedForConference.has(m.id)) && !filteredMaterials.every(m => selectedForConference.has(m.id))}
                                            onChange={handleSelectAllVisible}
                                            sx={{
                                                color: 'rgba(255,255,255,0.7)',
                                                '&.Mui-checked': { color: 'white' },
                                                '&.MuiCheckbox-indeterminate': { color: 'white' },
                                            }}
                                            size="small"
                                        />
                                    </TableCell>
                                )}
                                <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem', width: 56, textAlign: 'center', p: 1 }}>
                                    Foto
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                                    <TableSortLabel
                                        active={sortField === 'description'}
                                        direction={sortField === 'description' ? sortDirection : 'asc'}
                                        onClick={() => handleSort('description')}
                                        sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.7) !important' } }}
                                    >
                                        <Inventory fontSize="small" sx={{ mr: 0.5 }} />
                                        Descrição
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                                    <TableSortLabel
                                        active={sortField === 'categoria'}
                                        direction={sortField === 'categoria' ? sortDirection : 'asc'}
                                        onClick={() => handleSort('categoria')}
                                        sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.7) !important' } }}
                                    >
                                        Categoria
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>
                                    <TableSortLabel
                                        active={sortField === 'estoque'}
                                        direction={sortField === 'estoque' ? sortDirection : 'asc'}
                                        onClick={() => handleSort('estoque')}
                                        sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.7) !important' }, justifyContent: 'center' }}
                                    >
                                        Estoque
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                                        <DirectionsCar fontSize="small" />
                                        Em Viatura
                                    </Box>
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>
                                    Status
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                                        <Build fontSize="small" />
                                        Manutenção
                                    </Box>
                                </TableCell>
                                <TableCell align="right" sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                                    Ações
                                </TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>
                                    <TableSortLabel
                                        active={sortField === 'conferencia'}
                                        direction={sortField === 'conferencia' ? sortDirection : 'asc'}
                                        onClick={() => handleSort('conferencia')}
                                        sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.7) !important' }, justifyContent: 'center' }}
                                    >
                                        Conferência
                                    </TableSortLabel>
                                </TableCell>
                            </TableRow>
                        </StyledTableHead>
                        <TableBody>
                            {loading ? (
                                <>
                                    {renderLoadingSkeleton()}
                                    <TableRow>
                                        <TableCell colSpan={conferenceMode ? 10 : 9} align="center" sx={{ py: 4 }}>
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
                                    <TableCell colSpan={conferenceMode ? 10 : 9} align="center" sx={{ py: 6 }}>
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
                                filteredMaterials.map((material) => (
                                    <StyledTableRow hover key={material.id} selected={conferenceMode && selectedForConference.has(material.id)}>
                                            {conferenceMode && (
                                                <StyledTableCell align="center" sx={{ width: 48, p: 0.5 }}>
                                                    <Checkbox
                                                        checked={selectedForConference.has(material.id)}
                                                        onChange={() => handleToggleConferenceItem(material.id)}
                                                        size="small"
                                                        icon={<CheckBoxOutlineBlank fontSize="small" />}
                                                        checkedIcon={<CheckBox fontSize="small" />}
                                                        sx={{
                                                            color: 'text.secondary',
                                                            '&.Mui-checked': { color: 'success.main' },
                                                        }}
                                                    />
                                                </StyledTableCell>
                                            )}
                                            <StyledTableCell align="center" sx={{ width: 56, p: 0.5 }}>
                                                {material.image_url ? (
                                                    <Box
                                                        component="img"
                                                        src={material.image_url}
                                                        alt={material.description}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setLightboxImage(material.image_url);
                                                        }}
                                                        sx={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 1,
                                                            objectFit: 'cover',
                                                            cursor: 'zoom-in',
                                                            border: '1px solid',
                                                            borderColor: 'divider',
                                                            transition: 'all 0.2s ease',
                                                            '&:hover': {
                                                                transform: 'scale(1.15)',
                                                                boxShadow: 2,
                                                            },
                                                        }}
                                                    />
                                                ) : (
                                                    <Box
                                                        sx={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 1,
                                                            bgcolor: 'grey.100',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            mx: 'auto',
                                                        }}
                                                    >
                                                        <Inventory sx={{ fontSize: 18, color: 'text.disabled' }} />
                                                    </Box>
                                                )}
                                            </StyledTableCell>
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
                                                {(material.estoque_viatura || 0) > 0 ? (
                                                    <Chip
                                                        icon={<DirectionsCar sx={{ fontSize: '0.9rem !important' }} />}
                                                        label={material.estoque_viatura}
                                                        color="info"
                                                        size="small"
                                                        variant="filled"
                                                        onClick={(e) => handleViaturaPopoverOpen(e, material.id)}
                                                        sx={{
                                                            minWidth: 60,
                                                            cursor: 'pointer',
                                                            '&:hover': {
                                                                transform: 'scale(1.05)',
                                                                boxShadow: 2,
                                                            },
                                                            transition: 'all 0.2s ease',
                                                        }}
                                                    />
                                                ) : (
                                                    <Typography variant="body2" color="text.disabled">
                                                        -
                                                    </Typography>
                                                )}
                                            </StyledTableCell>
                                            <StyledTableCell align="center">
                                                <Chip
                                                    label={getMaintenanceStatusLabel(material.maintenance_status)}
                                                    color={getMaintenanceStatusColor(material.maintenance_status)}
                                                    size="small"
                                                    sx={{ minWidth: 90 }}
                                                />
                                            </StyledTableCell>
                                            <StyledTableCell align="center">
                                                {(() => {
                                                    const maintenanceInfo = getMaintenanceInfo(material.id);
                                                    return (
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                <Tooltip title="Agendar Manutenção">
                                                                    <IconButton
                                                                        onClick={() => handleOpenMaintenanceDialog(material)}
                                                                        color="secondary"
                                                                        size="small"
                                                                        sx={{
                                                                            '&:hover': {
                                                                                backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                                                                            },
                                                                        }}
                                                                    >
                                                                        <CalendarMonth fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                {maintenanceInfo && maintenanceInfo.total > 0 && (
                                                                    <Tooltip title="Ver manutenções agendadas">
                                                                        <IconButton
                                                                            onClick={() => navigate('/manutencao')}
                                                                            color={maintenanceInfo.overdue > 0 ? 'error' : 'info'}
                                                                            size="small"
                                                                            sx={{
                                                                                '&:hover': {
                                                                                    backgroundColor: maintenanceInfo.overdue > 0
                                                                                        ? alpha(theme.palette.error.main, 0.1)
                                                                                        : alpha(theme.palette.info.main, 0.1),
                                                                                },
                                                                            }}
                                                                        >
                                                                            <Visibility fontSize="small" />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                )}
                                                            </Box>
                                                            {maintenanceInfo && maintenanceInfo.total > 0 && (
                                                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                                                                    {maintenanceInfo.overdue > 0 && (
                                                                        <Chip
                                                                            label={`${maintenanceInfo.overdue} atrasada${maintenanceInfo.overdue > 1 ? 's' : ''}`}
                                                                            color="error"
                                                                            size="small"
                                                                            sx={{ fontSize: '0.65rem', height: 20 }}
                                                                        />
                                                                    )}
                                                                    {maintenanceInfo.upcoming > 0 && (
                                                                        <Chip
                                                                            label={`${maintenanceInfo.upcoming} agendada${maintenanceInfo.upcoming > 1 ? 's' : ''}`}
                                                                            color="info"
                                                                            size="small"
                                                                            sx={{ fontSize: '0.65rem', height: 20 }}
                                                                        />
                                                                    )}
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    );
                                                })()}
                                            </StyledTableCell>
                                            <StyledTableCell align="right">
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <Tooltip title="Alocar em Viatura">
                                                        <IconButton
                                                            onClick={() => handleOpenAlocarDialog(material)}
                                                            size="small"
                                                            disabled={!material.estoque_atual || material.estoque_atual <= 0}
                                                            sx={{
                                                                color: theme.palette.success.main,
                                                                '&:hover': {
                                                                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                                                                },
                                                            }}
                                                        >
                                                            <LocalShipping fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
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
                                                    <Tooltip title="Histórico">
                                                        <IconButton
                                                            onClick={() => { setHistoricoTarget({ id: material.id, name: material.description }); setHistoricoOpen(true); }}
                                                            size="small"
                                                            sx={{
                                                                color: '#9c27b0',
                                                                '&:hover': {
                                                                    backgroundColor: alpha('#9c27b0', 0.1),
                                                                },
                                                            }}
                                                        >
                                                            <History fontSize="small" />
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
                                            <StyledTableCell align="center">
                                                {(() => {
                                                    const confDate = material.ultima_conferencia?.toDate?.() || material.ultima_movimentacao?.toDate?.();
                                                    const confPor = material.conferido_por;
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
                                            </StyledTableCell>
                                        </StyledTableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </StyledTableContainer>

                {/* Botão Carregar Mais */}
                {hasMore && !loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Button
                            variant="outlined"
                            onClick={handleLoadMore}
                            startIcon={<ExpandMoreIcon />}
                            sx={{
                                borderRadius: 2,
                                px: 4,
                                py: 1.5,
                                textTransform: 'none',
                                fontWeight: 500
                            }}
                        >
                            Carregar mais ({allFilteredMaterials.length - visibleCount} restantes)
                        </Button>
                    </Box>
                )}
            </Box>

            <MaterialDialog
                open={openDialog}
                onClose={handleCloseDialog}
                material={selectedMaterial}
                loggedUserName={loggedUserName}
                loggedUserId={loggedUserId}
                materials={materials}
            />

            <MaintenanceDialog
                open={openMaintenanceDialog}
                onClose={handleCloseMaintenanceDialog}
                material={selectedMaterialForMaintenance}
            />

            <SeedMaintenancesDialog
                open={showSeedDialog}
                onClose={(changed) => {
                    setShowSeedDialog(false);
                    if (changed) {
                        setSnackbar({ open: true, message: 'Manutenções importadas com sucesso!', severity: 'success' });
                    }
                }}
                materials={materials}
            />

            <Popover
                open={Boolean(viaturaPopover.anchorEl)}
                anchorEl={viaturaPopover.anchorEl}
                onClose={handleViaturaPopoverClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 2,
                            mt: 0.5,
                            minWidth: 220,
                            maxWidth: 320,
                            boxShadow: 6,
                        },
                    },
                }}
            >
                {(() => {
                    const viaturas = materialViaturas[viaturaPopover.materialId] || [];
                    return (
                        <Box sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <DirectionsCar fontSize="small" color="info" />
                                <Typography variant="subtitle2" fontWeight={600} color="info.main">
                                    Distribuição por Viatura
                                </Typography>
                            </Box>
                            {viaturas.length > 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {viaturas.map((v, idx) => (
                                        <Box
                                            key={idx}
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                p: 1,
                                                borderRadius: 1.5,
                                                backgroundColor: alpha(theme.palette.info.main, 0.06),
                                                border: `1px solid ${alpha(theme.palette.info.main, 0.12)}`,
                                            }}
                                        >
                                            <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                                                {v.prefixo ? `${v.prefixo} - ${v.description}` : v.description}
                                            </Typography>
                                            <Chip
                                                label={v.quantidade}
                                                size="small"
                                                color="info"
                                                sx={{ fontWeight: 700, ml: 1, minWidth: 32 }}
                                            />
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    Sem detalhes disponíveis
                                </Typography>
                            )}
                        </Box>
                    );
                })()}
            </Popover>

            {/* Dialog Alocar em Viatura */}
            <Dialog
                open={alocarDialogOpen}
                onClose={() => {
                    setAlocarDialogOpen(false);
                    setMaterialToAlocar(null);
                    setSelectedViatura(null);
                    setAlocarQuantidade(1);
                }}
                maxWidth="sm"
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
                    <LocalShipping />
                    Alocar em Viatura
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {materialToAlocar && (
                        <>
                            <Paper sx={{ p: 2, backgroundColor: alpha(theme.palette.primary.main, 0.04), borderRadius: 2, mb: 3 }}>
                                <Typography variant="subtitle2" color="primary" gutterBottom>
                                    Material
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                    {materialToAlocar.description}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                    <Chip
                                        label={`Categoria: ${materialToAlocar.categoria || 'N/A'}`}
                                        size="small"
                                        variant="outlined"
                                    />
                                    <Chip
                                        label={`Disponivel: ${materialToAlocar.estoque_atual || 0}`}
                                        size="small"
                                        color={materialToAlocar.estoque_atual > 0 ? "success" : "error"}
                                    />
                                    {(materialToAlocar.estoque_viatura || 0) > 0 && (
                                        <Chip
                                            icon={<DirectionsCar sx={{ fontSize: '0.85rem !important' }} />}
                                            label={`Em viaturas: ${materialToAlocar.estoque_viatura}`}
                                            size="small"
                                            color="info"
                                        />
                                    )}
                                </Box>
                            </Paper>

                            <Divider sx={{ mb: 3 }} />

                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                Selecionar Viatura
                            </Typography>

                            <Autocomplete
                                options={viaturasList}
                                getOptionLabel={(option) =>
                                    option.prefixo
                                        ? `${option.prefixo} - ${option.description}`
                                        : option.description || ''
                                }
                                value={selectedViatura}
                                onChange={(_, newValue) => setSelectedViatura(newValue)}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Buscar viatura..."
                                        variant="outlined"
                                        size="small"
                                        slotProps={{
                                            input: {
                                                ...params.InputProps,
                                                startAdornment: (
                                                    <>
                                                        <InputAdornment position="start">
                                                            <DirectionsCar color="action" fontSize="small" />
                                                        </InputAdornment>
                                                        {params.InputProps.startAdornment}
                                                    </>
                                                ),
                                            },
                                        }}
                                    />
                                )}
                                renderOption={(props, option) => {
                                    const { key, ...rest } = props;
                                    return (
                                        <li key={key} {...rest}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <DirectionsCar fontSize="small" color="action" />
                                                <Box>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {option.prefixo || 'S/P'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {option.description}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </li>
                                    );
                                }}
                                noOptionsText="Nenhuma viatura encontrada"
                                sx={{ mb: 2 }}
                            />

                            {selectedViatura && (
                                <TextField
                                    label="Quantidade a alocar"
                                    type="number"
                                    value={alocarQuantidade}
                                    onChange={(e) => setAlocarQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                                    fullWidth
                                    slotProps={{
                                        input: {
                                            inputProps: { min: 1, max: materialToAlocar.estoque_atual }
                                        }
                                    }}
                                    helperText={`Maximo disponivel: ${materialToAlocar.estoque_atual || 0}`}
                                />
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={() => {
                            setAlocarDialogOpen(false);
                            setMaterialToAlocar(null);
                            setSelectedViatura(null);
                            setAlocarQuantidade(1);
                        }}
                        variant="outlined"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleAlocarEmViatura}
                        variant="contained"
                        disabled={
                            !selectedViatura ||
                            alocarQuantidade <= 0 ||
                            alocarQuantidade > (materialToAlocar?.estoque_atual || 0)
                        }
                        sx={{
                            background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                            '&:hover': { background: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)' }
                        }}
                    >
                        Confirmar Alocacao
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Conference Mode Floating Action Bar */}
            {conferenceMode && (
                <Paper sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: 2,
                    zIndex: 1200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    boxShadow: 6,
                    borderTop: `3px solid ${theme.palette.success.main}`,
                    backgroundColor: theme.palette.background.paper,
                }}>
                    <Chip
                        icon={<FactCheck />}
                        label={`${selectedForConference.size} selecionado${selectedForConference.size !== 1 ? 's' : ''}`}
                        color={selectedForConference.size > 0 ? 'success' : 'default'}
                        variant="filled"
                        sx={{ fontWeight: 600 }}
                    />
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleConferirSelecionados}
                        disabled={selectedForConference.size === 0}
                        startIcon={<CheckBox />}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                        }}
                    >
                        Conferir Selecionados
                    </Button>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={handleCancelConference}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                        }}
                    >
                        Cancelar
                    </Button>
                </Paper>
            )}

            {/* Image Lightbox */}
            <Dialog
                open={Boolean(lightboxImage)}
                onClose={() => setLightboxImage(null)}
                maxWidth={false}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden',
                        bgcolor: '#000',
                        maxWidth: '92vw',
                        maxHeight: '90vh',
                        m: 1,
                    },
                }}
            >
                {lightboxImage && (
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconButton
                            onClick={() => setLightboxImage(null)}
                            sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                color: 'white',
                                bgcolor: 'rgba(0,0,0,0.5)',
                                zIndex: 1,
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                            }}
                            size="small"
                        >
                            <Clear />
                        </IconButton>
                        <Box
                            component="img"
                            src={lightboxImage}
                            alt="Material"
                            sx={{
                                maxWidth: '90vw',
                                maxHeight: '85vh',
                                objectFit: 'contain',
                                display: 'block',
                            }}
                        />
                    </Box>
                )}
            </Dialog>

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

            {/* Dialog: Possíveis Duplicidades */}
            <Dialog
                open={showDuplicatesDialog}
                onClose={() => setShowDuplicatesDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
            >
                <DialogTitle sx={{
                    background: `linear-gradient(135deg, ${alpha('#ff9800', 0.08)} 0%, ${alpha('#e65100', 0.04)} 100%)`,
                    borderBottom: `1px solid ${alpha('#ff9800', 0.12)}`,
                    py: 2.5, px: 3,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            p: 1, borderRadius: 2,
                            background: `linear-gradient(135deg, ${alpha('#ff9800', 0.2)} 0%, ${alpha('#e65100', 0.12)} 100%)`,
                            color: '#e65100', display: 'flex',
                        }}>
                            <ContentCopy fontSize="small" />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                                Possíveis Duplicidades
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {duplicateGroups.length} grupo{duplicateGroups.length !== 1 ? 's' : ''} detectado{duplicateGroups.length !== 1 ? 's' : ''} &middot; Itens com patrimônios diferentes são ignorados
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {duplicateGroups.map((group, idx) => (
                        <Accordion
                            key={idx}
                            defaultExpanded={idx === 0}
                            disableGutters
                            sx={{
                                '&:before': { display: 'none' },
                                boxShadow: 'none',
                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                '&:last-of-type': { borderBottom: 'none' },
                            }}
                        >
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                sx={{
                                    px: 3, py: 0.5,
                                    '&:hover': { bgcolor: alpha('#ff9800', 0.04) },
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Chip
                                        label={`Grupo ${idx + 1}`}
                                        size="small"
                                        sx={{
                                            fontWeight: 600, fontSize: '0.7rem',
                                            bgcolor: alpha('#ff9800', 0.12),
                                            color: '#e65100', border: 'none',
                                        }}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        {group.length} materiais similares
                                    </Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ px: 3, pb: 2, pt: 0 }}>
                                {group.map((m, mIdx) => (
                                    <Box
                                        key={m.id}
                                        sx={{
                                            display: 'flex', alignItems: 'center', gap: 1.5,
                                            py: 1, flexWrap: 'wrap',
                                            borderTop: mIdx > 0 ? `1px dashed ${alpha(theme.palette.divider, 0.4)}` : 'none',
                                        }}
                                    >
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={500} noWrap>
                                                {m.description}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {m.categoria || 'Sem categoria'} &middot; Est. Total: {m.estoque_total || 0}
                                            </Typography>
                                        </Box>
                                        {mIdx > 0 && m.similarity != null && (
                                            <Chip
                                                label={`${Math.round(m.similarity * 100)}%`}
                                                size="small"
                                                sx={{
                                                    fontWeight: 700, fontSize: '0.7rem',
                                                    bgcolor: m.similarity >= 0.8
                                                        ? alpha('#ef5350', 0.12)
                                                        : alpha('#ff9800', 0.12),
                                                    color: m.similarity >= 0.8 ? '#c62828' : '#e65100',
                                                    border: 'none', minWidth: 48,
                                                }}
                                            />
                                        )}
                                    </Box>
                                ))}
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                    <Button
                        onClick={() => setShowDuplicatesDialog(false)}
                        variant="outlined"
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog: Revisão Necessária */}
            <Dialog
                open={showUncheckedDialog}
                onClose={() => setShowUncheckedDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
            >
                <DialogTitle sx={{
                    background: `linear-gradient(135deg, ${alpha('#ef5350', 0.08)} 0%, ${alpha('#c62828', 0.04)} 100%)`,
                    borderBottom: `1px solid ${alpha('#ef5350', 0.12)}`,
                    py: 2.5, px: 3,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            p: 1, borderRadius: 2,
                            background: `linear-gradient(135deg, ${alpha('#ef5350', 0.2)} 0%, ${alpha('#c62828', 0.12)} 100%)`,
                            color: '#c62828', display: 'flex',
                        }}>
                            <WarningAmber fontSize="small" />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                                Revisão Necessária
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {uncheckedMaterials.length} materia{uncheckedMaterials.length !== 1 ? 'is' : 'l'} sem conferência há mais de 6 meses
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {uncheckedMaterials.map(m => {
                        const confDate = m.ultima_conferencia?.toDate?.() || m.ultima_movimentacao?.toDate?.();
                        const days = confDate ? Math.floor((new Date() - confDate) / 86400000) : null;
                        return (
                            <Box
                                key={m.id}
                                sx={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    px: 3, py: 1.5,
                                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                                    '&:last-child': { borderBottom: 'none' },
                                    '&:hover': { bgcolor: alpha('#ef5350', 0.02) },
                                    transition: 'background-color 0.15s',
                                }}
                            >
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography variant="body2" fontWeight={500} noWrap>
                                        {m.description}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {m.categoria || 'Sem categoria'}
                                        {confDate ? ` · Conferido em ${confDate.toLocaleDateString('pt-BR')}` : ''}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={days ? `${days} dias` : 'Nunca conferido'}
                                    size="small"
                                    sx={{
                                        fontWeight: 600, fontSize: '0.7rem', ml: 1.5, flexShrink: 0,
                                        bgcolor: !days || days > 365
                                            ? alpha('#c62828', 0.12)
                                            : alpha('#ef5350', 0.12),
                                        color: !days || days > 365 ? '#c62828' : '#d32f2f',
                                        border: 'none',
                                    }}
                                />
                            </Box>
                        );
                    })}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                    <Button
                        onClick={() => setShowUncheckedDialog(false)}
                        variant="outlined"
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>

            <HistoricoDialog
                open={historicoOpen}
                onClose={() => { setHistoricoOpen(false); setHistoricoTarget(null); }}
                targetId={historicoTarget?.id}
                targetName={historicoTarget?.name}
            />
        </MenuContext>
    );
};

export default Material;