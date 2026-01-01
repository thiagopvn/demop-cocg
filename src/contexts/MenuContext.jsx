import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import brasao from '../assets/brasao.png';
import "./context.css";
import { 
  Logout, 
  Menu, 
  Close, 
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
  CalendarMonth
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
  Fade
} from '@mui/material';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import db from '../firebase/db';
import DeleteIcon from '@mui/icons-material/Delete';
import { verifyToken } from '../firebase/token';
import { getPendingMaintenancesCount, checkAndNotifyMaintenances } from '../services/maintenanceNotificationService';

function MenuContext({ children }) {
  const [active, setActive] = React.useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);
  const [maintenanceBadge, setMaintenanceBadge] = useState({ overdue: 0, today: 0, total: 0 });

  const menuItems = [
    { icon: Dashboard, label: 'Dashboard', path: '/home', id: 0 },
    { icon: SwapHorizOutlined, label: 'Movimentação', path: '/movimentacoes', id: 5 },
    { icon: AssignmentReturnOutlined, label: 'Devoluções', path: '/devolucoes', id: 7 },
    { icon: BuildOutlined, label: 'Material', path: '/material', id: 2 },
    { icon: CalendarMonth, label: 'Manutenção', path: '/manutencao', id: 10 },
    { icon: LocalShippingOutlined, label: 'Viaturas', path: '/viaturas', id: 3 },
    { icon: CategoryOutlined, label: 'Categorias', path: '/categoria', id: 4 },
    { icon: PersonOutline, label: 'Usuários', path: '/usuario', id: 1 },
    { icon: Inventory, label: 'Anéis', path: '/aneis', id: 8 },
    { icon: Search, label: 'Pesquisar', path: '/search', id: 9 },
  ];

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

  // Buscar contagem de manutenções pendentes e verificar notificações
  useEffect(() => {
    const fetchMaintenanceBadge = async () => {
      try {
        const count = await getPendingMaintenancesCount();
        setMaintenanceBadge(count);
        // Verificar e enviar notificações
        await checkAndNotifyMaintenances();
      } catch (error) {
        console.error("Erro ao buscar badge de manutenções:", error);
      }
    };

    fetchMaintenanceBadge();

    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchMaintenanceBadge, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const path = location.pathname;
    const item = menuItems.find(item => item.path === path);
    if (item) {
      setActive(item.id);
    }
  }, [location.pathname]);

  const handleLogout = () => {
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

  const handleNavigation = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleOpenCleanupDialog = () => {
    setCleanupDialogOpen(true);
  };

  const handleCloseCleanupDialog = () => {
    setCleanupDialogOpen(false);
  };

  const handleConfirmCleanup = async () => {
    if (userRole === "admin") {
      setIsCleaning(true);
      try {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

        const movimentacoesCollection = collection(db, "movimentacoes");
        const querySnapshot = await getDocs(movimentacoesCollection);

        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data();
          if (data.date && data.status && (data.status === "devolvido" || data.status === "descartado")) {
            const date = data.date.toDate();
            if (date <= twoYearsAgo) {
              await deleteDoc(doc(db, "movimentacoes", docSnapshot.id));
              console.log(`Movimentação com ID ${docSnapshot.id} excluída.`);
            }
          }
        }

        console.log("Limpeza concluída.");
      } catch (error) {
        console.error("Erro ao executar limpeza:", error);
      } finally {
        setIsCleaning(false);
        handleCloseCleanupDialog();
      }
    } else {
      alert("Você não tem permissão para limpar movimentações antigas. Apenas administradores podem realizar esta ação.");
      handleCloseCleanupDialog();
    }
  };

  const drawerWidth = drawerOpen ? 280 : 72;

  const drawer = (
    <Box
      sx={{
        height: '100vh',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, rgba(30,58,95,0.98) 0%, rgba(30,58,95,0.95) 100%)',
        backdropFilter: 'blur(10px)',
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
        {!mobileOpen && (
          <IconButton
            onClick={() => setDrawerOpen(!drawerOpen)}
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
      {drawerOpen && (
        <Fade in={drawerOpen} timeout={400}>
          <Box
            sx={{
              p: 2,
              mx: 2,
              my: 1,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.75rem',
                mb: 0.5
              }}
            >
              Usuário logado
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#fff',
                fontWeight: 600,
                mb: 1
              }}
            >
              {userName}
            </Typography>
            {userRole && (
              <Chip
                label={userRole === 'admin' ? 'Administrador' : 'Usuário'}
                size="small"
                sx={{
                  backgroundColor: userRole === 'admin' 
                    ? 'rgba(255, 107, 53, 0.2)' 
                    : 'rgba(96, 165, 250, 0.2)',
                  color: userRole === 'admin' 
                    ? '#ff6b35' 
                    : '#60a5fa',
                  border: `1px solid ${userRole === 'admin' ? '#ff6b35' : '#60a5fa'}`,
                  fontSize: '0.7rem',
                  height: 22
                }}
              />
            )}
          </Box>
        </Fade>
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
                    {item.path === '/manutencao' && maintenanceBadge.total > 0 ? (
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
      <Box sx={{ p: 2 }}>
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
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Mobile App Bar */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          backgroundColor: 'rgba(30,58,95,0.98)',
          backdropFilter: 'blur(10px)',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          zIndex: 1300,
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={brasao} sx={{ width: 36, height: 36 }} />
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
            DEMOP
          </Typography>
        </Box>
        <IconButton
          onClick={() => setMobileOpen(!mobileOpen)}
          sx={{ color: '#fff' }}
        >
          {mobileOpen ? <Close /> : <Menu />}
        </IconButton>
      </Box>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            border: 'none',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowX: 'hidden',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            border: 'none',
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
          ml: { md: `${drawerWidth}px` },
          mt: { xs: '64px', md: 0 },
          transition: 'margin 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Progress Bar */}
        {isCleaning && (
          <LinearProgress 
            sx={{ 
              position: 'fixed',
              top: { xs: 64, md: 0 },
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
        <Box sx={{ flex: 1, p: { xs: 2, sm: 3, md: 4 } }}>
          <Fade in timeout={500}>
            <Box>{children}</Box>
          </Fade>
        </Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            mt: 'auto',
            py: 3,
            px: 4,
            borderTop: '1px solid rgba(0,0,0,0.08)',
            backgroundColor: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <img src={brasao} alt="Brasão Bombeiros" width={24} style={{ opacity: 0.7 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            © 2025 Todos os direitos reservados.
          </Typography>
          <Typography
            variant="caption"
            sx={{
              position: 'fixed',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '10px',
              color: '#000',
              userSelect: 'none',
              fontWeight: 400,
              zIndex: 1000,
              textAlign: 'center'
            }}
          >
            Desenvolvido pelo ASP OF BM Thiago Santos
          </Typography>
        </Box>
      </Box>

      {/* Admin Cleanup FAB */}
      {userRole === "admin" && (
        <Zoom in timeout={300}>
          <Tooltip title="Limpar Movimentações Antigas" arrow>
            <Fab
              size="medium"
              onClick={handleOpenCleanupDialog}
              sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
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
        </Zoom>
      )}

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