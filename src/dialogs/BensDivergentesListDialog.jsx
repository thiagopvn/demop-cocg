import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Stack,
  Card,
  alpha,
  styled,
  TextField,
  InputAdornment,
  Tooltip,
  ButtonGroup,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RuleFolderOutlinedIcon from '@mui/icons-material/RuleFolderOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const HeaderCell = styled(TableCell)(() => ({
  color: 'white',
  fontWeight: 700,
  fontSize: '0.8rem',
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  borderBottom: 'none',
}));

const StatCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  borderRadius: 12,
  flex: 1,
  minWidth: 140,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  background: `linear-gradient(135deg, ${alpha('#ea580c', 0.08)}, ${alpha('#ea580c', 0.02)})`,
  border: `1px solid ${alpha('#ea580c', 0.18)}`,
}));

const WRAP_SX = {
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  verticalAlign: 'top',
};

const formatDateTimeBR = (value) => {
  if (!value) return null;
  let date = null;
  if (typeof value?.toDate === 'function') date = value.toDate();
  else if (value instanceof Date) date = value;
  else if (typeof value === 'number') date = new Date(value);
  else if (typeof value === 'string') date = new Date(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function BensDivergentesListDialog({
  open,
  items = [],
  loading = false,
  onClose,
  onCreate,
  onEdit,
  onDelete,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setPage(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) => {
      const desc = String(it.descricao ?? '').toLowerCase();
      const loc = String(it.localidade ?? '').toLowerCase();
      const obs = String(it.observacoes ?? '').toLowerCase();
      const by = String(it.created_by_nome ?? '').toLowerCase();
      return desc.includes(term) || loc.includes(term) || obs.includes(term) || by.includes(term);
    });
  }, [items, search]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const totalQtd = useMemo(
    () =>
      items.reduce((acc, it) => {
        const n = Number(it.quantidade);
        return acc + (Number.isFinite(n) ? n : 0);
      }, 0),
    [items]
  );

  const emViatura = useMemo(
    () => items.filter((it) => !!it.viatura_bens_id).length,
    [items]
  );

  const handleConfirmDelete = async () => {
    if (!confirmDelete?.id) return;
    try {
      await onDelete?.(confirmDelete);
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        slotProps={{
          paper: {
            sx: {
              borderRadius: isMobile ? 0 : '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              overflow: 'hidden',
              height: isMobile ? '100%' : '85vh',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)',
            color: 'white',
            py: 2.5,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <RuleFolderOutlinedIcon sx={{ fontSize: 32 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.15rem', lineHeight: 1.2 }}>
              Itens Fora do Arrolamento
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.85rem' }}>
              Materiais encontrados em conferência que não constam na planilha oficial
            </Typography>
          </Box>
          <Button
            onClick={onCreate}
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: 'rgba(255,255,255,0.18)',
              color: 'white',
              boxShadow: 'none',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.28)' },
            }}
          >
            Novo
          </Button>
          <IconButton
            aria-label="Fechar"
            onClick={onClose}
            sx={{
              color: 'white',
              backgroundColor: 'rgba(255,255,255,0.12)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.22)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 3 }, backgroundColor: 'background.default' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <StatCard>
              <Typography variant="caption" sx={{ color: '#9a3412', fontWeight: 600 }}>
                Total de itens
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: '#c2410c' }}>
                {items.length.toLocaleString('pt-BR')}
              </Typography>
            </StatCard>
            <StatCard>
              <Typography variant="caption" sx={{ color: '#9a3412', fontWeight: 600 }}>
                Quantidade somada
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: '#c2410c' }}>
                {totalQtd.toLocaleString('pt-BR')}
              </Typography>
            </StatCard>
            <StatCard>
              <Typography variant="caption" sx={{ color: '#9a3412', fontWeight: 600 }}>
                Em viatura
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: '#c2410c' }}>
                {emViatura.toLocaleString('pt-BR')}
              </Typography>
            </StatCard>
          </Stack>

          <Box
            sx={{
              p: 1.5,
              mb: 2,
              borderRadius: 2,
              border: '1px solid #e0e0e0',
              backgroundColor: 'background.paper',
            }}
          >
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              placeholder="Buscar por descrição, localidade, observação ou responsável..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#c2410c' }} />
                    </InputAdornment>
                  ),
                  endAdornment: search && (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setSearch('')} size="small">
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: 'background.default',
                },
              }}
            />
          </Box>

          <Box
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid #e0e0e0',
              backgroundColor: 'background.paper',
            }}
          >
            <TableContainer sx={{ maxHeight: { xs: '55vh', md: '50vh' } }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      '& th': {
                        background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)',
                      },
                    }}
                  >
                    <HeaderCell sx={{ minWidth: 240 }}>Descrição</HeaderCell>
                    <HeaderCell align="center">Qtd</HeaderCell>
                    <HeaderCell sx={{ minWidth: 160 }}>Localidade</HeaderCell>
                    <HeaderCell sx={{ minWidth: 220 }}>Observações</HeaderCell>
                    <HeaderCell sx={{ minWidth: 170 }}>Cadastrado</HeaderCell>
                    <HeaderCell align="center">Ações</HeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <CircularProgress sx={{ color: '#c2410c' }} />
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <RuleFolderOutlinedIcon sx={{ fontSize: 40, color: '#c2410c', opacity: 0.4 }} />
                        <Typography color="text.secondary" sx={{ fontStyle: 'italic', mt: 1 }}>
                          {items.length === 0
                            ? 'Nenhum item fora do arrolamento cadastrado ainda.'
                            : 'Nenhum resultado para a busca atual.'}
                        </Typography>
                        {items.length === 0 && (
                          <Button
                            onClick={onCreate}
                            startIcon={<AddIcon />}
                            variant="outlined"
                            sx={{
                              mt: 2,
                              textTransform: 'none',
                              fontWeight: 700,
                              borderColor: '#c2410c',
                              color: '#c2410c',
                              '&:hover': {
                                borderColor: '#9a3412',
                                backgroundColor: 'rgba(194,65,12,0.06)',
                              },
                            }}
                          >
                            Cadastrar primeiro item
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((item) => {
                      const created = formatDateTimeBR(item.created_at);
                      return (
                        <TableRow
                          key={item.id}
                          sx={{
                            transition: 'background-color 0.2s',
                            '&:hover': { backgroundColor: alpha('#ea580c', 0.04) },
                          }}
                        >
                          <TableCell sx={{ ...WRAP_SX, fontWeight: 600 }}>
                            {item.descricao || '—'}
                          </TableCell>
                          <TableCell align="center" sx={WRAP_SX}>
                            {item.quantidade ?? 1}
                          </TableCell>
                          <TableCell sx={WRAP_SX}>
                            {item.localidade ? (
                              <Chip
                                icon={item.viatura_bens_id ? <LocalShippingOutlinedIcon /> : <LocationOnIcon />}
                                label={item.localidade}
                                size="small"
                                sx={{
                                  fontWeight: 600,
                                  backgroundColor: item.viatura_bens_id ? '#fff3e0' : '#e3f2fd',
                                  color: item.viatura_bens_id ? '#e65100' : '#1565c0',
                                  maxWidth: '100%',
                                  height: 'auto',
                                  py: 0.4,
                                  '& .MuiChip-label': {
                                    whiteSpace: 'normal',
                                    wordBreak: 'break-word',
                                    display: 'block',
                                    lineHeight: 1.3,
                                  },
                                  '& .MuiChip-icon': { color: 'inherit' },
                                }}
                              />
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell sx={WRAP_SX}>
                            {item.observacoes ? (
                              <Box
                                sx={{
                                  backgroundColor: 'surface.amber',
                                  borderLeft: '3px solid #f9a825',
                                  borderRadius: '6px',
                                  p: 1,
                                  fontSize: '0.82rem',
                                  color: '#5d4037',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  lineHeight: 1.45,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {item.observacoes}
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={WRAP_SX}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                              {created && (
                                <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                                  {created}
                                </Typography>
                              )}
                              {item.created_by_nome && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                  <PersonOutlineIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: 'text.secondary',
                                      fontWeight: 600,
                                      fontSize: '0.72rem',
                                    }}
                                  >
                                    {item.created_by_nome}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center" sx={{ verticalAlign: 'top' }}>
                            <ButtonGroup
                              size="small"
                              variant="text"
                              sx={{ '& .MuiButton-root': { minWidth: 40, p: 0.6 } }}
                            >
                              <Tooltip title="Editar" arrow>
                                <Button onClick={() => onEdit?.(item)} sx={{ color: '#1e3a5f' }}>
                                  <EditIcon fontSize="small" />
                                </Button>
                              </Tooltip>
                              <Tooltip title="Excluir" arrow>
                                <Button
                                  onClick={() => setConfirmDelete(item)}
                                  sx={{ color: '#c62828' }}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </Button>
                              </Tooltip>
                            </ButtonGroup>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Itens por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, minHeight: 44, px: 3 }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Excluir item divergente?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esta ação não pode ser desfeita. O item{' '}
            <strong>{confirmDelete?.descricao || 'sem descrição'}</strong> será removido
            permanentemente da lista de itens fora do arrolamento.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            onClick={() => setConfirmDelete(null)}
            variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
