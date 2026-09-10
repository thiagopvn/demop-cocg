import { useState } from 'react';
import { Box, Chip, CircularProgress, ListItemIcon, ListItemText, MenuItem, MenuList, Popover, Typography, alpha, useTheme } from '@mui/material';
import { CheckCircle, ErrorOutline, ExpandMore } from '@mui/icons-material';
import { fmtData } from '../../services/orcamentoService';

/**
 * Selo "Pago" / "Não pago" que abre um popover para trocar a situação.
 * Usado no modal de lançamento (antes de salvar) e na coluna de ações da tabela (depois).
 *
 * @param {boolean} pago
 * @param {*}       [pagoEm]   data do pagamento (Timestamp/Date) — só exibida
 * @param {(pago: boolean) => void|Promise} onChange
 * @param {boolean} [busy]     mostra um spinner enquanto grava
 */
export default function PagamentoChip({ pago, pagoEm, onChange, busy = false, disabled = false, size = 'small', sx }) {
    const theme = useTheme();
    const [anchor, setAnchor] = useState(null);
    const cor = pago ? theme.palette.success.main : theme.palette.warning.main;
    const Icone = pago ? CheckCircle : ErrorOutline;

    const escolher = (valor) => {
        setAnchor(null);
        if (valor !== pago) onChange?.(valor);
    };

    return (
        <>
            <Chip
                size={size}
                icon={busy ? <CircularProgress size={14} sx={{ color: `${cor} !important` }} /> : <Icone sx={{ fontSize: '16px !important', color: `${cor} !important` }} />}
                deleteIcon={<ExpandMore sx={{ color: `${cor} !important` }} />}
                onDelete={disabled || busy ? undefined : (e) => setAnchor(e.currentTarget.closest('.MuiChip-root'))}
                label={pago ? 'Pago' : 'Não pago'}
                onClick={disabled || busy ? undefined : (e) => setAnchor(e.currentTarget)}
                aria-haspopup="true"
                aria-label={`Situação do pagamento: ${pago ? 'pago' : 'não pago'}. Clique para alterar`}
                sx={{ fontWeight: 700, bgcolor: alpha(cor, 0.14), color: cor, cursor: disabled ? 'default' : 'pointer', '&:hover': { bgcolor: alpha(cor, 0.22) }, ...sx }}
            />
            <Popover
                open={Boolean(anchor)}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{ paper: { sx: { borderRadius: 2, mt: 0.5, minWidth: 210 } } }}
            >
                <Box sx={{ px: 2, pt: 1.25, pb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Situação do pagamento</Typography>
                </Box>
                <MenuList dense sx={{ pt: 0 }}>
                    <MenuItem selected={pago} onClick={() => escolher(true)}>
                        <ListItemIcon><CheckCircle fontSize="small" sx={{ color: 'success.main' }} /></ListItemIcon>
                        <ListItemText primary="Pago" secondary={pago && pagoEm ? `em ${fmtData(pagoEm)}` : 'A nota já foi quitada'} />
                    </MenuItem>
                    <MenuItem selected={!pago} onClick={() => escolher(false)}>
                        <ListItemIcon><ErrorOutline fontSize="small" sx={{ color: 'warning.main' }} /></ListItemIcon>
                        <ListItemText primary="Não pago" secondary="Pendente de pagamento" />
                    </MenuItem>
                </MenuList>
            </Popover>
        </>
    );
}
