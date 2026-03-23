import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    IconButton,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Paper,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import db from '../firebase/db';
import { ACTION_LABELS, ACTION_COLORS } from '../firebase/auditLog';

function formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
}

function formatDetails(details) {
    if (!details || typeof details !== 'object') return null;
    const entries = Object.entries(details);
    if (entries.length === 0) return null;
    return entries.map(([key, value]) => {
        const displayValue = typeof value === 'object' && value !== null
            ? JSON.stringify(value)
            : String(value ?? '');
        return (
            <Box key={key} sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                    {key}:
                </Typography>
                <Typography variant="caption" color="text.primary">
                    {displayValue}
                </Typography>
            </Box>
        );
    });
}

export default function HistoricoDialog({ open, onClose, targetId, targetName }) {
    const theme = useTheme();
    const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !targetId) return;

        let cancelled = false;
        setLoading(true);
        setLogs([]);

        const fetchLogs = async () => {
            try {
                const q = query(
                    collection(db, 'audit_logs'),
                    where('targetId', '==', targetId),
                    orderBy('timestamp', 'desc')
                );
                const snapshot = await getDocs(q);
                if (!cancelled) {
                    setLogs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
                }
            } catch (error) {
                console.error('Erro ao buscar historico de auditoria:', error);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchLogs();

        return () => {
            cancelled = true;
        };
    }, [open, targetId]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            fullScreen={fullScreenDialog}
            PaperProps={{
                sx: {
                    borderRadius: fullScreenDialog ? 0 : '16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
                },
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
                    borderRadius: fullScreenDialog ? 0 : '16px 16px 0 0',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <HistoryIcon />
                    <span>Historico de Alteracoes</span>
                </Box>
                {targetName && (
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                        {targetName}
                    </Typography>
                )}
            </DialogTitle>
            <IconButton
                aria-label="close"
                sx={{
                    position: 'absolute',
                    right: 12,
                    top: 12,
                    color: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    },
                }}
                onClick={onClose}
            >
                <CloseIcon />
            </IconButton>

            <DialogContent dividers sx={{ p: 0, overflowX: 'auto' }}>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
                        <CircularProgress />
                    </Box>
                )}

                {!loading && logs.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                        <HistoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body1" color="text.secondary">
                            Nenhum registro encontrado
                        </Typography>
                    </Box>
                )}

                {!loading && logs.length > 0 && (
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0, overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow
                                    sx={{
                                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                                    }}
                                >
                                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>Data/Hora</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>Usuario</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>Acao</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>Detalhes</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.map((log, index) => (
                                    <TableRow
                                        key={log.id}
                                        sx={{
                                            backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                                            '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' },
                                        }}
                                    >
                                        <TableCell sx={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                            <Typography variant="body2">
                                                {formatTimestamp(log.timestamp)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ verticalAlign: 'top' }}>
                                            <Typography variant="body2">
                                                {log.userName || log.userId || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ verticalAlign: 'top' }}>
                                            <Chip
                                                label={ACTION_LABELS[log.action] || log.action}
                                                size="small"
                                                sx={{
                                                    backgroundColor: ACTION_COLORS[log.action] || '#9e9e9e',
                                                    color: 'white',
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem',
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ verticalAlign: 'top' }}>
                                            {log.details ? (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                                    {formatDetails(log.details)}
                                                </Box>
                                            ) : (
                                                <Typography variant="caption" color="text.disabled">
                                                    -
                                                </Typography>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>

            <DialogActions sx={{ p: { xs: 2, sm: 2 }, justifyContent: 'center' }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    color="inherit"
                    sx={{ borderRadius: '12px', px: 4 }}
                >
                    Fechar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
