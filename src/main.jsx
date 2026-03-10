import './utils/consoleGuard';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import brasao from './assets/brasao.png'
import App from './App.jsx'
import { ThemeProviderWrapper } from './contexts/ThemeContext.jsx'
import { CategoriaProvider } from './contexts/CategoriaContext';
import { MaterialProvider } from './contexts/MaterialContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CategoriaProvider>
      <MaterialProvider>
        <ThemeProviderWrapper>
          <App />
        </ThemeProviderWrapper>
      </MaterialProvider>
    </CategoriaProvider>
  </StrictMode>,
)
