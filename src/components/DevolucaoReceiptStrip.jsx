import { 
  Card, 
  CardContent, 
  CardActions, 
  Typography, 
  Button, 
  Alert,
  Box,
  Chip,
  alpha
} from '@mui/material';
import { 
  CheckCircle, 
  Assignment,
  CalendarToday 
} from '@mui/icons-material';

export default function DevolucaoReceiptStrip({ cautela, onAcknowledge }) {
  const formatDate = (date) => {
    if (!date) return 'Data não disponível';
    
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  return (
    <Card
      sx={{
        mb: 2,
        border: '2px solid',
        borderColor: '#22c55e',
        background: `linear-gradient(135deg, ${alpha('#22c55e', 0.05)} 0%, ${alpha('#22c55e', 0.02)} 100%)`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${alpha('#22c55e', 0.15)}`,
        }
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Alert 
          severity="success" 
          icon={<CheckCircle />}
          sx={{ 
            mb: 2,
            backgroundColor: alpha('#22c55e', 0.1),
            border: `1px solid ${alpha('#22c55e', 0.2)}`,
            '& .MuiAlert-icon': {
              color: '#22c55e'
            }
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Devolução Confirmada
          </Typography>
        </Alert>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment sx={{ color: '#22c55e', fontSize: 20 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {cautela.material_description}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quantidade: {cautela.quantity}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarToday sx={{ color: '#22c55e', fontSize: 18 }} />
            <Typography variant="body2" color="text.secondary">
              Devolvido em: {formatDate(cautela.returned_date)}
            </Typography>
          </Box>

          <Chip
            label="Processado pelo Sistema"
            size="small"
            sx={{
              backgroundColor: alpha('#22c55e', 0.1),
              color: '#22c55e',
              fontWeight: 600,
              alignSelf: 'flex-start'
            }}
          />
        </Box>
      </CardContent>

      <CardActions sx={{ pt: 0, justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="success"
          onClick={() => onAcknowledge(cautela.id)}
          startIcon={<CheckCircle />}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            backgroundColor: '#22c55e',
            '&:hover': {
              backgroundColor: '#16a34a',
              transform: 'scale(1.02)'
            }
          }}
        >
          Ok, Ciente
        </Button>
      </CardActions>
    </Card>
  );
}