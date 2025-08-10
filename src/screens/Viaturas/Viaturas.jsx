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
  Popover,
  Typography,
  Tooltip,
  Icon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";
import DeleteIcon from "@mui/icons-material/Delete";
import React, { use, useEffect, useState } from "react";
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
} from "firebase/firestore";
import db from "../../firebase/db";
import { Add, Edit } from "@mui/icons-material";
import ViaturaDialog from "../../dialogs/ViaturaDialog";
import { verifyToken } from "../../firebase/token";
import { yellow } from "@mui/material/colors";

export default function Viaturas() {
  const [critery, setCritery] = React.useState("");
  const [filteredViaturas, setFilteredViaturas] = React.useState([]);
  const [anchorEls, setAnchorEls] = React.useState({});
  const [dialogSaveOpen, setDialogSaveOpen] = React.useState(false);
  const [editData, setEditData] = React.useState(null);
  const [warningDialogOpen, setWarningDialogOpen] = React.useState(false);
  const [userRole, setUserRole] = useState(null);
  const [dialogEditOpen, setDialogEditOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viaturaToDeleteId, setViaturaToDeleteId] = useState(null);

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
  }, []);

  const filter = async (critery) => {
    const critery_lower = critery.toLowerCase();
    const viaturaCollection = collection(db, "viaturas");
    const start = critery_lower;
    const end = critery_lower + "\uf8ff";
    const q = query(
      viaturaCollection,
      where("description_lower", ">=", start),
      where("description_lower", "<=", end),
      orderBy("description_lower")
    );
    const querySnapshot = await getDocs(q);

    const viaturas = [];

    querySnapshot.forEach((doc) => {
      viaturas.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    setFilteredViaturas(viaturas);
  };

  const handleEnterKeyDown = (e) => {
    if (e.key === "Enter") {
      filter(critery);
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

  const handleOpenSaveDialog = () => {
    if (userRole === "admin" || userRole === "editor") {
      setDialogSaveOpen(true);
    } else {
      alert("Você não tem permissão para adicionar viaturas.");
    }
  };

  const handleSaveViatura = async (data) => {
    const viaturaCollection = collection(db, "viaturas");

    const q = query(
      viaturaCollection,
      where("description_lower", "==", data.description.toLowerCase())
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      alert("Já existe uma viatura com a mesma descrição");
      return;
    }

    const docRef = await addDoc(viaturaCollection, {
      description: data.description,
      description_lower: data.description.toLowerCase(),
      created_at: new Date(),
      ultima_movimentacao: new Date(),
    });
    console.log("Document written with ID: ", docRef.id);
    filter("");
    setDialogSaveOpen(false);
  };

  const handleDelete = (id) => {
    setViaturaToDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteViatura = async () => {
    if (userRole === "admin") {
      try {
        const viaturaDocRef = doc(db, "viaturas", viaturaToDeleteId); // Obtém a referência do documento a ser excluído
        await deleteDoc(viaturaDocRef); // Exclui o documento
        filter(""); // Atualiza a lista de viaturas
      } catch (error) {
        console.error("Erro ao excluir documento:", error);
      }
    } else {
      alert("Você não tem permissão para deletar viaturas.");
    }
    setDeleteDialogOpen(false);
    setViaturaToDeleteId(null);
  };

  const cancelDeleteViatura = () => {
    setDeleteDialogOpen(false);
    setViaturaToDeleteId(null);
  };

  const handleCopyToClipboard = (viatura) => {
    navigator.clipboard.writeText(csvText);
    alert("CSV copiado para a área de transferência!");
  };

  const handleOpenEditDialog = async (data) => {
    if (userRole !== "admin" && userRole !== "editor") {
      alert("Você não tem permissão para editar viaturas.");
      return;
    }
    setEditData(data);
    setDialogEditOpen(true);
  };

  const handleEditViatura = async (data) => {
    console.log(data);
    try {
      const viaturaDocRef = doc(db, "viaturas", data.id); // Obtém a referência do documento a ser atualizado
      await updateDoc(viaturaDocRef, {
        // Atualiza os campos do documento
        description: data.description,
        description_lower: data.description.toLowerCase(),
        ultima_movimentacao: new Date(),
      });
      console.log("Documento atualizado com sucesso!");
      filter(""); // Atualiza a lista de viaturas
      setDialogEditOpen(false); // Fecha o diálogo de edição
      setEditData(null); // Limpa os dados de edição
    } catch (error) {
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
                    <IconButton position="end" onClick={() => filter(critery)}>
                      <SearchIcon />
                    </IconButton>
                  ),
                },
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
                    Descricão
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
                {filteredViaturas.map((viatura) => (
                  <TableRow key={viatura.id}>
                    <TableCell sx={{ textAlign: "center" }}>
                      {viatura.description}
                    </TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      <IconButton
                        aria-owns={
                          anchorEls[viatura.id]?.open ? "mouse-over-popover" : undefined
                        }
                        aria-haspopup="true"
                        onMouseEnter={(e) => handlePopoverOpen(e, viatura.id)}
                        onMouseLeave={() => handlePopoverClose(viatura.id)}
                      >
                        <InfoIcon
                          color="info"
                          onClick={() => handleCopyToClipboard(viatura)}
                        />
                      </IconButton>
                      <Popover
                        id="mouse-over-popover"
                        sx={{
                          pointerEvents: "none",
                        }}
                        open={anchorEls[viatura.id]?.open || false}
                        anchorEl={anchorEls[viatura.id]?.anchorEl}
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "left",
                        }}
                        transformOrigin={{
                          vertical: "top",
                          horizontal: "left",
                        }}
                        onClose={() => handlePopoverClose(viatura.id)}
                        disableRestoreFocus
                      >
                        <Typography component={"div"} sx={{ p: 1 }}>
                          <div>id: {viatura.id}</div>
                          <div>Descricao: {viatura.description}</div>
                          <div>
                            Ultima Movimentacao:{" "}
                            {JSON.stringify(viatura.ultima_movimentacao.toDate())}
                          </div>
                          <div>
                            Criado em: {JSON.stringify(viatura.created_at.toDate())}
                          </div>
                        </Typography>
                      </Popover>
                      {(userRole === "admin" || userRole === "editor") && (
                        <>
                          <IconButton onClick={() => handleDelete(viatura.id)}>
                            <DeleteIcon color="error" />
                          </IconButton>
                          <IconButton onClick={() => handleOpenEditDialog(viatura)}>
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
          <Tooltip title="Adicionar Viatura" aria-label="add">
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
        <ViaturaDialog
          open={dialogSaveOpen}
          onSubmit={handleSaveViatura}
          onCancel={() => setDialogSaveOpen(false)}
        />
        {editData && (
          <ViaturaDialog
            open={dialogEditOpen}
            onSubmit={handleEditViatura}
            onCancel={() => {
              setDialogEditOpen(false);
              setEditData(null);
            }}
            editData={editData}
          />
        )}
        <Dialog
          open={deleteDialogOpen}
          onClose={cancelDeleteViatura}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">{"Excluir Viatura?"}</DialogTitle>
          <DialogContent>
            <Typography>
              Tem certeza que deseja excluir esta viatura? Esta ação não pode ser
              desfeita.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDeleteViatura} color="primary">
              Cancelar
            </Button>
            <Button onClick={confirmDeleteViatura} color="error">
              Excluir
            </Button>
          </DialogActions>
        </Dialog>
      </MenuContext>
    </PrivateRoute>
  );
}