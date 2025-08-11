import { useState, useEffect } from "react";
import {
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Popover,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit"; // Importe o ícone de edição
import SearchIcon from "@mui/icons-material/Search";
import {
  query,
  doc,
  where,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  orderBy,
} from "firebase/firestore";
import db from "../../firebase/db";
import UsuarioDialog from "../../dialogs/UsuarioDialog";
import { verifyToken } from "../../firebase/token";
import AddIcon from "@mui/icons-material/Add";
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";

export default function Usuario() {
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false); // Estado para o diálogo de edição
  const [editData, setEditData] = useState(null); // Estado para os dados do usuário a ser editado
  const [anchorEls, setAnchorEls] = useState({});
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null); // Estado para armazenar o ID do usuário logado
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDeleteId, setUserToDeleteId] = useState(null);
  const [critery, setCritery] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
        const token = localStorage.getItem("token");

        if (token) {
            try {
                const decodedToken = await verifyToken(token);
                setUserRole(decodedToken.role);
                setUserId(decodedToken.userId);
                
                // Carregar dados do usuário imediatamente
                const userRef = doc(db, "users", decodedToken.userId);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    if (decodedToken.role === "admin" || decodedToken.role === "editor") {
                        // Para admin/editor, não carrega nada inicialmente
                        setUsers([]);
                    } else {
                        // Para usuário comum, carrega apenas seus dados
                        setUsers([{ id: userSnap.id, ...userSnap.data() }]);
                    }
                }
            } catch (error) {
                console.error("Erro ao verificar token:", error);
                setUserRole(null);
                setUserId(null);
            }
        } else {
            setUserRole(null);
            setUserId(null);
        }
    };

    fetchUserData();
}, []);

  // Remover este useEffect que faz a busca inicial
  // useEffect(() => {
  //   if (userRole && userId) {
  //     getUsers();  // <-- Remover esta chamada inicial
  //   }
  // }, [userRole, userId]);

  // Modificar a função getUsers para não buscar sem critério
  const getUsers = async (searchCritery = "") => {
    if (!userRole || !userId) {
        setUsers([]);
        return;
    }

    try {
        // Se for usuário comum, retorna pois os dados já foram carregados no useEffect
        if (userRole !== "admin" && userRole !== "editor") {
            return;
        }

        const usersCollection = collection(db, "users");
        let queryRef;

        if (searchCritery.trim()) {
            const searchLower = searchCritery.toLowerCase();
            const start = searchLower;
            const end = searchLower + "\uf8ff";
            
            queryRef = query(
                usersCollection,
                where("full_name_lower", ">=", start),
                where("full_name_lower", "<=", end),
                orderBy("full_name_lower")
            );
        } else {
            queryRef = query(
                usersCollection,
                orderBy("full_name_lower")
            );
        }

        const usersSnapshot = await getDocs(queryRef);
        const usersList = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setUsers(usersList);
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        setUsers([]);
    }
};

  const handlePopoverOpen = (event, userId) => {
    setAnchorEls((prev) => ({
      ...prev,
      [userId]: event.currentTarget,
    }));
  };

  const handlePopoverClose = (userId) => {
    setAnchorEls((prev) => ({
      ...prev,
      [userId]: null,
    }));
  };

  const handleOpenSaveDialog = () => {
    if (userRole === "admin") {
      setDialogOpen(true);
    } else {
      alert(
        "Você não tem permissão para adicionar usuários. Apenas administradores podem realizar esta ação."
      );
    }
  };

  const handleSaveUser = async (data) => {
    if (
      !data.username ||
      !data.full_name ||
      !data.email ||
      !data.password ||
      !data.role ||
      !data.rg ||
      !data.telefone ||
      !data.OBM
    ) {
      alert("Preencha todos os campos");
      return;
    }
    if (data.password !== data.confirmPassword) {
      alert("As senhas não são iguais");
      return;
    }

    const usersCollection = collection(db, "users");
    const usersSnapshot = await getDocs(
      query(usersCollection, where("username", "==", data.username))
    );
    if (!usersSnapshot.empty) {
      alert("Username já cadastrado");
      return;
    }
    const usersSnapshot2 = await getDocs(
      query(usersCollection, where("email", "==", data.email))
    );
    if (!usersSnapshot2.empty) {
      alert("Email já cadastrado");
      return;
    }

    try {
      await addDoc(collection(db, "users"), {
        username: data.username,
        full_name: data.full_name,
        full_name_lower: data.full_name.toLowerCase(),
        email: data.email,
        password: data.password,
        role: data.role,
        rg: data.rg,
        telefone: data.telefone,
        OBM: data.OBM,
        created_at: new Date(),
      });
      setDialogOpen(false);
      getUsers();
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
    }
  };

  const handleDelete = (id) => {
    setUserToDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (userRole === "admin") {
      // Verifica se o usuário a ser excluído é um administrador
      const userToDelete = users.find((user) => user.id === userToDeleteId);
      if (userToDelete && userToDelete.role === "admin") {
        // Conta quantos administradores existem no banco de dados
        const adminCount = users.filter((user) => user.role === "admin").length;
        if (adminCount === 1) {
          alert("Não é possível excluir o único administrador do sistema.");
          setDeleteDialogOpen(false);
          return;
        }
      }
      try {
        const userDocRef = doc(db, "users", userToDeleteId);
        await deleteDoc(userDocRef);
        getUsers();
      } catch (error) {
        console.error("Erro ao excluir usuário:", error);
      }
    } else {
      alert(
        "Você não tem permissão para excluir usuários. Apenas administradores podem realizar esta ação."
      );
    }
    setDeleteDialogOpen(false);
    setUserToDeleteId(null);
  };

  const cancelDeleteUser = () => {
    setDeleteDialogOpen(false);
    setUserToDeleteId(null);
  };

  const handleCopyToClipboard = (user) => {
    const csvText = `Username,Nome,Email,Privilégios,RG,Telefone,OBM,Criado em\n${user.username},${user.full_name},${user.email},${user.role},${user.rg},${user.telefone},${user.OBM},${user.created_at.toDate()}`;
    navigator.clipboard.writeText(csvText);
    alert("CSV copiado para a área de transferência!");
  };

  // Função para abrir o diálogo de edição
  const handleOpenEditDialog = (user) => {
    if (userRole !== "admin") {
      if (user.id !== userId) {
        alert(
          "Você não tem permissão para editar usuários de outros usuários. Apenas administradores podem realizar esta ação."
        );
        return;
      }
    }
    setEditData(user);
    setEditDialogOpen(true);
  };

  // Função para salvar as alterações do usuário
  const handleEditUser = async (data) => {
    try {
      const userDocRef = doc(db, "users", data.id);
      const updateData = {
        username: data.username,
        full_name: data.full_name,
        full_name_lower: data.full_name.toLowerCase(),
        email: data.email,
        role: data.role,
        rg: data.rg,
        telefone: data.telefone,
        OBM: data.OBM,
      };

      if (data.password) {
        updateData.password = data.password;
      }

      await updateDoc(userDocRef, updateData);
      setEditDialogOpen(false);
      setEditData(null);
      getUsers();
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      alert("Erro ao atualizar usuário.");
    }
  };

  const handleEnterKeyDown = (e) => {
    if (e.key === "Enter") {
      getUsers(critery);
    }
  };

  return (
    <PrivateRoute>
      <MenuContext>
        <div className="root-protected" style={{ padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '100%' }}>
            {/* Header Section with Title and Add Button */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '24px',
              padding: '0 4px'
            }}>
              <Typography 
                variant="h4" 
                component="h1" 
                sx={{ 
                  fontWeight: 600,
                  color: '#1a237e',
                  fontSize: { xs: '1.75rem', sm: '2.125rem' }
                }}
              >
                Usuários
              </Typography>
              
              {userRole === "admin" && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenSaveDialog}
                  sx={{
                    backgroundColor: '#1976d2',
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    padding: '10px 24px',
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                    '&:hover': {
                      backgroundColor: '#1565c0',
                      boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  Novo Usuário
                </Button>
              )}
            </div>

            {/* Seção de Pesquisa Moderna */}
            {(userRole === "admin" || userRole === "editor") && (
              <div style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '16px',
                marginBottom: '20px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e3f2fd'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <SearchIcon sx={{ color: '#1976d2', fontSize: '24px' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2' }}>
                    Pesquisar Usuários
                  </Typography>
                </div>
                <TextField
                  size="medium"
                  label="Digite o nome do usuário..."
                  variant="outlined"
                  onKeyDown={handleEnterKeyDown}
                  fullWidth
                  value={critery}
                  onChange={(e) => setCritery(e.target.value)}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      backgroundColor: '#f8f9ff',
                      fontSize: '1rem',
                      '&:hover': {
                        backgroundColor: '#ffffff',
                        boxShadow: '0 2px 8px rgba(25, 118, 210, 0.1)',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#ffffff',
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
                      }
                    }
                  }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <Button
                          variant="contained"
                          onClick={() => getUsers(critery)}
                          sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 600,
                            backgroundColor: '#1976d2',
                            '&:hover': {
                              backgroundColor: '#1565c0',
                            }
                          }}
                        >
                          Pesquisar
                        </Button>
                      ),
                    },
                  }}
                />
              </div>
            )}

            {/* Container da Tabela com ocupação total */}
            <div style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e3f2fd',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                padding: '20px 24px 16px', 
                borderBottom: '1px solid #e3f2fd',
                backgroundColor: '#f8f9ff'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1565c0' }}>
                  📋 Lista de Usuários
                </Typography>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                <Table 
                  size="medium"
                  sx={{
                    '& .MuiTableHead-root': {
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      '& .MuiTableRow-root': {
                        '& .MuiTableCell-root': {
                          backgroundColor: '#e3f2fd',
                          borderBottom: '2px solid #1976d2',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: '#1565c0',
                          padding: '16px',
                        }
                      }
                    },
                    '& .MuiTableBody-root': {
                      '& .MuiTableRow-root': {
                        '&:hover': {
                          backgroundColor: '#f8f9ff',
                        },
                        '& .MuiTableCell-root': {
                          borderBottom: '1px solid #e0e0e0',
                          padding: '16px',
                          fontSize: '0.9rem'
                        }
                      }
                    }
                  }}
                >
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      textAlign: "center",
                      backgroundColor: "#ddeeee",
                      fontWeight: "bold",
                    }}
                  >
                    Username
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "center",
                      backgroundColor: "#ddeeee",
                      fontWeight: "bold",
                    }}
                  >
                    Role
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "center",
                      backgroundColor: "#ddeeee",
                      fontWeight: "bold",
                    }}
                  >
                    Ações
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ textAlign: "center" }}>
                      {userRole === "admin" || userRole === "editor" 
                        ? critery.trim() 
                            ? "Nenhum usuário encontrado" 
                            : "Digite um nome para pesquisar"
                        : "Carregando..."}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell sx={{ textAlign: "center" }}>
                        {user.username}
                      </TableCell>
                      <TableCell sx={{ textAlign: "center" }}>
                        {user.role}
                      </TableCell>
                      <TableCell sx={{ textAlign: "center" }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <Tooltip title="Ver informações completas">
                            <IconButton
                              onMouseEnter={(e) => handlePopoverOpen(e, user.id)}
                              onMouseLeave={() => handlePopoverClose(user.id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyToClipboard(user);
                              }}
                              sx={{
                                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                '&:hover': {
                                  backgroundColor: 'rgba(33, 150, 243, 0.2)',
                                  transform: 'scale(1.05)',
                                },
                                transition: 'all 0.2s ease-in-out',
                              }}
                            >
                              <InfoIcon sx={{ color: '#2196f3' }} />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Editar usuário">
                            <IconButton 
                              onClick={() => handleOpenEditDialog(user)}
                              sx={{
                                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                '&:hover': {
                                  backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                  transform: 'scale(1.05)',
                                },
                                transition: 'all 0.2s ease-in-out',
                              }}
                            >
                              <EditIcon sx={{ color: '#4caf50' }} />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Excluir usuário">
                            <IconButton 
                              onClick={() => handleDelete(user.id)}
                              sx={{
                                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                '&:hover': {
                                  backgroundColor: 'rgba(244, 67, 54, 0.2)',
                                  transform: 'scale(1.05)',
                                },
                                transition: 'all 0.2s ease-in-out',
                              }}
                            >
                              <DeleteIcon sx={{ color: '#f44336' }} />
                            </IconButton>
                          </Tooltip>
                        </div>
                        
                        <Popover
                          id="mouse-over-popover"
                          sx={{
                            pointerEvents: "none",
                          }}
                          open={Boolean(anchorEls[user.id])}
                          anchorEl={anchorEls[user.id]}
                          anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "left",
                          }}
                          transformOrigin={{
                            vertical: "top",
                            horizontal: "left",
                          }}
                          onClose={() => handlePopoverClose(user.id)}
                          disableRestoreFocus
                        >
                          <Typography component="div" sx={{ 
                            p: 2, 
                            minWidth: 300,
                            '& > div': {
                              marginBottom: '8px',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#f5f5f5',
                              fontWeight: 500,
                            }
                          }}>
                            <div><strong>Username:</strong> {user.username}</div>
                            <div><strong>Nome:</strong> {user.full_name}</div>
                            <div><strong>Email:</strong> {user.email}</div>
                            <div><strong>Privilégios:</strong> {user.role}</div>
                            <div><strong>RG:</strong> {user.rg}</div>
                            <div><strong>Telefone:</strong> {user.telefone}</div>
                            <div><strong>OBM:</strong> {user.OBM}</div>
                            <div><strong>Criado em:</strong> {user.created_at?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}</div>
                          </Typography>
                        </Popover>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>


        <UsuarioDialog
          open={dialogOpen}
          onSubmit={handleSaveUser}
          onCancel={() => setDialogOpen(false)}
        />
        {/* Renderiza o diálogo de edição */}
        {editData && (
          <UsuarioDialog
            open={editDialogOpen}
            onSubmit={handleEditUser}
            onCancel={() => {
              setEditDialogOpen(false);
              setEditData(null);
            }}
            editData={editData}
          />
        )}
        <Dialog
          open={deleteDialogOpen}
          onClose={cancelDeleteUser}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">
            {"Excluir Usuário?"}
          </DialogTitle>
          <DialogContent>
            <Typography>
              Tem certeza que deseja excluir este usuário? Esta ação não pode
              ser desfeita.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDeleteUser} color="primary">
              Cancelar
            </Button>
            <Button onClick={confirmDeleteUser} color="error">
              Excluir
            </Button>
          </DialogActions>
        </Dialog>
      </MenuContext>
    </PrivateRoute>
  );
}