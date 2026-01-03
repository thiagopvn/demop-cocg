import { useEffect, useState, useMemo } from "react";
import SearchResultsTable from "../../components/SearchResultsTable";
import FilterChips from "../../components/FilterChips";
import MovimentacaoDetails from "../../components/MovimentacaoDetails";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Fade,
  Alert,
  AlertTitle,
  Fab,
  Tooltip,
  TextField,
  InputAdornment,
  Grid,
  alpha,
  styled
} from "@mui/material";
import {
  Assignment as AssignmentIcon,
  Inventory as InventoryIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  DirectionsCar as CarIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  SwapHoriz as SwapIcon,
  ArrowDownward as InIcon,
  ArrowUpward as OutIcon,
  FilterList as FilterIcon,
  Draw as SignatureIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import db from "../../firebase/db";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { exportarMovimentacoes } from "../../firebase/xlsx";
import excelIcon from "../../assets/excel.svg";

const HeaderCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  marginBottom: theme.spacing(3),
  overflow: 'visible',
  background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
}));

const FilterCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  marginBottom: theme.spacing(3),
}));

const StatsChip = styled(Chip)(({ theme }) => ({
  backgroundColor: 'rgba(255,255,255,0.2)',
  color: 'white',
  fontWeight: 600,
  fontSize: '0.9rem',
  height: 'auto',
  '& .MuiChip-label': {
    padding: theme.spacing(0.5, 1),
  },
}));

export default function Cautelados() {
  const [filtro, setFiltro] = useState(0);
  const [cachedMovimentacoes, setCachedMovimentacoes] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const theme = useTheme();

  useEffect(() => {
    if (!(filtro in cachedMovimentacoes)) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const movimentacoesCollection = collection(db, "movimentacoes");
          let constraints = [];

          switch (filtro) {
            case 0:
              constraints = [];
              break;
            case 1:
              constraints = [
                where("status", "==", "cautelado"),
                where("signed", "==", true)
              ];
              break;
            case 2:
              constraints = [where("status", "==", "devolvido")];
              break;
            case 3:
              constraints = [
                where("status", "==", "cautelado"),
                where("signed", "==", false)
              ];
              break;
            case 4:
              constraints = [where("status", "==", "cautelado")];
              break;
            case 5:
              constraints = [where("type", "==", "entrada")];
              break;
            case 6:
              constraints = [where("type", "==", "saída")];
              break;
            default:
              constraints = [];
          }

          let querySnapshot;
          if (constraints.length === 0) {
            const qCautelado = query(
              movimentacoesCollection,
              where("type", "==", "cautela"),
              orderBy("date", "desc")
            );
            querySnapshot = await getDocs(qCautelado);
          } else {
            const q = query(
              movimentacoesCollection,
              ...constraints,
              orderBy("date", "desc")
            );
            querySnapshot = await getDocs(q);
          }

          const movs = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (filtro === 0) {
              if (data.type === "cautela") {
                movs.push({ id: doc.id, ...data });
              }
            } else {
              movs.push({ id: doc.id, ...data });
            }
          });

          setCachedMovimentacoes((prev) => ({ ...prev, [filtro]: movs }));
        } catch (error) {
          console.error("Erro ao buscar movimentacoes:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
      setLoading(false);
    }
  }, [filtro, cachedMovimentacoes]);

  const displayedMovimentacoes = cachedMovimentacoes[filtro] || [];

  const filteredMovimentacoes = useMemo(() => {
    if (!searchTerm) return displayedMovimentacoes;

    const search = searchTerm.toLowerCase();
    return displayedMovimentacoes.filter((mov) =>
      (mov.material_description?.toLowerCase() || '').includes(search) ||
      (mov.user_name?.toLowerCase() || '').includes(search) ||
      (mov.viatura_description?.toLowerCase() || '').includes(search)
    );
  }, [displayedMovimentacoes, searchTerm]);

  const stats = useMemo(() => {
    const total = displayedMovimentacoes.length;
    const assinados = displayedMovimentacoes.filter(m => m.signed === true && m.status === "cautelado").length;
    const naoAssinados = displayedMovimentacoes.filter(m => m.signed === false && m.status === "cautelado").length;
    const devolvidos = displayedMovimentacoes.filter(m => m.status === "devolvido").length;

    return { total, assinados, naoAssinados, devolvidos };
  }, [displayedMovimentacoes]);

  const filterOptions = [
    { value: 0, label: "Todas", shortLabel: "Todas", icon: <FilterIcon fontSize="small" />, color: "default" },
    { value: 4, label: "Cauteladas", shortLabel: "Cautela", icon: <AssignmentIcon fontSize="small" />, color: "warning" },
    { value: 1, label: "Assinadas", shortLabel: "Assin.", icon: <SignatureIcon fontSize="small" />, color: "primary" },
    { value: 3, label: "Nao Assinadas", shortLabel: "N/Assin.", icon: <CancelIcon fontSize="small" />, color: "error" },
    { value: 2, label: "Devolvidas", shortLabel: "Devolv.", icon: <CheckCircleIcon fontSize="small" />, color: "success" },
    { value: 5, label: "Entradas", shortLabel: "Entrada", icon: <InIcon fontSize="small" />, color: "info" },
    { value: 6, label: "Saidas", shortLabel: "Saida", icon: <OutIcon fontSize="small" />, color: "secondary" }
  ];

  const getFilterLabel = (value) => {
    return filterOptions.find(f => f.value === value)?.label || "Todas";
  };

  const columns = [
    {
      field: 'material_description',
      headerName: 'Material',
      icon: <InventoryIcon fontSize="small" />,
      minWidth: 200,
      renderCell: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon fontSize="small" color="error" />
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
      renderCell: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {row.user_name || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'telefone_responsavel',
      headerName: 'Telefone',
      icon: <PhoneIcon fontSize="small" />,
      minWidth: 140,
      renderCell: (row) => {
        const telefone = row.telefone_responsavel;
        if (!telefone) return '-';
        return (
          <Chip
            icon={<PhoneIcon sx={{ fontSize: 14 }} />}
            label={telefone}
            size="small"
            color="primary"
            variant="outlined"
            component="a"
            href={`tel:${telefone}`}
            clickable
            sx={{
              fontWeight: 500,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              }
            }}
          />
        );
      },
    },
    {
      field: 'viatura_description',
      headerName: 'Viatura',
      icon: <CarIcon fontSize="small" />,
      minWidth: 130,
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
      hideOnMobile: true,
      renderCell: (row) => {
        let color = 'default';
        let icon = null;

        switch (row.type) {
          case 'cautela':
            color = 'primary';
            icon = <AssignmentIcon sx={{ fontSize: 14 }} />;
            break;
          case 'entrada':
            color = 'info';
            icon = <InIcon sx={{ fontSize: 14 }} />;
            break;
          case 'saída':
            color = 'secondary';
            icon = <OutIcon sx={{ fontSize: 14 }} />;
            break;
          default:
            break;
        }

        return (
          <Chip
            icon={icon}
            label={row.type || '-'}
            size="small"
            color={color}
            variant="filled"
          />
        );
      },
    },
    {
      field: 'signed',
      headerName: 'Assinado',
      minWidth: 100,
      renderCell: (row) => {
        if (row.signed === undefined || row.type !== 'cautela') return '-';
        return (
          <Chip
            icon={row.signed ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <CancelIcon sx={{ fontSize: 14 }} />}
            label={row.signed ? "Sim" : "Nao"}
            size="small"
            color={row.signed ? "success" : "error"}
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
        const getStatusConfig = (status) => {
          switch (status?.toLowerCase()) {
            case 'devolvido':
              return { color: 'success', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> };
            case 'cautelado':
              return { color: 'warning', icon: <AssignmentIcon sx={{ fontSize: 14 }} /> };
            default:
              return { color: 'default', icon: null };
          }
        };

        const config = getStatusConfig(row.status);

        return (
          <Chip
            icon={config.icon}
            label={row.status || '-'}
            size="small"
            color={config.color}
            variant="filled"
          />
        );
      },
    },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with Stats */}
      <Fade in timeout={400}>
        <HeaderCard elevation={0}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
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
                <AssignmentIcon sx={{ color: 'white', fontSize: 28 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                  Todas as Cautelas
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Historico completo de movimentacoes de cautela
                </Typography>
              </Box>
            </Box>

            {/* Stats chips */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <StatsChip
                icon={<AssignmentIcon sx={{ color: 'white !important' }} />}
                label={`${stats.total} total`}
              />
              {filtro === 0 && (
                <>
                  <StatsChip
                    icon={<SignatureIcon sx={{ color: 'white !important' }} />}
                    label={`${stats.assinados} assinados`}
                  />
                  <StatsChip
                    icon={<CancelIcon sx={{ color: 'white !important' }} />}
                    label={`${stats.naoAssinados} pendentes`}
                  />
                  <StatsChip
                    icon={<CheckCircleIcon sx={{ color: 'white !important' }} />}
                    label={`${stats.devolvidos} devolvidos`}
                  />
                </>
              )}
            </Box>
          </CardContent>
        </HeaderCard>
      </Fade>

      {/* Filters */}
      <Fade in timeout={600}>
        <FilterCard elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por material, militar ou viatura..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.grey[100], 0.5),
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <FilterChips
                  filters={filterOptions}
                  activeFilter={filtro}
                  onFilterChange={setFiltro}
                  showTitle={false}
                />
              </Grid>
            </Grid>
          </CardContent>
        </FilterCard>
      </Fade>

      {/* Results */}
      <Fade in timeout={800}>
        <Box>
          {/* Empty state */}
          {!loading && displayedMovimentacoes.length === 0 && (
            <Alert severity="info" sx={{ borderRadius: 3 }}>
              <AlertTitle>Nenhuma movimentacao encontrada</AlertTitle>
              Nao ha movimentacoes para este filtro.
            </Alert>
          )}

          {/* Results table */}
          {(loading || filteredMovimentacoes.length > 0) && (
            <SearchResultsTable
              data={filteredMovimentacoes}
              columns={columns}
              loading={loading}
              headerColor="error"
              title={`Movimentacoes - ${getFilterLabel(filtro)}`}
              subtitle={searchTerm ? `Resultados para "${searchTerm}"` : `Total: ${filteredMovimentacoes.length} registros`}
              emptyMessage="Nenhuma movimentacao encontrada com estes filtros"
              emptyIcon={<AssignmentIcon sx={{ fontSize: 48 }} />}
              renderPopover={(row) => (
                <MovimentacaoDetails
                  movimentacao={row}
                  title="Detalhes da Movimentacao"
                  color="error"
                />
              )}
            />
          )}
        </Box>
      </Fade>

      {/* Export FAB */}
      {filteredMovimentacoes.length > 0 && (
        <Tooltip title="Exportar para Excel" placement="left">
          <Fab
            color="success"
            size="medium"
            onClick={() => exportarMovimentacoes(
              filteredMovimentacoes,
              `movimentacoes_${getFilterLabel(filtro).toLowerCase()}`
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
