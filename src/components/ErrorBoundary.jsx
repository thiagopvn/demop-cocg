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
    // Detecta erros típicos de chunk antigo cacheado após novo deploy.
    // - Vite/Webpack: "Failed to fetch dynamically imported module"
    // - Vite + React.lazy: "Cannot read properties of undefined (reading 'default')"
    //   (acontece quando o navegador serve um chunk antigo cujo módulo já foi
    //   removido/renomeado pelo deploy mais recente)
    const isChunkError =
      /Failed to fetch dynamically imported module|Loading chunk|Loading CSS chunk|dynamically imported module/i.test(message) ||
      /Cannot read properties of undefined \(reading 'default'\)/i.test(message) ||
      /undefined is not an object \(evaluating '.*\.default'\)/i.test(message);

    if (isChunkError) {
      const reloadKey = 'chunk-reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem(reloadKey, String(now));
        // Limpa caches conhecidos antes do reload — força navegador a baixar
        // os assets mais recentes em vez do cache antigo.
        try {
          if (typeof caches !== 'undefined' && caches?.keys) {
            caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
          }
        } catch { /* ignore */ }
        // location.reload(true) é não-padrão (e ignorado em alguns browsers),
        // então adicionamos query string para garantir cache-bust em CDN.
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('_cb', String(now));
          window.location.replace(url.toString());
        } catch {
          window.location.reload();
        }
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
            backgroundColor: 'background.default',
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
              onClick={() => {
                // Limpa caches conhecidos e força reload com cache-bust.
                try {
                  if (typeof caches !== 'undefined' && caches?.keys) {
                    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
                  }
                  sessionStorage.removeItem('chunk-reload');
                } catch { /* ignore */ }
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.set('_cb', String(Date.now()));
                  window.location.replace(url.toString());
                } catch {
                  window.location.reload();
                }
              }}
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
