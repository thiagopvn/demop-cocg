import { useState, useEffect } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginScreen from './screens/LoginScreen/LoginScreen';
import FirstAccessScreen from './screens/FirstAccessScreen/FirstAccessScreen';
import Categoria from './screens/Categoria/Categoria';
import Consignacoes from './screens/Movimentacoes/Movimentacoes';
import Material from './screens/Material/Material';
import Usuario from './screens/Usuario/Usuario';
import Viaturas from './screens/Viaturas/Viaturas';
import Home from './screens/Home/Home';
import { CategoriaProvider } from './contexts/CategoriaContext';
import Devolucoes from './screens/Devolucoes/Devolucoes';
import Rings from './screens/Rings/Rings';
import MainSearch from './screens/Search/MainSearch';

function App() {
  const [count, setCount] = useState(0)

  return (

        <Router>
          <Routes>

         
            <Route path="/" element={<LoginScreen />} />
            <Route path='/first-access' element={<FirstAccessScreen />} />
            <Route path='/home' element={<Home />} />
            <Route path='/categoria' element={<Categoria />} />
            <Route path='/movimentacoes' element={<Consignacoes />} />
            <Route path='/material' element={<Material />} />
            <Route path='/usuario' element={<Usuario />} />
            <Route path='/viaturas' element={<Viaturas />} />
            <Route path='/devolucoes' element={<Devolucoes/>} />
            <Route path='/aneis' element={<Rings />} />
            <Route path='/search' element={<MainSearch />} />
          </Routes>
        </Router>


  )
}

export default App