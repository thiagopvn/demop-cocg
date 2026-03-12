import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  TextField,
  Button,
  Chip,
  Snackbar,
  Alert,
  Avatar,
  Divider,
  IconButton,
  CircularProgress,
  alpha,
} from "@mui/material";
import {
  Person,
  Email,
  Phone,
  Badge,
  Business,
  Lock,
  Edit,
  Save,
  Cancel,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import db from "../../firebase/db";
import { verifyToken } from "../../firebase/token";
import MenuContext from "../../contexts/MenuContext";
import ChangePasswordDialog from "../../dialogs/ChangePasswordDialog";

const roleConfig = {
  admingeral: { label: "Admin Geral", color: "#d32f2f" },
  admin: { label: "Administrador", color: "#ed6c02" },
  editor: { label: "Editor", color: "#2e7d32" },
  user: { label: "Usuário", color: "#1976d2" },
};

function getInitials(fullName) {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(value) {
  if (!value) return "---";
  try {
    const date = value.toDate ? value.toDate() : new Date(value);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "---";
  }
}

export default function Perfil() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userId, setUserId] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    telefone: "",
  });
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Load user data from JWT + Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const decoded = await verifyToken(token);
        if (!decoded || !decoded.userId) {
          setLoading(false);
          return;
        }
        setUserId(decoded.userId);
        const userRef = doc(db, "users", decoded.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = { id: userSnap.id, ...userSnap.data() };
          setUserData(data);
          setEditForm({
            full_name: data.full_name || "",
            email: data.email || "",
            telefone: data.telefone || "",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        setSnackbar({
          open: true,
          message: "Erro ao carregar dados do perfil.",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleEditToggle = () => {
    if (editing) {
      // Cancel editing - reset form
      setEditForm({
        full_name: userData?.full_name || "",
        email: userData?.email || "",
        telefone: userData?.telefone || "",
      });
    }
    setEditing(!editing);
  };

  const handleInputChange = (field) => (e) => {
    setEditForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        full_name: editForm.full_name,
        email: editForm.email,
        telefone: editForm.telefone,
      });
      setUserData((prev) => ({
        ...prev,
        full_name: editForm.full_name,
        email: editForm.email,
        telefone: editForm.telefone,
      }));
      setEditing(false);
      setSnackbar({
        open: true,
        message: "Perfil atualizado com sucesso!",
        severity: "success",
      });
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      setSnackbar({
        open: true,
        message: "Erro ao salvar alterações. Tente novamente.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = (_, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const role = userData?.role || "user";
  const rc = roleConfig[role] || roleConfig.user;

  return (
    <MenuContext>
      <Box
        sx={{
          minHeight: "100dvh",
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
          p: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Box sx={{ maxWidth: 720, mx: "auto" }}>
          {/* Page Title */}
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              color: theme.palette.primary.main,
              mb: 3,
              fontSize: { xs: "1.5rem", sm: "2rem" },
            }}
          >
            Meu Perfil
          </Typography>

          {loading ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                py: 8,
              }}
            >
              <CircularProgress size={32} />
              <Typography variant="body1" color="text.secondary">
                Carregando perfil...
              </Typography>
            </Box>
          ) : !userData ? (
            <Card
              sx={{
                p: 4,
                textAlign: "center",
                borderRadius: "16px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              }}
            >
              <Typography variant="body1" color="text.secondary">
                Dados do perfil não encontrados.
              </Typography>
            </Card>
          ) : (
            <>
              {/* Profile Header Card */}
              <Card
                sx={{
                  borderRadius: "16px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  overflow: "hidden",
                  mb: 3,
                }}
              >
                {/* Banner */}
                <Box
                  sx={{
                    height: { xs: 100, sm: 120 },
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.dark, 0.9)} 100%)`,
                    position: "relative",
                  }}
                />

                {/* Avatar + Name */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    mt: { xs: "-48px", sm: "-56px" },
                    pb: 3,
                    px: 3,
                  }}
                >
                  <Avatar
                    sx={{
                      width: { xs: 96, sm: 112 },
                      height: { xs: 96, sm: 112 },
                      fontSize: { xs: "2rem", sm: "2.5rem" },
                      fontWeight: 700,
                      bgcolor: rc.color,
                      border: "4px solid #fff",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                      mb: 2,
                    }}
                  >
                    {getInitials(userData.full_name)}
                  </Avatar>

                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: theme.palette.text.primary,
                      textAlign: "center",
                      fontSize: { xs: "1.25rem", sm: "1.5rem" },
                    }}
                  >
                    {userData.full_name || userData.username}
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", mb: 1.5 }}
                  >
                    @{userData.username}
                  </Typography>

                  <Chip
                    label={rc.label}
                    sx={{
                      bgcolor: alpha(rc.color, 0.1),
                      color: rc.color,
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      height: 32,
                      border: `1px solid ${alpha(rc.color, 0.3)}`,
                    }}
                  />

                  {userData.created_at && (
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", mt: 1.5 }}
                    >
                      Membro desde {formatDate(userData.created_at)}
                    </Typography>
                  )}
                </Box>
              </Card>

              {/* Info Card */}
              <Card
                sx={{
                  borderRadius: "16px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  p: { xs: 2.5, sm: 3.5 },
                  mb: 3,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: theme.palette.primary.main }}
                  >
                    Informações Pessoais
                  </Typography>
                  <IconButton
                    onClick={handleEditToggle}
                    sx={{
                      bgcolor: editing
                        ? alpha("#d32f2f", 0.1)
                        : alpha(theme.palette.primary.main, 0.1),
                      "&:hover": {
                        bgcolor: editing
                          ? alpha("#d32f2f", 0.2)
                          : alpha(theme.palette.primary.main, 0.2),
                      },
                      transition: "all 0.2s ease-in-out",
                    }}
                  >
                    {editing ? (
                      <Cancel sx={{ color: "#d32f2f" }} />
                    ) : (
                      <Edit sx={{ color: theme.palette.primary.main }} />
                    )}
                  </IconButton>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  {/* Full Name - Editable */}
                  <FieldRow
                    icon={<Person />}
                    label="Nome Completo"
                    value={userData.full_name}
                    editing={editing}
                    editValue={editForm.full_name}
                    onChange={handleInputChange("full_name")}
                    theme={theme}
                  />

                  <Divider sx={{ my: 0.5 }} />

                  {/* Email - Editable */}
                  <FieldRow
                    icon={<Email />}
                    label="E-mail"
                    value={userData.email}
                    editing={editing}
                    editValue={editForm.email}
                    onChange={handleInputChange("email")}
                    type="email"
                    theme={theme}
                  />

                  <Divider sx={{ my: 0.5 }} />

                  {/* Phone - Editable */}
                  <FieldRow
                    icon={<Phone />}
                    label="Telefone"
                    value={userData.telefone}
                    editing={editing}
                    editValue={editForm.telefone}
                    onChange={handleInputChange("telefone")}
                    theme={theme}
                  />

                  <Divider sx={{ my: 0.5 }} />

                  {/* Username - Read Only */}
                  <FieldRow
                    icon={<Person />}
                    label="Usuário"
                    value={userData.username}
                    readOnly
                    theme={theme}
                  />

                  <Divider sx={{ my: 0.5 }} />

                  {/* RG - Read Only */}
                  <FieldRow
                    icon={<Badge />}
                    label="RG"
                    value={userData.rg}
                    readOnly
                    theme={theme}
                  />

                  <Divider sx={{ my: 0.5 }} />

                  {/* OBM - Read Only */}
                  <FieldRow
                    icon={<Business />}
                    label="OBM"
                    value={userData.OBM}
                    readOnly
                    theme={theme}
                  />
                </Box>

                {/* Save Button */}
                {editing && (
                  <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      variant="contained"
                      startIcon={
                        saving ? (
                          <CircularProgress size={18} sx={{ color: "#fff" }} />
                        ) : (
                          <Save />
                        )
                      }
                      onClick={handleSave}
                      disabled={saving}
                      sx={{
                        borderRadius: "12px",
                        fontWeight: 600,
                        px: 4,
                        py: 1.2,
                        textTransform: "none",
                        fontSize: "0.95rem",
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                        "&:hover": {
                          boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                          transform: "translateY(-2px)",
                        },
                        "&:disabled": {
                          background: "#ccc",
                        },
                        transition: "all 0.2s ease-in-out",
                      }}
                    >
                      {saving ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </Box>
                )}
              </Card>

              {/* Security Card */}
              <Card
                sx={{
                  borderRadius: "16px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  p: { xs: 2.5, sm: 3.5 },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.primary.main,
                    mb: 2.5,
                  }}
                >
                  Segurança
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: { xs: "flex-start", sm: "center" },
                    justifyContent: "space-between",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                    p: 2,
                    borderRadius: "12px",
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                      }}
                    >
                      <Lock
                        sx={{
                          color: theme.palette.primary.main,
                          fontSize: 20,
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 600, color: "text.primary" }}
                      >
                        Senha
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Altere sua senha de acesso ao sistema
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<Lock />}
                    onClick={() => setChangePasswordOpen(true)}
                    sx={{
                      borderRadius: "12px",
                      fontWeight: 600,
                      textTransform: "none",
                      borderColor: theme.palette.primary.main,
                      color: theme.palette.primary.main,
                      px: 3,
                      py: 1,
                      "&:hover": {
                        borderColor: theme.palette.primary.dark,
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        transform: "translateY(-1px)",
                      },
                      transition: "all 0.2s ease-in-out",
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    Alterar Senha
                  </Button>
                </Box>
              </Card>
            </>
          )}
        </Box>
      </Box>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />

      {/* Snackbar Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: "12px" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MenuContext>
  );
}

/** Reusable row component for displaying a labeled field */
function FieldRow({
  icon,
  label,
  value,
  editing = false,
  editValue,
  onChange,
  readOnly = false,
  type = "text",
  theme,
}) {
  const showEdit = editing && !readOnly;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: { xs: "flex-start", sm: "center" },
        gap: 2,
        flexDirection: { xs: showEdit ? "column" : "row", sm: "row" },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          flexShrink: 0,
        }}
      >
        {icon &&
          React.cloneElement(icon, {
            sx: { color: theme.palette.primary.main, fontSize: 20 },
          })}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, width: { xs: "100%", sm: "auto" } }}>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontSize: "0.7rem",
          }}
        >
          {label}
        </Typography>
        {showEdit ? (
          <TextField
            fullWidth
            size="small"
            type={type}
            value={editValue}
            onChange={onChange}
            sx={{
              mt: 0.5,
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                backgroundColor: "#fff",
                "&:hover": { backgroundColor: "#f8f9ff" },
                "&.Mui-focused": { backgroundColor: "#fff" },
              },
            }}
          />
        ) : (
          <Typography
            variant="body1"
            sx={{
              fontWeight: 500,
              color: value ? "text.primary" : "text.disabled",
              wordBreak: "break-word",
            }}
          >
            {value || "---"}
          </Typography>
        )}
      </Box>
      {readOnly && (
        <Chip
          label="Somente leitura"
          size="small"
          sx={{
            fontSize: "0.65rem",
            height: 22,
            bgcolor: alpha("#9e9e9e", 0.1),
            color: "#757575",
            display: { xs: "none", sm: "flex" },
          }}
        />
      )}
    </Box>
  );
}
