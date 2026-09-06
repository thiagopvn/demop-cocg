import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  InputAdornment,
  Typography,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  Fab,
  Tooltip,
  alpha,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  Lock,
  Person,
  Settings,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  WhatsApp,
  Inventory2Outlined,
  LocalShippingOutlined,
  BuildOutlined,
  WarehouseOutlined,
  ShieldOutlined,
} from "@mui/icons-material";
import bolacha from "../../assets/bolacha.png";
import brasao from "../../assets/brasao.png";
import "./LoginScreen.css";
import { generateToken } from "../../firebase/token";
import { firebaseAuthSignIn } from "../../firebase/authSync";
import { callVerifyLogin, callCheckHasUsers } from "../../firebase/functions";
import ChangePasswordDialog from "../../dialogs/ChangePasswordDialog";

const NAVY = "#1e3a5f";
const NAVY_DARK = "#0b1a2e";
const LARANJA = "#ff6b35";
const WHATSAPP = "5521967586628";
const WHATSAPP_EXIBIDO = "(21) 96758-6628";

const loginTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: NAVY, dark: "#152a45", light: "#2d5a87", contrastText: "#fff" },
    secondary: { main: LARANJA, dark: "#e85a24", contrastText: "#fff" },
    background: { default: "#f4f6fa", paper: "#ffffff" },
    text: { primary: "#0f172a", secondary: "#475569" },
  },
  shape: { borderRadius: 12 },
  typography: { fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif" },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: "#f8fafc",
          transition: "all 0.2s ease",
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: alpha(NAVY, 0.6) },
          "&.Mui-focused": { backgroundColor: "#fff", boxShadow: `0 0 0 4px ${alpha(NAVY, 0.12)}` },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: NAVY, borderWidth: 2 },
        },
        notchedOutline: { borderColor: "#dbe2ea" },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { "&.Mui-focused": { color: NAVY } } } },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 14, textTransform: "none", fontWeight: 700, fontSize: "1rem", padding: "13px 24px" },
      },
    },
  },
});

const DESTAQUES = [
  { icon: Inventory2Outlined, titulo: "Cautela e devolução", texto: "Controle de quem está com cada material, com assinatura digital." },
  { icon: LocalShippingOutlined, titulo: "Viaturas", texto: "Materiais alocados por viatura e conferências periódicas." },
  { icon: WarehouseOutlined, titulo: "Locais no DEMOP", texto: "Prateleiras, box, gavetas e armários. Saiba onde cada item está." },
  { icon: BuildOutlined, titulo: "Manutenção", texto: "Cronograma, recorrência e histórico de cada equipamento." },
];

export default function LoginScreen() {
  const [hasUser, setHasUser] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const result = await callCheckHasUsers();
        if (result.hasUsers) {
          setHasUser(true);
        }
      } catch (err) {
        console.error("Erro ao verificar usuários:", err);
      }
    };
    fetchUser();
  }, []);

  const navigateToFirstAccess = () => {
    navigate("/first-access");
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Por favor, preencha todos os campos");
      setOpenSnackbar(true);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userData = await callVerifyLogin(username, password);

      const token = await generateToken({ userId: userData.userId, username: userData.username, role: userData.role });
      await firebaseAuthSignIn(userData.customToken);
      localStorage.setItem("token", token);

      if (userData.mustChangePassword) {
        setLoading(false);
        setShowChangePassword(true);
        return;
      }

      navigate("/home");
    } catch (err) {
      const message = err?.message || "Erro ao fazer login. Tente novamente.";
      if (message.includes("não encontrado")) {
        setError("Usuário não encontrado");
      } else if (message.includes("incorreta")) {
        setError("Senha incorreta");
      } else if (message.includes("desativada") || message.includes("Conta desativada")) {
        setError("Conta desativada. Entre em contato com o administrador.");
      } else {
        setError("Erro ao fazer login. Tente novamente.");
      }
      setOpenSnackbar(true);
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  const linkWhatsApp = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Olá! Preciso de ajuda com o sistema DEMOP GOCG.")}`;

  const rodape = (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.25, mt: { xs: 3, md: 0 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box component="img" src={brasao} alt="" sx={{ width: 22, height: 22, opacity: 0.9 }} />
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, letterSpacing: "0.02em" }}>
          Desenvolvido pelo 2º Ten BM Thiago Santos
        </Typography>
      </Box>
      <Chip
        component="a"
        href={linkWhatsApp}
        target="_blank"
        rel="noopener noreferrer"
        clickable
        icon={<WhatsApp sx={{ fontSize: 18, color: "#fff !important" }} />}
        label={`Dúvidas ou suporte: ${WHATSAPP_EXIBIDO}`}
        sx={{
          bgcolor: "#25D366",
          color: "#fff",
          fontWeight: 700,
          fontSize: "0.78rem",
          height: 32,
          px: 0.5,
          boxShadow: "0 8px 20px rgba(37, 211, 102, 0.35)",
          transition: "all 0.2s ease",
          "&:hover": { bgcolor: "#1ebe5b", transform: "translateY(-2px)" },
        }}
      />
      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.68rem", letterSpacing: "0.06em" }}>
        © {new Date().getFullYear()} CBMERJ · GOCG · Todos os direitos reservados
      </Typography>
    </Box>
  );

  return (
    <>
      <ThemeProvider theme={loginTheme}>
        <Box
          className="root-login"
          sx={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            background: `radial-gradient(1200px 600px at 10% 0%, ${alpha("#2d5a87", 0.55)} 0%, transparent 60%), radial-gradient(900px 500px at 90% 100%, ${alpha(LARANJA, 0.22)} 0%, transparent 60%), linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DARK} 100%)`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Padrao de fundo discreto */}
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              opacity: 0.35,
              backgroundImage: "radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
              maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), rgba(0,0,0,0.2))",
              pointerEvents: "none",
            }}
          />

          {/* Painel institucional */}
          <Box
            sx={{
              flex: { md: 1.1 },
              position: "relative",
              zIndex: 1,
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              justifyContent: { xs: "flex-start", md: "space-between" },
              px: { xs: 3, sm: 5, md: 8 },
              pt: { xs: "calc(28px + env(safe-area-inset-top, 0px))", md: 7 },
              pb: { xs: 2, md: 6 },
              animation: "loginFadeIn 0.7s ease-out both",
            }}
          >
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: { xs: 74, md: 96 },
                    height: { xs: 74, md: 96 },
                    borderRadius: "50%",
                    p: "3px",
                    background: `linear-gradient(135deg, ${LARANJA} 0%, rgba(255,255,255,0.55) 100%)`,
                    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
                    flexShrink: 0,
                  }}
                >
                  <Box component="img" src={bolacha} alt="GOCG" sx={{ width: "100%", height: "100%", borderRadius: "50%", display: "block", bgcolor: "#fff" }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.55rem", md: "2.2rem" }, letterSpacing: "0.06em", lineHeight: 1 }}>
                    DEMOP <Box component="span" sx={{ color: LARANJA }}>GOCG</Box>
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: { xs: "0.78rem", md: "0.95rem" }, color: "rgba(255,255,255,0.78)", fontWeight: 500, lineHeight: 1.3 }}>
                    Depósito de Material Operacional
                    <br />
                    Grupamento Operacional do Comando Geral · CBMERJ
                  </Typography>
                </Box>
              </Box>

              <Typography
                sx={{
                  display: { xs: "none", md: "block" },
                  mt: 6,
                  fontWeight: 800,
                  fontSize: "2rem",
                  lineHeight: 1.15,
                  maxWidth: 520,
                  letterSpacing: "-0.01em",
                }}
              >
                Controle de cautela, estoque e manutenção em um só lugar.
              </Typography>

              <Box sx={{ display: { xs: "none", md: "grid" }, gridTemplateColumns: "1fr 1fr", gap: 2, mt: 4, maxWidth: 620 }}>
                {DESTAQUES.map((d) => {
                  const Icon = d.icon;
                  return (
                    <Box
                      key={d.titulo}
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        bgcolor: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        backdropFilter: "blur(8px)",
                        transition: "transform 0.2s ease, background-color 0.2s ease",
                        "&:hover": { transform: "translateY(-3px)", bgcolor: "rgba(255,255,255,0.1)" },
                      }}
                    >
                      <Box sx={{ width: 38, height: 38, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: alpha(LARANJA, 0.18), color: LARANJA, mb: 1.25 }}>
                        <Icon fontSize="small" />
                      </Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>{d.titulo}</Typography>
                      <Typography sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", mt: 0.5, lineHeight: 1.45 }}>{d.texto}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Box sx={{ display: { xs: "none", md: "block" } }}>{rodape}</Box>
          </Box>

          {/* Painel do formulario */}
          <Box
            sx={{
              flex: { md: 0.9 },
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              px: { xs: 2, sm: 4, md: 6 },
              pb: { xs: "calc(24px + env(safe-area-inset-bottom, 0px))", md: 6 },
              pt: { xs: 1, md: 6 },
            }}
          >
            <Box
              component="form"
              onSubmit={(e) => { e.preventDefault(); handleLogin(); }}
              sx={{
                width: "100%",
                maxWidth: 440,
                bgcolor: "background.paper",
                borderRadius: { xs: 4, md: 5 },
                p: { xs: 3, sm: 4.5 },
                boxShadow: "0 30px 70px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.35)",
                animation: "loginSlideUp 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both",
                animationDelay: "0.12s",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                <ShieldOutlined sx={{ color: NAVY }} />
                <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.4rem", sm: "1.6rem" }, color: "text.primary", letterSpacing: "-0.01em" }}>
                  Acesso ao sistema
                </Typography>
              </Box>
              <Typography sx={{ color: "text.secondary", fontSize: "0.92rem", mb: 3.5 }}>
                Entre com o seu RG e a senha cadastrada.
              </Typography>

              <TextField
                fullWidth
                label="RG"
                placeholder="Digite o seu RG"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyPress}
                autoComplete="username"
                autoFocus
                sx={{ mb: 2.25 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person sx={{ color: alpha(NAVY, 0.55) }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                fullWidth
                label="Senha"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyPress}
                autoComplete="current-password"
                sx={{ mb: 3 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: alpha(NAVY, 0.55) }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                sx={{
                  py: 1.6,
                  fontSize: "1.02rem",
                  background: `linear-gradient(135deg, ${NAVY} 0%, #2d5a87 100%)`,
                  boxShadow: `0 14px 28px -10px ${alpha(NAVY, 0.7)}`,
                  transition: "all 0.25s ease",
                  "&:hover": { background: `linear-gradient(135deg, #152a45 0%, ${NAVY} 100%)`, transform: "translateY(-2px)", boxShadow: `0 18px 34px -10px ${alpha(NAVY, 0.8)}` },
                  "&.Mui-disabled": { background: alpha(NAVY, 0.4), color: "#fff" },
                }}
              >
                {loading ? "Entrando..." : "Entrar no Sistema"}
              </Button>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 3, p: 1.5, borderRadius: 3, bgcolor: alpha(NAVY, 0.05), border: `1px solid ${alpha(NAVY, 0.1)}` }}>
                <Lock sx={{ fontSize: 18, color: alpha(NAVY, 0.6) }} />
                <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", lineHeight: 1.4 }}>
                  Esqueceu a senha ou ainda não tem acesso? Fale com o administrador do DEMOP.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: { xs: "block", md: "none" } }}>{rodape}</Box>
          </Box>

          {!hasUser && (
            <Tooltip title="Configurar primeiro acesso" placement="left">
              <Fab
                onClick={navigateToFirstAccess}
                sx={{
                  position: "fixed",
                  bottom: { xs: "calc(20px + env(safe-area-inset-bottom, 0px))", md: 32 },
                  right: { xs: 20, md: 32 },
                  zIndex: 4,
                  background: `linear-gradient(135deg, ${LARANJA} 0%, #ef4444 100%)`,
                  color: "#fff",
                  boxShadow: "0 15px 35px -10px rgba(255, 107, 53, 0.7)",
                  transition: "all 0.3s ease",
                  "&:hover": { transform: "scale(1.08) rotate(90deg)" },
                }}
              >
                <Settings />
              </Fab>
            </Tooltip>
          )}

          <Snackbar
            open={openSnackbar}
            autoHideDuration={4000}
            onClose={() => setOpenSnackbar(false)}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Alert
              onClose={() => setOpenSnackbar(false)}
              severity="error"
              variant="filled"
              sx={{ width: "100%", borderRadius: 3, boxShadow: "0 15px 35px -10px rgba(239, 68, 68, 0.5)", fontWeight: 600 }}
            >
              {error}
            </Alert>
          </Snackbar>
        </Box>
      </ThemeProvider>

      <ChangePasswordDialog
        open={showChangePassword}
        forced={true}
        onClose={(success) => {
          if (success) {
            setShowChangePassword(false);
            navigate("/home");
          }
        }}
      />
    </>
  );
}
