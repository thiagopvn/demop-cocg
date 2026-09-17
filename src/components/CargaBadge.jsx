import { Box, Chip, Tooltip, Typography, alpha } from '@mui/material';
import { LocalFireDepartmentOutlined, BatteryAlertOutlined, BatteryFullOutlined } from '@mui/icons-material';
import { CORES_CARGA, resumoCarga } from '../utils/carga';

/**
 * Situação de carga de um material (extintor/cilindro): barra cheio×vazio e chips.
 * `compact` = uma linha só (tabelas). `onClick` abre o registro de vazios.
 */
export default function CargaBadge({ material, compact = false, onClick, sx }) {
    const r = resumoCarga(material);
    const corPrincipal = r.nivel === 'critico' ? CORES_CARGA.critico : r.nivel === 'atencao' ? CORES_CARGA.vazio : CORES_CARGA.cheio;
    const tooltip = r.disponivel === 0
        ? 'Nenhuma unidade disponível no DEMOP'
        : `${r.cheios} cheio(s) · ${r.vazios} vazio(s) aguardando recarga · ${r.percentualCheios}% prontos para uso`;

    if (compact) {
        return (
            <Tooltip title={`${tooltip}${onClick ? ' · clique para registrar vazios' : ''}`} arrow>
                <Box
                    onClick={onClick ? (e) => { e.stopPropagation(); onClick(material); } : undefined}
                    sx={{ display: 'inline-flex', flexDirection: 'column', gap: 0.4, minWidth: 96, cursor: onClick ? 'pointer' : 'default', ...sx }}
                >
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Chip size="small" icon={<BatteryFullOutlined sx={{ fontSize: '13px !important', color: `${CORES_CARGA.cheio} !important` }} />} label={r.cheios} sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800, bgcolor: alpha(CORES_CARGA.cheio, 0.12), color: CORES_CARGA.cheio, '& .MuiChip-label': { px: 0.7 } }} />
                        <Chip size="small" icon={<BatteryAlertOutlined sx={{ fontSize: '13px !important', color: `${r.vazios ? corPrincipal : '#94a3b8'} !important` }} />} label={r.vazios} sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800, bgcolor: alpha(r.vazios ? corPrincipal : '#94a3b8', 0.12), color: r.vazios ? corPrincipal : '#64748b', '& .MuiChip-label': { px: 0.7 } }} />
                    </Box>
                    {r.disponivel > 0 && (
                        <Box sx={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', bgcolor: alpha('#94a3b8', 0.25) }}>
                            <Box sx={{ flex: r.cheios, bgcolor: CORES_CARGA.cheio, transition: 'flex .2s' }} />
                            <Box sx={{ flex: r.vazios, bgcolor: corPrincipal, transition: 'flex .2s' }} />
                        </Box>
                    )}
                </Box>
            </Tooltip>
        );
    }

    return (
        <Box sx={{ p: 1.5, borderRadius: 2.5, border: `1px solid ${alpha(corPrincipal, 0.35)}`, background: `linear-gradient(135deg, ${alpha(corPrincipal, 0.08)} 0%, ${alpha(corPrincipal, 0.02)} 100%)`, ...sx }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: alpha(corPrincipal, 0.15), color: corPrincipal, display: 'flex' }}><LocalFireDepartmentOutlined fontSize="small" /></Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Carga</Typography>
                    <Typography variant="caption" color="text.secondary">{tooltip}</Typography>
                </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <Box><Typography variant="h5" sx={{ fontWeight: 900, color: CORES_CARGA.cheio, lineHeight: 1 }}>{r.cheios}</Typography><Typography variant="caption" color="text.secondary">cheios</Typography></Box>
                <Box><Typography variant="h5" sx={{ fontWeight: 900, color: r.vazios ? corPrincipal : 'text.disabled', lineHeight: 1 }}>{r.vazios}</Typography><Typography variant="caption" color="text.secondary">vazios</Typography></Box>
            </Box>
            {r.disponivel > 0 && (
                <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', bgcolor: alpha('#94a3b8', 0.25) }}>
                    <Box sx={{ flex: r.cheios, bgcolor: CORES_CARGA.cheio }} />
                    <Box sx={{ flex: r.vazios, bgcolor: corPrincipal }} />
                </Box>
            )}
        </Box>
    );
}
