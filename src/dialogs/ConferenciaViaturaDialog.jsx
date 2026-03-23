import { useEffect, useState, useMemo } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TextField,
    Chip,
    IconButton,
    Tooltip,
    Alert,
    CircularProgress,
    Divider,
    alpha,
    Checkbox,
    Paper,
    InputAdornment,
    Avatar,
} from "@mui/material";
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InventoryIcon from "@mui/icons-material/Inventory";
import PersonIcon from "@mui/icons-material/Person";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    serverTimestamp,
    writeBatch,
} from "firebase/firestore";
import db from "../firebase/db";

export default function ConferenciaViaturaDialog({
    open,
    onClose,
    viatura,
    userId,
    userName,
    onSuccess,
}) {
    const theme = useTheme();
    const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
    const [materiais, setMateriais] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editQuantidades, setEditQuantidades] = useState({});
    const [conferidos, setConferidos] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [divergencias, setDivergencias] = useState({});
    const [materiaisImages, setMateriaisImages] = useState({});

    // Fetch materiais alocados na viatura
    useEffect(() => {
        if (!open || !viatura?.id) return;

        const fetchMateriais = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, "viatura_materiais"),
                    where("viatura_id", "==", viatura.id),
                    where("status", "==", "alocado")
                );
                const snapshot = await getDocs(q);
                const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                items.sort((a, b) =>
                    (a.material_description || "").localeCompare(b.material_description || "", "pt-BR")
                );
                setMateriais(items);

                // Buscar imagens dos materiais na coleção materials
                const imageMap = {};
                const materialIds = [...new Set(items.map((m) => m.material_id))];
                await Promise.all(
                    materialIds.map(async (matId) => {
                        try {
                            const matDoc = await getDoc(doc(db, "materials", matId));
                            if (matDoc.exists()) {
                                imageMap[matId] = matDoc.data().image_url || null;
                            }
                        } catch {
                            /* ignora erro de imagem */
                        }
                    })
                );
                setMateriaisImages(imageMap);

                setConferidos(new Set());
                setEditQuantidades({});
                setEditingId(null);
                setDivergencias({});
                setSearchTerm("");
            } catch (error) {
                console.error("Erro ao buscar materiais:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMateriais();
    }, [open, viatura?.id]);

    const materiaisFiltrados = useMemo(() => {
        if (!searchTerm.trim()) return materiais;
        const term = searchTerm.toLowerCase();
        return materiais.filter(
            (m) =>
                (m.material_description || "").toLowerCase().includes(term) ||
                (m.categoria || "").toLowerCase().includes(term)
        );
    }, [materiais, searchTerm]);

    const allConferidos = materiais.length > 0 && conferidos.size === materiais.length;
    const hasQuantityChanges = Object.keys(editQuantidades).some(
        (id) => {
            const mat = materiais.find((m) => m.id === id);
            return mat && editQuantidades[id] !== mat.quantidade;
        }
    );

    const handleToggleConferido = (materialId) => {
        setConferidos((prev) => {
            const next = new Set(prev);
            if (next.has(materialId)) {
                next.delete(materialId);
            } else {
                next.add(materialId);
            }
            return next;
        });
    };

    const handleConferirTodos = () => {
        const allIds = new Set(materiais.map((m) => m.id));
        setConferidos(allIds);
    };

    const handleStartEdit = (material) => {
        setEditingId(material.id);
        if (!(material.id in editQuantidades)) {
            setEditQuantidades((prev) => ({ ...prev, [material.id]: material.quantidade }));
        }
    };

    const handleQuantidadeChange = (materialId, value) => {
        const newQtd = Math.max(0, parseInt(value) || 0);
        setEditQuantidades((prev) => ({ ...prev, [materialId]: newQtd }));

        const mat = materiais.find((m) => m.id === materialId);
        if (mat && newQtd !== mat.quantidade) {
            setDivergencias((prev) => ({
                ...prev,
                [materialId]: { esperado: mat.quantidade, encontrado: newQtd },
            }));
        } else {
            setDivergencias((prev) => {
                const next = { ...prev };
                delete next[materialId];
                return next;
            });
        }

        // Auto-check when editing
        setConferidos((prev) => {
            const next = new Set(prev);
            next.add(materialId);
            return next;
        });
    };

    const handleSalvarConferencia = async () => {
        if (conferidos.size === 0) return;
        setSaving(true);

        try {
            const batch = writeBatch(db);
            const materiaisConferidos = materiais.filter((m) => conferidos.has(m.id));
            const itensConferencia = [];

            for (const mat of materiaisConferidos) {
                const novaQtd = editQuantidades[mat.id];
                const qtdAlterada = novaQtd !== undefined && novaQtd !== mat.quantidade;

                // Dados de conferência para viatura_materiais
                const updateData = {
                    ultima_conferencia: serverTimestamp(),
                    conferido_por: userName,
                    conferido_por_id: userId,
                    observacao_conferencia: "",
                };

                if (qtdAlterada) {
                    const diferenca = novaQtd - mat.quantidade;
                    updateData.quantidade = novaQtd;

                    // Ajustar estoque do material
                    const materialRef = doc(db, "materials", mat.material_id);
                    const materialDoc = await getDoc(materialRef);
                    if (materialDoc.exists()) {
                        const materialData = materialDoc.data();
                        const estoqueAtual = materialData.estoque_atual || 0;
                        let novoEstoqueAtual = estoqueAtual - diferenca;
                        let novoEstoqueTotal = materialData.estoque_total || 0;

                        // Se estoque ficaria negativo, zera e aumenta estoque_total
                        if (novoEstoqueAtual < 0) {
                            const deficit = Math.abs(novoEstoqueAtual);
                            novoEstoqueTotal += deficit;
                            novoEstoqueAtual = 0;
                        }

                        batch.update(materialRef, {
                            estoque_atual: novoEstoqueAtual,
                            estoque_viatura: Math.max(0, (materialData.estoque_viatura || 0) + diferenca),
                            estoque_total: novoEstoqueTotal,
                            ultima_movimentacao: serverTimestamp(),
                        });
                    }
                }

                // Atualizar item na coleção viatura_materiais
                batch.update(doc(db, "viatura_materiais", mat.id), updateData);

                const qtdEncontrada = qtdAlterada ? novaQtd : mat.quantidade;
                itensConferencia.push({
                    material_id: mat.material_id,
                    material_description: mat.material_description,
                    categoria: mat.categoria || "",
                    quantidade_esperada: mat.quantidade,
                    quantidade_encontrada: qtdEncontrada,
                    divergencia: qtdAlterada,
                });

                // Se há divergência, criar alerta
                if (qtdAlterada) {
                    const alertaRef = doc(collection(db, "alertas_conferencia"));
                    batch.set(alertaRef, {
                        viatura_id: viatura.id,
                        viatura_prefixo: viatura.prefixo,
                        material_id: mat.material_id,
                        material_description: mat.material_description,
                        quantidade_esperada: mat.quantidade,
                        quantidade_encontrada: novaQtd,
                        diferenca: novaQtd - mat.quantidade,
                        conferido_por: userName,
                        conferido_por_id: userId,
                        data_alerta: serverTimestamp(),
                        status: "pendente",
                    });
                }
            }

            // Atualizar viatura com dados da conferência
            batch.update(doc(db, "viaturas", viatura.id), {
                ultima_conferencia: serverTimestamp(),
                conferido_por: userName,
                conferido_por_id: userId,
            });

            // Registrar histórico da conferência
            const conferenciaRef = doc(collection(db, "conferencias_viaturas"));
            batch.set(conferenciaRef, {
                viatura_id: viatura.id,
                viatura_prefixo: viatura.prefixo,
                viatura_description: viatura.description,
                conferido_por: userName,
                conferido_por_id: userId,
                data_conferencia: serverTimestamp(),
                total_materiais: materiais.length,
                total_conferidos: materiaisConferidos.length,
                total_divergencias: Object.keys(divergencias).length,
                itens: itensConferencia,
            });

            await batch.commit();

            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error("Erro ao salvar conferência:", error);
            alert("Erro ao salvar conferência. Tente novamente.");
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        if (saving) return;
        setConferidos(new Set());
        setEditQuantidades({});
        setEditingId(null);
        setDivergencias({});
        setSearchTerm("");
        onClose();
    };

    const divergenciaCount = Object.keys(divergencias).length;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            fullScreen={fullScreenDialog}
            PaperProps={{
                sx: {
                    borderRadius: fullScreenDialog ? 0 : 3,
                    overflow: "hidden",
                    maxHeight: fullScreenDialog ? '100vh' : "90vh",
                },
            }}
        >
            {/* Header */}
            <DialogTitle
                sx={{
                    background: "linear-gradient(135deg, #ff6f00 0%, #e65100 100%)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    py: 2.5,
                }}
            >
                <FactCheckIcon sx={{ fontSize: 28 }} />
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={700}>
                        Conferência de Material
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {viatura?.prefixo} - {viatura?.description}
                    </Typography>
                </Box>
                {materiais.length > 0 && (
                    <Chip
                        label={`${conferidos.size}/${materiais.length}`}
                        sx={{
                            backgroundColor: "rgba(255,255,255,0.2)",
                            color: "white",
                            fontWeight: 700,
                            fontSize: "0.9rem",
                        }}
                    />
                )}
            </DialogTitle>

            <DialogContent sx={{ p: 0, overflowX: 'auto' }}>
                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
                        <CircularProgress sx={{ color: "#ff6f00" }} />
                    </Box>
                ) : materiais.length === 0 ? (
                    <Box sx={{ p: 6, textAlign: "center" }}>
                        <InventoryIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            Nenhum material alocado
                        </Typography>
                        <Typography variant="body2" color="text.disabled">
                            Esta viatura nao possui materiais para conferir
                        </Typography>
                    </Box>
                ) : (
                    <>
                        {/* Info bar */}
                        <Box
                            sx={{
                                px: 3,
                                py: 2,
                                backgroundColor: "#fff8e1",
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                flexWrap: "wrap",
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <PersonIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                    Conferente: <strong>{userName}</strong>
                                </Typography>
                            </Box>
                            <Divider orientation="vertical" flexItem />
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <InventoryIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                    {materiais.length} {materiais.length === 1 ? "material" : "materiais"} na viatura
                                </Typography>
                            </Box>
                            {divergenciaCount > 0 && (
                                <>
                                    <Divider orientation="vertical" flexItem />
                                    <Chip
                                        icon={<WarningAmberIcon />}
                                        label={`${divergenciaCount} ${divergenciaCount === 1 ? "divergência" : "divergências"}`}
                                        color="warning"
                                        size="small"
                                        variant="filled"
                                    />
                                </>
                            )}
                        </Box>

                        {/* Search + Conferir Todos */}
                        <Box
                            sx={{
                                px: 3,
                                py: 1.5,
                                display: "flex",
                                gap: 2,
                                alignItems: "center",
                                borderBottom: "1px solid",
                                borderColor: "divider",
                            }}
                        >
                            {materiais.length > 3 && (
                                <TextField
                                    size="small"
                                    placeholder="Buscar material..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    sx={{
                                        flex: 1,
                                        "& .MuiOutlinedInput-root": { borderRadius: 2 },
                                    }}
                                    slotProps={{
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon fontSize="small" color="action" />
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                />
                            )}
                            <Button
                                variant={allConferidos ? "contained" : "outlined"}
                                size="small"
                                startIcon={<CheckCircleIcon />}
                                onClick={handleConferirTodos}
                                disabled={allConferidos}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: "none",
                                    fontWeight: 600,
                                    whiteSpace: "nowrap",
                                    ...(allConferidos
                                        ? {
                                              background:
                                                  "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)",
                                          }
                                        : {
                                              borderColor: "#4caf50",
                                              color: "#4caf50",
                                              "&:hover": {
                                                  borderColor: "#388e3c",
                                                  backgroundColor: alpha("#4caf50", 0.08),
                                              },
                                          }),
                                }}
                            >
                                {allConferidos ? "Todos Conferidos" : "Tudo Confere"}
                            </Button>
                        </Box>

                        {/* Tabela de materiais */}
                        <Box sx={{ overflowX: "auto", maxHeight: "50vh", overflowY: "auto" }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell
                                            padding="checkbox"
                                            sx={{ backgroundColor: "#f5f5f5", fontWeight: 700 }}
                                        />
                                        <TableCell sx={{ backgroundColor: "#f5f5f5", fontWeight: 700 }}>
                                            Material
                                        </TableCell>
                                        <TableCell sx={{ backgroundColor: "#f5f5f5", fontWeight: 700 }}>
                                            Categoria
                                        </TableCell>
                                        <TableCell
                                            sx={{
                                                backgroundColor: "#f5f5f5",
                                                fontWeight: 700,
                                                textAlign: "center",
                                            }}
                                        >
                                            Qtd Esperada
                                        </TableCell>
                                        <TableCell
                                            sx={{
                                                backgroundColor: "#f5f5f5",
                                                fontWeight: 700,
                                                textAlign: "center",
                                            }}
                                        >
                                            Qtd Encontrada
                                        </TableCell>
                                        <TableCell
                                            sx={{
                                                backgroundColor: "#f5f5f5",
                                                fontWeight: 700,
                                                textAlign: "center",
                                            }}
                                        >
                                            Status
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {materiaisFiltrados.map((material) => {
                                        const isConferido = conferidos.has(material.id);
                                        const isEditing = editingId === material.id;
                                        const editedQtd = editQuantidades[material.id];
                                        const hasDivergencia = divergencias[material.id];
                                        const displayQtd =
                                            editedQtd !== undefined ? editedQtd : material.quantidade;

                                        return (
                                            <TableRow
                                                key={material.id}
                                                sx={{
                                                    backgroundColor: isConferido
                                                        ? hasDivergencia
                                                            ? alpha("#ff9800", 0.06)
                                                            : alpha("#4caf50", 0.06)
                                                        : "transparent",
                                                    transition: "background-color 0.2s ease",
                                                    "&:hover": {
                                                        backgroundColor: isConferido
                                                            ? hasDivergencia
                                                                ? alpha("#ff9800", 0.1)
                                                                : alpha("#4caf50", 0.1)
                                                            : alpha("#1976d2", 0.04),
                                                    },
                                                }}
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={isConferido}
                                                        onChange={() => handleToggleConferido(material.id)}
                                                        sx={{
                                                            color: "#bdbdbd",
                                                            "&.Mui-checked": {
                                                                color: hasDivergencia
                                                                    ? "#ff9800"
                                                                    : "#4caf50",
                                                            },
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <Avatar
                                                            src={materiaisImages[material.material_id] || undefined}
                                                            variant="rounded"
                                                            sx={{
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: 1,
                                                                backgroundColor: materiaisImages[material.material_id] ? "transparent" : "#e3f2fd",
                                                                border: "1px solid #e0e0e0",
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            {!materiaisImages[material.material_id] && (
                                                                <InventoryIcon sx={{ fontSize: 18, color: "#1e3a5f" }} />
                                                            )}
                                                        </Avatar>
                                                        <Typography variant="body2" fontWeight={500}>
                                                            {material.material_description}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={material.categoria || "N/A"}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ fontSize: "0.75rem" }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ textAlign: "center" }}>
                                                    <Chip
                                                        label={material.quantidade}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                        sx={{ fontWeight: 700 }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ textAlign: "center" }}>
                                                    {isEditing ? (
                                                        <TextField
                                                            type="number"
                                                            size="small"
                                                            value={displayQtd}
                                                            onChange={(e) =>
                                                                handleQuantidadeChange(
                                                                    material.id,
                                                                    e.target.value
                                                                )
                                                            }
                                                            onBlur={() => setEditingId(null)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter" || e.key === "Escape")
                                                                    setEditingId(null);
                                                            }}
                                                            autoFocus
                                                            sx={{
                                                                width: 80,
                                                                "& .MuiOutlinedInput-root": {
                                                                    borderRadius: 1.5,
                                                                },
                                                                "& input": {
                                                                    textAlign: "center",
                                                                    fontWeight: 700,
                                                                    py: 0.5,
                                                                },
                                                            }}
                                                            slotProps={{
                                                                input: {
                                                                    inputProps: { min: 0 },
                                                                },
                                                            }}
                                                        />
                                                    ) : (
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                gap: 0.5,
                                                            }}
                                                        >
                                                            <Chip
                                                                label={displayQtd}
                                                                size="small"
                                                                color={
                                                                    hasDivergencia ? "warning" : "default"
                                                                }
                                                                variant={hasDivergencia ? "filled" : "outlined"}
                                                                sx={{ fontWeight: 700 }}
                                                            />
                                                            <Tooltip title="Editar quantidade encontrada">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() =>
                                                                        handleStartEdit(material)
                                                                    }
                                                                    sx={{
                                                                        p: 0.3,
                                                                        color: "text.secondary",
                                                                        "&:hover": {
                                                                            color: "primary.main",
                                                                            backgroundColor:
                                                                                alpha("#1976d2", 0.1),
                                                                        },
                                                                    }}
                                                                >
                                                                    <EditIcon
                                                                        sx={{ fontSize: 16 }}
                                                                    />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ textAlign: "center" }}>
                                                    {isConferido ? (
                                                        hasDivergencia ? (
                                                            <Chip
                                                                icon={<WarningAmberIcon />}
                                                                label="Divergência"
                                                                size="small"
                                                                color="warning"
                                                                variant="filled"
                                                                sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                                                            />
                                                        ) : (
                                                            <Chip
                                                                icon={<CheckCircleIcon />}
                                                                label="Confere"
                                                                size="small"
                                                                color="success"
                                                                variant="filled"
                                                                sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                                                            />
                                                        )
                                                    ) : (
                                                        <Typography
                                                            variant="caption"
                                                            color="text.disabled"
                                                        >
                                                            Pendente
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </Box>

                        {/* Resumo */}
                        {conferidos.size > 0 && (
                            <Paper
                                sx={{
                                    mx: 3,
                                    my: 2,
                                    p: 2,
                                    borderRadius: 2,
                                    backgroundColor: divergenciaCount > 0 ? "#fff3e0" : "#e8f5e9",
                                    border: "1px solid",
                                    borderColor: divergenciaCount > 0 ? "#ffe0b2" : "#c8e6c9",
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                    Resumo da Conferência
                                </Typography>
                                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                                    <Chip
                                        icon={<CheckCircleIcon />}
                                        label={`${conferidos.size} de ${materiais.length} conferidos`}
                                        size="small"
                                        color="success"
                                        variant="outlined"
                                    />
                                    {divergenciaCount > 0 && (
                                        <Chip
                                            icon={<WarningAmberIcon />}
                                            label={`${divergenciaCount} ${divergenciaCount === 1 ? "divergência" : "divergências"}`}
                                            size="small"
                                            color="warning"
                                            variant="outlined"
                                        />
                                    )}
                                </Box>
                                {divergenciaCount > 0 && (
                                    <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 1.5 }}>
                                        As quantidades divergentes serao atualizadas no sistema ao salvar.
                                    </Alert>
                                )}
                            </Paper>
                        )}
                    </>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    px: { xs: 2, sm: 3 },
                    py: 2,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    gap: 1,
                    flexDirection: { xs: 'column', sm: 'row' },
                }}
            >
                <Button
                    onClick={handleClose}
                    variant="outlined"
                    disabled={saving}
                    fullWidth={fullScreenDialog}
                    sx={{ borderRadius: 2, textTransform: "none" }}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSalvarConferencia}
                    variant="contained"
                    disabled={saving || conferidos.size === 0}
                    fullWidth={fullScreenDialog}
                    startIcon={
                        saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />
                    }
                    sx={{
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 600,
                        px: 3,
                        background: "linear-gradient(135deg, #ff6f00 0%, #e65100 100%)",
                        "&:hover": {
                            background: "linear-gradient(135deg, #e65100 0%, #bf360c 100%)",
                        },
                        "&.Mui-disabled": {
                            background: "#e0e0e0",
                        },
                    }}
                >
                    {saving
                        ? "Salvando..."
                        : hasQuantityChanges
                        ? "Salvar Conferência com Ajustes"
                        : "Registrar Conferência"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
