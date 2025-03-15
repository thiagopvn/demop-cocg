import { Button, Card, Fab, TextField, InputAdornment, Divider, Typography } from "@mui/material";
import bolacha from "../../assets/bolacha.png";
import "./LoginScreen.css";
import db from "../../firebase/db";
import { generateToken } from "../../firebase/token";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Lock, Person, Settings } from "@mui/icons-material";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {cautelas, getDictMaterialsNameCode, PopulateMateriais} from '../../firebase/populate';
export default function LoginScreen() {
  const [hasUser, setHasUser] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const loginTheme = createTheme({
    palette: {
      mode: 'dark',
      background: {
        default: 'rgb(22,48,102)',
        paper: 'rgb(22,48,102)'
      },
      text: {
        primary: '#ffffff',
        secondary: 'rgba(255, 255, 255, 0.7)'
      }
    },
    components: {
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            '& input': {
              color: '#ffffff',
              paddingLeft: '24px',
              paddingRight: '24px'
            },
            '& .MuiInputAdornment-root': {
              marginRight: '8px',
              '& svg': {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            },
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.5)'
              }
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#90caf9'
              }
            }
          },
          notchedOutline: {
            borderColor: 'rgba(255, 255, 255, 0.3)'
          }
        }
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: 'rgba(255, 255, 255, 0.7)',
            '&.Mui-focused': {
              color: '#90caf9'
            }
          }
        }
      },
    
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
      alert("Usuário não encontrado");
      return;
    }
    const user = users.docs[0].data();
    const userId = users.docs[0].id;
    const role = user.role;

    if (user.password !== password) {
      alert("Senha incorreta");
      return;
    }

    const token = await generateToken({ userId: userId, username: user.username, role: role });
    localStorage.setItem("token", token);
    navigate("/home");
  };

  return (
    <ThemeProvider theme={loginTheme}>
      <div className="root-login">
        <div className="left-login">
          <div className="bolacha">
            <img src={bolacha} alt="bolacha" />
          </div>
        </div>
        <div className="right-login">
          <Card className="card-login" sx={{ bgcolor: 'background.paper' }}>
              <Typography variant="h5" align="center" gutterBottom>
              Grupamento Operacional do Comando Geral
              </Typography>
              <Divider/>
              <Typography variant="h6" align="center" gutterBottom>
              Depósito de Material Operacional
              </Typography>
            <Divider sx={{margin: "30px 0"}}/>
            <TextField
              label="Usuário"
              variant="outlined"
              fullWidth
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }
              }}

            />
            <TextField
              label="Senha"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                }}

              }
            />
            
            <Divider sx={{margin: "30px 0"}}/>
            <Button
              color="primary"
              variant="contained"
              onClick={handleLogin}
              fullWidth
              sx={{
                
                backgroundColor: '#000011',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#000033',
                }
              }}
            >
              Login
            </Button>
          </Card>
          {!hasUser && (
            <Fab
              sx={{
                position: "absolute",
                bottom: 20,
                left: 20,
              }}
              color="default"
              variant="circular"
              onClick={navigateToFirstAccess}
            >
              <Settings />
            </Fab>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}