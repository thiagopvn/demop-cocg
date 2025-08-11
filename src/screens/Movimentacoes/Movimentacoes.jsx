import { useEffect, useState } from "react";
import {
    RadioGroup,
    FormControlLabel,
    Radio,
    Button,
    TextField,
    Box,
    Chip,
} from "@mui/material";
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import MaterialSearch from "../../components/MaterialSearch";
import UserSearch from "../../components/UserSearch";
import db from "../../firebase/db";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";

import ViaturaSearch from "../../components/ViaturaSearch";   
import { verifyToken } from "../../firebase/token";
import UserInfo from "../../components/UserInfo";
import { yellow } from "@mui/material/colors";
export default function Movimentacao() {
    const [userCritery, setUserCritery] = useState("");
    const [userSelected, setUserSelected] = useState(null);
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [radioDisabled, setRadioDisabled] = useState(false);
    const [materialCritery, setMaterialCritery] = useState("");
    const [materialSelected, setMaterialSelected] = useState(null);
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
        setMaterialCritery("");
        setMaterialSelected(null);
        setQuantidade("");
        setLocalReparo("");
        setShowSaveButton(false);
        setViaturaCritery("");
        setViaturaSelected(null);
        setNumeroSei("");
        setMotivoReparo("");
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
                    // Remove a necessidade de ter viaturaSelected
                    return materialSelected && userSelected && quantidade;
                default:
                    return false;
            }
        };
        setShowSaveButton(validateFields());
    }, [tipoMovimentacao, materialSelected, userSelected, viaturaSelected, quantidade, localReparo, numeroSei, motivoReparo]);

    // Funções para limpar seleção
    const handleClearMaterial = () => {
        setMaterialSelected(null);

    };

    const handleClearUser = () => {
        setUserSelected(null);

    };

    const handleClearViatura = () => {
        setViaturaSelected(null);
    };


    // Funções para selecionar itens
    const handleMaterialSelect = (material) => {
        setMaterialSelected(material);

    };

    const handleUserSelect = (user) => {
        setUserSelected(user);

    };

    const handleViaturaSelect = (viatura) => {
        setViaturaSelected(viatura);
    };


    const handleSave = async () => {
        try {
            const qtd = parseInt(quantidade);
            if (!qtd || qtd <= 0) {
                alert("A quantidade deve ser maior que zero.");
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

    return (
        <PrivateRoute>
            <MenuContext>
                <div className="root-protected">
                    {radioDisabled && (<div style={{ backgroundColor: yellow[500], textAlign: "center" }}>Sem permissão para acessar este recurso</div>)}
                    <RadioGroup
                        sx={{
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "center",
                            gap: 2,
                        }}
                        row
                        value={tipoMovimentacao}
                        onChange={(e) => setTipoMovimentacao(e.target.value)}
                    >
                        <FormControlLabel
                            disabled={radioDisabled}
                            value="entrada"
                            control={<Radio />}
                            label="Entrada"
                        />
                        <FormControlLabel
                            disabled={radioDisabled}
                            value="cautela"
                            control={<Radio />}
                            label="Cautela"
                        />
                        <FormControlLabel
                            disabled={radioDisabled}
                            value="saída"
                            control={<Radio />}
                            label="Saída"
                        />
                        <FormControlLabel
                            disabled={radioDisabled}
                            value="reparo"
                            control={<Radio />}
                            label="Inoperante"
                        />

                    </RadioGroup>

                    {showMaterialSearch && (
                        <Box sx={{ position: 'relative', mb: 2 }}>
                            <MaterialSearch
                                materialCritery={materialCritery}
                                onSetMaterialCritery={setMaterialCritery}
                                onSelectMaterial={handleMaterialSelect}
                                selectedItem={materialSelected}
                            />
                            {materialSelected && (
                                <Chip
                                    label={`Material selecionado: ${materialSelected.description}`}
                                    onDelete={handleClearMaterial}
                                    sx={{ mt: 1 }}
                                />
                            )}
                        </Box>
                    )}

                    {showUserSearch && (
                        <Box sx={{ position: 'relative', mb: 2 }}>
                            <UserSearch
                                userCritery={userCritery}
                                onSetUserCritery={setUserCritery}
                                onSelectUser={handleUserSelect}
                                selectedItem={userSelected}
                            />
                            {userSelected && (
                                <Chip
                                    label={`Usuário selecionado: ${userSelected.full_name}`}
                                    onDelete={handleClearUser}
                                    sx={{ mt: 1 }}
                                />
                            )}
                        </Box>
                    )}

                    {showViaturaSearch && (
                        <Box sx={{ position: 'relative', mb: 2 }}>
                            <ViaturaSearch
                                viaturaCritery={viaturaCritery}
                                onSetViaturaCritery={setViaturaCritery}
                                onSelectViatura={handleViaturaSelect}
                                selectedItem={viaturaSelected}
                            />
                            {viaturaSelected && (
                                <Chip
                                    label={`Viatura selecionada: ${viaturaSelected.description}`}
                                    onDelete={handleClearViatura}
                                    sx={{ mt: 1 }}
                                />
                            )}
                        </Box>
                    )}

                    {materialSelected && (
                        <TextField
                            label="Quantidade"
                            type="number"
                            fullWidth
                            value={quantidade}
                            onChange={(e) => setQuantidade(e.target.value)} // Removida a validação do onChange
                            inputProps={{
                                min: 0, // permite zero para poder apagar
                                step: 1,
                            }}
                            sx={{ mb: 2 }}
                        />
                    )}

                    {tipoMovimentacao === 'reparo' && (
                        <>
                            <TextField
                                label="Local do Reparo"
                                fullWidth
                                value={localReparo}
                                onChange={(e) => setLocalReparo(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                label="Número do SEI"
                                fullWidth
                                value={numeroSei}
                                onChange={(e) => setNumeroSei(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                label="Motivo da Inoperância"
                                fullWidth
                                multiline
                                rows={3}
                                value={motivoReparo}
                                onChange={(e) => setMotivoReparo(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                        </>
                    )}

                    {showSaveButton && (
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={handleSave}
                            sx={{ mt: 2 }}
                        >
                            Salvar Movimentação
                        </Button>
                    )}

                    <Button
                        variant="outlined"
                        fullWidth
                        onClick={limparTudo}
                        sx={{ mt: 2 }}
                    >
                        Limpar Tudo
                    </Button>
                </div>
            </MenuContext>
        </PrivateRoute>
    );
}