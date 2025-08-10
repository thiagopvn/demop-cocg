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
    Select,
    MenuItem,
    InputLabel,
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
    useEffect(() => {
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
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    const handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    return (
        <Dialog open={open}>
            <DialogTitle>{editData ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            <IconButton
                aria-label="close"
                sx={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                    color: (theme) => theme.palette.grey[500],
                }}
                onClick={onCancel}
            >
                <CloseIcon />
            </IconButton>

            <DialogContent>
                <TextField
                    fullWidth
                    label="Username"
                    margin="normal"
                    name="username"
                    value={data.username}
                    onChange={handleChange}
                    disabled={editMode} // Desabilita a edição do username se for edição
                />
                <TextField
                    fullWidth
                    label="Nome Completo"
                    margin="normal"
                    name="full_name"
                    value={data.full_name}
                    onChange={handleChange}
                />
                <TextField
                    fullWidth
                    label="Email"
                    margin="normal"
                    name="email"
                    value={data.email}
                    onChange={handleChange}
                    autoComplete="off"
                />
                <TextField
                    fullWidth
                    label="Senha"
                    margin="normal"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={data.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    slotProps={{
                        input: {
                            endAdornment: (
                                <IconButton
                                    aria-label="toggle password visibility"
                                    onClick={handleClickShowPassword}
                                    onMouseDown={handleMouseDownPassword}
                                    edge="end"
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
                    margin="normal"
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={data.confirmPassword}
                    onChange={handleChange}
                    slotProps={{
                        input: {
                            endAdornment: (
                                <IconButton
                                    aria-label="toggle password visibility"
                                    onClick={handleClickShowPassword}
                                    onMouseDown={handleMouseDownPassword}
                                    edge="end"
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            ),
                        }
                    }}
                />

                <TextField
                    fullWidth
                    label="RG"
                    margin="normal"
                    name="rg"
                    value={data.rg}
                    onChange={handleChange}
                />
                <TextField
                    fullWidth
                    label="Telefone"
                    margin="normal"
                    name="telefone"
                    value={data.telefone}
                    onChange={handleChange}
                />
                <FormControl fullWidth margin="normal">
                    <InputLabel id="obm-select-label">OBM</InputLabel>
                    <Select
                        labelId="obm-select-label"
                        id="obm-select"
                        name="OBM"
                        value={data.OBM}
                        label="OBM"
                        onChange={handleChange}
                    >
                        {OBM.map((obm) => (
                            <MenuItem key={obm} value={obm}>
                                {obm}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                {loggedUser?.role === "admin" && (
                    <FormControl component="fieldset" fullWidth>
                        <FormLabel component="legend">Permissão do Usuário</FormLabel>
                        <RadioGroup
                            row
                            name="role"
                            value={data.role}
                            sx={{
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "space-around",
                            }}
                            onChange={handleChange}
                        >
                            <FormControlLabel value="user" control={<Radio />} label="User" />
                            <FormControlLabel value="editor" control={<Radio />} label="Editor" />
                            <FormControlLabel value="admin" control={<Radio />} label="Admin" />
                        </RadioGroup>
                    </FormControl>
                )}
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => onSubmit(data)}
                    fullWidth
                    sx={{ marginTop: 5 }}
                >
                    Salvar
                </Button>
            </DialogContent>
        </Dialog>
    );
}