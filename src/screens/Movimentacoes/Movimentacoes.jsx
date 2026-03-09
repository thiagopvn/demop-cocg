import { useEffect, useState } from "react";
import {
    RadioGroup,
    FormControlLabel,
    Radio,
    Button,
    TextField,
    Box,
    Chip,
    Typography,
    Card,
    CardContent,
    CardActionArea,
    IconButton,
    Grid,
    Container,
    Alert,
    AlertTitle,
    Collapse,
    Dialog,
    DialogContent,
    alpha,
    Grow,
    Stepper,
    Step,
    StepLabel,
    Fade,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    LinearProgress
} from "@mui/material";
import {
    Delete as DeleteIcon,
    SwapHoriz as MovementIcon,
    Person as PersonIcon,
    DirectionsCar as CarIcon,
    Inventory as InventoryIcon,
    Input as InputIcon,
    Output as OutputIcon,
    Assignment as AssignmentIcon,
    Build as RepairIcon,
    CheckCircle as CheckIcon,
    Save as SaveIcon,
    Clear as ClearIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Close as CloseIcon,
    Add as AddIcon,
    ShoppingCart as ConsumoIcon,
    ArrowBack as BackIcon,
    ArrowForward as ForwardIcon,
    Numbers as QuantityIcon,
    Note as NoteIcon
} from '@mui/icons-material';
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import MaterialSearch from "../../components/MaterialSearch";
import UserSearch from "../../components/UserSearch";
import db from "../../firebase/db";
import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { verifyToken } from "../../firebase/token";
import { logAudit } from '../../firebase/auditLog';

const STEPS = {
    entrada: ['Tipo', 'Material', 'Detalhes', 'Confirmar'],
    cautela: ['Tipo', 'Material', 'Militar', 'Detalhes', 'Confirmar'],
    'saída': ['Tipo', 'Subtipo', 'Material', 'Destinatário', 'Detalhes', 'Confirmar'],
    reparo: ['Tipo', 'Material', 'Detalhes', 'Reparo', 'Confirmar'],
};

export default function Movimentacao() {
    const [userCritery, setUserCritery] = useState("");
    const [userSelected, setUserSelected] = useState(null);
    const [radioDisabled, setRadioDisabled] = useState(false);
    const [materialSelected, setMaterialSelected] = useState(null);
    const [materiaisSelected, setMateriaisSelected] = useState([]);
    const [tipoMovimentacao, setTipoMovimentacao] = useState("");
    const [quantidade, setQuantidade] = useState("");
    const [localReparo, setLocalReparo] = useState("");
    const [userId, setUserId] = useState("");
    const [userRole, setUserRole] = useState("");
    const [userName, setUserName] = useState("");
    const [numeroSei, setNumeroSei] = useState("");
    const [motivoReparo, setMotivoReparo] = useState("");
    const [observacoes, setObservacoes] = useState("");
    const [feedbackModal, setFeedbackModal] = useState({ open: false, type: 'success', title: '', message: '', details: [] });
    const [activeStep, setActiveStep] = useState(0);

    // Saída subtipo
    const [saidaSubtipo, setSaidaSubtipo] = useState(""); // "consumo" ou "viatura"
    const [viaturasDisponiveis, setViaturasDisponiveis] = useState([]);
    const [saidaViaturaSelected, setSaidaViaturaSelected] = useState(null);
    const [loadingViaturas, setLoadingViaturas] = useState(false);

    const showFeedback = (type, title, message, details = []) => {
        setFeedbackModal({ open: true, type, title, message, details });
    };

    const closeFeedback = () => {
        setFeedbackModal(prev => ({ ...prev, open: false }));
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decodedToken = await verifyToken(token);
                    setUserName(decodedToken.username);
                    setUserRole(decodedToken.role);
                    setUserId(decodedToken.userId);
                } catch (error) {
                    console.error("Erro ao verificar token:", error);
                }
            }
        };
        fetchUserData();
    }, []);

    useEffect(() => {
        if (userRole === "user") {
            setRadioDisabled(true);
        } else {
            setRadioDisabled(false);
        }
    }, [userRole]);

    // Buscar viaturas quando saída → viatura é selecionado
    useEffect(() => {
        if (tipoMovimentacao === 'saída' && saidaSubtipo === 'viatura' && viaturasDisponiveis.length === 0) {
            const fetchViaturas = async () => {
                setLoadingViaturas(true);
                try {
                    const snap = await getDocs(query(collection(db, 'viaturas'), orderBy('prefixo')));
                    setViaturasDisponiveis(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                } catch (err) {
                    console.error('Erro ao buscar viaturas:', err);
                } finally {
                    setLoadingViaturas(false);
                }
            };
            fetchViaturas();
        }
    }, [tipoMovimentacao, saidaSubtipo, viaturasDisponiveis.length]);

    const limparEstados = () => {
        setMaterialSelected(null);
        setMateriaisSelected([]);
        setUserSelected(null);
        setUserCritery("");
        setQuantidade("");
        setLocalReparo("");
        setNumeroSei("");
        setMotivoReparo("");
        setObservacoes("");
        setSaidaSubtipo("");
        setSaidaViaturaSelected(null);
        setActiveStep(0);
    };

    const limparTudo = () => {
        limparEstados();
        setTipoMovimentacao("");
    };

    useEffect(() => {
        limparEstados();
    }, [tipoMovimentacao]);

    // ======= Handlers =======

    const handleMaterialSelect = (material) => {
        setMaterialSelected(material);
    };

    const handleClearMaterial = () => {
        setMaterialSelected(null);
        setMateriaisSelected([]);
    };

    const handleAddMaterial = () => {
        if (materialSelected && quantidade) {
            const qtd = parseInt(quantidade);
            if (qtd <= 0) {
                showFeedback('warning', 'Quantidade inválida', 'A quantidade deve ser maior que zero.');
                return;
            }
            if (materialSelected.estoque_atual < qtd) {
                showFeedback('warning', 'Estoque insuficiente', 'Quantidade maior que o estoque atual.');
                return;
            }
            const materialExistente = materiaisSelected.find(m => m.material.id === materialSelected.id);
            if (materialExistente) {
                showFeedback('warning', 'Material duplicado', 'Este material já foi adicionado.');
                return;
            }
            setMateriaisSelected([...materiaisSelected, { material: materialSelected, quantidade: qtd }]);
            setMaterialSelected(null);
            setQuantidade("");
        }
    };

    const handleRemoveMaterial = (materialId) => {
        setMateriaisSelected(materiaisSelected.filter(m => m.material.id !== materialId));
    };

    const handleUserSelect = (user) => {
        setUserSelected(user);
    };


    // ======= Salvar =======

    const handleSaveMultiplosMateriais = async () => {
        try {
            for (const itemMaterial of materiaisSelected) {
                const material = itemMaterial.material;
                const qtd = itemMaterial.quantidade;

                if (!material || !material.id) {
                    showFeedback('error', 'Material inválido', 'Material sem ID válido encontrado.');
                    return;
                }

                if (material.estoque_atual < qtd) {
                    showFeedback('warning', 'Estoque insuficiente', `Estoque insuficiente para: ${material.description}`);
                    return;
                }

                const movementData = {
                    type: tipoMovimentacao,
                    material: material.id,
                    material_description: material.description,
                    quantity: qtd,
                    date: new Date(),
                    sender: userId,
                    sender_name: userName,
                    signed: false,
                    categoria: material.categoria,
                    viatura: null,
                    viatura_description: null,
                    observacoes: observacoes || null,
                    status: "cautelado",
                };

                if (userSelected) {
                    movementData.user = userSelected.id;
                    movementData.user_name = userSelected.full_name;
                    movementData.telefone_responsavel = userSelected.telefone;
                    if (userSelected.rg) movementData.user_rg = userSelected.rg;
                }


                const materialDocRef = doc(db, "materials", material.id);
                await updateDoc(materialDocRef, { estoque_atual: material.estoque_atual - qtd });
                await addDoc(collection(db, "movimentacoes"), movementData);
            }

            for (const itemMaterial of materiaisSelected) {
                logAudit({
                    action: 'movimentacao_create',
                    userId,
                    userName,
                    targetCollection: 'movimentacoes',
                    targetName: itemMaterial.material.description,
                    details: { tipo: 'cautela', quantidade: itemMaterial.quantidade, militar: userSelected?.full_name },
                });
            }

            const detalhes = materiaisSelected.map(item => `${item.material.description} (Qtd: ${item.quantidade})`);
            showFeedback('success', 'Cautela realizada!',
                userSelected ? `Materiais cautelados para ${userSelected.full_name} com sucesso.` : 'Materiais cautelados com sucesso.',
                detalhes
            );
            limparTudo();
        } catch (error) {
            console.error("Erro ao salvar:", error);
            showFeedback('error', 'Erro ao salvar', 'Ocorreu um erro ao salvar as movimentações.');
        }
    };

    const handleSave = async () => {
        try {
            if (tipoMovimentacao === "cautela" && materiaisSelected.length > 0) {
                await handleSaveMultiplosMateriais();
                return;
            }

            const qtd = parseInt(quantidade);
            if (!qtd || qtd <= 0) {
                showFeedback('warning', 'Quantidade inválida', 'A quantidade deve ser maior que zero.');
                return;
            }

            if (!materialSelected || !materialSelected.id) {
                showFeedback('error', 'Material inválido', 'Material sem ID válido.');
                return;
            }

            const movementData = {
                type: tipoMovimentacao,
                material: materialSelected.id,
                material_description: materialSelected.description,
                quantity: qtd,
                date: new Date(),
                sender: userId,
                sender_name: userName,
                signed: false,
                categoria: materialSelected.categoria,
                viatura: null,
                viatura_description: null,
                observacoes: observacoes || null,
            };

            if (userSelected) {
                movementData.user = userSelected.id;
                movementData.user_name = userSelected.full_name;
                movementData.telefone_responsavel = userSelected.telefone;
                if (userSelected.rg) movementData.user_rg = userSelected.rg;
            }

            if (localReparo) movementData.repairLocation = localReparo;
            if (numeroSei) movementData.seiNumber = numeroSei;
            if (motivoReparo) movementData.motivoReparo = motivoReparo;

            let updateData = {};
            let newEstoqueTotal = materialSelected.estoque_total;
            let newEstoqueAtual = materialSelected.estoque_atual;
            let estoqueViatura = materialSelected.estoque_viatura || 0;

            switch (tipoMovimentacao) {
                case 'entrada':
                    newEstoqueTotal += qtd;
                    newEstoqueAtual += qtd;
                    movementData.status = "emEstoque";
                    break;
                case 'saída':
                    if (newEstoqueAtual - qtd < 0) {
                        showFeedback('warning', 'Estoque insuficiente', 'Quantidade de saída maior que o estoque atual.');
                        return;
                    }
                    if (saidaSubtipo === 'viatura') {
                        // Saída para viatura: material vai para estoque_viatura
                        newEstoqueAtual -= qtd;
                        estoqueViatura += qtd;
                        movementData.status = "descartado";
                        movementData.subtype = "viatura";

                        if (saidaViaturaSelected) {
                            movementData.viatura = saidaViaturaSelected.id;
                            movementData.viatura_description = `${saidaViaturaSelected.prefixo} - ${saidaViaturaSelected.description}`;
                        }
                    } else {
                        // Saída consumo: saída definitiva
                        newEstoqueTotal -= qtd;
                        newEstoqueAtual -= qtd;
                        movementData.status = "descartado";
                        movementData.subtype = "consumo";
                    }
                    break;
                case 'reparo':
                    if (newEstoqueAtual - qtd < 0) {
                        showFeedback('warning', 'Estoque insuficiente', 'Quantidade para reparo maior que o estoque atual.');
                        return;
                    }
                    newEstoqueAtual -= qtd;
                    movementData.status = "emReparo";
                    break;
                case 'cautela':
                    if (newEstoqueAtual - qtd < 0) {
                        showFeedback('warning', 'Estoque insuficiente', 'Quantidade para cautela maior que o estoque atual.');
                        return;
                    }
                    newEstoqueAtual -= qtd;
                    movementData.status = "cautelado";
                    break;
            }

            updateData.estoque_total = newEstoqueTotal;
            updateData.estoque_atual = newEstoqueAtual;
            if (tipoMovimentacao === 'saída' && saidaSubtipo === 'viatura') {
                updateData.estoque_viatura = estoqueViatura;
            }
            updateData.ultima_movimentacao = serverTimestamp();

            const materialDocRef = doc(db, "materials", materialSelected.id);
            await updateDoc(materialDocRef, updateData);
            await addDoc(collection(db, "movimentacoes"), movementData);

            // Se saída para viatura, criar/atualizar viatura_materiais
            if (tipoMovimentacao === 'saída' && saidaSubtipo === 'viatura' && saidaViaturaSelected) {
                const vmQuery = query(
                    collection(db, 'viatura_materiais'),
                    where('viatura_id', '==', saidaViaturaSelected.id),
                    where('material_id', '==', materialSelected.id),
                    where('status', '==', 'alocado')
                );
                const vmSnap = await getDocs(vmQuery);

                if (!vmSnap.empty) {
                    const existingDoc = vmSnap.docs[0];
                    const existingData = existingDoc.data();
                    await updateDoc(doc(db, 'viatura_materiais', existingDoc.id), {
                        quantidade: existingData.quantidade + qtd,
                        ultima_atualizacao: serverTimestamp(),
                        atualizado_por: userId,
                        atualizado_por_nome: userName,
                    });
                } else {
                    await addDoc(collection(db, 'viatura_materiais'), {
                        viatura_id: saidaViaturaSelected.id,
                        viatura_prefixo: saidaViaturaSelected.prefixo || '',
                        viatura_description: saidaViaturaSelected.description,
                        material_id: materialSelected.id,
                        material_description: materialSelected.description,
                        categoria: materialSelected.categoria || '',
                        quantidade: qtd,
                        data_alocacao: serverTimestamp(),
                        alocado_por: userId,
                        alocado_por_nome: userName,
                        status: 'alocado',
                        origem: 'saida',
                    });
                }

                // Atualizar viatura
                await updateDoc(doc(db, 'viaturas', saidaViaturaSelected.id), {
                    ultima_movimentacao: serverTimestamp(),
                });
            }

            const tipoLabels = { entrada: 'Entrada', cautela: 'Cautela', 'saída': 'Saída', reparo: 'Inoperante' };
            const subtypeLabel = saidaSubtipo === 'viatura'
                ? ` para ${saidaViaturaSelected?.prefixo || 'viatura'}`
                : saidaSubtipo === 'consumo' ? ' (consumo)' : '';

            logAudit({
                action: 'movimentacao_create',
                userId,
                userName,
                targetCollection: 'movimentacoes',
                targetName: materialSelected.description,
                details: {
                    tipo: tipoMovimentacao,
                    quantidade: qtd,
                    militar: userSelected?.full_name,
                    viatura: saidaViaturaSelected ? `${saidaViaturaSelected.prefixo} - ${saidaViaturaSelected.description}` : undefined,
                },
            });

            showFeedback(
                'success',
                `${tipoLabels[tipoMovimentacao]}${subtypeLabel} registrada!`,
                `${materialSelected.description} — ${qtd} unidade(s) registrada(s) com sucesso.`,
                userSelected ? [`Militar: ${userSelected.full_name}`] : []
            );
            limparTudo();
        } catch (error) {
            console.error("Erro ao salvar movimentação:", error);
            showFeedback('error', 'Erro ao salvar', 'Ocorreu um erro. Tente novamente.');
        }
    };

    // ======= Validação =======

    const canSave = () => {
        switch (tipoMovimentacao) {
            case "entrada":
                return materialSelected && quantidade;
            case "saída":
                if (saidaSubtipo === 'viatura') return materialSelected && userSelected && saidaViaturaSelected && quantidade;
                if (saidaSubtipo === 'consumo') return materialSelected && userSelected && quantidade;
                return false;
            case "reparo":
                return materialSelected && quantidade && localReparo && numeroSei && motivoReparo;
            case "cautela":
                return (materialSelected && userSelected && quantidade) || (materiaisSelected.length > 0 && userSelected);
            default:
                return false;
        }
    };

    // ======= Movement type config =======

    const movementOptions = [
        {
            value: "entrada",
            label: "Entrada",
            icon: <InputIcon sx={{ fontSize: 40 }} />,
            description: "Registrar entrada de material",
            color: "#22c55e",
            gradient: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
        },
        {
            value: "cautela",
            label: "Cautela",
            icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
            description: "Cautelar material para militar",
            color: "#3b82f6",
            gradient: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
        },
        {
            value: "saída",
            label: "Saída",
            icon: <OutputIcon sx={{ fontSize: 40 }} />,
            description: "Consumo ou para viatura",
            color: "#f59e0b",
            gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
        },
        {
            value: "reparo",
            label: "Inoperante",
            icon: <RepairIcon sx={{ fontSize: 40 }} />,
            description: "Material inoperante/reparo",
            color: "#ef4444",
            gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
        }
    ];

    const currentOption = movementOptions.find(opt => opt.value === tipoMovimentacao);
    const currentSteps = tipoMovimentacao ? (STEPS[tipoMovimentacao] || []) : [];

    return (
        <PrivateRoute>
            <MenuContext>
                <div className="root-protected">
                    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
                        {/* Header */}
                        <Fade in timeout={400}>
                            <Card
                                elevation={0}
                                sx={{
                                    mb: 3,
                                    borderRadius: 4,
                                    background: currentOption
                                        ? currentOption.gradient
                                        : 'linear-gradient(135deg, #1e3a5f 0%, #0f2942 100%)',
                                    overflow: 'hidden',
                                    position: 'relative',
                                }}
                            >
                                <CardContent sx={{ p: { xs: 3, sm: 4 }, position: 'relative', zIndex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                        <Box sx={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 3,
                                            backgroundColor: 'rgba(255,255,255,0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backdropFilter: 'blur(10px)',
                                        }}>
                                            {currentOption ? currentOption.icon : <MovementIcon sx={{ fontSize: 32, color: 'white' }} />}
                                        </Box>
                                        <Box>
                                            <Typography variant="h5" sx={{
                                                color: 'white',
                                                fontWeight: 800,
                                                fontSize: { xs: '1.3rem', sm: '1.6rem' },
                                                lineHeight: 1.2,
                                            }}>
                                                {currentOption ? currentOption.label : 'Nova Movimentação'}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
                                                {currentOption ? currentOption.description : 'Selecione o tipo de movimentação para começar'}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Stepper */}
                                    {currentSteps.length > 0 && (
                                        <Box sx={{ mt: 3 }}>
                                            <Stepper
                                                activeStep={activeStep}
                                                alternativeLabel
                                                sx={{
                                                    '& .MuiStepLabel-label': {
                                                        color: 'rgba(255,255,255,0.5)',
                                                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                                        mt: 0.5,
                                                    },
                                                    '& .MuiStepLabel-label.Mui-active': { color: 'white', fontWeight: 600 },
                                                    '& .MuiStepLabel-label.Mui-completed': { color: 'rgba(255,255,255,0.8)' },
                                                    '& .MuiStepIcon-root': { color: 'rgba(255,255,255,0.25)', fontSize: 28 },
                                                    '& .MuiStepIcon-root.Mui-active': { color: 'white' },
                                                    '& .MuiStepIcon-root.Mui-completed': { color: 'rgba(255,255,255,0.7)' },
                                                    '& .MuiStepConnector-line': { borderColor: 'rgba(255,255,255,0.2)' },
                                                }}
                                            >
                                                {currentSteps.map((label) => (
                                                    <Step key={label}>
                                                        <StepLabel>{label}</StepLabel>
                                                    </Step>
                                                ))}
                                            </Stepper>
                                        </Box>
                                    )}
                                </CardContent>
                                {/* Background pattern */}
                                <Box sx={{
                                    position: 'absolute',
                                    top: -20,
                                    right: -20,
                                    width: 150,
                                    height: 150,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.05)',
                                }} />
                                <Box sx={{
                                    position: 'absolute',
                                    bottom: -30,
                                    right: 60,
                                    width: 100,
                                    height: 100,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.03)',
                                }} />
                            </Card>
                        </Fade>

                        {/* Alerta de permissão */}
                        {radioDisabled && (
                            <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
                                <AlertTitle>Acesso Restrito</AlertTitle>
                                Sem permissão para acessar este recurso.
                            </Alert>
                        )}

                        {/* Step 1: Tipo de Movimentação */}
                        <Fade in timeout={500}>
                            <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip label="1" size="small" color="primary" sx={{ fontWeight: 700, minWidth: 28 }} />
                                        Tipo de Movimentação
                                    </Typography>

                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' },
                                        gap: { xs: 1.5, sm: 2 }
                                    }}>
                                        {movementOptions.map((option) => (
                                            <Card
                                                key={option.value}
                                                variant="outlined"
                                                sx={{
                                                    cursor: radioDisabled ? 'not-allowed' : 'pointer',
                                                    opacity: radioDisabled ? 0.5 : 1,
                                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    border: '2px solid',
                                                    borderColor: tipoMovimentacao === option.value ? option.color : 'divider',
                                                    backgroundColor: tipoMovimentacao === option.value
                                                        ? alpha(option.color, 0.06)
                                                        : 'background.paper',
                                                    '&:hover': !radioDisabled ? {
                                                        transform: 'translateY(-3px)',
                                                        boxShadow: `0 8px 24px ${alpha(option.color, 0.2)}`,
                                                        borderColor: option.color,
                                                    } : {},
                                                    borderRadius: 3,
                                                    overflow: 'hidden',
                                                    position: 'relative',
                                                }}
                                                onClick={() => {
                                                    if (!radioDisabled) {
                                                        setTipoMovimentacao(option.value);
                                                        setActiveStep(0);
                                                    }
                                                }}
                                            >
                                                {tipoMovimentacao === option.value && (
                                                    <Box sx={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 3,
                                                        background: option.gradient,
                                                    }} />
                                                )}
                                                <CardContent sx={{ p: { xs: 1.5, sm: 2.5 }, textAlign: 'center' }}>
                                                    <Box sx={{
                                                        color: tipoMovimentacao === option.value ? option.color : 'text.secondary',
                                                        mb: 1,
                                                        transition: 'color 0.2s',
                                                    }}>
                                                        {option.icon}
                                                    </Box>
                                                    <Typography variant="subtitle2" sx={{
                                                        fontWeight: 700,
                                                        color: tipoMovimentacao === option.value ? option.color : 'text.primary',
                                                        fontSize: { xs: '0.8rem', sm: '0.9rem' },
                                                    }}>
                                                        {option.label}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{
                                                        display: { xs: 'none', sm: 'block' },
                                                        mt: 0.5,
                                                        lineHeight: 1.3,
                                                    }}>
                                                        {option.description}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Fade>

                        {/* Step: Subtipo da Saída */}
                        <Collapse in={tipoMovimentacao === 'saída'}>
                            <Fade in={tipoMovimentacao === 'saída'} timeout={400}>
                                <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip label="2" size="small" color="warning" sx={{ fontWeight: 700, minWidth: 28 }} />
                                            Tipo de Saída
                                        </Typography>

                                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                            <Card
                                                variant="outlined"
                                                sx={{
                                                    cursor: 'pointer',
                                                    transition: 'all 0.25s',
                                                    border: '2px solid',
                                                    borderColor: saidaSubtipo === 'consumo' ? '#f59e0b' : 'divider',
                                                    backgroundColor: saidaSubtipo === 'consumo' ? alpha('#f59e0b', 0.06) : 'background.paper',
                                                    '&:hover': { borderColor: '#f59e0b', transform: 'translateY(-2px)', boxShadow: 3 },
                                                    borderRadius: 3,
                                                }}
                                                onClick={() => { setSaidaSubtipo('consumo'); setSaidaViaturaSelected(null); setActiveStep(1); }}
                                            >
                                                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                                    <ConsumoIcon sx={{ fontSize: 48, color: saidaSubtipo === 'consumo' ? '#f59e0b' : 'text.secondary', mb: 1 }} />
                                                    <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                                                        Consumo
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Saída definitiva para consumo
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                            <Card
                                                variant="outlined"
                                                sx={{
                                                    cursor: 'pointer',
                                                    transition: 'all 0.25s',
                                                    border: '2px solid',
                                                    borderColor: saidaSubtipo === 'viatura' ? '#0ea5e9' : 'divider',
                                                    backgroundColor: saidaSubtipo === 'viatura' ? alpha('#0ea5e9', 0.06) : 'background.paper',
                                                    '&:hover': { borderColor: '#0ea5e9', transform: 'translateY(-2px)', boxShadow: 3 },
                                                    borderRadius: 3,
                                                }}
                                                onClick={() => { setSaidaSubtipo('viatura'); setActiveStep(1); }}
                                            >
                                                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                                    <CarIcon sx={{ fontSize: 48, color: saidaSubtipo === 'viatura' ? '#0ea5e9' : 'text.secondary', mb: 1 }} />
                                                    <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                                                        Viatura
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Alocar material em viatura
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Box>

                                        {/* Seleção de viatura para saída */}
                                        <Collapse in={saidaSubtipo === 'viatura'}>
                                            <Box sx={{ mt: 3 }}>
                                                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                                                    Selecione a viatura de destino:
                                                </Typography>
                                                {loadingViaturas ? (
                                                    <LinearProgress sx={{ borderRadius: 2 }} />
                                                ) : (
                                                    <FormControl fullWidth size="small">
                                                        <InputLabel>Viatura</InputLabel>
                                                        <Select
                                                            value={saidaViaturaSelected?.id || ''}
                                                            label="Viatura"
                                                            onChange={(e) => {
                                                                const vtr = viaturasDisponiveis.find(v => v.id === e.target.value);
                                                                setSaidaViaturaSelected(vtr || null);
                                                            }}
                                                            sx={{ borderRadius: 2 }}
                                                        >
                                                            {viaturasDisponiveis.map((v) => (
                                                                <MenuItem key={v.id} value={v.id}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                        <CarIcon fontSize="small" color="info" />
                                                                        {v.prefixo} - {v.description}
                                                                    </Box>
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                )}
                                                {saidaViaturaSelected && (
                                                    <Chip
                                                        icon={<CarIcon />}
                                                        label={`${saidaViaturaSelected.prefixo} - ${saidaViaturaSelected.description}`}
                                                        color="info"
                                                        onDelete={() => setSaidaViaturaSelected(null)}
                                                        sx={{ mt: 1 }}
                                                    />
                                                )}
                                            </Box>
                                        </Collapse>
                                    </CardContent>
                                </Card>
                            </Fade>
                        </Collapse>

                        {/* Step: Material */}
                        <Collapse in={
                            tipoMovimentacao === 'entrada' ||
                            tipoMovimentacao === 'reparo' ||
                            tipoMovimentacao === 'cautela' ||
                            (tipoMovimentacao === 'saída' && saidaSubtipo)
                        }>
                            <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            label={tipoMovimentacao === 'saída' ? '3' : '2'}
                                            size="small"
                                            color="primary"
                                            sx={{ fontWeight: 700, minWidth: 28 }}
                                        />
                                        <InventoryIcon fontSize="small" color="primary" />
                                        Material
                                    </Typography>

                                    <MaterialSearch
                                        onSelectMaterial={handleMaterialSelect}
                                        selectedItem={materialSelected}
                                    />

                                    {materialSelected && (
                                        <Paper elevation={0} sx={{
                                            mt: 2,
                                            p: 2,
                                            borderRadius: 2,
                                            border: '1px solid',
                                            borderColor: 'primary.200',
                                            backgroundColor: alpha('#3b82f6', 0.04),
                                        }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={600}>
                                                        {materialSelected.description}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                                        <Chip
                                                            label={`Disponível: ${materialSelected.estoque_atual}`}
                                                            size="small"
                                                            color={materialSelected.estoque_atual > 0 ? "success" : "error"}
                                                        />
                                                        <Chip
                                                            label={`Total: ${materialSelected.estoque_total}`}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    </Box>
                                                </Box>
                                                <IconButton size="small" onClick={handleClearMaterial} color="error">
                                                    <CloseIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Paper>
                                    )}
                                </CardContent>
                            </Card>
                        </Collapse>

                        {/* Step: Usuário/Militar */}
                        <Collapse in={
                            tipoMovimentacao === 'cautela' ||
                            (tipoMovimentacao === 'saída' && saidaSubtipo)
                        }>
                            <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            label={tipoMovimentacao === 'saída' ? '4' : '3'}
                                            size="small"
                                            color="secondary"
                                            sx={{ fontWeight: 700, minWidth: 28 }}
                                        />
                                        <PersonIcon fontSize="small" color="secondary" />
                                        {tipoMovimentacao === 'saída' ? 'Quem retirou' : 'Militar'}
                                    </Typography>

                                    <UserSearch
                                        userCritery={userCritery}
                                        onSetUserCritery={setUserCritery}
                                        onSelectUser={handleUserSelect}
                                        selectedItem={userSelected}
                                    />

                                    {userSelected && (
                                        <Paper elevation={0} sx={{
                                            mt: 2,
                                            p: 2,
                                            borderRadius: 2,
                                            border: '1px solid',
                                            borderColor: 'secondary.200',
                                            backgroundColor: alpha('#ff6b35', 0.04),
                                        }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <PersonIcon color="secondary" fontSize="small" />
                                                    <Typography variant="subtitle2" fontWeight={600}>
                                                        {userSelected.full_name}
                                                    </Typography>
                                                </Box>
                                                <IconButton size="small" onClick={() => setUserSelected(null)} color="error">
                                                    <CloseIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Paper>
                                    )}
                                </CardContent>
                            </Card>
                        </Collapse>

                        {/* Step: Detalhes (Quantidade + Observações) */}
                        <Collapse in={!!materialSelected}>
                            <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            label={tipoMovimentacao === 'saída' ? '5' : tipoMovimentacao === 'cautela' ? '4' : tipoMovimentacao === 'reparo' ? '3' : '3'}
                                            size="small"
                                            color="info"
                                            sx={{ fontWeight: 700, minWidth: 28 }}
                                        />
                                        <QuantityIcon fontSize="small" color="info" />
                                        Detalhes
                                    </Typography>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                label="Quantidade"
                                                type="number"
                                                fullWidth
                                                value={quantidade}
                                                onChange={(e) => setQuantidade(e.target.value)}
                                                inputProps={{ min: 1, step: 1 }}
                                                variant="outlined"
                                                helperText={materialSelected ? `Máximo disponível: ${materialSelected.estoque_atual}` : ''}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                label="Observações (opcional)"
                                                fullWidth
                                                multiline
                                                rows={2}
                                                value={observacoes}
                                                onChange={(e) => setObservacoes(e.target.value)}
                                                variant="outlined"
                                                placeholder="Informações adicionais..."
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                            />
                                        </Grid>

                                        {/* Botão adicionar à lista (cautela) */}
                                        {tipoMovimentacao === 'cautela' && (
                                            <Grid item xs={12}>
                                                <Button
                                                    variant="outlined"
                                                    fullWidth
                                                    onClick={handleAddMaterial}
                                                    disabled={!materialSelected || !quantidade}
                                                    startIcon={<AddIcon />}
                                                    sx={{
                                                        py: 1.5,
                                                        borderRadius: 2,
                                                        textTransform: 'none',
                                                        fontWeight: 600,
                                                        borderStyle: 'dashed',
                                                        borderWidth: 2,
                                                    }}
                                                >
                                                    Adicionar Material à Lista
                                                </Button>
                                            </Grid>
                                        )}
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Collapse>

                        {/* Lista de materiais selecionados (cautela) */}
                        <Collapse in={tipoMovimentacao === 'cautela' && materiaisSelected.length > 0}>
                            <Card elevation={0} sx={{
                                mb: 3,
                                borderRadius: 3,
                                border: '2px solid',
                                borderColor: 'primary.200',
                                background: alpha('#3b82f6', 0.03),
                            }}>
                                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AssignmentIcon color="primary" fontSize="small" />
                                        Materiais para Cautela ({materiaisSelected.length})
                                    </Typography>

                                    {materiaisSelected.map((item) => (
                                        <Paper
                                            key={item.material.id}
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                mb: 1,
                                                borderRadius: 2,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                backgroundColor: 'background.paper',
                                            }}
                                        >
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {item.material.description}
                                                </Typography>
                                                <Chip label={`Qtd: ${item.quantidade}`} size="small" color="primary" sx={{ mt: 0.5 }} />
                                            </Box>
                                            <IconButton size="small" color="error" onClick={() => handleRemoveMaterial(item.material.id)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Paper>
                                    ))}
                                </CardContent>
                            </Card>
                        </Collapse>

                        {/* Campos de Reparo */}
                        <Collapse in={tipoMovimentacao === 'reparo' && !!materialSelected}>
                            <Card elevation={0} sx={{
                                mb: 3,
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'error.200',
                                background: alpha('#ef4444', 0.03),
                            }}>
                                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <RepairIcon color="error" fontSize="small" />
                                        Detalhes do Reparo
                                    </Typography>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                label="Local do Reparo"
                                                fullWidth
                                                value={localReparo}
                                                onChange={(e) => setLocalReparo(e.target.value)}
                                                required
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                label="Número do SEI"
                                                fullWidth
                                                value={numeroSei}
                                                onChange={(e) => setNumeroSei(e.target.value)}
                                                required
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                label="Motivo da Inoperância"
                                                fullWidth
                                                multiline
                                                rows={3}
                                                value={motivoReparo}
                                                onChange={(e) => setMotivoReparo(e.target.value)}
                                                required
                                                placeholder="Descreva o motivo..."
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Collapse>

                        {/* Botões de Ação */}
                        <Collapse in={canSave()}>
                            <Card
                                elevation={0}
                                sx={{
                                    mb: 2,
                                    borderRadius: 3,
                                    background: currentOption?.gradient || 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                    overflow: 'hidden',
                                }}
                            >
                                <CardContent sx={{ p: 2 }}>
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        onClick={handleSave}
                                        size="large"
                                        startIcon={<SaveIcon />}
                                        sx={{
                                            background: 'rgba(255,255,255,0.15)',
                                            color: 'white',
                                            fontWeight: 700,
                                            fontSize: '1.05rem',
                                            py: 1.5,
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            boxShadow: 'none',
                                            backdropFilter: 'blur(10px)',
                                            '&:hover': {
                                                background: 'rgba(255,255,255,0.25)',
                                                transform: 'translateY(-1px)',
                                                boxShadow: 3,
                                            },
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        {tipoMovimentacao === 'saída' && saidaSubtipo === 'viatura'
                                            ? 'Registrar Saída para Viatura'
                                            : tipoMovimentacao === 'saída' && saidaSubtipo === 'consumo'
                                            ? 'Registrar Saída (Consumo)'
                                            : 'Salvar Movimentação'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </Collapse>

                        {/* Limpar */}
                        {tipoMovimentacao && (
                            <Button
                                variant="outlined"
                                fullWidth
                                onClick={limparTudo}
                                startIcon={<ClearIcon />}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    py: 1.2,
                                    borderColor: 'divider',
                                    color: 'text.secondary',
                                }}
                            >
                                Limpar Tudo
                            </Button>
                        )}
                    </Container>

                    {/* Modal de Feedback */}
                    <Dialog
                        open={feedbackModal.open}
                        onClose={closeFeedback}
                        TransitionComponent={Grow}
                        PaperProps={{
                            sx: {
                                borderRadius: 4,
                                overflow: 'hidden',
                                minWidth: { xs: '90vw', sm: 420 },
                                maxWidth: 480,
                                boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
                            }
                        }}
                    >
                        <Box
                            sx={{
                                background: feedbackModal.type === 'success'
                                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)'
                                    : feedbackModal.type === 'error'
                                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)'
                                        : 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
                                py: 4,
                                px: 3,
                                textAlign: 'center',
                                position: 'relative',
                            }}
                        >
                            <IconButton
                                onClick={closeFeedback}
                                sx={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    color: 'rgba(255,255,255,0.7)',
                                    '&:hover': { color: 'white', backgroundColor: 'rgba(255,255,255,0.15)' },
                                }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>

                            <Box
                                sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mx: 'auto',
                                    mb: 2,
                                    backdropFilter: 'blur(8px)',
                                    border: '3px solid rgba(255,255,255,0.3)',
                                    animation: feedbackModal.open ? 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
                                    '@keyframes popIn': {
                                        '0%': { transform: 'scale(0)', opacity: 0 },
                                        '100%': { transform: 'scale(1)', opacity: 1 },
                                    },
                                }}
                            >
                                {feedbackModal.type === 'success' && <CheckIcon sx={{ fontSize: 44, color: 'white' }} />}
                                {feedbackModal.type === 'error' && <ErrorIcon sx={{ fontSize: 44, color: 'white' }} />}
                                {feedbackModal.type === 'warning' && <WarningIcon sx={{ fontSize: 44, color: 'white' }} />}
                            </Box>

                            <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, letterSpacing: '-0.02em' }}>
                                {feedbackModal.title}
                            </Typography>
                        </Box>

                        <DialogContent sx={{ px: 3, pt: 3, pb: 1 }}>
                            <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center', lineHeight: 1.6 }}>
                                {feedbackModal.message}
                            </Typography>

                            {feedbackModal.details.length > 0 && (
                                <Box
                                    sx={{
                                        mt: 2.5,
                                        p: 2,
                                        borderRadius: 3,
                                        backgroundColor: feedbackModal.type === 'success'
                                            ? alpha('#22c55e', 0.06)
                                            : feedbackModal.type === 'error'
                                                ? alpha('#ef4444', 0.06)
                                                : alpha('#f59e0b', 0.06),
                                        border: '1px solid',
                                        borderColor: feedbackModal.type === 'success'
                                            ? alpha('#22c55e', 0.15)
                                            : feedbackModal.type === 'error'
                                                ? alpha('#ef4444', 0.15)
                                                : alpha('#f59e0b', 0.15),
                                    }}
                                >
                                    {feedbackModal.details.map((detail, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                py: 0.75,
                                                borderBottom: index < feedbackModal.details.length - 1 ? '1px solid' : 'none',
                                                borderColor: alpha('#000', 0.06),
                                            }}
                                        >
                                            <Box sx={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                backgroundColor: feedbackModal.type === 'success' ? '#22c55e'
                                                    : feedbackModal.type === 'error' ? '#ef4444' : '#f59e0b',
                                                flexShrink: 0,
                                            }} />
                                            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                                                {detail}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </DialogContent>

                        <Box sx={{ px: 3, pb: 3, pt: 1 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={closeFeedback}
                                disableElevation
                                sx={{
                                    py: 1.5,
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    background: feedbackModal.type === 'success'
                                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                        : feedbackModal.type === 'error'
                                            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                            : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    '&:hover': {
                                        transform: 'translateY(-1px)',
                                        boxShadow: feedbackModal.type === 'success'
                                            ? '0 8px 24px rgba(34, 197, 94, 0.4)'
                                            : feedbackModal.type === 'error'
                                                ? '0 8px 24px rgba(239, 68, 68, 0.4)'
                                                : '0 8px 24px rgba(245, 158, 11, 0.4)',
                                    },
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {feedbackModal.type === 'success' ? 'Entendido' : 'Fechar'}
                            </Button>
                        </Box>
                    </Dialog>
                </div>
            </MenuContext>
        </PrivateRoute>
    );
}
