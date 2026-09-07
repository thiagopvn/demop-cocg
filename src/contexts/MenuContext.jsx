import React, { useEffect, useState, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { firebaseAuthSignOut } from '../firebase/authSync';
import brasao from '../assets/brasao.png';
import "./context.css";
import {
  Logout,
  Inventory,
  Search,
  ChevronLeft,
  Dashboard,
  PersonOutline,
  BuildOutlined,
  LocalShippingOutlined,
  CategoryOutlined,
  SwapHorizOutlined,
  AssignmentReturnOutlined,
  CalendarMonth,
  WhatsApp,
  SupportAgent,
  LockOutlined,
  AssessmentOutlined,
  AccountCircle,
  AccountBalance,
  DarkModeOutlined,
  LightModeOutlined,
  WarehouseOutlined,
  NotificationsNoneOutlined
} from '@mui/icons-material';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Fab,
  Tooltip,
  LinearProgress,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Avatar,
  Divider,
  IconButton,
  Badge,
  Chip,
  Zoom,
  Fade,
  alpha,
  Paper,
  Snackbar,
  Alert,
  ButtonBase
} from '@mui/material';
import { collection, getDocs, writeBatch, query, where, Timestamp, onSnapshot as firestoreOnSnapshot } from 'firebase/firestore';
import db from '../firebase/db';
import DeleteIcon from '@mui/icons-material/Delete';
import { verifyToken } from '../firebase/token';
import { checkAndNotifyMaintenances } from '../services/maintenanceNotificationService';
import { useThemeContext } from './ThemeContext';
import useCurrentUser from '../hooks/useCurrentUser';
import UserAvatar, { ROLE_COLORS, ROLE_LABELS } from '../components/UserAvatar';
import MobileBottomNav, { ALTURA_BARRA } from '../components/navigation/MobileBottomNav';
import ProfileSheet from '../components/navigation/ProfileSheet';
import InstallPrompt from '../components/InstallPrompt';
import CompletarPerfilDialog from '../components/CompletarPerfilDialog';
import ChatFlutuante from '../components/chat/ChatFlutuante';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import OnlinePredictionOutlined from '@mui/icons-material/OnlinePredictionOutlined';
import { iniciarPresenca, encerrarPresenca } from '../services/presencaService';
import { escutarConversas } from '../services/chatService';
import { aoReceberPushEmPrimeiroPlano, desativarPushDesteAparelho } from '../services/pushService';
const ChangePasswordDialog = lazy(() => import('../dialogs/ChangePasswordDialog'));

function MenuContext({ children }) {
  const [active, setActive] = React.useState(0);
  const { mode, toggleMode } = useThemeContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  // Estado do menu lateral (desktop) persiste entre telas
  const [drawerOpen, setDrawerOpen] = useState(() => {
    try { return localStorage.getItem('drawerOpen') !== 'false'; } catch { return true; }
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const currentUser = useCurrentUser();
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);
  const [maintenanceBadge, setMaintenanceBadge] = useState({ overdue: 0, today: 0, total: 0 });
  const [mensagensBadge, setMensagensBadge] = useState(0);
  const caminhoAtualRef = useRef(location.pathname);
  caminhoAtualRef.current = location.pathname;

  // Presença (online / sessões): batimento enquanto o app está aberto
  useEffect(() => {
    if (!currentUser.userId || currentUser.loading) return undefined;
    return iniciarPresenca(currentUser);
  }, [currentUser.userId, currentUser.loading, currentUser.fullName, currentUser.role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mensagens não lidas (badge no menu, na barra inferior e no título da aba)
  // + chat flutuante: abre sozinho quando chega mensagem nova, em qualquer tela (menos na de Mensagens)
  const [chatFlutuante, setChatFlutuante] = useState(null);
  const naoLidasRef = useRef(null);
  useEffect(() => {
    if (!currentUser.userId) return undefined;
    const meuId = currentUser.userId;
    naoLidasRef.current = null;
    return escutarConversas(meuId, (lista) => {
      const atual = new Map(lista.map((c) => [c.id, c.naoLidas?.[meuId] || 0]));
      setMensagensBadge([...atual.values()].reduce((t, n) => t + n, 0));
      if (naoLidasRef.current) {
        const nova = lista.find((c) => (atual.get(c.id) || 0) > (naoLidasRef.current.get(c.id) || 0) && c.ultima?.de !== meuId);
        if (nova && caminhoAtualRef.current !== '/mensagens') setChatFlutuante(nova.id);
      }
      naoLidasRef.current = atual;
    }, () => {});
  }, [currentUser.userId]);
  useEffect(() => { if (location.pathname === '/mensagens') setChatFlutuante(null); }, [location.pathname]);
  useEffect(() => {
    document.title = mensagensBadge > 0 ? `(${mensagensBadge}) DEMOP GOCG` : 'DEMOP GOCG';
  }, [mensagensBadge]);

  // Push recebido com o app aberto: abre o chat da conversa (fora da tela de mensagens)
  useEffect(() => {
    let parar = null;
    aoReceberPushEmPrimeiroPlano((payload) => {
      if (caminhoAtualRef.current === '/mensagens') return;
      const id = payload?.data?.conversaId;
      if (id) setChatFlutuante(id);
    }).then((f) => { parar = f; });
    return () => { if (typeof parar === 'function') parar(); };
  }, []);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const allMenuItems = [
    { icon: Dashboard, label: 'Dashboard', path: '/home', id: 0, roles: ['user', 'chefe', 'admin', 'admingeral', 'BensPatrimoniais'] },
    { icon: ForumOutlined, label: 'Mensagens', path: '/mensagens', id: 15, roles: ['user', 'chefe', 'admin', 'admingeral', 'BensPatrimoniais'] },
    { icon: AssessmentOutlined, label: 'Atividades', path: '/atividades', id: 11, roles: ['admingeral'] },
    { icon: OnlinePredictionOutlined, label: 'Acessos', path: '/acessos', id: 16, roles: ['admingeral'] },
    { icon: SwapHorizOutlined, label: 'Movimentação', path: '/movimentacoes', id: 5, roles: ['admin', 'admingeral', 'BensPatrimoniais'] },
    { icon: AssignmentReturnOutlined, label: 'Devoluções', path: '/devolucoes', id: 7, roles: ['admin', 'admingeral', 'BensPatrimoniais'] },
    { icon: BuildOutlined, label: 'Material', path: '/material', id: 2, roles: ['admin', 'admingeral', 'BensPatrimoniais'] },
    { icon: WarehouseOutlined, label: 'Locais', path: '/locais', id: 14, roles: ['admin', 'admingeral', 'BensPatrimoniais'] },
    { icon: CalendarMonth, label: 'Manutenção', path: '/manutencao', id: 10, roles: ['admin', 'admingeral', 'BensPatrimoniais'] },
    { icon: LocalShippingOutlined, label: 'Viaturas', path: '/viaturas', id: 3, roles: ['admin', 'admingeral', 'BensPatrimoniais'] },
    { icon: CategoryOutlined, label: 'Categorias', path: '/categoria', id: 4, roles: ['admin', 'admingeral', 'BensPatrimoniais'] },
    { icon: PersonOutline, label: 'Usuários', path: '/usuario', id: 1, roles: ['admin', 'admingeral', 'BensPatrimoniais'] },
    { icon: Inventory, label: 'Anéis', path: '/aneis', id: 8, roles: ['admin', 'admingeral', 'BensPatrimoniais'] },
    { icon: Search, label: 'Pesquisar', path: '/search', id: 9, roles: ['admin', 'admingeral', 'BensPatrimoniais'] },
    { icon: AccountBalance, label: 'Bens Patrimoniais', path: '/bens-patrimoniais', id: 13, roles: ['BensPatrimoniais', 'admingeral'] },
    { icon: AccountCircle, label: 'Meu Perfil', path: '/perfil', id: 12, roles: ['user', 'chefe', 'admin', 'admingeral', 'BensPatrimoniais'] },
  ];

  // Filtrar itens de menu baseado no papel do usuário.
  // Enquanto userRole ainda não foi resolvido (null), mostra vazio em vez
  // de mostrar todos os itens — evita flash do menu admin para roles novos.
  const menuItems = useMemo(() =>
    userRole ? allMenuItems.filter(item => item.roles.includes(userRole)) : [],
    [userRole]
  );

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const decodedToken = await verifyToken(token);
          setUserRole(decodedToken.role);
          setUserName(decodedToken.username || 'Usuário');
        } catch (error) {
          console.error("Erro ao verificar token:", error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    };

    fetchUserData();
  }, []);

  // Listener em tempo real para badge de manutenções pendentes (apenas admin)
  useEffect(() => {
    // Badge de manutenção só é relevante para admin/admingeral
    if (!userRole || userRole === 'user' || userRole === 'chefe') return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Listener para manutenções atrasadas (pendentes com dueDate < hoje)
    const overdueQ = query(
      collection(db, 'manutencoes'),
      where('status', '==', 'pendente'),
      where('dueDate', '<', Timestamp.fromDate(today))
    );

    // Listener para manutenções de hoje
    const todayQ = query(
      collection(db, 'manutencoes'),
      where('status', 'in', ['pendente', 'em_andamento']),
      where('dueDate', '>=', Timestamp.fromDate(today)),
      where('dueDate', '<', Timestamp.fromDate(tomorrow))
    );

    let overdueCount = 0;
    let todayCount = 0;

    const unsubOverdue = firestoreOnSnapshot(overdueQ, (snapshot) => {
      overdueCount = snapshot.size;
      setMaintenanceBadge({ overdue: overdueCount, today: todayCount, total: overdueCount + todayCount });
    }, () => {});

    const unsubToday = firestoreOnSnapshot(todayQ, (snapshot) => {
      todayCount = snapshot.size;
      setMaintenanceBadge({ overdue: overdueCount, today: todayCount, total: overdueCount + todayCount });
    }, () => {});

    // Verificar notificações do browser uma vez ao montar
    checkAndNotifyMaintenances().catch(() => {});

    return () => {
      unsubOverdue();
      unsubToday();
    };
  }, [userRole]);

  useEffect(() => {
    const path = location.pathname;
    const item = allMenuItems.find(item => item.path === path);
    if (item) {
      setActive(item.id);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await encerrarPresenca(currentUser.userId);
    await desativarPushDesteAparelho(currentUser.userId);
    await firebaseAuthSignOut();
    localStorage.removeItem('token');
    navigate('/');
  }

  const handleOpenDialog = () => {
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
  };

  const handleConfirmLogout = () => {
    handleLogout();
    handleCloseDialog();
  };

  const handleNavigation = useCallback((path) => {
    navigate(path);
    setProfileOpen(false);
  }, [navigate]);

  const toggleDrawer = useCallback(() => {
    setDrawerOpen((prev) => {
      try { localStorage.setItem('drawerOpen', String(!prev)); } catch { /* sem storage */ }
      return !prev;
    });
  }, []);

  const podeVerManutencao = userRole && userRole !== 'user' && userRole !== 'chefe';
  const nomeExibicao = currentUser.fullName || userName;

  const handleOpenCleanupDialog = () => {
    setCleanupDialogOpen(true);
  };

  const handleCloseCleanupDialog = () => {
    setCleanupDialogOpen(false);
  };

  const handleConfirmCleanup = async () => {
    if (userRole === "admingeral") {
      setIsCleaning(true);
      try {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const cutoff = Timestamp.fromDate(twoYearsAgo);

        // Busca apenas os documentos elegíveis em vez de varrer a coleção inteira
        const snapshots = await Promise.all(
          ["devolvido", "descartado"].map((status) =>
            getDocs(query(
              collection(db, "movimentacoes"),
              where("status", "==", status),
              where("date", "<=", cutoff)
            ))
          )
        );
        const docsToDelete = snapshots.flatMap((snap) => snap.docs);

        // Exclui em lotes (limite do Firestore: 500 operações por batch)
        for (let i = 0; i < docsToDelete.length; i += 450) {
          const batch = writeBatch(db);
          docsToDelete.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }

        setSnackbar({
          open: true,
          message: docsToDelete.length > 0
            ? `Limpeza concluída: ${docsToDelete.length} movimentações antigas excluídas.`
            : "Nenhuma movimentação antiga para excluir.",
          severity: "success",
        });
      } catch (error) {
        console.error("Erro ao executar limpeza:", error);
        setSnackbar({ open: true, message: "Erro ao executar a limpeza.", severity: "error" });
      } finally {
        setIsCleaning(false);
        handleCloseCleanupDialog();
      }
    } else {
      setSnackbar({
        open: true,
        message: "Apenas o administrador geral pode limpar movimentações antigas.",
        severity: "warning",
      });
      handleCloseCleanupDialog();
    }
  };

  const drawerWidth = drawerOpen ? 280 : 72;

  const drawer = (
    <Box
      sx={{
        height: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #1e3a5f 0%, #1e3a5f 100%)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: drawerOpen ? 3 : 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: drawerOpen ? 'space-between' : 'center',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          minHeight: 80,
        }}
      >
        {drawerOpen ? (
          <Fade in={drawerOpen} timeout={300}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={brasao}
                sx={{ 
                  width: 48, 
                  height: 48,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  border: '2px solid rgba(255,255,255,0.1)'
                }}
              />
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    lineHeight: 1.2
                  }}
                >
                  DEMOP
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '0.75rem'
                  }}
                >
                  Sistema de Controle
                </Typography>
              </Box>
            </Box>
          </Fade>
        ) : (
          <Avatar
            src={brasao}
            sx={{ 
              width: 40, 
              height: 40,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          />
        )}
        {(
          <IconButton
            onClick={toggleDrawer}
            sx={{ 
              color: 'rgba(255,255,255,0.7)',
              display: { xs: 'none', md: 'flex' },
              '&:hover': {
                color: '#fff',
                backgroundColor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            <ChevronLeft 
              sx={{ 
                transform: drawerOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform 0.3s'
              }} 
            />
          </IconButton>
        )}
      </Box>

      {/* User Info */}
      {drawerOpen ? (
        <Fade in={drawerOpen} timeout={400}>
          <ButtonBase
            onClick={() => handleNavigation('/perfil')}
            sx={{
              mx: 2,
              my: 1,
              p: 1.5,
              borderRadius: 2.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              textAlign: 'left',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              transition: 'all 0.2s ease',
              '&:hover': { background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.18)' },
            }}
          >
            <Box sx={{ p: '2px', borderRadius: '50%', background: `linear-gradient(135deg, #ff6b35 0%, ${ROLE_COLORS[userRole] || '#60a5fa'} 100%)`, flexShrink: 0 }}>
              <UserAvatar src={currentUser.fotoUrl} name={nomeExibicao} role={userRole} size={44} sx={{ border: '2px solid #1e3a5f' }} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }} noWrap>
                {nomeExibicao}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', display: 'block', lineHeight: 1.2 }} noWrap>
                @{userName}
              </Typography>
              {userRole && (
                <Chip
                  label={ROLE_LABELS[userRole] || 'Usuário'}
                  size="small"
                  sx={{
                    mt: 0.5,
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    backgroundColor: alpha(ROLE_COLORS[userRole] || '#60a5fa', 0.2),
                    color: ROLE_COLORS[userRole] || '#60a5fa',
                    border: `1px solid ${alpha(ROLE_COLORS[userRole] || '#60a5fa', 0.6)}`,
                  }}
                />
              )}
            </Box>
          </ButtonBase>
        </Fade>
      ) : (
        <Tooltip title={nomeExibicao || ''} placement="right" arrow>
          <ButtonBase onClick={() => handleNavigation('/perfil')} sx={{ mx: 'auto', my: 1.5, borderRadius: '50%' }}>
            <UserAvatar src={currentUser.fotoUrl} name={nomeExibicao} role={userRole} size={40} sx={{ border: '2px solid rgba(255,255,255,0.2)' }} />
          </ButtonBase>
        </Tooltip>
      )}

      {/* Navigation */}
      <List sx={{
        flex: 1,
        px: 1,
        py: 2,
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: 0, // Importante para flex + overflow funcionar corretamente
      }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip 
                title={!drawerOpen ? item.label : ''} 
                placement="right"
                arrow
              >
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: 2,
                    mx: 0.5,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    justifyContent: drawerOpen ? 'initial' : 'center',
                    px: drawerOpen ? 2 : 0,
                    backgroundColor: isActive 
                      ? 'rgba(255, 107, 53, 0.15)' 
                      : 'transparent',
                    '&:hover': {
                      backgroundColor: isActive 
                        ? 'rgba(255, 107, 53, 0.2)' 
                        : 'rgba(255,255,255,0.08)',
                      transform: 'translateX(4px)',
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 4,
                      height: isActive ? '70%' : 0,
                      backgroundColor: '#ff6b35',
                      borderRadius: '0 4px 4px 0',
                      transition: 'height 0.3s ease',
                    }
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: drawerOpen ? 2 : 'auto',
                      justifyContent: 'center',
                      color: isActive ? '#ff6b35' : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {item.path === '/mensagens' && mensagensBadge > 0 ? (
                      <Badge badgeContent={mensagensBadge} color="secondary" max={99} sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', height: 16, minWidth: 16, padding: '0 4px', fontWeight: 700 } }}>
                        <Icon sx={{ fontSize: 22 }} />
                      </Badge>
                    ) : item.path === '/manutencao' && maintenanceBadge.total > 0 ? (
                      <Badge
                        badgeContent={maintenanceBadge.total}
                        color={maintenanceBadge.overdue > 0 ? 'error' : 'warning'}
                        max={99}
                        sx={{
                          '& .MuiBadge-badge': {
                            fontSize: '0.65rem',
                            height: 16,
                            minWidth: 16,
                            padding: '0 4px'
                          }
                        }}
                      >
                        <Icon sx={{ fontSize: 22 }} />
                      </Badge>
                    ) : (
                      <Badge
                        variant="dot"
                        invisible={!isActive}
                        sx={{
                          '& .MuiBadge-dot': {
                            backgroundColor: '#22c55e',
                            boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)'
                          }
                        }}
                      >
                        <Icon sx={{ fontSize: 22 }} />
                      </Badge>
                    )}
                  </ListItemIcon>
                  {drawerOpen && (
                    <ListItemText 
                      primary={item.label} 
                      sx={{
                        '& .MuiListItemText-primary': {
                          color: isActive ? '#fff' : 'rgba(255,255,255,0.85)',
                          fontWeight: isActive ? 600 : 400,
                          fontSize: '0.95rem',
                        }
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      {/* Bottom Actions */}
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Tooltip title={!drawerOpen ? (mode === 'dark' ? 'Modo Claro' : 'Modo Escuro') : ''} placement="right">
          <Button
            fullWidth
            variant="contained"
            startIcon={drawerOpen && (mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />)}
            onClick={toggleMode}
            sx={{
              justifyContent: drawerOpen ? 'flex-start' : 'center',
              background: 'rgba(96, 165, 250, 0.1)',
              color: '#60a5fa',
              border: '1px solid rgba(96, 165, 250, 0.3)',
              boxShadow: 'none',
              borderRadius: 2,
              py: 1.2,
              '&:hover': {
                background: 'rgba(96, 165, 250, 0.2)',
                borderColor: '#60a5fa',
                boxShadow: '0 4px 12px rgba(96, 165, 250, 0.2)',
              }
            }}
          >
            {drawerOpen
              ? (mode === 'dark' ? 'Modo Claro' : 'Modo Escuro')
              : (mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />)}
          </Button>
        </Tooltip>
        <Tooltip title={!drawerOpen ? 'Alterar Senha' : ''} placement="right">
          <Button
            fullWidth
            variant="contained"
            startIcon={drawerOpen && <LockOutlined />}
            onClick={() => setChangePasswordOpen(true)}
            sx={{
              justifyContent: drawerOpen ? 'flex-start' : 'center',
              background: 'rgba(255, 152, 0, 0.1)',
              color: '#ff9800',
              border: '1px solid rgba(255, 152, 0, 0.3)',
              boxShadow: 'none',
              borderRadius: 2,
              py: 1.2,
              '&:hover': {
                background: 'rgba(255, 152, 0, 0.2)',
                borderColor: '#ff9800',
                boxShadow: '0 4px 12px rgba(255, 152, 0, 0.2)',
              }
            }}
          >
            {drawerOpen ? 'Alterar Senha' : <LockOutlined />}
          </Button>
        </Tooltip>
        <Tooltip title={!drawerOpen ? 'Sair' : ''} placement="right">
          <Button
            fullWidth
            variant="contained"
            startIcon={drawerOpen && <Logout />}
            onClick={handleOpenDialog}
            sx={{
              justifyContent: drawerOpen ? 'flex-start' : 'center',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: 'none',
              borderRadius: 2,
              py: 1.2,
              '&:hover': {
                background: 'rgba(239, 68, 68, 0.2)',
                borderColor: '#ef4444',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
              }
            }}
          >
            {drawerOpen ? 'Sair' : <Logout />}
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', backgroundColor: 'background.default' }}>
      {/* Mobile App Bar (estilo app) */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 'calc(56px + env(safe-area-inset-top, 0px))',
          pt: 'env(safe-area-inset-top, 0px)',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          zIndex: 1250,
          bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.85 : 0.9),
          backdropFilter: 'saturate(180%) blur(18px)',
          WebkitBackdropFilter: 'saturate(180%) blur(18px)',
          borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 1)}`,
        }}
      >
        <ButtonBase
          onClick={() => setProfileOpen(true)}
          aria-label="Abrir perfil"
          sx={{ borderRadius: '50%', p: '2px', background: `linear-gradient(135deg, #ff6b35 0%, ${ROLE_COLORS[userRole] || '#60a5fa'} 100%)`, transition: 'transform 0.15s ease', '&:active': { transform: 'scale(0.94)' } }}
        >
          <UserAvatar src={currentUser.fotoUrl} name={nomeExibicao} role={userRole} size={34} sx={{ border: (theme) => `2px solid ${theme.palette.background.paper}` }} />
        </ButtonBase>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, minWidth: 0 }}>
          <Avatar src={brasao} sx={{ width: 30, height: 30 }} />
          <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.04em', fontSize: '1.05rem' }}>
            DEMOP
          </Typography>
        </Box>
        <IconButton onClick={() => handleNavigation('/mensagens')} aria-label="Mensagens" sx={{ color: location.pathname === '/mensagens' ? 'primary.main' : 'text.secondary' }}>
          <Badge badgeContent={mensagensBadge} color="secondary" max={99} invisible={!mensagensBadge} sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16, padding: '0 4px', fontWeight: 700 } }}>
            <ForumOutlined />
          </Badge>
        </IconButton>
        {podeVerManutencao ? (
          <IconButton
            onClick={() => handleNavigation('/manutencao')}
            aria-label="Manutenções"
            sx={{ color: 'text.secondary' }}
          >
            <Badge
              badgeContent={maintenanceBadge.total}
              color={maintenanceBadge.overdue > 0 ? 'error' : 'warning'}
              max={99}
              invisible={!maintenanceBadge.total}
              sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16, padding: '0 4px', fontWeight: 700 } }}
            >
              <NotificationsNoneOutlined />
            </Badge>
          </IconButton>
        ) : (
          <IconButton
            onClick={toggleMode}
            aria-label={mode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            sx={{ color: 'text.secondary' }}
          >
            {mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
          </IconButton>
        )}
      </Box>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          alignSelf: 'stretch',
          // A coluna inteira e azul ate o fim da pagina; o menu fica preso ao topo enquanto rola
          backgroundColor: '#1e3a5f',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            border: 'none',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowX: 'hidden',
            position: 'sticky',
            top: 0,
            height: '100dvh',
            maxHeight: '100dvh',
            backgroundColor: '#1e3a5f',
            backgroundImage: 'none',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          mt: { xs: 'calc(56px + env(safe-area-inset-top, 0px))', md: 0 },
          transition: 'margin 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Progress Bar */}
        {isCleaning && (
          <LinearProgress 
            sx={{ 
              position: 'fixed',
              top: { xs: 'calc(56px + env(safe-area-inset-top, 0px))', md: 0 },
              left: { md: drawerWidth },
              right: 0,
              zIndex: 1400,
              height: 3,
              backgroundColor: 'rgba(255,107,53,0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#ff6b35'
              }
            }} 
          />
        )}

        {/* Page Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 1, sm: 2, md: 4 }, pb: { xs: 2, sm: 3, md: 4 } }}>
          <Box className="page-enter" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</Box>
        </Box>

        {/* Footer Moderno */}
        <Box
          component="footer"
          sx={{
            mt: 'auto',
            py: { xs: 2, md: 3 },
            px: { xs: 2, sm: 4 },
            pb: { xs: `calc(${ALTURA_BARRA + 20}px + env(safe-area-inset-bottom, 0px))`, md: 3 },
            borderTop: '1px solid',
            borderColor: 'divider',
            background: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
              : 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {/* Desenvolvedor */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <img
                src={brasao}
                alt="Brasão Bombeiros"
                width={28}
                style={{
                  opacity: 0.9,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: (theme) => theme.palette.mode === 'dark' ? '#9dc1e8' : '#1e3a5f',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  textAlign: 'center',
                }}
              >
                Desenvolvido pelo 2º Ten BM Thiago Santos
              </Typography>
            </Box>

            {/* Linha divisória decorativa */}
            <Box
              sx={{
                width: 60,
                height: 3,
                borderRadius: 2,
                background: 'linear-gradient(90deg, #1e3a5f 0%, #ff6b35 100%)',
              }}
            />

            {/* Card de Suporte */}
            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 2 },
                py: 1.5,
                px: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                background: alpha('#25D366', 0.08),
                border: `1px solid ${alpha('#25D366', 0.2)}`,
                transition: 'all 0.3s ease',
                flexWrap: 'wrap',
                justifyContent: 'center',
                '&:hover': {
                  background: alpha('#25D366', 0.12),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px ${alpha('#25D366', 0.2)}`,
                },
              }}
            >
              <SupportAgent
                sx={{
                  color: '#25D366',
                  fontSize: 20,
                  display: { xs: 'none', sm: 'block' },
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.85rem' },
                  textAlign: 'center',
                }}
              >
                Dúvidas, problemas ou sugestões?
              </Typography>
              <Chip
                icon={<WhatsApp sx={{ fontSize: 16 }} />}
                label="(21) 96758-6628"
                component="a"
                href="https://wa.me/5521967586628?text=Olá! Preciso de ajuda com o sistema de Controle de Cautela."
                target="_blank"
                rel="noopener noreferrer"
                clickable
                size="small"
                sx={{
                  backgroundColor: '#25D366',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  '&:hover': {
                    backgroundColor: '#128C7E',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s ease',
                  '& .MuiChip-icon': {
                    color: 'white',
                  },
                }}
              />
            </Paper>

            {/* Copyright */}
            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                fontSize: '0.7rem',
                letterSpacing: '0.05em',
              }}
            >
              © 2025 CBMERJ - Todos os direitos reservados
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Admin Cleanup FAB */}
      {userRole === "admingeral" && (
        <Zoom in timeout={300}>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Tooltip title="Limpar Movimentações Antigas" arrow>
            <Fab
              size="medium"
              onClick={handleOpenCleanupDialog}
              sx={{
                position: 'fixed',
                bottom: { xs: `calc(${ALTURA_BARRA + 16}px + env(safe-area-inset-bottom, 0px))`, md: 24 },
                right: { xs: 16, md: 24 },
                backgroundColor: '#ef4444',
                color: '#fff',
                boxShadow: '0 8px 24px rgba(239,68,68,0.3)',
                '&:hover': {
                  backgroundColor: '#dc2626',
                  transform: 'scale(1.1)',
                  boxShadow: '0 12px 32px rgba(239,68,68,0.4)',
                }
              }}
            >
              <DeleteIcon />
            </Fab>
          </Tooltip>
          </Box>
        </Zoom>
      )}

      {/* Navegacao mobile: barra inferior + folha de perfil */}
      <MobileBottomNav
        items={menuItems}
        activePath={location.pathname}
        onNavigate={handleNavigation}
        maintenanceBadge={maintenanceBadge}
        mensagensBadge={mensagensBadge}
        mode={mode}
        toggleMode={toggleMode}
      />
      <ProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={{ ...currentUser, role: userRole || currentUser.role, username: userName || currentUser.username }}
        mode={mode}
        toggleMode={toggleMode}
        onChangePassword={() => setChangePasswordOpen(true)}
        onLogout={handleOpenDialog}
        onNavigate={handleNavigation}
        onCleanup={userRole === 'admingeral' ? handleOpenCleanupDialog : null}
      />
      <InstallPrompt />
      <CompletarPerfilDialog user={currentUser} />
      {chatFlutuante && <ChatFlutuante conversaId={chatFlutuante} eu={currentUser} onClose={() => setChatFlutuante(null)} />}

      {/* Logout Dialog */}
      <Dialog
        open={open}
        onClose={handleCloseDialog}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            minWidth: 320,
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Logout sx={{ color: '#ef4444' }} />
            <Typography variant="h6" component="span">
              Confirmar Logout
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja sair do sistema?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
          <Button 
            onClick={handleCloseDialog} 
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmLogout} 
            variant="contained"
            color="error"
            sx={{ borderRadius: 2 }}
            autoFocus
          >
            Sair
          </Button>
        </DialogActions>
      </Dialog>

      {changePasswordOpen && (
        <Suspense fallback={null}>
          <ChangePasswordDialog
            open={changePasswordOpen}
            onClose={(success) => {
              setChangePasswordOpen(false);
              if (success) {
                setSnackbar({ open: true, message: 'Senha alterada com sucesso!', severity: 'success' });
              }
            }}
          />
        </Suspense>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: `calc(${ALTURA_BARRA + 12}px + env(safe-area-inset-bottom, 0px))`, md: 24 } }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Cleanup Dialog */}
      <Dialog
        open={cleanupDialogOpen}
        onClose={handleCloseCleanupDialog}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            minWidth: 400,
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteIcon sx={{ color: '#ef4444' }} />
            <Typography variant="h6" component="span">
              Limpar Movimentações Antigas
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir todas as movimentações com mais de 2 anos
            e status "devolvido" ou "descartado"? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
          <Button
            onClick={handleCloseCleanupDialog}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmCleanup}
            variant="contained"
            color="error"
            sx={{ borderRadius: 2 }}
          >
            Confirmar Limpeza
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default MenuContext;