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
  Stack,
  Card,
  alpha,
  styled,
  TextField,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import SearchIcon from '@mui/icons-material/Search';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { subscribeBensByViatura, buildViaturaLabel } from '../firebase/bensViaturasService';

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
  minWidth: 130,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)}, ${alpha(
    theme.palette.primary.main,
    0.02
  )})`,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
}));

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

export default function BensViaturasMateriaisDialog({
  open,
  viaturas = [],
  initialViaturaId = null,
  onClose,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedId, setSelectedId] = useState(initialViaturaId || '');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const viaturaOptions = useMemo(
    () =>
      [...viaturas]
        .sort((a, b) =>
          String(a.prefixo || '').localeCompare(String(b.prefixo || ''), 'pt-BR', { numeric: true })
        )
        .map((v) => ({
          id: v.id,
          label: buildViaturaLabel(v),
          prefixo: v.prefixo,
          placa: v.placa,
          modelo: v.modelo,
        })),
    [viaturas]
  );

  useEffect(() => {
    if (!open) return;
    setSelectedId(initialViaturaId || (viaturaOptions[0]?.id ?? ''));
    setSearch('');
  }, [open, initialViaturaId, viaturaOptions]);

  useEffect(() => {
    if (!open || !selectedId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const unsub = subscribeBensByViatura(
      selectedId,
      (data) => {
        setItems(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [open, selectedId]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) => {
      const id = String(it.id_patrimonio ?? '').toLowerCase();
      const desc = String(it.descricao ?? '').toLowerCase();
      return id.includes(term) || desc.includes(term);
    });
  }, [items, search]);

  const totalValor = useMemo(() => sumValor(items), [items]);
  const totalQuantidade = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.quantidade) || 0), 0),
    [items]
  );

  const selectedViatura = useMemo(
    () => viaturaOptions.find((v) => v.id === selectedId) || null,
    [viaturaOptions, selectedId]
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
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
          color: 'white',
          py: 2.5,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <InventoryIcon sx={{ fontSize: 30 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.15rem', lineHeight: 1.2 }}>
            Materiais por Viatura
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.8rem' }}>
            Bens patrimoniais alocados em cada viatura do módulo
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

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        {viaturaOptions.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <LocalShippingOutlinedIcon sx={{ fontSize: 56, color: '#cfd8dc', mb: 1 }} />
            <Typography color="text.secondary" fontWeight={600}>
              Nenhuma viatura cadastrada neste módulo.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Cadastre uma viatura em "Viaturas" antes de visualizar os materiais.
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
                options={viaturaOptions}
                value={selectedViatura}
                onChange={(_, v) => setSelectedId(v?.id || '')}
                getOptionLabel={(opt) => (opt && opt.label) || ''}
                isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
                disableClearable
                sx={{ flex: 1, minWidth: 240 }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Selecionar viatura"
                    placeholder="Escolha uma viatura"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#fafafa',
                      },
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  return (
                    <li key={key} {...rest}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <LocalShippingOutlinedIcon sx={{ fontSize: 18, color: '#1e3a5f' }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 600 }} noWrap>
                            {option.prefixo || option.label}
                          </Typography>
                          {(option.placa || option.modelo) && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {[option.placa, option.modelo].filter(Boolean).join(' • ')}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </li>
                  );
                }}
              />
              <TextField
                placeholder="Buscar por patrimônio ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#1e3a5f' }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: '#fafafa',
                  },
                }}
              />
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ mt: 2 }}
            >
              <StatCard>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Itens distintos
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#1e3a5f' }}>
                  {items.length.toLocaleString('pt-BR')}
                </Typography>
              </StatCard>
              <StatCard>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Quantidade total
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#1e3a5f' }}>
                  {totalQuantidade.toLocaleString('pt-BR')}
                </Typography>
              </StatCard>
              <StatCard>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Valor estimado
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#1e3a5f' }}>
                  {totalValor.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </Typography>
              </StatCard>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {selectedViatura && (
              <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  icon={<LocalShippingOutlinedIcon />}
                  label={selectedViatura.label}
                  sx={{ backgroundColor: '#e3f2fd', color: '#1565c0', fontWeight: 700 }}
                />
                {selectedViatura.modelo && (
                  <Typography variant="caption" color="text.secondary">
                    {selectedViatura.modelo}
                  </Typography>
                )}
              </Box>
            )}

            <TableContainer
              sx={{
                borderRadius: 2,
                border: '1px solid #e0e0e0',
                maxHeight: { xs: '50vh', md: '55vh' },
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow
                    sx={{
                      '& th': {
                        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
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
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          {items.length === 0
                            ? 'Nenhum bem alocado nesta viatura.'
                            : 'Nenhum resultado para a busca.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((it) => (
                      <TableRow key={it.id} hover>
                        <TableCell sx={{ fontWeight: 700, color: '#1e3a5f' }}>
                          {it.id_patrimonio || '—'}
                        </TableCell>
                        <TableCell sx={{ minWidth: 220 }}>{it.descricao || '—'}</TableCell>
                        <TableCell align="center">{it.quantidade ?? 1}</TableCell>
                        <TableCell>{formatValor(it.valor)}</TableCell>
                        <TableCell>{it.aapat_processo_sei || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
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
