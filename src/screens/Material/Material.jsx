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
import MaterialDialog from "../../dialogs/MaterialDialog";
import { verifyToken } from "../../firebase/token";
import { yellow } from "@mui/material/colors";

export default function Material() {
  const [critery, setCritery] = React.useState("");
  const [filteredMaterials, setFilteredMaterials] = React.useState([]);
  const [anchorEls, setAnchorEls] = React.useState({});
  const [dialogSaveOpen, setDialogSaveOpen] = React.useState(false);
  const [editData, setEditData] = React.useState(null);
  const [warningDialogOpen, setWarningDialogOpen] = React.useState(false);
  const [userRole, setUserRole] = useState(null);
  const [dialogEditOpen, setDialogEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [materialToDeleteId, setMaterialToDeleteId] = useState(null);

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

    const materialCollection = collection(db, "materials");
    const start = critery_lower;
    const end = critery_lower + "\uf8ff";
    const q = query(
      materialCollection,
      where("description_lower", ">=", start),
      where("description_lower", "<=", end),
      orderBy("description_lower")
    );
    const querySnapshot = await getDocs(q);

    const materials = [];

    querySnapshot.forEach((doc) => {
      materials.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    setFilteredMaterials(materials);
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
      alert("Você não tem permissão para adicionar materiais.");
    }
  };
  const handleSaveMaterial = async (data) => {
    const materialCollection = collection(db, "materials");

    const q = query(
      materialCollection,
      where("description_lower", "==", data.description.toLowerCase())
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      alert("Já existe um material com a mesma descrição");
      return;
    }

    const docRef = await addDoc(materialCollection, {
      description: data.description,
      description_lower: data.description.toLowerCase(),
      estoque_atual: parseInt(data.estoque_atual),
      estoque_total: parseInt(data.estoque_total),
      categoria: data.categoria,
      categoria_id: data.categoria_id,
      ultima_movimentacao: new Date(),
      created_at: new Date(),
    });
    console.log("Document written with ID: ", docRef.id);
    filter("");
    setDialogSaveOpen(false);
  };

  const handleDelete = (id) => {
    setMaterialToDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteMaterial = async () => {
    if (userRole === "admin") {
      try {
        const materialDocRef = doc(db, "materials", materialToDeleteId); // Obtém a referência do documento a ser excluído
        await deleteDoc(materialDocRef); // Exclui o documento
        filter(""); // Atualiza a lista de materiais
      } catch (error) {
        console.error("Erro ao excluir documento:", error);
      }
    } else {
      alert("Você não tem permissão para deletar materiais.");
    }
    setDeleteDialogOpen(false);
    setMaterialToDeleteId(null);
  };

  const cancelDeleteMaterial = () => {
    setDeleteDialogOpen(false);
    setMaterialToDeleteId(null);
  };

  const handleCopyToClipboard = (material) => {
    navigator.clipboard.writeText(csvText);
    alert("CSV copiado para a área de transferência!");
  };

  const handleOpenEditDialog = async (data) => {
    if (userRole !== "admin" && userRole !== "editor") {
      alert("Você não tem permissão para editar materiais.");
      return;
    }
    setEditData(data);
    setDialogEditOpen(true);
  };

  const handleEditMaterial = async (data) => {
    console.log(data);
    try {
      const materialDocRef = doc(db, "materials", data.id); // Obtém a referência do documento a ser atualizado
      console.log(materialDocRef);
      await updateDoc(materialDocRef, {
        // Atualiza os campos do documento
        description: data.description,
        description_lower: data.description.toLowerCase(),
        estoque_atual: parseInt(data.estoque_atual),
        estoque_total: parseInt(data.estoque_total),
        categoria: data.categoria,
        categoria_id: data.categoria_id,
        ultima_movimentacao: new Date(),
      });
      console.log("Documento atualizado com sucesso!");
      filter(""); // Atualiza a lista de materiais
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
                    Estoque/Disponível
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "center",
                      backgroundColor: "#ddeeee",
                      fontWeight: "bold",
                      width: "200px",
                    }}
                  >
                    Ações
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMaterials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell sx={{ textAlign: "center" }}>
                      {material.description}
                    </TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      {material.estoque_total}/{material.estoque_atual}
                    </TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      <IconButton
                        aria-owns={
                          anchorEls[material.id]?.open ? "mouse-over-popover" : undefined
                        }
                        aria-haspopup="true"
                        onMouseEnter={(e) => handlePopoverOpen(e, material.id)}
                        onMouseLeave={() => handlePopoverClose(material.id)}
                      >
                        <InfoIcon
                          color="info"
                          onClick={() => handleCopyToClipboard(material)}
                        />
                      </IconButton>
                      <Popover
                        id="mouse-over-popover"
                        sx={{
                          pointerEvents: "none",
                        }}
                        open={anchorEls[material.id]?.open || false}
                        anchorEl={anchorEls[material.id]?.anchorEl}
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "left",
                        }}
                        transformOrigin={{
                          vertical: "top",
                          horizontal: "left",
                        }}
                        onClose={() => handlePopoverClose(material.id)}
                        disableRestoreFocus
                      >
                        <Typography component={"div"} sx={{ p: 1 }}>
                          <div>id: {material.id}</div>
                          <div>Descricao: {material.description}</div>
                          <div>CategoriaId: {material.categoria_id}</div>
                          <div>Categoria: {material.categoria}</div>
                          <div>Estoque Disponível: {material.estoque_atual}</div>
                          <div>Estoque Total: {material.estoque_total}</div>
                          <div>
                            Ultima Movimentacao:{" "}
                            {JSON.stringify(material.ultima_movimentacao.toDate())}
                          </div>
                          <div>
                            Criado em: {JSON.stringify(material.created_at.toDate())}
                          </div>
                        </Typography>
                      </Popover>
                      {(userRole === "admin" || userRole === "editor") && (
                        <>
                          <IconButton onClick={() => handleDelete(material.id)}>
                            <DeleteIcon color="error" />
                          </IconButton>
                          <IconButton onClick={() => handleOpenEditDialog(material)}>
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
          <Tooltip title="Adicionar Material" aria-label="add">
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
        <MaterialDialog
          open={dialogSaveOpen}
          onSubmit={handleSaveMaterial}
          onCancel={() => setDialogSaveOpen(false)}
        />
        {editData && (
          <MaterialDialog
            open={dialogEditOpen}
            onSubmit={handleEditMaterial}
            onCancel={() => {
              setDialogEditOpen(false);
              setEditData(null);
            }}
            editData={editData}
          />
        )}
        <Dialog
          open={deleteDialogOpen}
          onClose={cancelDeleteMaterial}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">{"Excluir Material?"}</DialogTitle>
          <DialogContent>
            <Typography>
              Tem certeza que deseja excluir este material? Esta ação não pode ser
              desfeita.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDeleteMaterial} color="primary">
              Cancelar
            </Button>
            <Button onClick={confirmDeleteMaterial} color="error">
              Excluir
            </Button>
          </DialogActions>
        </Dialog>
      </MenuContext>
    </PrivateRoute>
  );
}