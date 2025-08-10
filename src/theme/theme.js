import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
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
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
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
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '0.95rem',
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
            backgroundColor: 'rgba(0,0,0,0.04)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        },
        elevation2: {
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        },
        elevation3: {
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
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
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            },
            '&.Mui-focused': {
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
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
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: 'primary.main',
        },
      },
    },
  },
});

export default theme;