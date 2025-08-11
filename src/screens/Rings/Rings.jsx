import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import {
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
            telefone_solicitante: data.telefone_solicitante, // NOVO: Campo telefone
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
                telefone_solicitante: data.telefone_solicitante, // NOVO: Campo telefone
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
                        {/* Header Section with Title and Add Button */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: '24px',
                            padding: '0 4px'
                        }}>
                            <Typography 
                                variant="h4" 
                                component="h1" 
                                sx={{ 
                                    fontWeight: 600,
                                    color: '#1a237e',
                                    fontSize: { xs: '1.75rem', sm: '2.125rem' }
                                }}
                            >
                                💍 Anéis
                            </Typography>
                            
                            {(userRole === "admin" || userRole === "editor") && (
                                <Button
                                    variant="contained"
                                    startIcon={<Add />}
                                    onClick={handleOpenSaveDialog}
                                    sx={{
                                        backgroundColor: '#ff9800',
                                        borderRadius: '12px',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        padding: '10px 24px',
                                        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
                                        '&:hover': {
                                            backgroundColor: '#f57c00',
                                            boxShadow: '0 6px 16px rgba(255, 152, 0, 0.4)',
                                            transform: 'translateY(-1px)',
                                        },
                                        transition: 'all 0.2s ease-in-out'
                                    }}
                                >
                                    Nova Retirada
                                </Button>
                            )}
                        </div>

                        <TextField
                            size="small"
                            label="Pesquisar por solicitante..."
                            variant="outlined"
                            onKeyDown={handleEnterKeyDown}
                            fullWidth
                            value={critery}
                            onChange={(e) => setCritery(e.target.value)}
                            sx={{ 
                                marginBottom: 3,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    backgroundColor: '#fff8e1',
                                    '&:hover': {
                                        backgroundColor: '#ffffff',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: '#ffffff',
                                    }
                                }
                            }}
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <IconButton 
                                            position="end" 
                                            onClick={() => filter(critery)}
                                            sx={{
                                                color: '#ff9800',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                                }
                                            }}
                                        >
                                            <SearchIcon />
                                        </IconButton>
                                    ),
                                },
                            }}
                        />

                        <Table 
                            size="small" 
                            sx={{
                                '& .MuiTableHead-root': {
                                    '& .MuiTableRow-root': {
                                        '& .MuiTableCell-root': {
                                            backgroundColor: '#fff3e0',
                                            borderBottom: '2px solid #ff9800',
                                            fontWeight: 700,
                                            fontSize: '0.875rem',
                                            color: '#e65100',
                                        }
                                    }
                                },
                                '& .MuiTableBody-root': {
                                    '& .MuiTableRow-root': {
                                        '&:hover': {
                                            backgroundColor: '#fff8e1',
                                        },
                                        '& .MuiTableCell-root': {
                                            borderBottom: '1px solid #e0e0e0',
                                        }
                                    }
                                }
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ textAlign: "center" }}>
                                        🔢 Nº Ocorrência
                                    </TableCell>
                                    <TableCell sx={{ textAlign: "center" }}>
                                        👨‍✈️ Militar
                                    </TableCell>
                                    <TableCell sx={{ textAlign: "center" }}>
                                        👤 Solicitante
                                    </TableCell>
                                    <TableCell sx={{ textAlign: "center" }}>
                                        📱 Status
                                    </TableCell>
                                    <TableCell sx={{ textAlign: "center" }}>
                                        ⚙️ Ações
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
                                            <Button
                                                size="small"
                                                variant={ring.devolvido ? "contained" : "outlined"}
                                                sx={{
                                                    borderRadius: '20px',
                                                    padding: '4px 12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    backgroundColor: ring.devolvido ? '#4caf50' : 'transparent',
                                                    color: ring.devolvido ? 'white' : '#ff9800',
                                                    borderColor: ring.devolvido ? '#4caf50' : '#ff9800',
                                                    '&:hover': {
                                                        backgroundColor: ring.devolvido ? '#45a049' : 'rgba(255, 152, 0, 0.1)',
                                                    }
                                                }}
                                            >
                                                {ring.devolvido ? '✅ Devolvido' : '⏳ Pendente'}
                                            </Button>
                                        </TableCell>
                                        <TableCell sx={{ textAlign: "center" }}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                <Tooltip title="Ver informações completas">
                                                    <IconButton
                                                        aria-owns={
                                                            anchorEls[ring.id]?.open ? "mouse-over-popover" : undefined
                                                        }
                                                        aria-haspopup="true"
                                                        onMouseEnter={(e) => handlePopoverOpen(e, ring.id)}
                                                        onMouseLeave={() => handlePopoverClose(ring.id)}
                                                        sx={{
                                                            backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(33, 150, 243, 0.2)',
                                                                transform: 'scale(1.05)',
                                                            },
                                                            transition: 'all 0.2s ease-in-out',
                                                        }}
                                                    >
                                                        <Info sx={{ color: '#2196f3' }} />
                                                    </IconButton>
                                                </Tooltip>
                                                
                                                {(userRole === "admin" || userRole === "editor") && (
                                                    <>
                                                        <Tooltip title="Editar anel">
                                                            <IconButton 
                                                                onClick={() => handleOpenEditDialog(ring)}
                                                                sx={{
                                                                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                                                    '&:hover': {
                                                                        backgroundColor: 'rgba(255, 152, 0, 0.2)',
                                                                        transform: 'scale(1.05)',
                                                                    },
                                                                    transition: 'all 0.2s ease-in-out',
                                                                }}
                                                            >
                                                                <Edit sx={{ color: '#ff9800' }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        
                                                        <Tooltip title={ring.devolvido ? "Já devolvido" : "Marcar como devolvido"}>
                                                            <IconButton 
                                                                onClick={() => handleOpenReturnDialog(ring)}
                                                                disabled={ring.devolvido}
                                                                sx={{
                                                                    backgroundColor: ring.devolvido ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)',
                                                                    opacity: ring.devolvido ? 0.6 : 1,
                                                                    '&:hover': {
                                                                        backgroundColor: ring.devolvido ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.2)',
                                                                        transform: ring.devolvido ? 'none' : 'scale(1.05)',
                                                                    },
                                                                    transition: 'all 0.2s ease-in-out',
                                                                }}
                                                            >
                                                                <AssignmentReturn sx={{ color: ring.devolvido ? '#9e9e9e' : '#4caf50' }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        
                                                        <Tooltip title="Excluir anel">
                                                            <IconButton 
                                                                onClick={() => handleDelete(ring.id)}
                                                                sx={{
                                                                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                                                    '&:hover': {
                                                                        backgroundColor: 'rgba(244, 67, 54, 0.2)',
                                                                        transform: 'scale(1.05)',
                                                                    },
                                                                    transition: 'all 0.2s ease-in-out',
                                                                }}
                                                            >
                                                                <DeleteIcon sx={{ color: '#f44336' }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </div>
                                            
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
                                                <Typography component={"div"} sx={{ 
                                                    p: 2, 
                                                    minWidth: 300,
                                                    '& > div': {
                                                        marginBottom: '8px',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        backgroundColor: '#fff8e1',
                                                        fontWeight: 500,
                                                    }
                                                }}>
                                                    <div><strong>🔢 ID:</strong> {ring.id}</div>
                                                    <div><strong>📋 Nº Ocorrência:</strong> {ring.numero_ocorrencia}</div>
                                                    <div><strong>👨‍✈️ Militar:</strong> {ring.militar_nome}</div>
                                                    <div><strong>👤 Solicitante:</strong> {ring.nome_solicitante}</div>
                                                    <div><strong>📞 Telefone:</strong> {ring.telefone_solicitante || 'N/A'}</div>
                                                    <div><strong>📍 Endereço:</strong> {ring.endereco}</div>
                                                    <div><strong>🆔 RG:</strong> {ring.rg}</div>
                                                    <div><strong>📅 Data do Ocorrido:</strong> {ring.data_ocorrencia?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}</div>
                                                    <div><strong>📝 Observações:</strong> {ring.observacoes || 'Nenhuma'}</div>
                                                    <div><strong>✅ Status:</strong> {ring.devolvido ? "Devolvido" : "Pendente"}</div>
                                                    <div><strong>📆 Criado em:</strong> {ring.created_at?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}</div>
                                                </Typography>
                                            </Popover>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
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