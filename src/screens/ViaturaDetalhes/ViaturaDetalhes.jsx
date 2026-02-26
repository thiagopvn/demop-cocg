import { useEffect, useState } from "react";
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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import AddIcon from "@mui/icons-material/Add";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import InventoryIcon from "@mui/icons-material/Inventory";
import CategoryIcon from "@mui/icons-material/Category";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
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
import excelIcon from "../../assets/excel.svg";
import { exportarMovimentacoes } from "../../firebase/xlsx";

export default function ViaturaDetalhes() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [viatura, setViatura] = useState(null);
    const [materiaisAlocados, setMateriaisAlocados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userName, setUserName] = useState(null);

    // Dialog states
    const [alocarDialogOpen, setAlocarDialogOpen] = useState(false);
    const [desalocarDialogOpen, setDesalocarDialogOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [quantidade, setQuantidade] = useState(1);
    const [materialToDesalocar, setMaterialToDesalocar] = useState(null);
    const [motivoDesalocacao, setMotivoDesalocacao] = useState("");

    // Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    const decodedToken = await verifyToken(token);
                    setUserRole(decodedToken.role);
                    setUserId(decodedToken.userId);

                    // Buscar nome do usuario
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

        if (id) {
            fetchViatura();
        }
    }, [id, navigate]);

    // Listener em tempo real para materiais alocados
    useEffect(() => {
        if (!id) return;

        const viaturaMaterialsCollection = collection(db, "viatura_materiais");
        const q = query(
            viaturaMaterialsCollection,
            where("viatura_id", "==", id),
            where("status", "==", "alocado")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const materiais = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setMateriaisAlocados(materiais);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao buscar materiais:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

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
            // Verificar se material ja esta alocado nesta viatura
            const existingQuery = query(
                collection(db, "viatura_materiais"),
                where("viatura_id", "==", id),
                where("material_id", "==", selectedMaterial.id),
                where("status", "==", "alocado")
            );
            const existingDocs = await getDocs(existingQuery);

            if (!existingDocs.empty) {
                // Atualizar quantidade existente
                const existingDoc = existingDocs.docs[0];
                const existingData = existingDoc.data();
                const newQuantidade = existingData.quantidade + quantidade;

                await updateDoc(doc(db, "viatura_materiais", existingDoc.id), {
                    quantidade: newQuantidade,
                    ultima_atualizacao: serverTimestamp(),
                    atualizado_por: userId,
                    atualizado_por_nome: userName,
                });
            } else {
                // Criar nova alocacao
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

            // Atualizar viatura
            await updateDoc(doc(db, "viaturas", id), {
                ultima_movimentacao: serverTimestamp(),
            });

            setSnackbar({ open: true, message: "Material alocado com sucesso!", severity: "success" });
            setAlocarDialogOpen(false);
            setSelectedMaterial(null);
            setQuantidade(1);
        } catch (error) {
            console.error("Erro ao alocar material:", error);
            setSnackbar({ open: true, message: "Erro ao alocar material", severity: "error" });
        }
    };

    // Desalocar material da viatura
    const handleDesalocarMaterial = async () => {
        if (!materialToDesalocar) return;

        try {
            // Atualizar registro de alocacao
            await updateDoc(doc(db, "viatura_materiais", materialToDesalocar.id), {
                status: "desalocado",
                data_desalocacao: serverTimestamp(),
                desalocado_por: userId,
                desalocado_por_nome: userName,
                motivo_desalocacao: motivoDesalocacao || null,
            });

            // Devolver ao estoque do material
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

            // Atualizar viatura
            await updateDoc(doc(db, "viaturas", id), {
                ultima_movimentacao: serverTimestamp(),
            });

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
        const dataToExport = materiaisAlocados.map((m) => ({
            material_description: m.material_description,
            categoria: m.categoria,
            quantity: m.quantidade,
            date: m.data_alocacao,
            sender_name: m.alocado_por_nome,
            viatura_description: viatura?.prefixo,
        }));
        exportarMovimentacoes(dataToExport, `materiais_${viatura?.prefixo || 'viatura'}`);
    };

    if (loading) {
        return (
            <PrivateRoute>
                <MenuContext>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                        <CircularProgress />
                    </Box>
                </MenuContext>
            </PrivateRoute>
        );
    }

    return (
        <PrivateRoute>
            <MenuContext>
                <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh' }}>
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
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Botao Alocar Material (apenas Admin) */}
                    {(userRole === "admin" || userRole === "admingeral") && (
                        <Box sx={{ mb: 3 }}>
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
                        </Box>
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
                                    Materiais Alocados ({materiaisAlocados.length})
                                </Typography>
                            </Box>
                        </Box>

                        {materiaisAlocados.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <InventoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">
                                    Nenhum material alocado
                                </Typography>
                                <Typography variant="body2" color="text.disabled">
                                    {(userRole === "admin" || userRole === "admingeral")
                                        ? "Clique em 'Alocar Material' para adicionar materiais a esta viatura"
                                        : "Esta viatura ainda nao possui materiais alocados"}
                                </Typography>
                            </Box>
                        ) : (
                            <Table size="medium">
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                        <TableCell sx={{ fontWeight: 700 }}>Material</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Categoria</TableCell>
                                        <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Quantidade</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Data Alocacao</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Alocado Por</TableCell>
                                        {(userRole === "admin" || userRole === "admingeral") && (
                                            <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Acoes</TableCell>
                                        )}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {materiaisAlocados.map((material) => (
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
                                                    <Tooltip title="Desalocar material">
                                                        <IconButton
                                                            color="error"
                                                            onClick={() => {
                                                                setMaterialToDesalocar(material);
                                                                setDesalocarDialogOpen(true);
                                                            }}
                                                            sx={{
                                                                '&:hover': { backgroundColor: alpha('#f44336', 0.1) }
                                                            }}
                                                        >
                                                            <RemoveCircleIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Card>

                    {/* FAB Exportar Excel */}
                    {materiaisAlocados.length > 0 && (
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
