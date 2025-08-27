import { useState, useEffect, useContext } from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button, 
    TextField, 
    Select, 
    MenuItem, 
    FormControl, 
    InputLabel, 
    CircularProgress,
    IconButton 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { addDoc, updateDoc, doc, serverTimestamp, collection } from 'firebase/firestore';
import db from '../firebase/db';
import { CategoriaContext } from '../contexts/CategoriaContext';

const MaterialDialog = ({ open, onClose, material }) => {
    const { categorias } = useContext(CategoriaContext);
    const [description, setDescription] = useState('');
    const [categoriaId, setCategoriaId] = useState('');
    const [estoqueTotal, setEstoqueTotal] = useState(1);
    const [estoqueAtual, setEstoqueAtual] = useState(1);
    const [loading, setLoading] = useState(false);

    const isEditing = material != null;

    useEffect(() => {
        if (open) {
            if (isEditing && material) {
                setDescription(material.description || '');
                setCategoriaId(material.categoria_id || '');
                setEstoqueTotal(material.estoque_total || 1);
                setEstoqueAtual(material.estoque_atual || 1);
            } else {
                // Reset form for new material
                setDescription('');
                setCategoriaId('');
                setEstoqueTotal(1);
                setEstoqueAtual(1);
            }
        }
    }, [material, open, isEditing]);

    const handleSubmit = async () => {
        if (!description || !categoriaId || estoqueTotal <= 0) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }
        setLoading(true);

        const selectedCategoria = categorias.find(c => c.id === categoriaId);
        const data = {
            description,
            description_lower: description.toLowerCase(),
            categoria: selectedCategoria?.description || selectedCategoria?.name || '',
            categoria_id: categoriaId,
            estoque_total: Number(estoqueTotal),
            estoque_atual: Number(estoqueAtual),
            ultima_movimentacao: serverTimestamp(),
        };

        try {
            if (isEditing && material?.id) {
                const materialDoc = doc(db, 'materials', material.id);
                await updateDoc(materialDoc, data);
            } else {
                const materialsCollection = collection(db, 'materials');
                await addDoc(materialsCollection, {
                    ...data,
                    maintenance_status: "operante",
                    created_at: serverTimestamp(),
                });
            }
            onClose();
        } catch (error) {
            console.error("Erro ao salvar material: ", error);
            alert('Falha ao salvar o material.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>
                {isEditing ? 'Editar Material' : 'Adicionar Novo Material'}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Descrição do Material"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    sx={{ mb: 2 }}
                />
                <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
                    <InputLabel>Categoria</InputLabel>
                    <Select
                        value={categoriaId}
                        label="Categoria"
                        onChange={(e) => setCategoriaId(e.target.value)}
                    >
                        {categorias.map(cat => (
                            <MenuItem key={cat.id} value={cat.id}>
                                {cat.description || cat.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <TextField
                    margin="dense"
                    label="Estoque Total"
                    type="number"
                    fullWidth
                    variant="outlined"
                    value={estoqueTotal}
                    onChange={(e) => setEstoqueTotal(e.target.value)}
                    InputProps={{ inputProps: { min: 1 } }}
                    sx={{ mb: 2 }}
                />
                <TextField
                    margin="dense"
                    label="Estoque Disponível"
                    type="number"
                    fullWidth
                    variant="outlined"
                    value={estoqueAtual}
                    onChange={(e) => setEstoqueAtual(e.target.value)}
                    InputProps={{ inputProps: { min: 0, max: estoqueTotal } }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : (isEditing ? 'Salvar' : 'Criar')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MaterialDialog;