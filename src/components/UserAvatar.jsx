import { Avatar } from '@mui/material';

export const ROLE_COLORS = {
    admingeral: '#d32f2f',
    admin: '#ff6b35',
    chefe: '#22c55e',
    BensPatrimoniais: '#a855f7',
    user: '#3b82f6',
};

export const ROLE_LABELS = {
    admingeral: 'Admin Geral',
    admin: 'Administrador',
    chefe: 'Chefe de Guarnição',
    BensPatrimoniais: 'Bens Patrimoniais',
    user: 'Usuário',
};

export function getInitials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar do militar: foto quando houver, senao iniciais coloridas pelo papel.
 * `size` em px. Aceita qualquer prop extra do Avatar do MUI.
 */
export default function UserAvatar({ src, name, role, size = 40, sx, ...rest }) {
    const cor = ROLE_COLORS[role] || ROLE_COLORS.user;
    return (
        <Avatar
            src={src || undefined}
            alt={name || ''}
            sx={{
                width: size,
                height: size,
                fontSize: Math.max(12, Math.round(size * 0.4)),
                fontWeight: 700,
                bgcolor: cor,
                color: '#fff',
                letterSpacing: '0.02em',
                ...sx,
            }}
            {...rest}
        >
            {getInitials(name)}
        </Avatar>
    );
}
