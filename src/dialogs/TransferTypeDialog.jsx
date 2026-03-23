import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Alert,
  AlertTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActionArea,
  Divider,
  CircularProgress,
  alpha,
  Grow,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  SwapHoriz as TransferIcon,
  Output as OutputIcon,
  Build as RepairIcon,
  DirectionsCar as CarIcon,
  ShoppingCart as ConsumoIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import db from '../firebase/db';
import UserSearch from '../components/UserSearch';
import { transferMovimentacao } from '../services/movimentacaoService';

export default function TransferTypeDialog({
  open,
  onClose,
  movimentacao,
  onTransferComplete,
  currentUserId,
  currentUserName,
}) {
  const [step, setStep] = useState(0);
  const [newType, setNewType] = useState('');
  const [subtype, setSubtype] = useState('');
  const [viaturas, setViaturas] = useState([]);
  const [selectedViatura, setSelectedViatura] = useState(null);
  const [responsavel, setResponsavel] = useState(null);
  const [userCritery, setUserCritery] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [repairLocation, setRepairLocation] = useState('');
  const [seiNumber, setSeiNumber] = useState('');
  const [motivoReparo, setMotivoReparo] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setStep(0);
      setNewType('');
      setSubtype('');
      setSelectedViatura(null);
      setResponsavel(null);
      setUserCritery('');
      setObservacoes('');
      setRepairLocation('');
      setSeiNumber('');
      setMotivoReparo('');
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (open && newType === 'saída' && subtype === 'viatura' && viaturas.length === 0) {
      const fetchViaturas = async () => {
        setLoading(true);
        try {
          const snap = await getDocs(
            query(collection(db, 'viaturas'), orderBy('prefixo'))
          );
          setViaturas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
          console.error('Erro ao buscar viaturas:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchViaturas();
    }
  }, [open, newType, subtype, viaturas.length]);

  const handleSelectType = (type) => {
    setNewType(type);
    setSubtype('');
    setSelectedViatura(null);
    setStep(1);
  };

  const handleSelectSubtype = (st) => {
    setSubtype(st);
    setSelectedViatura(null);
    setStep(2);
  };

  const canConfirm = () => {
    if (newType === 'saída') {
      if (subtype === 'viatura') return selectedViatura && responsavel;
      if (subtype === 'consumo') return responsavel;
    }
    if (newType === 'reparo') return repairLocation && seiNumber && motivoReparo;
    return false;
  };

  const handleConfirm = async () => {
    if (!canConfirm()) return;
    setSaving(true);
    setError('');
    try {
      await transferMovimentacao({
        movimentacao,
        newType,
        subtype,
        viatura: selectedViatura,
        responsavel,
        observacoes,
        repairData: newType === 'reparo' ? { repairLocation, seiNumber, motivoReparo } : null,
        transferidoPor: currentUserId,
        transferidoPorNome: currentUserName,
      });
      onTransferComplete?.();
      onClose();
    } catch (err) {
      console.error('Erro ao transferir:', err);
      setError(err.message || 'Erro ao transferir movimentação.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString('pt-BR');
    return date;
  };

  const steps = newType === 'saída'
    ? ['Tipo', 'Subtipo', 'Detalhes', 'Confirmar']
    : ['Tipo', 'Detalhes', 'Confirmar'];

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Grow}
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
          px: 3,
          py: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <TransferIcon sx={{ color: 'white', fontSize: 28 }} />
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
            Transferir Tipo de Movimentação
          </Typography>
        </Box>
        <Stepper
          activeStep={step}
          alternativeLabel
          sx={{
            mt: 2,
            '& .MuiStepLabel-label': { color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' },
            '& .MuiStepLabel-label.Mui-active': { color: 'white' },
            '& .MuiStepLabel-label.Mui-completed': { color: 'rgba(255,255,255,0.8)' },
            '& .MuiStepIcon-root': { color: 'rgba(255,255,255,0.3)' },
            '& .MuiStepIcon-root.Mui-active': { color: 'white' },
            '& .MuiStepIcon-root.Mui-completed': { color: '#a5f3fc' },
            '& .MuiStepConnector-line': { borderColor: 'rgba(255,255,255,0.3)' },
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Info da movimentação atual */}
        {movimentacao && (
          <Card variant="outlined" sx={{ mb: 3, borderRadius: 2, backgroundColor: alpha('#f8fafc', 0.5) }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Movimentação Atual
              </Typography>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 0.5 }}>
                {movimentacao.material_description}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <Chip label={`Tipo: ${movimentacao.type}`} size="small" color="primary" variant="outlined" />
                <Chip label={`Qtd: ${movimentacao.quantity}`} size="small" color="info" />
                <Chip label={formatDate(movimentacao.date)} size="small" variant="outlined" />
                {movimentacao.user_name && (
                  <Chip icon={<PersonIcon />} label={movimentacao.user_name} size="small" variant="outlined" />
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Step 0: Selecionar novo tipo */}
        {step === 0 && (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Selecione o novo tipo:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Card
                variant="outlined"
                sx={{
                  flex: 1,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '2px solid',
                  borderColor: newType === 'saída' ? 'warning.main' : 'divider',
                  '&:hover': { borderColor: 'warning.main', transform: 'translateY(-2px)', boxShadow: 3 },
                }}
              >
                <CardActionArea onClick={() => handleSelectType('saída')} sx={{ p: 3, textAlign: 'center' }}>
                  <OutputIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
                  <Typography variant="h6" fontWeight={600}>Saída</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Consumo ou para viatura
                  </Typography>
                </CardActionArea>
              </Card>
              <Card
                variant="outlined"
                sx={{
                  flex: 1,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '2px solid',
                  borderColor: newType === 'reparo' ? 'error.main' : 'divider',
                  '&:hover': { borderColor: 'error.main', transform: 'translateY(-2px)', boxShadow: 3 },
                }}
              >
                <CardActionArea onClick={() => handleSelectType('reparo')} sx={{ p: 3, textAlign: 'center' }}>
                  <RepairIcon sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
                  <Typography variant="h6" fontWeight={600}>Reparo</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Material inoperante
                  </Typography>
                </CardActionArea>
              </Card>
            </Box>
          </Box>
        )}

        {/* Step 1 for saída: Selecionar subtipo */}
        {step === 1 && newType === 'saída' && (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Tipo de saída:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Card
                variant="outlined"
                sx={{
                  flex: 1,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '2px solid',
                  borderColor: subtype === 'consumo' ? 'secondary.main' : 'divider',
                  '&:hover': { borderColor: 'secondary.main', transform: 'translateY(-2px)', boxShadow: 3 },
                }}
              >
                <CardActionArea onClick={() => handleSelectSubtype('consumo')} sx={{ p: 3, textAlign: 'center' }}>
                  <ConsumoIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
                  <Typography variant="h6" fontWeight={600}>Consumo</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Saída definitiva para consumo
                  </Typography>
                </CardActionArea>
              </Card>
              <Card
                variant="outlined"
                sx={{
                  flex: 1,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '2px solid',
                  borderColor: subtype === 'viatura' ? 'info.main' : 'divider',
                  '&:hover': { borderColor: 'info.main', transform: 'translateY(-2px)', boxShadow: 3 },
                }}
              >
                <CardActionArea onClick={() => handleSelectSubtype('viatura')} sx={{ p: 3, textAlign: 'center' }}>
                  <CarIcon sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
                  <Typography variant="h6" fontWeight={600}>Viatura</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Alocar material em viatura
                  </Typography>
                </CardActionArea>
              </Card>
            </Box>
          </Box>
        )}

        {/* Step 1 for reparo: Detalhes */}
        {step === 1 && newType === 'reparo' && (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Detalhes do Reparo:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Local do Reparo"
                fullWidth
                value={repairLocation}
                onChange={(e) => setRepairLocation(e.target.value)}
                required
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                label="Número do SEI"
                fullWidth
                value={seiNumber}
                onChange={(e) => setSeiNumber(e.target.value)}
                required
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                label="Motivo do Reparo"
                fullWidth
                multiline
                rows={3}
                value={motivoReparo}
                onChange={(e) => setMotivoReparo(e.target.value)}
                required
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                label="Observações (opcional)"
                fullWidth
                multiline
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Box>
          </Box>
        )}

        {/* Step 2 for saída: Detalhes */}
        {step === 2 && newType === 'saída' && (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              {subtype === 'viatura' ? 'Selecione a viatura e o responsável:' : 'Selecione o responsável:'}
            </Typography>

            {subtype === 'viatura' && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Viatura de destino:
                </Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <FormControl fullWidth size="small">
                    <InputLabel>Selecione a Viatura</InputLabel>
                    <Select
                      value={selectedViatura?.id || ''}
                      label="Selecione a Viatura"
                      onChange={(e) => {
                        const vtr = viaturas.find(v => v.id === e.target.value);
                        setSelectedViatura(vtr || null);
                      }}
                      sx={{ borderRadius: 2 }}
                    >
                      {viaturas.map((v) => (
                        <MenuItem key={v.id} value={v.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CarIcon fontSize="small" color="info" />
                            <Typography variant="body2">
                              {v.prefixo} - {v.description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                {selectedViatura && (
                  <Chip
                    icon={<CarIcon />}
                    label={`${selectedViatura.prefixo} - ${selectedViatura.description}`}
                    color="info"
                    sx={{ mt: 1 }}
                    onDelete={() => setSelectedViatura(null)}
                  />
                )}
              </Box>
            )}

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Militar que retirou:
              </Typography>
              <UserSearch
                userCritery={userCritery}
                onSetUserCritery={setUserCritery}
                onSelectUser={(user) => setResponsavel(user)}
                selectedItem={responsavel}
              />
              {responsavel && (
                <Chip
                  icon={<PersonIcon />}
                  label={responsavel.full_name}
                  color="secondary"
                  sx={{ mt: 1 }}
                  onDelete={() => setResponsavel(null)}
                />
              )}
            </Box>

            <TextField
              label="Observações (opcional)"
              fullWidth
              multiline
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
        )}

        {/* Resumo antes de confirmar */}
        {((newType === 'saída' && step === 2 && canConfirm()) ||
          (newType === 'reparo' && step === 1 && canConfirm())) && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Alert
              severity="warning"
              icon={<WarningIcon />}
              sx={{ borderRadius: 2 }}
            >
              <AlertTitle sx={{ fontWeight: 600 }}>Confirmar Transferência</AlertTitle>
              <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                <li>
                  <strong>{movimentacao?.material_description}</strong> ({movimentacao?.quantity} un.)
                </li>
                <li>
                  {movimentacao?.type} <ArrowIcon sx={{ fontSize: 14, verticalAlign: 'middle', mx: 0.5 }} /> {newType}
                  {subtype && ` (${subtype})`}
                </li>
                {selectedViatura && <li>Viatura: {selectedViatura.prefixo} - {selectedViatura.description}</li>}
                {responsavel && <li>Responsável: {responsavel.full_name}</li>}
              </Box>
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, gap: 1, flexWrap: 'wrap' }}>
        {step > 0 && (
          <Button
            onClick={() => setStep(step - 1)}
            variant="outlined"
            color="inherit"
            sx={{ borderRadius: 2, textTransform: 'none' }}
            disabled={saving}
          >
            Voltar
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          sx={{ borderRadius: 2, textTransform: 'none' }}
          disabled={saving}
        >
          Cancelar
        </Button>
        {canConfirm() && (
          <Button
            onClick={handleConfirm}
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <CheckIcon />}
            disabled={saving}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)' },
            }}
          >
            {saving ? 'Transferindo...' : 'Confirmar Transferência'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
