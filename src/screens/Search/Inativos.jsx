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
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  alpha,
  styled
} from "@mui/material";
import {
  Build as BuildIcon,
  Inventory as InventoryIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import db from "../../firebase/db";
import { query, collection, where, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { exportarMovimentacoes } from "../../firebase/xlsx";
import excelIcon from "../../assets/excel.svg";

const HeaderCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  marginBottom: theme.spacing(3),
  overflow: 'visible',
  background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
}));

const FilterCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  marginBottom: theme.spacing(3),
}));

const StatsChip = styled(Chip)(({ theme }) => ({
  backgroundColor: 'rgba(255,255,255,0.2)',
  color: 'white',
  fontWeight: 600,
  fontSize: '0.95rem',
  padding: theme.spacing(0.5, 1),
  height: 'auto',
  '& .MuiChip-label': {
    padding: theme.spacing(0.5, 1),
  },
}));

export default function Inativos({ categorias = [] }) {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("emReparo");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMovimentacao, setSelectedMovimentacao] = useState(null);
  const theme = useTheme();

  useEffect(() => {
    const fetchMovimentacoes = async () => {
      setLoading(true);
      try {
        const movimentacoesCollection = collection(db, "movimentacoes");
        const q = query(
          movimentacoesCollection,
          where("type", "==", "reparo"),
          orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(q);
        const movs = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === "emReparo" || data.status === "devolvidaDeReparo") {
            movs.push({ id: doc.id, ...data });
          }
        });
        setMovimentacoes(movs);
      } catch (error) {
        console.error("Erro ao buscar materiais em reparo:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovimentacoes();
  }, []);

  const handleOpenDialog = (movimentacao) => {
    setSelectedMovimentacao(movimentacao);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMovimentacao(null);
  };

  const handleMarcarDevolvido = async () => {
    if (!selectedMovimentacao) return;

    try {
      const movimentacaoRef = doc(db, "movimentacoes", selectedMovimentacao.id);
      await updateDoc(movimentacaoRef, {
        status: "devolvidaDeReparo"
      });

      setMovimentacoes(prev =>
        prev.map(mov =>
          mov.id === selectedMovimentacao.id
            ? { ...mov, status: "devolvidaDeReparo" }
            : mov
        )
      );

      handleCloseDialog();
    } catch (error) {
      console.error("Erro ao marcar como devolvido:", error);
    }
  };

  const filteredMovimentacoes = useMemo(() => {
    let filtered = movimentacoes;

    // Status filter
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((mov) => mov.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((mov) =>
        (mov.material_description?.toLowerCase() || '').includes(search) ||
        (mov.repairLocation?.toLowerCase() || '').includes(search) ||
        (mov.seiNumber?.toLowerCase() || '').includes(search) ||
        (mov.motivoReparo?.toLowerCase() || '').includes(search)
      );
    }

    // Category filter
    if (categoriaFilter) {
      filtered = filtered.filter((mov) => mov.categoria === categoriaFilter);
    }

    return filtered;
  }, [movimentacoes, searchTerm, categoriaFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const emReparo = movimentacoes.filter(m => m.status === "emReparo").length;
    const devolvidos = movimentacoes.filter(m => m.status === "devolvidaDeReparo").length;
    const total = movimentacoes.length;

    return { total, emReparo, devolvidos };
  }, [movimentacoes]);

  const filterOptions = [
    { value: "all", label: "Todos", shortLabel: "Todos", icon: <BuildIcon fontSize="small" />, color: "default" },
    { value: "emReparo", label: "Em Reparo", shortLabel: "Reparo", icon: <WarningIcon fontSize="small" />, color: "warning" },
    { value: "devolvidaDeReparo", label: "Devolvidos", shortLabel: "Devolvidos", icon: <CheckCircleIcon fontSize="small" />, color: "success" }
  ];

  const selectFilters = categorias.length > 0 ? [
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
  ] : [];

  const columns = [
    {
      field: 'material_description',
      headerName: 'Material',
      icon: <InventoryIcon fontSize="small" />,
      minWidth: 200,
      renderCell: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon fontSize="small" sx={{ color: 'warning.main' }} />
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {row.material_description || '-'}
            </Typography>
            {row.quantity > 1 && (
              <Typography variant="caption" color="text.secondary">
                Qtd: {row.quantity}
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      field: 'repairLocation',
      headerName: 'Local de Reparo',
      icon: <LocationIcon fontSize="small" />,
      minWidth: 150,
      renderCell: (row) => (
        <Chip
          icon={<LocationIcon sx={{ fontSize: 14 }} />}
          label={row.repairLocation || 'Nao informado'}
          size="small"
          variant="outlined"
          color="warning"
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'seiNumber',
      headerName: 'Numero SEI',
      icon: <DescriptionIcon fontSize="small" />,
      minWidth: 130,
      hideOnMobile: true,
      renderCell: (row) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
          {row.seiNumber || '-'}
        </Typography>
      ),
    },
    {
      field: 'motivoReparo',
      headerName: 'Motivo',
      minWidth: 150,
      hideOnMobile: true,
    },
    {
      field: 'date',
      headerName: 'Data Envio',
      icon: <CalendarIcon fontSize="small" />,
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
      field: 'status',
      headerName: 'Status',
      minWidth: 120,
      renderCell: (row) => {
        const isEmReparo = row.status === "emReparo";
        return (
          <Chip
            icon={isEmReparo ? <BuildIcon sx={{ fontSize: 14 }} /> : <CheckCircleIcon sx={{ fontSize: 14 }} />}
            label={isEmReparo ? "Em Reparo" : "Devolvido"}
            size="small"
            color={isEmReparo ? "warning" : "success"}
            variant="filled"
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Acoes',
      minWidth: 120,
      align: 'center',
      renderCell: (row) => {
        if (row.status === "emReparo") {
          return (
            <Tooltip title="Marcar como Devolvido" arrow>
              <Chip
                icon={<CheckCircleIcon />}
                label="Devolver"
                variant="outlined"
                color="success"
                clickable
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDialog(row);
                }}
                size="small"
                sx={{
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    borderColor: 'success.main'
                  }
                }}
              />
            </Tooltip>
          );
        }
        return null;
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
                <BuildIcon sx={{ color: 'white', fontSize: 28 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                  Materiais Inoperantes
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Equipamentos enviados para manutencao ou conserto
                </Typography>
              </Box>
            </Box>

            {/* Stats chips */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <StatsChip
                icon={<WarningIcon sx={{ color: 'white !important' }} />}
                label={`${stats.emReparo} em reparo`}
              />
              <StatsChip
                icon={<CheckCircleIcon sx={{ color: 'white !important' }} />}
                label={`${stats.devolvidos} devolvido${stats.devolvidos !== 1 ? 's' : ''}`}
              />
            </Box>
          </CardContent>
        </HeaderCard>
      </Fade>

      {/* Filters */}
      <Fade in timeout={600}>
        <FilterCard elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por material, local, SEI ou motivo..."
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
              <Grid item xs={12} md={7}>
                <FilterChips
                  filters={filterOptions}
                  activeFilter={statusFilter}
                  onFilterChange={setStatusFilter}
                  selectFilters={selectFilters}
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
          {!loading && movimentacoes.length === 0 && (
            <Alert severity="success" sx={{ borderRadius: 3 }}>
              <AlertTitle>Nenhum material em reparo</AlertTitle>
              Todos os materiais estao operacionais no momento.
            </Alert>
          )}

          {/* Results table */}
          {(loading || filteredMovimentacoes.length > 0) && (
            <SearchResultsTable
              data={filteredMovimentacoes}
              columns={columns}
              loading={loading}
              headerColor="warning"
              title="Lista de Materiais em Reparo"
              subtitle={searchTerm ? `Resultados para "${searchTerm}"` : `Total: ${filteredMovimentacoes.length} materiais`}
              emptyMessage="Nenhum material encontrado com estes filtros"
              emptyIcon={<BuildIcon sx={{ fontSize: 48 }} />}
              renderPopover={(row) => (
                <MovimentacaoDetails
                  movimentacao={row}
                  title="Detalhes do Reparo"
                  color="warning"
                />
              )}
            />
          )}
        </Box>
      </Fade>

      {/* Confirmation Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        PaperProps={{
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        <DialogTitle id="confirm-dialog-title" sx={{ fontWeight: 600 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon color="success" />
            Confirmar Devolucao
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">
            Tem certeza que deseja marcar o material <strong>"{selectedMovimentacao?.material_description}"</strong> como devolvido do reparo?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            color="inherit"
            sx={{ borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleMarcarDevolvido}
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            sx={{ borderRadius: 2 }}
          >
            Confirmar Devolucao
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export FAB */}
      {filteredMovimentacoes.length > 0 && (
        <Tooltip title="Exportar para Excel" placement="left">
          <Fab
            color="success"
            size="medium"
            onClick={() => exportarMovimentacoes(
              filteredMovimentacoes,
              "materiais_em_reparo"
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
