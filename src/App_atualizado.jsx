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
import Manutencao from './screens/Manutencao/Manutencao'; // <-- NOVO IMPORT

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path='/first-access' element={<FirstAccessScreen />} />
        <Route path='/home' element={<Home />} />
        <Route path='/categoria' element={<Categoria />} />
        <Route path='/movimentacoes' element={<Movimentacoes />} />
        <Route path='/material' element={<Material />} />
        <Route path='/usuario' element={<Usuario />} />
        <Route path='/viaturas' element={<Viaturas />} />
        <Route path='/devolucoes' element={<Devolucoes />} />
        <Route path='/aneis' element={<Rings />} />
        <Route path='/search' element={<MainSearch />} />
        <Route path='/manutencao' element={<Manutencao />} /> {/* <-- NOVA ROTA */}
      </Routes>
    </Router>
  );
}

export default App;