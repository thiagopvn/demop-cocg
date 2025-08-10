import { Route, Navigate } from 'react-router-dom';
import { verifyToken } from '../firebase/token';
import { useEffect, useState } from 'react'; // Importe useState

const PrivateRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // Inicialize com null

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token || typeof token !== 'string') {
        console.log("Token inválido ou não encontrado");
        setIsAuthenticated(false);
        return;
      }

      const decodedToken = await verifyToken(token);

      setIsAuthenticated(!!decodedToken); // Converta para booleano
    };

    checkAuth();
  }, []);



  if (isAuthenticated === null) {
    // Renderize um indicador de carregamento enquanto verifica a autenticação
    return <div></div>;
  }

  return isAuthenticated ? children : <Navigate to="/" />;
};

export default PrivateRoute;