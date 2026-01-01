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
  styled
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
  DirectionsCar as CarIcon
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
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [filteredMovimentacoes, setFilteredMovimentacoes] = useState([]);
  const [filtro, setFiltro] = useState(0);
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const handleSelectViatura = (viatura) => {
    setFilteredMovimentacoes([]);
    setMovimentacoes([]);
    setSelectedViatura(viatura);
  };

  const handleClearSelection = () => {
    setSelectedViatura(null);
    setViaturaCritery("");
    setFilteredMovimentacoes([]);
    setMovimentacoes([]);
    setFiltro(0);
    setCategoriaFilter("");
  };

  useEffect(() => {
    const fetchMovimentacoes = async () => {
      if (!selectedViatura) return;

      setLoading(true);
      try {
        const movimentacoesCollection = collection(db, "movimentacoes");
        const q = query(
          movimentacoesCollection,
          where("viatura", "==", selectedViatura.id),
          orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(q);
        const movs = [];
        querySnapshot.forEach((doc) => {
          movs.push({ id: doc.id, ...doc.data() });
        });
        setMovimentacoes(movs);
      } catch (error) {
        console.error("Erro ao buscar movimentacoes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovimentacoes();
  }, [selectedViatura]);

  useEffect(() => {
    if (movimentacoes.length > 0) {
      let filtered = movimentacoes;

      switch (filtro) {
        case 1:
          filtered = filtered.filter(
            (mov) => mov.type === "cautela" && mov.status !== "devolvido"
          );
          break;
        case 2:
          filtered = filtered.filter(
            (mov) => mov.type === "cautela" && mov.status === "devolvido"
          );
          break;
        case 3:
          filtered = filtered.filter((mov) => mov.type === "saída");
          break;
        default:
          break;
      }

      if (categoriaFilter) {
        filtered = filtered.filter((mov) => mov.categoria === categoriaFilter);
      }

      setFilteredMovimentacoes(filtered);
    } else {
      setFilteredMovimentacoes([]);
    }
  }, [movimentacoes, filtro, categoriaFilter]);

  const filterOptions = [
    { value: 0, label: "Todas", shortLabel: "Todas", icon: <FilterIcon fontSize="small" />, color: "default" },
    { value: 1, label: "Cautelas Abertas", shortLabel: "Abertas", icon: <AssignmentIcon fontSize="small" />, color: "warning" },
    { value: 2, label: "Devolvidas", shortLabel: "Devolvidas", icon: <CheckCircleIcon fontSize="small" />, color: "success" },
    { value: 3, label: "Saidas", shortLabel: "Saidas", icon: <ExitIcon fontSize="small" />, color: "info" }
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
      field: 'user_name',
      headerName: 'Militar',
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
      minWidth: 100,
      renderCell: (row) => {
        const color = row.type === 'cautela' ? 'primary' : 'secondary';
        return (
          <Chip
            label={row.type || '-'}
            size="small"
            color={color}
            variant="filled"
          />
        );
      },
    },
    {
      field: 'telefone_responsavel',
      headerName: 'Telefone',
      minWidth: 130,
      hideOnMobile: true,
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
            {selectedViatura && movimentacoes.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <FilterChips
                  filters={filterOptions}
                  activeFilter={filtro}
                  onFilterChange={setFiltro}
                  title="Filtrar Movimentacoes"
                  selectFilters={selectFilters}
                />
              </Box>
            )}
          </CardContent>
        </SearchCard>
      </Fade>

      {/* Results */}
      {selectedViatura && (
        <Fade in timeout={600}>
          <Box>
            {/* Empty state */}
            {!loading && movimentacoes.length === 0 && (
              <Alert severity="info" sx={{ borderRadius: 3 }}>
                <AlertTitle>Nenhuma movimentacao encontrada</AlertTitle>
                Esta viatura nao possui movimentacoes registradas.
              </Alert>
            )}

            {/* Results table */}
            {(loading || filteredMovimentacoes.length > 0) && (
              <SearchResultsTable
                data={filteredMovimentacoes}
                columns={columns}
                loading={loading}
                headerColor="info"
                title="Materiais da Viatura"
                subtitle={`Viatura: ${selectedViatura.description || selectedViatura.prefixo}`}
                emptyMessage="Nenhuma movimentacao com este filtro"
                emptyIcon={<SearchIcon sx={{ fontSize: 48 }} />}
                renderPopover={(row) => (
                  <MovimentacaoDetails
                    movimentacao={row}
                    title="Detalhes da Movimentacao"
                    color="info"
                  />
                )}
              />
            )}
          </Box>
        </Fade>
      )}

      {/* Export FAB */}
      {selectedViatura && filteredMovimentacoes.length > 0 && (
        <Tooltip title="Exportar para Excel" placement="left">
          <Fab
            color="success"
            size="medium"
            onClick={() => exportarMovimentacoes(
              filteredMovimentacoes,
              `movimentacoes_${selectedViatura.description || selectedViatura.prefixo}`
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
