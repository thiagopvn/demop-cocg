import { useState, useEffect } from 'react';
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
    Checkbox,
    FormControlLabel,
    Box,
    Typography,
    Alert,
    Grid,
    Autocomplete,
    Chip
} from '@mui/material';
import { CalendarMonth, Build, Warning } from '@mui/icons-material';
import { addDoc, updateDoc, doc, Timestamp, collection, getDocs } from 'firebase/firestore';
import db from '../firebase/db';

const MaintenanceDialog = ({ open, onClose, material }) => {
    const [formData, setFormData] = useState({
        maintenanceType: '',
        dueDate: '',
        responsible: '',
        description: '',
        markInoperant: false,
        priority: 'media',
        estimatedDuration: '',
        requiredParts: [],
        cost: ''
    });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState({
        nextDate: '',
        interval: ''
    });

    useEffect(() => {
        if (open) {
            fetchUsers();
            if (material) {
                generateSuggestions();
            }
            // Reset form when opening
            setFormData({
                maintenanceType: '',
                dueDate: '',
                responsible: '',
                description: '',
                markInoperant: false,
                priority: 'media',
                estimatedDuration: '',
                requiredParts: [],
                cost: ''
            });
            setError('');
        }
    }, [open, material]);

    const fetchUsers = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'users'));
            const userData = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name || doc.data().nome,
                ...doc.data()
            }));
            setUsers(userData);
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
        }
    };

    const generateSuggestions = () => {
        // Gerar sugestões baseadas no tipo de material
        const today = new Date();
        let nextDate = new Date(today);
        let interval = '';

        // Lógica para sugerir próxima manutenção baseada no tipo/categoria do material
        if (material?.categoria?.toLowerCase().includes('veículo') || 
            material?.description?.toLowerCase().includes('viatura')) {
            nextDate.setMonth(nextDate.getMonth() + 3); // Trimestral para veículos
            interval = 'Sugestão: Manutenção trimestral para veículos';
        } else if (material?.description?.toLowerCase().includes('armamento') ||
                   material?.description?.toLowerCase().includes('arma')) {
            nextDate.setMonth(nextDate.getMonth() + 6); // Semestral para armamentos
            interval = 'Sugestão: Manutenção semestral para armamentos';
        } else {
            nextDate.setFullYear(nextDate.getFullYear() + 1); // Anual por padrão
            interval = 'Sugestão: Manutenção anual para equipamentos gerais';
        }

        setSuggestions({
            nextDate: nextDate.toISOString().split('T')[0],
            interval: interval
        });
    };

    const validateForm = () => {
        if (!material) return 'Material não selecionado';
        if (!formData.maintenanceType) return 'Selecione o tipo de manutenção';
        if (!formData.dueDate) return 'Selecione a data prevista';
        
        const selectedDate = new Date(formData.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today && !['corretiva', 'reparo'].includes(formData.maintenanceType)) {
            return 'Data prevista não pode ser anterior a hoje para manutenções preventivas';
        }
        
        return null;
    };

    const handleSubmit = async () => {
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Criar documento de manutenção
            const maintenanceDoc = {
                materialId: material.id,
                materialDescription: material.description,
                materialCategory: material.categoria || 'N/A',
                type: formData.maintenanceType,
                dueDate: Timestamp.fromDate(new Date(formData.dueDate)),
                responsibleName: formData.responsible,
                description: formData.description,
                priority: formData.priority,
                estimatedDuration: formData.estimatedDuration ? parseInt(formData.estimatedDuration) : null,
                requiredParts: formData.requiredParts,
                estimatedCost: formData.cost ? parseFloat(formData.cost) : null,
                status: 'pendente',
                createdAt: Timestamp.now(),
                createdBy: 'Sistema' // Aqui você pode usar dados do usuário logado
            };

            await addDoc(collection(db, 'manutencoes'), maintenanceDoc);

            // Atualizar status do material se necessário
            if (formData.markInoperant) {
                const materialRef = doc(db, 'materials', material.id);
                await updateDoc(materialRef, {
                    maintenance_status: 'inoperante',
                    last_maintenance_update: Timestamp.now()
                });
            } else if (formData.maintenanceType === 'corretiva' || formData.maintenanceType === 'reparo') {
                const materialRef = doc(db, 'materials', material.id);
                await updateDoc(materialRef, {
                    maintenance_status: 'em_manutencao',
                    last_maintenance_update: Timestamp.now()
                });
            }

            handleClose();
            
            // Callback para atualizar a lista parent (se necessário)
            if (onClose) {
                onClose(true); // Indica que houve mudança
            }
            
        } catch (error) {
            console.error("Erro ao agendar manutenção: ", error);
            setError('Falha ao agendar manutenção. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            maintenanceType: '',
            dueDate: '',
            responsible: '',
            description: '',
            markInoperant: false,
            priority: 'media',
            estimatedDuration: '',
            requiredParts: [],
            cost: ''
        });
        setError('');
        onClose(false);
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (error) setError(''); // Limpar erro quando usuário começar a digitar
    };

    const getMaintenanceTypeIcon = () => {
        switch (formData.maintenanceType) {
            case 'corretiva':
            case 'reparo':
                return <Warning color="error" />;
            default:
                return <Build color="primary" />;
        }
    };

    const getMaintenanceTypeColor = () => {
        switch (formData.maintenanceType) {
            case 'corretiva':
            case 'reparo':
                return 'error';
            case 'diaria':
                return 'success';
            case 'trimestral':
            case 'semestral':
            case 'anual':
                return 'info';
            default:
                return 'primary';
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarMonth color="primary" />
                    <Typography variant="h6">
                        Agendar Manutenção
                    </Typography>
                </Box>
                {material && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Material: {material.description}
                    </Typography>
                )}
            </DialogTitle>
            
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {suggestions.interval && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        {suggestions.interval}
                    </Alert>
                )}

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Tipo de Manutenção *</InputLabel>
                            <Select 
                                value={formData.maintenanceType} 
                                label="Tipo de Manutenção *" 
                                onChange={(e) => handleInputChange('maintenanceType', e.target.value)}
                                startAdornment={getMaintenanceTypeIcon()}
                            >
                                <MenuItem value="diaria">Diária</MenuItem>
                                <MenuItem value="trimestral">Trimestral</MenuItem>
                                <MenuItem value="semestral">Semestral</MenuItem>
                                <MenuItem value="anual">Anual</MenuItem>
                                <MenuItem value="corretiva">Corretiva</MenuItem>
                                <MenuItem value="reparo">Reparo</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            margin="normal"
                            label="Data Prevista *"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.dueDate}
                            onChange={(e) => handleInputChange('dueDate', e.target.value)}
                            helperText={suggestions.nextDate ? `Sugestão: ${suggestions.nextDate}` : ''}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Autocomplete
                            fullWidth
                            options={users}
                            getOptionLabel={(option) => option.name || ''}
                            value={users.find(u => u.name === formData.responsible) || null}
                            onChange={(e, newValue) => handleInputChange('responsible', newValue?.name || '')}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    margin="normal"
                                    label="Responsável"
                                    fullWidth
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Prioridade</InputLabel>
                            <Select 
                                value={formData.priority} 
                                label="Prioridade"
                                onChange={(e) => handleInputChange('priority', e.target.value)}
                            >
                                <MenuItem value="baixa">Baixa</MenuItem>
                                <MenuItem value="media">Média</MenuItem>
                                <MenuItem value="alta">Alta</MenuItem>
                                <MenuItem value="critica">Crítica</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            margin="normal"
                            label="Duração Estimada (dias)"
                            type="number"
                            fullWidth
                            value={formData.estimatedDuration}
                            onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
                            inputProps={{ min: 1, max: 365 }}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            margin="normal"
                            label="Custo Estimado (R$)"
                            type="number"
                            fullWidth
                            value={formData.cost}
                            onChange={(e) => handleInputChange('cost', e.target.value)}
                            inputProps={{ min: 0, step: 0.01 }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Autocomplete
                            multiple
                            fullWidth
                            freeSolo
                            options={[]}
                            value={formData.requiredParts}
                            onChange={(e, newValue) => handleInputChange('requiredParts', newValue)}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                        variant="outlined"
                                        label={option}
                                        {...getTagProps({ index })}
                                        key={index}
                                    />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    margin="normal"
                                    label="Peças/Materiais Necessários"
                                    helperText="Digite e pressione Enter para adicionar"
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            margin="normal"
                            label="Descrição/Observações"
                            fullWidth
                            multiline
                            rows={3}
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Descreva os procedimentos necessários, problemas identificados, etc..."
                        />
                    </Grid>

                    {(formData.maintenanceType === 'corretiva' || formData.maintenanceType === 'reparo') && (
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Checkbox 
                                        checked={formData.markInoperant} 
                                        onChange={(e) => handleInputChange('markInoperant', e.target.checked)}
                                        color="warning"
                                    />
                                }
                                label="Marcar material como inoperante (material não poderá ser utilizado até conclusão)"
                            />
                        </Grid>
                    )}
                </Grid>

                {formData.maintenanceType && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Resumo da Manutenção:
                        </Typography>
                        <Chip 
                            label={`Tipo: ${formData.maintenanceType.charAt(0).toUpperCase() + formData.maintenanceType.slice(1)}`}
                            color={getMaintenanceTypeColor()}
                            size="small"
                            sx={{ mr: 1, mb: 1 }}
                        />
                        <Chip 
                            label={`Prioridade: ${formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}`}
                            color={formData.priority === 'critica' ? 'error' : formData.priority === 'alta' ? 'warning' : 'default'}
                            size="small"
                            sx={{ mr: 1, mb: 1 }}
                        />
                        {formData.estimatedDuration && (
                            <Chip 
                                label={`Duração: ${formData.estimatedDuration} dias`}
                                size="small"
                                sx={{ mr: 1, mb: 1 }}
                            />
                        )}
                    </Box>
                )}
            </DialogContent>
            
            <DialogActions sx={{ p: 3 }}>
                <Button onClick={handleClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button 
                    onClick={handleSubmit} 
                    variant="contained"
                    disabled={loading || !formData.maintenanceType || !formData.dueDate}
                    startIcon={<CalendarMonth />}
                >
                    {loading ? 'Agendando...' : 'Agendar Manutenção'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MaintenanceDialog;