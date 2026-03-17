import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import './App.css';
import PrivateRoute from './contexts/PrivateRoute';

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
const ConferenciaChefe = lazyRetry(() => import('./screens/ConferenciaChefe/ConferenciaChefe'));

const SuspenseFallback = (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
    <CircularProgress />
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
            <PrivateRoute allowedRoles={['user', 'chefe', 'admin', 'admingeral']}>
              <Home />
            </PrivateRoute>
          } />

          <Route path='/perfil' element={
            <PrivateRoute allowedRoles={['user', 'chefe', 'admin', 'admingeral']}>
              <Perfil />
            </PrivateRoute>
          } />

          {/* Rota exclusiva do Chefe de Guarnição + admins */}
          <Route path='/conferencia-chefe' element={
            <PrivateRoute allowedRoles={['chefe', 'admin', 'admingeral']}>
              <ConferenciaChefe />
            </PrivateRoute>
          } />

          {/* Rotas restritas a admin */}
          <Route path='/categoria' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral']}>
              <Categoria />
            </PrivateRoute>
          } />
          <Route path='/movimentacoes' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral']}>
              <Movimentacoes />
            </PrivateRoute>
          } />
          <Route path='/material' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral']}>
              <Material />
            </PrivateRoute>
          } />
          <Route path='/viaturas' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral']}>
              <Viaturas />
            </PrivateRoute>
          } />
          <Route path='/viatura/:id' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral']}>
              <ViaturaDetalhes />
            </PrivateRoute>
          } />
          <Route path='/devolucoes' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral']}>
              <Devolucoes />
            </PrivateRoute>
          } />
          <Route path='/aneis' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral']}>
              <Rings />
            </PrivateRoute>
          } />
          <Route path='/search' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral']}>
              <MainSearch />
            </PrivateRoute>
          } />
          <Route path='/manutencao' element={
            <PrivateRoute allowedRoles={['admin', 'admingeral']}>
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
            <PrivateRoute allowedRoles={['admin', 'admingeral']}>
              <Usuario />
            </PrivateRoute>
          } />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
