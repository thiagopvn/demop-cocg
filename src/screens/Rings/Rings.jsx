import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import {
    Fab,
    TextField,
    IconButton,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Popover,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import React, { useState, useEffect } from "react";
import {
    where,
    query,
    getDocs,
    collection,
    orderBy,
    addDoc,
    updateDoc,
    doc,
    deleteDoc,
    Timestamp,
} from "firebase/firestore";
import db from "../../firebase/db";
import { Add, Edit, Info, AssignmentReturn } from "@mui/icons-material";
import RingDialog from "../../dialogs/RingDialog";
import { verifyToken } from "../../firebase/token";
import { yellow } from "@mui/material/colors";

export default function Rings() {
    const [critery, setCritery] = useState("");
    const [filteredRings, setFilteredRings] = useState([]);
    const [dialogSaveOpen, setDialogSaveOpen] = useState(false);
    const [dialogEditOpen, setDialogEditOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [ringToDeleteId, setRingToDeleteId] = useState(null);
    const [anchorEls, setAnchorEls] = React.useState({});
    const [returnDialogOpen, setReturnDialogOpen] = useState(false);
    const [ringToReturn, setRingToReturn] = useState(null);

    useEffect(() => {
        const fetchUserRole = async () => {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    const decodedToken = await verifyToken(token);
                    setUserRole(decodedToken.role);
                } catch (error) {
                    console.error("Erro ao verificar token:", error);
                    setUserRole(null);
                }
            } else {
                setUserRole(null);
            }
        };

        fetchUserRole();
        filter("");
    }, []);

    const filter = async (critery) => {
        const critery_lower = critery.toLowerCase();

        const ringsCollection = collection(db, "rings");
        const start = critery_lower;
        const end = critery_lower + "\uf8ff";

        const q = query(
            ringsCollection,
            where("nome_solicitante_lower", ">=", start),
            where("nome_solicitante_lower", "<=", end),
            orderBy("nome_solicitante_lower")
        );
        const querySnapshot = await getDocs(q);

        const rings = [];

        querySnapshot.forEach((doc) => {
            rings.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        setFilteredRings(rings);
    };

    const handleEnterKeyDown = (e) => {
        if (e.key === "Enter") {
            filter(critery);
        }
    };

    const handleOpenSaveDialog = () => {
        if (userRole === "admin" || userRole === "editor") {
            setDialogSaveOpen(true);
        } else {
            alert("Você não tem permissão para adicionar anéis.");
        }
    };

    const handleSaveRing = async (data) => {
        const ringsCollection = collection(db, "rings");

        // Converte a data para Timestamp
        const dataOcorrenciaTimestamp = Timestamp.fromDate(new Date(data.data_ocorrencia));

        await addDoc(ringsCollection, {
            numero_ocorrencia: data.numero_ocorrencia,
            militar_nome: data.militar_nome,
            militar_id: data.militar_id,
            nome_solicitante: data.nome_solicitante,
            nome_solicitante_lower: data.nome_solicitante.toLowerCase(),
            endereco: data.endereco,
            rg: data.rg,
            data_ocorrencia: dataOcorrenciaTimestamp, // Salva como Timestamp
            observacoes: data.observacoes,
            devolvido: data.devolvido,
            created_at: Timestamp.now(), // Use Timestamp.now() para a data de criação
        });

        filter("");
        setDialogSaveOpen(false);
    };

    const handleDelete = (id) => {
        setRingToDeleteId(id);
        setDeleteDialogOpen(true);
    };

    const confirmDeleteRing = async () => {
        if (userRole === "admin") {
            try {
                const ringDocRef = doc(db, "rings", ringToDeleteId);
                await deleteDoc(ringDocRef);
                filter("");
            } catch (error) {
                console.error("Erro ao excluir documento:", error);
            }
        } else {
            alert("Você não tem permissão para deletar anéis.");
        }
        setDeleteDialogOpen(false);
        setRingToDeleteId(null);
    };

    const cancelDeleteRing = () => {
        setDeleteDialogOpen(false);
        setRingToDeleteId(null);
    };

    const handleOpenEditDialog = (data) => {
        if (userRole !== "admin" && userRole !== "editor") {
            alert("Você não tem permissão para editar anéis.");
            return;
        }
        setEditData(data);
        setDialogEditOpen(true);
    };

    const handleEditRing = async (data) => {
        try {
            const ringDocRef = doc(db, "rings", data.id);

            // Converte a data para Timestamp
            const dataOcorrenciaTimestamp = Timestamp.fromDate(new Date(data.data_ocorrencia));

            await updateDoc(ringDocRef, {
                numero_ocorrencia: data.numero_ocorrencia,
                militar_nome: data.militar_nome,
                militar_id: data.militar_id,
                nome_solicitante: data.nome_solicitante,
                nome_solicitante_lower: data.nome_solicitante.toLowerCase(),
                endereco: data.endereco,
                rg: data.rg,
                data_ocorrencia: dataOcorrenciaTimestamp, // Salva como Timestamp
                observacoes: data.observacoes,
                devolvido: data.devolvido,
            });
            filter("");
            setDialogEditOpen(false);
            setEditData(null);
        } catch (error) {
            console.error("Erro ao atualizar documento:", error);
        }
    };
    const handlePopoverOpen = (event, userId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [userId]: {
                anchorEl: event.currentTarget,
                open: true,
            },
        }));
    };

    const handlePopoverClose = (userId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [userId]: {
                anchorEl: null,
                open: false,
            },
        }));
    };

    const handleOpenReturnDialog = (ring) => {
        if (userRole !== "admin" && userRole !== "editor") {
            alert("Você não tem permissão para fazer devoluções.");
            return;
        }
        setRingToReturn(ring);
        setReturnDialogOpen(true);
    };

    const handleCloseReturnDialog = () => {
        setReturnDialogOpen(false);
        setRingToReturn(null);
    };

    const handleConfirmReturn = async () => {
        try {
            const ringDocRef = doc(db, "rings", ringToReturn.id);
            await updateDoc(ringDocRef, {
                devolvido: true
            });
            filter("");
        } catch (error) {
            console.error("Erro ao atualizar devolução:", error);
        } finally {
            handleCloseReturnDialog();
        }
    };

    return (
        <PrivateRoute>
            <MenuContext>
                <div className="root-protected">
                    {userRole === "user" && (
                        <div style={{ backgroundColor: yellow[500], textAlign: "center" }}>
                            Você tem permissão apenas para visualizar os registros
                        </div>
                    )}
                    <div className="search">
                        <TextField
                            size="small"
                            label="Pesquisar"
                            variant="outlined"
                            onKeyDown={handleEnterKeyDown}
                            fullWidth
                            value={critery}
                            onChange={(e) => setCritery(e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <IconButton position="end" onClick={() => filter(critery)}>
                                        <SearchIcon />
                                    </IconButton>
                                ),
                            }}
                        />

                        <Table size="small" sx={{ marginTop: 2 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell
                                        sx={{
                                            textAlign: "center",
                                            backgroundColor: "#ddeeee",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        Número da Ocorrência
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            textAlign: "center",
                                            backgroundColor: "#ddeeee",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        Militar
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            textAlign: "center",
                                            backgroundColor: "#ddeeee",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        Solicitante
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            textAlign: "center",
                                            backgroundColor: "#ddeeee",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        Ações
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredRings.map((ring) => (
                                    <TableRow key={ring.id}>
                                        <TableCell sx={{ textAlign: "center" }}>{ring.numero_ocorrencia}</TableCell>
                                        <TableCell sx={{ textAlign: "center" }}>{ring.militar_nome}</TableCell>
                                        <TableCell sx={{ textAlign: "center" }}>{ring.nome_solicitante}</TableCell>
                                        <TableCell sx={{ textAlign: "center" }}>
                                            <IconButton
                                                aria-owns={
                                                    anchorEls[ring.id]?.open ? "mouse-over-popover" : undefined
                                                }
                                                aria-haspopup="true"
                                                onMouseEnter={(e) => handlePopoverOpen(e, ring.id)}
                                                onMouseLeave={() => handlePopoverClose(ring.id)}
                                            >
                                                <Info color="info" />
                                            </IconButton>
                                            <Popover
                                                id="mouse-over-popover"
                                                sx={{
                                                    pointerEvents: "none",
                                                }}
                                                open={anchorEls[ring.id]?.open || false}
                                                anchorEl={anchorEls[ring.id]?.anchorEl}
                                                anchorOrigin={{
                                                    vertical: "bottom",
                                                    horizontal: "left",
                                                }}
                                                transformOrigin={{
                                                    vertical: "top",
                                                    horizontal: "left",
                                                }}
                                                onClose={() => handlePopoverClose(ring.id)}
                                                disableRestoreFocus
                                            >
                                                <Typography component={"div"} sx={{ p: 1 }}>
                                                    <div>id: {ring.id}</div>
                                                    <div>Número da Ocorrência: {ring.numero_ocorrencia}</div>
                                                    <div>Militar: {ring.militar_nome}</div>
                                                    <div>Solicitante: {ring.nome_solicitante}</div>
                                                    <div>Endereço: {ring.endereco}</div>
                                                    <div>RG: {ring.rg}</div>
                                                    <div>
                                                        Data do Ocorrido:{" "}
                                                        {ring.data_ocorrencia
                                                            ? ring.data_ocorrencia
                                                                  .toDate()
                                                                  .toLocaleString()
                                                            : "Data não informada"}
                                                    </div>
                                                    <div>Observações: {ring.observacoes}</div>
                                                    <div>Devolvido: {ring.devolvido ? "Sim" : "Não"}</div>
                                                    <div>Criado em: {ring.created_at?.toDate().toLocaleString()}</div>
                                                </Typography>
                                            </Popover>
                                            {(userRole === "admin" || userRole === "editor") && (
                                                <>
                                                    <IconButton onClick={() => handleDelete(ring.id)}>
                                                        <DeleteIcon color="error" />
                                                    </IconButton>
                                                    <IconButton 
                                                        onClick={() => handleOpenReturnDialog(ring)}
                                                        disabled={ring.devolvido}
                                                        sx={{ opacity: ring.devolvido ? 0.5 : 1 }}
                                                    >
                                                        <AssignmentReturn color={ring.devolvido ? "disabled" : "success"} />
                                                    </IconButton>
                                                    <IconButton onClick={() => handleOpenEditDialog(ring)}>
                                                        <Edit color="primary" />
                                                    </IconButton>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                {userRole === "admin" || userRole === "editor" ? (
                    <Tooltip title="Adicionar Anel" aria-label="add">
                        <Fab
                            size="small"
                            color="primary"
                            aria-label="add"
                            className="fab"
                            sx={{
                                opacity: 0.9,
                                position: "fixed",
                                bottom: 50,
                                left: 50,
                            }}
                            onClick={() => handleOpenSaveDialog()}
                        >
                            <Add />
                        </Fab>
                    </Tooltip>
                ) : null}
                <RingDialog
                    open={dialogSaveOpen}
                    onSubmit={handleSaveRing}
                    onCancel={() => setDialogSaveOpen(false)}
                />
                {editData && (
                    <RingDialog
                        open={dialogEditOpen}
                        onSubmit={handleEditRing}
                        onCancel={() => {
                            setDialogEditOpen(false);
                            setEditData(null);
                        }}
                        editData={editData}
                    />
                )}
                <Dialog
                    open={deleteDialogOpen}
                    onClose={cancelDeleteRing}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">{"Excluir Anel?"}</DialogTitle>
                    <DialogContent>
                        <Typography>
                            Tem certeza que deseja excluir este anel? Esta ação não pode ser desfeita.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={cancelDeleteRing} color="primary">
                            Cancelar
                        </Button>
                        <Button onClick={confirmDeleteRing} color="error">
                            Excluir
                        </Button>
                    </DialogActions>
                </Dialog>
                <Dialog
                    open={returnDialogOpen}
                    onClose={handleCloseReturnDialog}
                    aria-labelledby="return-dialog-title"
                    aria-describedby="return-dialog-description"
                >
                    <DialogTitle id="return-dialog-title">
                        {"Confirmar Devolução"}
                    </DialogTitle>
                    <DialogContent>
                        <Typography>
                            Tem certeza que deseja marcar este anel como devolvido? Esta ação não pode ser desfeita.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseReturnDialog} color="primary">
                            Cancelar
                        </Button>
                        <Button onClick={handleConfirmReturn} color="primary" variant="contained">
                            Confirmar
                        </Button>
                    </DialogActions>
                </Dialog>
            </MenuContext>
        </PrivateRoute>
    );
}