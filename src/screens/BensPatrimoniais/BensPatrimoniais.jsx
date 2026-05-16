import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  ButtonGroup,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Fade,
  Backdrop,
  Stack,
  Card,
  alpha,
  styled,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import MenuContext from '../../contexts/MenuContext';
import PrivateRoute from '../../contexts/PrivateRoute';
import { useDebounce } from '../../hooks/useDebounce';
import {
  subscribeBensPatrimoniais,
  createBemPatrimonial,
  updateBemPatrimonial,
  updateLocalidade,
  markAsConferido,
} from '../../firebase/bensPatrimoniaisService';
import { subscribeBensViaturas } from '../../firebase/bensViaturasService';
import { importBensPatrimoniaisFromFile } from '../../utils/bensPatrimoniaisImporter';

const EditDialog = lazy(() => import('../../dialogs/BensPatrimoniaisEditDialog'));
const LocationDialog = lazy(() => import('../../dialogs/BensPatrimoniaisLocationDialog'));
const ViaturasManageDialog = lazy(() => import('../../dialogs/BensViaturasManageDialog'));
const ViaturasMateriaisDialog = lazy(() => import('../../dialogs/BensViaturasMateriaisDialog'));
const ObservacaoDialog = lazy(() => import('../../dialogs/BensPatrimoniaisObservacaoDialog'));

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

const StyledHeader = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: 16,
  background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  flexWrap: 'wrap',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    gap: theme.spacing(1.5),
  },
}));

const StatCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(1.8, 2.2),
  borderRadius: 12,
  flex: 1,
  minWidth: 140,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(
    theme.palette.primary.main,
    0.02
  )})`,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[3],
  },
}));

const HeaderCell = styled(TableCell)(({ theme }) => ({
  color: 'white',
  fontWeight: 700,
  fontSize: '0.85rem',
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  borderBottom: 'none',
  [theme.breakpoints.down('md')]: { fontSize: '0.8rem' },
}));

const StyledRow = styled(TableRow, {
  shouldForwardProp: (prop) => prop !== 'overdue',
})(({ theme, overdue }) => ({
  transition: 'background-color 0.2s',
  ...(overdue
    ? {
        backgroundColor: alpha(theme.palette.error.light, 0.25),
        '&:hover': { backgroundColor: alpha(theme.palette.error.light, 0.35) },
      }
    : {
        '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.04) },
      }),
}));

const WRAP_SX = {
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  verticalAlign: 'top',
};

const SORT_LABEL_SX = {
  color: 'white !important',
  '&:hover': { color: 'rgba(255,255,255,0.85) !important' },
  '&.Mui-active': { color: 'white !important' },
  '& .MuiTableSortLabel-icon': { color: 'white !important', opacity: 0.7 },
};

const FIELD_TYPES = {
  id_patrimonio: 'natural',
  descricao: 'text',
  quantidade: 'number',
  valor: 'number',
  localidade: 'text',
  aapat_processo_sei: 'natural',
  ultima_conferencia: 'date',
};

const parseNumeric = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const compareValues = (av, bv, type, direction) => {
  const aEmpty = av === null || av === undefined || av === '';
  const bEmpty = bv === null || bv === undefined || bv === '';

  if (type === 'date') {
    // "nunca conferido" (null) é considerado mais antigo que qualquer data: -Infinity
    const aTime = aEmpty ? -Infinity : (formatDateBR(av)?.getTime() ?? -Infinity);
    const bTime = bEmpty ? -Infinity : (formatDateBR(bv)?.getTime() ?? -Infinity);
    const cmp = aTime - bTime;
    return direction === 'asc' ? cmp : -cmp;
  }

  if (type === 'number') {
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1; // vazios sempre ao fim
    if (bEmpty) return -1;
    const an = parseNumeric(av);
    const bn = parseNumeric(bv);
    if (an === null && bn === null) return 0;
    if (an === null) return 1;
    if (bn === null) return -1;
    const cmp = an - bn;
    return direction === 'asc' ? cmp : -cmp;
  }

  // text / natural — localeCompare com { numeric: true } trata "Item 10" > "Item 2"
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  const cmp = String(av).localeCompare(String(bv), 'pt-BR', {
    numeric: true,
    sensitivity: 'base',
  });
  return direction === 'asc' ? cmp : -cmp;
};

const formatDateBR = (value) => {
  if (!value) return null;
  let date = null;
  if (typeof value?.toDate === 'function') date = value.toDate();
  else if (value instanceof Date) date = value;
  else if (typeof value === 'number') date = new Date(value);
  else if (typeof value === 'string') date = new Date(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
};

const isOverdueSixMonths = (dateLike) => {
  const d = formatDateBR(dateLike);
  if (!d) return true;
  return Date.now() - d.getTime() > SIX_MONTHS_MS;
};

// Detecta localidades que claramente são dados ruins (valor monetário, número
// puro ou data) — vindos de planilhas com colunas trocadas na importação.
const isInvalidLocalidade = (s) => {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  if (!t) return false;
  if (/^R\$/i.test(t)) return true;
  if (/^[\d\s.,]+$/.test(t)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(t)) return true;
  return false;
};

const formatValor = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return String(v);
};

export default function BensPatrimoniais() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });

  const handleSort = useCallback((field) => {
    setSortConfig((prev) => {
      if (prev.field !== field) {
        // Primeiro clique: datas começam do mais antigo p/ mais recente (asc);
        // números e texto começam crescente (1→9 / A→Z) — comportamento natural
        return { field, direction: 'asc' };
      }
      return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  }, []);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationItem, setLocationItem] = useState(null);
  const [observacaoOpen, setObservacaoOpen] = useState(false);
  const [observacaoItem, setObservacaoItem] = useState(null);
  const [viaturas, setViaturas] = useState([]);
  const [manageViaturasOpen, setManageViaturasOpen] = useState(false);
  const [materiaisViaturaOpen, setMateriaisViaturaOpen] = useState(false);
  const [materiaisInitialViaturaId, setMateriaisInitialViaturaId] = useState(null);

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnack = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeBensPatrimoniais(
      (data) => {
        setItems(data);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        showSnack('Erro ao carregar bens patrimoniais.', 'error');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [showSnack]);

  useEffect(() => {
    const unsub = subscribeBensViaturas(
      (data) => setViaturas(data),
      (err) => {
        console.error(err);
      }
    );
    return () => unsub();
  }, []);

  const filteredItems = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) => {
      const idStr = String(it.id_patrimonio ?? '').toLowerCase();
      const desc = String(it.descricao ?? '').toLowerCase();
      const loc = String(it.localidade ?? '').toLowerCase();
      const aapat = String(it.aapat_processo_sei ?? '').toLowerCase();
      return idStr.includes(term) || desc.includes(term) || loc.includes(term) || aapat.includes(term);
    });
  }, [items, debouncedSearch]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const sortedItems = useMemo(() => {
    if (!sortConfig.field) return filteredItems;
    const type = FIELD_TYPES[sortConfig.field] || 'text';
    const arr = [...filteredItems];
    arr.sort((a, b) =>
      compareValues(a[sortConfig.field], b[sortConfig.field], type, sortConfig.direction)
    );
    return arr;
  }, [filteredItems, sortConfig]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedItems.slice(start, start + rowsPerPage);
  }, [sortedItems, page, rowsPerPage]);

  const overdueCount = useMemo(
    () => items.filter((it) => isOverdueSixMonths(it.ultima_conferencia)).length,
    [items]
  );

  const localidadeSuggestions = useMemo(() => {
    const set = new Set();
    // Filtra entradas que parecem ser valor monetário/numérico ou data —
    // dados ruins vindos de importações com colunas trocadas.
    const looksLikeMoneyOrNumber = (s) => {
      const t = s.trim();
      if (!t) return true;
      if (/^R\$/i.test(t)) return true;
      // Só dígitos, vírgulas, pontos e espaços (ex.: "1.234,56", "157.21")
      if (/^[\d\s.,]+$/.test(t)) return true;
      // Data BR no padrão dd/mm/aaaa
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(t)) return true;
      return false;
    };
    items.forEach((it) => {
      if (typeof it.localidade === 'string' && it.localidade.trim()) {
        const v = it.localidade.trim();
        if (!looksLikeMoneyOrNumber(v)) set.add(v);
      }
    });
    return Array.from(set);
  }, [items]);

  const totalValor = useMemo(() => {
    let total = 0;
    for (const it of items) {
      if (typeof it.valor === 'number' && Number.isFinite(it.valor)) {
        total += it.valor;
        continue;
      }
      if (typeof it.valor === 'string' && it.valor.trim()) {
        const cleaned = it.valor.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
        const n = Number(cleaned);
        if (Number.isFinite(n)) total += n;
      }
    }
    return total;
  }, [items]);

  const handleQuickCheck = async (item) => {
    try {
      await markAsConferido(item.id);
      showSnack('Item conferido com sucesso.', 'success');
    } catch {
      showSnack('Falha ao registrar conferência.', 'error');
    }
  };

  const handleOpenEdit = (item) => {
    setEditItem(item);
    setEditOpen(true);
  };

  const handleOpenLocation = (item) => {
    setLocationItem(item);
    setLocationOpen(true);
  };

  const handleOpenObservacao = (item) => {
    setObservacaoItem(item);
    setObservacaoOpen(true);
  };

  const handleSubmitObservacao = async (newObservacao) => {
    if (!observacaoItem?.id) return;
    try {
      await updateBemPatrimonial(observacaoItem.id, { observacoes: newObservacao });
      showSnack(
        newObservacao.trim() ? 'Observação salva.' : 'Observação removida.',
        'success'
      );
      setObservacaoOpen(false);
      setObservacaoItem(null);
    } catch {
      showSnack('Erro ao salvar observação.', 'error');
    }
  };

  const handleSubmitEdit = async (data) => {
    try {
      if (editItem?.id) {
        await updateBemPatrimonial(editItem.id, data);
        showSnack('Bem patrimonial atualizado.', 'success');
      } else {
        await createBemPatrimonial(data);
        showSnack('Bem patrimonial cadastrado.', 'success');
      }
      setEditOpen(false);
      setEditItem(null);
    } catch {
      showSnack('Erro ao salvar bem patrimonial.', 'error');
    }
  };

  const handleSubmitLocation = async (newLocalidade, viaturaInfo = null) => {
    if (!locationItem?.id) return;
    try {
      await updateLocalidade(locationItem.id, newLocalidade, viaturaInfo);
      showSnack(
        viaturaInfo ? `Alocado em ${viaturaInfo.nome}.` : 'Localidade atualizada.',
        'success'
      );
      setLocationOpen(false);
      setLocationItem(null);
    } catch {
      showSnack('Erro ao atualizar localidade.', 'error');
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportProgress({ done: 0, total: 0 });
    try {
      const result = await importBensPatrimoniaisFromFile(file, {
        onProgress: (done, total) => setImportProgress({ done, total }),
      });
      if (result.unknownHeaders && result.unknownHeaders.length > 0) {
        console.warn('Colunas ignoradas na importação:', result.unknownHeaders);
      }
      if (result.message) {
        showSnack(result.message, 'warning');
      } else {
        const errSuffix = result.errors.length > 0 ? ` ${result.errors.length} erro(s).` : '';
        showSnack(
          `Importação concluída: ${result.created} criado(s), ${result.updated} atualizado(s).${errSuffix}`,
          result.errors.length > 0 ? 'warning' : 'success'
        );
      }
    } catch (err) {
      console.error(err);
      showSnack(`Erro ao importar planilha: ${err.message || 'desconhecido'}`, 'error');
    } finally {
      setImporting(false);
      setImportProgress({ done: 0, total: 0 });
    }
  };

  return (
    <PrivateRoute allowedRoles={['BensPatrimoniais', 'admingeral']}>
      <MenuContext>
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
          <Fade in timeout={300}>
            <Box>
              <StyledHeader elevation={0}>
                <AccountBalanceIcon sx={{ fontSize: { xs: 36, sm: 44 } }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem' }, lineHeight: 1.2 }}
                  >
                    Bens Patrimoniais
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
                    Gestão e conferência periódica de ativos
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ flexShrink: 0 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<UploadFileIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 700,
                      backgroundColor: '#ff6b35',
                      boxShadow: '0 4px 12px rgba(255,107,53,0.35)',
                      '&:hover': { backgroundColor: '#e85a26' },
                    }}
                  >
                    Importar Planilha (XLSX)
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<LocalShippingOutlinedIcon />}
                    onClick={() => setManageViaturasOpen(true)}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 700,
                      borderColor: 'white',
                      color: 'white',
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                      },
                    }}
                  >
                    Viaturas
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<InventoryIcon />}
                    onClick={() => {
                      setMateriaisInitialViaturaId(null);
                      setMateriaisViaturaOpen(true);
                    }}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 700,
                      borderColor: 'white',
                      color: 'white',
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                      },
                    }}
                  >
                    Ver por Viatura
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setEditItem(null);
                      setEditOpen(true);
                    }}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 700,
                      borderColor: 'white',
                      color: 'white',
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                      },
                    }}
                  >
                    Novo
                  </Button>
                </Stack>
              </StyledHeader>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ mb: 3 }}
              >
                <StatCard>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Total de Itens
                  </Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ color: '#1e3a5f' }}>
                    {items.length.toLocaleString('pt-BR')}
                  </Typography>
                </StatCard>
                <StatCard>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Atrasados (&gt; 6 meses)
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{ color: overdueCount > 0 ? 'error.dark' : 'success.dark' }}
                  >
                    {overdueCount.toLocaleString('pt-BR')}
                  </Typography>
                </StatCard>
                <StatCard>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Valor estimado
                  </Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ color: '#1e3a5f' }}>
                    {totalValor.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </Typography>
                </StatCard>
              </Stack>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 2,
                  border: '1px solid #e0e0e0',
                }}
              >
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Buscar por patrimônio, descrição, localidade ou AAPat/SEI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#1e3a5f' }} />
                        </InputAdornment>
                      ),
                      endAdornment: searchTerm && (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setSearchTerm('')} size="small">
                            <ClearIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#fafafa',
                    },
                  }}
                />
              </Paper>

              <Paper
                elevation={1}
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '1px solid #e0e0e0',
                }}
              >
                <TableContainer sx={{ maxHeight: { xs: '60vh', md: '70vh' } }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow
                        sx={{
                          '& th': {
                            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
                          },
                        }}
                      >
                        {[
                          { field: 'id_patrimonio', label: 'Patrimônio', align: 'left' },
                          { field: 'descricao', label: 'Descrição', align: 'left' },
                          { field: 'quantidade', label: 'Qtd', align: 'center' },
                          { field: 'valor', label: 'Valor', align: 'left' },
                          { field: 'localidade', label: 'Localidade', align: 'left' },
                          { field: 'aapat_processo_sei', label: 'AAPat / SEI', align: 'left' },
                          { field: 'ultima_conferencia', label: 'Última Conferência', align: 'left' },
                        ].map(({ field, label, align }) => {
                          const active = sortConfig.field === field;
                          return (
                            <HeaderCell
                              key={field}
                              align={align}
                              sortDirection={active ? sortConfig.direction : false}
                            >
                              <TableSortLabel
                                active={active}
                                direction={active ? sortConfig.direction : 'asc'}
                                onClick={() => handleSort(field)}
                                sx={SORT_LABEL_SX}
                              >
                                {label}
                              </TableSortLabel>
                            </HeaderCell>
                          );
                        })}
                        <HeaderCell align="left" sx={{ minWidth: 240 }}>Observação</HeaderCell>
                        <HeaderCell align="center">Ações</HeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                            <CircularProgress />
                          </TableCell>
                        </TableRow>
                      ) : filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                            <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              {items.length === 0
                                ? 'Nenhum bem patrimonial cadastrado. Importe uma planilha ou cadastre manualmente.'
                                : 'Nenhum resultado para a busca atual.'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginated.map((item) => {
                          const overdue = isOverdueSixMonths(item.ultima_conferencia);
                          const lastDate = formatDateBR(item.ultima_conferencia);
                          return (
                            <StyledRow key={item.id} overdue={overdue}>
                              <TableCell sx={{ ...WRAP_SX, fontWeight: 700, color: overdue ? 'error.dark' : '#1e3a5f' }}>
                                {item.id_patrimonio || '—'}
                              </TableCell>
                              <TableCell
                                sx={{
                                  ...WRAP_SX,
                                  color: overdue ? 'error.dark' : 'inherit',
                                  minWidth: 220,
                                }}
                              >
                                {item.descricao || '—'}
                              </TableCell>
                              <TableCell align="center" sx={{ ...WRAP_SX, color: overdue ? 'error.dark' : 'inherit' }}>
                                {item.quantidade ?? 1}
                              </TableCell>
                              <TableCell sx={{ ...WRAP_SX, color: overdue ? 'error.dark' : 'inherit' }}>
                                {formatValor(item.valor)}
                              </TableCell>
                              <TableCell sx={{ ...WRAP_SX, minWidth: 160, color: overdue ? 'error.dark' : 'inherit' }}>
                                {item.localidade ? (
                                  isInvalidLocalidade(item.localidade) ? (
                                    <Tooltip
                                      title="Localidade inválida (parece valor monetário/numérico). Edite o item para corrigir."
                                      arrow
                                    >
                                      <Chip
                                        icon={<WarningAmberIcon />}
                                        label="Localidade inválida"
                                        size="small"
                                        sx={{
                                          fontWeight: 600,
                                          backgroundColor: '#fff8e1',
                                          color: '#ad8600',
                                          border: '1px dashed #f9a825',
                                          '& .MuiChip-icon': { color: '#f9a825' },
                                        }}
                                      />
                                    </Tooltip>
                                  ) : (
                                    <Chip
                                      icon={item.viatura_bens_id ? <LocalShippingOutlinedIcon /> : undefined}
                                      label={item.localidade}
                                      size="small"
                                      sx={{
                                        fontWeight: 600,
                                        backgroundColor: overdue
                                          ? '#ffebee'
                                          : item.viatura_bens_id
                                          ? '#fff3e0'
                                          : '#e3f2fd',
                                        color: overdue
                                          ? '#b71c1c'
                                          : item.viatura_bens_id
                                          ? '#e65100'
                                          : '#1565c0',
                                        maxWidth: '100%',
                                        height: 'auto',
                                        py: 0.4,
                                        '& .MuiChip-label': {
                                          whiteSpace: 'normal',
                                          wordBreak: 'break-word',
                                          display: 'block',
                                          lineHeight: 1.3,
                                        },
                                        '& .MuiChip-icon': {
                                          color: 'inherit',
                                        },
                                      }}
                                    />
                                  )
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                              <TableCell
                                sx={{
                                  ...WRAP_SX,
                                  minWidth: 180,
                                  color: overdue ? 'error.dark' : 'inherit',
                                }}
                              >
                                {item.aapat_processo_sei || '—'}
                              </TableCell>
                              <TableCell sx={WRAP_SX}>
                                {lastDate ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {overdue && (
                                      <WarningAmberIcon
                                        sx={{ fontSize: 18, color: 'error.dark' }}
                                      />
                                    )}
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: overdue ? 'error.dark' : 'text.primary',
                                        fontWeight: overdue ? 700 : 400,
                                      }}
                                    >
                                      {lastDate.toLocaleDateString('pt-BR')}
                                    </Typography>
                                  </Box>
                                ) : (
                                  <Chip
                                    size="small"
                                    icon={<WarningAmberIcon />}
                                    label="Nunca conferido"
                                    sx={{
                                      fontWeight: 600,
                                      backgroundColor: '#ffebee',
                                      color: '#b71c1c',
                                    }}
                                  />
                                )}
                              </TableCell>
                              <TableCell
                                sx={{
                                  verticalAlign: 'top',
                                  minWidth: 240,
                                  maxWidth: 320,
                                  py: 1,
                                }}
                              >
                                {item.observacoes ? (
                                  <Tooltip title="Clique para editar a observação" arrow placement="top">
                                    <Box
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => handleOpenObservacao(item)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          handleOpenObservacao(item);
                                        }
                                      }}
                                      sx={{
                                        cursor: 'pointer',
                                        backgroundColor: '#fffbe6',
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
                                        transition: 'background-color 0.15s, box-shadow 0.15s',
                                        '&:hover': {
                                          backgroundColor: '#fff3c4',
                                          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                        },
                                        '&:focus-visible': {
                                          outline: '2px solid #ff6b35',
                                          outlineOffset: 1,
                                        },
                                      }}
                                    >
                                      {item.observacoes}
                                    </Box>
                                  </Tooltip>
                                ) : (
                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => handleOpenObservacao(item)}
                                    startIcon={
                                      <StickyNote2OutlinedIcon fontSize="small" />
                                    }
                                    sx={{
                                      textTransform: 'none',
                                      fontWeight: 500,
                                      fontSize: '0.78rem',
                                      color: 'text.secondary',
                                      borderRadius: '6px',
                                      px: 1,
                                      '&:hover': {
                                        backgroundColor: 'rgba(249,168,37,0.08)',
                                        color: '#8d6e00',
                                      },
                                    }}
                                  >
                                    Adicionar
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell align="center" sx={{ verticalAlign: 'top' }}>
                                <ButtonGroup
                                  size="small"
                                  variant="text"
                                  sx={{ '& .MuiButton-root': { minWidth: 40, p: 0.6 } }}
                                >
                                  <Tooltip title="Conferência rápida (registra hoje)" arrow>
                                    <Button
                                      onClick={() => handleQuickCheck(item)}
                                      sx={{ color: '#2e7d32' }}
                                    >
                                      <CheckCircleIcon fontSize="small" />
                                    </Button>
                                  </Tooltip>
                                  <Tooltip title="Editar" arrow>
                                    <Button
                                      onClick={() => handleOpenEdit(item)}
                                      sx={{ color: '#1e3a5f' }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </Button>
                                  </Tooltip>
                                  <Tooltip title="Alocar / mudar localidade" arrow>
                                    <Button
                                      onClick={() => handleOpenLocation(item)}
                                      sx={{ color: '#ff6b35' }}
                                    >
                                      <LocationOnIcon fontSize="small" />
                                    </Button>
                                  </Tooltip>
                                </ButtonGroup>
                              </TableCell>
                            </StyledRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={filteredItems.length}
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
              </Paper>
            </Box>
          </Fade>

          <Suspense fallback={null}>
            {editOpen && (
              <EditDialog
                open={editOpen}
                editData={editItem}
                localidadeSuggestions={localidadeSuggestions}
                viaturas={viaturas}
                onManageViaturas={() => setManageViaturasOpen(true)}
                onSubmit={handleSubmitEdit}
                onCancel={() => {
                  setEditOpen(false);
                  setEditItem(null);
                }}
              />
            )}
            {locationOpen && (
              <LocationDialog
                open={locationOpen}
                item={locationItem}
                suggestions={localidadeSuggestions}
                viaturas={viaturas}
                onManageViaturas={() => setManageViaturasOpen(true)}
                onSubmit={handleSubmitLocation}
                onCancel={() => {
                  setLocationOpen(false);
                  setLocationItem(null);
                }}
              />
            )}
            {manageViaturasOpen && (
              <ViaturasManageDialog
                open={manageViaturasOpen}
                viaturas={viaturas}
                onClose={() => setManageViaturasOpen(false)}
                onViewMateriais={(v) => {
                  setMateriaisInitialViaturaId(v.id);
                  setMateriaisViaturaOpen(true);
                }}
              />
            )}
            {materiaisViaturaOpen && (
              <ViaturasMateriaisDialog
                open={materiaisViaturaOpen}
                viaturas={viaturas}
                initialViaturaId={materiaisInitialViaturaId}
                onClose={() => {
                  setMateriaisViaturaOpen(false);
                  setMateriaisInitialViaturaId(null);
                }}
              />
            )}
            {observacaoOpen && (
              <ObservacaoDialog
                open={observacaoOpen}
                item={observacaoItem}
                onSubmit={handleSubmitObservacao}
                onCancel={() => {
                  setObservacaoOpen(false);
                  setObservacaoItem(null);
                }}
              />
            )}
          </Suspense>

          <Backdrop
            open={importing}
            sx={{
              color: '#fff',
              zIndex: (t) => t.zIndex.modal + 1,
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <CircularProgress color="inherit" />
            <Typography variant="h6" fontWeight={700}>
              Importando planilha...
            </Typography>
            {importProgress.total > 0 && (
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {importProgress.done} de {importProgress.total} linhas processadas
              </Typography>
            )}
          </Backdrop>

          <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert
              onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
              severity={snackbar.severity}
              variant="filled"
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>
      </MenuContext>
    </PrivateRoute>
  );
}
