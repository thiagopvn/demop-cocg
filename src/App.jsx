import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import './App.css';
import PrivateRoute from './contexts/PrivateRoute';

// Lazy-loaded screens
const LoginScreen = lazy(() => import('./screens/LoginScreen/LoginScreen'));
const FirstAccessScreen = lazy(() => import('./screens/FirstAccessScreen/FirstAccessScreen'));
const Categoria = lazy(() => import('./screens/Categoria/Categoria'));
const Movimentacoes = lazy(() => import('./screens/Movimentacoes/Movimentacoes'));
const Material = lazy(() => import('./screens/Material/Material'));
const Usuario = lazy(() => import('./screens/Usuario/Usuario'));
const Viaturas = lazy(() => import('./screens/Viaturas/Viaturas'));
const Home = lazy(() => import('./screens/Home/Home'));
const Devolucoes = lazy(() => import('./screens/Devolucoes/Devolucoes'));
const Rings = lazy(() => import('./screens/Rings/Rings'));
const MainSearch = lazy(() => import('./screens/Search/MainSearch'));
const Manutencao = lazy(() => import('./screens/Manutencao/Manutencao'));
const ViaturaDetalhes = lazy(() => import('./screens/ViaturaDetalhes/ViaturaDetalhes'));
const Atividades = lazy(() => import('./screens/Atividades/Atividades'));
const Perfil = lazy(() => import('./screens/Perfil/Perfil'));

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
            <PrivateRoute allowedRoles={['user', 'editor', 'admin', 'admingeral']}>
              <Home />
            </PrivateRoute>
          } />

          <Route path='/perfil' element={
            <PrivateRoute allowedRoles={['user', 'editor', 'admin', 'admingeral']}>
              <Perfil />
            </PrivateRoute>
          } />

          {/* Rotas restritas a editor e admin */}
          <Route path='/categoria' element={
            <PrivateRoute allowedRoles={['editor', 'admin', 'admingeral']}>
              <Categoria />
            </PrivateRoute>
          } />
          <Route path='/movimentacoes' element={
            <PrivateRoute allowedRoles={['editor', 'admin', 'admingeral']}>
              <Movimentacoes />
            </PrivateRoute>
          } />
          <Route path='/material' element={
            <PrivateRoute allowedRoles={['editor', 'admin', 'admingeral']}>
              <Material />
            </PrivateRoute>
          } />
          <Route path='/viaturas' element={
            <PrivateRoute allowedRoles={['editor', 'admin', 'admingeral']}>
              <Viaturas />
            </PrivateRoute>
          } />
          <Route path='/viatura/:id' element={
            <PrivateRoute allowedRoles={['editor', 'admin', 'admingeral']}>
              <ViaturaDetalhes />
            </PrivateRoute>
          } />
          <Route path='/devolucoes' element={
            <PrivateRoute allowedRoles={['editor', 'admin', 'admingeral']}>
              <Devolucoes />
            </PrivateRoute>
          } />
          <Route path='/aneis' element={
            <PrivateRoute allowedRoles={['editor', 'admin', 'admingeral']}>
              <Rings />
            </PrivateRoute>
          } />
          <Route path='/search' element={
            <PrivateRoute allowedRoles={['editor', 'admin', 'admingeral']}>
              <MainSearch />
            </PrivateRoute>
          } />
          <Route path='/manutencao' element={
            <PrivateRoute allowedRoles={['editor', 'admin', 'admingeral']}>
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
