import { useState, useEffect, useMemo } from "react";
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
  InputAdornment,
  CircularProgress,
  Chip,
  Box,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import PersonIcon from "@mui/icons-material/Person";
import {
  query,
  doc,
  collection,
  updateDoc,
  getDoc,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import db from "../../firebase/db";
import { callCreateUserAccount, callDeleteUserAccount, callResetUserPassword } from '../../firebase/functions';
import { logAudit } from '../../firebase/auditLog';
import LockResetIcon from "@mui/icons-material/LockReset";
import UsuarioDialog from "../../dialogs/UsuarioDialog";
import { verifyToken } from "../../firebase/token";
import AddIcon from "@mui/icons-material/Add";
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import { useDebounce } from "../../hooks/useDebounce";

export default function Usuario() {
  const [allUsers, setAllUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [anchorEls, setAnchorEls] = useState({});
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDeleteId, setUserToDeleteId] = useState(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [userToResetId, setUserToResetId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Carregar dados do usuario logado
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const decodedToken = await verifyToken(token);
          setUserRole(decodedToken.role);
          setUserId(decodedToken.userId);
          setUserName(decodedToken.username || 'Usuário');
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

  // Carregar usuarios com listener em tempo real
  useEffect(() => {
    if (!userRole || !userId) return;

    setLoading(true);

    // Se for usuario comum, carrega apenas seus dados
    if (userRole !== "admin" && userRole !== "editor" && userRole !== "admingeral") {
      const userRef = doc(db, "users", userId);
      getDoc(userRef).then((userSnap) => {
        if (userSnap.exists()) {
          setAllUsers([{ id: userSnap.id, ...userSnap.data() }]);
        }
        setLoading(false);
      });
      return;
    }

    // Para admin/editor/admingeral, carrega todos com listener em tempo real
    const usersCollection = collection(db, "users");
    const q = query(usersCollection, orderBy("full_name_lower"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let usersList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Hierarquia: admin não pode ver admingeral
        if (userRole !== "admingeral") {
          usersList = usersList.filter((u) => u.role !== "admingeral");
        }
        setAllUsers(usersList);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar usuarios:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userRole, userId]);

  // Filtrar usuarios localmente
  const users = useMemo(() => {
    if (!debouncedSearchTerm || debouncedSearchTerm.trim().length === 0) {
      return allUsers;
    }

    const searchWords = debouncedSearchTerm.toLowerCase().trim().split(/\s+/);

    return allUsers.filter((user) => {
      const searchableText = [
        user.username || "",
        user.full_name || "",
        user.full_name_lower || "",
        user.email || "",
        user.rg || "",
        user.OBM || "",
        user.role || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchWords.every((word) => searchableText.includes(word));
    });
  }, [allUsers, debouncedSearchTerm]);

  const handleClearSearch = () => {
    setSearchTerm("");
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
    if (userRole === "admin" || userRole === "admingeral") {
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

    try {
      await callCreateUserAccount({
        username: data.username,
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        role: data.role,
        rg: data.rg,
        telefone: data.telefone,
        obm: data.OBM,
      });
      logAudit({
        action: 'user_create',
        userId,
        userName,
        targetCollection: 'users',
        targetName: data.full_name,
        details: { role: data.role, username: data.username },
      });
      setDialogOpen(false);
      // Listener em tempo real atualiza automaticamente
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      const msg = error?.message || "Erro ao salvar usuário";
      if (msg.includes("já cadastrado") || msg.includes("already-exists")) {
        alert(msg);
      } else {
        alert("Erro ao salvar usuário");
      }
    }
  };

  const handleDelete = (id) => {
    setUserToDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (userRole === "admin" || userRole === "admingeral") {
      // Verifica se o usuário a ser excluído é um administrador
      const userToDelete = users.find((user) => user.id === userToDeleteId);
      if (userToDelete && (userToDelete.role === "admin" || userToDelete.role === "admingeral")) {
        // Conta quantos administradores existem no banco de dados
        const adminCount = users.filter((user) => user.role === "admin" || user.role === "admingeral").length;
        if (adminCount === 1) {
          alert("Não é possível excluir o único administrador do sistema.");
          setDeleteDialogOpen(false);
          return;
        }
      }
      try {
        const deletedUser = users.find(u => u.id === userToDeleteId);
        await callDeleteUserAccount(userToDeleteId);
        logAudit({
          action: 'user_delete',
          userId,
          userName,
          targetCollection: 'users',
          targetId: userToDeleteId,
          targetName: deletedUser?.full_name || deletedUser?.username || userToDeleteId,
        });
      } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        alert("Erro ao excluir usuário");
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
    if (userRole !== "admin" && userRole !== "admingeral") {
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

      await updateDoc(userDocRef, updateData);
      logAudit({
        action: 'user_update',
        userId,
        userName,
        targetCollection: 'users',
        targetId: data.id,
        targetName: data.full_name,
        details: { role: data.role, username: data.username },
      });

      setEditDialogOpen(false);
      setEditData(null);
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      alert("Erro ao atualizar usuário.");
    }
  };

  // Resetar senha do usuário
  const handleResetPassword = (id) => {
    setUserToResetId(id);
    setResetDialogOpen(true);
  };

  const confirmResetPassword = async () => {
    try {
      const resetUser = users.find(u => u.id === userToResetId);
      await callResetUserPassword(userToResetId);
      logAudit({
        action: 'user_password_reset',
        userId,
        userName,
        targetCollection: 'users',
        targetId: userToResetId,
        targetName: resetUser?.full_name || resetUser?.username || userToResetId,
      });
      alert("Senha resetada para 123456. O usuário deverá alterá-la no próximo login.");
    } catch (error) {
      console.error("Erro ao resetar senha:", error);
      alert("Erro ao resetar senha.");
    }
    setResetDialogOpen(false);
    setUserToResetId(null);
  };

  const cancelResetPassword = () => {
    setResetDialogOpen(false);
    setUserToResetId(null);
  };

  return (
    <PrivateRoute>
      <MenuContext>
        <div className="root-protected" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
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
              
              {(userRole === "admin" || userRole === "admingeral") && (
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

            {/* Seção de Pesquisa com Filtro em Tempo Real */}
            {(userRole === "admin" || userRole === "editor" || userRole === "admingeral") && (
              <div style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '16px',
                marginBottom: '20px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e3f2fd'
              }}>
                <TextField
                  size="medium"
                  label="Pesquisar usuários"
                  placeholder="Digite nome, username, email, RG ou OBM..."
                  variant="outlined"
                  fullWidth
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#1976d2' }} />
                        </InputAdornment>
                      ),
                      endAdornment: searchTerm && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={handleClearSearch}>
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                {/* Estatisticas de busca */}
                <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Chip
                    size="small"
                    icon={<PersonIcon />}
                    label={`${users.length} usuário${users.length !== 1 ? 's' : ''}`}
                    color="primary"
                    variant={debouncedSearchTerm ? 'filled' : 'outlined'}
                  />
                  {debouncedSearchTerm && (
                    <Chip
                      size="small"
                      label={`Filtro: "${debouncedSearchTerm}"`}
                      variant="outlined"
                      onDelete={handleClearSearch}
                      sx={{ color: 'text.secondary' }}
                    />
                  )}
                </Box>
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ textAlign: "center", py: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        <CircularProgress size={24} />
                        <Typography variant="body2" color="text.secondary">
                          Carregando usuários...
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ textAlign: "center", py: 4 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <PersonIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                        <Typography variant="body1" color="text.secondary">
                          {debouncedSearchTerm
                            ? `Nenhum usuário encontrado para "${debouncedSearchTerm}"`
                            : "Nenhum usuário cadastrado"}
                        </Typography>
                      </Box>
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

                          {(userRole === "admin" || userRole === "admingeral") && (
                          <Tooltip title="Resetar senha">
                            <IconButton
                              onClick={() => handleResetPassword(user.id)}
                              sx={{
                                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                '&:hover': {
                                  backgroundColor: 'rgba(255, 152, 0, 0.2)',
                                  transform: 'scale(1.05)',
                                },
                                transition: 'all 0.2s ease-in-out',
                              }}
                            >
                              <LockResetIcon sx={{ color: '#ff9800' }} />
                            </IconButton>
                          </Tooltip>
                          )}

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
        <Dialog
          open={resetDialogOpen}
          onClose={cancelResetPassword}
        >
          <DialogTitle>
            {"Resetar Senha?"}
          </DialogTitle>
          <DialogContent>
            <Typography>
              A senha deste usuário será resetada para <strong>123456</strong>. No próximo login, o usuário será obrigado a criar uma nova senha.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelResetPassword} color="primary">
              Cancelar
            </Button>
            <Button onClick={confirmResetPassword} color="warning">
              Resetar
            </Button>
          </DialogActions>
        </Dialog>
      </MenuContext>
    </PrivateRoute>
  );
}