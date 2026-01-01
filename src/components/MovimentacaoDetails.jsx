import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Divider,
} from '@mui/material';

const DetailRow = ({ label, value, chipColor = null }) => {
  if (!value && value !== 0 && value !== false) return null;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}:
      </Typography>
      {chipColor ? (
        <Chip
          label={value}
          size="small"
          color={chipColor}
          variant="filled"
          sx={{ fontWeight: 500 }}
        />
      ) : (
        <Typography
          variant="caption"
          fontWeight={500}
          sx={{
            textAlign: 'right',
            wordBreak: 'break-word',
            maxWidth: '180px'
          }}
        >
          {value}
        </Typography>
      )}
    </Box>
  );
};

const MovimentacaoDetails = ({ movimentacao, title = "Detalhes da Movimentacao", color = "primary" }) => {
  if (!movimentacao) return null;

  const formatDate = (date) => {
    if (!date) return null;
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleString('pt-BR');
    }
    return date;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'devolvido':
      case 'devolvidadereparo':
        return 'success';
      case 'cautelado':
      case 'emreparo':
        return 'warning';
      case 'saida':
      case 'saída':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'devolvidadereparo':
        return 'Devolvido de Reparo';
      case 'emreparo':
        return 'Em Reparo';
      default:
        return status;
    }
  };

  return (
    <Box sx={{ minWidth: 280 }}>
      <Typography
        variant="subtitle2"
        gutterBottom
        color={`${color}.main`}
        sx={{ fontWeight: 600 }}
      >
        {title}
      </Typography>
      <Divider sx={{ my: 1.5 }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <DetailRow label="ID" value={movimentacao.id} />
        <DetailRow label="Material" value={movimentacao.material_description} />
        <DetailRow label="Quantidade" value={movimentacao.quantity} />
        <DetailRow label="Militar" value={movimentacao.user_name} />
        <DetailRow label="Viatura" value={movimentacao.viatura_description} />
        <DetailRow label="Data" value={formatDate(movimentacao.date)} />
        <DetailRow label="Tipo" value={movimentacao.type} />
        <DetailRow label="Telefone" value={movimentacao.telefone_responsavel} />
        <DetailRow label="Remetente" value={movimentacao.sender_name} />
        <DetailRow label="Categoria" value={movimentacao.categoria} />

        {/* Status with chip */}
        {movimentacao.status && (
          <DetailRow
            label="Status"
            value={getStatusLabel(movimentacao.status)}
            chipColor={getStatusColor(movimentacao.status)}
          />
        )}

        {/* Signed status */}
        {movimentacao.signed !== undefined && (
          <DetailRow
            label="Assinado"
            value={movimentacao.signed ? "Sim" : "Nao"}
            chipColor={movimentacao.signed ? "success" : "default"}
          />
        )}

        {/* Repair specific fields */}
        <DetailRow label="Local de Reparo" value={movimentacao.repairLocation} />
        <DetailRow label="Numero SEI" value={movimentacao.seiNumber} />
        <DetailRow label="Motivo Reparo" value={movimentacao.motivoReparo} />

        {/* Observations */}
        {(movimentacao.obs || movimentacao.observacoes) && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Observacoes:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontStyle: 'italic',
                mt: 0.5,
                p: 1,
                backgroundColor: 'grey.50',
                borderRadius: 1,
              }}
            >
              {movimentacao.obs || movimentacao.observacoes}
            </Typography>
          </Box>
        )}

        {movimentacao.motivo && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Motivo:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.5,
                p: 1,
                backgroundColor: 'grey.50',
                borderRadius: 1,
              }}
            >
              {movimentacao.motivo}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MovimentacaoDetails;
