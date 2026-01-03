import { useEffect, useState } from "react";
import ViaturaSearch from "../../components/ViaturaSearch";
import SearchResultsTable from "../../components/SearchResultsTable";
import FilterChips from "../../components/FilterChips";
import MovimentacaoDetails from "../../components/MovimentacaoDetails";
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Chip,
  Fade,
  Alert,
  AlertTitle,
  Fab,
  Tooltip,
  alpha,
  styled,
  Paper,
  Divider
} from "@mui/material";
import {
  Clear as ClearIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  ExitToApp as ExitIcon,
  Search as SearchIcon,
  DirectionsCar as CarIcon,
  LocalShipping as AlocadoIcon,
  SwapHoriz as MovimentacaoIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import db from "../../firebase/db";
import { query, collection, where, getDocs, orderBy } from "firebase/firestore";
import { exportarMovimentacoes } from "../../firebase/xlsx";
import excelIcon from "../../assets/excel.svg";

const SearchCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  marginBottom: theme.spacing(3),
  overflow: 'visible',
}));

const SelectedItemChip = styled(Chip)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.info.main, 0.1),
  color: theme.palette.info.main,
  fontWeight: 600,
  fontSize: '0.9rem',
  padding: theme.spacing(0.5, 1),
  '& .MuiChip-icon': {
    color: theme.palette.info.main,
  },
}));

export default function ViaturaMaterial({ categorias = [] }) {
  const [viaturaCritery, setViaturaCritery] = useState("");
  const [selectedViatura, setSelectedViatura] = useState(null);
  const [allMateriais, setAllMateriais] = useState([]); // Lista combinada
  const [filteredMateriais, setFilteredMateriais] = useState([]);
  const [filtro, setFiltro] = useState(0);
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState({ alocados: 0, movimentacoes: 0, total: 0 });
  const theme = useTheme();

  const handleSelectViatura = (viatura) => {
    setFilteredMateriais([]);
    setAllMateriais([]);
    setSelectedViatura(viatura);
  };

  const handleClearSelection = () => {
    setSelectedViatura(null);
    setViaturaCritery("");
    setFilteredMateriais([]);
    setAllMateriais([]);
    setFiltro(0);
    setCategoriaFilter("");
    setResumo({ alocados: 0, movimentacoes: 0, total: 0 });
  };

  useEffect(() => {
    const fetchAllMateriais = async () => {
      if (!selectedViatura) return;

      setLoading(true);
      try {
        const materiaisCombinados = [];

        // 1. Buscar materiais alocados diretamente na viatura (viatura_materiais)
        const viaturaMaterialsCollection = collection(db, "viatura_materiais");
        const qAlocados = query(
          viaturaMaterialsCollection,
          where("viatura_id", "==", selectedViatura.id),
          where("status", "==", "alocado")
        );
        const alocadosSnapshot = await getDocs(qAlocados);

        let totalAlocados = 0;
        alocadosSnapshot.forEach((doc) => {
          const data = doc.data();
          totalAlocados += data.quantidade || 1;
          materiaisCombinados.push({
            id: doc.id,
            origem: "alocado", // Indica que veio da alocacao direta
            material_id: data.material_id,
            material_description: data.material_description,
            categoria: data.categoria || "",
            quantity: data.quantidade || 1,
            date: data.data_alocacao,
            user_name: data.alocado_por_nome || "Sistema",
            type: "alocado",
            status: "alocado",
            viatura_description: selectedViatura.description || selectedViatura.prefixo,
          });
        });

        // 2. Buscar movimentacoes para a viatura
        const movimentacoesCollection = collection(db, "movimentacoes");
        const qMovimentacoes = query(
          movimentacoesCollection,
          where("viatura", "==", selectedViatura.id),
          orderBy("date", "desc")
        );
        const movSnapshot = await getDocs(qMovimentacoes);

        let totalMovimentacoes = 0;
        movSnapshot.forEach((doc) => {
          const data = doc.data();
          // Apenas contar saidas nao devolvidas para o total
          if (data.type === "saída" || (data.type === "cautela" && data.status !== "devolvido")) {
            totalMovimentacoes += data.quantity || 1;
          }
          materiaisCombinados.push({
            id: doc.id,
            origem: "movimentacao", // Indica que veio de movimentacao
            material_id: data.material,
            material_description: data.material_description,
            categoria: data.categoria || "",
            quantity: data.quantity || 1,
            date: data.date,
            user_name: data.user_name || data.sender_name || "-",
            telefone_responsavel: data.telefone_responsavel || "",
            type: data.type,
            status: data.status,
            viatura_description: data.viatura_description || selectedViatura.description,
          });
        });

        // Ordenar por data (mais recentes primeiro)
        materiaisCombinados.sort((a, b) => {
          const dateA = a.date?.seconds || a.date?.toMillis?.() || 0;
          const dateB = b.date?.seconds || b.date?.toMillis?.() || 0;
          return dateB - dateA;
        });

        setAllMateriais(materiaisCombinados);
        setResumo({
          alocados: totalAlocados,
          movimentacoes: totalMovimentacoes,
          total: totalAlocados + totalMovimentacoes
        });
      } catch (error) {
        console.error("Erro ao buscar materiais da viatura:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllMateriais();
  }, [selectedViatura]);

  useEffect(() => {
    if (allMateriais.length > 0) {
      let filtered = allMateriais;

      switch (filtro) {
        case 1:
          // Materiais alocados diretamente na viatura
          filtered = filtered.filter((item) => item.origem === "alocado");
          break;
        case 2:
          // Cautelas abertas (movimentacoes)
          filtered = filtered.filter(
            (item) => item.origem === "movimentacao" && item.type === "cautela" && item.status !== "devolvido"
          );
          break;
        case 3:
          // Devolvidas
          filtered = filtered.filter(
            (item) => item.origem === "movimentacao" && item.type === "cautela" && item.status === "devolvido"
          );
          break;
        case 4:
          // Saidas
          filtered = filtered.filter((item) => item.origem === "movimentacao" && item.type === "saída");
          break;
        default:
          break;
      }

      if (categoriaFilter) {
        filtered = filtered.filter((item) => item.categoria === categoriaFilter);
      }

      setFilteredMateriais(filtered);
    } else {
      setFilteredMateriais([]);
    }
  }, [allMateriais, filtro, categoriaFilter]);

  const filterOptions = [
    { value: 0, label: "Todos", shortLabel: "Todos", icon: <FilterIcon fontSize="small" />, color: "default" },
    { value: 1, label: "Alocados", shortLabel: "Alocados", icon: <AlocadoIcon fontSize="small" />, color: "primary" },
    { value: 2, label: "Cautelas Abertas", shortLabel: "Abertas", icon: <AssignmentIcon fontSize="small" />, color: "warning" },
    { value: 3, label: "Devolvidas", shortLabel: "Devolvidas", icon: <CheckCircleIcon fontSize="small" />, color: "success" },
    { value: 4, label: "Saidas", shortLabel: "Saidas", icon: <ExitIcon fontSize="small" />, color: "info" }
  ];

  const selectFilters = [
    {
      field: 'categoria',
      label: 'Categoria',
      value: categoriaFilter,
      onChange: setCategoriaFilter,
      options: categorias.map(cat => ({
        value: cat.description,
        label: cat.description
      }))
    }
  ];

  const columns = [
    {
      field: 'material_description',
      headerName: 'Material',
      icon: <InventoryIcon fontSize="small" />,
      minWidth: 200,
      renderCell: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon fontSize="small" color="info" />
          <Typography variant="body2" fontWeight={500}>
            {row.material_description || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'quantity',
      headerName: 'Qtd',
      minWidth: 80,
      renderCell: (row) => (
        <Chip
          label={row.quantity || 1}
          size="small"
          color="primary"
          sx={{ fontWeight: 700 }}
        />
      ),
    },
    {
      field: 'origem',
      headerName: 'Origem',
      minWidth: 130,
      renderCell: (row) => {
        const isAlocado = row.origem === "alocado";
        return (
          <Chip
            icon={isAlocado ? <AlocadoIcon /> : <MovimentacaoIcon />}
            label={isAlocado ? "Alocado" : "Movimentacao"}
            size="small"
            color={isAlocado ? "primary" : "secondary"}
            variant="outlined"
            sx={{ fontWeight: 500 }}
          />
        );
      },
    },
    {
      field: 'user_name',
      headerName: 'Responsavel',
      icon: <PersonIcon fontSize="small" />,
      minWidth: 150,
      hideOnMobile: true,
    },
    {
      field: 'date',
      headerName: 'Data',
      minWidth: 110,
      renderCell: (row) => (
        <Chip
          label={row.date?.seconds ? new Date(row.date.seconds * 1000).toLocaleDateString('pt-BR') : '-'}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'type',
      headerName: 'Tipo',
      minWidth: 110,
      renderCell: (row) => {
        const getTypeConfig = (type) => {
          switch (type) {
            case 'alocado': return { label: 'Alocado', color: 'primary' };
            case 'cautela': return { label: 'Cautela', color: 'warning' };
            case 'saída': return { label: 'Saida', color: 'secondary' };
            default: return { label: type || '-', color: 'default' };
          }
        };
        const config = getTypeConfig(row.type);
        return (
          <Chip
            label={config.label}
            size="small"
            color={config.color}
            variant="filled"
          />
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 120,
      renderCell: (row) => {
        const getColor = (status) => {
          switch (status?.toLowerCase()) {
            case 'devolvido': return 'success';
            case 'cautelado': return 'warning';
            case 'alocado': return 'primary';
            case 'saída': return 'info';
            default: return 'default';
          }
        };
        return (
          <Chip
            label={row.status || '-'}
            size="small"
            color={getColor(row.status)}
            variant="filled"
          />
        );
      },
    },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <Fade in timeout={400}>
        <SearchCard elevation={2}>
          <CardContent sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.info.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CarIcon sx={{ color: 'info.main' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'info.main' }}>
                  Materiais da Viatura
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecione uma viatura para ver os materiais que ela possui
                </Typography>
              </Box>

              {selectedViatura && (
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClearSelection}
                  color="error"
                  size="small"
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Limpar
                </Button>
              )}
            </Box>

            {/* Selected Viatura Chip */}
            {selectedViatura && (
              <Box sx={{ mb: 3 }}>
                <SelectedItemChip
                  icon={<CarIcon />}
                  label={selectedViatura.description || selectedViatura.prefixo}
                  onDelete={handleClearSelection}
                />
              </Box>
            )}

            {/* Viatura Search Component */}
            <ViaturaSearch
              viaturaCritery={viaturaCritery}
              onSetViaturaCritery={setViaturaCritery}
              selectedItem={selectedViatura}
              onSelectViatura={handleSelectViatura}
            />

            {/* Filters - show only after selection */}
            {selectedViatura && allMateriais.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <FilterChips
                  filters={filterOptions}
                  activeFilter={filtro}
                  onFilterChange={setFiltro}
                  title="Filtrar Materiais"
                  selectFilters={selectFilters}
                />
              </Box>
            )}
          </CardContent>
        </SearchCard>
      </Fade>

      {/* Resumo - Mostrar apos selecionar viatura */}
      {selectedViatura && !loading && allMateriais.length > 0 && (
        <Fade in timeout={500}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'info.main' }}>
              Resumo de Materiais na Viatura
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<AlocadoIcon />}
                label={`Alocados: ${resumo.alocados}`}
                color="primary"
                variant="filled"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                icon={<MovimentacaoIcon />}
                label={`Movimentacoes: ${resumo.movimentacoes}`}
                color="secondary"
                variant="filled"
                sx={{ fontWeight: 600 }}
              />
              <Divider orientation="vertical" flexItem />
              <Chip
                icon={<InventoryIcon />}
                label={`Total em uso: ${resumo.total}`}
                color="success"
                variant="filled"
                sx={{ fontWeight: 700, fontSize: '0.9rem' }}
              />
            </Box>
          </Paper>
        </Fade>
      )}

      {/* Results */}
      {selectedViatura && (
        <Fade in timeout={600}>
          <Box>
            {/* Empty state */}
            {!loading && allMateriais.length === 0 && (
              <Alert severity="info" sx={{ borderRadius: 3 }}>
                <AlertTitle>Nenhum material encontrado</AlertTitle>
                Esta viatura nao possui materiais alocados ou movimentacoes registradas.
              </Alert>
            )}

            {/* Results table */}
            {(loading || filteredMateriais.length > 0) && (
              <SearchResultsTable
                data={filteredMateriais}
                columns={columns}
                loading={loading}
                headerColor="info"
                title="Materiais da Viatura"
                subtitle={`Viatura: ${selectedViatura.description || selectedViatura.prefixo}`}
                emptyMessage="Nenhum material com este filtro"
                emptyIcon={<SearchIcon sx={{ fontSize: 48 }} />}
                renderPopover={(row) => (
                  <MovimentacaoDetails
                    movimentacao={row}
                    title={row.origem === "alocado" ? "Detalhes da Alocacao" : "Detalhes da Movimentacao"}
                    color="info"
                  />
                )}
              />
            )}
          </Box>
        </Fade>
      )}

      {/* Export FAB */}
      {selectedViatura && filteredMateriais.length > 0 && (
        <Tooltip title="Exportar para Excel" placement="left">
          <Fab
            color="success"
            size="medium"
            onClick={() => exportarMovimentacoes(
              filteredMateriais,
              `materiais_viatura_${selectedViatura.description || selectedViatura.prefixo}`
            )}
            sx={{
              position: 'fixed',
              bottom: 80,
              right: 24,
              background: 'linear-gradient(45deg, #4caf50 30%, #81c784 90%)',
              boxShadow: 3,
              '&:hover': {
                transform: 'scale(1.1)',
                boxShadow: 6
              },
              transition: 'all 0.3s ease'
            }}
          >
            <img src={excelIcon} alt="Exportar para Excel" width={24} />
          </Fab>
        </Tooltip>
      )}
    </Box>
  );
}
