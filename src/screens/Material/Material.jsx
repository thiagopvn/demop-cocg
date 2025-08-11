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
  Popover,
  Typography,
  Tooltip,
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
    const csvText = `ID,Descrição,Categoria,Estoque Disponível,Estoque Total,Última Movimentação,Criado em\n${material.id},${material.description},${material.categoria},${material.estoque_atual},${material.estoque_total},${material.ultima_movimentacao?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'},${material.created_at?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}`;
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
        <div className="root-protected" style={{ padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
          {userRole === "user" && (
            <div style={{ 
              backgroundColor: '#fff3e0', 
              color: '#e65100',
              textAlign: "center", 
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontWeight: 600
            }}>
              ⚠️ Você tem permissão apenas para visualizar os registros
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '100%' }}>
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
                📦 Materiais
              </Typography>
              
              {(userRole === "admin" || userRole === "editor") && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleOpenSaveDialog}
                  sx={{
                    backgroundColor: '#4caf50',
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    padding: '10px 24px',
                    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                    '&:hover': {
                      backgroundColor: '#45a049',
                      boxShadow: '0 6px 16px rgba(76, 175, 80, 0.4)',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  Novo Material
                </Button>
              )}
            </div>

            {/* Seção de Pesquisa Moderna */}
            <div style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '16px',
              marginBottom: '20px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e8f5e8'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <SearchIcon sx={{ color: '#4caf50', fontSize: '24px' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#4caf50' }}>
                  Pesquisar Materiais
                </Typography>
              </div>
              <TextField
                size="medium"
                label="Digite a descrição do material..."
                variant="outlined"
                onKeyDown={handleEnterKeyDown}
                fullWidth
                value={critery}
                onChange={(e) => setCritery(e.target.value)}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    backgroundColor: '#f8fff8',
                    fontSize: '1rem',
                    '&:hover': {
                      backgroundColor: '#ffffff',
                      boxShadow: '0 2px 8px rgba(76, 175, 80, 0.1)',
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#ffffff',
                      boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)',
                    }
                  }
                }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <Button
                        variant="contained"
                        onClick={() => filter(critery)}
                        sx={{
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontWeight: 600,
                          backgroundColor: '#4caf50',
                          '&:hover': {
                            backgroundColor: '#45a049',
                          }
                        }}
                      >
                        Pesquisar
                      </Button>
                    ),
                  },
                }}
              />
            </div>

            {/* Container da Tabela com ocupação total */}
            <div style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e8f5e8',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                padding: '20px 24px 16px', 
                borderBottom: '1px solid #e8f5e8',
                backgroundColor: '#f8fff8'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                  📦 Lista de Materiais
                </Typography>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                <Table 
                  size="medium"
                  sx={{
                    '& .MuiTableHead-root': {
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      '& .MuiTableRow-root': {
                        '& .MuiTableCell-root': {
                          backgroundColor: '#e8f5e8',
                          borderBottom: '2px solid #4caf50',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: '#2e7d32',
                          padding: '16px',
                        }
                      }
                    },
                    '& .MuiTableBody-root': {
                      '& .MuiTableRow-root': {
                        '&:hover': {
                          backgroundColor: '#f8fff8',
                        },
                        '& .MuiTableCell-root': {
                          borderBottom: '1px solid #e0e0e0',
                          padding: '16px',
                          fontSize: '0.9rem'
                        }
                      }
                    }
                  }}
                >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ textAlign: "center" }}>
                    📝 Descrição
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    📊 Estoque Total/Disponível
                  </TableCell>
                  <TableCell sx={{ textAlign: "center", width: "200px" }}>
                    ⚙️ Ações
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
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <Tooltip title="Ver informações completas">
                          <IconButton
                            aria-owns={
                              anchorEls[material.id]?.open ? "mouse-over-popover" : undefined
                            }
                            aria-haspopup="true"
                            onMouseEnter={(e) => handlePopoverOpen(e, material.id)}
                            onMouseLeave={() => handlePopoverClose(material.id)}
                            onClick={() => handleCopyToClipboard(material)}
                            sx={{
                              backgroundColor: 'rgba(33, 150, 243, 0.1)',
                              '&:hover': {
                                backgroundColor: 'rgba(33, 150, 243, 0.2)',
                                transform: 'scale(1.05)',
                              },
                              transition: 'all 0.2s ease-in-out',
                            }}
                          >
                            <InfoIcon sx={{ color: '#2196f3' }} />
                          </IconButton>
                        </Tooltip>
                        
                        {(userRole === "admin" || userRole === "editor") && (
                          <>
                            <Tooltip title="Editar material">
                              <IconButton 
                                onClick={() => handleOpenEditDialog(material)}
                                sx={{
                                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                  '&:hover': {
                                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                    transform: 'scale(1.05)',
                                  },
                                  transition: 'all 0.2s ease-in-out',
                                }}
                              >
                                <Edit sx={{ color: '#4caf50' }} />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Excluir material">
                              <IconButton 
                                onClick={() => handleDelete(material.id)}
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
                        <Typography component={"div"} sx={{ 
                          p: 2, 
                          minWidth: 300,
                          '& > div': {
                            marginBottom: '8px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#f5f5f5',
                            fontWeight: 500,
                          }
                        }}>
                          <div><strong>📋 ID:</strong> {material.id}</div>
                          <div><strong>📝 Descrição:</strong> {material.description}</div>
                          <div><strong>🏷️ Categoria:</strong> {material.categoria}</div>
                          <div><strong>📦 Estoque Disponível:</strong> {material.estoque_atual}</div>
                          <div><strong>📊 Estoque Total:</strong> {material.estoque_total}</div>
                          <div><strong>🔄 Última Movimentação:</strong> {material.ultima_movimentacao?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}</div>
                          <div><strong>📅 Criado em:</strong> {material.created_at?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}</div>
                        </Typography>
                      </Popover>
                    </TableCell>
                  </TableRow>
                ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
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