import React, { useState, useEffect } from 'react';
import MenuContext from '../../contexts/MenuContext';
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
  styled
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
import MaterialUsuario from './MaterialUsuario';
import MaterialViatura from './MaterialViatura';
import UsuarioMaterial from './UsuarioMaterial';
import ViaturaMaterial from './ViaturaMaterial';
import Inativos from './Inativos';
import Cautelados from './Cautelados';
import { collection, getDocs } from 'firebase/firestore';
import db from '../../firebase/db';

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

const TabPanel = ({ children, value, index }) => (
  <Fade in={value === index} timeout={400}>
    <Box
      role="tabpanel"
      hidden={value !== index}
      sx={{
        display: value === index ? 'block' : 'none',
        animation: value === index ? 'slideIn 0.3s ease-out' : 'none',
        '@keyframes slideIn': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {value === index && children}
    </Box>
  </Fade>
);

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

  const tabs = [
    {
      label: "Quem tem o Material?",
      shortLabel: "Material",
      icon: <InventoryIcon />,
      description: "Busque um material e veja quem o possui",
      color: "primary",
      component: <MaterialUsuario />
    },
    {
      label: "Materiais na Viatura",
      shortLabel: "Viatura",
      icon: <CarIcon />,
      description: "Busque um material e veja em quais viaturas",
      color: "secondary",
      component: <MaterialViatura />
    },
    {
      label: "Materiais do Militar",
      shortLabel: "Militar",
      icon: <PersonIcon />,
      description: "Selecione um militar e veja seus materiais",
      color: "success",
      component: <UsuarioMaterial categorias={categorias} />
    },
    {
      label: "Materiais por Viatura",
      shortLabel: "VTR",
      icon: <SwapIcon />,
      description: "Selecione uma viatura e veja seus materiais",
      color: "info",
      component: <ViaturaMaterial categorias={categorias} />
    },
    {
      label: "Em Reparo",
      shortLabel: "Reparo",
      icon: <BuildIcon />,
      description: "Materiais atualmente em reparo",
      color: "warning",
      component: <Inativos categorias={categorias} />
    },
    {
      label: "Todas Cautelas",
      shortLabel: "Cautelas",
      icon: <AssignmentIcon />,
      description: "Todas as movimentacoes de cautela",
      color: "error",
      component: <Cautelados />
    }
  ];

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
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

          {/* Tab Content */}
          <Fade in timeout={1000}>
            <Box>
              {tabs.map((tab, index) => (
                <TabPanel key={index} value={activeTab} index={index}>
                  {tab.component}
                </TabPanel>
              ))}
            </Box>
          </Fade>
        </Box>
      </Box>
    </MenuContext>
  );
}
