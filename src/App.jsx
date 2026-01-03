import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import LoginScreen from './screens/LoginScreen/LoginScreen';
import FirstAccessScreen from './screens/FirstAccessScreen/FirstAccessScreen';
import Categoria from './screens/Categoria/Categoria';
import Movimentacoes from './screens/Movimentacoes/Movimentacoes';
import Material from './screens/Material/Material';
import Usuario from './screens/Usuario/Usuario';
import Viaturas from './screens/Viaturas/Viaturas';
import Home from './screens/Home/Home';
import Devolucoes from './screens/Devolucoes/Devolucoes';
import Rings from './screens/Rings/Rings';
import MainSearch from './screens/Search/MainSearch';
import Manutencao from './screens/Manutencao/Manutencao';
import ViaturaDetalhes from './screens/ViaturaDetalhes/ViaturaDetalhes';
import PrivateRoute from './contexts/PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/" element={<LoginScreen />} />
        <Route path='/first-access' element={<FirstAccessScreen />} />

        {/* Rota acessível a todos os usuários autenticados */}
        <Route path='/home' element={
          <PrivateRoute allowedRoles={['user', 'editor', 'admin']}>
            <Home />
          </PrivateRoute>
        } />

        {/* Rotas restritas a editor e admin */}
        <Route path='/categoria' element={
          <PrivateRoute allowedRoles={['editor', 'admin']}>
            <Categoria />
          </PrivateRoute>
        } />
        <Route path='/movimentacoes' element={
          <PrivateRoute allowedRoles={['editor', 'admin']}>
            <Movimentacoes />
          </PrivateRoute>
        } />
        <Route path='/material' element={
          <PrivateRoute allowedRoles={['editor', 'admin']}>
            <Material />
          </PrivateRoute>
        } />
        <Route path='/viaturas' element={
          <PrivateRoute allowedRoles={['editor', 'admin']}>
            <Viaturas />
          </PrivateRoute>
        } />
        <Route path='/viatura/:id' element={
          <PrivateRoute allowedRoles={['editor', 'admin']}>
            <ViaturaDetalhes />
          </PrivateRoute>
        } />
        <Route path='/devolucoes' element={
          <PrivateRoute allowedRoles={['editor', 'admin']}>
            <Devolucoes />
          </PrivateRoute>
        } />
        <Route path='/aneis' element={
          <PrivateRoute allowedRoles={['editor', 'admin']}>
            <Rings />
          </PrivateRoute>
        } />
        <Route path='/search' element={
          <PrivateRoute allowedRoles={['editor', 'admin']}>
            <MainSearch />
          </PrivateRoute>
        } />
        <Route path='/manutencao' element={
          <PrivateRoute allowedRoles={['editor', 'admin']}>
            <Manutencao />
          </PrivateRoute>
        } />

        {/* Rota restrita apenas a admin */}
        <Route path='/usuario' element={
          <PrivateRoute allowedRoles={['admin']}>
            <Usuario />
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;