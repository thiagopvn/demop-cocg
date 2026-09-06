import { useState, useEffect, useMemo } from "react";
import {
  IconButton, Table, TableHead, TableBody, TableRow, TableCell, Typography, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, InputAdornment, Chip, Box, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Paper, Drawer, Skeleton, Snackbar, Alert,
  FormControl, InputLabel, Select, alpha, useTheme, useMediaQuery,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import PersonIcon from "@mui/icons-material/Person";
import HistoryIcon from "@mui/icons-material/History";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import LockResetIcon from "@mui/icons-material/LockReset";
import AddIcon from "@mui/icons-material/Add";
import GroupsIcon from "@mui/icons-material/Groups";
import ShieldIcon from "@mui/icons-material/Shield";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import BadgeIcon from "@mui/icons-material/Badge";
import BusinessIcon from "@mui/icons-material/Business";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { query, doc, collection, updateDoc, getDoc, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import db from "../../firebase/db";
import { callCreateUserAccount, callDeleteUserAccount, callResetUserPassword } from "../../firebase/functions";
import { logAudit } from "../../firebase/auditLog";
import UsuarioDialog from "../../dialogs/UsuarioDialog";
import HistoricoDialog from "../../dialogs/HistoricoDialog";
import { verifyToken } from "../../firebase/token";
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import { useDebounce } from "../../hooks/useDebounce";
import UserAvatar, { ROLE_COLORS, ROLE_LABELS } from "../../components/UserAvatar";
import { compressAvatar, uploadImageFile, deleteStorageFile } from "../../utils/imageUpload";

const ORDEM_PAPEIS = ["admingeral", "admin", "chefe", "BensPatrimoniais", "user"];

export default function Usuario() {
  const [allUsers, setAllUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDeleteId, setUserToDeleteId] = useState(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [userToResetId, setUserToResetId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoTarget, setHistoricoTarget] = useState(null);
  const [toggleActiveDialogOpen, setToggleActiveDialogOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [menuUser, setMenuUser] = useState(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [filtroPapel, setFiltroPapel] = useState("");
  const [filtroObm, setFiltroObm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [ordem, setOrdem] = useState("nome");
  const [visiveis, setVisiveis] = useState(60);
  const [detalheId, setDetalheId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const notificar = (message, severity = "info") => setSnackbar({ open: true, message, severity });

  const handleMenuOpen = (event, user) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuUser(user);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuUser(null);
  };

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
    if (userRole !== "admin" && userRole !== "admingeral") {
      const userRef = doc(db, "users", userId);
      getDoc(userRef).then((userSnap) => {
        if (userSnap.exists()) {
          setAllUsers([{ id: userSnap.id, ...userSnap.data() }]);
        }
        setLoading(false);
      });
      return;
    }

    // Para admin/admingeral, carrega todos com listener em tempo real
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
  useEffect(() => { setVisiveis(60); }, [debouncedSearchTerm, filtroPapel, filtroObm, filtroStatus, ordem]);

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


  const handleOpenSaveDialog = () => {
    if (userRole === "admin" || userRole === "admingeral") {
      setDialogOpen(true);
    } else {
      notificar("Apenas administradores podem adicionar usuários.", "warning");
    }
  };

  const handleSaveUser = async (data) => {
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
        throw new Error(msg);
      } else {
        throw new Error("Erro ao salvar usuário");
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
          notificar("Não é possível excluir o único administrador do sistema.", "warning");
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
        notificar("Erro ao excluir usuário", "error");
      }
    } else {
      notificar("Você não tem permissão para excluir usuários. Apenas administradores podem realizar esta ação.", "warning");
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
    notificar("Dados copiados para a área de transferência.", "success");
  };

  // Função para abrir o diálogo de edição
  const handleOpenEditDialog = (user) => {
    if (userRole !== "admin" && userRole !== "admingeral") {
      if (user.id !== userId) {
        notificar("Você não tem permissão para editar usuários de outros usuários. Apenas administradores podem realizar esta ação.", "warning");
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

      // Foto do militar: undefined = sem mudanca, null = remover, File = nova
      if (data.fotoFile !== undefined) {
        const anterior = editData?.foto_storagePath;
        if (data.fotoFile === null) {
          updateData.foto_url = null;
          updateData.foto_storagePath = null;
          await deleteStorageFile(anterior);
        } else {
          const comprimida = await compressAvatar(data.fotoFile, 512);
          const storagePath = `usuarios/${data.id}/avatar_${Date.now()}.jpg`;
          const { downloadURL } = await uploadImageFile(comprimida, storagePath);
          updateData.foto_url = downloadURL;
          updateData.foto_storagePath = storagePath;
          if (anterior && anterior !== storagePath) await deleteStorageFile(anterior);
        }
        updateData.foto_atualizada_em = serverTimestamp();
      }

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
      throw new Error("Erro ao atualizar usuário.");
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
      notificar("Senha resetada para 123456. O usuário deverá alterá-la no próximo login.", "warning");
    } catch (error) {
      console.error("Erro ao resetar senha:", error);
      notificar("Erro ao resetar senha.", "warning");
    }
    setResetDialogOpen(false);
    setUserToResetId(null);
  };

  const cancelResetPassword = () => {
    setResetDialogOpen(false);
    setUserToResetId(null);
  };

  // Histórico de alterações
  const handleOpenHistorico = (user) => {
    setHistoricoTarget({ id: user.id, name: user.full_name || user.username });
    setHistoricoOpen(true);
  };

  // Ativar/Desativar usuário
  const handleToggleActive = (user) => {
    setUserToToggle(user);
    setToggleActiveDialogOpen(true);
  };

  const confirmToggleActive = async () => {
    if (!userToToggle) return;
    try {
      const userDocRef = doc(db, "users", userToToggle.id);
      const newStatus = userToToggle.ativo === false ? true : false;
      await updateDoc(userDocRef, { ativo: newStatus });
      logAudit({
        action: newStatus ? 'user_activate' : 'user_deactivate',
        userId,
        userName,
        targetCollection: 'users',
        targetId: userToToggle.id,
        targetName: userToToggle.full_name || userToToggle.username,
      });
    } catch (error) {
      console.error("Erro ao alterar status do usuário:", error);
      notificar("Erro ao alterar status do usuário.", "error");
    }
    setToggleActiveDialogOpen(false);
    setUserToToggle(null);
  };

  // ==================== Derivados da nova interface ====================
  const isAdmin = userRole === "admin" || userRole === "admingeral";
  const isAdminGeral = userRole === "admingeral";

  const obms = useMemo(() => [...new Set(allUsers.map((u) => u.OBM).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")), [allUsers]);

  const estatisticas = useMemo(() => {
    const porPapel = {};
    let ativos = 0;
    for (const u of allUsers) {
      porPapel[u.role] = (porPapel[u.role] || 0) + 1;
      if (u.ativo !== false) ativos += 1;
    }
    return { total: allUsers.length, ativos, inativos: allUsers.length - ativos, porPapel };
  }, [allUsers]);

  const usuariosVisiveis = useMemo(() => {
    let lista = users;
    if (filtroPapel) lista = lista.filter((u) => u.role === filtroPapel);
    if (filtroObm) lista = lista.filter((u) => (u.OBM || "") === filtroObm);
    if (filtroStatus === "ativos") lista = lista.filter((u) => u.ativo !== false);
    if (filtroStatus === "inativos") lista = lista.filter((u) => u.ativo === false);
    lista = [...lista];
    if (ordem === "recentes") {
      lista.sort((a, b) => (b.created_at?.toDate?.()?.getTime() || 0) - (a.created_at?.toDate?.()?.getTime() || 0));
    } else if (ordem === "obm") {
      lista.sort((a, b) => (a.OBM || "").localeCompare(b.OBM || "", "pt-BR") || (a.full_name || "").localeCompare(b.full_name || "", "pt-BR"));
    } else {
      const numerico = (u) => (/^\d/.test(u.full_name || u.username || "") ? 1 : 0);
      lista.sort((a, b) => numerico(a) - numerico(b) || (a.full_name || a.username || "").localeCompare(b.full_name || b.username || "", "pt-BR"));
    }
    return lista;
  }, [users, filtroPapel, filtroObm, filtroStatus, ordem]);

  const paginaAtual = usuariosVisiveis.slice(0, visiveis);
  const filtrosAtivos = Boolean(filtroPapel || filtroObm || filtroStatus !== "todos" || debouncedSearchTerm);
  const detalhe = detalheId ? allUsers.find((u) => u.id === detalheId) : null;

  const limparFiltros = () => { setFiltroPapel(""); setFiltroObm(""); setFiltroStatus("todos"); setSearchTerm(""); };
  const abrirDetalhe = (u) => { setDetalheId(u.id); };
  const fecharDetalhe = () => setDetalheId(null);

  const formatarData = (v) => { const d = v?.toDate ? v.toDate() : null; return d ? d.toLocaleDateString("pt-BR") : "—"; };

  const acoesDoUsuario = (u) => (
    <>
      <MenuItem onClick={() => { handleOpenEditDialog(u); handleMenuClose(); fecharDetalhe(); }}>
        <ListItemIcon><EditIcon fontSize="small" color="primary" /></ListItemIcon>
        <ListItemText>Editar dados</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => { handleResetPassword(u.id); handleMenuClose(); }}>
        <ListItemIcon><LockResetIcon fontSize="small" sx={{ color: "warning.main" }} /></ListItemIcon>
        <ListItemText>Resetar senha</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => { handleToggleActive(u); handleMenuClose(); }}>
        <ListItemIcon>{u.ativo === false ? <CheckCircleIcon fontSize="small" color="success" /> : <BlockIcon fontSize="small" sx={{ color: "warning.main" }} />}</ListItemIcon>
        <ListItemText>{u.ativo === false ? "Reativar acesso" : "Desativar acesso"}</ListItemText>
      </MenuItem>
      {isAdminGeral && (
        <MenuItem onClick={() => { handleOpenHistorico(u); handleMenuClose(); }}>
          <ListItemIcon><HistoryIcon fontSize="small" sx={{ color: "#9c27b0" }} /></ListItemIcon>
          <ListItemText>Histórico completo</ListItemText>
        </MenuItem>
      )}
      <MenuItem onClick={() => { handleCopyToClipboard(u); handleMenuClose(); }}>
        <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Copiar dados (CSV)</ListItemText>
      </MenuItem>
      <Divider />
      <MenuItem onClick={() => { handleDelete(u.id); handleMenuClose(); fecharDetalhe(); }} sx={{ color: "error.main" }}>
        <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
        <ListItemText>Excluir usuário</ListItemText>
      </MenuItem>
    </>
  );

  const papelChip = (role, tamanho = "small") => (
    <Chip
      label={ROLE_LABELS[role] || role || "—"}
      size={tamanho}
      sx={{ height: tamanho === "small" ? 22 : 26, fontSize: tamanho === "small" ? "0.68rem" : "0.75rem", fontWeight: 700, bgcolor: alpha(ROLE_COLORS[role] || ROLE_COLORS.user, 0.12), color: ROLE_COLORS[role] || ROLE_COLORS.user, border: `1px solid ${alpha(ROLE_COLORS[role] || ROLE_COLORS.user, 0.35)}` }}
    />
  );

  const statusChip = (u) => (
    u.ativo === false
      ? <Chip label="Inativo" size="small" sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700, bgcolor: alpha(theme.palette.error.main, 0.12), color: theme.palette.error.main }} />
      : <Chip label="Ativo" size="small" sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700, bgcolor: alpha(theme.palette.success.main, 0.12), color: theme.palette.success.dark }} />
  );

  const cartaoEstatistica = (rotulo, valor, cor, ativo, onClick, icone) => (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: { xs: 1.25, sm: 1.75 },
        borderRadius: 3,
        minWidth: { xs: 140, sm: 0 },
        flex: { xs: "0 0 auto", sm: 1 },
        cursor: onClick ? "pointer" : "default",
        border: `1px solid ${ativo ? cor : alpha(theme.palette.divider, 1)}`,
        boxShadow: ativo ? `0 0 0 3px ${alpha(cor, 0.15)}` : "none",
        background: `linear-gradient(160deg, ${alpha(cor, 0.1)} 0%, ${alpha(cor, 0.02)} 100%)`,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": onClick ? { transform: "translateY(-2px)", boxShadow: `0 10px 24px ${alpha(cor, 0.18)}` } : {},
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>{rotulo}</Typography>
        <Box sx={{ width: 28, height: 28, borderRadius: 1.5, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: alpha(cor, 0.15), color: cor }}>{icone}</Box>
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.35rem", sm: "1.6rem" }, lineHeight: 1.1, mt: 0.5 }}>{valor}</Typography>
    </Paper>
  );

  return (
    <PrivateRoute>
      <MenuContext>
        <Box sx={{ p: { xs: 1, sm: 3 } }}>
          {/* Cabecalho */}
          <Box sx={{ display: "flex", alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 2, mb: 2.5, flexDirection: { xs: "column", sm: "row" } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, color: "#fff", boxShadow: `0 8px 18px ${alpha(theme.palette.primary.main, 0.3)}` }}>
                <GroupsIcon />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.2rem", sm: "1.5rem" }, lineHeight: 1.1, letterSpacing: "-0.01em" }}>Usuários</Typography>
                <Typography variant="caption" color="text.secondary">
                  {loading ? "Carregando..." : `${estatisticas.total} cadastrados · ${estatisticas.ativos} com acesso ativo`}
                </Typography>
              </Box>
            </Box>
            {isAdmin && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenSaveDialog} sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700, px: 2.5, py: 1.1, boxShadow: 2, alignSelf: { xs: "stretch", sm: "auto" } }}>
                Novo usuário
              </Button>
            )}
          </Box>

          {/* Estatisticas (clique filtra) */}
          {isAdmin && (
            <Box sx={{ display: "flex", gap: { xs: 1, sm: 1.5 }, mb: 2.5, overflowX: { xs: "auto", sm: "visible" }, pb: { xs: 0.5, sm: 0 } }}>
              {cartaoEstatistica("Todos", estatisticas.total, theme.palette.primary.main, !filtroPapel && filtroStatus === "todos", () => { setFiltroPapel(""); setFiltroStatus("todos"); }, <GroupsIcon fontSize="small" />)}
              {cartaoEstatistica("Ativos", estatisticas.ativos, theme.palette.success.main, filtroStatus === "ativos", () => setFiltroStatus(filtroStatus === "ativos" ? "todos" : "ativos"), <CheckCircleIcon fontSize="small" />)}
              {cartaoEstatistica("Inativos", estatisticas.inativos, theme.palette.error.main, filtroStatus === "inativos", () => setFiltroStatus(filtroStatus === "inativos" ? "todos" : "inativos"), <BlockIcon fontSize="small" />)}
              {ORDEM_PAPEIS.filter((r) => estatisticas.porPapel[r]).map((r) =>
                <Box key={r} sx={{ display: "contents" }}>
                  {cartaoEstatistica(ROLE_LABELS[r], estatisticas.porPapel[r], ROLE_COLORS[r], filtroPapel === r, () => setFiltroPapel(filtroPapel === r ? "" : r), <ShieldIcon fontSize="small" />)}
                </Box>
              )}
            </Box>
          )}

          {/* Barra de busca e filtros */}
          <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 1)}` }}>
            <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", alignItems: "center" }}>
              <TextField
                size="small"
                placeholder="Buscar por nome, RG, usuário, e-mail ou OBM..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setSearchTerm(""); }}
                sx={{ flex: 1, minWidth: { xs: "100%", sm: 260 }, "& .MuiOutlinedInput-root": { borderRadius: 999, bgcolor: alpha(theme.palette.text.primary, 0.03) } }}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, endAdornment: searchTerm ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm("")}><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null } }}
              />
              {isAdmin && (
                <>
                  <FormControl size="small" sx={{ minWidth: 150, flex: { xs: 1, sm: "0 0 auto" } }}>
                    <InputLabel>Papel</InputLabel>
                    <Select label="Papel" value={filtroPapel} onChange={(e) => setFiltroPapel(e.target.value)} sx={{ borderRadius: 999 }}>
                      <MenuItem value="">Todos</MenuItem>
                      {ORDEM_PAPEIS.filter((r) => isAdminGeral || r !== "admingeral").map((r) => <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 150, flex: { xs: 1, sm: "0 0 auto" } }}>
                    <InputLabel>OBM</InputLabel>
                    <Select label="OBM" value={filtroObm} onChange={(e) => setFiltroObm(e.target.value)} sx={{ borderRadius: 999 }} MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}>
                      <MenuItem value="">Todas</MenuItem>
                      {obms.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 150, flex: { xs: 1, sm: "0 0 auto" } }}>
                    <InputLabel>Ordenar</InputLabel>
                    <Select label="Ordenar" value={ordem} onChange={(e) => setOrdem(e.target.value)} sx={{ borderRadius: 999 }}>
                      <MenuItem value="nome">Nome A → Z</MenuItem>
                      <MenuItem value="obm">OBM</MenuItem>
                      <MenuItem value="recentes">Mais recentes</MenuItem>
                    </Select>
                  </FormControl>
                </>
              )}
              {filtrosAtivos && (
                <Chip label="Limpar filtros" size="small" icon={<ClearIcon />} onClick={limparFiltros} sx={{ fontWeight: 600 }} />
              )}
            </Box>
            {!loading && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                {usuariosVisiveis.length === allUsers.length ? `${usuariosVisiveis.length} usuários` : `${usuariosVisiveis.length} de ${allUsers.length} usuários`}
              </Typography>
            )}
          </Paper>

          {/* Lista */}
          {loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: 2.5 }} />)}
            </Box>
          ) : paginaAtual.length === 0 ? (
            <Paper elevation={0} sx={{ p: 5, textAlign: "center", borderRadius: 3, border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}` }}>
              <PersonIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
              <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>Nenhum usuário encontrado</Typography>
              <Typography variant="body2" color="text.disabled">Ajuste a busca ou os filtros.</Typography>
            </Paper>
          ) : isMobile ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {paginaAtual.map((u) => (
                <Paper
                  key={u.id}
                  elevation={0}
                  onClick={() => abrirDetalhe(u)}
                  sx={{ p: 1.5, borderRadius: 2.5, border: `1px solid ${alpha(theme.palette.divider, 1)}`, display: "flex", alignItems: "center", gap: 1.25, opacity: u.ativo === false ? 0.6 : 1, cursor: "pointer", "&:active": { transform: "scale(0.99)" } }}
                >
                  <UserAvatar src={u.foto_url} name={u.full_name || u.username} role={u.role} size={44} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>{u.full_name || u.username}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>RG {u.rg || u.username || "—"}{u.OBM ? ` · ${u.OBM}` : ""}</Typography>
                    <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>{papelChip(u.role)}{u.ativo === false && statusChip(u)}</Box>
                  </Box>
                  {isAdmin && (
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleMenuOpen(e, u); }} aria-label="Mais ações"><MoreVertIcon /></IconButton>
                  )}
                </Paper>
              ))}
            </Box>
          ) : (
            <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 1)}`, overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 960 }}>
                <TableHead>
                  <TableRow sx={{ "& th": { bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.25 : 0.07), fontWeight: 800, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "text.secondary", py: 1.25 } }}>
                    <TableCell>Militar</TableCell>
                    <TableCell>RG</TableCell>
                    <TableCell>OBM</TableCell>
                    <TableCell>Papel</TableCell>
                    <TableCell>Contato</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Cadastro</TableCell>
                    {isAdmin && <TableCell align="right">Ações</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginaAtual.map((u) => (
                    <TableRow key={u.id} hover onClick={() => abrirDetalhe(u)} sx={{ cursor: "pointer", opacity: u.ativo === false ? 0.6 : 1, "& td": { py: 1 } }}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                          <UserAvatar src={u.foto_url} name={u.full_name || u.username} role={u.role} size={36} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>{u.full_name || u.username}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>@{u.username}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>{u.rg || "—"}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{u.OBM || "—"}</Typography></TableCell>
                      <TableCell>{papelChip(u.role)}</TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ display: "block" }} noWrap>{u.telefone || "—"}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", maxWidth: 200 }}>{u.email || ""}</Typography>
                      </TableCell>
                      <TableCell>{statusChip(u)}</TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">{formatarData(u.created_at)}</Typography></TableCell>
                      {isAdmin && (
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => handleOpenEditDialog(u)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Mais ações"><IconButton size="small" onClick={(e) => handleMenuOpen(e, u)}><MoreVertIcon fontSize="small" /></IconButton></Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}

          {!loading && usuariosVisiveis.length > visiveis && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Button variant="outlined" onClick={() => setVisiveis((v) => v + 60)} sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 600, px: 4 }}>
                Carregar mais ({usuariosVisiveis.length - visiveis} restantes)
              </Button>
            </Box>
          )}
        </Box>

        {/* Menu de acoes */}
        <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose} PaperProps={{ sx: { borderRadius: 2.5, minWidth: 220 } }}>
          {menuUser && acoesDoUsuario(menuUser)}
        </Menu>

        {/* Painel de detalhe do usuario */}
        <Drawer
          anchor={isMobile ? "bottom" : "right"}
          open={Boolean(detalhe)}
          onClose={fecharDetalhe}
          PaperProps={{ sx: { width: { xs: "100%", md: 420 }, borderTopLeftRadius: isMobile ? 24 : 0, borderTopRightRadius: isMobile ? 24 : 0, maxHeight: isMobile ? "90dvh" : "100%", pb: isMobile ? "calc(16px + env(safe-area-inset-bottom, 0px))" : 0 } }}
        >
          {detalhe && (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <Box sx={{ position: "relative", p: 3, pb: 2, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #0f2440 100%)`, color: "#fff" }}>
                <IconButton onClick={fecharDetalhe} size="small" sx={{ position: "absolute", top: 10, right: 10, color: "#fff", bgcolor: alpha("#fff", 0.12) }}><ClearIcon fontSize="small" /></IconButton>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ p: "3px", borderRadius: "50%", background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, rgba(255,255,255,0.6) 100%)` }}>
                    <UserAvatar src={detalhe.foto_url} name={detalhe.full_name || detalhe.username} role={detalhe.role} size={72} sx={{ border: "3px solid #0f2440" }} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", lineHeight: 1.2 }}>{detalhe.full_name || detalhe.username}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.75, display: "block" }}>@{detalhe.username}</Typography>
                    <Box sx={{ display: "flex", gap: 0.5, mt: 0.75, flexWrap: "wrap" }}>
                      <Chip label={ROLE_LABELS[detalhe.role] || detalhe.role} size="small" sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700, bgcolor: alpha(ROLE_COLORS[detalhe.role] || ROLE_COLORS.user, 0.3), color: "#fff", border: `1px solid ${alpha(ROLE_COLORS[detalhe.role] || ROLE_COLORS.user, 0.8)}` }} />
                      <Chip label={detalhe.ativo === false ? "Inativo" : "Ativo"} size="small" sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700, bgcolor: alpha(detalhe.ativo === false ? theme.palette.error.main : theme.palette.success.main, 0.35), color: "#fff" }} />
                    </Box>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ p: 2.5, flex: 1, overflowY: "auto" }}>
                {[
                  ["RG", detalhe.rg || "—", <BadgeIcon fontSize="small" key="rg" />],
                  ["OBM", detalhe.OBM || "—", <BusinessIcon fontSize="small" key="obm" />],
                  ["Telefone", detalhe.telefone || "—", <PhoneIcon fontSize="small" key="tel" />],
                  ["E-mail", detalhe.email || "—", <EmailIcon fontSize="small" key="mail" />],
                  ["Cadastrado em", formatarData(detalhe.created_at), <CalendarTodayIcon fontSize="small" key="cad" />],
                ].map(([rotulo, valor, icone]) => (
                  <Box key={rotulo} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}` }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: 1.5, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: alpha(theme.palette.primary.main, 0.08), color: "primary.main", flexShrink: 0 }}>{icone}</Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2, fontWeight: 600 }}>{rotulo}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>{valor}</Typography>
                    </Box>
                  </Box>
                ))}
                {detalhe.telefone && (
                  <Button component="a" href={`https://wa.me/55${String(detalhe.telefone).replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" size="small" startIcon={<WhatsAppIcon />} sx={{ mt: 1.5, borderRadius: 2, textTransform: "none", fontWeight: 700, color: "#128C7E" }}>
                    Chamar no WhatsApp
                  </Button>
                )}
              </Box>
              {isAdmin && (
                <Box sx={{ p: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 1)}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                  <Button variant="contained" startIcon={<EditIcon />} onClick={() => { handleOpenEditDialog(detalhe); fecharDetalhe(); }} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>Editar</Button>
                  <Button variant="outlined" color="warning" startIcon={<LockResetIcon />} onClick={() => handleResetPassword(detalhe.id)} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>Resetar senha</Button>
                  <Button variant="outlined" color={detalhe.ativo === false ? "success" : "inherit"} startIcon={detalhe.ativo === false ? <CheckCircleIcon /> : <BlockIcon />} onClick={() => handleToggleActive(detalhe)} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>{detalhe.ativo === false ? "Reativar" : "Desativar"}</Button>
                  {isAdminGeral ? (
                    <Button variant="outlined" startIcon={<HistoryIcon />} onClick={() => handleOpenHistorico(detalhe)} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, color: "#9c27b0", borderColor: alpha("#9c27b0", 0.5) }}>Histórico</Button>
                  ) : (
                    <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => handleCopyToClipboard(detalhe)} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>Copiar CSV</Button>
                  )}
                  <Button variant="text" color="error" startIcon={<DeleteIcon />} onClick={() => { handleDelete(detalhe.id); fecharDetalhe(); }} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, gridColumn: "span 2" }}>Excluir usuário</Button>
                </Box>
              )}
            </Box>
          )}
        </Drawer>

        <UsuarioDialog
          open={dialogOpen}
          onSubmit={handleSaveUser}
          onCancel={() => setDialogOpen(false)}
        />
        {editDialogOpen && (
          <UsuarioDialog
            open={editDialogOpen}
            onSubmit={handleEditUser}
            onCancel={() => { setEditDialogOpen(false); setEditData(null); }}
            editData={editData}
          />
        )}

        <Dialog open={deleteDialogOpen} onClose={cancelDeleteUser} PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Excluir usuário?</DialogTitle>
          <DialogContent>
            <Typography>Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.</Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={cancelDeleteUser} sx={{ textTransform: "none" }}>Cancelar</Button>
            <Button onClick={confirmDeleteUser} color="error" variant="contained" sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}>Excluir</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={resetDialogOpen} onClose={cancelResetPassword} PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Resetar senha?</DialogTitle>
          <DialogContent>
            <Typography>A senha deste usuário será resetada para <strong>123456</strong>. No próximo login, o usuário será obrigado a criar uma nova senha.</Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={cancelResetPassword} sx={{ textTransform: "none" }}>Cancelar</Button>
            <Button onClick={confirmResetPassword} color="warning" variant="contained" sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}>Resetar</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={toggleActiveDialogOpen} onClose={() => { setToggleActiveDialogOpen(false); setUserToToggle(null); }} PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>{userToToggle?.ativo === false ? "Ativar usuário?" : "Desativar usuário?"}</DialogTitle>
          <DialogContent>
            <Typography>
              {userToToggle?.ativo === false
                ? `Deseja reativar o acesso de "${userToToggle?.full_name || userToToggle?.username}"? O usuário poderá fazer login novamente.`
                : `Deseja desativar o acesso de "${userToToggle?.full_name || userToToggle?.username}"? O usuário não poderá mais fazer login, mas seus dados serão mantidos.`}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => { setToggleActiveDialogOpen(false); setUserToToggle(null); }} sx={{ textTransform: "none" }}>Cancelar</Button>
            <Button onClick={confirmToggleActive} variant="contained" color={userToToggle?.ativo === false ? "success" : "warning"} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}>
              {userToToggle?.ativo === false ? "Ativar" : "Desativar"}
            </Button>
          </DialogActions>
        </Dialog>

        <HistoricoDialog
          open={historicoOpen}
          onClose={() => { setHistoricoOpen(false); setHistoricoTarget(null); }}
          targetId={historicoTarget?.id}
          targetName={historicoTarget?.name}
          tipo="usuario"
        />

        <Snackbar open={snackbar.open} autoHideDuration={4500} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
          <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
        </Snackbar>
      </MenuContext>
    </PrivateRoute>
  );
}
