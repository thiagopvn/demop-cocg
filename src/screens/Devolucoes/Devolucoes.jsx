import UserSearch from "../../components/UserSearch";
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import { useState, useEffect, useMemo, useCallback } from "react";
import { verifyToken } from "../../firebase/token";
import { logAudit } from "../../firebase/auditLog";
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
  CircularProgress,
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import {
  AssignmentReturn,
  Build,
  Person,
  CalendarToday,
  Inventory2,
  CheckCircle,
  SearchOff,
  Notes,
  WarningAmber,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Close,
  AccessTime,
  ArrowForward,
  Category,
  Refresh,
  Numbers,
  SwapHoriz,
  ExpandMore,
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

// ─── Animated Counter ───────────────────────────────────────
const AnimatedNumber = ({ value, color }) => (
  <Typography
    variant="h3"
    sx={{
      fontWeight: 800,
      color,
      lineHeight: 1,
      letterSpacing: "-0.03em",
      fontFeatureSettings: '"tnum"',
      fontSize: { xs: "2rem", sm: "2.5rem" },
    }}
  >
    {value}
  </Typography>
);

// ─── Stat Card (glass-morphism style in hero) ───────────────
const GlassStatCard = ({ icon: Icon, label, value, color }) => (
  <Box
    sx={{
      flex: { xs: "1 1 100%", sm: "1 1 0" },
      minWidth: { xs: "unset", sm: 160 },
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 1,
      py: { xs: 2, sm: 3 },
      px: 2,
      borderRadius: 3,
      backgroundColor: alpha("#fff", 0.07),
      backdropFilter: "blur(12px)",
      border: `1px solid ${alpha("#fff", 0.1)}`,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      "&:hover": {
        backgroundColor: alpha("#fff", 0.12),
        transform: "translateY(-2px)",
        border: `1px solid ${alpha("#fff", 0.18)}`,
      },
    }}
  >
    <Avatar
      sx={{
        width: 44,
        height: 44,
        bgcolor: alpha(color, 0.2),
        color,
        mb: 0.5,
      }}
    >
      <Icon sx={{ fontSize: 22 }} />
    </Avatar>
    <AnimatedNumber value={value} color={color} />
    <Typography
      variant="caption"
      sx={{
        color: alpha("#fff", 0.65),
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontSize: "0.65rem",
      }}
    >
      {label}
    </Typography>
  </Box>
);

// ─── Item Card (completely redesigned) ──────────────────────
const ItemCard = ({ mov, isPendente, onDevolver, formatDate, theme, index }) => {
  const isDevolvido = mov.status === "devolvido" || mov.status === "devolvidaDeReparo";
  const accentColor = isPendente ? theme.palette.warning.main : theme.palette.success.main;
  const accentDark = isPendente ? theme.palette.warning.dark : theme.palette.success.dark;

  return (
    <Grow in timeout={200 + index * 60}>
      <Card
        sx={{
          height: "100%",
          position: "relative",
          overflow: "hidden",
          border: "1px solid",
          borderColor: alpha(accentColor, 0.12),
          background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${alpha(accentColor, 0.02)} 100%)`,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: { xs: "none", sm: "translateY(-4px) scale(1.01)" },
            boxShadow: `0 20px 40px ${alpha(accentColor, 0.12)}, 0 4px 12px ${alpha(accentColor, 0.08)}`,
            borderColor: alpha(accentColor, 0.3),
            "& .card-accent-bar": {
              height: 5,
            },
          },
        }}
      >
        {/* Top accent bar */}
        <Box
          className="card-accent-bar"
          sx={{
            height: 4,
            background: `linear-gradient(90deg, ${accentColor} 0%, ${alpha(accentColor, 0.3)} 100%)`,
            transition: "height 0.3s ease",
          }}
        />

        <CardContent sx={{ p: { xs: 2.5, sm: 3 }, "&:last-child": { pb: { xs: 2.5, sm: 3 } } }}>
          {/* Header: icon + material + status */}
          <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: alpha(accentColor, 0.08),
                color: accentColor,
                flexShrink: 0,
                border: `2px solid ${alpha(accentColor, 0.15)}`,
              }}
            >
              <Inventory2 sx={{ fontSize: 22 }} />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Tooltip title={mov.material_description} placement="top" arrow>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "0.95rem",
                  }}
                >
                  {mov.material_description}
                </Typography>
              </Tooltip>
              {mov.categoria && (
                <Chip
                  icon={<Category sx={{ fontSize: 12 }} />}
                  label={mov.categoria}
                  size="small"
                  sx={{
                    height: 20,
                    mt: 0.5,
                    fontSize: "0.6rem",
                    fontWeight: 500,
                    backgroundColor: alpha(theme.palette.primary.main, 0.06),
                    color: "text.secondary",
                    "& .MuiChip-icon": { color: "text.disabled" },
                  }}
                />
              )}
            </Box>
            <Chip
              icon={isDevolvido ? <CheckCircle sx={{ fontSize: 14 }} /> : <AccessTime sx={{ fontSize: 14 }} />}
              label={isDevolvido ? "Devolvido" : "Pendente"}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: "0.7rem",
                height: 28,
                borderRadius: "14px",
                flexShrink: 0,
                alignSelf: "flex-start",
                backgroundColor: alpha(accentColor, 0.1),
                color: accentDark,
                border: `1.5px solid ${alpha(accentColor, 0.25)}`,
                "& .MuiChip-icon": { color: "inherit" },
              }}
            />
          </Box>

          {/* Info pills row */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: isPendente ? 2.5 : 0 }}>
            <Chip
              icon={<CalendarToday sx={{ fontSize: 13 }} />}
              label={formatDate(mov.date)}
              size="small"
              variant="outlined"
              sx={{
                height: 28,
                fontSize: "0.75rem",
                fontWeight: 500,
                borderColor: alpha(theme.palette.text.primary, 0.1),
                "& .MuiChip-icon": { color: "text.disabled" },
              }}
            />
            <Chip
              icon={<Numbers sx={{ fontSize: 13 }} />}
              label={`Qtd: ${mov.quantity}`}
              size="small"
              variant="outlined"
              sx={{
                height: 28,
                fontSize: "0.75rem",
                fontWeight: 600,
                borderColor: alpha(theme.palette.text.primary, 0.1),
                "& .MuiChip-icon": { color: "text.disabled" },
              }}
            />
            {mov.user_name && (
              <Chip
                icon={<Person sx={{ fontSize: 13 }} />}
                label={mov.user_name}
                size="small"
                variant="outlined"
                sx={{
                  height: 28,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  borderColor: alpha(theme.palette.text.primary, 0.1),
                  maxWidth: 180,
                  "& .MuiChip-icon": { color: "text.disabled" },
                  "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
                }}
              />
            )}
          </Stack>

          {/* Observacoes */}
          {mov.observacoes && (
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1,
                mt: 1.5,
                mb: isPendente ? 2 : 0,
                px: 1.5,
                py: 1.2,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.info.main, 0.04),
                borderLeft: `3px solid ${alpha(theme.palette.info.main, 0.3)}`,
              }}
            >
              <Notes sx={{ fontSize: 15, color: theme.palette.info.main, mt: 0.1, flexShrink: 0 }} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ wordBreak: "break-word", fontStyle: "italic", lineHeight: 1.5 }}
              >
                {mov.observacoes}
              </Typography>
            </Box>
          )}

          {/* Action button */}
          {isPendente && (
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<AssignmentReturn />}
              onClick={() => onDevolver(mov)}
              sx={{
                mt: "auto",
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 3,
                py: 1.3,
                fontSize: "0.9rem",
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                "&:hover": {
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                  transform: "translateY(-1px)",
                },
                transition: "all 0.2s ease",
              }}
            >
              Devolver Material
            </Button>
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
  const [activeTab, setActiveTab] = useState(0);
  const [loggedUserId, setLoggedUserId] = useState(null);
  const [loggedUserName, setLoggedUserName] = useState(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const token = localStorage.getItem("token");
      const user = await verifyToken(token);
      setUserRole(user.role);
      setLoggedUserId(user.userId);
      setLoggedUserName(user.username || 'Usuário');
    };
    fetchUserRole();
  }, []);

  const fetchMovimentacoes = useCallback(async () => {
    if (!selectedUser && !includeReparo) {
      setMovimentacoes([]);
      return;
    }
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
  }, [selectedUser, includeReparo]);

  useEffect(() => {
    fetchMovimentacoes();
  }, [fetchMovimentacoes]);

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

      logAudit({
        action: 'devolucao_create',
        userId: loggedUserId,
        userName: loggedUserName,
        targetCollection: 'movimentacoes',
        targetId: movimentacao.id,
        targetName: movimentacao.material_description,
        details: { quantidade: movimentacao.quantity, militar: movimentacao.user_name },
      });

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
  const showContent = !loading && hasResults && movimentacoes.length > 0;

  return (
    <PrivateRoute>
      <MenuContext>
        <div className="root-protected">
          {userRole === "admin" || userRole === "admingeral" ? (
            <Box sx={{ width: "100%" }}>

              {/* ═══════════════════════ HERO HEADER ═══════════════════════ */}
              <Paper
                elevation={0}
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 5,
                  mb: 3,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #142d4c 40%, #0a1628 100%)`,
                  color: "white",
                }}
              >
                {/* Decorative elements */}
                <Box sx={{
                  position: "absolute", top: -100, right: -50, width: 300, height: 300,
                  borderRadius: "50%", background: alpha("#fff", 0.03),
                }} />
                <Box sx={{
                  position: "absolute", bottom: -80, left: -30, width: 250, height: 250,
                  borderRadius: "50%", background: alpha("#fff", 0.02),
                }} />
                <Box sx={{
                  position: "absolute", top: "50%", right: "15%", width: 120, height: 120,
                  borderRadius: "50%", background: alpha(theme.palette.secondary.main, 0.06),
                }} />

                {/* Content */}
                <Box sx={{ position: "relative", zIndex: 1, p: { xs: 3, sm: 4 } }}>
                  {/* Title row */}
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        sx={{
                          width: { xs: 52, sm: 60 },
                          height: { xs: 52, sm: 60 },
                          bgcolor: alpha("#fff", 0.1),
                          backdropFilter: "blur(12px)",
                          border: `2px solid ${alpha("#fff", 0.15)}`,
                        }}
                      >
                        <AssignmentReturn sx={{ fontSize: { xs: 26, sm: 30 } }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.03em", fontSize: { xs: "1.5rem", sm: "2rem" } }}>
                          Tela de Devolução
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.55, fontWeight: 400, mt: 0.3, fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                          Gerencie devoluções de materiais cautelados e reparos
                        </Typography>
                      </Box>
                    </Box>

                    {hasResults && movimentacoes.length > 0 && (
                      <Tooltip title="Recarregar dados" arrow>
                        <IconButton
                          onClick={fetchMovimentacoes}
                          sx={{
                            color: alpha("#fff", 0.6),
                            bgcolor: alpha("#fff", 0.06),
                            border: `1px solid ${alpha("#fff", 0.1)}`,
                            "&:hover": { bgcolor: alpha("#fff", 0.12), color: "#fff" },
                          }}
                        >
                          <Refresh />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>

                  {/* Stats + Progress */}
                  {hasResults && movimentacoes.length > 0 && (
                    <Fade in timeout={500}>
                      <Box>
                        {/* Progress bar */}
                        <Box sx={{ mt: 3.5, mb: 3 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                            <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>
                              Progresso de devoluções
                            </Typography>
                            <Chip
                              label={`${Math.round(progressPercent)}%`}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                bgcolor: progressPercent === 100 ? alpha(theme.palette.success.main, 0.2) : alpha("#fff", 0.1),
                                color: progressPercent === 100 ? theme.palette.success.light : "#fff",
                                border: `1px solid ${progressPercent === 100 ? alpha(theme.palette.success.main, 0.3) : alpha("#fff", 0.15)}`,
                              }}
                            />
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={progressPercent}
                            sx={{
                              height: 10,
                              borderRadius: 5,
                              backgroundColor: alpha("#fff", 0.08),
                              "& .MuiLinearProgress-bar": {
                                borderRadius: 5,
                                background: progressPercent === 100
                                  ? `linear-gradient(90deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`
                                  : `linear-gradient(90deg, ${theme.palette.secondary.main} 0%, ${theme.palette.warning.light} 100%)`,
                                transition: "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                              },
                            }}
                          />
                        </Box>

                        {/* Stat cards row */}
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                          <GlassStatCard icon={WarningAmber} label="Pendentes" value={pendentes.length} color={theme.palette.warning.light} />
                          <GlassStatCard icon={CheckCircle} label="Devolvidos" value={devolvidos.length} color={theme.palette.success.light} />
                          <GlassStatCard icon={SwapHoriz} label="Total" value={movimentacoes.length} color="#fff" />
                        </Stack>
                      </Box>
                    </Fade>
                  )}
                </Box>
              </Paper>

              {/* ═══════════════════ MODE TOGGLE + SEARCH ═══════════════════ */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.5, sm: 3 },
                  mb: 3,
                  borderRadius: 4,
                  border: `1px solid ${theme.palette.divider}`,
                  background: theme.palette.background.paper,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: includeReparo ? 0 : 2.5 }}>
                  {/* Mode toggle pill */}
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 2,
                      py: 1,
                      borderRadius: 100,
                      backgroundColor: includeReparo ? alpha(theme.palette.secondary.main, 0.08) : alpha(theme.palette.primary.main, 0.04),
                      border: `1.5px solid ${includeReparo ? alpha(theme.palette.secondary.main, 0.2) : alpha(theme.palette.primary.main, 0.1)}`,
                      transition: "all 0.3s ease",
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 30,
                        height: 30,
                        bgcolor: includeReparo ? alpha(theme.palette.secondary.main, 0.15) : alpha(theme.palette.primary.main, 0.08),
                        color: includeReparo ? theme.palette.secondary.main : theme.palette.primary.light,
                        transition: "all 0.3s ease",
                      }}
                    >
                      {includeReparo ? <Build sx={{ fontSize: 15 }} /> : <Person sx={{ fontSize: 15 }} />}
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
                            setActiveTab(0);
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
                      sx={{ m: 0, mr: 0.5 }}
                    />
                  </Box>

                  {/* Selected user chip */}
                  {selectedUser && !includeReparo && (
                    <Fade in>
                      <Chip
                        avatar={
                          <Avatar sx={{ bgcolor: `${theme.palette.primary.main} !important`, width: 28, height: 28 }}>
                            <Person sx={{ fontSize: 15, color: "#fff" }} />
                          </Avatar>
                        }
                        label={selectedUser.full_name}
                        onDelete={() => { setSelectedUser(null); setUserCritery(""); }}
                        deleteIcon={<Close sx={{ fontSize: 16 }} />}
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          height: 40,
                          borderRadius: 100,
                          pl: 0.5,
                          border: `1.5px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                          backgroundColor: alpha(theme.palette.primary.main, 0.06),
                          "& .MuiChip-deleteIcon": {
                            color: "text.disabled",
                            "&:hover": { color: theme.palette.error.main },
                          },
                        }}
                      />
                    </Fade>
                  )}
                </Box>

                <Collapse in={!includeReparo}>
                  <UserSearch onSelectUser={setSelectedUser} userCritery={userCritery} onSetUserCritery={setUserCritery} />
                </Collapse>
              </Paper>

              {/* ═══════════════════ LOADING ═══════════════════ */}
              {loading && (
                <Box sx={{ textAlign: "center", py: 2 }}>
                  <Grid container spacing={3}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
                        <Skeleton
                          variant="rounded"
                          height={220}
                          sx={{
                            borderRadius: 4,
                            animation: "pulse 1.5s ease-in-out infinite",
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* ═══════════════════ EMPTY STATE ═══════════════════ */}
              {!loading && !hasResults && (
                <Fade in timeout={600}>
                  <Paper
                    elevation={0}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      py: { xs: 8, sm: 12 },
                      px: 3,
                      borderRadius: 5,
                      border: `2px dashed ${alpha(theme.palette.primary.main, 0.12)}`,
                      background: `radial-gradient(ellipse at center, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 70%)`,
                    }}
                  >
                    <Box
                      sx={{
                        width: 100,
                        height: 100,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: alpha(theme.palette.primary.main, 0.06),
                        border: `3px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                        mb: 3,
                      }}
                    >
                      <Person sx={{ fontSize: 48, color: alpha(theme.palette.primary.main, 0.3) }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary", mb: 1 }}>
                      Selecione um militar
                    </Typography>
                    <Typography variant="body1" color="text.secondary" textAlign="center" maxWidth={440} sx={{ lineHeight: 1.8 }}>
                      Pesquise e selecione um militar no campo acima para visualizar suas cautelas e realizar devoluções.
                    </Typography>
                    <Divider sx={{ width: 60, my: 3, borderColor: alpha(theme.palette.primary.main, 0.15) }} />
                    <Typography variant="caption" color="text.disabled" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.75rem" }}>
                      <Build sx={{ fontSize: 14 }} />
                      Ou ative o Modo Reparos para gerenciar materiais em reparo
                    </Typography>
                  </Paper>
                </Fade>
              )}

              {/* ═══════════════════ NO RESULTS ═══════════════════ */}
              {!loading && hasResults && movimentacoes.length === 0 && (
                <Fade in timeout={600}>
                  <Paper
                    elevation={0}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      py: { xs: 8, sm: 10 },
                      px: 3,
                      borderRadius: 5,
                      border: `1px solid ${theme.palette.divider}`,
                      background: `radial-gradient(ellipse at center, ${alpha(theme.palette.info.main, 0.03)} 0%, transparent 70%)`,
                    }}
                  >
                    <Box
                      sx={{
                        width: 90, height: 90, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        bgcolor: alpha(theme.palette.info.main, 0.06),
                        border: `3px solid ${alpha(theme.palette.info.main, 0.08)}`,
                        mb: 3,
                      }}
                    >
                      <SearchOff sx={{ fontSize: 44, color: alpha(theme.palette.info.main, 0.35) }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                      Nenhuma movimentação
                    </Typography>
                    <Typography variant="body1" color="text.secondary" textAlign="center" maxWidth={400}>
                      {includeReparo
                        ? "Não existem movimentações de reparo registradas no momento."
                        : "Este militar não possui cautelas registradas no sistema."}
                    </Typography>
                  </Paper>
                </Fade>
              )}

              {/* ═══════════════════ CONTENT TABS ═══════════════════ */}
              {showContent && (
                <Fade in timeout={400}>
                  <Box>
                    {/* Section tabs */}
                    <Paper
                      elevation={0}
                      sx={{
                        mb: 3,
                        borderRadius: 3,
                        border: `1px solid ${theme.palette.divider}`,
                        overflow: "hidden",
                      }}
                    >
                      <Tabs
                        value={activeTab}
                        onChange={(_, v) => setActiveTab(v)}
                        variant="fullWidth"
                        sx={{
                          minHeight: 56,
                          "& .MuiTab-root": {
                            minHeight: 56,
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            textTransform: "none",
                          },
                          "& .MuiTabs-indicator": {
                            height: 3,
                            borderRadius: "3px 3px 0 0",
                          },
                        }}
                      >
                        <Tab
                          label={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <WarningAmber sx={{ fontSize: 20 }} />
                              Pendentes
                              {pendentes.length > 0 && (
                                <Chip
                                  label={pendentes.length}
                                  size="small"
                                  sx={{
                                    height: 24, minWidth: 24,
                                    fontWeight: 800, fontSize: "0.75rem",
                                    bgcolor: activeTab === 0 ? alpha(theme.palette.warning.main, 0.15) : alpha(theme.palette.text.primary, 0.06),
                                    color: activeTab === 0 ? theme.palette.warning.dark : "text.secondary",
                                    transition: "all 0.2s",
                                  }}
                                />
                              )}
                            </Box>
                          }
                        />
                        <Tab
                          label={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <CheckCircle sx={{ fontSize: 20 }} />
                              Devolvidos
                              {devolvidos.length > 0 && (
                                <Chip
                                  label={devolvidos.length}
                                  size="small"
                                  sx={{
                                    height: 24, minWidth: 24,
                                    fontWeight: 800, fontSize: "0.75rem",
                                    bgcolor: activeTab === 1 ? alpha(theme.palette.success.main, 0.15) : alpha(theme.palette.text.primary, 0.06),
                                    color: activeTab === 1 ? theme.palette.success.dark : "text.secondary",
                                    transition: "all 0.2s",
                                  }}
                                />
                              )}
                            </Box>
                          }
                        />
                      </Tabs>
                    </Paper>

                    {/* Tab content: Pendentes */}
                    {activeTab === 0 && (
                      pendentes.length > 0 ? (
                        <Grid container spacing={3}>
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
                      ) : (
                        <Paper
                          elevation={0}
                          sx={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            py: 8, borderRadius: 4, border: `1px solid ${theme.palette.divider}`,
                          }}
                        >
                          <Avatar sx={{ width: 64, height: 64, bgcolor: alpha(theme.palette.success.main, 0.08), mb: 2 }}>
                            <CheckCircle sx={{ fontSize: 32, color: theme.palette.success.main }} />
                          </Avatar>
                          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                            Tudo devolvido!
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Não há materiais pendentes de devolução.
                          </Typography>
                        </Paper>
                      )
                    )}

                    {/* Tab content: Devolvidos */}
                    {activeTab === 1 && (
                      devolvidos.length > 0 ? (
                        <Grid container spacing={3}>
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
                      ) : (
                        <Paper
                          elevation={0}
                          sx={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            py: 8, borderRadius: 4, border: `1px solid ${theme.palette.divider}`,
                          }}
                        >
                          <Avatar sx={{ width: 64, height: 64, bgcolor: alpha(theme.palette.warning.main, 0.08), mb: 2 }}>
                            <WarningAmber sx={{ fontSize: 32, color: theme.palette.warning.main }} />
                          </Avatar>
                          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                            Nenhuma devolução ainda
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Os materiais devolvidos aparecerão aqui.
                          </Typography>
                        </Paper>
                      )
                    )}
                  </Box>
                </Fade>
              )}
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 8 }}>
              <Alert severity="warning" variant="outlined" sx={{ borderRadius: 3 }}>
                Sem permissão para acessar este recurso
              </Alert>
            </Box>
          )}

          {/* ═══════════════════ CONFIRM DIALOG ═══════════════════ */}
          <Dialog
            open={confirmDialog.open}
            onClose={() => !devolvendo && setConfirmDialog({ open: false, item: null })}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 5, overflow: "hidden" } }}
          >
            {/* Gradient header */}
            <Box
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #0a1628 100%)`,
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: 2,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box sx={{ position: "absolute", top: -30, right: -20, width: 120, height: 120, borderRadius: "50%", background: alpha("#fff", 0.04) }} />
              <Avatar
                sx={{
                  width: 56, height: 56,
                  bgcolor: alpha("#fff", 0.12),
                  border: `2px solid ${alpha("#fff", 0.15)}`,
                  backdropFilter: "blur(12px)",
                }}
              >
                <AssignmentReturn sx={{ fontSize: 28 }} />
              </Avatar>
              <Box sx={{ position: "relative", zIndex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
                  Confirmar Devolução
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.55, mt: 0.3 }}>
                  Revise os detalhes antes de confirmar
                </Typography>
              </Box>
            </Box>

            <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 }, pt: { xs: 2.5, sm: 3 } }}>
              {confirmDialog.item && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.7 }}>
                    O material será devolvido ao estoque e o militar será notificado.
                  </Typography>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 3, borderRadius: 4,
                      border: `1px solid ${theme.palette.divider}`,
                      background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
                      <Avatar
                        sx={{
                          width: 50, height: 50,
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          color: theme.palette.primary.main,
                          border: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                        }}
                      >
                        <Inventory2 sx={{ fontSize: 24 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                          {confirmDialog.item.material_description}
                        </Typography>
                        {confirmDialog.item.categoria && (
                          <Chip
                            label={confirmDialog.item.categoria}
                            size="small"
                            sx={{ mt: 0.5, height: 20, fontSize: "0.65rem", bgcolor: alpha(theme.palette.primary.main, 0.06) }}
                          />
                        )}
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 2.5 }} />

                    <Grid container spacing={2.5}>
                      <Grid size={{ xs: 6 }}>
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.05), border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}` }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 500, textTransform: "uppercase", fontSize: "0.6rem", letterSpacing: "0.05em", mb: 0.5 }}>
                            Quantidade
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.warning.dark }}>
                            {confirmDialog.item.quantity}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05), border: `1px solid ${alpha(theme.palette.info.main, 0.1)}` }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 500, textTransform: "uppercase", fontSize: "0.6rem", letterSpacing: "0.05em", mb: 0.5 }}>
                            Data da Cautela
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: theme.palette.info.dark }}>
                            {formatDate(confirmDialog.item.date)}
                          </Typography>
                        </Box>
                      </Grid>
                      {confirmDialog.item.user_name && (
                        <Grid size={{ xs: 12 }}>
                          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.04), border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}` }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 500, textTransform: "uppercase", fontSize: "0.6rem", letterSpacing: "0.05em", mb: 0.5 }}>
                              Militar Responsável
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                              {confirmDialog.item.user_name}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>

                  <Alert
                    severity="info"
                    variant="outlined"
                    icon={<Inventory2 sx={{ fontSize: 20 }} />}
                    sx={{
                      mt: 2.5, borderRadius: 3,
                      "& .MuiAlert-message": { fontSize: "0.8rem", fontWeight: 500 },
                      borderColor: alpha(theme.palette.info.main, 0.2),
                    }}
                  >
                    A quantidade será adicionada de volta ao estoque atual do material.
                  </Alert>
                </Box>
              )}
            </DialogContent>

            <Divider />
            <Box sx={{ p: { xs: 2, sm: 2.5 }, display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
              <Button
                onClick={() => setConfirmDialog({ open: false, item: null })}
                disabled={devolvendo}
                sx={{ color: "text.secondary", px: 3, borderRadius: 100, fontWeight: 600 }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmDevolver}
                disabled={devolvendo}
                startIcon={devolvendo ? <CircularProgress size={18} color="inherit" /> : <AssignmentReturn />}
                sx={{
                  px: 4, py: 1.3, borderRadius: 100,
                  fontWeight: 700, fontSize: "0.9rem",
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.35)}`,
                  "&:hover": { boxShadow: `0 6px 24px ${alpha(theme.palette.primary.main, 0.5)}` },
                }}
              >
                {devolvendo ? "Processando..." : "Confirmar Devolução"}
              </Button>
            </Box>
          </Dialog>

          {/* ═══════════════════ SNACKBAR ═══════════════════ */}
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
              icon={snackbar.severity === "success" ? <CheckCircle /> : undefined}
              sx={{
                borderRadius: 100,
                fontWeight: 600,
                boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
                minWidth: { xs: "90vw", sm: 420 },
                py: 1.2,
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
