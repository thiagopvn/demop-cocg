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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SaveIcon from '@mui/icons-material/Save';

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

export default function BensPatrimoniaisLocationDialog({
  open,
  item,
  suggestions = [],
  onSubmit,
  onCancel,
}) {
  const [value, setValue] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);

  const options = useMemo(() => {
    const unique = Array.from(
      new Set(suggestions.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()))
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return unique.map((label) => ({ label }));
  }, [suggestions]);

  useEffect(() => {
    if (open) {
      const current = item?.localidade ? String(item.localidade) : '';
      setValue(current ? { label: current } : null);
      setInputValue(current);
      setSaving(false);
    }
  }, [open, item]);

  const handleConfirm = async () => {
    const newLocalidade =
      (value && typeof value === 'object' && (value.inputValue || value.label)) ||
      (typeof value === 'string' ? value : inputValue.trim());

    const finalValue = (newLocalidade || '').trim();
    if (finalValue === (item?.localidade || '').trim()) {
      onCancel();
      return;
    }

    setSaving(true);
    try {
      await onSubmit(finalValue);
    } finally {
      setSaving(false);
    }
  };

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
            Alocar Bem Patrimonial
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.85rem' }}>
            Patrimônio nº {item?.id_patrimonio ?? '—'}
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
        <Box sx={{ mt: 1, mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Descrição
          </Typography>
          <Typography variant="body1" fontWeight={600} sx={{ color: '#1e3a5f' }}>
            {item?.descricao || '—'}
          </Typography>
          {item?.localidade && (
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Atual:
              </Typography>
              <Chip
                label={item.localidade}
                size="small"
                sx={{ fontWeight: 600, backgroundColor: '#e3f2fd', color: '#1565c0' }}
              />
            </Box>
          )}
        </Box>

        <Autocomplete
          value={value}
          onChange={(_, newValue) => {
            if (typeof newValue === 'string') {
              setValue({ label: newValue });
            } else if (newValue && newValue.inputValue) {
              setValue({ label: newValue.inputValue });
            } else {
              setValue(newValue);
            }
          }}
          inputValue={inputValue}
          onInputChange={(_, newInput) => setInputValue(newInput)}
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
              label="Nova localidade"
              placeholder="Digite ou selecione (ex.: Demop, Guarda, Viatura X)"
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

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          Sugestões vêm das localidades já cadastradas neste módulo. Você pode digitar um novo
          local livremente.
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
          disabled={saving}
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
          {saving ? 'Salvando...' : 'Salvar Alocação'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
