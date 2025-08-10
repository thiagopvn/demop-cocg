import React, { useState } from 'react';
import {
    TextField,
    Button,
    Container,
    Typography,
    Box,
    IconButton,
    InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import db from "../../firebase/db";

const FirstAccessScreen = () => {
    const [username, setUsername] = useState('');
    const [full_name, setfull_name] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rg, setRg] = useState('');
    const [telefone, setTelefone] = useState('');
    const [obm, setObm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!username || !full_name || !email || !password || !confirmPassword || !rg || !telefone || !obm) {
            alert("Por favor, preencha todos os campos.");
            return;
        }

        if (password !== confirmPassword) {
            alert("As senhas não coincidem.");
            return;
        }

        const usersCollection = collection(db, "users");
        const usernameQuery = query(usersCollection, where("username", "==", username));
        const emailQuery = query(usersCollection, where("email", "==", email));

        const [usernameSnapshot, emailSnapshot] = await Promise.all([
            getDocs(usernameQuery),
            getDocs(emailQuery)
        ]);

        if (!usernameSnapshot.empty) {
            alert("Nome de usuário já está em uso.");
            return;
        }

        if (!emailSnapshot.empty) {
            alert("Email já está em uso.");
            return;
        }

        try {
            await addDoc(usersCollection, {
                username: username,
                full_name: full_name,
                full_name_lower: full_name.toLowerCase(),
                email: email,
                password: password,
                role: 'admin', // Definindo o primeiro usuário como admin
                rg: rg,
                telefone: telefone,
                OBM: obm,
                created_at: new Date(),
            });

            alert("Primeiro usuário criado com sucesso! Redirecionando para a tela de login.");
            navigate('/');
        } catch (error) {
            console.error("Erro ao criar o primeiro usuário:", error);
            alert("Erro ao criar o primeiro usuário.");
        }
    };

    const toggleShowPassword = () => {
        setShowPassword(!showPassword);
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{
                marginTop: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}>
                <Typography component="h1" variant="h5">
                    Criar Conta de Administrador
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="username"
                        label="Nome de Usuário"
                        name="username"
                        autoComplete="username"
                        autoFocus
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="full_name"
                        label="Nome Completo"
                        name="full_name"
                        autoComplete="name"
                        value={full_name}
                        onChange={(e) => setfull_name(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Endereço de Email"
                        name="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Senha"
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={toggleShowPassword}
                                            onMouseDown={(event) => event.preventDefault()}
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }
                        }}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="confirmPassword"
                        label="Confirmar Senha"
                        type={showPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={toggleShowPassword}
                                            onMouseDown={(event) => event.preventDefault()}
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }
                        }}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="rg"
                        label="RG"
                        name="rg"
                        value={rg}
                        onChange={(e) => setRg(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="telefone"
                        label="Telefone"
                        name="telefone"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="obm"
                        label="OBM"
                        name="obm"
                        value={obm}
                        onChange={(e) => setObm(e.target.value)}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Criar Conta
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default FirstAccessScreen;