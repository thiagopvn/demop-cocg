import './utils/consoleGuard';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProviderWrapper } from './contexts/ThemeContext.jsx'
import { CategoriaProvider } from './contexts/CategoriaContext';
import { MaterialProvider } from './contexts/MaterialContext.jsx';
import ErrorBoundary from './components/ErrorBoundary';

// Auto-reload quando chunks antigos falham após um novo deploy
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const reloadKey = 'chunk-reload';
  const lastReload = sessionStorage.getItem(reloadKey);
  const now = Date.now();
  // Evita loop infinito de reloads (max 1 reload a cada 10s)
  if (!lastReload || now - Number(lastReload) > 10000) {
    sessionStorage.setItem(reloadKey, String(now));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <CategoriaProvider>
        <MaterialProvider>
          <ThemeProviderWrapper>
            <App />
          </ThemeProviderWrapper>
        </MaterialProvider>
      </CategoriaProvider>
    </ErrorBoundary>
  </StrictMode>,
)
