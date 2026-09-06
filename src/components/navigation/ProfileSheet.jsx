import { Box, Typography, SwipeableDrawer, ButtonBase, Chip, Switch, Divider, alpha, useTheme } from '@mui/material';
import { AccountCircle, LockOutlined, Logout, DarkModeOutlined, ChevronRight } from '@mui/icons-material';
import UserAvatar, { ROLE_COLORS, ROLE_LABELS } from '../UserAvatar';

function Linha({ icon, label, sublabel, onClick, cor, trailing, danger }) {
    const Icon = icon;
    const theme = useTheme();
    const c = danger ? theme.palette.error.main : (cor || theme.palette.text.primary);
    return (
        <ButtonBase
            onClick={onClick}
            sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.4,
                borderRadius: 2.5,
                textAlign: 'left',
                transition: 'background-color 0.15s ease, transform 0.15s ease',
                '&:active': { transform: 'scale(0.985)', bgcolor: alpha(c, 0.08) },
            }}
        >
            <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(c, 0.12), color: c, flexShrink: 0 }}>
                <Icon fontSize="small" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: danger ? 'error.main' : 'text.primary', lineHeight: 1.25 }}>{label}</Typography>
                {sublabel && <Typography variant="caption" color="text.secondary">{sublabel}</Typography>}
            </Box>
            {trailing ?? <ChevronRight sx={{ color: 'text.disabled' }} />}
        </ButtonBase>
    );
}

/**
 * Folha inferior com o militar logado e as acoes de conta (perfil, senha, tema, sair).
 */
export default function ProfileSheet({ open, onClose, user, mode, toggleMode, onChangePassword, onLogout, onNavigate }) {
    const theme = useTheme();
    const cor = ROLE_COLORS[user?.role] || ROLE_COLORS.user;
    const nome = user?.fullName || user?.username || 'Usuário';

    return (
        <SwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            onOpen={() => {}}
            disableSwipeToOpen
            PaperProps={{
                sx: {
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
                    backgroundImage: 'none',
                    overflow: 'hidden',
                },
            }}
            sx={{ display: { xs: 'block', md: 'none' }, zIndex: 1300 }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.25 }}>
                <Box sx={{ width: 40, height: 5, borderRadius: 3, bgcolor: alpha(theme.palette.text.primary, 0.18) }} />
            </Box>

            {/* Cartao do militar */}
            <Box sx={{ position: 'relative', mx: 2, mt: 1.5, mb: 1, p: 2, borderRadius: 3.5, overflow: 'hidden', background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #0f2440 100%)`, color: '#fff' }}>
                <Box sx={{ position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: '50%', bgcolor: alpha('#fff', 0.05) }} />
                <Box sx={{ position: 'absolute', bottom: -50, left: 30, width: 120, height: 120, borderRadius: '50%', bgcolor: alpha(theme.palette.secondary.main, 0.12) }} />
                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ p: '3px', borderRadius: '50%', background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${alpha('#fff', 0.6)} 100%)` }}>
                        <UserAvatar src={user?.fotoUrl} name={nome} role={user?.role} size={64} sx={{ border: '3px solid #0f2440' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>{nome}</Typography>
                        {user?.username && <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }} noWrap>@{user.username}{user?.obm ? ` · ${user.obm}` : ''}</Typography>}
                        <Chip
                            label={ROLE_LABELS[user?.role] || 'Usuário'}
                            size="small"
                            sx={{ mt: 0.75, height: 22, fontSize: '0.68rem', fontWeight: 700, bgcolor: alpha(cor, 0.25), color: '#fff', border: `1px solid ${alpha(cor, 0.7)}` }}
                        />
                    </Box>
                </Box>
            </Box>

            <Box sx={{ px: 1, pt: 0.5 }}>
                <Linha icon={AccountCircle} label="Meu perfil" sublabel="Foto, contato e dados" cor={theme.palette.primary.main} onClick={() => { onClose(); onNavigate('/perfil'); }} />
                <Linha
                    icon={DarkModeOutlined}
                    label="Modo escuro"
                    sublabel={mode === 'dark' ? 'Ativado' : 'Desativado'}
                    cor="#60a5fa"
                    onClick={toggleMode}
                    trailing={<Switch checked={mode === 'dark'} onChange={toggleMode} onClick={(e) => e.stopPropagation()} size="small" />}
                />
                <Linha icon={LockOutlined} label="Alterar senha" cor="#ff9800" onClick={() => { onClose(); onChangePassword(); }} />
                <Divider sx={{ my: 0.75, mx: 1 }} />
                <Linha icon={Logout} label="Sair do sistema" danger onClick={() => { onClose(); onLogout(); }} trailing={<span />} />
            </Box>
        </SwipeableDrawer>
    );
}
