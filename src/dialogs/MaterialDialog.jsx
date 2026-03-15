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
    LinearProgress,
    alpha,
    Collapse
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CollectionsIcon from '@mui/icons-material/Collections';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import BuildIcon from '@mui/icons-material/Build';
import { addDoc, updateDoc, doc, serverTimestamp, collection } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import db, { storage } from '../firebase/db';
import { CategoriaContext } from '../contexts/CategoriaContext';
import { logAudit } from '../firebase/auditLog';
import { findSimilarMaterials } from '../utils/materialSimilarity';
import { incrementTaskProgress } from '../firebase/taskProgress';
import { findBestTemplate, findMatchingTemplates } from '../utils/maintenanceTemplateMatcher';
import { MAINTENANCE_TYPE_LABELS } from '../data/maintenanceTemplates';
import { applySelectedMaintenances } from '../utils/seedMaintenances';
import MaintenanceSuggestionDialog from './MaintenanceSuggestionDialog';

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB (antes da compressão)
const MAX_DIMENSION = 1200; // px
const COMPRESSION_QUALITY = 0.8;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/**
 * Comprime e redimensiona imagem via Canvas.
 * Retorna um File pronto para upload (JPEG, tipicamente 100-400KB).
 */
const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let { width, height } = img;

            // Redimensionar se maior que MAX_DIMENSION
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height * MAX_DIMENSION) / width);
                    width = MAX_DIMENSION;
                } else {
                    width = Math.round((width * MAX_DIMENSION) / height);
                    height = MAX_DIMENSION;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Falha ao comprimir imagem'));
                        return;
                    }
                    const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(compressed);
                },
                'image/jpeg',
                COMPRESSION_QUALITY
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Erro ao carregar imagem'));
        };

        img.src = url;
    });
};

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
    const cameraInputRef = useRef(null);

    // Maintenance suggestion states
    const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
    const [matchedTemplate, setMatchedTemplate] = useState(null);
    const [pendingMaterial, setPendingMaterial] = useState(null);
    const [suggestionLoading, setSuggestionLoading] = useState(false);
    const [liveTemplateMatch, setLiveTemplateMatch] = useState(null);

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

    // Detecção em tempo real de template de manutenção
    useEffect(() => {
        if (!open || isEditing || !description || description.length < 3) {
            setLiveTemplateMatch(null);
            return;
        }
        const timer = setTimeout(() => {
            const template = findBestTemplate(description);
            setLiveTemplateMatch(template || null);
        }, 400);
        return () => clearTimeout(timer);
    }, [description, open, isEditing]);

    const handleImageSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validação robusta: alguns navegadores mobile não definem file.type para fotos da câmera
        const isImage = (file.type && file.type.startsWith('image/')) ||
            /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(file.name);
        if (!isImage) {
            setErrors(prev => ({ ...prev, image: 'Selecione um arquivo de imagem.' }));
            return;
        }
        if (file.size > MAX_IMAGE_SIZE) {
            setErrors(prev => ({ ...prev, image: 'Imagem muito grande. Máximo: 20MB.' }));
            return;
        }

        setErrors(prev => { const { image, ...rest } = prev; return rest; });

        try {
            let processedFile;
            try {
                processedFile = await compressImage(file);
            } catch {
                // Fallback: se a compressão falhar (ex: HEIC em navegadores que não suportam),
                // usa o arquivo original
                processedFile = file;
            }
            setImageFile(processedFile);
            setRemoveImage(false);

            const reader = new FileReader();
            reader.onload = (ev) => setImagePreview(ev.target.result);
            reader.onerror = () => {
                // Fallback: cria preview via URL.createObjectURL
                setImagePreview(URL.createObjectURL(processedFile));
            };
            reader.readAsDataURL(processedFile);
        } catch {
            setErrors(prev => ({ ...prev, image: 'Erro ao processar imagem. Tente outra.' }));
        }
    };

    const handleCameraClick = () => {
        if (cameraInputRef.current) {
            cameraInputRef.current.value = '';
            cameraInputRef.current.click();
        }
    };

    const handleGalleryClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (existingImageUrl) {
            setRemoveImage(true);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    };

    const uploadImage = async (materialId) => {
        if (!imageFile) return null;

        const timestamp = Date.now();
        const storagePath = `materials/${materialId}/${timestamp}.jpg`;
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
                incrementTaskProgress(loggedUserId, loggedUserName);
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
                    const errorMsg = imgError?.code === 'storage/unauthorized'
                        ? 'Sem permissão para enviar fotos. Verifique as regras do Firebase Storage.'
                        : imgError?.code === 'storage/canceled'
                            ? 'Upload cancelado.'
                            : `Erro ao enviar foto: ${imgError?.message || imgError}. O material foi salvo sem foto.`;
                    setErrors(prev => ({ ...prev, general: errorMsg }));
                    setLoading(false);
                    return;
                }
            }

            // Após criar (não editar), verificar se existe template de manutenção
            if (!isEditing && savedDocId) {
                const template = findBestTemplate(description);
                if (template) {
                    const selectedCategoria = categorias.find(c => c.id === categoriaId);
                    setPendingMaterial({
                        id: savedDocId,
                        description,
                        categoria: selectedCategoria?.description || selectedCategoria?.name || '',
                    });
                    setMatchedTemplate(template);
                    setSuggestionDialogOpen(true);
                    setLoading(false);
                    return; // Não fecha o dialog principal ainda
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

    const handleSuggestionConfirm = async (selectedIndices) => {
        if (!pendingMaterial || !matchedTemplate) return;
        setSuggestionLoading(true);
        try {
            await applySelectedMaintenances(pendingMaterial, matchedTemplate, selectedIndices);
        } catch (error) {
            console.error('Erro ao aplicar manutenções:', error);
        } finally {
            setSuggestionLoading(false);
            setSuggestionDialogOpen(false);
            setMatchedTemplate(null);
            setPendingMaterial(null);
            onClose();
        }
    };

    const handleSuggestionClose = () => {
        setSuggestionDialogOpen(false);
        setMatchedTemplate(null);
        setPendingMaterial(null);
        onClose();
    };

    const currentImage = imagePreview || (!removeImage ? existingImageUrl : null);

    return (
    <>
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
                            onClick={handleGalleryClick}
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
                                startIcon={<CameraAltIcon />}
                                onClick={handleCameraClick}
                                sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                            >
                                Tirar Foto
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<CollectionsIcon />}
                                onClick={handleGalleryClick}
                                sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                            >
                                Galeria
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
                                Comprimida automaticamente.
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
                    {/* Input para galeria/arquivos */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleImageSelect}
                    />
                    {/* Input para câmera (abre direto) */}
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
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

                {/* Preview de template de manutenção detectado */}
                <Collapse in={!isEditing && !!liveTemplateMatch}>
                    {liveTemplateMatch && (
                        <Alert
                            severity="success"
                            icon={<AutoFixHighIcon fontSize="small" />}
                            sx={{
                                mb: 2,
                                borderRadius: 2.5,
                                border: '1px solid',
                                borderColor: (theme) => alpha(theme.palette.success.main, 0.3),
                                bgcolor: (theme) => alpha(theme.palette.success.main, 0.04),
                                '& .MuiAlert-icon': { alignItems: 'flex-start', pt: 0.5 },
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                <BuildIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                Plano de manutenção disponível
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5, mb: 1 }}>
                                Este material foi identificado como <strong>{liveTemplateMatch.label}</strong>.
                                Ao criar, você poderá agendar automaticamente as manutenções preventivas do manual.
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                <Chip
                                    label={`${liveTemplateMatch.maintenances.length} manutenções`}
                                    size="small"
                                    color="success"
                                    sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                                />
                                {(() => {
                                    const types = [...new Set(liveTemplateMatch.maintenances.map(m => m.type))];
                                    return types.map(t => (
                                        <Chip
                                            key={t}
                                            label={MAINTENANCE_TYPE_LABELS[t] || t}
                                            size="small"
                                            variant="outlined"
                                            sx={{ height: 20, fontSize: '0.65rem' }}
                                        />
                                    ));
                                })()}
                            </Box>
                        </Alert>
                    )}
                </Collapse>

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

        {/* Dialog de sugestão de manutenções do manual */}
        <MaintenanceSuggestionDialog
            open={suggestionDialogOpen}
            onClose={handleSuggestionClose}
            onConfirm={handleSuggestionConfirm}
            template={matchedTemplate}
            materialDescription={pendingMaterial?.description || description}
            loading={suggestionLoading}
        />
    </>
    );
};

export default MaterialDialog;
