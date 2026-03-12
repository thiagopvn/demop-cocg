import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    Button,
    TextField,
    IconButton,
    RadioGroup,
    FormControlLabel,
    Radio,
    FormLabel,
    FormControl,
    FormHelperText,
    Select,
    MenuItem,
    InputLabel,
    Alert,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import { verifyToken } from "../firebase/token";
const OBM = [
    "1º GBM",
    "2 º GBM",
    "3 º GBM",
    "4 º GBM",
    "5 º GBM",
    "6 º GBM",
    "7 º GBM",
    "8 º GBM",
    "9 º GBM",
    "10 º GBM",
    "11 º GBM",
    "12 º GBM",
    "13 º GBM",
    "14 º GBM",
    "15 º GBM",
    "16 º GBM",
    "17 º GBM",
    "18 º GBM",
    "19 º GBM",
    "20 º GBM",
    "21 º GBM",
    "22 º GBM",
    "23 º GBM",
    "24 º GBM",
    "25 º GBM",
    "26 º GBM",
    "27 º GBM",
    "28 º GBM",
    "29 º GBM",
    "1 º GMAR",
    "2 º GMAR",
    "3 º GMAR",
    "4 º GMAR",
    "1 º GSFMA",
    "2 º GSFMA",
    "GOCG",
    "GOPP",
    "GEP",
    "GBMUS",
    "DGP",
    "DGF",
    "DGAF",
    "FUNESBOM",
    "SUSAU",
    "SUAD",
    "DGPAT",
    "DGVP",
    "DGSE",
    "DGO",
    "DGS",
    "DGAL",
    "DGEAO",
    "DGST",
    "DPPT",
    "DGDP",
    "DGAS",
    "DI",
    "DGCCO",
    "DGEI",
    "ABMDPII",
    "CEICS",
    "ESCBM",
    "CFAP",
    "EMG",
    "QCG",
    "SEDEC",
    "CSM",
];

export default function UsuarioDialog({ onSubmit, onCancel, open, editData = null }) {
    const [data, setData] = useState({
        id: editData?.id || "",
        username: editData?.username || "",
        full_name: editData?.full_name || "",
        email: editData?.email || "",
        password: "", // Não exibir a senha existente
        confirmPassword: "",
        role: editData?.role || "user",
        rg: editData?.rg || "",
        telefone: editData?.telefone || "",
        OBM: editData?.OBM || "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [editMode, setEditMode] = useState(!!editData);
    const [loggedUser, setLoggedUser] = useState(null);
    const [errors, setErrors] = useState({});
    useEffect(() => {
        setErrors({});
        if (editData) {
            setData({
                id: editData.id || "",
                username: editData.username || "",
                full_name: editData.full_name || "",
                email: editData.email || "",
                password: "", // Não exibir a senha existente
                confirmPassword: "",
                role: editData.role || "user",
                rg: editData.rg || "",
                telefone: editData.telefone || "",
                OBM: editData.OBM || "",
            });
        } else {
            // Limpar os campos quando for adicionar um novo usuário
            setData({
                id: "",
                username: "",
                full_name: "",
                email: "",
                password: "",
                confirmPassword: "",
                role: "user",
                rg: "",
                telefone: "",
                OBM: "",
            });
        }
    }, [editData]);
    useEffect(() => {
        const fetchLoggedUser = async () => {
            const token = localStorage.getItem("token");

            const user = await verifyToken(token);
            setLoggedUser(user);
        };
        fetchLoggedUser();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setData({ ...data, [name]: value });
        setErrors(prev => { const { [name]: _, general, ...rest } = prev; return rest; });
    };

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    const handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    const handleValidateAndSubmit = async () => {
        const newErrors = {};
        if (!data.username) newErrors.username = 'RG de login é obrigatório';
        if (!data.full_name) newErrors.full_name = 'Nome de Guerra é obrigatório';
        if (!data.email) newErrors.email = 'Email é obrigatório';
        if (!editData) {
            if (!data.password) newErrors.password = 'Senha é obrigatória';
            if (!data.confirmPassword) newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
            if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
                newErrors.confirmPassword = 'As senhas não são iguais';
            }
        }
        if (!data.rg) newErrors.rg = 'RG é obrigatório';
        if (!data.telefone) newErrors.telefone = 'Telefone é obrigatório';
        if (!data.OBM) newErrors.OBM = 'OBM é obrigatório';
        if (!data.role) newErrors.role = 'Permissão é obrigatória';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});
        try {
            await onSubmit(data);
        } catch (error) {
            const msg = error?.message || 'Erro ao salvar usuário';
            setErrors({ general: msg });
        }
    };

    return (
        <Dialog 
            open={open} 
            maxWidth="sm" 
            fullWidth
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
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    color: 'white',
                    margin: 0,
                    borderRadius: '16px 16px 0 0',
                }}
            >
                {editData ? "✏️ Editar Usuário" : "👤 Novo Usuário"}
            </DialogTitle>
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
                onClick={onCancel}
            >
                <CloseIcon />
            </IconButton>

            <DialogContent sx={{ padding: '24px' }}>
                <div style={{ display: 'grid', gap: '20px' }}>
                    {errors.general && (
                        <Alert severity="error" onClose={() => setErrors(prev => { const { general, ...rest } = prev; return rest; })}>
                            {errors.general}
                        </Alert>
                    )}
                    <TextField
                        fullWidth
                        label="RG"
                        name="username"
                        value={data.username}
                        onChange={handleChange}
                        disabled={editMode}
                        error={!!errors.username}
                        helperText={errors.username}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                backgroundColor: editMode ? '#f5f5f5' : '#ffffff',
                                '&:hover': {
                                    backgroundColor: editMode ? '#f5f5f5' : '#f8f9ff',
                                },
                                '&.Mui-focused': {
                                    backgroundColor: '#ffffff',
                                }
                            }
                        }}
                    />
                    <TextField
                        fullWidth
                        label="Nome de Guerra"
                        name="full_name"
                        value={data.full_name}
                        onChange={handleChange}
                        error={!!errors.full_name}
                        helperText={errors.full_name}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                backgroundColor: '#ffffff',
                                '&:hover': {
                                    backgroundColor: '#f8f9ff',
                                },
                                '&.Mui-focused': {
                                    backgroundColor: '#ffffff',
                                }
                            }
                        }}
                    />
                    <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        value={data.email}
                        onChange={handleChange}
                        autoComplete="off"
                        error={!!errors.email}
                        helperText={errors.email}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                backgroundColor: '#ffffff',
                                '&:hover': {
                                    backgroundColor: '#f8f9ff',
                                },
                                '&.Mui-focused': {
                                    backgroundColor: '#ffffff',
                                }
                            }
                        }}
                    />
                    {!editData && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <TextField
                            fullWidth
                            label="Senha"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={data.password}
                            onChange={handleChange}
                            autoComplete="new-password"
                            error={!!errors.password}
                            helperText={errors.password}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    backgroundColor: '#ffffff',
                                    '&:hover': {
                                        backgroundColor: '#f8f9ff',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: '#ffffff',
                                    }
                                }
                            }}
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={handleClickShowPassword}
                                            onMouseDown={handleMouseDownPassword}
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
                            label="Confirmação de Senha"
                            type={showPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={data.confirmPassword}
                            onChange={handleChange}
                            error={!!errors.confirmPassword}
                            helperText={errors.confirmPassword}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    backgroundColor: '#ffffff',
                                    '&:hover': {
                                        backgroundColor: '#f8f9ff',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: '#ffffff',
                                    }
                                }
                            }}
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={handleClickShowPassword}
                                            onMouseDown={handleMouseDownPassword}
                                            edge="end"
                                            sx={{ color: '#1976d2' }}
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    ),
                                }
                            }}
                        />
                    </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <TextField
                            fullWidth
                            label="RG"
                            name="rg"
                            value={data.rg}
                            onChange={handleChange}
                            error={!!errors.rg}
                            helperText={errors.rg}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    backgroundColor: '#ffffff',
                                    '&:hover': {
                                        backgroundColor: '#f8f9ff',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: '#ffffff',
                                    }
                                }
                            }}
                        />
                        <TextField
                            fullWidth
                            label="Telefone"
                            name="telefone"
                            value={data.telefone}
                            onChange={handleChange}
                            error={!!errors.telefone}
                            helperText={errors.telefone}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    backgroundColor: '#ffffff',
                                    '&:hover': {
                                        backgroundColor: '#f8f9ff',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: '#ffffff',
                                    }
                                }
                            }}
                        />
                    </div>
                    
                    <FormControl fullWidth error={!!errors.OBM}>
                        <InputLabel id="obm-select-label">OBM</InputLabel>
                        <Select
                            labelId="obm-select-label"
                            id="obm-select"
                            name="OBM"
                            value={data.OBM}
                            label="OBM"
                            onChange={handleChange}
                            sx={{
                                borderRadius: '12px',
                                backgroundColor: '#ffffff',
                                '&:hover': {
                                    backgroundColor: '#f8f9ff',
                                },
                                '&.Mui-focused': {
                                    backgroundColor: '#ffffff',
                                }
                            }}
                        >
                            {OBM.map((obm) => (
                                <MenuItem key={obm} value={obm}>
                                    {obm}
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.OBM && <FormHelperText>{errors.OBM}</FormHelperText>}
                    </FormControl>
                    {(loggedUser?.role === "admin" || loggedUser?.role === "admingeral") && (
                        <FormControl component="fieldset" fullWidth>
                            <FormLabel
                                component="legend"
                                sx={{
                                    fontWeight: 600,
                                    color: '#1a237e',
                                    marginBottom: '12px'
                                }}
                            >
                                Permissao do Usuario
                            </FormLabel>
                            <RadioGroup
                                row
                                name="role"
                                value={data.role}
                                sx={{
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-around",
                                    flexWrap: "wrap",
                                    backgroundColor: '#f8f9ff',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid #e3f2fd',
                                }}
                                onChange={handleChange}
                            >
                                <FormControlLabel
                                    value="user"
                                    control={<Radio sx={{ color: '#1976d2' }} />}
                                    label="User"
                                />
                                <FormControlLabel
                                    value="editor"
                                    control={<Radio sx={{ color: '#1976d2' }} />}
                                    label="Editor"
                                />
                                <FormControlLabel
                                    value="admin"
                                    control={<Radio sx={{ color: '#1976d2' }} />}
                                    label="Admin"
                                />
                                {loggedUser?.role === "admingeral" && (
                                    <FormControlLabel
                                        value="admingeral"
                                        control={<Radio sx={{ color: '#d32f2f' }} />}
                                        label="Admin Geral"
                                    />
                                )}
                            </RadioGroup>
                        </FormControl>
                    )}
                    
                    <Button
                        variant="contained"
                        onClick={handleValidateAndSubmit}
                        fullWidth
                        sx={{ 
                            marginTop: '32px',
                            padding: '16px',
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
                            transition: 'all 0.2s ease-in-out'
                        }}
                    >
                        {editData ? "💾 Salvar Alterações" : "✨ Criar Usuário"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}