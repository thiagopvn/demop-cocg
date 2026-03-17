import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Button,
  IconButton,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Paper,
  Fade,
  Divider,
  Container,
  alpha,
} from "@mui/material";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import InventoryIcon from "@mui/icons-material/Inventory";
import SaveIcon from "@mui/icons-material/Save";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import db from "../../firebase/db";
import { verifyToken } from "../../firebase/token";
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";

export default function ConferenciaChefe() {
  // --- Auth state ---
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState("");

  // --- Data state ---
  const [viaturas, setViaturas] = useState([]);
  const [loadingViaturas, setLoadingViaturas] = useState(true);

  // --- Seleção e conferência ---
  const [selectedViatura, setSelectedViatura] = useState(null);
  const [materiais, setMateriais] = useState([]);
  const [loadingMateriais, setLoadingMateriais] = useState(false);
  const [quantidadesEncontradas, setQuantidadesEncontradas] = useState({});

  // --- Finalização ---
  const [saving, setSaving] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [divergencias, setDivergencias] = useState([]);

  // --- Feedback ---
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // ==================== AUTH ====================
  useEffect(() => {
    const fetchAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const decoded = await verifyToken(token);
        setUserId(decoded.userId);
        setUserName(decoded.username || "");
      } catch (err) {
        console.error("Erro ao verificar token:", err);
      }
    };
    fetchAuth();
  }, []);

  // ==================== LOAD VIATURAS (real-time) ====================
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "viaturas"),
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => (a.prefixo || "").localeCompare(b.prefixo || "", "pt-BR"));
        setViaturas(items);
        setLoadingViaturas(false);
      },
      (error) => {
        console.error("Erro ao carregar viaturas:", error);
        setLoadingViaturas(false);
      }
    );
    return () => unsub();
  }, []);

  // ==================== LOAD MATERIAIS DA VIATURA ====================
  const loadMateriais = useCallback(async (viaturaId) => {
    setLoadingMateriais(true);
    try {
      const q = query(
        collection(db, "viatura_materiais"),
        where("viatura_id", "==", viaturaId),
        where("status", "==", "alocado")
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) =>
        (a.material_description || "").localeCompare(b.material_description || "", "pt-BR")
      );
      setMateriais(items);

      // Inicializar quantidades encontradas com as quantidades esperadas
      const qtdMap = {};
      items.forEach((mat) => {
        qtdMap[mat.id] = mat.quantidade;
      });
      setQuantidadesEncontradas(qtdMap);
    } catch (error) {
      console.error("Erro ao buscar materiais:", error);
      setSnackbar({ open: true, message: "Erro ao carregar materiais da viatura.", severity: "error" });
    } finally {
      setLoadingMateriais(false);
    }
  }, []);

  // ==================== SELECIONAR VIATURA ====================
  const handleSelectViatura = (viatura) => {
    setSelectedViatura(viatura);
    loadMateriais(viatura.id);
  };

  const handleVoltar = () => {
    setSelectedViatura(null);
    setMateriais([]);
    setQuantidadesEncontradas({});
    setDivergencias([]);
  };

  // ==================== CONTROLES +/- ====================
  const handleIncrement = (materialId) => {
    setQuantidadesEncontradas((prev) => ({
      ...prev,
      [materialId]: (prev[materialId] || 0) + 1,
    }));
  };

  const handleDecrement = (materialId) => {
    setQuantidadesEncontradas((prev) => ({
      ...prev,
      [materialId]: Math.max(0, (prev[materialId] || 0) - 1),
    }));
  };

  // ==================== CALCULAR DIVERGÊNCIAS ====================
  const calcularDivergencias = useCallback(() => {
    const divs = [];
    materiais.forEach((mat) => {
      const esperada = mat.quantidade;
      const encontrada = quantidadesEncontradas[mat.id] ?? esperada;
      if (encontrada !== esperada) {
        divs.push({
          ...mat,
          quantidade_esperada: esperada,
          quantidade_encontrada: encontrada,
          diferenca: encontrada - esperada,
        });
      }
    });
    return divs;
  }, [materiais, quantidadesEncontradas]);

  // ==================== FINALIZAR CONFERÊNCIA ====================
  const handleFinalizarClick = () => {
    const divs = calcularDivergencias();
    setDivergencias(divs);

    if (divs.length > 0) {
      // Há divergências — abre dialog de confirmação
      setConfirmDialogOpen(true);
    } else {
      // Tudo confere — salva direto
      handleSalvarConferencia(false);
    }
  };

  const handleConfirmarDivergencias = () => {
    setConfirmDialogOpen(false);
    handleSalvarConferencia(true);
  };

  const handleSalvarConferencia = async (temDivergencias) => {
    setSaving(true);
    try {
      const divs = temDivergencias ? divergencias : [];
      const itensConferencia = [];

      // Processar cada material
      for (const mat of materiais) {
        const encontrada = quantidadesEncontradas[mat.id] ?? mat.quantidade;
        const qtdAlterada = encontrada !== mat.quantidade;

        // Atualizar viatura_materiais
        const vmUpdateData = {
          ultima_conferencia: serverTimestamp(),
          conferido_por: userName,
          conferido_por_id: userId,
        };

        if (qtdAlterada) {
          const diferenca = encontrada - mat.quantidade;

          // Verificar estoque se está aumentando na viatura
          if (diferenca > 0) {
            const materialRef = doc(db, "materials", mat.material_id);
            const materialDoc = await getDoc(materialRef);
            if (materialDoc.exists()) {
              const estoqueDisp = materialDoc.data().estoque_atual || 0;
              if (diferenca > estoqueDisp) {
                setSnackbar({
                  open: true,
                  message: `Estoque insuficiente para "${mat.material_description}". Disponivel: ${estoqueDisp}`,
                  severity: "error",
                });
                setSaving(false);
                return;
              }
            }
          }

          vmUpdateData.quantidade = encontrada;
          vmUpdateData.ultima_atualizacao = serverTimestamp();
          vmUpdateData.atualizado_por = userId;
          vmUpdateData.atualizado_por_nome = userName;

          // Ajustar estoque do material (Seção 5 do fluxo)
          const materialRef = doc(db, "materials", mat.material_id);
          const materialDoc = await getDoc(materialRef);
          if (materialDoc.exists()) {
            const materialData = materialDoc.data();
            await updateDoc(materialRef, {
              estoque_atual: Math.max(0, (materialData.estoque_atual || 0) - diferenca),
              estoque_viatura: Math.max(0, (materialData.estoque_viatura || 0) + diferenca),
              ultima_movimentacao: serverTimestamp(),
            });
          }
        }

        await updateDoc(doc(db, "viatura_materiais", mat.id), vmUpdateData);

        itensConferencia.push({
          material_id: mat.material_id,
          material_description: mat.material_description,
          categoria: mat.categoria || "",
          quantidade_esperada: mat.quantidade,
          quantidade_encontrada: encontrada,
          divergencia: qtdAlterada,
        });
      }

      // Atualizar viatura com dados da conferência
      await updateDoc(doc(db, "viaturas", selectedViatura.id), {
        ultima_conferencia: serverTimestamp(),
        conferido_por: userName,
        conferido_por_id: userId,
      });

      // Registrar histórico em conferencias_viaturas
      const totalDivergencias = divs.length;
      await addDoc(collection(db, "conferencias_viaturas"), {
        viatura_id: selectedViatura.id,
        viatura_prefixo: selectedViatura.prefixo,
        viatura_description: selectedViatura.description,
        conferido_por: userName,
        conferido_por_id: userId,
        data_conferencia: serverTimestamp(),
        total_materiais: materiais.length,
        total_conferidos: materiais.length,
        total_divergencias: totalDivergencias,
        itens: itensConferencia,
      });

      // Se houver divergências, criar alertas para o admin
      if (divs.length > 0) {
        for (const div of divs) {
          await addDoc(collection(db, "alertas_conferencia"), {
            viatura_id: selectedViatura.id,
            viatura_prefixo: selectedViatura.prefixo,
            viatura_description: selectedViatura.description || "",
            material_id: div.material_id,
            material_description: div.material_description,
            quantidade_esperada: div.quantidade_esperada,
            quantidade_encontrada: div.quantidade_encontrada,
            diferenca: div.diferenca,
            chefe_id: userId,
            chefe_nome: userName,
            data_alerta: serverTimestamp(),
            lido: false,
          });
        }
      }

      setSnackbar({
        open: true,
        message: totalDivergencias > 0
          ? `Conferencia salva com ${totalDivergencias} divergencia(s) registrada(s).`
          : "Conferencia salva com sucesso! Tudo confere.",
        severity: "success",
      });

      // Voltar para seleção de viaturas
      handleVoltar();
    } catch (error) {
      console.error("Erro ao salvar conferencia:", error);
      setSnackbar({
        open: true,
        message: "Erro ao salvar a conferencia. Tente novamente.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ==================== CONTADORES ====================
  const totalDivergenciasAtual = useMemo(() => {
    let count = 0;
    materiais.forEach((mat) => {
      const encontrada = quantidadesEncontradas[mat.id] ?? mat.quantidade;
      if (encontrada !== mat.quantidade) count++;
    });
    return count;
  }, [materiais, quantidadesEncontradas]);

  // ==================== RENDER ====================
  return (
    <PrivateRoute>
      <MenuContext>
        <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 2 } }}>
          <Fade in timeout={400}>
            <Box>
              {/* HEADER */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.5, sm: 3 },
                  mb: 3,
                  borderRadius: 3,
                  background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)",
                  color: "white",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <FactCheckIcon sx={{ fontSize: { xs: 32, sm: 40 } }} />
                  <Box>
                    <Typography
                      variant="h4"
                      fontWeight={800}
                      sx={{ fontSize: { xs: "1.3rem", sm: "1.8rem" }, lineHeight: 1.2 }}
                    >
                      Conferencia de Viaturas
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ opacity: 0.85, fontSize: { xs: "0.95rem", sm: "1.05rem" }, mt: 0.5 }}
                    >
                      {userName ? `Chefe: ${userName}` : "Carregando..."}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* ==================== SELEÇÃO DE VIATURA ==================== */}
              {!selectedViatura && (
                <Fade in timeout={300}>
                  <Box>
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      sx={{
                        mb: 2,
                        fontSize: { xs: "1.2rem", sm: "1.4rem" },
                        color: "#1e3a5f",
                      }}
                    >
                      Selecione a Viatura
                    </Typography>

                    {loadingViaturas ? (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                        <CircularProgress size={48} sx={{ color: "#1e3a5f" }} />
                      </Box>
                    ) : viaturas.length === 0 ? (
                      <Alert
                        severity="info"
                        sx={{ borderRadius: 2, fontSize: "1rem", py: 2 }}
                      >
                        Nenhuma viatura cadastrada no sistema.
                      </Alert>
                    ) : (
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: "1fr 1fr",
                          },
                          gap: 2,
                        }}
                      >
                        {viaturas.map((viatura) => (
                          <Card
                            key={viatura.id}
                            elevation={2}
                            sx={{
                              borderRadius: 3,
                              border: "2px solid transparent",
                              transition: "all 0.2s ease",
                              "&:hover": {
                                border: "2px solid #1e3a5f",
                                transform: "translateY(-2px)",
                                boxShadow: "0 8px 24px rgba(30,58,95,0.15)",
                              },
                            }}
                          >
                            <CardActionArea
                              onClick={() => handleSelectViatura(viatura)}
                              sx={{ p: 0 }}
                            >
                              <CardContent
                                sx={{
                                  p: { xs: 2.5, sm: 3 },
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 2,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: { xs: 56, sm: 64 },
                                    height: { xs: 56, sm: 64 },
                                    borderRadius: 2,
                                    background: "linear-gradient(135deg, #1e3a5f, #3b82f6)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <DirectionsCarIcon
                                    sx={{ fontSize: { xs: 28, sm: 32 }, color: "white" }}
                                  />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography
                                    variant="h6"
                                    fontWeight={700}
                                    sx={{
                                      fontSize: { xs: "1.15rem", sm: "1.3rem" },
                                      color: "#1e3a5f",
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    {viatura.prefixo || "Sem prefixo"}
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      color: "text.secondary",
                                      fontSize: { xs: "0.9rem", sm: "1rem" },
                                      mt: 0.3,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {viatura.description || "Sem descricao"}
                                  </Typography>
                                  {viatura.ultima_conferencia && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: "text.disabled",
                                        fontSize: "0.8rem",
                                        mt: 0.5,
                                        display: "block",
                                      }}
                                    >
                                      Ultima conf.:{" "}
                                      {viatura.ultima_conferencia?.toDate
                                        ? viatura.ultima_conferencia.toDate().toLocaleDateString("pt-BR")
                                        : ""}
                                    </Typography>
                                  )}
                                </Box>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Fade>
              )}

              {/* ==================== LISTA DE MATERIAIS ==================== */}
              {selectedViatura && (
                <Fade in timeout={300}>
                  <Box>
                    {/* Botão Voltar */}
                    <Button
                      startIcon={<ArrowBackIcon />}
                      onClick={handleVoltar}
                      sx={{
                        mb: 2,
                        fontSize: { xs: "1rem", sm: "1.1rem" },
                        fontWeight: 600,
                        color: "#1e3a5f",
                        py: 1,
                        px: 2,
                        borderRadius: 2,
                        "&:hover": { backgroundColor: alpha("#1e3a5f", 0.08) },
                      }}
                    >
                      Voltar
                    </Button>

                    {/* Info da viatura selecionada */}
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 2, sm: 2.5 },
                        mb: 2,
                        borderRadius: 2,
                        backgroundColor: "#e3f2fd",
                        border: "1px solid #90caf9",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <DirectionsCarIcon sx={{ color: "#1e3a5f", fontSize: 28 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          sx={{ fontSize: { xs: "1.1rem", sm: "1.2rem" }, color: "#1e3a5f" }}
                        >
                          {selectedViatura.prefixo}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary", fontSize: "0.95rem" }}
                        >
                          {selectedViatura.description}
                        </Typography>
                      </Box>
                      {totalDivergenciasAtual > 0 && (
                        <Chip
                          icon={<WarningAmberIcon />}
                          label={`${totalDivergenciasAtual} divergencia(s)`}
                          sx={{
                            backgroundColor: "#fff3e0",
                            color: "#e65100",
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            height: 36,
                            border: "1px solid #ffcc02",
                          }}
                        />
                      )}
                    </Paper>

                    {/* Loading */}
                    {loadingMateriais ? (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                        <CircularProgress size={48} sx={{ color: "#1e3a5f" }} />
                      </Box>
                    ) : materiais.length === 0 ? (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 4,
                          textAlign: "center",
                          borderRadius: 3,
                          border: "1px solid #e0e0e0",
                        }}
                      >
                        <InventoryIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                        <Typography
                          variant="h6"
                          color="text.secondary"
                          sx={{ fontSize: "1.15rem" }}
                        >
                          Nenhum material alocado nesta viatura
                        </Typography>
                      </Paper>
                    ) : (
                      <>
                        {/* Lista de materiais — cards grandes e touch-friendly */}
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 14 }}>
                          {materiais.map((mat) => {
                            const esperada = mat.quantidade;
                            const encontrada = quantidadesEncontradas[mat.id] ?? esperada;
                            const temDivergencia = encontrada !== esperada;

                            return (
                              <Paper
                                key={mat.id}
                                elevation={temDivergencia ? 3 : 1}
                                sx={{
                                  p: { xs: 2, sm: 2.5 },
                                  borderRadius: 2.5,
                                  border: temDivergencia
                                    ? "2px solid #ff9800"
                                    : "1px solid #e0e0e0",
                                  backgroundColor: temDivergencia
                                    ? "#fff8e1"
                                    : "#ffffff",
                                  transition: "all 0.2s ease",
                                }}
                              >
                                {/* Nome do material e categoria */}
                                <Typography
                                  variant="h6"
                                  fontWeight={700}
                                  sx={{
                                    fontSize: { xs: "1.05rem", sm: "1.15rem" },
                                    color: "#1e3a5f",
                                    mb: 0.5,
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {mat.material_description}
                                </Typography>
                                {mat.categoria && (
                                  <Chip
                                    label={mat.categoria}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      mb: 1.5,
                                      fontSize: "0.8rem",
                                      height: 26,
                                    }}
                                  />
                                )}

                                <Divider sx={{ my: 1 }} />

                                {/* Linha: Esperada → Encontrada */}
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                    gap: 1.5,
                                  }}
                                >
                                  {/* Quantidade Esperada */}
                                  <Box sx={{ textAlign: "center" }}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                                        fontWeight: 600,
                                        color: "text.secondary",
                                        display: "block",
                                        mb: 0.5,
                                      }}
                                    >
                                      ESPERADA
                                    </Typography>
                                    <Chip
                                      label={esperada}
                                      sx={{
                                        fontSize: { xs: "1.1rem", sm: "1.2rem" },
                                        fontWeight: 800,
                                        height: { xs: 40, sm: 44 },
                                        minWidth: { xs: 56, sm: 64 },
                                        backgroundColor: "#e3f2fd",
                                        color: "#1565c0",
                                        border: "2px solid #90caf9",
                                        "& .MuiChip-label": { px: 2 },
                                      }}
                                    />
                                  </Box>

                                  {/* Controle de Quantidade Encontrada */}
                                  <Box sx={{ textAlign: "center" }}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                                        fontWeight: 600,
                                        color: temDivergencia ? "#e65100" : "text.secondary",
                                        display: "block",
                                        mb: 0.5,
                                      }}
                                    >
                                      ENCONTRADA
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: { xs: 0.5, sm: 1 },
                                      }}
                                    >
                                      {/* Botão MENOS */}
                                      <IconButton
                                        onClick={() => handleDecrement(mat.id)}
                                        disabled={encontrada <= 0}
                                        sx={{
                                          width: { xs: 48, sm: 56 },
                                          height: { xs: 48, sm: 56 },
                                          borderRadius: 2,
                                          backgroundColor: "#ffebee",
                                          color: "#d32f2f",
                                          border: "2px solid #ef9a9a",
                                          "&:hover": {
                                            backgroundColor: "#ffcdd2",
                                          },
                                          "&.Mui-disabled": {
                                            backgroundColor: "#f5f5f5",
                                            color: "#bdbdbd",
                                            border: "2px solid #e0e0e0",
                                          },
                                        }}
                                      >
                                        <RemoveIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
                                      </IconButton>

                                      {/* Valor central */}
                                      <Box
                                        sx={{
                                          minWidth: { xs: 56, sm: 64 },
                                          height: { xs: 48, sm: 56 },
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          borderRadius: 2,
                                          backgroundColor: temDivergencia ? "#fff3e0" : "#f5f5f5",
                                          border: temDivergencia
                                            ? "2px solid #ff9800"
                                            : "2px solid #e0e0e0",
                                        }}
                                      >
                                        <Typography
                                          variant="h5"
                                          fontWeight={800}
                                          sx={{
                                            fontSize: { xs: "1.3rem", sm: "1.5rem" },
                                            color: temDivergencia ? "#e65100" : "#1e3a5f",
                                          }}
                                        >
                                          {encontrada}
                                        </Typography>
                                      </Box>

                                      {/* Botão MAIS */}
                                      <IconButton
                                        onClick={() => handleIncrement(mat.id)}
                                        sx={{
                                          width: { xs: 48, sm: 56 },
                                          height: { xs: 48, sm: 56 },
                                          borderRadius: 2,
                                          backgroundColor: "#e8f5e9",
                                          color: "#2e7d32",
                                          border: "2px solid #a5d6a7",
                                          "&:hover": {
                                            backgroundColor: "#c8e6c9",
                                          },
                                        }}
                                      >
                                        <AddIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
                                      </IconButton>
                                    </Box>
                                  </Box>
                                </Box>

                                {/* Indicador de divergência */}
                                {temDivergencia && (
                                  <Alert
                                    severity="warning"
                                    icon={<WarningAmberIcon sx={{ fontSize: 22 }} />}
                                    sx={{
                                      mt: 1.5,
                                      borderRadius: 2,
                                      fontSize: { xs: "0.9rem", sm: "0.95rem" },
                                      fontWeight: 600,
                                      "& .MuiAlert-message": { fontWeight: 600 },
                                    }}
                                  >
                                    Diferenca: {encontrada - esperada > 0 ? "+" : ""}
                                    {encontrada - esperada} unidade(s)
                                  </Alert>
                                )}
                              </Paper>
                            );
                          })}
                        </Box>

                        {/* ==================== BOTÃO FIXO FINALIZAR ==================== */}
                        <Paper
                          elevation={8}
                          sx={{
                            position: "fixed",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            p: { xs: 2, sm: 2.5 },
                            borderRadius: "16px 16px 0 0",
                            backgroundColor: "rgba(255,255,255,0.98)",
                            backdropFilter: "blur(12px)",
                            borderTop: "1px solid #e0e0e0",
                            zIndex: 1200,
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: "md",
                              mx: "auto",
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            {/* Resumo */}
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                                  color: "text.secondary",
                                }}
                              >
                                {materiais.length} material(is)
                                {totalDivergenciasAtual > 0 && (
                                  <Chip
                                    size="small"
                                    label={`${totalDivergenciasAtual} alteracao(oes)`}
                                    sx={{
                                      ml: 1,
                                      fontWeight: 700,
                                      backgroundColor: "#fff3e0",
                                      color: "#e65100",
                                      fontSize: "0.75rem",
                                    }}
                                  />
                                )}
                              </Typography>
                            </Box>

                            {/* Botão Finalizar */}
                            <Button
                              variant="contained"
                              size="large"
                              onClick={handleFinalizarClick}
                              disabled={saving || materiais.length === 0}
                              startIcon={
                                saving ? (
                                  <CircularProgress size={22} color="inherit" />
                                ) : (
                                  <SaveIcon sx={{ fontSize: 24 }} />
                                )
                              }
                              sx={{
                                py: { xs: 1.5, sm: 1.8 },
                                px: { xs: 3, sm: 4 },
                                borderRadius: 3,
                                fontSize: { xs: "1rem", sm: "1.1rem" },
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                background:
                                  "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)",
                                boxShadow: "0 6px 20px rgba(30,58,95,0.3)",
                                "&:hover": {
                                  background:
                                    "linear-gradient(135deg, #162d4a 0%, #1e3a5f 100%)",
                                  boxShadow: "0 8px 28px rgba(30,58,95,0.4)",
                                },
                                "&.Mui-disabled": {
                                  background: "#bdbdbd",
                                },
                              }}
                            >
                              {saving ? "Salvando..." : "Finalizar Conferencia"}
                            </Button>
                          </Box>
                        </Paper>
                      </>
                    )}
                  </Box>
                </Fade>
              )}
            </Box>
          </Fade>

          {/* ==================== DIALOG DE DIVERGÊNCIAS ==================== */}
          <Dialog
            open={confirmDialogOpen}
            onClose={() => !saving && setConfirmDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                overflow: "hidden",
              },
            }}
          >
            <DialogTitle
              sx={{
                background: "linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                py: 2.5,
              }}
            >
              <WarningAmberIcon sx={{ fontSize: 32 }} />
              <Typography variant="h6" fontWeight={800} sx={{ fontSize: "1.15rem" }}>
                Atencao: Divergencias Encontradas
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ p: 3, pt: 3 }}>
              <Alert
                severity="warning"
                sx={{
                  mb: 2.5,
                  borderRadius: 2,
                  fontSize: "1rem",
                  fontWeight: 500,
                }}
              >
                Os itens abaixo possuem quantidades diferentes do registrado no sistema.
                Confirme se deseja salvar essas alteracoes.
              </Alert>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {divergencias.map((div) => (
                  <Paper
                    key={div.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: "#fff3e0",
                      border: "1px solid #ffcc80",
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      sx={{ fontSize: "1.05rem", color: "#1e3a5f", mb: 0.5 }}
                    >
                      {div.material_description}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Chip
                        label={`Sistema: ${div.quantidade_esperada}`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          height: 30,
                          backgroundColor: "#e3f2fd",
                          color: "#1565c0",
                        }}
                      />
                      <Typography
                        sx={{ fontSize: "1.2rem", fontWeight: 800, color: "#e65100" }}
                      >
                        →
                      </Typography>
                      <Chip
                        label={`Encontrado: ${div.quantidade_encontrada}`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          height: 30,
                          backgroundColor:
                            div.diferenca < 0 ? "#ffebee" : "#e8f5e9",
                          color: div.diferenca < 0 ? "#c62828" : "#2e7d32",
                        }}
                      />
                      <Chip
                        label={`${div.diferenca > 0 ? "+" : ""}${div.diferenca}`}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.9rem",
                          height: 30,
                          backgroundColor:
                            div.diferenca < 0 ? "#d32f2f" : "#2e7d32",
                          color: "white",
                        }}
                      />
                    </Box>
                  </Paper>
                ))}
              </Box>
            </DialogContent>
            <DialogActions
              sx={{
                px: 3,
                py: 2.5,
                borderTop: "1px solid #e0e0e0",
                gap: 1.5,
              }}
            >
              <Button
                onClick={() => setConfirmDialogOpen(false)}
                variant="outlined"
                disabled={saving}
                sx={{
                  borderRadius: 2,
                  fontSize: "1rem",
                  fontWeight: 600,
                  py: 1.2,
                  px: 3,
                  textTransform: "none",
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarDivergencias}
                variant="contained"
                disabled={saving}
                startIcon={
                  saving ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <CheckCircleIcon />
                  )
                }
                sx={{
                  borderRadius: 2,
                  fontSize: "1rem",
                  fontWeight: 700,
                  py: 1.2,
                  px: 3,
                  textTransform: "none",
                  background:
                    "linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #b71c1c 0%, #880e0e 100%)",
                  },
                }}
              >
                {saving ? "Salvando..." : "Confirmar Alteracoes"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* ==================== SNACKBAR ==================== */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={5000}
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Alert
              onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
              severity={snackbar.severity}
              variant="filled"
              sx={{
                width: "100%",
                borderRadius: 2,
                fontSize: "1rem",
                fontWeight: 600,
              }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>
      </MenuContext>
    </PrivateRoute>
  );
}
