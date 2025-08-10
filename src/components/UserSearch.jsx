import { useEffect, useState } from "react";
import {
    TextField,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    IconButton,
    Typography,
    Popover,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import db from "../firebase/db";

const UserSearch = ({ userCritery, onSetUserCritery, onSelectUser, selectedItem }) => {
    const [usuariosEncontrados, setUsuariosEncontrados] = useState([]);
    const [anchorEls, setAnchorEls] = useState({});

    const filtrarUsuarios = async (criterio) => {
        const usersCollection = collection(db, "users");
        let q;

        if (criterio) {
            const critery_lower = criterio.toLowerCase();
            q = query(
                usersCollection,
                where("full_name_lower", ">=", critery_lower),
                where("full_name_lower", "<=", critery_lower + "\uf8ff"),
                orderBy("full_name_lower")
            );
        } else {
            // Busca TODOS os usuários quando o critério é vazio
            q = query(
                usersCollection,
                orderBy("full_name_lower")
            );
        }

        const querySnapshot = await getDocs(q);
        const usuarios = [];

        querySnapshot.forEach((doc) => {
            usuarios.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        setUsuariosEncontrados(usuarios);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            filtrarUsuarios(userCritery);
        }
    };

    const handlePopoverOpen = (event, usuarioId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [usuarioId]: {
                anchorEl: event.currentTarget,
                open: true,
            },
        }));
    };

    const handlePopoverClose = (usuarioId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [usuarioId]: {
                anchorEl: null,
                open: false,
            },
        }));
    };

    return (
        <div className="search">
            <TextField
                size="small"
                label="Pesquisar Usuário"
                variant="outlined"
                fullWidth
                value={userCritery || ""}
                onChange={(e) => onSetUserCritery(e.target.value)}
                onKeyDown={handleKeyDown}
                InputProps={{
                    endAdornment: (
                        <IconButton
                            edge="end"
                            onClick={() => filtrarUsuarios(userCritery)}
                        >
                            <SearchIcon />
                        </IconButton>
                    ),
                }}
            />

            <Table size="small" sx={{ marginTop: 2 }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
                            Nome
                        </TableCell>
                        <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold", width: "80px" }}>
                            Info
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {usuariosEncontrados
                        .filter(usuario => !selectedItem || usuario.id === selectedItem.id)
                        .map((usuario) => (
                            <TableRow
                                key={usuario.id}
                                onClick={() => onSelectUser(usuario)}
                                sx={{
                                    cursor: "pointer",
                                    backgroundColor: selectedItem?.id === usuario.id ? "#e3f2fd" : "inherit",
                                    "&:hover": {
                                        backgroundColor: "#f5f5f5",
                                    },
                                }}
                            >
                                <TableCell sx={{ textAlign: "left" }}>{usuario.full_name}</TableCell>
                                <TableCell sx={{ textAlign: "left" }}>
                                    <IconButton
                                        aria-owns={anchorEls[usuario.id]?.open ? "usuario-mouse-over-popover" : undefined}
                                        aria-haspopup="true"
                                        onMouseEnter={(e) => handlePopoverOpen(e, usuario.id)}
                                        onMouseLeave={() => handlePopoverClose(usuario.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <InfoIcon color="info" />
                                    </IconButton>
                                    <Popover
                                        id="usuario-mouse-over-popover"
                                        sx={{ pointerEvents: "none" }}
                                        open={anchorEls[usuario.id]?.open || false}
                                        anchorEl={anchorEls[usuario.id]?.anchorEl}
                                        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                        transformOrigin={{ vertical: "top", horizontal: "left" }}
                                        onClose={() => handlePopoverClose(usuario.id)}
                                        disableRestoreFocus
                                    >
                                        <Typography component={"div"} sx={{ p: 1 }}>
                                        <div>ID: {usuario.id}</div>
                                            <div>Nome: {usuario.full_name}</div>
                                            <div>Username: {usuario.username}</div>
                                            <div>RG: {usuario.rg}</div>
                                            <div>Telefone: {usuario.telefone}</div>
                                            <div>OBM: {usuario.OBM}</div>
                                        </Typography>
                                    </Popover>
                                </TableCell>
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default UserSearch;