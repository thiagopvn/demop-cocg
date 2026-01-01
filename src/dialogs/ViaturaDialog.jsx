import React, { useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    Button,
    TextField,
    IconButton,
    Box,
    Typography,
    InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import BadgeIcon from "@mui/icons-material/Badge";

export default function ViaturaDialog({ onSubmit, onCancel, open, editData = null }) {
    const [data, setData] = React.useState({
        id: editData?.id || "",
        prefixo: editData?.prefixo || "",
        description: editData?.description || "",
        created_at: editData?.created_at || 0,
        ultima_movimentacao: editData?.ultima_movimentacao || 0,
    });

    const [errors, setErrors] = React.useState({
        prefixo: false,
        description: false,
    });

    useEffect(() => {
        if (editData) {
            setData({
                id: editData.id || "",
                prefixo: editData.prefixo || "",
                description: editData.description || "",
                created_at: editData.created_at || 0,
                ultima_movimentacao: editData.ultima_movimentacao || 0,
            });
        } else {
            setData({
                id: "",
                prefixo: "",
                description: "",
                created_at: 0,
                ultima_movimentacao: 0,
            });
        }
        setErrors({ prefixo: false, description: false });
    }, [editData, open]);

    const handleSubmit = () => {
        const newErrors = {
            prefixo: !data.prefixo.trim(),
            description: !data.description.trim(),
        };

        setErrors(newErrors);

        if (newErrors.prefixo || newErrors.description) {
            return;
        }

        onSubmit(data);
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1
                }}
            >
                <DirectionsCarIcon />
                {editData ? "Editar Viatura" : "Nova Viatura"}
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                mb: 1,
                                color: '#1565c0',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5
                            }}
                        >
                            <BadgeIcon fontSize="small" />
                            Prefixo da Viatura *
                        </Typography>
                        <TextField
                            fullWidth
                            placeholder="Ex: ABT-110, ABS-107, ASE-496"
                            value={data.prefixo}
                            onChange={(e) => {
                                setData({ ...data, prefixo: e.target.value.toUpperCase() });
                                setErrors({ ...errors, prefixo: false });
                            }}
                            error={errors.prefixo}
                            helperText={errors.prefixo ? "Prefixo e obrigatorio" : "Identificador unico da viatura"}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    backgroundColor: '#ffffff',
                                    fontWeight: 600,
                                    fontSize: '1.1rem',
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
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <DirectionsCarIcon sx={{ color: '#1976d2' }} />
                                        </InputAdornment>
                                    ),
                                }
                            }}
                        />
                    </Box>

                    <Box>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                mb: 1,
                                color: '#1565c0',
                                fontWeight: 600
                            }}
                        >
                            Descricao da Viatura *
                        </Typography>
                        <TextField
                            fullWidth
                            placeholder="Ex: Ambulancia de Transporte, Auto Bomba Tanque"
                            value={data.description}
                            onChange={(e) => {
                                setData({ ...data, description: e.target.value });
                                setErrors({ ...errors, description: false });
                            }}
                            error={errors.description}
                            helperText={errors.description ? "Descricao e obrigatoria" : "Nome ou tipo da viatura"}
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
                    </Box>

                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        fullWidth
                        sx={{
                            marginTop: 2,
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
                            transition: 'all 0.2s ease-in-out'
                        }}
                    >
                        {editData ? "Salvar Alteracoes" : "Cadastrar Viatura"}
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
