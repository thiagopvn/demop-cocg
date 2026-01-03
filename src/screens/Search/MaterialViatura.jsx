import { useEffect, useState } from "react";
import MaterialSearch from "../../components/MaterialSearch";
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
  DirectionsCar as CarIcon,
  Inventory as InventoryIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  ExitToApp as ExitIcon,
  Search as SearchIcon,
  Person as PersonIcon,
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
  backgroundColor: alpha(theme.palette.secondary.main, 0.1),
  color: theme.palette.secondary.main,
  fontWeight: 600,
  fontSize: '0.9rem',
  padding: theme.spacing(0.5, 1),
  '& .MuiChip-icon': {
    color: theme.palette.secondary.main,
  },
}));

export default function MaterialViatura() {
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [allViaturas, setAllViaturas] = useState([]); // Lista combinada
  const [filteredViaturas, setFilteredViaturas] = useState([]);
  const [filtro, setFiltro] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState({ alocados: 0, movimentacoes: 0, total: 0 });
  const theme = useTheme();

  const handleSelectMaterial = (material) => {
    setFilteredViaturas([]);
    setAllViaturas([]);
    setSelectedMaterial(material);
  };

  const handleClearSelection = () => {
    setSelectedMaterial(null);
    setFilteredViaturas([]);
    setAllViaturas([]);
    setFiltro(0);
    setResumo({ alocados: 0, movimentacoes: 0, total: 0 });
  };

  useEffect(() => {
    const fetchAllViaturas = async () => {
      if (!selectedMaterial) return;

      setLoading(true);
      try {
        const viaturasComMaterial = [];

        // 1. Buscar viaturas onde o material esta alocado (viatura_materiais)
        const viaturaMaterialsCollection = collection(db, "viatura_materiais");
        const qAlocados = query(
          viaturaMaterialsCollection,
          where("material_id", "==", selectedMaterial.id),
          where("status", "==", "alocado")
        );
        const alocadosSnapshot = await getDocs(qAlocados);

        let totalAlocados = 0;
        alocadosSnapshot.forEach((doc) => {
          const data = doc.data();
          totalAlocados += data.quantidade || 1;
          viaturasComMaterial.push({
            id: doc.id,
            origem: "alocado",
            viatura_id: data.viatura_id,
            viatura_description: `${data.viatura_prefixo || ''} - ${data.viatura_description || ''}`.trim().replace(/^- /, ''),
            viatura_prefixo: data.viatura_prefixo,
            categoria: data.categoria || selectedMaterial.categoria || "",
            quantity: data.quantidade || 1,
            date: data.data_alocacao,
            user_name: data.alocado_por_nome || "Sistema",
            type: "alocado",
            status: "alocado",
            material_description: selectedMaterial.description,
          });
        });

        // 2. Buscar movimentacoes do material para viaturas
        const movimentacoesCollection = collection(db, "movimentacoes");
        const qMovimentacoes = query(
          movimentacoesCollection,
          where("material", "==", selectedMaterial.id),
          orderBy("date", "desc")
        );
        const movSnapshot = await getDocs(qMovimentacoes);

        let totalMovimentacoes = 0;
        movSnapshot.forEach((doc) => {
          const data = doc.data();
          // Apenas incluir movimentacoes com viatura
          if (data.viatura_description && data.viatura_description.trim() !== "") {
            // Contar apenas saidas e cautelas nao devolvidas
            if (data.type === "saída" || (data.type === "cautela" && data.status !== "devolvido")) {
              totalMovimentacoes += data.quantity || 1;
            }
            viaturasComMaterial.push({
              id: doc.id,
              origem: "movimentacao",
              viatura_id: data.viatura,
              viatura_description: data.viatura_description,
              categoria: data.categoria || "",
              quantity: data.quantity || 1,
              date: data.date,
              user_name: data.user_name || data.sender_name || "-",
              telefone_responsavel: data.telefone_responsavel || "",
              type: data.type,
              status: data.status,
              material_description: data.material_description,
            });
          }
        });

        // Ordenar por data (mais recentes primeiro)
        viaturasComMaterial.sort((a, b) => {
          const dateA = a.date?.seconds || a.date?.toMillis?.() || 0;
          const dateB = b.date?.seconds || b.date?.toMillis?.() || 0;
          return dateB - dateA;
        });

        setAllViaturas(viaturasComMaterial);
        setResumo({
          alocados: totalAlocados,
          movimentacoes: totalMovimentacoes,
          total: totalAlocados + totalMovimentacoes
        });
      } catch (error) {
        console.error("Erro ao buscar viaturas com material:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllViaturas();
  }, [selectedMaterial]);

  useEffect(() => {
    if (allViaturas.length > 0) {
      let filtered = allViaturas;

      switch (filtro) {
        case 1:
          // Materiais alocados nas viaturas
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

      setFilteredViaturas(filtered);
    } else {
      setFilteredViaturas([]);
    }
  }, [allViaturas, filtro]);

  const filterOptions = [
    { value: 0, label: "Todos", shortLabel: "Todos", icon: <FilterIcon fontSize="small" />, color: "default" },
    { value: 1, label: "Alocados", shortLabel: "Alocados", icon: <AlocadoIcon fontSize="small" />, color: "primary" },
    { value: 2, label: "Cautelas Abertas", shortLabel: "Abertas", icon: <AssignmentIcon fontSize="small" />, color: "warning" },
    { value: 3, label: "Devolvidas", shortLabel: "Devolvidas", icon: <CheckCircleIcon fontSize="small" />, color: "success" },
    { value: 4, label: "Saidas", shortLabel: "Saidas", icon: <ExitIcon fontSize="small" />, color: "info" }
  ];

  const columns = [
    {
      field: 'viatura_description',
      headerName: 'Viatura',
      icon: <CarIcon fontSize="small" />,
      minWidth: 180,
      renderCell: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CarIcon fontSize="small" color="secondary" />
          <Typography variant="body2" fontWeight={500}>
            {row.viatura_description || '-'}
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
                  backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CarIcon sx={{ color: 'secondary.main' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                  Buscar Material em Viaturas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecione um material para ver em quais viaturas ele esta
                </Typography>
              </Box>

              {selectedMaterial && (
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

            {/* Selected Material Chip */}
            {selectedMaterial && (
              <Box sx={{ mb: 3 }}>
                <SelectedItemChip
                  icon={<InventoryIcon />}
                  label={selectedMaterial.description}
                  onDelete={handleClearSelection}
                />
              </Box>
            )}

            {/* Material Search Component */}
            <MaterialSearch
              selectedItem={selectedMaterial}
              onSelectMaterial={handleSelectMaterial}
            />

            {/* Filters - show only after selection */}
            {selectedMaterial && allViaturas.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <FilterChips
                  filters={filterOptions}
                  activeFilter={filtro}
                  onFilterChange={setFiltro}
                  title="Filtrar Resultados"
                />
              </Box>
            )}
          </CardContent>
        </SearchCard>
      </Fade>

      {/* Resumo - Mostrar apos selecionar material */}
      {selectedMaterial && !loading && allViaturas.length > 0 && (
        <Fade in timeout={500}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'secondary.main' }}>
              Resumo do Material nas Viaturas
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
                icon={<CarIcon />}
                label={`Total em viaturas: ${resumo.total}`}
                color="success"
                variant="filled"
                sx={{ fontWeight: 700, fontSize: '0.9rem' }}
              />
            </Box>
          </Paper>
        </Fade>
      )}

      {/* Results */}
      {selectedMaterial && (
        <Fade in timeout={600}>
          <Box>
            {/* Empty state */}
            {!loading && allViaturas.length === 0 && (
              <Alert severity="info" sx={{ borderRadius: 3 }}>
                <AlertTitle>Nenhum registro encontrado</AlertTitle>
                Este material nao esta alocado ou nao possui movimentacoes registradas com viaturas.
              </Alert>
            )}

            {/* Results table */}
            {(loading || filteredViaturas.length > 0) && (
              <SearchResultsTable
                data={filteredViaturas}
                columns={columns}
                loading={loading}
                headerColor="secondary"
                title="Viaturas com este Material"
                subtitle={`Material: ${selectedMaterial.description}`}
                emptyMessage="Nenhum registro com este filtro"
                emptyIcon={<SearchIcon sx={{ fontSize: 48 }} />}
                renderPopover={(row) => (
                  <MovimentacaoDetails
                    movimentacao={row}
                    title={row.origem === "alocado" ? "Detalhes da Alocacao" : "Detalhes da Movimentacao"}
                    color="secondary"
                  />
                )}
              />
            )}
          </Box>
        </Fade>
      )}

      {/* Export FAB */}
      {selectedMaterial && filteredViaturas.length > 0 && (
        <Tooltip title="Exportar para Excel" placement="left">
          <Fab
            color="success"
            size="medium"
            onClick={() => exportarMovimentacoes(
              filteredViaturas,
              `material_viaturas_${selectedMaterial.description}`
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
