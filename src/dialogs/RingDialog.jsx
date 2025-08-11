import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    Button,
    TextField,
    IconButton,
    FormControlLabel,
    Checkbox,
    Box,
    Chip,
    Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import UserSearch from "../components/UserSearch"; // Certifique-se de que o caminho está correto

export default function RingDialog({ onSubmit, onCancel, open, editData = null }) {
    const [data, setData] = useState({
        numero_ocorrencia: editData?.numero_ocorrencia || "",
        militar_nome: editData?.militar_nome || "", // Campo para o nome do militar
        militar_id: editData?.militar_id || null, // Campo para o ID do militar
        nome_solicitante: editData?.nome_solicitante || "",
        telefone_solicitante: editData?.telefone_solicitante || "", // NOVO: Campo telefone
        endereco: editData?.endereco || "",
        rg: editData?.rg || "",
        data_ocorrencia: editData?.data_ocorrencia || new Date().toISOString().slice(0, 10),
        observacoes: editData?.observacoes || "",
        devolvido: editData?.devolvido || false,
    });
    const [userCritery, setUserCritery] = useState("");
    const [userSelected, setUserSelected] = useState(null);

    useEffect(() => {
        if (editData) {
            setData({
                id: editData.id || "",
                numero_ocorrencia: editData.numero_ocorrencia || "",
                militar_nome: editData.militar_nome || "",
                militar_id: editData.militar_id || null,
                nome_solicitante: editData.nome_solicitante || "",
                telefone_solicitante: editData.telefone_solicitante || "", // NOVO: Campo telefone
                endereco: editData.endereco || "",
                rg: editData.rg || "",
                data_ocorrencia: editData.data_ocorrencia || new Date().toISOString().slice(0, 10),
                observacoes: editData.observacoes || "",
                devolvido: editData.devolvido || false,
            });
            setUserSelected({
                id: editData.militar_id || null,
                full_name: editData.militar_nome || "",
            });
        } else {
            setUserSelected(null);
        }
    }, [editData]);

    const handleUserSelect = (user) => {
        setUserSelected(user);
        setData({
            ...data,
            militar_nome: user.full_name,
            militar_id: user.id,
        });
    };

    const handleClearUser = () => {
        setUserSelected(null);
        setData({
            ...data,
            militar_nome: "",
            militar_id: null,
        });
    };

    return (
        <Dialog 
            open={open} 
            maxWidth="md" 
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    background: 'linear-gradient(135deg, #ffffff 0%, #fff8e1 100%)',
                }
            }}
        >
            <DialogTitle 
                sx={{ 
                    textAlign: 'center', 
                    fontSize: '1.5rem', 
                    fontWeight: 700, 
                    paddingBottom: 1,
                    background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                    color: 'white',
                    margin: 0,
                    borderRadius: '16px 16px 0 0',
                }}
            >
                {editData ? "✏️ Editar Retirada de Anel" : "💍 Nova Retirada de Anel"}
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
                    {/* Primeira linha - Número da ocorrência */}
                    <TextField
                        fullWidth
                        label="🔢 Número da Ocorrência"
                        value={data.numero_ocorrencia}
                        onChange={(e) => setData({ ...data, numero_ocorrencia: e.target.value })}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                backgroundColor: '#ffffff',
                                '&:hover': {
                                    backgroundColor: '#fff8e1',
                                },
                                '&.Mui-focused': {
                                    backgroundColor: '#ffffff',
                                }
                            }
                        }}
                    />

                    {/* Seção do Militar */}
                    <Box sx={{ 
                        backgroundColor: '#fff8e1', 
                        padding: '16px', 
                        borderRadius: '12px',
                        border: '1px solid #ffcc02'
                    }}>
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                marginBottom: '12px', 
                                fontWeight: 600, 
                                color: '#e65100',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            👨‍✈️ Seleção do Militar
                        </Typography>
                        <UserSearch
                            userCritery={userCritery}
                            onSetUserCritery={setUserCritery}
                            onSelectUser={handleUserSelect}
                            selectedItem={userSelected}
                        />
                        {userSelected && (
                            <Chip
                                label={`✅ ${userSelected.full_name}`}
                                onDelete={handleClearUser}
                                sx={{ 
                                    mt: 1,
                                    backgroundColor: '#4caf50',
                                    color: 'white',
                                    fontWeight: 600,
                                    '& .MuiChip-deleteIcon': {
                                        color: 'white',
                                    }
                                }}
                            />
                        )}
                    </Box>

                    {/* Dados do Solicitante */}
                    <Box sx={{ 
                        backgroundColor: '#f3e5f5', 
                        padding: '16px', 
                        borderRadius: '12px',
                        border: '1px solid #e1bee7'
                    }}>
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                marginBottom: '12px', 
                                fontWeight: 600, 
                                color: '#7b1fa2',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            👤 Dados do Solicitante
                        </Typography>
                        <div style={{ display: 'grid', gap: '16px' }}>
                            <TextField
                                fullWidth
                                label="Nome Completo"
                                value={data.nome_solicitante}
                                onChange={(e) => setData({ ...data, nome_solicitante: e.target.value })}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '12px',
                                        backgroundColor: '#ffffff',
                                    }
                                }}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <TextField
                                    fullWidth
                                    label="📞 Telefone"
                                    value={data.telefone_solicitante}
                                    onChange={(e) => setData({ ...data, telefone_solicitante: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '12px',
                                            backgroundColor: '#ffffff',
                                        }
                                    }}
                                />
                                <TextField
                                    fullWidth
                                    label="🆔 RG"
                                    value={data.rg}
                                    onChange={(e) => setData({ ...data, rg: e.target.value })}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '12px',
                                            backgroundColor: '#ffffff',
                                        }
                                    }}
                                />
                            </div>
                            <TextField
                                fullWidth
                                label="📍 Endereço Completo"
                                value={data.endereco}
                                onChange={(e) => setData({ ...data, endereco: e.target.value })}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '12px',
                                        backgroundColor: '#ffffff',
                                    }
                                }}
                            />
                        </div>
                    </Box>

                    {/* Detalhes da Ocorrência */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <TextField
                            fullWidth
                            label="📅 Data do Ocorrido"
                            type="date"
                            value={data.data_ocorrencia}
                            onChange={(e) => setData({ ...data, data_ocorrencia: e.target.value })}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    backgroundColor: '#ffffff',
                                    '&:hover': {
                                        backgroundColor: '#fff8e1',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: '#ffffff',
                                    }
                                }
                            }}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={data.devolvido}
                                    onChange={(e) => setData({ ...data, devolvido: e.target.checked })}
                                    sx={{
                                        color: '#ff9800',
                                        '&.Mui-checked': {
                                            color: '#4caf50',
                                        }
                                    }}
                                />
                            }
                            label="✅ Já foi devolvido?"
                            sx={{
                                backgroundColor: '#f5f5f5',
                                padding: '12px',
                                borderRadius: '12px',
                                margin: 0,
                                fontWeight: 600,
                            }}
                        />
                    </div>

                    <TextField
                        fullWidth
                        label="📝 Observações"
                        multiline
                        rows={4}
                        value={data.observacoes}
                        onChange={(e) => setData({ ...data, observacoes: e.target.value })}
                        placeholder="Digite observações relevantes sobre a ocorrência..."
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                backgroundColor: '#ffffff',
                                '&:hover': {
                                    backgroundColor: '#fff8e1',
                                },
                                '&.Mui-focused': {
                                    backgroundColor: '#ffffff',
                                }
                            }
                        }}
                    />
                    
                    <Button
                        variant="contained"
                        onClick={() => onSubmit(data)}
                        fullWidth
                        sx={{ 
                            marginTop: '32px',
                            padding: '16px',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                            boxShadow: '0 4px 16px rgba(255, 152, 0, 0.3)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #f57c00 0%, #e65100 100%)',
                                boxShadow: '0 6px 20px rgba(255, 152, 0, 0.4)',
                                transform: 'translateY(-2px)',
                            },
                            transition: 'all 0.2s ease-in-out'
                        }}
                    >
                        {editData ? "💾 Salvar Alterações" : "✨ Registrar Retirada"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}