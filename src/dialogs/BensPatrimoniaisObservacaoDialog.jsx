import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const MAX_CHARS = 4000;

export default function BensPatrimoniaisObservacaoDialog({
  open,
  item,
  onSubmit,
  onCancel,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(item?.observacoes ?? '');
      setSaving(false);
    }
  }, [open, item]);

  const original = item?.observacoes ?? '';
  const hasChanges = value !== original;
  const overLimit = value.length > MAX_CHARS;

  const handleSubmit = async () => {
    if (overLimit) return;
    setSaving(true);
    try {
      await onSubmit(value);
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
          background: 'linear-gradient(135deg, #f9a825 0%, #ff6b35 100%)',
          color: 'white',
          py: 2.5,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <StickyNote2OutlinedIcon sx={{ fontSize: 30 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ fontSize: '1.1rem', lineHeight: 1.2 }}
          >
            Observação
          </Typography>
          <Typography
            variant="caption"
            sx={{
              opacity: 0.92,
              fontSize: '0.82rem',
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item?.id_patrimonio ? `Patrimônio nº ${item.id_patrimonio}` : '—'}
            {item?.descricao ? ` · ${item.descricao}` : ''}
          </Typography>
        </Box>
        <IconButton
          aria-label="Fechar"
          onClick={onCancel}
          disabled={saving}
          sx={{
            color: 'white',
            backgroundColor: 'rgba(255,255,255,0.15)',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 2.5, sm: 3 } }}>
        <Box sx={{ mt: 1 }}>
          <TextField
            value={value}
            onChange={(e) => setValue(e.target.value)}
            multiline
            minRows={10}
            maxRows={isMobile ? 18 : 14}
            fullWidth
            autoFocus
            placeholder="Escreva qualquer observação sobre este bem. Use Enter para quebrar a linha."
            error={overLimit}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                backgroundColor: 'surface.amber',
                fontFamily: 'inherit',
                lineHeight: 1.55,
                alignItems: 'flex-start',
                '& fieldset': { borderColor: '#f9a825' },
                '&:hover fieldset': { borderColor: '#f57f17' },
                '&.Mui-focused fieldset': { borderColor: '#ff6b35', borderWidth: 2 },
              },
              '& textarea': {
                resize: 'vertical',
              },
            }}
          />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 1,
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Dica: <strong>Enter</strong> insere uma nova linha; o texto é exibido
              na tabela preservando a formatação.
            </Typography>
            <Chip
              size="small"
              label={`${value.length.toLocaleString('pt-BR')} / ${MAX_CHARS.toLocaleString('pt-BR')}`}
              sx={{
                fontWeight: 600,
                backgroundColor: overLimit ? '#ffebee' : '#fff8e1',
                color: overLimit ? '#b71c1c' : '#8d6e00',
                border: '1px solid',
                borderColor: overLimit ? '#ef9a9a' : '#ffe082',
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid #e0e0e0',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        {value && (
          <Button
            onClick={() => setValue('')}
            disabled={saving}
            variant="text"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              color: 'text.secondary',
              mr: 'auto',
            }}
          >
            Limpar
          </Button>
        )}
        <Button
          onClick={onCancel}
          disabled={saving}
          variant="outlined"
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 44,
            px: 3,
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving || !hasChanges || overLimit}
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            minHeight: 44,
            px: 3,
            background: 'linear-gradient(135deg, #f9a825 0%, #ff6b35 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #f57f17 0%, #e85a26 100%)',
            },
          }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
