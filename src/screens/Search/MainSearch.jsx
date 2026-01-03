import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import MenuContext from '../../contexts/MenuContext';
import PrivateRoute from '../../contexts/PrivateRoute';
import {
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  Typography,
  Fade,
  Chip,
  useMediaQuery,
  alpha,
  styled,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  DirectionsCar as CarIcon,
  Inventory as InventoryIcon,
  Build as BuildIcon,
  Assignment as AssignmentIcon,
  SwapHoriz as SwapIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { collection, getDocs } from 'firebase/firestore';
import db from '../../firebase/db';

// Lazy load dos componentes de tab para melhor performance
const MaterialUsuario = lazy(() => import('./MaterialUsuario'));
const MaterialViatura = lazy(() => import('./MaterialViatura'));
const UsuarioMaterial = lazy(() => import('./UsuarioMaterial'));
const ViaturaMaterial = lazy(() => import('./ViaturaMaterial'));
const Inativos = lazy(() => import('./Inativos'));
const Cautelados = lazy(() => import('./Cautelados'));

// Loading fallback component
const TabLoading = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
    <CircularProgress />
  </Box>
);

const StyledTabs = styled(Tabs)(({ theme }) => ({
  minHeight: 56,
  '& .MuiTabs-indicator': {
    height: 3,
    borderRadius: '3px 3px 0 0',
  },
  '& .MuiTabs-flexContainer': {
    gap: theme.spacing(0.5),
  },
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  minHeight: 56,
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.9rem',
  borderRadius: '12px 12px 0 0',
  transition: 'all 0.2s ease-in-out',
  color: theme.palette.text.secondary,
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
    color: theme.palette.primary.main,
  },
  '&.Mui-selected': {
    color: theme.palette.primary.main,
    fontWeight: 600,
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
}));

const HeaderCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  borderRadius: 16,
  marginBottom: theme.spacing(3),
  overflow: 'visible',
}));

const TabPanel = ({ children, value, index }) => {
  // Só renderiza o conteúdo quando a tab está ativa
  if (value !== index) return null;

  return (
    <Box role="tabpanel">
      <Suspense fallback={<TabLoading />}>
        {children}
      </Suspense>
    </Box>
  );
};

export default function MainSearch() {
  const [activeTab, setActiveTab] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const fetchCategorias = async () => {
      const categoriasCollection = collection(db, "categorias");
      const querySnapshot = await getDocs(categoriasCollection);
      const listaCategorias = [];
      querySnapshot.forEach((doc) => {
        listaCategorias.push(doc.data());
      });
      setCategorias(listaCategorias);
    };

    fetchCategorias();
  }, []);

  // Memoizar tabs para evitar recriação a cada render
  const tabs = useMemo(() => [
    {
      label: "Quem esta com o Material?",
      shortLabel: "Material",
      icon: <InventoryIcon />,
      description: "Selecione um material para ver quem esta com ele acautelado",
      color: "primary",
    },
    {
      label: "Materiais na Viatura",
      shortLabel: "Viatura",
      icon: <CarIcon />,
      description: "Busque um material e veja em quais viaturas",
      color: "secondary",
    },
    {
      label: "Materiais por Militar",
      shortLabel: "Militar",
      icon: <PersonIcon />,
      description: "Selecione um militar para ver os materiais que ele acautelou",
      color: "success",
    },
    {
      label: "Materiais por Viatura",
      shortLabel: "VTR",
      icon: <SwapIcon />,
      description: "Selecione uma viatura e veja seus materiais",
      color: "info",
    },
    {
      label: "Em Reparo",
      shortLabel: "Reparo",
      icon: <BuildIcon />,
      description: "Materiais atualmente em reparo",
      color: "warning",
    },
    {
      label: "Todas Cautelas",
      shortLabel: "Cautelas",
      icon: <AssignmentIcon />,
      description: "Todas as movimentacoes de cautela",
      color: "error",
    }
  ], []);

  // Renderiza apenas o componente da tab ativa
  const renderTabContent = useMemo(() => {
    switch (activeTab) {
      case 0: return <MaterialUsuario />;
      case 1: return <MaterialViatura />;
      case 2: return <UsuarioMaterial categorias={categorias} />;
      case 3: return <ViaturaMaterial categorias={categorias} />;
      case 4: return <Inativos categorias={categorias} />;
      case 5: return <Cautelados />;
      default: return null;
    }
  }, [activeTab, categorias]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <PrivateRoute>
    <MenuContext>
      <Box className='root-protected' sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Box sx={{ width: '100%', px: { xs: 1, sm: 2, md: 3 }, py: 3 }}>
          {/* Header */}
          <Fade in timeout={600}>
            <HeaderCard elevation={0}>
              <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SearchIcon sx={{ fontSize: 28, color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{
                        color: 'white',
                        fontWeight: 700,
                        fontSize: { xs: '1.25rem', sm: '1.5rem' }
                      }}
                    >
                      Central de Pesquisa
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'rgba(255,255,255,0.8)',
                        display: { xs: 'none', sm: 'block' }
                      }}
                    >
                      Localize materiais, militares, viaturas e movimentacoes
                    </Typography>
                  </Box>
                </Box>

                {/* Current tab info chip */}
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    icon={tabs[activeTab].icon}
                    label={tabs[activeTab].description}
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 500,
                      '& .MuiChip-icon': { color: 'white' },
                      backdropFilter: 'blur(10px)',
                    }}
                  />
                </Box>
              </CardContent>
            </HeaderCard>
          </Fade>

          {/* Navigation Tabs */}
          <Fade in timeout={800}>
            <Card
              elevation={2}
              sx={{
                borderRadius: 3,
                mb: 3,
                overflow: 'visible',
              }}
            >
              <Box
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  backgroundColor: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(10px)',
                }}
              >
                <StyledTabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant={isMobile ? "scrollable" : "fullWidth"}
                  scrollButtons={isMobile ? "auto" : false}
                  allowScrollButtonsMobile
                  sx={{ px: { xs: 1, sm: 2 } }}
                >
                  {tabs.map((tab, index) => (
                    <StyledTab
                      key={index}
                      icon={tab.icon}
                      iconPosition="start"
                      label={isSmall ? tab.shortLabel : tab.label}
                      sx={{
                        '&.Mui-selected': {
                          color: `${tab.color}.main`,
                        },
                      }}
                    />
                  ))}
                </StyledTabs>
              </Box>
            </Card>
          </Fade>

          {/* Tab Content - Renderiza apenas a tab ativa */}
          <Box>
            <TabPanel value={activeTab} index={activeTab}>
              {renderTabContent}
            </TabPanel>
          </Box>
        </Box>
      </Box>
    </MenuContext>
    </PrivateRoute>
  );
}
