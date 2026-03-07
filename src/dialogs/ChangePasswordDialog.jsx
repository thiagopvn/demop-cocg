import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    Button,
    TextField,
    IconButton,
    Typography,
    Alert,
    CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import { callChangeOwnPassword } from "../firebase/functions";

export default function ChangePasswordDialog({ open, onClose, forced = false }) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        setError("");

        if (!newPassword || !confirmPassword) {
            setError("Preencha todos os campos.");
            return;
        }

        if (!forced && !currentPassword) {
            setError("Informe a senha atual.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }

        if (newPassword === "123456") {
            setError("A nova senha não pode ser 123456.");
            return;
        }

        if (newPassword.length < 4) {
            setError("A nova senha deve ter no mínimo 4 caracteres.");
            return;
        }

        setLoading(true);
        try {
            await callChangeOwnPassword(forced ? null : currentPassword, newPassword);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            onClose(true);
        } catch (err) {
            const msg = err?.message || "Erro ao alterar senha.";
            if (msg.includes("incorreta")) {
                setError("Senha atual incorreta.");
            } else if (msg.includes("123456")) {
                setError("A nova senha não pode ser 123456.");
            } else {
                setError("Erro ao alterar senha. Tente novamente.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") handleSubmit();
    };

    return (
        <Dialog
            open={open}
            onClose={forced ? undefined : () => onClose(false)}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown={forced}
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
                }
            }}
        >
            <DialogTitle
                sx={{
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    paddingBottom: 1,
                    background: forced
                        ? 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)'
                        : 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    color: 'white',
                    margin: 0,
                    borderRadius: '16px 16px 0 0',
                }}
            >
                {forced ? "Troca de Senha Obrigatoria" : "Alterar Senha"}
            </DialogTitle>
            {!forced && (
                <IconButton
                    aria-label="close"
                    sx={{
                        position: "absolute",
                        right: 12,
                        top: 12,
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        }
                    }}
                    onClick={() => onClose(false)}
                >
                    <CloseIcon />
                </IconButton>
            )}

            <DialogContent sx={{ padding: '24px' }}>
                {forced && (
                    <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px' }}>
                        Sua senha foi resetada. Voce deve criar uma nova senha para continuar.
                    </Alert>
                )}

                <div style={{ display: 'grid', gap: '20px' }}>
                    {!forced && (
                        <TextField
                            fullWidth
                            label="Senha Atual"
                            type={showPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            onKeyPress={handleKeyPress}
                            autoComplete="current-password"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    backgroundColor: '#ffffff',
                                    '&:hover': { backgroundColor: '#f8f9ff' },
                                    '&.Mui-focused': { backgroundColor: '#ffffff' }
                                }
                            }}
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            sx={{ color: '#1976d2' }}
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    ),
                                }
                            }}
                        />
                    )}

                    <TextField
                        fullWidth
                        label="Nova Senha"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onKeyPress={handleKeyPress}
                        autoComplete="new-password"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                backgroundColor: '#ffffff',
                                '&:hover': { backgroundColor: '#f8f9ff' },
                                '&.Mui-focused': { backgroundColor: '#ffffff' }
                            }
                        }}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <IconButton
                                        onClick={() => setShowPassword(!showPassword)}
                                        edge="end"
                                        sx={{ color: '#1976d2' }}
                                    >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                ),
                            }
                        }}
                    />

                    <TextField
                        fullWidth
                        label="Confirmar Nova Senha"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyPress={handleKeyPress}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                backgroundColor: '#ffffff',
                                '&:hover': { backgroundColor: '#f8f9ff' },
                                '&.Mui-focused': { backgroundColor: '#ffffff' }
                            }
                        }}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <IconButton
                                        onClick={() => setShowPassword(!showPassword)}
                                        edge="end"
                                        sx={{ color: '#1976d2' }}
                                    >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                ),
                            }
                        }}
                    />

                    {error && (
                        <Alert severity="error" sx={{ borderRadius: '12px' }}>
                            {error}
                        </Alert>
                    )}

                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={loading}
                        fullWidth
                        sx={{
                            marginTop: '16px',
                            padding: '14px',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                            boxShadow: '0 4px 16px rgba(25, 118, 210, 0.3)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                                boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)',
                                transform: 'translateY(-2px)',
                            },
                            '&:disabled': {
                                background: '#ccc',
                            },
                            transition: 'all 0.2s ease-in-out'
                        }}
                    >
                        {loading ? (
                            <CircularProgress size={24} sx={{ color: 'white' }} />
                        ) : (
                            "Salvar Nova Senha"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
