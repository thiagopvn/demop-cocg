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
    IconButton,
    Grid,
    Container,
    Fade,
    Alert,
    AlertTitle,
    Collapse
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
    Clear as ClearIcon
} from '@mui/icons-material';
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import MaterialSearch from "../../components/MaterialSearch";
import UserSearch from "../../components/UserSearch";
import db from "../../firebase/db";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";

import ViaturaSearch from "../../components/ViaturaSearch";   
import { verifyToken } from "../../firebase/token";
export default function Movimentacao() {
    const [userCritery, setUserCritery] = useState("");
    const [userSelected, setUserSelected] = useState(null);
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [radioDisabled, setRadioDisabled] = useState(false);
    const [materialSelected, setMaterialSelected] = useState(null);
    const [materiaisSelected, setMateriaisSelected] = useState([]);
    const [showMaterialSearch, setShowMaterialSearch] = useState(false);
    const [tipoMovimentacao, setTipoMovimentacao] = useState("");
    const [quantidade, setQuantidade] = useState("");
    const [localReparo, setLocalReparo] = useState("");
    const [showSaveButton, setShowSaveButton] = useState(false);
    const [userId, setUserId] = useState("");
    const [userRole, setUserRole] = useState("");
    const [userName, setUserName] = useState("");
    const [viaturaCritery, setViaturaCritery] = useState("");
    const [viaturaSelected, setViaturaSelected] = useState(null);
    const [showViaturaSearch, setShowViaturaSearch] = useState(false);
    const [numeroSei, setNumeroSei] = useState("");
    const [motivoReparo, setMotivoReparo] = useState("");
    const [observacoes, setObservacoes] = useState("");


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
                    setUserName(null);
                    setUserRole(null);
                    setUserId(null);
                }
            } else {
                console.log("Token não encontrado");
                setUserName(null);
                setUserRole(null);
                setUserId(null);
            }
        };
        fetchUserData();
    }, []);

    useEffect(() => {

        if (userRole === "user") {
            console.log("userRole", userRole);
            setRadioDisabled(true);
        } else {
            setRadioDisabled(false);
        }
    }, [userRole]);


    // Função para limpar todos os estados, exceto o tipo de movimentação
    const limparEstados = () => {
        setShowMaterialSearch(false);
        setShowUserSearch(false);
        setUserCritery("");
        setUserSelected(null);
        setMaterialSelected(null);
        setMateriaisSelected([]);
        setQuantidade("");
        setLocalReparo("");
        setShowSaveButton(false);
        setViaturaCritery("");
        setViaturaSelected(null);
        setNumeroSei("");
        setMotivoReparo("");
        setObservacoes("");
    };

    // Função para limpar TUDO, incluindo o tipo de movimentação
    const limparTudo = () => {
        limparEstados();
        setTipoMovimentacao(""); // Reseta o tipo de movimentação
    };

    // Efeito para limpar estados quando o tipo de movimentação muda
    useEffect(() => {
        limparEstados(); // Limpa tudo, exceto o tipo de movimentação
    }, [tipoMovimentacao]);

    // Efeito para controlar a exibição dos campos de busca
    useEffect(() => {
        if (tipoMovimentacao === "entrada" || tipoMovimentacao === "reparo") {
            setShowMaterialSearch(true);
            setShowUserSearch(false);
            setShowViaturaSearch(false);
        } else if (tipoMovimentacao === "cautela") {
            setShowMaterialSearch(true);
            setShowUserSearch(true);
            setShowViaturaSearch(true);
        } else if (tipoMovimentacao === "saída") {
            setShowMaterialSearch(true);
            setShowUserSearch(true);
            setShowViaturaSearch(false);
        }
    }, [tipoMovimentacao]);

    // Efeito para controlar a exibição do botão salvar
    useEffect(() => {
        const validateFields = () => {
            switch (tipoMovimentacao) {
                case "entrada":
                    return materialSelected && quantidade;
                case "saída":
                    return materialSelected && userSelected && quantidade;
                case "reparo":
                    return materialSelected && quantidade && localReparo && numeroSei && motivoReparo;
                case "cautela":
                    // Para cautela, pode ter material único ou múltiplos materiais
                    return (materialSelected && userSelected && quantidade) || (materiaisSelected.length > 0 && userSelected);
                default:
                    return false;
            }
        };
        setShowSaveButton(validateFields());
    }, [tipoMovimentacao, materialSelected, userSelected, viaturaSelected, quantidade, localReparo, numeroSei, motivoReparo, materiaisSelected]);

    // Funções para limpar seleção
    const handleClearMaterial = () => {
        setMaterialSelected(null);
        setMateriaisSelected([]);
    };

    const handleClearUser = () => {
        setUserSelected(null);

    };

    const handleClearViatura = () => {
        setViaturaSelected(null);
    };


    // Funções para selecionar itens
    const handleMaterialSelect = (material) => {
        console.log("Material selecionado:", material);
        console.log("Material ID:", material?.id);
        setMaterialSelected(material);
    };

    const handleAddMaterial = () => {
        if (materialSelected && quantidade) {
            console.log("Adicionando material à lista:", materialSelected);
            console.log("Material ID para adição:", materialSelected?.id);
            
            const qtd = parseInt(quantidade);
            if (qtd <= 0) {
                alert("A quantidade deve ser maior que zero.");
                return;
            }

            if (materialSelected.estoque_atual < qtd) {
                alert("A quantidade selecionada é maior que o estoque atual.");
                return;
            }

            // Verificar se o material já foi adicionado
            const materialExistente = materiaisSelected.find(m => m.material.id === materialSelected.id);
            if (materialExistente) {
                alert("Este material já foi adicionado à lista.");
                return;
            }

            const novoMaterial = {
                material: materialSelected,
                quantidade: qtd
            };

            console.log("Novo material criado:", novoMaterial);

            setMateriaisSelected([...materiaisSelected, novoMaterial]);
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

    const handleViaturaSelect = (viatura) => {
        setViaturaSelected(viatura);
    };

    const handleSaveMultiplosMateriais = async () => {
        try {
            // Salvar cada material como uma movimentação separada
            for (const itemMaterial of materiaisSelected) {
                const material = itemMaterial.material;
                const qtd = itemMaterial.quantidade;

                // Validar se o material tem ID válido
                if (!material || !material.id) {
                    console.error("Material inválido encontrado:", material);
                    alert(`Erro: Material sem ID válido encontrado. Detalhes: ${material?.description || 'Material desconhecido'}`);
                    return;
                }

                // Verificar estoque atual antes de salvar
                if (material.estoque_atual < qtd) {
                    alert(`Estoque insuficiente para o material: ${material.description}`);
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
                };

                if (userSelected) {
                    movementData.user = userSelected.id;
                    movementData.user_name = userSelected.full_name;
                    movementData.telefone_responsavel = userSelected.telefone;
                }

                if (viaturaSelected) {
                    movementData.viatura = viaturaSelected.id;
                    movementData.viatura_description = viaturaSelected.description;
                }

                // Atualizar estoque para cautela
                let newEstoqueAtual = material.estoque_atual - qtd;
                movementData.status = "cautelado";

                // Atualizar material no banco
                const materialDocRef = doc(db, "materials", material.id);
                await updateDoc(materialDocRef, {
                    estoque_atual: newEstoqueAtual
                });

                // Salvar movimentação
                const movimentacoesCollection = collection(db, "movimentacoes");
                await addDoc(movimentacoesCollection, movementData);
            }

            alert("Todos os materiais foram cautelados com sucesso!");
            limparTudo();
        } catch (error) {
            console.error("Erro ao salvar múltiplos materiais:", error);
            alert("Erro ao salvar as movimentações. Tente novamente.");
        }
    };

    const handleSave = async () => {
        try {
            // Para cautela com múltiplos materiais
            if (tipoMovimentacao === "cautela" && materiaisSelected.length > 0) {
                await handleSaveMultiplosMateriais();
                return;
            }

            // Para movimentações com material único
            const qtd = parseInt(quantidade);
            if (!qtd || qtd <= 0) {
                alert("A quantidade deve ser maior que zero.");
                return;
            }

            // Validar se o material selecionado tem ID válido
            if (!materialSelected || !materialSelected.id) {
                console.error("Material selecionado inválido:", materialSelected);
                alert(`Erro: Material sem ID válido. Detalhes: ${materialSelected?.description || 'Material desconhecido'}`);
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
            }

            // Só adiciona os campos da viatura se ela estiver selecionada
            if (viaturaSelected) {
                movementData.viatura = viaturaSelected.id;
                movementData.viatura_description = viaturaSelected.description;
            }

            if (localReparo) movementData.repairLocation = localReparo;
            if (numeroSei) movementData.seiNumber = numeroSei;
            if (motivoReparo) movementData.motivoReparo = motivoReparo;

            // Atualizar estoque do material
            let updateData = {};
            let newEstoqueTotal = materialSelected.estoque_total;
            let newEstoqueAtual = materialSelected.estoque_atual;


            switch (tipoMovimentacao) {
                case 'entrada':
                    newEstoqueTotal = materialSelected.estoque_total + parseInt(quantidade);
                    newEstoqueAtual = materialSelected.estoque_atual + parseInt(quantidade);
                    movementData.status = "emEstoque";
                    break;
                case 'saída':
                    if (materialSelected.estoque_atual - parseInt(quantidade) < 0) {
                        alert("A quantidade de saída é maior que o estoque atual.");
                        return;
                    }
                    newEstoqueTotal = materialSelected.estoque_total - parseInt(quantidade);
                    newEstoqueAtual = materialSelected.estoque_atual - parseInt(quantidade);
                    movementData.status = "descartado";
                    break;
                case 'reparo':
                    if (materialSelected.estoque_atual - parseInt(quantidade) < 0) {
                        alert("A quantidade para reparo é maior que o estoque atual.");
                        return;
                    }
                    newEstoqueAtual = materialSelected.estoque_atual - parseInt(quantidade);
                    movementData.status = "emReparo";
                    break;
                case 'cautela':
                    if (materialSelected.estoque_atual - parseInt(quantidade) < 0) {
                        alert("A quantidade para cautela é maior que o estoque atual.");
                        return;
                    }
                    newEstoqueAtual = materialSelected.estoque_atual - parseInt(quantidade);
                    movementData.status = "cautelado";
                    break;
            }

            updateData.estoque_total = newEstoqueTotal;
            updateData.estoque_atual = newEstoqueAtual;

            // Obtém a referência do documento do material
            const materialDocRef = doc(db, "materials", materialSelected.id);

            // Atualiza o documento do material no Firestore
            await updateDoc(materialDocRef, updateData);

            // Salva a movimentação no Firestore
            const movimentacoesCollection = collection(db, "movimentacoes");
            await addDoc(movimentacoesCollection, movementData);

            limparTudo(); // Limpa tudo, incluindo o tipo de movimentação

        } catch (error) {
            console.error("Erro ao salvar movimentação:", error);
        }
    };

    const movementOptions = [
        {
            value: "entrada",
            label: "Entrada",
            icon: <InputIcon />,
            description: "Registrar entrada de material no estoque",
            color: "success"
        },
        {
            value: "cautela",
            label: "Cautela",
            icon: <AssignmentIcon />,
            description: "Cautelar material para um usuário ou viatura",
            color: "primary"
        },
        {
            value: "saída",
            label: "Saída",
            icon: <OutputIcon />,
            description: "Registrar saída definitiva de material",
            color: "warning"
        },
        {
            value: "reparo",
            label: "Inoperante",
            icon: <RepairIcon />,
            description: "Marcar material como inoperante/reparo",
            color: "error"
        }
    ];

    return (
        <PrivateRoute>
            <MenuContext>
                <div className="root-protected">
                    <Container maxWidth="lg" sx={{ py: 4 }}>
                        <Fade in timeout={800}>
                            <Box>
                                {/* Header */}
                                <Box sx={{ textAlign: 'center', mb: 4 }}>
                                    <MovementIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                                    <Typography variant="h4" component="h1" gutterBottom
                                        sx={{ 
                                            fontWeight: 600,
                                            background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                        }}
                                    >
                                        Sistema de Movimentações
                                    </Typography>
                                    <Typography variant="h6" color="text.secondary">
                                        Gerencie entradas, saídas, cautelas e reparos de materiais
                                    </Typography>
                                </Box>

                                {/* Alerta de permissão */}
                                {radioDisabled && (
                                    <Alert severity="warning" sx={{ mb: 3 }}>
                                        <AlertTitle>Acesso Restrito</AlertTitle>
                                        Sem permissão para acessar este recurso.
                                    </Alert>
                                )}

                                {/* Tipo de Movimentação */}
                                <Card elevation={3} sx={{ mb: 3, borderRadius: 3 }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                                            1. Selecione o Tipo de Movimentação:
                                        </Typography>
                                        
                                        <RadioGroup
                                            value={tipoMovimentacao}
                                            onChange={(e) => setTipoMovimentacao(e.target.value)}
                                            sx={{ gap: 2 }}
                                        >
                                            <Box sx={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, 
                                                gap: 2 
                                            }}>
                                                {movementOptions.map((option) => (
                                                    <Card
                                                        key={option.value}
                                                        variant="outlined"
                                                        sx={{
                                                            cursor: radioDisabled ? 'not-allowed' : 'pointer',
                                                            opacity: radioDisabled ? 0.6 : 1,
                                                            transition: 'all 0.3s ease',
                                                            border: tipoMovimentacao === option.value ? 2 : 1,
                                                            borderColor: tipoMovimentacao === option.value 
                                                                ? `${option.color}.main` 
                                                                : 'divider',
                                                            backgroundColor: tipoMovimentacao === option.value 
                                                                ? `${option.color}.50` 
                                                                : 'background.paper',
                                                            '&:hover': !radioDisabled ? {
                                                                transform: 'translateY(-2px)',
                                                                boxShadow: 4,
                                                                borderColor: `${option.color}.main`
                                                            } : {},
                                                            borderRadius: 2
                                                        }}
                                                        onClick={() => !radioDisabled && setTipoMovimentacao(option.value)}
                                                    >
                                                        <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                                            <FormControlLabel
                                                                disabled={radioDisabled}
                                                                value={option.value}
                                                                control={
                                                                    <Radio 
                                                                        color={option.color}
                                                                        sx={{ display: 'none' }}
                                                                    />
                                                                }
                                                                label={
                                                                    <Box>
                                                                        <Box sx={{ 
                                                                            display: 'flex', 
                                                                            justifyContent: 'center',
                                                                            mb: 2,
                                                                            color: `${option.color}.main`
                                                                        }}>
                                                                            <Box sx={{ fontSize: '2rem' }}>
                                                                                {option.icon}
                                                                            </Box>
                                                                        </Box>
                                                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                                                            {option.label}
                                                                        </Typography>
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            {option.description}
                                                                        </Typography>
                                                                    </Box>
                                                                }
                                                                sx={{ margin: 0, width: '100%' }}
                                                            />
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </Box>
                                        </RadioGroup>
                                        
                                        {tipoMovimentacao && (
                                            <Box sx={{ mt: 3, textAlign: 'center' }}>
                                                <Chip 
                                                    icon={movementOptions.find(opt => opt.value === tipoMovimentacao)?.icon}
                                                    label={`Tipo Selecionado: ${movementOptions.find(opt => opt.value === tipoMovimentacao)?.label}`}
                                                    color={movementOptions.find(opt => opt.value === tipoMovimentacao)?.color}
                                                    variant="filled"
                                                    size="medium"
                                                />
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Seção de Busca de Material */}
                                <Collapse in={showMaterialSearch}>
                                    <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                <InventoryIcon color="primary" />
                                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                    2. Selecione o Material:
                                                </Typography>
                                            </Box>
                                            
                                            <MaterialSearch
                                                onSelectMaterial={handleMaterialSelect}
                                                selectedItem={materialSelected}
                                            />
                                            
                                            {materialSelected && (
                                                <Box sx={{ mt: 2 }}>
                                                    <Chip
                                                        icon={<InventoryIcon />}
                                                        label={`Material: ${materialSelected.description}`}
                                                        onDelete={handleClearMaterial}
                                                        color="primary"
                                                        variant="filled"
                                                        deleteIcon={<ClearIcon />}
                                                        sx={{ fontSize: '0.9rem' }}
                                                    />
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Collapse>

                                {/* Seção de Busca de Usuário */}
                                <Collapse in={showUserSearch}>
                                    <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                <PersonIcon color="secondary" />
                                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                    3. Selecione o Usuário:
                                                </Typography>
                                            </Box>
                                            
                                            <UserSearch
                                                userCritery={userCritery}
                                                onSetUserCritery={setUserCritery}
                                                onSelectUser={handleUserSelect}
                                                selectedItem={userSelected}
                                            />
                                            
                                            {userSelected && (
                                                <Box sx={{ mt: 2 }}>
                                                    <Chip
                                                        icon={<PersonIcon />}
                                                        label={`Usuário: ${userSelected.full_name}`}
                                                        onDelete={handleClearUser}
                                                        color="secondary"
                                                        variant="filled"
                                                        deleteIcon={<ClearIcon />}
                                                        sx={{ fontSize: '0.9rem' }}
                                                    />
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Collapse>

                                {/* Seção de Busca de Viatura */}
                                <Collapse in={showViaturaSearch}>
                                    <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                <CarIcon color="info" />
                                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                    3. Selecione a Viatura:
                                                </Typography>
                                            </Box>
                                            
                                            <ViaturaSearch
                                                viaturaCritery={viaturaCritery}
                                                onSetViaturaCritery={setViaturaCritery}
                                                onSelectViatura={handleViaturaSelect}
                                                selectedItem={viaturaSelected}
                                            />
                                            
                                            {viaturaSelected && (
                                                <Box sx={{ mt: 2 }}>
                                                    <Chip
                                                        icon={<CarIcon />}
                                                        label={`Viatura: ${viaturaSelected.description}`}
                                                        onDelete={handleClearViatura}
                                                        color="info"
                                                        variant="filled"
                                                        deleteIcon={<ClearIcon />}
                                                        sx={{ fontSize: '0.9rem' }}
                                                    />
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Collapse>

                                    {/* Seção de Detalhes da Movimentação */}
                                <Collapse in={!!materialSelected}>
                                    <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                                                4. Complete os Detalhes:
                                            </Typography>
                                            
                                            <Grid container spacing={3}>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Quantidade"
                                                        type="number"
                                                        fullWidth
                                                        value={quantidade}
                                                        onChange={(e) => setQuantidade(e.target.value)}
                                                        inputProps={{
                                                            min: 0,
                                                            step: 1,
                                                        }}
                                                        variant="outlined"
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': {
                                                                borderRadius: 2,
                                                            }
                                                        }}
                                                    />
                                                </Grid>
                                                
                                                {/* Campo Observações */}
                                                <Grid item xs={12}>
                                                    <TextField
                                                        label="Observações"
                                                        fullWidth
                                                        multiline
                                                        rows={3}
                                                        value={observacoes}
                                                        onChange={(e) => setObservacoes(e.target.value)}
                                                        variant="outlined"
                                                        placeholder="Digite aqui qualquer observação relevante sobre esta movimentação..."
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': {
                                                                borderRadius: 2,
                                                            }
                                                        }}
                                                        helperText="Campo opcional para informações adicionais"
                                                    />
                                                </Grid>
                                                
                                                {/* Botão Adicionar à Lista para Cautelas */}
                                                {tipoMovimentacao === 'cautela' && (
                                                    <Grid item xs={12} sm={tipoMovimentacao === 'cautela' ? 12 : 6}>
                                                        <Button
                                                            variant="contained"
                                                            fullWidth
                                                            onClick={handleAddMaterial}
                                                            disabled={!materialSelected || !quantidade}
                                                            startIcon={<CheckIcon />}
                                                            sx={{
                                                                height: '56px',
                                                                borderRadius: 2,
                                                                background: 'linear-gradient(45deg, #2196f3 30%, #21cbf3 90%)',
                                                                textTransform: 'none',
                                                                fontWeight: 600
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

                                {/* Lista de Materiais Selecionados */}
                                <Collapse in={tipoMovimentacao === 'cautela' && materiaisSelected.length > 0}>
                                    <Card elevation={3} sx={{ mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                                <AssignmentIcon color="primary" />
                                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                    Materiais Selecionados para Cautela ({materiaisSelected.length}):
                                                </Typography>
                                            </Box>
                                            
                                            <Grid container spacing={2}>
                                                {materiaisSelected.map((item, index) => (
                                                    <Grid item xs={12} key={item.material.id}>
                                                        <Fade in timeout={300 + (index * 100)}>
                                                            <Card variant="outlined" sx={{ 
                                                                borderRadius: 2,
                                                                backgroundColor: 'background.paper',
                                                                border: '2px solid',
                                                                borderColor: 'primary.200',
                                                                transition: 'all 0.2s ease',
                                                                '&:hover': {
                                                                    borderColor: 'primary.main',
                                                                    boxShadow: 2
                                                                }
                                                            }}>
                                                                <CardContent sx={{ p: 3 }}>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <Box sx={{ flex: 1 }}>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                                                                <InventoryIcon color="primary" fontSize="small" />
                                                                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                                                    {item.material.description}
                                                                                </Typography>
                                                                            </Box>
                                                                            <Box sx={{ display: 'flex', gap: 3 }}>
                                                                                <Chip
                                                                                    label={`Qtd: ${item.quantidade}`}
                                                                                    color="primary"
                                                                                    size="small"
                                                                                    variant="filled"
                                                                                />
                                                                                <Chip
                                                                                    label={`Estoque: ${item.material.estoque_atual}`}
                                                                                    color="info"
                                                                                    size="small"
                                                                                    variant="outlined"
                                                                                />
                                                                            </Box>
                                                                        </Box>
                                                                        <IconButton
                                                                            color="error"
                                                                            onClick={() => handleRemoveMaterial(item.material.id)}
                                                                            sx={{
                                                                                backgroundColor: 'error.50',
                                                                                '&:hover': {
                                                                                    backgroundColor: 'error.100',
                                                                                    transform: 'scale(1.1)'
                                                                                }
                                                                            }}
                                                                        >
                                                                            <DeleteIcon />
                                                                        </IconButton>
                                                                    </Box>
                                                                </CardContent>
                                                            </Card>
                                                        </Fade>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                </Collapse>

                                {/* Campos Específicos para Reparo/Inoperante */}
                                <Collapse in={tipoMovimentacao === 'reparo'}>
                                    <Card elevation={2} sx={{ mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                                <RepairIcon color="error" />
                                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                    Detalhes do Reparo/Inoperância:
                                                </Typography>
                                            </Box>
                                            
                                            <Grid container spacing={3}>
                                                <Grid item xs={12} md={6}>
                                                    <TextField
                                                        label="Local do Reparo"
                                                        fullWidth
                                                        value={localReparo}
                                                        onChange={(e) => setLocalReparo(e.target.value)}
                                                        variant="outlined"
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': {
                                                                borderRadius: 2,
                                                            }
                                                        }}
                                                    />
                                                </Grid>
                                                <Grid item xs={12} md={6}>
                                                    <TextField
                                                        label="Número do SEI"
                                                        fullWidth
                                                        value={numeroSei}
                                                        onChange={(e) => setNumeroSei(e.target.value)}
                                                        variant="outlined"
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': {
                                                                borderRadius: 2,
                                                            }
                                                        }}
                                                    />
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <TextField
                                                        label="Motivo da Inoperância"
                                                        fullWidth
                                                        multiline
                                                        rows={4}
                                                        value={motivoReparo}
                                                        onChange={(e) => setMotivoReparo(e.target.value)}
                                                        variant="outlined"
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': {
                                                                borderRadius: 2,
                                                            }
                                                        }}
                                                        placeholder="Descreva detalhadamente o motivo da inoperância do material..."
                                                    />
                                                </Grid>
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                </Collapse>

                                {/* Botão Salvar */}
                                <Collapse in={showSaveButton}>
                                    <Card elevation={4} sx={{ borderRadius: 3, background: 'linear-gradient(45deg, #4caf50 30%, #81c784 90%)' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Button
                                                variant="contained"
                                                fullWidth
                                                onClick={handleSave}
                                                size="large"
                                                startIcon={<SaveIcon />}
                                                sx={{
                                                    background: 'transparent',
                                                    color: 'white',
                                                    fontWeight: 600,
                                                    fontSize: '1.1rem',
                                                    py: 2,
                                                    borderRadius: 2,
                                                    textTransform: 'none',
                                                    boxShadow: 'none',
                                                    '&:hover': {
                                                        background: 'rgba(255,255,255,0.1)',
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: 3
                                                    },
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                Salvar Movimentação
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Collapse>

                                {/* Botão Limpar Tudo */}
                                <Box sx={{ mt: 3 }}>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        onClick={limparTudo}
                                        startIcon={<ClearIcon />}
                                        sx={{
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            py: 1.5
                                        }}
                                    >
                                        Limpar Tudo
                                    </Button>
                                </Box>
                            </Box>
                        </Fade>
                    </Container>
                </div>
            </MenuContext>
        </PrivateRoute>
    );
}