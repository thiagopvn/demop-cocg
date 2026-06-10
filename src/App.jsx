import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CircularProgress, Box, Typography } from '@mui/material';
import './App.css';
import PrivateRoute from './contexts/PrivateRoute';
import brasao from './assets/brasao.png';

// Retry dinâmico para lazy imports que falham após novo deploy
function lazyRetry(importFn) {
  return lazy(() =>
    importFn().catch(() => {
      // Tenta novamente com cache-bust
      return importFn().catch(() => {
        // Se falhar de novo, recarrega a página
        const reloadKey = 'chunk-reload';
        const lastReload = sessionStorage.getItem(reloadKey);
        const now = Date.now();
        if (!lastReload || now - Number(lastReload) > 10000) {
          sessionStorage.setItem(reloadKey, String(now));
          window.location.reload();
        }
        return { default: () => null };
      });
    })
  );
}

// Lazy-loaded screens com retry automático
const LoginScreen = lazyRetry(() => import('./screens/LoginScreen/LoginScreen'));
const FirstAccessScreen = lazyRetry(() => import('./screens/FirstAccessScreen/FirstAccessScreen'));
const Categoria = lazyRetry(() => import('./screens/Categoria/Categoria'));
const Movimentacoes = lazyRetry(() => import('./screens/Movimentacoes/Movimentacoes'));
const Material = lazyRetry(() => import('./screens/Material/Material'));
const Usuario = lazyRetry(() => import('./screens/Usuario/Usuario'));
const Viaturas = lazyRetry(() => import('./screens/Viaturas/Viaturas'));
const Home = lazyRetry(() => import('./screens/Home/Home'));
const Devolucoes = lazyRetry(() => import('./screens/Devolucoes/Devolucoes'));
const Rings = lazyRetry(() => import('./screens/Rings/Rings'));
const MainSearch = lazyRetry(() => import('./screens/Search/MainSearch'));
const Manutencao = lazyRetry(() => import('./screens/Manutencao/Manutencao'));
const ViaturaDetalhes = lazyRetry(() => import('./screens/ViaturaDetalhes/ViaturaDetalhes'));
const Atividades = lazyRetry(() => import('./screens/Atividades/Atividades'));
const Perfil = lazyRetry(() => import('./screens/Perfil/Perfil'));
const BensPatrimoniais = lazyRetry(() => import('./screens/BensPatrimoniais/BensPatrimoniais'));

const SuspenseFallback = (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
      gap: 2,
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
    }}
  >
    <Box
      component="img"
      src={brasao}
      alt=""
      sx={{ width: 72, height: 72, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
    />
    <CircularProgress size={32} sx={{ color: 'rgba(255,255,255,0.85)' }} />
    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
      DEMOP — Carregando...
    </Typography>
  </Box>
);

function App() {
  return (
    <Router>
      <Suspense fallback={SuspenseFallback}>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/" element={<LoginScreen />} />
          <Route path='/first-access' element={<FirstAccessScreen />} />

          {/* Rota acessível a todos os usuários autenticados */}
          <Route path='/home' element={
            <PrivateRoute allowedRoles={['user', 'chefe', 'admin', 'admingeral', 'BensPatrimoniais']}>
              <Home />
            </PrivateRoute>
          } />

          <Route path='/perfil' element={
            <PrivateRoute allowedRoles={['user', 'chefe', 'admin', 'admingeral', 'BensPatrimoniais']}>
              <Perfil />
            </PrivateRoute>
          } />

          {/* Bens Patrimoniais (módulo isolado, acesso estrito) */}
          <Route path='/bens-patrimoniais' element={
            <PrivateRoute allowedRoles={['BensPatrimoniais', 'admingeral']}>
              <BensPatrimoniais />
            </PrivateRoute>
          } />

          {/* Rotas restritas a admin */}
          <Route path='/categoria' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral', 'BensPatrimoniais']}>
              <Categoria />
            </PrivateRoute>
          } />
          <Route path='/movimentacoes' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral', 'BensPatrimoniais']}>
              <Movimentacoes />
            </PrivateRoute>
          } />
          <Route path='/material' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral', 'BensPatrimoniais']}>
              <Material />
            </PrivateRoute>
          } />
          <Route path='/viaturas' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral', 'BensPatrimoniais']}>
              <Viaturas />
            </PrivateRoute>
          } />
          <Route path='/viatura/:id' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral', 'BensPatrimoniais']}>
              <ViaturaDetalhes />
            </PrivateRoute>
          } />
          <Route path='/devolucoes' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral', 'BensPatrimoniais']}>
              <Devolucoes />
            </PrivateRoute>
          } />
          <Route path='/aneis' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral', 'BensPatrimoniais']}>
              <Rings />
            </PrivateRoute>
          } />
          <Route path='/search' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral', 'BensPatrimoniais']}>
              <MainSearch />
            </PrivateRoute>
          } />
          <Route path='/manutencao' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral', 'BensPatrimoniais']}>
              <Manutencao />
            </PrivateRoute>
          } />

          {/* Rota restrita a admingeral */}
          <Route path='/atividades' element={
            <PrivateRoute allowedRoles={['admingeral']}>
              <Atividades />
            </PrivateRoute>
          } />

          {/* Rota restrita apenas a admin */}
          <Route path='/usuario' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral', 'BensPatrimoniais']}>
              <Usuario />
            </PrivateRoute>
          } />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
