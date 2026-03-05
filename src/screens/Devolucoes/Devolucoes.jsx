import UserSearch from "../../components/UserSearch";
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import { useState, useEffect, useMemo } from "react";
import { verifyToken } from "../../firebase/token";
import {
  Box,
  Typography,
  Chip,
  Switch,
  FormControlLabel,
  Paper,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
  useMediaQuery,
  Collapse,
  Fade,
  Grow,
  Skeleton,
  Snackbar,
  Alert,
  Dialog,
  DialogContent,
  Button,
  Stack,
  Divider,
  Avatar,
  LinearProgress,
  Grid,
} from "@mui/material";
import {
  AssignmentReturn,
  Build,
  Person,
  CalendarToday,
  Inventory2,
  CheckCircle,
  SearchOff,
  SwapHoriz,
  Notes,
  WarningAmber,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Close,
  AccessTime,
  ArrowForward,
  Category,
} from "@mui/icons-material";
import db from "../../firebase/db";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

// ─── Stat Card ──────────────────────────────────────────────
const StatBadge = ({ icon: Icon, label, value, color, theme }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      px: 2.5,
      py: 1.5,
      borderRadius: 3,
      backgroundColor: alpha(color, 0.06),
      border: `1px solid ${alpha(color, 0.15)}`,
      minWidth: 140,
      transition: "all 0.2s ease",
      "&:hover": {
        backgroundColor: alpha(color, 0.1),
        borderColor: alpha(color, 0.3),
      },
    }}
  >
    <Avatar
      sx={{
        width: 36,
        height: 36,
        bgcolor: alpha(color, 0.12),
        color: color,
      }}
    >
      <Icon sx={{ fontSize: 18 }} />
    </Avatar>
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color, lineHeight: 1.2 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500, fontSize: "0.7rem" }}>
        {label}
      </Typography>
    </Box>
  </Box>
);

// ─── Item Card ──────────────────────────────────────────────
const ItemCard = ({ mov, isPendente, onDevolver, formatDate, theme, index }) => {
  const isDevolvido = mov.status === "devolvido" || mov.status === "devolvidaDeReparo";
  const accentColor = isPendente ? theme.palette.warning.main : theme.palette.success.main;

  return (
    <Grow in timeout={300 + index * 80}>
      <Card
        sx={{
          position: "relative",
          overflow: "visible",
          border: `1px solid ${alpha(accentColor, 0.15)}`,
          backgroundColor: "background.paper",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: { xs: "none", sm: "translateY(-3px)" },
            boxShadow: `0 12px 32px ${alpha(accentColor, 0.15)}`,
            borderColor: alpha(accentColor, 0.35),
          },
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            borderRadius: "12px 12px 0 0",
            background: `linear-gradient(90deg, ${accentColor} 0%, ${alpha(accentColor, 0.4)} 100%)`,
          },
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
          {/* Top row: material + status */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5, gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: alpha(accentColor, 0.1),
                  color: accentColor,
                  flexShrink: 0,
                }}
              >
                <Inventory2 sx={{ fontSize: 20 }} />
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {mov.material_description}
                </Typography>
                {mov.categoria && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Category sx={{ fontSize: 12, color: "text.disabled" }} />
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
                      {mov.categoria}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
            <Chip
              icon={isDevolvido ? <CheckCircle sx={{ fontSize: 14 }} /> : <AccessTime sx={{ fontSize: 14 }} />}
              label={isDevolvido ? "Devolvido" : "Pendente"}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: "0.7rem",
                height: 26,
                borderRadius: 2,
                flexShrink: 0,
                backgroundColor: alpha(accentColor, 0.1),
                color: isPendente ? theme.palette.warning.dark : theme.palette.success.dark,
                border: `1px solid ${alpha(accentColor, 0.25)}`,
                "& .MuiChip-icon": { color: "inherit" },
              }}
            />
          </Box>

          {/* Info row */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: { xs: 1, sm: 2 },
              mb: isPendente ? 2 : 0,
              py: 1,
              px: 1.5,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.02),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.06)}`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <CalendarToday sx={{ fontSize: 14, color: "text.disabled" }} />
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {formatDate(mov.date)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Inventory2 sx={{ fontSize: 14, color: "text.disabled" }} />
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                Qtd: <strong>{mov.quantity}</strong>
              </Typography>
            </Box>
            {mov.user_name && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Person sx={{ fontSize: 14, color: "text.disabled" }} />
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  {mov.user_name}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Observacoes */}
          {mov.observacoes && (
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 0.5,
                mt: 1,
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                backgroundColor: alpha(theme.palette.info.main, 0.04),
                border: `1px solid ${alpha(theme.palette.info.main, 0.08)}`,
              }}
            >
              <Notes sx={{ fontSize: 14, color: theme.palette.info.main, mt: 0.2 }} />
              <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-word", fontStyle: "italic" }}>
                {mov.observacoes}
              </Typography>
            </Box>
          )}

          {/* Action area */}
          {isPendente && (
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5 }}>
              <Button
                variant="contained"
                size="medium"
                startIcon={<AssignmentReturn />}
                endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
                onClick={() => onDevolver(mov)}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2.5,
                  px: 3,
                  py: 1,
                  fontSize: "0.85rem",
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                  "&:hover": {
                    boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.45)}`,
                    transform: "translateY(-1px)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                Devolver Material
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grow>
  );
};

// ─── Main Component ─────────────────────────────────────────
export default function Devolucoes() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [userRole, setUserRole] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [includeReparo, setIncludeReparo] = useState(false);
  const [userCritery, setUserCritery] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, item: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showDevolvidos, setShowDevolvidos] = useState(false);
  const [devolvendo, setDevolvendo] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      const token = localStorage.getItem("token");
      const user = await verifyToken(token);
      setUserRole(user.role);
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (!selectedUser && !includeReparo) {
      setMovimentacoes([]);
      return;
    }

    const fetchMovimentacoes = async () => {
      setLoading(true);
      try {
        let q;
        if (includeReparo) {
          q = query(collection(db, "movimentacoes"), where("type", "==", "reparo"));
        } else {
          q = query(
            collection(db, "movimentacoes"),
            where("user", "==", selectedUser.id),
            where("type", "==", "cautela")
          );
        }

        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((docSnap) => {
          results.push({ id: docSnap.id, ...docSnap.data() });
        });
        setMovimentacoes(results);
      } catch (error) {
        console.error("Erro ao buscar movimentacoes:", error);
        setSnackbar({ open: true, message: "Erro ao buscar movimentacoes.", severity: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchMovimentacoes();
  }, [selectedUser, includeReparo]);

  const { pendentes, devolvidos } = useMemo(() => {
    const p = [];
    const d = [];
    movimentacoes.forEach((m) => {
      if (m.status === "devolvido" || m.status === "devolvidaDeReparo") {
        d.push(m);
      } else {
        p.push(m);
      }
    });
    return { pendentes: p, devolvidos: d };
  }, [movimentacoes]);

  const progressPercent = movimentacoes.length > 0 ? (devolvidos.length / movimentacoes.length) * 100 : 0;

  const handleDevolver = async (movimentacao) => {
    setDevolvendo(true);
    try {
      const docRef = doc(db, "movimentacoes", movimentacao.id);
      const newStatus = includeReparo ? "devolvidaDeReparo" : "devolvido";
      await updateDoc(docRef, {
        status: newStatus,
        returned_date: serverTimestamp(),
        user_acknowledged_return: false,
      });

      const materialId = movimentacao.material;
      const docRefMaterial = doc(db, "materials", materialId);
      const materialSnap = await getDoc(docRefMaterial);

      if (materialSnap.exists()) {
        const materialData = materialSnap.data();
        const quantidadeDevolvida = movimentacao.quantity;
        const quantidadeAtual = materialData.estoque_atual || 0;
        const novaQuantidade = quantidadeAtual + quantidadeDevolvida;
        await updateDoc(docRefMaterial, { estoque_atual: novaQuantidade });
      }

      setMovimentacoes((prev) =>
        prev.map((m) =>
          m.id === movimentacao.id ? { ...m, status: newStatus, returned_date: new Date() } : m
        )
      );

      setSnackbar({
        open: true,
        message: `"${movimentacao.material_description}" devolvido com sucesso! Estoque atualizado.`,
        severity: "success",
      });
    } catch (error) {
      console.error("Erro ao devolver material:", error);
      setSnackbar({ open: true, message: "Erro ao devolver material. Tente novamente.", severity: "error" });
    } finally {
      setDevolvendo(false);
    }
  };

  const handleConfirmDevolver = () => {
    if (confirmDialog.item) {
      handleDevolver(confirmDialog.item);
    }
    setConfirmDialog({ open: false, item: null });
  };

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return "-";
    }
  };

  const hasResults = selectedUser || includeReparo;

  return (
    <PrivateRoute>
      <MenuContext>
        <div className="root-protected">
          {userRole === "admin" || userRole === "editor" || userRole === "admingeral" ? (
            <Box sx={{ width: "100%" }}>
              {/* ═══ HERO HEADER ═══ */}
              <Paper
                elevation={0}
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 4,
                  mb: 3,
                  p: { xs: 3, sm: 4 },
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 50%, #0a1628 100%)`,
                  color: "white",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: -60,
                    right: -60,
                    width: 200,
                    height: 200,
                    borderRadius: "50%",
                    background: alpha("#fff", 0.04),
                  },
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    bottom: -40,
                    left: "30%",
                    width: 150,
                    height: 150,
                    borderRadius: "50%",
                    background: alpha("#fff", 0.03),
                  },
                }}
              >
                <Box sx={{ position: "relative", zIndex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: alpha("#fff", 0.15),
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <AssignmentReturn sx={{ fontSize: 26 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
                        Central de Devoluções
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ opacity: 0.7, fontWeight: 400, mt: 0.2 }}
                      >
                        Gerencie devoluções de materiais cautelados e reparos
                      </Typography>
                    </Box>
                  </Box>

                  {/* Progress bar when has data */}
                  {hasResults && movimentacoes.length > 0 && (
                    <Fade in>
                      <Box sx={{ mt: 3 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                          <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 500 }}>
                            Progresso de devoluções
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            {Math.round(progressPercent)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={progressPercent}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: alpha("#fff", 0.15),
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 4,
                              background: `linear-gradient(90deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`,
                            },
                          }}
                        />
                      </Box>
                    </Fade>
                  )}

                  {/* Stats row */}
                  {hasResults && movimentacoes.length > 0 && (
                    <Fade in>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1.5,
                          mt: 2.5,
                        }}
                      >
                        <StatBadge
                          icon={WarningAmber}
                          label="Pendentes"
                          value={pendentes.length}
                          color={theme.palette.warning.light}
                          theme={theme}
                        />
                        <StatBadge
                          icon={CheckCircle}
                          label="Devolvidos"
                          value={devolvidos.length}
                          color={theme.palette.success.light}
                          theme={theme}
                        />
                        <StatBadge
                          icon={Inventory2}
                          label="Total"
                          value={movimentacoes.length}
                          color={alpha("#fff", 0.8)}
                          theme={theme}
                        />
                      </Box>
                    </Fade>
                  )}
                </Box>
              </Paper>

              {/* ═══ MODE TOGGLE + SEARCH ═══ */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 3 },
                  mb: 3,
                  borderRadius: 4,
                  border: `1px solid ${theme.palette.divider}`,
                  background: theme.palette.background.paper,
                }}
              >
                {/* Toggle */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1,
                    mb: includeReparo ? 0 : 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 2,
                      py: 1,
                      borderRadius: 3,
                      backgroundColor: includeReparo
                        ? alpha(theme.palette.secondary.main, 0.08)
                        : alpha(theme.palette.primary.main, 0.04),
                      border: `1px solid ${
                        includeReparo
                          ? alpha(theme.palette.secondary.main, 0.2)
                          : alpha(theme.palette.primary.main, 0.08)
                      }`,
                      transition: "all 0.3s ease",
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: includeReparo
                          ? alpha(theme.palette.secondary.main, 0.15)
                          : alpha(theme.palette.primary.main, 0.08),
                        color: includeReparo ? theme.palette.secondary.main : "text.disabled",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <Build sx={{ fontSize: 16 }} />
                    </Avatar>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={includeReparo}
                          onChange={(e) => {
                            setIncludeReparo(e.target.checked);
                            if (e.target.checked) {
                              setSelectedUser(null);
                              setUserCritery("");
                            }
                          }}
                          color="secondary"
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.85rem" }}>
                          {includeReparo ? "Modo Reparos" : "Modo Cautelas"}
                        </Typography>
                      }
                      sx={{ m: 0 }}
                    />
                  </Box>

                  {selectedUser && !includeReparo && (
                    <Fade in>
                      <Chip
                        avatar={
                          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.15) }}>
                            <Person sx={{ fontSize: 16, color: theme.palette.primary.main }} />
                          </Avatar>
                        }
                        label={selectedUser.full_name}
                        onDelete={() => {
                          setSelectedUser(null);
                          setUserCritery("");
                        }}
                        deleteIcon={<Close sx={{ fontSize: 16 }} />}
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          height: 40,
                          borderRadius: 3,
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                          backgroundColor: alpha(theme.palette.primary.main, 0.05),
                          "& .MuiChip-deleteIcon": {
                            color: "text.secondary",
                            "&:hover": { color: theme.palette.error.main },
                          },
                        }}
                      />
                    </Fade>
                  )}
                </Box>

                {/* Search */}
                <Collapse in={!includeReparo}>
                  <UserSearch
                    onSelectUser={setSelectedUser}
                    userCritery={userCritery}
                    onSetUserCritery={setUserCritery}
                  />
                </Collapse>
              </Paper>

              {/* ═══ LOADING STATE ═══ */}
              {loading && (
                <Box>
                  <Grid container spacing={2}>
                    {[1, 2, 3, 4].map((i) => (
                      <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
                        <Skeleton variant="rounded" height={180} sx={{ borderRadius: 4 }} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* ═══ EMPTY STATE ═══ */}
              {!loading && !hasResults && (
                <Fade in>
                  <Paper
                    elevation={0}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      py: { xs: 8, sm: 10 },
                      px: 3,
                      borderRadius: 4,
                      border: `2px dashed ${alpha(theme.palette.primary.main, 0.15)}`,
                      backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        mb: 3,
                      }}
                    >
                      <Person sx={{ fontSize: 40, color: theme.palette.primary.light }} />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary", mb: 1 }}>
                      Selecione um militar
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      textAlign="center"
                      maxWidth={400}
                      sx={{ lineHeight: 1.7 }}
                    >
                      Pesquise e selecione um militar no campo acima para visualizar
                      suas cautelas e realizar devoluções de materiais.
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ mt: 2, display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Build sx={{ fontSize: 14 }} />
                      Ou ative o Modo Reparos para gerenciar devoluções de materiais em reparo
                    </Typography>
                  </Paper>
                </Fade>
              )}

              {/* ═══ NO RESULTS STATE ═══ */}
              {!loading && hasResults && movimentacoes.length === 0 && (
                <Fade in>
                  <Paper
                    elevation={0}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      py: { xs: 6, sm: 8 },
                      px: 3,
                      borderRadius: 4,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 72,
                        height: 72,
                        bgcolor: alpha(theme.palette.info.main, 0.08),
                        mb: 2.5,
                      }}
                    >
                      <SearchOff sx={{ fontSize: 36, color: theme.palette.info.light }} />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Nenhuma movimentação encontrada
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={360}>
                      {includeReparo
                        ? "Não existem movimentações de reparo registradas no momento."
                        : "Este militar não possui cautelas registradas no sistema."}
                    </Typography>
                  </Paper>
                </Fade>
              )}

              {/* ═══ PENDENTES SECTION ═══ */}
              {!loading && pendentes.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: alpha(theme.palette.warning.main, 0.12),
                        color: theme.palette.warning.main,
                      }}
                    >
                      <WarningAmber sx={{ fontSize: 20 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        Pendentes de Devolução
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pendentes.length} {pendentes.length === 1 ? "material aguardando" : "materiais aguardando"} devolução
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    {pendentes.map((mov, index) => (
                      <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={mov.id}>
                        <ItemCard
                          mov={mov}
                          isPendente
                          onDevolver={(item) => setConfirmDialog({ open: true, item })}
                          formatDate={formatDate}
                          theme={theme}
                          index={index}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* ═══ DEVOLVIDOS SECTION ═══ */}
              {!loading && devolvidos.length > 0 && (
                <Box>
                  <Box
                    onClick={() => setShowDevolvidos(!showDevolvidos)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      py: 1.5,
                      px: 2,
                      borderRadius: 3,
                      mb: showDevolvidos ? 2.5 : 0,
                      backgroundColor: alpha(theme.palette.success.main, 0.04),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.12)}`,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: alpha(theme.palette.success.main, 0.08),
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: alpha(theme.palette.success.main, 0.12),
                          color: theme.palette.success.main,
                        }}
                      >
                        <CheckCircle sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                          Devolvidos
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {devolvidos.length} {devolvidos.length === 1 ? "item" : "itens"}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton size="small" sx={{ color: theme.palette.success.main }}>
                      {showDevolvidos ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                  </Box>

                  <Collapse in={showDevolvidos}>
                    <Grid container spacing={2}>
                      {devolvidos.map((mov, index) => (
                        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={mov.id}>
                          <ItemCard
                            mov={mov}
                            isPendente={false}
                            onDevolver={() => {}}
                            formatDate={formatDate}
                            theme={theme}
                            index={index}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Collapse>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 8 }}>
              <Alert severity="warning" variant="outlined" sx={{ borderRadius: 3 }}>
                Sem permissão para acessar este recurso
              </Alert>
            </Box>
          )}

          {/* ═══ CONFIRM DIALOG ═══ */}
          <Dialog
            open={confirmDialog.open}
            onClose={() => !devolvendo && setConfirmDialog({ open: false, item: null })}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 4,
                overflow: "hidden",
              },
            }}
          >
            {/* Dialog header with gradient */}
            <Box
              sx={{
                p: 3,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Avatar
                sx={{
                  width: 52,
                  height: 52,
                  bgcolor: alpha("#fff", 0.15),
                  backdropFilter: "blur(10px)",
                }}
              >
                <AssignmentReturn sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Confirmar Devolução
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  Revise os detalhes antes de confirmar
                </Typography>
              </Box>
            </Box>

            <DialogContent sx={{ p: 3, pt: 3 }}>
              {confirmDialog.item && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    O material abaixo será devolvido ao estoque e o militar será notificado da devolução.
                  </Typography>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      border: `1px solid ${theme.palette.divider}`,
                      backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                      <Avatar
                        sx={{
                          width: 44,
                          height: 44,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                        }}
                      >
                        <Inventory2 />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {confirmDialog.item.material_description}
                        </Typography>
                        {confirmDialog.item.categoria && (
                          <Typography variant="caption" color="text.disabled">
                            {confirmDialog.item.categoria}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          Quantidade
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {confirmDialog.item.quantity}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          Data da Cautela
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {formatDate(confirmDialog.item.date)}
                        </Typography>
                      </Grid>
                      {confirmDialog.item.user_name && (
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            Militar
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {confirmDialog.item.user_name}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>

                  <Alert
                    severity="info"
                    variant="outlined"
                    sx={{ mt: 2.5, borderRadius: 2, "& .MuiAlert-message": { fontSize: "0.8rem" } }}
                  >
                    A quantidade será adicionada de volta ao estoque atual do material.
                  </Alert>
                </Box>
              )}
            </DialogContent>

            <Box sx={{ p: 2.5, pt: 0, display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
              <Button
                onClick={() => setConfirmDialog({ open: false, item: null })}
                disabled={devolvendo}
                sx={{
                  color: "text.secondary",
                  px: 3,
                  borderRadius: 2.5,
                  "&:hover": { backgroundColor: alpha(theme.palette.error.main, 0.06) },
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmDevolver}
                disabled={devolvendo}
                startIcon={devolvendo ? null : <AssignmentReturn />}
                sx={{
                  px: 4,
                  py: 1.2,
                  borderRadius: 2.5,
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                  "&:hover": {
                    boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.5)}`,
                  },
                }}
              >
                {devolvendo ? "Devolvendo..." : "Confirmar Devolução"}
              </Button>
            </Box>
          </Dialog>

          {/* ═══ SNACKBAR ═══ */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={5000}
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert
              onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
              severity={snackbar.severity}
              variant="filled"
              sx={{
                borderRadius: 3,
                fontWeight: 600,
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                minWidth: { xs: "90vw", sm: 400 },
              }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </div>
      </MenuContext>
    </PrivateRoute>
  );
}
