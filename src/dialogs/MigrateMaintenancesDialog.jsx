import { useState, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Alert,
    LinearProgress,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon
} from '@mui/material';
import {
    Upload,
    CheckCircle,
    Error as ErrorIcon,
    Warning,
    SwapHoriz,
    Delete,
    Add,
    Info
} from '@mui/icons-material';
import { migrateMaintenances, parseCSV } from '../utils/migrateMaintenances';

const MigrateMaintenancesDialog = ({ open, onClose }) => {
    const [step, setStep] = useState('upload'); // upload, preview, migrating, done, error
    const [csvData, setCsvData] = useState(null);
    const [parsedRows, setParsedRows] = useState([]);
    const [progress, setProgress] = useState({ phase: '', message: '', current: 0, total: 0 });
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            setCsvData(text);
            const rows = parseCSV(text);
            setParsedRows(rows);
            setStep('preview');
            setError('');
        } catch (err) {
            setError('Erro ao ler o arquivo: ' + err.message);
        }
    };

    const handleStartMigration = async () => {
        if (!csvData) return;

        setStep('migrating');
        setError('');

        try {
            const migrationResult = await migrateMaintenances(csvData, (prog) => {
                setProgress(prog);
            });
            setResult(migrationResult);
            setStep('done');
        } catch (err) {
            setError(err.message);
            setStep('error');
        }
    };

    const handleClose = () => {
        setStep('upload');
        setCsvData(null);
        setParsedRows([]);
        setProgress({ phase: '', message: '', current: 0, total: 0 });
        setResult(null);
        setError('');
        onClose(step === 'done');
    };

    const getProgressPercent = () => {
        if (!progress.total) return 0;
        return Math.round((progress.current / progress.total) * 100);
    };

    const getSummary = () => {
        if (!parsedRows.length) return {};
        const intervals = {};
        parsedRows.forEach(r => {
            const key = `A cada ${r.intervalDays} dias`;
            intervals[key] = (intervals[key] || 0) + 1;
        });
        return intervals;
    };

    return (
        <Dialog open={open} onClose={step === 'migrating' ? undefined : handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SwapHoriz color="primary" />
                    <Typography variant="h6">
                        Migrar Cronograma de Manutenção
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent>
                {/* Upload Step */}
                {step === 'upload' && (
                    <Box sx={{ py: 3 }}>
                        <Alert severity="warning" sx={{ mb: 3 }}>
                            <Typography variant="body2" gutterBottom>
                                <strong>Atenção:</strong> Esta operação irá:
                            </Typography>
                            <Typography variant="body2" component="div">
                                1. <strong>Apagar</strong> todas as manutenções existentes<br />
                                2. <strong>Criar</strong> novas manutenções baseadas no cronograma rebalanceado<br />
                                3. Atualizar as periodicidades para dias fixos (90, 120, 180, 365 dias)
                            </Typography>
                        </Alert>

                        <Box
                            sx={{
                                border: '2px dashed',
                                borderColor: 'primary.main',
                                borderRadius: 2,
                                p: 4,
                                textAlign: 'center',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.hover' }
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                            <Typography variant="h6" gutterBottom>
                                Selecione o arquivo CSV
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Arquivo: cronograma_manutencao_rebalanceado.csv
                            </Typography>
                        </Box>

                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".csv"
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                        />

                        {error && (
                            <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
                        )}
                    </Box>
                )}

                {/* Preview Step */}
                {step === 'preview' && (
                    <Box sx={{ py: 2 }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="body2">
                                <strong>{parsedRows.length}</strong> manutenções encontradas no arquivo
                            </Typography>
                        </Alert>

                        <Typography variant="subtitle2" gutterBottom>
                            Distribuição por periodicidade:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                            {Object.entries(getSummary()).sort((a, b) => b[1] - a[1]).map(([label, count]) => (
                                <Chip
                                    key={label}
                                    label={`${label}: ${count}`}
                                    color="primary"
                                    variant="outlined"
                                />
                            ))}
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" gutterBottom>
                            Primeiros registros:
                        </Typography>
                        <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'grey.50', borderRadius: 1 }}>
                            {parsedRows.slice(0, 10).map((row, idx) => (
                                <ListItem key={idx} divider>
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                        <Info fontSize="small" color="primary" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Typography variant="body2" noWrap>
                                                {row.material}
                                            </Typography>
                                        }
                                        secondary={`${row.description} - A cada ${row.intervalDays} dias - Início: ${row.newStartDate}`}
                                    />
                                </ListItem>
                            ))}
                            {parsedRows.length > 10 && (
                                <ListItem>
                                    <ListItemText
                                        primary={
                                            <Typography variant="caption" color="text.secondary" align="center" sx={{ width: '100%', display: 'block' }}>
                                                + {parsedRows.length - 10} registros...
                                            </Typography>
                                        }
                                    />
                                </ListItem>
                            )}
                        </List>

                        <Alert severity="warning" sx={{ mt: 2 }}>
                            Ao confirmar, <strong>todas</strong> as manutenções atuais serão removidas e substituídas pelas {parsedRows.length} do novo cronograma.
                        </Alert>
                    </Box>
                )}

                {/* Migrating Step */}
                {step === 'migrating' && (
                    <Box sx={{ py: 3 }}>
                        <Typography variant="h6" align="center" gutterBottom>
                            Migrando cronograma...
                        </Typography>

                        <Box sx={{ mb: 3 }}>
                            <LinearProgress
                                variant={progress.total ? 'determinate' : 'indeterminate'}
                                value={getProgressPercent()}
                                sx={{ height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                                {progress.phase === 'deleting' && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        <Delete fontSize="small" color="error" />
                                        Removendo manutenções antigas... {progress.current}/{progress.total}
                                    </Box>
                                )}
                                {progress.phase === 'creating' && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        <Add fontSize="small" color="success" />
                                        Criando manutenções... {progress.current}/{progress.total}
                                    </Box>
                                )}
                                {progress.phase === 'parsing' && progress.message}
                                {progress.phase === 'loading_materials' && progress.message}
                            </Typography>
                        </Box>

                        <Alert severity="info">
                            Não feche esta janela até a migração ser concluída.
                        </Alert>
                    </Box>
                )}

                {/* Done Step */}
                {step === 'done' && result && (
                    <Box sx={{ py: 2 }}>
                        <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}>
                            <Typography variant="body1">
                                Migração concluída com sucesso!
                            </Typography>
                        </Alert>

                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                            <Chip
                                icon={<Delete />}
                                label={`${result.deleted} removidas`}
                                color="error"
                                variant="outlined"
                            />
                            <Chip
                                icon={<Add />}
                                label={`${result.created} criadas`}
                                color="success"
                            />
                            {result.errors > 0 && (
                                <Chip
                                    icon={<ErrorIcon />}
                                    label={`${result.errors} erros`}
                                    color="error"
                                />
                            )}
                        </Box>

                        {result.notFound.length > 0 && (
                            <>
                                <Alert severity="warning" sx={{ mb: 1 }}>
                                    {result.notFound.length} materiais não encontrados no banco (criados sem materialId).
                                    Verifique se os nomes batem com os materiais cadastrados.
                                </Alert>
                            </>
                        )}

                        {result.errorDetails.length > 0 && (
                            <Alert severity="error" sx={{ mb: 1 }}>
                                <Typography variant="body2" gutterBottom>Detalhes dos erros:</Typography>
                                {result.errorDetails.slice(0, 5).map((err, i) => (
                                    <Typography key={i} variant="caption" display="block">{err}</Typography>
                                ))}
                                {result.errorDetails.length > 5 && (
                                    <Typography variant="caption">+ {result.errorDetails.length - 5} mais...</Typography>
                                )}
                            </Alert>
                        )}
                    </Box>
                )}

                {/* Error Step */}
                {step === 'error' && (
                    <Box sx={{ py: 3 }}>
                        <Alert severity="error" icon={<ErrorIcon />}>
                            <Typography variant="body1" gutterBottom>
                                Erro durante a migração
                            </Typography>
                            <Typography variant="body2">{error}</Typography>
                        </Alert>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                {step !== 'migrating' && (
                    <Button onClick={handleClose}>
                        {step === 'done' ? 'Fechar' : 'Cancelar'}
                    </Button>
                )}
                {step === 'preview' && (
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={handleStartMigration}
                        startIcon={<SwapHoriz />}
                    >
                        Confirmar Migração ({parsedRows.length} registros)
                    </Button>
                )}
                {step === 'error' && (
                    <Button
                        variant="outlined"
                        onClick={() => { setStep('upload'); setError(''); }}
                    >
                        Tentar Novamente
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default MigrateMaintenancesDialog;
