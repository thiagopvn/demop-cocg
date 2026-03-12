import './utils/consoleGuard';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProviderWrapper } from './contexts/ThemeContext.jsx'
import { CategoriaProvider } from './contexts/CategoriaContext';
import { MaterialProvider } from './contexts/MaterialContext.jsx';
import ErrorBoundary from './components/ErrorBoundary';

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
