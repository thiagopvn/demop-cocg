import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    Button,
    TextField,
    IconButton,
    FormControlLabel,
    Checkbox,
    Box,
    Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import UserSearch from "../components/UserSearch"; // Certifique-se de que o caminho está correto

export default function RingDialog({ onSubmit, onCancel, open, editData = null }) {
    const [data, setData] = useState({
        numero_ocorrencia: editData?.numero_ocorrencia || "",
        militar_nome: editData?.militar_nome || "", // Campo para o nome do militar
        militar_id: editData?.militar_id || null, // Campo para o ID do militar
        nome_solicitante: editData?.nome_solicitante || "",
        endereco: editData?.endereco || "",
        rg: editData?.rg || "",
        data_ocorrencia: editData?.data_ocorrencia || new Date().toISOString().slice(0, 10),
        observacoes: editData?.observacoes || "",
        devolvido: editData?.devolvido || false,
    });
    const [userCritery, setUserCritery] = useState("");
    const [userSelected, setUserSelected] = useState(null);

    useEffect(() => {
        if (editData) {
            setData({
                id: editData.id || "",
                numero_ocorrencia: editData.numero_ocorrencia || "",
                militar_nome: editData.militar_nome || "",
                militar_id: editData.militar_id || null,
                nome_solicitante: editData.nome_solicitante || "",
                endereco: editData.endereco || "",
                rg: editData.rg || "",
                data_ocorrencia: editData.data_ocorrencia || new Date().toISOString().slice(0, 10),
                observacoes: editData.observacoes || "",
                devolvido: editData.devolvido || false,
            });
            setUserSelected({
                id: editData.militar_id || null,
                full_name: editData.militar_nome || "",
            });
        } else {
            setUserSelected(null);
        }
    }, [editData]);

    const handleUserSelect = (user) => {
        setUserSelected(user);
        setData({
            ...data,
            militar_nome: user.full_name,
            militar_id: user.id,
        });
    };

    const handleClearUser = () => {
        setUserSelected(null);
        setData({
            ...data,
            militar_nome: "",
            militar_id: null,
        });
    };

    return (
        <Dialog open={open}>
            <DialogTitle>{editData ? "Editar Anel" : "Novo Anel"}</DialogTitle>
            <IconButton
                aria-label="close"
                sx={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                    color: (theme) => theme.palette.grey[500],
                }}
                onClick={onCancel}
            >
                <CloseIcon />
            </IconButton>

            <DialogContent>
                <TextField
                    fullWidth
                    label="Número da ocorrência"
                    margin="normal"
                    value={data.numero_ocorrencia}
                    onChange={(e) => setData({ ...data, numero_ocorrencia: e.target.value })}
                />

                {/* Componente UserSearch */}
                <Box sx={{ position: "relative", mb: 2 }}>
                    <UserSearch
                        userCritery={userCritery}
                        onSetUserCritery={setUserCritery}
                        onSelectUser={handleUserSelect}
                        selectedItem={userSelected}
                    />
                    {userSelected && (
                        <Chip
                            label={`Militar selecionado: ${userSelected.full_name}`}
                            onDelete={handleClearUser}
                            sx={{ mt: 1 }}
                        />
                    )}
                </Box>

                <TextField
                    fullWidth
                    label="Nome do Solicitante"
                    margin="normal"
                    value={data.nome_solicitante}
                    onChange={(e) => setData({ ...data, nome_solicitante: e.target.value })}
                />
                <TextField
                    fullWidth
                    label="Endereço"
                    margin="normal"
                    value={data.endereco}
                    onChange={(e) => setData({ ...data, endereco: e.target.value })}
                />
                <TextField
                    fullWidth
                    label="RG"
                    margin="normal"
                    value={data.rg}
                    onChange={(e) => setData({ ...data, rg: e.target.value })}
                />
                <TextField
                    fullWidth
                    label="Data do ocorrido"
                    type="date"
                    margin="normal"
                    value={data.data_ocorrencia}
                    onChange={(e) => setData({ ...data, data_ocorrencia: e.target.value })}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />
                <TextField
                    fullWidth
                    label="Observações"
                    margin="normal"
                    multiline
                    rows={4}
                    value={data.observacoes}
                    onChange={(e) => setData({ ...data, observacoes: e.target.value })}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={data.devolvido}
                            onChange={(e) => setData({ ...data, devolvido: e.target.checked })}
                        />
                    }
                    label="Devolvido?"
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => onSubmit(data)}
                    fullWidth
                    sx={{ marginTop: 5 }}
                >
                    Salvar
                </Button>
            </DialogContent>
        </Dialog>
    );
}