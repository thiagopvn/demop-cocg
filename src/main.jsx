import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import brasao from './assets/brasao.png'
import App from './App.jsx'
import { ThemeProviderWrapper } from './contexts/ThemeContext.jsx'
import { CategoriaProvider } from './contexts/CategoriaContext';
createRoot(document.getElementById('root')).render(

  <StrictMode>
    <CategoriaProvider>
    <ThemeProviderWrapper>
      <App />
    </ThemeProviderWrapper>
    </CategoriaProvider>
  </StrictMode>,
)
