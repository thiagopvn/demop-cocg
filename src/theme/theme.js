import { createTheme } from '@mui/material/styles';

const baseTheme = createTheme();

const palettes = {
  light: {
    mode: 'light',
    primary: {
      main: '#1e3a5f', // Azul marinho profissional
      light: '#4a6fa5',
      dark: '#0d1f3c',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ff6b35', // Laranja vibrante para ações
      light: '#ff9563',
      dark: '#cc4125',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a202c',
      secondary: '#64748b',
    },
    success: {
      main: '#22c55e',
      light: '#86efac',
      dark: '#15803d',
    },
    error: {
      main: '#ef4444',
      light: '#fca5a5',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fcd34d',
      dark: '#d97706',
    },
    info: {
      main: '#3b82f6',
      light: '#93bbfc',
      dark: '#1e40af',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
    // Superfícies tintadas usadas em painéis/realces legados — resolvidas via sx
    surface: {
      amber: '#fff8e1',
      orange: '#fff3e0',
      blue: '#e3f2fd',
      blueText: '#1565c0',
      red: '#ffebee',
      purple: '#f3e5f5',
    },
  },
  dark: {
    mode: 'dark',
    primary: {
      // Azul marinho clareado para manter contraste sobre fundo escuro
      main: '#6b9bd2',
      light: '#9dc1e8',
      dark: '#3d6391',
      contrastText: '#0b1220',
    },
    secondary: {
      main: '#ff8a5c',
      light: '#ffb08a',
      dark: '#e05a28',
      contrastText: '#1a0e08',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
    },
    success: {
      main: '#4ade80',
      light: '#86efac',
      dark: '#16a34a',
    },
    error: {
      main: '#f87171',
      light: '#fca5a5',
      dark: '#dc2626',
    },
    warning: {
      main: '#fbbf24',
      light: '#fcd34d',
      dark: '#d97706',
    },
    info: {
      main: '#60a5fa',
      light: '#93bbfc',
      dark: '#2563eb',
    },
    divider: 'rgba(255, 255, 255, 0.1)',
    surface: {
      amber: 'rgba(251, 191, 36, 0.12)',
      orange: 'rgba(249, 115, 22, 0.14)',
      blue: 'rgba(96, 165, 250, 0.16)',
      blueText: '#93bbfc',
      red: 'rgba(248, 113, 113, 0.14)',
      purple: 'rgba(168, 85, 247, 0.16)',
    },
  },
};

export const getTheme = (mode = 'light') => {
  const isDark = mode === 'dark';
  const focusRing = isDark ? '#9dc1e8' : '#1e3a5f';

  return createTheme({
    palette: palettes[mode] || palettes.light,
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
        [baseTheme.breakpoints.down('sm')]: {
          fontSize: '1.75rem',
        },
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
        [baseTheme.breakpoints.down('sm')]: {
          fontSize: '1.5rem',
        },
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.4,
        [baseTheme.breakpoints.down('sm')]: {
          fontSize: '1.35rem',
        },
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
        [baseTheme.breakpoints.down('sm')]: {
          fontSize: '1.2rem',
        },
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.5,
        [baseTheme.breakpoints.down('sm')]: {
          fontSize: '1.05rem',
        },
      },
      h6: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.5,
        [baseTheme.breakpoints.down('sm')]: {
          fontSize: '1rem',
        },
      },
      subtitle1: {
        fontSize: '1rem',
        fontWeight: 500,
        lineHeight: 1.75,
        letterSpacing: '0.01em',
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.75,
        letterSpacing: '0.01em',
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0.02em',
      },
    },
    shape: {
      borderRadius: 12,
    },
    shadows: [
      'none',
      '0px 2px 4px rgba(0,0,0,0.05)',
      '0px 4px 8px rgba(0,0,0,0.05)',
      '0px 8px 16px rgba(0,0,0,0.05)',
      '0px 12px 24px rgba(0,0,0,0.05)',
      '0px 16px 32px rgba(0,0,0,0.05)',
      '0px 20px 40px rgba(0,0,0,0.05)',
      '0px 24px 48px rgba(0,0,0,0.06)',
      '0px 28px 56px rgba(0,0,0,0.07)',
      '0px 32px 64px rgba(0,0,0,0.08)',
      '0px 36px 72px rgba(0,0,0,0.09)',
      '0px 40px 80px rgba(0,0,0,0.10)',
      '0px 44px 88px rgba(0,0,0,0.11)',
      '0px 48px 96px rgba(0,0,0,0.12)',
      '0px 52px 104px rgba(0,0,0,0.13)',
      '0px 56px 112px rgba(0,0,0,0.14)',
      '0px 60px 120px rgba(0,0,0,0.15)',
      '0px 64px 128px rgba(0,0,0,0.16)',
      '0px 68px 136px rgba(0,0,0,0.17)',
      '0px 72px 144px rgba(0,0,0,0.18)',
      '0px 76px 152px rgba(0,0,0,0.19)',
      '0px 80px 160px rgba(0,0,0,0.20)',
      '0px 84px 168px rgba(0,0,0,0.21)',
      '0px 88px 176px rgba(0,0,0,0.22)',
      '0px 92px 184px rgba(0,0,0,0.23)',
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            colorScheme: mode,
          },
          '*::-webkit-scrollbar': {
            width: 10,
            height: 10,
          },
          '*::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(30, 58, 95, 0.25)',
            borderRadius: 8,
            border: '2px solid transparent',
            backgroundClip: 'content-box',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(148, 163, 184, 0.55)' : 'rgba(30, 58, 95, 0.45)',
            },
          },
          '::selection': {
            backgroundColor: isDark ? 'rgba(107, 155, 210, 0.4)' : 'rgba(30, 58, 95, 0.2)',
          },
          // Respeita usuários que preferem menos animação (acessibilidade)
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '10px 24px',
            fontSize: '0.95rem',
            [baseTheme.breakpoints.down('sm')]: {
              padding: '8px 16px',
              fontSize: '0.85rem',
            },
            boxShadow: 'none',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
            '&.Mui-focusVisible': {
              outline: `2px solid ${focusRing}`,
              outlineOffset: 2,
            },
          },
          contained: {
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            },
          },
          outlined: {
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.06)',
            backgroundImage: 'none',
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.55)' : '0 8px 32px rgba(0,0,0,0.12)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.35)' : '0 2px 12px rgba(0,0,0,0.04)',
            backgroundImage: 'none',
          },
          elevation1: {
            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.06)',
          },
          elevation2: {
            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.45)' : '0 4px 16px rgba(0,0,0,0.08)',
          },
          elevation3: {
            boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.10)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
              },
              '&.Mui-focused': {
                boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.12)',
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            [baseTheme.breakpoints.down('sm')]: {
              margin: 16,
              width: 'calc(100% - 32px)',
              maxHeight: 'calc(100% - 32px)',
              borderRadius: 12,
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: 0,
            boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            [baseTheme.breakpoints.down('sm')]: {
              padding: '8px 10px',
              fontSize: '0.82rem',
            },
          },
          head: {
            [baseTheme.breakpoints.down('sm')]: {
              padding: '8px 10px',
              fontSize: '0.78rem',
            },
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            '&:hover': {
              boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            height: 6,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            '&.Mui-focusVisible': {
              outline: `2px solid ${focusRing}`,
              outlineOffset: 2,
            },
          },
        },
      },
      MuiTooltip: {
        defaultProps: {
          arrow: true,
          enterTouchDelay: 50,
        },
      },
      MuiSnackbar: {
        defaultProps: {
          anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        },
      },
    },
  });
};

// Compatibilidade com imports existentes (tema claro)
const theme = getTheme('light');

export default theme;
