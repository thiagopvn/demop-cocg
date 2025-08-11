import { Button, Card, Fab, TextField, InputAdornment, Divider, Typography, Box, IconButton, Snackbar, Alert, CircularProgress } from "@mui/material";
import bolacha from "../../assets/bolacha.png";
import "./LoginScreen.css";
import db from "../../firebase/db";
import { generateToken } from "../../firebase/token";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Lock, Person, Settings, Visibility, VisibilityOff, Shield } from "@mui/icons-material";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {addViaturaDescription, cautelas, getDictMaterialsNameCode, PopulateMateriais} from '../../firebase/populate';

export default function LoginScreen() {
  const [hasUser, setHasUser] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const navigate = useNavigate();

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
            backdropFilter: 'blur(10px)',
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

  useEffect(() => {
    const fetchUser = async () => {
      const users = await getDocs(collection(db, "users"));
      if (users.docs.length > 0) {
        setHasUser(true);
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
      const qUsername = query(
        collection(db, "users"),
        where("username", "==", username)
      );
      const qEmail = query(
        collection(db, "users"),
        where("email", "==", username)
      );
      
      let users = await getDocs(qUsername);
      if (users.empty) {
        users = await getDocs(qEmail);
      }
      
      if (users.empty) {
        setError("Usuário não encontrado");
        setOpenSnackbar(true);
        setLoading(false);
        return;
      }
      
      const user = users.docs[0].data();
      const userId = users.docs[0].id;
      const role = user.role;

      if (user.password !== password) {
        setError("Senha incorreta");
        setOpenSnackbar(true);
        setLoading(false);
        return;
      }

      const token = await generateToken({ userId: userId, username: user.username, role: role });
      localStorage.setItem("token", token);
      navigate("/home");
    } catch (err) {
      setError("Erro ao fazer login. Tente novamente.");
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
    <ThemeProvider theme={loginTheme}>
      <Box 
        className="root-login" 
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 30%, #334155 70%, #475569 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: '2rem',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%)',
            animation: 'pulse 15s ease-in-out infinite'
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-30%',
            right: '-30%',
            width: '60%',
            height: '60%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
            animation: 'pulse 20s ease-in-out infinite reverse'
          }
        }}
      >
        <style>
          {`
            @keyframes pulse {
              0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.4; }
              50% { transform: scale(1.2) rotate(180deg); opacity: 0.2; }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              33% { transform: translateY(-15px) rotate(2deg); }
              66% { transform: translateY(-5px) rotate(-1deg); }
            }
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
            @keyframes shimmer {
              0% { background-position: -200px 0; }
              100% { background-position: 200px 0; }
            }
            @keyframes glow {
              0%, 100% { box-shadow: 0 25px 50px -12px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(241, 245, 249, 0.1); }
              50% { box-shadow: 0 35px 70px -12px rgba(59, 130, 246, 0.5), 0 0 0 1px rgba(96, 165, 250, 0.3); }
            }
            @keyframes particles {
              0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.4; }
              25% { transform: translateY(-100px) translateX(50px) rotate(90deg); opacity: 0.8; }
              50% { transform: translateY(-50px) translateX(-30px) rotate(180deg); opacity: 0.2; }
              75% { transform: translateY(-150px) translateX(-50px) rotate(270deg); opacity: 0.6; }
            }
          `}
        </style>
        
        {/* Floating particles */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '4px',
            height: '4px',
            background: 'rgba(96, 165, 250, 0.6)',
            borderRadius: '50%',
            animation: 'particles 25s linear infinite',
            zIndex: 1
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '20%',
            right: '15%',
            width: '6px',
            height: '6px',
            background: 'rgba(139, 92, 246, 0.5)',
            borderRadius: '50%',
            animation: 'particles 30s linear infinite 5s',
            zIndex: 1
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '15%',
            left: '20%',
            width: '3px',
            height: '3px',
            background: 'rgba(96, 165, 250, 0.7)',
            borderRadius: '50%',
            animation: 'particles 20s linear infinite 10s',
            zIndex: 1
          }}
        />
        
        
        {/* Main login card */}
        <Card 
          className="card-login" 
          sx={{ 
            bgcolor: 'rgba(30, 41, 59, 0.85)',
            backdropFilter: 'blur(25px)',
            borderRadius: '32px',
            padding: '4rem 3rem 3rem 3rem',
            maxWidth: '480px',
            width: '100%',
            position: 'relative',
            zIndex: 3,
            animation: 'slideInUp 0.8s ease-out, glow 4s ease-in-out infinite',
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
            }
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box 
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mb: 3,
                animation: 'float 6s ease-in-out infinite'
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
                backgroundSize: '200% 200%',
                animation: 'shimmer 3s ease-in-out infinite',
                mb: 1,
                letterSpacing: '0.5px'
              }}
            >
              Grupamento Operacional do Comando Geral
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'rgba(241, 245, 249, 0.9)',
                fontWeight: 400,
                fontSize: '1.1rem'
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
              label="Usuário ou E-mail"
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
              py: 1.8,
              fontSize: '1.2rem',
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
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(239, 68, 68, 0.9)'
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
            right: 8,
            fontSize: '9px',
            color: 'rgba(241, 245, 249, 0.3)',
            zIndex: 1000,
            userSelect: 'none',
            fontWeight: 300,
            textAlign: 'right'
          }}
        >
          desenvolvido por ASP OF BM Thiago Santos
        </Typography>
      </Box>
    </ThemeProvider>
  );
}