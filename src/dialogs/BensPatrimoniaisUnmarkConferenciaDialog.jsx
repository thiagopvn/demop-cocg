import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RemoveDoneIcon from '@mui/icons-material/RemoveDone';
import EventIcon from '@mui/icons-material/Event';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

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

const formatDateTimeBR = (date) =>
  date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function BensPatrimoniaisUnmarkConferenciaDialog({
  open,
  item,
  onConfirm,
  onCancel,
}) {
  const [submitting, setSubmitting] = useState(false);
  const lastDate = formatDateBR(item?.ultima_conferencia);
  const anterior = item?.conferencia_anterior || null;
  const anteriorDate = anterior ? formatDateBR(anterior.ultima_conferencia) : null;
  const hasAnterior = Boolean(anteriorDate);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={!submitting ? onCancel : undefined}
      maxWidth="xs"
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
          background: 'linear-gradient(135deg, #b71c1c 0%, #d32f2f 100%)',
          color: 'white',
          py: 2.5,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <RemoveDoneIcon sx={{ fontSize: 28 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
            Desfazer conferência
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.8rem' }}>
            Patrimônio nº {item?.id_patrimonio ?? '—'}
          </Typography>
        </Box>
        <IconButton
          aria-label="Fechar"
          onClick={onCancel}
          disabled={submitting}
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
        <Alert
          icon={<WarningAmberIcon />}
          severity="warning"
          sx={{ mb: 2, borderRadius: 2, fontWeight: 500 }}
        >
          {hasAnterior ? (
            <>
              O item voltará para a <strong>conferência anterior</strong>
              {' '}({formatDateTimeBR(anteriorDate)}
              {anterior?.conferido_por ? ` por ${anterior.conferido_por}` : ''}). O registro abaixo
              será descartado.
            </>
          ) : (
            <>
              Este item não tem conferência anterior — voltará para o estado{' '}
              <strong>"Nunca conferido"</strong> (chip vermelho).
            </>
          )}
        </Alert>

        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Descrição
          </Typography>
          <Typography variant="body1" fontWeight={600} sx={{ color: '#1e3a5f', mb: 1.5 }}>
            {item?.descricao || '—'}
          </Typography>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, my: 1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, mb: 0.5 }}
          >
            Conferência que será removida
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventIcon sx={{ color: '#1e3a5f', fontSize: 20 }} />
            <Chip
              size="small"
              label={lastDate ? formatDateTimeBR(lastDate) : 'Sem data registrada'}
              sx={{
                fontWeight: 600,
                backgroundColor: 'surface.blue',
                color: 'surface.blueText',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonOutlineIcon sx={{ color: '#1e3a5f', fontSize: 20 }} />
            <Chip
              size="small"
              label={item?.conferido_por || 'Sem identificação'}
              sx={{
                fontWeight: 600,
                backgroundColor: 'background.default',
                color: '#424242',
                fontStyle: item?.conferido_por ? 'normal' : 'italic',
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0', gap: 1.5 }}>
        <Button
          onClick={onCancel}
          disabled={submitting}
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
          onClick={handleConfirm}
          disabled={submitting}
          variant="contained"
          color="error"
          startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <RemoveDoneIcon />}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            minHeight: 44,
            px: 3,
            background: 'linear-gradient(135deg, #b71c1c 0%, #d32f2f 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #8e0000 0%, #b71c1c 100%)' },
          }}
        >
          {submitting ? 'Desfazendo...' : 'Desfazer conferência'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
