import { Chip, Tooltip, alpha } from '@mui/material';
import { ViewAgenda, Inventory2, AllInbox, DoorSliding, Place, Warehouse } from '@mui/icons-material';
import { getTipoInfo, siglaLocal } from '../../services/localizacaoService';

/** Icone por tipo de local (padrao ou criado pelo admin). */
export function TipoLocalIcon({ tipo, ...props }) {
    switch (tipo) {
        case 'prateleira': return <ViewAgenda {...props} />;
        case 'box': return <Inventory2 {...props} />;
        case 'gaveta': return <AllInbox {...props} />;
        case 'armario': return <DoorSliding {...props} />;
        case '__demop': return <Warehouse {...props} />;
        default: return <Place {...props} />;
    }
}

/**
 * Chip compacto de um local: "Prat. 01 ×10".
 * Cor derivada do tipo; locais de inoperantes ganham borda vermelha.
 */
export default function LocalChip({ local, quantidade, size = 'small', onClick, completo = false, sx, ...rest }) {
    if (!local) return null;
    const info = getTipoInfo(local.tipo, local.tipo_label);
    const rotulo = completo ? (local.nome || siglaLocal(local)) : siglaLocal(local);
    const label = quantidade != null ? `${rotulo} ×${quantidade}` : rotulo;
    const tooltip = `${local.nome || rotulo}${quantidade != null ? ` — ${quantidade} unidade(s)` : ''}${local.inoperantes ? ' · local de inoperantes' : ''}`;

    return (
        <Tooltip title={tooltip} arrow>
            <Chip
                size={size}
                icon={<TipoLocalIcon tipo={local.tipo} sx={{ fontSize: '0.95rem !important', color: `${info.cor} !important` }} />}
                label={label}
                onClick={onClick}
                sx={{
                    fontWeight: 600,
                    bgcolor: alpha(info.cor, 0.1),
                    color: info.cor,
                    border: `1px solid ${alpha(local.inoperantes ? '#dc2626' : info.cor, local.inoperantes ? 0.6 : 0.25)}`,
                    cursor: onClick ? 'pointer' : 'default',
                    '& .MuiChip-label': { px: 0.9 },
                    ...(onClick ? { '&:hover': { bgcolor: alpha(info.cor, 0.18) } } : {}),
                    ...sx,
                }}
                {...rest}
            />
        </Tooltip>
    );
}
