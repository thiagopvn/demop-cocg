import { createContext, useState, useContext } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const ThemeContext = createContext();

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeProviderWrapper = ({ children }) => {
  const [mode, setMode] = useState('light');

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: '#163066',
      },
    
    },
  });

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};