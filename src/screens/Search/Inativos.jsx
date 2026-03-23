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
  Badge,
  IconButton,
  alpha,
  styled,
  useMediaQuery
} from "@mui/material";
import {
  Build as BuildIcon,
  Inventory as InventoryIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  AttachFile as AttachFileIcon,
  DeleteForever as DeleteForeverIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import db from "../../firebase/db";
import { query, collection, where, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { exportarMovimentacoes } from "../../firebase/xlsx";
import excelIcon from "../../assets/excel.svg";
import { verifyToken } from "../../firebase/token";
import AnexosDialog from "../../dialogs/AnexosDialog";
import { deleteMovimentacao } from "../../services/movimentacaoService";

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
  const [userRole, setUserRole] = useState(null);
  const [username, setUsername] = useState("");
  const [anexosDialogOpen, setAnexosDialogOpen] = useState(false);
  const [selectedMovForAnexos, setSelectedMovForAnexos] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMovForDelete, setSelectedMovForDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      verifyToken(token).then((payload) => {
        if (payload) {
          setUserRole(payload.role);
          setUsername(payload.username || "");
        }
      });
    }
  }, []);

  const handleOpenAnexos = (mov) => {
    setSelectedMovForAnexos(mov);
    setAnexosDialogOpen(true);
  };

  const handleCloseAnexos = () => {
    setAnexosDialogOpen(false);
    setSelectedMovForAnexos(null);
  };

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

  const handleOpenDeleteDialog = (mov) => {
    setSelectedMovForDelete(mov);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedMovForDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedMovForDelete) return;
    setDeleting(true);
    try {
      await deleteMovimentacao(selectedMovForDelete);
      setMovimentacoes((prev) => prev.filter((m) => m.id !== selectedMovForDelete.id));
      handleCloseDeleteDialog();
    } catch (error) {
      console.error("Erro ao excluir movimentação:", error);
      alert("Erro ao excluir movimentação: " + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const isAdminGeral = userRole === "admingeral";

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
      minWidth: 160,
      renderCell: (row) => {
        const responsavel = row.sender_name || row.user_name;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InventoryIcon fontSize="small" sx={{ color: 'warning.main', flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={500} noWrap>
                {row.material_description || '-'}
              </Typography>
              {responsavel && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  Resp: {responsavel}
                </Typography>
              )}
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'repairLocation',
      headerName: 'Local',
      icon: <LocationIcon fontSize="small" />,
      minWidth: 100,
      renderCell: (row) => (
        <Chip
          icon={<LocationIcon sx={{ fontSize: 14 }} />}
          label={row.repairLocation || 'N/I'}
          size="small"
          variant="outlined"
          color="warning"
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'seiNumber',
      headerName: 'SEI',
      icon: <DescriptionIcon fontSize="small" />,
      minWidth: 100,
      hideOnMobile: true,
      renderCell: (row) => (
        <Tooltip title={row.seiNumber || '-'} arrow>
          <Typography variant="body2" noWrap sx={{ fontFamily: 'monospace', fontWeight: 500, maxWidth: 160 }}>
            {row.seiNumber || '-'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'motivoReparo',
      headerName: 'Motivo',
      minWidth: 120,
      hideOnMobile: true,
      renderCell: (row) => {
        const motivo = row.motivoReparo || '-';
        return (
          <Tooltip title={motivo} arrow enterDelay={300}>
            <Typography
              variant="body2"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                lineHeight: 1.4,
              }}
            >
              {motivo}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      field: 'date',
      headerName: 'Data',
      icon: <CalendarIcon fontSize="small" />,
      minWidth: 90,
      hideOnMobile: true,
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
      minWidth: 100,
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
      minWidth: 80,
      align: 'center',
      renderCell: (row) => {
        const anexosCount = row.anexos?.length || 0;
        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'nowrap' }}>
            <Tooltip title="Anexos / Comprovantes" arrow placement="top">
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAnexos(row);
                }}
              >
                <Badge badgeContent={anexosCount} color="primary" max={99}>
                  <AttachFileIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
            {row.status === "emReparo" && (
              <Tooltip title="Marcar como Devolvido" arrow placement="top">
                <IconButton
                  size="small"
                  color="success"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDialog(row);
                  }}
                >
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {isAdminGeral && (
              <Tooltip title="Excluir movimentação" arrow placement="top">
                <IconButton
                  size="small"
                  sx={{ color: 'error.main' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDeleteDialog(row);
                  }}
                >
                  <DeleteForeverIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with Stats */}
      <Fade in timeout={400}>
        <HeaderCard elevation={0}>
          <CardContent sx={{ p: { xs: 1.5, sm: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, mb: 2, flexWrap: 'wrap' }}>
              <Box
                sx={{
                  width: { xs: 40, sm: 48 },
                  height: { xs: 40, sm: 48 },
                  borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BuildIcon sx={{ color: 'white', fontSize: { xs: 24, sm: 28 } }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, fontSize: { xs: '1.15rem', sm: '1.5rem' } }}>
                  Materiais Inoperantes
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', display: { xs: 'none', sm: 'block' } }}>
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
          <CardContent sx={{ p: { xs: 1.5, sm: 3 } }}>
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

      {/* Anexos Dialog */}
      <AnexosDialog
        open={anexosDialogOpen}
        onClose={handleCloseAnexos}
        movimentacao={selectedMovForAnexos}
        userRole={userRole}
        username={username}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteForeverIcon color="error" />
            Excluir Movimentacao
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir esta movimentacao?
            {selectedMovForDelete && (
              <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                <li><strong>Material:</strong> {selectedMovForDelete.material_description}</li>
                <li><strong>Local:</strong> {selectedMovForDelete.repairLocation || '-'}</li>
                <li><strong>SEI:</strong> {selectedMovForDelete.seiNumber || '-'}</li>
                <li><strong>Data:</strong> {selectedMovForDelete.date?.seconds ? new Date(selectedMovForDelete.date.seconds * 1000).toLocaleDateString('pt-BR') : '-'}</li>
                <li><strong>Status:</strong> {selectedMovForDelete.status === 'emReparo' ? 'Em Reparo' : 'Devolvido'}</li>
              </Box>
            )}
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
            {selectedMovForDelete?.status === 'devolvidaDeReparo'
              ? 'Este reparo ja foi devolvido. O estoque nao sera alterado.'
              : 'O estoque do material sera revertido automaticamente.'}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={handleCloseDeleteDialog}
            variant="outlined"
            color="inherit"
            sx={{ borderRadius: 2 }}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            startIcon={<DeleteForeverIcon />}
            sx={{ borderRadius: 2 }}
            disabled={deleting}
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
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
              bottom: { xs: 70, sm: 80 },
              right: { xs: 16, sm: 24 },
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
