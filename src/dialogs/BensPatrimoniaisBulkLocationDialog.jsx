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
  Autocomplete,
  TextField,
  CircularProgress,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import SaveIcon from '@mui/icons-material/Save';
import { buildViaturaLabel } from '../firebase/bensViaturasService';

const filterCreatable = (options, params) => {
  const { inputValue } = params;
  const normalized = inputValue.trim().toLowerCase();
  const filtered = options.filter((opt) =>
    String(opt.label || opt).toLowerCase().includes(normalized)
  );
  const isExisting = options.some(
    (opt) => String(opt.label || opt).toLowerCase() === normalized
  );
  if (inputValue !== '' && !isExisting) {
    filtered.push({ inputValue, label: `Criar "${inputValue}"`, isNew: true });
  }
  return filtered;
};

export default function BensPatrimoniaisBulkLocationDialog({
  open,
  items = [],
  suggestions = [],
  viaturas = [],
  onSubmit,
  onCancel,
  onManageViaturas,
}) {
  const [mode, setMode] = useState('livre');
  const [freeValue, setFreeValue] = useState(null);
  const [freeInput, setFreeInput] = useState('');
  const [viaturaValue, setViaturaValue] = useState(null);
  const [saving, setSaving] = useState(false);

  const options = useMemo(() => {
    const looksLikeMoneyOrNumber = (t) => {
      if (!t) return true;
      if (/^R\$/i.test(t)) return true;
      if (/^[\d\s.,]+$/.test(t)) return true;
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(t)) return true;
      return false;
    };
    const unique = Array.from(
      new Set(
        suggestions
          .filter((s) => typeof s === 'string' && s.trim() && !looksLikeMoneyOrNumber(s.trim()))
          .map((s) => s.trim())
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return unique.map((label) => ({ label }));
  }, [suggestions]);

  const viaturaOptions = useMemo(
    () =>
      (viaturas || []).map((v) => ({
        id: v.id,
        label: buildViaturaLabel(v),
        prefixo: v.prefixo,
      })),
    [viaturas]
  );

  useEffect(() => {
    if (!open) return;
    setMode('livre');
    setFreeValue(null);
    setFreeInput('');
    setViaturaValue(null);
    setSaving(false);
  }, [open]);

  const handleConfirm = async () => {
    let finalLoc = '';
    let viaturaInfo = null;

    if (mode === 'viatura') {
      if (!viaturaValue) return;
      finalLoc = `Viatura ${viaturaValue.label}`;
      viaturaInfo = { id: viaturaValue.id, nome: viaturaValue.label };
    } else {
      const typed =
        (freeValue && typeof freeValue === 'object' && (freeValue.inputValue || freeValue.label)) ||
        (typeof freeValue === 'string' ? freeValue : freeInput.trim());
      finalLoc = (typed || '').trim();
      if (!finalLoc) return;
      viaturaInfo = null;
    }

    setSaving(true);
    try {
      await onSubmit(finalLoc, viaturaInfo);
    } finally {
      setSaving(false);
    }
  };

  const canConfirm =
    mode === 'viatura'
      ? Boolean(viaturaValue)
      : Boolean(
          (freeValue && typeof freeValue === 'object' && (freeValue.inputValue || freeValue.label)) ||
            (typeof freeValue === 'string' && freeValue.trim()) ||
            freeInput.trim()
        );

  return (
    <Dialog
      open={open}
      onClose={!saving ? onCancel : undefined}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
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
        <LocationOnIcon sx={{ fontSize: 30 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
            Alocar em Massa
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.85rem' }}>
            {items.length} {items.length === 1 ? 'item selecionado' : 'itens selecionados'}
          </Typography>
        </Box>
        <IconButton
          aria-label="Fechar"
          onClick={onCancel}
          disabled={saving}
          sx={{
            color: 'white',
            backgroundColor: 'rgba(255,255,255,0.12)',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.22)' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          A nova localidade será aplicada a <strong>todos os {items.length} itens</strong> abaixo,
          substituindo a localidade atual de cada um.
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
          >
            Itens selecionados
          </Typography>
          <Box
            sx={{
              border: '1px solid #e0e0e0',
              borderRadius: 2,
              maxHeight: 180,
              overflowY: 'auto',
              backgroundColor: '#fafafa',
            }}
          >
            <List dense disablePadding>
              {items.map((it) => (
                <ListItem key={it.id} divider sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Chip
                          label={it.id_patrimonio || '—'}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            backgroundColor: '#e3f2fd',
                            color: '#1565c0',
                            height: 22,
                          }}
                        />
                        <Typography variant="body2" sx={{ color: '#1e3a5f' }}>
                          {it.descricao || '—'}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      it.localidade ? (
                        <Typography variant="caption" color="text.secondary">
                          Atual: {it.localidade}
                        </Typography>
                      ) : null
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, mb: 1, display: 'block' }}
          >
            Tipo de alocação
          </Typography>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && setMode(v)}
            size="small"
            fullWidth
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 600,
                py: 1,
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(30,58,95,0.08)',
                  color: '#1e3a5f',
                  borderColor: '#1e3a5f',
                },
              },
            }}
          >
            <ToggleButton value="livre">
              <LocationOnIcon sx={{ mr: 1, fontSize: 18 }} />
              Local livre
            </ToggleButton>
            <ToggleButton value="viatura">
              <LocalShippingOutlinedIcon sx={{ mr: 1, fontSize: 18 }} />
              Viatura
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {mode === 'livre' ? (
          <Autocomplete
            value={freeValue}
            onChange={(_, newValue) => {
              if (typeof newValue === 'string') {
                setFreeValue({ label: newValue });
              } else if (newValue && newValue.inputValue) {
                setFreeValue({ label: newValue.inputValue });
              } else {
                setFreeValue(newValue);
              }
            }}
            inputValue={freeInput}
            onInputChange={(_, newInput) => setFreeInput(newInput)}
            options={options}
            getOptionLabel={(opt) => {
              if (!opt) return '';
              if (typeof opt === 'string') return opt;
              return opt.inputValue || opt.label || '';
            }}
            filterOptions={filterCreatable}
            freeSolo
            selectOnFocus
            clearOnBlur={false}
            handleHomeEndKeys
            renderInput={(params) => (
              <TextField
                {...params}
                label="Localidade"
                placeholder="Digite ou selecione (ex.: DEMOP, Guarda, Sala 5)"
                autoFocus
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fafafa' },
                }}
              />
            )}
            renderOption={(props, option) => {
              const { key, ...rest } = props;
              return (
                <li key={key} {...rest}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    {option.isNew ? (
                      <Typography sx={{ color: '#2e7d32', fontWeight: 600 }}>
                        + {option.label}
                      </Typography>
                    ) : (
                      <>
                        <LocationOnIcon sx={{ fontSize: 18, color: '#1e3a5f' }} />
                        <Typography>{option.label}</Typography>
                      </>
                    )}
                  </Box>
                </li>
              );
            }}
          />
        ) : (
          <Box>
            <Autocomplete
              value={viaturaValue}
              onChange={(_, v) => setViaturaValue(v)}
              options={viaturaOptions}
              getOptionLabel={(opt) => (opt && opt.label) || ''}
              isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Selecione a viatura"
                  placeholder={
                    viaturaOptions.length === 0
                      ? 'Nenhuma viatura cadastrada'
                      : 'Escolha uma viatura'
                  }
                  autoFocus
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fafafa' },
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...rest } = props;
                return (
                  <li key={key} {...rest}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <LocalShippingOutlinedIcon sx={{ fontSize: 18, color: '#1e3a5f' }} />
                      <Typography sx={{ fontWeight: 600 }} noWrap>
                        {option.prefixo || option.label}
                      </Typography>
                    </Box>
                  </li>
                );
              }}
            />
            {onManageViaturas && (
              <Button
                onClick={onManageViaturas}
                size="small"
                variant="text"
                startIcon={<LocalShippingOutlinedIcon />}
                sx={{
                  mt: 1,
                  textTransform: 'none',
                  fontWeight: 700,
                  color: '#ff6b35',
                }}
              >
                {viaturaOptions.length === 0 ? 'Cadastrar viaturas' : 'Gerenciar viaturas'}
              </Button>
            )}
            {viaturaValue && (
              <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  Localidade que será aplicada:
                </Typography>
                <Chip
                  size="small"
                  icon={<LocationOnIcon />}
                  label={`Viatura ${viaturaValue.label}`}
                  sx={{ backgroundColor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }}
                />
              </Box>
            )}
          </Box>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          {mode === 'viatura'
            ? 'As viaturas listadas pertencem exclusivamente ao módulo Bens Patrimoniais (não confundir com as viaturas operacionais do DEMOP).'
            : 'Sugestões vêm das localidades já cadastradas neste módulo. Você pode digitar um novo local livremente.'}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0', gap: 1.5 }}>
        <Button
          onClick={onCancel}
          disabled={saving}
          variant="outlined"
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, minHeight: 44, px: 3 }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={saving || !canConfirm}
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            minHeight: 44,
            px: 3,
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #162d4a 0%, #1e3a5f 100%)' },
          }}
        >
          {saving ? 'Salvando...' : `Alocar ${items.length} ${items.length === 1 ? 'item' : 'itens'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
