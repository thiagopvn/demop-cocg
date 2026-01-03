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
  Divider,
  Paper,
} from "@mui/material";
import {
  DoneAll,
  Assignment,
  Schedule,
  Warning,
  CheckCircle,
  Create,
  VerifiedUser,
  Celebration,
  WhatsApp,
  Favorite,
  SupportAgent
} from "@mui/icons-material";

export default function CautelaStrip({ cautela, onSign }) {
  const [signed, setSigned] = useState(cautela.signed);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [accept, setAccept] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [signedDate, setSignedDate] = useState(null);
  const [signing, setSigning] = useState(false);
  
  const formatDate = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(
      timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000
    );
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}`;
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
                  bgcolor: signed ? alpha('#22c55e', 0.1) : alpha('#f59e0b', 0.1),
                  color: signed ? '#22c55e' : '#f59e0b',
                  width: { xs: 40, sm: 48 },
                  height: { xs: 40, sm: 48 },
                }}
              >
                <Assignment sx={{ fontSize: { xs: 20, sm: 24 } }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography 
                  variant="h6" 
                  fontWeight={600}
                  sx={{ 
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                    lineHeight: 1.2,
                    wordBreak: 'break-word'
                  }}
                >
                  {cautela.material_description || "Material não especificado"}
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
          </Box>

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
                Clique no botão abaixo para confirmar o recebimento deste material
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
              Ao assinar, você confirma ter recebido o material <strong>{cautela.material_description}</strong> em 
              quantidade de <strong>{cautela.quantity} unidades</strong> e assume total responsabilidade pelo mesmo.
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
            autoFocus
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

      {/* Comprovante de Assinatura com Bom Serviço */}
      <Dialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        TransitionComponent={Zoom}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: { xs: 2, sm: 4 },
            mx: { xs: 2, sm: 3 },
            width: { xs: 'calc(100% - 32px)', sm: 'auto' },
            overflow: 'hidden'
          }
        }}
      >
        {/* Header com Bom Serviço */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #ff6b35 100%)',
            p: { xs: 3, sm: 4 },
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            }
          }}
        >
          <Celebration
            sx={{
              fontSize: { xs: 48, sm: 64 },
              color: 'white',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              animation: 'bounce 1s ease infinite',
              '@keyframes bounce': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-8px)' },
              },
              mb: 1
            }}
          />
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              color: 'white',
              fontSize: { xs: '1.5rem', sm: '2rem' },
              textShadow: '0 4px 12px rgba(0,0,0,0.3)',
              letterSpacing: '0.05em',
              mb: 1
            }}
          >
            BOM SERVIÇO!
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mb: 1 }}>
            {[...Array(5)].map((_, i) => (
              <Favorite
                key={i}
                sx={{
                  color: '#ef4444',
                  fontSize: { xs: 16, sm: 20 },
                  animation: `pulse 1s ease ${i * 0.1}s infinite`,
                  '@keyframes pulse': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.2)' },
                  },
                }}
              />
            ))}
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: { xs: '0.8rem', sm: '0.9rem' }
            }}
          >
            Assinatura confirmada com sucesso!
          </Typography>
        </Box>

        <DialogContent sx={{ pt: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
          {/* Comprovante */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2,
              border: '1px solid',
              borderColor: alpha('#22c55e', 0.3),
              backgroundColor: alpha('#22c55e', 0.03),
              mb: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <VerifiedUser sx={{ color: '#22c55e', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={600} color="#22c55e">
                Comprovante de Recebimento
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
                  Material
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {cautela.material_description || "Material não especificado"}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 80 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
                    Quantidade
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="primary">
                    {cautela.quantity || 0} un.
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 100 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
                    Assinado em
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="#22c55e">
                    {signedDate ? signedDate.toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          <Divider sx={{ my: 2 }} />

          {/* Card de Suporte */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              background: alpha('#25D366', 0.08),
              border: `1px solid ${alpha('#25D366', 0.2)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <SupportAgent sx={{ color: '#1e3a5f', fontSize: 22 }} />
              <Typography variant="subtitle2" fontWeight={600} color="#1e3a5f">
                Suporte ao Sistema
              </Typography>
            </Box>

            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '0.8rem', sm: '0.85rem' },
                lineHeight: 1.6,
                mb: 2
              }}
            >
              Encontrou algum problema, tem sugestões de melhorias ou precisa de ajuda?
              Entre em contato com o desenvolvedor do sistema:
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 1.5,
                p: 2,
                borderRadius: 2,
                backgroundColor: 'white',
                border: `1px solid ${alpha('#1e3a5f', 0.1)}`,
              }}
            >
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ color: '#1e3a5f', textAlign: 'center' }}
              >
                2º Ten BM Thiago Santos
              </Typography>
              <Chip
                icon={<WhatsApp sx={{ fontSize: 18 }} />}
                label="(21) 96758-6628"
                component="a"
                href="https://wa.me/5521967586628?text=Olá! Preciso de ajuda com o sistema de Controle de Cautela."
                target="_blank"
                rel="noopener noreferrer"
                clickable
                sx={{
                  backgroundColor: '#25D366',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  py: 2.5,
                  px: 1,
                  '&:hover': {
                    backgroundColor: '#128C7E',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s ease',
                  '& .MuiChip-icon': {
                    color: 'white',
                  },
                }}
              />
            </Box>
          </Paper>

          {/* Lema */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              color: 'text.disabled',
              mt: 2,
              fontStyle: 'italic',
              letterSpacing: '0.05em'
            }}
          >
            "Vida Alheia e Riquezas Salvar" - CBMERJ
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => setReceiptOpen(false)}
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 600,
              py: 1.5,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #1e3a5f 0%, #ff6b35 100%)',
              boxShadow: '0 8px 24px rgba(30, 58, 95, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #2d5a87 0%, #ff8c5a 100%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 32px rgba(30, 58, 95, 0.4)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Entendido! 🔥
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