import { useState, useEffect, useContext, useRef } from 'react';
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
    FormHelperText,
    CircularProgress,
    IconButton,
    Alert,
    Box,
    Typography,
    Chip,
    LinearProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import { addDoc, updateDoc, doc, serverTimestamp, collection } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import db, { storage } from '../firebase/db';
import { CategoriaContext } from '../contexts/CategoriaContext';
import { logAudit } from '../firebase/auditLog';
import { findSimilarMaterials } from '../utils/materialSimilarity';
import { incrementTaskProgress } from '../firebase/taskProgress';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const MaterialDialog = ({ open, onClose, material, loggedUserName, loggedUserId, materials = [] }) => {
    const { categorias } = useContext(CategoriaContext);
    const [description, setDescription] = useState('');
    const [categoriaId, setCategoriaId] = useState('');
    const [estoqueTotal, setEstoqueTotal] = useState(1);
    const [estoqueAtual, setEstoqueAtual] = useState(1);
    const [loading, setLoading] = useState(false);
    const [similarMaterials, setSimilarMaterials] = useState([]);
    const [errors, setErrors] = useState({});

    // Image states
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [existingImageUrl, setExistingImageUrl] = useState(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    const isEditing = material != null;

    useEffect(() => {
        if (open) {
            setErrors({});
            setImageFile(null);
            setImagePreview(null);
            setRemoveImage(false);
            setUploadProgress(0);
            if (isEditing && material) {
                setDescription(material.description || '');
                setCategoriaId(material.categoria_id || '');
                setEstoqueTotal(material.estoque_total ?? 1);
                setEstoqueAtual(material.estoque_atual ?? 0);
                setExistingImageUrl(material.image_url || null);
            } else {
                setDescription('');
                setCategoriaId('');
                setEstoqueTotal(1);
                setEstoqueAtual(1);
                setExistingImageUrl(null);
            }
        }
    }, [material, open, isEditing]);

    useEffect(() => {
        if (!open || isEditing || !description || description.length < 3) {
            setSimilarMaterials([]);
            return;
        }

        const timer = setTimeout(() => {
            const similar = findSimilarMaterials(
                description,
                materials,
                material?.id,
                0.5
            );
            setSimilarMaterials(similar);
        }, 300);

        return () => clearTimeout(timer);
    }, [description, materials, material, open, isEditing]);

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            setErrors(prev => ({ ...prev, image: 'Use apenas JPG, PNG ou WebP.' }));
            return;
        }
        if (file.size > MAX_IMAGE_SIZE) {
            setErrors(prev => ({ ...prev, image: 'Imagem muito grande. Máximo: 5MB.' }));
            return;
        }

        setErrors(prev => { const { image, ...rest } = prev; return rest; });
        setImageFile(file);
        setRemoveImage(false);

        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (existingImageUrl) {
            setRemoveImage(true);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const uploadImage = async (materialId) => {
        if (!imageFile) return null;

        const timestamp = Date.now();
        const ext = imageFile.name.split('.').pop();
        const storagePath = `materials/${materialId}/${timestamp}.${ext}`;
        const storageRef = ref(storage, storagePath);

        return new Promise((resolve, reject) => {
            const uploadTask = uploadBytesResumable(storageRef, imageFile, {
                contentType: imageFile.type,
            });

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    setUploadProgress(progress);
                },
                (error) => reject(error),
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve({ downloadURL, storagePath });
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    };

    const deleteOldImage = async (path) => {
        if (!path) return;
        try {
            const storageRef = ref(storage, path);
            await deleteObject(storageRef);
        } catch (e) {
            // Ignore if file doesn't exist
        }
    };

    const handleSubmit = async () => {
        const newErrors = {};
        if (!description) {
            newErrors.description = 'Descrição é obrigatória';
        }
        if (!categoriaId) {
            newErrors.categoriaId = 'Categoria é obrigatória';
        }
        if (estoqueTotal === '' || Number(estoqueTotal) < 0) {
            newErrors.estoqueTotal = 'Estoque deve ser >= 0';
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});
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
            conferido_por: loggedUserName || null,
            ultima_conferencia: serverTimestamp(),
        };

        try {
            let savedDocId = null;

            if (isEditing && material?.id) {
                savedDocId = material.id;

                // Handle image removal (without upload)
                if (removeImage && !imageFile) {
                    if (material.image_storagePath) {
                        await deleteOldImage(material.image_storagePath);
                    }
                    data.image_url = null;
                    data.image_storagePath = null;
                }

                const materialDoc = doc(db, 'materials', material.id);
                await updateDoc(materialDoc, data);
                logAudit({
                    action: 'material_update',
                    userId: loggedUserId,
                    userName: loggedUserName,
                    targetCollection: 'materials',
                    targetId: material.id,
                    targetName: description,
                    details: { categoria: data.categoria, estoque_total: data.estoque_total, estoque_atual: data.estoque_atual },
                });
                incrementTaskProgress(loggedUserId, loggedUserName);
            } else {
                const materialsCollection = collection(db, 'materials');
                const newDoc = await addDoc(materialsCollection, {
                    ...data,
                    maintenance_status: "operante",
                    created_at: serverTimestamp(),
                    image_url: null,
                    image_storagePath: null,
                });
                savedDocId = newDoc.id;

                logAudit({
                    action: 'material_create',
                    userId: loggedUserId,
                    userName: loggedUserName,
                    targetCollection: 'materials',
                    targetId: newDoc.id,
                    targetName: description,
                    details: { categoria: data.categoria, estoque_total: data.estoque_total, estoque_atual: data.estoque_atual },
                });
            }

            // Upload image separately (non-blocking for material save)
            if (imageFile && savedDocId) {
                try {
                    // Delete old image if replacing
                    if (isEditing && material?.image_storagePath) {
                        await deleteOldImage(material.image_storagePath);
                    }
                    const result = await uploadImage(savedDocId);
                    if (result) {
                        await updateDoc(doc(db, 'materials', savedDocId), {
                            image_url: result.downloadURL,
                            image_storagePath: result.storagePath,
                        });
                    }
                } catch (imgError) {
                    console.error("Erro ao fazer upload da imagem:", imgError);
                    // Material was saved successfully, just image failed
                    setErrors(prev => ({ ...prev, general: 'Material salvo, mas houve erro ao enviar a foto. Tente editar o material e enviar a foto novamente.' }));
                    setLoading(false);
                    return; // Don't close dialog so user sees the warning
                }
            }

            onClose();
        } catch (error) {
            console.error("Erro ao salvar material:", error);
            setErrors(prev => ({ ...prev, general: `Falha ao salvar o material: ${error.message || error}` }));
        } finally {
            setLoading(false);
        }
    };

    const currentImage = imagePreview || (!removeImage ? existingImageUrl : null);

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
                {errors.general && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrors(prev => { const { general, ...rest } = prev; return rest; })}>
                        {errors.general}
                    </Alert>
                )}

                {/* Image Upload Section */}
                <Box sx={{ mb: 2, mt: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontSize: '0.85rem' }}>
                        Foto do Material
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                        }}
                    >
                        {/* Preview / Placeholder */}
                        <Box
                            sx={{
                                width: 100,
                                height: 100,
                                borderRadius: 2,
                                border: '2px dashed',
                                borderColor: errors.image ? 'error.main' : 'divider',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                bgcolor: 'grey.50',
                                flexShrink: 0,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: 'action.hover',
                                },
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {currentImage ? (
                                <Box
                                    component="img"
                                    src={currentImage}
                                    alt="Preview"
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
                            ) : (
                                <Box sx={{ textAlign: 'center', p: 1 }}>
                                    <ImageIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
                                    <Typography variant="caption" display="block" color="text.disabled" sx={{ fontSize: '0.65rem', lineHeight: 1.2 }}>
                                        Sem foto
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        {/* Buttons */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<PhotoCameraIcon />}
                                onClick={() => fileInputRef.current?.click()}
                                sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                            >
                                {currentImage ? 'Trocar' : 'Adicionar'}
                            </Button>
                            {currentImage && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    color="error"
                                    startIcon={<DeleteIcon />}
                                    onClick={handleRemoveImage}
                                    sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                                >
                                    Remover
                                </Button>
                            )}
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                                JPG, PNG ou WebP. Máx 5MB.
                            </Typography>
                        </Box>
                    </Box>
                    {errors.image && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                            {errors.image}
                        </Typography>
                    )}
                    {uploadProgress > 0 && uploadProgress < 100 && (
                        <LinearProgress
                            variant="determinate"
                            value={uploadProgress}
                            sx={{ mt: 1, borderRadius: 1 }}
                        />
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={handleImageSelect}
                    />
                </Box>

                <TextField
                    autoFocus
                    margin="dense"
                    label="Descrição do Material"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={description}
                    onChange={(e) => {
                        setDescription(e.target.value);
                        setErrors(prev => { const { description, ...rest } = prev; return rest; });
                    }}
                    error={!!errors.description}
                    helperText={errors.description}
                    sx={{ mb: 2 }}
                />
                {similarMaterials.length > 0 && (
                    <Alert
                        severity="warning"
                        sx={{
                            mb: 2, borderRadius: 2.5,
                            border: '1px solid',
                            borderColor: 'warning.light',
                            '& .MuiAlert-icon': { alignItems: 'flex-start', pt: 0.5 },
                        }}
                    >
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                            Possível material duplicado
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary', lineHeight: 1.5 }}>
                            Já possuímos materiais cadastrados com nomes muito similares.
                            Tem certeza que deseja criar um novo em vez de adicionar estoque ao existente?
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                            {similarMaterials.map(m => (
                                <Box
                                    key={m.id}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 1,
                                        p: 1, borderRadius: 1.5,
                                        bgcolor: 'rgba(255, 152, 0, 0.06)',
                                        border: '1px solid rgba(255, 152, 0, 0.15)',
                                    }}
                                >
                                    <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }} noWrap>
                                        {m.description}
                                    </Typography>
                                    <Chip
                                        label={m.categoria || 'Sem cat.'}
                                        size="small"
                                        variant="outlined"
                                        sx={{ height: 22, fontSize: '0.7rem', flexShrink: 0 }}
                                    />
                                    <Chip
                                        label={`${Math.round(m.similarity * 100)}%`}
                                        size="small"
                                        sx={{
                                            height: 22, fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                                            bgcolor: m.similarity >= 0.8 ? 'error.main' : 'warning.main',
                                            color: 'white',
                                        }}
                                    />
                                </Box>
                            ))}
                        </Box>
                    </Alert>
                )}
                <FormControl fullWidth margin="dense" sx={{ mb: 2 }} error={!!errors.categoriaId}>
                    <InputLabel>Categoria</InputLabel>
                    <Select
                        value={categoriaId}
                        label="Categoria"
                        onChange={(e) => {
                            setCategoriaId(e.target.value);
                            setErrors(prev => { const { categoriaId, ...rest } = prev; return rest; });
                        }}
                    >
                        {categorias.map(cat => (
                            <MenuItem key={cat.id} value={cat.id}>
                                {cat.description || cat.name}
                            </MenuItem>
                        ))}
                    </Select>
                    {errors.categoriaId && <FormHelperText>{errors.categoriaId}</FormHelperText>}
                </FormControl>
                <TextField
                    margin="dense"
                    label="Estoque Total"
                    type="number"
                    fullWidth
                    variant="outlined"
                    value={estoqueTotal}
                    onChange={(e) => {
                        setEstoqueTotal(e.target.value);
                        setErrors(prev => { const { estoqueTotal, ...rest } = prev; return rest; });
                    }}
                    error={!!errors.estoqueTotal}
                    helperText={errors.estoqueTotal}
                    InputProps={{ inputProps: { min: 0 } }}
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
