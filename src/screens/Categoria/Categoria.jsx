import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import { Fab, TextField, IconButton, Table, TableHead, TableBody, TableRow, TableCell, Popover, Typography, Tooltip, Icon } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info"
import DeleteIcon from "@mui/icons-material/Delete";
import React, { useEffect, useState, useContext } from "react";
import { where, query, getDocs, collection, orderBy, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import db from "../../firebase/db";
import { Add, Edit } from "@mui/icons-material";
import CategoriaDialog from "../../dialogs/CategoriaDialog";
import { verifyToken } from "../../firebase/token";
import { CategoriaContext } from "../../contexts/CategoriaContext";
import { yellow } from "@mui/material/colors";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";

export default function Categoria() {
    const [critery, setCritery] = React.useState("");
    const [filteredCategorias, setFilteredCategorias] = React.useState([]);
    const [anchorEls, setAnchorEls] = React.useState({});
    const [dialogSaveOpen, setDialogSaveOpen] = React.useState(false);
    const [editData, setEditData] = React.useState(null);
    const [userRole, setUserRole] = useState(null);
    const [dialogEditOpen, setDialogEditOpen] = useState(false);
    const { updateCategorias } = useContext(CategoriaContext);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [categoriaToDelete, setCategoriaToDelete] = useState(null);

    useEffect(() => {

        const fetchUserRole = async () => {
            const token = localStorage.getItem('token');
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
    }, []);

    const filter = async (critery) => {
        const critery_lower = critery.toLowerCase()
        const categoriaCollection = collection(db, "categorias");
        const start = critery_lower;
        const end = critery_lower + "\uf8ff";
        const q = query(
            categoriaCollection,
            where("description_lower", ">=", start),
            where("description_lower", "<=", end),
            orderBy("description_lower")
        );
        const querySnapshot = await getDocs(q);

        const categorias = [];

        querySnapshot.forEach((doc) => {
            categorias.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        setFilteredCategorias(categorias);
    };

    const handleEnterKeyDown = (e) => {
        if (e.key === "Enter") {
            filter(critery);
        }
    }

    const handlePopoverOpen = (event, userId) => {
        setAnchorEls(prev => ({
            ...prev,
            [userId]: {
                anchorEl: event.currentTarget,
                open: true
            }
        }));
    };

    const handlePopoverClose = (userId) => {
        setAnchorEls(prev => ({
            ...prev,
            [userId]: {
                anchorEl: null,
                open: false
            }

        }));
    }

    const handleOpenSaveDialog = () => {
        if (userRole === 'admin' || userRole === 'editor' || userRole === 'admingeral') {
            setDialogSaveOpen(true);
        } else {
            alert("Você não tem permissão para adicionar categorias.");
        }
    }

    const handleSaveCategoria = async (data) => {

        const categoriaCollection = collection(db, "categorias");

        const q = query(
            categoriaCollection,
            where("description_lower", "==", data.description.toLowerCase())
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {

            alert("Já existe uma categoria com a mesma descrição");
            return;
        }

        const docRef = await addDoc(categoriaCollection, {
            description: data.description,
            description_lower: data.description.toLowerCase(),
            created_at: new Date(),
        });
        console.log("Document written with ID: ", docRef.id);
        filter("");
        setDialogSaveOpen(false);
        updateCategorias();
    }

    const handleDelete = (categoria) => {
        if (userRole !== 'admin' && userRole !== 'admingeral') {
            alert("Você não tem permissão para deletar categorias.");
            return;
        }
        setCategoriaToDelete(categoria);
        setDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setCategoriaToDelete(null);
    };

    const handleConfirmDelete = async () => {
        try {
            const categoriaDocRef = doc(db, "categorias", categoriaToDelete.id);
            await deleteDoc(categoriaDocRef);
            filter("");
            updateCategorias();
        } catch (error) {
            console.error("Erro ao excluir documento:", error);
        } finally {
            handleCloseDeleteDialog();
        }
    };

    const handleCopyToClipboard = (categoria) => {
        const categoriaText = `ID: ${categoria.id}\nDescrição: ${categoria.description}`;
        navigator.clipboard.writeText(categoriaText);
        alert("Informações copiadas para a área de transferência!");
    };

    const handleOpenEditDialog = async (data) => {
        if (userRole !== 'admin' && userRole !== 'editor' && userRole !== 'admingeral') {
            alert("Você não tem permissão para editar categorias.");
            return;
        }
        setEditData(data);
        setDialogEditOpen(true);

    }

    const handleEditCategoria = async (data) => {
        console.log(data);
        try {
            const categoriaDocRef = doc(db, "categorias", data.id); // Obtém a referência do documento a ser atualizado
            await updateDoc(categoriaDocRef, { // Atualiza os campos do documento
                description: data.description,
                description_lower: data.description.toLowerCase(),
            });
            console.log("Documento atualizado com sucesso!");
            filter(""); // Atualiza a lista de categorias
            setDialogEditOpen(false); // Fecha o diálogo de edição
            setEditData(null); // Limpa os dados de edição
            updateCategorias();
        }
        catch (error) {
            console.error("Erro ao atualizar documento:", error);
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
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <IconButton position="end"
                                            onClick={() => filter(critery)}
                                        >
                                            <SearchIcon />
                                        </IconButton>
                                    ),
                                },
                            }}
                        />
                        <Table size="small" sx={{ marginTop: 2 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ textAlign: "center", backgroundColor: "#ddeeee", fontWeight: "bold" }}>Descricão</TableCell>
                                    <TableCell sx={{ textAlign: "center", backgroundColor: "#ddeeee", fontWeight: "bold" }}>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredCategorias.map((categoria) => (
                                    <TableRow key={categoria.id}>
                                        <TableCell sx={{ textAlign: "center" }}>{categoria.description}</TableCell>
                                        <TableCell sx={{ textAlign: "center" }}>
                                            <IconButton
                                                aria-owns={anchorEls[categoria.id]?.open ? "mouse-over-popover" : undefined}
                                                aria-haspopup="true"
                                                onMouseEnter={(e) => handlePopoverOpen(e, categoria.id)}
                                                onMouseLeave={() => handlePopoverClose(categoria.id)}
                                                onClick={() => handleCopyToClipboard(categoria)}
                                            >
                                                <InfoIcon color="info" />
                                            </IconButton>
                                            <Popover
                                                id="mouse-over-popover"
                                                sx={{
                                                    pointerEvents: "none",
                                                }}
                                                open={anchorEls[categoria.id]?.open || false}
                                                anchorEl={anchorEls[categoria.id]?.anchorEl}
                                                anchorOrigin={{
                                                    vertical: "bottom",
                                                    horizontal: "left",
                                                }}
                                                transformOrigin={{
                                                    vertical: "top",
                                                    horizontal: "left",
                                                }}
                                                onClose={() => handlePopoverClose(categoria.id)}
                                                disableRestoreFocus
                                            >
                                                <Typography component={"div"} sx={{ p: 1 }}>
                                                    <div>id: {categoria.id}</div>
                                                    <div>Descricao: {categoria.description}</div>
                                                    <div>Criado em: {JSON.stringify(categoria.created_at.toDate())}</div>
                                                </Typography>
                                            </Popover>
                                            {(userRole === "admin" || userRole === "editor" || userRole === "admingeral") && (
                                                <>
                                                    <IconButton onClick={() => handleDelete(categoria)}>
                                                        <DeleteIcon color="error" />
                                                    </IconButton>
                                                    <IconButton onClick={() => handleOpenEditDialog(categoria)}>
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

                {userRole === 'admin' || userRole === 'editor' || userRole === 'admingeral' ? (

                    <Tooltip title="Adicionar Categoria" aria-label="add">
                        <Fab
                            size="small"
                            color="primary"
                            aria-label="add"
                            className="fab"
                            sx={{
                                opacity: 0.9,
                                position: 'fixed',
                                bottom: 50,
                                left: 50,
                            }}
                            onClick={() => handleOpenSaveDialog()}
                        >
                            <Add />
                        </Fab>
                    </Tooltip>
                ) : null}
                <CategoriaDialog open={dialogSaveOpen} onSubmit={handleSaveCategoria} onCancel={() => setDialogSaveOpen(false)} />
                {editData && (
                    <CategoriaDialog
                        open={dialogEditOpen}
                        onSubmit={handleEditCategoria}
                        onCancel={() => {
                            setDialogEditOpen(false);
                            setEditData(null);
                        }}
                        editData={editData}
                    />
                )}
                <Dialog
                    open={deleteDialogOpen}
                    onClose={handleCloseDeleteDialog}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">
                        {"Excluir Categoria?"}
                    </DialogTitle>
                    <DialogContent>
                        <Typography>
                            Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteDialog} color="primary">
                            Cancelar
                        </Button>
                        <Button onClick={handleConfirmDelete} color="error">
                            Excluir
                        </Button>
                    </DialogActions>
                </Dialog>
            </MenuContext>
        </PrivateRoute>
    );
}