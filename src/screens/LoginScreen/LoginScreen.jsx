import { Button, Card, Fab, TextField, InputAdornment, Divider, Typography, Box, IconButton, Snackbar, Alert, CircularProgress } from "@mui/material";
import bolacha from "../../assets/bolacha.png";
import "./LoginScreen.css";
import { generateToken } from "../../firebase/token";
import { firebaseAuthSignIn } from '../../firebase/authSync';
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Person, Settings, Visibility, VisibilityOff } from "@mui/icons-material";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { callVerifyLogin, callCheckHasUsers } from '../../firebase/functions';
import ChangePasswordDialog from '../../dialogs/ChangePasswordDialog';

const loginTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#60a5fa',
      light: '#93c5fd',
      dark: '#3b82f6',
    },
    background: {
      default: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      paper: 'rgba(30, 41, 59, 0.8)'
    },
    text: {
      primary: '#f1f5f9',
      secondary: 'rgba(241, 245, 249, 0.7)'
    }
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '12px',
          transition: 'all 0.3s ease',
          '& input': {
            color: '#f1f5f9',
            paddingLeft: '16px',
            paddingRight: '16px',
            '&::placeholder': {
              color: 'rgba(241, 245, 249, 0.5)'
            }
          },
          '& .MuiInputAdornment-root': {
            '& svg': {
              color: 'rgba(241, 245, 249, 0.6)',
              transition: 'color 0.3s ease'
            }
          },
          '&:hover': {
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#60a5fa',
              borderWidth: '2px'
            },
            '& .MuiInputAdornment-root svg': {
              color: '#60a5fa'
            }
          },
          '&.Mui-focused': {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#60a5fa',
              borderWidth: '2px'
            },
            '& .MuiInputAdornment-root svg': {
              color: '#60a5fa'
            }
          }
        },
        notchedOutline: {
          borderColor: 'rgba(241, 245, 249, 0.2)',
          borderWidth: '1px'
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: 'rgba(241, 245, 249, 0.6)',
          '&.Mui-focused': {
            color: '#60a5fa'
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          textTransform: 'none',
          fontSize: '1rem',
          fontWeight: 600,
          padding: '12px 24px',
          transition: 'all 0.3s ease'
        }
      }
    }
  }
});

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
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <>
    <ThemeProvider theme={loginTheme}>
      <Box 
        className="root-login" 
        sx={{
          minHeight: '100dvh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 30%, #334155 70%, #475569 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: { xs: '0.75rem', sm: '2rem' },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-30%',
            right: '-30%',
            width: '60%',
            height: '60%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
          }
        }}
      >
        <style>
          {`
            @keyframes slideInUp {
              from {
                opacity: 0;
                transform: translateY(50px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}
        </style>
        
        {/* Main login card */}
        <Card 
          className="card-login" 
          sx={{ 
            bgcolor: 'rgba(30, 41, 59, 0.95)',
            borderRadius: '32px',
            padding: '4rem 3rem 3rem 3rem',
            maxWidth: '480px',
            width: '100%',
            position: 'relative',
            zIndex: 3,
            animation: 'slideInUp 0.8s ease-out',
            boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(241, 245, 249, 0.1)',
            border: '1px solid rgba(241, 245, 249, 0.1)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: '32px',
              padding: '1px',
              background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.3), rgba(139, 92, 246, 0.3), transparent)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'subtract',
              maskComposite: 'subtract'
            },
            '@media (max-width: 768px)': {
              padding: '3rem 2rem 2rem 2rem',
              marginTop: '2rem'
            },
            '@media (max-width: 400px)': {
              padding: '2rem 1.25rem 1.5rem 1.25rem',
              borderRadius: '24px',
              marginTop: '1rem'
            }
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box 
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mb: 3
              }}
            >
              <img 
                src={bolacha} 
                alt="bolacha" 
                style={{ 
                  width: '80px', 
                  height: 'auto',
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3)) brightness(1.1) contrast(1.1)'
                }} 
              />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
                letterSpacing: '0.5px',
                fontSize: { xs: '1.3rem', sm: '1.8rem', md: '2.125rem' }
              }}
            >
              Grupamento Operacional do Comando Geral
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: 'rgba(241, 245, 249, 0.9)',
                fontWeight: 400,
                fontSize: { xs: '0.9rem', sm: '1.1rem' }
              }}
            >
              DEMOP
            </Typography>
          </Box>
          
          <Divider 
            sx={{ 
              mb: 4, 
              borderColor: 'rgba(96, 165, 250, 0.3)',
              background: 'linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.5), transparent)',
              height: '1px',
              border: 'none'
            }} 
          />
          
          <Box sx={{ position: 'relative' }}>
            <TextField
              label="RG, Usuário ou E-mail"
              variant="outlined"
              fullWidth
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }
              }}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#60a5fa',
                    borderWidth: '2px',
                    boxShadow: '0 0 20px rgba(96, 165, 250, 0.2)'
                  }
                }
              }}
            />
            
            <TextField
              label="Senha"
              type={showPassword ? "text" : "password"}
              variant="outlined"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ 
                          color: 'rgba(241, 245, 249, 0.6)',
                          '&:hover': {
                            color: '#60a5fa',
                            backgroundColor: 'rgba(96, 165, 250, 0.1)'
                          }
                        }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              }}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#60a5fa',
                    borderWidth: '2px',
                    boxShadow: '0 0 20px rgba(96, 165, 250, 0.2)'
                  }
                }
              }}
            />
          </Box>
          
          <Button
            color="primary"
            variant="contained"
            onClick={handleLogin}
            fullWidth
            disabled={loading}
            sx={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #f59e0b 100%)',
              backgroundSize: '200% 200%',
              color: '#ffffff',
              py: { xs: 1.2, sm: 1.8 },
              fontSize: { xs: '1rem', sm: '1.2rem' },
              fontWeight: 700,
              letterSpacing: '0.8px',
              borderRadius: '16px',
              boxShadow: '0 15px 35px -10px rgba(59, 130, 246, 0.6)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #f97316 100%)',
                backgroundSize: '200% 200%',
                boxShadow: '0 20px 45px -10px rgba(59, 130, 246, 0.8)',
                transform: 'translateY(-3px) scale(1.02)',
              },
              '&:active': {
                transform: 'translateY(-1px) scale(1.01)',
              },
              '&:disabled': {
                background: 'rgba(241, 245, 249, 0.1)',
                color: 'rgba(241, 245, 249, 0.3)'
              }
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={24} sx={{ color: 'white' }} />
                <Typography sx={{ color: 'white', fontWeight: 600 }}>
                  Autenticando...
                </Typography>
              </Box>
            ) : (
              'Entrar no Sistema'
            )}
          </Button>
        </Card>
        
        {!hasUser && (
          <Fab
            sx={{
              position: "fixed",
              bottom: 40,
              right: 40,
              background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
              color: 'white',
              boxShadow: '0 15px 35px -10px rgba(245, 158, 11, 0.6)',
              zIndex: 4,
              '&:hover': {
                background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
                transform: 'scale(1.15) rotate(180deg)',
                boxShadow: '0 20px 45px -10px rgba(245, 158, 11, 0.8)',
              },
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            variant="circular"
            onClick={navigateToFirstAccess}
          >
            <Settings />
          </Fab>
        )}
        
        <Snackbar
          open={openSnackbar}
          autoHideDuration={4000}
          onClose={() => setOpenSnackbar(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setOpenSnackbar(false)} 
            severity="error" 
            sx={{ 
              width: '100%',
              borderRadius: '16px',
              boxShadow: '0 15px 35px -10px rgba(239, 68, 68, 0.4)',
              backgroundColor: '#ef4444'
            }}
          >
            {error}
          </Alert>
        </Snackbar>

        {/* Watermark */}
        <Typography
          sx={{
            position: 'fixed',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: { xs: '8px', sm: '10px' },
            color: '#000',
            zIndex: 1000,
            userSelect: 'none',
            fontWeight: 400,
            textAlign: 'center'
          }}
        >
          Desenvolvido pelo ASP OF BM Thiago Santos
        </Typography>

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