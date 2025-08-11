import React, { useState, useEffect } from 'react';
import MenuContext from '../../contexts/MenuContext';
import { 
  FormControlLabel, 
  Paper, 
  RadioGroup, 
  Radio, 
  Typography, 
  Container,
  Box,
  Card,
  CardContent,
  Fade,
  Chip
} from '@mui/material';
import { 
  Search as SearchIcon,
  Person as PersonIcon,
  DirectionsCar as CarIcon,
  Inventory as InventoryIcon,
  Block as BlockIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import MaterialUsuario from './MaterialUsuario';
import MaterialViatura from './MaterialViatura';
import UsuarioMaterial from './UsuarioMaterial';
import ViaturaMaterial from './ViaturaMaterial';
import Inativos from './Inativos';
import Cautelados from './Cautelados';
import { collection, getDocs } from 'firebase/firestore';
import db from '../../firebase/db';

export default function MainSearch() {
  const [search, setSearch] = useState('material-usuario');
  const [categorias, setCategorias] = useState([]);

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

  const searchOptions = [
    {
      value: "material-usuario",
      label: "Material por Usuário",
      icon: <PersonIcon />,
      description: "Encontre usuários que possuem determinado material",
      color: "primary"
    },
    {
      value: "material-viatura",
      label: "Material por Viatura",
      icon: <CarIcon />,
      description: "Encontre viaturas que possuem determinado material",
      color: "secondary"
    },
    {
      value: "usuario-material",
      label: "Usuário por Material",
      icon: <InventoryIcon />,
      description: "Encontre materiais que um usuário possui",
      color: "success"
    },
    {
      value: "viatura-material",
      label: "Viatura por Material",
      icon: <CarIcon />,
      description: "Encontre materiais que uma viatura possui",
      color: "info"
    },
    {
      value: "inoperante",
      label: "Inoperantes",
      icon: <BlockIcon />,
      description: "Liste materiais marcados como inoperantes",
      color: "warning"
    },
    {
      value: "cautelados",
      label: "Cautelados",
      icon: <AssignmentIcon />,
      description: "Liste todos os materiais atualmente cautelados",
      color: "error"
    }
  ];

  return (
    <MenuContext>
      <div className='root-protected'>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Fade in timeout={800}>
            <Box>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <SearchIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h4" component="h1" gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Sistema de Pesquisa
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Escolha o tipo de pesquisa que deseja realizar
                </Typography>
              </Box>

              <Card 
                elevation={3} 
                sx={{ 
                  mb: 4,
                  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                  borderRadius: 3
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" align="center" sx={{ mb: 3, fontWeight: 600 }}>
                    Selecione o Tipo de Pesquisa:
                  </Typography>
                  <RadioGroup
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ gap: 2 }}
                  >
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                      gap: 2 
                    }}>
                      {searchOptions.map((option) => (
                        <Card
                          key={option.value}
                          variant="outlined"
                          sx={{
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: search === option.value ? 2 : 1,
                            borderColor: search === option.value 
                              ? `${option.color}.main` 
                              : 'divider',
                            backgroundColor: search === option.value 
                              ? `${option.color}.50` 
                              : 'background.paper',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: 4,
                              borderColor: `${option.color}.main`
                            },
                            borderRadius: 2
                          }}
                          onClick={() => setSearch(option.value)}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <FormControlLabel
                              value={option.value}
                              control={
                                <Radio 
                                  color={option.color}
                                  sx={{ 
                                    '& .MuiSvgIcon-root': { fontSize: 20 } 
                                  }}
                                />
                              }
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    backgroundColor: `${option.color}.100`,
                                    color: `${option.color}.main`
                                  }}>
                                    {option.icon}
                                  </Box>
                                  <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                      {option.label}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {option.description}
                                    </Typography>
                                  </Box>
                                </Box>
                              }
                              sx={{ 
                                margin: 0, 
                                width: '100%',
                                '& .MuiFormControlLabel-label': {
                                  width: '100%'
                                }
                              }}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </RadioGroup>
                  
                  {search && (
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                      <Chip 
                        icon={searchOptions.find(opt => opt.value === search)?.icon}
                        label={`Pesquisa Ativa: ${searchOptions.find(opt => opt.value === search)?.label}`}
                        color={searchOptions.find(opt => opt.value === search)?.color}
                        variant="filled"
                        size="medium"
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>

              <Fade in={!!search} timeout={600}>
                <Box>
                  {search === 'material-usuario' && <MaterialUsuario />}
                  {search === 'material-viatura' && <MaterialViatura />}
                  {search === 'usuario-material' && <UsuarioMaterial categorias={categorias} />}
                  {search === 'viatura-material' && <ViaturaMaterial categorias={categorias} />}
                  {search === 'inoperante' && <Inativos categorias={categorias} />}
                  {search === 'cautelados' && <Cautelados />}
                </Box>
              </Fade>
            </Box>
          </Fade>
        </Container>
      </div>
    </MenuContext>
  );
}