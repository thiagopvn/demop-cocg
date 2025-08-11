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
  useTheme,
} from "@mui/material";
import { 
  DoneAll, 
  Assignment, 
  Schedule, 
  Warning,
  CheckCircle,
  Create,
  VerifiedUser
} from "@mui/icons-material";

export default function CautelaStrip({ cautela, onSign }) {
  const [signed, setSigned] = useState(cautela.signed);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [accept, setAccept] = useState("");
  
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
            transform: signed ? 'none' : 'translateY(-2px)',
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
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  bgcolor: signed ? alpha('#22c55e', 0.1) : alpha('#f59e0b', 0.1),
                  color: signed ? '#22c55e' : '#f59e0b',
                  width: 48,
                  height: 48,
                }}
              >
                <Assignment />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  {cautela.material_description || "Material não especificado"}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip
                    icon={<Schedule sx={{ fontSize: 16 }} />}
                    label={cautela.date ? formatDate(cautela.date) : "Data não disponível"}
                    size="small"
                    sx={{
                      height: 24,
                      backgroundColor: alpha('#3b82f6', 0.1),
                      color: '#3b82f6',
                      '& .MuiChip-icon': { color: '#3b82f6' }
                    }}
                  />
                </Box>
              </Box>
            </Box>
            <Chip
              label={`${cautela.quantity || 0} un.`}
              color="primary"
              sx={{
                fontWeight: 700,
                fontSize: '1rem',
                height: 36,
                minWidth: 80,
                backgroundColor: alpha('#3b82f6', 0.9),
              }}
            />
          </Box>

          {!signed && (
            <Alert 
              severity="warning" 
              icon={<Warning />}
              sx={{ 
                mt: 2,
                borderRadius: 1,
                backgroundColor: alpha('#f59e0b', 0.1),
                border: `1px solid ${alpha('#f59e0b', 0.3)}`,
                '& .MuiAlert-icon': {
                  color: '#f59e0b'
                }
              }}
            >
              <AlertTitle sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Assinatura Pendente
              </AlertTitle>
              <Typography variant="body2">
                Clique no botão abaixo para confirmar o recebimento deste material
              </Typography>
            </Alert>
          )}

          {signed && (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                mt: 2,
                p: 1.5,
                borderRadius: 1,
                backgroundColor: alpha('#22c55e', 0.1),
                border: `1px solid ${alpha('#22c55e', 0.3)}`,
              }}
            >
              <CheckCircle sx={{ color: '#22c55e' }} />
              <Typography variant="body2" color="#22c55e" fontWeight={600}>
                Material assinado e confirmado
              </Typography>
            </Box>
          )}
        </CardContent>
        
        {!signed && (
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<Create />}
              onClick={() => setDialogOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                color: 'white',
                fontWeight: 600,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                boxShadow: 3,
                '&:hover': {
                  background: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
                  boxShadow: 5,
                  transform: 'translateY(-1px)',
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
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: 400,
            border: '2px solid',
            borderColor: alpha('#f59e0b', 0.3),
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          background: `linear-gradient(135deg, ${alpha('#f59e0b', 0.1)} 0%, ${alpha('#ef4444', 0.05)} 100%)`,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning sx={{ color: '#f59e0b', fontSize: 28 }} />
            <Typography variant="h5" fontWeight={700}>
              Confirmação Importante
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Alert 
            severity="info" 
            icon={<VerifiedUser />}
            sx={{ 
              mb: 3,
              borderRadius: 2,
              backgroundColor: alpha('#3b82f6', 0.05),
              border: `1px solid ${alpha('#3b82f6', 0.2)}`,
            }}
          >
            <AlertTitle sx={{ fontWeight: 600 }}>
              Atenção: Ação Irreversível
            </AlertTitle>
            <Typography variant="body2">
              Ao assinar, você confirma ter recebido o material <strong>{cautela.material_description}</strong> em 
              quantidade de <strong>{cautela.quantity} unidades</strong> e assume total responsabilidade pelo mesmo.
            </Typography>
          </Alert>
          
          <Box sx={{ 
            p: 2, 
            borderRadius: 2,
            border: '2px dashed',
            borderColor: alpha('#f59e0b', 0.3),
            backgroundColor: alpha('#f59e0b', 0.02),
            mb: 2
          }}>
            <Typography variant="body1" fontWeight={600} gutterBottom>
              Para confirmar a assinatura:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Digite exatamente <Chip label="Aceito" size="small" color="warning" sx={{ mx: 0.5 }} /> no campo abaixo
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
            disabled={accept !== "Aceito"}
            onClick={() => {
              if (accept === "Aceito") {
                onSign(cautela.id);
                setSigned(true);
                setDialogOpen(false);
                setAccept("");
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
            Confirmar
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