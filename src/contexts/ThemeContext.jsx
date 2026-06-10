import { createContext, useState, useContext, useMemo, useCallback, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getTheme } from '../theme/theme';

const ThemeContext = createContext();

export const useThemeContext = () => useContext(ThemeContext);

const getInitialMode = () => {
  try {
    const saved = localStorage.getItem('themeMode');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // localStorage indisponível (ex.: modo privado)
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

export const ThemeProviderWrapper = ({ children }) => {
  const [mode, setMode] = useState(getInitialMode);

  const toggleMode = useCallback(() => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('themeMode', mode);
    } catch {
      // localStorage indisponível
    }
    // Mantém a cor da barra de status (PWA/mobile) coerente com o tema
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#0f172a' : '#1e3a5f');
  }, [mode]);

  const theme = useMemo(() => getTheme(mode), [mode]);
  const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
