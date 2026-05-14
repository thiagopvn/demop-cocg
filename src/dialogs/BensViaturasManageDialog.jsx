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
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Chip,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import {
  createBensViatura,
  updateBensViatura,
  deleteBensViatura,
  buildViaturaLabel,
  countBensInViatura,
} from '../firebase/bensViaturasService';

const fieldStyle = {
  '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fafafa' },
};

const EMPTY = { prefixo: '', observacoes: '' };

// Aceita prefixo no formato letra(s)-número(s), ex.: ABT-01, P-23, ASE-1234.
const PREFIXO_REGEX = /^[A-Za-zÀ-ÿ]+-\d+$/;

export default function BensViaturasManageDialog({
  open,
  viaturas = [],
  onClose,
  onViewMateriais,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, label, count }
  const [errors, setErrors] = useState({});
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (!open) {
      setForm(EMPTY);
      setEditingId(null);
      setErrors({});
      setSaving(false);
      setDeletingId(null);
      setConfirmDelete(null);
    }
  }, [open]);

  const sortedViaturas = useMemo(
    () =>
      [...viaturas].sort((a, b) =>
        String(a.prefixo || '').localeCompare(String(b.prefixo || ''), 'pt-BR', { numeric: true })
      ),
    [viaturas]
  );

  const handleChange = (field) => (e) => {
    const v = e.target.value;
    setForm((p) => ({ ...p, [field]: v }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    const prefixo = String(form.prefixo).trim();
    if (!prefixo) {
      e.prefixo = 'Prefixo obrigatório';
    } else if (!PREFIXO_REGEX.test(prefixo)) {
      e.prefixo = 'Formato esperado: LETRA-NÚMERO (ex.: ABT-01)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const startEdit = (v) => {
    setEditingId(v.id);
    setForm({
      prefixo: v.prefixo || '',
      observacoes: v.observacoes || '',
    });
    setErrors({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
    setErrors({});
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateBensViatura(editingId, form);
        setSnack({ open: true, message: 'Viatura atualizada.', severity: 'success' });
      } else {
        await createBensViatura(form);
        setSnack({ open: true, message: 'Viatura cadastrada.', severity: 'success' });
      }
      setForm(EMPTY);
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        message: `Erro ao salvar viatura: ${err.message || 'desconhecido'}`,
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const askDelete = async (v) => {
    const count = await countBensInViatura(v.id);
    setConfirmDelete({ id: v.id, label: buildViaturaLabel(v), count });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await deleteBensViatura(confirmDelete.id);
      setSnack({ open: true, message: 'Viatura excluída.', severity: 'success' });
      if (editingId === confirmDelete.id) cancelEdit();
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        message: `Erro ao excluir: ${err.message || 'desconhecido'}`,
        severity: 'error',
      });
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={!saving ? onClose : undefined}
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
          <LocalShippingOutlinedIcon sx={{ fontSize: 32 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.15rem', lineHeight: 1.2 }}>
              Viaturas dos Bens Patrimoniais
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.8rem' }}>
              Independentes de /viaturas — uso exclusivo deste módulo
            </Typography>
          </Box>
          <IconButton
            aria-label="Fechar"
            onClick={onClose}
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

        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              border: '1px solid #e0e0e0',
              background: '#fafbff',
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1e3a5f', mb: 1.5 }}>
              {editingId ? 'Editar viatura' : 'Nova viatura'}
            </Typography>
            <TextField
              label="Prefixo *"
              value={form.prefixo}
              onChange={handleChange('prefixo')}
              error={!!errors.prefixo}
              helperText={errors.prefixo || 'Formato: LETRA-NÚMERO (ex.: ABT-01, P-23)'}
              placeholder="Ex.: ABT-01"
              fullWidth
              sx={fieldStyle}
            />
            <TextField
              label="Observações"
              value={form.observacoes}
              onChange={handleChange('observacoes')}
              multiline
              minRows={2}
              maxRows={4}
              fullWidth
              sx={{ ...fieldStyle, mt: 2 }}
            />
            <Box sx={{ mt: 2, display: 'flex', gap: 1.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {editingId && (
                <Button
                  onClick={cancelEdit}
                  disabled={saving}
                  variant="outlined"
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Cancelar edição
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={saving}
                variant="contained"
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : editingId ? <SaveIcon /> : <AddIcon />}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #162d4a 0%, #1e3a5f 100%)' },
                }}
              >
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar viatura'}
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Chip
              icon={<LocalShippingOutlinedIcon />}
              label={`${sortedViaturas.length} viatura(s) cadastrada(s)`}
              size="small"
              sx={{ backgroundColor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }}
            />
          </Divider>

          {sortedViaturas.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Nenhuma viatura cadastrada ainda. Use o formulário acima para começar.
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {sortedViaturas.map((v) => {
                const isEditing = editingId === v.id;
                return (
                  <ListItem
                    key={v.id}
                    sx={{
                      mb: 1,
                      borderRadius: 2,
                      border: isEditing ? '2px solid #ff6b35' : '1px solid #e0e0e0',
                      backgroundColor: isEditing ? 'rgba(255,107,53,0.04)' : '#fff',
                      transition: 'all 0.2s',
                      flexWrap: { xs: 'wrap', sm: 'nowrap' },
                      gap: 1,
                    }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {onViewMateriais && (
                          <Tooltip title="Ver materiais alocados" arrow>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => onViewMateriais(v)}
                                sx={{ color: '#1565c0' }}
                              >
                                <VisibilityOutlinedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        <Tooltip title="Editar" arrow>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => startEdit(v)}
                              sx={{ color: '#1e3a5f' }}
                              disabled={saving}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Excluir" arrow>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => askDelete(v)}
                              disabled={deletingId === v.id}
                              sx={{ color: '#d32f2f' }}
                            >
                              {deletingId === v.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <DeleteOutlineIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <LocalShippingOutlinedIcon sx={{ fontSize: 18, color: '#1e3a5f' }} />
                          <Typography fontWeight={700} sx={{ color: '#1e3a5f' }}>
                            {v.prefixo || '—'}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        v.observacoes ? (
                          <Typography variant="caption" color="text.secondary" component="span">
                            {v.observacoes}
                          </Typography>
                        ) : null
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
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

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 360 } } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteOutlineIcon sx={{ color: '#d32f2f' }} />
            <Typography variant="h6" component="span" fontWeight={700}>
              Excluir viatura
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            Confirmar exclusão da viatura <strong>{confirmDelete?.label}</strong>?
          </Typography>
          {confirmDelete?.count > 0 && (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Existem <strong>{confirmDelete.count}</strong> bem(ns) patrimonial(is) alocado(s)
              nesta viatura. Eles permanecerão com a localidade atual, mas perderão a vinculação
              à viatura.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmDelete(null)}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}
