import { useEffect, useMemo, useState } from 'react';
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
  Autocomplete,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SaveIcon from '@mui/icons-material/Save';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
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

const EMPTY = {
  id_patrimonio: '',
  descricao: '',
  quantidade: 1,
  valor: '',
  localidade: '',
  aapat_processo_sei: '',
  observacoes: '',
  viatura_bens_id: '',
  viatura_bens_nome: '',
};

const fieldStyle = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: '#ffffff',
  },
};

export default function BensPatrimoniaisEditDialog({
  open,
  editData,
  localidadeSuggestions = [],
  viaturas = [],
  onSubmit,
  onCancel,
  onManageViaturas,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [data, setData] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [localidadeInput, setLocalidadeInput] = useState('');

  const viaturaOptions = useMemo(
    () =>
      (viaturas || []).map((v) => ({
        id: v.id,
        label: buildViaturaLabel(v),
        prefixo: v.prefixo,
      })),
    [viaturas]
  );

  const selectedViatura = useMemo(() => {
    if (!data.viatura_bens_id) return null;
    return (
      viaturaOptions.find((v) => v.id === data.viatura_bens_id) || {
        id: data.viatura_bens_id,
        label: data.viatura_bens_nome || 'Viatura',
      }
    );
  }, [data.viatura_bens_id, data.viatura_bens_nome, viaturaOptions]);

  const localidadeOptions = useMemo(() => {
    const looksLikeMoneyOrNumber = (t) => {
      if (!t) return true;
      if (/^R\$/i.test(t)) return true;
      if (/^[\d\s.,]+$/.test(t)) return true;
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(t)) return true;
      return false;
    };
    const unique = Array.from(
      new Set(
        localidadeSuggestions
          .filter((s) => typeof s === 'string' && s.trim() && !looksLikeMoneyOrNumber(s.trim()))
          .map((s) => s.trim())
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return unique.map((label) => ({ label }));
  }, [localidadeSuggestions]);

  useEffect(() => {
    if (open) {
      const initial = editData
        ? {
            id_patrimonio: editData.id_patrimonio ?? '',
            descricao: editData.descricao ?? '',
            quantidade: editData.quantidade ?? 1,
            valor: editData.valor ?? '',
            localidade: editData.localidade ?? '',
            aapat_processo_sei: editData.aapat_processo_sei ?? '',
            observacoes: editData.observacoes ?? '',
            viatura_bens_id: editData.viatura_bens_id || '',
            viatura_bens_nome: editData.viatura_bens_nome || '',
          }
        : EMPTY;
      setData(initial);
      setLocalidadeInput(initial.localidade || '');
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

  const handleViaturaChange = (_, newValue) => {
    if (!newValue) {
      setData((prev) => ({ ...prev, viatura_bens_id: '', viatura_bens_nome: '' }));
      return;
    }
    const label = newValue.label || '';
    setData((prev) => ({
      ...prev,
      viatura_bens_id: newValue.id || '',
      viatura_bens_nome: label,
      // Quando uma viatura é escolhida, ela vira a localidade efetiva.
      localidade: label ? `Viatura ${label}` : prev.localidade,
    }));
    if (label) setLocalidadeInput(`Viatura ${label}`);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    // Pega o que estiver digitado no Autocomplete de localidade caso não
    // tenha sido confirmado via blur/seleção
    const typedLocalidade = localidadeInput.trim();
    const finalLocalidade = typedLocalidade || (data.localidade || '').trim();
    setSaving(true);
    try {
      await onSubmit({
        ...data,
        localidade: finalLocalidade,
        quantidade: Number(data.quantidade) || 0,
        viatura_bens_id: data.viatura_bens_id || null,
        viatura_bens_nome: data.viatura_bens_nome || '',
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
            mt: 2,
            p: 2,
            borderRadius: 2,
            border: '1px dashed #c5cae9',
            background: 'linear-gradient(135deg, rgba(30,58,95,0.03) 0%, rgba(255,107,53,0.03) 100%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LocalShippingOutlinedIcon sx={{ color: '#1e3a5f' }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1e3a5f', flex: 1 }}>
              Alocação em Viatura (opcional)
            </Typography>
            {onManageViaturas && (
              <Button
                onClick={onManageViaturas}
                size="small"
                variant="text"
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  color: '#ff6b35',
                  '&:hover': { backgroundColor: 'rgba(255,107,53,0.08)' },
                }}
              >
                Gerenciar viaturas
              </Button>
            )}
          </Box>
          <Autocomplete
            options={viaturaOptions}
            value={selectedViatura}
            onChange={handleViaturaChange}
            getOptionLabel={(opt) => (opt && opt.label) || ''}
            isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Viatura (exclusiva dos Bens)"
                placeholder={
                  viaturaOptions.length === 0
                    ? 'Nenhuma viatura cadastrada — clique em "Gerenciar viaturas"'
                    : 'Selecione uma viatura cadastrada'
                }
                sx={fieldStyle}
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
            clearOnBlur
            sx={{ width: '100%' }}
          />
          {selectedViatura && (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary">
                Localidade aplicada:
              </Typography>
              <Chip
                size="small"
                icon={<LocationOnIcon />}
                label={`Viatura ${selectedViatura.label}`}
                sx={{ backgroundColor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }}
              />
            </Box>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Estas viaturas são <strong>independentes</strong> das viaturas operacionais do DEMOP
            (rota /viaturas). Servem apenas como local de alocação dos bens.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
            mt: 2,
          }}
        >
          <Autocomplete
            options={localidadeOptions}
            value={data.localidade ? { label: data.localidade } : null}
            inputValue={localidadeInput}
            onInputChange={(_, newInput) => setLocalidadeInput(newInput)}
            onChange={(_, newValue) => {
              const next =
                typeof newValue === 'string'
                  ? newValue
                  : newValue?.inputValue || newValue?.label || '';
              setData((prev) => ({ ...prev, localidade: next }));
              setLocalidadeInput(next);
            }}
            onBlur={() => {
              // Permite usar texto digitado mesmo sem selecionar da lista
              const typed = localidadeInput.trim();
              if (typed && typed !== data.localidade) {
                setData((prev) => ({ ...prev, localidade: typed }));
              }
            }}
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
                placeholder="Digite ou selecione (ex.: Demop, Guarda, Viatura ABC-1234)"
                sx={fieldStyle}
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
