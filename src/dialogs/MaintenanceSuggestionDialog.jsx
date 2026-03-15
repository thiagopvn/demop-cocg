import { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Checkbox,
    Chip,
    Divider,
    Alert,
    LinearProgress,
    IconButton,
    Collapse,
    FormControlLabel,
    Switch,
    Tooltip,
    useTheme,
    alpha,
    useMediaQuery,
} from '@mui/material';
import {
    AutoFixHigh,
    Close,
    CheckCircle,
    CalendarMonth,
    ExpandMore,
    ExpandLess,
    Schedule,
    MenuBook,
    Speed,
} from '@mui/icons-material';
import { MAINTENANCE_TYPE_LABELS, MAINTENANCE_TYPE_COLORS, MAINTENANCE_TYPE_ORDER } from '../data/maintenanceTemplates';
import { computeDueDate } from '../utils/maintenanceTemplateMatcher';

const typeIcons = {
    diaria: <Speed sx={{ fontSize: 16 }} />,
    semanal: <Schedule sx={{ fontSize: 16 }} />,
    mensal: <CalendarMonth sx={{ fontSize: 16 }} />,
    trimestral: <CalendarMonth sx={{ fontSize: 16 }} />,
    semestral: <CalendarMonth sx={{ fontSize: 16 }} />,
    anual: <CalendarMonth sx={{ fontSize: 16 }} />,
};

/**
 * Dialog de sugestão de manutenções baseado nos manuais dos equipamentos.
 * Aparece automaticamente ao criar um material que tem template de manutenção.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onConfirm: (selectedIndices: number[]) => void
 * - template: Object (template de manutenção correspondente)
 * - materialDescription: string
 * - loading: boolean
 */
const MaintenanceSuggestionDialog = ({ open, onClose, onConfirm, template, materialDescription, loading = false }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [selectedIndices, setSelectedIndices] = useState(new Set());
    const [expandedTypes, setExpandedTypes] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);

    // Agrupar manutenções por tipo
    const groupedMaintenances = useMemo(() => {
        if (!template?.maintenances) return {};

        const groups = {};
        template.maintenances.forEach((m, idx) => {
            if (!groups[m.type]) groups[m.type] = [];
            groups[m.type].push({ ...m, originalIndex: idx });
        });

        // Ordenar grupos por MAINTENANCE_TYPE_ORDER
        const sorted = {};
        Object.keys(groups)
            .sort((a, b) => (MAINTENANCE_TYPE_ORDER[a] || 99) - (MAINTENANCE_TYPE_ORDER[b] || 99))
            .forEach(key => { sorted[key] = groups[key]; });

        return sorted;
    }, [template]);

    // Inicializar seleção quando template muda
    useEffect(() => {
        if (template?.maintenances) {
            const allIndices = new Set(template.maintenances.map((_, i) => i));
            setSelectedIndices(allIndices);
            setSelectAll(true);
            // Expandir todos por padrão
            const allTypes = new Set(template.maintenances.map(m => m.type));
            setExpandedTypes(allTypes);
        }
    }, [template]);

    const handleToggle = (index) => {
        setSelectedIndices(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            setSelectAll(next.size === template.maintenances.length);
            return next;
        });
    };

    const handleSelectAll = (checked) => {
        setSelectAll(checked);
        if (checked) {
            setSelectedIndices(new Set(template.maintenances.map((_, i) => i)));
        } else {
            setSelectedIndices(new Set());
        }
    };

    const handleToggleType = (type) => {
        setExpandedTypes(prev => {
            const next = new Set(prev);
            if (next.has(type)) {
                next.delete(type);
            } else {
                next.add(type);
            }
            return next;
        });
    };

    const handleSelectType = (type, checked) => {
        const typeIndices = groupedMaintenances[type]?.map(m => m.originalIndex) || [];
        setSelectedIndices(prev => {
            const next = new Set(prev);
            typeIndices.forEach(idx => {
                if (checked) next.add(idx);
                else next.delete(idx);
            });
            setSelectAll(next.size === template.maintenances.length);
            return next;
        });
    };

    const isTypeSelected = (type) => {
        const items = groupedMaintenances[type] || [];
        return items.every(m => selectedIndices.has(m.originalIndex));
    };

    const isTypePartial = (type) => {
        const items = groupedMaintenances[type] || [];
        const selected = items.filter(m => selectedIndices.has(m.originalIndex));
        return selected.length > 0 && selected.length < items.length;
    };

    const formatDate = (type, itemIndex) => {
        const date = computeDueDate(type, 0, itemIndex);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const priorityColor = (priority) => {
        switch (priority) {
            case 'alta': return 'warning';
            case 'critica': return 'error';
            default: return 'default';
        }
    };

    if (!template) return null;

    const totalCount = template.maintenances.length;
    const selectedCount = selectedIndices.size;

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            fullWidth
            maxWidth="md"
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    overflow: 'hidden',
                },
            }}
        >
            {/* Header com gradiente */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    color: 'white',
                    px: 3,
                    py: 2.5,
                    position: 'relative',
                }}
            >
                <IconButton
                    onClick={onClose}
                    disabled={loading}
                    sx={{ position: 'absolute', top: 8, right: 8, color: 'rgba(255,255,255,0.8)' }}
                >
                    <Close />
                </IconButton>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
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
                        <AutoFixHigh sx={{ fontSize: 26 }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            Manutenções do Manual
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.3 }}>
                            Plano preventivo baseado no manual do fabricante
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                    <Chip
                        icon={<MenuBook sx={{ fontSize: 16, color: 'white !important' }} />}
                        label={template.label}
                        size="small"
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: 'white' },
                        }}
                    />
                    <Chip
                        label={`${totalCount} manutenções`}
                        size="small"
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            fontWeight: 600,
                        }}
                    />
                </Box>
            </Box>

            <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
                <Alert
                    severity="info"
                    icon={<AutoFixHigh fontSize="small" />}
                    sx={{
                        mb: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'info.light',
                    }}
                >
                    <Typography variant="body2">
                        O material <strong>{materialDescription}</strong> foi identificado como <strong>{template.label}</strong>.
                        Selecione as manutenções preventivas que deseja agendar automaticamente.
                    </Typography>
                </Alert>

                {/* Selecionar Todos */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1.5,
                        p: 1.5,
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: alpha(theme.palette.primary.main, 0.12),
                    }}
                >
                    <FormControlLabel
                        control={
                            <Switch
                                checked={selectAll}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                color="primary"
                                size="small"
                            />
                        }
                        label={
                            <Typography variant="body2" fontWeight={600}>
                                Selecionar todas ({selectedCount}/{totalCount})
                            </Typography>
                        }
                    />
                    <Chip
                        label={`${selectedCount} selecionada${selectedCount !== 1 ? 's' : ''}`}
                        size="small"
                        color={selectedCount > 0 ? 'primary' : 'default'}
                        variant={selectedCount > 0 ? 'filled' : 'outlined'}
                    />
                </Box>

                {/* Grupos por tipo */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Object.entries(groupedMaintenances).map(([type, items]) => {
                        const isExpanded = expandedTypes.has(type);
                        const typeLabel = MAINTENANCE_TYPE_LABELS[type] || type;
                        const typeColor = MAINTENANCE_TYPE_COLORS[type] || '#666';
                        const typeSelected = isTypeSelected(type);
                        const typePartial = isTypePartial(type);

                        return (
                            <Box
                                key={type}
                                sx={{
                                    border: '1px solid',
                                    borderColor: alpha(typeColor, 0.25),
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        borderColor: alpha(typeColor, 0.5),
                                    },
                                }}
                            >
                                {/* Header do grupo */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        p: 1.5,
                                        bgcolor: alpha(typeColor, 0.06),
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                    }}
                                    onClick={() => handleToggleType(type)}
                                >
                                    <Checkbox
                                        checked={typeSelected}
                                        indeterminate={typePartial}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleSelectType(type, e.target.checked);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        size="small"
                                        sx={{
                                            color: typeColor,
                                            '&.Mui-checked': { color: typeColor },
                                            '&.MuiCheckbox-indeterminate': { color: typeColor },
                                        }}
                                    />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: typeColor }}>
                                        {typeIcons[type]}
                                    </Box>
                                    <Chip
                                        label={typeLabel}
                                        size="small"
                                        sx={{
                                            bgcolor: alpha(typeColor, 0.12),
                                            color: typeColor,
                                            fontWeight: 700,
                                            fontSize: '0.75rem',
                                            height: 24,
                                        }}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', mr: 1 }}>
                                        {items.filter(m => selectedIndices.has(m.originalIndex)).length}/{items.length}
                                    </Typography>
                                    {isExpanded ? <ExpandLess fontSize="small" color="action" /> : <ExpandMore fontSize="small" color="action" />}
                                </Box>

                                {/* Items do grupo */}
                                <Collapse in={isExpanded}>
                                    <Box sx={{ px: 1.5, pb: 1 }}>
                                        {items.map((item, itemIdx) => {
                                            const isSelected = selectedIndices.has(item.originalIndex);
                                            const dueStr = formatDate(type, itemIdx);

                                            return (
                                                <Box
                                                    key={item.originalIndex}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: 1,
                                                        py: 1,
                                                        px: 0.5,
                                                        borderBottom: itemIdx < items.length - 1 ? '1px solid' : 'none',
                                                        borderColor: 'divider',
                                                        cursor: 'pointer',
                                                        borderRadius: 1,
                                                        transition: 'background 0.15s ease',
                                                        '&:hover': {
                                                            bgcolor: alpha(typeColor, 0.04),
                                                        },
                                                    }}
                                                    onClick={() => handleToggle(item.originalIndex)}
                                                >
                                                    <Checkbox
                                                        checked={isSelected}
                                                        size="small"
                                                        sx={{
                                                            mt: -0.5,
                                                            color: alpha(typeColor, 0.5),
                                                            '&.Mui-checked': { color: typeColor },
                                                        }}
                                                    />
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: isSelected ? 500 : 400,
                                                                color: isSelected ? 'text.primary' : 'text.secondary',
                                                                fontSize: isMobile ? '0.78rem' : '0.85rem',
                                                                lineHeight: 1.4,
                                                            }}
                                                        >
                                                            {item.description}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 0.8, mt: 0.5, flexWrap: 'wrap' }}>
                                                            <Tooltip title="Data prevista" arrow>
                                                                <Chip
                                                                    icon={<CalendarMonth sx={{ fontSize: 13 }} />}
                                                                    label={dueStr}
                                                                    size="small"
                                                                    variant="outlined"
                                                                    sx={{ height: 22, fontSize: '0.7rem' }}
                                                                />
                                                            </Tooltip>
                                                            {item.priority !== 'media' && (
                                                                <Chip
                                                                    label={item.priority === 'alta' ? 'Alta' : item.priority === 'critica' ? 'Critica' : item.priority}
                                                                    size="small"
                                                                    color={priorityColor(item.priority)}
                                                                    sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                                                                />
                                                            )}
                                                            <Chip
                                                                icon={<Tooltip title="Recorrente"><Schedule sx={{ fontSize: 13 }} /></Tooltip>}
                                                                label="Recorrente"
                                                                size="small"
                                                                variant="outlined"
                                                                color="secondary"
                                                                sx={{ height: 22, fontSize: '0.65rem' }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Collapse>
                            </Box>
                        );
                    })}
                </Box>
            </DialogContent>

            {loading && <LinearProgress />}

            <Divider />
            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                <Button
                    onClick={onClose}
                    disabled={loading}
                    color="inherit"
                    sx={{ textTransform: 'none' }}
                >
                    Pular
                </Button>
                <Button
                    onClick={() => onConfirm([...selectedIndices])}
                    variant="contained"
                    disabled={loading || selectedCount === 0}
                    startIcon={loading ? null : <CheckCircle />}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                        borderRadius: 2,
                    }}
                >
                    {loading
                        ? 'Agendando...'
                        : `Agendar ${selectedCount} manutenç${selectedCount !== 1 ? 'ões' : 'ão'}`
                    }
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MaintenanceSuggestionDialog;
