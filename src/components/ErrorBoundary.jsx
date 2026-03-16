import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    const message = error?.message || String(error);
    // Detecta erro de chunk/módulo dinâmico e recarrega automaticamente
    const isChunkError = /Failed to fetch dynamically imported module|Loading chunk|Loading CSS chunk|dynamically imported module/i.test(message);
    if (isChunkError) {
      const reloadKey = 'chunk-reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
        return { hasError: false, errorMessage: '' };
      }
    }
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100dvh',
            backgroundColor: '#f0f2f5',
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 5,
              maxWidth: 420,
              width: '100%',
              textAlign: 'center',
              borderRadius: 3,
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: 'error.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <ReportProblemIcon sx={{ fontSize: 32, color: 'error.dark' }} />
            </Box>

            <Typography variant="h5" gutterBottom>
              Algo deu errado
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Ocorreu um erro inesperado. Tente recarregar a página.
            </Typography>

            {this.state.errorMessage && (
              <Typography variant="caption" color="text.disabled" sx={{ mb: 3, display: 'block', wordBreak: 'break-word' }}>
                {this.state.errorMessage}
              </Typography>
            )}

            <Button
              variant="contained"
              onClick={() => window.location.reload()}
            >
              Recarregar Página
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
