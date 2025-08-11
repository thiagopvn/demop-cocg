import React, { useContext, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    Button,
    TextField,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { CategoriaContext } from "../contexts/CategoriaContext";

export default function MaterialDialog({ onSubmit, onCancel, open, editData = null }) {
    const { categorias } = useContext(CategoriaContext);
    const [data, setData] = React.useState({
        id: editData?.id || "",
        description: editData?.description || "",
        estoque_atual: editData?.estoque_atual || 0,
        estoque_total: editData?.estoque_total || 0,
        categoria: editData?.categoria || "",
        categoria_id: editData?.categoria_id || "",
    });
  const handleChangeCategoria = (event) => {
        const selectedCategoriaId = event.target.value;
        const selectedCategoria = categorias.find(
            (categoria) => categoria.id === selectedCategoriaId
        );

        setData({
            ...data,
            categoria_id: selectedCategoriaId,
            categoria: selectedCategoria ? selectedCategoria.description : "",
        });
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
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fff8 100%)',
                }
            }}
        >
            <DialogTitle 
                sx={{ 
                    textAlign: 'center', 
                    fontSize: '1.5rem', 
                    fontWeight: 700, 
                    paddingBottom: 1,
                    background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                    color: 'white',
                    margin: 0,
                    borderRadius: '16px 16px 0 0',
                }}
            >
                {editData ? "✏️ Editar Material" : "📦 Novo Material"}
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
                    <TextField
                        fullWidth
                        label="📝 Descrição"
                        value={data.description}
                        onChange={(e) => setData({ ...data, description: e.target.value })}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                backgroundColor: '#ffffff',
                                '&:hover': {
                                    backgroundColor: '#f8fff8',
                                },
                                '&.Mui-focused': {
                                    backgroundColor: '#ffffff',
                                }
                            }
                        }}
                    />
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <TextField
                            fullWidth
                            label="📦 Estoque Disponível"
                            type='number'
                            value={data.estoque_atual}
                            onChange={(e) => setData({ ...data, estoque_atual: e.target.value })}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    backgroundColor: '#ffffff',
                                    '&:hover': {
                                        backgroundColor: '#f8fff8',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: '#ffffff',
                                    }
                                }
                            }}
                        />
                        <TextField
                            fullWidth
                            label="📊 Estoque Total"
                            type="number"
                            value={data.estoque_total}
                            onChange={(e) => setData({ ...data, estoque_total: e.target.value })}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    backgroundColor: '#ffffff',
                                    '&:hover': {
                                        backgroundColor: '#f8fff8',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: '#ffffff',
                                    }
                                }
                            }}
                        />
                    </div>
                    
                    <FormControl fullWidth>
                        <InputLabel id="categoria-select-label">🏷️ Categoria</InputLabel>
                        <Select
                            labelId="categoria-select-label"
                            id="categoria-select"
                            value={data.categoria_id}
                            label="🏷️ Categoria"
                            onChange={handleChangeCategoria}
                            sx={{
                                borderRadius: '12px',
                                backgroundColor: '#ffffff',
                                '&:hover': {
                                    backgroundColor: '#f8fff8',
                                },
                                '&.Mui-focused': {
                                    backgroundColor: '#ffffff',
                                }
                            }}
                        >
                            {categorias.map((categoria) => (
                                <MenuItem key={categoria.id} value={categoria.id}>
                                    {categoria.description}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    
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
                            background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                            boxShadow: '0 4px 16px rgba(76, 175, 80, 0.3)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #45a049 0%, #388e3c 100%)',
                                boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
                                transform: 'translateY(-2px)',
                            },
                            transition: 'all 0.2s ease-in-out'
                        }}
                    >
                        {editData ? "💾 Salvar Alterações" : "✨ Criar Material"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}