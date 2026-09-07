import { useState, useEffect, useMemo, useCallback, memo } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
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
  Timestamp,
  addDoc,
  limit,
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
import PedidosAmizadeCard from "../../components/chat/PedidosAmizadeCard";
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import db from "../../firebase/db";
import { verifyToken } from "../../firebase/token";
import { logAudit } from "../../firebase/auditLog";
import CautelaStrip from "../../components/CautelaStrip";
import DevolucaoReceiptStrip from "../../components/DevolucaoReceiptStrip";
import UpcomingMaintenances from "../../components/maintenance/UpcomingMaintenances";
import CompressorQuickCard from "../../components/compressor/CompressorQuickCard";
import PainelAnalitico from "../../components/dashboard/PainelAnalitico";
import { createNextRecurrentMaintenance } from "../../services/maintenanceNotificationService";
import { sincronizarStatusAposConclusao } from "../../utils/materialStatus";

// ==================== TASK TYPE CONFIG ====================

const TASK_TYPES_CONFIG = {
  conferencia: { label: 'Conferencia de Material', color: '#3b82f6' },
  contagem: { label: 'Contagem de Material', color: '#8b5cf6' },
  verificacao: { label: 'Verificacao', color: '#f59e0b' },
  assinatura: { label: 'Atencao para Assinatura', color: '#ef4444' },
  procurar: { label: 'Procurar Material', color: '#06b6d4' },
  atualizar: { label: 'Atualizar Material', color: '#22c55e' },
  mensagem: { label: 'Mensagem / Recado', color: '#ff6b35' },
};

const TASK_PRIORITY_COLORS = {
  baixa: '#22c55e',
  media: '#f59e0b',
  alta: '#f97316',
  urgente: '#ef4444',
};

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


// ==================== CLICKABLE STAT CARD ====================

// Comparador ignora a identidade do onClick (arrow functions inline mudam a cada
// render do pai, mas o comportamento de navegação é estável — só a presença importa)
const statCardPropsEqual = (prev, next) =>
  prev.icon === next.icon &&
  prev.title === next.title &&
  prev.value === next.value &&
  prev.color === next.color &&
  prev.subtitle === next.subtitle &&
  prev.badge === next.badge &&
  prev.progress === next.progress &&
  !!prev.onClick === !!next.onClick;

const StatCard = memo(function StatCard(props) {
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
    <CardContent sx={{ p: { xs: 1.2, sm: 2.5 }, "&:last-child": { pb: { xs: 1.2, sm: 2.5 } } }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: { xs: 0.5, sm: 1 } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              fontSize: { xs: "0.5rem", sm: "0.7rem" },
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
              mt: 0.3,
              fontSize: { xs: "1.2rem", sm: "2rem" },
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
                fontSize: { xs: "0.5rem", sm: "0.7rem" },
                mt: 0.3,
                display: { xs: "none", sm: "block" },
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
                mt: 0.5,
                height: { xs: 3, sm: 5 },
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
              width: { xs: 28, sm: 52 },
              height: { xs: 28, sm: 52 },
              border: `2px solid ${alpha(color, 0.2)}`,
            }}
          >
            <IconComponent sx={{ fontSize: { xs: 14, sm: 26 } }} />
          </Avatar>
        </Badge>
      </Box>
      {onClick && (
        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            alignItems: "center",
            justifyContent: "flex-end",
            mt: 0.5,
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
}, statCardPropsEqual);

// ==================== DATE FILTER ====================

const DATE_FILTERS = [
  { value: "today", label: "Hoje", icon: <Today sx={{ fontSize: 16 }} /> },
  { value: "week", label: "Esta Semana", icon: <DateRange sx={{ fontSize: 16 }} /> },
  { value: "month", label: "Este Mes", icon: <CalendarToday sx={{ fontSize: 16 }} /> },
  { value: "custom", label: "Periodo", icon: <FilterList sx={{ fontSize: 16 }} /> },
  { value: "all", label: "Todo o Periodo", icon: <Visibility sx={{ fontSize: 16 }} /> },
];

const DateFilterBar = memo(({ dateFilter, setDateFilter, customStart, setCustomStart, customEnd, setCustomEnd }) => (
  <Box sx={{ mb: 1 }}>
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.5,
        alignItems: "center",
        mb: 1,
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
            fontSize: { xs: "0.65rem", sm: "0.75rem" },
            height: { xs: 28, sm: 32 },
            "& .MuiChip-icon": { fontSize: { xs: 14, sm: 16 } },
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
    </Box>
    {dateFilter === "custom" && (
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <TextField
          type="date"
          size="small"
          label="De"
          value={customStart}
          onChange={(e) => setCustomStart(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ flex: 1, minWidth: 130, "& .MuiInputBase-root": { height: 36, fontSize: "0.8rem" } }}
        />
        <TextField
          type="date"
          size="small"
          label="Ate"
          value={customEnd}
          onChange={(e) => setCustomEnd(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ flex: 1, minWidth: 130, "& .MuiInputBase-root": { height: 36, fontSize: "0.8rem" } }}
        />
      </Box>
    )}
  </Box>
));
DateFilterBar.displayName = "DateFilterBar";

// ==================== SECTION HEADER ====================

const SectionHeader = memo(({ title, icon, action, count }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      mb: { xs: 1.5, sm: 2 },
      flexWrap: "wrap",
      gap: 0.5,
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0, flex: 1 }}>
      <Box sx={{ flexShrink: 0 }}>{icon}</Box>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{
          fontSize: { xs: "0.82rem", sm: "1.05rem" },
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </Typography>
      {count !== undefined && (
        <Chip
          label={count}
          size="small"
          sx={{
            height: 20,
            fontWeight: 700,
            fontSize: "0.7rem",
            bgcolor: alpha("#1e3a5f", 0.1),
            color: "#1e3a5f",
            flexShrink: 0,
          }}
        />
      )}
    </Box>
    {action}
  </Box>
));
SectionHeader.displayName = "SectionHeader";

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
};

// Labels completo incluindo devolucao para exibição em listas
const MOVEMENT_LABELS_ALL = {
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

  // Task state
  const [demopTasks, setDemopTasks] = useState([]);

  // Alertas de conferência (chefe → admin)
  const [alertasConferencia, setAlertasConferencia] = useState([]);

  // User-specific state
  const [minhasCautelas, setMinhasCautelas] = useState([]);
  const [activeCautelas, setActiveCautelas] = useState([]);
  const [returnedCautelas, setReturnedCautelas] = useState([]);

  // UI state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [dateFilter] = useState("all");
  const [customStart] = useState("");
  const [customEnd] = useState("");

  // Maintenance completion dialog state
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completionData, setCompletionData] = useState({
    completionNotes: '',
    confirmedAsPlanned: false,
    maintenanceId: null,
    maintenance: null,
  });

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
      (m) => (m.type === "cautela" || m.type === "saída") && m.signed === false
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
      if (m.status === "concluida" || m.status === "cancelada" || m.status === "pausada") return false;
      const d = toDate(m.dueDate);
      return d && d < now;
    });
    const manutencoesPendentes = filteredManutencoes.filter(
      (m) => m.status === "pendente" || m.status === "em_andamento"
    );

    // By type counts - conta pelo type original de cada movimentação no período
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

    // Daily/monthly movement trend - usa filteredMovements para o range visível
    const dailyTrend = [];

    if (dateFilter === "all") {
      // "Todo o Periodo": agrupar por mês desde a primeira movimentação
      const monthMap = {};
      fm.forEach((m) => {
        const md = toDate(m.date);
        if (!md) return;
        const key = `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, "0")}`;
        if (!monthMap[key]) monthMap[key] = { total: 0, cautelas: 0, devolucoes: 0 };
        monthMap[key].total++;
        if (m.type === "cautela") monthMap[key].cautelas++;
        if (m.status === "devolvido" || m.status === "devolvidaDeReparo") monthMap[key].devolucoes++;
      });
      // Preencher meses faltantes entre o primeiro e o último
      const sortedKeys = Object.keys(monthMap).sort();
      if (sortedKeys.length > 0) {
        const [firstY, firstM] = sortedKeys[0].split("-").map(Number);
        const now = new Date();
        const cursor = new Date(firstY, firstM - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 1);
        while (cursor <= end) {
          const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
          const label = cursor.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
          const data = monthMap[key] || { total: 0, cautelas: 0, devolucoes: 0 };
          dailyTrend.push({ date: label, ...data });
          cursor.setMonth(cursor.getMonth() + 1);
        }
      }
    } else {
      // Determinar range de dias baseado no filtro
      let startDate, endDate;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === "today") {
        startDate = new Date(today);
        endDate = new Date(today);
      } else if (dateFilter === "week") {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6);
        endDate = new Date(today);
      } else if (dateFilter === "month") {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today);
      } else if (dateFilter === "custom" && customStart && customEnd) {
        startDate = new Date(customStart + "T00:00:00");
        endDate = new Date(customEnd + "T00:00:00");
      } else {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 13);
        endDate = new Date(today);
      }

      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const current = new Date(cursor);
        const dayStr = current.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        const dayMovements = fm.filter((m) => {
          const md = toDate(m.date);
          return md && md.toDateString() === current.toDateString();
        });
        dailyTrend.push({
          date: dayStr,
          total: dayMovements.length,
          cautelas: dayMovements.filter((m) => m.type === "cautela").length,
          devolucoes: dayMovements.filter((m) => m.status === "devolvido" || m.status === "devolvidaDeReparo").length,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
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

        // User/chefe role: simple fetch
        if (role === "user" || role === "chefe") {
          if (user?.userId) {
            let pendingCautelasSnap = { docs: [] };
            let pendingSaidasSnap = { docs: [] };
            let pendingTrocasSnap = { docs: [] };
            let returnsSnap = { docs: [] };
            let activeSnap = { docs: [] };

            // Promise.allSettled: 1 query falhando (ex.: índice ausente) não derruba as outras
            const results = await Promise.allSettled([
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
                  where("type", "==", "saída"),
                  where("signed", "==", false)
                )
              ),
              getDocs(
                query(
                  collection(db, "movimentacoes"),
                  where("user", "==", user.userId),
                  where("type", "==", "troca"),
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
                  where("status", "==", "cautelado"),
                  where("signed", "==", true)
                )
              ),
            ]);
            const [r0, r1, r2, r3, r4] = results;
            if (r0.status === 'fulfilled') pendingCautelasSnap = r0.value; else console.error('cautelas pendentes:', r0.reason);
            if (r1.status === 'fulfilled') pendingSaidasSnap = r1.value; else console.error('saidas pendentes:', r1.reason);
            if (r2.status === 'fulfilled') pendingTrocasSnap = r2.value; else console.error('trocas pendentes:', r2.reason);
            if (r3.status === 'fulfilled') returnsSnap = r3.value; else console.error('devolucoes:', r3.reason);
            if (r4.status === 'fulfilled') activeSnap = r4.value; else console.error('cautelas ativas:', r4.reason);

            // Filtrar saídas: só mostrar as novas (que têm subtype definido)
            const saidasFiltradas = pendingSaidasSnap.docs.filter((d) => {
              const data = d.data();
              return data.subtype;
            });
            const pendingSnap = {
              docs: [...pendingCautelasSnap.docs, ...saidasFiltradas, ...pendingTrocasSnap.docs]
            };
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
        ]);

        if (isMounted) {
          setMaterials(materialsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setViaturas(viaturasSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setRings(ringsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setManutencoes(manutencoesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          // Libera a UI antes do listener real-time de movimentações terminar
          setLoading(false);
        }

        // Real-time movements listener — limita às 2000 mais recentes para evitar carregar
        // todo o histórico no abrir do app. Dashboards filtram por data no client.
        const movQuery = query(
          collection(db, "movimentacoes"),
          orderBy("date", "desc"),
          limit(2000)
        );
        const unsub = onSnapshot(
          movQuery,
          (snapshot) => {
            if (isMounted) {
              setAllMovements(
                snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
              );
              setLoading(false);
            }
          },
          (err) => {
            console.error("Erro no listener de movimentações:", err);
            if (isMounted) setLoading(false);
          }
        );
        unsubscribers.push(unsub);

        // Real-time DEMOP tasks listener
        const tasksQuery = query(
          collection(db, "tarefas_demop"),
          where("status", "==", "ativa"),
          orderBy("createdAt", "desc")
        );
        const taskUnsub = onSnapshot(
          tasksQuery,
          (snapshot) => {
            if (isMounted) {
              const now = new Date();
              const activeTasks = snapshot.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter(t => {
                  const exp = t.expiresAt?.toDate ? t.expiresAt.toDate() : null;
                  return !exp || exp > now;
                });
              setDemopTasks(activeTasks);
            }
          },
          (err) => console.error("Listener tarefas DEMOP:", err)
        );
        unsubscribers.push(taskUnsub);

        // User's own cautelas + saídas + trocas pendentes (real-time)
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
                const cautelas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setMinhasCautelas((prev) => {
                  const outros = prev.filter((m) => m.type === "saída" || m.type === "troca");
                  return [...cautelas, ...outros];
                });
              }
            },
            (err) => console.error("Listener cautelas pendentes:", err)
          );
          unsubscribers.push(cautelaUnsub);

          const saidaUnsub = onSnapshot(
            query(
              collection(db, "movimentacoes"),
              where("user", "==", user.userId),
              where("type", "==", "saída"),
              where("signed", "==", false)
            ),
            (snap) => {
              if (isMounted) {
                // Filtrar: só saídas novas com subtype (ignora saídas antigas)
                const saidas = snap.docs
                  .map((d) => ({ id: d.id, ...d.data() }))
                  .filter((m) => m.subtype);
                setMinhasCautelas((prev) => {
                  const outros = prev.filter((m) => m.type === "cautela" || m.type === "troca");
                  return [...outros, ...saidas];
                });
              }
            },
            (err) => console.error("Listener saídas pendentes:", err)
          );
          unsubscribers.push(saidaUnsub);

          const trocaUnsub = onSnapshot(
            query(
              collection(db, "movimentacoes"),
              where("user", "==", user.userId),
              where("type", "==", "troca"),
              where("signed", "==", false)
            ),
            (snap) => {
              if (isMounted) {
                const trocas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setMinhasCautelas((prev) => {
                  const outros = prev.filter((m) => m.type === "cautela" || m.type === "saída");
                  return [...outros, ...trocas];
                });
              }
            },
            (err) => console.error("Listener trocas pendentes:", err)
          );
          unsubscribers.push(trocaUnsub);

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
            },
            (err) => console.error("Listener devoluções:", err)
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

  // ==================== ALERTAS DE CONFERÊNCIA (admin/admingeral) ====================
  useEffect(() => {
    if (userRole !== "admin" && userRole !== "admingeral") return;

    const alertasQuery = query(
      collection(db, "alertas_conferencia"),
      where("lido", "==", false),
      orderBy("data_alerta", "desc")
    );
    const unsub = onSnapshot(alertasQuery, (snapshot) => {
      setAlertasConferencia(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});

    return () => unsub();
  }, [userRole]);

  const handleMarcarAlertaLido = async (alertaId) => {
    try {
      await updateDoc(doc(db, "alertas_conferencia", alertaId), { lido: true });
      setAlertasConferencia((prev) => prev.filter((a) => a.id !== alertaId));
    } catch (error) {
      console.error("Erro ao marcar alerta como lido:", error);
    }
  };

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

  // ==================== TASK HANDLER ====================

  const handleCompleteTask = async (taskId) => {
    try {
      const task = demopTasks.find((t) => t.id === taskId);
      const taskRef = doc(db, "tarefas_demop", taskId);
      await updateDoc(taskRef, {
        status: "concluida",
        completedAt: serverTimestamp(),
        completedBy: userName,
        completedByName: userName,
      });

      // Notificar admingeral via audit_log
      logAudit({
        action: 'tarefa_complete',
        userId: 'dashboard',
        userName: userName,
        targetCollection: 'tarefas_demop',
        targetId: taskId,
        targetName: task?.title || 'Tarefa',
        details: { concluida_por: userName, concluida_manualmente: true },
      });

      setDemopTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSnackbarMessage("Missao concluida com sucesso!");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Erro ao concluir tarefa:", error);
      setSnackbarMessage("Erro ao concluir a tarefa.");
      setSnackbarOpen(true);
    }
  };

  // ==================== CHART DATA ====================



  // ==================== MAINTENANCE COMPLETION ====================

  const handleOpenCompleteMaintenance = (maintenance) => {
    setCompletionData({
      completionNotes: '',
      confirmedAsPlanned: false,
      maintenanceId: maintenance.id,
      maintenance,
    });
    setCompleteDialogOpen(true);
  };

  const handleConfirmCompleteMaintenance = async () => {
    const { maintenanceId, maintenance, completionNotes, confirmedAsPlanned } = completionData;
    const finalNotes = confirmedAsPlanned
      ? `[CONFORME PREVISTO] ${completionNotes || ''}`.trim()
      : completionNotes;
    try {
      const now = Timestamp.now();
      const nowDate = now.toDate();
      await updateDoc(doc(db, 'manutencoes', maintenanceId), {
        status: 'concluida',
        updatedAt: now,
        completedAt: now,
        completionNotes: finalNotes || '',
        completedBy: userName || '',
      });

      await addDoc(collection(db, 'historico_manutencoes'), {
        materialId: maintenance.materialId,
        materialDescription: maintenance.materialDescription,
        materialCategory: maintenance.materialCategory,
        type: maintenance.type,
        dueDate: maintenance.dueDate instanceof Date ? Timestamp.fromDate(maintenance.dueDate) : maintenance.dueDate,
        description: maintenance.description || '',
        priority: maintenance.priority || 'media',
        estimatedDuration: maintenance.estimatedDuration || null,
        requiredParts: maintenance.requiredParts || [],
        isRecurrent: maintenance.isRecurrent || false,
        recurrenceType: maintenance.recurrenceType || null,
        recurrenceCount: maintenance.recurrenceCount || 0,
        responsibleName: '',
        completedBy: userName || '',
        createdAt: maintenance.createdAt instanceof Date ? Timestamp.fromDate(maintenance.createdAt) : (maintenance.createdAt || Timestamp.now()),
        createdBy: maintenance.createdBy || '',
        completedAt: now,
        completionNotes: finalNotes || '',
        originalId: maintenance.id,
      });

      let nextDateMsg = '';
      if (maintenance?.isRecurrent && maintenance?.recurrenceType) {
        const nextMaint = await createNextRecurrentMaintenance({ ...maintenance, completedAt: nowDate, completionNotes: finalNotes });
        if (nextMaint?.paused) {
          nextDateMsg = ' | Material inoperante: recorrência pausada até voltar a operante';
        } else if (nextMaint) {
          const nextDate = nextMaint.dueDate?.toDate?.() || nextMaint.dueDate;
          if (nextDate) {
            nextDateMsg = ` | Próxima agendada para ${nextDate.toLocaleDateString('pt-BR')}`;
          }
        }
      }

      // Volta a operante apenas se nao restar outra manutencao em aberto
      await sincronizarStatusAposConclusao(maintenance?.materialId, maintenanceId, now, maintenance?.inoperantQuantity || 0);

      setCompleteDialogOpen(false);
      setCompletionData({ completionNotes: '', confirmedAsPlanned: false, maintenanceId: null, maintenance: null });
      setSnackbarMessage(`Manutenção concluída com sucesso!${nextDateMsg}`);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Erro ao concluir manutencao:', error);
      setSnackbarMessage('Erro ao concluir manutencao');
      setSnackbarOpen(true);
    }
  };

  // ==================== LOADING ====================

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100dvh",
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

  // Safeguard: if role is not determined yet, show loading
  if (!userRole) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100dvh",
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

  // ==================== USER / CHEFE VIEW ====================

  if (userRole === "user" || userRole === "chefe") {
    return (
      <PrivateRoute>
        <MenuContext>
          <Container maxWidth="sm" sx={{ py: { xs: 1.5, sm: 2 }, px: { xs: 1, sm: 2 } }}>
            <PedidosAmizadeCard />
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
              <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                Ola, {userName}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Suas movimentações pendentes de assinatura
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
                    sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
                  >
                    {minhasCautelas.length}
                  </Typography>
                  <Typography
                    variant="body2"
                    color={minhasCautelas.length > 0 ? "#a16207" : "#15803d"}
                  >
                    {minhasCautelas.length === 0
                      ? "Nenhuma movimentação pendente"
                      : minhasCautelas.length === 1
                      ? "Movimentação pendente"
                      : "Movimentações pendentes"}
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
                  p: { xs: 2, sm: 4 },
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
                  Voce nao possui movimentações pendentes de assinatura.
                </Typography>
              </Paper>
            )}

            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
                <Inventory sx={{ color: "#1e3a5f", fontSize: 24 }} />
                <Typography variant="h6" fontWeight={600} sx={{ color: "#1e3a5f", fontSize: { xs: '0.9rem', sm: '1.25rem' } }}>
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
                    p: { xs: 1.5, sm: 3 },
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
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: "#1e3a5f", fontSize: { xs: '0.9rem', sm: '1.25rem' } }}>
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

          {/* Dialog de conclusão de manutenção */}
          <Dialog
            open={completeDialogOpen}
            onClose={() => setCompleteDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
          >
            <Box sx={{ bgcolor: 'success.main', color: 'white', px: { xs: 2, sm: 3 }, py: 2 }}>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Concluir Manutencao
              </Typography>
              {completionData.maintenance && (
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {completionData.maintenance.materialDescription} - {completionData.maintenance.type}
                </Typography>
              )}
            </Box>
            <DialogContent sx={{ pt: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={completionData.confirmedAsPlanned}
                    onChange={(e) => setCompletionData(prev => ({ ...prev, confirmedAsPlanned: e.target.checked }))}
                    color="success"
                  />
                }
                label="Realizada conforme previsto"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="O que foi realizado?"
                placeholder="Descreva o que foi feito nesta manutencao..."
                value={completionData.completionNotes}
                onChange={(e) => setCompletionData(prev => ({ ...prev, completionNotes: e.target.value }))}
              />
            </DialogContent>
            <DialogActions sx={{ p: { xs: 1.5, sm: 2.5 }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
              <Button onClick={() => setCompleteDialogOpen(false)} variant="outlined" fullWidth={isMobile}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmCompleteMaintenance}
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                fullWidth={isMobile}
              >
                Concluir
              </Button>
            </DialogActions>
          </Dialog>

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

  return (
    <PrivateRoute>
      <MenuContext>
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
          <PedidosAmizadeCard />
          <Fade in timeout={600}>
            <Box>
              {/* ====== HEADER ====== */}
              <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      background: "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      fontSize: { xs: "1.1rem", sm: "1.5rem", md: "2rem" },
                      lineHeight: 1.2,
                    }}
                  >
                    Deposito de Material Operacional do GOCG
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
                    <Chip
                      icon={<Speed sx={{ fontSize: { xs: 12, sm: 16 } }} />}
                      label={`${stats.movHoje} hoje`}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: { xs: "0.6rem", sm: "0.75rem" },
                        height: { xs: 24, sm: 32 },
                        display: { xs: "none", sm: "flex" },
                        bgcolor: stats.movHoje > 0 ? alpha("#22c55e", 0.1) : alpha("#64748b", 0.1),
                        color: stats.movHoje > 0 ? "#22c55e" : "#64748b",
                      }}
                    />
                    <IconButton
                      onClick={() => window.location.reload()}
                      size="small"
                      sx={{
                        bgcolor: alpha("#1e3a5f", 0.05),
                        "&:hover": { bgcolor: alpha("#1e3a5f", 0.1) },
                      }}
                    >
                      <Refresh sx={{ fontSize: { xs: 18, sm: 24 } }} />
                    </IconButton>
                  </Box>
                </Box>
              </Box>

              {/* ====== DEMOP TASKS BANNER ====== */}
              {demopTasks.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  {demopTasks.map((task) => {
                    const typeInfo = TASK_TYPES_CONFIG[task.type] || TASK_TYPES_CONFIG.mensagem;
                    const priorityColor = TASK_PRIORITY_COLORS[task.priority] || '#f59e0b';
                    const isUrgent = task.priority === 'urgente' || task.priority === 'alta';
                    const progressPercent = task.targetCount ? Math.min(((task.progress || 0) / task.targetCount) * 100, 100) : null;

                    const expiresAtDate = task.expiresAt?.toDate ? task.expiresAt.toDate() : null;
                    let timeText = '';
                    if (expiresAtDate) {
                      const diff = expiresAtDate - new Date();
                      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                      timeText = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
                    }

                    return (
                      <Paper
                        key={task.id}
                        elevation={isUrgent ? 8 : 4}
                        sx={{
                          p: { xs: 2, sm: 3 },
                          mb: 2,
                          borderRadius: 3,
                          position: 'relative',
                          overflow: 'hidden',
                          border: '2px solid',
                          borderColor: priorityColor,
                          background: (t) => t.palette.mode === 'dark'
                            ? `linear-gradient(135deg, ${alpha(typeInfo.color, 0.15)} 0%, ${alpha(priorityColor, 0.1)} 100%)`
                            : `linear-gradient(135deg, ${alpha(typeInfo.color, 0.06)} 0%, ${alpha(priorityColor, 0.04)} 100%)`,
                          boxShadow: `0 8px 32px ${alpha(priorityColor, 0.25)}`,
                          animation: isUrgent ? 'taskPulse 3s ease-in-out infinite' : 'none',
                          '@keyframes taskPulse': {
                            '0%, 100%': { boxShadow: `0 8px 32px ${alpha(priorityColor, 0.25)}` },
                            '50%': { boxShadow: `0 8px 48px ${alpha(priorityColor, 0.45)}` },
                          },
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0, left: 0, right: 0,
                            height: 6,
                            background: `linear-gradient(90deg, ${typeInfo.color} 0%, ${priorityColor} 50%, ${typeInfo.color} 100%)`,
                            backgroundSize: '200% 100%',
                            animation: isUrgent ? 'shimmer 2s linear infinite' : 'none',
                            '@keyframes shimmer': {
                              '0%': { backgroundPosition: '200% 0' },
                              '100%': { backgroundPosition: '-200% 0' },
                            },
                          },
                        }}
                      >
                        {/* Header */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1.5, sm: 2 }, mb: 2 }}>
                          <Avatar
                            sx={{
                              bgcolor: alpha(typeInfo.color, 0.15),
                              color: typeInfo.color,
                              width: { xs: 40, sm: 56 },
                              height: { xs: 40, sm: 56 },
                              border: `2px solid ${alpha(typeInfo.color, 0.3)}`,
                            }}
                          >
                            <Assignment sx={{ fontSize: { xs: 20, sm: 28 } }} />
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="overline"
                              sx={{
                                fontWeight: 800,
                                letterSpacing: 1.5,
                                color: priorityColor,
                                fontSize: { xs: '0.6rem', sm: '0.7rem' },
                              }}
                            >
                              MISSAO DO DIA - DEMOP
                            </Typography>
                            <Typography
                              variant="h5"
                              sx={{
                                fontWeight: 800,
                                fontSize: { xs: '1rem', sm: '1.35rem' },
                                lineHeight: 1.3,
                                color: 'text.primary',
                              }}
                            >
                              {task.title}
                            </Typography>
                            {task.description && (
                              <Typography
                                variant="body2"
                                sx={{
                                  mt: 0.5,
                                  color: 'text.secondary',
                                  fontSize: { xs: '0.8rem', sm: '0.92rem' },
                                  lineHeight: 1.5,
                                }}
                              >
                                {task.description}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, flexShrink: 0 }}>
                            <Chip
                              label={task.priority?.toUpperCase()}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: { xs: '0.6rem', sm: '0.7rem' },
                                bgcolor: alpha(priorityColor, 0.15),
                                color: priorityColor,
                                border: `1px solid ${alpha(priorityColor, 0.3)}`,
                              }}
                            />
                            <Chip
                              label={typeInfo.label}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: { xs: '0.55rem', sm: '0.65rem' },
                                bgcolor: alpha(typeInfo.color, 0.1),
                                color: typeInfo.color,
                              }}
                            />
                          </Box>
                        </Box>

                        {/* Progress Bar */}
                        {task.targetCount && (
                          <Box sx={{ mb: 2, px: { xs: 0, sm: 1 } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2" fontWeight={700} sx={{ fontSize: { xs: '0.78rem', sm: '0.88rem' } }}>
                                Progresso da Conferencia
                              </Typography>
                              <Typography variant="body2" fontWeight={800} sx={{ color: typeInfo.color, fontSize: { xs: '0.78rem', sm: '0.88rem' } }}>
                                {task.progress || 0} / {task.targetCount} materiais
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={progressPercent}
                              sx={{
                                height: { xs: 8, sm: 12 },
                                borderRadius: 6,
                                bgcolor: alpha(typeInfo.color, 0.1),
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: typeInfo.color,
                                  borderRadius: 6,
                                  transition: 'transform 0.5s ease',
                                },
                              }}
                            />
                          </Box>
                        )}

                        {/* Footer */}
                        <Box sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: { xs: 'stretch', sm: 'center' },
                          flexDirection: { xs: 'column', sm: 'row' },
                          flexWrap: 'wrap',
                          gap: 1,
                          pt: 1,
                          borderTop: `1px solid ${alpha(priorityColor, 0.15)}`,
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
                            <Chip
                              icon={<AccessTime sx={{ fontSize: '14px !important' }} />}
                              label={`Expira em ${timeText}`}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                bgcolor: alpha('#3b82f6', 0.1),
                                color: '#3b82f6',
                                '& .MuiChip-icon': { color: '#3b82f6' },
                              }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.72rem' } }}>
                              Por: {task.createdByName}
                            </Typography>
                          </Box>
                          {!task.targetCount && userRole !== 'user' && (
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
                              onClick={() => handleCompleteTask(task.id)}
                              sx={{
                                bgcolor: '#22c55e',
                                fontWeight: 700,
                                borderRadius: 2,
                                fontSize: { xs: '0.7rem', sm: '0.78rem' },
                                px: { xs: 1.5, sm: 2.5 },
                                '&:hover': { bgcolor: '#16a34a' },
                              }}
                            >
                              Concluir
                            </Button>
                          )}
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              )}

              {/* ====== ALERTS ====== */}
              {stats.manutencoesVencidas.length > 0 && (
                <Box sx={{ mb: 3, display: "flex", flexDirection: "column", gap: 1 }}>
                  <Alert
                    severity="error"
                    variant="outlined"
                    action={
                      <Button
                        color="error"
                        size="small"
                        onClick={() => navigate("/manutencao?tab=1")}
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
                </Box>
              )}

              {/* ====== CONTROLE DO COMPRESSOR FIXO (admins) ====== */}
              {(userRole === 'admin' || userRole === 'admingeral') && (
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <CompressorQuickCard />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* ====== MANUTENÇÕES PREVISTAS (destaque) ====== */}
              {(userRole === 'admin' || userRole === 'admingeral') && (
                <Box sx={{ mb: 3 }}>
                  <UpcomingMaintenances onComplete={handleOpenCompleteMaintenance} />
                </Box>
              )}

              {/* ====== ALERTAS DE CONFERÊNCIA (admin/admingeral) ====== */}
              {(userRole === "admin" || userRole === "admingeral") && alertasConferencia.length > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    mb: 3,
                    borderRadius: 3,
                    border: "2px solid #ff9800",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      px: { xs: 1.5, sm: 2.5 },
                      py: 1.5,
                      background: "linear-gradient(135deg, #ff9800 0%, #e65100 100%)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <WarningAmber sx={{ fontSize: 22 }} />
                    <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                      Alertas Recentes de Viaturas
                    </Typography>
                    <Chip
                      label={alertasConferencia.length}
                      size="small"
                      sx={{ backgroundColor: "rgba(255,255,255,0.25)", color: "white", fontWeight: 700 }}
                    />
                  </Box>
                  <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
                    {alertasConferencia.map((alerta) => {
                      const dataStr = alerta.data_alerta?.toDate
                        ? alerta.data_alerta.toDate().toLocaleString("pt-BR")
                        : "";
                      return (
                        <Box
                          key={alerta.id}
                          sx={{
                            px: { xs: 1.5, sm: 2.5 },
                            py: 1.5,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            flexWrap: "wrap",
                            "&:last-child": { borderBottom: "none" },
                            "&:hover": { backgroundColor: alpha("#ff9800", 0.04) },
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: "0.8rem", sm: "0.88rem" } }}>
                              Viatura {alerta.viatura_prefixo}: <strong>{alerta.material_description}</strong>{" "}
                              {alerta.diferenca < 0 ? "reduziu" : "aumentou"} de{" "}
                              <strong>{alerta.quantidade_esperada}</strong> para{" "}
                              <strong>{alerta.quantidade_encontrada}</strong>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Chefe: {alerta.chefe_nome} | {dataStr}
                            </Typography>
                          </Box>
                          <Tooltip title="Marcar como lido">
                            <IconButton
                              size="small"
                              onClick={() => handleMarcarAlertaLido(alerta.id)}
                              sx={{ color: "#4caf50" }}
                            >
                              <CheckCircle sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      );
                    })}
                  </Box>
                </Paper>
              )}

              {/* ====== PAINEL ANALITICO (Power BI do deposito) ====== */}
              <PainelAnalitico userRole={userRole} />

              <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                {/* User's cautelas + Devolutions */}
                <Grid item xs={12}>
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
                        p: { xs: 1.5, sm: 3 },
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

        {/* Dialog de conclusão de manutenção */}
        <Dialog
          open={completeDialogOpen}
          onClose={() => setCompleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
        >
          <Box sx={{ bgcolor: 'success.main', color: 'white', px: { xs: 2, sm: 3 }, py: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Concluir Manutencao
            </Typography>
            {completionData.maintenance && (
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {completionData.maintenance.materialDescription} - {completionData.maintenance.type}
              </Typography>
            )}
          </Box>
          <DialogContent sx={{ pt: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={completionData.confirmedAsPlanned}
                  onChange={(e) => setCompletionData(prev => ({ ...prev, confirmedAsPlanned: e.target.checked }))}
                  color="success"
                />
              }
              label="Realizada conforme previsto"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="O que foi realizado?"
              placeholder="Descreva o que foi feito nesta manutencao..."
              value={completionData.completionNotes}
              onChange={(e) => setCompletionData(prev => ({ ...prev, completionNotes: e.target.value }))}
            />
          </DialogContent>
          <DialogActions sx={{ p: { xs: 1.5, sm: 2.5 }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
            <Button onClick={() => setCompleteDialogOpen(false)} variant="outlined" fullWidth={isMobile}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmCompleteMaintenance}
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              fullWidth={isMobile}
            >
              Concluir
            </Button>
          </DialogActions>
        </Dialog>

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
