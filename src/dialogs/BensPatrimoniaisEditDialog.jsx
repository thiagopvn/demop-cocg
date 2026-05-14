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
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SaveIcon from '@mui/icons-material/Save';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const EMPTY = {
  id_patrimonio: '',
  descricao: '',
  quantidade: 1,
  valor: '',
  localidade: '',
  aapat_processo_sei: '',
  observacoes: '',
};

const fieldStyle = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: '#ffffff',
  },
};

export default function BensPatrimoniaisEditDialog({ open, editData, onSubmit, onCancel }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [data, setData] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setData(
        editData
          ? {
              id_patrimonio: editData.id_patrimonio ?? '',
              descricao: editData.descricao ?? '',
              quantidade: editData.quantidade ?? 1,
              valor: editData.valor ?? '',
              localidade: editData.localidade ?? '',
              aapat_processo_sei: editData.aapat_processo_sei ?? '',
              observacoes: editData.observacoes ?? '',
            }
          : EMPTY
      );
      setErrors({});
      setSaving(false);
    }
  }, [open, editData]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!String(data.id_patrimonio).trim()) e.id_patrimonio = 'Obrigatório';
    if (!String(data.descricao).trim()) e.descricao = 'Obrigatório';
    const qtd = Number(data.quantidade);
    if (!Number.isFinite(qtd) || qtd < 0) e.quantidade = 'Quantidade inválida';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({
        ...data,
        quantidade: Number(data.quantidade) || 0,
      });
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!editData?.id;

  return (
    <Dialog
      open={open}
      onClose={!saving ? onCancel : undefined}
      maxWidth="md"
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
        <AccountBalanceIcon sx={{ fontSize: 32 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.15rem', lineHeight: 1.2 }}>
            {isEdit ? 'Editar Bem Patrimonial' : 'Novo Bem Patrimonial'}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.85rem' }}>
            {isEdit ? `Patrimônio nº ${editData.id_patrimonio || '—'}` : 'Cadastro manual'}
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

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, mt: 0 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
            gap: 2,
            mt: 2,
          }}
        >
          <TextField
            label="Nº Patrimônio"
            value={data.id_patrimonio}
            onChange={handleChange('id_patrimonio')}
            error={!!errors.id_patrimonio}
            helperText={errors.id_patrimonio}
            sx={fieldStyle}
            autoFocus={!isEdit}
          />
          <TextField
            label="Quantidade"
            type="number"
            value={data.quantidade}
            onChange={handleChange('quantidade')}
            error={!!errors.quantidade}
            helperText={errors.quantidade}
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
            sx={fieldStyle}
          />
          <TextField
            label="Valor"
            value={data.valor}
            onChange={handleChange('valor')}
            placeholder="R$ 0,00"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>R$</Typography>
                  </InputAdornment>
                ),
              },
            }}
            sx={fieldStyle}
          />
        </Box>

        <TextField
          label="Descrição"
          value={data.descricao}
          onChange={handleChange('descricao')}
          error={!!errors.descricao}
          helperText={errors.descricao}
          multiline
          minRows={2}
          maxRows={4}
          fullWidth
          sx={{ ...fieldStyle, mt: 2 }}
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
            mt: 2,
          }}
        >
          <TextField
            label="Localidade"
            value={data.localidade}
            onChange={handleChange('localidade')}
            placeholder="Ex.: Demop, Guarda, Viatura ABC-1234"
            sx={fieldStyle}
          />
          <TextField
            label="AAPat e Processo SEI"
            value={data.aapat_processo_sei}
            onChange={handleChange('aapat_processo_sei')}
            placeholder="Ex.: AAPat 1234 / SEI-XXXX.XXXXXXX/XXXX-XX"
            sx={fieldStyle}
          />
        </Box>

        <TextField
          label="Observações"
          value={data.observacoes}
          onChange={handleChange('observacoes')}
          multiline
          minRows={3}
          maxRows={8}
          fullWidth
          sx={{ ...fieldStyle, mt: 2 }}
        />
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
          onClick={handleSubmit}
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
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
