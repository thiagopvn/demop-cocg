import { useEffect, useState } from 'react';
import { Box, Typography, Button, IconButton, Slide, alpha, useTheme } from '@mui/material';
import { Close, GetApp, IosShare, AddBoxOutlined } from '@mui/icons-material';
import { ALTURA_BARRA } from './navigation/MobileBottomNav';

const CHAVE = 'pwa-install-dismissed';
const DIAS_SILENCIO = 7;
const ICONE = '/icons/icon-192.png';

const emStandalone = () =>
    (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) || window.navigator?.standalone === true;

const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const ehSafariIOS = () => ehIOS() && /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);

const foiDispensadoRecentemente = () => {
    try {
        const v = Number(localStorage.getItem(CHAVE) || 0);
        return v && Date.now() - v < DIAS_SILENCIO * 24 * 60 * 60 * 1000;
    } catch {
        return false;
    }
};

/**
 * Convite para instalar a PWA na tela inicial.
 *  - Android / Chrome / Edge: usa o evento beforeinstallprompt e instala com um toque.
 *  - iPhone / iPad (Safari): mostra o passo a passo (Compartilhar > Adicionar à Tela de Início).
 * Some quando o app ja esta instalado ou depois de dispensado (volta em 7 dias).
 */
export default function InstallPrompt() {
    const theme = useTheme();
    const [evento, setEvento] = useState(null);
    const [visivel, setVisivel] = useState(false);
    const [modoIOS, setModoIOS] = useState(false);
    const [instalando, setInstalando] = useState(false);

    useEffect(() => {
        if (emStandalone() || foiDispensadoRecentemente()) return undefined;

        if (ehSafariIOS()) {
            const t = setTimeout(() => { setModoIOS(true); setVisivel(true); }, 4000);
            return () => clearTimeout(t);
        }

        const onPrompt = (e) => {
            e.preventDefault();
            setEvento(e);
            setVisivel(true);
        };
        const onInstalled = () => { setVisivel(false); setEvento(null); };
        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    const dispensar = () => {
        try { localStorage.setItem(CHAVE, String(Date.now())); } catch { /* sem storage */ }
        setVisivel(false);
    };

    const instalar = async () => {
        if (!evento) return;
        setInstalando(true);
        try {
            await evento.prompt();
            const { outcome } = await evento.userChoice;
            if (outcome === 'accepted') setVisivel(false);
            else dispensar();
        } catch {
            dispensar();
        } finally {
            setInstalando(false);
            setEvento(null);
        }
    };

    if (!visivel) return null;

    return (
        <Slide in direction="up" mountOnEnter unmountOnExit>
            <Box
                role="dialog"
                aria-label="Instalar o aplicativo"
                sx={{
                    position: 'fixed',
                    left: { xs: 10, sm: 'auto' },
                    right: { xs: 10, sm: 24 },
                    bottom: { xs: `calc(${ALTURA_BARRA + 12}px + env(safe-area-inset-bottom, 0px))`, md: 24 },
                    zIndex: 1150,
                    maxWidth: 420,
                    p: 1.75,
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.22)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box component="img" src={ICONE} alt="" sx={{ width: 52, height: 52, borderRadius: 2.5, flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
                            Instale o DEMOP GOCG no celular
                        </Typography>
                        {modoIOS ? (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.45 }}>
                                No Safari, toque em <IosShare sx={{ fontSize: 15, verticalAlign: 'text-bottom' }} /> <strong>Compartilhar</strong> e depois em <AddBoxOutlined sx={{ fontSize: 15, verticalAlign: 'text-bottom' }} /> <strong>Adicionar à Tela de Início</strong>. O ícone do GOCG fica na tela como um app.
                            </Typography>
                        ) : (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.45 }}>
                                Ícone na tela inicial, abre em tela cheia e carrega mais rápido. Sem loja, sem cadastro.
                            </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, mt: 1.25, flexWrap: 'wrap' }}>
                            {!modoIOS && (
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<GetApp />}
                                    onClick={instalar}
                                    disabled={instalando}
                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 2 }}
                                >
                                    Instalar
                                </Button>
                            )}
                            <Button size="small" onClick={dispensar} sx={{ borderRadius: 2, textTransform: 'none', color: 'text.secondary' }}>
                                {modoIOS ? 'Entendi' : 'Agora não'}
                            </Button>
                        </Box>
                    </Box>
                    <IconButton size="small" onClick={dispensar} aria-label="Fechar" sx={{ mt: -0.5, mr: -0.5 }}>
                        <Close fontSize="small" />
                    </IconButton>
                </Box>
            </Box>
        </Slide>
    );
}
