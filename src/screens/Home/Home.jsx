import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Paper,
  Chip,
  IconButton,
  Fade,
  Container,
  Avatar,
  alpha,
  Alert,
  Button,
  Snackbar,
  Tooltip,
  LinearProgress,
  Badge,
  TextField,
  useMediaQuery,
  useTheme,
  Collapse,
} from "@mui/material";
import {
  Inventory,
  TrendingUp,
  SwapHoriz,
  Build,
  Delete,
  CheckCircle,
  AccessTime,
  AssignmentTurnedIn,
  Warning,
  Assignment,
  DonutSmall,
  Refresh,
  CalendarToday,
  ArrowForward,
  WarningAmber,
  Speed,
  CategoryOutlined,
  HandymanOutlined,
  PendingActions,
  Visibility,
  Today,
  DateRange,
  FilterList,
  Inventory2,
  DirectionsCar,
  PeopleAlt,
  ReceiptLong,
} from "@mui/icons-material";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  orderBy,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { useNavigate } from "react-router-dom";
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import db from "../../firebase/db";
import { verifyToken } from "../../firebase/token";
import CautelaStrip from "../../components/CautelaStrip";
import DevolucaoReceiptStrip from "../../components/DevolucaoReceiptStrip";

// ==================== HELPER FUNCTIONS ====================

const toDate = (val) => {
  if (!val) return null;
  if (typeof val.toDate === "function") return val.toDate();
  if (val.seconds != null) return new Date(val.seconds * 1000 + (val.nanoseconds || 0) / 1000000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const formatDateBR = (date) => {
  if (!date) return "";
  const d = toDate(date);
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
};

const isToday = (date) => {
  const d = date instanceof Date ? date : toDate(date);
  if (!d) return false;
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
};

const isThisWeek = (date) => {
  const d = date instanceof Date ? date : toDate(date);
  if (!d) return false;
  const now = new Date();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return d >= startOfWeek && d < endOfWeek;
};

const isThisMonth = (date) => {
  const d = date instanceof Date ? date : toDate(date);
  if (!d) return false;
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const getDaysUntil = (date) => {
  if (!date) return Infinity;
  const d = toDate(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
};

// ==================== CLICKABLE STAT CARD ====================

const StatCard = (props) => {
  const { icon, title, value, color, subtitle, onClick, badge, progress } = props;
  const IconComponent = icon;
  return (
  <Card
    sx={{
      height: "100%",
      cursor: onClick ? "pointer" : "default",
      background: `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.03)} 100%)`,
      border: `1px solid ${alpha(color, 0.15)}`,
      position: "relative",
      overflow: "hidden",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      "&:hover": onClick
        ? {
            transform: "translateY(-6px)",
            boxShadow: `0 16px 32px ${alpha(color, 0.2)}`,
            border: `1px solid ${alpha(color, 0.4)}`,
          }
        : {},
      "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.5)} 100%)`,
      },
    }}
    onClick={onClick}
  >
    <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              fontSize: { xs: "0.6rem", sm: "0.7rem" },
              display: "block",
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: color,
              mt: 0.5,
              fontSize: { xs: "1.6rem", sm: "2rem" },
              lineHeight: 1.1,
            }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: { xs: "0.65rem", sm: "0.7rem" },
                mt: 0.5,
                display: "block",
              }}
            >
              {subtitle}
            </Typography>
          )}
          {progress !== undefined && (
            <LinearProgress
              variant="determinate"
              value={Math.min(progress, 100)}
              sx={{
                mt: 1,
                height: 5,
                borderRadius: 3,
                bgcolor: alpha(color, 0.1),
                "& .MuiLinearProgress-bar": {
                  bgcolor: color,
                  borderRadius: 3,
                },
              }}
            />
          )}
        </Box>
        <Badge badgeContent={badge} color="error" invisible={!badge}>
          <Avatar
            sx={{
              bgcolor: alpha(color, 0.12),
              color: color,
              width: { xs: 42, sm: 52 },
              height: { xs: 42, sm: 52 },
              border: `2px solid ${alpha(color, 0.2)}`,
            }}
          >
            <IconComponent sx={{ fontSize: { xs: 22, sm: 26 } }} />
          </Avatar>
        </Badge>
      </Box>
      {onClick && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            mt: 1,
            gap: 0.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: color, fontWeight: 600, fontSize: "0.65rem" }}
          >
            Ver detalhes
          </Typography>
          <ArrowForward sx={{ fontSize: 12, color: color }} />
        </Box>
      )}
    </CardContent>
  </Card>
  );
};

// ==================== DATE FILTER ====================

const DATE_FILTERS = [
  { value: "today", label: "Hoje", icon: <Today sx={{ fontSize: 16 }} /> },
  { value: "week", label: "Esta Semana", icon: <DateRange sx={{ fontSize: 16 }} /> },
  { value: "month", label: "Este Mes", icon: <CalendarToday sx={{ fontSize: 16 }} /> },
  { value: "custom", label: "Periodo", icon: <FilterList sx={{ fontSize: 16 }} /> },
  { value: "all", label: "Todo o Periodo", icon: <Visibility sx={{ fontSize: 16 }} /> },
];

const DateFilterBar = ({ dateFilter, setDateFilter, customStart, setCustomStart, customEnd, setCustomEnd }) => (
  <Box
    sx={{
      display: "flex",
      flexWrap: "wrap",
      gap: 1,
      alignItems: "center",
      mb: 2,
    }}
  >
    {DATE_FILTERS.map((f) => (
      <Chip
        key={f.value}
        icon={f.icon}
        label={f.label}
        onClick={() => setDateFilter(f.value)}
        variant={dateFilter === f.value ? "filled" : "outlined"}
        size="small"
        sx={{
          fontWeight: 600,
          fontSize: "0.75rem",
          ...(dateFilter === f.value
            ? {
                bgcolor: "primary.main",
                color: "white",
                "& .MuiChip-icon": { color: "white" },
              }
            : {}),
        }}
      />
    ))}
    <Collapse in={dateFilter === "custom"} orientation="horizontal">
      <Box sx={{ display: "flex", gap: 1, ml: 1 }}>
        <TextField
          type="date"
          size="small"
          label="De"
          value={customStart}
          onChange={(e) => setCustomStart(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 150, "& .MuiInputBase-root": { height: 32, fontSize: "0.8rem" } }}
        />
        <TextField
          type="date"
          size="small"
          label="Ate"
          value={customEnd}
          onChange={(e) => setCustomEnd(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 150, "& .MuiInputBase-root": { height: 32, fontSize: "0.8rem" } }}
        />
      </Box>
    </Collapse>
  </Box>
);

// ==================== SECTION HEADER ====================

const SectionHeader = ({ title, icon, action, count }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      mb: 2,
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {icon}
      <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: "1rem", sm: "1.15rem" } }}>
        {title}
      </Typography>
      {count !== undefined && (
        <Chip
          label={count}
          size="small"
          sx={{
            height: 22,
            fontWeight: 700,
            fontSize: "0.75rem",
            bgcolor: alpha("#1e3a5f", 0.1),
            color: "#1e3a5f",
          }}
        />
      )}
    </Box>
    {action}
  </Box>
);

// ==================== CHART TOOLTIP ====================

const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Paper sx={{ p: 1.5, border: "1px solid", borderColor: "divider", boxShadow: 3 }}>
        <Typography variant="body2" fontWeight={700}>
          {label}
        </Typography>
        {payload.map((entry, i) => (
          <Typography key={i} variant="body2" sx={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </Typography>
        ))}
      </Paper>
    );
  }
  return null;
};

// ==================== MOVEMENT TYPE HELPERS ====================

const MOVEMENT_COLORS = {
  cautela: "#3b82f6",
  aquisicao: "#22c55e",
  descarte: "#ef4444",
  reparo: "#f59e0b",
  devolucao: "#8b5cf6",
};

const MOVEMENT_LABELS = {
  cautela: "Cautela",
  aquisicao: "Aquisicao",
  descarte: "Descarte",
  reparo: "Reparo",
  devolucao: "Devolucao",
};

const MOVEMENT_ICONS = {
  aquisicao: <TrendingUp />,
  cautela: <SwapHoriz />,
  descarte: <Delete />,
  reparo: <Build />,
  devolucao: <AssignmentTurnedIn />,
};

const STATUS_LABELS = {
  cautelado: "Cautelado",
  devolvido: "Devolvido",
  devolvidaDeReparo: "Devolvida de Reparo",
  descartado: "Descartado",
  emEstoque: "Em Estoque",
  emReparo: "Em Reparo",
};

// ==================== PRIORITY COLORS ====================

const PRIORITY_COLORS = {
  critica: "#ef4444",
  alta: "#f97316",
  media: "#f59e0b",
  baixa: "#22c55e",
};

// ==================== MAIN COMPONENT ====================

export default function Home() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));


  // Core state
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState("");


  // Data state
  const [allMovements, setAllMovements] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [users, setUsers] = useState([]);
  const [viaturas, setViaturas] = useState([]);
  const [rings, setRings] = useState([]);
  const [manutencoes, setManutencoes] = useState([]);
  const [categorias, setCategorias] = useState([]);

  // User-specific state
  const [minhasCautelas, setMinhasCautelas] = useState([]);
  const [activeCautelas, setActiveCautelas] = useState([]);
  const [returnedCautelas, setReturnedCautelas] = useState([]);

  // UI state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // ==================== DATE FILTER LOGIC ====================

  const filterByDate = useCallback(
    (items, dateField = "date") => {
      if (dateFilter === "all") return items;
      return items.filter((item) => {
        const rawDate = item[dateField];
        if (!rawDate) return false;
        const d = toDate(rawDate);
        if (!d) return false;
        switch (dateFilter) {
          case "today":
            return isToday(d);
          case "week":
            return isThisWeek(d);
          case "month":
            return isThisMonth(d);
          case "custom": {
            const start = customStart ? new Date(customStart + "T00:00:00") : null;
            const end = customEnd ? new Date(customEnd + "T23:59:59") : null;
            if (start && d < start) return false;
            if (end && d > end) return false;
            return true;
          }
          default:
            return true;
        }
      });
    },
    [dateFilter, customStart, customEnd]
  );

  // ==================== COMPUTED STATS ====================

  const filteredMovements = useMemo(
    () => filterByDate(allMovements),
    [allMovements, filterByDate]
  );

  const stats = useMemo(() => {
    // Todos os cálculos usam filteredMovements para responder ao filtro de data
    const fm = filteredMovements;

    const cautelasAtivas = fm.filter(
      (m) => m.type === "cautela" && m.status === "cautelado"
    );
    const pendentesAssinatura = fm.filter(
      (m) => m.type === "cautela" && m.signed === false
    );
    const emReparo = fm.filter(
      (m) => m.status === "emReparo"
    );
    const movHoje = allMovements.filter((m) => isToday(m.date));

    // Estoque (estado atual, não filtrado por data)
    const totalEstoque = materials.reduce((sum, m) => sum + (m.estoque_total || 0), 0);
    const estoqueAtual = materials.reduce((sum, m) => sum + (m.estoque_atual || 0), 0);
    const estoqueViatura = materials.reduce((sum, m) => sum + (m.estoque_viatura || 0), 0);
    const lowStockMaterials = materials.filter(
      (m) => (m.estoque_atual || 0) === 0 && (m.estoque_total || 0) > 0
    );

    // Manutencoes filtradas por data de vencimento
    const filteredManutencoes = filterByDate(manutencoes, "dueDate");
    const now = new Date();
    const manutencoesVencidas = filteredManutencoes.filter((m) => {
      if (m.status === "concluida" || m.status === "cancelada") return false;
      const d = toDate(m.dueDate);
      return d && d < now;
    });
    const manutencoesPendentes = filteredManutencoes.filter(
      (m) => m.status === "pendente" || m.status === "em_andamento"
    );

    // By type counts (já filtrado)
    const byType = {};
    fm.forEach((m) => {
      byType[m.type] = (byType[m.type] || 0) + 1;
    });

    // Category distribution dos materiais movimentados no período
    const materialIdsInPeriod = new Set(fm.map((m) => m.material));
    const materialsInPeriod = materialIdsInPeriod.size > 0
      ? materials.filter((m) => materialIdsInPeriod.has(m.id))
      : materials;
    const byCategory = {};
    materialsInPeriod.forEach((m) => {
      const cat = m.categoria || "Sem Categoria";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    // Top cautela materials (filtrado)
    const materialCautelaCount = {};
    fm
      .filter((m) => m.type === "cautela")
      .forEach((m) => {
        const desc = m.material_description || "Desconhecido";
        materialCautelaCount[desc] = (materialCautelaCount[desc] || 0) + (m.quantity || 1);
      });
    const topCautelaMaterials = Object.entries(materialCautelaCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Top users by cautelas (filtrado)
    const userCautelaCount = {};
    fm
      .filter((m) => m.type === "cautela")
      .forEach((m) => {
        const name = m.user_name || m.sender_name || "Desconhecido";
        userCautelaCount[name] = (userCautelaCount[name] || 0) + 1;
      });
    const topUsers = Object.entries(userCautelaCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Daily movement trend - usa filteredMovements para o range visível
    const dailyTrend = [];
    // Determinar range de dias baseado no filtro
    let trendDays = 14;
    if (dateFilter === "today") trendDays = 1;
    else if (dateFilter === "week") trendDays = 7;
    else if (dateFilter === "month") trendDays = 30;
    else if (dateFilter === "custom" && customStart && customEnd) {
      const diff = Math.ceil((new Date(customEnd) - new Date(customStart)) / (1000 * 60 * 60 * 24)) + 1;
      trendDays = Math.min(Math.max(diff, 1), 60);
    }

    for (let i = trendDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dayStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const dayMovements = fm.filter((m) => {
        const md = toDate(m.date);
        return md && md.toDateString() === date.toDateString();
      });
      dailyTrend.push({
        date: dayStr,
        total: dayMovements.length,
        cautelas: dayMovements.filter((m) => m.type === "cautela").length,
        devolucoes: dayMovements.filter((m) => m.type === "devolucao" || m.status === "devolvido").length,
      });
    }

    return {
      cautelasAtivas: cautelasAtivas.length,
      pendentesAssinatura: pendentesAssinatura.length,
      emReparo: emReparo.length,
      movHoje: movHoje.length,
      totalMateriais: materials.length,
      totalEstoque,
      estoqueAtual,
      estoqueViatura,
      totalUsers: users.length,
      totalViaturas: viaturas.length,
      totalRings: rings.length,
      lowStockMaterials,
      manutencoesVencidas,
      manutencoesPendentes,
      byType,
      byCategory,
      topCautelaMaterials,
      topUsers,
      dailyTrend,
      filteredCount: fm.length,
      taxaCautela:
        materials.length > 0
          ? ((cautelasAtivas.length / materials.length) * 100).toFixed(1)
          : 0,
      disponibilidade:
        totalEstoque > 0 ? ((estoqueAtual / totalEstoque) * 100).toFixed(1) : 0,
    };
  }, [allMovements, filteredMovements, materials, users, viaturas, rings, manutencoes, filterByDate, dateFilter, customStart, customEnd]);

  // ==================== DATA FETCHING ====================

  useEffect(() => {
    let isMounted = true;
    const unsubscribers = [];

    const init = async () => {
      try {
        const token = localStorage.getItem("token");
        const user = await verifyToken(token);
        if (!isMounted) return;

        if (user) {
          setUserRole(user.role);
          setUserName(user.username || "Usuario");

        }

        const role = user?.role;

        // User role: simple fetch
        if (role === "user") {
          if (user?.userId) {
            const [pendingSnap, returnsSnap, activeSnap] = await Promise.all([
              getDocs(
                query(
                  collection(db, "movimentacoes"),
                  where("user", "==", user.userId),
                  where("type", "==", "cautela"),
                  where("signed", "==", false)
                )
              ),
              getDocs(
                query(
                  collection(db, "movimentacoes"),
                  where("user", "==", user.userId),
                  where("status", "in", ["devolvido", "devolvidaDeReparo"])
                )
              ),
              getDocs(
                query(
                  collection(db, "movimentacoes"),
                  where("user", "==", user.userId),
                  where("type", "==", "cautela"),
                  where("status", "==", "cautelado")
                )
              ),
            ]);
            if (isMounted) {
              setMinhasCautelas(
                pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
              );
              setReturnedCautelas(
                returnsSnap.docs
                  .map((d) => ({ id: d.id, ...d.data() }))
                  .filter((item) => !item.user_acknowledged_return)
              );
              setActiveCautelas(
                activeSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
              );
              setLoading(false);
            }
          } else {
            if (isMounted) setLoading(false);
          }
          return;
        }

        // Editor/Admin: fetch everything with real-time for movements
        const [
          materialsSnap,
          usersSnap,
          viaturasSnap,
          ringsSnap,
          manutencoesSnap,
          categoriasSnap,
        ] = await Promise.all([
          getDocs(collection(db, "materials")),
          getDocs(collection(db, "users")),
          getDocs(collection(db, "viaturas")),
          getDocs(collection(db, "rings")),
          getDocs(
            query(
              collection(db, "manutencoes"),
              where("status", "in", ["pendente", "em_andamento"])
            )
          ),
          getDocs(collection(db, "categorias")),
        ]);

        if (isMounted) {
          setMaterials(materialsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setViaturas(viaturasSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setRings(ringsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setManutencoes(manutencoesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setCategorias(categoriasSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }

        // Real-time movements listener
        const movQuery = query(
          collection(db, "movimentacoes"),
          orderBy("date", "desc")
        );
        const unsub = onSnapshot(movQuery, (snapshot) => {
          if (isMounted) {
            setAllMovements(
              snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
            );
            setLoading(false);
          }
        });
        unsubscribers.push(unsub);

        // User's own cautelas (real-time)
        if (user?.userId) {
          const cautelaUnsub = onSnapshot(
            query(
              collection(db, "movimentacoes"),
              where("user", "==", user.userId),
              where("type", "==", "cautela"),
              where("signed", "==", false)
            ),
            (snap) => {
              if (isMounted) {
                setMinhasCautelas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
              }
            }
          );
          unsubscribers.push(cautelaUnsub);

          const returnUnsub = onSnapshot(
            query(
              collection(db, "movimentacoes"),
              where("user", "==", user.userId),
              where("status", "in", ["devolvido", "devolvidaDeReparo"])
            ),
            (snap) => {
              if (isMounted) {
                setReturnedCautelas(
                  snap.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .filter((item) => !item.user_acknowledged_return)
                );
              }
            }
          );
          unsubscribers.push(returnUnsub);
        }
      } catch (error) {
        console.error("Erro na inicializacao:", error);
        if (isMounted) setLoading(false);
      }
    };

    init();
    return () => {
      isMounted = false;
      unsubscribers.forEach((u) => u());
    };
  }, []);

  // ==================== HANDLERS ====================

  const handleSign = async (movimentacaoId) => {
    try {
      const docRef = doc(db, "movimentacoes", movimentacaoId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await updateDoc(docRef, { signed: true, signed_date: serverTimestamp() });
        if (userRole === "user") {
          const signedItem = minhasCautelas.find((c) => c.id === movimentacaoId);
          setMinhasCautelas((prev) => prev.filter((c) => c.id !== movimentacaoId));
          if (signedItem) {
            setActiveCautelas((prev) => [
              ...prev,
              { ...signedItem, signed: true, status: "cautelado" },
            ]);
          }
        }
        setSnackbarMessage("Cautela assinada com sucesso!");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Erro ao assinar:", error);
      setSnackbarMessage("Erro ao assinar a cautela.");
      setSnackbarOpen(true);
    }
  };

  const handleAcknowledgeReturn = async (movimentacaoId) => {
    try {
      await updateDoc(doc(db, "movimentacoes", movimentacaoId), {
        user_acknowledged_return: true,
      });
      if (userRole === "user") {
        setReturnedCautelas((prev) => prev.filter((c) => c.id !== movimentacaoId));
      }
      setSnackbarMessage("Comprovante confirmado!");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Erro ao confirmar:", error);
      setSnackbarMessage("Erro ao confirmar o comprovante.");
      setSnackbarOpen(true);
    }
  };

  // ==================== CHART DATA ====================

  const typeChartData = useMemo(() => {
    return Object.entries(MOVEMENT_LABELS).map(([key, label]) => ({
      name: label,
      value: stats.byType[key] || 0,
      color: MOVEMENT_COLORS[key],
    }));
  }, [stats.byType]);

  const categoryPieData = useMemo(() => {
    const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
    return Object.entries(stats.byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value], i) => ({
        name,
        value,
        color: COLORS[i % COLORS.length],
      }));
  }, [stats.byCategory]);

  // ==================== LOADING ====================

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: 2,
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)",
        }}
      >
        <CircularProgress size={48} sx={{ color: "white" }} />
        <Typography variant="body1" sx={{ color: "white", opacity: 0.8 }}>
          Carregando dashboard...
        </Typography>
      </Box>
    );
  }

  // ==================== USER VIEW ====================

  if (userRole === "user") {
    return (
      <PrivateRoute>
        <MenuContext>
          <Container maxWidth="sm" sx={{ py: 2, px: 2 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                borderRadius: 3,
                background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)",
                color: "white",
              }}
            >
              <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                Ola, {userName}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Suas cautelas pendentes de assinatura
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                borderRadius: 3,
                background:
                  minhasCautelas.length > 0
                    ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)"
                    : "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
                border: "1px solid",
                borderColor: minhasCautelas.length > 0 ? "#f59e0b" : "#22c55e",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: minhasCautelas.length > 0 ? "#f59e0b" : "#22c55e",
                    width: 48,
                    height: 48,
                  }}
                >
                  {minhasCautelas.length > 0 ? <Warning /> : <CheckCircle />}
                </Avatar>
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    color={minhasCautelas.length > 0 ? "#92400e" : "#166534"}
                  >
                    {minhasCautelas.length}
                  </Typography>
                  <Typography
                    variant="body2"
                    color={minhasCautelas.length > 0 ? "#a16207" : "#15803d"}
                  >
                    {minhasCautelas.length === 0
                      ? "Nenhuma cautela pendente"
                      : minhasCautelas.length === 1
                      ? "Cautela pendente"
                      : "Cautelas pendentes"}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {minhasCautelas.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}>
                {minhasCautelas.map((cautela) => (
                  <CautelaStrip key={cautela.id} cautela={cautela} onSign={handleSign} />
                ))}
              </Box>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  mb: 2,
                  borderRadius: 3,
                  textAlign: "center",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <CheckCircle sx={{ fontSize: 64, color: "#22c55e", mb: 2 }} />
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Tudo em dia!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Voce nao possui cautelas pendentes de assinatura.
                </Typography>
              </Paper>
            )}

            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Inventory sx={{ color: "#1e3a5f", fontSize: 24 }} />
                <Typography variant="h6" fontWeight={600} sx={{ color: "#1e3a5f" }}>
                  Materiais sob sua Responsabilidade
                </Typography>
                {activeCautelas.length > 0 && (
                  <Chip
                    label={activeCautelas.length}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      backgroundColor: alpha("#1e3a5f", 0.1),
                      color: "#1e3a5f",
                      height: 24,
                    }}
                  />
                )}
              </Box>

              {activeCautelas.length > 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {activeCautelas.map((cautela) => (
                    <Card
                      key={cautela.id}
                      sx={{
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: alpha("#1e3a5f", 0.2),
                        background: `linear-gradient(135deg, ${alpha("#1e3a5f", 0.03)} 0%, ${alpha("#3b82f6", 0.03)} 100%)`,
                        position: "relative",
                        overflow: "hidden",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 4,
                          background: "linear-gradient(90deg, #1e3a5f 0%, #3b82f6 100%)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
                            <Avatar
                              sx={{
                                bgcolor: alpha("#1e3a5f", 0.1),
                                color: "#1e3a5f",
                                width: 40,
                                height: 40,
                              }}
                            >
                              <Assignment sx={{ fontSize: 20 }} />
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body1"
                                fontWeight={600}
                                sx={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {cautela.material_description || "Material"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDateBR(cautela.date)}
                              </Typography>
                            </Box>
                          </Box>
                          <Chip
                            label={`${cautela.quantity || 0} un.`}
                            sx={{
                              fontWeight: 700,
                              bgcolor: alpha("#1e3a5f", 0.9),
                              color: "white",
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    textAlign: "center",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <CheckCircle sx={{ fontSize: 48, color: "#22c55e", mb: 1 }} />
                  <Typography variant="body1" fontWeight={600} gutterBottom>
                    Nenhum material pendente
                  </Typography>
                </Paper>
              )}
            </Box>

            {returnedCautelas.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: "#1e3a5f" }}>
                  Comprovantes de Devolucao
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {returnedCautelas.map((cautela) => (
                    <DevolucaoReceiptStrip
                      key={cautela.id}
                      cautela={cautela}
                      onAcknowledge={handleAcknowledgeReturn}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => window.location.reload()}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                Atualizar
              </Button>
            </Box>
          </Container>

          <Snackbar
            open={snackbarOpen}
            autoHideDuration={4000}
            onClose={() => setSnackbarOpen(false)}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Alert
              onClose={() => setSnackbarOpen(false)}
              severity={snackbarMessage.includes("sucesso") || snackbarMessage.includes("confirmado") ? "success" : "error"}
              sx={{ width: "100%" }}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </MenuContext>
      </PrivateRoute>
    );
  }

  // ==================== ADMIN/EDITOR VIEW ====================

  const recentMovements = filteredMovements.slice(0, 15);
  const dateLabel =
    dateFilter === "today"
      ? "Hoje"
      : dateFilter === "week"
      ? "Esta Semana"
      : dateFilter === "month"
      ? "Este Mes"
      : dateFilter === "custom"
      ? "Periodo Selecionado"
      : "Todo o Periodo";

  return (
    <PrivateRoute>
      <MenuContext>
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
          <Fade in timeout={600}>
            <Box>
              {/* ====== HEADER ====== */}
              <Box
                sx={{
                  mb: 3,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      background: "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      mb: 0.5,
                      fontSize: { xs: "1.5rem", sm: "2rem" },
                    }}
                  >
                    Depósito de Material Operacional do GOCG
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Deposito de Material - CBMERJ
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Chip
                    icon={<Speed sx={{ fontSize: 16 }} />}
                    label={`${stats.movHoje} mov. hoje`}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      bgcolor: stats.movHoje > 0 ? alpha("#22c55e", 0.1) : alpha("#64748b", 0.1),
                      color: stats.movHoje > 0 ? "#22c55e" : "#64748b",
                    }}
                  />
                  <Tooltip title="Atualizar dados">
                    <IconButton
                      onClick={() => window.location.reload()}
                      sx={{
                        bgcolor: alpha("#1e3a5f", 0.05),
                        "&:hover": { bgcolor: alpha("#1e3a5f", 0.1) },
                      }}
                    >
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* ====== ALERTS ====== */}
              {(stats.manutencoesVencidas.length > 0 ||
                stats.pendentesAssinatura > 0 ||
                stats.lowStockMaterials.length > 0) && (
                <Box sx={{ mb: 3, display: "flex", flexDirection: "column", gap: 1 }}>
                  {stats.manutencoesVencidas.length > 0 && (
                    <Alert
                      severity="error"
                      variant="outlined"
                      action={
                        <Button
                          color="error"
                          size="small"
                          onClick={() => navigate("/manutencao")}
                          sx={{ fontWeight: 600 }}
                        >
                          Ver
                        </Button>
                      }
                      sx={{ borderRadius: 2 }}
                    >
                      <strong>{stats.manutencoesVencidas.length}</strong>{" "}
                      {stats.manutencoesVencidas.length === 1
                        ? "manutencao vencida"
                        : "manutencoes vencidas"}{" "}
                      requer(em) atencao imediata
                    </Alert>
                  )}
                  {stats.pendentesAssinatura > 0 && (
                    <Alert
                      severity="warning"
                      variant="outlined"
                      action={
                        <Button
                          color="warning"
                          size="small"
                          onClick={() => navigate("/movimentacoes")}
                          sx={{ fontWeight: 600 }}
                        >
                          Ver
                        </Button>
                      }
                      sx={{ borderRadius: 2 }}
                    >
                      <strong>{stats.pendentesAssinatura}</strong>{" "}
                      {stats.pendentesAssinatura === 1
                        ? "cautela aguardando"
                        : "cautelas aguardando"}{" "}
                      assinatura
                    </Alert>
                  )}
                  {stats.lowStockMaterials.length > 0 && (
                    <Alert
                      severity="info"
                      variant="outlined"
                      action={
                        <Button
                          color="info"
                          size="small"
                          onClick={() => navigate("/material")}
                          sx={{ fontWeight: 600 }}
                        >
                          Ver
                        </Button>
                      }
                      sx={{ borderRadius: 2 }}
                    >
                      <strong>{stats.lowStockMaterials.length}</strong>{" "}
                      {stats.lowStockMaterials.length === 1
                        ? "material com"
                        : "materiais com"}{" "}
                      estoque zerado
                    </Alert>
                  )}
                </Box>
              )}

              {/* ====== KPI CARDS - ROW 1 ====== */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={4} md={2}>
                  <StatCard
                    icon={Assignment}
                    title="Cautelados"
                    value={stats.cautelasAtivas}
                    color="#ef4444"
                    subtitle={`${stats.taxaCautela}% do acervo`}
                    onClick={() => navigate("/search?tab=5")}
                    badge={stats.pendentesAssinatura > 0 ? stats.pendentesAssinatura : 0}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <StatCard
                    icon={Inventory2}
                    title="Materiais"
                    value={stats.totalMateriais}
                    color="#3b82f6"
                    subtitle={`${stats.estoqueAtual} un. disponiveis`}
                    onClick={() => navigate("/material")}
                    progress={parseFloat(stats.disponibilidade)}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <StatCard
                    icon={DirectionsCar}
                    title="Viaturas"
                    value={stats.totalViaturas}
                    color="#8b5cf6"
                    subtitle={`${stats.estoqueViatura} itens alocados`}
                    onClick={() => navigate("/viaturas")}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <StatCard
                    icon={PeopleAlt}
                    title="Usuarios"
                    value={stats.totalUsers}
                    color="#22c55e"
                    onClick={
                      userRole === "admin" || userRole === "admingeral"
                        ? () => navigate("/usuario")
                        : undefined
                    }
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <StatCard
                    icon={HandymanOutlined}
                    title="Em Reparo"
                    value={stats.emReparo}
                    color="#f59e0b"
                    subtitle={`${stats.manutencoesPendentes.length} manut. pendentes`}
                    onClick={() => navigate("/manutencao")}
                    badge={stats.manutencoesVencidas.length > 0 ? stats.manutencoesVencidas.length : 0}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <StatCard
                    icon={DonutSmall}
                    title="Aneis"
                    value={stats.totalRings}
                    color="#06b6d4"
                    onClick={() => navigate("/aneis")}
                  />
                </Grid>
              </Grid>

              {/* ====== DATE FILTER ====== */}
              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: alpha("#f8fafc", 0.5),
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <FilterList sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    Filtrar por periodo - Graficos e movimentacoes
                  </Typography>
                </Box>
                <DateFilterBar
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                  customStart={customStart}
                  setCustomStart={setCustomStart}
                  customEnd={customEnd}
                  setCustomEnd={setCustomEnd}
                />
                <Typography variant="caption" color="text.secondary">
                  Exibindo <strong>{stats.filteredCount}</strong> movimentacoes no periodo: {dateLabel}
                </Typography>
              </Paper>

              {/* ====== CHARTS ROW ====== */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* Trend Chart */}
                <Grid item xs={12} md={8}>
                  <Paper
                    sx={{
                      p: { xs: 2, sm: 3 },
                      height: { xs: 280, sm: 340 },
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <SectionHeader
                      title={`Tendencia de Movimentacoes - ${dateLabel}`}
                      icon={<TrendingUp sx={{ color: "#3b82f6", fontSize: 22 }} />}
                    />
                    <ResponsiveContainer width="100%" height="80%">
                      <AreaChart
                        data={stats.dailyTrend}
                        margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorCautelas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha("#000", 0.06)} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <RechartsTooltip content={<CustomChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="total"
                          name="Total"
                          stroke="#3b82f6"
                          fillOpacity={1}
                          fill="url(#colorTotal)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="cautelas"
                          name="Cautelas"
                          stroke="#ef4444"
                          fillOpacity={1}
                          fill="url(#colorCautelas)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="devolucoes"
                          name="Devolucoes"
                          stroke="#22c55e"
                          fillOpacity={0.1}
                          fill="#22c55e"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>

                {/* Category Pie */}
                <Grid item xs={12} md={4}>
                  <Paper
                    sx={{
                      p: { xs: 2, sm: 3 },
                      height: { xs: 280, sm: 340 },
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      cursor: "pointer",
                      "&:hover": { borderColor: alpha("#8b5cf6", 0.3) },
                    }}
                    onClick={() => navigate("/categoria")}
                  >
                    <SectionHeader
                      title="Materiais por Categoria"
                      icon={<CategoryOutlined sx={{ color: "#8b5cf6", fontSize: 22 }} />}
                      action={
                        <Chip
                          label={`${categorias.length} cat.`}
                          size="small"
                          sx={{ fontSize: "0.7rem", fontWeight: 600 }}
                        />
                      }
                    />
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie
                          data={categoryPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={isMobile ? 30 : 45}
                          outerRadius={isMobile ? 60 : 80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomChartTooltip />} />
                        <Legend
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: "11px", right: 0 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
              </Grid>

              {/* ====== MIDDLE ROW: Movements by type + Quick Actions ====== */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* Movements by type (filtered) */}
                <Grid item xs={12} md={4}>
                  <Paper
                    sx={{
                      p: { xs: 2, sm: 3 },
                      height: { xs: 280, sm: 340 },
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <SectionHeader
                      title={`Movimentacoes - ${dateLabel}`}
                      icon={<ReceiptLong sx={{ color: "#f59e0b", fontSize: 22 }} />}
                      count={stats.filteredCount}
                    />
                    <ResponsiveContainer width="100%" height="78%">
                      <BarChart data={typeChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha("#000", 0.06)} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <RechartsTooltip content={<CustomChartTooltip />} />
                        <Bar dataKey="value" name="Quantidade" radius={[6, 6, 0, 0]} animationDuration={800}>
                          {typeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>

                {/* Top Cautela Materials */}
                <Grid item xs={12} md={4}>
                  <Paper
                    sx={{
                      p: { xs: 2, sm: 3 },
                      height: { xs: 280, sm: 340 },
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      overflow: "auto",
                    }}
                  >
                    <SectionHeader
                      title="Materiais Mais Cautelados"
                      icon={<TrendingUp sx={{ color: "#ef4444", fontSize: 22 }} />}
                    />
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {stats.topCautelaMaterials.map(([name, count], i) => {
                        const maxCount = stats.topCautelaMaterials[0]?.[1] || 1;
                        return (
                          <Box key={i}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 0.3,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontSize: "0.78rem",
                                  fontWeight: 500,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "75%",
                                }}
                              >
                                {i + 1}. {name}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 700, color: "#ef4444" }}
                              >
                                {count}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={(count / maxCount) * 100}
                              sx={{
                                height: 4,
                                borderRadius: 2,
                                bgcolor: alpha("#ef4444", 0.08),
                                "& .MuiLinearProgress-bar": {
                                  bgcolor: "#ef4444",
                                  borderRadius: 2,
                                },
                              }}
                            />
                          </Box>
                        );
                      })}
                      {stats.topCautelaMaterials.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                          Sem dados de cautelas
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>

                {/* Quick Info Panel */}
                <Grid item xs={12} md={4}>
                  <Paper
                    sx={{
                      p: { xs: 2, sm: 3 },
                      height: { xs: "auto", sm: 340 },
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                    }}
                  >
                    <SectionHeader
                      title="Indicadores"
                      icon={<Speed sx={{ color: "#22c55e", fontSize: 22 }} />}
                    />

                    {/* Disponibilidade */}
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: alpha("#3b82f6", 0.15),
                        bgcolor: alpha("#3b82f6", 0.03),
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">
                          Disponibilidade do Acervo
                        </Typography>
                        <Typography variant="caption" fontWeight={700} color="#3b82f6">
                          {stats.disponibilidade}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={parseFloat(stats.disponibilidade)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: alpha("#3b82f6", 0.1),
                          "& .MuiLinearProgress-bar": { bgcolor: "#3b82f6", borderRadius: 4 },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                        {stats.estoqueAtual} de {stats.totalEstoque} un. disponiveis
                      </Typography>
                    </Paper>

                    {/* Top Users */}
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.secondary"
                        sx={{ mb: 1, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}
                      >
                        Militares com mais cautelas
                      </Typography>
                      {stats.topUsers.map(([name, count], i) => (
                        <Box
                          key={i}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            py: 0.4,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Avatar
                              sx={{
                                width: 22,
                                height: 22,
                                fontSize: "0.65rem",
                                bgcolor: alpha("#1e3a5f", 0.1),
                                color: "#1e3a5f",
                                fontWeight: 700,
                              }}
                            >
                              {i + 1}
                            </Avatar>
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: "0.78rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 150,
                              }}
                            >
                              {name}
                            </Typography>
                          </Box>
                          <Chip
                            label={count}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              bgcolor: alpha("#1e3a5f", 0.08),
                              color: "#1e3a5f",
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              {/* ====== BOTTOM ROW: Recent Movements + Low Stock + Maintenance ====== */}
              <Grid container spacing={2}>
                {/* Recent Movements */}
                <Grid item xs={12} md={5}>
                  <Paper
                    sx={{
                      p: { xs: 2, sm: 3 },
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      maxHeight: 480,
                      overflow: "auto",
                    }}
                  >
                    <SectionHeader
                      title={`Movimentacoes Recentes`}
                      icon={<AccessTime sx={{ color: "#3b82f6", fontSize: 22 }} />}
                      count={stats.filteredCount}
                      action={
                        <Button
                          size="small"
                          onClick={() => navigate("/movimentacoes")}
                          endIcon={<ArrowForward sx={{ fontSize: 14 }} />}
                          sx={{ fontSize: "0.75rem", fontWeight: 600 }}
                        >
                          Ver todas
                        </Button>
                      }
                    />
                    {recentMovements.length > 0 ? (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {recentMovements.map((mov) => (
                          <Paper
                            key={mov.id}
                            elevation={0}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              border: "1px solid",
                              borderColor: alpha(MOVEMENT_COLORS[mov.type] || "#64748b", 0.15),
                              transition: "all 0.2s",
                              cursor: "pointer",
                              "&:hover": {
                                borderColor: MOVEMENT_COLORS[mov.type],
                                bgcolor: alpha(MOVEMENT_COLORS[mov.type] || "#64748b", 0.03),
                                transform: "translateX(4px)",
                              },
                            }}
                            onClick={() => navigate("/movimentacoes")}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Avatar
                                sx={{
                                  width: 34,
                                  height: 34,
                                  bgcolor: alpha(MOVEMENT_COLORS[mov.type] || "#64748b", 0.1),
                                  color: MOVEMENT_COLORS[mov.type] || "#64748b",
                                }}
                              >
                                {MOVEMENT_ICONS[mov.type] || <SwapHoriz sx={{ fontSize: 18 }} />}
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    sx={{
                                      fontSize: "0.82rem",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {mov.material_description || "Material"}
                                  </Typography>
                                  {!mov.signed && mov.type === "cautela" && (
                                    <Chip
                                      label="Pendente"
                                      size="small"
                                      sx={{
                                        height: 16,
                                        fontSize: "0.6rem",
                                        fontWeight: 700,
                                        bgcolor: alpha("#f59e0b", 0.15),
                                        color: "#f59e0b",
                                      }}
                                    />
                                  )}
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                                  {MOVEMENT_LABELS[mov.type] || mov.type} - {mov.sender_name || mov.user_name || ""}
                                  {mov.quantity ? ` - ${mov.quantity} un.` : ""}
                                </Typography>
                              </Box>
                              <Box sx={{ textAlign: "right", minWidth: 60 }}>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: "0.68rem" }}>
                                  {formatDateBR(mov.date)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>
                                  {(() => {
                                    const d = toDate(mov.date);
                                    return d ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
                                  })()}
                                </Typography>
                              </Box>
                            </Box>
                          </Paper>
                        ))}
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: "center", py: 4 }}>
                        <ReceiptLong sx={{ fontSize: 48, color: "text.disabled" }} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Nenhuma movimentacao no periodo
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>

                {/* Low Stock + Maintenance */}
                <Grid item xs={12} md={3.5}>
                  {/* Low Stock */}
                  <Paper
                    sx={{
                      p: { xs: 2, sm: 2.5 },
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: stats.lowStockMaterials.length > 0 ? alpha("#f59e0b", 0.3) : "divider",
                      mb: 2,
                      cursor: "pointer",
                      "&:hover": { borderColor: "#f59e0b" },
                    }}
                    onClick={() => navigate("/material")}
                  >
                    <SectionHeader
                      title="Estoque Zerado"
                      icon={<WarningAmber sx={{ color: "#f59e0b", fontSize: 22 }} />}
                      count={stats.lowStockMaterials.length}
                    />
                    {stats.lowStockMaterials.length > 0 ? (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8, maxHeight: 180, overflow: "auto" }}>
                        {stats.lowStockMaterials.slice(0, 6).map((mat) => (
                          <Box
                            key={mat.id}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              p: 1,
                              borderRadius: 1.5,
                              bgcolor: alpha("#f59e0b", 0.04),
                              border: "1px solid",
                              borderColor: alpha("#f59e0b", 0.1),
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: "0.78rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "65%",
                              }}
                            >
                              {mat.description}
                            </Typography>
                            <Chip
                              label={`${mat.estoque_atual || 0} un.`}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                bgcolor: (mat.estoque_atual || 0) === 0 ? alpha("#ef4444", 0.1) : alpha("#f59e0b", 0.1),
                                color: (mat.estoque_atual || 0) === 0 ? "#ef4444" : "#f59e0b",
                              }}
                            />
                          </Box>
                        ))}
                        {stats.lowStockMaterials.length > 6 && (
                          <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                            +{stats.lowStockMaterials.length - 6} materiais
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: "center", py: 2 }}>
                        <CheckCircle sx={{ color: "#22c55e", fontSize: 32 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: "0.8rem" }}>
                          Nenhum material zerado
                        </Typography>
                      </Box>
                    )}
                  </Paper>

                  {/* Maintenance */}
                  <Paper
                    sx={{
                      p: { xs: 2, sm: 2.5 },
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: stats.manutencoesVencidas.length > 0 ? alpha("#ef4444", 0.3) : "divider",
                      cursor: "pointer",
                      "&:hover": { borderColor: "#ef4444" },
                    }}
                    onClick={() => navigate("/manutencao")}
                  >
                    <SectionHeader
                      title="Manutencoes"
                      icon={<HandymanOutlined sx={{ color: "#ef4444", fontSize: 22 }} />}
                      count={stats.manutencoesPendentes.length}
                    />
                    {stats.manutencoesPendentes.length > 0 ? (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8, maxHeight: 180, overflow: "auto" }}>
                        {stats.manutencoesPendentes
                          .sort((a, b) => {
                            const da = toDate(a.dueDate);
                            const db2 = toDate(b.dueDate);
                            return (da || Infinity) - (db2 || Infinity);
                          })
                          .slice(0, 5)
                          .map((man) => {
                            const days = getDaysUntil(man.dueDate);
                            const isOverdue = days < 0;
                            const isUrgent = days >= 0 && days <= 3;
                            return (
                              <Box
                                key={man.id}
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  p: 1,
                                  borderRadius: 1.5,
                                  bgcolor: isOverdue
                                    ? alpha("#ef4444", 0.05)
                                    : isUrgent
                                    ? alpha("#f59e0b", 0.05)
                                    : alpha("#22c55e", 0.03),
                                  border: "1px solid",
                                  borderColor: isOverdue
                                    ? alpha("#ef4444", 0.15)
                                    : isUrgent
                                    ? alpha("#f59e0b", 0.15)
                                    : alpha("#22c55e", 0.1),
                                }}
                              >
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: "0.78rem",
                                      fontWeight: 500,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {man.materialDescription || man.description}
                                  </Typography>
                                  <Box sx={{ display: "flex", gap: 0.5, mt: 0.3 }}>
                                    <Chip
                                      label={man.priority || "media"}
                                      size="small"
                                      sx={{
                                        height: 16,
                                        fontSize: "0.6rem",
                                        fontWeight: 700,
                                        bgcolor: alpha(PRIORITY_COLORS[man.priority] || "#f59e0b", 0.1),
                                        color: PRIORITY_COLORS[man.priority] || "#f59e0b",
                                      }}
                                    />
                                    <Chip
                                      label={man.type}
                                      size="small"
                                      sx={{
                                        height: 16,
                                        fontSize: "0.6rem",
                                        bgcolor: alpha("#64748b", 0.08),
                                        color: "#64748b",
                                      }}
                                    />
                                  </Box>
                                </Box>
                                <Chip
                                  label={
                                    isOverdue
                                      ? `${Math.abs(days)}d atrasada`
                                      : days === 0
                                      ? "Hoje"
                                      : `${days}d`
                                  }
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.65rem",
                                    fontWeight: 700,
                                    bgcolor: isOverdue
                                      ? alpha("#ef4444", 0.1)
                                      : isUrgent
                                      ? alpha("#f59e0b", 0.1)
                                      : alpha("#22c55e", 0.08),
                                    color: isOverdue ? "#ef4444" : isUrgent ? "#f59e0b" : "#22c55e",
                                  }}
                                />
                              </Box>
                            );
                          })}
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: "center", py: 2 }}>
                        <CheckCircle sx={{ color: "#22c55e", fontSize: 32 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: "0.8rem" }}>
                          Sem manutencoes pendentes
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>

                {/* User's cautelas + Devolutions */}
                <Grid item xs={12} md={3.5}>
                  {minhasCautelas.length > 0 && (
                    <Paper
                      sx={{
                        p: { xs: 2, sm: 2.5 },
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: alpha("#f59e0b", 0.3),
                        mb: 2,
                        maxHeight: 280,
                        overflow: "auto",
                      }}
                    >
                      <SectionHeader
                        title="Suas Cautelas"
                        icon={<PendingActions sx={{ color: "#f59e0b", fontSize: 22 }} />}
                        count={minhasCautelas.filter((c) => !c.signed).length}
                      />
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {minhasCautelas.map((cautela) => (
                          <CautelaStrip key={cautela.id} cautela={cautela} onSign={handleSign} />
                        ))}
                      </Box>
                    </Paper>
                  )}

                  {returnedCautelas.length > 0 && (
                    <Paper
                      sx={{
                        p: { xs: 2, sm: 2.5 },
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: alpha("#22c55e", 0.3),
                        maxHeight: 280,
                        overflow: "auto",
                      }}
                    >
                      <SectionHeader
                        title="Comprovantes de Devolucao"
                        icon={<AssignmentTurnedIn sx={{ color: "#22c55e", fontSize: 22 }} />}
                        count={returnedCautelas.length}
                      />
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {returnedCautelas.map((cautela) => (
                          <DevolucaoReceiptStrip
                            key={cautela.id}
                            cautela={cautela}
                            onAcknowledge={handleAcknowledgeReturn}
                          />
                        ))}
                      </Box>
                    </Paper>
                  )}

                  {minhasCautelas.length === 0 && returnedCautelas.length === 0 && (
                    <Paper
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        textAlign: "center",
                      }}
                    >
                      <CheckCircle sx={{ fontSize: 40, color: "#22c55e", mb: 1 }} />
                      <Typography variant="body2" fontWeight={600}>
                        Suas pendencias
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Nenhuma cautela ou comprovante pendente
                      </Typography>
                    </Paper>
                  )}
                </Grid>
              </Grid>
            </Box>
          </Fade>
        </Container>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarMessage.includes("sucesso") || snackbarMessage.includes("confirmado") ? "success" : "error"}
            sx={{ width: "100%" }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </MenuContext>
    </PrivateRoute>
  );
}
