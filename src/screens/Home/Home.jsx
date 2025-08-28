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
  alpha,
  Alert,
  AlertTitle,
  Button,
  Snackbar,
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
  Refresh,
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
  onSnapshot,
  serverTimestamp,
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

const StatCard = ({ icon: Icon, title, value, color, loading }) => {
  // Avoid unused variable warning
  Icon;
  
  return (
    <Card
      sx={{
        height: '100%',
        minHeight: { xs: 120, sm: 'auto' },
        background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
        border: `1px solid ${alpha(color, 0.2)}`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: { xs: 'none', sm: 'translateY(-4px)' },
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
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
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
                    fontSize: { xs: '0.65rem', sm: '0.75rem' },
                    display: 'block',
                    lineHeight: 1.2
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
                    gap: 1,
                    fontSize: { xs: '1.5rem', sm: '2.125rem' }
                  }}
                >
                  {value}
                </Typography>
              </>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: alpha(color, 0.1),
              color: color,
              width: { xs: 40, sm: 56 },
              height: { xs: 40, sm: 56 },
              border: `2px solid ${alpha(color, 0.2)}`,
            }}
          >
            <Icon sx={{ fontSize: { xs: 20, sm: 28 } }} />
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
        p: { xs: 1.5, sm: 2 },
        mb: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 3,
          transform: { xs: 'none', sm: 'translateX(4px)' },
          borderColor: getStatusColor(movement.type),
        }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        gap: { xs: 1, sm: 0 }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, flex: 1 }}>
          <Avatar
            sx={{
              bgcolor: alpha(getStatusColor(movement.type), 0.1),
              color: getStatusColor(movement.type),
              width: { xs: 36, sm: 40 },
              height: { xs: 36, sm: 40 },
            }}
          >
            {getStatusIcon(movement.type)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="body1" 
              fontWeight={600}
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
            >
              {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)}
            </Typography>
            <Typography 
              variant="body2" 
              fontWeight={500}
              sx={{ 
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: { xs: '140px', sm: 'none' }
              }}
            >
              {movement.sender_name || 'Usuário'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ 
          textAlign: 'right',
          minWidth: { xs: 'auto', sm: 'auto' }
        }}>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            display="block"
            sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
          >
            {new Date(movement.date?.toDate?.() || movement.date).toLocaleDateString('pt-BR')}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
          >
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
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    let unsubscribeCautelas;
    
    const getMinhasCautelas = async () => {
      try {
        const token = localStorage.getItem("token");
        const user = await verifyToken(token);
        
        if (user && user.userId) {
          // Buscar cautelas pendentes de assinatura em tempo real
          const movimentacoesQuery = query(
            collection(db, "movimentacoes"), 
            where("user", "==", user.userId),
            where("type", "==", "cautela"),
            where("signed", "==", false)
          );
          
          // Usar onSnapshot para atualizações em tempo real
          unsubscribeCautelas = onSnapshot(movimentacoesQuery, (snapshot) => {
            const movimentacoesList = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            
            setMinhasCautelas(movimentacoesList);
          }, (error) => {
            console.error("Erro ao buscar cautelas em tempo real:", error);
          });
        }
      } catch (error) {
        console.error("Erro ao buscar cautelas:", error);
      }
    };

    const fetchData = async () => {
      try {
        // Buscar total de materiais
        const materialsSnap = await getDocs(collection(db, "materials"));
        
        // Buscar total de viaturas
        const viaturasSnap = await getDocs(collection(db, "viaturas"));
        
        // Buscar total de usuários
        const usersSnap = await getDocs(collection(db, "users"));
        
        // Buscar movimentações recentes
        const recentMovementsSnap = await getDocs(
          query(
            collection(db, "movimentacoes"),
            orderBy("date", "desc"),
            limit(5)
          )
        );
        
        // Buscar todas as movimentações para estatísticas
        const allMovementsSnap = await getDocs(
          query(
            collection(db, "movimentacoes"),
            orderBy("date", "desc"),
            limit(50)
          )
        );
        
        // Buscar materiais cautelados (type='cautela' e status='cautelado')
        const cautelasQuery = query(
          collection(db, "movimentacoes"),
          where("type", "==", "cautela"),
          where("status", "==", "cautelado")
        );
        const cautelasSnap = await getDocs(cautelasQuery);
        
        // Contar materiais cautelados
        const materiaisCautelados = cautelasSnap.size;
        
        // Buscar total de anéis retirados na coleção "rings"
        let retiradasAneis = 0;
        try {
          const ringsSnap = await getDocs(collection(db, "rings"));
          retiradasAneis = ringsSnap.size;
        } catch (ringsError) {
          console.log("Coleção rings não encontrada ou vazia:", ringsError);
        }
        
        // Criar mapa de usuários para enriquecimento de dados
        const userMap = {};
        usersSnap.docs.forEach(userDoc => {
          const userData = userDoc.data();
          userMap[userDoc.id] = userData.name || userData.username || userData.email || 'Usuário';
        });
        
        // Enriquecer movimentações recentes com nomes completos
        const enrichedRecentMovements = await Promise.all(
          recentMovementsSnap.docs.map(async (docSnap) => {
            const data = docSnap.data();
            let fullName = 'Usuário';
            
            // Primeiro tenta pegar do mapa em memória
            if (data.user && userMap[data.user]) {
              fullName = userMap[data.user];
            } else if (data.user) {
              // Se não encontrou no mapa, busca individualmente
              try {
                const userDocRef = doc(db, "users", data.user);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  fullName = userData.name || userData.username || userData.email || 'Usuário';
                }
              } catch (userError) {
                console.log("Erro ao buscar usuário:", userError);
              }
            }
            
            // Também pode ter o nome diretamente no documento
            if (data.sender_name) {
              fullName = data.sender_name;
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
          materiaisCautelados: materiaisCautelados,
          retiradasAneis: retiradasAneis,
        });
        setLoading(false);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        setLoading(false);
      }
    };

    getMinhasCautelas();
    fetchData();
    
    // Cleanup function para cancelar o listener
    return () => {
      if (unsubscribeCautelas) {
        unsubscribeCautelas();
      }
    };
  }, []);

  const handleSign = async (movimentacaoId) => {
    try {
      const docRef = doc(db, "movimentacoes", movimentacaoId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        await updateDoc(docRef, {
          signed: true,
          signed_date: serverTimestamp()
        });
        
        setSnackbarMessage('Cautela assinada com sucesso!');
        setSnackbarOpen(true);
        
        // O onSnapshot vai atualizar automaticamente o estado
      } else {
        setSnackbarMessage('Erro: Documento não encontrado');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Erro ao assinar documento:", error);
      setSnackbarMessage('Erro ao assinar a cautela. Tente novamente.');
      setSnackbarOpen(true);
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
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
          <Fade in timeout={600}>
            <Box>
              {/* Header */}
              <Box sx={{ mb: { xs: 3, sm: 4 }, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 1,
                      fontSize: { xs: '1.75rem', sm: '2.125rem' }
                    }}
                  >
                    Dashboard
                  </Typography>
                  <Typography 
                    variant="body1" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    Bem-vindo ao sistema de controle de materiais
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => {
                    setLoading(true);
                    setTimeout(() => {
                      window.location.reload();
                    }, 500);
                  }}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Atualizar
                </Button>
              </Box>

              {/* Stats Cards */}
              <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 3, sm: 4 } }}>
                {[
                  { 
                    icon: Assignment, 
                    title: 'Materiais Cautelados', 
                    value: stats.materiaisCautelados || 0, 
                    color: '#ef4444',
                    trend: null 
                  },
                  { 
                    icon: Inventory, 
                    title: 'Total de Materiais', 
                    value: stats.totalMaterials || 0, 
                    color: '#3b82f6',
                    trend: null 
                  },
                  { 
                    icon: Person, 
                    title: 'Total de Usuários', 
                    value: stats.totalUsers || 0, 
                    color: '#22c55e',
                    trend: null 
                  },
                  { 
                    icon: DonutSmall, 
                    title: 'Total de Anéis', 
                    value: stats.retiradasAneis || 0, 
                    color: '#f59e0b',
                    trend: null 
                  },
                ].map((item, index) => (
                  <Grow in timeout={300 + index * 100} key={index}>
                    <Grid item xs={6} sm={6} md={3}>
                      <StatCard {...item} loading={loading} />
                    </Grid>
                  </Grow>
                ))}
              </Grid>

              {/* Charts Section */}
              <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 3, sm: 4 } }}>
                <Grid item xs={12} md={8}>
                  <Paper 
                    sx={{ 
                      p: { xs: 2, sm: 3 }, 
                      height: { xs: 300, sm: 400 },
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography 
                      variant="h6" 
                      fontWeight={600} 
                      sx={{ 
                        mb: { xs: 2, sm: 3 },
                        fontSize: { xs: '1rem', sm: '1.25rem' }
                      }}
                    >
                      Movimentações por Tipo
                    </Typography>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.08)} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: { xs: 10, sm: 12 } }}
                          axisLine={{ stroke: alpha('#000', 0.1) }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tick={{ fontSize: { xs: 10, sm: 12 } }}
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
                      p: { xs: 2, sm: 3 }, 
                      height: { xs: 'auto', sm: 400 },
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.05)} 0%, ${alpha('#8b5cf6', 0.05)} 100%)`,
                    }}
                  >
                    <Typography 
                      variant="h6" 
                      fontWeight={600} 
                      sx={{ 
                        mb: { xs: 2, sm: 3 },
                        fontSize: { xs: '1rem', sm: '1.25rem' }
                      }}
                    >
                      Estatísticas Rápidas
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 }, height: { xs: 'auto', sm: '85%' }, justifyContent: 'center' }}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: { xs: 1.5, sm: 2 }, 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: alpha('#3b82f6', 0.2),
                          background: alpha('#3b82f6', 0.05),
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          Taxa de Cautela
                        </Typography>
                        <Typography variant="h4" color="#3b82f6" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                          {stats.totalMaterials > 0 
                            ? `${((stats.materiaisCautelados / stats.totalMaterials) * 100).toFixed(1)}%`
                            : '0%'
                          }
                        </Typography>
                      </Paper>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: { xs: 1.5, sm: 2 }, 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: alpha('#22c55e', 0.2),
                          background: alpha('#22c55e', 0.05),
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          Movimentações Hoje
                        </Typography>
                        <Typography variant="h4" color="#22c55e" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
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
                          p: { xs: 1.5, sm: 2 }, 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: alpha('#f59e0b', 0.2),
                          background: alpha('#f59e0b', 0.05),
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          Pendentes de Assinatura
                        </Typography>
                        <Typography variant="h4" color="#f59e0b" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                          {minhasCautelas.filter(c => !c.signed).length}
                        </Typography>
                      </Paper>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              {/* Recent Movements & User Cautelas */}
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid item xs={12} md={6}>
                  <Paper 
                    sx={{ 
                      p: { xs: 2, sm: 3 },
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      maxHeight: { xs: 400, sm: 500 },
                      overflow: 'auto'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                      <Typography 
                        variant="h6" 
                        fontWeight={600}
                        sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                      >
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
                        p: { xs: 2, sm: 3 },
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        maxHeight: { xs: 400, sm: 500 },
                        overflow: 'auto'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Typography 
                          variant="h6" 
                          fontWeight={600}
                          sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                        >
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
        
        {/* Snackbar para feedback */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setSnackbarOpen(false)} 
            severity={snackbarMessage.includes('sucesso') ? 'success' : 'error'}
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </MenuContext>
    </PrivateRoute>
  );
}