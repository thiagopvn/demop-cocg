import { useEffect, useState } from "react";
import {
  Paper,
  Box,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Tooltip,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Chip,
  Card,
  CardContent
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import db from "../../firebase/db";
import { query, collection, where, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";

import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";

export default function Inativos() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  // Estados para o Popover
  const [anchorEls, setAnchorEls] = useState({});
  const [hoverTimers, setHoverTimers] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMovimentacao, setSelectedMovimentacao] = useState(null);

  useEffect(() => {
    const fetchMovimentacoes = async () => {
      const movimentacoesCollection = collection(db, "movimentacoes");
      const q = query(movimentacoesCollection, where("type", "==", "reparo"), orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const movs = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Filtra apenas os materiais com status de reparo
        if (data.status === "emReparo" || data.status === "devolvidaDeReparo") {
          movs.push({ id: doc.id, ...data });
        }
      });
      setMovimentacoes(movs);
      console.log("Total de movimentações tipo 'reparo' carregadas:", movs.length);
    };

    fetchMovimentacoes();
  }, []);

  const handleMouseEnter = (event, movId) => {
    if (hoverTimers[movId]) {
      clearTimeout(hoverTimers[movId]);
    }
    const timer = setTimeout(() => {
      setAnchorEls(prev => ({
        ...prev,
        [movId]: {
          anchorEl: event.currentTarget,
          open: true,
        },
      }));
    }, 500);
    setHoverTimers(prev => ({
      ...prev,
      [movId]: timer,
    }));
  };

  const handleMouseLeave = (movId) => {
    if (hoverTimers[movId]) {
      clearTimeout(hoverTimers[movId]);
    }
    setAnchorEls(prev => ({
      ...prev,
      [movId]: {
        anchorEl: null,
        open: false,
      },
    }));
  };

  // Limpa os timers ao desmontar o componente
  useEffect(() => {
    return () => {
      Object.values(hoverTimers).forEach(timer => clearTimeout(timer));
    };
  }, [hoverTimers]);

  const handleOpenDialog = (movimentacao) => {
    setSelectedMovimentacao(movimentacao);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMovimentacao(null);
  };

  const handleMarcarDevolvido = async () => {
    if (!selectedMovimentacao) return;

    try {
      const movimentacaoRef = doc(db, "movimentacoes", selectedMovimentacao.id);
      await updateDoc(movimentacaoRef, {
        status: "devolvidaDeReparo"
      });

      // Atualizar a lista local
      setMovimentacoes(prev => 
        prev.map(mov => 
          mov.id === selectedMovimentacao.id 
            ? { ...mov, status: "devolvidaDeReparo" }
            : mov
        )
      );

      handleCloseDialog();
    } catch (error) {
      console.error("Erro ao marcar como devolvido:", error);
    }
  };

  return (
    <Box sx={{ width: '100%', px: { xs: 1, sm: 2, md: 3 } }}>
      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
      <Table size="small" sx={{ width: "100%", tableLayout: "fixed" }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Material
            </TableCell>
            <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Data
            </TableCell>
            <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Quantidade
            </TableCell>
            <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Número SEI
            </TableCell>
            <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Local de Reparo
            </TableCell>
            <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Status
            </TableCell>
            <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Motivo do Reparo
            </TableCell>
            <TableCell sx={{ textAlign: "center", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Ações
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {movimentacoes.map((mov) => (
            <TableRow
              key={mov.id}
              onMouseEnter={(e) => handleMouseEnter(e, mov.id)}
              onMouseLeave={() => handleMouseLeave(mov.id)}
              hover
            >
              <TableCell sx={{ textAlign: "left" }}>
                {mov.material_description}
              </TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.date?.seconds ? new Date(mov.date.seconds * 1000).toLocaleDateString() : ""}
              </TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.quantity}
              </TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.seiNumber || "-"}
              </TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.repairLocation || "-"}
              </TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.status === "emReparo" ? "Em reparo" : "Devolvida"}
              </TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.motivoReparo || "-"}
              </TableCell>
              <TableCell sx={{ textAlign: "center" }}>
                {mov.status === "emReparo" && (
                  <Tooltip title="Marcar como Devolvida" arrow>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Devolvida"
                      variant="outlined"
                      color="success"
                      clickable
                      onClick={() => handleOpenDialog(mov)}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(46, 125, 50, 0.04)',
                          borderColor: 'success.main'
                        }
                      }}
                    />
                  </Tooltip>
                )}
              </TableCell>
              <Popover
                id={`popover-${mov.id}`}
                sx={{ pointerEvents: "none" }}
                open={Boolean(anchorEls[mov.id]?.open)}
                anchorEl={anchorEls[mov.id]?.anchorEl}
                anchorOrigin={{
                  vertical: "center",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "center",
                  horizontal: "left",
                }}
                onClose={() => handleMouseLeave(mov.id)}
                disableRestoreFocus
              >
                <Typography component={"div"} sx={{ p: 2, maxWidth: 350 }}>
                  {mov.id && <div><strong>ID:</strong> {mov.id}</div>}
                  {mov.material && (
                    <div>
                      <strong>Material ID:</strong> {mov.material}
                    </div>
                  )}
                  {mov.material_description && (
                    <div>
                      <strong>Material:</strong> {mov.material_description}
                    </div>
                  )}
                  {mov.quantity !== undefined && (
                    <div>
                      <strong>Quantidade:</strong> {mov.quantity}
                    </div>
                  )}
                  {mov.repairLocation && (
                    <div>
                      <strong>Local de Reparo:</strong> {mov.repairLocation}
                    </div>
                  )}
                  {mov.seiNumber && (
                    <div>
                      <strong>Número SEI:</strong> {mov.seiNumber}
                    </div>
                  )}
                  {mov.motivoReparo && (
                    <div>
                      <strong>Motivo do Reparo:</strong> {mov.motivoReparo}
                    </div>
                  )}
                  {mov.status && (
                    <div>
                      <strong>Status:</strong> {mov.status === "emReparo" ? "Em reparo" : "Devolvida"}
                    </div>
                  )}
                  {mov.date?.seconds && (
                    <div>
                      <strong>Data:</strong> {new Date(mov.date.seconds * 1000).toLocaleString()}
                    </div>
                  )}
                </Typography>
              </Popover>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Tooltip title="Exportar para Excel" placement="left">
        {/* Implemente a função exportarMovimentacoes conforme sua necessidade */}
        <Box sx={{ position: "fixed", bottom: 100, right: 16 }}>
          <span>Exportar</span>
        </Box>
      </Tooltip>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirmar Devolução
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Tem certeza que deseja marcar o material "{selectedMovimentacao?.material_description}" como devolvido?
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleMarcarDevolvido} autoFocus color="success">
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
        </CardContent>
      </Card>
    </Box>
  );
}