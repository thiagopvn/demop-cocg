import { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Paper,
  Skeleton,
  Chip,
  IconButton,
  Fade,
  Grow,
  Container,
  Avatar,
  useTheme,
  alpha,
  Alert,
  AlertTitle,
  Button,
} from "@mui/material";
import {
  LocalShipping,
  Inventory,
  Person,
  Timeline,
  TrendingUp,
  TrendingDown,
  SwapHoriz,
  Build,
  Delete,
  CheckCircle,
  AccessTime,
  MoreVert,
  AssignmentTurnedIn,
  Warning,
  Assignment,
  AccountCircle,
  VerifiedUser,
  DonutSmall,
} from "@mui/icons-material";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  orderBy,
  limit,
  doc,
} from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import db from "../../firebase/db";
import { verifyToken } from "../../firebase/token";
import CautelaStrip from "../../components/CautelaStrip";

const StatCard = ({ icon: Icon, title, value, color, trend, loading }) => {
  
  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
        border: `1px solid ${alpha(color, 0.2)}`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 24px ${alpha(color, 0.2)}`,
          border: `1px solid ${alpha(color, 0.3)}`,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.6)} 100%)`,
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            {loading ? (
              <>
                <Skeleton variant="text" width={100} height={20} />
                <Skeleton variant="text" width={60} height={40} />
              </>
            ) : (
              <>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.75rem'
                  }}
                >
                  {title}
                </Typography>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700,
                    color: color,
                    mt: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  {value}
                  {trend && (
                    <Chip
                      size="small"
                      icon={trend > 0 ? <TrendingUp /> : <TrendingDown />}
                      label={`${trend > 0 ? '+' : ''}${trend}%`}
                      sx={{
                        height: 24,
                        backgroundColor: trend > 0 ? alpha('#22c55e', 0.1) : alpha('#ef4444', 0.1),
                        color: trend > 0 ? '#22c55e' : '#ef4444',
                        border: `1px solid ${trend > 0 ? alpha('#22c55e', 0.3) : alpha('#ef4444', 0.3)}`,
                        '& .MuiChip-icon': {
                          fontSize: 16,
                          color: 'inherit'
                        }
                      }}
                    />
                  )}
                </Typography>
              </>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: alpha(color, 0.1),
              color: color,
              width: 56,
              height: 56,
              border: `2px solid ${alpha(color, 0.2)}`,
            }}
          >
            <Icon sx={{ fontSize: 28 }} />
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

const MovementCard = ({ movement }) => {
  const getStatusColor = (type) => {
    const colors = {
      aquisicao: '#22c55e',
      cautela: '#3b82f6',
      descarte: '#ef4444',
      reparo: '#f59e0b',
      devolucao: '#8b5cf6',
    };
    return colors[type] || '#64748b';
  };

  const getStatusIcon = (type) => {
    const icons = {
      aquisicao: <TrendingUp />,
      cautela: <SwapHoriz />,
      descarte: <Delete />,
      reparo: <Build />,
      devolucao: <AssignmentTurnedIn />,
    };
    return icons[type] || <Timeline />;
  };

  return (
    <Paper
      sx={{
        p: 2,
        mb: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateX(4px)',
          borderColor: getStatusColor(movement.type),
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: alpha(getStatusColor(movement.type), 0.1),
              color: getStatusColor(movement.type),
              width: 40,
              height: 40,
            }}
          >
            {getStatusIcon(movement.type)}
          </Avatar>
          <Box>
            <Typography variant="body1" fontWeight={600}>
              {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)}
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {movement.sender_name || 'Usuário'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            {new Date(movement.date?.toDate?.() || movement.date).toLocaleDateString('pt-BR')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(movement.date?.toDate?.() || movement.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default function Home() {
  const [stats, setStats] = useState({
    totalMaterials: 0,
    totalViaturas: 0,
    totalUsers: 0,
    recentMovements: [],
    allMovements: [],
    materiaisCautelados: 0,
    retiradasAneis: 0,
  });
  const [loading, setLoading] = useState(true);
  const [minhasCautelas, setMinhasCautelas] = useState([]);

  useEffect(() => {
    const getMinhasCautelas = async () => {
      try {
        const token = localStorage.getItem("token");
        const user = await verifyToken(token);
        const movimentacoes = await getDocs(
          query(collection(db, "movimentacoes"), where("user", "==", user.userId))
        );
        const movimentacoesList = movimentacoes.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMinhasCautelas(movimentacoesList);
      } catch (error) {
        console.error("Erro ao buscar cautelas:", error);
      }
    };

    const fetchData = async () => {
      try {
        const materialsSnap = await getDocs(collection(db, "materials"));
        const viaturasSnap = await getDocs(collection(db, "viaturas"));
        const usersSnap = await getDocs(collection(db, "users"));
        const recentMovementsSnap = await getDocs(
          query(
            collection(db, "movimentacoes"),
            orderBy("date", "desc"),
            limit(5)
          )
        );
        const allMovementsSnap = await getDocs(
          query(
            collection(db, "movimentacoes"),
            orderBy("date", "desc"),
            limit(50)
          )
        );
        
        // Buscar materiais cautelados (não devolvidos)
        const cauteladosSnap = await getDocs(
          query(
            collection(db, "movimentacoes"),
            where("type", "==", "cautela"),
            where("returned", "!=", true)
          )
        );
        
        // Buscar retiradas de anéis
        const aneisSnap = await getDocs(collection(db, "aneis"));
        
        
        // Enriquecer movimentações com nomes completos
        const enrichedRecentMovements = await Promise.all(
          recentMovementsSnap.docs.map(async (docSnap) => {
            const data = docSnap.data();
            let fullName = 'Usuário';
            
            if (data.user) {
              // Buscar usuário específico se necessário
              const userDocRef = doc(db, "users", data.user);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                const userData = userDoc.data();
                fullName = userData.name || userData.username || 'Usuário';
              }
            }
            
            return {
              id: docSnap.id,
              ...data,
              sender_name: fullName
            };
          })
        );

        setStats({
          totalMaterials: materialsSnap.size,
          totalViaturas: viaturasSnap.size,
          totalUsers: usersSnap.size,
          recentMovements: enrichedRecentMovements,
          allMovements: allMovementsSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })),
          materiaisCautelados: cauteladosSnap.size,
          retiradasAneis: aneisSnap.size,
        });
        setLoading(false);
      } catch (error) {
        console.error("Erro:", error);
        setLoading(false);
      }
    };

    getMinhasCautelas();
    fetchData();
  }, []);

  const handleSign = async (id) => {
    try {
      const docRef = doc(db, "movimentacoes", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        await updateDoc(docRef, {
          signed: true,
        });
        console.log("Documento atualizado com sucesso!");
        
        // Atualizar estado local
        setMinhasCautelas(prev => 
          prev.map(c => c.id === id ? { ...c, signed: true } : c)
        );
      }
    } catch (error) {
      console.error("Erro ao assinar documento:", error);
    }
  };

  const chartData = [
    {
      name: "Aquisição",
      value: stats.allMovements.filter((m) => m.type === "aquisicao").length,
      color: '#22c55e'
    },
    {
      name: "Cautela",
      value: stats.allMovements.filter((m) => m.type === "cautela").length,
      color: '#3b82f6'
    },
    {
      name: "Descarte",
      value: stats.allMovements.filter((m) => m.type === "descarte").length,
      color: '#ef4444'
    },
    {
      name: "Reparo",
      value: stats.allMovements.filter((m) => m.type === "reparo").length,
      color: '#f59e0b'
    },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" fontWeight={600}>{label}</Typography>
          <Typography variant="body2" color="primary">
            Quantidade: {payload[0].value}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <CircularProgress size={48} />
          <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
            Carregando dados...
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <PrivateRoute>
      <MenuContext>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Fade in timeout={600}>
            <Box>
              {/* Header */}
              <Box sx={{ mb: 4 }}>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1
                  }}
                >
                  Dashboard
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Bem-vindo ao sistema de controle de materiais
                </Typography>
              </Box>

              {/* Stats Cards */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {[
                  { 
                    icon: Assignment, 
                    title: 'Materiais Cautelados', 
                    value: stats.materiaisCautelados, 
                    color: '#ef4444',
                    trend: null 
                  },
                  { 
                    icon: Inventory, 
                    title: 'Total de Materiais', 
                    value: stats.totalMaterials, 
                    color: '#3b82f6',
                    trend: null 
                  },
                  { 
                    icon: Person, 
                    title: 'Total de Usuários', 
                    value: stats.totalUsers, 
                    color: '#22c55e',
                    trend: null 
                  },
                  { 
                    icon: DonutSmall, 
                    title: 'Retiradas de Anéis', 
                    value: stats.retiradasAneis, 
                    color: '#f59e0b',
                    trend: null 
                  },
                ].map((item, index) => (
                  <Grow in timeout={300 + index * 100} key={index}>
                    <Grid item xs={12} sm={6} md={3}>
                      <StatCard {...item} loading={loading} />
                    </Grid>
                  </Grow>
                ))}
              </Grid>

              {/* Charts Section */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={8}>
                  <Paper 
                    sx={{ 
                      p: 3, 
                      height: 400,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                      Movimentações por Tipo
                    </Typography>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.08)} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 12 }}
                          axisLine={{ stroke: alpha('#000', 0.1) }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          axisLine={{ stroke: alpha('#000', 0.1) }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar 
                          dataKey="value" 
                          radius={[8, 8, 0, 0]}
                          animationDuration={1000}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper 
                    sx={{ 
                      p: 3, 
                      height: 400,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.05)} 0%, ${alpha('#8b5cf6', 0.05)} 100%)`,
                    }}
                  >
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                      Estatísticas Rápidas
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '85%', justifyContent: 'center' }}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2, 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: alpha('#3b82f6', 0.2),
                          background: alpha('#3b82f6', 0.05),
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Taxa de Cautela
                        </Typography>
                        <Typography variant="h4" color="#3b82f6" fontWeight={700}>
                          {stats.totalMaterials > 0 
                            ? `${((stats.materiaisCautelados / stats.totalMaterials) * 100).toFixed(1)}%`
                            : '0%'
                          }
                        </Typography>
                      </Paper>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2, 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: alpha('#22c55e', 0.2),
                          background: alpha('#22c55e', 0.05),
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Movimentações Hoje
                        </Typography>
                        <Typography variant="h4" color="#22c55e" fontWeight={700}>
                          {stats.allMovements.filter(m => {
                            const moveDate = new Date(m.date?.toDate?.() || m.date);
                            const today = new Date();
                            return moveDate.toDateString() === today.toDateString();
                          }).length}
                        </Typography>
                      </Paper>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2, 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: alpha('#f59e0b', 0.2),
                          background: alpha('#f59e0b', 0.05),
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Pendentes de Assinatura
                        </Typography>
                        <Typography variant="h4" color="#f59e0b" fontWeight={700}>
                          {minhasCautelas.filter(c => !c.signed).length}
                        </Typography>
                      </Paper>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              {/* Recent Movements & User Cautelas */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper 
                    sx={{ 
                      p: 3,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      maxHeight: 500,
                      overflow: 'auto'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" fontWeight={600}>
                        Movimentações Recentes
                      </Typography>
                      <Chip 
                        icon={<AccessTime />} 
                        label="Últimas 5" 
                        size="small"
                        sx={{ 
                          backgroundColor: alpha('#3b82f6', 0.1),
                          color: '#3b82f6'
                        }}
                      />
                    </Box>
                    {stats.recentMovements.length > 0 ? (
                      stats.recentMovements.map((movement, index) => (
                        <Grow in timeout={300 + index * 100} key={movement.id}>
                          <Box>
                            <MovementCard movement={movement} />
                          </Box>
                        </Grow>
                      ))
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Timeline sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                        <Typography color="text.secondary">
                          Nenhuma movimentação recente
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  {minhasCautelas.length > 0 && (
                    <Paper 
                      sx={{ 
                        p: 3,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        maxHeight: 500,
                        overflow: 'auto'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" fontWeight={600}>
                          Suas Movimentações
                        </Typography>
                        <Chip 
                          icon={<Warning />} 
                          label={`${minhasCautelas.filter(c => !c.signed).length} pendentes`}
                          size="small"
                          color={minhasCautelas.filter(c => !c.signed).length > 0 ? "warning" : "success"}
                        />
                      </Box>
                      {minhasCautelas.map((cautela, index) => (
                        <Grow in timeout={300 + index * 100} key={cautela.id}>
                          <Box>
                            <CautelaStrip
                              cautela={cautela}
                              onSign={handleSign}
                            />
                          </Box>
                        </Grow>
                      ))}
                    </Paper>
                  )}
                </Grid>
              </Grid>
            </Box>
          </Fade>
        </Container>
      </MenuContext>
    </PrivateRoute>
  );
}