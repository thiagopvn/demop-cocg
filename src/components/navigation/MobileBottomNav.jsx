import { useMemo, useState } from 'react';
import { Box, ButtonBase, Typography, Badge, SwipeableDrawer, alpha, useTheme, IconButton } from '@mui/material';
import { GridViewRounded, Close, DarkModeOutlined, LightModeOutlined } from '@mui/icons-material';

/** Ordem de prioridade para escolher o que fica na barra inferior. */
const PRIORIDADE = ['/home', '/mensagens', '/movimentacoes', '/material', '/devolucoes', '/bens-patrimoniais', '/orcamento', '/manutencao', '/viaturas', '/locais', '/search', '/perfil'];
const MAX_NA_BARRA = 4;

export const ALTURA_BARRA = 64;

const ROTULO_CURTO = { Dashboard: 'Início', 'Movimentação': 'Movimentar', 'Bens Patrimoniais': 'Bens' };
const rotulo = (label) => ROTULO_CURTO[label] || label;

const BADGE_SX = {
    '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16, padding: '0 4px', fontWeight: 700 },
};

function Tab({ icon, label, active, onClick, badge, badgeColor, cor }) {
    const Icon = icon;
    return (
        <ButtonBase
            onClick={onClick}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            sx={{
                flex: 1,
                minWidth: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.35,
                borderRadius: 3,
                color: active ? cor : 'text.secondary',
                transition: 'color 0.2s ease',
                WebkitTapHighlightColor: 'transparent',
                '&:active .nav-pill': { transform: 'scale(0.92)' },
            }}
        >
            <Box
                className="nav-pill"
                sx={{
                    px: 2,
                    py: 0.45,
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: active ? alpha(cor, 0.14) : 'transparent',
                    transition: 'background-color 0.25s ease, transform 0.15s ease',
                }}
            >
                <Badge badgeContent={badge || 0} color={badgeColor || 'error'} max={99} invisible={!badge} sx={BADGE_SX}>
                    <Icon sx={{ fontSize: 24, transition: 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)', transform: active ? 'translateY(-1px) scale(1.06)' : 'none' }} />
                </Badge>
            </Box>
            <Typography
                variant="caption"
                sx={{ fontSize: '0.66rem', fontWeight: active ? 700 : 500, lineHeight: 1, letterSpacing: '0.01em', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', px: 0.5 }}
            >
                {label}
            </Typography>
        </ButtonBase>
    );
}

/**
 * Barra inferior estilo app social + folha "Mais" com o restante do menu.
 * Recebe os itens ja filtrados por papel.
 */
export default function MobileBottomNav({ items, activePath, onNavigate, maintenanceBadge, mensagensBadge = 0, mode, toggleMode }) {
    const theme = useTheme();
    const [maisOpen, setMaisOpen] = useState(false);
    const isDark = theme.palette.mode === 'dark';
    const cor = isDark ? theme.palette.primary.light : theme.palette.primary.main;

    const { naBarra, noMais } = useMemo(() => {
        const ordenados = [...items].sort((a, b) => {
            const ia = PRIORIDADE.indexOf(a.path);
            const ib = PRIORIDADE.indexOf(b.path);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
        if (ordenados.length <= MAX_NA_BARRA + 1) return { naBarra: ordenados, noMais: [] };
        return { naBarra: ordenados.slice(0, MAX_NA_BARRA), noMais: ordenados.slice(MAX_NA_BARRA) };
    }, [items]);

    const maisAtivo = noMais.some(i => i.path === activePath);
    const badgeDe = (item) => (item.path === '/manutencao' && maintenanceBadge?.total > 0 ? maintenanceBadge.total : item.path === '/mensagens' ? (mensagensBadge || 0) : 0);
    const badgeCor = maintenanceBadge?.overdue > 0 ? 'error' : 'warning';
    const badgeNoMais = noMais.reduce((acc, i) => acc + badgeDe(i), 0);

    const navegar = (path) => {
        setMaisOpen(false);
        onNavigate(path);
    };

    // Enquanto o papel do usuario nao foi resolvido nao ha itens: nao desenha a barra vazia
    if (items.length === 0) return null;

    return (
        <>
            <Box
                component="nav"
                aria-label="Navegação principal"
                sx={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1250,
                    display: { xs: 'flex', md: 'none' },
                    alignItems: 'stretch',
                    height: `calc(${ALTURA_BARRA}px + env(safe-area-inset-bottom, 0px))`,
                    pb: 'env(safe-area-inset-bottom, 0px)',
                    px: 0.5,
                    bgcolor: alpha(theme.palette.background.paper, isDark ? 0.85 : 0.92),
                    backdropFilter: 'saturate(180%) blur(18px)',
                    WebkitBackdropFilter: 'saturate(180%) blur(18px)',
                    borderTop: `1px solid ${alpha(theme.palette.divider, isDark ? 1 : 0.9)}`,
                    boxShadow: isDark ? '0 -8px 24px rgba(0,0,0,0.35)' : '0 -8px 24px rgba(15, 23, 42, 0.06)',
                }}
            >
                {naBarra.map((item) => (
                    <Tab
                        key={item.path}
                        icon={item.icon}
                        label={rotulo(item.label)}
                        active={activePath === item.path}
                        onClick={() => navegar(item.path)}
                        badge={badgeDe(item)}
                        badgeColor={item.path === '/mensagens' ? 'secondary' : badgeCor}
                        cor={cor}
                    />
                ))}
                {noMais.length > 0 && (
                    <Tab
                        icon={GridViewRounded}
                        label="Mais"
                        active={maisAtivo || maisOpen}
                        onClick={() => setMaisOpen(true)}
                        badge={badgeNoMais}
                        badgeColor={badgeCor}
                        cor={cor}
                    />
                )}
            </Box>

            <SwipeableDrawer
                anchor="bottom"
                open={maisOpen}
                onClose={() => setMaisOpen(false)}
                onOpen={() => setMaisOpen(true)}
                disableSwipeToOpen
                ModalProps={{ keepMounted: false }}
                PaperProps={{
                    sx: {
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
                        maxHeight: '85dvh',
                        backgroundImage: 'none',
                    },
                }}
                sx={{ display: { xs: 'block', md: 'none' }, zIndex: 1300 }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.25, pb: 0.5 }}>
                    <Box sx={{ width: 40, height: 5, borderRadius: 3, bgcolor: alpha(theme.palette.text.primary, 0.18) }} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', px: 2.5, pb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, flex: 1 }}>Menu</Typography>
                    <IconButton size="small" onClick={toggleMode} aria-label={mode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'} sx={{ mr: 0.5, bgcolor: alpha(cor, 0.08) }}>
                        {mode === 'dark' ? <LightModeOutlined fontSize="small" /> : <DarkModeOutlined fontSize="small" />}
                    </IconButton>
                    <IconButton size="small" onClick={() => setMaisOpen(false)} aria-label="Fechar"><Close fontSize="small" /></IconButton>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, px: 2, pt: 0.5, overflowY: 'auto' }}>
                    {[...naBarra, ...noMais].map((item) => {
                        const Icon = item.icon;
                        const ativo = activePath === item.path;
                        const badge = badgeDe(item);
                        return (
                            <ButtonBase
                                key={item.path}
                                onClick={() => navegar(item.path)}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1,
                                    p: 1.5,
                                    borderRadius: 3,
                                    border: `1px solid ${ativo ? alpha(cor, 0.5) : alpha(theme.palette.text.primary, 0.08)}`,
                                    bgcolor: ativo ? alpha(cor, 0.1) : alpha(theme.palette.text.primary, 0.025),
                                    transition: 'transform 0.15s ease, background-color 0.2s ease',
                                    '&:active': { transform: 'scale(0.96)' },
                                }}
                            >
                                <Badge badgeContent={badge} color={badgeCor} max={99} invisible={!badge} sx={BADGE_SX}>
                                    <Box sx={{ width: 46, height: 46, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: ativo ? cor : alpha(cor, 0.12), color: ativo ? '#fff' : cor, transition: 'all 0.2s ease' }}>
                                        <Icon sx={{ fontSize: 24 }} />
                                    </Box>
                                </Badge>
                                <Typography variant="caption" sx={{ fontWeight: ativo ? 700 : 600, fontSize: '0.72rem', lineHeight: 1.15, textAlign: 'center' }}>
                                    {item.label === 'Dashboard' ? 'Início' : item.label}
                                </Typography>
                            </ButtonBase>
                        );
                    })}
                </Box>
            </SwipeableDrawer>
        </>
    );
}
