import { Navigate } from 'react-router-dom';
import { verifyToken } from '../firebase/token';
import { useEffect, useState } from 'react';

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const [authState, setAuthState] = useState({ loading: true, authenticated: false, authorized: false });

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token || typeof token !== 'string') {
        console.log("Token inválido ou não encontrado");
        setAuthState({ loading: false, authenticated: false, authorized: false });
        return;
      }

      const decodedToken = await verifyToken(token);

      if (!decodedToken) {
        setAuthState({ loading: false, authenticated: false, authorized: false });
        return;
      }

      // Se não há roles especificadas, permite acesso a qualquer usuário autenticado
      const isAuthorized = allowedRoles.length === 0 || allowedRoles.includes(decodedToken.role);

      setAuthState({
        loading: false,
        authenticated: true,
        authorized: isAuthorized
      });
    };

    checkAuth();
  }, [allowedRoles]);

  if (authState.loading) {
    return <div></div>;
  }

  if (!authState.authenticated) {
    return <Navigate to="/" />;
  }

  if (!authState.authorized) {
    // Redireciona para home se não tem permissão
    return <Navigate to="/home" />;
  }

  return children;
};

export default PrivateRoute;