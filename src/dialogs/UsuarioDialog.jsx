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
    Box,
    Typography,
    Stack,
} from "@mui/material";
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Add, Check, InfoOutlined } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import AvatarUpload from "../components/AvatarUpload";
import { verifyToken } from "../firebase/token";
import { usePostos, useObms } from "../hooks/useListasMilitares";

export default function UsuarioDialog({ onSubmit, onCancel, open, editData = null }) {
    const theme = useTheme();
    const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
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
        posto: editData?.posto || "",
    });
    const editMode = !!editData;
    const { lista: postos, adicionar: adicionarPosto } = usePostos();
    const { lista: obms, adicionar: adicionarObm } = useObms();
    const [novoPosto, setNovoPosto] = useState("");
    const [novaObm, setNovaObm] = useState("");
    const [criandoPosto, setCriandoPosto] = useState(false);
    const [criandoObm, setCriandoObm] = useState(false);
    const [salvandoLista, setSalvandoLista] = useState(false);
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
                posto: editData.posto || "",
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
                posto: "",
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
        // O login e o RG: ao digitar o RG de acesso, preenche o campo RG (se ainda vazio ou igual)
        if (name === 'username' && !editMode && (!data.rg || data.rg === data.username)) { setData({ ...data, username: value, rg: value }); }
        else setData({ ...data, [name]: value });
        setErrors(prev => { const { [name]: _removed, general: _general, ...rest } = prev; return rest; });
    };

    const salvarNovoPosto = async () => {
        setSalvandoLista(true);
        try { const n = await adicionarPosto(novoPosto); setData(prev => ({ ...prev, posto: n })); setNovoPosto(""); setCriandoPosto(false); }
        catch (e) { setErrors(prev => ({ ...prev, posto: e?.code === 'permission-denied' ? 'Só o Admin Geral pode incluir postos.' : (e?.message || 'Erro ao incluir posto') })); }
        finally { setSalvandoLista(false); }
    };
    const salvarNovaObm = async () => {
        setSalvandoLista(true);
        try { const n = await adicionarObm(novaObm); setData(prev => ({ ...prev, OBM: n })); setNovaObm(""); setCriandoObm(false); }
        catch (e) { setErrors(prev => ({ ...prev, OBM: e?.message || 'Erro ao incluir OBM' })); }
        finally { setSalvandoLista(false); }
    };

    const handleValidateAndSubmit = async () => {
        const newErrors = {};
        if (!data.username) newErrors.username = 'RG de login é obrigatório';
        if (!data.full_name) newErrors.full_name = 'Nome de Guerra é obrigatório';
        if (!data.email) newErrors.email = 'Email é obrigatório';
        if (!editData && !data.posto) newErrors.posto = 'Posto é obrigatório';
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
            // Senha inicial e sempre 123456 (o militar troca no primeiro acesso)
            await onSubmit(editData ? data : { ...data, password: '123456' });
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
            fullScreen={fullScreenDialog}
            PaperProps={{
                sx: {
                    borderRadius: fullScreenDialog ? 0 : '16px',
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
                    borderRadius: fullScreenDialog ? 0 : '16px 16px 0 0',
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

            <DialogContent sx={{ padding: { xs: '16px', sm: '24px' } }}>
                <div style={{ display: 'grid', gap: '20px' }}>
                    {editMode && loggedUser?.role === "admingeral" && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <AvatarUpload
                                src={editData?.foto_url}
                                name={data.full_name || data.username}
                                role={data.role}
                                size={96}
                                permitirColar
                                onChange={(file) => setData(prev => ({ ...prev, fotoFile: file }))}
                            />
                            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Foto do militar (somente admin geral) — tirar, escolher ou colar</span>
                        </div>
                    )}
                    {errors.general && (
                        <Alert severity="error" onClose={() => setErrors(prev => { const { general: _general, ...rest } = prev; return rest; })}>
                            {errors.general}
                        </Alert>
                    )}
                    <TextField
                        fullWidth
                        label="RG (login)"
                        name="username"
                        value={data.username}
                        onChange={handleChange}
                        disabled={editMode}
                        error={!!errors.username}
                        helperText={errors.username || (!editMode ? 'O militar entra no sistema com este RG' : '')}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                backgroundColor: editMode ? '#f5f5f5' : '#ffffff',
                                '&:hover': {
                                    backgroundColor: editMode ? '#f5f5f5' : '#f8f9ff',
                                },
                                '&.Mui-focused': {
                                    backgroundColor: 'background.paper',
                                }
                            }
                        }}
                    />
                    <FormControl fullWidth error={!!errors.posto}>
                        <InputLabel id="posto-select-label">Posto / graduação</InputLabel>
                        <Select labelId="posto-select-label" id="posto-select" name="posto" value={data.posto} label="Posto / graduação" onChange={handleChange} sx={{ borderRadius: '12px', backgroundColor: 'background.paper' }}>
                            {postos.map((pst) => <MenuItem key={pst} value={pst}>{pst}</MenuItem>)}
                        </Select>
                        {errors.posto && <FormHelperText>{errors.posto}</FormHelperText>}
                        {loggedUser?.role === "admingeral" && !criandoPosto && (
                            <Button size="small" startIcon={<Add />} onClick={() => setCriandoPosto(true)} sx={{ alignSelf: 'flex-start', mt: 0.5, textTransform: 'none', fontWeight: 700 }}>Incluir novo posto (admin geral)</Button>
                        )}
                        {criandoPosto && (
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <TextField size="small" fullWidth autoFocus label="Novo posto" value={novoPosto} onChange={(e) => setNovoPosto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); salvarNovoPosto(); } }} />
                                <Button variant="contained" size="small" disabled={salvandoLista || !novoPosto.trim()} onClick={salvarNovoPosto} startIcon={<Check />} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>Incluir</Button>
                                <Button size="small" onClick={() => { setCriandoPosto(false); setNovoPosto(""); }} sx={{ textTransform: 'none' }}>Cancelar</Button>
                            </Stack>
                        )}
                    </FormControl>
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
                                backgroundColor: 'background.paper',
                                '&:hover': {
                                    backgroundColor: 'background.default',
                                },
                                '&.Mui-focused': {
                                    backgroundColor: 'background.paper',
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
                                backgroundColor: 'background.paper',
                                '&:hover': {
                                    backgroundColor: 'background.default',
                                },
                                '&.Mui-focused': {
                                    backgroundColor: 'background.paper',
                                }
                            }
                        }}
                    />
                    {!editData && (
                        <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid #ffb74d', backgroundColor: '#fff8e1', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                            <InfoOutlined sx={{ color: '#ef6c00', mt: 0.25 }} />
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#e65100' }}>Informação importante sobre a senha</Typography>
                                <Typography variant="body2" sx={{ mt: 0.5, color: '#5d4037', lineHeight: 1.5 }}>
                                    A partir de agora a senha é escolhida pelo próprio militar após o primeiro login. O primeiro acesso é feito com o <strong>RG</strong> e a senha de primeiro acesso <strong>123456</strong>. Ao entrar, o sistema abre a tela de redefinição e ele cria a senha definitiva.
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: fullScreenDialog ? '1fr' : '1fr 1fr', gap: '16px' }}>
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
                                    backgroundColor: 'background.paper',
                                    '&:hover': {
                                        backgroundColor: 'background.default',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: 'background.paper',
                                    }
                                }
                            }}
                        />
                        <TextField
                            fullWidth
                            label="Telefone (com DDD)"
                            name="telefone"
                            placeholder="21999998888"
                            value={data.telefone}
                            onChange={handleChange}
                            error={!!errors.telefone}
                            helperText={errors.telefone}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    backgroundColor: 'background.paper',
                                    '&:hover': {
                                        backgroundColor: 'background.default',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: 'background.paper',
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
                                backgroundColor: 'background.paper',
                                '&:hover': {
                                    backgroundColor: 'background.default',
                                },
                                '&.Mui-focused': {
                                    backgroundColor: 'background.paper',
                                }
                            }}
                        >
                            {obms.map((obm) => (
                                <MenuItem key={obm} value={obm}>
                                    {obm}
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.OBM && <FormHelperText>{errors.OBM}</FormHelperText>}
                        {!criandoObm && (
                            <Button size="small" startIcon={<Add />} onClick={() => setCriandoObm(true)} sx={{ alignSelf: 'flex-start', mt: 0.5, textTransform: 'none', fontWeight: 700 }}>OBM não está na lista? Cadastrar</Button>
                        )}
                        {criandoObm && (
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <TextField size="small" fullWidth autoFocus label="Nova OBM" value={novaObm} onChange={(e) => setNovaObm(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); salvarNovaObm(); } }} />
                                <Button variant="contained" size="small" disabled={salvandoLista || !novaObm.trim()} onClick={salvarNovaObm} startIcon={<Check />} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>Cadastrar</Button>
                                <Button size="small" onClick={() => { setCriandoObm(false); setNovaObm(""); }} sx={{ textTransform: 'none' }}>Cancelar</Button>
                            </Stack>
                        )}
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
                                    backgroundColor: 'background.default',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid', borderColor: 'divider',
                                }}
                                onChange={handleChange}
                            >
                                <FormControlLabel
                                    value="user"
                                    control={<Radio sx={{ color: '#1976d2' }} />}
                                    label="User"
                                />
                                <FormControlLabel
                                    value="chefe"
                                    control={<Radio sx={{ color: '#1976d2' }} />}
                                    label="Chefe de Guarnição"
                                />
                                <FormControlLabel
                                    value="admin"
                                    control={<Radio sx={{ color: '#1976d2' }} />}
                                    label="Admin"
                                />
                                {loggedUser?.role === "admingeral" && (
                                    <FormControlLabel
                                        value="BensPatrimoniais"
                                        control={<Radio sx={{ color: '#ff6b35' }} />}
                                        label="Bens Patrimoniais"
                                    />
                                )}
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