import React, { use, useState } from 'react';
import MenuContext from '../../contexts/MenuContext';
import { FormControlLabel, Paper, RadioGroup, Radio, Typography } from '@mui/material';
import MaterialUsuario from './MaterialUsuario';
import MaterialViatura from './MaterialViatura';
import UsuarioMaterial from './UsuarioMaterial';
import ViaturaMaterial from './ViaturaMaterial';
import Inativos from './Inativos';
import ConsultaCautela from './ConsultaCautela';
import { useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import db from '../../firebase/db';
export default function MainSearch() {
  // Inicialize o estado com um valor vazio
  const [search, setSearch] = useState('material-usuario');
  const [categorias, setCategorias] = useState([]);



 //monta uma lista de categorias
  useEffect(() => {


    
    const fetchCategorias = async () => {
      const categoriasCollection = collection(db, "categorias");
      const querySnapshot = await getDocs(categoriasCollection);
      const categorias = [];
      querySnapshot.forEach((doc) => {
        categorias.push(doc.data());
      });
      setCategorias(categorias);
    };

  
      fetchCategorias();
  

  }, []);



  return (
    <MenuContext>
      <div className='root-protected'>
        <div className='search'>
          <Paper>
            <Typography variant='h6' align='center'>Pesquisa Por:</Typography>
            <RadioGroup
              sx={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                gap: 2,
              }}
              row
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            >
              <FormControlLabel value="material-usuario" control={<Radio />} label="Material/Usuario" />
              <FormControlLabel value="material-viatura" control={<Radio />} label="Material/Viatura" />
              <FormControlLabel value="usuario-material" control={<Radio />} label="Usuário/Material" />
              <FormControlLabel value="viatura-material" control={<Radio />} label="Viatura/Material" />
              <FormControlLabel value="inoperante" control={<Radio />} label="Inoperante" />
              <FormControlLabel value="consulta-cautela" control={<Radio />} label="Consultar cautelas" />
            </RadioGroup>
          </Paper>
          {search === 'material-usuario' && <MaterialUsuario />}
          {search === 'material-viatura' && <MaterialViatura />}
          {search === 'usuario-material' && <UsuarioMaterial  categorias={categorias} />}
          {search === 'viatura-material' && <ViaturaMaterial  categorias={categorias} />}
          {search === 'inoperante' && <Inativos categorias={categorias} />} 
          {search === 'Consultar cautelas' && <Inativos categorias={categorias} />} 
        </div>

      </div>
    </MenuContext>
  );
}
