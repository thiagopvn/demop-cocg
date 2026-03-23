import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    LinearProgress,
    Alert,
    Chip,
    Divider,
    IconButton,
    Collapse,
    Checkbox,
    useTheme,
    alpha,
} from '@mui/material';
import {
    PlayArrow,
    Close,
    CheckCircle,
    Error as ErrorIcon,
    SkipNext,
    ExpandMore,
    ExpandLess,
    Inventory,
    AutoFixHigh,
    Build,
    CheckBoxOutlineBlank,
    CheckBox,
} from '@mui/icons-material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import db from '../firebase/db';
import { seedAllMaintenances } from '../utils/seedMaintenances';
import { findBestTemplate } from '../utils/maintenanceTemplateMatcher';

const SeedMaintenancesDialog = ({ open, onClose, materials }) => {
    const theme = useTheme();
    const [phase, setPhase] = useState('loading'); // loading | preview | running | done
    const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
    const [result, setResult] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [previewData, setPreviewData] = useState({ needsMaintenance: [], alreadyHas: [], noTemplate: [] });
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Ao abrir, analisar quais materiais realmente precisam de manutenção
    useEffect(() => {
        if (open) {
            analyzeMateria();
        } else {
            setPhase('loading');
            setResult(null);
            setShowDetails(false);
        }
    }, [open]);

    const analyzeMateria = async () => {
        setPhase('loading');
        const needsMaintenance = [];
        const alreadyHas = [];
        const noTemplate = [];

        for (const m of materials) {
            const template = findBestTemplate(m.description);
            if (!template) {
                noTemplate.push(m);
                continue;
            }

            // Verificar se já tem manutenções
            try {
                const snap = await getDocs(query(
                    collection(db, 'manutencoes'),
                    where('materialId', '==', m.id)
                ));
                if (snap.size > 0) {
                    alreadyHas.push({ ...m, template, existingCount: snap.size });
                } else {
                    needsMaintenance.push({ ...m, template });
                }
            } catch {
                needsMaintenance.push({ ...m, template });
            }
        }

        setPreviewData({ needsMaintenance, alreadyHas, noTemplate });
        setSelectedIds(new Set(needsMaintenance.map(m => m.id)));
        setPhase('preview');
    };

    const handleToggle = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === previewData.needsMaintenance.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(previewData.needsMaintenance.map(m => m.id)));
        }
    };

    const handleStart = async () => {
        const selectedMaterials = previewData.needsMaintenance.filter(m => selectedIds.has(m.id));
        if (selectedMaterials.length === 0) return;

        setPhase('running');
        setProgress({ current: 0, total: selectedMaterials.length, message: 'Iniciando...' });

        try {
            const seedResult = await seedAllMaintenances(selectedMaterials, (info) => {
                setProgress({
                    current: info.current,
                    total: info.total,
                    message: info.phase === 'matching'
                        ? `Analisando: ${info.material}`
                        : info.phase === 'applying'
                            ? `Aplicando: ${info.template} → ${info.material}`
                            : `Processando...`,
                });
            });
            setResult(seedResult);
            setPhase('done');
        } catch (error) {
            setResult({ error: error.message || 'Erro desconhecido' });
            setPhase('done');
        }
    };

    const handleClose = () => {
        if (phase === 'running') return;
        onClose(phase === 'done' && result?.created > 0);
    };

    const progressPercent = progress.total > 0
        ? Math.round((progress.current / progress.total) * 100) : 0;

    const totalNewMaintenances = previewData.needsMaintenance
        .filter(m => selectedIds.has(m.id))
        .reduce((sum, m) => sum + (m.template?.maintenances?.length || 0), 0);

    return (
        <Dialog
            open={open}
            onClose={phase === 'running' ? undefined : handleClose}
            fullWidth
            maxWidth="md"
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
        >
            {/* Header */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark || '#c75000'} 100%)`,
                    color: 'white',
                    px: 3,
                    py: 2.5,
                    position: 'relative',
                }}
            >
                <IconButton
                    onClick={handleClose}
                    disabled={phase === 'running'}
                    sx={{ position: 'absolute', top: 8, right: 8, color: 'rgba(255,255,255,0.8)' }}
                >
                    <Close />
                </IconButton>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Build sx={{ fontSize: 26 }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>
                            Criar Manutenções para Motomecanizados
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.85 }}>
                            Plano preventivo baseado nos manuais dos fabricantes
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
                {/* === LOADING === */}
                {phase === 'loading' && (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <LinearProgress sx={{ mb: 2 }} />
                        <Typography color="text.secondary">Analisando materiais cadastrados...</Typography>
                    </Box>
                )}

                {/* === PREVIEW === */}
                {phase === 'preview' && (
                    <>
                        {previewData.needsMaintenance.length === 0 ? (
                            <Alert severity="success" sx={{ borderRadius: 2 }}>
                                <Typography variant="body2" fontWeight={600}>
                                    Todos os materiais motomecanizados já possuem manutenções programadas!
                                </Typography>
                                {previewData.alreadyHas.length > 0 && (
                                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                                        {previewData.alreadyHas.length} material(is) com manutenções ativas.
                                    </Typography>
                                )}
                            </Alert>
                        ) : (
                            <>
                                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                                    <Typography variant="body2">
                                        Os materiais abaixo foram identificados como motomecanizados e <strong>ainda não possuem
                                        manutenções programadas</strong>. Selecione os que deseja incluir no plano preventivo.
                                    </Typography>
                                </Alert>

                                {/* Resumo */}
                                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                                    <Box sx={{ flex: 1, minWidth: 120, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.08), border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.2), textAlign: 'center' }}>
                                        <Typography variant="h4" fontWeight={700} color="success.main">{selectedIds.size}</Typography>
                                        <Typography variant="caption" color="text.secondary">Selecionados</Typography>
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 120, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.08), border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.2), textAlign: 'center' }}>
                                        <Typography variant="h4" fontWeight={700} color="primary.main">{totalNewMaintenances}</Typography>
                                        <Typography variant="caption" color="text.secondary">Manutenções a criar</Typography>
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 120, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.grey[500], 0.08), border: '1px solid', borderColor: alpha(theme.palette.grey[500], 0.2), textAlign: 'center' }}>
                                        <Typography variant="h4" fontWeight={700} color="text.secondary">{previewData.alreadyHas.length}</Typography>
                                        <Typography variant="caption" color="text.secondary">Já com manutenção</Typography>
                                    </Box>
                                </Box>

                                {/* Selecionar todos */}
                                <Box
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, cursor: 'pointer', userSelect: 'none' }}
                                    onClick={handleSelectAll}
                                >
                                    <Checkbox
                                        checked={selectedIds.size === previewData.needsMaintenance.length}
                                        indeterminate={selectedIds.size > 0 && selectedIds.size < previewData.needsMaintenance.length}
                                        size="small"
                                        color="success"
                                    />
                                    <Typography variant="body2" fontWeight={600}>
                                        Selecionar todos ({previewData.needsMaintenance.length})
                                    </Typography>
                                </Box>

                                {/* Lista de materiais sem manutenção */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 300, overflowY: 'auto', mb: 1 }}>
                                    {previewData.needsMaintenance.map(m => (
                                        <Box
                                            key={m.id}
                                            onClick={() => handleToggle(m.id)}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                p: 1,
                                                borderRadius: 1.5,
                                                cursor: 'pointer',
                                                bgcolor: selectedIds.has(m.id) ? alpha(theme.palette.success.main, 0.06) : 'grey.50',
                                                border: '1px solid',
                                                borderColor: selectedIds.has(m.id) ? alpha(theme.palette.success.main, 0.3) : 'grey.200',
                                                transition: 'all 0.15s ease',
                                                '&:hover': { borderColor: 'success.main' },
                                            }}
                                        >
                                            <Checkbox checked={selectedIds.has(m.id)} size="small" color="success" sx={{ p: 0.5 }} />
                                            <AutoFixHigh sx={{ fontSize: 16, color: selectedIds.has(m.id) ? 'success.main' : 'text.disabled' }} />
                                            <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }} noWrap>
                                                {m.description}
                                            </Typography>
                                            <Chip
                                                label={m.template.label}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                                sx={{ height: 22, fontSize: '0.65rem' }}
                                            />
                                            <Chip
                                                label={`${m.template.maintenances.length}`}
                                                size="small"
                                                color="success"
                                                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, minWidth: 28 }}
                                            />
                                        </Box>
                                    ))}
                                </Box>
                            </>
                        )}

                        {/* Materiais que já têm manutenção (colapsável) */}
                        {previewData.alreadyHas.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                                <Button
                                    fullWidth
                                    size="small"
                                    onClick={() => setShowDetails(!showDetails)}
                                    endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                                    sx={{ justifyContent: 'space-between', textTransform: 'none', color: 'text.secondary' }}
                                >
                                    {previewData.alreadyHas.length} material(is) já com manutenção programada
                                </Button>
                                <Collapse in={showDetails}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 150, overflowY: 'auto', mt: 0.5 }}>
                                        {previewData.alreadyHas.map(m => (
                                            <Box
                                                key={m.id}
                                                sx={{
                                                    display: 'flex', alignItems: 'center', gap: 1, p: 0.8, borderRadius: 1.5,
                                                    bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200',
                                                }}
                                            >
                                                <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                                                <Typography variant="caption" sx={{ flex: 1 }} noWrap>{m.description}</Typography>
                                                <Chip label={`${m.existingCount} ativas`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                                            </Box>
                                        ))}
                                    </Box>
                                </Collapse>
                            </Box>
                        )}
                    </>
                )}

                {/* === RUNNING === */}
                {phase === 'running' && (
                    <Box sx={{ py: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Build sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }, color: 'primary.main' }} />
                            <Typography variant="subtitle1" fontWeight={600}>
                                Criando manutenções...
                            </Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={progressPercent} sx={{ mb: 1, height: 8, borderRadius: 4 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">{progress.message}</Typography>
                            <Typography variant="caption" fontWeight={600}>{progressPercent}%</Typography>
                        </Box>
                    </Box>
                )}

                {/* === DONE === */}
                {phase === 'done' && result && (
                    <>
                        {result.error ? (
                            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>Erro: {result.error}</Alert>
                        ) : (
                            <>
                                <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2, borderRadius: 2 }}>
                                    <Typography variant="body2" fontWeight={600}>
                                        {result.created > 0
                                            ? `${result.created} manutenções criadas com sucesso para ${result.matched} material(is)!`
                                            : 'Nenhuma manutenção nova necessária - tudo já estava programado.'
                                        }
                                    </Typography>
                                </Alert>

                                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                                    <Box sx={{ flex: 1, minWidth: 100, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.08), textAlign: 'center' }}>
                                        <CheckCircle sx={{ color: 'success.main', fontSize: 28 }} />
                                        <Typography variant="h5" fontWeight={700} color="success.main">{result.created}</Typography>
                                        <Typography variant="caption">Criadas</Typography>
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 100, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.08), textAlign: 'center' }}>
                                        <SkipNext sx={{ color: 'info.main', fontSize: 28 }} />
                                        <Typography variant="h5" fontWeight={700} color="info.main">{result.skipped}</Typography>
                                        <Typography variant="caption">Já existiam</Typography>
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 100, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.08), textAlign: 'center' }}>
                                        <Inventory sx={{ color: 'warning.main', fontSize: 28 }} />
                                        <Typography variant="h5" fontWeight={700} color="warning.main">{result.matched}</Typography>
                                        <Typography variant="caption">Materiais</Typography>
                                    </Box>
                                </Box>

                                {result.details && result.details.length > 0 && (
                                    <Box sx={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {result.details.filter(d => d.status === 'aplicado').map((d, i) => (
                                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.8, borderRadius: 1.5, bgcolor: alpha(theme.palette.success.main, 0.04), border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.15) }}>
                                                <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                                                <Typography variant="caption" sx={{ flex: 1 }} noWrap>{d.material}</Typography>
                                                <Chip label={`+${d.created}`} size="small" color="success" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </>
                        )}
                    </>
                )}
            </DialogContent>

            <Divider />
            <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, flexWrap: 'wrap' }}>
                {phase === 'preview' && (
                    <>
                        <Button onClick={handleClose} color="inherit" sx={{ textTransform: 'none' }}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleStart}
                            variant="contained"
                            color="secondary"
                            disabled={selectedIds.size === 0}
                            startIcon={<PlayArrow />}
                            sx={{ textTransform: 'none', fontWeight: 600, px: 3, borderRadius: 2 }}
                        >
                            Criar Manutenções ({selectedIds.size} materiais)
                        </Button>
                    </>
                )}
                {phase === 'done' && (
                    <Button onClick={handleClose} variant="contained" sx={{ textTransform: 'none', fontWeight: 600, px: 3, borderRadius: 2 }}>
                        Fechar
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default SeedMaintenancesDialog;
