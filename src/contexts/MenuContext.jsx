import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import brasao from '../assets/brasao.png';
import "./context.css";
import { Home, Group, Handyman, FireTruck, Category, Loop, Logout, Menu, Close, AssignmentReturn, Inventory, Search } from '@mui/icons-material'; // Adicionei Menu e Close
import ButtonMenu from '../components/ButtonMenu.jsx/ButtonMenu';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, Fab, Tooltip, LinearProgress } from '@mui/material';
import UserInfo from '../components/UserInfo';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import db from '../firebase/db';
import DeleteIcon from '@mui/icons-material/Delete';
import { verifyToken } from '../firebase/token';

export default function MenuContext({ children }) {
  const [active, setActive] = React.useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Estado para controlar o menu hambúrguer
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false); // Estado para o diálogo de limpeza
  const [userRole, setUserRole] = useState(null);
  const [isCleaning, setIsCleaning] = useState(false); // Estado para controlar a exibição da barra de progresso

  useEffect(() => {
    const fetchUserRole = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const decodedToken = await verifyToken(token);
          setUserRole(decodedToken.role);
        } catch (error) {
          console.error("Erro ao verificar token:", error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, []);

  useEffect(() => {
    if (location.pathname === '/home') {
      setActive(0);
    } else if (location.pathname === '/usuario') {
      setActive(1);
    }
    else if (location.pathname === '/material') {
      setActive(2);
    }
    else if (location.pathname === '/viaturas') {
      setActive(3);
    }
    else if (location.pathname === '/categoria') {
      setActive(4);
    }
    else if (location.pathname === '/movimentacoes') {
      setActive(5);
    }
    else if (location.pathname === '/') {
      setActive(6);
    }
    else if (location.pathname === '/devolucoes') {
      setActive(7);
    }

    else if (location.pathname === '/aneis') {
      setActive(8);
    }
    else if (location.pathname === '/search') {
      setActive(9);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  }

  const handleOpenDialog = () => {
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
  };

  const handleConfirmLogout = () => {
    handleLogout();
    handleCloseDialog();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false); // Fecha o menu ao navegar
  };

  const handleOpenCleanupDialog = () => {
    setCleanupDialogOpen(true);
  };

  const handleCloseCleanupDialog = () => {
    setCleanupDialogOpen(false);
  };

  const handleConfirmCleanup = async () => {
    if (userRole === "admin") {
      setIsCleaning(true); // Inicia a limpeza e exibe a barra de progresso
      try {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

        const movimentacoesCollection = collection(db, "movimentacoes");
        const querySnapshot = await getDocs(movimentacoesCollection);

        for (const docSnapshot of querySnapshot.docs) { // Usar loop for...of para permitir async/await
          const data = docSnapshot.data();
          if (data.date && data.status && (data.status === "devolvido" || data.status === "descartado")) {
            const date = data.date.toDate(); // Converter Timestamp para Date
            if (date <= twoYearsAgo) {
              await deleteDoc(doc(db, "movimentacoes", docSnapshot.id));
              console.log(`Movimentação com ID ${docSnapshot.id} excluída.`);
            }
          }
        }

        console.log("Limpeza concluída.");
      } catch (error) {
        console.error("Erro ao executar limpeza:", error);
      } finally {
        setIsCleaning(false); // Finaliza a limpeza e oculta a barra de progresso
        handleCloseCleanupDialog();
      }
    } else {
      alert("Você não tem permissão para limpar movimentações antigas. Apenas administradores podem realizar esta ação.");
      handleCloseCleanupDialog();
    }
  };

  return (
    <>

      {/* Ícone do Hambúrguer para mobile */}
      <div className="hamburger-icon" onClick={toggleMobileMenu}>
        {isMobileMenuOpen ? <Close /> : <Menu />}
      </div>

      <nav className={`main-nav ${isMobileMenuOpen ? 'active' : ''}`}>
        <ButtonMenu Icon={Home} label="Home" onClick={() => handleNavigation("/home")} active={active === 0} />
        <ButtonMenu Icon={Loop} label="Movimentação" onClick={() => handleNavigation("/movimentacoes")} active={active === 5} />
        <ButtonMenu Icon={AssignmentReturn} label="Devoluções" onClick={() => handleNavigation("/devolucoes")} active={active === 7} />
        <ButtonMenu Icon={Handyman} label="Material" onClick={() => handleNavigation("/material")} active={active === 2} />
        <ButtonMenu Icon={FireTruck} label="Viaturas" onClick={() => handleNavigation("/viaturas")} active={active === 3} />
        <ButtonMenu Icon={Category} label="Categoria" onClick={() => handleNavigation("/categoria")} active={active === 4} />
        <ButtonMenu Icon={Group} label="Usuarios" onClick={() => handleNavigation("/usuario")} active={active === 1} />
        <ButtonMenu Icon={Inventory} label="Aneis" onClick={() => handleNavigation("/aneis")} active={active === 8} />
        <ButtonMenu Icon={Search} label="Pesquisar" onClick={() => handleNavigation("/search")} active={active === 9} />
        <ButtonMenu Icon={Logout} label="Logout" onClick={handleOpenDialog} active={active === 6} />
      </nav>
      {children}

      <UserInfo />
      <Dialog
        open={open}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Confirmar Logout"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Tem certeza que deseja sair?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary" variant='outlined' fullWidth>
            Não
          </Button>
          <Button onClick={handleConfirmLogout} color="primary" variant='contained' autoFocus fullWidth>
            Sim
          </Button>
        </DialogActions>
      </Dialog>

      {userRole === "admin" && (
        <Tooltip title="Limpar Movimentações Antigas" aria-label="cleanup">
          <Fab
            size='small'
            color="error"
            aria-label="cleanup"
            sx={{
              position: 'fixed',
              bottom: 50,
              left: 100,
            }}
            onClick={handleOpenCleanupDialog}
          >
            <DeleteIcon />
          </Fab>
        </Tooltip>
      )}

      <Dialog
        open={cleanupDialogOpen}
        onClose={handleCloseCleanupDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Limpar Movimentações Antigas?"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Tem certeza que deseja excluir todas as movimentações com mais de 2 anos e status "devolvido" ou "descartado"? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCleanupDialog} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleConfirmCleanup} color="error">
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {isCleaning && <LinearProgress />} {/* Exibe a barra de progresso durante a limpeza */}

      <footer>
        <img src={brasao} alt
          ="Brasão Bombeiros" width={20} />
        <p>&copy; 2025 Todos os direitos reservados.</p>
      </footer>
    </>
  );
}