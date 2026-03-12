import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
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

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Ocorreu um erro inesperado. Tente recarregar a página.
            </Typography>

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
