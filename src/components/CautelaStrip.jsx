import { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Avatar,
  Alert,
  AlertTitle,
  Zoom,
  Slide,
  alpha,
} from "@mui/material";
import {
  DoneAll,
  Assignment,
  Schedule,
  Warning,
  CheckCircle,
  Create,
  VerifiedUser,
  Output as OutputIcon,
  DirectionsCar as CarIcon,
  ShoppingCart as ConsumoIcon,
  SwapHoriz as SwapHorizIcon,
  Build as RepairIcon,
  Input as InputIcon,
} from "@mui/icons-material";

export default function CautelaStrip({ cautela, onSign }) {
  const [signed, setSigned] = useState(cautela.signed);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [accept, setAccept] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [signedDate, setSignedDate] = useState(null);
  const [signing, setSigning] = useState(false);

  const isTroca = cautela.type === 'troca';
  const trocaEnviado = cautela.enviado || null;
  const trocaRecebido = cautela.recebido || null;
  const recebidoInoperante = trocaRecebido?.status === 'inoperante';
  
  const formatDate = (timestamp) => {
    if (!timestamp) return "";

    try {
      let date;
      if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp.seconds != null) {
        date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
      } else {
        date = new Date(timestamp);
      }

      if (isNaN(date.getTime())) return "";

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  return (
    <>
      <Card
        sx={{
          mb: 2,
          borderRadius: 2,
          border: signed ? '1px solid' : '2px solid',
          borderColor: signed ? alpha('#22c55e', 0.3) : alpha('#f59e0b', 0.5),
          background: signed 
            ? `linear-gradient(135deg, ${alpha('#22c55e', 0.05)} 0%, ${alpha('#22c55e', 0.02)} 100%)`
            : `linear-gradient(135deg, ${alpha('#f59e0b', 0.1)} 0%, ${alpha('#ef4444', 0.05)} 100%)`,
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            transform: { xs: 'none', sm: signed ? 'none' : 'translateY(-2px)' },
            boxShadow: signed ? 1 : 4,
            borderColor: signed ? alpha('#22c55e', 0.3) : alpha('#ef4444', 0.6),
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: signed 
              ? `linear-gradient(90deg, #22c55e 0%, ${alpha('#22c55e', 0.6)} 100%)`
              : `linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)`,
          }
        }}
      >
        <CardContent sx={{ pb: 1, p: { xs: 2, sm: 3 } }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'stretch', sm: 'flex-start' }, 
            mb: 2,
            gap: { xs: 2, sm: 0 }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
              <Avatar
                sx={{
                  bgcolor: signed
                    ? alpha('#22c55e', 0.1)
                    : isTroca
                      ? alpha('#8b5cf6', 0.12)
                      : alpha('#f59e0b', 0.1),
                  color: signed ? '#22c55e' : isTroca ? '#8b5cf6' : '#f59e0b',
                  width: { xs: 40, sm: 48 },
                  height: { xs: 40, sm: 48 },
                }}
              >
                {isTroca
                  ? <SwapHorizIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                  : cautela.type === 'saída'
                    ? (cautela.subtype === 'viatura' ? <CarIcon sx={{ fontSize: { xs: 20, sm: 24 } }} /> : <OutputIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />)
                    : <Assignment sx={{ fontSize: { xs: 20, sm: 24 } }} />
                }
              </Avatar>
              <Box sx={{ flex: 1 }}>
                {cautela.type === 'saída' && (
                  <Chip
                    label={cautela.subtype === 'viatura' ? 'Saída p/ Viatura' : 'Saída (Consumo)'}
                    size="small"
                    sx={{
                      mb: 0.5,
                      height: 20,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: alpha('#f59e0b', 0.15),
                      color: '#b45309',
                    }}
                  />
                )}
                {isTroca && (
                  <Chip
                    label={`Troca com Viatura${cautela.viatura_prefixo ? ` — ${cautela.viatura_prefixo}` : ''}`}
                    size="small"
                    icon={<SwapHorizIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      mb: 0.5,
                      height: 22,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: alpha('#8b5cf6', 0.15),
                      color: '#6d28d9',
                      '& .MuiChip-icon': { color: '#8b5cf6' }
                    }}
                  />
                )}
                <Typography
                  variant="h6"
                  fontWeight={600}
                  sx={{
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                    lineHeight: 1.2,
                    wordBreak: 'break-word'
                  }}
                >
                  {isTroca
                    ? `Troca: ${trocaEnviado?.description || '—'} ↔ ${trocaRecebido?.description || '—'}`
                    : (cautela.material_description || "Material não especificado")}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<Schedule sx={{ fontSize: { xs: 14, sm: 16 } }} />}
                    label={cautela.date ? formatDate(cautela.date) : "Data não disponível"}
                    size="small"
                    sx={{
                      height: { xs: 20, sm: 24 },
                      backgroundColor: alpha('#3b82f6', 0.1),
                      color: '#3b82f6',
                      fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                      '& .MuiChip-icon': { color: '#3b82f6' },
                      '& .MuiChip-label': { px: 1 }
                    }}
                  />
                </Box>
                {cautela.observacoes && (
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      mt: 1,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      fontStyle: 'italic',
                      lineHeight: 1.4
                    }}
                  >
                    <strong>Obs:</strong> {cautela.observacoes}
                  </Typography>
                )}
              </Box>
            </Box>
            {!isTroca && (
              <Chip
                label={`${cautela.quantity || 0} un.`}
                color="primary"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  height: { xs: 32, sm: 36 },
                  minWidth: { xs: 70, sm: 80 },
                  backgroundColor: alpha('#3b82f6', 0.9),
                  alignSelf: { xs: 'flex-start', sm: 'center' }
                }}
              />
            )}
          </Box>

          {isTroca && (
            <Box
              sx={{
                mt: 1,
                p: { xs: 1.5, sm: 2 },
                borderRadius: 2,
                border: '1px dashed',
                borderColor: alpha('#8b5cf6', 0.4),
                backgroundColor: alpha('#8b5cf6', 0.04),
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: alpha('#8b5cf6', 0.25),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                  <OutputIcon sx={{ color: '#8b5cf6', fontSize: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Você receberá do DEMOP
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight={700} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
                  {trocaEnviado?.description || '—'}
                </Typography>
                <Chip
                  label={`${trocaEnviado?.quantidade || 0} un.`}
                  size="small"
                  sx={{ mt: 0.5, bgcolor: '#8b5cf6', color: 'white', fontWeight: 700 }}
                />
              </Box>
              <SwapHorizIcon sx={{ color: '#8b5cf6', fontSize: 28, alignSelf: 'center', transform: { xs: 'rotate(90deg)', sm: 'none' } }} />
              <Box
                sx={{
                  flex: 1,
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: recebidoInoperante ? alpha('#ef4444', 0.3) : alpha('#22c55e', 0.3),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                  {recebidoInoperante
                    ? <RepairIcon sx={{ color: '#ef4444', fontSize: 16 }} />
                    : <InputIcon sx={{ color: '#22c55e', fontSize: 16 }} />}
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: recebidoInoperante ? '#b91c1c' : '#15803d',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5
                    }}
                  >
                    Você devolve ao DEMOP ({recebidoInoperante ? 'inoperante' : 'operante'})
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight={700} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
                  {trocaRecebido?.description || '—'}
                </Typography>
                <Chip
                  label={`${trocaRecebido?.quantidade || 0} un.`}
                  size="small"
                  sx={{
                    mt: 0.5,
                    bgcolor: recebidoInoperante ? '#ef4444' : '#22c55e',
                    color: 'white',
                    fontWeight: 700
                  }}
                />
                {recebidoInoperante && trocaRecebido?.sei && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#b91c1c', fontWeight: 600 }}>
                    SEI: {trocaRecebido.sei}
                  </Typography>
                )}
                {recebidoInoperante && trocaRecebido?.motivo && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', fontStyle: 'italic' }}>
                    Problema: {trocaRecebido.motivo}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {!signed && (
            <Alert 
              severity="warning" 
              icon={<Warning sx={{ fontSize: { xs: 20, sm: 24 } }} />}
              sx={{ 
                mt: 2,
                borderRadius: 1,
                backgroundColor: alpha('#f59e0b', 0.1),
                border: `1px solid ${alpha('#f59e0b', 0.3)}`,
                '& .MuiAlert-icon': {
                  color: '#f59e0b',
                  mr: { xs: 1, sm: 2 }
                },
                '& .MuiAlert-message': {
                  width: '100%'
                }
              }}
            >
              <AlertTitle sx={{ fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                Assinatura Pendente
              </AlertTitle>
              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                {isTroca
                  ? 'Clique no botão abaixo para confirmar a operação de troca com a viatura.'
                  : 'Clique no botão abaixo para confirmar o recebimento deste material'}
              </Typography>
            </Alert>
          )}

          {signed && (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: { xs: 0.5, sm: 1 },
                mt: 2,
                p: { xs: 1, sm: 1.5 },
                borderRadius: 1,
                backgroundColor: alpha('#22c55e', 0.1),
                border: `1px solid ${alpha('#22c55e', 0.3)}`,
              }}
            >
              <CheckCircle sx={{ color: '#22c55e', fontSize: { xs: 20, sm: 24 } }} />
              <Typography 
                variant="body2" 
                color="#22c55e" 
                fontWeight={600}
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Material assinado e confirmado
              </Typography>
            </Box>
          )}
        </CardContent>
        
        {!signed && (
          <CardActions sx={{ px: { xs: 2, sm: 2 }, pb: 2, pt: 0 }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<Create sx={{ fontSize: { xs: 18, sm: 20 } }} />}
              onClick={() => setDialogOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                color: 'white',
                fontWeight: 600,
                py: { xs: 1, sm: 1.5 },
                borderRadius: 2,
                textTransform: 'none',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                boxShadow: 3,
                '&:hover': {
                  background: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
                  boxShadow: 5,
                  transform: { xs: 'none', sm: 'translateY(-1px)' },
                }
              }}
            >
              Assinar e Confirmar Recebimento
            </Button>
          </CardActions>
        )}
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        TransitionComponent={Zoom}
        fullWidth
        maxWidth="sm"
        disableScrollLock
        PaperProps={{
          sx: {
            borderRadius: { xs: 2, sm: 3 },
            border: '2px solid',
            borderColor: alpha('#f59e0b', 0.3),
            mx: { xs: 2, sm: 3 },
            width: { xs: 'calc(100% - 32px)', sm: 'auto' }
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          background: `linear-gradient(135deg, ${alpha('#f59e0b', 0.1)} 0%, ${alpha('#ef4444', 0.05)} 100%)`,
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: { xs: 2, sm: 3 }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
            <Warning sx={{ color: '#f59e0b', fontSize: { xs: 24, sm: 28 } }} />
            <Typography 
              variant="h5" 
              fontWeight={700}
              sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
            >
              Confirmação Importante
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
          <Alert 
            severity="info" 
            icon={<VerifiedUser sx={{ fontSize: { xs: 20, sm: 24 } }} />}
            sx={{ 
              mb: { xs: 2, sm: 3 },
              borderRadius: 2,
              backgroundColor: alpha('#3b82f6', 0.05),
              border: `1px solid ${alpha('#3b82f6', 0.2)}`,
              '& .MuiAlert-icon': {
                mr: { xs: 1, sm: 2 }
              },
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            <AlertTitle sx={{ fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              Atenção: Ação Irreversível
            </AlertTitle>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              {isTroca ? (
                <>
                  Ao assinar, você confirma a operação de <strong>troca com a viatura {cautela.viatura_prefixo || ''}</strong>:
                  o DEMOP envia <strong>{trocaEnviado?.description}</strong> ({trocaEnviado?.quantidade} un.) e recebe de volta
                  <strong> {trocaRecebido?.description}</strong> ({trocaRecebido?.quantidade} un. — {trocaRecebido?.status}).
                  {recebidoInoperante && trocaRecebido?.sei ? ` SEI ${trocaRecebido.sei}.` : ''}
                </>
              ) : (
                <>
                  Ao assinar, você confirma {cautela.type === 'saída' ? 'a retirada' : 'o recebimento'} do material <strong>{cautela.material_description}</strong> em
                  quantidade de <strong>{cautela.quantity} unidades</strong> e assume total responsabilidade pelo mesmo.
                </>
              )}
            </Typography>
          </Alert>
          
          <Box sx={{ 
            p: { xs: 1.5, sm: 2 }, 
            borderRadius: 2,
            border: '2px dashed',
            borderColor: alpha('#f59e0b', 0.3),
            backgroundColor: alpha('#f59e0b', 0.02),
            mb: 2
          }}>
            <Typography 
              variant="body1" 
              fontWeight={600} 
              gutterBottom
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
            >
              Para confirmar a assinatura:
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
            >
              Digite exatamente <Chip label="Aceito" size="small" color="warning" sx={{ mx: 0.5, height: { xs: 20, sm: 24 } }} /> no campo abaixo
            </Typography>
          </Box>

          <TextField
            color={accept === "Aceito" ? "success" : "warning"}
            margin="dense"
            id="accept"
            label='Digite "Aceito" para confirmar'
            type="text"
            fullWidth
            value={accept}
            onChange={(e) => setAccept(e.target.value)}
            autoComplete="off"
            variant="outlined"
            helperText={accept && accept !== "Aceito" ? "Digite exatamente 'Aceito' (com A maiúsculo)" : ""}
            error={accept && accept !== "Aceito"}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1.1rem',
                fontWeight: 600,
              }
            }}
          />
        </DialogContent>
        
        <DialogActions sx={{ 
          px: 3, 
          pb: 3, 
          pt: 2,
          gap: 1 
        }}>
          <Button
            variant="outlined"
            color="inherit"
            size="large"
            onClick={() => {
              setDialogOpen(false);
              setAccept("");
            }}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 120
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            size="large"
            disabled={accept !== "Aceito" || signing}
            onClick={async () => {
              if (accept === "Aceito") {
                setSigning(true);
                try {
                  await onSign(cautela.id);
                  const now = new Date();
                  setSignedDate(now);
                  setSigned(true);
                  setDialogOpen(false);
                  setAccept("");
                  setReceiptOpen(true);
                } catch (error) {
                  console.error("Erro ao assinar:", error);
                  setSnackbarOpen(true);
                } finally {
                  setSigning(false);
                }
              } else {
                setSnackbarOpen(true);
              }
            }}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 120,
              background: accept === "Aceito" 
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                : undefined,
              '&:hover': {
                background: accept === "Aceito"
                  ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                  : undefined,
              }
            }}
          >
            {signing ? 'Assinando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comprovante de Assinatura */}
      <Dialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        TransitionComponent={Zoom}
        fullWidth
        maxWidth="sm"
        disableScrollLock
        PaperProps={{
          sx: {
            borderRadius: { xs: 2, sm: 3 },
            border: '2px solid',
            borderColor: alpha('#22c55e', 0.3),
            mx: { xs: 2, sm: 3 },
            width: { xs: 'calc(100% - 32px)', sm: 'auto' },
            overflow: 'hidden'
          }
        }}
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            p: { xs: 2, sm: 3 },
            textAlign: 'center'
          }}
        >
          <Avatar
            sx={{
              bgcolor: 'white',
              width: { xs: 60, sm: 80 },
              height: { xs: 60, sm: 80 },
              mx: 'auto',
              mb: 2,
              boxShadow: 3
            }}
          >
            <DoneAll sx={{ fontSize: { xs: 32, sm: 40 }, color: '#22c55e' }} />
          </Avatar>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              color: 'white',
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}
          >
            Assinatura Confirmada!
          </Typography>
        </Box>

        <DialogContent sx={{ pt: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
          <Alert
            severity="success"
            icon={<VerifiedUser sx={{ fontSize: { xs: 20, sm: 24 } }} />}
            sx={{
              mb: { xs: 2, sm: 3 },
              borderRadius: 2,
              backgroundColor: alpha('#22c55e', 0.05),
              border: `1px solid ${alpha('#22c55e', 0.2)}`,
            }}
          >
            <AlertTitle sx={{ fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              Comprovante de Recebimento
            </AlertTitle>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              {isTroca
                ? 'Este documento confirma a operação de troca com a viatura sob sua responsabilidade.'
                : `Este documento confirma ${cautela.type === 'saída' ? 'a retirada' : 'o recebimento'} do material sob sua responsabilidade.`}
            </Typography>
          </Alert>

          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: alpha('#f8fafc', 0.5),
              mb: 2
            }}
          >
            {isTroca ? (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  Troca com viatura {cautela.viatura_prefixo || ''}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, mt: 1, alignItems: { xs: 'stretch', sm: 'center' } }}>
                  <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, border: '1px solid', borderColor: alpha('#8b5cf6', 0.3), backgroundColor: alpha('#8b5cf6', 0.04) }}>
                    <Typography variant="caption" sx={{ color: '#6d28d9', fontWeight: 700 }}>DEMOP enviou</Typography>
                    <Typography variant="body2" fontWeight={700}>{trocaEnviado?.description}</Typography>
                    <Typography variant="caption">{trocaEnviado?.quantidade} un.</Typography>
                  </Box>
                  <SwapHorizIcon sx={{ color: '#8b5cf6', fontSize: 28, alignSelf: 'center', transform: { xs: 'rotate(90deg)', sm: 'none' } }} />
                  <Box sx={{
                    flex: 1, p: 1.5, borderRadius: 2,
                    border: '1px solid',
                    borderColor: recebidoInoperante ? alpha('#ef4444', 0.3) : alpha('#22c55e', 0.3),
                    backgroundColor: recebidoInoperante ? alpha('#ef4444', 0.04) : alpha('#22c55e', 0.04)
                  }}>
                    <Typography variant="caption" sx={{ color: recebidoInoperante ? '#b91c1c' : '#15803d', fontWeight: 700 }}>
                      DEMOP recebeu ({trocaRecebido?.status})
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>{trocaRecebido?.description}</Typography>
                    <Typography variant="caption">{trocaRecebido?.quantidade} un.</Typography>
                    {recebidoInoperante && trocaRecebido?.sei && (
                      <Typography variant="caption" sx={{ display: 'block', color: '#b91c1c', fontWeight: 600 }}>
                        SEI: {trocaRecebido.sei}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  Material
                </Typography>
                <Typography
                  variant="body1"
                  fontWeight={600}
                  sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
                >
                  {cautela.material_description || "Material não especificado"}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              {!isTroca && (
                <Box sx={{ flex: 1, minWidth: 100 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Quantidade
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight={600}
                    color="primary"
                    sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
                  >
                    {cautela.quantity || 0} unidade(s)
                  </Typography>
                </Box>
              )}
              <Box sx={{ flex: 1, minWidth: 100 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  Data da Cautela
                </Typography>
                <Typography
                  variant="body1"
                  fontWeight={600}
                  sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
                >
                  {cautela.date ? formatDate(cautela.date) : "N/A"}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                Data/Hora da Assinatura
              </Typography>
              <Typography
                variant="body1"
                fontWeight={600}
                color="#22c55e"
                sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
              >
                {signedDate ? signedDate.toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
              </Typography>
            </Box>
          </Box>

          {cautela.observacoes && (
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 2,
                backgroundColor: alpha('#f59e0b', 0.05),
                border: `1px solid ${alpha('#f59e0b', 0.2)}`,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                Observações
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, fontStyle: 'italic' }}
              >
                {cautela.observacoes}
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => setReceiptOpen(false)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              py: 1.5,
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              }
            }}
          >
            Entendido
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="error" 
          sx={{ width: '100%' }}
        >
          Você precisa digitar exatamente 'Aceito' para confirmar a assinatura
        </Alert>
      </Snackbar>
    </>
  );
}