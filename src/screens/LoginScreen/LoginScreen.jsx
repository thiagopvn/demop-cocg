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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-50%',
            right: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.1) 0%, transparent 70%)',
            animation: 'pulse 20s ease-in-out infinite'
          }
        }}
      >
        <style>
          {`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.5; }
              50% { transform: scale(1.1); opacity: 0.3; }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-20px); }
            }
            @keyframes slideInFromBottom {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}
        </style>
        
        <Box 
          className="left-login"
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1
          }}
        >
          <Box 
            className="bolacha"
            sx={{
              animation: 'float 6s ease-in-out infinite',
              filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.3))',
              transform: 'scale(0.9)',
              opacity: 0.9
            }}
          >
            <img src={bolacha} alt="bolacha" style={{ width: '100%', height: 'auto' }} />
          </Box>
        </Box>
        
        <Box 
          className="right-login"
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
            padding: '2rem'
          }}
        >
          <Card 
            className="card-login" 
            sx={{ 
              bgcolor: 'rgba(30, 41, 59, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '3rem',
              maxWidth: '450px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(241, 245, 249, 0.1)',
              animation: 'slideInFromBottom 0.5s ease-out'
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Shield sx={{ fontSize: 48, color: '#60a5fa', mb: 2 }} />
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}
              >
                Grupamento Operacional
              </Typography>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  color: 'rgba(241, 245, 249, 0.8)',
                  fontWeight: 300
                }}
              >
                Comando Geral - DMO
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 4, borderColor: 'rgba(241, 245, 249, 0.1)' }} />
            
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
                sx={{ mb: 2 }}
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
                          sx={{ color: 'rgba(241, 245, 249, 0.6)' }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }
                }}
                sx={{ mb: 3 }}
              />
            </Box>
            
            <Button
              color="primary"
              variant="contained"
              onClick={handleLogin}
              fullWidth
              disabled={loading}
              sx={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: '#ffffff',
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                letterSpacing: '0.5px',
                boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.5)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  boxShadow: '0 15px 35px -10px rgba(59, 130, 246, 0.6)',
                  transform: 'translateY(-2px)',
                },
                '&:disabled': {
                  background: 'rgba(241, 245, 249, 0.1)',
                  color: 'rgba(241, 245, 249, 0.3)'
                }
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : (
                'Entrar'
              )}
            </Button>
            
            {loading && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'rgba(241, 245, 249, 0.6)' }}>
                  Autenticando...
                </Typography>
              </Box>
            )}
          </Card>
          
          {!hasUser && (
            <Fab
              sx={{
                position: "absolute",
                bottom: 30,
                right: 30,
                background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                color: 'white',
                boxShadow: '0 10px 30px -10px rgba(245, 158, 11, 0.5)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
                  transform: 'scale(1.1) rotate(90deg)',
                },
                transition: 'all 0.3s ease'
              }}
              variant="circular"
              onClick={navigateToFirstAccess}
            >
              <Settings />
            </Fab>
          )}
        </Box>
        
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
              borderRadius: '12px',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)'
            }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}