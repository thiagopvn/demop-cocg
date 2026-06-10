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
  Divider,
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
  Autocomplete,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const TEAL_DARK = '#00695c';
const TEAL_MID = '#00897b';

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
  background: `linear-gradient(135deg, ${alpha(TEAL_DARK, 0.08)}, ${alpha(TEAL_DARK, 0.02)})`,
  border: `1px solid ${alpha(TEAL_DARK, 0.18)}`,
}));

const WRAP_SX = {
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  verticalAlign: 'top',
};

const formatValor = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return String(v);
};

const sumValor = (items) => {
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
};

// Filtra entradas claramente ruins (valor monetário, número puro ou data),
// vindas de planilhas com colunas trocadas na importação. Idêntico ao
// helper da tela principal — não deve poluir o seletor.
const looksLikeMoneyOrNumberOrDate = (t) => {
  if (!t) return true;
  if (/^R\$/i.test(t)) return true;
  if (/^[\d\s.,]+$/.test(t)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(t)) return true;
  return false;
};

// Viaturas têm seu próprio dialog. Aqui só queremos localidades "fixas"
// (DEMOP, Guarda, Almoxarifado, etc.). O prefixo "Viatura " é a convenção
// usada pelo Edit/LocationDialog quando aloca em viatura.
const isViaturaLocalidade = (loc) =>
  typeof loc === 'string' && /^viatura\s/i.test(loc.trim());

export default function BensPorLocalidadeDialog({
  open,
  items = [],
  loading = false,
  initialLocalidade = null,
  onClose,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selected, setSelected] = useState(initialLocalidade || '');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Apenas itens "soltos" (sem viatura). Quem está em viatura é vista no
  // dialog "Ver por Viatura"; misturar aqui confunde o operador.
  const itemsSoltos = useMemo(
    () => items.filter((it) => !it.viatura_bens_id),
    [items]
  );

  const localidadeOptions = useMemo(() => {
    const set = new Map(); // localidade -> count
    itemsSoltos.forEach((it) => {
      const raw = typeof it.localidade === 'string' ? it.localidade.trim() : '';
      if (!raw) return;
      if (looksLikeMoneyOrNumberOrDate(raw)) return;
      if (isViaturaLocalidade(raw)) return;
      set.set(raw, (set.get(raw) || 0) + 1);
    });
    return Array.from(set.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { numeric: true }));
  }, [itemsSoltos]);

  const semLocalidade = useMemo(
    () =>
      itemsSoltos.filter((it) => {
        const raw = typeof it.localidade === 'string' ? it.localidade.trim() : '';
        return !raw || looksLikeMoneyOrNumberOrDate(raw);
      }).length,
    [itemsSoltos]
  );

  useEffect(() => {
    if (!open) return;
    const initial =
      initialLocalidade && localidadeOptions.some((o) => o.label === initialLocalidade)
        ? initialLocalidade
        : localidadeOptions[0]?.label || '';
    setSelected(initial);
    setSearch('');
    setPage(0);
  }, [open, initialLocalidade, localidadeOptions]);

  const itemsDaLocalidade = useMemo(() => {
    if (!selected) return [];
    return itemsSoltos.filter(
      (it) => (typeof it.localidade === 'string' ? it.localidade.trim() : '') === selected
    );
  }, [itemsSoltos, selected]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return itemsDaLocalidade;
    return itemsDaLocalidade.filter((it) => {
      const id = String(it.id_patrimonio ?? '').toLowerCase();
      const desc = String(it.descricao ?? '').toLowerCase();
      const aapat = String(it.aapat_processo_sei ?? '').toLowerCase();
      return id.includes(term) || desc.includes(term) || aapat.includes(term);
    });
  }, [itemsDaLocalidade, search]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredItems.slice(start, start + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  const totalQuantidade = useMemo(
    () => itemsDaLocalidade.reduce((acc, it) => acc + (Number(it.quantidade) || 0), 0),
    [itemsDaLocalidade]
  );

  const totalValor = useMemo(() => sumValor(itemsDaLocalidade), [itemsDaLocalidade]);

  const selectedOption = useMemo(
    () => localidadeOptions.find((o) => o.label === selected) || null,
    [localidadeOptions, selected]
  );

  return (
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
          background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL_MID} 100%)`,
          color: 'white',
          py: 2.5,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <PlaceOutlinedIcon sx={{ fontSize: 32 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.15rem', lineHeight: 1.2 }}>
            Materiais por Localidade
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.85rem' }}>
            Bens patrimoniais agrupados por local fixo (fora de viatura)
          </Typography>
        </Box>
        <IconButton
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
        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <CircularProgress sx={{ color: TEAL_DARK }} />
          </Box>
        ) : localidadeOptions.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <PlaceOutlinedIcon sx={{ fontSize: 56, color: '#cfd8dc', mb: 1 }} />
            <Typography color="text.secondary" fontWeight={600}>
              Nenhuma localidade cadastrada ainda.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Localidades aparecem aqui quando você atribui um local
              (ex.: DEMOP, Guarda, Almoxarifado) a um bem patrimonial.
            </Typography>
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { sm: 'center' },
                mt: 1,
              }}
            >
              <Autocomplete
                options={localidadeOptions}
                value={selectedOption}
                onChange={(_, v) => {
                  setSelected(v?.label || '');
                  setPage(0);
                }}
                getOptionLabel={(opt) => (opt && opt.label) || ''}
                isOptionEqualToValue={(opt, val) => opt?.label === val?.label}
                disableClearable
                sx={{ flex: 1, minWidth: 240 }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Selecionar localidade"
                    placeholder="Escolha uma localidade"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'background.paper',
                      },
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  return (
                    <li key={key} {...rest}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          width: '100%',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                          <PlaceOutlinedIcon sx={{ fontSize: 18, color: TEAL_DARK }} />
                          <Typography sx={{ fontWeight: 600 }} noWrap>
                            {option.label}
                          </Typography>
                        </Box>
                        <Chip
                          label={option.count}
                          size="small"
                          sx={{
                            backgroundColor: alpha(TEAL_DARK, 0.1),
                            color: TEAL_DARK,
                            fontWeight: 700,
                            height: 22,
                            minWidth: 32,
                          }}
                        />
                      </Box>
                    </li>
                  );
                }}
              />
              <TextField
                placeholder="Buscar por patrimônio, descrição ou AAPat..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: TEAL_DARK }} />
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
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'background.paper',
                  },
                }}
              />
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
              <StatCard>
                <Typography variant="caption" sx={{ color: TEAL_DARK, fontWeight: 600 }}>
                  Itens distintos
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: TEAL_DARK }}>
                  {itemsDaLocalidade.length.toLocaleString('pt-BR')}
                </Typography>
              </StatCard>
              <StatCard>
                <Typography variant="caption" sx={{ color: TEAL_DARK, fontWeight: 600 }}>
                  Quantidade total
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: TEAL_DARK }}>
                  {totalQuantidade.toLocaleString('pt-BR')}
                </Typography>
              </StatCard>
              <StatCard>
                <Typography variant="caption" sx={{ color: TEAL_DARK, fontWeight: 600 }}>
                  Valor estimado
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: TEAL_DARK }}>
                  {totalValor.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </Typography>
              </StatCard>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {selectedOption && (
              <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  icon={<LocationOnIcon />}
                  label={selectedOption.label}
                  sx={{ backgroundColor: alpha(TEAL_DARK, 0.1), color: TEAL_DARK, fontWeight: 700 }}
                />
                {semLocalidade > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    ({semLocalidade.toLocaleString('pt-BR')} bens sem localidade definida não
                    aparecem aqui)
                  </Typography>
                )}
              </Box>
            )}

            <Box
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid #e0e0e0',
                backgroundColor: 'background.paper',
              }}
            >
              <TableContainer sx={{ maxHeight: { xs: '50vh', md: '50vh' } }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow
                      sx={{
                        '& th': {
                          background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL_MID} 100%)`,
                        },
                      }}
                    >
                      <HeaderCell>Patrimônio</HeaderCell>
                      <HeaderCell>Descrição</HeaderCell>
                      <HeaderCell align="center">Qtd</HeaderCell>
                      <HeaderCell>Valor</HeaderCell>
                      <HeaderCell>AAPat / SEI</HeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                          <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            {itemsDaLocalidade.length === 0
                              ? 'Nenhum bem cadastrado nesta localidade.'
                              : 'Nenhum resultado para a busca.'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((it) => (
                        <TableRow key={it.id} hover>
                          <TableCell sx={{ ...WRAP_SX, fontWeight: 700, color: TEAL_DARK }}>
                            {it.id_patrimonio || '—'}
                          </TableCell>
                          <TableCell sx={{ ...WRAP_SX, minWidth: 220 }}>
                            {it.descricao || '—'}
                          </TableCell>
                          <TableCell align="center" sx={WRAP_SX}>
                            {it.quantidade ?? 1}
                          </TableCell>
                          <TableCell sx={WRAP_SX}>{formatValor(it.valor)}</TableCell>
                          <TableCell sx={WRAP_SX}>{it.aapat_processo_sei || '—'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filteredItems.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100, 500]}
                labelRowsPerPage="Itens por página:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
              />
            </Box>
          </>
        )}
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
  );
}
