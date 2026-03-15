import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
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
    Sync,
} from '@mui/icons-material';
import { seedAllMaintenances } from '../utils/seedMaintenances';
import { findBestTemplate } from '../utils/maintenanceTemplateMatcher';

/**
 * Dialog para importar/semear manutenções em lote para todos os materiais existentes.
 * Uso exclusivo de administradores.
 */
const SeedMaintenancesDialog = ({ open, onClose, materials }) => {
    const theme = useTheme();
    const [phase, setPhase] = useState('preview'); // preview | running | done
    const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
    const [result, setResult] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    // Preview: materiais que têm templates
    const preview = materials.map(m => ({
        id: m.id,
        description: m.description,
        template: findBestTemplate(m.description),
    }));

    const matchedMaterials = preview.filter(p => p.template);
    const unmatchedMaterials = preview.filter(p => !p.template);

    const handleStart = async () => {
        setPhase('running');
        setProgress({ current: 0, total: matchedMaterials.length, message: 'Iniciando...' });

        try {
            const seedResult = await seedAllMaintenances(materials, (info) => {
                setProgress({
                    current: info.current,
                    total: info.total,
                    message: info.phase === 'matching'
                        ? `Analisando: ${info.material}`
                        : info.phase === 'applying'
                            ? `Aplicando: ${info.template} → ${info.material}`
                            : info.detail?.type === 'created'
                                ? `Criada: ${info.detail.maintenance.description}`
                                : info.detail?.type === 'skip'
                                    ? `Pulada (já existe): ${info.detail.maintenance.description}`
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
        setPhase('preview');
        setProgress({ current: 0, total: 0, message: '' });
        setResult(null);
        setShowDetails(false);
        onClose(phase === 'done' && result?.created > 0);
    };

    const progressPercent = progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : 0;

    return (
        <Dialog
            open={open}
            onClose={phase === 'running' ? undefined : handleClose}
            fullWidth
            maxWidth="md"
            PaperProps={{ sx: { borderRadius: 3 } }}
        >
            {/* Header */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark || '#c75000'} 100%)`,
                    color: 'white',
                    px: 3,
                    py: 2.5,
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
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Sync sx={{ fontSize: 26 }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>
                            Importar Manutenções do Manual
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.85 }}>
                            Aplicar plano preventivo a todos os materiais identificados
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <DialogContent sx={{ px: 3, py: 2 }}>
                {/* === PREVIEW === */}
                {phase === 'preview' && (
                    <>
                        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                            <Typography variant="body2">
                                Esta operação analisa todos os materiais cadastrados e aplica automaticamente as manutenções
                                preventivas previstas nos manuais dos fabricantes. Manutenções já existentes não serão duplicadas.
                            </Typography>
                        </Alert>

                        {/* Resumo */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                            <Box
                                sx={{
                                    flex: 1,
                                    minWidth: 140,
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: alpha(theme.palette.success.main, 0.08),
                                    border: '1px solid',
                                    borderColor: alpha(theme.palette.success.main, 0.2),
                                    textAlign: 'center',
                                }}
                            >
                                <Typography variant="h4" fontWeight={700} color="success.main">
                                    {matchedMaterials.length}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Materiais identificados
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    flex: 1,
                                    minWidth: 140,
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: alpha(theme.palette.grey[500], 0.08),
                                    border: '1px solid',
                                    borderColor: alpha(theme.palette.grey[500], 0.2),
                                    textAlign: 'center',
                                }}
                            >
                                <Typography variant="h4" fontWeight={700} color="text.secondary">
                                    {unmatchedMaterials.length}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Sem template
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    flex: 1,
                                    minWidth: 140,
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    border: '1px solid',
                                    borderColor: alpha(theme.palette.primary.main, 0.2),
                                    textAlign: 'center',
                                }}
                            >
                                <Typography variant="h4" fontWeight={700} color="primary.main">
                                    {matchedMaterials.reduce((sum, m) => sum + (m.template?.maintenances?.length || 0), 0)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Manutenções previstas
                                </Typography>
                            </Box>
                        </Box>

                        {/* Lista de matches */}
                        {matchedMaterials.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom fontWeight={600} color="success.main">
                                    Materiais que receberão manutenções:
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 200, overflowY: 'auto' }}>
                                    {matchedMaterials.map(m => (
                                        <Box
                                            key={m.id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                p: 1,
                                                borderRadius: 1.5,
                                                bgcolor: 'grey.50',
                                                border: '1px solid',
                                                borderColor: 'grey.200',
                                            }}
                                        >
                                            <AutoFixHigh sx={{ fontSize: 16, color: 'success.main' }} />
                                            <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }} noWrap>
                                                {m.description}
                                            </Typography>
                                            <Chip
                                                label={m.template.label}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                                sx={{ height: 22, fontSize: '0.7rem' }}
                                            />
                                            <Chip
                                                label={`${m.template.maintenances.length}`}
                                                size="small"
                                                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, minWidth: 28 }}
                                            />
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {matchedMaterials.length === 0 && (
                            <Alert severity="warning" sx={{ borderRadius: 2 }}>
                                Nenhum material cadastrado corresponde aos templates de manutenção disponíveis.
                            </Alert>
                        )}
                    </>
                )}

                {/* === RUNNING === */}
                {phase === 'running' && (
                    <Box sx={{ py: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Sync sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }, color: 'primary.main' }} />
                            <Typography variant="subtitle1" fontWeight={600}>
                                Importando manutenções...
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={progressPercent}
                            sx={{ mb: 1, height: 8, borderRadius: 4 }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                                {progress.message}
                            </Typography>
                            <Typography variant="caption" fontWeight={600}>
                                {progressPercent}%
                            </Typography>
                        </Box>
                    </Box>
                )}

                {/* === DONE === */}
                {phase === 'done' && result && (
                    <>
                        {result.error ? (
                            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                                Erro durante a importação: {result.error}
                            </Alert>
                        ) : (
                            <>
                                <Alert
                                    severity="success"
                                    icon={<CheckCircle />}
                                    sx={{ mb: 2, borderRadius: 2 }}
                                >
                                    <Typography variant="body2" fontWeight={600}>
                                        Importação concluída!
                                    </Typography>
                                </Alert>

                                {/* Resumo de resultados */}
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
                                    {result.errors > 0 && (
                                        <Box sx={{ flex: 1, minWidth: 100, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.error.main, 0.08), textAlign: 'center' }}>
                                            <ErrorIcon sx={{ color: 'error.main', fontSize: 28 }} />
                                            <Typography variant="h5" fontWeight={700} color="error.main">{result.errors}</Typography>
                                            <Typography variant="caption">Erros</Typography>
                                        </Box>
                                    )}
                                </Box>

                                {/* Detalhes */}
                                <Button
                                    fullWidth
                                    onClick={() => setShowDetails(!showDetails)}
                                    endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                                    sx={{ justifyContent: 'space-between', mb: 1, textTransform: 'none', color: 'text.secondary' }}
                                >
                                    Ver detalhes por material
                                </Button>
                                <Collapse in={showDetails}>
                                    <Box sx={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {result.details.map((d, i) => (
                                            <Box
                                                key={i}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    p: 1,
                                                    borderRadius: 1.5,
                                                    bgcolor: d.status === 'aplicado' ? alpha(theme.palette.success.main, 0.04) : 'grey.50',
                                                    border: '1px solid',
                                                    borderColor: d.status === 'aplicado' ? alpha(theme.palette.success.main, 0.15) : 'grey.200',
                                                }}
                                            >
                                                {d.status === 'aplicado' ? (
                                                    <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                                                ) : (
                                                    <SkipNext sx={{ fontSize: 16, color: 'text.disabled' }} />
                                                )}
                                                <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                                                    {d.material}
                                                </Typography>
                                                {d.template && (
                                                    <Chip label={`+${d.created}`} size="small" color="success" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                                                )}
                                                {d.skipped > 0 && (
                                                    <Chip label={`${d.skipped} exist.`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                                )}
                                                {!d.template && (
                                                    <Chip label="sem template" size="small" variant="outlined" color="default" sx={{ height: 20, fontSize: '0.65rem' }} />
                                                )}
                                            </Box>
                                        ))}
                                    </Box>
                                </Collapse>
                            </>
                        )}
                    </>
                )}
            </DialogContent>

            <Divider />
            <DialogActions sx={{ px: 3, py: 2 }}>
                {phase === 'preview' && (
                    <>
                        <Button onClick={handleClose} color="inherit" sx={{ textTransform: 'none' }}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleStart}
                            variant="contained"
                            color="secondary"
                            disabled={matchedMaterials.length === 0}
                            startIcon={<PlayArrow />}
                            sx={{ textTransform: 'none', fontWeight: 600, px: 3, borderRadius: 2 }}
                        >
                            Iniciar Importação ({matchedMaterials.length} materiais)
                        </Button>
                    </>
                )}
                {phase === 'done' && (
                    <Button
                        onClick={handleClose}
                        variant="contained"
                        sx={{ textTransform: 'none', fontWeight: 600, px: 3, borderRadius: 2 }}
                    >
                        Fechar
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default SeedMaintenancesDialog;
